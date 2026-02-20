/**
 * SettingsModal 컴포넌트 테스트
 *
 * 테스트 범위:
 * 1. 컴포넌트 렌더링
 * 2. localStorage 로드/저장
 * 3. 플로팅 버튼 토글
 * 4. 알림 설정 변경
 *
 * Note: 로컬 저장 토글은 StorageService가 항상 저장을 허용하도록 변경되어 제거됨
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, Mock } from 'vitest'
import { SettingsModal } from '@/components/layout/settings-modal'
import { ChatStorage } from '@/lib/services/chat-storage'

// next-themes 모킹
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: vi.fn(),
  }),
}))

// ChatStorage 모킹
vi.mock('@/lib/services/chat-storage', () => ({
  ChatStorage: {
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
  },
}))

describe('SettingsModal', () => {
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    // localStorage 모킹
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

    // ChatStorage 기본값 설정
    ;(ChatStorage.loadSettings as Mock).mockReturnValue({
      floatingButtonEnabled: false,
      theme: 'system',
    })

    // window.dispatchEvent 모킹
    window.dispatchEvent = vi.fn()

    // window.location.href 모킹 (assign 사용)
    delete (window as { location?: unknown }).location
    ;(window as { location: Partial<Location> }).location = { href: '', assign: vi.fn() } as Partial<Location>

    // window.open 모킹
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
      expect(screen.getByText('플로팅 챗봇 버튼')).toBeInTheDocument()
      expect(screen.getByText('알림')).toBeInTheDocument()
      // 로컬 저장 토글은 제거됨 (StorageService가 항상 저장 허용)
      expect(screen.queryByText('데이터')).not.toBeInTheDocument()
      expect(screen.getByText('상세 설정 보기')).toBeInTheDocument()
      expect(screen.getByText('전용 챗봇 페이지 열기 (새 창)')).toBeInTheDocument()
    })

    it('모달이 닫히면 표시되지 않아야 함', () => {
      const { container } = render(<SettingsModal open={false} onOpenChange={vi.fn()} />)

      // Dialog가 닫혔을 때 내용이 표시되지 않음
      expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument()
    })
  })

  describe('localStorage 로드', () => {
    it('저장된 알림 설정을 로드해야 함', () => {
      localStorageMock['statPlatform_notifyAnalysisComplete'] = 'false'
      localStorageMock['statPlatform_notifyError'] = 'false'

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const switches = screen.getAllByRole('switch')
      // 플로팅 버튼 (false) + 알림 완료 (false) + 알림 에러 (false)
      // 로컬 저장 토글은 제거됨
      expect(switches).toHaveLength(3)
      expect(switches[0]).not.toBeChecked() // 플로팅 버튼
      expect(switches[1]).not.toBeChecked() // 알림 완료
      expect(switches[2]).not.toBeChecked() // 알림 에러
    })

    it('ChatStorage에서 플로팅 버튼 설정을 로드해야 함', () => {
      ;(ChatStorage.loadSettings as Mock).mockReturnValue({
        floatingButtonEnabled: true,
        theme: 'system',
      })

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const switches = screen.getAllByRole('switch')
      expect(switches[0]).toBeChecked() // 플로팅 버튼
    })

    it('로컬 저장 토글이 제거되었음을 확인', () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      // 로컬 저장 관련 UI가 없어야 함
      expect(screen.queryByText('로컬 저장 허용')).not.toBeInTheDocument()
      expect(screen.queryByText('분석 기록 및 설정을 브라우저에 저장합니다')).not.toBeInTheDocument()
    })
  })

  describe('플로팅 버튼 토글', () => {
    it('플로팅 버튼을 토글하면 ChatStorage에 저장되어야 함', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const floatingSwitch = screen.getAllByRole('switch')[0]

      fireEvent.click(floatingSwitch)

      await waitFor(() => {
        expect(ChatStorage.saveSettings).toHaveBeenCalledWith({
          floatingButtonEnabled: true,
          theme: 'system',
        })
      })
    })

    it('플로팅 버튼을 토글하면 CustomEvent가 발생해야 함', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const floatingSwitch = screen.getAllByRole('switch')[0]

      fireEvent.click(floatingSwitch)

      await waitFor(() => {
        expect(window.dispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'chatbot-settings-changed',
          })
        )
      })
    })
  })

  describe('알림 설정 변경', () => {
    it('분석 완료 알림을 토글하면 localStorage에 저장되어야 함', async () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const notifyCompleteSwitch = screen.getAllByRole('switch')[1]

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

      const notifyErrorSwitch = screen.getAllByRole('switch')[2]

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

      const detailButton = screen.getByText('상세 설정 보기')
      fireEvent.click(detailButton)

      // 모달이 닫히는지 확인
      expect(onOpenChange).toHaveBeenCalledWith(false)

      // Note: window.location.href는 jsdom 제약으로 테스트 불가
      // 실제 브라우저에서는 /settings로 이동함
    })

    it('전용 챗봇 페이지 버튼을 클릭하면 새 창이 열려야 함', () => {
      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      const chatbotButton = screen.getByText('전용 챗봇 페이지 열기 (새 창)')
      fireEvent.click(chatbotButton)

      expect(window.open).toHaveBeenCalledWith('/chatbot', '_blank', 'noopener,noreferrer')
    })
  })

  describe('동적 텍스트', () => {
    it('플로팅 버튼이 활성화되면 적절한 메시지가 표시되어야 함', () => {
      ;(ChatStorage.loadSettings as Mock).mockReturnValue({
        floatingButtonEnabled: true,
        theme: 'system',
      })

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      expect(screen.getByText('플로팅 챗봇 버튼이 화면에 표시됩니다')).toBeInTheDocument()
    })

    it('플로팅 버튼이 비활성화되면 적절한 메시지가 표시되어야 함', () => {
      ;(ChatStorage.loadSettings as Mock).mockReturnValue({
        floatingButtonEnabled: false,
        theme: 'system',
      })

      render(<SettingsModal open={true} onOpenChange={vi.fn()} />)

      expect(
        screen.getByText('플로팅 챗봇 버튼이 숨겨집니다 (전용 페이지는 사용 가능)')
      ).toBeInTheDocument()
    })
  })
})
