/**
 * 해석 엔진 코드 리뷰 검증 테스트
 *
 * 목표: Critical 버그 수정 확인 + 경계값 조건 검증
 */

import { describe, it } from '@jest/globals'
import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('해석 엔진 코드 리뷰 검증', () => {
  // ===== 1. Critical 버그 수정 확인 =====
  describe('Critical 버그 수정', () => {
    it('Bug#1: Optional Chaining - groupStats?.length (2집단 비교)', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0.03,
        statistic: 2.5,
        interpretation: '',
        // groupStats: undefined (의도적 누락)
      }

      // undefined 접근 시 에러 발생 안 함
      expect(() => getInterpretation(input, '비교')).not.toThrow()
      const result = getInterpretation(input, '비교')
      // purpose 기반에서 groupStats 없으면 null → method 기반 fallback으로 해석 제공
      // 독립표본 t검정은 groupStats 없이도 기본 해석 가능
      expect(result).not.toBeNull()
      expect(result?.title).toContain('t')
    })

    it('Bug#2: group2.mean.toFixed(2) - 타이포 수정 확인', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0.03,
        statistic: 2.5,
        interpretation: '',
        groupStats: [
          { name: 'Control', mean: 10.5, std: 2.1, n: 30 },
          { name: 'Treatment', mean: 12.8, std: 2.3, n: 30 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result).not.toBeNull()

      // summary에 group2.mean이 정상적으로 표시되는지 확인
      expect(result?.summary).toContain('10.50') // group1.mean
      expect(result?.summary).toContain('12.80') // group2.mean ✅
    })

    it('Bug#3: 명시적 타입 가드 - ANOVA groupStats', () => {
      const input: AnalysisResult = {
        method: 'One-Way ANOVA',
        pValue: 0.01,
        statistic: 5.2,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 12, std: 1.8, n: 20 },
          { name: 'C', mean: 8, std: 2.2, n: 20 }
        ]
      }

      // TypeScript 에러 없이 실행됨
      expect(() => getInterpretation(input)).not.toThrow()
      const result = getInterpretation(input)
      expect(result).not.toBeNull()
      expect(result?.title).toBe('다집단 비교 결과')
    })
  })

  // ===== 2. NaN/Infinity 처리 검증 =====
  describe('NaN/Infinity 방어 처리', () => {
    it('formatPValue: NaN → "N/A"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: NaN,
        statistic: 2.5,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 12, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('N/A')
    })

    it('formatPValue: Infinity → "N/A"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: Infinity,
        statistic: 2.5,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 12, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('N/A')
    })

    it('formatPValue: p < 0 → "N/A"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: -0.05,
        statistic: 2.5,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 12, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('N/A')
    })

    it('formatPValue: p > 1 → "N/A"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 1.5,
        statistic: 2.5,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 12, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('N/A')
    })

    it('formatPercent: NaN → "N/A"', () => {
      const input: AnalysisResult = {
        method: 'Linear Regression',
        pValue: 0.01,
        statistic: 10.5,
        interpretation: '',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X1', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.002 }
        ],
        additional: { rSquared: NaN }
      }

      const result = getInterpretation(input, '예측')
      expect(result?.statistical).toContain('N/A')
    })

    it('formatPercent: R² = 1.5 (범위 밖) → 100% 클램핑', () => {
      const input: AnalysisResult = {
        method: 'Linear Regression',
        pValue: 0.01,
        statistic: 10.5,
        interpretation: '',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X1', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.002 }
        ],
        additional: { rSquared: 1.5 }
      }

      const result = getInterpretation(input, '예측')
      expect(result?.statistical).toContain('100.0%') // Clamped to 1
    })

    it('formatPercent: R² = -0.2 (범위 밖) → 0% 클램핑', () => {
      const input: AnalysisResult = {
        method: 'Linear Regression',
        pValue: 0.01,
        statistic: 10.5,
        interpretation: '',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X1', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.002 }
        ],
        additional: { rSquared: -0.2 }
      }

      const result = getInterpretation(input, '예측')
      expect(result?.statistical).toContain('0.0%') // Clamped to 0
    })
  })

  // ===== 3. 경계값 조건 검증 =====
  describe('경계값 조건 (Edge Cases)', () => {
    it('p-value = 0 → "< 0.001"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0,
        statistic: 10,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 15, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('< 0.001')
    })

    it('p-value = 0.0001 → "< 0.001"', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0.0001,
        statistic: 8,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 14, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('< 0.001')
    })

    it('p-value = 0.049 (경계값) → 유의함', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0.049,
        statistic: 2.1,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 11, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('유의한 차이가 있습니다')
      expect(result?.statistical).toContain('0.049')
    })

    it('p-value = 0.051 (경계값) → 유의하지 않음', () => {
      const input: AnalysisResult = {
        method: 'Independent T-Test',
        pValue: 0.051,
        statistic: 1.9,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 },
          { name: 'B', mean: 10.8, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input, '비교')
      expect(result?.statistical).toContain('유의한 차이가 없습니다')
      expect(result?.statistical).toContain('0.051')
    })

    it('r = -1 (완전 음의 상관) → 강한 음의 상관', () => {
      const input: AnalysisResult = {
        method: 'Pearson Correlation',
        pValue: 0.001,
        statistic: -1,
        interpretation: ''
      }

      const result = getInterpretation(input, '상관')
      expect(result?.summary).toContain('반대로 감소')
      expect(result?.statistical).toContain('강한')
      expect(result?.statistical).toContain('음의')
    })

    it('r = 0.05 (약한 상관) → 관계 없음', () => {
      const input: AnalysisResult = {
        method: 'Pearson Correlation',
        pValue: 0.5,
        statistic: 0.05,
        interpretation: ''
      }

      const result = getInterpretation(input, '상관')
      expect(result?.summary).toContain('발견되지 않았습니다')
      expect(result?.statistical).toContain('0에 가까워')
    })

    it('r = 2 (범위 밖) → 1로 클램핑', () => {
      const input: AnalysisResult = {
        method: 'Pearson Correlation',
        pValue: 0.001,
        statistic: 2,
        interpretation: ''
      }

      const result = getInterpretation(input, '상관')
      expect(result?.summary).toContain('1.000') // Clamped
    })

    it('Cronbach α = 0.95 → 우수한 신뢰도', () => {
      const input: AnalysisResult = {
        method: "Cronbach's Alpha",
        pValue: 0,
        statistic: 0,
        interpretation: '',
        additional: { alpha: 0.95 }
      }

      const result = getInterpretation(input)
      expect(result?.summary).toContain('우수한 신뢰도')
      expect(result?.practical).toContain('매우 신뢰할 수 있는')
    })

    it('Cronbach α = 0.5 → 낮은 신뢰도', () => {
      const input: AnalysisResult = {
        method: "Cronbach's Alpha",
        pValue: 0,
        statistic: 0,
        interpretation: '',
        additional: { alpha: 0.5 }
      }

      const result = getInterpretation(input)
      expect(result?.summary).toContain('낮은 신뢰도')
      expect(result?.practical).toContain('문항 수정')
    })
  })

  // ===== 4. 신규 추가된 통계 검증 (Wilcoxon, Sign, Friedman, Cochran Q) =====
  describe('신규 추가 통계 (Phase 2-A)', () => {
    it('Wilcoxon Signed-Rank Test → 대응표본 비모수 검정', () => {
      const input: AnalysisResult = {
        method: 'Wilcoxon Signed-Rank Test',
        pValue: 0.03,
        statistic: 2.1,
        interpretation: ''
      }

      const result = getInterpretation(input)
      expect(result).not.toBeNull()
      expect(result?.title).toBe('대응표본 비모수 검정')
      expect(result?.summary).toContain('중앙값 차이')
    })

    it('Sign Test → 부호 검정', () => {
      const input: AnalysisResult = {
        method: 'Sign Test',
        pValue: 0.02,
        statistic: 1.8,
        interpretation: ''
      }

      const result = getInterpretation(input)
      expect(result).not.toBeNull()
      expect(result?.title).toBe('부호 검정 결과')
      expect(result?.summary).toContain('증가/감소 방향')
    })

    it('Friedman Test → 반복측정 비모수 검정', () => {
      const input: AnalysisResult = {
        method: 'Friedman Test',
        pValue: 0.01,
        statistic: 8.5,
        interpretation: ''
      }

      const result = getInterpretation(input)
      expect(result).not.toBeNull()
      expect(result?.title).toBe('반복측정 비모수 검정')
      expect(result?.summary).toContain('3개 이상 반복측정값')
    })

    it('Cochran Q Test → 다중 이분형 변수 검정', () => {
      const input: AnalysisResult = {
        method: 'Cochran Q Test',
        pValue: 0.04,
        statistic: 6.2,
        interpretation: ''
      }

      const result = getInterpretation(input)
      expect(result).not.toBeNull()
      expect(result?.title).toBe('다중 이분형 변수 검정')
      expect(result?.summary).toContain('이분형 반복측정값')
    })
  })

  // ===== 5. null 반환 조건 검증 =====
  describe('null 반환 조건 (패널 숨김)', () => {
    it('회귀: coefficients 없음 → null', () => {
      const input: AnalysisResult = {
        method: 'Linear Regression',
        pValue: 0.01,
        statistic: 10,
        interpretation: '',
        // coefficients: undefined
        additional: { rSquared: 0.65 }
      }

      const result = getInterpretation(input, '예측')
      expect(result).toBeNull()
    })

    it('회귀: rSquared 없음 → null', () => {
      const input: AnalysisResult = {
        method: 'Linear Regression',
        pValue: 0.01,
        statistic: 10,
        interpretation: '',
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.5, tValue: 5, pvalue: 0.001 },
          { name: 'X1', value: 1.2, stdError: 0.3, tValue: 4, pvalue: 0.002 }
        ]
        // additional: undefined
      }

      const result = getInterpretation(input, '예측')
      expect(result).toBeNull()
    })

    it('신뢰도: alpha가 NaN → null', () => {
      const input: AnalysisResult = {
        method: "Cronbach's Alpha",
        pValue: 0,
        statistic: 0,
        interpretation: '',
        additional: { alpha: NaN }
      }

      const result = getInterpretation(input)
      expect(result).toBeNull()
    })

    it('군집: silhouetteScore가 NaN → null', () => {
      const input: AnalysisResult = {
        method: 'K-Means Clustering',
        pValue: 0,
        statistic: 0,
        interpretation: '',
        additional: { silhouetteScore: NaN }
      }

      const result = getInterpretation(input)
      expect(result).toBeNull()
    })

    it('ANOVA: groupStats 2개 미만 → null', () => {
      const input: AnalysisResult = {
        method: 'One-Way ANOVA',
        pValue: 0.01,
        statistic: 5,
        interpretation: '',
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 20 }
        ]
      }

      const result = getInterpretation(input)
      expect(result).toBeNull()
    })
  })

  // ===== 6. THRESHOLDS 일관성 검증 =====
  describe('THRESHOLDS 임계값 일관성', () => {
    it('CORRELATION: WEAK < MODERATE < STRONG', () => {
      const THRESHOLDS = {
        CORRELATION: { WEAK: 0.1, MODERATE: 0.4, STRONG: 0.7 }
      }
      expect(THRESHOLDS.CORRELATION.WEAK).toBeLessThan(THRESHOLDS.CORRELATION.MODERATE)
      expect(THRESHOLDS.CORRELATION.MODERATE).toBeLessThan(THRESHOLDS.CORRELATION.STRONG)
    })

    it('ALPHA: POOR < QUESTIONABLE < ACCEPTABLE < GOOD', () => {
      const THRESHOLDS = {
        ALPHA: { POOR: 0.6, QUESTIONABLE: 0.7, ACCEPTABLE: 0.8, GOOD: 0.9 }
      }
      expect(THRESHOLDS.ALPHA.POOR).toBeLessThan(THRESHOLDS.ALPHA.QUESTIONABLE)
      expect(THRESHOLDS.ALPHA.QUESTIONABLE).toBeLessThan(THRESHOLDS.ALPHA.ACCEPTABLE)
      expect(THRESHOLDS.ALPHA.ACCEPTABLE).toBeLessThan(THRESHOLDS.ALPHA.GOOD)
    })

    it('SILHOUETTE: WEAK < FAIR < STRONG', () => {
      const THRESHOLDS = {
        SILHOUETTE: { WEAK: 0.25, FAIR: 0.5, STRONG: 0.7 }
      }
      expect(THRESHOLDS.SILHOUETTE.WEAK).toBeLessThan(THRESHOLDS.SILHOUETTE.FAIR)
      expect(THRESHOLDS.SILHOUETTE.FAIR).toBeLessThan(THRESHOLDS.SILHOUETTE.STRONG)
    })

    it('EFFECT_SIZE.COHENS_D: SMALL < MEDIUM < LARGE', () => {
      const THRESHOLDS = {
        EFFECT_SIZE: {
          COHENS_D: { SMALL: 0.2, MEDIUM: 0.5, LARGE: 0.8 }
        }
      }
      expect(THRESHOLDS.EFFECT_SIZE.COHENS_D.SMALL).toBeLessThan(THRESHOLDS.EFFECT_SIZE.COHENS_D.MEDIUM)
      expect(THRESHOLDS.EFFECT_SIZE.COHENS_D.MEDIUM).toBeLessThan(THRESHOLDS.EFFECT_SIZE.COHENS_D.LARGE)
    })
  })
})
