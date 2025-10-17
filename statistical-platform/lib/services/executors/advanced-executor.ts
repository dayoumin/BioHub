import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

/**
 * 고급 통계 분석 실행자
 */
export class AdvancedExecutor extends BaseExecutor {
  /**
   * 주성분분석 (PCA)
   */
  async executePCA(data: number[][], nComponents: number = 2): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.pcaAnalysis(data, nComponents)

      const totalVariance = result.explainedVarianceRatio.reduce((a: number, b: number) => a + b, 0)

      return {
        metadata: this.createMetadata('주성분분석', data.length, startTime),
        mainResults: {
          statistic: totalVariance,
          pvalue: 1,
          interpretation: `첫 ${nComponents}개 주성분이 전체 분산의 ${(totalVariance * 100).toFixed(1)}%를 설명`
        },
        additionalInfo: {
          components: result.components,
          explainedVarianceRatio: result.explainedVarianceRatio,
          explainedVariance: result.explainedVariance,
          cumulativeVariance: result.cumulativeVariance,
          nComponents
        },
        visualizationData: {
          type: 'pca-biplot',
          data: {
            transformedData: result.components,
            loadings: result.components
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '주성분분석')
    }
  }

  /**
   * 요인분석
   */
  async executeFactorAnalysis(data: number[][], options?: any): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.factorAnalysis(data, options)

      const totalVariance = result.explainedVariance.reduce((a, b) => a + b, 0)

      return {
        metadata: this.createMetadata('요인분석', data.length, startTime),
        mainResults: {
          statistic: totalVariance,
          pvalue: 1,
          interpretation: `${result.loadings[0].length}개 요인이 추출됨. 총 설명 분산: ${(totalVariance * 100).toFixed(1)}%`
        },
        additionalInfo: {
          loadings: result.loadings,
          communalities: result.communalities,
          explainedVariance: result.explainedVariance,
          eigenvalues: result.eigenvalues,
          rotation: options?.rotation || 'varimax'
        },
        visualizationData: {
          type: 'factor-loadings',
          data: {
            loadings: result.loadings,
            variables: data[0].map((_, i) => `변수 ${i + 1}`)
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '요인분석')
    }
  }

  /**
   * 군집분석
   */
  async executeClusterAnalysis(data: number[][], options?: any): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.clusterAnalysis(data, options)

      const nClusters = new Set(result.clusters).size

      return {
        metadata: this.createMetadata('군집분석', data.length, startTime),
        mainResults: {
          statistic: result.silhouetteScore,
          pvalue: 1,
          interpretation: `${nClusters}개 군집 형성. Silhouette score: ${result.silhouetteScore.toFixed(3)}`
        },
        additionalInfo: {
          clusters: result.clusters,
          centers: result.centers,
          silhouetteScore: result.silhouetteScore,
          inertia: result.inertia,
          method: options?.method || 'kmeans'
        },
        visualizationData: {
          type: 'cluster-plot',
          data: {
            points: data,
            clusters: result.clusters,
            centers: result.centers
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '군집분석')
    }
  }

  /**
   * 시계열 분석
   */
  async executeTimeSeriesAnalysis(data: number[], options?: any): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.timeSeriesAnalysis(data, options)

      const hasTrend = result.trend && this.calculateTrendStrength(result.trend) > 0.3
      const hasSeasonal = result.seasonal && Math.max(...result.seasonal.map(Math.abs)) > 0.1

      const interpretation = []
      if (hasTrend) interpretation.push('추세 존재')
      if (hasSeasonal) interpretation.push('계절성 존재')
      if (!hasTrend && !hasSeasonal) interpretation.push('정상 시계열')

      return {
        metadata: this.createMetadata('시계열 분석', data.length, startTime),
        mainResults: {
          statistic: result.acf?.[1] || 0,
          pvalue: 1,
          interpretation: interpretation.join(', ')
        },
        additionalInfo: {
          trend: result.trend,
          seasonal: result.seasonal,
          residual: result.residual,
          forecast: result.forecast,
          acf: result.acf,
          pacf: result.pacf,
          method: options?.method || 'decomposition'
        },
        visualizationData: {
          type: 'time-series',
          data: {
            original: data,
            trend: result.trend,
            seasonal: result.seasonal,
            forecast: result.forecast
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '시계열 분석')
    }
  }

