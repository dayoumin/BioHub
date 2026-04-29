import { BIO_TOOLS, type BioTool, type BioToolId } from '@/lib/bio-tools/bio-tool-registry'
import {
  BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL,
  SUPPLEMENTARY_ENTITY_WRITER_POLICIES,
  SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS,
  getSupplementaryWriterPromotionQueue,
  getSupplementaryWriterPolicy,
  type BioToolSupplementaryWriterPolicy,
  type SupplementaryWriterStage,
} from './document-writing-supplementary-policy'

export type DocumentWritingChecklistStatus = 'pass' | 'attention'

export interface DocumentWritingChecklistItem {
  id: string
  label: string
  status: DocumentWritingChecklistStatus
  detail: string
}

export interface DocumentWritingChecklistSection {
  id: string
  title: string
  description: string
  items: readonly DocumentWritingChecklistItem[]
}

export interface DocumentWritingChecklistSummary {
  totalItems: number
  passedItems: number
  attentionItems: number
  readyBioToolCount: number
  dedicatedReadyBioToolCount: number
  genericReadyBioToolIds: readonly BioToolId[]
}

export interface DocumentWritingDevelopmentChecklist {
  summary: DocumentWritingChecklistSummary
  sections: readonly DocumentWritingChecklistSection[]
}

type BioToolWriterPolicyMap = Record<BioToolId, Omit<BioToolSupplementaryWriterPolicy, 'toolId'>>

interface BioToolWriterReadinessSummary {
  readyToolIds: readonly BioToolId[]
  dedicatedReadyToolIds: readonly BioToolId[]
  genericReadyToolIds: readonly BioToolId[]
  comingSoonDedicatedToolIds: readonly BioToolId[]
  missingPolicyToolIds: readonly BioToolId[]
  stalePolicyToolIds: readonly BioToolId[]
  duplicateRegistryToolIds: readonly BioToolId[]
}

const STAGE_LABELS: Record<SupplementaryWriterStage, string> = {
  dedicated: '전용',
  next: '다음',
  candidate: '후보',
  'generic-only': '공통 fallback',
}

function uniqueToolIds(values: readonly BioToolId[]): readonly BioToolId[] {
  return Array.from(new Set(values)).sort()
}

function findDuplicateToolIds(values: readonly BioToolId[]): readonly BioToolId[] {
  const seen = new Set<BioToolId>()
  const duplicates = new Set<BioToolId>()

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value)
      return
    }

    seen.add(value)
  })

  return Array.from(duplicates).sort()
}

export function summarizeBioToolWriterReadiness(
  tools: readonly Pick<BioTool, 'id' | 'status'>[],
  policies: Partial<BioToolWriterPolicyMap>,
): BioToolWriterReadinessSummary {
  const toolIds = tools.map((tool) => tool.id)
  const policyIds = Object.keys(policies) as BioToolId[]
  const readyToolIds = tools
    .filter((tool) => tool.status === 'ready')
    .map((tool) => tool.id)

  const dedicatedReadyToolIds = readyToolIds.filter((toolId) => policies[toolId]?.stage === 'dedicated')
  const genericReadyToolIds = readyToolIds.filter((toolId) => policies[toolId]?.stage !== 'dedicated')
  const comingSoonDedicatedToolIds = tools
    .filter((tool) => tool.status === 'coming-soon' && policies[tool.id]?.stage === 'dedicated')
    .map((tool) => tool.id)
  const missingPolicyToolIds = toolIds.filter((toolId) => policies[toolId] === undefined)
  const stalePolicyToolIds = policyIds.filter((toolId) => !toolIds.includes(toolId))
  const duplicateRegistryToolIds = findDuplicateToolIds(toolIds)

  return {
    readyToolIds: uniqueToolIds(readyToolIds),
    dedicatedReadyToolIds: uniqueToolIds(dedicatedReadyToolIds),
    genericReadyToolIds: uniqueToolIds(genericReadyToolIds),
    comingSoonDedicatedToolIds: uniqueToolIds(comingSoonDedicatedToolIds),
    missingPolicyToolIds: uniqueToolIds(missingPolicyToolIds),
    stalePolicyToolIds: uniqueToolIds(stalePolicyToolIds),
    duplicateRegistryToolIds,
  }
}

function createItem(
  id: string,
  label: string,
  passed: boolean,
  passDetail: string,
  attentionDetail: string,
): DocumentWritingChecklistItem {
  return {
    id,
    label,
    status: passed ? 'pass' : 'attention',
    detail: passed ? passDetail : attentionDetail,
  }
}

