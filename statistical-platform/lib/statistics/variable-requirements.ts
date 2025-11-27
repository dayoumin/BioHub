/**
 * 41개 통계 메서드별 변수 요구사항 정의
 *
 * 이 파일은 각 통계 메서드가 필요로 하는 변수의:
 * - 역할 (종속/독립/요인/공변량 등)
 * - 타입 (연속형/범주형/이진형 등)
 * - 개수 (최소/최대)
 * - 필수 여부
 * 를 정확하게 정의합니다.
 */

export type VariableType =
  | 'continuous'   // 연속형 (실수값)
  | 'categorical'  // 범주형 (문자열, 제한된 값)
  | 'binary'       // 이진형 (0/1, Yes/No)
  | 'ordinal'      // 서열형 (1-5 척도 등)
  | 'date'         // 날짜/시간
  | 'count'        // 카운트 (양의 정수)

export type VariableRole =
  | 'dependent'    // 종속변수 (Y)
  | 'independent'  // 독립변수 (X)
  | 'factor'       // 요인 (ANOVA의 그룹 변수)
  | 'covariate'    // 공변량 (통제변수)
  | 'blocking'     // 블록 변수 (무선효과)
  | 'within'       // 개체내 요인 (반복측정)
  | 'between'      // 개체간 요인
  | 'time'         // 시간 변수
  | 'event'        // 이벤트 변수 (생존분석)
  | 'censoring'    // 중도절단 변수
  | 'weight'       // 가중치 변수

export interface VariableRequirement {
  role: VariableRole
  label: string           // UI에 표시될 레이블
  types: VariableType[]   // 허용되는 변수 타입들
  required: boolean       // 필수 여부
  multiple: boolean       // 복수 선택 가능 여부
  minCount?: number       // 최소 개수
  maxCount?: number       // 최대 개수
  description: string     // 사용자를 위한 설명
  example?: string        // 예시
}

export interface StatisticalMethodRequirements {
  id: string
  name: string
  category: string
  description: string
  minSampleSize: number
  maxVariables?: number
  assumptions: string[]
  variables: VariableRequirement[]
  notes?: string[]        // 추가 주의사항
}

/**
 * 41개 통계 메서드의 변수 요구사항 정의
 * SPSS, R, SAS의 표준을 따름
 */
