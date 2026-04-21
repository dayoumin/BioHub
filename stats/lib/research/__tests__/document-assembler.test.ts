/**
 * DocumentAssembler 테스트
 */

import { describe, it, expect } from 'vitest'
import { assembleDocument, reassembleDocument } from '../document-assembler'
import type { AssemblerDataSources, AssembleOptions } from '../document-assembler'
import {
  createDocumentSourceRef,
  getDocumentSourceId,
} from '../document-blueprint-types'
import type { BlastEntryLike } from '../entity-resolver'
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
    method: { id: 'two-sample-t', name: '독립표본 t-검정', category: 't-test' },
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
    chartSpec: { chartType: 'box' } as unknown as GraphProject['chartSpec'],
    dataPackageId: 'dp_1',
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
    expect(methods?.sourceRefs.map(getDocumentSourceId)).toContain('hist_1')
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
      allHistory: [makeHistoryRecord({
        results: {
          groupStats: [
            { group: 'A', mean: 2.1, n: 10 },
            { group: 'B', mean: 2.8, n: 10 },
          ],
        },
      })],
      allGraphProjects: [makeGraphProject({ analysisId: 'hist_1' })],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.figures).toHaveLength(1)
    expect(results?.figures?.[0].label).toBe('Figure 1')
    expect(results?.figures?.[0].caption).toBe('Box Plot (box)')
    expect(results?.figures?.[0].relatedAnalysisId).toBe('hist_1')
    expect(results?.figures?.[0].relatedAnalysisLabel).toBe('독립표본 t-검정')
    expect(results?.figures?.[0].patternSummary).toContain('B')
    expect(results?.content).toContain('Figure 1')
    expect(results?.content).toContain('관련 분석')
    expect(results?.content).toContain('패턴 요약')
  })

  it('should preserve figure provenance from allHistory even when the linked analysis is not a project entity', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ id: 'pref_2', entityId: 'gp_1', entityKind: 'figure' }),
      ],
      allHistory: [makeHistoryRecord({
        results: {
          groupStats: [
            { group: 'A', mean: 2.1, n: 10 },
            { group: 'B', mean: 2.8, n: 10 },
          ],
        },
      })],
      allGraphProjects: [makeGraphProject({ analysisId: 'hist_1' })],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.figures?.[0]?.relatedAnalysisId).toBe('hist_1')
    expect(results?.figures?.[0]?.relatedAnalysisLabel).toBe('독립표본 t-검정')
    expect(results?.figures?.[0]?.patternSummary).toBeTruthy()
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
    const blastEntry: BlastEntryLike = {
      id: 'blast_1',
      sampleName: 'Sample-A',
      topSpecies: 'Paralichthys olivaceus',
      marker: 'COI',
      topIdentity: 0.995,
      status: 'confirmed',
      createdAt: Date.now(),
      resultData: {
        status: 'confirmed',
        description: 'Sequence similarity found',
        topHits: [
          { species: 'Paralichthys olivaceus', identity: 99.5, accession: 'AB123456' },
          { species: 'Platichthys stellatus', identity: 95.2, accession: 'CD789012' },
        ],
      },
    }

    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'blast_1', entityKind: 'blast-result' }),
      ],
      allHistory: [],
      allGraphProjects: [],
      blastHistory: [blastEntry],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.content).toContain('BLAST')
    expect(results?.content).toContain('Sample-A')
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

// ── Bug simulation: 수정 전 동작 재현 ──

