import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { StatisticalMethodCategory } from '@/types/analysis'

export type ResultsAutomationFactId =
  | 'test-statistic'
  | 'degrees-of-freedom'
  | 'p-value'
  | 'effect-size'
  | 'confidence-interval'
  | 'group-statistics'
  | 'post-hoc-results'
  | 'model-coefficients'
  | 'model-fit'
  | 'source-provenance'

export type ResultsUserInputId =
  | 'biological-meaning'
  | 'result-priority'
  | 'figure-table-link'
  | 'nonsignificant-reporting'

export type ResultsProhibitedClaimId =
  | 'p-value-contradiction'
  | 'causal-interpretation'
  | 'effect-strength-without-criteria'
  | 'unlinked-figure-table-result'
  | 'unsupported-biological-meaning'
  | 'post-hoc-correction-inference'

export type ResultsGateRuleId =
  | 'missing-core-statistic'
  | 'missing-p-value'
  | 'missing-source-provenance'
  | 'missing-effect-size'
  | 'missing-confidence-interval'
  | 'missing-group-statistics'
  | 'missing-post-hoc-method'
  | 'missing-model-fit'

interface LocalizedScopeText {
  ko: string
  en: string
}

interface ResultsScopeItem<TId extends string> {
  id: TId
  label: LocalizedScopeText
  description: LocalizedScopeText
}

export interface ResolvedResultsScopeItem<TId extends string> {
  id: TId
  label: string
  description: string
}

export interface ResultsAutomationScopeDefinition {
  category: StatisticalMethodCategory
  autoFacts: Array<ResultsScopeItem<ResultsAutomationFactId>>
  userInputs: Array<ResultsScopeItem<ResultsUserInputId>>
  prohibitedClaims: Array<ResultsScopeItem<ResultsProhibitedClaimId>>
  blockedWhen: ResultsGateRuleId[]
  reviewWhen: ResultsGateRuleId[]
}

export interface ResolvedResultsAutomationScope {
  methodId: string
  category: StatisticalMethodCategory
  autoFacts: Array<ResolvedResultsScopeItem<ResultsAutomationFactId>>
  userInputs: Array<ResolvedResultsScopeItem<ResultsUserInputId>>
  prohibitedClaims: Array<ResolvedResultsScopeItem<ResultsProhibitedClaimId>>
  blockedWhen: ResultsGateRuleId[]
  reviewWhen: ResultsGateRuleId[]
}

function item<TId extends string>(
  id: TId,
  ko: string,
  en: string,
  koDescription: string,
  enDescription: string,
): ResultsScopeItem<TId> {
  return {
    id,
    label: { ko, en },
    description: { ko: koDescription, en: enDescription },
  }
}

const COMMON_AUTO_FACTS: Array<ResultsScopeItem<ResultsAutomationFactId>> = [
  item(
    'test-statistic',
    '검정 통계량',
    'Test statistic',
    '실제 분석 결과에 저장된 검정 통계량만 작성합니다.',
    'Only the test statistic stored in the analysis result is stated.',
  ),
  item(
    'degrees-of-freedom',
    '자유도',
    'Degrees of freedom',
    '결과에 자유도가 있을 때만 APA 문장에 포함합니다.',
    'Degrees of freedom are included only when present in the result.',
  ),
  item(
    'p-value',
    'p-value',
    'p-value',
    'p-value 기반 유의성 표현은 수치와 같은 방향으로만 작성합니다.',
    'Significance wording must match the p-value.',
  ),
  item(
    'source-provenance',
    '결과 source',
    'Result source',
    '데이터/분석 source fingerprint가 있는 결과만 자동 초안의 기준으로 사용합니다.',
    'Only results with data or analysis source fingerprint are used for automatic drafting.',
  ),
]

const GROUP_FACTS: Array<ResultsScopeItem<ResultsAutomationFactId>> = [
  item(
    'group-statistics',
    '집단별 기술통계',
    'Group statistics',
    '집단별 n, 평균, 표준편차 또는 중앙값이 있을 때만 비교 문장을 보강합니다.',
    'Group-level n, mean, SD, or median are used only when available.',
  ),
]

