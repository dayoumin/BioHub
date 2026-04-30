import { BIO_TOOLS, type BioTool, type BioToolId } from '@/lib/bio-tools/bio-tool-registry'
import {
  BIO_TOOL_RESULT_CONTRACT_FIXTURES,
  type BioToolResultContractFixture,
} from '@/lib/bio-tools/bio-tool-result-contract-fixtures'
import { getAllMethods, type StatisticalMethodEntry } from '@/lib/constants/statistical-methods'
import {
  STATISTICAL_METHOD_REQUIREMENTS,
  type VariableRole,
} from '@/lib/statistics/variable-requirements'
import type { ProjectEntityKind } from '@biohub/types'
import type { StudySchemaVariableRole } from '@/lib/services/paper-draft/study-schema'
import type { StatisticalMethodCategory } from '@/types/analysis'
import {
  BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL,
  SUPPLEMENTARY_ENTITY_WRITER_POLICIES,
  SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS,
  getSupplementaryWriterPromotionQueue,
  getSupplementaryWriterPolicy,
  type BioToolSupplementaryWriterPolicy,
  type SupplementaryWriterStage,
} from './document-writing-supplementary-policy'
import { DOCUMENT_WRITING_ENTITY_KINDS } from './document-writing-session'
import {
  DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS,
  DOCUMENT_WRITING_SOURCE_REGISTRY_ENTITY_KINDS,
  isDedicatedBioToolWritingSourceResult,
} from './document-writing-source-registry'
import {
  ENTITY_RESOLVER_GENERIC_ONLY_KINDS,
  ENTITY_RESOLVER_SUPPORTED_KINDS,
} from './entity-resolver'
import { ENTITY_TAB_REGISTRY } from './entity-tab-registry'
import { getMethodsAutomationScope } from '@/lib/services/paper-draft/methods-scope'
import { getResultsAutomationScope } from '@/lib/services/paper-draft/results-scope'

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
  statisticalMethodCount: number
  trackedVariableRequirementOnlyCount: number
  projectEntityKindCount: number
  bioToolResultContractFixtureCount: number
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
  dedicatedPolicyToolIdsMissingSourceRegistry: readonly BioToolId[]
  dedicatedSourceRegistryToolIdsMissingPolicy: readonly BioToolId[]
}

interface StatisticalMethodSyncSummary {
  methodIds: readonly string[]
  missingRequirementMethodIds: readonly string[]
  untrackedRequirementOnlyIds: readonly string[]
  trackedRequirementOnlyIds: readonly string[]
  mismatchedMethodsScopeMethodIds: readonly string[]
  mismatchedResultsScopeMethodIds: readonly string[]
  unmappedVariableRequirementRoles: readonly VariableRole[]
}

interface ProjectEntitySyncSummary {
  knownEntityKinds: readonly ProjectEntityKind[]
  missingTabEntityKinds: readonly ProjectEntityKind[]
  duplicateTabEntityKinds: readonly ProjectEntityKind[]
  documentWritingKindsMissingResolver: readonly ProjectEntityKind[]
  documentWritingKindsMissingTab: readonly ProjectEntityKind[]
  documentWritingKindsMissingSourceRegistry: readonly ProjectEntityKind[]
}

interface StatisticalScopeCategoryResolvers {
  methods: (methodId: string) => StatisticalMethodCategory
  results: (methodId: string) => StatisticalMethodCategory
}

interface BioToolResultShapeContractSummary {
  fixtureToolIds: readonly BioToolId[]
  missingFixtureToolIds: readonly BioToolId[]
  staleFixtureToolIds: readonly BioToolId[]
  duplicateFixtureToolIds: readonly BioToolId[]
  invalidFixtureToolIds: readonly BioToolId[]
  disallowedResultKeyPaths: readonly string[]
}

const STAGE_LABELS: Record<SupplementaryWriterStage, string> = {
  dedicated: '전용',
  next: '다음',
  candidate: '후보',
  'generic-only': '공통 fallback',
}

const TRACKED_VARIABLE_REQUIREMENT_ONLY_IDS = [
  'binary-logistic',
  'cross-tabulation',
  'curve-estimation',
  'durbin-watson-test',
  'fisher-exact',
  'frequency-table',
  'kendall-correlation',
  'multinomial-logistic',
  'multiple-regression',
  'negative-binomial-regression',
  'nonlinear-regression',
  'probit-regression',
  'spearman-correlation',
  'three-way-anova',
] as const

