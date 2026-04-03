/**
 * NCBI BLAST 프록시 핸들러
 *
 * POST /api/blast/submit    — 서열 제출 → RID 반환 (D1 캐시 히트 시 즉시 반환)
 * GET  /api/blast/status/:rid — RID 상태 확인
 * GET  /api/blast/result/:rid — 결과 조회 (Tabular → JSON, 캐시 저장)
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, checkRateLimit, verifySameOrigin } from '../lib/worker-utils'

const NCBI_BLAST_BASE = 'https://blast.ncbi.nlm.nih.gov/Blast.cgi'

const BLAST_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000

const BLAST_MIN_INTERVAL_MS = 10_000
/**
 * 단일 isolate 내에서만 유효한 best-effort 스로틀.
 * Workers는 다수 isolate를 생성할 수 있어 동시 요청이 모두 통과할 수 있음.
 * 트래픽 증가 시 KV 또는 Durable Objects로 교체 필요.
 *
 * 클라이언트 보완: BlastRunner가 429 응답 시 retryAfter 기반 자동 재시도 (최대 3회).
 */
let lastBlastSubmitAt = 0

async function hashSequence(sequence: string): Promise<string> {
  const data = new TextEncoder().encode(sequence)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('')
}

const ALLOWED_PROGRAMS = new Set(['blastn', 'blastp', 'blastx', 'tblastn', 'tblastx'])
const ALLOWED_DATABASES = new Set(['nt', 'nr', 'refseq_select', 'refseq_rna', 'swissprot', 'pdb', 'core_nt'])

