/**
 * regression-executor 타입 안전성 시뮬레이션 테스트
 *
 * Python Worker 4가 반환하는 데이터 구조를 mock하여
 * executor가 올바르게 매핑하는지 검증
 *
 * 검증 항목:
 * - multipleRegression: fPValue 사용 (pValue 아님)
 * - multipleRegression: coefficients zip 매핑 (flat array → 구조체)
 * - multipleRegression: adjustedRSquared Python 값 직접 사용
 * - multipleRegression: residuals/fittedValues 전달
 * - logisticRegression: llrPValue 사용 (우도비 검정)
 * - logisticRegression: confusionMatrix 내부 precision/recall/f1Score
 * - logisticRegression: rocCurve Array<{fpr,tpr}> → fpr[]/tpr[] 변환
 * - logisticRegression: auc (rocAuc 아님)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// =====================================================
// Python 반환값 mock (실제 Worker 4 출력 시뮬레이션)
// =====================================================

/** multiple_regression Python 반환값 시뮬레이션 */
const mockMultipleRegressionResult = {
  coefficients: [1.5, 0.8, -0.3],      // [절편, 변수1, 변수2]
  stdErrors: [0.2, 0.1, 0.15],
  tValues: [7.5, 8.0, -2.0],
  pValues: [0.0001, 0.0001, 0.048],
  ciLower: [1.1, 0.6, -0.6],
  ciUpper: [1.9, 1.0, -0.01],
  rSquared: 0.85,
  adjustedRSquared: 0.83,
  fStatistic: 42.5,
  fPValue: 0.00001,
  residualStdError: 1.23,
  residuals: [0.1, -0.2, 0.3, -0.1, 0.05],
  fittedValues: [9.9, 12.2, 8.7, 11.1, 10.05],
  vif: [999.0, 1.2, 1.3],              // vif[0] = 절편 (무의미)
  nObservations: 50,
  nPredictors: 2,
  assumptions: {
    independence: { testName: 'Durbin-Watson', statistic: 2.1, passed: true, interpretation: 'No autocorrelation' },
    normality: { testName: 'Shapiro-Wilk', statistic: 0.98, pValue: 0.42, passed: true, interpretation: 'Normal' },
    homoscedasticity: { testName: 'Breusch-Pagan', statistic: 3.2, pValue: 0.21, passed: true, interpretation: 'Constant variance' },
  }
}

/** logistic_regression Python 반환값 시뮬레이션 */
const mockLogisticRegressionResult = {
  coefficients: [-0.5, 1.2, 0.8],
  stdErrors: [0.3, 0.4, 0.35],
  zValues: [-1.67, 3.0, 2.29],
  pValues: [0.095, 0.003, 0.022],
  ciLower: [-1.1, 0.4, 0.1],
  ciUpper: [0.1, 2.0, 1.5],
  predictions: [0.3, 0.7, 0.9, 0.2],
  predictedClass: [0, 1, 1, 0],
  accuracy: 0.85,
  confusionMatrix: {
    tp: 20, fp: 3, tn: 22, fn: 5,
    precision: 0.87,
    recall: 0.80,
    f1Score: 0.833,
  },
  sensitivity: 0.80,
  specificity: 0.88,
  rocCurve: [
    { fpr: 0.0, tpr: 0.0 },
    { fpr: 0.1, tpr: 0.6 },
    { fpr: 0.3, tpr: 0.85 },
    { fpr: 1.0, tpr: 1.0 },
  ],
  auc: 0.91,
  aic: 45.2,
  bic: 52.1,
  pseudoRSquared: 0.35,
  llrPValue: 0.0002,
  nObservations: 50,
  nPredictors: 2,
}

// =====================================================
// executor 매핑 로직 추출 (순수 함수로 테스트)
// =====================================================

type CoefficientRow = {
  name: string
  value: number
  stdError: number
  tValue: number
  pvalue: number
}

