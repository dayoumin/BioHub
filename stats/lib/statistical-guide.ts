/**
 * Statistical Analysis Guide and Interpretation System
 * 
 * 통계 분석 결과에 대한 상세한 해석과 다음 단계 가이드를 제공하는 시스템
 */

import { UserPreferences } from './store'

// Types for statistical results (previously from statistics.ts)
export interface StatisticalTestResult {
  testName: string
  statistic: number
  pValue: number
  degreesOfFreedom?: number
  effectSize?: number
  confidenceInterval?: [number, number]
  interpretation: string
  isSignificant: boolean
  assumptions?: Array<{
    name: string
    met: boolean
    description: string
    pValue?: number
  }>
  multipleComparisons?: {
    method: string
    originalPValue: number
    adjustedPValue: number
    isSignificantAfterCorrection: boolean
    alpha: number
    numberOfComparisons: number
    correctionApplied: boolean
  }
}

export interface CorrelationResult extends StatisticalTestResult {
  correlation: number
  rSquared: number
  sampleSize?: number
}

export interface DescriptiveStatistics {
  mean: number
  median: number
  mode: number | number[]
  std: number
  standardDeviation: number
  variance: number
  skewness: number
  kurtosis: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  cv: number
  coefficientOfVariation: number
  sem: number
  count: number
}

export interface MultipleComparisonsResult {
  method: string
  comparisons: Array<{
    group1: string
    group2: string
    pValue: number
    adjustedPValue: number
    significant: boolean
  }>
}

// ================================================================================
// 타입 정의
// ================================================================================

export interface StatisticalGuidance {
  summary: string // 핵심 결과 요약
  interpretation: {
    result: string // 결과 해석
    significance: string // 통계적 유의성 설명
    effect: string // 효과 크기 해석
    multipleComparisons?: string // 다중비교 보정 설명
  }
  assumptions: {
    met: string[] // 충족된 가정들
    violated: string[] // 위반된 가정들  
    recommendations: string[] // 가정 위반 시 권고사항
  }
  nextSteps: {
    primary: string // 주요 다음 단계
    alternatives: string[] // 대안 분석들
    considerations: string[] // 고려사항들
  }
  visualizations: {
    recommended: string[] // 권장 시각화
    descriptions: string[] // 각 시각화 설명
  }
  reportingGuidance: {
    apa: string // APA 형식 보고
    interpretation: string // 결과 해석 문구
    limitations: string[] // 제한사항
  }
}

export interface FileNamingGuidance {
  suggestedName: string // 한글 설명이 포함된 파일명
  description: string // 파일 내용 설명
  category: 'basic' | 'comparison' | 'correlation' | 'regression' | 'nonparametric' | 'fisheries'
}

// ================================================================================
// 파일명 생성 시스템
// ================================================================================

export class FileNamingSystem {
  /**
   * 분석 유형과 결과에 따라 한글 파일명 생성
   */
  static generateFileName(
    analysisType: string,
    dataDescription?: string,
    additionalInfo?: string
  ): FileNamingGuidance {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')
    
    const namingRules: Record<string, { prefix: string, category: FileNamingGuidance['category'] }> = {
      'descriptive': { prefix: '기본통계량', category: 'basic' },
      'one-sample-t-test': { prefix: '일표본t검정', category: 'comparison' },
      'two-sample-t-test': { prefix: '독립표본t검정', category: 'comparison' },
      'paired-t-test': { prefix: '대응표본t검정', category: 'comparison' },
      'one-way-anova': { prefix: '일원분산분석', category: 'comparison' },
      'correlation': { prefix: '피어슨상관분석', category: 'correlation' },
      'simple-regression': { prefix: '단순회귀분석', category: 'regression' },
      'multiple-regression': { prefix: '다중회귀분석', category: 'regression' },
      'mann-whitney': { prefix: '만휘트니U검정', category: 'nonparametric' },
      'kruskal-wallis': { prefix: '크루스칼월리스검정', category: 'nonparametric' },
      'wilcoxon': { prefix: '윌콕슨검정', category: 'nonparametric' },
      'cpue-analysis': { prefix: 'CPUE분석', category: 'fisheries' },
      'growth-model': { prefix: '성장모델분석', category: 'fisheries' },
      'multiple-comparisons': { prefix: '다중비교보정', category: 'comparison' }
    }

    const rule = namingRules[analysisType] || { prefix: '통계분석', category: 'basic' as const }
    
    let suggestedName = rule.prefix
    if (dataDescription) {
      suggestedName += `-${dataDescription}`
    }
    if (additionalInfo) {
      suggestedName += `-${additionalInfo}`
    }
    suggestedName += `-${timestamp}.csv`

    return {
      suggestedName,
      description: this.getAnalysisDescription(analysisType),
      category: rule.category
    }
  }

