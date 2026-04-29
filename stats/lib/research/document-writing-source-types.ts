import type { ProjectEntityKind } from '@biohub/types'
import type {
  DocumentMetadata,
  DocumentPreset,
  DocumentSourceRef,
  DocumentTable,
  FigureRef,
} from './document-blueprint-types'
import type { DocumentSectionSupportBindingDraft } from './document-support-asset-types'

export type WritingEntryMode = 'manual-blank' | 'source-bound-draft' | 'retry'

export type WritingJobLaunchMode = 'initial' | 'retry'

export type NormalizedWritingSourceType =
  | 'analysis'
  | 'figure'
  | 'bio-tool-alpha-diversity'
  | 'bio-tool-beta-diversity'
  | 'bio-tool-condition-factor'
  | 'bio-tool-fst'
  | 'bio-tool-hardy-weinberg'
  | 'bio-tool-icc'
  | 'bio-tool-length-weight'
  | 'bio-tool-mantel-test'
  | 'bio-tool-meta-analysis'
  | 'bio-tool-nmds'
  | 'bio-tool-permanova'
  | 'bio-tool-rarefaction'
  | 'bio-tool-roc-auc'
  | 'bio-tool-survival'
  | 'bio-tool-vbgf'
  | 'blast'
  | 'bold'
  | 'phylogeny'
  | 'protein'
  | 'seq-stats'
  | 'similarity'
  | 'translation'
  | 'supplementary'

export interface WritingSourceRequest {
  entityKind: ProjectEntityKind
  entityId: string
  label?: string
}

export interface NormalizedWritingSourceProvenance {
  projectId?: string
  entityKind: ProjectEntityKind
  relatedAnalysisId?: string
  relatedAnalysisLabel?: string
  relatedFigureId?: string
}

export interface NormalizedWritingSourceCapabilities {
  canWriteMethods: boolean
  canWriteResults: boolean
  canWriteCaptions: boolean
  canWriteSupplement: boolean
}

export interface NormalizedWritingSourceArtifacts {
  summary?: string
  methods?: string
  results?: string
  supplementaryMarkdown?: string
  tables?: DocumentTable[]
  figures?: FigureRef[]
  metrics?: Record<string, unknown>
  attachments?: Array<{
    kind: string
    label: string
    value?: string
  }>
}

export interface NormalizedWritingSource {
  sourceId: string
  sourceType: NormalizedWritingSourceType
  entityKind: ProjectEntityKind
  projectId: string
  title: string
  subtitle?: string
  languageHint?: 'ko' | 'en'
  sourceRef: DocumentSourceRef
  relatedAnalysisRefs?: DocumentSourceRef[]
  provenance: NormalizedWritingSourceProvenance
  capabilities: NormalizedWritingSourceCapabilities
  artifacts: NormalizedWritingSourceArtifacts
  meta?: {
    dateLabel?: string
    fileName?: string
    sampleName?: string
    status?: string
  }
}

interface StartWritingSessionInputBase {
  projectId: string
  title: string
  preset?: DocumentPreset
  language?: 'ko' | 'en'
  authors?: string[]
  metadata?: DocumentMetadata
  initialSectionSupportBindings?: Record<string, DocumentSectionSupportBindingDraft[]>
}

export interface StartManualBlankWritingSessionInput extends StartWritingSessionInputBase {
  mode: 'manual-blank'
}

export interface StartSourceBoundWritingSessionInput extends StartWritingSessionInputBase {
  mode: 'source-bound-draft'
  requestedSources: WritingSourceRequest[]
}

export interface RetryWritingSessionInput {
  mode: 'retry'
  documentId: string
}

export type StartWritingSessionInput =
  | StartManualBlankWritingSessionInput
  | StartSourceBoundWritingSessionInput
  | RetryWritingSessionInput
