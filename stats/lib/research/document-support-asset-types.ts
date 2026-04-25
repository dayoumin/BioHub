import { generateId } from '@/lib/utils/generate-id'

export type DocumentSupportAssetKind =
  | 'citation-record'
  | 'reference-package'
  | 'deep-research-note'

export type DocumentSectionSupportRole =
  | 'background'
  | 'method-rationale'
  | 'method-reference'
  | 'comparison'
  | 'interpretation'
  | 'limitation'
  | 'implication'
  | 'takeaway'

export type DocumentSectionSupportOrigin = 'user' | 'writer'

export const DOCUMENT_SECTION_SUPPORT_ROLE_LABELS: Record<DocumentSectionSupportRole, string> = {
  background: '배경',
  'method-rationale': '방법 근거',
  'method-reference': '방법 문헌',
  comparison: '비교',
  interpretation: '해석',
  limitation: '한계',
  implication: '시사점',
  takeaway: '핵심 결론',
}

export function inferDocumentSectionSupportRole(
  sectionId: string | null | undefined,
): DocumentSectionSupportRole {
  switch (sectionId) {
    case 'methods':
      return 'method-reference'
    case 'results':
      return 'interpretation'
    case 'discussion':
      return 'comparison'
    case 'conclusion':
      return 'takeaway'
    default:
      return 'background'
  }
}

export function getRecommendedDocumentSectionSupportRoles(
  sectionId: string | null | undefined,
): DocumentSectionSupportRole[] {
  switch (sectionId) {
    case 'methods':
      return ['method-reference', 'method-rationale', 'background']
    case 'results':
      return ['interpretation', 'comparison', 'limitation']
    case 'discussion':
      return ['comparison', 'interpretation', 'implication']
    case 'conclusion':
      return ['takeaway', 'implication', 'background']
    default:
      return ['background', 'comparison', 'interpretation']
  }
}

export interface CitationRecordSupportAsset {
  kind: 'citation-record'
  sourceId: string
  citationId: string
  title?: string
  doi?: string
  url?: string
}

export interface ReferencePackageSupportAsset {
  kind: 'reference-package'
  sourceId: string
  title: string
  citationIds?: string[]
  format?: 'bibtex' | 'ris' | 'json'
  note?: string
}

export interface DeepResearchNoteSupportAsset {
  kind: 'deep-research-note'
  sourceId: string
  title: string
  summary?: string
  excerpt?: string
  citationIds?: string[]
}

export type DocumentSupportAssetRecord =
  | CitationRecordSupportAsset
  | ReferencePackageSupportAsset
  | DeepResearchNoteSupportAsset

export interface DocumentSectionSupportBinding {
  id: string
  sourceKind: DocumentSupportAssetKind
  sourceId: string
  role: DocumentSectionSupportRole
  label?: string
  summary?: string
  excerpt?: string
  citationIds?: string[]
  linkedAnalysisIds?: string[]
  linkedFigureIds?: string[]
  included: boolean
  origin: DocumentSectionSupportOrigin
}

export interface DocumentSectionSupportBindingDraft {
  id?: string
  sourceKind: DocumentSupportAssetKind
  sourceId: string
  role: DocumentSectionSupportRole
  label?: string
  summary?: string
  excerpt?: string
  citationIds?: string[]
  linkedAnalysisIds?: string[]
  linkedFigureIds?: string[]
  included?: boolean
  origin?: DocumentSectionSupportOrigin
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function dedupeIds(ids: readonly string[] | undefined): string[] | undefined {
  if (!ids || ids.length === 0) {
    return undefined
  }

  const unique = ids
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .filter((value, index, values) => values.indexOf(value) === index)

  return unique.length > 0 ? unique : undefined
}

export function buildDocumentSectionSupportBindingIdentity(
  binding: Pick<DocumentSectionSupportBindingDraft, 'id' | 'sourceKind' | 'sourceId' | 'role' | 'label' | 'summary' | 'excerpt'>,
): string {
  if (binding.id?.trim()) {
    return `binding:${binding.id.trim()}`
  }

  const label = normalizeOptionalText(binding.label) ?? ''
  const summary = normalizeOptionalText(binding.summary) ?? ''
  const excerpt = normalizeOptionalText(binding.excerpt) ?? ''
  return `${binding.sourceKind}:${binding.sourceId.trim()}:${binding.role}:${label}:${summary}:${excerpt}`
}

export function normalizeDocumentSectionSupportBinding(
  binding: DocumentSectionSupportBindingDraft,
): DocumentSectionSupportBinding {
  return {
    id: binding.id?.trim() || generateId('dsb'),
    sourceKind: binding.sourceKind,
    sourceId: binding.sourceId.trim(),
    role: binding.role,
    label: normalizeOptionalText(binding.label),
    summary: normalizeOptionalText(binding.summary),
    excerpt: normalizeOptionalText(binding.excerpt),
    citationIds: dedupeIds(binding.citationIds),
    linkedAnalysisIds: dedupeIds(binding.linkedAnalysisIds),
    linkedFigureIds: dedupeIds(binding.linkedFigureIds),
    included: binding.included ?? true,
    origin: binding.origin ?? 'user',
  }
}

export function normalizeDocumentSectionSupportBindings(
  bindings: readonly DocumentSectionSupportBindingDraft[] | undefined,
): DocumentSectionSupportBinding[] | undefined {
  if (!bindings || bindings.length === 0) {
    return undefined
  }

  const merged = new Map<string, DocumentSectionSupportBinding>()
  for (const binding of bindings) {
    const normalized = normalizeDocumentSectionSupportBinding(binding)
    const key = buildDocumentSectionSupportBindingIdentity(normalized)
    const previous = merged.get(key)
    merged.set(key, previous
      ? mergeDocumentSectionSupportBindings([previous], [normalized])?.[0] ?? normalized
      : normalized)
  }

  return merged.size > 0 ? Array.from(merged.values()) : undefined
}

export function mergeDocumentSectionSupportBindings(
  currentBindings: readonly DocumentSectionSupportBindingDraft[] | undefined,
  nextBindings: readonly DocumentSectionSupportBindingDraft[] | undefined,
): DocumentSectionSupportBinding[] | undefined {
  const current = normalizeDocumentSectionSupportBindings(currentBindings)
  if (!nextBindings || nextBindings.length === 0) {
    return current ? [...current] : undefined
  }

  const merged = new Map<string, DocumentSectionSupportBinding>()

  for (const binding of current ?? []) {
    merged.set(buildDocumentSectionSupportBindingIdentity(binding), binding)
  }

  for (const binding of nextBindings) {
    const normalized = normalizeDocumentSectionSupportBinding(binding)
    const key = buildDocumentSectionSupportBindingIdentity(normalized)
    const previous = merged.get(key)
    merged.set(key, {
      ...previous,
      ...normalized,
      id: previous?.id ?? normalized.id,
      included: previous?.included === false
        ? false
        : normalized.included,
      origin: previous?.origin === 'user'
        ? 'user'
        : normalized.origin,
      citationIds: dedupeIds([
        ...(previous?.citationIds ?? []),
        ...(normalized.citationIds ?? []),
      ]),
      linkedAnalysisIds: dedupeIds([
        ...(previous?.linkedAnalysisIds ?? []),
        ...(normalized.linkedAnalysisIds ?? []),
      ]),
      linkedFigureIds: dedupeIds([
        ...(previous?.linkedFigureIds ?? []),
        ...(normalized.linkedFigureIds ?? []),
      ]),
    })
  }

  return merged.size > 0 ? Array.from(merged.values()) : undefined
}
