/**
 * Genetics History 동기화 핸들러
 *
 * GET    /api/history/genetics       — 히스토리 목록
 * POST   /api/history/genetics       — 히스토리 upsert
 * PATCH  /api/history/genetics/:id/pin — 핀 토글
 * DELETE /api/history/genetics/:id   — 히스토리 삭제
 */

import type { WorkerEnv } from '../lib/worker-utils'
import { jsonResponse, parseJsonBody, authenticateRequest, verifyProjectOwnership } from '../lib/worker-utils'

type GeneticsHistoryType =
  | 'barcoding'
  | 'blast'
  | 'genbank'
  | 'seq-stats'
  | 'similarity'
  | 'phylogeny'
  | 'bold'
  | 'translation'
  | 'protein'

function isGeneticsHistoryType(value: unknown): value is GeneticsHistoryType {
  return value === 'barcoding' || value === 'blast' || value === 'genbank'
    || value === 'seq-stats' || value === 'similarity' || value === 'phylogeny'
    || value === 'bold' || value === 'translation' || value === 'protein'
}

function entityKindForGeneticsType(type: GeneticsHistoryType): string {
  switch (type) {
    case 'genbank': return 'sequence-data'
    case 'seq-stats': return 'seq-stats-result'
    case 'similarity': return 'similarity-result'
    case 'phylogeny': return 'phylogeny-result'
    case 'bold': return 'bold-result'
    case 'translation': return 'translation-result'
    case 'protein': return 'protein-result'
    default: return 'blast-result'
  }
}

function labelForGeneticsEntry(entry: Record<string, unknown>, type: GeneticsHistoryType): string | null {
  if (type === 'barcoding') {
    return typeof entry.sampleName === 'string' ? entry.sampleName : null
  }
  if (type === 'blast') {
    const program = typeof entry.program === 'string' ? entry.program : ''
    const database = typeof entry.database === 'string' ? entry.database : ''
    if (!program && !database) return null
    return [program, database].filter(Boolean).join(' · ')
  }
  if (type === 'translation' || type === 'protein') {
    return typeof entry.analysisName === 'string' ? entry.analysisName : null
  }
  return typeof entry.accession === 'string' ? entry.accession : null
}

