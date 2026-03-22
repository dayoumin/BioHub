import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { HistoryRecord } from '@/lib/utils/storage-types'

vi.mock('@/lib/utils/storage', () => ({
  saveHistory: vi.fn().mockResolvedValue(undefined),
  getAllHistory: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn(),
  deleteHistory: vi.fn().mockResolvedValue(undefined),
  clearAllHistory: vi.fn().mockResolvedValue(undefined),
  initStorage: vi.fn().mockResolvedValue(undefined),
  updateHistory: vi.fn().mockResolvedValue(undefined),
  syncHistoryRecord: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/adapters/indexeddb-adapter', () => ({
  isIndexedDBAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/research/project-storage', () => ({
  upsertProjectEntityRef: vi.fn(),
  removeProjectEntityRef: vi.fn(),
}))

const { getAllHistory, getHistory, saveHistory, deleteHistory, clearAllHistory } = await import('@/lib/utils/storage')
const { upsertProjectEntityRef, removeProjectEntityRef } = await import('@/lib/research/project-storage')

const mockGetAllHistory = vi.mocked(getAllHistory)
const mockGetHistory = vi.mocked(getHistory)
const mockSaveHistory = vi.mocked(saveHistory)
const mockDeleteHistory = vi.mocked(deleteHistory)
const mockClearAllHistory = vi.mocked(clearAllHistory)
const mockUpsertProjectEntityRef = vi.mocked(upsertProjectEntityRef)
const mockRemoveProjectEntityRef = vi.mocked(removeProjectEntityRef)

function makeSnapshot() {
  return {
    results: { method: 'independent-t-test', pValue: 0.023 } as never,
    analysisPurpose: 'Group comparison',
    selectedMethod: {
      id: 'independent-t-test',
      name: 'Independent Samples t-test',
      category: 't-test' as const,
      description: 'Compare two groups',
    },
    uploadedFileName: 'test.csv',
    uploadedDataLength: 24,
    variableMapping: null,
    analysisOptions: {} as never,
    lastAiRecommendation: null,
  }
}

function makeHistoryRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'analysis-1',
    timestamp: Date.now(),
    name: 'Saved analysis',
    projectId: 'proj-1',
    purpose: 'Group comparison',
    method: {
      id: 'independent-t-test',
      name: 'Independent Samples t-test',
      category: 't-test',
      description: 'Compare two groups',
    },
    dataFileName: 'test.csv',
    dataRowCount: 24,
    results: { method: 'independent-t-test', pValue: 0.023 },
    ...overrides,
  }
}

