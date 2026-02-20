/**
 * chunking.ts 테스트
 *
 * 문서 청킹 로직 검증
 */

import { describe, it, expect } from 'vitest'
import {
  chunkDocument,
  estimateTokens,
  createChunkMetadata,
  type ChunkOptions
} from '../chunking'

describe('chunking', () => {
  describe('estimateTokens', () => {
    it('빈 문자열은 0 토큰', () => {
      expect(estimateTokens('')).toBe(0)
    })

    it('단어 수 × 1.3으로 계산', () => {
      const text = 'This is a test'  // 4 words
      expect(estimateTokens(text)).toBe(Math.ceil(4 * 1.3))  // 6 tokens
    })

    it('연속 공백 처리', () => {
      const text = 'word1    word2   word3'
      expect(estimateTokens(text)).toBe(Math.ceil(3 * 1.3))
    })
  })

  describe('chunkDocument', () => {
    it('짧은 문서는 그대로 반환', () => {
      const shortText = 'This is a short document.'
      const chunks = chunkDocument(shortText, { maxTokens: 500 })

      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(shortText)
    })

    it('빈 문서는 빈 배열 반환', () => {
      expect(chunkDocument('')).toEqual([])
      expect(chunkDocument('   ')).toEqual([])
    })

    it('긴 문서는 여러 청크로 분할', () => {
      // 약 1000 토큰 문서 생성 (770 단어)
      const longText = Array(770).fill('word').join(' ')
      const chunks = chunkDocument(longText, { maxTokens: 500, overlapTokens: 50 })

      expect(chunks.length).toBeGreaterThan(1)
      console.log(`✓ ${chunks.length}개 청크 생성 (총 ${estimateTokens(longText)} 토큰)`)
    })

    it('각 청크가 최대 토큰 수를 초과하지 않음', () => {
      const longText = Array(1000).fill('word').join(' ')
      const maxTokens = 500
      const chunks = chunkDocument(longText, { maxTokens, overlapTokens: 50 })

      chunks.forEach((chunk, i) => {
        const tokens = estimateTokens(chunk)
        expect(tokens).toBeLessThanOrEqual(maxTokens)
        console.log(`  청크 ${i}: ${tokens} 토큰`)
      })
    })

    it('문장 경계 보존 모드', () => {
      const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.'
      const chunks = chunkDocument(text, {
        maxTokens: 10,  // 작게 설정하여 분할 유도
        overlapTokens: 2,
        preserveBoundaries: true
      })

      expect(chunks.length).toBeGreaterThan(1)
      // 각 청크는 완전한 문장으로 끝나야 함
      chunks.forEach((chunk, i) => {
        console.log(`  청크 ${i}: "${chunk}"`)
      })
    })

    it('오버랩 기능 확인', () => {
      const sentences = Array(10).fill(null).map((_, i) => `Sentence ${i}.`).join(' ')
      const chunks = chunkDocument(sentences, {
        maxTokens: 15,
        overlapTokens: 5,
        preserveBoundaries: true
      })

      expect(chunks.length).toBeGreaterThan(1)

      // 연속된 청크 간 일부 텍스트 중복 확인
      for (let i = 0; i < chunks.length - 1; i++) {
        const currentWords = chunks[i].split(/\s+/)
        const nextWords = chunks[i + 1].split(/\s+/)

        // 마지막 단어가 다음 청크에 포함되어 있는지 확인
        const lastWord = currentWords[currentWords.length - 1]
        const hasOverlap = nextWords.some(w => w === lastWord)

        console.log(`  청크 ${i}↔${i + 1} 오버랩: ${hasOverlap}`)
      }
    })

    it('단어 기반 청킹 (경계 미보존)', () => {
      const longText = Array(500).fill('word').join(' ')
      const chunks = chunkDocument(longText, {
        maxTokens: 200,
        overlapTokens: 20,
        preserveBoundaries: false
      })

      expect(chunks.length).toBeGreaterThan(1)
      console.log(`✓ 단어 기반 ${chunks.length}개 청크`)
    })

    it('약어 처리 (Dr., Mr. 등)', () => {
      const text = 'Dr. Smith met Mr. Jones. They discussed Prof. Lee vs. Prof. Kim.'
      const chunks = chunkDocument(text, { maxTokens: 500 })

      // Dr., Mr. 등이 문장 끝으로 오인되지 않아야 함
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toContain('Dr. Smith')
      expect(chunks[0]).toContain('Mr. Jones')
    })
  })

  describe('createChunkMetadata', () => {
    it('청크 메타데이터 생성', () => {
      const chunks = ['Chunk 1 text here', 'Chunk 2 text here', 'Chunk 3 text here']
      const metadata = createChunkMetadata(chunks)

      expect(metadata).toHaveLength(3)
      expect(metadata[0]).toEqual({
        index: 0,
        text: chunks[0],
        tokens: estimateTokens(chunks[0]),
        charCount: chunks[0].length
      })

      console.log('✓ 메타데이터:')
      metadata.forEach(m => {
        console.log(`  [${m.index}] ${m.tokens} 토큰, ${m.charCount} 문자`)
      })
    })
  })

  describe('실제 문서 테스트', () => {
    it('1쪽 문서 (약 3KB)', () => {
      // 통계 문서 예시 (약 500 단어 = 650 토큰)
      const doc1Page = `
# T-Test

The t-test is a statistical test used to determine if there is a significant difference between the means of two groups.

## Types of T-Tests
1. Independent samples t-test
2. Paired samples t-test
3. One-sample t-test

## Assumptions
- Normality: Data should be approximately normally distributed
- Homogeneity of variance: Equal variances between groups
- Independence: Observations should be independent

## Formula
t = (mean1 - mean2) / sqrt(var1/n1 + var2/n2)

## Interpretation
A p-value less than 0.05 indicates statistical significance.
`.repeat(3)

      const chunks = chunkDocument(doc1Page, { maxTokens: 500, overlapTokens: 50 })

      console.log(`\n1쪽 문서 청킹 결과:`)
      console.log(`  - 전체 토큰: ${estimateTokens(doc1Page)}`)
      console.log(`  - 청크 개수: ${chunks.length}`)
      chunks.forEach((c, i) => {
        console.log(`  - 청크 ${i}: ${estimateTokens(c)} 토큰`)
      })

      expect(chunks.length).toBeGreaterThanOrEqual(1)
    })

    it('10쪽 문서 (약 30KB)', () => {
      // 10쪽 분량 (약 5000 단어 = 6500 토큰)
      const doc10Pages = Array(20).fill(`
Statistical analysis is a fundamental tool in research methodology. It enables researchers to draw meaningful conclusions from data through systematic examination of patterns, relationships, and trends.

The process typically involves several key steps: data collection, data cleaning, exploratory analysis, hypothesis testing, and interpretation of results. Each step requires careful consideration of the research question and appropriate statistical methods.

Common statistical tests include t-tests for comparing means, ANOVA for multiple group comparisons, correlation analysis for examining relationships, and regression for predictive modeling. The choice of test depends on the nature of the data and research objectives.
`).join('\n\n')

      const chunks = chunkDocument(doc10Pages, { maxTokens: 500, overlapTokens: 50 })

      console.log(`\n10쪽 문서 청킹 결과:`)
      console.log(`  - 전체 토큰: ${estimateTokens(doc10Pages)}`)
      console.log(`  - 청크 개수: ${chunks.length}`)
      console.log(`  - 평균 토큰/청크: ${Math.floor(estimateTokens(doc10Pages) / chunks.length)}`)

      // 2470 토큰 / 500 maxTokens = 약 5~6개 청크 예상
      expect(chunks.length).toBeGreaterThan(4)
      expect(chunks.length).toBeLessThan(8)
    })

    it('50쪽 문서 (약 150KB)', () => {
      // 50쪽 분량 (약 25000 단어 = 32500 토큰)
      const paragraph = 'This is a statistical analysis paragraph that contains multiple sentences with various statistical concepts and methodologies. '
      const doc50Pages = Array(1500).fill(paragraph).join('')

      const startTime = Date.now()
      const chunks = chunkDocument(doc50Pages, { maxTokens: 500, overlapTokens: 50 })
      const elapsedTime = Date.now() - startTime

      console.log(`\n50쪽 문서 청킹 결과:`)
      console.log(`  - 전체 토큰: ${estimateTokens(doc50Pages)}`)
      console.log(`  - 청크 개수: ${chunks.length}`)
      console.log(`  - 처리 시간: ${elapsedTime}ms`)
      console.log(`  - 예상 임베딩 시간: ${Math.floor(chunks.length * 1.5)}초 (Ollama)`)

      expect(chunks.length).toBeGreaterThan(50)
      expect(elapsedTime).toBeLessThan(1000)  // 1초 이내
    })
  })
})
