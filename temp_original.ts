/**
 * 통계 계산 브릿지
 * 템플릿 컴포넌트와 Pyodide 서비스를 연결
 */

import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'
import { useAnalysisCacheStore } from '@/lib/stores/analysis-cache-store'

export interface CalculationResult {
  success: boolean
  data?: {
    metrics?: Array<{ name: string; value: number | string }>
    tables?: Array<{ name: string; data: any[] }>
    charts?: Array<{ type: string; data: any }>
    interpretation?: string
  }
  error?: string
}

export class StatisticalCalculator {
  private static pyodideService = PyodideStatisticsService.getInstance()
  private static initializationPromise: Promise<void> | null = null

  /**
   * UI에서 오는 메서드 ID를 계산기 내부의 정규화된 ID로 변환
   */
  private static toCanonicalMethodId(methodId: string): string {
    const map: Record<string, string> = {
      // ANOVA 사후검정 ID 정합성
      bonferroniPostHoc: 'bonferroni',
      gamesHowellPostHoc: 'gamesHowell',

      // 고급분석: UI id → 내부 스위치 id
      principalComponentAnalysis: 'pca'
    }
    return map[methodId] || methodId
  }

  /**
   * 통계 방법에 따라 적절한 계산 함수 호출
   */
  static async calculate(
    methodId: string,
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    try {
      // 캐시 확인
      const cacheStore = useAnalysisCacheStore.getState()
      const cached = await cacheStore.getCachedResult(methodId, data, parameters)
      if (cached && cached.result) {
        console.log(`[통계계산] 캐시에서 결과 반환: ${methodId}`)
        return { success: true, data: cached.result }
      }

      // Pyodide 초기화 확인 (중복 방지)
      if (!this.pyodideService.isInitialized()) {
        if (!this.initializationPromise) {
          this.initializationPromise = this.pyodideService.initialize()
        }
        await this.initializationPromise
      }

      // 메서드별 계산 실행
      const canonicalId = this.toCanonicalMethodId(methodId)
      let result: CalculationResult

      // 실제 계산 수행
      result = await this.executeCalculation(canonicalId, data, parameters)

      // 계산 성공 시 결과 캐싱
      if (result.success && result.data) {
        await cacheStore.setCachedResult(methodId, data, parameters, result.data)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '계산 중 오류 발생'
      }
    }
  }

  private static async executeCalculation(
    canonicalId: string,
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    switch (canonicalId) {
      // 기술통계
      case 'calculateDescriptiveStats':
        return await this.calculateDescriptiveStats(data, parameters)
      case 'normalityTest':
        return await this.normalityTest(data, parameters)
      case 'homogeneityTest':
        return await this.homogeneityTest(data, parameters)

        // t-검정
        case 'oneSampleTTest':
          return await this.oneSampleTTest(data, parameters)
        case 'twoSampleTTest':
          return await this.twoSampleTTest(data, parameters)
        case 'pairedTTest':
          return await this.pairedTTest(data, parameters)
        case 'welchTTest':
          return await this.welchTTest(data, parameters)
        case 'oneSampleProportionTest':
          return await this.oneSampleProportionTest(data, parameters)

        // 분산분석
        case 'oneWayANOVA':
          return await this.oneWayANOVA(data, parameters)
        case 'twoWayANOVA':
          return await this.twoWayANOVA(data, parameters)
        case 'manova':
          return await this.manovaCalc(data, parameters)
        case 'tukeyHSD':
          return await this.tukeyHSD(data, parameters)
        case 'bonferroni':
          return await this.bonferroni(data, parameters)
        case 'gamesHowell':
          return await this.gamesHowell(data, parameters)

        // 회귀분석
        case 'simpleLinearRegression':
          return await this.simpleLinearRegression(data, parameters)
        case 'multipleRegression':
          return await this.multipleRegression(data, parameters)
        case 'logisticRegression':
          return await this.logisticRegression(data, parameters)
        case 'correlationAnalysis':
          return await this.correlationAnalysis(data, parameters)

        // 비모수검정
        case 'mannWhitneyU':
          return await this.mannWhitneyU(data, parameters)
        case 'wilcoxonSignedRank':
          return await this.wilcoxonSignedRank(data, parameters)
        case 'kruskalWallis':
          return await this.kruskalWallis(data, parameters)
        case 'dunnTest':
          return await this.dunnTest(data, parameters)
        case 'chiSquareTest':
          return await this.chiSquareTest(data, parameters)

        // 고급분석
        case 'principalComponentAnalysis': // 후방 호환 (정규화되지 않았을 경우)
        case 'pca':
          return await this.principalComponentAnalysis(data, parameters)
        case 'kMeansClustering':
          return await this.kMeansClustering(data, parameters)
        case 'hierarchicalClustering':
          return await this.hierarchicalClustering(data, parameters)
        case 'timeSeriesDecomposition':
          return await this.timeSeriesDecompositionCalc(data, parameters)
        case 'arimaForecast':
          return await this.arimaForecastCalc(data, parameters)
        case 'kaplanMeierSurvival':
          return await this.kaplanMeierSurvivalCalc(data, parameters)
        case 'mixedEffectsModel':
          return await this.mixedEffectsModelCalc(data, parameters)
        case 'sarimaForecast':
          return await this.sarimaForecastCalc(data, parameters)
        case 'varModel':
          return await this.varModelCalc(data, parameters)
        case 'coxRegression':
          return await this.coxRegressionCalc(data, parameters)

        default:
          return {
            success: false,
            error: `통계 방법 ${canonicalId}는 아직 구현되지 않았습니다`
          }
    }
  }

