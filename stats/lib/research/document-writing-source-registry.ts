import type { ProjectEntityRef } from '@biohub/types'
import type { BioToolId } from '@/lib/bio-tools/bio-tool-registry'
import type { BioToolHistoryEntry } from '@/lib/bio-tools'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type {
  BarcodingHistoryEntry,
  BoldHistoryEntry,
  PhylogenyHistoryEntry,
  ProteinHistoryEntry,
  SeqStatsHistoryEntry,
  SimilarityHistoryEntry,
  TranslationHistoryEntry,
} from '@/lib/genetics'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'
import type {
  DocumentSourceRef,
  DocumentTable,
  FigureRef,
} from './document-blueprint-types'
import type { NormalizedWritingSource } from './document-writing-source-types'
import {
  buildAlphaDiversitySupplementaryMarkdown,
  buildBetaDiversitySupplementaryMarkdown,
  buildConditionFactorSupplementaryMarkdown,
  buildFstSupplementaryMarkdown,
  buildHardyWeinbergSupplementaryMarkdown,
  buildIccSupplementaryMarkdown,
  buildLengthWeightSupplementaryMarkdown,
  buildMantelSupplementaryMarkdown,
  buildMetaAnalysisSupplementaryMarkdown,
  buildNmdsSupplementaryMarkdown,
  buildPermanovaSupplementaryMarkdown,
  buildRarefactionSupplementaryMarkdown,
  buildRocAucSupplementaryMarkdown,
  buildSurvivalSupplementaryMarkdown,
  buildVbgfSupplementaryMarkdown,
  isAlphaDiversityResult,
  isBetaDiversityResult,
  isConditionFactorResult,
  isFstResult,
  isHardyWeinbergResult,
  isIccResult,
  isLengthWeightResult,
  isMantelResult,
  isMetaAnalysisResult,
  isNmdsResult,
  isPermanovaResult,
  isRarefactionResult,
  isRocAucResult,
  isSurvivalResult,
  isVbgfResult,
} from './document-writing-bio-tool-writers'
import {
  buildBlastSupplementaryMarkdown,
  buildBoldSupplementaryMarkdown,
  buildPhylogenySupplementaryMarkdown,
  buildProteinSupplementaryMarkdown,
  buildSeqStatsSupplementaryMarkdown,
  buildSimilaritySupplementaryMarkdown,
  buildTranslationSupplementaryMarkdown,
} from './document-writing-supplementary-writers'

export type WritingSourceBlockKind = 'methods' | 'results' | 'supplementary'
export type WritingSectionHeadingKind = 'figures' | 'supplementary'

interface WritingSourceRegistryContext {
  language: 'ko' | 'en'
}

interface WritingSourceWriter {
  id: string
  supports: (source: NormalizedWritingSource) => boolean
  write: (
    source: NormalizedWritingSource,
    block: WritingSourceBlockKind,
    context: WritingSourceRegistryContext,
  ) => string | null
}

interface AnalysisSourceOptions {
  projectId: string
  sourceRef: DocumentSourceRef
  record: HistoryRecord
  draft: PaperDraft
  tables?: DocumentTable[]
}

interface FigureSourceOptions {
  projectId: string
  sourceRef: DocumentSourceRef
  figure: FigureRef
}

interface BlastSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: BarcodingHistoryEntry
}

interface ProteinSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  entry?: ProteinHistoryEntry
}

interface BoldSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: BoldHistoryEntry
}

interface SeqStatsSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: SeqStatsHistoryEntry
}

interface TranslationSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: TranslationHistoryEntry
}

interface SimilaritySourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: SimilarityHistoryEntry
}

interface PhylogenySourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry?: PhylogenyHistoryEntry
}

interface GenericSupplementarySourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  markdown: string
  title?: string
  subtitle?: string
}