export const STATISTICAL_METHOD_REQUIREMENTS: StatisticalMethodRequirements[] = [
  // ========================================
  // 1. 기술통계 (Descriptive Statistics) - 5개
  // ========================================
  {
    id: 'descriptive-stats',
    name: '기술통계량',
    category: 'descriptive',
    description: '평균, 중앙값, 표준편차 등 기본 통계량 계산',
    minSampleSize: 1,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '기술통계를 계산할 변수들',
        example: '체중_g, 체장_cm, 비만도'
      },
      {
        role: 'factor',
        label: '그룹 변수 (선택)',
        types: ['categorical', 'binary'],
        required: false,
        multiple: false,
        description: '그룹별 기술통계를 계산할 경우',
        example: '성별, 양식장'
      }
    ]
  },
  {
    id: 'frequency-table',
    name: '빈도분석',
    category: 'descriptive',
    description: '범주형 변수의 빈도와 비율 계산',
    minSampleSize: 1,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['categorical', 'binary', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '빈도를 계산할 범주형 변수들',
        example: '품질등급, 사료종류, 선도'
      }
    ]
  },
  {
    id: 'cross-tabulation',
    name: '교차표',
    category: 'descriptive',
    description: '두 범주형 변수 간의 교차 빈도표',
    minSampleSize: 1,
    assumptions: [],
    variables: [
      {
        role: 'independent',
        label: '행 변수',
        types: ['categorical', 'binary', 'ordinal'],
        required: true,
        multiple: false,
        description: '교차표의 행에 표시될 변수',
        example: '성별_암수'
      },
      {
        role: 'dependent',
        label: '열 변수',
        types: ['categorical', 'binary', 'ordinal'],
        required: true,
        multiple: false,
        description: '교차표의 열에 표시될 변수',
        example: '생존여부'
      },
      {
        role: 'factor',
        label: '층화 변수 (선택)',
        types: ['categorical', 'binary'],
        required: false,
        multiple: false,
        description: '층별 교차표를 생성할 경우',
        example: '연령대'
      }
    ]
  },
  {
    id: 'explore-data',
    name: '데이터 탐색',
    category: 'descriptive',
    description: '상자그림, 정규성 검정 등 포함한 종합 탐색',
    minSampleSize: 3,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '탐색 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '탐색할 연속형 변수들',
        example: '생산량_kg, 수온_C, 염분도_ppt'
      },
      {
        role: 'factor',
        label: '그룹 변수 (선택)',
        types: ['categorical', 'binary'],
        required: false,
        multiple: true,
        maxCount: 2,
        description: '그룹별 탐색을 할 경우',
        example: '부서, 지역'
      }
    ],
    notes: ['정규성 검정(Shapiro-Wilk), Q-Q plot, 이상치 탐지 포함']
  },
  {
    id: 'reliability-analysis',
    name: '신뢰도 분석',
    category: 'descriptive',
    description: '척도의 내적 일관성 검사 (Cronbach\'s α)',
    minSampleSize: 30,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '척도 항목',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '같은 개념을 측정하는 문항들',
        example: '품질평가1, 품질평가2, 품질평가3'
      }
    ],
    notes: ['최소 2개 이상의 항목 필요', '일반적으로 3개 이상 권장']
  },

  // ========================================
  // 2. 평균 비교 (Compare Means) - 6개
  // ========================================
  {
    id: 'one-sample-t',
    name: '일표본 t-검정',
    category: 'compare',
    description: '한 집단의 평균과 특정값 비교',
    minSampleSize: 2,
    assumptions: ['정규성'],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '평균을 검정할 연속형 변수',
        example: '학생들의 시험 점수'
      }
    ],
    notes: ['검정값(Test Value)은 별도 입력', '기본값은 0']
  },
  {
    id: 'two-sample-t',
    name: '독립표본 t-검정',
    category: 'compare',
    description: '두 독립 집단 간 평균 비교',
    minSampleSize: 4,
    assumptions: ['정규성', '등분산성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '비교할 연속형 변수',
        example: '시험 점수'
      },
      {
        role: 'factor',
        label: '그룹 변수',
        types: ['categorical', 'binary'],
        required: true,
        multiple: false,
        description: '두 그룹을 구분하는 변수',
        example: '성별_암수'
      }
    ],
    notes: ['그룹 변수는 정확히 2개 수준만 가져야 함']
  },
  {
    id: 'paired-t',
    name: '대응표본 t-검정',
    category: 'compare',
    description: '동일 대상의 전후 측정값 비교',
    minSampleSize: 2,
    assumptions: ['차이값의 정규성'],
    variables: [
      {
        role: 'dependent',
        label: '대응 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        maxCount: 2,
        description: '전후 측정값 (순서 중요)',
        example: '사전체중_g, 사후체중_g'
      }
    ],
    notes: ['첫 번째 변수 - 두 번째 변수 = 차이값으로 계산']
  },
  {
    id: 'welch-t',
    name: 'Welch t-검정',
    category: 'compare',
    description: '등분산 가정하지 않는 t-검정',
    minSampleSize: 4,
    assumptions: ['정규성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '비교할 연속형 변수',
        example: '급여'
      },
      {
        role: 'factor',
        label: '그룹 변수',
        types: ['categorical', 'binary'],
        required: true,
        multiple: false,
        description: '두 그룹을 구분하는 변수',
        example: '부서 (영업/개발)'
      }
    ],
    notes: ['등분산성이 위반될 때 사용', 'Satterthwaite 자유도 사용']
  },
  {
    id: 'one-sample-proportion',
    name: '일표본 비율 검정',
    category: 'compare',
    description: '한 집단의 비율과 특정값 비교',
    minSampleSize: 10,
    assumptions: ['np ≥ 5, n(1-p) ≥ 5'],
    variables: [
      {
        role: 'dependent',
        label: '이진 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '성공/실패를 나타내는 이진 변수',
        example: '합격 여부 (합격=1, 불합격=0)'
      }
    ],
    notes: ['검정 비율은 별도 입력', 'Wilson Score Interval 사용']
  },
  {
    id: 'means-plot',
    name: '평균 도표',
    category: 'compare',
    description: '그룹별 평균을 시각화',
    minSampleSize: 1,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '평균을 계산할 변수',
        example: '판매량'
      },
      {
        role: 'factor',
        label: '요인 변수',
        types: ['categorical'],
        required: true,
        multiple: true,
        maxCount: 2,
        description: '그룹을 구분할 요인들',
        example: '지역, 분기'
      }
    ],
    notes: ['오차막대는 95% 신뢰구간 또는 표준오차']
  },

  // ========================================
  // 3. 일반선형모델 (GLM) - 7개
  // ========================================
  {
    id: 'one-way-anova',
    name: '일원분산분석',
    category: 'glm',
    description: '3개 이상 집단의 평균 비교',
    minSampleSize: 6,
    assumptions: ['정규성', '등분산성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '비교할 연속형 변수',
        example: '작업 시간'
      },
      {
        role: 'factor',
        label: '요인 (독립변수)',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '3개 이상 수준을 가진 요인',
        example: '교육 방법 (A/B/C)'
      }
    ],
    notes: ['사후검정 자동 수행 (Tukey HSD)']
  },
  {
    id: 'two-way-anova',
    name: '이원분산분석',
    category: 'glm',
    description: '2개 요인의 주효과와 상호작용 분석',
    minSampleSize: 8,
    assumptions: ['정규성', '등분산성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '분석할 연속형 변수',
        example: '수확량'
      },
      {
        role: 'factor',
        label: '요인',
        types: ['categorical'],
        required: true,
        multiple: true,
        minCount: 2,
        maxCount: 2,
        description: '2개의 독립 요인',
        example: '비료 종류, 물 공급량'
      }
    ],
    notes: ['상호작용 효과 검정 포함', '단순 주효과 분석 가능']
  },
  {
    id: 'three-way-anova',
    name: '삼원분산분석',
    category: 'glm',
    description: '3개 요인의 효과 분석',
    minSampleSize: 16,
    assumptions: ['정규성', '등분산성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '분석할 연속형 변수',
        example: '성과 점수'
      },
      {
        role: 'factor',
        label: '요인',
        types: ['categorical'],
        required: true,
        multiple: true,
        minCount: 3,
        maxCount: 3,
        description: '3개의 독립 요인',
        example: '부서, 경력, 교육수준'
      }
    ],
    notes: ['3원 상호작용까지 검정', '해석의 복잡성 주의']
  },
  {
    id: 'ancova',
    name: '공분산분석',
    category: 'glm',
    description: '공변량을 통제한 집단 비교',
    minSampleSize: 20,
    assumptions: ['정규성', '등분산성', '회귀선 평행성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '비교할 연속형 변수',
        example: '사후 점수'
      },
      {
        role: 'factor',
        label: '요인',
        types: ['categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '집단을 구분하는 요인',
        example: '교육 방법'
      },
      {
        role: 'covariate',
        label: '공변량',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '통제할 연속형 변수',
        example: '사전 점수'
      }
    ],
    notes: ['공변량과 요인 간 상호작용 검정 필요']
  },
  {
    id: 'repeated-measures-anova',
    name: '반복측정 분산분석',
    category: 'glm',
    description: '동일 대상의 반복 측정 자료 분석',
    minSampleSize: 10,
    assumptions: ['정규성', '구형성'],
    variables: [
      {
        role: 'within',
        label: '반복측정 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '시점별 측정값',
        example: '시점1, 시점2, 시점3'
      },
      {
        role: 'between',
        label: '개체간 요인 (선택)',
        types: ['categorical'],
        required: false,
        multiple: true,
        description: '집단을 구분하는 요인',
        example: '처치 그룹'
      }
    ],
    notes: ['Mauchly 구형성 검정', 'Greenhouse-Geisser 보정']
  },
  {
    id: 'manova',
    name: '다변량 분산분석',
    category: 'glm',
    description: '여러 종속변수를 동시에 분석',
    minSampleSize: 20,
    assumptions: ['다변량 정규성', '공분산 행렬 동질성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '분석할 여러 연속형 변수',
        example: '수학점수, 영어점수, 과학점수'
      },
      {
        role: 'factor',
        label: '요인',
        types: ['categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '집단을 구분하는 요인',
        example: '교육방법, 학교유형'
      }
    ],
    notes: ['Wilks\' Lambda, Pillai\'s Trace 등 검정']
  },
  {
    id: 'mixed-model',
    name: '선형 혼합 모형',
    category: 'glm',
    description: '고정효과와 무선효과를 포함한 모형',
    minSampleSize: 30,
    assumptions: ['정규성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '분석할 연속형 변수',
        example: '학업 성취도'
      },
      {
        role: 'factor',
        label: '고정 효과',
        types: ['categorical', 'continuous'],
        required: true,
        multiple: true,
        description: '고정 효과 변수',
        example: '교육방법, 학습시간'
      },
      {
        role: 'blocking',
        label: '무선 효과',
        types: ['categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '무선 효과 변수',
        example: '학생ID, 학교ID'
      }
    ],
    notes: ['위계적 자료 구조에 적합', 'REML 추정 사용']
  },
  {
    id: 'response-surface',
    name: '반응표면 분석',
    category: 'glm',
    description: '2개 이상의 예측변수와 반응변수 간의 최적 조건 탐색',
    minSampleSize: 20,
    assumptions: ['정규성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '반응 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '최적화할 연속형 변수',
        example: '수율, 강도, 효율'
      },
      {
        role: 'independent',
        label: '예측 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '최적 조건을 탐색할 연속형 변수들',
        example: '온도, 압력, 시간'
      }
    ],
    notes: ['2차 모델 적합', '최적점/saddle point 탐색', 'Central Composite Design 권장']
  },

  // ========================================
  // 4. 상관분석 (Correlate) - 4개
  // ========================================
  {
    id: 'pearson-correlation',
    name: 'Pearson 상관분석',
    category: 'correlate',
    description: '연속형 변수 간 선형 상관관계',
    minSampleSize: 4,
    assumptions: ['선형성', '정규성', '등분산성'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '상관관계를 분석할 연속형 변수들',
        example: '체중_g, 체장_cm, 비만도'
      }
    ],
    notes: ['상관행렬 생성', 'p-value는 양측검정']
  },
  {
    id: 'spearman-correlation',
    name: 'Spearman 순위상관',
    category: 'correlate',
    description: '순위 기반 비모수 상관분석',
    minSampleSize: 4,
    assumptions: ['단조성'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '순위상관을 분석할 변수들',
        example: '순위, 평점, 선호도'
      }
    ],
    notes: ['비선형 관계도 탐지 가능', '이상치에 강건']
  },
  {
    id: 'kendall-correlation',
    name: 'Kendall τ 상관',
    category: 'correlate',
    description: '순위 일치도 기반 상관분석',
    minSampleSize: 4,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '순위상관을 분석할 변수들',
        example: '평가1, 평가2'
      }
    ],
    notes: ['작은 표본에서 더 정확', '해석이 직관적']
  },
  {
    id: 'partial-correlation',
    name: '편상관분석',
    category: 'correlate',
    description: '제3변수를 통제한 상관관계',
    minSampleSize: 10,
    assumptions: ['선형성', '정규성'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '상관관계를 분석할 변수들',
        example: '소득, 지출'
      },
      {
        role: 'covariate',
        label: '통제 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '통제할 변수들',
        example: '나이, 교육년수'
      }
    ],
    notes: ['순수한 상관관계 파악', '다중공선성 주의']
  },

  // ========================================
  // 5. 회귀분석 (Regression) - 6개
  // ========================================
  {
    id: 'simple-regression',
    name: '단순선형회귀',
    category: 'regression',
    description: '하나의 예측변수로 종속변수 예측',
    minSampleSize: 10,
    assumptions: ['선형성', '정규성', '등분산성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측할 연속형 변수',
        example: '매출액'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측에 사용할 변수',
        example: '광고비'
      }
    ],
    notes: ['R² 해석 주의', '잔차 진단 필수']
  },
  {
    id: 'multiple-regression',
    name: '다중회귀분석',
    category: 'regression',
    description: '여러 예측변수로 종속변수 예측',
    minSampleSize: 20,
    assumptions: ['선형성', '정규성', '등분산성', '독립성', '다중공선성 없음'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측할 연속형 변수',
        example: '주택 가격'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '예측에 사용할 변수들',
        example: '면적, 방 개수, 위치'
      }
    ],
    notes: ['VIF > 10이면 다중공선성 의심', 'n ≥ 50 + 8m (m=독립변수 수)']
  },
  {
    id: 'stepwise-regression',
    name: '단계적 회귀분석',
    category: 'regression',
    description: '변수 선택을 자동화한 회귀분석',
    minSampleSize: 40,
    assumptions: ['선형성', '정규성', '등분산성', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측할 연속형 변수',
        example: '고객 만족도'
      },
      {
        role: 'independent',
        label: '후보 독립변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 3,
        description: '선택될 후보 변수들',
        example: '서비스1, 서비스2, 서비스3, ...'
      }
    ],
    notes: ['Forward, Backward, Both 방법', 'AIC/BIC 기준']
  },
  {
    id: 'logistic-regression',
    name: '로지스틱 회귀',
    category: 'regression',
    description: '이진 결과를 예측하는 회귀분석',
    minSampleSize: 50,
    assumptions: ['선형성(로짓)', '독립성', '다중공선성 없음'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '예측할 이진 변수',
        example: '구매 여부 (구매=1, 미구매=0)'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측에 사용할 변수들',
        example: '나이, 소득, 성별'
      }
    ],
    notes: ['Odds Ratio 해석', '최소 10 EPV (Events Per Variable)']
  },
  {
    id: 'ordinal-regression',
    name: '서열 회귀분석',
    category: 'regression',
    description: '순서형 결과를 예측하는 회귀분석',
    minSampleSize: 100,
    assumptions: ['비례 오즈 가정', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['ordinal'],
        required: true,
        multiple: false,
        description: '예측할 서열 변수',
        example: '만족도 (매우불만족/불만족/보통/만족/매우만족)'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측에 사용할 변수들',
        example: '서비스 품질, 가격, 접근성'
      }
    ],
    notes: ['Proportional Odds Model', 'Brant Test로 가정 검정']
  },
  {
    id: 'poisson-regression',
    name: '포아송 회귀',
    category: 'regression',
    description: '카운트 데이터를 예측하는 회귀분석',
    minSampleSize: 50,
    assumptions: ['평균과 분산이 같음', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['count'],
        required: true,
        multiple: false,
        description: '예측할 카운트 변수',
        example: '사고 횟수, 방문 횟수'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측에 사용할 변수들',
        example: '노출 시간, 위험 요인'
      },
      {
        role: 'weight',
        label: '노출 변수 (선택)',
        types: ['continuous'],
        required: false,
        multiple: false,
        description: '노출량을 나타내는 변수',
        example: '관찰 시간, 면적'
      }
    ],
    notes: ['과분산 시 Negative Binomial 고려']
  },

  // ========================================
  // 6. 비모수 검정 (Nonparametric) - 8개
  // ========================================
  {
    id: 'mann-whitney',
    name: 'Mann-Whitney U 검정',
    category: 'nonparametric',
    description: '두 독립 집단의 중위수 비교',
    minSampleSize: 4,
    assumptions: ['독립성', '순서척도 이상'],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: false,
        description: '비교할 변수',
        example: '만족도 점수'
      },
      {
        role: 'factor',
        label: '그룹 변수',
        types: ['categorical', 'binary'],
        required: true,
        multiple: false,
        description: '두 그룹을 구분하는 변수',
        example: '처치 그룹 (실험/대조)'
      }
    ],
    notes: ['독립표본 t-검정의 비모수 대안', 'Wilcoxon Rank-Sum과 동일']
  },
  {
    id: 'wilcoxon-signed-rank',
    name: 'Wilcoxon 부호순위 검정',
    category: 'nonparametric',
    description: '대응 표본의 중위수 비교',
    minSampleSize: 5,
    assumptions: ['대칭 분포', '연속성'],
    variables: [
      {
        role: 'dependent',
        label: '대응 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 2,
        maxCount: 2,
        description: '전후 측정값',
        example: '사전 평가, 사후 평가'
      }
    ],
    notes: ['대응표본 t-검정의 비모수 대안', '동점 처리 방법 중요']
  },
  {
    id: 'kruskal-wallis',
    name: 'Kruskal-Wallis 검정',
    category: 'nonparametric',
    description: '3개 이상 집단의 중위수 비교',
    minSampleSize: 6,
    assumptions: ['독립성', '순서척도 이상'],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: false,
        description: '비교할 변수',
        example: '통증 점수'
      },
      {
        role: 'factor',
        label: '그룹 변수',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '3개 이상 그룹을 구분하는 변수',
        example: '치료법 (A/B/C/D)'
      }
    ],
    notes: ['일원분산분석의 비모수 대안', '사후검정: Dunn Test']
  },
  {
    id: 'friedman',
    name: 'Friedman 검정',
    category: 'nonparametric',
    description: '반복측정 자료의 비모수 검정',
    minSampleSize: 6,
    assumptions: ['블록 내 순위 가능'],
    variables: [
      {
        role: 'within',
        label: '반복측정 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 3,
        description: '3개 이상 반복 측정값',
        example: '시점1, 시점2, 시점3'
      }
    ],
    notes: ['반복측정 ANOVA의 비모수 대안', '사후검정: Nemenyi Test']
  },
  {
    id: 'sign-test',
    name: '부호 검정',
    category: 'nonparametric',
    description: '대응 표본의 가장 단순한 비교',
    minSampleSize: 5,
    assumptions: ['독립성'],
    variables: [
      {
        role: 'dependent',
        label: '대응 변수',
        types: ['continuous', 'ordinal', 'binary'],
        required: true,
        multiple: true,
        minCount: 2,
        maxCount: 2,
        description: '전후 측정값',
        example: '개선 전, 개선 후'
      }
    ],
    notes: ['차이의 방향만 고려', 'Wilcoxon보다 검정력 낮음']
  },
  {
    id: 'runs-test',
    name: '런 검정',
    category: 'nonparametric',
    description: '자료의 무작위성 검정',
    minSampleSize: 10,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['binary', 'continuous'],
        required: true,
        multiple: false,
        description: '무작위성을 검정할 변수',
        example: '동전 던지기 결과 (앞/뒤)'
      }
    ],
    notes: ['연속형 변수는 중위수 기준 이진화', 'Wald-Wolfowitz Runs Test']
  },
  {
    id: 'kolmogorov-smirnov',
    name: 'Kolmogorov-Smirnov 검정',
    category: 'nonparametric',
    description: '분포의 동일성 검정',
    minSampleSize: 5,
    assumptions: ['연속 분포'],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '분포를 검정할 연속형 변수',
        example: '측정값'
      },
      {
        role: 'factor',
        label: '그룹 변수 (선택)',
        types: ['categorical', 'binary'],
        required: false,
        multiple: false,
        description: '두 그룹 비교 시',
        example: '제조사 (A/B)'
      }
    ],
    notes: ['일표본: 정규성 검정', '이표본: 분포 동일성 검정']
  },
  {
    id: 'mcnemar',
    name: 'McNemar 검정',
    category: 'nonparametric',
    description: '대응 표본의 이진 자료 분석',
    minSampleSize: 20,
    assumptions: ['대응 표본', '이진 자료'],
    variables: [
      {
        role: 'dependent',
        label: '대응 이진 변수',
        types: ['binary'],
        required: true,
        multiple: true,
        minCount: 2,
        maxCount: 2,
        description: '전후 이진 측정값',
        example: '치료 전 증상(유/무), 치료 후 증상(유/무)'
      }
    ],
    notes: ['2x2 교차표 분석', '불일치 셀만 사용']
  },

  {
    id: 'cochran-q',
    name: 'Cochran Q 검정',
    category: 'nonparametric',
    description: '반복측정 이진 데이터에서 3개 이상 조건의 성공률 비교',
    minSampleSize: 2,
    assumptions: ['반복측정 설계', '이진 자료', '최소 3개 조건'],
    variables: [
      {
        role: 'independent',
        label: '피험자 변수',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '피험자를 구분하는 식별 변수 (ID, 이름 등)',
        example: 'SubjectID, ParticipantName'
      },
      {
        role: 'dependent',
        label: '조건 변수',
        types: ['binary'],
        required: true,
        multiple: true,
        minCount: 3,
        description: '이진 데이터 (0/1) 조건 변수 3개 이상',
        example: 'TreatmentA (0/1), TreatmentB (0/1), TreatmentC (0/1)'
      }
    ],
    notes: ['Friedman 검정의 이진 데이터 버전', 'Chi-square 분포 사용']
  },

  {
    id: 'mood-median',
    name: 'Mood Median Test',
    category: 'nonparametric',
    description: '중앙값 기반 비모수 검정 (그룹 간 중앙값 비교)',
    minSampleSize: 2,
    assumptions: ['독립 표본', '순서형 이상 데이터', '정규성 가정 불필요'],
    variables: [
      {
        role: 'factor',
        label: '그룹 변수',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '그룹을 구분하는 범주형 변수 (2개 이상 그룹)',
        example: 'Treatment (A/B/C), Region (East/West/North/South)'
      },
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: false,
        description: '중앙값을 비교할 연속형 변수',
        example: 'RecoveryTime, PollutionLevel, Income'
      }
    ],
    notes: ['Kruskal-Wallis의 중앙값 기반 대안', '이상치에 강건', 'Chi-square 검정 사용']
  },

  {
    id: 'binomial-test',
    name: '이항 검정',
    category: 'nonparametric',
    description: '이진 결과의 성공 확률 검정 (단일 비율 검정)',
    minSampleSize: 1,
    assumptions: ['독립 시행', '이진 결과 (성공/실패)', '일정한 성공 확률'],
    variables: [
      {
        role: 'dependent',
        label: '이진 변수',
        types: ['binary', 'categorical'],
        required: true,
        multiple: false,
        description: '성공/실패를 나타내는 이진 변수',
        example: 'Pass/Fail, Yes/No, 0/1, Defective/Good'
      }
    ],
    notes: ['정확한 p-value 계산', '양측/단측 검정 지원', '귀무가설 확률(p₀) 설정 가능']
  },

  {
    id: 'mann-kendall-test',
    name: 'Mann-Kendall 추세 검정',
    category: 'nonparametric',
    description: '시계열 데이터의 단조 추세 검정',
    minSampleSize: 4,
    assumptions: ['시간 순서 데이터', '독립 관측값'],
    variables: [
      {
        role: 'dependent',
        label: '시계열 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: false,
        description: '추세를 검정할 시계열 데이터',
        example: '월별 수온, 연도별 강수량'
      }
    ],
    notes: ['정규분포 가정 불필요', 'Sen\'s slope로 추세 크기 추정', '계절성 보정 가능']
  },

  // ========================================
  // 7. 카이제곱 검정 (Chi-square) - 3개
  // ========================================
  {
    id: 'chi-square-independence',
    name: '카이제곱 독립성 검정',
    category: 'chi-square',
    description: '두 범주형 변수의 독립성 검정',
    minSampleSize: 20,
    assumptions: ['기대빈도 ≥ 5 (80% 셀)'],
    variables: [
      {
        role: 'independent',
        label: '행 변수',
        types: ['categorical', 'binary', 'ordinal'],
        required: true,
        multiple: false,
        description: '첫 번째 범주형 변수',
        example: '흡연 여부'
      },
      {
        role: 'dependent',
        label: '열 변수',
        types: ['categorical', 'binary', 'ordinal'],
        required: true,
        multiple: false,
        description: '두 번째 범주형 변수',
        example: '폐암 여부'
      },
      {
        role: 'weight',
        label: '가중치 (선택)',
        types: ['continuous'],
        required: false,
        multiple: false,
        description: '케이스 가중치',
        example: '표본 가중치'
      }
    ],
    notes: ['2x2표는 Yates 보정', 'Cramér\'s V로 효과크기']
  },
  {
    id: 'chi-square-goodness',
    name: '카이제곱 적합도 검정',
    category: 'chi-square',
    description: '관찰 빈도와 기대 빈도 비교',
    minSampleSize: 20,
    assumptions: ['기대빈도 ≥ 5 (모든 범주)'],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['categorical', 'binary'],
        required: true,
        multiple: false,
        description: '적합도를 검정할 범주형 변수',
        example: '주사위 눈 (1~6)'
      }
    ],
    notes: ['기대 비율은 별도 입력', '기본값: 균등 분포']
  },
  {
    id: 'fisher-exact',
    name: 'Fisher 정확 검정',
    category: 'chi-square',
    description: '2x2 표의 정확한 독립성 검정',
    minSampleSize: 1,
    assumptions: [],
    variables: [
      {
        role: 'independent',
        label: '행 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '첫 번째 이진 변수',
        example: '성별_암수'
      },
      {
        role: 'dependent',
        label: '열 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '두 번째 이진 변수',
        example: '선호도 (좋음/싫음)'
      }
    ],
    notes: ['작은 표본에서 정확', '카이제곱 검정의 대안']
  },

  // ========================================
  // 8. 고급분석 (Advanced) - 4개
  // ========================================
  {
    id: 'factor-analysis',
    name: '요인분석',
    category: 'advanced',
    description: '잠재 요인 추출 및 구조 파악',
    minSampleSize: 100,
    assumptions: ['선형성', '적절한 상관', 'KMO > 0.5'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous', 'ordinal'],
        required: true,
        multiple: true,
        minCount: 3,
        description: '요인을 추출할 변수들',
        example: '문항1, 문항2, 문항3, ...'
      }
    ],
    notes: ['표본크기: 변수당 5-10개', 'Bartlett 구형성 검정', 'Varimax 회전']
  },
  {
    id: 'pca',
    name: '주성분분석',
    category: 'advanced',
    description: '차원 축소 및 주성분 추출',
    minSampleSize: 30,
    assumptions: ['선형성', '적절한 상관'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '주성분을 추출할 연속형 변수들',
        example: '변수1, 변수2, 변수3, ...'
      }
    ],
    notes: ['누적 설명 분산 70% 이상', 'Scree Plot으로 주성분 수 결정']
  },
  {
    id: 'cluster-analysis',
    name: '군집분석',
    category: 'advanced',
    description: '유사한 개체들을 그룹화',
    minSampleSize: 30,
    assumptions: ['거리 측정 가능', '이상치 처리'],
    variables: [
      {
        role: 'dependent',
        label: '군집화 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '군집 기준이 될 변수들',
        example: '구매액, 방문빈도, 체류시간'
      }
    ],
    notes: ['표준화 필수', 'K-means 또는 계층적 군집', 'Elbow Method']
  },
  {
    id: 'discriminant-analysis',
    name: '판별분석',
    category: 'advanced',
    description: '그룹 예측 및 판별 함수 도출',
    minSampleSize: 50,
    assumptions: ['다변량 정규성', '공분산 행렬 동질성'],
    variables: [
      {
        role: 'dependent',
        label: '그룹 변수',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '판별할 그룹',
        example: '고객 등급 (VIP/일반/신규)'
      },
      {
        role: 'independent',
        label: '판별 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '판별에 사용할 변수들',
        example: '나이, 소득, 구매횟수'
      }
    ],
    notes: ['그룹당 20개 이상 표본', 'Box\'s M Test', 'Leave-one-out CV']
  },

  // ========================================
  // 9. 생존분석 (Survival Analysis) - 2개
  // ========================================
  {
    id: 'kaplan-meier',
    name: 'Kaplan-Meier 생존분석',
    category: 'survival',
    description: '생존함수 추정 및 생존곡선 (Log-rank 검정 포함)',
    minSampleSize: 10,
    assumptions: ['독립적 중도절단', '비정보적 중도절단'],
    variables: [
      {
        role: 'time',
        label: '시간 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '생존 시간 (양수)',
        example: '생존일수, 관찰기간_월'
      },
      {
        role: 'event',
        label: '사건 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '사건 발생 여부 (1=발생, 0=중도절단)',
        example: '사망여부 (1=사망, 0=생존)'
      },
      {
        role: 'factor',
        label: '그룹 변수 (선택)',
        types: ['categorical', 'binary'],
        required: false,
        multiple: false,
        description: '그룹별 생존곡선 비교 시',
        example: '처치군 (실험/대조)'
      }
    ],
    notes: ['Log-rank 검정으로 그룹 비교', '중앙 생존시간 추정', 'lifelines 라이브러리 사용']
  },
  {
    id: 'cox-regression',
    name: 'Cox 비례위험 회귀',
    category: 'survival',
    description: '공변량의 위험비(HR) 추정',
    minSampleSize: 30,
    assumptions: ['비례위험 가정', '독립적 중도절단'],
    variables: [
      {
        role: 'time',
        label: '시간 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '생존 시간 (양수)',
        example: '관찰기간_일'
      },
      {
        role: 'event',
        label: '사건 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '사건 발생 여부 (1=발생, 0=중도절단)',
        example: '이탈여부 (1=이탈, 0=유지)'
      },
      {
        role: 'independent',
        label: '공변량',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '위험비를 추정할 예측변수들',
        example: '연령, 성별, 처치방법'
      }
    ],
    notes: ['Hazard Ratio 해석', 'Schoenfeld 잔차로 가정 검정', 'lifelines 라이브러리 사용']
  },

  // ========================================
  // 10. 시계열 분석 (Time Series) - 3개
  // ========================================
  {
    id: 'arima',
    name: 'ARIMA 모델',
    category: 'timeseries',
    description: '자기회귀 누적 이동평균 모델로 예측',
    minSampleSize: 50,
    assumptions: ['정상성 (차분 후)', '잔차 백색잡음'],
    variables: [
      {
        role: 'dependent',
        label: '시계열 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측할 시계열 데이터',
        example: '월별_매출, 일일_수온'
      },
      {
        role: 'time',
        label: '시간 인덱스 (선택)',
        types: ['date'],
        required: false,
        multiple: false,
        description: '날짜/시간 변수 (없으면 순서 사용)',
        example: '측정일자, 년월'
      }
    ],
    notes: ['Auto ARIMA로 최적 (p,d,q) 탐색', 'AIC/BIC 기준', 'statsmodels 라이브러리 사용']
  },
  {
    id: 'seasonal-decompose',
    name: '계절성 분해',
    category: 'timeseries',
    description: '시계열을 추세, 계절, 잔차로 분해',
    minSampleSize: 24,
    assumptions: ['주기적 계절성'],
    variables: [
      {
        role: 'dependent',
        label: '시계열 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '분해할 시계열 데이터',
        example: '월별_판매량, 분기별_생산량'
      },
      {
        role: 'time',
        label: '시간 인덱스 (선택)',
        types: ['date'],
        required: false,
        multiple: false,
        description: '날짜/시간 변수',
        example: '년월'
      }
    ],
    notes: ['가법/승법 모델 선택', '계절 주기 지정 필요', 'statsmodels 라이브러리 사용']
  },
  {
    id: 'stationarity-test',
    name: '정상성 검정',
    category: 'timeseries',
    description: 'ADF/KPSS 단위근 검정',
    minSampleSize: 20,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '시계열 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '정상성을 검정할 시계열',
        example: '주가, 환율'
      }
    ],
    notes: ['ADF: 단위근 귀무가설', 'KPSS: 정상성 귀무가설', '두 검정 결합 권장']
  }
]

