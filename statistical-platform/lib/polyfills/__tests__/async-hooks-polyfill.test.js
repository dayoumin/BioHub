/**
 * AsyncLocalStorage Polyfill 테스트
 *
 * 주요 시나리오:
 * 1. 동기 함수에서 컨텍스트 유지
 * 2. Promise/async-await에서 컨텍스트 유지
 * 3. 동시 실행 격리
 * 4. 중첩된 run() 호출
 */

import { AsyncLocalStorage } from '../async-hooks-polyfill.js'

describe('AsyncLocalStorage Polyfill', () => {
  let als

  beforeEach(() => {
    als = new AsyncLocalStorage()
  })

  describe('동기 함수', () => {
    it('run() 안에서 getStore() 작동', () => {
      const store = { userId: 123 }

      als.run(store, () => {
        expect(als.getStore()).toEqual(store)
      })
    })

    it('run() 밖에서는 undefined 반환', () => {
      expect(als.getStore()).toBeUndefined()
    })

    it('run() 종료 후 이전 컨텍스트 복원', () => {
      const store1 = { userId: 1 }
      const store2 = { userId: 2 }

      als.run(store1, () => {
        expect(als.getStore()).toEqual(store1)

        als.run(store2, () => {
          expect(als.getStore()).toEqual(store2)
        })

        // 중첩 run() 종료 후 복원
        expect(als.getStore()).toEqual(store1)
      })

      // 모든 run() 종료 후
      expect(als.getStore()).toBeUndefined()
    })
  })

  describe('비동기 함수 (Promise)', () => {
    it('async/await 후에도 컨텍스트 유지', async () => {
      const store = { userId: 456 }

      await als.run(store, async () => {
        expect(als.getStore()).toEqual(store)

        await Promise.resolve()

        // await 후에도 유지!
        expect(als.getStore()).toEqual(store)
      })
    })

    it('Promise.then() 체인에서 컨텍스트 유지', async () => {
      const store = { userId: 789 }

      await als.run(store, () => {
        return Promise.resolve(als.getStore())
          .then((value) => {
            expect(value).toEqual(store)
            return als.getStore()
          })
          .then((value) => {
            expect(value).toEqual(store)
          })
      })
    })

    it('에러 발생 시에도 컨텍스트 정리', async () => {
      const store = { userId: 999 }

      await expect(
        als.run(store, async () => {
          expect(als.getStore()).toEqual(store)
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      // 에러 후 컨텍스트 정리 확인
      expect(als.getStore()).toBeUndefined()
    })
  })

  describe('동시 실행 격리', () => {
    it('여러 run() 호출이 서로 간섭하지 않음', async () => {
      const store1 = { userId: 1 }
      const store2 = { userId: 2 }
      const store3 = { userId: 3 }

      const results = await Promise.all([
        als.run(store1, async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return als.getStore()
        }),
        als.run(store2, async () => {
          await new Promise(resolve => setTimeout(resolve, 5))
          return als.getStore()
        }),
        als.run(store3, async () => {
          await new Promise(resolve => setTimeout(resolve, 15))
          return als.getStore()
        })
      ])

      expect(results[0]).toEqual(store1)
      expect(results[1]).toEqual(store2)
      expect(results[2]).toEqual(store3)
    })
  })

  describe('기타 API', () => {
    it('enterWith() 작동', () => {
      const store = { userId: 111 }
      als.enterWith(store)

      expect(als.getStore()).toEqual(store)
    })

    it('disable() 작동', () => {
      const store = { userId: 222 }
      als.enterWith(store)
      expect(als.getStore()).toEqual(store)

      als.disable()
      expect(als.getStore()).toBeUndefined()
    })

    it('exit() 일시적으로 컨텍스트 제거', () => {
      const store = { userId: 333 }

      als.run(store, () => {
        expect(als.getStore()).toEqual(store)

        const result = als.exit(() => {
          expect(als.getStore()).toBeUndefined()
          return 'exited'
        })

        expect(result).toBe('exited')
        expect(als.getStore()).toEqual(store)
      })
    })
  })

  describe('폴리필 마커', () => {
    it('_isPolyfill 속성 존재', () => {
      expect(als._isPolyfill).toBe(true)
    })
  })
})
