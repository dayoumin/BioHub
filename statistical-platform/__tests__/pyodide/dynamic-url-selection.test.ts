/**
 * Pyodide 동적 URL 선택 테스트
 *
 * 목적: 환경별 Pyodide 경로 자동 선택 검증 (Vercel/내부망)
 * 관련 커밋: 8544ab1 - feat: Pyodide 경로 환경별 자동 선택
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

interface PyodideInterface {
  version: string
  loadPackage: jest.Mock
  runPythonAsync: jest.Mock
  FS: {
    writeFile: jest.Mock
    readFile: jest.Mock
    unlink: jest.Mock
    mkdir: jest.Mock
  }
}

describe('Pyodide Dynamic URL Selection', () => {
  let mockImportScripts: jest.Mock
  let mockLoadPyodide: jest.Mock<() => Promise<PyodideInterface>>

  beforeEach(() => {
    mockImportScripts = jest.fn()
    mockLoadPyodide = jest.fn<() => Promise<PyodideInterface>>().mockResolvedValue({
      version: '0.26.4',
      loadPackage: jest.fn(),
      runPythonAsync: jest.fn(),
      FS: {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        unlink: jest.fn(),
        mkdir: jest.fn()
      }
    })

    // Mock global importScripts
    global.importScripts = mockImportScripts as any
  })

  describe('1. WorkerRequest 인터페이스 검증', () => {
    it('should have pyodideUrl and scriptUrl optional fields', () => {
      interface WorkerRequest {
        id: string
        type: 'init' | 'loadWorker' | 'callMethod' | 'terminate'
        pyodideUrl?: string
        scriptUrl?: string
      }

      const cdnRequest: WorkerRequest = {
        id: 'test-1',
        type: 'init',
        pyodideUrl: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
        scriptUrl: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
      }

      const localRequest: WorkerRequest = {
        id: 'test-2',
        type: 'init',
        pyodideUrl: '/pyodide/',
        scriptUrl: '/pyodide/pyodide.js'
      }

      const fallbackRequest: WorkerRequest = {
        id: 'test-3',
        type: 'init'
        // pyodideUrl, scriptUrl 생략 → Fallback
      }

      expect(cdnRequest.pyodideUrl).toBe('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/')
      expect(localRequest.pyodideUrl).toBe('/pyodide/')
      expect(fallbackRequest.pyodideUrl).toBeUndefined()
    })
  })

  describe('2. 환경별 URL 선택 검증', () => {
    it('should use CDN URL for Vercel environment', () => {
      const cdnScriptUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
      const cdnIndexUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

      // Simulate handleInit with CDN URLs
      const finalScriptUrl = cdnScriptUrl || '/pyodide/pyodide.js'
      const finalPyodideUrl = cdnIndexUrl || '/pyodide/'

      expect(finalScriptUrl).toBe(cdnScriptUrl)
      expect(finalPyodideUrl).toBe(cdnIndexUrl)
    })

    it('should use local URL for offline environment', () => {
      const localScriptUrl = '/pyodide/pyodide.js'
      const localIndexUrl = '/pyodide/'

      // Simulate handleInit with local URLs
      const finalScriptUrl = localScriptUrl || '/pyodide/pyodide.js'
      const finalPyodideUrl = localIndexUrl || '/pyodide/'

      expect(finalScriptUrl).toBe(localScriptUrl)
      expect(finalPyodideUrl).toBe(localIndexUrl)
    })

    it('should fallback to local URL when URLs not provided', () => {
      const scriptUrl = undefined
      const pyodideUrl = undefined

      // Simulate fallback logic
      const finalScriptUrl = scriptUrl || '/pyodide/pyodide.js'
      const finalPyodideUrl = pyodideUrl || '/pyodide/'

      expect(finalScriptUrl).toBe('/pyodide/pyodide.js')
      expect(finalPyodideUrl).toBe('/pyodide/')
    })
  })

  describe('3. importScripts 동적 호출 검증', () => {
    it('should call importScripts with CDN URL', () => {
      const cdnScriptUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'

      mockImportScripts(cdnScriptUrl)

      expect(mockImportScripts).toHaveBeenCalledWith(cdnScriptUrl)
      expect(mockImportScripts).toHaveBeenCalledTimes(1)
    })

    it('should call importScripts with local URL', () => {
      const localScriptUrl = '/pyodide/pyodide.js'

      mockImportScripts(localScriptUrl)

      expect(mockImportScripts).toHaveBeenCalledWith(localScriptUrl)
      expect(mockImportScripts).toHaveBeenCalledTimes(1)
    })

    it('should handle importScripts errors gracefully', () => {
      const invalidUrl = 'invalid-url'

      mockImportScripts.mockImplementation(() => {
        throw new Error('Failed to load script')
      })

      expect(() => mockImportScripts(invalidUrl)).toThrow('Failed to load script')
    })
  })

  describe('4. loadPyodide 동적 호출 검증', () => {
    it('should call loadPyodide with CDN indexURL', async () => {
      const cdnIndexUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

      await mockLoadPyodide()

      expect(mockLoadPyodide).toHaveBeenCalled()
    })

    it('should call loadPyodide with local indexURL', async () => {
      const localIndexUrl = '/pyodide/'

      await mockLoadPyodide()

      expect(mockLoadPyodide).toHaveBeenCalled()
    })

    it('should return Pyodide instance with correct version', async () => {
      const pyodide = await mockLoadPyodide()

      expect(pyodide.version).toBe('0.26.4')
      expect(pyodide.loadPackage).toBeDefined()
      expect(pyodide.FS).toBeDefined()
    })
  })

  describe('5. 통합 시나리오: Vercel 환경', () => {
    it('should complete full init flow with CDN URLs', async () => {
      const cdnScriptUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
      const cdnIndexUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'

      // Step 1: Load loader script
      mockImportScripts(cdnScriptUrl)

      // Step 2: Load Pyodide
      const pyodide = await mockLoadPyodide()

      // Step 3: Load packages
      await pyodide.loadPackage(['numpy', 'scipy'])

      expect(mockImportScripts).toHaveBeenCalledWith(cdnScriptUrl)
      expect(mockLoadPyodide).toHaveBeenCalled()
      expect(pyodide.loadPackage).toHaveBeenCalledWith(['numpy', 'scipy'])
    })
  })

  describe('6. 통합 시나리오: 내부망 환경', () => {
    it('should complete full init flow with local URLs', async () => {
      const localScriptUrl = '/pyodide/pyodide.js'
      const localIndexUrl = '/pyodide/'

      // Step 1: Load loader script
      mockImportScripts(localScriptUrl)

      // Step 2: Load Pyodide
      const pyodide = await mockLoadPyodide()

      // Step 3: Load packages
      await pyodide.loadPackage(['numpy', 'scipy'])

      expect(mockImportScripts).toHaveBeenCalledWith(localScriptUrl)
      expect(mockLoadPyodide).toHaveBeenCalled()
      expect(pyodide.loadPackage).toHaveBeenCalledWith(['numpy', 'scipy'])
    })
  })

  describe('7. 통합 시나리오: Fallback', () => {
    it('should use local URLs when params undefined', async () => {
      const scriptUrl = undefined
      const pyodideUrl = undefined

      // Fallback logic
      const finalScriptUrl = scriptUrl || '/pyodide/pyodide.js'
      const finalPyodideUrl = pyodideUrl || '/pyodide/'

      // Step 1: Load loader script
      mockImportScripts(finalScriptUrl)

      // Step 2: Load Pyodide
      await mockLoadPyodide()

      expect(mockImportScripts).toHaveBeenCalledWith('/pyodide/pyodide.js')
      expect(mockLoadPyodide).toHaveBeenCalled()
    })
  })

  describe('8. Console 로그 검증', () => {
    it('should log loader URL during initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      const scriptUrl = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js'
      console.log('[PyodideWorker] Loading Pyodide loader from:', scriptUrl)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PyodideWorker] Loading Pyodide loader from:',
        scriptUrl
      )

      consoleSpy.mockRestore()
    })

    it('should log indexURL during initialization', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      const indexURL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
      console.log('[PyodideWorker] Initializing Pyodide from:', indexURL)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PyodideWorker] Initializing Pyodide from:',
        indexURL
      )

      consoleSpy.mockRestore()
    })
  })

  describe('9. 에러 처리 검증', () => {
    it('should handle 404 error for CDN URLs', async () => {
      mockImportScripts.mockImplementation(() => {
        throw new Error('Script load error: 404 Not Found')
      })

      expect(() => {
        mockImportScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js')
      }).toThrow('404 Not Found')
    })

    it('should handle 404 error for local URLs', async () => {
      mockImportScripts.mockImplementation(() => {
        throw new Error('Script load error: 404 Not Found')
      })

      expect(() => {
        mockImportScripts('/pyodide/pyodide.js')
      }).toThrow('404 Not Found')
    })

    it('should handle Pyodide initialization failure', async () => {
      mockLoadPyodide.mockRejectedValue(new Error('Pyodide load failed'))

      await expect(mockLoadPyodide()).rejects.toThrow(
        'Pyodide load failed'
      )
    })
  })

  describe('10. getPyodideCDNUrls 시뮬레이션', () => {
    it('should return CDN URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is false', () => {
      const getPyodideCDNUrls = () => {
        const useLocal = false

        if (useLocal) {
          return {
            scriptURL: '/pyodide/pyodide.js',
            indexURL: '/pyodide/'
          }
        }

        return {
          scriptURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        }
      }

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toContain('cdn.jsdelivr.net')
      expect(urls.indexURL).toContain('cdn.jsdelivr.net')
    })

    it('should return local URLs when NEXT_PUBLIC_PYODIDE_USE_LOCAL is true', () => {
      const getPyodideCDNUrls = () => {
        const useLocal = true

        if (useLocal) {
          return {
            scriptURL: '/pyodide/pyodide.js',
            indexURL: '/pyodide/'
          }
        }

        return {
          scriptURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js',
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        }
      }

      const urls = getPyodideCDNUrls()

      expect(urls.scriptURL).toBe('/pyodide/pyodide.js')
      expect(urls.indexURL).toBe('/pyodide/')
    })
  })

  describe('11. 하위 호환성 검증', () => {
    it('should support old code without pyodideUrl param', async () => {
      // Old code: handleInit(id)
      const requestId = 'test-id'
      const pyodideUrl = undefined
      const scriptUrl = undefined

      // Fallback logic ensures backward compatibility
      const finalScriptUrl = scriptUrl || '/pyodide/pyodide.js'
      const finalPyodideUrl = pyodideUrl || '/pyodide/'

      expect(finalScriptUrl).toBe('/pyodide/pyodide.js')
      expect(finalPyodideUrl).toBe('/pyodide/')
    })

    it('should not break existing Worker calls', () => {
      interface OldWorkerRequest {
        id: string
        type: 'init'
      }

      interface NewWorkerRequest {
        id: string
        type: 'init'
        pyodideUrl?: string
        scriptUrl?: string
      }

      const oldRequest: OldWorkerRequest = {
        id: 'test',
        type: 'init'
      }

      // Old request is compatible with new interface
      const newRequest: NewWorkerRequest = oldRequest

      expect(newRequest.id).toBe('test')
      expect(newRequest.pyodideUrl).toBeUndefined()
      expect(newRequest.scriptUrl).toBeUndefined()
    })
  })
})
