import { describe, expect, it } from 'vitest'
import { BIO_TOOLS } from '@/lib/bio-tools/bio-tool-registry'
import { getAllMethods } from '@/lib/constants/statistical-methods'
import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'
import {
  BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL,
  BIO_TOOL_SUPPLEMENTARY_WRITER_POLICIES,
  getBioToolSupplementaryWriterPolicy,
  getSupplementaryWriterPolicy,
  getSupplementaryWriterPromotionQueue,
  SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS,
} from '../document-writing-supplementary-policy'
import {
  buildDocumentWritingDevelopmentChecklist,
  summarizeSectionRegenerationUxContract,
  summarizeProjectEntitySync,
  summarizeStatisticalMethodSync,
  summarizeBioToolWriterReadiness,
} from '../document-writing-development-checklist'

describe('document writing supplementary writer policy', () => {
  it('keeps existing genetics writers marked as dedicated', () => {
    expect(getSupplementaryWriterPolicy('blast-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('bold-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('protein-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('seq-stats-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('translation-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('similarity-result')?.stage).toBe('dedicated')
    expect(getSupplementaryWriterPolicy('phylogeny-result')?.stage).toBe('dedicated')
  })

  it('has no remaining genetics promotion queue after limited phylogeny writer promotion', () => {
    expect(getSupplementaryWriterPromotionQueue().map((policy) => policy.entityKind)).toEqual([])
  })

  it('keeps broad bio-tool results generic until each tool has a typed result guard', () => {
    const policy = getSupplementaryWriterPolicy('bio-tool-result')

    expect(policy?.stage).toBe('generic-only')
    expect(policy?.promotionRequirement).toContain('BioToolId별 타입 가드')
    expect(getBioToolSupplementaryWriterPolicy('alpha-diversity')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('rarefaction')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('beta-diversity')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('condition-factor')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('fst')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('hardy-weinberg')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('icc')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('length-weight')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('mantel-test')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('meta-analysis')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('nmds')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('permanova')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('roc-auc')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('survival')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('vbgf')?.stage).toBe('dedicated')
    expect(getBioToolSupplementaryWriterPolicy('species-validation')?.stage).toBe('generic-only')
    expect(getBioToolSupplementaryWriterPolicy('species-validation')?.rationale).toContain('coming-soon')
  })

  it('classifies every registered Bio-Tool so additions and removals surface in policy review', () => {
    expect(Object.keys(BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL).sort()).toEqual(
      BIO_TOOLS.map((tool) => tool.id).sort(),
    )
  })

  it('documents the minimum constraints for generic fallback output', () => {
    expect(SUPPLEMENTARY_GENERIC_FALLBACK_CONSTRAINTS).toContain(
      '분석 방법 선택 이유, 생물학적 의미, novelty, causal language는 생성하지 않는다.',
    )
    expect(BIO_TOOL_SUPPLEMENTARY_WRITER_POLICIES
      .filter((policy) => policy.stage === 'dedicated')
      .map((policy) => policy.toolId)).toEqual([
      'alpha-diversity',
      'beta-diversity',
      'condition-factor',
      'fst',
      'hardy-weinberg',
      'icc',
      'length-weight',
      'mantel-test',
      'meta-analysis',
      'nmds',
      'permanova',
      'rarefaction',
      'roc-auc',
      'survival',
      'vbgf',
    ])
  })

  it('summarizes writer readiness for the Papers development checklist', () => {
    const checklist = buildDocumentWritingDevelopmentChecklist()
    const allItems = checklist.sections.flatMap((section) => section.items)

    expect(checklist.summary.attentionItems).toBe(0)
    expect(allItems.every((item) => item.status === 'pass')).toBe(true)
    expect(checklist.summary.readyBioToolCount).toBe(BIO_TOOLS.filter((tool) => tool.status === 'ready').length)
    expect(checklist.summary.dedicatedReadyBioToolCount).toBe(checklist.summary.readyBioToolCount)
    expect(checklist.summary.genericReadyBioToolIds).toEqual([])
    expect(checklist.summary.statisticalMethodCount).toBe(getAllMethods().length)
    expect(checklist.summary.trackedVariableRequirementOnlyCount).toBeGreaterThan(0)
    expect(checklist.summary.projectEntityKindCount).toBeGreaterThan(0)
    expect(checklist.summary.sectionRegenerationUxItemCount).toBe(3)
    expect(checklist.sections.map((section) => section.id)).toEqual([
      'bio-tools',
      'source-contracts',
      'statistics-methods',
      'project-entities',
      'section-regeneration-ux',
    ])
  })

  it('keeps section regeneration UX contract conservative for user-edited drafts', () => {
    const summary = summarizeSectionRegenerationUxContract()

    expect(summary.supportedSectionIds).toEqual(['methods', 'results'])
    expect(summary.destructiveMode).toBe('regenerate')
    expect(summary.bodyPreservingMode).toBe('refresh-linked-sources')
    expect(summary.hasMethodsAndResultsOnlyScope).toBe(true)
    expect(summary.separatesDestructiveAndBodyPreservingModes).toBe(true)
    expect(summary.destructiveModeRequiresConfirmation).toBe(true)
    expect(summary.bodyPreservingModePreservesBody).toBe(true)
    expect(summary.editorDisabledWhilePending).toBe(true)
    expect(summary.blocksConcurrentSectionJobs).toBe(true)
  })

  it('simulates section regeneration UX drift for checklist attention cases', () => {
    const summary = summarizeSectionRegenerationUxContract({
      supportedSectionIds: ['methods', 'results', 'discussion'],
      destructiveMode: 'regenerate',
      bodyPreservingMode: 'regenerate',
      destructiveModeRequiresConfirmation: false,
      bodyPreservingModePreservesBody: false,
      editorDisabledWhilePending: false,
      blocksConcurrentSectionJobs: false,
    })

    expect(summary.hasMethodsAndResultsOnlyScope).toBe(false)
    expect(summary.separatesDestructiveAndBodyPreservingModes).toBe(false)
    expect(summary.destructiveModeRequiresConfirmation).toBe(false)
    expect(summary.bodyPreservingModePreservesBody).toBe(false)
    expect(summary.editorDisabledWhilePending).toBe(false)
    expect(summary.blocksConcurrentSectionJobs).toBe(false)
  })

  it('marks ready Bio-Tools without dedicated writers as attention items', () => {
    const readiness = summarizeBioToolWriterReadiness(
      [
        { id: 'alpha-diversity', status: 'ready' },
        { id: 'species-validation', status: 'ready' },
      ],
      {
        'alpha-diversity': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['alpha-diversity'],
        'species-validation': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['species-validation'],
      },
    )

    expect(readiness.dedicatedReadyToolIds).toEqual(['alpha-diversity'])
    expect(readiness.genericReadyToolIds).toEqual(['species-validation'])
    expect(readiness.comingSoonDedicatedToolIds).toEqual([])
  })

  it('marks dedicated Bio-Tool policies without source registry coverage as drift', () => {
    const readiness = summarizeBioToolWriterReadiness(
      [
        { id: 'alpha-diversity', status: 'ready' },
        { id: 'beta-diversity', status: 'ready' },
      ],
      {
        'alpha-diversity': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['alpha-diversity'],
        'beta-diversity': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['beta-diversity'],
      },
      ['alpha-diversity'],
    )

    expect(readiness.dedicatedPolicyToolIdsMissingSourceRegistry).toEqual(['beta-diversity'])
    expect(readiness.dedicatedSourceRegistryToolIdsMissingPolicy).toEqual([])
  })

  it('marks source registry dedicated Bio-Tool paths without policy coverage as drift', () => {
    const readiness = summarizeBioToolWriterReadiness(
      [
        { id: 'alpha-diversity', status: 'ready' },
        { id: 'beta-diversity', status: 'ready' },
      ],
      {
        'alpha-diversity': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['alpha-diversity'],
      },
      ['alpha-diversity', 'beta-diversity'],
    )

    expect(readiness.missingPolicyToolIds).toEqual(['beta-diversity'])
    expect(readiness.dedicatedSourceRegistryToolIdsMissingPolicy).toEqual(['beta-diversity'])
  })

  it('marks coming-soon Bio-Tools promoted to dedicated as attention items', () => {
    const readiness = summarizeBioToolWriterReadiness(
      [{ id: 'species-validation', status: 'coming-soon' }],
      {
        'species-validation': {
          ...BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['species-validation'],
          stage: 'dedicated',
        },
      },
      ['species-validation'],
    )

    expect(readiness.comingSoonDedicatedToolIds).toEqual(['species-validation'])
  })

  it('marks duplicate Bio-Tool registry IDs as drift', () => {
    const readiness = summarizeBioToolWriterReadiness(
      [
        { id: 'alpha-diversity', status: 'ready' },
        { id: 'alpha-diversity', status: 'ready' },
      ],
      {
        'alpha-diversity': BIO_TOOL_SUPPLEMENTARY_WRITER_POLICY_BY_TOOL['alpha-diversity'],
      },
    )

    expect(readiness.duplicateRegistryToolIds).toEqual(['alpha-diversity'])
    expect(readiness.missingPolicyToolIds).toEqual([])
    expect(readiness.stalePolicyToolIds).toEqual([])
  })

  it('detects statistical method and variable requirement drift', () => {
    const sync = summarizeStatisticalMethodSync(
      [
        { id: 'two-sample-t', category: 't-test' },
        { id: 'new-method', category: 't-test' },
      ],
      [
        { id: 'two-sample-t', variables: [{ role: 'dependent' }] },
        { id: 'tracked-only', variables: [{ role: 'factor' }] },
        { id: 'unexpected-only', variables: [{ role: 'covariate' }] },
      ],
      ['tracked-only'],
      {
        methods: () => 't-test',
        results: () => 't-test',
      },
    )

    expect(sync.missingRequirementMethodIds).toEqual(['new-method'])
    expect(sync.trackedRequirementOnlyIds).toEqual(['tracked-only'])
    expect(sync.untrackedRequirementOnlyIds).toEqual(['unexpected-only'])
    expect(sync.unmappedVariableRequirementRoles).toEqual([])
  })

  it('detects statistical method category scope mismatches', () => {
    const sync = summarizeStatisticalMethodSync(
      [{ id: 'two-sample-t', category: 'regression' }],
      [{ id: 'two-sample-t', variables: [{ role: 'dependent' }] }],
      [],
      {
        methods: () => 't-test',
        results: () => 't-test',
      },
    )

    expect(sync.mismatchedMethodsScopeMethodIds).toEqual(['two-sample-t'])
    expect(sync.mismatchedResultsScopeMethodIds).toEqual(['two-sample-t'])
  })

  it('keeps the real statistical scope sync free of mismatches', () => {
    const sync = summarizeStatisticalMethodSync(
      getAllMethods(),
      STATISTICAL_METHOD_REQUIREMENTS,
    )

    expect(sync.missingRequirementMethodIds).toEqual([])
    expect(sync.mismatchedMethodsScopeMethodIds).toEqual([])
    expect(sync.mismatchedResultsScopeMethodIds).toEqual([])
    expect(sync.unmappedVariableRequirementRoles).toEqual([])
  })

  it('detects project entity tab and document-writing source drift', () => {
    const sync = summarizeProjectEntitySync(
      ['analysis'],
      ['analysis', 'draft'],
      ['chat-session'],
      ['analysis', 'draft', 'protein-result'],
      ['analysis'],
    )

    expect(sync.missingTabEntityKinds).toEqual(['chat-session', 'draft'])
    expect(sync.documentWritingKindsMissingResolver).toEqual(['protein-result'])
    expect(sync.documentWritingKindsMissingTab).toEqual(['draft', 'protein-result'])
    expect(sync.documentWritingKindsMissingSourceRegistry).toEqual(['draft', 'protein-result'])
  })

  it('detects duplicate project entity tab metadata', () => {
    const sync = summarizeProjectEntitySync(
      ['analysis', 'analysis', 'draft'],
      ['analysis', 'draft'],
      [],
      ['analysis', 'draft'],
      ['analysis', 'draft'],
    )

    expect(sync.duplicateTabEntityKinds).toEqual(['analysis'])
    expect(sync.missingTabEntityKinds).toEqual([])
  })
})
