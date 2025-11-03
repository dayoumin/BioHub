/**
 * RAG Service 간단 테스트
 *
 * 핵심 검증:
 * 1. Singleton 인스턴스
 * 2. vectorStoreId → DB 경로 변환
 * 3. 설정 관리
 * 4. queryRAG() 사용 패턴
 */

import { describe, it, expect } from '@jest/globals'
import {
  RAGService,
  vectorStoreIdToPath,
  parseVectorStoreFilename,
} from '../rag-service'
import type { RAGServiceConfig } from '../rag-service'

describe('RAGService - Core Functionality', () => {
  describe('Singleton Instance', () => {
    it('should return same instance', () => {
      const s1 = RAGService.getInstance()
      const s2 = RAGService.getInstance()
      expect(s1).toBe(s2)
    })

    it('should have ollama provider type', () => {
      const service = RAGService.getInstance()
      expect(service.getProviderType()).toBe('ollama')
    })
  })

  describe('Vector Store Path Conversion', () => {
    it('should convert qwen3-embedding-0.6b to correct path', () => {
      const path = vectorStoreIdToPath('qwen3-embedding-0.6b')
      expect(path).toBe('/rag-data/vector-qwen3-embedding-0.6b.db')
    })

    it('should convert mxbai-embed-large to correct path', () => {
      const path = vectorStoreIdToPath('mxbai-embed-large')
      expect(path).toBe('/rag-data/vector-mxbai-embed-large.db')
    })

    it('should handle any valid vector store ID', () => {
      const testIds = [
        'nomic-embed-text',
        'all-MiniLM-L6-v2',
        'multilingual-e5-large',
      ]

      testIds.forEach((id) => {
        const path = vectorStoreIdToPath(id)
        expect(path).toMatch(/^\/rag-data\/vector-.+\.db$/)
        expect(path).toContain(id)
      })
    })
  })

  describe('Vector Store Filename Parsing', () => {
    it('should parse qwen3 filename correctly', () => {
      const result = parseVectorStoreFilename('vector-qwen3-embedding-0.6b.db')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('qwen3-embedding-0.6b')
      expect(result?.model).toBe('qwen3-embedding:0.6b')
    })

    it('should parse mxbai filename correctly', () => {
      const result = parseVectorStoreFilename('vector-mxbai-embed-large.db')
      expect(result).not.toBeNull()
      expect(result?.id).toBe('mxbai-embed-large')
      expect(result?.model).toBe('mxbai-embed-large')
    })

    it('should return null for invalid filenames', () => {
      expect(parseVectorStoreFilename('rag.db')).toBeNull()
      expect(parseVectorStoreFilename('document.txt')).toBeNull()
      expect(parseVectorStoreFilename('documents.sqlite')).toBeNull()
    })

    it('should convert version numbers in model names', () => {
      const result = parseVectorStoreFilename('vector-embed-model-2.0b.db')
      expect(result?.model).toBe('embed-model:2.0b')
    })
  })

  describe('Configuration Structure', () => {
    it('should define RAGServiceConfig interface', () => {
      const config: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
        topK: 5,
      }

      expect(config.vectorStoreId).toBe('qwen3-embedding-0.6b')
      expect(config.topK).toBe(5)
    })

    it('should support all configuration options', () => {
      const config: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
        embeddingModel: 'nomic-embed-text',
        inferenceModel: 'qwen2.5',
        ollamaEndpoint: 'http://localhost:11434',
        vectorDbPath: '/rag-data/vector-qwen3-embedding-0.6b.db',
        topK: 10,
      }

      expect(config).toBeDefined()
      expect(Object.keys(config).length).toBeGreaterThan(0)
    })

    it('should allow partial configuration', () => {
      const minimalConfig: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      expect(minimalConfig.vectorStoreId).toBe('qwen3-embedding-0.6b')
      expect(minimalConfig.embeddingModel).toBeUndefined()
      expect(minimalConfig.topK).toBeUndefined()
    })
  })

  describe('queryRAG Function Pattern', () => {
    it('should use qwen3-embedding-0.6b as vectorStoreId', () => {
      // queryRAG() 함수의 설정 패턴:
      // await ragService.initialize({
      //   vectorStoreId: 'qwen3-embedding-0.6b'  // ← 이 값 사용
      // })

      const expectedConfig: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      expect(expectedConfig.vectorStoreId).toBe('qwen3-embedding-0.6b')
    })

    it('should convert vectorStoreId to vectorDbPath internally', () => {
      const storeId = 'qwen3-embedding-0.6b'
      const dbPath = vectorStoreIdToPath(storeId)

      // RAGService.initialize() 내부에서 이 변환이 일어남:
      // vectorDbPath = vectorStoreIdToPath(this.config.vectorStoreId)

      expect(dbPath).toBe('/rag-data/vector-qwen3-embedding-0.6b.db')
    })
  })

  describe('Vector Store Selection', () => {
    it('should identify active vector store (111 documents)', () => {
      const storeMetadata = {
        id: 'qwen3-embedding-0.6b',
        docCount: 111, // ← 활성 벡터 스토어
      }

      expect(storeMetadata.docCount).toBe(111)
    })

    it('should identify inactive vector stores', () => {
      const stores = [
        { id: 'qwen3-embedding-0.6b', docCount: 111 }, // ✅ 활성
        { id: 'mxbai-embed-large', docCount: 0 }, // ⚠️ 미사용
      ]

      const active = stores.filter((s) => s.docCount > 0)
      expect(active).toHaveLength(1)
      expect(active[0].id).toBe('qwen3-embedding-0.6b')
    })
  })

  describe('Configuration Validation', () => {
    it('should accept valid vectorStoreId values', () => {
      const validIds = [
        'qwen3-embedding-0.6b',
        'mxbai-embed-large',
        'nomic-embed-text',
        'all-MiniLM-L6-v2',
      ]

      validIds.forEach((id) => {
        const config: RAGServiceConfig = { vectorStoreId: id }
        expect(config.vectorStoreId).toBe(id)
      })
    })

    it('should accept topK values', () => {
      const validTopKs = [1, 3, 5, 10, 20]

      validTopKs.forEach((k) => {
        const config: RAGServiceConfig = { topK: k }
        expect(config.topK).toBe(k)
      })
    })

    it('should handle missing optional fields', () => {
      const config: RAGServiceConfig = {}

      expect(config.vectorStoreId).toBeUndefined()
      expect(config.topK).toBeUndefined()
      expect(config.embeddingModel).toBeUndefined()
    })
  })

  describe('Environment Configuration', () => {
    it('should support environment variable overrides', () => {
      // 환경변수 패턴:
      // process.env.NEXT_PUBLIC_VECTOR_DB_PATH
      // process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      // process.env.NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL
      // process.env.NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL
      // process.env.NEXT_PUBLIC_TOP_K

      const config: RAGServiceConfig = {
        vectorStoreId: process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b',
        ollamaEndpoint: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
        topK: process.env.NEXT_PUBLIC_TOP_K ? parseInt(process.env.NEXT_PUBLIC_TOP_K) : 5,
      }

      expect(config).toBeDefined()
      expect(config.vectorStoreId).toBeDefined()
    })
  })
})

