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

/** 주기적 정리: 만료된 엔트리 제거 (메모리 누수 방지) */
function cleanupRateLimitMap(): void {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap) {
    if (now >= entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // /api/ai/* → OpenRouter 프록시
    if (url.pathname.startsWith('/api/ai/') || url.pathname === '/api/ai') {
      return handleOpenRouterProxy(request, env, url)
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
  // Origin 검증: 같은 도메인에서만 허용
  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const requestHost = url.host

  // Origin 또는 Referer가 있으면 같은 호스트인지 확인
  // (curl 등 헤더 없는 요청도 차단)
  if (origin) {
    const originHost = new URL(origin).host
    if (originHost !== requestHost) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }
  } else if (referer) {
    const refererHost = new URL(referer).host
    if (refererHost !== requestHost) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }
  } else {
    // Origin도 Referer도 없는 요청 (curl, Postman 등) 차단
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  // Rate limit 검사
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'

  // 메모리 바운드: 만료 엔트리 정리 후에도 상한 초과 시 가장 오래된 엔트리 제거
  if (rateLimitMap.size > 100) {
    cleanupRateLimitMap()
  }
  if (rateLimitMap.size > 10_000) {
    // 분산 트래픽(다수 고유 IP)으로 맵이 무한 성장하는 것을 방지
    // Map insertion order 순으로 삭제 (LRU가 아님 — 정확한 eviction보다 메모리 상한이 목적)
    const excess = rateLimitMap.size - 5_000
    let deleted = 0
    for (const key of rateLimitMap.keys()) {
      if (deleted >= excess) break
      rateLimitMap.delete(key)
      deleted++
    }
  }

  if (!checkRateLimit(clientIp)) {
    return jsonResponse(
      { error: 'Rate limit exceeded. Try again later.' },
      429
    )
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

function jsonResponse(body: Record<string, string>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
