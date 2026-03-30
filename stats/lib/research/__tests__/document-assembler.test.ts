/**
 * DocumentAssembler 테스트
 */

import { describe, it, expect } from 'vitest'
import { assembleDocument, reassembleDocument } from '../document-assembler'
import type { AssemblerDataSources, AssembleOptions } from '../document-assembler'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { ProjectEntityRef } from '@biohub/types'
import type { GraphProject } from '@/types/graph-studio'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'

// ── 테스트 헬퍼 ──

function makeEntityRef(overrides: Partial<ProjectEntityRef> = {}): ProjectEntityRef {
  return {
    id: 'pref_1',
    projectId: 'proj_1',
    entityKind: 'analysis',
    entityId: 'hist_1',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePaperDraft(overrides: Partial<PaperDraft> = {}): PaperDraft {
  return {
    methods: 'Student\'s t-test를 사용하여 두 그룹 간 평균을 비교하였다.',
    results: '두 그룹 간 유의한 차이가 관찰되었다 (t = 3.45, p < 0.01).',
    captions: null,
    discussion: null,
    tables: [{
      id: 'descriptive',
      title: 'Table 1. 기술통계량',
      htmlContent: '<table>...</table>',
      plainText: 'Group\tMean\tSD\nA\t10.5\t2.3\nB\t12.1\t3.1',
    }],
    language: 'ko',
    postHocDisplay: 'significant-only',
    generatedAt: '2026-01-01T00:00:00Z',
    model: null,
    context: {
      variableLabels: {},
      variableUnits: {},
      groupLabels: {},
    },
    ...overrides,
  }
}

function makeHistoryRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'hist_1',
    timestamp: Date.now(),
    name: '독립표본 t-검정',
    method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 'comparison' },
    purpose: 'test',
    dataFileName: 'data.csv',
    dataRowCount: 50,
    results: { pValue: 0.005, tStatistic: 3.45 },
    paperDraft: makePaperDraft(),
    ...overrides,
  }
}

function makeGraphProject(overrides: Partial<GraphProject> = {}): GraphProject {
  return {
    id: 'gp_1',
    name: 'Box Plot',
    chartSpec: { chartType: 'box' } as GraphProject['chartSpec'],
    dataPackageId: 'dp_1',
    editHistory: [],
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  }
}

const BASE_OPTIONS: AssembleOptions = {
  projectId: 'proj_1',
  preset: 'paper',
  language: 'ko',
  title: '넙치 바이러스 감염 연구',
}

// ── 테스트 ──

