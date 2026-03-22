import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ResearchProject } from '@/lib/types/research'
import {
  listResearchProjects,
  loadResearchProject,
  saveResearchProject,
  deleteResearchProject,
  generateResearchProjectId,
} from '@/lib/research/project-storage'
import type { ResearchDomain, ResearchProjectStatus } from '@/lib/types/research'

/**
 * Research Project Store
 *
 * 연구 프로젝트의 전역 컨텍스트를 관리한다.
 * - activeResearchProjectId: 현재 활성 프로젝트 (localStorage persist)
 * - projects: 캐시된 프로젝트 목록 (hydration 시 로드)
 * - CRUD 액션: project-storage.ts에 위임
 *
 * Graph Studio의 currentProjectId(GraphProject)와 별개.
 */

interface CreateProjectInput {
  description?: string
  primaryDomain?: ResearchDomain
  tags?: string[]
  presentation?: { emoji?: string; color?: string }
}

interface UpdateProjectInput {
  name?: string
  description?: string
  status?: ResearchProjectStatus
  primaryDomain?: ResearchDomain
  tags?: string[]
  presentation?: { emoji?: string; color?: string }
}

interface ResearchProjectState {
  activeResearchProjectId: string | null
  projects: ResearchProject[]

  setActiveProject: (projectId: string) => void
  clearActiveProject: () => void
  refreshProjects: () => void
  createProject: (name: string, options?: CreateProjectInput) => ResearchProject
  updateProject: (projectId: string, updates: UpdateProjectInput) => void
  removeProject: (projectId: string) => void
}

export const useResearchProjectStore = create<ResearchProjectState>()(
  persist(
    (set, get) => ({
      activeResearchProjectId: null,
      projects: [],

      setActiveProject: (projectId: string) => {
        const project = loadResearchProject(projectId)
        if (project) {
          set({ activeResearchProjectId: projectId })
        }
      },

      clearActiveProject: () => {
        set({ activeResearchProjectId: null })
      },

      refreshProjects: () => {
        const projects = listResearchProjects()
        const { activeResearchProjectId } = get()

        // 활성 프로젝트가 삭제되었으면 해제
        if (activeResearchProjectId && !projects.some(p => p.id === activeResearchProjectId)) {
          set({ projects, activeResearchProjectId: null })
        } else {
          set({ projects })
        }
      },

      createProject: (name: string, options?: CreateProjectInput) => {
        const now = new Date().toISOString()
        const project: ResearchProject = {
          id: generateResearchProjectId(),
          name: name.trim() || '새 연구 프로젝트',
          description: options?.description,
          status: 'active',
          primaryDomain: options?.primaryDomain,
          tags: options?.tags,
          presentation: options?.presentation,
          createdAt: now,
          updatedAt: now,
        }

        saveResearchProject(project)
        set({ projects: listResearchProjects() })
        return project
      },

      updateProject: (projectId: string, updates: UpdateProjectInput) => {
        const existing = loadResearchProject(projectId)
        if (!existing) return

        const updated: ResearchProject = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        saveResearchProject(updated)
        set({ projects: listResearchProjects() })
      },

      removeProject: (projectId: string) => {
        deleteResearchProject(projectId)

        const { activeResearchProjectId } = get()
        const projects = listResearchProjects()

        if (activeResearchProjectId === projectId) {
          set({ projects, activeResearchProjectId: null })
        } else {
          set({ projects })
        }
      },
    }),
    {
      name: 'biohub_research_project',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeResearchProjectId: state.activeResearchProjectId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.projects = listResearchProjects()
        }
      },
    }
  )
)

/** 현재 활성 프로젝트의 전체 데이터를 반환하는 셀렉터 */
export function selectActiveProject(state: ResearchProjectState): ResearchProject | null {
  if (!state.activeResearchProjectId) return null
  return state.projects.find(p => p.id === state.activeResearchProjectId) ?? null
}
