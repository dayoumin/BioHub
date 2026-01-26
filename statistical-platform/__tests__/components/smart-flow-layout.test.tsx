/**
 * SmartFlowLayout Component Tests
 *
 * 목적: SmartFlowLayout v7 렌더링 검증
 * - 헤더 렌더링 (NIFS 통계 분석 로고)
 * - 히스토리/도움말 패널 토글
 * - 분석 중 오버레이
 */

import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SmartFlowLayout } from '@/components/smart-flow/layouts/SmartFlowLayout'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/smart-flow',
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock FloatingStepIndicator
vi.mock('@/components/common/FloatingStepIndicator', () => ({
  FloatingStepIndicator: ({ currentStep }: { currentStep: number }) => (
    <div data-testid="step-indicator">Step {currentStep}</div>
  ),
}))

// Mock UI Context
vi.mock('@/contexts/ui-context', () => ({
  useUI: () => ({
    openChatPanel: vi.fn(),
    openSettings: vi.fn(),
    openHelp: vi.fn(),
    isSettingsOpen: false,
    isHelpOpen: false,
    closeSettings: vi.fn(),
    closeHelp: vi.fn(),
  }),
}))

// Mock modals
vi.mock('@/components/layout/settings-modal', () => ({
  SettingsModal: () => null,
}))
vi.mock('@/components/layout/help-modal', () => ({
  HelpModal: () => null,
}))

describe('SmartFlowLayout', () => {
  const defaultProps = {
    currentStep: 1,
    steps: [
      { id: 1, label: '탐색', completed: false },
      { id: 2, label: '방법', completed: false },
      { id: 3, label: '변수', completed: false },
      { id: 4, label: '분석', completed: false },
    ],
    children: <div data-testid="test-content">Test Content</div>,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('컴포넌트가 정상적으로 렌더링되어야 함', () => {
      render(<SmartFlowLayout {...defaultProps} />)

      // 헤더에 "NIFS 통계 분석" 링크가 있는지 확인
      expect(screen.getByText('NIFS 통계 분석')).toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('스텝 인디케이터가 렌더링되어야 함', () => {
      render(<SmartFlowLayout {...defaultProps} />)

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    })
  })

  describe('히스토리 패널', () => {
    it('showHistory가 false일 때 히스토리 패널이 보이지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={false}
          historyPanel={<div data-testid="history-panel">History</div>}
          onHistoryToggle={vi.fn()}
        />
      )

      expect(screen.queryByTestId('history-panel')).not.toBeInTheDocument()
    })

    it('showHistory가 true일 때 히스토리 패널이 보여야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={true}
          historyPanel={<div data-testid="history-panel">History</div>}
          onHistoryToggle={vi.fn()}
        />
      )

      expect(screen.getByTestId('history-panel')).toBeInTheDocument()
      expect(screen.getByText('📊 분석 히스토리')).toBeInTheDocument()
    })

    it('히스토리 토글 버튼 클릭 시 onHistoryToggle이 호출되어야 함', () => {
      const onHistoryToggle = vi.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={onHistoryToggle}
        />
      )

      // title 속성으로 버튼 찾기
      const historyButton = screen.getByTitle('분석 히스토리')
      fireEvent.click(historyButton)

      expect(onHistoryToggle).toHaveBeenCalledTimes(1)
    })

    it('히스토리 패널의 닫기 버튼 클릭 시 onHistoryToggle이 호출되어야 함', () => {
      const onHistoryToggle = vi.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={true}
          historyPanel={<div>History</div>}
          onHistoryToggle={onHistoryToggle}
        />
      )

      // 히스토리 카드 헤더의 버튼 찾기 (X 버튼)
      const historyTitle = screen.getByText('📊 분석 히스토리')
      const cardHeader = historyTitle.closest('div')?.parentElement
      const closeButton = cardHeader?.querySelector('button')
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onHistoryToggle).toHaveBeenCalled()
      }
    })
  })

  describe('도움말 패널', () => {
    it('showHelp가 false일 때 도움말 패널이 보이지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={false}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.queryByText('💾 데이터 크기 가이드')).not.toBeInTheDocument()
    })

    it('showHelp가 true일 때 도움말 패널이 보여야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.getByText('💾 데이터 크기 가이드')).toBeInTheDocument()
      expect(screen.getByText('현재 제한사항')).toBeInTheDocument()
      expect(screen.getByText('메모리별 권장 크기')).toBeInTheDocument()
    })

    it('systemMemory가 제공되면 감지된 메모리가 표시되어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          systemMemory={16}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.getByText(/감지된 메모리: 16GB/)).toBeInTheDocument()
    })

    it('systemMemory가 null이면 감지된 메모리가 표시되지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          systemMemory={null}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.queryByText(/감지된 메모리:/)).not.toBeInTheDocument()
    })
  })

  describe('분석 중 상태', () => {
    it('isAnalyzing이 true일 때 오버레이가 표시되어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          isAnalyzing={true}
          analyzingMessage="분석 중..."
        />
      )

      expect(screen.getByText('분석 중...')).toBeInTheDocument()
    })

    it('isAnalyzing이 false일 때 오버레이가 표시되지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          isAnalyzing={false}
        />
      )

      expect(screen.queryByText('분석 중...')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('헤더 아이콘 버튼들이 title 속성을 가져야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={vi.fn()}
        />
      )

      expect(screen.getByTitle('분석 히스토리')).toBeInTheDocument()
      expect(screen.getByTitle('AI 챗봇')).toBeInTheDocument()
      expect(screen.getByTitle('도움말')).toBeInTheDocument()
      expect(screen.getByTitle('설정')).toBeInTheDocument()
    })
  })

  describe('CSS 클래스', () => {
    it('커스텀 className이 적용되어야 함', () => {
      const { container } = render(
        <SmartFlowLayout
          {...defaultProps}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
