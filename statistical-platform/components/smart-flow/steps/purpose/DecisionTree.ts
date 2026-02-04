/**
 * 결정 트리 로직
 * 사용자 응답을 기반으로 적합한 통계 방법 추천
 *
 * 이 파일은 lib/constants/statistical-methods.ts의 공통 정의를 사용합니다.
 * 한글 이름은 로컬에서 오버라이드합니다.
 */

import type {
  AnalysisPurpose,
  StatisticalMethod,
  DecisionResult,
  ReasoningStep
} from '@/types/smart-flow'
import {
  STATISTICAL_METHODS,
  getMethodByIdOrAlias,
  getKoreanName,
  getKoreanDescription,
} from '@/lib/constants/statistical-methods'

// ============================================
// 헬퍼 함수
// ============================================

/**
 * 공통 ID로 메서드 조회 + 한글 이름 적용
 * @param idOrAlias - Method ID or alias
 * @param options - { useLegacyId: true } to preserve the input ID
 */
function getMethod(idOrAlias: string, options?: { useLegacyId?: boolean }): StatisticalMethod {
  const method = getMethodByIdOrAlias(idOrAlias)

  if (!method) {
    console.warn(`[DecisionTree] Unknown method ID: ${idOrAlias}`)
    return {
      id: idOrAlias,
      name: idOrAlias,
      description: '',
      category: 'descriptive'
    }
  }

  return {
    id: options?.useLegacyId ? idOrAlias : method.id,
    name: getKoreanName(method.id),
    description: getKoreanDescription(method.id),
    category: method.category
  }
}


// ============================================
// Reasoning Step 팩토리 함수
// ============================================

/** 정규성 reasoning step */
const STEP_NORMALITY = (isNormal: boolean, suggestion?: string): ReasoningStep => ({
  step: '정규성',
  description: isNormal
    ? (suggestion ? `정규분포 충족 → ${suggestion}` : '정규분포 충족 → 모수 검정')
    : (suggestion ? `정규분포 미충족 → ${suggestion}` : '정규분포 미충족 → 비모수 검정')
})

/** 등분산성 reasoning step */
const STEP_HOMOGENEITY = (homogeneity: string, suggestion?: string): ReasoningStep => ({
  step: '등분산성',
  description: homogeneity === 'yes'
    ? (suggestion ? `등분산 충족 → ${suggestion}` : '등분산 충족')
    : homogeneity === 'no'
      ? '등분산 미충족 → Welch 검정'
      : '등분산 미확인 → Welch 검정 (안전)'
})

/** 그룹 수 reasoning step */
const STEP_GROUP_COUNT = (count: string): ReasoningStep => ({
  step: '그룹 수',
  description: count === '1' ? '단일 표본' :
               count === '2' ? '2개 그룹 비교' :
               '3개 이상 그룹 비교'
})

/** 표본 유형 reasoning step */
const STEP_SAMPLE_TYPE = (isPaired: boolean): ReasoningStep => ({
  step: '표본 유형',
  description: isPaired ? '대응표본 (같은 대상 전/후)' : '독립표본 (서로 다른 대상)'
})

/** 변수 유형 reasoning step */
const STEP_VARIABLE_TYPE = (type: string, suggestion?: string): ReasoningStep => ({
  step: '변수 유형',
  description: suggestion ? `${type} → ${suggestion}` : type
})

// ============================================
// 결과 생성 헬퍼 함수
// ============================================

interface Alternative {
  id: string
  reason: string
  useLegacyId?: boolean
}

/**
 * DecisionResult 생성 헬퍼
 * @param methodId - Primary method ID
 * @param reasoning - Reasoning steps
 * @param alternatives - Alternative methods (optional)
 * @param options - Additional options
 */
