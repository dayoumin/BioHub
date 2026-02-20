/**
 * 50개 통계 방법 매핑 및 카테고리 정의
 */

import type { StatisticalMethod } from '@/types/smart-flow'

export type { StatisticalMethod } from '@/types/smart-flow'

export const QUESTION_TYPES = [
  {
    id: 'comparison',
    name: '차이/비교 분석',
    icon: '📊',
    description: '두 개 이상 그룹 간 차이 검정',
    methods: ['t-test', 'anova', 'nonparametric']
  },
  {
    id: 'relationship',
    name: '관계/예측 분석',
    icon: '📈',
    description: '변수 간 관계 파악 및 예측',
    methods: ['correlation', 'regression']
  },
  {
    id: 'frequency',
    name: '빈도/분포 분석',
    icon: '📋',
    description: '범주형 자료 분석 및 적합도',
    methods: ['chi-square', 'descriptive']
  },
  {
    id: 'advanced',
    name: '고급/특수 분석',
    icon: '🔬',
    description: '차원축소, 군집, 시계열, 설계 등',
    methods: ['pca', 'clustering', 'timeseries', 'survival', 'advanced', 'psychometrics', 'design']
  }
]

export const STATISTICAL_METHODS: StatisticalMethod[] = [
  // 기술통계 (3개)
  {
    id: 'descriptive-stats',
    name: '기술통계량',
    description: '평균, 중앙값, 표준편차 등 기본 통계',
    category: 'descriptive',
    requirements: {
      minSampleSize: 1,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'normality-test',
    name: 'Shapiro-Wilk 정규성 검정',
    description: '데이터의 정규분포 여부 검정',
    category: 'descriptive',
    requirements: {
      minSampleSize: 3,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'homogeneity-test',
    name: 'Levene 등분산성 검정',
    description: '그룹 간 분산의 동일성 검정',
    category: 'descriptive',
    requirements: {
      minSampleSize: 4,
      variableTypes: ['numeric', 'categorical']
    }
  },

  // T-검정 (4개)
  {
    id: 'one-sample-t',
    name: '일표본 t-검정',
    description: '한 그룹의 평균이 특정값과 다른지 검정',
    category: 't-test',
    requirements: {
      minSampleSize: 2,
      variableTypes: ['numeric'],
      assumptions: ['정규성']
    }
  },
  {
    id: 'two-sample-t',
    name: '독립표본 t-검정',
    description: '두 독립 그룹 간 평균 차이 검정',
    category: 't-test',
    requirements: {
      minSampleSize: 4,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성']
    }
  },
  {
    id: 'paired-t',
    name: '대응표본 t-검정',
    description: '같은 대상의 전후 차이 검정',
    category: 't-test',
    requirements: {
      minSampleSize: 2,
      variableTypes: ['numeric'],
      assumptions: ['정규성']
    }
  },
  {
    id: 'welch-t',
    name: "Welch's t-검정",
    description: '등분산 가정 없는 두 그룹 비교',
    category: 't-test',
    requirements: {
      minSampleSize: 4,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성']
    }
  },

  // ANOVA & 사후검정 (5개)
  {
    id: 'one-way-anova',
    name: '일원분산분석',
    description: '3개 이상 그룹 간 평균 차이 검정',
    category: 'anova',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성']
    }
  },
  {
    id: 'two-way-anova',
    name: '이원분산분석',
    description: '2개 요인의 효과 분석',
    category: 'anova',
    requirements: {
      minSampleSize: 8,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성']
    }
  },
  {
    id: 'tukey-hsd',
    name: 'Tukey HSD',
    description: 'ANOVA 후 다중비교',
    category: 'anova',
    subcategory: 'posthoc',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'bonferroni',
    name: 'Bonferroni 보정',
    description: '다중비교 보정',
    category: 'anova',
    subcategory: 'posthoc',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'games-howell',
    name: 'Games-Howell',
    description: '등분산 가정 없는 사후검정',
    category: 'anova',
    subcategory: 'posthoc',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical']
    }
  },

  // 회귀 & 상관 (4개)
  {
    id: 'simple-regression',
    name: '단순선형회귀',
    description: '하나의 예측변수로 종속변수 예측',
    category: 'regression',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric'],
      assumptions: ['선형성', '정규성', '등분산성']
    }
  },
  {
    id: 'multiple-regression',
    name: '다중회귀분석',
    description: '여러 예측변수로 종속변수 예측',
    category: 'regression',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['numeric'],
      assumptions: ['선형성', '정규성', '등분산성', '다중공선성']
    }
  },
  {
    id: 'logistic-regression',
    name: '로지스틱 회귀',
    description: '이진 종속변수 예측',
    category: 'regression',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'correlation',
    name: '상관분석',
    description: 'Pearson/Spearman 상관계수',
    category: 'correlation',
    requirements: {
      minSampleSize: 3,
      variableTypes: ['numeric']
    }
  },

  // 비모수 검정 (5개)
  {
    id: 'mann-whitney',
    name: 'Mann-Whitney U',
    description: '독립 두 그룹 비모수 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 4,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'wilcoxon',
    name: 'Wilcoxon 부호순위',
    description: '대응표본 비모수 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 5,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis',
    description: '3개 이상 그룹 비모수 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'dunn-test',
    name: 'Dunn 검정',
    description: 'Kruskal-Wallis 사후검정',
    category: 'nonparametric',
    subcategory: 'posthoc',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'chi-square',
    name: '카이제곱 검정',
    description: '범주형 변수 독립성 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['categorical']
    }
  },

  // 고급 분석 (6개)
  {
    id: 'pca',
    name: '주성분분석',
    description: '차원 축소 및 변수 요약',
    category: 'pca',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'k-means',
    name: 'K-평균 군집',
    description: '데이터 그룹화',
    category: 'clustering',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'hierarchical',
    name: '계층적 군집',
    description: '계층구조 군집 분석',
    category: 'clustering',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['numeric']
    }
  },
  // 기타 검정 (5개)
  {
    id: 'proportion-test',
    name: '비율 검정',
    description: '두 비율 간 차이 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'binomial-test',
    name: '이항 검정',
    description: '관찰된 비율이 기댓값과 일치하는지 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 5,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'sign-test',
    name: '부호 검정',
    description: '중앙값 기반 비모수 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 5,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'runs-test',
    name: 'Runs 검정',
    description: '데이터 무작위성 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['categorical', 'numeric']
    }
  },
  {
    id: 'ks-test',
    name: 'Kolmogorov-Smirnov 검정',
    description: '두 분포의 동일성 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric']
    }
  },

  // 필수 추가 (10개)
  {
    id: 'ancova',
    name: '공분산분석 (ANCOVA)',
    description: '공변량을 통제한 그룹 비교',
    category: 'anova',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성', '공변량-종속변수 선형성']
    }
  },
  {
    id: 'friedman',
    name: 'Friedman 검정',
    description: '반복측정 비모수 검정 (3개 이상 조건)',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 5,
      variableTypes: ['numeric'],
      assumptions: []
    }
  },
  {
    id: 'chi-square-goodness',
    name: '카이제곱 적합도 검정',
    description: '관찰 빈도가 기댓값과 일치하는지 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'mcnemar',
    name: 'McNemar 검정',
    description: '대응표본 범주형 자료 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'cochran-q',
    name: 'Cochran Q 검정',
    description: '3개 이상 반복측정 이분형 자료',
    category: 'chi-square',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'mann-kendall',
    name: 'Mann-Kendall 추세검정',
    description: '시계열 데이터 추세 유무 검정',
    category: 'timeseries',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric', 'date']
    }
  },
  {
    id: 'manova',
    name: '다변량 분산분석 (MANOVA)',
    description: '2개 이상 종속변수의 그룹 차이',
    category: 'anova',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'mixed-model',
    name: '혼합효과모형',
    description: '고정효과 + 랜덤효과 분석',
    category: 'advanced',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'discriminant',
    name: '판별분석 (LDA/QDA)',
    description: '그룹 분류 및 판별함수 도출',
    category: 'advanced',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'dose-response',
    name: '용량-반응 분석',
    description: 'EC50, IC50 등 용량 반응 곡선',
    category: 'regression',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['numeric']
    }
  },

  // 선택 추가 (8개)
  {
    id: 'mood-median',
    name: "Mood's Median 검정",
    description: '중앙값 기반 비모수 검정',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'partial-correlation',
    name: '편상관분석',
    description: '제3변수 통제 상관계수',
    category: 'correlation',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'stepwise-regression',
    name: '단계적 회귀분석',
    description: '변수 선택 자동화 (Forward/Backward)',
    category: 'regression',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'response-surface',
    name: '반응표면분석 (RSM)',
    description: '최적 조건 탐색',
    category: 'advanced',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'reliability-analysis',
    name: '신뢰도 분석 (Cronbach α)',
    description: '측정 도구 내적일관성',
    category: 'psychometrics',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'power-analysis',
    name: '검정력 분석',
    description: '필요 표본 크기 계산',
    category: 'design',
    requirements: {
      minSampleSize: 1,
      variableTypes: []
    }
  },
  {
    id: 'explore-data',
    name: '탐색적 데이터 분석 (EDA)',
    description: '종합 데이터 요약 및 시각화',
    category: 'descriptive',
    requirements: {
      minSampleSize: 1,
      variableTypes: []
    }
  },
  {
    id: 'means-plot',
    name: '평균 그림',
    description: '그룹별 평균 비교 시각화',
    category: 'descriptive',
    requirements: {
      minSampleSize: 3,
      variableTypes: ['numeric', 'categorical']
    }
  },

  // 추가 메서드 - 스마트 분석 커버리지 100% (6개)
  {
    id: 'chi-square-independence',
    name: '카이제곱 독립성 검정',
    description: '두 범주형 변수 간 독립성 검정',
    category: 'chi-square',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['categorical']
    }
  },
  {
    id: 'factor-analysis',
    name: '요인분석',
    description: '잠재요인 추출 및 변수 구조 파악',
    category: 'pca',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric']
    }
  },
  {
    id: 'ordinal-regression',
    name: '서열 로지스틱 회귀',
    description: '순서형 종속변수 예측',
    category: 'regression',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'poisson-regression',
    name: '포아송 회귀',
    description: '카운트 데이터 예측',
    category: 'regression',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric', 'categorical']
    }
  },
  {
    id: 'repeated-measures-anova',
    name: '반복측정 분산분석',
    description: '동일 대상 반복 측정 비교',
    category: 'anova',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric'],
      assumptions: ['정규성', '구형성']
    }
  },
  {
    id: 'non-parametric',
    name: '비모수 검정 종합',
    description: '정규성 가정 없는 검정 모음',
    category: 'nonparametric',
    requirements: {
      minSampleSize: 5,
      variableTypes: ['numeric', 'categorical']
    }
  },

  // ========================================
  // 생존분석 (Survival Analysis) - 2개
  // ========================================
  {
    id: 'kaplan-meier',
    name: 'Kaplan-Meier 생존분석',
    description: '생존함수 추정 및 생존곡선',
    category: 'survival',
    requirements: {
      minSampleSize: 10,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['독립적 중도절단']
    }
  },
  {
    id: 'cox-regression',
    name: 'Cox 비례위험 회귀',
    description: '공변량을 포함한 생존분석',
    category: 'survival',
    requirements: {
      minSampleSize: 30,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['비례위험 가정']
    }
  },

  // ========================================
  // 시계열 분석 (Time Series) - 3개
  // ========================================
  {
    id: 'arima',
    name: 'ARIMA 모델',
    description: '자기회귀 누적 이동평균 모델',
    category: 'timeseries',
    requirements: {
      minSampleSize: 50,
      variableTypes: ['numeric', 'date'],
      assumptions: ['정상성']
    }
  },
  {
    id: 'seasonal-decompose',
    name: '계절성 분해',
    description: '추세, 계절, 잔차 분리',
    category: 'timeseries',
    requirements: {
      minSampleSize: 24,
      variableTypes: ['numeric', 'date']
    }
  },
  {
    id: 'stationarity-test',
    name: '정상성 검정',
    description: 'ADF/KPSS 단위근 검정',
    category: 'timeseries',
    requirements: {
      minSampleSize: 20,
      variableTypes: ['numeric']
    }
  }
]

