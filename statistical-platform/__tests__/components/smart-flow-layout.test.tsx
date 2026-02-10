/**
 * SmartFlowLayout Component Tests
 *
 * 전략: L2 (data-testid) + props 기반 렌더링 검증
 * - 컴포넌트 props에 따른 조건부 렌더링 확인
 * - Radix Sheet (히스토리)은 JSDOM Portal 한계 → Sheet mock으로 해결
 * - title 속성으로 접근성 검증
 */

import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SmartFlowLayout } from '@/components/smart-flow/layouts/SmartFlowLayout'

// Mock Terminology hooks (TerminologyProvider 없이 테스트)
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    displayName: '범용 통계',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    smartFlow: {
      stepTitles: {},
      statusMessages: {},
      buttons: {},
      resultSections: {},
      stepShortLabels: { exploration: '탐색', method: '방법', variable: '변수', analysis: '분석' },
      executionStages: {
        prepare: { label: '', message: '' }, preprocess: { label: '', message: '' },
        assumptions: { label: '', message: '' }, analysis: { label: '', message: '' },
        additional: { label: '', message: '' }, finalize: { label: '', message: '' },
      },
      layout: {
        appTitle: 'NIFS 통계 분석',
        historyTitle: '분석 히스토리',
        historyClose: '히스토리 닫기',
        historyCount: (n: number) => `히스토리 (${n}개)`,
        aiChatbot: 'AI 챗봇',
        helpLabel: '도움말',
        settingsLabel: '설정',
        nextStep: '다음 단계',
        analyzingDefault: '분석 중...',
        dataSizeGuide: '데이터 크기 가이드',
        currentLimits: '현재 제한사항',
        memoryRecommendation: '메모리별 권장 크기',
        detectedMemory: (gb: number) => `→ 감지된 메모리: ${gb}GB`,
        limitFileSize: '최대 파일: 50MB',
        limitDataSize: '최대 데이터: 100,000행 × 1,000열',
        limitRecommended: '권장: 10,000행 이하',
        memoryTier4GB: '4GB RAM: ~10,000행',
        memoryTier8GB: '8GB RAM: ~30,000행',
        memoryTier16GB: '16GB RAM: ~60,000행',
      },
      execution: {
        runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '',
        pauseDisabledTooltip: '', cancelConfirm: '',
        logSectionLabel: () => '', noLogs: '', dataRequired: '',
        unknownError: '', estimatedTimeRemaining: () => '',
      },
    },
    purposeInput: {
      purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
      buttons: { back: '', allMethods: '', useThisMethod: '' },
      labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' },
      messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' },
      aiLabels: { recommendTitle: '' },
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'generic', displayName: '범용 통계' },
    setDomain: vi.fn(),
    currentDomain: 'generic',
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/smart-flow',
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick }: { children: React.ReactNode; href: string; onClick?: (e: React.MouseEvent) => void }) => (
    <a href={href} onClick={onClick}>{children}</a>
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

// Mock store (resetSession만 필요)
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: (selector: (state: { resetSession: () => void }) => unknown) =>
    selector({ resetSession: vi.fn() })
}))

// Mock modals
vi.mock('@/components/layout/settings-modal', () => ({
  SettingsModal: () => null,
}))
vi.mock('@/components/layout/help-modal', () => ({
  HelpModal: () => null,
}))

// Mock Radix Sheet (JSDOM Portal 한계 해결)
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    open ? <div data-testid="sheet-container">{children}</div> : null
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
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

      expect(screen.getByText('NIFS 통계 분석')).toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('스텝 인디케이터가 렌더링되어야 함', () => {
      render(<SmartFlowLayout {...defaultProps} />)

      expect(screen.getByTestId('step-indicator')).toBeInTheDocument()
    })
  })

  describe('히스토리 패널', () => {
    it('showHistory=false일 때 히스토리 Sheet가 렌더링되지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={false}
          historyPanel={<div data-testid="history-panel">History</div>}
          onHistoryToggle={vi.fn()}
          historyCount={5}
        />
      )

      expect(screen.queryByTestId('sheet-container')).not.toBeInTheDocument()
    })

    it('showHistory=true일 때 히스토리 Sheet가 렌더링되어야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHistory={true}
          historyPanel={<div data-testid="history-panel">History</div>}
          onHistoryToggle={vi.fn()}
          historyCount={5}
        />
      )

      expect(screen.getByTestId('sheet-container')).toBeInTheDocument()
      expect(screen.getByTestId('history-panel')).toBeInTheDocument()
    })

    it('historyCount > 0일 때 히스토리 토글 버튼이 표시되어야 함', () => {
      const onHistoryToggle = vi.fn()

      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={onHistoryToggle}
          historyCount={3}
        />
      )

      const historyButton = screen.getByTitle('히스토리 (3개)')
      fireEvent.click(historyButton)

      expect(onHistoryToggle).toHaveBeenCalledTimes(1)
    })

    it('historyCount=0이면 히스토리 버튼이 숨겨져야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          onHistoryToggle={vi.fn()}
          historyCount={0}
        />
      )

      expect(screen.queryByTitle(/히스토리/)).not.toBeInTheDocument()
    })
  })

  describe('도움말 패널', () => {
    it('showHelp=false일 때 도움말 패널이 보이지 않아야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={false}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.queryByText('데이터 크기 가이드')).not.toBeInTheDocument()
    })

    it('showHelp=true일 때 도움말 패널이 보여야 함', () => {
      render(
        <SmartFlowLayout
          {...defaultProps}
          showHelp={true}
          onHelpToggle={vi.fn()}
        />
      )

      expect(screen.getByText('데이터 크기 가이드')).toBeInTheDocument()
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
          historyCount={1}
        />
      )

      expect(screen.getByTitle('AI 챗봇')).toBeInTheDocument()
      expect(screen.getByTitle('도움말')).toBeInTheDocument()
      expect(screen.getByTitle('설정')).toBeInTheDocument()
      expect(screen.getByTitle('히스토리 (1개)')).toBeInTheDocument()
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
