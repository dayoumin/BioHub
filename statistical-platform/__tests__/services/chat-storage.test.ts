/**
 * ChatStorage 클래스 단위 테스트
 *
 * 테스트 범위:
 * - 세션 CRUD (생성, 읽기, 업데이트, 삭제)
 * - 즐겨찾기, 보관 토글
 * - 용량 관리 (자동 정리)
 * - 자동 제목 생성
 * - 에러 처리
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession, ChatMessage } from '@/lib/types/chat'

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

// 전역 localStorage 교체
global.localStorage = new LocalStorageMock() as Storage

describe('ChatStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    ChatStorage.clearAll()
  })

  describe('세션 생성 및 로드', () => {
    it('새 세션을 생성할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()

      expect(session.id).toBeDefined()
      expect(session.title).toBe('새 대화')
      expect(session.messages).toEqual([])
      expect(session.isFavorite).toBe(false)
      expect(session.isArchived).toBe(false)
    })

    it('세션을 저장하고 로드할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()
      const loadedSession = ChatStorage.loadSession(session.id)

      expect(loadedSession).not.toBeNull()
      expect(loadedSession?.id).toBe(session.id)
    })

    it('모든 세션을 로드할 수 있어야 함', () => {
      ChatStorage.createNewSession()
      ChatStorage.createNewSession()
      ChatStorage.createNewSession()

      const sessions = ChatStorage.loadSessions()
      expect(sessions).toHaveLength(3)
    })

    it('존재하지 않는 세션은 null을 반환해야 함', () => {
      const session = ChatStorage.loadSession('non-existent-id')
      expect(session).toBeNull()
    })
  })

  describe('메시지 추가', () => {
    it('세션에 메시지를 추가할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 't-test는 언제 사용하나요?',
        timestamp: Date.now(),
      }

      ChatStorage.addMessage(session.id, message)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.messages).toHaveLength(1)
      expect(updatedSession?.messages[0].content).toBe(message.content)
    })

    it('첫 메시지로 자동 제목을 생성해야 함', () => {
      const session = ChatStorage.createNewSession()
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 't-test는 언제 사용하나요?',
        timestamp: Date.now(),
      }

      ChatStorage.addMessage(session.id, message)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.title).toBe('t-test는 언제 사용하나요?')
    })

    it('긴 메시지는 30자로 자르고 ...을 추가해야 함', () => {
      const session = ChatStorage.createNewSession()
      const longMessage = 'a'.repeat(50)
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: longMessage,
        timestamp: Date.now(),
      }

      ChatStorage.addMessage(session.id, message)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.title).toHaveLength(30)
      expect(updatedSession?.title).toMatch(/\.\.\.$/)
    })

    it('존재하지 않는 세션에 메시지 추가 시 에러를 던져야 함', () => {
      const message: ChatMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'test',
        timestamp: Date.now(),
      }

      expect(() => {
        ChatStorage.addMessage('non-existent-id', message)
      }).toThrow()
    })
  })

  describe('세션 삭제', () => {
    it('세션을 삭제할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.deleteSession(session.id)

      const loadedSession = ChatStorage.loadSession(session.id)
      expect(loadedSession).toBeNull()
    })

    it('삭제 후 세션 목록에서 제거되어야 함', () => {
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.deleteSession(session1.id)

      const sessions = ChatStorage.loadSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe(session2.id)
    })
  })

  describe('즐겨찾기 토글', () => {
    it('세션을 즐겨찾기로 설정할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.toggleFavorite(session.id)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.isFavorite).toBe(true)
    })

    it('즐겨찾기를 다시 해제할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.toggleFavorite(session.id)
      ChatStorage.toggleFavorite(session.id)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.isFavorite).toBe(false)
    })
  })

  describe('보관 토글', () => {
    it('세션을 보관할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.toggleArchive(session.id)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.isArchived).toBe(true)
    })

    it('보관된 세션은 일반 목록에 표시되지 않아야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.toggleArchive(session.id)

      const sessions = ChatStorage.loadSessions()
      expect(sessions).toHaveLength(0)
    })

    it('보관된 세션은 보관 목록에 표시되어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.toggleArchive(session.id)

      const archivedSessions = ChatStorage.loadArchivedSessions()
      expect(archivedSessions).toHaveLength(1)
      expect(archivedSessions[0].id).toBe(session.id)
    })
  })

  describe('세션 이름 변경', () => {
    it('세션 이름을 변경할 수 있어야 함', () => {
      const session = ChatStorage.createNewSession()
      const newTitle = '통계 분석 질문'

      ChatStorage.renameSession(session.id, newTitle)

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.title).toBe(newTitle)
    })

    it('빈 제목은 "제목 없음"으로 설정되어야 함', () => {
      const session = ChatStorage.createNewSession()

      ChatStorage.renameSession(session.id, '   ')

      const updatedSession = ChatStorage.loadSession(session.id)
      expect(updatedSession?.title).toBe('제목 없음')
    })
  })

  describe('설정 관리', () => {
    it('기본 설정을 로드할 수 있어야 함', () => {
      const settings = ChatStorage.loadSettings()

      expect(settings.floatingButtonEnabled).toBe(true)
      expect(settings.theme).toBe('system')
    })

    it('설정을 저장하고 로드할 수 있어야 함', () => {
      ChatStorage.saveSettings({
        floatingButtonEnabled: false,
        theme: 'dark',
      })

      const settings = ChatStorage.loadSettings()
      expect(settings.floatingButtonEnabled).toBe(false)
      expect(settings.theme).toBe('dark')
    })
  })

  describe('용량 관리', () => {
    it('20개 초과 시 오래된 세션을 자동 삭제해야 함', () => {
      // 25개 세션 생성
      for (let i = 0; i < 25; i++) {
        const session = ChatStorage.createNewSession()
        // 시간차를 두기 위해 updatedAt 조작
        const sessions = JSON.parse(
          localStorage.getItem('rag-chat-sessions') ?? '[]'
        ) as ChatSession[]
        const lastSession = sessions[sessions.length - 1]
        if (lastSession) {
          lastSession.updatedAt = Date.now() - (25 - i) * 1000
          localStorage.setItem('rag-chat-sessions', JSON.stringify(sessions))
        }
      }

      const sessions = ChatStorage.loadSessions()
      expect(sessions.length).toBeLessThanOrEqual(20)
    })

    it('즐겨찾기는 삭제되지 않아야 함', () => {
      // 21개 세션 생성 (첫 번째만 즐겨찾기)
      const favoriteSession = ChatStorage.createNewSession()
      ChatStorage.toggleFavorite(favoriteSession.id)

      for (let i = 0; i < 20; i++) {
        ChatStorage.createNewSession()
      }

      const sessions = ChatStorage.loadSessions()
      const favorite = sessions.find((s) => s.id === favoriteSession.id)
      expect(favorite).toBeDefined()
      expect(favorite?.isFavorite).toBe(true)
    })
  })

  describe('자동 제목 생성', () => {
    it('30자 이하 메시지는 그대로 사용해야 함', () => {
      const shortMessage = 't-test는 언제 사용하나요?'
      const title = ChatStorage.generateTitle(shortMessage)
      expect(title).toBe(shortMessage)
    })

    it('30자 초과 메시지는 27자 + ...으로 자라야 함', () => {
      const longMessage = 'a'.repeat(50)
      const title = ChatStorage.generateTitle(longMessage)
      expect(title).toHaveLength(30)
      expect(title).toBe('a'.repeat(27) + '...')
    })

    it('빈 메시지는 "새 대화"를 반환해야 함', () => {
      const title = ChatStorage.generateTitle('')
      expect(title).toBe('새 대화')
    })

    it('공백만 있는 메시지는 "새 대화"를 반환해야 함', () => {
      const title = ChatStorage.generateTitle('   ')
      expect(title).toBe('새 대화')
    })

    it('줄바꿈은 공백으로 변환되어야 함', () => {
      const message = 't-test는\n언제 사용하나요?'
      const title = ChatStorage.generateTitle(message)
      expect(title).toBe('t-test는 언제 사용하나요?')
    })
  })

  describe('데이터 초기화', () => {
    it('모든 데이터를 삭제할 수 있어야 함', () => {
      ChatStorage.createNewSession()
      ChatStorage.saveSettings({
        floatingButtonEnabled: false,
        theme: 'dark',
      })

      ChatStorage.clearAll()

      const sessions = ChatStorage.loadSessions()
      const settings = ChatStorage.loadSettings()

      expect(sessions).toHaveLength(0)
      expect(settings.floatingButtonEnabled).toBe(true) // 기본값
    })
  })

  describe('에러 처리', () => {
    it('잘못된 JSON 데이터는 빈 배열을 반환해야 함', () => {
      localStorage.setItem('rag-chat-sessions', 'invalid json')

      const sessions = ChatStorage.loadSessions()
      expect(sessions).toEqual([])
    })

    it('존재하지 않는 세션 업데이트 시 에러를 던지지 않아야 함', () => {
      expect(() => {
        ChatStorage.toggleFavorite('non-existent-id')
      }).toThrow()
    })
  })
})
