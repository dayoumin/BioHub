/**
 * Auto-Answer 유틸리티
 * 데이터 분석 결과를 기반으로 질문에 자동 응답
 */

import type {
  AutoAnswerResult,
  ValidationResults,
  StatisticalAssumptions,
  ColumnStatistics
} from '@/types/smart-flow'

interface AutoAnswerContext {
  validationResults?: ValidationResults | null
  assumptionResults?: StatisticalAssumptions | null
  selectedVariables?: {
    dependent?: string
    independent?: string[]
    group?: string
  }
}

/**
 * 정규성 질문 자동 응답
 */
function getAutoAnswerNormality(context: AutoAnswerContext): AutoAnswerResult {
  const { assumptionResults, validationResults } = context

  // 샘플 크기가 30 이상이면 CLT에 의해 정규성 가정 가능
  const sampleSize = validationResults?.totalRows ?? 0
  if (sampleSize >= 30 && !assumptionResults?.normality) {
    return {
      value: 'yes',
      confidence: 'medium',
      source: 'heuristic',
      evidence: `n=${sampleSize} ≥ 30 (중심극한정리에 의해 정규성 가정 가능)`,
      requiresConfirmation: false
    }
  }

  // 가정 검정 결과가 없으면 unknown
  if (!assumptionResults?.normality) {
    return {
      value: 'check',
      confidence: 'unknown',
      source: 'none',
      evidence: '정규성 검정 결과가 없습니다',
      requiresConfirmation: true
    }
  }

  const normality = assumptionResults.normality

  // Shapiro-Wilk 결과 확인
  if (normality.shapiroWilk) {
    const { pValue, isNormal } = normality.shapiroWilk
    const pValueStr = pValue !== undefined ? pValue.toFixed(3) : 'N/A'

    if (isNormal) {
      return {
        value: 'yes',
        confidence: pValue !== undefined && pValue > 0.1 ? 'high' : 'medium',
        source: 'assumptionResults',
        evidence: `Shapiro-Wilk p=${pValueStr} > 0.05 (정규분포 충족)`,
        requiresConfirmation: false
      }
    } else {
      return {
        value: 'no',
        confidence: 'high',
        source: 'assumptionResults',
        evidence: `Shapiro-Wilk p=${pValueStr} ≤ 0.05 (정규분포 미충족)`,
        requiresConfirmation: false
      }
    }
  }

  // 그룹별 정규성 결과 확인
  if (normality.group1 || normality.group2) {
    const group1Normal = normality.group1?.isNormal ?? true
    const group2Normal = normality.group2?.isNormal ?? true

    if (group1Normal && group2Normal) {
      return {
        value: 'yes',
        confidence: 'medium',
        source: 'assumptionResults',
        evidence: '모든 그룹이 정규분포를 따릅니다',
        requiresConfirmation: false
      }
    } else {
      return {
        value: 'no',
        confidence: 'medium',
        source: 'assumptionResults',
        evidence: '일부 그룹이 정규분포를 따르지 않습니다',
        requiresConfirmation: true
      }
    }
  }

  return {
    value: 'check',
    confidence: 'unknown',
    source: 'none',
    evidence: '정규성을 확인할 수 없습니다',
    requiresConfirmation: true
  }
}

/**
 * 변수 유형 질문 자동 응답
 */
function getAutoAnswerVariableType(context: AutoAnswerContext): AutoAnswerResult {
  const { validationResults, selectedVariables } = context

  if (!validationResults?.columnStats && !validationResults?.columns) {
    return {
      value: 'numeric',
      confidence: 'unknown',
      source: 'none',
      evidence: '변수 정보가 없습니다',
      requiresConfirmation: true
    }
  }

  const columns = validationResults.columnStats || validationResults.columns || []

  // 선택된 변수들만 확인
  let targetColumns: ColumnStatistics[] = columns

  if (selectedVariables?.dependent || selectedVariables?.independent?.length) {
    const selectedNames = [
      selectedVariables.dependent,
      ...(selectedVariables.independent || [])
    ].filter(Boolean) as string[]

    if (selectedNames.length > 0) {
      targetColumns = columns.filter(col => selectedNames.includes(col.name))
    }
  }

  if (targetColumns.length === 0) {
    targetColumns = columns
  }

  // 모든 선택된 변수가 수치형인지 확인
  const allNumeric = targetColumns.every(col => col.type === 'numeric')
  const hasCategorical = targetColumns.some(col => col.type === 'categorical')

  if (allNumeric) {
    return {
      value: 'numeric',
      confidence: 'high',
      source: 'validationResults',
      evidence: `분석 변수가 모두 수치형입니다 (${targetColumns.length}개)`,
      requiresConfirmation: false
    }
  } else if (hasCategorical) {
    return {
      value: 'mixed',
      confidence: 'high',
      source: 'validationResults',
      evidence: '범주형 변수가 포함되어 있습니다',
      requiresConfirmation: false
    }
  }

  return {
    value: 'numeric',
    confidence: 'low',
    source: 'heuristic',
    evidence: '변수 유형을 확인해주세요',
    requiresConfirmation: true
  }
}

