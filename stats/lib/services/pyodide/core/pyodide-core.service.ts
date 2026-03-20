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
import type { WorkerRequest, WorkerResponse } from './pyodide-worker'
import { registerHelpersModule } from './pyodide-init-logic'

// ========================================
// 타입 정의
// ========================================

/**
 * Worker 메서드 호출 파라미터 타입
 * JSON 직렬화 가능한 타입만 허용
 * 재귀적 Record 타입 지원 (constraints, nested objects)
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
  | { [key: string]: WorkerMethodParam }
  | WorkerMethodParam[]

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
 * - Worker 3: statsmodels + pandas + scikit-learn (ANOVA, post-hoc, clustering, PCA 등)
 * - Worker 4: statsmodels + scikit-learn (회귀, PCA 등)
 */
export const WORKER_EXTRA_PACKAGES = Object.freeze<Record<1 | 2 | 3 | 4 | 5 | 6 | 7, readonly string[]>>({
  1: [],
  2: ['statsmodels', 'pandas'],
  3: ['statsmodels', 'pandas', 'scikit-learn'],
  4: ['statsmodels', 'scikit-learn'],
  5: ['scikit-learn'],
  6: [],
  7: ['scikit-learn']
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

const SHOULD_USE_WEB_WORKER =
  typeof process !== 'undefined' &&
  process.env?.NEXT_PUBLIC_PYODIDE_USE_WORKER === 'true'

const WORKER_INIT_TIMEOUT_MS = 30000
const WORKER_METHOD_TIMEOUT_MS = 60000

interface PendingWorkerRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

/**
 * 로딩 진행률 이벤트
 */
export interface PyodideLoadingProgress {
  stage: 'runtime' | 'numpy' | 'scipy' | 'helpers' | 'complete'
  progress: number // 0-100
  message: string
  estimatedSize?: string // 예: "6MB", "12MB"
  /** 캐시에서 복원 중인지 여부 */
  fromCache?: boolean
}

/**
 * 진행률 리스너 타입
 */
export type ProgressListener = (progress: PyodideLoadingProgress) => void

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
  private worker: Worker | null = null
  private workerInitialized = false
  private workerInitPromise: Promise<void> | null = null
  private workerRequests: Map<string, PendingWorkerRequest> = new Map()
  private workerRequestCounter = 0
  private workerFallbackLogged = false

  // 진행률 추적
  private progressListeners: Set<ProgressListener> = new Set()

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
    this.instance?.dispose()
    this.instance = null
  }

  /**
   * 현재 로드된 Pyodide 인스턴스 접근자 (테스트/호환용)
   */
  getPyodideInstance(): PyodideInterface | null {
    return this.pyodide
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
    if (this.isWebWorkerMode()) {
      await this.initializeWorkerBridge()
      return
    }

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
        // Service Worker 캐시 여부 감지
        const isCached = await this.checkServiceWorkerCache()

        // 1. Pyodide 런타임 로드 (6MB)
        this.emitProgress({
          stage: 'runtime',
          progress: 0,
          message: isCached ? '캐시에서 Pyodide 복원 중...' : 'Pyodide 런타임 로딩 중...',
          estimatedSize: '6MB',
          fromCache: isCached
        })

        this.pyodide = await this._loadPyodide()

        this.emitProgress({
          stage: 'runtime',
          progress: 25,
          message: isCached ? 'Pyodide 복원 완료' : 'Pyodide 런타임 로드 완료',
          estimatedSize: '6MB',
          fromCache: isCached
        })

        // 2. NumPy 로드 (12MB)
        this.emitProgress({
          stage: 'numpy',
          progress: 25,
          message: isCached ? '캐시에서 NumPy 복원 중...' : 'NumPy 패키지 로딩 중...',
          estimatedSize: '12MB',
          fromCache: isCached
        })

        await this.pyodide.loadPackage(['numpy'])

        this.emitProgress({
          stage: 'numpy',
          progress: 50,
          message: isCached ? 'NumPy 복원 완료' : 'NumPy 패키지 로드 완료',
          estimatedSize: '12MB',
          fromCache: isCached
        })

        // 3. SciPy 로드 (25MB)
        this.emitProgress({
          stage: 'scipy',
          progress: 50,
          message: isCached ? '캐시에서 SciPy 복원 중...' : 'SciPy 패키지 로딩 중...',
          estimatedSize: '25MB',
          fromCache: isCached
        })

        await this.pyodide.loadPackage(['scipy'])

        this.emitProgress({
          stage: 'scipy',
          progress: 85,
          message: isCached ? 'SciPy 복원 완료' : 'SciPy 패키지 로드 완료',
          estimatedSize: '25MB',
          fromCache: isCached
        })

        // 4. helpers.py 로드 (5KB)
        this.emitProgress({
          stage: 'helpers',
          progress: 85,
          message: '헬퍼 모듈 로딩 중...',
          estimatedSize: '5KB',
          fromCache: isCached
        })

        const helpersResponse = await fetch('/workers/python/helpers.py')
        if (!helpersResponse.ok) {
          throw new Error(`Failed to load helpers.py: ${helpersResponse.status} ${helpersResponse.statusText}`)
        }

        const helpersCode = await helpersResponse.text()

        // Register helpers.py using the same logic as pyodide-worker.ts
        await registerHelpersModule(this.pyodide, helpersCode)

        console.log('✅ helpers.py 로드 완료 (sys.modules에 등록)')

        this.packagesLoaded = true
        this.isLoading = false

        // 5. 완료
        this.emitProgress({
          stage: 'complete',
          progress: 100,
          message: isCached ? '통계 엔진 복원 완료' : '통계 엔진 준비 완료',
          fromCache: isCached
        })

        console.log(`✅ Pyodide 초기화 완료 (NumPy + SciPy + helpers)${isCached ? ' [캐시]' : ''}`)
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
    this.terminateWorker()
    this.workerFallbackLogged = false
    this.progressListeners.clear()
  }

  // ========================================
  // Public API - 진행률 추적
  // ========================================

  /**
   * 진행률 리스너 추가
   *
   * @param listener 진행률 콜백 함수
   * @returns 리스너 제거 함수
   */
  onProgress(listener: ProgressListener): () => void {
    this.progressListeners.add(listener)
    return () => {
      this.progressListeners.delete(listener)
    }
  }

  /**
   * 진행률 이벤트 발송
   *
   * @param progress 진행률 정보
   */
  private emitProgress(progress: PyodideLoadingProgress): void {
    this.progressListeners.forEach((listener) => {
      try {
        listener(progress)
      } catch (error) {
        console.error('[PyodideCore] 진행률 리스너 오류:', error)
      }
    })
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

  async ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7): Promise<void> {
    if (this.isWebWorkerMode()) {
      if (this.loadedWorkers.has(workerNumber)) {
        return
      }

      await this.initializeWorkerBridge()
      await this.sendWorkerRequest(
        'loadWorker',
        { workerNum: workerNumber },
        WORKER_INIT_TIMEOUT_MS
      )
      this.loadedWorkers.add(workerNumber)
      return
    }

    if (!this.pyodide) {
      throw new Error('Pyodide�� �ʱ�ȭ���� �ʾҽ��ϴ�. initialize()�� ���� ȣ���ϼ���.')
    }

    if (this.loadedWorkers.has(workerNumber)) {
      return // �̹� �ε��
    }

    const workerName = this.getWorkerFileName(workerNumber)
    const response = await fetch(`/workers/python/${workerName}.py`)
    if (!response.ok) {
      throw new Error(`Worker ${workerNumber} ���� �ε� ����: ${response.statusText}`)
    }

    const workerCode = await response.text()

    // ⚠️ CRITICAL: Load additional packages BEFORE executing worker code
    // Worker 3/4 import sklearn/statsmodels at the top, so packages must be loaded first
    await this.loadAdditionalPackages(workerNumber)
    await this.pyodide.runPythonAsync(workerCode)

    this.loadedWorkers.add(workerNumber)
    console.log(`? Worker ${workerNumber} �ε� �Ϸ�: ${workerName}`)
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
    workerNum: 1 | 2 | 3 | 4 | 5 | 6 | 7,
    methodName: string,
    params: Record<string, WorkerMethodParam>,
    options: WorkerMethodOptions = {}
  ): Promise<T> {
    if (!options.skipValidation) {
      for (const [key, value] of Object.entries(params)) {
        this.validateWorkerParam(value, key)
      }
    }

    if (this.isWebWorkerMode()) {
      await this.ensureWorkerLoaded(workerNum)
      return this.callWorkerMethodViaWebWorker<T>(workerNum, methodName, params, options)
    }

    await this.initialize()
    await this.ensureWorkerLoaded(workerNum)

    if (!this.pyodide) {
      throw new Error('Pyodide�� �ʱ�ȭ���� �ʾҽ��ϴ�')
    }

    const paramsList: string[] = []
    for (const [key, value] of Object.entries(params)) {
      const jsonValue = JSON.stringify(value)
      paramsList.push(`${key}=json.loads('${jsonValue.replace(/'/g, "\'")}')`)
    }

    const pythonCode = `
import json
result = ${methodName}(${paramsList.join(', ')})
json.dumps(result)
    `.trim()

    try {
      const rawResult = await this.pyodide.runPythonAsync(pythonCode)
      const parsed = this.parsePythonResult<T>(rawResult)

      return parsed
    } catch (error) {
      const errorMessage = options.errorMessage || `Worker ${workerNum} �޼��� ${methodName} ���� ����`
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
   * Service Worker 캐시에 Pyodide 파일이 있는지 확인
   *
   * @returns 캐시 존재 여부
   */
  private async checkServiceWorkerCache(): Promise<boolean> {
    try {
      if (typeof caches === 'undefined') return false

      // sw.js의 캐시 이름 패턴: pyodide-cache-v{VERSION}
      const allCacheNames = await caches.keys()
      const pyodideCacheName = allCacheNames.find(name => name.startsWith('pyodide-cache-'))
      if (!pyodideCacheName) return false

      const cache = await caches.open(pyodideCacheName)
      const keys = await cache.keys()
      // .wasm 파일이 캐시에 있어야 실질적 캐시로 판단
      return keys.some(req => req.url.includes('.wasm'))
    } catch {
      return false
    }
  }

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
      4: 'worker4-regression-advanced',
      5: 'worker5-survival',
      6: 'worker6-fisheries',
      7: 'worker7-ecology'
    }
    return fileNames[workerNumber] || 'worker1-descriptive'
  }

  /**
   * Worker별 추가 패키지 로드 (Lazy Loading with Retry & Timeout)
   *
   * @param workerNumber Worker 번호
   */
  private async loadAdditionalPackages(workerNumber: number): Promise<void> {
    const packages = WORKER_EXTRA_PACKAGES[workerNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7]

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
            const fullErrorMessage =
              `Worker ${workerNumber}: ${pkg} 패키지 로드 실패 (${MAX_RETRIES}회 시도)\n` +
              `에러: ${errorMessage}\n` +
              `Worker ${workerNumber}는 ${pkg} 없이 실행할 수 없습니다.`

            console.error(`❌ ${fullErrorMessage}`)

            // ⚠️ CRITICAL: Worker 3/4는 sklearn/statsmodels을 파일 첫 줄에서 import하므로
            // 패키지 없으면 Worker 코드 실행이 무조건 실패함
            // 따라서 에러를 throw하여 Worker 로드 자체를 중단
            throw new Error(fullErrorMessage)
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
        // 재귀적 검증
        this.validateWorkerParam(item, `${prefix}[${index}]`)
      })
      return
    }

    // 객체 검증 (재귀적)
    if (typeof param === 'object' && param !== null) {
      Object.entries(param).forEach(([key, value]) => {
        this.validateWorkerParam(value, paramName ? `${paramName}.${key}` : key)
      })
      return
    }

    // 그 외 타입은 허용하지 않음 (function, symbol 등)
    throw new Error(
      `${prefix}가 지원하지 않는 타입입니다 (${typeof param})`
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
  // Web Worker Helpers
  // ========================================

  private isWebWorkerMode(): boolean {
    if (!SHOULD_USE_WEB_WORKER) {
      return false
    }

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      if (!this.workerFallbackLogged) {
        console.warn('[PyodideCore] Web Worker 모드를 사용할 수 없는 환경입니다. 메인 스레드로 폴백합니다.')
        this.workerFallbackLogged = true
      }
      return false
    }

    return true
  }

  private async initializeWorkerBridge(): Promise<void> {
    if (this.workerInitialized) {
      return
    }

    if (this.workerInitPromise) {
      await this.workerInitPromise
      return
    }

    if (!this.isWebWorkerMode()) {
      return
    }

    this.workerInitPromise = (async () => {
      try {
        this.worker = new Worker(new URL('./pyodide-worker.ts', import.meta.url), {
          type: 'module'
        })

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data)
        }

        this.worker.onerror = (error: ErrorEvent) => {
          console.error('[PyodideCore] Worker error:', error)
        }

        // Get environment-specific Pyodide URLs
        const { scriptURL, indexURL } = getPyodideCDNUrls()

        await this.sendWorkerRequest(
          'init',
          {
            pyodideUrl: indexURL,
            scriptUrl: scriptURL
          },
          WORKER_INIT_TIMEOUT_MS
        )
        this.workerInitialized = true
      } catch (error) {
        this.terminateWorker()
        throw error
      }
    })()

    try {
      await this.workerInitPromise
    } finally {
      this.workerInitPromise = null
    }
  }

  private async callWorkerMethodViaWebWorker<T>(
    workerNum: 1 | 2 | 3 | 4 | 5 | 6 | 7,
    methodName: string,
    params: Record<string, WorkerMethodParam>,
    options: WorkerMethodOptions = {}
  ): Promise<T> {
    await this.initializeWorkerBridge()

    try {
      const result = await this.sendWorkerRequest(
        'callMethod',
        { workerNum, method: methodName, params },
        WORKER_METHOD_TIMEOUT_MS
      )

      return result as T
    } catch (error) {
      const errorMessage = options.errorMessage || `Worker ${workerNum} 메서드 ${methodName} 실행 실패`
      const errorDetail = error instanceof Error ? error.message : String(error)
      throw new Error(`${errorMessage}: ${errorDetail}`)
    }
  }

  private async sendWorkerRequest(
    type: WorkerRequest['type'],
    data: Partial<WorkerRequest>,
    timeout: number
  ): Promise<unknown> {
    if (!this.worker) {
      throw new Error('Pyodide Web Worker가 초기화되지 않았습니다.')
    }

    const requestId = this.generateWorkerRequestId()

    return new Promise((resolve, reject) => {
      const timeoutHandle = window.setTimeout(() => {
        this.workerRequests.delete(requestId)
        reject(new Error(`Pyodide worker request timeout (${timeout}ms)`))
      }, timeout) as unknown as NodeJS.Timeout

      this.workerRequests.set(requestId, {
        resolve,
        reject,
        timeout: timeoutHandle
      })

      const message: WorkerRequest = {
        id: requestId,
        type,
        ...data
      }

      if (!this.worker) {
        reject(new Error('Worker not initialized'))
        return
      }

      this.worker.postMessage(message)
    })
  }

  private handleWorkerMessage(response: WorkerResponse): void {
    const pending = this.workerRequests.get(response.id)

    if (!pending) {
      if (response.type !== 'progress') {
        console.warn(`[PyodideCore] Unknown worker response id: ${response.id}`)
      }
      return
    }

    if (response.type === 'progress') {
      // Progress 이벤트는 timeout을 유지한 채로 무시
      return
    }

    clearTimeout(pending.timeout)
    this.workerRequests.delete(response.id)

    if (response.type === 'success') {
      pending.resolve(response.result)
    } else if (response.type === 'error') {
      pending.reject(new Error(response.error ?? 'Unknown worker error'))
    }
  }

  private generateWorkerRequestId(): string {
    this.workerRequestCounter += 1
    return `pyodide_worker_req_${this.workerRequestCounter}_${Date.now()}`
  }

  private terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.workerInitialized = false
    this.workerInitPromise = null

    for (const { reject, timeout } of this.workerRequests.values()) {
      clearTimeout(timeout)
      reject(new Error('Pyodide Web Worker가 종료되었습니다.'))
    }

    this.workerRequests.clear()
    this.loadedWorkers.clear()
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
    return this.callWorkerMethod<StatisticsResult>(2, 't_test_two_sample', {
      group1,
      group2,
      equalVar
    })
  }

  /**
   * Paired T-Test
   */
  async pairedTTest(group1: number[], group2: number[]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 't_test_paired', { group1, group2 })
  }

  /**
   * One Sample T-Test
   */
  async oneSampleTTest(data: number[], testValue: number): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 't_test_one_sample', { data, popmean: testValue })
  }

  /**
   * Z-Test
   */
  async zTestWorker(data: number[], testValue: number, populationStd: number): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'z_test', {
      data,
      popmean: testValue,
      popstd: populationStd
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
   * @param dataMatrix - 2D data matrix where each column is a variable
   * @param xIdx - Column index for x variable
   * @param yIdx - Column index for y variable
   * @param controlIndices - Column indices for control variables
   */
  async partialCorrelationWorker(
    dataMatrix: number[][],
    xIdx: number,
    yIdx: number,
    controlIndices: number[]
  ): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'partial_correlation', {
      dataMatrix,
      xIdx,
      yIdx,
      controlIndices
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
    return this.callWorkerMethod<StatisticsResult>(3, 'mcnemar_test', { contingencyTable: tableCells })
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
    return this.callWorkerMethod<StatisticsResult>(4, 'linear_regression', { x, y })
  }

  /**
   * Multiple Regression
   */
  async multipleRegression(X: number[][], y: number[]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'multiple_regression', { X, y })
  }

  /**
   * Logistic Regression
   */
  async logisticRegression(X: number[][], y: number[]): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'logistic_regression', { X, y })
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
  async twoWayAnova(dataValues: number[], factor1Values: string[], factor2Values: string[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'two_way_anova', { dataValues, factor1Values, factor2Values })
  }

  /**
   * Repeated Measures ANOVA
   */
  async repeatedMeasuresAnovaWorker(dataMatrix: number[][], subjectIds: string[], timeLabels: string[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'repeated_measures_anova', { dataMatrix, subjectIds, timeLabels })
  }

  /**
   * ANCOVA (Analysis of Covariance)
   */
  async ancovaWorker(yValues: number[], groupValues: string[], covariates: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'ancova', { yValues, groupValues, covariates })
  }

  /**
   * MANOVA (Multivariate ANOVA)
   */
  async manovaWorker(dataMatrix: number[][], groupValues: string[], varNames: string[]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'manova', { dataMatrix, groupValues, varNames })
  }

  /**
   * Tukey HSD (Honestly Significant Difference) Post-Hoc Test
   */
  async tukeyHSD(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'tukey_hsd', { groups })
  }

  /**
   * Scheffe Test Post-Hoc
   */
  async scheffeTestWorker(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'scheffe_test', { groups })
  }

  /**
   * Bonferroni Correction
   */
  async performBonferroni(pValues: number[], alpha?: number): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'bonferroni_correction', { pValues, alpha: alpha ?? 0.05 })
  }

  /**
   * Games-Howell Test (non-parametric alternative to Tukey HSD)
   */
  async gamesHowellTest(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker3Loaded()
    return this.callWorkerMethod<StatisticsResult>(3, 'games_howell_test', { groups })
  }

  // ============================================================================
  // Descriptive Statistics Methods
  // ============================================================================

  /**
   * Descriptive Statistics (Mean, Median, Std, etc.)
   */
  async descriptiveStats(data: number[]): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'descriptive_stats', { data })
  }

  /**
   * Shapiro-Wilk Test for Normality
   * Worker 1 사용 (scipy만 필요, scikit-learn 불필요)
   */
  async shapiroWilkTest(data: number[]): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'normality_test', { data })
  }

  /**
   * Levene Test for Homogeneity of Variance
   */
  async leveneTest(groups: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker2Loaded()
    return this.callWorkerMethod<StatisticsResult>(2, 'levene_test', { groups })
  }

  /**
   * Outlier Detection
   */
  async outlierDetection(data: number[], method?: 'iqr' | 'zscore' | 'isolation'): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'outlier_detection', { data, method: method ?? 'iqr' })
  }

  /**
   * One Sample Proportion Test
   */
  async oneSampleProportionTest(successCount: number, totalCount: number, nullProportion?: number): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'one_sample_proportion_test', {
      successCount,
      totalCount,
      nullProportion: nullProportion ?? 0.5
    })
  }

  /**
   * Cronbach's Alpha (Internal Consistency)
   */
  async cronbachAlpha(itemsMatrix: number[][]): Promise<StatisticsResult> {
    await this.ensureWorker1Loaded()
    return this.callWorkerMethod<StatisticsResult>(1, 'cronbach_alpha', { itemsMatrix })
  }

  // ============================================================================
  // Advanced Methods
  // ============================================================================

  /**
   * Principal Component Analysis (PCA)
   */
  async pca(data: number[][], nComponents?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'pca_analysis', { data, nComponents: nComponents ?? 2 })
  }

  /**
   * Factor Analysis
   */
  async factorAnalysis(data: number[][], nFactors?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'factor_analysis', { data, nFactors: nFactors ?? 2 })
  }

  /**
   * Cluster Analysis (K-Means)
   */
  async clusterAnalysis(data: number[][], numClusters?: number): Promise<StatisticsResult> {
    await this.ensureWorker4Loaded()
    return this.callWorkerMethod<StatisticsResult>(4, 'cluster_analysis', { data, nClusters: numClusters ?? 3 })
  }
}
