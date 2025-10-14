/**
 * 통계 분석 UI 설정
 * 29개 통계 함수의 UI 표시 정보와 메타데이터
 */

import {
  Calculator,
  TrendingUp,
  BarChart3,
  Zap,
  Database,
  Target,
  Users,
  Play,
  LineChart,
  PieChart,
  Shuffle,
  Brain,
  Clock,
  Activity,
  Heart,
  GitBranch
} from "lucide-react"

export interface StatisticalTest {
  id: string
  name: string
  nameEn: string
  description: string
  tooltip: string
  whenToUse: string
  example: string
  icon: any
  popularity: number // 1-5 stars
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  sampleSizeMin?: number
  dataTypes: ('continuous' | 'categorical' | 'ordinal')[]
  assumptions: string[]
  outputs: string[]
  relatedTests: string[]
}

export interface AnalysisCategory {
  id: string
  title: string
  titleEn: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  priority: number // 표시 순서
  tests: StatisticalTest[]
}

/**
 * 전체 41개 통계 분석 설정 (8개 카테고리)
 */
export const STATISTICAL_ANALYSIS_CONFIG: AnalysisCategory[] = [
  {
    id: "descriptive",
    title: "기초통계",
    titleEn: "Basic Statistics",
    description: "데이터의 기본적인 통계적 특성과 가정 검정",
    icon: Calculator,
    color: "blue",
    priority: 1,
    tests: [
      {
        id: "calculateDescriptiveStats",
        name: "기술통계량",
        nameEn: "Descriptive Statistics", 
        description: "평균, 중앙값, 표준편차, 왜도, 첨도 등",
        tooltip: "데이터의 중심경향과 분산을 파악",
        whenToUse: "• 데이터의 기본적인 특성 파악\n• 데이터 분포 확인\n• 이상치 발견",
        example: "설문조사 결과의 평균 점수와 분산 계산",
        icon: Target,
        popularity: 5,
        difficulty: 'beginner',
        dataTypes: ['continuous', 'ordinal'],
        assumptions: [],
        outputs: ['평균', '중앙값', '표준편차', '왜도', '첨도', '사분위수'],
        relatedTests: ['normalityTest']
      },
      {
        id: "normalityTest",
        name: "정규성검정",
        nameEn: "Normality Test",
        description: "Shapiro-Wilk, Anderson-Darling 정규성 검정",
        tooltip: "데이터가 정규분포를 따르는지 확인",
        whenToUse: "• 모수 검정 전 정규성 가정 확인\n• 분포의 형태 파악\n• 적절한 통계 방법 선택",
        example: "시험 점수가 정규분포를 따르는지 검정",
        icon: BarChart3,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 3,
        dataTypes: ['continuous'],
        assumptions: [],
        outputs: ['Shapiro-Wilk 통계량', 'p-값', 'Q-Q plot'],
        relatedTests: ['calculateDescriptiveStats']
      },
      {
        id: "homogeneityTest",
        name: "등분산검정",
        nameEn: "Homogeneity Test",
        description: "Levene, Bartlett 등분산성 검정",
        tooltip: "여러 그룹의 분산이 동일한지 확인",
        whenToUse: "• t-검정, ANOVA 전 등분산 가정 확인\n• 그룹 간 변동성 비교\n• 적절한 검정 방법 선택",
        example: "세 그룹의 성적 분산이 같은지 검정",
        icon: BarChart3,
        popularity: 3,
        difficulty: 'intermediate',
        sampleSizeMin: 10,
        dataTypes: ['continuous'],
        assumptions: [],
        outputs: ['Levene 통계량', 'p-값', '그룹별 분산'],
        relatedTests: ['oneWayANOVA', 'twoSampleTTest']
      },
      {
        id: "outlierDetection",
        name: "이상치 탐지",
        nameEn: "Outlier Detection",
        description: "IQR, Z-score 기반 이상치 탐지",
        tooltip: "데이터의 이상치를 다양한 방법으로 탐지",
        whenToUse: "• 데이터 품질 확인\n• 분석 전 이상치 처리\n• 극단값 식별",
        example: "극단적으로 높거나 낮은 판매액 탐지",
        icon: Target,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 10,
        dataTypes: ['continuous'],
        assumptions: [],
        outputs: ['이상치 개수', '이상치 인덱스', '정상 범위'],
        relatedTests: ['calculateDescriptiveStats']
      },
      {
        id: "powerAnalysis",
        name: "검정력 분석",
        nameEn: "Power Analysis",
        description: "표본 크기, 효과 크기, 검정력 계산",
        tooltip: "연구에 필요한 최소 표본 크기 결정",
        whenToUse: "• 연구 계획 단계\n• 표본 크기 결정\n• 사후 검정력 평가",
        example: "임상시험에 필요한 최소 참가자 수 계산",
        icon: Zap,
        popularity: 3,
        difficulty: 'advanced',
        dataTypes: ['continuous'],
        assumptions: [],
        outputs: ['필요 표본 크기', '검정력', '효과 크기'],
        relatedTests: ['twoSampleTTest', 'oneWayANOVA']
      }
    ]
  },
  {
    id: "hypothesis",
    title: "가설검정",
    titleEn: "Hypothesis Testing",
    description: "평균 비교와 상관 분석을 위한 검정",
    icon: TrendingUp,
    color: "green",
    priority: 2,
    tests: [
      {
        id: "oneSampleTTest",
        name: "일표본 t-검정",
        nameEn: "One-sample t-test",
        description: "표본 평균과 모집단 평균(기준값) 비교",
        tooltip: "알려진 기준값과 표본 평균을 비교",
        whenToUse: "• 표본 평균이 특정 기준값과 다른지 확인\n• 정규분포 연속형 데이터\n• 표본 크기 30개 이상 권장",
        example: "학생들의 평균 시험점수가 70점과 다른지 검정",
        icon: Target,
        popularity: 4,
        difficulty: 'beginner',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '독립성'],
        outputs: ['t 통계량', 'p-값', '신뢰구간', 'Cohen\'s d'],
        relatedTests: ['twoSampleTTest', 'pairedTTest']
      },
      {
        id: "twoSampleTTest",
        name: "독립표본 t-검정",
        nameEn: "Independent t-test",
        description: "두 독립 그룹의 평균 비교",
        tooltip: "서로 다른 두 그룹의 평균이 같은지 비교",
        whenToUse: "• 두 독립된 그룹 평균 비교\n• 연속형 종속변수\n• 정규분포, 등분산 가정",
        example: "남학생과 여학생의 평균 키 차이 검정",
        icon: Users,
        popularity: 5,
        difficulty: 'beginner',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '등분산성', '독립성'],
        outputs: ['t 통계량', 'p-값', '신뢰구간', 'Cohen\'s d'],
        relatedTests: ['oneSampleTTest', 'welchTTest', 'mannWhitneyU']
      },
      {
        id: "pairedTTest",
        name: "대응표본 t-검정",
        nameEn: "Paired t-test",
        description: "동일 대상의 전후 측정값 비교",
        tooltip: "같은 대상에서 두 번 측정한 값의 차이 검정",
        whenToUse: "• 동일 대상의 전후 비교\n• 쌍을 이룬 데이터\n• 차이값의 정규성 가정",
        example: "치료 전후 혈압 변화 검정",
        icon: Activity,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 20,
        dataTypes: ['continuous'],
        assumptions: ['차이값 정규성', '독립성'],
        outputs: ['t 통계량', 'p-값', '신뢰구간', 'Cohen\'s d'],
        relatedTests: ['wilcoxonSignedRank', 'oneSampleTTest']
      },
      {
        id: "welchTTest",
        name: "Welch t-검정",
        nameEn: "Welch's t-test",
        description: "등분산성을 가정하지 않는 독립표본 t-검정",
        tooltip: "두 그룹의 분산이 다를 때 사용하는 t-검정",
        whenToUse: "• 두 그룹 분산이 다른 경우\n• 등분산 가정 위반 시\n• 표본 크기가 다른 경우",
        example: "분산이 다른 두 그룹의 평균 비교",
        icon: BarChart3,
        popularity: 3,
        difficulty: 'intermediate',
        sampleSizeMin: 20,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '독립성'],
        outputs: ['t 통계량', 'p-값', '신뢰구간', 'Cohen\'s d'],
        relatedTests: ['twoSampleTTest', 'homogeneityTest']
      },
      {
        id: "correlationAnalysis",
        name: "상관분석",
        nameEn: "Correlation Analysis",
        description: "변수 간 선형 관계의 강도와 방향",
        tooltip: "Pearson, Spearman 상관계수 계산",
        whenToUse: "• 두 변수 관계 강도 파악\n• 연속형 또는 순서형 데이터\n• 예측 모델 전 탐색",
        example: "키와 몸무게의 상관관계",
        icon: LineChart,
        popularity: 5,
        difficulty: 'beginner',
        sampleSizeMin: 20,
        dataTypes: ['continuous', 'ordinal'],
        assumptions: ['Pearson: 정규성', 'Spearman: 단조성'],
        outputs: ['상관계수', 'p-값', '신뢰구간', '산점도'],
        relatedTests: ['simpleLinearRegression']
      },
      {
        id: "partialCorrelation",
        name: "편상관분석",
        nameEn: "Partial Correlation",
        description: "제3변수의 영향을 제거한 상관관계",
        tooltip: "다른 변수를 통제한 순수한 상관관계",
        whenToUse: "• 교란변수 통제\n• 순수한 관계 파악\n• 다중공선성 확인",
        example: "나이를 통제한 소득과 건강의 상관관계",
        icon: GitBranch,
        popularity: 3,
        difficulty: 'advanced',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '선형성'],
        outputs: ['편상관계수', 'p-값', '통제변수 효과'],
        relatedTests: ['correlationAnalysis', 'multipleRegression']
      },
      {
        id: "effectSize",
        name: "효과크기",
        nameEn: "Effect Size",
        description: "Cohen's d, eta-squared 등 효과크기 계산",
        tooltip: "통계적 유의성을 넘어 실질적 중요성 평가",
        whenToUse: "• 실질적 차이 평가\n• 메타분석\n• 검정력 분석",
        example: "치료 효과의 실제적 크기 평가",
        icon: Zap,
        popularity: 3,
        difficulty: 'intermediate',
        dataTypes: ['continuous'],
        assumptions: [],
        outputs: ['Cohen\'s d', 'eta-squared', '해석 기준'],
        relatedTests: ['twoSampleTTest', 'oneWayANOVA']
      },
      {
        id: "oneSampleProportionTest",
        name: "일표본 비율검정",
        nameEn: "One-sample Proportion Test",
        description: "관측 비율과 기준 비율 비교",
        tooltip: "표본 비율이 특정 기준값과 다른지 검정",
        whenToUse: "• 성공률/불량률 검정\n• 목표 달성 여부\n• 이진 데이터 분석",
        example: "생존율이 목표 85%에 도달했는지 검정",
        icon: Target,
        popularity: 4,
        difficulty: 'beginner',
        sampleSizeMin: 30,
        dataTypes: ['categorical'],
        assumptions: ['독립성', '충분한 표본 크기 (np≥5, n(1-p)≥5)'],
        outputs: ['z 통계량', 'p-값', '신뢰구간', '관측 비율'],
        relatedTests: ['chiSquareTest', 'twoSampleTTest']
      }
    ]
  },
  {
    id: "anova",
    title: "분산분석",
    titleEn: "ANOVA",
    description: "다중 그룹 비교와 요인 분석",
    icon: BarChart3,
    color: "purple",
    priority: 4,
    tests: [
      {
        id: "oneWayANOVA",
        name: "일원분산분석",
        nameEn: "One-way ANOVA",
        description: "3개 이상 독립 그룹의 평균 비교",
        tooltip: "3개 이상의 독립된 그룹 평균을 동시에 비교",
        whenToUse: "• 3개 이상 독립 그룹 비교\n• 연속형 종속변수\n• 정규성, 등분산성 가정",
        example: "A, B, C 세 가지 치료법의 효과 비교",
        icon: BarChart3,
        popularity: 5,
        difficulty: 'intermediate',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '등분산성', '독립성'],
        outputs: ['F 통계량', 'p-값', 'eta-squared', '사후검정'],
        relatedTests: ['tukeyHSD', 'bonferroniPostHoc', 'kruskalWallis']
      },
      {
        id: "twoWayANOVA",
        name: "이원분산분석",
        nameEn: "Two-way ANOVA",
        description: "두 독립변수의 주효과와 상호작용 분석",
        tooltip: "두 요인이 종속변수에 미치는 영향과 상호작용 분석",
        whenToUse: "• 두 개 독립변수 동시 분석\n• 상호작용 효과 확인\n• 실험 설계 분석",
        example: "성별과 교육방법이 성취도에 미치는 영향",
        icon: PieChart,
        popularity: 4,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '등분산성', '독립성'],
        outputs: ['F 통계량', 'p-값', '주효과', '상호작용 효과'],
        relatedTests: ['oneWayANOVA', 'tukeyHSD']
      },
      {
        id: "tukeyHSD",
        name: "Tukey HSD 사후검정",
        nameEn: "Tukey HSD Post-hoc",
        description: "ANOVA 후 모든 쌍 비교",
        tooltip: "ANOVA 유의 시 어느 그룹이 다른지 확인",
        whenToUse: "• ANOVA 유의 후 사후검정\n• 모든 그룹 쌍별 비교\n• 등분산성 가정 충족 시",
        example: "세 치료법 중 어느 것이 더 효과적인지",
        icon: Target,
        popularity: 4,
        difficulty: 'intermediate',
        dataTypes: ['continuous'],
        assumptions: ['등분산성'],
        outputs: ['쌍별 p-값', '신뢰구간', '평균 차이'],
        relatedTests: ['oneWayANOVA', 'bonferroniPostHoc', 'gamesHowellPostHoc']
      },
      {
        id: "bonferroniPostHoc",
        name: "Bonferroni 사후검정",
        nameEn: "Bonferroni Post-hoc",
        description: "보수적인 다중비교 보정",
        tooltip: "다중비교로 인한 1종 오류율 엄격 통제",
        whenToUse: "• 엄격한 다중비교 보정\n• 1종 오류 최소화\n• 탐색적 분석",
        example: "여러 약물의 효과 비교 (보수적 접근)",
        icon: Target,
        popularity: 3,
        difficulty: 'intermediate',
        dataTypes: ['continuous'],
        assumptions: ['등분산성'],
        outputs: ['조정된 p-값', '신뢰구간'],
        relatedTests: ['tukeyHSD', 'gamesHowellPostHoc']
      },
      {
        id: "gamesHowellPostHoc",
        name: "Games-Howell 사후검정",
        nameEn: "Games-Howell Post-hoc",
        description: "등분산 가정 없는 사후검정",
        tooltip: "그룹 간 분산이 다를 때 사용하는 사후검정",
        whenToUse: "• 등분산 가정 위반 시\n• 표본 크기가 다른 경우\n• Welch ANOVA 후",
        example: "분산이 다른 그룹들의 쌍별 비교",
        icon: BarChart3,
        popularity: 3,
        difficulty: 'advanced',
        dataTypes: ['continuous'],
        assumptions: ['정규성만 (등분산성 불요)'],
        outputs: ['조정된 p-값', '신뢰구간'],
        relatedTests: ['welchTTest', 'tukeyHSD']
      },
      {
        id: "repeatedMeasuresANOVA",
        name: "반복측정 분산분석",
        nameEn: "Repeated Measures ANOVA",
        description: "동일 대상의 반복 측정값 분석",
        tooltip: "시간에 따른 변화나 조건별 차이 분석",
        whenToUse: "• 시간별 반복 측정\n• 피험자내 설계\n• 종단 연구",
        example: "3개월마다 측정한 체중 변화 분석",
        icon: Clock,
        popularity: 3,
        difficulty: 'advanced',
        sampleSizeMin: 20,
        dataTypes: ['continuous'],
        assumptions: ['구형성', '정규성'],
        outputs: ['F 통계량', 'p-값', '구형성 검정', 'epsilon'],
        relatedTests: ['pairedTTest', 'friedman']
      },
      {
        id: "manova",
        name: "다변량 분산분석",
        nameEn: "MANOVA",
        description: "여러 종속변수를 동시에 분석",
        tooltip: "다수의 종속변수에 대한 그룹 차이 검정",
        whenToUse: "• 여러 종속변수 동시 분석\n• 다변량 그룹 비교\n• 종속변수 간 상관 고려",
        example: "수학, 영어, 과학 점수를 동시에 그룹 비교",
        icon: GitBranch,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['다변량 정규성', '공분산 동질성'],
        outputs: ['Wilks\' Lambda', 'Pillai\'s trace', 'F 통계량', 'p-값'],
        relatedTests: ['oneWayANOVA', 'twoWayANOVA']
      },
      {
        id: "mixedEffectsModel",
        name: "혼합효과 모형",
        nameEn: "Mixed Effects Model",
        description: "고정효과와 무작위효과를 모두 고려",
        tooltip: "계층적 데이터나 반복측정 데이터 분석",
        whenToUse: "• 계층적 데이터 구조\n• 반복측정 데이터\n• 개체 간/내 변동 모두 고려",
        example: "학생(학교 내) 성적에 대한 교수법 효과",
        icon: Database,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['정규성', '선형성'],
        outputs: ['고정효과', '무작위효과', 'ICC', 'AIC/BIC'],
        relatedTests: ['repeatedMeasuresANOVA', 'multipleRegression']
      }
    ]
  },
  {
    id: "regression",
    title: "회귀분석",
    titleEn: "Regression Analysis",
    description: "예측 모델링과 변수 간 관계 분석",
    icon: LineChart,
    color: "indigo",
    priority: 4,
    tests: [
      {
        id: "simpleLinearRegression",
        name: "단순선형회귀",
        nameEn: "Simple Linear Regression",
        description: "한 독립변수로 종속변수 예측",
        tooltip: "X와 Y의 선형 관계 모델링",
        whenToUse: "• 두 연속변수 예측 관계\n• 선형 관계 가정\n• 잔차 정규성 확인",
        example: "공부시간으로 시험점수 예측",
        icon: LineChart,
        popularity: 5,
        difficulty: 'intermediate',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['선형성', '정규성', '등분산성', '독립성'],
        outputs: ['회귀계수', 'R²', 'p-값', '예측값'],
        relatedTests: ['correlationAnalysis', 'multipleRegression']
      },
      {
        id: "multipleRegression",
        name: "다중회귀분석",
        nameEn: "Multiple Regression",
        description: "여러 독립변수로 종속변수 예측",
        tooltip: "복합적 요인의 영향을 동시에 분석",
        whenToUse: "• 여러 독립변수 동시 분석\n• 변수 간 기여도 비교\n• 예측 모델 구축",
        example: "나이, 소득, 학력으로 만족도 예측",
        icon: PieChart,
        popularity: 4,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['선형성', '정규성', '등분산성', '독립성', '다중공선성 없음'],
        outputs: ['회귀계수', 'R²', 'F 통계량', 'VIF'],
        relatedTests: ['simpleLinearRegression', 'correlationAnalysis']
      },
      {
        id: "logisticRegression",
        name: "로지스틱회귀",
        nameEn: "Logistic Regression",
        description: "이진 결과 예측 모델",
        tooltip: "범주형 종속변수 예측 (합격/불합격 등)",
        whenToUse: "• 이진 종속변수 예측\n• 확률 모델링\n• 분류 문제 해결",
        example: "성적, 출석으로 합격 확률 예측",
        icon: Target,
        popularity: 4,
        difficulty: 'advanced',
        sampleSizeMin: 100,
        dataTypes: ['continuous', 'categorical'],
        assumptions: ['선형성 (logit)', '독립성', '다중공선성 없음'],
        outputs: ['Odds Ratio', '계수', 'p-값', '예측 확률'],
        relatedTests: ['multipleRegression', 'chiSquareTest']
      },
      {
        id: "polynomialRegression",
        name: "다항회귀분석",
        nameEn: "Polynomial Regression",
        description: "비선형 관계를 다항식으로 모델링",
        tooltip: "곡선 관계를 가진 데이터 분석",
        whenToUse: "• 비선형 관계\n• 곡선 패턴\n• 복잡한 추세",
        example: "나이와 소득의 곡선 관계 모델링",
        icon: TrendingUp,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['독립성', '등분산성'],
        outputs: ['다항계수', 'R²', '예측값', 'AIC/BIC'],
        relatedTests: ['simpleLinearRegression', 'multipleRegression']
      }
    ]
  },
  {
    id: "nonparametric",
    title: "비모수검정",
    titleEn: "Nonparametric Tests",
    description: "분포 가정 없는 강건한 검정",
    icon: Shuffle,
    color: "teal",
    priority: 6,
    tests: [
      {
        id: "mannWhitneyU",
        name: "Mann-Whitney U 검정",
        nameEn: "Mann-Whitney U Test",
        description: "두 독립 그룹의 순위 비교 (비모수)",
        tooltip: "정규성 가정 없이 두 그룹 비교",
        whenToUse: "• 정규성 가정 위반 시\n• 순서형 데이터\n• 소표본 크기",
        example: "두 그룹의 만족도 순위 비교",
        icon: Users,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 10,
        dataTypes: ['ordinal', 'continuous'],
        assumptions: ['독립성만'],
        outputs: ['U 통계량', 'p-값', '순위합'],
        relatedTests: ['twoSampleTTest', 'wilcoxonSignedRank']
      },
      {
        id: "wilcoxonSignedRank",
        name: "Wilcoxon 부호순위검정",
        nameEn: "Wilcoxon Signed-rank Test",
        description: "대응표본의 비모수 검정",
        tooltip: "정규성 가정 없이 전후 비교",
        whenToUse: "• 대응표본 비모수 분석\n• 차이값 정규성 위반\n• 순서형 데이터",
        example: "치료 전후 증상 순위 변화",
        icon: Activity,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 10,
        dataTypes: ['ordinal', 'continuous'],
        assumptions: ['대칭성 (약)'],
        outputs: ['W 통계량', 'p-값', '순위합'],
        relatedTests: ['pairedTTest', 'mannWhitneyU']
      },
      {
        id: "kruskalWallis",
        name: "Kruskal-Wallis 검정",
        nameEn: "Kruskal-Wallis Test",
        description: "3개 이상 그룹의 비모수 비교",
        tooltip: "정규성 가정 없는 다중 그룹 비교",
        whenToUse: "• 3개 이상 그룹 비모수 비교\n• ANOVA 가정 위반 시\n• 순서형 데이터",
        example: "세 치료법의 효과 순위 비교",
        icon: BarChart3,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 15,
        dataTypes: ['ordinal', 'continuous'],
        assumptions: ['독립성', '동일 분포 형태'],
        outputs: ['H 통계량', 'p-값', '순위 평균'],
        relatedTests: ['oneWayANOVA', 'dunnTest']
      },
      {
        id: "dunnTest",
        name: "Dunn 사후검정",
        nameEn: "Dunn's Post-hoc Test",
        description: "Kruskal-Wallis 후 쌍별 비교",
        tooltip: "비모수 다중 비교 사후검정",
        whenToUse: "• Kruskal-Wallis 유의 후\n• 비모수 쌍별 비교\n• 순위 기반 분석",
        example: "어느 치료법이 더 효과적인지 (비모수)",
        icon: Target,
        popularity: 3,
        difficulty: 'advanced',
        dataTypes: ['ordinal', 'continuous'],
        assumptions: ['독립성'],
        outputs: ['Z 통계량', '조정된 p-값'],
        relatedTests: ['kruskalWallis', 'tukeyHSD']
      },
      {
        id: "chiSquareTest",
        name: "카이제곱검정",
        nameEn: "Chi-square Test",
        description: "범주형 변수의 독립성/적합도 검정",
        tooltip: "범주별 빈도의 독립성이나 적합도 검정",
        whenToUse: "• 범주형 변수 관계\n• 독립성 검정\n• 적합도 검정",
        example: "성별과 선호도의 독립성 검정",
        icon: PieChart,
        popularity: 4,
        difficulty: 'intermediate',
        sampleSizeMin: 20,
        dataTypes: ['categorical'],
        assumptions: ['기대빈도 ≥ 5'],
        outputs: ['χ² 통계량', 'p-값', '잔차', 'Cramér V'],
        relatedTests: ['logisticRegression']
      },
      {
        id: "friedman",
        name: "Friedman 검정",
        nameEn: "Friedman Test",
        description: "반복측정 자료의 비모수 검정",
        tooltip: "블록 설계나 반복측정 데이터의 비모수 분석",
        whenToUse: "• 반복측정 비모수 데이터\n• 순위형 데이터\n• 정규성 가정 위반",
        example: "심사위원들의 순위 평가 일치도",
        icon: Shuffle,
        popularity: 3,
        difficulty: 'intermediate',
        sampleSizeMin: 10,
        dataTypes: ['ordinal', 'continuous'],
        assumptions: ['관련 표본'],
        outputs: ['χ² 통계량', 'p-값', '켄달의 W'],
        relatedTests: ['repeatedMeasuresANOVA', 'wilcoxonSignedRank']
      }
    ]
  },
  {
    id: "timeseries",
    title: "시계열분석",
    titleEn: "Time Series Analysis",
    description: "시간에 따른 데이터 패턴 분석과 예측",
    icon: Clock,
    color: "orange",
    priority: 6,
    tests: [
      {
        id: "timeSeriesDecomposition",
        name: "시계열 분해",
        nameEn: "Time Series Decomposition",
        description: "추세, 계절성, 잔차 성분 분리",
        tooltip: "시계열 데이터의 구성 요소 분석",
        whenToUse: "• 시계열 패턴 파악\n• 추세와 계절성 분리\n• 예측 모델 전처리",
        example: "월별 매출의 추세와 계절성 분석",
        icon: Clock,
        popularity: 3,
        difficulty: 'advanced',
        sampleSizeMin: 24,
        dataTypes: ['continuous'],
        assumptions: ['시간 순서'],
        outputs: ['추세', '계절성', '잔차', '그래프'],
        relatedTests: ['arimaForecast']
      },
      {
        id: "arimaForecast",
        name: "ARIMA 예측",
        nameEn: "ARIMA Forecasting",
        description: "자기회귀 통합 이동평균 예측 모델",
        tooltip: "시계열 데이터의 미래값 예측",
        whenToUse: "• 시계열 예측\n• 정상성 시계열\n• 단변량 예측",
        example: "과거 매출로 미래 매출 예측",
        icon: TrendingUp,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['정상성', '자기상관 구조'],
        outputs: ['예측값', '신뢰구간', '모델 파라미터'],
        relatedTests: ['timeSeriesDecomposition', 'sarimaForecast']
      },
      {
        id: "sarimaForecast",
        name: "SARIMA 예측",
        nameEn: "SARIMA Forecasting",
        description: "계절성을 고려한 ARIMA 모델",
        tooltip: "계절 패턴이 있는 시계열 예측",
        whenToUse: "• 계절성 시계열\n• 주기적 패턴\n• 복잡한 시계열",
        example: "계절 변동이 있는 판매량 예측",
        icon: Activity,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 60,
        dataTypes: ['continuous'],
        assumptions: ['정상성', '계절성'],
        outputs: ['예측값', '계절 파라미터', 'AIC/BIC'],
        relatedTests: ['arimaForecast', 'timeSeriesDecomposition']
      },
      {
        id: "varModel",
        name: "VAR 모델",
        nameEn: "Vector Autoregression",
        description: "다변량 시계열의 상호 의존성 분석",
        tooltip: "여러 시계열 변수 간 동적 관계 모델링",
        whenToUse: "• 다변량 시계열\n• 변수 간 상호작용\n• 충격반응 분석",
        example: "환율, 금리, 주가의 상호 영향 분석",
        icon: GitBranch,
        popularity: 1,
        difficulty: 'advanced',
        sampleSizeMin: 100,
        dataTypes: ['continuous'],
        assumptions: ['정상성', '선형성'],
        outputs: ['계수행렬', 'Granger 인과성', '충격반응함수'],
        relatedTests: ['arimaForecast', 'correlationAnalysis']
      }
    ]
  },
  {
    id: "survival",
    title: "생존분석",
    titleEn: "Survival Analysis",
    description: "시간-사건 데이터와 생존 함수 분석",
    icon: Heart,
    color: "rose",
    priority: 7,
    tests: [
      {
        id: "kaplanMeierSurvival",
        name: "Kaplan-Meier 생존분석",
        nameEn: "Kaplan-Meier Survival",
        description: "생존 시간과 생존율 추정",
        tooltip: "시간-사건 데이터의 생존 함수 추정",
        whenToUse: "• 생존 시간 분석\n• 의학/신뢰성 연구\n• 중도절단 데이터",
        example: "치료 후 생존율 곡선 분석",
        icon: Activity,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['비정보적 중도절단'],
        outputs: ['생존곡선', '중앙생존시간', 'Log-rank 검정'],
        relatedTests: ['coxRegression']
      },
      {
        id: "coxRegression",
        name: "Cox 비례위험 모형",
        nameEn: "Cox Regression",
        description: "생존 시간에 영향을 미치는 요인 분석",
        tooltip: "공변량이 생존에 미치는 영향 평가",
        whenToUse: "• 생존 예측 모델\n• 위험 요인 분석\n• 공변량 조정",
        example: "나이, 병기가 생존율에 미치는 영향",
        icon: Heart,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous', 'categorical'],
        assumptions: ['비례위험 가정'],
        outputs: ['위험비', '회귀계수', '생존곡선'],
        relatedTests: ['kaplanMeierSurvival', 'logisticRegression']
      }
    ]
  },
  {
    id: "multivariate",
    title: "다변량/기타",
    titleEn: "Multivariate & Others",
    description: "차원축소, 군집분석 등 고급 다변량 기법",
    icon: Brain,
    color: "purple",
    priority: 8,
    tests: [
      {
        id: "principalComponentAnalysis",
        name: "주성분분석",
        nameEn: "Principal Component Analysis",
        description: "차원축소와 데이터 구조 파악",
        tooltip: "다변량 데이터의 주요 패턴 추출",
        whenToUse: "• 고차원 데이터 축소\n• 변수 간 구조 파악\n• 데이터 시각화",
        example: "설문 문항들의 주요 차원 발견",
        icon: Brain,
        popularity: 3,
        difficulty: 'advanced',
        sampleSizeMin: 100,
        dataTypes: ['continuous'],
        assumptions: ['선형성', '다변량 정규성 권장'],
        outputs: ['주성분', '설명분산', 'Loadings'],
        relatedTests: ['kMeansClustering']
      },
      {
        id: "kMeansClustering",
        name: "K-평균 군집분석",
        nameEn: "K-means Clustering",
        description: "유사한 관측치들의 그룹 발견",
        tooltip: "데이터를 K개의 동질적 그룹으로 분류",
        whenToUse: "• 고객 세분화\n• 패턴 발견\n• 시장 세그멘테이션",
        example: "고객을 구매 패턴별로 그룹화",
        icon: Users,
        popularity: 3,
        difficulty: 'advanced',
        sampleSizeMin: 50,
        dataTypes: ['continuous'],
        assumptions: ['구형 클러스터', '유사한 크기'],
        outputs: ['클러스터 중심', '소속 그룹', 'WCSS'],
        relatedTests: ['hierarchicalClustering', 'principalComponentAnalysis']
      },
      {
        id: "hierarchicalClustering",
        name: "계층적 군집분석",
        nameEn: "Hierarchical Clustering",
        description: "계층 구조의 클러스터 형성",
        tooltip: "덴드로그램을 통한 계층적 그룹 구조",
        whenToUse: "• 클러스터 수 미지 시\n• 계층 구조 파악\n• 탐색적 분석",
        example: "종의 진화적 관계 분석",
        icon: BarChart3,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 30,
        dataTypes: ['continuous'],
        assumptions: ['거리 측도의 적절성'],
        outputs: ['덴드로그램', '클러스터', '결합 거리'],
        relatedTests: ['kMeansClustering']
      },
      {
        id: "factorAnalysis",
        name: "요인분석",
        nameEn: "Factor Analysis",
        description: "잠재변수 발견과 차원 축소",
        tooltip: "관측변수 뒤의 잠재요인 추출",
        whenToUse: "• 잠재변수 발견\n• 설문 문항 축소\n• 구조 파악",
        example: "성격 검사 문항의 5대 요인 추출",
        icon: Brain,
        popularity: 2,
        difficulty: 'advanced',
        sampleSizeMin: 100,
        dataTypes: ['continuous'],
        assumptions: ['선형성', '정규성'],
        outputs: ['요인적재량', '공통성', '설명분산'],
        relatedTests: ['principalComponentAnalysis']
      }
    ]
  }
]

