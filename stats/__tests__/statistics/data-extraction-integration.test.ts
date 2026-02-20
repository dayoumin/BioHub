/**
 * 데이터 추출 버그 수정 통합 테스트
 *
 * 5개 수정 페이지가 CSV 문자열 데이터를 올바르게 처리하는지 검증
 */

import { extractRowValue, extractColumnData } from '@/lib/utils/data-extraction'

describe('Statistics Pages - Data Extraction Fix', () => {
  /**
   * 시나리오: CSV 파일에서 파싱된 데이터 (모든 값이 문자열)
   */
  const csvData = [
    { id: '1', height: '170', weight: '65.5', group: 'A' },
    { id: '2', height: '180', weight: '75.0', group: 'B' },
    { id: '3', height: '165', weight: '60.5', group: 'A' },
    { id: '4', height: 'N/A', weight: '70.0', group: 'B' },
    { id: '5', height: '175', weight: null, group: 'A' }
  ]

  describe('Mann-Whitney Test', () => {
    it('그룹별 데이터를 문자열에서 숫자로 변환한다', () => {
      const groups = new Map<string, number[]>()

      for (const row of csvData) {
        const groupValue = row.group
        const depValue = extractRowValue(row, 'height')

        if (groupValue && depValue !== null) {
          if (!groups.has(groupValue)) {
            groups.set(groupValue, [])
          }
          groups.get(groupValue)!.push(depValue)
        }
      }

      expect(groups.get('A')).toEqual([170, 165, 175])
      expect(groups.get('B')).toEqual([180])
    })

    it('유효하지 않은 값은 제외한다', () => {
      const row = csvData[3] // height: 'N/A'
      const value = extractRowValue(row, 'height')
      expect(value).toBeNull()
    })
  })

  describe('Mann-Kendall Test', () => {
    it('시계열 데이터를 문자열에서 숫자로 변환한다', () => {
      const data = csvData.map(row => extractRowValue(row, 'height'))
        .filter((v): v is number => v !== null)

      expect(data).toEqual([170, 180, 165, 175])
      expect(data.length).toBe(4) // 'N/A' 제외
    })
  })

  describe('Wilcoxon Test', () => {
    it('대응표본 데이터를 문자열에서 숫자로 변환한다', () => {
      const values1: number[] = []
      const values2: number[] = []

      for (const row of csvData) {
        const val1 = extractRowValue(row, 'height')
        const val2 = extractRowValue(row, 'weight')

        if (val1 !== null && val2 !== null) {
          values1.push(val1)
          values2.push(val2)
        }
      }

      expect(values1).toEqual([170, 180, 165])
      expect(values2).toEqual([65.5, 75.0, 60.5])
      expect(values1.length).toBe(values2.length)
    })

    it('한쪽이 null이면 쌍을 제외한다', () => {
      const row = csvData[4] // height: '175', weight: null
      const val1 = extractRowValue(row, 'height')
      const val2 = extractRowValue(row, 'weight')

      expect(val1).toBe(175)
      expect(val2).toBeNull()

      // 실제 코드에서는 이 쌍이 제외됨
      const shouldInclude = val1 !== null && val2 !== null
      expect(shouldInclude).toBe(false)
    })
  })

  describe('Normality Test', () => {
    it('extractColumnData로 전체 컬럼을 변환한다', () => {
      const values = extractColumnData(csvData, 'height')

      expect(values).toEqual([170, 180, 165, 175])
      expect(values.length).toBe(4)
    })

    it('최소 데이터 수를 체크한다', () => {
      const values = extractColumnData(csvData, 'height')

      expect(values.length >= 3).toBe(true)
    })
  })

  describe('Regression Page (이미 수정 완료)', () => {
    it('X, Y 변수를 문자열에서 숫자로 변환한다', () => {
      const xData: number[] = []
      const yData: number[] = []

      for (const row of csvData) {
        const xVal = extractRowValue(row, 'height')
        const yVal = extractRowValue(row, 'weight')

        if (xVal !== null && yVal !== null) {
          xData.push(xVal)
          yData.push(yVal)
        }
      }

      expect(xData).toEqual([170, 180, 165])
      expect(yData).toEqual([65.5, 75.0, 60.5])
      expect(xData.length).toBeGreaterThanOrEqual(3) // 최소 3쌍 필요
    })
  })

  describe('Edge Cases', () => {
    it('빈 문자열은 null을 반환한다', () => {
      const row = { value: '' }
      expect(extractRowValue(row, 'value')).toBeNull()
    })

    it('공백만 있는 문자열은 null을 반환한다', () => {
      const row = { value: '   ' }
      expect(extractRowValue(row, 'value')).toBeNull()
    })

    it('숫자형 문자열 앞뒤 공백을 제거한다', () => {
      const row = { value: '  123  ' }
      expect(extractRowValue(row, 'value')).toBe(123)
    })

    it('소수점 문자열을 정확히 변환한다', () => {
      const row = { value: '65.5' }
      expect(extractRowValue(row, 'value')).toBe(65.5)
    })

    it('음수 문자열을 변환한다', () => {
      const row = { value: '-10.5' }
      expect(extractRowValue(row, 'value')).toBe(-10.5)
    })
  })
})
