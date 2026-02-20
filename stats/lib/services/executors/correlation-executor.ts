import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'

/**
 * 상관분석 실행자
 * - Pearson, Spearman, Kendall 상관계수
 * - 편상관분석
 */
export class CorrelationExecutor extends BaseExecutor {
  /**
   * Pearson 상관분석
   */
  async executePearson(x: number[], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.correlationTest(x, y, 'pearson')

      return {
        metadata: this.createMetadata('Pearson 상관분석', x.length, startTime),
        mainResults: {
          statistic: result.correlation,
          pvalue: result.pValue,
          interpretation: `r = ${result.correlation.toFixed(4)} (${this.interpretCorrelation(result.correlation)}), ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          effectSize: {
            value: result.correlation,
            type: 'Pearson r',
            interpretation: this.interpretCorrelation(result.correlation)
          },
          rSquared: result.correlation ** 2,
          method: 'pearson'
        },
        visualizationData: {
          type: 'scatter',
          data: { x, y }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Pearson 상관분석')
    }
  }

  /**
   * Spearman 상관분석
   */
  async executeSpearman(x: number[], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.correlationTest(x, y, 'spearman')

      return {
        metadata: this.createMetadata('Spearman 상관분석', x.length, startTime),
        mainResults: {
          statistic: result.correlation,
          pvalue: result.pValue,
          interpretation: `ρ = ${result.correlation.toFixed(4)} (${this.interpretCorrelation(result.correlation)}), ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          effectSize: {
            value: result.correlation,
            type: 'Spearman rho',
            interpretation: this.interpretCorrelation(result.correlation)
          },
          method: 'spearman'
        },
        visualizationData: {
          type: 'scatter',
          data: { x, y }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Spearman 상관분석')
    }
  }

  /**
   * Kendall 상관분석
   */
  async executeKendall(x: number[], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.correlationTest(x, y, 'kendall')

      return {
        metadata: this.createMetadata('Kendall 상관분석', x.length, startTime),
        mainResults: {
          statistic: result.correlation,
          pvalue: result.pValue,
          interpretation: `τ = ${result.correlation.toFixed(4)} (${this.interpretCorrelation(result.correlation)}), ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          effectSize: {
            value: result.correlation,
            type: 'Kendall tau',
            interpretation: this.interpretCorrelation(result.correlation)
          },
          method: 'kendall'
        },
        visualizationData: {
          type: 'scatter',
          data: { x, y }
        }
      }
    } catch (error) {
      return this.handleError(error, 'Kendall 상관분석')
    }
  }

  /**
   * 종합 상관분석 (Pearson + Spearman + Kendall)
   */
  async executeCorrelation(x: number[], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.correlation(x, y)

      // 기본적으로 Pearson 결과를 메인으로 사용
      const pearson = result.pearson

      return {
        metadata: this.createMetadata('상관분석', x.length, startTime),
        mainResults: {
          statistic: pearson.r,
          pvalue: pearson.pValue,
          interpretation: `Pearson r = ${pearson.r.toFixed(4)} (${this.interpretCorrelation(pearson.r)}), ${this.interpretPValue(pearson.pValue)}`
        },
        additionalInfo: {
          effectSize: {
            value: pearson.r,
            type: 'Pearson r',
            interpretation: this.interpretCorrelation(pearson.r)
          },
          rSquared: pearson.r ** 2,
          pearson: result.pearson,
          spearman: result.spearman,
          kendall: result.kendall
        },
        visualizationData: {
          type: 'scatter',
          data: { x, y }
        }
      }
    } catch (error) {
      return this.handleError(error, '상관분석')
    }
  }

  /**
   * 편상관분석
   * @param dataMatrix - 데이터 행렬 (각 열이 변수)
   * @param xIdx - X 변수 인덱스
   * @param yIdx - Y 변수 인덱스
   * @param controlIndices - 통제 변수 인덱스들
   */
  async executePartialCorrelation(
    dataMatrix: number[][],
    xIdx: number = 0,
    yIdx: number = 1,
    controlIndices: number[] = []
  ): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.partialCorrelationWorker(dataMatrix, xIdx, yIdx, controlIndices)

      return {
        metadata: this.createMetadata('편상관분석', dataMatrix.length, startTime),
        mainResults: {
          statistic: result.correlation,
          pvalue: result.pValue,
          df: result.df,
          interpretation: `편상관계수 = ${result.correlation.toFixed(4)} (${this.interpretCorrelation(result.correlation)}), ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          effectSize: {
            value: result.correlation,
            type: 'Partial r',
            interpretation: this.interpretCorrelation(result.correlation)
          },
          controlledVariables: controlIndices.length
        },
        visualizationData: {
          type: 'scatter',
          data: { xIdx, yIdx }
        }
      }
    } catch (error) {
      return this.handleError(error, '편상관분석')
    }
  }

