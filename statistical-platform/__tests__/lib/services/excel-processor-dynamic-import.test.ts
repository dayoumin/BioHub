/**
 * ExcelProcessor Dynamic Import 테스트
 * - 레이지 싱글톤 패턴 검증
 * - 각 메서드가 XLSX를 올바르게 사용하는지 검증
 */

import { vi } from 'vitest'

const mockRead = vi.fn()
const mockSheetToJson = vi.fn()
const mockDecodeRange = vi.fn()

vi.mock('xlsx', () => ({
  read: mockRead,
  utils: {
    decode_range: mockDecodeRange,
    sheet_to_json: mockSheetToJson,
  },
  version: '0.20.3',
}))

import { ExcelProcessor } from '@/lib/services/excel-processor'

describe('ExcelProcessor Dynamic Import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getXLSX lazy singleton', () => {
    it('ExcelProcessor가 정상 로드되어야 함', () => {
      expect(ExcelProcessor).toBeDefined()
      expect(ExcelProcessor.getSheetList).toBeDefined()
      expect(ExcelProcessor.parseExcelFile).toBeDefined()
      expect(ExcelProcessor.parseExcelRange).toBeDefined()
    })

    it('validateExcelFile은 XLSX 없이 동작해야 함 (동기 함수)', () => {
      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })

      const result = ExcelProcessor.validateExcelFile(mockFile)
      expect(result.isValid).toBe(true)
    })

    it('잘못된 확장자 파일을 거부해야 함', () => {
      const mockFile = new File([''], 'test.txt', { type: 'text/plain' })
      const result = ExcelProcessor.validateExcelFile(mockFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('지원하지 않는 파일 형식')
    })

    it('20MB 초과 파일을 거부해야 함', () => {
      const mockFile = new File([''], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      Object.defineProperty(mockFile, 'size', { value: 25 * 1024 * 1024 })

      const result = ExcelProcessor.validateExcelFile(mockFile)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('파일이 너무 큽니다')
    })
  })

  describe('detectColumnTypes (XLSX 불필요)', () => {
    it('빈 데이터에 대해 빈 객체를 반환해야 함', () => {
      const result = ExcelProcessor.detectColumnTypes([])
      expect(result).toEqual({})
    })

    it('숫자 컬럼을 올바르게 감지해야 함', () => {
      const data = [
        { age: '25', name: 'Alice' },
        { age: '30', name: 'Bob' },
        { age: '35', name: 'Charlie' },
      ]
      const result = ExcelProcessor.detectColumnTypes(data)
      expect(result.age).toBe('numeric')
      expect(result.name).toBe('string')
    })

    it('날짜 컬럼을 올바르게 감지해야 함', () => {
      const data = [
        { date: '2024-01-15', value: '100' },
        { date: '2024-02-20', value: '200' },
      ]
      const result = ExcelProcessor.detectColumnTypes(data)
      expect(result.date).toBe('date')
      expect(result.value).toBe('numeric')
    })
  })

  describe('excelDateToJS (XLSX 불필요)', () => {
    it('Excel 날짜 숫자를 JS Date로 변환해야 함', () => {
      const result = ExcelProcessor.excelDateToJS(44927)
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2023)
    })
  })

  describe('getSheetList (XLSX 동적 import 필요)', () => {
    const originalFileReader = global.FileReader

    afterEach(() => {
      global.FileReader = originalFileReader
    })

    it('FileReader를 사용하여 시트 목록을 읽어야 함', async () => {
      const mockWorkbook = {
        SheetNames: ['Sheet1', 'Sheet2'],
        Sheets: {
          'Sheet1': { '!ref': 'A1:C10' },
          'Sheet2': { '!ref': 'A1:B5' },
        }
      }

      mockRead.mockReturnValue(mockWorkbook)
      mockDecodeRange.mockImplementation((ref: string) => {
        if (ref === 'A1:C10') return { e: { r: 9, c: 2 } }
        if (ref === 'A1:B5') return { e: { r: 4, c: 1 } }
        return { e: { r: 0, c: 0 } }
      })

      // FileReader mock - class style for Vitest 4 constructor support
      class MockFileReader {
        onload: ((e: unknown) => void) | null = null
        onerror: (() => void) | null = null
        readAsArrayBuffer(_file: unknown) {
          // Simulate async read
          setTimeout(() => {
            this.onload?.({ target: { result: new ArrayBuffer(8) } })
          }, 0)
        }
      }
      global.FileReader = MockFileReader as unknown as typeof FileReader

      const file = new File(['test'], 'test.xlsx')
      const sheets = await ExcelProcessor.getSheetList(file)

      expect(sheets).toHaveLength(2)
      expect(sheets[0]).toEqual({ name: 'Sheet1', index: 0, rows: 10, cols: 3 })
      expect(sheets[1]).toEqual({ name: 'Sheet2', index: 1, rows: 5, cols: 2 })
      expect(mockRead).toHaveBeenCalledTimes(1)
    })
  })
})
