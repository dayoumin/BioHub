/**
 * BioHub Cloudflare Worker — OpenRouter API 프록시
 *
 * 클라이언트 번들에서 API 키를 제거하고, Worker secrets로 서버에만 보관.
 * /api/ai/* 요청을 OpenRouter에 중계하며, 나머지는 Static Assets 서빙.
 *
 * 보안:
 * - Origin 검증: 같은 도메인에서만 프록시 허용
 * - Rate limit: IP당 분당 30회 제한
 * - 경로 화이트리스트: /chat/completions, /models만 허용
 */

interface Env {
  ASSETS: Fetcher
  DB: D1Database
  OPENROUTER_API_KEY: string
  NCBI_API_KEY?: string
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/** 허용된 OpenRouter 경로 (화이트리스트) */
const ALLOWED_PATHS: ReadonlySet<string> = new Set([
  '/chat/completions',
  '/models',
])

/** Rate limit: IP당 분당 최대 요청 수 */
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 60_000

/** IP별 요청 카운터 (Worker 인스턴스 메모리, 리스타트 시 초기화) */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  // 메모리 바운드: 만료 엔트리 정리 + 상한 초과 시 가장 오래된 엔트리 제거
  if (rateLimitMap.size > 100) {
    const now = Date.now()
    for (const [key, entry] of rateLimitMap) {
      if (now >= entry.resetAt) rateLimitMap.delete(key)
    }
  }
  if (rateLimitMap.size > 10_000) {
    const excess = rateLimitMap.size - 5_000
    let deleted = 0
    for (const key of rateLimitMap.keys()) {
      if (deleted >= excess) break
      rateLimitMap.delete(key)
      deleted++
    }
  }

  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

/** 두 hostname이 같은 사이트인지 (localhost 간 포트 차이 허용) */
function isSameHost(sourceHostname: string, targetHostname: string, isLocalDev: boolean): boolean {
  if (sourceHostname === targetHostname) return true
  if (isLocalDev && (sourceHostname === 'localhost' || sourceHostname === '127.0.0.1')) return true
  return false
}

/** Origin/Referer 검증 — same-site만 허용. 실패 시 403 Response 반환, 통과 시 null */
function verifySameOrigin(request: Request, url: URL): Response | null {
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const isLocalDev = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

  const sourceUrl = origin || referer
  if (!sourceUrl) return jsonResponse({ error: 'Forbidden' }, 403)

  const sourceHostname = new URL(sourceUrl).hostname
  if (!isSameHost(sourceHostname, url.hostname, isLocalDev)) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }
  return null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // /api/ai/* → OpenRouter 프록시
    if (url.pathname.startsWith('/api/ai/') || url.pathname === '/api/ai') {
      return handleOpenRouterProxy(request, env, url)
    }

    // /api/blast/* → NCBI BLAST 프록시
    if (url.pathname.startsWith('/api/blast/')) {
      return handleBlastProxy(request, env, url)
    }

    // /api/ncbi/* → NCBI E-utilities 프록시
    if (url.pathname.startsWith('/api/ncbi/')) {
      return handleNcbiProxy(request, env, url)
    }

    // /api/projects/* → 프로젝트 CRUD
    if (url.pathname.startsWith('/api/projects')) {
      return handleProjectsApi(request, env, url)
    }

    // /api/entities/* → 엔티티 연결 (분석 결과를 프로젝트에 연결)
    if (url.pathname.startsWith('/api/entities')) {
      return handleEntitiesApi(request, env, url)
    }

