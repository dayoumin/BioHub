/**
 * 통계 분석 결과 스키마 검증 유틸리티
 *
 * 43개 통계 방법의 결과 일관성을 보장하기 위한 검증 시스템
 *
 * @example
 * const result = await runAnalysis('regression', data)
 * const validation = validateResultSchema(result, 'regression')
 * if (!validation.valid) {
 *   console.warn('Missing fields:', validation.missing)
 * }
 */

import type { AnalysisResult } from '@/types/smart-flow'

/**
 * 통계 카테고리 정의
 */
export type StatisticsCategory =
  | 'comparison'        // t-test, ANOVA, Mann-Whitney, Wilcoxon, Kruskal-Wallis 등
  | 'regression'        // 단순회귀, 다중회귀, 로지스틱, 다항회귀
  | 'correlation'       // Pearson, Spearman, 편상관
  | 'dimensionReduction' // PCA, 요인분석, 군집분석
  | 'goodnessOfFit'     // 카이제곱, 정규성, K-S, 이항검정
  | 'reliability'       // Cronbach's alpha
  | 'powerAnalysis'     // 검정력 분석
  | 'descriptive'       // 기술통계

/**
 * 카테고리별 필수 필드 정의
 */
export const REQUIRED_FIELDS: Record<StatisticsCategory, string[]> = {
  comparison: [
    'statistic',
    'pValue',
    'interpretation'
  ],
  regression: [
    'statistic',
    'pValue',
    'interpretation',
    'additional.rSquared'
  ],
  correlation: [
    'statistic',
    'pValue',
    'interpretation'
  ],
  dimensionReduction: [
    'statistic',
    'interpretation',
    'additional.explainedVarianceRatio'
  ],
  goodnessOfFit: [
    'statistic',
    'pValue',
    'interpretation'
  ],
  reliability: [
    'statistic',
    'interpretation',
    'additional.alpha'
  ],
  powerAnalysis: [
    'interpretation',
    'additional.power'
  ],
  descriptive: [
    'interpretation',
    'additional.mean'
  ]
}

/**
 * 카테고리별 권장 필드 (있으면 좋은 필드)
 */
export const RECOMMENDED_FIELDS: Record<StatisticsCategory, string[]> = {
  comparison: [
    'effectSize',
    'df',
    'groupStats',
    'confidence'
  ],
  regression: [
    'effectSize',
    'coefficients',
    'additional.rmse',
    'additional.adjustedRSquared',
    'additional.intercept'
  ],
  correlation: [
    'effectSize',
    'confidence',
    'df'
  ],
  dimensionReduction: [
    'additional.loadings',
    'additional.eigenvalues'
  ],
  goodnessOfFit: [
    'df',
    'effectSize'
  ],
  reliability: [
    'additional.itemTotalCorrelations'
  ],
  powerAnalysis: [
    'additional.requiredSampleSize',
    'additional.alpha'
  ],
  descriptive: [
    'additional.std',
    'additional.median',
    'additional.min',
    'additional.max'
  ]
}

/**
 * 통계 방법 → 카테고리 매핑
 */
export const METHOD_TO_CATEGORY: Record<string, StatisticsCategory> = {
  // Comparison (비교 검정)
  't-test': 'comparison',
  'independent-t': 'comparison',
  'paired-t': 'comparison',
  'one-sample-t': 'comparison',
  'welch-t': 'comparison',
  'anova': 'comparison',
  'one-way-anova': 'comparison',
  'repeated-measures-anova': 'comparison',
  'ancova': 'comparison',
  'manova': 'comparison',
  'mann-whitney': 'comparison',
  'wilcoxon': 'comparison',
  'kruskal-wallis': 'comparison',
  'friedman': 'comparison',
  'sign-test': 'comparison',
  'mood-median': 'comparison',
  'cochran-q': 'comparison',
  'mcnemar': 'comparison',

  // Regression (회귀분석)
  'regression': 'regression',
  'simple': 'regression',           // executor ID
  'simple-regression': 'regression',
  'multiple': 'regression',         // executor ID
  'multiple-regression': 'regression',
  'logistic': 'regression',         // executor ID
  'logistic-regression': 'regression',
  'polynomial': 'regression',       // executor ID
  'ordinal-regression': 'regression',
  'poisson': 'regression',
  'stepwise': 'regression',
  'dose-response': 'regression',
  'response-surface': 'regression',
  'mixed-model': 'regression',

  // Correlation (상관분석)
  'correlation': 'correlation',
  'pearson': 'correlation',
  'pearson-correlation': 'correlation',
  'spearman': 'correlation',
  'spearman-correlation': 'correlation',
  'kendall-correlation': 'correlation',
  'partial-correlation': 'correlation',
  'mann-kendall': 'correlation',

  // Dimension Reduction (차원 축소)
  'pca': 'dimensionReduction',
  'factor-analysis': 'dimensionReduction',
  'cluster': 'dimensionReduction',
  'cluster-analysis': 'dimensionReduction',
  'discriminant': 'dimensionReduction',

  // Goodness of Fit (적합도 검정)
  'chi-square': 'goodnessOfFit',
  'chi-square-goodness': 'goodnessOfFit',
  'chi-square-independence': 'goodnessOfFit',
  'normality-test': 'goodnessOfFit',
  'shapiro-wilk': 'goodnessOfFit',
  'ks-test': 'goodnessOfFit',
  'binomial-test': 'goodnessOfFit',
  'proportion-test': 'goodnessOfFit',
  'runs-test': 'goodnessOfFit',

  // Reliability (신뢰도)
  'reliability': 'reliability',

  // Power Analysis (검정력)
  'power-analysis': 'powerAnalysis',

  // Descriptive (기술통계)
  'descriptive': 'descriptive',
  'explore-data': 'descriptive',
  'means-plot': 'descriptive'
}

