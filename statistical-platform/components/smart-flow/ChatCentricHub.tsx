'use client'

/**
 * MainHub - 메인 페이지 허브 (Bento Grid 레이아웃)
 *
 * Features:
 * 1. Bento Grid: 데이터 업로드 (좌측 대형), 방법 선택 + 히스토리 (우측 스택)
 * 2. 빠른 분석 바 (커스터마이징 가능, 그룹별 편집)
 * 3. 하단 검색창 (LLM 있을 때만)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  List,
  History,
  Send,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Settings2,
  ArrowRight,
  Zap,
  Clock,
  X,
  FileSpreadsheet,
  ArrowUpRight
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

// Services & Types
import { ollamaRecommender } from '@/lib/services/ollama-recommender'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { logger } from '@/lib/utils/logger'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { AIRecommendation, StatisticalMethod } from '@/types/smart-flow'

// ===== Types =====

interface ChatCentricHubProps {
  onStartWithData: () => void
  onStartWithBrowse: () => void
  onShowHistory: () => void
  onGoToDetailedAI: () => void
}

// ===== Constants =====

const STORAGE_KEY = 'main-hub-quick-analysis'
const DEFAULT_QUICK_METHODS = ['t-test', 'anova', 'correlation', 'regression', 'chi-square']

// Category labels for grouping
const CATEGORY_LABELS: Record<string, string> = {
  't-test': 'T-검정',
  'anova': '분산분석 (ANOVA)',
  'nonparametric': '비모수 검정',
  'correlation': '상관분석',
  'regression': '회귀분석',
  'chi-square': '범주형 분석',
  'descriptive': '기술통계',
  'timeseries': '시계열분석',
  'survival': '생존분석',
  'pca': '차원축소',
  'clustering': '군집분석',
  'advanced': '고급 분석',
  'design': '실험설계',
  'psychometrics': '심리측정'
}

// Methods grouped by category (for edit dialog)
const METHODS_BY_CATEGORY = Object.entries(STATISTICAL_METHODS).reduce((acc, [id, method]) => {
  if (method.hasOwnPage !== false) {
    const cat = method.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push({
      id,
      name: method.koreanName || method.name,
      description: method.koreanDescription || method.description
    })
  }
  return acc
}, {} as Record<string, Array<{ id: string; name: string; description: string }>>)

// ===== Helper Functions =====

function loadQuickMethods(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_METHODS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
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

function saveQuickMethods(methods: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(methods))
  } catch {
    // ignore
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR')
}

// ===== Component =====

export function ChatCentricHub({
  onStartWithData,
  onStartWithBrowse,
  onShowHistory,
  onGoToDetailedAI
}: ChatCentricHubProps) {
  const prefersReducedMotion = useReducedMotion()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Store
  const { analysisHistory, setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep } = useSmartFlowStore()

  // State
  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  // Search state
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [responseText, setResponseText] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)

  // Check Ollama availability with timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ollamaAvailable === null) {
        setOllamaAvailable(false)
        logger.warn('[MainHub] Ollama check timed out')
      }
    }, 3000) // 3초 타임아웃

    ollamaRecommender.checkHealth().then(available => {
      clearTimeout(timeoutId)
      setOllamaAvailable(available)
      logger.info('[MainHub] Ollama availability:', { available })
    }).catch(() => {
      clearTimeout(timeoutId)
      setOllamaAvailable(false)
    })

    return () => clearTimeout(timeoutId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // 마운트 시 1회만 실행

  // Load quick methods
  useEffect(() => {
    setQuickMethods(loadQuickMethods())
  }, [])

  // Quick method info
  const quickMethodsInfo = useMemo(() => {
    return quickMethods
      .map(id => {
        const method = STATISTICAL_METHODS[id]
        return method ? {
          id,
          name: method.koreanName || method.name,
          description: method.koreanDescription || method.description
        } : null
      })
      .filter(Boolean) as Array<{ id: string; name: string; description: string }>
  }, [quickMethods])

  // Recent history (last 3 for card display)
  const recentHistory = useMemo(() => {
    return analysisHistory.slice(0, 3).map(h => ({
      ...h,
      timeAgo: formatTimeAgo(new Date(h.timestamp))
    }))
  }, [analysisHistory])

  // Handlers
  const handleOpenEdit = useCallback(() => {
    setEditingMethods([...quickMethods])
    setShowEditDialog(true)
  }, [quickMethods])

  const handleSaveEdit = useCallback(() => {
    setQuickMethods(editingMethods)
    saveQuickMethods(editingMethods)
    setShowEditDialog(false)
  }, [editingMethods])

  const handleToggleMethod = useCallback((methodId: string) => {
    setEditingMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    )
  }, [])

  const handleQuickAnalysis = useCallback((methodId: string) => {
    const method = STATISTICAL_METHODS[methodId]
    if (method) {
      setSelectedMethod({
        id: method.id,
        name: method.name,
        description: method.description,
        category: method.category
      })
      setQuickAnalysisMode(true)
      setShowHub(false)
      navigateToStep(1)
    }
  }, [setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep])

  const handleHistorySelect = useCallback((historyItem: typeof analysisHistory[0]) => {
    if (historyItem.method) {
      setSelectedMethod({
        id: historyItem.method.id,
        name: historyItem.method.name,
        description: historyItem.method.description || '',
        category: historyItem.method.category as StatisticalMethod['category']
      })
      setQuickAnalysisMode(true)
      setShowHub(false)
      navigateToStep(1)
    }
  }, [setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep])

  // Search handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  const applyFallback = useCallback(() => {
    const { recommendation: fallbackRec, responseText: fallbackText } =
      ollamaRecommender.keywordBasedRecommend(inputValue)
    setResponseText(fallbackText)
    setRecommendation(fallbackRec)
  }, [inputValue])

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    setIsLoading(true)
    setResponseText(null)
    setRecommendation(null)
    setShowAlternatives(false)

    try {
      // ollamaAvailable은 이미 체크됨 (마운트 시)
      if (!ollamaAvailable) {
        applyFallback()
        return
      }

      const { recommendation: aiRec, responseText: aiText } =
        await ollamaRecommender.recommendFromNaturalLanguage(inputValue, null, null, null)

      if (aiText) setResponseText(aiText)
      if (aiRec) {
        setRecommendation(aiRec)
      } else {
        applyFallback()
      }
    } catch (error) {
      logger.error('[MainHub] Error', { error })
      applyFallback()
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading, ollamaAvailable, applyFallback])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isLoading) {
        handleSubmit()
      }
    }
  }, [inputValue, isLoading, handleSubmit])

  const handleSelectRecommended = useCallback(() => {
    if (!recommendation?.method) return

    setSelectedMethod({
      id: recommendation.method.id,
      name: recommendation.method.name,
      description: recommendation.method.description,
      category: recommendation.method.category
    })
    setQuickAnalysisMode(true)
    setShowHub(false)
    navigateToStep(1)
  }, [recommendation, setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep])

  const handleSelectAlternative = useCallback((alt: NonNullable<AIRecommendation['alternatives']>[number]) => {
    setSelectedMethod({
      id: alt.id,
      name: alt.name,
      description: alt.description || '',
      category: alt.category || 'advanced'
    })
    setQuickAnalysisMode(true)
    setShowHub(false)
    navigateToStep(1)
  }, [setSelectedMethod, setQuickAnalysisMode, setShowHub, navigateToStep])

  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setResponseText(null)
    setRecommendation(null)
    setShowAlternatives(false)
  }, [])

  // Ollama check loading
  if (ollamaAvailable === null) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-5 md:grid-rows-[auto_auto] gap-4 md:gap-5">
        {/* 좌측: 데이터 업로드 (대형 카드) - 2 rows span */}
        <Card
          className={cn(
            "md:col-span-3 md:row-span-2 cursor-pointer group relative overflow-hidden",
            "border-2 border-transparent hover:border-primary/50",
            "bg-gradient-to-br from-background via-background to-primary/5",
            "shadow-lg hover:shadow-xl transition-all duration-300",
            "hover:scale-[1.01]",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          )}
          onClick={onStartWithData}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onStartWithData()}
        >
          {/* Background decoration */}
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <CardContent className="p-8 md:p-10 h-full flex flex-col justify-center relative">
            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center",
                "bg-primary/10 group-hover:bg-primary/20",
                "transition-all duration-300 group-hover:scale-110"
              )}>
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <Badge variant="secondary" className="mb-2">시작하기</Badge>
                <h2 className="text-2xl font-bold">데이터 업로드</h2>
              </div>
            </div>

            <p className="text-muted-foreground mb-6 max-w-md">
              CSV, Excel 파일을 업로드하고 AI 기반 자동 분석을 시작하세요.
              데이터 특성에 맞는 최적의 분석 방법을 추천받을 수 있습니다.
            </p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV, XLSX</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>AI 추천</span>
              </div>
            </div>

            <div className={cn(
              "absolute bottom-6 right-6 w-10 h-10 rounded-full",
              "bg-primary/10 flex items-center justify-center",
              "group-hover:bg-primary group-hover:text-primary-foreground",
              "transition-all duration-300"
            )}>
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* 우측 상단: 방법 선택 */}
        <Card
          className={cn(
            "md:col-span-2 cursor-pointer group relative overflow-hidden",
            "border-2 border-transparent hover:border-emerald-500/50",
            "bg-gradient-to-br from-background to-emerald-500/5",
            "shadow-md hover:shadow-lg transition-all duration-300",
            "hover:scale-[1.02]",
            "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          )}
          onClick={onStartWithBrowse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onStartWithBrowse()}
        >
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                "bg-emerald-500/10 group-hover:bg-emerald-500/20",
                "transition-colors duration-300"
              )}>
                <List className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-bold text-lg mb-1">방법 선택</h3>
              <p className="text-sm text-muted-foreground">
                43개 통계 분석 방법 중 선택
              </p>
            </div>
            <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 mt-4">
              <span>둘러보기</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        {/* 우측 하단: 히스토리 */}
        <Card
          className={cn(
            "md:col-span-2 relative overflow-hidden min-h-[180px]",
            "border-2 border-transparent hover:border-amber-500/50",
            "bg-gradient-to-br from-background to-amber-500/5",
            "shadow-md hover:shadow-lg transition-all duration-300"
          )}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  "bg-amber-500/10"
                )}>
                  <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold">최근 분석</h3>
                  {analysisHistory.length > 0 && (
                    <Badge variant="secondary" className="text-xs mt-0.5">
                      {analysisHistory.length}개
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShowHistory()
                  }}
                >
                  {analysisHistory.length > 3 ? '전체 보기' : '히스토리'}
                </Button>
            </div>

            {recentHistory.length > 0 ? (
              <div className="space-y-2">
                {recentHistory.map((item, index) => (
                  <button
                    key={item.id || index}
                    type="button"
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg",
                      "bg-muted/50 hover:bg-muted",
                      "transition-colors cursor-pointer"
                    )}
                    onClick={() => handleHistorySelect(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {item.method?.name || '알 수 없음'}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {item.timeAgo}
                      </span>
                    </div>
                    {item.dataFileName && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {item.dataFileName}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  아직 분석 기록이 없습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  첫 분석을 시작해보세요!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Analysis Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">빠른 분석</span>
              <span className="text-xs text-muted-foreground">
                자주 사용하는 방법을 바로 시작
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleOpenEdit}
            >
              <Settings2 className="w-3.5 h-3.5" />
              편집
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickMethodsInfo.map((method) => (
              <Button
                key={method.id}
                variant="outline"
                size="sm"
                className="h-8 text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleQuickAnalysis(method.id)}
              >
                {method.name}
              </Button>
            ))}
            {quickMethodsInfo.length === 0 && (
              <span className="text-sm text-muted-foreground">
                편집을 눌러 빠른 분석 방법을 추가하세요
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search Bar (LLM available only) */}
      {ollamaAvailable && (
        <Card className="border shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400" />
              </div>
              <div>
                <p className="font-medium">AI 추천</p>
                <p className="text-xs text-muted-foreground">
                  분석 목적을 설명하면 적절한 방법을 추천해드립니다
                </p>
              </div>
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder='예: "두 그룹의 평균이 다른지 비교하고 싶어요"'
                className="min-h-[60px] resize-none pr-24"
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                {inputValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleClearSearch}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 gap-1"
                  onClick={handleSubmit}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      전송
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* AI Response */}
            <AnimatePresence>
              {recommendation && (
                <motion.div
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* Response Text */}
                  {responseText && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {responseText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="border-2 border-primary/30 bg-primary/5 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{recommendation.method.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {recommendation.method.description}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSelectRecommended} className="gap-1 shrink-0">
                        시작
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Alternatives */}
                    {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-primary/20">
                        <button
                          type="button"
                          onClick={() => setShowAlternatives(!showAlternatives)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <ChevronDown className={cn("w-3 h-3 transition-transform", showAlternatives && "rotate-180")} />
                          다른 선택지 ({recommendation.alternatives.length}개)
                        </button>

                        <AnimatePresence>
                          {showAlternatives && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 space-y-1"
                            >
                              {recommendation.alternatives.map((alt, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors text-sm"
                                  onClick={() => handleSelectAlternative(alt)}
                                >
                                  <span className="font-medium">{alt.name}</span>
                                  {alt.description && (
                                    <span className="text-muted-foreground ml-2 text-xs">
                                      - {alt.description}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Link to detailed AI */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onGoToDetailedAI}
                      className="text-xs text-muted-foreground"
                    >
                      더 자세한 분석이 필요하신가요?
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}

      {/* Quick Analysis Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>빠른 분석 편집</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6 py-4">
              {Object.entries(METHODS_BY_CATEGORY).map(([category, methods]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={editingMethods.includes(method.id)}
                          onCheckedChange={() => handleToggleMethod(method.id)}
                        />
                        <span className="truncate" title={method.name}>
                          {method.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {editingMethods.length}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  취소
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-1" />
                  저장
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default ChatCentricHub