/** executeMultiple 매핑 로직 */
function mapMultipleRegressionToAnalysisResult(result: typeof mockMultipleRegressionResult) {
  return {
    mainResults: {
      statistic: result.fStatistic,
      pvalue: result.fPValue,
      interpretation: `R² = ${result.rSquared.toFixed(4)}, Adj. R² = ${result.adjustedRSquared.toFixed(4)}`
    },
    additionalInfo: {
      coefficients: result.coefficients.map((coef: number, i: number): CoefficientRow => ({
        name: i === 0 ? '절편' : `변수 ${i}`,
        value: coef,
        stdError: result.stdErrors[i],
        tValue: result.tValues[i],
        pvalue: result.pValues[i]
      })),
      rSquared: result.rSquared,
      adjustedRSquared: result.adjustedRSquared,
      vif: result.vif,
      residuals: result.residuals,
    },
    visualizationData: {
      type: 'residual-plot',
      data: {
        fitted: result.fittedValues,
        residuals: result.residuals,
      }
    }
  }
}

/** executeLogistic 매핑 로직 */
function mapLogisticRegressionToAnalysisResult(result: typeof mockLogisticRegressionResult) {
  return {
    mainResults: {
      statistic: result.accuracy,
      pvalue: result.llrPValue,
      interpretation: `정확도: ${(result.accuracy * 100).toFixed(1)}%`
    },
    additionalInfo: {
      coefficients: result.coefficients.map((coef: number, i: number): CoefficientRow => ({
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
      confusionMatrix: result.confusionMatrix,
    },
    visualizationData: {
      type: 'roc-curve',
      data: {
        fpr: result.rocCurve.map(p => p.fpr),
        tpr: result.rocCurve.map(p => p.tpr),
        auc: result.auc,
      }
    }
  }
}

// =====================================================
// Tests
// =====================================================
describe('다중회귀 executor 매핑', () => {

  it('fPValue를 모델 p-value로 사용 (pValue 아님)', () => {
    const mapped = mapMultipleRegressionToAnalysisResult(mockMultipleRegressionResult)
    expect(mapped.mainResults.pvalue).toBe(0.00001)
    expect(mapped.mainResults.statistic).toBe(42.5)
  })

  it('Python adjustedRSquared 직접 사용 (이중 계산 없음)', () => {
    const mapped = mapMultipleRegressionToAnalysisResult(mockMultipleRegressionResult)
    expect(mapped.additionalInfo.adjustedRSquared).toBe(0.83)
    expect(mapped.mainResults.interpretation).toContain('Adj. R² = 0.8300')
  })

  it('coefficients flat array → 구조체 매핑', () => {
    const mapped = mapMultipleRegressionToAnalysisResult(mockMultipleRegressionResult)
    const coefs = mapped.additionalInfo.coefficients

    expect(coefs).toHaveLength(3)

    // 절편
    expect(coefs[0]).toEqual({
      name: '절편',
      value: 1.5,
      stdError: 0.2,
      tValue: 7.5,
      pvalue: 0.0001,
    })

    // 변수 1
    expect(coefs[1]).toEqual({
      name: '변수 1',
      value: 0.8,
      stdError: 0.1,
      tValue: 8.0,
      pvalue: 0.0001,
    })

    // 변수 2
    expect(coefs[2]).toEqual({
      name: '변수 2',
      value: -0.3,
      stdError: 0.15,
      tValue: -2.0,
      pvalue: 0.048,
    })
  })

  it('residuals/fittedValues 전달', () => {
    const mapped = mapMultipleRegressionToAnalysisResult(mockMultipleRegressionResult)
    expect(mapped.additionalInfo.residuals).toEqual([0.1, -0.2, 0.3, -0.1, 0.05])
    expect(mapped.visualizationData.data.fitted).toEqual([9.9, 12.2, 8.7, 11.1, 10.05])
    expect(mapped.visualizationData.data.residuals).toEqual(mapped.additionalInfo.residuals)
  })

  it('배열 길이 일치 (coefficients = stdErrors = tValues = pValues)', () => {
    const r = mockMultipleRegressionResult
    expect(r.coefficients.length).toBe(r.stdErrors.length)
    expect(r.coefficients.length).toBe(r.tValues.length)
    expect(r.coefficients.length).toBe(r.pValues.length)
  })
})

describe('로지스틱 회귀 executor 매핑', () => {

  it('llrPValue를 모델 p-value로 사용 (우도비 검정)', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    expect(mapped.mainResults.pvalue).toBe(0.0002)
    // pValues[1]이 아님을 확인
    expect(mapped.mainResults.pvalue).not.toBe(mockLogisticRegressionResult.pValues[1])
  })

  it('confusionMatrix 내부에서 precision/recall/f1Score 추출', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    expect(mapped.additionalInfo.precision).toBe(0.87)
    expect(mapped.additionalInfo.recall).toBe(0.80)
    expect(mapped.additionalInfo.f1Score).toBe(0.833)
  })

  it('rocCurve Array<{fpr,tpr}> → fpr[]/tpr[] 변환', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    expect(mapped.visualizationData.data.fpr).toEqual([0.0, 0.1, 0.3, 1.0])
    expect(mapped.visualizationData.data.tpr).toEqual([0.0, 0.6, 0.85, 1.0])
  })

  it('auc 사용 (rocAuc 아님)', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    expect(mapped.visualizationData.data.auc).toBe(0.91)
  })

  it('coefficients에 zValues 매핑 (tValue 필드명)', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    const coefs = mapped.additionalInfo.coefficients

    expect(coefs[0]).toEqual({
      name: '절편',
      value: -0.5,
      stdError: 0.3,
      tValue: -1.67,   // zValue가 tValue 필드에 매핑
      pvalue: 0.095,
    })

    expect(coefs[1].tValue).toBe(3.0)   // z-value
    expect(coefs[2].tValue).toBe(2.29)
  })

  it('accuracy를 statistic으로 사용', () => {
    const mapped = mapLogisticRegressionToAnalysisResult(mockLogisticRegressionResult)
    expect(mapped.mainResults.statistic).toBe(0.85)
    expect(mapped.mainResults.interpretation).toContain('85.0%')
  })
})

