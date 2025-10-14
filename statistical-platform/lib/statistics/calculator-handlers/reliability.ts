/**
 * 신뢰도 분석 핸들러
 *
 * Cronbach's α 등 신뢰도 검증 메서드
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow, MethodParameters } from '../calculator-types'

export const createReliabilityHandlers = (context: CalculatorContext): HandlerMap => ({
  cronbachAlpha: (data: DataRow[], parameters: MethodParameters) => cronbachAlpha(context, data, parameters)
})

/**
 * Cronbach's Alpha 신뢰도 분석
 *
 * 척도의 내적 일관성(internal consistency)을 측정합니다.
 * 여러 항목이 동일한 구성 개념을 측정하는지 평가합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터 (행: 응답자, 열: 항목)
 * @param parameters - 분석 파라미터
 * @param parameters.columns - 분석할 항목(문항) 열 이름 배열 (필수, 최소 2개)
 *
 * @returns 신뢰도 분석 결과
 *
 * @example
 * ```typescript
 * // 5개 문항으로 구성된 설문 신뢰도 분석
 * const data = [
 *   { q1: 5, q2: 4, q3: 5, q4: 4, q5: 5 },
 *   { q1: 3, q2: 3, q3: 4, q4: 3, q5: 3 }
 * ]
 *
 * const result = await cronbachAlpha(context, data, {
 *   columns: ['q1', 'q2', 'q3', 'q4', 'q5']
 * })
 * ```
 */
const cronbachAlpha = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { columns } = parameters as CronbachAlphaParams

  if (!columns || !Array.isArray(columns) || columns.length < 2) {
    return {
      success: false,
      error: '최소 2개 이상의 항목(문항) 열을 선택하세요'
    }
  }

  // 각 응답자(행)별로 모든 항목의 값을 배열로 변환
  const itemsMatrix: number[][] = []

  data.forEach(row => {
    const itemValues: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const value = parseFloat(row[col])
      if (isNaN(value)) {
        valid = false
      } else {
        itemValues.push(value)
      }
    })

    if (valid) {
      itemsMatrix.push(itemValues)
    }
  })

  if (itemsMatrix.length < 2) {
    return {
      success: false,
      error: '최소 2명 이상의 응답자가 필요합니다'
    }
  }

  // Pyodide 호출
  const result = await context.pyodideService.cronbachAlpha(itemsMatrix)

  // 신뢰도 해석
  const interpretation = interpretCronbachAlpha(result.alpha)

  // 항목별 통계
  const itemStats = columns.map((col: string, index: number) => {
    const values = itemsMatrix.map(row => row[index])
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1)

    return {
      항목: col,
      평균: mean.toFixed(3),
      분산: variance.toFixed(3),
      항목_총점_상관: result.itemTotalCorrelations
        ? result.itemTotalCorrelations[index].toFixed(3)
        : 'N/A'
    }
  })

  return {
    success: true,
    data: {
      metrics: [
        { name: "Cronbach's α", value: result.alpha.toFixed(4) },
        { name: '항목 수', value: columns.length },
        { name: '응답자 수', value: itemsMatrix.length }
      ],
      tables: [
        {
          name: '신뢰도 통계',
          data: [
            { 항목: "Cronbach's α", 값: result.alpha.toFixed(4) },
            { 항목: '신뢰도 수준', 값: interpretation.level },
            { 항목: '평가', 값: interpretation.assessment },
            { 항목: '분석 항목 수', 값: columns.length },
            { 항목: '유효 응답자 수', 값: itemsMatrix.length }
          ]
        },
        {
          name: '항목별 통계',
          data: itemStats
        }
      ],
      interpretation: `Cronbach's α는 ${result.alpha.toFixed(4)}로 ${interpretation.level} 수준의 신뢰도를 보입니다. ${interpretation.assessment}`
    }
  }
}

/**
 * Cronbach's Alpha 값 해석
 */
const interpretCronbachAlpha = (alpha: number): {
  level: string
  assessment: string
} => {
  if (alpha >= 0.9) {
    return {
      level: '매우 높음 (Excellent)',
      assessment: '척도의 내적 일관성이 매우 우수합니다.'
    }
  } else if (alpha >= 0.8) {
    return {
      level: '높음 (Good)',
      assessment: '척도의 내적 일관성이 양호합니다.'
    }
  } else if (alpha >= 0.7) {
    return {
      level: '수용 가능 (Acceptable)',
      assessment: '척도의 내적 일관성이 수용 가능한 수준입니다.'
    }
  } else if (alpha >= 0.6) {
    return {
      level: '의심스러움 (Questionable)',
      assessment: '척도의 신뢰도가 다소 낮습니다. 항목 검토가 필요할 수 있습니다.'
    }
  } else if (alpha >= 0.5) {
    return {
      level: '낮음 (Poor)',
      assessment: '척도의 신뢰도가 낮습니다. 항목 수정 또는 제거를 고려해야 합니다.'
    }
  } else {
    return {
      level: '매우 낮음 (Unacceptable)',
      assessment: '척도의 신뢰도가 매우 낮습니다. 척도 전체의 재구성이 필요합니다.'
    }
  }
}
