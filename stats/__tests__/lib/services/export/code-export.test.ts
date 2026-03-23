import { exportCode, exportCodeFromAnalysis } from '@/lib/services/export/code-export'
import type { StatisticalMethod, AnalysisResult } from '@/types/analysis'
import type { HistoryRecord } from '@/lib/utils/storage-types'

vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return {
    ...orig,
    downloadBlob: vi.fn(),
  }
})

function makeMethod(id: string, name: string, category: StatisticalMethod['category']): StatisticalMethod {
  return {
    id,
    name,
    category,
    description: `${name} description`,
  }
}

function makeAnalysisResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'test-method',
    statistic: 1.23,
    pValue: 0.04,
    interpretation: 'test',
    ...overrides,
  }
}

describe('code-export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('독립표본 t-test export는 결과의 equalVariance 결정을 반영한다', () => {
    const result = makeAnalysisResult({
      assumptions: {
        homogeneity: {
          levene: {
            statistic: 2.1,
            pValue: 0.01,
            equalVariance: false,
          },
        },
      },
    })

    const rExport = exportCodeFromAnalysis({
      method: makeMethod('t-test', 'Independent t-test', 't-test'),
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true },
      dataFileName: 'scores.csv',
      dataRowCount: 24,
      results: result,
    }, 'R')

    const pyExport = exportCodeFromAnalysis({
      method: makeMethod('t-test', 'Independent t-test', 't-test'),
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true },
      dataFileName: 'scores.csv',
      dataRowCount: 24,
      results: result,
    }, 'python')

    expect(rExport.success).toBe(true)
    expect(rExport.content).toContain('var.equal = FALSE')
    expect(pyExport.success).toBe(true)
    expect(pyExport.content).toContain('equal_var=False')
  })

  it('ANOVA export는 실제 postHocMethod를 반영한다', () => {
    const historyRecord: HistoryRecord = {
      id: 'h1',
      timestamp: Date.now(),
      name: 'anova run',
      purpose: 'compare',
      method: {
        id: 'anova',
        name: 'ANOVA',
        category: 'anova',
      },
      variableMapping: {
        dependentVar: 'score',
        groupVar: 'treatment',
      },
      analysisOptions: {
        confidenceLevel: 0.95,
      },
      dataFileName: 'anova.csv',
      dataRowCount: 30,
      results: {
        statistic: 4.2,
        pValue: 0.01,
        postHocMethod: 'games-howell',
      },
    }

    const rExport = exportCode(historyRecord, 'R')
    const pyExport = exportCode(historyRecord, 'python')

    expect(rExport.content).toContain('games_howell_test')
    expect(pyExport.content).toContain('pairwise_gameshowell')
    expect(pyExport.content).not.toContain('posthoc_dunn')
  })

  it('normality export는 첫 변수에 대해 Shapiro-Wilk만 생성한다', () => {
    const exportResult = exportCodeFromAnalysis({
      method: makeMethod('normality-test', 'Normality Test', 'descriptive'),
      variableMapping: { variables: ['first_var', 'second_var'] },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true },
      dataFileName: 'normality.csv',
      dataRowCount: 15,
      results: makeAnalysisResult(),
    }, 'python')

    expect(exportResult.success).toBe(true)
    expect(exportResult.content).toContain('stats.shapiro')
    expect(exportResult.content).not.toContain('kstest')
    expect(exportResult.content).toContain('first_var')
    expect(exportResult.content).not.toContain('second_var')
  })

  it('correlation export는 Kendall를 포함하고 R aes에서 안전한 컬럼 접근을 사용한다', () => {
    const exportResult = exportCodeFromAnalysis({
      method: makeMethod('correlation', 'Correlation', 'correlation'),
      variableMapping: { variables: ['body weight', 'height"cm'] },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true },
      dataFileName: 'corr.csv',
      dataRowCount: 12,
      results: makeAnalysisResult(),
    }, 'R')

    expect(exportResult.success).toBe(true)
    expect(exportResult.content).toContain('method = "kendall"')
    expect(exportResult.content).toContain('aes(x = .data[["body weight"]], y = .data[["height\\"cm"]])')
    expect(exportResult.content).not.toContain('aes(x = body weight')
  })
})
