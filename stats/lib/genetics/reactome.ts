const REACTOME_CONTENT_SERVICE_BASE = 'https://reactome.org/ContentService'
const REACTOME_ANALYSIS_SERVICE_BASE = 'https://reactome.org/AnalysisService'

interface ReactomePathwayRecord {
  dbId?: number
  displayName?: string
  stId?: string
  stIdVersion?: string
  isInDisease?: boolean
  isInferred?: boolean
  maxDepth?: number
  releaseDate?: string
  speciesName?: string
  doi?: string
  hasDiagram?: boolean
  hasEHLD?: boolean
}

export interface ReactomePathwaySummary {
  dbId: number
  stId: string
  stIdVersion: string | null
  displayName: string
  speciesName: string
  isInDisease: boolean
  isInferred: boolean
  maxDepth: number | null
  releaseDate: string | null
  doi: string | null
  hasDiagram: boolean
  hasEHLD: boolean
  pathwayUrl: string
}

interface ReactomeEnrichmentResponse {
  summary?: {
    token?: string
  }
  identifiersNotFound?: number
  pathwaysFound?: number
  warnings?: string[]
  pathways?: ReactomeEnrichmentPathwayRecord[]
}

interface ReactomeEnrichmentPathwayRecord {
  stId?: string
  dbId?: number
  name?: string
  species?: {
    name?: string
  }
  entities?: {
    found?: number
    total?: number
    pValue?: number
    fdr?: number
  }
  reactions?: {
    found?: number
    total?: number
  }
  inDisease?: boolean
  llp?: boolean
}

export interface ReactomeEnrichmentPathwaySummary {
  stId: string
  dbId: number
  name: string
  speciesName: string
  entitiesFound: number
  entitiesTotal: number
  reactionsFound: number
  reactionsTotal: number
  pValue: number | null
  fdr: number | null
  inDisease: boolean
  lowLevelPathway: boolean
  pathwayUrl: string
}

export interface ReactomeEnrichmentResult {
  token: string | null
  queryIdentifiers: string[]
  identifiersNotFound: number
  pathwaysFound: number
  warnings: string[]
  pathways: ReactomeEnrichmentPathwaySummary[]
}

export class ReactomeError extends Error {
  code: 'invalid-input' | 'not-found' | 'network'

  constructor(message: string, code: ReactomeError['code']) {
    super(message)
    this.name = 'ReactomeError'
    this.code = code
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
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
    throw new ReactomeError('Reactome 서버에 연결하지 못했습니다.', 'network')
  }