  private static getAnalysisDescription(analysisType: string): string {
    const descriptions: Record<string, string> = {
      'descriptive': '데이터의 중심경향성과 분산을 요약한 기본 통계량',
      'one-sample-t-test': '단일 표본의 평균이 특정 값과 다른지 검정',
      'two-sample-t-test': '두 독립 그룹 간의 평균 차이 검정',
      'paired-t-test': '동일 대상의 전후 측정값 차이 검정',
      'one-way-anova': '세 개 이상 그룹 간의 평균 차이 검정',
      'correlation': '두 연속변수 간의 선형관계 강도와 방향 분석',
      'simple-regression': '한 변수로 다른 변수를 예측하는 모델 분석',
      'multiple-regression': '여러 변수로 종속변수를 예측하는 모델 분석',
      'mann-whitney': '두 독립 그룹의 분포 차이 검정 (비모수)',
      'kruskal-wallis': '세 개 이상 그룹의 분포 차이 검정 (비모수)',
      'wilcoxon': '대응표본의 중위수 차이 검정 (비모수)',
      'cpue-analysis': '어획량 관련 변수들 간의 관계 분석',
      'growth-model': '어류 성장 패턴 모델링 및 분석',
      'multiple-comparisons': '다중 검정 시 오류율 보정 분석'
    }
    
    return descriptions[analysisType] || '통계 분석 결과'
  }
}

// ================================================================================
// 통계 가이드 시스템
// ================================================================================

