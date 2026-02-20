/**
 * Interpretation Engine Helper Functions Unit Tests
 *
 * formatPValue, formatPercent, isSignificant 함수 테스트
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Helper Functions', () => {
  describe('formatPValue() - indirect testing via getInterpretation()', () => {
    // Helper 함수는 private이므로 getInterpretation()을 통해 간접 테스트

    it('p < 0.001 → "< 0.001" 포맷', () => {
      const results: AnalysisResult = {
        method: '독립표본 t-검정',
        interpretation: 'Test interpretation',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: 15, std: 3, n: 30 }
        ],
        pValue: 0.0001,
        statistic: 3.5
      }

      const interpretation = getInterpretation(results, '비교')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.statistical).not.toContain('0.000')
    })

    it('p = 0.023 → "0.023" 포맷 (3자리)', () => {
      const results: AnalysisResult = {
        method: '독립표본 t-검정',
        interpretation: 'Test interpretation',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: 12, std: 3, n: 30 }
        ],
        pValue: 0.0234,
        statistic: 2.1
      }

      const interpretation = getInterpretation(results, '비교')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('0.023')
    })

    it('p = 0.05678 → "0.057" 포맷 (반올림)', () => {
      const results: AnalysisResult = {
        method: '독립표본 t-검정',
        interpretation: 'Test interpretation',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: 11, std: 3, n: 30 }
        ],
        pValue: 0.05678,
        statistic: 1.5
      }

      const interpretation = getInterpretation(results, '비교')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('0.057')
    })
  })

  describe('formatPercent() - indirect testing', () => {
    it('R² = 0.456 → "45.6%" 포맷', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        interpretation: 'Test interpretation',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.456
        },
        pValue: 0.001,
        statistic: 15.2
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('45.6%')
    })

    it('R² = 0.789 → "78.9%" 포맷', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        interpretation: 'Test interpretation',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.789
        },
        pValue: 0.001,
        statistic: 30.5
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('78.9%')
    })

    it('r² (상관) = 0.64 → "64.0%" 포맷 (r=0.8)', () => {
      const results: AnalysisResult = {
        method: 'Pearson 상관분석',
        interpretation: 'Test interpretation',
        statistic: 0.8,  // r = 0.8
        pValue: 0.001
      }

      const interpretation = getInterpretation(results, '관계')

      expect(interpretation).not.toBeNull()
      // r² = 0.8 * 0.8 = 0.64 → 64.0%
      expect(interpretation?.practical).toContain('64.0%')
    })
  })

  describe('isSignificant() - indirect testing', () => {
    it('p = 0.049 → 유의함 (< 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        interpretation: 'Test interpretation',
        pValue: 0.049,
        statistic: 5.2
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('통계적으로 유의한 연관성이 있습니다')
    })

    it('p = 0.051 → 유의하지 않음 (>= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        interpretation: 'Test interpretation',
        pValue: 0.051,
        statistic: 3.8
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('통계적으로 유의한 연관성이 없습니다')
    })

    it('p = 0.05 → 경계값은 유의하지 않음으로 처리', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        interpretation: 'Test interpretation',
        pValue: 0.05,
        statistic: 3.84
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      // p < 0.05가 아니므로 유의하지 않음
      expect(interpretation?.statistical).toContain('통계적으로 유의한 연관성이 없습니다')
    })
  })

  describe('통합 테스트: Helper 함수 조합', () => {
    it('ANOVA: isSignificant + formatPValue 함께 사용', () => {
      const results: AnalysisResult = {
        method: '일원분산분석 (ANOVA)',
        interpretation: 'Test interpretation',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: 15, std: 3, n: 30 },
          { name: 'C', mean: 20, std: 2.5, n: 30 }
        ],
        pValue: 0.0005,
        statistic: 25.3
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      // isSignificant(0.0005) → true
      expect(interpretation?.statistical).toContain('적어도 하나의 그룹 평균이 통계적으로 다릅니다')
      // formatPValue(0.0005) → "< 0.001"
      expect(interpretation?.statistical).toContain('< 0.001')
    })

    it('상관분석: formatPValue + formatPercent 함께 사용', () => {
      const results: AnalysisResult = {
        method: 'Pearson 상관분석',
        statistic: 0.6,  // r = 0.6
        pValue: 0.012,
      interpretation: 'Test interpretation'}

      const interpretation = getInterpretation(results, '관계')

      expect(interpretation).not.toBeNull()
      // formatPValue(0.012) → "0.012"
      expect(interpretation?.statistical).toContain('0.012')
      // formatPercent(0.6 * 0.6) → "36.0%"
      expect(interpretation?.practical).toContain('36.0%')
    })
  })

  describe('Edge Cases (경계 케이스)', () => {
    it('p = 0 → "< 0.001"로 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        interpretation: 'Test interpretation',
        pValue: 0,
        statistic: 50
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('< 0.001')
    })

    it('p = 1 → "1.000"로 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        interpretation: 'Test interpretation',
        pValue: 1,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('1.000')
    })

    it('R² = 0 → "0.0%" 표시', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        interpretation: 'Test interpretation',
        coefficients: [
          { name: 'Intercept', value: 5, stdError: 0.5, tValue: 10, pvalue: 0.001 },
          { name: 'X', value: 0, stdError: 0.3, tValue: 0, pvalue: 0.5 }
        ],
        additional: {
          rSquared: 0
        },
        pValue: 0.5,
        statistic: 0
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('0.0%')
    })

    it('R² = 1 → "100.0%" 표시', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        interpretation: 'Test interpretation',
        coefficients: [
          { name: 'Intercept', value: 0, stdError: 0, tValue: 0, pvalue: 0 },
          { name: 'X', value: 1, stdError: 0, tValue: Infinity, pvalue: 0 }
        ],
        additional: {
          rSquared: 1
        },
        pValue: 0,
        statistic: Infinity
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('100.0%')
    })
  })
})
