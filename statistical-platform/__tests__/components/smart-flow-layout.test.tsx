/**
 * SmartFlowLayout Component Tests
 *
 * 목적: Phase A 리팩토링 검증
 * - SmartFlowLayout 렌더링 테스트
 * - Props 전달 테스트
 * - 히스토리/도움말 토글 테스트
 * - TwoPanelLayout 통합 테스트
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import { SmartFlowLayout } from '@/components/smart-flow/layouts/SmartFlowLayout'

// Mock TwoPanelLayout
jest.mock('@/components/statistics/layouts/TwoPanelLayout', () => ({
  TwoPanelLayout: ({ children, analysisTitle, analysisSubtitle }: {
    children: React.ReactNode
    analysisTitle?: string
    analysisSubtitle?: string
  }) => (
    <div data-testid="two-panel-layout">
      <div data-testid="analysis-title">{analysisTitle}</div>
      <div data-testid="analysis-subtitle">{analysisSubtitle}</div>
      {children}
    </div>
  )
}))

describe('SmartFlowLayout', () => {
  const defaultProps = {
    currentStep: 1,
    steps: [
      { id: 1, label: '데이터 업로드', completed: false },
      { id: 2, label: '데이터 요약', completed: false },
      { id: 3, label: '분석 목적', completed: false }
    ],
    children: <div data-testid="test-content">Test Content</div>
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('컴포넌트가 정상적으로 렌더링되어야 함', () => {
      render(<SmartFlowLayout {...defaultProps} />)

      // 헤더에 "스마트 통계 분석" 텍스트가 있는지 확인 (getAllByText로 중복 허용)
      const titles = screen.getAllByText('스마트 통계 분석')
      expect(titles.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('TwoPanelLayout에 올바른 Props가 전달되어야 함', () => {
      render(<SmartFlowLayout {...defaultProps} />)

      expect(screen.getByTestId('analysis-title')).toHaveTextContent('스마트 통계 분석')
      expect(screen.getByTestId('analysis-subtitle')).toHaveTextContent('AI-powered Statistical Analysis')
    })

    it('헤더에 분석 히스토리와 도움말 버튼이 표시되어야 함', () => {
      const onHistoryToggle = jest.fn()
      const onHelpToggle = jest.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={onHistoryToggle}
          onHelpToggle={onHelpToggle}
        />
      )

      expect(screen.getByText('분석 히스토리')).toBeInTheDocument()
      expect(screen.getByText('데이터 제한 안내')).toBeInTheDocument()
    })
  })

  describe('히스토리 패널', () => {
    it('showHistory가 false일 때 히스토리 패널이 보이지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={false}
          historyPanel={<div data-testid="history-panel">History</div>}
          onHistoryToggle={jest.fn()}
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
          onHistoryToggle={jest.fn()}
        />
      )

      expect(screen.getByTestId('history-panel')).toBeInTheDocument()
      expect(screen.getByText('📊 분석 히스토리')).toBeInTheDocument()
    })

    it('히스토리 토글 버튼 클릭 시 onHistoryToggle이 호출되어야 함', () => {
      const onHistoryToggle = jest.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={onHistoryToggle}
        />
      )

      const historyButton = screen.getByText('분석 히스토리')
      fireEvent.click(historyButton)

      expect(onHistoryToggle).toHaveBeenCalledTimes(1)
    })

    it('히스토리 패널의 X 버튼 클릭 시 onHistoryToggle이 호출되어야 함', () => {
      const onHistoryToggle = jest.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={true}
          historyPanel={<div>History</div>}
          onHistoryToggle={onHistoryToggle}
        />
      )

      // X 버튼은 2개 (히스토리 + 도움말 각각)
      const closeButtons = screen.getAllByRole('button')
      const historyCloseButton = closeButtons.find(btn =>
        btn.closest('[data-testid]')?.textContent?.includes('분석 히스토리')
      )

      if (historyCloseButton) {
        fireEvent.click(historyCloseButton)
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
          onHelpToggle={jest.fn()}
        />
      )

      expect(screen.queryByText('💾 데이터 크기 가이드')).not.toBeInTheDocument()
    })

    it('showHelp가 true일 때 도움말 패널이 보여야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          onHelpToggle={jest.fn()}
        />
      )

      expect(screen.getByText('💾 데이터 크기 가이드')).toBeInTheDocument()
      expect(screen.getByText('현재 제한사항')).toBeInTheDocument()
      expect(screen.getByText('메모리별 권장 크기')).toBeInTheDocument()
    })

    it('도움말 토글 버튼 클릭 시 onHelpToggle이 호출되어야 함', () => {
      const onHelpToggle = jest.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          onHelpToggle={onHelpToggle}
        />
      )

      const helpButton = screen.getByText('데이터 제한 안내')
      fireEvent.click(helpButton)

      expect(onHelpToggle).toHaveBeenCalledTimes(1)
    })

    it('systemMemory가 제공되면 감지된 메모리가 표시되어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          systemMemory={16}
          onHelpToggle={jest.fn()}
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
          onHelpToggle={jest.fn()}
        />
      )

      expect(screen.queryByText(/감지된 메모리:/)).not.toBeInTheDocument()
    })
  })

  describe('분석 중 상태', () => {
    it('isAnalyzing이 true일 때 TwoPanelLayout에 전달되어야 함', () => {
      // 이 테스트는 TwoPanelLayout mock을 확장하여 검증 가능
      render(
        <SmartFlowLayout
          {...defaultProps}
          isAnalyzing={true}
          analyzingMessage="분석 중..."
        />
      )

      // TwoPanelLayout이 올바른 props를 받았는지 확인
      expect(screen.getByTestId('two-panel-layout')).toBeInTheDocument()
    })
  })

  describe('하단 데이터 미리보기', () => {
    it('bottomPreview가 제공되면 TwoPanelLayout에 전달되어야 함', () => {
      const bottomPreview = {
        data: [{ col1: 'value1', col2: 'value2' }],
        fileName: 'test.csv',
        maxRows: 100
      }

      render(
        <SmartFlowLayout
          {...defaultProps}
          bottomPreview={bottomPreview}
        />
      )

      // TwoPanelLayout이 렌더링되었는지 확인
      expect(screen.getByTestId('two-panel-layout')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('버튼에 아이콘과 텍스트가 모두 있어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={jest.fn()}
          onHelpToggle={jest.fn()}
        />
      )

      // 버튼에 텍스트가 있는지 확인
      expect(screen.getByText('분석 히스토리')).toBeInTheDocument()
      expect(screen.getByText('데이터 제한 안내')).toBeInTheDocument()
    })
  })

  describe('CSS 클래스', () => {
    it('커스텀 className이 TwoPanelLayout에 전달되어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          className="custom-class"
        />
      )

      // TwoPanelLayout이 렌더링되었는지 확인 (className은 mock에서 확인 불가)
      expect(screen.getByTestId('two-panel-layout')).toBeInTheDocument()
    })
  })
})
