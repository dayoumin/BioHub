/**
 * ANOVA 확장 핸들러
 *
 * ANCOVA, 반복측정 ANOVA, 삼원 ANOVA
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow } from '../calculator-types'
import type { ANCOVAParams, RepeatedMeasuresANOVAParams, ThreeWayANOVAParams } from '../method-parameter-types'
import { extractNumericColumn, extractGroupedData, formatPValue, ERROR_MESSAGES } from './common-utils'

export const createAnovaExtendedHandlers = (context: CalculatorContext): HandlerMap => ({
  ancova: (data, parameters) => ancova(context, data, parameters as ANCOVAParams),
  repeatedMeasuresANOVA: (data, parameters) => repeatedMeasuresANOVA(context, data, parameters as RepeatedMeasuresANOVAParams),
  threeWayANOVA: (data, parameters) => threeWayANOVA(context, data, parameters as ThreeWayANOVAParams)
})

/**
 * ANCOVA (공분산분석 - Analysis of Covariance)
 *
 * 연속형 공변량(covariate)을 통제한 상태에서 그룹 간 평균 차이를 검정합니다.
 * 공변량의 영향을 제거하여 더 정확한 그룹 비교가 가능합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.groupColumn - 그룹 변수 (범주형)
 * @param parameters.dependentColumn - 종속변수 (연속형)
 * @param parameters.covariateColumns[0] - 공변량 (연속형)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns ANCOVA 분석 결과
 *
 * @example
 * ```typescript
 * // 사전점수를 통제한 교수법 효과 분석
 * const result = await ancova(context, data, {
 *   groupColumn: '교수법',
 *   dependentColumn: '사후점수',
 *   covariateColumn: '사전점수'
 * })
 * ```
 */
