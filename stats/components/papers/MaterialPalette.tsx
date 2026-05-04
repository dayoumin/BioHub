'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, BookOpen, FileText, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  type ResearchProjectEntityRefsChangedDetail,
  listProjectEntityRefs,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} from '@/lib/research/project-storage'
import {
  type GraphProjectsChangedDetail,
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects as listGraphProjects,
} from '@/lib/graph-studio/project-storage'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import type { CitationRecord } from '@/lib/research/citation-types'
import { buildCitationString } from '@/lib/research/citation-apa-formatter'
import { cn } from '@/lib/utils'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'

interface MaterialPaletteProps {
  projectId: string
  onInsertAnalysis: (record: HistoryRecord) => void
  onInsertFigure: (graph: GraphProject) => void
  citations: CitationRecord[]
  onDeleteCitation: (id: string) => void
}

export default function MaterialPalette({
  projectId,
  onInsertAnalysis,
  onInsertFigure,
  citations,
  onDeleteCitation,
}: MaterialPaletteProps): React.ReactElement {
  const { analysisHistory } = useHistoryStore()
  const [projectAnalyses, setProjectAnalyses] = useState<HistoryRecord[]>([])
  const [projectGraphs, setProjectGraphs] = useState<GraphProject[]>([])

  const refreshMaterials = useCallback((): void => {
    const refs = listProjectEntityRefs(projectId)
    const analysisIds = new Set(
      refs.filter(r => r.entityKind === 'analysis').map(r => r.entityId),
    )
    const figureIds = new Set(
      refs.filter(r => r.entityKind === 'figure').map(r => r.entityId),
    )

    setProjectAnalyses(analysisHistory.filter(h => analysisIds.has(h.id)) as unknown as HistoryRecord[])
    setProjectGraphs(listGraphProjects().filter(g => figureIds.has(g.id)))
  }, [projectId, analysisHistory])

  useEffect(() => {
    refreshMaterials()
  }, [refreshMaterials])

  useEffect((): (() => void) => {
    const isCurrentProjectEntityRefChange = (event: Event): boolean => {
      if (!(event instanceof CustomEvent)) return true
      const detail = event.detail as ResearchProjectEntityRefsChangedDetail | undefined
      return detail?.projectIds.includes(projectId) ?? true
    }

    const isCurrentProjectGraphChange = (event: Event): boolean => {
      if (!(event instanceof CustomEvent)) return true
      const detail = event.detail as GraphProjectsChangedDetail | undefined
      const figureIds = new Set(
        listProjectEntityRefs(projectId)
          .filter(ref => ref.entityKind === 'figure')
          .map(ref => ref.entityId),
      )
      return detail?.projectIds.some((graphId: string) => figureIds.has(graphId)) ?? true
    }

    const handleRefsChange = (event: Event): void => {
      if (!isCurrentProjectEntityRefChange(event)) return
      refreshMaterials()
    }

    const handleGraphProjectsChange = (event: Event): void => {
      if (!isCurrentProjectGraphChange(event)) return
      refreshMaterials()
    }

    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEYS.graphStudio.projects) return
      refreshMaterials()
    }

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefsChange)
    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectsChange)
    window.addEventListener('storage', handleStorage)

    return (): void => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleRefsChange)
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleGraphProjectsChange)
      window.removeEventListener('storage', handleStorage)
    }
  }, [projectId, refreshMaterials])

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">재료</h3>

      {/* 분석 결과 */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <FileText className="w-3 h-3" />
          분석 ({projectAnalyses.length})
        </p>
        {projectAnalyses.length === 0 && (
          <p className="text-xs text-muted-foreground/60 py-2">
            프로젝트에 연결된 분석이 없습니다.{' '}
            <Link href="/" className="text-primary hover:underline">분석 실행하기</Link>
          </p>
        )}
        {projectAnalyses.map(record => (
          <button
            key={record.id}
            type="button"
            onClick={() => onInsertAnalysis(record)}
            className={cn(
              'flex items-center gap-2 w-full p-2 rounded-md text-left',
              'hover:bg-surface-container-high transition-colors text-xs',
            )}
          >
            <div className="min-w-0 flex-1 truncate">
              {record.method?.name ?? record.name}
            </div>
            <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* 그래프 */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <BarChart3 className="w-3 h-3" />
          그래프 ({projectGraphs.length})
        </p>
        {projectGraphs.length === 0 && (
          <p className="text-xs text-muted-foreground/60 py-2">프로젝트에 연결된 그래프가 없습니다</p>
        )}
        {projectGraphs.map(graph => (
          <button
            key={graph.id}
            type="button"
            onClick={() => onInsertFigure(graph)}
            className={cn(
              'flex items-center gap-2 w-full p-2 rounded-md text-left',
              'hover:bg-surface-container-high transition-colors text-xs',
            )}
          >
            <div className="min-w-0 flex-1 truncate">{graph.name}</div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {graph.chartSpec?.chartType ?? 'chart'}
            </Badge>
            <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* 문헌 인용 */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <BookOpen className="w-3 h-3" />
          문헌 ({citations.length})
        </p>
        {citations.length === 0 && (
          <p className="text-xs text-muted-foreground/60 py-2">
            저장된 인용이 없습니다.{' '}
            <a
              href={`/papers?tab=literature&project=${projectId}`}
              className="text-primary hover:underline"
            >
              문헌 검색에서 추가
            </a>
          </p>
        )}
        {citations.map(record => (
          <div key={record.id} className="flex items-start gap-1 group">
            <div
              className="flex-1 text-xs px-2 py-1.5 truncate"
              title={buildCitationString(record.item)}
            >
              <span className="font-medium">
                {record.item.authors[0] ?? '저자 미상'}
                {record.item.year ? ` (${record.item.year})` : ''}
              </span>
              <span className="text-muted-foreground ml-1 truncate">
                {record.item.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDeleteCitation(record.id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive"
              title="삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {citations.length > 0 && (
          <a
            href={`/papers?tab=literature&project=${projectId}`}
            className="text-xs text-primary hover:underline flex items-center gap-1 pt-1"
          >
            <Plus className="w-3 h-3" /> 더 추가
          </a>
        )}
      </div>
    </div>
  )
}
