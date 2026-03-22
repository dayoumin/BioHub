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

/** BLAST 제출 간 최소 간격 (NCBI 정책: 10초) */
const BLAST_MIN_INTERVAL_MS = 10_000
/**
 * 단일 isolate 내에서만 유효한 best-effort 스로틀.
 * Workers는 다수 isolate를 생성할 수 있어 동시 요청이 모두 통과할 수 있음.
 * 트래픽 증가 시 KV 또는 Durable Objects로 교체 필요.
 */
let lastBlastSubmitAt = 0

/**
 * BLAST API 프록시
 *
 * POST /api/blast/submit — 서열 제출 → RID 반환
 * GET  /api/blast/status/:rid — RID 상태 확인
 * GET  /api/blast/result/:rid — 결과 조회 (Tabular → JSON)
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
    return handleBlastResult(resultMatch[1])
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

  // 사용자 API 키 우선, 없으면 서버 키
  const apiKey = body.apiKey || env.NCBI_API_KEY || ''

  const params = new URLSearchParams({
    CMD: 'Put',
    PROGRAM: 'blastn',
    MEGABLAST: 'on',
    DATABASE: 'nt',
    QUERY: sequence,
    HITLIST_SIZE: '10',
    // FORMAT_TYPE 생략: 결과는 Get에서 Tabular로 요청 (JSON2는 항상 ZIP → Workers 파싱 불가)
  })
  if (apiKey) {
    params.set('api_key', apiKey)
  }

  lastBlastSubmitAt = Date.now()

  const ncbiRes = await fetch(`${NCBI_BLAST_BASE}?${params.toString()}`)
  const text = await ncbiRes.text()

  // RID 추출: "RID = XXXXXXXX"
  const ridMatch = text.match(/RID\s*=\s*([A-Z0-9]+)/)
  const rtoeMatch = text.match(/RTOE\s*=\s*(\d+)/)

  if (!ridMatch) {
    return jsonResponse({ error: 'NCBI BLAST 제출 실패', detail: text.slice(0, 500) }, 502)
  }

  return jsonResponse({
    rid: ridMatch[1],
    rtoe: rtoeMatch ? Number(rtoeMatch[1]) : 30,
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
async function handleBlastResult(rid: string): Promise<Response> {
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
  // Fields: query, subject acc.ver, % identity, alignment length, mismatches, gap opens,
  //         q.start, q.end, s.start, s.end, evalue, bit score
  const hits: Array<Record<string, unknown>> = []
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || line.startsWith('<') || !line.trim()) continue
    const cols = line.split('\t')
    if (cols.length < 12) continue

    hits.push({
      accession: cols[1],
      identity: parseFloat(cols[2]) / 100, // % → 0-1
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

  if (hits.length === 0) {
    return jsonResponse({ rid, hits: [], message: '매칭 결과 없음' }, 200)
  }

  return jsonResponse({ rid, hits }, 200)
}
