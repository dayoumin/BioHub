/**
 * 채팅 히스토리 압축 유틸리티
 *
 * 멀티턴 대화에서 오래된 메시지를 축약하여 토큰 예산 내에 유지.
 * - 최근 N턴은 원본 유지
 * - 이전 메시지는 "이전 대화 맥락" 단일 메시지로 압축
 * - 총 입력 토큰 추정으로 한도 초과 시 추가 트리밍
 *
 * LLM 호출 없이 순수 문자열 처리만 수행 (지연/비용 없음).
 */

export interface CompressedHistory {
  /** LLM에 전달할 메시지 배열 (system 제외) */
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  /** 압축 적용 여부 */
  wasCompressed: boolean
  /** 추정 토큰 수 (messages 전체) */
  estimatedTokens: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
}

interface CompressOptions {
  /** 원본 유지할 최근 메시지 수 (기본 4 = 2턴) */
  recentMessageCount?: number
  /** 오래된 메시지당 최대 글자 수 (기본 150) */
  oldMessageMaxChars?: number
  /** messages 전체 추정 토큰 상한 (기본 2000) */
  maxTotalTokens?: number
}

const DEFAULT_RECENT_COUNT = 4
const DEFAULT_OLD_MAX_CHARS = 150
const DEFAULT_MAX_TOKENS = 2000

/**
 * 한국어/영어 혼합 텍스트의 토큰 수 추정
 *
 * 한국어는 글자당 ~1.5~2 토큰, 영어는 ~0.25 토큰.
 * 보수적으로 (한글 글자 × 2 + ASCII 글자 × 0.3) 사용.
 */
export function estimateTokens(text: string): number {
  let koreanChars = 0
  let asciiChars = 0
  for (const ch of text) {
    const code = ch.charCodeAt(0)
    if (code >= 0xAC00 && code <= 0xD7AF) {
      koreanChars++
    } else {
      asciiChars++
    }
  }
  return Math.ceil(koreanChars * 2 + asciiChars * 0.3)
}

/**
 * 텍스트를 maxChars 이내로 자르고 "…" 추가
 */
function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  // 마지막 문장 끝(. ! ? 。) 기준으로 자르기 시도
  const truncated = text.slice(0, maxChars)
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('다.'),
    truncated.lastIndexOf('요.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  )
  const cutPoint = lastSentenceEnd > maxChars * 0.5 ? lastSentenceEnd + 1 : maxChars
  return text.slice(0, cutPoint).trimEnd() + '…'
}

/**
 * 채팅 히스토리를 압축하여 토큰 예산 내로 맞춤
 *
 * @param chatHistory - 전체 대화 히스토리
 * @param options - 압축 설정
 * @returns 압축된 메시지 배열 + 메타데이터
 *
 * @example
 * ```ts
 * const { messages } = compressChatHistory(fullHistory)
 * // → [{ role:'user', content:'[이전 대화 맥락]\n...' }, ...recent4]
 * ```
 */
export function compressChatHistory(
  chatHistory: ChatMessage[],
  options?: CompressOptions
): CompressedHistory {
  const recentCount = options?.recentMessageCount ?? DEFAULT_RECENT_COUNT
  const oldMaxChars = options?.oldMessageMaxChars ?? DEFAULT_OLD_MAX_CHARS
  const maxTokens = options?.maxTotalTokens ?? DEFAULT_MAX_TOKENS

  // 1. 에러 메시지 제외
  const valid = chatHistory.filter(m => !m.isError)

  // 2. 최근 N개 이하면 압축 불필요
  if (valid.length <= recentCount) {
    const messages = valid.map(m => ({ role: m.role, content: m.content }))
    return {
      messages,
      wasCompressed: false,
      estimatedTokens: messages.reduce((sum, m) => sum + estimateTokens(m.content), 0),
    }
  }

  // 3. 오래된 / 최근 분리
  const oldMessages = valid.slice(0, -recentCount)
  const recentMessages = valid.slice(-recentCount)

  // 4. 오래된 메시지 축약
  const summaryLines = oldMessages.map(m => {
    const prefix = m.role === 'user' ? '사용자' : 'AI'
    const truncated = truncateText(m.content, oldMaxChars)
    return `- ${prefix}: ${truncated}`
  })
  const summaryContent = `[이전 대화 맥락 (${oldMessages.length}개 메시지 요약)]\n${summaryLines.join('\n')}`

  // 5. 결합
  const result: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: summaryContent },
    ...recentMessages.map(m => ({ role: m.role, content: m.content })),
  ]

  // 6. 토큰 추정 및 초과 시 요약 트리밍
  const recentTokens = recentMessages.reduce(
    (sum, m) => sum + estimateTokens(m.content), 0
  )
  const summaryTokens = estimateTokens(summaryContent)
  let totalTokens = summaryTokens + recentTokens

  if (totalTokens > maxTokens) {
    const availableForSummary = maxTokens - recentTokens
    if (availableForSummary > 100) {
      // 토큰→글자 역산 (한국어 기준 토큰당 ~0.5글자)
      const maxChars = Math.floor(availableForSummary * 0.5)
      result[0] = {
        role: 'user',
        content: truncateText(summaryContent, maxChars),
      }
    } else {
      // 요약 자체도 넣을 공간이 없으면 제거
      result.shift()
    }
    totalTokens = result.reduce((sum, m) => sum + estimateTokens(m.content), 0)
  }

  return {
    messages: result,
    wasCompressed: true,
    estimatedTokens: totalTokens,
  }
}