    // 그 외 → Static Assets (기존 동작)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

/**
 * OpenRouter API 프록시
 * - Origin 검증 (same-site만 허용)
 * - IP 기반 rate limiting
 * - 클라이언트 body를 그대로 전달
 * - Worker가 Authorization 헤더 추가
 * - 스트리밍(SSE) 응답은 body pass-through
 */
async function handleOpenRouterProxy(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  // /api/ai/chat/completions → /chat/completions
  const subPath = url.pathname.replace(/^\/api\/ai/, '')

  // 화이트리스트 검증
  if (!ALLOWED_PATHS.has(subPath)) {
    return jsonResponse({ error: 'Not found' }, 404)
  }

  // API 키 검증
  if (!env.OPENROUTER_API_KEY) {
    return jsonResponse({ error: 'API key not configured' }, 500)
  }

  const targetUrl = `${OPENROUTER_BASE}${subPath}`

  // Request body 크기 제한 (10KB) — 프롬프트 프록시 용도이므로 대용량 불필요
  // Content-Length 헤더는 생략/위조 가능하므로 실제 body를 읽어서 확인
  const bodyText = await request.text()
  if (bodyText.length > 10_240) {
    return jsonResponse({ error: 'Payload too large' }, 413)
  }

  // 클라이언트 헤더 중 전달할 것만 선별
  const proxyHeaders = new Headers()
  proxyHeaders.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`)
  proxyHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  // 클라이언트가 보낸 HTTP-Referer/X-Title 전달 (OpenRouter 대시보드 표시용)
  const httpReferer = request.headers.get('HTTP-Referer')
  if (httpReferer) {
    proxyHeaders.set('HTTP-Referer', httpReferer)
  }
  const xTitle = request.headers.get('X-Title')
  if (xTitle) {
    proxyHeaders.set('X-Title', xTitle)
  }

  // OpenRouter에 요청 전달
  const openRouterResponse = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' ? bodyText : undefined,
  })

  // 응답 헤더 구성
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', openRouterResponse.headers.get('Content-Type') || 'application/json')

  // 스트리밍(SSE) 응답 처리
  if (openRouterResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
    responseHeaders.set('Cache-Control', 'no-cache')
  }

  return new Response(openRouterResponse.body, {
    status: openRouterResponse.status,
    headers: responseHeaders,
  })
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ═══════════════════════════════════════════════════════════════
// NCBI BLAST 프록시
// ═══════════════════════════════════════════════════════════════

const NCBI_BLAST_BASE = 'https://blast.ncbi.nlm.nih.gov/Blast.cgi'

/** BLAST 캐시 TTL: 14일 */
const BLAST_CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** BLAST 제출 간 최소 간격 (NCBI 정책: 10초) */
const BLAST_MIN_INTERVAL_MS = 10_000
/**
 * 단일 isolate 내에서만 유효한 best-effort 스로틀.
 * Workers는 다수 isolate를 생성할 수 있어 동시 요청이 모두 통과할 수 있음.
 * 트래픽 증가 시 KV 또는 Durable Objects로 교체 필요.
 *
 * 클라이언트 보완: BlastRunner가 429 응답 시 retryAfter 기반 자동 재시도 (최대 3회).
 * 다중 isolate에서 동시 통과하더라도 NCBI 측 429 → 클라이언트 재시도로 복구.
 */
let lastBlastSubmitAt = 0

/** SHA-256 해시 (Web Crypto API) */
async function hashSequence(sequence: string): Promise<string> {
  const data = new TextEncoder().encode(sequence)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * BLAST API 프록시
 *
 * POST /api/blast/submit — 서열 제출 → RID 반환 (캐시 히트 시 즉시 반환)
 * GET  /api/blast/status/:rid — RID 상태 확인
 * GET  /api/blast/result/:rid — 결과 조회 (Tabular → JSON, 캐시 저장)
 */
async function handleBlastProxy(
  request: Request,
  env: Env,
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
    const marker = url.searchParams.get('marker') || undefined
    return handleBlastResult(resultMatch[1], env, seqHash, marker)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

/**
 * POST /api/blast/submit
 * Body: { sequence: string, marker?: string, apiKey?: string }
 *
 * NCBI BLAST에 서열 제출 → RID 반환
 */
async function handleBlastSubmit(
  request: Request,
  env: Env
): Promise<Response> {
  let body: { sequence?: string; marker?: string; apiKey?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const sequence = body.sequence?.trim()
  if (!sequence || sequence.length < 100) {
    return jsonResponse({ error: '서열은 최소 100 bp 이상이어야 합니다.' }, 400)
  }
  if (sequence.length > 10_000) {
    return jsonResponse({ error: '서열은 최대 10,000 bp까지 허용됩니다.' }, 400)
  }

  const marker = body.marker || 'COI'
  const seqHash = await hashSequence(sequence)

  // D1 캐시 확인
  try {
    const cached = await env.DB.prepare(
      'SELECT result_json FROM blast_cache WHERE sequence_hash = ? AND marker = ? AND expires_at > ?'
    ).bind(seqHash, marker, Date.now()).first<{ result_json: string }>()

    if (cached) {
      const hits = JSON.parse(cached.result_json) as Array<Record<string, unknown>>
      return jsonResponse({ cached: true, hits }, 200)
    }
  } catch {
    // 캐시 조회 실패 시 무시하고 NCBI 호출 진행
  }

  // 스로틀: NCBI 정책 준수 (10초 간격)
  const now = Date.now()
  const elapsed = now - lastBlastSubmitAt
  if (elapsed < BLAST_MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((BLAST_MIN_INTERVAL_MS - elapsed) / 1000)
    return jsonResponse({
      error: 'throttled',
      message: `NCBI rate limit. ${waitSec}초 후 다시 시도하세요.`,
      retryAfter: waitSec,
    }, 429)
  }

  // 사용자 API 키 우선, 없으면 서버 키
  const apiKey = body.apiKey || env.NCBI_API_KEY || ''

  const params = new URLSearchParams({
    CMD: 'Put',
    PROGRAM: 'blastn',
    MEGABLAST: 'on',
    DATABASE: 'nt',
    QUERY: sequence,
    HITLIST_SIZE: '10',
  })
  if (apiKey) {
    params.set('api_key', apiKey)
  }

  lastBlastSubmitAt = Date.now()

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  const ridMatch = text.match(/RID\s*=\s*([A-Z0-9]+)/)
  const rtoeMatch = text.match(/RTOE\s*=\s*(\d+)/)

  if (!ridMatch) {
    return jsonResponse({ error: 'NCBI BLAST 제출 실패', detail: text.slice(0, 500) }, 502)
  }

  return jsonResponse({
    rid: ridMatch[1],
    rtoe: rtoeMatch ? Number(rtoeMatch[1]) : 30,
    sequenceHash: seqHash,
  }, 200)
}

/**
 * GET /api/blast/status/:rid
 *
 * NCBI BLAST 작업 상태 확인
 * 반환: { status: 'WAITING' | 'RUNNING' | 'READY' | 'FAILED' | 'UNKNOWN' }
 */
async function handleBlastStatus(rid: string): Promise<Response> {
  const params = new URLSearchParams({
    CMD: 'Get',
    RID: rid,
    FORMAT_OBJECT: 'SearchInfo',
  })

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  // Status 파싱: "Status=WAITING" | "Status=READY" etc.
  const statusMatch = text.match(/Status=(\w+)/)
  const status = statusMatch ? statusMatch[1] : 'UNKNOWN'

  return jsonResponse({ rid, status }, 200)
}

/**
 * GET /api/blast/result/:rid
 *
 * NCBI BLAST 결과 조회 — Tabular 텍스트를 파싱해서 JSON으로 반환
 * JSON2는 항상 ZIP으로 반환됨 (NCBI 표준 동작) → Workers에서 ZIP 파싱 불가 → Tabular 사용
 */
async function handleBlastResult(
  rid: string,
  env: Env,
  sequenceHash?: string,
  marker?: string
): Promise<Response> {
  // Tabular 포맷으로 요청 — JSON2는 항상 ZIP으로 반환됨 (NCBI 표준), Workers에서 ZIP 파싱 불가
  const params = new URLSearchParams({
    CMD: 'Get',
    RID: rid,
    FORMAT_TYPE: 'Text',
    ALIGNMENT_VIEW: 'Tabular',
  })

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  // 아직 준비 안 된 경우
  if (text.includes('Status=WAITING') || text.includes('Status=RUNNING')) {
    return jsonResponse({ rid, status: 'RUNNING', message: '아직 처리 중입니다.' }, 202)
  }

  // Tabular 결과 파싱
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

  // 캐시 저장 (hash + marker가 있고, 결과가 있을 때)
  if (sequenceHash && marker && hits.length > 0) {
    const now = Date.now()
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO blast_cache (sequence_hash, marker, api_source, result_json, cached_at, expires_at)
         VALUES (?, ?, 'ncbi', ?, ?, ?)`
      ).bind(sequenceHash, marker, JSON.stringify(hits), now, now + BLAST_CACHE_TTL_MS).run()
    } catch {
      // 캐시 저장 실패는 무시
    }
  }

  if (hits.length === 0) {
    return jsonResponse({ rid, hits: [], message: '매칭 결과 없음' }, 200)
  }

  return jsonResponse({ rid, hits }, 200)
}

