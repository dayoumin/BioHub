import type { DocumentBlueprint, DocumentSection } from './document-blueprint-types'

export type DocumentQualityFreshness = 'missing' | 'fresh' | 'stale'

export type DocumentQualityReportStatus =
  | 'pending'
  | 'completed'
  | 'partial'
  | 'failed'

export type DocumentReviewFindingSeverity =
  | 'info'
  | 'warning'
  | 'error'
  | 'critical'

export type DocumentReviewFindingStatus =
  | 'open'
  | 'resolved'
  | 'ignored'

export type DocumentReviewFindingCategory =
  | 'flow'
  | 'style'
  | 'mechanics'
  | 'source'
  | 'citation'
  | 'journal'
  | 'format'
  | 'other'

export interface DocumentReviewTargetRange {
  startOffset: number
  endOffset: number
  sectionHash: string
}

export interface DocumentReviewEvidence {
  label: string
  sourceId?: string
  sourceKind?: string
  observedValue?: string
  expectedValue?: string
}

export interface DocumentReviewSuggestion {
  replacementText: string
  canAutoApply: boolean
  requiresUserConfirmation: boolean
}

export interface DocumentReviewFinding {
  id: string
  reportId: string
  documentId: string
  projectId: string
  ruleId: string
  category: DocumentReviewFindingCategory
  severity: DocumentReviewFindingSeverity
  status: DocumentReviewFindingStatus
  title: string
  message: string
  sectionId?: string
  targetRange?: DocumentReviewTargetRange
  evidence?: DocumentReviewEvidence[]
  suggestion?: DocumentReviewSuggestion
  ignoredReason?: string
  createdAt: string
  updatedAt: string
}

export interface DocumentQualitySnapshot {
  documentId: string
  projectId: string
  baseDocumentUpdatedAt: string
  documentContentHash: string
  sectionHashes: Record<string, string>
  sourceSnapshotHashes: Record<string, string>
  targetJournalProfileVersion?: string
  ruleEngineVersion: string
}

export interface DocumentQualitySummary {
  totalFindings: number
  openFindings: number
  resolvedFindings: number
  ignoredFindings: number
  info: number
  warning: number
  error: number
  critical: number
  unresolvedCritical: number
}

export interface DocumentQualityReport {
  id: string
  documentId: string
  projectId: string
  status: DocumentQualityReportStatus
  snapshot: DocumentQualitySnapshot
  findings: DocumentReviewFinding[]
  summary: DocumentQualitySummary
  generatedAt: string
  updatedAt: string
  errorMessage?: string
}

export interface BuildDocumentQualitySnapshotOptions {
  sourceSnapshotHashes?: Record<string, string>
  targetJournalProfileVersion?: string
  ruleEngineVersion: string
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

function buildSectionHash(section: DocumentSection): string {
  return hashString(stableStringify({
    content: section.content,
    figures: section.figures ?? [],
    generatedBy: section.generatedBy,
    plateValue: section.plateValue ?? null,
    sectionSupportBindings: section.sectionSupportBindings ?? [],
    sourceRefs: section.sourceRefs ?? [],
    tables: section.tables ?? [],
    title: section.title,
  }))
}

export function buildDocumentSectionQualityHash(section: DocumentSection): string {
  return buildSectionHash(section)
}

function recordsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  return leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
}

export function buildDocumentQualitySnapshot(
  document: DocumentBlueprint,
  options: BuildDocumentQualitySnapshotOptions,
): DocumentQualitySnapshot {
  const sectionHashes: Record<string, string> = {}
  for (const section of document.sections) {
    sectionHashes[section.id] = buildSectionHash(section)
  }

  return {
    documentId: document.id,
    projectId: document.projectId,
    baseDocumentUpdatedAt: document.updatedAt,
    documentContentHash: hashString(stableStringify({
      language: document.language,
      metadata: document.metadata,
      preset: document.preset,
      sections: document.sections.map((section) => ({
        id: section.id,
        hash: sectionHashes[section.id],
      })),
      title: document.title,
    })),
    sectionHashes,
    sourceSnapshotHashes: { ...(options.sourceSnapshotHashes ?? {}) },
    targetJournalProfileVersion: options.targetJournalProfileVersion,
    ruleEngineVersion: options.ruleEngineVersion,
  }
}

export function getDocumentQualityFreshness(
  document: DocumentBlueprint,
  report: DocumentQualityReport | null | undefined,
  options: BuildDocumentQualitySnapshotOptions,
): DocumentQualityFreshness {
  if (!report) {
    return 'missing'
  }

  const currentSnapshot = buildDocumentQualitySnapshot(document, options)
  const previousSnapshot = report.snapshot

  if (
    currentSnapshot.documentId !== previousSnapshot.documentId
    || currentSnapshot.projectId !== previousSnapshot.projectId
    || currentSnapshot.baseDocumentUpdatedAt !== previousSnapshot.baseDocumentUpdatedAt
    || currentSnapshot.documentContentHash !== previousSnapshot.documentContentHash
    || currentSnapshot.ruleEngineVersion !== previousSnapshot.ruleEngineVersion
    || currentSnapshot.targetJournalProfileVersion !== previousSnapshot.targetJournalProfileVersion
    || !recordsEqual(currentSnapshot.sectionHashes, previousSnapshot.sectionHashes)
    || !recordsEqual(currentSnapshot.sourceSnapshotHashes, previousSnapshot.sourceSnapshotHashes)
  ) {
    return 'stale'
  }

  return 'fresh'
}

export function deriveDocumentQualitySummary(
  findings: readonly DocumentReviewFinding[],
): DocumentQualitySummary {
  const openFindings = findings.filter((finding) => finding.status === 'open')
  return {
    totalFindings: findings.length,
    openFindings: openFindings.length,
    resolvedFindings: findings.filter((finding) => finding.status === 'resolved').length,
    ignoredFindings: findings.filter((finding) => finding.status === 'ignored').length,
    info: openFindings.filter((finding) => finding.severity === 'info').length,
    warning: openFindings.filter((finding) => finding.severity === 'warning').length,
    error: openFindings.filter((finding) => finding.severity === 'error').length,
    critical: openFindings.filter((finding) => finding.severity === 'critical').length,
    unresolvedCritical: openFindings.filter((finding) => finding.severity === 'critical').length,
  }
}

export function updateDocumentReviewFindingStatus(
  report: DocumentQualityReport,
  findingId: string,
  status: DocumentReviewFindingStatus,
  options: {
    ignoredReason?: string
    updatedAt?: string
  } = {},
): DocumentQualityReport {
  const updatedAt = options.updatedAt ?? new Date().toISOString()
  let found = false
  const findings = report.findings.map((finding) => {
    if (finding.id !== findingId) {
      return finding
    }

    found = true
    return {
      ...finding,
      status,
      ignoredReason: status === 'ignored' ? options.ignoredReason : undefined,
      updatedAt,
    }
  })

  if (!found) {
    throw new Error('[document-quality] Finding not found')
  }

  return {
    ...report,
    findings,
    summary: deriveDocumentQualitySummary(findings),
    updatedAt,
  }
}
