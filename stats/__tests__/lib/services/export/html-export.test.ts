import type { NormalizedExportData } from '@/lib/services/export/export-types'

vi.mock('@/lib/services/export/export-data-builder', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/services/export/export-data-builder')>()
  return {
    ...orig,
    downloadBlob: vi.fn(),
  }
})

import { exportHtml } from '@/lib/services/export/html-export'
import { downloadBlob } from '@/lib/services/export/export-data-builder'

describe('exportHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('동적 텍스트를 HTML 이스케이프하고 안전한 뱃지 마크업은 유지한다', async () => {
    const data: NormalizedExportData = {
      title: 'XSS <script>alert(1)</script>',
      method: 'chi-square',
      date: '2026-02-19 15:00:00',
      mainResults: [{ label: 'p-value', value: '< .001' }],
      effectSize: null,
      confidenceInterval: null,
      apaString: 'χ²(4) = 15.32, p < .001',
      interpretation: '<img src=x onerror=alert(1)>',
      assumptions: [{
        name: 'Levene <unsafe>',
        passed: false,
        statistic: '1.234',
        pValue: '0.0123',
      }],
      postHocResults: null,
      groupStats: null,
      coefficients: null,
      additionalMetrics: [],
      aiInterpretation: {
        summary: '요약 <b>강조</b>',
        detail: '상세 <script>bad()</script>',
      },
      methodology: null,
      references: null,
      rawData: null,
      dataInfo: {
        fileName: 'sample<evil>.csv',
        rows: 10,
        columns: 2,
      },
    }

    const result = await exportHtml(data)
    expect(result.success).toBe(true)
    expect(downloadBlob).toHaveBeenCalledTimes(1)

    const [blob] = vi.mocked(downloadBlob).mock.calls[0] as [Blob, string]
    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;b&gt;강조&lt;/b&gt;')
    expect(html).toContain('<span class="badge badge-danger">')
  })
})
