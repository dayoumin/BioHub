/**
 * Custom Hook: useStatisticsPage
 *
 * 통계 분석 페이지의 공통 상태 관리 훅
 * - 42개 통계 페이지에서 반복되는 state 관리 로직 통합
 * - 타입 안전성 보장 (Generic TResult, TVariables)
 * - 3가지 패턴 지원: UploadedData, VariableMapping, Hybrid
 *
 * @example Pattern A (UploadedData)
 * ```tsx
 * interface VariableAssignment { dependent: string; independent: string[] }
 *
 * const { state, actions } = useStatisticsPage<TTestResult, VariableAssignment>({
 *   withUploadedData: true,
 *   withError: true
 * })
 *
 * // selectedVariables는 VariableAssignment 타입으로 추론됨
 * ```
 *
 * @example Pattern B (VariableMapping)
 * ```tsx
 * const { state, actions } = useStatisticsPage<DescriptiveResults>({
 *   withUploadedData: false,
 *   withError: false
 * })
 *
 * // variableMapping만 사용
 * ```
 */

import { useState, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

/**
 * 업로드된 데이터 구조 (Pattern A용)
 */
export interface UploadedData {
  data: Record<string, unknown>[]
  fileName: string
  columns: string[]
}

/**
 * 변수 매핑 구조 (Pattern B용)
 */
export interface VariableMapping {
  [key: string]: string | string[] | undefined
}

/**
 * 훅 옵션
 */
export interface UseStatisticsPageOptions {
  /**
   * UploadedData state 포함 여부 (Pattern A)
   * @default false
   */
  withUploadedData?: boolean

  /**
   * Error state 포함 여부
   * @default false
   */
  withError?: boolean

  /**
   * 초기 currentStep 값
   * @default 0
   */
  initialStep?: number
}

/**
 * 훅의 State 타입
 */
export interface StatisticsPageState<TResult = unknown, TVariables = Record<string, unknown>> {
  /** 현재 단계 (0부터 시작) */
  currentStep: number

  /** 변수 매핑 (Pattern B: descriptive, cross-tabulation 등) */
  variableMapping: VariableMapping

  /** 분석 결과 */
  results: TResult | null

  /** 분석 중 여부 */
  isAnalyzing: boolean

  /** 업로드된 데이터 (optional, Pattern A용) */
  uploadedData?: UploadedData | null

  /** 선택된 변수 (optional, Pattern A용) */
  selectedVariables?: TVariables | null

  /** 에러 메시지 (optional) */
  error?: string | null
}

/**
 * 훅의 Actions 타입
 */
export interface StatisticsPageActions<TResult = unknown, TVariables = Record<string, unknown>> {
  /** 현재 단계 설정 */
  setCurrentStep: (step: number) => void

  /** 다음 단계로 이동 */
  nextStep: () => void

  /** 이전 단계로 이동 */
  prevStep: () => void

  /** 변수 매핑 업데이트 */
  updateVariableMapping: (mapping: VariableMapping) => void

  /** 분석 시작 */
  startAnalysis: () => void

  /** 분석 결과 설정 */
  setResults: (results: TResult) => void

  /** 에러 설정 */
  setError: (error: string) => void

  /** 분석 완료 (결과 설정 + 단계 이동) */
  completeAnalysis: (results: TResult, nextStep?: number) => void

  /** 업로드 데이터 설정 (Pattern A용) */
  setUploadedData?: (data: UploadedData | null) => void

  /** 선택 변수 설정 (Pattern A용) */
  setSelectedVariables?: (variables: TVariables | null) => void

  /** 모든 state 초기화 */
  reset: () => void
}

/**
 * 훅 반환 타입
 */
export interface UseStatisticsPageReturn<TResult = unknown, TVariables = Record<string, unknown>> {
  /** 현재 상태 */
  state: StatisticsPageState<TResult, TVariables>

  /** 상태 변경 액션들 */
  actions: StatisticsPageActions<TResult, TVariables>
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * 통계 분석 페이지 상태 관리 훅
 *
 * @template TResult - 분석 결과 타입 (예: TTestResult, DescriptiveResults)
 * @template TVariables - 선택 변수 타입 (예: VariableAssignment, SelectedVariables)
 * @param options - 훅 옵션
 * @returns 상태 및 액션 객체
 */
export function useStatisticsPage<TResult = unknown, TVariables = Record<string, unknown>>(
  options: UseStatisticsPageOptions = {}
): UseStatisticsPageReturn<TResult, TVariables> {
  const {
    withUploadedData = false,
    withError = false,
    initialStep = 0
  } = options

  // ============================================================================
  // Core State (모든 페이지 공통)
  // ============================================================================

  const [currentStep, setCurrentStep] = useState<number>(initialStep)
  const [variableMapping, setVariableMapping] = useState<VariableMapping>({})
  const [results, setResults] = useState<TResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false)

  // ============================================================================
  // Optional State (패턴별 선택적 활성화)
  // ============================================================================

  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null)
  const [selectedVariables, setSelectedVariables] = useState<TVariables | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * 다음 단계로 이동
   */
  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1)
  }, [])

  /**
   * 이전 단계로 이동
   */
  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  /**
   * 변수 매핑 업데이트
   */
  const updateVariableMapping = useCallback((mapping: VariableMapping) => {
    setVariableMapping(mapping)
  }, [])

  /**
   * 분석 시작 (isAnalyzing = true, error 초기화)
   */
  const startAnalysis = useCallback(() => {
    actions.startAnalysis()
    if (withError) {
      actions.setError(null)
    }
  }, [withError])

  /**
   * 에러 설정 (isAnalyzing = false)
   */
  const handleSetError = useCallback((errorMessage: string) => {
    actions.setError(errorMessage)
    setIsAnalyzing(false)
  }, [])

  /**
   * 분석 완료 (결과 설정 + isAnalyzing = false + 단계 이동)
   */
  const completeAnalysis = useCallback((
    results: TResult,
    nextStepNum?: number
  ) => {
    setResults(results)
    setIsAnalyzing(false)
    if (nextStepNum !== undefined) {
      setCurrentStep(nextStepNum)
    }
  }, [])

  /**
   * 모든 state 초기화
   */
  const reset = useCallback(() => {
    setCurrentStep(initialStep)
    setVariableMapping({})
    setResults(null)
    setIsAnalyzing(false)
    actions.setUploadedData(null)
    actions.setSelectedVariables(null)
    actions.setError(null)
  }, [initialStep])

  // ============================================================================
  // Return
  // ============================================================================

  const state: StatisticsPageState<TResult, TVariables> = {
    currentStep,
    variableMapping,
    results,
    isAnalyzing,
    ...(withUploadedData && {
      uploadedData,
      selectedVariables
    }),
    ...(withError && { error })
  }

  const actions: StatisticsPageActions<TResult, TVariables> = {
    setCurrentStep,
    nextStep,
    prevStep,
    updateVariableMapping,
    startAnalysis,
    setResults,
    setError: handleSetError,
    completeAnalysis,
    ...(withUploadedData && {
      setUploadedData,
      setSelectedVariables
    }),
    reset
  }

  return { state, actions }
}

// ============================================================================
// Utility Types (페이지별 커스터마이징용)
// ============================================================================

/**
 * Pattern A: UploadedData 사용 페이지용 설정
 * 예: t-test, anova, regression 등
 */
export type UploadedDataPageOptions = UseStatisticsPageOptions & {
  withUploadedData: true
  withError: true
}

/**
 * Pattern B: VariableMapping 사용 페이지용 설정
 * 예: descriptive, cross-tabulation 등
 */
export type VariableMappingPageOptions = UseStatisticsPageOptions & {
  withUploadedData?: false
  withError?: false
}
