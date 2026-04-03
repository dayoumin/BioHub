/**
 * Worker 공통 유틸리티
 *
 * 모든 핸들러가 공유하는 타입, 인증, 보안, 직렬화 헬퍼.
 */

// ── Env ──

export interface WorkerEnv {
  ASSETS: Fetcher
  DB: D1Database
  OPENROUTER_API_KEY: string
  NCBI_API_KEY?: string
  NANET_API_KEY?: string
}

// ── JSON 응답 ──

export function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function parseJsonBody<T = Record<string, unknown>>(request: Request): Promise<T | Response> {
  try {
    return await request.json() as T
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
}

// ── Rate Limiting ──

const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_MS = 60_000

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string): boolean {
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

// ── Origin 검증 ──

function isSameHost(sourceHostname: string, targetHostname: string, isLocalDev: boolean): boolean {
  if (sourceHostname === targetHostname) return true
  if (isLocalDev && (sourceHostname === 'localhost' || sourceHostname === '127.0.0.1')) return true
  return false
}

export function verifySameOrigin(request: Request, url: URL): Response | null {
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

// ── 인증 ──

async function ensureUser(db: D1Database, userId: string): Promise<void> {
  const now = new Date().toISOString()
  await db.prepare(
    'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)'
  ).bind(userId, now, now).run()
}

export async function authenticateRequest(
  request: Request,
  env: WorkerEnv,
  url: URL,
  options?: { ensureUserAlways?: boolean }
): Promise<{ userId: string } | Response> {
  const originErr = verifySameOrigin(request, url)
  if (originErr) return originErr

  const userId = request.headers.get('X-User-Id')
  if (!userId) return jsonResponse({ error: 'X-User-Id 헤더가 필요합니다.' }, 401)

  if (options?.ensureUserAlways || request.method !== 'GET') {
    await ensureUser(env.DB, userId)
  }

  return { userId }
}

export async function verifyProjectOwnership(
  db: D1Database,
  projectId: string,
  userId: string
): Promise<Response | null> {
  const project = await db.prepare(
    'SELECT id FROM projects WHERE id = ? AND user_id = ?'
  ).bind(projectId, userId).first()
  if (!project) return jsonResponse({ error: '프로젝트를 찾을 수 없습니다.' }, 404)
  return null
}
