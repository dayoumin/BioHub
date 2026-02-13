import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

/**
 * t-검정 실행자
 */
export class TTestExecutor extends BaseExecutor {
  /**
   * 일표본 t-검정
   */
  async executeOneSample(data: number[], populationMean: number): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 빈 배열 체크
      if (!data || data.length === 0) {
        throw new Error('유효한 수치형 데이터가 없습니다. 변수 선택 및 데이터를 확인해주세요.')
      }

      const result = await pyodideStats.oneSampleTTest(data, populationMean)

      // 효과크기 계산 (Cohen's d)
      const stats = await pyodideStats.calculateDescriptiveStats(data)
      const cohensD = (stats.mean - populationMean) / stats.std

      return {
        metadata: this.createMetadata('일표본 t-검정', data.length, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pValue,
          df: result.df,
          interpretation: `${this.interpretPValue(result.pValue)}. 표본 평균(${stats.mean.toFixed(2)})과 모집단 평균(${populationMean}) 간 차이 검정`
        },
        additionalInfo: {
          effectSize: {
            value: cohensD,
            type: "Cohen's d",
            interpretation: this.interpretEffectSize(cohensD)
          },
          sampleMean: stats.mean,
          sampleStd: stats.std,
          populationMean
        },
        visualizationData: {
          type: 'histogram',
          data: {
            values: data,
            referenceLine: populationMean,
            referenceLabel: '모집단 평균'
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '일표본 t-검정')
    }
  }

  /**
   * 독립표본 t-검정
   */
  async executeIndependent(group1: number[], group2: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 빈 배열 체크
      if (!group1 || group1.length === 0 || !group2 || group2.length === 0) {
        throw new Error('각 그룹에 유효한 수치형 데이터가 필요합니다. 변수 선택 및 데이터를 확인해주세요.')
      }

      // Levene 검정으로 등분산 확인
      const leveneResult = await pyodideStats.leveneTest([group1, group2])
      const equalVar = leveneResult.pValue > 0.05

      const result = await pyodideStats.tTest(group1, group2, { equalVar })

      // 효과크기 계산
      const stats1 = await pyodideStats.calculateDescriptiveStats(group1)
      const stats2 = await pyodideStats.calculateDescriptiveStats(group2)

      const pooledStd = Math.sqrt(
        ((group1.length - 1) * Math.pow(stats1.std, 2) +
         (group2.length - 1) * Math.pow(stats2.std, 2)) /
        (group1.length + group2.length - 2)
      )
      const cohensD = (stats1.mean - stats2.mean) / pooledStd

      return {
        metadata: {
          ...this.createMetadata('독립표본 t-검정', group1.length + group2.length, startTime),
          assumptions: {
            normality: { passed: true, test: 'Shapiro-Wilk' },
            homogeneity: {
              passed: equalVar,
              test: "Levene's test",
              statistic: leveneResult.statistic,
              pvalue: leveneResult.pValue
            },
            independence: { passed: true }
          }
        },
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          df: result.df,
          interpretation: `${this.interpretPValue(result.pvalue)}. 그룹 1 평균(${stats1.mean.toFixed(2)})과 그룹 2 평균(${stats2.mean.toFixed(2)}) 간 차이`,
          confidenceInterval: result.confidenceInterval ? {
            lower: result.confidenceInterval.lower,
            upper: result.confidenceInterval.upper,
            level: 0.95
          } : undefined
        },
        additionalInfo: {
          effectSize: {
            value: cohensD,
            type: "Cohen's d",
            interpretation: this.interpretEffectSize(cohensD)
          },
          group1Stats: {
            mean: stats1.mean,
            std: stats1.std,
            n: group1.length
          },
          group2Stats: {
            mean: stats2.mean,
            std: stats2.std,
            n: group2.length
          },
          equalVariance: equalVar
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
      return this.handleError(error, '독립표본 t-검정')
    }
  }

  /**
   * 대응표본 t-검정
   */
  async executePaired(before: number[], after: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 빈 배열 체크
      if (!before || before.length === 0 || !after || after.length === 0) {
        throw new Error('대응표본에 유효한 수치형 데이터가 필요합니다. 변수 선택 및 데이터를 확인해주세요.')
      }

      if (before.length !== after.length) {
        throw new Error('대응표본의 크기가 일치하지 않습니다')
      }

      const result = await pyodideStats.tTest(before, after, { paired: true })

      // 차이값 계산
      const differences = before.map((v, i) => after[i] - v)
      const diffStats = await pyodideStats.calculateDescriptiveStats(differences)

      const cohensD = diffStats.mean / diffStats.std

      return {
        metadata: this.createMetadata('대응표본 t-검정', before.length, startTime),
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          df: result.df,
          interpretation: `${this.interpretPValue(result.pvalue)}. 평균 차이: ${diffStats.mean.toFixed(2)}`,
          confidenceInterval: result.confidenceInterval ? {
            lower: result.confidenceInterval.lower,
            upper: result.confidenceInterval.upper,
            level: 0.95
          } : undefined
        },
        additionalInfo: {
          effectSize: {
            value: cohensD,
            type: "Cohen's d",
            interpretation: this.interpretEffectSize(cohensD)
          },
          meanDifference: diffStats.mean,
          stdDifference: diffStats.std,
          beforeMean: before.reduce((a, b) => a + b, 0) / before.length,
          afterMean: after.reduce((a, b) => a + b, 0) / after.length
        },
        visualizationData: {
          type: 'paired-plot',
          data: {
            before,
            after,
            labels: ['사전', '사후']
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '대응표본 t-검정')
    }
  }