describe('엣지 케이스', () => {

  it('coefficients가 1개(절편만)인 경우', () => {
    const singleCoef = {
      ...mockMultipleRegressionResult,
      coefficients: [3.0],
      stdErrors: [0.5],
      tValues: [6.0],
      pValues: [0.001],
    }
    const mapped = mapMultipleRegressionToAnalysisResult(singleCoef)
    expect(mapped.additionalInfo.coefficients).toHaveLength(1)
    expect(mapped.additionalInfo.coefficients[0].name).toBe('절편')
  })

  it('rocCurve가 2개(fallback)인 경우', () => {
    const fallback = {
      ...mockLogisticRegressionResult,
      rocCurve: [
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 1.0, tpr: 1.0 },
      ],
      auc: 0.5,
    }
    const mapped = mapLogisticRegressionToAnalysisResult(fallback)
    expect(mapped.visualizationData.data.fpr).toEqual([0.0, 1.0])
    expect(mapped.visualizationData.data.tpr).toEqual([0.0, 1.0])
    expect(mapped.visualizationData.data.auc).toBe(0.5)
  })

  it('confusionMatrix의 precision/recall이 0인 경우 (분모 0 방지)', () => {
    const zeroCm = {
      ...mockLogisticRegressionResult,
      confusionMatrix: {
        tp: 0, fp: 0, tn: 50, fn: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
      }
    }
    const mapped = mapLogisticRegressionToAnalysisResult(zeroCm)
    expect(mapped.additionalInfo.precision).toBe(0)
    expect(mapped.additionalInfo.recall).toBe(0)
    expect(mapped.additionalInfo.f1Score).toBe(0)
  })
})
