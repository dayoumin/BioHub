const RCSB_PDB_DATA_API_BASE = 'https://data.rcsb.org/rest/v1/core/entry'
const RCSB_PDB_ENTRY_URL_BASE = 'https://www.rcsb.org/structure'

interface PdbEntryResponse {
  rcsb_id?: string
  struct?: {
    title?: string
  }
  struct_keywords?: {
    pdbx_keywords?: string
    text?: string
  }
  exptl?: Array<{
    method?: string
  }>
  refine?: Array<{
    ls_d_res_high?: number
  }>
  rcsb_entry_info?: {
    experimental_method?: string
    resolution_combined?: number[]
    assembly_count?: number
    polymer_entity_count_protein?: number
    deposited_model_count?: number
  }
  rcsb_accession_info?: {
    deposit_date?: string
    initial_release_date?: string
    revision_date?: string
  }
  rcsb_primary_citation?: {
    title?: string
    pdbx_database_id_DOI?: string
    year?: number
  }
}

export interface PdbStructureSummary {
  pdbId: string
  title: string
  keywords: string[]
  experimentalMethods: string[]
  resolutionAngstrom: number | null
  assemblyCount: number | null
  proteinEntityCount: number | null
  depositedModelCount: number | null
  releaseDate: string | null
  revisionDate: string | null
  citationTitle: string | null
  citationDoi: string | null
  citationYear: number | null
  entryUrl: string
}

export class PdbError extends Error {
  code: 'invalid-id' | 'not-found' | 'network'

  constructor(message: string, code: PdbError['code']) {
    super(message)
    this.name = 'PdbError'
    this.code = code
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function normalizePdbId(pdbId: string): string {
  return pdbId.trim().toUpperCase()
}

function isValidPdbId(pdbId: string): boolean {
  return /^[A-Z0-9]{4}$/.test(pdbId)
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
    throw new PdbError('RCSB PDB 서버에 연결하지 못했습니다.', 'network')
  }

  if (response.status === 404) {
    throw new PdbError('RCSB PDB 엔트리를 찾지 못했습니다.', 'not-found')
  }

  if (!response.ok) {
    throw new PdbError(`RCSB PDB 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

function extractKeywords(payload: PdbEntryResponse): string[] {
  const raw = [payload.struct_keywords?.pdbx_keywords, payload.struct_keywords?.text]
    .filter((value): value is string => Boolean(value?.trim()))
    .flatMap((value) => value.split(/[;,]/))
    .map((value) => value.trim())
    .filter(Boolean)

  const seen = new Set<string>()
  const keywords: string[] = []
  for (const keyword of raw) {
    const key = keyword.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(keyword)
  }
  return keywords
}

export function parsePdbStructureSummary(payload: PdbEntryResponse): PdbStructureSummary {
  const pdbId = payload.rcsb_id?.trim().toUpperCase()
  if (!pdbId || !isValidPdbId(pdbId)) {
    throw new PdbError('RCSB PDB 응답에서 유효한 PDB ID를 찾지 못했습니다.', 'not-found')
  }

  const experimentalMethods = (payload.exptl ?? [])
    .map((entry) => entry.method?.trim())
    .filter((value): value is string => Boolean(value))

  const resolutionCombined = (payload.rcsb_entry_info?.resolution_combined ?? [])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  const refineResolution = (payload.refine ?? [])
    .map((entry) => entry.ls_d_res_high)
    .find((value): value is number => typeof value === 'number' && Number.isFinite(value))

  return {
    pdbId,
    title: payload.struct?.title?.trim() || 'Untitled structure',
    keywords: extractKeywords(payload),
    experimentalMethods: experimentalMethods.length > 0
      ? experimentalMethods
      : (payload.rcsb_entry_info?.experimental_method ? [payload.rcsb_entry_info.experimental_method] : []),
    resolutionAngstrom: resolutionCombined[0] ?? refineResolution ?? null,
    assemblyCount: typeof payload.rcsb_entry_info?.assembly_count === 'number' ? payload.rcsb_entry_info.assembly_count : null,
    proteinEntityCount: typeof payload.rcsb_entry_info?.polymer_entity_count_protein === 'number'
      ? payload.rcsb_entry_info.polymer_entity_count_protein
      : null,
    depositedModelCount: typeof payload.rcsb_entry_info?.deposited_model_count === 'number'
      ? payload.rcsb_entry_info.deposited_model_count
      : null,
    releaseDate: payload.rcsb_accession_info?.initial_release_date ?? null,
    revisionDate: payload.rcsb_accession_info?.revision_date ?? null,
    citationTitle: payload.rcsb_primary_citation?.title?.trim() || null,
    citationDoi: payload.rcsb_primary_citation?.pdbx_database_id_DOI?.trim() || null,
    citationYear: typeof payload.rcsb_primary_citation?.year === 'number' ? payload.rcsb_primary_citation.year : null,
    entryUrl: `${RCSB_PDB_ENTRY_URL_BASE}/${pdbId}`,
  }
}

export async function fetchPdbStructureSummary(
  pdbId: string,
  signal?: AbortSignal,
): Promise<PdbStructureSummary> {
  const normalized = normalizePdbId(pdbId)
  if (!isValidPdbId(normalized)) {
    throw new PdbError('RCSB PDB 조회용 ID는 4자리여야 합니다.', 'invalid-id')
  }

  const payload = await fetchJson<PdbEntryResponse>(`${RCSB_PDB_DATA_API_BASE}/${encodeURIComponent(normalized)}`, signal)
  return parsePdbStructureSummary(payload)
}

export async function fetchPdbStructureSummaries(
  pdbIds: string[],
  options?: { limit?: number; signal?: AbortSignal },
): Promise<PdbStructureSummary[]> {
  const normalized = Array.from(
    new Set(
      pdbIds
        .map(normalizePdbId)
        .filter((pdbId) => isValidPdbId(pdbId)),
    ),
  )

  if (normalized.length === 0) {
    throw new PdbError('RCSB PDB 조회용 ID가 없습니다.', 'invalid-id')
  }

  const limit = options?.limit ?? 4
  return Promise.all(normalized.slice(0, limit).map((pdbId) => fetchPdbStructureSummary(pdbId, options?.signal)))
}
