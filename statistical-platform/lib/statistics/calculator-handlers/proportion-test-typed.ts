/**
 * 비율 검정 핸들러
 *
 * 일표본/이표본 비율 검정 메서드
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'
import type { OneSampleProportionTestParams } from '../method-parameter-types'

export const createProportionTestHandlers = (context: CalculatorContext): HandlerMap => ({
  oneSampleProportionTest: (data, parameters) => oneSampleProportionTest(context, data, parameters as OneSampleProportionTestParams)
})
