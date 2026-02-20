/**
 * AsyncLocalStorage Polyfill 테스트
 *
 * 검증 항목:
 * 1. 기본 run() 동작 (동기/비동기)
 * 2. 중첩/순차 실행 지원 (스택 기반 복원)
 * 3. 인스턴스 격리 (다른 인스턴스 간 격리)
 * 4. 에러 처리 (cleanup 보장)
 *
 * ⚠️ 제한 사항 (CRITICAL):
 * - 동일 인스턴스에서 병렬 run() 시 컨텍스트 오염 가능 (병렬 가드 없음)
 * - 런타임 보호: activeContextCount > 20이면 에러 발생 (회귀 방지)
 * - 이 앱은 병렬 실행을 사용하지 않으므로 안전
 */

// Node.js 환경에서 실행 (브라우저 체크 우회)
global.window = undefined

const { AsyncLocalStorage } = require('../../lib/polyfills/async-hooks-polyfill.js')

describe('AsyncLocalStorage Polyfill - 기본 동작', () => {
  let storage

  beforeEach(() => {
    storage = new AsyncLocalStorage()
  })

  describe('기본 동작', () => {
    it('동기 함수에서 store를 설정하고 가져올 수 있어야 함', () => {
      const testStore = { userId: 123 }
      let capturedStore

      storage.run(testStore, () => {
        capturedStore = storage.getStore()
      })

      expect(capturedStore).toEqual(testStore)
    })

    it('비동기 함수에서 store를 유지해야 함', async () => {
      const testStore = { userId: 456 }
      let capturedStore

      await storage.run(testStore, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        capturedStore = storage.getStore()
      })

      expect(capturedStore).toEqual(testStore)
    })

    it('run() 외부에서 getStore()는 undefined를 반환해야 함', () => {
      const store = storage.getStore()
      expect(store).toBeUndefined()
    })

    it('run() 완료 후 컨텍스트가 정리되어야 함', () => {
      storage.run({ data: 'test' }, () => {
        // run() 내부
      })

      // run() 외부
      expect(storage.getStore()).toBeUndefined()
    })
  })

  describe('중첩/순차 실행 지원', () => {
    it('중첩 run() 호출이 허용되어야 함 (스택 복원)', () => {
      let outerStore, innerStore, restoredStore

      storage.run({ level: 'outer' }, () => {
        outerStore = storage.getStore()

        // 중첩 호출 허용
        storage.run({ level: 'inner' }, () => {
          innerStore = storage.getStore()
        })

        // 복원 확인
        restoredStore = storage.getStore()
      })

      expect(outerStore).toEqual({ level: 'outer' })
      expect(innerStore).toEqual({ level: 'inner' })
      expect(restoredStore).toEqual({ level: 'outer' })
    })

    it('비동기 중첩 run() 호출이 허용되어야 함', async () => {
      const result = await storage.run({ userId: 'outer' }, async () => {
        const outer = storage.getStore()?.userId
        await new Promise(resolve => setTimeout(resolve, 10))

        // await 후 중첩 호출 허용
        const inner = await storage.run({ userId: 'inner' }, async () => {
          await new Promise(resolve => setTimeout(resolve, 5))
          return storage.getStore()?.userId
        })

        const outerAfter = storage.getStore()?.userId
        return { outer, inner, outerAfter }
      })

      expect(result.outer).toBe('outer')
      expect(result.inner).toBe('inner')
      expect(result.outerAfter).toBe('outer')
    })

    it('다른 인스턴스에서는 병렬 실행이 가능해야 함', async () => {
      const storage1 = new AsyncLocalStorage()
      const storage2 = new AsyncLocalStorage()

      const results = await Promise.all([
        storage1.run({ id: 1 }, async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return storage1.getStore()
        }),
        storage2.run({ id: 2 }, async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return storage2.getStore()
        })
      ])

      expect(results[0]).toEqual({ id: 1 })
      expect(results[1]).toEqual({ id: 2 })
    })

    it('순차 실행은 허용되어야 함', async () => {
      const result1 = await storage.run({ seq: 1 }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return storage.getStore()
      })

      const result2 = await storage.run({ seq: 2 }, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return storage.getStore()
      })

      expect(result1).toEqual({ seq: 1 })
      expect(result2).toEqual({ seq: 2 })
    })
  })

  describe('에러 처리', () => {
    it('callback에서 에러 발생 시 컨텍스트를 정리해야 함', () => {
      expect(() => {
        storage.run({ data: 'test' }, () => {
          throw new Error('Test error')
        })
      }).toThrow('Test error')

      // 에러 후에도 컨텍스트가 정리되었는지 확인
      expect(storage.getStore()).toBeUndefined()
    })

    it('비동기 callback에서 에러 발생 시 컨텍스트를 정리해야 함', async () => {
      await expect(async () => {
        await storage.run({ data: 'test' }, async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          throw new Error('Async test error')
        })
      }).rejects.toThrow('Async test error')

      // 에러 후에도 컨텍스트가 정리되었는지 확인
      expect(storage.getStore()).toBeUndefined()
    })
  })

  describe('인스턴스 격리', () => {
    it('다른 AsyncLocalStorage 인스턴스는 서로 격리되어야 함', async () => {
      // 다른 인스턴스는 Symbol이 다르므로 격리됨
      const storage1 = new AsyncLocalStorage()
      const storage2 = new AsyncLocalStorage()

      const promise1 = storage1.run({ id: 'A' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return storage1.getStore()
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const promise2 = storage2.run({ id: 'B' }, async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return storage2.getStore()
      })

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1).toEqual({ id: 'A' })
      expect(result2).toEqual({ id: 'B' })
    })

    // ⚠️ 동일 인스턴스 병렬 실행은 미지원 (문서 정책)
    // 아래 테스트는 타이밍에 따라 실패할 수 있으므로 skip
    it.skip('동일 인스턴스 병렬 실행은 컨텍스트 오염 가능 (비권장)', async () => {
      // 이 테스트는 의도적으로 skip됨
      // 이유: 동일 인스턴스에서 병렬 run() 시 _currentContextId 덮어쓰기
      // 정책: 그래프마다 별도 AsyncLocalStorage 인스턴스 사용 권장
    })
  })
})
