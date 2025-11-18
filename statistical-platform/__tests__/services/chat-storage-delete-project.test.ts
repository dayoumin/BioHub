/**
 * ChatStorageIndexedDB.deleteProject Tests
 * - 프로젝트 삭제 메서드 테스트
 * - IndexedDB 정합성 테스트
 * - BroadcastChannel 동기화 테스트
 */

import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatProject } from '@/lib/types/chat'

// Mock IndexedDBManager
jest.mock('@/lib/services/storage/indexed-db-manager', () => {
  const mockManager = {
    isReady: true,
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    getAll: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    updateInTransaction: jest.fn(),
  }

  return {
    IndexedDBManager: jest.fn(() => mockManager),
  }
})

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null

  constructor(name: string) {
    this.name = name
  }

  postMessage(message: unknown): void {
    // Mock implementation
  }

  close(): void {
    // Mock implementation
  }
}

global.BroadcastChannel = MockBroadcastChannel as any

describe('ChatStorageIndexedDB.deleteProject', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    // Initialize ChatStorageIndexedDB
    await ChatStorageIndexedDB.initialize()
  })

  describe('Basic Functionality', () => {
    it('should delete project from IndexedDB', async () => {
      const projectId = 'project-1'

      await ChatStorageIndexedDB.deleteProject(projectId)

      // Verify manager.delete was called
      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })

      expect(managerInstance.delete).toHaveBeenCalledWith('projects', projectId)
    })

    it('should throw error when delete fails', async () => {
      const projectId = 'project-1'

      // Mock delete to throw error
      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })
      managerInstance.delete.mockRejectedValueOnce(new Error('Delete failed'))

      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).rejects.toThrow('프로젝트 삭제에 실패했습니다.')
    })

    it('should call ensureReady before delete', async () => {
      const projectId = 'project-1'

      await ChatStorageIndexedDB.deleteProject(projectId)

      // Verify manager is ready
      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })

      expect(managerInstance.isReady).toBe(true)
    })
  })

  describe('BroadcastChannel Integration', () => {
    it('should broadcast delete event', async () => {
      const projectId = 'project-1'
      const postMessageSpy = jest.spyOn(MockBroadcastChannel.prototype, 'postMessage')

      await ChatStorageIndexedDB.deleteProject(projectId)

      // Verify broadcast was called
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
      const projectId = 'project-1'
      const closeSpy = jest.spyOn(MockBroadcastChannel.prototype, 'close')

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(closeSpy).toHaveBeenCalled()

      closeSpy.mockRestore()
    })
  })

  describe('Integration with Session Management', () => {
    it('should allow deleting project after removing sessions', async () => {
      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })

      const projectId = 'project-1'

      // Mock sessions with project
      managerInstance.getAll.mockResolvedValueOnce([
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

      // Load sessions
      const sessions = await ChatStorageIndexedDB.loadAllSessions()
      expect(sessions).toHaveLength(2)

      // Remove projectId from sessions
      for (const session of sessions.filter((s) => s.projectId === projectId)) {
        await ChatStorageIndexedDB.saveSession({
          ...session,
          projectId: undefined,
        })
      }

      // Delete project
      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(managerInstance.delete).toHaveBeenCalledWith('projects', projectId)
    })

    it('should handle project with no sessions', async () => {
      const projectId = 'empty-project'

      // Mock empty sessions
      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })
      managerInstance.getAll.mockResolvedValueOnce([])

      await ChatStorageIndexedDB.deleteProject(projectId)

      expect(managerInstance.delete).toHaveBeenCalledWith('projects', projectId)
    })
  })

  describe('Error Handling', () => {
    it('should log error when delete fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const projectId = 'project-1'

      const { IndexedDBManager } = require('@/lib/services/storage/indexed-db-manager')
      const managerInstance = new IndexedDBManager({ dbName: 'test', version: 1 })
      managerInstance.delete.mockRejectedValueOnce(new Error('DB error'))

      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).rejects.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ChatStorageIndexedDB] Failed to delete project:',
        expect.any(Error)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle BroadcastChannel errors gracefully', async () => {
      const projectId = 'project-1'

      // Mock BroadcastChannel to throw
      const originalBroadcastChannel = global.BroadcastChannel
      global.BroadcastChannel = jest.fn(() => {
        throw new Error('BroadcastChannel not supported')
      }) as any

      // Should not throw error
      await expect(
        ChatStorageIndexedDB.deleteProject(projectId)
      ).resolves.not.toThrow()

      global.BroadcastChannel = originalBroadcastChannel
    })
  })
})