const ancova = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: ANCOVAParams
): Promise<CalculationResult> => {
  const { groupColumn, dependentColumn, covariateColumns, alpha = 0.05 } = parameters
  const covariateColumn = covariateColumns[0]

  // 파라미터 검증
  if (!groupColumn || !dependentColumn || !covariateColumn) {
    return {
      success: false,
      error: '그룹 변수, 종속변수, 공변량을 모두 선택하세요'
    }
  }

  // 데이터 추출 및 검증
  const groups = extractGroupedData(data, groupColumn, dependentColumn)
  const groupNames = Object.keys(groups)

  if (groupNames.length < 2) {
    return {
      success: false,
      error: '최소 2개 이상의 그룹이 필요합니다'
    }
  }

  // 공변량 추출
  const covariateValues = extractNumericColumn(data, covariateColumn)
  const dependentValues = extractNumericColumn(data, dependentColumn)
  const groupLabels = data.map(row => String(row[groupColumn])).filter((_, i) =>
    !isNaN(dependentValues[i]) && !isNaN(covariateValues[i])
  )

  if (covariateValues.length < 10) {
    return {
      success: false,
      error: 'ANCOVA는 최소 10개 이상의 관측치가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.ancova(
      groupLabels,
      dependentValues.filter((_, i) => !isNaN(dependentValues[i]) && !isNaN(covariateValues[i])),
      covariateValues.filter((v, i) => !isNaN(v) && !isNaN(dependentValues[i]))
    )
  } catch (error) {
    return {
      success: false,
      error: `ANCOVA 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  // 해석 생성
  const interpretation = interpretANCOVA(result, alpha, groupNames, covariateColumn)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'F 통계량 (그룹)', value: result.groupF.toFixed(4) },
        { name: 'p-value (그룹)', value: formatPValue(result.groupP) },
        { name: 'F 통계량 (공변량)', value: result.covariateF.toFixed(4) },
        { name: 'p-value (공변량)', value: formatPValue(result.covariateP) }
      ],
      tables: [
        {
          name: 'ANCOVA 결과',
          data: [
            { 효과: '그룹', F: result.groupF.toFixed(4), p: formatPValue(result.groupP), 유의성: result.groupP < alpha ? '유의' : '비유의' },
            { 효과: `공변량 (${covariateColumn})`, F: result.covariateF.toFixed(4), p: formatPValue(result.covariateP), 유의성: result.covariateP < alpha ? '유의' : '비유의' }
          ]
        },
        {
          name: '조정된 평균 (Adjusted Means)',
          data: result.adjustedMeans.map((mean: number, i: number) => ({
            그룹: groupNames[i],
            조정평균: mean.toFixed(3),
            표준오차: result.standardErrors[i].toFixed(3)
          }))
        }
      ],
      interpretation
    }
  }
}

/**
 * 반복측정 ANOVA (Repeated Measures ANOVA)
 *
 * 동일한 피험자에 대한 여러 시점의 측정값을 비교합니다.
 * 피험자 내 변동을 제거하여 더 강력한 검정이 가능합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.subjectColumn - 피험자 ID 변수
 * @param parameters.withinFactorColumns - 반복측정 변수들 (최소 2개)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 반복측정 ANOVA 결과
 *
 * @example
 * ```typescript
 * // 시간에 따른 혈압 변화 분석
 * const result = await repeatedMeasuresANOVA(context, data, {
 *   subjectColumn: '환자ID',
 *   withinColumns: ['1주차', '2주차', '3주차', '4주차']
 * })
 * ```
 */
const repeatedMeasuresANOVA = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: RepeatedMeasuresANOVAParams
): Promise<CalculationResult> => {
  const { subjectColumn, withinColumns, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!subjectColumn || !withinColumns || withinColumns.length < 2) {
    return {
      success: false,
      error: '피험자 ID와 최소 2개 이상의 반복측정 변수를 선택하세요'
    }
  }

  // 데이터 추출
  const subjects = data.map(row => String(row[subjectColumn]))
  const measurements: number[][] = []

  data.forEach(row => {
    const measures = withinColumns.map(col => {
      const val = row[col]
      return typeof val === 'number' ? val : parseFloat(String(val))
    })

    if (measures.every(v => !isNaN(v))) {
      measurements.push(measures)
    }
  })

  if (measurements.length < 3) {
    return {
      success: false,
      error: '최소 3명 이상의 피험자가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.repeatedMeasuresANOVA(
      measurements,
      withinColumns
    )
  } catch (error) {
    return {
      success: false,
      error: `반복측정 ANOVA 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  // 구형성 가정 검정 해석
  const sphericityNote = result.mauchlyP < 0.05
    ? `구형성 가정 위반 (Mauchly p=${formatPValue(result.mauchlyP)}). Greenhouse-Geisser 또는 Huynh-Feldt 수정 권장.`
    : `구형성 가정 충족 (Mauchly p=${formatPValue(result.mauchlyP)}).`

  const interpretation = interpretRepeatedMeasures(result, alpha, withinColumns, sphericityNote)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'F 통계량', value: result.fStatistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: 'Mauchly W (구형성)', value: result.mauchlyW.toFixed(4) },
        { name: 'p-value (Mauchly)', value: formatPValue(result.mauchlyP) }
      ],
      tables: [
        {
          name: '반복측정 ANOVA',
          data: [
            { 효과: '시점', F: result.fStatistic.toFixed(4), df1: result.df1, df2: result.df2, p: formatPValue(result.pValue), 유의성: result.pValue < alpha ? '유의' : '비유의' }
          ]
        },
        {
          name: '구형성 검정 (Mauchly Test)',
          data: [
            { 항목: "Mauchly's W", 값: result.mauchlyW.toFixed(4) },
            { 항목: 'p-value', 값: formatPValue(result.mauchlyP) },
            { 항목: '결론', 값: result.mauchlyP < 0.05 ? '구형성 가정 위반' : '구형성 가정 충족' }
          ]
        },
        {
          name: '시점별 평균',
          data: withinColumns.map((col, i) => ({
            시점: col,
            평균: result.means[i].toFixed(3),
            표준편차: result.stdDevs[i].toFixed(3)
          }))
        }
      ],
      interpretation
    }
  }
}

