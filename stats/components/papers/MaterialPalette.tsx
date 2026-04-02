'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useHistoryStore } from '@/lib/stores/history-store'
import { listProjectEntityRefs } from '@/lib/research/project-storage'
import { listProjects as listGraphProjects } from '@/lib/graph-studio/project-storage'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { GraphProject } from '@/types/graph-studio'
import { cn } from '@/lib/utils'

interface MaterialPaletteProps {
  projectId: string
  onInsertAnalysis: (record: HistoryRecord) => void
  onInsertFigure: (graph: GraphProject) => void
}

export default function MaterialPalette({
  projectId,
  onInsertAnalysis,
  onInsertFigure,
}: MaterialPaletteProps): React.ReactElement {
  const { analysisHistory } = useHistoryStore()
  const [projectAnalyses, setProjectAnalyses] = useState<HistoryRecord[]>([])
  const [projectGraphs, setProjectGraphs] = useState<GraphProject[]>([])

  useEffect(() => {
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
              'hover:bg-muted/50 transition-colors text-xs',
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
              'hover:bg-muted/50 transition-colors text-xs',
            )}
          >
            <div className="min-w-0 flex-1 truncate">{graph.name}</div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {graph.chartSpec?.chartType ?? 'chart'}
            </Badge>
            <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  )
}