interface AlphaDiversityBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface BetaDiversityBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface RarefactionBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface ConditionFactorBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface FstBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface HardyWeinbergBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface IccBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface LengthWeightBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface VbgfBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface PermanovaBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface NmdsBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface MantelBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface RocAucBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface MetaAnalysisBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

interface SurvivalBioToolSourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  entry: BioToolHistoryEntry
}

export interface SupplementaryWritingSourceMaps {
  bioToolById: Map<string, BioToolHistoryEntry>
  blastById: Map<string, BarcodingHistoryEntry>
  proteinById: Map<string, ProteinHistoryEntry>
  seqStatsById: Map<string, SeqStatsHistoryEntry>
  similarityById: Map<string, SimilarityHistoryEntry>
  phylogenyById: Map<string, PhylogenyHistoryEntry>
  boldById: Map<string, BoldHistoryEntry>
  translationById: Map<string, TranslationHistoryEntry>
}

export interface SupplementaryWritingSourceInputData {
  bioToolHistory?: readonly BioToolHistoryEntry[]
  blastHistory?: readonly BarcodingHistoryEntry[]
  proteinHistory?: readonly ProteinHistoryEntry[]
  seqStatsHistory?: readonly SeqStatsHistoryEntry[]
  similarityHistory?: readonly SimilarityHistoryEntry[]
  phylogenyHistory?: readonly PhylogenyHistoryEntry[]
  boldHistory?: readonly BoldHistoryEntry[]
  translationHistory?: readonly TranslationHistoryEntry[]
}

interface SupplementaryWritingSourceOptions {
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  maps: SupplementaryWritingSourceMaps
}

function buildEntryMap<T extends { id: string }>(entries: readonly T[] | undefined): Map<string, T> {
  return new Map((entries ?? []).map((entry) => [entry.id, entry] as const))
}

export function buildSupplementaryWritingSourceMaps(
  sources: SupplementaryWritingSourceInputData,
): SupplementaryWritingSourceMaps {
  return {
    bioToolById: buildEntryMap(sources.bioToolHistory),
    blastById: buildEntryMap(sources.blastHistory),
    proteinById: buildEntryMap(sources.proteinHistory),
    seqStatsById: buildEntryMap(sources.seqStatsHistory),
    similarityById: buildEntryMap(sources.similarityHistory),
    phylogenyById: buildEntryMap(sources.phylogenyHistory),
    boldById: buildEntryMap(sources.boldHistory),
    translationById: buildEntryMap(sources.translationHistory),
  }
}

export function createNormalizedAnalysisWritingSource(
  options: AnalysisSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.record.id,
    sourceType: 'analysis',
    entityKind: 'analysis',
    projectId: options.projectId,
    title: options.record.method?.name ?? options.record.name,
    subtitle: options.record.dataFileName ?? undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: 'analysis',
    },
    capabilities: {
      canWriteMethods: true,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: false,
    },
    artifacts: {
      methods: options.draft.methods ?? undefined,
      results: options.draft.results ?? undefined,
      tables: options.tables,
    },
    meta: {
      fileName: options.record.dataFileName ?? undefined,
      status: options.record.results ? 'ready' : undefined,
    },
  }
}

export function createNormalizedFigureWritingSource(
  options: FigureSourceOptions,
): NormalizedWritingSource {
  const figure = options.figure
  return {
    sourceId: figure.entityId,
    sourceType: 'figure',
    entityKind: 'figure',
    projectId: options.projectId,
    title: figure.label,
    subtitle: figure.chartType ?? undefined,
    sourceRef: options.sourceRef,
    relatedAnalysisRefs: figure.relatedAnalysisId
      ? [
          {
            kind: 'analysis',
            sourceId: figure.relatedAnalysisId,
            label: figure.relatedAnalysisLabel,
          },
        ]
      : undefined,
    provenance: {
      projectId: options.projectId,
      entityKind: 'figure',
      relatedAnalysisId: figure.relatedAnalysisId,
      relatedAnalysisLabel: figure.relatedAnalysisLabel,
      relatedFigureId: figure.entityId,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: false,
    },
    artifacts: {
      figures: [figure],
      summary: figure.patternSummary,
    },
  }
}

