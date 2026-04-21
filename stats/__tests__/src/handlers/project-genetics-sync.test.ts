import { describe, expect, it } from 'vitest'

import { handleGeneticsHistoryApi } from '../../../../src/handlers/genetics-history'
import { handleProjectsApi } from '../../../../src/handlers/projects'

interface MockProjectRow {
  id: string
  user_id: string
  name: string
  description: string | null
  status: string
  primary_domain: string | null
  tags: string | null
  paper_config: string | null
  presentation: string | null
  created_at: string
  updated_at: string
}

interface MockGeneticsHistoryRow {
  id: string
  user_id: string
  entry_type: string
  project_id: string | null
  pinned: number
  created_at: number
  updated_at: number
  payload_json: string
}

interface MockProjectEntityRefRow {
  id: string
  project_id: string
  entity_kind: string
  entity_id: string
  label: string | null
  provenance_edges?: string | null
  created_at: string
  updated_at?: string
}

interface MockDbState {
  users: Set<string>
  projects: MockProjectRow[]
  geneticsHistory: MockGeneticsHistoryRow[]
  projectEntityRefs: MockProjectEntityRefRow[]
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

class MockD1Statement {
  private readonly sql: string
  private params: unknown[] = []

  constructor(
    private readonly db: MockD1Database,
    sql: string,
  ) {
    this.sql = normalizeSql(sql)
  }

  bind(...params: unknown[]): MockD1Statement {
    this.params = params
    return this
  }

  async first<T>(): Promise<T | null> {
    return this.db.first<T>(this.sql, this.params)
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.all<T>(this.sql, this.params) }
  }

  async run(): Promise<{ meta: { changes: number } }> {
    return this.db.run(this.sql, this.params)
  }
}

class MockD1Database {
  constructor(private readonly state: MockDbState) {}

  prepare(sql: string): MockD1Statement {
    return new MockD1Statement(this, sql)
  }

  first<T>(sql: string, params: unknown[]): Promise<T | null> {
    if (sql === 'SELECT id FROM projects WHERE id = ? AND user_id = ?') {
      const [projectId, userId] = params as [string, string]
      const project = this.state.projects.find((row) => row.id === projectId && row.user_id === userId)
      return Promise.resolve(project ? ({ id: project.id } as T) : null)
    }

    if (sql === 'SELECT user_id, project_id, entry_type, updated_at FROM genetics_history WHERE id = ?') {
      const [historyId] = params as [string]
      const row = this.state.geneticsHistory.find((entry) => entry.id === historyId)
      if (!row) {
        return Promise.resolve(null)
      }

      return Promise.resolve({
        user_id: row.user_id,
        project_id: row.project_id,
        entry_type: row.entry_type,
        updated_at: row.updated_at,
      } as T)
    }

    throw new Error(`Unhandled first() SQL: ${sql}`)
  }

  all<T>(sql: string, _params: unknown[]): T[] {
    throw new Error(`Unhandled all() SQL: ${sql}`)
  }