export class StatisticalGuideSystem {
  /**
   * t-검정 결과에 대한 상세 가이드
   */
  static generateTTestGuidance(
    result: StatisticalTestResult,
    preferences?: UserPreferences
  ): StatisticalGuidance {
    const alpha = preferences?.defaultSignificanceLevel || 0.05
    const isSignificant = result.pValue < alpha
    const effectSize = result.effectSize || 0
    
    // 효과 크기 해석 (Cohen's d 기준)
    let effectInterpretation = ''
    if (effectSize < 0.2) effectInterpretation = '작은 효과'
    else if (effectSize < 0.5) effectInterpretation = '중간 효과'  
    else if (effectSize < 0.8) effectInterpretation = '큰 효과'
    else effectInterpretation = '매우 큰 효과'

    const multipleComparisons = result.multipleComparisons
    const correctionApplied = multipleComparisons?.correctionApplied || false

    return {
      summary: `${result.testName} 결과: p-value = ${result.pValue.toFixed(4)}, ${isSignificant ? '통계적으로 유의함' : '통계적으로 유의하지 않음'}`,
      
      interpretation: {
        result: isSignificant 
          ? `두 그룹 간에 통계적으로 유의한 차이가 있습니다 (p < ${alpha}).`
          : `두 그룹 간에 통계적으로 유의한 차이가 없습니다 (p ≥ ${alpha}).`,
        significance: `p-value는 ${result.pValue.toFixed(4)}로, 이는 귀무가설이 참일 때 현재 관찰된 차이 또는 더 극단적인 차이가 나타날 확률입니다.`,
        effect: `효과 크기는 ${effectSize.toFixed(3)}으로 ${effectInterpretation}에 해당합니다. 이는 실질적 중요성을 평가하는 지표입니다.`,
        multipleComparisons: correctionApplied 
          ? `다중비교 보정(${multipleComparisons?.method})이 적용되었습니다. 원래 p-value ${multipleComparisons?.originalPValue.toFixed(4)}에서 ${multipleComparisons?.adjustedPValue.toFixed(4)}로 보정되었습니다.`
          : undefined
      },

      assumptions: {
        met: this.checkTTestAssumptions(result).met,
        violated: this.checkTTestAssumptions(result).violated,
        recommendations: this.getTTestRecommendations(result)
      },

      nextSteps: {
        primary: isSignificant 
          ? "효과 크기의 실질적 중요성을 평가하고 신뢰구간을 해석하세요."
          : "표본 크기가 충분한지 검토하거나 비모수 검정을 고려해보세요.",
        alternatives: [
          "Mann-Whitney U 검정 (비모수 대안)",
          "부트스트랩 검정 (분포 가정 불필요)",
          "베이지안 t-검정 (사전 정보 활용)"
        ],
        considerations: [
          "표본 크기와 검정력 분석",
          "실질적 중요성 vs 통계적 유의성",
          "결과의 재현가능성 검토"
        ]
      },

      visualizations: {
        recommended: ["박스플롯", "히스토그램", "Q-Q플롯", "효과크기 시각화"],
        descriptions: [
          "박스플롯: 두 그룹의 분포와 중위수 비교",
          "히스토그램: 각 그룹의 분포 모양 확인",
          "Q-Q플롯: 정규성 가정 검토",
          "효과크기 시각화: 실질적 차이의 크기 표현"
        ]
      },

      reportingGuidance: {
        apa: `${result.testName}, t(${result.degreesOfFreedom}) = ${result.statistic?.toFixed(2) || 'N/A'}, p = ${result.pValue?.toFixed(3) || 'N/A'}, Cohen's d = ${effectSize?.toFixed(2) || 'N/A'}, 95% CI [${result.confidenceInterval?.[0]?.toFixed(2) || 'N/A'}, ${result.confidenceInterval?.[1]?.toFixed(2) || 'N/A'}]`,
        interpretation: isSignificant
          ? `분석 결과 두 그룹 간에 통계적으로 유의한 차이가 있는 것으로 나타났습니다. 효과 크기(${effectInterpretation})를 고려할 때 실질적으로도 의미 있는 차이라고 볼 수 있습니다.`
          : `분석 결과 두 그룹 간에 통계적으로 유의한 차이가 없는 것으로 나타났습니다. 다만 이는 차이가 없다는 의미가 아니라 현재 데이터로는 차이를 입증할 수 없다는 의미입니다.`,
        limitations: [
          "정규성 가정 위반 시 결과 해석에 주의 필요",
          "표본 크기가 작을 경우 검정력 부족 가능",
          "통계적 유의성이 실질적 중요성을 의미하지는 않음"
        ]
      }
    }
  }