/**
 * 질문 유형에 따른 통계 방법 필터링
 */
export function getMethodsByQuestionType(questionType: string): StatisticalMethod[] {
  const question = QUESTION_TYPES.find(q => q.id === questionType)
  if (!question) return []

  return STATISTICAL_METHODS.filter(method =>
    question.methods.includes(method.category) ||
    question.methods.includes(method.subcategory || '')
  )
}

/**
 * 데이터 특성에 따른 통계 방법 추천
 */
export function recommendMethods(dataProfile: {
  numericVars: number
  categoricalVars: number
  totalRows: number
  hasTimeVar: boolean
  hasGroupVar: boolean
  groupLevels?: number
}): StatisticalMethod[] {
  const recommendations: StatisticalMethod[] = []

  // 기본 기술통계는 항상 추천
  recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'descriptive-stats')!)

  // 수치형 변수가 2개 이상이면 상관분석
  if (dataProfile.numericVars >= 2) {
    recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'correlation')!)
  }

  // 그룹 변수가 있고 수치형 변수가 있으면
  if (dataProfile.hasGroupVar && dataProfile.numericVars >= 1) {
    if (dataProfile.groupLevels === 2) {
      recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'two-sample-t')!)
      recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'mann-whitney')!)
    } else if ((dataProfile.groupLevels || 0) >= 3) {
      recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'one-way-anova')!)
      recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'kruskal-wallis')!)
    }
  }

  // 두 요인(범주형 2개 이상) + 수치형 1개 이상이면 이원분산분석 추천
  if (dataProfile.categoricalVars >= 2 && dataProfile.numericVars >= 1) {
    const twoWay = STATISTICAL_METHODS.find(m => m.id === 'two-way-anova')
    if (twoWay) recommendations.push(twoWay)
  }

  // 시간 변수가 있으면 시계열 추세 분석
  if (dataProfile.hasTimeVar && dataProfile.totalRows >= 50) {
    recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'mann-kendall')!)
  }

  // 충분한 데이터가 있으면 고급 분석
  if (dataProfile.totalRows >= 30 && dataProfile.numericVars >= 3) {
    recommendations.push(STATISTICAL_METHODS.find(m => m.id === 'pca')!)
  }

  return recommendations.filter(Boolean)
}

