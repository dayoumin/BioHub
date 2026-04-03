/**
 * NCBI E-utilities 프록시 핸들러
 *
 * GET  /api/ncbi/search  — ESearch + ESummary 서열 검색
 * GET  /api/ncbi/fetch   — EFetch 서열 다운로드
 * POST /api/ncbi/species — accession → 종명 일괄 조회
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, checkRateLimit, verifySameOrigin } from '../lib/worker-utils'

const NCBI_EFETCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

const ALLOWED_NCBI_DBS = new Set(['nuccore', 'protein'])
const ALLOWED_RETTYPES = new Set(['fasta', 'gb', 'genbank', 'docsum'])
const ALLOWED_RETMODES = new Set(['text', 'json', 'xml'])
const NCBI_ID_PATTERN = /^[A-Za-z0-9_.,]+$/

export async function handleNcbiProxy(
  request: Request,
  env: WorkerEnv,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429)
  }

  const subPath = url.pathname.replace(/^\/api\/ncbi/, '')

  if (subPath === '/species' && request.method === 'POST') {
    return handleSpeciesLookup(request, env)
  }

  if (subPath === '/search' && request.method === 'GET') {
    return handleNcbiSearch(env, url)
  }

  if (subPath === '/fetch' && request.method === 'GET') {
    return handleNcbiFetch(env, url)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

async function handleNcbiSearch(env: WorkerEnv, url: URL): Promise<Response> {
  const term = url.searchParams.get('term')?.trim()
  if (!term) return jsonResponse({ error: 'term 파라미터가 필요합니다.' }, 400)

  const rawDb = url.searchParams.get('db') || 'nuccore'
  const db = ALLOWED_NCBI_DBS.has(rawDb) ? rawDb : 'nuccore'
  const retmax = Math.min(Number(url.searchParams.get('retmax') || 20), 100)

  const apiKey = env.NCBI_API_KEY || ''
  const searchParams = new URLSearchParams({
    db, term, retmax: String(retmax), retmode: 'json', sort: 'relevance',
  })
  if (apiKey) searchParams.set('api_key', apiKey)

  try {
    const searchRes = await fetch(`${NCBI_EFETCH_BASE}/esearch.fcgi?${searchParams.toString()}`)
    if (!searchRes.ok) return jsonResponse({ error: `NCBI 검색 오류 (${searchRes.status})` }, 502)

    const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[]; count?: string } }
    const ids = searchData.esearchresult?.idlist ?? []
    const totalCount = Number(searchData.esearchresult?.count ?? 0)

    if (ids.length === 0) return jsonResponse({ results: [], totalCount: 0 }, 200)

    const summaryParams = new URLSearchParams({
      db, id: ids.join(','), retmode: 'json',
    })
    if (apiKey) summaryParams.set('api_key', apiKey)

    const summaryRes = await fetch(`${NCBI_EFETCH_BASE}/esummary.fcgi?${summaryParams.toString()}`)
    if (!summaryRes.ok) return jsonResponse({ error: `NCBI 요약 오류 (${summaryRes.status})` }, 502)

    const summaryData = await summaryRes.json() as Record<string, unknown>
    const result = summaryData['result'] as Record<string, unknown> | undefined
    const uids = (result?.['uids'] as string[]) ?? []

    const results: Array<{
      uid: string; accession: string; title: string;
      organism: string; length: number; updateDate: string
    }> = []

    for (const uid of uids) {
      const entry = result?.[uid] as Record<string, unknown> | undefined
      if (!entry) continue
      results.push({
        uid,
        accession: (entry['accessionversion'] as string) || (entry['caption'] as string) || uid,
        title: (entry['title'] as string) || '',
        organism: (entry['organism'] as string) || '',
        length: Number(entry['slen'] || entry['length'] || 0),
        updateDate: (entry['updatedate'] as string) || '',
      })
    }

    return jsonResponse({ results, totalCount }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: `NCBI 검색 실패: ${msg}` }, 502)
  }
}

async function handleNcbiFetch(env: WorkerEnv, url: URL): Promise<Response> {
  const id = url.searchParams.get('id')?.trim()
  if (!id) return jsonResponse({ error: 'id 파라미터가 필요합니다.' }, 400)
  if (!NCBI_ID_PATTERN.test(id) || id.length > 200) {
    return jsonResponse({ error: '잘못된 ID 형식입니다.' }, 400)
  }

  const rawDb = url.searchParams.get('db') || 'nuccore'
  const db = ALLOWED_NCBI_DBS.has(rawDb) ? rawDb : 'nuccore'
  const rawRettype = url.searchParams.get('rettype') || 'fasta'
  const rettype = ALLOWED_RETTYPES.has(rawRettype) ? rawRettype : 'fasta'
  const rawRetmode = url.searchParams.get('retmode') || 'text'
  const retmode = ALLOWED_RETMODES.has(rawRetmode) ? rawRetmode : 'text'

  const apiKey = env.NCBI_API_KEY || ''
  const params = new URLSearchParams({ db, id, rettype, retmode })
  if (apiKey) params.set('api_key', apiKey)

  try {
    const res = await fetch(`${NCBI_EFETCH_BASE}/efetch.fcgi?${params.toString()}`)
    if (!res.ok) return jsonResponse({ error: `NCBI 다운로드 오류 (${res.status})` }, 502)

    const text = await res.text()
    return new Response(text, {
      headers: {
        'Content-Type': retmode === 'json' ? 'application/json' : 'text/plain',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: `NCBI 다운로드 실패: ${msg}` }, 502)
  }
}

async function handleSpeciesLookup(
  request: Request,
  env: WorkerEnv
): Promise<Response> {
  const body = await parseJsonBody<{ accessions?: string[]; db?: string }>(request)
  if (body instanceof Response) return body

  const accessions = body.accessions
  if (!accessions || !Array.isArray(accessions) || accessions.length === 0) {
    return jsonResponse({ error: 'accessions 배열이 필요합니다.' }, 400)
  }

  const limited = accessions.slice(0, 50)

  const lookupDb = body.db === 'protein' ? 'protein' : 'nuccore'

  const validPattern = /^[A-Za-z0-9_.]+$/
  for (const acc of limited) {
    if (!validPattern.test(acc)) {
      return jsonResponse({ error: `잘못된 accession 형식: ${acc}` }, 400)
    }
  }

  const apiKey = env.NCBI_API_KEY || ''
  const params = new URLSearchParams({
    db: lookupDb,
    id: limited.join(','),
    rettype: 'docsum',
    retmode: 'json',
  })
  if (apiKey) {
    params.set('api_key', apiKey)
  }

  try {
    const res = await fetch(`${NCBI_EFETCH_BASE}/esummary.fcgi?${params.toString()}`)
    if (!res.ok) {
      return jsonResponse({ error: `NCBI E-utilities 오류 (${res.status})` }, 502)
    }

    const data = await res.json() as Record<string, unknown>
    const result = data['result'] as Record<string, unknown> | undefined
    if (!result) {
      return jsonResponse({ error: 'NCBI 응답 파싱에 실패했습니다.' }, 502)
    }

    const uids = result['uids'] as string[] | undefined
    const species: Record<string, string> = {}
    const meta: Record<string, { title?: string; taxid?: number; country?: string; isBarcode?: boolean }> = {}

    const baseToInputs = new Map<string, string[]>()
    for (const acc of limited) {
      const base = acc.split('.')[0].toUpperCase()
      const existing = baseToInputs.get(base) ?? []
      existing.push(acc)
      baseToInputs.set(base, existing)
    }

    if (uids) {
      for (const uid of uids) {
        const entry = result[uid] as Record<string, unknown> | undefined
        if (!entry) continue
        const organism = (entry['organism'] as string) || ''
        const accVer = (entry['accessionversion'] as string) || (entry['caption'] as string) || ''
        const title = (entry['title'] as string) || ''
        const name = organism || title.split(' ').slice(0, 2).join(' ')
        if (!name) continue

        const taxid = entry['taxid'] as number | undefined
        const subname = (entry['subname'] as string) || ''
        const tech = (entry['tech'] as string) || ''
        const subParts = subname.split('|')
        const country = subParts[1]?.trim() || undefined
        const isBarcode = tech === 'barcode'

        const info = { title: title || undefined, taxid, country, isBarcode }

        const accBase = accVer.split('.')[0].toUpperCase()
        const matchedInputs = baseToInputs.get(accBase) ?? []
        for (const inputAcc of matchedInputs) {
          species[inputAcc] = name
          meta[inputAcc] = info
        }
        if (accVer && !species[accVer]) { species[accVer] = name; meta[accVer] = info }
        const accBaseOriginal = accVer.split('.')[0]
        if (accBaseOriginal && !species[accBaseOriginal]) { species[accBaseOriginal] = name; meta[accBaseOriginal] = info }
      }
    }

    return jsonResponse({ species, meta }, 200)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: `NCBI 요청 실패: ${msg}` }, 502)
  }
}
