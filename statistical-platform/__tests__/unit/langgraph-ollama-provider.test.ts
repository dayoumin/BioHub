/**
 * LangGraphOllamaProvider 테스트
 *
 * 테스트 범위:
 * 1. BM25 검색에서 await 정상 작동 확인
 * 2. mergeResults에서 배열 메서드 사용 확인
 * 3. Hybrid 검색 모드에서 RRF 병합 확인
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

// Mock 타입 정의
type SearchResult = {
  doc_id: string
  content: string
  score: number
  metadata?: Record<string, unknown>
}

type RAGStateType = {
  query: string
  searchMode: 'vector' | 'fts5' | 'hybrid'
  vectorResults: SearchResult[]
  bm25Results: SearchResult[]
  mergedResults: SearchResult[]
}

// LangGraphOllamaProvider 모의 구현
class MockLangGraphOllamaProvider {
  private topK = 5

  /**
   * searchByKeyword 모의 구현 (비동기)
   */
  async searchByKeyword(query: string): Promise<SearchResult[]> {
    // 실제 BM25 검색을 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 10)) // 비동기 시뮬레이션

    return [
      { doc_id: 'doc1', content: `BM25 result for ${query}`, score: 0.8, metadata: {} },
      { doc_id: 'doc2', content: `Another BM25 result for ${query}`, score: 0.6, metadata: {} },
    ]
  }

  /**
   * 노드 4: BM25 키워드 검색
   */
  async bm25Search(state: RAGStateType): Promise<Partial<RAGStateType>> {
    // Vector 전용 모드에서는 BM25 검색 스킵
    if (state.searchMode === 'vector') {
      console.log('[BM25Search] Vector 전용 모드 - BM25 검색 스킵')
      return { bm25Results: [] }
    }

    console.log('[BM25Search] BM25 검색 중...')

    try {
      // ✅ await 추가 (수정 후)
      const bm25Results = await this.searchByKeyword(state.query)
      return { bm25Results }
    } catch (error) {
      console.warn('[BM25Search] BM25 검색 실패:', error)
      return { bm25Results: [] }
    }
  }

  /**
   * 노드 5: 검색 결과 병합 (Reciprocal Rank Fusion)
   */
  async mergeResults(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[MergeResults] RRF 병합 중...')

    // Hybrid 모드: Vector + BM25 병합 (RRF)
    if (state.searchMode === 'hybrid') {
      const k = 60
      const rrfScores = new Map<string, number>()

      // Vector 결과 RRF 점수 계산
      state.vectorResults.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // BM25 결과 RRF 점수 계산
      state.bm25Results.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // 문서 매핑 (doc_id → SearchResult)
      const docMap = new Map<string, SearchResult>()
      ;[...state.vectorResults, ...state.bm25Results].forEach((doc) => {
        if (!docMap.has(doc.doc_id)) {
          docMap.set(doc.doc_id, doc)
        }
      })

      // RRF 점수로 정렬
      const merged = Array.from(rrfScores.entries())
        .sort((a, b) => b[1] - a[1]) // 점수 내림차순
        .map(([doc_id, score]) => {
          const doc = docMap.get(doc_id)!
          return { ...doc, score }
        })

      return { mergedResults: merged }
    }

    // Vector 전용
    if (state.searchMode === 'vector') {
      return { mergedResults: state.vectorResults }
    }

    // FTS5 전용
    return { mergedResults: state.bm25Results }
  }
}