/**
 * 메서드별 필수 필드(카테고리 공통 규칙 외 추가)
 */
export const METHOD_REQUIRED_FIELDS: Record<string, string[]> = {
  correlation: [
    'additional.rSquared',
    'additional.pearson',
    'additional.spearman',
    'additional.kendall'
  ],
  'pearson-correlation': [
    'additional.rSquared',
    'additional.pearson',
    'additional.spearman',
    'additional.kendall'
  ],
  pearson: [
    'additional.rSquared'
  ],
  pca: [
    'additional.explainedVarianceRatio',
    'additional.eigenvalues'
  ],
  'factor-analysis': [
    'additional.explainedVarianceRatio',
    'additional.loadings',
    'additional.communalities'
  ],
  'cluster-analysis': [
    'additional.clusters',
    'additional.centers',
    'additional.silhouetteScore'
  ],
  'normality-test': [
    'additional.isNormal'
  ],
  'shapiro-wilk': [
    'additional.isNormal'
  ]
}

/**
 * 중첩된 필드 값 접근
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/**
 * 필드 존재 여부 확인
 */
function hasField(result: AnalysisResult, fieldPath: string): boolean {
  const value = getNestedValue(result, fieldPath)
  return value !== undefined && value !== null
}

/**
 * 검증 결과 인터페이스
 */
export interface ValidationResult {
  valid: boolean
  category: StatisticsCategory
  missing: string[]
  missingRecommended: string[]
  score: number  // 0-100 완성도 점수
  suggestions: string[]
}

/**
 * 결과 스키마 검증
 *
 * @param result - 분석 결과
 * @param methodId - 통계 방법 ID (예: 'regression', 't-test')
 * @returns 검증 결과
 */
export function validateResultSchema(
  result: AnalysisResult,
  methodId: string
): ValidationResult {
  // 방법 ID 정규화
  const normalizedId = methodId.toLowerCase().replace(/\s+/g, '-')

  // 카테고리 찾기
  const category = METHOD_TO_CATEGORY[normalizedId] || 'comparison'

  // 필수 필드 검증
  const requiredFields = REQUIRED_FIELDS[category]
  const methodRequiredFields = METHOD_REQUIRED_FIELDS[normalizedId] || []
  const allRequiredFields = [...new Set([...requiredFields, ...methodRequiredFields])]
  const missing = allRequiredFields.filter(field => !hasField(result, field))

  // 권장 필드 검증
  const recommendedFields = RECOMMENDED_FIELDS[category]
  const missingRecommended = recommendedFields.filter(field => !hasField(result, field))

  // 완성도 점수 계산
  const requiredScore = ((allRequiredFields.length - missing.length) / allRequiredFields.length) * 70
  const recommendedScore = ((recommendedFields.length - missingRecommended.length) / recommendedFields.length) * 30
  const score = Math.round(requiredScore + recommendedScore)

  // 제안 생성
  const suggestions: string[] = []

  if (missing.length > 0) {
    suggestions.push(`필수 필드 누락: ${missing.join(', ')}`)
  }

  if (missingRecommended.length > 0 && missing.length === 0) {
    suggestions.push(`권장 필드 추가 고려: ${missingRecommended.slice(0, 3).join(', ')}`)
  }

  if (score < 50) {
    suggestions.push('결과 데이터가 불완전합니다. Executor 구현을 확인하세요.')
  }

  return {
    valid: missing.length === 0,
    category,
    missing,
    missingRecommended,
    score,
    suggestions
  }
}

/**
 * 방법 ID로 카테고리 조회
 */
export function getCategoryForMethod(methodId: string): StatisticsCategory {
  const normalizedId = methodId.toLowerCase().replace(/\s+/g, '-')
  return METHOD_TO_CATEGORY[normalizedId] || 'comparison'
}

/**
 * 개발 모드에서 결과 검증 로그 출력
 */
export function logResultValidation(
  result: AnalysisResult,
  methodId: string
): void {
  if (process.env.NODE_ENV !== 'development') return

  const validation = validateResultSchema(result, methodId)

  if (!validation.valid) {
    console.warn(`[ResultValidation] ${methodId}:`, {
      category: validation.category,
      score: validation.score,
      missing: validation.missing,
      suggestions: validation.suggestions
    })
  } else if (validation.score < 80) {
    console.info(`[ResultValidation] ${methodId}: Score ${validation.score}/100`, {
      missingRecommended: validation.missingRecommended.slice(0, 3)
    })
  }
}

/**
 * 배치 검증 (여러 결과 동시 검증)
 */
export function validateBatch(
  results: Array<{ methodId: string; result: AnalysisResult }>
): {
  allValid: boolean
  summary: Record<string, ValidationResult>
  failedMethods: string[]
} {
  const summary: Record<string, ValidationResult> = {}
  const failedMethods: string[] = []

  for (const { methodId, result } of results) {
    const validation = validateResultSchema(result, methodId)
    summary[methodId] = validation

    if (!validation.valid) {
      failedMethods.push(methodId)
    }
  }

  return {
    allValid: failedMethods.length === 0,
    summary,
    failedMethods
  }
}
