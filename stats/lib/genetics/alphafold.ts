const ALPHAFOLD_API_BASE = 'https://alphafold.ebi.ac.uk/api/prediction'
const ALPHAFOLD_ENTRY_URL_BASE = 'https://alphafold.ebi.ac.uk/entry'

interface AlphaFoldPredictionRecord {
  toolUsed?: string
  providerId?: string
  modelEntityId?: string
  modelCreatedDate?: string
  globalMetricValue?: number
  fractionPlddtVeryLow?: number
  fractionPlddtLow?: number
  fractionPlddtConfident?: number
  fractionPlddtVeryHigh?: number
  latestVersion?: number
  gene?: string
  uniprotAccession?: string
  uniprotId?: string
  uniprotDescription?: string
  organismScientificName?: string
  taxId?: number
  pdbUrl?: string
  cifUrl?: string
  bcifUrl?: string
  paeImageUrl?: string
  plddtDocUrl?: string
  paeDocUrl?: string
  entryId?: string
  isComplex?: boolean
  isReviewed?: boolean
}

export interface AlphaFoldPredictionSummary {
  accession: string
  entryId: string
  modelEntityId: string
  proteinName: string
  geneName: string | null
  organismName: string
  providerId: string | null
  toolUsed: string | null
  meanPlddt: number | null
  fractionVeryLow: number
  fractionLow: number
  fractionConfident: number
  fractionVeryHigh: number
  latestVersion: number | null
  modelCreatedDate: string | null
  taxId: number | null
  isComplex: boolean
  isReviewed: boolean
  entryUrl: string
  pdbUrl: string | null
  cifUrl: string | null
  bcifUrl: string | null
  paeImageUrl: string | null
  plddtDocUrl: string | null
  paeDocUrl: string | null
}

export class AlphaFoldError extends Error {
  code: 'invalid-accession' | 'not-found' | 'network'

  constructor(message: string, code: AlphaFoldError['code']) {
    super(message)
    this.name = 'AlphaFoldError'
    this.code = code
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizeAccession(accession: string): string {
  return accession.trim().toUpperCase()
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new AlphaFoldError('AlphaFold 서버에 연결하지 못했습니다.', 'network')
  }

  if (response.status === 404) {
    throw new AlphaFoldError('AlphaFold 예측 모델을 찾지 못했습니다.', 'not-found')
  }

  if (!response.ok) {
    throw new AlphaFoldError(`AlphaFold 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

export function parseAlphaFoldPrediction(
  record: AlphaFoldPredictionRecord | undefined,
  requestedAccession?: string,
): AlphaFoldPredictionSummary {
  const accession = record?.uniprotAccession?.trim().toUpperCase() || requestedAccession?.trim().toUpperCase()
  if (!accession) {
    throw new AlphaFoldError('AlphaFold 응답에서 accession을 찾지 못했습니다.', 'not-found')
  }

  const entryId = record?.entryId?.trim() || record?.modelEntityId?.trim()
  if (!entryId) {
    throw new AlphaFoldError('AlphaFold 응답에서 entry ID를 찾지 못했습니다.', 'not-found')
  }

  return {
    accession,
    entryId,
    modelEntityId: record?.modelEntityId?.trim() || entryId,
    proteinName: record?.uniprotDescription?.trim() || 'AlphaFold prediction',
    geneName: record?.gene?.trim() || null,
    organismName: record?.organismScientificName?.trim() || 'Unknown organism',
    providerId: record?.providerId?.trim() || null,
    toolUsed: record?.toolUsed?.trim() || null,
    meanPlddt: typeof record?.globalMetricValue === 'number' ? record.globalMetricValue : null,
    fractionVeryLow: typeof record?.fractionPlddtVeryLow === 'number' ? record.fractionPlddtVeryLow : 0,
    fractionLow: typeof record?.fractionPlddtLow === 'number' ? record.fractionPlddtLow : 0,
    fractionConfident: typeof record?.fractionPlddtConfident === 'number' ? record.fractionPlddtConfident : 0,
    fractionVeryHigh: typeof record?.fractionPlddtVeryHigh === 'number' ? record.fractionPlddtVeryHigh : 0,
    latestVersion: typeof record?.latestVersion === 'number' ? record.latestVersion : null,
    modelCreatedDate: record?.modelCreatedDate?.trim() || null,
    taxId: typeof record?.taxId === 'number' ? record.taxId : null,
    isComplex: Boolean(record?.isComplex),
    isReviewed: Boolean(record?.isReviewed),
    entryUrl: `${ALPHAFOLD_ENTRY_URL_BASE}/${entryId}`,
    pdbUrl: record?.pdbUrl?.trim() || null,
    cifUrl: record?.cifUrl?.trim() || null,
    bcifUrl: record?.bcifUrl?.trim() || null,
    paeImageUrl: record?.paeImageUrl?.trim() || null,
    plddtDocUrl: record?.plddtDocUrl?.trim() || null,
    paeDocUrl: record?.paeDocUrl?.trim() || null,
  }
}

export async function fetchAlphaFoldPrediction(
  accession: string,
  signal?: AbortSignal,
): Promise<AlphaFoldPredictionSummary> {
  const normalized = normalizeAccession(accession)
  if (!normalized) {
    throw new AlphaFoldError('AlphaFold 조회용 accession이 비어 있습니다.', 'invalid-accession')
  }

  const records = await fetchJson<AlphaFoldPredictionRecord[]>(
    `${ALPHAFOLD_API_BASE}/${encodeURIComponent(normalized)}`,
    signal,
  )
  const record = Array.isArray(records) ? records[0] : undefined
  if (!record) {
    throw new AlphaFoldError(`${normalized}에 대한 AlphaFold 모델을 찾지 못했습니다.`, 'not-found')
  }
  return parseAlphaFoldPrediction(record, normalized)
}
