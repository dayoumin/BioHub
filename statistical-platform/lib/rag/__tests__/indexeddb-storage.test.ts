/**
 * IndexedDB Storage 테스트 (Phase 3)
 *
 * 검증 항목:
 * - embeddings 스토어 생성
 * - 임베딩 CRUD 작업
 * - 배치 저장 성능
 * - 인덱스 쿼리
 */

import { IndexedDBStorage, type StoredEmbedding } from '../indexeddb-storage'

// Mock IndexedDB for Node.js environment
import 'fake-indexeddb/auto'

describe('IndexedDB Storage - Embeddings (Phase 3)', () => {
  beforeEach(async () => {
    // 각 테스트 전에 모든 데이터 삭제
    try {
      await IndexedDBStorage.clearAllEmbeddings()
    } catch {
      // 첫 실행 시 스토어가 없을 수 있음
    }
  })

  describe('임베딩 CRUD', () => {
    it('임베딩 저장 및 조회', async () => {
      const embedding: StoredEmbedding = {
        doc_id: 'test_doc_1',
        chunk_index: 0,
        chunk_text: 'This is a test chunk.',
        chunk_tokens: 5,
        embedding: new Float32Array([0.1, 0.2, 0.3]).buffer,
        embedding_model: 'qwen3-embedding:0.6b',
        created_at: Date.now(),
      }

      // 저장
      const id = await IndexedDBStorage.saveEmbedding(embedding)
      expect(id).toBeGreaterThan(0)

      // 조회
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId('test_doc_1')
      expect(embeddings.length).toBe(1)
      expect(embeddings[0].doc_id).toBe('test_doc_1')
      expect(embeddings[0].chunk_index).toBe(0)
      expect(embeddings[0].chunk_text).toBe('This is a test chunk.')

      // ArrayBuffer 검증
      const restoredVector = new Float32Array(embeddings[0].embedding)
      expect(restoredVector.length).toBe(3)
      expect(restoredVector[0]).toBeCloseTo(0.1, 5)

      console.log('✓ 임베딩 저장/조회 성공')
    })

    it('여러 청크 임베딩 저장', async () => {
      const chunkCount = 10

      // 10개 청크 저장
      for (let i = 0; i < chunkCount; i++) {
        await IndexedDBStorage.saveEmbedding({
          doc_id: 'test_doc_2',
          chunk_index: i,
          chunk_text: `Chunk ${i} text`,
          chunk_tokens: 100,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      // 조회
      const embeddings = await IndexedDBStorage.getEmbeddingsByDocId('test_doc_2')
      expect(embeddings.length).toBe(chunkCount)

      // chunk_index 순서 확인
      const sortedEmbeddings = embeddings.sort((a, b) => a.chunk_index - b.chunk_index)
      for (let i = 0; i < chunkCount; i++) {
        expect(sortedEmbeddings[i].chunk_index).toBe(i)
        expect(sortedEmbeddings[i].chunk_text).toBe(`Chunk ${i} text`)
      }

      console.log(`✓ ${chunkCount}개 청크 임베딩 저장/조회 성공`)
    })

    it('임베딩 삭제', async () => {
      // 3개 청크 저장
      for (let i = 0; i < 3; i++) {
        await IndexedDBStorage.saveEmbedding({
          doc_id: 'test_doc_3',
          chunk_index: i,
          chunk_text: `Chunk ${i}`,
          chunk_tokens: 50,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      // 삭제 전 확인
      let embeddings = await IndexedDBStorage.getEmbeddingsByDocId('test_doc_3')
      expect(embeddings.length).toBe(3)

      // 삭제
      await IndexedDBStorage.deleteEmbeddingsByDocId('test_doc_3')

      // 삭제 후 확인
      embeddings = await IndexedDBStorage.getEmbeddingsByDocId('test_doc_3')
      expect(embeddings.length).toBe(0)

      console.log('✓ 임베딩 삭제 성공')
    })

    it('모든 임베딩 조회', async () => {
      // 여러 문서의 임베딩 저장
      await IndexedDBStorage.saveEmbedding({
        doc_id: 'doc_a',
        chunk_index: 0,
        chunk_text: 'Doc A chunk 0',
        chunk_tokens: 10,
        embedding: new Float32Array(1024).buffer,
        embedding_model: 'qwen3-embedding:0.6b',
        created_at: Date.now(),
      })

      await IndexedDBStorage.saveEmbedding({
        doc_id: 'doc_b',
        chunk_index: 0,
        chunk_text: 'Doc B chunk 0',
        chunk_tokens: 10,
        embedding: new Float32Array(1024).buffer,
        embedding_model: 'qwen3-embedding:0.6b',
        created_at: Date.now(),
      })

      const allEmbeddings = await IndexedDBStorage.getAllEmbeddings()
      expect(allEmbeddings.length).toBeGreaterThanOrEqual(2)

      console.log(`✓ 전체 임베딩 조회 성공: ${allEmbeddings.length}개`)
    })
  })

  describe('배치 저장', () => {
    it('100개 임베딩 배치 저장', async () => {
      const embeddings: StoredEmbedding[] = []

      for (let i = 0; i < 100; i++) {
        embeddings.push({
          doc_id: 'batch_doc',
          chunk_index: i,
          chunk_text: `Batch chunk ${i}`,
          chunk_tokens: 200,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      const startTime = Date.now()
      const ids = await IndexedDBStorage.saveEmbeddingsBatch(embeddings)
      const duration = Date.now() - startTime

      expect(ids.length).toBe(100)

      // 조회 확인
      const stored = await IndexedDBStorage.getEmbeddingsByDocId('batch_doc')
      expect(stored.length).toBe(100)

      console.log(`✓ 100개 임베딩 배치 저장 성공 (${duration}ms)`)
    })
  })

  describe('통계', () => {
    it('임베딩 개수 조회', async () => {
      // 3개 저장
      for (let i = 0; i < 3; i++) {
        await IndexedDBStorage.saveEmbedding({
          doc_id: 'count_test',
          chunk_index: i,
          chunk_text: `Chunk ${i}`,
          chunk_tokens: 50,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      const count = await IndexedDBStorage.getEmbeddingCount()
      expect(count).toBeGreaterThanOrEqual(3)

      console.log(`✓ 임베딩 개수: ${count}`)
    })

    it('모든 임베딩 삭제', async () => {
      // 5개 저장
      for (let i = 0; i < 5; i++) {
        await IndexedDBStorage.saveEmbedding({
          doc_id: 'clear_test',
          chunk_index: i,
          chunk_text: `Chunk ${i}`,
          chunk_tokens: 50,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      // 전체 삭제
      await IndexedDBStorage.clearAllEmbeddings()

      // 확인
      const count = await IndexedDBStorage.getEmbeddingCount()
      expect(count).toBe(0)

      console.log('✓ 모든 임베딩 삭제 성공')
    })
  })

  describe('실제 시나리오', () => {
    it('문서 추가 → 청크 임베딩 저장 → 조회 → 삭제', async () => {
      const docId = 'scenario_doc'
      const chunkCount = 50

      // 50개 청크 임베딩 저장 (50쪽 PDF 시뮬레이션)
      const embeddings: StoredEmbedding[] = []
      for (let i = 0; i < chunkCount; i++) {
        embeddings.push({
          doc_id: docId,
          chunk_index: i,
          chunk_text: `This is chunk ${i} of a 50-page document. It contains statistical analysis content.`,
          chunk_tokens: 500,
          embedding: new Float32Array(1024).buffer,
          embedding_model: 'qwen3-embedding:0.6b',
          created_at: Date.now(),
        })
      }

      // 배치 저장
      const ids = await IndexedDBStorage.saveEmbeddingsBatch(embeddings)
      expect(ids.length).toBe(chunkCount)

      // 조회
      const stored = await IndexedDBStorage.getEmbeddingsByDocId(docId)
      expect(stored.length).toBe(chunkCount)

      // BLOB 크기 계산
      const totalBlobSize = stored.reduce((sum, e) => sum + e.embedding.byteLength, 0)
      console.log(`  - 총 BLOB 크기: ${Math.floor(totalBlobSize / 1024)} KB`)

      // 삭제
      await IndexedDBStorage.deleteEmbeddingsByDocId(docId)

      // 삭제 확인
      const afterDelete = await IndexedDBStorage.getEmbeddingsByDocId(docId)
      expect(afterDelete.length).toBe(0)

      console.log(`✓ 50쪽 PDF 시나리오 성공 (${chunkCount}개 청크)`)
    })

    it('여러 문서의 임베딩 관리', async () => {
      const docs = ['doc1', 'doc2', 'doc3']
      const chunksPerDoc = 10

      // 3개 문서, 각 10개 청크
      for (const docId of docs) {
        for (let i = 0; i < chunksPerDoc; i++) {
          await IndexedDBStorage.saveEmbedding({
            doc_id: docId,
            chunk_index: i,
            chunk_text: `${docId} chunk ${i}`,
            chunk_tokens: 100,
            embedding: new Float32Array(1024).buffer,
            embedding_model: 'qwen3-embedding:0.6b',
            created_at: Date.now(),
          })
        }
      }

      // 각 문서별 조회
      for (const docId of docs) {
        const embeddings = await IndexedDBStorage.getEmbeddingsByDocId(docId)
        expect(embeddings.length).toBe(chunksPerDoc)
      }

      // 전체 조회
      const allEmbeddings = await IndexedDBStorage.getAllEmbeddings()
      expect(allEmbeddings.length).toBeGreaterThanOrEqual(docs.length * chunksPerDoc)

      // doc2만 삭제
      await IndexedDBStorage.deleteEmbeddingsByDocId('doc2')

      // doc2 삭제 확인
      const doc2Embeddings = await IndexedDBStorage.getEmbeddingsByDocId('doc2')
      expect(doc2Embeddings.length).toBe(0)

      // doc1, doc3는 유지 확인
      const doc1Embeddings = await IndexedDBStorage.getEmbeddingsByDocId('doc1')
      const doc3Embeddings = await IndexedDBStorage.getEmbeddingsByDocId('doc3')
      expect(doc1Embeddings.length).toBe(chunksPerDoc)
      expect(doc3Embeddings.length).toBe(chunksPerDoc)

      console.log('✓ 여러 문서 임베딩 관리 성공')
    })
  })
})
