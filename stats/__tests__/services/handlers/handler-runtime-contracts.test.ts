/**
 * Handler Runtime Contract Tests
 *
 * Record<string, unknown> → Generated 타입 전환 + pValue 키 통일 검증.
 * 각 테스트는 Python worker의 실제 반환 shape를 mock하고,
 * handler가 올바른 필드를 읽어 StatisticalExecutorResult로 매핑하는지 확인.
 */

import { describe, it, expect, vi } from 'vitest'
import type { StatisticalMethod } from '@/types/analysis'

// ═══════════════════════════════════════════════════════════════
// Mock: pyodideStats
// ═══════════════════════════════════════════════════════════════

const {
  mockTTest,
  mockTTestOneSample,
  mockMannKendallTest,
  mockArimaForecast,
  mockLogisticRegression,
  mockOrdinalLogistic,
  mockPoissonRegression,
  mockStepwiseRegression,
  mockLinearRegression,
  mockDoseResponseAnalysis,
  mockResponseSurfaceAnalysis,
} = vi.hoisted(() => ({
  mockTTest: vi.fn(),
  mockTTestOneSample: vi.fn(),
  mockMannKendallTest: vi.fn(),
  mockArimaForecast: vi.fn(),
  mockLogisticRegression: vi.fn(),
  mockOrdinalLogistic: vi.fn(),
  mockPoissonRegression: vi.fn(),
  mockStepwiseRegression: vi.fn(),
  mockLinearRegression: vi.fn(),
  mockDoseResponseAnalysis: vi.fn(),
  mockResponseSurfaceAnalysis: vi.fn(),
}))

vi.mock('@/lib/services/pyodide/pyodide-statistics', () => ({
  pyodideStats: {
    tTest: mockTTest,
    tTestOneSample: mockTTestOneSample,
    mannKendallTest: mockMannKendallTest,
    arimaForecast: mockArimaForecast,
    logisticRegression: mockLogisticRegression,
    ordinalLogistic: mockOrdinalLogistic,
    poissonRegression: mockPoissonRegression,
    stepwiseRegression: mockStepwiseRegression,
    linearRegression: mockLinearRegression,
    doseResponseAnalysis: mockDoseResponseAnalysis,
    responseSurfaceAnalysis: mockResponseSurfaceAnalysis,
  },
}))

import { handleTTest } from '@/lib/services/handlers/handle-t-test'
import { handleTimeSeries } from '@/lib/services/handlers/handle-timeseries'
import { handleRegression } from '@/lib/services/handlers/handle-regression'

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const makeMethod = (id: string, name: string, category: StatisticalMethod['category'] = 'other') => ({
  id, name, description: '', category,
})

// ═══════════════════════════════════════════════════════════════
// 1. t-test pValue 키 통일 (pvalue → pValue)
// ═══════════════════════════════════════════════════════════════