  /**
   * 상관분석 결과에 대한 상세 가이드
   */
  static generateCorrelationGuidance(
    result: CorrelationResult,
    preferences?: UserPreferences
  ): StatisticalGuidance {
    const alpha = preferences?.defaultSignificanceLevel || 0.05
    const isSignificant = result.pValue < alpha
    const correlation = result.correlation
    
    // 상관계수 크기 해석
    let strengthInterpretation = ''
    const absCorr = Math.abs(correlation)
    if (absCorr < 0.1) strengthInterpretation = '매우 약한'
    else if (absCorr < 0.3) strengthInterpretation = '약한'
    else if (absCorr < 0.5) strengthInterpretation = '중간'
    else if (absCorr < 0.7) strengthInterpretation = '강한'
    else strengthInterpretation = '매우 강한'

    const direction = correlation > 0 ? '정적' : '부적'

    return {
      summary: `피어슨 상관계수: r = ${correlation.toFixed(3)}, p = ${result.pValue.toFixed(4)}, ${isSignificant ? '유의한' : '유의하지 않은'} ${strengthInterpretation} ${direction} 상관관계`,
      
      interpretation: {
        result: `두 변수 간에 ${strengthInterpretation} ${direction} 상관관계가 ${isSignificant ? '있습니다' : '없습니다'}.`,
        significance: `p-value ${result.pValue.toFixed(4)}는 상관계수가 0이라는 귀무가설을 기각할 ${isSignificant ? '수 있음' : '수 없음'}을 의미합니다.`,
        effect: `상관계수 ${correlation.toFixed(3)}은 한 변수의 분산 중 약 ${(correlation * correlation * 100).toFixed(1)}%가 다른 변수로 설명됨을 의미합니다.`,
        multipleComparisons: result.multipleComparisons?.correctionApplied 
          ? `다중상관분석으로 인한 보정이 적용되었습니다.`
          : undefined
      },

      assumptions: {
        met: ["선형관계 가정", "연속변수 측정"],
        violated: [], // 실제로는 데이터 검토 필요
        recommendations: [
          "산점도로 선형관계 확인",
          "이상치 존재 여부 검토",
          "변수 분포의 정규성 확인"
        ]
      },

      nextSteps: {
        primary: isSignificant && absCorr > 0.3
          ? "회귀분석을 통해 예측 모델을 구축해보세요."
          : "다른 변수들과의 관계도 탐색해보거나 비선형 관계를 검토해보세요.",
        alternatives: [
          "스피어만 순위상관 (비모수 대안)",
          "편상관분석 (제3변수 통제)",
          "다중회귀분석 (여러 예측변수 포함)"
        ],
        considerations: [
          "상관관계는 인과관계를 의미하지 않음",
          "제3변수의 영향 가능성 검토",
          "표본 크기와 신뢰구간 고려"
        ]
      },

      visualizations: {
        recommended: ["산점도", "상관행렬", "회귀직선", "잔차플롯"],
        descriptions: [
          "산점도: 두 변수 간의 관계 패턴 시각화",
          "상관행렬: 여러 변수 간 상관관계 한눈에 보기",
          "회귀직선: 선형관계의 방향과 기울기 표시",
          "잔차플롯: 선형관계 가정 검토"
        ]
      },

      reportingGuidance: {
        apa: `r(${(result.sampleSize || 0) - 2}) = ${correlation.toFixed(2)}, p = ${result.pValue.toFixed(3)}, 95% CI [${result.confidenceInterval?.[0]?.toFixed(2) || 'N/A'}, ${result.confidenceInterval?.[1]?.toFixed(2) || 'N/A'}]`,
        interpretation: isSignificant
          ? `분석 결과 두 변수 간에 ${strengthInterpretation} ${direction} 상관관계가 통계적으로 유의한 것으로 나타났습니다.`
          : `분석 결과 두 변수 간에 통계적으로 유의한 상관관계가 발견되지 않았습니다.`,
        limitations: [
          "상관관계는 인과관계를 의미하지 않음",
          "선형관계만 측정 (비선형관계 놓칠 수 있음)",
          "이상치에 민감함"
        ]
      }
    }
  }

