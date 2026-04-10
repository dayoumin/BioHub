import type { ProjectEntityRef, ResearchProject } from '@/lib/types/research'
import { getClientDeviceId } from '@/lib/utils/client-device-id'

const PROJECTS_API = '/api/projects'
const ENTITIES_LINK_API = '/api/entities/link'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function buildHeaders(includeJson = false): HeadersInit {
  const headers: Record<string, string> = {
    'X-User-Id': getClientDeviceId(),
  }
  if (includeJson) headers['Content-Type'] = 'application/json'
  return headers
}

function parseJsonField<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || !value) return undefined
  try {
    return JSON.parse(value) as T
  } catch {
    return undefined
  }
}

function normalizeProject(raw: unknown): ResearchProject | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null

  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : undefined,
    status: row.status === 'archived' ? 'archived' : 'active',
    primaryDomain: typeof row.primary_domain === 'string' ? row.primary_domain as ResearchProject['primaryDomain'] : undefined,
    tags: Array.isArray(row.tags) ? row.tags as string[] : parseJsonField<string[]>(row.tags),
    paperConfig: typeof row.paper_config === 'object' && row.paper_config !== null
      ? row.paper_config as ResearchProject['paperConfig']
      : parseJsonField<ResearchProject['paperConfig']>(row.paper_config),
    presentation: typeof row.presentation === 'object' && row.presentation !== null
      ? row.presentation as ResearchProject['presentation']
      : parseJsonField<ResearchProject['presentation']>(row.presentation),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
  }
}

function normalizeEntityRef(raw: unknown): ProjectEntityRef | null {
  if (typeof raw !== 'object' || raw === null) return null
  const row = raw as Record<string, unknown>
  if (
    typeof row.id !== 'string'
    || typeof row.project_id !== 'string'
    || typeof row.entity_kind !== 'string'
    || typeof row.entity_id !== 'string'
    || typeof row.created_at !== 'string'
  ) {
    return null
  }

  return {
    id: row.id,
    projectId: row.project_id,
    entityKind: row.entity_kind as ProjectEntityRef['entityKind'],
    entityId: row.entity_id,
    label: typeof row.label === 'string' ? row.label : undefined,
    order: typeof row.sort_order === 'number' ? row.sort_order : undefined,
    createdAt: row.created_at,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : undefined,
  }
}

export async function listCloudResearchProjects(): Promise<ResearchProject[]> {
  if (!isBrowser()) return []

  const res = await fetch(PROJECTS_API, {
    method: 'GET',
    headers: buildHeaders(),
  })
  if (!res.ok) {
    throw new Error(`failed to load projects (${res.status})`)
  }

  const data = await res.json() as { projects?: unknown[] }
  return Array.isArray(data.projects)
    ? data.projects.map(normalizeProject).filter((project): project is ResearchProject => project !== null)
    : []
}

export async function fetchCloudProjectDetail(projectId: string): Promise<{ project: ResearchProject | null; entities: ProjectEntityRef[] }> {
  if (!isBrowser()) return { project: null, entities: [] }

  const res = await fetch(`${PROJECTS_API}/${encodeURIComponent(projectId)}`, {
    method: 'GET',
    headers: buildHeaders(),
  })
  if (!res.ok) {
    throw new Error(`failed to load project detail (${res.status})`)
  }

  const data = await res.json() as { project?: unknown; entities?: unknown[] }
  return {
    project: normalizeProject(data.project ?? null),
    entities: Array.isArray(data.entities)
      ? data.entities.map(normalizeEntityRef).filter((entity): entity is ProjectEntityRef => entity !== null)
      : [],
  }
}

export async function upsertCloudResearchProject(project: ResearchProject, isCreate: boolean): Promise<void> {
  if (!isBrowser()) return

  const body = {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    primaryDomain: project.primaryDomain,
    tags: project.tags,
    paperConfig: project.paperConfig,
    presentation: project.presentation,
  }

  const res = await fetch(isCreate ? PROJECTS_API : `${PROJECTS_API}/${encodeURIComponent(project.id)}`, {
    method: isCreate ? 'POST' : 'PATCH',
    headers: buildHeaders(true),
    body: JSON.stringify(isCreate ? body : body),
  })

  if (!res.ok) {
    throw new Error(`failed to save project (${res.status})`)
  }
}

export async function deleteCloudResearchProject(projectId: string): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(`${PROJECTS_API}/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`failed to delete project (${res.status})`)
  }
}

export async function linkCloudProjectEntityRef(ref: Omit<ProjectEntityRef, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(ENTITIES_LINK_API, {
    method: 'POST',
    headers: buildHeaders(true),
    body: JSON.stringify(ref),
  })
  if (!res.ok) {
    throw new Error(`failed to link project entity (${res.status})`)
  }
}

export async function unlinkCloudProjectEntityRef(input: { projectId: string; entityKind: ProjectEntityRef['entityKind']; entityId: string }): Promise<void> {
  if (!isBrowser()) return

  const res = await fetch(ENTITIES_LINK_API, {
    method: 'DELETE',
    headers: buildHeaders(true),
    body: JSON.stringify(input),
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`failed to unlink project entity (${res.status})`)
  }
}