export function createNormalizedBlastWritingSource(
  options: BlastSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'blast',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.sampleName ?? options.entityRef.label ?? 'BLAST',
    subtitle: options.entry?.topSpecies ?? undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildBlastSupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'BLAST',
        options.language,
      ),
    },
    meta: {
      sampleName: options.entry?.sampleName,
      status: options.entry?.status ?? options.entry?.resultData?.status ?? undefined,
    },
  }
}

export function createNormalizedProteinWritingSource(
  options: ProteinSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'protein',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.analysisName ?? options.entityRef.label ?? 'Protein',
    subtitle: options.entry?.accession ?? undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildProteinSupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'Protein',
      ),
    },
    meta: {
      status: options.entry?.isStable != null
        ? options.entry.isStable ? 'stable' : 'unstable'
        : undefined,
    },
  }
}

export function createNormalizedBoldWritingSource(
  options: BoldSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bold',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.sampleName ?? options.entityRef.label ?? 'BOLD',
    subtitle: options.entry?.topSpecies ?? undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildBoldSupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'BOLD',
        options.language,
      ),
    },
    meta: {
      status: options.entry?.topSpecies ? 'candidate' : 'unresolved',
    },
  }
}

export function createNormalizedSeqStatsWritingSource(
  options: SeqStatsSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'seq-stats',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.analysisName ?? options.entityRef.label ?? 'Seq stats',
    subtitle: options.entry
      ? `${options.entry.sequenceCount} seq`
      : undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildSeqStatsSupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'Seq stats',
        options.language,
      ),
    },
  }
}

export function createNormalizedTranslationWritingSource(
  options: TranslationSourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'translation',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.analysisName ?? options.entityRef.label ?? 'Translation',
    subtitle: options.entry
      ? `${options.entry.sequenceLength} nt`
      : undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildTranslationSupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'Translation',
        options.language,
      ),
    },
  }
}

export function createNormalizedSimilarityWritingSource(
  options: SimilaritySourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'similarity',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.analysisName ?? options.entityRef.label ?? 'Similarity',
    subtitle: options.entry
      ? options.entry.distanceModel
      : undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildSimilaritySupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'Similarity',
        options.language,
      ),
    },
  }
}

export function createNormalizedPhylogenyWritingSource(
  options: PhylogenySourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'phylogeny',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry?.analysisName ?? options.entityRef.label ?? 'Phylogeny',
    subtitle: options.entry
      ? options.entry.treeMethod
      : undefined,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: buildPhylogenySupplementaryMarkdown(
        options.entry,
        options.entityRef.label ?? 'Phylogeny',
        options.language,
      ),
    },
  }
}

export function createNormalizedGenericSupplementaryWritingSource(
  options: GenericSupplementarySourceOptions,
): NormalizedWritingSource {
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'supplementary',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.title ?? options.entityRef.label ?? options.entityRef.entityId,
    subtitle: options.subtitle,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: options.markdown,
    },
  }
}

