import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { StatisticalMethodCategory } from '@/types/analysis'

export type MethodsAutomationFactId =
  | 'analysis-method'
  | 'variable-roles'
  | 'materials-source'
  | 'sample-size'
  | 'group-structure'
  | 'alpha-level'
  | 'assumption-test-names'
  | 'assumption-test-results'
  | 'post-hoc-method'
  | 'model-family'
  | 'software-provenance'

export type MethodsUserInputId =
  | 'research-purpose'
  | 'data-description'
  | 'analysis-rationale'
  | 'missing-data-handling'
  | 'preprocessing'
  | 'exclusion-criteria'
  | 'assumption-decision'
  | 'post-hoc-correction'
  | 'study-design'

export type MethodsProhibitedClaimId =
  | 'random-assignment'
  | 'blinding'
  | 'preregistration'
  | 'causal-claim'
  | 'outlier-removal'
  | 'mcar'
  | 'normal-distribution'
  | 'all-assumptions-met'
  | 'specific-post-hoc-correction'
  | 'software-version-specificity'
  | 'equipment-reagent-approval'
  | 'species-identity'

export type MethodsGateRuleId =
  | 'missing-variable-roles'
  | 'validation-errors'
  | 'missing-post-hoc-method'
  | 'missing-data-handling'
  | 'missing-assumption-decision'
  | 'missing-study-purpose'
  | 'missing-data-description'
  | 'missing-model-rationale'
  | 'unverified-species-source'

interface LocalizedScopeText {
  ko: string
  en: string
}

interface MethodsScopeItem<TId extends string> {
  id: TId
  label: LocalizedScopeText
  description: LocalizedScopeText
}

export interface ResolvedMethodsScopeItem<TId extends string> {
  id: TId
  label: string
  description: string
}

export interface MethodsAutomationScopeDefinition {
  category: StatisticalMethodCategory
  autoFacts: Array<MethodsScopeItem<MethodsAutomationFactId>>
  userInputs: Array<MethodsScopeItem<MethodsUserInputId>>
  prohibitedClaims: Array<MethodsScopeItem<MethodsProhibitedClaimId>>
  blockedWhen: MethodsGateRuleId[]
  reviewWhen: MethodsGateRuleId[]
}

export interface ResolvedMethodsAutomationScope {
  methodId: string
  category: StatisticalMethodCategory
  autoFacts: Array<ResolvedMethodsScopeItem<MethodsAutomationFactId>>
  userInputs: Array<ResolvedMethodsScopeItem<MethodsUserInputId>>
  prohibitedClaims: Array<ResolvedMethodsScopeItem<MethodsProhibitedClaimId>>
  blockedWhen: MethodsGateRuleId[]
  reviewWhen: MethodsGateRuleId[]
}

function item<TId extends string>(
  id: TId,
  ko: string,
  en: string,
  koDescription: string,
  enDescription: string,
): MethodsScopeItem<TId> {
  return {
    id,
    label: { ko, en },
    description: { ko: koDescription, en: enDescription },
  }
}

const COMMON_AUTO_FACTS: Array<MethodsScopeItem<MethodsAutomationFactId>> = [
  item(
    'analysis-method',
    '분석 방법명',
    'Analysis method',
    '선택된 통계 방법명은 자동으로 작성할 수 있습니다.',
    'The selected statistical method can be stated automatically.',
  ),
  item(
    'variable-roles',
    '변수 역할',
    'Variable roles',
    '종속/독립/집단/공변량 역할은 변수 매핑에서 확인된 경우만 작성합니다.',
    'Dependent, independent, grouping, or covariate roles are stated only when confirmed by variable mapping.',
  ),
  item(
    'materials-source',
    '재료/시료 source',
    'Materials and samples source',
    '데이터 파일, 프로젝트 entity, 검증된 species source처럼 provenance가 있는 항목만 작성합니다.',
    'Only provenance-backed sources such as data files, project entities, or verified species sources are stated.',
  ),
  item(
    'sample-size',
    '표본 수',
    'Sample size',
    '데이터 검증 메타데이터의 행 수와 집단별 n을 사용할 수 있습니다.',
    'Row count and group-level n from validation metadata can be used.',
  ),
  item(
    'alpha-level',
    '유의수준',
    'Alpha level',
    '분석 옵션 또는 기본값으로 확인된 유의수준만 작성합니다.',
    'Only the alpha level confirmed by analysis options or defaults is stated.',
  ),
  item(
    'software-provenance',
    '소프트웨어 provenance',
    'Software provenance',
    'BioHub 기반 분석이라는 provenance는 자동으로 포함할 수 있습니다.',
    'BioHub analysis provenance can be included automatically.',
  ),
]

