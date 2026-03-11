/**
 * Variable Detection Service
 *
 * 데이터 컬럼 + 메서드 ID 기반으로 변수 역할을 추론한다.
 * PurposeInputStep (Step 2) + page.tsx (quickAnalysisMode) 공용.
 *
 * 우선순위:
 * 1. recommendation.variableAssignments (LLM enhanced — 상세 역할별 매핑)
 * 2. recommendation.detectedVariables (기존 기본 감지)
 * 3. 데이터 기반 heuristic 추론 (컬럼 타입별 매핑)
 */

import type { AIRecommendation, ColumnStatistics } from '@/types/smart-flow'
import type { DetectedVariables } from '@/lib/stores/smart-flow-store'
import { logger } from '@/lib/utils/logger'

// ===== Types =====

/** 추출 결과 — store DetectedVariables + 부가 정보 */
export interface DetectedVariablesResult extends DetectedVariables {
  /** LLM이 제안했으나 데이터에 없어서 필터된 변수명 목록 */
  filteredOutVars?: string[]
}

// ===== Constants =====

/** 그룹 비교 메서드 카테고리 (independent → groupVariable 자동 전환 대상) */
const GROUP_COMPARISON_CATEGORIES = new Set(['t-test', 'anova', 'chi-square', 'nonparametric'])

// ===== Main Function =====

/**
 * 메서드 + 검증 결과 + (선택) AI 추천 기반으로 변수 역할 추론
 *
 * @param methodId - 통계 메서드 ID (e.g., 'independent-samples-t-test')
 * @param validationResults - Step 1 데이터 검증 결과 (컬럼 통계)
 * @param recommendation - Step 2 AI 추천 결과 (없으면 heuristic만 사용)
 */
