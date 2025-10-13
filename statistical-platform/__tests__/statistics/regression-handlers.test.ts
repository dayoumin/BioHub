/**
 * 회귀/상관분석 핸들러 단위 테스트
 */

import { createRegressionHandlers } from '@/lib/statistics/calculator-handlers/regression'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'

describe('회귀/상관분석 핸들러 테스트', () => {
  // Mock Pyodide 서비스
  const createMockPyodideService = () => ({
    simpleLinearRegression: jest.fn<() => Promise<any>>().mockResolvedValue({
      slope: 2.5,
      intercept: 10.2,
      rSquared: 0.85,
      fStatistic: 45.2,
      pvalue: 0.001
    }),
    multipleRegression: jest.fn<() => Promise<any>>().mockResolvedValue({
      intercept: 5.3,
      coefficients: [1.2, 3.4, -0.8],
      rSquared: 0.92,
      adjRSquared: 0.89,
      fStatistic: 78.5,
      pValue: 0.0001,
      tStatistics: [2.3, 4.5, -1.2],
      pValues: [0.03, 0.001, 0.25]
    }),
    logisticRegression: jest.fn<() => Promise<any>>().mockResolvedValue({
      intercept: -2.1,
      coefficients: [0.5, 1.2],
      accuracy: 0.85,
      auc: 0.92,
      nIterations: 15
    }),
    calculateCorrelation: jest.fn<() => Promise<any>>().mockResolvedValue({
      matrix: [
        [1.0, 0.85, 0.42],
        [0.85, 1.0, 0.33],
        [0.42, 0.33, 1.0]
      ]
    })
  })

  const mockContext: CalculatorContext = {
    pyodideService: createMockPyodideService() as any
  }

  const handlers = createRegressionHandlers(mockContext)

  describe('단순 선형 회귀', () => {
    const testData = [
      { x: 1, y: 12.5 },
      { x: 2, y: 15.2 },
      { x: 3, y: 17.8 },
      { x: 4, y: 20.1 },
      { x: 5, y: 22.7 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.simpleLinearRegression(testData, {
        independentColumn: 'x',
        dependentColumn: 'y',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toBeDefined()
      expect(result.data?.interpretation).toBeDefined()
    })

    test('예측값 계산', async () => {
      const result = await handlers.simpleLinearRegression(testData, {
        independentColumn: 'x',
        dependentColumn: 'y',
        predictValues: '6, 7, 8'
      })

      expect(result.success).toBe(true)
      const predictionTable = result.data?.tables?.find(t => t.name === '예측값')
      expect(predictionTable).toBeDefined()
      expect(predictionTable?.data).toHaveLength(3)
    })

    test('파라미터 누락 시 에러', async () => {
      const result = await handlers.simpleLinearRegression(testData, {
        independentColumn: 'x'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('종속변수')
    })

    test('데이터 부족 시 에러', async () => {
      const result = await handlers.simpleLinearRegression(
        [{ x: 1, y: 10 }, { x: 2, y: 12 }],
        {
          independentColumn: 'x',
          dependentColumn: 'y'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 3개')
    })
  })

  describe('다중 회귀분석', () => {
    const testData = [
      { x1: 1, x2: 2, x3: 3, y: 15.2 },
      { x1: 2, x2: 3, x3: 1, y: 18.5 },
      { x1: 3, x2: 1, x3: 2, y: 12.8 },
      { x1: 4, x2: 4, x3: 4, y: 25.1 },
      { x1: 5, x2: 2, x3: 3, y: 20.3 },
      { x1: 6, x2: 3, x3: 1, y: 22.7 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.multipleRegression(testData, {
        independentColumns: ['x1', 'x2', 'x3'],
        dependentColumn: 'y',
        alpha: 0.05
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
      expect(result.data?.interpretation).toContain('독립변수')
    })

    test('계수 테이블 확인', async () => {
      const result = await handlers.multipleRegression(testData, {
        independentColumns: ['x1', 'x2', 'x3'],
        dependentColumn: 'y'
      })

      const coeffTable = result.data?.tables?.find(t => t.name === '회귀계수')
      expect(coeffTable).toBeDefined()
      expect(coeffTable?.data).toHaveLength(4) // 절편 + 3개 독립변수
    })

    test('독립변수 누락 시 에러', async () => {
      const result = await handlers.multipleRegression(testData, {
        dependentColumn: 'y'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('독립변수')
    })

    test('데이터 부족 시 에러', async () => {
      const result = await handlers.multipleRegression(
        [{ x1: 1, x2: 2, y: 10 }],
        {
          independentColumns: ['x1', 'x2'],
          dependentColumn: 'y'
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소')
    })
  })

  describe('로지스틱 회귀분석', () => {
    const testData = [
      { x1: 1, x2: 2, outcome: 0 },
      { x1: 2, x2: 3, outcome: 1 },
      { x1: 3, x2: 1, outcome: 0 },
      { x1: 4, x2: 4, outcome: 1 },
      { x1: 5, x2: 2, outcome: 1 },
      { x1: 6, x2: 3, outcome: 1 }
    ]

    test('정상 실행', async () => {
      const result = await handlers.logisticRegression(testData, {
        independentColumns: ['x1', 'x2'],
        dependentColumn: 'outcome',
        method: 'lbfgs',
        maxIter: 100
      })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(2)
    })

    test('Odds Ratio 계산 확인', async () => {
      const result = await handlers.logisticRegression(testData, {
        independentColumns: ['x1', 'x2'],
        dependentColumn: 'outcome'
      })

      const coeffTable = result.data?.tables?.find(t => t.name === '회귀계수')
      expect(coeffTable).toBeDefined()

      // Odds Ratio가 계산되었는지 확인
      const firstRow = coeffTable?.data?.[1] // 첫 번째 독립변수
      expect(firstRow).toHaveProperty('Odds Ratio')
    })

    test('AUC 품질 평가 확인', async () => {
      const result = await handlers.logisticRegression(testData, {
        independentColumns: ['x1', 'x2'],
        dependentColumn: 'outcome'
      })

      expect(result.data?.interpretation).toContain('AUC')
      expect(result.data?.interpretation).toContain('우수한') // AUC 0.92 = 우수한
    })
  })

  describe('상관분석', () => {
    const testData = [
      { var1: 10, var2: 12, var3: 8 },
      { var1: 15, var2: 18, var3: 9 },
      { var1: 12, var2: 14, var3: 7 },
      { var1: 18, var2: 20, var3: 10 },
      { var1: 14, var2: 16, var3: 8 }
    ]

    test('Pearson 상관분석', async () => {
      const result = await handlers.correlationAnalysis(testData, {
        columns: ['var1', 'var2', 'var3'],
        method: 'pearson'
      })

      expect(result.success).toBe(true)
      expect(result.data?.tables).toHaveLength(1)
      expect(result.data?.tables?.[0].name).toContain('Pearson')
    })

    test('Spearman 상관분석', async () => {
      const result = await handlers.correlationAnalysis(testData, {
        columns: ['var1', 'var2', 'var3'],
        method: 'spearman'
      })

      expect(result.data?.tables?.[0].name).toContain('Spearman')
    })

    test('상관계수 행렬 확인', async () => {
      const result = await handlers.correlationAnalysis(testData, {
        columns: ['var1', 'var2', 'var3']
      })

      const corrTable = result.data?.tables?.[0]
      expect(corrTable?.data).toHaveLength(3) // 3x3 행렬
      expect(corrTable?.data?.[0]).toHaveProperty('var1')
      expect(corrTable?.data?.[0]).toHaveProperty('var2')
      expect(corrTable?.data?.[0]).toHaveProperty('var3')
    })

    test('변수 부족 시 에러', async () => {
      const result = await handlers.correlationAnalysis(testData, {
        columns: ['var1']
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('최소 2개')
    })

    test('가장 강한 상관관계 해석', async () => {
      const result = await handlers.correlationAnalysis(testData, {
        columns: ['var1', 'var2', 'var3']
      })

      expect(result.data?.interpretation).toContain('상관관계')
      expect(result.data?.interpretation).toContain('r =')
    })
  })

  describe('공통 유틸리티 통합', () => {
    test('extractMatrixData 사용 확인', async () => {
      const testData = [
        { x1: 1, x2: 2, y: 10 },
        { x1: 'invalid', x2: 3, y: 12 }, // 무효 데이터
        { x1: 3, x2: 4, y: 14 },
        { x1: 4, x2: 5, y: 16 },
        { x1: 5, x2: 6, y: 18 }
      ]

      const result = await handlers.multipleRegression(testData, {
        independentColumns: ['x1', 'x2'],
        dependentColumn: 'y'
      })

      // 유효한 데이터만 사용되었는지 확인
      expect(result.success).toBe(true)
      expect(mockContext.pyodideService.multipleRegression).toHaveBeenCalled()
    })

    test('formatPValue 적용 확인', async () => {
      const result = await handlers.multipleRegression(
        [
          { x: 1, y: 10 },
          { x: 2, y: 12 },
          { x: 3, y: 14 },
          { x: 4, y: 16 }
        ],
        {
          independentColumns: ['x'],
          dependentColumn: 'y'
        }
      )

      const metric = result.data?.metrics?.find(m => m.name === 'p-value')
      expect(metric?.value).toBe('0.0001') // Mock pValue = 0.0001
    })

    test('interpretAUC 적용 확인', async () => {
      const result = await handlers.logisticRegression(
        [
          { x: 1, y: 0 },
          { x: 2, y: 1 },
          { x: 3, y: 0 },
          { x: 4, y: 1 },
          { x: 5, y: 1 }
        ],
        {
          independentColumns: ['x'],
          dependentColumn: 'y'
        }
      )

      // AUC 0.92 → '우수한' 해석
      expect(result.data?.interpretation).toContain('우수한')
    })
  })
})
