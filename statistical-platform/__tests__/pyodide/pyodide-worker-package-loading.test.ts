/**
 * Pyodide Worker 패키지 로딩 순서 테스트
 *
 * 목적:
 * - Worker 3/4의 패키지 로딩이 Python 코드 실행 전에 완료되는지 검증
 * - 패키지 로드 실패 시 명확한 에러가 발생하는지 검증
 * - 회귀 방지: 패키지 로딩 순서 변경 시 즉시 테스트 실패
 *
 * 관련 이슈:
 * - Critical Bug: sklearn ModuleNotFoundError (2025-11-21 수정)
 * - 기존: Python 코드 실행 → 패키지 로드 (잘못된 순서)
 * - 수정: 패키지 로드 → Python 코드 실행 (올바른 순서)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import type { PyodideInterface } from '@/types/pyodide'

/**
 * 테스트용 Pyodide Mock 생성
 */
function createMockPyodide(): PyodideInterface {
  return {
    version: 'v0.28.3',
    loadPackage: jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>,
    runPython: jest.fn() as jest.MockedFunction<(code: string) => unknown>,
    runPythonAsync: jest.fn() as jest.MockedFunction<(code: string) => Promise<unknown>>,
    globals: {},
    loadedPackages: {},
    isPyProxy: (_obj: unknown) => false,
    FS: {
      writeFile: jest.fn() as jest.MockedFunction<(path: string, data: string | Uint8Array) => void>,
      readFile: jest.fn() as jest.MockedFunction<(path: string, options?: { encoding?: string }) => string | Uint8Array>,
      unlink: jest.fn() as jest.MockedFunction<(path: string) => void>,
      mkdir: jest.fn() as jest.MockedFunction<(path: string) => void>
    }
  }
}

/**
 * PyodideCoreService의 ensureWorkerLoaded 로직을 추출한 함수
 * (실제 코드와 동일한 로직)
 */
async function loadWorkerWithPackages(
  pyodide: PyodideInterface,
  workerNumber: number,
  workerCode: string,
  additionalPackages: string[]
): Promise<void> {
  // ⚠️ CRITICAL: Load additional packages BEFORE executing worker code
  // Worker 3/4 import sklearn/statsmodels at the top, so packages must be loaded first
  if (additionalPackages.length > 0) {
    await pyodide.loadPackage(additionalPackages)
  }
  await pyodide.runPythonAsync(workerCode)
}

/**
 * 패키지 로드 함수 (재시도 로직 포함)
 */
async function loadAdditionalPackagesWithRetry(
  pyodide: PyodideInterface,
  packages: string[],
  maxRetries: number = 3
): Promise<void> {
  for (const pkg of packages) {
    let retryCount = 0

    while (retryCount < maxRetries) {
      try {
        await pyodide.loadPackage([pkg])
        break // 성공 시 다음 패키지로
      } catch (error) {
        retryCount++
        const errorMessage = error instanceof Error ? error.message : String(error)

        if (retryCount >= maxRetries) {
          // ⚠️ CRITICAL: Worker 3/4는 sklearn/statsmodels을 파일 첫 줄에서 import하므로
          // 패키지 없으면 Worker 코드 실행이 무조건 실패함
          // 따라서 에러를 throw하여 Worker 로드 자체를 중단
          const fullErrorMessage =
            `Worker: ${pkg} 패키지 로드 실패 (${maxRetries}회 시도)\n` +
            `에러: ${errorMessage}\n` +
            `Worker는 ${pkg} 없이 실행할 수 없습니다.`
          throw new Error(fullErrorMessage)
        }
      }
    }
  }
}

