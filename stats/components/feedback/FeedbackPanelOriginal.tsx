'use client'

/**
 * FeedbackPanelOriginal - Original Gradient Style (for comparison)
 *
 * This is the original gradient-based design without mascot images.
 * Used in Design System for A/B comparison with the new cartoon style.
 */

import { useState, useCallback, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ChevronDown,
  Send,
  X,
  Check,
  Loader2,
  Heart,
  Trophy,
  MessageSquare,
  ThumbsUp,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Statistical methods (same as FeedbackPanel)
const STATISTICAL_METHODS = {
  comparison: {
    label: '비교 분석',
    icon: '📊',
    methods: [
      { id: 'ind-ttest', title: 'Independent t-test', titleKr: '독립표본 t검정' },
      { id: 'paired-ttest', title: 'Paired t-test', titleKr: '대응표본 t검정' },
      { id: 'oneway-anova', title: 'One-way ANOVA', titleKr: '일원분산분석' },
      { id: 'twoway-anova', title: 'Two-way ANOVA', titleKr: '이원분산분석' },
    ]
  },
  relationship: {
    label: '관계 분석',
    icon: '🔗',
    methods: [
      { id: 'pearson', title: 'Pearson Correlation', titleKr: '피어슨 상관분석' },
      { id: 'simple-reg', title: 'Simple Linear Regression', titleKr: '단순선형회귀' },
      { id: 'multiple-reg', title: 'Multiple Regression', titleKr: '다중회귀분석' },
      { id: 'logistic-reg', title: 'Logistic Regression', titleKr: '로지스틱 회귀' },
    ]
  },
  nonparametric: {
    label: '비모수 검정',
    icon: '🎯',
    methods: [
      { id: 'mann-whitney', title: 'Mann-Whitney U', titleKr: '맨-휘트니 U 검정' },
      { id: 'wilcoxon', title: 'Wilcoxon Signed-Rank', titleKr: '윌콕슨 부호순위 검정' },
      { id: 'kruskal', title: 'Kruskal-Wallis', titleKr: '크루스칼-왈리스 검정' },
      { id: 'chi-square', title: 'Chi-square Test', titleKr: '카이제곱 검정' },
    ]
  }
}

const ALL_METHODS = Object.values(STATISTICAL_METHODS).flatMap(cat => cat.methods)
const COMMENT_CATEGORIES = ['버그 리포트', '기능 요청', '개선 제안', '기타']

type TabType = 'request' | 'ranking' | 'memo'

interface FeedbackPanelOriginalProps {
  isDemo?: boolean
}

export function FeedbackPanelOriginal({ isDemo = false }: FeedbackPanelOriginalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('request')
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [comment, setComment] = useState('')
  const [category, setCategory] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['comparison']))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleVote = useCallback(async (methodId: string) => {
    if (votedIds.has(methodId) || isSubmitting) return

    setIsSubmitting(true)

    // Demo mode - local only
    await new Promise(resolve => setTimeout(resolve, 300))
    setVotes(prev => ({ ...prev, [methodId]: (prev[methodId] || 0) + 1 }))
    const newVotedIds = new Set([...votedIds, methodId])
    setVotedIds(newVotedIds)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 1500)
    setIsSubmitting(false)
  }, [votedIds, isSubmitting])

  const handleSubmitComment = useCallback(async () => {
    if (!comment.trim() || !category || isSubmitting) return

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    setComment('')
    setCategory('')
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 1500)
    setIsSubmitting(false)
  }, [comment, category, isSubmitting])

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const rankedMethods = [...ALL_METHODS]
    .map(m => ({ ...m, currentVotes: votes[m.id] || 0 }))
    .sort((a, b) => b.currentVotes - a.currentVotes)

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "group z-50 transition-all hover:scale-110 active:scale-95",
          isDemo ? "absolute right-6 bottom-6" : "fixed right-6 bottom-6",
          "w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30",
          "flex items-center justify-center text-white"
        )}
      >
        <MessageSquare className="h-6 w-6" />
        <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-white" />

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          피드백 보내기
        </div>
      </button>
    )
  }

  return (
    <div className={cn(
      "w-[340px] z-50 animate-in slide-in-from-bottom-4 fade-in duration-300",
      isDemo ? "absolute right-6 bottom-6" : "fixed right-6 bottom-6"
    )}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[500px]">

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-600 p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">우선순위 투표</h3>
                <p className="text-xs text-white/80">어떤 분석이 필요하세요?</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('request')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === 'request'
                ? "text-violet-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              점검 요청
            </div>
            {activeTab === 'request' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === 'ranking'
                ? "text-violet-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy className="h-4 w-4" />
              순위
            </div>
            {activeTab === 'ranking' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('memo')}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors relative",
              activeTab === 'memo'
                ? "text-violet-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <div className="flex items-center justify-center gap-2">
              <MessageSquare className="h-4 w-4" />
              메모
            </div>
            {activeTab === 'memo' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" />
            )}
          </button>
        </div>

        {/* Success message */}
        {showSuccess && (
          <div className="mx-4 mt-3 px-3 py-2 bg-green-50 text-green-600 text-xs rounded-lg text-center flex items-center justify-center gap-2 shrink-0">
            <Check className="h-4 w-4" />
            감사합니다!
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Request tab */}
          {activeTab === 'request' && (
            <div className="space-y-3">
              {Object.entries(STATISTICAL_METHODS).map(([catId, cat]) => (
                <div key={catId} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(catId)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-semibold text-slate-700">{cat.label}</span>
                      <Badge variant="secondary" className="text-[10px] h-5 bg-slate-200">
                        {cat.methods.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      expandedCategories.has(catId) && "rotate-180"
                    )} />
                  </button>

                  {expandedCategories.has(catId) && (
                    <div className="p-2 space-y-1 bg-white">
                      {cat.methods.map(method => (
                        <button
                          key={method.id}
                          onClick={() => handleVote(method.id)}
                          disabled={votedIds.has(method.id) || isSubmitting}
                          className={cn(
                            "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all",
                            votedIds.has(method.id)
                              ? "bg-violet-50 border border-violet-200"
                              : "hover:bg-slate-50 border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors",
                            votedIds.has(method.id)
                              ? "bg-violet-500 text-white"
                              : "bg-slate-100 text-slate-400"
                          )}>
                            {votedIds.has(method.id) ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Heart className="h-3.5 w-3.5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-sm font-medium truncate",
                              votedIds.has(method.id) ? "text-violet-700" : "text-slate-700"
                            )}>
                              {method.titleKr}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">{method.title}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {votes[method.id] || 0}
                          </Badge>
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
              {rankedMethods.filter(m => m.currentVotes > 0).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Trophy className="h-12 w-12 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-400">아직 투표가 없습니다</p>
                  <p className="text-xs text-slate-300 mt-1">첫 번째로 투표해보세요!</p>
                </div>
              ) : (
                rankedMethods.filter(m => m.currentVotes > 0).map((method, index) => (
                  <div
                    key={method.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all",
                      index < 3
                        ? "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100"
                        : "bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      index === 0 && "bg-yellow-400 text-white",
                      index === 1 && "bg-slate-400 text-white",
                      index === 2 && "bg-amber-600 text-white",
                      index >= 3 && "bg-slate-200 text-slate-600"
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-700 truncate">{method.titleKr}</div>
                      <div className="text-[10px] text-slate-400">{method.title}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-violet-600">{method.currentVotes}</div>
                      <div className="text-[10px] text-slate-400">votes</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Memo tab */}
          {activeTab === 'memo' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {COMMENT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                        category === cat
                          ? "bg-violet-500 text-white border-violet-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">내용</label>
                <Textarea
                  placeholder="자유롭게 의견을 남겨주세요..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                disabled={!comment.trim() || !category || isSubmitting}
                onClick={handleSubmitComment}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                의견 보내기
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>피드백으로 더 나은 서비스를 만듭니다</span>
            <span className="font-medium">{Object.values(votes).reduce((a, b) => a + b, 0)} votes</span>
          </div>
        </div>
      </div>
    </div>
  )
}