const VARIABLE_REQUIREMENT_ROLE_TO_STUDY_SCHEMA_ROLE: Record<VariableRole, StudySchemaVariableRole> = {
  dependent: 'dependent',
  independent: 'independent',
  factor: 'group',
  covariate: 'covariate',
  blocking: 'blocking',
  within: 'within',
  between: 'between',
  time: 'time',
  event: 'event',
  censoring: 'censoring',
  weight: 'weight',
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

function findDuplicateStrings(values: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value)
      return
    }

    seen.add(value)
  })

  return Array.from(duplicates).sort()
}

function sortStrings(values: readonly string[]): readonly string[] {
  return [...values].sort()
}

function collectDisallowedResultKeyPaths(value: unknown, path: string, seen: WeakSet<object>): string[] {
  if (typeof value !== 'object' || value === null) {
    return []
  }

  if (seen.has(value)) {
    return []
  }
  seen.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectDisallowedResultKeyPaths(item, `${path}[${index}]`, seen))
  }

  if (path === 'condition-factor.groupStats' || path === 'survival.curves') {
    return Object.values(value).flatMap((child) => collectDisallowedResultKeyPaths(child, `${path}.*`, seen))
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const keyPath = `${path}.${key}`
    const keyProblems = /[_\-\s]/.test(key) ? [keyPath] : []
    return [
      ...keyProblems,
      ...collectDisallowedResultKeyPaths(child, keyPath, seen),
    ]
  })
}

export function summarizeBioToolResultShapeContracts(
  dedicatedToolIds: readonly BioToolId[] = DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS,
  fixtures: readonly BioToolResultContractFixture[] = BIO_TOOL_RESULT_CONTRACT_FIXTURES,
): BioToolResultShapeContractSummary {
  const fixtureToolIds = fixtures.map((fixture) => fixture.toolId)
  const fixtureToolIdSet = new Set(fixtureToolIds)
  const dedicatedToolIdSet = new Set(dedicatedToolIds)
  const invalidFixtureToolIds = fixtures
    .filter((fixture) => !isDedicatedBioToolWritingSourceResult(fixture.toolId, fixture.results))
    .map((fixture) => fixture.toolId)
  const disallowedResultKeyPaths = fixtures.flatMap((fixture) => (
    collectDisallowedResultKeyPaths(fixture.results, fixture.toolId, new WeakSet<object>())
  ))

  return {
    fixtureToolIds: uniqueToolIds(fixtureToolIds),
    missingFixtureToolIds: uniqueToolIds(dedicatedToolIds.filter((toolId) => !fixtureToolIdSet.has(toolId))),
    staleFixtureToolIds: uniqueToolIds(fixtureToolIds.filter((toolId) => !dedicatedToolIdSet.has(toolId))),
    duplicateFixtureToolIds: findDuplicateToolIds(fixtureToolIds),
    invalidFixtureToolIds: uniqueToolIds(invalidFixtureToolIds),
    disallowedResultKeyPaths: sortStrings(disallowedResultKeyPaths),
  }
}

export function summarizeBioToolWriterReadiness(
  tools: readonly Pick<BioTool, 'id' | 'status'>[],
  policies: Partial<BioToolWriterPolicyMap>,
  sourceRegistryDedicatedToolIds: readonly BioToolId[] = DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS,
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
  const dedicatedPolicyToolIds = policyIds.filter((toolId) => policies[toolId]?.stage === 'dedicated')
  const sourceRegistryDedicatedToolIdSet = new Set(sourceRegistryDedicatedToolIds)
  const dedicatedPolicyToolIdSet = new Set(dedicatedPolicyToolIds)
  const dedicatedPolicyToolIdsMissingSourceRegistry = dedicatedPolicyToolIds.filter((toolId) => (
    !sourceRegistryDedicatedToolIdSet.has(toolId)
  ))
  const dedicatedSourceRegistryToolIdsMissingPolicy = sourceRegistryDedicatedToolIds.filter((toolId) => (
    !dedicatedPolicyToolIdSet.has(toolId)
  ))

  return {
    readyToolIds: uniqueToolIds(readyToolIds),
    dedicatedReadyToolIds: uniqueToolIds(dedicatedReadyToolIds),
    genericReadyToolIds: uniqueToolIds(genericReadyToolIds),
    comingSoonDedicatedToolIds: uniqueToolIds(comingSoonDedicatedToolIds),
    missingPolicyToolIds: uniqueToolIds(missingPolicyToolIds),
    stalePolicyToolIds: uniqueToolIds(stalePolicyToolIds),
    duplicateRegistryToolIds,
    dedicatedPolicyToolIdsMissingSourceRegistry: uniqueToolIds(dedicatedPolicyToolIdsMissingSourceRegistry),
    dedicatedSourceRegistryToolIdsMissingPolicy: uniqueToolIds(dedicatedSourceRegistryToolIdsMissingPolicy),
  }
}

