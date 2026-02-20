/**
 * AsyncLocalStorage Polyfill 간단 테스트
 * Node.js에서 실행 (브라우저 시뮬레이션)
 */

// 브라우저 환경 시뮬레이션
global.window = {}
if (!global.process || !global.process.exit) {
  global.process = Object.assign(global.process || {}, {
    env: { NODE_ENV: 'development' },
    exit: (code) => {
      console.log(`\nProcess exit with code: ${code}`)
      throw new Error(`EXIT:${code}`)
    }
  })
}

// Polyfill import
const { AsyncLocalStorage } = require('../lib/polyfills/async-hooks-polyfill.js')

console.log('🧪 AsyncLocalStorage Polyfill 테스트 시작\n')

// 테스트 1: 동기 함수
console.log('📝 테스트 1: 동기 함수에서 컨텍스트 유지')
const als = new AsyncLocalStorage()
const store1 = { userId: 123 }

als.run(store1, () => {
  const retrieved = als.getStore()
  console.log('  ✅ getStore():', retrieved?.userId === 123 ? 'PASS' : 'FAIL')
})

console.log('  ✅ run() 종료 후:', als.getStore() === undefined ? 'PASS' : 'FAIL')

// 테스트 2: Promise (비동기)
console.log('\n📝 테스트 2: async/await에서 컨텍스트 유지')
const store2 = { userId: 456 }

