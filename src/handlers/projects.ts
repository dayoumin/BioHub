/**
 * 프로젝트 CRUD 핸들러
 *
 * GET    /api/projects       — 목록
 * POST   /api/projects       — 생성
 * GET    /api/projects/:id   — 상세 (엔티티 포함)
 * PATCH  /api/projects/:id   — 수정
 * DELETE /api/projects/:id   — 삭제 (CASCADE)
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, authenticateRequest } from '../lib/worker-utils'

export async function handleProjectsApi(
  request: Request,
  env: WorkerEnv,
  url: URL
): Promise<Response> {
  const auth = await authenticateRequest(request, env, url)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const subPath = url.pathname.replace(/^\/api\/projects/, '') || '/'
  const idMatch = subPath.match(/^\/([a-zA-Z0-9_-]+)$/)

  if (subPath === '/' && request.method === 'GET') {
    return handleListProjects(env.DB, userId)
  }

  if (subPath === '/' && request.method === 'POST') {
    return handleCreateProject(env.DB, userId, request)
  }

  if (idMatch) {
    const projectId = idMatch[1]

    if (request.method === 'GET') {
      return handleGetProject(env.DB, userId, projectId)
    }

    if (request.method === 'PATCH') {
      return handleUpdateProject(env.DB, userId, projectId, request)
    }

    if (request.method === 'DELETE') {
      return handleDeleteProject(env.DB, userId, projectId)
    }
  }

  return jsonResponse({ error: 'Not found' }, 404)
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
  const body = await parseJsonBody<{ name?: string; description?: string; primaryDomain?: string; tags?: string[] }>(request)
  if (body instanceof Response) return body

  if (!body.name?.trim()) {
    return jsonResponse({ error: '프로젝트 이름이 필요합니다.' }, 400)
  }

  const ts = Date.now()
  const now = new Date(ts).toISOString()
  const id = `proj_${ts}_${Math.random().toString(36).slice(2, 8)}`

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
  const body = await parseJsonBody<Record<string, unknown>>(request)
  if (body instanceof Response) return body

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
  values.push(new Date().toISOString())
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
