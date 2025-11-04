/**
 * MultiTabWarning 컴포넌트 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MultiTabWarning } from './multi-tab-warning'
import { MultiTabDetector } from '@/lib/services/multi-tab-detector'

// MultiTabDetector 모킹
jest.mock('@/lib/services/multi-tab-detector')

describe('MultiTabWarning', () => {
  let mockDetector: jest.Mocked<MultiTabDetector>
  let mockCallback: jest.Mock

  beforeEach(() => {
    mockCallback = jest.fn()
    mockDetector = {
      getInstance: jest.fn(),
      onTabCountChange: jest.fn((callback) => {
        mockCallback.mockImplementation(callback)
        // 등록 시 즉시 호출 (다른 탭이 0개)
        callback(0, 'test-tab-id')
      }),
      removeListener: jest.fn(),
      getOtherTabsCount: jest.fn(() => 0),
      getTabId: jest.fn(() => 'test-tab-id'),
      isUniqueTab: jest.fn(() => true),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<MultiTabDetector>

    ;(MultiTabDetector.getInstance as jest.Mock).mockReturnValue(mockDetector)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링', () => {
    it('다른 탭이 없으면 경고를 표시하지 않아야 함', async () => {
      render(<MultiTabWarning />)

      await waitFor(() => {
        expect(screen.queryByText('다중 탭 실행 감지')).not.toBeInTheDocument()
      })
    })

    it('다른 탭이 감지되면 경고 모달을 표시해야 함', async () => {
      render(<MultiTabWarning />)

      // 다른 탭 감지 시뮬레이션
      act(() => {
        mockCallback(1, 'other-tab-id')
      })

      await waitFor(() => {
        expect(screen.getByText('다중 탭 실행 감지')).toBeInTheDocument()
      })
    })

    it('경고 메시지에 탭 개수를 표시해야 함', async () => {
      render(<MultiTabWarning />)

      act(() => {
        mockCallback(2, 'other-tab-id')
      })

      await waitFor(() => {
        expect(screen.getByText(/2개의 다른 탭/)).toBeInTheDocument()
      })
    })
  })

  describe('상호작용', () => {
    it('"이 탭 닫기" 버튼 클릭 시 탭을 종료해야 함', async () => {
      const closeSpy = jest.spyOn(window, 'close').mockImplementation()

      render(<MultiTabWarning />)

      act(() => {
        mockCallback(1, 'other-tab-id')
      })

      const closeButton = await screen.findByText('이 탭 닫기')
      fireEvent.click(closeButton)

      expect(closeSpy).toHaveBeenCalled()

      closeSpy.mockRestore()
    })

    it('"계속 사용" 버튼 클릭 시 경고 모달을 닫아야 함', async () => {
      render(<MultiTabWarning />)

      act(() => {
        mockCallback(1, 'other-tab-id')
      })

      const continueButton = await screen.findByText('계속 사용')
      fireEvent.click(continueButton)

      await waitFor(() => {
        expect(
          screen.queryByText('다중 탭 실행 감지')
        ).not.toBeInTheDocument()
      })
    })

    it('"새로고침" 버튼 클릭 시 페이지를 새로고침해야 함', async () => {
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation()

      render(<MultiTabWarning />)

      act(() => {
        mockCallback(1, 'other-tab-id')
      })

      const reloadButton = await screen.findByText('새로고침')
      fireEvent.click(reloadButton)

      expect(reloadSpy).toHaveBeenCalled()

      reloadSpy.mockRestore()
    })
  })

  describe('기능 비활성화', () => {
    it('다른 탭 감지 시 기능 비활성화 오버레이를 표시해야 함', async () => {
      render(<MultiTabWarning />)

      act(() => {
        mockCallback(1, 'other-tab-id')
      })

      await waitFor(() => {
        expect(screen.getByText(/데이터 손상을 방지하기 위해/)).toBeInTheDocument()
      })
    })

    it('기능 비활성화 오버레이에 탭 개수를 표시해야 함', async () => {
      render(<MultiTabWarning />)

      act(() => {
        mockCallback(3, 'other-tab-id')
      })

      await waitFor(() => {
        expect(screen.getByText(/3개의 다른 탭/)).toBeInTheDocument()
      })
    })
  })

  describe('정리', () => {
    it('언마운트 시 리스너를 제거해야 함', async () => {
      const { unmount } = render(<MultiTabWarning />)

      unmount()

      expect(mockDetector.removeListener).toHaveBeenCalled()
    })
  })
})

// 헬퍼 함수
function act(callback: () => void) {
  callback()
}
