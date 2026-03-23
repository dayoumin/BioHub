'use client'

import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { GripVertical, Copy, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'
import { buildReport, reportToMarkdown, copyReportToClipboard, downloadReportAsHtml } from '@/lib/research/report-export'
import { toast } from 'sonner'
import { proseBase } from '@/components/common/card-styles'

const ReactMarkdown = lazy(() => import('react-markdown'))

interface ReportComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entities: ResolvedEntity[]
  projectId: string
  projectName: string
}

export function ReportComposer({
  open,
  onOpenChange,
  entities,
  projectId,
  projectName,
}: ReportComposerProps): React.ReactElement {
  const [title, setTitle] = useState(`${projectName} 보고서`)
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [preview, setPreview] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  // 다이얼로그 열릴 때 선택된 entities로 동기화
  useEffect(() => {
    if (open) {
      setOrderedIds(entities.map(e => e.ref.id))
      setTitle(`${projectName} 보고서`)
      setPreview(false)
    }
  }, [open, entities, projectName])

  // 순서대로 entity 정렬
  const orderedEntities = useMemo(() => {
    const map = new Map(entities.map(e => [e.ref.id, e]))
    return orderedIds
      .map(id => map.get(id))
      .filter((e): e is ResolvedEntity => e != null)
  }, [entities, orderedIds])

  const report = useMemo(
    () => buildReport(title, projectId, orderedEntities),
    [title, projectId, orderedEntities],
  )

  const markdownPreview = useMemo(
    () => preview ? reportToMarkdown(report) : '',
    [preview, report],
  )

  const handleCopy = useCallback(async () => {
    try {
      await copyReportToClipboard(report)
      toast.success('마크다운이 클립보드에 복사되었습니다')
    } catch {
      toast.error('클립보드 복사에 실패했습니다')
    }
  }, [report])

  const handleDownloadHtml = useCallback(() => {
    downloadReportAsHtml(report)
    toast.success('HTML 파일이 다운로드되었습니다')
  }, [report])

  // 드래그 정렬 (간단한 swap 방식)
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return

    setOrderedIds(prev => {
      const next = [...prev]
      const [removed] = next.splice(dragIndex, 1)
      next.splice(index, 0, removed)
      return next
    })
    setDragIndex(index)
  }, [dragIndex])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>보고서 만들기</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* 제목 */}
          <div>
            <label htmlFor="report-title" className="mb-1 block text-sm font-medium">
              보고서 제목
            </label>
            <Input
              id="report-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* 순서 조정 */}
          <div>
            <p className="mb-2 text-sm font-medium">
              포함 항목 ({orderedEntities.length}개) — 드래그로 순서 변경
            </p>
            <div className="space-y-1">
              {orderedEntities.map((entity, index) => (
                <div
                  key={entity.ref.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={e => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-move transition-colors ${
                    dragIndex === index ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-base shrink-0">
                    {entity.summary.kindIcon ?? '📎'}
                  </span>
                  <span className="truncate">{entity.summary.title}</span>
                  {entity.summary.badge && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entity.summary.badge.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          {preview && (
            <div className={`rounded border bg-muted/30 p-4 ${proseBase}`}>
              <Suspense fallback={<p className="text-sm text-muted-foreground">로딩 중...</p>}>
                <ReactMarkdown>{markdownPreview}</ReactMarkdown>
              </Suspense>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreview(p => !p)}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {preview ? '미리보기 닫기' : '미리보기'}
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            클립보드 복사
          </Button>
          <Button size="sm" onClick={handleDownloadHtml}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            HTML 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
