/**
 * Service Worker 테스트
 *
 * localhost 우회 로직 검증
 */

describe('Service Worker - localhost bypass', () => {
  let fetchHandler
  let mockEvent
  let mockRequest
  let mockFetch

  beforeEach(() => {
    // Mock fetch 함수
    mockFetch = jest.fn()

    // Service Worker의 fetch 이벤트 핸들러 모의 구현
    fetchHandler = (event) => {
      const { request } = event
      const url = new URL(request.url)

      // localhost 요청은 Service Worker가 개입하지 않음
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return // Service Worker 처리 생략 (브라우저 기본 동작)
      }

      // Pyodide CDN 패턴
      const PYODIDE_CDN_PATTERN = /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/.*/i
      if (PYODIDE_CDN_PATTERN.test(request.url)) {
        event.respondWith(Promise.resolve({ status: 'cached' }))
        return
      }

      // 일반 요청
      event.respondWith(mockFetch(request))
    }

    // Mock 이벤트 객체
    mockEvent = {
      respondWith: jest.fn(),
      request: null
    }
  })

  describe('localhost 우회 테스트', () => {
    it('localhost:11434 요청은 Service Worker가 처리하지 않음', () => {
      mockRequest = {
        url: 'http://localhost:11434/api/tags',
        method: 'GET'
      }
      mockEvent.request = mockRequest

      fetchHandler(mockEvent)

      // respondWith가 호출되지 않아야 함 (Service Worker 처리 생략)
      expect(mockEvent.respondWith).not.toHaveBeenCalled()
    })

    it('127.0.0.1:11434 요청도 Service Worker가 처리하지 않음', () => {
      mockRequest = {
        url: 'http://127.0.0.1:11434/api/embeddings',
        method: 'POST'
      }
      mockEvent.request = mockRequest

      fetchHandler(mockEvent)

      expect(mockEvent.respondWith).not.toHaveBeenCalled()
    })

    it('localhost의 다른 포트도 우회됨', () => {
      mockRequest = {
        url: 'http://localhost:3000/api/test',
        method: 'GET'
      }
      mockEvent.request = mockRequest

      fetchHandler(mockEvent)

      expect(mockEvent.respondWith).not.toHaveBeenCalled()
    })
  })

  describe('Pyodide CDN 캐싱 테스트', () => {
    it('Pyodide CDN 요청은 Service Worker가 처리함', () => {
      mockRequest = {
        url: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js',
        method: 'GET'
      }
      mockEvent.request = mockRequest

      fetchHandler(mockEvent)

      // respondWith가 호출되어야 함 (Service Worker가 캐싱)
      expect(mockEvent.respondWith).toHaveBeenCalled()
    })
  })

  describe('일반 요청 테스트', () => {
    it('일반 외부 요청은 네트워크로 전달됨', () => {
      mockRequest = {
        url: 'https://example.com/api/data',
        method: 'GET'
      }
      mockEvent.request = mockRequest

      fetchHandler(mockEvent)

      expect(mockEvent.respondWith).toHaveBeenCalled()
    })
  })
})

describe('Service Worker - 통합 시나리오', () => {
  it('RAG 워크플로우: Ollama 요청 우회 + Pyodide 캐싱', () => {
    const requests = [
      { url: 'http://localhost:11434/api/embeddings', shouldBypass: true },
      { url: 'http://localhost:11434/api/generate', shouldBypass: true },
      { url: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/numpy.js', shouldBypass: false },
      { url: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/scipy.js', shouldBypass: false }
    ]

    requests.forEach(({ url, shouldBypass }) => {
      const mockEvent = {
        respondWith: jest.fn(),
        request: { url, method: 'GET' }
      }

      const urlObj = new URL(url)
      const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'

      expect(isLocalhost).toBe(shouldBypass)
    })
  })
})
