/**
 * ANOVA Group
 *
 * 분산분석 그룹 (9개 메서드)
 * - Worker 3 전용 (Nonparametric과 함께)
 * - 패키지: SciPy, Statsmodels
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'
import {
  extractDataRows,
  validateNumberArray,
  validateNumberMatrix,
  extractGroupedValues,
  safeParseNumber
} from './utils'

export function createAnovaGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'anova',
    methods: [
      'oneWayAnova',
      'twoWayAnova',
      'repeatedMeasures',
      'ancova',
      'manova',
      'tukeyHSD',
      'scheffeTest',
      'bonferroni',
      'gamesHowell'
    ],
    handlers: {
      oneWayAnova: createOneWayAnovaHandler(context),
      twoWayAnova: createTwoWayAnovaHandler(context),
      repeatedMeasures: createRepeatedMeasuresHandler(context),
      ancova: createAncovaHandler(context),
      manova: createManovaHandler(context),
      tukeyHSD: createTukeyHSDHandler(context),
      scheffeTest: createScheffeTestHandler(context),
      bonferroni: createBonferroniHandler(context),
      gamesHowell: createGamesHowellHandler(context)
    }
  }
}

function createOneWayAnovaHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn

    if (!groupColumn || typeof groupColumn !== 'string' || !valueColumn || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const groups: Record<string, number[]> = {}
    extractDataRows(data).forEach(row => {
      const g = String(row[groupColumn] ?? '')
      const vRaw = row[valueColumn]
      const v = typeof vRaw === 'number' ? vRaw : typeof vRaw === 'string' ? parseFloat(vRaw) : NaN
      if (!isNaN(v) && g) {
        if (!groups[g]) groups[g] = []
        groups[g].push(v)
      }
    })

    const groupArrays = Object.values(groups)
    const result = await context.pyodideService.oneWayANOVA(groupArrays)

    return {
      success: true,
      data: {
        metrics: [
          { name: 'F-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) }
        ],
        interpretation: `일원분산분석 결과 그룹 간 평균은 ${result.pValue < 0.05 ? '통계적으로 유의하게 다릅니다' : '통계적으로 유의한 차이가 없습니다'}.`
      }
    }
  }
}

function createTwoWayAnovaHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix
    const factor1 = paramsObj.factor1
    const factor2 = paramsObj.factor2

    if (!dataMatrix || !Array.isArray(dataMatrix)) {
      return { success: false, error: '데이터 행렬을 제공하세요' }
    }

    if (!factor1 || !Array.isArray(factor1) || !factor2 || !Array.isArray(factor2)) {
      return { success: false, error: '요인 배열을 제공하세요' }
    }

    // twoWayAnova expects data in format: { factor1, factor2, value }[]
    // Convert dataMatrix + factors to required format
    const convertedData = dataMatrix.map((val, idx) => ({
      factor1: String(factor1[idx] ?? ''),
      factor2: String(factor2[idx] ?? ''),
      value: typeof val === 'number' ? val : NaN
    })).filter(d => !isNaN(d.value))

    const result = await context.pyodideService.twoWayAnova(convertedData)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'F-통계량 (요인1)', value: result.factor1.fStatistic.toFixed(4) },
          { name: 'F-통계량 (요인2)', value: result.factor2.fStatistic.toFixed(4) },
          { name: 'F-통계량 (상호작용)', value: result.interaction.fStatistic.toFixed(4) }
        ],
        interpretation: `이원분산분석 결과`
      }
    }
  }
}

function createRepeatedMeasuresHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix

    if (!dataMatrix || !Array.isArray(dataMatrix)) {
      return { success: false, error: '데이터 행렬을 제공하세요' }
    }

    // repeatedMeasuresAnovaWorker requires: dataMatrix, subjectIds, timeLabels
    const subjectIds = Array.from({ length: dataMatrix.length }, (_, i) => i)
    const timeLabels = Array.from({ length: (dataMatrix[0] as number[])?.length || 0 }, (_, i) => i)

    const result = await context.pyodideService.repeatedMeasuresAnovaWorker(
      dataMatrix as number[][],
      subjectIds,
      timeLabels
    )
    return {
      success: true,
      data: {
        metrics: [
          { name: 'F-통계량', value: result.fStatistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) }
        ],
        interpretation: `반복측정 분산분석 결과`
      }
    }
  }
}

function createAncovaHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn
    const covariateColumns = paramsObj.covariateColumns

    if (typeof groupColumn !== 'string' || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    if (!Array.isArray(covariateColumns) || covariateColumns.length === 0) {
      return { success: false, error: '최소 1개의 공변량 열이 필요합니다' }
    }

    // Extract data from rows
    const yValues: number[] = []
    const groupValues: (string | number)[] = []
    const covariateMatrix: number[][] = []

    extractDataRows(data).forEach(row => {
      const y = safeParseNumber(row[valueColumn])
      const group = row[groupColumn]

      if (isNaN(y) || group === null || group === undefined) {
        return
      }

      // Extract covariate values
      const covariates = (covariateColumns as string[]).map(col =>
        safeParseNumber(row[col])
      )

      // Skip if any covariate is NaN
      if (covariates.some(c => isNaN(c))) {
        return
      }

      yValues.push(y)
      groupValues.push(String(group))
      covariateMatrix.push(covariates)
    })

    if (yValues.length < 3) {
      return { success: false, error: '최소 3개 이상의 유효한 데이터가 필요합니다' }
    }

    // Transpose covariates for ancovaWorker
    const covariates: number[][] = []
    const numCovariates = covariateMatrix[0].length
    for (let i = 0; i < numCovariates; i++) {
      covariates.push(covariateMatrix.map(row => row[i]))
    }

    const result = await context.pyodideService.ancovaWorker(yValues, groupValues, covariates)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'F-통계량', value: result.fStatistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) }
        ],
        interpretation: `공분산분석(ANCOVA) 결과: ${result.pValue < 0.05 ? '공변량을 통제한 후 그룹 간 유의한 차이가 있습니다' : '공변량을 통제한 후 그룹 간 유의한 차이가 없습니다'}.`
      }
    }
  }
}

function createManovaHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const dependentColumns = paramsObj.dependentColumns

    if (typeof groupColumn !== 'string') {
      return { success: false, error: '그룹 열을 선택하세요' }
    }

    if (!Array.isArray(dependentColumns) || dependentColumns.length < 2) {
      return { success: false, error: '최소 2개의 종속변수가 필요합니다' }
    }

    // Extract data from rows
    const dataMatrix: number[][] = []
    const groupValues: (string | number)[] = []

    extractDataRows(data).forEach(row => {
      const group = row[groupColumn]

      if (group === null || group === undefined) {
        return
      }

      // Extract dependent variable values
      const depValues = (dependentColumns as string[]).map(col =>
        safeParseNumber(row[col])
      )

      // Skip if any dependent variable is NaN
      if (depValues.some(v => isNaN(v))) {
        return
      }

      dataMatrix.push(depValues)
      groupValues.push(String(group))
    })

    if (dataMatrix.length < 3) {
      return { success: false, error: '최소 3개 이상의 유효한 데이터가 필요합니다' }
    }

    const varNames = (dependentColumns as string[]).map((col, i) =>
      typeof col === 'string' ? col : `Var${i + 1}`
    )

    const result = await context.pyodideService.manovaWorker(dataMatrix, groupValues, varNames)
    return {
      success: true,
      data: {
        metrics: [
          { name: "Wilks' Lambda", value: result.wilksLambda.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) }
        ],
        interpretation: `다변량 분산분석(MANOVA) 결과: ${result.pValue < 0.05 ? '그룹 간 다변량 평균에 유의한 차이가 있습니다' : '그룹 간 다변량 평균에 유의한 차이가 없습니다'}.`
      }
    }
  }
}

function createTukeyHSDHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groups = paramsObj.groups

    if (!groups || !Array.isArray(groups)) {
      return { success: false, error: '그룹 배열을 제공하세요' }
    }

    const result = await context.pyodideService.tukeyHSD(groups)
    return {
      success: true,
      data: {
        metrics: [
          { name: '비교 쌍 수', value: result.comparisons.length }
        ],
        interpretation: `Tukey HSD 사후검정 결과`
      }
    }
  }
}

function createScheffeTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn

    if (typeof groupColumn !== 'string' || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // Extract grouped data
    const groupedData = extractGroupedValues(data, groupColumn, valueColumn)
    const groups = Object.values(groupedData)

    if (groups.length < 2) {
      return { success: false, error: '최소 2개의 그룹이 필요합니다' }
    }

    const result = await context.pyodideService.scheffeTestWorker(groups)
    return {
      success: true,
      data: {
        metrics: [
          { name: '비교 쌍 수', value: result.comparisons.length }
        ],
        interpretation: `Scheffe 사후검정 결과: ${result.comparisons.length}개의 쌍별 비교를 수행했습니다.`
      }
    }
  }
}

function createBonferroniHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn
    const alphaVal = paramsObj.alpha

    if (typeof groupColumn !== 'string' || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const alpha = typeof alphaVal === 'number' ? alphaVal : 0.05

    // Extract grouped data
    const groupedData = extractGroupedValues(data, groupColumn, valueColumn)
    const groupNames = Object.keys(groupedData)
    const groups = Object.values(groupedData)

    if (groups.length < 2) {
      return { success: false, error: '최소 2개의 그룹이 필요합니다' }
    }

    const result = await context.pyodideService.performBonferroni(groups, groupNames, alpha)
    return {
      success: true,
      data: {
        metrics: [
          { name: '조정된 α', value: result.adjusted_alpha.toFixed(4) },
          { name: '총 비교 수', value: result.num_comparisons },
          { name: '유의한 비교 수', value: result.significant_count }
        ],
        interpretation: `Bonferroni 사후검정 결과: ${result.num_comparisons}개 비교 중 ${result.significant_count}개가 유의합니다.`
      }
    }
  }
}

function createGamesHowellHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const groupColumn = paramsObj.groupColumn
    const valueColumn = paramsObj.valueColumn
    const alphaVal = paramsObj.alpha

    if (typeof groupColumn !== 'string' || typeof valueColumn !== 'string') {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    const alpha = typeof alphaVal === 'number' ? alphaVal : 0.05

    // Extract grouped data
    const groupedData = extractGroupedValues(data, groupColumn, valueColumn)
    const groupNames = Object.keys(groupedData)
    const groups = Object.values(groupedData)

    if (groups.length < 2) {
      return { success: false, error: '최소 2개의 그룹이 필요합니다' }
    }

    const result = await context.pyodideService.gamesHowellTest(groups, groupNames, alpha)
    return {
      success: true,
      data: {
        metrics: [
          { name: '비교 쌍 수', value: result.comparisons.length },
          { name: '유의한 비교 수', value: result.significant_count }
        ],
        interpretation: `Games-Howell 사후검정 결과: ${result.comparisons.length}개 비교 중 ${result.significant_count}개가 유의합니다 (등분산 가정 불필요).`
      }
    }
  }
}

// Note: All utility functions are now imported from './utils'
// extractDataRows, validateNumberArray, validateNumberMatrix, extractGroupedValues, safeParseNumber
