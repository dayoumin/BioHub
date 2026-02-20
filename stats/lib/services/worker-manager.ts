/**
 * Web Worker Manager Service
 * Worker 생성, 관리, 통신을 담당하는 중앙 서비스
 */

export type WorkerTaskType =
  | 'CORRELATION_MATRIX'
  | 'BASIC_STATISTICS'
  | 'MULTIPLE_STATISTICS'
  | 'HISTOGRAM'

export interface WorkerProgress {
  current: number
  total: number
  percentage: number
  message?: string
}

export interface WorkerTask<T = any> {
  type: WorkerTaskType
  payload: T
  onProgress?: (progress: WorkerProgress) => void
  onError?: (error: Error) => void
}

export interface CorrelationMatrixPayload {
  data: Record<string, any>[]
  columns: Array<{ name: string; [key: string]: any }>
}

export interface BasicStatisticsPayload {
  data: number[]
}

export interface MultipleStatisticsPayload {
  data: Record<string, any>[]
  columns: string[]
}

export interface HistogramPayload {
  data: number[]
  bins?: number
}

class WorkerManager {
  private workers: Map<string, Worker> = new Map()
  private taskQueue: Map<string, WorkerTask> = new Map()
  private workerPool: Worker[] = []
  private readonly MAX_WORKERS = navigator.hardwareConcurrency || 4

  /**
   * Worker 생성 또는 재사용
   */
  private getOrCreateWorker(id: string): Worker {
    // Worker Pool에서 재사용 가능한 Worker 찾기
    if (this.workerPool.length > 0) {
      const worker = this.workerPool.pop()!
      this.workers.set(id, worker)
      return worker
    }

    // 새 Worker 생성
    const worker = new Worker('/workers/statistics-worker.js')
    this.workers.set(id, worker)

    // Worker 초기화 후 자동 정리 (5분 후)
    setTimeout(() => {
      if (this.workers.has(id)) {
        this.terminateWorker(id)
      }
    }, 5 * 60 * 1000)

    return worker
  }

  /**
   * Worker 종료 또는 Pool에 반환
   */
  private terminateWorker(id: string): void {
    const worker = this.workers.get(id)
    if (worker) {
      this.workers.delete(id)
      this.taskQueue.delete(id)

      // Worker Pool이 가득 차지 않았으면 재사용을 위해 Pool에 추가
      if (this.workerPool.length < this.MAX_WORKERS) {
        this.workerPool.push(worker)
      } else {
        worker.terminate()
      }
    }
  }

  /**
   * 상관계수 행렬 계산
   */
  async calculateCorrelationMatrix(
    data: Record<string, any>[],
    columns: Array<{ name: string; [key: string]: any }>,
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<{ matrix: number[][]; labels: string[] }> {
    return this.executeTask<CorrelationMatrixPayload>({
      type: 'CORRELATION_MATRIX',
      payload: { data, columns },
      onProgress
    })
  }

  /**
   * 기초 통계 계산
   */
  async calculateStatistics(
    data: number[],
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<{
    n: number
    mean: number
    median: number
    std: number
    variance: number
    min: number
    max: number
    q1: number
    q3: number
    iqr: number
    outliers: number[]
    outlierCount: number
  }> {
    return this.executeTask<BasicStatisticsPayload>({
      type: 'BASIC_STATISTICS',
      payload: { data },
      onProgress
    })
  }

  /**
   * 다중 컬럼 통계 계산
   */
  async calculateMultipleStatistics(
    data: Record<string, any>[],
    columns: string[],
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<Record<string, any>> {
    return this.executeTask<MultipleStatisticsPayload>({
      type: 'MULTIPLE_STATISTICS',
      payload: { data, columns },
      onProgress
    })
  }

  /**
   * 히스토그램 데이터 계산
   */
  async calculateHistogram(
    data: number[],
    bins: number = 20,
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<{
    counts: number[]
    edges: number[]
    binWidth: number
  }> {
    return this.executeTask<HistogramPayload>({
      type: 'HISTOGRAM',
      payload: { data, bins },
      onProgress
    })
  }

  /**
   * Worker 작업 실행
   */
  private executeTask<T>(task: WorkerTask<T>): Promise<any> {
    return new Promise((resolve, reject) => {
      const taskId = `${task.type}_${Date.now()}_${Math.random()}`
      const worker = this.getOrCreateWorker(taskId)

      // 타임아웃 설정 (30초)
      const timeout = setTimeout(() => {
        this.terminateWorker(taskId)
        reject(new Error(`작업 시간 초과: ${task.type}`))
      }, 30000)

      // 메시지 핸들러
      const messageHandler = (event: MessageEvent) => {
        const { type, data, error } = event.data

        switch (type) {
          case 'ready':
            // Worker 준비 완료, 작업 전송
            worker.postMessage({
              type: task.type,
              payload: task.payload
            })
            break

          case 'progress':
            // 진행상황 보고
            if (task.onProgress) {
              task.onProgress(data)
            }
            break

          case 'result':
            // 작업 완료
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            this.terminateWorker(taskId)
            resolve(data)
            break

          case 'error':
            // 오류 발생
            clearTimeout(timeout)
            worker.removeEventListener('message', messageHandler)
            this.terminateWorker(taskId)
            const err = new Error(error.message || '알 수 없는 오류가 발생했습니다')
            if (task.onError) {
              task.onError(err)
            }
            reject(err)
            break
        }
      }

      // 에러 핸들러
      worker.addEventListener('error', (error) => {
        clearTimeout(timeout)
        this.terminateWorker(taskId)
        const err = new Error(`Worker 오류: ${error.message}`)
        if (task.onError) {
          task.onError(err)
        }
        reject(err)
      })

      worker.addEventListener('message', messageHandler)

      // Worker가 준비되지 않았을 경우 직접 작업 전송
      if (worker.onmessage !== null) {
        worker.postMessage({
          type: task.type,
          payload: task.payload
        })
      }
    })
  }

  /**
   * 모든 Worker 종료
   */
  terminateAll(): void {
    this.workers.forEach((worker, id) => {
      worker.terminate()
    })
    this.workers.clear()
    this.taskQueue.clear()
  }

  /**
   * Worker 지원 여부 확인
   */
  static isSupported(): boolean {
    return typeof Worker !== 'undefined'
  }

  /**
   * 활성 Worker 수 반환
   */
  getActiveWorkerCount(): number {
    return this.workers.size
  }
}

// Singleton 인스턴스
export const workerManager = new WorkerManager()

// Hook for React components
export function useWorkerManager() {
  return workerManager
}

// 대용량 데이터 여부 판단
export function shouldUseWorker(dataSize: number): boolean {
  // 1000개 이상의 데이터는 Worker 사용 권장
  return WorkerManager.isSupported() && dataSize > 1000
}