const EFFECT_FACTS: Array<ResultsScopeItem<ResultsAutomationFactId>> = [
  item(
    'effect-size',
    '효과크기',
    'Effect size',
    '결과에 저장된 효과크기 수치와 종류만 작성합니다.',
    'Only stored effect-size values and labels are stated.',
  ),
  item(
    'confidence-interval',
    '신뢰구간',
    'Confidence interval',
    '신뢰구간 lower/upper가 있는 경우에만 작성합니다.',
    'Confidence intervals are stated only when lower and upper bounds are present.',
  ),
]

const POST_HOC_FACTS: Array<ResultsScopeItem<ResultsAutomationFactId>> = [
  item(
    'post-hoc-results',
    '사후검정 결과',
    'Post hoc results',
    '저장된 사후검정 pair와 조정 p-value만 작성합니다.',
    'Only stored post hoc pairs and adjusted p-values are stated.',
  ),
]

const MODEL_FACTS: Array<ResultsScopeItem<ResultsAutomationFactId>> = [
  item(
    'model-coefficients',
    '모형 계수',
    'Model coefficients',
    '저장된 계수, 표준오차, p-value만 작성합니다.',
    'Only stored coefficients, standard errors, and p-values are stated.',
  ),
  item(
    'model-fit',
    '모형 적합 지표',
    'Model fit',
    'R-squared, AIC, BIC 등 결과에 있는 적합 지표만 작성합니다.',
    'Only available fit metrics such as R-squared, AIC, or BIC are stated.',
  ),
]

const COMMON_USER_INPUTS: Array<ResultsScopeItem<ResultsUserInputId>> = [
  item(
    'biological-meaning',
    '생물학적 의미',
    'Biological meaning',
    '통계적 유의성을 생물학적 의미로 확장하려면 사용자 해석이 필요합니다.',
    'User interpretation is required to extend statistical significance to biological meaning.',
  ),
  item(
    'result-priority',
    '주요 결과 우선순위',
    'Result priority',
    '여러 결과 중 강조할 순서는 사용자가 결정해야 합니다.',
    'The user should choose which results to emphasize.',
  ),
  item(
    'figure-table-link',
    '표/그림 연결',
    'Figure/table link',
    '본문 결과를 특정 표/그림과 연결할 때는 실제 source binding이 필요합니다.',
    'Linking results to figures or tables requires actual source binding.',
  ),
  item(
    'nonsignificant-reporting',
    '비유의 결과 서술 범위',
    'Non-significant result reporting',
    '비유의 결과를 어느 정도 자세히 쓸지는 사용자 확인이 필요합니다.',
    'The desired level of detail for non-significant results requires user confirmation.',
  ),
]

const COMMON_PROHIBITED_CLAIMS: Array<ResultsScopeItem<ResultsProhibitedClaimId>> = [
  item(
    'p-value-contradiction',
    'p-value와 반대되는 유의성 표현',
    'Contradictory p-value wording',
    'p-value 기준과 반대되는 유의/비유의 표현을 생성하지 않습니다.',
    'Do not generate significance wording that contradicts the p-value.',
  ),
  item(
    'causal-interpretation',
    '인과적 결과 표현',
    'Causal interpretation',
    '통계 결과만으로 원인, 효과, 기전을 단정하지 않습니다.',
    'Do not infer cause, effect, or mechanism from statistical results alone.',
  ),
  item(
    'effect-strength-without-criteria',
    '근거 없는 효과 강도 단정',
    'Effect strength without criteria',
    '효과크기 해석 기준이 없으면 강함/약함을 단정하지 않습니다.',
    'Do not label effects as strong or weak without interpretation criteria.',
  ),
  item(
    'unlinked-figure-table-result',
    '없는 표/그림 결과 언급',
    'Unlinked figure/table result',
    'source가 연결되지 않은 표/그림 결과를 본문에 만들지 않습니다.',
    'Do not mention figure or table results that are not source-linked.',
  ),
  item(
    'unsupported-biological-meaning',
    '검증되지 않은 생물학적 의미',
    'Unsupported biological meaning',
    '통계량만으로 생물학적/임상적 중요성을 과장하지 않습니다.',
    'Do not overstate biological or clinical importance from statistics alone.',
  ),
  item(
    'post-hoc-correction-inference',
    '사후검정 보정 추론',
    'Post hoc correction inference',
    '결과에 없는 보정 방법명을 추론하지 않습니다.',
    'Do not infer a post hoc correction method that is absent from the result.',
  ),
]

