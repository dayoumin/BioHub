/**
 * ExcelProcessor 테스트
 * xlsx 0.20.3 버전 호환성 검증
 */

import * as XLSX from 'xlsx'

describe('xlsx 라이브러리 기본 기능', () => {
  describe('버전 확인', () => {
    it('xlsx 라이브러리가 로드되어야 함', () => {
      expect(XLSX).toBeDefined()
      expect(XLSX.read).toBeDefined()
      expect(XLSX.utils).toBeDefined()
    })

    it('XLSX.version이 0.20.x 이어야 함', () => {
      // xlsx 0.20.x에서는 version 속성이 있음
      expect(XLSX.version).toBeDefined()
      expect(XLSX.version).toMatch(/^0\.20/)
    })
  })

  describe('기본 읽기/쓰기 기능', () => {
    it('빈 워크북 생성이 가능해야 함', () => {
      const workbook = XLSX.utils.book_new()
      expect(workbook).toBeDefined()
      expect(workbook.SheetNames).toEqual([])
    })

    it('데이터로 워크시트 생성이 가능해야 함', () => {
      const data = [
        ['Name', 'Age', 'City'],
        ['Alice', 30, 'Seoul'],
        ['Bob', 25, 'Busan'],
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(data)
      expect(worksheet).toBeDefined()
      expect(worksheet['A1']?.v).toBe('Name')
      expect(worksheet['B2']?.v).toBe(30)
    })

    it('JSON 배열을 워크시트로 변환 가능해야 함', () => {
      const jsonData = [
        { name: 'Alice', age: 30, city: 'Seoul' },
        { name: 'Bob', age: 25, city: 'Busan' },
      ]

      const worksheet = XLSX.utils.json_to_sheet(jsonData)
      expect(worksheet).toBeDefined()
      expect(worksheet['A1']?.v).toBe('name')
      expect(worksheet['A2']?.v).toBe('Alice')
    })

    it('워크시트를 JSON으로 변환 가능해야 함', () => {
      const data = [
        ['Name', 'Age'],
        ['Alice', 30],
        ['Bob', 25],
      ]

      const worksheet = XLSX.utils.aoa_to_sheet(data)
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      expect(jsonData).toHaveLength(2)
      expect(jsonData[0]).toEqual({ Name: 'Alice', Age: 30 })
      expect(jsonData[1]).toEqual({ Name: 'Bob', Age: 25 })
    })
  })

  describe('워크북 조작', () => {
    it('워크북에 시트 추가가 가능해야 함', () => {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([['Test']])

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      expect(workbook.SheetNames).toContain('Sheet1')
      expect(workbook.Sheets['Sheet1']).toBeDefined()
    })

    it('여러 시트를 가진 워크북 생성이 가능해야 함', () => {
      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Data1']]), 'Sheet1')
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Data2']]), 'Sheet2')

      expect(workbook.SheetNames).toHaveLength(2)
      expect(workbook.SheetNames).toEqual(['Sheet1', 'Sheet2'])
    })
  })

  describe('바이너리 처리', () => {
    it('워크북을 바이너리로 내보내기 가능해야 함', () => {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([['Test', 123]])
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      const binary = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })

      // xlsx 0.20.x에서는 ArrayBuffer 반환
      expect(binary).toBeInstanceOf(ArrayBuffer)
      expect(binary.byteLength).toBeGreaterThan(0)
    })

    it('바이너리에서 워크북 읽기가 가능해야 함', () => {
      // 워크북 생성 및 바이너리로 내보내기
      const originalWorkbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['Name', 'Value'],
        ['Test', 42],
      ])
      XLSX.utils.book_append_sheet(originalWorkbook, worksheet, 'TestSheet')

      const binary = XLSX.write(originalWorkbook, { type: 'array', bookType: 'xlsx' })

      // 바이너리에서 다시 읽기
      const readWorkbook = XLSX.read(binary, { type: 'array' })

      expect(readWorkbook.SheetNames).toContain('TestSheet')
      const readSheet = readWorkbook.Sheets['TestSheet']
      const jsonData = XLSX.utils.sheet_to_json(readSheet)

      expect(jsonData).toHaveLength(1)
      expect(jsonData[0]).toEqual({ Name: 'Test', Value: 42 })
    })
  })

  describe('유틸리티 함수', () => {
    it('decode_range가 정상 동작해야 함', () => {
      const range = XLSX.utils.decode_range('A1:C10')

      expect(range.s.r).toBe(0) // start row
      expect(range.s.c).toBe(0) // start col
      expect(range.e.r).toBe(9) // end row
      expect(range.e.c).toBe(2) // end col
    })

    it('encode_cell이 정상 동작해야 함', () => {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: 0 })
      expect(cellAddress).toBe('A1')

      const cellAddress2 = XLSX.utils.encode_cell({ r: 9, c: 2 })
      expect(cellAddress2).toBe('C10')
    })
  })
})

describe('ExcelProcessor 클래스', () => {
  // 동적 import로 ExcelProcessor 테스트
  // Note: File API는 Node.js 환경에서 제한적이므로 기본 기능만 테스트

  it('ExcelProcessor 모듈이 정상 import 되어야 함', async () => {
    const module = await import('@/lib/services/excel-processor')
    expect(module.ExcelProcessor).toBeDefined()
  })

  it('validateExcelFile 함수가 동작해야 함', async () => {
    const { ExcelProcessor } = await import('@/lib/services/excel-processor')

    // Mock File 객체 생성
    const mockFile = {
      name: 'test.xlsx',
      size: 1024,
    } as File

    const result = ExcelProcessor.validateExcelFile(mockFile)
    expect(result.isValid).toBe(true)
  })

  it('잘못된 확장자 파일은 거부해야 함', async () => {
    const { ExcelProcessor } = await import('@/lib/services/excel-processor')

    const mockFile = {
      name: 'test.txt',
      size: 1024,
    } as File

    const result = ExcelProcessor.validateExcelFile(mockFile)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('지원하지 않는 파일 형식')
  })

  it('너무 큰 파일은 거부해야 함', async () => {
    const { ExcelProcessor } = await import('@/lib/services/excel-processor')

    const mockFile = {
      name: 'large.xlsx',
      size: 25 * 1024 * 1024, // 25MB
    } as File

    const result = ExcelProcessor.validateExcelFile(mockFile)
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('파일이 너무 큽니다')
  })

  it('excelDateToJS 함수가 정상 동작해야 함', async () => {
    const { ExcelProcessor } = await import('@/lib/services/excel-processor')

    // Excel 날짜 44197 = 2021-01-01
    const date = ExcelProcessor.excelDateToJS(44197)
    expect(date.getFullYear()).toBe(2021)
    expect(date.getMonth()).toBe(0) // January
    expect(date.getDate()).toBe(1)
  })

  it('detectColumnTypes 함수가 정상 동작해야 함', async () => {
    const { ExcelProcessor } = await import('@/lib/services/excel-processor')

    const data = [
      { name: 'Alice', age: '30', date: '2021-01-01' },
      { name: 'Bob', age: '25', date: '2021-02-15' },
    ]

    const types = ExcelProcessor.detectColumnTypes(data)

    expect(types.name).toBe('string')
    expect(types.age).toBe('numeric')
    expect(types.date).toBe('date')
  })
})
