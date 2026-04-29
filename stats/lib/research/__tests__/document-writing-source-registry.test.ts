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

  it('writes Fst bio-tool supplementary entities from a guarded result shape only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_fst_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_fst_1',
        label: 'Fst result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_fst_1', { label: 'Fst result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_fst_1', {
            id: 'bio_fst_1',
            toolId: 'fst',
            toolNameEn: 'Fst',
            toolNameKo: '집단 분화 지수',
            csvFileName: 'fst.csv',
            columnConfig: {},
            results: {
              globalFst: 0.123456,
              pairwiseFst: [
                [0, 0.12, 0.18],
                [0.12, 0, 0.21],
                [0.18, 0.21, 0],
              ],
              populationLabels: ['Pop A', 'Pop B', 'Pop C'],
              nPopulations: 3,
              interpretation: '큰 분화',
              nIndividuals: 30,
              nLoci: 4,
              permutationPValue: 0.0123,
              nPermutations: 999,
              bootstrapCi: [0.08, 0.17],
              nBootstrap: 1000,
            },
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

    expect(block).toContain('#### 집단 분화 지수')
    expect(block).toContain('Global Fst: 0.123456')
    expect(block).toContain('집단 수: 3')
    expect(block).toContain('개체 수: 30')
    expect(block).toContain('유전자좌 수: 4')
    expect(block).toContain('Permutation p-value: 0.0123')
    expect(block).toContain('Bootstrap CI: [0.0800, 0.1700]')
    expect(block).toContain('집단 라벨: Pop A, Pop B, Pop C')
    expect(block).toContain('Pop B vs Pop A: 0.1200')
    expect(block).not.toContain('큰 분화')
  })

  it('falls back for malformed Fst bio-tool results instead of inventing pairwise labels', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_fst_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_fst_bad',
        label: 'Malformed Fst result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_fst_bad', { label: 'Malformed Fst result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_fst_bad', {
            id: 'bio_fst_bad',
            toolId: 'fst',
            toolNameEn: 'Fst',
            toolNameKo: '집단 분화 지수',
            csvFileName: 'fst.csv',
            columnConfig: {},
            results: {
              globalFst: 0.123456,
              pairwiseFst: [
                [0, 0.12, 0.18],
                [0.12, 0, 0.21],
                [0.18, 0.21, 0],
              ],
              populationLabels: ['Pop A', 'Pop B'],
              nPopulations: 3,
              interpretation: '큰 분화',
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 집단 분화 지수')
    expect(block).toContain('입력 파일: fst.csv')
    expect(block).not.toContain('Global Fst')
    expect(block).not.toContain('P3')
    expect(block).not.toContain('Pairwise Fst')
  })

  it('writes Hardy-Weinberg bio-tool supplementary entities from a guarded result shape only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_hw_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_hw_1',
        label: 'Hardy-Weinberg result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_hw_1', { label: 'Hardy-Weinberg result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_hw_1', {
            id: 'bio_hw_1',
            toolId: 'hardy-weinberg',
            toolNameEn: 'Hardy-Weinberg',
            toolNameKo: 'Hardy-Weinberg 검정',
            csvFileName: 'hw.csv',
            columnConfig: {},
            results: {
              alleleFreqP: 0.6,
              alleleFreqQ: 0.4,
              observedCounts: [36, 48, 16],
              expectedCounts: [36, 48, 16],
              chiSquare: 0,
              pValue: 1,
              exactPValue: 0.9821,
              degreesOfFreedom: 1,
              inEquilibrium: true,
              isMonomorphic: false,
              interpretation: 'HW 평형 유지',
              nTotal: 100,
              lowExpectedWarning: false,
              locusResults: [
                {
                  locus: 'Locus 1',
                  observedCounts: [36, 48, 16],
                  expectedCounts: [36, 48, 16],
                  alleleFreqP: 0.6,
                  alleleFreqQ: 0.4,
                  chiSquare: 0,
                  pValue: 1,
                  exactPValue: 0.9821,
                  degreesOfFreedom: 1,
                  inEquilibrium: true,
                  isMonomorphic: false,
                  nTotal: 100,
                  lowExpectedWarning: false,
                },
              ],
            },
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

    expect(block).toContain('#### Hardy-Weinberg 검정')
    expect(block).toContain('대립유전자 빈도 p: 0.6000')
    expect(block).toContain('대립유전자 빈도 q: 0.4000')
    expect(block).toContain('Chi-square: 0.0000')
    expect(block).toContain('Exact p-value: 0.9821')
    expect(block).toContain('표본 수: 100')
    expect(block).toContain('관측 유전자형 수: 36, 48, 16')
    expect(block).toContain('기대 유전자형 수: 36.00, 48.00, 16.00')
    expect(block).toContain('Locus 1: exact p=0.9821, N=100')
    expect(block).not.toContain('HW 평형 유지')
  })

  it('falls back for malformed Hardy-Weinberg bio-tool results', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_hw_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_hw_bad',
        label: 'Malformed Hardy-Weinberg result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_hw_bad', { label: 'Malformed Hardy-Weinberg result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_hw_bad', {
            id: 'bio_hw_bad',
            toolId: 'hardy-weinberg',
            toolNameEn: 'Hardy-Weinberg',
            toolNameKo: 'Hardy-Weinberg 검정',
            csvFileName: 'hw.csv',
            columnConfig: {},
            results: {
              alleleFreqP: 0.6,
              alleleFreqQ: 0.4,
              observedCounts: [36, 48],
              expectedCounts: [36, 48, 16],
              chiSquare: 0,
              pValue: 1,
              exactPValue: 0.9821,
              degreesOfFreedom: 1,
              inEquilibrium: true,
              isMonomorphic: false,
              interpretation: 'HW 평형 유지',
              nTotal: 100,
              lowExpectedWarning: false,
              locusResults: null,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### Hardy-Weinberg 검정')
    expect(block).toContain('입력 파일: hw.csv')
    expect(block).not.toContain('대립유전자 빈도 p')
    expect(block).not.toContain('HW 평형 유지')
  })

  it('writes alpha diversity bio-tool supplementary entities from guarded descriptive indices only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_alpha_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_alpha_1',
        label: 'Alpha diversity result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_alpha_1', { label: 'Alpha diversity result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_alpha_1', {
            id: 'bio_alpha_1',
            toolId: 'alpha-diversity',
            toolNameEn: 'Alpha Diversity',
            toolNameKo: '알파 다양성',
            csvFileName: 'alpha.csv',
            columnConfig: {},
            results: {
              siteCount: 2,
              speciesNames: ['Species A', 'Species B', 'Species C'],
              siteResults: [
                {
                  siteName: 'Site A',
                  speciesRichness: 3,
                  totalAbundance: 15,
                  shannonH: 1.0986,
                  simpsonDominance: 0.3333,
                  simpsonDiversity: 0.6667,
                  simpsonReciprocal: 3,
                  margalef: 0.7381,
                  pielou: 1,
                },
                {
                  siteName: 'Site B',
                  speciesRichness: 2,
                  totalAbundance: 10,
                  shannonH: 0.673,
                  simpsonDominance: 0.52,
                  simpsonDiversity: 0.48,
                  simpsonReciprocal: 1.9231,
                  margalef: 0.4343,
                  pielou: 0.9709,
                },
              ],
              summaryTable: [
                {
                  index: 'shannonH',
                  mean: 0.8858,
                  sd: 0.3002,
                  min: 0.673,
                  max: 1.0986,
                },
                {
                  index: 'simpsonDiversity',
                  mean: 0.5734,
                  sd: 0.1320,
                  min: 0.48,
                  max: 0.6667,
                },
              ],
            },
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

    expect(source.sourceType).toBe('bio-tool-alpha-diversity')
    expect(block).toContain('#### 알파 다양성')
    expect(block).toContain('사이트 수: 2')
    expect(block).toContain('종 수: 3')
    expect(block).toContain("Shannon H': mean=0.8858, SD=0.3002, min=0.6730, max=1.0986")
    expect(block).toContain('Simpson 1-D: mean=0.5734, SD=0.1320, min=0.4800, max=0.6667')
    expect(block).toContain("Site A: S=3, N=15, Shannon H'=1.0986, Simpson 1-D=0.6667")
    expect(block).not.toContain('높은 다양성')
    expect(block).not.toContain('낮은 다양성')
    expect(block).not.toContain('증가')
  })

  it('falls back for malformed alpha diversity bio-tool results instead of inventing diversity summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_alpha_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_alpha_bad',
        label: 'Malformed alpha diversity result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_alpha_bad', { label: 'Malformed alpha diversity result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_alpha_bad', {
            id: 'bio_alpha_bad',
            toolId: 'alpha-diversity',
            toolNameEn: 'Alpha Diversity',
            toolNameKo: '알파 다양성',
            csvFileName: 'alpha.csv',
            columnConfig: {},
            results: {
              siteCount: 1,
              speciesNames: ['Species A'],
              siteResults: [
                {
                  siteName: 'Site A',
                  speciesRichness: 2,
                  totalAbundance: 8,
                  shannonH: 0.6,
                  simpsonDominance: 0.5,
                  simpsonDiversity: 0.5,
                  simpsonReciprocal: 2,
                  margalef: 0.48,
                  pielou: 0.9,
                },
              ],
              summaryTable: [
                {
                  index: 'highDiversity',
                  mean: 0.6,
                  sd: 0,
                  min: 0.6,
                  max: 0.6,
                },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 알파 다양성')
    expect(block).toContain('입력 파일: alpha.csv')
    expect(block).not.toContain('사이트 수')
    expect(block).not.toContain("Shannon H'")
    expect(block).not.toContain('highDiversity')
  })

  it('writes beta diversity bio-tool supplementary entities as distance matrix metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_beta_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_beta_1',
        label: 'Beta diversity result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_beta_1', { label: 'Beta diversity result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_beta_1', {
            id: 'bio_beta_1',
            toolId: 'beta-diversity',
            toolNameEn: 'Beta Diversity',
            toolNameKo: '베타 다양성',
            csvFileName: 'beta.csv',
            columnConfig: {},
            results: {
              metric: 'braycurtis',
              siteLabels: ['Site A', 'Site B', 'Site C'],
              distanceMatrix: [
                [0, 0.12, 0.35],
                [0.12, 0, 0.42],
                [0.35, 0.42, 0],
              ],
            },
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

    expect(source.sourceType).toBe('bio-tool-beta-diversity')
    expect(block).toContain('#### 베타 다양성')
    expect(block).toContain('거리 지표: braycurtis')
    expect(block).toContain('사이트 수: 3')
    expect(block).toContain('사이트 라벨: Site A, Site B, Site C')
    expect(block).toContain('Site B vs Site A: 0.1200')
    expect(block).toContain('Site C vs Site B: 0.4200')
    expect(block).not.toContain('군집')
    expect(block).not.toContain('분리')
    expect(block).not.toContain('유사')
  })

  it('falls back for malformed beta diversity bio-tool results instead of inventing distances', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_beta_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_beta_bad',
        label: 'Malformed beta diversity result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_beta_bad', { label: 'Malformed beta diversity result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_beta_bad', {
            id: 'bio_beta_bad',
            toolId: 'beta-diversity',
            toolNameEn: 'Beta Diversity',
            toolNameKo: '베타 다양성',
            csvFileName: 'beta.csv',
            columnConfig: {},
            results: {
              metric: 'braycurtis',
              siteLabels: ['Site A', 'Site B', 'Site C'],
              distanceMatrix: [
                [0, 0.12],
                [0.11, 0],
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 베타 다양성')
    expect(block).toContain('입력 파일: beta.csv')
    expect(block).not.toContain('거리 지표')
    expect(block).not.toContain('Site B vs Site A')
  })

  it('writes rarefaction bio-tool supplementary entities as curve endpoint metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_rarefaction_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_rarefaction_1',
        label: 'Rarefaction result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_rarefaction_1', { label: 'Rarefaction result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_rarefaction_1', {
            id: 'bio_rarefaction_1',
            toolId: 'rarefaction',
            toolNameEn: 'Rarefaction',
            toolNameKo: '희박화 곡선',
            csvFileName: 'rarefaction.csv',
            columnConfig: {},
            results: {
              curves: [
                {
                  siteName: 'Site A',
                  steps: [1, 5, 10],
                  expectedSpecies: [1, 3.2, 4.1],
                },
                {
                  siteName: 'Site B',
                  steps: [1, 5, 10],
                  expectedSpecies: [1, 2.8, 3.7],
                },
              ],
            },
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

    expect(source.sourceType).toBe('bio-tool-rarefaction')
    expect(block).toContain('#### 희박화 곡선')
    expect(block).toContain('곡선 수: 2')
    expect(block).toContain('사이트 라벨: Site A, Site B')
    expect(block).toContain('Site A: n=10, expected species=4.1000, points=3')
    expect(block).toContain('Site B: n=10, expected species=3.7000, points=3')
    expect(block).not.toContain('충분')
    expect(block).not.toContain('포화')
    expect(block).not.toContain('richness')
  })

  it('falls back for malformed rarefaction bio-tool results instead of inventing curve summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_rarefaction_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_rarefaction_bad',
        label: 'Malformed rarefaction result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_rarefaction_bad', { label: 'Malformed rarefaction result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_rarefaction_bad', {
            id: 'bio_rarefaction_bad',
            toolId: 'rarefaction',
            toolNameEn: 'Rarefaction',
            toolNameKo: '희박화 곡선',
            csvFileName: 'rarefaction.csv',
            columnConfig: {},
            results: {
              curves: [
                {
                  siteName: 'Site A',
                  steps: [1, 5, 4],
                  expectedSpecies: [1, 3.2],
                },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 희박화 곡선')
    expect(block).toContain('입력 파일: rarefaction.csv')
    expect(block).not.toContain('곡선 수')
    expect(block).not.toContain('expected species')
  })

  it('falls back for empty rarefaction curves instead of crashing the writer', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_rarefaction_empty',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_rarefaction_empty',
        label: 'Empty rarefaction result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_rarefaction_empty', { label: 'Empty rarefaction result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_rarefaction_empty', {
            id: 'bio_rarefaction_empty',
            toolId: 'rarefaction',
            toolNameEn: 'Rarefaction',
            toolNameKo: '희박화 곡선',
            csvFileName: 'rarefaction.csv',
            columnConfig: {},
            results: {
              curves: [
                {
                  siteName: 'Site A',
                  steps: [],
                  expectedSpecies: [],
                },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 희박화 곡선')
    expect(block).toContain('입력 파일: rarefaction.csv')
    expect(block).not.toContain('expected species')
  })

  it('writes condition factor bio-tool supplementary entities as descriptive K metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_condition_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_condition_1',
        label: 'Condition factor result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_condition_1', { label: 'Condition factor result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_condition_1', {
            id: 'bio_condition_1',
            toolId: 'condition-factor',
            toolNameEn: "Fulton's Condition Factor",
            toolNameKo: '비만도 지수',
            csvFileName: 'condition.csv',
            columnConfig: {},
            results: {
              individualK: [1.1, 1.2, 1.4, 1.5],
              mean: 1.3,
              std: 0.1826,
              median: 1.3,
              min: 1.1,
              max: 1.5,
              n: 4,
              groupStats: {
                A: { mean: 1.15, std: 0.0707, n: 2, median: 1.15 },
                B: { mean: 1.45, std: 0.0707, n: 2, median: 1.45 },
              },
              comparison: {
                test: 't-test',
                statistic: 4.2426,
                pValue: 0.051,
                df: 2,
              },
            },
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

    expect(source.sourceType).toBe('bio-tool-condition-factor')
    expect(block).toContain('#### 비만도 지수')
    expect(block).toContain('표본 수: 4')
    expect(block).toContain('평균 K: 1.3000')
    expect(block).toContain('범위: 1.1000 - 1.5000')
    expect(block).toContain('A: mean=1.1500, SD=0.0707, median=1.1500, N=2')
    expect(block).toContain('그룹 비교 검정: t-test, t=4.2426, p=0.0510, df=2')
    expect(block).not.toContain('좋')
    expect(block).not.toContain('나쁨')
    expect(block).not.toContain('유의')
  })

  it('falls back for malformed condition factor bio-tool results instead of inventing K summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_condition_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_condition_bad',
        label: 'Malformed condition factor result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_condition_bad', { label: 'Malformed condition factor result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_condition_bad', {
            id: 'bio_condition_bad',
            toolId: 'condition-factor',
            toolNameEn: "Fulton's Condition Factor",
            toolNameKo: '비만도 지수',
            csvFileName: 'condition.csv',
            columnConfig: {},
            results: {
              individualK: [1.1, 1.2],
              mean: 1.3,
              std: 0.1826,
              median: 1.3,
              min: 1.5,
              max: 1.1,
              n: 4,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 비만도 지수')
    expect(block).toContain('입력 파일: condition.csv')
    expect(block).not.toContain('평균 K')
    expect(block).not.toContain('범위')
  })

  it('falls back for inconsistent condition factor group counts and ANOVA df', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_condition_inconsistent',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_condition_inconsistent',
        label: 'Inconsistent condition factor result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_condition_inconsistent', { label: 'Inconsistent condition factor result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_condition_inconsistent', {
            id: 'bio_condition_inconsistent',
            toolId: 'condition-factor',
            toolNameEn: "Fulton's Condition Factor",
            toolNameKo: '비만도 지수',
            csvFileName: 'condition.csv',
            columnConfig: {},
            results: {
              individualK: [1.1, 1.2, 1.4, 1.5],
              mean: 1.3,
              std: 0.1826,
              median: 1.3,
              min: 1.1,
              max: 1.5,
              n: 4,
              groupStats: {
                A: { mean: 1.15, std: 0.0707, n: 3, median: 1.15 },
                B: { mean: 1.45, std: 0.0707, n: 3, median: 1.45 },
              },
              comparison: {
                test: 'ANOVA',
                statistic: 4.2426,
                pValue: 0.051,
                df: 1,
              },
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 비만도 지수')
    expect(block).toContain('입력 파일: condition.csv')
    expect(block).not.toContain('그룹별 기술통계')
    expect(block).not.toContain('ANOVA')
  })

  it('writes ROC-AUC bio-tool supplementary entities as diagnostic curve metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_roc_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_roc_1',
        label: 'ROC-AUC result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_roc_1', { label: 'ROC-AUC result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_roc_1', {
            id: 'bio_roc_1',
            toolId: 'roc-auc',
            toolNameEn: 'ROC-AUC',
            toolNameKo: 'ROC-AUC',
            csvFileName: 'roc.csv',
            columnConfig: {},
            results: {
              rocPoints: [
                { fpr: 0, tpr: 0 },
                { fpr: 0.2, tpr: 0.7 },
                { fpr: 1, tpr: 1 },
              ],
              auc: 0.8123,
              aucCI: { lower: 0.7012, upper: 0.9234 },
              optimalThreshold: 1.2345,
              sensitivity: 0.75,
              specificity: 0.8,
            },
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

    expect(source.sourceType).toBe('bio-tool-roc-auc')
    expect(block).toContain('#### ROC-AUC')
    expect(block).toContain('AUC: 0.8123')
    expect(block).toContain('AUC CI: [0.7012, 0.9234]')
    expect(block).toContain('임계값: 1.2345')
    expect(block).toContain('민감도: 0.7500')
    expect(block).toContain('특이도: 0.8000')
    expect(block).toContain('ROC points: 3')
    expect(block).not.toContain('최적')
    expect(block).not.toContain('우수')
    expect(block).not.toContain('불량')
    expect(block).not.toContain('임상')
  })

  it('falls back for malformed ROC-AUC bio-tool results instead of inventing diagnostic summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_roc_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_roc_bad',
        label: 'Malformed ROC-AUC result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_roc_bad', { label: 'Malformed ROC-AUC result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_roc_bad', {
            id: 'bio_roc_bad',
            toolId: 'roc-auc',
            toolNameEn: 'ROC-AUC',
            toolNameKo: 'ROC-AUC',
            csvFileName: 'roc.csv',
            columnConfig: {},
            results: {
              rocPoints: [],
              auc: 0.8123,
              aucCI: { lower: 0.9, upper: 0.7 },
              optimalThreshold: 1.2345,
              sensitivity: 1.2,
              specificity: 0.8,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### ROC-AUC')
    expect(block).toContain('입력 파일: roc.csv')
    expect(block).not.toContain('AUC:')
    expect(block).not.toContain('민감도')
    expect(block).not.toContain('ROC points')
  })

  it('writes meta-analysis bio-tool supplementary entities as pooled and study-level metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_meta_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_meta_1',
        label: 'Meta-analysis result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_meta_1', { label: 'Meta-analysis result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_meta_1', {
            id: 'bio_meta_1',
            toolId: 'meta-analysis',
            toolNameEn: 'Meta-Analysis',
            toolNameKo: '메타분석',
            csvFileName: 'meta.csv',
            columnConfig: {},
            results: {
              pooledEffect: 0.42,
              pooledSE: 0.08,
              ci: [0.26, 0.58],
              zValue: 5.25,
              pValue: 0.0001,
              Q: 6.4,
              QpValue: 0.17,
              iSquared: 37.5,
              tauSquared: 0.012,
              model: 'random-effects',
              weights: [34.5, 33.2, 32.3],
              studyCiLower: [0.1, 0.2, 0.3],
              studyCiUpper: [0.5, 0.6, 0.7],
              studyNames: ['Study A', 'Study B', 'Study C'],
              effectSizes: [0.3, 0.4, 0.5],
            },
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

    expect(source.sourceType).toBe('bio-tool-meta-analysis')
    expect(block).toContain('#### 메타분석')
    expect(block).toContain('연구 수: 3')
    expect(block).toContain('모델: random-effects')
    expect(block).toContain('Pooled effect: 0.4200')
    expect(block).toContain('CI: [0.2600, 0.5800]')
    expect(block).toContain('Q p-value: 0.1700')
    expect(block).toContain('I²: 37.5000')
    expect(block).toContain('Study A: effect=0.3000, CI=[0.1000, 0.5000], weight=34.5000')
    expect(block).not.toContain('유의')
    expect(block).not.toContain('높은 이질성')
    expect(block).not.toContain('모델 선택')
  })

  it('falls back for malformed meta-analysis bio-tool results instead of inventing pooled summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_meta_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_meta_bad',
        label: 'Malformed meta-analysis result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_meta_bad', { label: 'Malformed meta-analysis result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_meta_bad', {
            id: 'bio_meta_bad',
            toolId: 'meta-analysis',
            toolNameEn: 'Meta-Analysis',
            toolNameKo: '메타분석',
            csvFileName: 'meta.csv',
            columnConfig: {},
            results: {
              pooledEffect: 0.42,
              pooledSE: 0.08,
              ci: [0.58, 0.26],
              zValue: 5.25,
              pValue: 0.0001,
              Q: 6.4,
              QpValue: 0.17,
              iSquared: 137.5,
              tauSquared: 0.012,
              model: 'random-effects',
              weights: [34.5, 33.2],
              studyCiLower: [0.1, 0.2, 0.3],
              studyCiUpper: [0.5, 0.6, 0.7],
              studyNames: ['Study A', 'Study B', 'Study C'],
              effectSizes: [0.3, 0.4, 0.5],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 메타분석')
    expect(block).toContain('입력 파일: meta.csv')
    expect(block).not.toContain('Pooled effect')
    expect(block).not.toContain('I²')
    expect(block).not.toContain('Study A')
  })

  it('falls back for blank meta-analysis study names', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_meta_blank_study',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_meta_blank_study',
        label: 'Blank study meta-analysis result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_meta_blank_study', { label: 'Blank study meta-analysis result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_meta_blank_study', {
            id: 'bio_meta_blank_study',
            toolId: 'meta-analysis',
            toolNameEn: 'Meta-Analysis',
            toolNameKo: '메타분석',
            csvFileName: 'meta.csv',
            columnConfig: {},
            results: {
              pooledEffect: 0.42,
              pooledSE: 0.08,
              ci: [0.26, 0.58],
              zValue: 5.25,
              pValue: 0.0001,
              Q: 6.4,
              QpValue: 0.17,
              iSquared: 37.5,
              tauSquared: 0.012,
              model: 'random-effects',
              weights: [50, 50],
              studyCiLower: [0.1, 0.2],
              studyCiUpper: [0.5, 0.6],
              studyNames: ['Study A', ''],
              effectSizes: [0.3, 0.4],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 메타분석')
    expect(block).toContain('입력 파일: meta.csv')
    expect(block).not.toContain('개별 연구 수치')
    expect(block).not.toContain('Study A')
  })

  it('writes survival bio-tool supplementary entities as Kaplan-Meier metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_survival_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_survival_1',
        label: 'Survival result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_survival_1', { label: 'Survival result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_survival_1', {
            id: 'bio_survival_1',
            toolId: 'survival',
            toolNameEn: 'Survival Analysis',
            toolNameKo: '생존 분석',
            csvFileName: 'survival.csv',
            columnConfig: {},
            results: {
              curves: {
                Control: {
                  time: [0, 5, 10],
                  survival: [1, 0.6667, 0.3333],
                  ciLo: [1, 0.4, 0.1],
                  ciHi: [1, 0.9, 0.7],
                  atRisk: [3, 2, 1],
                  medianSurvival: 10,
                  censored: [8],
                  nEvents: 2,
                },
                Treatment: {
                  time: [0, 6, 12],
                  survival: [1, 0.6667, 0.6667],
                  ciLo: [1, 0.4, 0.4],
                  ciHi: [1, 0.9, 0.9],
                  atRisk: [3, 2, 1],
                  medianSurvival: null,
                  censored: [9, 12],
                  nEvents: 1,
                },
              },
              logRankP: 0.0412,
              medianSurvivalTime: 10,
            },
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

    expect(source.sourceType).toBe('bio-tool-survival')
    expect(block).toContain('#### 생존 분석')
    expect(block).toContain('곡선 수: 2')
    expect(block).toContain('Log-rank p-value: 0.0412')
    expect(block).toContain('대표 중앙 생존 시간: 10.0000')
    expect(block).toContain('Control: N=3, events=2, censored=1, median=10.0000, points=3')
    expect(block).toContain('Treatment: N=3, events=1, censored=2, median=NA, points=3')
    expect(block).toContain('Control: time=10.0000, survival=0.3333, CI=[0.1000, 0.7000], atRisk=1')
    expect(block).not.toContain('유의')
    expect(block).not.toContain('차이')
    expect(block).not.toContain('효과')
    expect(block).not.toContain('위험')
  })

  it('falls back for malformed survival bio-tool results instead of inventing survival summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_survival_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_survival_bad',
        label: 'Malformed survival result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_survival_bad', { label: 'Malformed survival result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_survival_bad', {
            id: 'bio_survival_bad',
            toolId: 'survival',
            toolNameEn: 'Survival Analysis',
            toolNameKo: '생존 분석',
            csvFileName: 'survival.csv',
            columnConfig: {},
            results: {
              curves: {
                Control: {
                  time: [0, 10, 5],
                  survival: [1, 0.6667],
                  ciLo: [1, 0.4, 0.1],
                  ciHi: [1, 0.9, 0.7],
                  atRisk: [3, 2, 1],
                  medianSurvival: 10,
                  censored: [8],
                  nEvents: 2,
                },
              },
              logRankP: 1.2,
              medianSurvivalTime: 10,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 생존 분석')
    expect(block).toContain('입력 파일: survival.csv')
    expect(block).not.toContain('곡선 수')
    expect(block).not.toContain('Log-rank')
    expect(block).not.toContain('Control: N=')
  })

  it('falls back for survival bio-tool results with impossible at-risk trajectories', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_survival_bad_at_risk',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_survival_bad_at_risk',
        label: 'Invalid at-risk survival result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_survival_bad_at_risk', { label: 'Invalid at-risk survival result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_survival_bad_at_risk', {
            id: 'bio_survival_bad_at_risk',
            toolId: 'survival',
            toolNameEn: 'Survival Analysis',
            toolNameKo: '생존 분석',
            csvFileName: 'survival.csv',
            columnConfig: {},
            results: {
              curves: {
                Control: {
                  time: [0, 5, 10],
                  survival: [1, 0.6667, 0.3333],
                  ciLo: [1, 0.4, 0.1],
                  ciHi: [1, 0.9, 0.7],
                  atRisk: [3, 4, 2],
                  medianSurvival: 10,
                  censored: [8],
                  nEvents: 2,
                },
              },
              logRankP: null,
              medianSurvivalTime: 10,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 생존 분석')
    expect(block).toContain('입력 파일: survival.csv')
    expect(block).not.toContain('Control: N=')
    expect(block).not.toContain('atRisk')
  })

  it('writes ICC bio-tool supplementary entities as reliability metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_icc_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_icc_1',
        label: 'ICC result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_icc_1', { label: 'ICC result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_icc_1', {
            id: 'bio_icc_1',
            toolId: 'icc',
            toolNameEn: 'ICC',
            toolNameKo: 'ICC 분석',
            csvFileName: 'icc.csv',
            columnConfig: {},
            results: {
              icc: 0.72,
              iccType: 'ICC3_1',
              fValue: 8.45,
              df1: 11,
              df2: 22,
              pValue: 0.0003,
              ci: [0.45, 0.88],
              msRows: 2.34,
              msCols: 0.18,
              msError: 0.27,
              nSubjects: 12,
              nRaters: 3,
              interpretation: 'good',
            },
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

    expect(source.sourceType).toBe('bio-tool-icc')
    expect(block).toContain('#### ICC 분석')
    expect(block).toContain('ICC 유형: ICC3_1')
    expect(block).toContain('ICC: 0.7200')
    expect(block).toContain('CI: [0.4500, 0.8800]')
    expect(block).toContain('F: 8.4500')
    expect(block).toContain('df: 11.0000, 22.0000')
    expect(block).toContain('p-value: 0.0003')
    expect(block).toContain('대상 수: 12')
    expect(block).toContain('평가자 수: 3')
    expect(block).toContain('MS rows: 2.3400')
    expect(block).toContain('MS cols: 0.1800')
    expect(block).toContain('MS error: 0.2700')
    expect(block).not.toContain('good')
    expect(block).not.toContain('excellent')
    expect(block).not.toContain('양호')
    expect(block).not.toContain('우수')
    expect(block).not.toContain('해석')
  })

  it('falls back for malformed ICC bio-tool results instead of inventing reliability summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_icc_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_icc_bad',
        label: 'Malformed ICC result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_icc_bad', { label: 'Malformed ICC result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_icc_bad', {
            id: 'bio_icc_bad',
            toolId: 'icc',
            toolNameEn: 'ICC',
            toolNameKo: 'ICC 분석',
            csvFileName: 'icc.csv',
            columnConfig: {},
            results: {
              icc: 0.72,
              iccType: 'ICC4_1',
              fValue: 8.45,
              df1: 11,
              df2: 22,
              pValue: 1.2,
              ci: [0.88, 0.45],
              msRows: 2.34,
              msCols: 0.18,
              msError: 0.27,
              nSubjects: 12,
              nRaters: 3,
              interpretation: 'good',
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### ICC 분석')
    expect(block).toContain('입력 파일: icc.csv')
    expect(block).not.toContain('ICC 유형')
    expect(block).not.toContain('MS rows')
    expect(block).not.toContain('대상 수')
  })

  it('falls back for ICC bio-tool results with impossible subject or rater counts', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_icc_bad_counts',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_icc_bad_counts',
        label: 'Invalid count ICC result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_icc_bad_counts', { label: 'Invalid count ICC result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_icc_bad_counts', {
            id: 'bio_icc_bad_counts',
            toolId: 'icc',
            toolNameEn: 'ICC',
            toolNameKo: 'ICC 분석',
            csvFileName: 'icc.csv',
            columnConfig: {},
            results: {
              icc: 0.72,
              iccType: 'ICC3_1',
              fValue: 8.45,
              df1: 11,
              df2: 22,
              pValue: 0.0003,
              ci: [0.45, 0.88],
              msRows: 2.34,
              msCols: 0.18,
              msError: 0.27,
              nSubjects: 2,
              nRaters: 1,
              interpretation: 'good',
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### ICC 분석')
    expect(block).toContain('입력 파일: icc.csv')
    expect(block).not.toContain('ICC 유형')
    expect(block).not.toContain('대상 수')
    expect(block).not.toContain('평가자 수')
  })

  it('writes length-weight bio-tool supplementary entities as regression metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_lw_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_lw_1',
        label: 'Length-weight result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_lw_1', { label: 'Length-weight result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_lw_1', {
            id: 'bio_lw_1',
            toolId: 'length-weight',
            toolNameEn: 'Length-Weight Relationship',
            toolNameKo: '체장-체중 관계',
            csvFileName: 'length-weight.csv',
            columnConfig: {},
            results: {
              a: 0.012345,
              b: 3.1234,
              logA: -4.3945,
              rSquared: 0.9321,
              bStdError: 0.0412,
              isometricTStat: 2.9951,
              isometricPValue: 0.0123,
              growthType: 'positive_allometric',
              predicted: [10.2, 12.4, 15.8],
              nObservations: 3,
              logLogPoints: [
                { logL: 2.1, logW: 3.2 },
                { logL: 2.2, logW: 3.4 },
                { logL: 2.3, logW: 3.6 },
              ],
            },
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

    expect(source.sourceType).toBe('bio-tool-length-weight')
    expect(block).toContain('#### 체장-체중 관계')
    expect(block).toContain('관측치 수: 3')
    expect(block).toContain('관계식: W = 1.2345e-2 × L^3.1234')
    expect(block).toContain('b SE: 0.0412')
    expect(block).toContain('R²: 0.9321')
    expect(block).toContain('등성장 검정: t=2.9951, p=0.0123')
    expect(block).not.toContain('positive_allometric')
    expect(block).not.toContain('양의 이성장')
    expect(block).not.toContain('유의')
  })

  it('falls back for malformed length-weight bio-tool results instead of inventing regression metrics', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_lw_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_lw_bad',
        label: 'Malformed length-weight result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_lw_bad', { label: 'Malformed length-weight result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_lw_bad', {
            id: 'bio_lw_bad',
            toolId: 'length-weight',
            toolNameEn: 'Length-Weight Relationship',
            toolNameKo: '체장-체중 관계',
            csvFileName: 'length-weight.csv',
            columnConfig: {},
            results: {
              a: 0.012345,
              b: 3.1234,
              logA: -4.3945,
              rSquared: 1.2,
              bStdError: 0.0412,
              isometricTStat: 2.9951,
              isometricPValue: 0.0123,
              growthType: 'positive_allometric',
              predicted: [10.2],
              nObservations: 3,
              logLogPoints: [
                { logL: 2.1, logW: 3.2 },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 체장-체중 관계')
    expect(block).toContain('입력 파일: length-weight.csv')
    expect(block).not.toContain('관계식')
    expect(block).not.toContain('R²')
    expect(block).not.toContain('positive_allometric')
  })

  it('writes VBGF bio-tool supplementary entities as parameter and fit metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_vbgf_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_vbgf_1',
        label: 'VBGF result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_vbgf_1', { label: 'VBGF result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_vbgf_1', {
            id: 'bio_vbgf_1',
            toolId: 'vbgf',
            toolNameEn: 'VBGF',
            toolNameKo: 'VBGF 성장곡선',
            csvFileName: 'vbgf.csv',
            columnConfig: {},
            results: {
              lInf: 82.3,
              k: 0.31,
              t0: -0.42,
              standardErrors: [2.1, 0.03, 0.12],
              ci95: [4.116, 0.0588, 0.2352],
              rSquared: 0.91,
              predicted: [12.1, 25.4, 38.7, 51.2],
              residuals: [0.4, -0.2, 0.1, -0.3],
              nObservations: 4,
              aic: 12.34,
              parameterTable: [
                { name: 'L∞', unit: '', estimate: 82.3, standardError: 2.1, ciLower: 78.184, ciUpper: 86.416 },
                { name: 'K', unit: 'yr⁻¹', estimate: 0.31, standardError: 0.03, ciLower: 0.2512, ciUpper: 0.3688 },
                { name: 't₀', unit: 'yr', estimate: -0.42, standardError: 0.12, ciLower: -0.6552, ciUpper: -0.1848 },
              ],
            },
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

    expect(source.sourceType).toBe('bio-tool-vbgf')
    expect(block).toContain('#### VBGF 성장곡선')
    expect(block).toContain('L∞: 82.3000')
    expect(block).toContain('K: 0.3100')
    expect(block).toContain('t₀: -0.4200')
    expect(block).toContain('R²: 0.9100')
    expect(block).toContain('AIC: 12.3400')
    expect(block).toContain('관측치 수: 4')
    expect(block).toContain('예측값 수: 4')
    expect(block).toContain('잔차 수: 4')
    expect(block).toContain('파라미터 추정값')
    expect(block).toContain('K yr⁻¹: estimate=0.3100, SE=0.0300, CI=[0.2512, 0.3688]')
    expect(block).not.toContain('성장 양상')
    expect(block).not.toContain('좋은 적합')
    expect(block).not.toContain('우수')
    expect(block).not.toContain('해석')
  })

  it('falls back for malformed VBGF bio-tool results instead of inventing growth curve summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_vbgf_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_vbgf_bad',
        label: 'Malformed VBGF result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_vbgf_bad', { label: 'Malformed VBGF result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_vbgf_bad', {
            id: 'bio_vbgf_bad',
            toolId: 'vbgf',
            toolNameEn: 'VBGF',
            toolNameKo: 'VBGF 성장곡선',
            csvFileName: 'vbgf.csv',
            columnConfig: {},
            results: {
              lInf: 82.3,
              k: 0.31,
              t0: -0.42,
              standardErrors: [2.1, 0.03],
              ci95: [4.116, 0.0588, 0.2352],
              rSquared: 1.2,
              predicted: [12.1, 25.4],
              residuals: [0.4, -0.2, 0.1, -0.3],
              nObservations: 4,
              aic: 12.34,
              parameterTable: [
                { name: 'L∞', unit: '', estimate: 82.3, standardError: 2.1, ciLower: 86.416, ciUpper: 78.184 },
                { name: 'K', unit: 'yr⁻¹', estimate: 0.31, standardError: 0.03, ciLower: 0.2512, ciUpper: 0.3688 },
                { name: 't₀', unit: 'yr', estimate: -0.42, standardError: 0.12, ciLower: -0.6552, ciUpper: -0.1848 },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### VBGF 성장곡선')
    expect(block).toContain('입력 파일: vbgf.csv')
    expect(block).not.toContain('L∞:')
    expect(block).not.toContain('파라미터 추정값')
    expect(block).not.toContain('AIC')
  })

  it('falls back for VBGF bio-tool results with inconsistent parameter rows', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_vbgf_mismatch',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_vbgf_mismatch',
        label: 'Inconsistent VBGF result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_vbgf_mismatch', { label: 'Inconsistent VBGF result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_vbgf_mismatch', {
            id: 'bio_vbgf_mismatch',
            toolId: 'vbgf',
            toolNameEn: 'VBGF',
            toolNameKo: 'VBGF 성장곡선',
            csvFileName: 'vbgf.csv',
            columnConfig: {},
            results: {
              lInf: 82.3,
              k: 0.31,
              t0: -0.42,
              standardErrors: [2.1, 0.03, 0.12],
              ci95: [4.116, 0.0588, 0.2352],
              rSquared: 0.91,
              predicted: [12.1, 25.4, 38.7, 51.2],
              residuals: [0.4, -0.2, 0.1, -0.3],
              nObservations: 4,
              aic: 12.34,
              parameterTable: [
                { name: 'L∞', unit: '', estimate: 82.3, standardError: 2.1, ciLower: 78.184, ciUpper: 86.416 },
                { name: 'K', unit: 'yr⁻¹', estimate: 0.41, standardError: 0.03, ciLower: 0.2512, ciUpper: 0.3688 },
                { name: 't₀', unit: 'yr', estimate: -0.42, standardError: 0.12, ciLower: -0.6552, ciUpper: -0.1848 },
              ],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### VBGF 성장곡선')
    expect(block).toContain('입력 파일: vbgf.csv')
    expect(block).not.toContain('K yr⁻¹')
    expect(block).not.toContain('파라미터 추정값')
  })

  it('writes NMDS bio-tool supplementary entities as coordinate metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_nmds_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_nmds_1',
        label: 'NMDS result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_nmds_1', { label: 'NMDS result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_nmds_1', {
            id: 'bio_nmds_1',
            toolId: 'nmds',
            toolNameEn: 'NMDS',
            toolNameKo: 'NMDS 시각화',
            csvFileName: 'nmds.csv',
            columnConfig: {},
            results: {
              coordinates: [
                [0.12345, -0.23456],
                [0.34567, 0.45678],
                [-0.56789, 0.67891],
              ],
              stress: 0.123456,
              stressInterpretation: 'fair',
              siteLabels: ['Site A', 'Site B', 'Site C'],
              groups: ['G1', 'G1', 'G2'],
            },
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

    expect(source.sourceType).toBe('bio-tool-nmds')
    expect(block).toContain('#### NMDS 시각화')
    expect(block).toContain('Stress: 0.123456')
    expect(block).toContain('차원 수: 2')
    expect(block).toContain('지점 수: 3')
    expect(block).toContain('그룹 수: 2')
    expect(block).toContain('Site A: [0.1235, -0.2346], group=G1')
    expect(block).not.toContain('fair')
    expect(block).not.toContain('군집 분리')
    expect(block).not.toContain('gradient')
    expect(block).not.toContain('해석')
  })

  it('falls back for malformed NMDS bio-tool results instead of inventing ordination summaries', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_nmds_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_nmds_bad',
        label: 'Malformed NMDS result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_nmds_bad', { label: 'Malformed NMDS result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_nmds_bad', {
            id: 'bio_nmds_bad',
            toolId: 'nmds',
            toolNameEn: 'NMDS',
            toolNameKo: 'NMDS 시각화',
            csvFileName: 'nmds.csv',
            columnConfig: {},
            results: {
              coordinates: [
                [0.12345, -0.23456],
                [0.34567],
                [-0.56789, 0.67891],
              ],
              stress: -0.1,
              stressInterpretation: 'fair',
              siteLabels: ['Site A', 'Site B'],
              groups: ['G1', 'G1', 'G2'],
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### NMDS 시각화')
    expect(block).toContain('입력 파일: nmds.csv')
    expect(block).not.toContain('Stress:')
    expect(block).not.toContain('좌표')
    expect(block).not.toContain('Site A:')
  })

  it('writes PERMANOVA bio-tool supplementary entities as permutation metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_permanova_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_permanova_1',
        label: 'PERMANOVA result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_permanova_1', { label: 'PERMANOVA result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_permanova_1', {
            id: 'bio_permanova_1',
            toolId: 'permanova',
            toolNameEn: 'PERMANOVA',
            toolNameKo: 'PERMANOVA',
            csvFileName: 'permanova.csv',
            columnConfig: {},
            results: {
              pseudoF: 4.321,
              pValue: 0.012,
              rSquared: 0.2345,
              permutations: 999,
              ssBetween: 12.3,
              ssWithin: 40.2,
              ssTotal: 52.5,
            },
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

    expect(source.sourceType).toBe('bio-tool-permanova')
    expect(block).toContain('#### PERMANOVA')
    expect(block).toContain('Pseudo-F: 4.3210')
    expect(block).toContain('p-value: 0.0120')
    expect(block).toContain('R²: 0.2345')
    expect(block).toContain('순열 수: 999')
    expect(block).toContain('SS (집단 간): 12.3000')
    expect(block).toContain('SS (집단 내): 40.2000')
    expect(block).toContain('SS (전체): 52.5000')
    expect(block).not.toContain('유의')
    expect(block).not.toContain('집단 차이')
  })

  it('falls back for malformed PERMANOVA bio-tool results instead of inventing permutation metrics', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_permanova_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_permanova_bad',
        label: 'Malformed PERMANOVA result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_permanova_bad', { label: 'Malformed PERMANOVA result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_permanova_bad', {
            id: 'bio_permanova_bad',
            toolId: 'permanova',
            toolNameEn: 'PERMANOVA',
            toolNameKo: 'PERMANOVA',
            csvFileName: 'permanova.csv',
            columnConfig: {},
            results: {
              pseudoF: 4.321,
              pValue: 1.2,
              rSquared: 0.2345,
              permutations: 999,
              ssBetween: 12.3,
              ssWithin: 40.2,
              ssTotal: 60,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### PERMANOVA')
    expect(block).toContain('입력 파일: permanova.csv')
    expect(block).not.toContain('Pseudo-F')
    expect(block).not.toContain('순열 수')
  })

  it('writes Mantel test bio-tool supplementary entities as permutation correlation metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_mantel_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_mantel_1',
        label: 'Mantel result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_mantel_1', { label: 'Mantel result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_mantel_1', {
            id: 'bio_mantel_1',
            toolId: 'mantel-test',
            toolNameEn: 'Mantel Test',
            toolNameKo: 'Mantel 검정',
            csvFileName: 'mantel.csv',
            columnConfig: {},
            results: {
              r: 0.4567,
              pValue: 0.034,
              permutations: 999,
              method: 'pearson',
            },
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

    expect(source.sourceType).toBe('bio-tool-mantel-test')
    expect(block).toContain('#### Mantel 검정')
    expect(block).toContain('Mantel r: 0.4567')
    expect(block).toContain('p-value: 0.0340')
    expect(block).toContain('순열 수: 999')
    expect(block).toContain('방법: pearson')
    expect(block).not.toContain('유의')
    expect(block).not.toContain('강한 상관')
    expect(block).not.toContain('인과')
  })

  it('falls back for malformed Mantel test bio-tool results instead of inventing correlation metrics', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_mantel_bad',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_mantel_bad',
        label: 'Malformed Mantel result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_mantel_bad', { label: 'Malformed Mantel result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_mantel_bad', {
            id: 'bio_mantel_bad',
            toolId: 'mantel-test',
            toolNameEn: 'Mantel Test',
            toolNameKo: 'Mantel 검정',
            csvFileName: 'mantel.csv',
            columnConfig: {},
            results: {
              r: 1.4,
              pValue: 0.034,
              permutations: 999,
              method: 'pearson',
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### Mantel 검정')
    expect(block).toContain('입력 파일: mantel.csv')
    expect(block).not.toContain('Mantel r')
    expect(block).not.toContain('순열 수')
  })

  it('keeps species-validation bio-tool supplementary entities on generic fallback until a schema exists', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_species_validation_1',
        projectId: 'proj_1',
        entityKind: 'bio-tool-result',
        entityId: 'bio_species_validation_1',
        label: 'Species validation result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bio_species_validation_1', { label: 'Species validation result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map([
          ['bio_species_validation_1', {
            id: 'bio_species_validation_1',
            toolId: 'species-validation',
            toolNameEn: 'Species Validation',
            toolNameKo: '학명 검증',
            csvFileName: 'species.csv',
            columnConfig: {},
            results: {
              inputName: 'Gadus morhua',
              matchedName: 'Gadus morhua',
              status: 'accepted',
              confidence: 0.99,
              protectedSpecies: false,
            },
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

    expect(source.sourceType).toBe('supplementary')
    expect(block).toContain('#### 학명 검증')
    expect(block).toContain('입력 파일: species.csv')
    expect(block).not.toContain('Gadus morhua')
    expect(block).not.toContain('accepted')
    expect(block).not.toContain('0.99')
    expect(block).not.toContain('보호종')
    expect(block).not.toContain('확정')
  })

  it('writes BOLD supplementary entities with candidate wording instead of confirmed identification', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_bold_1',
        projectId: 'proj_1',
        entityKind: 'bold-result',
        entityId: 'bold_1',
        label: 'BOLD result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'bold_1', { label: 'BOLD result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map(),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map(),
        phylogenyById: new Map(),
        boldById: new Map([
          ['bold_1', {
            id: 'bold_1',
            type: 'bold',
            sampleName: 'Sample A',
            db: 'species',
            searchMode: 'rapid',
            sequencePreview: 'ATGC',
            sequence: 'ATGC',
            topSpecies: 'Gadus morhua',
            topSimilarity: 0.987,
            topBin: 'BOLD:AAA0001',
            hitCount: 12,
            createdAt: Date.now(),
          }],
        ]),
        translationById: new Map(),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### Sample A')
    expect(block).toContain('후보 동정: Gadus morhua')
    expect(block).toContain('최고 유사도: 98.7%')
    expect(block).toContain('BIN: BOLD:AAA0001')
    expect(block).not.toContain('확정')
  })

  it('writes sequence statistics as deterministic supplementary metrics only', () => {
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
        seqStatsById: new Map([
          ['seq_1', {
            id: 'seq_1',
            type: 'seq-stats',
            analysisName: 'COI sequence statistics',
            sequenceCount: 24,
            meanLength: 658.4,
            overallGcContent: 42.34,
            createdAt: Date.now(),
          }],
        ]),
        similarityById: new Map(),
        phylogenyById: new Map(),
        boldById: new Map(),
        translationById: new Map(),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### COI sequence statistics')
    expect(block).toContain('서열 수: 24')
    expect(block).toContain('평균 길이: 658.4')
    expect(block).toContain('전체 GC 함량: 42.3%')
    expect(block).not.toContain('품질')
    expect(block).not.toContain('종')
  })

  it('writes translation supplementary entities as processing summaries only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_translation_1',
        projectId: 'proj_1',
        entityKind: 'translation-result',
        entityId: 'translation_1',
        label: 'Translation result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'translation_1', { label: 'Translation result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map(),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map(),
        phylogenyById: new Map(),
        boldById: new Map(),
        translationById: new Map([
          ['translation_1', {
            id: 'translation_1',
            type: 'translation',
            analysisName: 'COI translation',
            sequenceLength: 658,
            geneticCode: 5,
            geneticCodeName: 'Invertebrate Mitochondrial',
            analysisMode: 'orf',
            orfCount: 2,
            createdAt: Date.now(),
          }],
        ]),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### COI translation')
    expect(block).toContain('입력 서열 길이: 658 nt')
    expect(block).toContain('유전 암호: Invertebrate Mitochondrial')
    expect(block).toContain('분석 모드: ORF 탐색')
    expect(block).toContain('ORF count: 2')
    expect(block).not.toContain('기능')
    expect(block).not.toContain('coding potential')
  })

  it('writes similarity supplementary entities as distance metrics only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_similarity_1',
        projectId: 'proj_1',
        entityKind: 'similarity-result',
        entityId: 'similarity_1',
        label: 'Similarity result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'similarity_1', { label: 'Similarity result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map(),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map([
          ['similarity_1', {
            id: 'similarity_1',
            type: 'similarity',
            analysisName: 'COI pairwise distances',
            sequenceCount: 18,
            distanceModel: 'K2P',
            alignmentLength: 642,
            meanDistance: 0.03456,
            createdAt: Date.now(),
          }],
        ]),
        phylogenyById: new Map(),
        boldById: new Map(),
        translationById: new Map(),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### COI pairwise distances')
    expect(block).toContain('서열 수: 18')
    expect(block).toContain('거리 모델: K2P')
    expect(block).toContain('정렬 길이: 642')
    expect(block).toContain('평균 거리: 0.0346')
    expect(block).not.toContain('종 경계')
    expect(block).not.toContain('cluster')
    expect(block).not.toContain('계통')
  })

  it('writes phylogeny supplementary entities as tree construction metadata only', () => {
    const source = createNormalizedSupplementaryWritingSource({
      entityRef: {
        id: 'ref_phylogeny_1',
        projectId: 'proj_1',
        entityKind: 'phylogeny-result',
        entityId: 'phylogeny_1',
        label: 'Phylogeny result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
      sourceRef: createDocumentSourceRef('supplementary', 'phylogeny_1', { label: 'Phylogeny result' }),
      language: 'ko',
      maps: {
        bioToolById: new Map(),
        blastById: new Map(),
        proteinById: new Map(),
        seqStatsById: new Map(),
        similarityById: new Map(),
        phylogenyById: new Map([
          ['phylogeny_1', {
            id: 'phylogeny_1',
            type: 'phylogeny',
            analysisName: 'COI NJ tree',
            sequenceCount: 18,
            treeMethod: 'NJ',
            distanceModel: 'K2P',
            alignmentLength: 642,
            createdAt: Date.now(),
          }],
        ]),
        boldById: new Map(),
        translationById: new Map(),
      },
    })

    const block = writeNormalizedSourceBlock(source, 'supplementary', { language: 'ko' })

    expect(block).toContain('#### COI NJ tree')
    expect(block).toContain('서열 수: 18')
    expect(block).toContain('계통수 방법: NJ')
    expect(block).toContain('거리 모델: K2P')
    expect(block).toContain('정렬 길이: 642')
    expect(block).not.toContain('분기군')
    expect(block).not.toContain('지지도')
    expect(block).not.toContain('진화 관계')
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