export function summarizeStatisticalMethodSync(
  methods: readonly Pick<StatisticalMethodEntry, 'id' | 'category'>[],
  requirements: readonly { id: string; variables: readonly { role: VariableRole }[] }[],
  trackedRequirementOnlyIds: readonly string[] = TRACKED_VARIABLE_REQUIREMENT_ONLY_IDS,
  scopeCategoryResolvers: StatisticalScopeCategoryResolvers = {
    methods: (methodId) => getMethodsAutomationScope(methodId, 'ko').category,
    results: (methodId) => getResultsAutomationScope(methodId, 'ko').category,
  },
): StatisticalMethodSyncSummary {
  const methodIds = methods.map((method) => method.id)
  const methodIdSet = new Set(methodIds)
  const requirementIds = requirements.map((requirement) => requirement.id)
  const requirementIdSet = new Set(requirementIds)
  const trackedRequirementOnlyIdSet = new Set(trackedRequirementOnlyIds)

  const missingRequirementMethodIds = methodIds.filter((methodId) => !requirementIdSet.has(methodId))
  const untrackedRequirementOnlyIds = requirementIds.filter((requirementId) => (
    !methodIdSet.has(requirementId)
    && !trackedRequirementOnlyIdSet.has(requirementId)
  ))
  const trackedRequirementOnlyIdsPresent = requirementIds.filter((requirementId) => (
    !methodIdSet.has(requirementId)
    && trackedRequirementOnlyIdSet.has(requirementId)
  ))

  const mismatchedMethodsScopeMethodIds = methods.filter((method) => (
    scopeCategoryResolvers.methods(method.id) !== method.category
  )).map((method) => method.id)
  const mismatchedResultsScopeMethodIds = methods.filter((method) => (
    scopeCategoryResolvers.results(method.id) !== method.category
  )).map((method) => method.id)
  const variableRequirementRoles = Array.from(new Set(
    requirements.flatMap((requirement) => requirement.variables.map((variable) => variable.role)),
  ))
  const unmappedVariableRequirementRoles = variableRequirementRoles.filter((role) => (
    VARIABLE_REQUIREMENT_ROLE_TO_STUDY_SCHEMA_ROLE[role] === undefined
  ))

  return {
    methodIds: sortStrings(methodIds),
    missingRequirementMethodIds: sortStrings(missingRequirementMethodIds),
    untrackedRequirementOnlyIds: sortStrings(untrackedRequirementOnlyIds),
    trackedRequirementOnlyIds: sortStrings(trackedRequirementOnlyIdsPresent),
    mismatchedMethodsScopeMethodIds: sortStrings(mismatchedMethodsScopeMethodIds),
    mismatchedResultsScopeMethodIds: sortStrings(mismatchedResultsScopeMethodIds),
    unmappedVariableRequirementRoles: sortStrings(unmappedVariableRequirementRoles) as VariableRole[],
  }
}

