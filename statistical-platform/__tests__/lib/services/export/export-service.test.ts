/**
 * ExportService 통합 테스트
 *
 * ExportContext → format 분기 → 실제 exporter 호출까지의 전체 파이프라인 검증
 */

import type { ExportContext } from '@/lib/services/export/export-types'
import type { AnalysisResult } from '@/types/smart-flow'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return {
    ...orig,
    downloadBlob: vi.fn(),
  }
})

import { ExportService } from '@/lib/services/export/export-service'
import { downloadBlob } from '@/lib/services/export/export-data-builder'

// ─── 픽스처 ───

function makeContext(overrides: Partial<ExportContext> = {}): ExportContext {
  const analysisResult: AnalysisResult = {
    method: 'chi-square',
    statistic: 15.32,
    pValue: 0.0004,
    df: 4,
    effectSize: { value: 0.28, type: 'cramersV' },
    interpretation: '변수 간 유의한 연관성이 있습니다.',
  }

  const statisticalResult: StatisticalResult = {
    testName: 'Chi-square test',
    statisticName: 'χ²',
    statistic: 15.32,
    pValue: 0.0004,
  }

  return {
    analysisResult,
    statisticalResult,
    aiInterpretation: null,
    apaFormat: null,
    dataInfo: null,
    ...overrides,
  }
}

// ─── 테스트 ───

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('DOCX 내보내기 파이프라인', async () => {
    const result = await ExportService.export(makeContext(), 'docx')

    expect(result.success).toBe(true)
    expect(result.fileName).toMatch(/chi-square.*\.docx$/)
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })

  it('Excel 내보내기 파이프라인', async () => {
    const result = await ExportService.export(makeContext(), 'xlsx')

    expect(result.success).toBe(true)
    expect(result.fileName).toMatch(/chi-square.*\.xlsx$/)
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })

  it('HTML 내보내기 파이프라인', async () => {
    const result = await ExportService.export(makeContext(), 'html')

    expect(result.success).toBe(true)
    expect(result.fileName).toMatch(/chi-square.*\.html$/)
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })

  it('지원하지 않는 포맷은 에러 반환', async () => {
    const result = await ExportService.export(
      makeContext(),
      'pdf' as unknown as 'docx',
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Unsupported format')
  })

  it('AI 해석 포함 풀 컨텍스트 → DOCX', async () => {
    const ctx = makeContext({
      aiInterpretation: '### 한줄 요약\n카이제곱 분석 요약\n\n### 상세 해석\n상세 내용',
      apaFormat: 'χ²(4) = 15.32, p < .001',
      dataInfo: {
        fileName: 'survey.csv',
        totalRows: 500,
        columnCount: 12,
        variables: ['gender', 'age', 'response'],
      },
    })
    const result = await ExportService.export(ctx, 'docx')

    expect(result.success).toBe(true)
    expect(downloadBlob).toHaveBeenCalledTimes(1)
  })

  it('AI 해석 포함 풀 컨텍스트 → Excel', async () => {
    const ctx = makeContext({
      aiInterpretation: '### 한줄 요약\n요약\n\n### 상세 해석\n상세',
      apaFormat: 'χ²(4) = 15.32, p < .001',
      dataInfo: {
        fileName: 'survey.csv',
        totalRows: 500,
        columnCount: 12,
        variables: ['x', 'y', 'z'],
      },
    })
    const result = await ExportService.export(ctx, 'xlsx')

    expect(result.success).toBe(true)
  })

  it('회귀분석 결과 (coefficients + additional) → DOCX', async () => {
    const ctx = makeContext({
      analysisResult: {
        method: 'multiple-regression',
        statistic: 24.56,
        pValue: 0.00001,
        df: 3,
        interpretation: '회귀 모델이 유의합니다.',
        coefficients: [
          { name: '(Intercept)', value: 5.2, stdError: 0.8, tValue: 6.5, pvalue: 0.0001 },
          { name: 'x1', value: 1.3, stdError: 0.3, tValue: 4.33, pvalue: 0.001 },
        ],
        additional: {
          rSquared: 0.82,
          adjustedRSquared: 0.79,
          rmse: 3.14,
        },
      },
      statisticalResult: {
        testName: 'Multiple Regression',
        statisticName: 'F',
        statistic: 24.56,
        pValue: 0.00001,
      },
    })

    const result = await ExportService.export(ctx, 'docx')
    expect(result.success).toBe(true)
  })

  it('ANOVA 결과 (groupStats + postHoc + assumptions) → Excel', async () => {
    const ctx = makeContext({
      analysisResult: {
        method: 'one-way-anova',
        statistic: 8.32,
        pValue: 0.0006,
        df: 2,
        interpretation: '집단 간 차이가 있습니다.',
        effectSize: { value: 0.12, type: 'etaSquared' },
        groupStats: [
          { name: 'A', n: 20, mean: 70.5, std: 10.2 },
          { name: 'B', n: 20, mean: 78.3, std: 9.8 },
          { name: 'C', n: 20, mean: 82.1, std: 11.5 },
        ],
        postHoc: [
          { group1: 'A', group2: 'B', meanDiff: 7.8, pvalue: 0.012, significant: true },
          { group1: 'A', group2: 'C', meanDiff: 11.6, pvalue: 0.0001, significant: true },
          { group1: 'B', group2: 'C', meanDiff: 3.8, pvalue: 0.21, significant: false },
        ],
        assumptions: [
          { name: 'Shapiro-Wilk', passed: true, testStatistic: 0.985, pValue: 0.67 },
          { name: 'Levene', passed: true, testStatistic: 1.23, pValue: 0.3 },
        ] as unknown as AnalysisResult['assumptions'],
      },
      statisticalResult: {
        testName: 'One-way ANOVA',
        statisticName: 'F',
        statistic: 8.32,
        pValue: 0.0006,
      },
    })

    const result = await ExportService.export(ctx, 'xlsx')
    expect(result.success).toBe(true)
  })
})