  /**
   * 신뢰도 분석 (Cronbach's Alpha)
   */
  async executeCronbachAlpha(data: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.cronbachAlpha(data)

      const interpretation = this.interpretCronbachAlpha(result.alpha)

      return {
        metadata: this.createMetadata('신뢰도 분석', data.length, startTime),
        mainResults: {
          statistic: result.alpha,
          pvalue: 1,
          interpretation: `Cronbach's α = ${result.alpha.toFixed(3)} (${interpretation})`
        },
        additionalInfo: {
          alpha: result.alpha,
          itemTotalCorrelations: result.itemTotalCorrelations,
          nItems: data[0].length,
          nCases: data.length,
          reliability: interpretation
        },
        visualizationData: {
          type: 'bar',
          data: {
            labels: data[0].map((_, i) => `항목 ${i + 1}`),
            values: result.itemTotalCorrelations
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '신뢰도 분석')
    }
  }

  /**
   * 검정력 분석
   */
  async executePowerAnalysis(
    effectSize: number,
    sampleSize: number,
    alpha: number = 0.05,
    testType: 't-test' | 'anova' | 'correlation' = 't-test'
  ): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 간단한 검정력 계산 (근사)
      const power = this.calculatePower(effectSize, sampleSize, alpha, testType)

      const interpretation = power >= 0.8
        ? '충분한 검정력'
        : power >= 0.5
        ? '중간 수준의 검정력'
        : '낮은 검정력'

      return {
        metadata: this.createMetadata('검정력 분석', 1, startTime),
        mainResults: {
          statistic: power,
          pvalue: 1,
          interpretation: `검정력 = ${(power * 100).toFixed(1)}% (${interpretation})`
        },
        additionalInfo: {
          power,
          effectSize,
          sampleSize,
          alpha,
          testType,
          requiredSampleSize: this.calculateRequiredSampleSize(effectSize, alpha, 0.8, testType)
        },
        visualizationData: {
          type: 'power-curve',
          data: {
            sampleSizes: Array.from({ length: 50 }, (_, i) => (i + 1) * 10),
            powers: Array.from({ length: 50 }, (_, i) =>
              this.calculatePower(effectSize, (i + 1) * 10, alpha, testType)
            )
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '검정력 분석')
    }
  }

  /**
   * 추세 강도 계산
   */
  private calculateTrendStrength(trend: number[]): number {
    const n = trend.length
    const x = Array.from({ length: n }, (_, i) => i)
    const xMean = n / 2
    const yMean = trend.reduce((a, b) => a + b, 0) / n

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (trend[i] - yMean), 0)
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0)

    return Math.abs(numerator / denominator)
  }

  /**
   * Cronbach's Alpha 해석
   */
  private interpretCronbachAlpha(alpha: number): string {
    if (alpha >= 0.9) return '우수한 신뢰도'
    if (alpha >= 0.8) return '좋은 신뢰도'
    if (alpha >= 0.7) return '수용 가능한 신뢰도'
    if (alpha >= 0.6) return '의문스러운 신뢰도'
    return '낮은 신뢰도'
  }

  /**
   * 검정력 계산 (근사)
   */
  private calculatePower(
    effectSize: number,
    sampleSize: number,
    alpha: number,
    testType: string
  ): number {
    // 간단한 근사 공식
    const z = 1.96 // alpha = 0.05
    const delta = effectSize * Math.sqrt(sampleSize / 2)
    const power = 1 - this.normalCDF(-delta + z)
    return Math.min(Math.max(power, 0), 1)
  }

  /**
   * 필요 표본 크기 계산
   */
  private calculateRequiredSampleSize(
    effectSize: number,
    alpha: number,
    power: number,
    testType: string
  ): number {
    const zAlpha = 1.96 // alpha = 0.05
    const zBeta = 0.84 // power = 0.8
    const n = Math.pow((zAlpha + zBeta) / effectSize, 2) * 2
    return Math.ceil(n)
  }

  /**
   * 표준정규분포 CDF
   */
  private normalCDF(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x))
    const d = 0.3989423 * Math.exp(-x * x / 2)
    const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
    return x > 0 ? 1 - probability : probability
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: any[], options?: any): Promise<AnalysisResult> {
    const { method = 'pca', ...restOptions } = options || {}

    switch (method) {
      case 'pca':
        return this.executePCA(data as number[][], restOptions.nComponents)
      case 'factor':
        return this.executeFactorAnalysis(data as number[][], restOptions)
      case 'cluster':
        return this.executeClusterAnalysis(data as number[][], restOptions)
      case 'time-series':
        return this.executeTimeSeriesAnalysis(data as number[], restOptions)
      case 'cronbach':
        return this.executeCronbachAlpha(data as number[][])
      case 'power':
        return this.executePowerAnalysis(
          restOptions.effectSize,
          restOptions.sampleSize,
          restOptions.alpha,
          restOptions.testType
        )
      default:
        throw new Error(`Unknown advanced method: ${method}`)
    }
  }
}