'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Clock,
  Trash2,
  RefreshCw,
  Eye,
  Database,
  BarChart3,
  FileText,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { AnalysisHistory } from '@/lib/stores/smart-flow-store'
import { startNewAnalysis } from '@/lib/services/data-management'
import type { AnalysisResult } from '@/types/smart-flow'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useTerminology } from '@/hooks/use-terminology'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { ExportService } from '@/lib/services/export/export-service'
import { convertToStatisticalResult } from '@/lib/statistics/result-converter'
import type { ExportContentOptions, ExportContext, ExportFormat } from '@/lib/services/export/export-types'
import { toast } from 'sonner'
import {
  usePinnedHistoryIds,
  MAX_PINNED,
} from '@/lib/utils/pinned-history-storage'

export interface AnalysisHistoryPanelProps {
  onClose?: () => void
}

export function AnalysisHistoryPanel({ onClose }: AnalysisHistoryPanelProps) {
  const t = useTerminology()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportTargetItem, setExportTargetItem] = useState<AnalysisHistory | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('docx')
  const [exportOptions, setExportOptions] = useState<ExportContentOptions>({
    includeInterpretation: true,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const providerLabel: Record<string, string> = {
    openrouter: 'AI 추천',
    ollama: 'AI 추천',
    keyword: '키워드 매칭',
  }

  const {
    analysisHistory,
    currentHistoryId,
    loadFromHistory,
    loadSettingsFromHistory,
    deleteFromHistory,
    clearHistory,
    saveToHistory,
    reset
  } = useSmartFlowStore()

  // 삭제된 히스토리 ID가 pinnedIds에 남아있으면 정리 (방어적 백업)
  useEffect(() => {
    const validIds = new Set(analysisHistory.map(h => h.id))
    setPinnedIds(prev => {
      const cleaned = prev.filter(id => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds])

  const handleTogglePin = useCallback((historyId: string) => {
    setPinnedIds(prev => {
      if (prev.includes(historyId)) {
        return prev.filter(id => id !== historyId)
      }
      if (prev.length >= MAX_PINNED) {
        toast.info(t.history.tooltips.maxPinned(MAX_PINNED))
        return prev
      }
      return [...prev, historyId]
    })
  }, [setPinnedIds, t])

  // 필터링된 히스토리 (pinned 우선 정렬)
  const filteredHistory = useMemo(() => {
    const filtered = analysisHistory.filter(item => {
      const methodName = item.method?.name ?? ''
      const methodId = item.method?.id ?? ''

      const matchesSearch = searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
        methodName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesFilter = filterMethod === null ||
        methodId === filterMethod

      return matchesSearch && matchesFilter
    })

    const pinnedSet = new Set(pinnedIds)
    return [
      ...filtered.filter(h => pinnedSet.has(h.id)),
      ...filtered.filter(h => !pinnedSet.has(h.id)),
    ]
  }, [analysisHistory, searchQuery, filterMethod, pinnedIds])

  // 고유한 분석 방법 추출 (필터용) - id와 name 매핑
  const uniqueMethods = analysisHistory
    .filter(h => h.method?.id)
    .reduce((acc, h) => {
      if (h.method?.id && !acc.find(m => m.id === h.method?.id)) {
        acc.push({ id: h.method.id, name: h.method.name || h.method.id })
      }
      return acc
    }, [] as Array<{ id: string; name: string }>)

  const handleLoad = async (historyId: string) => {
    await loadFromHistory(historyId)
    onClose?.()
  }

  // 같은 방법으로 새 데이터 분석 (재분석 모드)
  const handleReanalyze = async (historyId: string) => {
    await loadSettingsFromHistory(historyId)
    onClose?.()
  }

  const handleDelete = useCallback(async (historyId: string) => {
    await deleteFromHistory(historyId)
    // pinnedIds에서도 즉시 제거 (functional updater로 stale closure 방지)
    setPinnedIds(prev => {
      if (!prev.includes(historyId)) return prev
      return prev.filter(id => id !== historyId)
    })
    setDeleteConfirmId(null)
  }, [deleteFromHistory, setPinnedIds])

  const handleClearAll = async () => {
    await clearHistory()
    setPinnedIds([])
    setShowClearConfirm(false)
  }

  const handleSaveCurrent = () => {
    setSaveName('')
    setShowSaveDialog(true)
  }

  const handleSaveConfirm = async () => {
    if (saveName.trim()) {
      await saveToHistory(saveName.trim())
      setShowSaveDialog(false)
      setSaveName('')
    }
  }

  const handleNewAnalysis = async () => {
    try {
      await startNewAnalysis()
    } catch (error) {
      console.error('Failed to start new analysis:', error)
      // Fallback to basic reset
      reset()
    }
  }

  const handleExport = async (
    item: AnalysisHistory,
    format: ExportFormat = 'docx',
    optionsOverride?: ExportContentOptions,
  ) => {
    try {
      if (!item.results) {
        toast.error('분석 결과가 없습니다.')
        return
      }

      const effectiveOptions: ExportContentOptions = {
        includeInterpretation: true,
        includeRawData: false, // 히스토리에는 원본 데이터 미저장
        includeMethodology: false,
        includeReferences: false,
        ...(optionsOverride ?? {}),
      }

      const safeGetString = (value: unknown): string | null => {
        if (typeof value !== 'string') return null
        const trimmed = value.trim()
        return trimmed.length > 0 ? trimmed : null
      }

      const resultRecord = typeof item.results === 'object' && item.results !== null
        ? item.results as Record<string, unknown>
        : null
      const recoveredAiInterpretation =
        safeGetString(item.aiInterpretation) ??
        safeGetString(resultRecord?.aiInterpretation)
      const recoveredApaFormat =
        safeGetString(item.apaFormat) ??
        safeGetString(resultRecord?.apaFormat)

      // 1. StatisticalResult 변환
      // 히스토리 아이템에는 uploadedData가 없을 수 있으므로 메타데이터에서 일부 정보 복원 시도
      const statisticalResult = convertToStatisticalResult(item.results as unknown as AnalysisResult, {
        sampleSize: item.dataRowCount,
        timestamp: new Date(item.timestamp)
      })

      // 2. ExportContext 생성
      const analysisResult = item.results as unknown as AnalysisResult
      const context: ExportContext = {
        analysisResult,
        statisticalResult,
        aiInterpretation: recoveredAiInterpretation,
        apaFormat: recoveredApaFormat,
        exportOptions: effectiveOptions,
        dataInfo: {
          fileName: item.dataFileName,
          totalRows: item.dataRowCount,
          columnCount: 0, // 정보 없음 (선택적)
          variables: []
        },
        rawDataRows: null,
      }

      toast.info(`${format.toUpperCase()} 보고서를 생성하고 있습니다...`)

      // 3. 내보내기
      const result = await ExportService.export(context, format)

      if (result.success) {
        toast.success('보고서가 다운로드되었습니다.', {
          description: result.fileName
        })

      } else {
        toast.error('보고서 생성 실패', {
          description: result.error
        })
      }
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('내보내기 중 오류가 발생했습니다.')
    }
  }

  const openExportDialog = (item: AnalysisHistory) => {
    setExportTargetItem(item)
    setExportFormat('docx')
    setExportDialogOpen(true)
  }

  const handleExportConfirm = async () => {
    if (!exportTargetItem) return
    setExportDialogOpen(false)
    await handleExport(exportTargetItem, exportFormat, exportOptions)
  }

  if (analysisHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{t.history.empty.title}</p>
        <p className="text-xs mt-1">{t.history.empty.description}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 액션 버튼 (헤더는 Sheet에서 표시) */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">분석 기록</h3>
      </div>

      {/* 검색 바 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder={t.history.labels.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* 히스토리 목록 */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredHistory.map((item) => (
          <Card
            key={item.id}
            className={cn(
              "p-4 hover:shadow-md transition-shadow cursor-pointer border",
              currentHistoryId === item.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 bg-card"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1" onClick={() => handleLoad(item.id)}>
                <div className="flex items-center gap-2 mb-1">
                  {pinnedIds.includes(item.id) && (
                    <Pin className="w-3 h-3 text-primary shrink-0" />
                  )}
                  <h4 className="font-medium">{item.name}</h4>
                  {currentHistoryId === item.id && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {t.history.labels.current}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {item.dataRowCount} {t.history.labels.rows}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {item.method?.name || t.history.labels.noMethod}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {item.dataFileName}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {item.purpose || t.history.labels.noPurpose}
                </p>

                {/* AI 추천 맥락 */}
                {item.aiRecommendation && item.aiRecommendation.userQuery && (
                  <div className="mt-2 pt-2 border-t text-xs">
                    <p className="italic text-muted-foreground line-clamp-1 mb-1">
                      "{item.aiRecommendation.userQuery}"
                    </p>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px]">
                        {providerLabel[item.aiRecommendation.provider] ?? item.aiRecommendation.provider}
                      </span>
                      {item.aiRecommendation.provider !== 'keyword' && (
                        <span>{Math.round(item.aiRecommendation.confidence * 100)}% 확신</span>
                      )}
                      {item.aiRecommendation.reasoning.length > 0 && (
                        <button
                          className="ml-auto hover:text-foreground transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id) }}
                        >
                          {expandedItems.has(item.id)
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                    {expandedItems.has(item.id) && (
                      <ul className="mt-1.5 space-y-0.5 text-muted-foreground pl-1">
                        {item.aiRecommendation.reasoning.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* 주요 결과 표시 */}
                {item.results && typeof item.results === 'object' && 'pValue' in item.results && (
                  <div className="flex items-center gap-3 text-xs">
                    <span>
                      {t.history.labels.pValue} <strong className={
                        (typeof item.results.pValue === 'number' && item.results.pValue < 0.05) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600'
                      }>
                        {typeof item.results.pValue === 'number' ? item.results.pValue.toFixed(4) : 'N/A'}
                      </strong>
                    </span>
                    {'effectSize' in item.results && item.results.effectSize != null && (
                      <span>
                        {t.history.labels.effectSize} <strong>
                          {typeof item.results.effectSize === 'number'
                            ? item.results.effectSize.toFixed(2)
                            : typeof item.results.effectSize === 'object' && 'value' in item.results.effectSize
                              ? (item.results.effectSize as { value: number }).value.toFixed(2)
                              : 'N/A'}
                        </strong>
                      </span>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(item.timestamp), {
                    addSuffix: true,
                    locale: ko
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1 ml-2">
                {/* 상단 고정 토글 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTogglePin(item.id)
                  }}
                  title={pinnedIds.includes(item.id) ? t.history.tooltips.unpin : t.history.tooltips.pin}
                  className={pinnedIds.includes(item.id) ? 'text-primary hover:text-primary' : ''}
                >
                  {pinnedIds.includes(item.id) ? (
                    <PinOff className="w-4 h-4" />
                  ) : (
                    <Pin className="w-4 h-4" />
                  )}
                </Button>

                {/* 삭제 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteConfirmId(item.id)
                  }}
                  title={t.history.tooltips.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {/* 더보기: 보기, 내보내기, 재분석 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleLoad(item.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      {t.history.tooltips.viewResults}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReanalyze(item.id)}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t.history.tooltips.reanalyze}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => openExportDialog(item)}>
                      <Download className="w-4 h-4 mr-2" />
                      {t.history.tooltips.exportReport}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 개별 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.history.dialogs.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.history.dialogs.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.history.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              {t.history.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 전체 삭제 확인 다이얼로그 */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.history.dialogs.clearTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.history.dialogs.clearDescription(analysisHistory.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.history.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.history.buttons.clearAll}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 현재 분석 저장 다이얼로그 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.history.dialogs.saveTitle}</DialogTitle>
            <DialogDescription>
              {t.history.dialogs.saveDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="save-name">{t.history.dialogs.analysisName}</Label>
            <Input
              id="save-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t.history.dialogs.savePlaceholder}
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && saveName.trim()) {
                  handleSaveConfirm()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              {t.history.buttons.cancel}
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!saveName.trim()}>
              {t.history.buttons.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={exportDialogOpen}
        onOpenChange={(open) => {
          setExportDialogOpen(open)
          if (!open) setExportTargetItem(null)
        }}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>히스토리 내보내기 옵션</DialogTitle>
            <DialogDescription>
              저장된 분석 기록에서 보고서를 생성합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>파일 형식</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as ExportFormat)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="docx" id="history-export-docx" />
                  <Label htmlFor="history-export-docx">Word (.docx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="xlsx" id="history-export-xlsx" />
                  <Label htmlFor="history-export-xlsx">Excel (.xlsx)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="html" id="history-export-html" />
                  <Label htmlFor="history-export-html">HTML (.html)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>포함 내용</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history-opt-interpretation"
                    checked={!!exportOptions.includeInterpretation}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeInterpretation: !!checked }))}
                  />
                  <Label htmlFor="history-opt-interpretation">결과 해석</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history-opt-methodology"
                    checked={!!exportOptions.includeMethodology}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeMethodology: !!checked }))}
                  />
                  <Label htmlFor="history-opt-methodology">분석 방법론</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history-opt-references"
                    checked={!!exportOptions.includeReferences}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeReferences: !!checked }))}
                  />
                  <Label htmlFor="history-opt-references">참고문헌</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="history-opt-raw-data"
                    checked={false}
                    disabled
                  />
                  <Label htmlFor="history-opt-raw-data" className="text-muted-foreground">
                    원본 데이터 (히스토리에는 저장되지 않아 미지원)
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleExportConfirm}>
              내보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
