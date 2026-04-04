/**
 * Handler–Worker Contract Gap Simulation Tests
 *
 * 이 테스트들은 handler가 worker 실제 반환값과 다른 필드를 읽는
 * pre-existing 계약 불일치 4건을 시뮬레이션으로 증명합니다.
 *
 * 각 테스트는 worker의 실제 반환 shape를 mock하고,
 * handler가 의미 있는 결과를 생성하는지 검증합니다.
 *
 * 이슈 해결 후 expect를 수정하여 회귀 방지 테스트로 전환하세요.
 */

import { describe, it, expect, vi } from 'vitest'

// ─── Mock pyodideStats (vi.hoisted로 호이스팅) ─────────────
const {
  mockStepwiseRegression,
  mockLogisticRegression,
  mockOrdinalLogistic,
  mockPoissonRegression,
  mockChiSquareIndependenceTest,
} = vi.hoisted(() => ({
  mockStepwiseRegression: vi.fn(),
  mockLogisticRegression: vi.fn(),
  mockOrdinalLogistic: vi.fn(),
  mockPoissonRegression: vi.fn(),
  mockChiSquareIndependenceTest: vi.fn(),
}))

vi.mock('@/lib/services/pyodide/pyodide-statistics', () => ({
  pyodideStats: {
    stepwiseRegression: mockStepwiseRegression,
    logisticRegression: mockLogisticRegression,
    ordinalLogistic: mockOrdinalLogistic,
    poissonRegression: mockPoissonRegression,
    chiSquareIndependenceTest: mockChiSquareIndependenceTest,
    linearRegression: vi.fn(),
    polynomialRegression: vi.fn(),
    nonlinearRegression: vi.fn(),
    responseFunction: vi.fn(),
    doseResponse: vi.fn(),
  }
}))

import { handleRegression } from '@/lib/services/handlers/handle-regression'
import { handleChiSquare } from '@/lib/services/handlers/handle-chi-square'

// ─── Helpers ───────────────────────────────────────────────

const makeMethod = (id: string, name: string) => ({
  id, name, description: '', category: 'regression' as const,
})

const makePreparedData = (totalN: number) => ({
  data: Array.from({ length: totalN }, (_, i) => ({ x: i, y: i * 2 })),
  variables: { dependent: ['y'], independent: ['x'] } as Record<string, unknown>,
  arrays: {
    dependent: Array.from({ length: totalN }, (_, i) => i * 2),
    independent: [Array.from({ length: totalN }, (_, i) => i)],
  },
  totalN,
  missingRemoved: 0,
})

// ─── Issue 1: Stepwise regression 결과 매핑 불일치 ─────────

describe('Issue 1: stepwise handler reads fields the worker never returns', () => {
  // worker4 stepwise_regression의 실제 반환값 shape
  const ACTUAL_WORKER_RESULT = {
    selectedVariables: ['x1', 'x3'],
    selectedIndices: [0, 2],
    rSquaredHistory: [0.45, 0.72],
    coefficients: [1.2, 0.5, 0.3],
    stdErrors: [0.1, 0.2, 0.15],
    tValues: [12.0, 2.5, 2.0],
    pValues: [0.0001, 0.015, 0.05],
    rSquared: 0.72,
    adjustedRSquared: 0.69,
  }

  it('handler가 fStatistic/pValue/selectedVariableCount를 읽지만 worker는 해당 필드를 반환하지 않음', async () => {
    mockStepwiseRegression.mockResolvedValue(ACTUAL_WORKER_RESULT)

    const result = await handleRegression(
      makeMethod('stepwise', '단계적 회귀'),
      makePreparedData(30),
    )

    // BUG 증명: worker가 fStatistic을 반환하지 않으므로 statistic은 0
    expect(result.mainResults.statistic).toBe(0)

    // BUG 증명: worker가 top-level pValue를 반환하지 않으므로 pvalue는 1
    expect(result.mainResults.pvalue).toBe(1)
    expect(result.mainResults.significant).toBe(false)

    // BUG 증명: worker가 selectedVariableCount를 반환하지 않으므로 '?'
    expect(result.mainResults.interpretation).toContain('?')

    // rSquared는 worker가 반환하므로 정상 작동
    expect(result.additionalInfo.effectSize?.value).toBe(0.72)

    // 수정 후 기대 결과 (TODO: 이슈 해결 후 아래로 교체):
    // expect(result.mainResults.pvalue).toBeLessThan(0.05)
    // expect(result.mainResults.interpretation).toContain('2개')
  })
})

