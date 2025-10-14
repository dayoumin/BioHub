/**
 * Pyodide 기반 통계 계산 서비스
 *
 * 모든 통계 계산은 Python의 SciPy/NumPy를 통해 수행되어야 합니다.
 * JavaScript 통계 라이브러리는 신뢰성이 검증되지 않았으므로 사용하지 않습니다.
 */

import type {
  PyodideInterface,
  StatisticalTestResult,
  DescriptiveStatsResult,
  NormalityTestResult,
  OutlierResult,
  CorrelationResult,
  HomogeneityTestResult,
  ANOVAResult,
  TukeyHSDResult,
  RegressionResult
} from '@/types/pyodide'
import { withPyodideContext, retryPyodideOperation } from './pyodide-helper'
import { getPyodideCDNUrls } from '@/lib/constants'

declare global {
  interface Window {
    pyodide?: PyodideInterface
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}

/**
 * Worker 메서드 호출 파라미터 타입
 * JSON 직렬화 가능한 타입만 허용
 */
type WorkerMethodParam =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | number[][]
  | (number | string)[]
  | null

/**
 * Worker 메서드 호출 옵션
 */
interface WorkerMethodOptions {
  errorMessage?: string
  skipValidation?: boolean
}

/**
 * Python 에러 응답 타입
 */
interface PythonErrorResponse {
  error: string
}

/**
 * Python 에러 응답 타입 가드
 */
function isPythonError(obj: unknown): obj is PythonErrorResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as Record<string, unknown>).error === 'string'
  )
}

