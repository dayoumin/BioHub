import { DataRow } from '@/types/smart-flow'

// Dynamic import for code splitting (xlsx ~1MB)
let _xlsxPromise: Promise<typeof import('xlsx')> | null = null
function getXLSX(): Promise<typeof import('xlsx')> {
  if (!_xlsxPromise) {
    _xlsxPromise = import('xlsx')
  }
  return _xlsxPromise
}

export interface ExcelProcessingOptions {
  sheetIndex?: number
  maxRows?: number
  headerRow?: number
}

export interface SheetInfo {
  name: string
  index: number
  rows: number
  cols: number
}

export class ExcelProcessor {
  /**
   * Excel 파일에서 시트 목록을 가져옵니다
   */
  static async getSheetList(file: File): Promise<SheetInfo[]> {
    const XLSX = await getXLSX()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })

          const sheets: SheetInfo[] = workbook.SheetNames.map((name, index) => {
            const worksheet = workbook.Sheets[name]
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')

            return {
              name,
              index,
              rows: range.e.r + 1,
              cols: range.e.c + 1
            }
          })

          resolve(sheets)
        } catch (error) {
          reject(new Error(`시트 목록 읽기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`))
        }
      }

      reader.onerror = () => reject(new Error('파일 읽기 실패'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Excel 파일을 파싱하여 데이터를 추출합니다
   */
  static async parseExcelFile(
    file: File,
    options: ExcelProcessingOptions = {}
  ): Promise<DataRow[]> {
    const { sheetIndex = 0, maxRows = 500000, headerRow = 0 } = options

    const XLSX = await getXLSX()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })

          // 시트 선택
          const sheetName = workbook.SheetNames[sheetIndex]
          if (!sheetName) {
            throw new Error(`시트 인덱스 ${sheetIndex}가 존재하지 않습니다`)
          }

          const worksheet = workbook.Sheets[sheetName]

          // JSON으로 변환 (첫 행을 헤더로 사용)
          const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
            header: headerRow === 0 ? undefined : headerRow,
            defval: null, // 빈 셀은 null로
            raw: false, // 날짜를 문자열로 변환
            dateNF: 'yyyy-mm-dd' // 날짜 형식
          })

          // 행 수 제한
          const limitedData = jsonData.slice(0, maxRows)

          // 데이터 검증
          if (limitedData.length === 0) {
            throw new Error('데이터가 없습니다')
          }

          // 데이터 정제 (빈 문자열을 null로 변환)
          const cleanedData = limitedData.map(row => {
            const cleanedRow: DataRow = {}
            for (const [key, value] of Object.entries(row)) {
              cleanedRow[key] = value === '' ? null : value
            }
            return cleanedRow
          })

          resolve(cleanedData)
        } catch (error) {
          reject(new Error(`Excel 파싱 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`))
        }
      }

      reader.onerror = () => reject(new Error('파일 읽기 실패'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Excel 파일의 특정 범위만 읽기 (대용량 파일용)
   */
  static async parseExcelRange(
    file: File,
    sheetIndex: number,
    startRow: number,
    endRow: number
  ): Promise<DataRow[]> {
    const XLSX = await getXLSX()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array', sheetRows: endRow + 1 })

          const sheetName = workbook.SheetNames[sheetIndex]
          if (!sheetName) {
            throw new Error(`시트 인덱스 ${sheetIndex}가 존재하지 않습니다`)
          }

          const worksheet = workbook.Sheets[sheetName]

          // 범위 지정하여 JSON 변환
          const jsonData = XLSX.utils.sheet_to_json<DataRow>(worksheet, {
            header: 1,
            defval: null,
            raw: false,
            range: startRow
          })

          const limitedData = jsonData.slice(0, endRow - startRow)

          // 첫 행을 헤더로 사용하여 객체 배열로 변환
          if (limitedData.length > 0) {
            const headers = Object.values(limitedData[0] as any) as string[]
            const dataRows = limitedData.slice(1).map((row: any) => {
              const obj: DataRow = {}
              headers.forEach((header, index) => {
                obj[header] = row[index] === '' ? null : row[index]
              })
              return obj
            })

            resolve(dataRows)
          } else {
            resolve([])
          }
        } catch (error) {
          reject(new Error(`Excel 범위 읽기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`))
        }
      }

      reader.onerror = () => reject(new Error('파일 읽기 실패'))
      reader.readAsArrayBuffer(file)
    })
  }

  /**
   * Excel 파일 유효성 검증
   */
  static validateExcelFile(file: File): { isValid: boolean; error?: string } {
    // 파일 확장자 확인
    const validExtensions = ['.xlsx', '.xls', '.xlsm', '.xlsb']
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: `지원하지 않는 파일 형식입니다. 지원 형식: ${validExtensions.join(', ')}`
      }
    }

    // 파일 크기 확인 (20MB)
    const maxSize = 20 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `파일이 너무 큽니다. 최대 20MB까지 지원됩니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
      }
    }

    return { isValid: true }
  }

  /**
   * 날짜 셀 변환 헬퍼
   */
  static excelDateToJS(excelDate: number): Date {
    // Excel의 날짜는 1900-01-01부터의 일수
    // JavaScript는 1970-01-01부터의 밀리초
    const EXCEL_EPOCH = new Date(1899, 11, 30) // Excel epoch (December 30, 1899)
    const msPerDay = 24 * 60 * 60 * 1000

    return new Date(EXCEL_EPOCH.getTime() + excelDate * msPerDay)
  }

  /**
   * 데이터 타입 자동 감지
   */
  static detectColumnTypes(data: DataRow[]): Record<string, 'numeric' | 'date' | 'string'> {
    if (data.length === 0) return {}

    const columnTypes: Record<string, 'numeric' | 'date' | 'string'> = {}
    const columns = Object.keys(data[0])

    columns.forEach(col => {
      const samples = data
        .slice(0, Math.min(100, data.length))
        .map(row => row[col])
        .filter(val => val !== null && val !== undefined)

      if (samples.length === 0) {
        columnTypes[col] = 'string'
        return
      }

      // 숫자 타입 체크
      const allNumeric = samples.every(val => !isNaN(Number(val)))
      if (allNumeric) {
        columnTypes[col] = 'numeric'
        return
      }

      // 날짜 타입 체크
      const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}/
      const allDates = samples.every(val => {
        if (typeof val === 'string' && datePattern.test(val)) return true
        const date = new Date(val as any)
        return !isNaN(date.getTime())
      })

      if (allDates) {
        columnTypes[col] = 'date'
      } else {
        columnTypes[col] = 'string'
      }
    })

    return columnTypes
  }
}

export default ExcelProcessor