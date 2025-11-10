/**
 * environment-detector 테스트
 * @jest-environment jsdom
 */

import {
  detectEnvironment,
  checkDoclingAvailable,
  checkOllamaAvailable,
  getEnvironmentInfo,
  getCachedEnvironmentInfo,
  invalidateEnvironmentCache,
  type Environment,
} from '../environment-detector'

// fetch mock
global.fetch = jest.fn()

// setTimeout mock (clearTimeout 포함)
const mockClearTimeout = jest.fn()
const originalSetTimeout = global.setTimeout
global.setTimeout = jest.fn((callback, _delay) => {
  if (typeof callback === 'function') {
    callback()
  }
  return 123 as unknown as NodeJS.Timeout
}) as unknown as typeof setTimeout
global.clearTimeout = mockClearTimeout

describe('environment-detector', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // localStorage mock
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
      length: 0,
      key: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('detectEnvironment', () => {
    it('Vercel 환경에서 web 반환', () => {
      const originalEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production'

      const env = detectEnvironment()
      expect(env).toBe('web')

      // 복원
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_VERCEL_ENV
      } else {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalEnv
      }
    })

    it('기본 JSDOM 환경에서는 hostname 기반으로 판단', () => {
      // JSDOM 기본 hostname 확인
      const hostname = window.location.hostname
      const env = detectEnvironment()

      // JSDOM은 기본적으로 localhost를 사용하므로 local이어야 함
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        expect(env).toBe('local')
      } else {
        expect(env).toBe('web')
      }
    })
  })

  describe('checkDoclingAvailable', () => {
    it('웹 환경에서 false 반환', async () => {
      // Vercel 환경 설정
      const originalEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production'

      const result = await checkDoclingAvailable()
      expect(result).toBe(false)

      // 복원
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_VERCEL_ENV
      } else {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalEnv
      }
    })

    it('로컬 환경에서 Docling 서버 체크 (성공)', async () => {
      // fetch mock - 성공
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      const result = await checkDoclingAvailable()

      // Vercel 환경이 아니면 Docling 체크가 실행되어야 함
      if (!process.env.NEXT_PUBLIC_VERCEL_ENV) {
        expect(result).toBe(true)
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/health',
          expect.objectContaining({
            signal: expect.any(AbortSignal),
          })
        )
      } else {
        expect(result).toBe(false)
      }
    })

    it('로컬 환경에서 Docling 서버 체크 (실패 후 재시도)', async () => {
      // Vercel 환경 변수 제거
      const originalEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      delete process.env.NEXT_PUBLIC_VERCEL_ENV

      // fetch mock - 첫 번째 실패, 두 번째 성공
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
        } as Response)

      const result = await checkDoclingAvailable()
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(2)

      // 복원
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalEnv
      }
    })

    it('환경 변수로 Docling 엔드포인트 변경', async () => {
      // Vercel 환경 변수 제거
      const originalVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      delete process.env.NEXT_PUBLIC_VERCEL_ENV

      // 환경 변수 설정
      const originalEnv = process.env.NEXT_PUBLIC_DOCLING_ENDPOINT
      process.env.NEXT_PUBLIC_DOCLING_ENDPOINT = 'http://localhost:9000'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      await checkDoclingAvailable()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:9000/health',
        expect.any(Object)
      )

      // 복원
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_DOCLING_ENDPOINT
      } else {
        process.env.NEXT_PUBLIC_DOCLING_ENDPOINT = originalEnv
      }
      if (originalVercelEnv !== undefined) {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalVercelEnv
      }
    })
  })

  describe('checkOllamaAvailable', () => {
    it('Ollama 서버 체크 (성공)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      const result = await checkOllamaAvailable()
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.any(Object)
      )
    })

    it('Ollama 서버 체크 (실패)', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(
        new Error('Connection refused')
      )

      const result = await checkOllamaAvailable()
      expect(result).toBe(false)
    })

    it('환경 변수로 Ollama 엔드포인트 변경', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'http://localhost:12345'

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      await checkOllamaAvailable()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:12345/api/tags',
        expect.any(Object)
      )

      // 복원
      if (originalEnv === undefined) {
        delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      } else {
        process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = originalEnv
      }
    })
  })

  describe('getEnvironmentInfo', () => {
    it('전체 환경 정보 수집', async () => {
      // Vercel 환경 변수 제거
      const originalEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      delete process.env.NEXT_PUBLIC_VERCEL_ENV

      // Docling 성공, Ollama 성공
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      const info = await getEnvironmentInfo()

      expect(info.type).toBeDefined()
      expect(info.hostname).toBeDefined()
      expect(typeof info.doclingAvailable).toBe('boolean')
      expect(typeof info.ollamaAvailable).toBe('boolean')

      // 복원
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalEnv
      }
    })
  })

  describe('getCachedEnvironmentInfo', () => {
    it('캐시가 없으면 새로 가져오기', async () => {
      const localStorageMock = window.localStorage as unknown as {
        getItem: jest.Mock
        setItem: jest.Mock
      }
      localStorageMock.getItem.mockReturnValue(null)

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      const info = await getCachedEnvironmentInfo()

      expect(info.type).toBeDefined()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('캐시가 유효하면 캐시 반환', async () => {
      const cachedData = {
        info: {
          type: 'local' as Environment,
          doclingAvailable: true,
          ollamaAvailable: true,
          hostname: 'localhost',
        },
        timestamp: Date.now(),
      }

      const localStorageMock = window.localStorage as unknown as {
        getItem: jest.Mock
        setItem: jest.Mock
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData))

      const info = await getCachedEnvironmentInfo()

      expect(info.type).toBe('local')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('캐시가 만료되면 새로 가져오기', async () => {
      const cachedData = {
        info: {
          type: 'local' as Environment,
          doclingAvailable: true,
          ollamaAvailable: true,
          hostname: 'localhost',
        },
        timestamp: Date.now() - 70000, // 70초 전 (1분 캐시 만료)
      }

      const localStorageMock = window.localStorage as unknown as {
        getItem: jest.Mock
        setItem: jest.Mock
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cachedData))

      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response)

      await getCachedEnvironmentInfo()

      expect(global.fetch).toHaveBeenCalled()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('invalidateEnvironmentCache', () => {
    it('캐시 무효화', () => {
      const localStorageMock = window.localStorage as unknown as {
        removeItem: jest.Mock
      }

      invalidateEnvironmentCache()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('environment-info-cache')
    })
  })

  describe('fetchWithRetry 로직', () => {
    it('Retry 로직이 실제로 100ms 대기하는지 확인', async () => {
      // setTimeout을 실제로 호출하도록 복원
      global.setTimeout = originalSetTimeout

      const originalVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
      delete process.env.NEXT_PUBLIC_VERCEL_ENV

      // 모든 시도가 실패하도록 설정
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const start = Date.now()
      await checkDoclingAvailable()
      const elapsed = Date.now() - start

      // 2번 재시도하므로 최소 100ms는 걸려야 함
      expect(elapsed).toBeGreaterThanOrEqual(90) // 약간의 여유

      // setTimeout mock 복원
      global.setTimeout = jest.fn((callback, _delay) => {
        if (typeof callback === 'function') {
          callback()
        }
        return 123 as unknown as NodeJS.Timeout
      }) as unknown as typeof setTimeout

      if (originalVercelEnv !== undefined) {
        process.env.NEXT_PUBLIC_VERCEL_ENV = originalVercelEnv
      }
    })
  })
})