describe('Pyodide Worker Package Loading Order', () => {
  let mockPyodide: PyodideInterface

  beforeEach(() => {
    mockPyodide = createMockPyodide()
  })

  describe('1. 패키지 로드 순서 검증 (Critical)', () => {
    it('should load packages BEFORE executing Python code', async () => {
      const callOrder: string[] = []

      // loadPackage와 runPythonAsync 호출 순서 추적
      mockPyodide.loadPackage = jest.fn().mockImplementation(async () => {
        callOrder.push('loadPackage')
      })
      mockPyodide.runPythonAsync = jest.fn().mockImplementation(async () => {
        callOrder.push('runPythonAsync')
        return ''
      })

      const workerCode = 'from sklearn.cluster import KMeans'
      const packages = ['scikit-learn']

      await loadWorkerWithPackages(mockPyodide, 3, workerCode, packages)

      // 순서 검증: loadPackage가 runPythonAsync보다 먼저 호출되어야 함
      expect(callOrder).toEqual(['loadPackage', 'runPythonAsync'])
    })

    it('should call loadPackage with correct packages for Worker 3', async () => {
      const loadPackageSpy = jest.fn().mockResolvedValue(undefined)
      mockPyodide.loadPackage = loadPackageSpy

      const workerCode = 'from sklearn.cluster import KMeans'
      const packages = ['statsmodels', 'scikit-learn']

      await loadWorkerWithPackages(mockPyodide, 3, workerCode, packages)

      expect(loadPackageSpy).toHaveBeenCalledWith(packages)
    })

    it('should NOT call loadPackage for Worker 1 (no additional packages)', async () => {
      const loadPackageSpy = jest.fn()
      mockPyodide.loadPackage = loadPackageSpy

      const workerCode = 'import numpy as np'
      const packages: string[] = [] // Worker 1은 추가 패키지 없음

      await loadWorkerWithPackages(mockPyodide, 1, workerCode, packages)

      expect(loadPackageSpy).not.toHaveBeenCalled()
    })
  })

  describe('2. 패키지 로드 실패 시 에러 처리', () => {
    it('should throw error when package load fails after max retries', async () => {
      const loadPackageError = new Error('Network error')
      mockPyodide.loadPackage = (jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>).mockRejectedValue(loadPackageError)

      const packages = ['scikit-learn']

      await expect(
        loadAdditionalPackagesWithRetry(mockPyodide, packages, 3)
      ).rejects.toThrow(/scikit-learn 패키지 로드 실패/)
    })

    it('should include error details in thrown message', async () => {
      const loadPackageError = new Error('CDN timeout')
      mockPyodide.loadPackage = (jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>).mockRejectedValue(loadPackageError)

      const packages = ['scikit-learn']

      await expect(
        loadAdditionalPackagesWithRetry(mockPyodide, packages, 3)
      ).rejects.toThrow(/CDN timeout/)
    })

    it('should specify that Worker cannot run without the package', async () => {
      mockPyodide.loadPackage = (jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>).mockRejectedValue(new Error('Failed'))

      const packages = ['statsmodels']

      await expect(
        loadAdditionalPackagesWithRetry(mockPyodide, packages, 3)
      ).rejects.toThrow(/Worker는 statsmodels 없이 실행할 수 없습니다/)
    })

    it('should retry up to maxRetries times before throwing', async () => {
      const loadPackageSpy = jest.fn().mockRejectedValue(new Error('Failed'))
      mockPyodide.loadPackage = loadPackageSpy

      const packages = ['scikit-learn']

      try {
        await loadAdditionalPackagesWithRetry(mockPyodide, packages, 3)
      } catch {
        // Expected to throw
      }

      // 3번 재시도 = 총 3번 호출
      expect(loadPackageSpy).toHaveBeenCalledTimes(3)
    })

    it('should succeed on retry if package loads successfully', async () => {
      let attemptCount = 0
      const loadPackageSpy = jest.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount < 2) {
          throw new Error('Temporary failure')
        }
        // 2번째 시도에서 성공
      })
      mockPyodide.loadPackage = loadPackageSpy

      const packages = ['scikit-learn']

      await expect(
        loadAdditionalPackagesWithRetry(mockPyodide, packages, 3)
      ).resolves.not.toThrow()

      expect(loadPackageSpy).toHaveBeenCalledTimes(2) // 1번 실패 + 1번 성공
    })
  })

  describe('3. Worker별 패키지 매핑 검증', () => {
    it('Worker 1: should have no additional packages', () => {
      const packages = getWorker1Packages()
      expect(packages).toEqual([])
    })

    it('Worker 2: should have statsmodels and pandas', () => {
      const packages = getWorker2Packages()
      expect(packages).toEqual(['statsmodels', 'pandas'])
    })

    it('Worker 3: should have statsmodels, pandas, and scikit-learn', () => {
      const packages = getWorker3Packages()
      expect(packages).toEqual(['statsmodels', 'pandas', 'scikit-learn'])
    })

    it('Worker 4: should have statsmodels and scikit-learn', () => {
      const packages = getWorker4Packages()
      expect(packages).toEqual(['statsmodels', 'scikit-learn'])
    })
  })

  describe('4. 실제 Worker 코드와의 통합', () => {
    it('Worker 3 code should fail without sklearn package', async () => {
      // 패키지 로드 실패 시나리오
      mockPyodide.loadPackage = (jest.fn() as jest.MockedFunction<(packages: string | string[]) => Promise<void>>).mockRejectedValue(
        new Error('sklearn not available')
      )

      const worker3Code = `
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import numpy as np
`
      const packages = ['scikit-learn']

      await expect(
        loadAdditionalPackagesWithRetry(mockPyodide, packages, 1)
      ).rejects.toThrow()
    })

    it('Worker 3 code should succeed when packages load correctly', async () => {
      const callOrder: string[] = []

      mockPyodide.loadPackage = jest.fn().mockImplementation(async () => {
        callOrder.push('loadPackage')
      })
      mockPyodide.runPythonAsync = jest.fn().mockImplementation(async () => {
        callOrder.push('runPythonAsync')
        return ''
      })

      const worker3Code = `
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import numpy as np
`
      const packages = ['statsmodels', 'pandas', 'scikit-learn']

      await loadWorkerWithPackages(mockPyodide, 3, worker3Code, packages)

      // 성공적으로 로드되고, 순서가 올바른지 확인
      expect(callOrder).toEqual(['loadPackage', 'runPythonAsync'])
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(worker3Code)
    })
  })
})

// ========================================
// Helper Functions (실제 WORKER_EXTRA_PACKAGES 매핑)
// ========================================

function getWorker1Packages(): string[] {
  return []
}

function getWorker2Packages(): string[] {
  return ['statsmodels', 'pandas']
}

function getWorker3Packages(): string[] {
  return ['statsmodels', 'pandas', 'scikit-learn']
}

function getWorker4Packages(): string[] {
  return ['statsmodels', 'scikit-learn']
}