  /**
   * 상관계수 해석
   */
  private interpretCorrelation(r: number): string {
    const absR = Math.abs(r)
    if (absR < 0.1) return '거의 없음'
    if (absR < 0.3) return '약한 상관'
    if (absR < 0.5) return '보통 상관'
    if (absR < 0.7) return '강한 상관'
    if (absR < 0.9) return '매우 강한 상관'
    return '완전 상관'
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: unknown[], options?: unknown): Promise<AnalysisResult> {
    // 타입 가드로 options 파싱
    const parseOptions = (opts: unknown): {
      method?: string
      x?: number[]
      y?: number[]
      covariates?: number[][]
      variables?: string[]
      dependentVar?: string
      independentVar?: string | string[]
      [key: string]: unknown
    } => {
      if (!opts || typeof opts !== 'object') return { method: 'correlation' }
      return opts as ReturnType<typeof parseOptions>
    }

    const { method = 'correlation', ...restOptions } = parseOptions(options)

    // x, y 데이터 추출
    let x: number[] | undefined = restOptions.x
    let y: number[] | undefined = restOptions.y

    // 변수명으로 데이터 추출
    if (!x || !y) {
      const rows = data as Array<Record<string, unknown>>

      // dependentVar, independentVar로 추출 시도
      if (restOptions.dependentVar && restOptions.independentVar) {
        const depVar = restOptions.dependentVar
        const indepVar = Array.isArray(restOptions.independentVar)
          ? restOptions.independentVar[0]
          : restOptions.independentVar

        x = rows.map(row => Number(row[depVar])).filter(v => !isNaN(v))
        y = rows.map(row => Number(row[indepVar])).filter(v => !isNaN(v))
      }
      // variables로 추출 시도
      else if (restOptions.variables && restOptions.variables.length >= 2) {
        x = rows.map(row => Number(row[restOptions.variables![0]])).filter(v => !isNaN(v))
        y = rows.map(row => Number(row[restOptions.variables![1]])).filter(v => !isNaN(v))
      }
      // 첫 두 컬럼 사용
      else if (rows.length > 0) {
        const cols = Object.keys(rows[0])
        if (cols.length >= 2) {
          x = rows.map(row => Number(row[cols[0]])).filter(v => !isNaN(v))
          y = rows.map(row => Number(row[cols[1]])).filter(v => !isNaN(v))
        }
      }
    }

    if (!x || !y || x.length < 3 || y.length < 3) {
      throw new Error('상관분석을 위해 최소 3개 이상의 데이터가 필요합니다.')
    }

    // 길이 맞추기
    const minLen = Math.min(x.length, y.length)
    x = x.slice(0, minLen)
    y = y.slice(0, minLen)

    switch (method) {
      case 'pearson':
      case 'pearson-correlation':
        return this.executePearson(x, y)

      case 'spearman':
      case 'spearman-correlation':
        return this.executeSpearman(x, y)

      case 'kendall':
      case 'kendall-correlation':
        return this.executeKendall(x, y)

      case 'partial':
      case 'partial-correlation': {
        // 편상관분석은 데이터 행렬과 인덱스로 호출
        const dataMatrix = [x, y, ...(restOptions.covariates || [])]
        const controlIndices = restOptions.covariates
          ? Array.from({ length: (restOptions.covariates as number[][]).length }, (_, i) => i + 2)
          : []
        return this.executePartialCorrelation(dataMatrix, 0, 1, controlIndices)
      }

      case 'correlation':
      default:
        return this.executeCorrelation(x, y)
    }
  }
}