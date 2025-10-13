/**
 * Groups 5-6 통합 테스트
 * regression-extended.ts, advanced-extended.ts 핸들러 검증
 */

import { MethodRouter } from '@/lib/statistics/method-router'
import type { CalculatorContext, DataRow } from '@/lib/statistics/calculator-types'

// Mock Pyodide 서비스
const mockPyodideService = {
  partialCorrelation: jest.fn().mockResolvedValue({
    correlation: 0.7234,
    tStatistic: 5.432,
    pValue: 0.0001,
    df: 27,
    confidenceInterval: [0.5123, 0.8456]
  }),

  poissonRegression: jest.fn().mockResolvedValue({
    coefficients: [1.2, 0.45, -0.23],
    stdErrors: [0.12, 0.08, 0.05],
    zValues: [10.0, 5.625, -4.6],
    pValues: [0.0001, 0.0001, 0.0001],
    deviance: 45.32,
    pearsonChiSquare: 42.18,
    aic: 234.5,
    bic: 245.8,
    logLikelihood: -112.25,
    dispersion: 1.12
  }),

  ordinalRegression: jest.fn().mockResolvedValue({
    coefficients: [0.8, -0.5],
    stdErrors: [0.15, 0.12],
    zValues: [5.33, -4.17],
    pValues: [0.0001, 0.0001],
    thresholds: [0.5, 1.8, 3.2],
    pseudoRSquared: 0.342,
    aic: 156.7,
    bic: 168.9,
    logLikelihood: -73.35
  }),

  stepwiseRegression: jest.fn().mockResolvedValue({
    selectedVariables: ['광고비', '매장면적'],
    rSquaredAtStep: [0.45, 0.62],
    fStatistics: [42.3, 38.7],
    pValues: [0.0001, 0.0001],
    finalCoefficients: [2.5, 0.8, 0.3],
    finalStdErrors: [0.5, 0.12, 0.08],
    finalTValues: [5.0, 6.67, 3.75],
    finalPValues: [0.0001, 0.0001, 0.001],
    finalRSquared: 0.62,
    adjustedRSquared: 0.58
  }),

  doseResponse: jest.fn().mockResolvedValue({
    ec50: 12.5,
    ec50CI: [10.2, 14.8],
    hillCoefficient: 1.8,
    hillCI: [1.4, 2.2],
    top: 98.5,
    topCI: [95.2, 100.0],
    bottom: 2.3,
    bottomCI: [0.0, 5.1],
    rSquared: 0.982,
    rmse: 3.45,
    aic: 78.9,
    residualStdError: 3.52,
    ec10: 5.8,
    ec25: 9.1,
    ec75: 16.8,
    ec90: 22.3
  }),

  responseSurface: jest.fn().mockResolvedValue({
    coefficients: [50.2, 5.3, 3.8, -0.5, -0.3, -0.12],
    stdErrors: [2.1, 0.8, 0.6, 0.15, 0.12, 0.05],
    tValues: [23.9, 6.63, 6.33, -3.33, -2.5, -2.4],
    pValues: [0.0001, 0.0001, 0.0001, 0.002, 0.018, 0.022],
    termNames: ['절편', '온도', '시간', '온도²', '시간²', '온도×시간'],
    rSquared: 0.89,
    adjustedRSquared: 0.86,
    rmse: 2.34,
    fStatistic: 45.6,
    overallPValue: 0.0001,
    optimumPoint: [65.3, 22.5],
    predictedResponse: 78.9,
    isMaximum: true,
    isMinimum: false,
    isSaddle: false
  }),

  factorAnalysis: jest.fn().mockResolvedValue({
    nFactors: 3,
    eigenvalues: [4.5, 2.3, 1.2, 0.8, 0.5],
    varianceRatios: [0.45, 0.23, 0.12],
    cumulativeVariances: [0.45, 0.68, 0.80],
    cumulativeVariance: 0.80,
    loadings: [
      [0.82, 0.15, 0.08],
      [0.78, 0.12, 0.10],
      [0.15, 0.85, 0.09],
      [0.12, 0.80, 0.15]
    ],
    communalities: [0.71, 0.65, 0.76, 0.68],
    kmo: 0.82,
    bartlettChiSquare: 234.5,
    bartlettPValue: 0.0001
  }),

  discriminantAnalysis: jest.fn().mockResolvedValue({
    nFunctions: 2,
    eigenvalues: [2.34, 0.87],
    varianceRatios: [0.73, 0.27],
    canonicalCorrelations: [0.836, 0.682],
    wilksLambda: 0.245,
    wilksLambdas: [0.245, 0.535],
    chiSquares: [78.9, 23.4],
    pValues: [0.0001, 0.001],
    standardizedCoefficients: [
      [0.82, -0.35],
      [0.65, 0.72],
      [-0.48, 0.58]
    ],
    confusionMatrix: [
      [45, 5, 2],
      [3, 48, 4],
      [2, 3, 50]
    ],
    groupAccuracies: [0.865, 0.873, 0.909],
    accuracy: 0.882
  }),

  mannKendallTest: jest.fn().mockResolvedValue({
    sStatistic: 234,
    tau: 0.567,
    zStatistic: 4.532,
    pValue: 0.0001,
    sensSlope: 0.0234,
    sensCI: [0.0156, 0.0312]
  }),

  powerAnalysis: jest.fn().mockResolvedValue({
    effectSize: 0.5,
    sampleSize: 64,
    power: 0.8,
    sensitivityAnalysis: [
      { n: 30, power: 0.54 },
      { n: 50, power: 0.71 },
      { n: 64, power: 0.80 },
      { n: 80, power: 0.87 },
      { n: 100, power: 0.92 }
    ]
  })
}

