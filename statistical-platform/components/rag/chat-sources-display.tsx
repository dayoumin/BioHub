/**
 * RAG 참조 문서 표시 컴포넌트
 *
 * RAGAssistant, RAGChatInterface에서 공통으로 사용하는 컴포넌트
 * - 참조 문서 목록 표시
 * - 관련도 시각화 (프로그레스 바)
 * - 확장/축소 토글
 *
 * 스타일: RAGChatInterface 기준 (더 정교함)
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ChatSource } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

export interface ChatSourcesDisplayProps {
  /** 참조 문서 배열 */
  sources: ChatSource[]
  /** 기본 확장 상태 (기본: false) */
  defaultExpanded?: boolean
  /** 확장 상태 변경 콜백 */
  onExpandChange?: (expanded: boolean) => void
  /** 추가 스타일 */
  className?: string
}

/**
 * RAG 참조 문서 표시 컴포넌트
 *
 * @example
 * <ChatSourcesDisplay
 *   sources={response.sources}
 *   defaultExpanded={false}
 *   onExpandChange={(expanded) => console.log('Toggled:', expanded)}
 * />
 */
export function ChatSourcesDisplay({
  sources,
  defaultExpanded = false,
  onExpandChange,
  className,
}: ChatSourcesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const handleToggle = () => {
    const newState = !isExpanded
    setIsExpanded(newState)
    onExpandChange?.(newState)
  }

  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-4 pt-3 border-t border-border/50', className)}>
      {/* 헤더 버튼 */}
      <button
        onClick={handleToggle}
        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full">
          📚 참조 문서
          <span className="font-bold">({sources.length})</span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {/* 문서 목록 */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {sources.map((source, idx) => (
            <div
              key={idx}
              className="text-xs bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20"
            >
              {/* 제목 */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{source.title}</div>

                  {/* 내용 */}
                  <div className="text-muted-foreground mt-1.5 leading-relaxed">
                    {source.content}
                  </div>
                </div>
              </div>

              {/* 관련도 표시 */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                <span className="text-muted-foreground">관련도:</span>
                <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${source.score * 100}%` }}
                  />
                </div>
                <span className="font-semibold text-primary">
                  {(source.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
