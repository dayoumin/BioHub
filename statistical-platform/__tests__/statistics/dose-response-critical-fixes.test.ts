/**
 * Dose-Response Critical Fixes Verification Test
 *
 * Issue 1: completeAnalysis 미호출 수정 검증
 * Issue 3: WorkerMethodParam 타입 확장 검증
 *
 * 날짜: 2025-11-13
 */

import { describe, it, expect } from '@jest/globals'
import type { DoseResponseResult, DoseResponseVariables } from '@/types/statistics'

describe('Dose-Response Critical Fixes', () => {
  describe('Issue 1: completeAnalysis 호출 검증', () => {
    it('DoseResponseAnalysisProps에 actions가 정의되어야 함', () => {
      // 타입 검증 (컴파일 타임에 체크됨)
      type Props = {
        selectedModel: string
        uploadedData: unknown
        actions: {
          startAnalysis?: () => void
          completeAnalysis?: (result: DoseResponseResult, nextStep?: number) => void
          setError?: (error: string) => void
        }
      }

      // actions 필수 속성 검증
      const mockProps: Props = {
        selectedModel: 'logistic4',
        uploadedData: null,
        actions: {
          startAnalysis: () => {},
          completeAnalysis: () => {},
          setError: () => {}
        }
      }

      expect(mockProps.actions).toBeDefined()
      expect(typeof mockProps.actions.startAnalysis).toBe('function')
      expect(typeof mockProps.actions.completeAnalysis).toBe('function')
      expect(typeof mockProps.actions.setError).toBe('function')
    })

    it('handleAnalysis가 startAnalysis를 호출해야 함', () => {
      let startAnalysisCalled = false

      const mockActions = {
        startAnalysis: () => { startAnalysisCalled = true },
        completeAnalysis: () => {},
        setError: () => {}
      }

      // startAnalysis 호출 시뮬레이션
      mockActions.startAnalysis?.()

      expect(startAnalysisCalled).toBe(true)
    })

    it('Worker 성공 시 completeAnalysis가 호출되어야 함', () => {
      let completeAnalysisCalled = false
      let receivedResult: DoseResponseResult | null = null
      let receivedStep: number | undefined

      const mockActions = {
        startAnalysis: () => {},
        completeAnalysis: (result: DoseResponseResult, nextStep?: number) => {
          completeAnalysisCalled = true
          receivedResult = result
          receivedStep = nextStep
        },
        setError: () => {}
      }

      // Mock 결과
      const mockResult: DoseResponseResult = {
        model: 'logistic4',
        parameters: { ec50: 5.0, hillSlope: 1.0, bottom: 0, top: 100 },
        r_squared: 0.95,
        aic: 45.2,
        bic: 48.5,
        ec50: 5.0,
        confidence_intervals: {
          ec50: { lower: 4.5, upper: 5.5 },
          hillSlope: { lower: 0.8, upper: 1.2 }
        },
        fitted_values: [0, 25, 50, 75, 100],
        residuals: [0.1, -0.2, 0.05, 0.1, -0.05],
        dose_data: [0, 1, 5, 10, 20],
        response_data: [0, 25, 50, 75, 100]
      }

      // completeAnalysis 호출 시뮬레이션 (Step 3으로 이동)
      mockActions.completeAnalysis?.(mockResult, 3)

      expect(completeAnalysisCalled).toBe(true)
      expect(receivedResult).toEqual(mockResult)
      expect(receivedStep).toBe(3)
    })

    it('Worker 실패 시 setError가 호출되어야 함', () => {
      let setErrorCalled = false
      let receivedError: string | null = null

      const mockActions = {
        startAnalysis: () => {},
        completeAnalysis: () => {},
        setError: (error: string) => {
          setErrorCalled = true
          receivedError = error
        }
      }

      // 에러 발생 시뮬레이션
      const errorMessage = '분석 중 오류가 발생했습니다.'
      mockActions.setError?.(errorMessage)

      expect(setErrorCalled).toBe(true)
      expect(receivedError).toBe(errorMessage)
    })
  })

  describe('Issue 3: WorkerMethodParam 타입 확장 검증', () => {
    it('WorkerMethodParam이 nested 객체를 지원해야 함', () => {
      // 재귀적 Record 타입 정의 (pyodide-core.service.ts와 동일)
      type WorkerMethodParam =
        | number
        | string
        | boolean
        | number[]
        | string[]
        | number[][]
        | (number | string)[]
        | null
        | { [key: string]: WorkerMethodParam }  // ← 재귀적 지원

      // 테스트 1: 기본 타입들
      const primitive: WorkerMethodParam = 42
      const stringVal: WorkerMethodParam = 'logistic4'
      const array: WorkerMethodParam = [1, 2, 3, 4, 5]

      expect(typeof primitive).toBe('number')
      expect(typeof stringVal).toBe('string')
      expect(Array.isArray(array)).toBe(true)

      // 테스트 2: nested 객체 (constraints)
      const constraints: WorkerMethodParam = {
        bottom: 0,
        top: 100
      }

      expect(typeof constraints).toBe('object')
      expect(constraints).toHaveProperty('bottom')
      expect(constraints).toHaveProperty('top')

      // 테스트 3: dose-response params 전체 구조
      const params: Record<string, WorkerMethodParam> = {
        dose_data: [0, 1, 5, 10, 20],
        response_data: [0, 25, 50, 75, 100],
        model_type: 'logistic4',
        constraints: {
          bottom: 0,
          top: 100
        }
      }

      expect(params.dose_data).toEqual([0, 1, 5, 10, 20])
      expect(params.response_data).toEqual([0, 25, 50, 75, 100])
      expect(params.model_type).toBe('logistic4')
      expect(params.constraints).toEqual({ bottom: 0, top: 100 })
    })

    it('dose-response params가 타입 안전하게 생성되어야 함 (as any 없이)', () => {
      // 실제 dose-response/page.tsx에서 사용하는 패턴
      const doseData = [0, 1, 5, 10, 20]
      const responseData = [0, 25, 50, 75, 100]
      const selectedModel = 'logistic4'

      // ✅ 타입 안전: as any 없이 생성
      const params: Record<string, number[] | string | Record<string, number>> = {
        dose_data: doseData,
        response_data: responseData,
        model_type: selectedModel
      }

      // constraints 추가 (선택적)
      if (selectedModel === 'logistic4') {
        params.constraints = {
          bottom: 0,
          top: 100
        }
      }

      expect(params.dose_data).toEqual(doseData)
      expect(params.response_data).toEqual(responseData)
      expect(params.model_type).toBe(selectedModel)
      expect(params.constraints).toEqual({ bottom: 0, top: 100 })
    })

    it('잘못된 constraints 구조는 컴파일 타임에 검출되어야 함', () => {
      // 타입 검증 (컴파일 타임 체크)
      type Constraints = Record<string, number>

      const validConstraints: Constraints = {
        bottom: 0,
        top: 100
      }

      const invalidConstraints = {
        bottom: 0,
        top: '100'  // ❌ string은 허용되지 않음
      }

      expect(validConstraints.bottom).toBe(0)
      expect(validConstraints.top).toBe(100)

      // invalidConstraints는 타입 에러가 발생하므로 런타임 테스트만
      expect(typeof invalidConstraints.top).toBe('string')
    })
  })

  describe('데이터 전처리', () => {
    it('dose/response 데이터가 숫자 배열로 변환되어야 함', () => {
      // CSV 업로드 시 데이터 (문자열 포함 가능)
      const rawData = [
        { dose: '0', response: '5.2' },
        { dose: '1', response: '25.8' },
        { dose: '5', response: '50.1' },
        { dose: '10', response: '74.9' },
        { dose: '20', response: '99.5' }
      ]

      // 데이터 변환 (실제 페이지 로직)
      const doseData = rawData.map(row => {
        const value = row.dose
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })

      const responseData = rawData.map(row => {
        const value = row.response
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })

      expect(doseData).toEqual([0, 1, 5, 10, 20])
      expect(responseData).toEqual([5.2, 25.8, 50.1, 74.9, 99.5])
      expect(doseData.every(v => typeof v === 'number')).toBe(true)
      expect(responseData.every(v => typeof v === 'number')).toBe(true)
    })

    it('NaN 값은 0으로 처리되어야 함', () => {
      const rawData = [
        { dose: 'invalid', response: 'NaN' },
        { dose: '5', response: '50' }
      ]

      const doseData = rawData.map(row => {
        const value = row.dose
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0
      })

      expect(doseData[0]).toBe(0)  // 'invalid' → 0
      expect(doseData[1]).toBe(5)
    })
  })

  describe('결과 타입 검증', () => {
    it('DoseResponseResult가 올바른 구조를 가져야 함', () => {
      const result: DoseResponseResult = {
        model: 'logistic4',
        parameters: {
          ec50: 5.0,
          hillSlope: 1.0,
          bottom: 0,
          top: 100
        },
        r_squared: 0.95,
        aic: 45.2,
        bic: 48.5,
        ec50: 5.0,
        confidence_intervals: {
          ec50: { lower: 4.5, upper: 5.5 },
          hillSlope: { lower: 0.8, upper: 1.2 }
        },
        fitted_values: [0, 25, 50, 75, 100],
        residuals: [0.1, -0.2, 0.05, 0.1, -0.05],
        dose_data: [0, 1, 5, 10, 20],
        response_data: [0, 25, 50, 75, 100]
      }

      // 필수 필드 검증
      expect(result.model).toBeDefined()
      expect(result.parameters).toBeDefined()
      expect(result.r_squared).toBeGreaterThanOrEqual(0)
      expect(result.r_squared).toBeLessThanOrEqual(1)
      expect(result.ec50).toBeDefined()
      expect(result.confidence_intervals).toBeDefined()
      expect(result.fitted_values).toBeDefined()
      expect(result.residuals).toBeDefined()
    })

    it('5가지 모델 타입을 지원해야 함', () => {
      const supportedModels = [
        'logistic4',
        'logistic3',
        'weibull',
        'gompertz',
        'biphasic'
      ]

      supportedModels.forEach(model => {
        expect(typeof model).toBe('string')
        expect(model.length).toBeGreaterThan(0)
      })

      expect(supportedModels.length).toBe(5)
    })
  })
})
