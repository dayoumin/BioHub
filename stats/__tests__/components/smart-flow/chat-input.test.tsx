/**
 * ChatInput — externalValue 주입 + auto-submit 테스트
 *
 * 시나리오:
 * 1. externalValue 주입 → 150ms 후 onSubmit 호출
 * 2. onSubmit 호출 후 onExternalValueConsumed 호출 (이전 순서가 아닌)
 * 3. 수동 입력 + Enter → onSubmit 호출
 * 4. isProcessing=true → 제출 불가
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

// ===== Mocks =====

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      chatInput: {
        heading: '무엇을 분석하고 싶으신가요?',
        placeholder: '메시지를 입력하세요...',
        sendAriaLabel: '전송',
      },
    },
  }),
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // 애니메이션 비활성화
}))

// framer-motion mock — motion.div를 일반 div로, AnimatePresence를 Fragment로
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const htmlProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className' || key === 'style') {
          htmlProps[key] = value
        }
      }
      return <div {...htmlProps}>{children}</div>
    },
    span: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const htmlProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('data-') || key === 'className' || key === 'style') {
          htmlProps[key] = value
        }
      }
      return <span {...htmlProps}>{children}</span>
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}))

import { ChatInput } from '@/components/smart-flow/hub/ChatInput'

// ===== 테스트 =====

describe('ChatInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ===== 시나리오 1: 수동 입력 제출 =====
  describe('수동 입력 제출', () => {
    it('텍스트 입력 후 버튼 클릭 → onSubmit 호출', async () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={false} />
      )

      const textarea = screen.getByTestId('ai-chat-input')
      const submitBtn = screen.getByTestId('ai-chat-submit')

      fireEvent.change(textarea, { target: { value: 't-test 해줘' } })
      fireEvent.click(submitBtn)

      expect(onSubmit).toHaveBeenCalledWith('t-test 해줘')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('Enter 키로 제출', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={false} />
      )

      const textarea = screen.getByTestId('ai-chat-input')

      fireEvent.change(textarea, { target: { value: 'ANOVA 분석' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      expect(onSubmit).toHaveBeenCalledWith('ANOVA 분석')
    })

    it('Shift+Enter → 제출하지 않음 (줄바꿈)', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={false} />
      )

      const textarea = screen.getByTestId('ai-chat-input')

      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('빈 입력 → 제출 안 됨', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={false} />
      )

      const submitBtn = screen.getByTestId('ai-chat-submit')
      fireEvent.click(submitBtn)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('공백만 입력 → 제출 안 됨', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={false} />
      )

      const textarea = screen.getByTestId('ai-chat-input')

      fireEvent.change(textarea, { target: { value: '   ' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('isProcessing=true → 제출 비활성화', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput onSubmit={onSubmit} isProcessing={true} />
      )

      const textarea = screen.getByTestId('ai-chat-input')

      fireEvent.change(textarea, { target: { value: 'test' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  // ===== 시나리오 2: externalValue 주입 → auto-submit =====
  describe('externalValue 주입 (트랙 카드 클릭)', () => {
    it('[버그 수정 검증] externalValue 주입 → 150ms 후 onSubmit 호출됨', () => {
      const onSubmit = vi.fn()
      const onConsumed = vi.fn()

      render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
          externalValue="t-test 하고 싶어"
          onExternalValueConsumed={onConsumed}
        />
      )

      // 즉시: onSubmit 아직 호출 안 됨
      expect(onSubmit).not.toHaveBeenCalled()

      // 150ms 후: onSubmit 호출됨
      act(() => {
        vi.advanceTimersByTime(150)
      })

      expect(onSubmit).toHaveBeenCalledWith('t-test 하고 싶어')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('[버그 수정 검증] onExternalValueConsumed는 onSubmit 이후에 호출됨', () => {
      const callOrder: string[] = []
      const onSubmit = vi.fn(() => callOrder.push('submit'))
      const onConsumed = vi.fn(() => callOrder.push('consumed'))

      render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
          externalValue="표본 크기 계산"
          onExternalValueConsumed={onConsumed}
        />
      )

      act(() => {
        vi.advanceTimersByTime(150)
      })

      // 핵심: submit이 consumed보다 먼저 호출
      expect(callOrder).toEqual(['submit', 'consumed'])

      // 둘 다 정확히 1번씩 호출
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onConsumed).toHaveBeenCalledTimes(1)
    })

    it('externalValue가 textarea에 표시됨', () => {
      render(
        <ChatInput
          onSubmit={vi.fn()}
          isProcessing={false}
          externalValue="데이터 분석 도와줘"
          onExternalValueConsumed={vi.fn()}
        />
      )

      const textarea = screen.getByTestId('ai-chat-input') as HTMLTextAreaElement
      expect(textarea.value).toBe('데이터 분석 도와줘')
    })

    it('150ms 이전에 언마운트 → timer 정리 (onSubmit 호출 안 됨)', () => {
      const onSubmit = vi.fn()

      const { unmount } = render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
          externalValue="test"
          onExternalValueConsumed={vi.fn()}
        />
      )

      // 100ms만 경과 후 언마운트
      act(() => {
        vi.advanceTimersByTime(100)
      })
      unmount()

      // 나머지 시간 경과
      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('externalValue 없이 렌더 → auto-submit 안 됨', () => {
      const onSubmit = vi.fn()

      render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
        />
      )

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})
