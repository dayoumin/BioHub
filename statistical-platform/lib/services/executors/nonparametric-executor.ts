import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

/**
 * 비모수 검정 실행자
 */
export class NonparametricExecutor extends BaseExecutor {
  /**
   * Mann-Whitney U 검정
   */
  async executeMannWhitneyU(group1: number[], group2: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.mannWhitneyU(group1, group2)

      // 중위수 계산
      const median1 = this.calculateMedian(group1)
      const median2 = this.calculateMedian(group2)

      // 효과크기 (r = Z / sqrt(N))
      const n = group1.length + group2.length
      const z = result.statistic / Math.sqrt(n)
      const effectSize = Math.abs(z)

      return {
        metadata: this.createMetadata('Mann-Whitney U 검정', n, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          interpretation: `${this.interpretPValue(result.pvalue)}. 그룹 1 중위수(${median1.toFixed(2)})와 그룹 2 중위수(${median2.toFixed(2)}) 비교`
        },
        additionalInfo: {
          effectSize: {
            value: effectSize,
            type: 'rank-biserial r',
            interpretation: this.interpretRankEffectSize(effectSize)
          },
          median1,
          median2,
          rankSum1: 0, // result.rankSum1 not available
          rankSum2: 0  // result.rankSum2 not available
        },
        visualizationData: {
          type: 'boxplot',
          data: {
            groups: ['그룹 1', '그룹 2'],
            values: [group1, group2]
          }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Mann-Whitney U 검정')
    }
  }

  /**
   * Wilcoxon 부호순위 검정
   */
  async executeWilcoxon(x: number[], y?: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // y가 없으면 기본값 사용 (모두 0과의 비교)
      const group2 = y || new Array(x.length).fill(0)
      const result = await pyodideStats.wilcoxon(x, group2)

      const isPaired = y !== undefined
      const description = isPaired
        ? '대응표본 간 차이의 중위수 검정'
        : '일표본 중위수 검정'

      return {
        metadata: this.createMetadata('Wilcoxon 부호순위 검정', x.length, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          interpretation: `${this.interpretPValue(result.pvalue)}. ${description}`
        },
        additionalInfo: {
          zStatistic: result.statistic,
          isPaired,
          medianDifference: isPaired ? this.calculateMedian(x.map((v, i) => v - (y![i] || 0))) : this.calculateMedian(x)
        },
        visualizationData: {
          type: isPaired ? 'paired-plot' : 'histogram',
          data: isPaired ? { before: x, after: y } : { values: x }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Wilcoxon 검정')
    }
  }

  /**
   * Kruskal-Wallis 검정
   */
  async executeKruskalWallis(groups: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.kruskalWallis(groups)

      // 그룹별 중위수
      const medians = groups.map(g => this.calculateMedian(g))

      // 효과크기 (epsilon-squared)
      const n = groups.flat().length
      const k = groups.length
      const epsilonSquared = (result.statistic - k + 1) / (n - k)

      return {
        metadata: this.createMetadata('Kruskal-Wallis 검정', n, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          df: result.df,
          interpretation: `${this.interpretPValue(result.pvalue)}. ${k}개 그룹 간 중위수 차이 검정`
        },
        additionalInfo: {
          effectSize: {
            value: epsilonSquared,
            type: 'epsilon-squared',
            interpretation: this.interpretEffectSize(epsilonSquared, 'eta')
          },
          medians,
          meanRanks: [] // result.meanRanks not available
        },
        visualizationData: {
          type: 'boxplot',
          data: {
            groups: groups.map((_, i) => `그룹 ${i + 1}`),
            values: groups
          }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Kruskal-Wallis 검정')
    }
  }

  /**
   * Friedman 검정
   */
  async executeFriedman(data: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.friedman(data)

      const k = data[0].length // 처리 수
      const n = data.length // 블록 수

      return {
        metadata: this.createMetadata('Friedman 검정', n * k, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          interpretation: `${this.interpretPValue(result.pvalue)}. ${k}개 반복측정 조건 간 차이 검정`
        },
        additionalInfo: {
          rankings: result.rankings,
          blocks: n,
          treatments: k
        },
        visualizationData: {
          type: 'line',
          data: {
            conditions: data[0].map((_, i) => `조건 ${i + 1}`),
            meanRanks: result.rankings
          }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Friedman 검정')
    }
  }

  /**
   * Dunn's 사후검정
   */
  async executeDunn(groups: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 그룹 이름 생성
      const groupNames = groups.map((_, i) => `Group ${i + 1}`)

      const result = await pyodideStats.dunnTest(groups, groupNames)

      return {
        metadata: this.createMetadata("Dunn's 사후검정", groups.flat().length, startTime),
        mainResults: {
          statistic: result.comparisons.length,
          pvalue: Math.min(...result.comparisons.map((c: { pValueAdj: number }) => c.pValueAdj)),
          interpretation: `Bonferroni 보정 후 ${result.comparisons.filter((c: { pValueAdj: number }) => c.pValueAdj < 0.05).length}개 쌍에서 유의한 차이`
        },
        additionalInfo: {
          postHoc: result.comparisons.map((comp: { group1: number; group2: number; zStatistic: number; pValue: number; pValueAdj: number }) => ({
            group1: comp.group1,
            group2: comp.group2,
            zStatistic: comp.zStatistic,
            pvalue: comp.pValue,
            pvalueAdjusted: comp.pValueAdj,
            significant: comp.pValueAdj < 0.05
          }))
        },
        visualizationData: {
          type: 'comparison-matrix',
          data: result
        }
      }
    } catch (error) {
      return this.handleError(error, "Dunn's 검정")
    }
  }

  /**
   * 중위수 계산 헬퍼
   */
  private calculateMedian(arr: number[]): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }

  /**
   * 순위 기반 효과크기 해석
   */
  private interpretRankEffectSize(r: number): string {
    const absR = Math.abs(r)
    if (absR < 0.1) return '무시할 수준'
    if (absR < 0.3) return '작은 효과'
    if (absR < 0.5) return '중간 효과'
    return '큰 효과'
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: any[], options?: any): Promise<AnalysisResult> {
    const { method = 'mann-whitney', ...restOptions } = options || {}

    switch (method) {
      case 'mann-whitney':
        return this.executeMannWhitneyU(restOptions.group1, restOptions.group2)
      case 'wilcoxon':
        return this.executeWilcoxon(restOptions.x, restOptions.y)
      case 'kruskal-wallis':
        return this.executeKruskalWallis(restOptions.groups || data)
      case 'friedman':
        return this.executeFriedman(data as number[][])
      case 'dunn':
        return this.executeDunn(restOptions.groups || data)
      default:
        throw new Error(`Unknown nonparametric method: ${method}`)
    }
  }
}