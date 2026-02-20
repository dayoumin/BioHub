/**
 * 결정 트리 로직
 * 사용자 응답을 기반으로 적합한 통계 방법 추천
 *
 * 이 파일은 lib/constants/statistical-methods.ts의 공통 정의를 사용합니다.
 * 한글 이름은 로컬에서 오버라이드합니다.
 *
 * Terminology System: 모든 사용자 대면 문자열은 DecisionTreeText 사전을 통해 제공됩니다.
 */

import type {
  AnalysisPurpose,
  StatisticalMethod,
  DecisionResult,
  ReasoningStep
} from '@/types/smart-flow'
import type { DecisionTreeText } from '@/lib/terminology/terminology-types'
import {
  STATISTICAL_METHODS,
  getMethodByIdOrAlias,
  getKoreanName,
  getKoreanDescription,
} from '@/lib/constants/statistical-methods'
import { aquaculture } from '@/lib/terminology/domains/aquaculture'

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
const STEP_NORMALITY = (dt: DecisionTreeText, isNormal: boolean, suggestion?: string): ReasoningStep => ({
  step: dt.steps.normality,
  description: isNormal
    ? (suggestion ? `${dt.descriptions.normalMetPrefix} → ${suggestion}` : dt.descriptions.normalMetParametric)
    : (suggestion ? `${dt.descriptions.normalNotMetPrefix} → ${suggestion}` : dt.descriptions.normalNotMetNonparametric)
})

/** 등분산성 reasoning step */
const STEP_HOMOGENEITY = (dt: DecisionTreeText, homogeneity: string, suggestion?: string): ReasoningStep => ({
  step: dt.steps.homogeneity,
  description: homogeneity === 'yes'
    ? (suggestion ? `${dt.descriptions.homoMetPrefix} → ${suggestion}` : dt.descriptions.homoMet)
    : homogeneity === 'no'
      ? dt.descriptions.homoNotMetWelch
      : dt.descriptions.homoUncheckedWelch
})

/** 그룹 수 reasoning step */
const STEP_GROUP_COUNT = (dt: DecisionTreeText, count: string): ReasoningStep => ({
  step: dt.steps.groupCount,
  description: count === '1' ? dt.descriptions.singleSample :
               count === '2' ? dt.descriptions.twoGroupComparison :
               dt.descriptions.threeOrMoreGroupComparison
})

/** 표본 유형 reasoning step */
const STEP_SAMPLE_TYPE = (dt: DecisionTreeText, isPaired: boolean): ReasoningStep => ({
  step: dt.steps.sampleType,
  description: isPaired ? dt.descriptions.pairedSample : dt.descriptions.independentSample
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
  reasoning: ReasoningStep[],
  dt: DecisionTreeText
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push({ step: dt.steps.comparisonTarget, description: dt.descriptions.sampleVsPopulation })

  if (variableType === 'binary') {
    reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.binaryProportionTest })
    return createResult('proportion-test', reasoning, [
      { id: 'binomial-test', reason: dt.reasons.exactTestNeeded }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(dt, true, dt.descriptions.oneSampleTTest))
    return createResult('one-sample-t', reasoning, [
      { id: 'wilcoxon', reason: dt.reasons.signRankWhenNotNormal }
    ])
  }

  reasoning.push(STEP_NORMALITY(dt, false))
  return createResult('sign-test', reasoning, [
    { id: 'one-sample-t', reason: dt.reasons.cltRobustN30 }
  ])
}

/** 비율 비교 */
function decideCompare_Proportion(reasoning: ReasoningStep[], dt: DecisionTreeText): DecisionResult {
  reasoning.push({ step: dt.steps.comparisonTarget, description: dt.descriptions.proportionComparison })
  return createResult('proportion-test', reasoning, [
    { id: 'chi-square-independence', reason: dt.reasons.crosstabForm }
  ])
}

