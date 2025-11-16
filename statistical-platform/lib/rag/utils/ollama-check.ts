/**
 * Ollama 연결 및 모델 확인 유틸리티
 */

export interface OllamaStatus {
  isAvailable: boolean
  hasEmbeddingModel: boolean
  hasInferenceModel: boolean
  endpoint: string
  error?: string
}

/**
 * Ollama 서버 연결 및 모델 설치 확인
 */
export async function checkOllamaStatus(endpoint: string = 'http://localhost:11434'): Promise<OllamaStatus> {
  const status: OllamaStatus = {
    isAvailable: false,
    hasEmbeddingModel: false,
    hasInferenceModel: false,
    endpoint,
  }

  try {
    // 1. Ollama 서버 연결 확인
    const response = await fetch(`${endpoint}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
    })

    if (!response.ok) {
      status.error = `Ollama 서버 응답 에러: ${response.status}`
      return status
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> }

    if (!data.models || data.models.length === 0) {
      status.isAvailable = true
      status.error = '설치된 모델이 없습니다'
      return status
    }

    status.isAvailable = true

    // 2. 임베딩 모델 확인 (qwen3-embedding, nomic-embed-text, mxbai-embed-large)
    const embeddingModels = ['qwen3-embedding', 'nomic-embed-text', 'mxbai-embed-large', 'all-minilm']
    status.hasEmbeddingModel = data.models.some((m) =>
      embeddingModels.some((em) => m.name.toLowerCase().includes(em))
    )

    // 3. 추론 모델 확인 (qwen, gemma, mistral, llama)
    const inferenceModels = ['qwen', 'gemma', 'mistral', 'llama', 'neural-chat']
    status.hasInferenceModel = data.models.some((m) =>
      inferenceModels.some((im) => m.name.toLowerCase().includes(im))
    )

    return status
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Ollama 연결 실패'
    return status
  }
}
