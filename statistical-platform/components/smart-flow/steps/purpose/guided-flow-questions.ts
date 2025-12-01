/**
 * Guided Flow 질문 데이터
 * 각 분석 목적별로 사용자에게 물어볼 조건 질문 정의
 */

import type { GuidedQuestion, AnalysisPurpose } from '@/types/smart-flow'

// ============================================
// 1. 그룹 간 차이 비교 (compare)
// ============================================
export const COMPARE_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'group_count',
    question: '비교할 그룹이 몇 개인가요?',
    options: [
      { value: '2', label: '2개 그룹', hint: '예: 처리군 vs 대조군' },
      { value: '3+', label: '3개 이상', hint: '예: A, B, C 양식장 비교' }
    ]
  },
  {
    id: 'sample_type',
    question: '표본은 어떤 유형인가요?',
    options: [
      { value: 'independent', label: '독립 표본', hint: '서로 다른 대상을 측정' },
      { value: 'paired', label: '대응 표본', hint: '같은 대상을 전/후 측정' }
    ]
  },
  {
    id: 'normality',
    question: '데이터가 정규분포를 따르나요?',
    options: [
      { value: 'yes', label: '예 (또는 n>=30)', hint: '모수 검정 가능' },
      { value: 'no', label: '아니오', hint: '비모수 검정 권장' },
      { value: 'check', label: '확인 필요', hint: 'AI가 데이터 검사' }
    ],
    autoAnswer: true
  },
  {
    id: 'homogeneity',
    question: '그룹 간 분산이 동일한가요?',
    options: [
      { value: 'yes', label: '예 (등분산)', hint: 'Student t-test / 일반 ANOVA' },
      { value: 'no', label: '아니오 (이분산)', hint: 'Welch t-test / Welch ANOVA 권장' },
      { value: 'check', label: '확인 필요', hint: 'AI가 Levene 검정 결과 확인' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 2. 변수 간 관계 분석 (relationship)
// ============================================
export const RELATIONSHIP_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'relationship_type',
    question: '어떤 관계를 알고 싶으신가요?',
    options: [
      { value: 'correlation', label: '상관관계', hint: '두 변수가 함께 변하는지' },
      { value: 'prediction', label: '예측/인과', hint: 'X로 Y를 예측' }
    ]
  },
  {
    id: 'variable_count',
    question: '분석할 변수가 몇 개인가요?',
    options: [
      { value: '2', label: '2개', hint: '단순 상관/회귀' },
      { value: '3+', label: '3개 이상', hint: '다중 회귀/편상관' }
    ]
  },
  {
    id: 'variable_type',
    question: '변수 유형은 무엇인가요?',
    options: [
      { value: 'numeric', label: '모두 수치형', hint: 'Pearson/회귀' },
      { value: 'mixed', label: '범주형 포함', hint: '로지스틱/카이제곱' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 3. 분포와 빈도 분석 (distribution)
// ============================================
export const DISTRIBUTION_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'analysis_type',
    question: '어떤 분석을 원하시나요?',
    options: [
      { value: 'describe', label: '기술통계', hint: '평균, 표준편차, 분위수' },
      { value: 'normality', label: '정규성 검정', hint: '데이터 분포 확인' },
      { value: 'frequency', label: '빈도 분석', hint: '범주별 빈도/비율' }
    ]
  },
  {
    id: 'variable_type',
    question: '분석할 변수 유형은?',
    options: [
      { value: 'numeric', label: '수치형', hint: '연속형 데이터' },
      { value: 'categorical', label: '범주형', hint: '그룹/카테고리' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 4. 예측 모델링 (prediction)
// ============================================
export const PREDICTION_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'outcome_type',
    question: '예측하려는 결과는 어떤 유형인가요?',
    options: [
      { value: 'continuous', label: '연속형 (수치)', hint: '선형 회귀' },
      { value: 'binary', label: '이진형 (예/아니오)', hint: '로지스틱 회귀' },
      { value: 'count', label: '빈도/개수', hint: '포아송 회귀' },
      { value: 'multiclass', label: '다범주', hint: '다항 로지스틱' }
    ],
    autoAnswer: true
  },
  {
    id: 'predictor_count',
    question: '예측 변수가 몇 개인가요?',
    options: [
      { value: '1', label: '1개', hint: '단순 회귀' },
      { value: '2+', label: '2개 이상', hint: '다중 회귀' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 5. 시계열 분석 (timeseries)
// ============================================
export const TIMESERIES_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'goal',
    question: '시계열 분석의 목적은?',
    options: [
      { value: 'forecast', label: '미래 예측', hint: 'ARIMA, 지수평활' },
      { value: 'decompose', label: '패턴 분해', hint: '추세, 계절성 분리' },
      { value: 'stationarity', label: '정상성 검정', hint: 'ADF, KPSS 검정' }
    ]
  },
  {
    id: 'seasonality',
    question: '계절성(주기적 패턴)이 있나요?',
    options: [
      { value: 'yes', label: '예', hint: '계절성 ARIMA (SARIMA)' },
      { value: 'no', label: '아니오', hint: '일반 ARIMA' },
      { value: 'unknown', label: '모름', hint: 'AI가 분석' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 6. 생존 분석 (survival)
// ============================================
export const SURVIVAL_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'goal',
    question: '생존 분석의 목적은?',
    options: [
      { value: 'curve', label: '생존 곡선 추정', hint: 'Kaplan-Meier' },
      { value: 'hazard', label: '위험 요인 분석', hint: 'Cox 비례위험 회귀' },
      { value: 'compare', label: '그룹 간 생존 비교', hint: 'Log-rank 검정' }
    ]
  },
  {
    id: 'covariate_count',
    question: '공변량(위험 요인)이 있나요?',
    options: [
      { value: '0', label: '없음', hint: 'Kaplan-Meier 단독' },
      { value: '1+', label: '1개 이상', hint: 'Cox 회귀 고려' }
    ],
    autoAnswer: true
  }
]

// ============================================
// 질문 맵 (목적 → 질문 목록)
// ============================================
export const QUESTIONS_BY_PURPOSE: Record<AnalysisPurpose, GuidedQuestion[]> = {
  compare: COMPARE_QUESTIONS,
  relationship: RELATIONSHIP_QUESTIONS,
  distribution: DISTRIBUTION_QUESTIONS,
  prediction: PREDICTION_QUESTIONS,
  timeseries: TIMESERIES_QUESTIONS,
  survival: SURVIVAL_QUESTIONS
}

/**
 * 주어진 목적에 대한 질문 목록 반환
 */
export function getQuestionsForPurpose(purpose: AnalysisPurpose): GuidedQuestion[] {
  return QUESTIONS_BY_PURPOSE[purpose] || []
}
