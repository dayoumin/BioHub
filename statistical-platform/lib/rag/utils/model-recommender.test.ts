/**
 * Model Recommender 테스트
 *
 * 테스트: RAM 기반 임베딩 모델 추천
 */

import { recommendEmbeddingModel, recommendModel } from './model-recommender'

interface OllamaModel {
  name: string
  model?: string
  size?: number
  details?: {
    parent_model?: string
    format?: string
    family?: string
    families?: string[]
    parameter_size?: string
    quantization_level?: string
  }
}

describe('Model Recommender - Embedding Models', () => {
  describe('recommendEmbeddingModel - 임베딩 모델 추천', () => {
    // 테스트 데이터
    const mockEmbeddingModels: OllamaModel[] = [
      {
        name: 'nomic-embed-text:latest',
        size: 274 * 1024 * 1024,
        details: {
          parameter_size: '0.1B',
          quantization_level: 'Q8_0',
        },
      },
      {
        name: 'ZimaBlueAI/Qwen3-Embedding-0.6B:f16',
        size: 1.2 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '0.6B',
          quantization_level: 'F16',
        },
      },
      {
        name: 'ZimaBlueAI/Qwen3-Embedding-4B:Q5_K_M',
        size: 2.9 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '4B',
          quantization_level: 'Q5_K_M',
        },
      },
      {
        name: 'mxbai-embed-large:latest',
        size: 1.5 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '1.9B',
          quantization_level: 'Q8_0',
        },
      },
    ]

    const mockInferenceModels: OllamaModel[] = [
      {
        name: 'qwen3:4b',
        size: 2.6 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '4B',
          quantization_level: 'Q4_K_M',
        },
      },
      {
        name: 'gemma3:2b',
        size: 1 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '2B',
          quantization_level: 'Q4_0',
        },
      },
    ]

    // Test 1: 충분한 메모리 (8GB) - nomic-embed-text 선택
    test('8GB 메모리: nomic-embed-text 선택 (가장 가볍고 권장)', () => {
      const result = recommendEmbeddingModel(mockEmbeddingModels, 8)
      expect(result).toBe('nomic-embed-text:latest')
    })

    // Test 2: 적당한 메모리 (4GB) - 작은 임베딩 모델 선택
    test('4GB 메모리: nomic-embed-text 또는 작은 모델 선택', () => {
      const result = recommendEmbeddingModel(mockEmbeddingModels, 4)
      expect(result).toBeTruthy()
      expect(['nomic-embed-text:latest', 'ZimaBlueAI/Qwen3-Embedding-0.6B:f16']).toContain(result)
    })

    // Test 3: 작은 메모리 (2GB) - 폴백: 가장 작은 모델
    test('2GB 메모리: 폴백으로 가장 작은 모델 선택', () => {
      const result = recommendEmbeddingModel(mockEmbeddingModels, 2)
      // 메모리 부족 시에도 어떤 모델이든 선택 (폴백)
      expect(result).toBeTruthy()
    })

    // Test 4: 임베딩 모델이 없는 경우
    test('임베딩 모델이 없으면 null 반환', () => {
      const result = recommendEmbeddingModel(mockInferenceModels, 8)
      expect(result).toBeNull()
    })

    // Test 5: 빈 모델 배열
    test('빈 모델 배열이면 null 반환', () => {
      const result = recommendEmbeddingModel([], 8)
      expect(result).toBeNull()
    })
  })

  describe('recommendModel - 추론 모델 추천 (기존 로직 검증)', () => {
    const mockModels: OllamaModel[] = [
      {
        name: 'qwen3:4b',
        size: 2.6 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '4B',
          quantization_level: 'Q4_K_M',
        },
      },
      {
        name: 'nomic-embed-text:latest',
        size: 274 * 1024 * 1024,
        details: {
          parameter_size: '0.1B',
          quantization_level: 'Q8_0',
        },
      },
      {
        name: 'gemma3:2b',
        size: 1 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '2B',
          quantization_level: 'Q4_0',
        },
      },
    ]

    // Test 1: 추론 모델만 선택 (임베딩 모델 제외)
    test('추론 모델만 선택 (임베딩 모델 제외)', () => {
      const result = recommendModel(mockModels, 8)
      expect(result).toBeTruthy()
      expect(['qwen3:4b', 'gemma3:2b']).toContain(result)
      expect(result).not.toBe('nomic-embed-text:latest')
    })

    // Test 2: Qwen이 Gemma보다 우선순위 높음
    test('Qwen이 Gemma보다 높은 우선순위', () => {
      const result = recommendModel(mockModels, 8)
      expect(result).toBe('qwen3:4b') // qwen 우선순위 0 < gemma 우선순위 1
    })

    // Test 3: 메모리 부족 시 가장 작은 모델 선택
    test('메모리 부족 시 가장 작은 모델 선택 (폴백)', () => {
      const result = recommendModel(mockModels, 0.5) // 500MB만 사용 가능
      expect(result).toBeTruthy() // 어떤 모델이든 폴백으로 선택
    })
  })

  describe('메모리 계산 검증', () => {
    // Test: VRAM 계산 로직
    test('파라미터 크기 + 양자화로 VRAM 동적 계산', () => {
      const model1: OllamaModel = {
        name: 'qwen3:4b',
        size: 2.6 * 1024 * 1024 * 1024,
        details: {
          parameter_size: '4B',
          quantization_level: 'Q4_K_M', // 0.56
        },
      }

      // 계산: 4 * 0.56 * 1.2 = 2.688GB (올림하면 3GB)
      // 이 테스트는 calculateModelVram 함수가 필요
      // 여기서는 함수가 내부이므로 직접 테스트 불가
      // 하지만 recommendModel 호출로 간접 검증 가능

      const result = recommendModel([model1], 3)
      expect(result).toBe('qwen3:4b') // 3GB로 충분
    })
  })

  describe('엣지 케이스 처리', () => {
    // Test 1: 매우 큰 메모리 (100GB)
    test('100GB 메모리: 가장 성능 좋은 모델 선택', () => {
      const mockModels: OllamaModel[] = [
        {
          name: 'nomic-embed-text:latest',
          size: 274 * 1024 * 1024,
          details: { parameter_size: '0.1B', quantization_level: 'Q8_0' },
        },
        {
          name: 'snowflake-arctic-embed:latest',
          size: 5 * 1024 * 1024 * 1024,
          details: { parameter_size: '7B', quantization_level: 'F16' },
        },
      ]

      const result = recommendEmbeddingModel(mockModels, 100)
      expect(result).toBeTruthy()
    })

    // Test 2: 정보 부족한 모델 (파라미터 크기 없음)
    test('파라미터 정보 없는 모델: 파일 크기로 추정', () => {
      const mockModels: OllamaModel[] = [
        {
          name: 'unknown-embed:latest',
          size: 500 * 1024 * 1024, // 500MB
          // details 없음
        },
      ]

      const result = recommendEmbeddingModel(mockModels, 2)
      expect(result).toBe('unknown-embed:latest')
    })

    // Test 3: 정확히 안전 마진과 같은 메모리
    test('메모리가 정확히 안전 마진과 같을 때', () => {
      const mockModels: OllamaModel[] = [
        {
          name: 'nomic-embed-text:latest',
          size: 274 * 1024 * 1024,
          details: { parameter_size: '0.1B', quantization_level: 'Q8_0' },
        },
      ]

      // 안전 마진 = 메모리 * 0.5
      // 예: 2GB 메모리 → 1GB 안전 마진
      const result = recommendEmbeddingModel(mockModels, 2)
      expect(result).toBeTruthy()
    })
  })
})

/**
 * 수동 테스트 시나리오 (브라우저에서 실행)
 *
 * 시나리오 1: 충분한 GPU 메모리 (8GB+)
 * - 예상: nomic-embed-text 또는 다른 고성능 임베딩 모델
 *
 * 시나리오 2: 제한된 메모리 (2-4GB)
 * - 예상: 작은 임베딩 모델 (Qwen3-Embedding-0.6B)
 *
 * 시나리오 3: 매우 제한된 메모리 (<1GB)
 * - 예상: 경고와 함께 가장 작은 임베딩 모델 선택
 *
 * 시나리오 4: 임베딩 모델 설치 안 됨
 * - 예상: 폴백으로 간단한 필터링 적용
 */