/**
 * 통계 방법의 요구사항 확인
 */
export function checkMethodRequirements(
  method: StatisticalMethod,
  dataProfile: any
): { canUse: boolean; warnings: string[] } {
  const warnings: string[] = []
  let canUse = true

  if (!method.requirements) {
    return { canUse, warnings }
  }

  // 최소 샘플 크기 확인
  if (method.requirements.minSampleSize &&
      dataProfile.totalRows < method.requirements.minSampleSize) {
    warnings.push(`최소 ${method.requirements.minSampleSize}개 데이터 필요 (현재: ${dataProfile.totalRows}개)`)
    canUse = false
  }

  // 변수 타입 확인
  if (method.requirements.variableTypes) {
    if (method.requirements.variableTypes.includes('numeric') &&
        dataProfile.numericVars === 0) {
      warnings.push('수치형 변수 필요')
      canUse = false
    }
    if (method.requirements.variableTypes.includes('categorical') &&
        dataProfile.categoricalVars === 0) {
      warnings.push('범주형 변수 필요')
      canUse = false
    }
  }

  // 가정 확인 (undefined는 "미실행"으로 경고 제외)
  if (method.requirements.assumptions) {
    method.requirements.assumptions.forEach(assumption => {
      if (assumption === '정규성') {
        // false일 때만 경고 (undefined는 미실행 상태)
        if (dataProfile.normalityPassed === false) {
          warnings.push('정규성 가정 위반 (비모수 검정 고려)')
        }
      }
      if (assumption === '등분산성') {
        // false일 때만 경고 (undefined는 미실행 상태)
        if (dataProfile.homogeneityPassed === false) {
          warnings.push('등분산성 가정 위반 (Welch 검정 고려)')
        }
      }
    })
  }

  return { canUse, warnings }
}
