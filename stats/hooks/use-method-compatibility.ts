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
import type {
  AssumptionResults,
  CompatibilityResult,
} from '@/lib/statistics/data-method-compatibility'
import { summarizeNormality } from '@/lib/utils/stats-math'
import type { NormalityHint } from '@/lib/utils/stats-math'
import type { ColumnStatistics } from '@/types/analysis'

/** columnStats의 컬럼별 정규성 검정 결과에서 탐색적 AssumptionResults 추출 */
export function deriveNormalityFromColumns(
  columnStats: ColumnStatistics[] | undefined,
): AssumptionResults | null {
  if (!columnStats?.length) return null

  const hint = summarizeNormality(columnStats)
  // 정규성 검정이 아직 완료되지 않았으면 (enrichWithNormality 비동기) null
  if (!hint.available) return null

  return {
    normality: hint.mostlyNormal,
    homogeneity: 'unknown',
    independence: 'unknown',
  }
}

/** 정규성 요약 통계 (UI 배너용) — summarizeNormality 위임 */
export function getNormalitySummary(
  columnStats: ColumnStatistics[] | undefined,
): NormalityHint | null {
  if (!columnStats?.length) return null
  const hint = summarizeNormality(columnStats)
  return hint.available ? hint : null
}

/**
 * validationResults + assumptionResults → 메서드별 호환성 Map 파생.
 *
 * validationResults가 없으면 null 반환.
 * assumptionResults가 있으면 구조적 호환성에 가정검정 결과를 병합.
 *
 * Step 1의 컬럼별 정규성은 배너 힌트(getNormalitySummary)로만 사용.
 * 변수 선택 전이라 어떤 변수가 종속변수인지 모르므로,
 * 메서드별 호환성 판정에는 넣지 않는다.
 */
export function useMethodCompatibility(): Map<string, CompatibilityResult> | null {
  const validationResults = useAnalysisStore(state => state.validationResults)
  const assumptionResults = useAnalysisStore(state => state.assumptionResults)

  return useMemo(() => {
    if (!validationResults) return null

    const dataSummary = extractDataSummary(validationResults)
    const structuralMap = getStructuralCompatibilityMap(dataSummary)

    // Step 3 이후 확정된 가정검정 결과만 호환성 엔진에 반영
    if (assumptionResults) {
      const assumptions = extractAssumptionResults(assumptionResults)
      return mergeAssumptionResults(structuralMap, assumptions, dataSummary)
    }

    return structuralMap
  }, [validationResults, assumptionResults])
}
