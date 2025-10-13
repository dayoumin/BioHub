/**
 * 메서드 라우터
 *
 * StatisticalCalculator의 거대한 switch 문을 대체하는
 * 핸들러 디스패치 시스템
 */

import type { CalculationResult } from '@/types/statistics/calculation'
import type { CanonicalMethodId } from '@/types/statistics/method-contracts'
import type { MethodHandler, CalculatorContext, DataRow, MethodParameters } from './calculator-types'
import { createDescriptiveHandlers } from './calculator-handlers/descriptive'
import { createHypothesisHandlers } from './calculator-handlers/hypothesis-tests'
import { createRegressionHandlers } from './calculator-handlers/regression'
import { createNonparametricHandlers } from './calculator-handlers/nonparametric'
import { createAnovaHandlers } from './calculator-handlers/anova'
import { createAdvancedHandlers } from './calculator-handlers/advanced'
import { createReliabilityHandlers } from './calculator-handlers/reliability'
import { createCrosstabHandlers } from './calculator-handlers/crosstab'
import { createProportionTestHandlers } from './calculator-handlers/proportion-test'
import { createNonparametricExtendedHandlers } from './calculator-handlers/nonparametric-extended'
import { createAnovaExtendedHandlers } from './calculator-handlers/anova-extended'
import { createRegressionExtendedHandlers } from './calculator-handlers/regression-extended'
import { createAdvancedExtendedHandlers } from './calculator-handlers/advanced-extended'

/**
 * 메서드 라우터 클래스
 *
 * - 메서드 ID → 핸들러 함수 매핑 관리
 * - 도메인별 핸들러 등록 지원
 * - 알 수 없는 메서드 ID에 대한 에러 처리
 */
export class MethodRouter {
  private handlers: Map<CanonicalMethodId, MethodHandler> = new Map()

  constructor(private context: CalculatorContext) {
    this.registerHandlers()
  }

  /**
   * 도메인별 핸들러 등록
   */
  private registerHandlers(): void {
    const handlerFactories = [
      createDescriptiveHandlers,
      createHypothesisHandlers,
      createRegressionHandlers,
      createNonparametricHandlers,
      createAnovaHandlers,
      createAdvancedHandlers,
      createReliabilityHandlers,
      createProportionTestHandlers,
      createCrosstabHandlers,
      createNonparametricExtendedHandlers,
      createAnovaExtendedHandlers,
      createRegressionExtendedHandlers,
      createAdvancedExtendedHandlers
    ]

    handlerFactories.forEach(factory => {
      const handlers = factory(this.context)
      Object.entries(handlers).forEach(([methodId, handler]) => {
        if (handler) {
          this.handlers.set(methodId as CanonicalMethodId, handler)
        }
      })
    })
  }

  /**
   * 메서드 실행
   *
   * @param methodId - 정규화된 메서드 ID
   * @param data - 분석 데이터
   * @param parameters - 메서드별 파라미터
   * @returns 계산 결과
   */
  async dispatch(
    methodId: CanonicalMethodId,
    data: DataRow[],
    parameters: MethodParameters
  ): Promise<CalculationResult> {
    const handler = this.handlers.get(methodId)

    if (!handler) {
      return {
        success: false,
        error: `지원하지 않는 통계 메서드입니다: ${methodId}`
      }
    }

    try {
      return await handler(data, parameters)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '계산 중 오류 발생'
      }
    }
  }

  /**
   * 지원 메서드 목록 조회
   */
  getSupportedMethods(): CanonicalMethodId[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * 메서드 지원 여부 확인
   */
  supports(methodId: string): boolean {
    return this.handlers.has(methodId as CanonicalMethodId)
  }
}
