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
      {/* 좌측 경계선 - 드래그 핸들 + 접기 버튼 */}
      <div className="absolute left-0 top-0 bottom-0 w-0 z-20">
        {/* 드래그 핸들 */}
        {!isChatPanelCollapsed && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 cursor-col-resize",
              "hover:bg-primary/20 transition-colors",
              isResizing && "bg-primary/40"
            )}
          />
        )}

        {/* 접기/펼치기 버튼 */}
        <button
          onClick={toggleChatPanelCollapse}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -left-3",
            "bg-background border border-border rounded-full p-1.5 shadow-md",
            "hover:bg-muted transition-colors",
            "flex items-center justify-center"
          )}
          aria-label={isChatPanelCollapsed ? "챗봇 펼치기" : "챗봇 접기"}
          title={isChatPanelCollapsed ? "챗봇 펼치기" : "챗봇 접기"}
        >
          {isChatPanelCollapsed ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* 헤더 */}
      <div className={cn(
        "flex items-center justify-between bg-background flex-shrink-0",
        isChatPanelCollapsed ? "h-[66px] px-2" : "h-[66px] px-3"
      )}>
        {!isChatPanelCollapsed ? (
          <>
            <div className="flex items-center justify-center min-w-0 flex-1">
              {!isNarrow && (
                <h2 className={cn(
                  "font-semibold text-center",
                  isVeryNarrow ? "text-xs" : "text-base"
                )}>
                  AI 통계 챗봇
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
            </div>
          </>
        ) : (
          // 접힌 상태: 헤더 비워둠 (접기 버튼은 좌측 경계선에 있음)
          <div className="w-full" />
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
