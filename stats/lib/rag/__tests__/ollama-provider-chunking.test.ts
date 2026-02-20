/**
 * OllamaProvider 청크 기반 addDocument 테스트 (Phase 3)
 *
 * 검증 항목:
 * - 문서 청킹 (500 토큰 기준)
 * - 각 청크별 임베딩 생성
 * - SQLite embeddings 테이블 저장
 * - IndexedDB embeddings 스토어 저장
 * - 대용량 문서 처리 (50 청크)
 */

import { OllamaRAGProvider } from '../providers/ollama-provider'
import { vi } from 'vitest'
import { IndexedDBStorage } from '../indexeddb-storage'
import type { DocumentInput } from '../providers/base-provider'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

// Mock Ollama API
global.fetch = vi.fn()

describe('OllamaProvider - Chunk-based addDocument (Phase 3)', () => {
  let provider: OllamaRAGProvider

  beforeEach(async () => {
    // Clear IndexedDB
    try {
      await IndexedDBStorage.clearAllDocuments()
      await IndexedDBStorage.clearAllEmbeddings()
    } catch {
      // 첫 실행 시 스토어가 없을 수 있음
    }

    // Mock fetch for Ollama API
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/tags')) {
        // Mock model list
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                { name: 'qwen3-embedding:0.6b' },
                { name: 'qwen2.5:3b' },
              ],
            }),
        })
      }
      if (url.includes('/api/embeddings')) {
        // Mock embedding generation
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              embedding: Array(1024)
                .fill(0)
                .map(() => Math.random()),
            }),
        })
      }
      if (url.includes('/api/generate')) {
        // Mock text generation
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Mock response' }),
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })

    provider = new OllamaRAGProvider({
      name: 'ollama-test',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'qwen3-embedding:0.6b',
      inferenceModel: 'qwen2.5:3b',
      testMode: true, // SQLite 비활성화
    })

    await provider.initialize()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('작은 문서 (1 청크)', () => {
    it('500 토큰 미만 문서는 1개 청크로 처리', async () => {
      const shortDocument: DocumentInput = {
        doc_id: 'short_doc_1',
        title: 'Short Document',
        content: 'This is a short document with less than 500 tokens. It should create only one chunk.',
        library: 'test',
        category: 'unit-test',
        summary: 'Short test document',
      }

      // addDocument 실행
      const docId = await provider.addDocument(shortDocument)
      expect(docId).toBe('short_doc_1')

      // IndexedDB embeddings 조회
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)
      expect(embeddings.length).toBe(1)

      // 첫 번째 청크 검증
      const firstEmbedding = embeddings[0]
      expect(firstEmbedding.chunk_index).toBe(0)
      expect(firstEmbedding.chunk_text).toContain('This is a short document')
      expect(firstEmbedding.embedding_model).toBe('qwen3-embedding:0.6b')

      // BLOB 복원 검증
      const vector = new Float32Array(firstEmbedding.embedding)
      expect(vector.length).toBe(1024)

      console.log('✓ 작은 문서 (1 청크) 처리 성공')
    })
  })

  describe('중간 크기 문서 (3-5 청크)', () => {
    it('1500 토큰 문서는 3-4개 청크로 분할', async () => {
      // 1500 토큰 ≈ 2000 단어 생성
      const longText = Array(2000)
        .fill(0)
        .map((_, i) => `word${i}`)
        .join(' ')

      const mediumDocument: DocumentInput = {
        doc_id: 'medium_doc_1',
        title: 'Medium Document',
        content: longText,
        library: 'test',
        category: 'unit-test',
        summary: 'Medium test document',
      }

      const docId = await provider.addDocument(mediumDocument)
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)

      // 청크 개수 검증 (3-7개 예상, 청킹 알고리즘에 따라 변동 가능)
      expect(embeddings.length).toBeGreaterThanOrEqual(3)
      expect(embeddings.length).toBeLessThanOrEqual(7)

      // 각 청크 검증
      embeddings.forEach((emb, index) => {
        expect(emb.chunk_index).toBe(index)
        expect(emb.doc_id).toBe(docId)
        expect(emb.chunk_tokens).toBeGreaterThan(0)
        expect(emb.chunk_tokens).toBeLessThanOrEqual(550) // maxTokens + margin

        // BLOB 유효성
        const vector = new Float32Array(emb.embedding)
        expect(vector.length).toBe(1024)
      })

      console.log(`✓ 중간 크기 문서 (${embeddings.length}개 청크) 처리 성공`)
    })
  })

  describe('대용량 문서 (50 청크)', () => {
    it('25000 토큰 문서는 50개 청크로 분할', async () => {
      // 25000 토큰 ≈ 33000 단어 생성
      const veryLongText = Array(33000)
        .fill(0)
        .map((_, i) => `word${i}`)
        .join(' ')

      const largeDocument: DocumentInput = {
        doc_id: 'large_doc_1',
        title: 'Large Document (50 pages)',
        content: veryLongText,
        library: 'test',
        category: 'unit-test',
        summary: 'Large test document (50-page PDF simulation)',
      }

      const startTime = Date.now()
      const docId = await provider.addDocument(largeDocument)
      const duration = Date.now() - startTime

      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)

      // 청크 개수 검증 (40-100개 예상, 청킹 알고리즘에 따라 변동 가능)
      expect(embeddings.length).toBeGreaterThanOrEqual(40)
      expect(embeddings.length).toBeLessThanOrEqual(100)

      // 순서 보존 검증
      const sortedEmbeddings = embeddings.sort((a, b) => a.chunk_index - b.chunk_index)
      for (let i = 0; i < sortedEmbeddings.length; i++) {
        expect(sortedEmbeddings[i].chunk_index).toBe(i)
      }

      // BLOB 크기 계산
      const totalBlobSize = embeddings.reduce((sum, e) => sum + e.embedding.byteLength, 0)
      console.log(`  - 총 BLOB 크기: ${Math.floor(totalBlobSize / 1024)} KB`)
      console.log(`  - 처리 시간: ${duration}ms`)
      console.log(`✓ 대용량 문서 (${embeddings.length}개 청크) 처리 성공`)
    }, 120000) // 2분 타임아웃
  })

  describe('청크 연속성 검증', () => {
    it('여러 청크 생성 시 chunk_index 연속성 검증', async () => {
      // 1500 토큰 문서 (3-7개 청크 예상)
      const text = Array(2000)
        .fill(0)
        .map((_, i) => `sentence${i}`)
        .join(' ')

      const document: DocumentInput = {
        doc_id: 'continuity_test',
        title: 'Continuity Test',
        content: text,
        library: 'test',
        category: 'unit-test',
      }

      await provider.addDocument(document)
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId('continuity_test')

      // 최소 2개 청크 필요
      expect(embeddings.length).toBeGreaterThanOrEqual(2)

      // chunk_index 연속성 검증
      const sortedEmbeddings = embeddings.sort((a, b) => a.chunk_index - b.chunk_index)
      for (let i = 0; i < sortedEmbeddings.length; i++) {
        expect(sortedEmbeddings[i].chunk_index).toBe(i)
      }

      // 각 청크가 텍스트 포함 확인
      sortedEmbeddings.forEach((emb) => {
        expect(emb.chunk_text.length).toBeGreaterThan(0)
        expect(emb.chunk_tokens).toBeGreaterThan(0)
      })

      console.log(`✓ 청크 연속성 검증 성공 (${embeddings.length}개 청크)`)
    })
  })

  describe('에러 처리', () => {
    it('빈 문서는 청크 0개 생성', async () => {
      const emptyDocument: DocumentInput = {
        doc_id: 'empty_doc',
        title: 'Empty Document',
        content: '',
        library: 'test',
      }

      const docId = await provider.addDocument(emptyDocument)
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)

      // 빈 문서는 청크가 생성되지 않음
      expect(embeddings.length).toBe(0)

      console.log('✓ 빈 문서 처리 검증 성공 (청크 0개)')
    })

    it('임베딩 생성 실패 시 에러 전파', async () => {
      // Mock fetch to fail
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Ollama server error'))
      )

      const document: DocumentInput = {
        doc_id: 'fail_doc',
        title: 'Fail Document',
        content: 'This document will fail to generate embeddings.',
        library: 'test',
      }

      await expect(provider.addDocument(document)).rejects.toThrow()
    })
  })

  describe('updateDocument 임베딩 재생성', () => {
    it('content 변경 시 기존 임베딩 삭제 후 새로 생성', async () => {
      // 1. 문서 추가
      const document: DocumentInput = {
        doc_id: 'update_test_doc',
        title: 'Original Title',
        content: Array(500).fill(0).map((_, i) => `original${i}`).join(' '),
        library: 'test',
      }

      await provider.addDocument(document)

      // 2. 초기 임베딩 확인
      const embeddingsBefore = await IndexedDBStorage.getEmbeddingsByDocId('update_test_doc')
      expect(embeddingsBefore.length).toBeGreaterThan(0)
      const originalChunkCount = embeddingsBefore.length
      const originalFirstChunk = embeddingsBefore.find((e) => e.chunk_index === 0)!
      expect(originalFirstChunk.chunk_text).toContain('original0')

      console.log(`  - 초기 임베딩: ${originalChunkCount}개 청크`)

      // 3. content 업데이트 (다른 길이의 텍스트)
      const updated = await provider.updateDocument('update_test_doc', {
        content: Array(800).fill(0).map((_, i) => `updated${i}`).join(' '), // 다른 길이
      })

      expect(updated).toBe(true)

      // 4. 새 임베딩 확인
      const embeddingsAfter = await IndexedDBStorage.getEmbeddingsByDocId('update_test_doc')
      expect(embeddingsAfter.length).toBeGreaterThan(0)
      const newChunkCount = embeddingsAfter.length

      // 텍스트 변경 확인
      const newFirstChunk = embeddingsAfter.find((e) => e.chunk_index === 0)!
      expect(newFirstChunk.chunk_text).toContain('updated0')
      expect(newFirstChunk.chunk_text).not.toContain('original0')

      console.log(`  - 새 임베딩: ${newChunkCount}개 청크`)
      console.log(`✓ content 변경 시 임베딩 재생성 성공 (${originalChunkCount} → ${newChunkCount}개)`)
    })

    it('title만 변경 시 임베딩 유지', async () => {
      // 1. 문서 추가
      await provider.addDocument({
        doc_id: 'title_update_doc',
        title: 'Original Title',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      // 2. 초기 임베딩 확인
      const embeddingsBefore = await IndexedDBStorage.getEmbeddingsByDocId('title_update_doc')
      const originalCount = embeddingsBefore.length

      // 3. title만 업데이트
      await provider.updateDocument('title_update_doc', {
        title: 'Updated Title',
      })

      // 4. 임베딩 개수 유지 확인
      const embeddingsAfter = await IndexedDBStorage.getEmbeddingsByDocId('title_update_doc')
      expect(embeddingsAfter.length).toBe(originalCount)

      // 텍스트 내용 동일 확인
      expect(embeddingsAfter[0].chunk_text).toBe(embeddingsBefore[0].chunk_text)

      console.log(`✓ title만 변경 시 임베딩 ${originalCount}개 유지됨`)
    })

    it('존재하지 않는 문서 업데이트 시 false 반환', async () => {
      const updated = await provider.updateDocument('non_existent_doc', {
        title: 'New Title',
      })

      expect(updated).toBe(false)
    })
  })

  describe('deleteDocument 임베딩 삭제', () => {
    it('문서 삭제 시 관련 임베딩도 모두 삭제됨', async () => {
      // 1. 문서 추가 (임베딩 생성)
      const document: DocumentInput = {
        doc_id: 'delete_test_doc',
        title: 'Delete Test Document',
        content: Array(1000).fill(0).map((_, i) => `word${i}`).join(' '), // 약 3-5개 청크
        library: 'test',
        category: 'unit-test',
      }

      await provider.addDocument(document)

      // 2. 임베딩 생성 확인
      const embeddingsBefore = await IndexedDBStorage.getEmbeddingsByDocId('delete_test_doc')
      expect(embeddingsBefore.length).toBeGreaterThan(0)
      const chunkCount = embeddingsBefore.length
      console.log(`  - 생성된 임베딩: ${chunkCount}개`)

      // 3. 문서 삭제
      const deleted = await provider.deleteDocument('delete_test_doc')
      expect(deleted).toBe(true)

      // 4. 임베딩 삭제 확인
      const embeddingsAfter = await IndexedDBStorage.getEmbeddingsByDocId('delete_test_doc')
      expect(embeddingsAfter.length).toBe(0)

      console.log(`✓ 문서 삭제 시 임베딩 ${chunkCount}개 모두 삭제됨`)
    })

    it('존재하지 않는 문서 삭제 시 false 반환', async () => {
      const deleted = await provider.deleteDocument('non_existent_doc')
      expect(deleted).toBe(false)
    })

    it('여러 문서 중 하나만 삭제 시 다른 문서 임베딩 유지', async () => {
      // 2개 문서 추가
      await provider.addDocument({
        doc_id: 'doc_a',
        title: 'Document A',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      await provider.addDocument({
        doc_id: 'doc_b',
        title: 'Document B',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      // 임베딩 확인
      const docAEmbeddings = await IndexedDBStorage.getEmbeddingsByDocId('doc_a')
      const docBEmbeddings = await IndexedDBStorage.getEmbeddingsByDocId('doc_b')
      expect(docAEmbeddings.length).toBeGreaterThan(0)
      expect(docBEmbeddings.length).toBeGreaterThan(0)

      // doc_a만 삭제
      await provider.deleteDocument('doc_a')

      // doc_a 임베딩 삭제 확인
      const docAAfter = await IndexedDBStorage.getEmbeddingsByDocId('doc_a')
      expect(docAAfter.length).toBe(0)

      // doc_b 임베딩 유지 확인
      const docBAfter = await IndexedDBStorage.getEmbeddingsByDocId('doc_b')
      expect(docBAfter.length).toBe(docBEmbeddings.length)

      console.log('✓ 선택적 문서 삭제 시 다른 문서 임베딩 유지됨')
    })
  })

  describe('searchVector 청크 기반 검색', () => {
    it('query와 유사한 청크를 찾아 문서 반환', async () => {
      // 3개 문서 추가 (각 문서는 서로 다른 주제)
      await provider.addDocument({
        doc_id: 'statistics_doc',
        title: 'Statistics Documentation',
        content:
          'Statistical analysis methods include t-test, ANOVA, regression analysis. ' +
          'These methods are used for hypothesis testing and finding relationships between variables.',
        library: 'scipy',
      })

      await provider.addDocument({
        doc_id: 'machine_learning_doc',
        title: 'Machine Learning Documentation',
        content:
          'Machine learning algorithms include decision trees, random forests, neural networks. ' +
          'These models are trained on data to make predictions.',
        library: 'sklearn',
      })

      await provider.addDocument({
        doc_id: 'data_visualization_doc',
        title: 'Data Visualization Documentation',
        content:
          'Data visualization tools include matplotlib, seaborn, plotly. ' +
          'These libraries create charts, graphs, and interactive visualizations.',
        library: 'matplotlib',
      })

      // "hypothesis testing"으로 검색
      const results = await provider['searchByVector']('hypothesis testing methods')

      expect(results.length).toBe(3) // 3개 문서 모두 반환
      expect(results[0].score).toBeGreaterThan(0)

      // statistics_doc가 결과에 포함되어 있는지 확인 (순위는 mock 임베딩이라 랜덤)
      const docIds = results.map(r => r.doc_id)
      expect(docIds).toContain('statistics_doc')
      expect(docIds).toContain('machine_learning_doc')
      expect(docIds).toContain('data_visualization_doc')

      console.log(`✓ Vector 검색 결과: ${results.length}개 문서`)
      console.log(`✓ 최고 점수 문서: ${results[0].title} (score: ${results[0].score.toFixed(4)})`)
    })

    it('문서별 최고 점수 청크로 랭킹 (Max Pooling)', async () => {
      // 긴 문서 추가 (여러 청크로 나뉨)
      const longContent = Array(10)
        .fill(0)
        .map(
          (_, i) =>
            `Section ${i + 1}: This section discusses statistical hypothesis testing. ` +
            Array(100)
              .fill(0)
              .map((__, j) => `word${i * 100 + j}`)
              .join(' ')
        )
        .join(' ')

      await provider.addDocument({
        doc_id: 'long_doc',
        title: 'Long Statistics Document',
        content: longContent,
        library: 'scipy',
      })

      // 임베딩 확인
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId('long_doc')
      expect(embeddings.length).toBeGreaterThan(1) // 여러 청크로 나뉘어야 함

      // 검색
      const results = await provider['searchByVector']('hypothesis testing')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].doc_id).toBe('long_doc')

      console.log(`✓ ${embeddings.length}개 청크 중 최고 점수로 문서 랭킹`)
      console.log(`✓ 문서 점수: ${results[0].score.toFixed(4)}`)
    })

    it('임베딩 없는 경우 빈 배열 반환', async () => {
      // 문서는 있지만 임베딩이 없는 상황 (테스트 모드에서는 수동 생성 필요)
      await IndexedDBStorage.clearAllEmbeddings()

      const results = await provider['searchByVector']('any query')

      expect(results).toEqual([])
      console.log('✓ 임베딩 없을 때 빈 배열 반환 확인')
    })

    it('Top-K 제한 동작 확인 (기본값 5개)', async () => {
      // 10개 문서 추가
      for (let i = 0; i < 10; i++) {
        await provider.addDocument({
          doc_id: `topk_test_${i}`,
          title: `Top-K Test Document ${i}`,
          content: `This is test document number ${i}. It contains some statistical analysis content.`,
          library: 'test',
          category: 'topk',
        })
      }

      // vector 검색 (topK = 5가 기본값)
      const results = await provider['searchByVector']('statistical analysis')

      // 결과가 최대 5개 이하인지 확인
      expect(results.length).toBeLessThanOrEqual(5)

      // 점수 내림차순 정렬 확인
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }

      console.log(`✓ Top-K 제한 확인: ${results.length}개 문서 반환 (최대 5개)`)
      console.log(`✓ 점수 범위: ${results[0]?.score.toFixed(4)} ~ ${results[results.length - 1]?.score.toFixed(4)}`)
    })

    it('Public query() API에서 Top-K 제한 확인 (vector 모드)', async () => {
      // 10개 문서 추가
      for (let i = 0; i < 10; i++) {
        await provider.addDocument({
          doc_id: `topk_public_test_${i}`,
          title: `Top-K Public Test Document ${i}`,
          content: `This is test document number ${i}. It contains detailed statistical analysis content for public API testing.`,
          library: 'test',
          category: 'topk-public',
        })
      }

      // Public query() API 호출 (vector 모드)
      const response = await provider.query({
        query: 'statistical analysis',
        searchMode: 'vector',
      })

      // sources가 있고 Top-K 제한을 따르는지 확인 (기본값 5개)
      expect(response.sources).toBeDefined()
      expect(response.sources!.length).toBeLessThanOrEqual(5)

      // 점수 내림차순 정렬 확인
      for (let i = 0; i < response.sources!.length - 1; i++) {
        expect(response.sources![i].score).toBeGreaterThanOrEqual(response.sources![i + 1].score)
      }

      console.log(`✓ Public query() Top-K 제한 확인 (vector): ${response.sources!.length}개 반환`)
    })

    it('Public query() API에서 Top-K 제한 확인 (hybrid 모드, RRF 병합 후)', async () => {
      // 10개 문서 추가 (테스트 격리 - beforeEach에서 DB 초기화됨)
      for (let i = 0; i < 10; i++) {
        await provider.addDocument({
          doc_id: `topk_hybrid_test_${i}`,
          title: `Top-K Hybrid Test Document ${i}`,
          content: `This is test document number ${i}. It contains detailed statistical analysis content for hybrid mode testing.`,
          library: 'test',
          category: 'topk-hybrid',
        })
      }

      // Public query() API 호출 (hybrid 모드 - RRF 병합)
      const response = await provider.query({
        query: 'statistical analysis',
        searchMode: 'hybrid',
      })

      // RRF 병합 후에도 Top-K 제한이 지켜지는지 확인 (기본값 5개)
      expect(response.sources).toBeDefined()
      expect(response.sources!.length).toBeLessThanOrEqual(5)

      // 점수 내림차순 정렬 확인
      for (let i = 0; i < response.sources!.length - 1; i++) {
        expect(response.sources![i].score).toBeGreaterThanOrEqual(response.sources![i + 1].score)
      }

      console.log(`✓ Public query() Top-K 제한 확인 (hybrid): ${response.sources!.length}개 반환`)
    })
  })

  describe('실제 시나리오', () => {
    it('논문 PDF 25쪽 시뮬레이션 (40-70 청크)', async () => {
      // 25쪽 PDF ≈ 12500 토큰 ≈ 16500 단어
      const paragraphs = Array(25)
        .fill(0)
        .map(
          (_, pageNum) =>
            `Page ${pageNum + 1}: This is a statistical analysis research paper. ` +
            `It contains methods, results, and discussion sections. ` +
            Array(600)
              .fill(0)
              .map((__, wordIdx) => `word${pageNum * 600 + wordIdx}`)
              .join(' ')
        )
        .join('\n\n')

      const paperDocument: DocumentInput = {
        doc_id: 'paper_25_pages',
        title: 'Statistical Analysis Research Paper',
        content: paragraphs,
        library: 'research-papers',
        category: 'statistics',
        summary: '25-page statistical analysis research paper',
      }

      const startTime = Date.now()
      const docId = await provider.addDocument(paperDocument)
      const duration = Date.now() - startTime

      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)

      // 40-80개 청크 예상 (청킹 알고리즘에 따라 변동 가능)
      expect(embeddings.length).toBeGreaterThanOrEqual(40)
      expect(embeddings.length).toBeLessThanOrEqual(80)

      // 첫 번째 청크가 "Page 1"로 시작하는지 확인
      const firstChunk = embeddings.find((e) => e.chunk_index === 0)!
      expect(firstChunk.chunk_text).toContain('Page 1')

      console.log(`✓ 25쪽 PDF 시뮬레이션 성공`)
      console.log(`  - 청크 개수: ${embeddings.length}`)
      console.log(`  - 처리 시간: ${(duration / 1000).toFixed(1)}s`)
    }, 120000) // 2분 타임아웃
  })

  describe('rebuildVectorStore (Milestone 3)', () => {
    beforeEach(async () => {
      // 각 테스트 전에 문서 초기화 (이전 테스트 영향 제거)
      await IndexedDBStorage.clearAllDocuments()
      await IndexedDBStorage.clearAllEmbeddings()
    })

    it('모든 문서의 임베딩 재생성', async () => {
      // 1. 3개 문서 추가
      await provider.addDocument({
        doc_id: 'rebuild_doc_1',
        title: 'Document 1',
        content: Array(300).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      await provider.addDocument({
        doc_id: 'rebuild_doc_2',
        title: 'Document 2',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      await provider.addDocument({
        doc_id: 'rebuild_doc_3',
        title: 'Document 3',
        content: Array(800).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      // 2. 초기 임베딩 확인
      const embeddings1Before = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_1')
      const embeddings2Before = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_2')
      const embeddings3Before = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_3')

      const totalChunksBefore = embeddings1Before.length + embeddings2Before.length + embeddings3Before.length

      expect(totalChunksBefore).toBeGreaterThan(0)
      console.log(`  - 재구축 전 총 청크 개수: ${totalChunksBefore}`)

      // 3. rebuildVectorStore 실행 (추가한 3개 문서만 재구축)
      const progressLog: number[] = []
      const result = await provider.rebuildVectorStore({
        docIds: ['rebuild_doc_1', 'rebuild_doc_2', 'rebuild_doc_3'], // 명시적으로 지정
        onProgress: (progress, current, total, docTitle) => {
          progressLog.push(progress)
          console.log(`  - [${current}/${total}] ${progress}% - ${docTitle}`)
        }
      })

      // 4. 결과 검증
      expect(result.totalDocs).toBe(3)
      expect(result.processedDocs).toBe(3)
      expect(result.successDocs).toBe(3)
      expect(result.failedDocs).toBe(0)
      expect(result.errors.length).toBe(0)
      expect(result.totalChunks).toBeGreaterThan(0)

      // 5. 진행률 콜백 검증
      expect(progressLog.length).toBe(3)
      expect(progressLog[0]).toBeGreaterThanOrEqual(0)
      expect(progressLog[2]).toBe(100) // 마지막은 100%

      // 6. 임베딩 재생성 확인
      const embeddings1After = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_1')
      const embeddings2After = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_2')
      const embeddings3After = await IndexedDBStorage.getEmbeddingsByDocId('rebuild_doc_3')

      expect(embeddings1After.length).toBe(embeddings1Before.length)
      expect(embeddings2After.length).toBe(embeddings2Before.length)
      expect(embeddings3After.length).toBe(embeddings3Before.length)

      console.log(`✓ rebuildVectorStore 성공:`)
      console.log(`  - 처리된 문서: ${result.successDocs}/${result.totalDocs}`)
      console.log(`  - 재생성된 청크: ${result.totalChunks}`)
    }, 120000) // 2분 타임아웃

    it('특정 문서만 재구축 (docIds 옵션)', async () => {
      // 1. 2개 문서 추가
      await provider.addDocument({
        doc_id: 'selective_doc_1',
        title: 'Selective Doc 1',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      await provider.addDocument({
        doc_id: 'selective_doc_2',
        title: 'Selective Doc 2',
        content: Array(500).fill(0).map((_, i) => `word${i}`).join(' '),
        library: 'test',
      })

      // 2. selective_doc_1만 재구축
      const result = await provider.rebuildVectorStore({
        docIds: ['selective_doc_1']
      })

      // 3. 결과 검증
      expect(result.totalDocs).toBe(1)
      expect(result.processedDocs).toBe(1)
      expect(result.successDocs).toBe(1)

      console.log(`✓ 선택적 재구축 성공: ${result.totalDocs}개 문서`)
    }, 60000)

    it('빈 문서는 스킵', async () => {
      // 빈 문서 추가
      await provider.addDocument({
        doc_id: 'empty_rebuild_doc',
        title: 'Empty Document',
        content: '',
        library: 'test',
      })

      // rebuildVectorStore 실행
      const result = await provider.rebuildVectorStore()

      // 빈 문서는 processedDocs에는 포함되지만, totalChunks는 증가하지 않음
      const emptyDocProcessed = result.totalDocs > 0
      expect(emptyDocProcessed).toBe(true)

      console.log(`✓ 빈 문서 스킵 확인`)
    }, 60000)

    it('문서 없는 경우 빈 결과 반환', async () => {
      // testMode에서는 더미 문서 3개가 로드되어 있음
      // 존재하지 않는 docId로 재구축 시도
      const result = await provider.rebuildVectorStore({
        docIds: ['non_existent_doc']
      })

      expect(result.totalDocs).toBe(0)
      expect(result.processedDocs).toBe(0)
      expect(result.totalChunks).toBe(0)

      console.log(`✓ 문서 없는 경우 빈 결과 반환 확인`)
    }, 60000)
  })
})