describe('history-store project links', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    act(() => {
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
        loadedPaperDraft: null,
      })
    })
    mockGetAllHistory.mockResolvedValue([])
  })

  it('saveToHistory stores projectId and creates an analysis entity ref', async () => {
    const record = makeHistoryRecord()
    mockGetAllHistory.mockResolvedValueOnce([record])

    await act(async () => {
      await useHistoryStore.getState().saveToHistory(makeSnapshot(), 'Saved analysis', {
        projectId: 'proj-1',
      })
    })

    expect(mockSaveHistory).toHaveBeenCalledTimes(1)
    const savedRecord = mockSaveHistory.mock.calls[0][0] as HistoryRecord
    expect(savedRecord.projectId).toBe('proj-1')
    expect(mockUpsertProjectEntityRef).toHaveBeenCalledWith({
      projectId: 'proj-1',
      entityKind: 'analysis',
      entityId: savedRecord.id,
      label: 'Saved analysis',
    })
  })

  it('saveToHistory rolls back the saved record when project link creation fails', async () => {
    mockUpsertProjectEntityRef.mockImplementationOnce(() => {
      throw new Error('link failed')
    })

    await expect(
      act(async () => {
        await useHistoryStore.getState().saveToHistory(makeSnapshot(), 'Saved analysis', {
          projectId: 'proj-1',
        })
      })
    ).rejects.toThrow('link failed')

    expect(mockSaveHistory).toHaveBeenCalledTimes(1)
    const savedRecord = mockSaveHistory.mock.calls[0][0] as HistoryRecord
    expect(mockDeleteHistory).toHaveBeenCalledWith(savedRecord.id)
  })

  it('deleteFromHistory removes the linked analysis ref', async () => {
    mockGetHistory.mockResolvedValueOnce(makeHistoryRecord({ id: 'analysis-77', projectId: 'proj-7' }))
    mockGetAllHistory.mockResolvedValueOnce([])

    await act(async () => {
      await useHistoryStore.getState().deleteFromHistory('analysis-77')
    })

    expect(mockDeleteHistory).toHaveBeenCalledWith('analysis-77')
    expect(mockRemoveProjectEntityRef).toHaveBeenCalledWith('proj-7', 'analysis', 'analysis-77')
  })

  it('deleteFromHistory restores the record when linked ref removal fails', async () => {
    const record = makeHistoryRecord({ id: 'analysis-77', projectId: 'proj-7' })
    mockGetHistory.mockResolvedValueOnce(record)
    mockRemoveProjectEntityRef.mockImplementationOnce(() => {
      throw new Error('unlink failed')
    })

    await expect(useHistoryStore.getState().deleteFromHistory('analysis-77')).rejects.toThrow('unlink failed')

    expect(mockDeleteHistory).toHaveBeenCalledWith('analysis-77')
    expect(mockSaveHistory).toHaveBeenCalledWith(record)
  })

  it('clearHistory removes refs for all project-linked analyses', async () => {
    mockGetAllHistory
      .mockResolvedValueOnce([
        makeHistoryRecord({ id: 'analysis-a', projectId: 'proj-a' }),
        makeHistoryRecord({ id: 'analysis-b', projectId: undefined }),
        makeHistoryRecord({ id: 'analysis-c', projectId: 'proj-c' }),
      ])
      .mockResolvedValueOnce([])

    await act(async () => {
      await useHistoryStore.getState().clearHistory()
    })

    expect(mockClearAllHistory).toHaveBeenCalledTimes(1)
    expect(mockRemoveProjectEntityRef).toHaveBeenCalledTimes(2)
    expect(mockRemoveProjectEntityRef).toHaveBeenCalledWith('proj-a', 'analysis', 'analysis-a')
    expect(mockRemoveProjectEntityRef).toHaveBeenCalledWith('proj-c', 'analysis', 'analysis-c')
  })

  it('clearHistory partial failure: restores already-removed refs AND IndexedDB records', async () => {
    // 시나리오: A,B,C 3개 레코드 중 A의 ref 삭제 성공 → C에서 실패
    // 기대: A의 ref가 upsert로 복원 + 모든 레코드 IndexedDB에 재저장
    const records = [
      makeHistoryRecord({ id: 'analysis-a', name: 'Analysis A', projectId: 'proj-a' }),
      makeHistoryRecord({ id: 'analysis-b', name: 'Analysis B', projectId: undefined }),
      makeHistoryRecord({ id: 'analysis-c', name: 'Analysis C', projectId: 'proj-c' }),
    ]
    mockGetAllHistory.mockResolvedValueOnce(records)

    let callCount = 0
    mockRemoveProjectEntityRef.mockImplementation(() => {
      callCount++
      if (callCount === 2) throw new Error('quota exceeded on second ref removal')
    })

    let caughtError: unknown = null
    try {
      await useHistoryStore.getState().clearHistory()
    } catch (e) {
      caughtError = e
    }

    // 디버깅: mock 호출 확인
    console.log('removeProjectEntityRef calls:', mockRemoveProjectEntityRef.mock.calls.length)
    console.log('upsertProjectEntityRef calls:', mockUpsertProjectEntityRef.mock.calls.length)
    console.log('saveHistory calls:', mockSaveHistory.mock.calls.length)
    console.log('caughtError:', caughtError)

    expect(caughtError).toBeInstanceOf(Error)
    expect((caughtError as Error).message).toBe('quota exceeded on second ref removal')

    // A의 ref는 성공적으로 삭제됐으므로 복원(upsert)이 호출돼야 함
    expect(mockUpsertProjectEntityRef).toHaveBeenCalledTimes(1)
    expect(mockUpsertProjectEntityRef).toHaveBeenCalledWith({
      projectId: 'proj-a',
      entityKind: 'analysis',
      entityId: 'analysis-a',
      label: 'Analysis A',
    })

    // 모든 레코드가 IndexedDB에 재저장돼야 함
    expect(mockSaveHistory).toHaveBeenCalledTimes(3)
    expect(mockSaveHistory).toHaveBeenCalledWith(records[0])
    expect(mockSaveHistory).toHaveBeenCalledWith(records[1])
    expect(mockSaveHistory).toHaveBeenCalledWith(records[2])

    // store 상태는 변경되지 않아야 함 (rollback 후 throw)
    expect(useHistoryStore.getState().analysisHistory).toEqual([])
  })
})