/** 2그룹 대응표본 비교 */
function decideCompare_TwoGroups_Paired(
  answers: Record<string, string>,
  reasoning: ReasoningStep[],
  dt: DecisionTreeText
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push(STEP_SAMPLE_TYPE(dt, true))

  // 이진 범주형 대응 데이터 → McNemar
  if (variableType === 'binary') {
    reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.binaryMcNemar })
    return createResult('mcnemar', reasoning, [
      { id: 'sign-test', reason: dt.reasons.ordinalData }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(dt, true))
    return createResult('paired-t', reasoning, [
      { id: 'wilcoxon', reason: dt.reasons.safeAlternativeUncertain, useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(dt, false))
  return createResult('wilcoxon', reasoning, [
    { id: 'sign-test', reason: dt.reasons.ordinalOrDirectional },
    { id: 'paired-t', reason: dt.reasons.cltRobustN30, useLegacyId: true }
  ], { useLegacyId: true })
}

/** 2그룹 독립표본 비교 */
function decideCompare_TwoGroups_Independent(
  answers: Record<string, string>,
  reasoning: ReasoningStep[],
  dt: DecisionTreeText
): DecisionResult {
  const { normality, homogeneity } = answers

  reasoning.push(STEP_SAMPLE_TYPE(dt, false))

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(dt, true))

    if (homogeneity === 'yes') {
      reasoning.push(STEP_HOMOGENEITY(dt, 'yes', dt.descriptions.studentTTest))
      return createResult('independent-t', reasoning, [
        { id: 'welch-t', reason: dt.reasons.noEqualVarianceNeeded, useLegacyId: true },
        { id: 'mann-whitney', reason: dt.reasons.nonparametricAlternative, useLegacyId: true }
      ], { useLegacyId: true })
    }

    reasoning.push(STEP_HOMOGENEITY(dt, homogeneity))
    return createResult('welch-t', reasoning, [
      { id: 'independent-t', reason: dt.reasons.equalVarianceConfirmed, useLegacyId: true },
      { id: 'mann-whitney', reason: dt.reasons.nonparametricAlternative, useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(dt, false))
  return createResult('mann-whitney', reasoning, [
    { id: 'welch-t', reason: dt.reasons.robustN30, useLegacyId: true }
  ], { useLegacyId: true })
}

/** 3그룹 이상 반복측정 비교 */
function decideCompare_MultiGroups_Repeated(
  answers: Record<string, string>,
  reasoning: ReasoningStep[],
  dt: DecisionTreeText
): DecisionResult {
  const { normality, variable_type: variableType } = answers

  reasoning.push({ step: dt.steps.sampleType, description: dt.descriptions.repeatedMeasurement })

  // 이진 범주형 반복측정 → Cochran Q
  if (variableType === 'binary') {
    reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.binaryCochranQ })
    return createResult('cochran-q', reasoning, [
      { id: 'mcnemar', reason: dt.reasons.twoTimepoints }
    ])
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(dt, true))
    return createResult('repeated-anova', reasoning, [
      { id: 'friedman', reason: dt.reasons.sphericityViolated, useLegacyId: true }
    ], { useLegacyId: true, warnings: [dt.warnings.sphericity] })
  }

  reasoning.push(STEP_NORMALITY(dt, false))
  return createResult('friedman', reasoning, [
    { id: 'repeated-anova', reason: dt.reasons.robustN30, useLegacyId: true }
  ], { useLegacyId: true })
}

