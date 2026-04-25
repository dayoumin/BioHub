import {
  buildDocumentTableId,
  normalizeDocumentBlueprint,
  type DocumentBlueprint,
  type DocumentSection,
  type DocumentSourceKind,
  type DocumentSourceRef,
} from './document-blueprint-types'
import type {
  DocumentSectionSupportBindingDraft,
  DocumentSupportAssetKind,
} from './document-support-asset-types'

export type SourceEvidenceItemKind =
  | 'section-source'
  | 'table'
  | 'figure'
  | 'support-binding'

export type SourceEvidenceSourceKind = DocumentSourceKind | DocumentSupportAssetKind

export interface SourceEvidenceSourceRef {
  kind: SourceEvidenceSourceKind
  sourceId: string
  label?: string
}

export interface SourceEvidenceItem {
  key: string
  kind: SourceEvidenceItemKind
  documentId: string
  projectId: string
  sectionId: string
  sectionTitle: string
  label: string
  sourceRefs: SourceEvidenceSourceRef[]
  artifactId?: string
  artifactLabel?: string
  contentHash: string
  summary?: string
}

export interface SourceEvidenceIndex {
  documentId: string
  projectId: string
  documentUpdatedAt: string
  items: SourceEvidenceItem[]
  byKey: Record<string, SourceEvidenceItem>
  bySectionId: Record<string, string[]>
  bySourceKey: Record<string, string[]>
}

export interface DocumentClaimEvidence {
  claimId: string
  documentId: string
  sectionId: string
  text: string
  evidenceKeys: string[]
  status: 'linked' | 'missing' | 'ambiguous'
}

