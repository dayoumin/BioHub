import { ValidationResults, ColumnStatistics, DataRow, StatisticalAssumptions } from '@/types/smart-flow'
import { detectIdColumn } from '@/lib/services/variable-type-detector'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

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

    // UX 개선: 빠른 검증에서도 columnStats 생성 (Step 2 초기 빈 화면 해소)
    try {
      const sampledForStats = this.smartSample(data, 2000)
      const columnStats = columns.map(col => this.analyzeColumn(sampledForStats, col))
      validation.columnStats = columnStats
      validation.columns = columnStats
    } catch (error) {
      console.warn('[DataValidationService] 빠른 검증 columnStats 생성 실패', error)
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
   * 컬럼별 상세 통계 분석 (성능 최적화 버전)
   * - 단일 순회로 평균/표준편차 계산
   * - 정렬은 중앙값/사분위수 계산 시에만 1회 수행
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

    // 각 값의 타입 분류 + 평균 계산 (단일 순회)
    const numericValues: number[] = []
    const textValues: string[] = []
    let sum = 0

    nonMissingValues.forEach(value => {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        numericValues.push(numValue)
        sum += numValue
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
      const n = numericValues.length

      // 평균 (이미 계산됨)
      stats.mean = sum / n

      // 표준편차 (단일 순회)
      let sumSquaredDiffs = 0
      for (let i = 0; i < n; i++) {
        const diff = numericValues[i] - stats.mean
        sumSquaredDiffs += diff * diff
      }
      stats.std = Math.sqrt(sumSquaredDiffs / n)

      // 중앙값/사분위수 계산 (정렬 1회만 수행)
      const sorted = [...numericValues].sort((a, b) => a - b)
      stats.median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)]
      stats.min = sorted[0]
      stats.max = sorted[n - 1]
      stats.q1 = sorted[Math.floor(n * 0.25)]
      stats.q3 = sorted[Math.floor(n * 0.75)]

      // IQR 기반 이상치 탐지 (정렬된 배열 활용)
      const iqr = stats.q3 - stats.q1
      const lowerBound = stats.q1 - 1.5 * iqr
      const upperBound = stats.q3 + 1.5 * iqr
      stats.outliers = sorted.filter(v => v < lowerBound || v > upperBound)
    }

    // 범주형 통계 계산 (상위 10개만)
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

    // ID/일련번호 감지 (이미 추출된 values 재사용)
    const idResult = detectIdColumn(columnName, values)
    if (idResult.isId) {
      stats.idDetection = idResult
    }

    return stats
  }

  /**
   * 스마트 샘플링 (대용량 데이터 성능 최적화)
   * - 10,000행 이하: 전체 데이터 사용
   * - 10,000행 초과: 계층적 샘플링 (10,000행)
   */
  private static smartSample(data: DataRow[], maxRows: number = 10000): DataRow[] {
    if (data.length <= maxRows) {
      return data
    }

    // 계층적 샘플링: 균등 간격으로 추출
    const interval = Math.floor(data.length / maxRows)
    const sampled: DataRow[] = []

    for (let i = 0; i < data.length && sampled.length < maxRows; i += interval) {
      sampled.push(data[i])
    }

    return sampled
  }

  /**
   * 전체 데이터 상세 검증 (성능 최적화 버전)
   * - 대용량 데이터: 스마트 샘플링 적용
   * - 병렬 처리 가능한 구조로 변경
   */
  static async performDetailedValidation(data: DataRow[]): Promise<ValidationResults> {
    const basicValidation = this.performValidation(data)

    if (!basicValidation.isValid || !data || data.length === 0) {
      return basicValidation
    }

    // 대용량 데이터 처리 최적화
    const originalRowCount = data.length
    const shouldSample = data.length > 10000
    const sampleData = shouldSample ? this.smartSample(data) : data

    if (shouldSample) {
      basicValidation.warnings.push(
        `⚡ 성능 최적화: ${originalRowCount.toLocaleString()}행 중 ${sampleData.length.toLocaleString()}행을 샘플링하여 검증합니다.`
      )
    }

    // 각 컬럼별 상세 통계 계산 (샘플 데이터 사용)
    const columns = Object.keys(data[0])
    const columnStats = columns.map(col => this.analyzeColumn(sampleData, col))

    // 혼합 데이터 타입 경고 추가
    columnStats.forEach(stat => {
      if (stat.type === 'mixed') {
        basicValidation.warnings.push(
          `'${stat.name}' 변수에 숫자(${stat.numericCount}개)와 문자(${stat.textCount}개)가 혼재되어 있습니다.`
        )
      }

      // 이상치 경고 (5% 이상만 표시)
      if (stat.outliers && stat.outliers.length > 0) {
        const outlierPercent = ((stat.outliers.length / stat.numericCount) * 100)
        if (outlierPercent >= 5) {
          basicValidation.warnings.push(
            `'${stat.name}' 변수에 ${stat.outliers.length}개(${outlierPercent.toFixed(1)}%)의 이상치가 발견되었습니다.`
          )
        }
      }
    })

    // ===== 가정 검정 수행 (수치형 변수만) =====
    const numericColumnStats = columnStats.filter(s => s.type === 'numeric')
    let assumptionTests: StatisticalAssumptions | undefined

    if (numericColumnStats.length > 0) {
      try {
        const pyodide = PyodideCoreService.getInstance()

        // Pyodide 초기화 여부 확인
        if (!pyodide.isInitialized()) {
          console.warn('[DataValidationService] Pyodide가 초기화되지 않아 가정 검정을 스킵합니다.')
          // 가정 검정 없이 기본 검증만 반환
          return {
            ...basicValidation,
            totalRows: originalRowCount,
            columnStats,
            columns: columnStats,
            assumptionTests: undefined
          }
        }

        // Shapiro-Wilk 정규성 검정 (각 수치형 변수별)
        const normalityResults: Array<{
          variable: string
          statistic: number
          pValue: number
          isNormal: boolean
        }> = []

        for (const colStat of numericColumnStats.slice(0, 3)) { // 최대 3개만 (성능)
          const colData = sampleData.map(row => row[colStat.name]).filter(v => v !== null && v !== undefined && v !== '').map(Number)

          if (colData.length >= 3) {
            try {
              const result = await pyodide.callWorkerMethod<{
                statistic: number
                p_value: number
              }>(3, 'shapiro_wilk_test', { data: colData })

              normalityResults.push({
                variable: colStat.name,
                statistic: result.statistic,
                pValue: result.p_value,
                isNormal: result.p_value >= 0.05
              })
            } catch (err) {
              console.warn(`Shapiro-Wilk 검정 실패 (${colStat.name})`, err)
            }
          }
        }

        // 정규성 검정 결과가 있으면 추가
        if (normalityResults.length > 0) {
          assumptionTests = {
            normality: {
              shapiroWilk: {
                statistic: normalityResults[0].statistic,
                pValue: normalityResults[0].pValue,
                isNormal: normalityResults[0].isNormal
              }
            }
          }

          // 경고 메시지 추가
          const nonNormalVars = normalityResults.filter(r => !r.isNormal)
          if (nonNormalVars.length > 0) {
            basicValidation.warnings.push(
              `⚠️ 정규성 검정: '${nonNormalVars.map(r => r.variable).join(', ')}' 변수가 정규분포를 따르지 않을 수 있습니다 (p < 0.05).`
            )
          }
        }
      } catch (error) {
        console.warn('가정 검정 실패:', error)
      }
    }

    return {
      ...basicValidation,
      totalRows: originalRowCount,
      columnStats,
      columns: columnStats,
      assumptionTests
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
