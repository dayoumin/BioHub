/**
 * Interpretation Engine Edge Cases Tests
 *
 * formatPValue, formatPercent의 비정상 입력 처리 테스트
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Edge Cases (비정상 입력)', () => {
  describe('formatPValue() - 비정상 p-value 처리', () => {
    it('p = NaN → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: NaN,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('p = Infinity → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: Infinity,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('p = -Infinity → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: -Infinity,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('p = -0.5 (음수) → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: -0.5,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('p = 1.5 (>1) → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: 1.5,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('p = 2 (>1) → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: 2,
        statistic: 0
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })
  })

  describe('formatPercent() - 비정상 퍼센트 값 처리', () => {
    it('R² = NaN → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: 0 },
          { variable: 'X', value: 0, std: 0, pValue: 1 }
        ],
        additional: {
          rSquared: NaN
        },
        pValue: 0.5,
        statistic: 0
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('R² = Infinity → "N/A" 표시', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: 0 },
          { variable: 'X', value: 1, std: 0, pValue: 0 }
        ],
        additional: {
          rSquared: Infinity
        },
        pValue: 0,
        statistic: Infinity
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('N/A')
    })

    it('R² = -0.5 (음수) → "0.0%" 클램핑', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: 0 },
          { variable: 'X', value: 0, std: 0, pValue: 1 }
        ],
        additional: {
          rSquared: -0.5
        },
        pValue: 0.5,
        statistic: 0
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      // Math.max(0, -0.5) = 0 → "0.0%"
      expect(interpretation?.statistical).toContain('0.0%')
    })

    it('R² = 1.5 (>1) → "100.0%" 클램핑', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: 0 },
          { variable: 'X', value: 1, std: 0, pValue: 0 }
        ],
        additional: {
          rSquared: 1.5
        },
        pValue: 0,
        statistic: 100
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      // Math.min(1, 1.5) = 1 → "100.0%"
      expect(interpretation?.statistical).toContain('100.0%')
    })

    it('상관계수 r = 1.2 (>1) → r² 클램핑 → "100.0%"', () => {
      const results: AnalysisResult = {
        method: 'Pearson 상관분석',
        statistic: 1.2,  // 비정상: r > 1
        pValue: 0.001
      }

      const interpretation = getInterpretation(results, '관계')

      expect(interpretation).not.toBeNull()
      // r은 이미 [-1, 1]로 클램핑됨 (Line 76)
      // r² = 1 * 1 = 1 → "100.0%"
      expect(interpretation?.practical).toContain('100.0%')
    })

    it('상관계수 r = -1.5 (<-1) → r² 클램핑 → "100.0%"', () => {
      const results: AnalysisResult = {
        method: 'Pearson 상관분석',
        statistic: -1.5,  // 비정상: r < -1
        pValue: 0.001
      }

      const interpretation = getInterpretation(results, '관계')

      expect(interpretation).not.toBeNull()
      // r은 이미 [-1, 1]로 클램핑됨
      // r² = (-1) * (-1) = 1 → "100.0%"
      expect(interpretation?.practical).toContain('100.0%')
    })
  })

  describe('복합 Edge Cases (여러 비정상 값)', () => {
    it('p = NaN + R² = NaN → 모두 "N/A"', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: NaN },
          { variable: 'X', value: 0, std: 0, pValue: NaN }
        ],
        additional: {
          rSquared: NaN
        },
        pValue: NaN,
        statistic: NaN
      }

      const interpretation = getInterpretation(results, '예측')

      // R²가 NaN이므로 hasRSquared 체크 통과 못함 → null 반환 가능
      // 또는 해석이 있다면 "N/A" 포함
      if (interpretation) {
        expect(interpretation.statistical).toContain('N/A')
      } else {
        expect(interpretation).toBeNull()
      }
    })

    it('ANOVA: 모든 평균이 NaN → null 반환', () => {
      const results: AnalysisResult = {
        method: '일원분산분석 (ANOVA)',
        groupStats: [
          { name: 'A', mean: NaN, std: 2, n: 30 },
          { name: 'B', mean: NaN, std: 3, n: 30 },
          { name: 'C', mean: NaN, std: 2.5, n: 30 }
        ],
        pValue: 0.001,
        statistic: 25.3
      }

      const interpretation = getInterpretation(results)

      // NaN 필터링 → means.length < 3 → null 반환
      expect(interpretation).toBeNull()
    })

    it('ANOVA: 일부 평균만 NaN → 유효한 평균만 사용', () => {
      const results: AnalysisResult = {
        method: '일원분산분석 (ANOVA)',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: NaN, std: 3, n: 30 },  // NaN 제거됨
          { name: 'C', mean: 15, std: 2.5, n: 30 },
          { name: 'D', mean: 20, std: 2, n: 30 }
        ],
        pValue: 0.001,
        statistic: 30
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      // NaN 필터링 후 3개 유효 → 정상 처리
      expect(interpretation?.title).toBe('다집단 비교 결과')
      // 범위는 10 ~ 20
      expect(interpretation?.summary).toContain('10.00 ~ 20.00')
    })
  })

  describe('정상 범위 경계값 (Edge Cases가 아님 - 정상 동작 확인)', () => {
    it('p = 0.0000001 (매우 작은 값) → "< 0.001"', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: 0.0000001,
        statistic: 100
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('< 0.001')
    })

    it('p = 0.9999999 (거의 1) → "1.000"', () => {
      const results: AnalysisResult = {
        method: 'Chi-Square',
        pValue: 0.9999999,
        statistic: 0.001
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('1.000')
    })

    it('R² = 0.0000001 (거의 0) → "0.0%"', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 5, std: 0.5, pValue: 0.001 },
          { variable: 'X', value: 0.001, std: 0.3, pValue: 0.5 }
        ],
        additional: {
          rSquared: 0.0000001
        },
        pValue: 0.5,
        statistic: 0.001
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('0.0%')
    })

    it('R² = 0.9999999 (거의 1) → "100.0%"', () => {
      const results: AnalysisResult = {
        method: '선형 회귀',
        coefficients: [
          { variable: 'Intercept', value: 0, std: 0, pValue: 0 },
          { variable: 'X', value: 1, std: 0, pValue: 0 }
        ],
        additional: {
          rSquared: 0.9999999
        },
        pValue: 0,
        statistic: 10000
      }

      const interpretation = getInterpretation(results, '예측')

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('100.0%')
    })
  })
})