  /**
   * 기술통계량 계산
   */
  private static async calculateDescriptiveStats(
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    const column = parameters.columns || parameters.column
    if (!column) {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    // 데이터 추출
    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
    if (values.length === 0) {
      return { success: false, error: '유효한 숫자 데이터가 없습니다' }
    }

    const result = await this.pyodideService.calculateDescriptiveStats(values)

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: result.n },
          { name: '평균', value: result.mean.toFixed(4) },
          { name: '중앙값', value: result.median.toFixed(4) },
          { name: '표준편차', value: result.std.toFixed(4) },
          { name: '최솟값', value: result.min.toFixed(4) },
          { name: '최댓값', value: result.max.toFixed(4) }
        ],
        tables: [{
          name: '기술통계량 상세',
          data: [
            { 통계량: '평균 (Mean)', 값: result.mean.toFixed(4) },
            { 통계량: '중앙값 (Median)', 값: result.median.toFixed(4) },
            { 통계량: '최빈값 (Mode)', 값: result.mode?.toFixed(4) || 'N/A' },
            { 통계량: '표준편차 (SD)', 값: result.std.toFixed(4) },
            { 통계량: '분산 (Variance)', 값: result.variance.toFixed(4) },
            { 통계량: '왜도 (Skewness)', 값: result.skewness.toFixed(4) },
            { 통계량: '첨도 (Kurtosis)', 값: result.kurtosis.toFixed(4) },
            { 통계량: '범위 (Range)', 값: (result.max - result.min).toFixed(4) },
            { 통계량: 'Q1 (25%)', 값: result.q1.toFixed(4) },
            { 통계량: 'Q3 (75%)', 값: result.q3.toFixed(4) },
            { 통계량: 'IQR', 값: result.iqr.toFixed(4) }
          ]
        }],
        interpretation: this.interpretDescriptiveStats(result)
      }
    }
  }

  /**
   * 정규성 검정
   */
  private static async normalityTest(
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    const column = parameters.column
    if (!column) {
      return { success: false, error: '검정할 열을 선택하세요' }
    }

    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
    if (values.length < 3) {
      return { success: false, error: '최소 3개 이상의 데이터가 필요합니다' }
    }

    const alpha = parameters.alpha || 0.05
    const result = await this.pyodideService.testNormality(values, alpha)

    return {
      success: true,
      data: {
        metrics: [
          { name: 'Shapiro-Wilk 통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '유의수준', value: alpha }
        ],
        tables: [{
          name: '정규성 검정 결과',
          data: [
            { 항목: '검정 방법', 값: 'Shapiro-Wilk Test' },
            { 항목: '표본 크기', 값: values.length },
            { 항목: '검정통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '유의수준 (α)', 값: alpha },
            { 항목: '정규성 여부', 값: result.isNormal ? '정규분포를 따름' : '정규분포를 따르지 않음' }
          ]
        }],
        interpretation: `p-value (${result.pValue.toFixed(4)})가 유의수준 (${alpha})${
          result.isNormal ? '보다 크므로' : '보다 작으므로'
        } 데이터가 정규분포를 ${result.isNormal ? '따른다고' : '따르지 않는다고'} 볼 수 있습니다.`
      }
    }
  }

  /**
   * 일표본 t-검정
   */
  private static async oneSampleTTest(
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    const column = parameters.column
    const popmean = parameters.popmean

    if (!column || popmean === undefined) {
      return { success: false, error: '필수 파라미터를 입력하세요' }
    }

    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
    if (values.length < 2) {
      return { success: false, error: '최소 2개 이상의 데이터가 필요합니다' }
    }

    const alternative = parameters.alternative || 'two-sided'
    const confidence = parameters.confidence || 0.95
    const alpha = 1 - confidence

    const result = await this.pyodideService.oneSampleTTest(values, popmean, alternative)

    // 효과 크기 (Cohen's d) 계산
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1))
    const cohensD = (mean - popmean) / std

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: 'Cohen\'s d', value: cohensD.toFixed(4) }
        ],
        tables: [{
          name: '일표본 t-검정 결과',
          data: [
            { 항목: '표본 평균', 값: mean.toFixed(4) },
            { 항목: '모집단 평균', 값: popmean },
            { 항목: '표본 표준편차', 값: std.toFixed(4) },
            { 항목: '표본 크기', 값: values.length },
            { 항목: '자유도', 값: result.df },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
            { 항목: 'Cohen\'s d', 값: cohensD.toFixed(4) },
            { 항목: '대립가설', 값: alternative }
          ]
        }],
        interpretation: this.interpretTTest(result.pValue, alpha, alternative, mean, popmean)
      }
    }
  }

  /**
   * 독립표본 t-검정
   */
  private static async twoSampleTTest(
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    const valueColumn = parameters.value_column
    const groupColumn = parameters.group_column

    if (!valueColumn || !groupColumn) {
      return { success: false, error: '값 열과 그룹 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length !== 2) {
      return { success: false, error: '정확히 2개의 그룹이 필요합니다' }
    }

    const group1 = groups[groupNames[0]]
    const group2 = groups[groupNames[1]]
    const equalVar = parameters.equal_var ?? true

    const result = await this.pyodideService.twoSampleTTest(group1, group2, equalVar)

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: 'Cohen\'s d', value: result.cohensD.toFixed(4) }
        ],
        tables: [{
          name: '그룹별 통계',
          data: [
            { 그룹: groupNames[0], 표본수: group1.length, 평균: result.mean1.toFixed(4), 표준편차: result.std1.toFixed(4) },
            { 그룹: groupNames[1], 표본수: group2.length, 평균: result.mean2.toFixed(4), 표준편차: result.std2.toFixed(4) }
          ]
        }, {
          name: '검정 결과',
          data: [
            { 항목: '평균 차이', 값: (result.mean1 - result.mean2).toFixed(4) },
            { 항목: '자유도', 값: result.df.toFixed(2) },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
            { 항목: 'Cohen\'s d', 값: result.cohensD.toFixed(4) },
            { 항목: '등분산 가정', 값: equalVar ? '가정함' : '가정하지 않음 (Welch)' }
          ]
        }],
        interpretation: `p-value (${result.pValue.toFixed(4)})가 0.05${
          result.pValue < 0.05 ? '보다 작으므로' : '보다 크므로'
        } 두 그룹 간 평균의 차이가 통계적으로 ${
          result.pValue < 0.05 ? '유의합니다' : '유의하지 않습니다'
        }. Cohen's d = ${result.cohensD.toFixed(4)}는 ${
          Math.abs(result.cohensD) < 0.2 ? '매우 작은' :
          Math.abs(result.cohensD) < 0.5 ? '작은' :
          Math.abs(result.cohensD) < 0.8 ? '중간' : '큰'
        } 효과 크기를 나타냅니다.`
      }
    }
  }

  /**
   * 상관분석
   */
  private static async correlationAnalysis(
    data: any[],
    parameters: Record<string, any>
  ): Promise<CalculationResult> {
    const columns = parameters.columns
    if (!columns || columns.length < 2) {
      return { success: false, error: '최소 2개 이상의 변수를 선택하세요' }
    }

    // 각 열의 데이터 추출
    const columnsData = {}
    columns.forEach(col => {
      columnsData[col] = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v))
    })

    const method = parameters.method || 'pearson'
    const result = await this.pyodideService.calculateCorrelation(columnsData, method)

    // 상관계수 행렬을 테이블 형식으로 변환
    const correlationTable = []
    columns.forEach((col1, i) => {
      const row = { 변수: col1 }
      columns.forEach((col2, j) => {
        row[col2] = result.matrix[i][j].toFixed(4)
      })
      correlationTable.push(row)
    })

    return {
      success: true,
      data: {
        tables: [{
          name: `${method === 'pearson' ? 'Pearson' : method === 'spearman' ? 'Spearman' : 'Kendall'} 상관계수`,
          data: correlationTable
        }],
        interpretation: this.interpretCorrelation(result.matrix, columns)
      }
    }
  }

  /**
   * 등분산 검정 (Levene's test)
   */
  private static async homogeneityTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const method = parameters.method || 'levene'
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])
    const result = await this.pyodideService.testHomogeneity(groupArrays, method)

    // 그룹별 분산 계산
    const groupStats = groupNames.map(name => {
      const values = groups[name]
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1)
      return {
        그룹: name,
        표본수: values.length,
        평균: mean.toFixed(4),
        분산: variance.toFixed(4)
      }
    })

    return {
      success: true,
      data: {
        metrics: [
          { name: 'Levene 통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '유의수준', value: alpha }
        ],
        tables: [{
          name: '그룹별 통계',
          data: groupStats
        }, {
          name: '등분산 검정 결과',
          data: [
            { 항목: '검정 방법', 값: method === 'levene' ? "Levene's Test" : method === 'bartlett' ? "Bartlett's Test" : "Fligner-Killeen Test" },
            { 항목: '검정통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '유의수준 (α)', 값: alpha },
            { 항목: '등분산 여부', 값: result.pValue > alpha ? '등분산 가정 만족' : '등분산 가정 위반' }
          ]
        }],
        interpretation: `p-value (${result.pValue.toFixed(4)})가 유의수준 (${alpha})${result.pValue > alpha ? '보다 크므로' : '보다 작으므로'} 그룹 간 분산이 ${result.pValue > alpha ? '동일하다고 볼 수 있습니다 (등분산 가정 만족)' : '동일하지 않습니다 (이분산성 존재)'}.`
      }
    }
  }

  /**
   * 대응표본 t-검정
   */
  private static async pairedTTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column1 = parameters.column1
    const column2 = parameters.column2
    const alternative = parameters.alternative || 'two-sided'
    const alpha = parameters.alpha || 0.05

    if (!column1 || !column2) {
      return { success: false, error: '사전과 사후 측정 열을 모두 선택하세요' }
    }

    // 대응되는 데이터 쌍 추출
    const pairs = []
    data.forEach(row => {
      const val1 = parseFloat(row[column1])
      const val2 = parseFloat(row[column2])
      if (!isNaN(val1) && !isNaN(val2)) {
        pairs.push([val1, val2])
      }
    })

    if (pairs.length < 2) {
      return { success: false, error: '최소 2쌍 이상의 대응 데이터가 필요합니다' }
    }

    const values1 = pairs.map(p => p[0])
    const values2 = pairs.map(p => p[1])
    const differences = pairs.map(p => p[1] - p[0])

    const result = await this.pyodideService.pairedTTest(values1, values2, alternative)

    // 차이의 기술통계
    const meanDiff = differences.reduce((a, b) => a + b, 0) / differences.length
    const stdDiff = Math.sqrt(differences.reduce((a, b) => a + Math.pow(b - meanDiff, 2), 0) / (differences.length - 1))
    const cohensD = meanDiff / stdDiff

    return {
      success: true,
      data: {
        metrics: [
          { name: 't-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: 'Cohen\'s d', value: cohensD.toFixed(4) }
        ],
        tables: [{
          name: '대응 표본 통계',
          data: [
            { 측정: column1 + ' (사전)', 평균: result.mean1.toFixed(4), 표준편차: result.std1.toFixed(4) },
            { 측정: column2 + ' (사후)', 평균: result.mean2.toFixed(4), 표준편차: result.std2.toFixed(4) },
            { 측정: '차이 (사후-사전)', 평균: meanDiff.toFixed(4), 표준편차: stdDiff.toFixed(4) }
          ]
        }, {
          name: '검정 결과',
          data: [
            { 항목: '표본 쌍 수', 값: pairs.length },
            { 항목: '평균 차이', 값: meanDiff.toFixed(4) },
            { 항목: '자유도', 값: result.df },
            { 항목: 't-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '신뢰구간', 값: `[${result.ci_lower.toFixed(4)}, ${result.ci_upper.toFixed(4)}]` },
            { 항목: 'Cohen\'s d', 값: cohensD.toFixed(4) },
            { 항목: '대립가설', 값: alternative }
          ]
        }],
        interpretation: this.interpretPairedTTest(result.pValue, alpha, meanDiff, cohensD)
      }
    }
  }

  private static async welchTTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    // 독립표본 t-검정과 동일하지만 equal_var=false로 설정
    return this.twoSampleTTest(data, { ...parameters, equal_var: false })
  }

  /**
   * 일표본 비율검정
   */
  private static async oneSampleProportionTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column = parameters.column
    const targetProportion = parameters.targetProportion || 0.5
    const alternative = parameters.alternative || 'two-sided'
    const alpha = parameters.alpha || 0.05

    if (!column) {
      return { success: false, error: '검정할 열을 선택하세요' }
    }

    // 이진 데이터 추출 (1/0, true/false, '성공'/'실패' 등)
    const values = data.map(row => {
      const val = row[column]
      if (typeof val === 'boolean') return val ? 1 : 0
      if (val === 1 || val === 0) return val
      // 대소문자 구분 없이 처리
      const strVal = String(val).toLowerCase().trim()
      if (strVal === '1' || strVal === 'true' || strVal === '성공' || strVal === 'yes' || strVal === 'success') return 1
      if (strVal === '0' || strVal === 'false' || strVal === '실패' || strVal === 'no' || strVal === 'fail' || strVal === 'failure') return 0
      return null
    }).filter(v => v !== null)

    if (values.length < 30) {
      return { success: false, error: '비율검정은 최소 30개 이상의 데이터가 필요합니다' }
    }

    const successes = values.filter(v => v === 1).length
    const n = values.length
    const observedProportion = successes / n

    // 정규 근사 조건 확인
    if (n * targetProportion < 5 || n * (1 - targetProportion) < 5) {
      return { success: false, error: '표본 크기가 정규 근사 조건을 만족하지 않습니다 (np≥5, n(1-p)≥5)' }
    }

    // Z 통계량 계산
    const se = Math.sqrt(targetProportion * (1 - targetProportion) / n)
    const zStatistic = (observedProportion - targetProportion) / se

    // p-value 계산 (표준정규분포 사용)
    // 간단한 근사값 사용 (실제로는 pyodide에서 계산)
    const result = await this.pyodideService.oneSampleProportionTest(
      successes, n, targetProportion, alternative
    )

    // 신뢰구간
    const zCritical = 1.96 // 95% 신뢰구간
    const ciSE = Math.sqrt(observedProportion * (1 - observedProportion) / n)
    const lowerCI = observedProportion - zCritical * ciSE
    const upperCI = observedProportion + zCritical * ciSE

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: n },
          { name: '성공 개수', value: successes },
          { name: '관측 비율', value: observedProportion.toFixed(4) },
          { name: '기준 비율', value: targetProportion.toFixed(4) }
        ],
        tables: [{
          name: '비율검정 결과',
          data: [
            { 항목: '검정 방법', 값: 'One-sample Proportion Test (Z-test)' },
            { 항목: 'Z 통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '95% 신뢰구간', 값: `[${lowerCI.toFixed(4)}, ${upperCI.toFixed(4)}]` },
            { 항목: '대립가설', 값: alternative },
            { 항목: '유의수준 (α)', 값: alpha },
            { 항목: '결과', 값: result.pValue < alpha ?
              '기준 비율과 유의한 차이 있음' : '기준 비율과 유의한 차이 없음' }
          ]
        }],
        interpretation: `일표본 비율검정: 관측비율=${observedProportion.toFixed(4)}, 기준비율=${targetProportion}, ` +
          `Z=${result.statistic.toFixed(2)}, p=${result.pValue.toFixed(4)}`
      }
    }
  }

  /**
   * 일원분산분석 (One-way ANOVA)
   */
  private static async oneWayANOVA(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const postHoc = parameters.postHoc || 'none'
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])
    const result = await this.pyodideService.oneWayANOVA(groupArrays)

    // 그룹별 기술통계
    const groupStats = groupNames.map(name => {
      const values = groups[name]
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1))
      return {
        그룹: name,
        표본수: values.length,
        평균: mean.toFixed(4),
        표준편차: std.toFixed(4),
        표준오차: (std / Math.sqrt(values.length)).toFixed(4)
      }
    })

    // 효과크기 계산 (eta-squared)
    const etaSquared = result.ssb / (result.ssb + result.ssw)

    const tables = [
      {
        name: '그룹별 기술통계',
        data: groupStats
      },
      {
        name: 'ANOVA 분산분석표',
        data: [
          { 변동요인: '처리 (Between)', 제곱합: result.ssb.toFixed(4), 자유도: result.dfb, 평균제곱: result.msb.toFixed(4), F통계량: result.statistic.toFixed(4), 'p-value': result.pValue.toFixed(4) },
          { 변동요인: '오차 (Within)', 제곱합: result.ssw.toFixed(4), 자유도: result.dfw, 평균제곱: result.msw.toFixed(4), F통계량: '', 'p-value': '' },
          { 변동요인: '전체 (Total)', 제곱합: (result.ssb + result.ssw).toFixed(4), 자유도: result.dfb + result.dfw, 평균제곱: '', F통계량: '', 'p-value': '' }
        ]
      },
      {
        name: '효과크기',
        data: [
          { 측정치: 'Eta-squared (η²)', 값: etaSquared.toFixed(4), 해석: etaSquared < 0.01 ? '매우 작은 효과' : etaSquared < 0.06 ? '작은 효과' : etaSquared < 0.14 ? '중간 효과' : '큰 효과' }
        ]
      }
    ]

    // 사후검정 추가 (실제 구현 필요)
    if (postHoc !== 'none' && result.pValue < alpha) {
      tables.push({
        name: `사후검정 (${postHoc})`,
        data: [{ 메시지: '사후검정은 추가 구현이 필요합니다' }]
      })
    }

    return {
      success: true,
      data: {
        metrics: [
          { name: 'F-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: 'Eta-squared', value: etaSquared.toFixed(4) }
        ],
        tables,
        interpretation: `F(${result.dfb}, ${result.dfw}) = ${result.statistic.toFixed(4)}, p = ${result.pValue.toFixed(4)}. ${
          result.pValue < alpha ?
          `p-value가 유의수준 ${alpha}보다 작으므로 그룹 간 평균에 통계적으로 유의한 차이가 있습니다. 효과크기(η² = ${etaSquared.toFixed(4)})는 ${etaSquared < 0.06 ? '작은' : etaSquared < 0.14 ? '중간' : '큰'} 효과를 나타냅니다.` :
          `p-value가 유의수준 ${alpha}보다 크므로 그룹 간 평균에 통계적으로 유의한 차이가 없습니다.`
        }`
      }
    }
  }

  /**
   * 단순선형회귀
   */
  private static async simpleLinearRegression(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const independentColumn = parameters.independentColumn
    const dependentColumn = parameters.dependentColumn
    const alpha = parameters.alpha || 0.05
    const predictValues = parameters.predictValues

    if (!independentColumn || !dependentColumn) {
      return { success: false, error: '독립변수와 종속변수를 선택하세요' }
    }

    // 데이터 추출 (결측값 제거)
    const validData = []
    data.forEach(row => {
      const x = parseFloat(row[independentColumn])
      const y = parseFloat(row[dependentColumn])
      if (!isNaN(x) && !isNaN(y)) {
        validData.push({ x, y })
      }
    })

    if (validData.length < 3) {
      return { success: false, error: '최소 3개 이상의 유효한 데이터가 필요합니다' }
    }

    const xValues = validData.map(d => d.x)
    const yValues = validData.map(d => d.y)

    const result = await this.pyodideService.simpleLinearRegression(xValues, yValues)

    // 예측값 계산
    let predictions = []
    if (predictValues) {
      const predX = predictValues.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
      predictions = predX.map(x => ({
        X: x,
        '예측값': (result.slope * x + result.intercept).toFixed(4)
      }))
    }

    const tables = [
      {
        name: '회귀계수',
        data: [
          { 계수: '절편 (Intercept)', 값: result.intercept.toFixed(4) },
          { 계수: `기울기 (${independentColumn})`, 값: result.slope.toFixed(4) }
        ]
      },
      {
        name: '모형 적합도',
        data: [
          { 측정치: '결정계수 (R²)', 값: result.rSquared.toFixed(4) },
          { 측정치: 'F-통계량', 값: (result.fStatistic ?? 0).toFixed(4) },
          { 측정치: 'F-검정 p-value', 값: (result.pvalue ?? result.fPvalue ?? 0).toFixed(4) }
        ]
      }
    ]

    if (predictions.length > 0) {
      tables.push({
        name: '예측값',
        data: predictions
      })
    }

    return {
      success: true,
      data: {
        metrics: [
          { name: '결정계수 (R²)', value: result.rSquared.toFixed(4) },
          { name: 'F-통계량', value: (result.fStatistic ?? 0).toFixed(4) },
          { name: 'p-value', value: (result.pvalue ?? result.fPvalue ?? 0).toFixed(4) }
        ],
        tables,
        charts: [{
          type: 'scatter',
          data: {
            x: xValues,
            y: yValues,
            regression: {
              slope: result.slope,
              intercept: result.intercept
            }
          }
        }],
        interpretation: `회귀식: Y = ${result.slope.toFixed(4)} * X + ${result.intercept.toFixed(4)}\n` +
                       `R² = ${result.rSquared.toFixed(4)}는 독립변수가 종속변수 변동의 ${(result.rSquared * 100).toFixed(1)}%를 설명합니다. ` +
                       `${(result.pvalue ?? result.fPvalue ?? 1) < alpha ? `모형은 통계적으로 유의합니다 (p < ${alpha}).` : `모형은 통계적으로 유의하지 않습니다 (p > ${alpha}).`}`
      }
    }
  }

  /**
   * Mann-Whitney U 검정 (비모수 독립표본 검정)
   */
  private static async mannWhitneyU(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column1 = parameters.column1
    const column2 = parameters.column2
    const alternative = parameters.alternative || 'two-sided'
    const continuityCorrection = parameters.continuityCorrection ?? true
    const alpha = parameters.alpha || 0.05

    if (!column1 || !column2) {
      return { success: false, error: '두 그룹의 변수를 선택하세요' }
    }

    // 두 그룹 데이터 추출
    const group1 = data.map(row => parseFloat(row[column1])).filter(v => !isNaN(v))
    const group2 = data.map(row => parseFloat(row[column2])).filter(v => !isNaN(v))

    if (group1.length < 2 || group2.length < 2) {
      return { success: false, error: '각 그룹에 최소 2개 이상의 데이터가 필요합니다' }
    }

    const result = await this.pyodideService.mannWhitneyU(group1, group2, alternative, continuityCorrection)

    // 중앙값과 사분위수 계산
    const getQuartiles = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b)
      const q1 = sorted[Math.floor(sorted.length * 0.25)]
      const median = sorted[Math.floor(sorted.length * 0.5)]
      const q3 = sorted[Math.floor(sorted.length * 0.75)]
      return { q1, median, q3 }
    }

    const q1 = getQuartiles(group1)
    const q2 = getQuartiles(group2)

    return {
      success: true,
      data: {
        metrics: [
          { name: 'U-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '효과크기 (r)', value: result.effectSize.toFixed(4) }
        ],
        tables: [{
          name: '그룹별 통계',
          data: [
            { 그룹: column1, 표본수: group1.length, 중앙값: q1.median.toFixed(4), Q1: q1.q1.toFixed(4), Q3: q1.q3.toFixed(4), '평균순위': result.meanRank1.toFixed(2) },
            { 그룹: column2, 표본수: group2.length, 중앙값: q2.median.toFixed(4), Q1: q2.q1.toFixed(4), Q3: q2.q3.toFixed(4), '평균순위': result.meanRank2.toFixed(2) }
          ]
        }, {
          name: '검정 결과',
          data: [
            { 항목: 'U-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'z-통계량', 값: result.zStatistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '효과크기 (r)', 값: result.effectSize.toFixed(4) },
            { 항목: '연속성 보정', 값: continuityCorrection ? '적용' : '미적용' },
            { 항목: '대립가설', 값: alternative }
          ]
        }],
        interpretation: `Mann-Whitney U = ${result.statistic.toFixed(4)}, p = ${result.pValue.toFixed(4)}. ${
          result.pValue < alpha ?
          `p-value가 유의수준 ${alpha}보다 작으므로 두 그룹 간 중앙값에 통계적으로 유의한 차이가 있습니다. 효과크기 r = ${result.effectSize.toFixed(4)}는 ${
            Math.abs(result.effectSize) < 0.1 ? '매우 작은' :
            Math.abs(result.effectSize) < 0.3 ? '작은' :
            Math.abs(result.effectSize) < 0.5 ? '중간' : '큰'
          } 효과를 나타냅니다.` :
          `p-value가 유의수준 ${alpha}보다 크므로 두 그룹 간 중앙값에 통계적으로 유의한 차이가 없습니다.`
        }`
      }
    }
  }

  /**
   * Wilcoxon 부호순위 검정 (비모수 대응표본)
   */
  private static async wilcoxonSignedRank(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column1 = parameters.column1
    const column2 = parameters.column2
    const alternative = parameters.alternative || 'two-sided'
    const zeroMethod = parameters.zeroMethod || 'pratt'
    const alpha = parameters.alpha || 0.05

    if (!column1 || !column2) {
      return { success: false, error: '사전과 사후 측정 열을 선택하세요' }
    }

    // 대응 데이터 추출
    const pairs = []
    data.forEach(row => {
      const val1 = parseFloat(row[column1])
      const val2 = parseFloat(row[column2])
      if (!isNaN(val1) && !isNaN(val2)) {
        pairs.push([val1, val2])
      }
    })

    if (pairs.length < 2) {
      return { success: false, error: '최소 2쌍 이상의 대응 데이터가 필요합니다' }
    }

    const values1 = pairs.map(p => p[0])
    const values2 = pairs.map(p => p[1])

    const result = await this.pyodideService.wilcoxon(values1, values2, { alternative, zero_method: zeroMethod })

    // 차이의 중앙값 및 사분위수 계산
    const differences = pairs.map(p => p[1] - p[0])
    const sortedDiff = [...differences].sort((a, b) => a - b)
    const medianDiff = sortedDiff[Math.floor(sortedDiff.length / 2)]
    const q1Diff = sortedDiff[Math.floor(sortedDiff.length * 0.25)]
    const q3Diff = sortedDiff[Math.floor(sortedDiff.length * 0.75)]

    return {
      success: true,
      data: {
        metrics: [
          { name: 'W-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '효과크기 (r)', value: result.effectSize?.toFixed(4) || 'N/A' }
        ],
        tables: [{
          name: '대응 데이터 요약',
          data: [
            { 항목: '대응 쌍 수', 값: pairs.length },
            { 항목: '차이 중앙값', 값: medianDiff.toFixed(4) },
            { 항목: '차이 Q1', 값: q1Diff.toFixed(4) },
            { 항목: '차이 Q3', 값: q3Diff.toFixed(4) },
            { 항목: 'W-통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '영값 처리', 값: zeroMethod },
            { 항목: '대립가설', 값: alternative }
          ]
        }],
        interpretation: `Wilcoxon W = ${result.statistic.toFixed(4)}, p = ${result.pValue.toFixed(4)}. ${
          result.pValue < alpha ?
          `p-value가 유의수준 ${alpha}보다 작으므로 대응 표본 간 중앙값에 통계적으로 유의한 차이가 있습니다.` :
          `p-value가 유의수준 ${alpha}보다 크므로 대응 표본 간 중앙값에 통계적으로 유의한 차이가 없습니다.`
        }`
      }
    }
  }

  /**
   * Kruskal-Wallis 검정 (비모수 일원분산분석)
   */
  private static async kruskalWallis(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const postHoc = parameters.postHoc || 'none'
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])
    const result = await this.pyodideService.kruskalWallis(groupArrays)

    // 그룹별 중앙값과 순위 요약
    const groupStats = groupNames.map((name, i) => {
      const values = groups[name]
      const sorted = [...values].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      return {
        그룹: name,
        표본수: values.length,
        중앙값: median.toFixed(4),
        '평균순위': result.mean_ranks?.[i]?.toFixed(2) || 'N/A'
      }
    })

    const tables = [
      {
        name: '그룹별 통계',
        data: groupStats
      },
      {
        name: 'Kruskal-Wallis 검정 결과',
        data: [
          { 항목: 'H-통계량', 값: result.statistic.toFixed(4) },
          { 항목: '자유도', 값: result.df },
          { 항목: 'p-value', 값: result.pValue.toFixed(4) },
          { 항목: '유의수준 (α)', 값: alpha },
          { 항목: '결과', 값: result.pValue < alpha ? '그룹 간 차이 있음' : '그룹 간 차이 없음' }
        ]
      }
    ]

    // 사후검정 처리 (간략화)
    if (postHoc !== 'none' && result.pValue < alpha) {
      tables.push({
        name: `사후검정 (${postHoc})`,
        data: [{ 메시지: '사후검정 결과는 Dunn Test 메서드를 사용하세요' }]
      })
    }

    return {
      success: true,
      data: {
        metrics: [
          { name: 'H-통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '자유도', value: result.df }
        ],
        tables,
        interpretation: `H(${result.df}) = ${result.statistic.toFixed(4)}, p = ${result.pValue.toFixed(4)}. ${
          result.pValue < alpha ?
          `p-value가 유의수준 ${alpha}보다 작으므로 그룹 간 중앙값에 통계적으로 유의한 차이가 있습니다.` :
          `p-value가 유의수준 ${alpha}보다 크므로 그룹 간 중앙값에 통계적으로 유의한 차이가 없습니다.`
        }`
      }
    }
  }

  /**
   * 카이제곱 독립성 검정
   */
  private static async chiSquareTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const rowColumn = parameters.rowColumn
    const columnColumn = parameters.columnColumn
    const correction = parameters.correction ?? false
    const alpha = parameters.alpha || 0.05

    if (!rowColumn || !columnColumn) {
      return { success: false, error: '행 변수와 열 변수를 선택하세요' }
    }

    // 교차표 생성
    const crosstab = {}
    data.forEach(row => {
      const rowVal = row[rowColumn]
      const colVal = row[columnColumn]
      if (rowVal && colVal) {
        if (!crosstab[rowVal]) crosstab[rowVal] = {}
        if (!crosstab[rowVal][colVal]) crosstab[rowVal][colVal] = 0
        crosstab[rowVal][colVal]++
      }
    })

    const rowLabels = Object.keys(crosstab)
    const colLabels = [...new Set(Object.values(crosstab).flatMap(r => Object.keys(r)))]

    if (rowLabels.length < 2 || colLabels.length < 2) {
      return { success: false, error: '각 변수는 최소 2개 이상의 범주를 가져야 합니다' }
    }

    // 관찰 빈도 행렬 생성
    const observedMatrix = rowLabels.map(r =>
      colLabels.map(c => crosstab[r][c] || 0)
    )

    const result = await this.pyodideService.chiSquareTest(observedMatrix, correction)

    // 교차표 데이터 생성
    const crosstabData = rowLabels.map((rowLabel, i) => {
      const row = { [rowColumn]: rowLabel }
      colLabels.forEach((colLabel, j) => {
        row[colLabel] = observedMatrix[i][j]
      })
      row['행 합계'] = observedMatrix[i].reduce((a, b) => a + b, 0)
      return row
    })

    // 열 합계 추가
    const totalRow = { [rowColumn]: '열 합계' }
    colLabels.forEach((colLabel, j) => {
      totalRow[colLabel] = observedMatrix.reduce((sum, row) => sum + row[j], 0)
    })
    totalRow['행 합계'] = observedMatrix.flat().reduce((a, b) => a + b, 0)
    crosstabData.push(totalRow)

    // 효과크기 계산 (Cramér's V)
    const n = observedMatrix.flat().reduce((a, b) => a + b, 0)
    const minDim = Math.min(rowLabels.length - 1, colLabels.length - 1)
    const cramersV = Math.sqrt(result.statistic / (n * minDim))

    return {
      success: true,
      data: {
        metrics: [
          { name: 'χ² 통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: (result.pValue ?? result.pvalue).toFixed(4) },
          { name: "Cramér's V", value: cramersV.toFixed(4) }
        ],
        tables: [{
          name: '교차표 (관찰 빈도)',
          data: crosstabData
        }, {
          name: '검정 결과',
          data: [
            { 항목: '카이제곱 통계량', 값: result.statistic.toFixed(4) },
            { 항목: '자유도', 값: result.df },
            { 항목: 'p-value', 값: (result.pValue ?? result.pvalue).toFixed(4) },
            { 항목: "Cramér's V", 값: cramersV.toFixed(4) },
            { 항목: 'Yates 보정', 값: correction ? '적용' : '미적용' },
            { 항목: '독립성', 값: (result.pValue ?? result.pvalue) > alpha ? '독립적' : '연관성 있음' }
          ]
        }],
        interpretation: `χ²(${result.df}) = ${result.statistic.toFixed(4)}, p = ${(result.pValue ?? result.pvalue).toFixed(4)}. ${
          (result.pValue ?? result.pvalue) < alpha ?
          `p-value가 유의수준 ${alpha}보다 작으므로 ${rowColumn}과 ${columnColumn} 간에 통계적으로 유의한 연관성이 있습니다. Cramér's V = ${cramersV.toFixed(4)}는 ${
            cramersV < 0.1 ? '매우 약한' :
            cramersV < 0.3 ? '약한' :
            cramersV < 0.5 ? '중간' : '강한'
          } 연관성을 나타냅니다.` :
          `p-value가 유의수준 ${alpha}보다 크므로 ${rowColumn}과 ${columnColumn}은 통계적으로 독립적입니다.`
        }`
      }
    }
  }

  // 해석 헬퍼 함수들
  private static interpretDescriptiveStats(result: any): string {
    const skewInterpret = Math.abs(result.skewness) < 0.5 ? '대칭적' :
                          result.skewness < -0.5 ? '왼쪽으로 치우친' : '오른쪽으로 치우친'
    const kurtosisInterpret = Math.abs(result.kurtosis - 3) < 0.5 ? '정규분포와 유사한' :
                              result.kurtosis > 3.5 ? '뾰족한' : '평평한'

    return `데이터는 평균 ${result.mean.toFixed(2)}, 중앙값 ${result.median.toFixed(2)}의 중심 경향성을 보입니다. ` +
           `분포는 ${skewInterpret} 형태이며, ${kurtosisInterpret} 첨도를 가집니다. ` +
           `표준편차는 ${result.std.toFixed(2)}로 데이터의 산포도를 나타냅니다.`
  }

  private static interpretTTest(pValue: number, alpha: number, alternative: string, mean: number, popmean: number): string {
    const significant = pValue < alpha
    const direction = mean > popmean ? '크다' : '작다'

    let interpretation = `p-value (${pValue.toFixed(4)})가 유의수준 (${alpha})${
      significant ? '보다 작으므로' : '보다 크므로'
    } `

    if (significant) {
      if (alternative === 'two-sided') {
        interpretation += `표본 평균이 모집단 평균과 통계적으로 유의한 차이가 있습니다.`
      } else {
        interpretation += `표본 평균이 모집단 평균보다 통계적으로 유의하게 ${direction}고 할 수 있습니다.`
      }
    } else {
      interpretation += `표본 평균과 모집단 평균 간에 통계적으로 유의한 차이가 없습니다.`
    }

    return interpretation
  }

  private static interpretCorrelation(matrix: number[][], columns: string[]): string {
    const significantCorr = []

    for (let i = 0; i < columns.length; i++) {
      for (let j = i + 1; j < columns.length; j++) {
        const corr = matrix[i][j]
        if (Math.abs(corr) > 0.3) {
          const strength = Math.abs(corr) < 0.5 ? '약한' :
                          Math.abs(corr) < 0.7 ? '중간' : '강한'
          const direction = corr > 0 ? '양' : '음'
          significantCorr.push(`${columns[i]}와 ${columns[j]} 간 ${strength} ${direction}의 상관관계 (r=${corr.toFixed(3)})`)
        }
      }
    }

    if (significantCorr.length === 0) {
      return '변수들 간에 의미있는 상관관계가 발견되지 않았습니다 (|r| < 0.3).'
    }

    return '다음과 같은 상관관계가 발견되었습니다:\n' + significantCorr.join('\n')
  }

  private static interpretPairedTTest(pValue: number, alpha: number, meanDiff: number, cohensD: number): string {
    const significant = pValue < alpha
    const direction = meanDiff > 0 ? '증가' : '감소'

    let interpretation = `대응 표본 간 평균 차이는 ${meanDiff.toFixed(4)}입니다. `
    interpretation += `p-value (${pValue.toFixed(4)})가 유의수준 (${alpha})${
      significant ? '보다 작으므로' : '보다 크므로'
    } `

    if (significant) {
      interpretation += `처치 후 통계적으로 유의한 ${direction}가 있었습니다. `
      interpretation += `Cohen's d = ${cohensD.toFixed(4)}는 ${
        Math.abs(cohensD) < 0.2 ? '매우 작은' :
        Math.abs(cohensD) < 0.5 ? '작은' :
        Math.abs(cohensD) < 0.8 ? '중간' : '큰'
      } 효과 크기를 나타냅니다.`
    } else {
      interpretation += `처치 전후 간에 통계적으로 유의한 차이가 없습니다.`
    }

    return interpretation
  }

  /**
   * 이원분산분석
   */
  private static async twoWayANOVA(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const factor1Column = parameters.factor1Column
    const factor2Column = parameters.factor2Column
    const valueColumn = parameters.valueColumn
    const interaction = parameters.interaction ?? true
    const alpha = parameters.alpha || 0.05

    if (!factor1Column || !factor2Column || !valueColumn) {
      return { success: false, error: '두 요인과 종속변수를 선택하세요' }
    }

    // 데이터 정리
    const validData = []
    data.forEach(row => {
      const val = parseFloat(row[valueColumn])
      if (!isNaN(val)) {
        validData.push({
          factor1: row[factor1Column],
          factor2: row[factor2Column],
          value: val
        })
      }
    })

    if (validData.length < 4) {
      return { success: false, error: '최소 4개 이상의 데이터가 필요합니다' }
    }

    try {
      // Pyodide로 이원분산분석 수행
      const result = await this.pyodideService.twoWayANOVA(validData, interaction)

      return {
        success: true,
        data: {
          metrics: [
            { name: '요인 1 F-통계량', value: result.factor1_f?.toFixed(4) || 'N/A' },
            { name: '요인 2 F-통계량', value: result.factor2_f?.toFixed(4) || 'N/A' },
            { name: '상호작용 F-통계량', value: result.interaction_f?.toFixed(4) || 'N/A' }
          ],
          tables: [{
            name: '이원분산분석표',
            data: [
              {
                변동요인: factor1Column,
                제곱합: result.factor1_ss?.toFixed(4) || 'N/A',
                자유도: result.factor1_df || 'N/A',
                평균제곱: result.factor1_ms?.toFixed(4) || 'N/A',
                F통계량: result.factor1_f?.toFixed(4) || 'N/A',
                'p-value': result.factor1_p?.toFixed(4) || 'N/A'
              },
              {
                변동요인: factor2Column,
                제곱합: result.factor2_ss?.toFixed(4) || 'N/A',
                자유도: result.factor2_df || 'N/A',
                평균제곱: result.factor2_ms?.toFixed(4) || 'N/A',
                F통계량: result.factor2_f?.toFixed(4) || 'N/A',
                'p-value': result.factor2_p?.toFixed(4) || 'N/A'
              },
              {
                변동요인: '상호작용',
                제곱합: result.interaction_ss?.toFixed(4) || 'N/A',
                자유도: result.interaction_df || 'N/A',
                평균제곱: result.interaction_ms?.toFixed(4) || 'N/A',
                F통계량: result.interaction_f?.toFixed(4) || 'N/A',
                'p-value': result.interaction_p?.toFixed(4) || 'N/A'
              },
              {
                변동요인: '오차',
                제곱합: result.residual_ss?.toFixed(4) || 'N/A',
                자유도: result.residual_df || 'N/A',
                평균제곱: result.residual_ms?.toFixed(4) || 'N/A',
                F통계량: '',
                'p-value': ''
              }
            ]
          }],
          interpretation: `이원분산분석 결과:\n` +
            `- ${factor1Column}: ${result.factor1_p < alpha ? '유의' : '무의'} (p=${result.factor1_p?.toFixed(4)})\n` +
            `- ${factor2Column}: ${result.factor2_p < alpha ? '유의' : '무의'} (p=${result.factor2_p?.toFixed(4)})\n` +
            `- 상호작용: ${result.interaction_p < alpha ? '유의' : '무의'} (p=${result.interaction_p?.toFixed(4)})`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `이원분산분석 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * Tukey HSD 사후검정
   */
  private static async tukeyHSD(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])

    try {
      const result = await this.pyodideService.performTukeyHSD(groupArrays, groupNames, alpha)

      // 다중비교 테이블 생성
      const comparisons = result.comparisons || []
      const formattedComparisons = comparisons.map(comp => ({
        '그룹 1': comp.group1,
        '그룹 2': comp.group2,
        '평균차이': comp.meandiff?.toFixed(4) || 'N/A',
        'p-value': comp.pvalue?.toFixed(4) || 'N/A',
        '하한': comp.lower?.toFixed(4) || 'N/A',
        '상한': comp.upper?.toFixed(4) || 'N/A',
        '유의성': comp.reject ? '유의' : '무의'
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: '전체 비교 수', value: formattedComparisons.length },
            { name: '유의한 비교', value: formattedComparisons.filter(c => c['유의성'] === '유의').length },
            { name: '유의수준', value: alpha }
          ],
          tables: [{
            name: 'Tukey HSD 다중비교',
            data: formattedComparisons
          }],
          interpretation: `Tukey HSD 사후검정 결과, 전체 ${formattedComparisons.length}개 비교 중 ${formattedComparisons.filter(c => c['유의성'] === '유의').length}개가 유의수준 ${alpha}에서 통계적으로 유의합니다.`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Tukey HSD 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * Bonferroni 사후검정
   */
  private static async bonferroni(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])

    try {
      const result = await this.pyodideService.performBonferroni(groupArrays, groupNames, alpha)

      const comparisons = result.comparisons || []
      const formattedComparisons = comparisons.map(comp => ({
        '그룹 1': comp.group1,
        '그룹 2': comp.group2,
        '평균차이': comp.mean_diff?.toFixed(4) || 'N/A',
        't-통계량': comp.t_statistic?.toFixed(4) || 'N/A',
        'p-value': comp.p_value?.toFixed(4) || 'N/A',
        '보정된 p-value': comp.adjusted_p?.toFixed(4) || 'N/A',
        '신뢰구간': `[${comp.ci_lower?.toFixed(4)}, ${comp.ci_upper?.toFixed(4)}]`,
        '유의성': comp.significant ? '유의' : '무의'
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: '전체 비교 수', value: result.num_comparisons },
            { name: '유의한 비교', value: result.significant_count },
            { name: '원래 α', value: result.original_alpha },
            { name: '보정된 α', value: result.adjusted_alpha?.toFixed(5) }
          ],
          tables: [{
            name: 'Bonferroni 다중비교',
            data: formattedComparisons
          }],
          interpretation: `Bonferroni 보정을 적용하여 유의수준이 ${result.original_alpha}에서 ${result.adjusted_alpha?.toFixed(5)}로 조정되었습니다.\n` +
            `전체 ${result.num_comparisons}개 비교 중 ${result.significant_count}개가 통계적으로 유의합니다.`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Bonferroni 검정 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * Games-Howell 사후검정
   */
  private static async gamesHowell(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    // Games-Howell은 등분산을 가정하지 않는 사후검정
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])

    try {
      const result = await this.pyodideService.gamesHowellTest(groupArrays, groupNames, alpha)

      const comparisons = result.comparisons || []
      const formattedComparisons = comparisons.map((comp, idx) => ({
        '그룹 1': comp.group1,
        '그룹 2': comp.group2,
        '평균차이': comp.mean_diff?.toFixed(4) || 'N/A',
        't-통계량': comp.t_statistic?.toFixed(4) || 'N/A',
        '자유도': comp.df?.toFixed(2) || 'N/A',
        'p-value': comp.p_value?.toFixed(4) || 'N/A',
        '유의성': comp.significant ? '유의' : '무의'
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: '전체 비교 수', value: formattedComparisons.length },
            { name: '유의한 비교', value: formattedComparisons.filter(c => c['유의성'] === '유의').length },
            { name: '유의수준', value: alpha }
          ],
          tables: [{
            name: 'Games-Howell 다중비교',
            data: formattedComparisons
          }],
          interpretation: 'Games-Howell 검정은 등분산을 가정하지 않는 사후검정입니다.\n\n' +
            `전체 ${formattedComparisons.length}개 비교 중 ${formattedComparisons.filter(c => c['유의성'] === '유의').length}개가 통계적으로 유의합니다.\n\n` +
            `💡 결과 검증 방법:\n` +
            `- R: PMCMRplus::gamesHowellTest(x ~ g)\n` +
            `- Python: scikit_posthocs.posthoc_games_howell(data)\n` +
            `- SPSS: Analyze > Compare Means > One-Way ANOVA > Post Hoc > Games-Howell`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Games-Howell 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * 다중회귀분석
   */
  private static async multipleRegression(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const independentColumns = parameters.independentColumns
    const dependentColumn = parameters.dependentColumn
    const method = parameters.method || 'enter'
    const alpha = parameters.alpha || 0.05

    if (!independentColumns || independentColumns.length < 1 || !dependentColumn) {
      return { success: false, error: '독립변수들과 종속변수를 선택하세요' }
    }

    // 데이터 준비
    const xMatrix = []
    const yValues = []

    data.forEach(row => {
      const y = parseFloat(row[dependentColumn])
      const xs = independentColumns.map(col => parseFloat(row[col]))
      if (!isNaN(y) && xs.every(x => !isNaN(x))) {
        xMatrix.push(xs)
        yValues.push(y)
      }
    })

    if (xMatrix.length < independentColumns.length + 2) {
      return { success: false, error: `최소 ${independentColumns.length + 2}개 이상의 데이터가 필요합니다` }
    }

    try {
      const result = await this.pyodideService.multipleRegression(xMatrix, yValues, independentColumns)

      const coefficients = result.coefficients || []
      const formattedCoeffs = coefficients.map((coef, idx) => ({
        변수: idx === 0 ? '(절편)' : independentColumns[idx - 1],
        계수: coef.value?.toFixed(4) || 'N/A',
        표준오차: coef.std_err?.toFixed(4) || 'N/A',
        't-통계량': coef.t_stat?.toFixed(4) || 'N/A',
        'p-value': coef.p_value?.toFixed(4) || 'N/A',
        '유의성': coef.p_value < alpha ? '*' : ''
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: 'R²', value: result.r_squared?.toFixed(4) || 'N/A' },
            { name: 'Adj R²', value: result.adj_r_squared?.toFixed(4) || 'N/A' },
            { name: 'F-통계량', value: result.f_statistic?.toFixed(4) || 'N/A' },
            { name: 'F p-value', value: result.f_pvalue?.toFixed(4) || 'N/A' }
          ],
          tables: [{
            name: '회귀계수',
            data: formattedCoeffs
          }],
          interpretation: `다중회귀분석 결과:\n` +
            `- R² = ${result.r_squared?.toFixed(4)}: 모델이 데이터 변동의 ${(result.r_squared * 100)?.toFixed(1)}%를 설명\n` +
            `- F-통계량 = ${result.f_statistic?.toFixed(4)} (p=${result.f_pvalue?.toFixed(4)}): 모델 ${result.f_pvalue < alpha ? '유의' : '무의'}\n` +
            `- 유의한 변수: ${formattedCoeffs.filter(c => c['유의성'] === '*').map(c => c.변수).join(', ') || '없음'}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `다중회귀분석 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * 로지스틱 회귀
   */
  private static async logisticRegression(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const independentColumns = parameters.independentColumns
    const dependentColumn = parameters.dependentColumn
    const method = parameters.method || 'newton-cg'
    const maxIter = parameters.maxIter || 100
    const alpha = parameters.alpha || 0.05

    if (!independentColumns || independentColumns.length < 1 || !dependentColumn) {
      return { success: false, error: '독립변수들과 종속변수를 선택하세요' }
    }

    // 데이터 준비
    const xMatrix = []
    const yValues = []

    data.forEach(row => {
      const y = parseFloat(row[dependentColumn])
      const xs = independentColumns.map(col => parseFloat(row[col]))
      if (!isNaN(y) && xs.every(x => !isNaN(x))) {
        xMatrix.push(xs)
        yValues.push(y)
      }
    })

    if (xMatrix.length < 10) {
      return { success: false, error: '로지스틱 회귀는 최소 10개 이상의 데이터가 필요합니다' }
    }

    try {
      const result = await this.pyodideService.logisticRegression(xMatrix, yValues, independentColumns, method, maxIter)

      const coefficients = result.coefficients || []
      const formattedCoeffs = coefficients.map((coef, idx) => ({
        변수: idx === 0 ? '(절편)' : independentColumns[idx - 1],
        계수: coef.value?.toFixed(4) || 'N/A',
        표준오차: coef.std_err?.toFixed(4) || 'N/A',
        'Wald': coef.wald?.toFixed(4) || 'N/A',
        'p-value': coef.p_value?.toFixed(4) || 'N/A',
        'Exp(B)': coef.odds_ratio?.toFixed(4) || 'N/A',
        '유의성': coef.p_value < alpha ? '*' : ''
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: 'AUC', value: result.auc?.toFixed(4) || 'N/A' },
            { name: '정확도', value: result.accuracy?.toFixed(4) || 'N/A' },
            { name: '정밀도', value: result.precision?.toFixed(4) || 'N/A' },
            { name: '재현율', value: result.recall?.toFixed(4) || 'N/A' },
            { name: 'F1 Score', value: result.f1?.toFixed(4) || 'N/A' }
          ],
          tables: [{
            name: '로지스틱 회귀계수',
            data: formattedCoeffs
          }],
          interpretation: `로지스틱 회귀 결과:\n` +
            `- 모델 정확도: ${(result.accuracy * 100)?.toFixed(1)}%\n` +
            `- AUC = ${result.auc?.toFixed(4)}: ${result.auc > 0.9 ? '매우 우수' : result.auc > 0.8 ? '우수' : result.auc > 0.7 ? '양호' : '개선 필요'}\n` +
            `- 유의한 변수: ${formattedCoeffs.filter(c => c['유의성'] === '*').map(c => c.변수).join(', ') || '없음'}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `로지스틱 회귀 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * Dunn의 사후검정 (비모수)
   */
  private static async dunnTest(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const groupColumn = parameters.groupColumn
    const valueColumn = parameters.valueColumn
    const pAdjust = parameters.pAdjust || 'holm'
    const alpha = parameters.alpha || 0.05

    if (!groupColumn || !valueColumn) {
      return { success: false, error: '그룹 열과 값 열을 선택하세요' }
    }

    // 그룹별 데이터 분리
    const groups = {}
    data.forEach(row => {
      const group = row[groupColumn]
      const value = parseFloat(row[valueColumn])
      if (!isNaN(value)) {
        if (!groups[group]) groups[group] = []
        groups[group].push(value)
      }
    })

    const groupNames = Object.keys(groups)
    if (groupNames.length < 2) {
      return { success: false, error: '최소 2개 이상의 그룹이 필요합니다' }
    }

    const groupArrays = groupNames.map(name => groups[name])

    try {
      const result = await this.pyodideService.dunnTest(groupArrays, groupNames, pAdjust, alpha)

      const comparisons = result.comparisons || []
      const formattedComparisons = comparisons.map(comp => ({
        '그룹 1': comp.group1,
        '그룹 2': comp.group2,
        'Z-통계량': comp.z_statistic?.toFixed(4) || 'N/A',
        'p-value': comp.p_value?.toFixed(4) || 'N/A',
        '보정 p-value': comp.p_adjusted?.toFixed(4) || comp.p_value?.toFixed(4) || 'N/A',
        '유의성': comp.significant ? '유의' : '무의'
      }))

      return {
        success: true,
        data: {
          metrics: [
            { name: '전체 비교 수', value: formattedComparisons.length },
            { name: '유의한 비교', value: formattedComparisons.filter(c => c['유의성'] === '유의').length },
            { name: 'p-value 보정', value: pAdjust },
            { name: '유의수준', value: alpha }
          ],
          tables: [{
            name: "Dunn's Test 다중비교",
            data: formattedComparisons
          }],
          interpretation: "Dunn's test는 Kruskal-Wallis 검정의 비모수 사후검정입니다.\n\n" +
            `전체 ${formattedComparisons.length}개 비교 중 ${formattedComparisons.filter(c => c['유의성'] === '유의').length}개가 통계적으로 유의합니다.\n\n` +
            `⚠️ 직접 구현 (Dunn, 1964 원논문 기준)\n\n` +
            `💡 결과 검증 방법:\n` +
            `- R: dunn.test::dunn.test(x, g, method="${pAdjust}")\n` +
            `- Python: scikit_posthocs.posthoc_dunn(data, p_adjust='${pAdjust}')`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Dunn Test 실행 중 오류: ${error.message}`
      }
    }
  }

  /**
   * K-means 클러스터링
   */
  private static async kMeansClustering(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const columns = parameters.columns
    const nClusters = parameters.nClusters || 3
    const init = parameters.init || 'k-means++'
    const maxIter = parameters.maxIter || 300
    const standardize = parameters.standardize ?? true

    if (!columns || columns.length < 2) {
      return { success: false, error: '최소 2개 이상의 변수를 선택하세요' }
    }

    // 데이터 준비
    const dataMatrix = []
    data.forEach(row => {
      const values = columns.map(col => parseFloat(row[col]))
      if (values.every(v => !isNaN(v))) {
        dataMatrix.push(values)
      }
    })

    if (dataMatrix.length < nClusters) {
      return { success: false, error: `최소 ${nClusters}개 이상의 데이터가 필요합니다` }
    }

    // K-means 클러스터링 수행 (간략화)
    const result = await this.pyodideService.clusterAnalysis(dataMatrix, {
      method: 'kmeans',
      n_clusters: nClusters,
      standardize
    })

    return {
      success: true,
      data: {
        metrics: [
          { name: '클러스터 수', value: nClusters },
          { name: 'Inertia', value: result.inertia?.toFixed(4) || 'N/A' },
          { name: 'Silhouette Score', value: result.silhouette_score?.toFixed(4) || 'N/A' }
        ],
        tables: [{
          name: '클러스터 요약',
          data: Array.from({ length: nClusters }, (_, i) => ({
            클러스터: `Cluster ${i + 1}`,
            '크기': result.cluster_sizes?.[i] || 'N/A'
          }))
        }],
        charts: [{
          type: 'scatter',
          data: {
            clusters: result.labels,
            centers: result.centers
          }
        }],
        interpretation: `K-means 클러스터링으로 ${nClusters}개의 클러스터를 형성했습니다. Silhouette Score = ${result.silhouette_score?.toFixed(4) || 'N/A'}.`
      }
    }
  }

  /**
   * 계층적 클러스터링
   */
  private static async hierarchicalClustering(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const columns = parameters.columns
    const method = parameters.method || 'ward'
    const metric = parameters.metric || 'euclidean'
    const nClusters = parameters.nClusters
    const standardize = parameters.standardize ?? true

    if (!columns || columns.length < 2) {
      return { success: false, error: '최소 2개 이상의 변수를 선택하세요' }
    }

    // 데이터 준비
    const dataMatrix = []
    data.forEach(row => {
      const values = columns.map(col => parseFloat(row[col]))
      if (values.every(v => !isNaN(v))) {
        dataMatrix.push(values)
      }
    })

    const result = await this.pyodideService.clusterAnalysis(dataMatrix, {
      method: 'hierarchical',
      linkage: method,
      metric,
      n_clusters: nClusters,
      standardize
    })

    return {
      success: true,
      data: {
        metrics: [
          { name: '연결 방법', value: method },
          { name: '거리 측정', value: metric },
          { name: 'Cophenetic 상관계수', value: result.cophenetic_corr?.toFixed(4) || 'N/A' }
        ],
        tables: nClusters ? [{
          name: '클러스터 할당',
          data: dataMatrix.map((_, i) => ({
            '데이터 포인트': i + 1,
            '클러스터': result.labels?.[i] || 'N/A'
          })).slice(0, 20) // 처음 20개만 표시
        }] : [],
        charts: [{
          type: 'dendrogram',
          data: {
            linkage_matrix: result.linkage_matrix
          }
        }],
        interpretation: `계층적 클러스터링 (${method} 연결, ${metric} 거리)이 수행되었습니다.`
      }
    }
  }

  /**
   * 주성분 분석 (PCA)
   */
  private static async principalComponentAnalysis(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const columns = parameters.columns
    const nComponents = parameters.nComponents
    const standardize = parameters.standardize ?? true
    const varianceExplained = parameters.varianceExplained || 0.95

    if (!columns || columns.length < 2) {
      return { success: false, error: '최소 2개 이상의 변수를 선택하세요' }
    }

    // 각 열의 데이터 추출
    const dataMatrix = []
    data.forEach(row => {
      const values = columns.map(col => parseFloat(row[col]))
      if (values.every(v => !isNaN(v))) {
        dataMatrix.push(values)
      }
    })

    if (dataMatrix.length < 3) {
      return { success: false, error: '최소 3개 이상의 유효한 데이터 행이 필요합니다' }
    }

    const result = await this.pyodideService.performPCA(dataMatrix, columns, nComponents, standardize)

    // 주성분별 설명 분산
    const varianceTable = result.components.map((comp, i) => ({
      주성분: `PC${i + 1}`,
      고유값: result.eigenvalues[i].toFixed(4),
      '분산 비율': (result.explainedVarianceRatio[i] * 100).toFixed(2) + '%',
      '누적 분산': (result.cumulativeVariance[i] * 100).toFixed(2) + '%'
    }))

    // 적재행렬 (Loading Matrix)
    const loadingTable = columns.map((col, i) => {
      const row = { 변수: col }
      result.components.forEach((comp, j) => {
        row[`PC${j + 1}`] = comp[i].toFixed(4)
      })
      return row
    })

    // 주성분 개수 결정
    const nComponentsSelected = result.cumulativeVariance.findIndex(v => v >= varianceExplained) + 1

    return {
      success: true,
      data: {
        metrics: [
          { name: '전체 변수 수', value: columns.length },
          { name: '선택된 주성분', value: nComponentsSelected },
          { name: '설명 분산', value: (result.cumulativeVariance[nComponentsSelected - 1] * 100).toFixed(1) + '%' }
        ],
        tables: [
          {
            name: '주성분별 설명 분산',
            data: varianceTable
          },
          {
            name: '적재행렬 (Loading Matrix)',
            data: loadingTable
          }
        ],
        charts: [{
          type: 'scree',
          data: {
            eigenvalues: result.eigenvalues,
            explainedVariance: result.explainedVarianceRatio
          }
        }],
        interpretation: `주성분 분석 결과, 첫 ${nComponentsSelected}개의 주성분이 전체 분산의 ${(result.cumulativeVariance[nComponentsSelected - 1] * 100).toFixed(1)}%를 설명합니다. ` +
                       `PC1은 ${(result.explainedVarianceRatio[0] * 100).toFixed(1)}%의 분산을 설명하며, ` +
                       `${result.components[0].map((v, i) => Math.abs(v) > 0.4 ? columns[i] : null).filter(v => v).join(', ')}와 가장 강한 연관성을 보입니다.`
      }
    }
  }

  /**
   * 시계열 분해 (AdvancedService 연동)
   */
  private static async timeSeriesDecompositionCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    // 단일 숫자 열 선택: 명시적 column이 없으면 첫 번째 숫자형 열을 자동 선택
    let column: string | undefined = parameters.column
    if (!column) {
      const firstRow = data[0]
      if (!firstRow) return { success: false, error: '데이터가 비어 있습니다' }
      const candidate = Object.keys(firstRow).find(k => typeof firstRow[k] === 'number')
      if (!candidate) return { success: false, error: '숫자형 열을 찾을 수 없습니다. column 파라미터를 지정하세요' }
      column = candidate
    }

    const series = data.map(row => parseFloat(row[column!])).filter(v => !isNaN(v))
    if (series.length < 4) {
      return { success: false, error: '시계열 분해를 위해 최소 4개 이상의 숫자 데이터가 필요합니다' }
    }

    const period = parameters.period ? Number(parameters.period) : undefined

    const result = await this.pyodideService.timeSeriesDecomposition(series, period)

    const metrics = [
      { name: '길이', value: result.length || series.length },
      { name: '주기', value: result.period },
      { name: '계절성 강도', value: (result.seasonalStrength ?? 0).toFixed?.(4) || String(result.seasonalStrength) || 'N/A' },
      { name: '추세 강도', value: (result.trendStrength ?? 0).toFixed?.(4) || String(result.trendStrength) || 'N/A' }
    ]

    // 컴포넌트 미리보기 (앞 10개)
    const preview = (arr?: number[]) => (arr ? arr.slice(0, 10).map(v => (v == null ? '' : Number(v.toFixed ? v.toFixed(4) : v))) : [])

    const tables = [
      {
        name: '컴포넌트 프리뷰 (상위 10개)',
        data: Array.from({ length: 10 }).map((_, i) => ({
          인덱스: i + 1,
          관측값: result.observed?.[i] ?? '',
          추세: result.trend?.[i] ?? '',
          계절성: result.seasonal?.[i] ?? '',
          잔차: result.residual?.[i] ?? ''
        }))
      }
    ]

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `시계열을 주기 ${result.period}로 분해했습니다. 계절성 강도=${(result.seasonalStrength ?? 0).toFixed?.(4) || result.seasonalStrength}, 추세 강도=${(result.trendStrength ?? 0).toFixed?.(4) || result.trendStrength}.`
      }
    }
  }

  /**
   * ARIMA 예측
   */
  private static async arimaForecastCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column = parameters.column || 'value'
    const p = parameters.p || 1
    const d = parameters.d || 1
    const q = parameters.q || 1
    const steps = parameters.steps || 12

    const values = data.map(row => row[column]).filter((v): v is number => typeof v === 'number')

    if (values.length < 10) {
      return { success: false, error: 'ARIMA 예측을 위해서는 최소 10개의 데이터가 필요합니다' }
    }

    const result = await this.pyodideService.arimaForecast(values, p, d, q, steps)

    const metrics = [
      { name: 'AIC', value: result.aic.toFixed(2) },
      { name: 'BIC', value: result.bic.toFixed(2) },
      { name: 'MAE', value: result.mae.toFixed(4) },
      { name: 'RMSE', value: result.rmse.toFixed(4) }
    ]

    const tables = [{
      name: '예측 결과',
      data: result.forecast.map((val, i) => ({
        '시점': `t+${i + 1}`,
        '예측값': val.toFixed(2),
        '하한': result.lower_bound[i].toFixed(2),
        '상한': result.upper_bound[i].toFixed(2)
      }))
    }]

    const charts = [{
      type: 'line',
      data: {
        labels: [...Array(values.length + steps)].map((_, i) =>
          i < values.length ? `t${i}` : `t+${i - values.length + 1}`
        ),
        datasets: [
          {
            label: '실제값',
            data: [...values, ...Array(steps).fill(null)],
            borderColor: 'blue'
          },
          {
            label: '예측값',
            data: [...Array(values.length).fill(null), ...result.forecast],
            borderColor: 'red'
          },
          {
            label: '신뢰구간 상한',
            data: [...Array(values.length).fill(null), ...result.upper_bound],
            borderColor: 'rgba(255,0,0,0.3)',
            fill: '+1'
          },
          {
            label: '신뢰구간 하한',
            data: [...Array(values.length).fill(null), ...result.lower_bound],
            borderColor: 'rgba(255,0,0,0.3)',
            fill: false
          }
        ]
      }
    }]

    return {
      success: true,
      data: {
        metrics,
        tables,
        charts,
        interpretation: `ARIMA(${p},${d},${q}) 모델로 ${steps}개 시점을 예측했습니다. AIC=${result.aic.toFixed(2)}, BIC=${result.bic.toFixed(2)}`
      }
    }
  }

  /**
   * MANOVA (다변량 분산분석)
   */
  private static async manovaCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const dependentColumns = parameters.dependentColumns || []
    const groupColumn = parameters.groupColumn

    if (!dependentColumns || dependentColumns.length < 2) {
      return { success: false, error: 'MANOVA를 위해서는 최소 2개의 종속변수를 선택하세요' }
    }

    if (!groupColumn) {
      return { success: false, error: '그룹 변수를 선택하세요' }
    }

    // 종속변수 데이터 추출 (각 행이 하나의 관측치)
    const dependentVars = dependentColumns.map(col =>
      data.map(row => row[col]).filter((v): v is number => typeof v === 'number')
    )

    // 그룹 데이터 추출
    const groups = data.map(row => String(row[groupColumn]))

    if (dependentVars[0].length !== groups.length) {
      return { success: false, error: '데이터 길이가 일치하지 않습니다' }
    }

    const result = await this.pyodideService.manova(dependentVars, groups)

    // 가장 일반적으로 사용되는 Wilks' Lambda 결과
    const wilks = result.test_statistics.wilks_lambda

    const metrics = [
      { name: "Wilks' Lambda", value: wilks.statistic.toFixed(4) },
      { name: 'F-value', value: wilks.f_value.toFixed(4) },
      { name: 'p-value', value: wilks.p_value.toFixed(4) },
      { name: '그룹 수', value: result.n_groups },
      { name: '종속변수 수', value: result.n_dependent_vars }
    ]

    // 다변량 검정 결과 테이블
    const testTable = {
      name: '다변량 검정',
      data: [
        {
          '검정': "Wilks' Lambda",
          '통계량': wilks.statistic.toFixed(4),
          'F값': wilks.f_value.toFixed(4),
          'df1': wilks.df_num,
          'df2': wilks.df_den.toFixed(1),
          'p-value': wilks.p_value.toFixed(4)
        },
        {
          '검정': "Pillai's Trace",
          '통계량': result.test_statistics.pillai_trace.statistic.toFixed(4),
          'F값': result.test_statistics.pillai_trace.f_value.toFixed(4),
          'df1': result.test_statistics.pillai_trace.df_num,
          'df2': result.test_statistics.pillai_trace.df_den.toFixed(1),
          'p-value': result.test_statistics.pillai_trace.p_value.toFixed(4)
        },
        {
          '검정': "Hotelling's Trace",
          '통계량': result.test_statistics.hotelling_trace.statistic.toFixed(4),
          'F값': result.test_statistics.hotelling_trace.f_value.toFixed(4),
          'df1': result.test_statistics.hotelling_trace.df_num,
          'df2': result.test_statistics.hotelling_trace.df_den.toFixed(1),
          'p-value': result.test_statistics.hotelling_trace.p_value.toFixed(4)
        },
        {
          '검정': "Roy's Root",
          '통계량': result.test_statistics.roy_greatest_root.statistic.toFixed(4),
          'F값': result.test_statistics.roy_greatest_root.f_value.toFixed(4),
          'df1': result.test_statistics.roy_greatest_root.df_num,
          'df2': result.test_statistics.roy_greatest_root.df_den.toFixed(1),
          'p-value': result.test_statistics.roy_greatest_root.p_value.toFixed(4)
        }
      ]
    }

    // 단변량 ANOVA 결과
    const univariateTable = result.univariate_anovas ? {
      name: '각 종속변수별 ANOVA',
      data: result.univariate_anovas.map((uv, i) => ({
        '변수': dependentColumns[i],
        'F값': uv.f_statistic.toFixed(4),
        'p-value': uv.p_value.toFixed(4),
        '유의성': uv.p_value < 0.05 ? '유의' : '무의'
      }))
    } : null

    const tables = [testTable]
    if (univariateTable) tables.push(univariateTable)

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `MANOVA 결과: Wilks' Lambda=${wilks.statistic.toFixed(4)}, F(${wilks.df_num},${wilks.df_den.toFixed(1)})=${wilks.f_value.toFixed(4)}, p=${wilks.p_value.toFixed(4)}. ${wilks.p_value < 0.05 ? '그룹 간 다변량 차이가 유의합니다' : '그룹 간 다변량 차이가 유의하지 않습니다'}.`
      }
    }
  }

  /**
   * Kaplan-Meier 생존분석
   */
  private static async kaplanMeierSurvivalCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const timeColumn = parameters.timeColumn || 'time'
    const eventColumn = parameters.eventColumn || 'event'

    const times = data.map(row => row[timeColumn]).filter((v): v is number => typeof v === 'number')
    const events = data.map(row => row[eventColumn]).filter((v): v is number => typeof v === 'number')

    if (times.length !== events.length || times.length < 2) {
      return { success: false, error: '생존분석을 위한 시간과 사건 데이터가 올바르지 않습니다' }
    }

    const result = await this.pyodideService.kaplanMeierSurvival(times, events)

    const metrics = [
      { name: '중앙 생존시간', value: result.median_survival_time?.toFixed(1) || 'N/A' },
      { name: '사건 수', value: result.events_count },
      { name: '중도절단 수', value: result.censored_count }
    ]

    const tables = [{
      name: '생존함수',
      data: result.survival_function.time.map((t, i) => ({
        '시간': t.toFixed(1),
        '생존확률': result.survival_function.survival_probability[i].toFixed(3),
        '신뢰하한': result.survival_function.confidence_interval_lower[i].toFixed(3),
        '신뢰상한': result.survival_function.confidence_interval_upper[i].toFixed(3)
      }))
    }]

    const charts = [{
      type: 'line',
      data: {
        labels: result.survival_function.time.map(t => t.toFixed(1)),
        datasets: [{
          label: '생존확률',
          data: result.survival_function.survival_probability,
          borderColor: 'blue',
          stepped: true
        }]
      }
    }]

    return {
      success: true,
      data: {
        metrics,
        tables,
        charts,
        interpretation: `Kaplan-Meier 생존분석: 중앙생존시간=${result.median_survival_time?.toFixed(1) || 'N/A'}, 사건수=${result.events_count}, 중도절단수=${result.censored_count}`
      }
    }
  }

  /**
   * Mixed Effects Model
   */
  private static async mixedEffectsModelCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const formula = parameters.formula
    const groups = parameters.groups

    if (!formula || !groups) {
      return { success: false, error: 'Mixed Effects Model requires formula and groups parameters' }
    }

    const result = await this.pyodideService.mixedEffectsModel(data, formula, groups)

    const metrics = [
      { name: 'AIC', value: result.model_fit.aic.toFixed(2) },
      { name: 'BIC', value: result.model_fit.bic.toFixed(2) },
      { name: 'ICC', value: result.icc?.toFixed(3) || 'N/A' },
      { name: 'Converged', value: result.model_fit.converged ? 'Yes' : 'No' }
    ]

    const tables = [
      {
        name: 'Fixed Effects',
        data: Object.entries(result.fixed_effects).map(([name, effect]) => ({
          'Variable': name,
          'Coefficient': effect.coefficient.toFixed(4),
          'Std Error': effect.std_error.toFixed(4),
          'z-value': effect.z_value.toFixed(2),
          'p-value': effect.p_value.toFixed(4)
        }))
      },
      {
        name: 'Random Effects',
        data: Object.entries(result.random_effects).map(([name, effect]) => ({
          'Group': name,
          'Variance': effect.variance.toFixed(4),
          'Std Dev': effect.std_dev.toFixed(4)
        }))
      }
    ]

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `Mixed Effects Model: AIC=${result.model_fit.aic.toFixed(2)}, ICC=${result.icc?.toFixed(3) || 'N/A'}`
      }
    }
  }

  /**
   * SARIMA Forecast
   */
  private static async sarimaForecastCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const column = parameters.column
    const order = parameters.order || [1, 1, 1]
    const seasonal_order = parameters.seasonal_order || [1, 1, 1, 12]
    const steps = parameters.steps || 12

    if (!column) {
      return { success: false, error: '시계열 데이터 열을 선택하세요' }
    }

    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v))
    if (values.length < 24) {
      return { success: false, error: 'SARIMA requires at least 24 data points' }
    }

    const result = await this.pyodideService.sarimaForecast(values, order, seasonal_order, steps)

    const metrics = [
      { name: 'AIC', value: result.aic.toFixed(2) },
      { name: 'BIC', value: result.bic.toFixed(2) },
      { name: 'MAE', value: result.mae?.toFixed(2) || 'N/A' },
      { name: 'RMSE', value: result.rmse?.toFixed(2) || 'N/A' }
    ]

    const tables = [{
      name: 'Forecast',
      data: result.forecast.map((val, i) => ({
        'Step': i + 1,
        'Forecast': val.toFixed(2),
        'Lower Bound': result.lower_bound?.[i]?.toFixed(2) || 'N/A',
        'Upper Bound': result.upper_bound?.[i]?.toFixed(2) || 'N/A'
      }))
    }]

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `SARIMA(${order.join(',')})(${seasonal_order.join(',')}) Forecast: AIC=${result.aic.toFixed(2)}, Steps=${steps}`
      }
    }
  }

  /**
   * VAR Model
   */
  private static async varModelCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const columns = parameters.columns
    const maxlags = parameters.maxlags || 5
    const steps = parameters.steps || 1

    if (!columns || columns.length < 2) {
      return { success: false, error: 'VAR Model requires at least 2 columns' }
    }

    const dataMatrix = columns.map(col =>
      data.map(row => parseFloat(row[col])).filter(v => !isNaN(v))
    )

    if (dataMatrix.some(col => col.length < 20)) {
      return { success: false, error: 'Each variable needs at least 20 observations' }
    }

    const result = await this.pyodideService.varModel(dataMatrix, maxlags, steps)

    const metrics = [
      { name: 'AIC', value: result.aic.toFixed(2) },
      { name: 'BIC', value: result.bic.toFixed(2) },
      { name: 'Lag Order', value: result.lag_order }
    ]

    const tables = [{
      name: 'Forecast',
      data: result.forecast.map((vals, step) => {
        const row: any = { 'Step': step + 1 }
        columns.forEach((col, i) => {
          row[col] = vals[i]?.toFixed(2) || 'N/A'
        })
        return row
      })
    }]

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `VAR Model: Lag=${result.lag_order}, AIC=${result.aic.toFixed(2)}`
      }
    }
  }

  /**
   * Cox Regression
   */
  private static async coxRegressionCalc(data: any[], parameters: Record<string, any>): Promise<CalculationResult> {
    const duration_col = parameters.duration_col || 'time'
    const event_col = parameters.event_col || 'event'
    const covariates = parameters.covariates || []

    if (!duration_col || !event_col || covariates.length === 0) {
      return { success: false, error: 'Cox Regression requires duration, event and covariate columns' }
    }

    const result = await this.pyodideService.coxRegression(data, duration_col, event_col, covariates)

    const metrics = [
      { name: 'Concordance', value: result.concordance.toFixed(3) },
      { name: 'Log-likelihood', value: result.log_likelihood.toFixed(2) },
      { name: 'N observations', value: result.n_observations },
      { name: 'N events', value: result.n_events }
    ]

    const tables = [{
      name: 'Coefficients',
      data: Object.entries(result.coefficients).map(([name, coef]) => ({
        'Variable': name,
        'Coef': coef.coef.toFixed(4),
        'Hazard Ratio': coef.exp_coef.toFixed(3),
        'SE': coef.se_coef.toFixed(4),
        'z': coef.z.toFixed(2),
        'p-value': coef.p_value.toFixed(4)
      }))
    }]

    return {
      success: true,
      data: {
        metrics,
        tables,
        interpretation: `Cox Regression: Concordance=${result.concordance.toFixed(3)}, N=${result.n_observations}, Events=${result.n_events}`
      }
    }
  }
}
