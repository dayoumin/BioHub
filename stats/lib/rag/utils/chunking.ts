/**
 * 문서 청킹 유틸리티
 *
 * 긴 문서를 임베딩 모델의 토큰 제한에 맞게 분할합니다.
 * - 토큰 기반 분할 (단어 수 기준 근사)
 * - 오버랩 지원 (문맥 유지)
 * - 문장 경계 보존
 */

export interface ChunkOptions {
  /** 청크당 최대 토큰 수 (기본: 500) */
  maxTokens: number
  /** 청크 간 겹침 토큰 수 (기본: 50) */
  overlapTokens: number
  /** 문장 경계 보존 여부 (기본: true) */
  preserveBoundaries: boolean
}

const DEFAULT_OPTIONS: ChunkOptions = {
  maxTokens: 500,
  overlapTokens: 50,
  preserveBoundaries: true
}

/**
 * 텍스트를 토큰 수로 추정 (단어 수 × 1.3 근사치)
 *
 * 실제 토큰은 BPE 토크나이저로 계산해야 하지만,
 * 브라우저에서는 무거우므로 단어 기반 근사 사용.
 */
export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  return Math.ceil(words.length * 1.3)
}

/**
 * 문장 경계에서 텍스트 분할
 *
 * ., !, ? 등의 문장 부호를 기준으로 분할하되,
 * Dr., Mr. 등의 약어는 보존합니다.
 */
function splitIntoSentences(text: string): string[] {
  // 약어 패턴 (Dr., Mr., vs., etc.)
  const abbreviations = /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|vs|etc|e\.g|i\.e)\./gi

  // 약어를 임시 플레이스홀더로 대체
  const placeholders: string[] = []
  const textWithPlaceholders = text.replace(abbreviations, (match) => {
    const placeholder = `__ABBR_${placeholders.length}__`
    placeholders.push(match)
    return placeholder
  })

  // 문장 부호로 분할 (., !, ?, \n\n)
  // 캡처 그룹으로 구분자도 포함하여 분할
  const parts = textWithPlaceholders.split(/([.!?]\s+|\n\n+)/g)

  // 문장과 구분자를 다시 결합
  const sentences: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const sentence = parts[i]
    const separator = parts[i + 1] || ''

    if (sentence.trim().length > 0) {
      // 문장 + 구분자를 하나로 결합
      sentences.push((sentence + separator).trim())
    }
  }

  // 플레이스홀더 복원
  return sentences.map(s => {
    let restored = s
    placeholders.forEach((abbr, i) => {
      restored = restored.replace(`__ABBR_${i}__`, abbr)
    })
    return restored
  })
}

/**
 * 문서를 청크로 분할
 *
 * @param content 전체 문서 내용
 * @param options 청킹 옵션
 * @returns 청크 배열
 *
 * @example
 * ```typescript
 * const chunks = chunkDocument(longText, { maxTokens: 500, overlapTokens: 50 })
 * console.log(`${chunks.length}개 청크 생성됨`)
 * ```
 */
export function chunkDocument(
  content: string,
  options: Partial<ChunkOptions> = {}
): string[] {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 빈 문서 처리
  if (!content || content.trim().length === 0) {
    return []
  }

  const totalTokens = estimateTokens(content)

  // 짧은 문서는 그대로 반환
  if (totalTokens <= opts.maxTokens) {
    return [content]
  }

  // 문장 경계 보존 모드
  if (opts.preserveBoundaries) {
    return chunkBySentences(content, opts)
  } else {
    // 단순 단어 기반 청킹
    return chunkByWords(content, opts)
  }
}

/**
 * 문장 단위 청킹 (경계 보존)
 */
function chunkBySentences(content: string, opts: ChunkOptions): string[] {
  const sentences = splitIntoSentences(content)
  const chunks: string[] = []

  let currentChunk: string[] = []
  let currentTokens = 0

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)

    // 단일 문장이 maxTokens 초과 시 강제로 단어 기반 분할
    if (sentenceTokens > opts.maxTokens) {
      // 현재 청크 저장
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '))
      }

      // 긴 문장을 단어 기반으로 분할
      const sentenceChunks = chunkByWords(sentence, opts)
      chunks.push(...sentenceChunks)

      // 새 청크 시작 (오버랩 포함)
      currentChunk = []
      currentTokens = 0
      continue
    }

    // 현재 청크에 추가 가능한 경우
    if (currentTokens + sentenceTokens <= opts.maxTokens) {
      currentChunk.push(sentence)
      currentTokens += sentenceTokens
    } else {
      // 현재 청크 저장
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '))
      }

      // 새 청크 시작 (오버랩 포함)
      const overlapSentences = getOverlapSentences(currentChunk, opts.overlapTokens)
      currentChunk = [...overlapSentences, sentence]
      currentTokens = estimateTokens(currentChunk.join(' '))
    }
  }

  // 마지막 청크 저장
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  return chunks
}

/**
 * 오버랩을 위한 이전 청크의 마지막 문장들 선택
 */
function getOverlapSentences(sentences: string[], targetTokens: number): string[] {
  const overlap: string[] = []
  let tokens = 0

  // 뒤에서부터 추가
  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentenceTokens = estimateTokens(sentences[i])

    if (tokens + sentenceTokens <= targetTokens) {
      overlap.unshift(sentences[i])
      tokens += sentenceTokens
    } else {
      break
    }
  }

  return overlap
}

/**
 * 단어 단위 청킹 (단순 분할)
 */
function chunkByWords(content: string, opts: ChunkOptions): string[] {
  const words = content.split(/\s+/).filter(w => w.length > 0)
  const chunks: string[] = []

  const wordsPerChunk = Math.floor(opts.maxTokens / 1.3) // 토큰 → 단어 수 변환
  const overlapWords = Math.floor(opts.overlapTokens / 1.3)
  const stepSize = Math.max(1, wordsPerChunk - overlapWords) // 최소 1

  let i = 0
  while (i < words.length) {
    const chunkWords = words.slice(i, i + wordsPerChunk)
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(' '))
    }
    i += stepSize // 오버랩 고려

    // 마지막 청크 처리
    if (i >= words.length) {
      break
    }
  }

  return chunks
}

/**
 * 청크 메타데이터 생성
 *
 * 디버깅 및 로깅용
 */
export interface ChunkMetadata {
  index: number
  text: string
  tokens: number
  charCount: number
}

export function createChunkMetadata(chunks: string[]): ChunkMetadata[] {
  return chunks.map((text, index) => ({
    index,
    text,
    tokens: estimateTokens(text),
    charCount: text.length
  }))
}