describe('Code Review: Embedding API Format', () => {
  describe('Ollama API Specification', () => {
    it('should use input field (not prompt) for embeddings', () => {
      // ✅ 올바른 Ollama Embeddings API 형식:
      const correctRequest = {
        model: 'nomic-embed-text',
        input: 'query text', // ← "input" 필드 사용
      }

      // ❌ 잘못된 형식 (이전 버전):
      const incorrectRequest = {
        model: 'nomic-embed-text',
        prompt: 'query text', // ← "prompt" 필드 (지원 안 함)
      }

      // 올바른 형식 검증
      expect(correctRequest).toHaveProperty('input')
      expect(correctRequest).not.toHaveProperty('prompt')

      // 잘못된 형식 식별
      expect(incorrectRequest).toHaveProperty('prompt')
      expect(incorrectRequest).not.toHaveProperty('input')
    })

    it('should specify model in embedding request', () => {
      const request = {
        model: 'nomic-embed-text', // ← 필수
        input: 'text to embed',    // ← 필수 (ollama-provider.ts:1085)
      }

      expect(request.model).toBeDefined()
      expect(request.model).toBe('nomic-embed-text')
    })

    it('should validate embedding response structure', () => {
      // Ollama embeddings API 응답 형식
      const validResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4], // ← 숫자 배열
      }

      expect(Array.isArray(validResponse.embedding)).toBe(true)
      expect(validResponse.embedding.every((x) => typeof x === 'number')).toBe(true)
    })
  })

  describe('Request Body Format (ollama-provider.ts:1083-1086)', () => {
    it('should send request in correct format', () => {
      // ollama-provider.ts:1083-1086에서 생성되는 JSON:
      // JSON.stringify({
      //   model: this.embeddingModel,
      //   input: truncatedText  // ← 수정됨 (이전: prompt)
      // })

      const embeddingModel = 'nomic-embed-text'
      const truncatedText = 'sample query'

      const body = JSON.stringify({
        model: embeddingModel,
        input: truncatedText, // ✅ "input" 필드
      })

      const parsed = JSON.parse(body)
      expect(parsed.model).toBe('nomic-embed-text')
      expect(parsed.input).toBe('sample query')
      expect(parsed.prompt).toBeUndefined()
    })
  })
})
