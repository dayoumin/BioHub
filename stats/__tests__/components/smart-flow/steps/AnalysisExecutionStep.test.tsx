/**
 * AnalysisExecutionStep 테스트
 *
 * 검증 항목:
 * 1. hasValidMapping: null/빈 객체/빈 문자열/빈 배열 → 분석 미실행
 * 2. hasValidMapping: event/timeVar (AutoConfirm 스타일) → 분석 실행
 * 3. hasValidMapping: dependentVar/groupVar (표준) → 분석 실행
 * 4. hasValidMapping: variables 배열 → 분석 실행
 * 5. 분석 완료 시 onAnalysisComplete 호출 (transformExecutorResult 결과)
 * 6. 분석 완료 2초 후 onNext 자동 호출
 * 7. 언마운트 시 autoNextTimer clearTimeout (메모리 누수 방지)
 * 8. executeMethod 오류 시 에러 Alert 표시
 * 9. uploadedData 없으면 에러 메시지 표시
 */

import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * 타이머 전진 + React 상태 업데이트 플러시를 한 번에 처리하는 헬퍼.
 * vi.runAllTimersAsync()만 사용하면 rejected promise의 catch 블록 내
 * setError()가 act() 없이는 DOM에 반영되지 않는 경우가 있다.
 */
async function runAllTimers() {
  await act(async () => {
    await vi.runAllTimersAsync()
  })
}

async function advanceTimers(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

// ─── vi.hoisted: mock variables used inside vi.mock factories ─────────────────
const {
  mockExecuteMethod,
  mockIsInitialized,
  mockInitialize,
  mockCheckAllAssumptions,
  mockTransform,
  mockSetAssumptionResults,
} = vi.hoisted(() => ({
  mockExecuteMethod: vi.fn(),
  mockIsInitialized: vi.fn(),
  mockInitialize: vi.fn(),
  mockCheckAllAssumptions: vi.fn(),
  mockTransform: vi.fn(),
  mockSetAssumptionResults: vi.fn(),
}))

// ─── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('@/lib/services/executors', () => ({
  StatisticalExecutor: {
    getInstance: () => ({ executeMethod: mockExecuteMethod }),
  },
}))

vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    isInitialized: mockIsInitialized,
    initialize: mockInitialize,
    checkAllAssumptions: mockCheckAllAssumptions,
  },
}))

vi.mock('@/lib/utils/result-transformer', () => ({
  transformExecutorResult: mockTransform,
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/components/smart-flow/common', () => ({
  StepHeader: ({ title }: { title: string }) => (
    <div data-testid="step-header">{title}</div>
  ),
  StatusIndicator: ({ status, title }: { status: string; title: string }) => (
    <div data-testid={`status-${status}`}>{title}</div>
  ),
  CollapsibleSection: ({
    label,
    children,
  }: {
    label: string
    children: React.ReactNode
  }) => (
    <div>
      <span data-testid="log-section-label">{label}</span>
      {children}
    </div>
  ),
}))

