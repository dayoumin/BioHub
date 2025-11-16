/**
 * UIContext 테스트
 *
 * 테스트 범위:
 * - Context 값 제공
 * - 챗봇 패널 상태 관리
 * - 너비/접힘 상태 관리
 * - localStorage 저장/로드
 * - 모달 상태 관리
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { UIProvider, useUI } from '@/contexts/ui-context'
import { ReactNode } from 'react'

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <UIProvider>{children}</UIProvider>
)

describe('UIContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('초기 상태', () => {
    it('기본값으로 초기화되어야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      expect(result.current.isChatPanelOpen).toBe(false)
      expect(result.current.chatPanelWidth).toBe(384)
      expect(result.current.isChatPanelCollapsed).toBe(false)
      expect(result.current.isSettingsOpen).toBe(false)
      expect(result.current.isHelpOpen).toBe(false)
    })
  })

  describe('챗봇 패널 상태', () => {
    it('openChatPanel 호출 시 패널이 열려야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openChatPanel()
      })

      expect(result.current.isChatPanelOpen).toBe(true)
    })

    it('closeChatPanel 호출 시 패널이 닫혀야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openChatPanel()
      })

      expect(result.current.isChatPanelOpen).toBe(true)

      act(() => {
        result.current.closeChatPanel()
      })

      expect(result.current.isChatPanelOpen).toBe(false)
    })

    it('toggleChatPanel 호출 시 패널이 토글되어야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.toggleChatPanel()
      })

      expect(result.current.isChatPanelOpen).toBe(true)

      act(() => {
        result.current.toggleChatPanel()
      })

      expect(result.current.isChatPanelOpen).toBe(false)
    })
  })

  describe('패널 너비 관리', () => {
    it('setChatPanelWidth로 너비를 변경할 수 있어야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.setChatPanelWidth(500)
      })

      expect(result.current.chatPanelWidth).toBe(500)
    })

    it('너비 변경 시 localStorage에 저장되어야 함', async () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.setChatPanelWidth(600)
      })

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelWidth')).toBe('600')
      })
    })
  })

  describe('패널 접기/펼치기', () => {
    it('toggleChatPanelCollapse 호출 시 접힘 상태가 토글되어야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.toggleChatPanelCollapse()
      })

      expect(result.current.isChatPanelCollapsed).toBe(true)

      act(() => {
        result.current.toggleChatPanelCollapse()
      })

      expect(result.current.isChatPanelCollapsed).toBe(false)
    })

    it('접힘 상태 변경 시 localStorage에 저장되어야 함', async () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.toggleChatPanelCollapse()
      })

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelCollapsed')).toBe('true')
      })

      act(() => {
        result.current.toggleChatPanelCollapse()
      })

      await waitFor(() => {
        expect(localStorage.getItem('chatPanelCollapsed')).toBe('false')
      })
    })
  })

  describe('localStorage 로드', () => {
    it('저장된 너비를 로드해야 함', () => {
      localStorage.setItem('chatPanelWidth', '700')

      const { result } = renderHook(() => useUI(), { wrapper })

      waitFor(() => {
        expect(result.current.chatPanelWidth).toBe(700)
      })
    })

    it('저장된 접힘 상태를 로드해야 함', () => {
      localStorage.setItem('chatPanelCollapsed', 'true')

      const { result } = renderHook(() => useUI(), { wrapper })

      waitFor(() => {
        expect(result.current.isChatPanelCollapsed).toBe(true)
      })
    })

    it('유효하지 않은 너비는 무시해야 함 (너무 작음)', () => {
      localStorage.setItem('chatPanelWidth', '100')

      const { result } = renderHook(() => useUI(), { wrapper })

      waitFor(() => {
        expect(result.current.chatPanelWidth).toBe(384) // 기본값 유지
      })
    })

    it('유효하지 않은 너비는 무시해야 함 (너무 큼)', () => {
      localStorage.setItem('chatPanelWidth', '1000')

      const { result } = renderHook(() => useUI(), { wrapper })

      waitFor(() => {
        expect(result.current.chatPanelWidth).toBe(384) // 기본값 유지
      })
    })

    it('유효한 범위의 너비는 로드해야 함', () => {
      localStorage.setItem('chatPanelWidth', '500')

      const { result } = renderHook(() => useUI(), { wrapper })

      waitFor(() => {
        expect(result.current.chatPanelWidth).toBe(500)
      })
    })
  })

  describe('설정 모달', () => {
    it('openSettings 호출 시 모달이 열려야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openSettings()
      })

      expect(result.current.isSettingsOpen).toBe(true)
    })

    it('closeSettings 호출 시 모달이 닫혀야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openSettings()
      })

      expect(result.current.isSettingsOpen).toBe(true)

      act(() => {
        result.current.closeSettings()
      })

      expect(result.current.isSettingsOpen).toBe(false)
    })
  })

  describe('도움말 모달', () => {
    it('openHelp 호출 시 모달이 열려야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openHelp()
      })

      expect(result.current.isHelpOpen).toBe(true)
    })

    it('closeHelp 호출 시 모달이 닫혀야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      act(() => {
        result.current.openHelp()
      })

      expect(result.current.isHelpOpen).toBe(true)

      act(() => {
        result.current.closeHelp()
      })

      expect(result.current.isHelpOpen).toBe(false)
    })
  })

  describe('에러 처리', () => {
    it('UIProvider 밖에서 useUI 호출 시 에러를 던져야 함', () => {
      // 콘솔 에러 숨기기
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useUI())
      }).toThrow('useUI must be used within a UIProvider')

      consoleError.mockRestore()
    })
  })
})
