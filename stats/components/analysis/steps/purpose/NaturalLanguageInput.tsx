'use client'

/**
 * NaturalLanguageInput - AI Chat 기반 분석 방법 추천
 *
 * 사용자가 자연어로 분석 목적을 입력하면 LLM이 적절한 통계 방법을 추천합니다.
 * - 데이터 요약 카드 표시 (ValidationResults 활용)
 * - Provider 뱃지 (OpenRouter / Ollama / 키워드)
 * - 다시 질문하기 기능
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  Sparkles,
  List,
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  Info,
  Compass,
} from 'lucide-react'
import { AssumptionBadges } from '@/components/analysis/common/AssumptionBadges'
import { TypingIndicator } from '@/components/common/TypingIndicator'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useTerminology } from '@/hooks/use-terminology'
import type { AIRecommendation, StatisticalMethod, FlowChatMessage } from '@/types/analysis'
import type { LlmProvider } from '@/lib/services/llm-recommender'
import { SecondaryLink } from './CategorySelector'

interface NaturalLanguageInputProps {
  /** AI 입력 텍스트 */
  inputValue: string
  /** AI 응답 텍스트 (스트리밍) */
  responseText: string | null
  /** AI 에러 메시지 */
  error?: string | null
  /** AI 추천 결과 */
  recommendation: AIRecommendation | null
  /** 로딩 상태 */
  isLoading: boolean
  /** 입력 변경 핸들러 */
  onInputChange: (value: string) => void
  /** 추천 요청 핸들러 */
  onSubmit: () => void
  /** 추천 방법 선택 핸들러 */
  onSelectMethod: (method: StatisticalMethod) => void
  /** 단계별 가이드로 이동 */
  onGoToGuided: () => void
  /** 전체 목록 보기 */
  onBrowseAll: () => void
  /** 비활성화 */
  disabled?: boolean
  /** AI provider 정보 */
  provider?: LlmProvider | null
  /** 멀티턴 채팅 메시지 목록 */
  chatMessages?: FlowChatMessage[]
}