function createResult(
  methodId: string,
  reasoning: ReasoningStep[],
  alternatives: Alternative[] = [],
  options?: {
    useLegacyId?: boolean
    warnings?: string[]
  }
): DecisionResult {
  return {
    method: getMethod(methodId, options?.useLegacyId ? { useLegacyId: true } : undefined),
    reasoning,
    alternatives: alternatives.map(alt => ({
      method: getMethod(alt.id, alt.useLegacyId ? { useLegacyId: true } : undefined),
      reason: alt.reason
    })),
    ...(options?.warnings && { warnings: options.warnings })
  }
}

// ============================================
// 결정 함수들
// ============================================


// ============================================
// decideCompare 서브 함수들
// ============================================

/** 단일 표본 비교 (vs 모집단) */
function decideCompare_SingleSample(
  answers: Record<string, string>,
  reasoning: ReasoningStep[]
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push({ step: '비교 대상', description: '표본 vs 모집단' })

  if (variableType === 'binary') {
    reasoning.push(STEP_VARIABLE_TYPE('이진형', '비율 검정'))
    return createResult('proportion-test', reasoning, [
      { id: 'binomial-test', reason: '정확 검정이 필요할 때' }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(true, '단일표본 t-검정'))
    return createResult('one-sample-t', reasoning, [
      { id: 'wilcoxon', reason: '정규성 미충족시 부호순위 검정' }
    ])
  }

  reasoning.push(STEP_NORMALITY(false))
  return createResult('sign-test', reasoning, [
    { id: 'one-sample-t', reason: 'n>=30이면 중심극한정리로 강건' }
  ])
}

/** 비율 비교 */
function decideCompare_Proportion(reasoning: ReasoningStep[]): DecisionResult {
  reasoning.push({ step: '비교 대상', description: '비율 비교' })
  return createResult('proportion-test', reasoning, [
    { id: 'chi-square-independence', reason: '교차표 형태일 때' }
  ])
}

/** 2그룹 대응표본 비교 */
function decideCompare_TwoGroups_Paired(
  answers: Record<string, string>,
  reasoning: ReasoningStep[]
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push(STEP_SAMPLE_TYPE(true))

  // 이진 범주형 대응 데이터 → McNemar
  if (variableType === 'binary') {
    reasoning.push(STEP_VARIABLE_TYPE('이진 범주형', 'McNemar 검정'))
    return createResult('mcnemar', reasoning, [
      { id: 'sign-test', reason: '순서형 데이터일 때' }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(true))
    return createResult('paired-t', reasoning, [
      { id: 'wilcoxon', reason: '정규성이 불확실할 때 안전한 대안', useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(false))
  return createResult('wilcoxon', reasoning, [
    { id: 'sign-test', reason: '순서형 또는 방향성만 중요할 때' },
    { id: 'paired-t', reason: 'n>=30이면 중심극한정리로 강건', useLegacyId: true }
  ], { useLegacyId: true })
}

/** 2그룹 독립표본 비교 */
function decideCompare_TwoGroups_Independent(
  answers: Record<string, string>,
  reasoning: ReasoningStep[]
): DecisionResult {
  const { normality, homogeneity } = answers

  reasoning.push(STEP_SAMPLE_TYPE(false))

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(true))

    if (homogeneity === 'yes') {
      reasoning.push(STEP_HOMOGENEITY('yes', 'Student t-검정'))
      return createResult('independent-t', reasoning, [
        { id: 'welch-t', reason: '등분산 가정 없이도 사용 가능', useLegacyId: true },
        { id: 'mann-whitney', reason: '비모수 대안', useLegacyId: true }
      ], { useLegacyId: true })
    }

    reasoning.push(STEP_HOMOGENEITY(homogeneity))
    return createResult('welch-t', reasoning, [
      { id: 'independent-t', reason: '등분산 확인시 사용 가능', useLegacyId: true },
      { id: 'mann-whitney', reason: '비모수 대안', useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(false))
  return createResult('mann-whitney', reasoning, [
    { id: 'welch-t', reason: 'n>=30이면 강건', useLegacyId: true }
  ], { useLegacyId: true })
}

/** 3그룹 이상 반복측정 비교 */
function decideCompare_MultiGroups_Repeated(
  answers: Record<string, string>,
  reasoning: ReasoningStep[]
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push({ step: '표본 유형', description: '반복측정 (같은 대상 여러 시점)' })

  // 이진 범주형 반복측정 → Cochran Q
  if (variableType === 'binary') {
    reasoning.push(STEP_VARIABLE_TYPE('이진 범주형', 'Cochran Q 검정'))
    return createResult('cochran-q', reasoning, [
      { id: 'mcnemar', reason: '2시점만 비교할 때' }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(true))
    return createResult('repeated-anova', reasoning, [
      { id: 'friedman', reason: '구형성 가정 위반시', useLegacyId: true }
    ], { useLegacyId: true, warnings: ['구형성 검정(Mauchly)을 확인하세요. 위반시 Greenhouse-Geisser 보정 적용'] })
  }

  reasoning.push(STEP_NORMALITY(false))
  return createResult('friedman', reasoning, [
    { id: 'repeated-anova', reason: 'n>=30이면 강건', useLegacyId: true }
  ], { useLegacyId: true })
}

/** 3그룹 이상 독립표본 비교 */
function decideCompare_MultiGroups_Independent(
  answers: Record<string, string>,
  reasoning: ReasoningStep[]
): DecisionResult {
  const { normality, homogeneity, has_covariate, outcome_count, design_type, comparison_target } = answers

  reasoning.push({ step: '표본 유형', description: '독립 그룹' })

  // 혼합 설계
  if (design_type === 'mixed') {
    reasoning.push({ step: '설계 유형', description: '혼합 설계 → 혼합효과 모형' })
    return createResult('mixed-model', reasoning, [
      { id: 'repeated-anova', reason: '단순 반복측정일 때', useLegacyId: true }
    ], { warnings: ['랜덤효과 구조를 신중히 선택해야 합니다'] })
  }

  // 다변량 종속변수 → MANOVA
  if (outcome_count === '2+') {
    reasoning.push({ step: '종속변수', description: '다변량 → MANOVA' })
    return createResult('manova', reasoning, [
      { id: 'one-way-anova', reason: '종속변수 개별 분석시', useLegacyId: true }
    ], { warnings: ['다변량 정규성, Box M 검정 확인 필요'] })
  }

  // 공변량 존재 → ANCOVA
  if (has_covariate === 'yes') {
    reasoning.push({ step: '공변량', description: '공변량 통제 → ANCOVA' })
    return createResult('ancova', reasoning, [
      { id: 'one-way-anova', reason: '공변량 통제 불필요시', useLegacyId: true }
    ], { warnings: ['회귀 기울기 동질성 가정 확인 필요'] })
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(true))

    if (homogeneity === 'yes') {
      reasoning.push(STEP_HOMOGENEITY('yes', '일원분산분석'))
      return createResult('one-way-anova', reasoning, [
        { id: 'welch-anova', reason: '등분산 가정 없이도 사용 가능', useLegacyId: true },
        { id: 'kruskal-wallis', reason: '비모수 대안', useLegacyId: true }
      ], { useLegacyId: true })
    }

    reasoning.push(STEP_HOMOGENEITY(homogeneity))
    return createResult('welch-anova', reasoning, [
      { id: 'one-way-anova', reason: '등분산 확인시 사용 가능', useLegacyId: true },
      { id: 'kruskal-wallis', reason: '비모수 대안', useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(false))

  // 중앙값 비교가 목적이면 Mood 중앙값 검정
  if (comparison_target === 'median') {
    reasoning.push({ step: '비교 대상', description: '중앙값 비교 → Mood 검정' })
    return createResult('mood-median', reasoning, [
      { id: 'kruskal-wallis', reason: '분포 전체 비교시', useLegacyId: true }
    ])
  }

  return createResult('kruskal-wallis', reasoning, [
    { id: 'mood-median', reason: '중앙값 비교가 목적일 때' },
    { id: 'welch-anova', reason: 'n/그룹>=30이면 강건', useLegacyId: true }
  ], { useLegacyId: true })
}


/**
 * 그룹 간 차이 비교 결정 트리
 * 서브 함수로 분리하여 가독성 향상
 */
function decideCompare(answers: Record<string, string>): DecisionResult {
  const { group_count, sample_type, comparison_target } = answers
  const reasoning: ReasoningStep[] = []

  // 단일 표본 비교 (vs 모집단)
  if (comparison_target === 'population' || group_count === '1') {
    return decideCompare_SingleSample(answers, reasoning)
  }

  // 비율 비교
  if (comparison_target === 'proportion') {
    return decideCompare_Proportion(reasoning)
  }

  // 2개 그룹
  if (group_count === '2') {
    reasoning.push(STEP_GROUP_COUNT('2'))
    return sample_type === 'paired'
      ? decideCompare_TwoGroups_Paired(answers, reasoning)
      : decideCompare_TwoGroups_Independent(answers, reasoning)
  }

  // 3개 이상 그룹
  reasoning.push(STEP_GROUP_COUNT('3+'))
  return sample_type === 'paired'
    ? decideCompare_MultiGroups_Repeated(answers, reasoning)
    : decideCompare_MultiGroups_Independent(answers, reasoning)
}

/**
 * 변수 간 관계 분석 결정 트리
 */
function decideRelationship(answers: Record<string, string>): DecisionResult {
  const relationType = answers.relationship_type
  const variableCount = answers.variable_count
  const variableType = answers.variable_type

  const reasoning: ReasoningStep[] = []

  // 상관분석
  if (relationType === 'correlation') {
    reasoning.push({ step: '분석 유형', description: '상관관계 분석' })

    if (variableType === 'numeric') {
      reasoning.push({ step: '변수 유형', description: '모두 수치형' })

      if (variableCount === '2') {
        reasoning.push({ step: '변수 수', description: '2개 변수' })
        // NOTE: Spearman은 correlation 페이지 내 옵션으로 제공됨
        return createResult('correlation', reasoning, [], {
          warnings: ['정규성 미충족/이상치 존재시 Spearman 옵션 선택']
        })
      } else {
        reasoning.push({ step: '변수 수', description: '3개 이상 변수' })
        return createResult('partial-correlation', reasoning, [
          { id: 'correlation', reason: '단순 상관 행렬' }
        ])
      }
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 포함' })
      return createResult('chi-square-independence', reasoning, [
        { id: 'correlation', reason: '순서형 변수일 때 Spearman 사용' }
      ])
    }
  }

  // 예측/회귀
  reasoning.push({ step: '분석 유형', description: '예측/회귀 분석' })
  reasoning.push({ step: '변수 수', description: variableCount === '2' ? '단순 회귀' : '다중 회귀' })

  if (variableType === 'numeric') {
    reasoning.push({ step: '변수 유형', description: '모두 수치형' })
    return createResult('regression', reasoning)
  } else {
    reasoning.push({ step: '변수 유형', description: '범주형 포함 → 로지스틱 회귀' })
    return createResult('logistic-regression', reasoning)
  }
}

/**
 * 분포와 빈도 분석 결정 트리
 */
function decideDistribution(answers: Record<string, string>): DecisionResult {
  const analysisType = answers.analysis_type
  const variableType = answers.variable_type
  const distributionGoal = answers.distribution_goal

  const reasoning: ReasoningStep[] = []

  // 데이터 탐색
  if (analysisType === 'explore' || distributionGoal === 'explore') {
    reasoning.push({ step: '분석 유형', description: '데이터 탐색' })
    return createResult('explore-data', reasoning, [
      { id: 'descriptive', reason: '기술통계만 필요할 때' }
    ])
  }

  // 평균 시각화
  if (distributionGoal === 'visualize_means') {
    reasoning.push({ step: '분석 유형', description: '평균 시각화' })
    return createResult('means-plot', reasoning, [
      { id: 'descriptive', reason: '기술통계표로 대체' }
    ])
  }

  // 이항 확률 검정
  if (analysisType === 'test_probability' || distributionGoal === 'test_probability') {
    reasoning.push({ step: '분석 유형', description: '이진 확률 검정' })
    return createResult('binomial-test', reasoning, [
      { id: 'proportion-test', reason: '대표본 근사 사용시' }
    ])
  }

  // 무작위성 검정
  if (distributionGoal === 'randomness') {
    reasoning.push({ step: '분석 유형', description: '무작위성 검정' })
    return createResult('runs-test', reasoning)
  }

  // 두 분포 비교
  if (distributionGoal === 'distribution_compare') {
    reasoning.push({ step: '분석 유형', description: '두 분포 비교' })
    return createResult('ks-test', reasoning, [
      { id: 'mann-whitney', reason: '중앙값 차이가 관심일 때' }
    ])
  }

  if (analysisType === 'describe') {
    reasoning.push({ step: '분석 유형', description: '기술통계' })

    if (variableType === 'numeric') {
      reasoning.push({ step: '변수 유형', description: '수치형 → 평균, 표준편차 등' })
      return createResult('descriptive', reasoning, [
        { id: 'explore-data', reason: '상세 탐색 필요시' }
      ])
    } else {
      reasoning.push({ step: '변수 유형', description: '범주형 → 빈도, 비율' })
      return createResult('descriptive', reasoning)
    }
  }

  if (analysisType === 'normality') {
    reasoning.push({ step: '분석 유형', description: '정규성 검정' })
    return createResult('normality-test', reasoning, [
      { id: 'ks-test', reason: '비교 분포가 있을 때' }
    ])
  }

  // frequency
  reasoning.push({ step: '분석 유형', description: '빈도 분석' })

  if (variableType === 'categorical') {
    return createResult('descriptive', reasoning, [
      { id: 'chi-square-goodness', reason: '기대 빈도와 비교시' },
      { id: 'binomial-test', reason: '이진 비율 검정시' }
    ])
  }

  return createResult('descriptive', reasoning, [
    { id: 'explore-data', reason: '시각화 포함 탐색시' }
  ])
}

/**
 * 예측 모델링 결정 트리
 */
function decidePrediction(answers: Record<string, string>): DecisionResult {
  const outcomeType = answers.outcome_type
  const predictorCount = answers.predictor_count
  const variableSelection = answers.variable_selection
  const modelType = answers.modelType

  const reasoning: ReasoningStep[] = []

  // 특수 모형 유형 분기
  if (modelType === 'dose_response') {
    reasoning.push({ step: '모형 유형', description: '용량-반응 분석' })
    return createResult('dose-response', reasoning, [
      { id: 'regression', reason: '선형 관계 가정시' }
    ], { warnings: ['EC50/IC50 계산에 충분한 농도 범위 필요'] })
  }

  if (modelType === 'optimization') {
    reasoning.push({ step: '모형 유형', description: '최적화 실험' })
    return createResult('response-surface', reasoning, [
      { id: 'regression', reason: '단순 예측만 필요시' }
    ], { warnings: ['실험 설계(CCD, BBD 등)가 적절해야 합니다'] })
  }

  // 자동 변수 선택 → 단계적 회귀
  if (variableSelection === 'automatic' && predictorCount === '2+') {
    reasoning.push({ step: '변수 선택', description: '자동 변수 선택 → 단계적 회귀' })
    return createResult('stepwise', reasoning, [
      { id: 'regression', reason: '모든 변수 포함시' }
    ], { warnings: ['과적합 주의, 교차검증 권장'] })
  }

  reasoning.push({ step: '예측 변수 수', description: predictorCount === '1' ? '단순 모형' : '다중 모형' })

  switch (outcomeType) {
    case 'continuous':
      reasoning.push({ step: '결과 변수', description: '연속형 → 선형 회귀' })
      return createResult('regression', reasoning, [
        { id: 'stepwise', reason: '변수 선택이 필요할 때' }
      ], predictorCount === '2+' ? { warnings: ['다중공선성(VIF), 잔차 정규성 확인 필요'] } : undefined)

    case 'binary':
      reasoning.push({ step: '결과 변수', description: '이진형 → 로지스틱 회귀' })
      return createResult('logistic-regression', reasoning, [
        { id: 'discriminant', reason: '판별 분석 대안' }
      ], { warnings: ['ROC-AUC, Hosmer-Lemeshow 검정으로 적합도 확인'] })

    case 'count':
      reasoning.push({ step: '결과 변수', description: '빈도/개수 → 포아송 회귀' })
      return createResult('poisson', reasoning, [], {
        warnings: ['과산포(overdispersion) 확인 - 있으면 음이항 회귀 고려']
      })

    case 'multiclass':
      reasoning.push({ step: '결과 변수', description: '다범주 → 다항 로지스틱' })
      return createResult('logistic-regression', reasoning, [
        { id: 'ordinal-regression', reason: '순서형 범주일 때' },
        { id: 'discriminant', reason: '판별 분석 대안' }
      ])

    case 'ordinal':
      reasoning.push({ step: '결과 변수', description: '순서형 → 순서형 로지스틱' })
      return createResult('ordinal-regression', reasoning, [
        { id: 'logistic-regression', reason: '순서 무시시' }
      ])

    default:
      return createResult('regression', reasoning)
  }
}

/**
 * 시계열 분석 결정 트리
 */
function decideTimeseries(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const seasonality = answers.seasonality

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'forecast':
      reasoning.push({ step: '분석 목적', description: '미래 예측' })

      if (seasonality === 'yes') {
        reasoning.push({ step: '계절성', description: '계절성 있음 → SARIMA' })
        // NOTE: SARIMA는 arima 페이지 내 옵션으로 제공됨
        return createResult('arima', reasoning, [
          { id: 'seasonal-decompose', reason: '계절 패턴 분석 후 예측시' }
        ], { warnings: ['ARIMA 페이지에서 계절성 옵션(SARIMA) 선택'] })
      } else {
        reasoning.push({ step: '계절성', description: '계절성 없음 → ARIMA' })
        return createResult('arima', reasoning)
      }

    case 'decompose':
      reasoning.push({ step: '분석 목적', description: '패턴 분해' })
      return createResult('seasonal-decompose', reasoning)

    case 'stationarity':
      reasoning.push({ step: '분석 목적', description: '정상성 검정' })
      return createResult('stationarity-test', reasoning, [], {
        warnings: ['KPSS 검정도 함께 수행하면 더 신뢰할 수 있습니다']
      })

    case 'trend_test':
      reasoning.push({ step: '분석 목적', description: '추세 검정' })
      return createResult('mann-kendall', reasoning, [
        { id: 'regression', reason: '선형 추세 검정시' }
      ], { warnings: ['자기상관이 있으면 Modified MK 사용 권장'] })

    default:
      reasoning.push({ step: '기본', description: '시계열 분석' })
      return createResult('arima', reasoning)
  }
}

/**
 * 생존 분석 결정 트리
 */
function decideSurvival(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const covariateCount = answers.covariate_count

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'curve':
      reasoning.push({ step: '분석 목적', description: '생존 곡선 추정' })
      // NOTE: Log-rank 검정은 kaplan-meier 페이지 내 옵션으로 제공됨
      return createResult('kaplan-meier', reasoning, [], {
        warnings: ['그룹 비교시 Log-rank 검정 옵션 사용']
      })

    case 'compare':
      reasoning.push({ step: '분석 목적', description: '그룹 간 생존 비교' })
      return createResult('kaplan-meier', reasoning, [
        { id: 'cox-regression', reason: '공변량 통제가 필요할 때' }
      ])

    case 'hazard':
      reasoning.push({ step: '분석 목적', description: '위험 요인 분석' })

      if (covariateCount === '1+') {
        reasoning.push({ step: '공변량', description: '공변량 있음 → Cox 회귀' })
        return createResult('cox-regression', reasoning, [], {
          warnings: ['비례위험 가정 확인 필요 (Schoenfeld 잔차)']
        })
      } else {
        reasoning.push({ step: '공변량', description: '공변량 없음' })
        return createResult('kaplan-meier', reasoning, [
          { id: 'cox-regression', reason: '공변량 추가시' }
        ])
      }

    default:
      return createResult('kaplan-meier', reasoning)
  }
}

/**
 * 다변량 분석 결정 트리
 */
function decideMultivariate(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'dimension_reduction':
      reasoning.push({ step: '분석 목적', description: '차원 축소' })
      return createResult('pca', reasoning, [
        { id: 'factor-analysis', reason: '잠재 요인 해석이 필요할 때' }
      ])

    case 'latent_factors':
      reasoning.push({ step: '분석 목적', description: '잠재 요인 추출' })
      return createResult('factor-analysis', reasoning, [
        { id: 'pca', reason: '차원 축소만 필요할 때' }
      ])

    case 'grouping':
      reasoning.push({ step: '분석 목적', description: '유사 대상 그룹화' })
      return createResult('cluster', reasoning, [
        { id: 'discriminant', reason: '그룹이 이미 정의되어 있을 때' }
      ])

    case 'classification':
      reasoning.push({ step: '분석 목적', description: '그룹 분류/예측' })
      return createResult('discriminant', reasoning, [
        { id: 'logistic-regression', reason: '이진 분류일 때' },
        { id: 'cluster', reason: '그룹이 정의되지 않았을 때' }
      ])

    default:
      reasoning.push({ step: '기본', description: '다변량 분석' })
      return createResult('pca', reasoning)
  }
}

/**
 * 유틸리티 분석 결정 트리
 */
function decideUtility(answers: Record<string, string>): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'sample_size':
      reasoning.push({ step: '분석 목적', description: '표본 크기 계산' })
      return createResult('power-analysis', reasoning, [], {
        warnings: ['연구 설계, 효과 크기, 유의수준을 미리 정해야 합니다']
      })

    case 'power':
      reasoning.push({ step: '분석 목적', description: '검정력 계산' })
      return createResult('power-analysis', reasoning)

    case 'reliability':
      reasoning.push({ step: '분석 목적', description: '측정 도구 신뢰도' })
      return createResult('reliability', reasoning, [], {
        warnings: ['항목이 3개 이상 필요합니다']
      })

    default:
      reasoning.push({ step: '기본', description: '유틸리티 분석' })
      return createResult('power-analysis', reasoning)
  }
}

// ============================================
// 메인 결정 함수
// ============================================

export interface DecisionPath {
  purpose: AnalysisPurpose
  answers: Record<string, string>
}

/**
 * 사용자 응답을 기반으로 통계 방법 결정
 */
export function decide(path: DecisionPath): DecisionResult {
  switch (path.purpose) {
    case 'compare':
      return decideCompare(path.answers)
    case 'relationship':
      return decideRelationship(path.answers)
    case 'distribution':
      return decideDistribution(path.answers)
    case 'prediction':
      return decidePrediction(path.answers)
    case 'timeseries':
      return decideTimeseries(path.answers)
    case 'survival':
      return decideSurvival(path.answers)
    case 'multivariate':
      return decideMultivariate(path.answers)
    case 'utility':
      return decideUtility(path.answers)
    default:
      // Fallback
      return createResult('descriptive', [{ step: '기본', description: '기본 기술통계 분석' }])
  }
}

/**
 * 메서드 ID로 StatisticalMethod 조회
 */
export function getMethodById(id: string): StatisticalMethod | null {
  const method = getMethodByIdOrAlias(id)
  if (!method) return null

  return {
    id: method.id,
    name: getKoreanName(method.id),
    description: getKoreanDescription(method.id),
    category: method.category
  }
}

/**
 * 모든 메서드 목록 반환
 */
export function getAllMethods(): StatisticalMethod[] {
  return Object.values(STATISTICAL_METHODS).map(method => ({
    id: method.id,
    name: getKoreanName(method.id),
    description: getKoreanDescription(method.id),
    category: method.category
  }))
}
