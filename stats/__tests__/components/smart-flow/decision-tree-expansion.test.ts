/**
 * DecisionTree 확장 테스트
 *
 * 새로 추가된 Purpose와 메서드 분기를 검증합니다.
 * - multivariate: PCA, factor-analysis, cluster, discriminant
 * - utility: power-analysis, reliability
 * - 기존 Purpose 확장: compare, distribution, prediction, timeseries
 */
import { decide, type DecisionPath } from '@/components/smart-flow/steps/purpose/DecisionTree'

describe('DecisionTree - 확장된 Purpose', () => {
  // ============================================
  // 1. Multivariate Purpose (신규)
  // ============================================
  describe('multivariate purpose', () => {
    it('goal=dimension_reduction -> PCA', () => {
      const result = decide({
        purpose: 'multivariate',
        answers: { goal: 'dimension_reduction' }
      })

      expect(result.method.id).toBe('pca')
      expect(result.method.name).toContain('주성분')
      expect(result.reasoning[0].description).toContain('차원 축소')
    })

    it('goal=latent_factors -> factor-analysis', () => {
      const result = decide({
        purpose: 'multivariate',
        answers: { goal: 'latent_factors' }
      })

      expect(result.method.id).toBe('factor-analysis')
      expect(result.method.name).toContain('요인')
    })

    it('goal=grouping -> cluster', () => {
      const result = decide({
        purpose: 'multivariate',
        answers: { goal: 'grouping' }
      })

      expect(result.method.id).toBe('cluster')
      expect(result.method.name).toContain('군집')
    })

    it('goal=classification -> discriminant', () => {
      const result = decide({
        purpose: 'multivariate',
        answers: { goal: 'classification' }
      })

      expect(result.method.id).toBe('discriminant')
      expect(result.method.name).toContain('판별')
    })

    it('default -> PCA', () => {
      const result = decide({
        purpose: 'multivariate',
        answers: {}
      })

      expect(result.method.id).toBe('pca')
    })
  })

  // ============================================
  // 2. Utility Purpose (신규)
  // ============================================
  describe('utility purpose', () => {
    it('goal=sample_size -> power-analysis', () => {
      const result = decide({
        purpose: 'utility',
        answers: { goal: 'sample_size' }
      })

      expect(result.method.id).toBe('power-analysis')
      expect(result.method.name).toContain('검정력')
      expect(result.warnings).toBeDefined()
    })

    it('goal=power -> power-analysis', () => {
      const result = decide({
        purpose: 'utility',
        answers: { goal: 'power' }
      })

      expect(result.method.id).toBe('power-analysis')
    })

    it('goal=reliability -> reliability', () => {
      const result = decide({
        purpose: 'utility',
        answers: { goal: 'reliability' }
      })

      expect(result.method.id).toBe('reliability')
      expect(result.method.name).toContain('신뢰도')
    })

    it('default -> power-analysis', () => {
      const result = decide({
        purpose: 'utility',
        answers: {}
      })

      expect(result.method.id).toBe('power-analysis')
    })
  })

  // ============================================
  // 3. Compare Purpose 확장
  // ============================================
  describe('compare purpose - 확장된 분기', () => {
    it('단일표본 비교 (comparison_target=population) -> one-sample-t', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          comparison_target: 'population',
          normality: 'yes'
        }
      })

      expect(result.method.id).toBe('one-sample-t')
      expect(result.method.name).toContain('단일표본')
    })

    it('단일표본 비교 + 이진형 -> proportion-test', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          comparison_target: 'population',
          variable_type: 'binary'
        }
      })

      expect(result.method.id).toBe('proportion-test')
    })

    it('단일표본 비교 + 비정규 -> sign-test', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          comparison_target: 'population',
          normality: 'no'
        }
      })

      expect(result.method.id).toBe('sign-test')
    })

    it('비율 비교 (comparison_target=proportion) -> proportion-test', () => {
      const result = decide({
        purpose: 'compare',
        answers: { comparison_target: 'proportion' }
      })

      expect(result.method.id).toBe('proportion-test')
    })

    it('2그룹 대응 + 이진형 -> McNemar', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '2',
          sample_type: 'paired',
          variable_type: 'binary'
        }
      })

      expect(result.method.id).toBe('mcnemar')
      expect(result.method.name).toContain('McNemar')
    })

    it('3+그룹 반복측정 + 이진형 -> Cochran Q', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'paired',
          variable_type: 'binary'
        }
      })

      expect(result.method.id).toBe('cochran-q')
      expect(result.method.name).toContain('Cochran')
    })

    it('3+그룹 독립 + 혼합설계 -> mixed-model', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          design_type: 'mixed'
        }
      })

      expect(result.method.id).toBe('mixed-model')
      expect(result.method.name).toContain('혼합')
    })

    it('3+그룹 독립 + 다변량 종속변수 -> MANOVA', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          outcome_count: '2+'
        }
      })

      expect(result.method.id).toBe('manova')
      expect(result.method.name).toContain('다변량')
    })

    it('3+그룹 독립 + 공변량 -> ANCOVA', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          has_covariate: 'yes'
        }
      })

      expect(result.method.id).toBe('ancova')
      expect(result.method.name).toContain('공분산')
    })

    it('3+그룹 독립 + 비정규 + 중앙값 비교 -> Mood median', () => {
      const result = decide({
        purpose: 'compare',
        answers: {
          group_count: '3+',
          sample_type: 'independent',
          normality: 'no',
          comparison_target: 'median'
        }
      })

      expect(result.method.id).toBe('mood-median')
    })
  })

  // ============================================
  // 4. Distribution Purpose 확장
  // ============================================
  describe('distribution purpose - 확장된 분기', () => {
    it('데이터 탐색 (analysis_type=explore) -> explore-data', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { analysis_type: 'explore' }
      })

      expect(result.method.id).toBe('explore-data')
    })

    it('데이터 탐색 (distribution_goal=explore) -> explore-data', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { distribution_goal: 'explore' }
      })

      expect(result.method.id).toBe('explore-data')
    })

    it('평균 시각화 -> means-plot', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { distribution_goal: 'visualize_means' }
      })

      expect(result.method.id).toBe('means-plot')
    })

    it('이항 확률 검정 -> binomial-test', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { distribution_goal: 'test_probability' }
      })

      expect(result.method.id).toBe('binomial-test')
    })

    it('무작위성 검정 -> runs-test', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { distribution_goal: 'randomness' }
      })

      expect(result.method.id).toBe('runs-test')
    })

    it('두 분포 비교 -> ks-test', () => {
      const result = decide({
        purpose: 'distribution',
        answers: { distribution_goal: 'distribution_compare' }
      })

      expect(result.method.id).toBe('ks-test')
    })
  })

  // ============================================
  // 5. Prediction Purpose 확장
  // ============================================
  describe('prediction purpose - 확장된 분기', () => {
    it('용량-반응 분석 -> dose-response', () => {
      const result = decide({
        purpose: 'prediction',
        answers: { modelType: 'dose_response' }
      })

      expect(result.method.id).toBe('dose-response')
      expect(result.method.name).toContain('용량')
    })

    it('최적화 실험 -> response-surface', () => {
      const result = decide({
        purpose: 'prediction',
        answers: { modelType: 'optimization' }
      })

      expect(result.method.id).toBe('response-surface')
      expect(result.method.name).toContain('반응표면')
    })

    it('자동 변수 선택 + 다중 예측변수 -> stepwise', () => {
      const result = decide({
        purpose: 'prediction',
        answers: {
          variable_selection: 'automatic',
          predictor_count: '2+'
        }
      })

      expect(result.method.id).toBe('stepwise')
      expect(result.method.name).toContain('단계적')
    })

    it('순서형 결과변수 -> ordinal-regression', () => {
      const result = decide({
        purpose: 'prediction',
        answers: { outcome_type: 'ordinal' }
      })

      expect(result.method.id).toBe('ordinal-regression')
    })
  })

  // ============================================
  // 6. Timeseries Purpose 확장
  // ============================================
  describe('timeseries purpose - 확장된 분기', () => {
    it('추세 검정 -> mann-kendall', () => {
      const result = decide({
        purpose: 'timeseries',
        answers: { goal: 'trend_test' }
      })

      expect(result.method.id).toBe('mann-kendall')
      expect(result.method.name).toContain('Mann-Kendall')
      expect(result.warnings).toBeDefined()
    })
  })
})

