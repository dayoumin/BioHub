/**
 * AnalysisResult -> StatisticalResult 타입 변환 유틸리티
 *
 * Smart Flow의 AnalysisResult를 공통 컴포넌트 StatisticalResultCard에서
 * 사용하는 StatisticalResult 타입으로 변환합니다.
 */

import { AnalysisResult, EffectSizeInfo, StatisticalAssumptions } from '@/types/smart-flow'
import { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

/**
 * 추가 결과 테이블 인터페이스
 */
interface AdditionalTable {
  title: string
  columns: { key: string; label: string }[]
  data: Record<string, string | number>[]
}

/**
 * 추가 결과 테이블 생성 (groupStats, postHoc, coefficients)
 */
function buildAdditionalResults(result: AnalysisResult): AdditionalTable[] | undefined {
  const tables: AdditionalTable[] = []

  // 1. 그룹별 기술통계 (가장 기본적인 정보, 먼저 표시)
  if (result.groupStats?.length) {
    tables.push({
      title: '그룹별 기술통계',
      columns: [
        { key: 'name', label: '그룹' },
        { key: 'n', label: '표본수' },
        { key: 'mean', label: '평균' },
        { key: 'std', label: '표준편차' }
      ],
      data: result.groupStats.map(g => ({
        name: g.name ?? '',
        n: g.n,
        mean: g.mean?.toFixed(3) ?? '-',
        std: g.std?.toFixed(3) ?? '-'
      }))
    })
  }

  // 2. 사후검정 결과 (ANOVA 등)
  if (result.postHoc?.length) {
    tables.push({
      title: '사후검정 결과',
      columns: [
        { key: 'comparison', label: '비교' },
        { key: 'meanDiff', label: '평균차' },
        { key: 'pvalue', label: 'p-value' },
        { key: 'significant', label: '유의성' }
      ],
      data: result.postHoc.map(ph => ({
        comparison: `${ph.group1} vs ${ph.group2}`,
        meanDiff: ph.meanDiff?.toFixed(3) ?? '-',
        pvalue: ph.pvalue?.toFixed(4) ?? '-',
        significant: ph.significant ? '유의함 *' : '-'
      }))
    })
  }

  // 3. 회귀계수 (회귀분석)
  if (result.coefficients?.length) {
    tables.push({
      title: '회귀계수',
      columns: [
        { key: 'name', label: '변수' },
        { key: 'value', label: '계수 (B)' },
        { key: 'stdError', label: '표준오차' },
        { key: 'tValue', label: 't값' },
        { key: 'pvalue', label: 'p-value' }
      ],
      data: result.coefficients.map(c => ({
        name: c.name,
        value: c.value?.toFixed(4) ?? '-',
        stdError: c.stdError?.toFixed(4) ?? '-',
        tValue: c.tValue?.toFixed(3) ?? '-',
        pvalue: c.pvalue?.toFixed(4) ?? '-'
      }))
    })
  }

  return tables.length > 0 ? tables : undefined
}

/**
 * 효과크기 타입을 StatisticalResult 형식으로 변환
 */
function convertEffectSize(
  effectSize: number | EffectSizeInfo | undefined
): StatisticalResult['effectSize'] | undefined {
  if (effectSize === undefined) return undefined

  if (typeof effectSize === 'number') {
    return {
      value: effectSize,
      type: 'cohensD' // 기본값
    }
  }

  // EffectSizeInfo -> StatisticalResult effectSize
  const typeMap: Record<string, 'cohensD' | 'etaSquared' | 'r' | 'phi' | 'cramersV'> = {
    "cohen's d": 'cohensD',
    "cohensD": 'cohensD',
    "d": 'cohensD',
    "eta-squared": 'etaSquared',
    "etaSquared": 'etaSquared',
    "eta²": 'etaSquared',
    "η²": 'etaSquared',
    "pearson r": 'r',
    "r": 'r',
    "correlation": 'r',
    "phi": 'phi',
    "φ": 'phi',
    "cramer's v": 'cramersV',
    "cramersV": 'cramersV',
  }

  // effectSize.type이 undefined인 경우 방어
  const normalizedType = (effectSize.type ?? '').toLowerCase().trim()

  return {
    value: effectSize.value,
    type: typeMap[normalizedType] || 'cohensD'
  }
}

/**
 * 가정 검정 결과를 StatisticalResult 형식으로 변환
 */
function convertAssumptions(
  assumptions: StatisticalAssumptions | undefined
): StatisticalResult['assumptions'] | undefined {
  if (!assumptions) return undefined

  const result: StatisticalResult['assumptions'] = []

  // 정규성 검정
  if (assumptions.normality) {
    if (assumptions.normality.group1) {
      result.push({
        name: '정규성 (그룹 1)',
        description: 'Shapiro-Wilk 검정',
        pValue: assumptions.normality.group1.pValue ?? null,
        passed: assumptions.normality.group1.isNormal,
        recommendation: assumptions.normality.group1.isNormal
          ? undefined
          : '비모수 검정 사용을 고려하세요'
      })
    }

    if (assumptions.normality.group2) {
      result.push({
        name: '정규성 (그룹 2)',
        description: 'Shapiro-Wilk 검정',
        pValue: assumptions.normality.group2.pValue ?? null,
        passed: assumptions.normality.group2.isNormal,
        recommendation: assumptions.normality.group2.isNormal
          ? undefined
          : '비모수 검정 사용을 고려하세요'
      })
    }

    // Shapiro-Wilk 단일 결과
    if (assumptions.normality.shapiroWilk && !assumptions.normality.group1 && !assumptions.normality.group2) {
      result.push({
        name: '정규성',
        description: 'Shapiro-Wilk 검정',
        testStatistic: assumptions.normality.shapiroWilk.statistic,
        pValue: assumptions.normality.shapiroWilk.pValue ?? null,
        passed: assumptions.normality.shapiroWilk.isNormal,
        recommendation: assumptions.normality.shapiroWilk.isNormal
          ? undefined
          : '비모수 검정 사용을 고려하세요'
      })
    }
  }

  // 등분산성 검정
  if (assumptions.homogeneity) {
    if (assumptions.homogeneity.levene) {
      result.push({
        name: '등분산성',
        description: "Levene's 검정",
        testStatistic: assumptions.homogeneity.levene.statistic,
        pValue: assumptions.homogeneity.levene.pValue ?? null,
        passed: assumptions.homogeneity.levene.equalVariance,
        recommendation: assumptions.homogeneity.levene.equalVariance
          ? undefined
          : "Welch's t-검정 사용을 고려하세요"
      })
    }

    if (assumptions.homogeneity.bartlett) {
      result.push({
        name: '등분산성',
        description: "Bartlett's 검정",
        testStatistic: assumptions.homogeneity.bartlett.statistic,
        pValue: assumptions.homogeneity.bartlett.pValue ?? null,
        passed: assumptions.homogeneity.bartlett.equalVariance,
        recommendation: assumptions.homogeneity.bartlett.equalVariance
          ? undefined
          : "Welch's ANOVA 사용을 고려하세요"
      })
    }
  }

  // 독립성 검정
  if (assumptions.independence?.durbin) {
    result.push({
      name: '독립성',
      description: 'Durbin-Watson 검정',
      testStatistic: assumptions.independence.durbin.statistic,
      pValue: assumptions.independence.durbin.pValue ?? null,
      passed: assumptions.independence.durbin.isIndependent,
      recommendation: assumptions.independence.durbin.isIndependent
        ? undefined
        : '자기상관을 고려한 모델을 사용하세요'
    })
  }

  return result.length > 0 ? result : undefined
}

/**
 * 통계량 이름을 추출
 */
function getStatisticName(method: string): string {
  const methodLower = method.toLowerCase()

  if (methodLower.includes('t-검정') || methodLower.includes('t test') || methodLower.includes('t-test')) {
    return 't'
  }
  if (methodLower.includes('anova') || methodLower.includes('분산분석')) {
    return 'F'
  }
  if (methodLower.includes('카이') || methodLower.includes('chi')) {
    return 'χ²'
  }
  if (methodLower.includes('상관') || methodLower.includes('correlation')) {
    return 'r'
  }
  if (methodLower.includes('mann-whitney') || methodLower.includes('mann whitney')) {
    return 'U'
  }
  if (methodLower.includes('wilcoxon')) {
    return 'W'
  }
  if (methodLower.includes('kruskal')) {
    return 'H'
  }
  if (methodLower.includes('회귀') || methodLower.includes('regression')) {
    return 'β'
  }

  return 'Statistic'
}

/**
 * 검정 유형(영문)을 추출
 */
function getTestType(method: string): string {
  const methodLower = method.toLowerCase()

  if (methodLower.includes('독립표본') || methodLower.includes('independent')) {
    return 'Independent Samples t-test'
  }
  if (methodLower.includes('대응') || methodLower.includes('paired')) {
    return 'Paired Samples t-test'
  }
  if (methodLower.includes('일표본') || methodLower.includes('one-sample') || methodLower.includes('one sample')) {
    return 'One-Sample t-test'
  }
  if (methodLower.includes('일원') && methodLower.includes('anova')) {
    return 'One-Way ANOVA'
  }
  if (methodLower.includes('이원') && methodLower.includes('anova')) {
    return 'Two-Way ANOVA'
  }
  if (methodLower.includes('반복측정') || methodLower.includes('repeated')) {
    return 'Repeated Measures ANOVA'
  }
  if (methodLower.includes('pearson')) {
    return 'Pearson Correlation'
  }
  if (methodLower.includes('spearman')) {
    return 'Spearman Correlation'
  }
  if (methodLower.includes('kendall')) {
    return 'Kendall Correlation'
  }
  if (methodLower.includes('mann-whitney')) {
    return 'Mann-Whitney U Test'
  }
  if (methodLower.includes('wilcoxon')) {
    return 'Wilcoxon Signed-Rank Test'
  }
  if (methodLower.includes('kruskal')) {
    return 'Kruskal-Wallis H Test'
  }
  if (methodLower.includes('카이') || methodLower.includes('chi')) {
    return 'Chi-Square Test'
  }
  if (methodLower.includes('단순회귀') || methodLower.includes('simple regression')) {
    return 'Simple Linear Regression'
  }
  if (methodLower.includes('다중회귀') || methodLower.includes('multiple regression')) {
    return 'Multiple Linear Regression'
  }

  return method
}

/**
 * 권장사항 생성
 */
function generateRecommendations(
  result: AnalysisResult,
  isSignificant: boolean
): string[] {
  const recommendations: string[] = []

  // 효과크기 관련 권장사항
  if (result.effectSize !== undefined) {
    recommendations.push('효과크기를 함께 보고하여 실질적 유의성을 평가하세요')
  }

  // 신뢰구간 관련 권장사항
  if (result.confidence) {
    recommendations.push('신뢰구간을 확인하여 추정치의 정밀도를 파악하세요')
  }

  // 비유의한 경우
  if (!isSignificant) {
    recommendations.push('표본 크기가 충분한지 검토하세요 (통계적 검정력 분석)')
    recommendations.push('효과크기가 작은 경우 더 큰 표본이 필요할 수 있습니다')
  }

  // 사후검정 관련
  if (result.postHoc && result.postHoc.length > 0) {
    recommendations.push('다중비교에 따른 Type I 오류 증가에 유의하세요')
  }

  return recommendations
}

/**
 * AnalysisResult를 StatisticalResult로 변환
 */
export function convertToStatisticalResult(
  result: AnalysisResult,
  options?: {
    sampleSize?: number
    groups?: number
    variables?: string[]
    timestamp?: Date
  }
): StatisticalResult {
  const isSignificant = result.pValue < 0.05

  return {
    // 기본 정보
    testName: result.method,
    testType: getTestType(result.method),
    description: getTestDescription(result.method),

    // 주요 통계량
    statistic: result.statistic,
    statisticName: getStatisticName(result.method),
    df: result.df,
    pValue: result.pValue,
    alpha: 0.05,

    // 효과크기
    effectSize: convertEffectSize(result.effectSize),

    // 신뢰구간
    confidenceInterval: result.confidence ? {
      estimate: (result.confidence.lower + result.confidence.upper) / 2,
      lower: result.confidence.lower,
      upper: result.confidence.upper,
      level: result.confidence.level ?? 0.95
    } : undefined,

    // 가정 검정
    assumptions: convertAssumptions(result.assumptions),

    // 해석 및 권장사항
    interpretation: result.interpretation,
    recommendations: generateRecommendations(result, isSignificant),

    // 메타데이터
    sampleSize: options?.sampleSize,
    groups: options?.groups ?? result.groupStats?.length,
    variables: options?.variables,
    timestamp: options?.timestamp ?? new Date(),

    // 추가 결과 테이블 (groupStats, postHoc, coefficients)
    additionalResults: buildAdditionalResults(result)
  }
}

/**
 * 검정 설명 생성
 */
function getTestDescription(method: string): string {
  const methodLower = method.toLowerCase()

  if (methodLower.includes('독립표본') || methodLower.includes('independent')) {
    return '두 독립 집단의 평균 비교'
  }
  if (methodLower.includes('대응') || methodLower.includes('paired')) {
    return '동일 집단의 전후 평균 비교'
  }
  if (methodLower.includes('일표본') || methodLower.includes('one-sample')) {
    return '표본 평균과 기준값 비교'
  }
  if (methodLower.includes('일원') && methodLower.includes('anova')) {
    return '세 집단 이상의 평균 비교'
  }
  if (methodLower.includes('이원') && methodLower.includes('anova')) {
    return '두 요인의 주효과 및 상호작용 분석'
  }
  if (methodLower.includes('상관') || methodLower.includes('correlation')) {
    return '두 변수 간의 선형 관계 분석'
  }
  if (methodLower.includes('회귀') || methodLower.includes('regression')) {
    return '독립변수가 종속변수에 미치는 영향 분석'
  }
  if (methodLower.includes('카이') || methodLower.includes('chi')) {
    return '범주형 변수 간의 독립성 검정'
  }
  if (methodLower.includes('mann-whitney')) {
    return '두 독립 집단의 중위수 비교 (비모수)'
  }
  if (methodLower.includes('wilcoxon')) {
    return '동일 집단의 전후 중위수 비교 (비모수)'
  }
  if (methodLower.includes('kruskal')) {
    return '세 집단 이상의 중위수 비교 (비모수)'
  }

  return ''
}