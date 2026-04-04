import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '@/types/analysis'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'

export async function handleMultivariate(method: StatisticalMethod, data: PreparedData): Promise<StatisticalExecutorResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  const normalizeVarianceToRatio = (value: unknown): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 0
    return value > 1 ? value / 100 : value
  }

  switch (method.id) {
    case 'pca': {
      const pcaResult = await pyodideStats.pcaAnalysis(data.arrays.independent || [])
      const explainedVarianceRatio = (pcaResult.screeData ?? []).map((point) => {
        if (typeof point === 'number') {
          return normalizeVarianceToRatio(point)
        }
        if (point && typeof point === 'object' && 'varianceExplained' in point) {
          return normalizeVarianceToRatio(point.varianceExplained)
        }
        return 0
      })
      const eigenvalues = (pcaResult.screeData ?? []).map((point) => {
        if (point && typeof point === 'object' && 'eigenvalue' in point && typeof point.eigenvalue === 'number') {
          return point.eigenvalue
        }
        return 0
      })

      result = {
        ...pcaResult,
        explainedVariance: explainedVarianceRatio,
        explainedVarianceRatio,
        eigenvalues,
        totalExplainedVariance: explainedVarianceRatio.reduce((sum, value) => sum + value, 0)
      }
      break
    }
    case 'factor-analysis':
      result = await pyodideStats.factorAnalysis(data.arrays.independent || [])
      break
    case 'cluster':
      result = await pyodideStats.clusterAnalysis(data.arrays.independent || [])
      break
    case 'discriminant': {
      // Build row-major matrix from raw data, filtering rows jointly
      // This ensures features and group labels are aligned
      const rawData = data.data as Array<Record<string, unknown>>
      const indVars = (data.variables?.independent || data.variables?.independentVar) as string | string[] | undefined
      const groupVar = (data.variables?.group || data.variables?.groupVar) as string | undefined
      const indNames = indVars ? (Array.isArray(indVars) ? indVars : [indVars]) : []

      // Build aligned arrays from raw data - filter rows where all features AND group are valid
      const alignedRows: { features: number[]; group: unknown }[] = []

      for (const row of rawData) {
        const features: number[] = []
        let allValid = true

        // Check all feature values
        for (const varName of indNames) {
          const val = Number(row[varName])
          if (isNaN(val)) {
            allValid = false
            break
          }
          features.push(val)
        }

        // Check group value
        const groupVal = groupVar ? row[groupVar] : undefined
        if (groupVar && (groupVal === undefined || groupVal === null || groupVal === '')) {
          allValid = false
        }

        if (allValid) {
          alignedRows.push({ features, group: groupVal })
        }
      }

      if (alignedRows.length === 0) {
        throw new Error('Discriminant analysis requires feature data')
      }

      const rowMajorMatrix = alignedRows.map(r => r.features)
      const groupLabels = alignedRows.map(r => r.group)

      if (groupLabels.some(g => g === undefined || g === null)) {
        throw new Error('Discriminant analysis requires a group variable')
      }

      const ldaResult = await pyodideStats.discriminantAnalysis(rowMajorMatrix, groupLabels as (string | number)[])

      result = {
        ...ldaResult,
        accuracy: ldaResult.accuracy || 0
      }
      break
    }
    default:
      throw new Error(`지원되지 않는 다변량 분석: ${method.id}`)
  }

  // Build result based on method type
  if (method.id === 'discriminant') {
    // LDA-specific result mapping
    const ldaAccuracy = result.accuracy || 0
    const ldaTotalVariance = result.totalVariance || 0
    const ldaFunctions = result.functions || []
    const firstFunctionVariance = ldaFunctions.length > 0 ? ldaFunctions[0].varianceExplained || 0 : 0

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
        statistic: ldaAccuracy,
        pvalue: 1, // LDA does not produce p-value directly
        significant: ldaAccuracy > 0.5,
        interpretation: result.interpretation || `Classification accuracy: ${(ldaAccuracy * 100).toFixed(1)}%`
      },
      additionalInfo: {
        effectSize: {
          type: 'Classification Accuracy',
          value: ldaAccuracy,
          interpretation: ldaAccuracy >= 0.9 ? 'Excellent' :
                         ldaAccuracy >= 0.8 ? 'Good' :
                         ldaAccuracy >= 0.7 ? 'Acceptable' : 'Poor'
        },
        discriminantFunctions: {
          count: ldaFunctions.length,
          totalVariance: ldaTotalVariance,
          firstFunctionVariance: firstFunctionVariance
        }
      },
      visualizationData: {
        type: 'discriminant-plot',
        data: result
      },
      rawResults: result
    }
  }

  if (method.id === 'cluster') {
    const clusters = (result.clusters || result.clusterAssignments || []) as number[]
    const centers = (result.centers || result.centroids || []) as number[][]
    const silhouetteScore = Number(result.silhouetteScore || 0)
    const inertia = Number(result.inertia || 0)
    const nClusters = Number(result.nClusters || new Set(clusters).size || 0)

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
        statistic: silhouetteScore,
        pvalue: 1,
        significant: false,
        interpretation: `${nClusters}개 군집 형성. Silhouette score: ${silhouetteScore.toFixed(3)}`
      },
      additionalInfo: {
        clusters,
        centers,
        silhouetteScore,
        inertia,
        nClusters
      },
      visualizationData: {
        type: 'cluster-plot',
        data: {
          points: data.arrays.independent || [],
          clusters,
          centers
        }
      },
      rawResults: result
    }
  }

  // PCA, Factor Analysis - use explainedVariance fields
  const explainedVarianceRatio = Array.isArray(result.explainedVarianceRatio)
    ? result.explainedVarianceRatio.map((value: unknown) => normalizeVarianceToRatio(value))
    : []
  const totalExplainedVariance = typeof result.totalExplainedVariance === 'number'
    ? normalizeVarianceToRatio(result.totalExplainedVariance)
    : typeof result.totalVarianceExplained === 'number'
      ? normalizeVarianceToRatio(result.totalVarianceExplained)
      : explainedVarianceRatio.reduce((sum: number, value: number) => sum + value, 0)
  const firstExplainedVariance = Number(explainedVarianceRatio[0] || result.explainedVariance?.[0] || 0)
  const interpretation = method.id === 'pca'
    ? `첫 주성분이 전체 분산의 ${(firstExplainedVariance * 100).toFixed(1)}% 설명`
    : method.id === 'factor-analysis'
      ? `${explainedVarianceRatio.length}개 요인이 총 ${(totalExplainedVariance * 100).toFixed(1)}% 분산 설명`
      : '분석 완료'

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
      statistic: firstExplainedVariance,
      pvalue: 1, // 다변량 분석은 p-value 없음
      significant: false,
      interpretation
    },
    additionalInfo: {
      effectSize: {
        type: 'Explained Variance',
        value: totalExplainedVariance,
        interpretation: `총 ${(totalExplainedVariance * 100).toFixed(1)}% 분산 설명`
      },
      explainedVarianceRatio,
      eigenvalues: result.eigenvalues,
      loadings: result.loadings ?? result.rotationMatrix,
      communalities: result.communalities
    },
    visualizationData: {
      type: method.id === 'pca' ? 'scree-plot' : 'dendrogram',
      data: result
    },
    rawResults: result
  }
}