/**
 * 결과 변수 유형 자동 응답 (예측 모델링용)
 */
function getAutoAnswerOutcomeType(context: AutoAnswerContext): AutoAnswerResult {
  const { validationResults, selectedVariables } = context

  if (!selectedVariables?.dependent) {
    return {
      value: 'continuous',
      confidence: 'unknown',
      source: 'none',
      evidence: '종속 변수가 선택되지 않았습니다',
      requiresConfirmation: true
    }
  }

  const columns = validationResults?.columnStats || validationResults?.columns || []
  const dependentCol = columns.find(col => col.name === selectedVariables.dependent)

  if (!dependentCol) {
    return {
      value: 'continuous',
      confidence: 'unknown',
      source: 'none',
      evidence: '종속 변수 정보를 찾을 수 없습니다',
      requiresConfirmation: true
    }
  }

  // 범주형이면서 고유값이 2개면 이진형
  if (dependentCol.type === 'categorical') {
    if (dependentCol.uniqueValues === 2) {
      return {
        value: 'binary',
        confidence: 'high',
        source: 'validationResults',
        evidence: `${dependentCol.name}은 2개 범주를 가진 이진 변수입니다`,
        requiresConfirmation: false
      }
    } else if (dependentCol.uniqueValues > 2) {
      return {
        value: 'multiclass',
        confidence: 'high',
        source: 'validationResults',
        evidence: `${dependentCol.name}은 ${dependentCol.uniqueValues}개 범주를 가집니다`,
        requiresConfirmation: false
      }
    }
  }

  // 수치형이면서 정수이고 범위가 작으면 count
  if (dependentCol.type === 'numeric') {
    const min = dependentCol.min ?? 0
    const max = dependentCol.max ?? 100

    // 모든 값이 0 이상 정수이고 범위가 작으면 count 가능성
    if (min >= 0 && max < 100 && Number.isInteger(min) && Number.isInteger(max)) {
      return {
        value: 'count',
        confidence: 'low',
        source: 'heuristic',
        evidence: `${dependentCol.name}이 빈도/개수 데이터일 수 있습니다`,
        requiresConfirmation: true
      }
    }

    return {
      value: 'continuous',
      confidence: 'high',
      source: 'validationResults',
      evidence: `${dependentCol.name}은 연속형 수치 변수입니다`,
      requiresConfirmation: false
    }
  }

  return {
    value: 'continuous',
    confidence: 'low',
    source: 'heuristic',
    evidence: '결과 변수 유형을 확인해주세요',
    requiresConfirmation: true
  }
}

/**
 * 예측 변수 개수 자동 응답
 */
function getAutoAnswerPredictorCount(context: AutoAnswerContext): AutoAnswerResult {
  const { selectedVariables } = context
  const count = selectedVariables?.independent?.length ?? 0

  if (count === 0) {
    return {
      value: '1',
      confidence: 'unknown',
      source: 'none',
      evidence: '독립 변수가 선택되지 않았습니다',
      requiresConfirmation: true
    }
  }

  if (count === 1) {
    return {
      value: '1',
      confidence: 'high',
      source: 'validationResults',
      evidence: `1개의 예측 변수가 선택되었습니다`,
      requiresConfirmation: false
    }
  }

  return {
    value: '2+',
    confidence: 'high',
    source: 'validationResults',
    evidence: `${count}개의 예측 변수가 선택되었습니다`,
    requiresConfirmation: false
  }
}

/**
 * 공변량 개수 자동 응답 (생존분석용)
 */
