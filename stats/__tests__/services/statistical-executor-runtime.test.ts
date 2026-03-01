/**
 * StatisticalExecutor Runtime Tests
 *
 * Runtime tests for discriminant analysis and survival analysis flows
 * to verify data transformation and validation logic.
 */

import { StatisticalExecutor, StatisticalExecutorResult } from '@/lib/services/statistical-executor'

import { vi, Mock } from 'vitest'
// Define mock type explicitly
interface MockPyodideStats {
  discriminantAnalysis: jest.Mock
  kaplanMeierSurvival: jest.Mock
  kaplanMeierAnalysis: jest.Mock
  rocCurveAnalysis: jest.Mock
  coxRegression: jest.Mock
  descriptiveStats: jest.Mock
}

// Mock pyodide-statistics module
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    discriminantAnalysis: vi.fn(),
    kaplanMeierSurvival: vi.fn(),
    kaplanMeierAnalysis: vi.fn(),
    rocCurveAnalysis: vi.fn(),
    coxRegression: vi.fn(),
    descriptiveStats: vi.fn(),
  }
}))

// Import after mock setup
import { pyodideStats } from '@/lib/services/pyodide-statistics'

const mockPyodideStats = pyodideStats as unknown as MockPyodideStats

describe('StatisticalExecutor Runtime Tests', () => {
  let executor: StatisticalExecutor

  beforeEach(() => {
    executor = new StatisticalExecutor()
    vi.clearAllMocks()
  })

  describe('Discriminant Analysis', () => {
    it('should transform column-major to row-major matrix', async () => {
      // Setup mock response
      mockPyodideStats.discriminantAnalysis.mockResolvedValue({
        functions: [
          { functionNumber: 1, eigenvalue: 0.8, varianceExplained: 0.8, cumulativeVariance: 0.8, canonicalCorrelation: 0.7, coefficients: { Var1: 0.5, Var2: 0.3 } }
        ],
        totalVariance: 0.8,
        selectedFunctions: 1,
        groupCentroids: [
          { group: 'A', centroids: { Var1: -0.5, Var2: 0.2 } },
          { group: 'B', centroids: { Var1: 0.5, Var2: -0.2 } }
        ],
        classificationResults: [
          { originalGroup: 'A', predictedGroup: 'A', probability: 0.9, correct: true },
          { originalGroup: 'A', predictedGroup: 'A', probability: 0.85, correct: true },
          { originalGroup: 'B', predictedGroup: 'B', probability: 0.88, correct: true },
          { originalGroup: 'B', predictedGroup: 'B', probability: 0.92, correct: true }
        ],
        accuracy: 1.0,
        confusionMatrix: { A: { A: 2, B: 0 }, B: { A: 0, B: 2 } },
        equalityTests: {
          boxM: { statistic: 0.5, pValue: 0.6, significant: false },
          wilksLambda: { statistic: 0.3, pValue: 0.01, significant: true }
        },
        interpretation: 'LDA classified 100.0% of samples correctly with 1 discriminant function(s).'
      })

      // Sample data: 4 rows x 2 features, 2 groups
      const data = [
        { feature1: 1, feature2: 2, group: 'A' },
        { feature1: 1.5, feature2: 2.5, group: 'A' },
        { feature1: 5, feature2: 6, group: 'B' },
        { feature1: 5.5, feature2: 6.5, group: 'B' }
      ]

      const variables = {
        independent: ['feature1', 'feature2'],
        group: 'group'
      }

      const method = {
        id: 'discriminant',
        name: 'Discriminant Analysis',
        description: 'Linear Discriminant Analysis',
        category: 'advanced' as const
      }

      const result = await executor.executeMethod(method, data, variables)

      // Verify discriminantAnalysis was called with row-major matrix
      expect(mockPyodideStats.discriminantAnalysis).toHaveBeenCalledTimes(1)
      const [dataMatrix, groupLabels] = mockPyodideStats.discriminantAnalysis.mock.calls[0]

      // Check row-major format: 4 samples x 2 features
      expect(dataMatrix).toHaveLength(4)
      expect(dataMatrix[0]).toHaveLength(2)

      // Verify first row: [feature1, feature2] = [1, 2]
      expect(dataMatrix[0][0]).toBe(1)
      expect(dataMatrix[0][1]).toBe(2)

      // Verify second row
      expect(dataMatrix[1][0]).toBe(1.5)
      expect(dataMatrix[1][1]).toBe(2.5)

      // Verify group labels alignment
      expect(groupLabels).toEqual(['A', 'A', 'B', 'B'])
    })

    it('should throw error when no feature data is provided', async () => {
      // Empty data
      const data: Array<Record<string, unknown>> = []

      const variables = {
        independent: ['feature1', 'feature2'],
        group: 'group'
      }

      const method = {
        id: 'discriminant',
        name: 'Discriminant Analysis',
        description: 'Linear Discriminant Analysis',
        category: 'advanced' as const
      }

      // Should throw error for empty feature data
      await expect(executor.executeMethod(method, data, variables)).rejects.toThrow('feature data')
    })

    it('should filter rows with missing feature values while keeping alignment', async () => {
      // Setup mock response
      mockPyodideStats.discriminantAnalysis.mockResolvedValue({
        functions: [{ functionNumber: 1, eigenvalue: 0.8, varianceExplained: 0.8, cumulativeVariance: 0.8, canonicalCorrelation: 0.7, coefficients: {} }],
        totalVariance: 0.8,
        selectedFunctions: 1,
        groupCentroids: [],
        classificationResults: [],
        accuracy: 1.0,
        confusionMatrix: {},
        equalityTests: { boxM: { statistic: 0, pValue: 1, significant: false }, wilksLambda: { statistic: 0, pValue: 1, significant: false } },
        interpretation: 'Test'
      })

      // Data with missing values - row 2 has NaN in feature1, row 4 has missing group
      const data = [
        { feature1: 1, feature2: 2, group: 'A' },     // valid
        { feature1: NaN, feature2: 3, group: 'A' },   // invalid - NaN feature
        { feature1: 5, feature2: 6, group: 'B' },     // valid
        { feature1: 7, feature2: 8 },                 // invalid - missing group
        { feature1: 9, feature2: 10, group: 'B' }     // valid
      ]

      const variables = {
        independent: ['feature1', 'feature2'],
        group: 'group'
      }

      const method = {
        id: 'discriminant',
        name: 'Discriminant Analysis',
        description: 'Linear Discriminant Analysis',
        category: 'advanced' as const
      }

      await executor.executeMethod(method, data, variables)

      // Verify discriminantAnalysis was called with filtered, aligned data
      expect(mockPyodideStats.discriminantAnalysis).toHaveBeenCalledTimes(1)
      const [dataMatrix, groupLabels] = mockPyodideStats.discriminantAnalysis.mock.calls[0]

      // Only 3 valid rows should be passed
      expect(dataMatrix).toHaveLength(3)
      expect(groupLabels).toHaveLength(3)

      // Verify correct values
      expect(dataMatrix[0]).toEqual([1, 2])
      expect(dataMatrix[1]).toEqual([5, 6])
      expect(dataMatrix[2]).toEqual([9, 10])
      expect(groupLabels).toEqual(['A', 'B', 'B'])
    })

    it('should use LDA-specific result mapping', async () => {
      mockPyodideStats.discriminantAnalysis.mockResolvedValue({
        functions: [
          { functionNumber: 1, eigenvalue: 0.75, varianceExplained: 0.75, cumulativeVariance: 0.75, canonicalCorrelation: 0.66, coefficients: {} }
        ],
        totalVariance: 0.75,
        selectedFunctions: 1,
        groupCentroids: [],
        classificationResults: [],
        accuracy: 0.85,
        confusionMatrix: {},
        equalityTests: { boxM: { statistic: 0, pValue: 1, significant: false }, wilksLambda: { statistic: 0, pValue: 1, significant: false } },
        interpretation: 'LDA classified 85.0% of samples correctly.'
      })

      const data = [
        { feature1: 1, group: 'A' },
        { feature1: 2, group: 'B' }
      ]

      const variables = { independent: ['feature1'], group: 'group' }
      const method = { id: 'discriminant', name: 'Discriminant Analysis', description: 'LDA', category: 'advanced' as const }

      const result = await executor.executeMethod(method, data, variables) as StatisticalExecutorResult

      // Verify LDA-specific result fields
      expect(result.mainResults.statistic).toBe(0.85) // accuracy, not explainedVariance
      expect(result.additionalInfo.effectSize?.type).toBe('Classification Accuracy')
      expect(result.additionalInfo.effectSize?.value).toBe(0.85)
      expect(result.additionalInfo.discriminantFunctions?.count).toBe(1)
      expect(result.additionalInfo.discriminantFunctions?.totalVariance).toBe(0.75)
      expect(result.visualizationData?.type).toBe('discriminant-plot')
    })
  })

  describe('Kaplan-Meier Survival Analysis', () => {
    it('should require event variable', async () => {
      const data = [
        { survivalTime: 10 },
        { survivalTime: 20 }
      ]

      const variables = {
        dependent: ['survivalTime']
        // Missing event variable
      }

      const method = {
        id: 'kaplan-meier',
        name: 'Kaplan-Meier',
        description: 'Survival analysis',
        category: 'survival' as const
      }

      await expect(executor.executeMethod(method, data, variables)).rejects.toThrow('event variable')
    })

    it('should validate events are binary', async () => {
      mockPyodideStats.kaplanMeierAnalysis.mockResolvedValue({
        curves: { all: { time: [10, 20, 30], survival: [1.0, 0.67, 0.33], ciLo: [1.0, 0.4, 0.05], ciHi: [1.0, 0.93, 0.76], atRisk: [3, 2, 1], medianSurvival: 20 } },
        logRankP: null, medianSurvivalTime: 20
      })

      const data = [
        { survivalTime: 10, event: 1 },
        { survivalTime: 20, event: 0 },
        { survivalTime: 30, event: 2 } // Invalid: should be 0 or 1
      ]

      const variables = {
        dependent: ['survivalTime'],
        event: 'event'
      }

      const method = {
        id: 'kaplan-meier',
        name: 'Kaplan-Meier',
        description: 'Survival analysis',
        category: 'survival' as const
      }

      await expect(executor.executeMethod(method, data, variables)).rejects.toThrow('binary')
    })

    it('should align time and event arrays correctly', async () => {
      mockPyodideStats.kaplanMeierAnalysis.mockResolvedValue({
        curves: {
          all: {
            time: [10, 20, 30],
            survival: [1.0, 0.67, 0.33],
            ciLo: [1.0, 0.4, 0.05],
            ciHi: [1.0, 0.93, 0.76],
            atRisk: [3, 2, 1],
            medianSurvival: 20
          }
        },
        logRankP: null,
        medianSurvivalTime: 20
      })

      const data = [
        { survivalTime: 10, event: 1 },
        { survivalTime: NaN, event: 0 }, // Should be filtered out
        { survivalTime: 20, event: 0 },
        { survivalTime: 30, event: 1 }
      ]

      const variables = {
        dependent: ['survivalTime'],
        event: 'event'
      }

      const method = {
        id: 'kaplan-meier',
        name: 'Kaplan-Meier',
        description: 'Survival analysis',
        category: 'survival' as const
      }

      await executor.executeMethod(method, data, variables)

      // Verify kaplanMeierAnalysis was called with aligned arrays
      expect(mockPyodideStats.kaplanMeierAnalysis).toHaveBeenCalledTimes(1)
      const callArgs = mockPyodideStats.kaplanMeierAnalysis.mock.calls[0]
      const times = callArgs[0]
      const events = callArgs[1]

      // Should filter out the NaN row
      expect(times).toHaveLength(3)
      expect(events).toHaveLength(3)
      expect(times).toEqual([10, 20, 30])
      expect(events).toEqual([1, 0, 1])
    })
  })

  describe('Cox Regression', () => {
    it('should require event variable', async () => {
      const data = [
        { survivalTime: 10, age: 50 },
        { survivalTime: 20, age: 60 }
      ]

      const variables = {
        dependent: ['survivalTime'],
        independent: ['age']
        // Missing event variable
      }

      const method = {
        id: 'cox-regression',
        name: 'Cox Regression',
        description: 'Cox proportional hazards',
        category: 'survival' as const
      }

      await expect(executor.executeMethod(method, data, variables)).rejects.toThrow('event variable')
    })

    it('should validate events are binary', async () => {
      mockPyodideStats.coxRegression.mockResolvedValue({
        hazardRatios: [1.5],
        coefficients: [0.4],
        pValues: [0.05],
        concordanceIndex: 0.7
      })

      const data = [
        { survivalTime: 10, event: 1, age: 50 },
        { survivalTime: 20, event: 0, age: 60 },
        { survivalTime: 30, event: 3, age: 70 } // Invalid
      ]

      const variables = {
        dependent: ['survivalTime'],
        event: 'event',
        independent: ['age']
      }

      const method = {
        id: 'cox-regression',
        name: 'Cox Regression',
        description: 'Cox proportional hazards',
        category: 'survival' as const
      }

      await expect(executor.executeMethod(method, data, variables)).rejects.toThrow('binary')
    })

    it('should align time, event, and covariate arrays', async () => {
      mockPyodideStats.coxRegression.mockResolvedValue({
        hazardRatios: [1.5, 2.0],
        coefficients: [0.4, 0.7],
        pValues: [0.05, 0.01],
        concordanceIndex: 0.75
      })

      const data = [
        { survivalTime: 10, event: 1, age: 50, bmi: 25 },
        { survivalTime: NaN, event: 0, age: 60, bmi: 28 }, // Filter out
        { survivalTime: 20, event: 0, age: 65, bmi: NaN }, // Filter out (missing covariate)
        { survivalTime: 30, event: 1, age: 70, bmi: 30 }
      ]

      const variables = {
        dependent: ['survivalTime'],
        event: 'event',
        independent: ['age', 'bmi']
      }

      const method = {
        id: 'cox-regression',
        name: 'Cox Regression',
        description: 'Cox proportional hazards',
        category: 'survival' as const
      }

      await executor.executeMethod(method, data, variables)

      expect(mockPyodideStats.coxRegression).toHaveBeenCalledTimes(1)
      const [times, events, covariates] = mockPyodideStats.coxRegression.mock.calls[0]

      // Should filter out rows with NaN in any variable
      expect(times).toHaveLength(2)
      expect(events).toHaveLength(2)
      expect(times).toEqual([10, 30])
      expect(events).toEqual([1, 1])

      // Covariates should be column-major
      expect(covariates).toHaveLength(2) // 2 covariates
      expect(covariates[0]).toEqual([50, 70]) // age column
      expect(covariates[1]).toEqual([25, 30]) // bmi column
    })

    it('should use custom independentNames when provided', async () => {
      mockPyodideStats.coxRegression.mockResolvedValue({
        hazardRatios: [1.5],
        coefficients: [0.4],
        pValues: [0.05],
        concordanceIndex: 0.7,
        confidenceIntervals: [[1.1, 2.1]]
      })

      const data = [
        { survivalTime: 10, event: 1, age: 50 },
        { survivalTime: 30, event: 1, age: 70 }
      ]

      const variables = {
        dependent: ['survivalTime'],
        event: 'event',
        independent: ['age'],
        independentNames: ['Age (years)'] // Custom label
      }

      const method = {
        id: 'cox-regression',
        name: 'Cox Regression',
        description: 'Cox proportional hazards',
        category: 'survival' as const
      }

      const result = await executor.executeMethod(method, data, variables)

      expect(mockPyodideStats.coxRegression).toHaveBeenCalledTimes(1)
      const [, , , covariateNames] = mockPyodideStats.coxRegression.mock.calls[0]

      // Should use custom name instead of variable id
      expect(covariateNames).toEqual(['Age (years)'])

      // Verify result includes custom names in visualization data
      expect(result.visualizationData?.data.covariateNames).toEqual(['Age (years)'])
    })
  })

  // ─── KM 그룹 정렬 (결측 제거 후 인덱스 일치) ─────────────────

  describe('Kaplan-Meier — 그룹 배열 결측 후 인덱스 일치', () => {
    const kmMockResult = {
      curves: {
        ctrl: { time: [0, 5], survival: [1.0, 0.8], ciLo: [1.0, 0.6], ciHi: [1.0, 0.93], atRisk: [3, 2], medianSurvival: null, censored: [] },
        trt:  { time: [0, 5], survival: [1.0, 0.6], ciLo: [1.0, 0.4], ciHi: [1.0, 0.8],  atRisk: [3, 2], medianSurvival: null, censored: [] },
      },
      logRankP: 0.04,
      medianSurvivalTime: null,
    }

    it('NaN 행 제거 후 group 배열이 time/event와 인덱스 일치한다', async () => {
      mockPyodideStats.kaplanMeierAnalysis.mockResolvedValue(kmMockResult)

      const data = [
        { time: 5,   event: 1, group: 'trt' },
        { time: NaN, event: 1, group: 'ctrl' }, // NaN → 제거됨
        { time: 10,  event: 0, group: 'ctrl' },
        { time: 15,  event: 1, group: 'trt' },
      ]

      const method = { id: 'kaplan-meier', name: 'KM', description: '', category: 'survival' as const }
      await executor.executeMethod(method, data, { dependent: ['time'], event: 'event', factor: 'group' })

      const callArgs = mockPyodideStats.kaplanMeierAnalysis.mock.calls[0]
      const times  = callArgs[0] as number[]
      const events = callArgs[1] as number[]
      const groups = callArgs[2] as string[]

      // NaN 행(index 1) 제거 → 3개 남음
      expect(times).toHaveLength(3)
      expect(events).toHaveLength(3)
      expect(groups).toHaveLength(3)

      // 인덱스 일치 확인: times[1]=10 → group[1]='ctrl'
      expect(times[0]).toBe(5);   expect(groups[0]).toBe('trt')
      expect(times[1]).toBe(10);  expect(groups[1]).toBe('ctrl')
      expect(times[2]).toBe(15);  expect(groups[2]).toBe('trt')
    })

    it('factor 변수 없으면 groups=undefined으로 호출된다', async () => {
      mockPyodideStats.kaplanMeierAnalysis.mockResolvedValue({
        curves: { all: { time: [0, 5], survival: [1.0, 0.8], ciLo: [1.0, 0.6], ciHi: [1.0, 0.93], atRisk: [2, 1], medianSurvival: null, censored: [] } },
        logRankP: null, medianSurvivalTime: null,
      })
      const data = [{ time: 5, event: 1 }, { time: 10, event: 0 }]
      const method = { id: 'kaplan-meier', name: 'KM', description: '', category: 'survival' as const }
      await executor.executeMethod(method, data, { dependent: ['time'], event: 'event' })

      const callArgs = mockPyodideStats.kaplanMeierAnalysis.mock.calls[0]
      expect(callArgs[2]).toBeUndefined()
    })
  })

  // ─── ROC Curve 실행 ──────────────────────────────────────────

  describe('ROC Curve', () => {
    const rocMockResult = {
      rocPoints: [{ fpr: 0.0, tpr: 0.0 }, { fpr: 0.2, tpr: 0.7 }, { fpr: 1.0, tpr: 1.0 }],
      auc: 0.82,
      aucCI: { lower: 0.74, upper: 0.90 },
      optimalThreshold: 0.45,
      sensitivity: 0.78,
      specificity: 0.80,
    }

    it('actualClass/predictedProb를 올바르게 추출해 rocCurveAnalysis를 호출한다', async () => {
      mockPyodideStats.rocCurveAnalysis.mockResolvedValue(rocMockResult)

      const data = [
        { outcome: 1, score: 0.8 },
        { outcome: 0, score: 0.3 },
        { outcome: 1, score: 0.7 },
        { outcome: 0, score: 0.2 },
      ]

      const method = { id: 'roc-curve', name: 'ROC', description: '', category: 'survival' as const }
      await executor.executeMethod(method, data, { dependent: ['outcome'], independent: ['score'] })

      expect(mockPyodideStats.rocCurveAnalysis).toHaveBeenCalledTimes(1)
      const [actualClass, predictedProb] = mockPyodideStats.rocCurveAnalysis.mock.calls[0]
      expect(actualClass).toEqual([1, 0, 1, 0])
      expect(predictedProb).toEqual([0.8, 0.3, 0.7, 0.2])
    })

    it('NaN 행이 제거된 후 유효 행만 rocCurveAnalysis로 전달된다', async () => {
      mockPyodideStats.rocCurveAnalysis.mockResolvedValue(rocMockResult)

      const data = [
        { outcome: 1, score: 0.8 },
        { outcome: NaN, score: 0.3 }, // NaN → 제거
        { outcome: 0, score: NaN },   // NaN → 제거
        { outcome: 1, score: 0.7 },
        { outcome: 0, score: 0.4 },
        { outcome: 0, score: 0.2 },
      ]

      const method = { id: 'roc-curve', name: 'ROC', description: '', category: 'survival' as const }
      await executor.executeMethod(method, data, { dependent: ['outcome'], independent: ['score'] })

      const [actualClass, predictedProb] = mockPyodideStats.rocCurveAnalysis.mock.calls[0]
      // 6개 중 NaN 2개 제거 → 4개
      expect(actualClass).toHaveLength(4)
      expect(predictedProb).toHaveLength(4)
      expect(actualClass).toEqual([1, 1, 0, 0])
      expect(predictedProb).toEqual([0.8, 0.7, 0.4, 0.2])
    })

    it('관찰값이 4개 미만이면 에러가 발생한다', async () => {
      const data = [{ outcome: 1, score: 0.8 }, { outcome: 0, score: 0.3 }]
      const method = { id: 'roc-curve', name: 'ROC', description: '', category: 'survival' as const }
      await expect(
        executor.executeMethod(method, data, { dependent: ['outcome'], independent: ['score'] })
      ).rejects.toThrow('최소 4개')
    })

    it('결과에 visualizationData.type=roc-curve가 포함된다', async () => {
      mockPyodideStats.rocCurveAnalysis.mockResolvedValue(rocMockResult)
      const data = [
        { outcome: 1, score: 0.8 }, { outcome: 0, score: 0.3 },
        { outcome: 1, score: 0.7 }, { outcome: 0, score: 0.2 },
      ]
      const method = { id: 'roc-curve', name: 'ROC', description: '', category: 'survival' as const }
      const result = await executor.executeMethod(method, data, { dependent: ['outcome'], independent: ['score'] })
      expect(result.visualizationData?.type).toBe('roc-curve')
    })

    it('additionalInfo에 auc, aucCI, sensitivity, specificity가 포함된다', async () => {
      mockPyodideStats.rocCurveAnalysis.mockResolvedValue(rocMockResult)
      const data = [
        { outcome: 1, score: 0.8 }, { outcome: 0, score: 0.3 },
        { outcome: 1, score: 0.7 }, { outcome: 0, score: 0.2 },
      ]
      const method = { id: 'roc-curve', name: 'ROC', description: '', category: 'survival' as const }
      const result = await executor.executeMethod(method, data, { dependent: ['outcome'], independent: ['score'] })
      const info = result.additionalInfo as Record<string, unknown>
      expect(info.auc).toBeCloseTo(0.82)
      expect(info.sensitivity).toBeCloseTo(0.78)
      expect(info.specificity).toBeCloseTo(0.80)
    })
  })
})
