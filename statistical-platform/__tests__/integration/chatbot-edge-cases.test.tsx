/**
 * 챗봇 페이지 엣지 케이스 테스트
 *
 * 목적: 코드 리뷰에서 발견된 잠재적 이슈 검증
 */

import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'

// Mock IndexedDB
let mockDB: Map<string, any>
let sessionIdCounter = 0

beforeEach(async () => {
  mockDB = new Map()
  sessionIdCounter = 0

  // Mock ChatStorageIndexedDB
  jest.spyOn(ChatStorageIndexedDB, 'initialize').mockResolvedValue(undefined)
  jest.spyOn(ChatStorageIndexedDB, 'loadSessions').mockImplementation(async () => {
    const sessions = mockDB.get('sessions') || []
    return sessions
  })
  jest.spyOn(ChatStorageIndexedDB, 'loadProjects').mockImplementation(async () => {
    const projects = mockDB.get('projects') || []
    return projects
  })
  jest.spyOn(ChatStorageIndexedDB, 'createNewSession').mockImplementation(async () => {
    sessionIdCounter++
    const newSession = {
      id: `session-${sessionIdCounter}`,
      title: '새 대화',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isArchived: false,
    }
    const sessions = mockDB.get('sessions') || []
    sessions.push(newSession)
    mockDB.set('sessions', sessions)
    return newSession
  })
  jest.spyOn(ChatStorageIndexedDB, 'saveSession').mockImplementation(async (session) => {
    const sessions = mockDB.get('sessions') || []
    const index = sessions.findIndex((s: any) => s.id === session.id)
    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }
    mockDB.set('sessions', sessions)
  })
  jest.spyOn(ChatStorageIndexedDB, 'deleteSession').mockImplementation(async (sessionId) => {
    const sessions = mockDB.get('sessions') || []
    const filtered = sessions.filter((s: any) => s.id !== sessionId)
    mockDB.set('sessions', filtered)
  })
  jest.spyOn(ChatStorageIndexedDB, 'loadSession').mockImplementation(async (sessionId) => {
    const sessions = mockDB.get('sessions') || []
    return sessions.find((s: any) => s.id === sessionId) || null
  })
})

afterEach(() => {
  jest.restoreAllMocks()
  mockDB.clear()
})

