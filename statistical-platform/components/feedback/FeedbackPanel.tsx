'use client'

/**
 * FeedbackPanel - Floating feedback panel with friendly cartoon style
 *
 * Features:
 * - Friendly mascot-based interface
 * - 3-tab structure: Ranking Vote / Ranking / Memo
 * - Micro-interactions for engagement
 * - Clean, minimalist design with doodle illustrations
 */

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronDown,
  Send,
  X,
  Check,
  Loader2,
  Heart
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Statistical methods organized by category (41 methods total)
// Synced with app/(dashboard)/statistics/*/page.tsx
const STATISTICAL_METHODS = {
  comparison: {
    label: '비교 분석 (차이 검정)',
    methods: [
      { id: 'one-sample-t', title: 'One-sample t-test', titleKr: '일표본 t검정' },
      { id: 't-test', title: 't-test (Ind/Paired)', titleKr: 't검정 (독립/대응)' },
      { id: 'welch-t', title: "Welch's t-test", titleKr: "Welch's t검정" },
      { id: 'anova', title: 'One-way ANOVA', titleKr: '일원분산분석' },
      { id: 'repeated-measures-anova', title: 'Repeated Measures ANOVA', titleKr: '반복측정 분산분석' },
      { id: 'ancova', title: 'ANCOVA', titleKr: '공분산분석' },
      { id: 'manova', title: 'MANOVA', titleKr: '다변량 분산분석' },
      { id: 'mixed-model', title: 'Mixed Model', titleKr: '혼합모형' },
    ]
  },
  relationship: {
    label: '관계 분석 (상관/회귀)',
    methods: [
      { id: 'correlation', title: 'Correlation', titleKr: '상관분석' },
      { id: 'partial-correlation', title: 'Partial Correlation', titleKr: '편상관분석' },
      { id: 'regression', title: 'Linear Regression', titleKr: '선형회귀분석' },
      { id: 'stepwise', title: 'Stepwise Regression', titleKr: '단계적 회귀분석' },
      { id: 'ordinal-regression', title: 'Ordinal Regression', titleKr: '서열 로지스틱 회귀' },
      { id: 'poisson', title: 'Poisson Regression', titleKr: '포아송 회귀' },
      { id: 'dose-response', title: 'Dose-Response Analysis', titleKr: '용량-반응 분석' },
      { id: 'response-surface', title: 'Response Surface', titleKr: '반응표면분석' },
    ]
  },
  nonparametric: {
    label: '비모수/범주형 검정',
    methods: [
      { id: 'mann-whitney', title: 'Mann-Whitney U', titleKr: '맨-휘트니 U 검정' },
      { id: 'wilcoxon', title: 'Wilcoxon Signed-Rank', titleKr: '윌콕슨 부호순위 검정' },
      { id: 'sign-test', title: 'Sign Test', titleKr: '부호검정' },
      { id: 'kruskal-wallis', title: 'Kruskal-Wallis', titleKr: '크루스칼-왈리스 검정' },
      { id: 'friedman', title: 'Friedman Test', titleKr: 'Friedman 검정' },
      { id: 'mood-median', title: "Mood's Median", titleKr: "Mood's 중앙값 검정" },
      { id: 'runs-test', title: 'Runs Test', titleKr: 'Runs 검정' },
      { id: 'ks-test', title: 'Kolmogorov-Smirnov', titleKr: 'K-S 검정' },
      { id: 'chi-square', title: 'Chi-square Test', titleKr: '카이제곱 검정' },
      { id: 'chi-square-independence', title: 'Chi-square Independence', titleKr: '카이제곱 독립성 검정' },
      { id: 'chi-square-goodness', title: 'Chi-square Goodness of Fit', titleKr: '카이제곱 적합도 검정' },
      { id: 'mcnemar', title: 'McNemar Test', titleKr: 'McNemar 검정' },
      { id: 'cochran-q', title: "Cochran's Q", titleKr: 'Cochran Q 검정' },
      { id: 'binomial-test', title: 'Binomial Test', titleKr: '이항검정' },
      { id: 'proportion-test', title: 'Proportion Test', titleKr: '비율검정' },
    ]
  },
  multivariate: {
    label: '다변량/차원축소',
    methods: [
      { id: 'pca', title: 'PCA', titleKr: '주성분분석' },
      { id: 'factor-analysis', title: 'Factor Analysis', titleKr: '요인분석' },
      { id: 'cluster', title: 'Cluster Analysis', titleKr: '군집분석' },
      { id: 'discriminant', title: 'Discriminant Analysis', titleKr: '판별분석' },
    ]
  },
  timeseries: {
    label: '시계열 분석',
    methods: [
      { id: 'arima', title: 'ARIMA', titleKr: '시계열 ARIMA' },
      { id: 'seasonal-decompose', title: 'Seasonal Decomposition', titleKr: '계절분해' },
      { id: 'stationarity-test', title: 'Stationarity Test', titleKr: '정상성 검정' },
      { id: 'mann-kendall', title: 'Mann-Kendall Trend', titleKr: 'Mann-Kendall 추세 검정' },
    ]
  },
  survival: {
    label: '생존 분석',
    methods: [
      { id: 'kaplan-meier', title: 'Kaplan-Meier', titleKr: 'Kaplan-Meier 생존분석' },
      { id: 'cox-regression', title: 'Cox Regression', titleKr: 'Cox 비례위험 모형' },
    ]
  },
}

