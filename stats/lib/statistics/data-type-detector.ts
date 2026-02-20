/**
 * 데이터 유형 자동 감지 시스템
 * 업로드된 데이터의 구조와 유형을 자동으로 파악하여
 * 적절한 통계 분석 방법을 추천하는데 사용됩니다.
 */

export type DataType = 'continuous' | 'ordinal' | 'nominal' | 'binary' | 'datetime' | 'mixed'
export type StudyDesign = 'independent' | 'paired' | 'repeated' | 'nested' | 'cross-sectional' | 'time-series'
export type DataStructure = 'wide' | 'long' | 'mixed'

export interface ColumnTypeInfo {
  name: string
  type: DataType
  subtype?: string // 예: integer, float, date, categorical
  uniqueCount: number
  missingCount: number
  sampleValues: any[]
  inferredRole?: 'id' | 'dependent' | 'independent' | 'group' | 'time'
}

export interface DataCharacteristics {
  structure: DataStructure
  studyDesign: StudyDesign
  columns: ColumnTypeInfo[]
  sampleSize: number
  groupCount: number
  hasTimeComponent: boolean
  hasPairedData: boolean
  hasRepeatedMeasures: boolean
  recommendations: AnalysisRecommendation[]
}

export interface AnalysisRecommendation {
  method: string
  confidence: number // 0-1
  reasons: string[]
  requirements: string[]
  alternativeIf: { condition: string; alternative: string }[]
}

export class DataTypeDetector {
  /**
   * 개별 컬럼의 데이터 유형 감지
   */
  static detectColumnType(values: any[]): DataType {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '')

    if (nonNull.length === 0) return 'mixed'

    // Binary 체크 (두 개의 고유값만 있는 경우)
    const uniqueValues = new Set(nonNull)
    if (uniqueValues.size === 2) {
      return 'binary'
    }

    // Datetime 체크
    if (this.isDateTime(nonNull[0])) {
      return 'datetime'
    }

    // Numeric 체크
    const numericCount = nonNull.filter(v => !isNaN(Number(v))).length
    const numericRatio = numericCount / nonNull.length

    if (numericRatio >= 0.95) {
      // 대부분 숫자인 경우
      if (uniqueValues.size > 5) {
        return 'continuous' // 연속형 (threshold synced with variable-type-detector)
      } else if (this.hasOrderedPattern(Array.from(uniqueValues))) {
        return 'ordinal' // 순서형 (예: 1,2,3,4,5 평점)
      } else {
        return 'nominal' // 명목형 (예: 그룹 ID)
      }
    }

    // Text 기반 체크
    if (numericRatio < 0.05) {
      // 순서가 있는 텍스트인지 확인 (예: Low, Medium, High)
      if (this.isOrdinalText(Array.from(uniqueValues))) {
        return 'ordinal'
      }
      return 'nominal'
    }

