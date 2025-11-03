/**
 * HistorySection - 프로젝트 미속 세션 섹션
 *
 * 기능:
 * - 프로젝트에 속하지 않은 세션 목록 표시
 * - 섹션 헤더 + 카운트 뱃지
 * - Collapsible (기본 펼침)
 */

import React, { useState } from 'react'
import { History, ChevronDown, ChevronRight } from 'lucide-react'
import { SessionItem } from './SessionItem'
import { Badge } from '@/components/ui/badge'
import type { ChatSession } from '@/lib/types/chat'

interface HistorySectionProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSelectSession: (sessionId: string) => void
  onToggleFavorite: (sessionId: string) => void
  onDeleteSession: (sessionId: string) => void
  onMoveSession: (sessionId: string) => void
}

export const HistorySection: React.FC<HistorySectionProps> = ({
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
    <div className="py-2">
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
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">히스토리</span>
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