function scope(
  category: StatisticalMethodCategory,
  options: {
    autoFacts?: Array<ResultsScopeItem<ResultsAutomationFactId>>
    blockedWhen?: ResultsGateRuleId[]
    reviewWhen?: ResultsGateRuleId[]
  } = {},
): ResultsAutomationScopeDefinition {
  return {
    category,
    autoFacts: [...COMMON_AUTO_FACTS, ...(options.autoFacts ?? [])],
    userInputs: COMMON_USER_INPUTS,
    prohibitedClaims: COMMON_PROHIBITED_CLAIMS,
    blockedWhen: options.blockedWhen ?? [
      'missing-core-statistic',
      'missing-p-value',
      'missing-source-provenance',
    ],
    reviewWhen: options.reviewWhen ?? [
      'missing-effect-size',
      'missing-confidence-interval',
    ],
  }
}

const CATEGORY_SCOPES: Record<StatisticalMethodCategory, ResultsAutomationScopeDefinition> = {
  descriptive: scope('descriptive', {
    autoFacts: GROUP_FACTS,
    blockedWhen: ['missing-core-statistic', 'missing-source-provenance'],
    reviewWhen: [],
  }),
  't-test': scope('t-test', {
    autoFacts: [...GROUP_FACTS, ...EFFECT_FACTS],
    reviewWhen: ['missing-effect-size', 'missing-confidence-interval', 'missing-group-statistics'],
  }),
  anova: scope('anova', {
    autoFacts: [...GROUP_FACTS, ...EFFECT_FACTS, ...POST_HOC_FACTS],
    reviewWhen: ['missing-effect-size', 'missing-confidence-interval', 'missing-group-statistics', 'missing-post-hoc-method'],
  }),
  regression: scope('regression', {
    autoFacts: [...EFFECT_FACTS, ...MODEL_FACTS],
    reviewWhen: ['missing-effect-size', 'missing-confidence-interval', 'missing-model-fit'],
  }),
  correlation: scope('correlation', {
    autoFacts: EFFECT_FACTS,
    reviewWhen: ['missing-confidence-interval'],
  }),
  'chi-square': scope('chi-square', {
    autoFacts: EFFECT_FACTS,
    reviewWhen: ['missing-effect-size'],
  }),
  nonparametric: scope('nonparametric', {
    autoFacts: [...GROUP_FACTS, ...EFFECT_FACTS, ...POST_HOC_FACTS],
    reviewWhen: ['missing-effect-size', 'missing-group-statistics', 'missing-post-hoc-method'],
  }),
  timeseries: scope('timeseries', {
    autoFacts: MODEL_FACTS,
    reviewWhen: ['missing-model-fit'],
  }),
  psychometrics: scope('psychometrics', {
    blockedWhen: ['missing-core-statistic', 'missing-source-provenance'],
    reviewWhen: [],
  }),
  design: scope('design', {
    autoFacts: EFFECT_FACTS,
    blockedWhen: ['missing-core-statistic', 'missing-source-provenance'],
    reviewWhen: [],
  }),
  survival: scope('survival', {
    autoFacts: EFFECT_FACTS,
    reviewWhen: ['missing-effect-size', 'missing-confidence-interval'],
  }),
  multivariate: scope('multivariate', {
    autoFacts: MODEL_FACTS,
    reviewWhen: ['missing-model-fit'],
  }),
  other: scope('other'),
}

function resolveItem<TId extends string>(
  itemToResolve: ResultsScopeItem<TId>,
  language: 'ko' | 'en',
): ResolvedResultsScopeItem<TId> {
  return {
    id: itemToResolve.id,
    label: itemToResolve.label[language],
    description: itemToResolve.description[language],
  }
}

export function getResultsAutomationScope(
  methodId: string,
  language: 'ko' | 'en',
): ResolvedResultsAutomationScope {
  const category = STATISTICAL_METHODS[methodId]?.category ?? 'other'
  const definition = CATEGORY_SCOPES[category] ?? CATEGORY_SCOPES.other

  return {
    methodId,
    category,
    autoFacts: definition.autoFacts.map((entry) => resolveItem(entry, language)),
    userInputs: definition.userInputs.map((entry) => resolveItem(entry, language)),
    prohibitedClaims: definition.prohibitedClaims.map((entry) => resolveItem(entry, language)),
    blockedWhen: definition.blockedWhen,
    reviewWhen: definition.reviewWhen,
  }
}
