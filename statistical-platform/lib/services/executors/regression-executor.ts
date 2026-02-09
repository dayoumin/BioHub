import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'

/**
 * 회귀분석 실행자
 */
export class RegressionExecutor extends BaseExecutor {
  /**
   * 단순선형회귀
   */
  async executeSimpleLinear(x: number[], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.regression(x, y)

      // RMSE 계산을 위한 예측값/잔차 준비
      const slope = result.slope ?? 0
      const intercept = result.intercept ?? 0

      // 예측값 및 잔차 계산
      const predictions = x.map(xi => slope * xi + intercept)
      const residuals = y.map((yi, i) => yi - predictions[i])

      // RMSE 계산
      const mse = residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length
      const rmse = Math.sqrt(mse)

      return {
        metadata: this.createMetadata('단순선형회귀', x.length, startTime),
        mainResults: {
          statistic: result.rSquared,
          pvalue: result.pvalue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, ${this.interpretPValue(result.pvalue)}`
        },
        additionalInfo: {
          coefficients: [
            {
              name: '절편',
              value: intercept,
              stdError: 0,
              tValue: 0,
              pvalue: 0
            },
            {
              name: '기울기',
              value: slope,
              stdError: 0,
              tValue: 0,
              pvalue: result.pvalue
            }
          ],
          effectSize: {
            value: result.rSquared,
            type: 'R-squared',
            interpretation: result.rSquared >= 0.67 ? '큰 효과' : result.rSquared >= 0.33 ? '중간 효과' : '작은 효과'
          },
          intercept,
          rSquared: result.rSquared,
          adjustedRSquared: result.rSquared,
          rmse,
          residuals,
          predictions
        },
        visualizationData: {
          type: 'scatter',
          data: {
            x,
            y,
            regression: {
              slope: result.slope,
              intercept: result.intercept
            }
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '단순선형회귀')
    }
  }

  /**
   * 다중회귀
   */
  async executeMultiple(X: number[][], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.multipleRegression(X, y)

      return {
        metadata: this.createMetadata('다중회귀분석', y.length, startTime),
        mainResults: {
          statistic: result.fStatistic,
          pvalue: result.fPValue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, Adj. R² = ${result.adjustedRSquared.toFixed(4)}, ${this.interpretPValue(result.fPValue)}`
        },
        additionalInfo: {
          coefficients: result.coefficients.map((coef: number, i: number) => ({
            name: i === 0 ? '절편' : `변수 ${i}`,
            value: coef,
            stdError: result.stdErrors[i],
            tValue: result.tValues[i],
            pvalue: result.pValues[i]
          })),
          rSquared: result.rSquared,
          adjustedRSquared: result.adjustedRSquared,
          vif: result.vif,
          residuals: result.residuals
        },
        visualizationData: {
          type: 'residual-plot',
          data: {
            fitted: result.fittedValues,
            residuals: result.residuals
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '다중회귀분석')
    }
  }

  /**
   * 로지스틱 회귀
   */
  async executeLogistic(X: number[][], y: number[]): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      const result = await pyodideStats.logisticRegression(X, y)

      return {
        metadata: this.createMetadata('로지스틱 회귀', y.length, startTime),
        mainResults: {
          statistic: result.accuracy,
          pvalue: result.llrPValue,
          interpretation: `정확도: ${(result.accuracy * 100).toFixed(1)}%, ${this.interpretPValue(result.llrPValue)}`
        },
        additionalInfo: {
          coefficients: result.coefficients.map((coef: number, i: number) => ({
            name: i === 0 ? '절편' : `변수 ${i}`,
            value: coef,
            stdError: result.stdErrors[i],
            tValue: result.zValues[i],
            pvalue: result.pValues[i]
          })),
          accuracy: result.accuracy,
          precision: result.confusionMatrix.precision,
          recall: result.confusionMatrix.recall,
          f1Score: result.confusionMatrix.f1Score,
          confusionMatrix: result.confusionMatrix
        },
        visualizationData: {
          type: 'roc-curve',
          data: {
            fpr: result.rocCurve.map(p => p.fpr),
            tpr: result.rocCurve.map(p => p.tpr),
            auc: result.auc
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '로지스틱 회귀')
    }
  }

  /**
   * 다항회귀
   */
  async executePolynomial(x: number[], y: number[], degree: number = 2): Promise<AnalysisResult> {
    const startTime = Date.now()

    try {
      await this.ensurePyodideInitialized()

      // 다항 특성 생성
      const X: number[][] = []
      for (let i = 0; i < x.length; i++) {
        const row = []
        for (let d = 1; d <= degree; d++) {
          row.push(Math.pow(x[i], d))
        }
        X.push(row)
      }

      const result = await pyodideStats.multipleRegression(X, y)

      return {
        metadata: this.createMetadata(`${degree}차 다항회귀`, x.length, startTime),
        mainResults: {
          statistic: result.rSquared,
          pvalue: result.fPValue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, ${degree}차 다항식 적합`
        },
        additionalInfo: {
          degree,
          coefficients: result.coefficients.map((coef: number, i: number) => ({
            name: i === 0 ? '절편' : `x^${i}`,
            value: coef,
            stdError: result.stdErrors[i],
            tValue: result.tValues[i],
            pvalue: result.pValues[i]
          })),
          rSquared: result.rSquared,
          residuals: result.residuals
        },
        visualizationData: {
          type: 'polynomial-fit',
          data: {
            x,
            y,
            degree,
            fitted: result.fittedValues
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '다항회귀')
    }
  }

  /**
   * Extract x, y arrays from data using variable names
   */
  private extractRegressionData(
    data: unknown[],
    dependentVar: string,
    independentVar: string | string[]
  ): { x: number[]; y: number[]; X?: number[][] } {
    const y: number[] = []
    const isMultiple = Array.isArray(independentVar)

    if (isMultiple) {
      // Multiple regression: X is 2D array
      const X: number[][] = []
      const indVars = independentVar as string[]

      for (const row of data) {
        if (typeof row !== 'object' || row === null) continue
        const record = row as Record<string, unknown>

        const depVal = record[dependentVar]
        if (typeof depVal !== 'number' || isNaN(depVal)) continue

        const indVals: number[] = []
        let allValid = true
        for (const iv of indVars) {
          const val = record[iv]
          if (typeof val !== 'number' || isNaN(val)) {
            allValid = false
            break
          }
          indVals.push(val)
        }

        if (allValid) {
          y.push(depVal)
          X.push(indVals)
        }
      }

      return { x: [], y, X }
    } else {
      // Simple regression: x is 1D array
      const x: number[] = []
      const indVar = independentVar as string

      for (const row of data) {
        if (typeof row !== 'object' || row === null) continue
        const record = row as Record<string, unknown>

        const depVal = record[dependentVar]
        const indVal = record[indVar]

        if (typeof depVal === 'number' && !isNaN(depVal) &&
            typeof indVal === 'number' && !isNaN(indVal)) {
          y.push(depVal)
          x.push(indVal)
        }
      }

      return { x, y }
    }
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: unknown[], options?: Record<string, unknown>): Promise<AnalysisResult> {
    const { method = 'simple', ...restOptions } = options || {}
    const dependentVar = restOptions.dependentVar as string | undefined
    const independentVar = restOptions.independentVar as string | string[] | undefined

    switch (method) {
      case 'simple':
      case 'simple-regression': {
        // x, y 직접 제공 또는 변수명으로 추출
        let x = restOptions.x as number[] | undefined
        let y = restOptions.y as number[] | undefined

        if ((!x || !y) && dependentVar && independentVar) {
          const indVar = Array.isArray(independentVar) ? independentVar[0] : independentVar
          const extracted = this.extractRegressionData(data, dependentVar, indVar)
          x = extracted.x
          y = extracted.y
        }

        if (!x || !y || x.length === 0 || y.length === 0) {
          throw new Error('단순회귀분석을 위한 데이터가 없습니다. dependentVar/independentVar를 확인하세요.')
        }

        return this.executeSimpleLinear(x, y)
      }

      case 'multiple':
      case 'multiple-regression': {
        // X, y 직접 제공 또는 변수명으로 추출
        let X = restOptions.X as number[][] | undefined
        let y = restOptions.y as number[] | undefined

        if ((!X || !y) && dependentVar && independentVar) {
          const indVars = Array.isArray(independentVar) ? independentVar : independentVar.split(',').map(s => s.trim())
          const extracted = this.extractRegressionData(data, dependentVar, indVars)
          X = extracted.X
          y = extracted.y
        }

        if (!X || !y || X.length === 0 || y.length === 0) {
          throw new Error('다중회귀분석을 위한 데이터가 없습니다. dependentVar/independentVar를 확인하세요.')
        }

        return this.executeMultiple(X, y)
      }

      case 'logistic': {
        let X = restOptions.X as number[][] | undefined
        let y = restOptions.y as number[] | undefined

        if ((!X || !y) && dependentVar && independentVar) {
          const indVars = Array.isArray(independentVar) ? independentVar : [independentVar]
          const extracted = this.extractRegressionData(data, dependentVar, indVars)
          X = extracted.X || extracted.x.map(v => [v])
          y = extracted.y
        }

        if (!X || !y || X.length === 0) {
          throw new Error('로지스틱 회귀를 위한 데이터가 없습니다.')
        }

        return this.executeLogistic(X, y)
      }

      case 'polynomial': {
        let x = restOptions.x as number[] | undefined
        let y = restOptions.y as number[] | undefined

        if ((!x || !y) && dependentVar && independentVar) {
          const indVar = Array.isArray(independentVar) ? independentVar[0] : independentVar
          const extracted = this.extractRegressionData(data, dependentVar, indVar)
          x = extracted.x
          y = extracted.y
        }

        if (!x || !y || x.length === 0) {
          throw new Error('다항회귀를 위한 데이터가 없습니다.')
        }

        return this.executePolynomial(x, y, restOptions.degree as number | undefined)
      }

      default:
        throw new Error(`Unknown regression method: ${method}`)
    }
  }
}