/** 3그룹 이상 독립표본 비교 */
function decideCompare_MultiGroups_Independent(
  answers: Record<string, string>,
  reasoning: ReasoningStep[],
  dt: DecisionTreeText
): DecisionResult {
  const { normality, homogeneity, has_covariate, outcome_count, design_type, comparison_target } = answers

  reasoning.push({ step: dt.steps.sampleType, description: dt.descriptions.independentGroup })

  // 혼합 설계
  if (design_type === 'mixed') {
    reasoning.push({ step: dt.steps.designType, description: dt.descriptions.mixedDesignMixedModel })
    return createResult('mixed-model', reasoning, [
      { id: 'repeated-anova', reason: dt.reasons.simpleRepeatedMeasure, useLegacyId: true }
    ], { warnings: [dt.warnings.randomEffects] })
  }

  // 다변량 종속변수 → MANOVA
  if (outcome_count === '2+') {
    reasoning.push({ step: dt.steps.dependentVariable, description: dt.descriptions.multivariateMANOVA })
    return createResult('manova', reasoning, [
      { id: 'one-way-anova', reason: dt.reasons.individualDVAnalysis, useLegacyId: true }
    ], { warnings: [dt.warnings.multivariateNormality] })
  }

  // 공변량 존재 → ANCOVA
  if (has_covariate === 'yes') {
    reasoning.push({ step: dt.steps.covariate, description: dt.descriptions.covariateANCOVA })
    return createResult('ancova', reasoning, [
      { id: 'one-way-anova', reason: dt.reasons.covariateNotNeeded, useLegacyId: true }
    ], { warnings: [dt.warnings.regressionHomogeneity] })
  }

  if (normality === 'yes') {
    reasoning.push(STEP_NORMALITY(dt, true))

    if (homogeneity === 'yes') {
      reasoning.push(STEP_HOMOGENEITY(dt, 'yes', dt.descriptions.oneWayANOVA))
      return createResult('one-way-anova', reasoning, [
        { id: 'welch-anova', reason: dt.reasons.noEqualVarianceNeeded, useLegacyId: true },
        { id: 'kruskal-wallis', reason: dt.reasons.nonparametricAlternative, useLegacyId: true }
      ], { useLegacyId: true })
    }

    reasoning.push(STEP_HOMOGENEITY(dt, homogeneity))
    return createResult('welch-anova', reasoning, [
      { id: 'one-way-anova', reason: dt.reasons.equalVarianceConfirmed, useLegacyId: true },
      { id: 'kruskal-wallis', reason: dt.reasons.nonparametricAlternative, useLegacyId: true }
    ], { useLegacyId: true })
  }

  reasoning.push(STEP_NORMALITY(dt, false))

  // 중앙값 비교가 목적이면 Mood 중앙값 검정
  if (comparison_target === 'median') {
    reasoning.push({ step: dt.steps.comparisonTarget, description: dt.descriptions.medianComparisonMood })
    return createResult('mood-median', reasoning, [
      { id: 'kruskal-wallis', reason: dt.reasons.fullDistributionComparison, useLegacyId: true }
    ])
  }

  return createResult('kruskal-wallis', reasoning, [
    { id: 'mood-median', reason: dt.reasons.medianComparisonPurpose },
    { id: 'welch-anova', reason: dt.reasons.cltRobustNPerGroup30, useLegacyId: true }
  ], { useLegacyId: true })
}


/**
 * 그룹 간 차이 비교 결정 트리
 * 서브 함수로 분리하여 가독성 향상
 */
function decideCompare(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const { group_count, sample_type, comparison_target } = answers
  const reasoning: ReasoningStep[] = []

  // 단일 표본 비교 (vs 모집단)
  if (comparison_target === 'population' || group_count === '1') {
    return decideCompare_SingleSample(answers, reasoning, dt)
  }

  // 비율 비교
  if (comparison_target === 'proportion') {
    return decideCompare_Proportion(reasoning, dt)
  }

  // 2개 그룹
  if (group_count === '2') {
    reasoning.push(STEP_GROUP_COUNT(dt, '2'))
    return sample_type === 'paired'
      ? decideCompare_TwoGroups_Paired(answers, reasoning, dt)
      : decideCompare_TwoGroups_Independent(answers, reasoning, dt)
  }

  // 3개 이상 그룹
  reasoning.push(STEP_GROUP_COUNT(dt, '3+'))
  return sample_type === 'paired'
    ? decideCompare_MultiGroups_Repeated(answers, reasoning, dt)
    : decideCompare_MultiGroups_Independent(answers, reasoning, dt)
}

/**
 * 변수 간 관계 분석 결정 트리
 */