export function extractDetectedVariables(
  methodId: string,
  validationResults: { columns?: ColumnStatistics[] } | null | undefined,
  recommendation?: AIRecommendation | null
): DetectedVariablesResult {
  const numericCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'numeric')
    ?.map((col: ColumnStatistics) => col.name) || []
  const categoricalCols = validationResults?.columns
    ?.filter((col: ColumnStatistics) => col.type === 'categorical')
    ?.map((col: ColumnStatistics) => col.name) || []
  // 모든 컬럼 이름 (mixed 포함)
  const allCols = new Set(
    validationResults?.columns?.map((col: ColumnStatistics) => col.name) || []
  )

  const detectedVars: DetectedVariablesResult = {}

  // ─── 1순위: LLM variableAssignments ───
  const va = recommendation?.variableAssignments
  if (va) {
    const validCol = (name: string): boolean => allCols.has(name)

    // 필터된 변수 추적
    const filteredOut: string[] = []
    const trackFiltered = (arr?: string[]): void => {
      arr?.forEach(name => { if (!validCol(name)) filteredOut.push(name) })
    }
    trackFiltered(va.dependent)
    trackFiltered(va.independent)
    trackFiltered(va.factor)
    trackFiltered(va.covariate)
    trackFiltered(va.within)
    trackFiltered(va.between)
    trackFiltered(va.event)
    trackFiltered(va.time)

    // Event (survival analysis: 1=event, 0=censored)
    if (va.event?.[0] && validCol(va.event[0])) {
      detectedVars.eventVariable = va.event[0]
    }
    // Time (survival analysis: alias for dependent)
    if (va.time?.[0] && validCol(va.time[0])) {
      detectedVars.dependentCandidate = va.time[0]
    }

    // Dependent
    if (va.dependent?.[0] && validCol(va.dependent[0])) {
      detectedVars.dependentCandidate = va.dependent[0]
    }
    // Factor (ANOVA group)
    const validFactors = va.factor?.filter(validCol)
    if (validFactors?.length) {
      if (validFactors.length === 1) {
        detectedVars.groupVariable = validFactors[0]
      } else {
        detectedVars.factors = validFactors
      }
    }
    // Independent (regression, t-test group)
    const validIndep = va.independent?.filter(validCol)
    if (validIndep?.length) {
      detectedVars.independentVars = validIndep
      // 그룹 비교 메서드일 때만 independent → groupVariable 전환
      const methodInfo = recommendation?.method
      const isGroupComparison = methodInfo?.category
        ? GROUP_COMPARISON_CATEGORIES.has(methodInfo.category)
        : false
      if (isGroupComparison && !detectedVars.groupVariable && categoricalCols.includes(validIndep[0])) {
        detectedVars.groupVariable = validIndep[0]
      }
    }
    // Covariate (ANCOVA)
    const validCov = va.covariate?.filter(validCol)
    if (validCov?.length) {
      detectedVars.covariates = validCov
    }
    // Within (paired/repeated measures)
    if (va.within?.length === 2 && validCol(va.within[0]) && validCol(va.within[1])) {
      detectedVars.pairedVars = [va.within[0], va.within[1]]
    }
    // Between (between-subjects factor)
    if (va.between?.length && validCol(va.between[0]) && !detectedVars.groupVariable) {
      detectedVars.groupVariable = va.between[0]
    }

    // 필터된 변수 정보 저장 (UI에서 경고 표시 가능)
    if (filteredOut.length > 0) {
      detectedVars.filteredOutVars = filteredOut
      logger.warn('LLM variable hallucination detected', {
        filteredOut,
        totalSuggested: filteredOut.length + Object.values(detectedVars).filter(Boolean).length,
        methodId
      })
    }

    // 유효한 할당이 1건이라도 있으면 1순위 결과 반환
    const hasAnyValid = detectedVars.dependentCandidate || detectedVars.groupVariable
      || detectedVars.factors?.length || detectedVars.independentVars?.length
      || detectedVars.covariates?.length || detectedVars.pairedVars
      || detectedVars.eventVariable
    if (hasAnyValid) {
      detectedVars.numericVars = numericCols
      return detectedVars
    }
  }

  // ─── 2순위: 기존 detectedVariables (하위 호환) ───
  const legacyGroup = recommendation?.detectedVariables?.groupVariable?.name
  if (legacyGroup && allCols.has(legacyGroup)) {
    detectedVars.groupVariable = legacyGroup
  } else if (categoricalCols.length > 0) {
    detectedVars.groupVariable = categoricalCols[0]
  }

  const legacyDependent = recommendation?.detectedVariables?.dependentVariables?.[0]
  if (legacyDependent && allCols.has(legacyDependent)) {
    detectedVars.dependentCandidate = legacyDependent
  } else if (numericCols.length > 0) {
    detectedVars.dependentCandidate = numericCols[0]
  }

  // ─── 3순위: 메서드별 데이터 기반 추론 ───
  if (methodId === 'kaplan-meier' || methodId === 'cox-regression') {
    const allColumns = validationResults?.columns || []
    const binaryCol = allColumns.find(
      (col: ColumnStatistics) => col.type === 'numeric' && col.uniqueValues === 2
        && col.min === 0 && col.max === 1
    )
    if (binaryCol && !detectedVars.eventVariable) {
      detectedVars.eventVariable = binaryCol.name
    }
    if (!detectedVars.dependentCandidate) {
      const timeCol = numericCols.find(n => n !== binaryCol?.name)
      if (timeCol) detectedVars.dependentCandidate = timeCol
    }
    if (!detectedVars.groupVariable && categoricalCols.length > 0) {
      const nonIdCategorical = categoricalCols.find(name => {
        const col = allColumns.find((c: ColumnStatistics) => c.name === name)
        return !col?.idDetection?.isId
      })
      if (nonIdCategorical) {
        detectedVars.groupVariable = nonIdCategorical
      }
    }
    detectedVars.numericVars = numericCols
  } else if (methodId === 'two-way-anova' || methodId === 'three-way-anova') {
    detectedVars.factors = categoricalCols.slice(0, 2)
  } else if (methodId === 'paired-t-test' || methodId === 'paired-t' || methodId === 'wilcoxon' || methodId === 'wilcoxon-signed-rank') {
    if (numericCols.length >= 2) {
      detectedVars.pairedVars = [numericCols[0], numericCols[1]]
    }
  } else if (methodId === 'pearson-correlation' || methodId === 'spearman-correlation' || methodId === 'correlation') {
    detectedVars.numericVars = numericCols
  } else {
    detectedVars.numericVars = numericCols
  }

  return detectedVars
}