const COMMON_USER_INPUTS: Array<MethodsScopeItem<MethodsUserInputId>> = [
  item(
    'research-purpose',
    '연구 목적',
    'Research purpose',
    'Methods 첫 문장에 들어갈 연구 목적은 사용자가 확인해야 합니다.',
    'The study purpose used in the opening Methods sentence must be user-confirmed.',
  ),
  item(
    'data-description',
    '데이터/표본 설명',
    'Data and sample description',
    '대상, 실험군, 측정 맥락은 분석 결과만으로 추론하지 않습니다.',
    'Subjects, experimental groups, and measurement context are not inferred from results alone.',
  ),
  item(
    'missing-data-handling',
    '결측 처리 방식',
    'Missing data handling',
    '결측치가 있거나 결측 여부가 불명확한 경우 처리 방식은 사용자가 확인합니다. 검증 결과 결측치가 0개이면 자동 확인으로 처리할 수 있습니다.',
    'When missing values are present or unknown, handling must be user-confirmed. A validated missing-value count of 0 can be treated as complete.',
  ),
  item(
    'preprocessing',
    '전처리/변환',
    'Preprocessing or transformation',
    '변환, 표준화, 필터링은 명시 입력이 있을 때만 작성합니다.',
    'Transformation, scaling, or filtering is stated only when explicitly provided.',
  ),
  item(
    'exclusion-criteria',
    '제외 기준',
    'Exclusion criteria',
    '이상치 제거나 제외 기준은 자동으로 꾸며 쓰지 않습니다.',
    'Outlier removal or exclusion criteria are never invented automatically.',
  ),
  item(
    'assumption-decision',
    '가정 점검 판단',
    'Assumption decision',
    '가정 위반 또는 미점검 시 분석을 유지한 이유는 사용자가 확인해야 합니다.',
    'When assumptions are violated or unavailable, the rationale for retaining the analysis must be user-confirmed.',
  ),
]

const COMMON_PROHIBITED_CLAIMS: Array<MethodsScopeItem<MethodsProhibitedClaimId>> = [
  item(
    'random-assignment',
    '무작위 배정',
    'Random assignment',
    '실험 설계 입력 없이 무작위 배정을 언급하지 않습니다.',
    'Random assignment is not stated without study-design input.',
  ),
  item(
    'blinding',
    '눈가림',
    'Blinding',
    '눈가림 여부는 통계 결과에서 추론하지 않습니다.',
    'Blinding is not inferred from statistical output.',
  ),
  item(
    'preregistration',
    '사전 계획/사전 등록',
    'Preregistration or planned analysis',
    '사전 계획 분석이라는 표현은 명시 입력이 없으면 금지합니다.',
    'Preregistered or planned analysis language is prohibited without explicit input.',
  ),
  item(
    'causal-claim',
    '인과 주장',
    'Causal claim',
    '관찰/통계 결과만으로 인과 표현을 생성하지 않습니다.',
    'Causal language is not generated from observational or statistical results alone.',
  ),
  item(
    'outlier-removal',
    '이상치 제거',
    'Outlier removal',
    '이상치 제거는 실제 처리 기록 없이 작성하지 않습니다.',
    'Outlier removal is not stated without an actual processing record.',
  ),
  item(
    'mcar',
    '완전임의결측',
    'Missing completely at random',
    'MCAR 같은 결측 메커니즘은 검정/입력 없이 주장하지 않습니다.',
    'Missingness mechanisms such as MCAR are not claimed without tests or explicit input.',
  ),
  item(
    'normal-distribution',
    '정규분포 단정',
    'Normal distribution assertion',
    '정규성 검정이나 사용자의 판단 없이 정규분포를 단정하지 않습니다.',
    'Normality is not asserted without tests or user-confirmed judgment.',
  ),
  item(
    'all-assumptions-met',
    '모든 가정 충족',
    'All assumptions met',
    '확인된 모든 가정 검정이 통과한 경우에만 작성합니다.',
    'This is stated only when all relevant checked assumptions passed.',
  ),
  item(
    'specific-post-hoc-correction',
    '특정 사후검정 보정',
    'Specific post hoc correction',
    'Tukey, Bonferroni 등 보정명은 결과 또는 사용자 입력이 있을 때만 작성합니다.',
    'Correction names such as Tukey or Bonferroni are stated only when present in results or user input.',
  ),
  item(
    'equipment-reagent-approval',
    '장비·시약·승인번호',
    'Equipment, reagents, and approval numbers',
    '장비명, 시약명, 윤리 승인/허가번호는 명시 입력 없이 작성하지 않습니다.',
    'Equipment names, reagent names, and ethics or permit approval numbers are not stated without explicit input.',
  ),
  item(
    'species-identity',
    '검증되지 않은 종 동정',
    'Unverified species identity',
    'taxonomy/species checker 또는 사용자가 확인한 source 없이 종명을 확정 표현으로 쓰지 않습니다.',
    'Species names are not stated as confirmed without a taxonomy/species checker or user-confirmed source.',
  ),
  item(
    'software-version-specificity',
    '정확한 소프트웨어 버전',
    'Exact software version',
    '현재 런타임에서 확인하지 않은 SciPy/statsmodels 버전 번호를 꾸며 쓰지 않습니다.',
    'Exact SciPy/statsmodels versions are not invented when runtime metadata is unavailable.',
  ),
]