export function buildDocumentWritingDevelopmentChecklist(): DocumentWritingDevelopmentChecklist {
  const readiness = summarizeBioToolWriterReadiness(
    BIO_TOOLS,
    BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL,
  )
  const registeredToolIds = BIO_TOOLS.map((tool) => tool.id).sort()
  const broadBioToolPolicy = getSupplementaryWriterPolicy('bio-tool-result')
  const promotionQueue = getSupplementaryWriterPromotionQueue()
  const hasCleanBioToolPolicyCoverage = (
    readiness.missingPolicyToolIds.length === 0
    && readiness.stalePolicyToolIds.length === 0
    && readiness.duplicateRegistryToolIds.length === 0
  )

  const sections: readonly DocumentWritingChecklistSection[] = [
    {
      id: 'bio-tools',
      title: 'Bio-Tools writer sync',
      description: '도구 추가/삭제 시 registry, writer policy, fallback 경계를 같이 확인합니다.',
      items: [
        createItem(
          'bio-tool-policy-coverage',
          '모든 Bio-Tool이 writer policy에 분류됨',
          hasCleanBioToolPolicyCoverage,
          `${registeredToolIds.length}개 Bio-Tool 모두 분류됨`,
          [
            readiness.missingPolicyToolIds.length > 0
              ? `policy 누락: ${readiness.missingPolicyToolIds.join(', ')}`
              : null,
            readiness.stalePolicyToolIds.length > 0
              ? `registry에 없는 policy: ${readiness.stalePolicyToolIds.join(', ')}`
              : null,
            readiness.duplicateRegistryToolIds.length > 0
              ? `중복 registry ID: ${readiness.duplicateRegistryToolIds.join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || 'Bio-Tool registry와 writer policy가 불일치함',
        ),
        createItem(
          'ready-bio-tool-dedicated-writers',
          'ready Bio-Tool은 전용 writer가 필요함',
          readiness.genericReadyToolIds.length === 0,
          `ready ${readiness.readyToolIds.length}개 중 ${readiness.dedicatedReadyToolIds.length}개가 전용 writer로 승격됨`,
          `ready인데 전용 writer가 아닌 도구: ${readiness.genericReadyToolIds.join(', ')}`,
        ),
        createItem(
          'coming-soon-conservative',
          'coming-soon Bio-Tool은 전용 writer로 과잉 승격하지 않음',
          readiness.comingSoonDedicatedToolIds.length === 0,
          '구현 전 도구는 generic-only/candidate로 보수적으로 유지됨',
          `coming-soon인데 전용 writer인 도구: ${readiness.comingSoonDedicatedToolIds.join(', ')}`,
        ),
        createItem(
          'broad-bio-tool-fallback',
          'bio-tool-result broad fallback은 generic-only 유지',
          broadBioToolPolicy?.stage === 'generic-only',
          '도구별 타입 가드가 없는 결과는 공통 fallback만 사용함',
          `현재 stage: ${broadBioToolPolicy?.stage ? STAGE_LABELS[broadBioToolPolicy.stage] : '없음'}`,
        ),
      ],
    },
    {
      id: 'source-contracts',
      title: 'Source-backed writing',
      description: '자동 문장은 source-backed 수치와 검증된 라벨만 사용하도록 유지합니다.',
      items: [
        createItem(
          'generic-fallback-constraints',
          '공통 fallback 금지 범위가 문서화됨',
          SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS.length >= 4,
          `${SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS.length}개 fallback 제약 유지`,
          'fallback 제약이 부족함',
        ),
        createItem(
          'genetics-promotion-queue',
          '유전/서열 supplementary writer 승격 queue가 비어 있음',
          promotionQueue.length === 0,
          `${SUPPLEMENTARY_ENTITY_WRITER_POLICIES.length}개 entity policy 검토 완료`,
          `승격 대기 entity: ${promotionQueue.map((policy) => policy.entityKind).join(', ')}`,
        ),
      ],
    },
  ]

  const items = sections.flatMap((section) => section.items)
  const passedItems = items.filter((item) => item.status === 'pass').length

  return {
    summary: {
      totalItems: items.length,
      passedItems,
      attentionItems: items.length - passedItems,
      readyBioToolCount: readiness.readyToolIds.length,
      dedicatedReadyBioToolCount: readiness.dedicatedReadyToolIds.length,
      genericReadyBioToolIds: readiness.genericReadyToolIds,
    },
    sections,
  }
}
