'use client'

/**
 * 메서드 호환성 파생 훅
 *
 * validationResults + assumptionResults에서 자동 파생.
 * 이전: analysis-store에 dataSummary + methodCompatibility로 저장 (TD-10-D 제거)
 * 이후: 이 훅이 useMemo로 파생 계산 → 단일 진실 소스.
 *
 * 장점:
 * - validationResults 변경 시 자동 재계산 (patchColumnNormality 포함)
 * - 3개 setter 제거 (setDataSummary, setMethodCompatibility, updateCompatibility)
 * - persist 대상에서 제외 → rehydration 로직 불필요
 */

import { useMemo } from 'react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import {
  extractDataSummary,
  getStructuralCompatibilityMap,
  mergeAssumptionResults,
  extractAssumptionResults,
} from '@/lib/statistics/data-method-compatibility'
import type { CompatibilityResult } from '@/lib/statistics/data-method-compatibility'

/**
 * validationResults + assumptionResults → 메서드별 호환성 Map 파생.
 *
 * validationResults가 없으면 null 반환.
 * assumptionResults가 있으면 구조적 호환성에 가정검정 결과를 병합.
 */
export function useMethodCompatibility(): Map<string, CompatibilityResult> | null {
  const validationResults = useAnalysisStore(state => state.validationResults)
  const assumptionResults = useAnalysisStore(state => state.assumptionResults)

  return useMemo(() => {
    if (!validationResults) return null

    const dataSummary = extractDataSummary(validationResults)
    const structuralMap = getStructuralCompatibilityMap(dataSummary)

    if (assumptionResults) {
      const assumptions = extractAssumptionResults(assumptionResults)
      return mergeAssumptionResults(structuralMap, assumptions, dataSummary)
    }

    return structuralMap
  }, [validationResults, assumptionResults])
}
