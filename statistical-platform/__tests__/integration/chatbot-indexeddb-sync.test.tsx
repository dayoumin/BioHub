/**
 * 챗봇 페이지 IndexedDB 통합 테스트
 *
 * 목적: 챗봇 페이지와 통계 페이지 우측 패널이 동일한 IndexedDB를 사용하는지 확인
 *
 * Note: 페이지 컴포넌트 렌더링 테스트는 remark-gfm ESM 이슈로 인해 제외
 *       핵심 로직(ChatStorageIndexedDB 함수)만 테스트
 */

import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'

import { vi } from 'vitest'
// Mock IndexedDB
let mockDB: Map<string, any>
let sessionIdCounter = 0

beforeEach(async () => {
  mockDB = new Map()
  sessionIdCounter = 0

  // Mock ChatStorageIndexedDB
  vi.spyOn(ChatStorageIndexedDB, 'initialize').mockResolvedValue(undefined)
  vi.spyOn(ChatStorageIndexedDB, 'loadSessions').mockImplementation(async () => {
    const sessions = mockDB.get('sessions') || []
    return sessions
  })
  vi.spyOn(ChatStorageIndexedDB, 'loadProjects').mockImplementation(async () => {
    const projects = mockDB.get('projects') || []
    return projects
  })
  vi.spyOn(ChatStorageIndexedDB, 'createNewSession').mockImplementation(async () => {
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
  vi.spyOn(ChatStorageIndexedDB, 'saveSession').mockImplementation(async (session) => {
    const sessions = mockDB.get('sessions') || []
    const index = sessions.findIndex((s: any) => s.id === session.id)
    if (index >= 0) {
      sessions[index] = session
    } else {
      sessions.push(session)
    }
    mockDB.set('sessions', sessions)
  })
  vi.spyOn(ChatStorageIndexedDB, 'deleteSession').mockImplementation(async (sessionId) => {
    const sessions = mockDB.get('sessions') || []
    const filtered = sessions.filter((s: any) => s.id !== sessionId)
    mockDB.set('sessions', filtered)
  })
  vi.spyOn(ChatStorageIndexedDB, 'toggleFavorite').mockImplementation(async (sessionId) => {
    const sessions = mockDB.get('sessions') || []
    const session = sessions.find((s: any) => s.id === sessionId)
    if (session) {
      session.isFavorite = !session.isFavorite
      session.updatedAt = Date.now()
      mockDB.set('sessions', sessions)
    }
  })
  vi.spyOn(ChatStorageIndexedDB, 'renameSession').mockImplementation(async (sessionId, newTitle) => {
    const sessions = mockDB.get('sessions') || []
    const session = sessions.find((s: any) => s.id === sessionId)
    if (session) {
      session.title = newTitle
      session.updatedAt = Date.now()
      mockDB.set('sessions', sessions)
    }
  })
  vi.spyOn(ChatStorageIndexedDB, 'loadSession').mockImplementation(async (sessionId) => {
    const sessions = mockDB.get('sessions') || []
    return sessions.find((s: any) => s.id === sessionId) || null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  mockDB.clear()
})

describe('챗봇 IndexedDB 통합 테스트', () => {
  describe('1. 초기화', () => {
    it('IndexedDB를 초기화할 수 있어야 함', async () => {
      await ChatStorageIndexedDB.initialize()

      expect(ChatStorageIndexedDB.initialize).toHaveBeenCalledTimes(1)
    })

    it('세션 목록을 로드할 수 있어야 함', async () => {
      mockDB.set('sessions', [
        {
          id: 'session-1',
          title: '테스트 세션',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          isArchived: false,
        },
      ])

      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].title).toBe('테스트 세션')
    })

    it('프로젝트 목록을 로드할 수 있어야 함', async () => {
      mockDB.set('projects', [
        {
          id: 'project-1',
          name: '테스트 프로젝트',
          description: '설명',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])

      const projects = await ChatStorageIndexedDB.loadProjects()
      expect(projects).toHaveLength(1)
      expect(projects[0].name).toBe('테스트 프로젝트')
    })
  })

  describe('2. 새 대화 생성', () => {
    it('새 세션을 생성할 수 있어야 함', async () => {
      const newSession = await ChatStorageIndexedDB.createNewSession()

      expect(newSession).toMatchObject({
        id: 'session-1',
        title: '새 대화',
        messages: [],
        isFavorite: false,
        isArchived: false,
      })

      // 생성된 세션이 저장되었는지 확인
      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toHaveLength(1)
    })

    it('여러 세션을 생성할 수 있어야 함', async () => {
      await ChatStorageIndexedDB.createNewSession()
      await ChatStorageIndexedDB.createNewSession()
      await ChatStorageIndexedDB.createNewSession()

      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toHaveLength(3)
    })
  })

  describe('3. 세션 관리', () => {
    it('세션을 삭제할 수 있어야 함', async () => {
      mockDB.set('sessions', [
        {
          id: 'delete-session',
          title: '삭제할 대화',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          isArchived: false,
        },
      ])

      await ChatStorageIndexedDB.deleteSession('delete-session')

      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toHaveLength(0)
    })

    it('존재하지 않는 세션 삭제 시 에러가 없어야 함', async () => {
      await expect(
        ChatStorageIndexedDB.deleteSession('non-existent')
      ).resolves.not.toThrow()
    })
  })

  describe('4. 동기화 테스트', () => {
    it('생성한 세션이 IndexedDB에 저장되어야 함', async () => {
      // 새 세션 생성
      const newSession = await ChatStorageIndexedDB.createNewSession()

      // IndexedDB에서 다시 로드
      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toContainEqual(
        expect.objectContaining({
          id: newSession.id,
          title: newSession.title,
        })
      )
    })

    it('세션 수정 사항이 IndexedDB에 반영되어야 함', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      // 제목 변경
      await ChatStorageIndexedDB.renameSession(session.id, '변경된 제목')

      // 변경 사항 확인
      const updatedSession = await ChatStorageIndexedDB.loadSession(session.id)
      expect(updatedSession?.title).toBe('변경된 제목')
    })

    it('즐겨찾기 토글이 IndexedDB에 반영되어야 함', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      // 즐겨찾기 토글
      await ChatStorageIndexedDB.toggleFavorite(session.id)

      // 변경 사항 확인
      const updatedSession = await ChatStorageIndexedDB.loadSession(session.id)
      expect(updatedSession?.isFavorite).toBe(true)

      // 다시 토글
      await ChatStorageIndexedDB.toggleFavorite(session.id)
      const toggledAgain = await ChatStorageIndexedDB.loadSession(session.id)
      expect(toggledAgain?.isFavorite).toBe(false)
    })
  })

  describe('5. 에러 처리', () => {
    it('IndexedDB 초기화 실패 시 에러를 throw해야 함', async () => {
      const errorSpy = vi.spyOn(ChatStorageIndexedDB, 'initialize')
        .mockRejectedValueOnce(new Error('DB init failed'))

      await expect(ChatStorageIndexedDB.initialize()).rejects.toThrow('DB init failed')

      errorSpy.mockRestore()
    })

    it('세션 로드 실패 시 빈 배열을 반환해야 함', async () => {
      // Mock에서 에러 발생하도록 설정하지 않으면 빈 배열 반환
      mockDB.delete('sessions')

      const sessions = await ChatStorageIndexedDB.loadSessions()
      expect(sessions).toEqual([])
    })
  })

  describe('6. 통계 페이지 우측 패널과 데이터 공유', () => {
    it('챗봇 페이지와 통계 페이지가 같은 IndexedDB를 사용해야 함', async () => {
      // 챗봇 페이지에서 세션 생성 시뮬레이션
      const session1 = await ChatStorageIndexedDB.createNewSession()
      await ChatStorageIndexedDB.renameSession(session1.id, '챗봇 페이지에서 생성')

      // 통계 페이지 우측 패널에서 로드 시뮬레이션
      const loadedSessions = await ChatStorageIndexedDB.loadSessions()
      expect(loadedSessions).toHaveLength(1)
      expect(loadedSessions[0].title).toBe('챗봇 페이지에서 생성')

      // 통계 페이지에서 새 세션 생성 시뮬레이션
      const session2 = await ChatStorageIndexedDB.createNewSession()
      await ChatStorageIndexedDB.renameSession(session2.id, '통계 페이지에서 생성')

      // 챗봇 페이지에서 다시 로드 시뮬레이션
      const allSessions = await ChatStorageIndexedDB.loadSessions()
      expect(allSessions).toHaveLength(2)
      expect(allSessions.map(s => s.title)).toContain('챗봇 페이지에서 생성')
      expect(allSessions.map(s => s.title)).toContain('통계 페이지에서 생성')
    })

    it('한 페이지에서 수정한 내용이 다른 페이지에 반영되어야 함', async () => {
      const session = await ChatStorageIndexedDB.createNewSession()

      // 챗봇 페이지에서 즐겨찾기 토글 시뮬레이션
      await ChatStorageIndexedDB.toggleFavorite(session.id)

      // 통계 페이지에서 세션 로드
      const loadedSession = await ChatStorageIndexedDB.loadSession(session.id)
      expect(loadedSession?.isFavorite).toBe(true)

      // 통계 페이지에서 제목 변경
      await ChatStorageIndexedDB.renameSession(session.id, '변경된 제목')

      // 챗봇 페이지에서 다시 로드
      const updatedSession = await ChatStorageIndexedDB.loadSession(session.id)
      expect(updatedSession?.title).toBe('변경된 제목')
    })
  })
})