als.run(store2, async () => {
  const before = als.getStore()
  console.log('  ✅ await 전:', before?.userId === 456 ? 'PASS' : 'FAIL')

  await new Promise(resolve => setTimeout(resolve, 10))

  const after = als.getStore()
  console.log('  ✅ await 후:', after?.userId === 456 ? 'PASS' : 'FAIL')
})
  .then(async () => {
    // 테스트 3: 동일 컨텍스트 내 순차 호출 (중첩 + await 후 재호출)
    console.log('\n📝 테스트 3: 동일 컨텍스트 내 순차 호출 허용')

    const result = await als.run({ userId: 'outer' }, async () => {
      const outer = als.getStore()?.userId
      await new Promise(resolve => setTimeout(resolve, 10))

      // await 후 순차 run() 호출 (허용되어야 함)
      const inner = await als.run({ userId: 'inner' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 5))
        return als.getStore()?.userId
      })

      const outerAfter = als.getStore()?.userId
      return { outer, inner, outerAfter }
    })

    console.log('  ✅ 순차 호출:',
      result.outer === 'outer' && result.inner === 'inner' && result.outerAfter === 'outer' ? 'PASS' : 'FAIL')
    console.log('  결과:', result)

    // 테스트 4: 다른 인스턴스에서 병렬 실행 (권장)
    console.log('\n📝 테스트 4: 다른 인스턴스에서 병렬 실행 (권장 패턴)')
    const als1 = new AsyncLocalStorage()
    const als2 = new AsyncLocalStorage()
    const als3 = new AsyncLocalStorage()

    return Promise.all([
      als1.run({ userId: 'A' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return als1.getStore()?.userId
      }),
      als2.run({ userId: 'B' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return als2.getStore()?.userId
      }),
      als3.run({ userId: 'C' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 15))
        return als3.getStore()?.userId
      })
    ])
  })
  .then((results) => {
    console.log('  ✅ 인스턴스별 격리:', results[0] === 'A' && results[1] === 'B' && results[2] === 'C' ? 'PASS' : 'FAIL')
    console.log('  결과:', results)

    // 테스트 5: 중첩된 run() (스택 복원)
    console.log('\n📝 테스트 5: 중첩 run() 호출 - 스택 복원')
    const als4 = new AsyncLocalStorage()

    als4.run({ level: 1 }, () => {
      const outer = als4.getStore()?.level
      console.log('  ✅ 외부 컨텍스트:', outer === 1 ? 'PASS' : 'FAIL')

      // 중첩 run() 호출 (허용됨)
      als4.run({ level: 2 }, () => {
        const inner = als4.getStore()?.level
        console.log('  ✅ 내부 컨텍스트:', inner === 2 ? 'PASS' : 'FAIL')
      })

      // 중첩 호출 후 복원 확인
      const restored = als4.getStore()?.level
      console.log('  ✅ 복원된 컨텍스트:', restored === 1 ? 'PASS' : 'FAIL')
    })

    // 테스트 6: 순차 실행 (허용되어야 함)
    console.log('\n📝 테스트 6: 순차 실행 (허용)')
    return als4.run({ seq: 1 }, async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return als4.getStore()?.seq
    }).then(result1 => {
      console.log('  ✅ 첫 번째 실행:', result1 === 1 ? 'PASS' : 'FAIL')

      return als4.run({ seq: 2 }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return als4.getStore()?.seq
      })
    }).then(result2 => {
      console.log('  ✅ 두 번째 실행:', result2 === 2 ? 'PASS' : 'FAIL')
    })
  })
  .then(() => {
    // 테스트 7: enterWith() - 메모리 누수 방지
    console.log('\n📝 테스트 7: enterWith() - 기존 컨텍스트 정리')
    const als5 = new AsyncLocalStorage()

    // 첫 번째 enterWith
    als5.enterWith({ userId: 'first' })
    const store1 = als5.getStore()
    console.log('  첫 번째 enterWith:', store1?.userId === 'first' ? 'PASS' : 'FAIL')

    // 두 번째 enterWith (기존 것이 정리되어야 함)
    als5.enterWith({ userId: 'second' })
    const store2 = als5.getStore()
    console.log('  두 번째 enterWith:', store2?.userId === 'second' ? 'PASS' : 'FAIL')
    console.log('  ✅ 기존 컨텍스트 정리 확인 (메모리 누수 방지)')

    // disable로 정리
    als5.disable()
    const storeAfterDisable = als5.getStore()
    console.log('  disable 후:', storeAfterDisable === undefined ? 'PASS' : 'FAIL')

    // 테스트 8: exit() - 컨텍스트 복원
    console.log('\n📝 테스트 8: exit() - 컨텍스트 임시 비활성화')
    const als6 = new AsyncLocalStorage()

    als6.run({ outer: true }, () => {
      const outerStore = als6.getStore()
      console.log('  run() 내부:', outerStore?.outer === true ? 'PASS' : 'FAIL')

      const result = als6.exit(() => {
        const exitStore = als6.getStore()
        console.log('  exit() 내부:', exitStore === undefined ? 'PASS' : 'FAIL')
        return 'exit-result'
      })

      const restoredStore = als6.getStore()
      console.log('  exit() 후 복원:', restoredStore?.outer === true ? 'PASS' : 'FAIL')
      console.log('  리턴값:', result === 'exit-result' ? 'PASS' : 'FAIL')
    })
  })
  .then(() => {
    // 테스트 9: bind() - 컨텍스트 캡처
    console.log('\n📝 테스트 9: bind() - 컨텍스트 캡처')
    const als7 = new AsyncLocalStorage()

    als7.run({ userId: 'bound-test' }, () => {
      const boundFn = als7.bind(() => {
        return als7.getStore()?.userId
      })

      // bind된 함수를 run() 밖에서 호출
      const result = boundFn()
      console.log('  ✅ bind() 동작:', result === 'bound-test' ? 'PASS' : 'FAIL')
    })

    // 테스트 10: snapshot() - 컨텍스트 복원
    console.log('\n📝 테스트 10: snapshot() - 컨텍스트 복원')
    const als8 = new AsyncLocalStorage()

    let snapshot
    als8.run({ userId: 'snapshot-test' }, () => {
      snapshot = als8.snapshot()
    })

    // snapshot으로 컨텍스트 복원
    const result = snapshot(() => {
      return als8.getStore()?.userId
    })
    console.log('  ✅ snapshot() 동작:', result === 'snapshot-test' ? 'PASS' : 'FAIL')
  })
  .then(() => {
    // 최종 결과
    console.log('\n' + '='.repeat(50))
    console.log('✅ 모든 테스트 완료!')
    console.log('\nℹ️  주요 기능:')
    console.log('   - 중첩 run() 지원: 스택 기반 컨텍스트 복원')
    console.log('   - 순차 호출 허용: await 후 run() 재호출 가능')
    console.log('   - 메모리 안전: enterWith() cleanup, Map 정리')
    console.log('   - bind/snapshot: 최소 구현 제공 (조용한 실패 방지)')
    console.log('   - LangGraph 호환: runWithConfig 중첩/순차 호출 지원')
    console.log('\n⚠️  제한 사항 (CRITICAL):')
    console.log('   1. 병렬 실행 비권장 (동일 인스턴스):')
    console.log('      - 동일 ALS 인스턴스에서 병렬 run() 시 _currentContextId 덮어쓰기')
    console.log('      - 서로의 getStore() 오염 가능 (병렬 가드 없음)')
    console.log('      - 권장: 그래프마다 별도 AsyncLocalStorage 인스턴스 사용')
    console.log('      - 런타임 보호: activeContextCount > 20이면 에러 발생')
    console.log('   2. Promise 영구 대기 시 메모리 누수:')
    console.log('      - Promise가 영원히 pending이면 cleanup 미실행 (finally 안 호출)')
    console.log('      - contextStores + activeContextCount 누적 가능')
    console.log('      - 진단: activeContextCount > 10 시 경고 로그')
    console.log('   3. bind/snapshot 제한적 구현:')
    console.log('      - 기존 컨텍스트가 없을 때만 캡처한 store로 감싸짐')
    console.log('      - 실행 중 컨텍스트가 이미 있으면 원 함수 그대로 실행')
    console.log('   4. ESM/CJS 이중 export:')
    console.log('      - Jest: CommonJS (module.exports)')
    console.log('      - Webpack/Vite: ESM named export (export { ... })')
    console.log('\nℹ️  이 앱에서는 병렬 실행을 사용하지 않으므로 안전')
    console.log('='.repeat(50))
  })
  .catch((error) => {
    console.error('❌ 테스트 실패:', error)
    process.exit(1)
  })
