'use client'

/**
 * ChatCentricHub - Main Hub (Editorial Monochrome Design)
 *
 * Design: "Scientific Precision" aesthetic
 * - Dot grid background (graph paper motif)
 * - SVG normal distribution curve decoration
 * - Strong typographic hierarchy with monochrome palette
 * - Staggered entrance animations via Framer Motion
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
  History,
  Send,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  Settings2,
  ArrowRight,
  Zap,
  Clock,
  X,
  ArrowUpRight
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
// Card/CardContent removed in favor of styled div elements
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
import { useTerminology } from '@/hooks/use-terminology'
import type { HubText } from '@/lib/terminology/terminology-types'

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
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }
  }
}

// ===== SVG Decorations =====

function NormalDistributionSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 220"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Baseline */}
      <line x1="0" y1="198" x2="600" y2="198" stroke="currentColor" strokeOpacity="0.06" />

      {/* σ gridlines */}
      {[100, 200, 300, 400, 500].map((x) => (
        <line
          key={x}
          x1={x} y1="18" x2={x} y2="198"
          stroke="currentColor"
          strokeOpacity={x === 300 ? '0.06' : '0.03'}
          strokeDasharray="3 6"
        />
      ))}

      {/* Curve fill */}
      <path
        d="M 0,198 C 33,197 67,190 100,176 C 117,169 133,158 150,142 C 167,126 183,108 200,91 C 217,68 233,50 250,41 C 267,30 283,22 300,20 C 317,22 333,30 350,41 C 367,50 383,68 400,91 C 417,108 433,126 450,142 C 467,158 483,169 500,176 C 533,190 567,197 600,198 Z"
        fill="currentColor"
        fillOpacity="0.025"
      />

      {/* Curve stroke */}
      <path
        d="M 0,198 C 33,197 67,190 100,176 C 117,169 133,158 150,142 C 167,126 183,108 200,91 C 217,68 233,50 250,41 C 267,30 283,22 300,20 C 317,22 333,30 350,41 C 367,50 383,68 400,91 C 417,108 433,126 450,142 C 467,158 483,169 500,176 C 533,190 567,197 600,198"
        stroke="currentColor"
        strokeOpacity="0.10"
        strokeWidth="1.5"
      />

      {/* Scatter points (following distribution density) */}
      {/* Center cluster */}
      <circle cx="282" cy="50" r="1.5" fill="currentColor" opacity="0.12" />
      <circle cx="312" cy="44" r="1.5" fill="currentColor" opacity="0.10" />
      <circle cx="296" cy="32" r="1.5" fill="currentColor" opacity="0.08" />
      <circle cx="322" cy="55" r="1.5" fill="currentColor" opacity="0.12" />
      <circle cx="268" cy="58" r="1.5" fill="currentColor" opacity="0.10" />
      <circle cx="306" cy="38" r="1.5" fill="currentColor" opacity="0.08" />
      {/* Middle */}
      <circle cx="218" cy="98" r="1.5" fill="currentColor" opacity="0.08" />
      <circle cx="382" cy="92" r="1.5" fill="currentColor" opacity="0.08" />
      <circle cx="238" cy="80" r="1.5" fill="currentColor" opacity="0.06" />
      <circle cx="362" cy="76" r="1.5" fill="currentColor" opacity="0.06" />
      {/* Tails */}
      <circle cx="152" cy="146" r="1.5" fill="currentColor" opacity="0.05" />
      <circle cx="448" cy="148" r="1.5" fill="currentColor" opacity="0.05" />
      <circle cx="108" cy="170" r="1.5" fill="currentColor" opacity="0.04" />
      <circle cx="492" cy="172" r="1.5" fill="currentColor" opacity="0.04" />

      {/* σ labels */}
      <text x="300" y="214" textAnchor="middle" fill="currentColor" opacity="0.12" fontSize="9" fontFamily="var(--font-mono, monospace)">μ</text>
      <text x="200" y="214" textAnchor="middle" fill="currentColor" opacity="0.08" fontSize="8" fontFamily="var(--font-mono, monospace)">-1σ</text>
      <text x="400" y="214" textAnchor="middle" fill="currentColor" opacity="0.08" fontSize="8" fontFamily="var(--font-mono, monospace)">+1σ</text>
      <text x="100" y="214" textAnchor="middle" fill="currentColor" opacity="0.06" fontSize="8" fontFamily="var(--font-mono, monospace)">-2σ</text>
      <text x="500" y="214" textAnchor="middle" fill="currentColor" opacity="0.06" fontSize="8" fontFamily="var(--font-mono, monospace)">+2σ</text>
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