function getAutoAnswerCovariateCount(context: AutoAnswerContext): AutoAnswerResult {
  const { selectedVariables } = context
  const count = selectedVariables?.independent?.length ?? 0

  if (count === 0) {
    return {
      value: '0',
      confidence: 'medium',
      source: 'validationResults',
      evidence: '공변량이 선택되지 않았습니다',
      requiresConfirmation: false
    }
  }

  return {
    value: '1+',
    confidence: 'high',
    source: 'validationResults',
    evidence: `${count}개의 공변량이 선택되었습니다`,
    requiresConfirmation: false
  }
}


/**
 * 등분산성 질문 자동 응답
 */
function getAutoAnswerHomogeneity(context: AutoAnswerContext): AutoAnswerResult {
  const { assumptionResults } = context

  // 가정 검정 결과가 없으면 unknown
  if (!assumptionResults?.homogeneity) {
    return {
      value: 'check',
      confidence: 'unknown',
      source: 'none',
      evidence: '등분산성 검정 결과가 없습니다',
      requiresConfirmation: true
    }
  }

  const homogeneity = assumptionResults.homogeneity

  // Levene 검정 결과 확인 (우선)
  if (homogeneity.levene) {
    const { pValue, equalVariance } = homogeneity.levene
    const pValueStr = pValue !== undefined ? pValue.toFixed(3) : 'N/A'

    if (equalVariance) {
      return {
        value: 'yes',
        confidence: pValue !== undefined && pValue > 0.1 ? 'high' : 'medium',
        source: 'assumptionResults',
        evidence: `Levene p=${pValueStr} > 0.05 (등분산 충족)`,
        requiresConfirmation: false
      }
    } else {
      return {
        value: 'no',
        confidence: 'high',
        source: 'assumptionResults',
        evidence: `Levene p=${pValueStr} ≤ 0.05 (등분산 미충족 → Welch 권장)`,
        requiresConfirmation: false
      }
    }
  }

  // Bartlett 검정 결과 확인 (대안)
  if (homogeneity.bartlett) {
    const { pValue, equalVariance } = homogeneity.bartlett
    const pValueStr = pValue !== undefined ? pValue.toFixed(3) : 'N/A'

    if (equalVariance) {
      return {
        value: 'yes',
        confidence: pValue !== undefined && pValue > 0.1 ? 'high' : 'medium',
        source: 'assumptionResults',
        evidence: `Bartlett p=${pValueStr} > 0.05 (등분산 충족)`,
        requiresConfirmation: false
      }
    } else {
      return {
        value: 'no',
        confidence: 'high',
        source: 'assumptionResults',
        evidence: `Bartlett p=${pValueStr} ≤ 0.05 (등분산 미충족 → Welch 권장)`,
        requiresConfirmation: false
      }
    }
  }

  return {
    value: 'check',
    confidence: 'unknown',
    source: 'none',
    evidence: '등분산성을 확인할 수 없습니다',
    requiresConfirmation: true
  }
}

/**
 * 계절성 자동 감지 (시계열용)
 * TODO: 실제 ACF/PACF 분석 결과 활용
 */
function getAutoAnswerSeasonality(_context: AutoAnswerContext): AutoAnswerResult {
  // 현재는 자동 감지 불가
  return {
    value: 'unknown',
    confidence: 'unknown',
    source: 'none',
    evidence: '계절성은 데이터를 분석해야 확인할 수 있습니다',
    requiresConfirmation: true
  }
}

// ============================================
// 메인 함수
// ============================================

/**
 * 질문 ID에 따른 자동 응답 생성
 */
export function getAutoAnswer(
  questionId: string,
  context: AutoAnswerContext
): AutoAnswerResult | null {
  switch (questionId) {
    case 'normality':
      return getAutoAnswerNormality(context)

    case 'variable_type':
      return getAutoAnswerVariableType(context)

    case 'outcome_type':
      return getAutoAnswerOutcomeType(context)

    case 'predictor_count':
      return getAutoAnswerPredictorCount(context)

    case 'covariate_count':
      return getAutoAnswerCovariateCount(context)

    case 'homogeneity':
      return getAutoAnswerHomogeneity(context)

    case 'seasonality':
      return getAutoAnswerSeasonality(context)

    default:
      return null
  }
}

/**
 * 모든 autoAnswer 가능한 질문에 대해 자동 응답 생성
 */
export function generateAutoAnswers(
  questionIds: string[],
  context: AutoAnswerContext
): Record<string, AutoAnswerResult> {
  const results: Record<string, AutoAnswerResult> = {}

  for (const id of questionIds) {
    const answer = getAutoAnswer(id, context)
    if (answer) {
      results[id] = answer
    }
  }

  return results
}
