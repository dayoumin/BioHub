import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'

export async function handleSurvival(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  switch (method.id) {
    case 'kaplan-meier': {
      // Validate event variable is provided (early check before row-level alignment)
      if ((data.arrays.event || []).length === 0) {
        throw new Error('Kaplan-Meier analysis requires an event variable (0=censored, 1=event)')
      }

      // Build aligned arrays - filter NaN values while keeping indices aligned
      const rawData = data.data as Array<Record<string, unknown>>
      const depVar = (data.variables?.dependent || data.variables?.dependentVar) as string | string[] | undefined
      const eventVar = data.variables?.event as string | undefined
      const depName = Array.isArray(depVar) ? depVar[0] : depVar
      const factorVar = (data.variables?.factor || data.variables?.group || data.variables?.groupVar) as string | undefined

      if (!depName || !eventVar || !rawData) {
        throw new Error('Kaplan-Meier requires time (dependent) and event variable names')
      }

      // group 컬럼 포함해서 동시에 필터 — 결측 제거 후에도 인덱스 일치 보장
      const alignedData: { time: number; event: number; group?: string }[] = []
      for (const row of rawData) {
        const time = Number(row[depName])
        const event = Number(row[eventVar])
        if (!isNaN(time) && !isNaN(event)) {
          alignedData.push({
            time,
            event,
            group: factorVar ? String(row[factorVar] ?? 'All') : undefined
          })
        }
      }

      if (alignedData.length === 0) {
        throw new Error('No valid time-event pairs found')
      }

      if (alignedData.length < 10) {
        throw new Error(`Kaplan-Meier 분석에는 최소 10개의 유효한 관찰값이 필요합니다 (현재: ${alignedData.length})`)
      }

      const times = alignedData.map(d => d.time)
      const events = alignedData.map(d => d.event)

      // Validate events are binary (0 or 1)
      const uniqueEvents = [...new Set(events)]
      if (!uniqueEvents.every(e => e === 0 || e === 1)) {
        throw new Error('Event variable must be binary (0=censored, 1=event)')
      }

      // 그룹 배열 — alignedData에서 추출 (결측 제거 후 인덱스 일치)
      const groups: string[] | undefined = factorVar
        ? alignedData.map(d => d.group ?? 'All')
        : undefined

      // Worker5 카플란-마이어 분석 (scipy 기반, lifelines 불사용)
      const result = await pyodideStats.kaplanMeierAnalysis(times, events, groups)

      const totalEvents = events.filter((e: number) => e === 1).length
      const medianTime = result.medianSurvivalTime
      const logRankP = result.logRankP

      const interpParts: string[] = []
      if (medianTime !== null) interpParts.push(`중앙 생존 시간: ${medianTime.toFixed(2)}`)
      if (logRankP !== null) interpParts.push(`Log-rank p=${logRankP.toFixed(4)}`)

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: times.length,
            missingRemoved: 0
          }
        },
        mainResults: {
          statistic: medianTime ?? 0,
          pvalue: logRankP ?? 1,
          significant: logRankP !== null ? logRankP < 0.05 : false,
          interpretation: interpParts.length > 0
            ? interpParts.join(', ')
            : '중앙 생존 시간을 계산할 수 없습니다'
        },
        additionalInfo: {},
        visualizationData: {
          type: 'km-curve',
          data: result
        },
        rawResults: { ...result, totalEvents, sampleSize: times.length }
      }
    }
    case 'cox-regression': {
      const rawEvents = data.arrays.event || []

      // Validate event variable is provided
      if (rawEvents.length === 0) {
        throw new Error('Cox regression requires an event variable (0=censored, 1=event)')
      }

      const rawData = data.data as Array<Record<string, unknown>>
      const depVar = (data.variables?.dependent || data.variables?.dependentVar) as string | string[] | undefined
      const eventVar = data.variables?.event as string | undefined
      const indVars = (data.variables?.independent || data.variables?.independentVar) as string | string[] | undefined
      const depName = Array.isArray(depVar) ? depVar[0] : depVar
      const indNames = indVars ? (Array.isArray(indVars) ? indVars : [indVars]) : []

      // Build aligned arrays from raw data
      const alignedData: { time: number; event: number; covariates: number[] }[] = []

      if (depName && eventVar && indNames.length > 0) {
        for (const row of rawData) {
          const time = Number(row[depName])
          const event = Number(row[eventVar])
          const covs = indNames.map(name => Number(row[name]))

          if (!isNaN(time) && !isNaN(event) && covs.every(c => !isNaN(c))) {
            alignedData.push({ time, event, covariates: covs })
          }
        }
      }

      if (alignedData.length === 0) {
        throw new Error('No valid time-event-covariate tuples found')
      }

      const times = alignedData.map(d => d.time)
      const events = alignedData.map(d => d.event)

      // Validate events are binary
      const uniqueEvents = [...new Set(events)]
      if (!uniqueEvents.every(e => e === 0 || e === 1)) {
        throw new Error('Event variable must be binary (0=censored, 1=event)')
      }

      // Build covariate matrix (column-major for pyodideStats)
      const nCovariates = indNames.length
      const covariateData: number[][] = []
      for (let j = 0; j < nCovariates; j++) {
        covariateData.push(alignedData.map(d => d.covariates[j]))
      }

      const covariateNames = (data.variables?.independentNames as string[]) ||
        (indNames.length > 0 ? indNames : covariateData.map((_: unknown, i: number) => `X${i + 1}`))

      // pyodideStats 래퍼 사용
      const result = await pyodideStats.coxRegression(times, events, covariateData, covariateNames)

      // 가장 유의한 변수의 p-value
      const minPValue = Math.min(...result.pValues)

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: times.length,
            missingRemoved: 0
          }
        },
        mainResults: {
          statistic: result.concordance || 0,
          pvalue: minPValue,
          significant: minPValue < 0.05,
          interpretation: `Concordance: ${(result.concordance || 0).toFixed(3)}, ${result.pValues.filter(p => p < 0.05).length}개 변수가 유의함`
        },
        additionalInfo: {},
        visualizationData: {
          type: 'forest-plot',
          data: {
            covariateNames,
            hazardRatios: result.hazardRatios,
            confidenceIntervals: result.confidenceIntervals
          }
        },
        rawResults: { ...result, covariateNames, sampleSize: times.length }
      }
    }
    case 'roc-curve': {
      const rawData = data.data as Array<Record<string, unknown>>
      const depVar = (data.variables?.dependent || data.variables?.dependentVar) as string | string[] | undefined
      const indVar = (data.variables?.independent || data.variables?.independentVar) as string | string[] | undefined
      const depName = Array.isArray(depVar) ? depVar[0] : depVar
      const indName = Array.isArray(indVar) ? indVar[0] : indVar

      if (!depName || !indName) {
        throw new Error('ROC 분석에는 결과 변수(dependent)와 예측 점수 변수(independent)가 필요합니다')
      }

      const actualClass: number[] = []
      const predictedProb: number[] = []

      for (const row of rawData ?? []) {
        const actual = Number(row[depName])
        const pred = Number(row[indName])
        if (!isNaN(actual) && !isNaN(pred)) {
          actualClass.push(actual)
          predictedProb.push(pred)
        }
      }

      if (actualClass.length < 20) {
        throw new Error(`ROC 분석에는 최소 20개의 유효한 관찰값이 필요합니다 (현재: ${actualClass.length})`)
      }

      // Validate actualClass is binary (0 or 1)
      const uniqueClasses = [...new Set(actualClass)]
      if (!uniqueClasses.every(c => c === 0 || c === 1)) {
        throw new Error('결과 변수(dependent)는 이진값(0 또는 1)이어야 합니다')
      }
      if (uniqueClasses.length < 2) {
        throw new Error('결과 변수에 두 클래스(0과 1)가 모두 포함되어야 합니다')
      }

      const result = await pyodideStats.rocCurveAnalysis(actualClass, predictedProb)

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: actualClass.length,
            missingRemoved: 0
          }
        },
        mainResults: {
          statistic: result.auc,
          pvalue: 1, // ROC AUC 단독 p-value 없음
          significant: result.auc > 0.7,
          interpretation: `AUC: ${result.auc.toFixed(3)} (95% CI: ${result.aucCI.lower.toFixed(3)}-${result.aucCI.upper.toFixed(3)}), 최적 임계값: ${result.optimalThreshold.toFixed(3)}, 민감도: ${(result.sensitivity * 100).toFixed(1)}%, 특이도: ${(result.specificity * 100).toFixed(1)}%`
        },
        additionalInfo: {
          auc: result.auc,
          aucCI: result.aucCI,
          optimalThreshold: result.optimalThreshold,
          sensitivity: result.sensitivity,
          specificity: result.specificity,
        },
        visualizationData: {
          type: 'roc-curve',
          data: result
        },
        rawResults: { ...result, sampleSize: actualClass.length }
      }
    }
    default:
      throw new Error(`지원되지 않는 생존 분석: ${method.id}`)
  }
}