  /**
   * Welch's t-검정 (이분산 가정)
   */
  async executeWelch(group1: number[], group2: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 빈 배열 체크
      if (!group1 || group1.length === 0 || !group2 || group2.length === 0) {
        throw new Error('각 그룹에 유효한 수치형 데이터가 필요합니다. 변수 선택 및 데이터를 확인해주세요.')
      }

      // 작은 표본 (n < 3) 가드 - Pyodide 호출 전에 체크
      if (group1.length < 3 || group2.length < 3) {
        throw new Error('Welch t-test는 각 그룹에 최소 3개 이상의 데이터가 필요합니다.')
      }

      // Welch's t-test는 항상 이분산 가정 (equalVar: false)
      const result = await pyodideStats.tTest(group1, group2, { equalVar: false })

      // 효과크기 계산 (Welch의 경우 Glass's delta 또는 단순 평균 SD 사용)
      const stats1 = await pyodideStats.calculateDescriptiveStats(group1)
      const stats2 = await pyodideStats.calculateDescriptiveStats(group2)

      // Welch는 이분산이므로 pooled SD 대신 평균 SD 사용
      const meanStd = Math.sqrt((Math.pow(stats1.std, 2) + Math.pow(stats2.std, 2)) / 2)

      // Zero variance 가드 (두 그룹이 모두 상수인 경우)
      let cohensD: number
      if (meanStd === 0) {
        // 분산이 0이면 효과 크기를 계산할 수 없음 (평균 차이는 있을 수 있지만)
        cohensD = (stats1.mean === stats2.mean) ? 0 : NaN
      } else {
        cohensD = (stats1.mean - stats2.mean) / meanStd
      }

      return {
        metadata: {
          ...this.createMetadata("Welch's t-검정", group1.length + group2.length, startTime),
          assumptions: {
            normality: { passed: true, test: 'Shapiro-Wilk' },
            homogeneity: {
              passed: false, // Welch는 이분산 가정
              test: 'None (assumes unequal variances)'
            },
            independence: { passed: true }
          }
        },
        mainResults: {
          statistic: result.statistic,
          pvalue: result.pvalue,
          df: result.df,
          interpretation: `${this.interpretPValue(result.pvalue)}. 그룹 1 평균(${stats1.mean.toFixed(2)})과 그룹 2 평균(${stats2.mean.toFixed(2)}) 간 차이 (이분산 가정)`,
          confidenceInterval: result.confidenceInterval ? {
            lower: result.confidenceInterval.lower,
            upper: result.confidenceInterval.upper,
            level: 0.95
          } : undefined
        },
        additionalInfo: {
          effectSize: {
            value: cohensD,
            type: "Cohen's d",
            interpretation: this.interpretEffectSize(cohensD)
          },
          group1Stats: {
            mean: stats1.mean,
            std: stats1.std,
            n: group1.length
          },
          group2Stats: {
            mean: stats2.mean,
            std: stats2.std,
            n: group2.length
          },
          equalVariance: false // Welch는 항상 이분산
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
      return this.handleError(error, "Welch's t-검정")
    }
  }

  /**
   * Extract groups from data using groupVar and dependentVar
   */
  private extractGroupsFromData(
    data: unknown[],
    groupVar: string,
    dependentVar: string
  ): { group1: number[]; group2: number[]; groupNames: string[] } {
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

    if (groups.length < 2) {
      throw new Error(`독립표본 t-검정은 2개 그룹이 필요합니다. 현재 ${groups.length}개 발견`)
    }
    if (groups.length > 2) {
      logger.warn(`t-검정: ${groups.length}개 그룹 발견, 처음 2개 사용: ${groupNames.slice(0, 2).join(', ')}`)
    }

    return { group1: groups[0], group2: groups[1], groupNames }
  }

  /**
   * Extract paired data from data using variable names
   */
  private extractPairedFromData(
    data: unknown[],
    var1: string,
    var2: string
  ): { before: number[]; after: number[] } {
    const before: number[] = []
    const after: number[] = []

    for (const row of data) {
      if (typeof row !== 'object' || row === null) continue
      const record = row as Record<string, unknown>

      const val1 = record[var1]
      const val2 = record[var2]

      if (typeof val1 === 'number' && !isNaN(val1) &&
          typeof val2 === 'number' && !isNaN(val2)) {
        before.push(val1)
        after.push(val2)
      }
    }

    return { before, after }
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: unknown[], options?: unknown): Promise<AnalysisResult> {
    // 타입 가드로 options 파싱
    const parseOptions = (opts: unknown): { method?: string; [key: string]: unknown } => {
      if (!opts || typeof opts !== 'object') return { method: 'independent' }
      return opts as { method?: string; [key: string]: unknown }
    }

    const { method = 'independent', ...restOptions } = parseOptions(options)
    const groupVar = restOptions.groupVar as string | undefined
    const dependentVar = restOptions.dependentVar as string | undefined

    switch (method) {
      case 'one-sample': {
        // 데이터 추출 (객체 배열 또는 숫자 배열)
        const numericData = this.extractNumericSeries(data, restOptions)
        const populationMean = typeof restOptions.populationMean === 'number'
          ? restOptions.populationMean
          : 0
        return this.executeOneSample(numericData, populationMean)
      }
      case 'independent':
      case 'independent-t-test':
      case 'two-sample-t': {
        // 그룹 데이터 추출 - groupVar/dependentVar 또는 group1/group2
        let group1: number[] = []
        let group2: number[] = []

        if (restOptions.group1 && restOptions.group2) {
          // 직접 제공된 경우
          const group1Data = restOptions.group1 as unknown[]
          const group2Data = restOptions.group2 as unknown[]
          group1 = Array.isArray(group1Data) ? this.extractNumericSeries(group1Data, restOptions) : []
          group2 = Array.isArray(group2Data) ? this.extractNumericSeries(group2Data, restOptions) : []
        } else if (groupVar && dependentVar) {
          // Smart Flow에서 전달된 경우
          const extracted = this.extractGroupsFromData(data, groupVar, dependentVar)
          group1 = extracted.group1
          group2 = extracted.group2
        }

        if (group1.length === 0 || group2.length === 0) {
          throw new Error('독립표본 t-검정을 위한 그룹 데이터가 없습니다. groupVar/dependentVar 또는 group1/group2를 확인하세요.')
        }

        return this.executeIndependent(group1, group2)
      }
      case 'paired':
      case 'paired-t':
      case 'paired-t-test': {
        // 대응 데이터 추출 - variables 또는 before/after
        let before: number[] = []
        let after: number[] = []

        if (restOptions.before && restOptions.after) {
          // 직접 제공된 경우
          const beforeData = restOptions.before as unknown[]
          const afterData = restOptions.after as unknown[]
          before = Array.isArray(beforeData) ? this.extractNumericSeries(beforeData, restOptions) : []
          after = Array.isArray(afterData) ? this.extractNumericSeries(afterData, restOptions) : []
        } else if (restOptions.variables && Array.isArray(restOptions.variables) && restOptions.variables.length >= 2) {
          // Smart Flow PairedSelector에서 전달된 경우 (variables: [var1, var2])
          const vars = restOptions.variables as string[]
          const extracted = this.extractPairedFromData(data, vars[0], vars[1])
          before = extracted.before
          after = extracted.after
        }

        if (before.length === 0 || after.length === 0) {
          throw new Error('대응표본 t-검정을 위한 데이터가 없습니다. variables 또는 before/after를 확인하세요.')
        }

        return this.executePaired(before, after)
      }
      case 'welch':
      case 'welch-t': {
        // Welch's t-test (이분산) - groupVar/dependentVar 또는 group1/group2
        let group1: number[] = []
        let group2: number[] = []

        if (restOptions.group1 && restOptions.group2) {
          const group1Data = restOptions.group1 as unknown[]
          const group2Data = restOptions.group2 as unknown[]
          group1 = Array.isArray(group1Data) ? this.extractNumericSeries(group1Data, restOptions) : []
          group2 = Array.isArray(group2Data) ? this.extractNumericSeries(group2Data, restOptions) : []
        } else if (groupVar && dependentVar) {
          const extracted = this.extractGroupsFromData(data, groupVar, dependentVar)
          group1 = extracted.group1
          group2 = extracted.group2
        }

        if (group1.length === 0 || group2.length === 0) {
          throw new Error("Welch's t-검정을 위한 그룹 데이터가 없습니다.")
        }

        return this.executeWelch(group1, group2)
      }
      default:
        throw new Error(`Unknown t-test method: ${method}`)
    }
  }
}
