/**
 * FavoritesSection - 즐겨찾기 세션 섹션
 *
 * 기능:
 * - 즐겨찾기한 세션 목록 표시
 * - 섹션 헤더 + 카운트 뱃지
 * - 비어있으면 안내 메시지
 * - Collapsible (접기/펼치기)
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Pin } from 'lucide-react'
import { SessionItem } from './SessionItem'
import { Badge } from '@/components/ui/badge'
import type { ChatSession } from '@/lib/types/chat'

interface FavoritesSectionProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onToggleFavorite: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onMoveSession: (sessionId: string) => void
}

export const FavoritesSection: React.FC<FavoritesSectionProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onToggleFavorite,
  onDeleteSession,
  onMoveSession,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  if (sessions.length === 0) {
    return null
  }

  return (
    <div className="border-b py-2">
      {/* 섹션 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-md transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Pin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">즐겨찾기</span>
        <Badge variant="secondary" className="ml-auto">
          {sessions.length}
        </Badge>
      </button>

      {/* 세션 목록 */}
      {isExpanded && (
        <div className="mt-1 space-y-1 px-2">
          {sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={onSelectSession}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDeleteSession}
              onMove={onMoveSession}
            />
          ))}
        </div>
      )}
    </div>
  )
}