export function createNormalizedAlphaDiversityBioToolWritingSource(
  options: AlphaDiversityBioToolSourceOptions,
): NormalizedWritingSource {
  const alphaDiversityResult = isAlphaDiversityResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-alpha-diversity',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Alpha Diversity',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: alphaDiversityResult
        ? buildAlphaDiversitySupplementaryMarkdown(options.entry, alphaDiversityResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedBetaDiversityBioToolWritingSource(
  options: BetaDiversityBioToolSourceOptions,
): NormalizedWritingSource {
  const betaDiversityResult = isBetaDiversityResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-beta-diversity',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Beta Diversity',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: betaDiversityResult
        ? buildBetaDiversitySupplementaryMarkdown(options.entry, betaDiversityResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedRarefactionBioToolWritingSource(
  options: RarefactionBioToolSourceOptions,
): NormalizedWritingSource {
  const rarefactionResult = isRarefactionResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-rarefaction',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Rarefaction',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: rarefactionResult
        ? buildRarefactionSupplementaryMarkdown(options.entry, rarefactionResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedConditionFactorBioToolWritingSource(
  options: ConditionFactorBioToolSourceOptions,
): NormalizedWritingSource {
  const conditionFactorResult = isConditionFactorResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-condition-factor',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || "Fulton's Condition Factor",
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: conditionFactorResult
        ? buildConditionFactorSupplementaryMarkdown(options.entry, conditionFactorResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedFstBioToolWritingSource(
  options: FstBioToolSourceOptions,
): NormalizedWritingSource {
  const fstResult = isFstResult(options.entry.results) ? options.entry.results : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-fst',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Fst',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: fstResult
        ? buildFstSupplementaryMarkdown(options.entry, fstResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedHardyWeinbergBioToolWritingSource(
  options: HardyWeinbergBioToolSourceOptions,
): NormalizedWritingSource {
  const hardyWeinbergResult = isHardyWeinbergResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-hardy-weinberg',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Hardy-Weinberg',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: hardyWeinbergResult
        ? buildHardyWeinbergSupplementaryMarkdown(options.entry, hardyWeinbergResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedIccBioToolWritingSource(
  options: IccBioToolSourceOptions,
): NormalizedWritingSource {
  const iccResult = isIccResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-icc',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'ICC',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: iccResult
        ? buildIccSupplementaryMarkdown(options.entry, iccResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedLengthWeightBioToolWritingSource(
  options: LengthWeightBioToolSourceOptions,
): NormalizedWritingSource {
  const lengthWeightResult = isLengthWeightResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-length-weight',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Length-Weight Relationship',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: lengthWeightResult
        ? buildLengthWeightSupplementaryMarkdown(options.entry, lengthWeightResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedVbgfBioToolWritingSource(
  options: VbgfBioToolSourceOptions,
): NormalizedWritingSource {
  const vbgfResult = isVbgfResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-vbgf',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'VBGF',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: vbgfResult
        ? buildVbgfSupplementaryMarkdown(options.entry, vbgfResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedPermanovaBioToolWritingSource(
  options: PermanovaBioToolSourceOptions,
): NormalizedWritingSource {
  const permanovaResult = isPermanovaResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-permanova',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'PERMANOVA',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: permanovaResult
        ? buildPermanovaSupplementaryMarkdown(options.entry, permanovaResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedNmdsBioToolWritingSource(
  options: NmdsBioToolSourceOptions,
): NormalizedWritingSource {
  const nmdsResult = isNmdsResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-nmds',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'NMDS',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: nmdsResult
        ? buildNmdsSupplementaryMarkdown(options.entry, nmdsResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedMantelBioToolWritingSource(
  options: MantelBioToolSourceOptions,
): NormalizedWritingSource {
  const mantelResult = isMantelResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-mantel-test',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Mantel Test',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: mantelResult
        ? buildMantelSupplementaryMarkdown(options.entry, mantelResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedRocAucBioToolWritingSource(
  options: RocAucBioToolSourceOptions,
): NormalizedWritingSource {
  const rocAucResult = isRocAucResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-roc-auc',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'ROC-AUC',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: rocAucResult
        ? buildRocAucSupplementaryMarkdown(options.entry, rocAucResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedMetaAnalysisBioToolWritingSource(
  options: MetaAnalysisBioToolSourceOptions,
): NormalizedWritingSource {
  const metaAnalysisResult = isMetaAnalysisResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-meta-analysis',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Meta-Analysis',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: metaAnalysisResult
        ? buildMetaAnalysisSupplementaryMarkdown(options.entry, metaAnalysisResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

export function createNormalizedSurvivalBioToolWritingSource(
  options: SurvivalBioToolSourceOptions,
): NormalizedWritingSource {
  const survivalResult = isSurvivalResult(options.entry.results)
    ? options.entry.results
    : null
  return {
    sourceId: options.entityRef.entityId,
    sourceType: 'bio-tool-survival',
    entityKind: options.entityRef.entityKind,
    projectId: options.projectId,
    title: options.entry.toolNameKo || options.entry.toolNameEn || options.entityRef.label || 'Survival Analysis',
    subtitle: options.entry.csvFileName,
    sourceRef: options.sourceRef,
    provenance: {
      projectId: options.projectId,
      entityKind: options.entityRef.entityKind,
    },
    capabilities: {
      canWriteMethods: false,
      canWriteResults: true,
      canWriteCaptions: false,
      canWriteSupplement: true,
    },
    artifacts: {
      supplementaryMarkdown: survivalResult
        ? buildSurvivalSupplementaryMarkdown(options.entry, survivalResult, options.language)
        : `- ${options.entityRef.label ?? options.sourceRef.label ?? options.entityRef.entityId}`,
    },
  }
}

interface BioToolWritingSourceDispatcher {
  isResult: (results: unknown) => boolean
  create: (options: {
    projectId: string
    entityRef: ProjectEntityRef
    sourceRef: DocumentSourceRef
    language: 'ko' | 'en'
    entry: BioToolHistoryEntry
  }) => NormalizedWritingSource
}

const BIO_TOOL_WRITING_SOURCE_DISPATCHERS = {
  'alpha-diversity': {
    isResult: isAlphaDiversityResult,
    create: createNormalizedAlphaDiversityBioToolWritingSource,
  },
  'beta-diversity': {
    isResult: isBetaDiversityResult,
    create: createNormalizedBetaDiversityBioToolWritingSource,
  },
  'condition-factor': {
    isResult: isConditionFactorResult,
    create: createNormalizedConditionFactorBioToolWritingSource,
  },
  fst: {
    isResult: isFstResult,
    create: createNormalizedFstBioToolWritingSource,
  },
  'hardy-weinberg': {
    isResult: isHardyWeinbergResult,
    create: createNormalizedHardyWeinbergBioToolWritingSource,
  },
  icc: {
    isResult: isIccResult,
    create: createNormalizedIccBioToolWritingSource,
  },
  'length-weight': {
    isResult: isLengthWeightResult,
    create: createNormalizedLengthWeightBioToolWritingSource,
  },
  'mantel-test': {
    isResult: isMantelResult,
    create: createNormalizedMantelBioToolWritingSource,
  },
  'meta-analysis': {
    isResult: isMetaAnalysisResult,
    create: createNormalizedMetaAnalysisBioToolWritingSource,
  },
  nmds: {
    isResult: isNmdsResult,
    create: createNormalizedNmdsBioToolWritingSource,
  },
  permanova: {
    isResult: isPermanovaResult,
    create: createNormalizedPermanovaBioToolWritingSource,
  },
  rarefaction: {
    isResult: isRarefactionResult,
    create: createNormalizedRarefactionBioToolWritingSource,
  },
  'roc-auc': {
    isResult: isRocAucResult,
    create: createNormalizedRocAucBioToolWritingSource,
  },
  survival: {
    isResult: isSurvivalResult,
    create: createNormalizedSurvivalBioToolWritingSource,
  },
  vbgf: {
    isResult: isVbgfResult,
    create: createNormalizedVbgfBioToolWritingSource,
  },
} as const satisfies Partial<Record<BioToolId, BioToolWritingSourceDispatcher>>

export const DEDICATED_BIO_TOOL_WRITING_SOURCE_TOOL_IDS = Object.keys(
  BIO_TOOL_WRITING_SOURCE_DISPATCHERS,
) as Array<keyof typeof BIO_TOOL_WRITING_SOURCE_DISPATCHERS>

interface SupplementaryEntitySourceRegistryOptions {
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  language: 'ko' | 'en'
  maps: SupplementaryWritingSourceMaps
  buildFallback: () => NormalizedWritingSource
}

interface SupplementaryEntitySourceDefinition {
  hasSnapshot: (entityId: string, maps: SupplementaryWritingSourceMaps) => boolean
  create: (options: SupplementaryEntitySourceRegistryOptions) => NormalizedWritingSource
}

const SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY = {
  'bio-tool-result': {
    hasSnapshot: (entityId, maps) => maps.bioToolById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.bioToolById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }

      const dispatcher = BIO_TOOL_WRITING_SOURCE_DISPATCHERS[entry.toolId as keyof typeof BIO_TOOL_WRITING_SOURCE_DISPATCHERS]
      if (dispatcher?.isResult(entry.results)) {
        return dispatcher.create({
          projectId: entityRef.projectId,
          entityRef,
          sourceRef,
          language,
          entry,
        })
      }

      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        title: entry.toolNameKo ?? entry.toolNameEn ?? entityRef.label ?? 'Bio-Tool',
        markdown: [
          `#### ${entry.toolNameKo ?? entry.toolNameEn ?? entityRef.label ?? 'Bio-Tool'}`,
          '',
          `- ${language === 'ko' ? '입력 파일' : 'Input file'}: ${entry.csvFileName ?? sourceRef.label ?? entityRef.entityId}`,
        ].join('\n'),
      })
    },
  },
  'blast-result': {
    hasSnapshot: (entityId, maps) => maps.blastById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.blastById.get(entityRef.entityId)
      return entry ? createNormalizedBlastWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
  'protein-result': {
    hasSnapshot: (entityId, maps) => maps.proteinById.has(entityId),
    create: ({ entityRef, sourceRef, maps, buildFallback }) => {
      const entry = maps.proteinById.get(entityRef.entityId)
      return entry ? createNormalizedProteinWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        entry,
      }) : buildFallback()
    },
  },
  'seq-stats-result': {
    hasSnapshot: (entityId, maps) => maps.seqStatsById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.seqStatsById.get(entityRef.entityId)
      return entry ? createNormalizedSeqStatsWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
  'similarity-result': {
    hasSnapshot: (entityId, maps) => maps.similarityById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.similarityById.get(entityRef.entityId)
      return entry ? createNormalizedSimilarityWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
  'phylogeny-result': {
    hasSnapshot: (entityId, maps) => maps.phylogenyById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.phylogenyById.get(entityRef.entityId)
      return entry ? createNormalizedPhylogenyWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
  'bold-result': {
    hasSnapshot: (entityId, maps) => maps.boldById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.boldById.get(entityRef.entityId)
      return entry ? createNormalizedBoldWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
  'translation-result': {
    hasSnapshot: (entityId, maps) => maps.translationById.has(entityId),
    create: ({ entityRef, sourceRef, language, maps, buildFallback }) => {
      const entry = maps.translationById.get(entityRef.entityId)
      return entry ? createNormalizedTranslationWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry,
      }) : buildFallback()
    },
  },
} as const satisfies Partial<Record<ProjectEntityRef['entityKind'], SupplementaryEntitySourceDefinition>>

export const DOCUMENT_WRITING_SOURCE_REGISTRY_ENTITY_KINDS = [
  'analysis',
  'figure',
  ...Object.keys(SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY),
] as ProjectEntityRef['entityKind'][]

export function createNormalizedSupplementaryWritingSource(
  options: SupplementaryWritingSourceOptions,
): NormalizedWritingSource {
  const { entityRef, sourceRef, language, maps } = options
  const buildFallback = (): NormalizedWritingSource => (
    createNormalizedGenericSupplementaryWritingSource({
      projectId: entityRef.projectId,
      entityRef,
      sourceRef,
      markdown: `- ${entityRef.label ?? sourceRef.label ?? entityRef.entityId}`,
    })
  )

  const definition = SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY[entityRef.entityKind as keyof typeof SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY]
  return definition?.create({
    entityRef,
    sourceRef,
    language,
    maps,
    buildFallback,
  }) ?? buildFallback()
}

export function hasSupplementaryWritingSourceSnapshot(
  entityRef: ProjectEntityRef,
  maps: SupplementaryWritingSourceMaps,
): boolean {
  const definition = SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY[entityRef.entityKind as keyof typeof SUPPLEMENTARY_ENTITY_SOURCE_REGISTRY]
  return definition?.hasSnapshot(entityRef.entityId, maps) ?? false
}

const writingSourceWriters: WritingSourceWriter[] = [
  {
    id: 'analysis-writing-source',
    supports: (source) => source.sourceType === 'analysis',
    write: (source, block) => {
      if (block === 'methods') {
        return source.artifacts.methods ?? null
      }
      if (block === 'results') {
        return source.artifacts.results ?? null
      }
      return null
    },
  },
  {
    id: 'figure-writing-source',
    supports: (source) => source.sourceType === 'figure',
    write: (source, block, context) => {
      if (block !== 'results') {
        return null
      }
      const figure = source.artifacts.figures?.[0]
      if (!figure) {
        return null
      }
      const details = [
        `**${figure.label}**: ${figure.caption}`,
        figure.relatedAnalysisLabel
          ? `${context.language === 'ko' ? '관련 분석' : 'Related analysis'}: ${figure.relatedAnalysisLabel}`
          : null,
        figure.patternSummary
          ? `${context.language === 'ko' ? '패턴 요약' : 'Pattern summary'}: ${figure.patternSummary}`
          : null,
      ].filter((value): value is string => value !== null)
      return `- ${details.join(' · ')}`
    },
  },
  {
    id: 'blast-supplementary-writing-source',
    supports: (source) => source.sourceType === 'blast',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'protein-supplementary-writing-source',
    supports: (source) => source.sourceType === 'protein',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'bold-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bold',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'seq-stats-supplementary-writing-source',
    supports: (source) => source.sourceType === 'seq-stats',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'translation-supplementary-writing-source',
    supports: (source) => source.sourceType === 'translation',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'similarity-supplementary-writing-source',
    supports: (source) => source.sourceType === 'similarity',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'phylogeny-supplementary-writing-source',
    supports: (source) => source.sourceType === 'phylogeny',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'alpha-diversity-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-alpha-diversity',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'beta-diversity-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-beta-diversity',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'rarefaction-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-rarefaction',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'condition-factor-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-condition-factor',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'fst-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-fst',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'hardy-weinberg-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-hardy-weinberg',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'icc-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-icc',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'length-weight-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-length-weight',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'vbgf-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-vbgf',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'permanova-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-permanova',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'nmds-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-nmds',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'mantel-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-mantel-test',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'roc-auc-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-roc-auc',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'meta-analysis-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-meta-analysis',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'survival-bio-tool-supplementary-writing-source',
    supports: (source) => source.sourceType === 'bio-tool-survival',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
  {
    id: 'generic-supplementary-writing-source',
    supports: (source) => source.sourceType === 'supplementary',
    write: (source, block) => (
      block === 'supplementary' ? source.artifacts.supplementaryMarkdown ?? null : null
    ),
  },
]

export function writeNormalizedSourceBlock(
  source: NormalizedWritingSource,
  block: WritingSourceBlockKind,
  context: WritingSourceRegistryContext,
): string | null {
  const writer = writingSourceWriters.find((candidate) => candidate.supports(source))
  if (!writer) {
    return null
  }
  return writer.write(source, block, context)
}

export function getWritingSectionHeading(
  kind: WritingSectionHeadingKind,
  context: WritingSourceRegistryContext,
): string {
  switch (kind) {
    case 'figures':
      return context.language === 'ko' ? '### 그림' : '### Figures'
    case 'supplementary':
      return context.language === 'ko' ? '### 보조 결과' : '### Supplementary results'
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
