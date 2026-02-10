'use client'

import { useState } from 'react'
import {
  Clock,
  Trash2,
  RotateCcw,
  RefreshCw,
  Eye,
  Database,
  BarChart3,
  FileText,
  Search,
  Filter,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { startNewAnalysis } from '@/lib/services/data-management'
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

export function AnalysisHistoryPanel() {
  const t = useTerminology()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMethod, setFilterMethod] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  
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

  // 필터링된 히스토리
  const filteredHistory = analysisHistory.filter(item => {
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
  }

  // 같은 방법으로 새 데이터 분석 (재분석 모드)
  const handleReanalyze = async (historyId: string) => {
    await loadSettingsFromHistory(historyId)
  }

  const handleDelete = async (historyId: string) => {
    await deleteFromHistory(historyId)
    setDeleteConfirmId(null)
  }

  const handleClearAll = async () => {
    await clearHistory()
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
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{t.history.recordCount(analysisHistory.length)}</span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveCurrent}
          >
            {t.history.buttons.saveCurrent}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={filterMethod ? 'bg-muted' : ''}>
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t.history.labels.filterByMethod}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterMethod(null)}>
                {t.history.labels.showAll}
              </DropdownMenuItem>
              {uniqueMethods.map(method => (
                <DropdownMenuItem
                  key={method.id}
                  onClick={() => setFilterMethod(method.id)}
                >
                  {method.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            title={t.history.buttons.clearAll}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative">
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
            className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
              currentHistoryId === item.id ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1" onClick={() => handleLoad(item.id)}>
                <div className="flex items-center gap-2 mb-1">
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
                {/* 저장된 결과 보기 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLoad(item.id)
                  }}
                  title={t.history.tooltips.viewResults}
                >
                  <Eye className="w-4 h-4" />
                </Button>

                {/* 같은 방법으로 새 데이터 분석 */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReanalyze(item.id)
                  }}
                  title={t.history.tooltips.reanalyze}
                  className="text-primary hover:text-primary"
                >
                  <RefreshCw className="w-4 h-4" />
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
    </div>
  )
}