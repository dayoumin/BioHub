import type { StudySchema } from './study-schema'
import {
  getCaptionsAutomationScope,
  type CaptionsGateRuleId,
  type ResolvedCaptionsAutomationScope,
} from './captions-scope'

export type CaptionsReadinessStatus = 'ready' | 'needs-review' | 'blocked'

export type CaptionsChecklistItemStatus =
  | 'complete'
  | 'needs-input'
  | 'warning'
  | 'blocked'

export type CaptionsChecklistItemId =
  | 'source-provenance'
  | 'caption-source'
  | 'variable-metadata'
  | 'caption-message'
  | 'panel-description'

export interface BuildCaptionsDraftReadinessParams {
  tableCount: number
  figureCount: number
  hasFigureSource: boolean
  hasPanelSource?: boolean
}

export interface CaptionsChecklistItem {
  id: CaptionsChecklistItemId
  section: 'captions'
  label: string
  status: CaptionsChecklistItemStatus
  message: string
  gateRule?: CaptionsGateRuleId
  evidence?: string
  action?: string
}

export interface CaptionsDraftReadiness {
  status: CaptionsReadinessStatus
  title: string
  summary: string
  canGenerateDraft: boolean
  shouldReviewBeforeInsert: boolean
  blockingCount: number
  warningCount: number
  blockingGateRules: CaptionsGateRuleId[]
  reviewGateRules: CaptionsGateRuleId[]
  checklist: CaptionsChecklistItem[]
  scope: ResolvedCaptionsAutomationScope
}

function text(language: 'ko' | 'en', ko: string, en: string): string {
  return language === 'ko' ? ko : en
}

function buildSourceProvenanceItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): CaptionsChecklistItem {
  const hasSource = Boolean(schema.source.sourceFingerprint)

  return {
    id: 'source-provenance',
    section: 'captions',
    label: text(language, 'source provenance', 'Source provenance'),
    status: hasSource ? 'complete' : 'blocked',
    message: hasSource
      ? text(language, '분석 source fingerprint가 보존되어 있습니다.', 'The analysis source fingerprint is available.')
      : text(language, 'source provenance가 없어 caption을 안전하게 생성할 수 없습니다.', 'Captions cannot be generated safely without source provenance.'),
    gateRule: hasSource ? undefined : 'missing-source-provenance',
    evidence: hasSource ? schema.source.sourceFingerprint : undefined,
  }
}

function buildCaptionSourceItem(
  params: BuildCaptionsDraftReadinessParams,
  language: 'ko' | 'en',
): CaptionsChecklistItem {
  const hasTable = params.tableCount > 0
  const hasFigure = params.figureCount > 0 && params.hasFigureSource
  const hasCaptionSource = hasTable || hasFigure

  return {
    id: 'caption-source',
    section: 'captions',
    label: text(language, 'caption source', 'Caption source'),
    status: hasCaptionSource ? 'complete' : 'blocked',
    message: hasCaptionSource
      ? text(language, '생성된 표 또는 source-linked figure가 있습니다.', 'Generated tables or source-linked figures are available.')
      : text(language, 'caption을 만들 표/그림 source가 없습니다.', 'No table or figure source is available for captions.'),
    gateRule: hasCaptionSource ? undefined : 'missing-caption-source',
    evidence: text(language, `표 ${params.tableCount}개, 그림 ${params.figureCount}개`, `${params.tableCount} tables, ${params.figureCount} figures`),
  }
}

function buildVariableMetadataItem(
  schema: StudySchema,
  language: 'ko' | 'en',
): CaptionsChecklistItem {
  const hasMetadata = schema.variables.length > 0

  return {
    id: 'variable-metadata',
    section: 'captions',
    label: text(language, '변수 metadata', 'Variable metadata'),
    status: hasMetadata ? 'complete' : 'warning',
    message: hasMetadata
      ? text(language, '변수 라벨과 단위를 caption에 사용할 수 있습니다.', 'Variable labels and units can be used in captions.')
      : text(language, '변수 라벨/단위가 부족해 caption이 일반 문장으로 축약됩니다.', 'Captions will be generic because variable labels or units are limited.'),
    gateRule: hasMetadata ? undefined : 'missing-variable-metadata',
    evidence: hasMetadata ? `${schema.variables.length}` : undefined,
  }
}