/**
 * 메서드 ID로 요구사항 조회
 */
export function getMethodRequirements(methodId: string): StatisticalMethodRequirements | undefined {
  return STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
}

/**
 * 간단한 변수 요구사항 조회 (기존 코드 호환성)
 */
export function getVariableRequirements(method: string): VariableRequirement {
  const methodReq = getMethodRequirements(method)
  if (!methodReq) {
    return {
      role: 'dependent',
      label: '변수',
      types: ['continuous'],
      required: true,
      multiple: false,
      description: '변수 선택이 필요합니다'
    }
  }

  // 첫 번째 변수 요구사항 반환 (간단한 호환성 유지)
  return methodReq.variables[0]
}

/**
 * 카테고리별 메서드 조회
 */
export function getMethodsByCategory(category: string): StatisticalMethodRequirements[] {
  return STATISTICAL_METHOD_REQUIREMENTS.filter(m => m.category === category)
}

/**
 * 변수 타입에 맞는 메서드 추천
 */
export function recommendMethodsByVariableTypes(
  continuousCount: number,
  categoricalCount: number,
  binaryCount: number,
  ordinalCount: number
): StatisticalMethodRequirements[] {
  const recommendations: StatisticalMethodRequirements[] = []

  // 연속형 변수만 있을 때
  if (continuousCount >= 2 && categoricalCount === 0) {
    recommendations.push(
      ...STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        ['pearson-correlation', 'simple-regression', 'pca'].includes(m.id)
      )
    )
  }

  // 연속형 1개 + 범주형 1개 (그룹 비교)
  if (continuousCount >= 1 && (categoricalCount >= 1 || binaryCount >= 1)) {
    recommendations.push(
      ...STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        ['two-sample-t', 'one-way-anova', 'mann-whitney'].includes(m.id)
      )
    )
  }

  // 범주형 변수만 있을 때
  if (categoricalCount >= 2 && continuousCount === 0) {
    recommendations.push(
      ...STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        ['chi-square-independence', 'cross-tabulation'].includes(m.id)
      )
    )
  }

  // 서열형 변수가 있을 때
  if (ordinalCount >= 2) {
    recommendations.push(
      ...STATISTICAL_METHOD_REQUIREMENTS.filter(m =>
        ['spearman-correlation', 'kendall-correlation'].includes(m.id)
      )
    )
  }

  return recommendations
}