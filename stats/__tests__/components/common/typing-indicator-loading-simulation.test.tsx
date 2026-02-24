/**
 * AI 로딩 인디케이터 시뮬레이션 테스트
 *
 * 검증 범위:
 * 1. NaturalLanguageInput — 첫 요청 시 채팅 스레드 가시성 (핵심 버그픽스)
 * 2. NaturalLanguageInput — 로딩 단계 메시지 타이머 사이클
 * 3. ChatInput — isProcessing 중 상태 메시지 표시
 */

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NaturalLanguageInput } from '@/components/smart-flow/steps/purpose/NaturalLanguageInput'
import { ChatInput } from '@/components/smart-flow/hub/ChatInput'
import { TerminologyProvider } from '@/lib/terminology/terminology-context'
import type { FlowChatMessage } from '@/types/smart-flow'

// =====================================================
// 공통 모킹
// =====================================================

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

// framer-motion: AnimatePresence가 exit 애니메이션 없이 즉시 제거되도록
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

// =====================================================
// 공통 헬퍼
// =====================================================

function withTerminology(ui: React.ReactElement) {
  return render(
    <TerminologyProvider initialDomain="aquaculture">
      {ui}
    </TerminologyProvider>
  )
}

// vi.fn()을 테스트마다 새로 생성 — 호출 기록 격리를 위해 factory 함수 사용
function makeNLIProps(overrides?: Partial<Parameters<typeof NaturalLanguageInput>[0]>) {
  return {
    inputValue: '',
    responseText: null as string | null,
    error: null as string | null,
    recommendation: null,
    isLoading: false,
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onSelectMethod: vi.fn(),
    onGoToGuided: vi.fn(),
    onBrowseAll: vi.fn(),
    chatMessages: [] as FlowChatMessage[],
    ...overrides,
  }
}

// =====================================================
// Group 1: NaturalLanguageInput 채팅 스레드 가시성
// =====================================================

describe('NaturalLanguageInput — 채팅 스레드 가시성', () => {
  it('[초기 상태] 메시지 없고 로딩도 아니면 채팅 스레드가 없다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={false} chatMessages={[]} />
    )
    expect(screen.queryByTestId('chat-thread')).not.toBeInTheDocument()
  })

  it('[버그픽스] 첫 AI 요청 시: 메시지 없어도 isLoading=true면 채팅 스레드가 보인다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    expect(screen.getByTestId('chat-thread')).toBeInTheDocument()
  })

  it('[버그픽스] 첫 AI 요청 시: TypingIndicator(role=status)가 표시된다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('메시지가 있으면 로딩 여부와 무관하게 채팅 스레드가 보인다', () => {
    const msg: FlowChatMessage = { id: 'u1', role: 'user', content: '비교 분석' }
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={false} chatMessages={[msg]} />
    )
    expect(screen.getByTestId('chat-thread')).toBeInTheDocument()
  })

  it('로딩 종료 후 메시지도 없으면 채팅 스레드가 사라진다', () => {
    const { rerender } = withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    expect(screen.getByTestId('chat-thread')).toBeInTheDocument()

    rerender(
      <TerminologyProvider initialDomain="aquaculture">
        <NaturalLanguageInput {...makeNLIProps()} isLoading={false} chatMessages={[]} />
      </TerminologyProvider>
    )
    expect(screen.queryByTestId('chat-thread')).not.toBeInTheDocument()
  })
})

// =====================================================
// Group 2: NaturalLanguageInput 로딩 단계 메시지 사이클
// =====================================================

describe('NaturalLanguageInput — 로딩 단계 메시지 사이클', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('로딩 시작 시 첫 번째 loadingMessage가 표시된다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    // 아쿠아컬처 도메인의 첫 번째 로딩 메시지가 role="status" aria-label에 있어야 함
    const status = screen.getByRole('status')
    // aria-label이 설정되어 있으면 첫 메시지임
    expect(status).toHaveAttribute('aria-label')
    const firstLabel = status.getAttribute('aria-label')
    expect(firstLabel).toBeTruthy()
  })

  it('2초 후 두 번째 loadingMessage로 변경된다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    // before: 첫 번째 메시지 (stage 0)
    const firstLabel = screen.getByRole('status').getAttribute('aria-label')
    expect(firstLabel).toBeTruthy()

    act(() => { vi.advanceTimersByTime(2000) })

    // after: 두 번째 메시지 (stage 1) — 반드시 다른 문자열이어야 함
    const secondLabel = screen.getByRole('status').getAttribute('aria-label')
    expect(secondLabel).toBeTruthy()
    expect(secondLabel).not.toBe(firstLabel)
  })

  it('5초 후 세 번째 loadingMessage로 변경된다', () => {
    withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    act(() => { vi.advanceTimersByTime(2000) })
    const secondLabel = screen.getByRole('status').getAttribute('aria-label')

    act(() => { vi.advanceTimersByTime(3000) }) // 누적 5000ms

    const thirdLabel = screen.getByRole('status').getAttribute('aria-label')
    expect(thirdLabel).toBeTruthy()
    expect(thirdLabel).not.toBe(secondLabel)
  })

  it('로딩이 false로 바뀌면 TypingIndicator가 사라진다', () => {
    const { rerender } = withTerminology(
      <NaturalLanguageInput {...makeNLIProps()} isLoading={true} chatMessages={[]} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <TerminologyProvider initialDomain="aquaculture">
        <NaturalLanguageInput {...makeNLIProps()} isLoading={false} chatMessages={[]} />
      </TerminologyProvider>
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

// =====================================================
// Group 3: ChatInput — isProcessing 상태 표시
// =====================================================

describe('ChatInput — isProcessing 상태 인디케이터', () => {
  it('isProcessing=false이면 처리 중 메시지가 없다', () => {
    withTerminology(
      <ChatInput onSubmit={vi.fn()} isProcessing={false} />
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('isProcessing=true이면 TypingIndicator(role=status)가 표시된다', () => {
    withTerminology(
      <ChatInput onSubmit={vi.fn()} isProcessing={true} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('isProcessing=true이면 처리 중 메시지 텍스트가 보인다', () => {
    withTerminology(
      <ChatInput onSubmit={vi.fn()} isProcessing={true} />
    )
    // processingMessage 텍스트가 화면에 표시됨
    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-label')).toBeTruthy()
  })

  it('isProcessing=true → false: 상태 인디케이터가 사라진다', () => {
    const { rerender } = withTerminology(
      <ChatInput onSubmit={vi.fn()} isProcessing={true} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <TerminologyProvider initialDomain="aquaculture">
        <ChatInput onSubmit={vi.fn()} isProcessing={false} />
      </TerminologyProvider>
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('isProcessing=true이면 Textarea가 disabled, false이면 활성화', () => {
    const { rerender } = withTerminology(
      <ChatInput onSubmit={vi.fn()} isProcessing={true} />
    )
    expect(screen.getByTestId('ai-chat-input')).toBeDisabled()

    rerender(
      <TerminologyProvider initialDomain="aquaculture">
        <ChatInput onSubmit={vi.fn()} isProcessing={false} />
      </TerminologyProvider>
    )
    expect(screen.getByTestId('ai-chat-input')).not.toBeDisabled()
  })
})