const ASSUMPTION_FACTS: Array<MethodsScopeItem<MethodsAutomationFactId>> = [
  item(
    'assumption-test-names',
    '가정 검정명',
    'Assumption test names',
    '실제로 수행된 가정 검정명만 작성합니다.',
    'Only actually performed assumption test names are stated.',
  ),
  item(
    'assumption-test-results',
    '가정 검정 결과',
    'Assumption test results',
    '검정 통계량과 p-value가 있는 경우에만 결과를 작성합니다.',
    'Assumption results are stated only when statistics and p-values are available.',
  ),
]

const GROUP_FACTS: Array<MethodsScopeItem<MethodsAutomationFactId>> = [
  item(
    'group-structure',
    '집단 구조',
    'Group structure',
    '집단 수와 집단별 표본 수는 결과 메타데이터가 있을 때 작성합니다.',
    'Group count and group-level sample sizes are stated when result metadata is available.',
  ),
]

const POST_HOC_INPUTS: Array<MethodsScopeItem<MethodsUserInputId>> = [
  item(
    'post-hoc-correction',
    '사후검정 보정 방법',
    'Post hoc correction method',
    '다중비교 보정 방법이 결과에 없으면 사용자가 입력해야 합니다.',
    'If the multiple-comparison correction method is absent from results, the user must provide it.',
  ),
]

const MODEL_INPUTS: Array<MethodsScopeItem<MethodsUserInputId>> = [
  item(
    'analysis-rationale',
    '분석 방법 선택 이유',
    'Analysis rationale',
    '회귀/모형 계열은 모형 선택 이유를 자동으로 추론하지 않습니다.',
    'For regression or model-based analyses, the model-selection rationale is not inferred.',
  ),
]

const STUDY_DESIGN_INPUTS: Array<MethodsScopeItem<MethodsUserInputId>> = [
  item(
    'study-design',
    '연구 설계',
    'Study design',
    '반복측정, 생존, 시계열 분석의 설계 맥락은 사용자 확인이 필요합니다.',
    'Design context for repeated-measures, survival, or time-series analyses requires user confirmation.',
  ),
]

const COMMON_BLOCKED_WHEN: MethodsGateRuleId[] = [
  'validation-errors',
  'unverified-species-source',
]

function mergeBlockedWhen(rules: MethodsGateRuleId[] | undefined): MethodsGateRuleId[] {
  return Array.from(new Set([
    ...COMMON_BLOCKED_WHEN,
    ...(rules ?? [
      'missing-variable-roles',
      'missing-post-hoc-method',
    ]),
  ]))
}