    return 'mixed'
  }

  /**
   * 전체 데이터셋의 구조 파악
   */
  static detectDataStructure(data: any[]): DataStructure {
    if (!data || data.length === 0) return 'wide'

    const columns = Object.keys(data[0])

    // Long format indicators
    const hasValueColumn = columns.some(col =>
      col.toLowerCase().includes('value') ||
      col.toLowerCase().includes('measurement')
    )
    const hasVariableColumn = columns.some(col =>
      col.toLowerCase().includes('variable') ||
      col.toLowerCase().includes('measure')
    )

    if (hasValueColumn && hasVariableColumn) {
      return 'long'
    }

    // Wide format is default
    return 'wide'
  }

  /**
   * 연구 설계 추론
   */
  static inferStudyDesign(data: any[], columns: ColumnTypeInfo[]): StudyDesign {
    // Time series 체크
    const hasTimeColumn = columns.some(col => col.type === 'datetime')
    if (hasTimeColumn) {
      return 'time-series'
    }

    // ID 컬럼 체크 (반복측정 가능성)
    const hasIdColumn = columns.some(col =>
      col.name.toLowerCase().includes('id') ||
      col.name.toLowerCase().includes('subject') ||
      col.name.toLowerCase().includes('participant')
    )

    // 같은 ID가 여러 번 나타나는지 확인
    if (hasIdColumn) {
      const idColumn = columns.find(col =>
        col.name.toLowerCase().includes('id') ||
        col.name.toLowerCase().includes('subject')
      )

      if (idColumn) {
        const ids = data.map(row => row[idColumn.name])
        const uniqueIds = new Set(ids)

        if (uniqueIds.size < ids.length / 2) {
          // ID가 반복되면 repeated measures
          return 'repeated'
        }
      }
    }

    // Before/After, Pre/Post 패턴 체크
    const columnNames = columns.map(c => c.name.toLowerCase())
    const hasPairedPattern =
      (columnNames.some(n => n.includes('before')) && columnNames.some(n => n.includes('after'))) ||
      (columnNames.some(n => n.includes('pre')) && columnNames.some(n => n.includes('post'))) ||
      (columnNames.some(n => n.includes('baseline')) && columnNames.some(n => n.includes('follow')))

    if (hasPairedPattern) {
      return 'paired'
    }

    // 기본값: 독립 표본
    return 'independent'
  }

  /**
   * 샘플 크기 기반 권장사항
   */
  static getSampleSizeRecommendations(n: number, groups: number = 1): string[] {
    const recommendations: string[] = []

    if (n < 30) {
      recommendations.push('소표본: 비모수 검정 권장')
      recommendations.push('정규성 가정에 민감함')
    } else if (n < 100) {
      recommendations.push('중간 표본: 대부분의 검정 가능')
    } else {
      recommendations.push('대표본: 중심극한정리 적용 가능')
    }

    // 그룹별 샘플 크기 체크
    const perGroup = Math.floor(n / groups)
    if (groups > 1 && perGroup < 20) {
      recommendations.push(`그룹당 표본 크기 작음 (${perGroup}): ANOVA보다 Kruskal-Wallis 권장`)
    }

    return recommendations
  }

  /**
   * 종합적인 데이터 특성 분석
   */
  static analyzeDataCharacteristics(data: any[]): DataCharacteristics {
    if (!data || data.length === 0) {
      throw new Error('데이터가 비어있습니다')
    }

    const columns = Object.keys(data[0])
    const columnInfo: ColumnTypeInfo[] = []

    // 각 컬럼 분석
    for (const colName of columns) {
      const values = data.map(row => row[colName])
      const type = this.detectColumnType(values)
      const uniqueValues = new Set(values.filter(v => v !== null && v !== undefined))

      columnInfo.push({
        name: colName,
        type,
        uniqueCount: uniqueValues.size,
        missingCount: values.filter(v => v === null || v === undefined || v === '').length,
        sampleValues: Array.from(uniqueValues).slice(0, 5),
        inferredRole: this.inferColumnRole(colName, type, uniqueValues.size, data.length)
      })
    }

    const structure = this.detectDataStructure(data)
    const studyDesign = this.inferStudyDesign(data, columnInfo)

    // 그룹 수 계산 (범주형 변수 기준)
    const categoricalColumns = columnInfo.filter(c =>
      c.type === 'nominal' || c.type === 'binary' || c.type === 'ordinal'
    )
    const groupCount = categoricalColumns.length > 0
      ? Math.max(...categoricalColumns.map(c => c.uniqueCount))
      : 1

    // 분석 방법 추천
    const recommendations = this.generateRecommendations(
      columnInfo,
      data.length,
      groupCount,
      studyDesign
    )

    return {
      structure,
      studyDesign,
      columns: columnInfo,
      sampleSize: data.length,
      groupCount,
      hasTimeComponent: columnInfo.some(c => c.type === 'datetime'),
      hasPairedData: studyDesign === 'paired',
      hasRepeatedMeasures: studyDesign === 'repeated',
      recommendations
    }
  }

  /**
   * 통계 분석 방법 추천
   */
  private static generateRecommendations(
    columns: ColumnTypeInfo[],
    sampleSize: number,
    groupCount: number,
    studyDesign: StudyDesign
  ): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = []

    const continuousVars = columns.filter(c => c.type === 'continuous')
    const categoricalVars = columns.filter(c => c.type === 'nominal' || c.type === 'binary')

    // 그룹 비교 분석
    if (categoricalVars.length > 0 && continuousVars.length > 0) {
      if (groupCount === 2) {
        if (studyDesign === 'paired') {
          recommendations.push({
            method: 'Paired t-test',
            confidence: 0.9,
            reasons: ['두 그룹 대응 표본', '연속형 종속변수'],
            requirements: ['정규성'],
            alternativeIf: [
              { condition: '정규성 위반', alternative: 'Wilcoxon signed-rank test' }
            ]
          })
        } else {
          recommendations.push({
            method: 'Independent t-test',
            confidence: sampleSize >= 30 ? 0.9 : 0.7,
            reasons: ['두 그룹 독립 표본', '연속형 종속변수'],
            requirements: ['정규성', '등분산성'],
            alternativeIf: [
              { condition: '정규성 위반', alternative: 'Mann-Whitney U test' },
              { condition: '등분산성 위반', alternative: "Welch's t-test" }
            ]
          })
        }
      } else if (groupCount > 2) {
        recommendations.push({
          method: 'One-way ANOVA',
          confidence: sampleSize >= 30 * groupCount ? 0.9 : 0.6,
          reasons: [`${groupCount}개 그룹 비교`, '연속형 종속변수'],
          requirements: ['정규성', '등분산성', '독립성'],
          alternativeIf: [
            { condition: '정규성 위반', alternative: 'Kruskal-Wallis test' },
            { condition: '소표본', alternative: 'Kruskal-Wallis test' }
          ]
        })
      }
    }

    // 상관 분석
    if (continuousVars.length >= 2) {
      recommendations.push({
        method: 'Pearson correlation',
        confidence: 0.8,
        reasons: ['연속형 변수 간 관계 분석'],
        requirements: ['정규성', '선형성'],
        alternativeIf: [
          { condition: '정규성 위반', alternative: 'Spearman correlation' },
          { condition: '비선형 관계', alternative: 'Spearman correlation' }
        ]
      })
    }

    // 회귀 분석
    if (continuousVars.length >= 2) {
      const predictors = continuousVars.length - 1
      const minSampleSize = 10 * predictors + 50

      recommendations.push({
        method: 'Linear regression',
        confidence: sampleSize >= minSampleSize ? 0.8 : 0.5,
        reasons: ['예측 모델 구축', `${predictors}개 예측변수`],
        requirements: ['선형성', '정규성(잔차)', '등분산성(잔차)', '독립성'],
        alternativeIf: [
          { condition: `표본 크기 부족 (n<${minSampleSize})`, alternative: '변수 축소 필요' },
          { condition: '다중공선성', alternative: 'Ridge/Lasso regression' }
        ]
      })
    }

    // 카이제곱 검정
    if (categoricalVars.length >= 2) {
      recommendations.push({
        method: 'Chi-square test',
        confidence: 0.8,
        reasons: ['범주형 변수 간 독립성 검정'],
        requirements: ['기대빈도 > 5'],
        alternativeIf: [
          { condition: '기대빈도 < 5', alternative: "Fisher's exact test" }
        ]
      })
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 컬럼의 역할 추론 (독립/종속/그룹 변수 등)
   */
  private static inferColumnRole(
    name: string,
    type: DataType,
    uniqueCount: number,
    totalRows: number
  ): 'id' | 'dependent' | 'independent' | 'group' | 'time' | undefined {
    const lowerName = name.toLowerCase()

    // ID 패턴
    if (lowerName.includes('id') || lowerName === 'index' || uniqueCount === totalRows) {
      return 'id'
    }

    // 시간 변수
    if (type === 'datetime' || lowerName.includes('date') || lowerName.includes('time')) {
      return 'time'
    }

    // 그룹 변수 (범주형이고 그룹을 나타내는 이름)
    if ((type === 'nominal' || type === 'binary') &&
        (lowerName.includes('group') || lowerName.includes('treatment') ||
         lowerName.includes('condition') || lowerName.includes('category'))) {
      return 'group'
    }

    // 종속변수 패턴
    if (lowerName.includes('outcome') || lowerName.includes('result') ||
        lowerName.includes('score') || lowerName.includes('response')) {
      return 'dependent'
    }

    // 나머지 연속형은 독립변수로 추정
    if (type === 'continuous') {
      return 'independent'
    }

    return undefined
  }

  /**
   * 날짜/시간 형식 체크
   */
  private static isDateTime(value: any): boolean {
    if (!value) return false

    // ISO 8601 형식 체크
    const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/
    if (isoRegex.test(String(value))) return true

    // Date 객체로 파싱 시도
    const parsed = new Date(value)
    return !isNaN(parsed.getTime())
  }

  /**
   * 순서가 있는 패턴 체크 (예: 1,2,3,4,5)
   */
  private static hasOrderedPattern(values: any[]): boolean {
    const numbers = values.map(v => Number(v)).filter(n => !isNaN(n))
    if (numbers.length !== values.length) return false

    numbers.sort((a, b) => a - b)
    for (let i = 1; i < numbers.length; i++) {
      if (numbers[i] - numbers[i-1] > 2) return false
    }

    return true
  }

  /**
   * 순서형 텍스트 체크 (예: Low, Medium, High)
   */
  private static isOrdinalText(values: string[]): boolean {
    const ordinalPatterns = [
      ['low', 'medium', 'high'],
      ['small', 'medium', 'large'],
      ['never', 'sometimes', 'often', 'always'],
      ['strongly disagree', 'disagree', 'neutral', 'agree', 'strongly agree'],
      ['매우 낮음', '낮음', '보통', '높음', '매우 높음']
    ]

    const lowerValues = values.map(v => String(v).toLowerCase())

    for (const pattern of ordinalPatterns) {
      if (pattern.every(p => lowerValues.some(v => v.includes(p)))) {
        return true
      }
    }

    return false
  }
}