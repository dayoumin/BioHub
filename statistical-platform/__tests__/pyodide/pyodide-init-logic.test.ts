/**
 * Pyodide 초기화 로직 실제 함수 테스트
 *
 * 목적: pyodide-init-logic.ts의 실제 함수를 import하여 회귀 방지
 * 이전 helpers-registration.test.ts와의 차이:
 * - Mock 아님: 실제 함수 import 및 호출
 * - 회귀 감지: 함수 로직 변경 시 즉시 테스트 실패
 * - Worker 독립: Worker 컨텍스트 제약 없이 테스트 가능
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  registerHelpersModule,
  validateInitialization,
  getAdditionalPackages,
  getWorkerFileName,
  validateInitializationOrder
} from '@/lib/services/pyodide/core/pyodide-init-logic'
import type { PyodideInterface } from '@/types/pyodide'

/**
 * 테스트용 완전한 Pyodide Mock 생성
 */
function createMockPyodide(): PyodideInterface {
  return {
    version: 'v0.28.3',
    loadPackage: async (_packages: string | string[]) => {},
    runPython: (_code: string) => undefined,
    runPythonAsync: async (_code: string) => '',
    globals: {},
    loadedPackages: {},
    isPyProxy: (_obj: unknown) => false,
    FS: {
      writeFile: (_path: string, _data: string | Uint8Array) => {},
      readFile: (_path: string, _options?: { encoding?: string }) => '',
      unlink: (_path: string) => {},
      mkdir: (_path: string) => {}
    }
  }
}

