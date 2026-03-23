'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { listProjectEntityRefs, removeProjectEntityRef } from '@/lib/research/project-storage'
import { resolveEntities } from '@/lib/research/entity-resolver'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'
import type { ProjectEntityRef } from '@/lib/types/research'
import { ProjectHeader } from './ProjectHeader'
import { EntityBrowser } from './EntityBrowser'
import { getAllHistory } from '@/lib/utils/storage'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import { loadAnalysisHistory } from '@/lib/genetics/analysis-history'
import { toast } from 'sonner'

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

  const [refs, setRefs] = useState<ProjectEntityRef[]>([])
  const [entities, setEntities] = useState<ResolvedEntity[]>([])
  const [loading, setLoading] = useState(true)

  const loadEntities = useCallback(async () => {
    try {
      const projectRefs = listProjectEntityRefs(projectId)
      setRefs(projectRefs)

      if (projectRefs.length === 0) {
        setEntities([])
        return
      }

      // 배치 로드: 각 저장소에서 한 번만 조회
      const hasAnalysis = projectRefs.some(r => r.entityKind === 'analysis')
      const hasFigure = projectRefs.some(r => r.entityKind === 'figure')
      const hasBlast = projectRefs.some(r => r.entityKind === 'blast-result')

      const [analysisHistory, graphProjects, blastHistory] = await Promise.all([
        hasAnalysis ? getAllHistory() : Promise.resolve([]),
        Promise.resolve(hasFigure ? listGraphProjects() : []),
        Promise.resolve(hasBlast ? loadAnalysisHistory() : []),
      ])

      const resolved = resolveEntities(projectRefs, {
        analysisHistory,
        graphProjects,
        blastHistory,
      })

      setEntities(resolved)
    } catch (error) {
      console.error('[ProjectDetail] Failed to load entities', error)
      toast.error('항목 로드에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    refreshProjects()
    loadEntities()
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
    toast.success('연결이 해제되었습니다')
    loadEntities()
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