// NOTE: terminology 객체는 factory 내에서 한 번만 생성해 안정적인 참조를 유지한다.
// useTerminology()가 매 render마다 새 객체를 반환하면:
//   useMemo(executionStages, [t]) → 매 render 재계산
//   → updateStage/addLog/runAnalysis useCallback 재생성
//   → useEffect([..., runAnalysis]) 재실행 → runAnalysis 재호출 → 무한 루프
vi.mock('@/hooks/use-terminology', () => {
  const terminology = {
    smartFlow: {
      stepTitles: { analysisExecution: '분석 실행' },
      statusMessages: { analysisComplete: '분석 완료' },
      executionStages: {
        prepare:     { label: '환경 준비',    message: '환경 준비 중...' },
        preprocess:  { label: '데이터 전처리', message: '전처리 중...' },
        assumptions: { label: '가정 검정',    message: '가정 검정 중...' },
        analysis:    { label: '분석 실행',    message: '분석 실행 중...' },
        additional:  { label: '추가 계산',    message: '추가 계산 중...' },
        finalize:    { label: '결과 정리',    message: '결과 정리 중...' },
      },
      execution: {
        dataRequired: '데이터가 필요합니다',
        cancelConfirm: '취소하시겠습니까?',
        runningTitle: '분석 중...',
        cancelButton: '취소',
        estimatedTimeRemaining: (n: number) => `${n}초 남음`,
        logSectionLabel: (n: number) => `실행 로그 (${n})`,
        noLogs: '로그 없음',
        unknownError: '알 수 없는 오류',
      },
      executionLogs: {
        locale: 'ko-KR',
        stageStart: (label: string) => `${label} 시작`,
        engineReadyCached: '엔진 준비됨 (캐시)',
        engineLoading: '엔진 로딩 중...',
        engineReady: '엔진 준비 완료',
        dataLoaded: (n: number) => `데이터 ${n}행 로드됨`,
        missingHandled: (n: number) => `결측값 ${n}개 처리됨`,
        normalityTestStart: '정규성 검정 시작',
        assumptionSkipped: '가정 검정 생략',
        methodExecuting: (name: string) => `${name} 실행 중`,
        aiSettingsApplied: (alpha: number) => `alpha=${alpha}`,
        aiPostHoc: (method: string) => `postHoc=${method}`,
        aiAlternative: (type: string) => `alternative=${type}`,
        effectSizeDone: '효과크기 완료',
        confidenceIntervalDone: '신뢰구간 완료',
        analysisDone: '분석 완료',
        totalTime: (time: string) => `총 ${time}초`,
        errorPrefix: (msg: string) => `오류: ${msg}`,
        userCancelled: '사용자 취소',
      },
    },
  }
  return { useTerminology: () => terminology }
})

// ─── Store state ───────────────────────────────────────────────────────────────
type StoreState = {
  uploadedData: { score: number; gender: string }[] | null
  setAssumptionResults: typeof mockSetAssumptionResults
  suggestedSettings: Record<string, unknown> | null
}

function makeStoreState(
  overrides?: Partial<Pick<StoreState, 'uploadedData' | 'suggestedSettings'>>
): StoreState {
  return {
    uploadedData: [
      { score: 5, gender: 'M' },
      { score: 7, gender: 'F' },
      { score: 3, gender: 'M' },
    ],
    setAssumptionResults: mockSetAssumptionResults,
    suggestedSettings: null,
    ...overrides,
  }
}

let storeState: StoreState = makeStoreState()

vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: (selector: (s: StoreState) => unknown) => selector(storeState),
}))

// ─── Import under test ─────────────────────────────────────────────────────────
import { AnalysisExecutionStep } from '@/components/smart-flow/steps/AnalysisExecutionStep'
import type { VariableMapping } from '@/types/smart-flow-navigation'

// ─── Fixtures ──────────────────────────────────────────────────────────────────
const mockMethod = { id: 't-test', name: 't-test (독립표본)', description: '', category: 't-test' } as const

const mockExecutorResult = {
  metadata: { method: 't-test' },
  mainResults: { statistic: 2.5, pvalue: 0.03, df: 30, interpretation: '유의함' },
  additionalInfo: {
    effectSize: { value: 0.5, type: 'cohen-d', interpretation: '중간' },
    confidenceInterval: null,
  },
  visualizationData: null,
}

