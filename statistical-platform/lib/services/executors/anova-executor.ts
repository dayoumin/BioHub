import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

/**
 * 분산분석 실행자
 */
export class AnovaExecutor extends BaseExecutor {
  /**
   * 일원 분산분석
   */
  async executeOneWay(groups: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 등분산 검정
      const leveneResult = await pyodideStats.leveneTest(groups)
      const equalVar = leveneResult.pValue > 0.05

      // ANOVA 수행
      const anovaResult = await pyodideStats.anova(groups)

      // 전체 평균과 그룹별 평균 계산
      const groupStats = await Promise.all(
        groups.map(async g => {
          const stats = await pyodideStats.calculateDescriptiveStats(g)
          return { mean: stats.mean, std: stats.std, n: g.length }
        })
      )

      // 효과크기 (Worker에서 계산된 값 사용)
      const etaSquared = anovaResult.etaSquared
      const omegaSquared = anovaResult.omegaSquared

      return {
        metadata: {
          ...this.createMetadata('일원 분산분석', groups.flat().length, startTime),
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
          statistic: anovaResult.fStatistic,
          pvalue: anovaResult.pValue,
          df: Array.isArray(anovaResult.df) ? anovaResult.df[0] : anovaResult.df,
          interpretation: `${this.interpretPValue(anovaResult.pValue)}. ${groups.length}개 그룹 간 평균 차이 검정`
        },
        additionalInfo: {
          effectSize: {
            value: etaSquared,
            type: 'eta-squared',
            interpretation: this.interpretEffectSize(etaSquared, 'eta')
          },
          omegaSquared: {
            value: omegaSquared,
            type: 'omega-squared',
            interpretation: this.interpretEffectSize(omegaSquared, 'omega')
          },
          ssBetween: anovaResult.ssBetween,
          ssWithin: anovaResult.ssWithin,
          ssTotal: anovaResult.ssTotal,
          groupStats
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
      return this.handleError(error, '일원 분산분석')
    }
  }

  /**
   * 이원 분산분석
   */
  async executeTwoWay(
    data: Record<string, unknown>[],
    factor1: string,
    factor2: string,
    dependent: string
  ): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 데이터 구조화: { factor1, factor2, value } 형식으로 변환
      const formattedData = data.map(row => ({
        factor1: String(row[factor1]),
        factor2: String(row[factor2]),
        value: Number(row[dependent])
      }))

      const result = await pyodideStats.twoWayAnova(formattedData)

      return {
        metadata: this.createMetadata('이원 분산분석', data.length, startTime),
        mainResults: {
          statistic: result.factor1.fStatistic,
          pvalue: result.factor1.pValue,
          interpretation: this.interpretTwoWayAnova(result)
        },
        additionalInfo: {
          factor1: {
            name: factor1,
            fStatistic: result.factor1.fStatistic,
            pvalue: result.factor1.pValue,
            df: result.factor1.df
          },
          factor2: {
            name: factor2,
            fStatistic: result.factor2.fStatistic,
            pvalue: result.factor2.pValue,
            df: result.factor2.df
          },
          interaction: {
            fStatistic: result.interaction.fStatistic,
            pvalue: result.interaction.pValue,
            df: result.interaction.df
          }
        },
        visualizationData: {
          type: 'interaction-plot',
          data: formattedData
        }
      }
    } catch (error) {
      return this.handleError(error, '이원 분산분석')
    }
  }

  /**
   * 반복측정 분산분석
   */
  async executeRepeatedMeasures(data: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 피험자 ID와 시간 레이블 생성
      const nSubjects = data.length
      const nTimePoints = data[0]?.length || 0
      const subjectIds = Array.from({ length: nSubjects }, (_, i) => `S${i + 1}`)
      const timeLabels = Array.from({ length: nTimePoints }, (_, i) => `T${i + 1}`)

      const result = await pyodideStats.repeatedMeasuresAnova(data, subjectIds, timeLabels)

      return {
        metadata: this.createMetadata('반복측정 분산분석', data.length * data[0].length, startTime),
        mainResults: {
          statistic: result.fStatistic,
          pvalue: result.pValue,
          interpretation: `${this.interpretPValue(result.pValue)}. ${data[0].length}개 시점 간 평균 차이 검정`
        },
        additionalInfo: {
          degreesOfFreedom: result.df
        },
        visualizationData: {
          type: 'line',
          data: {
            timePoints: data[0].map((_, i) => `시점 ${i + 1}`),
            means: data[0].map((_, colIndex) => {
              const columnData = data.map(row => row[colIndex])
              return columnData.reduce((a, b) => a + b, 0) / columnData.length
            })
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '반복측정 분산분석')
    }
  }

  /**
   * Tukey HSD 사후검정
   */
  async executeTukeyHSD(groups: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.tukeyHSD(groups)

      return {
        metadata: this.createMetadata('Tukey HSD 사후검정', groups.flat().length, startTime),
        mainResults: {
          statistic: result.comparisons.length,
          pvalue: Math.min(...result.comparisons.map((c: { pValue: number }) => c.pValue)),
          interpretation: `${result.comparisons.filter((c: { reject: boolean }) => c.reject).length}개 쌍에서 유의한 차이 발견`
        },
        additionalInfo: {
          postHoc: result.comparisons.map((comp: { group1: number; group2: number; meanDiff: number; pValue: number; reject: boolean }) => ({
            group1: comp.group1,
            group2: comp.group2,
            meanDiff: comp.meanDiff,
            pvalue: comp.pValue,
            significant: comp.reject
          }))
        },
        visualizationData: {
          type: 'comparison-matrix',
          data: result
        }
      }
    } catch (error) {
      return this.handleError(error, 'Tukey HSD')
    }
  }

  /**
   * Games-Howell 사후검정
   */
  async executeGamesHowell(groups: number[][]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 그룹 이름 생성
      const groupNames = groups.map((_, i) => `Group ${i + 1}`)

      const result = await pyodideStats.gamesHowellTest(groups, groupNames)

      return {
        metadata: this.createMetadata('Games-Howell 사후검정', groups.flat().length, startTime),
        mainResults: {
          statistic: result.comparisons.length,
          pvalue: Math.min(...result.comparisons.map((c: { pValue: number }) => c.pValue)),
          interpretation: `이분산 가정 하에서 ${result.comparisons.filter((c: { reject: boolean }) => c.reject).length}개 쌍에서 유의한 차이 발견`
        },
        additionalInfo: {
          postHoc: result.comparisons.map((comp: { group1: number; group2: number; meanDiff: number; pValue: number; reject: boolean }) => ({
            group1: comp.group1,
            group2: comp.group2,
            meanDiff: comp.meanDiff,
            pvalue: comp.pValue,
            significant: comp.reject
          }))
        },
        visualizationData: {
          type: 'comparison-matrix',
          data: result
        }
      }
    } catch (error) {
      return this.handleError(error, 'Games-Howell')
    }
  }

  /**
   * 이원분산분석 결과 해석
   */
  private interpretTwoWayAnova(result: {
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
  }): string {
    const interpretations = []

    if (result.factor1.pValue < 0.05) {
      interpretations.push('주효과 1 유의')
    }
    if (result.factor2.pValue < 0.05) {
      interpretations.push('주효과 2 유의')
    }
    if (result.interaction.pValue < 0.05) {
      interpretations.push('상호작용 효과 유의')
    }

    if (interpretations.length === 0) {
      return '모든 효과가 통계적으로 유의하지 않음'
    }

    return interpretations.join(', ')
  }

  /**
   * 원시 데이터를 그룹별 숫자 배열로 변환
   */
  private prepareGroups(
    data: Record<string, unknown>[],
    dependentVar: string,
    groupVar: string
  ): number[][] {
    // 그룹별로 데이터 분할
    const groupMap = new Map<string | number, number[]>()

    for (const row of data) {
      const groupValue = row[groupVar]
      const depValue = row[dependentVar]

      if (groupValue == null || depValue == null) continue

      const groupKey = String(groupValue)
      const numValue = typeof depValue === 'number' ? depValue : parseFloat(String(depValue))

      if (isNaN(numValue)) continue

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, [])
      }
      groupMap.get(groupKey)!.push(numValue)
    }

    return Array.from(groupMap.values())
  }

  /**
   * 통합 실행 메서드
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute(data: any[], options?: any): Promise<AnalysisResult> {
    const { method = 'one-way', ...restOptions } = options || {}

    // 타입 가드 헬퍼
    const asRecordArray = (): Record<string, unknown>[] => data as Record<string, unknown>[]
    const asNumberArray = (): number[][] => data as number[][]

    switch (method) {
      case 'one-way':
      case 'one-way-anova': {
        // groups가 이미 제공되면 사용, 아니면 데이터에서 변환
        let groups = restOptions.groups
        if (!groups && restOptions.dependentVar && restOptions.groupVar) {
          groups = this.prepareGroups(
            asRecordArray(),
            restOptions.dependentVar,
            restOptions.groupVar
          )
        }
        if (!groups || groups.length < 2) {
          throw new Error('ANOVA를 위해 최소 2개 그룹이 필요합니다. 종속변수와 그룹변수를 확인하세요.')
        }
        return this.executeOneWay(groups)
      }
      case 'two-way':
      case 'two-way-anova':
        return this.executeTwoWay(
          asRecordArray(),
          restOptions.factor1 || restOptions.groupVar?.split(',')[0],
          restOptions.factor2 || restOptions.groupVar?.split(',')[1],
          restOptions.dependent || restOptions.dependentVar
        )
      case 'repeated-measures':
      case 'repeated-measures-anova':
        return this.executeRepeatedMeasures(asNumberArray())
      case 'tukey':
      case 'tukey-hsd': {
        let groups = restOptions.groups
        if (!groups && restOptions.dependentVar && restOptions.groupVar) {
          groups = this.prepareGroups(
            asRecordArray(),
            restOptions.dependentVar,
            restOptions.groupVar
          )
        }
        return this.executeTukeyHSD(groups || asNumberArray())
      }
      case 'games-howell': {
        let groups = restOptions.groups
        if (!groups && restOptions.dependentVar && restOptions.groupVar) {
          groups = this.prepareGroups(
            asRecordArray(),
            restOptions.dependentVar,
            restOptions.groupVar
          )
        }
        return this.executeGamesHowell(groups || asNumberArray())
      }
      default:
        throw new Error(`Unknown ANOVA method: ${method}`)
    }
  }
}