function normalizeKeyPart(value: string): string {
  return encodeURIComponent(value.trim())
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function buildContentHash(value: unknown): string {
  return hashString(stableStringify(value))
}

export function buildSourceEvidenceKey(parts: readonly string[]): string {
  return parts.map(normalizeKeyPart).join(':')
}

function toEvidenceSourceRef(sourceRef: DocumentSourceRef): SourceEvidenceSourceRef {
  return {
    kind: sourceRef.kind,
    sourceId: sourceRef.sourceId,
    label: sourceRef.label,
  }
}

function buildSourceLookupKey(sourceRef: SourceEvidenceSourceRef): string {
  return buildSourceEvidenceKey(['source', sourceRef.kind, sourceRef.sourceId])
}

function addIndexValue(index: Record<string, string[]>, key: string, value: string): void {
  const current = index[key] ?? []
  if (!current.includes(value)) {
    index[key] = [...current, value]
  }
}

function dedupeSourceRefs(sourceRefs: readonly SourceEvidenceSourceRef[]): SourceEvidenceSourceRef[] {
  const merged = new Map<string, SourceEvidenceSourceRef>()
  for (const sourceRef of sourceRefs) {
    merged.set(buildSourceLookupKey(sourceRef), sourceRef)
  }
  return Array.from(merged.values())
}

function buildSectionSourceEvidenceItems(
  document: DocumentBlueprint,
  section: DocumentSection,
): SourceEvidenceItem[] {
  return section.sourceRefs.map((sourceRef) => ({
    key: buildSourceEvidenceKey([
      'doc',
      document.id,
      'section',
      section.id,
      'source',
      sourceRef.kind,
      sourceRef.sourceId,
    ]),
    kind: 'section-source',
    documentId: document.id,
    projectId: document.projectId,
    sectionId: section.id,
    sectionTitle: section.title,
    label: sourceRef.label ?? sourceRef.sourceId,
    sourceRefs: [toEvidenceSourceRef(sourceRef)],
    contentHash: buildContentHash({
      kind: sourceRef.kind,
      sourceId: sourceRef.sourceId,
    }),
  }))
}

function buildTableEvidenceItems(
  document: DocumentBlueprint,
  section: DocumentSection,
): SourceEvidenceItem[] {
  return (section.tables ?? []).map((table) => {
    const tableId = table.id ?? buildDocumentTableId(table)
    const tableSourceAnalysisId = table.sourceAnalysisId?.trim()
    const sourceRefs: SourceEvidenceSourceRef[] = tableSourceAnalysisId
      ? [{
          kind: 'analysis',
          sourceId: tableSourceAnalysisId,
          label: table.sourceAnalysisLabel,
        }]
      : []

    return {
      key: buildSourceEvidenceKey([
        'doc',
        document.id,
        'section',
        section.id,
        'table',
        tableId,
      ]),
      kind: 'table',
      documentId: document.id,
      projectId: document.projectId,
      sectionId: section.id,
      sectionTitle: section.title,
      label: table.caption,
      sourceRefs,
      artifactId: tableId,
      artifactLabel: table.caption,
      contentHash: buildContentHash({
        caption: table.caption,
        headers: table.headers,
        htmlContent: table.htmlContent,
        rows: table.rows,
        sourceAnalysisId: table.sourceAnalysisId,
      }),
      summary: table.headers.join(', '),
    }
  })
}

function buildFigureEvidenceItems(
  document: DocumentBlueprint,
  section: DocumentSection,
): SourceEvidenceItem[] {
  return (section.figures ?? []).map((figure) => {
    const sourceRefs: SourceEvidenceSourceRef[] = [
      {
        kind: 'figure',
        sourceId: figure.entityId,
        label: figure.label,
      },
    ]

    if (figure.relatedAnalysisId) {
      sourceRefs.push({
        kind: 'analysis',
        sourceId: figure.relatedAnalysisId,
        label: figure.relatedAnalysisLabel,
      })
    }

    return {
      key: buildSourceEvidenceKey([
        'doc',
        document.id,
        'section',
        section.id,
        'figure',
        figure.entityId,
      ]),
      kind: 'figure',
      documentId: document.id,
      projectId: document.projectId,
      sectionId: section.id,
      sectionTitle: section.title,
      label: figure.caption,
      sourceRefs: dedupeSourceRefs(sourceRefs),
      artifactId: figure.entityId,
      artifactLabel: figure.label,
      contentHash: buildContentHash({
        caption: figure.caption,
        chartType: figure.chartType,
        entityId: figure.entityId,
        patternSummary: figure.patternSummary,
        relatedAnalysisId: figure.relatedAnalysisId,
      }),
      summary: figure.patternSummary,
    }
  })
}

function buildSupportSourceRefs(binding: DocumentSectionSupportBindingDraft): SourceEvidenceSourceRef[] {
  const sourceRefs: SourceEvidenceSourceRef[] = [{
    kind: binding.sourceKind,
    sourceId: binding.sourceId,
    label: binding.label,
  }]

  for (const citationId of binding.citationIds ?? []) {
    sourceRefs.push({
      kind: 'citation-record',
      sourceId: citationId,
      label: binding.label,
    })
  }

  for (const analysisId of binding.linkedAnalysisIds ?? []) {
    sourceRefs.push({
      kind: 'analysis',
      sourceId: analysisId,
      label: binding.label,
    })
  }

  for (const figureId of binding.linkedFigureIds ?? []) {
    sourceRefs.push({
      kind: 'figure',
      sourceId: figureId,
      label: binding.label,
    })
  }

  return dedupeSourceRefs(sourceRefs)
}

function buildSupportBindingStableId(binding: DocumentSectionSupportBindingDraft): string {
  if (binding.id?.trim()) {
    return binding.id.trim()
  }

  return buildSourceEvidenceKey([
    binding.sourceKind,
    binding.sourceId,
    binding.role,
    ...(binding.citationIds ?? []),
    ...(binding.linkedAnalysisIds ?? []),
    ...(binding.linkedFigureIds ?? []),
  ])
}

function buildSupportContentHash(binding: DocumentSectionSupportBindingDraft): string {
  return buildContentHash({
    citationIds: binding.citationIds ?? [],
    excerpt: binding.excerpt,
    linkedAnalysisIds: binding.linkedAnalysisIds ?? [],
    linkedFigureIds: binding.linkedFigureIds ?? [],
    role: binding.role,
    sourceId: binding.sourceId,
    sourceKind: binding.sourceKind,
    summary: binding.summary,
  })
}

function buildSupportEvidenceItems(
  document: DocumentBlueprint,
  section: DocumentSection,
): SourceEvidenceItem[] {
  const supportBindings = section.sectionSupportBindings as readonly DocumentSectionSupportBindingDraft[] | undefined
  return (supportBindings ?? [])
    .filter((binding) => binding.included !== false)
    .map((binding) => {
      const supportId = buildSupportBindingStableId(binding)
      return {
        key: buildSourceEvidenceKey([
          'doc',
          document.id,
          'section',
          section.id,
          'support',
          supportId,
        ]),
        kind: 'support-binding',
        documentId: document.id,
        projectId: document.projectId,
        sectionId: section.id,
        sectionTitle: section.title,
        label: binding.label ?? binding.sourceId,
        sourceRefs: buildSupportSourceRefs(binding),
        artifactId: supportId,
        artifactLabel: binding.role,
        contentHash: buildSupportContentHash(binding),
        summary: binding.summary ?? binding.excerpt,
      }
    })
}

function ensureUniqueItemKeys(items: readonly SourceEvidenceItem[]): SourceEvidenceItem[] {
  const groups = new Map<string, SourceEvidenceItem[]>()
  for (const item of items) {
    groups.set(item.key, [...(groups.get(item.key) ?? []), item])
  }

  const usedKeys = new Map<string, number>()
  return items.map((item) => {
    const group = groups.get(item.key) ?? []
    const candidateKey = group.length === 1
      ? item.key
      : buildSourceEvidenceKey([item.key, 'hash', item.contentHash])
    const count = usedKeys.get(candidateKey) ?? 0
    usedKeys.set(candidateKey, count + 1)

    return count === 0
      ? { ...item, key: candidateKey }
      : { ...item, key: buildSourceEvidenceKey([candidateKey, 'occurrence', String(count + 1)]) }
  })
}

export function buildSourceEvidenceIndex(document: DocumentBlueprint): SourceEvidenceIndex {
  const normalizedDocument = normalizeDocumentBlueprint(document)
  const rawItems: SourceEvidenceItem[] = []
  for (const [sectionIndex, section] of normalizedDocument.sections.entries()) {
    const originalSection = document.sections[sectionIndex] ?? section
    rawItems.push(
      ...buildSectionSourceEvidenceItems(normalizedDocument, section),
      ...buildTableEvidenceItems(normalizedDocument, section),
      ...buildFigureEvidenceItems(normalizedDocument, section),
      ...buildSupportEvidenceItems(normalizedDocument, originalSection),
    )
  }
  const items = ensureUniqueItemKeys(rawItems)

  const byKey: Record<string, SourceEvidenceItem> = {}
  const bySectionId: Record<string, string[]> = {}
  const bySourceKey: Record<string, string[]> = {}

  for (const item of items) {
    byKey[item.key] = item
    addIndexValue(bySectionId, item.sectionId, item.key)
    for (const sourceRef of item.sourceRefs) {
      addIndexValue(bySourceKey, buildSourceLookupKey(sourceRef), item.key)
    }
  }

  return {
    documentId: normalizedDocument.id,
    projectId: normalizedDocument.projectId,
    documentUpdatedAt: normalizedDocument.updatedAt,
    items,
    byKey,
    bySectionId,
    bySourceKey,
  }
}

export function getEvidenceKeysForSource(
  index: SourceEvidenceIndex,
  sourceRef: SourceEvidenceSourceRef,
): string[] {
  return [...(index.bySourceKey[buildSourceLookupKey(sourceRef)] ?? [])]
}

export function buildSourceSnapshotHashes(
  index: SourceEvidenceIndex,
): Record<string, string> {
  const sourceItems = new Map<string, Array<{
    key: string
    kind: SourceEvidenceItemKind
    artifactId?: string
    contentHash: string
  }>>()

  for (const item of index.items) {
    for (const sourceRef of item.sourceRefs) {
      if (sourceRef.sourceId.trim().length === 0) {
        continue
      }
      const sourceKey = buildSourceLookupKey(sourceRef)
      sourceItems.set(sourceKey, [
        ...(sourceItems.get(sourceKey) ?? []),
        {
          key: item.key,
          kind: item.kind,
          artifactId: item.artifactId,
          contentHash: item.contentHash,
        },
      ])
    }
  }

  const hashes: Record<string, string> = {}
  for (const [sourceKey, items] of sourceItems.entries()) {
    hashes[sourceKey] = buildContentHash(items.sort((left, right) => left.key.localeCompare(right.key)))
  }

  return hashes
}