describe('Pyodide Init Logic - Real Function Tests', () => {
  describe('1. registerHelpersModule (회귀 방지 핵심)', () => {
    let mockPyodide: PyodideInterface

    beforeEach(() => {
      // Mock Pyodide 인스턴스 생성
      mockPyodide = createMockPyodide()
    })

    it('should call FS.writeFile with /helpers.py path', async () => {
      const writeFileSpy = jest.fn()
      mockPyodide.FS.writeFile = writeFileSpy

      const helpersCode = 'def test():\n    pass'
      await registerHelpersModule(mockPyodide, helpersCode)

      expect(writeFileSpy).toHaveBeenCalledWith('/helpers.py', helpersCode)
    })

    it('should call runPythonAsync with helpers code', async () => {
      const runPythonSpy = jest.fn().mockResolvedValue('')
      mockPyodide.runPythonAsync = runPythonSpy

      const helpersCode = 'def test():\n    pass'
      await registerHelpersModule(mockPyodide, helpersCode)

      expect(runPythonSpy).toHaveBeenCalledWith(helpersCode)
    })

    it('should call writeFile BEFORE runPythonAsync', async () => {
      const callOrder: string[] = []

      mockPyodide.FS.writeFile = () => {
        callOrder.push('writeFile')
      }
      mockPyodide.runPythonAsync = async () => {
        callOrder.push('runPythonAsync')
        return ''
      }

      await registerHelpersModule(mockPyodide, 'def test(): pass')

      expect(callOrder).toEqual(['writeFile', 'runPythonAsync'])
    })

    it('should propagate errors from runPythonAsync', async () => {
      mockPyodide.runPythonAsync = async () => {
        throw new Error('Python syntax error')
      }

      await expect(
        registerHelpersModule(mockPyodide, 'invalid python')
      ).rejects.toThrow('Python syntax error')
    })

    it('회귀 방지: writeFile 호출이 제거되면 실패해야 함', async () => {
      const writeFileSpy = jest.fn()
      mockPyodide.FS.writeFile = writeFileSpy

      await registerHelpersModule(mockPyodide, 'def test(): pass')

      // 이 테스트는 registerHelpersModule에서 writeFile 호출을 제거하면 실패함
      expect(writeFileSpy).toHaveBeenCalled()
    })

    it('회귀 방지: runPythonAsync 호출이 제거되면 실패해야 함', async () => {
      const runPythonSpy = jest.fn().mockResolvedValue('')
      mockPyodide.runPythonAsync = runPythonSpy

      await registerHelpersModule(mockPyodide, 'def test(): pass')

      // 이 테스트는 registerHelpersModule에서 runPythonAsync 호출을 제거하면 실패함
      expect(runPythonSpy).toHaveBeenCalled()
    })
  })

  describe('2. validateInitialization', () => {
    it('should return valid for complete Pyodide instance', () => {
      const pyodide = createMockPyodide()

      const result = validateInitialization(pyodide)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.version).toBe('v0.28.3')
    })

    it('should return invalid for null Pyodide', () => {
      const result = validateInitialization(null)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Pyodide instance is null')
    })

    it('should detect missing FS', () => {
      const incompletePyodide = {
        version: 'v0.28.3',
        loadPackage: async () => {},
        runPythonAsync: async () => ''
      } as unknown as PyodideInterface

      const result = validateInitialization(incompletePyodide)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Pyodide.FS is missing')
    })

    it('should validate expected version', () => {
      const pyodide = createMockPyodide()

      const result = validateInitialization(pyodide, 'v0.28.3')

      expect(result.isValid).toBe(true)
    })

    it('should fail for version mismatch', () => {
      const pyodide = createMockPyodide()

      const result = validateInitialization(pyodide, 'v0.29.0')

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Version mismatch: expected v0.29.0, got v0.28.3')
    })
  })

  describe('3. getAdditionalPackages (실제 함수)', () => {
    it('should return empty array for Worker 1', () => {
      const packages = getAdditionalPackages(1)
      expect(packages).toEqual([])
    })

    it('should return empty array for Worker 2', () => {
      const packages = getAdditionalPackages(2)
      expect(packages).toEqual([])
    })

    it('should return statsmodels and scikit-learn for Worker 3', () => {
      const packages = getAdditionalPackages(3)
      expect(packages).toEqual(['statsmodels', 'scikit-learn'])
    })

    it('should return statsmodels and scikit-learn for Worker 4', () => {
      const packages = getAdditionalPackages(4)
      expect(packages).toEqual(['statsmodels', 'scikit-learn'])
    })

    it('should return empty array for invalid worker number', () => {
      const packages = getAdditionalPackages(99)
      expect(packages).toEqual([])
    })

    it('회귀 방지: Worker 3 패키지 변경 시 감지', () => {
      const packages = getAdditionalPackages(3)

      // Worker 3는 반드시 statsmodels + scikit-learn을 포함해야 함 (KMeans, PCA, LDA)
      expect(packages).toContain('statsmodels')
      expect(packages).toContain('scikit-learn')
    })

    it('회귀 방지: Worker 4 패키지 변경 시 감지', () => {
      const packages = getAdditionalPackages(4)

      // Worker 4는 반드시 statsmodels + scikit-learn을 포함해야 함
      expect(packages).toContain('statsmodels')
      expect(packages).toContain('scikit-learn')
    })
  })

  describe('4. getWorkerFileName (실제 함수)', () => {
    it('should return correct filename for Worker 1', () => {
      const fileName = getWorkerFileName(1)
      expect(fileName).toBe('worker1-descriptive')
    })

    it('should return correct filename for Worker 2', () => {
      const fileName = getWorkerFileName(2)
      expect(fileName).toBe('worker2-hypothesis')
    })

    it('should return correct filename for Worker 3', () => {
      const fileName = getWorkerFileName(3)
      expect(fileName).toBe('worker3-nonparametric-anova')
    })

    it('should return correct filename for Worker 4', () => {
      const fileName = getWorkerFileName(4)
      expect(fileName).toBe('worker4-regression-advanced')
    })

    it('should throw error for invalid worker number', () => {
      expect(() => getWorkerFileName(0)).toThrow('Invalid worker number: 0')
      expect(() => getWorkerFileName(5)).toThrow('Invalid worker number: 5')
      expect(() => getWorkerFileName(99)).toThrow('Invalid worker number: 99')
    })

    it('회귀 방지: Worker 1 파일명 변경 시 감지', () => {
      const fileName = getWorkerFileName(1)

      // Worker 1은 반드시 'descriptive'를 포함해야 함
      expect(fileName).toContain('descriptive')
    })

    it('회귀 방지: Worker 3 파일명 변경 시 감지', () => {
      const fileName = getWorkerFileName(3)

      // Worker 3는 반드시 'nonparametric'을 포함해야 함
      expect(fileName).toContain('nonparametric')
    })
  })

  describe('5. validateInitializationOrder', () => {
    it('should pass for correct initialization order', () => {
      const steps = ['loadPyodide', 'loadPackage', 'writeFile']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail if loadPyodide is missing', () => {
      const steps = ['loadPackage', 'writeFile']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('loadPyodide step is missing')
    })

    it('should fail if loadPackage is missing', () => {
      const steps = ['loadPyodide', 'writeFile']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('loadPackage step is missing')
    })

    it('should fail if writeFile is missing', () => {
      const steps = ['loadPyodide', 'loadPackage']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('writeFile step is missing')
    })

    it('should fail if loadPyodide comes after loadPackage', () => {
      const steps = ['loadPackage', 'loadPyodide', 'writeFile']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('loadPyodide must run before loadPackage')
    })

    it('should fail if loadPackage comes after writeFile', () => {
      const steps = ['loadPyodide', 'writeFile', 'loadPackage']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('loadPackage must run before writeFile')
    })

    it('should fail for completely wrong order', () => {
      const steps = ['writeFile', 'loadPackage', 'loadPyodide']
      const result = validateInitializationOrder(steps)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('6. 통합 시나리오 (회귀 방지)', () => {
    it('Worker 3 초기화 플로우', async () => {
      // 1. Pyodide 검증
      const pyodide = createMockPyodide()

      const validation = validateInitialization(pyodide)
      expect(validation.isValid).toBe(true)

      // 2. helpers.py 등록
      await registerHelpersModule(pyodide, 'def test(): pass')

      // 3. Worker 3 파일명 가져오기
      const fileName = getWorkerFileName(3)
      expect(fileName).toBe('worker3-nonparametric-anova')

      // 4. Worker 3 추가 패키지 확인
      const packages = getAdditionalPackages(3)
      expect(packages).toEqual(['statsmodels', 'scikit-learn'])
    })

    it('Worker 4 초기화 플로우', async () => {
      // 1. Pyodide 검증
      const pyodide = createMockPyodide()

      const validation = validateInitialization(pyodide)
      expect(validation.isValid).toBe(true)

      // 2. helpers.py 등록
      await registerHelpersModule(pyodide, 'def test(): pass')

      // 3. Worker 4 파일명 가져오기
      const fileName = getWorkerFileName(4)
      expect(fileName).toBe('worker4-regression-advanced')

      // 4. Worker 4 추가 패키지 확인 (statsmodels + scikit-learn)
      const packages = getAdditionalPackages(4)
      expect(packages).toEqual(['statsmodels', 'scikit-learn'])
    })

    it('초기화 순서 검증', () => {
      const correctOrder = ['loadPyodide', 'loadPackage', 'writeFile', 'runPythonAsync']
      const result = validateInitializationOrder(correctOrder)

      expect(result.isValid).toBe(true)
    })
  })
})
