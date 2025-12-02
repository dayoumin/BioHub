/**
 * StatisticalExecutor Runtime Tests
 *
 * Runtime tests for discriminant analysis and survival analysis flows
 * to verify data transformation and validation logic.
 */

import { StatisticalExecutor, StatisticalExecutorResult } from '@/lib/services/statistical-executor'

// Define mock type explicitly
interface MockPyodideStats {
  discriminantAnalysis: jest.Mock
  kaplanMeierSurvival: jest.Mock
  coxRegression: jest.Mock
  descriptiveStats: jest.Mock
}

// Mock pyodide-statistics module
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    discriminantAnalysis: jest.fn(),
    kaplanMeierSurvival: jest.fn(),
    coxRegression: jest.fn(),
    descriptiveStats: jest.fn(),
  }
}))

// Import after mock setup
import { pyodideStats } from '@/lib/services/pyodide-statistics'

const mockPyodideStats = pyodideStats as unknown as MockPyodideStats

describe('StatisticalExecutor Runtime Tests', () => {
  let executor: StatisticalExecutor

  beforeEach(() => {
    executor = new StatisticalExecutor()
    jest.clearAllMocks()
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
      mockPyodideStats.kaplanMeierSurvival.mockResolvedValue({
        times: [10, 20, 30],
        survivalFunction: [1.0, 0.67, 0.33],
        medianSurvival: 20
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
      mockPyodideStats.kaplanMeierSurvival.mockResolvedValue({
        times: [10, 20, 30],
        survivalFunction: [1.0, 0.67, 0.33],
        medianSurvival: 20
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

      // Verify kaplanMeierSurvival was called with aligned arrays
      expect(mockPyodideStats.kaplanMeierSurvival).toHaveBeenCalledTimes(1)
      const [times, events] = mockPyodideStats.kaplanMeierSurvival.mock.calls[0]

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
})
