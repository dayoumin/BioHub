/**
 * Data-Method Compatibility Layer
 *
 * This module provides a central guard that validates whether a statistical method
 * is compatible with the uploaded data based on:
 * - Variable counts and types (continuous, categorical, binary, ordinal)
 * - Sample size requirements
 * - Statistical assumptions (normality, homogeneity, independence)
 * - Study design (independent, paired, repeated measures)
 * - Group structure (number of levels, balanced/unbalanced)
 *
 * @see variable-requirements.ts for method definitions
 * @see DataExplorationStep.tsx for assumption test execution
 */

import {
  StatisticalMethodRequirements,
  VariableType,
  STATISTICAL_METHOD_REQUIREMENTS
} from './variable-requirements'


// ============================================================================
// ID Mapping Layer
// ============================================================================

/**
 * Mapping from STATISTICAL_METHODS IDs (used in UI/recommendations)
 * to STATISTICAL_METHOD_REQUIREMENTS IDs (used in compatibility checking)
 *
 * This resolves the mismatch between:
 * - decision-tree-recommender.ts using createMethod('t-test')
 * - variable-requirements.ts defining 'two-sample-t'
 */
export const METHOD_ID_MAPPING: Record<string, string> = {
  // T-tests
  't-test': 'two-sample-t',
  'welch-t': 'welch-t',
  'one-sample-t': 'one-sample-t',
  'paired-t': 'paired-t',

  // ANOVA
  'anova': 'one-way-anova',
  'welch-anova': 'one-way-anova', // Falls back to one-way
  'repeated-measures-anova': 'repeated-measures-anova',
  'ancova': 'ancova',
  'manova': 'manova',
  'mixed-model': 'mixed-model',

  // Non-parametric
  'mann-whitney': 'mann-whitney',
  'wilcoxon': 'wilcoxon-signed-rank',
  'kruskal-wallis': 'kruskal-wallis',
  'friedman': 'friedman',
  'sign-test': 'sign-test',
  'mcnemar': 'mcnemar',
  'cochran-q': 'cochran-q',
  'binomial-test': 'binomial-test',
  'runs-test': 'runs-test',
  'ks-test': 'kolmogorov-smirnov',
  'mood-median': 'mood-median',

  // Correlation
  'correlation': 'pearson-correlation', // Default to Pearson
  'partial-correlation': 'partial-correlation',

  // Regression
  'regression': 'simple-regression', // Default to simple
  'logistic-regression': 'logistic-regression',
  'poisson': 'poisson-regression',
  'ordinal-regression': 'ordinal-regression',
  'stepwise': 'stepwise-regression',
  'response-surface': 'response-surface',

  // Chi-square
  'chi-square': 'chi-square-independence',
  'chi-square-goodness': 'chi-square-goodness',
  'chi-square-independence': 'chi-square-independence',
  'fisher-exact': 'fisher-exact',

  // Descriptive
  'descriptive': 'descriptive-stats',
  'normality-test': 'explore-data',
  'explore-data': 'explore-data',
  'means-plot': 'means-plot',

  // Time series
  'arima': 'arima',
  'seasonal-decompose': 'seasonal-decompose',
  'stationarity-test': 'stationarity-test',
  'mann-kendall': 'mann-kendall-test',

  // Survival
  'kaplan-meier': 'kaplan-meier',
  'cox-regression': 'cox-regression',

  // Multivariate
  'pca': 'pca',
  'factor-analysis': 'factor-analysis',
  'cluster': 'cluster-analysis',
  'discriminant': 'discriminant-analysis',

  // Other
  'reliability': 'reliability-analysis',
  'frequency': 'frequency-table',
  'crosstab': 'cross-tabulation',
  'proportion-test': 'one-sample-proportion',
  'power-analysis': 'one-sample-t', // Falls back to one-sample-t (no specific requirements)
  'dose-response': 'simple-regression', // Falls back to regression
  'non-parametric': 'mann-whitney', // Generic non-parametric falls back to Mann-Whitney

  // Multi-way ANOVA (explicit mappings for clarity)
  'two-way-anova': 'two-way-anova',
  'three-way-anova': 'three-way-anova',

  // Additional correlation types
  'spearman': 'spearman-correlation',
  'kendall': 'kendall-correlation',

  // Multiple regression
  'multiple-regression': 'multiple-regression',
}

/**
 * Resolve a UI method ID to a requirements ID
 * Returns the input if no mapping exists (identity mapping)
 */
export function resolveMethodId(uiMethodId: string): string {
  return METHOD_ID_MAPPING[uiMethodId] ?? uiMethodId
}

/**
 * Get compatibility result for a UI method ID
 * Automatically resolves ID mapping
 */
export function getCompatibilityForMethod(
  compatibilityMap: Map<string, CompatibilityResult>,
  uiMethodId: string
): CompatibilityResult | undefined {
  // Try direct lookup first
  const direct = compatibilityMap.get(uiMethodId)
  if (direct) return direct

  // Try mapped ID
  const mappedId = resolveMethodId(uiMethodId)
  return compatibilityMap.get(mappedId)
}

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Summary of dataset characteristics extracted from validation/exploration steps
 * This is the primary input for compatibility checking
 */
export interface DataSummary {
  /** Total number of rows (observations) */
  sampleSize: number

  /** Count of continuous (numeric) variables */
  continuousCount: number

  /** Count of categorical variables (>2 levels) */
  categoricalCount: number

  /** Count of binary variables (exactly 2 levels) */
  binaryCount: number

  /** Count of ordinal variables */
  ordinalCount: number

  /** Count of date/time variables */
  dateCount: number

  /**
   * Map of categorical/binary variable names to their level counts
   * e.g., { "gender": 2, "treatment": 3, "region": 5 }
   */
  groupLevels: Map<string, number>

  /**
   * Whether the data appears to be paired/matched
   * Detected from variable naming patterns (pre/post, before/after)
   * or explicitly set by user
   */
  pairedFlag: boolean

  /**
   * Whether the data has repeated measures structure
   * Detected from long format or time variables
   */
  repeatedMeasures: boolean

  /** Overall missing value rate (0-1) */
  missingRate: number

  /** List of variable names by type for detailed checking */
  variablesByType: {
    continuous: string[]
    categorical: string[]
    binary: string[]
    ordinal: string[]
    date: string[]
  }
}

/**
 * Results of statistical assumption tests from Step 3
 */
export interface AssumptionResults {
  /**
   * Normality test result
   * - true: normality assumption met (p > alpha)
   * - false: normality violated (p <= alpha)
   * - 'unknown': not yet tested
   */
  normality: boolean | 'unknown'

