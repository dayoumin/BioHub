import type { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import type { CalculationResult } from '@/types/statistics/calculation'
import type { CanonicalMethodId } from '@/types/statistics/method-contracts'
import type { DataRow, MethodParameters } from './method-parameter-types'

export type { CalculationResult, CanonicalMethodId, DataRow, MethodParameters }

/**
 * 메서드 핸들러 함수 타입
 *
 * @param data - 분석할 데이터 배열 (각 행은 DataRow 타입)
 * @param parameters - 메서드별 파라미터 (타입 안전성 확보)
 * @returns 계산 결과
 */
export type MethodHandler = (
  data: DataRow[],
  parameters: MethodParameters
) => Promise<CalculationResult>

/**
 * 핸들러 맵 타입
 *
 * 메서드 ID를 키로, 핸들러 함수를 값으로 가지는 객체
 */
export type HandlerMap = Partial<Record<CanonicalMethodId, MethodHandler>>

/**
 * 계산 컨텍스트
 *
 * 핸들러가 사용할 수 있는 서비스들을 포함
 */
export interface CalculatorContext {
  pyodideService: PyodideStatisticsService
}
