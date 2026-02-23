/**
 * Smart Flow Page Integration Tests
 *
 * 전략: L1 (실제 Store) + L2 (data-testid)
 * - 실제 Zustand store 사용 (mock 대신) → store 구조 변경에 자동 적응
 * - 자식 컴포넌트는 data-testid stub으로 mock → UI 변경 무관
 * - 조건부 렌더링 로직을 store 상태로 제어
 */

import { vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import HomePage from '@/app/page'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

// ===== Mock: useTerminology (TerminologyProvider 없이 테스트) =====

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    displayName: '범용 통계',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    hub: {
      experimentNotReady: '실험 설계 기능은 준비 중입니다.',
      chatInput: {
        heading: '무엇을 분석하고 싶으신가요?',
        placeholder: '메시지를 입력하세요...',
        sendAriaLabel: '전송',
      },
    },
    reanalysis: { title: '재분석' },
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
      errors: {
        uploadFailed: (msg: string) => `업로드 실패: ${msg}`,
        retryLabel: '다시 시도',
      },
      floatingNav: {
        exploration: '탐색',
        method: '방법',
        variable: '변수',
        analysis: '분석',
      },
      modeBanners: {
        reanalysis: { description: '이전 분석 결과를 기반으로 재분석합니다.' },
        quickAnalysis: {
          badge: '빠른 분석',
          description: '빠른 분석 모드',
          normalMode: '일반 모드로 전환',
          changeMethod: '분석 방법 변경',
        },
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

// ===== Mock: 자식 컴포넌트 (data-testid stub) =====

vi.mock('@/components/smart-flow/layouts/SmartFlowLayout', () => ({
  SmartFlowLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="smart-flow-layout">{children}</div>
  )
}))

vi.mock('@/components/smart-flow/steps/DataExplorationStep', () => ({
  DataExplorationStep: () => <div data-testid="data-exploration-step">Exploration</div>
}))

vi.mock('@/components/smart-flow/steps/PurposeInputStep', () => ({
  PurposeInputStep: () => <div data-testid="purpose-input-step">Purpose</div>
}))

vi.mock('@/components/smart-flow/steps/VariableSelectionStep', () => ({
  VariableSelectionStep: () => <div data-testid="variable-selection-step">Variable</div>
}))

vi.mock('@/components/smart-flow/steps/AnalysisExecutionStep', () => ({
  AnalysisExecutionStep: () => <div data-testid="analysis-execution-step">Analysis</div>
}))

vi.mock('@/components/smart-flow/steps/ResultsActionStep', () => ({
  ResultsActionStep: () => <div data-testid="results-action-step">Results</div>
}))

vi.mock('@/components/smart-flow/AnalysisHistoryPanel', () => ({
  AnalysisHistoryPanel: () => <div data-testid="history-panel">History</div>
}))

vi.mock('@/components/smart-flow/ReanalysisPanel', () => ({
  ReanalysisPanel: () => <div data-testid="reanalysis-panel">Reanalysis</div>
}))

vi.mock('@/components/smart-flow/ChatCentricHub', () => ({
  ChatCentricHub: () => <div data-testid="chat-centric-hub">Hub</div>
}))

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// ===== Mock: 서비스/유틸리티 =====

vi.mock('@/lib/services/data-validation-service', () => ({
  DataValidationService: {
    performValidation: vi.fn(() => ({ columnStats: [], rowCount: 0, isValid: true })),
    performDetailedValidation: vi.fn()
  }
}))

vi.mock('@/lib/utils/variable-compatibility', () => ({
  checkVariableCompatibility: vi.fn(() => ({
    isCompatible: true,
    issues: [],
    summary: { totalRequired: 0, matched: 0, missing: 0, typeMismatch: 0 }
  }))
}))

vi.mock('@/lib/constants/statistical-methods', () => ({
  STATISTICAL_METHODS: {}
}))

describe('SmartFlowPage Integration Tests', () => {
  beforeEach(() => {
    // 실제 store를 초기 상태로 리셋
    act(() => {
      useSmartFlowStore.getState().reset()
    })
  })

  describe('초기 렌더링', () => {
    it('페이지가 정상적으로 렌더링되어야 함', () => {
      render(<HomePage />)
      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('초기 상태(showHub=true)에서 ChatCentricHub가 표시되어야 함', () => {
      render(<HomePage />)
      expect(screen.getByTestId('chat-centric-hub')).toBeInTheDocument()
    })

    it('showHub=false, Step 1에서 DataExplorationStep이 표시되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setCurrentStep(1)
      })

      render(<HomePage />)

      expect(screen.getByTestId('data-exploration-step')).toBeInTheDocument()
      expect(screen.queryByTestId('chat-centric-hub')).not.toBeInTheDocument()
    })

    it('IndexedDB 히스토리를 로드해야 함', async () => {
      const loadSpy = vi.spyOn(useSmartFlowStore.getState(), 'loadHistoryFromDB')
        .mockResolvedValue(undefined)

      render(<HomePage />)

      expect(loadSpy).toHaveBeenCalled()
      loadSpy.mockRestore()
    })
  })

  describe('Step 변경 (4단계 구조)', () => {
    beforeEach(() => {
      act(() => {
        useSmartFlowStore.getState().setShowHub(false)
      })
    })

    it('Step 1에서 DataExplorationStep이 표시되어야 함', () => {
      act(() => {
        useSmartFlowStore.getState().setCurrentStep(1)
      })

      render(<HomePage />)

      expect(screen.getByTestId('data-exploration-step')).toBeInTheDocument()
      expect(screen.queryByTestId('purpose-input-step')).not.toBeInTheDocument()
    })

    it('Step 2에서 PurposeInputStep이 표시되어야 함', () => {
      act(() => {
        useSmartFlowStore.getState().setCurrentStep(2)
      })

      render(<HomePage />)

      expect(screen.getByTestId('purpose-input-step')).toBeInTheDocument()
      expect(screen.queryByTestId('data-exploration-step')).not.toBeInTheDocument()
    })

    it('Step 3에서 VariableSelectionStep이 표시되어야 함', () => {
      act(() => {
        useSmartFlowStore.getState().setCurrentStep(3)
      })

      render(<HomePage />)

      expect(screen.getByTestId('variable-selection-step')).toBeInTheDocument()
    })

    it('Step 4에서 결과가 없으면 AnalysisExecutionStep이 표시되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setCurrentStep(4)
        store.setResults(null)
      })

      render(<HomePage />)

      expect(screen.getByTestId('analysis-execution-step')).toBeInTheDocument()
      expect(screen.queryByTestId('results-action-step')).not.toBeInTheDocument()
    })

    it('Step 4에서 결과가 있으면 ResultsActionStep이 표시되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setCurrentStep(4)
        store.setResults({ method: 't-test', statistic: 1.5, pValue: 0.05, interpretation: 'sig' })
      })

      render(<HomePage />)

      expect(screen.getByTestId('results-action-step')).toBeInTheDocument()
      expect(screen.queryByTestId('analysis-execution-step')).not.toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('에러가 있을 때 에러 메시지가 표시되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setError('테스트 에러 메시지')
      })

      render(<HomePage />)

      expect(screen.getByText('테스트 에러 메시지')).toBeInTheDocument()
      expect(screen.getByText('다시 시도')).toBeInTheDocument()
    })

    it('에러가 없을 때 에러 메시지가 표시되지 않아야 함', () => {
      act(() => {
        useSmartFlowStore.getState().setShowHub(false)
      })

      render(<HomePage />)

      expect(screen.queryByText('테스트 에러 메시지')).not.toBeInTheDocument()
    })
  })

  describe('데이터 상태', () => {
    it('uploadedData가 있을 때 정상 렌더링되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setUploadedData([{ col1: 'value1' }])
        store.setUploadedFileName('test.csv')
      })

      render(<HomePage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('uploadedData가 없을 때도 정상 렌더링되어야 함', () => {
      act(() => {
        useSmartFlowStore.getState().setShowHub(false)
      })

      render(<HomePage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })
  })

  describe('Hub ↔ Flow 전환', () => {
    it('showHub=true일 때 ChatCentricHub가 표시되어야 함', () => {
      render(<HomePage />)

      expect(screen.getByTestId('chat-centric-hub')).toBeInTheDocument()
      expect(screen.queryByTestId('data-exploration-step')).not.toBeInTheDocument()
    })

    it('showHub=false로 전환하면 step 컴포넌트가 표시되어야 함', () => {
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setCurrentStep(1)
      })

      render(<HomePage />)

      expect(screen.queryByTestId('chat-centric-hub')).not.toBeInTheDocument()
      expect(screen.getByTestId('data-exploration-step')).toBeInTheDocument()
    })
  })

  describe('시스템 메모리 감지', () => {
    it('Navigator API를 통해 메모리를 감지해야 함', () => {
      const originalDeviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory

      try {
        Object.defineProperty(navigator, 'deviceMemory', {
          value: 8,
          configurable: true,
          writable: true
        })

        render(<HomePage />)

        expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
      } finally {
        if (originalDeviceMemory === undefined) {
          delete (navigator as unknown as { deviceMemory?: number }).deviceMemory
        } else {
          Object.defineProperty(navigator, 'deviceMemory', {
            value: originalDeviceMemory,
            configurable: true,
            writable: true
          })
        }
      }
    })
  })
})