  /**
   * Homogeneity of variance test result (Levene's test)
   * - true: equal variances (p > alpha)
   * - false: unequal variances (p <= alpha)
   * - 'unknown': not yet tested
   */
  homogeneity: boolean | 'unknown'

  /**
   * Independence assumption
   * - true: observations are independent
   * - false: observations are not independent
   * - 'unknown': not yet tested
   */
  independence: boolean | 'unknown'

  /**
   * Linearity assumption (for regression)
   * - true: linear relationship exists
   * - false: non-linear relationship detected
   * - 'unknown': not yet tested
   */
  linearity?: boolean | 'unknown'

  /**
   * Sphericity assumption (for repeated measures ANOVA)
   * - true: sphericity met (Mauchly's test p > alpha)
   * - false: sphericity violated
   * - 'unknown': not yet tested
   */
  sphericity?: boolean | 'unknown'

  /**
   * Expected frequency check (for chi-square tests)
   * - true: all expected frequencies >= 5
   * - false: some expected frequencies < 5
   * - 'unknown': not yet checked
   */
  expectedFrequency?: boolean | 'unknown'

  /**
   * Multicollinearity check (for multiple regression)
   * - true: no severe multicollinearity (VIF < 10)
   * - false: multicollinearity detected (VIF >= 10)
   * - 'unknown': not yet checked
   */
  multicollinearity?: boolean | 'unknown'

  /**
   * Proportional odds assumption (for ordinal regression)
   * - true: proportional odds met (Brant test p > alpha)
   * - false: proportional odds violated
   * - 'unknown': not yet tested
   */
  proportionalOdds?: boolean | 'unknown'

  /**
   * Overdispersion check (for Poisson regression)
   * - true: mean ≈ variance (no overdispersion)
   * - false: variance >> mean (overdispersion detected)
   * - 'unknown': not yet tested
   */
  overdispersion?: boolean | 'unknown'

  /**
   * Proportional hazards assumption (for Cox regression)
   * - true: hazards are proportional (Schoenfeld test p > alpha)
   * - false: non-proportional hazards detected
   * - 'unknown': not yet tested
   */
  proportionalHazards?: boolean | 'unknown'

  /**
   * Stationarity check (for time series)
   * - true: series is stationary (after differencing if needed)
   * - false: series is non-stationary
   * - 'unknown': not yet tested
   */
  stationarity?: boolean | 'unknown'

  /**
   * White noise residuals (for ARIMA)
   * - true: residuals are white noise (Ljung-Box p > alpha)
   * - false: autocorrelation in residuals
   * - 'unknown': not yet tested
   */
  whiteNoise?: boolean | 'unknown'

  /**
   * Seasonality check (for seasonal decomposition)
   * - true: periodic seasonality detected
   * - false: no clear seasonality
   * - 'unknown': not yet tested
   */
  seasonality?: boolean | 'unknown'

  /** Detailed test results for UI display */
  details?: {
    shapiroWilk?: { statistic: number; pValue: number }
    levene?: { statistic: number; pValue: number }
    durbinWatson?: { statistic: number; pValue: number }
    mauchly?: { statistic: number; pValue: number }
    vif?: { max: number; variables: Record<string, number> }
  }
}

/**
 * Compatibility status for a statistical method
 */
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'warning'

/**
 * Result of compatibility check for a single method
 */
export interface CompatibilityResult {
  /** Method identifier */
  methodId: string

  /** Method display name */
  methodName: string

  /** Overall compatibility status */
  status: CompatibilityStatus

  /**
   * User-friendly reasons for incompatibility or warnings
   * Localized in Korean for this project
   */
  reasons: string[]

  /**
   * Optional compatibility score (0-100)
   * Higher = better fit for the data
   * Used for ranking compatible methods
   */
  score?: number

  /**
   * Specific assumption violations
   */
  assumptionViolations?: string[]

  /**
   * Suggested alternative methods when incompatible
   */
  alternatives?: string[]
}

// ============================================================================
// Compatibility Rule Engine
// ============================================================================

/**
 * Check if a method's variable requirements can be satisfied by the data
 *
 * This function tracks which variables are "consumed" by each requirement
 * to prevent double-counting. For example, simple regression needs 2 continuous
 * variables (1 dependent + 1 independent), so we need at least 2 total.
 */
function checkVariableRequirements(
  dataSummary: DataSummary,
  method: StatisticalMethodRequirements
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Track remaining available variables by type
  // Binary variables can also satisfy categorical requirements (binary ⊂ categorical)
  const remaining = {
    continuous: dataSummary.continuousCount,
    categorical: dataSummary.categoricalCount + dataSummary.binaryCount,
    binary: dataSummary.binaryCount,
    ordinal: dataSummary.ordinalCount,
    date: dataSummary.dateCount,
    count: dataSummary.continuousCount // Count vars use continuous pool
  }

  for (const varReq of method.variables) {
    if (!varReq.required) continue

    const minCount = varReq.minCount ?? 1
    const allowedTypes = varReq.types

    // Find the best matching type with most available variables
    let bestType: string | null = null
    let bestAvailable = 0

    for (const type of allowedTypes) {
      const available = remaining[type as keyof typeof remaining] ?? 0
      if (available > bestAvailable) {
        bestAvailable = available
        bestType = type
      }
    }

    if (bestAvailable < minCount) {
      const typeLabels = allowedTypes.map(t => getTypeLabel(t)).join(' 또는 ')
      reasons.push(`${varReq.label}: ${typeLabels} 변수 ${minCount}개 이상 필요 (현재 ${bestAvailable}개)`)
    } else if (bestType) {
      // Consume the variables from the pool
      const key = bestType as keyof typeof remaining
      remaining[key] = Math.max(0, remaining[key] - minCount)

      // If count type was used, also reduce continuous (they share the pool)
      if (bestType === 'count') {
        remaining.continuous = Math.max(0, remaining.continuous - minCount)
      } else if (bestType === 'continuous') {
        remaining.count = Math.max(0, remaining.count - minCount)
      }
      // Binary ⊂ categorical: they share a pool (like continuous/count)
      if (bestType === 'categorical') {
        remaining.binary = Math.max(0, remaining.binary - minCount)
      } else if (bestType === 'binary') {
        remaining.categorical = Math.max(0, remaining.categorical - minCount)
      }
    }
  }

  return { passed: reasons.length === 0, reasons }
}

/**
 * Check if sample size requirement is met
 */
