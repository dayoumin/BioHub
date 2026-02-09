/**
 * PDFReportService (lib/services/) Dynamic Import 테스트
 */

import { vi } from 'vitest'

const mockSave = vi.fn()
const mockText = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetFont = vi.fn()
const mockSetLineWidth = vi.fn()
const mockLine = vi.fn()
const mockAddPage = vi.fn()
const mockSetPage = vi.fn()
const mockAddImage = vi.fn()
const mockSplitTextToSize = vi.fn().mockReturnValue(['line1'])

const mockJsPDFInstance = {
  save: mockSave,
  text: mockText,
  setFontSize: mockSetFontSize,
  setTextColor: mockSetTextColor,
  setFont: mockSetFont,
  setLineWidth: mockSetLineWidth,
  line: mockLine,
  addPage: mockAddPage,
  setPage: mockSetPage,
  addImage: mockAddImage,
  splitTextToSize: mockSplitTextToSize,
  internal: {
    pageSize: {
      getWidth: () => 210,
      getHeight: () => 297,
    },
    pages: [null, {}],
  },
}

// Vitest 4: use function() for constructor support
vi.mock('jspdf', () => ({
  default: function MockJsPDF() { return mockJsPDFInstance },
}))

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: () => 'data:image/png;base64,test',
    width: 800,
    height: 600,
  }),
}))

import { PDFReportService } from '@/lib/services/pdf-report-service'

describe('PDFReportService Dynamic Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateReport', () => {
    const sampleData = {
      title: 'T-Test Report',
      date: new Date('2024-06-15'),
      analysisResult: {
        method: 'Independent Samples T-Test',
        statistic: 3.14,
        pValue: 0.002,
        effectSize: 0.8,
        interpretation: 'The difference is statistically significant.',
        assumptions: undefined,
        confidence: undefined,
      },
    }

    it('jsPDF를 동적으로 import하고 PDF를 저장해야 함', async () => {
      await PDFReportService.generateReport(sampleData)

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringMatching(/^statistical_report_\d+\.pdf$/)
      )
    })

    it('보고서 제목이 포함되어야 함', async () => {
      await PDFReportService.generateReport(sampleData)

      const textCalls = mockText.mock.calls.map((call: unknown[]) => call[0])
      expect(textCalls).toContain('T-Test Report')
      expect(textCalls).toContain('Statistical Analysis Report')
    })

    it('분석 방법이 포함되어야 함', async () => {
      await PDFReportService.generateReport(sampleData)

      const textCalls = mockText.mock.calls.map((call: unknown[]) => call[0]) as string[]
      expect(textCalls.some((t: string) => t.includes('Independent Samples T-Test'))).toBe(true)
    })
  })

  describe('generateSummaryText', () => {
    it('올바른 텍스트 요약을 생성해야 함', () => {
      const result = {
        method: 'T-Test',
        statistic: 2.5,
        pValue: 0.03,
        effectSize: 0.6,
        interpretation: 'Significant difference found.',
        confidence: { lower: 0.1, upper: 1.2 },
      }

      const summary = PDFReportService.generateSummaryText(result)
      expect(summary).toContain('T-Test')
      expect(summary).toContain('2.5000')
      expect(summary).toContain('0.0300')
      expect(summary).toContain('0.6000')
      expect(summary).toContain('Significant difference found.')
    })
  })
})
