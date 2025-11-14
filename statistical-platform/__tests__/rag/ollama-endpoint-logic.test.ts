/**
 * Ollama Endpoint 로직 테스트
 *
 * 검증 대상:
 * 1. environment-detector의 checkOllamaAvailable()
 * 2. 3가지 시나리오별 동작 확인
 */

describe('Ollama Endpoint Logic', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 환경변수 초기화
    jest.resetModules()
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('Scenario 1: 명시적 endpoint 설정', () => {
    it('환경변수 설정 시 어디서든 체크 시도해야 함', async () => {
      // Given: 명시적 endpoint 설정
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'http://custom-server:11434'

      // Mock fetch를 성공으로 설정
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ models: [] }),
        } as Response)
      )

      // When: checkOllamaAvailable 호출
      const { checkOllamaAvailable } = await import('@/lib/utils/environment-detector')
      const result = await checkOllamaAvailable()

      // Then: 체크 시도 + fetch 호출 확인
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://custom-server:11434/api/tags'),
        expect.any(Object)
      )
    })

    it('커스텀 endpoint로 실패 시 false 반환', async () => {
      // Given: 명시적 endpoint 설정 (연결 실패)
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'http://unreachable:11434'

      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

      // When
      const { checkOllamaAvailable } = await import('@/lib/utils/environment-detector')
      const result = await checkOllamaAvailable()

      // Then: false 반환 (하지만 시도는 함)
      expect(result).toBe(false)
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  describe('Scenario 2: endpoint 없음 + localhost', () => {
    it('localhost 환경에서 기본 localhost:11434 체크', async () => {
      // Given: 환경변수 없음 + localhost
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

      // Mock window.location.hostname
      Object.defineProperty(window, 'location', {
        value: { hostname: 'localhost' },
        writable: true,
      })

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({ models: [] }),
        } as Response)
      )

      // When
      const { checkOllamaAvailable } = await import('@/lib/utils/environment-detector')
      const result = await checkOllamaAvailable()

      // Then: 기본 localhost 체크
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:11434/api/tags'),
        expect.any(Object)
      )
    })
  })

  describe('Scenario 3: endpoint 없음 + 원격', () => {
    it('Vercel 환경에서 체크 스킵 (false 반환)', async () => {
      // Given: 환경변수 없음 + Vercel
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production'

      global.fetch = jest.fn()

      // When
      const { checkOllamaAvailable } = await import('@/lib/utils/environment-detector')
      const result = await checkOllamaAvailable()

      // Then: 체크 시도하지 않고 false 반환
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('클라우드 hostname에서 체크 스킵', async () => {
      // Given: 환경변수 없음 + 클라우드 hostname
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

      Object.defineProperty(window, 'location', {
        value: { hostname: 'myapp.vercel.app' },
        writable: true,
      })

      global.fetch = jest.fn()

      // When
      const { checkOllamaAvailable } = await import('@/lib/utils/environment-detector')
      const result = await checkOllamaAvailable()

      // Then
      expect(result).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('OllamaProvider.initialize() 통합', () => {
    it('명시적 endpoint 설정 시 초기화 성공', async () => {
      // Given: 환경변수 설정
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'http://my-server:11434'

      // Mock Ollama API
      global.fetch = jest.fn((url) => {
        if (typeof url === 'string' && url.includes('/api/tags')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              models: [
                { name: 'nomic-embed-text:latest' },
                { name: 'qwen2.5:latest' },
              ],
            }),
          } as Response)
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })

      // When: Provider 초기화
      const { OllamaRAGProvider } = await import('@/lib/rag/providers/ollama-provider')
      const provider = new OllamaRAGProvider({
        name: 'test-ollama',
        testMode: true, // 더미 데이터 사용
      })

      // Then: 에러 없이 초기화 완료
      await expect(provider.initialize()).resolves.not.toThrow()
    })

    it('endpoint 없음 + 웹 환경 → 초기화 실패 (의미있는 에러)', async () => {
      // Given: 환경변수 없음 + Vercel
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'production'

      // When
      const { OllamaRAGProvider } = await import('@/lib/rag/providers/ollama-provider')
      const provider = new OllamaRAGProvider({
        name: 'test-ollama',
        testMode: true
      })

      // Then: 사용자 친화적 에러 메시지
      await expect(provider.initialize()).rejects.toThrow(
        /RAG 챗봇은 로컬 환경에서만 사용 가능합니다/
      )
    })
  })

  describe('에러 핸들러 통합', () => {
    it('Provider 에러 메시지가 그대로 전달되어야 함', async () => {
      // Given: Provider에서 발생한 사용자 친화적 에러
      const providerError = new Error(
        'RAG 챗봇은 로컬 환경에서만 사용 가능합니다. NEXT_PUBLIC_OLLAMA_ENDPOINT를 설정하거나 localhost에서 실행해주세요.'
      )

      // When: handleRAGError 호출
      const { handleRAGError } = await import('@/lib/rag/utils/error-handler')
      const result = handleRAGError(providerError, 'RAG 초기화')

      // Then: 에러 메시지 그대로 전달
      expect(result.message).toBe(providerError.message)
      expect(result.message).toContain('NEXT_PUBLIC_OLLAMA_ENDPOINT')
    })

    it('일반 네트워크 에러는 표준 메시지로 변환', async () => {
      // Given: 일반 네트워크 에러
      const networkError = new Error('fetch failed')

      // When
      const { handleRAGError } = await import('@/lib/rag/utils/error-handler')
      const result = handleRAGError(networkError, 'RAG 쿼리')

      // Then: 표준 메시지
      expect(result.message).not.toBe(networkError.message)
      expect(result.message).toContain('Ollama 서버')
      expect(result.isNetworkError).toBe(false) // TypeError가 아니므로
    })
  })
})