function checkSampleSize(
  dataSummary: DataSummary,
  method: StatisticalMethodRequirements
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (dataSummary.sampleSize < method.minSampleSize) {
    reasons.push(
      `최소 표본 크기 ${method.minSampleSize}개 필요 (현재 ${dataSummary.sampleSize}개)`
    )
  }

  // Additional sample size checks for specific methods
  if (method.id === 'pca' || method.id === 'factor-analysis') {
    // Rule of thumb: n >= 5 * number of variables
    const minForFA = dataSummary.continuousCount * 5
    if (dataSummary.sampleSize < minForFA) {
      reasons.push(
        `요인분석 권장: 변수당 5배 이상 표본 필요 (${dataSummary.continuousCount}개 변수 × 5 = ${minForFA}개)`
      )
    }
  }

  return { passed: reasons.length === 0, reasons }
}

/**
 * Check if statistical assumptions are met
 */
function checkAssumptions(
  assumptions: AssumptionResults,
  method: StatisticalMethodRequirements
): { passed: boolean; warnings: string[]; violations: string[] } {
  const warnings: string[] = []
  const violations: string[] = []

  for (const assumption of method.assumptions) {
    switch (assumption) {
      case '정규성':
      case '차이값의 정규성':
      case '다변량 정규성':
        if (assumptions.normality === false) {
          violations.push('정규성 가정 위반')
          warnings.push('정규성 검정 실패: 비모수 방법 권장')
        } else if (assumptions.normality === 'unknown') {
          warnings.push('정규성 검정 필요')
        }
        break

      case '등분산성':
      case '공분산 행렬 동질성':
        if (assumptions.homogeneity === false) {
          violations.push('등분산성 가정 위반')
          warnings.push('등분산성 위반: Welch 보정 또는 비모수 방법 권장')
        } else if (assumptions.homogeneity === 'unknown') {
          warnings.push('등분산성 검정 필요')
        }
        break

      case '독립성':
        if (assumptions.independence === false) {
          violations.push('독립성 가정 위반')
          warnings.push('관측치 독립성 위반: 반복측정 또는 혼합모형 고려')
        }
        break

      case '선형성':
      case '회귀선 평행성':
        if (assumptions.linearity === false) {
          violations.push('선형성 가정 위반')
          warnings.push('선형성 위반: 비선형 회귀 또는 변수 변환 권장')
        } else if (assumptions.linearity === 'unknown') {
          warnings.push('선형성 검정 필요 (잔차 플롯 확인)')
        }
        break

      case '구형성':
        if (assumptions.sphericity === false) {
          violations.push('구형성 가정 위반')
          warnings.push('구형성 위반: Greenhouse-Geisser 또는 Huynh-Feldt 보정 적용')
        } else if (assumptions.sphericity === 'unknown') {
          warnings.push('구형성 검정 필요 (Mauchly 검정)')
        }
        break

      case '기대빈도':
        if (assumptions.expectedFrequency === false) {
          violations.push('기대빈도 조건 위반')
          warnings.push('기대빈도 < 5인 셀 존재: Fisher 정확검정 권장')
        } else if (assumptions.expectedFrequency === 'unknown') {
          warnings.push('기대빈도 확인 필요 (모든 셀 ≥ 5)')
        }
        break

      case '다중공선성':
      case '다중공선성 없음':
        if (assumptions.multicollinearity === false) {
          violations.push('다중공선성 문제')
          warnings.push('다중공선성 감지 (VIF ≥ 10): 변수 제거 또는 정규화 권장')
        } else if (assumptions.multicollinearity === 'unknown') {
          warnings.push('다중공선성 확인 필요 (VIF 검토)')
        }
        break

      // Chi-square expected frequency variants
      case '기대빈도 ≥ 5 (80% 셀)':
      case '기대빈도 ≥ 5 (모든 범주)':
        if (assumptions.expectedFrequency === false) {
          violations.push('기대빈도 조건 위반')
          warnings.push('기대빈도 < 5인 셀 존재: Fisher 정확검정 권장')
        } else if (assumptions.expectedFrequency === 'unknown') {
          warnings.push('기대빈도 확인 필요 (모든 셀 ≥ 5)')
        }
        break

      // Logistic regression linearity (logit)
      case '선형성(로짓)':
        if (assumptions.linearity === false) {
          violations.push('로짓 선형성 가정 위반')
          warnings.push('로짓 변환 후 선형성 불충족: 변수 변환 또는 비선형 항 고려')
        } else if (assumptions.linearity === 'unknown') {
          warnings.push('로짓 선형성 확인 필요 (Box-Tidwell 검정)')
        }
        break

      // Proportional odds (ordinal regression)
      case '비례 오즈 가정':
        if (assumptions.proportionalOdds === false) {
          violations.push('비례 오즈 가정 위반')
          warnings.push('비례 오즈 위반: 다항 로지스틱 회귀 고려')
        } else if (assumptions.proportionalOdds === 'unknown') {
          warnings.push('비례 오즈 가정 검정 필요 (Brant test)')
        }
        break

      // Poisson mean=variance
      case '평균과 분산이 같음':
        if (assumptions.overdispersion === false) {
          violations.push('과분산 문제')
          warnings.push('분산 > 평균: Negative Binomial 또는 Quasi-Poisson 고려')
        } else if (assumptions.overdispersion === 'unknown') {
          warnings.push('과분산 검정 필요 (분산/평균 비율 확인)')
        }
        break

      // Independence variants
      case '독립 시행':
      case '독립 표본':
      case '독립 관측값':
      case '독립적 중도절단':
        if (assumptions.independence === false) {
          violations.push('독립성 가정 위반')
          warnings.push('관측치 간 독립성 불충족: 군집 또는 반복측정 구조 고려')
        }
        break

      // Proportional hazards (Cox regression)
      case '비례위험 가정':
        if (assumptions.proportionalHazards === false) {
          violations.push('비례위험 가정 위반')
          warnings.push('비례위험 위반: 시간-가변 공변량 또는 층화 Cox 모형 고려')
        } else if (assumptions.proportionalHazards === 'unknown') {
          warnings.push('비례위험 가정 검정 필요 (Schoenfeld 잔차)')
        }
        break

      // Time series assumptions
      case '정상성 (차분 후)':
        if (assumptions.stationarity === false) {
          violations.push('정상성 가정 위반')
          warnings.push('비정상 시계열: 추가 차분 또는 변환 필요')
        } else if (assumptions.stationarity === 'unknown') {
          warnings.push('정상성 검정 필요 (ADF/KPSS)')
        }
        break

      case '잔차 백색잡음':
        if (assumptions.whiteNoise === false) {
          violations.push('잔차 자기상관')
          warnings.push('잔차가 백색잡음 아님: 모형 차수 재검토')
        } else if (assumptions.whiteNoise === 'unknown') {
          warnings.push('잔차 검정 필요 (Ljung-Box 검정)')
        }
        break

      case '주기적 계절성':
        if (assumptions.seasonality === false) {
          violations.push('계절성 미검출')
          warnings.push('명확한 계절 패턴 없음: 비계절 모형 고려')
        } else if (assumptions.seasonality === 'unknown') {
          warnings.push('계절성 확인 필요')
        }
        break

      // Non-parametric / descriptive assumptions that don't need checking
      case '순서형 이상 데이터':
      case '정규성 가정 불필요':
      case '이진 결과 (성공/실패)':
      case '일정한 성공 확률':
      case '시간 순서 데이터':
        // These are structural requirements, not testable assumptions
        // Already handled by variable type checks
        break

      // ============================================================
      // Structural assumptions - verified by data/variable type checks
      // These are not statistically testable but validated elsewhere
      // ============================================================

      // Proportion test: np >= 5, n(1-p) >= 5
      case 'np ≥ 5, n(1-p) ≥ 5':
        // Structural: checked at analysis time with actual proportion
        // Cannot pre-validate without knowing the hypothesized proportion
        warnings.push('비율 검정 조건 확인 필요 (np ≥ 5, n(1-p) ≥ 5)')
        break

      // Spearman correlation: monotonicity
      case '단조성':
        // Structural: Spearman is robust to non-monotonic relationships
        // Just gives lower correlation, not a hard violation
        break

      // Kolmogorov-Smirnov: continuous distribution
      case '연속 분포':
        // Structural: already validated by variable type check (continuous)
        break

      // McNemar test: paired samples, binary data
      case '대응 표본':
        // Structural: requires study design confirmation
        warnings.push('대응 표본(짝지은 자료) 구조 확인 필요')
        break

      case '이진 자료':
        // Structural: already validated by variable type check (binary)
        break

      // Factor analysis: adequate correlation, KMO
      case '적절한 상관':
        // Checked during analysis via correlation matrix inspection
        warnings.push('변수 간 적절한 상관관계 확인 필요 (상관행렬 검토)')
        break

      case 'KMO > 0.5':
        // Checked during factor analysis execution
        warnings.push('KMO 표본 적절성 검정 필요 (KMO > 0.5)')
        break

      // Survival analysis: non-informative censoring
      case '비정보적 중도절단':
        // Structural: requires study design confirmation
        // Cannot be tested statistically, assumption of study design
        warnings.push('비정보적 중도절단 가정 확인 필요 (중도절단이 생존과 무관해야 함)')
        break

      default:
        // Log unhandled assumptions for debugging
        console.warn(`[checkAssumptions] Unhandled assumption: "${assumption}" for method`)
        break
    }
  }

  // Assumption violations are warnings, not hard failures
  // (user may choose to proceed with caution)
  return {
    passed: true, // Assumptions don't cause hard incompatibility
    warnings,
    violations
  }
}

