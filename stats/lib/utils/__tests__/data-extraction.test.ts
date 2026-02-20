import { extractNumericValue, extractRowValue, extractColumnData } from '../data-extraction'

describe('data-extraction utilities', () => {
  describe('extractNumericValue', () => {
    it('숫자를 그대로 반환한다', () => {
      expect(extractNumericValue(123)).toBe(123)
      expect(extractNumericValue(123.45)).toBe(123.45)
      expect(extractNumericValue(0)).toBe(0)
      expect(extractNumericValue(-10)).toBe(-10)
    })

    it('숫자 문자열을 숫자로 변환한다', () => {
      expect(extractNumericValue('123')).toBe(123)
      expect(extractNumericValue('123.45')).toBe(123.45)
      expect(extractNumericValue('0')).toBe(0)
      expect(extractNumericValue('-10')).toBe(-10)
    })

    it('공백이 있는 숫자 문자열도 변환한다', () => {
      expect(extractNumericValue('  123  ')).toBe(123)
      expect(extractNumericValue('\t123\n')).toBe(123)
    })

    it('유효하지 않은 값은 null을 반환한다', () => {
      expect(extractNumericValue('abc')).toBeNull()
      expect(extractNumericValue('12abc')).toBe(12) // parseFloat는 12까지 파싱
      expect(extractNumericValue('')).toBeNull()
      expect(extractNumericValue('   ')).toBeNull()
      expect(extractNumericValue(null)).toBeNull()
      expect(extractNumericValue(undefined)).toBeNull()
      expect(extractNumericValue({})).toBeNull()
      expect(extractNumericValue([])).toBeNull()
    })

    it('NaN을 null로 변환한다', () => {
      expect(extractNumericValue(NaN)).toBeNull()
    })

    it('Infinity를 그대로 반환한다', () => {
      expect(extractNumericValue(Infinity)).toBe(Infinity)
      expect(extractNumericValue(-Infinity)).toBe(-Infinity)
    })
  })

  describe('extractRowValue', () => {
    it('객체에서 숫자 값을 추출한다', () => {
      const row = { age: 25, height: 170 }
      expect(extractRowValue(row, 'age')).toBe(25)
      expect(extractRowValue(row, 'height')).toBe(170)
    })

    it('객체에서 문자열 숫자를 변환하여 추출한다', () => {
      const row = { age: '25', height: '170.5' }
      expect(extractRowValue(row, 'age')).toBe(25)
      expect(extractRowValue(row, 'height')).toBe(170.5)
    })

    it('존재하지 않는 컬럼은 null을 반환한다', () => {
      const row = { age: 25 }
      expect(extractRowValue(row, 'height')).toBeNull()
    })

    it('유효하지 않은 값은 null을 반환한다', () => {
      const row = { age: 'abc', height: null, weight: undefined }
      expect(extractRowValue(row, 'age')).toBeNull()
      expect(extractRowValue(row, 'height')).toBeNull()
      expect(extractRowValue(row, 'weight')).toBeNull()
    })

    it('row가 객체가 아니면 null을 반환한다', () => {
      expect(extractRowValue(null, 'age')).toBeNull()
      expect(extractRowValue(undefined, 'age')).toBeNull()
      expect(extractRowValue(123, 'age')).toBeNull()
      expect(extractRowValue('abc', 'age')).toBeNull()
    })
  })

  describe('extractColumnData', () => {
    it('데이터 배열에서 모든 유효한 숫자를 추출한다', () => {
      const data = [
        { height: 170, weight: 65 },
        { height: 180, weight: 75 },
        { height: 165, weight: 60 }
      ]
      expect(extractColumnData(data, 'height')).toEqual([170, 180, 165])
      expect(extractColumnData(data, 'weight')).toEqual([65, 75, 60])
    })

    it('문자열 숫자도 변환하여 추출한다', () => {
      const data = [
        { height: '170', weight: 65 },
        { height: 180, weight: '75' },
        { height: '165', weight: 60 }
      ]
      expect(extractColumnData(data, 'height')).toEqual([170, 180, 165])
    })

    it('null과 유효하지 않은 값은 제외한다', () => {
      const data = [
        { height: 170 },
        { height: null },
        { height: 'abc' },
        { height: undefined },
        { height: 180 },
        {}
      ]
      expect(extractColumnData(data, 'height')).toEqual([170, 180])
    })

    it('빈 배열은 빈 배열을 반환한다', () => {
      expect(extractColumnData([], 'height')).toEqual([])
    })

    it('존재하지 않는 컬럼은 빈 배열을 반환한다', () => {
      const data = [
        { age: 25 },
        { age: 30 }
      ]
      expect(extractColumnData(data, 'height')).toEqual([])
    })

    it('실제 CSV 데이터 시나리오를 처리한다', () => {
      // CSV에서 파싱된 데이터는 모든 값이 문자열
      const csvData = [
        { id: '1', score: '85.5', grade: 'A' },
        { id: '2', score: '90.0', grade: 'A' },
        { id: '3', score: '75.5', grade: 'B' },
        { id: '4', score: 'N/A', grade: 'F' }
      ]
      expect(extractColumnData(csvData, 'id')).toEqual([1, 2, 3, 4])
      expect(extractColumnData(csvData, 'score')).toEqual([85.5, 90.0, 75.5])
    })
  })
})