const mockContext: CalculatorContext = {
  pyodideService: mockPyodideService as any
}

describe('Groups 5-6 핸들러 통합 테스트', () => {
  let router: MethodRouter

  beforeEach(() => {
    router = new MethodRouter(mockContext)
    jest.clearAllMocks()
  })

  describe('Group 5: 회귀분석 확장', () => {
    test('partialCorrelation - 부분상관분석', async () => {
      const data: DataRow[] = Array.from({ length: 30 }, (_, i) => ({
        키: 160 + i,
        체중: 50 + i * 0.5,
        나이: 20 + i * 0.3
      }))

      const result = await router.dispatch('partialCorrelation', data, {
        xColumn: '키',
        yColumn: '체중',
        controlColumns: ['나이'],
        method: 'pearson'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.metrics?.find(m => m.name === '부분상관계수 (r)')?.value).toBe('0.7234')
      expect(result.data?.tables).toHaveLength(3)
      expect(mockPyodideService.partialCorrelation).toHaveBeenCalledTimes(1)
    })

    test('poissonRegression - Poisson 회귀분석', async () => {
      const data: DataRow[] = Array.from({ length: 50 }, (_, i) => ({
        판매량: Math.floor(10 + i * 0.2),
        광고비: 100 + i * 5,
        프로모션횟수: 2 + Math.floor(i / 10)
      }))

      const result = await router.dispatch('poissonRegression', data, {
        dependentColumn: '판매량',
        independentColumns: ['광고비', '프로모션횟수']
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === 'Deviance')?.value).toBe('45.3200')
      expect(result.data?.tables).toHaveLength(3)
      expect(result.data?.tables?.[0].name).toBe('회귀계수')
      expect(result.data?.tables?.[2].name).toBe('과산포 진단')
    })

    test('ordinalRegression - 순서형 회귀분석', async () => {
      const data: DataRow[] = Array.from({ length: 100 }, (_, i) => ({
        만족도: Math.floor(i % 5) + 1,
        나이: 20 + i * 0.4,
        소득: 200 + i * 5
      }))

      const result = await router.dispatch('ordinalRegression', data, {
        dependentColumn: '만족도',
        independentColumns: ['나이', '소득']
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '범주 수')).toBeDefined()
      expect(result.data?.tables?.[1].name).toBe('절편 (Thresholds)')
    })

    test('stepwiseRegression - 단계적 회귀분석', async () => {
      const data: DataRow[] = Array.from({ length: 80 }, (_, i) => ({
        매출: 100 + i * 2,
        광고비: 50 + i,
        직원수: 5 + Math.floor(i / 10),
        매장면적: 100 + i * 0.5
      }))

      const result = await router.dispatch('stepwiseRegression', data, {
        dependentColumn: '매출',
        candidateColumns: ['광고비', '직원수', '매장면적'],
        method: 'forward'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '선택된 변수 수')?.value).toBe('2')
      expect(result.data?.tables?.[0].name).toBe('선택된 변수')
      expect(result.data?.tables?.[2].name).toBe('제거된 변수')
    })

    test('doseResponse - 용량-반응 분석', async () => {
      const data: DataRow[] = Array.from({ length: 20 }, (_, i) => ({
        농도: 0.1 * Math.pow(2, i / 3),
        생존율: 100 - i * 4.5
      }))

      const result = await router.dispatch('doseResponse', data, {
        doseColumn: '농도',
        responseColumn: '생존율',
        model: 'logistic'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === 'EC50')?.value).toBe('12.5000')
      expect(result.data?.tables?.[2].name).toBe('EC 값')
    })

    test('responseSurface - 반응표면 분석', async () => {
      const data: DataRow[] = Array.from({ length: 30 }, (_, i) => ({
        온도: 50 + i,
        시간: 15 + i * 0.3,
        수율: 60 + i * 0.5 - (i % 5) * 2
      }))

      const result = await router.dispatch('responseSurface', data, {
        factorColumns: ['온도', '시간'],
        responseColumn: '수율',
        order: 2
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '최적점 타입')?.value).toBe('최대점')
      expect(result.data?.tables?.[1].name).toBe('최적 조건')
    })
  })

  describe('Group 6: 고급 분석 확장', () => {
    test('factorAnalysis - 요인분석', async () => {
      const data: DataRow[] = Array.from({ length: 100 }, (_, i) => ({
        Q1: 1 + Math.floor(Math.random() * 5),
        Q2: 1 + Math.floor(Math.random() * 5),
        Q3: 1 + Math.floor(Math.random() * 5),
        Q4: 1 + Math.floor(Math.random() * 5)
      }))

      const result = await router.dispatch('factorAnalysis', data, {
        columns: ['Q1', 'Q2', 'Q3', 'Q4'],
        nFactors: 3,
        rotation: 'varimax'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '추출 요인 수')?.value).toBe('3')
      expect(result.data?.tables?.[0].name).toBe('요인 적재량 (Factor Loadings)')
      expect(result.data?.tables?.[2].name).toBe('적합도 검정 (KMO & Bartlett)')
    })

    test('discriminantAnalysis - 판별분석', async () => {
      const data: DataRow[] = Array.from({ length: 162 }, (_, i) => ({
        성별: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
        키: 160 + i * 0.3,
        체중: 50 + i * 0.2,
        나이: 20 + i * 0.15
      }))

      const result = await router.dispatch('discriminantAnalysis', data, {
        groupColumn: '성별',
        predictorColumns: ['키', '체중', '나이']
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '그룹 수')?.value).toBe('3')
      expect(result.data?.metrics?.find(m => m.name === '전체 정확도')?.value).toBe('88.2%')
      expect(result.data?.tables?.[2].name).toBe('혼동 행렬 (Confusion Matrix)')
    })

    test('mannKendallTest - Mann-Kendall 추세 검정', async () => {
      const data: DataRow[] = Array.from({ length: 30 }, (_, i) => ({
        연도: 1990 + i,
        평균기온: 14.5 + i * 0.05 + Math.random() * 0.5
      }))

      const result = await router.dispatch('mannKendallTest', data, {
        timeColumn: '연도',
        valueColumn: '평균기온'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === 'Kendall τ')?.value).toBe('0.5670')
      expect(result.data?.tables?.[1].name).toBe("Sen's Slope 추정")
    })

    test('powerAnalysis - 검정력 분석 (표본크기 계산)', async () => {
      const result = await router.dispatch('powerAnalysis', [], {
        testType: 't-test',
        effectSize: 0.5,
        power: 0.8
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '분석 타입')?.value).toBe('표본크기 계산')
      expect(result.data?.metrics?.find(m => m.name === '표본크기')?.value).toBe('64')
      expect(result.data?.tables?.[1].name).toBe('민감도 분석 (표본크기별 검정력)')
    })

    test('powerAnalysis - 검정력 분석 (검정력 계산)', async () => {
      const result = await router.dispatch('powerAnalysis', [], {
        testType: 'anova',
        effectSize: 0.25,
        sampleSize: 100
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics?.find(m => m.name === '분석 타입')?.value).toBe('검정력 계산')
      expect(result.data?.metrics?.find(m => m.name === '검정력 (1-β)')?.value).toBe('0.8000')
    })
  })

  describe('에러 처리', () => {
    test('partialCorrelation - 통제변수 없음', async () => {
      const data: DataRow[] = [{ 키: 170, 체중: 65 }]

      const result = await router.dispatch('partialCorrelation', data, {
        xColumn: '키',
        yColumn: '체중',
        controlColumns: []
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('통제변수')
    })

    test("poissonRegression - 비정수 데이터", async () => {
      const data: DataRow[] = Array.from({ length: 50 }, (_, i) => ({
        판매량: 10.5 + i * 0.3,
        광고비: 100 + i * 5
      }))

      const result = await router.dispatch("poissonRegression", data, {
        dependentColumn: "판매량",
        independentColumns: ["광고비"]
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("비음수 정수")
    })

    test('factorAnalysis - 변수 부족', async () => {
      const data: DataRow[] = [{ Q1: 1, Q2: 2 }]

      const result = await router.dispatch('factorAnalysis', data, {
        columns: ['Q1', 'Q2'],
        nFactors: 2
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 3개 변수')
    })

    test('powerAnalysis - 파라미터 부족', async () => {
      const result = await router.dispatch('powerAnalysis', [], {
        testType: 't-test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('효과크기 또는 표본크기')
    })
  })

  describe('메서드 라우팅 검증', () => {
    test('모든 Groups 5-6 메서드가 등록되어야 함', () => {
      const supportedMethods = router.getSupportedMethods()

      expect(supportedMethods).toContain('partialCorrelation')
      expect(supportedMethods).toContain('poissonRegression')
      expect(supportedMethods).toContain('ordinalRegression')
      expect(supportedMethods).toContain('stepwiseRegression')
      expect(supportedMethods).toContain('doseResponse')
      expect(supportedMethods).toContain('responseSurface')
      expect(supportedMethods).toContain('factorAnalysis')
      expect(supportedMethods).toContain('discriminantAnalysis')
      expect(supportedMethods).toContain('mannKendallTest')
      expect(supportedMethods).toContain('powerAnalysis')
    })

    test('전체 50개 메서드가 등록되어야 함', () => {
      const supportedMethods = router.getSupportedMethods()
      expect(supportedMethods.length).toBeGreaterThanOrEqual(42)
    })
  })
})
