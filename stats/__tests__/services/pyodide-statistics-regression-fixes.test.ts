import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockCore,
  mockPcaAnalysis,
  mockOneWayAnova,
  mockPartialCorrelation,
  mockClusterAnalysis,
  mockDoseResponseAnalysis,
  mockResponseSurfaceAnalysis,
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
  mockDoseResponseAnalysis: vi.fn(),
  mockResponseSurfaceAnalysis: vi.fn(),
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
  doseResponseAnalysis: mockDoseResponseAnalysis,
  responseSurfaceAnalysis: mockResponseSurfaceAnalysis,
}))

vi.unmock('@/lib/services/pyodide/pyodide-statistics')

describe('pyodide-statistics regression fixes', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  async function getServiceInstance() {
    const { PyodideStatisticsService } = await import('@/lib/services/pyodide/pyodide-statistics')
    return PyodideStatisticsService.getInstance()
  }

  it('pcaAnalysis() returns rotationMatrix and screeData correctly', async () => {
    const mockResult = {
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
    }
    mockPcaAnalysis.mockResolvedValue(mockResult)

    const service = await getServiceInstance()
    const result = await service.pcaAnalysis([[1, 2], [3, 4]], 2)

    expect(result.rotationMatrix).toEqual([[0.8, 0.2], [0.1, 0.9]])
    expect(result.screeData).toHaveLength(2)
    expect((result.screeData![0] as { varianceExplained: number }).varianceExplained).toBe(60)
    expect((result.screeData![1] as { varianceExplained: number }).varianceExplained).toBe(40)
  })

  it('pcaAnalysis() returns selectedComponents and qualityMetrics', async () => {
    const mockResult = {
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
    }
    mockPcaAnalysis.mockResolvedValue(mockResult)

    const service = await getServiceInstance()
    const result = await service.pcaAnalysis([[1, 2], [3, 4]], 2)

    expect(result.rotationMatrix).toEqual([[1, 0], [0, 1]])
    expect(result.selectedComponents).toBe(2)
    expect((result.screeData![0] as { varianceExplained: number }).varianceExplained).toBe(55)
    expect((result.screeData![1] as { varianceExplained: number }).varianceExplained).toBe(30)
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

  it('doseResponseAnalysis() forwards optional constraints to generated wrapper', async () => {
    mockDoseResponseAnalysis.mockResolvedValue({
      model: 'logistic4',
      parameters: { ec50: 1.2 },
      fittedValues: [10, 20],
      residuals: [0.1, -0.1],
      rSquared: 0.9,
      pValue: 0.01,
      aic: 12,
      bic: 14,
      confidenceIntervals: { ec50: [1.0, 1.4] },
      goodnessOfFit: { chiSquare: 4.2, pValue: 0.01, degreesFreedom: 1 },
      ec50: 1.2,
    })

    const service = await getServiceInstance()
    const constraints = { bottom: 0, top: 100 }

    await service.doseResponseAnalysis([1, 2], [10, 20], 'logistic4', constraints)

    expect(mockDoseResponseAnalysis).toHaveBeenCalledWith(
      [1, 2],
      [10, 20],
      'logistic4',
      constraints,
    )
  })

  it('responseSurfaceAnalysis() preserves row-object data and optional flags', async () => {
    mockResponseSurfaceAnalysis.mockResolvedValue({
      modelType: 'custom',
      coefficients: { intercept: 1 },
      fittedValues: [1],
      residuals: [0],
      rSquared: 0.8,
      adjustedRSquared: 0.7,
      fStatistic: 4.5,
      fPvalue: 0.02,
      pValue: 0.02,
      anovaTable: {},
      optimization: {},
      designAdequacy: {},
    })

    const service = await getServiceInstance()
    const rows = [{ y: 10, x1: 1, x2: 2 }]

    await service.responseSurfaceAnalysis(rows, 'y', ['x1', 'x2'], 'custom', false, true)

    expect(mockResponseSurfaceAnalysis).toHaveBeenCalledWith(
      rows,
      'y',
      ['x1', 'x2'],
      'custom',
      false,
      true,
    )
  })
})
