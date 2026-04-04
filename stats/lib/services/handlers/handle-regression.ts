/**
 * Regression handler — extracted from statistical-executor.ts (lines 1500-1714).
 * Behavior-preserving. Only changes:
 *   - pyodideStats.regression() → pyodideStats.linearRegression() (Amendment B),
 *     with undefined-preserving field mapping (fStatistic, tStatistic, predictions stay undefined).
 *   - this.interpretRSquared → interpretRSquared (shared-helpers).
 */

import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { interpretRSquared } from './shared-helpers'

export async function handleRegression(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  const dependent = data.arrays.dependent
  const independent = data.arrays.independent

  if (!dependent) {
    throw new Error('회귀분석을 위한 종속변수가 필요합니다')
  }

  // 열-기반(column-major) independent를 행-기반(row-major) 행렬로 전환
  const transposeToRows = (): number[][] =>
    dependent.map((_, rowIdx) => (independent ?? []).map(col => col[rowIdx]))

  // 변수명 추출 (stepwise 등에서 사용)
  const vars = data.variables as Record<string, unknown>
  const depVarName = (
    Array.isArray(vars.dependent) ? (vars.dependent as string[])[0] : vars.dependent as string
  ) ?? 'y'
  const predictorVarNames: string[] = Array.isArray(vars.independent)
    ? (vars.independent as string[])
    : []

  // GLM 계열 공통 결과 구성 (logistic, poisson, ordinal)
  // NOTE: logistic은 llrStatistic 미반환 → statistic=0 (worker 수정 필요, P0 별도)
  const buildGlmResult = <T extends { llrPValue: number; llrStatistic?: number }>(
    raw: T,
    vizType: string,
  ): StatisticalExecutorResult => {
    const pvalue = raw.llrPValue
    return {
      metadata: {
        method: method.id, methodName: method.name,
        timestamp: '', duration: 0,
        dataInfo: { totalN: dependent.length, missingRemoved: 0 }
      },
      mainResults: {
        statistic: Number(raw.llrStatistic ?? 0),
        pvalue,
        significant: pvalue < 0.05,
        interpretation: `${method.name} 완료 (n=${dependent.length})`
      },
      additionalInfo: {},
      visualizationData: { type: vizType, data: raw },
      rawResults: raw
    }
  }

  switch (method.id) {
    case 'logistic-regression': {
      if (!independent || independent.length === 0) {
        throw new Error('로지스틱 회귀분석을 위한 독립변수가 필요합니다')
      }
      const result = await pyodideStats.logisticRegression(transposeToRows(), dependent)
      return buildGlmResult(result, 'logistic-regression')
    }

    case 'poisson': { // statistical-methods.ts 정규 ID. 레거시 'poisson-regression'은 미지원 (레거시 경로 신규 개발 안 함)
      if (!independent || independent.length === 0) {
        throw new Error('포아송 회귀분석을 위한 독립변수가 필요합니다')
      }
      const result = await pyodideStats.poissonRegression(transposeToRows(), dependent)
      return buildGlmResult(result, 'poisson-regression')
    }

    case 'ordinal-regression': {
      if (!independent || independent.length === 0) {
        throw new Error('순서형 로지스틱 회귀분석을 위한 독립변수가 필요합니다')
      }
      const result = await pyodideStats.ordinalLogistic(transposeToRows(), dependent)
      return buildGlmResult(result, 'ordinal-regression')
    }

    case 'stepwise': {
      if (!independent || independent.length === 0) {
        throw new Error('단계적 회귀분석을 위한 독립변수가 필요합니다')
      }
      const varNames = predictorVarNames.length > 0 ? predictorVarNames : null
      const result = await pyodideStats.stepwiseRegression(
        dependent, transposeToRows(), varNames
      )
      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: { totalN: dependent.length, missingRemoved: 0 }
        },
        mainResults: {
          statistic: result.fStatistic,
          pvalue: result.fPValue,
          significant: result.fPValue < 0.05,
          interpretation: `단계적 회귀 분석 완료 — 선택된 변수 ${result.selectedVariables.length}개`
        },
        additionalInfo: {
          effectSize: {
            type: 'R-squared',
            value: result.rSquared,
            interpretation: interpretRSquared(result.rSquared)
          }
        },
        visualizationData: { type: 'stepwise-regression', data: result },
        rawResults: result
      }
    }

    case 'dose-response': {
      if (!independent || independent.length === 0) {
        throw new Error('용량-반응 분석을 위한 독립변수(용량)가 필요합니다')
      }
      const doseRaw = await pyodideStats.doseResponseAnalysis(
        independent[0], dependent
      ) as Record<string, unknown>
      const dosePvalue = Number(doseRaw.pValue ?? 1)
      return {
        metadata: {
          method: method.id, methodName: method.name,
          timestamp: '', duration: 0,
          dataInfo: { totalN: dependent.length, missingRemoved: 0 }
        },
        mainResults: {
          statistic: Number(doseRaw.rSquared ?? 0),
          pvalue: dosePvalue,
          significant: dosePvalue < 0.05,
          interpretation: `용량-반응 분석 완료 (n=${dependent.length})`
        },
        additionalInfo: {},
        visualizationData: { type: 'dose-response', data: doseRaw },
        rawResults: doseRaw
      }
    }

    case 'response-surface': {
      if (predictorVarNames.length === 0) {
        throw new Error('반응표면 분석을 위한 예측변수명이 필요합니다')
      }
      const rsRaw = await pyodideStats.responseSurfaceAnalysis(
        data.data, depVarName, predictorVarNames
      ) as Record<string, unknown>
      const rsPvalue = Number(rsRaw.pValue ?? 1)
      const rsR2 = rsRaw.rSquared != null ? Number(rsRaw.rSquared) : undefined
      return {
        metadata: {
          method: method.id, methodName: method.name,
          timestamp: '', duration: 0,
          dataInfo: { totalN: data.data.length, missingRemoved: 0 }
        },
        mainResults: {
          statistic: Number(rsRaw.fStatistic ?? 0),
          pvalue: rsPvalue,
          significant: rsPvalue < 0.05,
          interpretation: `반응표면 분석 완료 — ${predictorVarNames.length}개 예측변수`
        },
        additionalInfo: {
          effectSize: rsR2 != null ? {
            type: 'R-squared', value: rsR2,
            interpretation: interpretRSquared(rsR2)
          } : undefined
        },
        visualizationData: { type: 'response-surface', data: rsRaw },
        rawResults: rsRaw
      }
    }

    // ── 기본: 선형 회귀 (기존 동작) ──
    default: {
      const firstIndependent = independent?.[0]
      if (!firstIndependent) {
        throw new Error('회귀분석을 위한 독립변수가 필요합니다')
      }

      // Amendment B: pyodideStats.regression() (deprecated) → linearRegression()
      // Field mapping preserves undefined semantics:
      //   fStatistic  → undefined (NOT linearRegression doesn't provide it)
      //   tStatistic  → undefined (NOT slopeTValue — behavioral change prevention)
      //   predictions → undefined (NOT fittedValues — behavioral change prevention)
      // mainResults.statistic evaluates to 0 via: result.fStatistic ?? result.tStatistic ?? 0
      const regResult = await pyodideStats.linearRegression(firstIndependent, dependent)
      const result = {
        slope: regResult.slope,
        intercept: regResult.intercept,
        rSquared: regResult.rSquared,
        pvalue: regResult.pValue,           // field rename only
        fStatistic: undefined as number | undefined,  // preserve undefined (NOT any new field)
        tStatistic: undefined as number | undefined,  // preserve undefined (NOT slopeTValue)
        predictions: undefined as number[] | undefined,  // preserve undefined (NOT fittedValues)
        df: regResult.nPairs - 2
      }

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: dependent.length,
            missingRemoved: 0
          }
        },
        mainResults: {
          statistic: result.fStatistic ?? result.tStatistic ?? 0,
          pvalue: result.pvalue,
          df: result.df,
          significant: result.pvalue < 0.05,
          interpretation: `R² = ${result.rSquared.toFixed(3)}, 회귀식이 ${result.pvalue < 0.05 ? '유의합니다' : '유의하지 않습니다'}`
        },
        additionalInfo: {
          effectSize: {
            type: 'R-squared',
            value: result.rSquared,
            interpretation: interpretRSquared(result.rSquared)
          }
        },
        visualizationData: {
          type: 'scatter-regression',
          data: {
            x: firstIndependent,
            y: dependent,
            regression: result.predictions
          }
        },
        rawResults: result
      }
    }
  }
}
