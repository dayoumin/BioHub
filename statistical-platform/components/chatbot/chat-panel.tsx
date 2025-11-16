'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import { ChevronsRight, ChevronsLeft, Star, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RAGAssistantCompact } from '@/components/rag/rag-assistant-compact'
import { useUI } from '@/contexts/ui-context'
import { cn } from '@/lib/utils'

interface ChatPanelProps {
  className?: string
}

const MIN_WIDTH = 320
const MAX_WIDTH = 800
const COLLAPSED_WIDTH = 48

export function ChatPanel({ className }: ChatPanelProps) {
  const {
    chatPanelWidth,
    setChatPanelWidth,
    isChatPanelCollapsed,
    toggleChatPanelCollapse
  } = useUI()

  const [isResizing, setIsResizing] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  // 전용 챗봇 페이지 열기
  const handleOpenFullPage = useCallback(() => {
    window.open('/chatbot', '_blank', 'noopener,noreferrer')
  }, [])

  // 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  // 드래그 중
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return

      const newWidth = window.innerWidth - e.clientX

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setChatPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setChatPanelWidth])

  const currentWidth = isChatPanelCollapsed ? COLLAPSED_WIDTH : chatPanelWidth

  // 반응형 레이아웃: 너비에 따라 텍스트 표시 여부 결정 (접힌 상태에서는 계산 안함)
  const isNarrow = !isChatPanelCollapsed && chatPanelWidth < 400
  const isVeryNarrow = !isChatPanelCollapsed && chatPanelWidth < 350

  return (
    <aside
      ref={panelRef}
      style={{ width: currentWidth }}
      className={cn(
        "h-full border-l bg-background flex flex-col shadow-lg transition-all duration-300 relative",
        "animate-in slide-in-from-right",
        className
      )}
    >
      {/* 드래그 핸들 */}
      {!isChatPanelCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10",
            "hover:bg-primary/20 transition-colors",
            isResizing && "bg-primary/40"
          )}
        />
      )}

      {/* 헤더 */}
      <div className={cn(
        "flex items-center justify-between border-b bg-muted/30 flex-shrink-0",
        isChatPanelCollapsed ? "p-2" : isVeryNarrow ? "p-2" : "p-3"
      )}>
        {!isChatPanelCollapsed ? (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
              {!isNarrow && (
                <h2 className={cn(
                  "font-semibold truncate",
                  isVeryNarrow ? "text-xs" : "text-base"
                )}>
                  AI 통계 분석 도우미
                </h2>
              )}
            </div>

            {/* 우측 버튼 그룹 */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* 즐겨찾기 필터 */}
              <Button
                variant={showFavoritesOnly ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(isVeryNarrow ? "h-6 w-6" : "h-8 w-8")}
                title="즐겨찾기 필터"
              >
                <Star className={cn(
                  isVeryNarrow ? "h-3 w-3" : "h-4 w-4",
                  showFavoritesOnly && "fill-current"
                )} />
              </Button>

              {/* 전용 페이지 열기 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenFullPage}
                className={cn(isVeryNarrow ? "h-6 w-6" : "h-8 w-8")}
                title="전용 챗봇 페이지 열기 (새 창)"
              >
                <ExternalLink className={cn(isVeryNarrow ? "h-3 w-3" : "h-4 w-4")} />
              </Button>

              {/* 접기 버튼 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleChatPanelCollapse}
                className={cn(isVeryNarrow ? "h-6 w-6" : "h-8 w-8")}
                aria-label="챗봇 접기"
              >
                <ChevronsRight className={cn(isVeryNarrow ? "h-3 w-3" : "h-4 w-4")} />
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChatPanelCollapse}
            className="h-8 w-8 mx-auto"
            aria-label="챗봇 펼치기"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 챗봇 영역 - 접힌 상태에서도 공간 유지 */}
      <div className="flex-1 min-h-0">
        {!isChatPanelCollapsed && (
          <RAGAssistantCompact showFavoritesOnly={showFavoritesOnly} />
        )}
      </div>
    </aside>
  )
}
