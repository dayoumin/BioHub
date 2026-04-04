import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { interpretCramersV } from './shared-helpers'

export async function handleChiSquare(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  if (method.id === 'chi-square-goodness') {
    return executeChiSquareGoodness(method, data)
  }
  return executeChiSquareIndependence(method, data)
}

async function executeChiSquareGoodness(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  const rawDependent = data.variables.dependentVar || data.variables.dependent
  const dependentVar = rawDependent
    ? (Array.isArray(rawDependent) ? (rawDependent as string[])[0] : rawDependent as string)
    : undefined

  if (!dependentVar) {
    throw new Error('카이제곱 적합도 검정을 위해 검정 변수가 필요합니다')
  }

  // 범주별 빈도 집계
  const freqMap = new Map<string, number>()
  data.data.forEach(row => {
    const val = String(row[dependentVar] ?? '')
    if (!val) return
    freqMap.set(val, (freqMap.get(val) ?? 0) + 1)
  })

  const categories = Array.from(freqMap.keys())
  const observed = categories.map(c => freqMap.get(c) ?? 0)

  if (observed.length < 2) {
    throw new Error('적합도 검정을 위해 범주가 2개 이상 필요합니다')
  }

  // 기대 비율이 제공된 경우 사용, 없으면 균등 분포
  const rawExpected = data.variables.expectedProportions
  let expected: number[] | null = null
  if (Array.isArray(rawExpected) && rawExpected.length === observed.length) {
    const total = observed.reduce((s, v) => s + v, 0)
    expected = (rawExpected as number[]).map(p => p * total)
  }

  const result = await pyodideStats.chiSquareGoodnessTest(observed, expected)

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: data.totalN,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: result.chiSquare,
      pvalue: result.pValue,
      df: result.degreesOfFreedom,
      significant: result.reject,
      interpretation: result.reject
        ? '관찰 빈도가 기대 빈도와 유의하게 다릅니다'
        : '관찰 빈도가 기대 빈도와 유의한 차이가 없습니다'
    },
    additionalInfo: {},
    visualizationData: {
      type: 'frequency-bar',
      data: {
        categories,
        observed: result.observed,
        expected: result.expected
      }
    },
    rawResults: result
  }
}

async function executeChiSquareIndependence(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  // 독립변수(행)와 종속변수(열) 추출 - VariableMapping 호환 (independentVar/independent 모두 지원)
  const rawIndependent = data.variables.independentVar || data.variables.independent || data.variables.groupVar || data.variables.group
  const independentVar = rawIndependent
    ? (Array.isArray(rawIndependent) ? (rawIndependent as string[])[0] : rawIndependent as string)
    : undefined

  const rawDependent = data.variables.dependentVar || data.variables.dependent
  const dependentVar = rawDependent
    ? (Array.isArray(rawDependent) ? (rawDependent as string[])[0] : rawDependent as string)
    : undefined

  if (!independentVar || !dependentVar) {
    throw new Error('카이제곱 검정을 위해 독립변수와 종속변수가 필요합니다')
  }

  // raw data에서 contingency table 구성
  const crosstab = new Map<string, Map<string, number>>()
  data.data.forEach(row => {
    const rowVal = String(row[independentVar] ?? '')
    const colVal = String(row[dependentVar] ?? '')
    if (!rowVal || !colVal) return

    if (!crosstab.has(rowVal)) {
      crosstab.set(rowVal, new Map())
    }
    const innerMap = crosstab.get(rowVal)
    if (innerMap !== undefined) {
      innerMap.set(colVal, (innerMap.get(colVal) ?? 0) + 1)
    }
  })

  // 모든 고유 열 값 수집
  const allColValues = new Set<string>()
  crosstab.forEach(innerMap => {
    innerMap.forEach((_, col) => allColValues.add(col))
  })
  const colLabels = Array.from(allColValues)

  // contingency table 배열 구성
  const contingencyTable: number[][] = []
  const rowLabels: string[] = []
  crosstab.forEach((innerMap, rowLabel) => {
    rowLabels.push(rowLabel)
    contingencyTable.push(colLabels.map(col => innerMap.get(col) ?? 0))
  })

  if (contingencyTable.length === 0 || contingencyTable[0].length === 0) {
    throw new Error('유효한 교차표를 생성할 수 없습니다')
  }

  // chi_square_independence_test 호출 (Cramer's V 포함)
  const result = await pyodideStats.chiSquareIndependenceTest(contingencyTable)

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: data.totalN,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: result.chiSquare,
      pvalue: result.pValue,
      df: result.degreesOfFreedom,
      significant: result.reject,
      interpretation: result.reject ?
        '변수 간 유의한 연관성이 있습니다' :
        '변수 간 유의한 연관성이 없습니다'
    },
    additionalInfo: {
      effectSize: {
        type: "Cramer's V",
        value: result.cramersV,
        interpretation: interpretCramersV(result.cramersV)
      }
    },
    visualizationData: {
      type: 'contingency-table',
      data: {
        matrix: contingencyTable,
        expected: result.expectedMatrix,
        rowLabels,
        colLabels
      }
    },
    rawResults: result
  }
}
