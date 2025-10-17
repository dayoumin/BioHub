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
   * Worker별 추가 패키지 로드 (Lazy Loading)
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

    // 백그라운드 로딩 (에러는 로그만 출력)
    this.pyodide.loadPackage([...packages]).catch((error) => {
      console.error(`Worker ${workerNumber} 패키지 로드 실패:`, error)
    })
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
}
