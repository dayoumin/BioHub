import type {
  SourceEvidenceIndex,
  SourceEvidenceItem,
} from './document-source-evidence'

export type NumericClaimOperator = '=' | '<' | '<=' | '>' | '>='

export interface NumericDocumentClaimEvidence {
  claimId: string
  documentId: string
  sectionId: string
  text: string
  evidenceKeys: string[]
  metricLabel: string
  operator: NumericClaimOperator
  value: number
  rowLabel?: string
}

export type NumericClaimEvidenceStatus =
  | 'linked'
  | 'missing'
  | 'ambiguous'
  | 'mismatch'

export interface NumericClaimEvidenceCheck {
  claimId: string
  status: NumericClaimEvidenceStatus
  evidenceKey?: string
  observedValue?: string
  expectedValue: string
}

function normalizeMetricLabel(value: string): string {
  return value.trim().toLowerCase()
}

function parseNumericCell(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '')
  if (!normalized) {
    return null
  }

  const percentage = normalized.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))%$/)
  if (percentage?.[1]) {
    return Number(percentage[1]) / 100
  }

  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function findMetricValueInTable(
  item: SourceEvidenceItem,
  claim: NumericDocumentClaimEvidence,
): { status: 'found'; value: string } | { status: 'missing' | 'ambiguous' } {
  if (item.kind !== 'table') {
    return { status: 'missing' }
  }

  const table = item.table
  if (!table) {
    return { status: 'missing' }
  }

  const normalizedMetric = normalizeMetricLabel(claim.metricLabel)
  const headerIndex = table.headers.findIndex((header) => normalizeMetricLabel(header) === normalizedMetric)
  if (headerIndex < 0) {
    return { status: 'missing' }
  }

  const normalizedRowLabel = claim.rowLabel ? normalizeMetricLabel(claim.rowLabel) : null
  const rows = normalizedRowLabel
    ? table.rows.filter((row) => row.some((cell) => normalizeMetricLabel(cell) === normalizedRowLabel))
    : table.rows

  if (rows.length > 1 && !normalizedRowLabel) {
    return { status: 'ambiguous' }
  }

  if (rows.length !== 1) {
    return { status: 'missing' }
  }

  const value = rows[0]?.[headerIndex]?.trim()
  if (value) {
    return { status: 'found', value }
  }

  return { status: 'missing' }
}

function compareNumericClaim(
  observed: number,
  operator: NumericClaimOperator,
  expected: number,
): boolean {
  switch (operator) {
    case '=':
      return Math.abs(observed - expected) < 1e-9
    case '<':
      return observed < expected
    case '<=':
      return observed <= expected
    case '>':
      return observed > expected
    case '>=':
      return observed >= expected
    default: {
      const _exhaustive: never = operator
      return _exhaustive
    }
  }
}

function formatExpectedValue(claim: NumericDocumentClaimEvidence): string {
  return `${claim.metricLabel} ${claim.operator} ${claim.value}`
}

export function checkNumericClaimEvidence(
  index: SourceEvidenceIndex,
  claim: NumericDocumentClaimEvidence,
): NumericClaimEvidenceCheck {
  if (claim.documentId !== index.documentId) {
    return {
      claimId: claim.claimId,
      status: 'missing',
      expectedValue: formatExpectedValue(claim),
    }
  }

  const candidates = claim.evidenceKeys
    .map((key) => index.byKey[key])
    .filter((item): item is SourceEvidenceItem => Boolean(item))
    .filter((item) => item.sectionId === claim.sectionId)

  if (candidates.length === 0) {
    return {
      claimId: claim.claimId,
      status: 'missing',
      expectedValue: formatExpectedValue(claim),
    }
  }

  if (candidates.length > 1) {
    return {
      claimId: claim.claimId,
      status: 'ambiguous',
      expectedValue: formatExpectedValue(claim),
    }
  }

  const candidate = candidates[0]
  const observed = findMetricValueInTable(candidate, claim)
  if (observed.status !== 'found') {
    return {
      claimId: claim.claimId,
      status: observed.status,
      evidenceKey: candidate.key,
      expectedValue: formatExpectedValue(claim),
    }
  }

  const observedNumber = parseNumericCell(observed.value)
  if (observedNumber === null || !compareNumericClaim(observedNumber, claim.operator, claim.value)) {
    return {
      claimId: claim.claimId,
      status: 'mismatch',
      evidenceKey: candidate.key,
      observedValue: observed.value,
      expectedValue: formatExpectedValue(claim),
    }
  }

  return {
    claimId: claim.claimId,
    status: 'linked',
    evidenceKey: candidate.key,
    observedValue: observed.value,
    expectedValue: formatExpectedValue(claim),
  }
}

export function checkNumericClaimEvidenceList(
  index: SourceEvidenceIndex,
  claims: readonly NumericDocumentClaimEvidence[],
): NumericClaimEvidenceCheck[] {
  return claims.map((claim) => checkNumericClaimEvidence(index, claim))
}
