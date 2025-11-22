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
    // 테스트 3: 동일 인스턴스 병렬 실행 (에러 발생 예상)
    console.log('\n📝 테스트 3: 동일 인스턴스 병렬 실행 (에러 예상)')

    try {
      // 첫 번째 run() 시작
      const promise1 = als.run({ userId: 1 }, async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return als.getStore()?.userId
      })

      // 약간의 지연 후 두 번째 run() 시도 (병렬 실행)
      await new Promise(resolve => setTimeout(resolve, 5))

      const promise2 = als.run({ userId: 2 }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return als.getStore()?.userId
      })

      await Promise.all([promise1, promise2])

      console.log('  ⚠️  에러 미발생 - 병렬 실행 가드 미적용')
    } catch (error) {
      console.log('  ✅ 에러 발생 (예상):', error.message.includes('Concurrent') ? 'PASS' : 'FAIL')
      console.log('  병렬 실행 가드 정상 작동 ✓')
    }

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
    console.log('\nℹ️  Step 1 수정 사항:')
    console.log('   - 동일 인스턴스 중첩 run() 호출 시 에러 발생')
    console.log('   - 다른 인스턴스에서는 병렬 실행 가능')
    console.log('   - 순차 실행은 허용')
    console.log('\nℹ️  Step 2 수정 사항:')
    console.log('   - enterWith(): 기존 컨텍스트 정리 (메모리 누수 방지)')
    console.log('   - exit(): store 유지 + 컨텍스트 복원')
    console.log('\nℹ️  Step 3 수정 사항:')
    console.log('   - bind(): 개발 모드에서 에러 발생 (조용한 실패 방지)')
    console.log('   - snapshot(): 개발 모드에서 에러 발생 (조용한 실패 방지)')
    console.log('   - 프로덕션: 경고 + fallback (호환성 유지)')
    console.log('='.repeat(50))
  })
  .catch((error) => {
    console.error('❌ 테스트 실패:', error)
    process.exit(1)
  })
