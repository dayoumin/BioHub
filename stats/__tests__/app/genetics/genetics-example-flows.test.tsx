import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SeqStatsContent from '@/app/genetics/seq-stats/SeqStatsContent'
import SimilarityContent from '@/app/genetics/similarity/SimilarityContent'
import PhylogenyContent from '@/app/genetics/phylogeny/PhylogenyContent'
import TranslationContent from '@/app/genetics/translation/TranslationContent'
import ProteinContent from '@/app/genetics/protein/ProteinContent'
import {
  MULTI_SEQUENCE_EXAMPLES,
  PROTEIN_EXAMPLES,
  TRANSLATION_EXAMPLES,
} from '@/lib/genetics/example-sequences'

const {
  mockCallWorkerMethod,
  mockInitialize,
  mockPush,
  mockSaveGeneticsHistory,
  mockSaveGeneticsHistoryEntry,
  mockStoreSequenceForTransfer,
} = vi.hoisted(() => ({
  mockCallWorkerMethod: vi.fn(),
  mockInitialize: vi.fn(),
  mockPush: vi.fn(),
  mockSaveGeneticsHistory: vi.fn(),
  mockSaveGeneticsHistoryEntry: vi.fn(),
  mockStoreSequenceForTransfer: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (_key: string) => null,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  useResearchProjectStore: (selector: (state: { activeResearchProjectId: string | null }) => unknown) =>
    selector({ activeResearchProjectId: null }),
}))

vi.mock('@/lib/genetics/analysis-history', () => ({
  saveGeneticsHistory: mockSaveGeneticsHistory,
  saveAnalysisHistory: mockSaveGeneticsHistory,
  loadGeneticsHistory: () => [],
  loadAnalysisHistory: () => [],
  hydrateGeneticsHistoryFromCloud: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/genetics', async () => {
  const actual = await vi.importActual<typeof import('@/lib/genetics')>('@/lib/genetics')

  return {
    ...actual,
    saveGeneticsHistory: mockSaveGeneticsHistory,
    saveGeneticsHistoryEntry: mockSaveGeneticsHistoryEntry,
    loadGeneticsHistory: () => [],
    hydrateGeneticsHistoryFromCloud: vi.fn().mockResolvedValue(undefined),
    updateProteinHistoryReport: vi.fn().mockResolvedValue(undefined),
    consumeTransferredSequence: vi.fn(() => null),
    storeSequenceForTransfer: mockStoreSequenceForTransfer,
    formatTransferSource: vi.fn(() => 'GenBank'),
    fetchAlphaFoldPrediction: vi.fn().mockResolvedValue(null),
    fetchUniProtSummaryForAccession: vi.fn(),
    fetchQuickGoTermSummary: vi.fn(),
    fetchStringInteractionPartners: vi.fn(),
    fetchPdbStructureSummaries: vi.fn().mockResolvedValue([]),
    fetchReactomePathwaysForUniProt: vi.fn().mockResolvedValue([]),
    fetchReactomePathwayEnrichment: vi.fn().mockResolvedValue([]),
  }
})

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      initialize: mockInitialize,
      callWorkerMethod: mockCallWorkerMethod,
    }),
  },
}))

vi.mock('@/lib/charts/LazyECharts', () => ({
  LazyReactECharts: () => <div data-testid="mock-echart" />,
}))

vi.mock('@/lib/charts/chart-color-resolver', () => ({
  resolveAxisColors: () => ({
    axisLabel: '#515f74',
    axisLine: '#c6c6cd',
    splitLine: '#e0e3e5',
  }),
  resolveChartPalette: (count: number) => Array.from({ length: count }, (_, index) => `#188ace${index}`),
  resolveCssVar: (_name: string, fallback: string) => fallback,
}))

vi.mock('@/components/genetics/SeqStatsResult', () => ({
  SeqStatsResultView: ({
    result,
    analysisName,
  }: {
    result: { sequenceCount: number }
    analysisName: string
  }) => <div>{`${analysisName} · ${result.sequenceCount}개 서열`}</div>,
}))

