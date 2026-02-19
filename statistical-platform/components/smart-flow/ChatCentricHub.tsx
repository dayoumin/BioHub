'use client'

/**
 * ChatCentricHub - Main Hub (Premium Scientific Design)
 *
 * Design: "Precision Instrument" aesthetic
 * - Engineering grid background with gradient depth
 * - Refined normal distribution SVG with gradient fill
 * - Premium typographic hierarchy with intentional spacing
 * - Smooth staggered entrance animations (expo-out easing)
 *
 * Functional entry points (preserved):
 * 1. Data upload (primary CTA)
 * 2. Method browse (card)
 * 3. AI recommendation (card + search)
 * 4. Recent analysis history (card)
 * 5. Quick analysis bar (customizable pills)
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  List,
  Send,
  Sparkles,
  Loader2,
  Check,
  Settings2,
  ArrowRight,
  Zap,
  X,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'

import { AnalysisHistoryPanel } from './AnalysisHistoryPanel'

// UI Components
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { llmRecommender } from '@/lib/services/llm-recommender'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { logger } from '@/lib/utils/logger'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import type { AIRecommendation } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

// ===== Types =====

interface ChatCentricHubProps {
  onStartWithData: () => void
  onStartWithBrowse: () => void
  onGoToDetailedAI: () => void
}

// ===== Constants =====

const STORAGE_KEY = 'main-hub-quick-analysis'
const DEFAULT_QUICK_METHODS = ['t-test', 'anova', 'correlation', 'regression', 'chi-square']

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

// ===== Animation Variants =====

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }
  }
}

// ===== SVG Decorations =====

function StatisticalHeroVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 300"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="curveGrad" x1="300" y1="50" x2="300" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="strokeGrad" x1="0" y1="150" x2="600" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="ciGrad" x1="300" y1="100" x2="300" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Baseline */}
      <line x1="50" y1="250" x2="550" y2="250" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />

      {/* Grid-like vertical lines */}
      {[150, 250, 350, 450].map((x) => (
        <line
          key={x}
          x1={x} y1="80" x2={x} y2="250"
          stroke="currentColor"
          strokeOpacity="0.1"
          strokeDasharray="4 4"
        />
      ))}

      {/* Confidence Interval Band (95% CI) */}
      <path
        d="M 180,195 L 220,145 L 260,95 L 300,80 L 340,105 L 380,155 L 420,205 L 420,235 L 380,185 L 340,135 L 300,110 L 260,125 L 220,175 L 180,225 Z"
        fill="url(#ciGrad)"
        opacity="0.3"
      />

      {/* The Main Distribution Curve */}
      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        fill="url(#curveGrad)"
      />

      {/* Critical Regions (p < 0.05 tails) */}
      <path
        d="M 50,250 C 70,249 90,245 110,235 L 110,250 Z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M 550,250 C 530,249 510,245 490,235 L 490,250 Z"
        fill="currentColor"
        opacity="0.15"
      />

      <path
        d="M 50,250 C 100,248 150,230 200,180 C 250,130 275,80 300,80 C 325,80 350,130 400,180 C 450,230 500,248 550,250"
        stroke="url(#strokeGrad)"
        strokeWidth="2.5"
        filter="url(#glow)"
      />

      {/* Scatter Points (Data Points) */}
      <g fill="currentColor">
        {[
          { x: 180, y: 210, o: 0.6 }, { x: 220, y: 160, o: 0.7 },
          { x: 260, y: 110, o: 0.8 }, { x: 300, y: 95, o: 1.0 },
          { x: 340, y: 120, o: 0.8 }, { x: 380, y: 170, o: 0.7 },
          { x: 420, y: 220, o: 0.6 },
          { x: 280, y: 130, o: 0.5 }, { x: 320, y: 140, o: 0.5 },
          { x: 240, y: 190, o: 0.4 }, { x: 360, y: 200, o: 0.4 }
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" opacity={p.o} />
        ))}
      </g>

      {/* Trendline */}
      <path
        d="M 180,210 L 220,160 L 260,110 L 300,95 L 340,120 L 380,170 L 420,220"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="1.8"
        strokeDasharray="3 3"
      />

      {/* Statistical Formulas & Labels */}
      <g fill="currentColor" opacity="0.7" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '13px', fontWeight: 'bold' }}>
        <text x="70" y="75" className="select-none">y = β₀ + β₁x + ε</text>
        <text x="410" y="60" className="select-none">σ² = Σ(X-μ)²/N</text>
        <text x="500" y="240" fontSize="10" opacity="0.4" className="select-none">α=0.05</text>
        <text x="60" y="240" fontSize="10" opacity="0.4" className="select-none">p-value</text>
      </g>
    </svg>
  )
}

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

function formatTimeAgo(date: Date, lang: string = 'ko'): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return lang === 'ko' ? '방금 전' : 'Just now'

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return lang === 'ko' ? `${diffInMinutes}분 전` : `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return lang === 'ko' ? `${diffInHours}시간 전` : `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return lang === 'ko' ? `${diffInDays}일 전` : `${diffInDays}d ago`

  return date.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US')
}

