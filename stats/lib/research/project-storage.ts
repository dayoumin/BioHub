import type { ProjectEntityKind, ProjectEntityRef, ResearchProject } from '@/lib/types/research'

const PROJECTS_KEY = 'research_projects'
const PROJECT_REFS_KEY = 'research_project_entity_refs'

function isClient(): boolean {
  return typeof window !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** localStorage 쓰기. 실패(quota 초과 등) 시 throw */
function writeJson(key: string, value: unknown): void {
  if (!isClient()) {
    throw new Error(`[research-project-storage] ${key} is unavailable outside the browser`)
  }

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[research-project-storage] Failed to write ${key}:`, error)
    throw new Error(`[research-project-storage] Failed to write ${key}`)
  }
}

export function listResearchProjects(): ResearchProject[] {
  return readJson<ResearchProject[]>(PROJECTS_KEY, [])
}

export function loadResearchProject(projectId: string): ResearchProject | null {
  return listResearchProjects().find(project => project.id === projectId) ?? null
}

export function saveResearchProject(project: ResearchProject): void {
  const projects = listResearchProjects()
  const index = projects.findIndex(existing => existing.id === project.id)

  if (index >= 0) {
    projects[index] = project
  } else {
    projects.push(project)
  }

  writeJson(PROJECTS_KEY, projects)
}

export function deleteResearchProject(projectId: string): void {
  const prevProjects = listResearchProjects()
  const prevRefs = listProjectEntityRefs()
  const nextProjects = prevProjects.filter(project => project.id !== projectId)
  const nextRefs = prevRefs.filter(ref => ref.projectId !== projectId)

  writeJson(PROJECTS_KEY, nextProjects)

  try {
    writeJson(PROJECT_REFS_KEY, nextRefs)
  } catch (error) {
    try {
      writeJson(PROJECTS_KEY, prevProjects)
      writeJson(PROJECT_REFS_KEY, prevRefs)
    } catch (rollbackError) {
      console.error('[research-project-storage] Failed to rollback deleteResearchProject:', rollbackError)
    }
    throw error
  }
}

export function generateResearchProjectId(): string {
  return `research_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function listProjectEntityRefs(projectId?: string): ProjectEntityRef[] {
  const refs = readJson<ProjectEntityRef[]>(PROJECT_REFS_KEY, [])
  if (!projectId) return refs
  return refs.filter(ref => ref.projectId === projectId)
}

export function upsertProjectEntityRef(
  input: Omit<ProjectEntityRef, 'id' | 'createdAt' | 'updatedAt'>
): ProjectEntityRef {
  const refs = listProjectEntityRefs()
  const now = new Date().toISOString()
  const index = refs.findIndex(
    ref =>
      ref.projectId === input.projectId &&
      ref.entityKind === input.entityKind &&
      ref.entityId === input.entityId
  )

  if (index >= 0) {
    const updated: ProjectEntityRef = {
      ...refs[index],
      ...input,
      updatedAt: now,
    }
    refs[index] = updated
    writeJson(PROJECT_REFS_KEY, refs)
    return updated
  }

  const created: ProjectEntityRef = {
    id: `pref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...input,
    createdAt: now,
    updatedAt: now,
  }
  refs.push(created)
  writeJson(PROJECT_REFS_KEY, refs)
  return created
}

export function removeProjectEntityRef(
  projectId: string,
  entityKind: ProjectEntityKind,
  entityId: string
): void {
  removeProjectEntityRefs([{ projectId, entityKind, entityId }])
}

/** 여러 entity ref를 한 번의 localStorage 읽기-쓰기로 제거 */
export function removeProjectEntityRefs(
  targets: ReadonlyArray<{ projectId: string; entityKind: ProjectEntityKind; entityId: string }>
): void {
  if (targets.length === 0) return
  const targetSet = new Set(
    targets.map(t => `${t.projectId}|${t.entityKind}|${t.entityId}`)
  )
  const nextRefs = listProjectEntityRefs().filter(
    ref => !targetSet.has(`${ref.projectId}|${ref.entityKind}|${ref.entityId}`)
  )
  writeJson(PROJECT_REFS_KEY, nextRefs)
}