describe('assembleDocument', () => {
  it('should create a document with preset sections', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)

    expect(doc.projectId).toBe('proj_1')
    expect(doc.preset).toBe('paper')
    expect(doc.title).toBe('넙치 바이러스 감염 연구')
    expect(doc.sections).toHaveLength(5)
    expect(doc.id).toMatch(/^doc_/)
    expect(doc.createdAt).toBeTruthy()
    expect(doc.updatedAt).toBeTruthy()
  })

  it('should merge methods from project analyses', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const methods = doc.sections.find(s => s.id === 'methods')

    expect(methods?.content).toContain('독립표본 t-검정')
    expect(methods?.content).toContain('Student\'s t-test')
    expect(methods?.generatedBy).toBe('template')
    expect(methods?.sourceRefs).toContain('hist_1')
  })

  it('should merge results with tables from project analyses', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.content).toContain('유의한 차이')
    expect(results?.tables).toHaveLength(1)
    expect(results?.tables?.[0].headers).toEqual(['Group', 'Mean', 'SD'])
    expect(results?.tables?.[0].rows).toEqual([
      ['A', '10.5', '2.3'],
      ['B', '12.1', '3.1'],
    ])
  })

  it('should include FigureRefs from project graph projects', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
        makeEntityRef({ id: 'pref_2', entityId: 'gp_1', entityKind: 'figure' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [makeGraphProject()],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.figures).toHaveLength(1)
    expect(results?.figures?.[0].label).toBe('Figure 1')
    expect(results?.figures?.[0].caption).toBe('Box Plot (box)')
    expect(results?.content).toContain('Figure 1')
  })

  it('should filter out non-project analyses', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
      ],
      allHistory: [
        makeHistoryRecord({ id: 'hist_1' }),
        makeHistoryRecord({ id: 'hist_other', name: 'Other analysis' }),
      ],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const methods = doc.sections.find(s => s.id === 'methods')

    expect(methods?.content).toContain('독립표본 t-검정')
    expect(methods?.content).not.toContain('Other analysis')
  })

  it('should merge multiple analyses', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
        makeEntityRef({ id: 'pref_2', entityId: 'hist_2', entityKind: 'analysis' }),
      ],
      allHistory: [
        makeHistoryRecord({ id: 'hist_1' }),
        makeHistoryRecord({
          id: 'hist_2',
          name: '일원분산분석',
          method: { id: 'one-way-anova', name: '일원분산분석', category: 'comparison' },
          paperDraft: makePaperDraft({
            methods: 'One-way ANOVA를 수행하였다.',
            results: 'F = 5.67, p = 0.003',
          }),
        }),
      ],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const methods = doc.sections.find(s => s.id === 'methods')
    const results = doc.sections.find(s => s.id === 'results')

    expect(methods?.content).toContain('독립표본 t-검정')
    expect(methods?.content).toContain('일원분산분석')
    expect(results?.content).toContain('유의한 차이')
    expect(results?.content).toContain('F = 5.67')
    expect(results?.tables).toHaveLength(2) // both analyses have tables
  })

  it('should skip analyses without paperDraft', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_no_draft', entityKind: 'analysis' }),
      ],
      allHistory: [
        makeHistoryRecord({ id: 'hist_no_draft', paperDraft: undefined }),
      ],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const methods = doc.sections.find(s => s.id === 'methods')

    expect(methods?.content).toBe('')
  })

  it('should add default references', () => {
    const doc = assembleDocument(BASE_OPTIONS, {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
    })

    const refs = doc.sections.find(s => s.id === 'references')

    expect(refs?.content).toContain('BioHub')
    expect(refs?.content).toContain('SciPy')
  })

  it('should use English references when language is en', () => {
    const doc = assembleDocument(
      { ...BASE_OPTIONS, language: 'en' },
      { entityRefs: [], allHistory: [], allGraphProjects: [] },
    )

    const refs = doc.sections.find(s => s.id === 'references')

    expect(refs?.content).toContain('Software')
    expect(refs?.content).not.toContain('소프트웨어')
  })

  it('should work with report preset', () => {
    const doc = assembleDocument(
      { ...BASE_OPTIONS, preset: 'report' },
      {
        entityRefs: [makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' })],
        allHistory: [makeHistoryRecord()],
        allGraphProjects: [],
      },
    )

    expect(doc.sections).toHaveLength(6)
    expect(doc.sections.map(s => s.id)).toContain('summary')
    expect(doc.sections.map(s => s.id)).toContain('methods')

    const methods = doc.sections.find(s => s.id === 'methods')
    expect(methods?.content).toContain('Student\'s t-test')
  })

  it('should include BLAST results', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'blast_1', entityKind: 'blast-result' }),
      ],
      allHistory: [
        makeHistoryRecord({
          id: 'blast_1',
          name: 'BLAST 검색',
          paperDraft: undefined,
          results: {
            description: 'Sequence similarity found',
            topHits: [
              { species: 'Paralichthys olivaceus', identity: 99.5, accession: 'AB123456' },
              { species: 'Platichthys stellatus', identity: 95.2, accession: 'CD789012' },
            ],
          },
        }),
      ],
      allGraphProjects: [],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.content).toContain('BLAST')
    expect(results?.content).toContain('Paralichthys olivaceus')
    expect(results?.content).toContain('99.5%')
  })

  it('should store metadata and authors', () => {
    const doc = assembleDocument(
      {
        ...BASE_OPTIONS,
        authors: ['Kim', 'Lee'],
        metadata: { targetJournal: 'Aquaculture' },
      },
      { entityRefs: [], allHistory: [], allGraphProjects: [] },
    )

    expect(doc.authors).toEqual(['Kim', 'Lee'])
    expect((doc.metadata as { targetJournal: string }).targetJournal).toBe('Aquaculture')
  })
})

describe('reassembleDocument', () => {
  it('should preserve user-edited sections and refresh template sections', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    // 첫 번째 조립
    const original = assembleDocument(BASE_OPTIONS, sources)

    // 사용자가 Introduction을 편집
    const edited = {
      ...original,
      sections: original.sections.map(s =>
        s.id === 'introduction'
          ? { ...s, content: '사용자가 작성한 서론입니다.', generatedBy: 'user' as const }
          : s,
      ),
    }

    // 새 분석 추가 후 재조립
    const newSources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
        makeEntityRef({ id: 'pref_3', entityId: 'hist_3', entityKind: 'analysis' }),
      ],
      allHistory: [
        makeHistoryRecord(),
        makeHistoryRecord({
          id: 'hist_3',
          name: '카이제곱 검정',
          paperDraft: makePaperDraft({
            methods: 'Chi-square test를 수행하였다.',
            results: 'χ² = 8.9, p = 0.012',
          }),
        }),
      ],
      allGraphProjects: [],
    }

    const reassembled = reassembleDocument(edited, newSources)

    // 사용자 작성 섹션 보존
    const intro = reassembled.sections.find(s => s.id === 'introduction')
    expect(intro?.content).toBe('사용자가 작성한 서론입니다.')

    // template 섹션은 갱신
    const methods = reassembled.sections.find(s => s.id === 'methods')
    expect(methods?.content).toContain('Chi-square')
    expect(methods?.content).toContain('독립표본 t-검정')

    // updatedAt 갱신
    expect(reassembled.updatedAt).not.toBe(original.updatedAt)
  })
})
