/**
 * UIContext 테스트
 *
 * 테스트 범위:
 * - 설정 모달 상태 관리
 * - 도움말 모달 상태 관리
 * - 에러 처리
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { UIProvider, useUI } from '@/contexts/ui-context'
import { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UIProvider>{children}</UIProvider>
)

describe('UIContext', () => {
  describe('초기 상태', () => {
    it('기본값으로 초기화되어야 함', () => {
      const { result } = renderHook(() => useUI(), { wrapper })

      expect(result.current.isSettingsOpen).toBe(false)
      expect(result.current.isHelpOpen).toBe(false)
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

      act(() => { result.current.openSettings() })
      expect(result.current.isSettingsOpen).toBe(true)

      act(() => { result.current.closeSettings() })
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

      act(() => { result.current.openHelp() })
      expect(result.current.isHelpOpen).toBe(true)

      act(() => { result.current.closeHelp() })
      expect(result.current.isHelpOpen).toBe(false)
    })
  })

  describe('에러 처리', () => {
    it('UIProvider 밖에서 useUI 호출 시 에러를 던져야 함', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useUI())
      }).toThrow('useUI must be used within a UIProvider')

      consoleError.mockRestore()
    })
  })
})
