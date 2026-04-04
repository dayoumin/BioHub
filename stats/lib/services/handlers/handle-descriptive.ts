import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'

export async function handleDescriptive(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  const values = data.arrays.dependent || data.arrays.independent?.[0] || []

  // 정규성 검정: Shapiro-Wilk 실행
  if (method.id === 'normality-test' || method.id === 'shapiro-wilk') {
    const normResult = await pyodideStats.shapiroWilkTest(values)
    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: values.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: normResult.statistic,
        pvalue: normResult.pValue,
        significant: normResult.pValue < 0.05,
        interpretation: normResult.pValue < 0.05
          ? `Shapiro-Wilk W = ${normResult.statistic.toFixed(4)}, p = ${normResult.pValue.toFixed(4)} → 정규성 가정을 기각합니다 (정규분포가 아닐 수 있음)`
          : `Shapiro-Wilk W = ${normResult.statistic.toFixed(4)}, p = ${normResult.pValue.toFixed(4)} → 정규성 가정을 유지합니다`
      },
      additionalInfo: {
        isNormal: normResult.isNormal
      },
      visualizationData: {
        type: 'histogram',
        data: { values }
      },
      rawResults: normResult
    }
  }

  // 데이터 탐색: 기술통계 + 정규성 결합
  if (method.id === 'explore-data') {
    const [descriptive, normality] = await Promise.all([
      pyodideStats.descriptiveStats(values),
      values.length >= 3 ? pyodideStats.shapiroWilkTest(values) : Promise.resolve(null),
    ])

    const normalityText = normality
      ? `Shapiro-Wilk W = ${normality.statistic.toFixed(4)}, p = ${normality.pValue.toFixed(4)} → ${normality.isNormal ? '정규성 가정 유지' : '정규성 가정 기각'}`
      : '표본 크기가 3 미만이어서 정규성 검정을 수행하지 못했습니다.'

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: values.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: descriptive.mean,
        pvalue: normality?.pValue ?? 1,
        significant: normality ? !normality.isNormal : false,
        interpretation: `평균: ${descriptive.mean.toFixed(2)}, 표준편차: ${descriptive.std.toFixed(2)}. ${normalityText}`
      },
      additionalInfo: {
        isNormal: normality?.isNormal,
        confidenceInterval: {
          level: 0.95,
          lower: descriptive.mean - 1.96 * descriptive.std / Math.sqrt(values.length),
          upper: descriptive.mean + 1.96 * descriptive.std / Math.sqrt(values.length)
        }
      },
      visualizationData: {
        type: 'histogram',
        data: { values, stats: descriptive }
      },
      rawResults: { descriptive, normality }
    }
  }

  // 평균 플롯: Worker 1 means_plot_data 호출
  if (method.id === 'means-plot') {
    const depVarName = ((data.variables.dependent as string[]) ?? [])[0] ?? ''
    const factorVarName =
      (data.variables.group as string) ??
      (data.variables.factor as string) ??
      ((data.variables.independent as string[]) ?? [])[0] ?? ''

    const result = await pyodideStats.meansPlotData(data.data, depVarName, factorVarName)

    const interpretation = result.interpretation as { summary?: string; recommendations?: string[] } | undefined
    const plotData = result.plotData as Array<Record<string, unknown>> | undefined
    const descriptives = result.descriptives as Record<string, Record<string, unknown>> | undefined
    const groupCount = plotData?.length ?? 0

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: data.totalN,
          missingRemoved: data.missingRemoved,
          groups: groupCount
        }
      },
      mainResults: {
        statistic: 0,
        pvalue: 1,
        significant: false,
        interpretation: interpretation?.summary ?? `${groupCount}개 집단의 평균을 비교했습니다.`
      },
      additionalInfo: {
        descriptives
      },
      visualizationData: {
        type: 'bar',
        data: { plotData, descriptives }
      },
      rawResults: result
    }
  }

  // 기본 기술통계
  const stats = await pyodideStats.descriptiveStats(values)

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: values.length,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: stats.mean,
      pvalue: 1, // 기술통계는 p-value 없음
      significant: false,
      interpretation: `평균: ${stats.mean.toFixed(2)}, 표준편차: ${stats.std.toFixed(2)}`
    },
    additionalInfo: {
      confidenceInterval: {
        level: 0.95,
        lower: stats.mean - 1.96 * stats.std / Math.sqrt(values.length),
        upper: stats.mean + 1.96 * stats.std / Math.sqrt(values.length)
      }
    },
    visualizationData: {
      type: 'histogram',
      data: { values, stats }
    },
    rawResults: stats
  }
}
