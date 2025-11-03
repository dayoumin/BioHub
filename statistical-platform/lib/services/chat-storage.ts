/**
 * ChatStorage - LocalStorage 기반 채팅 세션 관리
 *
 * 기능:
 * - 세션 저장/로드/삭제
 * - 즐겨찾기/보관함 관리
 * - 용량 관리 (5MB 제한, 최근 20개만 유지)
 * - 자동 제목 생성
 */

import type { ChatSession, ChatMessage, ChatSettings, ChatProject } from '@/lib/types/chat'

export class ChatStorage {
  private static readonly SESSIONS_KEY = 'rag-chat-sessions'
  private static readonly PROJECTS_KEY = 'rag-chat-projects'
  private static readonly SETTINGS_KEY = 'rag-chat-settings'
  private static readonly MIGRATION_KEY = 'rag-chat-migrated-v2'
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
   * 메시지 삭제
   */
  static deleteMessage(sessionId: string, messageId: string): void {
    try {
      const session = this.loadSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      session.messages = session.messages.filter(m => m.id !== messageId)
      session.updatedAt = Date.now()

      this.saveSession(session)
    } catch (error) {
      console.error('Failed to delete message:', error)
      throw new Error('메시지 삭제에 실패했습니다.')
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
      localStorage.removeItem(this.PROJECTS_KEY)
      localStorage.removeItem(this.SETTINGS_KEY)
      localStorage.removeItem(this.MIGRATION_KEY)
      console.log('All chat data cleared')
    } catch (error) {
      console.error('Failed to clear data:', error)
    }
  }

  // ==================== 프로젝트 관리 ====================

  /**
   * 프로젝트 생성
   */
  static createProject(
    name: string,
    options?: { description?: string; emoji?: string; color?: string }
  ): ChatProject {
    const newProject: ChatProject = {
      id: this.generateId(),
      name: name.trim() || '새 프로젝트',
      description: options?.description,
      emoji: options?.emoji,
      color: options?.color,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
      isFavorite: false,
    }

    const projects = this.loadAllProjects()
    projects.push(newProject)
    this.saveAllProjects(projects)

    return newProject
  }

  /**
   * 모든 프로젝트 조회 (보관된 것 제외)
   */
  static getProjects(): ChatProject[] {
    try {
      const projects = this.loadAllProjects()
      return projects.filter(p => !p.isArchived).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to load projects:', error)
      return []
    }
  }

  /**
   * 프로젝트 수정
   */
  static updateProject(
    projectId: string,
    updates: Partial<Omit<ChatProject, 'id' | 'createdAt'>>
  ): ChatProject | null {
    try {
      const projects = this.loadAllProjects()
      const project = projects.find(p => p.id === projectId)

      if (!project) {
        console.error('Project not found:', projectId)
        return null
      }

      Object.assign(project, updates, { updatedAt: Date.now() })
      this.saveAllProjects(projects)

      return project
    } catch (error) {
      console.error('Failed to update project:', error)
      return null
    }
  }

  /**
   * 프로젝트 삭제 (하위 세션들은 projectId 제거)
   */
  static deleteProject(projectId: string): void {
    try {
      // 1. 프로젝트 삭제
      const projects = this.loadAllProjects()
      const filtered = projects.filter(p => p.id !== projectId)
      this.saveAllProjects(filtered)

      // 2. 해당 프로젝트의 세션들도 함께 삭제
      const sessions = this.loadAllSessions()
      const updated = sessions.filter(s => s.projectId !== projectId)
      this.saveAllSessions(updated)
    } catch (error) {
      console.error('Failed to delete project:', error)
      throw new Error('프로젝트 삭제에 실패했습니다.')
    }
  }

  /**
   * 프로젝트 보관/복구
   */
  static toggleProjectArchive(projectId: string): void {
    try {
      const projects = this.loadAllProjects()
      const project = projects.find(p => p.id === projectId)

      if (!project) {
        throw new Error('Project not found')
      }

      project.isArchived = !project.isArchived
      project.updatedAt = Date.now()
      this.saveAllProjects(projects)
    } catch (error) {
      console.error('Failed to toggle project archive:', error)
      throw new Error('프로젝트 보관 설정에 실패했습니다.')
    }
  }

  /**
   * 프로젝트 즐겨찾기 토글
   */
  static toggleProjectFavorite(projectId: string): void {
    try {
      const projects = this.loadAllProjects()
      const project = projects.find(p => p.id === projectId)

      if (!project) {
        throw new Error('Project not found')
      }

      project.isFavorite = !project.isFavorite
      project.updatedAt = Date.now()
      this.saveAllProjects(projects)
    } catch (error) {
      console.error('Failed to toggle project favorite:', error)
      throw new Error('프로젝트 즐겨찾기 설정에 실패했습니다.')
    }
  }

  /**
   * 세션을 프로젝트로 이동
   */
  static moveSessionToProject(sessionId: string, projectId: string | null): ChatSession | null {
    try {
      const sessions = this.loadAllSessions()
      const session = sessions.find(s => s.id === sessionId)

      if (!session) {
        console.error('Session not found:', sessionId)
        return null
      }

      // projectId가 null이 아닌 경우, 프로젝트 존재 여부 확인
      if (projectId !== null) {
        const projects = this.loadAllProjects()
        const projectExists = projects.some(p => p.id === projectId)

        if (!projectExists) {
          console.error('Project not found:', projectId)
          return null
        }
      }

      session.projectId = projectId ?? undefined
      session.updatedAt = Date.now()
      this.saveAllSessions(sessions)

      return session
    } catch (error) {
      console.error('Failed to move session:', error)
      return null
    }
  }