// ─── Setup / Teardown ─────────────────────────────────────────────────────────
beforeEach(() => {
  vi.useFakeTimers()
  storeState = makeStoreState()
  vi.clearAllMocks()
  // Re-establish defaults after clearAllMocks
  mockIsInitialized.mockReturnValue(true)
  mockInitialize.mockResolvedValue(undefined)
  mockCheckAllAssumptions.mockResolvedValue({
    summary: { canUseParametric: true, testError: false, recommendations: [] },
  })
  mockExecuteMethod.mockResolvedValue(mockExecutorResult)
  mockTransform.mockReturnValue({ method: 't-test', pValue: 0.03 })
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('AnalysisExecutionStep', () => {

  // ===========================================================================
  describe('hasValidMapping — 분석 실행 조건', () => {

    it('variableMapping=null → 분석 미실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={null}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).not.toHaveBeenCalled()
    })

    it('빈 객체 {} → 분석 미실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{} as VariableMapping}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).not.toHaveBeenCalled()
    })

    it('모든 값이 빈 문자열 → 분석 미실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: '', groupVar: '' } as VariableMapping}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).not.toHaveBeenCalled()
    })

    it('빈 배열 값만 → 분석 미실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ variables: [] } as VariableMapping}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).not.toHaveBeenCalled()
    })

    it('dependentVar/groupVar 표준 매핑 → 분석 실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).toHaveBeenCalledTimes(1)
    })

    it('event/timeVar AutoConfirm 스타일 → 분석 실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={{ id: 'kaplan-meier', name: 'Kaplan-Meier', description: '', category: 'survival' }}
          variableMapping={{ event: 'survived', timeVar: 'days' } as VariableMapping}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).toHaveBeenCalledTimes(1)
    })

    it('variables 배열 매핑 → 분석 실행', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ variables: ['x1', 'x2'] } as VariableMapping}
        />
      )
      await runAllTimers()
      expect(mockExecuteMethod).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  describe('분석 완료 흐름', () => {

    it('onAnalysisComplete에 transformExecutorResult 결과 전달', async () => {
      const onAnalysisComplete = vi.fn()
      const transformedMock = { method: 't-test', pValue: 0.03, statistic: 2.5 }
      mockTransform.mockReturnValue(transformedMock)

      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
          onAnalysisComplete={onAnalysisComplete}
        />
      )
      await runAllTimers()

      expect(onAnalysisComplete).toHaveBeenCalledTimes(1)
      expect(onAnalysisComplete).toHaveBeenCalledWith(transformedMock)
    })

    it('onAnalysisComplete 미전달 시에도 분석 정상 완료', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
          // onAnalysisComplete 생략
        />
      )
      await expect(runAllTimers()).resolves.not.toThrow()
      expect(mockExecuteMethod).toHaveBeenCalledTimes(1)
    })

    it('분석 완료 후 2초 뒤 onNext 자동 호출', async () => {
      const onNext = vi.fn()
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
          onNext={onNext}
        />
      )
      await runAllTimers()
      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('분석 완료 시 StatusIndicator success 렌더', async () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      await runAllTimers()
      expect(screen.getByTestId('status-success')).toBeDefined()
    })

    it('분석 완료 전: StatusIndicator 미렌더 + 진행 중 텍스트 표시', () => {
      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      // 타이머 미진행 상태
      expect(screen.queryByTestId('status-success')).toBeNull()
      expect(screen.getByText('분석 중...')).toBeDefined()
    })
  })

  // ===========================================================================
  describe('타이머 정리 (메모리 누수 방지)', () => {

    it('언마운트 시 clearTimeout 호출 → onNext 미호출 확인', async () => {
      const onNext = vi.fn()
      const { unmount } = render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
          onNext={onNext}
        />
      )

      // 분석 완료까지만 진행 (500ms + 300ms 내부 지연), 2000ms 자동이동 타이머는 미실행
      await advanceTimers(1000)

      // 컴포넌트 언마운트 → cleanup에서 clearTimeout 호출
      unmount()

      // 2000ms 타이머가 남아도 onNext 미호출
      await advanceTimers(3000)
      expect(onNext).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  describe('오류 처리', () => {

    it('executeMethod 오류 시 에러 Alert 표시', async () => {
      mockExecuteMethod.mockRejectedValueOnce(new Error('Pyodide 계산 오류'))

      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      await runAllTimers()

      expect(screen.getByText('Pyodide 계산 오류')).toBeDefined()
    })

    it('오류 후 StatusIndicator success 미렌더', async () => {
      mockExecuteMethod.mockRejectedValueOnce(new Error('계산 실패'))

      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      await runAllTimers()

      expect(screen.queryByTestId('status-success')).toBeNull()
    })

    it('uploadedData 없으면 에러 메시지 표시 + 분석 미실행', async () => {
      storeState = makeStoreState({ uploadedData: null })

      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
        />
      )
      await runAllTimers()

      expect(screen.getByText('데이터가 필요합니다')).toBeDefined()
      expect(mockExecuteMethod).not.toHaveBeenCalled()
    })

    it('오류 시 onAnalysisComplete 미호출', async () => {
      mockExecuteMethod.mockRejectedValueOnce(new Error('오류'))
      const onAnalysisComplete = vi.fn()

      render(
        <AnalysisExecutionStep
          selectedMethod={mockMethod}
          variableMapping={{ dependentVar: 'score', groupVar: 'gender' }}
          onAnalysisComplete={onAnalysisComplete}
        />
      )
      await runAllTimers()

      expect(onAnalysisComplete).not.toHaveBeenCalled()
    })
  })
})