export function summarizeProjectEntitySync(
  tabEntityKinds: readonly ProjectEntityKind[],
  resolverSupportedKinds: readonly ProjectEntityKind[] = ENTITY_RESOLVER_SUPPORTED_KINDS,
  resolverGenericOnlyKinds: readonly ProjectEntityKind[] = ENTITY_RESOLVER_GENERIC_ONLY_KINDS,
  documentWritingKinds: readonly ProjectEntityKind[] = DOCUMENT_WRITING_ENTITY_KINDS,
  sourceRegistryKinds: readonly ProjectEntityKind[] = DOCUMENT_WRITING_SOURCE_REGISTRY_ENTITY_KINDS,
): ProjectEntitySyncSummary {
  const knownEntityKinds = sortStrings([...resolverSupportedKinds, ...resolverGenericOnlyKinds]) as ProjectEntityKind[]
  const tabKindSet = new Set(tabEntityKinds)
  const resolverKnownKindSet = new Set<ProjectEntityKind>(knownEntityKinds)
  const sourceRegistryKindSet = new Set<ProjectEntityKind>(sourceRegistryKinds)

  return {
    knownEntityKinds,
    missingTabEntityKinds: knownEntityKinds.filter((kind) => !tabKindSet.has(kind)),
    duplicateTabEntityKinds: findDuplicateStrings(tabEntityKinds) as ProjectEntityKind[],
    documentWritingKindsMissingResolver: documentWritingKinds.filter((kind) => !resolverKnownKindSet.has(kind)),
    documentWritingKindsMissingTab: documentWritingKinds.filter((kind) => !tabKindSet.has(kind)),
    documentWritingKindsMissingSourceRegistry: documentWritingKinds.filter((kind) => !sourceRegistryKindSet.has(kind)),
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
  const statisticalSync = summarizeStatisticalMethodSync(
    getAllMethods(),
    STATISTICAL_METHOD_REQUIREMENTS,
  )
  const entitySync = summarizeProjectEntitySync(
    ENTITY_TAB_REGISTRY.map((entry) => entry.id),
  )
  const resultShapeContracts = summarizeBioToolResultShapeContracts()
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
          'ready Bio-Tool은 전용 writer와 source registry 경로가 필요함',
          readiness.genericReadyToolIds.length === 0
            && readiness.dedicatedPolicyToolIdsMissingSourceRegistry.length === 0
            && readiness.dedicatedSourceRegistryToolIdsMissingPolicy.length === 0,
          `ready ${readiness.readyToolIds.length}개 중 ${readiness.dedicatedReadyToolIds.length}개가 전용 writer로 승격됨`,
          [
            readiness.genericReadyToolIds.length > 0
              ? `ready인데 전용 writer가 아닌 도구: ${readiness.genericReadyToolIds.join(', ')}`
              : null,
            readiness.dedicatedPolicyToolIdsMissingSourceRegistry.length > 0
              ? `source registry 누락: ${readiness.dedicatedPolicyToolIdsMissingSourceRegistry.join(', ')}`
              : null,
            readiness.dedicatedSourceRegistryToolIdsMissingPolicy.length > 0
              ? `policy 누락: ${readiness.dedicatedSourceRegistryToolIdsMissingPolicy.join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || 'Bio-Tool dedicated writer 연결 누락',
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
        createItem(
          'bio-tool-result-shape-contracts',
          'Bio-Tools 결과 fixture가 전용 writer guard를 통과함',
          resultShapeContracts.missingFixtureToolIds.length === 0
            && resultShapeContracts.staleFixtureToolIds.length === 0
            && resultShapeContracts.duplicateFixtureToolIds.length === 0
            && resultShapeContracts.invalidFixtureToolIds.length === 0
            && resultShapeContracts.disallowedResultKeyPaths.length === 0,
          `${resultShapeContracts.fixtureToolIds.length}개 Bio-Tool 결과 fixture가 writer/source guard와 동기화됨`,
          [
            resultShapeContracts.missingFixtureToolIds.length > 0
              ? `fixture 누락: ${resultShapeContracts.missingFixtureToolIds.join(', ')}`
              : null,
            resultShapeContracts.staleFixtureToolIds.length > 0
              ? `전용 writer가 아닌 fixture: ${resultShapeContracts.staleFixtureToolIds.join(', ')}`
              : null,
            resultShapeContracts.duplicateFixtureToolIds.length > 0
              ? `fixture 중복: ${resultShapeContracts.duplicateFixtureToolIds.join(', ')}`
              : null,
            resultShapeContracts.invalidFixtureToolIds.length > 0
              ? `type guard 실패: ${resultShapeContracts.invalidFixtureToolIds.join(', ')}`
              : null,
            resultShapeContracts.disallowedResultKeyPaths.length > 0
              ? `snake/kebab key: ${resultShapeContracts.disallowedResultKeyPaths.slice(0, 5).join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || 'Bio-Tool 결과 fixture 계약 불일치',
        ),
      ],
    },
    {
      id: 'statistics-methods',
      title: 'Statistics method sync',
      description: '통계 메서드 추가/삭제 시 method registry, variable requirements, 자동 작성 scope를 같이 확인합니다.',
      items: [
        createItem(
          'statistical-method-requirements',
          '모든 canonical 통계 메서드에 variable requirements가 있음',
          statisticalSync.missingRequirementMethodIds.length === 0,
          `${statisticalSync.methodIds.length}개 canonical method 모두 requirements 확인`,
          `requirements 누락: ${statisticalSync.missingRequirementMethodIds.join(', ')}`,
        ),
        createItem(
          'tracked-variable-requirement-only',
          'registry 밖 variable requirements는 추적된 예외만 허용',
          statisticalSync.untrackedRequirementOnlyIds.length === 0,
          `${statisticalSync.trackedRequirementOnlyIds.length}개 requirements-only 항목은 추적된 예외로 유지`,
          `추적되지 않은 requirements-only 항목: ${statisticalSync.untrackedRequirementOnlyIds.join(', ')}`,
        ),
        createItem(
          'statistical-method-writing-scope',
          '모든 canonical 통계 메서드가 Methods/Results category scope와 일치함',
          statisticalSync.mismatchedMethodsScopeMethodIds.length === 0
            && statisticalSync.mismatchedResultsScopeMethodIds.length === 0,
          'Methods/Results 작성 범위가 category 기준으로 모두 해석됨',
          [
            statisticalSync.mismatchedMethodsScopeMethodIds.length > 0
              ? `Methods scope 불일치: ${statisticalSync.mismatchedMethodsScopeMethodIds.join(', ')}`
              : null,
            statisticalSync.mismatchedResultsScopeMethodIds.length > 0
              ? `Results scope 불일치: ${statisticalSync.mismatchedResultsScopeMethodIds.join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || 'Methods/Results scope 연결 누락',
        ),
        createItem(
          'variable-role-study-schema-mapping',
          'variable requirements role이 StudySchema role로 매핑됨',
          statisticalSync.unmappedVariableRequirementRoles.length === 0,
          '모든 variable role이 논문 작성 StudySchema role로 매핑됨',
          `StudySchema 매핑 누락 role: ${statisticalSync.unmappedVariableRequirementRoles.join(', ')}`,
        ),
      ],
    },
    {
      id: 'project-entities',
      title: 'Project entity sync',
      description: 'ProjectEntityKind 추가 시 resolver, generic-only 분류, 탭 메타, 문서 작성 진입 가능 여부를 같이 확인합니다.',
      items: [
        createItem(
          'project-entity-tabs',
          '모든 resolver 인지 entityKind에 탭 메타가 있음',
          entitySync.missingTabEntityKinds.length === 0
            && entitySync.duplicateTabEntityKinds.length === 0,
          `${entitySync.knownEntityKinds.length}개 entityKind 탭 메타 확인`,
          [
            entitySync.missingTabEntityKinds.length > 0
              ? `탭 누락: ${entitySync.missingTabEntityKinds.join(', ')}`
              : null,
            entitySync.duplicateTabEntityKinds.length > 0
              ? `탭 중복: ${entitySync.duplicateTabEntityKinds.join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || 'entity tab registry 불일치',
        ),
        createItem(
          'document-writing-entity-kinds',
          '문서 작성 진입 가능 entityKind는 resolver, 탭 메타, source registry에 모두 등록됨',
          entitySync.documentWritingKindsMissingResolver.length === 0
            && entitySync.documentWritingKindsMissingTab.length === 0
            && entitySync.documentWritingKindsMissingSourceRegistry.length === 0,
          `${DOCUMENT_WRITING_ENTITY_KINDS.length}개 문서 작성 source kind 확인`,
          [
            entitySync.documentWritingKindsMissingResolver.length > 0
              ? `resolver 누락: ${entitySync.documentWritingKindsMissingResolver.join(', ')}`
              : null,
            entitySync.documentWritingKindsMissingTab.length > 0
              ? `탭 누락: ${entitySync.documentWritingKindsMissingTab.join(', ')}`
              : null,
            entitySync.documentWritingKindsMissingSourceRegistry.length > 0
              ? `source registry 누락: ${entitySync.documentWritingKindsMissingSourceRegistry.join(', ')}`
              : null,
          ].filter((message): message is string => message !== null).join(' / ') || '문서 작성 entity kind 연결 누락',
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
      statisticalMethodCount: statisticalSync.methodIds.length,
      trackedVariableRequirementOnlyCount: statisticalSync.trackedRequirementOnlyIds.length,
      projectEntityKindCount: entitySync.knownEntityKinds.length,
      bioToolResultContractFixtureCount: resultShapeContracts.fixtureToolIds.length,
    },
    sections,
  }
}