export const NaturalLanguageInput = memo(function NaturalLanguageInput({
  inputValue,
  responseText,
  error,
  recommendation,
  isLoading,
  onInputChange,
  onSubmit,
  onSelectMethod,
  onGoToGuided,
  onBrowseAll,
  disabled = false,
  provider,
  chatMessages,
}: NaturalLanguageInputProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [showPreprocessing, setShowPreprocessing] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0)

  // Example prompts from terminology
  const examplePrompts = useMemo(() => t.naturalLanguageInput.examples, [t])

  // Loading messages from terminology
  const loadingMessages = useMemo(() => t.naturalLanguageInput.loadingMessages, [t])

  // ambiguityNote 있으면 alternatives 기본 펼침
  useEffect(() => {
    if (recommendation?.ambiguityNote) {
      setShowAlternatives(true)
    }
  }, [recommendation?.ambiguityNote])

  // 로딩 단계 메시지 (시간 기반)
  useEffect(() => {
    if (!isLoading) {
      setLoadingStage(0)
      return
    }
    setLoadingStage(0)
    const t1 = setTimeout(() => setLoadingStage(1), 2000)
    const t2 = setTimeout(() => setLoadingStage(2), 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [isLoading])

  // 채팅 스레드 자동 스크롤
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [chatMessages?.length, isLoading])

  // Enter 키 처리
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isLoading) {
        onSubmit()
      }
    }
  }, [inputValue, isLoading, onSubmit])

  // 예시 클릭
  const handleExampleClick = useCallback((example: string) => {
    onInputChange(example)
    textareaRef.current?.focus()
  }, [onInputChange])

  // 추천 방법 선택
  const handleSelectRecommended = useCallback(() => {
    if (recommendation?.method) {
      onSelectMethod(recommendation.method)
    }
  }, [recommendation, onSelectMethod])

  // 대안 선택
  const handleSelectAlternative = useCallback((alt: NonNullable<AIRecommendation['alternatives']>[number]) => {
    const method: StatisticalMethod = {
      id: alt.id,
      name: alt.name,
      description: alt.description || '',
      category: alt.category || 'multivariate'
    }
    onSelectMethod(method)
  }, [onSelectMethod])

  // 다시 질문하기
  const handleRetry = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  const messages = chatMessages ?? []
  const hasMessages = messages.length > 0

  return (
    <div className="space-y-5">
      {/* 안내 문구 */}
      <p className="text-sm text-muted-foreground">
        {t.naturalLanguageInput.description}
      </p>

      {/* 입력 바 */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.naturalLanguageInput.input.placeholder}
          className={cn(
            'min-h-[52px] max-h-[120px] resize-none pl-4 pr-14 py-3.5',
            'rounded-2xl bg-muted/40 text-sm',
            'border border-border/60',
            'shadow-sm',
            focusRing, 'focus-visible:border-primary/40',
            'transition-all duration-200'
          )}
          disabled={disabled || isLoading}
          rows={1}
          data-testid="ai-chat-input"
        />
        <Button
          size="icon"
          onClick={() => onSubmit()}
          disabled={disabled || isLoading || !inputValue.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl shadow-sm"
          data-testid="ai-chat-submit"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 예시 프롬프트 — flex-wrap chip */}
      {!hasMessages && !isLoading && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex flex-wrap items-center gap-2"
          data-testid="example-prompts"
        >
          <span className="text-xs text-muted-foreground/70">
            {t.naturalLanguageInput.examplesLabel}
          </span>
          {examplePrompts.map((example, index) => (
            <motion.button
              key={index}
              type="button"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15, delay: 0.03 * index }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm',
                'border border-border/50 bg-muted/30',
                'text-muted-foreground hover:text-foreground',
                'hover:border-primary/30 hover:bg-primary/[0.03]',
                'active:scale-[0.97]',
                'transition-all duration-150',
                'disabled:opacity-40 disabled:pointer-events-none'
              )}
              onClick={() => handleExampleClick(example)}
              disabled={disabled}
            >
              {example}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* 에러 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5" role="alert" aria-live="polite">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-destructive">{t.naturalLanguageInput.error.title}</p>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={onGoToGuided}>
                  {t.naturalLanguageInput.buttons.goToGuided}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 채팅 스레드 */}
      {(hasMessages || isLoading) && (
        <div
          ref={threadRef}
          className="space-y-2.5 max-h-[320px] overflow-y-auto scroll-smooth"
          data-testid="chat-thread"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/70 text-foreground'
              )}>
                {msg.role === 'assistant' && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <Sparkles className="w-3 h-3" />
                    {msg.provider === 'keyword'
                      ? t.naturalLanguageInput.providers.keyword
                      : t.naturalLanguageInput.recommendation.badgeLabel}
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                key="typing"
                className="flex justify-start"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
              >
                <div className="bg-muted/70 rounded-2xl px-4 py-2.5">
                  <TypingIndicator label={loadingMessages[loadingStage]} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 추천 결과 카드 */}
      <AnimatePresence>
        {recommendation && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* 메인 추천 */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10" data-testid="recommendation-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t.naturalLanguageInput.recommendation.badgeLabel}
                        </Badge>
                        {recommendation.confidence && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              recommendation.confidence >= 0.8 && "border-green-500 text-green-600",
                              recommendation.confidence >= 0.5 && recommendation.confidence < 0.8 && "border-yellow-500 text-yellow-600",
                              recommendation.confidence < 0.5 && "border-red-500 text-red-600"
                            )}
                          >
                            {Math.round(recommendation.confidence * 100)}{t.naturalLanguageInput.recommendation.confidenceUnit}
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mt-1">
                        {recommendation.method.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {recommendation.method.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 모호성 안내 */}
                {recommendation.ambiguityNote && (
                  <div data-testid="ambiguity-note" className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">{recommendation.ambiguityNote}</p>
                  </div>
                )}

                {/* 추천 근거 */}
                {recommendation.reasoning && recommendation.reasoning.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <span className="w-4 h-0.5 bg-primary rounded" />
                      {t.naturalLanguageInput.recommendation.reasoningTitle}
                    </p>
                    <ul className="space-y-1.5">
                      {recommendation.reasoning.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">&bull;</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 변수 할당 미리보기 */}
                {recommendation.variableAssignments && (
                  <div data-testid="variable-assignments" className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-medium">{t.naturalLanguageInput.recommendation.variableAssignmentTitle}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {recommendation.variableAssignments.dependent?.map(v => (
                        <Badge key={`dep-${v}`} variant="outline" className="text-xs border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.dependent}</span>
                        </Badge>
                      ))}
                      {recommendation.variableAssignments.independent?.map(v => (
                        <Badge key={`ind-${v}`} variant="outline" className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.independent}</span>
                        </Badge>
                      ))}
                      {recommendation.variableAssignments.factor?.map(v => (
                        <Badge key={`fac-${v}`} variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-600 dark:text-green-300">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.factor}</span>
                        </Badge>
                      ))}
                      {recommendation.variableAssignments.covariate?.map(v => (
                        <Badge key={`cov-${v}`} variant="outline" className="text-xs border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.covariate}</span>
                        </Badge>
                      ))}
                      {recommendation.variableAssignments.within?.map(v => (
                        <Badge key={`wit-${v}`} variant="outline" className="text-xs border-purple-300 text-purple-700 dark:border-purple-600 dark:text-purple-300">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.within}</span>
                        </Badge>
                      ))}
                      {recommendation.variableAssignments.between?.map(v => (
                        <Badge key={`bet-${v}`} variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-600 dark:text-orange-300">
                          {v} <span className="ml-1 opacity-60">{t.naturalLanguageInput.recommendation.variableRoles.between}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* 가정 검정 배지 — recommendation.assumptions 단일 소스 */}
                <AssumptionBadges assumptions={recommendation.assumptions} className="flex flex-wrap gap-2 pt-2" />

                {/* 경고 */}
                {recommendation.warnings && recommendation.warnings.length > 0 && (
                  <div data-testid="recommendation-warnings" className="space-y-1 pt-2 border-t">
                    {recommendation.warnings.map((warning, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 전처리 제안 (접힌 상태) */}
                {recommendation.dataPreprocessing && recommendation.dataPreprocessing.length > 0 && (
                  <div data-testid="data-preprocessing" className="pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowPreprocessing(!showPreprocessing)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <motion.span
                        animate={{ rotate: showPreprocessing ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.span>
                      {t.naturalLanguageInput.recommendation.preprocessingTitle(recommendation.dataPreprocessing.length)}
                    </button>
                    <AnimatePresence>
                      {showPreprocessing && (
                        <motion.ul
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 space-y-1"
                        >
                          {recommendation.dataPreprocessing.map((item, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-0.5">-</span>
                              {item}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 액션 버튼들 */}
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={handleSelectRecommended}
                    className="flex-1 gap-2"
                    size="lg"
                    disabled={disabled}
                    data-testid="select-recommended-method"
                  >
                    {t.naturalLanguageInput.buttons.selectMethod}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="lg"
                    disabled={disabled || isLoading}
                    className="gap-2"
                    data-testid="retry-question"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t.naturalLanguageInput.buttons.retry}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 대안 */}
            {recommendation.alternatives && recommendation.alternatives.length > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="alternatives-toggle"
                >
                  <motion.span
                    animate={{ rotate: showAlternatives ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </motion.span>
                  {t.naturalLanguageInput.recommendation.alternativesTitle(recommendation.alternatives.length)}
                </button>

                <AnimatePresence>
                  {showAlternatives && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-2"
                    >
                      {recommendation.alternatives.map((alt, index) => (
                        <Card
                          key={index}
                          className="cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => handleSelectAlternative(alt)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{alt.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {alt.description}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost">
                                {t.naturalLanguageInput.buttons.select}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 보조 경로 */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <SecondaryLink onClick={onGoToGuided} disabled={disabled || isLoading} icon={Compass} label={t.naturalLanguageInput.buttons.guidedQuestions} />
        <span className="text-border">|</span>
        <SecondaryLink onClick={onBrowseAll} disabled={disabled || isLoading} icon={List} label={t.naturalLanguageInput.buttons.browseAll} />
      </div>
    </div>
  )
})

export default NaturalLanguageInput
