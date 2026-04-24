'use client'

/**
 * ChatThread — 허브 채팅 대화 스레드
 *
 * hubChatStore.messages를 스크롤 가능한 버블 UI로 렌더링.
 * - user: 우측 정렬
 * - assistant: 좌측 + 추천카드 + 업로드 유도 CTA
 * - system: 중앙 muted (데이터 로드 알림 등)
 */

import { useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, AlertCircle, RefreshCw, Upload, SquarePen, Activity, ArrowRight, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/common/RecommendationCard'
import { VariablePicker } from './VariablePicker'
import { useTerminology } from '@/hooks/use-terminology'
import { isEnglishLanguage } from '@/lib/preferences'

import { useHubChatStore, type HubChatMessage } from '@/lib/stores/hub-chat-store'
import type { DiagnosticReport, MethodRecommendation, AIRecommendation } from '@/types/analysis'

// ===== Props =====

interface ChatThreadProps {
  activeClarificationMessageId?: string | null
  /** 추천 카드 클릭 → 분석 시작 */
  onMethodSelect: (methodId: string) => void
  /** 업로드 유도 CTA 클릭 (fallback — Step 1 이동) */
  onUploadClick?: () => void
  /** 인라인 파일 선택 시 (허브에서 바로 업로드) */
  onFileSelected?: (file: File) => void
  /** 새 대화 시작 (대화 초기화) */
  onClearChat?: () => void
  /** 에러 메시지 재시도 — errorMessageId 이전의 마지막 user 메시지 재전송 */
  onRetry?: (errorMessageId: string) => void
  /** "분석 시작하기" 클릭 — 해당 메시지의 report + 원본 AIRecommendation 전달 */
  onDiagnosticStart?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  /** "다른 방법 찾아보기" 클릭 — 해당 메시지의 report + 원본 AIRecommendation 전달 */
  onAlternativeSearch?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  onVariableConfirm?: (assignments: NonNullable<AIRecommendation['variableAssignments']>) => void
  onClarificationCancel?: () => void
  onSuggestedMethodSelect?: (report: DiagnosticReport, recommendation: MethodRecommendation) => void
}

interface ChatThreadCopy {
  clearChat: string
  chatLogAriaLabel: string
  defaultStreamingStatus: string
  errorTitle: string
  retry: string
  diagnosticTitle: string
  rowsSuffix: string
  groupsSummary: (count: number, names: string) => string
  numericVariablesSummary: (count: number) => string
  normalityLabel: string
  homogeneityLabel: string
  assumptionPassed: string
  assumptionFailed: string
  startAnalysis: string
  browseAlternatives: string
  recommendationFailure: string
  uploadCta: string
}

// ===== Animation =====

const bubbleVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// ===== Component =====

export function ChatThread({
  activeClarificationMessageId,
  onMethodSelect,
  onUploadClick,
  onFileSelected,
  onClearChat,
  onRetry,
  onDiagnosticStart,
  onAlternativeSearch,
  onVariableConfirm,
  onClarificationCancel,
  onSuggestedMethodSelect,
}: ChatThreadProps) {
  const t = useTerminology()
  const isEnglish = isEnglishLanguage(t.language)
  const messages = useHubChatStore((s) => s.messages)
  const isStreaming = useHubChatStore((s) => s.isStreaming)
  const streamingStatus = useHubChatStore((s) => s.streamingStatus)
  const scrollRef = useRef<HTMLDivElement>(null)
  const copy = useMemo<ChatThreadCopy>(() => (
    isEnglish
      ? {
        clearChat: 'New chat',
        chatLogAriaLabel: 'Conversation history',
        defaultStreamingStatus: 'Finding the best analysis approach...',
        errorTitle: 'Error',
        retry: 'Retry',
        diagnosticTitle: 'Diagnostic summary',
        rowsSuffix: ' rows',
        groupsSummary: (count, names) => ` · ${count} groups (${names})`,
        numericVariablesSummary: (count) => ` · ${count} numeric variables`,
        normalityLabel: 'Normality',
        homogeneityLabel: 'Homogeneity',
        assumptionPassed: 'Passed',
        assumptionFailed: 'Failed',
        startAnalysis: 'Start analysis',
        browseAlternatives: 'Browse alternatives',
        recommendationFailure: 'Failed to generate recommendations. Please try asking again.',
        uploadCta: 'Upload data for more accurate analysis recommendations',
      }
      : {
        clearChat: '새 대화',
        chatLogAriaLabel: '대화 기록',
        defaultStreamingStatus: '분석 방법을 찾고 있습니다...',
        errorTitle: '오류 발생',
        retry: '다시 시도',
        diagnosticTitle: '데이터 진단 결과',
        rowsSuffix: '행',
        groupsSummary: (count, names) => ` · ${count}개 그룹 (${names})`,
        numericVariablesSummary: (count) => ` · 수치변수 ${count}개`,
        normalityLabel: '정규성',
        homogeneityLabel: '등분산',
        assumptionPassed: '충족',
        assumptionFailed: '미충족',
        startAnalysis: '분석 시작하기',
        browseAlternatives: '다른 방법 찾아보기',
        recommendationFailure: '추천 생성에 실패했습니다. 다시 질문해 주세요.',
        uploadCta: '데이터를 업로드하면 더 정확한 분석을 추천해 드릴 수 있어요',
      }
  ), [isEnglish])

  // 새 메시지 추가 시 자동 스크롤
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, isStreaming])

  const handleClear = useCallback(() => {
    onClearChat?.()
  }, [onClearChat])

  if (messages.length === 0 && !isStreaming) return null

  return (
    <div className="w-full max-w-[680px] mx-auto mb-4">
      {/* 헤더: 새 대화 버튼 */}
      {messages.length > 0 && (
        <div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <SquarePen className="w-3 h-3" />
            {copy.clearChat}
          </Button>
        </div>
      )}

      {/* 메시지 스레드 */}
      <div
        ref={scrollRef}
        className="max-h-[560px] overflow-y-auto space-y-3 scroll-smooth"
        role="log"
        aria-label={copy.chatLogAriaLabel}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isActiveClarification={msg.id === activeClarificationMessageId}
              onMethodSelect={onMethodSelect}
              onUploadClick={onUploadClick}
              onFileSelected={onFileSelected}
              onRetry={onRetry}
              onDiagnosticStart={onDiagnosticStart}
              onAlternativeSearch={onAlternativeSearch}
              onVariableConfirm={onVariableConfirm}
              onClarificationCancel={onClarificationCancel}
              onSuggestedMethodSelect={onSuggestedMethodSelect}
              copy={copy}
            />
          ))}
        </AnimatePresence>

        {/* 스트리밍 인디케이터 */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 px-1"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="w-3.5 h-3.5 animate-pulse text-primary" />
                {streamingStatus ?? copy.defaultStreamingStatus}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ===== Message Bubble =====

interface MessageBubbleProps {
  message: HubChatMessage
  isActiveClarification: boolean
  onMethodSelect: (methodId: string) => void
  onUploadClick?: () => void
  onFileSelected?: (file: File) => void
  onRetry?: (errorMessageId: string) => void
  onDiagnosticStart?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  onAlternativeSearch?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  onVariableConfirm?: (assignments: NonNullable<AIRecommendation['variableAssignments']>) => void
  onClarificationCancel?: () => void
  onSuggestedMethodSelect?: (report: DiagnosticReport, recommendation: MethodRecommendation) => void
  copy: ChatThreadCopy
}

function MessageBubble({
  message,
  isActiveClarification,
  onMethodSelect,
  onUploadClick,
  onFileSelected,
  onRetry,
  onDiagnosticStart,
  onAlternativeSearch,
  onVariableConfirm,
  onClarificationCancel,
  onSuggestedMethodSelect,
  copy,
}: MessageBubbleProps) {
  const { role, content, recommendations, isError, suggestUpload, diagnosticReport, diagnosticRecommendation } = message

  // System 메시지: 중앙 배치, 컴팩트
  if (role === 'system') {
    return (
      <motion.div
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex justify-center"
      >
        <span className="text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          {content}
        </span>
      </motion.div>
    )
  }

  // User 메시지: 우측 정렬
  if (role === 'user') {
    return (
      <motion.div
        variants={bubbleVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex justify-end gap-2 px-1"
      >
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%]">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-primary" />
        </div>
      </motion.div>
    )
  }

  // Assistant 메시지: 좌측 정렬
  return (
    <motion.div
      variants={bubbleVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex items-start gap-2 px-1"
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      <div className="max-w-[85%] space-y-2">
        {/* 텍스트 내용 */}
        <div
          className={cn(
            'bg-muted/60 rounded-2xl rounded-tl-sm px-4 py-2.5',
            isError && 'border border-destructive/30 bg-destructive/5'
          )}
        >
          {isError && (
            <div className="flex items-center gap-1.5 text-destructive text-xs mb-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {copy.errorTitle}
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>

          {/* 에러 재시도 버튼 */}
          {isError && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs gap-1 text-muted-foreground"
              onClick={() => onRetry(message.id)}
            >
              <RefreshCw className="w-3 h-3" />
              {copy.retry}
            </Button>
          )}
        </div>

        {/* 진단 리포트 카드 — 원본 AIRecommendation이 있을 때만 액션 버튼 표시 */}
        {diagnosticReport && !diagnosticReport.pendingClarification && (
          <DiagnosticReportCard
            report={diagnosticReport}
            onStart={diagnosticRecommendation && onDiagnosticStart
              ? () => onDiagnosticStart(diagnosticReport, diagnosticRecommendation)
              : undefined}
            onBrowse={diagnosticRecommendation && onAlternativeSearch
              ? () => onAlternativeSearch(diagnosticReport, diagnosticRecommendation)
              : undefined}
            copy={copy}
          />
        )}

        {/* pendingClarification 선택지 */}
        {diagnosticReport?.pendingClarification && isActiveClarification && (
          <VariablePicker
            candidateColumns={diagnosticReport.pendingClarification.candidateColumns}
            partialAssignments={diagnosticReport.variableAssignments ?? null}
            missingRoles={diagnosticReport.pendingClarification.missingRoles}
            suggestedAnalyses={diagnosticReport.pendingClarification.suggestedAnalyses}
            onConfirm={onVariableConfirm!}
            onCancel={onClarificationCancel!}
            onSelectSuggestedMethod={
              onSuggestedMethodSelect
                ? (recommendation) => onSuggestedMethodSelect(diagnosticReport, recommendation)
                : undefined
            }
          />
        )}

        {/* 추천 카드 — 진단 카드가 있으면 중복이므로 숨김 */}
        {!diagnosticReport && recommendations && recommendations.length > 0 && (
          <div className="flex flex-col gap-1">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.methodId}
                recommendation={rec}
                onSelect={onMethodSelect}
              />
            ))}
          </div>
        )}

        {/* 데이터 업로드 유도 CTA — 인라인 파일 선택 우선, fallback은 Step 1 이동 */}
        {suggestUpload && (onFileSelected || onUploadClick) && (
          <UploadCta copy={copy} onFileSelected={onFileSelected} onUploadClick={onUploadClick} />
        )}
      </div>
    </motion.div>
  )
}

