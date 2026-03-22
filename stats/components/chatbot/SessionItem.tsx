/**
 * SessionItem - 재사용 가능한 세션 아이템 컴포넌트
 *
 * 기능:
 * - 세션 제목 표시 (truncate)
 * - 활성 상태 하이라이트
 * - 호버 시 액션 버튼 (즐겨찾기, 이동, 삭제)
 * - 타임스탬프 표시 (상대 시간)
 */

import React from 'react'
import { FolderInput, Trash2, Pin, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatSession } from '@/lib/types/chat'
import { cn } from '@/lib/utils'
import { formatTimeAgo } from '@/lib/utils/format-time'

interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: (sessionId: string) => void
  onToggleFavorite: (sessionId: string) => void
  onDelete: (sessionId: string) => void
  onMove: (sessionId: string) => void
  showFavoriteIndicator?: boolean
}

/** 상대 시간 표시 — 7일 이후 날짜 전환 */
const formatRelativeTime = (timestamp: number): string =>
  formatTimeAgo(timestamp, undefined, 7)

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onToggleFavorite,
  onDelete,
  onMove,
  showFavoriteIndicator = true,
}) => {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 cursor-pointer rounded-md transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent border-l-2 border-primary'
      )}
      onClick={() => onSelect(session.id)}
    >
      {/* 즐겨찾기 아이콘 (항상 공간 확보) */}
      <div className="w-3 h-3 flex-shrink-0">
        {session.isFavorite && showFavoriteIndicator && (
          <Pin className="h-3 w-3 text-muted-foreground" />
        )}
      </div>

      {/* 세션 제목 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {session.title}
        </p>
      </div>

      {/* 호버 시 액션 버튼 */}
      <div className="hidden group-hover:flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(session.id)
          }}
          title={session.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
        >
          {session.isFavorite ? (
            <Pin className="h-3 w-3 text-muted-foreground" />
          ) : (
            <MapPin className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onMove(session.id)
          }}
          title="프로젝트 이동"
        >
          <FolderInput className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(session.id)
          }}
          title="삭제"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
