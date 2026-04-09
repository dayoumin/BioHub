import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPowerAnalysis } = vi.hoisted(() => ({
  mockPowerAnalysis: vi.fn(),
}))

vi.mock('@/lib/services/pyodide/pyodide-statistics', () => ({
  pyodideStats: {
    powerAnalysis: mockPowerAnalysis,
  },
}))

import { handleDesign } from '@/lib/services/handlers/handle-design'

describe('handleDesign', () => {
  beforeEach(() => {
    mockPowerAnalysis.mockReset()
    mockPowerAnalysis.mockResolvedValue({
      results: {
        sampleSize: 64,
        power: 0.9,
      },
      inputParameters: {
        alpha: 0.01,
        effectSize: 0.8,
      },
      interpretation: 'ok',
    })
  })

  it('uses settings overrides for power-analysis inputs', async () => {
    await handleDesign(
      { id: 'power-analysis', name: 'Power Analysis', description: '', category: 'design' },
      {
        data: [],
        variables: {
          alpha: 0.05,
          power: 0.7,
          effectSize: 0.5,
          testType: 'anova',
          analysisType: 'a-priori',
          sides: 'one-sided',
        },
        arrays: {},
        totalN: 24,
        missingRemoved: 0,
      },
      {
        alpha: 0.01,
        power: 0.9,
        effectSize: 0.8,
        testType: 'regression',
        analysisType: 'post-hoc',
        sides: 'two-sided',
      }
    )

    expect(mockPowerAnalysis).toHaveBeenCalledWith(
      'regression',
      'post-hoc',
      expect.objectContaining({
        alpha: 0.01,
        power: 0.9,
        effectSize: 0.8,
        sampleSize: 24,
        sides: 'two-sided',
      })
    )
  })
})
