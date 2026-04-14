/**
 * AnalysisHistorySidebar — 내보내기 드롭다운 액션 테스트
 *
 * Sidebar의 더보기 메뉴에서 "내보내기" 항목 클릭 시
 * useAnalysisExport().exportAnalysis(item, 'docx')가 호출되는지 검증.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnalysisHistory } from '@/lib/stores/history-store'
import type { HistoryItem } from '@/types/history'

const exportAnalysisSpy = vi.fn()

vi.mock('@/hooks/use-analysis-export', () => ({
  useAnalysisExport: () => ({ exportAnalysis: exportAnalysisSpy }),
}))

const fakeHistory: AnalysisHistory = {
  id: 'h-1',
  name: 'Test',
  timestamp: new Date(),
  method: { id: 't-test', name: 'T-Test' },
  dataFileName: 'x.csv',
  dataRowCount: 10,
  results: { pValue: 0.01 },
  aiInterpretation: null,
  apaFormat: null,
} as unknown as AnalysisHistory

const mockHistoryStoreState = {
  analysisHistory: [fakeHistory],
  currentHistoryId: null,
  deleteFromHistory: vi.fn(),
  loadSettingsFromHistory: vi.fn(),
  renameHistory: vi.fn(),
  setCurrentHistoryId: vi.fn(),
  setLoadedAiInterpretation: vi.fn(),
  setLoadedInterpretationChat: vi.fn(),
  setLoadedPaperDraft: vi.fn(),
}

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: Object.assign(
    (selector?: (s: typeof mockHistoryStoreState) => unknown) =>
      selector ? selector(mockHistoryStoreState) : mockHistoryStoreState,
    { getState: () => mockHistoryStoreState },
  ),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: { getState: () => ({ restoreSettingsFromHistory: vi.fn() }) },
}))

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: {
    getState: () => ({ setShowHub: vi.fn(), setStepTrack: vi.fn() }),
  },
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  loadAndRestoreHistory: vi.fn(),
}))

vi.mock('@/lib/utils/pinned-history-storage', () => ({
  usePinnedHistoryIds: () => [[], vi.fn()],
  MAX_PINNED: 6,
  togglePinId: vi.fn(),
}))

vi.mock('@/lib/utils/history-adapters', () => ({
  toAnalysisHistoryItems: (hs: AnalysisHistory[]): Array<HistoryItem<AnalysisHistory>> =>
    hs.map((h) => ({
      id: h.id,
      title: h.name,
      pinned: false,
      createdAt: h.timestamp instanceof Date ? h.timestamp.getTime() : h.timestamp,
      hasResult: h.results !== null && h.results !== undefined,
      data: h,
    })),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    history: {
      sidebar: { title: '히스토리' },
      tooltips: {
        rename: '이름 변경',
        reanalyze: '재분석',
        exportReport: '보고서 내보내기',
        maxPinned: (n: number) => `최대 ${n}개`,
      },
      dialogs: {
        renameTitle: '이름 변경',
        renameDescription: '',
        renamePlaceholder: '',
        renameConfirm: '확인',
        renameCancel: '취소',
      },
      labels: { moreActions: '더보기' },
      buttons: { cancel: '취소', save: '저장' },
      loadError: '',
      renameError: '',
      settingsLoadError: '',
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

vi.mock('@/components/common/UnifiedHistorySidebar', () => ({
  UnifiedHistorySidebar: <T,>({
    items,
    renderItem,
  }: {
    items: Array<HistoryItem<T>>
    renderItem: (item: HistoryItem<T>) => React.ReactNode
  }) => (
    <div data-testid="mock-unified-sidebar">
      {items.map((it) => (
        <div key={it.id}>{renderItem(it)}</div>
      ))}
    </div>
  ),
}))

import { AnalysisHistorySidebar } from '@/components/analysis/AnalysisHistorySidebar'

describe('AnalysisHistorySidebar — 내보내기 액션', () => {
  beforeEach(() => {
    exportAnalysisSpy.mockReset()
  })

  it('드롭다운의 "내보내기" 항목 클릭 시 exportAnalysis(item, "docx") 호출', async () => {
    const user = userEvent.setup()
    render(<AnalysisHistorySidebar />)

    const moreBtn = screen.getByTestId('analysis-history-more-actions-h-1')
    await user.click(moreBtn)

    const exportItem = await screen.findByTestId('analysis-history-export-action-h-1')
    expect(exportItem).toHaveTextContent('보고서 내보내기')
    await user.click(exportItem)

    expect(exportAnalysisSpy).toHaveBeenCalledTimes(1)
    expect(exportAnalysisSpy).toHaveBeenCalledWith(fakeHistory, 'docx')
  })
})
