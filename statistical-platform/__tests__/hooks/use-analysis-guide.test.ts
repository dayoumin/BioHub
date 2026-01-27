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
      expect(result.current.methodMetadata?.category).toBe('diagnostic')
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
      expect(result.current.methodMetadata?.name).toBe('검정력 분석')
      expect(result.current.methodMetadata?.category).toBe('utility')
      expect(result.current.methodMetadata?.minSampleSize).toBe(0)  // 데이터 없이도 가능
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
})
