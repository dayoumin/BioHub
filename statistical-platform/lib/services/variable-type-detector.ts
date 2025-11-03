/**
 * 변수 타입 자동 감지 서비스
 *
 * 데이터의 각 열을 분석하여 통계적 변수 타입을 자동으로 판별합니다.
 * SPSS, R, SAS의 변수 분류 기준을 따릅니다.
 */

import { VariableType } from '../statistics/variable-requirements'

export interface ColumnAnalysis {
  name: string
  type: VariableType
  dataType: 'number' | 'string' | 'boolean' | 'date' | 'mixed'
  uniqueCount: number
  totalCount: number
  missingCount: number
  missingRate: number
  samples: any[]
  statistics?: {
    min?: number
    max?: number
    mean?: number
    median?: number
    mode?: any
    skewness?: number
    kurtosis?: number
    std?: number
    variance?: number
    isInteger?: boolean
    hasNegative?: boolean
    hasDecimal?: boolean
  }
  metadata: {
    possibleTypes: VariableType[]
    confidence: number
    reason: string
    warnings?: string[]
  }
}

export interface DatasetAnalysis {
  columns: ColumnAnalysis[]
  rows?: number  // Alias for totalRows
  summary: {
    totalColumns: number
    totalRows: number
    continuousCount: number
    categoricalCount: number
    binaryCount: number
    ordinalCount: number
    dateCount: number
    countCount: number
  }
  recommendations: {
    likelyIdColumn?: string
    likelyDateColumn?: string
    likelyTargetColumns?: string[]
    likelyGroupingColumns?: string[]
  }
}

/**
 * 변수 타입 감지를 위한 임계값 설정
 */
const THRESHOLDS = {
  // 범주형으로 분류할 최대 고유값 비율
  CATEGORICAL_UNIQUE_RATIO: 0.05, // 5% 이하

  // 이진변수로 분류할 고유값 수
  BINARY_UNIQUE_COUNT: 2,

  // 서열변수로 분류할 최대 고유값 수
  ORDINAL_MAX_UNIQUE: 10,

  // Count 변수로 분류할 조건
  COUNT_MAX_VALUE: 1000000, // 백만 이하

  // 최소 샘플 수 (타입 판별용)
  MIN_SAMPLES_FOR_DETECTION: 3,

  // 날짜 패턴 정규식
  DATE_PATTERNS: [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ],

  // 시간 패턴 정규식
  TIME_PATTERNS: [
    /^\d{2}:\d{2}:\d{2}$/, // HH:MM:SS
    /^\d{2}:\d{2}$/, // HH:MM
  ],

  // ID 패턴 (제외할 변수)
  ID_PATTERNS: [
    /^(id|ID|Id|_id|.*_id|.*Id|.*ID)$/,
    /^(index|idx|key|.*_key)$/,
    /^(uuid|guid|.*_uuid|.*_guid)$/,
  ]
}

/**
 * 단일 열의 변수 타입 감지
 */
export function detectVariableType(
  values: any[],
  columnName: string = ''
): VariableType {
  // 유효한 값만 필터링
  const validValues = values.filter(v =>
    v !== null &&
    v !== undefined &&
    v !== '' &&
    (typeof v === 'string' ? v.trim() !== '' : true)
  )

  if (validValues.length === 0) {
    return 'continuous' // 기본값
  }

  // 날짜 타입 체크를 먼저
  if (isDateColumn(validValues)) {
    return 'date'
  }

  // 최소 샘플 수 체크는 날짜 체크 후에
  if (validValues.length < THRESHOLDS.MIN_SAMPLES_FOR_DETECTION) {
    // 샘플이 적어도 기본 분류는 시도
    if (validValues.length === 2 && new Set(validValues).size === 2) {
      return 'binary'
    }
    // 문자열이면 categorical로 분류
    if (validValues.some(v => typeof v === 'string' && isNaN(Number(v)))) {
      return 'categorical'
    }
    return 'continuous'
  }

  // 숫자 타입인지 확인
  const numericValues = validValues.filter(v => {
    const num = Number(v)
    return !isNaN(num) && isFinite(num)
  })

  // 모든 값이 숫자인 경우
  if (numericValues.length === validValues.length) {
    return classifyNumericVariable(numericValues.map(Number), validValues.length)
  }

  // 문자열 기반 분류
  return classifyStringVariable(validValues)
}

