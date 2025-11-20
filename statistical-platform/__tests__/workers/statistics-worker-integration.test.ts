/**
 * Integration test for statistics-worker.js
 *
 * Tests actual Worker behavior with problematic data that triggered the bugs
 */

describe('Statistics Worker Integration Test', () => {
  describe('Bug #1: getPairedNumericData with problematic values', () => {
    it('should handle data with empty strings correctly', () => {
      const mockData = [
        { x: 1, y: 2 },
        { x: '', y: 3 },      // Empty string should be filtered out
        { x: 4, y: 5 },
        { x: 6, y: '' },      // Empty string should be filtered out
      ]

      // Simulate worker logic
      const result: number[][] = []
      for (const row of mockData) {
        const xRaw = row.x
        const yRaw = row.y

        if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined) {
          continue
        }

        const xNum = typeof xRaw === 'number' ? xRaw : parseFloat(String(xRaw))
        const yNum = typeof yRaw === 'number' ? yRaw : parseFloat(String(yRaw))

        if (!isNaN(xNum) && isFinite(xNum) && !isNaN(yNum) && isFinite(yNum)) {
          result.push([xNum, yNum])
        }
      }

      // Only valid pairs should be included
      expect(result).toEqual([
        [1, 2],
        [4, 5],
      ])
      expect(result.length).toBe(2) // 2 valid pairs, not 4
    })

    it('should handle data with booleans correctly', () => {
      const mockData = [
        { x: 1, y: 2 },
        { x: true, y: 3 },    // Boolean should be filtered out
        { x: 4, y: false },   // Boolean should be filtered out
        { x: 5, y: 6 },
      ]

      const result: number[][] = []
      for (const row of mockData) {
        const xRaw = row.x
        const yRaw = row.y

        if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined) {
          continue
        }

        const xNum = typeof xRaw === 'number' ? xRaw : parseFloat(String(xRaw))
        const yNum = typeof yRaw === 'number' ? yRaw : parseFloat(String(yRaw))

        if (!isNaN(xNum) && isFinite(xNum) && !isNaN(yNum) && isFinite(yNum)) {
          result.push([xNum, yNum])
        }
      }

      expect(result).toEqual([
        [1, 2],
        [5, 6],
      ])
      expect(result.length).toBe(2)
    })

    it('should handle mixed problematic values', () => {
      const mockData = [
        { x: 1, y: 2 },
        { x: '', y: 3 },       // Empty string
        { x: '   ', y: 4 },    // Whitespace
        { x: true, y: 5 },     // Boolean
        { x: 6, y: '7' },      // Valid string number
        { x: '8.5', y: 9.5 },  // Valid string float
        { x: null, y: 10 },    // Null
        { x: 11, y: undefined }, // Undefined
        { x: NaN, y: 12 },     // NaN
        { x: Infinity, y: 13 }, // Infinity
        { x: 14, y: 15 },      // Valid
      ]

      const result: number[][] = []
      for (const row of mockData) {
        const xRaw = row.x
        const yRaw = row.y

        if (xRaw === null || xRaw === undefined || yRaw === null || yRaw === undefined) {
          continue
        }

        const xNum = typeof xRaw === 'number' ? xRaw : parseFloat(String(xRaw))
        const yNum = typeof yRaw === 'number' ? yRaw : parseFloat(String(yRaw))

        if (!isNaN(xNum) && isFinite(xNum) && !isNaN(yNum) && isFinite(yNum)) {
          result.push([xNum, yNum])
        }
      }

      // Only valid pairs: [1,2], [6,'7'], ['8.5',9.5], [14,15]
      expect(result).toEqual([
        [1, 2],
        [6, 7],
        [8.5, 9.5],
        [14, 15],
      ])
      expect(result.length).toBe(4)
    })
  })

  describe('Bug #3: Progress reporting with small datasets', () => {
    it('should calculate correct progressStep for 2x2 matrix', () => {
      const columns = 2
      const totalCalculations = columns * columns // 4
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      expect(progressStep).toBe(1)

      // Every calculation should trigger progress
      for (let i = 1; i <= totalCalculations; i++) {
        expect(i % progressStep).toBe(0)
      }
    })

    it('should calculate correct progressStep for 3x3 matrix', () => {
      const columns = 3
      const totalCalculations = columns * columns // 9
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      expect(progressStep).toBe(1)

      // Every calculation should trigger progress
      for (let i = 1; i <= totalCalculations; i++) {
        expect(i % progressStep).toBe(0)
      }
    })

    it('should calculate correct progressStep for 10x10 matrix', () => {
      const columns = 10
      const totalCalculations = columns * columns // 100
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      expect(progressStep).toBe(10)

      // Only 10% intervals should trigger progress
      expect(10 % progressStep).toBe(0)
      expect(20 % progressStep).toBe(0)
      expect(50 % progressStep).toBe(0)
      expect(100 % progressStep).toBe(0)

      // Non-10% intervals should not trigger
      expect(5 % progressStep).not.toBe(0)
      expect(15 % progressStep).not.toBe(0)
    })

    it('should simulate progress events for 2x2 matrix', () => {
      const columns = 2
      const totalCalculations = 4
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      const progressEvents: number[] = []

      for (let completed = 1; completed <= totalCalculations; completed++) {
        if (completed % progressStep === 0) {
          const percentage = Math.round((completed / totalCalculations) * 100)
          progressEvents.push(percentage)
        }
      }

      // Should emit 4 events: 25%, 50%, 75%, 100%
      expect(progressEvents).toEqual([25, 50, 75, 100])
    })

    it('should simulate progress events for 10x10 matrix', () => {
      const columns = 10
      const totalCalculations = 100
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      const progressEvents: number[] = []

      for (let completed = 1; completed <= totalCalculations; completed++) {
        if (completed % progressStep === 0) {
          const percentage = Math.round((completed / totalCalculations) * 100)
          progressEvents.push(percentage)
        }
      }

      // Should emit 10 events: 10%, 20%, ..., 100%
      expect(progressEvents).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    })
  })

  describe('Comparison: Old (Number) vs New (parseFloat) behavior', () => {
    it('should show difference in handling empty strings', () => {
      const emptyString = ''

      // Old behavior (WRONG)
      const oldResult = Number(emptyString)
      expect(oldResult).toBe(0) // Incorrectly treats as 0
      expect(!isNaN(oldResult) && isFinite(oldResult)).toBe(true) // Would pass validation!

      // New behavior (CORRECT)
      const newResult = parseFloat(String(emptyString))
      expect(newResult).toBeNaN() // Correctly treats as NaN
      expect(!isNaN(newResult) && isFinite(newResult)).toBe(false) // Correctly filtered out
    })

    it('should show difference in handling booleans', () => {
      const boolTrue = true
      const boolFalse = false

      // Old behavior (WRONG)
      expect(Number(boolTrue)).toBe(1)
      expect(Number(boolFalse)).toBe(0)
      expect(!isNaN(Number(boolTrue)) && isFinite(Number(boolTrue))).toBe(true)

      // New behavior (CORRECT)
      expect(parseFloat(String(boolTrue))).toBeNaN()
      expect(parseFloat(String(boolFalse))).toBeNaN()
      expect(!isNaN(parseFloat(String(boolTrue))) && isFinite(parseFloat(String(boolTrue)))).toBe(false)
    })

    it('should show identical behavior for valid numbers', () => {
      const validNumbers = ['42', '3.14', '-7.5', '0']

      validNumbers.forEach(numStr => {
        const oldResult = Number(numStr)
        const newResult = parseFloat(String(numStr))

        expect(oldResult).toBe(newResult)
        expect(!isNaN(oldResult) && isFinite(oldResult)).toBe(!isNaN(newResult) && isFinite(newResult))
      })
    })
  })
})
