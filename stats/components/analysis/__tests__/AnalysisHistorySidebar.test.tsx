import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisHistorySidebar } from '../AnalysisHistorySidebar'

const {
  loadAndRestoreHistoryMock,
  restoreSettingsFromHistoryMock,
  setShowHubMock,
  setStepTrackMock,
  deleteFromHistoryMock,
  loadSettingsFromHistoryMock,
  renameHistoryMock,
  setPinnedIdsMock,
  toastInfoMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  loadAndRestoreHistoryMock: vi.fn(),
  restoreSettingsFromHistoryMock: vi.fn(),
  setShowHubMock: vi.fn(),
  setStepTrackMock: vi.fn(),
  deleteFromHistoryMock: vi.fn(),
  loadSettingsFromHistoryMock: vi.fn(),
  renameHistoryMock: vi.fn(),
  setPinnedIdsMock: vi.fn(),
  toastInfoMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

const mockHistoryItem = {
  id: 'history-1',
  title: 'One Sample T-Test',
  subtitle: '평균 비교',
  pinned: false,
  createdAt: Date.now(),
  hasResult: true,
  data: {
    id: 'history-1',
    name: 'One Sample T-Test',
    purpose: '평균 비교',
    dataFileName: 'sample.csv',
    timestamp: new Date(),
    method: {
      id: 'one-sample-t',
      name: 'One-Sample t-Test',
      category: 't-test',
    },
    results: {
      pValue: 0.008,
    },
  },
}

vi.mock('@/components/common/UnifiedHistorySidebar', () => ({
  UnifiedHistorySidebar: ({
    items,
    onSelect,
    renderItem,
  }: {
    items: typeof mockHistoryItem[]
    onSelect: (item: typeof mockHistoryItem) => void
    renderItem?: (item: typeof mockHistoryItem) => ReactNode
  }) => (
    <div>
      <button type="button" data-testid="select-history" onClick={() => onSelect(items[0])}>
        Select history
      </button>
      <div>{renderItem ? renderItem(items[0]) : null}</div>
    </div>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode
    onClick?: () => void
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/lib/utils/history-adapters', () => ({
  toAnalysisHistoryItems: vi.fn(() => [mockHistoryItem]),
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: (selector: (state: object) => unknown) => selector({
    analysisHistory: [mockHistoryItem.data],
    currentHistoryId: null,
    deleteFromHistory: deleteFromHistoryMock,
    loadSettingsFromHistory: loadSettingsFromHistoryMock,
    renameHistory: renameHistoryMock,
  }),
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  loadAndRestoreHistory: (historyId: string) => loadAndRestoreHistoryMock(historyId),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: {
    getState: () => ({
      restoreSettingsFromHistory: restoreSettingsFromHistoryMock,
    }),
  },
}))

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: {
    getState: () => ({
      setShowHub: setShowHubMock,
      setStepTrack: setStepTrackMock,
    }),
  },
}))

vi.mock('@/lib/utils/pinned-history-storage', () => ({
  usePinnedHistoryIds: () => [[], setPinnedIdsMock],
  MAX_PINNED: 3,
  togglePinId: vi.fn(),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    history: {
      labels: {
        moreActions: 'More actions',
      },
      tooltips: {
        maxPinned: (count: number) => `Max ${count}`,
        rename: 'Rename',
        reanalyze: 'Reanalyze',
      },
      buttons: {
        cancel: 'Cancel',
        save: 'Save',
      },
      dialogs: {
        renameTitle: 'Rename Analysis',
        renameDescription: 'Update the analysis name shown in history.',
        renamePlaceholder: 'Enter a new analysis name',
      },
      sidebar: {
        title: 'Analysis history',
      },
    },
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    info: toastInfoMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/lib/constants/toast-messages', () => ({
  TOAST: {
    history: {
      loadError: 'Load error',
      renameError: 'Rename error',
      settingsLoadError: 'Settings load error',
    },
  },
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('AnalysisHistorySidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('분석 기록을 선택하면 기록을 복원하고 허브를 닫는다', async () => {
    loadAndRestoreHistoryMock.mockResolvedValue(null)

    render(<AnalysisHistorySidebar />)

    fireEvent.click(screen.getByTestId('select-history'))

    await waitFor(() => {
      expect(loadAndRestoreHistoryMock).toHaveBeenCalledWith('history-1')
      expect(setShowHubMock).toHaveBeenCalledWith(false)
    })
  })

  it('재분석을 누르면 설정을 복원하고 재분석 트랙으로 진입하며 허브를 닫는다', async () => {
    loadSettingsFromHistoryMock.mockResolvedValue({
      selectedMethod: null,
      variableMapping: null,
      analysisPurpose: '평균 비교',
      analysisOptions: {},
    })

    render(<AnalysisHistorySidebar />)

    fireEvent.click(screen.getByText('Reanalyze'))

    await waitFor(() => {
      expect(loadSettingsFromHistoryMock).toHaveBeenCalledWith('history-1')
      expect(restoreSettingsFromHistoryMock).toHaveBeenCalled()
      expect(setStepTrackMock).toHaveBeenCalledWith('reanalysis')
      expect(setShowHubMock).toHaveBeenCalledWith(false)
    })
  })
  it('Rename 메뉴에서 저장하면 renameHistory 액션을 호출한다', async () => {
    renameHistoryMock.mockResolvedValue(undefined)

    render(<AnalysisHistorySidebar />)

    fireEvent.click(screen.getByText('Rename'))
    fireEvent.change(screen.getByPlaceholderText('Enter a new analysis name'), {
      target: { value: 'Renamed Analysis' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(renameHistoryMock).toHaveBeenCalledWith('history-1', 'Renamed Analysis')
    })
  })

  it('이름 변경이 실패하면 rename 전용 에러 토스트를 띄운다', async () => {
    renameHistoryMock.mockRejectedValue(new Error('rename failed'))

    render(<AnalysisHistorySidebar />)

    fireEvent.click(screen.getByText('Rename'))
    fireEvent.change(screen.getByPlaceholderText('Enter a new analysis name'), {
      target: { value: 'Renamed Analysis' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Rename error')
    })
  })
})
