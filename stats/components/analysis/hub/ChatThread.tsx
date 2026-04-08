'use client'

/**
 * ChatThread — 허브 채팅 대화 스레드
 *
 * hubChatStore.messages를 스크롤 가능한 버블 UI로 렌더링.
 * - user: 우측 정렬
 * - assistant: 좌측 + 추천카드 + 업로드 유도 CTA
 * - system: 중앙 muted (데이터 로드 알림 등)
 */

import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, User, AlertCircle, RefreshCw, Upload, Trash2, Activity, ArrowRight, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import { Button } from '@/components/ui/button'
import { RecommendationCard } from '@/components/common/RecommendationCard'
import { TypingIndicator } from '@/components/common/TypingIndicator'
import { useHubChatStore, type HubChatMessage } from '@/lib/stores/hub-chat-store'
import type { DiagnosticReport, MethodRecommendation, AIRecommendation } from '@/types/analysis'

// ===== Props =====

interface ChatThreadProps {
  /** 추천 카드 클릭 → 분석 시작 */
  onMethodSelect: (methodId: string) => void
  /** 업로드 유도 CTA 클릭 */
  onUploadClick?: () => void
  /** 새 대화 시작 (대화 초기화) */
  onClearChat?: () => void
  /** 에러 메시지 재시도 — errorMessageId 이전의 마지막 user 메시지 재전송 */
  onRetry?: (errorMessageId: string) => void
  /** "분석 시작하기" 클릭 — 해당 메시지의 report + 원본 AIRecommendation 전달 */
  onDiagnosticStart?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  /** "다른 방법 찾아보기" 클릭 — 해당 메시지의 report + 원본 AIRecommendation 전달 */
  onAlternativeSearch?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
}

// ===== Animation =====

const bubbleVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

// ===== Component =====

export function ChatThread({
  onMethodSelect,
  onUploadClick,
  onClearChat,
  onRetry,
  onDiagnosticStart,
  onAlternativeSearch,
}: ChatThreadProps) {
  const messages = useHubChatStore((s) => s.messages)
  const isStreaming = useHubChatStore((s) => s.isStreaming)
  const streamingStatus = useHubChatStore((s) => s.streamingStatus)
  const scrollRef = useRef<HTMLDivElement>(null)

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
            <Trash2 className="w-3 h-3" />
            새 대화
          </Button>
        </div>
      )}

      {/* 메시지 스레드 */}
      <div
        ref={scrollRef}
        className="max-h-[400px] overflow-y-auto space-y-3 scroll-smooth"
        role="log"
        aria-label="대화 기록"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onMethodSelect={onMethodSelect}
              onUploadClick={onUploadClick}
              onRetry={onRetry}
              onDiagnosticStart={onDiagnosticStart}
              onAlternativeSearch={onAlternativeSearch}
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
              {streamingStatus ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="w-3.5 h-3.5 animate-pulse text-primary" />
                  {streamingStatus}
                </div>
              ) : (
                <TypingIndicator size="sm" />
              )}
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
  onMethodSelect: (methodId: string) => void
  onUploadClick?: () => void
  onRetry?: (errorMessageId: string) => void
  onDiagnosticStart?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
  onAlternativeSearch?: (report: DiagnosticReport, recommendation: AIRecommendation) => void
}

function MessageBubble({ message, onMethodSelect, onUploadClick, onRetry, onDiagnosticStart, onAlternativeSearch }: MessageBubbleProps) {
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
              오류 발생
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
              다시 시도
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
          />
        )}

        {/* pendingClarification 선택지 */}
        {diagnosticReport?.pendingClarification && (
          <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
            {diagnosticReport.pendingClarification.candidateColumns.slice(0, 8).map(col => (
              <div key={col.column} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">[{col.column}]</span>
                {' '}{col.type === 'categorical' ? '범주형' : '수치형'}
                {col.uniqueValues != null && ` · ${col.uniqueValues}개 고유값`}
                {col.sampleGroups?.length ? ` (${col.sampleGroups.join(', ')})` : ''}
              </div>
            ))}
          </div>
        )}

        {/* 추천 카드 (인라인) */}
        {recommendations && recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.methodId}
                recommendation={rec}
                onSelect={onMethodSelect}
              />
            ))}
          </div>
        )}

        {/* 데이터 업로드 유도 CTA */}
        {suggestUpload && onUploadClick && (
          <button
            onClick={onUploadClick}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg',
              'border border-dashed border-primary/30 bg-primary/5',
              'text-xs text-primary hover:bg-primary/10 transition-colors',
              'w-full justify-center',
              focusRing
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            데이터를 업로드하면 더 정확한 분석을 추천해 드릴 수 있어요
          </button>
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
}

function DiagnosticReportCard({ report, onStart, onBrowse }: DiagnosticReportCardProps) {
  const { basicStats, assumptions } = report

  return (
    <div className="bg-muted/40 rounded-xl p-3 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
        <Activity className="w-3.5 h-3.5 text-primary" />
        데이터 진단 결과
      </div>

      {/* 기초통계 */}
      <div className="text-muted-foreground">
        {basicStats.totalRows}행
        {basicStats.groups?.length ? ` · ${basicStats.groups.length}개 그룹 (${basicStats.groups.map(g => g.name).join(', ')})` : ''}
        {basicStats.numericSummaries.length > 0 && ` · 수치변수 ${basicStats.numericSummaries.length}개`}
      </div>

      {/* 가정 검정 */}
      {assumptions && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={assumptions.normality.overallPassed ? 'stat-significant' : 'stat-non-significant'}>
              정규성: {assumptions.normality.overallPassed ? '충족' : '미충족'}
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
                등분산: {assumptions.homogeneity.levene.equalVariance ? '충족' : '미충족'}
              </span>
              <span className="text-muted-foreground ml-1">
                (Levene p={assumptions.homogeneity.levene.pValue.toFixed(3)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      {(onStart || onBrowse) && (
        <div className="flex gap-2 pt-1">
          {onStart && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10"
              onClick={onStart}
            >
              분석 시작하기
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
          {onBrowse && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground"
              onClick={onBrowse}
            >
              <List className="w-3.5 h-3.5" />
              다른 방법 찾아보기
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
