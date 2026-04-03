/**
 * OpenRouter AI 프록시 핸들러
 *
 * /api/ai/* → OpenRouter API 중계
 * - Origin 검증 + rate limiting
 * - Worker가 Authorization 헤더 추가 (클라이언트 키 노출 방지)
 * - SSE 스트리밍 pass-through
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, checkRateLimit, verifySameOrigin } from '../lib/worker-utils'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

const ALLOWED_PATHS: ReadonlySet<string> = new Set([
  '/chat/completions',
  '/models',
])

export async function handleAiProxy(
  request: Request,
  env: WorkerEnv,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded. Try again later.' }, 429)
  }

  const subPath = url.pathname.replace(/^\/api\/ai/, '')

  if (!ALLOWED_PATHS.has(subPath)) {
    return jsonResponse({ error: 'Not found' }, 404)
  }

  if (!env.OPENROUTER_API_KEY) {
    return jsonResponse({ error: 'API key not configured' }, 500)
  }

  const targetUrl = `${OPENROUTER_BASE}${subPath}`

  const bodyText = await request.text()
  if (bodyText.length > 10_240) {
    return jsonResponse({ error: 'Payload too large' }, 413)
  }

  const proxyHeaders = new Headers()
  proxyHeaders.set('Authorization', `Bearer ${env.OPENROUTER_API_KEY}`)
  proxyHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

  const httpReferer = request.headers.get('HTTP-Referer')
  if (httpReferer) {
    proxyHeaders.set('HTTP-Referer', httpReferer)
  }
  const xTitle = request.headers.get('X-Title')
  if (xTitle) {
    proxyHeaders.set('X-Title', xTitle)
  }

  const openRouterResponse = await fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: request.method !== 'GET' ? bodyText : undefined,
  })

  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', openRouterResponse.headers.get('Content-Type') || 'application/json')

  if (openRouterResponse.headers.get('Content-Type')?.includes('text/event-stream')) {
    responseHeaders.set('Cache-Control', 'no-cache')
  }

  return new Response(openRouterResponse.body, {
    status: openRouterResponse.status,
    headers: responseHeaders,
  })
}
