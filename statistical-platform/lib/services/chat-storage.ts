/**
 * ChatStorage - LocalStorage 기반 채팅 세션 관리
 *
 * 기능:
 * - 세션 저장/로드/삭제
 * - 즐겨찾기/보관함 관리
 * - 용량 관리 (5MB 제한, 최근 20개만 유지)
 * - 자동 제목 생성
 */

import type { ChatSession, ChatMessage, ChatSettings } from '@/lib/types/chat'

export class ChatStorage {
  private static readonly SESSIONS_KEY = 'rag-chat-sessions'
  private static readonly SETTINGS_KEY = 'rag-chat-settings'
  private static readonly MAX_SIZE = 4_500_000 // 4.5MB (5MB 여유분)
  private static readonly MAX_SESSIONS = 20

  /**
   * 모든 세션 로드 (보관함 제외)
   */
  static loadSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY)
      if (!data) return []

      const sessions = JSON.parse(data) as ChatSession[]
      return sessions.filter(s => !s.isArchived).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
      return []
    }
  }

  /**
   * 보관된 세션 로드
   */
  static loadArchivedSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY)
      if (!data) return []

      const sessions = JSON.parse(data) as ChatSession[]
      return sessions.filter(s => s.isArchived).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to load archived sessions:', error)
      return []
    }
  }

  /**
   * 특정 세션 로드
   */
  static loadSession(id: string): ChatSession | null {
    try {
      const sessions = this.loadAllSessions()
      return sessions.find(s => s.id === id) ?? null
    } catch (error) {
      console.error('Failed to load session:', error)
      return null
    }
  }

  /**
   * 세션 저장 (생성 또는 업데이트)
   */
  static saveSession(session: ChatSession): void {
    try {
      const sessions = this.loadAllSessions()
      const existingIndex = sessions.findIndex(s => s.id === session.id)

      if (existingIndex >= 0) {
        sessions[existingIndex] = { ...session, updatedAt: Date.now() }
      } else {
        sessions.push({ ...session, updatedAt: Date.now() })
      }

      this.saveAllSessions(sessions)
      this.cleanupIfNeeded()
    } catch (error) {
      console.error('Failed to save session:', error)
      throw new Error('세션 저장에 실패했습니다.')
    }
  }

  /**
   * 메시지 추가
   */
  static addMessage(sessionId: string, message: ChatMessage): void {
    try {
      const session = this.loadSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      session.messages.push(message)
      session.updatedAt = Date.now()

      // 첫 메시지면 자동으로 제목 생성
      if (session.messages.length === 1) {
        session.title = this.generateTitle(message.content)
      }

      this.saveSession(session)
    } catch (error) {
      console.error('Failed to add message:', error)
      throw new Error('메시지 추가에 실패했습니다.')
    }
  }

  /**
   * 세션 삭제
   */
  static deleteSession(id: string): void {
    try {
      const sessions = this.loadAllSessions()
      const filtered = sessions.filter(s => s.id !== id)
      this.saveAllSessions(filtered)
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw new Error('세션 삭제에 실패했습니다.')
    }
  }

  /**
   * 즐겨찾기 토글
   */
  static toggleFavorite(id: string): void {
    try {
      const sessions = this.loadAllSessions()
      const session = sessions.find(s => s.id === id)

      if (!session) {
        throw new Error('Session not found')
      }

      session.isFavorite = !session.isFavorite
      session.updatedAt = Date.now()
      this.saveAllSessions(sessions)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
      throw new Error('즐겨찾기 설정에 실패했습니다.')
    }
  }

  /**
   * 세션 이름 변경
   */
  static renameSession(id: string, newTitle: string): void {
    try {
      const sessions = this.loadAllSessions()
      const session = sessions.find(s => s.id === id)

      if (!session) {
        throw new Error('Session not found')
      }

      session.title = newTitle.trim() || '제목 없음'
      session.updatedAt = Date.now()
      this.saveAllSessions(sessions)
    } catch (error) {
      console.error('Failed to rename session:', error)
      throw new Error('세션 이름 변경에 실패했습니다.')
    }
  }

  /**
   * 세션 보관 토글
   */
  static toggleArchive(id: string): void {
    try {
      const sessions = this.loadAllSessions()
      const session = sessions.find(s => s.id === id)

      if (!session) {
        throw new Error('Session not found')
      }

      session.isArchived = !session.isArchived
      session.updatedAt = Date.now()
      this.saveAllSessions(sessions)
    } catch (error) {
      console.error('Failed to toggle archive:', error)
      throw new Error('보관 설정에 실패했습니다.')
    }
  }

  /**
   * 새 세션 생성
   */
  static createNewSession(): ChatSession {
    const newSession: ChatSession = {
      id: this.generateId(),
      title: '새 대화',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    }

    this.saveSession(newSession)
    return newSession
  }

  /**
   * 설정 로드
   */
  static loadSettings(): ChatSettings {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY)
      if (!data) {
        return {
          floatingButtonEnabled: true,
          theme: 'system',
        }
      }

      return JSON.parse(data) as ChatSettings
    } catch (error) {
      console.error('Failed to load settings:', error)
      return {
        floatingButtonEnabled: true,
        theme: 'system',
      }
    }
  }

  /**
   * 설정 저장
   */
  static saveSettings(settings: ChatSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new Error('설정 저장에 실패했습니다.')
    }
  }

  /**
   * 첫 메시지로부터 제목 자동 생성
   */
  static generateTitle(firstMessage: string): string {
    const cleaned = firstMessage.trim().replace(/\n/g, ' ')

    if (cleaned.length === 0) {
      return '새 대화'
    }

    if (cleaned.length <= 30) {
      return cleaned
    }

    return cleaned.substring(0, 27) + '...'
  }

  /**
   * 고유 ID 생성
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 모든 세션 로드 (보관함 포함)
   */
  private static loadAllSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY)
      if (!data) return []

      return JSON.parse(data) as ChatSession[]
    } catch (error) {
      console.error('Failed to load all sessions:', error)
      return []
    }
  }

  /**
   * 모든 세션 저장
   */
  private static saveAllSessions(sessions: ChatSession[]): void {
    try {
      const data = JSON.stringify(sessions)
      localStorage.setItem(this.SESSIONS_KEY, data)
    } catch (error) {
      console.error('Failed to save all sessions:', error)
      throw new Error('세션 저장에 실패했습니다.')
    }
  }

  /**
   * 용량 초과 시 자동 정리
   */
  private static cleanupIfNeeded(): void {
    try {
      const data = localStorage.getItem(this.SESSIONS_KEY)
      if (!data) return

      // 1. 크기 체크
      if (data.length > this.MAX_SIZE) {
        this.cleanupBySize()
        return
      }

      // 2. 개수 체크
      const sessions = JSON.parse(data) as ChatSession[]
      const nonArchivedSessions = sessions.filter(s => !s.isArchived)

      if (nonArchivedSessions.length > this.MAX_SESSIONS) {
        this.cleanupByCount(sessions, nonArchivedSessions)
      }
    } catch (error) {
      console.error('Failed to cleanup sessions:', error)
    }
  }

  /**
   * 크기 기준 정리
   */
  private static cleanupBySize(): void {
    const sessions = this.loadAllSessions()

    // 즐겨찾기가 아닌 세션만 정렬 (오래된 순)
    const nonFavoriteSessions = sessions
      .filter(s => !s.isFavorite)
      .sort((a, b) => a.updatedAt - b.updatedAt)

    // 가장 오래된 세션부터 삭제
    if (nonFavoriteSessions.length > 0) {
      const toDelete = nonFavoriteSessions[0]
      this.deleteSession(toDelete.id)
      console.log(`Deleted old session: ${toDelete.title}`)

      // 재귀적으로 크기 체크
      this.cleanupIfNeeded()
    }
  }

  /**
   * 개수 기준 정리
   */
  private static cleanupByCount(allSessions: ChatSession[], nonArchivedSessions: ChatSession[]): void {
    // 즐겨찾기가 아닌 세션만 정렬 (오래된 순)
    const nonFavoriteSessions = nonArchivedSessions
      .filter(s => !s.isFavorite)
      .sort((a, b) => a.updatedAt - b.updatedAt)

    // 삭제할 개수 계산
    const deleteCount = nonArchivedSessions.length - this.MAX_SESSIONS

    if (deleteCount > 0 && nonFavoriteSessions.length > 0) {
      const toDelete = nonFavoriteSessions.slice(0, deleteCount)
      const remaining = allSessions.filter(s => !toDelete.some(d => d.id === s.id))

      this.saveAllSessions(remaining)
      console.log(`Deleted ${deleteCount} old sessions`)
    }
  }

  /**
   * 전체 데이터 초기화 (개발용)
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(this.SESSIONS_KEY)
      localStorage.removeItem(this.SETTINGS_KEY)
      console.log('All chat data cleared')
    } catch (error) {
      console.error('Failed to clear data:', error)
    }
  }
}