export async function handleBlastProxy(
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

  const subPath = url.pathname.replace(/^\/api\/blast/, '')

  if (subPath === '/submit' && request.method === 'POST') {
    return handleBlastSubmit(request, env)
  }

  const statusMatch = subPath.match(/^\/status\/([A-Z0-9]+)$/)
  if (statusMatch && request.method === 'GET') {
    return handleBlastStatus(statusMatch[1])
  }

  const resultMatch = subPath.match(/^\/result\/([A-Z0-9]+)$/)
  if (resultMatch && request.method === 'GET') {
    const seqHash = url.searchParams.get('hash') || undefined
    const cacheKey = url.searchParams.get('cacheKey') || url.searchParams.get('marker') || undefined
    return handleBlastResult(resultMatch[1], env, seqHash, cacheKey)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

async function handleBlastSubmit(
  request: Request,
  env: WorkerEnv
): Promise<Response> {
  const body = await parseJsonBody<{
    sequence?: string
    marker?: string
    program?: string
    database?: string
    expect?: number
    hitlistSize?: number
    megablast?: boolean
    apiKey?: string
  }>(request)
  if (body instanceof Response) return body

  const sequence = body.sequence?.trim()
  if (!sequence) {
    return jsonResponse({ error: '서열을 입력하세요.' }, 400)
  }

  const program = body.program && ALLOWED_PROGRAMS.has(body.program)
    ? body.program
    : 'blastn'

  const isProteinInput = program === 'blastp' || program === 'tblastn'
  const minLength = isProteinInput ? 10 : 100
  if (sequence.length < minLength) {
    return jsonResponse({
      error: isProteinInput
        ? `서열은 최소 ${minLength} aa 이상이어야 합니다.`
        : `서열은 최소 ${minLength} bp 이상이어야 합니다.`,
    }, 400)
  }
  if (sequence.length > 10_000) {
    return jsonResponse({ error: '서열은 최대 10,000자까지 허용됩니다.' }, 400)
  }

  const database = body.database && ALLOWED_DATABASES.has(body.database)
    ? body.database
    : (program === 'blastp' || program === 'blastx' ? 'nr' : 'nt')

  const hitlistSize = Math.min(Math.max(body.hitlistSize ?? (body.marker ? 10 : 50), 1), 500)

  const rawExpect = body.expect ?? 10
  const expect = (typeof rawExpect === 'number' && isFinite(rawExpect) && rawExpect > 0)
    ? Math.min(rawExpect, 100_000) : 10

  const useMegablast = program === 'blastn' && (body.megablast !== false)

  const seqHash = await hashSequence(sequence)
  const cacheKey = body.marker ? body.marker : `${program}_${database}`

  try {
    const cached = await env.DB.prepare(
      'SELECT result_json FROM blast_cache WHERE sequence_hash = ? AND marker = ? AND expires_at > ?'
    ).bind(seqHash, cacheKey, Date.now()).first<{ result_json: string }>()

    if (cached) {
      const hits = JSON.parse(cached.result_json) as Array<Record<string, unknown>>
      return jsonResponse({ cached: true, hits }, 200)
    }
  } catch {
    // silent: NCBI 호출로 폴백
  }

  const now = Date.now()
  const elapsed = now - lastBlastSubmitAt
  if (elapsed < BLAST_MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((BLAST_MIN_INTERVAL_MS - elapsed) / 1000)
    return jsonResponse({
      error: 'throttled',
      message: `NCBI 요청 제한. ${waitSec}초 후 다시 시도하세요.`,
      retryAfter: waitSec,
    }, 429)
  }

  const apiKey = body.apiKey || env.NCBI_API_KEY || ''

  const params = new URLSearchParams({
    CMD: 'Put',
    PROGRAM: program,
    DATABASE: database,
    QUERY: sequence,
    HITLIST_SIZE: String(hitlistSize),
    EXPECT: String(expect),
  })
  if (useMegablast) {
    params.set('MEGABLAST', 'on')
  }
  if (apiKey) {
    params.set('api_key', apiKey)
  }

  lastBlastSubmitAt = Date.now()

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  const ridMatch = text.match(/RID\s*=\s*([A-Z0-9]+)/)
  const rtoeMatch = text.match(/RTOE\s*=\s*(\d+)/)

  if (!ridMatch) {
    return jsonResponse({ error: 'NCBI BLAST 제출에 실패했습니다.', detail: text.slice(0, 500) }, 502)
  }

  return jsonResponse({
    rid: ridMatch[1],
    rtoe: rtoeMatch ? Number(rtoeMatch[1]) : 30,
    sequenceHash: seqHash,
    cacheKey,
  }, 200)
}

async function handleBlastStatus(rid: string): Promise<Response> {
  const params = new URLSearchParams({
    CMD: 'Get',
    RID: rid,
    FORMAT_OBJECT: 'SearchInfo',
  })

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  const statusMatch = text.match(/Status=(\w+)/)
  const status = statusMatch ? statusMatch[1] : 'UNKNOWN'

  return jsonResponse({ rid, status }, 200)
}

async function handleBlastResult(
  rid: string,
  env: WorkerEnv,
  sequenceHash?: string,
  cacheKey?: string
): Promise<Response> {
  const params = new URLSearchParams({
    CMD: 'Get',
    RID: rid,
    FORMAT_TYPE: 'Text',
    ALIGNMENT_VIEW: 'Tabular',
  })

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  if (text.includes('Status=WAITING') || text.includes('Status=RUNNING')) {
    return jsonResponse({ rid, status: 'RUNNING', message: '아직 처리 중입니다.' }, 202)
  }

  const hits: Array<Record<string, unknown>> = []
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.startsWith('<') || !line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 12) continue
    const accession = cols[1]?.trim()
    const identity = parseFloat(cols[2])
    if (!accession || isNaN(identity)) continue

    hits.push({
      accession,
      identity: identity / 100,
      alignLength: parseInt(cols[3]),
      mismatches: parseInt(cols[4]),
      gapOpens: parseInt(cols[5]),
      queryStart: parseInt(cols[6]),
      queryEnd: parseInt(cols[7]),
      subjectStart: parseInt(cols[8]),
      subjectEnd: parseInt(cols[9]),
      evalue: parseFloat(cols[10]),
      bitScore: parseFloat(cols[11]),
    })
  }

  if (sequenceHash && cacheKey && hits.length > 0) {
    const now = Date.now()
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO blast_cache (sequence_hash, marker, api_source, result_json, cached_at, expires_at)
         VALUES (?, ?, 'ncbi', ?, ?, ?)`
      ).bind(sequenceHash, cacheKey, JSON.stringify(hits), now, now + BLAST_CACHE_TTL_MS).run()
    } catch {
      // silent: 캐시 없어도 결과 반환 가능
    }
  }

  if (hits.length === 0) {
    return jsonResponse({ rid, hits: [], message: '매칭 결과가 없습니다.' }, 200)
  }

  return jsonResponse({ rid, hits }, 200)
}
