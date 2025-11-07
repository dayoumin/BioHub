/**
 * Adaptive Worker Pool
 *
 * Phase 5-3: Worker Pool 구현
 * - 2+2 Adaptive Pool (Core 2개 + Extended 2개)
 * - Core Workers (1-2): 앱 시작 시 즉시 초기화
 * - Extended Workers (3-4): 필요 시 Lazy Loading
 * - 20분 미사용 시 Extended Workers 자동 정리
 */

import type { WorkerMessage, WorkerResponse, WorkerInfo, WorkerStatus } from './worker-types'

// ============================================================================
// 타입 정의
// ============================================================================

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeout: NodeJS.Timeout
}

// ============================================================================
// AdaptiveWorkerPool 클래스
// ============================================================================

export class AdaptiveWorkerPool {
  // Singleton
  private static instance: AdaptiveWorkerPool | null = null

  // Workers
  private workers: Map<number, Worker | null> = new Map()
  private workerInfos: Map<number, WorkerInfo> = new Map()

  // Request tracking
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private requestCounter = 0

  // Cleanup timer (Extended Workers)
  private cleanupTimer: NodeJS.Timeout | null = null
  private readonly CLEANUP_INTERVAL = 20 * 60 * 1000 // 20분

  // ============================================================================
  // Singleton Pattern
  // ============================================================================

  private constructor() {
    // Initialize worker info
    for (let i = 1; i <= 4; i++) {
      this.workerInfos.set(i, {
        num: i,
        status: 'idle',
        lastUsed: 0,
        isCore: i <= 2
      })
    }
  }