// Category count for display
const TOTAL_METHODS = Object.values(STATISTICAL_METHODS).filter(m => m.hasOwnPage !== false).length
const TOTAL_CATEGORIES = Object.keys(METHODS_BY_CATEGORY).length

// ===== Component =====

export function ChatCentricHub({
  onStartWithData,
  onStartWithBrowse,
  onGoToDetailedAI
}: ChatCentricHubProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Store
  const {
    analysisHistory,
    setSelectedMethod,
    setQuickAnalysisMode,
    setShowHub,
    navigateToStep,
    loadFromHistory,
    deleteFromHistory
  } = useSmartFlowStore()

  // State
  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  // Search state
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [responseText, setResponseText] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<AIRecommendation | null>(null)


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

  // Recent history
  const recentHistory = useMemo(() => {
    return analysisHistory.slice(0, 6).map(h => ({
      ...h,
      timeAgo: formatTimeAgo(new Date(h.timestamp), 'ko')
    }))
  }, [analysisHistory])

  // === Handlers ===

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

  // Search handlers
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    setIsLoading(true)
    setResponseText(null)
    setRecommendation(null)

    try {
      const { recommendation: aiRec, responseText: aiText } =
        await llmRecommender.recommendFromNaturalLanguage(inputValue, null, null, null)

      if (aiText) setResponseText(aiText)
      if (aiRec) {
        setRecommendation(aiRec)
      }
    } catch (error) {
      logger.error('[MainHub] Error', { error })
      setResponseText('추천에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, isLoading])


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

  const handleClearSearch = useCallback(() => {
    setInputValue('')
    setResponseText(null)
    setRecommendation(null)
  }, [])

  // History handlers
  const handleHistorySelect = useCallback(async (historyId: string) => {
    try {
      await loadFromHistory(historyId)
      setShowHub(false)
      // loadFromHistory sets currentStep to MAX_STEPS (Results)
    } catch (err) {
      logger.error('Failed to load history', err)
    }
  }, [loadFromHistory, setShowHub])

  const handleHistoryDelete = useCallback(async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('이 기록을 삭제하시겠습니까?')) {
      await deleteFromHistory(historyId)
    }
  }, [deleteFromHistory])



  return (
    <motion.div
      className="w-full max-w-5xl mx-auto"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* ====== Hero Section ====== */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card mb-10">
          {/* Subtle radial glow */}
          <div className="absolute -right-24 -top-24 w-[500px] h-[500px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.08] blur-[120px] pointer-events-none" />
          <div className="absolute -left-32 -bottom-32 w-[300px] h-[300px] rounded-full bg-muted/30 dark:bg-muted/15 blur-[100px] pointer-events-none" />

          {/* SVG decoration - Upgraded Visual (Final Adjustment: Moved 70px left) */}
          <StatisticalHeroVisual
            className="absolute right-[calc(70px-2%)] top-1/2 -translate-y-1/2 w-[42%] h-auto text-primary/40 pointer-events-none select-none hidden lg:block"
          />

          <div className="relative z-10 px-10 lg:px-12 py-10 lg:py-14">
            <div className="max-w-lg">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-foreground/15" />
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                  Statistical Analysis Platform
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] leading-[1.1] mb-8">
                {t.hub.hero.heading}
                <br />
                <span className="text-muted-foreground/60">{t.hub.hero.subheading}</span>
              </h1>

              {/* Stats - pill badges */}
              <div className="flex items-center gap-3 mb-10">
                {[
                  t.hub.hero.statMethods(TOTAL_METHODS),
                  t.hub.hero.statCategories(TOTAL_CATEGORIES),
                  t.hub.hero.statAi,
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/50 bg-background/60 backdrop-blur-sm"
                  >
                    <span className="text-[11px] font-mono text-muted-foreground/70 whitespace-nowrap">{stat}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2.5 px-7 h-12 text-sm font-medium shadow-sm hover:shadow-md transition-shadow"
                  onClick={onStartWithData}
                  data-testid="hub-upload-card"
                >
                  <Upload className="w-4 h-4" />
                  {t.hub.hero.uploadButton}
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 px-6 h-12 text-sm border-border/50 hover:bg-accent/40 hover:border-border transition-all"
                  onClick={onStartWithBrowse}
                >
                  <List className="w-4 h-4" />
                  {t.hub.hero.browseButton}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ====== AI Search ====== */}
      {(
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-border/40 bg-card p-6 mb-10 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{t.hub.aiSearch.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {t.hub.aiSearch.description}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={onGoToDetailedAI}
              >
                {t.hub.aiSearch.detailedLink}
              </Button>
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t.hub.aiSearch.placeholder}
                className="min-h-[64px] resize-none pr-28 text-sm border-border bg-background focus:border-primary/50 focus:ring-primary/20 transition-all rounded-lg"
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                {inputValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleClearSearch}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 gap-1.5 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSubmit}
                  disabled={isLoading || !inputValue.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      {t.hub.aiSearch.sendButton}
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
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-5 space-y-3"
                >
                  {/* Response text */}
                  {responseText && (
                    <div className="bg-muted/50 rounded-lg px-4 py-3 border border-border/50">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {responseText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommendation Card */}
                  {recommendation.method && (
                    <div className="bg-background rounded-lg border border-border p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                            {t.hub.aiSearch.recommendationBadge}
                          </Badge>
                          <span className="text-sm font-semibold">
                            {recommendation.method.name}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={handleSelectRecommended}
                          className="h-8 text-xs gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t.hub.aiSearch.selectButton}
                        </Button>
                      </div>

                      {recommendation.reasoning && recommendation.reasoning.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-3">
                          {recommendation.reasoning[0]}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ====== Quick Analysis Bar (Moved under AI Search) ====== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-1 mb-6">
          <div className="flex items-center gap-2 shrink-0">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-[12px] font-bold text-foreground tracking-tight">{t.hub.quickAnalysis.title}</span>
          </div>

          <div className="h-px flex-1 bg-border/40" />

          <div className="flex flex-wrap items-center gap-1.5">
            {quickMethodsInfo.map((method) => (
              <button
                key={method.id}
                type="button"
                className={cn(
                  "h-7 px-3.5 rounded-md text-[11px] font-medium",
                  "border border-border/50 bg-card",
                  "hover:bg-foreground hover:text-background hover:border-foreground",
                  "transition-all duration-200",
                  "focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onClick={() => handleQuickAnalysis(method.id)}
                title={method.description}
              >
                {method.name}
              </button>
            ))}
            {quickMethodsInfo.length === 0 && (
              <span className="text-xs text-muted-foreground/40">{t.hub.quickAnalysis.emptyPlaceholder}</span>
            )}
          </div>

          <button
            type="button"
            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-accent/50 transition-all duration-200"
            onClick={handleOpenEdit}
            title={t.hub.quickAnalysis.editTooltip}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* ====== Recent Analysis (History) - New UI ====== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-1 mb-10">
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[12px] font-bold text-foreground tracking-tight">
              {t.hub.cards.recentTitle}
            </span>

            {/* Data Persistence Warning Tooltip */}
            <div className="group relative ml-1">
              <AlertCircle className="w-3 h-3 text-muted-foreground/50 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 text-[10px] text-background bg-foreground rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                분석 결과는 브라우저에 저장됩니다. 중요 결과는 내보내기를 이용하세요.
              </div>
            </div>
          </div>

          <div className="h-px flex-1 bg-border/40" />

          <div className="flex flex-wrap items-center gap-1.5">
            {recentHistory.length > 0 ? (
              <>
                {recentHistory.map((history) => (
                  <div
                    key={history.id}
                    className={cn(
                      "group relative h-7 pl-3 pr-2.5 rounded-md text-[11px] font-medium flex items-center gap-2",
                      "border border-border/50 bg-card cursor-pointer",
                      "hover:bg-foreground hover:text-background hover:border-foreground",
                      "transition-all duration-200"
                    )}
                    onClick={() => handleHistorySelect(history.id)}
                  >
                    <span className="truncate max-w-[120px]" title={history.name}>
                      {history.name}
                    </span>
                    <span className="text-[9px] opacity-60 font-normal">
                      {history.timeAgo}
                    </span>

                    {/* Delete Button (Hover only) */}
                    <div
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-500 hover:text-white rounded-full"
                      onClick={(e) => handleHistoryDelete(history.id, e)}
                      title="삭제"
                    >
                      <X className="w-2.5 h-2.5" />
                    </div>
                  </div>
                ))}

                {/* + More Button */}
                <div
                  className={cn(
                    "h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1",
                    "border border-dashed border-border/70 bg-muted/30 cursor-pointer",
                    "hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/30",
                    "transition-all duration-200"
                  )}
                  onClick={() => setShowHistoryModal(true)}
                  title="전체 기록 보기"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  <span>더 보기</span>
                </div>
              </>
            ) : (
              <span className="text-[11px] text-muted-foreground/40 font-medium px-2">
                아직 분석 기록이 없습니다.
              </span>
            )}
          </div>

        </div>
      </motion.div>



      {/* ====== Quick Analysis Edit Dialog ====== */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{t.hub.editDialog.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-6 py-4">
              {Object.entries(METHODS_BY_CATEGORY).map(([category, methods]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground/70">
                    {t.hub.categoryLabels[category] || category}
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    {methods.map((method) => (
                      <label
                        key={method.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors"
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
              <span className="text-xs text-muted-foreground/60">
                {t.hub.editDialog.selectedCount(editingMethods.length)}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  {t.hub.editDialog.cancel}
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Check className="w-4 h-4 mr-1" />
                  {t.hub.editDialog.save}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== History Modal ====== */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header is handled inside AnalysisHistoryPanel or we can hide the DialogHeader to avoid double headers if AnalysisHistoryPanel has one */}
          {/* Using a wrapper to provide padding if needed, AnalysisHistoryPanel has its own layout */}
          <div className="flex-1 overflow-hidden p-1">
            <AnalysisHistoryPanel onClose={() => setShowHistoryModal(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

export default ChatCentricHub
