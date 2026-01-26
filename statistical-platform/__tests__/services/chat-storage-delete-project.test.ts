/**
 * ChatStorageIndexedDB.deleteProject Tests
 * - 프로젝트 삭제 메서드 테스트
 * - IndexedDB 정합성 테스트
 * - BroadcastChannel 동기화 테스트
 */

import { vi, beforeEach, describe, it, expect } from 'vitest'

// vi.hoisted로 mock 정의 (hoisting 문제 해결)
const mockManager = vi.hoisted(() => ({
  isReady: true,
  initialize: vi.fn().mockResolvedValue(undefined),
  get: vi.fn(),
  getAll: vi.fn().mockResolvedValue([]),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  updateInTransaction: vi.fn(),
}))

// Mock IndexedDBManager - class 형태로 mock 생성
vi.mock('@/lib/services/storage/indexed-db-manager', () => {
  return {
    IndexedDBManager: class MockIndexedDBManager {
      isReady = mockManager.isReady
      initialize = mockManager.initialize
      get = mockManager.get
      getAll = mockManager.getAll
      put = mockManager.put
      delete = mockManager.delete
      updateInTransaction = mockManager.updateInTransaction
    },
  }
})

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    this.name = name
  }

  postMessage(_message: unknown): void {
    // Mock implementation
  }

  close(): void {
    // Mock implementation
  }
}

global.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel

describe('ChatStorageIndexedDB.deleteProject', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset mock defaults
    mockManager.isReady = true
    mockManager.delete.mockResolvedValue(undefined)
    mockManager.getAll.mockResolvedValue([])
    mockManager.put.mockResolvedValue(undefined)

    // Reset ChatStorageIndexedDB singleton state
    const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
    // @ts-expect-error - accessing private static for testing
    ChatStorageIndexedDB.manager = null
    // @ts-expect-error - accessing private static for testing
    ChatStorageIndexedDB.initialized = false

    // Re-initialize
    await ChatStorageIndexedDB.initialize()
  })

  describe('Basic Functionality', () => {
    it('should delete project from IndexedDB', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(mockManager.delete).toHaveBeenCalledWith('projects', projectId)
    })

    it('should throw error when delete fails', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'

      mockManager.delete.mockRejectedValueOnce(new Error('Delete failed'))

      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).rejects.toThrow()
    })

    it('should call ensureReady before delete', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(mockManager.isReady).toBe(true)
    })
  })

  describe('BroadcastChannel Integration', () => {
    it('should broadcast delete event', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'
      const postMessageSpy = vi.spyOn(MockBroadcastChannel.prototype, 'postMessage')

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'project',
          action: 'delete',
          id: projectId,
          timestamp: expect.any(Number),
        })
      )

      postMessageSpy.mockRestore()
    })

    it('should close BroadcastChannel after message', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'
      const closeSpy = vi.spyOn(MockBroadcastChannel.prototype, 'close')

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(closeSpy).toHaveBeenCalled()

      closeSpy.mockRestore()
    })
  })

  describe('Integration with Session Management', () => {
    it('should allow deleting project after removing sessions', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'

      mockManager.getAll.mockResolvedValueOnce([
        {
          id: 'session-1',
          title: 'Session 1',
          messages: [],
          projectId: projectId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          isArchived: false,
        },
        {
          id: 'session-2',
          title: 'Session 2',
          messages: [],
          projectId: projectId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          isArchived: false,
        },
      ])

      const sessions = await ChatStorageIndexedDB.loadAllSessions()
      expect(sessions).toHaveLength(2)

      for (const session of sessions.filter((s) => s.projectId === projectId)) {
        await ChatStorageIndexedDB.saveSession({
          ...session,
          projectId: undefined,
        })
      }

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(mockManager.delete).toHaveBeenCalledWith('projects', projectId)
    })

    it('should handle project with no sessions', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'empty-project'

      mockManager.getAll.mockResolvedValueOnce([])

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(mockManager.delete).toHaveBeenCalledWith('projects', projectId)
    })
  })

  describe('Error Handling', () => {
    it('should log error when delete fails', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const projectId = 'project-1'

      mockManager.delete.mockRejectedValueOnce(new Error('DB error'))

      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should handle BroadcastChannel errors gracefully', async () => {
      const { ChatStorageIndexedDB } = await import('@/lib/services/storage/chat-storage-indexed-db')
      const projectId = 'project-1'

      const originalBroadcastChannel = global.BroadcastChannel
      global.BroadcastChannel = vi.fn(() => {
        throw new Error('BroadcastChannel not supported')
      }) as unknown as typeof BroadcastChannel

      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).resolves.not.toThrow()

      global.BroadcastChannel = originalBroadcastChannel
    })
  })
})
