import Papa from 'papaparse'
import { Dataset } from './store'


/**
 * 결측값으로 인식할 패턴들 (소문자 정규화)
 * 다양한 소프트웨어에서 사용되는 결측값 표기 자동 지원
 * - R, pandas: NA
 * - Excel: N/A, #N/A, #NA
 * - SAS, SPSS: .
 * - Database: NULL
 * - JavaScript, Python: NaN
 * - 일반: -, missing, 빈 문자열
 */
const MISSING_VALUE_SET = new Set([
  '',        // 빈 문자열
  'na',      // R, pandas (NA, na)
  'n/a',     // Excel (N/A, n/a)
  '-',       // 일반적인 표기
  '.',       // SAS, SPSS
  'null',    // 데이터베이스 (NULL, null)
  'nan',     // JavaScript, Python (NaN, nan)
  '#n/a',    // Excel 오류 (#N/A)
  '#na',     // Excel 오류 (#NA)
  'missing', // 일반 (missing, MISSING)
]);

/**
 * 값이 결측값인지 판별
 * O(1) 검색 + 대소문자 무시
 */
function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'number' && isNaN(value)) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return MISSING_VALUE_SET.has(normalized);
  }
  return false;
}

export interface DataColumn {
  name: string
  type: 'numeric' | 'categorical' | 'text' | 'date'
  values: unknown[]
  missingCount: number
  uniqueCount: number
  dataQuality?: {
    typeConsistency: boolean
    mixedTypeExamples?: { value: unknown; type: string }[]
    outliers?: OutlierInfo[]
    issues: string[]
  }
  summary?: {
    mean?: number
    median?: number
    std?: number
    min?: number
    max?: number
    q1?: number
    q3?: number
  }
}

export interface OutlierInfo {
  value: number
  zScore: number
  isExtreme: boolean // z-score > 3
  rowIndex: number
}

export interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  columns: DataColumn[]
  rowCount: number
  columnCount: number
}

export interface ParsedData {
  headers: string[]
  rows: Record<string, unknown>[]
  errors: string[]
}

/**
 * Parse CSV file content using Papa Parse
 */
