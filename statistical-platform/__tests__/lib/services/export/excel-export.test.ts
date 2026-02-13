/**
 * Excel 내보내기 테스트
 *
 * exportExcel이 NormalizedExportData를 받아 xlsx Blob을 생성하고
 * downloadBlob을 호출하는지 검증합니다.
 */

import type { NormalizedExportData } from '@/lib/services/export/export-types'

// downloadBlob mock (DOM 조작 방지)
vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return {
    ...orig,
    downloadBlob: vi.fn(),
  }
})

import { exportExcel } from '@/lib/services/export/excel-export'
import { downloadBlob } from '@/lib/services/export/export-data-builder'

// ─── 테스트 픽스처 ───

function makeExportData(overrides: Partial<NormalizedExportData> = {}): NormalizedExportData {
  return {
    title: 'ANOVA Analysis Report',
    method: 'one-way-anova',
    date: '2026. 2. 11. 오전 10:30:00',
    mainResults: [
      { label: 'F', value: '8.3200' },
      { label: 'df', value: '2, 57' },
      { label: 'p-value', value: '< .001' },
      { label: 'Effect Size', value: '0.1200' },
    ],
    effectSize: { value: '0.12', type: 'etaSquared', interpretation: 'Large' },
    confidenceInterval: null,
    apaString: 'F(2, 57) = 8.32, p < .001',
    interpretation: '세 집단 간 유의한 차이가 있습니다.',
    assumptions: [],
    postHocResults: null,
    groupStats: null,
    coefficients: null,
    additionalMetrics: [],
    aiInterpretation: null,
    dataInfo: null,
    ...overrides,
  }
}

// ─── 테스트 ───

describe('exportExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('기본 결과로 Excel 생성 성공', async () => {
    const result = await exportExcel(makeExportData())

    expect(result.success).toBe(true)
    expect(result.fileName).toMatch(/one-way-anova.*\.xlsx$/)
    expect(downloadBlob).toHaveBeenCalledTimes(1)

    const [blob, fileName] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(fileName).toMatch(/\.xlsx$/)
  })

  it('집단통계 시트 추가', async () => {
    const data = makeExportData({
      groupStats: [
        { name: 'A', n: 20, mean: '70.500', std: '10.200' },
        { name: 'B', n: 20, mean: '78.300', std: '9.800' },
        { name: 'C', n: 20, mean: '82.100', std: '11.500' },
      ],
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('사후검정 시트 추가', async () => {
    const data = makeExportData({
      postHocResults: [
        { comparison: 'A vs B', meanDiff: '7.800', pValue: '0.0120', significant: true },
        { comparison: 'A vs C', meanDiff: '11.600', pValue: '< .001', significant: true },
        { comparison: 'B vs C', meanDiff: '3.800', pValue: '0.2100', significant: false },
      ],
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('회귀계수 시트 추가', async () => {
    const data = makeExportData({
      coefficients: [
        { name: '(Intercept)', value: '12.340', stdError: '1.230', tValue: '10.032', pValue: '< .001' },
        { name: 'age', value: '0.560', stdError: '0.120', tValue: '4.667', pValue: '< .001' },
      ],
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('가정검정 시트 추가', async () => {
    const data = makeExportData({
      assumptions: [
        { name: 'Shapiro-Wilk', passed: true, statistic: '0.985', pValue: '0.6700' },
        { name: 'Levene', passed: false, statistic: '4.560', pValue: '0.0350' },
      ],
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('AI 해석 시트 (요약만)', async () => {
    const data = makeExportData({
      aiInterpretation: { summary: '분석 결과 요약입니다.', detail: '' },
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('AI 해석 시트 (요약 + 상세)', async () => {
    const data = makeExportData({
      aiInterpretation: {
        summary: '요약 내용',
        detail: '### 상세 해석\n자세한 분석 결과가 여기에 포함됩니다.',
      },
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('데이터 정보 포함', async () => {
    const data = makeExportData({
      dataInfo: { fileName: 'data.csv', rows: 150, columns: 8 },
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('모든 시트 포함 (풀 데이터)', async () => {
    const data = makeExportData({
      assumptions: [
        { name: 'Normality', passed: true, statistic: '0.985', pValue: '0.670' },
      ],
      postHocResults: [
        { comparison: 'A vs B', meanDiff: '7.8', pValue: '0.012', significant: true },
      ],
      groupStats: [
        { name: 'Group A', n: 20, mean: '70.5', std: '10.2' },
      ],
      coefficients: [
        { name: 'x1', value: '0.56', stdError: '0.12', tValue: '4.67', pValue: '< .001' },
      ],
      additionalMetrics: [
        { label: 'R²', value: '0.782' },
        { label: 'RMSE', value: '4.320' },
      ],
      aiInterpretation: { summary: '요약', detail: '상세' },
      dataInfo: { fileName: 'full.csv', rows: 200, columns: 10 },
    })
    const result = await exportExcel(data)

    expect(result.success).toBe(true)
    expect(downloadBlob).toHaveBeenCalledTimes(1)

    const [blob] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('추가 지표가 요약 시트에 포함', async () => {
    const data = makeExportData({
      additionalMetrics: [
        { label: 'Power', value: '0.9500' },
        { label: 'Required N', value: '64' },
      ],
    })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })

  it('빈 interpretation도 에러 없이 처리', async () => {
    const data = makeExportData({ interpretation: '' })
    const result = await exportExcel(data)
    expect(result.success).toBe(true)
  })
})
