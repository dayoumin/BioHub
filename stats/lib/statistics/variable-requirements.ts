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

// ============================================================================
// 가이드 컴포넌트용 확장 타입 (Phase 1)
// ============================================================================

/**
 * 데이터 형식 안내
 */
export interface DataFormatGuide {
  type: 'wide' | 'long' | 'both'
  description: string
  columns: {
    name: string
    description: string
    example: string
    required?: boolean
  }[]
}

/**
 * 설정값 옵션
 */
export interface SettingOption {
  value: string | number
  label: string
  description: string
}

/**
 * 설정값 설명
 */
export interface SettingDescription {
  label: string
  description: string
  options?: SettingOption[]
  default?: string | number | null
  range?: { min: number; max: number }
}

/**
 * 예시 데이터 테이블
 */
export interface SampleDataTable {
  headers: string[]
  rows: (string | number)[][]
  description?: string
}

// ============================================================================
// 메인 인터페이스
// ============================================================================

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

  // 가이드 컴포넌트용 확장 필드 (선택적)
  dataFormat?: DataFormatGuide
  settings?: Record<string, SettingDescription>
  sampleData?: SampleDataTable
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
    ],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 분석할 연속형 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '분석변수', description: '기술통계를 계산할 연속형 변수들', example: '체중, 체장, BMI', required: true },
        { name: '그룹변수', description: '그룹별 통계 시 (선택)', example: '성별, 그룹', required: false }
      ]
    },
    settings: {
      alpha: { label: '신뢰수준', description: '신뢰구간 계산용', default: 0.05, range: { min: 0.001, max: 0.1 } },
      statistics: {
        label: '계산할 통계량',
        description: '출력할 기술통계량 선택',
        default: 'all',
        options: [
          { value: 'all', label: '모두', description: '모든 기술통계량' },
          { value: 'basic', label: '기본', description: '평균, 표준편차, N' },
          { value: 'extended', label: '확장', description: '기본 + 사분위수, 왜도, 첨도' }
        ]
      },
      missingValues: {
        label: '결측치 처리',
        description: '결측값 처리 방법',
        default: 'listwise',
        options: [
          { value: 'listwise', label: 'Listwise', description: '결측 포함 행 제외' },
          { value: 'pairwise', label: 'Pairwise', description: '변수별로 제외' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '체중', '체장', '비만도', '성별'],
      rows: [
        [1, 250, 32.5, 0.73, '수컷'],
        [2, 280, 35.0, 0.65, '암컷'],
        [3, 265, 33.2, 0.72, '수컷'],
        [4, 295, 36.1, 0.63, '암컷'],
        [5, 242, 31.8, 0.75, '수컷']
      ],
      description: '어류 형태 측정 데이터 (그룹별 기술통계)'
    }
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
    ],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 범주형 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '범주변수', description: '빈도를 계산할 범주형 변수들', example: '품질등급, 지역', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '참조용', default: 0.05, range: { min: 0.001, max: 0.1 } },
      percentType: {
        label: '백분율 유형',
        description: '백분율 계산 기준',
        default: 'total',
        options: [
          { value: 'total', label: '전체 %', description: '전체 대비 백분율' },
          { value: 'valid', label: '유효 %', description: '결측 제외 백분율' },
          { value: 'cumulative', label: '누적 %', description: '누적 백분율 포함' }
        ]
      },
      sortBy: {
        label: '정렬 기준',
        description: '출력 정렬 방식',
        default: 'label',
        options: [
          { value: 'label', label: '라벨순', description: '범주 라벨 기준' },
          { value: 'frequency', label: '빈도순', description: '빈도 내림차순' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '품질등급', '사료종류'],
      rows: [
        [1, 'A', 'Premium'],
        [2, 'B', 'Standard'],
        [3, 'A', 'Premium'],
        [4, 'C', 'Economy'],
        [5, 'B', 'Standard']
      ],
      description: '제품 품질등급 및 사료종류 빈도분석 데이터'
    }
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
    ],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 두 범주형 변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '행변수', description: '교차표의 행에 표시될 범주형 변수', example: '성별(남/여)', required: true },
        { name: '열변수', description: '교차표의 열에 표시될 범주형 변수', example: '구매여부(Y/N)', required: true },
        { name: '층화변수', description: '층별 교차표 시 (선택)', example: '연령대', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '카이제곱 검정 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      chiSquare: {
        label: '카이제곱 검정',
        description: '독립성 검정 수행 여부',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '독립성 검정 포함' },
          { value: 'no', label: '아니오', description: '빈도표만 출력' }
        ]
      },
      expectedFreq: {
        label: '기대빈도',
        description: '기대빈도 출력 여부',
        default: 'no',
        options: [
          { value: 'yes', label: '예', description: '기대빈도 포함' },
          { value: 'no', label: '아니오', description: '관측빈도만' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '성별', '구매여부', '연령대'],
      rows: [
        [1, '남', '구매', '20대'],
        [2, '여', '미구매', '30대'],
        [3, '남', '구매', '20대'],
        [4, '여', '구매', '40대'],
        [5, '남', '미구매', '30대']
      ],
      description: '성별과 구매여부의 교차표 (연령대별 층화 가능)'
    }
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
    notes: ['정규성 검정(Shapiro-Wilk), Q-Q plot, 이상치 탐지 포함'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 탐색할 연속형 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '탐색변수', description: '탐색할 연속형 변수들', example: '생산량, 수온, 염분도', required: true },
        { name: '그룹변수', description: '그룹별 탐색 시 (선택)', example: '부서, 지역', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '정규성 검정 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      normalityTest: {
        label: '정규성 검정',
        description: '정규성 검정 방법',
        default: 'shapiro',
        options: [
          { value: 'shapiro', label: 'Shapiro-Wilk', description: '소표본 권장' },
          { value: 'ks', label: 'K-S', description: '대표본용' },
          { value: 'both', label: '둘 다', description: '두 검정 모두' }
        ]
      },
      outliers: {
        label: '이상치 탐지',
        description: '이상치 식별 방법',
        default: 'iqr',
        options: [
          { value: 'iqr', label: 'IQR', description: '1.5×IQR 기준' },
          { value: 'zscore', label: 'Z-score', description: '±3 기준' },
          { value: 'both', label: '둘 다', description: '두 방법 모두' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '생산량', '수온', '염분도', '지역'],
      rows: [
        [1, 1250, 18.5, 32.1, '동해'],
        [2, 980, 15.2, 31.8, '서해'],
        [3, 1100, 17.8, 33.5, '동해'],
        [4, 1350, 19.2, 30.5, '남해'],
        [5, 890, 14.5, 32.8, '서해']
      ],
      description: '해역별 생산량 및 환경변수 탐색 데이터'
    }
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
    notes: ['최소 2개 이상의 항목 필요', '일반적으로 3개 이상 권장'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 응답자입니다. 척도 항목들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '응답자 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '항목1', description: '첫 번째 척도 문항', example: '품질평가1 (1-5점)', required: true },
        { name: '항목2', description: '두 번째 척도 문항', example: '품질평가2 (1-5점)', required: true },
        { name: '항목N', description: '추가 척도 문항', example: '품질평가3, 4, ...', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '신뢰구간 계산용', default: 0.05, range: { min: 0.001, max: 0.1 } },
      itemAnalysis: {
        label: '항목 분석',
        description: '항목 삭제 시 알파 변화',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '각 항목 삭제 시 알파 계산' },
          { value: 'no', label: '아니오', description: '전체 알파만 계산' }
        ]
      },
      correlations: {
        label: '상관행렬',
        description: '항목 간 상관계수 출력',
        default: 'no',
        options: [
          { value: 'yes', label: '예', description: '항목 간 상관행렬 출력' },
          { value: 'no', label: '아니오', description: '상관행렬 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '문항1', '문항2', '문항3', '문항4'],
      rows: [
        [1, 4, 5, 4, 5],
        [2, 3, 3, 4, 3],
        [3, 5, 5, 5, 5],
        [4, 2, 3, 2, 3],
        [5, 4, 4, 4, 4]
      ],
      description: '5명 응답자의 4문항 척도 응답 (신뢰도 분석용)'
    }
  },

  // ========================================
  // 2. 평균 비교 (Compare Means) - 6개
  // ========================================
  {
    id: 'one-sample-t',
    name: '일표본 t-검정',
    category: 't-test',
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
    notes: ['검정값(Test Value)은 별도 입력', '기본값은 0'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 검정할 연속형 변수가 하나의 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '검정하고자 하는 연속형 변수',
          example: '시험 점수, 체중(g), 온도(°C)',
          required: true
        }
      ]
    },
    settings: {
      testValue: {
        label: '검정값 (μ₀)',
        description: '귀무가설에서 가정하는 모집단 평균입니다. 표본 평균이 이 값과 유의하게 다른지 검정합니다.',
        default: 0,
        range: { min: -Infinity, max: Infinity }
      },
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '평균이 검정값과 다른지 검정 (μ ≠ μ₀)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '평균이 검정값보다 큰지 검정 (μ > μ₀)' },
          { value: 'less', label: '단측 검정 (less)', description: '평균이 검정값보다 작은지 검정 (μ < μ₀)' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['ID', '시험점수'],
      rows: [
        [1, 78],
        [2, 85],
        [3, 72],
        [4, 91],
        [5, 68],
        [6, 83],
        [7, 76],
        [8, 89],
        [9, 74],
        [10, 82]
      ],
      description: '10명 학생의 시험 점수 (평균이 75점과 다른지 검정)'
    }
  },
  {
    id: 'two-sample-t',
    name: '독립표본 t-검정',
    category: 't-test',
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
    notes: ['그룹 변수는 정확히 2개 수준만 가져야 함'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 개체(관측치)를 나타냅니다. 종속 변수(측정값)와 그룹 변수(집단 구분)가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '개체 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '비교하고자 하는 연속형 변수',
          example: '체중(g), 키(cm), 점수',
          required: true
        },
        {
          name: '그룹',
          description: '두 집단을 구분하는 변수 (정확히 2개 수준)',
          example: '처리군/대조군, 암/수, A/B',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다. 일반적으로 0.05를 사용하며, 더 엄격한 기준이 필요하면 0.01을 사용합니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다. 방향성에 대한 사전 가설이 없으면 양측 검정을 사용합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '두 집단의 평균이 다른지 검정 (μ₁ ≠ μ₂)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '첫 번째 집단의 평균이 더 큰지 검정 (μ₁ > μ₂)' },
          { value: 'less', label: '단측 검정 (less)', description: '첫 번째 집단의 평균이 더 작은지 검정 (μ₁ < μ₂)' }
        ],
        default: 'two-sided'
      },
      equalVar: {
        label: '등분산 가정',
        description: '두 집단의 분산이 같다고 가정할지 선택합니다. Levene 검정 결과가 유의하면 등분산 가정을 사용하지 않는 것이 좋습니다.',
        options: [
          { value: 'true', label: 'Student t-검정', description: '등분산 가정 사용 (두 집단의 분산이 같다고 가정)' },
          { value: 'false', label: 'Welch t-검정', description: '등분산 가정 미사용 (분산이 다를 수 있음, 더 안전한 선택)' }
        ],
        default: 'false'
      }
    },
    sampleData: {
      headers: ['ID', '체중(g)', '처리군'],
      rows: [
        [1, 245, '대조군'],
        [2, 238, '대조군'],
        [3, 251, '대조군'],
        [4, 243, '대조군'],
        [5, 256, '대조군'],
        [6, 278, '처리군'],
        [7, 285, '처리군'],
        [8, 269, '처리군'],
        [9, 292, '처리군'],
        [10, 281, '처리군']
      ],
      description: '처리군과 대조군의 체중 비교 (각 5마리)'
    }
  },
  {
    id: 'paired-t',
    name: '대응표본 t-검정',
    category: 't-test',
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
    notes: ['첫 번째 변수 - 두 번째 변수 = 차이값으로 계산'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 동일한 대상(개체)의 전후 측정값을 나타냅니다. 두 측정 시점의 값이 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '대상(개체) 식별자 (선택)',
          example: '피험자1, 피험자2...',
          required: false
        },
        {
          name: '사전측정',
          description: '첫 번째 시점(전) 측정값',
          example: '사전체중, 교육전점수',
          required: true
        },
        {
          name: '사후측정',
          description: '두 번째 시점(후) 측정값',
          example: '사후체중, 교육후점수',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다. 차이 = 사전 - 사후 로 계산됩니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '전후 평균이 다른지 검정 (μ₁ ≠ μ₂)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '사전이 더 큰지 검정 (μ₁ > μ₂)' },
          { value: 'less', label: '단측 검정 (less)', description: '사전이 더 작은지 검정 (μ₁ < μ₂)' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['피험자', '다이어트전(kg)', '다이어트후(kg)'],
      rows: [
        ['A', 75.2, 72.1],
        ['B', 82.5, 79.8],
        ['C', 68.3, 66.5],
        ['D', 91.0, 87.2],
        ['E', 77.8, 75.0],
        ['F', 85.1, 82.3],
        ['G', 72.9, 70.1],
        ['H', 79.6, 76.8]
      ],
      description: '8명의 다이어트 프로그램 전후 체중 비교'
    }
  },
  {
    id: 'welch-t',
    name: 'Welch t-검정',
    category: 't-test',
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
    notes: ['등분산성이 위반될 때 사용', 'Satterthwaite 자유도 사용'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 종속 변수와 그룹 변수가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '비교하고자 하는 연속형 변수',
          example: '급여, 생산량, 반응시간',
          required: true
        },
        {
          name: '그룹',
          description: '두 집단을 구분하는 변수 (정확히 2개 수준)',
          example: '영업/개발, 남/여, A공장/B공장',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '두 집단의 평균이 다른지 검정 (μ₁ ≠ μ₂)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '첫 번째 집단의 평균이 더 큰지 검정 (μ₁ > μ₂)' },
          { value: 'less', label: '단측 검정 (less)', description: '첫 번째 집단의 평균이 더 작은지 검정 (μ₁ < μ₂)' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['직원ID', '연봉(만원)', '부서'],
      rows: [
        [1, 4500, '영업'],
        [2, 4200, '영업'],
        [3, 4800, '영업'],
        [4, 4100, '영업'],
        [5, 5200, '개발'],
        [6, 5800, '개발'],
        [7, 5500, '개발'],
        [8, 6100, '개발'],
        [9, 5900, '개발'],
        [10, 4300, '영업']
      ],
      description: '영업부서와 개발부서 직원 연봉 비교 (분산이 다를 수 있음)'
    }
  },
  {
    id: 'one-sample-proportion',
    name: '일표본 비율 검정',
    category: 't-test',
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
    notes: ['검정 비율은 별도 입력', 'Wilson Score Interval 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 이진 변수(0/1 또는 성공/실패)가 필요합니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '결과', description: '성공/실패를 나타내는 이진 변수', example: '합격(1)/불합격(0)', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      testProportion: { label: '검정 비율 (p₀)', description: '귀무가설 비율', default: 0.5, range: { min: 0, max: 1 } },
      alternative: {
        label: '대립가설',
        description: '검정 방향',
        default: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측 (≠)', description: 'p ≠ p₀' },
          { value: 'greater', label: '우측 (>)', description: 'p > p₀' },
          { value: 'less', label: '좌측 (<)', description: 'p < p₀' }
        ]
      },
      ciMethod: {
        label: '신뢰구간 방법',
        description: '비율의 신뢰구간 계산 방법',
        default: 'wilson',
        options: [
          { value: 'wilson', label: 'Wilson Score', description: '권장 (정확도 높음)' },
          { value: 'normal', label: 'Normal', description: '근사 (대표본)' },
          { value: 'exact', label: 'Clopper-Pearson', description: '정확 (보수적)' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '합격여부'],
      rows: [
        [1, 1],
        [2, 0],
        [3, 1],
        [4, 1],
        [5, 0]
      ],
      description: '합격(1)/불합격(0) 데이터로 합격률 검정'
    }
  },
  {
    id: 'means-plot',
    name: '평균 도표',
    category: 't-test',
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
    notes: ['오차막대는 95% 신뢰구간 또는 표준오차'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속변수와 그룹 요인이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '평균을 계산할 연속형 변수', example: '판매량, 점수', required: true },
        { name: '요인1', description: '첫 번째 그룹 요인', example: '지역(A/B/C)', required: true },
        { name: '요인2', description: '두 번째 요인 (선택)', example: '분기(Q1/Q2/Q3/Q4)', required: false }
      ]
    },
    settings: {
      alpha: { label: '신뢰수준', description: '오차막대 신뢰구간', default: 0.05, range: { min: 0.001, max: 0.1 } },
      errorBars: {
        label: '오차막대',
        description: '오차막대 유형',
        default: 'ci',
        options: [
          { value: 'ci', label: '95% 신뢰구간', description: '평균의 신뢰구간' },
          { value: 'se', label: '표준오차', description: '±1 SE' },
          { value: 'sd', label: '표준편차', description: '±1 SD' }
        ]
      },
      chartType: {
        label: '차트 유형',
        description: '시각화 방식',
        default: 'bar',
        options: [
          { value: 'bar', label: '막대그래프', description: '범주 비교에 적합' },
          { value: 'line', label: '선그래프', description: '추세 표현에 적합' },
          { value: 'point', label: '점그래프', description: '개별 값 강조' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '판매량', '지역', '분기'],
      rows: [
        [1, 120, 'A', 'Q1'],
        [2, 150, 'A', 'Q2'],
        [3, 90, 'B', 'Q1'],
        [4, 110, 'B', 'Q2'],
        [5, 130, 'C', 'Q1']
      ],
      description: '지역×분기별 판매량 평균 도표 데이터'
    }
  },

  // ========================================
  // 3. 일반선형모델 (GLM) - 7개
  // ========================================
  {
    id: 'one-way-anova',
    name: '일원분산분석',
    category: 'anova',
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
    notes: ['사후검정 자동 수행 (Tukey HSD)'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 종속 변수(측정값)와 요인(집단 구분)이 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '비교하고자 하는 연속형 변수',
          example: '점수, 생산량, 반응시간',
          required: true
        },
        {
          name: '그룹',
          description: '3개 이상 수준을 가진 집단 구분 변수',
          example: '방법A/방법B/방법C, 지역1/지역2/지역3',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      postHoc: {
        label: '사후검정 방법',
        description: 'F-검정이 유의할 때 어떤 집단 쌍이 다른지 확인하는 검정입니다.',
        options: [
          { value: 'tukey', label: 'Tukey HSD', description: '가장 보수적, 표본 크기가 같을 때 적합' },
          { value: 'bonferroni', label: 'Bonferroni', description: '유의수준을 비교 횟수로 나눔, 매우 보수적' },
          { value: 'scheffe', label: 'Scheffé', description: '가장 보수적, 모든 선형대비 가능' },
          { value: 'games-howell', label: 'Games-Howell', description: '등분산 가정 없음, 표본 크기 다를 때 적합' }
        ],
        default: 'tukey'
      },
      welch: {
        label: 'Welch ANOVA',
        description: '등분산 가정을 하지 않는 ANOVA입니다. Levene 검정이 유의하면 사용을 권장합니다.',
        options: [
          { value: 'false', label: '표준 ANOVA', description: '등분산 가정 사용' },
          { value: 'true', label: 'Welch ANOVA', description: '등분산 가정 미사용' }
        ],
        default: 'false'
      }
    },
    sampleData: {
      headers: ['학생ID', '시험점수', '교육방법'],
      rows: [
        [1, 85, '강의식'],
        [2, 78, '강의식'],
        [3, 82, '강의식'],
        [4, 79, '강의식'],
        [5, 92, '토론식'],
        [6, 88, '토론식'],
        [7, 95, '토론식'],
        [8, 90, '토론식'],
        [9, 72, '온라인'],
        [10, 68, '온라인'],
        [11, 75, '온라인'],
        [12, 71, '온라인']
      ],
      description: '3가지 교육 방법(강의식, 토론식, 온라인)별 시험 점수 비교'
    }
  },
  {
    id: 'two-way-anova',
    name: '이원분산분석',
    category: 'anova',
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
    notes: ['상호작용 효과 검정 포함', '단순 주효과 분석 가능'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 종속 변수와 2개의 요인 변수가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '분석하고자 하는 연속형 변수',
          example: '수확량, 성과점수, 반응시간',
          required: true
        },
        {
          name: '요인A',
          description: '첫 번째 범주형 요인',
          example: '비료종류(A/B/C), 성별(남/여)',
          required: true
        },
        {
          name: '요인B',
          description: '두 번째 범주형 요인',
          example: '물공급량(적음/보통/많음), 연령대(청/중/장)',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      ssType: {
        label: '제곱합 유형',
        description: '불균형 설계에서 제곱합 계산 방법입니다.',
        options: [
          { value: 2, label: 'Type II', description: '주효과가 다른 주효과에 대해 조정됨' },
          { value: 3, label: 'Type III', description: '모든 효과가 다른 효과에 대해 조정됨 (SPSS 기본값)' }
        ],
        default: 3
      },
      postHoc: {
        label: '사후검정 방법',
        description: '주효과나 상호작용이 유의할 때 어떤 수준 쌍이 다른지 확인합니다.',
        options: [
          { value: 'tukey', label: 'Tukey HSD', description: '균형 설계에 적합' },
          { value: 'bonferroni', label: 'Bonferroni', description: '보수적, 소수 비교 시 적합' },
          { value: 'sidak', label: 'Sidak', description: 'Bonferroni보다 약간 덜 보수적' }
        ],
        default: 'tukey'
      }
    },
    sampleData: {
      headers: ['플롯ID', '수확량(kg)', '비료종류', '물공급'],
      rows: [
        [1, 45, '유기질', '적음'],
        [2, 52, '유기질', '보통'],
        [3, 58, '유기질', '많음'],
        [4, 42, '화학', '적음'],
        [5, 55, '화학', '보통'],
        [6, 60, '화학', '많음'],
        [7, 48, '유기질', '적음'],
        [8, 54, '유기질', '보통'],
        [9, 62, '유기질', '많음'],
        [10, 44, '화학', '적음'],
        [11, 58, '화학', '보통'],
        [12, 65, '화학', '많음']
      ],
      description: '비료 종류(2수준)와 물 공급량(3수준)이 수확량에 미치는 영향'
    }
  },
  {
    id: 'three-way-anova',
    name: '삼원분산분석',
    category: 'anova',
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
    notes: ['3원 상호작용까지 검정', '해석의 복잡성 주의'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속 변수와 3개 요인 변수가 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '측정값', description: '분석할 연속형 변수', example: '생산량, 점수', required: true },
        { name: '요인A', description: '첫 번째 범주형 요인', example: '부서(A/B)', required: true },
        { name: '요인B', description: '두 번째 범주형 요인', example: '경력(신입/경력)', required: true },
        { name: '요인C', description: '세 번째 범주형 요인', example: '교육(고졸/대졸)', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      ssType: {
        label: '제곱합 유형',
        description: '불균형 설계에서 제곱합 계산 방법',
        options: [
          { value: 2, label: 'Type II', description: '주효과가 다른 주효과에 대해 조정' },
          { value: 3, label: 'Type III', description: 'SPSS 기본값, 모든 효과 조정' }
        ],
        default: 3
      }
    },
    sampleData: {
      headers: ['ID', '생산량', '공장', '교대', '숙련도'],
      rows: [
        [1, 85, 'A', '주간', '숙련'], [2, 78, 'A', '주간', '비숙련'], [3, 82, 'A', '야간', '숙련'], [4, 72, 'A', '야간', '비숙련'],
        [5, 90, 'B', '주간', '숙련'], [6, 80, 'B', '주간', '비숙련'], [7, 88, 'B', '야간', '숙련'], [8, 75, 'B', '야간', '비숙련']
      ],
      description: '공장(A/B) × 교대(주간/야간) × 숙련도(숙련/비숙련)별 생산량'
    }
  },
  {
    id: 'ancova',
    name: '공분산분석',
    category: 'anova',
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
    notes: ['공변량과 요인 간 상호작용 검정 필요'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속변수, 요인, 공변량이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '비교할 연속형 변수', example: '사후점수', required: true },
        { name: '요인', description: '집단을 구분하는 범주형 변수', example: '교육방법(A/B/C)', required: true },
        { name: '공변량', description: '통제할 연속형 변수', example: '사전점수', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      ssType: {
        label: '제곱합 유형',
        description: '비균형 설계 시 제곱합 계산 방식',
        default: 'III',
        options: [
          { value: 'II', label: 'Type II', description: '순서 무관 제곱합' },
          { value: 'III', label: 'Type III', description: '직교 제곱합 (권장)' }
        ]
      },
      homogeneityTest: {
        label: '회귀선 평행성 검정',
        description: '공변량×요인 상호작용 검정',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '평행성 가정 검정 수행' },
          { value: 'no', label: '아니오', description: '검정 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '사후점수', '교육방법', '사전점수'],
      rows: [
        [1, 85, 'A', 70],
        [2, 78, 'A', 65],
        [3, 92, 'B', 75],
        [4, 88, 'B', 72],
        [5, 75, 'C', 68]
      ],
      description: '3개 교육방법의 사후점수 비교 (사전점수 통제)'
    }
  },
  {
    id: 'repeated-measures-anova',
    name: '반복측정 분산분석',
    category: 'anova',
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
    notes: ['Mauchly 구형성 검정', 'Greenhouse-Geisser 보정'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 피험자입니다. 반복측정 시점별 측정값이 별도 열로 구성됩니다.',
      columns: [
        { name: 'SubjectID', description: '피험자 식별자', example: 'S01, S02...', required: true },
        { name: '시점1', description: '첫 번째 측정 시점', example: 'Time1, Pre', required: true },
        { name: '시점2', description: '두 번째 측정 시점', example: 'Time2, Post', required: true },
        { name: '시점N', description: '추가 측정 시점', example: 'Time3, Follow-up', required: false },
        { name: '개체간요인', description: '그룹 비교 시 (선택)', example: '처치군(실험/대조)', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      sphericityCorrection: {
        label: '구형성 보정',
        description: '구형성 가정 위반 시 보정 방법',
        default: 'greenhouse-geisser',
        options: [
          { value: 'none', label: '없음', description: '구형성 가정' },
          { value: 'greenhouse-geisser', label: 'Greenhouse-Geisser', description: '보수적 보정' },
          { value: 'huynh-feldt', label: 'Huynh-Feldt', description: '자유로운 보정' }
        ]
      },
      postHoc: {
        label: '사후검정',
        description: '시점 간 다중 비교',
        default: 'bonferroni',
        options: [
          { value: 'bonferroni', label: 'Bonferroni', description: '보수적 다중 비교' },
          { value: 'sidak', label: 'Sidak', description: 'Bonferroni보다 검정력 높음' }
        ]
      }
    },
    sampleData: {
      headers: ['SubjectID', 'Time1', 'Time2', 'Time3', 'Group'],
      rows: [
        ['S01', 65, 72, 78, 'Exp'],
        ['S02', 58, 68, 75, 'Exp'],
        ['S03', 70, 75, 80, 'Ctrl'],
        ['S04', 62, 65, 68, 'Ctrl'],
        ['S05', 55, 63, 72, 'Exp']
      ],
      description: '5명 피험자의 3시점 반복측정 (2그룹)'
    }
  },
  {
    id: 'manova',
    name: '다변량 분산분석',
    category: 'anova',
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
    notes: ['Wilks\' Lambda, Pillai\'s Trace 등 검정'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 여러 종속변수와 요인이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수1', description: '첫 번째 연속형 종속변수', example: '수학점수', required: true },
        { name: '종속변수2', description: '두 번째 연속형 종속변수', example: '영어점수', required: true },
        { name: '종속변수N', description: '추가 종속변수', example: '과학점수', required: false },
        { name: '요인', description: '집단을 구분하는 범주형 변수', example: '교육방법', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      testStatistic: {
        label: '검정 통계량',
        description: '다변량 검정에 사용할 통계량',
        default: 'wilks',
        options: [
          { value: 'wilks', label: "Wilks' Lambda", description: '가장 일반적' },
          { value: 'pillai', label: "Pillai's Trace", description: '강건함' },
          { value: 'hotelling', label: "Hotelling's Trace", description: '2집단에 적합' },
          { value: 'roy', label: "Roy's Largest Root", description: '검정력 높음' }
        ]
      },
      boxM: {
        label: "Box's M 검정",
        description: '공분산 행렬 동질성 검정',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '동질성 가정 검정' },
          { value: 'no', label: '아니오', description: '검정 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '수학', '영어', '과학', '교육방법'],
      rows: [
        [1, 85, 78, 82, 'A'],
        [2, 72, 80, 75, 'A'],
        [3, 90, 88, 92, 'B'],
        [4, 68, 72, 70, 'B'],
        [5, 78, 82, 80, 'C']
      ],
      description: '3과목 점수의 교육방법별 비교 (다변량)'
    }
  },
  {
    id: 'mixed-model',
    name: '선형 혼합 모형',
    category: 'anova',
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
    notes: ['위계적 자료 구조에 적합', 'REML 추정 사용'],

    dataFormat: {
      type: 'long',
      description: '각 행이 하나의 관측입니다. 피험자가 여러 행에 걸쳐 반복 나타납니다 (Long format).',
      columns: [
        { name: 'SubjectID', description: '피험자/군집 식별자', example: 'S01, S02...', required: true },
        { name: '종속변수', description: '분석할 연속형 변수', example: '점수, 반응시간', required: true },
        { name: '고정효과', description: '고정 효과 변수들', example: '처치, 시점, 성별', required: true },
        { name: '무선효과', description: '무선 효과 변수 (군집)', example: '학교ID, 지역', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      estimation: {
        label: '추정 방법',
        description: '분산 성분 추정 방법',
        default: 'reml',
        options: [
          { value: 'reml', label: 'REML', description: '제한최대우도추정 (권장)' },
          { value: 'ml', label: 'ML', description: '최대우도추정' }
        ]
      },
      randomSlope: {
        label: '무선 기울기',
        description: '무선 기울기 포함 여부',
        default: 'no',
        options: [
          { value: 'no', label: '무선 절편만', description: '단순 구조' },
          { value: 'yes', label: '무선 기울기 포함', description: '복잡 구조' }
        ]
      }
    },
    sampleData: {
      headers: ['StudentID', 'Score', 'Treatment', 'Time', 'SchoolID'],
      rows: [
        ['S01', 75, 'A', 1, 'Sch1'],
        ['S01', 82, 'A', 2, 'Sch1'],
        ['S02', 68, 'B', 1, 'Sch1'],
        ['S02', 72, 'B', 2, 'Sch1'],
        ['S03', 80, 'A', 1, 'Sch2']
      ],
      description: '학생(개인)이 학교(군집)에 내재된 반복측정 데이터'
    }
  },
  {
    id: 'response-surface',
    name: '반응표면 분석',
    category: 'anova',
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
    notes: ['2차 모델 적합', '최적점/saddle point 탐색', 'Central Composite Design 권장'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 실험 조건입니다. 반응변수와 2개 이상의 예측변수가 열로 구성됩니다.',
      columns: [
        { name: 'RunID', description: '실험 순번', example: '1, 2, 3...', required: false },
        { name: '반응변수', description: '최적화할 연속형 변수', example: '수율(%), 강도(MPa)', required: true },
        { name: '예측변수1', description: '첫 번째 연속형 예측변수', example: '온도(°C)', required: true },
        { name: '예측변수2', description: '두 번째 연속형 예측변수', example: '압력(bar)', required: true },
        { name: '예측변수N', description: '추가 예측변수', example: '시간(min)', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '계수 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      modelOrder: {
        label: '모델 차수',
        description: '다항식 모델 차수',
        default: 'quadratic',
        options: [
          { value: 'linear', label: '1차 (선형)', description: '주효과만' },
          { value: 'interaction', label: '1차 + 상호작용', description: '주효과 + 교호작용' },
          { value: 'quadratic', label: '2차 (완전)', description: '주효과 + 교호작용 + 2차항' }
        ]
      },
      optimization: {
        label: '최적화',
        description: '최적점 탐색',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '정상점/최적 조건 탐색' },
          { value: 'no', label: '아니오', description: '모델 적합만' }
        ]
      }
    },
    sampleData: {
      headers: ['Run', '수율', '온도', '압력', '시간'],
      rows: [
        [1, 78.5, 150, 2.0, 30],
        [2, 82.3, 160, 2.5, 40],
        [3, 75.1, 140, 1.5, 20],
        [4, 85.8, 155, 2.2, 35],
        [5, 80.2, 145, 2.8, 25]
      ],
      description: '공정 최적화를 위한 반응표면 실험 데이터'
    }
  },

  // ========================================
  // 4. 상관분석 (Correlate) - 4개
  // ========================================
  {
    id: 'pearson-correlation',
    name: 'Pearson 상관분석',
    category: 'correlation',
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
    notes: ['상관행렬 생성', 'p-value는 양측검정'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 상관관계를 분석할 연속형 변수들이 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '변수들',
          description: '상관관계를 분석할 연속형 변수들 (2개 이상)',
          example: '키, 체중, 혈압, 콜레스테롤',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '상관계수의 통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '상관관계가 있는지 검정 (ρ ≠ 0)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '양의 상관관계인지 검정 (ρ > 0)' },
          { value: 'less', label: '단측 검정 (less)', description: '음의 상관관계인지 검정 (ρ < 0)' }
        ],
        default: 'two-sided'
      },
      pairwise: {
        label: '결측값 처리',
        description: '결측값이 있을 때 처리 방법입니다.',
        options: [
          { value: 'pairwise', label: '쌍별 삭제', description: '각 변수 쌍마다 결측값만 제외' },
          { value: 'listwise', label: '목록 삭제', description: '하나라도 결측이면 해당 케이스 전체 제외' }
        ],
        default: 'pairwise'
      }
    },
    sampleData: {
      headers: ['학생ID', '키(cm)', '체중(kg)', '공부시간(시간)', '시험점수'],
      rows: [
        [1, 175, 70, 3.5, 85],
        [2, 162, 55, 5.0, 92],
        [3, 180, 78, 2.0, 68],
        [4, 168, 62, 4.5, 88],
        [5, 172, 68, 3.0, 75],
        [6, 165, 58, 6.0, 95],
        [7, 178, 75, 2.5, 72],
        [8, 170, 65, 4.0, 82],
        [9, 158, 50, 5.5, 90],
        [10, 182, 82, 1.5, 65]
      ],
      description: '학생들의 신체 정보와 학업 성취 간 상관관계 분석'
    }
  },
  {
    id: 'spearman-correlation',
    name: 'Spearman 순위상관',
    category: 'correlation',
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
    notes: ['비선형 관계도 탐지 가능', '이상치에 강건'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 순위상관을 분석할 변수들이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '변수들', description: '순위상관을 분석할 연속형/서열형 변수들 (2개 이상)', example: '만족도, 재구매의향, 추천의향', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      alternative: {
        label: '대립가설',
        description: '검정 방향 선택',
        options: [
          { value: 'two-sided', label: '양측 검정', description: 'ρ ≠ 0' },
          { value: 'greater', label: '단측 (greater)', description: 'ρ > 0' },
          { value: 'less', label: '단측 (less)', description: 'ρ < 0' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['응답자', '서비스만족도', '재구매의향', '추천의향'],
      rows: [
        [1, 4, 5, 4], [2, 3, 3, 2], [3, 5, 5, 5], [4, 2, 2, 3],
        [5, 4, 4, 4], [6, 1, 2, 1], [7, 5, 4, 5], [8, 3, 3, 3]
      ],
      description: '고객 만족도 설문 (1-5점 리커트 척도)'
    }
  },
  {
    id: 'kendall-correlation',
    name: 'Kendall τ 상관',
    category: 'correlation',
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
    notes: ['작은 표본에서 더 정확', '해석이 직관적'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 순위상관을 분석할 변수들이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '변수들', description: '순위상관을 분석할 변수들 (2개 이상)', example: '심사위원A점수, 심사위원B점수', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      variant: {
        label: 'Kendall 변형',
        description: '동순위 처리 방법',
        options: [
          { value: 'b', label: 'Kendall τ-b', description: '동순위 보정 (가장 일반적)' },
          { value: 'c', label: 'Kendall τ-c', description: '직사각형 표 보정' }
        ],
        default: 'b'
      }
    },
    sampleData: {
      headers: ['참가자', '심사위원A', '심사위원B'],
      rows: [
        ['김○○', 1, 2], ['이○○', 2, 1], ['박○○', 3, 4], ['최○○', 4, 3],
        ['정○○', 5, 5], ['강○○', 6, 7], ['조○○', 7, 6], ['윤○○', 8, 8]
      ],
      description: '두 심사위원의 참가자 순위 평가 일치도'
    }
  },
  {
    id: 'partial-correlation',
    name: '편상관분석',
    category: 'correlation',
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
    notes: ['순수한 상관관계 파악', '다중공선성 주의'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 분석할 변수들과 통제 변수들이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '분석 변수', description: '상관관계를 분석할 변수들', example: '운동량, 체중감량', required: true },
        { name: '통제 변수', description: '통제할 변수들', example: '나이, 초기체중', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '편상관 방법',
        description: '편상관계수 계산 방법',
        options: [
          { value: 'pearson', label: 'Pearson 편상관', description: '선형 관계 가정' },
          { value: 'spearman', label: 'Spearman 편상관', description: '순위 기반, 비선형에 강건' }
        ],
        default: 'pearson'
      }
    },
    sampleData: {
      headers: ['ID', '운동시간', '체중감량', '나이', '초기체중'],
      rows: [
        [1, 5, 3.2, 35, 85], [2, 3, 1.5, 42, 78], [3, 7, 4.5, 28, 92],
        [4, 2, 0.8, 55, 75], [5, 6, 3.8, 31, 88], [6, 4, 2.1, 45, 80],
        [7, 8, 5.2, 25, 95], [8, 1, 0.3, 60, 72], [9, 5, 2.9, 38, 82], [10, 4, 2.5, 40, 79]
      ],
      description: '운동과 체중감량 관계 (나이, 초기체중 통제)'
    }
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
    notes: ['R² 해석 주의', '잔차 진단 필수'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 종속 변수(Y)와 독립 변수(X)가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '종속변수 (Y)',
          description: '예측하고자 하는 연속형 변수',
          example: '매출액, 체중, 점수',
          required: true
        },
        {
          name: '독립변수 (X)',
          description: '예측에 사용할 연속형 변수',
          example: '광고비, 키, 공부시간',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '회귀계수의 통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      confidenceLevel: {
        label: '신뢰수준',
        description: '회귀계수와 예측값의 신뢰구간을 계산할 때 사용합니다.',
        default: 0.95,
        range: { min: 0.8, max: 0.99 }
      }
    },
    sampleData: {
      headers: ['월', '광고비(만원)', '매출액(만원)'],
      rows: [
        ['1월', 50, 320],
        ['2월', 60, 380],
        ['3월', 45, 290],
        ['4월', 70, 420],
        ['5월', 55, 350],
        ['6월', 80, 480],
        ['7월', 65, 400],
        ['8월', 75, 450],
        ['9월', 40, 270],
        ['10월', 85, 510]
      ],
      description: '월별 광고비와 매출액의 관계 (광고비로 매출액 예측)'
    }
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
    notes: ['VIF > 10이면 다중공선성 의심', 'n ≥ 50 + 8m (m=독립변수 수)'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 종속 변수(Y)와 여러 독립 변수(X₁, X₂, ...)가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '종속변수 (Y)',
          description: '예측하고자 하는 연속형 변수',
          example: '매출액, 가격, 점수',
          required: true
        },
        {
          name: '독립변수들 (X₁, X₂, ...)',
          description: '예측에 사용할 변수들 (2개 이상)',
          example: '면적, 방 개수, 층수, 역까지 거리',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '회귀계수의 통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      confidenceLevel: {
        label: '신뢰수준',
        description: '회귀계수와 예측값의 신뢰구간을 계산할 때 사용합니다.',
        default: 0.95,
        range: { min: 0.8, max: 0.99 }
      },
      vifThreshold: {
        label: 'VIF 임계값',
        description: '다중공선성 판단 기준입니다. 이 값 이상이면 다중공선성을 의심합니다.',
        default: 10,
        range: { min: 5, max: 20 }
      }
    },
    sampleData: {
      headers: ['ID', '가격(억)', '면적(평)', '방개수', '층수'],
      rows: [
        [1, 8.5, 32, 3, 15],
        [2, 6.2, 24, 2, 8],
        [3, 10.1, 40, 4, 22],
        [4, 7.8, 28, 3, 12],
        [5, 5.5, 20, 2, 5],
        [6, 9.3, 35, 3, 18],
        [7, 11.2, 45, 4, 25],
        [8, 6.8, 26, 2, 10],
        [9, 8.0, 30, 3, 14],
        [10, 7.2, 27, 3, 9]
      ],
      description: '아파트 가격 예측 (면적, 방 개수, 층수로 가격 예측)'
    }
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
    notes: ['Forward, Backward, Both 방법', 'AIC/BIC 기준'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속변수와 다수의 후보 독립변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 연속형 변수', example: '만족도 점수', required: true },
        { name: '후보변수들', description: '선택될 후보 독립변수들 (3개 이상)', example: 'X1, X2, X3, X4...', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '변수 진입/제거 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '선택 방법',
        description: '변수 선택 전략',
        default: 'both',
        options: [
          { value: 'forward', label: '전진 선택', description: '변수를 하나씩 추가' },
          { value: 'backward', label: '후진 제거', description: '전체에서 변수 하나씩 제거' },
          { value: 'both', label: '단계적 선택', description: '추가와 제거를 번갈아 수행' }
        ]
      },
      criterion: {
        label: '선택 기준',
        description: '모델 비교 기준',
        default: 'aic',
        options: [
          { value: 'aic', label: 'AIC', description: '아카이케 정보량 기준' },
          { value: 'bic', label: 'BIC', description: '베이즈 정보량 기준' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '만족도', '서비스품질', '가격', '접근성', '브랜드', '추천의향'],
      rows: [
        [1, 85, 4, 3, 5, 4, 4],
        [2, 72, 3, 4, 3, 3, 3],
        [3, 91, 5, 3, 5, 5, 5],
        [4, 68, 3, 5, 2, 3, 3],
        [5, 78, 4, 4, 4, 4, 4]
      ],
      description: '고객 만족도와 6개 후보 독립변수'
    }
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
    notes: ['Odds Ratio 해석', '최소 10 EPV (Events Per Variable)'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 이진 종속변수(0/1)와 독립변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 이진 변수 (0 또는 1)', example: '구매여부 (1=구매, 0=미구매)', required: true },
        { name: '독립변수들', description: '예측에 사용할 변수들', example: '나이, 소득, 성별', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '계수 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '추정 방법',
        description: '최대우도추정 방법',
        default: 'newton',
        options: [
          { value: 'newton', label: 'Newton-Raphson', description: '기본 최적화' },
          { value: 'lbfgs', label: 'L-BFGS', description: '대규모 데이터용' }
        ]
      },
      regularization: {
        label: '정규화',
        description: '과적합 방지',
        default: 'none',
        options: [
          { value: 'none', label: '없음', description: '정규화 없음' },
          { value: 'l2', label: 'L2 (Ridge)', description: '계수 크기 제한' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '구매여부', '나이', '소득', '방문횟수', '성별'],
      rows: [
        [1, 1, 35, 5500, 8, '남'],
        [2, 0, 28, 3200, 2, '여'],
        [3, 1, 45, 7800, 12, '남'],
        [4, 0, 22, 2500, 1, '여'],
        [5, 1, 38, 6200, 6, '여']
      ],
      description: '고객 구매 여부(이진)와 예측 변수들'
    }
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
    notes: ['Proportional Odds Model', 'Brant Test로 가정 검정'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 서열 종속변수(순서가 있는 범주)와 독립변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 서열 변수', example: '만족도(1=매우불만~5=매우만족)', required: true },
        { name: '독립변수들', description: '예측에 사용할 변수들', example: '서비스, 가격, 접근성', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '계수 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '링크 함수',
        description: '누적 확률 변환 함수',
        default: 'logit',
        options: [
          { value: 'logit', label: 'Logit', description: '가장 일반적 (Proportional Odds)' },
          { value: 'probit', label: 'Probit', description: '정규분포 기반' },
          { value: 'cloglog', label: 'Complementary Log-Log', description: '비대칭 분포' }
        ]
      },
      testParallelLines: {
        label: '비례 오즈 가정 검정',
        description: 'Brant Test 수행 여부',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '비례 오즈 가정 검정 수행' },
          { value: 'no', label: '아니오', description: '가정 검정 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '만족도', '서비스품질', '가격적정성', '재방문의향'],
      rows: [
        [1, 4, 5, 3, 4],
        [2, 2, 2, 2, 2],
        [3, 5, 5, 4, 5],
        [4, 3, 3, 3, 3],
        [5, 4, 4, 3, 4]
      ],
      description: '만족도(1-5점 서열)와 예측 변수들'
    }
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
    notes: ['과분산 시 Negative Binomial 고려'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 카운트 종속변수와 독립변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 카운트 변수 (0 이상 정수)', example: '사고횟수, 방문횟수', required: true },
        { name: '독립변수들', description: '예측에 사용할 변수들', example: '연령, 운전경력, 차종', required: true },
        { name: '노출변수', description: '관찰 기간/노출량 (선택)', example: '관찰개월수', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '계수 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      model: {
        label: '모델 유형',
        description: '분포 가정',
        default: 'poisson',
        options: [
          { value: 'poisson', label: 'Poisson', description: '평균=분산 가정' },
          { value: 'negativeBinomial', label: 'Negative Binomial', description: '과산포 허용' },
          { value: 'zeroinflated', label: 'Zero-Inflated', description: '과잉 영점 처리' }
        ]
      },
      dispersionTest: {
        label: '과산포 검정',
        description: '평균과 분산 비교 검정',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '과산포 검정 수행' },
          { value: 'no', label: '아니오', description: '검정 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '사고횟수', '연령', '운전경력', '연간주행거리', '관찰기간'],
      rows: [
        [1, 2, 28, 5, 15000, 12],
        [2, 0, 45, 20, 8000, 12],
        [3, 1, 35, 10, 20000, 12],
        [4, 3, 22, 2, 25000, 12],
        [5, 0, 55, 30, 5000, 6]
      ],
      description: '운전자별 교통사고 횟수(카운트)와 예측 변수들'
    }
  },
  {
    id: 'binary-logistic',
    name: '이항 로지스틱 회귀',
    category: 'regression',
    description: '이진 종속변수에 대한 로지스틱 회귀분석',
    minSampleSize: 50,
    assumptions: ['선형성(로짓)', '독립성', '다중공선성 없음'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '0 또는 1의 값을 가지는 이진 변수',
        example: '성공/실패, 생존/사망'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측에 사용할 변수들',
        example: '연령, 투여량, 성별'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 이진 종속변수와 독립변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '이진 결과 변수 (0/1)', example: '반응(Yes/No)', required: true },
        { name: '독립변수들', description: '설명 변수들', example: '나이, 수치', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      rocCurve: {
        label: 'ROC 곡선',
        description: 'ROC 곡선 및 AUC 출력 여부',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: 'ROC 곡선 그리기' },
          { value: 'no', label: '아니오', description: '생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '반응여부', '농도', '온도'],
      rows: [
        [1, 1, 0.5, 20], [2, 0, 0.2, 21], [3, 1, 0.6, 19], [4, 1, 0.8, 22], [5, 0, 0.3, 20]
      ],
      description: '농도와 온도에 따른 반응 여부(1/0)'
    }
  },
  {
    id: 'multinomial-logistic',
    name: '다항 로지스틱 회귀',
    category: 'regression',
    description: '3개 이상의 범주를 가진 종속변수 예측',
    minSampleSize: 50,
    assumptions: ['독립성', '다중공선성 없음'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '3개 이상의 범주를 가진 변수',
        example: '선호도(상/중/하), 정당(A/B/C)'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측에 사용할 변수들',
        example: '소득, 연령, 지역'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '종속변수가 3개 이상의 범주를 가집니다.',
      columns: [
        { name: 'ID', description: '식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '다범주 변수', example: '선택(A/B/C)', required: true },
        { name: '독립변수들', description: '설명 변수들', example: '소득, 연령', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '선호브랜드', '연령', '소득'],
      rows: [
        [1, 'BrandA', 25, 3000], [2, 'BrandB', 35, 4500], [3, 'BrandC', 42, 5000], [4, 'BrandA', 22, 2800]
      ],
      description: '연령/소득에 따른 브랜드 선호 예측'
    }
  },
  {
    id: 'probit-regression',
    name: '프로빗 회귀',
    category: 'regression',
    description: '정규누적분포함수를 이용한 이진 회귀',
    minSampleSize: 50,
    assumptions: ['정규성(잠재변수)', '독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '이진 결과 변수 (0/1)',
        example: '구매/미구매'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측 변수들',
        example: '가격, 광고노출'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '이진 종속변수와 예측변수로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '0 또는 1', example: '구매(1)/미구매(0)', required: true },
        { name: '독립변수', description: '예측 변수', example: '가격', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '수락여부', '제시가격'],
      rows: [[1, 1, 500], [2, 0, 200], [3, 1, 450], [4, 0, 100]],
      description: '가격에 따른 제안 수락 여부 (Probit)'
    }
  },
  {
    id: 'negative-binomial-regression',
    name: '음이항 회귀',
    category: 'regression',
    description: '과분산이 있는 카운트 데이터 예측',
    minSampleSize: 50,
    assumptions: ['독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['count'],
        required: true,
        multiple: false,
        description: '카운트 변수 (과분산 존재)',
        example: '병원 방문 횟수, 결석 일수'
      },
      {
        role: 'independent',
        label: '독립 변수',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '예측 변수들',
        example: '건강상태, 나이'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '카운트 데이터(종속)와 설명변수로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '카운트 값 (0, 1, 2...)', example: '횟수', required: true },
        { name: '독립변수', description: '설명 변수', example: '나이, 조건', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '결석일수', '통학거리', '성적'],
      rows: [[1, 5, 10, 70], [2, 0, 2, 90], [3, 12, 15, 60], [4, 2, 5, 85]],
      description: '학생들의 결석 일수 예측 (과분산 고려)'
    }
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
    notes: ['독립표본 t-검정의 비모수 대안', 'Wilcoxon Rank-Sum과 동일'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 검정 변수와 그룹 변수가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '비교하고자 하는 연속형 또는 서열형 변수',
          example: '만족도(1-5), 통증점수, 순위',
          required: true
        },
        {
          name: '그룹',
          description: '두 집단을 구분하는 변수 (정확히 2개 수준)',
          example: '처리군/대조군, 약물A/약물B',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '두 집단의 분포가 다른지 검정' },
          { value: 'greater', label: '단측 검정 (greater)', description: '첫 번째 집단의 값이 더 큰지 검정' },
          { value: 'less', label: '단측 검정 (less)', description: '첫 번째 집단의 값이 더 작은지 검정' }
        ],
        default: 'two-sided'
      },
      exactTest: {
        label: '정확 검정',
        description: '정확한 p-value를 계산할지 선택합니다. 표본이 작을 때 권장됩니다.',
        options: [
          { value: 'auto', label: '자동', description: 'n ≤ 20일 때 정확 검정 사용' },
          { value: 'true', label: '정확 검정', description: '항상 정확 검정 사용' },
          { value: 'false', label: '근사 검정', description: '정규 근사 사용' }
        ],
        default: 'auto'
      }
    },
    sampleData: {
      headers: ['환자ID', '통증점수', '처치군'],
      rows: [
        [1, 7, '신약'],
        [2, 5, '신약'],
        [3, 6, '신약'],
        [4, 4, '신약'],
        [5, 5, '신약'],
        [6, 8, '위약'],
        [7, 9, '위약'],
        [8, 7, '위약'],
        [9, 8, '위약'],
        [10, 9, '위약']
      ],
      description: '신약 투여군과 위약군의 통증 점수 비교'
    }
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
    notes: ['대응표본 t-검정의 비모수 대안', '동점 처리 방법 중요'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 동일한 대상의 전후 측정값을 나타냅니다. 두 시점의 측정값이 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '대상(개체) 식별자 (선택)',
          example: '환자1, 환자2...',
          required: false
        },
        {
          name: '사전측정',
          description: '첫 번째 시점(전) 측정값',
          example: '치료전 통증점수, 교육전 점수',
          required: true
        },
        {
          name: '사후측정',
          description: '두 번째 시점(후) 측정값',
          example: '치료후 통증점수, 교육후 점수',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '전후 중위수가 다른지 검정' },
          { value: 'greater', label: '단측 검정 (greater)', description: '사전이 더 큰지 검정' },
          { value: 'less', label: '단측 검정 (less)', description: '사전이 더 작은지 검정' }
        ],
        default: 'two-sided'
      },
      zeroMethod: {
        label: '영차이 처리',
        description: '전후 차이가 0인 경우 처리 방법입니다.',
        options: [
          { value: 'wilcox', label: 'Wilcox (기본)', description: '영차이를 버리고 순위 조정' },
          { value: 'pratt', label: 'Pratt', description: '영차이도 순위에 포함' },
          { value: 'zsplit', label: 'Zsplit', description: '영차이를 양/음에 반씩 배분' }
        ],
        default: 'wilcox'
      }
    },
    sampleData: {
      headers: ['환자ID', '치료전_통증', '치료후_통증'],
      rows: [
        ['P01', 8, 5],
        ['P02', 7, 4],
        ['P03', 9, 6],
        ['P04', 6, 6],
        ['P05', 8, 3],
        ['P06', 7, 5],
        ['P07', 9, 7],
        ['P08', 5, 4]
      ],
      description: '8명 환자의 치료 전후 통증 점수 비교 (1-10점 척도)'
    }
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
    notes: ['일원분산분석의 비모수 대안', '사후검정: Dunn Test'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 검정 변수와 그룹 변수가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '측정값',
          description: '비교하고자 하는 연속형 또는 서열형 변수',
          example: '만족도, 통증점수, 순위',
          required: true
        },
        {
          name: '그룹',
          description: '3개 이상 수준을 가진 집단 구분 변수',
          example: '치료법A/B/C, 지역1/2/3/4',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      postHoc: {
        label: '사후검정',
        description: 'H-검정이 유의할 때 어떤 집단 쌍이 다른지 확인합니다.',
        options: [
          { value: 'dunn', label: 'Dunn Test', description: '가장 일반적인 비모수 사후검정' },
          { value: 'conover', label: 'Conover Test', description: '검정력이 높은 대안' },
          { value: 'nemenyi', label: 'Nemenyi Test', description: '보수적인 검정' }
        ],
        default: 'dunn'
      },
      pAdjust: {
        label: 'p-value 보정',
        description: '다중 비교에 따른 제1종 오류 보정 방법입니다.',
        options: [
          { value: 'bonferroni', label: 'Bonferroni', description: '가장 보수적, α/k' },
          { value: 'holm', label: 'Holm', description: '순차적 Bonferroni, 덜 보수적' },
          { value: 'fdr', label: 'FDR (Benjamini-Hochberg)', description: 'False Discovery Rate 제어' }
        ],
        default: 'bonferroni'
      }
    },
    sampleData: {
      headers: ['환자ID', '회복점수', '치료법'],
      rows: [
        [1, 72, '약물A'],
        [2, 68, '약물A'],
        [3, 75, '약물A'],
        [4, 85, '약물B'],
        [5, 82, '약물B'],
        [6, 88, '약물B'],
        [7, 65, '약물C'],
        [8, 70, '약물C'],
        [9, 62, '약물C'],
        [10, 78, '약물A'],
        [11, 90, '약물B'],
        [12, 67, '약물C']
      ],
      description: '3가지 치료법(약물A, B, C)별 회복 점수 비교'
    }
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
    notes: ['반복측정 ANOVA의 비모수 대안', '사후검정: Nemenyi Test'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 동일한 대상의 반복 측정값입니다. 3개 이상 조건의 측정값이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '대상(피험자) 식별자', example: 'S1, S2, S3...', required: true },
        { name: '조건1, 조건2, 조건3, ...', description: '각 조건에서의 측정값 (3개 이상)', example: '약물A, 약물B, 약물C', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      postHoc: {
        label: '사후검정',
        description: 'Friedman 검정이 유의할 때 어떤 조건 쌍이 다른지 확인',
        options: [
          { value: 'nemenyi', label: 'Nemenyi Test', description: '가장 일반적인 사후검정' },
          { value: 'conover', label: 'Conover Test', description: '검정력이 높음' },
          { value: 'wilcoxon', label: 'Wilcoxon (Bonferroni 보정)', description: '쌍별 Wilcoxon + 다중비교 보정' }
        ],
        default: 'nemenyi'
      }
    },
    sampleData: {
      headers: ['환자', '약물A', '약물B', '약물C'],
      rows: [
        ['P01', 7, 5, 3], ['P02', 8, 6, 4], ['P03', 6, 4, 5], ['P04', 9, 7, 4],
        ['P05', 7, 5, 2], ['P06', 8, 6, 5], ['P07', 6, 4, 3], ['P08', 9, 8, 5]
      ],
      description: '8명 환자의 3가지 약물 효과 비교 (통증 점수)'
    }
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
    notes: ['차이의 방향만 고려', 'Wilcoxon보다 검정력 낮음'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 동일한 대상의 전후 측정값입니다.',
      columns: [
        { name: 'ID', description: '대상(피험자) 식별자 (선택)', example: 'S1, S2, S3...', required: false },
        { name: '사전', description: '첫 번째 시점 측정값', example: '치료전, 교육전', required: true },
        { name: '사후', description: '두 번째 시점 측정값', example: '치료후, 교육후', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      alternative: {
        label: '대립가설',
        description: '검정 방향 선택',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '전후 차이가 있는지 검정' },
          { value: 'greater', label: '단측 (greater)', description: '사전이 더 큰지 검정' },
          { value: 'less', label: '단측 (less)', description: '사전이 더 작은지 검정' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['환자', '치료전', '치료후'],
      rows: [
        ['P01', 7, 5], ['P02', 6, 4], ['P03', 8, 7], ['P04', 5, 5],
        ['P05', 9, 6], ['P06', 7, 4], ['P07', 6, 5], ['P08', 8, 5]
      ],
      description: '8명 환자의 치료 전후 증상 점수 비교'
    }
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
    notes: ['연속형 변수는 중위수 기준 이진화', 'Wald-Wolfowitz Runs Test'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 시행 결과입니다. 데이터는 시간 순서대로 정렬되어 있어야 합니다.',
      columns: [
        { name: '순서', description: '시행 순서 (선택)', example: '1, 2, 3...', required: false },
        { name: '결과', description: '이진 또는 연속형 결과값', example: '앞/뒤, 합격/불합격, 측정값', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      cutoff: {
        label: '이진화 기준',
        description: '연속형 변수를 이진화할 기준',
        options: [
          { value: 'median', label: '중위수', description: '중위수 기준으로 상/하 분류' },
          { value: 'mean', label: '평균', description: '평균 기준으로 상/하 분류' }
        ],
        default: 'median'
      }
    },
    sampleData: {
      headers: ['시행', '결과'],
      rows: [
        [1, '앞'], [2, '앞'], [3, '뒤'], [4, '앞'], [5, '뒤'], [6, '뒤'], [7, '앞'], [8, '뒤'],
        [9, '앞'], [10, '앞'], [11, '뒤'], [12, '앞'], [13, '뒤'], [14, '뒤'], [15, '앞'], [16, '뒤']
      ],
      description: '동전 던지기 16회 결과의 무작위성 검정'
    }
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
    notes: ['일표본: 정규성 검정', '이표본: 분포 동일성 검정'],

    dataFormat: {
      type: 'wide',
      description: '일표본 검정: 하나의 연속형 변수. 이표본 검정: 연속형 변수 + 그룹 변수.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '측정값', description: '분포를 검정할 연속형 변수', example: '키, 체중, 점수', required: true },
        { name: '그룹', description: '두 그룹 비교 시 (이표본)', example: '제조사A/B', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      testType: {
        label: '검정 유형',
        description: '일표본 또는 이표본 검정',
        options: [
          { value: 'one-sample', label: '일표본', description: '표본이 특정 분포(정규분포)를 따르는지 검정' },
          { value: 'two-sample', label: '이표본', description: '두 표본이 같은 분포를 따르는지 검정' }
        ],
        default: 'one-sample'
      }
    },
    sampleData: {
      headers: ['ID', '반응시간(ms)'],
      rows: [
        [1, 245], [2, 312], [3, 278], [4, 289], [5, 256], [6, 301], [7, 267], [8, 294],
        [9, 283], [10, 270], [11, 298], [12, 262], [13, 285], [14, 275], [15, 291]
      ],
      description: '반응시간 데이터가 정규분포를 따르는지 검정'
    }
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
    notes: ['2x2 교차표 분석', '불일치 셀만 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 동일한 대상의 전후 이진 측정값입니다.',
      columns: [
        { name: 'ID', description: '대상 식별자 (선택)', example: 'P01, P02...', required: false },
        { name: '사전', description: '전 측정값 (이진)', example: '양성/음성, 유/무', required: true },
        { name: '사후', description: '후 측정값 (이진)', example: '양성/음성, 유/무', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      exact: {
        label: '정확 검정',
        description: '표본이 작을 때 정확 검정 사용',
        options: [
          { value: 'auto', label: '자동', description: '불일치 셀 < 25일 때 정확 검정' },
          { value: 'true', label: '정확 검정', description: '이항 분포 기반 정확 p-value' },
          { value: 'false', label: '근사 검정', description: '카이제곱 근사' }
        ],
        default: 'auto'
      }
    },
    sampleData: {
      headers: ['환자', '치료전_증상', '치료후_증상'],
      rows: [
        ['P01', '있음', '없음'], ['P02', '있음', '없음'], ['P03', '없음', '없음'], ['P04', '있음', '있음'],
        ['P05', '있음', '없음'], ['P06', '없음', '있음'], ['P07', '있음', '없음'], ['P08', '있음', '있음'],
        ['P09', '없음', '없음'], ['P10', '있음', '없음'], ['P11', '있음', '없음'], ['P12', '없음', '없음']
      ],
      description: '12명 환자의 치료 전후 증상 유무 변화'
    }
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
    notes: ['Friedman 검정의 이진 데이터 버전', 'Chi-square 분포 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 피험자입니다. 피험자ID와 3개 이상의 이진 조건 변수가 열로 구성됩니다.',
      columns: [
        { name: 'SubjectID', description: '피험자 식별자', example: 'S01, S02...', required: true },
        { name: '조건1', description: '첫 번째 조건 결과 (0/1)', example: 'TreatmentA (0=실패, 1=성공)', required: true },
        { name: '조건2', description: '두 번째 조건 결과 (0/1)', example: 'TreatmentB (0=실패, 1=성공)', required: true },
        { name: '조건3+', description: '추가 조건 결과 (0/1)', example: 'TreatmentC, TreatmentD...', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      postHoc: {
        label: '사후검정',
        description: '유의할 경우 쌍별 비교',
        default: 'dunn',
        options: [
          { value: 'dunn', label: 'Dunn 검정', description: '비모수 다중 비교' },
          { value: 'mcnemar', label: 'McNemar 검정', description: '쌍별 McNemar 비교' }
        ]
      }
    },
    sampleData: {
      headers: ['피험자ID', '치료A', '치료B', '치료C'],
      rows: [
        ['S01', 1, 0, 1],
        ['S02', 0, 0, 0],
        ['S03', 1, 1, 1],
        ['S04', 1, 0, 0],
        ['S05', 0, 1, 1]
      ],
      description: '5명 피험자의 3가지 치료법 성공(1)/실패(0) 결과'
    }
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
    notes: ['Kruskal-Wallis의 중앙값 기반 대안', '이상치에 강건', 'Chi-square 검정 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 그룹 변수와 검정할 연속형 변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '그룹', description: '비교할 그룹을 나타내는 범주형 변수', example: '처리군 (A/B/C)', required: true },
        { name: '측정값', description: '중앙값을 비교할 연속형 변수', example: '회복시간, 농도', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      ties: {
        label: '동점 처리',
        description: '중앙값과 같은 값 처리 방법',
        default: 'below',
        options: [
          { value: 'below', label: '미만으로 처리', description: '중앙값과 같으면 미만 그룹' },
          { value: 'above', label: '초과로 처리', description: '중앙값과 같으면 초과 그룹' },
          { value: 'split', label: '분할', description: '절반씩 분할' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '처리군', '회복시간'],
      rows: [
        [1, 'A', 12],
        [2, 'A', 15],
        [3, 'B', 8],
        [4, 'B', 10],
        [5, 'C', 20],
        [6, 'C', 18]
      ],
      description: '3개 처리군의 회복시간 중앙값 비교'
    }
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
    notes: ['정확한 p-value 계산', '양측/단측 검정 지원', '귀무가설 확률(p₀) 설정 가능'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치(시행)를 나타냅니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '결과',
          description: '성공/실패를 나타내는 값',
          example: '성공, 실패 또는 1, 0 또는 Yes, No',
          required: true
        }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      probability: {
        label: '귀무가설 확률 (p₀)',
        description: '검정하고자 하는 기대 성공 확률입니다. 예를 들어, 동전 던지기에서 앞면이 나올 확률이 50%인지 검정하려면 0.5를 입력합니다.',
        default: 0.5,
        range: { min: 0, max: 1 }
      },
      alternative: {
        label: '대립가설',
        description: '검정 방향을 선택합니다.',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '성공 확률이 p₀와 다른지 검정 (p ≠ p₀)' },
          { value: 'greater', label: '단측 검정 (greater)', description: '성공 확률이 p₀보다 큰지 검정 (p > p₀)' },
          { value: 'less', label: '단측 검정 (less)', description: '성공 확률이 p₀보다 작은지 검정 (p < p₀)' }
        ],
        default: 'two-sided'
      },
      successValue: {
        label: '성공 기준값',
        description: '어떤 값을 "성공"으로 간주할지 선택합니다. 이진 변수의 경우 자동 감지되며, 범주형 변수의 경우 선택이 필요합니다.',
        default: null
      }
    },
    sampleData: {
      headers: ['ID', '검사결과'],
      rows: [
        [1, '합격'],
        [2, '불합격'],
        [3, '합격'],
        [4, '합격'],
        [5, '불합격'],
        [6, '합격'],
        [7, '합격'],
        [8, '불합격'],
        [9, '합격'],
        [10, '합격']
      ],
      description: '10명의 시험 결과 (합격률이 50%인지 검정)'
    }
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
    notes: ['정규분포 가정 불필요', 'Sen\'s slope로 추세 크기 추정', '계절성 보정 가능'],

    dataFormat: {
      type: 'wide',
      description: '시계열 데이터입니다. 시간 순서대로 정렬된 관측값이 필요합니다.',
      columns: [
        { name: '시간', description: '시간 인덱스 (선택)', example: '연도, 월', required: false },
        { name: '시계열값', description: '추세를 검정할 연속형 변수', example: '수온, 강수량', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      alternative: {
        label: '대립가설',
        description: '추세 방향',
        default: 'two-sided',
        options: [
          { value: 'two-sided', label: '양측', description: '추세 존재 여부' },
          { value: 'increasing', label: '증가', description: '증가 추세 검정' },
          { value: 'decreasing', label: '감소', description: '감소 추세 검정' }
        ]
      },
      senSlope: {
        label: "Sen's Slope",
        description: '추세 기울기 추정',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: 'Sen의 기울기 추정' },
          { value: 'no', label: '아니오', description: '기울기 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['연도', '평균수온'],
      rows: [
        [2018, 15.2],
        [2019, 15.5],
        [2020, 15.8],
        [2021, 16.1],
        [2022, 16.3]
      ],
      description: '연도별 평균 수온 데이터 (추세 검정용)'
    }
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
    notes: ['2x2표는 Yates 보정', 'Cramér\'s V로 효과크기'],

    // 가이드 컴포넌트용 확장 필드
    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치를 나타냅니다. 두 범주형 변수가 각각 열로 구성됩니다.',
      columns: [
        {
          name: 'ID',
          description: '관측치 식별자 (선택)',
          example: '1, 2, 3...',
          required: false
        },
        {
          name: '행 변수',
          description: '첫 번째 범주형 변수 (교차표의 행)',
          example: '흡연여부(흡연/비흡연), 성별(남/여)',
          required: true
        },
        {
          name: '열 변수',
          description: '두 번째 범주형 변수 (교차표의 열)',
          example: '질병여부(유/무), 선호도(좋음/싫음)',
          required: true
        }
      ]
    },
    settings: {
      alpha: {
        label: '유의수준 (α)',
        description: '통계적 유의성을 판단하는 기준입니다.',
        default: 0.05,
        range: { min: 0.001, max: 0.1 }
      },
      yatesCorrection: {
        label: 'Yates 연속성 보정',
        description: '2x2 표에서 카이제곱 값이 과대추정되는 것을 보정합니다. 기대빈도가 작을 때 유용합니다.',
        options: [
          { value: 'auto', label: '자동', description: '2x2 표에서만 자동 적용' },
          { value: 'true', label: '항상 적용', description: '모든 경우에 적용' },
          { value: 'false', label: '적용 안 함', description: '보정 없이 계산' }
        ],
        default: 'auto'
      }
    },
    sampleData: {
      headers: ['ID', '흡연여부', '폐질환'],
      rows: [
        [1, '흡연', '있음'],
        [2, '흡연', '있음'],
        [3, '흡연', '없음'],
        [4, '흡연', '있음'],
        [5, '비흡연', '없음'],
        [6, '비흡연', '없음'],
        [7, '비흡연', '없음'],
        [8, '비흡연', '있음'],
        [9, '흡연', '있음'],
        [10, '비흡연', '없음'],
        [11, '흡연', '없음'],
        [12, '비흡연', '없음']
      ],
      description: '흡연 여부와 폐질환 발생의 관계 분석'
    }
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
    notes: ['기대 비율은 별도 입력', '기본값: 균등 분포'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 범주형 변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '범주', description: '검정할 범주형 변수', example: '주사위 눈(1-6), 혈액형(A/B/O/AB)', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      expectedProportions: {
        label: '기대 비율',
        description: '각 범주의 기대 비율. 비워두면 균등 분포 가정',
        default: null
      }
    },
    sampleData: {
      headers: ['시행', '주사위눈'],
      rows: [
        [1, 1], [2, 3], [3, 2], [4, 6], [5, 4], [6, 1], [7, 5], [8, 3], [9, 2], [10, 6],
        [11, 4], [12, 1], [13, 5], [14, 3], [15, 2], [16, 6], [17, 4], [18, 1], [19, 5], [20, 3],
        [21, 2], [22, 6], [23, 4], [24, 1], [25, 5], [26, 3], [27, 2], [28, 6], [29, 4], [30, 5]
      ],
      description: '주사위 30회 던지기 결과가 공정한지 검정'
    }
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
    notes: ['작은 표본에서 정확', '카이제곱 검정의 대안'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 두 이진 변수가 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '행 변수', description: '첫 번째 이진 변수', example: '성별(남/여), 처리(유/무)', required: true },
        { name: '열 변수', description: '두 번째 이진 변수', example: '결과(성공/실패)', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      alternative: {
        label: '대립가설',
        description: '검정 방향',
        options: [
          { value: 'two-sided', label: '양측 검정', description: '연관이 있는지 검정' },
          { value: 'greater', label: '단측 (greater)', description: 'Odds Ratio > 1 검정' },
          { value: 'less', label: '단측 (less)', description: 'Odds Ratio < 1 검정' }
        ],
        default: 'two-sided'
      }
    },
    sampleData: {
      headers: ['ID', '처리', '결과'],
      rows: [
        [1, '신약', '호전'], [2, '신약', '호전'], [3, '신약', '미호전'], [4, '신약', '호전'],
        [5, '위약', '미호전'], [6, '위약', '미호전'], [7, '위약', '호전'], [8, '위약', '미호전'],
        [9, '신약', '호전'], [10, '위약', '미호전']
      ],
      description: '소규모 임상시험: 신약 vs 위약의 효과'
    }
  },

  // ========================================
  // 8. 고급분석 (Advanced) - 4개
  // ========================================
  {
    id: 'factor-analysis',
    name: '요인분석',
    category: 'multivariate',
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
    notes: ['표본크기: 변수당 5-10개', 'Bartlett 구형성 검정', 'Varimax 회전'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 응답자/관측치입니다. 분석할 변수들이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '응답자 식별자 (선택)', example: 'R01, R02...', required: false },
        { name: '변수들', description: '요인을 추출할 변수들 (3개 이상)', example: '문항1, 문항2, ..., 문항20', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: 'Bartlett 검정 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      nFactors: { label: '요인 수', description: '추출할 요인 수 (0=자동 결정)', default: 0, range: { min: 0, max: 20 } },
      rotation: {
        label: '회전 방법',
        description: '요인 회전 방법',
        options: [
          { value: 'varimax', label: 'Varimax', description: '직교 회전, 가장 일반적' },
          { value: 'promax', label: 'Promax', description: '사각 회전, 요인 간 상관 허용' },
          { value: 'oblimin', label: 'Oblimin', description: '사각 회전' },
          { value: 'none', label: '무회전', description: '회전 없이 분석' }
        ],
        default: 'varimax'
      }
    },
    sampleData: {
      headers: ['ID', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6'],
      rows: [
        [1, 4, 5, 3, 4, 5, 4], [2, 3, 4, 2, 3, 4, 3], [3, 5, 5, 4, 5, 5, 5],
        [4, 2, 3, 2, 2, 3, 2], [5, 4, 4, 3, 4, 4, 4], [6, 3, 3, 4, 3, 3, 3]
      ],
      description: '6문항 설문조사 응답 (1-5점 척도)'
    }
  },
  {
    id: 'pca',
    name: '주성분분석',
    category: 'multivariate',
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
    notes: ['누적 설명 분산 70% 이상', 'Scree Plot으로 주성분 수 결정'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 분석할 연속형 변수들이 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '변수들', description: '주성분을 추출할 연속형 변수들 (2개 이상)', example: '키, 체중, 혈압, 콜레스테롤', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      nComponents: { label: '주성분 수', description: '추출할 주성분 수 (0=자동 결정)', default: 0, range: { min: 0, max: 20 } },
      scaling: {
        label: '표준화',
        description: '변수 표준화 방법',
        options: [
          { value: 'standard', label: '표준화 (권장)', description: 'z-score 변환 (평균=0, 분산=1)' },
          { value: 'none', label: '표준화 없음', description: '원 데이터 사용' }
        ],
        default: 'standard'
      }
    },
    sampleData: {
      headers: ['ID', '키', '체중', '가슴둘레', '허리둘레'],
      rows: [
        [1, 175, 70, 95, 80], [2, 168, 62, 88, 72], [3, 180, 78, 100, 85],
        [4, 165, 55, 82, 68], [5, 172, 68, 92, 78], [6, 178, 75, 98, 82]
      ],
      description: '6명의 신체 측정 데이터로 체격 주성분 추출'
    }
  },
  {
    id: 'cluster-analysis',
    name: '군집분석',
    category: 'multivariate',
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
    notes: ['표준화 필수', 'K-means 또는 계층적 군집', 'Elbow Method'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 개체입니다. 군집화 기준이 될 연속형 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '개체 식별자 (선택)', example: '고객1, 고객2...', required: false },
        { name: '변수1', description: '첫 번째 군집화 변수', example: '구매액', required: true },
        { name: '변수2', description: '두 번째 군집화 변수', example: '방문빈도', required: true },
        { name: '변수N', description: '추가 군집화 변수', example: '체류시간', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준', description: '참조용', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '군집 방법',
        description: '군집화 알고리즘',
        default: 'kmeans',
        options: [
          { value: 'kmeans', label: 'K-Means', description: '비계층적 군집 (빠름)' },
          { value: 'hierarchical', label: '계층적', description: '덴드로그램 제공' },
          { value: 'dbscan', label: 'DBSCAN', description: '밀도 기반 (이상치 탐지)' }
        ]
      },
      nClusters: {
        label: '군집 수',
        description: 'K-Means에서 군집 개수',
        default: 'auto',
        options: [
          { value: 'auto', label: '자동 (Elbow)', description: 'Elbow Method로 결정' },
          { value: 'manual', label: '수동', description: '사용자 지정' }
        ]
      },
      standardize: {
        label: '표준화',
        description: '변수 표준화 여부',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: 'Z-score 표준화' },
          { value: 'no', label: '아니오', description: '원본 척도 사용' }
        ]
      }
    },
    sampleData: {
      headers: ['고객ID', '구매액', '방문횟수', '평균체류시간'],
      rows: [
        ['C01', 150000, 12, 45],
        ['C02', 50000, 3, 15],
        ['C03', 280000, 20, 60],
        ['C04', 30000, 2, 10],
        ['C05', 180000, 15, 50]
      ],
      description: '고객 세분화를 위한 RFM 유사 데이터'
    }
  },
  {
    id: 'discriminant-analysis',
    name: '판별분석',
    category: 'multivariate',
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
    notes: ['그룹당 20개 이상 표본', 'Box\'s M Test', 'Leave-one-out CV'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 그룹 변수와 판별 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '그룹', description: '판별할 그룹 변수', example: 'VIP/일반/신규', required: true },
        { name: '판별변수1', description: '첫 번째 판별 변수', example: '나이', required: true },
        { name: '판별변수2', description: '두 번째 판별 변수', example: '소득', required: true },
        { name: '판별변수N', description: '추가 판별 변수', example: '구매횟수', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      method: {
        label: '분석 방법',
        description: '판별함수 도출 방법',
        default: 'linear',
        options: [
          { value: 'linear', label: '선형 판별 (LDA)', description: '공분산 동질 가정' },
          { value: 'quadratic', label: '이차 판별 (QDA)', description: '그룹별 공분산 허용' }
        ]
      },
      validation: {
        label: '교차검증',
        description: '분류 정확도 검증',
        default: 'loocv',
        options: [
          { value: 'none', label: '없음', description: '교차검증 생략' },
          { value: 'loocv', label: 'Leave-One-Out', description: '1개 제외 교차검증' },
          { value: 'kfold', label: 'K-Fold', description: 'K겹 교차검증' }
        ]
      },
      boxM: {
        label: "Box's M 검정",
        description: '공분산 동질성 검정',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: '공분산 동질성 검정' },
          { value: 'no', label: '아니오', description: '검정 생략' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '고객등급', '나이', '연소득', '구매횟수'],
      rows: [
        [1, 'VIP', 45, 8500, 25],
        [2, '일반', 32, 4200, 8],
        [3, 'VIP', 52, 9200, 30],
        [4, '신규', 28, 3500, 2],
        [5, '일반', 38, 5100, 12]
      ],
      description: '고객 등급 판별을 위한 데이터'
    }
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
    notes: ['Log-rank 검정으로 그룹 비교', '중앙 생존시간 추정', 'scipy 기반 직접 구현 (lifelines 미사용)'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 한 대상의 생존 데이터입니다. 시간, 사건, (선택적) 그룹이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '대상 식별자 (선택)', example: 'P01, P02...', required: false },
        { name: '시간', description: '생존/관찰 시간 (양수)', example: '생존일수, 관찰기간(월)', required: true },
        { name: '사건', description: '사건 발생 여부', example: '1=사망, 0=중도절단', required: true },
        { name: '그룹', description: '그룹 비교 시 (선택)', example: '처리군/대조군', required: false }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: 'Log-rank 검정 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      confidenceLevel: { label: '신뢰수준', description: '생존곡선 신뢰구간', default: 0.95, range: { min: 0.8, max: 0.99 } }
    },
    sampleData: {
      headers: ['환자', '생존기간(월)', '사건', '치료법'],
      rows: [
        ['P01', 12, 1, '신약'], ['P02', 18, 0, '신약'], ['P03', 8, 1, '신약'], ['P04', 24, 0, '신약'],
        ['P05', 6, 1, '표준'], ['P06', 10, 1, '표준'], ['P07', 14, 0, '표준'], ['P08', 9, 1, '표준']
      ],
      description: '8명 환자의 생존 데이터 (신약 vs 표준치료)'
    }
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
    notes: ['Hazard Ratio 해석', 'Schoenfeld 잔차로 가정 검정', 'lifelines 라이브러리 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 한 대상의 생존 데이터와 공변량입니다.',
      columns: [
        { name: 'ID', description: '대상 식별자 (선택)', example: 'P01, P02...', required: false },
        { name: '시간', description: '생존/관찰 시간 (양수)', example: '생존일수', required: true },
        { name: '사건', description: '사건 발생 여부', example: '1=발생, 0=중도절단', required: true },
        { name: '공변량', description: '위험비를 추정할 변수들', example: '연령, 성별, 병기', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      confidenceLevel: { label: '신뢰수준', description: 'HR 신뢰구간', default: 0.95, range: { min: 0.8, max: 0.99 } }
    },
    sampleData: {
      headers: ['환자', '생존기간(월)', '사건', '연령', '병기'],
      rows: [
        ['P01', 24, 1, 55, 'I'], ['P02', 36, 0, 62, 'II'], ['P03', 12, 1, 70, 'III'],
        ['P04', 48, 0, 45, 'I'], ['P05', 18, 1, 58, 'II'], ['P06', 30, 1, 65, 'III']
      ],
      description: '암 환자 생존 분석 (연령, 병기가 생존에 미치는 영향)'
    }
  },
  {
    id: 'roc-curve',
    name: 'ROC 곡선 분석',
    category: 'survival',
    description: '진단 정확도 평가 (AUC, 민감도/특이도)',
    minSampleSize: 20,
    assumptions: ['이진 결과 변수 (0/1)', '연속형 예측 점수'],
    variables: [
      {
        role: 'dependent',
        label: '실제 결과 변수',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '실제 이진 결과 (1=양성, 0=음성)',
        example: '질환유무 (1=있음, 0=없음)'
      },
      {
        role: 'independent',
        label: '예측 점수 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측 확률 또는 연속형 진단 점수 (0~1 또는 임의 범위)',
        example: '바이오마커 수치, 예측 확률'
      }
    ],
    notes: ['AUC 0.5=무작위, 1.0=완벽 분류', 'Youden\'s J 기준 최적 임계값 제시', 'Hanley-McNeil 방법으로 AUC 95% CI 계산'],
    dataFormat: {
      type: 'wide',
      description: '각 행이 한 관찰 대상의 실제 결과와 예측 점수입니다.',
      columns: [
        { name: '결과', description: '실제 이진 결과', example: '1=양성, 0=음성', required: true },
        { name: '점수', description: '예측 확률 또는 진단 점수', example: '0.87, 0.34, ...', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: 'AUC CI 계산 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['환자', '질환', '바이오마커'],
      rows: [
        ['P01', 1, 0.82], ['P02', 0, 0.21], ['P03', 1, 0.75], ['P04', 0, 0.33],
        ['P05', 1, 0.91], ['P06', 0, 0.15], ['P07', 1, 0.68], ['P08', 0, 0.44],
        ['P09', 1, 0.79], ['P10', 0, 0.28]
      ],
      description: '10명 환자의 ROC 분석 데이터 (질환 유무 + 바이오마커 수치)'
    }
  },
  {
    id: 'power-analysis',
    name: '사전 검정력 분석',
    category: 'design',
    description: '연구 설계 전 필요한 표본 크기 추정',
    minSampleSize: 2,
    assumptions: [],
    variables: [],
    notes: ['효과 크기, 유의수준, 검정력 기반'],
    dataFormat: {
      type: 'wide',
      description: '분석에 필요한 파라미터들을 설정합니다.',
      columns: [
        { name: '파라미터', description: '검정력 분석에 필요한 파라미터', example: '유의수준, 검정력', required: true },
        { name: '값', description: '파라미터 값', example: '0.05, 0.8', required: true }
      ]
    },
    settings: {
      power: { label: '목표 검정력 (1-β)', description: '2종 오류 회피 확률', default: 0.8, range: { min: 0.5, max: 0.99 } },
      effectSize: { label: '효과 크기 (d)', description: '감지하고자 하는 최소 차이', default: 0.5, range: { min: 0.1, max: 2.0 } }
    },
    sampleData: {
      headers: ['파라미터', '값'],
      rows: [['유의수준', 0.05], ['검정력', 0.8], ['효과크기', 0.5]],
      description: '사전 검정력 분석을 위한 파라미터 설정'
    }
  },

  // ========================================
  // 6. 회귀분석 (Regression) - 확장 (Worker 4)
  // ========================================
  {
    id: 'linear-regression',
    name: '단순 선형 회귀',
    category: 'regression',
    description: '하나의 독립변수와 종속변수 간의 선형 관계',
    minSampleSize: 3,
    assumptions: ['선형성', '독립성', '등분산성', '정규성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측하고자 하는 변수',
        example: '매출액'
      },
      {
        role: 'independent',
        label: '독립 변수 (X)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '설명 변수',
        example: '광고비'
      }
    ],
    notes: ['잔차 분석 포함'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속변수와 독립변수가 각각 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 연속형 변수', example: '매출액', required: true },
        { name: '독립변수', description: '설명할 연속형 변수', example: '광고비', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '매출액', '광고비'],
      rows: [
        [1, 500, 20],
        [2, 600, 25],
        [3, 550, 22],
        [4, 700, 30],
        [5, 450, 18]
      ],
      description: '광고비에 따른 매출액 예측'
    }
  },
  {
    id: 'multiple-regression',
    name: '다중 회귀분석',
    category: 'regression',
    description: '여러 독립변수와 종속변수 간의 선형 관계',
    minSampleSize: 10,
    assumptions: ['선형성', '다중공선성 없음', '독립성', '등분산성', '정규성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측하고자 하는 변수',
        example: '집값'
      },
      {
        role: 'independent',
        label: '독립 변수 (X)',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '설명 변수들',
        example: '면적, 방개수, 연식'
      }
    ],
    notes: ['VIF 확인 필요'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 종속변수와 여러 독립변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측할 연속형 변수', example: '집값', required: true },
        { name: '독립변수1', description: '첫 번째 설명 변수', example: '면적', required: true },
        { name: '독립변수N', description: '추가 설명 변수들', example: '방개수, 연식', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '집값', '면적', '방개수', '연식'],
      rows: [
        [1, 50000, 84, 3, 5],
        [2, 45000, 75, 3, 10],
        [3, 60000, 102, 4, 3],
        [4, 35000, 59, 2, 15],
        [5, 55000, 84, 3, 2]
      ],
      description: '면적, 방개수, 연식에 따른 집값 예측'
    }
  },
  {
    id: 'logistic-regression',
    name: '로지스틱 회귀',
    category: 'regression',
    description: '이진 종속변수에 대한 회귀분석',
    minSampleSize: 20,
    assumptions: ['독립성', '비례승산', '선형성(Logit)'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['binary'],
        required: true,
        multiple: false,
        description: '이진 결과 변수 (0/1)',
        example: '구매여부(1=구매, 0=미구매)'
      },
      {
        role: 'independent',
        label: '독립 변수 (X)',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 1,
        description: '설명 변수들',
        example: '나이, 소득, 성별'
      }
    ],
    notes: ['오즈비(Odds Ratio) 해석'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 이진 종속변수와 설명 변수들이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '결과변수', description: '이진 종속 변수 (0/1)', example: '구매여부, 재발여부', required: true },
        { name: '설명변수', description: '결과를 예측할 변수들', example: '나이, 소득', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } }
    },
    sampleData: {
      headers: ['ID', '구매여부', '나이', '소득'],
      rows: [
        [1, 1, 35, 5000],
        [2, 0, 28, 3000],
        [3, 1, 45, 7000],
        [4, 0, 32, 3500],
        [5, 1, 50, 8000]
      ],
      description: '나이와 소득에 따른 구매여부 예측'
    }
  },
  {
    id: 'pca-analysis',
    name: '주성분 분석 (PCA)',
    category: 'multivariate',
    description: '차원 축소를 통한 데이터 구조 파악',
    minSampleSize: 20,
    assumptions: ['선형성', '큰 분산', '상관관계'],
    variables: [
      {
        role: 'dependent',
        label: '분석 변수',
        types: ['continuous'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '차원을 축소할 연속형 변수들',
        example: '키, 몸무게, 흉전, 흉위'
      }
    ],
    notes: ['스크리 도표, 설명된 분산 비율 제공'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다. 분석할 여러 연속형 변수가 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...', required: false },
        { name: '분석변수', description: '차원을 축소할 연속형 변수들', example: 'Var1, Var2...', required: true }
      ]
    },
    settings: {
      nComponents: {
        label: '주성분 개수',
        description: '추출할 성분 수 (0 = 자동)',
        default: 0,
        range: { min: 0, max: 10 }
      }
    },
    sampleData: {
      headers: ['ID', '키', '몸무게', '흉위', '좌고'],
      rows: [
        [1, 175, 70, 95, 90],
        [2, 180, 75, 100, 92],
        [3, 168, 62, 88, 85],
        [4, 182, 80, 105, 94],
        [5, 172, 68, 92, 88]
      ],
      description: '신체 계측 데이터의 차원 축소'
    }
  },
  {
    id: 'stepwise-regression',
    name: '단계적 회귀분석',
    category: 'regression',
    description: '변수 선택법을 이용한 회귀 모형 구축',
    minSampleSize: 20,
    assumptions: ['선형성', '독립성', '등분산성', '정규성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '예측하고자 하는 변수',
        example: '매출액'
      },
      {
        role: 'independent',
        label: '후보 변수들 (X)',
        types: ['continuous', 'categorical'],
        required: true,
        multiple: true,
        minCount: 2,
        description: '선택 대상 독립 변수들',
        example: '광고비, 가격, 매장크기, 인구수'
      }
    ],
    notes: ['전진 선택, 후진 제거 지원'],
    dataFormat: {
      type: 'wide',
      description: '각 행이 관측치입니다. 종속변수와 여러 후보 독립변수가 필요합니다.',
      columns: [
        { name: 'ID', description: '식별자', example: '1, 2, 3...', required: false },
        { name: '종속변수', description: '예측 대상 변수', example: '매출액', required: true },
        { name: '후보변수들', description: '선택될 가능성이 있는 변수들', example: '광고비, 가격', required: true }
      ]
    },
    settings: {
      method: {
        label: '선택 방법',
        description: '변수 선택 알고리즘',
        default: 'forward',
        options: [
          { value: 'forward', label: '전진 선택법', description: '변수를 하나씩 추가' },
          { value: 'backward', label: '후진 제거법', description: '변수를 하나씩 제거' }
        ]
      },
      threshold: { label: '진입/제거 기준 (p)', description: '변수 선택 유의수준', default: 0.05, range: { min: 0.001, max: 0.2 } }
    },
    sampleData: {
      headers: ['ID', '매출', '광고TV', '광고SNS', '가격', '매장수'],
      rows: [
        [1, 100, 10, 5, 20, 2],
        [2, 120, 12, 6, 19, 2],
        [3, 110, 11, 4, 21, 3],
        [4, 130, 15, 8, 18, 3],
        [5, 95, 9, 3, 22, 1]
      ],
      description: '매출에 영향을 미치는 주요 요인 선별'
    }
  },
  {
    id: 'curve-estimation',
    name: '곡선 추정',
    category: 'regression',
    description: '다양한 곡선 모형 적합 (선형, 2차, 지수 등)',
    minSampleSize: 5,
    assumptions: ['독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '반응 변수',
        example: '성장률'
      },
      {
        role: 'independent',
        label: '독립 변수 (X)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '설명 변수',
        example: '시간'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: 'X와 Y 변수가 필요합니다.',
      columns: [
        { name: 'X', description: '독립변수', example: '시간', required: true },
        { name: 'Y', description: '종속변수', example: '박테리아수', required: true }
      ]
    },
    settings: {
      modelType: {
        label: '모형 유형',
        description: '적합할 곡선 모형',
        default: 'linear',
        options: [
          { value: 'linear', label: '선형 (Linear)', description: 'y = a + bx' },
          { value: 'quadratic', label: '2차 (Quadratic)', description: 'y = a + bx + cx²' },
          { value: 'cubic', label: '3차 (Cubic)', description: 'y = a + bx + cx² + dx³' },
          { value: 'exponential', label: '지수 (Exponential)', description: 'y = a * exp(bx)' },
          { value: 'logarithmic', label: '로그 (Logarithmic)', description: 'y = a + b * ln(x)' },
          { value: 'power', label: '거듭제곱 (Power)', description: 'y = a * x^b' }
        ]
      }
    },
    sampleData: {
      headers: ['시간', '박테리아수'],
      rows: [
        [0, 100], [1, 150], [2, 225], [3, 338], [4, 506]
      ],
      description: '시간에 따른 박테리아 증가 (지수 모형)'
    }
  },
  {
    id: 'nonlinear-regression',
    name: '비선형 회귀',
    category: 'regression',
    description: '사용자 정의 비선형 모형 적합',
    minSampleSize: 5,
    assumptions: ['독립성'],
    variables: [
      {
        role: 'dependent',
        label: '종속 변수 (Y)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '반응 변수',
        example: '반응속도'
      },
      {
        role: 'independent',
        label: '독립 변수 (X)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '설명 변수',
        example: '농도'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '관측치별 X, Y 데이터입니다.',
      columns: [
        { name: 'X', description: '독립변수', example: '농도', required: true },
        { name: 'Y', description: '종속변수', example: '반응속도', required: true }
      ]
    },
    settings: {
      modelType: {
        label: '모형',
        description: '적합할 비선형 모형',
        default: 'exponential',
        options: [
          { value: 'exponential', label: '지수 성장/감소', description: 'y = a * exp(bx)' },
          { value: 'logistic', label: '로지스틱 성장', description: 'y = L / (1 + exp(-k(x-x0)))' },
          { value: 'gompertz', label: 'Gompertz', description: 'y = a * exp(-b * exp(-cx))' },
          { value: 'hyperbolic', label: 'Hyperbolic (Michaelis-Menten)', description: 'y = ax / (b + x)' }
        ]
      }
    },
    sampleData: {
      headers: ['농도', '반응속도'],
      rows: [
        [0.1, 0.5], [0.2, 0.8], [0.5, 1.5], [1.0, 2.2], [2.0, 2.8], [5.0, 3.1]
      ],
      description: '기질 농도에 따른 효소 반응 속도 (Michaelis-Menten)'
    }
  },
  {
    id: 'durbin-watson-test',
    name: 'Durbin-Watson 검정',
    category: 'regression',
    description: '잔차의 자기상관성 검정',
    minSampleSize: 10,
    assumptions: ['회귀분석 잔차 사용'],
    variables: [
      {
        role: 'dependent',
        label: '잔차 (Residuals)',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '회귀분석 잔차 또는 시계열 데이터',
        example: '잔차값'
      }
    ],
    dataFormat: {
      type: 'wide',
      description: '시계열 순서대로 정렬된 잔차 데이터가 필요합니다.',
      columns: [
        { name: '순서', description: '시간 순서', example: '1, 2, 3...', required: false },
        { name: '잔차', description: '회귀분석 잔차', example: '0.5, -0.2...', required: true }
      ]
    },
    settings: {}, // 설정 없음
    sampleData: {
      headers: ['순서', '잔차'],
      rows: [[1, 0.5], [2, 0.4], [3, -0.2], [4, -0.5], [5, 0.1]],
      description: '회귀 잔차의 자기상관성 확인'
    }
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
    notes: ['Auto ARIMA로 최적 (p,d,q) 탐색', 'AIC/BIC 기준', 'statsmodels 라이브러리 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 시점입니다. 시계열 값과 (선택적) 시간 인덱스가 열로 구성됩니다.',
      columns: [
        { name: '시간', description: '시간 인덱스 (선택, 없으면 순서 사용)', example: '2024-01, 2024-02...', required: false },
        { name: '값', description: '예측할 시계열 데이터', example: '매출액, 수온, 주가', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      autoArima: {
        label: '자동 ARIMA',
        description: '최적 (p,d,q) 자동 탐색',
        options: [
          { value: 'true', label: 'Auto ARIMA', description: 'AIC 기준 최적 모델 자동 선택' },
          { value: 'false', label: '수동 설정', description: 'p, d, q 직접 지정' }
        ],
        default: 'true'
      },
      forecastPeriods: { label: '예측 기간', description: '미래 예측 기간 수', default: 12, range: { min: 1, max: 52 } }
    },
    sampleData: {
      headers: ['월', '매출(억)'],
      rows: [
        ['2024-01', 12.5], ['2024-02', 11.8], ['2024-03', 13.2], ['2024-04', 14.1],
        ['2024-05', 13.8], ['2024-06', 15.2], ['2024-07', 14.5], ['2024-08', 16.1],
        ['2024-09', 15.3], ['2024-10', 16.8], ['2024-11', 17.2], ['2024-12', 18.5]
      ],
      description: '월별 매출 시계열 데이터로 미래 예측'
    }
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
    notes: ['가법/승법 모델 선택', '계절 주기 지정 필요', 'statsmodels 라이브러리 사용'],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 시점입니다. 최소 2개 주기(예: 24개월) 이상의 데이터 필요.',
      columns: [
        { name: '시간', description: '시간 인덱스 (선택)', example: '2023-01, 2023-02...', required: false },
        { name: '값', description: '분해할 시계열 데이터', example: '판매량, 방문자수', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      model: {
        label: '분해 모델',
        description: '계절 분해 방법',
        options: [
          { value: 'additive', label: '가법 모델', description: 'Y = 추세 + 계절 + 잔차 (계절 변동 일정)' },
          { value: 'multiplicative', label: '승법 모델', description: 'Y = 추세 × 계절 × 잔차 (계절 변동 비율적)' }
        ],
        default: 'additive'
      },
      period: { label: '계절 주기', description: '계절 주기 (월별=12, 분기별=4)', default: 12, range: { min: 2, max: 52 } }
    },
    sampleData: {
      headers: ['월', '판매량'],
      rows: [
        ['2023-01', 100], ['2023-02', 95], ['2023-03', 110], ['2023-04', 120],
        ['2023-05', 130], ['2023-06', 140], ['2023-07', 150], ['2023-08', 145],
        ['2023-09', 130], ['2023-10', 120], ['2023-11', 115], ['2023-12', 125],
        ['2024-01', 105], ['2024-02', 100], ['2024-03', 115], ['2024-04', 128],
        ['2024-05', 138], ['2024-06', 148], ['2024-07', 158], ['2024-08', 152],
        ['2024-09', 138], ['2024-10', 128], ['2024-11', 122], ['2024-12', 132]
      ],
      description: '2년간 월별 판매량의 계절성 분해'
    }
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
    notes: ['ADF: 단위근 귀무가설', 'KPSS: 정상성 귀무가설', '두 검정 결합 권장'],

    dataFormat: {
      type: 'wide',
      description: '시계열 데이터입니다. 시간 인덱스와 시계열 값이 열로 구성됩니다.',
      columns: [
        { name: '시간', description: '시간 인덱스 (선택)', example: '날짜, 월, 분기', required: false },
        { name: '시계열값', description: '정상성을 검정할 연속형 변수', example: '주가, 환율, GDP', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      testMethod: {
        label: '검정 방법',
        description: '정상성 검정 유형',
        default: 'both',
        options: [
          { value: 'adf', label: 'ADF', description: 'Augmented Dickey-Fuller (단위근)' },
          { value: 'kpss', label: 'KPSS', description: '정상성 귀무가설' },
          { value: 'both', label: '둘 다', description: 'ADF + KPSS 결합 권장' }
        ]
      },
      maxLag: {
        label: '최대 시차',
        description: 'ADF 검정의 시차 선택',
        default: 'auto',
        options: [
          { value: 'auto', label: '자동 (AIC)', description: 'AIC 기준 자동 선택' },
          { value: 'manual', label: '수동', description: '사용자 지정' }
        ]
      }
    },
    sampleData: {
      headers: ['날짜', '주가'],
      rows: [
        ['2024-01', 1250],
        ['2024-02', 1280],
        ['2024-03', 1265],
        ['2024-04', 1310],
        ['2024-05', 1295]
      ],
      description: '월별 주가 시계열 (정상성 검정용)'
    }
  },

  // ========================================
  // 11. 진단 검정 (Diagnostic Tests) - 1개
  // ========================================
  {
    id: 'normality-test',
    name: '정규성 검정',
    category: 'descriptive',
    description: '데이터가 정규분포를 따르는지 종합 검정 (Shapiro-Wilk, Anderson-Darling 등)',
    minSampleSize: 3,
    assumptions: [],
    variables: [
      {
        role: 'dependent',
        label: '검정 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '정규성을 검정할 연속형 변수',
        example: '체중, 키, 점수'
      }
    ],
    notes: [
      'Shapiro-Wilk: n < 5000에서 가장 강력',
      'Anderson-Darling: 꼬리 부분에 민감',
      "D'Agostino K²: 왜도와 첨도 동시 검정",
      'Jarque-Bera: 대표본에서 사용',
      'Lilliefors: 평균과 분산 추정 시 사용'
    ],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 관측치입니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '측정값', description: '정규성을 검정할 연속형 변수', example: '체중, 키, 점수', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '통계적 유의성 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      testMethod: {
        label: '검정 방법',
        description: '사용할 정규성 검정 방법',
        options: [
          { value: 'shapiro', label: 'Shapiro-Wilk', description: 'n < 5000에서 권장, 가장 검정력 높음' },
          { value: 'anderson', label: 'Anderson-Darling', description: '꼬리 부분 민감' },
          { value: 'dagostino', label: "D'Agostino K²", description: '왜도+첨도 동시 검정' },
          { value: 'all', label: '모든 검정', description: '여러 검정 결과 종합' }
        ],
        default: 'all'
      }
    },
    sampleData: {
      headers: ['ID', '체중(kg)'],
      rows: [
        [1, 68.5], [2, 72.3], [3, 65.1], [4, 70.8], [5, 74.2], [6, 67.9], [7, 71.5], [8, 69.3],
        [9, 73.1], [10, 66.7], [11, 70.2], [12, 68.8], [13, 72.6], [14, 69.9], [15, 71.1]
      ],
      description: '15명의 체중 데이터가 정규분포를 따르는지 검정'
    }
  },

  // ========================================
  // 12. 용량-반응 분석 (Dose-Response) - 1개
  // ========================================
  {
    id: 'dose-response',
    name: '용량-반응 분석',
    category: 'regression',
    description: '용량과 반응 간의 비선형 관계 모델링 (EC50, IC50 추정)',
    minSampleSize: 6,
    assumptions: ['독립 관측', '측정 오차 일정'],
    variables: [
      {
        role: 'independent',
        label: '용량 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '약물/처리 농도 또는 용량',
        example: '농도(μM), 투여량(mg/kg)'
      },
      {
        role: 'dependent',
        label: '반응 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '측정된 반응 또는 효과',
        example: '억제율(%), 활성도, 생존율'
      }
    ],
    notes: [
      '4-매개변수 로지스틱(4PL)이 표준',
      'EC50: 50% 효과 농도',
      'IC50: 50% 억제 농도',
      'Hill 기울기: 곡선의 가파른 정도'
    ],

    dataFormat: {
      type: 'wide',
      description: '각 행이 하나의 용량-반응 관측치입니다. 용량(농도)과 반응값이 열로 구성됩니다.',
      columns: [
        { name: 'ID', description: '관측치 식별자 (선택)', example: '1, 2, 3...', required: false },
        { name: '용량', description: '약물/처리 농도 또는 용량', example: '농도(μM)', required: true },
        { name: '반응', description: '측정된 반응 또는 효과', example: '억제율(%)', required: true }
      ]
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '신뢰구간 기준', default: 0.05, range: { min: 0.001, max: 0.1 } },
      model: {
        label: '모델 유형',
        description: '비선형 모델 선택',
        default: '4pl',
        options: [
          { value: '4pl', label: '4-Parameter Logistic', description: '가장 일반적' },
          { value: '3pl', label: '3-Parameter Logistic', description: '하한/상한 고정' },
          { value: 'hill', label: 'Hill Equation', description: '효소 동역학' }
        ]
      },
      logScale: {
        label: '로그 변환',
        description: '용량 축 로그 변환',
        default: 'yes',
        options: [
          { value: 'yes', label: '예', description: 'log10 변환' },
          { value: 'no', label: '아니오', description: '원척도 사용' }
        ]
      }
    },
    sampleData: {
      headers: ['ID', '농도_uM', '억제율_percent'],
      rows: [
        [1, 0.001, 5],
        [2, 0.01, 15],
        [3, 0.1, 45],
        [4, 1.0, 78],
        [5, 10.0, 95]
      ],
      description: '약물 농도별 세포 증식 억제율 (IC50 추정용)'
    }
  },

  // ========================================
  // 13. 검정력 분석 (Power Analysis) - 1개
  // ========================================
  {
    id: 'power-analysis',
    name: '검정력 분석',
    category: 'design',
    description: '통계 검정의 검정력 계산 및 필요 표본크기 추정',
    minSampleSize: 0,  // 데이터 없이도 가능
    assumptions: [],
    variables: [],  // 데이터 기반이 아닌 파라미터 기반
    notes: [
      '사전 검정력 분석: 필요 표본크기 결정',
      '사후 검정력 분석: 실제 검정력 계산',
      '효과크기: Cohen의 d, f, r 등 사용',
      '일반적으로 80% 이상 검정력 권장'
    ],

    dataFormat: {
      type: 'wide',
      description: '데이터 입력이 필요 없습니다. 파라미터만 입력합니다.',
      columns: []
    },
    settings: {
      alpha: { label: '유의수준 (α)', description: '1종 오류 확률', default: 0.05, range: { min: 0.001, max: 0.1 } },
      power: { label: '목표 검정력 (1-β)', description: '2종 오류 회피 확률', default: 0.8, range: { min: 0.5, max: 0.99 } },
      analysisType: {
        label: '분석 유형',
        description: '검정력 분석 목적',
        default: 'sampleSize',
        options: [
          { value: 'sampleSize', label: '필요 표본크기', description: '표본크기 계산' },
          { value: 'power', label: '검정력 계산', description: '달성 가능 검정력' },
          { value: 'effectSize', label: '효과크기 계산', description: '탐지 가능 효과크기' }
        ]
      },
      testType: {
        label: '검정 유형',
        description: '분석에 적용할 통계 검정',
        default: 't-test',
        options: [
          { value: 't-test', label: 't-검정', description: '두 집단 평균 비교' },
          { value: 'anova', label: 'ANOVA', description: '3개 이상 집단 비교' },
          { value: 'correlation', label: '상관분석', description: '상관계수 검정' },
          { value: 'chi-square', label: '카이제곱', description: '빈도 검정' }
        ]
      }
    },
    sampleData: {
      headers: ['파라미터', '값'],
      rows: [
        ['효과크기 (d)', 0.5],
        ['유의수준 (α)', 0.05],
        ['목표 검정력', 0.8],
        ['검정 유형', 't-test (양측)']
      ],
      description: '검정력 분석 파라미터 예시 (데이터 불필요)'
    }
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