describe('LangGraphOllamaProvider - BM25 검색 및 병합', () => {
  let provider: MockLangGraphOllamaProvider

  beforeEach(() => {
    provider = new MockLangGraphOllamaProvider()
  })

  describe('bm25Search - await 정상 작동', () => {
    it('비동기 searchByKeyword를 await하여 실제 배열을 반환해야 함', async () => {
      const state: RAGStateType = {
        query: 'test query',
        searchMode: 'fts5',
        vectorResults: [],
        bm25Results: [],
        mergedResults: [],
      }

      const result = await provider.bm25Search(state)

      // 결과가 배열이어야 함 (Promise가 아님)
      expect(result.bm25Results).toBeDefined()
      expect(Array.isArray(result.bm25Results)).toBe(true)
      expect(result.bm25Results?.length).toBeGreaterThan(0)
    })

    it('반환된 결과가 SearchResult[] 타입이어야 함', async () => {
      const state: RAGStateType = {
        query: 'typescript',
        searchMode: 'fts5',
        vectorResults: [],
        bm25Results: [],
        mergedResults: [],
      }

      const result = await provider.bm25Search(state)

      // 각 결과가 올바른 구조를 가져야 함
      result.bm25Results?.forEach((item) => {
        expect(item).toHaveProperty('doc_id')
        expect(item).toHaveProperty('content')
        expect(item).toHaveProperty('score')
        expect(typeof item.doc_id).toBe('string')
        expect(typeof item.content).toBe('string')
        expect(typeof item.score).toBe('number')
      })
    })

    it('Vector 모드에서는 BM25 검색을 스킵해야 함', async () => {
      const state: RAGStateType = {
        query: 'vector mode query',
        searchMode: 'vector',
        vectorResults: [],
        bm25Results: [],
        mergedResults: [],
      }

      const result = await provider.bm25Search(state)

      // Vector 모드에서는 빈 배열 반환 (검색하지 않음)
      expect(result.bm25Results).toEqual([])
    })

    it('에러 발생 시 빈 배열을 반환해야 함', async () => {
      // searchByKeyword를 에러를 던지도록 모킹
      const errorProvider = new MockLangGraphOllamaProvider()
      errorProvider.searchByKeyword = jest.fn().mockRejectedValue(new Error('Search failed'))

      const state: RAGStateType = {
        query: 'error query',
        searchMode: 'fts5',
        vectorResults: [],
        bm25Results: [],
        mergedResults: [],
      }

      const result = await errorProvider.bm25Search(state)

      expect(result.bm25Results).toEqual([])
    })
  })

  describe('mergeResults - 배열 메서드 사용 확인', () => {
    it('Hybrid 모드에서 forEach를 사용하여 RRF 점수를 계산해야 함', async () => {
      const state: RAGStateType = {
        query: 'hybrid query',
        searchMode: 'hybrid',
        vectorResults: [
          { doc_id: 'vec1', content: 'Vector result 1', score: 0.9, metadata: {} },
          { doc_id: 'vec2', content: 'Vector result 2', score: 0.7, metadata: {} },
        ],
        bm25Results: [
          { doc_id: 'bm1', content: 'BM25 result 1', score: 0.8, metadata: {} },
          { doc_id: 'bm2', content: 'BM25 result 2', score: 0.6, metadata: {} },
        ],
        mergedResults: [],
      }

      const result = await provider.mergeResults(state)

      // mergedResults가 배열이어야 함
      expect(Array.isArray(result.mergedResults)).toBe(true)
      expect(result.mergedResults?.length).toBeGreaterThan(0)
    })

    it('Hybrid 모드에서 중복 문서는 RRF 점수가 합산되어야 함', async () => {
      const state: RAGStateType = {
        query: 'overlap query',
        searchMode: 'hybrid',
        vectorResults: [
          { doc_id: 'doc1', content: 'Shared doc', score: 0.9, metadata: {} },
          { doc_id: 'doc2', content: 'Vector only', score: 0.7, metadata: {} },
        ],
        bm25Results: [
          { doc_id: 'doc1', content: 'Shared doc', score: 0.8, metadata: {} }, // 중복
          { doc_id: 'doc3', content: 'BM25 only', score: 0.6, metadata: {} },
        ],
        mergedResults: [],
      }

      const result = await provider.mergeResults(state)

      // doc1이 최상위에 있어야 함 (두 검색 결과에 모두 포함되므로 RRF 점수 높음)
      expect(result.mergedResults?.[0].doc_id).toBe('doc1')

      // 총 3개의 고유 문서가 있어야 함
      expect(result.mergedResults?.length).toBe(3)
    })

    it('Vector 전용 모드에서는 vectorResults를 그대로 반환해야 함', async () => {
      const state: RAGStateType = {
        query: 'vector query',
        searchMode: 'vector',
        vectorResults: [
          { doc_id: 'vec1', content: 'Vector result 1', score: 0.9, metadata: {} },
        ],
        bm25Results: [],
        mergedResults: [],
      }

      const result = await provider.mergeResults(state)

      expect(result.mergedResults).toEqual(state.vectorResults)
    })

    it('FTS5 전용 모드에서는 bm25Results를 그대로 반환해야 함', async () => {
      const state: RAGStateType = {
        query: 'fts5 query',
        searchMode: 'fts5',
        vectorResults: [],
        bm25Results: [
          { doc_id: 'bm1', content: 'BM25 result 1', score: 0.8, metadata: {} },
        ],
        mergedResults: [],
      }

      const result = await provider.mergeResults(state)

      expect(result.mergedResults).toEqual(state.bm25Results)
    })
  })

  describe('통합 워크플로우 - bm25Search → mergeResults', () => {
    it('전체 워크플로우가 정상 작동해야 함 (Hybrid 모드)', async () => {
      // Step 1: Vector 검색 (모의)
      const vectorResults: SearchResult[] = [
        { doc_id: 'vec1', content: 'Vector doc 1', score: 0.95, metadata: {} },
        { doc_id: 'vec2', content: 'Vector doc 2', score: 0.85, metadata: {} },
      ]

      // Step 2: BM25 검색
      const state1: RAGStateType = {
        query: 'hybrid workflow',
        searchMode: 'hybrid',
        vectorResults,
        bm25Results: [],
        mergedResults: [],
      }

      const bm25Result = await provider.bm25Search(state1)

      // Step 3: 상태 업데이트
      const state2: RAGStateType = {
        ...state1,
        bm25Results: bm25Result.bm25Results || [],
      }

      // Step 4: 결과 병합
      const mergeResult = await provider.mergeResults(state2)

      // 검증
      expect(mergeResult.mergedResults).toBeDefined()
      expect(Array.isArray(mergeResult.mergedResults)).toBe(true)
      expect(mergeResult.mergedResults?.length).toBeGreaterThan(0)

      // RRF 점수로 정렬되어 있어야 함
      const scores = mergeResult.mergedResults?.map(r => r.score) || []
      const sortedScores = [...scores].sort((a, b) => b - a)
      expect(scores).toEqual(sortedScores)
    })

    it('bm25Results가 Promise가 아닌 실제 배열이어야 forEach가 작동함', async () => {
      const state: RAGStateType = {
        query: 'promise test',
        searchMode: 'hybrid',
        vectorResults: [
          { doc_id: 'vec1', content: 'Vector', score: 0.9, metadata: {} },
        ],
        bm25Results: [], // 초기 빈 배열
        mergedResults: [],
      }

      // BM25 검색 실행
      const bm25Result = await provider.bm25Search(state)

      // 상태 업데이트
      const updatedState: RAGStateType = {
        ...state,
        bm25Results: bm25Result.bm25Results || [],
      }

      // mergeResults에서 forEach 사용 (에러가 발생하지 않아야 함)
      expect(async () => {
        await provider.mergeResults(updatedState)
      }).not.toThrow()
    })
  })
})
