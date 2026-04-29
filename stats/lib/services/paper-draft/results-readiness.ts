import type { StudySchema } from './study-schema'
import {
  getResultsAutomationScope,
  type ResolvedResultsAutomationScope,
  type ResultsGateRuleId,
} from './results-scope'

export type ResultsReadinessStatus = 'ready' | 'needs-review' | 'blocked'

export type ResultsChecklistItemStatus =
  | 'complete'
  | 'needs-input'
  | 'warning'
  | 'blocked'

export type ResultsChecklistItemId =
  | 'core-statistic'
  | 'p-value'
  | 'source-provenance'
  | 'effect-size'
  | 'confidence-interval'
  | 'group-statistics'
  | 'post-hoc-method'
  | 'model-fit'

export interface ResultsChecklistItem {
  id: ResultsChecklistItemId
  section: 'results'
  label: string
  status: ResultsChecklistItemStatus
  message: string
  gateRule?: ResultsGateRuleId
  evidence?: string
  action?: string
}

export interface ResultsDraftReadiness {
  status: ResultsReadinessStatus
  title: string
  summary: string
  canGenerateDraft: boolean
  shouldReviewBeforeInsert: boolean
  blockingCount: number
  warningCount: number
  blockingGateRules: ResultsGateRuleId[]
  reviewGateRules: ResultsGateRuleId[]
  checklist: ResultsChecklistItem[]
  scope: ResolvedResultsAutomationScope
}

function text(language: 'ko' | 'en', ko: string, en: string): string {
  return language === 'ko' ? ko : en
}

function hasDefinedNumber(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function buildCoreStatisticItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const hasStatistic = hasDefinedNumber(schema.analysis.statistic)

  return {
    id: 'core-statistic',
    section: 'results',
    label: text(language, '핵심 통계량', 'Core statistic'),
    status: hasStatistic ? 'complete' : 'blocked',
    message: hasStatistic
      ? text(language, '검정 통계량을 Results에 작성할 수 있습니다.', 'The test statistic can be stated in Results.')
      : text(language, '검정 통계량이 없어 Results 초안을 생성할 수 없습니다.', 'Results cannot be drafted without the test statistic.'),
    gateRule: hasStatistic ? undefined : 'missing-core-statistic',
    evidence: hasStatistic ? String(schema.analysis.statistic) : undefined,
  }
}

function buildPValueItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const hasPValue = hasDefinedNumber(schema.analysis.pValue)

  return {
    id: 'p-value',
    section: 'results',
    label: 'p-value',
    status: hasPValue ? 'complete' : 'blocked',
    message: hasPValue
      ? text(language, 'p-value 기준으로 유의성 문장을 작성할 수 있습니다.', 'Significance wording can be aligned with the p-value.')
      : text(language, 'p-value가 없어 유의성 문장을 안전하게 작성할 수 없습니다.', 'Significance wording cannot be drafted safely without a p-value.'),
    gateRule: hasPValue ? undefined : 'missing-p-value',
    evidence: hasPValue ? String(schema.analysis.pValue) : undefined,
  }
}

function buildSourceProvenanceItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const hasSource = Boolean(schema.source.sourceFingerprint)

  return {
    id: 'source-provenance',
    section: 'results',
    label: text(language, '결과 source', 'Result source'),
    status: hasSource ? 'complete' : 'blocked',
    message: hasSource
      ? text(language, '결과 source fingerprint가 보존되어 있습니다.', 'The result source fingerprint is available.')
      : text(language, '결과 source가 없어 자동 초안의 기준을 고정할 수 없습니다.', 'Automatic drafting cannot be anchored without result source provenance.'),
    gateRule: hasSource ? undefined : 'missing-source-provenance',
    evidence: hasSource ? schema.source.sourceFingerprint : undefined,
  }
}

function buildEffectSizeItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const effectSize = schema.analysis.effectSize ?? schema.analysis.omegaSquared
  const hasEffectSize = typeof effectSize?.value === 'number' && Number.isFinite(effectSize.value)

  return {
    id: 'effect-size',
    section: 'results',
    label: text(language, '효과크기', 'Effect size'),
    status: hasEffectSize ? 'complete' : 'warning',
    message: hasEffectSize
      ? text(language, '효과크기를 Results에 포함할 수 있습니다.', 'Effect size can be included in Results.')
      : text(language, '효과크기가 없어 결과 문장이 축약됩니다.', 'Results wording will be abbreviated because effect size is missing.'),
    gateRule: hasEffectSize ? undefined : 'missing-effect-size',
    evidence: hasEffectSize ? String(effectSize.value) : undefined,
  }
}

function buildConfidenceIntervalItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const ci = schema.analysis.confidenceInterval
  const hasCi = hasDefinedNumber(ci?.lower) && hasDefinedNumber(ci?.upper)

  return {
    id: 'confidence-interval',
    section: 'results',
    label: text(language, '신뢰구간', 'Confidence interval'),
    status: hasCi ? 'complete' : 'warning',
    message: hasCi
      ? text(language, '신뢰구간을 Results에 포함할 수 있습니다.', 'Confidence interval can be included in Results.')
      : text(language, '신뢰구간이 없어 결과 문장이 축약됩니다.', 'Results wording will be abbreviated because the confidence interval is missing.'),
    gateRule: hasCi ? undefined : 'missing-confidence-interval',
    evidence: hasCi ? `${ci?.lower}, ${ci?.upper}` : undefined,
  }
}

function buildGroupStatisticsItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const hasGroupStatistics = schema.analysis.groupStatCount > 0

  return {
    id: 'group-statistics',
    section: 'results',
    label: text(language, '집단별 기술통계', 'Group statistics'),
    status: hasGroupStatistics ? 'complete' : 'warning',
    message: hasGroupStatistics
      ? text(language, '집단별 기술통계로 비교 문장을 보강할 수 있습니다.', 'Group statistics can enrich comparison wording.')
      : text(language, '집단별 기술통계가 없어 비교 문장이 축약됩니다.', 'Comparison wording will be abbreviated because group statistics are missing.'),
    gateRule: hasGroupStatistics ? undefined : 'missing-group-statistics',
    evidence: hasGroupStatistics ? `${schema.analysis.groupStatCount}` : undefined,
  }
}

function buildPostHocMethodItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  if (schema.analysis.postHocCount === 0) {
    return {
      id: 'post-hoc-method',
      section: 'results',
      label: text(language, '사후검정 보정', 'Post hoc correction'),
      status: 'complete',
      message: text(language, '사후검정 결과가 없어 보정 방법 입력이 필요하지 않습니다.', 'No post hoc results require correction wording.'),
    }
  }

  const hasMethod = Boolean(schema.analysis.postHocMethod)
  return {
    id: 'post-hoc-method',
    section: 'results',
    label: text(language, '사후검정 보정', 'Post hoc correction'),
    status: hasMethod ? 'complete' : 'warning',
    message: hasMethod
      ? text(language, '사후검정 보정 방법을 Results에 포함할 수 있습니다.', 'Post hoc correction method can be included in Results.')
      : text(language, '사후검정 결과는 있지만 보정 방법명은 결과에서 확인되지 않았습니다.', 'Post hoc results exist, but the correction method is not present in the result.'),
    gateRule: hasMethod ? undefined : 'missing-post-hoc-method',
    evidence: schema.analysis.postHocMethod,
  }
}

function buildModelFitItem(schema: StudySchema, language: 'ko' | 'en'): ResultsChecklistItem {
  const hasModelEvidence = schema.analysis.options.some((option) =>
    ['rSquared', 'adjustedRSquared', 'adjRSquared', 'aic', 'bic'].includes(option.key)
  )

  return {
    id: 'model-fit',
    section: 'results',
    label: text(language, '모형 결과', 'Model result'),
    status: hasModelEvidence ? 'complete' : 'warning',
    message: hasModelEvidence
      ? text(language, '계수 또는 모형 적합 지표를 Results에 사용할 수 있습니다.', 'Coefficients or model-fit metrics can be used in Results.')
      : text(language, '모형 계수/적합 지표가 부족해 결과 문장이 축약됩니다.', 'Results wording will be abbreviated because model coefficients or fit metrics are limited.'),
    gateRule: hasModelEvidence ? undefined : 'missing-model-fit',
  }
}

function collectActiveGateRules(
  checklist: ResultsChecklistItem[],
  candidateRules: ResultsGateRuleId[],
  statuses: ResultsChecklistItemStatus[],
): ResultsGateRuleId[] {
  const activeRules = new Set<ResultsGateRuleId>()

  for (const item of checklist) {
    if (!item.gateRule || !statuses.includes(item.status)) continue
    if (candidateRules.includes(item.gateRule)) {
      activeRules.add(item.gateRule)
    }
  }

  return Array.from(activeRules)
}

export function buildResultsDraftReadiness(
  schema: StudySchema,
  language: 'ko' | 'en' = schema.language,
): ResultsDraftReadiness {
  const scope = getResultsAutomationScope(schema.analysis.methodId, language)
  const rawChecklist = [
    buildCoreStatisticItem(schema, language),
    buildPValueItem(schema, language),
    buildSourceProvenanceItem(schema, language),
    buildEffectSizeItem(schema, language),
    buildConfidenceIntervalItem(schema, language),
    buildGroupStatisticsItem(schema, language),
    buildPostHocMethodItem(schema, language),
    buildModelFitItem(schema, language),
  ]
  const scopedGateRules = [...scope.blockedWhen, ...scope.reviewWhen]
  const checklist = rawChecklist.filter((item) => (
    !item.gateRule
    || item.status === 'complete'
    || scopedGateRules.includes(item.gateRule)
  ))
  const blockingGateRules = collectActiveGateRules(checklist, scope.blockedWhen, ['blocked', 'warning', 'needs-input'])
  const reviewGateRules = collectActiveGateRules(checklist, scope.reviewWhen, ['blocked', 'warning', 'needs-input'])
    .filter((gateRule) => !blockingGateRules.includes(gateRule))
  const blockingCount = blockingGateRules.length
  const warningCount = reviewGateRules.length
  const status: ResultsReadinessStatus = blockingCount > 0
    ? 'blocked'
    : warningCount > 0
      ? 'needs-review'
      : 'ready'

  return {
    status,
    title: status === 'ready'
      ? text(language, 'Results 초안 작성 가능', 'Results draft ready')
      : status === 'blocked'
        ? text(language, 'Results 작성 전 필수 보완 필요', 'Required Results data missing')
        : text(language, 'Results 초안 작성 가능, 검토 필요', 'Results draft available, review needed'),
    summary: status === 'ready'
      ? text(language, '현재 결과 수치로 Results 초안을 만들 수 있습니다.', 'Current result statistics are sufficient to draft Results.')
      : status === 'blocked'
        ? text(language, '핵심 통계 수치가 없어 자동 Results 초안을 생성하지 않는 것이 안전합니다.', 'Core statistics are missing; automatic Results drafting should be blocked.')
        : text(language, '초안은 만들 수 있지만 effect size, CI 또는 보조 결과가 부족할 수 있습니다.', 'A draft can be produced, but effect size, CI, or supporting results may be incomplete.'),
    canGenerateDraft: blockingCount === 0,
    shouldReviewBeforeInsert: warningCount > 0,
    blockingCount,
    warningCount,
    blockingGateRules,
    reviewGateRules,
    checklist,
    scope,
  }
}
