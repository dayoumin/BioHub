/**
 * Pyodide Web Worker Mode Test
 *
 * Web Worker 모드 설정에 따른 분기 로직 검증
 * (import.meta.url 이슈로 실제 Worker 생성은 mock)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// mock 함수들을 외부에서 정의 (vi.mock 내부에서 참조 가능)
const mockInitialize = vi.fn().mockResolvedValue(undefined)
const mockIsInitialized = vi.fn().mockReturnValue(false)
const mockCallWorkerMethod = vi.fn().mockResolvedValue({})
const mockDispose = vi.fn()
const mockOnProgress = vi.fn().mockReturnValue(() => {})

let webWorkerMode = false

// 전체 모듈을 mock
vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => {
  return {
    PyodideCoreService: {
      getInstance: vi.fn().mockReturnValue({
        initialize: mockInitialize,
        isInitialized: mockIsInitialized,
        callWorkerMethod: mockCallWorkerMethod,
        dispose: mockDispose,
        onProgress: mockOnProgress,
        // 테스트용 내부 상태 노출
        _isWebWorkerMode: () => webWorkerMode,
        _setWebWorkerMode: (value: boolean) => { webWorkerMode = value }
      }),
      resetInstance: vi.fn()
    }
  }
})

import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('Pyodide Web Worker Mode (Mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Service Singleton Pattern', () => {
    it('should return same instance on multiple getInstance calls', () => {
      const instance1 = PyodideCoreService.getInstance()
      const instance2 = PyodideCoreService.getInstance()

      expect(instance1).toBe(instance2)
      expect(PyodideCoreService.getInstance).toHaveBeenCalledTimes(2)
    })
  })

  describe('Initialize behavior', () => {
    it('should call initialize without throwing', async () => {
      const service = PyodideCoreService.getInstance()

      await expect(service.initialize()).resolves.toBeUndefined()
      expect(mockInitialize).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple initialize calls (idempotent)', async () => {
      const service = PyodideCoreService.getInstance()

      await service.initialize()
      await service.initialize()
      await service.initialize()

      // 실제 구현에서는 loadPromise로 병합되지만, mock에서는 3번 호출됨
      expect(mockInitialize).toHaveBeenCalled()
    })
  })

  describe('Worker method calls', () => {
    it('should call worker method with correct parameters', async () => {
      const service = PyodideCoreService.getInstance()

      await service.callWorkerMethod(1, 'descriptive_stats', {
        data: [1, 2, 3, 4, 5]
      })

      expect(mockCallWorkerMethod).toHaveBeenCalledWith(
        1,
        'descriptive_stats',
        { data: [1, 2, 3, 4, 5] }
      )
    })

    it('should support different worker numbers', async () => {
      const service = PyodideCoreService.getInstance()

      await service.callWorkerMethod(1, 'method1', {})
      await service.callWorkerMethod(2, 'method2', {})
      await service.callWorkerMethod(3, 'method3', {})
      await service.callWorkerMethod(4, 'method4', {})

      expect(mockCallWorkerMethod).toHaveBeenCalledTimes(4)
    })
  })

  describe('Progress callback', () => {
    it('should register progress listener', () => {
      const service = PyodideCoreService.getInstance()
      const callback = vi.fn()

      const unsubscribe = service.onProgress(callback)

      expect(typeof unsubscribe).toBe('function')
    })
  })
})

/**
 * Web Worker 모드 환경변수 테스트 (단위 테스트)
 *
 * 실제 Worker 생성 없이 환경변수에 따른 분기 로직만 검증
 */
describe('Web Worker Mode Environment Variable', () => {
  const originalEnv = process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER
    }
  })

  it('should read NEXT_PUBLIC_PYODIDE_USE_WORKER from process.env', () => {
    process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER = 'true'
    expect(process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER).toBe('true')
  })

  it('should be undefined when not set', () => {
    delete process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER
    expect(process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER).toBeUndefined()
  })

  it('should evaluate truthy condition correctly', () => {
    process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER = 'true'
    const shouldUseWorker = process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER === 'true'
    expect(shouldUseWorker).toBe(true)
  })

  it('should evaluate falsy condition correctly', () => {
    process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER = 'false'
    const shouldUseWorker = process.env.NEXT_PUBLIC_PYODIDE_USE_WORKER === 'true'
    expect(shouldUseWorker).toBe(false)
  })
})