function scope(
  category: StatisticalMethodCategory,
  options: {
    autoFacts?: Array<MethodsScopeItem<MethodsAutomationFactId>>
    userInputs?: Array<MethodsScopeItem<MethodsUserInputId>>
    blockedWhen?: MethodsGateRuleId[]
    reviewWhen?: MethodsGateRuleId[]
  } = {},
): MethodsAutomationScopeDefinition {
  return {
    category,
    autoFacts: [...COMMON_AUTO_FACTS, ...(options.autoFacts ?? [])],
    userInputs: [...COMMON_USER_INPUTS, ...(options.userInputs ?? [])],
    prohibitedClaims: COMMON_PROHIBITED_CLAIMS,
    blockedWhen: mergeBlockedWhen(options.blockedWhen),
    reviewWhen: options.reviewWhen ?? [
      'missing-study-purpose',
      'missing-data-description',
      'missing-data-handling',
      'missing-assumption-decision',
    ],
  }
}

const CATEGORY_SCOPES: Record<StatisticalMethodCategory, MethodsAutomationScopeDefinition> = {
  descriptive: scope('descriptive', {
    autoFacts: ASSUMPTION_FACTS,
    blockedWhen: ['validation-errors'],
  }),
  't-test': scope('t-test', {
    autoFacts: [...GROUP_FACTS, ...ASSUMPTION_FACTS],
  }),
  anova: scope('anova', {
    autoFacts: [...GROUP_FACTS, ...ASSUMPTION_FACTS, item(
      'post-hoc-method',
      '사후검정 방법',
      'Post hoc method',
      '결과에 저장된 사후검정 방법만 자동 작성합니다.',
      'Only the post hoc method stored in results is stated automatically.',
    )],
    userInputs: POST_HOC_INPUTS,
  }),
  regression: scope('regression', {
    autoFacts: [item(
      'model-family',
      '모형 계열',
      'Model family',
      '선형/로지스틱/포아송 등 실행된 모형 계열은 작성할 수 있습니다.',
      'The executed model family, such as linear, logistic, or Poisson, can be stated.',
    )],
    userInputs: MODEL_INPUTS,
    reviewWhen: [
      'missing-study-purpose',
      'missing-data-description',
      'missing-data-handling',
      'missing-model-rationale',
    ],
  }),
  correlation: scope('correlation', {
    autoFacts: ASSUMPTION_FACTS,
  }),
  'chi-square': scope('chi-square', {
    autoFacts: GROUP_FACTS,
  }),
  nonparametric: scope('nonparametric', {
    autoFacts: GROUP_FACTS,
  }),
  timeseries: scope('timeseries', {
    autoFacts: ASSUMPTION_FACTS,
    userInputs: STUDY_DESIGN_INPUTS,
  }),
  psychometrics: scope('psychometrics', {
    userInputs: STUDY_DESIGN_INPUTS,
  }),
  design: scope('design', {
    blockedWhen: ['validation-errors'],
    reviewWhen: ['missing-study-purpose', 'missing-data-description'],
  }),
  survival: scope('survival', {
    autoFacts: ASSUMPTION_FACTS,
    userInputs: STUDY_DESIGN_INPUTS,
  }),
  multivariate: scope('multivariate', {
    autoFacts: [item(
      'model-family',
      '분석 계열',
      'Analysis family',
      'PCA, 군집, 차원축소 등 실행된 분석 계열은 작성할 수 있습니다.',
      'The executed analysis family, such as PCA, clustering, or dimensionality reduction, can be stated.',
    )],
    userInputs: MODEL_INPUTS,
  }),
  other: scope('other'),
}

function resolveItem<TId extends string>(
  itemToResolve: MethodsScopeItem<TId>,
  language: 'ko' | 'en',
): ResolvedMethodsScopeItem<TId> {
  return {
    id: itemToResolve.id,
    label: itemToResolve.label[language],
    description: itemToResolve.description[language],
  }
}

export function getMethodsAutomationScope(
  methodId: string,
  language: 'ko' | 'en',
): ResolvedMethodsAutomationScope {
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