// ─── Issue 2: Poisson/Ordinal regression p-value 누락 ─────

describe('Issue 2: ordinal/poisson handlers always return p=1 (no llrPValue)', () => {
  // ordinal_logistic의 실제 반환값 — llrPValue 없음
  const ORDINAL_WORKER_RESULT = {
    coefficients: [0.8, -0.3],
    stdErrors: [0.2, 0.1],
    zValues: [4.0, -3.0],
    pValues: [0.00006, 0.003],
    aic: 150.2,
    bic: 158.7,
  }

  // poisson_regression의 실제 반환값 — llrPValue 없음
  const POISSON_WORKER_RESULT = {
    coefficients: [0.5, 0.2],
    stdErrors: [0.1, 0.05],
    zValues: [5.0, 4.0],
    pValues: [0.0000006, 0.00006],
    deviance: 45.2,
    pearsonChi2: 42.8,
    aic: 200.1,
    bic: 210.5,
  }

  it('ordinal regression: llrPValue가 없어 항상 p=1', async () => {
    mockOrdinalLogistic.mockResolvedValue(ORDINAL_WORKER_RESULT)

    const result = await handleRegression(
      makeMethod('ordinal-regression', '순서형 로지스틱'),
      makePreparedData(50),
    )

    // BUG 증명: worker가 llrPValue를 반환하지 않으므로 pvalue=1
    expect(result.mainResults.pvalue).toBe(1)
    expect(result.mainResults.significant).toBe(false)
    // 실제로는 계수별 p-value가 매우 유의한데도 model-level은 p=1

    // 수정 후 기대 결과:
    // expect(result.mainResults.pvalue).toBeLessThan(0.05)
  })

  it('poisson regression: llrPValue가 없어 항상 p=1', async () => {
    mockPoissonRegression.mockResolvedValue(POISSON_WORKER_RESULT)

    const result = await handleRegression(
      makeMethod('poisson', '포아송 회귀'),
      makePreparedData(50),
    )

    // BUG 증명: worker가 llrPValue를 반환하지 않으므로 pvalue=1
    expect(result.mainResults.pvalue).toBe(1)
    expect(result.mainResults.significant).toBe(false)
  })

  it('logistic regression: llrPValue가 있어 정상 작동 (대조군)', async () => {
    mockLogisticRegression.mockResolvedValue({
      coefficients: [0.5, 1.2],
      stdErrors: [0.1, 0.3],
      zValues: [5.0, 4.0],
      pValues: [0.0001, 0.0001],
      confusionMatrix: { tp: 40, fp: 5, tn: 42, fn: 3, precision: 0.89, recall: 0.93, f1Score: 0.91 },
      sensitivity: 0.93,
      specificity: 0.89,
      rocCurve: [],
      auc: 0.95,
      aic: 80.5,
      bic: 90.2,
      pseudoRSquared: 0.45,
      llrPValue: 0.0001,          // logistic만 이 필드 제공
      nObservations: 90,
      nPredictors: 2,
    })

    const result = await handleRegression(
      makeMethod('logistic-regression', '로지스틱 회귀'),
      makePreparedData(90),
    )

    // logistic은 llrPValue가 있으므로 정상
    expect(result.mainResults.pvalue).toBe(0.0001)
    expect(result.mainResults.significant).toBe(true)
  })
})

// ─── Issue 4: Chi-square independence test mock shape 불일치 ─

