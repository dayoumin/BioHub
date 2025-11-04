/**
 * PyodideCore 서비스
 *
 * Pyodide 초기화, Worker 로딩, Helper 함수 제공
 * 모든 Worker 서비스의 기반 클래스
 *
 * @module PyodideCoreService
 * @description
 * - Singleton 패턴으로 Pyodide 인스턴스 관리
 * - Worker 파일 동적 로딩 및 캐싱
 * - Worker 메서드 호출을 위한 공통 헬퍼 함수
 * - NumPy + SciPy 초기 로딩, 추가 패키지는 Lazy Loading
 *
 * @example
 * ```typescript
 * const core = PyodideCoreService.getInstance()
 * await core.initialize()
 *
 * const result = await core.callWorkerMethod<LinearRegressionResult>(
 *   4,
 *   'linear_regression',
 *   { x: [1, 2, 3], y: [2, 4, 6] }
 * )
 * ```
 */

import type { PyodideInterface } from '@/types/pyodide'
import { getPyodideCDNUrls } from '@/lib/constants'

// ========================================
// 타입 정의
// ========================================

/**
 * Worker 메서드 호출 파라미터 타입
 * JSON 직렬화 가능한 타입만 허용
 */
export type WorkerMethodParam =
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
export interface WorkerMethodOptions {
  errorMessage?: string
  skipValidation?: boolean
}

/**
 * Python 에러 응답 타입
 */
export interface PythonErrorResponse {
  error: string
}

/**
 * 통계 분석 결과의 기본 인터페이스
 *
 * 모든 통계 분석 메서드의 반환 타입으로 사용
 * 구체적인 필드는 선택사항이므로 다양한 결과 형태를 지원
 */
export interface StatisticsResult {
  // 기본 통계량
  statistic?: number
  pValue?: number
  testStatistic?: number

  // T-test 관련
  tStatistic?: number
  cohensD?: number
  mean1?: number
  mean2?: number
  std1?: number
  std2?: number
  se1?: number
  se2?: number
  df?: number

  // 상관계수 관련
  correlation?: number
  rValue?: number
  pearsonR?: number
  spearmanRho?: number
  kendallTau?: number

  // 카이제곱 관련
  chiSquare?: number
  cramersV?: number

  // 효과크기
  effectSize?: number
  eta?: number
  etaSquared?: number
  omegaSquared?: number

  // 신뢰구간
  confidenceInterval?: {
    lower: number
    upper: number
  }

  // 회귀 관련
  slope?: number
  intercept?: number
  rSquared?: number
  adjustedRSquared?: number
  rmse?: number

  // 회귀 관련 추가
  adjRSquared?: number
  fStatistic?: number
  accuracy?: number
  auc?: number

  // 기타 통계량
  meanDiff?: number
  sampleMean?: number
  zStatistic?: number
  qStatistic?: number
  hStatistic?: number
  wStatistic?: number
  uStatistic?: number
  tValue?: number
  fValue?: number
  chiSquareValue?: number
  sValue?: number  // S-statistic
  qValue?: number  // Q-statistic (Cochran)

  // 기술통계 관련
  mean?: number
  median?: number
  mode?: number
  std?: number
  variance?: number
  min?: number
  max?: number
  range?: number
  q1?: number
  q3?: number
  iqr?: number
  skewness?: number
  kurtosis?: number

  // 이상치 탐지 관련
  outlierIndices?: number[]
  outlierValues?: number[]

  // 비율 검정 관련
  sampleProportion?: number
  nullProportion?: number
  pValueExact?: number
  significant?: boolean

  // 신뢰도 분석 관련
  alpha?: number  // Cronbach's alpha

  // 일반 결과
  interpretation?: string
  success?: boolean
  error?: string

  // 추가 메타데이터
  [key: string]: unknown
}

// ========================================
// 상수
// ========================================

/**
 * Worker별 추가 패키지 정의 (Phase 5-2 Lazy Loading)
 *
 * - Worker 1: 추가 패키지 없음 (NumPy + SciPy만 사용)
 * - Worker 2: statsmodels + pandas (partial correlation 등)
 * - Worker 3: statsmodels + pandas (ANOVA, post-hoc 등)
 * - Worker 4: statsmodels + scikit-learn (회귀, PCA 등)
 */
