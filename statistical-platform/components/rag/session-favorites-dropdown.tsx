/**
 * SessionFavoritesDropdown - 즐겨찾기 세션 드롭다운
 *
 * 기능:
 * - 즐겨찾기 세션 목록 표시 (드롭다운)
 * - 세션 선택 시 자동 닫힘
 * - 현재 세션 하이라이트
 */

'use client'

import { Star } from 'lucide-react'
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

interface SessionFavoritesDropdownProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (sessionId: string) => void
}

export function SessionFavoritesDropdown({
  sessions,
  currentSessionId,
  onSelectSession
}: SessionFavoritesDropdownProps) {
  const favoriteSessions = sessions.filter((s) => s.isFavorite)

  if (favoriteSessions.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="flex-shrink-0 bg-background hover:bg-muted h-8 w-8"
          title="즐겨찾기"
        >
          <Star className="h-4 w-4 fill-current text-yellow-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>즐겨찾기</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {favoriteSessions.map((session) => (
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