export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private pyodide: PyodideInterface | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private packagesLoaded = false

  private constructor() {}

  private parsePythonResult<T>(payload: any): T {
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload) as T
      } catch {
        // 문자열이지만 JSON 아님
        return payload as T
      }
    }
    return payload as T
  }

  // ========================================
  // Option A: callWorkerMethod Helper
  // 중복 코드 제거를 위한 공통 헬퍼 함수
  // ========================================

  /**
   * Worker 메서드 공통 호출 헬퍼
   *
   * @template T 반환 타입
   * @param workerNum Worker 번호 (1-4)
   * @param methodName Python 함수명 (snake_case)
   * @param params 파라미터 객체 (키: Python 파라미터명, 값: 직렬화 가능한 데이터)
   * @param options 추가 옵션
   * @returns Python 함수 실행 결과
   */
  private async callWorkerMethod<T>(
    workerNum: 1 | 2 | 3 | 4,
    methodName: string,
    params: Record<string, WorkerMethodParam>,
    options: WorkerMethodOptions = {}
  ): Promise<T> {
    // 1. 초기화
    await this.initialize()
    await this.ensureWorkerLoaded(workerNum)

    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }

    // 2. 파라미터 검증 및 직렬화
    const skipValidation = options.skipValidation ?? false
    const paramsLines: string[] = []
    const paramNames: string[] = []

    for (const [key, value] of Object.entries(params)) {
      if (!skipValidation) {
        this.validateWorkerParam(key, value)
      }
      paramsLines.push(`${key} = ${JSON.stringify(value)}`)
      paramNames.push(key)
    }

    const paramsCode = paramsLines.join('\n')
    const paramNamesStr = paramNames.join(', ')

    // 3. Python 코드 실행
    const resultStr = await this.pyodide.runPythonAsync(`
      import json
      from worker${workerNum}_module import ${methodName}

      ${paramsCode}

      try:
        result = ${methodName}(${paramNamesStr})
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    // 4. 결과 파싱 및 에러 처리
    const parsed = this.parsePythonResult<T | PythonErrorResponse>(resultStr)

    if (isPythonError(parsed)) {
      const errorMsg = options.errorMessage || `${methodName} 실행 실패`
      throw new Error(`${errorMsg}: ${parsed.error}`)
    }

    return parsed as T
  }

  /**
   * Worker 메서드 파라미터 검증
   *
   * @param key 파라미터 이름
   * @param value 파라미터 값
   * @throws Error 검증 실패 시
   */
  private validateWorkerParam(key: string, value: WorkerMethodParam): void {
    // null 허용
    if (value === null) return

    // undefined 금지
    if (value === undefined) {
      throw new Error(`파라미터 '${key}'가 undefined입니다`)
    }

    // 숫자 검증
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`파라미터 '${key}'가 유효하지 않은 숫자입니다: ${value}`)
      }
      return
    }

    // 문자열/불린 검증 (통과)
    if (typeof value === 'string' || typeof value === 'boolean') {
      return
    }

    // 배열 검증
    if (Array.isArray(value)) {
      // 빈 배열 허용
      if (value.length === 0) return

      // 1차원 배열 (number[] | string[] | (number | string)[])
      if (!Array.isArray(value[0])) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          if (typeof item === 'number') {
            if (!Number.isFinite(item)) {
              throw new Error(`파라미터 '${key}[${i}]'가 유효하지 않은 숫자입니다: ${item}`)
            }
          } else if (typeof item !== 'string') {
            throw new Error(`파라미터 '${key}[${i}]'가 유효하지 않은 타입입니다: ${typeof item}`)
          }
        }
        return
      }

      // 2차원 배열 (number[][])
      for (let i = 0; i < value.length; i++) {
        const row = value[i]
        if (!Array.isArray(row)) {
          throw new Error(`파라미터 '${key}[${i}]'가 배열이 아닙니다`)
        }

        for (let j = 0; j < row.length; j++) {
          const item = row[j]
          if (typeof item !== 'number' || !Number.isFinite(item)) {
            throw new Error(`파라미터 '${key}[${i}][${j}]'가 유효하지 않은 숫자입니다: ${item}`)
          }
        }
      }
      return
    }

    // 지원하지 않는 타입
    throw new Error(`파라미터 '${key}'가 지원하지 않는 타입입니다: ${typeof value}`)
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  /**
   * Pyodide 초기화 및 필요한 패키지 로드
   */
  async initialize(): Promise<void> {
    console.log('[PyodideService.initialize] 시작')
    if (this.isInitialized()) {
      console.log('[PyodideService.initialize] 이미 초기화됨 (빠른 반환)')
      return
    }
    if (this.isLoading && this.loadPromise) {
      console.log('[PyodideService.initialize] 이미 로딩 중, 기다리는 중...')
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this._loadPyodide()

    try {
      await this.loadPromise
      console.log('[PyodideService.initialize] 초기화 성공!')
    } catch (error) {
      console.error('[PyodideService.initialize] 초기화 실패:', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  private async _loadPyodide(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Pyodide는 브라우저 환경에서만 사용 가능합니다')
    }

    console.log('[PyodideService] 초기화 시작...')

    // Pyodide CDN URL 가져오기 (환경 변수 자동 반영)
    const cdnUrls = getPyodideCDNUrls()
    console.log(`[PyodideService] 버전: ${cdnUrls.version}`)

    // Pyodide CDN에서 로드
    if (!window.loadPyodide) {
      console.log('[PyodideService] Pyodide 스크립트 로딩...')
      const script = document.createElement('script')
      script.src = cdnUrls.scriptURL
      script.async = true

      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('[PyodideService] 스크립트 로드 완료')
          resolve(true)
        }
        script.onerror = (error) => {
          console.error('[PyodideService] 스크립트 로드 실패:', error)
          reject(new Error('Pyodide 스크립트 로드 실패'))
        }
        document.head.appendChild(script)
      })
    } else {
      console.log('[PyodideService] Pyodide 이미 로드됨')
    }

    // Pyodide 초기화
    console.log('[PyodideService] Pyodide 인스턴스 생성 중...')
    try {
      this.pyodide = await window.loadPyodide({
        indexURL: cdnUrls.indexURL
      })
      console.log('[PyodideService] Pyodide 인스턴스 생성 완료')

      // window.pyodide에도 저장 (디버깅용)
      ;(window as any).pyodide = this.pyodide
    } catch (error) {
      console.error('[PyodideService] Pyodide 인스턴스 생성 실패:', error)
      throw error
    }

    // 필수 패키지 로드 (캐싱됨)
    if (!this.packagesLoaded) {
      console.log('[PyodideService] 패키지 로딩 중... (numpy, scipy, pandas)')
      const startTime = performance.now()
      try {
        // 핵심 패키지 로드 (pandas 포함 - import에서 필요)
        await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas'])
        console.log('[PyodideService] 핵심 패키지 로드 완료')

        // 추가 패키지는 백그라운드에서 로드
        this.loadAdditionalPackages()
        this.packagesLoaded = true

        const loadTime = ((performance.now() - startTime) / 1000).toFixed(2)
        console.log(`[PyodideService] 초기 패키지 로드 시간: ${loadTime}초`)
      } catch (error) {
        console.error('[PyodideService] 패키지 로드 실패:', error)
        throw error
      }
    } else {
      console.log('[PyodideService] 패키지 이미 로드됨 (캐시 사용)')
    }

    // 기본 imports
    console.log('[PyodideService] Python 기본 imports 실행 중...')
    await this.pyodide.runPythonAsync(`
      import numpy as np
      from scipy import stats
      import json

      import pandas as pd
      import warnings
      warnings.filterwarnings('ignore')
    `)
    console.log('[PyodideService] 초기화 완료!')
  }

  /**
   * 추가 패키지를 백그라운드에서 로드
   */
  private async loadAdditionalPackages(): Promise<void> {
    if (!this.pyodide) return

    console.log('[PyodideService] 추가 패키지 백그라운드 로딩 시작...')
    try {
      // scikit-learn, statsmodels는 필요시에만 로드
      // 실제 사용 시점에 동적으로 로드하도록 개선 가능
      // 예: 고급 분석 메서드 사용 시 로드
      console.log('[PyodideService] 추가 패키지는 필요시 동적 로드됩니다')
    } catch (error) {
      console.warn('[PyodideService] 추가 패키지 로드 실패 (무시):', error)
    }
  }

  /**
   * Worker 파일명 매핑
   */
  private getWorkerFileName(workerNum: 1 | 2 | 3 | 4): string {
    const fileNames = {
      1: 'descriptive',
      2: 'hypothesis',
      3: 'nonparametric-anova',
      4: 'regression-advanced'
    }
    return fileNames[workerNum]
  }

  /**
   * Worker 로드 공통 함수
   */
  private async ensureWorkerLoaded(workerNum: 1 | 2 | 3 | 4): Promise<void> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    const moduleName = `worker${workerNum}_module`
    const fileName = this.getWorkerFileName(workerNum)

    // 이미 로드되었는지 확인
    const isLoaded = await this.pyodide.runPythonAsync(`
      import sys
      '${moduleName}' in sys.modules
    `)

    if (isLoaded === true) return

    // Worker 파일 fetch
    const response = await fetch(`/workers/python/worker${workerNum}-${fileName}.py`)
    const workerCode = await response.text()

    // Worker 모듈로 등록
    await this.pyodide.runPythonAsync(`
import sys
from types import ModuleType

${moduleName} = ModuleType('${moduleName}')
exec("""${workerCode.replace(/`/g, '\\`')}""", ${moduleName}.__dict__)
sys.modules['${moduleName}'] = ${moduleName}
    `)
  }

  /**
   * Worker 1 (descriptive) 로드
   */
  private async ensureWorker1Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(1)
  }

  /**
   * Worker 2 (hypothesis) 로드
   */
  private async ensureWorker2Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(2)
  }

  /**
   * Worker 3 (nonparametric-anova) 로드
   */
  private async ensureWorker3Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(3)
  }

  /**
   * Worker 4 (regression-advanced) 로드
   */
  private async ensureWorker4Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(4)
  }

  /**
   * Shapiro-Wilk 정규성 검정 - Worker 1 사용
   */
  async shapiroWilkTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    const result = await this.normalityTest(data)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      isNormal: result.isNormal
    }
  }

  /**
   * IQR 방법으로 이상치 탐지 - Worker 1 사용
   */
  async detectOutliersIQR(data: number[]): Promise<{
    q1: number
    q3: number
    iqr: number
    lowerBound: number
    upperBound: number
    mildOutliers: number[]
    extremeOutliers: number[]
  }> {
    const stats = await this.descriptiveStats(data)
    const outliers = await this.outlierDetection(data, 'iqr')

    return {
      q1: stats.q1,
      q3: stats.q3,
      iqr: stats.q3 - stats.q1,
      lowerBound: stats.q1 - 1.5 * (stats.q3 - stats.q1),
      upperBound: stats.q3 + 1.5 * (stats.q3 - stats.q1),
      mildOutliers: [],  // Worker 1에서 세부 분류 미제공
      extremeOutliers: []
    }
  }

  /**
   * Levene 등분산성 검정
   * @param groups 그룹별 데이터 배열
   * @returns 검정 결과
   */
  /**
   * Levene 등분산성 검정 - Worker 2 사용
   */
  async leveneTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      equalVariance: boolean
    }>(
      2,
      'levene_test',
      { groups },
      { errorMessage: 'Levene test 실행 실패' }
    )
  }

  /**
   * 독립성 검정 (Durbin-Watson test) - Worker 4 사용
   * 시계열 데이터나 회귀분석 잔차의 자기상관성 검정
   * @param residuals 잔차 또는 시계열 데이터
   * @returns DW 통계량 (2에 가까울수록 독립적)
   */
  async testIndependence(residuals: number[]): Promise<{
    statistic: number
    interpretation: string
    isIndependent: boolean
  }> {
    return this.callWorkerMethod<{
      statistic: number
      interpretation: string
      isIndependent: boolean
    }>(
      4,
      'durbin_watson_test',
      { residuals },
      { errorMessage: 'Durbin-Watson test 실행 실패' }
    )
  }

  /**
   * Bartlett's test for homogeneity of variances - Worker 2 사용
   * Levene's test보다 정규성에 민감하지만 더 강력한 검정
   */
  async bartlettTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      equalVariance: boolean
    }>(
      2,
      'bartlett_test',
      { groups },
      { errorMessage: 'Bartlett test 실행 실패' }
    )
  }

  /**
   * Kolmogorov-Smirnov test for normality - Worker 1 사용
   * Shapiro-Wilk보다 큰 표본에 적합
   */
  async kolmogorovSmirnovTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      isNormal: boolean
    }>(
      1,
      'kolmogorov_smirnov_test',
      { data },
      { errorMessage: 'K-S test 실행 실패' }
    )
  }

  /**
   * 통계적 가정 종합 검정
   * 데이터의 모든 통계적 가정을 한 번에 검정
   */
  async checkAllAssumptions(data: {
    values?: number[]
    groups?: number[][]
    residuals?: number[]
  }): Promise<{
    normality?: {
      shapiroWilk?: NormalityTestResult
      kolmogorovSmirnov?: { statistic: number; pValue: number; isNormal: boolean }
    }
    homogeneity?: {
      levene?: HomogeneityTestResult
      bartlett?: { statistic: number; pValue: number; equalVariance: boolean }
    }
    independence?: {
      durbinWatson?: { statistic: number; interpretation: string; isIndependent: boolean }
    }
    summary: {
      canUseParametric: boolean
      reasons: string[]
      recommendations: string[]
    }
  }> {
    const results: any = {
      normality: {},
      homogeneity: {},
      independence: {},
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: []
      }
    }

    // 정규성 검정
    if (data.values && data.values.length >= 3) {
      try {
        // Shapiro-Wilk (작은 표본에 적합)
        if (data.values.length <= 5000) {
          results.normality.shapiroWilk = await this.testNormality(data.values)
          if (!results.normality.shapiroWilk.isNormal) {
            results.summary.canUseParametric = false
            results.summary.reasons.push('정규성 가정 위반 (Shapiro-Wilk)')
            results.summary.recommendations.push('비모수 검정 사용 권장')
          }
        }

        // K-S test (큰 표본에 적합)
        if (data.values.length > 30) {
          results.normality.kolmogorovSmirnov = await this.kolmogorovSmirnovTest(data.values)
        }
      } catch (error) {
        console.error('정규성 검정 실패:', error)
      }
    }

    // 등분산성 검정
    if (data.groups && data.groups.length >= 2) {
      try {
        // Levene's test (정규성 가정에 강건)
        results.homogeneity.levene = await this.testHomogeneity(data.groups)
        if (!results.homogeneity.levene.equalVariance) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('등분산성 가정 위반 (Levene)')
          results.summary.recommendations.push("Welch's t-test 또는 Games-Howell 사용")
        }

        // Bartlett's test (정규분포일 때 더 강력)
        if (results.normality.shapiroWilk?.isNormal) {
          results.homogeneity.bartlett = await this.bartlettTest(data.groups)
        }
      } catch (error) {
        console.error('등분산성 검정 실패:', error)
      }
    }

    // 독립성 검정
    if (data.residuals && data.residuals.length >= 2) {
      try {
        results.independence.durbinWatson = await this.testIndependence(data.residuals)
        if (!results.independence.durbinWatson.isIndependent) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('독립성 가정 위반')
          results.summary.recommendations.push('시계열 분석 방법 사용')
        }
      } catch (error) {
        console.error('독립성 검정 실패:', error)
      }
    }

    // 종합 권장사항
    if (results.summary.canUseParametric) {
      results.summary.recommendations.push('모수 검정 사용 가능')
    } else {
      results.summary.recommendations.push('비모수 검정 우선 권장')
    }

    return results
  }

  /**
   * 기술통계 계산
   * @param data 숫자 배열
   * @returns 평균, 중앙값, 표준편차 등
   */
  async descriptiveStats(data: number[]): Promise<{
    mean: number
    median: number
    std: number
    min: number
    max: number
    q1: number
    q3: number
    skewness: number
    kurtosis: number
  }> {
    return this.callWorkerMethod<{
      mean: number
      median: number
      std: number
      min: number
      max: number
      q1: number
      q3: number
      skewness: number
      kurtosis: number
    }>(
      1,
      'descriptive_stats',
      { data },
      { errorMessage: 'Descriptive stats 실행 실패' }
    )
  }

  /**
   * 정규성 검정 (Normality Test - Shapiro-Wilk)
   */
  async normalityTest(data: number[], alpha: number = 0.05): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
    alpha: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      isNormal: boolean
      alpha: number
    }>(
      1,
      'normality_test',
      { data, alpha },
      { errorMessage: 'Normality test 실행 실패' }
    )
  }

  /**
   * 이상치 탐지 (Outlier Detection)
   */
  async outlierDetection(data: number[], method: 'iqr' | 'zscore' = 'iqr'): Promise<{
    outlierIndices: number[]
    outlierCount: number
    method: string
  }> {
    return this.callWorkerMethod<{
      outlierIndices: number[]
      outlierCount: number
      method: string
    }>(
      1,
      'outlier_detection',
      { data, method },
      { errorMessage: 'Outlier detection 실행 실패' }
    )
  }

  /**
   * 빈도분석 (Frequency Analysis)
   */
  async frequencyAnalysis(values: (string | number)[]): Promise<{
    categories: string[]
    frequencies: number[]
    percentages: number[]
    cumulativePercentages: number[]
    total: number
    uniqueCount: number
  }> {
    return this.callWorkerMethod<{
      categories: string[]
      frequencies: number[]
      percentages: number[]
      cumulativePercentages: number[]
      total: number
      uniqueCount: number
    }>(
      1,
      'frequency_analysis',
      { values },
      { errorMessage: 'Frequency analysis 실행 실패' }
    )
  }

  /**
   * 교차표 분석 (Crosstab Analysis)
   */
  async crosstabAnalysis(rowValues: (string | number)[], colValues: (string | number)[]): Promise<{
    rowCategories: string[]
    colCategories: string[]
    observedMatrix: number[][]
    rowTotals: number[]
    colTotals: number[]
    grandTotal: number
  }> {
    return this.callWorkerMethod<{
      rowCategories: string[]
      colCategories: string[]
      observedMatrix: number[][]
      rowTotals: number[]
      colTotals: number[]
      grandTotal: number
    }>(
      1,
      'crosstab_analysis',
      { row_values: rowValues, col_values: colValues },
      { errorMessage: 'Crosstab analysis 실행 실패' }
    )
  }

  /**
   * 일표본 비율검정 (One-Sample Proportion Test)
   */
  async oneSampleProportionTest(
    successCount: number,
    totalCount: number,
    nullProportion: number = 0.5,
    alternative: 'two-sided' | 'greater' | 'less' = 'two-sided',
    alpha: number = 0.05
  ): Promise<{
    sampleProportion: number
    nullProportion: number
    zStatistic: number
    pValueExact: number
    pValueApprox: number
    significant: boolean
    alpha: number
  }> {
    return this.callWorkerMethod<{
      sampleProportion: number
      nullProportion: number
      zStatistic: number
      pValueExact: number
      pValueApprox: number
      significant: boolean
      alpha: number
    }>(
      1,
      'one_sample_proportion_test',
      { success_count: successCount, total_count: totalCount, null_proportion: nullProportion, alternative, alpha },
      { errorMessage: 'One-sample proportion test 실행 실패' }
    )
  }

  /**
   * 신뢰도 분석 (Cronbach's Alpha) - Worker 1 버전
   */
  async cronbachAlphaWorker(itemsMatrix: number[][]): Promise<{
    alpha: number
    nItems: number
    nRespondents: number
  }> {
    return this.callWorkerMethod<{
      alpha: number
      nItems: number
      nRespondents: number
    }>(
      1,
      'cronbach_alpha',
      { items_matrix: itemsMatrix },
      { errorMessage: "Cronbach's alpha 실행 실패" }
    )
  }

  /**
   * 상관계수 계산 (Correlation Test) - Worker 2
   */
  async correlationTest(x: number[], y: number[], method: 'pearson' | 'spearman' | 'kendall' = 'pearson'): Promise<{
    correlation: number
    pValue: number
    method: string
  }> {
    return this.callWorkerMethod<{
      correlation: number
      pValue: number
      method: string
    }>(
      2,
      'correlation_test',
      { x, y, method },
      { errorMessage: 'Correlation test 실행 실패' }
    )
  }

  /**
   * 상관계수 계산 (Pearson & Spearman) - 기존 메서드 유지
   * @param x 첫 번째 변수
   * @param y 두 번째 변수
   * @returns 상관계수와 p-value
   */
  async correlation(x: number[], y: number[]): Promise<{
    pearson: { r: number; pValue: number }
    spearman: { r: number; pValue: number }
    kendall: { r: number; pValue: number }
  }> {
    await this.initialize()
    await this.ensureWorker2Loaded()

    // Worker 2의 correlation_test를 3번 호출
    const pearsonResult = await this.correlationTest(x, y, 'pearson')
    const spearmanResult = await this.correlationTest(x, y, 'spearman')
    const kendallResult = await this.correlationTest(x, y, 'kendall')

    return {
      pearson: {
        r: pearsonResult.correlation,
        pValue: pearsonResult.pValue
      },
      spearman: {
        r: spearmanResult.correlation,
        pValue: spearmanResult.pValue
      },
      kendall: {
        r: kendallResult.correlation,
        pValue: kendallResult.pValue
      }
    }
  }

  /**
   * 이표본 t-검정 (Two-Sample t-Test) - Worker 2
   */
  async tTestTwoSample(group1: number[], group2: number[], equalVar: boolean = true): Promise<{
    statistic: number
    pValue: number
    df: number
    mean1: number
    mean2: number
    meanDiff: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      mean1: number
      mean2: number
      meanDiff: number
    }>(
      2,
      't_test_two_sample',
      { group1, group2, equal_var: equalVar },
      { errorMessage: 'Two-sample t-test 실행 실패' }
    )
  }

  /**
   * 대응표본 t-검정 (Paired t-Test) - Worker 2
   */
  async tTestPaired(values1: number[], values2: number[]): Promise<{
    statistic: number
    pValue: number
    df: number
    meanDiff: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      meanDiff: number
    }>(
      2,
      't_test_paired',
      { values1, values2 },
      { errorMessage: 'Paired t-test 실행 실패' }
    )
  }

  /**
   * 일표본 t-검정 (One-Sample t-Test) - Worker 2
   */
  async tTestOneSample(data: number[], popmean: number = 0): Promise<{
    statistic: number
    pValue: number
    df: number
    sampleMean: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      sampleMean: number
    }>(
      2,
      't_test_one_sample',
      { data, popmean },
      { errorMessage: 'One-sample t-test 실행 실패' }
    )
  }

  /**
   * Z-검정 (Z-Test) - Worker 2
   */
  async zTestWorker(data: number[], popmean: number, popstd: number): Promise<{
    zStatistic: number
    pValue: number
    sampleMean: number
  }> {
    return this.callWorkerMethod<{
      zStatistic: number
      pValue: number
      sampleMean: number
    }>(
      2,
      'z_test',
      { data, popmean, popstd },
      { errorMessage: 'Z-test 실행 실패' }
    )
  }

  /**
   * 카이제곱 검정 (Chi-Square Test) - Worker 2
   */
  async chiSquareTestWorker(observedMatrix: number[][], yatesCorrection: boolean = false): Promise<{
    chiSquare: number
    pValue: number
    df: number
    expectedMatrix: number[][]
  }> {
    return this.callWorkerMethod<{
      chiSquare: number
      pValue: number
      df: number
      expectedMatrix: number[][]
    }>(
      2,
      'chi_square_test',
      { observed_matrix: observedMatrix, yates_correction: yatesCorrection },
      { errorMessage: 'Chi-square test 실행 실패' }
    )
  }

  /**
   * 이항검정 (Binomial Test) - Worker 2
   */
  async binomialTestWorker(
    successCount: number,
    totalCount: number,
    probability: number = 0.5,
    alternative: 'two-sided' | 'greater' | 'less' = 'two-sided'
  ): Promise<{
    pValue: number
    successCount: number
    totalCount: number
  }> {
    return this.callWorkerMethod<{
      pValue: number
      successCount: number
      totalCount: number
    }>(
      2,
      'binomial_test',
      {
        success_count: successCount,
        total_count: totalCount,
        probability,
        alternative
      },
      { errorMessage: 'Binomial test 실행 실패' }
    )
  }

  /**
   * 편상관 (Partial Correlation) - Worker 2
   */
  async partialCorrelationWorker(
    dataMatrix: number[][],
    xIdx: number,
    yIdx: number,
    controlIndices: number[]
  ): Promise<{
    correlation: number
    pValue: number
    df: number
    nObservations: number
    confidenceInterval: {
      lower: number
      upper: number
    }
  }> {
    return this.callWorkerMethod<{
      correlation: number
      pValue: number
      df: number
      nObservations: number
      confidenceInterval: {
        lower: number
        upper: number
      }
    }>(
      2,
      'partial_correlation',
      {
        data_matrix: dataMatrix,
        x_idx: xIdx,
        y_idx: yIdx,
        control_indices: controlIndices
      },
      { errorMessage: 'Partial correlation 실행 실패' }
    )
  }

  /**
   * t-검정 수행
   * @param group1 첫 번째 그룹 데이터
   * @param group2 두 번째 그룹 데이터
   * @param options 검정 옵션
   */
  async tTest(
    group1: number[],
    group2: number[],
    options: { paired?: boolean; equalVar?: boolean; type?: 'one-sample' | 'independent' | 'paired'; mu?: number; alternative?: 'two-sided' | 'less' | 'greater' } = {}
  ): Promise<{
    statistic: number
    pvalue: number
    df: number
    confidenceInterval?: { lower: number; upper: number }
  }> {
    // Worker 2 호출로 간소화
    if (options.type === 'one-sample' || (group2.length === 0 && options.mu !== undefined)) {
      const result = await this.tTestOneSample(group1, options.mu ?? 0)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    } else if (options.paired) {
      const result = await this.tTestPaired(group1, group2)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    } else {
      const result = await this.tTestTwoSample(group1, group2, options.equalVar !== false)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    }
  }

  /**
   * 일원분산분석 (One-way ANOVA)
   * @param groups 그룹별 데이터 배열
   */
  async anova(
    groups: number[][],
    options: { type?: 'one-way' | 'two-way' } = {}
  ): Promise<{
    fStatistic: number
    pvalue: number
    df: number[]
    etaSquared?: number
  }> {
    // Worker 3 호출로 간소화
    const result = await this.oneWayAnovaWorker(groups)
    return {
      fStatistic: result.fStatistic,
      pvalue: result.pValue,
      df: [result.dfBetween, result.dfWithin]
    }
  }

  /**
   * 단순선형회귀분석
   * @param x 독립변수
   * @param y 종속변수
   */
  async regression(
    x: number[],
    y: number[],
    options: { type?: 'simple' | 'multiple' } = {}
  ): Promise<{
    slope?: number
    intercept?: number
    rSquared: number
    pvalue: number
    fStatistic?: number
    tStatistic?: number
    predictions?: number[]
    df?: number
  }> {
    return this.callWorkerMethod<{
      slope?: number
      intercept?: number
      rSquared: number
      pvalue: number
      fStatistic?: number
      tStatistic?: number
      predictions?: number[]
      df?: number
    }>(
      4,
      'linear_regression',
      { x, y },
      { errorMessage: 'Linear regression 실행 실패' }
    )
  }

  /**
   * Mann-Whitney U 검정 - Worker 3
   */
  async mannWhitneyU(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    const result = await this.mannWhitneyTestWorker(group1, group2)
    return {
      statistic: result.statistic,
      pvalue: result.pValue
    }
  }

  /**
   * Wilcoxon 부호순위 검정 - Worker 3
   */
  async wilcoxon(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    const result = await this.wilcoxonTestWorker(group1, group2)
    return {
      statistic: result.statistic,
      pvalue: result.pValue
    }
  }

  /**
   * Kruskal-Wallis H 검정 - Worker 3
   */
  async kruskalWallis(groups: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    const result = await this.kruskalWallisTestWorker(groups)
    return {
      statistic: result.statistic,
      pvalue: result.pValue,
      df: result.df
    }
  }

  /**
   * Tukey HSD 사후검정 - Worker 3
   */
  async tukeyHSD(groups: number[][]): Promise<any> {
    const result = await this.tukeyHSDWorker(groups)
    return {
      comparisons: result.comparisons
    }
  }

  /**
   * Chi-square 검정 - Worker 2
   */
  async chiSquare(contingencyTable: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    const result = await this.chiSquareTestWorker(contingencyTable)
    return {
      statistic: result.chiSquare,
      pvalue: result.pValue,
      df: result.df
    }
  }

  /**
   * PCA (주성분분석) - 간단한 구현
   */
  async pca(data: number[][]): Promise<{
    explainedVariance: number[]
    totalExplainedVariance: number
    components: number[][]
  }> {
    return this.callWorkerMethod<{
      explainedVariance: number[]
      totalExplainedVariance: number
      components: number[][]
    }>(
      4,
      'pca_analysis',
      { data_matrix: data, n_components: 2 },
      { errorMessage: 'PCA 실행 실패' }
    )
  }

  /**
   * Cronbach's Alpha (신뢰도 계수) - Worker 1 사용
   */
  async cronbachAlpha(items: number[][]): Promise<{
    alpha: number
    itemTotalCorrelations?: number[]
  }> {
    // Worker 1의 cronbach_alpha 호출
    const result = await this.cronbachAlphaWorker(items)
    return {
      alpha: result.alpha,
      itemTotalCorrelations: undefined  // Worker 1은 itemTotalCorrelations 미제공
    }
  }

  /**
   * Friedman 검정 (반복측정 비모수 검정)
   */
  async friedman(data: number[][]): Promise<{
    statistic: number
    pvalue: number
    rankings: number[]
  }> {
    const result = await this.friedmanTestWorker(data)
    return {
      statistic: result.statistic,
      pvalue: result.pValue,
      rankings: result.rankings
    }
  }

  /**
   * 요인분석 (Factor Analysis) - Worker 4 사용
   */
  async factorAnalysis(data: number[][], options: {
    nFactors?: number
    rotation?: 'varimax' | 'quartimax' | 'oblimin'
  } = {}): Promise<{
    loadings: number[][]
    communalities: number[]
    explainedVariance: number[]
    eigenvalues: number[]
  }> {
    await this.initialize()
    await this.ensureWorker4Loaded()

    const { nFactors = 2, rotation = 'varimax' } = options

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker4_module import factor_analysis

      data_matrix = ${JSON.stringify(data)}

      try:
        result = factor_analysis(data_matrix, n_factors=${nFactors}, rotation='${rotation}')
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Factor analysis 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  /**
   * 군집분석 (Cluster Analysis) - Worker 4 사용
   */
  async clusterAnalysis(data: number[][], options: {
    nClusters?: number
    method?: 'kmeans' | 'hierarchical' | 'dbscan'
    linkage?: 'ward' | 'complete' | 'average' | 'single'
  } = {}): Promise<{
    clusters: number[]
    centers?: number[][]
    silhouetteScore: number
    inertia?: number
  }> {
    await this.initialize()
    await this.ensureWorker4Loaded()

    const {
      nClusters = 3,
      method = 'kmeans',
      linkage = 'ward'
    } = options

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker4_module import cluster_analysis

      data_matrix = ${JSON.stringify(data)}

      try:
        result = cluster_analysis(
          data_matrix,
          n_clusters=${nClusters},
          method='${method}',
          linkage='${linkage}'
        )
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Cluster analysis 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  /**
   * 시계열 분석 (Time Series Analysis) - Worker 4 사용
   */
  async timeSeriesAnalysis(data: number[], options: {
    seasonalPeriod?: number
    forecastPeriods?: number
    method?: 'decomposition' | 'arima' | 'exponential'
  } = {}): Promise<{
    trend?: number[]
    seasonal?: number[]
    residual?: number[]
    forecast?: number[]
    acf?: number[]
    pacf?: number[]
  }> {
    await this.initialize()
    await this.ensureWorker4Loaded()

    const {
      seasonalPeriod = 12,
      forecastPeriods = 6,
      method = 'decomposition'
    } = options

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker4_module import time_series_analysis

      data = ${JSON.stringify(data)}

      try:
        result = time_series_analysis(
          data,
          seasonal_period=${seasonalPeriod},
          forecast_periods=${forecastPeriods},
          method='${method}'
        )
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Time series analysis 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  // ========== Wrapper 메서드들 (StatisticalCalculator와의 호환성) ==========

  /**
   * 기술통계 계산
   */
  async calculateDescriptiveStatistics(data: number[]): Promise<any> {
    return this.descriptiveStats(data)
  }

  /**
   * 정규성 검정
   */
  async testNormality(data: number[], alpha: number = 0.05): Promise<any> {
    const result = await this.shapiroWilkTest(data)
    return {
      ...result,
      isNormal: result.pValue > alpha
    }
  }

  /**
   * 등분산 검정
   */
  async testHomogeneity(groups: number[][], method: string = 'levene'): Promise<any> {
    return this.leveneTest(groups)
  }

  /**
   * 일표본 t-검정 - Worker 2 래퍼
   */
  async oneSampleTTest(data: number[], popmean: number, alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTestOneSample(data, popmean)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df
    }
  }

  /**
   * 독립표본 t-검정 - Worker 2 래퍼
   */
  async twoSampleTTest(group1: number[], group2: number[], equalVar: boolean = true): Promise<any> {
    const result = await this.tTestTwoSample(group1, group2, equalVar)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df,
      mean1: result.mean1,
      mean2: result.mean2,
      meanDiff: result.meanDiff
    }
  }

  /**
   * 대응표본 t-검정 - Worker 2 래퍼
   */
  async pairedTTest(values1: number[], values2: number[], alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTestPaired(values1, values2)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df,
      meanDiff: result.meanDiff
    }
  }

  /**
   * 일원분산분석 - Worker 3 래퍼
   */
  async oneWayANOVA(groups: number[][]): Promise<any> {
    const result = await this.oneWayAnovaWorker(groups)
    return {
      fStatistic: result.fStatistic,
      pValue: result.pValue,
      dfBetween: result.dfBetween,
      dfWithin: result.dfWithin
    }
  }

  /**
   * 단순선형회귀 - 기존 regression 래퍼
   */
  async simpleLinearRegression(xValues: number[], yValues: number[]): Promise<any> {
    const result = await this.regression(xValues, yValues)
    return {
      slope: result.slope,
      intercept: result.intercept,
      rSquared: result.rSquared,
      fStatistic: result.fStatistic,
      pvalue: result.pvalue
    }
  }

  /**
   * 카이제곱 검정 - Worker 2 래퍼
   */
  async chiSquareTest(observedMatrix: number[][], correction: boolean = false): Promise<any> {
    const result = await this.chiSquareTestWorker(observedMatrix, correction)
    return {
      statistic: result.chiSquare,
      pValue: result.pValue,
      df: result.df
    }
  }

  /**
   * 주성분 분석 - 기존 pca 래퍼
   */
  async performPCA(dataMatrix: number[][], columns: string[], nComponents?: number, standardize: boolean = true): Promise<any> {
    const result = await this.pca(dataMatrix)

    // 누적 분산 계산
    const cumulativeVariance = []
    let cumSum = 0
    for (const ratio of result.explainedVariance) {
      cumSum += ratio
      cumulativeVariance.push(cumSum)
    }

    return {
      components: result.components,
      explainedVarianceRatio: result.explainedVariance,
      cumulativeVariance,
      totalExplainedVariance: result.totalExplainedVariance
    }
  }

  /**
   * 이원분산분석 (Two-way ANOVA) - Worker 3 사용
   */
  async twoWayAnova(
    data: Array<{ factor1: string; factor2: string; value: number }>
  ): Promise<{
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: Record<string, any>
  }> {
    if (!this.pyodide) throw new Error('Pyodide가 초기화되지 않았습니다')

    await this.ensureWorker3Loaded()

    // 데이터 변환: { factor1, factor2, value }[] → data_values, factor1_values, factor2_values
    const dataValues = data.map(d => d.value)
    const factor1Values = data.map(d => d.factor1)
    const factor2Values = data.map(d => d.factor2)

    const resultStr = await this.pyodide.runPythonAsync(`
      import json
      from worker3_module import two_way_anova

      data_values = ${JSON.stringify(dataValues)}
      factor1_values = ${JSON.stringify(factor1Values)}
      factor2_values = ${JSON.stringify(factor2Values)}

      try:
        result = two_way_anova(data_values, factor1_values, factor2_values)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Two-way ANOVA 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  /**
   * Tukey HSD 사후검정 (실제 구현)
   */
  async performTukeyHSD(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    // Worker 3의 tukeyHSD 사용
    const result = await this.tukeyHSD(groups)
    return {
      comparisons: result.comparisons,
      alpha,
      reject_count: result.comparisons.filter((c: any) => c.reject || c.pValue < alpha).length
    }
  }

  /**
   * 다중회귀분석 (Multiple Linear Regression)
   */
  async multipleRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수
    variableNames: string[] = []
  ): Promise<any> {
    await this.initialize()
    await this.ensureWorker4Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker4_module import multiple_regression

      X = ${JSON.stringify(X)}
      y = ${JSON.stringify(y)}

      try:
        result = multiple_regression(X, y)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Multiple regression 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  /**
   * 로지스틱 회귀분석 - Worker 4
   */
  async logisticRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수 (0 또는 1)
    variableNames: string[] = []
  ): Promise<any> {
    await this.initialize()
    await this.ensureWorker4Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker4_module import logistic_regression

      X = ${JSON.stringify(X)}
      y = ${JSON.stringify(y)}

      try:
        result = logistic_regression(X, y)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Logistic regression 실행 실패: ${parsed.error}`)
    }

    return parsed
  }

  /**
   * 상관 분석
   */
  async calculateCorrelation(columnsData: Record<string, number[]>, method: string = 'pearson'): Promise<any> {
    const columns = Object.keys(columnsData)
    const matrix = []

    for (let i = 0; i < columns.length; i++) {
      const row = []
      for (let j = 0; j < columns.length; j++) {
        if (i === j) {
          row.push(1)
        } else {
          const result = await this.correlation(
            columnsData[columns[i]],
            columnsData[columns[j]]
          )
          if (method == 'spearman') {
            row.push(result.spearman.r)
          } else if (method == 'kendall') {
            row.push(result.kendall.r)
          } else {
            row.push(result.pearson.r)
          }
        }
      }
      matrix.push(row)
    }

    return { matrix }
  }

  /**
   * Dunn Test (비모수 사후검정) - 직접 구현
   *
   * 구현 기준: Dunn, O.J. (1964). "Multiple comparisons using rank sums". Technometrics, 6(3), 241-252.
   *
   * 검증 방법:
   * - R: dunn.test::dunn.test(x, g, method="holm", kw=TRUE, label=TRUE)
   * - Python: scikit_posthocs.posthoc_dunn(data, val_col='values', group_col='groups', p_adjust='holm')
   * - 온라인 계산기: https://www.statskingdom.com/kruskal-wallis-test-calculator.html
   *
   * 참고: 본 구현은 원논문의 공식을 정확히 따르며, ties 보정을 포함합니다.
   * p-value 보정 방법: Bonferroni, Holm, FDR(Benjamini-Hochberg) 지원
   */
  async dunnTest(
    groups: number[][],
    groupNames: string[],
    pAdjust: string = 'holm',
    alpha: number = 0.05
  ): Promise<any> {
    await this.initialize()
    await this.ensureWorker3Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker3_module import dunn_test

      groups = ${JSON.stringify(groups)}

      try:
        result = dunn_test(groups, p_adjust='${pAdjust}')
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Dunn test 실행 실패: ${parsed.error}`)
    }

    // groupNames 매핑 추가
    const comparisons = parsed.comparisons.map((comp: any) => ({
      ...comp,
      group1: groupNames[comp.group1] || comp.group1,
      group2: groupNames[comp.group2] || comp.group2
    }))

    return {
      ...parsed,
      comparisons,
      alpha
    }
  }

  /**
   * Games-Howell Test (등분산 가정하지 않는 사후검정) - 직접 구현
   *
   * 구현 기준: Games, P.A., & Howell, J.F. (1976). "Pairwise multiple comparison procedures
   * with unequal n's and/or variances: A Monte Carlo study". Journal of Educational Statistics, 1(2), 113-125.
   *
   * 검증 방법:
   * - R: PMCMRplus::gamesHowellTest(x ~ g, data = mydata)
   * - R: rstatix::games_howell_test(data, value ~ group)
   * - Python: scikit_posthocs.posthoc_games_howell(data, val_col='values', group_col='groups')
   * - SPSS: Analyze > Compare Means > One-Way ANOVA > Post Hoc > Games-Howell
   *
   * 참고:
   * - Welch-Satterthwaite 자유도 근사 사용
   * - 본 구현은 Studentized range distribution 대신 t-distribution을 사용 (더 보수적)
   * - 등분산을 가정하지 않아 Tukey HSD보다 robust함
   */
  async gamesHowellTest(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    await this.initialize()
    await this.ensureWorker3Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker3_module import games_howell_test

      groups = ${JSON.stringify(groups)}

      try:
        result = games_howell_test(groups)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)

    if (parsed.error) {
      throw new Error(`Games-Howell test 실행 실패: ${parsed.error}`)
    }

    // groupNames 매핑 추가
    const comparisons = parsed.comparisons.map((comp: any) => ({
      ...comp,
      group1: groupNames[comp.group1] || comp.group1,
      group2: groupNames[comp.group2] || comp.group2
    }))

    return {
      ...parsed,
      comparisons,
      alpha,
      significant_count: comparisons.filter((c: any) => c.pValue < alpha).length
    }
  }

  /**
   * Bonferroni 사후검정 - Worker 2 t-test 사용
   */
  async performBonferroni(groups: number[][], groupNames: string[], alpha: number = 0.05): Promise<any> {
    await this.initialize()
    await this.ensureWorker2Loaded()

    const n_groups = groups.length
    const num_comparisons = n_groups * (n_groups - 1) / 2
    const adjusted_alpha = alpha / num_comparisons

    const comparisons = []

    // 모든 쌍 비교
    for (let i = 0; i < n_groups; i++) {
      for (let j = i + 1; j < n_groups; j++) {
        const result = await this.tTestTwoSample(groups[i], groups[j])

        // Bonferroni 보정
        const adjusted_p = Math.min(result.pValue * num_comparisons, 1.0)

        comparisons.push({
          group1: groupNames[i],
          group2: groupNames[j],
          mean_diff: result.meanDiff,
          t_statistic: result.statistic,
          p_value: result.pValue,
          adjusted_p: adjusted_p,
          significant: adjusted_p < alpha
        })
      }
    }

    return {
      comparisons,
      num_comparisons,
      original_alpha: alpha,
      adjusted_alpha,
      significant_count: comparisons.filter(c => c.significant).length
    }
  }

  // ========================================
  // Worker 3: Nonparametric & ANOVA Methods
  // ========================================

  async mannWhitneyTestWorker(group1: number[], group2: number[]): Promise<{
    statistic: number
    pValue: number
    uStatistic: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      uStatistic: number
    }>(
      3,
      'mann_whitney_test',
      { group1, group2 },
      { errorMessage: 'Mann-Whitney test 실행 실패' }
    )
  }

  async wilcoxonTestWorker(values1: number[], values2: number[]): Promise<{
    statistic: number
    pValue: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
    }>(
      3,
      'wilcoxon_test',
      { values1, values2 },
      { errorMessage: 'Wilcoxon test 실행 실패' }
    )
  }

  async kruskalWallisTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    df: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
    }>(
      3,
      'kruskal_wallis_test',
      { groups },
      { errorMessage: 'Kruskal-Wallis test 실행 실패' }
    )
  }

  async friedmanTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    rankings: number[]
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      rankings: number[]
    }>(
      3,
      'friedman_test',
      { groups },
      { errorMessage: 'Friedman test 실행 실패' }
    )
  }

  async oneWayAnovaWorker(groups: number[][]): Promise<{
    fStatistic: number
    pValue: number
    dfBetween: number
    dfWithin: number
  }> {
    return this.callWorkerMethod<{
      fStatistic: number
      pValue: number
      dfBetween: number
      dfWithin: number
    }>(
      3,
      'one_way_anova',
      { groups },
      { errorMessage: 'One-way ANOVA 실행 실���' }
    )
  }

  async twoWayAnovaWorker(dataValues: number[], factor1Values: (string | number)[], factor2Values: (string | number)[]): Promise<{
    mainEffect1: { fStatistic: number; pValue: number }
    mainEffect2: { fStatistic: number; pValue: number }
    interaction: { fStatistic: number; pValue: number }
  }> {
    return this.callWorkerMethod<{
      mainEffect1: { fStatistic: number; pValue: number }
      mainEffect2: { fStatistic: number; pValue: number }
      interaction: { fStatistic: number; pValue: number }
    }>(
      3,
      'two_way_anova',
      { data_values: dataValues, factor1_values: factor1Values, factor2_values: factor2Values },
      { errorMessage: 'Two-way ANOVA 실행 실패' }
    )
  }

  async tukeyHSDWorker(groups: number[][]): Promise<{
    comparisons: Array<{
      group1: number
      group2: number
      meanDiff: number
      pValue: number
      reject: boolean
    }>
  }> {
    return this.callWorkerMethod<{
      comparisons: Array<{
        group1: number
        group2: number
        meanDiff: number
        pValue: number
        reject: boolean
      }>
    }>(
      3,
      'tukey_hsd',
      { groups },
      { errorMessage: 'Tukey HSD test 실행 실패' }
    )
  }

  async signTestWorker(before: number[], after: number[]): Promise<{
    statistic: number
    pValue: number
    nPositive: number
    nNegative: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      nPositive: number
      nNegative: number
    }>(
      3,
      'sign_test',
      { before, after },
      { errorMessage: 'Sign test 실행 실패' }
    )
  }

  async runsTestWorker(sequence: (number | string)[]): Promise<{
    nRuns: number
    expectedRuns: number
    zStatistic: number
    pValue: number
  }> {
    return this.callWorkerMethod<{
      nRuns: number
      expectedRuns: number
      zStatistic: number
      pValue: number
    }>(
      3,
      'runs_test',
      { sequence },
      { errorMessage: 'Runs test 실행 실패' }
    )
  }

  async mcnemarTestWorker(contingencyTable: number[][]): Promise<{
    statistic: number
    pValue: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
    }>(
      3,
      'mcnemar_test',
      { contingency_table: contingencyTable },
      { errorMessage: 'McNemar test 실행 실패' }
    )
  }

  async cochranQTestWorker(dataMatrix: number[][]): Promise<{
    qStatistic: number
    pValue: number
    df: number
  }> {
    return this.callWorkerMethod<{
      qStatistic: number
      pValue: number
      df: number
    }>(
      3,
      'cochran_q_test',
      { data_matrix: dataMatrix },
      { errorMessage: 'Cochran Q test 실행 실패' }
    )
  }

  async moodMedianTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    grandMedian: number
  }> {
    return this.callWorkerMethod<{
      statistic: number
      pValue: number
      grandMedian: number
    }>(
      3,
      'mood_median_test',
      { groups },
      { errorMessage: 'Mood median test 실행 실패' }
    )
  }

  async repeatedMeasuresAnovaWorker(
    dataMatrix: number[][],
    subjectIds: (string | number)[],
    timeLabels: (string | number)[]
  ): Promise<{
    fStatistic: number
    pValue: number
    df: { between: number; within: number }
  }> {
    return this.callWorkerMethod<{
      fStatistic: number
      pValue: number
      df: { between: number; within: number }
    }>(
      3,
      'repeated_measures_anova',
      { data_matrix: dataMatrix, subject_ids: subjectIds, time_labels: timeLabels },
      { errorMessage: 'Repeated measures ANOVA 실행 실패' }
    )
  }

  async ancovaWorker(yValues: number[], groupValues: (string | number)[], covariates: number[][]): Promise<{
    fStatistic: number
    pValue: number
    adjustedMeans: number[]
  }> {
    return this.callWorkerMethod<{
      fStatistic: number
      pValue: number
      adjustedMeans: number[]
    }>(
      3,
      'ancova',
      { y_values: yValues, group_values: groupValues, covariates },
      { errorMessage: 'ANCOVA 실행 실패' }
    )
  }

  async manovaWorker(
    dataMatrix: number[][],
    groupValues: (string | number)[],
    varNames: string[]
  ): Promise<{
    wilksLambda: number
    fStatistic: number
    pValue: number
  }> {
    await this.initialize()
    await this.ensureWorker3Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker3_module import manova

      data_matrix = ${JSON.stringify(dataMatrix)}
      group_values = ${JSON.stringify(groupValues)}
      var_names = ${JSON.stringify(varNames)}

      try:
        result = manova(data_matrix, group_values, var_names)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)
    if (parsed.error) throw new Error(`MANOVA 실행 실패: ${parsed.error}`)
    return parsed
  }

  async scheffeTestWorker(groups: number[][]): Promise<{
    comparisons: Array<{
      group1: number
      group2: number
      meanDiff: number
      fStatistic: number
      pValue: number
      reject: boolean
    }>
  }> {
    await this.initialize()
    await this.ensureWorker3Loaded()

    const resultStr = await this.pyodide!.runPythonAsync(`
      import json
      from worker3_module import scheffe_test

      groups = ${JSON.stringify(groups)}

      try:
        result = scheffe_test(groups)
        result_json = json.dumps(result)
      except Exception as e:
        result_json = json.dumps({'error': str(e)})

      result_json
    `)

    const parsed = this.parsePythonResult<any>(resultStr)
    if (parsed.error) throw new Error(`Scheffe test 실행 실패: ${parsed.error}`)
    return parsed
  }

  /**
   * Pyodide 초기화 여부 확인
   */

  /**
   * 카이제곱 적합도 검정 (Chi-Square Goodness of Fit Test)
   */
  async chiSquareGoodnessTest(
    observed: number[],
    expected?: number[] | null,
    alpha: number = 0.05
  ): Promise<{
    chiSquare: number
    pValue: number
    degreesOfFreedom: number
    criticalValue: number
    reject: boolean
    observed: number[]
    expected: number[]
  }> {
    return this.callWorkerMethod<{
      chiSquare: number
      pValue: number
      degreesOfFreedom: number
      criticalValue: number
      reject: boolean
      observed: number[]
      expected: number[]
    }>(
      2,
      'chi_square_goodness_test',
      { observed, expected: expected ?? null, alpha },
      { errorMessage: 'Chi-square goodness of fit test 실행 실패' }
    )
  }

  /**
   * 카이제곱 독립성 검정 (Chi-Square Test of Independence)
   */
  async chiSquareIndependenceTest(
    observedMatrix: number[][],
    yatesCorrection: boolean = false,
    alpha: number = 0.05
  ): Promise<{
    chiSquare: number
    pValue: number
    degreesOfFreedom: number
    criticalValue: number
    reject: boolean
    cramersV: number
    observedMatrix: number[][]
    expectedMatrix: number[][]
  }> {
    return this.callWorkerMethod<{
      chiSquare: number
      pValue: number
      degreesOfFreedom: number
      criticalValue: number
      reject: boolean
      cramersV: number
      observedMatrix: number[][]
      expectedMatrix: number[][]
    }>(
      2,
      'chi_square_independence_test',
      { observed_matrix: observedMatrix, yates_correction: yatesCorrection, alpha },
      { errorMessage: 'Chi-square independence test 실행 실패' }
    )
  }


  // ========================================
  // 메서드 별칭 (Method Aliases)
  // 레거시 코드 호환성을 위한 별칭
  // ========================================

  /**
   * 별칭: calculateDescriptiveStats → descriptiveStats
   */
  async calculateDescriptiveStats(data: number[]): Promise<any> {
    return this.descriptiveStats(data)
  }

  /**
   * 별칭: twoWayANOVA → twoWayAnovaWorker
   */
  async twoWayANOVA(...args: Parameters<typeof this.twoWayAnovaWorker>): Promise<ReturnType<typeof this.twoWayAnovaWorker>> {
    return this.twoWayAnovaWorker(...args)
  }

  /**
   * 별칭: repeatedMeasuresAnova → repeatedMeasuresAnovaWorker
   */
  async repeatedMeasuresAnova(...args: Parameters<typeof this.repeatedMeasuresAnovaWorker>): Promise<ReturnType<typeof this.repeatedMeasuresAnovaWorker>> {
    return this.repeatedMeasuresAnovaWorker(...args)
  }

  isInitialized(): boolean {
    const initialized = this.pyodide !== null
    console.log(`[PyodideService.isInitialized] ${initialized ? '초기화됨' : '초기화 안됨'}`)
    return initialized
  }

  /**
   * Pyodide 인스턴스 정리
   */
  dispose(): void {
    if (this.pyodide) {
      this.pyodide = null
    }
    PyodideStatisticsService.instance = null
  }
}

// 싱글톤 인스턴스 export
export const pyodideStats = PyodideStatisticsService.getInstance()