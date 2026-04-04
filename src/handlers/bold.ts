/**
 * BOLD Systems v5 ID Engine 프록시 핸들러
 *
 * POST /api/bold/submit       — FASTA 제출 → sub_id 반환
 * GET  /api/bold/status/:id   — 작업 상태 확인
 * GET  /api/bold/results/:id  — 히트 결과 (JSONL → JSON)
 * GET  /api/bold/classify/:id — 분류 판정 (JSONL → JSON)
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, checkRateLimit, verifySameOrigin } from '../lib/worker-utils'

const BOLD_API_BASE = 'https://id.boldsystems.org'

const ALLOWED_DBS = new Set([
  'public.tax-derep', 'all.tax-derep', 'species', 'all.animal-alt',
  'public.plants', 'public.fungi', 'DS-CANREF22', 'DS-IUCNPUB',
])

/** BOLD v5 rate limit: 3 submissions/min — isolate 단위 best-effort 스로틀 */
const BOLD_MIN_INTERVAL_MS = 21_000 // 60s / 3 = 20s, 여유 1s
let lastBoldSubmitAt = 0

export async function handleBoldProxy(
  request: Request,
  _env: WorkerEnv,
  url: URL
): Promise<Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return jsonResponse({ error: 'Rate limit exceeded' }, 429)
  }

  const subPath = url.pathname.replace(/^\/api\/bold/, '')

  if (subPath === '/submit' && request.method === 'POST') {
    return handleBoldSubmit(request)
  }

  const statusMatch = subPath.match(/^\/status\/(.+)$/)
  if (statusMatch && request.method === 'GET') {
    return handleBoldStatus(statusMatch[1])
  }

  const resultsMatch = subPath.match(/^\/results\/(.+)$/)
  if (resultsMatch && request.method === 'GET') {
    return handleBoldResults(resultsMatch[1])
  }

  const classifyMatch = subPath.match(/^\/classify\/(.+)$/)
  if (classifyMatch && request.method === 'GET') {
    return handleBoldClassify(classifyMatch[1])
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

async function handleBoldSubmit(
  request: Request,
): Promise<Response> {
  const body = await parseJsonBody<{
    sequence?: string
    db?: string
    mi?: number
    mo?: number
    maxh?: number
  }>(request)
  if (body instanceof Response) return body

  const sequence = body.sequence?.trim()
  if (!sequence) {
    return jsonResponse({ error: '서열을 입력하세요.' }, 400)
  }

  if (sequence.length < 100) {
    return jsonResponse({ error: '서열은 최소 100 bp 이상이어야 합니다.' }, 400)
  }

  const db = body.db && ALLOWED_DBS.has(body.db) ? body.db : 'public.tax-derep'
  const mi = typeof body.mi === 'number' && body.mi >= 0.75 && body.mi <= 1.0 ? body.mi : 0.94
  const mo = typeof body.mo === 'number' && body.mo >= 100 && body.mo <= 10000 ? body.mo : 100
  const maxh = typeof body.maxh === 'number' && body.maxh >= 1 && body.maxh <= 100 ? body.maxh : 25

  const now = Date.now()
  const elapsed = now - lastBoldSubmitAt
  if (elapsed < BOLD_MIN_INTERVAL_MS) {
    const waitSec = Math.ceil((BOLD_MIN_INTERVAL_MS - elapsed) / 1000)
    return jsonResponse({
      error: 'throttled',
      message: `BOLD 요청 제한 (3회/분). ${waitSec}초 후 다시 시도하세요.`,
      retryAfter: waitSec,
    }, 429)
  }

  // FASTA 형식으로 래핑
  const fastaContent = sequence.startsWith('>') ? sequence : `>query\n${sequence}`
  const fastaBlob = new Blob([fastaContent], { type: 'text/plain' })

  const formData = new FormData()
  formData.append('fasta_file', fastaBlob, 'query.fasta')

  const boldUrl = `${BOLD_API_BASE}/submission?db=${encodeURIComponent(db)}&mi=${mi}&mo=${mo}&maxh=${maxh}`

  try {
    const boldRes = await fetch(boldUrl, {
      method: 'POST',
      body: formData,
    })

    if (!boldRes.ok) {
      const text = await boldRes.text()
      return jsonResponse({
        error: 'BOLD 서버 제출 실패',
        detail: text.slice(0, 500),
      }, 502)
    }

    const data = await boldRes.json() as Record<string, unknown>

    // sub_id 추출 — 응답 구조가 문서에 미정의이므로 여러 필드 시도
    const subId = data.sub_id ?? data.subId ?? data.id ?? data.submission_id
    if (!subId) {
      return jsonResponse({
        error: 'BOLD 서버가 제출 ID를 반환하지 않았습니다.',
        detail: JSON.stringify(data).slice(0, 500),
      }, 502)
    }

    // 2xx + 유효한 subId 확인 후에만 스로틀 카운트 소모
    lastBoldSubmitAt = Date.now()

    return jsonResponse({ subId: String(subId) }, 200)
  } catch (err) {
    return jsonResponse({
      error: 'BOLD 서버에 연결할 수 없습니다.',
      detail: err instanceof Error ? err.message : String(err),
    }, 502)
  }
}

async function handleBoldStatus(subId: string): Promise<Response> {
  try {
    const res = await fetch(`${BOLD_API_BASE}/submission/status/${encodeURIComponent(subId)}`)
    if (!res.ok) {
      return jsonResponse({ error: `상태 조회 실패 (${res.status})` }, res.status === 404 ? 404 : 502)
    }
    const data = await res.json() as Record<string, unknown>
    return jsonResponse({
      queued: Number(data.queued ?? 0),
      processing: Number(data.processing ?? 0),
      completed: Number(data.completed ?? 0),
    }, 200)
  } catch (err) {
    return jsonResponse({
      error: 'BOLD 상태 조회 실패',
      detail: err instanceof Error ? err.message : String(err),
    }, 502)
  }
}

/** JSONL 텍스트를 JSON 배열로 파싱 */
function parseJsonl(text: string): unknown[] {
  return text
    .replace(/^\uFEFF/, '') // BOM 제거
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line) }
      catch { return null }
    })
    .filter((v): v is Record<string, unknown> => v !== null)
}

async function handleBoldResults(subId: string): Promise<Response> {
  try {
    const res = await fetch(`${BOLD_API_BASE}/submission/results/${encodeURIComponent(subId)}`)
    if (!res.ok) {
      return jsonResponse({ error: `결과 조회 실패 (${res.status})` }, res.status === 404 ? 404 : 502)
    }

    const text = await res.text()
    const parsed = parseJsonl(text)
    return jsonResponse({ results: parsed }, 200)
  } catch (err) {
    return jsonResponse({
      error: 'BOLD 결과 조회 실패',
      detail: err instanceof Error ? err.message : String(err),
    }, 502)
  }
}

async function handleBoldClassify(subId: string): Promise<Response> {
  try {
    const res = await fetch(`${BOLD_API_BASE}/submission/classifications/${encodeURIComponent(subId)}`)
    if (!res.ok) {
      return jsonResponse({ error: `분류 조회 실패 (${res.status})` }, res.status === 404 ? 404 : 502)
    }

    const text = await res.text()
    const parsed = parseJsonl(text)
    return jsonResponse({ classifications: parsed }, 200)
  } catch (err) {
    return jsonResponse({
      error: 'BOLD 분류 조회 실패',
      detail: err instanceof Error ? err.message : String(err),
    }, 502)
  }
}
