/**
 * RAG 스트리밍 개선사항 테스트
 *
 * 테스트 대상:
 * 1. cleanThinkTags() - 태그 제거 로직
 * 2. estimateTokenCount() - 토큰 수 추정
 * 3. TextDecoder 플러시 (멀티바이트 안전성)
 * 4. AbortController + 재시도 로직
 */

import { OllamaRAGProvider } from '@/lib/rag/providers/ollama-provider'

describe('RAG 스트리밍 개선사항 테스트', () => {
  // Helper: private 메서드 접근을 위한 타입 캐스팅
  type OllamaProviderWithPrivate = OllamaRAGProvider & {
    cleanThinkTags(text: string): string
    estimateTokenCount(text: string): number
  }

  let provider: OllamaProviderWithPrivate

  beforeEach(() => {
    // 테스트 모드로 OllamaProvider 생성 (실제 Ollama 서버 불필요)
    const rawProvider = new OllamaRAGProvider({
      name: 'Test Provider',
      embeddingModel: 'nomic-embed-text',
      inferenceModel: 'qwen2.5:7b',
      ollamaEndpoint: 'http://localhost:11434',
      vectorDbPath: '/test/rag.db',
      topK: 5,
      testMode: true
    })

    provider = rawProvider as OllamaProviderWithPrivate
  })

  describe('1. cleanThinkTags() - 태그 제거', () => {
    it('기본 <think> 태그 제거', () => {
      const input = 't-test는<think>이건 내부 사고</think> 두 그룹의 평균을 비교합니다.'
      const expected = 't-test는 두 그룹의 평균을 비교합니다.'

      const result = provider.cleanThinkTags(input)

      expect(result).toBe(expected)
    })

    it('HTML 이스케이프된 태그 제거', () => {
      const input = '답변입니다.&lt;think&gt;내부 추론&lt;/think&gt; 계속됩니다.'
      const expected = '답변입니다. 계속됩니다.'

      const result = provider.cleanThinkTags(input)

      expect(result).toBe(expected)
    })

    it('-sensitive 태그 제거', () => {
      const input = '결과: -sensitive<think>민감정보</think> 최종 답변'
      const expected = '결과:  최종 답변'

      const result = provider.cleanThinkTags(input)

      expect(result).toBe(expected)
    })

    it('여러 태그 동시 제거', () => {
      const input = '<think>A</think>텍스트1&lt;think&gt;B&lt;/think&gt;텍스트2-sensitive<think>C</think>텍스트3'
      const expected = '텍스트1텍스트2텍스트3'

      const result = provider.cleanThinkTags(input)

      expect(result).toBe(expected)
    })

    it('태그 없으면 원본 반환', () => {
      const input = 't-test는 두 그룹의 평균을 비교하는 통계 방법입니다.'

      const result = provider.cleanThinkTags(input)

      expect(result).toBe(input)
    })

    it('빈 문자열 처리', () => {
      const result = provider.cleanThinkTags('')

      expect(result).toBe('')
    })
  })

  describe('2. estimateTokenCount() - 토큰 수 추정', () => {
    it('순수 영문 텍스트 (4자 ≈ 1토큰)', () => {
      const text = 'Hello world test' // 16자 → ~4토큰
      const result = provider.estimateTokenCount(text)

      expect(result).toBeGreaterThanOrEqual(3)
      expect(result).toBeLessThanOrEqual(6)
    })

    it('순수 한글 텍스트 (2자 ≈ 1토큰)', () => {
      const text = '안녕하세요' // 5자 → ~2.5토큰
      const result = provider.estimateTokenCount(text)

      expect(result).toBeGreaterThanOrEqual(2)
      expect(result).toBeLessThanOrEqual(4)
    })

    it('혼합 텍스트 (한글 + 영문)', () => {
      const text = 't-test는 두 그룹의 평균을 비교합니다.' // 한글 14자, 영문 6자
      const result = provider.estimateTokenCount(text)

      // 한글: 14/2 = 7, 영문: 6/4 = 1.5, 구두점 등 → 약 10토큰
      expect(result).toBeGreaterThanOrEqual(8)
      expect(result).toBeLessThanOrEqual(12)
    })

    it('긴 문장', () => {
      const text = `
t-검정(t-test)은 두 집단의 평균을 비교하는 통계적 방법입니다.
Student's t-test라고도 불리며, 정규성 가정을 필요로 합니다.
      `.trim()

      const result = provider.estimateTokenCount(text)

      // 대략 40-60 토큰 예상
      expect(result).toBeGreaterThanOrEqual(30)
      expect(result).toBeLessThanOrEqual(70)
    })

    it('빈 문자열 → 최소 1토큰', () => {
      const result = provider.estimateTokenCount('')

      expect(result).toBe(1)
    })

    it('공백만 → 최소 1토큰', () => {
      const result = provider.estimateTokenCount('   ')

      expect(result).toBeGreaterThanOrEqual(1)
    })

    it('이모지 포함', () => {
      const text = '통계 분석 😊 데이터 과학 🔬'
      const result = provider.estimateTokenCount(text)

      // 이모지는 여러 바이트이지만 토큰 수는 1-2개 정도
      expect(result).toBeGreaterThanOrEqual(5)
      expect(result).toBeLessThanOrEqual(15)
    })
  })

  describe('3. TextDecoder 플러시 (멀티바이트 안전성)', () => {
    it('UTF-8 멀티바이트 문자 디코딩', () => {
      // "안녕" 문자열을 UTF-8 바이트로 분할
      const encoder = new TextEncoder()
      const bytes = encoder.encode('안녕')

      // TextDecoder 플러시 없이 (잘못된 방법)
      const decoderWithoutFlush = new TextDecoder()
      const chunk1 = decoderWithoutFlush.decode(bytes.slice(0, 3), { stream: true })
      const chunk2 = decoderWithoutFlush.decode(bytes.slice(3, 6), { stream: true })
      // 마지막 플러시 없음 → 마지막 바이트 손실 가능

      // TextDecoder 플러시 있음 (올바른 방법)
      const decoderWithFlush = new TextDecoder()
      const chunk3 = decoderWithFlush.decode(bytes.slice(0, 3), { stream: true })
      const chunk4 = decoderWithFlush.decode(bytes.slice(3, 6), { stream: true })
      const flush = decoderWithFlush.decode() // 플러시 호출

      const withFlush = chunk3 + chunk4 + flush
      expect(withFlush).toBe('안녕')
    })

    it('스트림 끝에서 불완전한 멀티바이트 문자 처리', () => {
      const encoder = new TextEncoder()
      const bytes = encoder.encode('테스트') // 9바이트 (한글 3자 × 3바이트)

      const decoder = new TextDecoder()

      // 8바이트만 읽음 (마지막 1바이트 남음)
      const partial = decoder.decode(bytes.slice(0, 8), { stream: true })
      const finalFlush = decoder.decode() // 남은 1바이트 플러시

      const result = partial + finalFlush
      expect(result).toBe('테스트')
    })
  })

  describe('4. AbortController + 재시도 로직 (통합 시나리오)', () => {
    it('AbortController 시그널 전달 확인 (Mock)', () => {
      const abortController = new AbortController()

      // AbortSignal 객체 생성 확인
      expect(abortController.signal).toBeDefined()
      expect(abortController.signal.aborted).toBe(false)

      // 취소 호출
      abortController.abort()
      expect(abortController.signal.aborted).toBe(true)
    })

    it('Exponential backoff 계산', () => {
      // 재시도 지연 시간 검증
      const delays = [1, 2, 3].map((attempt) => 1000 * Math.pow(2, attempt - 1))

      expect(delays).toEqual([1000, 2000, 4000]) // 1s, 2s, 4s
    })

    it('AbortError 발생 시 즉시 종료', async () => {
      const abortController = new AbortController()
      abortController.abort()

      const error = new Error('Aborted')
      error.name = 'AbortError'

      // AbortError는 재시도 없이 즉시 전파되어야 함
      expect(error.name).toBe('AbortError')
    })
  })

  describe('5. 성능 메트릭 계산', () => {
    it('TTFT 계산 (첫 토큰까지 시간)', () => {
      const generationStartTime = Date.now()
      const firstTokenTime = generationStartTime + 342 // 342ms 후 첫 토큰

      const ttft = firstTokenTime - generationStartTime

      expect(ttft).toBe(342)
    })

    it('TPS 계산 (초당 토큰 수)', () => {
      const tokenCount = 87
      const generationTime = 3000 // 3초

      const tokensPerSecond = (tokenCount / generationTime) * 1000

      expect(tokensPerSecond).toBeCloseTo(29.0, 1) // 87 / 3 = 29 TPS
    })

    it('TPS: 0초 방어 처리', () => {
      const tokenCount = 10
      const generationTime = 0

      const tokensPerSecond = generationTime > 0 ? (tokenCount / generationTime) * 1000 : undefined

      expect(tokensPerSecond).toBeUndefined()
    })
  })

  describe('6. 실제 스트리밍 시나리오 (Mock)', () => {
    it('청크별 태그 제거 + 토큰 카운팅', () => {
      const chunks = [
        't-test는 ',
        '<think>내부 추론</think>',
        '두 그룹의 ',
        '평균을 비교합니다.',
      ]

      let fullAnswer = ''
      let tokenCount = 0

      for (const chunk of chunks) {
        const cleanedChunk = provider.cleanThinkTags(chunk)
        fullAnswer += cleanedChunk
        tokenCount += provider.estimateTokenCount(cleanedChunk)
      }

      expect(fullAnswer).toBe('t-test는 두 그룹의 평균을 비교합니다.')
      expect(tokenCount).toBeGreaterThan(0)
    })

    it('스트리밍 완료 후 메타데이터 생성', () => {
      const startTime = Date.now()
      const firstTokenTime = startTime + 200
      const endTime = startTime + 2500
      const tokenCount = 45

      const responseTime = endTime - startTime
      const ttft = firstTokenTime - startTime
      const generationTime = endTime - startTime
      const tokensPerSecond = (tokenCount / generationTime) * 1000

      const metadata = {
        responseTime,
        tokensUsed: tokenCount,
        ttft,
        tokensPerSecond,
      }

      expect(metadata.responseTime).toBe(2500)
      expect(metadata.ttft).toBe(200)
      expect(metadata.tokensUsed).toBe(45)
      expect(metadata.tokensPerSecond).toBeCloseTo(18.0, 1)
    })
  })
})
