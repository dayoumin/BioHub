import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { useAnalysisHandlers } from '@/hooks/use-analysis-handlers'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { TerminologyProvider } from '@/lib/terminology/terminology-context'

// TerminologyProvider wrapper
function wrapper({ children }: { children: ReactNode }): ReactNode {
  return createElement(TerminologyProvider, { initialDomain: 'generic' }, children)
}

beforeEach(() => {
  useAnalysisStore.getState().resetSession()
  useModeStore.getState().setStepTrack('normal')
})

describe('useAnalysisHandlers', () => {
  describe('초기 상태', () => {
    it('currentStep=1, isLoading=false, steps 4개 반환', () => {
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })
      expect(result.current.currentStep).toBe(1)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.steps).toHaveLength(4)
    })

    it('Hub 표시 중이면 canProceedWithFloatingNav=false', () => {
      const { result } = renderHook(() => useAnalysisHandlers(true), { wrapper })
      expect(result.current.canProceedWithFloatingNav).toBe(false)
    })
  })

  describe('startQuickAnalysis', () => {
    it('유효한 methodId → stepTrack=quick, true 반환', () => {
      const methodIds = Object.keys(STATISTICAL_METHODS)
      const validId = methodIds[0]

      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })

      let ok = false
      act(() => { ok = result.current.startQuickAnalysis(validId) })
      expect(ok).toBe(true)
      expect(useModeStore.getState().stepTrack).toBe('quick')
    })

    it('잘못된 methodId → false 반환, 상태 변경 없음', () => {
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })

      let ok = true
      act(() => { ok = result.current.startQuickAnalysis('nonexistent-method') })
      expect(ok).toBe(false)
      expect(useModeStore.getState().stepTrack).toBe('normal')
    })
  })

  describe('steps 구성', () => {
    it('normal 모드: 4개 step, 모두 completed=false, skipped=false', () => {
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })
      expect(result.current.steps.every(s => !s.completed)).toBe(true)
      expect(result.current.steps.every(s => !s.skipped)).toBe(true)
    })

    it('quick 모드: Step 2가 skipped=true + completed=true', () => {
      act(() => { useModeStore.getState().setStepTrack('quick') })
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })

      const step2 = result.current.steps.find(s => s.id === 2)
      expect(step2?.skipped).toBe(true)
      expect(step2?.completed).toBe(true)
    })
  })

  describe('handleStepClick', () => {
    it('완료되지 않은 step 클릭 시 이동 안 함', () => {
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })

      act(() => { result.current.handleStepClick(3) })
      expect(result.current.currentStep).toBe(1)
    })
  })

  describe('floatingNav', () => {
    it('Step 4 + 결과 있으면 canProceedWithFloatingNav=false', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.navigateToStep(4)
        store.setResults({ testName: 'test', pValue: 0.05 })
      })

      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })
      expect(result.current.canProceedWithFloatingNav).toBe(false)
    })

    it('nextStepLabel은 문자열 반환', () => {
      const { result } = renderHook(() => useAnalysisHandlers(false), { wrapper })
      expect(typeof result.current.nextStepLabel).toBe('string')
      expect(result.current.nextStepLabel.length).toBeGreaterThan(0)
    })
  })
})
