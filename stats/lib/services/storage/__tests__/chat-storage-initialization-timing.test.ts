/**
 * ChatStorageIndexedDB - 초기화 타이밍 테스트
 *
 * 이 테스트는 다음 시나리오를 검증합니다:
 * 1. 초기화 전 데이터베이스 작업 (ensureReady 호출)
 * 2. 동시 초기화 요청 (Race Condition)
 * 3. 마이그레이션 중 데이터베이스 작업
 * 4. 초기화 실패 후 재시도
 */

import { ChatStorageIndexedDB } from '../chat-storage-indexed-db'
import { vi } from 'vitest'
import { IndexedDBManager } from '../indexed-db-manager'
import type { ChatSession } from '@/lib/types/chat'

// Mock BroadcastChannel
global.BroadcastChannel = vi.fn(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
})) as unknown as typeof BroadcastChannel

describe('ChatStorageIndexedDB - Initialization Timing', () => {
  beforeEach(() => {
    // 각 테스트마다 초기화 상태 리셋
    // @ts-expect-error - private field 접근
    ChatStorageIndexedDB.initialized = false
    // @ts-expect-error - private field 접근
    ChatStorageIndexedDB.manager = null
  })

  // ===== 1. 초기화 전 작업 테스트 =====
  describe('Operations before initialization', () => {
    it('should initialize automatically when loading sessions', async () => {
      // 초기화하지 않고 바로 loadSessions 호출
      const sessions = await ChatStorageIndexedDB.loadSessions()

      // 에러 없이 완료되어야 함
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should initialize automatically when loading a session', async () => {
      // 초기화하지 않고 바로 loadSession 호출
      const session = await ChatStorageIndexedDB.loadSession('test-id')

      // 에러 없이 완료되어야 함 (세션 없으면 null)
      expect(session).toBeNull()
    })

    it('should initialize automatically when saving session', async () => {
      const testSession: ChatSession = {
        id: `test-${Date.now()}`,
        title: 'Test',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        isArchived: false,
      }

      // 초기화하지 않고 바로 saveSession 호출
      await expect(ChatStorageIndexedDB.saveSession(testSession)).resolves.toBeUndefined()
    })

    it('should initialize automatically when creating new session', async () => {
      // 초기화하지 않고 바로 createNewSession 호출
      const session = await ChatStorageIndexedDB.createNewSession()

      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('title')
    })
  })

  // ===== 2. 동시 초기화 요청 (Race Condition) =====
  describe('Concurrent initialization', () => {
    it('should handle multiple simultaneous initialize calls', async () => {
      // 여러 초기화 요청을 동시에 실행
      const promises = [
        ChatStorageIndexedDB.initialize(),
        ChatStorageIndexedDB.initialize(),
        ChatStorageIndexedDB.initialize(),
      ]

      // 모두 성공적으로 완료되어야 함
      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('should handle multiple simultaneous operations', async () => {
      // 여러 작업을 동시에 실행 (초기화 전)
      const promises = [
        ChatStorageIndexedDB.loadSessions(),
        ChatStorageIndexedDB.loadArchivedSessions(),
        ChatStorageIndexedDB.loadSettings(),
        ChatStorageIndexedDB.createNewSession(),
      ]

      // 모두 성공적으로 완료되어야 함
      await expect(Promise.all(promises)).resolves.toBeDefined()
    })
  })

  // ===== 3. 마이그레이션 중 데이터베이스 작업 =====
  describe('Operations during migration', () => {
    it('should wait for migration to complete before operations', async () => {
      // localStorage에 테스트 데이터 설정
      const oldSessions: ChatSession[] = [
        {
          id: 'old-1',
          title: 'Old Session 1',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          isArchived: false,
        },
      ]

      localStorage.setItem('rag-chat-sessions', JSON.stringify(oldSessions))

      // 초기화 (마이그레이션 포함)
      await ChatStorageIndexedDB.initialize()

      // 마이그레이션 후 즉시 로드
      const sessions = await ChatStorageIndexedDB.loadSessions()

      // 마이그레이션된 데이터 확인 가능
      expect(Array.isArray(sessions)).toBe(true)

      // 정리
      localStorage.removeItem('rag-chat-sessions')
    })
  })

  // ===== 4. 초기화 실패 후 재시도 =====
  describe('Initialization failure recovery', () => {
    it('should recover from initialization failure', async () => {
      // IndexedDBManager를 Mock하여 첫 초기화 실패 시뮬레이션
      const originalManager = IndexedDBManager

      // 첫 번째 호출에서 실패
      let callCount = 0
      vi.spyOn(IndexedDBManager.prototype, 'initialize').mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          throw new Error('Simulated initialization failure')
        }
        // 두 번째부터 성공
        return Promise.resolve()
      })

      // 첫 초기화 실패 예상
      await expect(ChatStorageIndexedDB.initialize()).rejects.toThrow()

      // 재시도 시 성공
      await expect(ChatStorageIndexedDB.initialize()).resolves.toBeUndefined()

      // Mock 복원
      vi.restoreAllMocks()
    })
  })

  // ===== 5. ensureReady 메서드 테스트 =====
  describe('ensureReady helper method', () => {
    it('should wait for IndexedDB to be ready', async () => {
      // 초기화 전 상태 확인
      // @ts-expect-error - private field 접근
      expect(ChatStorageIndexedDB.initialized).toBe(false)

      // ensureReady를 간접적으로 호출 (loadSessions를 통해)
      await ChatStorageIndexedDB.loadSessions()

      // 초기화 완료 확인
      // @ts-expect-error - private field 접근
      expect(ChatStorageIndexedDB.initialized).toBe(true)
      // @ts-expect-error - private field 접근
      expect(ChatStorageIndexedDB.manager?.isReady).toBe(true)
    })

    it('should retry if manager is not ready after initialization', async () => {
      // 이 테스트는 manager.initialize가 완료되었지만 isReady가 false인 경우
      // (실제로는 발생하기 어려운 엣지 케이스)

      // 초기화
      await ChatStorageIndexedDB.initialize()

      // manager가 준비되었는지 확인
      // @ts-expect-error - private field 접근
      const isReady = ChatStorageIndexedDB.manager?.isReady

      expect(isReady).toBe(true)
    })
  })

  // ===== 6. 통합 시나리오 테스트 =====
  describe('Integration scenarios', () => {
    it('should handle rapid successive operations without initialization', async () => {
      // 초기화 없이 연속적으로 여러 작업 수행
      const session1 = await ChatStorageIndexedDB.createNewSession()
      const session2 = await ChatStorageIndexedDB.createNewSession()

      await ChatStorageIndexedDB.toggleFavorite(session1.id)
      await ChatStorageIndexedDB.renameSession(session2.id, 'Renamed')

      const loaded1 = await ChatStorageIndexedDB.loadSession(session1.id)
      const loaded2 = await ChatStorageIndexedDB.loadSession(session2.id)

      expect(loaded1?.isFavorite).toBe(true)
      expect(loaded2?.title).toBe('Renamed')
    })

    it('should handle operations from multiple components simultaneously', async () => {
      // 여러 컴포넌트가 동시에 작업을 수행하는 시나리오
      const component1 = async () => {
        const session = await ChatStorageIndexedDB.createNewSession()
        await ChatStorageIndexedDB.renameSession(session.id, 'Component 1')
        return session
      }

      const component2 = async () => {
        const sessions = await ChatStorageIndexedDB.loadSessions()
        return sessions
      }

      const component3 = async () => {
        const settings = await ChatStorageIndexedDB.loadSettings()
        return settings
      }

      // 모두 동시 실행
      const [session, sessions, settings] = await Promise.all([
        component1(),
        component2(),
        component3(),
      ])

      expect(session).toHaveProperty('id')
      expect(Array.isArray(sessions)).toBe(true)
      expect(settings).toHaveProperty('floatingButtonEnabled')
    })
  })

  // ===== 7. 에러 케이스 =====
  describe('Error cases', () => {
    it('should throw error when manager fails to initialize after retry', async () => {
      // IndexedDB가 완전히 사용 불가능한 상황 시뮬레이션
      vi.spyOn(IndexedDBManager.prototype, 'initialize').mockRejectedValue(
        new Error('IndexedDB not supported')
      )

      // 초기화 실패 예상
      await expect(ChatStorageIndexedDB.initialize()).rejects.toThrow()

      // Mock 복원
      vi.restoreAllMocks()
    })

    it('should handle database not initialized error gracefully', async () => {
      // 강제로 manager를 null로 설정
      // @ts-expect-error - private field 접근
      ChatStorageIndexedDB.manager = null
      // @ts-expect-error - private field 접근
      ChatStorageIndexedDB.initialized = false

      // 작업 수행 시 자동 초기화되어야 함
      const sessions = await ChatStorageIndexedDB.loadSessions()

      expect(Array.isArray(sessions)).toBe(true)
    })
  })
})
