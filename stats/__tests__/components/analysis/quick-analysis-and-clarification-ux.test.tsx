import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const analysisStoreState = {
  uploadNonce: 0,
  uploadedData: null as unknown[] | null,
}

let lastQuickAccessBarProps: Record<string, unknown> | null = null
let lastChatThreadProps: Record<string, unknown> | null = null
let lastChatInputProps: Record<string, unknown> | null = null

vi.mock('framer-motion', () => ({
  motion: {
    div: (props: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, props.children),
    section: (props: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('section', props, props.children),
  },
  AnimatePresence: (props: React.PropsWithChildren) =>
    React.createElement(React.Fragment, null, props.children),
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    hub: {
      quickStart: { newAnalysis: '새 분석' },
      hero: { heading: '데이터에서 인사이트까지', subheading: '어떤 분석을 하시겠습니까?' },
      intentMessages: {
        startAnalysisSuffix: '분석을 시작합니다.',
        graphStudio: 'Graph Studio로 이동합니다.',
        classificationError: '분류 오류',
      },
      cards: { recentTitle: '최근 활동' },
    },
  }),
}))

vi.mock('@/lib/services', () => ({
  intentRouter: { classify: vi.fn() },
  getHubAiResponse: vi.fn(),
  getHubDiagnosticResponse: vi.fn(),
  getHubDiagnosticResumeResponse: vi.fn(),
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  bridgeDiagnosticToSmartFlow: vi.fn(),
  prepareManualMethodBrowsing: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('@/hooks/use-hub-data-upload', () => ({
  useHubDataUpload: () => ({
    handleFileSelected: vi.fn(),
    clearDataContext: vi.fn(),
  }),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: Object.assign((selector?: (state: typeof analysisStoreState) => unknown) => (
    selector ? selector(analysisStoreState) : analysisStoreState
  ), {
    getState: () => analysisStoreState,
  }),
}))

vi.mock('@/components/analysis/hub/ChatInput', () => ({
  ChatInput: (props: Record<string, unknown>) => {
    lastChatInputProps = props
    return (
      <div data-testid="chat-input">
        <button
          data-testid="chat-input-submit"
          onClick={() => (props.onSubmit as ((message: string) => void) | undefined)?.('follow-up question')}
        >
          submit
        </button>
      </div>
    )
  },
}))

vi.mock('@/components/analysis/hub/ChatThread', () => ({
  ChatThread: (props: Record<string, unknown>) => {
    lastChatThreadProps = props
    return <div data-testid="chat-thread">thread</div>
  },
}))

vi.mock('@/components/analysis/hub/DataContextBadge', () => ({
  DataContextBadge: () => <div data-testid="data-context-badge">badge</div>,
}))

vi.mock('@/components/analysis/hub/QuickAnalysisPills', () => ({
  QuickAnalysisPills: () => <div data-testid="quick-analysis-pills">pills</div>,
}))

vi.mock('@/components/analysis/hub/TrackSuggestions', () => ({
  TrackSuggestions: () => <div data-testid="track-suggestions">suggestions</div>,
}))

vi.mock('@/components/analysis/hub/QuickAccessBar', () => ({
  QuickAccessBar: (props: Record<string, unknown>) => {
    lastQuickAccessBarProps = props
    return <div data-testid="quick-access-bar">history</div>
  },
}))

import { useHubChatStore } from '@/lib/stores/hub-chat-store'
import { intentRouter, getHubDiagnosticResumeResponse } from '@/lib/services'
import { bridgeDiagnosticToSmartFlow } from '@/lib/stores/store-orchestration'
import { ChatCentricHub } from '@/components/analysis/ChatCentricHub'
import { VariablePicker } from '@/components/analysis/hub/VariablePicker'
import { QuickAnalysisBanner } from '@/components/analysis/steps/Step1ModeBanners'

describe('quick analysis and clarification UX', () => {
  beforeEach(() => {
    analysisStoreState.uploadNonce = 0
    analysisStoreState.uploadedData = null
    lastQuickAccessBarProps = null
    lastChatThreadProps = null
    lastChatInputProps = null
    useHubChatStore.setState({
      messages: [],
      dataContext: null,
      isStreaming: false,
      streamingStatus: null,
      hasSeenUploadSuggestion: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows a selected-method indicator in the quick analysis banner', () => {
    render(
      <QuickAnalysisBanner
        method={{ id: 'two-sample-t', name: '두 집단 차이 비교', category: 't-test' } as never}
        onNormalMode={vi.fn()}
        onChangeMethod={vi.fn()}
        t={{
          badge: '빠른 분석',
          description: '선택한 방법으로 바로 진행합니다.',
          normalMode: '일반 모드',
          changeMethod: '방법 변경',
        }}
      />
    )

    expect(screen.getByTestId('quick-analysis-selected-method')).toBeInTheDocument()
    expect(screen.getByText('두 집단 차이 비교')).toBeInTheDocument()
  })

  it('shows repeated-measures guidance when no categorical group column exists', () => {
    render(
      <VariablePicker
        candidateColumns={[
          { column: 'time1', type: 'numeric' },
          { column: 'time2', type: 'numeric' },
          { column: 'time3', type: 'numeric' },
        ] as never}
        partialAssignments={null}
        missingRoles={['factor']}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByTestId('variable-picker-guidance')).toHaveTextContent('time1, time2, time3')
    expect(screen.getByTestId('variable-picker-guidance')).toBeInTheDocument()
  })

  it('submits independent-variable clarification under the independent role', () => {
    const onConfirm = vi.fn()

    render(
      <VariablePicker
        candidateColumns={[
          { column: 'predictor', type: 'numeric' },
          { column: 'group', type: 'categorical', sampleGroups: ['A', 'B'] },
        ] as never}
        partialAssignments={{ dependent: ['outcome'] } as never}
        missingRoles={['independent']}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )

    fireEvent.click(screen.getAllByText('predictor')[1]!.closest('button')!)
    fireEvent.click(screen.getByTestId('variable-picker-confirm'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        dependent: ['outcome'],
        independent: ['predictor'],
      }),
    )
    expect(onConfirm.mock.calls[0]?.[0]?.factor).toBeUndefined()
  })

  it('hides the free-form chat input only while the active dataset still has a pending clarification', () => {
    analysisStoreState.uploadNonce = 0
    analysisStoreState.uploadedData = [{ time1: 1 }]
    useHubChatStore.setState({
      dataContext: {
        fileName: 'repeated.csv',
        totalRows: 15,
        columnCount: 3,
        numericColumns: ['time1', 'time2'],
        categoricalColumns: [],
        validationResults: { isValid: true, totalRows: 15, columnCount: 3, missingValues: 0, dataType: 'tabular', variables: [], errors: [], warnings: [] } as never,
      },
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'clarification',
          timestamp: Date.now(),
          diagnosticReport: {
            uploadNonce: 0,
            basicStats: {
              totalRows: 15,
              groups: [],
              numericSummaries: [],
            },
            pendingClarification: {
              missingRoles: ['factor'],
              candidateColumns: [],
            },
          } as never,
        },
      ],
    })

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    expect(screen.queryByTestId('chat-input')).not.toBeInTheDocument()
    expect(screen.getByTestId('hub-clarification-lock')).toBeInTheDocument()
    expect(screen.getByText('필요한 항목을 먼저 선택해 주세요.')).toBeInTheDocument()
  })

  it('releases the input lock when the pending clarification belongs to an older upload', () => {
    analysisStoreState.uploadNonce = 2
    analysisStoreState.uploadedData = [{ time1: 1 }]
    useHubChatStore.setState({
      dataContext: {
        fileName: 'new-upload.csv',
        totalRows: 15,
        columnCount: 3,
        numericColumns: ['time1', 'time2'],
        categoricalColumns: [],
        validationResults: { isValid: true, totalRows: 15, columnCount: 3, missingValues: 0, dataType: 'tabular', variables: [], errors: [], warnings: [] } as never,
      },
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'stale clarification',
          timestamp: Date.now(),
          diagnosticReport: {
            uploadNonce: 1,
            basicStats: {
              totalRows: 15,
              groups: [],
              numericSummaries: [],
            },
            pendingClarification: {
              missingRoles: ['factor'],
              candidateColumns: [],
            },
          } as never,
        },
      ],
    })

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    expect(screen.getByTestId('chat-input')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-clarification-lock')).not.toBeInTheDocument()
  })

  it('moves recent activity into a dedicated rail and hides support tools after conversation starts', () => {
    useHubChatStore.setState({
      dataContext: {
        fileName: 'repeated.csv',
        totalRows: 15,
        columnCount: 3,
        numericColumns: ['time1', 'time2'],
        categoricalColumns: [],
        validationResults: { isValid: true, totalRows: 15, columnCount: 3, missingValues: 0, dataType: 'tabular', variables: [], errors: [], warnings: [] } as never,
      },
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'answer',
          timestamp: Date.now(),
        },
      ],
    })

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    expect(screen.getByTestId('hub-recent-rail')).toBeInTheDocument()
    expect(screen.getByTestId('quick-access-bar')).toBeInTheDocument()
    expect(screen.queryByTestId('hub-support-tools')).not.toBeInTheDocument()
    expect(screen.queryByTestId('track-suggestions')).not.toBeInTheDocument()
    expect(lastQuickAccessBarProps).toMatchObject({
      compact: true,
      maxItems: 3,
      showHeader: false,
    })
  })

  it('routes suggested analyses through the diagnostic bridge instead of quick analysis reset', () => {
    const onQuickAnalysis = vi.fn()
    const report = {
      uploadNonce: 0,
      originUserMessage: '집단간 비교를 하고 싶어',
      basicStats: {
        totalRows: 15,
        groups: [],
        numericSummaries: [],
      },
      assumptions: null,
      variableAssignments: {
        dependent: ['time1'],
      },
      pendingClarification: {
        question: '무엇을 비교할까요?',
        missingRoles: ['factor'],
        candidateColumns: [],
        suggestedAnalyses: [],
      },
    } as never

    analysisStoreState.uploadNonce = 0
    analysisStoreState.uploadedData = [{ time1: 1 }]
    useHubChatStore.setState({
      dataContext: {
        fileName: 'repeated.csv',
        totalRows: 15,
        columnCount: 3,
        numericColumns: ['time1', 'time2'],
        categoricalColumns: [],
        validationResults: { isValid: true, totalRows: 15, columnCount: 3, missingValues: 0, dataType: 'tabular', variables: [], errors: [], warnings: [] } as never,
      },
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'clarification',
          timestamp: Date.now(),
          diagnosticReport: report,
        },
      ],
    })

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={onQuickAnalysis}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    ;(lastChatThreadProps?.onSuggestedMethodSelect as ((reportArg: unknown, suggestion: unknown) => void) | undefined)?.(
      report,
      {
        methodId: 'paired-t',
        methodName: 'Paired t-test',
        koreanName: '대응표본 t-검정',
        reason: '반복측정 구조에 더 가깝습니다.',
        badge: 'recommended',
      },
    )

    expect(bridgeDiagnosticToSmartFlow).toHaveBeenCalledWith(
      expect.objectContaining({ pendingClarification: null }),
      expect.objectContaining({
        method: expect.objectContaining({ id: 'paired-t' }),
        variableAssignments: { dependent: ['time1'] },
      }),
    )
    expect(onQuickAnalysis).not.toHaveBeenCalled()
  })

  it('passes failed prompts into ChatInput prefill props after classification errors', async () => {
    vi.mocked(intentRouter.classify).mockRejectedValueOnce(new Error('classification failed'))

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    fireEvent.click(screen.getByTestId('chat-input-submit'))

    await waitFor(() => {
      expect(lastChatInputProps?.prefillValue).toBe('follow-up question')
    })
    expect(lastChatInputProps?.submitValue).toBeUndefined()
  })

  it('preserves direct assignments when retrying a clarification resume flow', async () => {
    const directAssignments = { dependent: ['outcome'], factor: ['group'] }

    analysisStoreState.uploadNonce = 0
    analysisStoreState.uploadedData = [{ outcome: 1, group: 'A' }]
    useHubChatStore.setState({
      dataContext: {
        fileName: 'resume.csv',
        totalRows: 10,
        columnCount: 2,
        numericColumns: ['outcome'],
        categoricalColumns: ['group'],
        validationResults: { isValid: true, totalRows: 10, columnCount: 2, missingValues: 0, dataType: 'tabular', variables: [], errors: [], warnings: [] } as never,
      },
      messages: [
        {
          id: 'assistant-clarification',
          role: 'assistant',
          content: 'clarification',
          timestamp: Date.now(),
          diagnosticReport: {
            uploadNonce: 0,
            originUserMessage: 'compare groups',
            basicStats: {
              totalRows: 10,
              groups: [],
              numericSummaries: [],
            },
            pendingClarification: {
              missingRoles: ['factor'],
              candidateColumns: [],
            },
          } as never,
        },
        {
          id: 'user-with-assignments',
          role: 'user',
          content: 'compare outcome by group',
          timestamp: Date.now(),
          directAssignments,
        },
        {
          id: 'assistant-error',
          role: 'assistant',
          content: 'resume failed',
          timestamp: Date.now(),
          isError: true,
        },
      ],
    })

    vi.mocked(getHubDiagnosticResumeResponse).mockResolvedValueOnce({
      content: 'resumed',
      diagnosticReport: {
        uploadNonce: 0,
        originUserMessage: 'compare groups',
        basicStats: {
          totalRows: 10,
          groups: [],
          numericSummaries: [],
        },
        pendingClarification: null,
      } as never,
      recommendation: null,
    })

    render(
      <ChatCentricHub
        onIntentResolved={vi.fn()}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    ;(lastChatThreadProps?.onRetry as ((messageId: string) => void) | undefined)?.('assistant-error')

    await waitFor(() => {
      expect(getHubDiagnosticResumeResponse).toHaveBeenCalled()
    })

    expect(vi.mocked(getHubDiagnosticResumeResponse).mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        directAssignments,
      }),
    )
  })

  it('ignores late responses after the user clears the chat', async () => {
    const onIntentResolved = vi.fn()
    let resolveClassify: ((value: unknown) => void) | undefined

    vi.mocked(intentRouter.classify).mockImplementationOnce(
      () =>
        new Promise<{
          track: string
          confidence: number
          method: { id: string; name: string; category: string }
          reasoning: string
          needsData: boolean
          provider: string
        }>((resolve) => {
          resolveClassify = resolve as (value: unknown) => void
        }) as ReturnType<typeof intentRouter.classify>,
    )

    render(
      <ChatCentricHub
        onIntentResolved={onIntentResolved}
        onQuickAnalysis={vi.fn()}
        onHistorySelect={vi.fn()}
        onHistoryDelete={vi.fn(async () => {})}
      />
    )

    fireEvent.click(screen.getByTestId('chat-input-submit'))

    expect(useHubChatStore.getState().messages).toHaveLength(1)

    ;(lastChatThreadProps?.onClearChat as (() => void) | undefined)?.()

    if (typeof resolveClassify !== 'function') {
      throw new Error('resolveClassify was not set')
    }
    const finishClassify = resolveClassify

    await act(async () => {
      finishClassify({
        track: 'direct-analysis',
        confidence: 1,
        method: { id: 'two-sample-t', name: 'Two-Sample t-test', category: 't-test' },
        reasoning: '',
        needsData: false,
        provider: 'keyword',
      })
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(useHubChatStore.getState().messages).toHaveLength(0)
    expect(useHubChatStore.getState().isStreaming).toBe(false)
    expect(onIntentResolved).not.toHaveBeenCalled()
  })

})
