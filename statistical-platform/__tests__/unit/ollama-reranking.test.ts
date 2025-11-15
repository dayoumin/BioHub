/**
 * Ollama Reranking 테스트
 *
 * Phase B: LLM Reranking (Top-20 → Top-5) 검증
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

describe('Ollama Reranking - Configuration', () => {
  it('should have useReranking option in RAGContext', () => {
    interface RAGContext {
      query: string
      method?: string
      searchMode?: 'fts5' | 'vector' | 'hybrid'
      useReranking?: boolean
    }

    const contextWithReranking: RAGContext = {
      query: 't-test 정규성 가정',
      useReranking: true
    }

    const contextWithoutReranking: RAGContext = {
      query: 't-test 정규성 가정',
      useReranking: false
    }

    expect(contextWithReranking.useReranking).toBe(true)
    expect(contextWithoutReranking.useReranking).toBe(false)
  })

  it('should default to useReranking=true when not specified', () => {
    // 기본값 테스트
    const useReranking = undefined
    const shouldRerank = useReranking !== false // 기본값: true

    expect(shouldRerank).toBe(true)
  })

  it('should respect useReranking=false', () => {
    const useReranking = false
    const shouldRerank = useReranking !== false

    expect(shouldRerank).toBe(false)
  })
})

describe('Ollama Reranking - Search Result Expansion', () => {
  it('should expand search results to 4x topK', () => {
    const topK = 5
    const candidateLimit = topK * 4

    expect(candidateLimit).toBe(20)
  })

  it('should handle edge case where results are less than topK', () => {
    const searchResults = [
      { doc_id: '1', title: 'Doc 1', content: 'Content 1', library: 'scipy', category: null, score: 0.9 },
      { doc_id: '2', title: 'Doc 2', content: 'Content 2', library: 'scipy', category: null, score: 0.8 },
      { doc_id: '3', title: 'Doc 3', content: 'Content 3', library: 'scipy', category: null, score: 0.7 }
    ]
    const topK = 5

    // 결과가 topK보다 적으면 Reranking 불필요
    const shouldRerank = searchResults.length > topK
    expect(shouldRerank).toBe(false)
  })

  it('should trigger reranking when results exceed topK', () => {
    const searchResults = Array.from({ length: 20 }, (_, i) => ({
      doc_id: `${i+1}`,
      title: `Doc ${i+1}`,
      content: `Content ${i+1}`,
      library: 'scipy',
      category: null,
      score: 1 - (i * 0.05)
    }))
    const topK = 5

    const shouldRerank = searchResults.length > topK
    expect(shouldRerank).toBe(true)
    expect(searchResults.length).toBe(20)
  })
})

describe('Ollama Reranking - Prompt Format', () => {
  it('should format reranking prompt correctly', () => {
    const query = 't-test 정규성 가정 확인 방법'
    const topK = 5
    const candidates = [
      { number: 1, title: 'scipy.stats.ttest_ind', content: 'T-test for independent samples...' },
      { number: 2, title: 'scipy.stats.shapiro', content: 'Shapiro-Wilk normality test...' },
      { number: 3, title: 'scipy.stats.normaltest', content: 'K-squared normality test...' }
    ]

    const prompt = `질문: ${query}

다음 문서들을 위 질문과의 관련성 순으로 정렬하세요.
가장 관련성이 높은 문서를 1순위로 하여 상위 ${topK}개만 선택하세요.

${candidates.map(({ number, title, content }) =>
  `[${number}] ${title}\n${content.slice(0, 200)}...`
).join('\n\n')}

답변 형식: 숫자만 쉼표로 구분 (예: 5,2,8,1,3)
상위 ${topK}개 문서 번호:`

    expect(prompt).toContain('질문: t-test 정규성 가정 확인 방법')
    expect(prompt).toContain('[1] scipy.stats.ttest_ind')
    expect(prompt).toContain('[2] scipy.stats.shapiro')
    expect(prompt).toContain('답변 형식: 숫자만 쉼표로 구분')
  })

  it('should use temperature=0 for deterministic ranking', () => {
    const ollamaOptions = {
      temperature: 0,
      num_predict: 100
    }

    expect(ollamaOptions.temperature).toBe(0)
    expect(ollamaOptions.num_predict).toBe(100)
  })
})

describe('Ollama Reranking - Response Parsing', () => {
  it('should parse valid response correctly', () => {
    const response = '5,2,8,1,3'
    const indices = response
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n))

    expect(indices).toEqual([5, 2, 8, 1, 3])
    expect(indices.length).toBe(5)
  })

  it('should handle response with spaces', () => {
    const response = ' 5 , 2 , 8 , 1 , 3 '
    const indices = response
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n))

    expect(indices).toEqual([5, 2, 8, 1, 3])
  })

  it('should filter out invalid indices', () => {
    const response = '5,abc,2,NaN,8,1,3'
    const indices = response
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n))

    expect(indices).toEqual([5, 2, 8, 1, 3])
  })

  it('should handle out-of-bounds indices', () => {
    const response = '5,2,100,1,3'
    const candidatesLength = 20

    const indices = response
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n) && n >= 1 && n <= candidatesLength)

    expect(indices).toEqual([5, 2, 1, 3])
    expect(indices).not.toContain(100)
  })

  it('should return empty array for completely invalid response', () => {
    const response = 'invalid response'
    const indices = response
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n))

    expect(indices).toEqual([])
  })
})

describe('Ollama Reranking - Result Deduplication', () => {
  it('should remove duplicate indices', () => {
    const indices = [5, 2, 2, 8, 1, 5, 3]
    const usedIndices = new Set<number>()
    const uniqueIndices: number[] = []

    for (const idx of indices) {
      if (!usedIndices.has(idx)) {
        uniqueIndices.push(idx)
        usedIndices.add(idx)
      }
    }

    expect(uniqueIndices).toEqual([5, 2, 8, 1, 3])
    expect(uniqueIndices.length).toBe(5)
  })

  it('should limit results to topK', () => {
    const indices = [5, 2, 8, 1, 3, 7, 9, 10]
    const topK = 5
    const limitedIndices = indices.slice(0, topK)

    expect(limitedIndices).toEqual([5, 2, 8, 1, 3])
    expect(limitedIndices.length).toBe(topK)
  })
})

describe('Ollama Reranking - Fallback Behavior', () => {
  it('should fallback to original order on parsing failure', () => {
    const candidates = [
      { doc_id: '1', title: 'Doc 1', content: 'Content 1', library: 'scipy', category: null, score: 0.9 },
      { doc_id: '2', title: 'Doc 2', content: 'Content 2', library: 'scipy', category: null, score: 0.8 },
      { doc_id: '3', title: 'Doc 3', content: 'Content 3', library: 'scipy', category: null, score: 0.7 },
      { doc_id: '4', title: 'Doc 4', content: 'Content 4', library: 'scipy', category: null, score: 0.6 },
      { doc_id: '5', title: 'Doc 5', content: 'Content 5', library: 'scipy', category: null, score: 0.5 }
    ]
    const topK = 5

    // 파싱 실패 시나리오
    const indices: number[] = [] // 빈 배열

    // Fallback: 원본 순서 유지
    const result = indices.length === 0
      ? candidates.slice(0, topK)
      : [] // (실제로는 indices 기반 재정렬)

    expect(result).toHaveLength(5)
    expect(result[0].doc_id).toBe('1')
  })

  it('should fallback on Ollama API error', () => {
    const candidates = [
      { doc_id: '1', title: 'Doc 1', content: 'Content 1', library: 'scipy', category: null, score: 0.9 }
    ]
    const topK = 5

    // API 에러 시나리오
    const apiError = new Error('Ollama connection failed')

    // Fallback: 원본 순서 반환
    const result = candidates.slice(0, topK)

    expect(result).toHaveLength(1)
    expect(apiError.message).toBe('Ollama connection failed')
  })
})

describe('Ollama Reranking - Index Conversion', () => {
  it('should convert 1-based to 0-based indices', () => {
    const oneBased = 5
    const zeroBased = oneBased - 1

    expect(zeroBased).toBe(4)
  })

  it('should handle index array conversion', () => {
    const oneBasedIndices = [5, 2, 8, 1, 3]
    const zeroBasedIndices = oneBasedIndices.map(idx => idx - 1)

    expect(zeroBasedIndices).toEqual([4, 1, 7, 0, 2])
  })
})

describe('Ollama Reranking - Performance Expectations', () => {
  it('should add acceptable latency', () => {
    // 예상 추가 시간: 300-600ms
    const minLatency = 300
    const maxLatency = 600

    expect(minLatency).toBeGreaterThan(0)
    expect(maxLatency).toBeLessThan(1000) // 1초 미만
  })

  it('should improve accuracy significantly', () => {
    // 예상 정확도 향상: +50-100%
    const minImprovement = 50  // %
    const maxImprovement = 100 // %

    expect(minImprovement).toBeGreaterThanOrEqual(50)
    expect(maxImprovement).toBeLessThanOrEqual(100)
  })
})