function decideRelationship(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const relationType = answers.relationship_type
  const variableCount = answers.variable_count
  const variableType = answers.variable_type

  const reasoning: ReasoningStep[] = []

  // 상관분석
  if (relationType === 'correlation') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.correlationAnalysis })

    if (variableType === 'numeric') {
      reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.allNumeric })

      if (variableCount === '2') {
        reasoning.push({ step: dt.steps.variableCount, description: dt.descriptions.twoVariables })
        // NOTE: Spearman은 correlation 페이지 내 옵션으로 제공됨
        return createResult('correlation', reasoning, [], {
          warnings: [dt.warnings.spearmanOutliers]
        })
      } else {
        reasoning.push({ step: dt.steps.variableCount, description: dt.descriptions.threeOrMoreVariables })
        return createResult('partial-correlation', reasoning, [
          { id: 'correlation', reason: dt.reasons.simpleCorrelation }
        ])
      }
    } else {
      reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.categoricalIncluded })
      return createResult('chi-square-independence', reasoning, [
        { id: 'correlation', reason: dt.reasons.spearmanForOrdinal }
      ])
    }
  }

  // 예측/회귀
  reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.predictionRegression })
  reasoning.push({ step: dt.steps.variableCount, description: variableCount === '2' ? dt.descriptions.simpleRegression : dt.descriptions.multipleRegression })

  if (variableType === 'numeric') {
    reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.allNumeric })
    return createResult('regression', reasoning)
  } else {
    reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.categoricalLogistic })
    return createResult('logistic-regression', reasoning)
  }
}

/**
 * 분포와 빈도 분석 결정 트리
 */
function decideDistribution(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const analysisType = answers.analysis_type
  const variableType = answers.variable_type
  const distributionGoal = answers.distribution_goal

  const reasoning: ReasoningStep[] = []

  // 데이터 탐색
  if (analysisType === 'explore' || distributionGoal === 'explore') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.dataExploration })
    return createResult('explore-data', reasoning, [
      { id: 'descriptive', reason: dt.reasons.descriptiveOnly }
    ])
  }

  // 평균 시각화
  if (distributionGoal === 'visualize_means') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.meanVisualization })
    return createResult('means-plot', reasoning, [
      { id: 'descriptive', reason: dt.reasons.descriptiveTableAlternative }
    ])
  }

  // 이항 확률 검정
  if (analysisType === 'test_probability' || distributionGoal === 'test_probability') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.binaryProbabilityTest })
    return createResult('binomial-test', reasoning, [
      { id: 'proportion-test', reason: dt.reasons.largeApproximation }
    ])
  }

  // 무작위성 검정
  if (distributionGoal === 'randomness') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.randomnessTest })
    return createResult('runs-test', reasoning)
  }

  // 두 분포 비교
  if (distributionGoal === 'distribution_compare') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.twoDistributionComparison })
    return createResult('ks-test', reasoning, [
      { id: 'mann-whitney', reason: dt.reasons.medianDifference }
    ])
  }

  if (analysisType === 'describe') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.descriptiveStats })

    if (variableType === 'numeric') {
      reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.numericMeanStd })
      return createResult('descriptive', reasoning, [
        { id: 'explore-data', reason: dt.reasons.detailedExploration }
      ])
    } else {
      reasoning.push({ step: dt.steps.variableType, description: dt.descriptions.categoricalFreqRatio })
      return createResult('descriptive', reasoning)
    }
  }

  if (analysisType === 'normality') {
    reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.normalityTest })
    return createResult('normality-test', reasoning, [
      { id: 'ks-test', reason: dt.reasons.comparisonDistribution }
    ])
  }

  // frequency
  reasoning.push({ step: dt.steps.analysisType, description: dt.descriptions.frequencyAnalysis })

  if (variableType === 'categorical') {
    return createResult('descriptive', reasoning, [
      { id: 'chi-square-goodness', reason: dt.reasons.expectedFrequency },
      { id: 'binomial-test', reason: dt.reasons.binaryRateTest }
    ])
  }

  return createResult('descriptive', reasoning, [
    { id: 'explore-data', reason: dt.reasons.explorationWithViz }
  ])
}

/**
 * 예측 모델링 결정 트리
 */
