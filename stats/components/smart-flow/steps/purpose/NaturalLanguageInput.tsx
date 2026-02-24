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
  MessageSquare,
  Check,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  Database,
  Hash,
  Tag,
  Info,
  Shield
} from 'lucide-react'
import { TypingIndicator } from '@/components/common/TypingIndicator'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useTerminology } from '@/hooks/use-terminology'
import type { AIRecommendation, StatisticalMethod, ValidationResults, ColumnStatistics, FlowChatMessage, StatisticalAssumptions } from '@/types/smart-flow'
import type { LlmProvider } from '@/lib/services/llm-recommender'

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
  /** 데이터 검증 결과 */
  validationResults?: ValidationResults | null
  /** AI provider 정보 */
  provider?: LlmProvider | null
  /** 멀티턴 채팅 메시지 목록 */
  chatMessages?: FlowChatMessage[]
  /** Pyodide 가정 검정 결과 (탐색 단계에서 계산된 신뢰할 수 있는 값) */
  assumptionResults?: StatisticalAssumptions | null
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
  validationResults,
  provider,
  chatMessages,
  assumptionResults
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

  // 데이터 요약 계산
  const dataSummary = useMemo(() => {
    if (!validationResults?.columns) return null
    const columns = validationResults.columns
    const numericCount = columns.filter((c: ColumnStatistics) => c.type === 'numeric').length
    const categoricalCount = columns.filter((c: ColumnStatistics) => c.type === 'categorical').length
    return {
      totalRows: validationResults.totalRows ?? 0,
      totalCols: columns.length,
      numericCount,
      categoricalCount
    }
  }, [validationResults])

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
      category: alt.category || 'advanced'
    }
    onSelectMethod(method)
  }, [onSelectMethod])

  // 다시 질문하기
  const handleRetry = useCallback(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">
            {t.purposeInput.labels.purposeHeading}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t.naturalLanguageInput.description}
        </p>
      </div>

      {/* 데이터 요약 카드 */}
      {dataSummary && (
        <Card className="bg-muted/20 border-muted" data-testid="data-summary-card">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4" />
                <span>{t.naturalLanguageInput.dataSummary.dimension(dataSummary.totalRows, dataSummary.totalCols)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-blue-500" />
                <span>{t.naturalLanguageInput.dataSummary.numeric(dataSummary.numericCount)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-green-500" />
                <span>{t.naturalLanguageInput.dataSummary.categorical(dataSummary.categoricalCount)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {t.naturalLanguageInput.dataSummary.privacyNotice}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 입력 영역 */}
      <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-4 space-y-3">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.naturalLanguageInput.input.placeholder}
            className="min-h-[80px] resize-none border-0 focus-visible:ring-0 text-base"
            disabled={disabled || isLoading}
            data-testid="ai-chat-input"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd>
              <span>{t.naturalLanguageInput.input.sendHint}</span>
              <span className="mx-1">|</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Shift+Enter</kbd>
              <span>{t.naturalLanguageInput.input.newlineHint}</span>
            </div>
            <Button
              onClick={onSubmit}
              disabled={disabled || isLoading || !inputValue.trim()}
              className="gap-2"
              data-testid="ai-chat-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.naturalLanguageInput.buttons.analyzing}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {t.naturalLanguageInput.buttons.getRecommendation}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 예시 프롬프트 — 첫 대화 전에만 표시 */}
      {(chatMessages ?? []).length === 0 && !isLoading && (
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <p className="text-sm text-muted-foreground">{t.naturalLanguageInput.examplesLabel}</p>
          <div className="flex flex-wrap gap-2" data-testid="example-prompts">
            {examplePrompts.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleExampleClick(example)}
                disabled={disabled}
              >
                {example}
              </Button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 에러 표시 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-destructive/50 bg-destructive/5" role="alert" aria-live="polite">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">{t.naturalLanguageInput.error.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={onGoToGuided}
                    >
                      {t.naturalLanguageInput.buttons.goToGuided}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 채팅 스레드 — 메시지가 있거나 로딩 중일 때 표시 */}
      {((chatMessages ?? []).length > 0 || isLoading) && (
        <div
          ref={threadRef}
          className="space-y-2 max-h-[280px] overflow-y-auto"
          data-testid="chat-thread"
        >
          {(chatMessages ?? []).map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}>
                {msg.role === 'assistant' && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    <Sparkles className="w-3 h-3" />
                    {msg.provider === 'keyword' ? '키워드 매칭' : 'AI 추천'}
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="bg-muted rounded-xl px-3 py-2.5">
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

                {/* 가정 검정 결과: Pyodide 직접 계산값 우선, 없으면 LLM 반환값 */}
                {(assumptionResults?.normality?.shapiroWilk || assumptionResults?.homogeneity?.levene) ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {assumptionResults.normality?.shapiroWilk && (
                      <Badge
                        variant={assumptionResults.normality.shapiroWilk.isNormal ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {assumptionResults.normality.shapiroWilk.isNormal
                          ? <Check className="w-3 h-3 mr-1" />
                          : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {assumptionResults.normality.shapiroWilk.isNormal ? t.naturalLanguageInput.recommendation.assumptions.normalityMet : t.naturalLanguageInput.recommendation.assumptions.normalityNotMet}
                        {assumptionResults.normality.shapiroWilk.pValue !== undefined &&
                          ` (p=${assumptionResults.normality.shapiroWilk.pValue.toFixed(3)})`}
                      </Badge>
                    )}
                    {assumptionResults.homogeneity?.levene && (
                      <Badge
                        variant={assumptionResults.homogeneity.levene.equalVariance ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {assumptionResults.homogeneity.levene.equalVariance
                          ? <Check className="w-3 h-3 mr-1" />
                          : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {assumptionResults.homogeneity.levene.equalVariance ? t.naturalLanguageInput.recommendation.assumptions.homogeneityMet : t.naturalLanguageInput.recommendation.assumptions.homogeneityNotMet}
                        {assumptionResults.homogeneity.levene.pValue !== undefined &&
                          ` (p=${assumptionResults.homogeneity.levene.pValue.toFixed(3)})`}
                      </Badge>
                    )}
                  </div>
                ) : recommendation.assumptions && recommendation.assumptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {recommendation.assumptions.map((assumption, index) => (
                      <Badge
                        key={index}
                        variant={assumption.passed ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {assumption.passed ? <Check className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {assumption.name}
                        {assumption.pValue !== undefined && ` (p=${assumption.pValue.toFixed(3)})`}
                      </Badge>
                    ))}
                  </div>
                ) : null}

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

      {/* 하단 링크 */}
      <div className="flex items-center justify-center gap-4 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoToGuided}
          disabled={disabled || isLoading}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="w-4 h-4" />
          {t.naturalLanguageInput.buttons.guidedQuestions}
        </Button>
        <span className="text-muted-foreground">|</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBrowseAll}
          disabled={disabled || isLoading}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <List className="w-4 h-4" />
          {t.naturalLanguageInput.buttons.browseAll}
        </Button>
      </div>
    </div>
  )
})

export default NaturalLanguageInput
