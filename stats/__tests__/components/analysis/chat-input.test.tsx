/**
 * ChatInput interaction tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      chatInput: {
        heading: '무엇을 분석하고 싶으신가요?',
        placeholder: '메시지를 입력해 주세요.',
        sendAriaLabel: '전송',
        processingMessage: '처리 중...',
        uploadAriaLabel: '데이터 파일 업로드',
        uploadTitle: 'CSV / Excel 파일 업로드',
        privacyNotice: '데이터는 브라우저에서만 처리됩니다.',
      },
    },
  }),
}))

import { ChatInput } from '@/components/analysis/hub/ChatInput'

describe('ChatInput', () => {
  describe('manual submission', () => {
    it('submits typed text when the submit button is clicked', () => {
      const onSubmit = vi.fn()

      render(<ChatInput onSubmit={onSubmit} isProcessing={false} />)

      fireEvent.change(screen.getByTestId('ai-chat-input'), { target: { value: 'ANOVA 분석' } })
      fireEvent.click(screen.getByTestId('ai-chat-submit'))

      expect(onSubmit).toHaveBeenCalledWith('ANOVA 분석')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })

    it('submits on Enter and ignores Shift+Enter', () => {
      const onSubmit = vi.fn()

      render(<ChatInput onSubmit={onSubmit} isProcessing={false} />)

      const textarea = screen.getByTestId('ai-chat-input')
      fireEvent.change(textarea, { target: { value: '회귀분석' } })
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
      expect(onSubmit).not.toHaveBeenCalled()

      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
      expect(onSubmit).toHaveBeenCalledWith('회귀분석')
    })

    it('blocks submission while processing', () => {
      const onSubmit = vi.fn()

      render(<ChatInput onSubmit={onSubmit} isProcessing />)

      fireEvent.change(screen.getByTestId('ai-chat-input'), { target: { value: 'test' } })
      fireEvent.keyDown(screen.getByTestId('ai-chat-input'), { key: 'Enter', shiftKey: false })

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('prefill and submit injections', () => {
    it('prefillValue fills the textarea without auto-submitting', () => {
      const onSubmit = vi.fn()
      const onPrefillValueConsumed = vi.fn()

      render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
          prefillValue="t-test 하고 싶어"
          onPrefillValueConsumed={onPrefillValueConsumed}
        />,
      )

      expect((screen.getByTestId('ai-chat-input') as HTMLTextAreaElement).value).toBe('t-test 하고 싶어')
      expect(onSubmit).not.toHaveBeenCalled()
      expect(onPrefillValueConsumed).toHaveBeenCalledTimes(1)
    })

    it('submitValue performs a one-shot submit', () => {
      const onSubmit = vi.fn()
      const onSubmitValueConsumed = vi.fn()

      render(
        <ChatInput
          onSubmit={onSubmit}
          isProcessing={false}
          submitValue="표본 크기 계산"
          onSubmitValueConsumed={onSubmitValueConsumed}
        />,
      )

      expect(onSubmit).toHaveBeenCalledWith('표본 크기 계산')
      expect(onSubmitValueConsumed).toHaveBeenCalledTimes(1)
      expect((screen.getByTestId('ai-chat-input') as HTMLTextAreaElement).value).toBe('')
    })

    it('submitValue waits until processing is false', () => {
      const onSubmit = vi.fn()
      const { rerender } = render(
        <ChatInput onSubmit={onSubmit} isProcessing submitValue="delayed submit" />,
      )

      expect(onSubmit).not.toHaveBeenCalled()

      rerender(<ChatInput onSubmit={onSubmit} isProcessing={false} submitValue="delayed submit" />)

      expect(onSubmit).toHaveBeenCalledWith('delayed submit')
      expect(onSubmit).toHaveBeenCalledTimes(1)
    })
  })
})
