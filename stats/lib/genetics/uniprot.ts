const UNIPROT_API_BASE = 'https://rest.uniprot.org'
const UNIPROT_ENTRY_URL_BASE = 'https://www.uniprot.org/uniprotkb'
const POLL_INTERVAL_MS = 1200
const MAX_POLL_ATTEMPTS = 8

type UniProtAspect = 'function' | 'process' | 'component'

interface UniProtEntryNameValue {
  value?: string
}

interface UniProtEntryCommentText {
  value?: string
}

interface UniProtEntryComment {
  commentType?: string
  texts?: UniProtEntryCommentText[]
}

interface UniProtCrossReferenceProperty {
  key?: string
  value?: string
}

interface UniProtCrossReference {
  database?: string
  id?: string
  properties?: UniProtCrossReferenceProperty[]
}

interface UniProtProteinDescription {
  recommendedName?: {
    fullName?: UniProtEntryNameValue
  }
  alternativeNames?: Array<{
    fullName?: UniProtEntryNameValue
  }>
}

interface UniProtGeneEntry {
  geneName?: UniProtEntryNameValue
}

interface UniProtSequence {
  length?: number
}

interface UniProtRawEntry {
  entryType?: string
  primaryAccession?: string
  uniProtkbId?: string
  annotationScore?: number
  organism?: {
    scientificName?: string
    commonName?: string
    taxonId?: number
  }
  proteinDescription?: UniProtProteinDescription
  genes?: UniProtGeneEntry[]
  comments?: UniProtEntryComment[]
  keywords?: Array<{ name?: string }>
  uniProtKBCrossReferences?: UniProtCrossReference[]
  sequence?: UniProtSequence
}

interface IdMappingRunResponse {
  jobId?: string
}

interface IdMappingStatusResponse {
  jobStatus?: string
}

interface IdMappingResultsResponse {
  results?: Array<{ from?: string; to?: string | { primaryAccession?: string } }>
}

export interface UniProtGoTerm {
  id: string
  aspect: UniProtAspect
  term: string
}

export interface UniProtSummary {
  sourceAccession: string
  sourceDatabase?: string
  primaryAccession: string
  uniProtId: string
  entryType: string
  reviewed: boolean
  proteinName: string
  alternativeNames: string[]
  geneNames: string[]
  organismName: string
  taxonId: number | null
  sequenceLength: number
  annotationScore: number | null
  functions: string[]
  keywords: string[]
  goTerms: UniProtGoTerm[]
  pdbIds: string[]
  entryUrl: string
}

export class UniProtError extends Error {
  code: 'invalid-accession' | 'mapping-failed' | 'not-found' | 'timeout' | 'network'

  constructor(message: string, code: UniProtError['code']) {
    super(message)
    this.name = 'UniProtError'
    this.code = code
  }
}

function isReviewedEntryType(entryType?: string): boolean {
  return entryType?.toLowerCase().startsWith('uniprotkb reviewed') ?? false
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizeAccession(accession: string): string {
  return accession.trim().toUpperCase()
}

function isRefSeqProteinAccession(accession: string): boolean {
  return /^(?:[ANWXYZ]P|XP|YP|WP|AP|SP|ZP)_[0-9]+(?:\.[0-9]+)?$/i.test(accession)
}

function isUniProtAccession(accession: string): boolean {
  return /^(?:[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9](?:[A-Z][A-Z0-9]{2}[0-9]){1,2})$/i.test(accession)
}

function buildMappingSources(accession: string): string[] {
  return isRefSeqProteinAccession(accession)
    ? ['RefSeq_Protein', 'EMBL-GenBank-DDBJ']
    : ['EMBL-GenBank-DDBJ', 'RefSeq_Protein']
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new UniProtError('UniProt 서버에 연결하지 못했습니다.', 'network')
  }

  if (!response.ok) {
    throw new UniProtError(`UniProt 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      cleanup()
      resolve()
    }, ms)

    const onAbort = (): void => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const cleanup = (): void => {
      globalThis.clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function extractPrimaryAccessions(results: IdMappingResultsResponse['results']): string[] {
  const ids = new Set<string>()
  for (const item of results ?? []) {
    const mapped = typeof item.to === 'string' ? item.to : item.to?.primaryAccession
    if (typeof mapped === 'string' && mapped.trim()) {
      ids.add(mapped.trim())
    }
  }
  return [...ids]
}

async function runIdMapping(accession: string, from: string, signal?: AbortSignal): Promise<string> {
  const body = new URLSearchParams({
    from,
    to: 'UniProtKB',
    ids: accession,
  })

  const data = await fetchJson<IdMappingRunResponse>(`${UNIPROT_API_BASE}/idmapping/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  })

  if (!data.jobId) {
    throw new UniProtError('UniProt 매핑 작업 ID를 받지 못했습니다.', 'mapping-failed')
  }

  return data.jobId
}

async function pollIdMappingResults(jobId: string, signal?: AbortSignal): Promise<string[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const status = await fetchJson<IdMappingStatusResponse>(`${UNIPROT_API_BASE}/idmapping/status/${jobId}`, { signal })

    if (status.jobStatus === 'FINISHED') {
      const results = await fetchJson<IdMappingResultsResponse>(
        `${UNIPROT_API_BASE}/idmapping/results/${jobId}?format=json&size=25`,
        { signal },
      )
      return extractPrimaryAccessions(results.results)
    }

    if (status.jobStatus && status.jobStatus !== 'RUNNING' && status.jobStatus !== 'NEW') {
      throw new UniProtError(`UniProt 매핑 실패: ${status.jobStatus}`, 'mapping-failed')
    }

    if (attempt < MAX_POLL_ATTEMPTS - 1) {
      await sleep(POLL_INTERVAL_MS, signal)
    }
  }

  throw new UniProtError('UniProt 매핑 결과 대기 시간이 초과되었습니다.', 'timeout')
}

