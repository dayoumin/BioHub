import {
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFinding,
} from './document-quality-types'

export const DOCUMENT_LLM_REVIEW_REPORT_MERGE_VERSION = 'document-llm-review-report-merge:v1'

export interface MergeDocumentLlmReviewOptions {
  updatedAt: string
  errorMessage?: string
}

function assertFindingBelongsToReport(
  report: DocumentQualityReport,
  finding: DocumentReviewFinding,
): void {
  if (
    finding.reportId !== report.id
    || finding.documentId !== report.documentId
    || finding.projectId !== report.projectId
  ) {
    throw new Error('[document-llm-review-report] Finding identity does not match report identity')
  }
}

function mergeUniqueFindings(
  report: DocumentQualityReport,
  llmFindings: readonly DocumentReviewFinding[],
): DocumentReviewFinding[] {
  const merged = new Map<string, DocumentReviewFinding>()
  for (const finding of report.findings) {
    merged.set(finding.id, finding)
  }

  for (const finding of llmFindings) {
    assertFindingBelongsToReport(report, finding)
    if (!merged.has(finding.id)) {
      merged.set(finding.id, finding)
    }
  }

  return Array.from(merged.values())
}

export function mergeDocumentLlmReviewFindingsIntoReport(
  report: DocumentQualityReport,
  llmFindings: readonly DocumentReviewFinding[],
  options: MergeDocumentLlmReviewOptions,
): DocumentQualityReport {
  const findings = mergeUniqueFindings(report, llmFindings)
  const hasLlmFailure = Boolean(options.errorMessage?.trim())

  return {
    ...report,
    status: hasLlmFailure ? 'partial' : report.status === 'failed' ? 'partial' : 'completed',
    findings,
    summary: deriveDocumentQualitySummary(findings),
    errorMessage: hasLlmFailure ? options.errorMessage?.trim() : report.errorMessage,
    updatedAt: options.updatedAt,
  }
}
