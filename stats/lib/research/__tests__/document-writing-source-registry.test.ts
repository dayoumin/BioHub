import { describe, expect, it } from 'vitest'
import { createDocumentSourceRef } from '../document-blueprint-types'
import {
  createNormalizedAnalysisWritingSource,
  createNormalizedFigureWritingSource,
  createNormalizedGenericSupplementaryWritingSource,
  createNormalizedSupplementaryWritingSource,
  writeNormalizedSourceBlock,
} from '../document-writing-source-registry'

describe('document writing source registry', () => {
  it('writes methods/results blocks for normalized analysis sources', () => {
    const source = createNormalizedAnalysisWritingSource({
      projectId: 'proj_1',
      sourceRef: createDocumentSourceRef('analysis', 'hist_1', { label: 'ANOVA' }),
      record: {
        id: 'hist_1',
        timestamp: Date.now(),
        name: 'ANOVA',
        purpose: 'ANOVA',
        analysisPurpose: 'ANOVA',
        method: {
          id: 'one-way-anova',
          name: 'ANOVA',
          category: 'anova',
        },
        variableMapping: null,
        analysisOptions: {},
        dataFileName: 'sample.csv',
        dataRowCount: 10,
        columnInfo: [],
        results: { pValue: 0.01 },
        aiInterpretation: null,
        apaFormat: null,
        paperDraft: null,
      },
      draft: {
        methods: '방법 초안',
        results: '결과 초안',
        captions: null,
        discussion: null,
        tables: [],
        language: 'ko',
        postHocDisplay: 'significant-only',
        generatedAt: '2026-04-24T00:00:00.000Z',
        model: null,
        context: {
          variableLabels: {},
          variableUnits: {},
          groupLabels: {},
        },
      },
    })

    expect(writeNormalizedSourceBlock(source, 'methods', { language: 'ko' })).toBe('방법 초안')
    expect(writeNormalizedSourceBlock(source, 'results', { language: 'ko' })).toBe('결과 초안')
  })

  it('writes figure summary blocks for normalized figure sources', () => {
    const source = createNormalizedFigureWritingSource({
      projectId: 'proj_1',
      sourceRef: createDocumentSourceRef('figure', 'figure_1', { label: 'Figure 1' }),
      figure: {
        entityId: 'figure_1',
        label: 'Figure 1',
        caption: 'Treatment comparison',
        chartType: 'bar',
        relatedAnalysisId: 'hist_1',
        relatedAnalysisLabel: 'ANOVA',
        patternSummary: 'A 그룹이 더 높습니다.',
      },
    })

    const block = writeNormalizedSourceBlock(source, 'results', { language: 'ko' })

    expect(block).toContain('**Figure 1**: Treatment comparison')
    expect(block).toContain('관련 분석: ANOVA')
    expect(block).toContain('패턴 요약: A 그룹이 더 높습니다.')
  })

  it('writes generic supplementary markdown blocks', () => {
    const source = createNormalizedGenericSupplementaryWritingSource({
      projectId: 'proj_1',
      entityRef: {
        id: 'ref_1',
        projectId: 'proj_1',
        entityKind: 'seq-stats-result',
        entityId: 'seq_1',
        label: 'Seq stats',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'seq_1', { label: 'Seq stats' }),
      markdown: '- **Seq stats**: 12 seq · 평균 길이 650',
    })

    expect(writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })).toBe('- **Seq stats**: 12 seq · 평균 길이 650')
  })

  it('normalizes bio-tool supplementary entities through the registry helper', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_bio_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_1',
        label: 'Shannon diversity',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_1', { label: 'Shannon diversity' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_1', {
            id: 'bio_1',
            toolId: 'shannon-diversity',
            toolNameEn: 'Shannon diversity',
            toolNameKo: '샤논 다양도',
            csvFileName: 'sample.csv',
            columnConfig: {},
            results: {},
            createdAt: Date.now(),
          }],
        ]),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map(),
        phylogenyById: new Map(),
        boldById: new Map(),
        translationById: new Map(),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### 샤논 다양도')
    expect(block).toContain('입력 파일: sample.csv')
  })

  it('falls back to the entity label when supplementary history is missing', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_seq_1',
        projectId: 'proj_1',
        entityKind: 'seq-stats-result',
        entityId: 'seq_1',
        label: 'Sequence stats',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'seq_1', { label: 'Sequence stats' }),
      language: 'ko',
      maps: {
        bioToolById: new Map(),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map(),
        phylogenyById: new Map(),
        boldById: new Map(),
        translationById: new Map(),
      },
    })

    expect(writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })).toBe('- Sequence stats')
  })
})
