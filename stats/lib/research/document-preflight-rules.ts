import {
  buildDocumentQualitySnapshot,
  deriveDocumentQualitySummary,
  type BuildDocumentQualitySnapshotOptions,
  type DocumentQualityReport,
  type DocumentReviewFinding,
  type DocumentReviewFindingCategory,
  type DocumentReviewFindingSeverity,
} from './document-quality-types'
import {
  buildSourceSnapshotHashes,
  buildSourceEvidenceIndex,
  type SourceEvidenceIndex,
} from './document-source-evidence'
import {
  buildDocumentTableId,
  type DocumentBlueprint,
  type DocumentSection,
} from './document-blueprint-types'
import {
  checkNumericClaimEvidenceList,
  type NumericClaimEvidenceCheck,
  type NumericDocumentClaimEvidence,
} from './document-claim-evidence'

export const DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION = 'document-preflight-rules:v2'

type PreflightRuleId =
  | 'document.sources.none'
  | 'table.caption.missing'
  | 'table.source.missing'
  | 'figure.caption.missing'
  | 'support.source.missing'
  | 'support.citation.blank'
  | 'claim.numeric.missing'
  | 'claim.numeric.ambiguous'
  | 'claim.numeric.mismatch'

interface PreflightFindingDraft {
  ruleId: PreflightRuleId
  category: DocumentReviewFindingCategory
  severity: DocumentReviewFindingSeverity
  title: string
  message: string
  sectionId?: string
  artifactId?: string
  evidence?: DocumentReviewFinding['evidence']
}

export interface RunDocumentPreflightRulesOptions extends Omit<BuildDocumentQualitySnapshotOptions, 'ruleEngineVersion'> {
  reportId: string
  generatedAt: string
  evidenceIndex?: SourceEvidenceIndex
  numericClaims?: readonly NumericDocumentClaimEvidence[]
  ruleEngineVersion?: string
}

function buildFindingId(
  reportId: string,
  documentId: string,
  draft: PreflightFindingDraft,
): string {
  return [
    'finding',
    reportId,
    documentId,
    draft.ruleId,
    draft.sectionId ?? 'document',
    draft.artifactId ?? 'none',
  ].map((part) => encodeURIComponent(part)).join(':')
}

function toFinding(
  document: DocumentBlueprint,
  reportId: string,
  generatedAt: string,
  draft: PreflightFindingDraft,
): DocumentReviewFinding {
  return {
    id: buildFindingId(reportId, document.id, draft),
    reportId,
    documentId: document.id,
    projectId: document.projectId,
    ruleId: draft.ruleId,
    category: draft.category,
    severity: draft.severity,
    status: 'open',
    title: draft.title,
    message: draft.message,
    sectionId: draft.sectionId,
    evidence: draft.evidence ?? (draft.artifactId
      ? [{
          label: draft.artifactId,
          sourceId: draft.artifactId,
          sourceKind: 'document-artifact',
        }]
      : undefined),
    createdAt: generatedAt,
    updatedAt: generatedAt,
  }
}

function assertEvidenceIndexMatchesDocument(
  document: DocumentBlueprint,
  evidenceIndex: SourceEvidenceIndex,
): void {
  if (evidenceIndex.documentId !== document.id || evidenceIndex.projectId !== document.projectId) {
    throw new Error('[document-preflight-rules] SourceEvidenceIndex does not match document')
  }
}

function hasActualSourceEvidence(evidenceIndex: SourceEvidenceIndex): boolean {
  return evidenceIndex.items.some((item) => item.sourceRefs.some((sourceRef) => sourceRef.sourceId.trim().length > 0))
}

function collectDocumentSourceFindings(
  document: DocumentBlueprint,
  evidenceIndex: SourceEvidenceIndex,
): PreflightFindingDraft[] {
  if (hasActualSourceEvidence(evidenceIndex)) {
    return []
  }

  return [{
    ruleId: 'document.sources.none',
    category: 'source',
    severity: 'warning',
    title: '근거 연결 없음',
    message: '문서에 연결된 분석, 표, 그림, 문헌 근거가 없습니다.',
  }]
}

function collectTableFindings(section: DocumentSection): PreflightFindingDraft[] {
  const findings: PreflightFindingDraft[] = []
  for (const table of section.tables ?? []) {
    const artifactId = table.id ?? buildDocumentTableId(table)
    if (table.caption.trim().length === 0) {
      findings.push({
        ruleId: 'table.caption.missing',
        category: 'format',
        severity: 'warning',
        title: '표 caption 누락',
        message: '표 caption이 비어 있습니다.',
        sectionId: section.id,
        artifactId,
      })
    }

    if (!table.sourceAnalysisId?.trim()) {
      findings.push({
        ruleId: 'table.source.missing',
        category: 'source',
        severity: section.generatedBy === 'user' ? 'warning' : 'error',
        title: '표 원본 분석 누락',
        message: '표에 연결된 원본 분석 ID가 없습니다.',
        sectionId: section.id,
        artifactId,
      })
    }
  }
  return findings
}

