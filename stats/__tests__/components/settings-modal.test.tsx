/**
 * SettingsModal 컴포넌트 테스트
 *
 * 테스트 범위:
 * 1. 컴포넌트 렌더링
 * 2. 알림 설정 변경
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { SettingsModal } from '@/components/layout/settings-modal'

// next-themes 모킹
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}))

describe('SettingsModal', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    localStorageMock = {}
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: vi.fn(() => {
          localStorageMock = {}
        }),
      },
      writable: true,
    })

    delete (window as { location?: unknown }).location
    ;(window as { location: Partial<Location> }).location = { href: '', assign: vi.fn() } as Partial<Location>

    window.open = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('렌더링', () => {
    it('모달이 열리면 모든 설정 항목이 표시되어야 함', () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByText('설정')).toBeInTheDocument()
      expect(screen.getByText('테마')).toBeInTheDocument()
      expect(screen.queryByText('플로팅 챗봇 버튼')).not.toBeInTheDocument()
      expect(screen.getByText('알림')).toBeInTheDocument()
      expect(screen.getByText('상세 설정 보기')).toBeInTheDocument()
      expect(screen.getByText('전용 챗봇 페이지 열기 (새 창)')).toBeInTheDocument()
    })

    it('모달이 닫히면 표시되지 않아야 함', () => {
      const { container } = render(<SettingsModal open={false} onOpenChange={vi.fn()} />)

      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })
  })

  describe('알림 설정 변경', () => {
    it('저장된 알림 설정을 로드해야 함', () => {
      localStorageMock['statPlatform_notifyAnalysisComplete'] = 'false'
      localStorageMock['statPlatform_notifyError'] = 'false'

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const switches = screen.getAllByRole('switch')
      expect(switches).toHaveLength(2)
      expect(switches[0]).not.toBeChecked()
      expect(switches[1]).not.toBeChecked()
    })

    it('분석 완료 알림을 토글하면 localStorage에 저장되어야 함', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const notifyCompleteSwitch = screen.getAllByRole('switch')[0]
      fireEvent.click(notifyCompleteSwitch)

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
          'statPlatform_notifyAnalysisComplete',
          'false'
        )
      })
    })

    it('에러 알림을 토글하면 localStorage에 저장되어야 함', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const notifyErrorSwitch = screen.getAllByRole('switch')[1]
      fireEvent.click(notifyErrorSwitch)

      await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith('statPlatform_notifyError', 'false')
      })
    })
  })

  describe('버튼 동작', () => {
    it('상세 설정 버튼을 클릭하면 모달이 닫혀야 함', () => {
      const onOpenChange = vi.fn()
      render(<SettingsModal open={true} onOpenChange={onOpenChange} />)

      fireEvent.click(screen.getByText('상세 설정 보기'))

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('전용 챗봇 페이지 버튼을 클릭하면 새 창이 열려야 함', () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      fireEvent.click(screen.getByText('전용 챗봇 페이지 열기 (새 창)'))

      expect(window.open).toHaveBeenCalledWith('/chatbot', '_blank', 'noopener,noreferrer')
    })
  })
})
