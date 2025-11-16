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

    // 2. 임베딩 모델 확인 (embedding, embed가 포함된 모델)
    const embeddingKeywords = ['embedding', 'embed']
    status.hasEmbeddingModel = data.models.some((m) =>
      embeddingKeywords.some((keyword) => m.name.toLowerCase().includes(keyword))
    )

    // 3. 추론 모델 확인 (임베딩 모델 제외)
    const inferenceModels = ['qwen', 'gemma', 'mistral', 'llama', 'neural-chat']
    status.hasInferenceModel = data.models.some((m) => {
      const modelName = m.name.toLowerCase()
      // 임베딩 모델이 아니면서 추론 모델 키워드를 포함하는 경우
      const isEmbedding = embeddingKeywords.some((keyword) => modelName.includes(keyword))
      const isInference = inferenceModels.some((im) => modelName.includes(im))
      return !isEmbedding && isInference
    })

    return status
  } catch (err) {
    status.error = err instanceof Error ? err.message : 'Ollama 연결 실패'
    return status
  }
}
