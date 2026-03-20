'use client'

/**
 * DataContextBadge — ChatInput 위에 표시되는 데이터 컨텍스트 배지
 *
 * 파일명 + 행/열 수 + 클리어 버튼.
 * 클릭 시 변수 목록 확장.
 */

import { useState, useCallback } from 'react'
import { FileSpreadsheet, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHubChatStore } from '@/lib/stores/hub-chat-store'

interface DataContextBadgeProps {
  onClear: () => void
}

export function DataContextBadge({ onClear }: DataContextBadgeProps) {
  const dataContext = useHubChatStore((s) => s.dataContext)
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  if (!dataContext) return null

  return (
    <div className="w-full max-w-[680px] mx-auto mb-2">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg',
          'border border-border bg-muted/40 text-sm'
        )}
      >
        <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />

        {/* 파일 정보 (클릭으로 확장) */}
        <button
          onClick={toggleExpand}
          aria-expanded={isExpanded}
          aria-label="데이터 상세정보 펼치기"
          className="flex items-center gap-1 text-foreground hover:text-primary transition-colors min-w-0"
        >
          <span className="truncate font-medium">{dataContext.fileName}</span>
          <span className="text-muted-foreground shrink-0">
            ({dataContext.totalRows}행 x {dataContext.columnCount}열)
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* 클리어 버튼 */}
        <button
          onClick={onClear}
          className="ml-auto p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          aria-label="데이터 제거"
          title="데이터 제거"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 확장: 변수 목록 */}
      {isExpanded && (
        <div className="mt-1 px-3 py-2 rounded-lg border border-border bg-muted/20 text-xs space-y-1">
          {dataContext.numericColumns.length > 0 && (
            <p>
              <span className="text-muted-foreground">수치형:</span>{' '}
              <span className="text-foreground">{dataContext.numericColumns.join(', ')}</span>
            </p>
          )}
          {dataContext.categoricalColumns.length > 0 && (
            <p>
              <span className="text-muted-foreground">범주형:</span>{' '}
              <span className="text-foreground">{dataContext.categoricalColumns.join(', ')}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
