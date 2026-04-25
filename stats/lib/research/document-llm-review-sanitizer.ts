import type { DocumentBlueprint } from './document-blueprint-types'
import type {
  DocumentReviewFinding,
  DocumentReviewFindingCategory,
  DocumentReviewFindingSeverity,
  DocumentReviewSuggestion,
} from './document-quality-types'

export const DOCUMENT_LLM_REVIEW_SANITIZER_VERSION = 'document-llm-review-sanitizer:v1'

type LlmReviewCategory = Extract<DocumentReviewFindingCategory, 'flow' | 'style' | 'mechanics' | 'other'>

export interface SanitizeDocumentLlmReviewOptions {
  reportId: string
  generatedAt: string
}

const ALLOWED_CATEGORIES: readonly LlmReviewCategory[] = ['flow', 'style', 'mechanics', 'other']
const ALLOWED_SEVERITIES: readonly DocumentReviewFindingSeverity[] = ['info', 'warning', 'error']
const FORBIDDEN_PATCH_KEYS: readonly string[] = [
  'citation',
  'citationId',
  'citationIds',
  'citations',
  'content',
  'figure',
  'figures',
  'plateValue',
  'reference',
  'referenceId',
  'referenceIds',
  'references',
  'sourceBoundStatistic',
  'sourceRef',
  'sourceRefs',
  'statistic',
  'statistics',
  'table',
  'tables',
]
const FORBIDDEN_PATCH_KEY_FRAGMENTS: readonly string[] = [
  'citation',
  'content',
  'figure',
  'platevalue',
  'reference',
  'sourceref',
  'sourcebound',
  'statistic',
  'table',
]
const SOURCE_BOUND_REPLACEMENT_PATTERNS: readonly RegExp[] = [
  /\bp\s*[<=>\u2264\u2265]\s*(?:0?\.\d+|\.\d+)/i,
  /\b(?:f|t|z)\s*\([^)]*\)\s*=\s*-?\d+(?:\.\d+)?/i,
  /\b(?:chi[- ]?square|chi2|\u03c72|\u03c7\u00b2)\b/i,
  /\bn\s*=\s*\d+/i,
  /\b(?:95%\s*)?ci\b/i,
  /\b(?:or|rr|hr|aor|beta|r)\s*=\s*-?\d+(?:\.\d+)?/i,
  /\b(?:mean|sd|se)\b/i,
  /\d+(?:\.\d+)?\s*%/,
  /\u00b1/,
  /\bdoi\s*:\s*\S+/i,
  /\b10\.\d{4,9}\/\S+/i,
  /\[(?:citation|reference|ref):[^\]]+\]/i,
  /\b(?:table|figure|fig\.)\s+\d+\b/i,
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeCategory(value: unknown): LlmReviewCategory | null {
  if (typeof value !== 'string') {
    return null
  }

  return ALLOWED_CATEGORIES.includes(value as LlmReviewCategory)
    ? value as LlmReviewCategory
    : null
}

function normalizeSeverity(value: unknown): DocumentReviewFindingSeverity {
  if (value === 'critical') {
    return 'error'
  }

  return ALLOWED_SEVERITIES.includes(value as DocumentReviewFindingSeverity)
    ? value as DocumentReviewFindingSeverity
    : 'warning'
}

function hasForbiddenPatchKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenPatchKey(item))
  }

  if (!isRecord(value)) {
    return false
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = key.toLowerCase()
    const hasForbiddenKey = FORBIDDEN_PATCH_KEYS.some((forbiddenKey) => (
      normalizedKey === forbiddenKey.toLowerCase()
    )) || FORBIDDEN_PATCH_KEY_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment))

    return hasForbiddenKey || hasForbiddenPatchKey(nestedValue)
  })
}

function looksSourceBoundReplacement(value: string): boolean {
  return SOURCE_BOUND_REPLACEMENT_PATTERNS.some((pattern) => pattern.test(value))
}

function buildLlmFindingId(
  reportId: string,
  documentId: string,
  index: number,
  category: LlmReviewCategory,
  title: string,
): string {
  return [
    'finding',
    reportId,
    documentId,
    'llm',
    category,
    String(index + 1),
    title,
  ].map((part) => encodeURIComponent(part)).join(':')
}

function normalizeSectionId(document: DocumentBlueprint, value: unknown): string | undefined {
  const sectionId = normalizeText(value)
  if (!sectionId) {
    return undefined
  }

  return document.sections.some((section) => section.id === sectionId) ? sectionId : undefined
}

function normalizeSuggestion(value: unknown): DocumentReviewSuggestion | undefined {
  if (!isRecord(value) || hasForbiddenPatchKey(value)) {
    return undefined
  }

  const replacementText = normalizeText(value.replacementText)
  if (!replacementText || looksSourceBoundReplacement(replacementText)) {
    return undefined
  }

  return {
    replacementText,
    canAutoApply: false,
    requiresUserConfirmation: true,
  }
}

function toFinding(
  document: DocumentBlueprint,
  rawFinding: Record<string, unknown>,
  options: SanitizeDocumentLlmReviewOptions,
  index: number,
): DocumentReviewFinding | null {
  if (hasForbiddenPatchKey(rawFinding)) {
    return null
  }

  const category = normalizeCategory(rawFinding.category)
  const title = normalizeText(rawFinding.title)
  const message = normalizeText(rawFinding.message)
  if (!category || !title || !message) {
    return null
  }

  if (hasForbiddenPatchKey(rawFinding.suggestion)) {
    return null
  }

  const suggestion = normalizeSuggestion(rawFinding.suggestion)

  return {
    id: buildLlmFindingId(options.reportId, document.id, index, category, title),
    reportId: options.reportId,
    documentId: document.id,
    projectId: document.projectId,
    ruleId: `${DOCUMENT_LLM_REVIEW_SANITIZER_VERSION}:${category}`,
    category,
    severity: normalizeSeverity(rawFinding.severity),
    status: 'open',
    title,
    message,
    sectionId: normalizeSectionId(document, rawFinding.sectionId),
    suggestion,
    createdAt: options.generatedAt,
    updatedAt: options.generatedAt,
  }
}

export function sanitizeDocumentLlmReviewFindings(
  document: DocumentBlueprint,
  rawFindings: readonly unknown[],
  options: SanitizeDocumentLlmReviewOptions,
): DocumentReviewFinding[] {
  return rawFindings.flatMap((rawFinding, index) => {
    if (!isRecord(rawFinding)) {
      return []
    }

    const finding = toFinding(document, rawFinding, options, index)
    return finding ? [finding] : []
  })
}
