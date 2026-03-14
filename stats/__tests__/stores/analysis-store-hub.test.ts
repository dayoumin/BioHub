/**
 * Smart Flow Store - Hub & InputMode 테스트
 *
 * 테스트 시나리오:
 * 1. purposeInputMode 초기값 및 setter
 * 2. Hub 핸들러 시뮬레이션 (AI vs Browse)
 * 3. resetMode가 purposeInputMode를 리셋하는지
 * 4. 빠른 분석 모드 + 재분석 모드 조합
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'

describe('Smart Flow Store - Hub & InputMode', () => {
  beforeEach(() => {
    // 각 테스트 전에 store 리셋
    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
    })
  })

  // ===== 시나리오 1: purposeInputMode 기본 동작 =====
  describe('purposeInputMode 기본 동작', () => {
    it('초기값은 "ai"이다', () => {
      const state = useModeStore.getState()
      expect(state.purposeInputMode).toBe('ai')
    })

    it('setPurposeInputMode로 "browse"로 변경할 수 있다', () => {
      act(() => {
        useModeStore.getState().setPurposeInputMode('browse')
      })

      expect(useModeStore.getState().purposeInputMode).toBe('browse')
    })

    it('setPurposeInputMode로 다시 "ai"로 변경할 수 있다', () => {
      act(() => {
        useModeStore.getState().setPurposeInputMode('browse')
        useModeStore.getState().setPurposeInputMode('ai')
      })

      expect(useModeStore.getState().purposeInputMode).toBe('ai')
    })
  })

  // ===== 시나리오 2: Hub 핸들러 시뮬레이션 =====
  describe('Hub 핸들러 시뮬레이션', () => {
    it('handleStartWithAI: showHub=false, purposeInputMode="ai", step=2', () => {
      act(() => {
        const mode = useModeStore.getState()
        const store = useAnalysisStore.getState()
        mode.setShowHub(false)
        mode.setStepTrack('normal')
        mode.setPurposeInputMode('ai')
        store.addCompletedStep(1)
        store.setCurrentStep(2)
      })

      const mode = useModeStore.getState()
      const store = useAnalysisStore.getState()
      expect(mode.showHub).toBe(false)
      expect(mode.purposeInputMode).toBe('ai')
      expect(store.currentStep).toBe(2)
    })

    it('handleStartWithMethod: showHub=false, purposeInputMode="browse", step=2', () => {
      act(() => {
        const mode = useModeStore.getState()
        const store = useAnalysisStore.getState()
        mode.setShowHub(false)
        mode.setStepTrack('normal')
        mode.setPurposeInputMode('browse')
        store.addCompletedStep(1)
        store.setCurrentStep(2)
      })

      const mode = useModeStore.getState()
      const store = useAnalysisStore.getState()
      expect(mode.showHub).toBe(false)
      expect(mode.purposeInputMode).toBe('browse')
      expect(store.currentStep).toBe(2)
    })

    it('handleStartWithData: showHub=false, step=1, stepTrack=normal', () => {
      act(() => {
        const mode = useModeStore.getState()
        const store = useAnalysisStore.getState()
        mode.setShowHub(false)
        mode.setStepTrack('normal')
        store.navigateToStep(1)
      })

      const mode = useModeStore.getState()
      const store = useAnalysisStore.getState()
      expect(mode.showHub).toBe(false)
      expect(mode.stepTrack).toBe('normal')
      expect(store.currentStep).toBe(1)
    })

    it('handleQuickAnalysis: stepTrack=quick, selectedMethod 설정, step=1', () => {
      const mockMethod = {
        id: 't-test',
        name: 't-검정',
        category: 't-test' as const,
        description: '두 그룹 평균 비교'
      }

      act(() => {
        const mode = useModeStore.getState()
        const store = useAnalysisStore.getState()
        store.setSelectedMethod(mockMethod)
        mode.setStepTrack('quick')
        mode.setShowHub(false)
        store.navigateToStep(1)
      })

      const mode = useModeStore.getState()
      const store = useAnalysisStore.getState()
      expect(mode.showHub).toBe(false)
      expect(mode.stepTrack).toBe('quick')
      expect(store.selectedMethod?.id).toBe('t-test')
      expect(store.currentStep).toBe(1)
    })
  })

  // ===== 시나리오 3: resetMode 테스트 =====
  describe('resetMode', () => {
    it('resetMode가 purposeInputMode를 "ai"로 리셋한다', () => {
      act(() => {
        useModeStore.getState().setPurposeInputMode('browse')
      })
      expect(useModeStore.getState().purposeInputMode).toBe('browse')

      act(() => {
        useModeStore.getState().resetMode()
      })

      expect(useModeStore.getState().purposeInputMode).toBe('ai')
    })

    it('resetMode가 showHub를 true로 리셋한다', () => {
      act(() => {
        useModeStore.getState().setShowHub(false)
        useModeStore.getState().resetMode()
      })

      expect(useModeStore.getState().showHub).toBe(true)
    })

    it('resetMode가 stepTrack을 normal로 리셋한다 (quick)', () => {
      act(() => {
        useModeStore.getState().setStepTrack('quick')
        useModeStore.getState().resetMode()
      })

      expect(useModeStore.getState().stepTrack).toBe('normal')
    })

    it('resetMode가 stepTrack을 normal로 리셋한다 (reanalysis)', () => {
      act(() => {
        useModeStore.getState().setStepTrack('reanalysis')
        useModeStore.getState().resetMode()
      })

      expect(useModeStore.getState().stepTrack).toBe('normal')
    })
  })

  // ===== 시나리오 4: 재분석 모드 =====
  describe('재분석 모드', () => {
    it('handleReanalyze 시뮬레이션: stepTrack=reanalysis, step=1, data 초기화', () => {
      act(() => {
        const store = useAnalysisStore.getState()
        store.setUploadedData([{ id: 1, value: 10 }])
        store.setResults({ method: 't-test', pValue: 0.05 } as never)
        store.setCurrentStep(4)
      })

      act(() => {
        const store = useAnalysisStore.getState()
        store.setUploadedData(null)
        store.setUploadedFile(null)
        store.setValidationResults(null)
        store.setResults(null)
        useModeStore.getState().setStepTrack('reanalysis')
        store.setCurrentStep(1)
      })

      const store = useAnalysisStore.getState()
      expect(useModeStore.getState().stepTrack).toBe('reanalysis')
      expect(store.currentStep).toBe(1)
      expect(store.uploadedData).toBeNull()
      expect(store.results).toBeNull()
    })

    it('재분석 모드에서 selectedMethod는 유지된다', () => {
      const mockMethod = {
        id: 'anova',
        name: 'ANOVA',
        category: 'anova' as const,
        description: '세 그룹 이상 비교'
      }

      act(() => {
        const store = useAnalysisStore.getState()
        store.setSelectedMethod(mockMethod)
        store.setUploadedData([{ id: 1, value: 10 }])
        store.setResults({ method: 'anova', pValue: 0.01 } as never)
      })

      act(() => {
        const store = useAnalysisStore.getState()
        store.setUploadedData(null)
        store.setResults(null)
        useModeStore.getState().setStepTrack('reanalysis')
        store.setCurrentStep(1)
      })

      const state = useAnalysisStore.getState()
      expect(state.selectedMethod?.id).toBe('anova')
      expect(state.selectedMethod?.name).toBe('ANOVA')
    })
  })

  // ===== 시나리오 5: 빠른 분석 후 Step 건너뛰기 =====
  describe('빠른 분석 Step 건너뛰기', () => {
    it('stepTrack=quick이면 Step 1 → Step 3 이동 가능', () => {
      const mockMethod = {
        id: 'correlation',
        name: '상관분석',
        category: 'correlation' as const,
        description: '변수 간 관계'
      }

      act(() => {
        const store = useAnalysisStore.getState()
        store.setSelectedMethod(mockMethod)
        useModeStore.getState().setStepTrack('quick')
        store.setCurrentStep(1)
        store.addCompletedStep(1)
        store.addCompletedStep(2) // U1-1: 전진 점프 전 중간 단계 마킹 필요
      })

      act(() => {
        useAnalysisStore.getState().navigateToStep(3)
      })

      const store = useAnalysisStore.getState()
      expect(useModeStore.getState().stepTrack).toBe('quick')
      expect(store.selectedMethod?.id).toBe('correlation')
    })
  })
})
