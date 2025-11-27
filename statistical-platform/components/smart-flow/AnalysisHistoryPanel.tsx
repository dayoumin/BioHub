'use client'

import { useState } from 'react'
import {
  Clock,
  Trash2,
  RotateCcw,
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
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
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

  const handleNewAnalysis = () => {
    reset()
  }

  if (analysisHistory.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">분석 히스토리가 없습니다</h3>
        <p className="text-sm text-muted-foreground mb-4">
          완료된 분석이 자동으로 저장됩니다
        </p>
        <Button variant="outline" size="sm" onClick={handleNewAnalysis}>
          <Plus className="w-4 h-4 mr-1" />
          새 분석 시작
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더 및 검색/필터 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          분석 히스토리 ({analysisHistory.length})
        </h3>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveCurrent}
          >
            현재 분석 저장
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={filterMethod ? 'bg-muted' : ''}>
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>분석 방법 필터</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterMethod(null)}>
                전체 보기
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
            title="전체 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="히스토리 검색..."
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
                      현재
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {item.dataRowCount}행
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    {item.method?.name || '분석 방법 없음'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {item.dataFileName}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {item.purpose || '분석 목적 없음'}
                </p>
                
                {/* 주요 결과 표시 */}
                {item.results && typeof item.results === 'object' && 'pValue' in item.results && (
                  <div className="flex items-center gap-3 text-xs">
                    <span>
                      p-value: <strong className={
                        (typeof item.results.pValue === 'number' && item.results.pValue < 0.05) ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600'
                      }>
                        {typeof item.results.pValue === 'number' ? item.results.pValue.toFixed(4) : 'N/A'}
                      </strong>
                    </span>
                    {'effectSize' in item.results && item.results.effectSize != null && (
                      <span>
                        효과크기: <strong>
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoad(item.id)}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteConfirmId(item.id)
                  }}
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
            <AlertDialogTitle>분석 히스토리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 분석 히스토리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 전체 삭제 확인 다이얼로그 */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 히스토리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              모든 분석 히스토리({analysisHistory.length}개)를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              전체 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 현재 분석 저장 다이얼로그 */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>현재 분석 저장</DialogTitle>
            <DialogDescription>
              현재 분석에 이름을 지정하여 저장합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="save-name">분석 이름</Label>
            <Input
              id="save-name"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="예: 2024년 실험 데이터 t-검정"
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
              취소
            </Button>
            <Button onClick={handleSaveConfirm} disabled={!saveName.trim()}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}