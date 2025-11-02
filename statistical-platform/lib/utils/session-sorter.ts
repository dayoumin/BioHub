/**
 * 세션 정렬 유틸리티
 *
 * 즐겨찾기 우선 → 최근 업데이트 순으로 정렬
 */

import type { ChatSession } from '@/lib/types/chat'

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
