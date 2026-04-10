'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { hydrateProjectRefsFromCloud, hydrateResearchProjectsFromCloud, listProjectEntityRefs, loadEntityHistories, removeProjectEntityRef, resolveEntities } from '@/lib/research'
import type { ResolvedEntity } from '@/lib/research'
import { ProjectHeader } from './ProjectHeader'
import { EntityBrowser } from './EntityBrowser'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'

interface ProjectDetailContentProps {
  projectId: string
}

export function ProjectDetailContent({ projectId }: ProjectDetailContentProps): React.ReactElement {
  const router = useRouter()
  const projects = useResearchProjectStore(s => s.projects)
  const refreshProjects = useResearchProjectStore(s => s.refreshProjects)

  const project = useMemo(
    () => projects.find(p => p.id === projectId) ?? null,
    [projects, projectId],
  )

  const [entities, setEntities] = useState<ResolvedEntity[]>([])
  const [loading, setLoading] = useState(true)

  const loadEntities = useCallback(async (refreshFromCloud = true) => {
    try {
      if (refreshFromCloud) {
        await hydrateProjectRefsFromCloud(projectId)
      }
      const projectRefs = listProjectEntityRefs(projectId)

      if (projectRefs.length === 0) {
        setEntities([])
        return
      }

      const options = await loadEntityHistories(projectRefs)
      const resolved = resolveEntities(projectRefs, options)

      setEntities(resolved)
    } catch (error) {
      console.error('[ProjectDetail] Failed to load entities', error)
      toast.error(TOAST.project.entityLoadError)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refreshProjects()
    void hydrateResearchProjectsFromCloud().finally(() => {
      refreshProjects()
      void loadEntities()
    })
  }, [refreshProjects, loadEntities])

  const handleBack = useCallback(() => {
    router.push('/projects')
  }, [router])

  const handleNavigate = useCallback((url: string) => {
    router.push(url)
  }, [router])

  const handleUnlink = useCallback((entity: ResolvedEntity) => {
    if (!window.confirm(`'${entity.summary.title}'의 연결을 해제하시겠습니까? 원본 데이터는 유지됩니다.`)) {
      return
    }
    removeProjectEntityRef(
      entity.ref.projectId,
      entity.ref.entityKind,
      entity.ref.entityId,
    )
    setEntities(current =>
      current.filter(item =>
        !(
          item.ref.projectId === entity.ref.projectId
          && item.ref.entityKind === entity.ref.entityKind
          && item.ref.entityId === entity.ref.entityId
        )
      )
    )
    toast.success(TOAST.project.unlinked)
    void loadEntities(false)
  }, [loadEntities])

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {!project ? (
        <p className="text-sm text-muted-foreground">프로젝트를 찾을 수 없습니다.</p>
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded mt-6" />
          <div className="space-y-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 w-full bg-muted rounded" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <ProjectHeader
            project={project}
            totalCount={entities.filter(e => e.loaded).length}
            onBack={handleBack}
          />
          <EntityBrowser
            entities={entities}
            projectId={projectId}
            projectName={project.name}
            onNavigate={handleNavigate}
            onUnlink={handleUnlink}
          />
        </>
      )}
    </div>
  )
}
