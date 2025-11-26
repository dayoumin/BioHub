/**
 * Result Interpretation Engine
 *
 * 중앙 해석 엔진 - 분석 결과를 자연어로 설명
 *
 * Phase 1: 기존 로직 이동 (purpose 기반)
 * Phase 2: 신규 로직 추가 (method 기반)
 */

import type { AnalysisResult, EffectSizeInfo } from '@/types/smart-flow'

/**
 * 해석 기준 임계값 (통계학 표준)
 */
const THRESHOLDS = {
  P_VALUE: {
    ALPHA: 0.05,      // α = 0.05: 통계적 유의성 기준
    VERY_STRONG: 0.001 // p < 0.001: 매우 강력한 증거
  },
  CORRELATION: {
    WEAK: 0.1,      // |r| < 0.1: 거의 없는 상관
    MODERATE: 0.4,  // |r| >= 0.4: 중간 상관
    STRONG: 0.7     // |r| >= 0.7: 강한 상관
  },
  R_SQUARED: {
    LOW: 0.4,       // R² < 0.4: 낮은 설명력
    HIGH: 0.7       // R² >= 0.7: 높은 설명력
  },
  ALPHA: {
    POOR: 0.6,           // α < 0.6: 낮은 신뢰도
    QUESTIONABLE: 0.7,   // α < 0.7: 의문스러운 신뢰도
    ACCEPTABLE: 0.8,     // α < 0.8: 수용 가능한 신뢰도
    GOOD: 0.9            // α >= 0.9: 우수한 신뢰도
  },
  SILHOUETTE: {
    WEAK: 0.25,     // < 0.25: 인위적 구조
    FAIR: 0.5,      // >= 0.5: 합리적 구조
    STRONG: 0.7     // >= 0.7: 강한 구조
  },
  VARIANCE: {
    ACCEPTABLE: 0.5,  // >= 50%: 적절한 축소
    GOOD: 0.7         // >= 70%: 우수한 축소
  },
  EFFECT_SIZE: {
    COHENS_D: { SMALL: 0.2, MEDIUM: 0.5, LARGE: 0.8 },
    PEARSON_R: { WEAK: 0.3, MODERATE: 0.5 },
    ETA_SQUARED: { SMALL: 0.01, MEDIUM: 0.06, LARGE: 0.14 }
  }
} as const



export interface InterpretationResult {
  title: string
  summary: string
  statistical: string
  practical: string | null
}


/**
 * 포맷팅 Helper 함수들
 */

/**
 * p-value 포맷팅 (APA 표준 형식)
 * @example formatPValue(0.0001) → "< 0.001"
 * @example formatPValue(0.0234) → "= 0.023"
 */
function formatPValue(p: number): string {
  // Edge case 방어: NaN, Infinity, 범위 벗어남
  if (!isFinite(p) || p < 0 || p > 1) return 'N/A'

  if (p < THRESHOLDS.P_VALUE.VERY_STRONG) return '< 0.001'
  return `= ${p.toFixed(3)}`
}

/**
 * 퍼센트 포맷팅
 * @example formatPercent(0.456, 1) → "45.6%"
 */
function formatPercent(value: number, decimals: number = 1): string {
  // Edge case 방어: NaN, Infinity
  if (!isFinite(value)) return 'N/A'

  // [0, 1] 범위로 클램핑 (R², 상관계수 등은 항상 이 범위)
  const clamped = Math.max(0, Math.min(1, value))
  return `${(clamped * 100).toFixed(decimals)}%`
}

/**
 * 통계적 유의성 판단
 */
function isSignificant(p: number): boolean {
  // Edge case: 음수/NaN/Infinity는 무조건 false (유의하지 않음)
  if (!Number.isFinite(p) || p < 0) return false
  return p < THRESHOLDS.P_VALUE.ALPHA
}

/**
 * 메인 해석 함수
 *
 * @param results - 분석 결과 (AnalysisResult)
 * @param purpose - 분석 목적 (optional, Smart Flow에서만 전달)
 * @returns 해석 결과 또는 null (패널 숨김)
 */
export function getInterpretation(
  results: AnalysisResult,
  purpose?: string
): InterpretationResult | null {
  // Phase 1: 기존 로직 (purpose 기반) - 우선순위 높음
  if (purpose) {
    const byPurpose = getInterpretationByPurpose(results, purpose)
    if (byPurpose) return byPurpose
  }

  // Phase 2: 신규 로직 (method 기반) - fallback
  return getInterpretationByMethod(results)
}

/**
 * Phase 1: 목적 기반 해석 (기존 로직)
 *
 * ResultsActionStep.tsx의 기존 코드를 그대로 이동
 */
