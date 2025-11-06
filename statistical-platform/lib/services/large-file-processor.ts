import Papa from 'papaparse'
import { DataRow } from '@/types/smart-flow'

export interface ProcessingProgress {
  totalRows: number
  processedRows: number
  percentage: number
  estimatedTimeRemaining?: number
}

export interface ChunkProcessorOptions {
  chunkSize?: number
  onProgress?: (progress: ProcessingProgress) => void
  onChunk?: (data: DataRow[], chunkIndex: number) => void
  maxRows?: number
}

export class LargeFileProcessor {
  private static readonly DEFAULT_CHUNK_SIZE = 10000 // 10,000행씩 처리
  private static readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024 // 5MB 이상을 대용량으로 간주

  /**
   * 파일이 대용량인지 확인
   */
  static isLargeFile(file: File): boolean {
    return file.size > this.LARGE_FILE_THRESHOLD
  }

  /**
   * 메모리 사용량 확인 (Chrome only)
   */
  static getMemoryInfo(): { used: number; total: number; percentage: number } | null {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      if (memory) {
        return {
          used: memory.usedJSHeapSize / 1048576, // MB
          total: memory.jsHeapSizeLimit / 1048576, // MB
          percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        }
      }
    }
    return null
  }

  /**
   * 메모리가 안전한 수준인지 확인
   */
  static isMemorySafe(): boolean {
    const memoryInfo = this.getMemoryInfo()
    if (!memoryInfo) return true // 측정 불가능한 경우 계속 진행

    // 메모리 사용률이 80% 미만이면 안전
    return memoryInfo.percentage < 80
  }

  /**
   * CSV 파일을 청크 단위로 처리
   */
  static async processInChunks(
    file: File,
    options: ChunkProcessorOptions = {}
  ): Promise<DataRow[]> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      onProgress,
      onChunk,
      maxRows
    } = options

    return new Promise((resolve, reject) => {
      const allData: DataRow[] = []
      let processedRows = 0
      let totalRows = 0  // const 제거하여 업데이트 가능하게 변경
      const startTime = Date.now()
      let chunkIndex = 0
      let shouldStop = false

      // 먼저 전체 행 수 추정 (파일 크기 기반)
      const estimatedRows = Math.ceil(file.size / 50) // 평균 50바이트/행 가정
      totalRows = estimatedRows  // 초기값 설정

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        chunkSize: chunkSize * 50, // 바이트 단위로 변환 (행당 약 50바이트 가정)
        chunk: (results, parser) => {
          // 메모리 체크
          if (!this.isMemorySafe()) {
            parser.abort()
            reject(new Error('메모리 부족: 더 작은 데이터셋을 사용하거나 불필요한 컬럼을 제거해주세요.'))
            return
          }

          const chunkData = results.data as DataRow[]
          processedRows += chunkData.length

          // 최대 행 수 제한 체크
          if (maxRows && processedRows > maxRows) {
            shouldStop = true
            const limitedData = chunkData.slice(0, maxRows - (processedRows - chunkData.length))
            allData.push(...limitedData)
            parser.abort()

            if (onProgress) {
              onProgress({
                totalRows: maxRows,
                processedRows: maxRows,
                percentage: 100,
                estimatedTimeRemaining: 0
              })
            }
            return
          }

          // 데이터 저장
          allData.push(...chunkData)

          // 청크 콜백 실행
          if (onChunk) {
            onChunk(chunkData, chunkIndex++)
          }

          // 진행률 계산 및 보고
          if (onProgress) {
            const elapsed = Date.now() - startTime
            const rowsPerMs = processedRows / elapsed
            const remainingRows = estimatedRows - processedRows
            const estimatedTimeRemaining = remainingRows / rowsPerMs

            onProgress({
              totalRows: estimatedRows,
              processedRows,
              percentage: Math.min(100, (processedRows / estimatedRows) * 100),
              estimatedTimeRemaining: Math.round(estimatedTimeRemaining / 1000) // 초 단위
            })
          }

          // 파싱 중단 조건
          if (shouldStop) {
            parser.abort()
          }
        },
        complete: (results) => {
          if (results && results.errors && results.errors.length > 0 && !shouldStop) {
            reject(new Error(`CSV 파싱 오류: ${results.errors[0].message}`))
          } else {
            // 최종 진행률 업데이트
            if (onProgress) {
              onProgress({
                totalRows: processedRows,
                processedRows,
                percentage: 100,
                estimatedTimeRemaining: 0
              })
            }
            resolve(allData)
          }
        },
        error: (error) => {
          reject(new Error(`파일 읽기 오류: ${error.message}`))
        }
      })
    })
  }

  /**
   * 데이터 샘플링 (대용량 데이터 미리보기용)
   */
  static async sampleData(
    file: File,
    sampleSize: number = 1000
  ): Promise<{ sample: DataRow[]; totalRows: number }> {
    return new Promise((resolve, reject) => {
      const sample: DataRow[] = []
      let totalRows = 0
      let rowsToSkip = 0

      // 파일 크기로 전체 행 수 추정
      const estimatedTotalRows = Math.ceil(file.size / 50)

      // 샘플링 간격 계산
      const skipInterval = Math.max(1, Math.floor(estimatedTotalRows / sampleSize))

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        step: (results) => {
          totalRows++

          // 샘플링 간격에 따라 행 선택
          if (rowsToSkip === 0) {
            sample.push(results.data as DataRow)
            rowsToSkip = skipInterval - 1
          } else {
            rowsToSkip--
          }

          // 충분한 샘플을 수집했으면 중단
          if (sample.length >= sampleSize) {
            return false // 파싱 중단
          }
        },
        complete: () => {
          resolve({ sample, totalRows })
        },
        error: (error) => {
          reject(new Error(`샘플링 오류: ${error.message}`))
        }
      })
    })
  }

  /**
   * 스트림 방식으로 데이터 검증 (메모리 효율적)
   */
  static async validateDataStream(
    file: File,
    onValidationProgress?: (message: string) => void
  ): Promise<{
    isValid: boolean
    totalRows: number
    columnCount: number
    numericColumns: string[]
    categoricalColumns: string[]
    errors: string[]
    warnings: string[]
  }> {
    return new Promise((resolve, reject) => {
      let totalRows = 0
      let columns: string[] = []
      const columnTypes = new Map<string, 'numeric' | 'categorical' | 'unknown'>()
      const errors: string[] = []
      const warnings: string[] = []
      let missingValueCount = 0

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        chunk: (results) => {
          const chunkData = results.data as DataRow[]

          // 첫 청크에서 컬럼 정보 추출
          if (totalRows === 0 && chunkData.length > 0) {
            columns = Object.keys(chunkData[0])
            columns.forEach(col => columnTypes.set(col, 'unknown'))

            if (onValidationProgress) {
              onValidationProgress(`컬럼 ${columns.length}개 발견`)
            }
          }

          // 데이터 타입 분석
          chunkData.forEach(row => {
            totalRows++

            columns.forEach(col => {
              const value = row[col]

              // 결측값 체크
              if (value === null || value === undefined || value === '') {
                missingValueCount++
                return
              }

              // 타입 판별
              const currentType = columnTypes.get(col)
              if (currentType === 'categorical') return // 이미 범주형으로 확정

              if (isNaN(Number(value))) {
                columnTypes.set(col, 'categorical')
              } else if (currentType === 'unknown') {
                columnTypes.set(col, 'numeric')
              }
            })
          })

          // 진행 상황 보고
          if (onValidationProgress && totalRows % 10000 === 0) {
            onValidationProgress(`${totalRows.toLocaleString()}행 검증 완료`)
          }
        },
        complete: () => {
          // 최종 컬럼 타입 분류
          const numericColumns: string[] = []
          const categoricalColumns: string[] = []

          columnTypes.forEach((type, col) => {
            if (type === 'numeric') {
              numericColumns.push(col)
            } else {
              categoricalColumns.push(col)
            }
          })

          // 검증 결과 생성
          const missingRatio = missingValueCount / (totalRows * columns.length)

          if (totalRows === 0) {
            errors.push('데이터가 없습니다')
          } else if (totalRows < 3) {
            warnings.push('데이터가 3행 미만입니다. 통계 분석이 제한될 수 있습니다.')
          }

          if (missingRatio > 0.2) {
            warnings.push(`결측값이 ${(missingRatio * 100).toFixed(1)}% 있습니다.`)
          }

          if (numericColumns.length === 0) {
            warnings.push('수치형 데이터가 없습니다. 통계 분석이 제한될 수 있습니다.')
          }

          resolve({
            isValid: errors.length === 0,
            totalRows,
            columnCount: columns.length,
            numericColumns,
            categoricalColumns,
            errors,
            warnings
          })
        },
        error: (error) => {
          reject(new Error(`검증 오류: ${error.message}`))
        }
      })
    })
  }
}