/**
 * Interpretation Engine Advanced Analytics Tests (Phase 4)
 *
 * 고급 분석 4개 해석 테스트:
 * 1. Dose-Response Analysis (용량-반응 분석)
 * 2. Response Surface Analysis (반응표면 분석)
 * 3. Mixed Model (혼합 모형)
 * 4. Power Analysis (검정력 분석)
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Advanced Analytics (Phase 4)', () => {
  describe('Dose-Response Analysis (용량-반응 분석)', () => {
    it('높은 적합도 (R² > 0.8, EC50 포함)', () => {
      const results: AnalysisResult = {
        method: 'Dose-Response Analysis',
        pValue: 0.001,
        statistic: 25.3,
        additional: {
          model: '4PL Logistic',
          r_squared: 0.92,
          aic: 45.2,
          ec50: 12.5,
          ic50: 15.3,
          hill_slope: 1.2
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('용량-반응 분석 결과')
      expect(interpretation?.summary).toContain('4PL Logistic')
      expect(interpretation?.summary).toContain('R² = 92')
      expect(interpretation?.statistical).toContain('모델이 데이터에 잘 적합합니다')
      expect(interpretation?.statistical).toContain('EC50 = 12.500')
      expect(interpretation?.practical).toContain('EC50/IC50 값을 활용')
    })

    it('중간 적합도 (0.5 < R² < 0.8)', () => {
      const results: AnalysisResult = {
        method: 'Dose-Response',
        pValue: 0.01,
        statistic: 8.2,
        additional: {
          model: 'Weibull',
          r_squared: 0.68,
          ec50: 8.3
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('모델이 데이터에 적절히 적합합니다')
      expect(interpretation?.statistical).toContain('R² = 68')
      expect(interpretation?.practical).toContain('신뢰도는 제한적')
    })

    it('낮은 적합도 (R² < 0.5)', () => {
      const results: AnalysisResult = {
        method: '용량-반응 분석',
        pValue: 0.25,
        statistic: 1.5,
        additional: {
          r_squared: 0.35
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('모델 적합도가 낮습니다')
      expect(interpretation?.practical).toContain('다른 용량-반응 모델')
      expect(interpretation?.practical).toContain('4PL, Weibull, Hill')
    })
  })

  describe('Response Surface Analysis (반응표면 분석)', () => {
    it('매우 높은 적합도 (R² > 0.8)', () => {
      const results: AnalysisResult = {
        method: '반응표면',  // 한글로 변경 (테스트)
        pValue: 0.0001,
        statistic: 35.2,
        additional: {
          rSquared: 0.88,
          adjRSquared: 0.85,
          model_type: 'second_order'
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반응표면 분석 결과')
      expect(interpretation?.summary).toContain('second_order')
      expect(interpretation?.summary).toContain('R² = 88')
      expect(interpretation?.statistical).toContain('모델이 매우 잘 적합합니다')
      expect(interpretation?.statistical).toContain('adj. R² = 85')
      expect(interpretation?.practical).toContain('최적점')
      expect(interpretation?.practical).toContain('saddle point, maximum, minimum')
    })

    it('적절한 적합도 (0.6 < R² < 0.8)', () => {
      const results: AnalysisResult = {
        method: '반응표면',
        pValue: 0.005,
        statistic: 12.5,
        additional: {
          rSquared: 0.72,
          adjustedRSquared: 0.68
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('모델이 적절히 적합합니다')
      expect(interpretation?.practical).toContain('추가 실험점을 수집')
    })

    it('낮은 적합도 (R² < 0.6)', () => {
      const results: AnalysisResult = {
        method: 'RSM',
        pValue: 0.15,
        statistic: 2.8,
        additional: {
          rSquared: 0.45
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('모델 적합도가 낮습니다')
      expect(interpretation?.statistical).toContain('1차 또는 3차 모델')  // statistical에 포함됨
      expect(interpretation?.practical).toContain('교호작용 항이나 2차 항')
      expect(interpretation?.practical).toContain('실험 설계를 조정')
    })
  })

  describe('Mixed Model (혼합 모형)', () => {
    it('유의한 고정효과 다수 (Marginal + Conditional R²)', () => {
      const results: AnalysisResult = {
        method: 'Mixed Model',
        pValue: 0.001,
        statistic: 18.5,
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.3, tValue: 8.3, pvalue: 0.001 },
          { name: 'treatment', value: 1.2, stdError: 0.2, tValue: 6.0, pvalue: 0.001 },
          { name: 'time', value: 0.8, stdError: 0.15, tValue: 5.3, pvalue: 0.002 }
        ],
        additional: {
          marginal_r_squared: 0.42,
          conditional_r_squared: 0.75,
          icc: 0.33
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('혼합 모형 결과')
      expect(interpretation?.summary).toContain('고정효과 2개')  // Intercept 제외
      expect(interpretation?.statistical).toContain('2개 고정효과가 통계적으로 유의합니다')
      expect(interpretation?.statistical).toContain('고정효과 설명력: 42')
      expect(interpretation?.statistical).toContain('전체 모델 설명력: 75')
      expect(interpretation?.practical).toContain('ICC(급내상관계수) = 33')
    })

    it('유의한 고정효과 없음', () => {
      const results: AnalysisResult = {
        method: 'LMM',
        pValue: 0.45,
        statistic: 0.8,
        coefficients: [
          { name: 'Intercept', value: 5.2, stdError: 1.0, tValue: 5.2, pvalue: 0.001 },
          { name: 'factor1', value: 0.3, stdError: 0.5, tValue: 0.6, pvalue: 0.55 }
        ],
        additional: {
          marginal_r_squared: 0.05
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 고정효과가 없습니다')
      expect(interpretation?.practical).toContain('무선효과만으로도 충분한 설명력')
    })

    it('한글 표기 (혼합 모형)', () => {
      const results: AnalysisResult = {
        method: '혼합 모형',
        pValue: 0.01,
        statistic: 7.2,
        coefficients: [
          { name: 'const', value: 3.0, stdError: 0.4, tValue: 7.5, pvalue: 0.001 },
          { name: 'var1', value: 1.5, stdError: 0.3, tValue: 5.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('혼합 모형 결과')
    })
  })

  describe('Power Analysis (검정력 분석)', () => {
    it('A-priori: 적정 표본 크기 (< 100)', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'a-priori',
          sampleSize: 64,
          power: 0.8,
          effectSize: 0.5,
          alpha: 0.05
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('검정력 분석 결과 (A-priori)')
      expect(interpretation?.summary).toContain('검정력 (80%)')
      expect(interpretation?.statistical).toContain('그룹당 최소 64명이 필요합니다')
      expect(interpretation?.practical).toContain('표본 64명을 수집')
      expect(interpretation?.practical).toContain('탈락률 10-20%')
    })

    it('A-priori: 큰 표본 크기 (> 100)', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'a-priori',
          sampleSize: 250,
          power: 0.9,
          effectSize: 0.2,
          alpha: 0.01
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('그룹당 최소 250명이 필요합니다')
      expect(interpretation?.practical).toContain('표본 크기가 큽니다')
      expect(interpretation?.practical).toContain('연구 실행 가능성을 재검토')
    })

    it('Post-hoc: 충분한 검정력 (≥ 0.8)', () => {
      const results: AnalysisResult = {
        method: '검정력 분석',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'post-hoc',
          sampleSize: 80,
          power: 0.85,
          effectSize: 0.5,
          alpha: 0.05
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('검정력 분석 결과 (Post-hoc)')
      expect(interpretation?.statistical).toContain('검정력은 85.0%입니다')
      expect(interpretation?.practical).toContain('검정력이 충분합니다')
      expect(interpretation?.practical).toContain('85.0% ≥ 80%')
    })

    it('Post-hoc: 낮은 검정력 (0.5 ~ 0.8)', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'post-hoc',
          sampleSize: 30,
          power: 0.65,
          effectSize: 0.5
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('검정력은 65.0%입니다')
      expect(interpretation?.practical).toContain('검정력이 낮습니다')
      expect(interpretation?.practical).toContain('65.0% < 80%')
    })

    it('Post-hoc: 매우 낮은 검정력 (< 0.5)', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'post-hoc',
          sampleSize: 15,
          power: 0.35
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('검정력은 35.0%입니다')
      expect(interpretation?.practical).toContain('검정력이 매우 낮습니다')
      expect(interpretation?.practical).toContain('35.0% < 50%')
      expect(interpretation?.practical).toContain('추가 표본 수집이 필수적')
    })

    it('Compromise: 균형 분석', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'compromise',
          sampleSize: 50,
          power: 0.75
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('검정력 분석 결과')
      expect(interpretation?.summary).toContain('균형을 분석')
      expect(interpretation?.statistical).toContain('표본 크기 50명일 때 검정력은 75.0%')
      expect(interpretation?.practical).toContain('검정력 곡선')
    })
  })

  describe('Edge Cases (경계값 테스트)', () => {
    it('Dose-Response: R² = 0.8 (경계값) → 높은 적합도', () => {
      const results: AnalysisResult = {
        method: 'Dose-Response',
        pValue: 0.001,
        statistic: 15.2,
        additional: {
          r_squared: 0.8
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).not.toContain('모델이 데이터에 잘 적합합니다')  // 경계값은 '적절히'로 분류
      expect(interpretation?.statistical).toContain('모델이 데이터에 적절히 적합합니다')
    })

    it('Power Analysis: 검정력 = 0.8 (경계값) → 충분', () => {
      const results: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'post-hoc',
          power: 0.8
        },
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.practical).toContain('검정력이 충분합니다')
      expect(interpretation?.practical).toContain('80.0% ≥ 80%')
    })
  })

  describe('통합 테스트: 4가지 고급 분석 동시 검증', () => {
    it('고급 분석 4개 모두 정상 동작', () => {
      const doseResponse: AnalysisResult = {
        method: 'Dose-Response',
        pValue: 0.001,
        statistic: 25.3,
        additional: {
          r_squared: 0.92,
          ec50: 12.5
        },
        interpretation: ''
      }

      const responseSurface: AnalysisResult = {
        method: '반응표면',  // 한글로 변경 (테스트)
        pValue: 0.0001,
        statistic: 35.2,
        additional: {
          rSquared: 0.88
        },
        interpretation: ''
      }

      const mixedModel: AnalysisResult = {
        method: 'Mixed Model',
        pValue: 0.001,
        statistic: 18.5,
        coefficients: [
          { name: 'Intercept', value: 2.5, stdError: 0.3, tValue: 8.3, pvalue: 0.001 },
          { name: 'treatment', value: 1.2, stdError: 0.2, tValue: 6.0, pvalue: 0.001 }
        ],
        interpretation: ''
      }

      const powerAnalysis: AnalysisResult = {
        method: 'Power Analysis',
        pValue: 0.05,
        statistic: 0,
        additional: {
          analysisType: 'a-priori',
          sampleSize: 64,
          power: 0.8
        },
        interpretation: ''
      }

      const drInterpretation = getInterpretation(doseResponse)
      const rsInterpretation = getInterpretation(responseSurface)
      const mmInterpretation = getInterpretation(mixedModel)
      const paInterpretation = getInterpretation(powerAnalysis)

      // Dose-Response
      expect(drInterpretation?.title).toBe('용량-반응 분석 결과')

      // Response Surface
      expect(rsInterpretation?.title).toBe('반응표면 분석 결과')

      // Mixed Model
      expect(mmInterpretation?.title).toBe('혼합 모형 결과')

      // Power Analysis
      expect(paInterpretation?.title).toBe('검정력 분석 결과 (A-priori)')
    })
  })
})
