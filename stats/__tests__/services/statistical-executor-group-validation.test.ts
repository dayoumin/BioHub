import { StatisticalExecutor } from '@/lib/services/statistical-executor'

import { vi } from 'vitest'
vi.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    tTest: vi.fn(),
    anova: vi.fn(),
    gamesHowellTest: vi.fn(),
    mannWhitneyU: vi.fn(),
    kruskalWallis: vi.fn(),
    moodMedianTestWorker: vi.fn(),
  }
}))

describe('StatisticalExecutor group size validation', () => {
  let executor: StatisticalExecutor

  beforeEach(() => {
    executor = new StatisticalExecutor()
    vi.clearAllMocks()
  })

  it('executeTTest: rejects when group count is not exactly 2', async () => {
    const method = { id: 'welch-t', name: 'Welch t', description: '', category: 't-test' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1, 2],
          B: [3, 4],
          C: [5, 6]
        }
      }
    } as any

    await expect((executor as any).executeTTest(method, preparedData)).rejects.toThrow(/정확히 2개 그룹/)
    await expect((executor as any).executeTTest(method, preparedData)).rejects.toThrow(/현재: 3개/)
  })

  it('executeTTest: rejects when any group has <2 observations', async () => {
    const method = { id: 'welch-t', name: 'Welch t', description: '', category: 't-test' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          'Treatment A': [1],
          'Treatment B': [1, 2, 3, 4, 5]
        }
      }
    } as any

    await expect((executor as any).executeTTest(method, preparedData)).rejects.toThrow(/각 그룹에 최소 2개 이상의 관측치/)
    await expect((executor as any).executeTTest(method, preparedData)).rejects.toThrow(/Treatment A.*1개/)
    await expect((executor as any).executeTTest(method, preparedData)).rejects.toThrow(/Treatment B.*5개/)
  })

  it('executeANOVA: rejects when any group has <2 observations', async () => {
    const method = { id: 'anova', name: 'ANOVA', description: '', category: 'anova' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1, 2],
          B: [10],
          C: [3, 4]
        }
      }
    } as any

    await expect((executor as any).executeANOVA(method, preparedData)).rejects.toThrow(/각 그룹에 최소 2개 이상의 관측치/)
    await expect((executor as any).executeANOVA(method, preparedData)).rejects.toThrow(/"B": 1개/)
  })

  it('executeNonparametric(mann-whitney): rejects when any group has <2 observations', async () => {
    const method = { id: 'mann-whitney', name: 'Mann-Whitney U', description: '', category: 'nonparametric' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1],
          B: [2, 3]
        }
      },
      totalN: 3
    } as any

    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/각 그룹에 최소 2개 이상의 관측치/)
    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/"A".*1개/)
  })

  it('executeNonparametric(mann-whitney): rejects when group count is not exactly 2', async () => {
    const method = { id: 'mann-whitney', name: 'Mann-Whitney U', description: '', category: 'nonparametric' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1, 2],
          B: [3, 4],
          C: [5, 6]
        }
      },
      totalN: 6
    } as any

    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/정확히 2개 그룹/)
    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/현재: 3개/)
  })

  it('executeNonparametric(kruskal-wallis): rejects when any group has <2 observations', async () => {
    const method = { id: 'kruskal-wallis', name: 'Kruskal-Wallis', description: '', category: 'nonparametric' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1],
          B: [2, 3],
          C: [4, 5]
        }
      },
      totalN: 5
    } as any

    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/각 그룹에 최소 2개 이상의 관측치/)
    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/"A": 1개/)
  })

  it('executeNonparametric(mood-median): rejects when any group has <2 observations', async () => {
    const method = { id: 'mood-median', name: 'Mood Median', description: '', category: 'nonparametric' } as any
    const preparedData = {
      arrays: {
        byGroup: {
          A: [1, 2],
          B: [3],
          C: [4, 5]
        }
      },
      totalN: 5
    } as any

    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/각 그룹에 최소 2개 이상의 관측치/)
    await expect((executor as any).executeNonparametric(method, preparedData)).rejects.toThrow(/"B": 1개/)
  })
})
