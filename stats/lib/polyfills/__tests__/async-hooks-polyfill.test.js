/**
 * AsyncLocalStorage Polyfill tests (CommonJS)
 *
 * Notes:
 * - Same-instance parallel run() is NOT supported by the polyfill (documented). We do not test that case.
 * - Cross-instance parallel execution is allowed.
 */

const { AsyncLocalStorage } = require('../async-hooks-polyfill.js')

describe('AsyncLocalStorage Polyfill', () => {
  let als

  beforeEach(() => {
    als = new AsyncLocalStorage()
  })

  describe('basic behavior', () => {
    it('sets and gets store inside run()', () => {
      const store = { userId: 123 }
      als.run(store, () => {
        expect(als.getStore()).toEqual(store)
      })
    })

    it('returns undefined outside run()', () => {
      expect(als.getStore()).toBeUndefined()
    })

    it('restores previous context after nested run()', () => {
      const outer = { userId: 1 }
      const inner = { userId: 2 }

      als.run(outer, () => {
        expect(als.getStore()).toEqual(outer)

        als.run(inner, () => {
          expect(als.getStore()).toEqual(inner)
        })

        expect(als.getStore()).toEqual(outer)
      })

      expect(als.getStore()).toBeUndefined()
    })
  })

  describe('async behavior', () => {
    it('keeps context across await', async () => {
      const store = { userId: 456 }
      await als.run(store, async () => {
        expect(als.getStore()).toEqual(store)
        await Promise.resolve()
        expect(als.getStore()).toEqual(store)
      })
    })

    it('keeps context across Promise chains', async () => {
      const store = { userId: 789 }
      await als.run(store, () => {
        return Promise.resolve()
          .then(() => als.getStore())
          .then((value) => {
            expect(value).toEqual(store)
          })
      })
    })
  })

  describe('errors', () => {
    it('cleans context after sync error', () => {
      expect(() => {
        als.run({ data: 'test' }, () => {
          throw new Error('Test error')
        })
      }).toThrow('Test error')
      expect(als.getStore()).toBeUndefined()
    })

    it('cleans context after async error', async () => {
      await expect(
        als.run({ data: 'test' }, async () => {
          await Promise.resolve()
          throw new Error('Async test error')
        })
      ).rejects.toThrow('Async test error')
      expect(als.getStore()).toBeUndefined()
    })
  })

  describe('sequential and cross-instance execution', () => {
    it('supports sequential runs', async () => {
      const first = await als.run({ seq: 1 }, async () => {
        await Promise.resolve()
        return als.getStore()
      })
      const second = await als.run({ seq: 2 }, async () => {
        await Promise.resolve()
        return als.getStore()
      })

      expect(first).toEqual({ seq: 1 })
      expect(second).toEqual({ seq: 2 })
    })

    it('allows parallel runs on different instances', async () => {
      const a = new AsyncLocalStorage()
      const b = new AsyncLocalStorage()

      const [resA, resB] = await Promise.all([
        a.run({ id: 'A' }, async () => {
          await new Promise((r) => setTimeout(r, 10))
          return a.getStore()
        }),
        b.run({ id: 'B' }, async () => {
          await new Promise((r) => setTimeout(r, 5))
          return b.getStore()
        })
      ])

      expect(resA).toEqual({ id: 'A' })
      expect(resB).toEqual({ id: 'B' })
    })
  })

  describe('API helpers', () => {
    it('enterWith sets store and disable clears it', () => {
      als.enterWith({ userId: 111 })
      expect(als.getStore()).toEqual({ userId: 111 })

      als.disable()
      expect(als.getStore()).toBeUndefined()
    })

    it('exit temporarily clears and then restores', () => {
      als.run({ flag: true }, () => {
        expect(als.getStore()).toEqual({ flag: true })
        const result = als.exit(() => {
          expect(als.getStore()).toBeUndefined()
          return 'exited'
        })
        expect(result).toBe('exited')
        expect(als.getStore()).toEqual({ flag: true })
      })
    })

    it('bind captures current store when none is active', () => {
      let bound
      als.run({ userId: 'bound' }, () => {
        bound = als.bind(() => als.getStore())
      })
      expect(bound()).toEqual({ userId: 'bound' })
    })

    it('snapshot restores captured store', () => {
      let snapshot
      als.run({ userId: 'snap' }, () => {
        snapshot = als.snapshot()
      })
      const result = snapshot(() => als.getStore())
      expect(result).toEqual({ userId: 'snap' })
    })
  })

  describe('polyfill marker', () => {
    it('sets _isPolyfill flag', () => {
      expect(als._isPolyfill).toBe(true)
    })
  })
})