function getInterpretationByPurpose(
  results: AnalysisResult,
  purpose: string
): InterpretationResult | null {
  const purposeLower = purpose.toLowerCase()

  // ===== 1. 그룹 비교 (compare, difference, 비교, 차이) =====
  if (purposeLower.includes('비교') || purposeLower.includes('차이') || purposeLower.includes('compare') || purposeLower.includes('difference')) {
    // ✅ Fix: 3개 이상 그룹일 때는 숨김 (ANOVA는 사후 검정에서 처리)
    if (results.groupStats?.length === 2) {
      const group1 = results.groupStats[0]
      const group2 = results.groupStats[1]
      const diff = group1.mean - group2.mean

      return {
        title: '그룹 비교 결과',
        summary: `${group1.name || '그룹 1'} 평균(${group1.mean.toFixed(2)})이 ${group2.name || '그룹 2'} 평균(${group2.mean.toFixed(2)})보다 ${Math.abs(diff).toFixed(2)}점 ${diff > 0 ? '높습니다' : '낮습니다'}.`,
        statistical: isSignificant(results.pValue)
          ? `통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
          : `통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
        practical: results.effectSize
          ? `실질적 효과 크기는 ${interpretEffectSize(results.effectSize)}입니다.`
          : null
      }
    }
  }

  // ===== 2. 상관관계 (relationship, correlation, 관계, 상관) =====
  if (purposeLower.includes('관계') || purposeLower.includes('상관') || purposeLower.includes('relationship') || purposeLower.includes('correlation')) {
    // ✅ Fix: r을 [-1, 1]로 클램핑 + 약한 상관(~0) 처리
    const rawR = results.statistic
    const r = Math.max(-1, Math.min(1, rawR)) // Clamp to [-1, 1]
    const absR = Math.abs(r)

    // 약한 상관 (|r| < 0.1) 처리
    if (absR < THRESHOLDS.CORRELATION.WEAK) {
      return {
        title: '변수 간 관계 분석',
        summary: `X와 Y 사이에 뚜렷한 상관관계가 발견되지 않았습니다 (r=${r.toFixed(3)}).`,
        statistical: `상관계수가 0에 가까워 실질적 관계가 거의 없습니다.`,
        practical: null
      }
    }

    const direction = r > 0 ? '양의' : '음의'
    const strength = absR >= THRESHOLDS.CORRELATION.STRONG ? '강한' : absR >= THRESHOLDS.CORRELATION.MODERATE ? '중간' : '약한'

    return {
      title: '변수 간 관계 분석',
      summary: `X가 증가할 때 Y는 ${r > 0 ? '함께 증가' : '반대로 감소'}하는 경향이 있습니다 (r=${r.toFixed(3)}).`,
      statistical: isSignificant(results.pValue)
        ? `${strength} ${direction} 상관관계가 통계적으로 유의합니다 (p ${formatPValue(results.pValue)}).`
        : `상관관계가 통계적으로 유의하지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: `상관계수 r=${r.toFixed(3)} → X 변동의 약 ${formatPercent(r * r)}가 Y 변동과 관련됩니다.`
    }
  }

  // ===== 3. 예측/회귀 (prediction, regression, 예측, 회귀) =====
  if (purposeLower.includes('예측') || purposeLower.includes('회귀') || purposeLower.includes('prediction') || purposeLower.includes('regression')) {
    // ✅ Fix: coefficients와 R²가 없으면 패널 숨김 (0% 오해 방지)
    const hasCoefficients = results.coefficients && results.coefficients.length > 1
    const hasRSquared = results.additional?.rSquared !== undefined && results.additional.rSquared !== null

    if (!hasCoefficients || !hasRSquared) {
      return null // 회귀 데이터 없음 → 패널 숨김
    }

    const coef = results.coefficients?.[1]?.value ?? 0
    const rSquared = results.additional?.rSquared ?? 0
    // Edge case: R² 클램핑 (formatPercent와 동일 로직)
    const clampedR2 = Number.isFinite(rSquared)
      ? Math.max(0, Math.min(1, rSquared))
      : 0

    return {
      title: '예측 모델 결과',
      summary: `독립변수가 1단위 증가할 때 종속변수는 ${coef.toFixed(3)}만큼 변합니다.`,
      statistical: `모델 설명력(R²) = ${formatPercent(rSquared)} - ${clampedR2 >= THRESHOLDS.R_SQUARED.HIGH ? '높은 설명력' :
        clampedR2 >= THRESHOLDS.R_SQUARED.LOW ? '중간 설명력' :
          '낮은 설명력'
        }`,
      practical: `이 모델로 종속변수 변동의 ${formatPercent(rSquared)}를 예측할 수 있습니다.`
    }
  }

  return null // purpose 매칭 실패
}

/**
 * Phase 2: 방법 기반 해석 (신규 로직)
 *
 * 34개 미커버 통계 방법 처리
 */
function getInterpretationByMethod(
  results: AnalysisResult
): InterpretationResult | null {
  const methodLower = normalizeMethod(results.method)

  // ===== 1. 다집단 비교 (ANOVA 변형 먼저, 일반 ANOVA 나중에) =====

  // Two-way ANOVA (이원분산분석)
  // 정규화 후: 'twowayanova', '2wayanova', '이원분산분석', '2원분산분석' 모두 매칭
  if (methodLower.includes('twoway') ||
    methodLower.includes('2way') ||
    methodLower.includes('이원분산분석') ||
    methodLower.includes('2원분산분석')) {
    return {
      title: '이원분산분석 결과',
      summary: `두 독립변수(요인)가 종속변수에 미치는 주효과와 상호작용 효과를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 효과가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 효과가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '주효과 또는 상호작용 효과를 해석하고, 필요 시 사후 검정을 수행하세요.'
        : '두 요인 모두 종속변수에 영향을 주지 않습니다.'
    }
  }

  // Repeated Measures ANOVA (반복측정 분산분석)
  // 정규화 후: 'repeatedmeasures', '반복측정', 'within' 모두 매칭
  if (methodLower.includes('repeatedmeasures') ||
    methodLower.includes('반복측정') ||
    methodLower.includes('within')) {
    return {
      title: '반복측정 분산분석 결과',
      summary: `동일 개체에서 3회 이상 측정한 값의 평균 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `시점 간 통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `시점 간 통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '사후 검정(예: Bonferroni)을 통해 어느 시점이 다른지 확인하세요.'
        : '측정 시점에 따른 유의한 변화가 없습니다.'
    }
  }

  // ANCOVA (공분산분석)
  // 정규화 후: 'ancova', '공분산분석', 'analysisofcovariance' 모두 매칭
  if (methodLower.includes('ancova') ||
    methodLower.includes('공분산분석') ||
    methodLower.includes('analysisofcovariance')) {
    return {
      title: '공분산분석 결과',
      summary: `공변량(covariate)을 통제한 후 집단 간 평균 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `공변량 보정 후 집단 간 통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `공변량 보정 후 집단 간 통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '공변량의 영향을 제거한 순수한 집단 효과가 존재합니다.'
        : '공변량을 통제해도 집단 간 차이가 없습니다.'
    }
  }

  // MANOVA (다변량 분산분석)
  // 정규화 후: 'manova', '다변량', 'multivariateanova' 모두 매칭
  if (methodLower.includes('manova') ||
    methodLower.includes('다변량') ||
    methodLower.includes('multivariateanova')) {
    return {
      title: '다변량 분산분석 결과',
      summary: `여러 종속변수를 동시에 고려하여 집단 간 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `다변량 차원에서 통계적으로 유의한 집단 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `다변량 차원에서 통계적으로 유의한 집단 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '개별 종속변수에 대한 일원분산분석(follow-up ANOVA)을 수행하세요.'
        : '모든 종속변수에서 집단 간 차이가 없습니다.'
    }
  }

  // ========================================
  // Phase 3: 회귀 변형 (5개)
  // ========================================

  // Poisson Regression (포아송 회귀)
  // 정규화 후: 'poissonregression', '포아송회귀', '포아송' 모두 매칭
  if (methodLower.includes('poisson') || methodLower.includes('포아송')) {
    const hasCoefficients = results.coefficients && results.coefficients.length > 0
    const modelInfo = results.additional as { pseudo_r_squared_mcfadden?: number; aic?: number }
    const pseudoR2 = modelInfo?.pseudo_r_squared_mcfadden

    // 예측변수 필터링 (intercept/const 제외, case-insensitive)
    const predictors = hasCoefficients
      ? results.coefficients!.filter(c =>
        c.name.toLowerCase() !== 'intercept' &&
        c.name.toLowerCase() !== 'const'
      )
      : []

    // 유의한 예측변수 개수 카운트
    const significantPredictors = predictors.filter(c =>
      c.pvalue !== undefined && isSignificant(c.pvalue)
    ).length

    return {
      title: '포아송 회귀 결과',
      summary: `카운트 데이터를 예측하는 포아송 회귀 모형을 적합했습니다${predictors.length > 0 ? ` (예측변수 ${predictors.length}개)` : ''}.`,
      statistical: hasCoefficients && significantPredictors > 0
        ? `${significantPredictors}개 예측변수가 카운트 결과에 통계적으로 유의한 영향을 미칩니다 (p<0.05).${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}`
        : `유의한 예측변수가 없습니다.${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}`,
      practical: hasCoefficients && significantPredictors > 0
        ? 'IRR (Incidence Rate Ratio) 값을 통해 각 예측변수의 효과 크기를 확인하세요. IRR > 1은 양의 효과, IRR < 1은 음의 효과를 의미합니다.'
        : '예측변수가 카운트 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.'
    }
  }

  // Ordinal Regression (순서형 회귀)
  // 정규화 후: 'ordinalregression', '순서형회귀', '순서형' 모두 매칭
  if (methodLower.includes('ordinal') || methodLower.includes('순서형')) {
    const hasCoefficients = results.coefficients && results.coefficients.length > 0
    const modelInfo = results.additional as { pseudo_r_squared?: number; aic?: number }
    const pseudoR2 = modelInfo?.pseudo_r_squared

    // 예측변수 필터링 (intercept/const 제외, case-insensitive)
    const predictors = hasCoefficients
      ? results.coefficients!.filter(c =>
        c.name.toLowerCase() !== 'intercept' &&
        c.name.toLowerCase() !== 'const'
      )
      : []

    // 유의한 예측변수 개수 카운트
    const significantPredictors = predictors.filter(c =>
      c.pvalue !== undefined && isSignificant(c.pvalue)
    ).length

    return {
      title: '순서형 회귀 결과',
      summary: `순서형 종속변수를 예측하는 비례 오즈 모형(Proportional Odds Model)을 적합했습니다${predictors.length > 0 ? ` (예측변수 ${predictors.length}개)` : ''}.`,
      statistical: hasCoefficients && significantPredictors > 0
        ? `${significantPredictors}개 예측변수가 순서형 결과에 통계적으로 유의한 영향을 미칩니다 (p<0.05).${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}`
        : `유의한 예측변수가 없습니다.${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}`,
      practical: hasCoefficients && significantPredictors > 0
        ? '오즈비(Odds Ratio)를 통해 각 예측변수가 상위 범주로 이동할 확률에 미치는 영향을 확인하세요. OR > 1은 양의 효과, OR < 1은 음의 효과를 의미합니다.'
        : '예측변수가 순서형 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.'
    }
  }

  // Logistic Regression (로지스틱 회귀)
  // 정규화 후: 'logistic', '로지스틱', 'binary' 모두 매칭
  if (methodLower.includes('logistic') || methodLower.includes('로지스틱') || methodLower.includes('binary')) {
    const hasCoefficients = results.coefficients && results.coefficients.length > 0
    const modelInfo = results.additional as { pseudo_r_squared?: number; accuracy?: number; aic?: number }
    const pseudoR2 = modelInfo?.pseudo_r_squared
    const accuracy = modelInfo?.accuracy

    // 예측변수 필터링 (intercept/const 제외, case-insensitive)
    const predictors = hasCoefficients
      ? results.coefficients!.filter(c =>
        c.name.toLowerCase() !== 'intercept' &&
        c.name.toLowerCase() !== 'const'
      )
      : []

    // 유의한 예측변수 개수 카운트
    const significantPredictors = predictors.filter(c =>
      c.pvalue !== undefined && isSignificant(c.pvalue)
    ).length

    return {
      title: '로지스틱 회귀 결과',
      summary: `이분형 종속변수(0/1)를 예측하는 로지스틱 회귀 모형을 적합했습니다${predictors.length > 0 ? ` (예측변수 ${predictors.length}개)` : ''}.`,
      statistical: hasCoefficients && significantPredictors > 0
        ? `${significantPredictors}개 예측변수가 결과 확률에 통계적으로 유의한 영향을 미칩니다 (p<0.05).${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}${accuracy ? ` 정확도: ${formatPercent(accuracy)}` : ''}`
        : `유의한 예측변수가 없습니다.${pseudoR2 ? ` 모형 설명력: ${formatPercent(pseudoR2)}` : ''}`,
      practical: hasCoefficients && significantPredictors > 0
        ? '오즈비(Odds Ratio)를 통해 각 예측변수가 결과 발생 확률에 미치는 영향을 확인하세요. OR > 1은 양의 효과, OR < 1은 음의 효과를 의미합니다.'
        : '예측변수가 결과에 유의한 영향을 주지 않습니다. 모형 재검토가 필요합니다.'
    }
  }

  // Stepwise Regression (단계적 회귀)
  // 정규화 후: 'stepwise', '단계적', 'forward', 'backward' 모두 매칭
  if (methodLower.includes('stepwise') || methodLower.includes('단계적') || methodLower.includes('forward') || methodLower.includes('backward')) {
    const hasCoefficients = results.coefficients && results.coefficients.length > 0
    const modelInfo = results.additional as { rSquared?: number; adjRSquared?: number; adjustedRSquared?: number; finalVariables?: string[] }
    const rSquared = modelInfo?.rSquared
    // Bug fix: Support both adjRSquared and adjustedRSquared keys
    const adjRSquared = modelInfo?.adjRSquared ?? modelInfo?.adjustedRSquared
    const selectedVars = modelInfo?.finalVariables?.length

    // 예측변수 필터링 (intercept/const 제외, case-insensitive)
    const predictors = hasCoefficients
      ? results.coefficients!.filter(c =>
        c.name.toLowerCase() !== 'intercept' &&
        c.name.toLowerCase() !== 'const'
      )
      : []

    // 최종 선택된 유의한 예측변수 개수
    const significantPredictors = predictors.filter(c =>
      c.pvalue !== undefined && isSignificant(c.pvalue)
    ).length

    return {
      title: '단계적 회귀 결과',
      summary: `단계적 변수 선택 방법을 통해 최적의 예측 모형을 구축했습니다${selectedVars ? ` (최종 선택 변수: ${selectedVars}개)` : ''}.`,
      statistical: hasCoefficients && significantPredictors > 0
        ? `${significantPredictors}개 예측변수가 최종 모형에 포함되었습니다 (p<0.05).${rSquared ? ` R² = ${formatPercent(rSquared)}` : ''}${adjRSquared ? ` (adj. R² = ${formatPercent(adjRSquared)})` : ''}`
        : `최종 모형에 유의한 예측변수가 없습니다.${rSquared ? ` R² = ${formatPercent(rSquared)}` : ''}`,
      practical: hasCoefficients && significantPredictors > 0
        ? '선택된 변수들의 회귀계수를 확인하여 각 변수의 상대적 중요도를 파악하세요. 다중공선성(VIF)도 확인이 필요합니다.'
        : '선택된 변수가 없거나 모형 설명력이 낮습니다. 다른 예측변수를 고려하거나 비선형 모형을 시도하세요.'
    }
  }

  // Partial Correlation (편상관)
  // 정규화 후: 'partial', '편상관' 모두 매칭
  if (methodLower.includes('partial') || methodLower.includes('편상관')) {
    const r = results.statistic ?? 0
    const clampedR = Math.max(-1, Math.min(1, r))
    const absR = Math.abs(clampedR)
    const rSquared = absR * absR

    let strength = ''
    if (absR < THRESHOLDS.CORRELATION.WEAK) strength = '매우 약한'
    else if (absR < THRESHOLDS.CORRELATION.MODERATE) strength = '약한'
    else if (absR < THRESHOLDS.CORRELATION.STRONG) strength = '중간 강도의'
    else strength = '강한'

    const direction = clampedR > 0 ? '양의' : '음의'

    return {
      title: '편상관 분석 결과',
      summary: `통제변수의 영향을 제거한 후 두 변수 간의 순수한 관계를 분석했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통제변수를 고려한 편상관계수는 ${clampedR.toFixed(3)}으로, 통계적으로 유의합니다 (p ${formatPValue(results.pValue)}).`
        : `통제변수를 고려한 편상관계수는 ${clampedR.toFixed(3)}으로, 통계적으로 유의하지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? `${strength} ${direction} 관계가 있습니다 (r² = ${formatPercent(rSquared)}). 이는 통제변수의 영향을 제거했을 때의 순수한 관계입니다.`
        : '통제변수의 영향을 제거하면 두 변수 간 유의한 관계가 없습니다.'
    }
  }

  // ===== Phase 4: Advanced Analytics (고급 분석) =====

  // Response Surface Analysis (반응표면 분석) - 먼저 체크 (Dose-Response와 'response' 중복 방지)
  if (methodLower.includes('responsesurface') || methodLower.includes('반응표면') || methodLower.includes('rsm')) {
    const modelInfo = results.additional as {
      rSquared?: number
      adjRSquared?: number
      adjustedRSquared?: number
      model_type?: string
    }
    const rSquared = modelInfo?.rSquared
    const adjRSquared = modelInfo?.adjRSquared ?? modelInfo?.adjustedRSquared
    const modelType = modelInfo?.model_type || '2차 모델'

    return {
      title: '반응표면 분석 결과',
      summary: `${modelType}을 사용하여 반응표면을 구축했습니다${rSquared ? ` (R² = ${formatPercent(rSquared)})` : ''}.`,
      statistical: rSquared && rSquared > 0.8
        ? `모델이 매우 잘 적합합니다 (R² = ${formatPercent(rSquared)}${adjRSquared ? `, adj. R² = ${formatPercent(adjRSquared)}` : ''}).`
        : rSquared && rSquared > 0.6
          ? `모델이 적절히 적합합니다 (R² = ${formatPercent(rSquared)}${adjRSquared ? `, adj. R² = ${formatPercent(adjRSquared)}` : ''}).`
          : `모델 적합도가 낮습니다${rSquared ? ` (R² = ${formatPercent(rSquared)})` : ''}. 1차 또는 3차 모델을 시도하세요.`,
      practical: rSquared && rSquared > 0.8
        ? '최적점(saddle point, maximum, minimum)을 찾아 공정 조건을 최적화할 수 있습니다. 등고선 플롯과 3D 표면 플롯을 확인하세요.'
        : rSquared && rSquared > 0.6
          ? '모델을 참고할 수 있지만, 추가 실험점을 수집하여 모델을 개선하는 것이 좋습니다.'
          : '교호작용 항이나 2차 항 포함 여부를 재검토하거나, 실험 설계를 조정하세요.'
    }
  }

  // Dose-Response Analysis (용량-반응 분석)
  if (methodLower.includes('dose') || methodLower.includes('용량') || methodLower.includes('response curve')) {
    const modelInfo = results.additional as {
      model?: string
      r_squared?: number
      aic?: number
      ec50?: number
      ic50?: number
      hill_slope?: number
    }
    const rSquared = modelInfo?.r_squared
    const ec50 = modelInfo?.ec50
    const ic50 = modelInfo?.ic50
    const modelType = modelInfo?.model || '용량-반응 모델'

    return {
      title: '용량-반응 분석 결과',
      summary: `${modelType} 곡선을 적합하여 용량-반응 관계를 분석했습니다${rSquared ? ` (R² = ${formatPercent(rSquared)})` : ''}.`,
      statistical: rSquared && rSquared > 0.8
        ? `모델이 데이터에 잘 적합합니다 (R² = ${formatPercent(rSquared)}).${ec50 ? ` EC50 = ${ec50.toFixed(3)}` : ''}${ic50 ? ` IC50 = ${ic50.toFixed(3)}` : ''}`
        : rSquared && rSquared > 0.5
          ? `모델이 데이터에 적절히 적합합니다 (R² = ${formatPercent(rSquared)}).${ec50 ? ` EC50 = ${ec50.toFixed(3)}` : ''}`
          : `모델 적합도가 낮습니다${rSquared ? ` (R² = ${formatPercent(rSquared)})` : ''}. 다른 모델을 시도하세요.`,
      practical: rSquared && rSquared > 0.8
        ? `EC50/IC50 값을 활용하여 최적 용량을 결정할 수 있습니다. 모델 파라미터의 신뢰구간도 확인하세요.`
        : rSquared && rSquared > 0.5
          ? `모델 파라미터를 참고하되, 예측값에 대한 신뢰도는 제한적입니다.`
          : '다른 용량-반응 모델(4PL, Weibull, Hill 등)을 시도하거나 데이터 품질을 확인하세요.'
    }
  }

  // Mixed Model (혼합 모형)
  if (methodLower.includes('mixed') || methodLower.includes('혼합') || methodLower.includes('lme') || methodLower.includes('lmm')) {
    const hasCoefficients = results.coefficients && results.coefficients.length > 0
    const modelInfo = results.additional as {
      marginal_r_squared?: number
      conditional_r_squared?: number
      icc?: number
    }
    const marginalR2 = modelInfo?.marginal_r_squared
    const conditionalR2 = modelInfo?.conditional_r_squared
    const icc = modelInfo?.icc

    // 유의한 고정효과 개수 (Intercept 제외)
    const fixedEffects = hasCoefficients
      ? results.coefficients!.filter(c =>
        c.name.toLowerCase() !== 'intercept' &&
        c.name.toLowerCase() !== 'const'
      )
      : []

    const significantEffects = fixedEffects.filter(c =>
      c.pvalue !== undefined && isSignificant(c.pvalue)
    ).length

    return {
      title: '혼합 모형 결과',
      summary: `고정효과와 무선효과를 모두 고려한 혼합 모형을 적합했습니다${fixedEffects.length > 0 ? ` (고정효과 ${fixedEffects.length}개)` : ''}.`,
      statistical: hasCoefficients && significantEffects > 0
        ? `${significantEffects}개 고정효과가 통계적으로 유의합니다 (p<0.05).${marginalR2 ? ` 고정효과 설명력: ${formatPercent(marginalR2)}` : ''}${conditionalR2 ? `, 전체 모델 설명력: ${formatPercent(conditionalR2)}` : ''}`
        : `유의한 고정효과가 없습니다.${marginalR2 ? ` 고정효과 설명력: ${formatPercent(marginalR2)}` : ''}`,
      practical: hasCoefficients && significantEffects > 0
        ? `ICC(급내상관계수)${icc ? ` = ${formatPercent(icc)}` : ''}를 확인하여 무선효과의 중요성을 평가하세요. 고정효과 계수로 예측 모델을 구축할 수 있습니다.`
        : '무선효과만으로도 충분한 설명력이 있는지 확인하거나, 추가 고정효과 변수를 고려하세요.'
    }
  }

  // Power Analysis (검정력 분석)
  if (methodLower.includes('power') || methodLower.includes('검정력') || (methodLower.includes('표본') && (methodLower.includes('크기') || methodLower.includes('수')))) {
    const powerInfo = results.additional as {
      analysisType?: string
      sampleSize?: number
      power?: number
      effectSize?: number
      alpha?: number
    }
    const analysisType = powerInfo?.analysisType || 'a-priori'
    const sampleSize = powerInfo?.sampleSize
    const power = powerInfo?.power
    const effectSize = powerInfo?.effectSize
    const alpha = powerInfo?.alpha || 0.05

    if (analysisType === 'a-priori' && sampleSize) {
      // A-priori: 필요 표본 크기 계산
      return {
        title: '검정력 분석 결과 (A-priori)',
        summary: `원하는 검정력${power ? ` (${(power * 100).toFixed(0)}%)` : ''}을 달성하기 위한 표본 크기를 계산했습니다.`,
        statistical: `효과크기 ${effectSize?.toFixed(2) || 'medium'}, 유의수준 α=${alpha}일 때, 그룹당 최소 ${sampleSize}명이 필요합니다.`,
        practical: sampleSize > 100
          ? `표본 크기가 큽니다 (${sampleSize}명). 효과크기가 작거나, 요구 검정력이 높은 경우입니다. 연구 실행 가능성을 재검토하세요.`
          : `표본 ${sampleSize}명을 수집하되, 탈락률 10-20%를 고려하여 여유있게 모집하세요.`
      }
    } else if (analysisType === 'post-hoc' && power !== undefined) {
      // Post-hoc: 달성된 검정력 계산
      return {
        title: '검정력 분석 결과 (Post-hoc)',
        summary: `현재 표본 크기${sampleSize ? ` (${sampleSize}명)` : ''}로 달성 가능한 검정력을 계산했습니다.`,
        statistical: `효과크기 ${effectSize?.toFixed(2) || 'medium'}, 유의수준 α=${alpha}일 때, 검정력은 ${(power * 100).toFixed(1)}%입니다.`,
        practical: power >= 0.8
          ? `검정력이 충분합니다 (${(power * 100).toFixed(1)}% ≥ 80%). 통계적 검정 결과를 신뢰할 수 있습니다.`
          : power >= 0.5
            ? `검정력이 낮습니다 (${(power * 100).toFixed(1)}% < 80%). 표본 크기를 늘리거나 더 큰 효과크기를 기대할 수 있는 경우만 진행하세요.`
            : `검정력이 매우 낮습니다 (${(power * 100).toFixed(1)}% < 50%). 추가 표본 수집이 필수적입니다.`
      }
    } else {
      // Compromise 또는 기타
      return {
        title: '검정력 분석 결과',
        summary: `검정력, 표본 크기, 효과크기, 유의수준 간의 균형을 분석했습니다.`,
        statistical: sampleSize && power
          ? `표본 크기 ${sampleSize}명일 때 검정력은 ${(power * 100).toFixed(1)}%입니다.`
          : '검정력 분석 결과를 확인하세요.',
        practical: '검정력 곡선을 참고하여 연구 설계를 최적화하세요. 실행 가능성과 통계적 검정력 간의 균형을 맞추는 것이 중요합니다.'
      }
    }
  }

  // Discriminant Analysis (판별분석)
  // 정규화 후: 'discriminant', '판별', 'lda', 'qda' 모두 매칭
  if (methodLower.includes('discriminant') || methodLower.includes('판별') || methodLower.includes('lda') || methodLower.includes('qda')) {
    const discriminantInfo = results.additional as {
      accuracy?: number
      selectedFunctions?: number
      totalVariance?: number
      equalityTests?: {
        wilksLambda?: { statistic?: number; pValue?: number; significant?: boolean }
        boxM?: { statistic?: number; pValue?: number; significant?: boolean }
      }
    }

    // Support both structures: discriminantInfo.equalityTests and direct additional fields
    const accuracy = discriminantInfo?.accuracy ?? results.additional?.accuracy
    const numFunctions = discriminantInfo?.selectedFunctions ?? results.additional?.selectedFunctions
    const totalVariance = discriminantInfo?.totalVariance
    const wilksLambda = discriminantInfo?.equalityTests?.wilksLambda ?? results.additional?.wilksLambda
    const boxM = discriminantInfo?.equalityTests?.boxM ?? results.additional?.boxM

    // 정확도 기반 해석 (통계학 표준: 70%/50% 기준)
    let accuracyLevel: 'high' | 'moderate' | 'low' = 'moderate'
    if (accuracy !== undefined) {
      if (accuracy >= 0.70) accuracyLevel = 'high'
      else if (accuracy < 0.50) accuracyLevel = 'low'
    }

    // Wilks' Lambda 유의성 체크 (낮을수록 그룹 간 차이 큼)
    const wilksSignificant = wilksLambda?.significant ?? (wilksLambda?.pValue !== undefined && wilksLambda.pValue < 0.05)
    const boxMSignificant = boxM?.significant ?? (boxM?.pValue !== undefined && boxM.pValue < 0.05)

    return {
      title: '판별분석 결과',
      summary: accuracy !== undefined
        ? `판별함수${numFunctions ? ` ${numFunctions}개` : ''}를 사용하여 ${(accuracy * 100).toFixed(1)}%의 분류 정확도를 달성했습니다${totalVariance ? ` (전체 분산의 ${(totalVariance * 100).toFixed(1)}% 설명)` : ''}.`
        : `판별분석을 통해 그룹 분류 모형을 적합했습니다.`,
      statistical: wilksLambda?.pValue !== undefined
        ? wilksSignificant
          ? `Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 있습니다 (p ${formatPValue(wilksLambda.pValue)}). 판별함수가 그룹을 효과적으로 구분합니다.${boxMSignificant ? ' 단, Box\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었을 수 있습니다.' : ''}`
          : `Wilks' Lambda 검정 결과 그룹 간 통계적으로 유의한 차이가 없습니다 (p ${formatPValue(wilksLambda.pValue)}). 판별함수의 유효성이 낮습니다.${boxMSignificant ? ' 또한 Box\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었습니다.' : ''}`
        : accuracy !== undefined
          ? `분류 정확도는 ${(accuracy * 100).toFixed(1)}%입니다.${boxMSignificant ? ' Box\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었을 수 있습니다.' : ''}`
          : `판별분석이 완료되었습니다.${boxMSignificant ? ' Box\'s M 검정이 유의하여 공분산 행렬 동질성 가정이 위배되었습니다.' : ''}`,
      practical: accuracy !== undefined
        ? (accuracyLevel === 'high'
          ? `정확도가 높습니다 (${(accuracy * 100).toFixed(1)}% ≥ 70%). 판별함수를 새로운 데이터 분류에 사용할 수 있습니다. 판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다.`
          : accuracyLevel === 'moderate'
            ? `정확도가 중간 수준입니다 (${(accuracy * 100).toFixed(1)}%). 추가 변수를 포함하거나 변수 변환(로그, 다항식 등)을 고려하세요. 혼동행렬(confusion matrix)에서 오분류 패턴을 분석하세요.`
            : `정확도가 낮습니다 (${(accuracy * 100).toFixed(1)}% < 50%). 판별 변수를 재검토하거나, 비선형 방법(QDA, 머신러닝)을 고려하세요.`)
        : '판별계수(discriminant coefficients)가 큰 변수가 주요 판별변수입니다. 혼동행렬로 분류 성능을 평가하세요.'
    }
  }


  // ===== Phase 5: 기타 분석 (Descriptive, Proportion, One-sample t-test, Explore, Means Plot) =====

  // 1. Descriptive Statistics (기술통계)
  if (methodLower.includes('descriptive') || methodLower.includes('기술통계')) {
    const mean = results.additional?.mean
    const std = results.additional?.std
    const skewness = results.additional?.skewness
    const kurtosis = results.additional?.kurtosis
    const n = results.additional?.n

    if (typeof mean === 'number' && typeof std === 'number' && typeof n === 'number') {
      // 변동계수 (Coefficient of Variation) - 제로 평균 가드
      const EPS = 1e-10
      if (Math.abs(mean) < EPS) {
        // 평균이 0에 가까우면 CV 대신 표준편차 사용
        return {
          title: '기술통계량 요약',
          summary: `평균 ${mean.toFixed(2)}, 표준편차 ${std.toFixed(2)} (n=${n})`,
          statistical: '평균이 0에 가까워 변동계수를 계산할 수 없습니다.',
          practical: std < 1
            ? '표준편차가 1 미만으로 변동성이 낮습니다.'
            : std < 5
              ? '표준편차가 5 미만으로 변동성이 중간 수준입니다.'
              : '표준편차가 5 이상으로 변동성이 높습니다.'
        }
      }
      const cv = (std / Math.abs(mean)) * 100

      // 왜도 해석
      let skewnessInterpretation = ''
      if (typeof skewness === 'number') {
        if (Math.abs(skewness) < 0.5) {
          skewnessInterpretation = '분포가 대칭적입니다 (정규분포에 가까움).'
        } else if (skewness > 0.5) {
          skewnessInterpretation = '양의 왜도: 오른쪽 꼬리가 깁니다 (큰 값들이 드물게 존재).'
        } else {
          skewnessInterpretation = '음의 왜도: 왼쪽 꼬리가 깁니다 (작은 값들이 드물게 존재).'
        }
      }

      // 첨도 해석
      let kurtosisInterpretation = ''
      if (typeof kurtosis === 'number') {
        if (Math.abs(kurtosis) < 0.5) {
          kurtosisInterpretation = '정규분포와 유사한 꼬리 두께입니다.'
        } else if (kurtosis > 0.5) {
          kurtosisInterpretation = '양의 첨도: 극단값이 많습니다 (두꺼운 꼬리).'
        } else {
          kurtosisInterpretation = '음의 첨도: 극단값이 적습니다 (얇은 꼬리).'
        }
      }

      return {
        title: '기술통계량 요약',
        summary: `평균 ${mean.toFixed(2)}, 표준편차 ${std.toFixed(2)}, 변동계수 ${cv.toFixed(1)}% (n=${n})`,
        statistical: [skewnessInterpretation, kurtosisInterpretation].filter(s => s).join(' '),
        practical: cv < 15
          ? '데이터 변동성이 낮습니다 (일관적).'
          : cv < 30
            ? '데이터 변동성이 중간 수준입니다.'
            : '데이터 변동성이 높습니다 (이질적).'
      }
    }
  }

  // 2. Proportion Test (비율 검정)
  if (methodLower.includes('proportion') || methodLower.includes('비율')) {
    const sampleProp = results.additional?.sampleProportion
    const nullProp = results.additional?.nullProportion
    const pValue = results.additional?.pValueExact ?? results.pValue

    if (typeof sampleProp === 'number' && typeof nullProp === 'number' && typeof pValue === 'number') {
      const propDiff = (sampleProp - nullProp) * 100
      const propDiffAbs = Math.abs(propDiff)

      return {
        title: '비율 검정 결과',
        summary: `관찰 비율 ${(sampleProp * 100).toFixed(1)}% vs 귀무 비율 ${(nullProp * 100).toFixed(1)}% (차이: ${propDiffAbs.toFixed(1)}%p)`,
        statistical: isSignificant(pValue)
          ? `관찰 비율이 귀무 비율과 통계적으로 다릅니다 (p ${formatPValue(pValue)}).`
          : `관찰 비율이 귀무 비율과 통계적으로 유사합니다 (p ${formatPValue(pValue)}).`,
        practical: propDiffAbs < 5
          ? '실질적 차이가 매우 작습니다.'
          : propDiffAbs < 10
            ? '실질적 차이가 작은 편입니다.'
            : '실질적 차이가 큽니다.'
      }
    }
  }

  // 3. One-sample t-test (일표본 t검정) - Proportion Test보다 뒤에 체크
  if ((methodLower.includes('one') && methodLower.includes('sample') && !methodLower.includes('proportion'))
    || methodLower.includes('일표본')) {
    const mean = results.additional?.mean
    const testValue = results.additional?.testValue ?? results.additional?.mu
    const pValue = results.pValue

    if (typeof mean === 'number' && typeof testValue === 'number' && typeof pValue === 'number') {
      const diff = mean - testValue
      const diffAbs = Math.abs(diff)

      // 효과 크기 (Cohen's d) 계산 시도
      let effectSizeInfo = ''
      const cohensD = results.additional?.cohensD ?? results.effectSize
      if (typeof cohensD === 'number') {
        const dAbs = Math.abs(cohensD)
        effectSizeInfo = dAbs < 0.2
          ? '(효과 크기: 매우 작음)'
          : dAbs < 0.5
            ? '(효과 크기: 작음)'
            : dAbs < 0.8
              ? '(효과 크기: 중간)'
              : '(효과 크기: 큼)'
      } else if (typeof cohensD === 'object' && cohensD !== null) {
        // EffectSizeInfo 객체 처리
        effectSizeInfo = `(효과 크기: ${interpretEffectSize(cohensD)})`
      }

      return {
        title: '일표본 t검정 결과',
        summary: `표본 평균 ${mean.toFixed(2)} vs 검정값 ${testValue.toFixed(2)} (차이: ${diffAbs.toFixed(2)}) ${effectSizeInfo}`,
        statistical: isSignificant(pValue)
          ? `표본 평균이 검정값과 통계적으로 다릅니다 (p ${formatPValue(pValue)}).`
          : `표본 평균이 검정값과 통계적으로 유사합니다 (p ${formatPValue(pValue)}).`,
        practical: effectSizeInfo || (diffAbs < 0.5 ? '실질적 차이가 작습니다.' : '실질적 차이가 있습니다.')
      }
    }
  }

  // 4. Explore Data (탐색적 분석) - Descriptive과 유사하지만 더 포괄적
  if (methodLower.includes('explore') || methodLower.includes('탐색')) {
    const mean = results.additional?.mean
    const median = results.additional?.median
    const std = results.additional?.std
    const skewness = results.additional?.skewness
    const n = results.additional?.n

    if (typeof mean === 'number' && typeof median === 'number' && typeof std === 'number' && typeof n === 'number') {
      const meanMedianDiff = Math.abs(mean - median)

      // CV 계산 - 제로 평균 가드
      const EPS = 1e-10
      if (Math.abs(mean) < EPS) {
        // 평균이 0에 가까우면 CV 대신 표준편차 사용
        return {
          title: '탐색적 데이터 분석',
          summary: `중심값: 평균 ${mean.toFixed(2)}, 중앙값 ${median.toFixed(2)} | 변동성: 표준편차 ${std.toFixed(2)} (n=${n})`,
          statistical: '평균이 0에 가까워 변동계수를 계산할 수 없습니다.',
          practical: std < 1
            ? '표준편차가 1 미만으로 데이터가 비교적 균일합니다.'
            : std < 5
              ? '표준편차가 5 미만으로 변동성이 중간 수준입니다.'
              : '표준편차가 5 이상으로 변동성이 매우 높습니다. 비모수적 검정이나 로그 변환을 고려하세요.'
        }
      }
      const cv = (std / Math.abs(mean)) * 100

      // 평균-중앙값 차이로 대칭성 판단
      let symmetryInterpretation = ''
      if (typeof skewness === 'number') {
        if (Math.abs(skewness) < 0.5) {
          symmetryInterpretation = '분포가 대칭적입니다.'
        } else if (skewness > 0) {
          symmetryInterpretation = '분포가 오른쪽으로 치우쳐 있습니다 (평균 > 중앙값).'
        } else {
          symmetryInterpretation = '분포가 왼쪽으로 치우쳐 있습니다 (평균 < 중앙값).'
        }
      } else {
        // 왜도 데이터 없을 경우 평균-중앙값 차이로 판단
        symmetryInterpretation = meanMedianDiff < 0.1 * std
          ? '분포가 대칭적입니다.'
          : mean > median
            ? '분포가 오른쪽으로 치우쳐 있습니다.'
            : '분포가 왼쪽으로 치우쳐 있습니다.'
      }

      return {
        title: '탐색적 데이터 분석',
        summary: `중심값: 평균 ${mean.toFixed(2)}, 중앙값 ${median.toFixed(2)} | 변동성: CV ${cv.toFixed(1)}% (n=${n})`,
        statistical: symmetryInterpretation,
        practical: cv < 20
          ? '데이터가 비교적 균일합니다. 모수적 검정을 고려할 수 있습니다.'
          : cv < 50
            ? '데이터 변동성이 중간 수준입니다. 검정 방법을 신중히 선택하세요.'
            : '데이터 변동성이 매우 높습니다. 비모수적 검정이나 로그 변환을 고려하세요.'
      }
    }
  }

  // 5. Means Plot (평균 플롯) - 집단별 평균 비교 시각화
  if (methodLower.includes('meansplot') || methodLower.includes('평균플롯')) {
    // descriptives 객체 또는 plotData 배열에서 정보 추출
    const descriptives = results.additional?.descriptives
    const plotData = results.additional?.plotData

    if (descriptives && typeof descriptives === 'object') {
      const groups = Object.values(descriptives)
      if (groups.length >= 2) {
        const means = groups
          .map((g: unknown) => {
            if (typeof g === 'object' && g !== null && 'mean' in g) {
              return (g as { mean: unknown }).mean
            }
            return null
          })
          .filter((m): m is number => typeof m === 'number' && !isNaN(m))

        if (means.length >= 2) {
          const maxMean = Math.max(...means)
          const minMean = Math.min(...means)
          const range = maxMean - minMean
          const avgMean = means.reduce((a, b) => a + b, 0) / means.length

          // 평균 차이 비율
          const EPS = 1e-10
          const safeDenominator = Math.max(Math.abs(avgMean), EPS)
          const diffPercent = (range / safeDenominator) * 100

          return {
            title: '집단별 평균 비교',
            summary: `${means.length}개 집단의 평균 범위: ${minMean.toFixed(2)} ~ ${maxMean.toFixed(2)} (차이: ${range.toFixed(2)}, ${diffPercent.toFixed(1)}%)`,
            statistical: diffPercent < 10
              ? '집단 간 평균 차이가 작습니다.'
              : diffPercent < 30
                ? '집단 간 평균 차이가 중간 수준입니다.'
                : '집단 간 평균 차이가 큽니다.',
            practical: '오차 막대(95% CI)가 겹치는지 확인하세요. 겹치지 않으면 통계적으로 유의한 차이일 가능성이 높습니다. ANOVA나 t검정으로 검증하세요.'
          }
        }
      }
    } else if (Array.isArray(plotData) && plotData.length >= 2) {
      // plotData 배열에서 직접 추출
      const means = plotData
        .map((p: unknown) => {
          if (typeof p === 'object' && p !== null && 'mean' in p) {
            return (p as { mean: unknown }).mean
          }
          return null
        })
        .filter((m): m is number => typeof m === 'number' && !isNaN(m))

      if (means.length >= 2) {
        const maxMean = Math.max(...means)
        const minMean = Math.min(...means)
        const range = maxMean - minMean
        const avgMean = means.reduce((a, b) => a + b, 0) / means.length
        const EPS = 1e-10
        const safeDenominator = Math.max(Math.abs(avgMean), EPS)
        const diffPercent = (range / safeDenominator) * 100

        return {
          title: '집단별 평균 비교',
          summary: `${means.length}개 집단의 평균 범위: ${minMean.toFixed(2)} ~ ${maxMean.toFixed(2)} (차이: ${range.toFixed(2)}, ${diffPercent.toFixed(1)}%)`,
          statistical: diffPercent < 10
            ? '집단 간 평균 차이가 작습니다.'
            : diffPercent < 30
              ? '집단 간 평균 차이가 중간 수준입니다.'
              : '집단 간 평균 차이가 큽니다.',
          practical: '오차 막대(95% CI)가 겹치는지 확인하세요. 겹치지 않으면 통계적으로 유의한 차이일 가능성이 높습니다. ANOVA나 t검정으로 검증하세요.'
        }
      }
    }
  }

  // One-way ANOVA / Kruskal-Wallis (기본 다집단 비교 - 마지막에 매칭)
  if (methodLower.includes('anova') || methodLower.includes('분산분석') || methodLower.includes('kruskal')) {
    const groupStats = results.groupStats
    if (groupStats && groupStats.length >= 3) {
      const groupCount = groupStats.length
      const means = groupStats
        .map(g => g.mean)
        .filter((m): m is number => typeof m === 'number' && !isNaN(m))

      if (means.length < 3) return null // 유효한 평균 데이터 부족

      const maxMean = Math.max(...means)
      const minMean = Math.min(...means)
      const range = maxMean - minMean

      const postHoc = results.postHoc
      const postHocSummary = postHoc && postHoc.length > 0
        ? `사후 검정 결과: ${postHoc.filter(p => p.significant).length}개 쌍에서 유의한 차이 발견`
        : isSignificant(results.pValue)
          ? '사후 검정을 수행하여 어느 그룹이 다른지 확인하세요.'
          : null

      return {
        title: '다집단 비교 결과',
        summary: `${groupCount}개 그룹의 평균 범위는 ${minMean.toFixed(2)} ~ ${maxMean.toFixed(2)} (차이: ${range.toFixed(2)})입니다.`,
        statistical: isSignificant(results.pValue)
          ? `적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p ${formatPValue(results.pValue)}).`
          : `모든 그룹 평균이 통계적으로 유사합니다 (p ${formatPValue(results.pValue)}).`,
        practical: postHocSummary
      }
    }
  }

  // ===== Independent Samples t-test (독립표본 t검정) =====
  if ((methodLower.includes('independent') && methodLower.includes('t')) ||
      (methodLower.includes('ttest') && !methodLower.includes('one') && !methodLower.includes('paired')) ||
      (methodLower.includes('독립') && methodLower.includes('t'))) {
    return {
      title: '독립표본 t검정 결과',
      summary: `두 독립 집단의 평균 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `두 집단 간 평균이 통계적으로 유의하게 다릅니다 (p ${formatPValue(results.pValue)}).`
        : `두 집단 간 평균이 통계적으로 유의하게 다르지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: results.effectSize
        ? `실질적 효과 크기는 ${interpretEffectSize(results.effectSize)}입니다.`
        : isSignificant(results.pValue)
          ? '실질적 차이 여부는 효과크기(Cohen\'s d)를 확인하세요.'
          : '두 집단은 유사한 평균을 가집니다.'
    }
  }

  // ===== Welch's t-test (웰치 t검정) =====
  if (methodLower.includes('welch')) {
    return {
      title: 'Welch t검정 결과',
      summary: `등분산 가정 없이 두 독립 집단의 평균 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `두 집단 간 평균이 통계적으로 유의하게 다릅니다 (p ${formatPValue(results.pValue)}).`
        : `두 집단 간 평균이 통계적으로 유의하게 다르지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: results.effectSize
        ? `실질적 효과 크기는 ${interpretEffectSize(results.effectSize)}입니다.`
        : isSignificant(results.pValue)
          ? 'Welch 검정은 등분산 가정이 위배될 때 더 강건합니다.'
          : '두 집단은 유사한 평균을 가집니다.'
    }
  }

  // ===== Paired t-test (대응표본 t검정) =====
  if ((methodLower.includes('paired') && methodLower.includes('t')) ||
      (methodLower.includes('대응') && methodLower.includes('t'))) {
    return {
      title: '대응표본 t검정 결과',
      summary: `동일 대상의 두 측정값 평균 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `사전-사후 평균이 통계적으로 유의하게 다릅니다 (p ${formatPValue(results.pValue)}).`
        : `사전-사후 평균이 통계적으로 유의하게 다르지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: results.effectSize
        ? `실질적 효과 크기는 ${interpretEffectSize(results.effectSize)}입니다.`
        : isSignificant(results.pValue)
          ? '처치/개입의 효과가 있습니다.'
          : '처치/개입의 효과가 없습니다.'
    }
  }

  // ===== Two-sample KS Test (두 표본 KS 검정) =====
  if (methodLower.includes('ks') && (methodLower.includes('two') || methodLower.includes('2') || methodLower.includes('sample'))) {
    return {
      title: '두 표본 분포 비교',
      summary: `두 표본의 분포가 동일한지 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `두 표본의 분포가 통계적으로 유의하게 다릅니다 (p ${formatPValue(results.pValue)}).`
        : `두 표본의 분포가 통계적으로 유의하게 다르지 않습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '두 집단의 데이터는 서로 다른 분포에서 추출되었을 가능성이 높습니다.'
        : '두 집단의 데이터는 동일한 분포에서 추출되었을 가능성이 높습니다.'
    }
  }

  // ===== 2. 범주형 연관성 (Chi-Square, Fisher, McNemar) =====
  if (methodLower.includes('chi') || methodLower.includes('카이') || methodLower.includes('fisher') || methodLower.includes('mcnemar')) {
    return {
      title: '범주형 변수 연관성 검정',
      summary: `두 범주형 변수 간 독립성을 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 연관성이 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 연관성이 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '두 변수는 서로 독립적이지 않습니다 (관련성 있음).'
        : '두 변수는 독립적입니다 (관련성 없음).'
    }
  }

  // ===== 3. 정규성 검정 (Shapiro-Wilk, KS-test) =====
  if (methodLower.includes('shapiro') || methodLower.includes('normality') || methodLower.includes('kolmogorov') || methodLower.includes('anderson')) {
    return {
      title: '정규성 검정 결과',
      summary: `데이터가 정규분포를 따르는지 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `정규분포를 따르지 않습니다 (p ${formatPValue(results.pValue)}).`
        : `정규분포를 따릅니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '비모수 검정(Mann-Whitney, Kruskal-Wallis 등) 사용을 권장합니다.'
        : '모수 검정(t-test, ANOVA 등) 사용이 적절합니다.'
    }
  }

  // ===== 4. 등분산성 검정 (Levene, Bartlett) =====
  if (methodLower.includes('levene') || methodLower.includes('bartlett') || methodLower.includes('등분산')) {
    return {
      title: '등분산성 검정 결과',
      summary: `그룹 간 분산이 동일한지 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `등분산 가정을 만족하지 않습니다 (p ${formatPValue(results.pValue)}).`
        : `등분산 가정을 만족합니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? "Welch's t-test 또는 비모수 검정 사용을 권장합니다."
        : '일반 t-test 또는 ANOVA 사용이 적절합니다.'
    }
  }

  // ===== 5. 신뢰도 분석 (Cronbach's Alpha) =====
  if (methodLower.includes('cronbach') || methodLower.includes('alpha') || methodLower.includes('신뢰도')) {
    const alpha = results.additional?.alpha
    if (typeof alpha !== 'number' || isNaN(alpha)) return null // 유효하지 않은 alpha → 패널 숨김

    const alphaValue = alpha

    let interpretation = ''
    if (alphaValue >= THRESHOLDS.ALPHA.GOOD) interpretation = '우수한 신뢰도'
    else if (alphaValue >= THRESHOLDS.ALPHA.ACCEPTABLE) interpretation = '좋은 신뢰도'
    else if (alphaValue >= THRESHOLDS.ALPHA.QUESTIONABLE) interpretation = '수용 가능한 신뢰도'
    else if (alphaValue >= THRESHOLDS.ALPHA.POOR) interpretation = '의문스러운 신뢰도'
    else interpretation = '낮은 신뢰도'

    return {
      title: '신뢰도 분석 결과',
      summary: `Cronbach's Alpha = ${alphaValue.toFixed(3)} (${interpretation})`,
      statistical: `α ≥ 0.7 기준: ${alphaValue >= THRESHOLDS.ALPHA.QUESTIONABLE ? '만족' : '불만족'}`,
      practical: alphaValue < THRESHOLDS.ALPHA.QUESTIONABLE
        ? '문항 수정 또는 제거를 고려하세요.'
        : alphaValue >= THRESHOLDS.ALPHA.GOOD
          ? '매우 신뢰할 수 있는 척도입니다.'
          : '신뢰할 수 있는 척도입니다.'
    }
  }

  // ===== 6. 군집 분석 (K-means, Hierarchical) =====
  if (methodLower.includes('cluster') || methodLower.includes('군집') || methodLower.includes('kmeans')) {
    const silhouette = results.additional?.silhouetteScore
    const clusters = results.additional?.clusters

    if (typeof silhouette !== 'number' || isNaN(silhouette)) return null // 유효하지 않은 silhouette → 패널 숨김

    const silhouetteValue = silhouette
    const clusterCount = clusters && Array.isArray(clusters) ? new Set(clusters).size : 0

    let quality = ''
    if (silhouetteValue >= THRESHOLDS.SILHOUETTE.STRONG) quality = '강한 구조'
    else if (silhouetteValue >= THRESHOLDS.SILHOUETTE.FAIR) quality = '합리적 구조'
    else if (silhouetteValue >= THRESHOLDS.SILHOUETTE.WEAK) quality = '약한 구조'
    else quality = '인위적 구조'

    return {
      title: '군집 분석 결과',
      summary: clusterCount > 0
        ? `${clusterCount}개 군집으로 분류되었습니다.`
        : '군집 분석이 완료되었습니다.',
      statistical: `Silhouette Score = ${silhouetteValue.toFixed(3)} (${quality})`,
      practical: silhouetteValue < THRESHOLDS.SILHOUETTE.FAIR
        ? '군집 수(K)를 조정하거나 다른 알고리즘을 시도하세요.'
        : '군집이 잘 분리되었습니다.'
    }
  }

  // ===== 7. 차원 축소 (PCA, Factor Analysis) =====
  if (methodLower.includes('pca') || methodLower.includes('factor') || methodLower.includes('주성분') || methodLower.includes('요인')) {
    const variance = results.additional?.explainedVarianceRatio
    if (variance && Array.isArray(variance) && variance.length > 0) {
      const totalVariance = variance.reduce((sum, v) => sum + v, 0)
      const componentCount = variance.length

      return {
        title: '차원 축소 결과',
        summary: `${componentCount}개 성분으로 축소되었습니다.`,
        statistical: `누적 설명력 = ${formatPercent(totalVariance)}`,
        practical: totalVariance >= THRESHOLDS.VARIANCE.GOOD
          ? '70% 이상의 변동을 설명합니다 (우수한 축소).'
          : totalVariance >= THRESHOLDS.VARIANCE.ACCEPTABLE
            ? '50% 이상의 변동을 설명합니다 (적절한 축소).'
            : '설명력이 낮습니다. 성분 수를 조정하세요.'
      }
    }
  }

  // ===== 8. 대응/쌍대 비모수 검정 (Wilcoxon, Sign, Friedman, Cochran Q) =====

  // Mann-Whitney U Test (독립표본 비모수 검정)
  if ((methodLower.includes('mann') && methodLower.includes('whitney')) || methodLower.includes('mann-whitney')) {
    return {
      title: '독립표본 비모수 검정',
      summary: `두 독립 그룹의 중앙값 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '두 그룹의 중앙값이 실질적으로 다릅니다.'
        : '두 그룹의 중앙값이 유사합니다.'
    }
  }

  // Wilcoxon Signed-Rank Test (대응표본 비모수 검정)
  if (methodLower.includes('wilcoxon') && !methodLower.includes('mann')) {
    return {
      title: '대응표본 비모수 검정',
      summary: `두 대응 측정값의 중앙값 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '두 측정 시점 간 중앙값이 실질적으로 다릅니다.'
        : '두 측정 시점 간 중앙값이 유사합니다.'
    }
  }

  // Sign Test (부호 검정)
  if (methodLower.includes('sign') && methodLower.includes('test')) {
    return {
      title: '부호 검정 결과',
      summary: `대응 데이터의 증가/감소 방향을 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 변화가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 변화가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '대부분의 관측치가 일관된 방향으로 변화했습니다.'
        : '증가와 감소가 비슷한 비율로 나타났습니다.'
    }
  }

  // Friedman Test (프리드만 검정)
  if (methodLower.includes('friedman')) {
    return {
      title: '반복측정 비모수 검정',
      summary: `3개 이상 반복측정값의 중앙값 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `적어도 하나의 시점에서 통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `모든 시점의 중앙값이 통계적으로 유사합니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '사후 검정(Nemenyi, Wilcoxon)을 수행하여 어느 시점이 다른지 확인하세요.'
        : '시간에 따른 유의한 변화가 없습니다.'
    }
  }

  // Cochran Q Test (코크란 Q 검정)
  if (methodLower.includes('cochran') || methodLower.includes('cochranq')) {
    return {
      title: '다중 이분형 변수 검정',
      summary: `3개 이상 이분형 반복측정값의 비율 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `적어도 하나의 시점에서 통계적으로 유의한 비율 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `모든 시점의 비율이 통계적으로 유사합니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? 'McNemar 사후 검정을 수행하여 어느 시점 쌍이 다른지 확인하세요.'
        : '시간에 따른 비율 변화가 없습니다.'
    }
  }

  // ===== 9. 독립/무작위 검정 (Mood's Median, Runs, Mann-Kendall, Binomial) =====

  // Mood's Median Test (무드 중앙값 검정)
  if (methodLower.includes('mood') && methodLower.includes('median')) {
    return {
      title: '중앙값 검정 결과',
      summary: `각 그룹의 중앙값이 같은지 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 중앙값 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 중앙값 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '그룹 간 중심 경향이 다릅니다.'
        : '그룹 간 중심 경향이 유사합니다.'
    }
  }

  // Runs Test (연속성 검정) - 'run test' or 'runs test'
  if ((methodLower.includes('run') || methodLower.includes('runs')) && methodLower.includes('test')) {
    const runsInfo = results.additional as { runs?: number; expectedRuns?: number; n1?: number; n2?: number; zScore?: number }
    const runs = runsInfo?.runs
    const expectedRuns = runsInfo?.expectedRuns
    const zScore = runsInfo?.zScore

    return {
      title: '무작위성 검정 결과',
      summary: runs !== undefined && expectedRuns !== undefined
        ? `관찰된 연속 횟수: ${runs}회, 기대값: ${expectedRuns.toFixed(1)}회`
        : `데이터의 무작위성을 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `무작위성 가정을 만족하지 않습니다 (p ${formatPValue(results.pValue)}).`
        : `무작위성 가정을 만족합니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '데이터에 패턴 또는 추세가 있습니다. 시계열 분석이나 추세 검정을 고려하세요.'
        : '데이터가 무작위로 분포되어 있습니다. 독립성 가정이 만족됩니다.'
    }
  }

  // Mann-Kendall Test (추세 검정)
  if (methodLower.includes('mann') && methodLower.includes('kendall')) {
    // statistic 유효성 검증
    const stat = results.statistic
    const hasValidStat = typeof stat === 'number' && Number.isFinite(stat)

    let practicalMsg: string
    if (!isSignificant(results.pValue)) {
      practicalMsg = '시간에 따른 일관된 변화가 없습니다.'
    } else if (!hasValidStat) {
      // statistic이 유효하지 않으면 방향 판단 불가
      practicalMsg = '통계적으로 유의한 추세가 있습니다.'
    } else {
      practicalMsg = stat > 0
        ? '시간에 따라 증가하는 추세가 있습니다.'
        : '시간에 따라 감소하는 추세가 있습니다.'
    }

    return {
      title: '추세 검정 결과',
      summary: `시계열 데이터의 단조 추세를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 추세가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 추세가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: practicalMsg
    }
  }

  // Binomial Test (이항 검정)
  if (methodLower.includes('binomial') && methodLower.includes('test')) {
    return {
      title: '이항 검정 결과',
      summary: `성공 확률이 기대값과 같은지 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 차이가 있습니다 (p ${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 차이가 없습니다 (p ${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? '관측된 비율이 기대 비율과 다릅니다.'
        : '관측된 비율이 기대 비율과 일치합니다.'
    }
  }

  // ===== 10. Fallback: 기본 해석 =====
  // method 매칭 실패 시 기본 p-value/효과크기 해석만 제공
  return null
}

/**
 * 방법 문자열 정규화
 *
 * 대소문자, 특수문자, 공백, 하이픈 제거하여 매칭 용이하게 함
 *
 * 예시:
 * - '이원 분산분석' → '이원분산분석'
 * - 'Two-way ANOVA' → 'twowayanova'
 * - '2-way ANOVA' → '2wayanova'
 */
function normalizeMethod(method: string): string {
  if (!method) return ''

  return method.toLowerCase()
    .replace(/[()'']/g, '')  // 괄호, 작은따옴표 제거
    .replace(/[-\s]+/g, '')  // 하이픈, 공백 모두 제거
    .trim()
}

/**
 * 효과크기 해석 함수 (기존 코드 이동)
 */
function interpretEffectSize(
  effectSize: number | EffectSizeInfo,
  type?: string
): string {
  // effectSize가 객체인 경우
  if (typeof effectSize === 'object' && effectSize !== null) {
    const { value, type: effectType } = effectSize
    const absValue = Math.abs(value)
    const normalizedType = normalizeEffectSizeType(effectType)

    if (normalizedType === "Cohen's d") {
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.SMALL) return "무시할 만한 차이"
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.MEDIUM) return "작은 효과"
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.LARGE) return "중간 효과"
      return "큰 효과"
    }

    if (normalizedType === "Pearson r" || normalizedType === "Correlation") {
      if (absValue < THRESHOLDS.EFFECT_SIZE.PEARSON_R.WEAK) return "약한 상관"
      if (absValue < THRESHOLDS.EFFECT_SIZE.PEARSON_R.MODERATE) return "중간 상관"
      return "강한 상관"
    }

    if (normalizedType === "Eta-squared" || normalizedType === "R-squared" || normalizedType === "Omega-squared") {
      if (absValue < THRESHOLDS.EFFECT_SIZE.ETA_SQUARED.SMALL) return "무시할 만한 효과"
      if (absValue < THRESHOLDS.EFFECT_SIZE.ETA_SQUARED.MEDIUM) return "작은 효과"
      if (absValue < THRESHOLDS.EFFECT_SIZE.ETA_SQUARED.LARGE) return "중간 효과"
      return "큰 효과"
    }
  }

  // effectSize가 숫자인 경우 (type 파라미터 사용)
  if (typeof effectSize === 'number') {
    const absValue = Math.abs(effectSize)
    const normalizedType = type ? normalizeEffectSizeType(type) : undefined

    if (normalizedType === "Cohen's d") {
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.SMALL) return "무시할 만한 차이"
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.MEDIUM) return "작은 효과"
      if (absValue < THRESHOLDS.EFFECT_SIZE.COHENS_D.LARGE) return "중간 효과"
      return "큰 효과"
    }

    // 기본: 상관계수 기준
    if (absValue < THRESHOLDS.EFFECT_SIZE.PEARSON_R.WEAK) return "약한 효과"
    if (absValue < THRESHOLDS.EFFECT_SIZE.PEARSON_R.MODERATE) return "중간 효과"
    return "큰 효과"
  }

  return "효과크기 정보 없음"
}

/**
 * 효과크기 타입 정규화 함수 (별칭 → 표준 이름)
 */
function normalizeEffectSizeType(type: string): string {
  const typeLower = type.toLowerCase().replace(/[_\s-]/g, '')

  // Cohen's d 별칭
  if (typeLower.includes('cohen') || typeLower === 'd') {
    return "Cohen's d"
  }

  // Pearson r 별칭
  if (typeLower === 'r' || typeLower === 'pearson' || typeLower === 'pearsonr') {
    return "Pearson r"
  }

  // Eta-squared 별칭
  if (typeLower === 'etasquared' || typeLower === 'eta2' || typeLower === 'η2' || typeLower === 'η²') {
    return "Eta-squared"
  }

  // R-squared 별칭
  if (typeLower === 'rsquared' || typeLower === 'r2') {
    return "R-squared"
  }

  // Omega-squared 별칭
  if (typeLower === 'omegasquared' || typeLower === 'omega2' || typeLower === 'ω2' || typeLower === 'ω²') {
    return "Omega-squared"
  }

  // Correlation (일반)
  if (typeLower === 'correlation' || typeLower === 'corr') {
    return "Correlation"
  }

  return type // 알 수 없는 타입은 그대로 반환
}