/**
 * Check group structure requirements for ANOVA-type methods
 *
 * Important: This function validates not just variable counts but also
 * that factors have valid levels (≥2) for meaningful group comparisons.
 */
function checkGroupStructure(
  dataSummary: DataSummary,
  method: StatisticalMethodRequirements
): { passed: boolean; reasons: string[] } {
  const reasons: string[] = []

  // Count categorical variables with different level counts
  const groupLevelCounts = Array.from(dataSummary.groupLevels.values())

  // Count valid factors: variables with at least 2 levels
  // Binary variables always have exactly 2 levels, so they're valid factors
  const validFactorsFromGroupLevels = groupLevelCounts.filter(levels => levels >= 2).length

  // Only add binary variables that are NOT already in groupLevels map
  // to avoid double-counting (binary vars in groupLevels already counted above)
  const binaryVarsInGroupLevels = dataSummary.variablesByType?.binary?.filter(
    varName => dataSummary.groupLevels.has(varName)
  ).length ?? 0
  const binaryVarsNotInGroupLevels = dataSummary.binaryCount - binaryVarsInGroupLevels
  const validFactorCount = validFactorsFromGroupLevels + Math.max(0, binaryVarsNotInGroupLevels)

  // Check for invalid factors (categorical with only 1 level = constant)
  const hasInvalidFactor = groupLevelCounts.some(levels => levels < 2)

  // Methods requiring exactly 2 groups
  const twoGroupMethods = ['two-sample-t', 'welch-t', 'mann-whitney']
  if (twoGroupMethods.includes(method.id)) {
    const hasTwoGroupVar = groupLevelCounts.some(levels => levels === 2) || dataSummary.binaryCount > 0
    if (!hasTwoGroupVar) {
      reasons.push('정확히 2개 수준을 가진 그룹 변수 필요')
    }
  }

  // Methods requiring 3+ groups (single factor)
  const multiGroupMethods = ['one-way-anova', 'kruskal-wallis', 'friedman']
  if (multiGroupMethods.includes(method.id)) {
    const hasMultiGroupVar = groupLevelCounts.some(levels => levels >= 3)
    if (!hasMultiGroupVar) {
      reasons.push('3개 이상 수준을 가진 그룹 변수 필요')
    }
  }

  // Two-way ANOVA: requires 2 categorical/factor variables with valid levels
  if (method.id === 'two-way-anova') {
    if (validFactorCount < 2) {
      reasons.push('2개의 유효한 요인 변수 필요 (각 요인은 2개 이상 수준, 현재 ' + validFactorCount + '개)')
    }
    if (hasInvalidFactor) {
      reasons.push('일부 범주형 변수의 수준이 1개뿐임 (상수 변수)')
    }
  }

  // Three-way ANOVA: requires 3 categorical/factor variables with valid levels
  if (method.id === 'three-way-anova') {
    if (validFactorCount < 3) {
      reasons.push('3개의 유효한 요인 변수 필요 (각 요인은 2개 이상 수준, 현재 ' + validFactorCount + '개)')
    }
    if (hasInvalidFactor) {
      reasons.push('일부 범주형 변수의 수준이 1개뿐임 (상수 변수)')
    }
  }

  // ANCOVA: requires at least 1 valid categorical (factor) + continuous (covariate)
  if (method.id === 'ancova') {
    if (validFactorCount < 1) {
      reasons.push('최소 1개의 유효한 요인 변수 필요 (2개 이상 수준)')
    }
    // Covariate requirement is already checked by checkVariableRequirements
    // but we can add a specific message
    if (dataSummary.continuousCount < 2) {
      reasons.push('종속변수와 공변량을 위한 연속형 변수 2개 이상 필요')
    }
    if (hasInvalidFactor) {
      reasons.push('일부 범주형 변수의 수준이 1개뿐임 (비교 불가)')
    }
  }

  // MANOVA: requires at least 1 valid categorical + 2+ continuous (DVs)
  if (method.id === 'manova') {
    if (validFactorCount < 1) {
      reasons.push('최소 1개의 유효한 요인 변수 필요 (2개 이상 수준)')
    }
    if (dataSummary.continuousCount < 2) {
      reasons.push('2개 이상의 종속변수(연속형) 필요')
    }
    if (hasInvalidFactor) {
      reasons.push('일부 범주형 변수의 수준이 1개뿐임 (그룹 비교 불가)')
    }
  }

  // Repeated measures ANOVA: requires multiple continuous vars (time points)
  // or repeatedMeasures flag
  if (method.id === 'repeated-measures-anova') {
    if (!dataSummary.repeatedMeasures && dataSummary.continuousCount < 2) {
      reasons.push('반복측정(시점별) 변수 2개 이상 필요')
    }
  }

  // Mixed ANOVA: requires both within (repeated) and between (group) factors
  if (method.id === 'mixed-anova') {
    if (!dataSummary.repeatedMeasures && dataSummary.continuousCount < 2) {
      reasons.push('반복측정(시점별) 변수 2개 이상 필요')
    }
    if (validFactorCount < 1) {
      reasons.push('개체간 요인 1개 이상 필요 (2개 이상 수준의 범주형 변수)')
    }
    if (hasInvalidFactor) {
      reasons.push('일부 범주형 변수의 수준이 1개뿐임 (그룹 비교 불가)')
    }
  }

  // Paired data requirements
  const pairedMethods = ['paired-t', 'wilcoxon-signed-rank', 'sign-test']
  if (pairedMethods.includes(method.id)) {
    if (!dataSummary.pairedFlag && dataSummary.continuousCount < 2) {
      reasons.push('대응표본(쌍으로 된 측정값) 필요')
    }
  }

  // Friedman test: non-parametric repeated measures
  if (method.id === 'friedman') {
    if (!dataSummary.repeatedMeasures && dataSummary.continuousCount < 3) {
      reasons.push('3개 이상의 반복측정 조건 필요')
    }
  }

  return { passed: reasons.length === 0, reasons }
}