describe('Issue 4: chi-square independence handler reads fields that match real worker shape', () => {
  // chi_square_independence_test의 실제 반환값 shape
  const ACTUAL_WORKER_RESULT = {
    chiSquare: 15.8,
    pValue: 0.003,
    degreesOfFreedom: 4,
    reject: true,
    cramersV: 0.35,
    expectedMatrix: [[10, 20], [15, 25]],
  }

  // routing test에서 사용하는 (잘못된) mock shape
  const ROUTING_TEST_MOCK = {
    statistic: 12.5,    // handler는 result.chiSquare를 읽음 — 이 필드 무시됨
    pValue: 0.002,      // handler는 result.pValue를 읽음 — 이건 맞음
    df: 4,              // handler는 result.degreesOfFreedom을 읽음 — 이 필드 무시됨
    cramersV: 0.3,      // handler는 result.cramersV를 읽음 — 맞음
  }

  it('실제 worker shape로 호출하면 정상 동작', async () => {
    mockChiSquareIndependenceTest.mockResolvedValue(ACTUAL_WORKER_RESULT)

    const data = {
      data: [
        { group: 'A', outcome: 'Y' }, { group: 'A', outcome: 'N' },
        { group: 'B', outcome: 'Y' }, { group: 'B', outcome: 'N' },
        { group: 'A', outcome: 'Y' }, { group: 'B', outcome: 'Y' },
        { group: 'A', outcome: 'N' }, { group: 'B', outcome: 'N' },
        { group: 'A', outcome: 'Y' }, { group: 'B', outcome: 'N' },
      ] as Array<Record<string, unknown>>,
      variables: {
        dependent: ['outcome'],
        dependentVar: 'outcome',
        independent: ['group'],
        independentVar: 'group',
      } as Record<string, unknown>,
      arrays: {
        contingencyTable: undefined,
      },
      totalN: 10,
      missingRemoved: 0,
    }

    const result = await handleChiSquare(
      { id: 'chi-square', name: '카이제곱 독립성 검정', description: '', category: 'chi-square' as const },
      data,
    )

    // 실제 shape: result.chiSquare → statistic
    expect(result.mainResults.statistic).toBe(15.8)
    expect(result.mainResults.pvalue).toBe(0.003)
    expect(result.mainResults.df).toBe(4)
    expect(result.mainResults.significant).toBe(true)
  })

  it('routing test의 잘못된 mock shape로는 statistic=undefined, df=undefined', async () => {
    mockChiSquareIndependenceTest.mockResolvedValue(ROUTING_TEST_MOCK)

    const data = {
      data: [
        { group: 'A', outcome: 'Y' }, { group: 'A', outcome: 'N' },
        { group: 'B', outcome: 'Y' }, { group: 'B', outcome: 'N' },
        { group: 'A', outcome: 'Y' }, { group: 'B', outcome: 'Y' },
        { group: 'A', outcome: 'N' }, { group: 'B', outcome: 'N' },
        { group: 'A', outcome: 'Y' }, { group: 'B', outcome: 'N' },
      ] as Array<Record<string, unknown>>,
      variables: {
        dependent: ['outcome'],
        dependentVar: 'outcome',
        independent: ['group'],
        independentVar: 'group',
      } as Record<string, unknown>,
      arrays: {
        contingencyTable: undefined,
      },
      totalN: 10,
      missingRemoved: 0,
    }

    const result = await handleChiSquare(
      { id: 'chi-square', name: '카이제곱 독립성 검정', description: '', category: 'chi-square' as const },
      data,
    )

    // BUG 증명: handler가 result.chiSquare를 읽는데, mock에는 statistic만 있음
    // result.chiSquare는 undefined → 직접 할당이므로 undefined
    expect(result.mainResults.statistic).toBeUndefined()

    // result.degreesOfFreedom은 undefined (mock에는 df만 있음)
    expect(result.mainResults.df).toBeUndefined()

    // pValue는 같은 필드명이라 정상
    expect(result.mainResults.pvalue).toBe(0.002)
  })
})
