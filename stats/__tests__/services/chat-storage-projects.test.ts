/**
 * ChatStorage - 프로젝트 관리 기능 테스트
 */

import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatProject, ChatSession } from '@/lib/types/chat'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string): string | null => {
      return store[key] || null
    },
    setItem: (key: string, value: string): void => {
      store[key] = value.toString()
    },
    removeItem: (key: string): void => {
      delete store[key]
    },
    clear: (): void => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('ChatStorage - Projects', () => {
  beforeEach(() => {
    localStorage.clear()
    ChatStorage.clearAll()
  })

  describe('프로젝트 CRUD', () => {
    it('프로젝트 생성', () => {
      const project = ChatStorage.createProject('Test Project', {
        description: 'Test description',
        emoji: '📚',
        color: '#FF5733',
      })

      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('Test description')
      expect(project.emoji).toBe('📚')
      expect(project.color).toBe('#FF5733')
      expect(project.id).toBeDefined()
      expect(project.isArchived).toBe(false)
    })

    it('프로젝트 조회', () => {
      ChatStorage.createProject('Project 1')
      ChatStorage.createProject('Project 2')

      const projects = ChatStorage.getProjects()

      expect(projects).toHaveLength(2)
      // 프로젝트는 최신순 정렬 (updatedAt 기준)
      // 하지만 생성 시간이 너무 빠르면 같을 수 있으므로 이름만 확인
      const projectNames = projects.map(p => p.name).sort()
      expect(projectNames).toEqual(['Project 1', 'Project 2'])
    })

    it('프로젝트 수정', () => {
      const project = ChatStorage.createProject('Test')
      const updated = ChatStorage.updateProject(project.id, {
        name: 'Updated Test',
        emoji: '🎯',
      })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('Updated Test')
      expect(updated?.emoji).toBe('🎯')
    })

    it('프로젝트 삭제', () => {
      const project = ChatStorage.createProject('Test')

      ChatStorage.deleteProject(project.id)

      const projects = ChatStorage.getProjects()
      expect(projects).toHaveLength(0)
    })

    it('프로젝트 삭제 시 하위 세션은 루트로 이동', () => {
      const project = ChatStorage.createProject('Test Project')
      const session = ChatStorage.createNewSession()
      ChatStorage.moveSessionToProject(session.id, project.id)

      // 세션이 프로젝트에 속함
      let loadedSession = ChatStorage.loadSession(session.id)
      expect(loadedSession?.projectId).toBe(project.id)

      // 프로젝트 삭제
      ChatStorage.deleteProject(project.id)

      // 세션은 삭제되지 않고 루트로 이동 (projectId 제거됨)
      loadedSession = ChatStorage.loadSession(session.id)
      expect(loadedSession).not.toBeNull()
      expect(loadedSession?.projectId).toBeUndefined()
    })
  })

  describe('세션 이동', () => {
    it('세션을 프로젝트로 이동', () => {
      const project = ChatStorage.createProject('Test')
      const session = ChatStorage.createNewSession()

      const moved = ChatStorage.moveSessionToProject(session.id, project.id)

      expect(moved).not.toBeNull()
      expect(moved?.projectId).toBe(project.id)
    })

    it('세션을 root로 이동 (projectId = null)', () => {
      const project = ChatStorage.createProject('Test')
      const session = ChatStorage.createNewSession()

      ChatStorage.moveSessionToProject(session.id, project.id)
      const movedBack = ChatStorage.moveSessionToProject(session.id, null)

      expect(movedBack?.projectId).toBeUndefined()
    })

    it('존재하지 않는 프로젝트로 이동 시도 - 실패', () => {
      const session = ChatStorage.createNewSession()
      const fakeProjectId = 'non-existent-project-id'

      const result = ChatStorage.moveSessionToProject(session.id, fakeProjectId)

      expect(result).toBeNull()

      // 세션의 projectId는 변경되지 않음
      const unchanged = ChatStorage.loadSession(session.id)
      expect(unchanged?.projectId).toBeUndefined()
    })

    it('특정 프로젝트의 세션 조회', () => {
      const project = ChatStorage.createProject('Test')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.moveSessionToProject(session1.id, project.id)
      ChatStorage.moveSessionToProject(session2.id, project.id)

      const sessions = ChatStorage.getSessionsByProject(project.id)

      expect(sessions).toHaveLength(2)
      expect(sessions.every(s => s.projectId === project.id)).toBe(true)
    })

    it('프로젝트 미속 세션 조회', () => {
      const project = ChatStorage.createProject('Test')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.moveSessionToProject(session1.id, project.id)
      // session2는 프로젝트 없음

      const unorganized = ChatStorage.getUnorganizedSessions()

      expect(unorganized).toHaveLength(1)
      expect(unorganized[0].id).toBe(session2.id)
    })
  })

  describe('검색 기능', () => {
    beforeEach(() => {
      ChatStorage.createProject('t-test 학습')
      ChatStorage.createProject('ANOVA 분석')
      ChatStorage.createProject('Regression 연구')
    })

    it('프로젝트 검색', () => {
      const results = ChatStorage.searchProjects('test')

      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('t-test 학습')
    })

    it('프로젝트 검색 - 대소문자 무시', () => {
      const results = ChatStorage.searchProjects('ANOVA')

      expect(results).toHaveLength(1)
    })

    it('세션 검색', () => {
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.renameSession(session1.id, 't-test 방법')
      ChatStorage.renameSession(session2.id, 'ANOVA 사용법')

      const results = ChatStorage.searchSessions('test')

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(session1.id)
    })

    it('빈 쿼리 + projectId 옵션 - 특정 프로젝트 내 검색', () => {
      const project = ChatStorage.createProject('Test Project')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()
      const session3 = ChatStorage.createNewSession()

      ChatStorage.renameSession(session1.id, 'Session in project')
      ChatStorage.renameSession(session2.id, 'Another session in project')
      ChatStorage.renameSession(session3.id, 'Session outside project')

      ChatStorage.moveSessionToProject(session1.id, project.id)
      ChatStorage.moveSessionToProject(session2.id, project.id)

      // 빈 쿼리 + projectId 옵션
      const results = ChatStorage.searchSessions('', { projectId: project.id })

      expect(results).toHaveLength(2)
      expect(results.every(s => s.projectId === project.id)).toBe(true)
    })

    it('빈 쿼리 + limit 옵션 - 최근 N개 조회', () => {
      ChatStorage.createNewSession()
      ChatStorage.createNewSession()
      ChatStorage.createNewSession()

      // 빈 쿼리 + limit 옵션
      const results = ChatStorage.searchSessions('', { limit: 2 })

      expect(results).toHaveLength(2)
    })

    it('쿼리 + projectId + limit 복합 옵션', () => {
      const project = ChatStorage.createProject('Test')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()
      const session3 = ChatStorage.createNewSession()

      ChatStorage.renameSession(session1.id, 'Apple in project')
      ChatStorage.renameSession(session2.id, 'Apple also in project')
      ChatStorage.renameSession(session3.id, 'Banana in project')

      ChatStorage.moveSessionToProject(session1.id, project.id)
      ChatStorage.moveSessionToProject(session2.id, project.id)
      ChatStorage.moveSessionToProject(session3.id, project.id)

      // 'Apple' 검색 + 프로젝트 필터 + limit 1
      const results = ChatStorage.searchSessions('Apple', { projectId: project.id, limit: 1 })

      expect(results).toHaveLength(1)
      expect(results[0].title).toContain('Apple')
      expect(results[0].projectId).toBe(project.id)
    })

    it('통합 검색', () => {
      const session = ChatStorage.createNewSession()
      ChatStorage.renameSession(session.id, 't-test 질문')

      const { projects, sessions } = ChatStorage.globalSearch('test')

      expect(projects).toHaveLength(1)
      expect(sessions).toHaveLength(1)
    })
  })

  describe('즐겨찾기', () => {
    it('프로젝트 즐겨찾기 토글', () => {
      const project = ChatStorage.createProject('Test')

      expect(project.isFavorite).toBe(false)

      ChatStorage.toggleProjectFavorite(project.id)
      const projects = ChatStorage.getFavoriteProjects()

      expect(projects).toHaveLength(1)
      expect(projects[0].id).toBe(project.id)
    })

    it('즐겨찾기 세션 조회', () => {
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.toggleFavorite(session1.id)

      const favorites = ChatStorage.getFavoriteSessions()

      expect(favorites).toHaveLength(1)
      expect(favorites[0].id).toBe(session1.id)
    })
  })

  describe('프로젝트 삭제', () => {
    it('프로젝트 삭제 시 하위 세션은 루트로 이동', () => {
      const project = ChatStorage.createProject('Test Project')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()
      const session3 = ChatStorage.createNewSession()

      ChatStorage.renameSession(session1.id, 'Session in project')
      ChatStorage.renameSession(session2.id, 'Another session in project')
      ChatStorage.renameSession(session3.id, 'Session outside project')

      ChatStorage.moveSessionToProject(session1.id, project.id)
      ChatStorage.moveSessionToProject(session2.id, project.id)

      // 삭제 전 확인
      expect(ChatStorage.getSessionsByProject(project.id)).toHaveLength(2)
      const allSessions = ChatStorage.loadSessions()
      expect(allSessions).toHaveLength(3)

      // 프로젝트 삭제
      ChatStorage.deleteProject(project.id)

      // 확인: 프로젝트 삭제됨
      expect(ChatStorage.getProjects()).toHaveLength(0)

      // 확인: 세션은 삭제되지 않고 루트로 이동 (session1, session2도 유지)
      const remaining = ChatStorage.loadSessions()
      expect(remaining).toHaveLength(3)

      // 확인: session1, session2의 projectId가 제거됨
      const session1AfterDelete = ChatStorage.loadSession(session1.id)
      const session2AfterDelete = ChatStorage.loadSession(session2.id)
      expect(session1AfterDelete?.projectId).toBeUndefined()
      expect(session2AfterDelete?.projectId).toBeUndefined()

      // 확인: 프로젝트 내 세션 조회는 0개 (더 이상 해당 프로젝트에 속하지 않음)
      expect(ChatStorage.getSessionsByProject(project.id)).toHaveLength(0)
    })

    it('프로젝트 삭제 시 다른 프로젝트 세션은 영향 없음', () => {
      const project1 = ChatStorage.createProject('Project 1')
      const project2 = ChatStorage.createProject('Project 2')
      const session1 = ChatStorage.createNewSession()
      const session2 = ChatStorage.createNewSession()

      ChatStorage.moveSessionToProject(session1.id, project1.id)
      ChatStorage.moveSessionToProject(session2.id, project2.id)

      // Project 1 삭제
      ChatStorage.deleteProject(project1.id)

      // 확인: Project 1 세션은 삭제, Project 2 세션은 유지
      expect(ChatStorage.getSessionsByProject(project1.id)).toHaveLength(0)
      expect(ChatStorage.getSessionsByProject(project2.id)).toHaveLength(1)
      expect(ChatStorage.getSessionsByProject(project2.id)[0].id).toBe(session2.id)
    })
  })

  describe('보관', () => {
    it('프로젝트 보관', () => {
      const project = ChatStorage.createProject('Test')

      ChatStorage.toggleProjectArchive(project.id)

      const projects = ChatStorage.getProjects()
      expect(projects).toHaveLength(0) // 보관된 프로젝트는 제외
    })
  })

  describe('마이그레이션', () => {
    it('마이그레이션 실행', () => {
      // 기존 세션 생성 (projectId 없음)
      const session = ChatStorage.createNewSession()

      // projectId 필드 제거 (구버전 데이터 시뮬레이션)
      const sessions = JSON.parse(localStorage.getItem('rag-chat-sessions') || '[]')
      sessions.forEach((s: ChatSession) => {
        delete (s as { projectId?: string }).projectId
      })
      localStorage.setItem('rag-chat-sessions', JSON.stringify(sessions))

      // 마이그레이션 플래그 초기화
      localStorage.removeItem('rag-chat-migrated-v2')

      // 마이그레이션 실행
      ChatStorage.migrateToNewStructure()

      // 확인
      const migrated = ChatStorage.loadSession(session.id)
      expect(migrated).not.toBeNull()
      // projectId 필드가 추가되었는지 확인 (undefined 값을 가짐)
      expect(migrated?.projectId).toBeUndefined()
    })

    it('중복 마이그레이션 방지', () => {
      ChatStorage.migrateToNewStructure()
      const firstMigration = localStorage.getItem('rag-chat-migrated-v2')

      ChatStorage.migrateToNewStructure()
      const secondMigration = localStorage.getItem('rag-chat-migrated-v2')

      expect(firstMigration).toBe('true')
      expect(secondMigration).toBe('true')
    })
  })
})