export async function handleGeneticsHistoryApi(
  request: Request,
  env: WorkerEnv,
  url: URL
): Promise<Response> {
  const auth = await authenticateRequest(request, env, url)
  if (auth instanceof Response) return auth
  const { userId } = auth

  const subPath = url.pathname.replace(/^\/api\/history\/genetics/, '') || '/'
  const pinMatch = subPath.match(/^\/([^/]+)\/pin$/)
  const idMatch = subPath.match(/^\/([^/]+)$/)

  if (subPath === '/' && request.method === 'GET') {
    return handleListGeneticsHistory(env.DB, userId, url)
  }

  if (subPath === '/' && request.method === 'POST') {
    return handleUpsertGeneticsHistory(env.DB, userId, request)
  }

  if (pinMatch && request.method === 'PATCH') {
    return handlePatchGeneticsHistoryPin(env.DB, userId, decodeURIComponent(pinMatch[1]), request)
  }

  if (idMatch && request.method === 'DELETE') {
    return handleDeleteGeneticsHistory(env.DB, userId, decodeURIComponent(idMatch[1]))
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

async function handleListGeneticsHistory(
  db: D1Database,
  userId: string,
  url: URL
): Promise<Response> {
  const type = url.searchParams.get('type')
  if (type && !isGeneticsHistoryType(type)) {
    return jsonResponse({ error: '지원하지 않는 genetics history type입니다.' }, 400)
  }

  const query = type
    ? db.prepare(
      `SELECT payload_json
       FROM genetics_history
       WHERE user_id = ? AND entry_type = ?
       ORDER BY pinned DESC, created_at DESC
       LIMIT 200`
    ).bind(userId, type)
    : db.prepare(
      `SELECT payload_json
       FROM genetics_history
       WHERE user_id = ?
       ORDER BY pinned DESC, created_at DESC
       LIMIT 200`
    ).bind(userId)

  const result = await query.all<{ payload_json: string }>()
  const entries = result.results.flatMap((row) => {
    try {
      return [JSON.parse(row.payload_json)]
    } catch {
      return []
    }
  })

  return jsonResponse({ entries }, 200)
}

async function handleUpsertGeneticsHistory(
  db: D1Database,
  userId: string,
  request: Request
): Promise<Response> {
  const body = await parseJsonBody<Record<string, unknown>>(request)
  if (body instanceof Response) return body

  const rawEntry = (body.entry && typeof body.entry === 'object')
    ? body.entry as Record<string, unknown>
    : body

  const id = typeof rawEntry.id === 'string' ? rawEntry.id : null
  const type = rawEntry.type
  const createdAt = typeof rawEntry.createdAt === 'number' ? rawEntry.createdAt : null
  const projectId = typeof rawEntry.projectId === 'string' ? rawEntry.projectId : null
  const pinned = rawEntry.pinned === true
  const clientUpdatedAt = typeof rawEntry.reportUpdatedAt === 'number'
    ? rawEntry.reportUpdatedAt
    : createdAt

  if (!id || !isGeneticsHistoryType(type) || createdAt == null) {
    return jsonResponse({ error: 'id, type, createdAt이 필요합니다.' }, 400)
  }

  if (projectId) {
    const projectErr = await verifyProjectOwnership(db, projectId, userId)
    if (projectErr) return projectErr
  }

  const existing = await db.prepare(
    'SELECT user_id, project_id, entry_type FROM genetics_history WHERE id = ?'
  ).bind(id).first<{ user_id: string; project_id: string | null; entry_type: string }>()

  if (existing && existing.user_id !== userId) {
    return jsonResponse({ error: '같은 id를 가진 genetics history가 이미 존재합니다.' }, 409)
  }

  const payloadJson = JSON.stringify(rawEntry)

  await db.prepare(
    `INSERT INTO genetics_history
     (id, user_id, entry_type, project_id, pinned, created_at, updated_at, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       entry_type = excluded.entry_type,
       project_id = excluded.project_id,
       pinned = excluded.pinned,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       payload_json = excluded.payload_json
     WHERE excluded.updated_at >= genetics_history.updated_at`
  ).bind(
    id,
    userId,
    type,
    projectId,
    pinned ? 1 : 0,
    createdAt,
    clientUpdatedAt,
    payloadJson,
  ).run()

  await db.prepare(
    'DELETE FROM project_entity_refs WHERE entity_id = ?'
  ).bind(id).run()

  if (projectId) {
    const refId = `pref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()
    await db.prepare(
      `INSERT INTO project_entity_refs
       (id, project_id, entity_kind, entity_id, label, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      refId,
      projectId,
      entityKindForGeneticsType(type),
      id,
      labelForGeneticsEntry(rawEntry, type),
      nowIso,
      nowIso,
    ).run()
  }

  return jsonResponse({ ok: true, id }, 200)
}

async function handlePatchGeneticsHistoryPin(
  db: D1Database,
  userId: string,
  historyId: string,
  request: Request
): Promise<Response> {
  const body = await parseJsonBody<{ pinned?: boolean }>(request)
  if (body instanceof Response) return body

  if (typeof body.pinned !== 'boolean') {
    return jsonResponse({ error: 'pinned(boolean) 필수' }, 400)
  }

  const existing = await db.prepare(
    'SELECT payload_json FROM genetics_history WHERE id = ? AND user_id = ?'
  ).bind(historyId, userId).first<{ payload_json: string }>()

  if (!existing) {
    return jsonResponse({ error: '히스토리를 찾을 수 없습니다.' }, 404)
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(existing.payload_json) as Record<string, unknown>
  } catch {
    return jsonResponse({ error: '저장된 히스토리 payload가 손상되었습니다.' }, 500)
  }

  payload.pinned = body.pinned
  const payloadJson = JSON.stringify(payload)

  await db.prepare(
    `UPDATE genetics_history
     SET pinned = ?, payload_json = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`
  ).bind(body.pinned ? 1 : 0, payloadJson, Date.now(), historyId, userId).run()

  return jsonResponse({ ok: true }, 200)
}

async function handleDeleteGeneticsHistory(
  db: D1Database,
  userId: string,
  historyId: string
): Promise<Response> {
  const existing = await db.prepare(
    'SELECT project_id, entry_type FROM genetics_history WHERE id = ? AND user_id = ?'
  ).bind(historyId, userId).first<{ project_id: string | null; entry_type: string }>()

  const result = await db.prepare(
    'DELETE FROM genetics_history WHERE id = ? AND user_id = ?'
  ).bind(historyId, userId).run()

  if (result.meta.changes === 0) {
    return jsonResponse({ error: '히스토리를 찾을 수 없습니다.' }, 404)
  }

  if (existing?.project_id && isGeneticsHistoryType(existing.entry_type)) {
    await db.prepare(
      'DELETE FROM project_entity_refs WHERE project_id = ? AND entity_kind = ? AND entity_id = ?'
    ).bind(existing.project_id, entityKindForGeneticsType(existing.entry_type), historyId).run()
  }

  return jsonResponse({ ok: true }, 200)
}