export function parseCSVFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      encoding: 'UTF-8', // UTF-8 인코딩 명시
      transformHeader: (header: string) => header.trim(),
      complete: (results) => {
        const errors: string[] = []
        
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(error => `Row ${error.row}: ${error.message}`))
        }
        
        const headers = results.meta.fields || []
        const rows = results.data as Record<string, unknown>[]
        
        resolve({
          headers,
          rows,
          errors
        })
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`))
      }
    })
  })
}

/**
 * 데이터 타입 혼재 검사 및 상세 분석
 */
export function analyzeColumnDataTypes(values: unknown[]): {
  detectedType: 'numeric' | 'categorical' | 'text' | 'date' | 'mixed'
  issues: string[]
  numericCount: number
  textCount: number
  emptyCount: number
  mixedExamples: { value: unknown; type: string }[]
} {
  const nonNullValues = values.filter(v => !isMissingValue(v))
  const emptyCount = values.length - nonNullValues.length
  
  if (nonNullValues.length === 0) {
    return {
      detectedType: 'text',
      issues: ['모든 값이 비어있습니다.'],
      numericCount: 0,
      textCount: 0,
      emptyCount,
      mixedExamples: []
    }
  }
  
  const typeAnalysis = {
    numeric: [] as unknown[],
    text: [] as unknown[],
    date: [] as unknown[],
    mixed: [] as { value: unknown; type: string }[]
  }
  
  // 각 값의 타입 분류
  nonNullValues.forEach(value => {
    if (typeof value === 'number') {
      typeAnalysis.numeric.push(value)
    } else if (typeof value === 'string') {
      const trimmed = value.trim()
      
      if (trimmed === '') {
        // 빈 문자열은 empty로 처리
        return
      }
      
      // 숫자 문자열 검사
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        const num = Number(trimmed)
        if (isFinite(num)) {
          typeAnalysis.numeric.push(num)
          return
        }
      }
      
      // 날짜 형식 검사
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$|^\d{2}-\d{2}-\d{4}$/)) {
        const dateValue = new Date(trimmed)
        if (!isNaN(dateValue.getTime())) {
          typeAnalysis.date.push(trimmed)
          return
        }
      }
      
      // 일반 텍스트
      typeAnalysis.text.push(trimmed)
    } else {
      // 기타 타입
      typeAnalysis.mixed.push({ value, type: typeof value })
    }
  })
  
  const numericCount = typeAnalysis.numeric.length
  const textCount = typeAnalysis.text.length
  const dateCount = typeAnalysis.date.length
  const mixedCount = typeAnalysis.mixed.length
  
  const total = numericCount + textCount + dateCount + mixedCount
  const issues: string[] = []
  
  // 혼재 타입 검사
  const hasMultipleTypes = [
    numericCount > 0 ? 'numeric' : null,
    textCount > 0 ? 'text' : null,
    dateCount > 0 ? 'date' : null,
    mixedCount > 0 ? 'mixed' : null
  ].filter(Boolean).length > 1
  
  if (hasMultipleTypes) {
    issues.push(`데이터 타입이 혼재되어 있습니다: 숫자 ${numericCount}개, 텍스트 ${textCount}개, 날짜 ${dateCount}개, 기타 ${mixedCount}개`)
    
    // 혼재 예시 수집
    const mixedExamples: { value: unknown; type: string }[] = []
    
    if (numericCount > 0 && textCount > 0) {
      // 숫자와 텍스트가 혼재된 예시
      mixedExamples.push(
        { value: typeAnalysis.numeric[0], type: 'number' },
        { value: typeAnalysis.text[0], type: 'text' }
      )
    }
    
    return {
      detectedType: 'mixed',
      issues,
      numericCount,
      textCount,
      emptyCount,
      mixedExamples
    }
  }
  
  // 단일 타입 결정
  let detectedType: 'numeric' | 'categorical' | 'text' | 'date'
  
  if (numericCount / total > 0.9) {
    detectedType = 'numeric'
  } else if (dateCount / total > 0.7) {
    detectedType = 'date'
  } else if (textCount > 0) {
    // 텍스트 값의 고유성으로 범주형/텍스트 구분
    const uniqueTextValues = new Set(typeAnalysis.text)
    if (uniqueTextValues.size <= Math.min(20, textCount * 0.5)) {
      detectedType = 'categorical'
    } else {
      detectedType = 'text'
    }
  } else {
    detectedType = 'text'
  }
  
  return {
    detectedType,
    issues,
    numericCount,
    textCount,
    emptyCount,
    mixedExamples: []
  }
}

/**
 * Detect column data type based on values (기존 함수 유지)
 */
export function detectColumnType(values: unknown[]): 'numeric' | 'categorical' | 'text' | 'date' {
  const analysis = analyzeColumnDataTypes(values)
  return analysis.detectedType === 'mixed' ? 'text' : analysis.detectedType
}

/**
 * Calculate summary statistics for numeric columns
 */
export function calculateNumericSummary(values: number[]) {
  const validValues = values.filter(v => !isNaN(v) && isFinite(v)).sort((a, b) => a - b)
  
  if (validValues.length === 0) {
    return undefined
  }
  
  const sum = validValues.reduce((acc, val) => acc + val, 0)
  const mean = sum / validValues.length
  
  const median = validValues.length % 2 === 0
    ? (validValues[validValues.length / 2 - 1] + validValues[validValues.length / 2]) / 2
    : validValues[Math.floor(validValues.length / 2)]
  
  const variance = validValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / validValues.length
  const std = Math.sqrt(variance)
  
  const q1Index = Math.floor(validValues.length * 0.25)
  const q3Index = Math.floor(validValues.length * 0.75)
  
  return {
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    std: Number(std.toFixed(4)),
    min: validValues[0],
    max: validValues[validValues.length - 1],
    q1: validValues[q1Index],
    q3: validValues[q3Index]
  }
}

/**
 * Validate data for specific statistical test requirements
 */
export function validateDataForStatisticalTest(
  data: Record<string, unknown>[],
  testType: string,
  selectedColumns: string[]
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  
  switch (testType) {
    case 'Descriptive Statistics':
      if (selectedColumns.length === 0) {
        errors.push('최소 1개의 수치형 변수를 선택해야 합니다.')
      }
      break
      
    case 'One-sample t-test':
      if (selectedColumns.length !== 1) {
        errors.push('One-sample t-test는 정확히 1개의 수치형 변수가 필요합니다.')
      }
      if (data.length < 3) {
        errors.push('t-test를 수행하기 위해서는 최소 3개의 관측값이 필요합니다.')
      }
      break
      
    case 'Two-sample t-test':
      if (selectedColumns.length !== 2) {
        errors.push('Two-sample t-test는 1개의 수치형 변수와 1개의 그룹 변수가 필요합니다.')
      }
      break
      
    case 'Paired t-test':
      if (selectedColumns.length !== 2) {
        errors.push('Paired t-test는 정확히 2개의 수치형 변수가 필요합니다 (사전-사후 측정값).')
      }
      if (data.length < 3) {
        errors.push('Paired t-test를 수행하기 위해서는 최소 3쌍의 관측값이 필요합니다.')
      }
      break
      
    case 'One-way ANOVA':
      if (selectedColumns.length !== 2) {
        errors.push('One-way ANOVA는 1개의 수치형 종속변수와 1개의 그룹 변수가 필요합니다.')
      }
      break
      
    case 'Simple Linear Regression':
    case 'Correlation Analysis':
      if (selectedColumns.length !== 2) {
        errors.push(`${testType}는 정확히 2개의 수치형 변수가 필요합니다.`)
      }
      if (data.length < 5) {
        warnings.push('회귀분석의 신뢰성을 위해 최소 5개 이상의 관측값을 권장합니다.')
      }
      break
  }
  
  return { isValid: errors.length === 0, errors, warnings }
}

/**
 * Validate and analyze dataset
 */
export function validateData(headers: string[], rows: Record<string, unknown>[]): DataValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for empty dataset
  if (rows.length === 0) {
    errors.push('데이터셋이 비어있습니다. CSV 파일에 데이터가 포함되어 있는지 확인해주세요.')
    return {
      isValid: false,
      errors,
      warnings,
      columns: [],
      rowCount: 0,
      columnCount: 0
    }
  }
  
  // Check for valid headers
  if (headers.length === 0) {
    errors.push('열 헤더를 찾을 수 없습니다. CSV 파일의 첫 번째 줄에 열 이름이 포함되어 있는지 확인해주세요.')
  }
  
  // Check for duplicate headers
  const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index)
  if (duplicateHeaders.length > 0) {
    errors.push(`중복된 열 이름이 있습니다: ${duplicateHeaders.join(', ')}. 각 열은 고유한 이름을 가져야 합니다.`)
  }
  
  // Check for empty or invalid headers
  const emptyHeaders = headers.filter(header => !header || header.trim() === '')
  if (emptyHeaders.length > 0) {
    errors.push('일부 열에 이름이 없습니다. 모든 열은 유효한 이름을 가져야 합니다.')
  }
  
  // Analyze each column
  const columns: DataColumn[] = headers.map((header, colIndex) => {
    const values = rows.map(row => row[header])
    const missingCount = values.filter(v => isMissingValue(v)).length
    const uniqueValues = new Set(values.filter(v => !isMissingValue(v)))
    
    // 상세 타입 분석 (혼재 검사 포함)
    const typeAnalysis = analyzeColumnDataTypes(values)
    const type = typeAnalysis.detectedType === 'mixed' ? 'text' : typeAnalysis.detectedType
    
    let summary: DataColumn['summary'] = undefined
    const dataQuality: DataColumn['dataQuality'] = {
      typeConsistency: typeAnalysis.detectedType !== 'mixed',
      issues: [...typeAnalysis.issues]
    }
    
    // 타입 혼재 문제 처리
    if (typeAnalysis.detectedType === 'mixed') {
      errors.push(`"${header}" 열에 데이터 타입이 혼재되어 있습니다. 예시: ${typeAnalysis.mixedExamples.map(ex => `${ex.value}(${ex.type})`).join(', ')}`)
      dataQuality.mixedTypeExamples = typeAnalysis.mixedExamples
      dataQuality.issues.push('데이터 타입 불일치로 인해 통계 분석이 불가능합니다.')
    }
    
    // Calculate summary for numeric columns
    if (type === 'numeric' && typeAnalysis.numericCount > 0) {
      const numericValues: number[] = []
      const rowIndices: number[] = []
      
      values.forEach((value, rowIndex) => {
        let numValue: number | null = null
        
        if (typeof value === 'number') {
          numValue = value
        } else if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
          numValue = Number(value)
        }
        
        if (numValue !== null && isFinite(numValue)) {
          numericValues.push(numValue)
          rowIndices.push(rowIndex)
        }
      })
      
      if (numericValues.length > 0) {
        summary = calculateNumericSummary(numericValues)
        
        // 이상치 검출 (충분한 데이터가 있을 때만)
        if (numericValues.length >= 5) {
          const outliers = detectOutliersIQR(numericValues, rowIndices)
          if (outliers.length > 0) {
            dataQuality.outliers = outliers
            
            const extremeOutliers = outliers.filter(o => o.isExtreme)
            if (extremeOutliers.length > 0) {
              warnings.push(`"${header}" 열에 극단 이상치 ${extremeOutliers.length}개가 발견되었습니다. (예: ${extremeOutliers[0].value})`)
              dataQuality.issues.push(`극단 이상치가 ${extremeOutliers.length}개 있습니다. 분석 결과에 영향을 줄 수 있습니다.`)
            } else {
              warnings.push(`"${header}" 열에 이상치 ${outliers.length}개가 발견되었습니다.`)
              dataQuality.issues.push(`이상치가 ${outliers.length}개 있습니다. 검토가 필요합니다.`)
            }
          }
        }
      }
    }
    
    // Warnings for high missing data
    const missingPercentage = (missingCount / rows.length) * 100
    if (missingPercentage > 50) {
      warnings.push(`"${header}" 열에 결측값이 ${missingPercentage.toFixed(1)}% 있습니다. 분석 결과에 영향을 줄 수 있습니다.`)
      dataQuality.issues.push(`결측값이 ${missingPercentage.toFixed(1)}%로 과도합니다.`)
    } else if (missingPercentage > 20) {
      warnings.push(`"${header}" 열에 결측값이 ${missingPercentage.toFixed(1)}% 있습니다. 통계 분석 시 주의가 필요합니다.`)
      dataQuality.issues.push(`결측값이 ${missingPercentage.toFixed(1)}%로 다소 많습니다.`)
    }
    
    return {
      name: header,
      type,
      values,
      missingCount,
      uniqueCount: uniqueValues.size,
      summary,
      dataQuality
    }
  })
  
  // Check for numeric columns
  const numericColumns = columns.filter(col => col.type === 'numeric')
  if (numericColumns.length === 0) {
    warnings.push('수치형 변수가 없습니다. 대부분의 통계 분석에는 최소 1개의 수치형 변수가 필요합니다.')
  }
  
  // Additional validations
  if (rows.length < 3) {
    warnings.push('데이터 행이 매우 적습니다 (3개 미만). 통계 분석 결과가 신뢰할 수 없을 수 있습니다. 더 많은 데이터를 수집하는 것을 권장합니다.')
  } else if (rows.length < 10) {
    warnings.push('데이터 행이 적습니다 (10개 미만). 통계 분석의 신뢰성을 위해 더 많은 데이터를 권장합니다.')
  }
  
  if (headers.length < 2) {
    warnings.push('데이터에 변수가 1개뿐입니다. 상관분석, 회귀분석 등 다변량 분석을 수행할 수 없습니다.')
  }
  
  // Check for constant values
  columns.forEach(column => {
    if (column.uniqueCount === 1) {
      warnings.push(`"${column.name}" 열의 모든 값이 동일합니다. 이 변수는 통계 분석에 유용하지 않을 수 있습니다.`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    columns,
    rowCount: rows.length,
    columnCount: headers.length
  }
}

/**
 * Convert validation result to Dataset format
 */
export function createDatasetFromValidation(
  name: string,
  file: File,
  parsedData: ParsedData,
  validation: DataValidationResult
): Omit<Dataset, 'id' | 'uploadedAt'> {
  const status: Dataset['status'] = validation.isValid 
    ? (validation.warnings.length > 0 ? 'processed' : 'active')
    : 'error'
  
  return {
    name: name || file.name.replace(/\.[^/.]+$/, ''),
    description: `${validation.rowCount} rows × ${validation.columnCount} columns`,
    format: file.type || 'text/csv',
    size: formatFileSize(file.size),
    rows: validation.rowCount,
    columns: validation.columnCount,
    status,
    data: parsedData.rows
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * 이상치 검출 함수
 */
export function detectOutliers(values: number[], rowIndices: number[]): OutlierInfo[] {
  if (values.length < 3) return []
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1)
  const std = Math.sqrt(variance)
  
  const outliers: OutlierInfo[] = []
  
  values.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / std)
    
    // Z-score 기준: 2 이상 이상치, 3 이상 극단치
    if (zScore > 2) {
      outliers.push({
        value,
        zScore,
        isExtreme: zScore > 3,
        rowIndex: rowIndices[index]
      })
    }
  })
  
  return outliers.sort((a, b) => b.zScore - a.zScore) // Z-score 내림차순
}

/**
 * IQR 방법으로 이상치 검출
 */
export function detectOutliersIQR(values: number[], rowIndices: number[]): OutlierInfo[] {
  if (values.length < 4) return []
  
  const sorted = [...values].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  
  const q1 = sorted[q1Index]
  const q3 = sorted[q3Index]
  const iqr = q3 - q1
  
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  const extremeLowerBound = q1 - 3 * iqr
  const extremeUpperBound = q3 + 3 * iqr
  
  const outliers: OutlierInfo[] = []
  
  values.forEach((value, index) => {
    if (value < lowerBound || value > upperBound) {
      // Z-score도 함께 계산
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1))
      const zScore = Math.abs((value - mean) / std)
      
      outliers.push({
        value,
        zScore,
        isExtreme: value < extremeLowerBound || value > extremeUpperBound,
        rowIndex: rowIndices[index]
      })
    }
  })
  
  return outliers.sort((a, b) => b.zScore - a.zScore)
}

/**
 * Check if file is valid for upload
 */
export function validateFile(file: File): { isValid: boolean; error?: string } {
  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return { 
      isValid: false, 
      error: '파일 크기가 50MB 제한을 초과합니다. 더 작은 파일을 업로드해주세요.' 
    }
  }
  
  // Check if file is empty
  if (file.size === 0) {
    return { 
      isValid: false, 
      error: '빈 파일입니다. 데이터가 포함된 파일을 업로드해주세요.' 
    }
  }
  
  // Check file type
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  const allowedExtensions = ['.csv', '.xls', '.xlsx', '.tsv', '.txt']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    return { 
      isValid: false, 
      error: `지원하지 않는 파일 형식입니다. CSV, Excel (.xls, .xlsx), TSV 파일만 업로드 가능합니다. 현재 파일: ${fileExtension || '확장자 없음'}` 
    }
  }
  
  // Check for suspicious file names
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: '파일명에 특수문자가 포함되어 있습니다. 안전한 파일명을 사용해주세요.'
    }
  }
  
  return { isValid: true }
}