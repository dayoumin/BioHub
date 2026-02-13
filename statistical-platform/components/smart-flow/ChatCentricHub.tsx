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

function NormalDistributionSVG({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 220"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="curveGrad" x1="300" y1="20" x2="300" y2="198" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.005" />
        </linearGradient>
        <linearGradient id="strokeGrad" x1="0" y1="100" x2="600" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.03" />
          <stop offset="30%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="50%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="70%" stopColor="currentColor" stopOpacity="0.14" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* Baseline */}
      <line x1="0" y1="198" x2="600" y2="198" stroke="currentColor" strokeOpacity="0.04" />

      {/* sigma gridlines */}
      {[100, 200, 300, 400, 500].map((x) => (
        <line
          key={x}
          x1={x} y1="18" x2={x} y2="198"
          stroke="currentColor"
          strokeOpacity={x === 300 ? '0.05' : '0.02'}
          strokeDasharray="2 8"
        />
      ))}

      {/* Curve fill - gradient */}
      <path
        d="M 0,198 C 33,197 67,190 100,176 C 117,169 133,158 150,142 C 167,126 183,108 200,91 C 217,68 233,50 250,41 C 267,30 283,22 300,20 C 317,22 333,30 350,41 C 367,50 383,68 400,91 C 417,108 433,126 450,142 C 467,158 483,169 500,176 C 533,190 567,197 600,198 Z"
        fill="url(#curveGrad)"
      />

      {/* Curve stroke - gradient for refined fade */}
      <path
        d="M 0,198 C 33,197 67,190 100,176 C 117,169 133,158 150,142 C 167,126 183,108 200,91 C 217,68 233,50 250,41 C 267,30 283,22 300,20 C 317,22 333,30 350,41 C 367,50 383,68 400,91 C 417,108 433,126 450,142 C 467,158 483,169 500,176 C 533,190 567,197 600,198"
        stroke="url(#strokeGrad)"
        strokeWidth="1.5"
      />

      {/* Scatter points - refined sizes */}
      {[
        { cx: 282, cy: 50, o: 0.10 }, { cx: 312, cy: 44, o: 0.08 },
        { cx: 296, cy: 32, o: 0.06 }, { cx: 322, cy: 55, o: 0.10 },
        { cx: 268, cy: 58, o: 0.08 }, { cx: 306, cy: 38, o: 0.06 },
        { cx: 218, cy: 98, o: 0.06 }, { cx: 382, cy: 92, o: 0.06 },
        { cx: 238, cy: 80, o: 0.04 }, { cx: 362, cy: 76, o: 0.04 },
        { cx: 152, cy: 146, o: 0.03 }, { cx: 448, cy: 148, o: 0.03 },
        { cx: 108, cy: 170, o: 0.02 }, { cx: 492, cy: 172, o: 0.02 },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r="1.2" fill="currentColor" opacity={p.o} />
      ))}

      {/* sigma labels */}
      <text x="300" y="214" textAnchor="middle" fill="currentColor" opacity="0.10" fontSize="9" fontFamily="var(--font-mono, monospace)">&#956;</text>
      <text x="200" y="214" textAnchor="middle" fill="currentColor" opacity="0.06" fontSize="8" fontFamily="var(--font-mono, monospace)">-1&#963;</text>
      <text x="400" y="214" textAnchor="middle" fill="currentColor" opacity="0.06" fontSize="8" fontFamily="var(--font-mono, monospace)">+1&#963;</text>
      <text x="100" y="214" textAnchor="middle" fill="currentColor" opacity="0.04" fontSize="8" fontFamily="var(--font-mono, monospace)">-2&#963;</text>
      <text x="500" y="214" textAnchor="middle" fill="currentColor" opacity="0.04" fontSize="8" fontFamily="var(--font-mono, monospace)">+2&#963;</text>
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

  // Loading state
  if (ollamaAvailable === null) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground/40 font-mono tracking-wide">Loading</span>
        </div>
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
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card mb-10">
          {/* Engineering grid background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.45] dark:opacity-[0.12]"
            style={{
              backgroundImage: `
                linear-gradient(to right, currentColor 1px, transparent 1px),
                linear-gradient(to bottom, currentColor 1px, transparent 1px)
              `,
              backgroundSize: '36px 36px'
            }}
          />

          {/* Subtle radial glow */}
          <div className="absolute -right-24 -top-24 w-[500px] h-[500px] rounded-full bg-primary/[0.03] dark:bg-primary/[0.06] blur-[120px] pointer-events-none" />
          <div className="absolute -left-32 -bottom-32 w-[300px] h-[300px] rounded-full bg-muted/40 dark:bg-muted/20 blur-[100px] pointer-events-none" />

          {/* SVG decoration */}
          <NormalDistributionSVG
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] h-auto text-foreground pointer-events-none select-none hidden lg:block"
          />

          <div className="relative z-10 px-10 lg:px-12 py-14 lg:py-20">
            <div className="max-w-lg">
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-8 bg-foreground/15" />
                <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-muted-foreground/70">
                  Statistical Analysis Platform
                </span>
              </div>

              {/* Heading */}
              <h1 className="text-4xl lg:text-[2.75rem] font-bold tracking-[-0.02em] leading-[1.1] mb-5">
                {t.hub.hero.heading}
                <br />
                <span className="text-muted-foreground/60">{t.hub.hero.subheading}</span>
              </h1>

              {/* Description */}
              <p className="text-muted-foreground/80 text-[15px] leading-relaxed mb-10 max-w-md">
                {t.hub.hero.description}
              </p>

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

      {/* ====== Action Cards (3-column) ====== */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Card 1: Method Browse */}
          <button
            type="button"
            className={cn(
              "group relative text-left rounded-xl border border-border/40",
              "bg-card p-7",
              "transition-all duration-300 ease-out",
              "hover:border-border/80 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]",
              "hover:-translate-y-0.5",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={onStartWithBrowse}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center">
                <List className="w-4 h-4 text-foreground/60" />
              </div>
              <Badge variant="secondary" className="text-[10px] font-mono h-5 px-2">
                {TOTAL_METHODS}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm mb-1.5">{t.hub.cards.methodsTitle}</h3>
            <p className="text-xs text-muted-foreground/70 leading-relaxed mb-5">
              {t.hub.cards.methodsDescription(TOTAL_CATEGORIES)}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-foreground/80 transition-colors duration-300">
              <span>{t.hub.cards.methodsLink}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </div>
          </button>

          {/* Card 2: AI Recommendation */}
          <button
            type="button"
            className={cn(
              "group relative text-left rounded-xl border border-border/40",
              "bg-card p-7",
              "transition-all duration-300 ease-out",
              "hover:border-border/80 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]",
              "hover:-translate-y-0.5",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
            onClick={onGoToDetailedAI}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="w-10 h-10 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-foreground/60" />
              </div>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-foreground/20 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-foreground/15" />
              </span>
            </div>
            <h3 className="font-semibold text-sm mb-1.5">{t.hub.cards.aiTitle}</h3>
            <p className="text-xs text-muted-foreground/70 leading-relaxed mb-5">
              {t.hub.cards.aiDescription}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 group-hover:text-foreground/80 transition-colors duration-300">
              <span>{t.hub.cards.aiLink}</span>
              <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
            </div>
          </button>

          {/* Card 3: Recent Analysis */}
          <div
            className={cn(
              "relative rounded-xl border border-border/40",
              "bg-card p-7"
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center">
                  <History className="w-4 h-4 text-foreground/60" />
                </div>
                <h3 className="font-semibold text-sm">{t.hub.cards.recentTitle}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground/60 hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation()
                  onShowHistory()
                }}
              >
                {analysisHistory.length > 3 ? t.hub.cards.viewAll : t.hub.cards.historyLabel}
              </Button>
            </div>

            {recentHistory.length > 0 ? (
              <div className="space-y-1">
                {recentHistory.map((item, index) => (
                  <button
                    key={item.id || index}
                    type="button"
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg",
                      "hover:bg-accent/50 transition-colors duration-200"
                    )}
                    onClick={() => handleHistorySelect(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-xs truncate">
                        {item.method?.name || t.hub.cards.unknownMethod}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timeAgo}
                      </span>
                    </div>
                    {item.dataFileName && (
                      <p className="text-[10px] text-muted-foreground/40 truncate mt-0.5">
                        {item.dataFileName}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-muted-foreground/50">
                  {t.hub.cards.emptyTitle}
                </p>
                <p className="text-[10px] text-muted-foreground/30 mt-1.5">
                  {t.hub.cards.emptyDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ====== Quick Analysis Bar ====== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-1 mb-8">
          <div className="flex items-center gap-2 shrink-0">
            <Zap className="w-3.5 h-3.5 text-muted-foreground/50" />
            <span className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">{t.hub.quickAnalysis.title}</span>
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

      {/* ====== AI Search (Ollama available only) ====== */}
      {ollamaAvailable && (
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-border/40 bg-card p-6 mb-8">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-6 rounded-md bg-muted/40 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-muted-foreground/60" />
              </div>
              <span className="text-xs font-medium">{t.hub.aiSearch.title}</span>
              <span className="text-[10px] text-muted-foreground/50">
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
                className="min-h-[56px] resize-none pr-24 text-sm border-border/40 focus:border-border/80 transition-colors"
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex gap-1">
                {inputValue && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground/40 hover:text-foreground"
                    onClick={handleClearSearch}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-7 gap-1.5 text-xs shadow-sm"
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
                    <div className="bg-muted/30 rounded-lg px-4 py-3 border border-border/30">
                      <div className="flex items-start gap-2.5">
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground/70 leading-relaxed">
                          {responseText}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recommended method */}
                  <div className="border border-border/50 bg-card rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-border/40 bg-muted/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-foreground/60" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{recommendation.method.name}</p>
                          <p className="text-[11px] text-muted-foreground/60 line-clamp-1">
                            {recommendation.method.description}
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleSelectRecommended} size="sm" className="gap-1.5 shrink-0 h-8 text-xs shadow-sm">
                        {t.hub.aiSearch.startButton}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Alternatives */}
                    {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <button
                          type="button"
                          onClick={() => setShowAlternatives(!showAlternatives)}
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-foreground/80 transition-colors duration-200"
                        >
                          <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", showAlternatives && "rotate-180")} />
                          {t.hub.aiSearch.alternatives(recommendation.alternatives.length)}
                        </button>

                        <AnimatePresence>
                          {showAlternatives && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                              className="mt-2 space-y-0.5"
                            >
                              {recommendation.alternatives.map((alt, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent/40 transition-colors duration-200 text-xs"
                                  onClick={() => handleSelectAlternative(alt)}
                                >
                                  <span className="font-medium">{alt.name}</span>
                                  {alt.description && (
                                    <span className="text-muted-foreground/50 ml-2 text-[10px]">
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
                      className="text-[11px] text-muted-foreground/50 h-7 hover:text-foreground/70"
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
    </motion.div>
  )
}

export default ChatCentricHub