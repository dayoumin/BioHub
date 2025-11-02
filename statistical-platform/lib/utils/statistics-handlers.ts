/**
 * 통계 분석 페이지 공통 핸들러 유틸
 *
 * DataUploadStep, VariableSelector 등에서 반복되는 로직을 중앙화
 * Phase 1-3 표준화를 위한 재사용 가능한 헬퍼 함수들
 */

import { useCallback } from 'react'
import type { UploadedData } from '@/hooks/use-statistics-page'

/**
 * 파일 업로드 데이터를 UploadedData 형식으로 변환
 *
 * @param file - 업로드된 파일
 * @param data - 파싱된 데이터 (Record 배열)
 * @returns UploadedData 형식의 객체
 *
 * @example
 * const uploadedData = createUploadedData(file, parsedData)
 */
export const createUploadedData = (
  file: File,
  data: unknown[]
): UploadedData => {
  // 데이터 검증
  if (!Array.isArray(data) || data.length === 0) {
    return {
      data: [],
      fileName: file.name,
      columns: []
    }
  }

  // 첫 번째 행에서 컬럼 추출
  const firstRow = data[0]
  const columns =
    firstRow && typeof firstRow === 'object' && firstRow !== null
      ? Object.keys(firstRow as Record<string, unknown>)
      : []

  return {
    data: data as Record<string, unknown>[],
    fileName: file.name,
    columns
  }
}

/**
 * 데이터 업로드 핸들러 생성 (useCallback 래핑)
 *
 * @param setUploadedData - useStatisticsPage의 setUploadedData 액션
 * @param onUploadSuccess - 업로드 성공 후 실행할 콜백 (e.g., 다음 step으로 이동)
 * @param pageId - 디버깅용 페이지 ID (선택사항)
 * @returns 업로드 핸들러 함수
 *
 * @example
 * const handleDataUpload = createDataUploadHandler(
 *   actions.setUploadedData,
 *   () => actions.setCurrentStep(1),
 *   'frequency-table'
 * )
 */
export const createDataUploadHandler = (
  setUploadedData: ((data: UploadedData) => void) | undefined,
  onUploadSuccess: (data: UploadedData) => void,
  pageId?: string
) => {
  return useCallback(
    (file: File, data: unknown[]) => {
      if (!setUploadedData) {
        console.error(`[${pageId || 'statistics-page'}] setUploadedData not available`)
        return
      }

      const uploadedData = createUploadedData(file, data)

      // 데이터가 비어있는 경우 조기 종료
      if (uploadedData.data.length === 0) {
        console.warn(`[${pageId || 'statistics-page'}] Empty data uploaded`)
        return
      }

      setUploadedData(uploadedData)
      onUploadSuccess(uploadedData)
    },
    [setUploadedData, onUploadSuccess, pageId]
  )
}

/**
 * 변수 선택 핸들러 생성
 *
 * @param setSelectedVariables - useStatisticsPage의 setSelectedVariables 액션
 * @param onVariablesSelected - 변수 선택 후 실행할 콜백 (e.g., 다음 step으로 이동)
 * @param pageId - 디버깅용 페이지 ID (선택사항)
 * @returns 변수 선택 핸들러 함수
 *
 * @example
 * const handleVariablesSelected = createVariableSelectionHandler(
 *   actions.setSelectedVariables,
 *   (variables) => {
 *     if (Object.keys(variables).length > 0) {
 *       actions.setCurrentStep(2)
 *     }
 *   },
 *   'normality-test'
 * )
 */
export const createVariableSelectionHandler = <T = unknown>(
  setSelectedVariables: ((mapping: T) => void) | undefined,
  onVariablesSelected: (mapping: T) => void,
  pageId?: string
) => {
  return useCallback(
    (mapping: T) => {
      if (!mapping || typeof mapping !== 'object') {
        console.warn(`[${pageId || 'statistics-page'}] Invalid variable mapping`, mapping)
        return
      }

      if (!setSelectedVariables) {
        console.error(`[${pageId || 'statistics-page'}] setSelectedVariables not available`)
        return
      }

      setSelectedVariables(mapping)
      onVariablesSelected(mapping)
    },
    [setSelectedVariables, onVariablesSelected, pageId]
  )
}

/**
 * 데이터 업로드 + 변수 선택 전체 플로우 핸들러
 *
 * 더 간단한 인터페이스를 원할 때 사용
 *
 * @example
 * const handlers = createStatisticsPageHandlers(actions, {
 *   onUploadSuccess: () => actions.setCurrentStep(1),
 *   onVariablesSelected: () => actions.setCurrentStep(2)
 * })
 */
export const createStatisticsPageHandlers = (
  actions: {
    setUploadedData?: (data: UploadedData) => void
    setSelectedVariables?: (mapping: unknown) => void
    setCurrentStep?: (step: number) => void
  },
  options: {
    onUploadSuccess?: (data: UploadedData) => void
    onVariablesSelected?: (mapping: unknown) => void
    pageId?: string
  } = {}
) => {
  const { onUploadSuccess, onVariablesSelected, pageId } = options

  return {
    handleDataUpload: createDataUploadHandler(
      actions.setUploadedData,
      onUploadSuccess ?? (() => {}),
      pageId
    ),
    handleVariablesSelected: createVariableSelectionHandler(
      actions.setSelectedVariables,
      onVariablesSelected ?? (() => {}),
      pageId
    )
  }
}

/**
 * 컬럼 데이터를 숫자 배열로 추출 (군집분석, 요인분석 등에 사용)
 *
 * @param data - 업로드된 데이터
 * @param columns - 선택된 컬럼 목록
 * @returns 숫자 배열의 배열 (각 행이 숫자 배열)
 *
 * @example
 * const numericData = extractNumericData(uploadedData.data, selectedVariables)
 * // [[1, 2, 3], [4, 5, 6], ...]
 */
export const extractNumericData = (
  data: Record<string, unknown>[],
  columns: string[]
): number[][] => {
  return data
    .map((row) => {
      return columns
        .map((col) => {
          const value = row[col]
          const num = Number(value)
          return isNaN(num) ? 0 : num
        })
        .filter((v) => !isNaN(v))
    })
    .filter((row) => row.length === columns.length)
}

/**
 * 선택된 변수 검증
 *
 * @param selectedVariables - 선택된 변수들
 * @param minRequired - 최소 필요한 변수 개수 (기본값: 1)
 * @returns 검증 성공 여부
 *
 * @example
 * if (validateVariableSelection(selectedVariables, 2)) {
 *   // 2개 이상의 변수가 선택됨
 * }
 */
export const validateVariableSelection = (
  selectedVariables: unknown,
  minRequired = 1
): boolean => {
  if (!selectedVariables || typeof selectedVariables !== 'object') {
    return false
  }

  const variableArray = Array.isArray(selectedVariables)
    ? selectedVariables
    : Object.keys(selectedVariables as Record<string, unknown>)

  return variableArray.length >= minRequired
}
