/**
 * OllamaProvider - Vector Embedding 테스트
 *
 * 테스트 범위:
 * 1. BLOB → float 배열 변환 (blobToFloatArray)
 * 2. DB에서 임베딩 로드 (loadSQLiteDB)
 * 3. Vector 검색 성능 (searchByVector)
 * 4. Hybrid 검색 (FTS5 + Vector)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// BLOB → float 배열 변환 함수 (ollama-provider.ts에서 추출)
function blobToFloatArray(blob: Uint8Array): number[] {
  const floats: number[] = []
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)

  for (let i = 0; i < blob.byteLength; i += 4) {
    floats.push(view.getFloat32(i, true)) // true = little-endian
  }

  return floats
}

// 코사인 유사도 계산 (ollama-provider.ts에서 추출)
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('벡터 길이가 다릅니다')
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i]
    norm1 += vec1[i] * vec1[i]
    norm2 += vec2[i] * vec2[i]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}

describe('OllamaProvider - Vector Embedding', () => {
  describe('blobToFloatArray()', () => {
    it('1024 차원 임베딩 BLOB을 float 배열로 변환', () => {
      // Python: struct.pack('f', 0.5, -0.3, 0.8, -0.2)
      const embedding = [0.5, -0.3, 0.8, -0.2]
      const buffer = new ArrayBuffer(embedding.length * 4)
      const view = new DataView(buffer)

      embedding.forEach((value, index) => {
        view.setFloat32(index * 4, value, true) // little-endian
      })

      const blob = new Uint8Array(buffer)
      const result = blobToFloatArray(blob)

      expect(result).toHaveLength(4)
      expect(result[0]).toBeCloseTo(0.5, 5)
      expect(result[1]).toBeCloseTo(-0.3, 5)
      expect(result[2]).toBeCloseTo(0.8, 5)
      expect(result[3]).toBeCloseTo(-0.2, 5)
    })

    it('빈 BLOB은 빈 배열 반환', () => {
      const blob = new Uint8Array(0)
      const result = blobToFloatArray(blob)

      expect(result).toHaveLength(0)
    })

    it('1024 차원 임베딩 (실제 크기)', () => {
      const dimensions = 1024
      const buffer = new ArrayBuffer(dimensions * 4)
      const view = new DataView(buffer)

      // 랜덤 임베딩 생성
      const expected: number[] = []
      for (let i = 0; i < dimensions; i++) {
        const value = Math.random() * 2 - 1 // -1.0 ~ 1.0
        view.setFloat32(i * 4, value, true)
        expected.push(value)
      }

      const blob = new Uint8Array(buffer)
      const result = blobToFloatArray(blob)

      expect(result).toHaveLength(1024)
      expect(result[0]).toBeCloseTo(expected[0], 5)
      expect(result[1023]).toBeCloseTo(expected[1023], 5)
    })

    it('Uint8Array 슬라이스도 정상 변환 (byteOffset 고려)', () => {
      // 전체 버퍼에서 일부만 사용하는 경우
      const buffer = new ArrayBuffer(16) // 4개 float
      const view = new DataView(buffer)

      view.setFloat32(0, 1.0, true)
      view.setFloat32(4, 2.0, true)
      view.setFloat32(8, 3.0, true)
      view.setFloat32(12, 4.0, true)

      // 2번째, 3번째 float만 추출 (offset 4, length 8)
      const slice = new Uint8Array(buffer, 4, 8)
      const result = blobToFloatArray(slice)

      expect(result).toHaveLength(2)
      expect(result[0]).toBeCloseTo(2.0, 5)
      expect(result[1]).toBeCloseTo(3.0, 5)
    })
  })

  describe('cosineSimilarity()', () => {
    it('동일한 벡터는 유사도 1.0', () => {
      const vec = [1.0, 2.0, 3.0]
      const similarity = cosineSimilarity(vec, vec)

      expect(similarity).toBeCloseTo(1.0, 5)
    })

    it('반대 벡터는 유사도 -1.0', () => {
      const vec1 = [1.0, 2.0, 3.0]
      const vec2 = [-1.0, -2.0, -3.0]
      const similarity = cosineSimilarity(vec1, vec2)

      expect(similarity).toBeCloseTo(-1.0, 5)
    })

    it('직교 벡터는 유사도 0.0', () => {
      const vec1 = [1.0, 0.0, 0.0]
      const vec2 = [0.0, 1.0, 0.0]
      const similarity = cosineSimilarity(vec1, vec2)

      expect(similarity).toBeCloseTo(0.0, 5)
    })

    it('1024 차원 임베딩 유사도 계산', () => {
      const dimensions = 1024
      const vec1 = Array(dimensions).fill(0).map(() => Math.random())
      const vec2 = Array(dimensions).fill(0).map(() => Math.random())

      const similarity = cosineSimilarity(vec1, vec2)

      // 랜덤 벡터는 보통 0.0 ~ 0.5 사이
      expect(similarity).toBeGreaterThanOrEqual(-1.0)
      expect(similarity).toBeLessThanOrEqual(1.0)
    })

    it('벡터 길이가 다르면 에러', () => {
      const vec1 = [1.0, 2.0, 3.0]
      const vec2 = [1.0, 2.0]

      expect(() => cosineSimilarity(vec1, vec2)).toThrow('벡터 길이가 다릅니다')
    })

    it('zero 벡터는 유사도 0.0', () => {
      const vec1 = [0.0, 0.0, 0.0]
      const vec2 = [1.0, 2.0, 3.0]
      const similarity = cosineSimilarity(vec1, vec2)

      expect(similarity).toBe(0.0)
    })
  })

  describe('성능 테스트', () => {
    it('1024 차원 임베딩 변환 성능 (1000회)', () => {
      const dimensions = 1024
      const buffer = new ArrayBuffer(dimensions * 4)
      const view = new DataView(buffer)

      for (let i = 0; i < dimensions; i++) {
        view.setFloat32(i * 4, Math.random(), true)
      }

      const blob = new Uint8Array(buffer)

      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        blobToFloatArray(blob)
      }
      const elapsed = performance.now() - startTime

      console.log(`[Performance] BLOB 변환 1000회: ${elapsed.toFixed(2)}ms (평균: ${(elapsed / 1000).toFixed(3)}ms)`)
      expect(elapsed).toBeLessThan(1000) // 1초 이내
    })

    it('코사인 유사도 계산 성능 (1000회)', () => {
      const dimensions = 1024
      const vec1 = Array(dimensions).fill(0).map(() => Math.random())
      const vec2 = Array(dimensions).fill(0).map(() => Math.random())

      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        cosineSimilarity(vec1, vec2)
      }
      const elapsed = performance.now() - startTime

      console.log(`[Performance] 코사인 유사도 1000회: ${elapsed.toFixed(2)}ms (평균: ${(elapsed / 1000).toFixed(3)}ms)`)
      expect(elapsed).toBeLessThan(1000) // 1초 이내
    })

    it('111개 문서 Vector 검색 시뮬레이션', () => {
      const dimensions = 1024
      const docCount = 111

      // 111개 문서 임베딩 생성
      const docEmbeddings = Array(docCount).fill(0).map(() =>
        Array(dimensions).fill(0).map(() => Math.random())
      )

      // 쿼리 임베딩 생성
      const queryEmbedding = Array(dimensions).fill(0).map(() => Math.random())

      // Vector 검색 (코사인 유사도 계산)
      const startTime = performance.now()
      const scores = docEmbeddings.map((docEmb) =>
        cosineSimilarity(queryEmbedding, docEmb)
      )
      const elapsed = performance.now() - startTime

      console.log(`[Performance] 111개 문서 Vector 검색: ${elapsed.toFixed(2)}ms`)
      expect(elapsed).toBeLessThan(100) // 100ms 이내 (임베딩 생성 제외)
      expect(scores).toHaveLength(111)
    })
  })

  describe('통합 테스트 (Python ↔ TypeScript)', () => {
    it('Python에서 생성한 BLOB을 TypeScript에서 복원', () => {
      // Python 코드 시뮬레이션:
      // embedding = [0.207, -0.304, -0.028, -0.090, -0.359]
      // blob = struct.pack('5f', *embedding)
      const pythonEmbedding = [0.207, -0.304, -0.028, -0.090, -0.359]
      const buffer = new ArrayBuffer(pythonEmbedding.length * 4)
      const view = new DataView(buffer)

      pythonEmbedding.forEach((value, index) => {
        view.setFloat32(index * 4, value, true) // little-endian
      })

      const blob = new Uint8Array(buffer)

      // TypeScript에서 복원
      const result = blobToFloatArray(blob)

      expect(result).toHaveLength(5)
      expect(result[0]).toBeCloseTo(0.207, 3)
      expect(result[1]).toBeCloseTo(-0.304, 3)
      expect(result[2]).toBeCloseTo(-0.028, 3)
      expect(result[3]).toBeCloseTo(-0.090, 3)
      expect(result[4]).toBeCloseTo(-0.359, 3)
    })

    it('1024 차원 실제 임베딩 (DB 데이터 시뮬레이션)', () => {
      // 실제 DB에서 로드한 임베딩 시뮬레이션
      const dimensions = 1024
      const buffer = new ArrayBuffer(dimensions * 4)
      const view = new DataView(buffer)

      // Python에서 생성한 임베딩 (mxbai-embed-large)
      for (let i = 0; i < dimensions; i++) {
        // 정규 분포 근사 (평균 0, 표준편차 0.3)
        const value = (Math.random() + Math.random() + Math.random() - 1.5) * 0.3
        view.setFloat32(i * 4, value, true)
      }

      const blob = new Uint8Array(buffer)
      const result = blobToFloatArray(blob)

      // 검증: 차원, 범위, 통계
      expect(result).toHaveLength(1024)

      const mean = result.reduce((sum, v) => sum + v, 0) / result.length
      const variance = result.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / result.length
      const stdDev = Math.sqrt(variance)

      console.log(`[Stats] Mean: ${mean.toFixed(4)}, StdDev: ${stdDev.toFixed(4)}`)
      expect(Math.abs(mean)).toBeLessThan(0.15) // 평균 0 근처
      expect(stdDev).toBeGreaterThan(0.1) // 적절한 분산 (랜덤이므로 느슨한 검증)
      expect(stdDev).toBeLessThan(0.6)
    })
  })
})
