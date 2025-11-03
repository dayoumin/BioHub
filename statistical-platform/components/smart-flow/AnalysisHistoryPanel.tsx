'use client'

import { useState } from 'react'
import { 
  Clock, 
  ChevronRight, 
  Trash2, 
  RotateCcw,
  Database,
  BarChart3,
  FileText,
  Search,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSmartFlowStore, AnalysisHistory } from '@/lib/stores/smart-flow-store'
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
  
  const {
    analysisHistory,
    currentHistoryId,
    loadFromHistory,
    deleteFromHistory,
    clearHistory,
    saveToHistory
  } = useSmartFlowStore()

  // 필터링된 히스토리
  const filteredHistory = analysisHistory.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.method?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterMethod === null || 
      item.method?.id === filterMethod
    
    return matchesSearch && matchesFilter
  })

  // 고유한 분석 방법 추출 (필터용)
  const uniqueMethods = Array.from(
    new Set(analysisHistory.map(h => h.method?.id).filter(Boolean))
  )

  const handleLoad = (historyId: string) => {
    loadFromHistory(historyId)
  }

  const handleDelete = (historyId: string) => {
    deleteFromHistory(historyId)
    setDeleteConfirmId(null)
  }

  const handleSaveCurrent = () => {
    const name = prompt('분석 이름을 입력하세요:')
    if (name) {
      saveToHistory(name)
    }
  }

  if (analysisHistory.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">분석 히스토리가 없습니다</h3>
        <p className="text-sm text-muted-foreground mb-4">
          완료된 분석이 자동으로 저장됩니다
        </p>
        <Button variant="outline" size="sm">
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
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>분석 방법 필터</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterMethod(null)}>
                전체 보기
              </DropdownMenuItem>
              {uniqueMethods.map(methodId => (
                <DropdownMenuItem 
                  key={methodId}
                  onClick={() => setFilterMethod(methodId || null)}
                >
                  {methodId}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => clearHistory()}
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
                {item.results && (
                  <div className="flex items-center gap-3 text-xs">
                    <span>
                      p-value: <strong className={
                        item.results.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'
                      }>
                        {item.results.pValue.toFixed(4)}
                      </strong>
                    </span>
                    {item.results.effectSize && (
                      <span>
                        효과크기: <strong>{item.results.effectSize.toFixed(2)}</strong>
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

      {/* 삭제 확인 다이얼로그 */}
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
    </div>
  )
}