import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCore,
  mockPcaAnalysis,
  mockOneWayAnova,
  mockPartialCorrelation,
  mockClusterAnalysis,
} = vi.hoisted(() => ({
  mockCore: {
    initialize: vi.fn().mockResolvedValue(undefined),
    ensureWorker2Loaded: vi.fn().mockResolvedValue(undefined),
    ensureWorker1Loaded: vi.fn().mockResolvedValue(undefined),
    ensureWorker3Loaded: vi.fn().mockResolvedValue(undefined),
    ensureWorker4Loaded: vi.fn().mockResolvedValue(undefined),
    getPyodideInstance: vi.fn(),
  },
  mockPcaAnalysis: vi.fn(),
  mockOneWayAnova: vi.fn(),
  mockPartialCorrelation: vi.fn(),
  mockClusterAnalysis: vi.fn(),
}))

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: vi.fn(() => mockCore),
    resetInstance: vi.fn(),
  },
}))

vi.mock('@/lib/generated/method-types.generated', () => ({
  pcaAnalysis: mockPcaAnalysis,
  oneWayAnova: mockOneWayAnova,
  partialCorrelation: mockPartialCorrelation,
  clusterAnalysis: mockClusterAnalysis,
}))

describe('pyodide-statistics regression fixes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unmock('@/lib/services/pyodide-statistics')
    vi.clearAllMocks()
  })

  async function getServiceInstance() {
    const { PyodideStatisticsService } = await import('@/lib/services/pyodide-statistics')
    return PyodideStatisticsService.getInstance()
  }

  it('pca() maps screeData and rotationMatrix safely', async () => {
    mockPcaAnalysis.mockResolvedValue({
      components: [
        { componentNumber: 1, eigenvalue: 2.0, varianceExplained: 60, cumulativeVariance: 60, loadings: { Var1: 0.8 } },
      ],
      totalVariance: 3.3,
      selectedComponents: 2,
      rotationMatrix: [[0.8, 0.2], [0.1, 0.9]],
      transformedData: [{ PC1: 1.2, PC2: -0.4 }],
      variableContributions: { Var1: [0.64, 0.04], Var2: [0.04, 0.81] },
      qualityMetrics: {
        kmo: 0.72,
        bartlett: { statistic: 12.3, pValue: 0.004, significant: true },
      },
      screeData: [
        { component: 1, eigenvalue: 2.0, varianceExplained: 60 },
        { component: 2, eigenvalue: 1.0, varianceExplained: 40 },
      ],
      interpretation: 'ok',
    })

    const service = await getServiceInstance()
    const result = await service.pca([[1, 2], [3, 4]])

    expect(result.components).toEqual([[0.8, 0.2], [0.1, 0.9]])
    expect(result.explainedVariance).toEqual([60, 40])
    expect(result.totalExplainedVariance).toBe(100)
  })

  it('performPCA() converts percentage variance to ratio and computes cumulative variance', async () => {
    mockPcaAnalysis.mockResolvedValue({
      components: [],
      totalVariance: 2.0,
      selectedComponents: 2,
      rotationMatrix: [[1, 0], [0, 1]],
      transformedData: [],
      variableContributions: {},
      qualityMetrics: {
        kmo: null,
        bartlett: { statistic: null, pValue: null, significant: null },
      },
      screeData: [
        { component: 1, eigenvalue: 1.5, varianceExplained: 55 },
        { component: 2, eigenvalue: 0.9, varianceExplained: 30 },
      ],
      interpretation: 'ok',
    })

    const service = await getServiceInstance()
    const result = await service.performPCA([[1, 2], [3, 4]], ['A', 'B'], 2)

    expect(result.components).toEqual([[1, 0], [0, 1]])
    expect(result.explainedVarianceRatio[0]).toBeCloseTo(0.55, 8)
    expect(result.explainedVarianceRatio[1]).toBeCloseTo(0.3, 8)
    expect(result.cumulativeVariance[0]).toBeCloseTo(0.55, 8)
    expect(result.cumulativeVariance[1]).toBeCloseTo(0.85, 8)
    expect(result.totalExplainedVariance).toBeCloseTo(0.85, 8)
  })

  it('oneWayAnovaWorker and partialCorrelationWorker call generated wrappers without unsafe cast', async () => {
    mockOneWayAnova.mockResolvedValue({
      fStatistic: 4.1,
      pValue: 0.02,
      dfBetween: 2,
      dfWithin: 27,
      etaSquared: 0.21,
      omegaSquared: 0.18,
      ssBetween: 10,
      ssWithin: 30,
      ssTotal: 40,
    })
    mockPartialCorrelation.mockResolvedValue({
      correlation: 0.4,
      pValue: 0.03,
      df: 20,
      nObservations: 24,
      confidenceInterval: { lower: 0.1, upper: 0.6 },
    })

    const service = await getServiceInstance()

    const anova = await service.oneWayAnovaWorker([[1, 2], [3, 4], [5, 6]])
    await service.partialCorrelationWorker([[1, 2, 3], [4, 5, 6]], 0, 1, [2])

    expect(anova.ssBetween).toBe(10)
    expect(mockPartialCorrelation).toHaveBeenCalledWith(
      [[1, 2, 3], [4, 5, 6]],
      0,
      1,
      [2],
    )
  })

  it('pyodide getter delegates to core getter', async () => {
    const fakePyodide = { runPython: vi.fn() }
    mockCore.getPyodideInstance.mockReturnValue(fakePyodide)

    const service = await getServiceInstance()
    expect(service.pyodide).toBe(fakePyodide)
    expect(mockCore.getPyodideInstance).toHaveBeenCalled()
  })

  it('clusterAnalysis() keeps backward-compatible alias fields', async () => {
    mockClusterAnalysis.mockResolvedValue({
      nClusters: 2,
      clusterAssignments: [0, 1, 0, 1],
      centroids: [[1, 2], [3, 4]],
      inertia: 1.23,
      silhouetteScore: 0.67,
      clusterSizes: [2, 2],
    })

    const service = await getServiceInstance()
    const result = await service.clusterAnalysis([[1, 2], [2, 3], [3, 4], [4, 5]], { nClusters: 2 })

    expect(result.clusterAssignments).toEqual([0, 1, 0, 1])
    expect(result.centroids).toEqual([[1, 2], [3, 4]])
    expect(result.clusters).toEqual([0, 1, 0, 1])
    expect(result.centers).toEqual([[1, 2], [3, 4]])
  })
})