/**
 * 숫자 변수 세부 분류
 */
function classifyNumericVariable(
  values: number[],
  totalCount: number
): VariableType {
  const uniqueValues = new Set(values)
  const uniqueCount = uniqueValues.size
  const uniqueRatio = uniqueCount / totalCount

  // 이진변수 체크 (0/1 또는 두 개 값)
  if (uniqueCount === THRESHOLDS.BINARY_UNIQUE_COUNT) {
    const sortedUnique = Array.from(uniqueValues).sort((a, b) => a - b)
    // 0과 1인 경우
    if (sortedUnique[0] === 0 && sortedUnique[1] === 1) {
      return 'binary'
    }
    // 다른 두 개 값인 경우도 이진으로 처리
    return 'binary'
  }

  // 모든 값이 양의 정수인지 확인
  const allPositiveIntegers = values.every(v =>
    Number.isInteger(v) && v >= 0
  )

  // Count 변수 체크 (양의 정수, 0 포함)
  if (allPositiveIntegers) {
    const max = Math.max(...values)
    const min = Math.min(...values)

    // 0부터 시작하고 범위가 적절한 경우
    if (min === 0 && max <= THRESHOLDS.COUNT_MAX_VALUE) {
      // 고유값이 적으면 서열변수
      if (uniqueCount <= THRESHOLDS.ORDINAL_MAX_UNIQUE) {
        return 'ordinal'
      }
      // 고유값이 10개 이하면 서열형으로
      if (uniqueCount <= 10) {
        return 'ordinal'
      }
      // Count 변수로 분류
      return 'count'
    }

    // 1-5, 1-7, 1-10 등 척도
    if (min >= 1 && max <= 10 && uniqueCount <= max) {
      return 'ordinal'
    }
  }

  // 고유값 비율이 매우 낮으면 범주형 또는 서열형
  if (uniqueRatio <= THRESHOLDS.CATEGORICAL_UNIQUE_RATIO) {
    // 정수이고 순서가 있어 보이면 서열형
    if (allPositiveIntegers && uniqueCount <= THRESHOLDS.ORDINAL_MAX_UNIQUE) {
      // 1-5, 1-7, 1-10 같은 연속된 정수면 서열형
      const sortedUnique = Array.from(uniqueValues).sort((a, b) => a - b)
      const isConsecutive = sortedUnique.every((val, idx) => {
        if (idx === 0) return true
        return val - sortedUnique[idx - 1] <= 2
      })
      if (isConsecutive) {
        return 'ordinal'
      }
    }
    return 'categorical'
  }

  // 기본값: 연속형
  return 'continuous'
}

/**
 * 문자열 변수 세부 분류
 */
function classifyStringVariable(values: any[]): VariableType {
  const uniqueValues = new Set(values)
  const uniqueCount = uniqueValues.size

  // 이진변수 체크
  if (uniqueCount === THRESHOLDS.BINARY_UNIQUE_COUNT) {
    // Yes/No, True/False, M/F 등
    const lowerValues = Array.from(uniqueValues).map(v =>
      String(v).toLowerCase().trim()
    )

    const binaryPatterns = [
      ['yes', 'no'],
      ['true', 'false'],
      ['y', 'n'],
      ['t', 'f'],
      ['m', 'f'],
      ['male', 'female'],
      ['0', '1'],
      ['pass', 'fail'],
      ['success', 'failure']
    ]

    for (const pattern of binaryPatterns) {
      if (lowerValues.includes(pattern[0]) && lowerValues.includes(pattern[1])) {
        return 'binary'
      }
    }

    // 그래도 2개 값이면 이진으로 처리
    return 'binary'
  }

  // Likert 척도 패턴 체크
  const ordinalPatterns = [
    ['매우 낮음', '낮음', '보통', '높음', '매우 높음'],
    ['매우 불만족', '불만족', '보통', '만족', '매우 만족'],
    ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'],
    ['very low', 'low', 'medium', 'high', 'very high'],
    ['never', 'rarely', 'sometimes', 'often', 'always']
  ]

  const lowerUniqueValues = Array.from(uniqueValues).map(v =>
    String(v).toLowerCase().trim()
  )

  for (const pattern of ordinalPatterns) {
    const matches = pattern.filter(p =>
      lowerUniqueValues.some(v => v.includes(p.toLowerCase()))
    )
    if (matches.length >= 3) {
      return 'ordinal'
    }
  }

  // 순서를 나타내는 문자열 패턴
  if (uniqueCount <= THRESHOLDS.ORDINAL_MAX_UNIQUE) {
    const hasOrderWords = lowerUniqueValues.some(v =>
      /^(first|second|third|1st|2nd|3rd|low|medium|high|small|large)/.test(v)
    )
    if (hasOrderWords) {
      return 'ordinal'
    }
  }

  // 기본값: 범주형
  return 'categorical'
}

