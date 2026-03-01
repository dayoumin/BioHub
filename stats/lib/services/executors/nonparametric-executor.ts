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
          df: result.df,
          interpretation: `${this.interpretPValue(result.pvalue)}. ${k}개 반복측정 조건 간 차이 검정`
        },
        additionalInfo: {
          blocks: n,
          treatments: k
        },
        visualizationData: {
          type: 'line',
          data: {
            conditions: data[0].map((_, i) => `조건 ${i + 1}`)
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
          pvalue: Math.min(...result.comparisons.map(c => c.pValue)),
          interpretation: `Bonferroni 보정 후 ${result.comparisons.filter(c => c.pValue < 0.05).length}개 쌍에서 유의한 차이`
        },
        additionalInfo: {
          postHoc: result.comparisons.map(comp => ({
            group1: comp.group1,
            group2: comp.group2,
            pvalue: comp.pValue,
            significant: comp.significant
          })),
          postHocMethod: 'bonferroni',
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
   * Extract groups from data using groupVar and dependentVar
   */
  private extractGroups(
    data: unknown[],
    groupVar: string,
    dependentVar: string
  ): { groups: number[][]; groupNames: string[] } {
    const groupMap = new Map<string, number[]>()

    for (const row of data) {
      if (typeof row !== 'object' || row === null) continue
      const record = row as Record<string, unknown>

      const groupValue = String(record[groupVar] ?? '')
      const numericValue = record[dependentVar]

      if (typeof numericValue === 'number' && !isNaN(numericValue)) {
        if (!groupMap.has(groupValue)) {
          groupMap.set(groupValue, [])
        }
        groupMap.get(groupValue)!.push(numericValue)
      }
    }

    const groupNames = Array.from(groupMap.keys()).sort()
    const groups = groupNames.map(name => groupMap.get(name)!)

    return { groups, groupNames }
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: unknown[], options?: Record<string, unknown>): Promise<AnalysisResult> {
    const { method = 'mann-whitney', ...restOptions } = options || {}
    const groupVar = restOptions.groupVar as string | undefined
    const dependentVar = restOptions.dependentVar as string | undefined

    switch (method) {
      case 'mann-whitney': {
        // If group1/group2 provided directly, use them
        if (restOptions.group1 && restOptions.group2) {
          return this.executeMannWhitneyU(
            restOptions.group1 as number[],
            restOptions.group2 as number[]
          )
        }
        // Otherwise extract from data using groupVar/dependentVar
        if (groupVar && dependentVar) {
          const { groups, groupNames } = this.extractGroups(data, groupVar, dependentVar)
          if (groups.length < 2) {
            throw new Error(`Mann-Whitney U requires at least 2 groups, found ${groups.length}`)
          }
          if (groups.length > 2) {
            logger.warn(`Mann-Whitney U: Found ${groups.length} groups, using first 2: ${groupNames.slice(0, 2).join(', ')}`)
          }
          return this.executeMannWhitneyU(groups[0], groups[1])
        }
        throw new Error('Mann-Whitney U requires either group1/group2 or groupVar/dependentVar')
      }

      case 'wilcoxon': {
        const x = restOptions.x as number[] | undefined
        if (!x || x.length === 0) {
          throw new Error('Wilcoxon test requires x array')
        }
        return this.executeWilcoxon(x, restOptions.y as number[] | undefined)
      }

      case 'kruskal-wallis': {
        // If groups provided directly, use them
        if (restOptions.groups) {
          return this.executeKruskalWallis(restOptions.groups as number[][])
        }
        // Otherwise extract from data
        if (groupVar && dependentVar) {
          const { groups } = this.extractGroups(data, groupVar, dependentVar)
          if (groups.length < 2) {
            throw new Error(`Kruskal-Wallis requires at least 2 groups, found ${groups.length}`)
          }
          return this.executeKruskalWallis(groups)
        }
        throw new Error('Kruskal-Wallis requires either groups or groupVar/dependentVar')
      }

      case 'friedman':
        return this.executeFriedman(data as number[][])

      case 'dunn': {
        if (restOptions.groups) {
          return this.executeDunn(restOptions.groups as number[][])
        }
        if (groupVar && dependentVar) {
          const { groups } = this.extractGroups(data, groupVar, dependentVar)
          return this.executeDunn(groups)
        }
        throw new Error('Dunn test requires either groups or groupVar/dependentVar')
      }

      default:
        throw new Error(`Unknown nonparametric method: ${method}`)
    }
  }
}
