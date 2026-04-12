import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { HistoryRecord } from '@/lib/utils/storage-types'

const {
  getHistoryMock,
  updateHistoryMock,
  syncHistoryRecordMock,
  upsertProjectEntityRefMock,
} = vi.hoisted(() => ({
  getHistoryMock: vi.fn(),
  updateHistoryMock: vi.fn(),
  syncHistoryRecordMock: vi.fn(),
  upsertProjectEntityRefMock: vi.fn(),
}))

vi.mock('@/lib/constants/storage-keys', () => ({
  SESSION_STORAGE_KEYS: {
    analysis: {
      store: 'analysis-store',
    },
  },
}))

vi.mock('@/lib/constants/statistical-methods', () => ({
  getMethodByIdOrAlias: vi.fn(() => null),
}))

vi.mock('@/lib/utils/adapters/indexeddb-adapter', () => ({
  isIndexedDBAvailable: vi.fn(() => true),
}))

vi.mock('@/lib/utils/result-transformer', () => ({
  transformExecutorResult: vi.fn(),
  isExecutorResult: vi.fn(() => false),
}))

vi.mock('@/lib/utils/storage', () => ({
  saveHistory: vi.fn(),
  getAllHistory: vi.fn(async () => []),
  getHistory: getHistoryMock,
  deleteHistory: vi.fn(),
  clearAllHistory: vi.fn(),
  initStorage: vi.fn(),
  updateHistory: updateHistoryMock,
  syncHistoryRecord: syncHistoryRecordMock,
}))

vi.mock('@/lib/research/evidence-factory', () => ({
  buildAnalysisEvidence: vi.fn(() => []),
}))

vi.mock('@/lib/research/project-storage', () => ({
  removeProjectEntityRef: vi.fn(),
  upsertProjectEntityRef: upsertProjectEntityRefMock,
}))

const { useHistoryStore } = await import('../history-store')

describe('useHistoryStore.renameHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: null,
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
    })
  })

  it('sync rollback 시 project entity label도 원래 이름으로 복원한다', async () => {
    const record = {
      id: 'history-1',
      name: 'Original Name',
      projectId: 'project-1',
    } satisfies Partial<HistoryRecord>

    getHistoryMock.mockResolvedValue(record)
    updateHistoryMock.mockResolvedValue(undefined)
    syncHistoryRecordMock
      .mockRejectedValueOnce(new Error('sync failed'))
      .mockResolvedValueOnce(undefined)

    await expect(
      useHistoryStore.getState().renameHistory('history-1', 'Renamed Analysis'),
    ).rejects.toThrow('sync failed')

    expect(updateHistoryMock).toHaveBeenNthCalledWith(1, 'history-1', { name: 'Renamed Analysis' })
    expect(updateHistoryMock).toHaveBeenNthCalledWith(2, 'history-1', { name: 'Original Name' })
    expect(upsertProjectEntityRefMock).toHaveBeenNthCalledWith(1, {
      projectId: 'project-1',
      entityKind: 'analysis',
      entityId: 'history-1',
      label: 'Renamed Analysis',
    })
    expect(upsertProjectEntityRefMock).toHaveBeenNthCalledWith(2, {
      projectId: 'project-1',
      entityKind: 'analysis',
      entityId: 'history-1',
      label: 'Original Name',
    })
    expect(syncHistoryRecordMock).toHaveBeenCalledTimes(2)
  })
})
