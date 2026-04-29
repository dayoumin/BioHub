import type { CitationRecord } from './citation-types'

export type CitationBoundSection = 'introduction' | 'discussion' | 'references'

export type CitationVerificationStatus =
  | 'verified'
  | 'reference-only'
  | 'invalid'

export type CitationGateStatus = 'ready' | 'needs-review' | 'blocked'

export interface CitationUsageContract {
  citationId: string
  status: CitationVerificationStatus
  allowedSections: CitationBoundSection[]
  reasons: string[]
}

export interface CitationSectionGate {
  section: CitationBoundSection
  status: CitationGateStatus
  canGenerateDraft: boolean
  verifiedNarrativeCitationCount: number
  referenceOnlyCitationCount: number
  invalidCitationCount: number
  messages: string[]
}

function hasText(value: string | undefined | null): boolean {
  return Boolean(value?.trim())
}

function hasUsableIdentifier(record: CitationRecord): boolean {
  return hasText(record.item.doi) || hasText(record.item.url)
}

function hasReferenceMetadata(record: CitationRecord): boolean {
  return (
    hasText(record.item.title)
    && record.item.authors.length > 0
    && hasUsableIdentifier(record)
  )
}

function hasNarrativeEvidence(record: CitationRecord): boolean {
  return (
    hasReferenceMetadata(record)
    && hasText(record.item.doi)
    && hasText(record.item.abstract)
  )
}

export function getCitationUsageContract(record: CitationRecord): CitationUsageContract {
  if (hasNarrativeEvidence(record)) {
    return {
      citationId: record.id,
      status: 'verified',
      allowedSections: ['introduction', 'discussion', 'references'],
      reasons: [],
    }
  }

  if (hasReferenceMetadata(record)) {
    const reasons = [
      !hasText(record.item.doi) ? 'missing-doi' : undefined,
      !hasText(record.item.abstract) ? 'missing-literature-summary' : undefined,
    ].filter((reason): reason is string => Boolean(reason))

    return {
      citationId: record.id,
      status: 'reference-only',
      allowedSections: ['references'],
      reasons,
    }
  }

  return {
    citationId: record.id,
    status: 'invalid',
    allowedSections: [],
    reasons: [
      !hasText(record.item.title) ? 'missing-title' : undefined,
      record.item.authors.length === 0 ? 'missing-authors' : undefined,
      !hasUsableIdentifier(record) ? 'missing-identifier' : undefined,
    ].filter((reason): reason is string => Boolean(reason)),
  }
}

export function buildCitationSectionGate({
  citations,
  section,
  requiresCitation,
  language,
}: {
  citations: CitationRecord[]
  section: CitationBoundSection
  requiresCitation: boolean
  language: 'ko' | 'en'
}): CitationSectionGate {
  const contracts = citations.map((citation) => getCitationUsageContract(citation))
  const verifiedNarrativeCitationCount = contracts.filter((contract) =>
    contract.status === 'verified' && contract.allowedSections.includes(section),
  ).length
  const referenceOnlyCitationCount = contracts.filter((contract) => contract.status === 'reference-only').length
  const invalidCitationCount = contracts.filter((contract) => contract.status === 'invalid').length
  const isNarrativeSection = section === 'introduction' || section === 'discussion'

  if (isNarrativeSection && requiresCitation && verifiedNarrativeCitationCount === 0) {
    return {
      section,
      status: 'blocked',
      canGenerateDraft: false,
      verifiedNarrativeCitationCount,
      referenceOnlyCitationCount,
      invalidCitationCount,
      messages: [
        language === 'ko'
          ? '검증된 문헌 요약 source가 없어 citation이 필요한 본문 초안을 생성하지 않습니다.'
          : 'Drafting is blocked because no verified literature-summary source is available for citation-backed text.',
      ],
    }
  }

  if (invalidCitationCount > 0 || (isNarrativeSection && referenceOnlyCitationCount > 0)) {
    return {
      section,
      status: 'needs-review',
      canGenerateDraft: true,
      verifiedNarrativeCitationCount,
      referenceOnlyCitationCount,
      invalidCitationCount,
      messages: [
        language === 'ko'
          ? '일부 문헌은 References 후보로만 사용할 수 있으므로 본문 인용 전 확인이 필요합니다.'
          : 'Some citations are reference-only and require review before narrative citation.',
      ],
    }
  }

  return {
    section,
    status: 'ready',
    canGenerateDraft: true,
    verifiedNarrativeCitationCount,
    referenceOnlyCitationCount,
    invalidCitationCount,
    messages: [],
  }
}
