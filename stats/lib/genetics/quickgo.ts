const QUICKGO_API_BASE = 'https://www.ebi.ac.uk/QuickGO/services/ontology/go'

type QuickGoAspect = 'molecular_function' | 'biological_process' | 'cellular_component'

interface QuickGoTermDefinition {
  text?: string
}

interface QuickGoTermSynonym {
  name?: string
  type?: string
}

interface QuickGoTermChild {
  id?: string
  relation?: string
}

interface QuickGoTermRecord {
  id?: string
  name?: string
  aspect?: QuickGoAspect
  isObsolete?: boolean
  definition?: QuickGoTermDefinition
  usage?: string
  comment?: string
  synonyms?: QuickGoTermSynonym[]
  children?: QuickGoTermChild[]
  ancestors?: string[]
}

interface QuickGoTermResponse {
  results?: QuickGoTermRecord[]
}

interface QuickGoPathEdge {
  child?: string
  parent?: string
  relationship?: string
}

interface QuickGoPathResponse {
  results?: QuickGoPathEdge[][]
}

export interface QuickGoRelatedTerm {
  id: string
  name: string
  relation?: string
}

export interface QuickGoPathStep {
  child: string
  parent: string
  relationship: string
}

export interface QuickGoTermSummary {
  id: string
  name: string
  aspect: QuickGoAspect
  isObsolete: boolean
  definition: string
  usage: string | null
  comment: string | null
  synonyms: Array<{ name: string; type: string | null }>
  ancestors: QuickGoRelatedTerm[]
  children: QuickGoRelatedTerm[]
  pathToRoot: QuickGoPathStep[]
}

export class QuickGoError extends Error {
  code: 'invalid-id' | 'not-found' | 'network'

  constructor(message: string, code: QuickGoError['code']) {
    super(message)
    this.name = 'QuickGoError'
    this.code = code
  }
}

const GO_ROOT_BY_ASPECT: Record<QuickGoAspect, string> = {
  molecular_function: 'GO:0003674',
  biological_process: 'GO:0008150',
  cellular_component: 'GO:0005575',
}

function isPresent<T>(value: T | null | undefined): value is T {
  return value != null
}

function normalizeGoId(goId: string): string {
  return goId.trim().toUpperCase()
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
    throw new QuickGoError('QuickGO 서버에 연결하지 못했습니다.', 'network')
  }

  if (!response.ok) {
    throw new QuickGoError(`QuickGO 요청 실패 (${response.status})`, 'network')
  }

  return response.json() as Promise<T>
}

function indexTerms(results: QuickGoTermRecord[] | undefined): Map<string, QuickGoTermRecord> {
  const map = new Map<string, QuickGoTermRecord>()
  for (const item of results ?? []) {
    if (item.id) map.set(item.id, item)
  }
  return map
}

export function parseQuickGoSummary(
  termRecord: QuickGoTermRecord,
  childRecords: QuickGoTermRecord[] | undefined,
  ancestorRecords: QuickGoTermRecord[] | undefined,
  pathRecords: QuickGoPathEdge[] | undefined,
): QuickGoTermSummary {
  const id = termRecord.id?.trim()
  const name = termRecord.name?.trim()
  const aspect = termRecord.aspect
  if (!id || !name || !aspect) {
    throw new QuickGoError('QuickGO term 응답이 불완전합니다.', 'not-found')
  }

  const ancestorMap = indexTerms(ancestorRecords)
  const childMap = indexTerms(childRecords)
  const directChildren = (termRecord.children ?? [])
    .map((child) => {
      const childId = child.id?.trim()
      if (!childId) return null
      return {
        id: childId,
        name: childMap.get(childId)?.name?.trim() || childId,
        relation: child.relation?.trim(),
      }
    })
    .filter(isPresent)

  const ancestors = (termRecord.ancestors ?? [])
    .filter((ancestorId) => ancestorId !== id)
    .map((ancestorId) => {
      const record = ancestorMap.get(ancestorId)
      if (!record?.id) return null
      return {
        id: record.id,
        name: record.name?.trim() || record.id,
      }
    })
    .filter(isPresent)

  return {
    id,
    name,
    aspect,
    isObsolete: Boolean(termRecord.isObsolete),
    definition: termRecord.definition?.text?.trim() || '정의가 제공되지 않았습니다.',
    usage: termRecord.usage?.trim() || null,
    comment: termRecord.comment?.trim() || null,
    synonyms: (termRecord.synonyms ?? [])
      .map((synonym) => {
        const synonymName = synonym.name?.trim()
        if (!synonymName) return null
        return {
          name: synonymName,
          type: synonym.type?.trim() || null,
        }
      })
      .filter(isPresent),
    ancestors,
    children: directChildren,
    pathToRoot: (pathRecords ?? [])
      .map((step) => {
        const child = step.child?.trim()
        const parent = step.parent?.trim()
        const relationship = step.relationship?.trim()
        if (!child || !parent || !relationship) return null
        return { child, parent, relationship }
      })
      .filter(isPresent),
  }
}

export async function fetchQuickGoTermSummary(goId: string, signal?: AbortSignal): Promise<QuickGoTermSummary> {
  const normalized = normalizeGoId(goId)
  if (!/^GO:\d{7}$/.test(normalized)) {
    throw new QuickGoError('올바른 GO ID 형식이 아닙니다.', 'invalid-id')
  }

  const termData = await fetchJson<QuickGoTermResponse>(`${QUICKGO_API_BASE}/terms/${encodeURIComponent(normalized)}`, signal)
  const termRecord = termData.results?.[0]
  if (!termRecord?.id || !termRecord.aspect) {
    throw new QuickGoError(`${normalized} term을 찾지 못했습니다.`, 'not-found')
  }

  const rootId = GO_ROOT_BY_ASPECT[termRecord.aspect]
  const childIds = (termRecord.children ?? [])
    .map((child) => child.id?.trim())
    .filter((id): id is string => Boolean(id))
    .slice(0, 12)
  const ancestorsPromise = fetchJson<QuickGoTermResponse>(
    `${QUICKGO_API_BASE}/terms/${encodeURIComponent(normalized)}/ancestors`,
    signal,
  )

  const childrenPromise = childIds.length > 0
    ? fetchJson<QuickGoTermResponse>(
      `${QUICKGO_API_BASE}/terms/${childIds.map((id) => encodeURIComponent(id)).join(',')}`,
      signal,
    )
    : Promise.resolve({ results: [] } satisfies QuickGoTermResponse)

  const pathPromise = fetchJson<QuickGoPathResponse>(
    `${QUICKGO_API_BASE}/terms/${encodeURIComponent(normalized)}/paths/${encodeURIComponent(rootId)}`,
    signal,
  )

  const [ancestorData, childrenData, pathData] = await Promise.all([
    ancestorsPromise,
    childrenPromise,
    pathPromise,
  ])

  const directPath = (pathData.results ?? [])
    .sort((a, b) => a.length - b.length)[0]

  return parseQuickGoSummary(
    termRecord,
    childrenData.results,
    ancestorData.results,
    directPath,
  )
}