// ═══════════════════════════════════════════════════════════════
// NCBI E-utilities 프록시 (accession → 종명 조회)
// ═══════════════════════════════════════════════════════════════

const NCBI_EFETCH_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

/**
 * NCBI E-utilities 프록시
 *
 * POST /api/ncbi/species — accession 목록 → 종명 일괄 조회
 */
async function handleNcbiProxy(
  request: Request,
  env: Env,
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

  return jsonResponse({ error: 'Not found' }, 404)
}

/**
 * POST /api/ncbi/species
 * Body: { accessions: string[] }
 *
 * NCBI efetch로 accession → organism(종명) 일괄 조회
 * 최대 10개 (BLAST top hits 수와 동일)
 */
async function handleSpeciesLookup(
  request: Request,
  env: Env
): Promise<Response> {
  let body: { accessions?: string[] }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const accessions = body.accessions
  if (!accessions || !Array.isArray(accessions) || accessions.length === 0) {
    return jsonResponse({ error: 'accessions 배열이 필요합니다.' }, 400)
  }

  // 최대 10개 제한 (BLAST top hits 수)
  const limited = accessions.slice(0, 10)

  // accession 형식 검증 (영숫자 + 밑줄 + 점)
  const validPattern = /^[A-Za-z0-9_.]+$/
  for (const acc of limited) {
    if (!validPattern.test(acc)) {
      return jsonResponse({ error: `잘못된 accession 형식: ${acc}` }, 400)
    }
  }

  const apiKey = env.NCBI_API_KEY || ''
  const params = new URLSearchParams({
    db: 'nuccore',
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
      return jsonResponse({ error: 'NCBI 응답 파싱 실패' }, 502)
    }

    // NCBI esummary는 UID를 키로 반환 → accession 매핑이 필요
    // 역매핑: base accession → 원본 입력 accession 목록 (응답 순서 무관)
    const uids = result['uids'] as string[] | undefined
    const species: Record<string, string> = {}
    const meta: Record<string, { title?: string; taxid?: number; country?: string; isBarcode?: boolean }> = {}

    // 사전 인덱스: base accession → 원본 입력 accession(들)
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
        // subname 형식: "voucher|country|lat_lon|..." — country는 두 번째 필드
        const subParts = subname.split('|')
        const country = subParts[1]?.trim() || undefined
        const isBarcode = tech === 'barcode'

        const info = { title: title || undefined, taxid, country, isBarcode }

        // base accession으로 원본 입력 accession과 매칭 (대소문자 무시)
        const accBase = accVer.split('.')[0].toUpperCase()
        const matchedInputs = baseToInputs.get(accBase) ?? []
        for (const inputAcc of matchedInputs) {
          species[inputAcc] = name
          meta[inputAcc] = info
        }
        // 버전 포함 키도 저장 (클라이언트가 버전 포함 accession으로 조회할 수 있음)
        if (accVer && !species[accVer]) { species[accVer] = name; meta[accVer] = info }
        // 원래 대소문자 유지한 base accession도 저장
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

// ═══════════════════════════════════════════════════════════════
// 프로젝트 CRUD API
// ═══════════════════════════════════════════════════════════════

/**
 * 프로젝트 API — D1 직접 쿼리
 *
 * MVP에서는 userId를 X-User-Id 헤더로 전달 (인증 미구현)
 * 배포 시 OAuth + 세션으로 교체
 *
 * GET    /api/projects         — 목록
 * POST   /api/projects         — 생성
 * GET    /api/projects/:id     — 상세 (엔티티 포함)
 * PATCH  /api/projects/:id     — 수정
 * DELETE /api/projects/:id     — 삭제 (CASCADE)
 */
async function handleProjectsApi(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const userId = request.headers.get('X-User-Id')
  if (!userId) {
    return jsonResponse({ error: 'X-User-Id 헤더가 필요합니다.' }, 401)
  }

  // 사용자 자동 생성 — 변경 요청에서만 (GET은 불필요)
  if (request.method !== 'GET') {
    await ensureUser(env.DB, userId)
  }

  const subPath = url.pathname.replace(/^\/api\/projects/, '') || '/'
  const idMatch = subPath.match(/^\/([a-zA-Z0-9_-]+)$/)

  // GET /api/projects — 목록
  if (subPath === '/' && request.method === 'GET') {
    return handleListProjects(env.DB, userId)
  }

  // POST /api/projects — 생성
  if (subPath === '/' && request.method === 'POST') {
    return handleCreateProject(env.DB, userId, request)
  }

  if (idMatch) {
    const projectId = idMatch[1]

    // GET /api/projects/:id — 상세
    if (request.method === 'GET') {
      return handleGetProject(env.DB, userId, projectId)
    }

    // PATCH /api/projects/:id — 수정
    if (request.method === 'PATCH') {
      return handleUpdateProject(env.DB, userId, projectId, request)
    }

    // DELETE /api/projects/:id — 삭제
    if (request.method === 'DELETE') {
      return handleDeleteProject(env.DB, userId, projectId)
    }
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

/** MVP: 사용자 첫 요청 시 자동 생성 */
async function ensureUser(db: D1Database, userId: string): Promise<void> {
  const now = Date.now()
  await db.prepare(
    'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)'
  ).bind(userId, now, now).run()
}

async function handleListProjects(db: D1Database, userId: string): Promise<Response> {
  const result = await db.prepare(
    'SELECT * FROM projects WHERE user_id = ? ORDER BY updated_at DESC'
  ).bind(userId).all()

  return jsonResponse({ projects: result.results }, 200)
}

async function handleCreateProject(
  db: D1Database,
  userId: string,
  request: Request
): Promise<Response> {
  let body: { name?: string; description?: string; primaryDomain?: string; tags?: string[] }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.name?.trim()) {
    return jsonResponse({ error: '프로젝트 이름이 필요합니다.' }, 400)
  }

  const now = Date.now()
  const id = `proj_${now}_${Math.random().toString(36).slice(2, 8)}`

  await db.prepare(
    `INSERT INTO projects (id, user_id, name, description, status, primary_domain, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`
  ).bind(
    id, userId, body.name.trim(),
    body.description?.trim() || null,
    body.primaryDomain || null,
    body.tags ? JSON.stringify(body.tags) : null,
    now, now
  ).run()

  return jsonResponse({ id, name: body.name.trim(), createdAt: now }, 201)
}

async function handleGetProject(
  db: D1Database,
  userId: string,
  projectId: string
): Promise<Response> {
  const project = await db.prepare(
    'SELECT * FROM projects WHERE id = ? AND user_id = ?'
  ).bind(projectId, userId).first()

  if (!project) {
    return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
  }

  // 엔티티 참조 조회
  const refs = await db.prepare(
    'SELECT * FROM project_entity_refs WHERE project_id = ? ORDER BY sort_order'
  ).bind(projectId).all()

  return jsonResponse({ project, entities: refs.results }, 200)
}

async function handleUpdateProject(
  db: D1Database,
  userId: string,
  projectId: string,
  request: Request
): Promise<Response> {
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  // 허용 필드만 업데이트
  const allowedFields: Record<string, string> = {
    name: 'name',
    description: 'description',
    status: 'status',
    primaryDomain: 'primary_domain',
    tags: 'tags',
    paperConfig: 'paper_config',
    presentation: 'presentation',
  }

  const sets: string[] = []
  const values: unknown[] = []

  for (const [jsKey, dbCol] of Object.entries(allowedFields)) {
    if (jsKey in body) {
      sets.push(`${dbCol} = ?`)
      const val = body[jsKey]
      values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
    }
  }

  if (sets.length === 0) {
    return jsonResponse({ error: '수정할 필드가 없습니다.' }, 400)
  }

  sets.push('updated_at = ?')
  values.push(Date.now())
  values.push(projectId, userId)

  await db.prepare(
    `UPDATE projects SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...values).run()

  return jsonResponse({ ok: true }, 200)
}

async function handleDeleteProject(
  db: D1Database,
  userId: string,
  projectId: string
): Promise<Response> {
  const result = await db.prepare(
    'DELETE FROM projects WHERE id = ? AND user_id = ?'
  ).bind(projectId, userId).run()

  if (result.meta.changes === 0) {
    return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
  }

  return jsonResponse({ ok: true }, 200)
}

// ═══════════════════════════════════════════════════════════════
// 엔티티 연결 API (분석 결과 ↔ 프로젝트)
// ═══════════════════════════════════════════════════════════════

/**
 * POST   /api/entities/link     — 엔티티를 프로젝트에 연결
 * DELETE /api/entities/link     — 연결 해제
 * POST   /api/entities/blast    — BLAST 결과 저장 + 프로젝트 연결
 */
async function handleEntitiesApi(
  request: Request,
  env: Env,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const userId = request.headers.get('X-User-Id')
  if (!userId) return jsonResponse({ error: 'X-User-Id 헤더가 필요합니다.' }, 401)

  await ensureUser(env.DB, userId)

  const subPath = url.pathname.replace(/^\/api\/entities/, '')

  if (subPath === '/link' && request.method === 'POST') {
    return handleLinkEntity(env.DB, userId, request)
  }

  if (subPath === '/link' && request.method === 'DELETE') {
    return handleUnlinkEntity(env.DB, userId, request)
  }

  if (subPath === '/blast' && request.method === 'POST') {
    return handleSaveBlastResult(env.DB, userId, request)
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

/** 엔티티를 프로젝트에 연결 — 프로젝트 소유권 검증 */
async function handleLinkEntity(db: D1Database, userId: string, request: Request): Promise<Response> {
  let body: { projectId?: string; entityKind?: string; entityId?: string; label?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.projectId || !body.entityKind || !body.entityId) {
    return jsonResponse({ error: 'projectId, entityKind, entityId 필수' }, 400)
  }

  // 프로젝트 소유권 검증
  const project = await db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?'
  ).bind(body.projectId, userId).first()
  if (!project) {
    return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
  }

  const now = Date.now()
  const id = `pref_${now}_${Math.random().toString(36).slice(2, 8)}`

  await db.prepare(
    `INSERT OR REPLACE INTO project_entity_refs (id, project_id, entity_kind, entity_id, label, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, body.projectId, body.entityKind, body.entityId, body.label || null, now).run()

  return jsonResponse({ id }, 201)
}

/** 엔티티 연결 해제 — 프로젝트 소유권 검증 */
async function handleUnlinkEntity(db: D1Database, userId: string, request: Request): Promise<Response> {
  let body: { projectId?: string; entityKind?: string; entityId?: string }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.projectId || !body.entityKind || !body.entityId) {
    return jsonResponse({ error: 'projectId, entityKind, entityId 필수' }, 400)
  }

  // 프로젝트 소유권 검증
  const project = await db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?'
  ).bind(body.projectId, userId).first()
  if (!project) {
    return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
  }

  await db.prepare(
    'DELETE FROM project_entity_refs WHERE project_id = ? AND entity_kind = ? AND entity_id = ?'
  ).bind(body.projectId, body.entityKind, body.entityId).run()

  return jsonResponse({ ok: true }, 200)
}

/** BLAST 결과 저장 + 선택적 프로젝트 연결 */
async function handleSaveBlastResult(
  db: D1Database,
  userId: string,
  request: Request
): Promise<Response> {
  let body: {
    sequenceHash?: string
    sequence?: string
    marker?: string
    sequenceLength?: number
    gcContent?: number
    ambiguousCount?: number
    apiSource?: string
    status?: string
    topHits?: unknown[]
    decisionReason?: string
    recommendedMarkers?: string[]
    taxonAlert?: string
    projectId?: string
  }
  try {
    body = await request.json() as typeof body
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.sequenceHash || !body.marker || !body.status || !body.topHits) {
    return jsonResponse({ error: 'sequenceHash, marker, status, topHits 필수' }, 400)
  }

  // 프로젝트 지정 시 소유권 검증
  if (body.projectId) {
    const project = await db.prepare(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?'
    ).bind(body.projectId, userId).first()
    if (!project) {
      return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
    }
  }

  const now = new Date().toISOString()
  const id = `br_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await db.prepare(
    `INSERT INTO blast_results
     (id, user_id, project_id, sequence_hash, sequence, marker,
      sequence_length, gc_content, ambiguous_count, api_source, status,
      top_hits, decision_reason, recommended_markers, taxon_alert, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, userId, body.projectId || null,
    body.sequenceHash, body.sequence || null, body.marker,
    body.sequenceLength || null, body.gcContent || null, body.ambiguousCount || null,
    body.apiSource || 'ncbi', body.status,
    JSON.stringify(body.topHits), body.decisionReason || null,
    body.recommendedMarkers ? JSON.stringify(body.recommendedMarkers) : null,
    body.taxonAlert || null, now
  ).run()

  // 프로젝트 연결 (지정된 경우)
  if (body.projectId) {
    const refId = `pref_${now}_${Math.random().toString(36).slice(2, 8)}`
    await db.prepare(
      `INSERT OR REPLACE INTO project_entity_refs (id, project_id, entity_kind, entity_id, created_at)
       VALUES (?, ?, 'blast-result', ?, ?)`
    ).bind(refId, body.projectId, id, now).run()
  }

  return jsonResponse({ id }, 201)
}