  run(sql: string, params: unknown[]): Promise<{ meta: { changes: number } }> {
    if (sql === 'INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)') {
      const [userId] = params as [string]
      this.state.users.add(userId)
      return Promise.resolve({ meta: { changes: 1 } })
    }

    if (sql.startsWith('INSERT INTO genetics_history (id, user_id, entry_type, project_id, pinned, created_at, updated_at, payload_json) VALUES')) {
      const [
        id,
        userId,
        entryType,
        projectId,
        pinned,
        createdAt,
        updatedAt,
        payloadJson,
      ] = params as [string, string, string, string | null, number, number, number, string]

      const existingIndex = this.state.geneticsHistory.findIndex((row) => row.id === id)
      if (existingIndex >= 0) {
        const existing = this.state.geneticsHistory[existingIndex]
        if (updatedAt < existing.updated_at) {
          return Promise.resolve({ meta: { changes: 0 } })
        }

        this.state.geneticsHistory[existingIndex] = {
          ...existing,
          user_id: userId,
          entry_type: entryType,
          project_id: projectId,
          pinned,
          created_at: createdAt,
          updated_at: updatedAt,
          payload_json: payloadJson,
        }

        return Promise.resolve({ meta: { changes: 1 } })
      }

      this.state.geneticsHistory.push({
        id,
        user_id: userId,
        entry_type: entryType,
        project_id: projectId,
        pinned,
        created_at: createdAt,
        updated_at: updatedAt,
        payload_json: payloadJson,
      })

      return Promise.resolve({ meta: { changes: 1 } })
    }

    if (sql === 'DELETE FROM project_entity_refs WHERE project_id = ? AND entity_kind = ? AND entity_id = ?') {
      const [projectId, entityKind, entityId] = params as [string, string, string]
      const before = this.state.projectEntityRefs.length
      this.state.projectEntityRefs = this.state.projectEntityRefs.filter((row) => !(
        row.project_id === projectId
        && row.entity_kind === entityKind
        && row.entity_id === entityId
      ))

      return Promise.resolve({ meta: { changes: before - this.state.projectEntityRefs.length } })
    }

    if (sql === 'INSERT OR REPLACE INTO project_entity_refs (id, project_id, entity_kind, entity_id, label, provenance_edges, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)') {
      const [
        id,
        projectId,
        entityKind,
        entityId,
        label,
        provenanceEdges,
        createdAt,
        updatedAt,
      ] = params as [string, string, string, string, string | null, string | null, string, string]

      const existingIndex = this.state.projectEntityRefs.findIndex((row) => (
        row.project_id === projectId
        && row.entity_kind === entityKind
        && row.entity_id === entityId
      ))

      const nextRow: MockProjectEntityRefRow = {
        id,
        project_id: projectId,
        entity_kind: entityKind,
        entity_id: entityId,
        label,
        provenance_edges: provenanceEdges,
        created_at: createdAt,
        updated_at: updatedAt,
      }

      if (existingIndex >= 0) {
        this.state.projectEntityRefs[existingIndex] = nextRow
      } else {
        this.state.projectEntityRefs.push(nextRow)
      }

      return Promise.resolve({ meta: { changes: 1 } })
    }

    if (sql.startsWith('UPDATE projects SET ')) {
      const projectId = params[params.length - 2]
      const userId = params[params.length - 1]
      const project = this.state.projects.find((row) => row.id === projectId && row.user_id === userId)
      if (!project) {
        return Promise.resolve({ meta: { changes: 0 } })
      }

      const assignments = sql.slice('UPDATE projects SET '.length, sql.indexOf(' WHERE id = ? AND user_id = ?')).split(', ')
      assignments.forEach((assignment, index) => {
        const column = assignment.replace(' = ?', '')
        const value = params[index]
        switch (column) {
          case 'name':
            project.name = value as string
            break
          case 'description':
            project.description = value as string | null
            break
          case 'status':
            project.status = value as string
            break
          case 'primary_domain':
            project.primary_domain = value as string | null
            break
          case 'tags':
            project.tags = value as string | null
            break
          case 'paper_config':
            project.paper_config = value as string | null
            break
          case 'presentation':
            project.presentation = value as string | null
            break
          case 'updated_at':
            project.updated_at = value as string
            break
          default:
            throw new Error(`Unhandled project assignment: ${column}`)
        }
      })

      return Promise.resolve({ meta: { changes: 1 } })
    }

    throw new Error(`Unhandled run() SQL: ${sql}`)
  }

  getState(): MockDbState {
    return this.state
  }
}

function createProject(id: string, userId: string, name: string): MockProjectRow {
  return {
    id,
    user_id: userId,
    name,
    description: null,
    status: 'active',
    primary_domain: null,
    tags: null,
    paper_config: null,
    presentation: null,
    created_at: '2026-04-10T00:00:00.000Z',
    updated_at: '2026-04-10T00:00:00.000Z',
  }
}

function createEnv(db: MockD1Database): Parameters<typeof handleProjectsApi>[1] {
  return {
    ASSETS: {} as never,
    DB: db as never,
    OPENROUTER_API_KEY: '',
  } as Parameters<typeof handleProjectsApi>[1]
}

function createAuthedRequest(path: string, method: string, body?: unknown): { request: Request; url: URL } {
  const url = new URL(`http://localhost:3000${path}`)
  return {
    url,
    request: new Request(url.toString(), {
      method,
      headers: {
        Origin: 'http://localhost:3000',
        'Content-Type': 'application/json',
        'X-User-Id': 'user-1',
      },
      body: body == null ? undefined : JSON.stringify(body),
    }),
  }
}

