/**
 * RAG Config Integration Test
 * RAG 설정이 실제로 RAG 서비스에 반영되는지 검증
 */

import { loadRAGConfig, saveRAGConfig } from '@/lib/rag/rag-config'
import { StorageService } from '@/lib/services/storage-service'

describe('RAG Config Integration', () => {
  let localStorageMock: Record<string, string>

  beforeEach(() => {
    // localStorage mock 초기화
    localStorageMock = {}

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value
        },
        removeItem: (key: string) => {
          delete localStorageMock[key]
        },
        clear: () => {
          localStorageMock = {}
        },
      },
      writable: true,
    })

    // 기본적으로 localStorage 허용
    localStorageMock['statPlatform_localStorageEnabled'] = 'true'
  })

  describe('loadRAGConfig', () => {
    it('localStorage에서 RAG 설정을 로드해야 함', () => {
      // Given: localStorage에 RAG 설정 저장
      StorageService.setItem('statPlatform_ollamaEndpoint', 'http://192.168.0.10:11434')
      StorageService.setItem('statPlatform_embeddingModel', 'mxbai-embed-large')
      StorageService.setItem('statPlatform_inferenceModel', 'deepseek-r1:7b')
      StorageService.setItem('statPlatform_topK', '10')

      // When: RAG 설정 로드
      const config = loadRAGConfig()

      // Then: 설정이 올바르게 로드됨
      expect(config.ollamaEndpoint).toBe('http://192.168.0.10:11434')
      expect(config.embeddingModel).toBe('mxbai-embed-large')
      expect(config.inferenceModel).toBe('deepseek-r1:7b')
      expect(config.topK).toBe(10)
    })

    it('localStorage에 설정이 없으면 빈 객체를 반환해야 함', () => {
      const config = loadRAGConfig()
      expect(config).toEqual({})
    })

    it('localStorage 옵트아웃 시 빈 객체를 반환해야 함', () => {
      // Given: localStorage 비허용
      localStorageMock['statPlatform_localStorageEnabled'] = 'false'
      localStorageMock['statPlatform_ollamaEndpoint'] = 'http://192.168.0.10:11434'

      // When: RAG 설정 로드
      const config = loadRAGConfig()

      // Then: 설정이 로드되지 않음
      expect(config).toEqual({})
    })
  })

  describe('saveRAGConfig', () => {
    it('RAG 설정을 localStorage에 저장해야 함', () => {
      // When: RAG 설정 저장
      saveRAGConfig({
        ollamaEndpoint: 'http://custom:11434',
        embeddingModel: 'nomic-embed-text',
        inferenceModel: 'llama3.2',
        topK: 7,
      })

      // Then: localStorage에 저장됨
      expect(localStorageMock['statPlatform_ollamaEndpoint']).toBe('http://custom:11434')
      expect(localStorageMock['statPlatform_embeddingModel']).toBe('nomic-embed-text')
      expect(localStorageMock['statPlatform_inferenceModel']).toBe('llama3.2')
      expect(localStorageMock['statPlatform_topK']).toBe('7')
    })

    it('localStorage 옵트아웃 시 저장하지 않아야 함', () => {
      // Given: localStorage 비허용
      localStorageMock['statPlatform_localStorageEnabled'] = 'false'

      // When: RAG 설정 저장 시도
      saveRAGConfig({
        ollamaEndpoint: 'http://custom:11434',
      })

      // Then: 저장되지 않음
      expect(localStorageMock['statPlatform_ollamaEndpoint']).toBeUndefined()
    })
  })

  describe('Round-trip test', () => {
    it('저장 → 로드 → 동일한 값 반환', () => {
      // Given: RAG 설정 저장
      const originalConfig = {
        ollamaEndpoint: 'http://test:11434',
        embeddingModel: 'test-model',
        inferenceModel: 'test-llm',
        topK: 5,
      }
      saveRAGConfig(originalConfig)

      // When: 설정 로드
      const loadedConfig = loadRAGConfig()

      // Then: 동일한 값
      expect(loadedConfig).toEqual(originalConfig)
    })
  })
})
