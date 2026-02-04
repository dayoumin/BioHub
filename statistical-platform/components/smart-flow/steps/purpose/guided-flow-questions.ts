/**
 * Guided Flow 질문 데이터
 * 각 분석 목적별로 사용자에게 물어볼 조건 질문 정의
 *
 * DecisionTree.ts의 모든 분기를 커버하도록 설계
 */

import type { GuidedQuestion, AnalysisPurpose } from '@/types/smart-flow'

// ============================================
// 1. 그룹 간 차이 비교 (compare)
// ============================================
export const COMPARE_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'comparison_target',
    required: true,
    question: '무엇을 비교하려고 하나요?',
    options: [
      { value: 'mean', label: '평균 비교', hint: '그룹 간 평균 차이 검정' },
      { value: 'proportion', label: '비율 비교', hint: '비율/백분율 차이 검정' },
      { value: 'median', label: '중앙값 비교', hint: '중앙값 차이 검정' },
      { value: 'population', label: '모집단 대비', hint: '표본 vs 알려진 모집단 값' }
    ]
  },
  {
    id: 'group_count',
    required: true,
    question: '비교할 그룹이 몇 개인가요?',
    options: [
      { value: '1', label: '1개 (모집단 비교)', hint: '예: 표본 평균 vs 기준값' },
      { value: '2', label: '2개 그룹', hint: '예: 처리군 vs 대조군' },
      { value: '3+', label: '3개 이상', hint: '예: A, B, C 양식장 비교' }
    ]
  },
  {
    id: 'sample_type',
    required: true,
    question: '표본은 어떤 유형인가요?',
    options: [
      { value: 'independent', label: '독립 표본', hint: '서로 다른 대상을 측정' },
      { value: 'paired', label: '대응 표본', hint: '같은 대상을 전/후 측정 또는 반복측정' }
    ]
  },
  {
    id: 'variable_type',
    required: true,
    question: '종속변수의 유형은?',
    options: [
      { value: 'continuous', label: '연속형 (수치)', hint: '체중, 길이, 농도 등' },
      { value: 'binary', label: '이진형 (예/아니오)', hint: '생존/폐사, 성공/실패' },
      { value: 'ordinal', label: '순서형', hint: '상/중/하, 등급' }
    ],
    autoAnswer: true
  },
  {
    id: 'normality',
    required: false,
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
    required: false,
    question: '그룹 간 분산이 동일한가요?',
    options: [
      { value: 'yes', label: '예 (등분산)', hint: 'Student t-test / 일반 ANOVA' },
      { value: 'no', label: '아니오 (이분산)', hint: 'Welch t-test / Welch ANOVA 권장' },
      { value: 'check', label: '확인 필요', hint: 'AI가 Levene 검정 결과 확인' }
    ],
    autoAnswer: true
  },
  {
    id: 'has_covariate',
    required: false,
    question: '통제할 공변량(covariate)이 있나요?',
    options: [
      { value: 'no', label: '없음', hint: '일반 ANOVA' },
      { value: 'yes', label: '있음', hint: 'ANCOVA 고려' }
    ]
  },
  {
    id: 'outcome_count',
    required: false,
    question: '종속변수가 몇 개인가요?',
    options: [
      { value: '1', label: '1개', hint: '일반 ANOVA' },
      { value: '2+', label: '2개 이상', hint: 'MANOVA 고려' }
    ]
  },
  {
    id: 'design_type',
    required: false,
    question: '실험 설계 유형은?',
    options: [
      { value: 'simple', label: '단순 설계', hint: '하나의 독립변수' },
      { value: 'factorial', label: '요인 설계', hint: '여러 독립변수 (이원/삼원 ANOVA)' },
      { value: 'mixed', label: '혼합 설계', hint: '고정효과 + 랜덤효과' }
    ]
  }
]