async function mapAccessionToUniProt(accession: string, signal?: AbortSignal): Promise<{ from: string; accessions: string[] } | null> {
  for (const from of buildMappingSources(accession)) {
    const jobId = await runIdMapping(accession, from, signal)
    const accessions = await pollIdMappingResults(jobId, signal)
    if (accessions.length > 0) {
      return { from, accessions }
    }
  }
  return null
}

async function fetchUniProtEntry(accession: string, signal?: AbortSignal): Promise<UniProtRawEntry> {
  return fetchJson<UniProtRawEntry>(`${UNIPROT_API_BASE}/uniprotkb/${encodeURIComponent(accession)}.json`, { signal })
}

function extractProteinName(description?: UniProtProteinDescription): string {
  return description?.recommendedName?.fullName?.value?.trim() || '이름 미상 단백질'
}

function extractAlternativeNames(description?: UniProtProteinDescription): string[] {
  const names = new Set<string>()
  for (const alt of description?.alternativeNames ?? []) {
    const value = alt.fullName?.value?.trim()
    if (value) names.add(value)
  }
  return [...names]
}

function extractFunctions(comments?: UniProtEntryComment[]): string[] {
  const seen = new Set<string>()
  for (const comment of comments ?? []) {
    if (comment.commentType !== 'FUNCTION') continue
    for (const text of comment.texts ?? []) {
      const value = text.value?.trim()
      if (value) seen.add(value)
    }
  }
  return [...seen]
}

function extractGoTerms(crossReferences?: UniProtCrossReference[]): UniProtGoTerm[] {
  const terms = new Map<string, UniProtGoTerm>()
  for (const ref of crossReferences ?? []) {
    if (ref.database !== 'GO' || !ref.id) continue
    const goTerm = ref.properties?.find((prop) => prop.key === 'GoTerm')?.value?.trim()
    if (!goTerm) continue

    const aspectCode = goTerm[0]
    const term = goTerm.slice(2).trim()
    const aspect: UniProtAspect =
      aspectCode === 'F' ? 'function'
        : aspectCode === 'P' ? 'process'
          : 'component'

    terms.set(ref.id, {
      id: ref.id,
      aspect,
      term: term || goTerm,
    })
  }
  return [...terms.values()]
}

function extractPdbIds(crossReferences?: UniProtCrossReference[]): string[] {
  const ids = new Set<string>()
  for (const ref of crossReferences ?? []) {
    if (ref.database === 'PDB' && ref.id) ids.add(ref.id)
  }
  return [...ids]
}

export function parseUniProtEntry(
  entry: UniProtRawEntry,
  sourceAccession: string,
  sourceDatabase?: string,
): UniProtSummary {
  const primaryAccession = entry.primaryAccession?.trim()
  if (!primaryAccession) {
    throw new UniProtError('UniProt 엔트리에서 accession을 찾지 못했습니다.', 'not-found')
  }

  return {
    sourceAccession,
    sourceDatabase,
    primaryAccession,
    uniProtId: entry.uniProtkbId?.trim() || primaryAccession,
    entryType: entry.entryType?.trim() || 'UniProtKB',
    reviewed: isReviewedEntryType(entry.entryType),
    proteinName: extractProteinName(entry.proteinDescription),
    alternativeNames: extractAlternativeNames(entry.proteinDescription),
    geneNames: (entry.genes ?? [])
      .map((gene) => gene.geneName?.value?.trim())
      .filter((value): value is string => Boolean(value)),
    organismName: entry.organism?.scientificName?.trim()
      || entry.organism?.commonName?.trim()
      || '미상 생물',
    taxonId: typeof entry.organism?.taxonId === 'number' ? entry.organism.taxonId : null,
    sequenceLength: entry.sequence?.length ?? 0,
    annotationScore: typeof entry.annotationScore === 'number' ? entry.annotationScore : null,
    functions: extractFunctions(entry.comments),
    keywords: (entry.keywords ?? [])
      .map((keyword) => keyword.name?.trim())
      .filter((value): value is string => Boolean(value)),
    goTerms: extractGoTerms(entry.uniProtKBCrossReferences),
    pdbIds: extractPdbIds(entry.uniProtKBCrossReferences),
    entryUrl: `${UNIPROT_ENTRY_URL_BASE}/${primaryAccession}/entry`,
  }
}

export async function fetchUniProtSummaryForAccession(
  accession: string,
  signal?: AbortSignal,
): Promise<UniProtSummary> {
  const normalized = normalizeAccession(accession)
  if (!normalized) {
    throw new UniProtError('UniProt 조회용 accession이 비어 있습니다.', 'invalid-accession')
  }

  if (isUniProtAccession(normalized)) {
    const entry = await fetchUniProtEntry(normalized, signal)
    return parseUniProtEntry(entry, normalized, 'UniProtKB')
  }

  const mapping = await mapAccessionToUniProt(normalized, signal)
  if (!mapping || mapping.accessions.length === 0) {
    throw new UniProtError(`UniProt에서 ${normalized} 매핑 결과를 찾지 못했습니다.`, 'not-found')
  }

  const entries = await Promise.all(mapping.accessions.slice(0, 5).map((id) => fetchUniProtEntry(id, signal)))
  const preferred = entries.find((entry) => isReviewedEntryType(entry.entryType)) ?? entries[0]

  return parseUniProtEntry(preferred, normalized, mapping.from)
}
