/**
 * 엔티티 연결 핸들러 (분석 결과 ↔ 프로젝트)
 *
 * POST   /api/entities/link   — 엔티티를 프로젝트에 연결
 * DELETE /api/entities/link   — 연결 해제
 * POST   /api/entities/blast  — BLAST 결과 저장 + 프로젝트 연결
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, authenticateRequest, verifyProjectOwnership } from '../lib/worker-utils'

export async function handleEntitiesApi(
  request: Request,
  env: WorkerEnv,
  url: URL
): Promise<Response> {
  const auth = await authenticateRequest(request, env, url, { ensureUserAlways: true })
  if (auth instanceof Response) return auth
  const { userId } = auth

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

async function handleLinkEntity(db: D1Database, userId: string, request: Request): Promise<Response> {
  const body = await parseJsonBody<{
    projectId?: string
    entityKind?: string
    entityId?: string
    label?: string
    provenanceEdges?: unknown
  }>(request)
  if (body instanceof Response) return body

  if (!body.projectId || !body.entityKind || !body.entityId) {
    return jsonResponse({ error: 'projectId, entityKind, entityId 필수' }, 400)
  }

  const projectErr = await verifyProjectOwnership(db, body.projectId, userId)
  if (projectErr) return projectErr

  const ts = Date.now()
  const now = new Date(ts).toISOString()
  const id = `pref_${ts}_${Math.random().toString(36).slice(2, 8)}`

  await db.prepare(
    `INSERT OR REPLACE INTO project_entity_refs
     (id, project_id, entity_kind, entity_id, label, provenance_edges, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.projectId,
    body.entityKind,
    body.entityId,
    body.label || null,
    body.provenanceEdges ? JSON.stringify(body.provenanceEdges) : null,
    now,
    now,
  ).run()

  return jsonResponse({ id }, 201)
}

async function handleUnlinkEntity(db: D1Database, userId: string, request: Request): Promise<Response> {
  const body = await parseJsonBody<{ projectId?: string; entityKind?: string; entityId?: string }>(request)
  if (body instanceof Response) return body

  if (!body.projectId || !body.entityKind || !body.entityId) {
    return jsonResponse({ error: 'projectId, entityKind, entityId 필수' }, 400)
  }

  const projectErr = await verifyProjectOwnership(db, body.projectId, userId)
  if (projectErr) return projectErr

  await db.prepare(
    'DELETE FROM project_entity_refs WHERE project_id = ? AND entity_kind = ? AND entity_id = ?'
  ).bind(body.projectId, body.entityKind, body.entityId).run()

  return jsonResponse({ ok: true }, 200)
}

async function handleSaveBlastResult(
  db: D1Database,
  userId: string,
  request: Request
): Promise<Response> {
  const body = await parseJsonBody<{
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
  }>(request)
  if (body instanceof Response) return body

  if (!body.sequenceHash || !body.marker || !body.status || !body.topHits) {
    return jsonResponse({ error: 'sequenceHash, marker, status, topHits 필수' }, 400)
  }

  if (body.projectId) {
    const projectErr = await verifyProjectOwnership(db, body.projectId, userId)
    if (projectErr) return projectErr
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

  if (body.projectId) {
    const refId = `pref_${now}_${Math.random().toString(36).slice(2, 8)}`
    await db.prepare(
      `INSERT OR REPLACE INTO project_entity_refs (id, project_id, entity_kind, entity_id, created_at)
       VALUES (?, ?, 'blast-result', ?, ?)`
    ).bind(refId, body.projectId, id, now).run()
  }

  return jsonResponse({ id }, 201)
}
