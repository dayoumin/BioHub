/**
 * 메모리 누수 방지를 위한 cleanup 유틸리티
 */

export interface CleanupManager {
  register(cleanup: () => void): void
  cleanup(): void
}

/**
 * Cleanup 관리자 생성
 */
export function createCleanupManager(): CleanupManager {
  const cleanupFunctions: Array<() => void> = []

  return {
    register(cleanup: () => void) {
      cleanupFunctions.push(cleanup)
    },

    cleanup() {
      cleanupFunctions.forEach(fn => {
        try {
          fn()
        } catch (error) {
          console.warn('Cleanup function error:', error)
        }
      })
      cleanupFunctions.length = 0
    }
  }
}

/**
 * 이벤트 리스너 자동 정리
 */
export function createEventListenerCleanup(
  element: EventTarget,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  element.addEventListener(event, handler, options)
  
  return () => {
    element.removeEventListener(event, handler, options)
  }
}

/**
 * 타이머 자동 정리
 */
export function createTimerCleanup(
  type: 'timeout' | 'interval',
  callback: () => void,
  delay: number
): () => void {
  const id = type === 'timeout' 
    ? setTimeout(callback, delay)
    : setInterval(callback, delay)

  return () => {
    if (type === 'timeout') {
      clearTimeout(id)
    } else {
      clearInterval(id)
    }
  }
}

/**
 * AbortController 생성 및 정리
 */
export function createAbortController(): {
  controller: AbortController
  cleanup: () => void
} {
  const controller = new AbortController()
  
  return {
    controller,
    cleanup: () => {
      if (!controller.signal.aborted) {
        controller.abort()
      }
    }
  }
}

/**
 * Observer 패턴 구독 정리
 */
export function createSubscriptionCleanup<T>(
  subscribe: (callback: (value: T) => void) => () => void,
  callback: (value: T) => void
): () => void {
  const unsubscribe = subscribe(callback)
  return unsubscribe
}

/**
 * 메모리 사용량 모니터링 (개발 환경용)
 */
export function createMemoryMonitor(intervalMs: number = 5000): () => void {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return () => {} // 서버사이드나 프로덕션에서는 아무것도 하지 않음
  }

  let isMonitoring = true

  const monitor = () => {
    if (!isMonitoring) return

    if ('memory' in performance) {
      const memory = (performance as any).memory
      const used = Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100
      const total = Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100
      const limit = Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100
      
      console.log(`🧠 Memory: ${used}MB / ${total}MB (limit: ${limit}MB)`)
    }

    if (isMonitoring) {
      setTimeout(monitor, intervalMs)
    }
  }

  // 초기 모니터링 시작
  monitor()

  // cleanup 함수 반환
  return () => {
    isMonitoring = false
  }
}

/**
 * 큰 객체 자동 정리
 */
export function createObjectCleanup<T extends object>(
  obj: T,
  cleanupKeys: Array<keyof T> = []
): () => void {
  return () => {
    if (cleanupKeys.length === 0) {
      // 모든 키 정리
      Object.keys(obj).forEach(key => {
        delete (obj as any)[key]
      })
    } else {
      // 지정된 키만 정리
      cleanupKeys.forEach(key => {
        delete obj[key]
      })
    }
  }
}

/**
 * Web Worker 정리
 */
export function createWorkerCleanup(worker: Worker): () => void {
  return () => {
    worker.terminate()
  }
}

/**
 * MediaStream 정리
 */
export function createMediaStreamCleanup(stream: MediaStream): () => void {
  return () => {
    stream.getTracks().forEach(track => track.stop())
  }
}

/**
 * Canvas context 정리
 */
export function createCanvasCleanup(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D | WebGLRenderingContext
): () => void {
  return () => {
    if (context instanceof CanvasRenderingContext2D) {
      context.clearRect(0, 0, canvas.width, canvas.height)
    } else if (context instanceof WebGLRenderingContext) {
      context.clear(context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT)
    }
    
    // Canvas 크기를 1x1로 줄여서 메모리 해제
    canvas.width = 1
    canvas.height = 1
  }
}

/**
 * React useEffect cleanup hook 헬퍼
 */
export function useCleanupEffect(
  effect: (cleanup: CleanupManager) => void,
  deps: React.DependencyList
): void {
  if (typeof window === 'undefined') return

  // React hooks는 컴포넌트 내에서만 호출되어야 하므로,
  // 실제 구현은 컴포넌트에서 이 패턴을 사용하도록 안내
}

/**
 * 대용량 데이터 정리 헬퍼
 */
export function createLargeDataCleanup<T>(
  data: T[],
  chunkSize: number = 1000
): () => Promise<void> {
  return async () => {
    // 청크 단위로 배열 정리 (메인 스레드 블로킹 방지)
    while (data.length > 0) {
      const chunk = data.splice(0, chunkSize)
      chunk.length = 0 // 청크 정리
      
      // 다음 청크 처리 전 잠시 대기
      if (data.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
  }
}

/**
 * 전역 cleanup 관리자
 */
class GlobalCleanupManager {
  private cleanupFunctions = new Set<() => void>()

  register(cleanup: () => void): void {
    this.cleanupFunctions.add(cleanup)
  }

  unregister(cleanup: () => void): void {
    this.cleanupFunctions.delete(cleanup)
  }

  cleanup(): void {
    this.cleanupFunctions.forEach(fn => {
      try {
        fn()
      } catch (error) {
        console.warn('Global cleanup error:', error)
      }
    })
    this.cleanupFunctions.clear()
  }
}

export const globalCleanupManager = new GlobalCleanupManager()

// 페이지 언로드 시 전역 cleanup 실행
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalCleanupManager.cleanup()
  })

  // 개발 환경에서 HMR 시에도 cleanup 실행
  if (process.env.NODE_ENV === 'development') {
    if ((window as any).__NEXT_DATA__) {
      // Next.js HMR 감지
      const originalReplaceState = window.history.replaceState
      window.history.replaceState = function(...args) {
        globalCleanupManager.cleanup()
        return originalReplaceState.apply(this, args)
      }
    }
  }
}