  static getInstance(): AdaptiveWorkerPool {
    if (!this.instance) {
      this.instance = new AdaptiveWorkerPool()
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
   * Worker Pool 초기화
   * - Core Workers (1-2) 백그라운드 초기화
   */
  async initialize(): Promise<void> {
    console.log('[WorkerPool] Initializing Core Workers (1-2)...')

    // Core Workers 백그라운드 초기화
    const coreWorkers = [1, 2]
    await Promise.all(coreWorkers.map(num => this.ensureWorkerReady(num)))

    // Cleanup timer 시작
    this.startCleanupTimer()

    console.log('[WorkerPool] ✓ Core Workers ready')
  }

  /**
   * Worker 메서드 실행
   */
  async execute<T = unknown>(
    workerNum: number,
    method: string,
    params: Record<string, unknown>
  ): Promise<T> {
    // Worker 준비 확인
    await this.ensureWorkerReady(workerNum)

    // 요청 ID 생성
    const requestId = this.generateRequestId()

    // Worker에 메시지 전송
    return new Promise<T>((resolve, reject) => {
      // Timeout 설정 (30초)
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error(`[WorkerPool] Worker ${workerNum} timeout (30s)`))
      }, 30000)

      // 요청 등록
      this.pendingRequests.set(requestId, { resolve, reject, timeout })

      // Worker에 메시지 전송
      const message: WorkerMessage = {
        id: requestId,
        type: 'execute',
        method,
        params,
        workerNum
      }

      const worker = this.workers.get(workerNum)
      if (!worker) {
        clearTimeout(timeout)
        this.pendingRequests.delete(requestId)
        reject(new Error(`[WorkerPool] Worker ${workerNum} not available`))
        return
      }

      worker.postMessage(message)

      // Worker 상태 업데이트
      const info = this.workerInfos.get(workerNum)
      if (info) {
        info.status = 'busy'
        info.lastUsed = Date.now()
      }
    })
  }

  /**
   * Worker Pool 종료
   */
  terminate(): void {
    console.log('[WorkerPool] Terminating all workers...')

    // Cleanup timer 정리
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = null
    }

    // 모든 Worker 종료
    for (const [num, worker] of this.workers.entries()) {
      if (worker) {
        worker.terminate()
        console.log(`[WorkerPool] ✓ Worker ${num} terminated`)
      }
    }

    this.workers.clear()
    this.pendingRequests.clear()
  }

  /**
   * Worker 상태 조회
   */
  getWorkerStatus(workerNum: number): WorkerStatus {
    return this.workerInfos.get(workerNum)?.status ?? 'idle'
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Worker 준비 확인 (없으면 생성)
   */
  private async ensureWorkerReady(workerNum: number): Promise<void> {
    const info = this.workerInfos.get(workerNum)
    if (!info) {
      throw new Error(`[WorkerPool] Invalid worker number: ${workerNum}`)
    }

    // 이미 준비된 경우
    if (info.status === 'ready' || info.status === 'busy') {
      return
    }

    // Worker 생성
    if (!this.workers.has(workerNum) || !this.workers.get(workerNum)) {
      await this.createWorker(workerNum)
    }
  }

  /**
   * Worker 생성 및 초기화
   */
  private async createWorker(workerNum: number): Promise<void> {
    const info = this.workerInfos.get(workerNum)
    if (!info) return

    info.status = 'initializing'

    try {
      // Web Worker 생성
      const worker = new Worker(
        new URL('./statistical-worker.ts', import.meta.url),
        { type: 'module' }
      )

      // 메시지 핸들러 등록
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(workerNum, event.data)
      }

      worker.onerror = (error: ErrorEvent) => {
        console.error(`[WorkerPool] Worker ${workerNum} error:`, error)
        info.status = 'error'
      }

      this.workers.set(workerNum, worker)

      // Worker 초기화 메시지 전송
      const initRequestId = this.generateRequestId()
      const initMessage: WorkerMessage = {
        id: initRequestId,
        type: 'init',
        workerNum
      }

      // 초기화 완료 대기
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(initRequestId)
          reject(new Error(`[WorkerPool] Worker ${workerNum} init timeout`))
        }, 15000) // 15초 타임아웃

        this.pendingRequests.set(initRequestId, {
          resolve: () => {
            info.status = 'ready'
            resolve()
          },
          reject,
          timeout
        })

        worker.postMessage(initMessage)
      })

      console.log(`[WorkerPool] ✓ Worker ${workerNum} initialized`)
    } catch (error) {
      info.status = 'error'
      throw error
    }
  }

  /**
   * Worker 메시지 핸들러
   */
  private handleWorkerMessage(workerNum: number, response: WorkerResponse): void {
    const { id, type, result, error } = response

    const pending = this.pendingRequests.get(id)
    if (!pending) {
      console.warn(`[WorkerPool] Unknown request ID: ${id}`)
      return
    }

    // Timeout 클리어
    clearTimeout(pending.timeout)
    this.pendingRequests.delete(id)

    // Worker 상태 업데이트
    const info = this.workerInfos.get(workerNum)
    if (info && info.status === 'busy') {
      info.status = 'ready'
    }

    // 응답 처리
    if (type === 'success') {
      pending.resolve(result)
    } else if (type === 'error') {
      pending.reject(new Error(error ?? 'Unknown worker error'))
    }
  }

  /**
   * 요청 ID 생성
   */
  private generateRequestId(): string {
    return `req_${++this.requestCounter}_${Date.now()}`
  }

  /**
   * Cleanup Timer 시작 (Extended Workers 자동 정리)
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
    }

    this.cleanupTimer = setTimeout(() => {
      this.cleanupExtendedWorkers()
      this.startCleanupTimer() // 재귀적으로 타이머 재시작
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Extended Workers (3-4) 정리 (20분 미사용 시)
   */
  private cleanupExtendedWorkers(): void {
    const now = Date.now()
    const extendedWorkers = [3, 4]

    for (const num of extendedWorkers) {
      const info = this.workerInfos.get(num)
      const worker = this.workers.get(num)

      if (!info || !worker) continue

      // 20분 미사용 체크
      const idleTime = now - info.lastUsed
      if (idleTime > this.CLEANUP_INTERVAL && info.status !== 'busy') {
        console.log(`[WorkerPool] Cleaning up Worker ${num} (idle for ${Math.floor(idleTime / 60000)}min)`)
        worker.terminate()
        this.workers.set(num, null)
        info.status = 'idle'
      }
    }
  }
}