/**
 * 삼원 ANOVA (Three-Way ANOVA)
 *
 * 3개의 독립변수가 종속변수에 미치는 주효과와 상호작용 효과를 분석합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.factor1 - 요인 1 (범주형)
 * @param parameters.factor2 - 요인 2 (범주형)
 * @param parameters.factor3 - 요인 3 (범주형)
 * @param parameters.dependentColumn - 종속변수 (연속형)
 * @param parameters.alpha - 유의수준 (기본값: 0.05)
 *
 * @returns 삼원 ANOVA 결과
 *
 * @example
 * ```typescript
 * // 성별×연령×지역의 소득 차이 분석
 * const result = await threeWayANOVA(context, data, {
 *   factor1: '성별',
 *   factor2: '연령대',
 *   factor3: '지역',
 *   dependentColumn: '소득'
 * })
 * ```
 */
const threeWayANOVA = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: ThreeWayANOVAParams
): Promise<CalculationResult> => {
  const { factor1, factor2, factor3, dependentColumn, alpha = 0.05 } = parameters

  // 파라미터 검증
  if (!factor1 || !factor2 || !factor3 || !dependentColumn) {
    return {
      success: false,
      error: '3개 요인과 종속변수를 모두 선택하세요'
    }
  }

  // 데이터 추출
  const factor1Values = data.map(row => String(row[factor1]))
  const factor2Values = data.map(row => String(row[factor2]))
  const factor3Values = data.map(row => String(row[factor3]))
  const dependentValues = extractNumericColumn(data, dependentColumn)

  const validIndices = dependentValues.map((v, i) => !isNaN(v) ? i : -1).filter(i => i !== -1)

  if (validIndices.length < 8) {
    return {
      success: false,
      error: '삼원 ANOVA는 최소 8개 이상의 관측치가 필요합니다'
    }
  }

  // Pyodide 호출
  let result
  try {
    result = await context.pyodideService.threeWayANOVA(
      validIndices.map(i => factor1Values[i]),
      validIndices.map(i => factor2Values[i]),
      validIndices.map(i => factor3Values[i]),
      validIndices.map(i => dependentValues[i])
    )
  } catch (error) {
    return {
      success: false,
      error: `삼원 ANOVA 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }

  const interpretation = interpretThreeWayANOVA(result, alpha, factor1, factor2, factor3)

  return {
    success: true,
    data: {
      metrics: [
        { name: `F (${factor1})`, value: result.mainEffects.f1F.toFixed(4) },
        { name: `p (${factor1})`, value: formatPValue(result.mainEffects.f1P) },
        { name: `F (${factor2})`, value: result.mainEffects.f2F.toFixed(4) },
        { name: `p (${factor2})`, value: formatPValue(result.mainEffects.f2P) },
        { name: `F (${factor3})`, value: result.mainEffects.f3F.toFixed(4) },
        { name: `p (${factor3})`, value: formatPValue(result.mainEffects.f3P) }
      ],
      tables: [
        {
          name: '주효과 (Main Effects)',
          data: [
            { 효과: factor1, F: result.mainEffects.f1F.toFixed(4), p: formatPValue(result.mainEffects.f1P), 유의성: result.mainEffects.f1P < alpha ? '유의' : '비유의' },
            { 효과: factor2, F: result.mainEffects.f2F.toFixed(4), p: formatPValue(result.mainEffects.f2P), 유의성: result.mainEffects.f2P < alpha ? '유의' : '비유의' },
            { 효과: factor3, F: result.mainEffects.f3F.toFixed(4), p: formatPValue(result.mainEffects.f3P), 유의성: result.mainEffects.f3P < alpha ? '유의' : '비유의' }
          ]
        },
        {
          name: '2원 상호작용 (Two-Way Interactions)',
          data: [
            { 상호작용: `${factor1} × ${factor2}`, F: result.interactions.f1f2F.toFixed(4), p: formatPValue(result.interactions.f1f2P), 유의성: result.interactions.f1f2P < alpha ? '유의' : '비유의' },
            { 상호작용: `${factor1} × ${factor3}`, F: result.interactions.f1f3F.toFixed(4), p: formatPValue(result.interactions.f1f3P), 유의성: result.interactions.f1f3P < alpha ? '유의' : '비유의' },
            { 상호작용: `${factor2} × ${factor3}`, F: result.interactions.f2f3F.toFixed(4), p: formatPValue(result.interactions.f2f3P), 유의성: result.interactions.f2f3P < alpha ? '유의' : '비유의' }
          ]
        },
        {
          name: '3원 상호작용 (Three-Way Interaction)',
          data: [
            { 상호작용: `${factor1} × ${factor2} × ${factor3}`, F: result.interactions.f1f2f3F.toFixed(4), p: formatPValue(result.interactions.f1f2f3P), 유의성: result.interactions.f1f2f3P < alpha ? '유의' : '비유의' }
          ]
        }
      ],
      interpretation
    }
  }
}

// ============================================================================
// 해석 헬퍼 함수
// ============================================================================

const interpretANCOVA = (
  result: any,
  alpha: number,
  groupNames: string[],
  covariateName: string
): string => {
  let interpretation = `ANCOVA 분석 결과:\n\n`

  // 공변량 효과
  interpretation += `**공변량 (${covariateName})**: `
  if (result.covariateP < alpha) {
    interpretation += `F=${result.covariateF.toFixed(2)}, p=${formatPValue(result.covariateP)}로 종속변수에 유의한 영향을 미칩니다. `
  } else {
    interpretation += `F=${result.covariateF.toFixed(2)}, p=${formatPValue(result.covariateP)}로 유의한 영향이 없습니다. `
  }

  interpretation += `\n\n**그룹 효과**: `
  if (result.groupP < alpha) {
    interpretation += `F=${result.groupF.toFixed(2)}, p=${formatPValue(result.groupP)}로 공변량을 통제한 후에도 그룹 간 유의한 차이가 있습니다.\n\n`
    interpretation += `조정된 평균을 비교하여 어떤 그룹이 높은지 확인하세요.`
  } else {
    interpretation += `F=${result.groupF.toFixed(2)}, p=${formatPValue(result.groupP)}로 공변량을 통제한 후 그룹 간 유의한 차이가 없습니다.`
  }

  return interpretation
}

const interpretRepeatedMeasures = (
  result: any,
  alpha: number,
  timePoints: string[],
  sphericityNote: string
): string => {
  let interpretation = `반복측정 ANOVA 결과:\n\n`

  interpretation += `**${sphericityNote}**\n\n`

  if (result.pValue < alpha) {
    interpretation += `시점 간 유의한 차이가 있습니다 (F=${result.fStatistic.toFixed(2)}, p=${formatPValue(result.pValue)}).\n\n`
    interpretation += `사후검정을 통해 어느 시점 간 차이가 있는지 확인하세요.`
  } else {
    interpretation += `시점 간 유의한 차이가 없습니다 (F=${result.fStatistic.toFixed(2)}, p=${formatPValue(result.pValue)}).`
  }

  return interpretation
}

const interpretThreeWayANOVA = (
  result: any,
  alpha: number,
  f1: string,
  f2: string,
  f3: string
): string => {
  let interpretation = `삼원 ANOVA 결과:\n\n`

  // 주효과
  interpretation += `**주효과:**\n`
  const mainEffects = [
    { name: f1, p: result.mainEffects.f1P },
    { name: f2, p: result.mainEffects.f2P },
    { name: f3, p: result.mainEffects.f3P }
  ]

  mainEffects.forEach(effect => {
    interpretation += `- ${effect.name}: ${effect.p < alpha ? '유의' : '비유의'} (p=${formatPValue(effect.p)})\n`
  })

  // 상호작용
  interpretation += `\n**상호작용 효과:**\n`
  const interactions = [
    { name: `${f1}×${f2}`, p: result.interactions.f1f2P },
    { name: `${f1}×${f3}`, p: result.interactions.f1f3P },
    { name: `${f2}×${f3}`, p: result.interactions.f2f3P },
    { name: `${f1}×${f2}×${f3}`, p: result.interactions.f1f2f3P }
  ]

  interactions.forEach(interaction => {
    interpretation += `- ${interaction.name}: ${interaction.p < alpha ? '유의' : '비유의'} (p=${formatPValue(interaction.p)})\n`
  })

  interpretation += `\n유의한 상호작용이 있는 경우 단순효과 분석을 수행하세요.`

  return interpretation
}