  if (!response.ok) {
    throw new ReactomeError(`Reactome 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

async function postJson<T>(url: string, body: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body,
      signal,
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ReactomeError('Reactome 분석 서버에 연결하지 못했습니다.', 'network')
  }

  if (!response.ok) {
    throw new ReactomeError(`Reactome 분석 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

export function parseReactomePathways(records: ReactomePathwayRecord[] | undefined): ReactomePathwaySummary[] {
  return (records ?? [])
    .map((record) => {
      if (typeof record.dbId !== 'number' || !record.stId || !record.displayName) return null

      return {
        dbId: record.dbId,
        stId: record.stId,
        stIdVersion: record.stIdVersion ?? null,
        displayName: record.displayName,
        speciesName: record.speciesName ?? 'Unknown species',
        isInDisease: Boolean(record.isInDisease),
        isInferred: Boolean(record.isInferred),
        maxDepth: typeof record.maxDepth === 'number' ? record.maxDepth : null,
        releaseDate: record.releaseDate ?? null,
        doi: record.doi ?? null,
        hasDiagram: Boolean(record.hasDiagram),
        hasEHLD: Boolean(record.hasEHLD),
        pathwayUrl: `https://reactome.org/content/detail/${record.stId}`,
      }
    })
    .filter((item): item is ReactomePathwaySummary => Boolean(item))
    .sort((a, b) => {
      if (a.hasDiagram !== b.hasDiagram) return a.hasDiagram ? -1 : 1
      if (a.isInDisease !== b.isInDisease) return a.isInDisease ? 1 : -1
      return a.displayName.localeCompare(b.displayName)
    })
}

export function normalizeReactomeIdentifiers(identifiers: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const identifier of identifiers) {
    const value = identifier.trim()
    if (!value) continue
    const key = value.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(value)
  }

  return normalized
}

export function parseReactomeEnrichmentResult(
  payload: ReactomeEnrichmentResponse | undefined,
  queryIdentifiers: string[],
): ReactomeEnrichmentResult {
  const pathways = (payload?.pathways ?? [])
    .map((record) => {
      if (typeof record.dbId !== 'number' || !record.stId || !record.name) return null

      return {
        stId: record.stId,
        dbId: record.dbId,
        name: record.name,
        speciesName: record.species?.name ?? 'Unknown species',
        entitiesFound: typeof record.entities?.found === 'number' ? record.entities.found : 0,
        entitiesTotal: typeof record.entities?.total === 'number' ? record.entities.total : 0,
        reactionsFound: typeof record.reactions?.found === 'number' ? record.reactions.found : 0,
        reactionsTotal: typeof record.reactions?.total === 'number' ? record.reactions.total : 0,
        pValue: typeof record.entities?.pValue === 'number' ? record.entities.pValue : null,
        fdr: typeof record.entities?.fdr === 'number' ? record.entities.fdr : null,
        inDisease: Boolean(record.inDisease),
        lowLevelPathway: Boolean(record.llp),
        pathwayUrl: `https://reactome.org/content/detail/${record.stId}`,
      }
    })
    .filter((item): item is ReactomeEnrichmentPathwaySummary => Boolean(item))
    .sort((a, b) => {
      if (a.fdr != null && b.fdr != null && a.fdr !== b.fdr) return a.fdr - b.fdr
      if (a.entitiesFound !== b.entitiesFound) return b.entitiesFound - a.entitiesFound
      return a.name.localeCompare(b.name)
    })

  return {
    token: payload?.summary?.token ?? null,
    queryIdentifiers,
    identifiersNotFound: typeof payload?.identifiersNotFound === 'number' ? payload.identifiersNotFound : 0,
    pathwaysFound: typeof payload?.pathwaysFound === 'number' ? payload.pathwaysFound : pathways.length,
    warnings: Array.isArray(payload?.warnings) ? payload.warnings.filter((item): item is string => typeof item === 'string') : [],
    pathways,
  }
}

export async function fetchReactomePathwaysForUniProt(
  accession: string,
  signal?: AbortSignal,
): Promise<ReactomePathwaySummary[]> {
  const normalized = accession.trim().toUpperCase()
  if (!normalized) {
    throw new ReactomeError('Reactome 조회용 UniProt accession이 비어 있습니다.', 'invalid-input')
  }

  const url = `${REACTOME_CONTENT_SERVICE_BASE}/data/mapping/UniProt/${encodeURIComponent(normalized)}/pathways`
  const records = await fetchJson<ReactomePathwayRecord[]>(url, signal)
  const pathways = parseReactomePathways(records)
  if (pathways.length === 0) {
    throw new ReactomeError(`${normalized}에 대한 Reactome pathway를 찾지 못했습니다.`, 'not-found')
  }
  return pathways
}

export async function fetchReactomePathwayEnrichment(
  identifiers: string[],
  options?: { limit?: number; signal?: AbortSignal },
): Promise<ReactomeEnrichmentResult> {
  const queryIdentifiers = normalizeReactomeIdentifiers(identifiers)
  if (queryIdentifiers.length === 0) {
    throw new ReactomeError('Reactome 분석용 identifier가 비어 있습니다.', 'invalid-input')
  }

  const limit = options?.limit ?? 8
  const url = `${REACTOME_ANALYSIS_SERVICE_BASE}/identifiers/projection?pageSize=${limit}&page=1`
  const payload = await postJson<ReactomeEnrichmentResponse>(url, queryIdentifiers.join('\n'), options?.signal)
  const result = parseReactomeEnrichmentResult(payload, queryIdentifiers)
  if (result.pathways.length === 0) {
    throw new ReactomeError('Reactome enrichment 결과가 없습니다.', 'not-found')
  }
  return result
}