// ============================================================================
// Main Compatibility Functions
// ============================================================================

/**
 * Check compatibility of a single method with the data
 */
export function checkMethodCompatibility(
  dataSummary: DataSummary,
  assumptions: AssumptionResults,
  method: StatisticalMethodRequirements
): CompatibilityResult {
  const allReasons: string[] = []
  const allWarnings: string[] = []
  let score = 100

  // 1. Check variable requirements (hard requirement)
  const varCheck = checkVariableRequirements(dataSummary, method)
  if (!varCheck.passed) {
    allReasons.push(...varCheck.reasons)
    score -= 40
  }

  // 2. Check sample size (hard requirement)
  const sizeCheck = checkSampleSize(dataSummary, method)
  if (!sizeCheck.passed) {
    allReasons.push(...sizeCheck.reasons)
    score -= 30
  }

  // 3. Check group structure (hard requirement for some methods)
  const groupCheck = checkGroupStructure(dataSummary, method)
  if (!groupCheck.passed) {
    allReasons.push(...groupCheck.reasons)
    score -= 20
  }

  // 4. Check statistical assumptions (soft requirement - warnings only)
  const assumptionCheck = checkAssumptions(assumptions, method)
  allWarnings.push(...assumptionCheck.warnings)
  score -= assumptionCheck.violations.length * 10

  // Determine final status
  let status: CompatibilityStatus
  if (allReasons.length > 0) {
    status = 'incompatible'
    score = Math.max(0, score)
  } else if (allWarnings.length > 0) {
    status = 'warning'
  } else {
    status = 'compatible'
  }

  // Find alternative methods if incompatible
  const alternatives = status === 'incompatible'
    ? findAlternatives(method.id, dataSummary, assumptions)
    : undefined

  return {
    methodId: method.id,
    methodName: method.name,
    status,
    reasons: status === 'incompatible' ? allReasons : allWarnings,
    score: Math.max(0, score),
    assumptionViolations: assumptionCheck.violations.length > 0
      ? assumptionCheck.violations
      : undefined,
    alternatives
  }
}

/**
 * Filter all methods and return compatibility results
 */
export function filterCompatibleMethods(
  dataSummary: DataSummary,
  assumptions: AssumptionResults,
  methods: StatisticalMethodRequirements[] = STATISTICAL_METHOD_REQUIREMENTS
): CompatibilityResult[] {
  return methods.map(method =>
    checkMethodCompatibility(dataSummary, assumptions, method)
  )
}

/**
 * Get only compatible methods, sorted by score
 */
