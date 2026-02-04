/**
 * Interpretation Engine Regression Variants Tests (Phase 3)
 *
 * 회귀 변형 5개 해석 테스트:
 * 1. Poisson Regression (포아송 회귀)
 * 2. Ordinal Regression (순서형 회귀)
 * 3. Logistic Regression (로지스틱 회귀)
 * 4. Stepwise Regression (단계적 회귀)
 * 5. Partial Correlation (편상관)
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Regression Variants (Phase 3)', () => {
  describe('Poisson Regression (포아송 회귀)', () => {
    it('유의한 예측변수 (p < 0.05, IRR 해석 포함)', () => {
      const results: AnalysisResult = {
        method: 'Poisson Regression',
        pValue: 0.001,
        statistic: 25.3,
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.3, stdError: 0.05, tValue: 6.0, pvalue: 0.001 },
          { name: 'X2', value: -0.2, stdError: 0.04, tValue: -5.0, pvalue: 0.001 }
        ],
        additional: {
          pseudoRSquaredMcfadden: 0.25,
          aic: 150.5
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('포아송 회귀 결과')
      expect(interpretation?.summary).toContain('카운트 데이터')
      expect(interpretation?.summary).toContain('예측변수 2개')
      expect(interpretation?.statistical).toContain('2개 예측변수가 카운트 결과에 통계적으로 유의한 영향')
      expect(interpretation?.statistical).toContain('25')
      expect(interpretation?.practical).toContain('IRR')
      expect(interpretation?.practical).toContain('Incidence Rate Ratio')
    })

    it('유의하지 않은 예측변수 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Poisson Regression',
        pValue: 0.5,
        statistic: 1.2,
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.1, stdError: 0.1, tValue: 1.0, pvalue: 0.3 }
        ],
        additional: {
          pseudoRSquaredMcfadden: 0.05
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 예측변수가 없습니다')
      expect(interpretation?.practical).toContain('모형 재검토가 필요합니다')
    })

    it('한글 표기 (포아송 회귀)', () => {
      const results: AnalysisResult = {
        method: '포아송 회귀',
        pValue: 0.01,
        statistic: 10.5,
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.2, stdError: 0.05, tValue: 4.0, pvalue: 0.01 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('포아송 회귀 결과')
    })
  })

  describe('Ordinal Regression (순서형 회귀)', () => {
    it('유의한 예측변수 (p < 0.05, Odds Ratio 해석)', () => {
      const results: AnalysisResult = {
        method: 'Ordinal Regression',
        pValue: 0.0001,
        statistic: 35.2,
        coefficients: [
          { name: 'X1', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X2', value: -0.3, stdError: 0.08, tValue: -3.75, pvalue: 0.001 },
          { name: 'X3', value: 0.2, stdError: 0.05, tValue: 4.0, pvalue: 0.001 }
        ],
        additional: {
          pseudoRSquared: 0.30,
          aic: 200.5
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('순서형 회귀 결과')
      expect(interpretation?.summary).toContain('순서형 종속변수')
      expect(interpretation?.summary).toContain('비례 오즈 모형')
      expect(interpretation?.summary).toContain('예측변수 3개')
      expect(interpretation?.statistical).toContain('3개 예측변수가 순서형 결과에 통계적으로 유의한 영향')
      expect(interpretation?.practical).toContain('오즈비')
      expect(interpretation?.practical).toContain('Odds Ratio')
    })

    it('유의하지 않은 예측변수 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Ordinal Regression',
        pValue: 0.6,
        statistic: 0.8,
        coefficients: [
          { name: 'X1', value: 0.05, stdError: 0.1, tValue: 0.5, pvalue: 0.6 }
        ],
        additional: {
          pseudoRSquared: 0.02
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 예측변수가 없습니다')
      expect(interpretation?.practical).toContain('모형 재검토가 필요합니다')
    })

    it('한글 표기 (순서형 회귀)', () => {
      const results: AnalysisResult = {
        method: '순서형 회귀',
        pValue: 0.01,
        statistic: 15.2,
        coefficients: [
          { name: 'X1', value: 0.3, stdError: 0.1, tValue: 3.0, pvalue: 0.01 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('순서형 회귀 결과')
    })
  })

  describe('Logistic Regression (로지스틱 회귀)', () => {
    it('유의한 예측변수 (p < 0.05, 정확도 포함)', () => {
      const results: AnalysisResult = {
        method: 'Logistic Regression',
        pValue: 0.0001,
        statistic: 40.5,
        coefficients: [
          { name: 'Intercept', value: -1.0, stdError: 0.2, tValue: -5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.6, stdError: 0.1, tValue: 6.0, pvalue: 0.001 },
          { name: 'X2', value: -0.4, stdError: 0.08, tValue: -5.0, pvalue: 0.001 }
        ],
        additional: {
          pseudoRSquared: 0.35,
          accuracy: 0.85,
          aic: 180.5
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('로지스틱 회귀 결과')
      expect(interpretation?.summary).toContain('이분형 종속변수')
      expect(interpretation?.summary).toContain('예측변수 2개')
      expect(interpretation?.statistical).toContain('2개 예측변수가 결과 확률에 통계적으로 유의한 영향')
      expect(interpretation?.statistical).toContain('35')
      expect(interpretation?.statistical).toContain('85')
      expect(interpretation?.practical).toContain('오즈비')
      expect(interpretation?.practical).toContain('Odds Ratio')
    })

    it('유의하지 않은 예측변수 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Logistic Regression',
        pValue: 0.4,
        statistic: 1.5,
        coefficients: [
          { name: 'Intercept', value: -0.5, stdError: 0.2, tValue: -2.5, pvalue: 0.01 },
          { name: 'X1', value: 0.1, stdError: 0.1, tValue: 1.0, pvalue: 0.3 }
        ],
        additional: {
          pseudoRSquared: 0.03,
          accuracy: 0.55
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 예측변수가 없습니다')
      expect(interpretation?.practical).toContain('모형 재검토가 필요합니다')
    })

    it('한글 표기 (로지스틱 회귀)', () => {
      const results: AnalysisResult = {
        method: '로지스틱 회귀',
        pValue: 0.005,
        statistic: 20.3,
        coefficients: [
          { name: 'Intercept', value: -1.0, stdError: 0.2, tValue: -5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('로지스틱 회귀 결과')
    })

    it('Binary Logistic (별칭 표기)', () => {
      const results: AnalysisResult = {
        method: 'Binary Logistic',
        pValue: 0.001,
        statistic: 25.5,
        coefficients: [
          { name: 'Intercept', value: -1.0, stdError: 0.2, tValue: -5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.4, stdError: 0.08, tValue: 5.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('로지스틱 회귀 결과')
    })
  })

  describe('Stepwise Regression (단계적 회귀)', () => {
    it('최종 모형에 유의한 변수 선택 (R², adj. R² 포함)', () => {
      const results: AnalysisResult = {
        method: 'Stepwise Regression',
        pValue: 0.0001,
        statistic: 50.2,
        coefficients: [
          { name: 'Intercept', value: 5.0, stdError: 0.5, tValue: 10.0, pvalue: 0.001 },
          { name: 'X1', value: 0.8, stdError: 0.1, tValue: 8.0, pvalue: 0.001 },
          { name: 'X2', value: 0.6, stdError: 0.08, tValue: 7.5, pvalue: 0.001 },
          { name: 'X3', value: 0.4, stdError: 0.06, tValue: 6.67, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.75,
          adjRSquared: 0.73,
          finalVariables: ['X1', 'X2', 'X3']
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('단계적 회귀 결과')
      expect(interpretation?.summary).toContain('단계적 변수 선택')
      expect(interpretation?.summary).toContain('최종 선택 변수: 3개')
      expect(interpretation?.statistical).toContain('3개 예측변수가 최종 모형에 포함')
      expect(interpretation?.statistical).toContain('75')
      expect(interpretation?.statistical).toContain('73')
      expect(interpretation?.practical).toContain('회귀계수')
      expect(interpretation?.practical).toContain('다중공선성')
      expect(interpretation?.practical).toContain('VIF')
    })

    it('유의한 변수 선택되지 않음 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Stepwise Regression',
        pValue: 0.5,
        statistic: 1.2,
        coefficients: [
          { name: 'Intercept', value: 10.0, stdError: 1.0, tValue: 10.0, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.05,
          adjRSquared: 0.02,
          finalVariables: []
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('최종 모형에 유의한 예측변수가 없습니다')
      expect(interpretation?.practical).toContain('선택된 변수가 없거나 모형 설명력이 낮습니다')
      expect(interpretation?.practical).toContain('비선형 모형')
    })

    it('한글 표기 (단계적 회귀)', () => {
      const results: AnalysisResult = {
        method: '단계적 회귀',
        pValue: 0.001,
        statistic: 30.5,
        coefficients: [
          { name: 'Intercept', value: 5.0, stdError: 0.5, tValue: 10.0, pvalue: 0.001 },
          { name: 'X1', value: 0.7, stdError: 0.1, tValue: 7.0, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.60,
          finalVariables: ['X1']
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('단계적 회귀 결과')
    })

    it('Forward Selection (별칭 표기)', () => {
      const results: AnalysisResult = {
        method: 'Forward Selection',
        pValue: 0.001,
        statistic: 35.2,
        coefficients: [
          { name: 'Intercept', value: 5.0, stdError: 0.5, tValue: 10.0, pvalue: 0.001 },
          { name: 'X1', value: 0.6, stdError: 0.08, tValue: 7.5, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.65,
          finalVariables: ['X1']
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('단계적 회귀 결과')
    })
  })

  describe('Partial Correlation (편상관)', () => {
    it('유의한 편상관 (p < 0.05, 양의 관계)', () => {
      const results: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.001,
        statistic: 0.65,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('편상관 분석 결과')
      expect(interpretation?.summary).toContain('통제변수의 영향을 제거')
      expect(interpretation?.summary).toContain('순수한 관계')
      expect(interpretation?.statistical).toContain('편상관계수는 0.650')
      expect(interpretation?.statistical).toContain('통계적으로 유의합니다')
      expect(interpretation?.practical).toContain('중간 강도의 양의 관계')  // CHANGED: r=0.65는 중간 강도 (STRONG = 0.7)
      expect(interpretation?.practical).toContain('42')
    })

    it('유의한 편상관 (p < 0.05, 음의 관계)', () => {
      const results: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.01,
        statistic: -0.55,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('-0.550')
      expect(interpretation?.practical).toContain('중간 강도의 음의 관계')
      expect(interpretation?.practical).toContain('30')
    })

    it('유의하지 않은 편상관 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.25,
        statistic: 0.15,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('통계적으로 유의하지 않습니다')
      expect(interpretation?.practical).toContain('통제변수의 영향을 제거하면 두 변수 간 유의한 관계가 없습니다')
    })

    it('한글 표기 (편상관)', () => {
      const results: AnalysisResult = {
        method: '편상관',
        pValue: 0.005,
        statistic: 0.70,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('편상관 분석 결과')
    })

    it('약한 편상관 (r < 0.3)', () => {
      const results: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.04,
        statistic: 0.25,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toContain('약한 양의 관계')
    })
  })

  describe('Edge Cases (경계값 테스트)', () => {
    it('p-value = 0.05 (경계값) → 유의하지 않음', () => {
      const results: AnalysisResult = {
        method: 'Poisson Regression',
        pValue: 0.05,
        statistic: 3.84,
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.1, stdError: 0.05, tValue: 2.0, pvalue: 0.05 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('유의한 예측변수가 없습니다')
    })

    it('p-value < 0.001 → "< 0.001" 포맷', () => {
      const results: AnalysisResult = {
        method: 'Logistic Regression',
        pValue: 0.00005,
        statistic: 50.3,
        coefficients: [
          { name: 'Intercept', value: -1.0, stdError: 0.1, tValue: -10.0, pvalue: 0.00001 },
          { name: 'X1', value: 0.8, stdError: 0.08, tValue: 10.0, pvalue: 0.00001 }
        ],
        additional: {
          pseudoRSquared: 0.45
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('45')
    })

    it('Partial Correlation r = 0 (상관 없음, p > 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.95,
        statistic: 0.01,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      // p > 0.05이므로 "유의한 관계가 없습니다"만 표시 (강도 판단 없음)
      expect(interpretation?.practical).toContain('통제변수의 영향을 제거하면 두 변수 간 유의한 관계가 없습니다')
    })
  })

  describe('통합 테스트: 5가지 회귀 변형 동시 검증', () => {
    it('회귀 변형 5개 모두 정상 동작', () => {
      const poisson: AnalysisResult = {
        method: 'Poisson Regression',
        pValue: 0.001,
        statistic: 20.5,
        coefficients: [
          { name: 'Intercept', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.3, stdError: 0.05, tValue: 6.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const ordinal: AnalysisResult = {
        method: 'Ordinal Regression',
        pValue: 0.0001,
        statistic: 30.2,
        coefficients: [
          { name: 'X1', value: 0.5, stdError: 0.1, tValue: 5.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const logistic: AnalysisResult = {
        method: 'Logistic Regression',
        pValue: 0.0001,
        statistic: 40.5,
        coefficients: [
          { name: 'Intercept', value: -1.0, stdError: 0.2, tValue: -5.0, pvalue: 0.001 },
          { name: 'X1', value: 0.6, stdError: 0.1, tValue: 6.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const stepwise: AnalysisResult = {
        method: 'Stepwise Regression',
        pValue: 0.0001,
        statistic: 50.2,
        coefficients: [
          { name: 'Intercept', value: 5.0, stdError: 0.5, tValue: 10.0, pvalue: 0.001 },
          { name: 'X1', value: 0.8, stdError: 0.1, tValue: 8.0, pvalue: 0.001 }
        ],
        additional: {
          rSquared: 0.75,
          finalVariables: ['X1']
        },
        interpretation: ''
      }

      const partial: AnalysisResult = {
        method: 'Partial Correlation',
        pValue: 0.001,
        statistic: 0.65,
        interpretation: ''
      }

      const poissonInterpretation = getInterpretation(poisson)
      const ordinalInterpretation = getInterpretation(ordinal)
      const logisticInterpretation = getInterpretation(logistic)
      const stepwiseInterpretation = getInterpretation(stepwise)
      const partialInterpretation = getInterpretation(partial)

      // Poisson Regression
      expect(poissonInterpretation?.title).toBe('포아송 회귀 결과')

      // Ordinal Regression
      expect(ordinalInterpretation?.title).toBe('순서형 회귀 결과')

      // Logistic Regression
      expect(logisticInterpretation?.title).toBe('로지스틱 회귀 결과')

      // Stepwise Regression
      expect(stepwiseInterpretation?.title).toBe('단계적 회귀 결과')

      // Partial Correlation
      expect(partialInterpretation?.title).toBe('편상관 분석 결과')
    })
  })
})