export const WORKER_EXTRA_PACKAGES = Object.freeze<Record<1 | 2 | 3 | 4, readonly string[]>>({
  1: [],
  2: ['statsmodels', 'pandas'],
  3: ['statsmodels', 'pandas'],
  4: ['statsmodels', 'scikit-learn']
})

// ========================================
// Global 타입 선언
// ========================================

declare global {
  interface Window {
    pyodide?: PyodideInterface
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}

// ========================================
// PyodideCore 서비스 클래스
// ========================================

export class PyodideCoreService {
  // Singleton
  private static instance: PyodideCoreService | null = null

  // Instance variables
  private pyodide: PyodideInterface | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private packagesLoaded = false
  private loadedWorkers: Set<number> = new Set()

  /**
   * Private constructor (Singleton 패턴)
   */
  private constructor() {}

  // ========================================
  // Public API - Singleton
  // ========================================

  /**
   * PyodideCoreService 인스턴스 가져오기
   *
   * @returns PyodideCoreService 싱글톤 인스턴스
   */
  static getInstance(): PyodideCoreService {
    if (!this.instance) {
      this.instance = new PyodideCoreService()
    }
    return this.instance
  }

  /**
   * 싱글톤 인스턴스 초기화 (테스트용)
   *
   * @internal
   */
  static resetInstance(): void {
    this.instance = null
  }

  // ========================================
  // Public API - 초기화
  // ========================================

  /**
   * Pyodide 초기화 및 기본 패키지 로드
   *
   * - Pyodide CDN에서 라이브러리 로드
   * - NumPy + SciPy 패키지 로드 (~2초)
   * - pandas는 Worker 필요 시 lazy loading
   *
   * @throws {Error} Pyodide 로드 실패 시
   */
  async initialize(): Promise<void> {
    // 이미 초기화된 경우
    if (this.pyodide) {
      return
    }

    // 이미 로딩 중인 경우 (Promise 재사용)
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true

    this.loadPromise = (async () => {
      try {
        // Pyodide 로드
        this.pyodide = await this._loadPyodide()

        // 기본 패키지 로드 (NumPy + SciPy만)
        await this.pyodide.loadPackage(['numpy', 'scipy'])

        this.packagesLoaded = true
        this.isLoading = false

        console.log('✅ Pyodide 초기화 완료 (NumPy + SciPy)')
      } catch (error) {
        this.isLoading = false
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Pyodide 초기화 실패: ${errorMessage}`)
      }
    })()

    return this.loadPromise
  }

  /**
   * Pyodide 초기화 상태 확인
   *
   * @returns 초기화 완료 여부
   */
  isInitialized(): boolean {
    return this.pyodide !== null
  }

  /**
   * Pyodide 인스턴스 및 리소스 정리
   */
  dispose(): void {
    this.pyodide = null
    this.isLoading = false
    this.loadPromise = null
    this.packagesLoaded = false
    this.loadedWorkers.clear()
  }

  // ========================================
  // Public API - Worker 관리
  // ========================================

  /**
   * Worker 파일 로드 (Lazy Loading)
   *
   * @param workerNumber Worker 번호 (1-4)
   * @throws {Error} Pyodide가 초기화되지 않은 경우
   */
  async ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4): Promise<void> {
    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.')
    }

    // 캐시 확인
    const workerName = this.getWorkerFileName(workerNumber)
    const checkCode = `'${workerName}' in sys.modules`
    const isLoaded = await this.pyodide.runPythonAsync(checkCode)

    if (isLoaded === 'True') {
      return // 이미 로드됨
    }

    // Worker Python 파일 로드
    const response = await fetch(`/workers/python/${workerName}.py`)
    if (!response.ok) {
      throw new Error(`Worker ${workerNumber} 파일 로드 실패: ${response.statusText}`)
    }

    const workerCode = await response.text()

    // Python 코드 실행 (sys.modules에 등록)
    await this.pyodide.runPythonAsync(workerCode)

    // 추가 패키지 로드 (백그라운드)
    await this.loadAdditionalPackages(workerNumber)

    this.loadedWorkers.add(workerNumber)
    console.log(`✅ Worker ${workerNumber} 로드 완료: ${workerName}`)
  }

  /**
   * Worker 1 (Descriptive) 로드
   */
  async ensureWorker1Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(1)
  }

  /**
   * Worker 2 (Hypothesis) 로드
   */
  async ensureWorker2Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(2)
  }

  /**
   * Worker 3 (Nonparametric/ANOVA) 로드
   */
  async ensureWorker3Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(3)
  }

  /**
   * Worker 4 (Regression/Advanced) 로드
   */
  async ensureWorker4Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(4)
  }

  // ========================================
  // Public API - Helper 함수
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
   *
   * @example
   * ```typescript
   * const result = await core.callWorkerMethod<LinearRegressionResult>(
   *   4,
   *   'linear_regression',
   *   { x: [1, 2, 3], y: [2, 4, 6] }
   * )
   * ```
   */
  async callWorkerMethod<T>(
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

    // 2. 파라미터 검증 (skipValidation이 true가 아닌 경우)
    if (!options.skipValidation) {
      for (const [key, value] of Object.entries(params)) {
        this.validateWorkerParam(value, key)
      }
    }

    // 3. Python 호출 코드 생성
    const paramsList: string[] = []
    for (const [key, value] of Object.entries(params)) {
      const jsonValue = JSON.stringify(value)
      paramsList.push(`${key}=json.loads('${jsonValue.replace(/'/g, "\\'")}')`)
    }

    const pythonCode = `
import json
result = ${methodName}(${paramsList.join(', ')})
json.dumps(result)
    `.trim()

    // 4. Python 실행
    try {
      const rawResult = await this.pyodide.runPythonAsync(pythonCode)
      const parsed = this.parsePythonResult<T>(rawResult)

      return parsed
    } catch (error) {
      const errorMessage = options.errorMessage || `Worker ${workerNum} 메서드 ${methodName} 실행 실패`
      const errorDetail = error instanceof Error ? error.message : String(error)
      throw new Error(`${errorMessage}: ${errorDetail}`)
    }
  }

  /**
   * Python 에러 응답 타입 가드
   *
   * @param obj 검사할 객체
   * @returns Python 에러 응답 여부
   */
  isPythonError(obj: unknown): obj is PythonErrorResponse {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'error' in obj &&
      typeof (obj as Record<string, unknown>).error === 'string'
    )
  }

  /**
   * 통계 결과 필드 존재 여부 확인
   *
   * @param result 결과 객체
   * @param fields 확인할 필드명들
   * @returns 모든 필드가 존재하고 number 타입인지 여부
   */
  hasStatisticFields(result: StatisticsResult, fields: string[]): boolean {
    return fields.every(
      (field) =>
        field in result &&
        typeof (result as Record<string, unknown>)[field] === 'number'
    )
  }

  /**
   * 통계 결과에서 안전하게 숫자 필드 추출
   *
   * @param result 결과 객체
   * @param fieldName 필드명
   * @param defaultValue 기본값 (필드가 없을 때)
   * @returns 추출된 숫자 또는 기본값
   */
  getStatisticValue(
    result: StatisticsResult,
    fieldName: string,
    defaultValue: number = 0
  ): number {
    const value = (result as Record<string, unknown>)[fieldName]
    return typeof value === 'number' ? value : defaultValue
  }

  // ========================================
  // Private 메서드
  // ========================================

  /**
   * Pyodide CDN 로드
   *
   * @returns Pyodide 인스턴스
   * @throws {Error} CDN 로드 실패 시
   */
  private async _loadPyodide(): Promise<PyodideInterface> {
    const { scriptURL, indexURL } = getPyodideCDNUrls()

    // CDN 스크립트 로드
    const script = document.createElement('script')
    script.src = scriptURL

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Pyodide CDN 로드 실패'))
      document.head.appendChild(script)
    })

    // Pyodide 인스턴스 생성
    if (!window.loadPyodide) {
      throw new Error('loadPyodide 함수를 찾을 수 없습니다')
    }

    const pyodide = await window.loadPyodide({ indexURL })

    return pyodide
  }

  /**
   * Worker 파일명 매핑
   *
   * @param workerNumber Worker 번호
   * @returns Worker 파일명 (확장자 제외)
   */
  private getWorkerFileName(workerNumber: number): string {
    const fileNames: Record<number, string> = {
      1: 'worker1-descriptive',
      2: 'worker2-hypothesis',
      3: 'worker3-nonparametric-anova',
      4: 'worker4-regression-advanced'
    }
    return fileNames[workerNumber] || 'worker1-descriptive'
  }

  /**
   * Worker별 추가 패키지 로드 (Lazy Loading with Retry & Timeout)
   *
   * @param workerNumber Worker 번호
   */
  private async loadAdditionalPackages(workerNumber: number): Promise<void> {
    const packages = WORKER_EXTRA_PACKAGES[workerNumber as 1 | 2 | 3 | 4]

    if (!packages || packages.length === 0) {
      return // Worker 1은 추가 패키지 없음
    }

    if (!this.pyodide) {
      throw new Error('Pyodide가 초기화되지 않았습니다')
    }

    const MAX_RETRIES = 3
    const TIMEOUT_MS = 30000 // 30초

    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i]
      let retryCount = 0

      while (retryCount < MAX_RETRIES) {
        try {
          console.log(`📦 Worker ${workerNumber}: ${pkg} 로딩 중... (${i + 1}/${packages.length})`)

          // 타임아웃과 함께 패키지 로드
          await Promise.race([
            this.pyodide.loadPackage([pkg]),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
            )
          ])

          console.log(`✅ Worker ${workerNumber}: ${pkg} 로드 완료`)
          break // 성공 시 다음 패키지로

        } catch (error) {
          retryCount++
          const errorMessage = error instanceof Error ? error.message : String(error)

          if (retryCount >= MAX_RETRIES) {
            // 최대 재시도 횟수 초과
            console.error(
              `❌ Worker ${workerNumber}: ${pkg} 로드 실패 (${MAX_RETRIES}회 시도)\n` +
              `   에러: ${errorMessage}`
            )
            // 사용자 알림 (선택사항 - 토스트 등으로 확장 가능)
            if (typeof window !== 'undefined') {
              // TODO: 토스트 알림 추가
              console.warn(`⚠️ ${pkg} 패키지를 로드하지 못했습니다. 일부 기능이 제한될 수 있습니다.`)
            }
            break // 실패해도 다음 패키지 시도
          }

          // 재시도 전 대기 (지수 백오프)
          const waitTime = 1000 * retryCount
          console.warn(
            `⏳ Worker ${workerNumber}: ${pkg} 재시도 중... (${retryCount}/${MAX_RETRIES}), ` +
            `${waitTime}ms 후 재시도`
          )
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }

    console.log(`🎉 Worker ${workerNumber}: 모든 패키지 로드 완료`)
  }

  /**
   * Worker 파라미터 검증
   *
   * JSON 직렬화 가능 여부 및 유효성 검사
   *
   * @param param 검증할 파라미터
   * @param paramName 파라미터 이름 (에러 메시지용)
   * @throws {Error} 유효하지 않은 파라미터인 경우
   */
  private validateWorkerParam(param: unknown, paramName?: string): void {
    const prefix = paramName ? `파라미터 '${paramName}'` : '파라미터'

    // undefined 체크
    if (param === undefined) {
      throw new Error(`${prefix}가 undefined입니다`)
    }

    // null은 허용
    if (param === null) {
      return
    }

    // 숫자 검증
    if (typeof param === 'number') {
      if (isNaN(param) || !isFinite(param)) {
        throw new Error(`${prefix}가 유효하지 않은 숫자입니다 (NaN 또는 Infinity)`)
      }
      return
    }

    // 문자열/불린은 허용
    if (typeof param === 'string' || typeof param === 'boolean') {
      return
    }

    // 배열 검증
    if (Array.isArray(param)) {
      param.forEach((item, index) => {
        if (typeof item === 'number' && (isNaN(item) || !isFinite(item))) {
          throw new Error(`${prefix}[${index}]가 유효하지 않은 숫자입니다 (NaN 또는 Infinity)`)
        }

        // 2D 배열 검증
        if (Array.isArray(item)) {
          item.forEach((subItem, subIndex) => {
            if (typeof subItem === 'number' && (isNaN(subItem) || !isFinite(subItem))) {
              throw new Error(
                `${prefix}[${index}][${subIndex}]가 유효하지 않은 숫자입니다 (NaN 또는 Infinity)`
              )
            }
          })
        }
      })
      return
    }

    // 그 외 타입은 허용하지 않음
    throw new Error(
      `${prefix}가 지원하지 않는 타입입니다 (number | string | boolean | Array만 허용)`
    )
  }

  /**
   * Python 실행 결과 파싱
   *
   * @template T 반환 타입
   * @param result Python 실행 결과 (JSON 문자열 또는 객체)
   * @returns 파싱된 결과
   */
  private parsePythonResult<T>(result: unknown): T {
    // 문자열인 경우 JSON 파싱 시도
    if (typeof result === 'string') {
      try {
        return JSON.parse(result) as T
      } catch {
        // JSON 파싱 실패 시 문자열 그대로 반환
        return result as T
      }
    }

    // 이미 객체인 경우 그대로 반환
    return result as T
  }

  // ========================================
  // Convenience Methods for Statistics
  // ========================================

  /**
   * Two Sample T-Test
   */
  async twoSampleTTest(
    group1: number[],
    group2: number[],
    equalVar: boolean
  ): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'two_sample_ttest', {
      group1,
      group2,
      equal_var: equalVar
    })
  }

  /**
   * Paired T-Test
   */
  async pairedTTest(group1: number[], group2: number[]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'paired_ttest', { group1, group2 })
  }

  /**
   * One Sample T-Test
   */
  async oneSampleTTest(data: number[], testValue: number): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'one_sample_ttest', { data, test_value: testValue })
  }

  /**
   * Z-Test
   */
  async zTestWorker(data: number[], testValue: number, populationStd: number): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'z_test', {
      data,
      test_value: testValue,
      population_std: populationStd
    })
  }

  /**
   * Chi-Square Test
   */
  async chiSquareTest(observed: number[], expected: number[]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'chi_square_test', { observed, expected })
  }

  /**
   * Binomial Test
   */
  async binomialTestWorker(
    successes: number,
    trials: number,
    probability: number
  ): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'binomial_test', { successes, trials, probability })
  }

  /**
   * Correlation Test (Pearson)
   */
  async correlationTest(x: number[], y: number[]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'correlation_test', { x, y })
  }

  /**
   * Partial Correlation Test
   */
  async partialCorrelationWorker(
    x: number[],
    y: number[],
    controlVars: number[][]
  ): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'partial_correlation', {
      x,
      y,
      control_vars: controlVars
    })
  }

  /**
   * Mann-Whitney U Test
   */
  async mannWhitneyTestWorker(group1: number[], group2: number[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'mann_whitney_test', { group1, group2 })
  }

  /**
   * Wilcoxon Test
   */
  async wilcoxonTestWorker(group1: number[], group2: number[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'wilcoxon_test', { group1, group2 })
  }

  /**
   * Kruskal-Wallis Test
   */
  async kruskalWallisTestWorker(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'kruskal_wallis_test', { groups })
  }

  /**
   * Friedman Test
   */
  async friedmanTestWorker(data: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'friedman_test', { data })
  }

  /**
   * Sign Test
   */
  async signTestWorker(group1: number[], group2: number[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'sign_test', { group1, group2 })
  }

  /**
   * Runs Test
   */
  async runsTestWorker(data: number[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'runs_test', { data })
  }

  /**
   * McNemar Test
   */
  async mcnemarTestWorker(
    tableCells: number[][]
  ): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'mcnemar_test', { table_cells: tableCells })
  }

  /**
   * Cochran Q Test
   */
  async cochranQTestWorker(data: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'cochran_q_test', { data })
  }

  /**
   * Mood Median Test
   */
  async moodMedianTestWorker(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'mood_median_test', { groups })
  }

  /**
   * Simple Linear Regression
   */
  async simpleLinearRegression(x: number[], y: number[]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'simple_linear_regression', { x, y })
  }

  /**
   * Multiple Regression
   */
  async multipleRegression(y: number[], x: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'multiple_regression', { y, x })
  }

  /**
   * Logistic Regression
   */
  async logisticRegression(y: number[], x: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'logistic_regression', { y, x })
  }

  // ============================================================================
  // ANOVA Methods (Worker 3 & 4)
  // ============================================================================

  /**
   * One-Way ANOVA
   */
  async oneWayANOVA(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'one_way_anova', { groups })
  }

  /**
   * Two-Way ANOVA
   */
  async twoWayAnova(data: number[][], factorA: string[], factorB: string[]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'two_way_anova', { data, factor_a: factorA, factor_b: factorB })
  }

  /**
   * Repeated Measures ANOVA
   */
  async repeatedMeasuresAnovaWorker(data: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'repeated_measures_anova', { data })
  }

  /**
   * ANCOVA (Analysis of Covariance)
   */
  async ancovaWorker(y: number[], x: number[][], covariate: number[]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'ancova', { y, x, covariate })
  }

  /**
   * MANOVA (Multivariate ANOVA)
   */
  async manovaWorker(y: number[][], x: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'manova', { y, x })
  }

  /**
   * Tukey HSD (Honestly Significant Difference) Post-Hoc Test
   */
  async tukeyHSD(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'tukey_hsd', { groups })
  }

  /**
   * Scheffe Test Post-Hoc
   */
  async scheffeTestWorker(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'scheffe_test', { groups })
  }

  /**
   * Bonferroni Correction
   */
  async performBonferroni(pValues: number[], alpha?: number): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'bonferroni_correction', { p_values: pValues, alpha: alpha ?? 0.05 })
  }

  /**
   * Games-Howell Test (non-parametric alternative to Tukey HSD)
   */
  async gamesHowellTest(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'games_howell_test', { groups })
  }

  // ============================================================================
  // Descriptive Statistics Methods
  // ============================================================================

  /**
   * Descriptive Statistics (Mean, Median, Std, etc.)
   */
  async descriptiveStats(data: number[], groupBy?: string[]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'descriptive_stats', {
      data,
      group_by: groupBy ?? []
    })
  }

  /**
   * Shapiro-Wilk Test for Normality
   */
  async shapiroWilkTest(data: number[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'shapiro_wilk_test', { data })
  }

  /**
   * Outlier Detection
   */
  async outlierDetection(data: number[], method?: 'iqr' | 'zscore' | 'isolation'): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'outlier_detection', { data, method: method ?? 'iqr' })
  }

  /**
   * One Sample Proportion Test
   */
  async oneSampleProportionTest(successes: number, trials: number, hypothesizedProp?: number): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'one_sample_proportion_test', {
      successes,
      trials,
      hypothesized_prop: hypothesizedProp ?? 0.5
    })
  }

  /**
   * Cronbach's Alpha (Internal Consistency)
   */
  async cronbachAlpha(data: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'cronbach_alpha', { data })
  }

  // ============================================================================
  // Advanced Methods
  // ============================================================================

  /**
   * Principal Component Analysis (PCA)
   */
  async pca(data: number[][], nComponents?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'pca', { data, n_components: nComponents ?? 2 })
  }

  /**
   * Factor Analysis
   */
  async factorAnalysis(data: number[][], nFactors?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'factor_analysis', { data, n_factors: nFactors ?? 2 })
  }

  /**
   * Cluster Analysis (K-Means)
   */
  async clusterAnalysis(data: number[][], nClusters?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'cluster_analysis', { data, n_clusters: nClusters ?? 3 })
  }
}
