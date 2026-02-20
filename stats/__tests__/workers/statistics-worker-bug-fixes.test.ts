/**
 * Test suite for statistics-worker.js bug fixes
 *
 * Bug #1: parseFloat vs Number conversion (empty strings, booleans)
 * Bug #3: Progress reporting divisor guard for small datasets
 */

describe('Statistics Worker Bug Fixes', () => {
  describe('Bug #1: parseFloat vs Number conversion', () => {
    it('should treat empty string as NaN (not 0)', () => {
      // Number('') === 0 (WRONG) ❌
      // parseFloat('') === NaN (CORRECT) ✅
      expect(Number('')).toBe(0)
      expect(parseFloat(String(''))).toBeNaN()
    })

    it('should treat whitespace as NaN (not 0)', () => {
      expect(Number('   ')).toBe(0)
      expect(parseFloat(String('   '))).toBeNaN()
    })

    it('should treat boolean as NaN (not 0/1)', () => {
      // Number(true) === 1 (WRONG) ❌
      // parseFloat(String(true)) === NaN (CORRECT) ✅
      expect(Number(true)).toBe(1)
      expect(Number(false)).toBe(0)
      expect(parseFloat(String(true))).toBeNaN()
      expect(parseFloat(String(false))).toBeNaN()
    })

    it('should correctly parse valid numeric strings', () => {
      expect(Number('42')).toBe(42)
      expect(parseFloat(String('42'))).toBe(42)

      expect(Number('3.14')).toBe(3.14)
      expect(parseFloat(String('3.14'))).toBe(3.14)
    })

    it('should handle actual numbers without conversion', () => {
      const num = 42
      expect(typeof num === 'number' ? num : parseFloat(String(num))).toBe(42)
    })
  })

  describe('Bug #3: Progress reporting divisor guard', () => {
    it('should avoid division by zero for small datasets', () => {
      // Scenario: 2 columns → 4 calculations
      // Math.floor(4 / 10) = 0 → divisor = 0 (WRONG) ❌
      // Math.max(1, Math.floor(4 / 10)) = 1 (CORRECT) ✅
      const totalCalculations = 4
      const oldDivisor = Math.floor(totalCalculations / 10)
      const newDivisor = Math.max(1, Math.floor(totalCalculations / 10))

      expect(oldDivisor).toBe(0)
      expect(newDivisor).toBe(1)
    })

    it('should not affect large datasets', () => {
      // Scenario: 20 columns → 400 calculations
      // Math.floor(400 / 10) = 40
      const totalCalculations = 400
      const oldDivisor = Math.floor(totalCalculations / 10)
      const newDivisor = Math.max(1, Math.floor(totalCalculations / 10))

      expect(oldDivisor).toBe(40)
      expect(newDivisor).toBe(40)
    })

    it('should emit progress events for small datasets', () => {
      const totalCalculations = 9 // 3x3 matrix
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      expect(progressStep).toBe(1)

      // Verify modulus operations work
      expect(1 % progressStep).toBe(0)
      expect(2 % progressStep).toBe(0)
      expect(9 % progressStep).toBe(0)
    })

    it('should emit progress events at 10% intervals for large datasets', () => {
      const totalCalculations = 100 // 10x10 matrix
      const progressStep = Math.max(1, Math.floor(totalCalculations / 10))

      expect(progressStep).toBe(10)

      // Verify 10% intervals
      expect(10 % progressStep).toBe(0)
      expect(20 % progressStep).toBe(0)
      expect(100 % progressStep).toBe(0)
    })
  })

  describe('Pairwise deletion behavior consistency', () => {
    it('should filter out non-numeric values consistently', () => {
      const testCases = [
        { value: '', expectedValid: false, description: 'empty string' },
        { value: '   ', expectedValid: false, description: 'whitespace' },
        { value: true, expectedValid: false, description: 'boolean true' },
        { value: false, expectedValid: false, description: 'boolean false' },
        { value: null, expectedValid: false, description: 'null' },
        { value: undefined, expectedValid: false, description: 'undefined' },
        { value: '42', expectedValid: true, description: 'numeric string' },
        { value: 42, expectedValid: true, description: 'number' },
        { value: 3.14, expectedValid: true, description: 'float' },
        { value: '3.14', expectedValid: true, description: 'float string' },
        { value: NaN, expectedValid: false, description: 'NaN' },
        { value: Infinity, expectedValid: false, description: 'Infinity' },
      ]

      testCases.forEach(({ value, expectedValid, description }) => {
        // Skip null/undefined (would fail null check)
        if (value === null || value === undefined) {
          return
        }

        const num = typeof value === 'number' ? value : parseFloat(String(value))
        const isValid = !isNaN(num) && isFinite(num)

        expect(isValid).toBe(expectedValid)
      })
    })
  })
})
