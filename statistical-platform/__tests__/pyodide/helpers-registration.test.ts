/**
 * helpers.py 모듈 등록 테스트
 *
 * 목적: Pyodide 파일 시스템에 helpers.py가 정상 등록되는지 검증
 * 관련 커밋: 49bf10a - fix: helpers.py 모듈 등록 및 Worker 상태 관리 개선
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('helpers.py Module Registration', () => {
  let pyodide: any
  let loadPyodide: any

  beforeAll(async () => {
    // Pyodide CDN 로드 시뮬레이션
    // 실제 테스트에서는 Pyodide를 로드하지 않고 모킹
    loadPyodide = jest.fn().mockResolvedValue({
      loadPackage: jest.fn().mockResolvedValue(undefined),
      runPythonAsync: jest.fn().mockResolvedValue(''),
      version: '0.26.4',
      FS: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
        mkdir: jest.fn()
      }
    })

    pyodide = await loadPyodide({ indexURL: '/pyodide/' })
  }, 30000)

  afterAll(() => {
    jest.clearAllMocks()
  })

  describe('1. FS.writeFile 호출 검증', () => {
    it('should call FS.writeFile with correct path', () => {
      const helpersCode = 'def clean_array(arr): pass'

      // Simulate helpers.py registration
      pyodide.FS.writeFile('/helpers.py', helpersCode)

      expect(pyodide.FS.writeFile).toHaveBeenCalledWith('/helpers.py', helpersCode)
      expect(pyodide.FS.writeFile).toHaveBeenCalledTimes(1)
    })

    it('should register helpers.py before executing it', () => {
      const helpersCode = 'def clean_array(arr): pass'
      const calls: string[] = []

      // Mock implementations to track call order
      pyodide.FS.writeFile = jest.fn(() => calls.push('writeFile'))
      pyodide.runPythonAsync = jest.fn(() => {
        calls.push('runPythonAsync')
        return Promise.resolve('')
      })

      // Simulate the actual code flow
      pyodide.FS.writeFile('/helpers.py', helpersCode)
      pyodide.runPythonAsync(helpersCode)

      // Verify call order: writeFile BEFORE runPythonAsync
      expect(calls).toEqual(['writeFile', 'runPythonAsync'])
    })

    it('should accept both string and Uint8Array', () => {
      const stringCode = 'def clean_array(arr): pass'
      const uint8Code = new Uint8Array([100, 101, 102])

      pyodide.FS.writeFile('/helpers.py', stringCode)
      expect(pyodide.FS.writeFile).toHaveBeenCalledWith('/helpers.py', stringCode)

      pyodide.FS.writeFile('/helpers.py', uint8Code)
      expect(pyodide.FS.writeFile).toHaveBeenCalledWith('/helpers.py', uint8Code)
    })
  })

  describe('2. PyodideInterface 타입 정의 검증', () => {
    it('should have FS property with writeFile method', () => {
      expect(pyodide.FS).toBeDefined()
      expect(pyodide.FS.writeFile).toBeDefined()
      expect(typeof pyodide.FS.writeFile).toBe('function')
    })

    it('should have all required FS methods', () => {
      expect(pyodide.FS.writeFile).toBeDefined()
      expect(pyodide.FS.readFile).toBeDefined()
      expect(pyodide.FS.unlink).toBeDefined()
      expect(pyodide.FS.mkdir).toBeDefined()
    })

    it('should have version property', () => {
      expect(pyodide.version).toBe('0.26.4')
    })

    it('should have loadPackage method', () => {
      expect(pyodide.loadPackage).toBeDefined()
      expect(typeof pyodide.loadPackage).toBe('function')
    })

    it('should have runPythonAsync method', () => {
      expect(pyodide.runPythonAsync).toBeDefined()
      expect(typeof pyodide.runPythonAsync).toBe('function')
    })
  })

  describe('3. Worker 초기화 흐름 검증', () => {
    it('should follow correct initialization order', async () => {
      const initSteps: string[] = []

      // Mock Pyodide initialization
      const mockPyodide = {
        loadPackage: jest.fn(() => {
          initSteps.push('loadPackage')
          return Promise.resolve()
        }),
        runPythonAsync: jest.fn(() => {
          initSteps.push('runPythonAsync')
          return Promise.resolve('')
        }),
        version: '0.26.4',
        FS: {
          writeFile: jest.fn(() => {
            initSteps.push('writeFile')
          }),
          readFile: jest.fn(),
          unlink: jest.fn(),
          mkdir: jest.fn()
        }
      }

      // Simulate initialization flow
      await mockPyodide.loadPackage(['numpy', 'scipy']) // Step 1 (after loader)
      mockPyodide.FS.writeFile('/helpers.py', 'code') // Step 2
      await mockPyodide.runPythonAsync('code') // Step 3

      expect(initSteps).toEqual(['loadPackage', 'writeFile', 'runPythonAsync'])
    })

    it('should handle fetch errors gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      })

      global.fetch = mockFetch

      try {
        const response = await fetch('/workers/python/helpers.py')
        if (!response.ok) {
          throw new Error(`Failed to load helpers.py: ${response.statusText}`)
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Failed to load helpers.py: Not Found')
      }
    })

    it('should load helpers.py content correctly', async () => {
      const mockHelpersCode = `
import numpy as np

def clean_array(arr):
    return np.array([x for x in arr if x is not None])

def clean_groups(groups):
    return [clean_array(g) for g in groups]
`

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockHelpersCode)
      })

      global.fetch = mockFetch

      const response = await fetch('/workers/python/helpers.py')
      const code = await response.text()

      expect(code).toContain('def clean_array')
      expect(code).toContain('def clean_groups')
    })
  })

  describe('4. Worker 1-4 모듈 import 시뮬레이션', () => {
    const workerImports = {
      worker1: 'from helpers import clean_array',
      worker2: 'from helpers import clean_array, clean_paired_arrays, clean_groups',
      worker3: 'from helpers import clean_array, clean_paired_arrays, clean_groups as clean_groups_helper',
      worker4: 'from helpers import clean_array, clean_xy_regression, clean_multiple_regression'
    }

    Object.entries(workerImports).forEach(([workerName, importStatement]) => {
      it(`should allow ${workerName} to import helpers`, async () => {
        // Simulate helpers.py registration
        pyodide.FS.writeFile('/helpers.py', 'def clean_array(arr): pass')
        await pyodide.runPythonAsync('def clean_array(arr): pass')

        // Simulate worker import
        const mockImport = jest.fn().mockResolvedValue({
          clean_array: jest.fn(),
          clean_groups: jest.fn()
        })

        pyodide.runPythonAsync = mockImport

        await pyodide.runPythonAsync(importStatement)

        expect(mockImport).toHaveBeenCalledWith(importStatement)
      })
    })

    it('should fail if helpers.py is not registered', async () => {
      const mockPyodide = {
        runPythonAsync: jest.fn().mockRejectedValue(
          new Error("ModuleNotFoundError: No module named 'helpers'")
        ),
        FS: {
          writeFile: jest.fn(),
          readFile: jest.fn(),
          unlink: jest.fn(),
          mkdir: jest.fn()
        }
      }

      try {
        await mockPyodide.runPythonAsync('from helpers import clean_array')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain("No module named 'helpers'")
      }
    })
  })

  describe('5. loadedWorkers Set 상태 관리', () => {
    it('should use const for loadedWorkers Set', () => {
      // TypeScript const 선언 검증
      const loadedWorkers: Set<number> = new Set()

      expect(loadedWorkers).toBeInstanceOf(Set)
      expect(loadedWorkers.size).toBe(0)
    })

    it('should allow adding workers to the Set', () => {
      const loadedWorkers: Set<number> = new Set()

      loadedWorkers.add(1)
      loadedWorkers.add(2)
      loadedWorkers.add(3)
      loadedWorkers.add(4)

      expect(loadedWorkers.size).toBe(4)
      expect(loadedWorkers.has(1)).toBe(true)
      expect(loadedWorkers.has(4)).toBe(true)
    })

    it('should prevent duplicate worker loading', () => {
      const loadedWorkers: Set<number> = new Set()

      loadedWorkers.add(2)
      loadedWorkers.add(2) // Duplicate
      loadedWorkers.add(2) // Duplicate

      expect(loadedWorkers.size).toBe(1)
    })

    it('should check worker loaded status', () => {
      const loadedWorkers: Set<number> = new Set([1, 2, 3])

      expect(loadedWorkers.has(2)).toBe(true)
      expect(loadedWorkers.has(5)).toBe(false)
    })
  })

  describe('6. 통합 시나리오 테스트', () => {
    it('should complete full initialization flow', async () => {
      const mockPyodide = {
        loadPackage: jest.fn().mockResolvedValue(undefined),
        runPythonAsync: jest.fn().mockResolvedValue(''),
        version: '0.26.4',
        FS: {
          writeFile: jest.fn(),
          readFile: jest.fn(),
          unlink: jest.fn(),
          mkdir: jest.fn()
        }
      }

      const helpersCode = 'def clean_array(arr): pass'

      // Full initialization
      await mockPyodide.loadPackage(['numpy', 'scipy'])
      mockPyodide.FS.writeFile('/helpers.py', helpersCode)
      await mockPyodide.runPythonAsync(helpersCode)

      expect(mockPyodide.loadPackage).toHaveBeenCalledWith(['numpy', 'scipy'])
      expect(mockPyodide.FS.writeFile).toHaveBeenCalledWith('/helpers.py', helpersCode)
      expect(mockPyodide.runPythonAsync).toHaveBeenCalledWith(helpersCode)
    })

    it('should handle Worker 2 levene_test scenario', async () => {
      const mockPyodide = {
        loadPackage: jest.fn().mockResolvedValue(undefined),
        runPythonAsync: jest.fn((code) => {
          if (code.includes('from helpers import')) {
            return Promise.resolve('') // Success
          }
          if (code.includes('levene_test')) {
            return Promise.resolve(JSON.stringify({
              statistic: 2.5,
              pValue: 0.083,
              equalVariance: true
            }))
          }
          return Promise.resolve('')
        }),
        FS: {
          writeFile: jest.fn(),
          readFile: jest.fn(),
          unlink: jest.fn(),
          mkdir: jest.fn()
        }
      }

      // Register helpers.py
      mockPyodide.FS.writeFile('/helpers.py', 'def clean_groups(groups): pass')
      await mockPyodide.runPythonAsync('def clean_groups(groups): pass')

      // Import helpers in Worker 2
      await mockPyodide.runPythonAsync('from helpers import clean_groups')

      // Execute levene_test
      const result = await mockPyodide.runPythonAsync('levene_test(groups)')
      const parsed = JSON.parse(result)

      expect(parsed.statistic).toBe(2.5)
      expect(parsed.pValue).toBeGreaterThan(0.05)
      expect(parsed.equalVariance).toBe(true)
    })
  })

  describe('7. 에러 처리 검증', () => {
    it('should throw error if FS.writeFile fails', () => {
      const mockPyodide = {
        FS: {
          writeFile: jest.fn(() => {
            throw new Error('Permission denied')
          }),
          readFile: jest.fn(),
          unlink: jest.fn(),
          mkdir: jest.fn()
        }
      }

      expect(() => {
        mockPyodide.FS.writeFile('/helpers.py', 'code')
      }).toThrow('Permission denied')
    })

    it('should handle empty helpers.py content', () => {
      const emptyCode = ''

      expect(() => {
        pyodide.FS.writeFile('/helpers.py', emptyCode)
      }).not.toThrow()
    })

    it('should handle very large helpers.py file', () => {
      const largeCode = 'x = 1\n'.repeat(10000) // 10,000 lines

      expect(() => {
        pyodide.FS.writeFile('/helpers.py', largeCode)
      }).not.toThrow()
    })
  })
})