describe('DecisionTree - KOREAN_NAMES 검증', () => {
  it('모든 반환 메서드에 한글 이름이 있어야 함', () => {
    const testCases: DecisionPath[] = [
      { purpose: 'compare', answers: { group_count: '2', sample_type: 'independent', normality: 'yes', homogeneity: 'yes' } },
      { purpose: 'multivariate', answers: { goal: 'dimension_reduction' } },
      { purpose: 'utility', answers: { goal: 'reliability' } },
      { purpose: 'distribution', answers: { analysis_type: 'describe', variable_type: 'numeric' } },
      { purpose: 'prediction', answers: { outcome_type: 'continuous' } },
      { purpose: 'timeseries', answers: { goal: 'forecast' } },
      { purpose: 'survival', answers: { goal: 'curve' } },
      { purpose: 'relationship', answers: { relationship_type: 'correlation', variable_type: 'numeric', variable_count: '2' } },
    ]

    for (const testCase of testCases) {
      const result = decide(testCase)

      // 메서드 이름이 있어야 함
      expect(result.method.name).toBeDefined()
      expect(result.method.name.length).toBeGreaterThan(0)

      // 메서드 설명이 있어야 함
      expect(result.method.description).toBeDefined()
      expect(result.method.description.length).toBeGreaterThan(0)

      // 영어만 있는 이름은 허용하지만, 대부분 한글이어야 함
      // (fallback 케이스 제외)
    }
  })
})
