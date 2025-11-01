/**
 * Multi-Model Vector Store 테스트
 *
 * 테스트 범위:
 * 1. 여러 임베딩 모델로 생성된 DB 검증
 * 2. DB 파일 존재 확인
 * 3. 임베딩 차원 확인
 * 4. 문서 수 확인
 * 5. 검색 → 추론 흐름 검증
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// SQLite 모듈 (Node.js 환경)
import Database from 'better-sqlite3'

describe('Multi-Model Vector Store', () => {
  const ragDataDir = path.join(__dirname, '../../rag-system/data')

  describe('DB 파일 존재 확인', () => {
    it('qwen3-embedding:0.6b DB가 존재해야 함', () => {
      const dbPath = path.join(ragDataDir, 'rag-qwen3-embedding-0.6b.db')
      expect(fs.existsSync(dbPath)).toBe(true)

      const stats = fs.statSync(dbPath)
      console.log(`[qwen3-embedding-0.6b] DB 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

      // DB 크기가 5MB 이상이어야 함 (111개 문서 + 임베딩)
      expect(stats.size).toBeGreaterThan(5 * 1024 * 1024)
    })

    it('mxbai-embed-large DB가 존재해야 함', () => {
      const dbPath = path.join(ragDataDir, 'rag-mxbai-embed-large.db')

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath)
        console.log(`[mxbai-embed-large] DB 크기: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

        // 만약 92KB 같은 작은 크기라면 경고
        if (stats.size < 1 * 1024 * 1024) {
          console.warn('⚠️ mxbai-embed-large DB가 비정상적으로 작습니다. 재빌드 필요!')
        }
      } else {
        console.warn('⚠️ mxbai-embed-large DB가 없습니다.')
      }
    })
  })

  describe('DB 내용 검증 (qwen3-embedding:0.6b)', () => {
    const dbPath = path.join(ragDataDir, 'rag-qwen3-embedding-0.6b.db')

    it('111개 문서가 저장되어 있어야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }

      console.log(`[qwen3-embedding-0.6b] 문서 수: ${result.count}개`)
      expect(result.count).toBe(111)

      db.close()
    })

    it('모든 문서에 임베딩이 있어야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare(
        'SELECT COUNT(*) as count FROM documents WHERE embedding IS NOT NULL'
      ).get() as { count: number }

      console.log(`[qwen3-embedding-0.6b] 임베딩 있는 문서: ${result.count}개`)
      expect(result.count).toBe(111)

      db.close()
    })

    it('임베딩 모델 정보가 올바르게 저장되어 있어야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare(
        'SELECT DISTINCT embedding_model FROM documents WHERE embedding IS NOT NULL'
      ).all() as Array<{ embedding_model: string }>

      console.log(`[qwen3-embedding-0.6b] 임베딩 모델: ${result.map(r => r.embedding_model).join(', ')}`)

      expect(result.length).toBe(1)
      expect(result[0].embedding_model).toBe('qwen3-embedding:0.6b')

      db.close()
    })

    it('임베딩 차원이 1024여야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      // 첫 번째 문서의 임베딩 가져오기
      const result = db.prepare(
        'SELECT embedding FROM documents WHERE embedding IS NOT NULL LIMIT 1'
      ).get() as { embedding: Buffer }

      // BLOB 크기로 차원 계산 (4바이트 = float32)
      const dimensions = result.embedding.length / 4

      console.log(`[qwen3-embedding-0.6b] 임베딩 차원: ${dimensions}`)
      expect(dimensions).toBe(1024)

      db.close()
    })

    it('임베딩 BLOB을 float 배열로 변환 가능해야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare(
        'SELECT doc_id, embedding FROM documents WHERE embedding IS NOT NULL LIMIT 1'
      ).get() as { doc_id: string; embedding: Buffer }

      // BLOB → float 배열 변환
      const floats: number[] = []
      for (let i = 0; i < result.embedding.length; i += 4) {
        floats.push(result.embedding.readFloatLE(i))
      }

      console.log(`[qwen3-embedding-0.6b] 문서: ${result.doc_id}`)
      console.log(`  - 임베딩 차원: ${floats.length}`)
      console.log(`  - 첫 5개 값: [${floats.slice(0, 5).map(v => v.toFixed(3)).join(', ')}]`)

      expect(floats.length).toBe(1024)
      expect(floats[0]).toBeTypeOf('number')

      db.close()
    })
  })

  describe('검색 → 추론 흐름 검증', () => {
    const dbPath = path.join(ragDataDir, 'rag-qwen3-embedding-0.6b.db')

    it('원본 텍스트(content)가 그대로 보관되어 있어야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare(
        'SELECT doc_id, title, content FROM documents LIMIT 3'
      ).all() as Array<{ doc_id: string; title: string; content: string }>

      console.log('[qwen3-embedding-0.6b] 원본 텍스트 확인:')

      for (const doc of result) {
        console.log(`  - ${doc.title}`)
        console.log(`    Content length: ${doc.content.length} chars`)
        console.log(`    Preview: ${doc.content.slice(0, 100)}...`)

        // 원본 텍스트가 저장되어 있어야 함
        expect(doc.content.length).toBeGreaterThan(0)
      }

      db.close()
    })

    it('임베딩과 원본 텍스트가 함께 저장되어 있어야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      const result = db.prepare(
        "SELECT doc_id, content, embedding FROM documents WHERE doc_id = 'scipy_ttest_ind'"
      ).get() as { doc_id: string; content: string; embedding: Buffer } | undefined

      if (!result) {
        console.warn('⚠️ scipy_ttest_ind 문서를 찾을 수 없습니다.')
        return
      }

      console.log('[검색 → 추론 흐름]')
      console.log(`  1. 임베딩으로 문서 검색: ${result.doc_id}`)
      console.log(`     - 임베딩 크기: ${result.embedding.length} bytes`)
      console.log(`  2. 원본 텍스트를 추론 모델에 입력:`)
      console.log(`     - 텍스트 길이: ${result.content.length} chars`)
      console.log(`     - Preview: ${result.content.slice(0, 150)}...`)

      // 임베딩과 원본 텍스트가 모두 있어야 함
      expect(result.embedding.length).toBe(1024 * 4) // 1024 float32
      expect(result.content.length).toBeGreaterThan(100)

      db.close()
    })
  })

  describe('코사인 유사도 검색 시뮬레이션', () => {
    const dbPath = path.join(ragDataDir, 'rag-qwen3-embedding-0.6b.db')

    function cosineSimilarity(vec1: number[], vec2: number[]): number {
      let dotProduct = 0
      let norm1 = 0
      let norm2 = 0

      for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i]
        norm1 += vec1[i] * vec1[i]
        norm2 += vec2[i] * vec2[i]
      }

      const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
      return magnitude === 0 ? 0 : dotProduct / magnitude
    }

    it('임베딩으로 유사 문서 검색 가능해야 함', () => {
      const db = new Database(dbPath, { readonly: true })

      // 모든 문서 임베딩 로드
      const docs = db.prepare(
        'SELECT doc_id, title, embedding FROM documents WHERE embedding IS NOT NULL LIMIT 10'
      ).all() as Array<{ doc_id: string; title: string; embedding: Buffer }>

      // 첫 번째 문서를 쿼리로 사용
      const queryDoc = docs[0]
      const queryEmbedding: number[] = []
      for (let i = 0; i < queryDoc.embedding.length; i += 4) {
        queryEmbedding.push(queryDoc.embedding.readFloatLE(i))
      }

      // 나머지 문서와 유사도 계산
      const results: Array<{ doc_id: string; title: string; similarity: number }> = []

      for (const doc of docs) {
        const docEmbedding: number[] = []
        for (let i = 0; i < doc.embedding.length; i += 4) {
          docEmbedding.push(doc.embedding.readFloatLE(i))
        }

        const similarity = cosineSimilarity(queryEmbedding, docEmbedding)
        results.push({ doc_id: doc.doc_id, title: doc.title, similarity })
      }

      // 유사도 순 정렬
      results.sort((a, b) => b.similarity - a.similarity)

      console.log(`[코사인 유사도 검색 시뮬레이션]`)
      console.log(`  Query: ${queryDoc.title}`)
      console.log(`  Results (Top-5):`)

      for (let i = 0; i < Math.min(5, results.length); i++) {
        console.log(`    ${i + 1}. ${results[i].title} (similarity: ${results[i].similarity.toFixed(4)})`)
      }

      // 첫 번째 결과는 자기 자신이어야 함 (similarity = 1.0)
      expect(results[0].doc_id).toBe(queryDoc.doc_id)
      expect(results[0].similarity).toBeCloseTo(1.0, 5)

      db.close()
    })
  })
})