// ============================================
// 2. 변수 간 관계 분석 (relationship)
// ============================================
export const RELATIONSHIP_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'relationship_type',
    required: true,
    question: '어떤 관계를 알고 싶으신가요?',
    options: [
      { value: 'correlation', label: '상관관계', hint: '두 변수가 함께 변하는지' },
      { value: 'prediction', label: '예측/인과', hint: 'X로 Y를 예측' }
    ]
  },
  {
    id: 'variable_count',
    required: true,
    question: '분석할 변수가 몇 개인가요?',
    options: [
      { value: '2', label: '2개', hint: '단순 상관/회귀' },
      { value: '3+', label: '3개 이상', hint: '다중 회귀/편상관' }
    ]
  },
  {
    id: 'variable_type',
    required: true,
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
    required: true,
    question: '어떤 분석을 원하시나요?',
    options: [
      { value: 'describe', label: '기술통계', hint: '평균, 표준편차, 분위수' },
      { value: 'normality', label: '정규성 검정', hint: '데이터 분포 확인' },
      { value: 'frequency', label: '빈도 분석', hint: '범주별 빈도/비율' },
      { value: 'explore', label: '데이터 탐색', hint: '시각화 포함 탐색' },
      { value: 'test_probability', label: '이항 확률 검정', hint: '성공 확률 검정' }
    ]
  },
  {
    id: 'distribution_goal',
    required: false,
    question: '구체적인 분석 목표는?',
    options: [
      { value: 'explore', label: '데이터 탐색', hint: '분포 확인' },
      { value: 'visualize_means', label: '평균 시각화', hint: '그룹별 평균 비교 그래프' },
      { value: 'test_probability', label: '확률 검정', hint: '이항 검정' },
      { value: 'randomness', label: '무작위성 검정', hint: '런 검정' },
      { value: 'distribution_compare', label: '분포 비교', hint: '두 분포가 같은지' }
    ]
  },
  {
    id: 'variable_type',
    required: true,
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
    required: true,
    question: '예측하려는 결과는 어떤 유형인가요?',
    options: [
      { value: 'continuous', label: '연속형 (수치)', hint: '선형 회귀' },
      { value: 'binary', label: '이진형 (예/아니오)', hint: '로지스틱 회귀' },
      { value: 'count', label: '빈도/개수', hint: '포아송 회귀' },
      { value: 'multiclass', label: '다범주', hint: '다항 로지스틱' },
      { value: 'ordinal', label: '순서형 범주', hint: '순서형 로지스틱' }
    ],
    autoAnswer: true
  },
  {
    id: 'predictor_count',
    required: true,
    question: '예측 변수가 몇 개인가요?',
    options: [
      { value: '1', label: '1개', hint: '단순 회귀' },
      { value: '2+', label: '2개 이상', hint: '다중 회귀' }
    ],
    autoAnswer: true
  },
  {
    id: 'variable_selection',
    required: false,
    question: '변수 선택 방법은?',
    options: [
      { value: 'manual', label: '직접 선택', hint: '모든 변수 포함' },
      { value: 'automatic', label: '자동 선택', hint: '단계적 회귀' }
    ]
  },
  {
    id: 'modelType',
    required: false,
    question: '특수한 모형 유형이 필요한가요?',
    options: [
      { value: 'standard', label: '표준 회귀', hint: '일반 선형/로지스틱' },
      { value: 'dose_response', label: '용량-반응', hint: 'EC50/IC50 곡선' },
      { value: 'optimization', label: '최적화 실험', hint: '반응표면 분석' }
    ]
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
      { value: 'stationarity', label: '정상성 검정', hint: 'ADF, KPSS 검정' },
      { value: 'trend_test', label: '추세 검정', hint: 'Mann-Kendall 검정' }
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
// 7. 다변량 분석 (multivariate)
// ============================================
export const MULTIVARIATE_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'goal',
    question: '다변량 분석의 목적은?',
    options: [
      { value: 'dimension_reduction', label: '차원 축소', hint: 'PCA - 변수 수 줄이기' },
      { value: 'latent_factors', label: '잠재 요인 추출', hint: '요인 분석 - 숨은 구조 파악' },
      { value: 'grouping', label: '유사 대상 그룹화', hint: '군집 분석 - 자동 분류' },
      { value: 'classification', label: '그룹 분류/예측', hint: '판별 분석 - 그룹 예측' }
    ]
  }
]

// ============================================
// 8. 연구 설계 도구 (utility)
// ============================================
export const UTILITY_QUESTIONS: GuidedQuestion[] = [
  {
    id: 'goal',
    question: '무엇을 계산하려고 하나요?',
    options: [
      { value: 'sample_size', label: '필요 표본 크기', hint: '실험 전 표본수 계산' },
      { value: 'power', label: '검정력', hint: '현재 표본으로 효과 탐지 가능성' },
      { value: 'reliability', label: '측정 도구 신뢰도', hint: 'Cronbach α 등' }
    ]
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
  survival: SURVIVAL_QUESTIONS,
  multivariate: MULTIVARIATE_QUESTIONS,
  utility: UTILITY_QUESTIONS
}

/**
 * 주어진 목적에 대한 질문 목록 반환
 */
export function getQuestionsForPurpose(purpose: AnalysisPurpose): GuidedQuestion[] {
  return QUESTIONS_BY_PURPOSE[purpose] || []
}
