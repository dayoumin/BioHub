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
 * p-value 포맷팅 (DRY 원칙)
 * @example formatPValue(0.0001) → "< 0.001"
 * @example formatPValue(0.0234) → "0.023"
 */
function formatPValue(p: number): string {
  // Edge case 방어: NaN, Infinity, 범위 벗어남
  if (!isFinite(p) || p < 0 || p > 1) return 'N/A'

  if (p < THRESHOLDS.P_VALUE.VERY_STRONG) return '< 0.001'
  return p.toFixed(3)
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
          ? `통계적으로 유의한 차이가 있습니다 (p=${formatPValue(results.pValue)}).`
          : `통계적으로 유의한 차이가 없습니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `${strength} ${direction} 상관관계가 통계적으로 유의합니다 (p=${formatPValue(results.pValue)}).`
        : `상관관계가 통계적으로 유의하지 않습니다 (p=${formatPValue(results.pValue)}).`,
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

    return {
      title: '예측 모델 결과',
      summary: `독립변수가 1단위 증가할 때 종속변수는 ${coef.toFixed(3)}만큼 변합니다.`,
      statistical: `모델 설명력(R²) = ${formatPercent(rSquared)} - ${
        rSquared >= THRESHOLDS.R_SQUARED.HIGH ? '높은 설명력' :
        rSquared >= THRESHOLDS.R_SQUARED.LOW ? '중간 설명력' :
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

  // ===== 1. 다집단 비교 (ANOVA, Kruskal-Wallis) =====
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
          ? `적어도 하나의 그룹 평균이 통계적으로 다릅니다 (p=${formatPValue(results.pValue)}).`
          : `모든 그룹 평균이 통계적으로 유사합니다 (p=${formatPValue(results.pValue)}).`,
        practical: postHocSummary
      }
    }
  }

  // ===== 2. 범주형 연관성 (Chi-Square, Fisher, McNemar) =====
  if (methodLower.includes('chi') || methodLower.includes('카이') || methodLower.includes('fisher') || methodLower.includes('mcnemar')) {
    return {
      title: '범주형 변수 연관성 검정',
      summary: `두 범주형 변수 간 독립성을 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 연관성이 있습니다 (p=${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 연관성이 없습니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `정규분포를 따르지 않습니다 (p=${formatPValue(results.pValue)}).`
        : `정규분포를 따릅니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `등분산 가정을 만족하지 않습니다 (p=${formatPValue(results.pValue)}).`
        : `등분산 가정을 만족합니다 (p=${formatPValue(results.pValue)}).`,
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

  // Wilcoxon Signed-Rank Test (윌콕슨 부호 순위 검정)
  if (methodLower.includes('wilcoxon') && !methodLower.includes('mann')) {
    return {
      title: '대응표본 비모수 검정',
      summary: `두 대응 측정값의 중앙값 차이를 검정했습니다.`,
      statistical: isSignificant(results.pValue)
        ? `통계적으로 유의한 차이가 있습니다 (p=${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 차이가 없습니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `통계적으로 유의한 변화가 있습니다 (p=${formatPValue(results.pValue)}).`
        : `통계적으로 유의한 변화가 없습니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `적어도 하나의 시점에서 통계적으로 유의한 차이가 있습니다 (p=${formatPValue(results.pValue)}).`
        : `모든 시점의 중앙값이 통계적으로 유사합니다 (p=${formatPValue(results.pValue)}).`,
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
        ? `적어도 하나의 시점에서 통계적으로 유의한 비율 차이가 있습니다 (p=${formatPValue(results.pValue)}).`
        : `모든 시점의 비율이 통계적으로 유사합니다 (p=${formatPValue(results.pValue)}).`,
      practical: isSignificant(results.pValue)
        ? 'McNemar 사후 검정을 수행하여 어느 시점 쌍이 다른지 확인하세요.'
        : '시간에 따른 비율 변화가 없습니다.'
    }
  }

  // ===== 9. Fallback: 기본 해석 =====
  // method 매칭 실패 시 기본 p-value/효과크기 해석만 제공
  return null
}

/**
 * 방법 문자열 정규화
 *
 * 대소문자, 특수문자 제거하여 매칭 용이하게 함
 */
function normalizeMethod(method: string): string {
  if (!method) return ''

  return method.toLowerCase()
    .replace(/[()'']/g, '') // 괄호, 작은따옴표 제거
    .replace(/\s+/g, ' ')   // 연속 공백 하나로
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
