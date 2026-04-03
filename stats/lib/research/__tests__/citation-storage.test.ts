import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import type { CitationRecord } from '../citation-types'
import type { LiteratureItem } from '@/lib/types/literature'
import { saveCitation, listCitationsByProject, deleteCitation } from '../citation-storage'

function makeCitation(overrides: Partial<CitationRecord> = {}): CitationRecord {
  const item: LiteratureItem = {
    id: 'lit_1',
    source: 'openalex',
    title: 'Test Paper',
    authors: ['Kim J'],
    year: 2023,
    url: 'https://example.com',
    searchedName: 'test',
  }
  return {
    id: 'cit_test_1',
    projectId: 'proj_1',
    item,
    addedAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('citation-storage', () => {
  beforeEach(async () => {
    // 각 테스트 전에 IndexedDB 초기화 — 기존 proj_1 인용 삭제
    const existing = await listCitationsByProject('proj_1')
    await Promise.all(existing.map(r => deleteCitation(r.id)))
    const existing2 = await listCitationsByProject('proj_2')
    await Promise.all(existing2.map(r => deleteCitation(r.id)))
  })

  it('saveCitation: 저장 후 listCitationsByProject에서 조회됨', async () => {
    const record = makeCitation()
    await saveCitation(record)
    const result = await listCitationsByProject('proj_1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cit_test_1')
  })

  it('listCitationsByProject: 다른 projectId는 제외', async () => {
    await saveCitation(makeCitation({ id: 'cit_1', projectId: 'proj_1' }))
    await saveCitation(makeCitation({ id: 'cit_2', projectId: 'proj_2' }))
    const result = await listCitationsByProject('proj_1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('cit_1')
  })

  it('deleteCitation: 삭제 후 조회 안 됨', async () => {
    await saveCitation(makeCitation({ id: 'cit_del' }))
    await deleteCitation('cit_del')
    const result = await listCitationsByProject('proj_1')
    expect(result.find(r => r.id === 'cit_del')).toBeUndefined()
  })

  it('listCitationsByProject: 추가순 정렬', async () => {
    await saveCitation(makeCitation({ id: 'cit_b', addedAt: '2026-01-02T00:00:00Z' }))
    await saveCitation(makeCitation({ id: 'cit_a', addedAt: '2026-01-01T00:00:00Z' }))
    const result = await listCitationsByProject('proj_1')
    expect(result[0].id).toBe('cit_a')
    expect(result[1].id).toBe('cit_b')
  })
})
