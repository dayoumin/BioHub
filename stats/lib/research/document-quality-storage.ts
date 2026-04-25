import { openDB } from '@/lib/utils/adapters/indexeddb-adapter'
import { txDelete, txGet, txGetAll, txGetByIndex, txPut } from '@/lib/utils/indexeddb-helpers'
import {
  emitCrossTabCustomEvent,
  registerCrossTabCustomEventBridge,
} from '@/lib/utils/cross-tab-custom-events'
import {
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFindingStatus,
  updateDocumentReviewFindingStatus,
} from './document-quality-types'

const STORE_NAME = 'document-quality-reports'
export const DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT = 'document-quality-reports-changed'
const DOCUMENT_QUALITY_REPORTS_CHANGED_CHANNEL = 'document-quality-reports'

export interface DocumentQualityReportsChangedDetail {
  reportId: string
  documentId: string
  projectId: string
  action: 'saved' | 'deleted'
  updatedAt?: string
}

function cloneReport(report: DocumentQualityReport): DocumentQualityReport {
  return {
    ...report,
    snapshot: {
      ...report.snapshot,
      sectionHashes: { ...report.snapshot.sectionHashes },
      sourceSnapshotHashes: { ...report.snapshot.sourceSnapshotHashes },
    },
    findings: report.findings.map((finding) => ({
      ...finding,
      targetRange: finding.targetRange ? { ...finding.targetRange } : undefined,
      evidence: finding.evidence?.map((evidence) => ({ ...evidence })),
      suggestion: finding.suggestion ? { ...finding.suggestion } : undefined,
    })),
    summary: { ...report.summary },
  }
}

function validateReport(report: DocumentQualityReport): void {
  for (const finding of report.findings) {
    if (
      finding.reportId !== report.id
      || finding.documentId !== report.documentId
      || finding.projectId !== report.projectId
    ) {
      throw new Error('[document-quality-storage] Finding identity does not match report identity')
    }

    if (finding.targetRange) {
      if (!finding.sectionId) {
        throw new Error('[document-quality-storage] Finding targetRange requires sectionId')
      }
      if (
        finding.targetRange.startOffset < 0
        || finding.targetRange.endOffset < finding.targetRange.startOffset
      ) {
        throw new Error('[document-quality-storage] Finding targetRange offsets are invalid')
      }
    }
  }
}

function normalizeReport(report: DocumentQualityReport): DocumentQualityReport {
  validateReport(report)
  return {
    ...cloneReport(report),
    summary: deriveDocumentQualitySummary(report.findings),
  }
}

function notifyDocumentQualityReportsChanged(detail: DocumentQualityReportsChangedDetail): void {
  emitCrossTabCustomEvent<DocumentQualityReportsChangedDetail>(
    DOCUMENT_QUALITY_REPORTS_CHANGED_CHANNEL,
    DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT,
    detail,
  )
}

function sortReportsByLatest(reports: DocumentQualityReport[]): DocumentQualityReport[] {
  return [...reports].sort((left, right) => {
    const generatedCompare = right.generatedAt.localeCompare(left.generatedAt)
    if (generatedCompare !== 0) {
      return generatedCompare
    }
    const snapshotCompare = right.snapshot.baseDocumentUpdatedAt.localeCompare(left.snapshot.baseDocumentUpdatedAt)
    if (snapshotCompare !== 0) {
      return snapshotCompare
    }
    return right.id.localeCompare(left.id)
  })
}

registerCrossTabCustomEventBridge<DocumentQualityReportsChangedDetail>(
  DOCUMENT_QUALITY_REPORTS_CHANGED_CHANNEL,
  DOCUMENT_QUALITY_REPORTS_CHANGED_EVENT,
)

export async function saveDocumentQualityReport(
  report: DocumentQualityReport,
): Promise<DocumentQualityReport> {
  const db = await openDB()
  const toSave = normalizeReport(report)
  await txPut<DocumentQualityReport>(db, STORE_NAME, toSave)
  notifyDocumentQualityReportsChanged({
    reportId: report.id,
    documentId: report.documentId,
    projectId: report.projectId,
    action: 'saved',
    updatedAt: report.updatedAt,
  })
  return cloneReport(toSave)
}

export async function loadDocumentQualityReport(
  reportId: string,
): Promise<DocumentQualityReport | null> {
  const db = await openDB()
  const report = await txGet<DocumentQualityReport>(db, STORE_NAME, reportId)
  return report ? cloneReport(report) : null
}

export async function listDocumentQualityReports(
  filters: {
    documentId?: string
    projectId?: string
  } = {},
): Promise<DocumentQualityReport[]> {
  const db = await openDB()
  const reports = filters.documentId
    ? await txGetByIndex<DocumentQualityReport>(db, STORE_NAME, 'documentId', filters.documentId)
    : filters.projectId
      ? await txGetByIndex<DocumentQualityReport>(db, STORE_NAME, 'projectId', filters.projectId)
      : await txGetAll<DocumentQualityReport>(db, STORE_NAME)

  const filteredReports = reports.filter((report) => (
    (!filters.documentId || report.documentId === filters.documentId)
    && (!filters.projectId || report.projectId === filters.projectId)
  ))

  return sortReportsByLatest(filteredReports).map((report) => cloneReport(report))
}

export async function getLatestDocumentQualityReport(
  documentId: string,
): Promise<DocumentQualityReport | null> {
  const reports = await listDocumentQualityReports({ documentId })
  return reports[0] ? cloneReport(reports[0]) : null
}

export async function updateDocumentQualityFindingStatus(
  reportId: string,
  findingId: string,
  status: DocumentReviewFindingStatus,
  options: {
    ignoredReason?: string
    updatedAt?: string
  } = {},
): Promise<DocumentQualityReport> {
  const existing = await loadDocumentQualityReport(reportId)
  if (!existing) {
    throw new Error('[document-quality-storage] Report not found')
  }

  return saveDocumentQualityReport(updateDocumentReviewFindingStatus(existing, findingId, status, options))
}

export async function deleteDocumentQualityReport(reportId: string): Promise<void> {
  const db = await openDB()
  const existing = await txGet<DocumentQualityReport>(db, STORE_NAME, reportId)
  await txDelete(db, STORE_NAME, reportId)
  if (existing) {
    notifyDocumentQualityReportsChanged({
      reportId,
      documentId: existing.documentId,
      projectId: existing.projectId,
      action: 'deleted',
    })
  }
}
