import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
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
 * Phase 6 완료: PyodideCore 직접 연결
 * - Groups에서 callWorkerMethod<T>() 직접 호출
 * - Facade 패턴 제거로 코드 간결화
 * - Generic 타입으로 타입 안전성 향상
 */
export interface CalculatorContext {
  pyodideCore: PyodideCoreService
}
