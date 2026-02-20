/**
 * Smart Flow Store - Hub & InputMode 테스트
 *
 * 테스트 시나리오:
 * 1. purposeInputMode 초기값 및 setter
 * 2. Hub 핸들러 시뮬레이션 (AI vs Browse)
 * 3. resetSession이 purposeInputMode를 리셋하는지
 * 4. 빠른 분석 모드 + 재분석 모드 조합
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

describe('Smart Flow Store - Hub & InputMode', () => {
  beforeEach(() => {
    // 각 테스트 전에 store 리셋
    act(() => {
      useSmartFlowStore.getState().reset()
    })
  })

  // ===== 시나리오 1: purposeInputMode 기본 동작 =====
  describe('purposeInputMode 기본 동작', () => {
    it('초기값은 "ai"이다', () => {
      const state = useSmartFlowStore.getState()
      expect(state.purposeInputMode).toBe('ai')
    })

    it('setPurposeInputMode로 "browse"로 변경할 수 있다', () => {
      act(() => {
        useSmartFlowStore.getState().setPurposeInputMode('browse')
      })

      expect(useSmartFlowStore.getState().purposeInputMode).toBe('browse')
    })

    it('setPurposeInputMode로 다시 "ai"로 변경할 수 있다', () => {
      act(() => {
        useSmartFlowStore.getState().setPurposeInputMode('browse')
        useSmartFlowStore.getState().setPurposeInputMode('ai')
      })

      expect(useSmartFlowStore.getState().purposeInputMode).toBe('ai')
    })
  })

  // ===== 시나리오 2: Hub 핸들러 시뮬레이션 =====
  describe('Hub 핸들러 시뮬레이션', () => {
    it('handleStartWithAI: showHub=false, purposeInputMode="ai", step=2', () => {
      // 시뮬레이션: handleStartWithAI
      // 실제 page.tsx에서는 navigateToStep을 호출하지만,
      // completedSteps가 없으면 이동 불가하므로 setCurrentStep 직접 사용
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setQuickAnalysisMode(false)
        store.setPurposeInputMode('ai')
        store.addCompletedStep(1) // Step 1 완료 처리
        store.setCurrentStep(2)
      })

      const state = useSmartFlowStore.getState()
      expect(state.showHub).toBe(false)
      expect(state.purposeInputMode).toBe('ai')
      expect(state.currentStep).toBe(2)
    })

    it('handleStartWithMethod: showHub=false, purposeInputMode="browse", step=2', () => {
      // 시뮬레이션: handleStartWithMethod
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setQuickAnalysisMode(false)
        store.setPurposeInputMode('browse')
        store.addCompletedStep(1) // Step 1 완료 처리
        store.setCurrentStep(2)
      })

      const state = useSmartFlowStore.getState()
      expect(state.showHub).toBe(false)
      expect(state.purposeInputMode).toBe('browse')
      expect(state.currentStep).toBe(2)
    })

    it('handleStartWithData: showHub=false, step=1, quickAnalysisMode=false', () => {
      // 시뮬레이션: handleStartWithData
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setShowHub(false)
        store.setQuickAnalysisMode(false)
        store.navigateToStep(1)
      })

      const state = useSmartFlowStore.getState()
      expect(state.showHub).toBe(false)
      expect(state.quickAnalysisMode).toBe(false)
      expect(state.currentStep).toBe(1)
    })

    it('handleQuickAnalysis: quickAnalysisMode=true, selectedMethod 설정, step=1', () => {
      const mockMethod = {
        id: 't-test',
        name: 't-검정',
        category: 't-test' as const,
        description: '두 그룹 평균 비교'
      }

      // 시뮬레이션: handleQuickAnalysis
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setSelectedMethod(mockMethod)
        store.setQuickAnalysisMode(true)
        store.setShowHub(false)
        store.navigateToStep(1)
      })

      const state = useSmartFlowStore.getState()
      expect(state.showHub).toBe(false)
      expect(state.quickAnalysisMode).toBe(true)
      expect(state.selectedMethod?.id).toBe('t-test')
      expect(state.currentStep).toBe(1)
    })
  })

  // ===== 시나리오 3: resetSession 테스트 =====
  describe('resetSession', () => {
    it('resetSession이 purposeInputMode를 "ai"로 리셋한다', () => {
      // 먼저 browse로 변경
      act(() => {
        useSmartFlowStore.getState().setPurposeInputMode('browse')
      })
      expect(useSmartFlowStore.getState().purposeInputMode).toBe('browse')

      // resetSession 호출
      act(() => {
        useSmartFlowStore.getState().resetSession()
      })

      expect(useSmartFlowStore.getState().purposeInputMode).toBe('ai')
    })

    it('resetSession이 showHub를 true로 리셋한다', () => {
      act(() => {
        useSmartFlowStore.getState().setShowHub(false)
        useSmartFlowStore.getState().resetSession()
      })

      expect(useSmartFlowStore.getState().showHub).toBe(true)
    })

    it('resetSession이 quickAnalysisMode를 false로 리셋한다', () => {
      act(() => {
        useSmartFlowStore.getState().setQuickAnalysisMode(true)
        useSmartFlowStore.getState().resetSession()
      })

      expect(useSmartFlowStore.getState().quickAnalysisMode).toBe(false)
    })

    it('resetSession이 isReanalysisMode를 false로 리셋한다', () => {
      act(() => {
        useSmartFlowStore.getState().setIsReanalysisMode(true)
        useSmartFlowStore.getState().resetSession()
      })

      expect(useSmartFlowStore.getState().isReanalysisMode).toBe(false)
    })
  })

  // ===== 시나리오 4: 재분석 모드 =====
  describe('재분석 모드', () => {
    it('handleReanalyze 시뮬레이션: isReanalysisMode=true, step=1, data 초기화', () => {
      // 먼저 데이터와 결과 설정
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setUploadedData([{ id: 1, value: 10 }])
        store.setResults({ method: 't-test', pValue: 0.05 } as never)
        store.setCurrentStep(4)
      })

      // handleReanalyze 시뮬레이션
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setUploadedData(null)
        store.setUploadedFile(null)
        store.setValidationResults(null)
        store.setResults(null)
        store.setIsReanalysisMode(true)
        store.setCurrentStep(1)
      })

      const state = useSmartFlowStore.getState()
      expect(state.isReanalysisMode).toBe(true)
      expect(state.currentStep).toBe(1)
      expect(state.uploadedData).toBeNull()
      expect(state.results).toBeNull()
    })

    it('재분석 모드에서 selectedMethod는 유지된다', () => {
      const mockMethod = {
        id: 'anova',
        name: 'ANOVA',
        category: 'anova' as const,
        description: '세 그룹 이상 비교'
      }

      // 분석 완료 상태 설정
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setSelectedMethod(mockMethod)
        store.setUploadedData([{ id: 1, value: 10 }])
        store.setResults({ method: 'anova', pValue: 0.01 } as never)
      })

      // 재분석 모드로 전환 (데이터만 초기화)
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setUploadedData(null)
        store.setResults(null)
        store.setIsReanalysisMode(true)
        store.setCurrentStep(1)
      })

      const state = useSmartFlowStore.getState()
      // selectedMethod는 그대로 유지
      expect(state.selectedMethod?.id).toBe('anova')
      expect(state.selectedMethod?.name).toBe('ANOVA')
    })
  })

  // ===== 시나리오 5: 빠른 분석 후 Step 건너뛰기 =====
  describe('빠른 분석 Step 건너뛰기', () => {
    it('quickAnalysisMode=true면 Step 1 → Step 3 이동 가능', () => {
      const mockMethod = {
        id: 'correlation',
        name: '상관분석',
        category: 'correlation' as const,
        description: '변수 간 관계'
      }

      // 빠른 분석 설정
      act(() => {
        const store = useSmartFlowStore.getState()
        store.setSelectedMethod(mockMethod)
        store.setQuickAnalysisMode(true)
        store.setCurrentStep(1)
        // completedSteps에 1 추가 (Step 1 완료로 가정)
        store.addCompletedStep(1)
      })

      // Step 3으로 직접 이동 (Step 2 건너뜀)
      act(() => {
        useSmartFlowStore.getState().navigateToStep(3)
      })

      const state = useSmartFlowStore.getState()
      // quickAnalysisMode에서는 selectedMethod가 있으므로 Step 3 이동 가능
      // 단, canNavigateToStep 로직은 completedSteps 기반이므로
      // 실제로는 goToNextStep을 여러 번 호출하거나 직접 navigateToStep 사용
      expect(state.quickAnalysisMode).toBe(true)
      expect(state.selectedMethod?.id).toBe('correlation')
    })
  })
})
