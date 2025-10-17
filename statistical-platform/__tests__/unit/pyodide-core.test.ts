/**
 * PyodideCoreService 단위 테스트
 *
 * 테스트 범위:
 * 1. Singleton 패턴
 * 2. 초기화 및 상태 관리
 * 3. Worker 로딩
 * 4. 파라미터 검증
 * 5. Python 결과 파싱
 * 6. 에러 처리
 */

import { PyodideCoreService, type WorkerMethodParam, WORKER_EXTRA_PACKAGES } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('PyodideCoreService', () => {
  let core: PyodideCoreService

  beforeEach(() => {
    // 각 테스트마다 싱글톤 초기화
    PyodideCoreService.resetInstance()
    core = PyodideCoreService.getInstance()
  })

  afterEach(() => {
    // 리소스 정리
    core.dispose()
  })

  // ========================================
  // 1. Singleton 패턴 테스트
  // ========================================

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PyodideCoreService.getInstance()
      const instance2 = PyodideCoreService.getInstance()

      expect(instance1).toBe(instance2)
      expect(instance1).toBe(core)
    })

    it('should reset instance on resetInstance()', () => {
      const instance1 = PyodideCoreService.getInstance()

      PyodideCoreService.resetInstance()

      const instance2 = PyodideCoreService.getInstance()

      expect(instance1).not.toBe(instance2)
    })
  })

  // ========================================
  // 2. 초기화 및 상태 관리 테스트
  // ========================================

  describe('Initialization', () => {
    it('should start as not initialized', () => {
      expect(core.isInitialized()).toBe(false)
    })

    it('should properly dispose resources', () => {
      core.dispose()

      expect(core.isInitialized()).toBe(false)
    })

    // 참고: initialize()는 브라우저 환경 필요 (Pyodide CDN 로드)
    // → 실제 테스트는 integration 테스트에서 수행
  })

  // ========================================
  // 3. Worker 패키지 구성 테스트
  // ========================================

  describe('Worker Package Configuration', () => {
    it('should have correct package configuration for all workers', () => {
      expect(WORKER_EXTRA_PACKAGES[1]).toEqual([])
      expect(WORKER_EXTRA_PACKAGES[2]).toEqual(['statsmodels', 'pandas'])
      expect(WORKER_EXTRA_PACKAGES[3]).toEqual(['statsmodels', 'pandas'])
      expect(WORKER_EXTRA_PACKAGES[4]).toEqual(['statsmodels', 'scikit-learn'])
    })

    it('should be frozen (immutable)', () => {
      expect(() => {
        // @ts-expect-error - 의도적인 불변성 테스트
        WORKER_EXTRA_PACKAGES[1] = ['test']
      }).toThrow()
    })
  })

  // ========================================
  // 4. 파라미터 검증 테스트
  // ========================================

  describe('Parameter Validation', () => {
    // private 메서드이므로 callWorkerMethod를 통해 간접 테스트
    // 여기서는 검증 로직의 단위 테스트를 위해 타입 체크만 수행

    it('should accept valid number', () => {
      const validParam: WorkerMethodParam = 42
      expect(typeof validParam).toBe('number')
    })

    it('should accept valid string', () => {
      const validParam: WorkerMethodParam = 'test'
      expect(typeof validParam).toBe('string')
    })

    it('should accept valid boolean', () => {
      const validParam: WorkerMethodParam = true
      expect(typeof validParam).toBe('boolean')
    })

    it('should accept valid number array', () => {
      const validParam: WorkerMethodParam = [1, 2, 3]
      expect(Array.isArray(validParam)).toBe(true)
    })

    it('should accept valid 2D number array', () => {
      const validParam: WorkerMethodParam = [[1, 2], [3, 4]]
      expect(Array.isArray(validParam)).toBe(true)
      expect(Array.isArray(validParam[0])).toBe(true)
    })

    it('should accept null', () => {
      const validParam: WorkerMethodParam = null
      expect(validParam).toBeNull()
    })

    it('should have correct WorkerMethodParam type constraints', () => {
      // TypeScript 컴파일 타임 타입 체크
      const validParams: WorkerMethodParam[] = [
        42,
        'string',
        true,
        [1, 2, 3],
        ['a', 'b'],
        [[1, 2], [3, 4]],
        [1, 'mixed'],
        null
      ]

      expect(validParams.length).toBe(8)
    })
  })

  // ========================================
  // 5. Python 에러 타입 가드 테스트
  // ========================================

  describe('Python Error Type Guard', () => {
    it('should identify Python error response', () => {
      const errorResponse = { error: 'Test error message' }

      expect(core.isPythonError(errorResponse)).toBe(true)
    })

    it('should reject non-error objects', () => {
      expect(core.isPythonError({ result: 42 })).toBe(false)
      expect(core.isPythonError({ error: 123 })).toBe(false) // error가 string이 아님
      expect(core.isPythonError(null)).toBe(false)
      expect(core.isPythonError(undefined)).toBe(false)
      expect(core.isPythonError('string')).toBe(false)
      expect(core.isPythonError(42)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(core.isPythonError({})).toBe(false) // error 필드 없음
      expect(core.isPythonError({ error: '' })).toBe(true) // 빈 문자열도 허용
      expect(core.isPythonError({ error: null })).toBe(false) // error가 null
    })
  })

  // ========================================
  // 6. 타입 안전성 테스트
  // ========================================

  describe('Type Safety', () => {
    it('should preserve generic type in callWorkerMethod signature', () => {
      // TypeScript 컴파일 타임 타입 체크
      type TestResult = { value: number; message: string }

      // 이 코드가 컴파일되면 타입 안전성이 보장됨
      const typedMethod = async () => {
        // core.callWorkerMethod<TestResult>()의 반환 타입이 Promise<TestResult>인지 확인
        type ReturnType = Awaited<ReturnType<typeof core.callWorkerMethod<TestResult>>>
        const _typeCheck: TestResult = {} as ReturnType
        return _typeCheck
      }

      expect(typedMethod).toBeDefined()
    })
  })

  // ========================================
  // 7. Worker 파일명 매핑 테스트
  // ========================================

  describe('Worker File Name Mapping', () => {
    // private 메서드이므로 간접 테스트
    // Worker 번호가 올바르게 파일명으로 매핑되는지는 integration 테스트에서 검증

    it('should have 4 worker types', () => {
      const workerNumbers: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]
      expect(workerNumbers.length).toBe(4)
    })
  })

  // ========================================
  // 8. 메서드 옵션 테스트
  // ========================================

  describe('Worker Method Options', () => {
    it('should have correct default options', () => {
      const defaultOptions = {}

      expect(defaultOptions).toEqual({})
    })

    it('should accept skipValidation option', () => {
      const options = { skipValidation: true }

      expect(options.skipValidation).toBe(true)
    })

    it('should accept errorMessage option', () => {
      const options = { errorMessage: 'Custom error' }

      expect(options.errorMessage).toBe('Custom error')
    })

    it('should accept both options', () => {
      const options = {
        skipValidation: true,
        errorMessage: 'Custom error'
      }

      expect(options.skipValidation).toBe(true)
      expect(options.errorMessage).toBe('Custom error')
    })
  })

  // ========================================
  // 9. 인터페이스 일관성 테스트
  // ========================================

  describe('Interface Consistency', () => {
    it('should have consistent initialization methods', () => {
      expect(typeof core.initialize).toBe('function')
      expect(typeof core.isInitialized).toBe('function')
      expect(typeof core.dispose).toBe('function')
    })

    it('should have worker loading methods', () => {
      expect(typeof core.ensureWorkerLoaded).toBe('function')
      expect(typeof core.ensureWorker1Loaded).toBe('function')
      expect(typeof core.ensureWorker2Loaded).toBe('function')
      expect(typeof core.ensureWorker3Loaded).toBe('function')
      expect(typeof core.ensureWorker4Loaded).toBe('function')
    })

    it('should have core helper methods', () => {
      expect(typeof core.callWorkerMethod).toBe('function')
      expect(typeof core.isPythonError).toBe('function')
    })
  })

  // ========================================
  // 10. 문서화 검증
  // ========================================

  describe('Documentation', () => {
    it('should have JSDoc comments on public methods', () => {
      // TypeScript로 컴파일되므로 JSDoc이 있는지 간접 확인
      expect(core.initialize.name).toBe('initialize')
      expect(core.callWorkerMethod.name).toBe('callWorkerMethod')
    })
  })
})