/**
 * 날짜 열 감지
 */
function isDateColumn(values: any[]): boolean {
  if (values.length === 0) return false

  // 샘플링 (최대 100개)
  const samples = values.slice(0, Math.min(100, values.length))

  // Date 객체인지 확인
  if (samples.every(v => v instanceof Date)) {
    return true
  }

  // 문자열 날짜 패턴 확인
  const stringValues = samples.filter(v => typeof v === 'string')
  if (stringValues.length === 0) return false

  const dateMatches = stringValues.filter(v => {
    // 날짜 패턴 매칭
    for (const pattern of THRESHOLDS.DATE_PATTERNS) {
      if (pattern.test(v)) return true
    }

    // ISO 날짜 형식 (개선된 체크)
    const date = new Date(v)
    if (!isNaN(date.getTime())) {
      // 날짜 형식 문자열 포함 여부 체크
      if (v.includes('-') || v.includes('/') || v.includes(':')) {
        // 연도가 합리적인 범위인지 체크
        const year = date.getFullYear()
        if (year >= 1900 && year <= 2100) {
          return true
        }
      }
    }

    return false
  })

  // 80% 이상이 날짜 패턴이면 날짜 열로 판정
  return dateMatches.length / stringValues.length > 0.8
}

/**
 * 전체 데이터셋 분석
 */
export function analyzeDataset(
  data: Record<string, any>[],
  options: {
    excludeColumns?: string[]
    includeOnlyColumns?: string[]
    detectIdColumns?: boolean
  } = {}
): DatasetAnalysis {
  if (!data || data.length === 0) {
    return {
      columns: [],
      summary: {
        totalColumns: 0,
        totalRows: 0,
        continuousCount: 0,
        categoricalCount: 0,
        binaryCount: 0,
        ordinalCount: 0,
        dateCount: 0,
        countCount: 0
      },
      recommendations: {}
    }
  }

  // 열 이름 추출
  let columnNames = Object.keys(data[0])

  // 필터링
  if (options.includeOnlyColumns) {
    columnNames = columnNames.filter(name =>
      options.includeOnlyColumns!.includes(name)
    )
  }
  if (options.excludeColumns) {
    columnNames = columnNames.filter(name =>
      !options.excludeColumns!.includes(name)
    )
  }

  // ID 컬럼 자동 제외
  if (options.detectIdColumns !== false) {
    columnNames = columnNames.filter(name => !isIdColumn(name))
  }

  // 각 열 분석
  const columns: ColumnAnalysis[] = columnNames.map(columnName => {
    const values = data.map(row => row[columnName])
    return analyzeColumn(columnName, values)
  })

  // 요약 통계
  const summary = {
    totalColumns: columns.length,
    totalRows: data.length,
    continuousCount: columns.filter(c => c.type === 'continuous').length,
    categoricalCount: columns.filter(c => c.type === 'categorical').length,
    binaryCount: columns.filter(c => c.type === 'binary').length,
    ordinalCount: columns.filter(c => c.type === 'ordinal').length,
    dateCount: columns.filter(c => c.type === 'date').length,
    countCount: columns.filter(c => c.type === 'count').length
  }

  // 추천 사항
  const recommendations = generateRecommendations(columns)

  return {
    columns,
    summary,
    recommendations
  }
}