describe('t-test pValue key unification', () => {
  it('one-sample: tTestOneSample 결과의 pValue가 mainResults.pvalue로 매핑', async () => {
    mockTTestOneSample.mockResolvedValue({
      statistic: 2.45,
      pValue: 0.023,
      sampleMean: 5.2,
      n: 30,
      df: 29,
    })

    const result = await handleTTest(
      makeMethod('one-sample-t', '일표본 t-검정'),
      {
        data: [],
        variables: { testValue: 0 } as Record<string, unknown>,
        arrays: { dependent: Array.from({ length: 30 }, () => Math.random() * 10) },
        totalN: 30,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.023)
    expect(result.mainResults.statistic).toBe(2.45)
    expect(result.mainResults.significant).toBe(true)
  })

  it('two-sample: tTest 래퍼의 pValue가 mainResults.pvalue로 매핑', async () => {
    mockTTest.mockResolvedValue({
      statistic: -1.85,
      pValue: 0.072,
      df: 48,
    })

    const group1 = Array.from({ length: 25 }, () => Math.random() * 10)
    const group2 = Array.from({ length: 25 }, () => Math.random() * 10 + 1)

    const result = await handleTTest(
      makeMethod('independent-t', '독립표본 t-검정'),
      {
        data: [],
        variables: {} as Record<string, unknown>,
        arrays: { byGroup: { A: group1, B: group2 } },
        totalN: 50,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.072)
    expect(result.mainResults.statistic).toBe(-1.85)
    expect(result.mainResults.significant).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. Mann-Kendall: Generated 타입 직접 접근 (typeof 가드 제거)
// ═══════════════════════════════════════════════════════════════

describe('Mann-Kendall typed result access', () => {
  const MANN_KENDALL_RESULT = {
    trend: 'increasing' as const,
    tau: 0.682,
    zScore: 3.45,
    pValue: 0.0006,
    senSlope: 0.125,
    intercept: 1.2,
    n: 50,
  }

  it('typeof 가드 없이 Generated 타입 필드를 직접 사용', async () => {
    mockMannKendallTest.mockResolvedValue(MANN_KENDALL_RESULT)

    const result = await handleTimeSeries(
      makeMethod('mann-kendall', 'Mann-Kendall 추세 검정'),
      {
        data: [],
        variables: {} as Record<string, unknown>,
        arrays: { dependent: Array.from({ length: 50 }, (_, i) => i * 0.5 + Math.random()) },
        totalN: 50,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.statistic).toBe(0.682) // tau
    expect(result.mainResults.pvalue).toBe(0.0006)
    expect(result.mainResults.significant).toBe(true)
    expect(result.mainResults.interpretation).toContain('증가')
    expect(result.mainResults.interpretation).toContain('0.1250') // senSlope
    expect(result.additionalInfo.tau).toBe(0.682)
    expect(result.additionalInfo.senSlope).toBe(0.125)
    expect(result.additionalInfo.trend).toBe('increasing')
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. ARIMA: Generated 타입 + nullable aic/bic
// ═══════════════════════════════════════════════════════════════

describe('ARIMA typed result with nullable fields', () => {
  it('aic/bic가 number면 그대로 사용', async () => {
    mockArimaForecast.mockResolvedValue({
      forecast: [10.5, 11.2, 11.8],
      confidenceIntervals: { lower: [9.5, 10.1, 10.7], upper: [11.5, 12.3, 12.9] },
      aic: 245.8,
      bic: 252.3,
    })

    const result = await handleTimeSeries(
      makeMethod('arima', 'ARIMA'),
      {
        data: [],
        variables: {} as Record<string, unknown>,
        arrays: { dependent: Array.from({ length: 100 }, (_, i) => Math.sin(i / 10) * 5 + 20) },
        totalN: 100,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.statistic).toBe(245.8) // aic
    expect(result.additionalInfo.aic).toBe(245.8)
    expect(result.additionalInfo.bic).toBe(252.3)
    expect(result.mainResults.interpretation).toContain('245.80')
    expect(result.mainResults.interpretation).toContain('252.30')
  })

  it('aic/bic가 null이면 0으로 폴백', async () => {
    mockArimaForecast.mockResolvedValue({
      forecast: [10.5],
      confidenceIntervals: { lower: [9.5], upper: [11.5] },
      aic: null,
      bic: null,
    })

    const result = await handleTimeSeries(
      makeMethod('arima', 'ARIMA'),
      {
        data: [],
        variables: {} as Record<string, unknown>,
        arrays: { dependent: Array.from({ length: 50 }, () => 10) },
        totalN: 50,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.statistic).toBe(0)
    expect(result.additionalInfo.aic).toBe(0)
    expect(result.additionalInfo.bic).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 4. GLM buildGlmResult: as unknown as Record 캐스트 제거 확인
// ═══════════════════════════════════════════════════════════════

describe('GLM buildGlmResult typed result (no Record cast)', () => {
  it('ordinal: llrPValue + llrStatistic → pvalue + statistic', async () => {
    mockOrdinalLogistic.mockResolvedValue({
      coefficients: [0.8, -0.3],
      stdErrors: [0.2, 0.1],
      zValues: [4.0, -3.0],
      pValues: [0.00006, 0.003],
      aic: 150.2,
      bic: 158.7,
      llrPValue: 0.0002,
      llrStatistic: 18.5,
      thresholds: [1.5],
    })

    const result = await handleRegression(
      makeMethod('ordinal-regression', '순서형 로지스틱', 'regression' as const),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['x'] } as Record<string, unknown>,
        arrays: {
          dependent: Array.from({ length: 50 }, (_, i) => i % 3),
          independent: [Array.from({ length: 50 }, (_, i) => i)],
        },
        totalN: 50,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.0002)
    expect(result.mainResults.statistic).toBe(18.5) // llrStatistic
    expect(result.mainResults.significant).toBe(true)
  })

  it('poisson: llrPValue + llrStatistic → pvalue + statistic', async () => {
    mockPoissonRegression.mockResolvedValue({
      coefficients: [0.5, 0.2],
      stdErrors: [0.1, 0.05],
      zValues: [5.0, 4.0],
      pValues: [0.0000006, 0.00006],
      deviance: 45.2,
      pearsonChi2: 42.8,
      aic: 200.1,
      bic: 210.5,
      llrPValue: 0.00003,
      llrStatistic: 22.1,
      incidenceRateRatios: [1.65, 1.22],
    })

    const result = await handleRegression(
      makeMethod('poisson', '포아송 회귀', 'regression' as const),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['x'] } as Record<string, unknown>,
        arrays: {
          dependent: Array.from({ length: 50 }, (_, i) => Math.floor(Math.random() * 10)),
          independent: [Array.from({ length: 50 }, (_, i) => i)],
        },
        totalN: 50,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.00003)
    expect(result.mainResults.statistic).toBe(22.1) // llrStatistic
    expect(result.mainResults.significant).toBe(true)
  })

  it('logistic: llrPValue + llrStatistic 모두 반환 → 정상 매핑', async () => {
    mockLogisticRegression.mockResolvedValue({
      coefficients: [0.5, 1.2],
      stdErrors: [0.1, 0.3],
      zValues: [5.0, 4.0],
      pValues: [0.0001, 0.0001],
      ciLower: [-0.1, 0.5],
      ciUpper: [1.1, 1.9],
      predictions: [0.8, 0.2],
      predictedClass: [1, 0],
      accuracy: 0.92,
      confusionMatrix: { tp: 40, fp: 5, tn: 42, fn: 3, precision: 0.89, recall: 0.93, f1Score: 0.91 },
      sensitivity: 0.93,
      specificity: 0.89,
      rocCurve: [],
      auc: 0.95,
      aic: 80.5,
      bic: 90.2,
      pseudoRSquared: 0.45,
      llrPValue: 0.0001,
      llrStatistic: 45.67,
      nObservations: 90,
      nPredictors: 2,
    })

    const result = await handleRegression(
      makeMethod('logistic-regression', '로지스틱 회귀', 'regression' as const),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['x'] } as Record<string, unknown>,
        arrays: {
          dependent: Array.from({ length: 90 }, (_, i) => i % 2),
          independent: [Array.from({ length: 90 }, (_, i) => i)],
        },
        totalN: 90,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.0001)
    expect(result.mainResults.statistic).toBe(45.67)
  })
})

// ═══════════════════════════════════════════════════════════════
// 5. Stepwise: Generated 타입 직접 접근 (Record cast 제거)
// ═══════════════════════════════════════════════════════════════

describe('Stepwise typed result (no Record cast)', () => {
  it('fStatistic + fPValue + selectedVariables.length 직접 접근', async () => {
    mockStepwiseRegression.mockResolvedValue({
      selectedVariables: ['x1', 'x3'],
      selectedIndices: [0, 2],
      rSquaredHistory: [0.45, 0.72],
      coefficients: [1.2, 0.5, 0.3],
      stdErrors: [0.1, 0.2, 0.15],
      tValues: [12.0, 2.5, 2.0],
      pValues: [0.0001, 0.015, 0.05],
      rSquared: 0.72,
      adjustedRSquared: 0.69,
      fStatistic: 25.3,
      fPValue: 0.0001,
    })

    const result = await handleRegression(
      makeMethod('stepwise', '단계적 회귀', 'regression' as const),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['x1', 'x2', 'x3'] } as Record<string, unknown>,
        arrays: {
          dependent: Array.from({ length: 30 }, () => Math.random()),
          independent: [
            Array.from({ length: 30 }, () => Math.random()),
            Array.from({ length: 30 }, () => Math.random()),
            Array.from({ length: 30 }, () => Math.random()),
          ],
        },
        totalN: 30,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.statistic).toBe(25.3)
    expect(result.mainResults.pvalue).toBe(0.0001)
    expect(result.mainResults.significant).toBe(true)
    expect(result.mainResults.interpretation).toContain('2개')
    expect(result.additionalInfo.effectSize?.value).toBe(0.72)
  })
})

// ═══════════════════════════════════════════════════════════════
// 6. Dose-response: Generated 타입 직접 접근 (Record cast 제거)
// ═══════════════════════════════════════════════════════════════

describe('Dose-response typed result (no Record cast)', () => {
  it('pValue + rSquared → pvalue + statistic 정상 매핑', async () => {
    mockDoseResponseAnalysis.mockResolvedValue({
      model: 'logistic4',
      parameters: { ec50: 5.2, hillSlope: 1.3, top: 100, bottom: 0 },
      fittedValues: [10, 50, 90],
      residuals: [1, -2, 3],
      rSquared: 0.95,
      pValue: 0.003,
      aic: 42.1,
      bic: 45.3,
      confidenceIntervals: {},
      goodnessOfFit: { chiSquare: 8.5, pValue: 0.003, degreesFreedom: 2 },
      ec50: 5.2,
      ed50: 5.2,
      hillSlope: 1.3,
      top: 100,
      bottom: 0,
      ic50: 5.2,
    })

    const result = await handleRegression(
      makeMethod('dose-response', '용량-반응 분석', 'regression'),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['dose'] } as Record<string, unknown>,
        arrays: {
          dependent: [10, 50, 90],
          independent: [[1, 5, 10]],
        },
        totalN: 3,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.003)
    expect(result.mainResults.statistic).toBe(0.95)
    expect(result.mainResults.significant).toBe(true)
    expect(result.metadata.dataInfo.totalN).toBe(3)
  })

  it('pValue >= 0.05 → significant = false', async () => {
    mockDoseResponseAnalysis.mockResolvedValue({
      model: 'logistic4',
      parameters: {},
      fittedValues: [],
      residuals: [],
      rSquared: 0.12,
      pValue: 0.35,
      aic: 60,
      bic: 62,
      confidenceIntervals: {},
      goodnessOfFit: { chiSquare: 1.2, pValue: 0.35, degreesFreedom: 2 },
    })

    const result = await handleRegression(
      makeMethod('dose-response', '용량-반응 분석', 'regression'),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['dose'] } as Record<string, unknown>,
        arrays: {
          dependent: [10, 20],
          independent: [[1, 2]],
        },
        totalN: 2,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.35)
    expect(result.mainResults.significant).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 7. Response-surface: Generated 타입 직접 접근 (Record cast 제거)
// ═══════════════════════════════════════════════════════════════

describe('Response-surface typed result (no Record cast)', () => {
  it('pValue + fStatistic + rSquared → pvalue + statistic + effectSize 정상 매핑', async () => {
    mockResponseSurfaceAnalysis.mockResolvedValue({
      modelType: 'secondOrder',
      coefficients: { intercept: 10, x1: 2.5, x2: 1.3 },
      fittedValues: [10, 12, 14],
      residuals: [0.1, -0.2, 0.3],
      rSquared: 0.88,
      adjustedRSquared: 0.85,
      fStatistic: 32.7,
      fPvalue: 0.0005,
      pValue: 0.0005,
      anovaTable: {},
      optimization: {},
      designAdequacy: {},
    })

    const result = await handleRegression(
      makeMethod('response-surface', '반응표면 분석', 'regression'),
      {
        data: [{ y: 10, x1: 1, x2: 2 }, { y: 12, x1: 2, x2: 3 }, { y: 14, x1: 3, x2: 4 }],
        variables: { dependent: 'y', independent: ['x1', 'x2'] } as Record<string, unknown>,
        arrays: { dependent: [10, 12, 14], independent: [[1, 2, 3], [2, 3, 4]] },
        totalN: 3,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.0005)
    expect(result.mainResults.statistic).toBe(32.7)
    expect(result.mainResults.significant).toBe(true)
    expect(result.additionalInfo.effectSize?.value).toBe(0.88)
    expect(result.additionalInfo.effectSize?.type).toBe('R-squared')
    expect(result.mainResults.interpretation).toContain('2개 예측변수')
  })

  it('pValue >= 0.05 → significant = false', async () => {
    mockResponseSurfaceAnalysis.mockResolvedValue({
      modelType: 'secondOrder',
      coefficients: { intercept: 5 },
      fittedValues: [],
      residuals: [],
      rSquared: 0.15,
      adjustedRSquared: 0.08,
      fStatistic: 1.2,
      fPvalue: 0.42,
      pValue: 0.42,
      anovaTable: {},
      optimization: {},
      designAdequacy: {},
    })

    const result = await handleRegression(
      makeMethod('response-surface', '반응표면 분석', 'regression'),
      {
        data: [{ y: 1, x1: 1 }],
        variables: { dependent: 'y', independent: ['x1'] } as Record<string, unknown>,
        arrays: { dependent: [1], independent: [[1]] },
        totalN: 1,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.pvalue).toBe(0.42)
    expect(result.mainResults.significant).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════
// 8. GLM buildGlmResult: llrStatistic undefined → fallback 0
// ═══════════════════════════════════════════════════════════════

describe('GLM llrStatistic fallback', () => {
  it('logistic: llrStatistic undefined → statistic = 0', async () => {
    mockLogisticRegression.mockResolvedValue({
      coefficients: [0.5],
      stdErrors: [0.1],
      zValues: [5.0],
      pValues: [0.0001],
      ciLower: [-0.1],
      ciUpper: [1.1],
      predictions: [0.8],
      predictedClass: [1],
      accuracy: 0.9,
      confusionMatrix: { tp: 9, fp: 1, tn: 9, fn: 1, precision: 0.9, recall: 0.9, f1Score: 0.9 },
      sensitivity: 0.9,
      specificity: 0.9,
      rocCurve: [],
      auc: 0.9,
      aic: 80,
      bic: 85,
      pseudoRSquared: 0.4,
      llrPValue: 0.001,
      llrStatistic: undefined,
      nObservations: 20,
      nPredictors: 1,
    })

    const result = await handleRegression(
      makeMethod('logistic-regression', '로지스틱 회귀', 'regression'),
      {
        data: [],
        variables: { dependent: ['y'], independent: ['x'] } as Record<string, unknown>,
        arrays: {
          dependent: Array.from({ length: 20 }, (_, i) => i % 2),
          independent: [Array.from({ length: 20 }, (_, i) => i)],
        },
        totalN: 20,
        missingRemoved: 0,
      },
    )

    expect(result.mainResults.statistic).toBe(0)
    expect(result.mainResults.pvalue).toBe(0.001)
  })
})
