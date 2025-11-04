/**
 * ChatStorage (IndexedDB 버전) - 채팅 세션 관리
 *
 * localStorage 대신 IndexedDB 사용으로:
 * - 용량 확대: 5MB → 50MB+
 * - 성능 향상: 인덱싱을 통한 O(log n) 조회
 * - 다중 탭 동기화: BroadcastChannel 지원
 */

import type { ChatSession, ChatMessage, ChatSettings, ChatProject } from '@/lib/types/chat'
import { IndexedDBManager, type StoreConfig } from './indexed-db-manager'

const DB_CONFIG = {
  dbName: 'StatisticalPlatformDB',
  version: 1,
}

const STORES: StoreConfig[] = [
  {
    name: 'sessions',
    keyPath: 'id',
    indexes: [
      { name: 'projectId', keyPath: 'projectId' },
      { name: 'isFavorite', keyPath: 'isFavorite' },
      { name: 'isArchived', keyPath: 'isArchived' },
      { name: 'updatedAt', keyPath: 'updatedAt' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  {
    name: 'projects',
    keyPath: 'id',
    indexes: [
      { name: 'isFavorite', keyPath: 'isFavorite' },
      { name: 'updatedAt', keyPath: 'updatedAt' },
    ],
  },
  {
    name: 'settings',
    keyPath: 'key',
  },
]

export class ChatStorageIndexedDB {
  private static manager: IndexedDBManager | null = null
  private static initialized = false

  /**
   * 초기화 (최초 1회만)
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      this.manager = new IndexedDBManager(DB_CONFIG)
      await this.manager.initialize(STORES)
      this.initialized = true
      console.log('[ChatStorageIndexedDB] Initialized')

      // localStorage에서 마이그레이션
      await this.migrateFromLocalStorage()
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to initialize:', error)
      throw error
    }
  }

  /**
   * localStorage에서 마이그레이션
   */
  private static async migrateFromLocalStorage(): Promise<void> {
    try {
      // 이미 마이그레이션했는지 확인
      const settings = await this.getSetting('migrated-to-idb')
      if (settings) return

      // localStorage 데이터 마이그레이션
      const oldSessions = localStorage.getItem('rag-chat-sessions')
      if (oldSessions) {
        const sessions = JSON.parse(oldSessions) as ChatSession[]
        for (const session of sessions) {
          await this.manager?.put('sessions', session)
        }
        console.log(`[ChatStorageIndexedDB] Migrated ${sessions.length} sessions`)
      }

      const oldProjects = localStorage.getItem('rag-chat-projects')
      if (oldProjects) {
        const projects = JSON.parse(oldProjects) as ChatProject[]
        for (const project of projects) {
          await this.manager?.put('projects', project)
        }
        console.log(`[ChatStorageIndexedDB] Migrated ${projects.length} projects`)
      }

      const oldSettings = localStorage.getItem('rag-chat-settings')
      if (oldSettings) {
        const settings = JSON.parse(oldSettings) as ChatSettings
        await this.manager?.put('settings', { key: 'settings', value: settings })
      }

      // 마이그레이션 완료 표시
      await this.manager?.put('settings', { key: 'migrated-to-idb', value: true })

      // localStorage 정리
      localStorage.removeItem('rag-chat-sessions')
      localStorage.removeItem('rag-chat-projects')
      localStorage.removeItem('rag-chat-settings')

      console.log('[ChatStorageIndexedDB] Migration completed')
    } catch (error) {
      console.warn('[ChatStorageIndexedDB] Migration failed:', error)
      // 마이그레이션 실패해도 계속 진행
    }
  }

  /**
   * 모든 세션 로드 (보관함 제외)
   */
  static async loadSessions(): Promise<ChatSession[]> {
    try {
      if (!this.initialized) await this.initialize()

      const allSessions = await this.manager?.getAll<ChatSession>('sessions') ?? []
      return allSessions
        .filter(s => !s.isArchived)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load sessions:', error)
      return []
    }
  }

  /**
   * 보관된 세션 로드
   */
  static async loadArchivedSessions(): Promise<ChatSession[]> {
    try {
      if (!this.initialized) await this.initialize()

      const allSessions = await this.manager?.getAll<ChatSession>('sessions') ?? []
      return allSessions
        .filter(s => s.isArchived)
        .sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load archived sessions:', error)
      return []
    }
  }

  /**
   * 특정 세션 로드
   */
  static async loadSession(id: string): Promise<ChatSession | null> {
    try {
      if (!this.initialized) await this.initialize()

      return await this.manager?.get<ChatSession>('sessions', id) ?? null
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load session:', error)
      return null
    }
  }

  /**
   * 세션 저장
   */
  static async saveSession(session: ChatSession): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      await this.manager?.put('sessions', {
        ...session,
        updatedAt: Date.now(),
      })

      // 다중 탭 동기화
      this.broadcastChange('session', 'save', session.id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to save session:', error)
      throw new Error('세션 저장에 실패했습니다.')
    }
  }

  /**
   * 메시지 추가 (트랜잭션 기반 - Race Condition 방지)
   */
  static async addMessage(
    sessionId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      // ✅ 단일 트랜잭션으로 읽기-수정-쓰기 처리
      await this.manager?.updateInTransaction<ChatSession>(
        'sessions',
        sessionId,
        (session) => {
          session.messages.push(message)
          session.updatedAt = Date.now()

          // 첫 메시지면 제목 자동 생성
          if (session.messages.length === 1) {
            session.title = this.generateTitle(message.content)
          }

          return session
        }
      )

      // 다중 탭 동기화
      this.broadcastChange('session', 'save', sessionId)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to add message:', error)
      throw new Error('메시지 추가에 실패했습니다.')
    }
  }

  /**
   * 메시지 삭제 (트랜잭션 기반 - Race Condition 방지)
   */
  static async deleteMessage(sessionId: string, messageId: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      // ✅ 단일 트랜잭션으로 읽기-수정-쓰기 처리
      await this.manager?.updateInTransaction<ChatSession>(
        'sessions',
        sessionId,
        (session) => {
          session.messages = session.messages.filter((m) => m.id !== messageId)
          session.updatedAt = Date.now()
          return session
        }
      )

      this.broadcastChange('session', 'save', sessionId)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to delete message:', error)
      throw new Error('메시지 삭제에 실패했습니다.')
    }
  }

  /**
   * 세션 삭제
   */
  static async deleteSession(id: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      await this.manager?.delete('sessions', id)
      this.broadcastChange('session', 'delete', id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to delete session:', error)
      throw new Error('세션 삭제에 실패했습니다.')
    }
  }

  /**
   * 즐겨찾기 토글 (트랜잭션 기반 - Race Condition 방지)
   */
  static async toggleFavorite(id: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      // ✅ 단일 트랜잭션으로 읽기-수정-쓰기 처리
      await this.manager?.updateInTransaction<ChatSession>(
        'sessions',
        id,
        (session) => {
          session.isFavorite = !session.isFavorite
          session.updatedAt = Date.now()
          return session
        }
      )

      this.broadcastChange('session', 'save', id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to toggle favorite:', error)
      throw new Error('즐겨찾기 설정에 실패했습니다.')
    }
  }

  /**
   * 세션 이름 변경 (트랜잭션 기반 - Race Condition 방지)
   */
  static async renameSession(id: string, newTitle: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      // ✅ 단일 트랜잭션으로 읽기-수정-쓰기 처리
      await this.manager?.updateInTransaction<ChatSession>(
        'sessions',
        id,
        (session) => {
          session.title = newTitle.trim() || '제목 없음'
          session.updatedAt = Date.now()
          return session
        }
      )

      this.broadcastChange('session', 'save', id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to rename session:', error)
      throw new Error('세션 이름 변경에 실패했습니다.')
    }
  }

  /**
   * 세션 보관 토글 (트랜잭션 기반 - Race Condition 방지)
   */
  static async toggleArchive(id: string): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      // ✅ 단일 트랜잭션으로 읽기-수정-쓰기 처리
      await this.manager?.updateInTransaction<ChatSession>(
        'sessions',
        id,
        (session) => {
          session.isArchived = !session.isArchived
          session.updatedAt = Date.now()
          return session
        }
      )

      this.broadcastChange('session', 'save', id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to toggle archive:', error)
      throw new Error('보관 설정에 실패했습니다.')
    }
  }

  /**
   * 새 세션 생성
   */
  static async createNewSession(): Promise<ChatSession> {
    if (!this.initialized) await this.initialize()

    const newSession: ChatSession = {
      id: this.generateId(),
      title: '새 대화',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    }

    await this.saveSession(newSession)
    return newSession
  }

  /**
   * 설정 로드
   */
  static async loadSettings(): Promise<ChatSettings> {
    try {
      if (!this.initialized) await this.initialize()

      const setting = await this.manager?.get<{ key: string; value: ChatSettings }>(
        'settings',
        'settings'
      )
      return setting?.value ?? { floatingButtonEnabled: true, theme: 'system' }
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load settings:', error)
      return { floatingButtonEnabled: true, theme: 'system' }
    }
  }

  /**
   * 설정 저장
   */
  static async saveSettings(settings: ChatSettings): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      await this.manager?.put('settings', { key: 'settings', value: settings })
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to save settings:', error)
      throw new Error('설정 저장에 실패했습니다.')
    }
  }

  /**
   * 세션 로드 (모두, 보관 포함)
   */
  static async loadAllSessions(): Promise<ChatSession[]> {
    try {
      if (!this.initialized) await this.initialize()

      return await this.manager?.getAll<ChatSession>('sessions') ?? []
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load all sessions:', error)
      return []
    }
  }

  /**
   * 프로젝트 로드
   */
  static async loadProjects(): Promise<ChatProject[]> {
    try {
      if (!this.initialized) await this.initialize()

      return await this.manager?.getAll<ChatProject>('projects') ?? []
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to load projects:', error)
      return []
    }
  }

  /**
   * 프로젝트 저장
   */
  static async saveProject(project: ChatProject): Promise<void> {
    try {
      if (!this.initialized) await this.initialize()

      await this.manager?.put('projects', {
        ...project,
        updatedAt: Date.now(),
      })

      this.broadcastChange('project', 'save', project.id)
    } catch (error) {
      console.error('[ChatStorageIndexedDB] Failed to save project:', error)
      throw new Error('프로젝트 저장에 실패했습니다.')
    }
  }

  /**
   * 설정 항목 로드
   */
  private static async getSetting(key: string): Promise<any> {
    try {
      if (!this.initialized) await this.initialize()

      const setting = await this.manager?.get<{ key: string; value: any }>(
        'settings',
        key
      )
      return setting?.value
    } catch (error) {
      return null
    }
  }

  /**
   * 세션 ID 생성
   */
  private static generateId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 제목 생성
   */
  private static generateTitle(content: string): string {
    return content.substring(0, 50).trim() || '제목 없음'
  }

  /**
   * 다중 탭 동기화 (BroadcastChannel)
   */
  private static broadcastChange(
    type: 'session' | 'project',
    action: 'save' | 'delete',
    id: string
  ): void {
    try {
      const channel = new BroadcastChannel('chat-storage-sync')
      channel.postMessage({ type, action, id, timestamp: Date.now() })
      channel.close()
    } catch (error) {
      // BroadcastChannel 미지원 환경
    }
  }
}