vi.mock('@/components/genetics/SimilarityResult', () => ({
  SimilarityResult: ({
    result,
    analysisName,
  }: {
    result: { sequenceCount: number; model: string }
    analysisName: string
  }) => <div>{`${analysisName} · ${result.sequenceCount}개 · ${result.model}`}</div>,
}))

vi.mock('@/components/genetics/PhylogenyResult', () => ({
  PhylogenyResult: ({
    result,
    analysisName,
  }: {
    result: { sequenceCount: number; method: string }
    analysisName: string
  }) => <div>{`${analysisName} · ${result.sequenceCount}개 · ${result.method}`}</div>,
}))

function buildWorkerResult(method: string): unknown {
  switch (method) {
    case 'seq_similarity':
      return {
        distanceMatrix: [
          [0, 0.02, 0.04],
          [0.02, 0, 0.03],
          [0.04, 0.03, 0],
        ],
        labels: ['A', 'B', 'C'],
        model: 'K2P',
        sequenceCount: 3,
        alignmentLength: 60,
        minDistance: 0.02,
        maxDistance: 0.04,
        meanDistance: 0.03,
        saturatedPairCount: 0,
        dendrogram: {
          labels: ['A', 'B', 'C'],
          mergeMatrix: [
            [0, 1, 0.02, 2],
            [3, 2, 0.03, 3],
          ],
        },
      }
    case 'build_phylogeny':
      return {
        newick: '(A:0.02,(B:0.01,C:0.01):0.01);',
        method: 'NJ',
        distanceModel: 'K2P',
        sequenceCount: 3,
        alignmentLength: 60,
      }
    case 'translate':
      return {
        frames: [
          { frame: 1, protein: 'MAIVMGR', strand: '+', startPos: 1, codons: 7 },
          { frame: 2, protein: 'WPL', strand: '+', startPos: 2, codons: 3 },
        ],
        reverseComplement: 'CTATCGGGCACCCTTTCAGCGGCCCATTACAATGGCCAT',
        sequenceLength: 39,
        geneticCodeName: 'Standard',
        startCodons: ['ATG'],
        stopCodons: ['TAA', 'TAG', 'TGA'],
        availableTables: [{ id: 1, name: 'Standard', startCodons: ['ATG'], stopCodons: ['TAA', 'TAG', 'TGA'] }],
      }
    case 'protein_properties':
      return {
        molecularWeight: 17429.1,
        isoelectricPoint: 6.84,
        gravy: -0.21,
        aromaticity: 0.08,
        instabilityIndex: 28.4,
        isStable: true,
        extinctionCoeffReduced: 15250,
        extinctionCoeffOxidized: 15400,
        aminoAcidComposition: { A: 10, C: 2, D: 5, E: 7, F: 4 },
        aminoAcidPercent: { A: 0.1, C: 0.02, D: 0.05, E: 0.07, F: 0.04 },
        secondaryStructureFraction: { helix: 0.32, turn: 0.18, sheet: 0.24 },
        hydropathyProfile: [
          { position: 1, score: -0.3 },
          { position: 2, score: 0.2 },
          { position: 3, score: 0.1 },
        ],
        sequenceLength: 100,
        sequence: 'MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQ',
      }
    case 'find_orfs':
      return {
        orfs: [],
        sequenceLength: 39,
        geneticCodeName: 'Standard',
        startCodons: ['ATG'],
        stopCodons: ['TAA', 'TAG', 'TGA'],
        minLength: 100,
        totalFound: 0,
      }
    case 'codon_usage':
      return {
        codonCounts: [{ codon: 'ATG', aminoAcid: 'M', count: 1, frequency: 0.1, rscu: 1 }],
        rscu: { ATG: 1 },
        totalCodons: 10,
        aminoAcidFrequency: { M: 1 },
        sequenceLength: 39,
        geneticCodeName: 'Standard',
      }
    default:
      throw new Error(`Unexpected worker method: ${method}`)
  }
}

