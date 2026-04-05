import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { calculateCohensD, interpretCohensD } from './shared-helpers'

export async function handleTTest(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  // 일표본 t-검정 분기
  if (method.id === 'one-sample-t' || method.id === 'one-sample-t-test') {
    const values = data.arrays.dependent || data.arrays.independent?.[0] || []
    if (values.length < 2) {
      throw new Error('일표본 t-검정을 위해 최소 2개 이상의 관측치가 필요합니다')
    }
    const testValue = Number(data.variables.testValue ?? 0)
    if (isNaN(testValue)) {
      throw new Error('기준값(μ₀)이 유효한 숫자가 아닙니다')
    }
    const result = await pyodideStats.tTestOneSample(values, testValue)

    // Cohen's d = (mean - mu) / sd
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
    const cohensD = sd > 0 ? Math.abs(mean - testValue) / sd : 0

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: values.length,
          missingRemoved: 0,
          groups: 1
        }
      },
      mainResults: {
        statistic: result.statistic ?? 0,
        pvalue: result.pValue ?? 1,
        df: result.df,
        significant: (result.pValue ?? 1) < 0.05,
        interpretation: (result.pValue ?? 1) < 0.05
          ? `표본 평균이 기준값(${testValue})과 유의한 차이가 있습니다`
          : `표본 평균이 기준값(${testValue})과 유의한 차이가 없습니다`
      },
      additionalInfo: {
        effectSize: {
          type: "Cohen's d",
          value: cohensD,
          interpretation: interpretCohensD(cohensD)
        },
        descriptive: {
          mean,
          sd,
          n: values.length,
          testValue
        }
      },
      visualizationData: {
        type: 'histogram',
        data: [{ values, label: '표본' }]
      },
      rawResults: result
    }
  }

  let group1: number[], group2: number[]
  let groupNames: string[] = []

  // 그룹 데이터 준비
  if (data.arrays.byGroup) {
    const byGroup = data.arrays.byGroup as Record<string, number[]>
    groupNames = Object.keys(byGroup)
    if (groupNames.length !== 2) {
      const groupsLabel = groupNames.length > 0 ? groupNames.map(name => `"${name}"`).join(', ') : '(없음)'
      throw new Error(
        `t-검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${groupNames.length}개 (${groupsLabel}). ` +
        '그룹 변수 선택이 올바른지 확인하세요.'
      )
    }
    const groups = Object.values(byGroup) as number[][]
    group1 = groups[0] || []
    group2 = groups[1] || []
  } else if (data.arrays.independent) {
    group1 = data.arrays.dependent || []
    group2 = data.arrays.independent[0] || []
    groupNames = ['그룹 1', '그룹 2']
  } else {
    throw new Error('t-검정을 위한 두 그룹 데이터가 필요합니다')
  }

  // 데이터 검증 - Python으로 보내기 전에 검증
  if (group1.length < 2 || group2.length < 2) {
    const groupInfo = groupNames.length >= 2
      ? `그룹 "${groupNames[0]}": ${group1.length}개, 그룹 "${groupNames[1]}": ${group2.length}개`
      : `그룹 1: ${group1.length}개, 그룹 2: ${group2.length}개`
    throw new Error(
      `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${groupInfo}. ` +
      '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
    )
  }

  // Pyodide로 t-검정 실행
  // Welch t-검정: equalVar = false, 일반 t-검정: equalVar = true
  const isWelch = method.id === 'welch-t'
  const result = await pyodideStats.tTest(group1, group2, {
    paired: method.id === 'paired-t',
    equalVar: !isWelch // Welch t-검정은 등분산 가정하지 않음
  })

  const cohensD = calculateCohensD(group1, group2)
  const effectSizeLabel = isWelch ? "Cohen's d (pooled SD)" : "Cohen's d"

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: group1.length + group2.length,
        missingRemoved: 0,
        groups: 2
      }
    },
    mainResults: {
      statistic: result.statistic,
      pvalue: result.pValue,
      df: result.df,
      significant: result.pValue < 0.05,
      interpretation: result.pValue < 0.05 ?
        '두 그룹 간 유의한 차이가 있습니다' :
        '두 그룹 간 유의한 차이가 없습니다'
    },
    additionalInfo: {
      effectSize: {
        type: effectSizeLabel,
        value: cohensD,
        interpretation: interpretCohensD(cohensD)
      },
      confidenceInterval: result.confidenceInterval ? {
        ...result.confidenceInterval,
        level: 0.95
      } : undefined
    },
    visualizationData: {
      type: 'boxplot',
      data: {
        group1: { values: group1, label: 'Group 1' },
        group2: { values: group2, label: 'Group 2' }
      }
    },
    rawResults: result
  }
}
