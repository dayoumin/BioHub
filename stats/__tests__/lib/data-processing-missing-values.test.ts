/**
 * 결측값 자동 인식 테스트
 * 다양한 소프트웨어에서 사용되는 결측값 패턴을 올바르게 인식하는지 검증
 */

import { analyzeColumnDataTypes, validateData } from '../../lib/data-processing'

describe('Missing Value Recognition', () => {
  describe('isMissingValue - basic patterns', () => {
    it('should recognize empty string as missing', () => {
      const result = analyzeColumnDataTypes([1, 2, '', 4, 5])
      expect(result.emptyCount).toBe(1)
      expect(result.numericCount).toBe(4)
    })

    it('should recognize null and undefined as missing', () => {
      const result = analyzeColumnDataTypes([1, null, 3, undefined, 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize NA patterns (R, pandas)', () => {
      const result = analyzeColumnDataTypes([1, 'NA', 3, 'na', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize N/A patterns (Excel)', () => {
      const result = analyzeColumnDataTypes([1, 'N/A', 3, 'n/a', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize hyphen as missing', () => {
      const result = analyzeColumnDataTypes([1, '-', 3, 4, 5])
      expect(result.emptyCount).toBe(1)
      expect(result.numericCount).toBe(4)
    })

    it('should recognize dot as missing (SAS, SPSS)', () => {
      const result = analyzeColumnDataTypes([1, '.', 3, 4, 5])
      expect(result.emptyCount).toBe(1)
      expect(result.numericCount).toBe(4)
    })

    it('should recognize NULL patterns (database)', () => {
      const result = analyzeColumnDataTypes([1, 'NULL', 3, 'null', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize NaN patterns (JavaScript, Python)', () => {
      const result = analyzeColumnDataTypes([1, 'NaN', 3, 'nan', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize Excel error codes', () => {
      const result = analyzeColumnDataTypes([1, '#N/A', 3, '#NA', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should recognize missing keyword', () => {
      const result = analyzeColumnDataTypes([1, 'missing', 3, 'MISSING', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })
  })

  describe('isMissingValue - edge cases', () => {
    it('should handle whitespace around missing values', () => {
      const result = analyzeColumnDataTypes([1, '  NA  ', 3, ' - ', 5])
      expect(result.emptyCount).toBe(2)
      expect(result.numericCount).toBe(3)
    })

    it('should NOT treat regular text as missing', () => {
      const result = analyzeColumnDataTypes(['apple', 'banana', 'cherry'])
      expect(result.emptyCount).toBe(0)
      expect(result.textCount).toBe(3)
    })

    it('should NOT treat numbers as missing', () => {
      const result = analyzeColumnDataTypes([0, -1, 999])
      expect(result.emptyCount).toBe(0)
      expect(result.numericCount).toBe(3)
    })

    it('should handle all missing values', () => {
      const result = analyzeColumnDataTypes(['NA', null, '', '-'])
      expect(result.emptyCount).toBe(4)
      expect(result.issues).toContain('모든 값이 비어있습니다.')
    })

    it('should handle numeric NaN (JavaScript)', () => {
      const result = analyzeColumnDataTypes([1, NaN, 3])
      expect(result.emptyCount).toBe(1)
      expect(result.numericCount).toBe(2)
    })
  })

  describe('validateData - missing value counting', () => {
    it('should correctly count missing values in columns', () => {
      const headers = ['value', 'group']
      const rows = [
        { value: 1, group: 'A' },
        { value: 'NA', group: 'B' },
        { value: 3, group: '-' },
        { value: null, group: 'A' },
        { value: 5, group: '' },
      ]

      const result = validateData(headers, rows)

      const valueColumn = result.columns.find(c => c.name === 'value')
      const groupColumn = result.columns.find(c => c.name === 'group')

      expect(valueColumn?.missingCount).toBe(2) // NA, null
      expect(groupColumn?.missingCount).toBe(2) // -, ''
    })

    it('should correctly calculate unique values excluding missing', () => {
      const headers = ['category']
      const rows = [
        { category: 'A' },
        { category: 'NA' },
        { category: 'B' },
        { category: 'A' },
        { category: '-' },
        { category: 'B' },
      ]

      const result = validateData(headers, rows)
      const categoryColumn = result.columns.find(c => c.name === 'category')

      expect(categoryColumn?.uniqueCount).toBe(2) // A, B (NA and - are missing)
      expect(categoryColumn?.missingCount).toBe(2)
    })
  })

  describe('Mixed data from different sources', () => {
    it('should handle data exported from R', () => {
      const result = analyzeColumnDataTypes([1.5, 2.3, 'NA', 4.1, 'NA'])
      expect(result.emptyCount).toBe(2)
      expect(result.detectedType).toBe('numeric')
    })

    it('should handle data exported from Excel', () => {
      const result = analyzeColumnDataTypes([100, 200, '#N/A', 400, ''])
      expect(result.emptyCount).toBe(2)
      expect(result.detectedType).toBe('numeric')
    })

    it('should handle data exported from SPSS', () => {
      const result = analyzeColumnDataTypes([1, 2, '.', 4, '.'])
      expect(result.emptyCount).toBe(2)
      expect(result.detectedType).toBe('numeric')
    })

    it('should handle data from database exports', () => {
      // A, A, B, B - 2 unique values with 50% ratio = categorical
      const result = analyzeColumnDataTypes(['A', 'NULL', 'A', 'null', 'B', 'B'])
      expect(result.emptyCount).toBe(2)
      expect(result.detectedType).toBe('categorical')
    })
  })
})
