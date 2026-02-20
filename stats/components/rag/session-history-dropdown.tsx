/**
 * SessionHistoryDropdown - 채팅 목록 드롭다운
 *
 * 기능:
 * - 세션 목록 표시 (드롭다운)
 * - 세션 선택 시 자동 닫힘
 * - 현재 세션 하이라이트
 */

'use client'

import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ChatSession } from '@/lib/types/chat'

interface SessionHistoryDropdownProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export function SessionHistoryDropdown({
  sessions,
  currentSessionId,
  onSelectSession
}: SessionHistoryDropdownProps) {
  // 즐겨찾기 우선 정렬 후 최근 20개만 표시
  const sortedSessions = [...sessions].sort((a, b) => {
    // 즐겨찾기 우선
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    // 같은 그룹 내에서는 최신순
    return b.updatedAt - a.updatedAt
  })
  const recentSessions = sortedSessions.slice(0, 20)

  if (sessions.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="flex-shrink-0 bg-background hover:bg-muted h-8 w-8"
          title="채팅 목록"
        >
          <History className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>채팅 목록</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentSessions.map((session) => (
          <DropdownMenuItem
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={currentSessionId === session.id ? 'bg-accent' : ''}
          >
            <div className="flex flex-col gap-1 w-full">
              <span className="text-sm font-medium truncate">{session.title}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(session.updatedAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
        {sessions.length > 20 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
              + {sessions.length - 20}개 더 있음
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
