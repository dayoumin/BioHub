// 통계 분석 방법별 파라미터 정의
// 29개 통계 방법에 대한 완전한 파라미터 스펙

export interface ParameterDefinition {
  id: string
  label: string
  type: 'column-select' | 'number' | 'select' | 'checkbox' | 'text'
  required?: boolean
  defaultValue?: any
  placeholder?: string
  min?: number
  max?: number
  step?: number
  options?: Array<{ value: string; label: string }>
  multiple?: boolean  // column-select에서 다중 선택 여부
  description?: string
  validation?: (value: any) => boolean | string
}

export interface MethodParameters {
  methodId: string
  parameters: ParameterDefinition[]
}

// 전체 통계 방법 파라미터 정의
export const METHOD_PARAMETERS: Record<string, ParameterDefinition[]> = {
  // ============ 기술통계 ============
  calculateDescriptiveStats: [
    {
      id: 'columns',
      label: '분석할 변수',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '기술통계를 계산할 수치형 변수를 선택하세요'
    },
    {
      id: 'percentiles',
      label: '백분위수',
      type: 'text',
      defaultValue: '25,50,75',
      placeholder: '25,50,75',
      description: '쉼표로 구분된 백분위수 (예: 25,50,75)'
    },
    {
      id: 'includeOutliers',
      label: '이상치 포함',
      type: 'checkbox',
      defaultValue: true,
      description: '이상치를 포함하여 계산할지 여부'
    }
  ],

  normalityTest: [
    {
      id: 'column',
      label: '검정할 변수',
      type: 'column-select',
      required: true,
      description: '정규성을 검정할 수치형 변수를 선택하세요'
    },
    {
      id: 'method',
      label: '검정 방법',
      type: 'select',
      defaultValue: 'shapiro',
      options: [
        { value: 'shapiro', label: 'Shapiro-Wilk 검정' },
        { value: 'normaltest', label: "D'Agostino-Pearson 검정" },
        { value: 'anderson', label: 'Anderson-Darling 검정' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  homogeneityTest: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '등분산을 검정할 수치형 변수'
    },
    {
      id: 'method',
      label: '검정 방법',
      type: 'select',
      defaultValue: 'levene',
      options: [
        { value: 'levene', label: "Levene's 검정 (평균 기반)" },
        { value: 'bartlett', label: "Bartlett's 검정 (정규성 가정)" }
      ],
      description: 'Levene: 평균 기반 (비모수), Bartlett: 정규성 가정 (모수)'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  // ============ t-검정 ============
  oneSampleTTest: [
    {
      id: 'column',
      label: '검정할 변수',
      type: 'column-select',
      required: true,
      description: '검정할 수치형 변수를 선택하세요'
    },
    {
      id: 'populationMean',
      label: '모집단 평균',
      type: 'number',
      required: true,
      placeholder: '0',
      description: '비교할 모집단 평균값'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (크다)' },
        { value: 'less', label: '단측검정 (작다)' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  twoSampleTTest: [
    {
      id: 'column1',
      label: '그룹 1 변수',
      type: 'column-select',
      required: true,
      description: '첫 번째 그룹의 수치형 변수'
    },
    {
      id: 'column2',
      label: '그룹 2 변수',
      type: 'column-select',
      required: true,
      description: '두 번째 그룹의 수치형 변수'
    },
    {
      id: 'equalVar',
      label: '등분산 가정',
      type: 'checkbox',
      defaultValue: true,
      description: '두 그룹의 분산이 같다고 가정'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (그룹1 > 그룹2)' },
        { value: 'less', label: '단측검정 (그룹1 < 그룹2)' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  pairedTTest: [
    {
      id: 'column1',
      label: '사전 측정값',
      type: 'column-select',
      required: true,
      description: '사전 측정 변수'
    },
    {
      id: 'column2',
      label: '사후 측정값',
      type: 'column-select',
      required: true,
      description: '사후 측정 변수'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (증가)' },
        { value: 'less', label: '단측검정 (감소)' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  welchTTest: [
    {
      id: 'column1',
      label: '그룹 1 변수',
      type: 'column-select',
      required: true,
      description: '첫 번째 그룹의 수치형 변수'
    },
    {
      id: 'column2',
      label: '그룹 2 변수',
      type: 'column-select',
      required: true,
      description: '두 번째 그룹의 수치형 변수'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (그룹1 > 그룹2)' },
        { value: 'less', label: '단측검정 (그룹1 < 그룹2)' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  // ============ 분산분석 ============
  oneWayANOVA: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '종속 변수',
      type: 'column-select',
      required: true,
      description: '분석할 수치형 종속 변수'
    },
    {
      id: 'postHoc',
      label: '사후검정',
      type: 'select',
      defaultValue: 'tukey',
      options: [
        { value: 'none', label: '없음' },
        { value: 'tukey', label: 'Tukey HSD' },
        { value: 'bonferroni', label: 'Bonferroni' },
        { value: 'scheffe', label: 'Scheffé' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  twoWayANOVA: [
    {
      id: 'factor1Column',
      label: '요인 1',
      type: 'column-select',
      required: true,
      description: '첫 번째 독립변수 (범주형)'
    },
    {
      id: 'factor2Column',
      label: '요인 2',
      type: 'column-select',
      required: true,
      description: '두 번째 독립변수 (범주형)'
    },
    {
      id: 'valueColumn',
      label: '종속 변수',
      type: 'column-select',
      required: true,
      description: '분석할 수치형 종속 변수'
    },
    {
      id: 'interaction',
      label: '상호작용 효과',
      type: 'checkbox',
      defaultValue: true,
      description: '두 요인 간 상호작용 효과 검정'
    },
    {
      id: 'postHoc',
      label: '사후검정',
      type: 'select',
      defaultValue: 'tukey',
      options: [
        { value: 'none', label: '없음' },
        { value: 'tukey', label: 'Tukey HSD' },
        { value: 'bonferroni', label: 'Bonferroni' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  tukeyHSD: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '비교할 수치형 변수'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  bonferroni: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '비교할 수치형 변수'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  gamesHowell: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '비교할 수치형 변수'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  // ============ 회귀분석 ============
  simpleLinearRegression: [
    {
      id: 'independentColumn',
      label: '독립변수 (X)',
      type: 'column-select',
      required: true,
      description: '예측변수 (설명변수)'
    },
    {
      id: 'dependentColumn',
      label: '종속변수 (Y)',
      type: 'column-select',
      required: true,
      description: '반응변수 (목표변수)'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    },
    {
      id: 'predictValues',
      label: '예측값',
      type: 'text',
      placeholder: '10, 20, 30',
      description: '예측할 X 값들 (쉼표로 구분, 선택사항)'
    }
  ],

  multipleRegression: [
    {
      id: 'independentColumns',
      label: '독립변수들 (X)',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '예측변수들 (설명변수들)'
    },
    {
      id: 'dependentColumn',
      label: '종속변수 (Y)',
      type: 'column-select',
      required: true,
      description: '반응변수 (목표변수)'
    },
    {
      id: 'method',
      label: '변수 선택 방법',
      type: 'select',
      defaultValue: 'enter',
      options: [
        { value: 'enter', label: '모든 변수 투입' },
        { value: 'forward', label: '전진선택법' },
        { value: 'backward', label: '후진제거법' },
        { value: 'stepwise', label: '단계선택법' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  logisticRegression: [
    {
      id: 'independentColumns',
      label: '독립변수들 (X)',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '예측변수들'
    },
    {
      id: 'dependentColumn',
      label: '종속변수 (Y)',
      type: 'column-select',
      required: true,
      description: '이진 분류 변수 (0/1 또는 범주형)'
    }
  ],

  correlationAnalysis: [
    {
      id: 'columns',
      label: '분석할 변수들',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '상관관계를 분석할 수치형 변수들 (2개 이상)'
    },
    {
      id: 'method',
      label: '상관계수 방법',
      type: 'select',
      defaultValue: 'pearson',
      options: [
        { value: 'pearson', label: 'Pearson 상관계수' },
        { value: 'spearman', label: 'Spearman 순위상관계수' },
        { value: 'kendall', label: 'Kendall 타우' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  // ============ 비모수 검정 ============
  mannWhitneyU: [
    {
      id: 'column1',
      label: '그룹 1 변수',
      type: 'column-select',
      required: true,
      description: '첫 번째 그룹의 수치형 변수'
    },
    {
      id: 'column2',
      label: '그룹 2 변수',
      type: 'column-select',
      required: true,
      description: '두 번째 그룹의 수치형 변수'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (그룹1 > 그룹2)' },
        { value: 'less', label: '단측검정 (그룹1 < 그룹2)' }
      ]
    },
    {
      id: 'continuityCorrection',
      label: '연속성 보정',
      type: 'checkbox',
      defaultValue: true,
      description: '연속성 보정 적용 여부'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  wilcoxonSignedRank: [
    {
      id: 'column1',
      label: '사전 측정값',
      type: 'column-select',
      required: true,
      description: '사전 측정 변수'
    },
    {
      id: 'column2',
      label: '사후 측정값',
      type: 'column-select',
      required: true,
      description: '사후 측정 변수'
    },
    {
      id: 'alternative',
      label: '대립가설',
      type: 'select',
      defaultValue: 'two-sided',
      options: [
        { value: 'two-sided', label: '양측검정' },
        { value: 'greater', label: '단측검정 (증가)' },
        { value: 'less', label: '단측검정 (감소)' }
      ]
    },
    {
      id: 'zeroMethod',
      label: '영값 처리',
      type: 'select',
      defaultValue: 'pratt',
      options: [
        { value: 'pratt', label: 'Pratt 방법' },
        { value: 'wilcox', label: 'Wilcox 방법' },
        { value: 'zsplit', label: 'Zero-split 방법' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  kruskalWallis: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '비교할 수치형 변수'
    },
    {
      id: 'postHoc',
      label: '사후검정',
      type: 'select',
      defaultValue: 'dunn',
      options: [
        { value: 'none', label: '없음' },
        { value: 'dunn', label: "Dunn's test" },
        { value: 'conover', label: 'Conover test' },
        { value: 'nemenyi', label: 'Nemenyi test' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  dunnTest: [
    {
      id: 'groupColumn',
      label: '그룹 변수',
      type: 'column-select',
      required: true,
      description: '그룹을 구분하는 범주형 변수'
    },
    {
      id: 'valueColumn',
      label: '값 변수',
      type: 'column-select',
      required: true,
      description: '비교할 수치형 변수'
    },
    {
      id: 'pAdjust',
      label: 'p값 보정 방법',
      type: 'select',
      defaultValue: 'holm',
      options: [
        { value: 'none', label: '보정 없음' },
        { value: 'bonferroni', label: 'Bonferroni' },
        { value: 'holm', label: 'Holm' },
        { value: 'fdr', label: 'FDR (Benjamini-Hochberg)' }
      ]
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  chiSquareTest: [
    {
      id: 'rowColumn',
      label: '행 변수',
      type: 'column-select',
      required: true,
      description: '교차표의 행에 해당하는 범주형 변수'
    },
    {
      id: 'columnColumn',
      label: '열 변수',
      type: 'column-select',
      required: true,
      description: '교차표의 열에 해당하는 범주형 변수'
    },
    {
      id: 'correction',
      label: 'Yates 연속성 보정',
      type: 'checkbox',
      defaultValue: false,
      description: '2×2 표에서 연속성 보정 적용'
    },
    {
      id: 'alpha',
      label: '유의수준',
      type: 'number',
      defaultValue: 0.05,
      min: 0.001,
      max: 0.1,
      step: 0.001
    }
  ],

  // ============ 고급 분석 ============
  pca: [
    {
      id: 'columns',
      label: '분석할 변수들',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '주성분 분석에 포함할 수치형 변수들'
    },
    {
      id: 'nComponents',
      label: '주성분 개수',
      type: 'number',
      placeholder: '자동',
      description: '추출할 주성분 개수 (비워두면 자동 결정)'
    },
    {
      id: 'standardize',
      label: '표준화',
      type: 'checkbox',
      defaultValue: true,
      description: '변수를 표준화(평균 0, 표준편차 1)할지 여부'
    },
    {
      id: 'varianceExplained',
      label: '설명 분산 임계값',
      type: 'number',
      defaultValue: 0.95,
      min: 0.5,
      max: 1,
      step: 0.05,
      description: '누적 설명 분산 비율 (0.95 = 95%)'
    }
  ],

  kMeansClustering: [
    {
      id: 'columns',
      label: '클러스터링 변수들',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '클러스터링에 사용할 수치형 변수들'
    },
    {
      id: 'nClusters',
      label: '클러스터 개수',
      type: 'number',
      required: true,
      defaultValue: 3,
      min: 2,
      max: 10,
      step: 1
    },
    {
      id: 'init',
      label: '초기화 방법',
      type: 'select',
      defaultValue: 'k-means++',
      options: [
        { value: 'k-means++', label: 'K-means++' },
        { value: 'random', label: 'Random' }
      ]
    },
    {
      id: 'maxIter',
      label: '최대 반복 횟수',
      type: 'number',
      defaultValue: 300,
      min: 10,
      max: 1000,
      step: 10
    },
    {
      id: 'standardize',
      label: '표준화',
      type: 'checkbox',
      defaultValue: true,
      description: '변수를 표준화할지 여부'
    }
  ],

  hierarchicalClustering: [
    {
      id: 'columns',
      label: '클러스터링 변수들',
      type: 'column-select',
      required: true,
      multiple: true,
      description: '클러스터링에 사용할 수치형 변수들'
    },
    {
      id: 'method',
      label: '연결 방법',
      type: 'select',
      defaultValue: 'ward',
      options: [
        { value: 'ward', label: 'Ward' },
        { value: 'single', label: 'Single' },
        { value: 'complete', label: 'Complete' },
        { value: 'average', label: 'Average' },
        { value: 'weighted', label: 'Weighted' }
      ]
    },
    {
      id: 'metric',
      label: '거리 측정',
      type: 'select',
      defaultValue: 'euclidean',
      options: [
        { value: 'euclidean', label: 'Euclidean' },
        { value: 'manhattan', label: 'Manhattan' },
        { value: 'cosine', label: 'Cosine' },
        { value: 'correlation', label: 'Correlation' }
      ]
    },
    {
      id: 'nClusters',
      label: '클러스터 개수',
      type: 'number',
      placeholder: '자동',
      description: '최종 클러스터 개수 (비워두면 덴드로그램만 생성)'
    },
    {
      id: 'standardize',
      label: '표준화',
      type: 'checkbox',
      defaultValue: true,
      description: '변수를 표준화할지 여부'
    }
  ]
}

// 파라미터 검증 함수
export function validateParameters(
  methodId: string,
  values: Record<string, any>
): { valid: boolean; errors: string[] } {
  const parameters = METHOD_PARAMETERS[methodId]
  if (!parameters) {
    return { valid: false, errors: ['알 수 없는 통계 방법입니다.'] }
  }

  const errors: string[] = []

  for (const param of parameters) {
    const value = values[param.id]

    // 필수 파라미터 체크
    if (param.required && (value === undefined || value === null || value === '')) {
      errors.push(`${param.label}은(는) 필수 입력 항목입니다.`)
      continue
    }

    // 값이 없으면 다음 파라미터로
    if (value === undefined || value === null || value === '') continue

    // 타입별 검증
    switch (param.type) {
      case 'number':
        if (isNaN(value)) {
          errors.push(`${param.label}은(는) 숫자여야 합니다.`)
        } else {
          const num = Number(value)
          if (param.min !== undefined && num < param.min) {
            errors.push(`${param.label}은(는) ${param.min} 이상이어야 합니다.`)
          }
          if (param.max !== undefined && num > param.max) {
            errors.push(`${param.label}은(는) ${param.max} 이하여야 합니다.`)
          }
        }
        break

      case 'column-select':
        if (param.multiple && !Array.isArray(value)) {
          errors.push(`${param.label}은(는) 배열이어야 합니다.`)
        } else if (param.multiple && value.length === 0) {
          errors.push(`${param.label}에서 최소 하나 이상 선택해야 합니다.`)
        }
        break

      case 'select':
        if (param.options) {
          const validValues = param.options.map(opt => opt.value)
          if (!validValues.includes(value)) {
            errors.push(`${param.label}의 값이 올바르지 않습니다.`)
          }
        }
        break
    }

    // 커스텀 검증 함수
    if (param.validation) {
      const result = param.validation(value)
      if (result !== true) {
        errors.push(typeof result === 'string' ? result : `${param.label} 검증 실패`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// 기본값 가져오기
export function getDefaultValues(methodId: string): Record<string, any> {
  const parameters = METHOD_PARAMETERS[methodId]
  if (!parameters) return {}

  const defaults: Record<string, any> = {}
  for (const param of parameters) {
    if (param.defaultValue !== undefined) {
      defaults[param.id] = param.defaultValue
    }
  }
  return defaults
}