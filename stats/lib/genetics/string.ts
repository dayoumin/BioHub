const STRING_API_BASE = 'https://string-db.org/api/json'
const STRING_CALLER_IDENTITY = 'biohub'
const STRING_MIN_DELAY_MS = 1000

interface StringIdRecord {
  stringId?: string
  preferredName?: string
  ncbiTaxonId?: number
  annotation?: string
}

interface StringPartnerRecord {
  stringId_A?: string
  stringId_B?: string
  preferredName_A?: string
  preferredName_B?: string
  ncbiTaxonId?: number
  score?: number
  nscore?: number
  fscore?: number
  pscore?: number
  ascore?: number
  escore?: number
  dscore?: number
  tscore?: number
}

export interface StringResolvedTarget {
  queryIdentifier: string
  stringId: string
  preferredName: string
  taxonId: number | null
  annotation: string | null
}

export interface StringPartnerSummary {
  source: StringResolvedTarget
  partnerStringId: string
  partnerName: string
  score: number
  evidence: {
    neighborhood: number
    fusion: number
    phylogeny: number
    coexpression: number
    experimental: number
    database: number
    textmining: number
  }
}

export class StringError extends Error {
  code: 'invalid-input' | 'not-found' | 'network'

  constructor(message: string, code: StringError['code']) {
    super(message)
    this.name = 'StringError'
    this.code = code
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new StringError('STRING 서버에 연결하지 못했습니다.', 'network')
  }

  if (!response.ok) {
    throw new StringError(`STRING 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

function buildQuery(params: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()
}

export function parseStringResolvedTarget(queryIdentifier: string, record: StringIdRecord | undefined): StringResolvedTarget {
  const stringId = record?.stringId?.trim()
  if (!stringId) {
    throw new StringError(`STRING에서 ${queryIdentifier} 식별자를 찾지 못했습니다.`, 'not-found')
  }

  return {
    queryIdentifier,
    stringId,
    preferredName: record?.preferredName?.trim() || queryIdentifier,
    taxonId: typeof record?.ncbiTaxonId === 'number' ? record.ncbiTaxonId : null,
    annotation: record?.annotation?.trim() || null,
  }
}

export function parseStringPartnerSummaries(
  source: StringResolvedTarget,
  records: StringPartnerRecord[] | undefined,
): StringPartnerSummary[] {
  return (records ?? [])
    .map((record) => {
      const partnerStringId = record.stringId_B?.trim()
      const partnerName = record.preferredName_B?.trim()
      const score = typeof record.score === 'number' ? record.score : NaN
      if (!partnerStringId || !partnerName || Number.isNaN(score)) return null

      return {
        source,
        partnerStringId,
        partnerName,
        score,
        evidence: {
          neighborhood: typeof record.nscore === 'number' ? record.nscore : 0,
          fusion: typeof record.fscore === 'number' ? record.fscore : 0,
          phylogeny: typeof record.pscore === 'number' ? record.pscore : 0,
          coexpression: typeof record.ascore === 'number' ? record.ascore : 0,
          experimental: typeof record.escore === 'number' ? record.escore : 0,
          database: typeof record.dscore === 'number' ? record.dscore : 0,
          textmining: typeof record.tscore === 'number' ? record.tscore : 0,
        },
      }
    })
    .filter((item): item is StringPartnerSummary => Boolean(item))
    .sort((a, b) => b.score - a.score)
}

export async function fetchStringInteractionPartners(
  identifier: string,
  species: number,
  options?: { requiredScore?: number; limit?: number; signal?: AbortSignal },
): Promise<StringPartnerSummary[]> {
  const normalized = identifier.trim()
  if (!normalized) {
    throw new StringError('STRING 조회용 identifier가 비어 있습니다.', 'invalid-input')
  }
  if (!Number.isFinite(species) || species <= 0) {
    throw new StringError('STRING 조회용 species taxon ID가 올바르지 않습니다.', 'invalid-input')
  }

  const signal = options?.signal
  const requiredScore = options?.requiredScore ?? 700
  const limit = options?.limit ?? 12

  const idUrl = `${STRING_API_BASE}/get_string_ids?${buildQuery({
    identifiers: normalized,
    species,
    caller_identity: STRING_CALLER_IDENTITY,
  })}`
  const idRecords = await fetchJson<StringIdRecord[]>(idUrl, signal)
  const source = parseStringResolvedTarget(normalized, idRecords[0])

  await sleep(STRING_MIN_DELAY_MS, signal)

  const partnerUrl = `${STRING_API_BASE}/interaction_partners?${buildQuery({
    identifiers: source.stringId,
    species,
    required_score: requiredScore,
    limit,
    caller_identity: STRING_CALLER_IDENTITY,
  })}`
  const partnerRecords = await fetchJson<StringPartnerRecord[]>(partnerUrl, signal)
  return parseStringPartnerSummaries(source, partnerRecords)
}
