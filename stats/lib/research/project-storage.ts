import type { ProjectEntityKind, ProjectEntityRef, ResearchProject } from '@/lib/types/research'
import { generateId } from '@/lib/utils/generate-id'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'

import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const PROJECTS_KEY = STORAGE_KEYS.research.projects
const PROJECT_REFS_KEY = STORAGE_KEYS.research.projectEntityRefs

const { readJson, writeJson } = createLocalStorageIO('[research-project-storage]')

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

export const generateResearchProjectId = (): string => generateId('research')

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
    id: generateId('pref'),
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

export function removeProjectEntityRefsByEntityIds(
  entityKind: ProjectEntityKind,
  entityIds: string[]
): void {
  if (entityIds.length === 0) return
  const idSet = new Set(entityIds)
  const nextRefs = listProjectEntityRefs().filter(
    ref => !(ref.entityKind === entityKind && idSet.has(ref.entityId))
  )
  writeJson(PROJECT_REFS_KEY, nextRefs)
}