function decidePrediction(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const outcomeType = answers.outcome_type
  const predictorCount = answers.predictor_count
  const variableSelection = answers.variable_selection
  const modelType = answers.modelType

  const reasoning: ReasoningStep[] = []

  // 특수 모형 유형 분기
  if (modelType === 'dose_response') {
    reasoning.push({ step: dt.steps.modelType, description: dt.descriptions.doseResponseAnalysis })
    return createResult('dose-response', reasoning, [
      { id: 'regression', reason: dt.reasons.linearRelationship }
    ], { warnings: [dt.warnings.doseResponseRange] })
  }

  if (modelType === 'optimization') {
    reasoning.push({ step: dt.steps.modelType, description: dt.descriptions.optimizationExperiment })
    return createResult('response-surface', reasoning, [
      { id: 'regression', reason: dt.reasons.simplePrediction }
    ], { warnings: [dt.warnings.experimentalDesign] })
  }

  // 자동 변수 선택 → 단계적 회귀
  if (variableSelection === 'automatic' && predictorCount === '2+') {
    reasoning.push({ step: dt.steps.variableSelection, description: dt.descriptions.autoVariableStepwise })
    return createResult('stepwise', reasoning, [
      { id: 'regression', reason: dt.reasons.allVariablesIncluded }
    ], { warnings: [dt.warnings.overfittingCrossValidation] })
  }

  reasoning.push({ step: dt.steps.predictorCount, description: predictorCount === '1' ? dt.descriptions.simpleModel : dt.descriptions.multipleModel })

  switch (outcomeType) {
    case 'continuous':
      reasoning.push({ step: dt.steps.outcomeVariable, description: dt.descriptions.continuousLinearRegression })
      return createResult('regression', reasoning, [
        { id: 'stepwise', reason: dt.reasons.variableSelectionNeeded }
      ], predictorCount === '2+' ? { warnings: [dt.warnings.multicollinearity] } : undefined)

    case 'binary':
      reasoning.push({ step: dt.steps.outcomeVariable, description: dt.descriptions.binaryLogisticRegression })
      return createResult('logistic-regression', reasoning, [
        { id: 'discriminant', reason: dt.reasons.discriminantAlternative }
      ], { warnings: [dt.warnings.rocAucHosmerLemeshow] })

    case 'count':
      reasoning.push({ step: dt.steps.outcomeVariable, description: dt.descriptions.countPoissonRegression })
      return createResult('poisson', reasoning, [], {
        warnings: [dt.warnings.overdispersion]
      })

    case 'multiclass':
      reasoning.push({ step: dt.steps.outcomeVariable, description: dt.descriptions.multiclassMultinomialLogistic })
      return createResult('logistic-regression', reasoning, [
        { id: 'ordinal-regression', reason: dt.reasons.ordinalCategory },
        { id: 'discriminant', reason: dt.reasons.discriminantAlternative }
      ])

    case 'ordinal':
      reasoning.push({ step: dt.steps.outcomeVariable, description: dt.descriptions.ordinalOrdinalLogistic })
      return createResult('ordinal-regression', reasoning, [
        { id: 'logistic-regression', reason: dt.reasons.ignoreOrder }
      ])

    default:
      return createResult('regression', reasoning)
  }
}

/**
 * 시계열 분석 결정 트리
 */
function decideTimeseries(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const goal = answers.goal
  const seasonality = answers.seasonality

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'forecast':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.futureForecast })

      if (seasonality === 'yes') {
        reasoning.push({ step: dt.steps.seasonality, description: dt.descriptions.seasonalSARIMA })
        // NOTE: SARIMA는 arima 페이지 내 옵션으로 제공됨
        return createResult('arima', reasoning, [
          { id: 'seasonal-decompose', reason: dt.reasons.seasonalPatternAnalysis }
        ], { warnings: [dt.warnings.arimaSeasonalOption] })
      } else {
        reasoning.push({ step: dt.steps.seasonality, description: dt.descriptions.noSeasonalARIMA })
        return createResult('arima', reasoning)
      }

    case 'decompose':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.patternDecomposition })
      return createResult('seasonal-decompose', reasoning)

    case 'stationarity':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.stationarityTest })
      return createResult('stationarity-test', reasoning, [], {
        warnings: [dt.warnings.kpssAdditional]
      })

    case 'trend_test':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.trendTest })
      return createResult('mann-kendall', reasoning, [
        { id: 'regression', reason: dt.reasons.simplePrediction }
      ], { warnings: [dt.warnings.autocorrelationModifiedMK] })

    default:
      reasoning.push({ step: dt.steps.defaultStep, description: dt.descriptions.timeseriesAnalysis })
      return createResult('arima', reasoning)
  }
}

/**
 * 생존 분석 결정 트리
 */
