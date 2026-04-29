import { describe, expect, it } from 'vitest'
import { BIO_TOOLS } from '@/lib/bio-tools/bio-tool-registry'
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

    expect(checklist.summary.attentionItems).toBe(0)
    expect(checklist.summary.readyBioToolCount).toBe(15)
    expect(checklist.summary.dedicatedReadyBioToolCount).toBe(15)
    expect(checklist.summary.genericReadyBioToolIds).toEqual([])
    expect(checklist.sections.map((section) => section.id)).toEqual([
      'bio-tools',
      'source-contracts',
    ])
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
})