/**
 * 단일 열 상세 분석
 */
export function analyzeColumn(
  columnName: string,
  values: any[]
): ColumnAnalysis {
  const totalCount = values.length

  // NULL/빈값 처리
  const validValues = values.filter(v =>
    v !== null &&
    v !== undefined &&
    v !== '' &&
    (typeof v === 'string' ? v.trim() !== '' : true)
  )

  const missingCount = totalCount - validValues.length
  const uniqueValues = new Set(validValues)
  const uniqueCount = uniqueValues.size

  // 데이터 타입 판별
  const dataType = determineDataType(validValues)

  // 변수 타입 감지
  const variableType = detectVariableType(validValues, columnName)

  // 통계량 계산 (숫자형인 경우)
  let statistics = undefined
  if (dataType === 'number' && validValues.length > 0) {
    const numericValues = validValues.map(Number).filter(n => !isNaN(n))
    if (numericValues.length > 0) {
      statistics = calculateStatistics(numericValues)
    }
  }

  // 샘플 추출 (최대 10개)
  const samples = Array.from(uniqueValues).slice(0, 10)

  // 메타데이터 생성
  const metadata = generateMetadata(
    variableType,
    dataType,
    uniqueCount,
    totalCount,
    columnName
  )

  return {
    name: columnName,
    type: variableType,
    dataType,
    uniqueCount,
    totalCount,
    missingCount,
    missingRate: missingCount / totalCount,
    samples,
    statistics,
    metadata
  }
}

/**
 * 데이터 타입 판별
 */
function determineDataType(
  values: any[]
): 'number' | 'string' | 'boolean' | 'date' | 'mixed' {
  if (values.length === 0) return 'string'

  const types = new Set(values.map(v => {
    if (v instanceof Date) return 'date'
    if (typeof v === 'boolean') return 'boolean'
    if (typeof v === 'number') return 'number'
    if (typeof v === 'string') {
      const num = Number(v)
      if (!isNaN(num) && isFinite(num)) return 'number'
      if (v.toLowerCase() === 'true' || v.toLowerCase() === 'false') return 'boolean'
      const date = new Date(v)
      if (!isNaN(date.getTime()) && (v.includes('-') || v.includes('/'))) return 'date'
    }
    return 'string'
  }))

  if (types.size === 1) {
    return Array.from(types)[0] as any
  }

  // 대부분이 숫자면 숫자로
  const numericCount = values.filter(v => {
    const num = Number(v)
    return !isNaN(num) && isFinite(num)
  }).length

  if (numericCount / values.length > 0.9) {
    return 'number'
  }

  return 'mixed'
}

/**
 * 숫자 통계량 계산
 */
function calculateStatistics(values: number[]): ColumnAnalysis['statistics'] {
  const sorted = [...values].sort((a, b) => a - b)
  const sum = values.reduce((acc, val) => acc + val, 0)

  // Mode 계산
  const frequency = new Map<number, number>()
  values.forEach(v => {
    frequency.set(v, (frequency.get(v) || 0) + 1)
  })
  let mode = values[0]
  let maxFreq = 1
  frequency.forEach((freq, val) => {
    if (freq > maxFreq) {
      maxFreq = freq
      mode = val
    }
  })

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    mode,
    isInteger: values.every(v => Number.isInteger(v)),
    hasNegative: values.some(v => v < 0),
    hasDecimal: values.some(v => !Number.isInteger(v))
  }
}

/**
 * 메타데이터 생성
 */