function decideSurvival(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const goal = answers.goal
  const covariateCount = answers.covariate_count

  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'curve':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.survivalCurveEstimation })
      // NOTE: Log-rank 검정은 kaplan-meier 페이지 내 옵션으로 제공됨
      return createResult('kaplan-meier', reasoning, [], {
        warnings: [dt.reasons.logRankForGroupComparison]
      })

    case 'compare':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.groupSurvivalComparison })
      return createResult('kaplan-meier', reasoning, [
        { id: 'cox-regression', reason: dt.reasons.covariateControlNeeded }
      ])

    case 'hazard':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.hazardFactorAnalysis })

      if (covariateCount === '1+') {
        reasoning.push({ step: dt.steps.covariate, description: dt.descriptions.covariateYesCox })
        return createResult('cox-regression', reasoning, [], {
          warnings: [dt.warnings.proportionalHazards]
        })
      } else {
        reasoning.push({ step: dt.steps.covariate, description: dt.descriptions.covariateNone })
        return createResult('kaplan-meier', reasoning, [
          { id: 'cox-regression', reason: dt.reasons.addCovariate }
        ])
      }

    default:
      return createResult('kaplan-meier', reasoning)
  }
}

/**
 * 다변량 분석 결정 트리
 */
function decideMultivariate(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'dimension_reduction':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.dimensionReduction })
      return createResult('pca', reasoning, [
        { id: 'factor-analysis', reason: dt.reasons.latentFactorInterpretation }
      ])

    case 'latent_factors':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.latentFactorExtraction })
      return createResult('factor-analysis', reasoning, [
        { id: 'pca', reason: dt.reasons.dimensionReductionOnly }
      ])

    case 'grouping':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.similarGrouping })
      return createResult('cluster', reasoning, [
        { id: 'discriminant', reason: dt.reasons.groupAlreadyDefined }
      ])

    case 'classification':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.groupClassification })
      return createResult('discriminant', reasoning, [
        { id: 'logistic-regression', reason: dt.reasons.binaryClassification },
        { id: 'cluster', reason: dt.reasons.groupNotDefined }
      ])

    default:
      reasoning.push({ step: dt.steps.defaultStep, description: dt.descriptions.multivariateAnalysis })
      return createResult('pca', reasoning)
  }
}

/**
 * 유틸리티 분석 결정 트리
 */
function decideUtility(answers: Record<string, string>, dt: DecisionTreeText): DecisionResult {
  const goal = answers.goal
  const reasoning: ReasoningStep[] = []

  switch (goal) {
    case 'sample_size':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.sampleSizeCalculation })
      return createResult('power-analysis', reasoning, [], {
        warnings: [dt.warnings.sampleSizePrereqs]
      })

    case 'power':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.powerCalculation })
      return createResult('power-analysis', reasoning)

    case 'reliability':
      reasoning.push({ step: dt.steps.analysisPurpose, description: dt.descriptions.reliabilityMeasurement })
      return createResult('reliability', reasoning, [], {
        warnings: [dt.warnings.minItemsRequired]
      })

    default:
      reasoning.push({ step: dt.steps.defaultStep, description: dt.descriptions.utilityAnalysis })
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
 * @param path - 분석 목적 + 사용자 응답
 * @param dt - 결정 트리 텍스트 사전 (Terminology System). 생략 시 aquaculture 기본값 사용.
 */
export function decide(path: DecisionPath, dt: DecisionTreeText = aquaculture.decisionTree): DecisionResult {
  switch (path.purpose) {
    case 'compare':
      return decideCompare(path.answers, dt)
    case 'relationship':
      return decideRelationship(path.answers, dt)
    case 'distribution':
      return decideDistribution(path.answers, dt)
    case 'prediction':
      return decidePrediction(path.answers, dt)
    case 'timeseries':
      return decideTimeseries(path.answers, dt)
    case 'survival':
      return decideSurvival(path.answers, dt)
    case 'multivariate':
      return decideMultivariate(path.answers, dt)
    case 'utility':
      return decideUtility(path.answers, dt)
    default:
      // Fallback
      return createResult('descriptive', [{ step: dt.steps.defaultStep, description: dt.descriptions.defaultDescriptive }])
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
