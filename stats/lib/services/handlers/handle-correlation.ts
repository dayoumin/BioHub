import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { CorrelationExecutor } from '../executors/correlation-executor'

const correlationExecutor = new CorrelationExecutor()

export async function handleCorrelation(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  const var1 = data.arrays.dependent || data.arrays.independent?.[0]
  const var2 = data.arrays.independent?.[1] || data.arrays.independent?.[0]

  if (!var1 || !var2) {
    throw new Error('상관분석을 위한 두 변수가 필요합니다')
  }

  const executor = correlationExecutor

  // method.id에 따라 적절한 상관분석 실행
  const methodId = method.id.toLowerCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let executorResult: any

  if (methodId === 'partial-correlation') {
    // 편상관분석: 공변량(통제변수) 처리
    // Note: prepareData에서 arrays.covariate로 저장됨 (covariates 아님)
    const covariates = data.arrays.covariate || []
    const dataMatrix = [var1, var2, ...covariates]
    const controlIndices = covariates.length > 0
      ? Array.from({ length: covariates.length }, (_, i) => i + 2)
      : []
    executorResult = await executor.executePartialCorrelation(dataMatrix, 0, 1, controlIndices)
  } else if (methodId === 'spearman-correlation' || methodId.includes('spearman')) {
    executorResult = await executor.executeSpearman(var1, var2)
  } else if (methodId === 'kendall-correlation' || methodId.includes('kendall')) {
    executorResult = await executor.executeKendall(var1, var2)
  } else if (methodId === 'pearson-correlation' || methodId === 'pearson') {
    // 피어슨 단독 실행
    executorResult = await executor.executePearson(var1, var2)
  } else {
    // 기본: 종합 상관분석 (pearson + spearman + kendall 모두 포함)
    executorResult = await executor.executeCorrelation(var1, var2)
  }

  // CorrelationExecutor 결과를 StatisticalExecutor 형식으로 변환
  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: executorResult.metadata?.timestamp || '',
      duration: executorResult.metadata?.duration || 0,
      dataInfo: {
        totalN: var1.length,
        missingRemoved: 0
      }
    },
    mainResults: {
      statistic: executorResult.mainResults.statistic,
      pvalue: executorResult.mainResults.pvalue,
      significant: executorResult.mainResults.pvalue < 0.05,
      interpretation: executorResult.mainResults.interpretation
    },
    additionalInfo: executorResult.additionalInfo || {},
    visualizationData: {
      type: 'scatter',
      data: {
        x: var1,
        y: var2
      }
    },
    rawResults: executorResult
  }
}