function collectFigureFindings(section: DocumentSection): PreflightFindingDraft[] {
  const findings: PreflightFindingDraft[] = []
  for (const [index, figure] of (section.figures ?? []).entries()) {
    const artifactId = figure.entityId || `figure-${index + 1}`
    if (figure.caption.trim().length === 0) {
      findings.push({
        ruleId: 'figure.caption.missing',
        category: 'format',
        severity: 'warning',
        title: '그림 caption 누락',
        message: '그림 caption이 비어 있습니다.',
        sectionId: section.id,
        artifactId,
      })
    }
  }
  return findings
}

function collectSupportFindings(section: DocumentSection): PreflightFindingDraft[] {
  const findings: PreflightFindingDraft[] = []
  for (const [index, binding] of (section.sectionSupportBindings ?? []).entries()) {
    if (binding.included === false) {
      continue
    }

    const artifactId = binding.id || `support-${index + 1}`
    if (binding.sourceId.trim().length === 0) {
      findings.push({
        ruleId: 'support.source.missing',
        category: 'source',
        severity: 'error',
        title: '문헌 근거 source 누락',
        message: '포함된 문헌 근거에 source ID가 없습니다.',
        sectionId: section.id,
        artifactId,
      })
    }

    const hasBlankCitationId = (binding.citationIds ?? []).some((citationId) => citationId.trim().length === 0)
    if (hasBlankCitationId) {
      findings.push({
        ruleId: 'support.citation.blank',
        category: 'citation',
        severity: 'warning',
        title: '빈 citation ID',
        message: '문헌 근거의 citation ID 목록에 빈 값이 있습니다.',
        sectionId: section.id,
        artifactId,
      })
    }
  }
  return findings
}

function collectPreflightFindingDrafts(
  document: DocumentBlueprint,
  evidenceIndex: SourceEvidenceIndex,
  numericClaims: readonly NumericDocumentClaimEvidence[] = [],
): PreflightFindingDraft[] {
  return [
    ...collectDocumentSourceFindings(document, evidenceIndex),
    ...document.sections.flatMap((section) => [
      ...collectTableFindings(section),
      ...collectFigureFindings(section),
      ...collectSupportFindings(section),
    ]),
    ...collectNumericClaimFindings(numericClaims, checkNumericClaimEvidenceList(evidenceIndex, numericClaims)),
  ]
}

function collectNumericClaimFindings(
  claims: readonly NumericDocumentClaimEvidence[],
  checks: readonly NumericClaimEvidenceCheck[],
): PreflightFindingDraft[] {
  return checks.flatMap((check, index): PreflightFindingDraft[] => {
    const claim = claims[index]
    if (!claim || check.status === 'linked') {
      return []
    }

    const evidence: DocumentReviewFinding['evidence'] = [{
      label: check.evidenceKey ? `${claim.text} (${check.evidenceKey})` : claim.text,
      observedValue: check.observedValue,
      expectedValue: check.expectedValue,
    }]

    if (check.status === 'mismatch') {
      return [{
        ruleId: 'claim.numeric.mismatch',
        category: 'source',
        severity: 'error',
        title: 'Source-bound numeric claim mismatch',
        message: 'A structured numeric claim does not match its linked evidence.',
        sectionId: claim.sectionId,
        artifactId: claim.claimId,
        evidence,
      }]
    }

    if (check.status === 'ambiguous') {
      return [{
        ruleId: 'claim.numeric.ambiguous',
        category: 'source',
        severity: 'warning',
        title: 'Ambiguous numeric claim evidence',
        message: 'A structured numeric claim has multiple possible evidence rows or items.',
        sectionId: claim.sectionId,
        artifactId: claim.claimId,
        evidence,
      }]
    }

    return [{
      ruleId: 'claim.numeric.missing',
      category: 'source',
      severity: 'error',
      title: 'Numeric claim evidence missing',
      message: 'A structured numeric claim is missing linked evidence.',
      sectionId: claim.sectionId,
      artifactId: claim.claimId,
      evidence,
    }]
  })
}

export function runDocumentPreflightRules(
  document: DocumentBlueprint,
  options: RunDocumentPreflightRulesOptions,
): DocumentQualityReport {
  const ruleEngineVersion = options.ruleEngineVersion ?? DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION
  const evidenceIndex = options.evidenceIndex ?? buildSourceEvidenceIndex(document)
  assertEvidenceIndexMatchesDocument(document, evidenceIndex)
  const sourceSnapshotHashes = options.sourceSnapshotHashes ?? buildSourceSnapshotHashes(evidenceIndex)
  const findings = collectPreflightFindingDrafts(document, evidenceIndex, options.numericClaims)
    .map((draft) => toFinding(document, options.reportId, options.generatedAt, draft))

  return {
    id: options.reportId,
    documentId: document.id,
    projectId: document.projectId,
    status: 'completed',
    snapshot: buildDocumentQualitySnapshot(document, {
      ruleEngineVersion,
      sourceSnapshotHashes,
      targetJournalProfileVersion: options.targetJournalProfileVersion,
    }),
    findings,
    summary: deriveDocumentQualitySummary(findings),
    generatedAt: options.generatedAt,
    updatedAt: options.generatedAt,
  }
}
