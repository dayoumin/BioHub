import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    chartLabels: {
      errorMessage: 'error',
    },
  }),
}))

import { useNormalityTest } from '@/components/smart-flow/steps/validation/hooks/useNormalityTest'
import type { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import type { DataRow } from '@/types/smart-flow'

describe('useNormalityTest resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps column result when Anderson/Dagostino fail', async () => {
    const mockService = {
      shapiroWilkTest: vi.fn().mockResolvedValue({ statistic: 0.98, pValue: 0.2, isNormal: true }),
      andersonDarlingTest: vi.fn().mockRejectedValue(new Error('not implemented')),
      dagostinoPearsonTest: vi.fn().mockRejectedValue(new Error('not implemented')),
    }

    const rows: DataRow[] = Array.from({ length: 20 }, (_, i) => ({ score: i + 1 }))

    const { result } = renderHook(() =>
      useNormalityTest({
        pyodideService: mockService as unknown as PyodideStatisticsService,
        pyodideLoading: false,
        pyodideLoaded: true,
        normalityRule: 'strict',
        alpha: 0.05,
      }),
    )

    await act(async () => {
      await result.current.runNormalityTests(rows, [{ name: 'score' }])
    })

    await waitFor(() => {
      expect(result.current.normalityTests.score).toBeDefined()
    })

    expect(result.current.normalityTests.score.shapiroWilk?.pValue).toBe(0.2)
    expect(result.current.normalityTests.score.andersonDarling).toBeUndefined()
    expect(result.current.normalityTests.score.dagostinoPearson).toBeUndefined()
    expect(result.current.normalityTests.score.summary).toEqual({
      totalTests: 1,
      passedTests: 1,
      isNormal: true,
    })
  })

  it('applies alpha threshold using pValue > alpha', async () => {
    const mockService = {
      shapiroWilkTest: vi.fn().mockResolvedValue({ statistic: 0.95, pValue: 0.08, isNormal: true }),
      andersonDarlingTest: vi.fn().mockRejectedValue(new Error('not implemented')),
      dagostinoPearsonTest: vi.fn().mockRejectedValue(new Error('not implemented')),
    }

    const rows: DataRow[] = Array.from({ length: 20 }, (_, i) => ({ value: i + 1 }))

    const { result } = renderHook(() =>
      useNormalityTest({
        pyodideService: mockService as unknown as PyodideStatisticsService,
        pyodideLoading: false,
        pyodideLoaded: true,
        normalityRule: 'any',
        alpha: 0.1,
      }),
    )

    await act(async () => {
      await result.current.runNormalityTests(rows, [{ name: 'value' }])
    })

    await waitFor(() => {
      expect(result.current.normalityTests.value?.summary).toBeDefined()
    })

    expect(result.current.normalityTests.value.summary).toEqual({
      totalTests: 1,
      passedTests: 0,
      isNormal: false,
    })
  })

  it('does not crash when all normality tests fail', async () => {
    const mockService = {
      shapiroWilkTest: vi.fn().mockRejectedValue(new Error('fail')),
      andersonDarlingTest: vi.fn().mockRejectedValue(new Error('fail')),
      dagostinoPearsonTest: vi.fn().mockRejectedValue(new Error('fail')),
    }

    const rows: DataRow[] = Array.from({ length: 20 }, (_, i) => ({ metric: i + 1 }))

    const { result } = renderHook(() =>
      useNormalityTest({
        pyodideService: mockService as unknown as PyodideStatisticsService,
        pyodideLoading: false,
        pyodideLoaded: true,
      }),
    )

    await act(async () => {
      await result.current.runNormalityTests(rows, [{ name: 'metric' }])
    })

    await waitFor(() => {
      expect(result.current.normalityTests.metric?.summary).toBeDefined()
    })

    expect(result.current.normalityTests.metric.summary).toEqual({
      totalTests: 0,
      passedTests: 0,
      isNormal: false,
    })
  })
})
