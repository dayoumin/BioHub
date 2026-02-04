'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Upload,
  MessageSquare,
  List,
  History,
  Zap,
  ArrowRight,
  TrendingUp,
  GitCompare,
  BarChart3,
  LineChart,
  PieChart,
  Settings2,
  Check,
  LucideIcon
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

interface SmartFlowHubProps {
  /** 데이터 업로드부터 시작 */
  onStartWithData: () => void
  /** AI 대화부터 시작 */
  onStartWithAI: () => void
  /** 방법 직접 선택 */
  onStartWithMethod: () => void
  /** 히스토리에서 재분석 */
  onStartWithHistory: () => void
  /** 빠른 분석 (특정 방법 선택) */
  onQuickAnalysis: (methodId: string) => void
}

// 빠른 분석용 전체 방법 목록 (선택 가능)
interface QuickMethod {
  id: string
  name: string
  icon: LucideIcon
}

const ALL_QUICK_METHODS: QuickMethod[] = [
  { id: 't-test', name: 't-검정', icon: GitCompare },
  { id: 'anova', name: 'ANOVA', icon: BarChart3 },
  { id: 'correlation', name: '상관분석', icon: TrendingUp },
  { id: 'regression', name: '회귀분석', icon: LineChart },
  { id: 'chi-square', name: '카이제곱', icon: PieChart },
  { id: 'paired-t-test', name: '대응표본 t-검정', icon: GitCompare },
  { id: 'mann-whitney', name: 'Mann-Whitney U', icon: BarChart3 },
  { id: 'wilcoxon', name: 'Wilcoxon', icon: BarChart3 },
  { id: 'kruskal-wallis', name: 'Kruskal-Wallis', icon: BarChart3 },
  { id: 'fisher-exact', name: 'Fisher 정확 검정', icon: PieChart },
]

// 기본 빠른 분석 방법 (첫 방문 시)
const DEFAULT_QUICK_METHODS = ['t-test', 'anova', 'correlation', 'regression', 'chi-square']

// LocalStorage 키
const QUICK_METHODS_STORAGE_KEY = 'smart-flow-quick-methods'

// LocalStorage에서 빠른 분석 방법 불러오기
function loadQuickMethods(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_METHODS
  try {
    const saved = localStorage.getItem(QUICK_METHODS_STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_QUICK_METHODS
}

// LocalStorage에 빠른 분석 방법 저장
function saveQuickMethods(methods: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(QUICK_METHODS_STORAGE_KEY, JSON.stringify(methods))
  } catch {
    // ignore
  }
}

/**
 * Smart Flow 허브 페이지
 *
 * 4가지 진입점 + 커스터마이징 가능한 빠른 분석 제공
 */
export function SmartFlowHub({
  onStartWithData,
  onStartWithAI,
  onStartWithMethod,
  onStartWithHistory,
  onQuickAnalysis
}: SmartFlowHubProps) {
  const { analysisHistory } = useSmartFlowStore()

  // 빠른 분석 방법 상태 (LocalStorage 연동)
  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  // 초기 로드
  useEffect(() => {
    setQuickMethods(loadQuickMethods())
  }, [])

  // 편집 다이얼로그 열기
  const handleOpenEdit = () => {
    setEditingMethods([...quickMethods])
    setShowEditDialog(true)
  }

  // 편집 저장
  const handleSaveEdit = () => {
    setQuickMethods(editingMethods)
    saveQuickMethods(editingMethods)
    setShowEditDialog(false)
  }

  // 체크박스 토글
  const handleToggleMethod = (methodId: string) => {
    setEditingMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    )
  }

  // 선택된 빠른 분석 방법들
  const selectedQuickMethods = useMemo(() => {
    return ALL_QUICK_METHODS.filter(m => quickMethods.includes(m.id))
  }, [quickMethods])

  // 히스토리 기반 인기 방법 (사용 빈도)
  const popularFromHistory = useMemo(() => {
    if (analysisHistory.length === 0) return []

    const counts: Record<string, number> = {}
    analysisHistory.forEach(h => {
      if (h.method?.id) {
        counts[h.method.id] = (counts[h.method.id] || 0) + 1
      }
    })

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const method = STATISTICAL_METHODS[id]
        return method ? { ...method, count } : null
      })
      .filter(Boolean)
  }, [analysisHistory])

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* 4가지 진입점 - 컴팩트 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 데이터 업로드 */}
        <Card
          className="cursor-pointer hover:border-primary hover:shadow-md transition-all group"
          onClick={onStartWithData}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div className="font-medium text-sm">데이터 업로드</div>
          </CardContent>
        </Card>

        {/* AI 추천 */}
        <Card
          className="cursor-pointer hover:border-violet-500 hover:shadow-md transition-all group"
          onClick={onStartWithAI}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <MessageSquare className="w-6 h-6 text-violet-500" />
            </div>
            <div className="font-medium text-sm">AI 추천</div>
          </CardContent>
        </Card>

        {/* 방법 선택 */}
        <Card
          className="cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
          onClick={onStartWithMethod}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <List className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="font-medium text-sm">방법 선택</div>
          </CardContent>
        </Card>

        {/* 히스토리 */}
        <Card
          className="cursor-pointer hover:border-amber-500 hover:shadow-md transition-all group relative"
          onClick={onStartWithHistory}
        >
          <CardContent className="p-4 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <History className="w-6 h-6 text-amber-500" />
            </div>
            <div className="font-medium text-sm">히스토리</div>
            {analysisHistory.length > 0 && (
              <Badge
                variant="secondary"
                className="absolute top-2 right-2 text-xs h-5 min-w-5 flex items-center justify-center"
              >
                {analysisHistory.length}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 빠른 분석 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">빠른 분석</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleOpenEdit}
          >
            <Settings2 className="w-3 h-3 mr-1" />
            편집
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedQuickMethods.map((method) => {
            const Icon = method.icon
            return (
              <Button
                key={method.id}
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-1.5"
                onClick={() => onQuickAnalysis(method.id)}
              >
                <Icon className="w-3.5 h-3.5" />
                {method.name}
              </Button>
            )
          })}
          {selectedQuickMethods.length === 0 && (
            <span className="text-sm text-muted-foreground">
              편집을 눌러 빠른 분석 방법을 추가하세요
            </span>
          )}
        </div>

        {/* 히스토리 기반 추천 */}
        {popularFromHistory.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground mr-2">자주 사용:</span>
            {popularFromHistory.map((method) => method && (
              <Button
                key={method.id}
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onQuickAnalysis(method.id)}
              >
                {method.name}
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">
                  {(method as { count?: number }).count}
                </Badge>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 빠른 분석 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>빠른 분석 편집</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 py-4">
            {ALL_QUICK_METHODS.map((method) => (
              <label
                key={method.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={editingMethods.includes(method.id)}
                  onCheckedChange={() => handleToggleMethod(method.id)}
                />
                <method.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{method.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="w-4 h-4 mr-1" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