// Flatten all methods for ranking
const ALL_METHODS = Object.values(STATISTICAL_METHODS).flatMap(cat => cat.methods)

// Comment categories - Shortened
const COMMENT_CATEGORIES = ['버그', '기능', '개선', '기타']

type TabType = 'request' | 'ranking' | 'memo'

interface FeedbackData {
  votes: Record<string, number>
  vote_details: Array<{ method_id: string; timestamp: number }>
  comments: Array<{ id: string; category: string; content: string; timestamp: number }>
}

interface FeedbackPanelProps {
  isDemo?: boolean
}

export function FeedbackPanel({ isDemo = false }: FeedbackPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('request')
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState<string>('')
  // All collapsed by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/feedback')
        if (response.ok) {
          const data: FeedbackData = await response.json()
          setVotes(data.votes)
        }
      } catch (err) {
        console.error('Failed to fetch feedback data:', err)
      }
    }

    if (isOpen && !isDemo) {
      fetchData()
    }
  }, [isOpen, isDemo])

  // Load voted IDs from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('feedback_voted_ids')
    if (stored) {
      setVotedIds(new Set(JSON.parse(stored)))
    }
  }, [])

  // Save voted IDs to localStorage
  const saveVotedIds = useCallback((ids: Set<string>) => {
    localStorage.setItem('feedback_voted_ids', JSON.stringify([...ids]))
  }, [])

  const handleVote = useCallback(async (methodId: string) => {
    if (votedIds.has(methodId) || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    if (isDemo) {
      // Demo mode simulation
      setVotes(prev => ({ ...prev, [methodId]: (prev[methodId] || 0) + 1 }))
      const newVotedIds = new Set([...votedIds, methodId])
      setVotedIds(newVotedIds)
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vote', method_id: methodId }),
      })

      if (response.ok) {
        const result = await response.json()
        setVotes(prev => ({ ...prev, [methodId]: result.votes }))
        const newVotedIds = new Set([...votedIds, methodId])
        setVotedIds(newVotedIds)
        saveVotedIds(newVotedIds)

        // Micro-interaction: Confetti effect
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      } else {
        setError('투표 실패. 다시 시도해주세요.')
      }
    } catch (err) {
      console.error('Vote failed:', err)
      setError('네트워크 오류. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }, [votedIds, isSubmitting, saveVotedIds, isDemo])

  const handleSubmitComment = useCallback(async () => {
    if (!comment.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    if (isDemo) {
      setComment('')
      setCategory('')
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 2000)
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', category: category || '기타', content: comment }),
      })

      if (response.ok) {
        setComment('')
        setCategory('')
        setError(null)
        // Success feedback
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2000)
      } else {
        setError('의견 제출 실패. 다시 시도해주세요.')
      }
    } catch (err) {
      console.error('Comment failed:', err)
      setError('네트워크 오류. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }, [comment, category, isSubmitting, isDemo])

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  // Calculate rankings
  const rankedMethods = [...ALL_METHODS]
    .map(m => ({ ...m, currentVotes: votes[m.id] || 0 }))
    .sort((a, b) => b.currentVotes - a.currentVotes)

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "group z-50 transition-transform hover:scale-110 active:scale-95 flex items-center justify-center",
          isDemo ? "absolute right-6 bottom-6" : "fixed right-6 bottom-6",
          "w-16 h-16 rounded-full bg-white shadow-xl border-4 border-white overflow-hidden"
        )}
      >
        <div className="relative w-full h-full bg-slate-100">
          <Image
            src="/images/feedback/mascot.png"
            alt="Feedback Mascot"
            fill
            className="object-cover scale-110 translate-y-1"
          />
          {/* Notification Badge */}
          <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white z-10" />
        </div>

        {/* Speech Bubble Tooltip */}
        <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-slate-800 px-4 py-2 rounded-2xl rounded-tr-none shadow-lg border border-slate-100 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50">
          어떤 분석이 궁금하세요? 👋
        </div>
      </button>
    )
  }

  // Open panel
  return (
    <div className={cn(
      "w-[340px] z-50 animate-in slide-in-from-bottom-4 fade-in duration-300",
      isDemo ? "absolute right-6 bottom-6" : "fixed right-6 bottom-6"
    )}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[500px]">

        {/* Header - Friendly & Clean */}
        <div className="p-5 pb-2 bg-white relative shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                <Image
                  src="/images/feedback/mascot.png"
                  alt="Mascot"
                  fill
                  className="object-cover scale-125 translate-y-1"
                />
              </div>
              <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-tl-none text-sm font-medium text-slate-700 shadow-sm max-w-[220px]">
                <div>한참 작업 중이예요 🛠️</div>
                <div className="text-xs text-slate-500 whitespace-nowrap">먼저 점검할 분석을 투표해주세요 🐾</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation - Icon based */}
        <div className="flex px-4 gap-2 mt-2 shrink-0">
          <button
            onClick={() => setActiveTab('request')}
            className={cn(
              "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2",
              activeTab === 'request'
                ? "bg-violet-50 border-violet-100 text-violet-600"
                : "bg-white border-transparent hover:bg-slate-50 text-slate-400"
            )}
          >
            <div className="relative w-8 h-8">
              <Image src="/images/feedback/tab-request.png" alt="Request" fill className="object-contain" />
            </div>
            <span className="text-[10px] font-bold">순위투표</span>
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={cn(
              "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2",
              activeTab === 'ranking'
                ? "bg-amber-50 border-amber-100 text-amber-600"
                : "bg-white border-transparent hover:bg-slate-50 text-slate-400"
            )}
          >
            <div className="relative w-8 h-8">
              <Image src="/images/feedback/tab-ranking.png" alt="Ranking" fill className="object-contain" />
            </div>
            <span className="text-[10px] font-bold">인기순위</span>
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            className={cn(
              "flex-1 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2",
              activeTab === 'memo'
                ? "bg-slate-100 border-slate-200 text-slate-600"
                : "bg-white border-transparent hover:bg-slate-50 text-slate-400"
            )}
          >
            <div className="relative w-8 h-8">
              <Image src="/images/feedback/tab-memo.png" alt="Memo" fill className="object-contain" />
            </div>
            <span className="text-[10px] font-bold">자유의견</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-2 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg text-center shrink-0">
            {error}
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Request tab */}
          {activeTab === 'request' && (
            <div className="space-y-3">
              {Object.entries(STATISTICAL_METHODS).map(([catId, cat]) => (
                <div key={catId} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleCategory(catId)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700">{cat.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-slate-200 text-slate-600 hover:bg-slate-200">
                        {cat.methods.length}개
                      </Badge>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", expandedCategories.has(catId) && "rotate-180")} />
                  </button>

                  {expandedCategories.has(catId) && (
                    <div className="p-2 space-y-1">
                      {cat.methods.map(method => (
                        <button
                          key={method.id}
                          onClick={() => handleVote(method.id)}
                          disabled={votedIds.has(method.id) || isSubmitting}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all group relative overflow-hidden",
                            votedIds.has(method.id)
                              ? "bg-violet-50 border border-violet-100"
                              : "hover:bg-slate-50 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                            votedIds.has(method.id)
                              ? "bg-violet-500 text-white"
                              : "bg-slate-100 text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-500"
                          )}>
                            {isSubmitting && votedIds.has(method.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : votedIds.has(method.id) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Heart className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-sm font-medium truncate", votedIds.has(method.id) ? "text-violet-700" : "text-slate-700")}>
                              {method.titleKr}
                            </div>
                            <div className="text-[10px] text-slate-400">{method.title}</div>
                          </div>
                          {/* Vote Count Badge */}
                          <div className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
                            {votes[method.id] || 0}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ranking tab */}
          {activeTab === 'ranking' && (
            <div className="space-y-2">
              {rankedMethods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-24 h-24 relative mb-4 opacity-50">
                    <Image src="/images/feedback/empty-state.png" alt="Empty" fill className="object-contain" />
                  </div>
                  <p className="text-sm font-medium text-slate-400">아직 투표가 없어요!</p>
                  <p className="text-xs text-slate-300">첫 번째 주인공이 되어주세요</p>
                </div>
              ) : (
                rankedMethods.map((method, index) => (
                  <div
                    key={method.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border transition-all",
                      index < 3
                        ? "bg-white border-amber-100 shadow-sm"
                        : "bg-slate-50/50 border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      index === 0 && "bg-yellow-400 text-white shadow-md",
                      index === 1 && "bg-slate-300 text-white",
                      index === 2 && "bg-amber-600 text-white",
                      index >= 3 && "bg-slate-200 text-slate-500"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-700 truncate">{method.titleKr}</div>
                      <div className="text-[10px] text-slate-400">{method.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-violet-500">{method.currentVotes}</div>
                      <div className="text-[10px] text-slate-400">likes</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Memo tab */}
          {activeTab === 'memo' && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex flex-wrap gap-2 justify-center">
                {COMMENT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold transition-all border",
                      category === cat
                        ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105"
                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Textarea
                  placeholder="버그, 아이디어, 응원 등 자유롭게 적어주세요..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="h-full min-h-[200px] text-sm resize-none rounded-xl border-slate-200 focus:border-slate-400 bg-white pr-12"
                />
                <button
                  className={cn(
                    "absolute right-2 bottom-2 w-9 h-9 rounded-full flex items-center justify-center transition-all",
                    comment.trim()
                      ? "bg-slate-800 text-white hover:bg-slate-700 active:scale-95"
                      : "bg-slate-100 text-slate-300 cursor-not-allowed"
                  )}
                  disabled={!comment.trim() || isSubmitting}
                  onClick={handleSubmitComment}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex justify-center items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <div className="relative w-4 h-4 opacity-60 grayscale">
              <Image src="/images/feedback/mascot.png" alt="" fill className="object-cover" />
            </div>
            <span>Thank you!</span>
          </div>
        </div>
      </div>

      {/* Confetti Effect (Simple CSS Animation) */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 50}%`,
                animationDuration: `${0.5 + Math.random()}s`,
                color: ['#FF6B6B', '#4ECDC4', '#FFE66D'][Math.floor(Math.random() * 3)]
              }}
            >
              🎉
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
