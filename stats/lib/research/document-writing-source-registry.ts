import type { ProjectEntityRef } from '@biohub/types'
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
  buildBlastSupplementaryMarkdown,
  buildProteinSupplementaryMarkdown,
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

interface GenericSupplementarySourceOptions {
  projectId: string
  entityRef: ProjectEntityRef
  sourceRef: DocumentSourceRef
  markdown: string
  title?: string
  subtitle?: string
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

  switch (entityRef.entityKind) {
    case 'bio-tool-result': {
      const entry = maps.bioToolById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        title: entry?.toolNameKo ?? entry?.toolNameEn ?? entityRef.label ?? 'Bio-Tool',
        markdown: [
          `#### ${entry?.toolNameKo ?? entry?.toolNameEn ?? entityRef.label ?? 'Bio-Tool'}`,
          '',
          `- ${language === 'ko' ? '입력 파일' : 'Input file'}: ${entry?.csvFileName ?? sourceRef.label ?? entityRef.entityId}`,
        ].join('\n'),
      })
    }
    case 'blast-result':
      if (!maps.blastById.get(entityRef.entityId)) {
        return buildFallback()
      }
      return createNormalizedBlastWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        language,
        entry: maps.blastById.get(entityRef.entityId),
      })
    case 'protein-result':
      if (!maps.proteinById.get(entityRef.entityId)) {
        return buildFallback()
      }
      return createNormalizedProteinWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        entry: maps.proteinById.get(entityRef.entityId),
      })
    case 'seq-stats-result': {
      const entry = maps.seqStatsById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        markdown: `- **${entry?.analysisName ?? entityRef.label ?? 'Seq stats'}**: ${entry?.sequenceCount ?? 0} seq · ${language === 'ko' ? '평균 길이' : 'Mean length'} ${entry?.meanLength ?? 0} · GC ${(entry?.overallGcContent ?? 0).toFixed(1)}%`,
      })
    }
    case 'similarity-result': {
      const entry = maps.similarityById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        markdown: `- **${entry?.analysisName ?? entityRef.label ?? 'Similarity'}**: ${entry?.distanceModel ?? '-'} · ${language === 'ko' ? '평균 거리' : 'Mean distance'} ${(entry?.meanDistance ?? 0).toFixed(4)} · ${language === 'ko' ? '정렬 길이' : 'Alignment'} ${entry?.alignmentLength ?? 0}`,
      })
    }
    case 'phylogeny-result': {
      const entry = maps.phylogenyById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        markdown: `- **${entry?.analysisName ?? entityRef.label ?? 'Phylogeny'}**: ${entry?.treeMethod ?? '-'} · ${entry?.distanceModel ?? '-'} · ${language === 'ko' ? '정렬 길이' : 'Alignment'} ${entry?.alignmentLength ?? 0}`,
      })
    }
    case 'bold-result': {
      const entry = maps.boldById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      const similarity = entry?.topSimilarity != null ? `${(entry.topSimilarity * 100).toFixed(1)}%` : null
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        markdown: `- **${entry?.sampleName ?? entityRef.label ?? 'BOLD'}**: ${entry?.topSpecies ?? (language === 'ko' ? '종 미확정' : 'Species unresolved')}${similarity ? ` · ${similarity}` : ''}${entry?.topBin ? ` · BIN ${entry.topBin}` : ''}`,
      })
    }
    case 'translation-result': {
      const entry = maps.translationById.get(entityRef.entityId)
      if (!entry) {
        return buildFallback()
      }
      return createNormalizedGenericSupplementaryWritingSource({
        projectId: entityRef.projectId,
        entityRef,
        sourceRef,
        markdown: `- **${entry?.analysisName ?? entityRef.label ?? 'Translation'}**: ${entry?.sequenceLength ?? 0} nt · ${entry?.geneticCodeName ?? '-'} · ${entry?.analysisMode ?? '-'}${entry?.orfCount != null ? ` · ORF ${entry.orfCount}` : ''}`,
      })
    }
    default:
      return buildFallback()
  }
}

export function hasSupplementaryWritingSourceSnapshot(
  entityRef: ProjectEntityRef,
  maps: SupplementaryWritingSourceMaps,
): boolean {
  switch (entityRef.entityKind) {
    case 'bio-tool-result':
      return maps.bioToolById.has(entityRef.entityId)
    case 'blast-result':
      return maps.blastById.has(entityRef.entityId)
    case 'protein-result':
      return maps.proteinById.has(entityRef.entityId)
    case 'seq-stats-result':
      return maps.seqStatsById.has(entityRef.entityId)
    case 'similarity-result':
      return maps.similarityById.has(entityRef.entityId)
    case 'phylogeny-result':
      return maps.phylogenyById.has(entityRef.entityId)
    case 'bold-result':
      return maps.boldById.has(entityRef.entityId)
    case 'translation-result':
      return maps.translationById.has(entityRef.entityId)
    default:
      return false
  }
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
