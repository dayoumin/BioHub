import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

/**
 * 기술통계 실행자
 */
export class DescriptiveExecutor extends BaseExecutor {
  /**
   * 기본 기술통계
   */
  async executeBasicStats(data: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const stats = await pyodideStats.calculateDescriptiveStats(data)

      return {
        metadata: this.createMetadata('기술통계', data.length, startTime),
        mainResults: {
          statistic: stats.mean,
          pvalue: 1,
          interpretation: `평균: ${stats.mean.toFixed(2)}, 표준편차: ${stats.std.toFixed(2)}`
        },
        additionalInfo: {
          summary: stats
        },
        visualizationData: {
          type: 'histogram',
          data: {
            values: data,
            bins: 20
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '기술통계')
    }
  }

  /**
   * 빈도분석
   */
  async executeFrequencyAnalysis(data: string[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      const frequencies = new Map<string, number>()

      data.forEach(value => {
        frequencies.set(value, (frequencies.get(value) || 0) + 1)
      })

      const sortedFreq = Array.from(frequencies.entries())
        .sort((a, b) => b[1] - a[1])

      const total = data.length
      const mode = sortedFreq[0][0]
      const modeCount = sortedFreq[0][1]

      return {
        metadata: this.createMetadata('빈도분석', data.length, startTime),
        mainResults: {
          statistic: sortedFreq.length,
          pvalue: 1,
          interpretation: `범주 수: ${sortedFreq.length}개, 최빈값: ${mode} (${modeCount}회, ${(modeCount/total*100).toFixed(1)}%)`
        },
        additionalInfo: {
          frequencies: Object.fromEntries(sortedFreq),
          percentages: Object.fromEntries(
            sortedFreq.map(([key, count]) => [key, (count / total * 100).toFixed(2)])
          )
        },
        visualizationData: {
          type: 'bar',
          data: {
            labels: sortedFreq.map(f => f[0]),
            values: sortedFreq.map(f => f[1])
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '빈도분석')
    }
  }

  /**
   * 교차표 분석
   */
  async executeCrossTab(data: any[], var1: string, var2: string): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      const crosstab = new Map<string, Map<string, number>>()

      data.forEach(row => {
        const val1 = String(row[var1])
        const val2 = String(row[var2])

        if (!crosstab.has(val1)) {
          crosstab.set(val1, new Map())
        }
        const innerMap = crosstab.get(val1)!
        innerMap.set(val2, (innerMap.get(val2) || 0) + 1)
      })

      // 카이제곱 검정 수행
      const contingencyTable: number[][] = []
      const rowLabels: string[] = []
      const colLabels: string[] = []

      // 모든 고유한 열 값 수집
      const allColValues = new Set<string>()
      crosstab.forEach(innerMap => {
        innerMap.forEach((_, col) => allColValues.add(col))
      })
      colLabels.push(...Array.from(allColValues))

      // 교차표 배열 구성
      crosstab.forEach((innerMap, rowLabel) => {
        rowLabels.push(rowLabel)
        const row: number[] = []
        colLabels.forEach(col => {
          row.push(innerMap.get(col) || 0)
        })
        contingencyTable.push(row)
      })

      const chiSquare = await pyodideStats.chiSquare(contingencyTable)

      return {
        metadata: this.createMetadata('교차표 분석', data.length, startTime),
        mainResults: {
          statistic: chiSquare.statistic,
          pvalue: chiSquare.pvalue,
          df: chiSquare.df,
          interpretation: this.interpretPValue(chiSquare.pvalue)
        },
        additionalInfo: {
          crosstab: Object.fromEntries(
            Array.from(crosstab.entries()).map(([key, innerMap]) =>
              [key, Object.fromEntries(innerMap)]
            )
          ),
          rowLabels,
          colLabels
        },
        visualizationData: {
          type: 'heatmap',
          data: {
            matrix: contingencyTable,
            rowLabels,
            colLabels
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '교차표 분석')
    }
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: any[], options?: any): Promise<AnalysisResult> {
    const { method = 'basic', ...restOptions } = options || {}

    switch (method) {
      case 'basic':
        return this.executeBasicStats(data as number[])
      case 'frequency':
        return this.executeFrequencyAnalysis(data as string[])
      case 'crosstab':
        return this.executeCrossTab(data, restOptions.var1, restOptions.var2)
      default:
        throw new Error(`Unknown descriptive method: ${method}`)
    }
  }
}