/**
 * useAnalysisGuide hook 테스트
 *
 * 모든 통계 페이지에서 사용되는 분석 가이드 훅의 동작을 검증합니다.
 */

import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useAnalysisGuide, INTEGRATED_PAGE_METHOD_MAPS } from '@/hooks/use-analysis-guide'
import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'

describe('useAnalysisGuide', () => {
  describe('정적 methodId 사용', () => {
    it('binomial-test 메타데이터를 올바르게 반환해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'binomial-test'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata).not.toBeNull()
      expect(result.current.methodMetadata?.id).toBe('binomial-test')
      expect(result.current.methodMetadata?.name).toBe('이항 검정')
    })

    it('t-test 메타데이터를 올바르게 반환해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'two-sample-t'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.id).toBe('two-sample-t')
    })

    it('존재하지 않는 methodId는 null을 반환해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'non-existent-method'
      }))

      expect(result.current.hasMethod).toBe(false)
      expect(result.current.methodMetadata).toBeNull()
      expect(result.current.assumptionItems).toHaveLength(0)
    })
  })

  describe('동적 getMethodId 사용', () => {
    it('getMethodId가 null을 반환하면 메타데이터도 null이어야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        getMethodId: () => null
      }))

      expect(result.current.hasMethod).toBe(false)
      expect(result.current.methodMetadata).toBeNull()
    })

    it('getMethodId가 유효한 ID를 반환하면 메타데이터가 있어야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        getMethodId: () => 'paired-t'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.id).toBe('paired-t')
    })
  })

  describe('assumptionItems 생성', () => {
    it('가정이 있는 메서드는 assumptionItems를 생성해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'two-sample-t'
      }))

      // two-sample-t는 정규성, 등분산성, 독립성 가정이 있음
      expect(result.current.assumptionItems.length).toBeGreaterThan(0)

      // 각 아이템에 필수 속성이 있어야 함
      result.current.assumptionItems.forEach(item => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('name')
      })
    })

    it('가정이 없는 메서드는 빈 assumptionItems를 반환해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'normality-test'
      }))

      // normality-test는 assumptions: [] 이므로 빈 배열
      expect(result.current.assumptionItems).toHaveLength(0)
    })
  })

  describe('새로 추가된 메서드 메타데이터 검증', () => {
    it('normality-test 메타데이터가 존재해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'normality-test'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.name).toBe('정규성 검정')
      expect(result.current.methodMetadata?.category).toBe('descriptive')
      expect(result.current.methodMetadata?.minSampleSize).toBe(3)
      expect(result.current.methodMetadata?.variables).toHaveLength(1)
      expect(result.current.methodMetadata?.notes).toContain('Shapiro-Wilk: n < 5000에서 가장 강력')
    })

    it('dose-response 메타데이터가 존재해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'dose-response'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.name).toBe('용량-반응 분석')
      expect(result.current.methodMetadata?.category).toBe('regression')
      expect(result.current.methodMetadata?.variables).toHaveLength(2)
      expect(result.current.methodMetadata?.notes).toContain('EC50: 50% 효과 농도')
    })

    it('power-analysis 메타데이터가 존재해야 함', () => {
      const { result } = renderHook(() => useAnalysisGuide({
        methodId: 'power-analysis'
      }))

      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.name).toBe('사전 검정력 분석')
      expect(result.current.methodMetadata?.category).toBe('design')
      expect(result.current.methodMetadata?.minSampleSize).toBe(2)
      expect(result.current.methodMetadata?.variables).toHaveLength(0)  // 파라미터 기반
    })
  })

  describe('INTEGRATED_PAGE_METHOD_MAPS 검증', () => {
    it('t-test 페이지 매핑이 올바르게 되어 있어야 함', () => {
      expect(INTEGRATED_PAGE_METHOD_MAPS.tTest['one-sample']).toBe('one-sample-t')
      expect(INTEGRATED_PAGE_METHOD_MAPS.tTest['two-sample']).toBe('two-sample-t')
      expect(INTEGRATED_PAGE_METHOD_MAPS.tTest['paired']).toBe('paired-t')
    })

    it('regression 페이지 매핑이 올바르게 되어 있어야 함', () => {
      expect(INTEGRATED_PAGE_METHOD_MAPS.regression['simple']).toBe('simple-regression')
      expect(INTEGRATED_PAGE_METHOD_MAPS.regression['multiple']).toBe('multiple-regression')
      expect(INTEGRATED_PAGE_METHOD_MAPS.regression['logistic']).toBe('logistic-regression')
    })

    it('anova 페이지 매핑이 올바르게 되어 있어야 함', () => {
      expect(INTEGRATED_PAGE_METHOD_MAPS.anova['one-way']).toBe('one-way-anova')
      expect(INTEGRATED_PAGE_METHOD_MAPS.anova['two-way']).toBe('two-way-anova')
    })

    it('correlation 페이지 매핑이 올바르게 되어 있어야 함', () => {
      expect(INTEGRATED_PAGE_METHOD_MAPS.correlation['pearson']).toBe('pearson-correlation')
      expect(INTEGRATED_PAGE_METHOD_MAPS.correlation['spearman']).toBe('spearman-correlation')
    })
  })

  describe('모든 통계 메서드 메타데이터 무결성 검증', () => {
    it('모든 메서드에 필수 필드가 있어야 함', () => {
      STATISTICAL_METHOD_REQUIREMENTS.forEach(method => {
        // 필수 필드 검증
        expect(method).toHaveProperty('id')
        expect(method).toHaveProperty('name')
        expect(method).toHaveProperty('category')
        expect(method).toHaveProperty('description')
        expect(method).toHaveProperty('minSampleSize')
        expect(method).toHaveProperty('assumptions')
        expect(method).toHaveProperty('variables')

        // 배열 필드 검증
        expect(Array.isArray(method.assumptions)).toBe(true)
        expect(Array.isArray(method.variables)).toBe(true)

        // notes는 선택적 필드 (있으면 배열)
        if (method.notes) {
          expect(Array.isArray(method.notes)).toBe(true)
        }
      })
    })

    it('최소 40개 이상의 메서드가 정의되어 있어야 함', () => {
      expect(STATISTICAL_METHOD_REQUIREMENTS.length).toBeGreaterThanOrEqual(40)
    })
  })

  describe('통합 페이지 시뮬레이션', () => {
    it('t-test 통합 페이지 - 분석 유형 선택에 따른 메타데이터 변경', () => {
      // 초기 상태: 선택 안 함
      const { result, rerender } = renderHook(
        ({ testType }) => useAnalysisGuide({
          getMethodId: () => testType ? INTEGRATED_PAGE_METHOD_MAPS.tTest[testType as keyof typeof INTEGRATED_PAGE_METHOD_MAPS.tTest] : null
        }),
        { initialProps: { testType: '' as string } }
      )

      expect(result.current.hasMethod).toBe(false)
      expect(result.current.methodMetadata).toBeNull()

      // one-sample 선택
      rerender({ testType: 'one-sample' })
      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.id).toBe('one-sample-t')

      // two-sample 선택
      rerender({ testType: 'two-sample' })
      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.id).toBe('two-sample-t')

      // paired 선택
      rerender({ testType: 'paired' })
      expect(result.current.hasMethod).toBe(true)
      expect(result.current.methodMetadata?.id).toBe('paired-t')
    })

    it('regression 통합 페이지 - 분석 유형 선택에 따른 메타데이터 변경', () => {
      const { result, rerender } = renderHook(
        ({ regressionType }) => useAnalysisGuide({
          getMethodId: () => regressionType ? INTEGRATED_PAGE_METHOD_MAPS.regression[regressionType as keyof typeof INTEGRATED_PAGE_METHOD_MAPS.regression] : null
        }),
        { initialProps: { regressionType: '' as string } }
      )

      expect(result.current.hasMethod).toBe(false)

      rerender({ regressionType: 'simple' })
      expect(result.current.methodMetadata?.id).toBe('simple-regression')

      rerender({ regressionType: 'multiple' })
      expect(result.current.methodMetadata?.id).toBe('multiple-regression')

      rerender({ regressionType: 'logistic' })
      expect(result.current.methodMetadata?.id).toBe('logistic-regression')
    })
  })
  describe('1차 배치 스키마 확장 검증', () => {
    const extendedMethods = [
      'one-sample-t',
      'paired-t',
      'one-way-anova',
      'simple-regression',
      'chi-square-independence',
      'mann-whitney'
    ]

    it.each(extendedMethods)('%s 메서드에 dataFormat이 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method).toBeDefined()
      expect(method?.dataFormat).toBeDefined()
      expect(method?.dataFormat?.type).toMatch(/^(wide|long|both)$/)
      expect(method?.dataFormat?.columns?.length).toBeGreaterThan(0)
    })

    it.each(extendedMethods)('%s 메서드에 settings가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method).toBeDefined()
      expect(method?.settings).toBeDefined()
      // alpha 설정은 모든 통계 메서드에 공통
      expect(method?.settings?.alpha).toBeDefined()
    })

    it.each(extendedMethods)('%s 메서드에 sampleData가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method).toBeDefined()
      expect(method?.sampleData).toBeDefined()
      expect(method?.sampleData?.headers?.length).toBeGreaterThan(0)
      expect(method?.sampleData?.rows?.length).toBeGreaterThan(0)
    })

    it('one-sample-t에 testValue 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'one-sample-t')
      expect(method?.settings?.testValue).toBeDefined()
      expect(method?.settings?.testValue?.default).toBe(0)
    })

    it('one-way-anova에 postHoc 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'one-way-anova')
      expect(method?.settings?.postHoc).toBeDefined()
      expect(method?.settings?.postHoc?.options?.length).toBeGreaterThan(0)
    })

    it('chi-square-independence에 yatesCorrection 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'chi-square-independence')
      expect(method?.settings?.yatesCorrection).toBeDefined()
    })

    it('mann-whitney에 exactTest 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'mann-whitney')
      expect(method?.settings?.exactTest).toBeDefined()
    })
  })

  describe('2차 배치 메타데이터 확장 검증', () => {
    const batch2Methods = [
      'welch-t',
      'wilcoxon-signed-rank',
      'kruskal-wallis',
      'multiple-regression',
      'two-way-anova',
      'pearson-correlation'
    ]

    it.each(batch2Methods)('%s 메서드에 dataFormat이 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method).toBeDefined()
      expect(method?.dataFormat).toBeDefined()
      expect(method?.dataFormat?.type).toMatch(/^(wide|long|both)$/)
    })

    it.each(batch2Methods)('%s 메서드에 settings가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.settings).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
    })

    it.each(batch2Methods)('%s 메서드에 sampleData가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.sampleData).toBeDefined()
      expect(method?.sampleData?.rows?.length).toBeGreaterThan(0)
    })

    it('kruskal-wallis에 postHoc과 pAdjust 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'kruskal-wallis')
      expect(method?.settings?.postHoc).toBeDefined()
      expect(method?.settings?.pAdjust).toBeDefined()
    })

    it('multiple-regression에 vifThreshold 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'multiple-regression')
      expect(method?.settings?.vifThreshold).toBeDefined()
    })

    it('two-way-anova에 ssType 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'two-way-anova')
      expect(method?.settings?.ssType).toBeDefined()
    })

    it('pearson-correlation에 pairwise 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'pearson-correlation')
      expect(method?.settings?.pairwise).toBeDefined()
    })
  })

  describe('3차 배치 메타데이터 확장 검증', () => {
    const batch3Methods = [
      'spearman-correlation',
      'kendall-correlation',
      'partial-correlation',
      'three-way-anova',
      'friedman',
      'sign-test'
    ]

    it.each(batch3Methods)('%s 메서드에 dataFormat이 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
    })

    it.each(batch3Methods)('%s 메서드에 settings와 sampleData가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData?.rows?.length).toBeGreaterThan(0)
    })

    it('상관분석 4개 모두 완료 확인', () => {
      const correlationMethods = ['pearson-correlation', 'spearman-correlation', 'kendall-correlation', 'partial-correlation']
      correlationMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
        expect(method?.settings).toBeDefined()
        expect(method?.sampleData).toBeDefined()
      })
    })
  })

  describe('4차 배치 메타데이터 확장 검증', () => {
    const batch4Methods = [
      'runs-test',
      'kolmogorov-smirnov',
      'mcnemar',
      'chi-square-goodness',
      'fisher-exact',
      'normality-test'
    ]

    it.each(batch4Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('카이제곱 검정 3개 모두 완료 확인', () => {
      const chiMethods = ['chi-square-independence', 'chi-square-goodness', 'fisher-exact']
      chiMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('진단검정(normality-test)에 testMethod 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'normality-test')
      expect(method?.settings?.testMethod).toBeDefined()
    })
  })

  describe('5차 배치 메타데이터 확장 검증', () => {
    const batch5Methods = [
      'factor-analysis',
      'pca',
      'kaplan-meier',
      'cox-regression',
      'arima',
      'seasonal-decompose'
    ]

    it.each(batch5Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('고급분석 2개 완료 확인 (factor-analysis, pca)', () => {
      const advancedMethods = ['factor-analysis', 'pca']
      advancedMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('생존분석 2개 완료 확인 (kaplan-meier, cox-regression)', () => {
      const survivalMethods = ['kaplan-meier', 'cox-regression']
      survivalMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
        expect(method?.settings).toBeDefined()
      })
    })

    it('시계열 2개 완료 확인 (arima, seasonal-decompose)', () => {
      const timeseriesMethods = ['arima', 'seasonal-decompose']
      timeseriesMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('factor-analysis에 rotation 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'factor-analysis')
      expect(method?.settings?.rotation).toBeDefined()
    })

    it('kaplan-meier에 confidenceLevel 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'kaplan-meier')
      expect(method?.settings?.confidenceLevel).toBeDefined()
    })
  })

  describe('6차 배치 메타데이터 확장 검증', () => {
    const batch6Methods = [
      'stepwise-regression',
      'logistic-regression',
      'ordinal-regression',
      'poisson-regression',
      'cochran-q',
      'mood-median'
    ]

    it.each(batch6Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('회귀분석 4개 완료 확인', () => {
      const regressionMethods = ['stepwise-regression', 'logistic-regression', 'ordinal-regression', 'poisson-regression']
      regressionMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('비모수 2개 완료 확인 (cochran-q, mood-median)', () => {
      const nonparamMethods = ['cochran-q', 'mood-median']
      nonparamMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('stepwise-regression에 method와 criterion 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'stepwise-regression')
      expect(method?.settings?.method).toBeDefined()
      expect(method?.settings?.criterion).toBeDefined()
    })

    it('logistic-regression에 regularization 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'logistic-regression')
      expect(method?.settings?.regularization).toBeDefined()
    })

    it('poisson-regression에 model 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'poisson-regression')
      expect(method?.settings?.model).toBeDefined()
    })
  })

  describe('7차 배치 메타데이터 확장 검증', () => {
    const batch7Methods = [
      'ancova',
      'repeated-measures-anova',
      'manova',
      'mixed-model',
      'response-surface',
      'stationarity-test'
    ]

    it.each(batch7Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('GLM 5개 완료 확인 (ancova, rm-anova, manova, mixed-model, response-surface)', () => {
      const glmMethods = ['ancova', 'repeated-measures-anova', 'manova', 'mixed-model', 'response-surface']
      glmMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('시계열 3개 모두 완료 확인', () => {
      const timeseriesMethods = ['arima', 'seasonal-decompose', 'stationarity-test']
      timeseriesMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('ancova에 ssType 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'ancova')
      expect(method?.settings?.ssType).toBeDefined()
    })

    it('manova에 testStatistic 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'manova')
      expect(method?.settings?.testStatistic).toBeDefined()
    })

    it('mixed-model은 long format이어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'mixed-model')
      expect(method?.dataFormat?.type).toBe('long')
    })
  })

  describe('8차 배치 메타데이터 확장 검증', () => {
    const batch8Methods = [
      'descriptive-stats',
      'frequency-table',
      'reliability-analysis',
      'mann-kendall-test',
      'cluster-analysis',
      'discriminant-analysis'
    ]

    it.each(batch8Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings?.alpha).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('기술통계 3개 완료 확인', () => {
      const descMethods = ['descriptive-stats', 'frequency-table', 'reliability-analysis']
      descMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('고급분석 4개 모두 완료 확인', () => {
      const advancedMethods = ['factor-analysis', 'pca', 'cluster-analysis', 'discriminant-analysis']
      advancedMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('cluster-analysis에 method와 nClusters 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'cluster-analysis')
      expect(method?.settings?.method).toBeDefined()
      expect(method?.settings?.nClusters).toBeDefined()
    })

    it('discriminant-analysis에 validation 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'discriminant-analysis')
      expect(method?.settings?.validation).toBeDefined()
    })

    it('mann-kendall-test에 senSlope 설정이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'mann-kendall-test')
      expect(method?.settings?.senSlope).toBeDefined()
    })
  })

  describe('9차 배치 (최종) 메타데이터 확장 검증', () => {
    const batch9Methods = [
      'cross-tabulation',
      'explore-data',
      'one-sample-proportion',
      'means-plot',
      'dose-response',
      'power-analysis'
    ]

    it.each(batch9Methods)('%s 메서드에 확장 필드가 정의되어 있어야 함', (methodId) => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
      expect(method?.dataFormat).toBeDefined()
      expect(method?.settings).toBeDefined()
      expect(method?.sampleData).toBeDefined()
    })

    it('기술통계 5개 모두 완료 확인', () => {
      const descMethods = ['descriptive-stats', 'frequency-table', 'cross-tabulation', 'explore-data', 'reliability-analysis']
      descMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('평균비교 6개 모두 완료 확인', () => {
      const compareMethods = ['one-sample-t', 'two-sample-t', 'paired-t', 'welch-t', 'one-sample-proportion', 'means-plot']
      compareMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('유틸리티 2개 완료 확인', () => {
      const utilMethods = ['dose-response', 'power-analysis']
      utilMethods.forEach(id => {
        const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
        expect(method?.dataFormat).toBeDefined()
      })
    })

    it('power-analysis는 데이터 열이 있어야 함', () => {
      const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === 'power-analysis')
      expect(method?.dataFormat?.columns?.length).toBe(2)
    })

    it('모든 메서드에 dataFormat이 정의되어 있어야 함', () => {
      const methodsWithDataFormat = STATISTICAL_METHOD_REQUIREMENTS.filter(m => m.dataFormat !== undefined)
      expect(methodsWithDataFormat.length).toBe(STATISTICAL_METHOD_REQUIREMENTS.length)
    })
  })

})
