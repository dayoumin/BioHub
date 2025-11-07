/**
 * Pyodide Main Thread Bridge
 *
 * Phase 5-3: 단일 Web Worker 구현
 * - 메인 스레드에서 Web Worker로의 인터페이스
 * - UI 블로킹 없이 Pyodide 호출
 * - PyodideCore 기존 API 호환성 유지
 *
 * 아키텍처:
 * ```
 * Main Thread (UI)
 *     ↓
 * PyodideMainThreadBridge (이 파일)
 *     ↓
 * Web Worker (pyodide-worker.ts)
 *     ↓
 * Pyodide + Python Scripts (worker1-4.py)
 * ```
 */

import type { WorkerRequest, WorkerResponse } from './pyodide-worker'

// ============================================================================
// 타입 정의
// ============================================================================

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: NodeJS.Timeout
}

/**
 * Worker 메서드 호출 파라미터
 */
export interface WorkerCallParams {
  workerNum: number
  method: string
  params: Record<string, unknown>
}

// ============================================================================
// PyodideMainThreadBridge 클래스
// ============================================================================

/**
 * Pyodide Web Worker와 통신하는 메인 스레드 브리지
 *
 * Singleton 패턴으로 단일 Worker 인스턴스 관리
 */
export class PyodideMainThreadBridge {
  // Singleton
  private static instance: PyodideMainThreadBridge | null = null

  // Web Worker
  private worker: Worker | null = null
  private isInitialized = false
  private loadedWorkers: Set<number> = new Set()

  // Request tracking
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private requestCounter = 0

  // Timeout 설정
  private readonly INIT_TIMEOUT = 30000 // 30초 (Pyodide 초기화)
  private readonly METHOD_TIMEOUT = 60000 // 60초 (메서드 실행)

  // ============================================================================
  // Singleton Pattern
  // ============================================================================

  private constructor() {
    // Private constructor for Singleton
  }

  static getInstance(): PyodideMainThreadBridge {
    if (!this.instance) {
      this.instance = new PyodideMainThreadBridge()
    }
    return this.instance
  }

  static resetInstance(): void {
    if (this.instance) {
      this.instance.terminate()
      this.instance = null
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Pyodide 초기화
   * - Web Worker 생성
   * - Pyodide 로드 (NumPy + SciPy)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[PyodideBridge] Already initialized')
      return
    }

    console.log('[PyodideBridge] Initializing Web Worker...')

    try {
      // 1. Create Web Worker
      this.worker = new Worker(
        new URL('./pyodide-worker.ts', import.meta.url),
        { type: 'module' }
      )

      // 2. Setup message handler
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(event.data)
      }

      this.worker.onerror = (error: ErrorEvent) => {
        console.error('[PyodideBridge] Worker error:', error)
      }

      // 3. Initialize Pyodide in worker
      await this.sendRequest('init', {}, this.INIT_TIMEOUT)

      this.isInitialized = true
      console.log('[PyodideBridge] ✓ Initialized')
    } catch (error) {
      this.isInitialized = false
      throw error
    }
  }

  /**
   * Python Worker 모듈 로드
   * - worker1-4.py 파일 로드
   * - 필요한 추가 패키지 로드 (statsmodels, sklearn 등)
   *
   * @param workerNum Worker 번호 (1-4)
   */
  async ensureWorkerLoaded(workerNum: number): Promise<void> {
    if (this.loadedWorkers.has(workerNum)) {
      return
    }

    console.log(`[PyodideBridge] Loading worker${workerNum}...`)

    await this.sendRequest('loadWorker', { workerNum }, this.INIT_TIMEOUT)

    this.loadedWorkers.add(workerNum)
    console.log(`[PyodideBridge] ✓ Worker${workerNum} loaded`)
  }

  /**
   * Worker 메서드 실행
   * - Python 함수 호출
   * - 결과 반환
   *
   * @param params Worker 호출 파라미터
   * @returns Python 실행 결과
   */
  async callWorkerMethod<T = unknown>(params: WorkerCallParams): Promise<T> {
    const { workerNum, method, params: methodParams } = params

    // 1. Initialize if needed
    if (!this.isInitialized) {
      await this.initialize()
    }

    // 2. Load worker if needed
    await this.ensureWorkerLoaded(workerNum)

    // 3. Call method
    console.log(`[PyodideBridge] Calling ${method} on worker${workerNum}`)

    const result = await this.sendRequest(
      'callMethod',
      {
        workerNum,
        method,
        params: methodParams
      },
      this.METHOD_TIMEOUT
    )

    return result as T
  }

  /**
   * Worker 종료
   */
  terminate(): void {
    if (this.worker) {
      console.log('[PyodideBridge] Terminating worker...')
      this.worker.terminate()
      this.worker = null
    }

    this.isInitialized = false
    this.loadedWorkers.clear()
    this.pendingRequests.clear()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Worker에 요청 전송 및 응답 대기
   */
  private async sendRequest(
    type: WorkerRequest['type'],
    data: Partial<WorkerRequest>,
    timeout: number
  ): Promise<unknown> {
    if (!this.worker) {
      throw new Error('[PyodideBridge] Worker not initialized')
    }

    const requestId = this.generateRequestId()

    return new Promise<unknown>((resolve, reject) => {
      // Timeout 설정
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`[PyodideBridge] Request timeout (${timeout}ms)`))
      }, timeout)

      // 요청 등록
      this.pendingRequests.set(requestId, {
        resolve: (value: unknown) => resolve(value),
        reject,
        timeout: timeoutHandle
      })

      // Worker에 메시지 전송
      const message: WorkerRequest = {
        id: requestId,
        type,
        ...data
      }

      this.worker!.postMessage(message)
    })
  }

  /**
   * Worker 메시지 핸들러
   */
  private handleWorkerMessage(response: WorkerResponse): void {
    const { id, type, result, error } = response

    const pending = this.pendingRequests.get(id)
    if (!pending) {
      console.warn(`[PyodideBridge] Unknown request ID: ${id}`)
      return
    }

    // Timeout 클리어
    clearTimeout(pending.timeout)
    this.pendingRequests.delete(id)

    // 응답 처리
    if (type === 'success') {
      pending.resolve(result)
    } else if (type === 'error') {
      pending.reject(new Error(error ?? 'Unknown worker error'))
    } else if (type === 'progress') {
      // TODO: Progress 처리 (향후 구현)
      console.log(`[PyodideBridge] Progress: ${response.progress}%`)
    }
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`
  }
}
