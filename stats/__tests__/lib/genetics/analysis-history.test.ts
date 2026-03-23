import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAnalysisHistory, HISTORY_KEY } from '@/lib/genetics/analysis-history'
import {
  listProjectEntityRefs,
  upsertProjectEntityRef,
} from '@/lib/research/project-storage'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'

function makeEntry(index: number, overrides: Partial<AnalysisHistoryEntry> = {}): AnalysisHistoryEntry {
  return {
    id: `entry-${index}`,
    sampleName: `Sample ${index}`,
    marker: 'COI',
    sequencePreview: `ATGC${index}`,
    topSpecies: null,
    topIdentity: null,
    status: null,
    createdAt: index,
    ...overrides,
  }
}

describe('analysis-history project refs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('히스토리 저장 실패 시 overflow 대상 ref를 지우지 않아야 함', () => {
    const oldestLinkedEntry = makeEntry(1, { projectId: 'project-1' })
    const otherEntries = Array.from({ length: 19 }, (_, index) => makeEntry(index + 2))

    localStorage.setItem(HISTORY_KEY, JSON.stringify([oldestLinkedEntry, ...otherEntries]))
    upsertProjectEntityRef({
      projectId: 'project-1',
      entityKind: 'blast-result',
      entityId: oldestLinkedEntry.id,
      label: oldestLinkedEntry.sampleName,
    })

    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string): void {
      if (key === HISTORY_KEY) {
        throw new DOMException('quota exceeded', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })

    saveAnalysisHistory({
      sampleName: 'New Sample',
      marker: 'COI',
      sequencePreview: 'ATGC',
      topSpecies: null,
      topIdentity: null,
      status: null,
    })

    expect(listProjectEntityRefs('project-1')).toEqual([
      expect.objectContaining({
        projectId: 'project-1',
        entityKind: 'blast-result',
        entityId: oldestLinkedEntry.id,
      }),
    ])
  })
})
