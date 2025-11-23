/**
 * Phase 5: Basic Statistics Interpretation Tests
 *
 * Covers:
 * 1. Descriptive Statistics (기술통계)
 * 2. Proportion Test (비율 검정)
 * 3. One-sample t-test (일표본 t검정)
 * 4. Explore Data (탐색적 분석)
 * 5. Means Plot (평균 플롯)
 */

import { getInterpretation } from '@/lib/interpretation/engine'

describe('Phase 5: Basic Statistics Interpretation', () => {
  // ===== 1. Descriptive Statistics =====
  describe('Descriptive Statistics', () => {
    it('should interpret symmetric distribution with low variability', () => {
      const result = getInterpretation({
        method: '기술통계',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 50.0,
          std: 5.0,
          skewness: 0.1,
          kurtosis: -0.2,
          n: 100
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('기술통계량 요약')
      expect(result?.summary).toContain('평균 50.00')
      expect(result?.summary).toContain('표준편차 5.00')
      expect(result?.summary).toContain('변동계수 10.0%')
      expect(result?.statistical).toContain('분포가 대칭적입니다')
      expect(result?.practical).toContain('데이터 변동성이 낮습니다')
    })

    it('should interpret positive skewness with high variability', () => {
      const result = getInterpretation({
        method: 'Descriptive',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 100.0,
          std: 40.0,
          skewness: 1.5,
          kurtosis: 2.0,
          n: 50
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('변동계수 40.0%')
      expect(result?.statistical).toContain('양의 왜도')
      expect(result?.statistical).toContain('양의 첨도')
      expect(result?.practical).toContain('데이터 변동성이 높습니다')
    })

    it('should interpret negative skewness', () => {
      const result = getInterpretation({
        method: 'descriptive statistics',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 75.0,
          std: 12.0,
          skewness: -0.8,
          kurtosis: -0.6,
          n: 80
        }
      })

      expect(result).not.toBeNull()
      expect(result?.statistical).toContain('음의 왜도')
      expect(result?.statistical).toContain('음의 첨도')
    })
  })

  // ===== 2. Proportion Test =====
  describe('Proportion Test', () => {
    it('should interpret significant difference with small practical effect', () => {
      const result = getInterpretation({
        method: '비율 검정',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          sampleProportion: 0.52,
          nullProportion: 0.50,
          pValueExact: 0.03,        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('비율 검정 결과')
      expect(result?.summary).toContain('관찰 비율 52.0%')
      expect(result?.summary).toContain('귀무 비율 50.0%')
      expect(result?.summary).toContain('차이: 2.0%p')
      expect(result?.statistical).toContain('통계적으로 다릅니다')
      expect(result?.practical).toContain('실질적 차이가 매우 작습니다')
    })

    it('should interpret non-significant difference', () => {
      const result = getInterpretation({
        method: 'Proportion Test',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          sampleProportion: 0.48,
          nullProportion: 0.50,
          pValueExact: 0.25,        }
      })

      expect(result).not.toBeNull()
      expect(result?.statistical).toContain('통계적으로 유사합니다')
      expect(result?.practical).toContain('실질적 차이가 매우 작습니다')
    })

    it('should interpret large practical difference', () => {
      const result = getInterpretation({
        method: 'proportion test',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          sampleProportion: 0.65,
          nullProportion: 0.50,
          pValueExact: 0.001,        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('차이: 15.0%p')
      expect(result?.statistical).toContain('통계적으로 다릅니다')
      expect(result?.practical).toContain('실질적 차이가 큽니다')
    })
  })

  // ===== 3. One-sample t-test =====
  describe('One-sample t-test', () => {
    it('should interpret significant difference with large effect size', () => {
      const result = getInterpretation({
        method: '일표본 t검정',
        statistic: 0,
        pValue: 0.01,
        interpretation: '',
        additional: {
          mean: 55.0,
          testValue: 50.0,
          mu: 50.0,
          cohensD: 0.85
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('일표본 t검정 결과')
      expect(result?.summary).toContain('표본 평균 55.00')
      expect(result?.summary).toContain('검정값 50.00')
      expect(result?.summary).toContain('차이: 5.00')
      expect(result?.summary).toContain('효과 크기: 큼')
      expect(result?.statistical).toContain('통계적으로 다릅니다')
    })

    it('should interpret non-significant difference', () => {
      const result = getInterpretation({
        method: 'one sample t-test',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 50.5,
          testValue: 50.0,
          cohensD: 0.1
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('차이: 0.50')
      expect(result?.summary).toContain('효과 크기: 매우 작음')
      expect(result?.statistical).toContain('통계적으로 유사합니다')
    })

    it('should handle missing effect size', () => {
      const result = getInterpretation({
        method: 'One-sample t-test',
        statistic: 0,
        pValue: 0.03,
        interpretation: '',
        additional: {
          mean: 52.0,
          testValue: 50.0,        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('차이: 2.00')
      expect(result?.statistical).toContain('통계적으로 다릅니다')
      expect(result?.practical).toBeDefined()
    })
  })

  // ===== 4. Explore Data =====
  describe('Explore Data', () => {
    it('should interpret symmetric distribution with low variability', () => {
      const result = getInterpretation({
        method: '탐색적 분석',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 100.0,
          median: 99.5,
          std: 10.0,
          skewness: 0.2,
          n: 150
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('탐색적 데이터 분석')
      expect(result?.summary).toContain('평균 100.00')
      expect(result?.summary).toContain('중앙값 99.50')
      expect(result?.summary).toContain('CV 10.0%')
      expect(result?.statistical).toContain('분포가 대칭적입니다')
      expect(result?.practical).toContain('모수적 검정을 고려할 수 있습니다')
    })

    it('should interpret right-skewed distribution with medium variability', () => {
      const result = getInterpretation({
        method: 'Explore Data',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 120.0,
          median: 100.0,
          std: 40.0,
          skewness: 1.2,
          n: 100
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('CV 33.3%')
      expect(result?.statistical).toContain('오른쪽으로 치우쳐 있습니다')
      expect(result?.practical).toContain('검정 방법을 신중히 선택하세요')
    })

    it('should interpret high variability distribution', () => {
      const result = getInterpretation({
        method: 'explore',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 50.0,
          median: 30.0,
          std: 30.0,
          n: 80
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('CV 60.0%')
      expect(result?.statistical).toContain('오른쪽으로 치우쳐 있습니다')
      expect(result?.practical).toContain('비모수적 검정이나 로그 변환을 고려하세요')
    })
  })

  // ===== 5. Means Plot =====
  describe('Means Plot', () => {
    it('should interpret small group differences (descriptives object)', () => {
      const result = getInterpretation({
        method: '평균 플롯',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          descriptives: {
            'Group A': { mean: 50.0, std: 5.0, count: 30, ciLower: 48.0, ciUpper: 52.0 },
            'Group B': { mean: 51.0, std: 5.5, count: 32, ciLower: 49.0, ciUpper: 53.0 },
            'Group C': { mean: 52.0, std: 6.0, count: 28, ciLower: 49.5, ciUpper: 54.5 }
          }
        }
      })
      expect(result?.title).toBe('집단별 평균 비교')
      expect(result?.summary).toContain('3개 집단의 평균 범위')
      expect(result?.summary).toContain('50.00 ~ 52.00')
      expect(result?.summary).toContain('차이: 2.00')
      expect(result?.statistical).toContain('집단 간 평균 차이가 작습니다')
      expect(result?.practical).toContain('오차 막대(95% CI)가 겹치는지 확인하세요')
    })

    it('should interpret medium group differences (plotData array)', () => {
      const result = getInterpretation({
        method: 'Means Plot',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          plotData: [
            { group: 'A', mean: 100.0, ciLower: 95.0, ciUpper: 105.0 },
            { group: 'B', mean: 110.0, ciLower: 105.0, ciUpper: 115.0 },
            { group: 'C', mean: 120.0, ciLower: 115.0, ciUpper: 125.0 }
          ]
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('100.00 ~ 120.00')
      expect(result?.summary).toContain('차이: 20.00')
      expect(result?.statistical).toContain('집단 간 평균 차이가 중간 수준입니다')
    })

    it('should interpret large group differences', () => {
      const result = getInterpretation({
        method: 'means plot',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          descriptives: {
            'Control': { mean: 50.0, std: 5.0, count: 25 },
            'Treatment': { mean: 80.0, std: 8.0, count: 27 }
          }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('2개 집단의 평균 범위')
      expect(result?.summary).toContain('50.00 ~ 80.00')
      expect(result?.summary).toContain('차이: 30.00')
      expect(result?.statistical).toContain('집단 간 평균 차이가 큽니다')
    })
  })

  // ===== Edge Cases =====
  describe('Edge Cases', () => {
    it('should handle Korean method name for Proportion Test', () => {
      const result = getInterpretation({
        method: '비율검정',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          sampleProportion: 0.6,
          nullProportion: 0.5,
          pValueExact: 0.02
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('비율 검정 결과')
    })

    it('should return null for Descriptive with insufficient data', () => {
      const result = getInterpretation({
        method: 'Descriptive',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 50.0
          // missing std, n
        }
      })

      expect(result).toBeNull()
    })

    it('should return null for Means Plot with less than 2 groups', () => {
      const result = getInterpretation({
        method: 'Means Plot',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          descriptives: {
            'Group A': { mean: 50.0 }
          }
        }
      })

      expect(result).toBeNull()
    })

    it('should return null for Means Plot with invalid mean values', () => {
      const result = getInterpretation({
        method: 'means plot',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          descriptives: {
            'Group A': { mean: NaN },
            'Group B': { mean: undefined }
          }
        }
      })

      expect(result).toBeNull()
    })
  })


  // ===== Guard Tests (Issue Fix) =====
  describe('Guard Tests', () => {
    it('Issue 1 (High): Means Plot with negative means should use absolute denominator', () => {
      const result = getInterpretation({
        method: '평균 플롯',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          descriptives: {
            'Group A': { mean: -5.0 },
            'Group B': { mean: -3.0 },
            'Group C': { mean: -1.0 }
          }
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('집단별 평균 비교')
      expect(result?.summary).toContain('-5.00 ~ -1.00')
      expect(result?.summary).toContain('차이: 4.00')
      // diffPercent = (4 / Math.max(Math.abs(-3), 1e-10)) * 100 = 133.3%
      expect(result?.statistical).toContain('집단 간 평균 차이가 큽니다')
    })

    it('Issue 1 (High): Means Plot with near-zero means should use EPS guard', () => {
      const result = getInterpretation({
        method: 'Means Plot',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          plotData: [
            { mean: 0.0001 },
            { mean: 0.0002 },
            { mean: 0.0003 }
          ]
        }
      })

      expect(result).not.toBeNull()
      // range = 0.0002, avgMean = 0.0002
      // safeDenominator = Math.max(0.0002, 1e-10) = 0.0002
      // diffPercent = (0.0002 / 0.0002) * 100 = 100%
      expect(result?.statistical).toContain('집단 간 평균 차이가 큽니다')
    })

    it('Issue 2 (Medium): Descriptive with zero mean should use std-based interpretation', () => {
      const result = getInterpretation({
        method: 'Descriptive',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 0.0,
          std: 3.5,
          skewness: 0.1,
          kurtosis: -0.2,
          n: 100
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('기술통계량 요약')
      expect(result?.summary).toContain('평균 0.00')
      expect(result?.summary).toContain('표준편차 3.50')
      expect(result?.statistical).toContain('평균이 0에 가까워')
      expect(result?.practical).toContain('표준편차가')
    })

    it('Issue 2 (Medium): Explore with near-zero mean should use std-based interpretation', () => {
      const result = getInterpretation({
        method: 'Explore',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 0.0,
          median: 0.0,
          std: 10.0,
          n: 80
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('탐색적 데이터 분석')
      expect(result?.statistical).toContain('평균이 0에 가까워')
      expect(result?.practical).toContain('표준편차가')
    })

    it('Issue 3 (Low): One-sample t-test with EffectSizeInfo object should show interpretation', () => {
      const result = getInterpretation({
        method: 'One-sample t-test',
        statistic: 0,
        pValue: 0.01,
        interpretation: '',
        additional: {
          mean: 55.0,
          testValue: 50.0,
          cohensD: {
            value: 0.85,
            type: "Cohen's d",
            interpretation: '큼'
          } as any // EffectSizeInfo 객체
        }
      })

      expect(result).not.toBeNull()
      expect(result?.summary).toContain('효과 크기')
      expect(result?.summary).toContain('큰 효과')
    })
  })

  // ===== Integration Test =====
  describe('Integration with existing methods', () => {
    it('should prioritize Proportion Test over One-sample t-test', () => {
      const result = getInterpretation({
        method: 'One-sample Proportion Test',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          sampleProportion: 0.6,
          nullProportion: 0.5,
          pValueExact: 0.02
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('비율 검정 결과')
    })

    it('should not match Descriptive as One-sample t-test', () => {
      const result = getInterpretation({
        method: 'Descriptive Statistics',
        statistic: 0,
        pValue: 0.05,
        interpretation: '',
        additional: {
          mean: 50.0,
          testValue: 45.0,
          std: 10.0,
          n: 100
        }
      })

      expect(result).not.toBeNull()
      expect(result?.title).toBe('기술통계량 요약')
    })
  })
})