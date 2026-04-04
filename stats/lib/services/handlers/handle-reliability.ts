import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { interpretCronbachAlpha } from './shared-helpers'

export async function handleReliability(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  const items = data.arrays.independent || []
  const result = await pyodideStats.cronbachAlpha(items)

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: items[0]?.length || 0,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: result.alpha,
      pvalue: 1, // 신뢰도 분석은 p-value 없음
      significant: result.alpha > 0.7,
      interpretation: `Cronbach's α = ${result.alpha.toFixed(3)} (${interpretCronbachAlpha(result.alpha)})`
    },
    additionalInfo: {},
    visualizationData: {
      type: 'item-total',
      data: result.itemTotalCorrelations
    },
    rawResults: result
  }
}
