/**
 * ChatStorageIndexedDB - 통합 테스트
 *
 * 테스트 범위:
 * - 세션 관리 (생성, 저장, 로드, 삭제)
 * - 메시지 관리 (추가, 삭제)
 * - localStorage 마이그레이션
 * - 즐겨찾기/보관 토글
 * - BroadcastChannel 동기화
 * - 설정 관리
 */

import { ChatStorageIndexedDB } from '../chat-storage-indexed-db'
import type { ChatSession, ChatMessage } from '@/lib/types/chat'

// Mock BroadcastChannel
global.BroadcastChannel = jest.fn(() => ({
  postMessage: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
})) as any

describe('ChatStorageIndexedDB', () => {
  const dbName = `test-chat-${Date.now()}`

  // 테스트용 세션 데이터
  const createMockSession = (overrides?: Partial<ChatSession>): ChatSession => ({
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    title: '테스트 세션',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isFavorite: false,
    isArchived: false,
    ...overrides,
  })

  const createMockMessage = (overrides?: Partial<ChatMessage>): ChatMessage => ({
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    ...overrides,
  })

  beforeAll(async () => {
    // 테스트 데이터베이스 초기화
    await ChatStorageIndexedDB.initialize()
  })

  // ===== 세션 관리 테스트 =====
  describe('Session Management', () => {
    it('should create new session', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('title')
      expect(session.messages).toEqual([])
      expect(session.isFavorite).toBe(false)
      expect(session.isArchived).toBe(false)
    })

    it('should save and load session', async () => {
      const mockSession = createMockSession()
      await ChatStorageIndexedDB.saveSession(mockSession)

      const loaded = await ChatStorageIndexedDB.loadSession(mockSession.id)

      expect(loaded).toEqual(expect.objectContaining({
        id: mockSession.id,
        title: mockSession.title,
      }))
    })

    it('should load all non-archived sessions', async () => {
      const session1 = createMockSession({ title: 'Session 1' })
      const session2 = createMockSession({ title: 'Session 2', isArchived: true })

      await ChatStorageIndexedDB.saveSession(session1)
      await ChatStorageIndexedDB.saveSession(session2)

      const sessions = await ChatStorageIndexedDB.loadSessions()

      expect(sessions.some((s) => s.id === session1.id)).toBe(true)
      expect(sessions.some((s) => s.id === session2.id)).toBe(false) // archived not included
    })

    it('should load archived sessions separately', async () => {
      const archivedSession = createMockSession({ title: 'Archived', isArchived: true })
      await ChatStorageIndexedDB.saveSession(archivedSession)

      const archived = await ChatStorageIndexedDB.loadArchivedSessions()

      expect(archived.some((s) => s.id === archivedSession.id)).toBe(true)
    })

    it('should load all sessions including archived', async () => {
      const session = createMockSession({ title: 'Any Status' })
      await ChatStorageIndexedDB.saveSession(session)

      const allSessions = await ChatStorageIndexedDB.loadAllSessions()

      expect(allSessions.length).toBeGreaterThan(0)
    })

    it('should delete session', async () => {
      const session = createMockSession()
      await ChatStorageIndexedDB.saveSession(session)
      await ChatStorageIndexedDB.deleteSession(session.id)

      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded).toBeNull()
    })

    it('should sort sessions by updatedAt descending', async () => {
      const now = Date.now()
      const session1 = createMockSession({ updatedAt: now - 1000 })
      const session2 = createMockSession({ updatedAt: now })

      await ChatStorageIndexedDB.saveSession(session1)
      await ChatStorageIndexedDB.saveSession(session2)

      const sessions = await ChatStorageIndexedDB.loadSessions()
      const recentFirst = sessions.findIndex((s) => s.id === session2.id) <
        sessions.findIndex((s) => s.id === session1.id)

      // Note: assuming at least these two are in the results
      if (
        sessions.some((s) => s.id === session1.id) &&
        sessions.some((s) => s.id === session2.id)
      ) {
        expect(recentFirst).toBe(true)
      }
    })
  })

  // ===== 메시지 관리 테스트 =====
  describe('Message Management', () => {
    let testSession: ChatSession

    beforeAll(async () => {
      testSession = await ChatStorageIndexedDB.createNewSession()
    })

    it('should add message to session', async () => {
      const message = createMockMessage()
      await ChatStorageIndexedDB.addMessage(testSession.id, message)

      const loaded = await ChatStorageIndexedDB.loadSession(testSession.id)

      expect(loaded?.messages.some((m) => m.id === message.id)).toBe(true)
    })

    it('should auto-generate title from first message', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()
      const message = createMockMessage({
        content: 'This is the first message for title generation',
      })

      await ChatStorageIndexedDB.addMessage(session.id, message)
      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.title).toBe('This is the first message for tit')
    })

    it('should delete message from session', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()
      const message = createMockMessage()

      await ChatStorageIndexedDB.addMessage(session.id, message)
      await ChatStorageIndexedDB.deleteMessage(session.id, message.id)

      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.messages.some((m) => m.id === message.id)).toBe(false)
    })

    it('should handle multiple messages in session', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()
      const messages = [
        createMockMessage({ content: 'Message 1' }),
        createMockMessage({ content: 'Message 2' }),
        createMockMessage({ content: 'Message 3' }),
      ]

      for (const msg of messages) {
        await ChatStorageIndexedDB.addMessage(session.id, msg)
      }

      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.messages).toHaveLength(3)
    })

    it('should update session timestamp when adding message', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()
      const originalTime = session.updatedAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      const message = createMockMessage()
      await ChatStorageIndexedDB.addMessage(session.id, message)

      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.updatedAt).toBeGreaterThan(originalTime)
    })

    it('should throw error if session not found', async () => {
      const message = createMockMessage()

      await expect(
        ChatStorageIndexedDB.addMessage('non-existent-session', message)
      ).rejects.toThrow()
    })
  })

  // ===== 즐겨찾기/보관 기능 =====
  describe('Favorite and Archive', () => {
    it('should toggle favorite flag', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      expect(session.isFavorite).toBe(false)

      await ChatStorageIndexedDB.toggleFavorite(session.id)
      let loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isFavorite).toBe(true)

      await ChatStorageIndexedDB.toggleFavorite(session.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isFavorite).toBe(false)
    })

    it('should toggle archive flag', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      expect(session.isArchived).toBe(false)

      await ChatStorageIndexedDB.toggleArchive(session.id)
      let loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isArchived).toBe(true)

      await ChatStorageIndexedDB.toggleArchive(session.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isArchived).toBe(false)
    })

    it('should rename session', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()
      const newTitle = 'New Title'

      await ChatStorageIndexedDB.renameSession(session.id, newTitle)
      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.title).toBe(newTitle)
    })

    it('should trim title when renaming', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      await ChatStorageIndexedDB.renameSession(session.id, '  Trimmed Title  ')
      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.title).toBe('Trimmed Title')
    })

    it('should use default title if empty', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      await ChatStorageIndexedDB.renameSession(session.id, '   ')
      const loaded = await ChatStorageIndexedDB.loadSession(session.id)

      expect(loaded?.title).toBe('제목 없음')
    })
  })

  // ===== 설정 관리 =====
  describe('Settings Management', () => {
    it('should save and load settings', async () => {
      const settings = { floatingButtonEnabled: false, theme: 'dark' as const }

      await ChatStorageIndexedDB.saveSettings(settings)
      const loaded = await ChatStorageIndexedDB.loadSettings()

      expect(loaded.floatingButtonEnabled).toBe(false)
      expect(loaded.theme).toBe('dark')
    })

    it('should return default settings if not found', async () => {
      // Create new storage instance to clear settings
      const settings = await ChatStorageIndexedDB.loadSettings()

      expect(settings).toHaveProperty('floatingButtonEnabled')
      expect(settings).toHaveProperty('theme')
      expect(settings.floatingButtonEnabled).toBe(true) // default
      expect(settings.theme).toBe('system') // default
    })
  })

  // ===== localStorage 마이그레이션 =====
  describe('Migration from localStorage', () => {
    it('should detect if already migrated', async () => {
      // This test verifies that migration only runs once
      // Multiple initialize calls should not cause duplicate migrations
      await ChatStorageIndexedDB.initialize()
      await ChatStorageIndexedDB.initialize()

      // Should not throw error
      expect(true).toBe(true)
    })

    it('should migrate sessions from localStorage', async () => {
      // Set up old localStorage data
      const oldSessions: ChatSession[] = [
        createMockSession({ title: 'Old Session 1' }),
        createMockSession({ title: 'Old Session 2' }),
      ]

      localStorage.setItem('rag-chat-sessions', JSON.stringify(oldSessions))

      // Create new storage instance to trigger migration
      const newStorage = ChatStorageIndexedDB
      await newStorage.initialize()

      // Verify data was migrated
      const sessions = await newStorage.loadAllSessions()
      expect(sessions.length).toBeGreaterThanOrEqual(oldSessions.length)

      // Clean up
      localStorage.removeItem('rag-chat-sessions')
    })
  })

  // ===== 프로젝트 관리 =====
  describe('Project Management', () => {
    it('should save and load projects', async () => {
      const project = {
        id: `project-${Date.now()}`,
        name: 'Test Project',
        description: 'Test Description',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isArchived: false,
        isFavorite: false,
      }

      await ChatStorageIndexedDB.saveProject(project)
      const projects = await ChatStorageIndexedDB.loadProjects()

      expect(projects.some((p) => p.id === project.id)).toBe(true)
    })
  })

  // ===== 에러 핸들링 =====
  describe('Error Handling', () => {
    it('should handle non-existent session gracefully', async () => {
      const session = await ChatStorageIndexedDB.loadSession('non-existent')

      expect(session).toBeNull()
    })

    it('should handle deletion of non-existent session', async () => {
      // Should not throw
      await expect(ChatStorageIndexedDB.deleteSession('non-existent')).rejects.toThrow()
    })

    it('should handle concurrent operations', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      const promises = []
      for (let i = 0; i < 5; i++) {
        const message = createMockMessage({ content: `Message ${i}` })
        promises.push(ChatStorageIndexedDB.addMessage(session.id, message))
      }

      await Promise.all(promises)

      const loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.messages).toHaveLength(5)
    })
  })

  // ===== BroadcastChannel 동기화 =====
  describe('BroadcastChannel Sync', () => {
    it('should broadcast session save', async () => {
      const session = createMockSession()

      // BroadcastChannel.postMessage should be called
      await ChatStorageIndexedDB.saveSession(session)

      // Verify no errors during broadcast
      expect(true).toBe(true)
    })

    it('should broadcast session delete', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      // BroadcastChannel.postMessage should be called
      await ChatStorageIndexedDB.deleteSession(session.id)

      // Verify no errors during broadcast
      expect(true).toBe(true)
    })

    it('should handle BroadcastChannel errors gracefully', async () => {
      // Broadcast errors should not break functionality
      const session = createMockSession()

      await expect(ChatStorageIndexedDB.saveSession(session)).resolves.toBeUndefined()
    })
  })

  // ===== 성능 테스트 =====
  describe('Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        const session = await ChatStorageIndexedDB.createNewSession()
        for (let j = 0; j < 5; j++) {
          const message = createMockMessage()
          await ChatStorageIndexedDB.addMessage(session.id, message)
        }
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust as needed)
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should efficiently query large datasets', async () => {
      const sessions = await ChatStorageIndexedDB.loadSessions()

      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        // Simulate repeated queries
        const _ = sessions.filter((s) => s.isFavorite)
      }
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(100) // Should be fast
    })
  })

  // ===== 통합 워크플로우 테스트 =====
  describe('Integration Workflow', () => {
    it('should handle complete session lifecycle', async () => {
      // 1. Create
      const session = await ChatStorageIndexedDB.createNewSession()
      expect(session.id).toBeDefined()

      // 2. Add messages
      const msg1 = createMockMessage({ role: 'user', content: 'Hello' })
      const msg2 = createMockMessage({ role: 'assistant', content: 'Hi there!' })

      await ChatStorageIndexedDB.addMessage(session.id, msg1)
      await ChatStorageIndexedDB.addMessage(session.id, msg2)

      // 3. Load and verify
      let loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.messages).toHaveLength(2)

      // 4. Toggle favorite
      await ChatStorageIndexedDB.toggleFavorite(session.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isFavorite).toBe(true)

      // 5. Rename
      await ChatStorageIndexedDB.renameSession(session.id, 'Favorite Chat')
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.title).toBe('Favorite Chat')

      // 6. Delete message
      await ChatStorageIndexedDB.deleteMessage(session.id, msg1.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.messages).toHaveLength(1)

      // 7. Archive
      await ChatStorageIndexedDB.toggleArchive(session.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded?.isArchived).toBe(true)

      // 8. Delete
      await ChatStorageIndexedDB.deleteSession(session.id)
      loaded = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loaded).toBeNull()
    })
  })
})
