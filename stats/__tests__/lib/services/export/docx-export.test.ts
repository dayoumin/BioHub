/**
 * DOCX 내보내기 테스트
 *
 * exportDocx가 NormalizedExportData를 받아 Blob을 생성하고
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

import { exportDocx } from '@/lib/services/export/docx-export'
import { downloadBlob } from '@/lib/services/export/export-data-builder'

// ─── 테스트 픽스처 ───

function makeExportData(overrides: Partial<NormalizedExportData> = {}): NormalizedExportData {
  return {
    title: 'T-test Analysis Report',
    method: 't-test',
    date: '2026. 2. 11. 오전 10:30:00',
    mainResults: [
      { label: 't', value: '2.4560' },
      { label: 'df', value: '58' },
      { label: 'p-value', value: '0.0180' },
    ],
    effectSize: { value: '0.65', type: 'cohensD', interpretation: 'Medium' },
    confidenceInterval: { lower: '0.12', upper: '1.88', level: '95%' },
    apaString: 't(58) = 2.46, p = .018',
    interpretation: '두 집단 간 유의한 차이가 있습니다.',
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

describe('exportDocx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('기본 결과로 DOCX 생성 성공', async () => {
    const result = await exportDocx(makeExportData())

    expect(result.success).toBe(true)
    expect(result.fileName).toMatch(/t-test.*\.docx$/)
    expect(downloadBlob).toHaveBeenCalledTimes(1)

    // downloadBlob 호출 인자 검증
    const [blob, fileName] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
    expect(fileName).toMatch(/\.docx$/)
  })

  it('가정 검정 포함 시 테이블 추가', async () => {
    const data = makeExportData({
      assumptions: [
        { name: 'Shapiro-Wilk', passed: true, statistic: '0.980', pValue: '0.4500' },
        { name: 'Levene', passed: false, statistic: '5.120', pValue: '0.0280' },
      ],
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('사후검정 포함', async () => {
    const data = makeExportData({
      postHocResults: [
        { comparison: 'A vs B', meanDiff: '1.500', pValue: '0.0030', significant: true },
        { comparison: 'A vs C', meanDiff: '0.300', pValue: '0.6500', significant: false },
      ],
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('집단통계 포함', async () => {
    const data = makeExportData({
      groupStats: [
        { name: '실험군', n: 30, mean: '75.200', std: '12.400' },
        { name: '대조군', n: 30, mean: '68.100', std: '11.800' },
      ],
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('회귀계수 포함', async () => {
    const data = makeExportData({
      coefficients: [
        { name: '(Intercept)', value: '3.2100', stdError: '0.4500', tValue: '7.130', pValue: '< .001' },
        { name: 'x1', value: '1.0500', stdError: '0.2200', tValue: '4.770', pValue: '< .001' },
      ],
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('추가 지표 포함', async () => {
    const data = makeExportData({
      additionalMetrics: [
        { label: 'R²', value: '0.7820' },
        { label: 'RMSE', value: '4.3200' },
      ],
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('AI 해석 (요약만)', async () => {
    const data = makeExportData({
      aiInterpretation: { summary: '요약 텍스트입니다.', detail: '' },
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('AI 해석 (요약 + 상세)', async () => {
    const data = makeExportData({
      aiInterpretation: {
        summary: '요약 텍스트입니다.',
        detail: '### 상세 해석\n상세 내용이 여기에 있습니다.\n줄바꿈도 있습니다.',
      },
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('데이터 정보 포함', async () => {
    const data = makeExportData({
      dataInfo: { fileName: 'test.csv', rows: 100, columns: 5 },
    })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })

  it('모든 섹션 포함 (풀 데이터)', async () => {
    const data = makeExportData({
      apaString: 't(58) = 2.46, p = .018, d = 0.65',
      assumptions: [
        { name: 'Normality', passed: true, statistic: '0.980', pValue: '0.4500' },
      ],
      postHocResults: [
        { comparison: 'A vs B', meanDiff: '1.5', pValue: '0.003', significant: true },
      ],
      groupStats: [
        { name: 'Group A', n: 30, mean: '75.2', std: '12.4' },
      ],
      coefficients: [
        { name: 'x1', value: '1.05', stdError: '0.22', tValue: '4.77', pValue: '< .001' },
      ],
      additionalMetrics: [{ label: 'R²', value: '0.782' }],
      aiInterpretation: { summary: '요약', detail: '상세' },
      dataInfo: { fileName: 'full.csv', rows: 200, columns: 10 },
    })
    const result = await exportDocx(data)

    expect(result.success).toBe(true)
    expect(downloadBlob).toHaveBeenCalledTimes(1)

    const [blob] = (downloadBlob as ReturnType<typeof vi.fn>).mock.calls[0]
    // 풀 데이터이므로 더 큰 Blob
    expect(blob.size).toBeGreaterThan(1000)
  })

  it('빈 interpretation도 에러 없이 처리', async () => {
    const data = makeExportData({ interpretation: '' })
    const result = await exportDocx(data)
    expect(result.success).toBe(true)
  })
})