describe('server-side project/genetics sync handlers', () => {
  it('ignores stale genetics upserts without rewriting project refs', async () => {
    const db = new MockD1Database({
      users: new Set<string>(),
      projects: [
        createProject('project-a', 'user-1', 'Project A'),
        createProject('project-b', 'user-1', 'Project B'),
        createProject('project-c', 'user-1', 'Project C'),
      ],
      geneticsHistory: [{
        id: 'protein-1',
        user_id: 'user-1',
        entry_type: 'protein',
        project_id: 'project-a',
        pinned: 0,
        created_at: 10,
        updated_at: 200,
        payload_json: JSON.stringify({ id: 'protein-1', type: 'protein', projectId: 'project-a' }),
      }],
      projectEntityRefs: [
        {
          id: 'pref-primary',
          project_id: 'project-a',
          entity_kind: 'protein-result',
          entity_id: 'protein-1',
          label: 'Current report',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
        {
          id: 'pref-secondary',
          project_id: 'project-b',
          entity_kind: 'protein-result',
          entity_id: 'protein-1',
          label: 'Pinned elsewhere',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
      ],
    })

    const { request, url } = createAuthedRequest('/api/history/genetics', 'POST', {
      entry: {
        id: 'protein-1',
        type: 'protein',
        createdAt: 10,
        reportUpdatedAt: 100,
        projectId: 'project-c',
        analysisName: 'Stale protein sync',
      },
    })

    const response = await handleGeneticsHistoryApi(request, createEnv(db), url)
    const body = await response.json()
    const state = db.getState()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, id: 'protein-1', applied: false })
    expect(state.geneticsHistory[0]?.project_id).toBe('project-a')
    expect(state.geneticsHistory[0]?.updated_at).toBe(200)
    expect(state.projectEntityRefs.map((row) => row.project_id).sort()).toEqual(['project-a', 'project-b'])
  })

  it('moves only the primary project ref on fresh genetics upserts', async () => {
    const db = new MockD1Database({
      users: new Set<string>(),
      projects: [
        createProject('project-a', 'user-1', 'Project A'),
        createProject('project-b', 'user-1', 'Project B'),
        createProject('project-c', 'user-1', 'Project C'),
      ],
      geneticsHistory: [{
        id: 'protein-1',
        user_id: 'user-1',
        entry_type: 'protein',
        project_id: 'project-a',
        pinned: 0,
        created_at: 10,
        updated_at: 200,
        payload_json: JSON.stringify({ id: 'protein-1', type: 'protein', projectId: 'project-a' }),
      }],
      projectEntityRefs: [
        {
          id: 'pref-primary',
          project_id: 'project-a',
          entity_kind: 'protein-result',
          entity_id: 'protein-1',
          label: 'Current report',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
        {
          id: 'pref-secondary',
          project_id: 'project-b',
          entity_kind: 'protein-result',
          entity_id: 'protein-1',
          label: 'Pinned elsewhere',
          created_at: '2026-04-10T00:00:00.000Z',
          updated_at: '2026-04-10T00:00:00.000Z',
        },
      ],
    })

    const { request, url } = createAuthedRequest('/api/history/genetics', 'POST', {
      entry: {
        id: 'protein-1',
        type: 'protein',
        createdAt: 10,
        reportUpdatedAt: 300,
        projectId: 'project-c',
        analysisName: 'Fresh protein sync',
      },
    })

    const response = await handleGeneticsHistoryApi(request, createEnv(db), url)
    const body = await response.json()
    const state = db.getState()
    const sortedRefs = [...state.projectEntityRefs].sort((left, right) => left.project_id.localeCompare(right.project_id))

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ ok: true, id: 'protein-1' })
    expect(state.geneticsHistory[0]?.project_id).toBe('project-c')
    expect(state.geneticsHistory[0]?.updated_at).toBe(300)
    expect(sortedRefs.map((row) => row.project_id)).toEqual(['project-b', 'project-c'])
    expect(sortedRefs[1]).toMatchObject({
      project_id: 'project-c',
      entity_kind: 'protein-result',
      entity_id: 'protein-1',
      label: 'Fresh protein sync',
    })
  })

  it('returns 404 when updating a project that does not exist', async () => {
    const db = new MockD1Database({
      users: new Set<string>(),
      projects: [],
      geneticsHistory: [],
      projectEntityRefs: [],
    })

    const { request, url } = createAuthedRequest('/api/projects/missing-project', 'PATCH', {
      name: 'Recovered name',
    })

    const response = await handleProjectsApi(request, createEnv(db), url)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ error: expect.any(String) })
  })

  it('still updates an existing project through PATCH', async () => {
    const db = new MockD1Database({
      users: new Set<string>(),
      projects: [createProject('project-a', 'user-1', 'Project A')],
      geneticsHistory: [],
      projectEntityRefs: [],
    })

    const { request, url } = createAuthedRequest('/api/projects/project-a', 'PATCH', {
      name: 'Renamed project',
    })

    const response = await handleProjectsApi(request, createEnv(db), url)
    const body = await response.json()
    const state = db.getState()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(state.projects[0]?.name).toBe('Renamed project')
  })
})