function formatTimeAgo(date: Date, texts: HubText['timeAgo']): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return texts.justNow
  if (diffMin < 60) return texts.minutesAgo(diffMin)
  if (diffHour < 24) return texts.hoursAgo(diffHour)
  if (diffDay < 7) return texts.daysAgo(diffDay)
  return date.toLocaleDateString()
}

// Category count for display
const TOTAL_METHODS = Object.values(STATISTICAL_METHODS).filter(m => m.hasOwnPage !== false).length
const TOTAL_CATEGORIES = Object.keys(METHODS_BY_CATEGORY).length

// ===== Component =====

export function ChatCentricHub({
  onStartWithData,
  onStartWithBrowse,
  onShowHistory,
  onGoToDetailedAI
}: ChatCentricHubProps) {
  const t = useTerminology()
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

  // Check Ollama availability
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (ollamaAvailable === null) {
        setOllamaAvailable(false)
        logger.warn('[MainHub] Ollama check timed out')
      }
    }, 3000)

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
  }, [])

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
    return analysisHistory.slice(0, 3).map(h => ({
      ...h,
      timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo)
    }))
  }, [analysisHistory, t])

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

  // Animation: parent container controls stagger; sections inherit via variants prop.
  // When prefersReducedMotion, parent has no variants/initial/animate, so children stay static.

  // Loading state
  if (ollamaAvailable === null) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <motion.div
      className="w-full max-w-5xl mx-auto"
      {...(prefersReducedMotion ? {} : { variants: containerVariants, initial: 'hidden' as const, animate: 'visible' as const })}
    >
      {/* ====== Hero Section ====== */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card mb-8">
          {/* Dot grid background */}
          <div
            className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, currentColor 0.5px, transparent 0.5px)',
              backgroundSize: '20px 20px'
            }}
          />

          {/* SVG decoration */}
          <NormalDistributionSVG
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] h-auto text-foreground opacity-80 pointer-events-none select-none hidden lg:block"
          />

          <div className="relative z-10 px-10 py-14 lg:py-16">
            <div className="max-w-lg">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">
                  Statistical Analysis Platform
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-[1.15] mb-4">
                {t.hub.hero.heading}
                <br />
                <span className="text-muted-foreground">{t.hub.hero.subheading}</span>
              </h1>

              {/* Description */}
              <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-md">
                {t.hub.hero.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-6 mb-8 text-xs text-muted-foreground font-mono">
                <span>{t.hub.hero.statMethods(TOTAL_METHODS)}</span>
                <span className="w-px h-3 bg-border" />
                <span>{t.hub.hero.statCategories(TOTAL_CATEGORIES)}</span>
                <span className="w-px h-3 bg-border" />
                <span>{t.hub.hero.statAi}</span>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2 px-6 h-11 text-sm font-medium"
                  onClick={onStartWithData}
                  data-testid="hub-upload-card"
                >
                  <Upload className="w-4 h-4" />
                  {t.hub.hero.uploadButton}
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 px-5 h-11 text-sm"
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

      {/* ====== Action Cards (3-column) ====== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Method Browse */}
          <button
            type="button"
            className={cn(
              "group relative text-left rounded-xl border border-border/60",
              "bg-card hover:bg-accent/50 p-6",
              "transition-all duration-200 hover:border-foreground/15",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={onStartWithBrowse}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                <List className="w-4 h-4 text-foreground/70" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono">
                {TOTAL_METHODS}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1">{t.hub.cards.methodsTitle}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t.hub.cards.methodsDescription(TOTAL_CATEGORIES)}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>{t.hub.cards.methodsLink}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>

          {/* Card 2: AI Recommendation */}
          <button
            type="button"
            className={cn(
              "group relative text-left rounded-xl border border-border/60",
              "bg-card hover:bg-accent/50 p-6",
              "transition-all duration-200 hover:border-foreground/15",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={onGoToDetailedAI}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-foreground/70" />
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
            </div>
            <h3 className="font-semibold text-sm mb-1">{t.hub.cards.aiTitle}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {t.hub.cards.aiDescription}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <span>{t.hub.cards.aiLink}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </button>

          {/* Card 3: Recent Analysis */}
          <div
            className={cn(
              "relative rounded-xl border border-border/60",
              "bg-card p-6"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                  <History className="w-4 h-4 text-foreground/70" />
                </div>
                <h3 className="font-semibold text-sm">{t.hub.cards.recentTitle}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onShowHistory()
                }}
              >
                {analysisHistory.length > 3 ? t.hub.cards.viewAll : t.hub.cards.historyLabel}
              </Button>
            </div>

            {recentHistory.length > 0 ? (
              <div className="space-y-1.5">
                {recentHistory.map((item, index) => (
                  <button
                    key={item.id || index}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg",
                      "hover:bg-accent/70 transition-colors"
                    )}
                    onClick={() => handleHistorySelect(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-xs truncate">
                        {item.method?.name || t.hub.cards.unknownMethod}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timeAgo}
                      </span>
                    </div>
                    {item.dataFileName && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {item.dataFileName}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground">
                  {t.hub.cards.emptyTitle}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {t.hub.cards.emptyDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ====== Quick Analysis Bar ====== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-1 mb-6">
          <div className="flex items-center gap-1.5 shrink-0">
            <Zap className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">{t.hub.quickAnalysis.title}</span>
          </div>

          <div className="h-px flex-1 bg-border/60" />

          <div className="flex flex-wrap items-center gap-1.5">
            {quickMethodsInfo.map((method) => (
              <button
                key={method.id}
                type="button"
                className={cn(
                  "h-7 px-3 rounded-md text-[11px] font-medium",
                  "border border-border/80 bg-card",
                  "hover:bg-foreground hover:text-background hover:border-foreground",
                  "transition-all duration-150",
                  "focus-visible:ring-2 focus-visible:ring-ring"
                )}
                onClick={() => handleQuickAnalysis(method.id)}
                title={method.description}
              >
                {method.name}
              </button>
            ))}
            {quickMethodsInfo.length === 0 && (
              <span className="text-xs text-muted-foreground">{t.hub.quickAnalysis.emptyPlaceholder}</span>
            )}
          </div>

          <button
            type="button"
            className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={handleOpenEdit}
            title={t.hub.quickAnalysis.editTooltip}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* ====== AI Search (Ollama available only) ====== */}
      {ollamaAvailable && (
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-border/60 bg-card p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{t.hub.aiSearch.title}</span>
              <span className="text-[10px] text-muted-foreground">
                {t.hub.aiSearch.description}
              </span>
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t.hub.aiSearch.placeholder}
                className="min-h-[56px] resize-none pr-24 text-sm"
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                {inputValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleClearSearch}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 gap-1 text-xs"
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
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  {/* Response text */}
                  {responseText && (
                    <div className="bg-accent/50 rounded-lg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {responseText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommended method */}
                  <div className="border border-foreground/15 bg-foreground/[0.02] rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-foreground/[0.06] flex items-center justify-center">
                          <Check className="w-4 h-4 text-foreground/70" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{recommendation.method.name}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {recommendation.method.description}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSelectRecommended} size="sm" className="gap-1 shrink-0 h-8 text-xs">
                        {t.hub.aiSearch.startButton}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Alternatives */}
                    {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/60">
                        <button
                          type="button"
                          onClick={() => setShowAlternatives(!showAlternatives)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className={cn("w-3 h-3 transition-transform", showAlternatives && "rotate-180")} />
                          {t.hub.aiSearch.alternatives(recommendation.alternatives.length)}
                        </button>

                        <AnimatePresence>
                          {showAlternatives && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-2 space-y-0.5"
                            >
                              {recommendation.alternatives.map((alt, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors text-xs"
                                  onClick={() => handleSelectAlternative(alt)}
                                >
                                  <span className="font-medium">{alt.name}</span>
                                  {alt.description && (
                                    <span className="text-muted-foreground ml-2 text-[10px]">
                                      {alt.description}
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

                  {/* Detailed AI link */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onGoToDetailedAI}
                      className="text-[11px] text-muted-foreground h-7"
                    >
                      {t.hub.aiSearch.detailedLink}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

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
                  <h4 className="text-sm font-semibold text-muted-foreground">
                    {t.hub.categoryLabels[category] || category}
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
    </motion.div>
  )
}

export default ChatCentricHub