async function waitForAnalyzeButtonToEnable(name: string): Promise<HTMLElement> {
  await waitFor(() => {
    expect(screen.getByRole('button', { name })).toBeEnabled()
  })

  return screen.getByRole('button', { name })
}

describe('genetics example flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInitialize.mockResolvedValue(undefined)
    mockSaveGeneticsHistory.mockReturnValue(true)
    mockSaveGeneticsHistoryEntry.mockReturnValue({ id: 'protein-history-1' })
    mockCallWorkerMethod.mockImplementation(
      async (_worker: unknown, method: string) => {
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 10)
        })
        return buildWorkerResult(method)
      },
    )
  })

  describe('SeqStatsContent', () => {
    it.each(MULTI_SEQUENCE_EXAMPLES)('%s 예제로 통계 결과 단계까지 진행된다', async (example) => {
      const user = userEvent.setup()

      render(<SeqStatsContent />)

      await user.click(screen.getByRole('button', { name: example.label }))

      expect(screen.getByLabelText('DNA 서열 (Multi-FASTA)')).toHaveValue(example.sequenceText)

      const analyzeButton = await waitForAnalyzeButtonToEnable('분석 시작')
      await user.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${example.label} · 3개 서열`))).toBeInTheDocument()
      })
    })
  })

  describe('SimilarityContent', () => {
    it.each(MULTI_SEQUENCE_EXAMPLES)('%s 예제로 유사도 분석 플로우를 완료한다', async (example) => {
      const user = userEvent.setup()

      render(<SimilarityContent />)

      await user.click(screen.getByRole('button', { name: example.label }))

      const analyzeButton = await waitForAnalyzeButtonToEnable('분석 시작')
      await user.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${example.label} · 3개 · K2P`))).toBeInTheDocument()
      })
    })
  })

  describe('PhylogenyContent', () => {
    it.each(MULTI_SEQUENCE_EXAMPLES)('%s 예제로 계통수 분석 플로우를 완료한다', async (example) => {
      const user = userEvent.setup()

      render(<PhylogenyContent />)

      await user.click(screen.getByRole('button', { name: example.label }))

      const analyzeButton = await waitForAnalyzeButtonToEnable('분석 시작')
      await user.click(analyzeButton)

      await waitFor(() => {
        expect(screen.getByText(new RegExp(`${example.label} · 3개 · NJ`))).toBeInTheDocument()
      })
    })
  })

  describe('TranslationContent', () => {
    it.each(TRANSLATION_EXAMPLES)('%s 예제로 번역 분석 플로우를 완료한다', async (example) => {
      const user = userEvent.setup()

      render(<TranslationContent />)

      await user.click(screen.getByRole('button', { name: example.label }))
      expect(screen.getByLabelText('DNA 서열 (FASTA 또는 raw)')).toHaveValue(example.sequenceText)

      await user.click(screen.getByRole('button', { name: '분석 실행' }))

      await waitFor(() => {
        expect(screen.getByText('+1')).toBeInTheDocument()
        expect(screen.getByText('Standard')).toBeInTheDocument()
      })
    })
  })

  describe('ProteinContent', () => {
    it.each(PROTEIN_EXAMPLES)('%s 예제로 단백질 분석 플로우를 완료한다', async (example) => {
      const user = userEvent.setup()

      render(<ProteinContent />)

      await user.click(screen.getByRole('button', { name: example.label }))
      expect(screen.getByLabelText('단백질 서열')).toHaveValue(example.sequenceText)

      await user.click(screen.getByRole('button', { name: '분석 시작' }))

      await waitFor(() => {
        expect(screen.getByText('분자량')).toBeInTheDocument()
        expect(screen.getByText('등전점 (pI)')).toBeInTheDocument()
      })
    })
  })
})
