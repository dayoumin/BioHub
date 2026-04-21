import { beforeEach, describe, expect, it } from 'vitest'
import {
  PaperPackageConflictError,
  loadPackage,
  savePackage,
} from '@/lib/research/paper-package-storage'
import type { PaperPackage } from '@/lib/research/paper-package-types'

function makePackage(updatedAt: string, overrides: Partial<PaperPackage> = {}): PaperPackage {
  return {
    id: 'pkg-1',
    projectId: 'project-1',
    version: 1,
    overview: {
      title: '패키지',
      purpose: '검증',
      dataDescription: '설명',
    },
    items: [],
    references: [],
    journal: {
      id: 'kjfs',
      name: '한국수산과학회지',
      style: 'kjfs',
      sections: ['서론', '재료 및 방법', '결과', '고찰', '참고문헌'],
      language: 'ko',
      referenceFormat: '',
      referenceExample: '',
    },
    context: {},
    createdAt: '2026-04-21T00:00:00.000Z',
    updatedAt,
    ...overrides,
  }
}

describe('paper-package-storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('rejects saving a stale package snapshot when updatedAt moved', () => {
    savePackage(makePackage('2026-04-21T01:00:00.000Z'))

    expect(() => {
      savePackage(
        makePackage('2026-04-21T02:00:00.000Z', {
          overview: {
            title: '오래된 로컬 편집',
            purpose: '검증',
            dataDescription: '설명',
          },
        }),
        { expectedUpdatedAt: '2026-04-21T00:30:00.000Z' },
      )
    }).toThrow(PaperPackageConflictError)

    expect(loadPackage('pkg-1')?.overview.title).toBe('패키지')
  })

  it('saves normally when expectedUpdatedAt matches the latest stored package', () => {
    const initial = makePackage('2026-04-21T01:00:00.000Z')
    savePackage(initial)

    savePackage(
      makePackage('2026-04-21T02:00:00.000Z', {
        overview: {
          title: '최신 편집',
          purpose: '검증',
          dataDescription: '설명',
        },
      }),
      { expectedUpdatedAt: initial.updatedAt },
    )

    expect(loadPackage('pkg-1')?.overview.title).toBe('최신 편집')
  })
})