// ===== Diagnostic Report Card =====

interface DiagnosticReportCardProps {
  report: DiagnosticReport
  onStart?: () => void
  onBrowse?: () => void
  copy: ChatThreadCopy
}

function DiagnosticReportCard({ report, onStart, onBrowse, copy }: DiagnosticReportCardProps) {
  const { basicStats, assumptions } = report

  return (
    <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
        <Activity className="w-3.5 h-3.5 text-primary" />
        {copy.diagnosticTitle}
      </div>

      {/* 기초통계 */}
      <div className="text-muted-foreground">
        {basicStats.totalRows}{copy.rowsSuffix}
        {basicStats.groups?.length ? copy.groupsSummary(basicStats.groups.length, basicStats.groups.map(g => g.name).join(', ')) : ''}
        {basicStats.numericSummaries.length > 0 && copy.numericVariablesSummary(basicStats.numericSummaries.length)}
      </div>

      {/* 가정 검정 */}
      {assumptions && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={assumptions.normality.overallPassed ? 'stat-significant' : 'stat-non-significant'}>
              {copy.normalityLabel}: {assumptions.normality.overallPassed ? copy.assumptionPassed : copy.assumptionFailed}
            </span>
            {assumptions.normality.groups.length <= 4 && (
              <span className="text-muted-foreground">
                ({assumptions.normality.groups.map(g => `${g.groupName} p=${g.pValue.toFixed(3)}`).join(', ')})
              </span>
            )}
          </div>
          {assumptions.homogeneity && (
            <div>
              <span className={assumptions.homogeneity.levene.equalVariance ? 'stat-significant' : 'stat-non-significant'}>
                {copy.homogeneityLabel}: {assumptions.homogeneity.levene.equalVariance ? copy.assumptionPassed : copy.assumptionFailed}
              </span>
              <span className="text-muted-foreground ml-1">
                (Levene p={assumptions.homogeneity.levene.pValue.toFixed(3)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 — 추천 있을 때 */}
      {(onStart || onBrowse) && (
        <div className="flex gap-2 pt-1">
          {onStart && (
            <Button
              variant="default"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={onStart}
            >
              {copy.startAnalysis}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
          {onBrowse && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={onBrowse}
            >
              <List className="w-3.5 h-3.5" />
              {copy.browseAlternatives}
            </Button>
          )}
        </div>
      )}

      {/* 추천 실패 시 안내 — 데이터는 정상이고 LLM 추천만 실패한 경우 */}
      {!onStart && !onBrowse && (
        <p className="text-muted-foreground pt-1">
          {copy.recommendationFailure}
        </p>
      )}
    </div>
  )
}

// ===== Upload CTA (inline file picker) =====

function UploadCta({
  copy,
  onFileSelected,
  onUploadClick,
}: {
  copy: ChatThreadCopy
  onFileSelected?: (file: File) => void
  onUploadClick?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = useCallback(() => {
    if (onFileSelected && fileInputRef.current) {
      fileInputRef.current.click()
    } else {
      onUploadClick?.()
    }
  }, [onFileSelected, onUploadClick])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileSelected) onFileSelected(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [onFileSelected])

  return (
    <>
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'border border-dashed border-primary/30 bg-primary/5',
          'text-xs text-primary hover:bg-primary/10 transition-colors',
          'w-full justify-center',
          focusRing
        )}
      >
        <Upload className="w-3.5 h-3.5" />
        {copy.uploadCta}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  )
}
