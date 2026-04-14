/**
 * analysis-store + mode-store 통합 테스트
 *
 * 허브 → Step 흐름 시뮬레이션.
 * PurposeInputStep 제거 후 업데이트: purposeInputMode/userQuery 삭제됨.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'

describe('analysis-store + mode-store 통합', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
      useModeStore.getState().resetMode()
    })
  })

  // ===== 시나리오 1: Hub 핸들러 시뮬레이션 =====
  describe('Hub 핸들러 시뮬레이션', () => {
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
      expect(store.selectedMethod?.id).toBe('two-sample-t')
      expect(store.currentStep).toBe(1)
    })
  })

  // ===== 시나리오 2: resetMode 테스트 =====
  describe('resetMode', () => {
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

  // ===== 시나리오 3: 재분석 모드 =====
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
      expect(state.selectedMethod?.id).toBe('one-way-anova')
      expect(state.selectedMethod?.name).toBe('ANOVA')
    })
  })

  // ===== 시나리오 4: 빠른 분석 Step 건너뛰기 =====
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
        store.addCompletedStep(2)
      })

      act(() => {
        useAnalysisStore.getState().navigateToStep(3)
      })

      expect(useAnalysisStore.getState().currentStep).toBe(3)
    })
  })
})
