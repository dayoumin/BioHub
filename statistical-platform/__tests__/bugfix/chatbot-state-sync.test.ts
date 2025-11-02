/**
 * 챗봇 상태 동기화 버그 수정 검증 테스트
 *
 * High Priority Bug:
 * - handleNewChat에서 cleanupIfNeeded() 후 세션 상태가 동기화되지 않는 문제
 *
 * Medium Priority Bug:
 * - queryRAG 실패 시 onSessionUpdate 누락 문제
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession } from '@/lib/types/chat'

// LocalStorage Mock
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }
}

global.localStorage = new LocalStorageMock() as Storage

describe('챗봇 상태 동기화 버그 수정', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    ChatStorage.clearAll()
  })

  describe('High: handleNewChat 세션 상태 동기화', () => {
    it('20개 초과 시 cleanupIfNeeded()로 삭제된 세션이 storage와 동기화되어야 함', () => {
      // 1. 20개 세션 생성 (즐겨찾기 없음)
      const sessionIds: string[] = []
      for (let i = 0; i < 20; i++) {
        const session = ChatStorage.createNewSession()
        sessionIds.push(session.id)

        // 시간차를 두기 위해 updatedAt 조작
        const sessions = JSON.parse(
          localStorage.getItem('rag-chat-sessions') ?? '[]'
        ) as ChatSession[]
        const lastSession = sessions[sessions.length - 1]
        if (lastSession) {
          lastSession.updatedAt = Date.now() - (20 - i) * 1000
          localStorage.setItem('rag-chat-sessions', JSON.stringify(sessions))
        }
      }

      // 2. 21번째 세션 생성 (가장 오래된 세션이 자동 삭제됨)
      const newSession = ChatStorage.createNewSession()

      // 3. storage에서 다시 로드 (실제 handleNewChat 패턴)
      const updatedSessions = ChatStorage.loadSessions()

      // 4. 검증: 20개만 존재해야 함
      expect(updatedSessions).toHaveLength(20)

      // 5. 검증: 가장 오래된 세션은 존재하지 않아야 함
      const oldestSession = updatedSessions.find(s => s.id === sessionIds[0])
      expect(oldestSession).toBeUndefined()

      // 6. 검증: 새 세션은 존재해야 함
      const newSessionExists = updatedSessions.find(s => s.id === newSession.id)
      expect(newSessionExists).toBeDefined()
    })

    it('삭제된 세션 ID로 addMessage 호출 시 에러를 던져야 함', () => {
      // 1. 세션 생성
      const session = ChatStorage.createNewSession()
      const sessionId = session.id

      // 2. 세션 삭제
      ChatStorage.deleteSession(sessionId)

      // 3. 검증: 삭제된 세션에 메시지 추가 시 에러
      expect(() => {
        ChatStorage.addMessage(sessionId, {
          id: 'msg-1',
          role: 'user',
          content: 'test',
          timestamp: Date.now(),
        })
      }).toThrow('메시지 추가에 실패했습니다')
    })

    it('즐겨찾기 세션은 20개 초과 시에도 삭제되지 않아야 함', () => {
      // 1. 즐겨찾기 세션 생성
      const favoriteSession = ChatStorage.createNewSession()
      ChatStorage.toggleFavorite(favoriteSession.id)

      // 2. 20개 일반 세션 생성
      for (let i = 0; i < 20; i++) {
        ChatStorage.createNewSession()
      }

      // 3. storage에서 다시 로드
      const updatedSessions = ChatStorage.loadSessions()

      // 4. 검증: 즐겨찾기 세션은 여전히 존재해야 함
      const favorite = updatedSessions.find(s => s.id === favoriteSession.id)
      expect(favorite).toBeDefined()
      expect(favorite?.isFavorite).toBe(true)
    })
  })

  describe('Medium: queryRAG 실패 시 onSessionUpdate 누락', () => {
    it('에러 메시지 저장 후 세션을 다시 로드할 수 있어야 함', () => {
      // 1. 세션 생성
      const session = ChatStorage.createNewSession()

      // 2. 사용자 메시지 추가
      ChatStorage.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 't-test는 무엇인가요?',
        timestamp: Date.now(),
      })

      // 3. 에러 메시지 추가 (queryRAG 실패 시나리오)
      ChatStorage.addMessage(session.id, {
        id: 'msg-2',
        role: 'assistant',
        content: '오류가 발생했습니다: Network error',
        timestamp: Date.now(),
      })

      // 4. 세션 다시 로드
      const updatedSession = ChatStorage.loadSession(session.id)

      // 5. 검증: 메시지 2개가 저장되어야 함
      expect(updatedSession?.messages).toHaveLength(2)
      expect(updatedSession?.messages[1].content).toContain('오류가 발생했습니다')
    })

    it('에러 발생 후에도 updatedAt이 갱신되어야 함', () => {
      // 1. 세션 생성
      const session = ChatStorage.createNewSession()
      const initialUpdatedAt = session.updatedAt

      // 2. 짧은 대기 (시간 변화 보장)
      const waitTime = 10
      const startTime = Date.now()
      while (Date.now() - startTime < waitTime) {
        // busy wait
      }

      // 3. 에러 메시지 추가
      ChatStorage.addMessage(session.id, {
        id: 'msg-1',
        role: 'assistant',
        content: '오류가 발생했습니다: Test error',
        timestamp: Date.now(),
      })

      // 4. 세션 다시 로드
      const updatedSession = ChatStorage.loadSession(session.id)

      // 5. 검증: updatedAt이 변경되어야 함
      expect(updatedSession?.updatedAt).toBeGreaterThan(initialUpdatedAt)
    })

    it('에러 메시지가 추가되면 메시지 카운트가 증가해야 함', () => {
      // 1. 세션 생성
      const session = ChatStorage.createNewSession()

      // 2. 초기 메시지 카운트
      expect(session.messages).toHaveLength(0)

      // 3. 사용자 메시지 + 에러 메시지 추가
      ChatStorage.addMessage(session.id, {
        id: 'msg-1',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
      })

      ChatStorage.addMessage(session.id, {
        id: 'msg-2',
        role: 'assistant',
        content: '오류가 발생했습니다',
        timestamp: Date.now(),
      })

      // 4. 세션 다시 로드
      const updatedSession = ChatStorage.loadSession(session.id)

      // 5. 검증: 메시지 카운트가 2여야 함
      expect(updatedSession?.messages).toHaveLength(2)
    })
  })

  describe('통합 시나리오', () => {
    it('20개 세션 + 새 대화 생성 + 에러 발생 시나리오', () => {
      // 1. 19개 세션 생성
      for (let i = 0; i < 19; i++) {
        ChatStorage.createNewSession()
      }

      // 2. 20번째 세션 생성 및 메시지 추가
      const session20 = ChatStorage.createNewSession()
      ChatStorage.addMessage(session20.id, {
        id: 'msg-1',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
      })

      // 3. 21번째 세션 생성 (가장 오래된 세션 자동 삭제)
      const session21 = ChatStorage.createNewSession()

      // 4. storage에서 다시 로드
      const sessions = ChatStorage.loadSessions()

      // 5. 검증: 20개만 존재
      expect(sessions).toHaveLength(20)

      // 6. 검증: 20번째 세션은 존재 (메시지가 있으므로 최근 활동)
      const session20Exists = sessions.find(s => s.id === session20.id)
      expect(session20Exists).toBeDefined()

      // 7. 21번째 세션에 에러 메시지 추가
      ChatStorage.addMessage(session21.id, {
        id: 'msg-1',
        role: 'assistant',
        content: '오류가 발생했습니다',
        timestamp: Date.now(),
      })

      // 8. 세션 다시 로드
      const updatedSession21 = ChatStorage.loadSession(session21.id)

      // 9. 검증: 에러 메시지가 저장되어야 함
      expect(updatedSession21?.messages).toHaveLength(1)
      expect(updatedSession21?.messages[0].content).toContain('오류가 발생했습니다')
    })
  })
})
