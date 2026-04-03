import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listPackages,
  loadPackage,
  savePackage,
  deletePackage,
} from '../paper-package-storage'
import type { PaperPackage } from '../paper-package-types'
import { JOURNAL_PRESETS, generatePackageId } from '../paper-package-types'

const mockPackage = (overrides: Partial<PaperPackage> = {}): PaperPackage => ({
  id: generatePackageId(),
  projectId: 'proj_test',
  version: 1,
  overview: {
    title: '테스트 패키지',
    purpose: '단위 테스트용',
    dataDescription: '테스트 데이터',
  },
  items: [],
  references: [],
  journal: JOURNAL_PRESETS[0],
  context: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

// createLocalStorageIO mock — factory 자체를 mock하여 내부 캐싱 문제 회피
const store: Record<string, string> = {}

vi.mock('@/lib/utils/local-storage-factory', () => ({
  createLocalStorageIO: () => ({
    readJson: <T,>(key: string, fallback: T): T => {
      const raw = store[key]
      return raw ? JSON.parse(raw) as T : fallback
    },
    writeJson: (key: string, value: unknown): void => {
      store[key] = JSON.stringify(value)
    },
  }),
}))

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k])
})

describe('paper-package-storage', () => {
  it('빈 스토리지에서 listPackages()는 빈 배열 반환', () => {
    expect(listPackages()).toEqual([])
  })

  it('저장 후 listPackages()에 나타남', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    const list = listPackages()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(pkg.id)
  })

  it('projectId 필터링 동작', () => {
    savePackage(mockPackage({ id: 'p1', projectId: 'proj_A' }))
    savePackage(mockPackage({ id: 'p2', projectId: 'proj_B' }))
    expect(listPackages('proj_A')).toHaveLength(1)
    expect(listPackages('proj_A')[0].id).toBe('p1')
  })

  it('loadPackage()는 저장된 패키지 반환', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    const loaded = loadPackage(pkg.id)
    expect(loaded?.id).toBe(pkg.id)
    expect(loaded?.overview.title).toBe('테스트 패키지')
  })

  it('없는 ID는 null 반환', () => {
    expect(loadPackage('nonexistent')).toBeNull()
  })

  it('savePackage()는 기존 패키지를 덮어씀', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    savePackage({ ...pkg, overview: { ...pkg.overview, title: '수정됨' } })
    expect(listPackages()).toHaveLength(1)
    expect(loadPackage(pkg.id)?.overview.title).toBe('수정됨')
  })

  it('deletePackage()는 패키지를 제거', () => {
    const pkg = mockPackage()
    savePackage(pkg)
    deletePackage(pkg.id)
    expect(listPackages()).toHaveLength(0)
  })
})