/**
 * 인기도 기반 추천 시스템
 */
export function getPopularTests(limit: number = 6): StatisticalTest[] {
  return STATISTICAL_ANALYSIS_CONFIG
    .flatMap(category => category.tests)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
}

/**
 * 난이도별 필터
 */
export function getTestsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): StatisticalTest[] {
  return STATISTICAL_ANALYSIS_CONFIG
    .flatMap(category => category.tests)
    .filter(test => test.difficulty === difficulty)
}

/**
 * 데이터 타입별 추천
 */
export function getTestsByDataType(dataType: 'continuous' | 'categorical' | 'ordinal'): StatisticalTest[] {
  return STATISTICAL_ANALYSIS_CONFIG
    .flatMap(category => category.tests)
    .filter(test => test.dataTypes.includes(dataType))
}

/**
 * 검색 기능
 */
export function searchTests(query: string): StatisticalTest[] {
  const lowerQuery = query.toLowerCase()
  return STATISTICAL_ANALYSIS_CONFIG
    .flatMap(category => category.tests)
    .filter(test => 
      test.name.toLowerCase().includes(lowerQuery) ||
      test.nameEn.toLowerCase().includes(lowerQuery) ||
      test.description.toLowerCase().includes(lowerQuery) ||
      test.tooltip.toLowerCase().includes(lowerQuery)
    )
}