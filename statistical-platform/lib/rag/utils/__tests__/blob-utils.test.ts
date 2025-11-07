/**
 * BLOB 유틸리티 테스트
 *
 * 검증 항목:
 * - Float32Array ↔ BLOB 변환 정확성
 * - Hex 인코딩/디코딩
 * - SQLite 리터럴 생성
 * - 에러 처리
 */

import {
  vectorToBlob,
  blobToVector,
  toSQLiteBlobLiteral,
  getBlobSize,
  validateVectorDimensions,
} from '../blob-utils'

describe('BLOB 유틸리티', () => {
  describe('vectorToBlob', () => {
    it('Float32Array를 Hex 문자열로 변환', () => {
      const vector = new Float32Array([0.1, 0.2, 0.3])
      const blob = vectorToBlob(vector)

      // Hex 문자열 형식 확인
      expect(blob).toMatch(/^[0-9a-f]+$/)
      expect(blob.length).toBe(24) // 3 floats × 8 hex chars

      console.log(`✓ Hex: ${blob}`)
    })

    it('빈 벡터는 빈 문자열 반환', () => {
      const vector = new Float32Array([])
      const blob = vectorToBlob(vector)

      expect(blob).toBe('')
    })

    it('큰 벡터 (1024 차원) 변환', () => {
      const vector = new Float32Array(1024)
      for (let i = 0; i < vector.length; i++) {
        vector[i] = Math.random()
      }

      const blob = vectorToBlob(vector)

      expect(blob.length).toBe(1024 * 8) // 1024 floats × 8 hex chars
      console.log(`✓ 1024차원 벡터 → ${blob.length} hex chars`)
    })
  })

  describe('blobToVector', () => {
    it('Hex 문자열을 Float32Array로 변환', () => {
      // vectorToBlob로 생성한 Hex를 다시 복원
      const original = new Float32Array([0.1, 0.2, 0.3])
      const blob = vectorToBlob(original)
      const restored = blobToVector(blob)

      expect(restored.length).toBe(3)
      expect(restored[0]).toBeCloseTo(0.1, 5)
      expect(restored[1]).toBeCloseTo(0.2, 5)
      expect(restored[2]).toBeCloseTo(0.3, 5)

      console.log(`✓ 복원된 벡터: [${Array.from(restored).join(', ')}]`)
    })

    it('빈 Hex 문자열은 빈 벡터 반환', () => {
      const restored = blobToVector('')

      expect(restored.length).toBe(0)
    })

    it('잘못된 Hex 길이는 에러', () => {
      // 8의 배수가 아닌 길이 (Float32 = 8 hex chars)
      expect(() => blobToVector('3dcccc')).toThrow('8의 배수여야 합니다')
    })
  })

  describe('Round-trip 테스트', () => {
    it('Float32Array → BLOB → Float32Array 변환 정확성', () => {
      const testCases: Float32Array[] = [
        new Float32Array([1.0, 2.0, 3.0]),
        new Float32Array([-0.5, 0.0, 0.5]),
        new Float32Array([Math.PI, Math.E, Math.SQRT2]),
        new Float32Array(Array(100).fill(0).map(() => Math.random())),
      ]

      testCases.forEach((original, i) => {
        const blob = vectorToBlob(original)
        const restored = blobToVector(blob)

        expect(restored.length).toBe(original.length)

        for (let j = 0; j < original.length; j++) {
          expect(restored[j]).toBeCloseTo(original[j], 5)
        }

        console.log(`✓ 테스트 케이스 ${i + 1}: ${original.length}차원 복원 성공`)
      })
    })

    it('극단적인 값 처리', () => {
      const extremeValues = new Float32Array([
        Number.MIN_VALUE,
        Number.MAX_VALUE,
        -Number.MAX_VALUE,
        0.0,
        -0.0,
        Infinity,
        -Infinity,
      ])

      const blob = vectorToBlob(extremeValues)
      const restored = blobToVector(blob)

      expect(restored.length).toBe(extremeValues.length)

      for (let i = 0; i < extremeValues.length; i++) {
        if (Number.isFinite(extremeValues[i])) {
          expect(restored[i]).toBeCloseTo(extremeValues[i], 5)
        } else {
          expect(restored[i]).toBe(extremeValues[i]) // Infinity, -Infinity
        }
      }

      console.log('✓ 극단값 처리 성공 (MIN, MAX, Infinity)')
    })
  })

  describe('toSQLiteBlobLiteral', () => {
    it('SQLite BLOB 리터럴 생성', () => {
      const vector = new Float32Array([0.1, 0.2, 0.3])
      const literal = toSQLiteBlobLiteral(vector)

      expect(literal).toMatch(/^X'[0-9a-f]+'$/)
      console.log(`✓ SQLite 리터럴: ${literal}`)
    })

    it('빈 벡터는 X\'\' 반환', () => {
      const vector = new Float32Array([])
      const literal = toSQLiteBlobLiteral(vector)

      expect(literal).toBe("X''")
    })

    it('SQL 쿼리에 삽입 가능한 형식', () => {
      const vector = new Float32Array([1.0, 2.0])
      const literal = toSQLiteBlobLiteral(vector)

      const query = `INSERT INTO embeddings (embedding) VALUES (${literal})`
      expect(query).toMatch(/VALUES \(X'[0-9a-f]+'\)/)

      console.log(`✓ SQL 쿼리: ${query}`)
    })
  })

  describe('getBlobSize', () => {
    it('BLOB 크기 계산 (bytes)', () => {
      expect(getBlobSize(new Float32Array(1))).toBe(4)
      expect(getBlobSize(new Float32Array(10))).toBe(40)
      expect(getBlobSize(new Float32Array(1024))).toBe(4096)

      console.log('✓ BLOB 크기: 1024차원 = 4096 bytes (4KB)')
    })

    it('빈 벡터는 0 bytes', () => {
      expect(getBlobSize(new Float32Array([]))).toBe(0)
    })
  })

  describe('validateVectorDimensions', () => {
    it('차원이 일치하면 에러 없음', () => {
      const vector = new Float32Array(1024)

      expect(() => validateVectorDimensions(vector, 1024)).not.toThrow()
    })

    it('차원이 불일치하면 에러', () => {
      const vector = new Float32Array(512)

      expect(() => validateVectorDimensions(vector, 1024)).toThrow('벡터 차원 불일치')
    })

    it('에러 메시지에 예상/실제 차원 포함', () => {
      const vector = new Float32Array(768)

      try {
        validateVectorDimensions(vector, 1024)
        fail('에러가 발생해야 함')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        const error = err as Error
        expect(error.message).toContain('예상 1024')
        expect(error.message).toContain('실제 768')

        console.log(`✓ 에러 메시지: ${error.message}`)
      }
    })
  })

  describe('실제 임베딩 시나리오', () => {
    it('Ollama 임베딩 (1024차원) 저장/로드', () => {
      // Ollama nomic-embed-text 모델 시뮬레이션
      const embedding = new Float32Array(1024)
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = (Math.random() - 0.5) * 2 // -1 ~ 1 범위
      }

      // BLOB 변환
      const blob = vectorToBlob(embedding)
      expect(blob.length).toBe(8192) // 1024 × 8

      // SQLite 리터럴
      const literal = toSQLiteBlobLiteral(embedding)
      expect(literal).toMatch(/^X'[0-9a-f]{8192}'$/)

      // 복원
      const restored = blobToVector(blob)
      expect(restored.length).toBe(1024)

      // 정확성 검증
      for (let i = 0; i < 10; i++) {
        expect(restored[i]).toBeCloseTo(embedding[i], 5)
      }

      console.log('✓ Ollama 임베딩 시나리오 (1024차원) 성공')
      console.log(`  - BLOB 크기: ${getBlobSize(embedding)} bytes (4KB)`)
    })

    it('여러 청크 임베딩 배치 처리', () => {
      const chunkCount = 100
      const embeddings: Float32Array[] = []

      // 100개 청크 임베딩 생성
      for (let i = 0; i < chunkCount; i++) {
        const embedding = new Float32Array(1024)
        for (let j = 0; j < embedding.length; j++) {
          embedding[j] = Math.random()
        }
        embeddings.push(embedding)
      }

      // 모두 BLOB로 변환
      const blobs = embeddings.map(e => vectorToBlob(e))
      expect(blobs.length).toBe(100)

      // 모두 복원
      const restored = blobs.map(b => blobToVector(b))
      expect(restored.length).toBe(100)

      // 샘플 검증
      for (let i = 0; i < 10; i++) {
        expect(restored[i][0]).toBeCloseTo(embeddings[i][0], 5)
      }

      const totalSize = embeddings.reduce((sum, e) => sum + getBlobSize(e), 0)
      console.log('✓ 100개 청크 배치 처리 성공')
      console.log(`  - 총 BLOB 크기: ${Math.floor(totalSize / 1024)} KB`)
    })
  })
})