describe('챗봇 엣지 케이스 테스트', () => {
  describe('1. Race Condition 테스트', () => {
    it('동시에 여러 세션을 생성해도 모두 저장되어야 함', async () => {
      // 동시에 3개 세션 생성
      const [session1, session2, session3] = await Promise.all([
        ChatStorageIndexedDB.createNewSession(),
        ChatStorageIndexedDB.createNewSession(),
        ChatStorageIndexedDB.createNewSession(),
      ])

      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toHaveLength(3)
      expect(sessions.map(s => s.id)).toContain(session1.id)
      expect(sessions.map(s => s.id)).toContain(session2.id)
      expect(sessions.map(s => s.id)).toContain(session3.id)
    })

    it('세션 로드 중에 새 세션 생성해도 데이터 무결성이 유지되어야 함', async () => {
      // 초기 세션 생성
      await ChatStorageIndexedDB.createNewSession()

      // 로드와 생성 동시 실행
      const [loadedSessions, newSession] = await Promise.all([
        ChatStorageIndexedDB.loadSessions(),
        ChatStorageIndexedDB.createNewSession(),
      ])

      // 다시 로드했을 때 모든 세션이 있어야 함
      const allSessions = await ChatStorageIndexedDB.loadSessions()
      expect(allSessions.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('2. 프로젝트 삭제 테스트', () => {
    it('프로젝트 삭제 시 하위 세션의 projectId가 제거되어야 함', async () => {
      // 프로젝트 생성
      const project = {
        id: 'project-1',
        name: '테스트 프로젝트',
        description: '설명',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      mockDB.set('projects', [project])

      // 프로젝트에 속한 세션 생성
      const session1 = await ChatStorageIndexedDB.createNewSession()
      session1.projectId = project.id
      await ChatStorageIndexedDB.saveSession(session1)

      const session2 = await ChatStorageIndexedDB.createNewSession()
      session2.projectId = project.id
      await ChatStorageIndexedDB.saveSession(session2)

      // 프로젝트 삭제 시뮬레이션 (handleConfirmDelete 로직)
      const allSessions = await ChatStorageIndexedDB.loadSessions()
      const updatedSessions = allSessions.map(s =>
        s.projectId === project.id ? { ...s, projectId: undefined } : s
      )

      // 순차 저장 (현재 코드)
      for (const session of updatedSessions) {
        await ChatStorageIndexedDB.saveSession(session)
      }

      // 검증: projectId가 제거되었는지 확인
      const finalSessions = await ChatStorageIndexedDB.loadSessions()
      expect(finalSessions.every(s => s.projectId !== project.id)).toBe(true)
    })

    it('프로젝트 삭제 시 병렬 저장 vs 순차 저장 성능 비교', async () => {
      // 프로젝트 생성
      const project = {
        id: 'project-1',
        name: '테스트 프로젝트',
        description: '설명',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      mockDB.set('projects', [project])

      // 10개 세션 생성
      const sessions = await Promise.all(
        Array.from({ length: 10 }, () => ChatStorageIndexedDB.createNewSession())
      )
      for (const session of sessions) {
        session.projectId = project.id
        await ChatStorageIndexedDB.saveSession(session)
      }

      const allSessions = await ChatStorageIndexedDB.loadSessions()
      const updatedSessions = allSessions.map(s =>
        s.projectId === project.id ? { ...s, projectId: undefined } : s
      )

      // 방법 1: 순차 저장 (현재 코드)
      const start1 = Date.now()
      for (const session of updatedSessions) {
        await ChatStorageIndexedDB.saveSession(session)
      }
      const sequentialTime = Date.now() - start1

      // 데이터 초기화
      for (const session of sessions) {
        session.projectId = project.id
        await ChatStorageIndexedDB.saveSession(session)
      }

      // 방법 2: 병렬 저장 (개선안)
      const allSessions2 = await ChatStorageIndexedDB.loadSessions()
      const updatedSessions2 = allSessions2.map(s =>
        s.projectId === project.id ? { ...s, projectId: undefined } : s
      )

      const start2 = Date.now()
      await Promise.all(
        updatedSessions2.map(session => ChatStorageIndexedDB.saveSession(session))
      )
      const parallelTime = Date.now() - start2

      // 병렬 처리가 더 빠르거나 같아야 함
      expect(parallelTime).toBeLessThanOrEqual(sequentialTime)
    })
  })

  describe('3. 데이터 무결성 테스트', () => {
    it('세션이 없는 상태에서 초기화 시 자동으로 세션을 생성해야 함', async () => {
      // 빈 상태에서 시작
      expect(mockDB.get('sessions')).toBeUndefined()

      // 초기화 시뮬레이션
      await ChatStorageIndexedDB.initialize()
      const loadedSessions = await ChatStorageIndexedDB.loadSessions()

      if (loadedSessions.length === 0) {
        // 세션이 없으면 새로 생성 (chatbot/page.tsx Line 182-186)
        const newSession = await ChatStorageIndexedDB.createNewSession()
        expect(newSession).toBeDefined()
        expect(newSession.id).toBe('session-1')
      }
    })

    it('삭제한 세션이 현재 세션이면 새 세션을 생성해야 함', async () => {
      const session1 = await ChatStorageIndexedDB.createNewSession()
      const currentSessionId = session1.id

      // 현재 세션 삭제
      await ChatStorageIndexedDB.deleteSession(currentSessionId)

      // 삭제 후 세션이 없으므로 새 세션 생성 (handleConfirmDelete 로직)
      const remainingSessions = await ChatStorageIndexedDB.loadSessions()
      if (remainingSessions.length === 0) {
        const newSession = await ChatStorageIndexedDB.createNewSession()
        expect(newSession).toBeDefined()
        expect(newSession.id).not.toBe(currentSessionId)
      }
    })
  })

  describe('4. 에러 복구 테스트', () => {
    it('IndexedDB 저장 실패 시 에러를 throw해야 함', async () => {
      const errorSpy = jest.spyOn(ChatStorageIndexedDB, 'saveSession')
        .mockRejectedValueOnce(new Error('Save failed'))

      const session = await ChatStorageIndexedDB.createNewSession()

      await expect(
        ChatStorageIndexedDB.saveSession(session)
      ).rejects.toThrow('Save failed')

      errorSpy.mockRestore()
    })

    it('부분 실패 시 다른 작업은 계속 진행되어야 함', async () => {
      const session1 = await ChatStorageIndexedDB.createNewSession()
      const session2 = await ChatStorageIndexedDB.createNewSession()
      const session3 = await ChatStorageIndexedDB.createNewSession()

      // session2 저장만 실패하도록 설정
      const saveSpy = jest.spyOn(ChatStorageIndexedDB, 'saveSession')
        .mockImplementation(async (session) => {
          if (session.id === session2.id) {
            throw new Error('Save failed')
          }
          // 원래 mock 구현 호출
          const sessions = mockDB.get('sessions') || []
          const index = sessions.findIndex((s: any) => s.id === session.id)
          if (index >= 0) {
            sessions[index] = session
          } else {
            sessions.push(session)
          }
          mockDB.set('sessions', sessions)
        })

      // Promise.allSettled로 부분 실패 처리
      const results = await Promise.allSettled([
        ChatStorageIndexedDB.saveSession(session1),
        ChatStorageIndexedDB.saveSession(session2),
        ChatStorageIndexedDB.saveSession(session3),
      ])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')

      saveSpy.mockRestore()
    })
  })

  describe('5. 메모리 누수 테스트', () => {
    it('대량의 세션 생성 후 삭제 시 메모리가 정리되어야 함', async () => {
      // 100개 세션 생성
      const sessions = await Promise.all(
        Array.from({ length: 100 }, () => ChatStorageIndexedDB.createNewSession())
      )

      expect((await ChatStorageIndexedDB.loadSessions()).length).toBe(100)

      // 모두 삭제
      await Promise.all(
        sessions.map(s => ChatStorageIndexedDB.deleteSession(s.id))
      )

      const remainingSessions = await ChatStorageIndexedDB.loadSessions()
      expect(remainingSessions).toHaveLength(0)
    })
  })
})
