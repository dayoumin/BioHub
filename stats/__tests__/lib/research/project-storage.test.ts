/**
 * research/project-storage 실패 전파 + 롤백 테스트
 *
 * writeJson이 throw하는 시나리오에서:
 * - deleteResearchProject: 두 번째 write 실패 시 첫 번째 write 롤백
 * - saveResearchProject / upsertProjectEntityRef: throw 전파
 */

import {
  listResearchProjects,
  saveResearchProject,
  deleteResearchProject,
  listProjectEntityRefs,
  upsertProjectEntityRef,
  removeProjectEntityRef,
} from '@/lib/research/project-storage'
import type { ResearchProject } from '@/lib/types/research'

function makeProject(id: string, name = 'Test Project'): ResearchProject {
  const now = new Date().toISOString()
  return {
    id,
    name,
    description: '',
    status: 'active' as const,
    createdAt: now,
    updatedAt: now,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('writeJson throw 전파', () => {
  it('saveResearchProject: localStorage 실패 → throw', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    expect(() => saveResearchProject(makeProject('p1'))).toThrow('[research-project-storage]')
    spy.mockRestore()
  })

  it('upsertProjectEntityRef: localStorage 실패 → throw', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    expect(() =>
      upsertProjectEntityRef({
        projectId: 'proj-1',
        entityKind: 'analysis',
        entityId: 'a-1',
        label: 'Test',
      })
    ).toThrow('[research-project-storage]')
    spy.mockRestore()
  })
})

describe('deleteResearchProject 롤백', () => {
  it('두 번째 write(refs) 실패 시 → 첫 번째 write(projects) 롤백', () => {
    // 사전 조건: 프로젝트 + ref가 존재
    saveResearchProject(makeProject('p1'))
    saveResearchProject(makeProject('p2'))
    upsertProjectEntityRef({
      projectId: 'p1',
      entityKind: 'analysis',
      entityId: 'a-1',
      label: 'Analysis 1',
    })

    // setItem을 가로채서 두 번째 호출에서만 실패
    let writeCount = 0
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      writeCount++
      if (writeCount === 1) {
        // 첫 번째 write (projects) — 성공시킴
        Object.getPrototypeOf(localStorage).setItem.call(localStorage, key, value)
      } else if (writeCount === 2) {
        // 두 번째 write (refs) — 실패
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      } else {
        // 롤백 writes — 성공시킴
        Object.getPrototypeOf(localStorage).setItem.call(localStorage, key, value)
      }
    })

    expect(() => deleteResearchProject('p1')).toThrow()
    spy.mockRestore()

    // 롤백 확인: 프로젝트 p1이 여전히 존재
    const projects = listResearchProjects()
    expect(projects).toHaveLength(2)
    expect(projects.find(p => p.id === 'p1')).toBeDefined()

    // ref도 여전히 존재
    const refs = listProjectEntityRefs('p1')
    expect(refs).toHaveLength(1)
  })

  it('첫 번째 write(projects) 실패 시 → 상태 변경 없이 throw', () => {
    saveResearchProject(makeProject('p1'))

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    expect(() => deleteResearchProject('p1')).toThrow()
    spy.mockRestore()

    // 원본 데이터 유지
    expect(listResearchProjects()).toHaveLength(1)
  })
})

describe('removeProjectEntityRef throw 전파', () => {
  it('localStorage 실패 → throw', () => {
    upsertProjectEntityRef({
      projectId: 'proj-1',
      entityKind: 'analysis',
      entityId: 'a-1',
      label: 'Test',
    })

    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    expect(() => removeProjectEntityRef('proj-1', 'analysis', 'a-1')).toThrow()
    spy.mockRestore()

    // 원본 ref 유지
    expect(listProjectEntityRefs('proj-1')).toHaveLength(1)
  })
})