function buildCaptionMessageItem(
  params: BuildCaptionsDraftReadinessParams,
  language: 'ko' | 'en',
): CaptionsChecklistItem {
  const hasFigureCaption = params.figureCount > 0

  return {
    id: 'caption-message',
    section: 'captions',
    label: text(language, '핵심 메시지', 'Caption message'),
    status: hasFigureCaption ? 'warning' : 'complete',
    message: hasFigureCaption
      ? text(language, '그래프 유형 기반 caption은 가능하지만 핵심 메시지는 사용자 확인이 필요합니다.', 'Chart-type captions are possible, but the key message requires user confirmation.')
      : text(language, 'figure caption 핵심 메시지 확인이 필요한 항목이 없습니다.', 'No figure caption message requires confirmation.'),
    gateRule: hasFigureCaption ? 'missing-caption-message' : undefined,
    action: hasFigureCaption
      ? text(language, 'figure가 강조할 핵심 결과를 사용자가 확인하세요.', 'Confirm the key result the figure should emphasize.')
      : undefined,
  }
}

function buildPanelDescriptionItem(
  params: BuildCaptionsDraftReadinessParams,
  language: 'ko' | 'en',
): CaptionsChecklistItem {
  const needsPanelReview = params.figureCount > 0 && !params.hasPanelSource

  return {
    id: 'panel-description',
    section: 'captions',
    label: text(language, 'panel 설명', 'Panel description'),
    status: needsPanelReview ? 'warning' : 'complete',
    message: needsPanelReview
      ? text(language, 'panel source가 없어 A/B/C 같은 panel 설명은 자동 생성하지 않습니다.', 'Panel source is absent, so A/B/C-style panel descriptions are not generated.')
      : text(language, 'panel 설명 관련 추가 확인이 필요하지 않습니다.', 'No additional panel-description review is required.'),
    gateRule: needsPanelReview ? 'missing-panel-description' : undefined,
  }
}

function collectActiveGateRules(
  checklist: CaptionsChecklistItem[],
  candidateRules: CaptionsGateRuleId[],
  statuses: CaptionsChecklistItemStatus[],
): CaptionsGateRuleId[] {
  const activeRules = new Set<CaptionsGateRuleId>()

  for (const item of checklist) {
    if (!item.gateRule || !statuses.includes(item.status)) continue
    if (candidateRules.includes(item.gateRule)) {
      activeRules.add(item.gateRule)
    }
  }

  return Array.from(activeRules)
}

export function buildCaptionsDraftReadiness(
  schema: StudySchema,
  params: BuildCaptionsDraftReadinessParams,
  language: 'ko' | 'en' = schema.language,
): CaptionsDraftReadiness {
  const scope = getCaptionsAutomationScope(language)
  const checklist = [
    buildSourceProvenanceItem(schema, language),
    buildCaptionSourceItem(params, language),
    buildVariableMetadataItem(schema, language),
    buildCaptionMessageItem(params, language),
    buildPanelDescriptionItem(params, language),
  ]
  const blockingGateRules = collectActiveGateRules(checklist, scope.blockedWhen, ['blocked', 'warning', 'needs-input'])
  const reviewGateRules = collectActiveGateRules(checklist, scope.reviewWhen, ['blocked', 'warning', 'needs-input'])
    .filter((gateRule) => !blockingGateRules.includes(gateRule))
  const blockingCount = blockingGateRules.length
  const warningCount = reviewGateRules.length
  const status: CaptionsReadinessStatus = blockingCount > 0
    ? 'blocked'
    : warningCount > 0
      ? 'needs-review'
      : 'ready'

  return {
    status,
    title: status === 'ready'
      ? text(language, 'Caption 초안 작성 가능', 'Caption draft ready')
      : status === 'blocked'
        ? text(language, 'Caption 작성 전 source 필요', 'Caption source required')
        : text(language, 'Caption 초안 작성 가능, 검토 필요', 'Caption draft available, review needed'),
    summary: status === 'ready'
      ? text(language, '현재 표/그림 source와 metadata로 caption 초안을 만들 수 있습니다.', 'Current table/figure sources and metadata are sufficient for caption drafting.')
      : status === 'blocked'
        ? text(language, 'source가 없어 caption을 생성하지 않는 것이 안전합니다.', 'Caption generation should be blocked because source data is missing.')
        : text(language, '초안은 만들 수 있지만 figure 메시지나 panel 설명은 사용자 확인이 필요합니다.', 'A draft can be produced, but figure message or panel description requires user review.'),
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