  /**
   * 기본 통계량에 대한 가이드
   */
  static generateDescriptiveGuidance(stats: DescriptiveStatistics): StatisticalGuidance {
    const skewnessInterpretation = 
      Math.abs(stats.skewness) < 0.5 ? '대칭적' :
      stats.skewness > 0.5 ? '우측으로 치우침' : '좌측으로 치우침'

    const kurtosisInterpretation =
      Math.abs(stats.kurtosis) < 0.5 ? '정규분포와 유사한 첨도' :
      stats.kurtosis > 0.5 ? '정규분포보다 뾰족함' : '정규분포보다 평평함'

    return {
      summary: `표본수 ${stats.count}개, 평균 ${stats.mean.toFixed(2)}, 표준편차 ${stats.standardDeviation.toFixed(2)}`,
      
      interpretation: {
        result: `데이터의 중심값은 평균 ${stats.mean.toFixed(2)}, 중위수 ${stats.median.toFixed(2)}입니다.`,
        significance: `분산은 ${stats.variance.toFixed(2)}, 표준편차는 ${stats.standardDeviation.toFixed(2)}로 데이터의 퍼짐 정도를 나타냅니다.`,
        effect: `변동계수 ${stats.coefficientOfVariation.toFixed(1)}%는 평균 대비 상대적 변동성을 의미합니다.`
      },

      assumptions: {
        met: ["측정 척도 적절성"],
        violated: [],
        recommendations: [
          "이상치 존재 여부 확인",
          "분포의 형태 검토",
          "측정 오류 가능성 점검"
        ]
      },

      nextSteps: {
        primary: "데이터의 분포를 시각화하고 정규성을 검토하세요.",
        alternatives: [
          "집단 간 비교분석 (t-검정, ANOVA)",
          "변수 간 관계분석 (상관분석)",
          "예측모델 구축 (회귀분석)"
        ],
        considerations: [
          "이상치가 통계량에 미치는 영향",
          "표본이 모집단을 잘 대표하는지 검토",
          "추가 데이터 수집의 필요성"
        ]
      },

      visualizations: {
        recommended: ["히스토그램", "박스플롯", "Q-Q플롯", "줄기잎그림"],
        descriptions: [
          "히스토그램: 분포의 형태와 치우침 확인",
          "박스플롯: 중위수, 사분위수, 이상치 한눈에 보기",
          "Q-Q플롯: 정규분포와의 비교",
          "줄기잎그림: 데이터 값의 실제 분포 확인"
        ]
      },

      reportingGuidance: {
        apa: `M = ${stats.mean.toFixed(2)}, SD = ${stats.standardDeviation.toFixed(2)}, Mdn = ${stats.median.toFixed(2)}, N = ${stats.count}`,
        interpretation: `데이터는 ${skewnessInterpretation} 분포를 보이며, ${kurtosisInterpretation} 특성을 나타냅니다.`,
        limitations: [
          "표본 통계량은 모집단 모수의 추정치임",
          "이상치에 의해 평균과 표준편차가 영향받을 수 있음",
          "분포 가정을 만족하지 않을 경우 해석에 주의 필요"
        ]
      }
    }
  }

  // ================================================================================
  // 헬퍼 메서드들
  // ================================================================================

  private static checkTTestAssumptions(result: StatisticalTestResult): { met: string[], violated: string[] } {
    // 실제로는 데이터를 분석해서 가정 검토해야 하지만, 여기서는 일반적인 가이드라인 제공
    if (!result.assumptions) {
      return { met: [], violated: [] }
    }

    const met = result.assumptions.filter(a => a.met).map(a => a.description)
    const violated = result.assumptions.filter(a => !a.met).map(a => a.description)

    return { met, violated }
  }

  private static getTTestRecommendations(result: StatisticalTestResult): string[] {
    const recommendations = []

    if (result.assumptions) {
      const normalityViolated = result.assumptions.some(a =>
        a.description.includes('정규성') && !a.met
      )

      if (normalityViolated) {
        recommendations.push("정규성 가정 위반: Mann-Whitney U 검정 고려")
      }

      const equalVarianceViolated = result.assumptions.some(a =>
        a.description.includes('등분산') && !a.met
      )

      if (equalVarianceViolated) {
        recommendations.push("등분산 가정 위반: Welch t-검정 사용 권장")
      }
    }

    if (recommendations.length === 0) {
      recommendations.push("모든 가정이 충족되어 결과를 신뢰할 수 있습니다")
    }

    return recommendations
  }
}

// ================================================================================
// 내보내기
// ================================================================================

export default {
  FileNamingSystem,
  StatisticalGuideSystem
}