describe('Finding 2: BLAST 데이터 소스 불일치 시뮬레이션', () => {
  it('allHistory에 BLAST 데이터를 넣으면 결과 섹션에 반영되지 않음 (구 계약 실패)', () => {
    // 수정 전 코드는 allHistory에서 record.results.description/topHits를 읽었음
    // 수정 후 코드는 blastHistory에서 entry.resultData를 읽으므로,
    // allHistory에 BLAST 데이터를 넣어도 무시됨 = 구 계약이 동작하지 않음을 증명
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'blast_fake', entityKind: 'blast-result' }),
      ],
      allHistory: [
        makeHistoryRecord({
          id: 'blast_fake',
          name: 'BLAST 검색',
          paperDraft: undefined,
          results: {
            description: 'This should NOT appear',
            topHits: [
              { species: 'FakeSpecies', identity: 99.0, accession: 'FAKE001' },
            ],
          },
        }),
      ],
      allGraphProjects: [],
      // blastHistory 미제공 → BLAST 내용 없어야 함
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    // 구 계약(allHistory.results.description)은 더 이상 참조되지 않음
    expect(results?.content).not.toContain('FakeSpecies')
    expect(results?.content).not.toContain('This should NOT appear')
  })

  it('blastHistory에 실제 BarcodingHistoryEntry 형태 데이터를 넣으면 정상 조립', () => {
    // 실제 genetics history에서 나오는 BarcodingHistoryEntry 구조:
    // { id, sampleName, marker, topSpecies, topIdentity, status, resultData: { description, topHits } }
    const realBarcodingEntry: BlastEntryLike = {
      id: 'barcoding-1710000000-abc123',
      sampleName: '제주넙치_COI_01',
      marker: 'COI',
      topSpecies: 'Paralichthys olivaceus',
      topIdentity: 0.998,
      status: 'confirmed',
      createdAt: 1710000000000,
      resultData: {
        status: 'confirmed',
        description: 'COI 바코드 분석 결과, 넙치(Paralichthys olivaceus)로 확인됨',
        topHits: [
          { species: 'Paralichthys olivaceus', identity: 0.998, accession: 'MN123456' },
          { species: 'Paralichthys dentatus', identity: 0.921, accession: 'KX789012' },
        ],
      },
    }

    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({
          entityId: 'barcoding-1710000000-abc123',
          entityKind: 'blast-result',
        }),
      ],
      allHistory: [],
      allGraphProjects: [],
      blastHistory: [realBarcodingEntry],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    // 실제 데이터 구조에서 정상 추출 확인
    expect(results?.content).toContain('제주넙치_COI_01')
    expect(results?.content).toContain('Paralichthys olivaceus')
    expect(results?.content).toContain('99.8%')  // 0.998 → identity > 1 false → × 100
    expect(results?.content).toContain('MN123456')
    expect(results?.content).toContain('COI 바코드 분석 결과')
    // 두 번째 hit도 포함
    expect(results?.content).toContain('Paralichthys dentatus')
    expect(results?.content).toContain('92.1%')
  })

  it('resultData 없는 BlastEntryLike는 건너뜀', () => {
    const entryWithoutResult: BlastEntryLike = {
      id: 'blast_no_result',
      sampleName: 'Sample-X',
      marker: 'COI',
      topSpecies: null,
      topIdentity: null,
      status: null,
      createdAt: Date.now(),
      // resultData 없음 → 분석 미완료 상태
    }

    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'blast_no_result', entityKind: 'blast-result' }),
      ],
      allHistory: [],
      allGraphProjects: [],
      blastHistory: [entryWithoutResult],
    }

    const doc = assembleDocument(BASE_OPTIONS, sources)
    const results = doc.sections.find(s => s.id === 'results')

    expect(results?.content).not.toContain('Sample-X')
    expect(results?.content).not.toContain('BLAST')
  })
})

describe('Finding 3: reassembleDocument timestamp 보장 시뮬레이션', () => {
  it('동일 밀리초 실행에서도 updatedAt이 반드시 전진', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' })],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    const original = assembleDocument(BASE_OPTIONS, sources)
    // 즉시 재조립 — 같은 밀리초 가능
    const reassembled = reassembleDocument(original, sources)

    const originalMs = new Date(original.updatedAt).getTime()
    const reassembledMs = new Date(reassembled.updatedAt).getTime()

    // 최소 1ms 전진 보장
    expect(reassembledMs).toBeGreaterThan(originalMs)
  })

  it('연속 3회 재조립에서 updatedAt 단조 증가', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' })],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    const v1 = assembleDocument(BASE_OPTIONS, sources)
    const v2 = reassembleDocument(v1, sources)
    const v3 = reassembleDocument(v2, sources)

    const t1 = new Date(v1.updatedAt).getTime()
    const t2 = new Date(v2.updatedAt).getTime()
    const t3 = new Date(v3.updatedAt).getTime()

    expect(t2).toBeGreaterThan(t1)
    expect(t3).toBeGreaterThan(t2)
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

  it('should preserve user-written results content while refreshing structured figure and table metadata', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
        makeEntityRef({ id: 'pref_fig_1', entityId: 'gp_1', entityKind: 'figure' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [makeGraphProject()],
    }

    const original = assembleDocument(BASE_OPTIONS, sources)

    const edited = {
      ...original,
      sections: original.sections.map(s =>
        s.id === 'results'
          ? {
              ...s,
              content: '사용자가 정리한 결과 요약입니다.',
              generatedBy: 'user' as const,
              sourceRefs: [createDocumentSourceRef('unknown', 'stale-ref')],
              tables: undefined,
              figures: [{
                entityId: 'gp_1',
                label: 'Figure 1',
                caption: 'Old Figure Caption',
              }],
            }
          : s,
      ),
    }

    const newSources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
        makeEntityRef({ id: 'pref_fig_1', entityId: 'gp_1', entityKind: 'figure' }),
      ],
      allHistory: [
        makeHistoryRecord({
          paperDraft: makePaperDraft({
            tables: [{
              id: 'test-result',
              title: 'Table 9. 갱신된 표',
              htmlContent: '<table>updated</table>',
              plainText: 'Group\tMean\nA\t11.0\nB\t13.2',
            }],
          }),
        }),
      ],
      allGraphProjects: [
        makeGraphProject({
          name: 'Updated Box Plot',
          chartSpec: { chartType: 'box' } as unknown as GraphProject['chartSpec'],
        }),
      ],
    }

    const reassembled = reassembleDocument(edited, newSources)
    const results = reassembled.sections.find(s => s.id === 'results')

    expect(results?.content).toBe('사용자가 정리한 결과 요약입니다.')
    expect(results?.generatedBy).toBe('user')
    expect(results?.sourceRefs.map(getDocumentSourceId)).toEqual(['hist_1', 'gp_1'])
    expect(results?.tables?.[0]?.caption).toBe('Table 9. 갱신된 표')
    expect(results?.figures?.[0]?.caption).toBe('Updated Box Plot (box)')
  })

  it('preserves user-inserted sidecars while refreshing template-derived structured content', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [
        makeEntityRef({ entityId: 'hist_1', entityKind: 'analysis' }),
      ],
      allHistory: [makeHistoryRecord()],
      allGraphProjects: [],
    }

    const original = assembleDocument(BASE_OPTIONS, sources)
    const edited = {
      ...original,
      sections: original.sections.map((section) => (
        section.id === 'results'
          ? {
              ...section,
              generatedBy: 'user' as const,
              tables: [
                ...(section.tables ?? []),
                {
                  id: 'manual-table',
                  caption: 'Manual Table',
                  headers: ['A'],
                  rows: [['1']],
                  sourceAnalysisId: 'manual-analysis',
                  sourceAnalysisLabel: 'Manual Analysis',
                },
              ],
              figures: [
                ...(section.figures ?? []),
                {
                  entityId: 'manual-figure',
                  label: 'Figure 9',
                  caption: 'Manual Figure',
                },
              ],
              sourceRefs: [
                ...section.sourceRefs,
                createDocumentSourceRef('analysis', 'manual-analysis', {
                  label: 'Manual Analysis',
                }),
                createDocumentSourceRef('figure', 'manual-figure', {
                  label: 'Figure 9',
                }),
              ],
            }
          : section
      )),
    }

    const reassembled = reassembleDocument(edited, sources)
    const results = reassembled.sections.find((section) => section.id === 'results')

    expect(results?.tables?.some((table) => table.id === 'manual-table')).toBe(true)
    expect(results?.figures?.some((figure) => figure.entityId === 'manual-figure')).toBe(true)
    expect(results?.sourceRefs.map(getDocumentSourceId)).toContain('manual-analysis')
    expect(results?.sourceRefs.map(getDocumentSourceId)).toContain('manual-figure')
  })
})

