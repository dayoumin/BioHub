/**
 * PDF Report Service Dynamic Import 테스트
 * - jsPDF 동적 import 확인
 * - html2canvas 동적 import 확인
 * - 보고서 생성 플로우 검증
 */

const mockSave = vi.fn()
const mockText = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetFont = vi.fn()
const mockSetDrawColor = vi.fn()
const mockLine = vi.fn()
const mockAddPage = vi.fn()
const mockSetPage = vi.fn()
const mockAddImage = vi.fn()
const mockSplitTextToSize = vi.fn().mockReturnValue(['line1'])
const mockGetNumberOfPages = vi.fn().mockReturnValue(1)

const mockJsPDFInstance = {
  save: mockSave,
  text: mockText,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  setFont: mockSetFont,
  setDrawColor: mockSetDrawColor,
  line: mockLine,
  addPage: mockAddPage,
  setPage: mockSetPage,
  addImage: mockAddImage,
  splitTextToSize: mockSplitTextToSize,
  getNumberOfPages: mockGetNumberOfPages,
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
    pages: [null, {}],
  },
}

// Vitest 4: use function() instead of arrow for constructor support
vi.mock('jspdf', () => ({
  default: function MockJsPDF() { return mockJsPDFInstance },
}))

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,mockdata',
    width: 800,
    height: 600,
  }),
}))

import {
  generateStatisticalReport,
  generateQuickReport,
  downloadPDF,
  elementToImage,
} from '@/lib/pdf-report-service'

describe('PDF Report Service (lib/pdf-report-service.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateStatisticalReport', () => {
    const sampleReportData = {
      title: 'T-Test Analysis',
      dataset: 'sample.csv',
      analysis: {
        testName: 'Independent Samples T-Test',
        result: {
          statistic: 2.456,
          pValue: 0.023,
          effectSize: 0.65,
        },
      },
      metadata: {
        createdAt: new Date('2024-01-15'),
      },
    }

    it('jsPDF를 동적으로 import하여 PDF를 생성해야 함', async () => {
      const pdf = await generateStatisticalReport(sampleReportData)
      expect(pdf).toBe(mockJsPDFInstance)
    })

    it('제목과 메타데이터가 포함되어야 함', async () => {
      await generateStatisticalReport(sampleReportData)

      const textCalls = mockText.mock.calls.map((call: unknown[]) => call[0])
      expect(textCalls).toContain('T-Test Analysis')
      expect(textCalls.some((t: string) => t.includes('sample.csv'))).toBe(true)
    })

    it('통계 결과가 포함되어야 함', async () => {
      await generateStatisticalReport(sampleReportData)

      const textCalls = mockText.mock.calls.map((call: unknown[]) => call[0])
      expect(textCalls.some((t: string) => t.includes('2.456'))).toBe(true)
      expect(textCalls.some((t: string) => t.includes('0.023'))).toBe(true)
      expect(textCalls.some((t: string) => t.includes('0.650'))).toBe(true)
    })

    it('차트가 있으면 이미지를 추가해야 함', async () => {
      const dataWithCharts = {
        ...sampleReportData,
        analysis: {
          ...sampleReportData.analysis,
          charts: ['data:image/png;base64,chart1'],
        },
      }

      await generateStatisticalReport(dataWithCharts)

      expect(mockAddPage).toHaveBeenCalled()
      expect(mockAddImage).toHaveBeenCalledWith(
        'data:image/png;base64,chart1',
        'PNG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('downloadPDF', () => {
    it('pdf.save()를 올바른 파일명으로 호출해야 함', () => {
      downloadPDF(mockJsPDFInstance as unknown as Parameters<typeof downloadPDF>[0], 'my-report.pdf')
      expect(mockSave).toHaveBeenCalledWith('my-report.pdf')
    })

    it('기본 파일명을 사용해야 함', () => {
      downloadPDF(mockJsPDFInstance as unknown as Parameters<typeof downloadPDF>[0])
      expect(mockSave).toHaveBeenCalledWith('statistical-report.pdf')
    })
  })

  describe('elementToImage', () => {
    it('html2canvas를 동적으로 import하여 이미지를 생성해야 함', async () => {
      const mockElement = document.createElement('div')
      const result = await elementToImage(mockElement)

      expect(result).toBe('data:image/png;base64,mockdata')
    })
  })

  describe('generateQuickReport', () => {
    it('전체 보고서 생성 플로우가 동작해야 함', async () => {
      await generateQuickReport('T-Test', { statistic: 1.5, pValue: 0.12 }, 'test.csv')

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/^report-t-test-\d{8}-\d{6}\.pdf$/)
      )
    })
  })
})
