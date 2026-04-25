import type { DocumentBlueprint } from './document-blueprint-types'
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

export interface GetDocumentNumericClaimsOptions {
  includeFreeText?: boolean
  evidenceIndex?: SourceEvidenceIndex
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isNumericClaimOperator(value: unknown): value is NumericClaimOperator {
  return value === '=' || value === '<' || value === '<=' || value === '>' || value === '>='
}

function normalizeNumericClaim(value: unknown): NumericDocumentClaimEvidence | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.claimId !== 'string'
    || typeof value.documentId !== 'string'
    || typeof value.sectionId !== 'string'
    || typeof value.text !== 'string'
    || !Array.isArray(value.evidenceKeys)
    || !value.evidenceKeys.every((item) => typeof item === 'string')
    || typeof value.metricLabel !== 'string'
    || !isNumericClaimOperator(value.operator)
    || typeof value.value !== 'number'
    || !Number.isFinite(value.value)
  ) {
    return null
  }

  return {
    claimId: value.claimId,
    documentId: value.documentId,
    sectionId: value.sectionId,
    text: value.text,
    evidenceKeys: value.evidenceKeys,
    metricLabel: value.metricLabel,
    operator: value.operator,
    value: value.value,
    rowLabel: typeof value.rowLabel === 'string' ? value.rowLabel : undefined,
  }
}

function getStructuredDocumentNumericClaims(document: DocumentBlueprint): NumericDocumentClaimEvidence[] {
  const metadata = document.metadata
  if (!isRecord(metadata) || !Array.isArray(metadata.numericClaims)) {
    return []
  }

  return metadata.numericClaims.flatMap((claim) => {
    const normalized = normalizeNumericClaim(claim)
    return normalized ? [normalized] : []
  })
}

function normalizeClaimNumber(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '')
  const number = Number(normalized)
  return Number.isFinite(number) ? number : null
}

function normalizeFreeTextOperator(value: string | undefined): NumericClaimOperator {
  if (value === '<' || value === '<=' || value === '>' || value === '>=') {
    return value
  }

  return '='
}

function findHighConfidenceEvidenceKeysForMetric(
  index: SourceEvidenceIndex,
  sectionId: string,
  metricLabel: string,
): string[] {
  const normalizedMetric = normalizeMetricLabel(metricLabel)
  const candidateKeys = (index.bySectionId[sectionId] ?? []).filter((key) => {
    const item = index.byKey[key]
    if (!item || item.kind !== 'table' || !item.table) {
      return false
    }

    return item.table.rows.length === 1
      && item.table.headers.some((header) => normalizeMetricLabel(header) === normalizedMetric)
  })

  return candidateKeys.length === 1 ? candidateKeys : []
}

function toFreeTextClaimId(sectionId: string, metricLabel: string, offset: number): string {
  return ['free-text-numeric-claim', sectionId, metricLabel, String(offset)]
    .map((part) => encodeURIComponent(part))
    .join(':')
}

function collectFreeTextNumericClaims(
  document: DocumentBlueprint,
  evidenceIndex: SourceEvidenceIndex,
): NumericDocumentClaimEvidence[] {
  const patterns: Array<{ metricLabel: string; pattern: RegExp }> = [
    { metricLabel: 'p', pattern: /\bp(?:\s*[- ]?value)?\s*(<=|>=|=|<|>)\s*(\d+(?:\.\d+)?|\.\d+)/gi },
    { metricLabel: 'n', pattern: /\bn\s*=\s*(\d+(?:\.\d+)?|\.\d+)/gi },
    { metricLabel: 'mean', pattern: /\bmean\s*=\s*(-?\d+(?:\.\d+)?|-?\.\d+)/gi },
    { metricLabel: 'SD', pattern: /\bSD\s*=\s*(\d+(?:\.\d+)?|\.\d+)/g },
    { metricLabel: 't', pattern: /\bt\s*=\s*(-?\d+(?:\.\d+)?|-?\.\d+)/g },
    { metricLabel: 'F', pattern: /\bF\s*=\s*(\d+(?:\.\d+)?|\.\d+)/g },
    { metricLabel: 'r', pattern: /\br\s*=\s*(-?\d+(?:\.\d+)?|-?\.\d+)/g },
    { metricLabel: 'OR', pattern: /\bOR\s*=\s*(\d+(?:\.\d+)?|\.\d+)/g },
    { metricLabel: 'chi2', pattern: /(?:\bchi\s*-?\s?square\b|\bchi2\b|χ2)\s*=\s*(\d+(?:\.\d+)?|\.\d+)/gi },
  ]

  const claims: NumericDocumentClaimEvidence[] = []
  for (const section of document.sections) {
    for (const { metricLabel, pattern } of patterns) {
      pattern.lastIndex = 0
      let match = pattern.exec(section.content)
      while (match) {
        const operator = normalizeFreeTextOperator(match[1])
        const rawValue = match[2] ?? match[1] ?? ''
        const value = normalizeClaimNumber(rawValue)
        const evidenceKeys = findHighConfidenceEvidenceKeysForMetric(evidenceIndex, section.id, metricLabel)
        if (value !== null && evidenceKeys.length > 0) {
          claims.push({
            claimId: toFreeTextClaimId(section.id, metricLabel, match.index),
            documentId: document.id,
            sectionId: section.id,
            text: match[0],
            evidenceKeys,
            metricLabel,
            operator,
            value,
          })
        }
        match = pattern.exec(section.content)
      }
    }
  }

  return claims
}

export function getDocumentNumericClaims(
  document: DocumentBlueprint,
  options: GetDocumentNumericClaimsOptions = {},
): NumericDocumentClaimEvidence[] {
  const structuredClaims = getStructuredDocumentNumericClaims(document)
  if (!options.includeFreeText) {
    return structuredClaims
  }

  const evidenceIndex = options.evidenceIndex ?? {
    documentId: document.id,
    projectId: document.projectId,
    documentUpdatedAt: document.updatedAt,
    items: [],
    byKey: {},
    bySectionId: {},
    bySourceKey: {},
  }

  return [
    ...structuredClaims,
    ...collectFreeTextNumericClaims(document, evidenceIndex),
  ]
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