  /**
   * 특정 프로젝트의 세션 조회
   */
  static getSessionsByProject(projectId: string, sortBy: 'recent' | 'oldest' = 'recent'): ChatSession[] {
    try {
      const sessions = this.loadSessions()
      const filtered = sessions.filter(s => s.projectId === projectId)

      return sortBy === 'recent'
        ? filtered.sort((a, b) => b.updatedAt - a.updatedAt)
        : filtered.sort((a, b) => a.updatedAt - b.updatedAt)
    } catch (error) {
      console.error('Failed to get sessions by project:', error)
      return []
    }
  }

  /**
   * 프로젝트 미속 세션 조회 (root)
   */
  static getUnorganizedSessions(): ChatSession[] {
    try {
      const sessions = this.loadSessions()
      return sessions.filter(s => !s.projectId).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to get unorganized sessions:', error)
      return []
    }
  }

  /**
   * 즐겨찾기 세션 조회
   */
  static getFavoriteSessions(): ChatSession[] {
    try {
      const sessions = this.loadSessions()
      return sessions.filter(s => s.isFavorite).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to get favorite sessions:', error)
      return []
    }
  }

  /**
   * 즐겨찾기 프로젝트 조회
   */
  static getFavoriteProjects(): ChatProject[] {
    try {
      const projects = this.loadAllProjects()
      return projects.filter(p => p.isFavorite && !p.isArchived).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to get favorite projects:', error)
      return []
    }
  }

  /**
   * 세션 검색
   */
  static searchSessions(query: string, options?: { projectId?: string; limit?: number }): ChatSession[] {
    try {
      const sessions = this.loadSessions()
      const lowerQuery = query.toLowerCase().trim()

      // 쿼리 필터링 (빈 쿼리면 전체 세션)
      let filtered = lowerQuery
        ? sessions.filter(s => s.title.toLowerCase().includes(lowerQuery))
        : sessions

      // 프로젝트 필터
      if (options?.projectId) {
        filtered = filtered.filter(s => s.projectId === options.projectId)
      }

      // 최신순 정렬
      filtered.sort((a, b) => b.updatedAt - a.updatedAt)

      // 제한
      if (options?.limit && options.limit > 0) {
        filtered = filtered.slice(0, options.limit)
      }

      return filtered
    } catch (error) {
      console.error('Failed to search sessions:', error)
      return []
    }
  }

  /**
   * 프로젝트 검색
   */
  static searchProjects(query: string): ChatProject[] {
    try {
      const projects = this.getProjects()
      const lowerQuery = query.toLowerCase().trim()

      if (!lowerQuery) return projects

      return projects.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery))
      ).sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('Failed to search projects:', error)
      return []
    }
  }

  /**
   * 통합 검색
   */
  static globalSearch(query: string): { projects: ChatProject[]; sessions: ChatSession[] } {
    return {
      projects: this.searchProjects(query),
      sessions: this.searchSessions(query),
    }
  }

  /**
   * 마이그레이션 (기존 데이터 → 새 구조)
   */
  static migrateToNewStructure(): void {
    try {
      // 1. 마이그레이션 완료 여부 확인
      const isMigrated = localStorage.getItem(this.MIGRATION_KEY) === 'true'
      if (isMigrated) {
        console.log('[ChatStorage] Already migrated to v2')
        return
      }

      console.log('[ChatStorage] Starting migration to v2...')

      // 2. 기존 세션 로드
      const sessions = this.loadAllSessions()

      // 3. projectId 초기화 (이미 undefined이면 그대로)
      let migrated = 0
      sessions.forEach(session => {
        if (!('projectId' in session)) {
          session.projectId = undefined
          migrated++
        }
      })

      // 4. 저장
      if (migrated > 0) {
        this.saveAllSessions(sessions)
        console.log(`[ChatStorage] Migrated ${migrated} sessions`)
      }

      // 5. 마이그레이션 완료 표시
      localStorage.setItem(this.MIGRATION_KEY, 'true')
      console.log('[ChatStorage] Migration complete')
    } catch (error) {
      console.error('Failed to migrate:', error)
    }
  }

  // ==================== Private 헬퍼 메서드 ====================

  /**
   * 모든 프로젝트 로드 (보관함 포함)
   */
  private static loadAllProjects(): ChatProject[] {
    try {
      const data = localStorage.getItem(this.PROJECTS_KEY)
      if (!data) return []

      return JSON.parse(data) as ChatProject[]
    } catch (error) {
      console.error('Failed to load all projects:', error)
      return []
    }
  }

  /**
   * 모든 프로젝트 저장
   */
  private static saveAllProjects(projects: ChatProject[]): void {
    try {
      const data = JSON.stringify(projects)
      localStorage.setItem(this.PROJECTS_KEY, data)
    } catch (error) {
      console.error('Failed to save all projects:', error)
      throw new Error('프로젝트 저장에 실패했습니다.')
    }
  }
}
