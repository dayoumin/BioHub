/**
 * 추천 모델 상수
 *
 * ModelPullPanel에서 사용자에게 보여줄 추천 모델 목록.
 * Ollama 모델 라이브러리에서 통계 분석 RAG 용도에 적합한 모델들을 선별.
 *
 * category:
 *   - 'embedding': 벡터 임베딩 전용 (벡터스토어 생성)
 *   - 'inference': 추론/생성 전용 (RAG 답변 생성)
 */

export interface RecommendedModel {
  /** Ollama pull 이름 (예: 'nomic-embed-text') */
  name: string
  /** UI 표시용 한줄 설명 */
  description: string
  /** 모델 파라미터 크기 (예: '137M', '7B') */
  parameterSize: string
  /** 모델 카테고리 */
  category: 'embedding' | 'inference'
  /** 최소 VRAM 요구량 (GB) — 근사치 */
  minVram: number
}

/**
 * 추천 임베딩 모델
 *
 * 벡터스토어 생성 시 텍스트를 벡터로 변환하는 데 사용.
 * 모두 /api/embed 호출로 동작하며, L2 정규화 벡터 반환.
 */
export const RECOMMENDED_EMBEDDING_MODELS: RecommendedModel[] = [
  {
    name: 'nomic-embed-text',
    description: '경량 고성능 임베딩 (MTEB 상위, 가장 권장)',
    parameterSize: '137M',
    category: 'embedding',
    minVram: 1,
  },
  {
    name: 'mxbai-embed-large',
    description: '고정밀 임베딩 (MTEB 상위, 1024차원)',
    parameterSize: '335M',
    category: 'embedding',
    minVram: 1,
  },
  {
    name: 'snowflake-arctic-embed:335m',
    description: 'Snowflake Arctic 임베딩 (다국어 지원)',
    parameterSize: '335M',
    category: 'embedding',
    minVram: 1,
  },
  {
    name: 'all-minilm',
    description: '초경량 임베딩 (빠른 속도, 384차원)',
    parameterSize: '23M',
    category: 'embedding',
    minVram: 1,
  },
  {
    name: 'bge-m3',
    description: '다국어 임베딩 (한국어 우수, 1024차원)',
    parameterSize: '567M',
    category: 'embedding',
    minVram: 2,
  },
]

/**
 * 추천 추론 모델
 *
 * RAG 검색 결과를 바탕으로 답변을 생성하는 데 사용.
 * VRAM 기준 오름차순 정렬.
 */
export const RECOMMENDED_INFERENCE_MODELS: RecommendedModel[] = [
  {
    name: 'llama3.2:3b',
    description: 'Meta Llama 3.2 3B (경량, 효율적)',
    parameterSize: '3B',
    category: 'inference',
    minVram: 3,
  },
  {
    name: 'gemma3:4b',
    description: 'Google Gemma 3 4B (경량, 빠른 응답)',
    parameterSize: '4B',
    category: 'inference',
    minVram: 4,
  },
  {
    name: 'qwen3:8b',
    description: 'Alibaba Qwen 3 8B (다국어, 한국어 우수)',
    parameterSize: '8B',
    category: 'inference',
    minVram: 6,
  },
  {
    name: 'llama3.1:8b',
    description: 'Meta Llama 3.1 8B (범용, 안정적)',
    parameterSize: '8B',
    category: 'inference',
    minVram: 6,
  },
  {
    name: 'deepseek-r1:8b',
    description: 'DeepSeek R1 8B (추론 특화)',
    parameterSize: '8B',
    category: 'inference',
    minVram: 6,
  },
  {
    name: 'exaone3.5:7.8b',
    description: 'LG EXAONE 3.5 7.8B (한국어 특화)',
    parameterSize: '7.8B',
    category: 'inference',
    minVram: 6,
  },
  {
    name: 'gemma3:12b',
    description: 'Google Gemma 3 12B (균형잡힌 성능)',
    parameterSize: '12B',
    category: 'inference',
    minVram: 8,
  },
]

/** 전체 추천 모델 (임베딩 + 추론) */
export const ALL_RECOMMENDED_MODELS: RecommendedModel[] = [
  ...RECOMMENDED_EMBEDDING_MODELS,
  ...RECOMMENDED_INFERENCE_MODELS,
]
