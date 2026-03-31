import { describe, it, expect } from 'vitest'
import {
  compressChatHistory,
  estimateTokens,
} from '@/lib/services/ai/chat-history-compressor'

describe('estimateTokens', () => {
  it('한국어 텍스트는 글자당 약 2토큰으로 추정', () => {
    const korean = '안녕하세요 반갑습니다'
    const tokens = estimateTokens(korean)
    // 한글 9글자 × 2 + 공백 1 × 0.3 = 18.3 → 19
    expect(tokens).toBeGreaterThanOrEqual(15)
    expect(tokens).toBeLessThanOrEqual(25)
  })

  it('영어 텍스트는 글자당 약 0.3토큰으로 추정', () => {
    const english = 'Hello world this is a test'
    const tokens = estimateTokens(english)
    // 26글자 × 0.3 = 7.8 → 8
    expect(tokens).toBeGreaterThanOrEqual(5)
    expect(tokens).toBeLessThanOrEqual(15)
  })

  it('빈 문자열은 0 토큰', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('compressChatHistory', () => {
  const makeMsg = (role: 'user' | 'assistant', content: string) => ({
    role,
    content,
  })

  it('4개 이하 메시지는 압축하지 않음', () => {
    const history = [
      makeMsg('user', '첫 질문'),
      makeMsg('assistant', '첫 답변'),
      makeMsg('user', '두번째 질문'),
      makeMsg('assistant', '두번째 답변'),
    ]

    const result = compressChatHistory(history)

    expect(result.wasCompressed).toBe(false)
    expect(result.messages).toHaveLength(4)
    expect(result.messages[0].content).toBe('첫 질문')
    expect(result.messages[3].content).toBe('두번째 답변')
  })

  it('5개 이상 메시지는 이전 메시지를 축약', () => {
    const history = [
      makeMsg('user', '오래된 질문 1'),
      makeMsg('assistant', '오래된 답변 1'),
      makeMsg('user', '최근 질문 1'),
      makeMsg('assistant', '최근 답변 1'),
      makeMsg('user', '최근 질문 2'),
      makeMsg('assistant', '최근 답변 2'),
    ]

    const result = compressChatHistory(history)

    expect(result.wasCompressed).toBe(true)
    // 축약 1개 + 최근 4개 = 5개
    expect(result.messages).toHaveLength(5)
    // 첫 메시지가 축약본
    expect(result.messages[0].content).toContain('[이전 대화 맥락')
    expect(result.messages[0].content).toContain('2개 메시지 요약')
    expect(result.messages[0].content).toContain('오래된 질문 1')
    expect(result.messages[0].content).toContain('오래된 답변 1')
    // 최근 4개는 원본 유지
    expect(result.messages[1].content).toBe('최근 질문 1')
    expect(result.messages[4].content).toBe('최근 답변 2')
  })

  it('에러 메시지는 제외', () => {
    const history = [
      makeMsg('user', '질문'),
      { role: 'assistant' as const, content: '에러 발생', isError: true },
      makeMsg('user', '재질문'),
      makeMsg('assistant', '정상 답변'),
    ]

    const result = compressChatHistory(history)

    expect(result.wasCompressed).toBe(false)
    expect(result.messages).toHaveLength(3)
    expect(result.messages.every(m => m.content !== '에러 발생')).toBe(true)
  })

  it('긴 오래된 메시지는 150자로 잘림', () => {
    const longText = '가'.repeat(300)
    const history = [
      makeMsg('user', longText),
      makeMsg('assistant', '오래된 답변'),
      makeMsg('user', '최근 1'),
      makeMsg('assistant', '최근 2'),
      makeMsg('user', '최근 3'),
      makeMsg('assistant', '최근 4'),
    ]

    const result = compressChatHistory(history)

    expect(result.wasCompressed).toBe(true)
    // 축약된 첫 메시지에서 원본 300자가 잘려 있어야 함
    const summaryMsg = result.messages[0].content
    expect(summaryMsg.length).toBeLessThan(longText.length)
    expect(summaryMsg).toContain('…')
  })

  it('recentMessageCount 옵션으로 유지 개수 조절', () => {
    const history = [
      makeMsg('user', 'Q1'),
      makeMsg('assistant', 'A1'),
      makeMsg('user', 'Q2'),
      makeMsg('assistant', 'A2'),
      makeMsg('user', 'Q3'),
      makeMsg('assistant', 'A3'),
    ]

    const result = compressChatHistory(history, { recentMessageCount: 2 })

    expect(result.wasCompressed).toBe(true)
    // 축약 1개 + 최근 2개 = 3개
    expect(result.messages).toHaveLength(3)
    expect(result.messages[0].content).toContain('4개 메시지 요약')
    expect(result.messages[1].content).toBe('Q3')
    expect(result.messages[2].content).toBe('A3')
  })

  it('빈 히스토리는 빈 배열 반환', () => {
    const result = compressChatHistory([])

    expect(result.wasCompressed).toBe(false)
    expect(result.messages).toHaveLength(0)
    expect(result.estimatedTokens).toBe(0)
  })

  it('8턴(16메시지) 대화도 정상 압축', () => {
    const history = Array.from({ length: 16 }, (_, i) =>
      makeMsg(i % 2 === 0 ? 'user' : 'assistant', `메시지 ${i + 1}: ${'내용'.repeat(20)}`)
    )

    const result = compressChatHistory(history)

    expect(result.wasCompressed).toBe(true)
    // 축약 1개 + 최근 4개 = 5개
    expect(result.messages).toHaveLength(5)
    expect(result.messages[0].content).toContain('12개 메시지 요약')
    // 최근 4개는 원본
    expect(result.messages[1].content).toContain('메시지 13')
    expect(result.messages[4].content).toContain('메시지 16')
  })
})
