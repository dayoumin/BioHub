import type { ProjectEntityKind, ProjectEntityRef, ResearchProject } from '@/lib/types/research'
import { generateId } from '@/lib/utils/generate-id'
import { createLocalStorageIO } from '@/lib/utils/local-storage-factory'
import {
  deleteCloudResearchProject,
  fetchCloudProjectDetail,
  linkCloudProjectEntityRef,
  listCloudResearchProjects,
  unlinkCloudProjectEntityRef,
  upsertCloudResearchProject,
} from './project-cloud'

import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

const PROJECTS_KEY = STORAGE_KEYS.research.projects
const PROJECT_REFS_KEY = STORAGE_KEYS.research.projectEntityRefs

const { readJson, writeJson } = createLocalStorageIO('[research-project-storage]')
let lastProjectsHydrateAt = 0
const PROJECTS_HYDRATE_TTL_MS = 30_000
const pendingEntityUnlinks = new Set<string>()

function parseIsoTimestamp(value: string | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function projectEntityRefKey(input: {
  projectId: string
  entityKind: ProjectEntityKind
  entityId: string
}): string {
  return `${input.projectId}|${input.entityKind}|${input.entityId}`
}

function projectFreshness(project: ResearchProject): number {
  return Math.max(parseIsoTimestamp(project.updatedAt), parseIsoTimestamp(project.createdAt))
}

function projectRefFreshness(ref: ProjectEntityRef): number {
  return Math.max(parseIsoTimestamp(ref.updatedAt), parseIsoTimestamp(ref.createdAt))
}

function pickNewerProject(local: ResearchProject, remote: ResearchProject): ResearchProject {
  return projectFreshness(local) > projectFreshness(remote) ? local : remote
}

function pickNewerProjectRef(local: ProjectEntityRef, remote: ProjectEntityRef): ProjectEntityRef {
  return projectRefFreshness(local) > projectRefFreshness(remote) ? local : remote
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
  const isCreate = index < 0

  if (index >= 0) {
    projects[index] = project
  } else {
    projects.push(project)
  }

  writeJson(PROJECTS_KEY, projects)
  void upsertCloudResearchProject(project, isCreate).catch((error) => {
    console.warn('[research-project-storage] cloud project save failed:', error)
  })
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

  void deleteCloudResearchProject(projectId).catch((error) => {
    console.warn('[research-project-storage] cloud project delete failed:', error)
  })
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
    pendingEntityUnlinks.delete(projectEntityRefKey(input))
    void linkCloudProjectEntityRef(input).catch((error) => {
      console.warn('[research-project-storage] cloud entity link failed:', error)
    })
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
  pendingEntityUnlinks.delete(projectEntityRefKey(input))
  void linkCloudProjectEntityRef(input).catch((error) => {
    console.warn('[research-project-storage] cloud entity link failed:', error)
  })
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
  for (const target of targets) {
    const key = projectEntityRefKey(target)
    pendingEntityUnlinks.add(key)
    void unlinkCloudProjectEntityRef(target).catch((error) => {
      pendingEntityUnlinks.delete(key)
      console.warn('[research-project-storage] cloud entity unlink failed:', error)
    }).then(() => {
      pendingEntityUnlinks.delete(key)
    })
  }
}

export function removeProjectEntityRefsByEntityIds(
  entityKind: ProjectEntityKind,
  entityIds: string[]
): void {
  if (entityIds.length === 0) return
  const idSet = new Set(entityIds)
  const existingRefs = listProjectEntityRefs()
  const removedRefs = existingRefs.filter(
    ref => ref.entityKind === entityKind && idSet.has(ref.entityId)
  )
  const nextRefs = existingRefs.filter(
    ref => !(ref.entityKind === entityKind && idSet.has(ref.entityId))
  )
  writeJson(PROJECT_REFS_KEY, nextRefs)
  for (const ref of removedRefs) {
    const key = projectEntityRefKey(ref)
    pendingEntityUnlinks.add(key)
    void unlinkCloudProjectEntityRef({
      projectId: ref.projectId,
      entityKind: ref.entityKind,
      entityId: ref.entityId,
    }).catch((error) => {
      pendingEntityUnlinks.delete(key)
      console.warn('[research-project-storage] cloud entity unlink failed:', error)
    }).then(() => {
      pendingEntityUnlinks.delete(key)
    })
  }
}

function mergeProjects(local: ResearchProject[], remote: ResearchProject[]): ResearchProject[] {
  const merged = new Map<string, ResearchProject>()
  for (const project of remote) {
    merged.set(project.id, project)
  }
  for (const project of local) {
    const existing = merged.get(project.id)
    merged.set(project.id, existing ? pickNewerProject(project, existing) : project)
  }
  return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

function mergeProjectEntityRefs(projectId: string, refs: ProjectEntityRef[]): void {
  const existing = listProjectEntityRefs()
  const remaining = existing.filter((ref) => ref.projectId !== projectId)
  const localProjectRefs = existing.filter((ref) => ref.projectId === projectId)
  const merged = new Map<string, ProjectEntityRef>()

  for (const ref of refs) {
    const key = projectEntityRefKey(ref)
    if (!pendingEntityUnlinks.has(key)) {
      merged.set(key, ref)
    }
  }

  for (const ref of localProjectRefs) {
    const key = projectEntityRefKey(ref)
    if (pendingEntityUnlinks.has(key)) {
      continue
    }
    const existingRef = merged.get(key)
    merged.set(key, existingRef ? pickNewerProjectRef(ref, existingRef) : ref)
  }

  writeJson(PROJECT_REFS_KEY, [...remaining, ...merged.values()])
}

export async function hydrateResearchProjectsFromCloud(force = false): Promise<ResearchProject[]> {
  if (typeof window === 'undefined') return []
  if (!force && Date.now() - lastProjectsHydrateAt < PROJECTS_HYDRATE_TTL_MS) {
    return listResearchProjects()
  }

  const remote = await listCloudResearchProjects()
  const merged = mergeProjects(listResearchProjects(), remote)
  writeJson(PROJECTS_KEY, merged)
  lastProjectsHydrateAt = Date.now()
  return merged
}

export async function hydrateProjectRefsFromCloud(projectId: string): Promise<ProjectEntityRef[]> {
  if (typeof window === 'undefined') return []

  const { project, entities } = await fetchCloudProjectDetail(projectId)
  if (project) {
    const projects = mergeProjects(listResearchProjects(), [project])
    writeJson(PROJECTS_KEY, projects)
  }
  mergeProjectEntityRefs(projectId, entities)
  return entities
}
