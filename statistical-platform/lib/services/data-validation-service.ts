import { ValidationResults, ColumnStatistics, DataRow } from '@/types/smart-flow'

export const DATA_LIMITS = {
  MAX_ROWS: 100000,
  MAX_COLS: 1000,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  WARN_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const

export class DataValidationService {
  /**
   * CSV 파일 내용의 보안 검증
   */
  static async validateFileContent(file: File): Promise<{ isValid: boolean; error?: string }> {
    try {
      // 파일 헤더 읽기 (처음 1KB)
      const headerSlice = file.slice(0, 1024)
      const headerText = await headerSlice.text()

      // 안전한 문자 패턴 검증 (영문, 숫자, 한글, 기본 특수문자)
      const safePattern = /^[a-zA-Z0-9가-힣\s,.\-_"'()[\]{}:;!?@#$%^&*+=\n\r]+$/

      if (!safePattern.test(headerText)) {
        return {
          isValid: false,
          error: '파일에 허용되지 않은 문자가 포함되어 있습니다.'
        }
      }

      // 악성 스크립트 패턴 검사
      const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick, onerror 등
        /<iframe/i,
        /eval\(/i,
        /document\./i,
        /window\./i
      ]

      for (const pattern of maliciousPatterns) {
        if (pattern.test(headerText)) {
          return {
            isValid: false,
            error: '보안상 위험한 내용이 감지되었습니다.'
          }
        }
      }

      return { isValid: true }
    } catch (error) {
      return {
        isValid: false,
        error: '파일 검증 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 데이터 검증 수행
   */
  static performValidation(data: DataRow[]): ValidationResults {
    const validation: ValidationResults = {
      isValid: true,
      totalRows: 0,
      columnCount: 0,
      missingValues: 0,
      dataType: 'mixed',
      variables: [],
      errors: [],
      warnings: []
    }

    if (!data || data.length === 0) {
      validation.isValid = false
      validation.errors.push('데이터가 없습니다.')
      return validation
    }

    // 행 수 검증
    validation.totalRows = data.length
    if (validation.totalRows > DATA_LIMITS.MAX_ROWS) {
      validation.isValid = false
      validation.errors.push(
        `데이터가 너무 많습니다. 최대 ${DATA_LIMITS.MAX_ROWS.toLocaleString()}행까지 처리 가능합니다. ` +
        `(현재: ${validation.totalRows.toLocaleString()}행)`
      )
      return validation
    }

    // 경고: 큰 데이터셋
    if (validation.totalRows > 10000) {
      validation.warnings.push(
        `데이터가 많습니다 (${validation.totalRows.toLocaleString()}행). 처리 시간이 길어질 수 있습니다.`
      )
    }

    // 열 검증
    const columns = Object.keys(data[0])
    validation.columnCount = columns.length
    validation.variables = columns

    if (validation.columnCount > DATA_LIMITS.MAX_COLS) {
      validation.isValid = false
      validation.errors.push(
        `변수가 너무 많습니다. 최대 ${DATA_LIMITS.MAX_COLS}개까지 처리 가능합니다.`
      )
      return validation
    }

    // 데이터 타입 분석 및 결측값 계산
    const numericColumns: string[] = []
    const categoricalColumns: string[] = []

    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '')
      const missingCount = data.length - values.length
      validation.missingValues += missingCount

      // 결측값 비율 경고
      const missingRatio = missingCount / data.length
      if (missingRatio > 0.5) {
        validation.warnings.push(`'${col}' 변수의 결측값이 50% 이상입니다.`)
      }

      // 숫자형 변수 판별
      if (values.length > 0 && values.every(v => !isNaN(Number(v)))) {
        numericColumns.push(col)
      } else {
        categoricalColumns.push(col)
      }
    })

    // 데이터 타입 결정
    if (numericColumns.length > 0 && categoricalColumns.length === 0) {
      validation.dataType = '수치형'
    } else if (categoricalColumns.length > 0 && numericColumns.length === 0) {
      validation.dataType = '범주형'
    } else {
      validation.dataType = '혼합형'
    }

    // 통계 분석 가능 여부 검증
    if (numericColumns.length === 0) {
      validation.warnings.push('수치형 변수가 없습니다. 일부 통계 분석이 제한될 수 있습니다.')
    }

    // 최소 데이터 요구사항
    if (validation.totalRows < 3) {
      validation.errors.push('최소 3개 이상의 데이터가 필요합니다.')
      validation.isValid = false
    }

    return validation
  }

  /**
   * 분석용 데이터 정보 추출
   */
  static getDataInfo(data: DataRow[]) {
    if (!data || data.length === 0) return null

    const columns = Object.keys(data[0])
    const numericColumns = columns.filter(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '')
      return values.length > 0 && values.every(v => !isNaN(Number(v)))
    })

    const categoricalColumns = columns.filter(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '')
      return values.length > 0 && !values.every(v => !isNaN(Number(v)))
    })

    return {
      columnCount: columns.length,
      rowCount: data.length,
      hasNumeric: numericColumns.length > 0,
      hasCategorical: categoricalColumns.length > 0,
      numericColumns,
      categoricalColumns
    }
  }

  /**
   * 컬럼별 상세 통계 분석
   */
  static analyzeColumn(data: DataRow[], columnName: string): ColumnStatistics {
    // 컬럼 존재 여부 검증
    if (!data || data.length === 0) {
      throw new Error('데이터가 비어있습니다')
    }

    if (!(columnName in data[0])) {
      throw new Error(`'${columnName}' 컬럼을 찾을 수 없습니다`)
    }

    const values = data.map(row => row[columnName])
    const nonMissingValues = values.filter(v => v !== null && v !== undefined && v !== '')

    const stats: ColumnStatistics = {
      name: columnName,
      type: 'mixed',
      numericCount: 0,
      textCount: 0,
      missingCount: values.length - nonMissingValues.length,
      uniqueValues: new Set(nonMissingValues).size
    }

    // 각 값의 타입 분류
    const numericValues: number[] = []
    const textValues: string[] = []

    nonMissingValues.forEach(value => {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        numericValues.push(numValue)
        stats.numericCount++
      } else {
        textValues.push(String(value))
        stats.textCount++
      }
    })

    // 타입 결정
    if (stats.numericCount > 0 && stats.textCount === 0) {
      stats.type = 'numeric'
    } else if (stats.textCount > 0 && stats.numericCount === 0) {
      stats.type = 'categorical'
    } else {
      stats.type = 'mixed'
    }

    // 수치형 통계 계산
    if (numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b)
      const n = sorted.length

      stats.mean = numericValues.reduce((a, b) => a + b, 0) / n
      stats.median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)]
      stats.min = sorted[0]
      stats.max = sorted[n - 1]
      stats.q1 = sorted[Math.floor(n * 0.25)]
      stats.q3 = sorted[Math.floor(n * 0.75)]

      // 표준편차 계산
      const squaredDiffs = numericValues.map(v => Math.pow(v - stats.mean!, 2))
      stats.std = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / n)

      // IQR 기반 이상치 탐지
      const iqr = stats.q3 - stats.q1
      const lowerBound = stats.q1 - 1.5 * iqr
      const upperBound = stats.q3 + 1.5 * iqr
      stats.outliers = numericValues.filter(v => v < lowerBound || v > upperBound)
    }

    // 범주형 통계 계산
    if (textValues.length > 0 || stats.uniqueValues <= 20) {
      const valueCounts = new Map<string, number>()
      nonMissingValues.forEach(value => {
        const key = String(value)
        valueCounts.set(key, (valueCounts.get(key) || 0) + 1)
      })

      stats.topCategories = Array.from(valueCounts.entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // 상위 10개 카테고리만
    }

    return stats
  }

  /**
   * 전체 데이터 상세 검증 (개선된 버전)
   */
  static performDetailedValidation(data: DataRow[]): ValidationResults {
    const basicValidation = this.performValidation(data)

    if (!basicValidation.isValid || !data || data.length === 0) {
      return basicValidation
    }

    // 각 컬럼별 상세 통계 계산
    const columnStats = Object.keys(data[0]).map(col => this.analyzeColumn(data, col))

    // 혼합 데이터 타입 경고 추가
    columnStats.forEach(stat => {
      if (stat.type === 'mixed') {
        basicValidation.warnings.push(
          `'${stat.name}' 변수에 숫자(${stat.numericCount}개)와 문자(${stat.textCount}개)가 혼재되어 있습니다.`
        )
      }

      // 이상치 경고
      if (stat.outliers && stat.outliers.length > 0) {
        const outlierPercent = ((stat.outliers.length / stat.numericCount) * 100).toFixed(1)
        basicValidation.warnings.push(
          `'${stat.name}' 변수에 ${stat.outliers.length}개(${outlierPercent}%)의 이상치가 발견되었습니다.`
        )
      }
    })

    return {
      ...basicValidation,
      columnStats
    }
  }

  /**
   * 데이터 기반 통계 분석 방법 추천
   */
  static recommendAnalysisMethods(data: DataRow[], purpose?: string): string[] {
    const info = this.getDataInfo(data)
    if (!info) return []

    const recommendations: string[] = []
    const columnStats = Object.keys(data[0]).map(col => this.analyzeColumn(data, col))

    // 수치형 변수가 1개일 때
    if (info.numericColumns.length === 1) {
      recommendations.push('일표본 t-검정: 평균값을 특정 값과 비교')
      recommendations.push('정규성 검정: 데이터의 정규분포 여부 확인')
      recommendations.push('기술통계: 평균, 중앙값, 표준편차 등 기본 통계량')
    }

    // 수치형 변수가 2개일 때
    if (info.numericColumns.length === 2) {
      recommendations.push('상관분석: 두 변수 간의 선형관계 분석')
      recommendations.push('단순선형회귀: 한 변수로 다른 변수 예측')
      recommendations.push('대응표본 t-검정: 짝지은 데이터 비교')
    }

    // 수치형 변수가 여러 개일 때
    if (info.numericColumns.length > 2) {
      recommendations.push('다중회귀분석: 여러 변수로 결과 예측')
      recommendations.push('주성분분석(PCA): 차원 축소 및 패턴 발견')
      recommendations.push('상관행렬: 모든 변수 간 상관관계 파악')
    }

    // 범주형 변수가 있고 수치형 변수가 있을 때
    if (info.hasCategorical && info.hasNumeric) {
      const categoricalStats = columnStats.filter(s => s.type === 'categorical')
      const groupCount = categoricalStats.reduce((max, stat) =>
        Math.max(max, stat.uniqueValues), 0)

      if (groupCount === 2) {
        recommendations.push('독립표본 t-검정: 두 그룹 평균 비교')
      } else if (groupCount > 2) {
        recommendations.push('일원분산분석(ANOVA): 3개 이상 그룹 비교')
        recommendations.push('사후검정: 그룹 간 구체적 차이 확인')
      }
    }

    // 범주형 변수만 있을 때
    if (info.categoricalColumns.length > 0 && info.numericColumns.length === 0) {
      recommendations.push('카이제곱 검정: 범주 간 독립성 검정')
      recommendations.push('빈도분석: 범주별 분포 확인')
      recommendations.push('교차표: 범주 변수 간 관계 분석')
    }

    // 이상치가 많은 경우
    const hasOutliers = columnStats.some(s => s.outliers && s.outliers.length > 0)
    if (hasOutliers) {
      recommendations.push('비모수 검정: 정규성 가정이 필요없는 분석')
      recommendations.push('Mann-Whitney U: 이상치에 강건한 그룹 비교')
      recommendations.push('Kruskal-Wallis: 비모수적 다중 그룹 비교')
    }

    return recommendations
  }
}