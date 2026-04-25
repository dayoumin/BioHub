import type { DocumentBlueprint } from './document-blueprint-types'
import type { DocumentWritingSectionKind } from './document-section-writing-context'
import {
  apiDocumentWriterEngine,
  getPreferredDocumentWriterProvider,
  localModelDocumentWriterEngine,
} from './document-llm-writer-engine'
import {
  isDocumentWriterProvider,
  templateDocumentWriterEngine,
  type DocumentWriterEngine,
  type DocumentWriterProvider,
} from './document-writer-engine'
import {
  DEFAULT_DOCUMENT_WRITER_SETTINGS,
  normalizeDocumentWriterSettings,
  useSettingsStore,
  type DocumentWriterQuality,
  type DocumentWriterSectionId,
  type DocumentWriterSettings,
} from '@/lib/stores/settings-store'

export interface ResolvedDocumentWriterSettings {
  engine: DocumentWriterEngine
  provider: DocumentWriterProvider
  quality: DocumentWriterQuality
}

function getDocumentMetadataWriterProvider(
  document: DocumentBlueprint,
): DocumentWriterProvider | undefined {
  const provider = (document.metadata as { writerProvider?: unknown }).writerProvider
  return isDocumentWriterProvider(provider) ? provider : undefined
}

function getDocumentMetadataWriterQuality(
  document: DocumentBlueprint,
): DocumentWriterQuality | undefined {
  const quality = (document.metadata as { writerQuality?: unknown }).writerQuality
  return quality === 'fast' || quality === 'balanced' || quality === 'careful'
    ? quality
    : undefined
}

function toSectionSettingsKey(sectionKind: DocumentWritingSectionKind): DocumentWriterSectionId {
  switch (sectionKind) {
    case 'introduction':
    case 'background':
    case 'summary':
    case 'methods':
    case 'results':
    case 'discussion':
    case 'conclusion':
      return sectionKind
    case 'appendix':
    case 'custom':
      return 'custom'
    default: {
      const _exhaustive: never = sectionKind
      return _exhaustive
    }
  }
}

function resolveProvider(
  settings: DocumentWriterSettings,
  sectionKind: DocumentWritingSectionKind,
  metadataProvider?: DocumentWriterProvider,
): DocumentWriterProvider {
  const sectionProvider = settings.sectionOverrides[toSectionSettingsKey(sectionKind)]?.provider
  const provider = sectionProvider && sectionProvider !== 'global'
    ? sectionProvider
    : metadataProvider ?? settings.defaultProvider

  if (provider === 'global') {
    return getPreferredDocumentWriterProvider()
  }
  return provider
}

function resolveQuality(
  settings: DocumentWriterSettings,
  sectionKind: DocumentWritingSectionKind,
  metadataQuality?: DocumentWriterQuality,
): DocumentWriterQuality {
  return settings.sectionOverrides[toSectionSettingsKey(sectionKind)]?.quality
    ?? metadataQuality
    ?? settings.quality
}

export function getDocumentWriterEngine(provider: DocumentWriterProvider): DocumentWriterEngine {
  switch (provider) {
    case 'api':
      return apiDocumentWriterEngine
    case 'local-model':
      return localModelDocumentWriterEngine
    case 'template':
      return templateDocumentWriterEngine
    default: {
      const _exhaustive: never = provider
      return _exhaustive
    }
  }
}

export function getDocumentWriterEngineForDocument(
  document: DocumentBlueprint,
): DocumentWriterEngine {
  return getDocumentWriterEngine(
    getDocumentMetadataWriterProvider(document) ?? getPreferredDocumentWriterProvider(),
  )
}

export function resolveDocumentWriterSettings(
  document: DocumentBlueprint,
  sectionKind: DocumentWritingSectionKind,
): ResolvedDocumentWriterSettings {
  const settings = normalizeDocumentWriterSettings(
    useSettingsStore.getState().documentWriterSettings ?? DEFAULT_DOCUMENT_WRITER_SETTINGS,
  )
  const provider = resolveProvider(settings, sectionKind, getDocumentMetadataWriterProvider(document))
  const quality = resolveQuality(settings, sectionKind, getDocumentMetadataWriterQuality(document))

  return {
    engine: getDocumentWriterEngine(provider),
    provider,
    quality,
  }
}