export function getCompatibleMethods(
  dataSummary: DataSummary,
  assumptions: AssumptionResults,
  methods: StatisticalMethodRequirements[] = STATISTICAL_METHOD_REQUIREMENTS
): CompatibilityResult[] {
  return filterCompatibleMethods(dataSummary, assumptions, methods)
    .filter(r => r.status !== 'incompatible')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

/**
 * Get a map of method IDs to their compatibility status
 * Useful for DecisionTree filtering
 */
export function getCompatibilityMap(
  dataSummary: DataSummary,
  assumptions: AssumptionResults,
  methods: StatisticalMethodRequirements[] = STATISTICAL_METHOD_REQUIREMENTS
): Map<string, CompatibilityResult> {
  const results = filterCompatibleMethods(dataSummary, assumptions, methods)
  return new Map(results.map(r => [r.methodId, r]))
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find alternative methods when primary method is incompatible
 */
function findAlternatives(
  methodId: string,
  dataSummary: DataSummary,
  assumptions: AssumptionResults
): string[] {
  const alternatives: string[] = []

  // Parametric → Non-parametric alternatives
  const parametricToNonparametric: Record<string, string> = {
    'two-sample-t': 'mann-whitney',
    'welch-t': 'mann-whitney',
    'paired-t': 'wilcoxon-signed-rank',
    'one-way-anova': 'kruskal-wallis',
    'repeated-measures-anova': 'friedman',
    'pearson-correlation': 'spearman-correlation'
  }

  if (parametricToNonparametric[methodId]) {
    const altMethod = STATISTICAL_METHOD_REQUIREMENTS.find(
      m => m.id === parametricToNonparametric[methodId]
    )
    if (altMethod) {
      const altResult = checkMethodCompatibility(dataSummary, assumptions, altMethod)
      if (altResult.status !== 'incompatible') {
        alternatives.push(altMethod.id)
      }
    }
  }

  // If sample size is the issue, suggest descriptive stats
  if (dataSummary.sampleSize < 10) {
    alternatives.push('descriptive-stats')
  }

  return alternatives
}

/**
 * Get Korean label for variable type
 */
function getTypeLabel(type: VariableType): string {
  const labels: Record<VariableType, string> = {
    continuous: '연속형',
    categorical: '범주형',
    binary: '이진형',
    ordinal: '서열형',
    date: '날짜형',
    count: '카운트형'
  }
  return labels[type] || type
}

// ============================================================================
// Data Summary Extraction
// ============================================================================

/**
 * Extract DataSummary from ValidationResults and column statistics
 * This bridges the gap between Step 2/3 output and compatibility checking
 */
export function extractDataSummary(
  validationResults: {
    totalRows: number
    missingValues: number
    columnStats?: Array<{
      name: string
      type: 'numeric' | 'categorical' | 'mixed'
      uniqueValues: number
      idDetection?: { isId: boolean }
    }>
    // Support 'columns' alias used in some code paths
    columns?: Array<{
      name: string
      type: 'numeric' | 'categorical' | 'mixed'
      uniqueValues: number
      idDetection?: { isId: boolean }
    }>
  },
  pairedFlag = false,
  repeatedMeasures = false
): DataSummary {
  // Support both columnStats and columns (backward compatibility)
  const columns = validationResults.columnStats ?? validationResults.columns ?? []

  // Filter out ID columns
  const nonIdColumns = columns.filter(col => !col.idDetection?.isId)

  // Classify variables
  const variablesByType = {
    continuous: [] as string[],
    categorical: [] as string[],
    binary: [] as string[],
    ordinal: [] as string[],
    date: [] as string[]
  }

  const groupLevels = new Map<string, number>()

  for (const col of nonIdColumns) {
    if (col.type === 'numeric') {
      if (col.uniqueValues <= 2) {
        variablesByType.binary.push(col.name)
        groupLevels.set(col.name, col.uniqueValues)
      } else if (col.uniqueValues <= 5) {
        // Ordinal or coded categorical (synced: variable-type-detector, data-type-detector)
        variablesByType.ordinal.push(col.name)
        groupLevels.set(col.name, col.uniqueValues)
      } else {
        variablesByType.continuous.push(col.name)
      }
    } else if (col.type === 'categorical') {
      if (col.uniqueValues === 2) {
        variablesByType.binary.push(col.name)
      } else {
        variablesByType.categorical.push(col.name)
      }
      groupLevels.set(col.name, col.uniqueValues)
    }
  }

  const totalCells = validationResults.totalRows * columns.length
  const missingRate = totalCells > 0 ? validationResults.missingValues / totalCells : 0

  return {
    sampleSize: validationResults.totalRows,
    continuousCount: variablesByType.continuous.length,
    categoricalCount: variablesByType.categorical.length,
    binaryCount: variablesByType.binary.length,
    ordinalCount: variablesByType.ordinal.length,
    dateCount: variablesByType.date.length,
    groupLevels,
    pairedFlag,
    repeatedMeasures,
    missingRate,
    variablesByType
  }
}

/**
 * Extract AssumptionResults from StatisticalAssumptions
 */
export function extractAssumptionResults(
  assumptions?: {
    normality?: {
      shapiroWilk?: { statistic?: number; pValue?: number; isNormal: boolean }
      group1?: { statistic?: number; pValue?: number; isNormal: boolean }
      group2?: { statistic?: number; pValue?: number; isNormal: boolean }
    }
    homogeneity?: {
      levene?: { statistic?: number; pValue?: number; equalVariance: boolean }
    }
    independence?: {
      durbin?: { statistic?: number; pValue?: number; isIndependent: boolean }
    }
    linearity?: {
      passed: boolean
      statistic?: number
      pValue?: number
    }
    sphericity?: {
      mauchly?: { statistic?: number; pValue?: number; passed: boolean }
    }
    expectedFrequency?: {
      allCellsValid: boolean
      minExpected?: number
    }
    multicollinearity?: {
      maxVif?: number
      hasIssue: boolean
    }
    // New assumption fields
    proportionalOdds?: {
      brant?: { statistic?: number; pValue?: number; passed: boolean }
    }
    overdispersion?: {
      dispersionRatio?: number
      detected: boolean
    }
    proportionalHazards?: {
      schoenfeld?: { statistic?: number; pValue?: number; passed: boolean }
    }
    stationarity?: {
      adf?: { statistic?: number; pValue?: number; isStationary: boolean }
      kpss?: { statistic?: number; pValue?: number; isStationary: boolean }
    }
    whiteNoise?: {
      ljungBox?: { statistic?: number; pValue?: number; isWhiteNoise: boolean }
    }
    seasonality?: {
      detected: boolean
      period?: number
    }
  }
): AssumptionResults {
  if (!assumptions) {
    return {
      normality: 'unknown',
      homogeneity: 'unknown',
      independence: 'unknown'
    }
  }

  // Determine normality (consider all available tests)
  let normality: boolean | 'unknown' = 'unknown'
  if (assumptions.normality) {
    if (assumptions.normality.shapiroWilk !== undefined) {
      normality = assumptions.normality.shapiroWilk.isNormal
    } else if (assumptions.normality.group1 !== undefined) {
      // For grouped data, both groups should be normal
      const g1 = assumptions.normality.group1.isNormal
      const g2 = assumptions.normality.group2?.isNormal ?? true
      normality = g1 && g2
    }
  }

  // Determine homogeneity
  let homogeneity: boolean | 'unknown' = 'unknown'
  if (assumptions.homogeneity?.levene !== undefined) {
    homogeneity = assumptions.homogeneity.levene.equalVariance
  }

  // Determine independence
  let independence: boolean | 'unknown' = 'unknown'
  if (assumptions.independence?.durbin !== undefined) {
    independence = assumptions.independence.durbin.isIndependent
  }

  // Determine linearity (for regression)
  let linearity: boolean | 'unknown' = 'unknown'
  if (assumptions.linearity !== undefined) {
    linearity = assumptions.linearity.passed
  }

  // Determine sphericity (for repeated measures)
  let sphericity: boolean | 'unknown' = 'unknown'
  if (assumptions.sphericity?.mauchly !== undefined) {
    sphericity = assumptions.sphericity.mauchly.passed
  }

  // Determine expected frequency validity (for chi-square)
  let expectedFrequency: boolean | 'unknown' = 'unknown'
  if (assumptions.expectedFrequency !== undefined) {
    expectedFrequency = assumptions.expectedFrequency.allCellsValid
  }

  // Determine multicollinearity (for multiple regression)
  let multicollinearity: boolean | 'unknown' = 'unknown'
  if (assumptions.multicollinearity !== undefined) {
    multicollinearity = !assumptions.multicollinearity.hasIssue
  }

  // Determine proportional odds (for ordinal regression)
  let proportionalOdds: boolean | 'unknown' = 'unknown'
  if (assumptions.proportionalOdds?.brant !== undefined) {
    proportionalOdds = assumptions.proportionalOdds.brant.passed
  }

  // Determine overdispersion (for Poisson regression)
  let overdispersion: boolean | 'unknown' = 'unknown'
  if (assumptions.overdispersion !== undefined) {
    overdispersion = !assumptions.overdispersion.detected
  }

  // Determine proportional hazards (for Cox regression)
  let proportionalHazards: boolean | 'unknown' = 'unknown'
  if (assumptions.proportionalHazards?.schoenfeld !== undefined) {
    proportionalHazards = assumptions.proportionalHazards.schoenfeld.passed
  }

  // Determine stationarity (for time series)
  let stationarity: boolean | 'unknown' = 'unknown'
  if (assumptions.stationarity !== undefined) {
    // Prefer ADF test, fall back to KPSS
    if (assumptions.stationarity.adf !== undefined) {
      stationarity = assumptions.stationarity.adf.isStationary
    } else if (assumptions.stationarity.kpss !== undefined) {
      stationarity = assumptions.stationarity.kpss.isStationary
    }
  }

  // Determine white noise residuals (for ARIMA)
  let whiteNoise: boolean | 'unknown' = 'unknown'
  if (assumptions.whiteNoise?.ljungBox !== undefined) {
    whiteNoise = assumptions.whiteNoise.ljungBox.isWhiteNoise
  }

  // Determine seasonality (for seasonal decomposition)
  let seasonality: boolean | 'unknown' = 'unknown'
  if (assumptions.seasonality !== undefined) {
    seasonality = assumptions.seasonality.detected
  }

  return {
    normality,
    homogeneity,
    independence,
    linearity,
    sphericity,
    expectedFrequency,
    multicollinearity,
    proportionalOdds,
    overdispersion,
    proportionalHazards,
    stationarity,
    whiteNoise,
    seasonality,
    details: {
      shapiroWilk: assumptions.normality?.shapiroWilk
        ? {
            statistic: assumptions.normality.shapiroWilk.statistic ?? 0,
            pValue: assumptions.normality.shapiroWilk.pValue ?? 0
          }
        : undefined,
      levene: assumptions.homogeneity?.levene
        ? {
            statistic: assumptions.homogeneity.levene.statistic ?? 0,
            pValue: assumptions.homogeneity.levene.pValue ?? 0
          }
        : undefined
    }
  }
}

// ============================================================================
// DecisionTree Integration
// ============================================================================

/**
 * Enhanced decision result with compatibility information
 */
export interface EnhancedDecisionResult {
  /** The recommended method (from DecisionTree) */
  methodId: string
  methodName: string

  /** Compatibility status with current data */
  compatibility: CompatibilityResult

  /** Whether the method is usable (compatible or warning) */
  isUsable: boolean

  /** Alternative methods if primary is incompatible */
  alternatives: Array<{
    methodId: string
    methodName: string
    compatibility: CompatibilityResult
    reason: string
  }>

  /** Original reasoning from DecisionTree */
  reasoning: Array<{ step: string; description: string }>

  /** Combined warnings (from compatibility + original) */
  warnings: string[]
}

/**
 * Apply compatibility filtering to a DecisionTree result
 *
 * This function takes the output of DecisionTree.decide() and enhances it
 * with compatibility information based on the current data.
 *
 * @param decisionResult - Result from DecisionTree.decide()
 * @param dataSummary - Current data characteristics
 * @param assumptions - Assumption test results
 * @returns Enhanced result with compatibility info
 */
export function applyCompatibilityFilter(
  decisionResult: {
    method: { id: string; name: string; description: string; category: string }
    reasoning: Array<{ step: string; description: string }>
    alternatives?: Array<{ method: { id: string; name: string }; reason: string }>
    warnings?: string[]
  },
  dataSummary: DataSummary,
  assumptions: AssumptionResults
): EnhancedDecisionResult {
  // Get compatibility for the primary method
  const primaryMethod = STATISTICAL_METHOD_REQUIREMENTS.find(
    m => m.id === decisionResult.method.id
  )

  const primaryCompatibility = primaryMethod
    ? checkMethodCompatibility(dataSummary, assumptions, primaryMethod)
    : {
        methodId: decisionResult.method.id,
        methodName: decisionResult.method.name,
        status: 'compatible' as CompatibilityStatus,
        reasons: [],
        score: 100
      }

  // Check alternatives
  const alternativeResults: EnhancedDecisionResult['alternatives'] = []

  // If primary is incompatible, find compatible alternatives
  if (primaryCompatibility.status === 'incompatible') {
    // Check original alternatives first
    for (const alt of decisionResult.alternatives ?? []) {
      const altMethod = STATISTICAL_METHOD_REQUIREMENTS.find(
        m => m.id === alt.method.id
      )
      if (altMethod) {
        const altCompat = checkMethodCompatibility(dataSummary, assumptions, altMethod)
        if (altCompat.status !== 'incompatible') {
          alternativeResults.push({
            methodId: alt.method.id,
            methodName: alt.method.name,
            compatibility: altCompat,
            reason: alt.reason
          })
        }
      }
    }

    // Also check auto-suggested alternatives
    for (const altId of primaryCompatibility.alternatives ?? []) {
      // Avoid duplicates
      if (alternativeResults.some(a => a.methodId === altId)) continue

      const altMethod = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === altId)
      if (altMethod) {
        const altCompat = checkMethodCompatibility(dataSummary, assumptions, altMethod)
        alternativeResults.push({
          methodId: altMethod.id,
          methodName: altMethod.name,
          compatibility: altCompat,
          reason: getAlternativeReason(decisionResult.method.id, altId)
        })
      }
    }
  } else {
    // Primary is usable, just include original alternatives with compatibility info
    for (const alt of decisionResult.alternatives ?? []) {
      const altMethod = STATISTICAL_METHOD_REQUIREMENTS.find(
        m => m.id === alt.method.id
      )
      if (altMethod) {
        const altCompat = checkMethodCompatibility(dataSummary, assumptions, altMethod)
        alternativeResults.push({
          methodId: alt.method.id,
          methodName: alt.method.name,
          compatibility: altCompat,
          reason: alt.reason
        })
      }
    }
  }

  // Combine warnings
  const allWarnings = [
    ...(decisionResult.warnings ?? []),
    ...primaryCompatibility.reasons
  ]

  return {
    methodId: decisionResult.method.id,
    methodName: decisionResult.method.name,
    compatibility: primaryCompatibility,
    isUsable: primaryCompatibility.status !== 'incompatible',
    alternatives: alternativeResults,
    reasoning: decisionResult.reasoning,
    warnings: allWarnings
  }
}

/**
 * Get a human-readable reason for suggesting an alternative
 */
function getAlternativeReason(originalId: string, alternativeId: string): string {
  const reasons: Record<string, Record<string, string>> = {
    'two-sample-t': {
      'mann-whitney': '정규성 가정 불충족 시 사용',
      'welch-t': '등분산성 가정 불충족 시 사용'
    },
    'one-way-anova': {
      'kruskal-wallis': '정규성 가정 불충족 시 사용',
      'welch-anova': '등분산성 가정 불충족 시 사용'
    },
    'paired-t': {
      'wilcoxon-signed-rank': '정규성 가정 불충족 시 사용',
      'sign-test': '극단적인 이상치가 있을 때 사용'
    },
    'pearson-correlation': {
      'spearman-correlation': '비선형 관계 또는 정규성 불충족 시 사용'
    }
  }

  return reasons[originalId]?.[alternativeId] ?? '대안 방법'
}

/**
 * Check if a specific method is compatible with the data
 * Convenience function for quick checks
 */
export function isMethodCompatible(
  methodId: string,
  dataSummary: DataSummary,
  assumptions: AssumptionResults
): boolean {
  const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
  if (!method) return true // Unknown methods are assumed compatible

  const result = checkMethodCompatibility(dataSummary, assumptions, method)
  return result.status !== 'incompatible'
}

/**
 * Get compatibility status and reason for a specific method
 * Used by UI to show disabled state and tooltip
 */
export function getMethodCompatibilityInfo(
  methodId: string,
  dataSummary: DataSummary,
  assumptions: AssumptionResults
): { isCompatible: boolean; status: CompatibilityStatus; reason: string } {
  const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
  if (!method) {
    return { isCompatible: true, status: 'compatible', reason: '' }
  }

  const result = checkMethodCompatibility(dataSummary, assumptions, method)

  return {
    isCompatible: result.status !== 'incompatible',
    status: result.status,
    reason: result.reasons.join('; ')
  }
}

// ============================================================================
// Structural Compatibility (No Pyodide Required)
// ============================================================================

/**
 * Check structural compatibility only (variable types, sample size, group structure)
 * Does NOT check statistical assumptions - useful for immediate feedback on data upload
 *
 * This function can be called immediately when validationResults are available,
 * without waiting for Pyodide to load or assumption tests to complete.
 */
export function checkStructuralCompatibility(
  dataSummary: DataSummary,
  method: StatisticalMethodRequirements
): CompatibilityResult {
  const allReasons: string[] = []
  let score = 100

  // 1. Check variable requirements (hard requirement)
  const varCheck = checkVariableRequirements(dataSummary, method)
  if (!varCheck.passed) {
    allReasons.push(...varCheck.reasons)
    score -= 40
  }

  // 2. Check sample size (hard requirement)
  const sizeCheck = checkSampleSize(dataSummary, method)
  if (!sizeCheck.passed) {
    allReasons.push(...sizeCheck.reasons)
    score -= 30
  }

  // 3. Check group structure (hard requirement for some methods)
  const groupCheck = checkGroupStructure(dataSummary, method)
  if (!groupCheck.passed) {
    allReasons.push(...groupCheck.reasons)
    score -= 20
  }

  // Determine final status (no assumption checks)
  const status: CompatibilityStatus = allReasons.length > 0 ? 'incompatible' : 'compatible'

  // Find structural alternatives if incompatible
  const defaultAssumptions: AssumptionResults = {
    normality: 'unknown',
    homogeneity: 'unknown',
    independence: 'unknown'
  }
  const alternatives = status === 'incompatible'
    ? findAlternatives(method.id, dataSummary, defaultAssumptions)
    : undefined

  return {
    methodId: method.id,
    methodName: method.name,
    status,
    reasons: allReasons,
    score: Math.max(0, score),
    alternatives
  }
}

/**
 * Get structural compatibility map for all methods
 * Called immediately when validation data changes (before Pyodide/assumption tests)
 *
 * @param dataSummary - Data characteristics from validation
 * @param methods - Optional method list (defaults to all methods)
 * @returns Map of method ID to structural compatibility result
 */
export function getStructuralCompatibilityMap(
  dataSummary: DataSummary,
  methods: StatisticalMethodRequirements[] = STATISTICAL_METHOD_REQUIREMENTS
): Map<string, CompatibilityResult> {
  const results = methods.map(method => checkStructuralCompatibility(dataSummary, method))
  return new Map(results.map(r => [r.methodId, r]))
}

/**
 * Merge structural compatibility with assumption results
 * Called after Pyodide assumption tests complete
 *
 * @param structuralMap - Existing structural compatibility map
 * @param assumptions - Assumption test results
 * @param dataSummary - Data characteristics
 * @returns Updated compatibility map with assumption warnings
 */
export function mergeAssumptionResults(
  structuralMap: Map<string, CompatibilityResult>,
  assumptions: AssumptionResults,
  _dataSummary?: DataSummary // Reserved for future use (e.g., method-specific sample size warnings)
): Map<string, CompatibilityResult> {
  void _dataSummary // Suppress unused warning
  const mergedMap = new Map<string, CompatibilityResult>()

  for (const [methodId, structuralResult] of structuralMap) {
    // If already structurally incompatible, keep as is
    if (structuralResult.status === 'incompatible') {
      mergedMap.set(methodId, structuralResult)
      continue
    }

    // Find method definition and check assumptions
    const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
    if (!method) {
      mergedMap.set(methodId, structuralResult)
      continue
    }

    // Check assumptions and merge
    const assumptionCheck = checkAssumptions(assumptions, method)

    if (assumptionCheck.warnings.length > 0) {
      // Add assumption warnings to structurally compatible method
      mergedMap.set(methodId, {
        ...structuralResult,
        status: 'warning',
        reasons: [...structuralResult.reasons, ...assumptionCheck.warnings],
        assumptionViolations: assumptionCheck.violations,
        // Recalculate score with assumption penalties
        score: Math.max(0, (structuralResult.score ?? 100) - assumptionCheck.violations.length * 10)
      })
    } else {
      mergedMap.set(methodId, structuralResult)
    }
  }

  return mergedMap
}