// ── citations 병합 테스트 ──

import type { CitationRecord } from '../citation-types'
import type { LiteratureItem } from '@/lib/types/literature'

describe('assembleDocument - citations 병합', () => {
  function makeCitationRecord(overrides: Partial<CitationRecord> = {}): CitationRecord {
    const item: LiteratureItem = {
      id: 'lit_1',
      source: 'openalex',
      title: 'Fisheries Population Dynamics',
      authors: ['Smith A', 'Jones B'],
      year: 2021,
      journal: 'Fisheries Research',
      url: 'https://example.com',
      doi: '10.0000/fr.2021',
      searchedName: 'test',
    }
    return {
      id: 'cit_1',
      projectId: 'proj_test',
      item,
      addedAt: '2026-01-01T00:00:00Z',
      ...overrides,
    }
  }

  it('citations가 있으면 References 섹션에 APA 문자열 포함', () => {
    const citations = [makeCitationRecord()]
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
      citations,
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('Smith A, & Jones B')
    expect(refsSection?.content).toContain('2021')
    expect(refsSection?.content).toContain('https://doi.org/10.0000/fr.2021')
  })

  it('citations가 없으면 소프트웨어 기본 인용만 표시', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
      citations: [],
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('BioHub')
    expect(refsSection?.content).toContain('SciPy')
  })

  it('citations가 undefined이면 기존 동작과 동일', () => {
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    expect(refsSection?.content).toContain('BioHub')
  })

  it('동일 DOI citations가 중복이면 References에 한 번만 표시', () => {
    const c1 = makeCitationRecord({ id: 'cit_1' })
    c1.item = { ...c1.item, doi: '10.0000/fr.2021' }
    const c2 = makeCitationRecord({ id: 'cit_2' })
    c2.item = { ...c2.item, doi: '10.0000/FR.2021' } // 대소문자만 다름
    const sources: AssemblerDataSources = {
      entityRefs: [],
      allHistory: [],
      allGraphProjects: [],
      citations: [c1, c2],
    }
    const blueprint = assembleDocument(
      { projectId: 'proj_test', preset: 'paper', language: 'en', title: 'Test' },
      sources,
    )
    const refsSection = blueprint.sections.find(s => s.id === 'references')
    // "1." 은 있고 "2." 은 없어야 함 (중복 제거)
    expect(refsSection?.content).toContain('1.')
    expect(refsSection?.content).not.toContain('2.')
  })
})
