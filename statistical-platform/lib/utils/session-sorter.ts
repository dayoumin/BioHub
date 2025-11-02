/**
 * 세션 정렬 유틸리티
 *
 * 즐겨찾기 우선 → 최근 업데이트 순으로 정렬
 */

import type { ChatSession } from '@/lib/types/chat'
import { ChatStorage } from '@/lib/services/chat-storage'

/**
 * 세션 정렬 (즐겨찾기 우선 → 최근 업데이트 순)
 *
 * @param sessions - 정렬할 세션 배열
 * @returns 정렬된 세션 배열
 *
 * @example
 * ```typescript
 * const sessions = ChatStorage.loadSessions()
 * const sorted = sortSessionsByFavoriteAndRecent(sessions)
 * ```
 */
export function sortSessionsByFavoriteAndRecent(
  sessions: ChatSession[]
): ChatSession[] {
  return sessions.sort((a, b) => {
    // 1. 즐겨찾기 우선
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1

    // 2. 같은 그룹 내에서는 최근 업데이트 순
    return b.updatedAt - a.updatedAt
  })
}

/**
 * 새 대화 생성 로직 (handleNewChat 패턴)
 *
 * 테스트 가능한 순수 함수로 추출
 * - 새 세션 생성
 * - storage 재로드 (cleanupIfNeeded 반영)
 * - 즐겨찾기 우선 정렬
 *
 * @returns 정렬된 세션 배열과 새 세션 ID
 */
export function createNewChatSession(): {
  sessions: ChatSession[]
  newSessionId: string
} {
  const newSession = ChatStorage.createNewSession()
  const updatedSessions = ChatStorage.loadSessions()
  const sortedSessions = sortSessionsByFavoriteAndRecent(updatedSessions)

  return {
    sessions: sortedSessions,
    newSessionId: newSession.id,
  }
}
