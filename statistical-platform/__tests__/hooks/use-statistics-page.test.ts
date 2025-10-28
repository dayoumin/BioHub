/**
 * Test: useStatisticsPage Custom Hook
 *
 * 통계 페이지 공통 상태 관리 훅 테스트
 */

import { renderHook, act } from '@testing-library/react'
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// Test types
interface MockResults {
  mean: number
  std: number
  count: number
}

describe('useStatisticsPage', () => {
  describe('기본 동작', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      expect(result.current.state.currentStep).toBe(0)
      expect(result.current.state.variableMapping).toEqual({})
      expect(result.current.state.results).toBeNull()
      expect(result.current.state.isAnalyzing).toBe(false)
    })

    it('should initialize with custom initialStep', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ initialStep: 2 })
      )

      expect(result.current.state.currentStep).toBe(2)
    })
  })

  describe('currentStep 관리', () => {
    it('should update currentStep', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      act(() => {
        result.current.actions.setCurrentStep(2)
      })

      expect(result.current.state.currentStep).toBe(2)
    })

    it('should increment step with nextStep()', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      act(() => {
        result.current.actions.nextStep()
      })

      expect(result.current.state.currentStep).toBe(1)

      act(() => {
        result.current.actions.nextStep()
      })

      expect(result.current.state.currentStep).toBe(2)
    })

    it('should decrement step with prevStep()', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ initialStep: 2 })
      )

      act(() => {
        result.current.actions.prevStep()
      })

      expect(result.current.state.currentStep).toBe(1)
    })

    it('should not go below 0 with prevStep()', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      act(() => {
        result.current.actions.prevStep()
      })

      expect(result.current.state.currentStep).toBe(0)
    })
  })

  describe('variableMapping 관리', () => {
    it('should update variableMapping', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      const mapping = { column1: 'value1', column2: 'value2' }

      act(() => {
        result.current.actions.updateVariableMapping(mapping)
      })

      expect(result.current.state.variableMapping).toEqual(mapping)
    })

    it('should overwrite existing variableMapping', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      act(() => {
        result.current.actions.updateVariableMapping({ col1: 'val1' })
      })

      act(() => {
        result.current.actions.updateVariableMapping({ col2: 'val2' })
      })

      expect(result.current.state.variableMapping).toEqual({ col2: 'val2' })
    })
  })

  describe('분석 상태 관리', () => {
    it('should start analysis', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withError: true })
      )

      act(() => {
        result.current.actions.startAnalysis()
      })

      expect(result.current.state.isAnalyzing).toBe(true)
      expect(result.current.state.error).toBeNull()
    })

    it('should set results', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      const mockResults: MockResults = { mean: 10, std: 2, count: 100 }

      act(() => {
        result.current.actions.setResults(mockResults)
      })

      expect(result.current.state.results).toEqual(mockResults)
    })

    it('should complete analysis', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      const mockResults: MockResults = { mean: 10, std: 2, count: 100 }

      act(() => {
        result.current.actions.startAnalysis()
      })

      act(() => {
        result.current.actions.completeAnalysis(mockResults, 3)
      })

      expect(result.current.state.results).toEqual(mockResults)
      expect(result.current.state.isAnalyzing).toBe(false)
      expect(result.current.state.currentStep).toBe(3)
    })

    it('should complete analysis without step change', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      const mockResults: MockResults = { mean: 10, std: 2, count: 100 }

      act(() => {
        result.current.actions.completeAnalysis(mockResults)
      })

      expect(result.current.state.results).toEqual(mockResults)
      expect(result.current.state.isAnalyzing).toBe(false)
      expect(result.current.state.currentStep).toBe(0) // unchanged
    })
  })

  describe('에러 관리', () => {
    it('should set error when withError is true', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withError: true })
      )

      act(() => {
        result.current.actions.setError('Test error message')
      })

      expect(result.current.state.error).toBe('Test error message')
      expect(result.current.state.isAnalyzing).toBe(false)
    })

    it('should not have error state when withError is false', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      expect(result.current.state.error).toBeUndefined()
    })

    it('should clear error on startAnalysis', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withError: true })
      )

      act(() => {
        result.current.actions.setError('Test error')
      })

      act(() => {
        result.current.actions.startAnalysis()
      })

      expect(result.current.state.error).toBeNull()
    })
  })

  describe('UploadedData 관리 (Pattern A)', () => {
    it('should have uploadedData when withUploadedData is true', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withUploadedData: true })
      )

      expect(result.current.state.uploadedData).toBeNull()
      expect(result.current.state.selectedVariables).toBeNull()
      expect(result.current.actions.setUploadedData).toBeDefined()
      expect(result.current.actions.setSelectedVariables).toBeDefined()
    })

    it('should not have uploadedData when withUploadedData is false', () => {
      const { result } = renderHook(() => useStatisticsPage<MockResults>())

      expect(result.current.state.uploadedData).toBeUndefined()
      expect(result.current.state.selectedVariables).toBeUndefined()
      expect(result.current.actions.setUploadedData).toBeUndefined()
      expect(result.current.actions.setSelectedVariables).toBeUndefined()
    })

    it('should set uploadedData', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withUploadedData: true })
      )

      const mockData = {
        data: [{ col1: 1, col2: 2 }],
        fileName: 'test.csv',
        columns: ['col1', 'col2']
      }

      act(() => {
        result.current.actions.setUploadedData?.(mockData)
      })

      expect(result.current.state.uploadedData).toEqual(mockData)
    })

    it('should set selectedVariables', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withUploadedData: true })
      )

      const mockVars = { independent: 'col1', dependent: 'col2' }

      act(() => {
        result.current.actions.setSelectedVariables?.(mockVars)
      })

      expect(result.current.state.selectedVariables).toEqual(mockVars)
    })
  })

  describe('reset 기능', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({
          withUploadedData: true,
          withError: true,
          initialStep: 2
        })
      )

      // Set various states
      act(() => {
        result.current.actions.setCurrentStep(3)
        result.current.actions.updateVariableMapping({ col: 'val' })
        result.current.actions.setResults({ mean: 10, std: 2, count: 100 })
        result.current.actions.setError('Error')
        result.current.actions.setUploadedData?.({
          data: [],
          fileName: 'test.csv',
          columns: []
        })
      })

      // Reset
      act(() => {
        result.current.actions.reset()
      })

      // Check all states are reset
      expect(result.current.state.currentStep).toBe(2) // initialStep
      expect(result.current.state.variableMapping).toEqual({})
      expect(result.current.state.results).toBeNull()
      expect(result.current.state.isAnalyzing).toBe(false)
      expect(result.current.state.error).toBeNull()
      expect(result.current.state.uploadedData).toBeNull()
      expect(result.current.state.selectedVariables).toBeNull()
    })
  })

  describe('타입 안전성', () => {
    it('should maintain type safety with generic TResult', () => {
      interface CustomResult {
        value: string
        timestamp: number
      }

      const { result } = renderHook(() => useStatisticsPage<CustomResult>())

      const customResult: CustomResult = {
        value: 'test',
        timestamp: Date.now()
      }

      act(() => {
        result.current.actions.setResults(customResult)
      })

      // Type check: should be CustomResult, not MockResults
      expect(result.current.state.results?.value).toBe('test')
      expect(typeof result.current.state.results?.timestamp).toBe('number')
    })
  })

  describe('실제 사용 시나리오', () => {
    it('should handle complete analysis workflow', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withError: true })
      )

      // Step 1: Select variables
      act(() => {
        result.current.actions.updateVariableMapping({ var1: 'column1' })
        result.current.actions.nextStep()
      })

      expect(result.current.state.currentStep).toBe(1)
      expect(result.current.state.variableMapping).toEqual({ var1: 'column1' })

      // Step 2: Start analysis
      act(() => {
        result.current.actions.startAnalysis()
      })

      expect(result.current.state.isAnalyzing).toBe(true)

      // Step 3: Complete analysis
      const mockResults: MockResults = { mean: 15.5, std: 3.2, count: 50 }

      act(() => {
        result.current.actions.completeAnalysis(mockResults, 3)
      })

      expect(result.current.state.results).toEqual(mockResults)
      expect(result.current.state.isAnalyzing).toBe(false)
      expect(result.current.state.currentStep).toBe(3)
      expect(result.current.state.error).toBeNull()
    })

    it('should handle error during analysis', () => {
      const { result } = renderHook(() =>
        useStatisticsPage<MockResults>({ withError: true })
      )

      act(() => {
        result.current.actions.startAnalysis()
      })

      act(() => {
        result.current.actions.setError('분석 중 오류가 발생했습니다')
      })

      expect(result.current.state.error).toBe('분석 중 오류가 발생했습니다')
      expect(result.current.state.isAnalyzing).toBe(false)
      expect(result.current.state.results).toBeNull()
    })
  })
})
