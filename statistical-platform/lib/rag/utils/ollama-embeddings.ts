/**
 * Ollama 임베딩 유틸리티
 *
 * OllamaProvider의 private generateEmbedding을 공용 함수로 추출.
 * /api/embed (현행 API) 사용 — deprecated /api/embeddings 아님.
 *
 * 특징:
 * - /api/embed: L2 정규화, 배치 지원, auto truncation
 * - 단일 텍스트 + 배치 텍스트 함수 분리
 * - AbortSignal 지원 (벡터스토어 생성 취소용)
 */

/** /api/embed 응답 타입 */
interface OllamaEmbedResponse {
  model: string
  embeddings: number[][]
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
}

/**
 * 단일 텍스트 임베딩 생성
 *
 * @param endpoint - Ollama 서버 URL (예: 'http://localhost:11434')
 * @param model - 임베딩 모델명 (예: 'nomic-embed-text')
 * @param text - 임베딩할 텍스트
 * @param signal - 취소용 AbortSignal (선택)
 * @returns 임베딩 벡터 (float32[], L2 정규화됨)
 */
export async function generateEmbeddingViaOllama(
  endpoint: string,
  model: string,
  text: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const result = await generateBatchEmbeddingsViaOllama(
    endpoint,
    model,
    [text],
    signal,
  )
  return result[0]
}

/**
 * 배치 임베딩 생성
 *
 * /api/embed의 배열 입력을 활용하여 여러 텍스트를 한 번에 임베딩.
 * 벡터스토어 생성 시 청크 단위 배치 처리에 사용.
 *
 * @param endpoint - Ollama 서버 URL
 * @param model - 임베딩 모델명
 * @param texts - 임베딩할 텍스트 배열
 * @param signal - 취소용 AbortSignal (선택)
 * @returns 임베딩 벡터 배열 (각 벡터는 float32[], L2 정규화됨)
 * @throws Error - API 호출 실패, 빈 응답, 또는 취소 시
 */
export async function generateBatchEmbeddingsViaOllama(
  endpoint: string,
  model: string,
  texts: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  try {
    const response = await fetch(`${endpoint}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: texts,
      }),
      signal,
    })

    if (!response.ok) {
      let errorDetail = response.statusText
      try {
        const errorData = (await response.json()) as Record<string, unknown>
        errorDetail =
          (typeof errorData.error === 'string' ? errorData.error : undefined) ??
          (typeof errorData.message === 'string' ? errorData.message : undefined) ??
          response.statusText
      } catch {
        // JSON 파싱 실패 시 statusText 사용
      }

      console.error('[OllamaEmbeddings] 임베딩 생성 실패:', {
        status: response.status,
        errorDetail,
        model,
        textCount: texts.length,
      })

      throw new Error(`임베딩 생성 실패 (${response.status}): ${errorDetail}`)
    }

    const data = (await response.json()) as OllamaEmbedResponse

    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('임베딩 응답 형식이 올바르지 않습니다 (embeddings 필드 없음)')
    }

    if (data.embeddings.length !== texts.length) {
      throw new Error(
        `임베딩 수 불일치: 요청 ${texts.length}개, 응답 ${data.embeddings.length}개`,
      )
    }

    return data.embeddings
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('임베딩 생성이 취소되었습니다')
    }
    if (error instanceof Error) {
      throw error
    }
    throw new Error('임베딩 생성 중 알 수 없는 오류 발생')
  }
}

/**
 * 대량 텍스트를 배치 단위로 나누어 임베딩 생성
 *
 * 한 번의 /api/embed 호출에 너무 많은 텍스트를 보내면 메모리 문제 발생 가능.
 * batchSize 단위로 나누어 순차 호출하고, 진행률 콜백을 제공.
 *
 * @param endpoint - Ollama 서버 URL
 * @param model - 임베딩 모델명
 * @param texts - 임베딩할 전체 텍스트 배열
 * @param options - 배치 크기, 취소 시그널, 진행률 콜백
 * @returns 전체 임베딩 벡터 배열
 */
export async function generateChunkedBatchEmbeddings(
  endpoint: string,
  model: string,
  texts: string[],
  options?: {
    batchSize?: number
    signal?: AbortSignal
    onProgress?: (completed: number, total: number) => void
  },
): Promise<number[][]> {
  const batchSize = options?.batchSize ?? 32
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    if (options?.signal?.aborted) {
      throw new Error('임베딩 생성이 취소되었습니다')
    }

    const batch = texts.slice(i, i + batchSize)
    const embeddings = await generateBatchEmbeddingsViaOllama(
      endpoint,
      model,
      batch,
      options?.signal,
    )

    allEmbeddings.push(...embeddings)
    options?.onProgress?.(allEmbeddings.length, texts.length)
  }

  return allEmbeddings
}
