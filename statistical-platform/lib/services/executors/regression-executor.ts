import { BaseExecutor } from './base-executor'
import { AnalysisResult } from './types'
import { pyodideStats } from '../pyodide-statistics'
import { logger } from '@/lib/utils/logger'

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

      // R² 계산
      const yMean = y.reduce((a, b) => a + b, 0) / y.length
      const totalSS = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
      const residualSS = result.residuals.reduce((sum, r) => sum + Math.pow(r, 2), 0)
      const rSquared = 1 - (residualSS / totalSS)

      return {
        metadata: this.createMetadata('단순선형회귀', x.length, startTime),
        mainResults: {
          statistic: result.rSquared,
          pvalue: result.pValue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          coefficients: [
            {
              name: '절편',
              value: result.intercept,
              stdError: result.interceptStderr,
              tValue: result.intercept / result.interceptStderr,
              pvalue: result.interceptPvalue
            },
            {
              name: '기울기',
              value: result.slope,
              stdError: result.slopeStderr,
              tValue: result.slope / result.slopeStderr,
              pvalue: result.pValue
            }
          ],
          rSquared: result.rSquared,
          adjustedRSquared: result.rSquared, // 단순회귀에서는 동일
          residuals: result.residuals,
          predictions: result.predictions
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

      // Adjusted R² 계산
      const n = y.length
      const k = X[0].length
      const adjustedRSquared = 1 - ((1 - result.rSquared) * (n - 1) / (n - k - 1))

      return {
        metadata: this.createMetadata('다중회귀분석', y.length, startTime),
        mainResults: {
          statistic: result.fStatistic,
          pvalue: result.pValue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, Adj. R² = ${adjustedRSquared.toFixed(4)}, ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          coefficients: result.coefficients.map((coef: any, i: number) => ({
            name: i === 0 ? '절편' : `변수 ${i}`,
            value: coef.value,
            stdError: coef.stdError,
            tValue: coef.tValue,
            pvalue: coef.pValue
          })),
          rSquared: result.rSquared,
          adjustedRSquared,
          vif: result.vif,
          residuals: result.residuals
        },
        visualizationData: {
          type: 'residual-plot',
          data: {
            fitted: result.predictions,
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
          pvalue: result.pValue,
          interpretation: `정확도: ${(result.accuracy * 100).toFixed(1)}%, ${this.interpretPValue(result.pValue)}`
        },
        additionalInfo: {
          coefficients: result.coefficients,
          accuracy: result.accuracy,
          precision: result.precision,
          recall: result.recall,
          f1Score: result.f1Score,
          confusionMatrix: result.confusionMatrix
        },
        visualizationData: {
          type: 'roc-curve',
          data: {
            fpr: result.rocCurve?.fpr,
            tpr: result.rocCurve?.tpr,
            auc: result.rocAuc
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
          pvalue: result.pValue,
          interpretation: `R² = ${result.rSquared.toFixed(4)}, ${degree}차 다항식 적합`
        },
        additionalInfo: {
          degree,
          coefficients: result.coefficients,
          rSquared: result.rSquared,
          residuals: result.residuals
        },
        visualizationData: {
          type: 'polynomial-fit',
          data: {
            x,
            y,
            degree,
            fitted: result.predictions
          }
        }
      }
    } catch (error) {
      return this.handleError(error, '다항회귀')
    }
  }

  /**
   * 통합 실행 메서드
   */
  async execute(data: any[], options?: any): Promise<AnalysisResult> {
    const { method = 'simple', ...restOptions } = options || {}

    switch (method) {
      case 'simple':
        return this.executeSimpleLinear(restOptions.x, restOptions.y)
      case 'multiple':
        return this.executeMultiple(restOptions.X, restOptions.y)
      case 'logistic':
        return this.executeLogistic(restOptions.X, restOptions.y)
      case 'polynomial':
        return this.executePolynomial(
          restOptions.x,
          restOptions.y,
          restOptions.degree
        )
      default:
        throw new Error(`Unknown regression method: ${method}`)
    }
  }
}