function generateMetadata(
  type: VariableType,
  dataType: string,
  uniqueCount: number,
  totalCount: number,
  columnName: string
): ColumnAnalysis['metadata'] {
  const possibleTypes: VariableType[] = [type]
  const warnings: string[] = []
  let confidence = 1.0
  let reason = ''

  // 타입별 설명
  switch (type) {
    case 'continuous':
      reason = '연속적인 수치 데이터'
      if (uniqueCount / totalCount < 0.1) {
        possibleTypes.push('categorical')
        confidence = 0.7
        warnings.push('고유값이 적어 범주형일 가능성도 있음')
      }
      break

    case 'categorical':
      reason = `${uniqueCount}개의 범주를 가진 범주형 데이터`
      if (dataType === 'number') {
        possibleTypes.push('ordinal')
        warnings.push('숫자형이므로 서열형일 가능성도 있음')
      }
      break

    case 'binary':
      reason = '2개 값만 가지는 이진 데이터'
      confidence = 1.0
      break

    case 'ordinal':
      reason = '순서가 있는 서열 데이터'
      possibleTypes.push('categorical')
      confidence = 0.8
      break

    case 'date':
      reason = '날짜/시간 데이터'
      confidence = 0.9
      break

    case 'count':
      reason = '개수를 나타내는 카운트 데이터'
      possibleTypes.push('continuous')
      confidence = 0.8
      break
  }

  // 추가 경고
  if (uniqueCount === totalCount && totalCount > 100) {
    warnings.push('모든 값이 고유함 - ID 컬럼일 가능성')
  }

  if (uniqueCount === 1) {
    warnings.push('단일 값만 존재 - 분석에서 제외 권장')
  }

  return {
    possibleTypes,
    confidence,
    reason,
    warnings: warnings.length > 0 ? warnings : undefined
  }
}

/**
 * ID 컬럼 감지
 */
function isIdColumn(columnName: string): boolean {
  for (const pattern of THRESHOLDS.ID_PATTERNS) {
    if (pattern.test(columnName)) {
      return true
    }
  }
  return false
}

/**
 * 추천 사항 생성
 */
function generateRecommendations(
  columns: ColumnAnalysis[]
): DatasetAnalysis['recommendations'] {
  const recommendations: DatasetAnalysis['recommendations'] = {}

  // ID 컬럼 찾기
  const idColumn = columns.find(c =>
    c.uniqueCount === c.totalCount &&
    (c.dataType === 'number' || c.dataType === 'string')
  )
  if (idColumn) {
    recommendations.likelyIdColumn = idColumn.name
  }

  // 날짜 컬럼 찾기
  const dateColumn = columns.find(c => c.type === 'date')
  if (dateColumn) {
    recommendations.likelyDateColumn = dateColumn.name
  }

  // 타겟 변수 후보 (이진 또는 범주형)
  const targetCandidates = columns
    .filter(c => c.type === 'binary' ||
                 (c.type === 'categorical' && c.uniqueCount <= 10))
    .map(c => c.name)
  if (targetCandidates.length > 0) {
    recommendations.likelyTargetColumns = targetCandidates
  }

  // 그룹화 변수 후보
  const groupingCandidates = columns
    .filter(c => c.type === 'categorical' &&
                 c.uniqueCount >= 2 &&
                 c.uniqueCount <= 20)
    .map(c => c.name)
  if (groupingCandidates.length > 0) {
    recommendations.likelyGroupingColumns = groupingCandidates
  }

  return recommendations
}

/**
 * 변수 타입별 아이콘 반환
 */
export function getVariableTypeIcon(type: VariableType): string {
  const icons: Record<VariableType, string> = {
    continuous: '📊',
    categorical: '🏷️',
    binary: '⚡',
    ordinal: '📶',
    date: '📅',
    count: '🔢'
  }
  return icons[type] || '❓'
}

/**
 * 변수 타입별 색상 반환 (Tailwind CSS 클래스)
 */
export function getVariableTypeColor(type: VariableType): string {
  const colors: Record<VariableType, string> = {
    continuous: 'text-blue-600 bg-blue-50',
    categorical: 'text-green-600 bg-green-50',
    binary: 'text-purple-600 bg-purple-50',
    ordinal: 'text-orange-600 bg-orange-50',
    date: 'text-pink-600 bg-pink-50',
    count: 'text-indigo-600 bg-indigo-50'
  }
  return colors[type] || 'text-gray-600 bg-gray-50'
}

/**
 * 변수 타입 한글 명칭
 */
export function getVariableTypeLabel(type: VariableType): string {
  const labels: Record<VariableType, string> = {
    continuous: '연속형',
    categorical: '범주형',
    binary: '이진형',
    ordinal: '서열형',
    date: '날짜형',
    count: '카운트'
  }
  return labels[type] || '알 수 없음'
}