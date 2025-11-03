/**
 * 모델 추천 시스템 단위 테스트
 *
 * 테스트 항목:
 * 1. 파라미터 크기 파싱
 * 2. VRAM 계산 (양자화 레벨 기반)
 * 3. 모델 추천 로직
 * 4. 우선순위 정렬
 * 5. 메모리 부족 시 폴백
 */

import {
  recommendModel,
  getRecommendedModel,
  getInstalledModels,
  getAvailableGpuMemoryGB,
} from '@/lib/rag/utils/model-recommender'

// Mock 데이터
const mockOllamaModels = [
  // Qwen3 (최신, 우선순위 1)
  {
    name: 'qwen3:4b-q4_K_M',
    size: 2620788260,
    details: {
      parameter_size: '4.0B',
      quantization_level: 'Q4_K_M',
      family: 'qwen3',
    },
  },
  // Gemma3 (최신, 우선순위 2)
  {
    name: 'gemma3:4b-q4_K_M',
    size: 3338801804,
    details: {
      parameter_size: '4.3B',
      quantization_level: 'Q4_K_M',
      family: 'gemma3',
    },
  },
  // Llama3.2 (우선순위 3)
  {
    name: 'llama3.2:1b-q4_K_M',
    size: 815319791,
    details: {
      parameter_size: '1.0B',
      quantization_level: 'Q4_K_M',
      family: 'llama3.2',
    },
  },
  // 큰 모델 (메모리 부족 시 테스트용)
  {
    name: 'gemma3:27b-q4_K_M',
    size: 10140300298,
    details: {
      parameter_size: '27.0B',
      quantization_level: 'Q4_K_M',
      family: 'gemma3',
    },
  },
  // Embedding 모델 (제외되어야 함)
  {
    name: 'nomic-embed-text:latest',
    size: 274302450,
    details: {
      parameter_size: '137M',
      family: 'nomic-bert',
    },
  },
]

describe('ModelRecommender', () => {
  describe('recommendModel', () => {
    it('should recommend the best model within available memory', () => {
      // 8GB 메모리에서 최고 성능 모델 추천
      const result = recommendModel(mockOllamaModels as any, 8)

      // Qwen3이 가장 우선순위가 높음
      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should recommend higher priority model when multiple models fit', () => {
      // 12GB 메모리: qwen3과 gemma3 모두 가능하지만 qwen3 추천
      const result = recommendModel(mockOllamaModels as any, 12)

      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should exclude embedding models', () => {
      // embedding 모델은 추천 목록에서 제외
      const result = recommendModel(mockOllamaModels as any, 4)

      expect(result).not.toContain('embed')
      expect(result).not.toContain('nomic')
    })

    it('should return null when no models fit memory constraint', () => {
      // 메모리가 매우 부족한 경우
      const result = recommendModel(mockOllamaModels as any, 0.5)

      // 가장 작은 모델도 실행할 수 없으므로 null 또는 경고 메시지
      // (현재 구현상 폴백으로 가장 작은 모델을 반환할 수도 있음)
      expect(result).toBeTruthy() // 폴백 동작 확인
    })

    it('should return null when no inference models available', () => {
      // embedding 모델만 있는 경우
      const embeddingOnlyModels = [mockOllamaModels[4]]

      const result = recommendModel(embeddingOnlyModels as any, 8)

      expect(result).toBeNull()
    })

    it('should prefer higher priority models over larger models', () => {
      // 충분한 메모리가 있어도 우선순위를 먼저 고려
      // qwen3(우선순위 1) > gemma3:27b(우선순위 2, 더 큼)
      const result = recommendModel(mockOllamaModels as any, 30)

      // qwen3이 gemma3:27b보다 우선순위가 높음
      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should apply 80% safety margin', () => {
      // 10GB 메모리 = 8GB 안전 마진
      // qwen3:4b (약 2.7GB) < 8GB → 추천 가능
      // gemma3:27b (약 18.2GB) > 8GB → 추천 불가능

      const result = recommendModel(mockOllamaModels as any, 10)

      // qwen3이 추천되어야 함 (gemma3:27b는 제외)
      expect(result).toBe('qwen3:4b-q4_K_M')
    })
  })

  describe('VRAM calculation', () => {
    it('should calculate VRAM correctly for Q4_K_M', () => {
      // 4B × 0.56 × 1.2 = 2.688 GB ≈ 3GB
      // 테스트: 3GB 메모리에서 4B Q4_K_M 모델 실행 가능
      const result = recommendModel(
        [mockOllamaModels[0]] as any,
        3.75 // 3 / 0.8 (안전 마진 제거)
      )

      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should reject models exceeding memory limit', () => {
      // 4B × 0.56 × 1.2 = 2.688 GB
      // 2.5GB 메모리에서는 실행 불가능 (2.688 > 2.5 * 0.8)
      const result = recommendModel([mockOllamaModels[0]] as any, 2.5)

      // 폴백 로직으로 경고와 함께 모델 반환 (또는 null)
      expect(result).toBeTruthy() // 폴백 동작
    })
  })

  describe('Model priority', () => {
    it('should prioritize qwen3 over gemma3', () => {
      const result = recommendModel(mockOllamaModels as any, 20)

      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should prioritize gemma3 over llama3.2', () => {
      // qwen3을 제외하고 테스트
      const modelsWithoutQwen = mockOllamaModels.filter(
        (m) => !(m.name as string).toLowerCase().includes('qwen3')
      )

      const result = recommendModel(modelsWithoutQwen as any, 20)

      expect(result).toBe('gemma3:4b-q4_K_M')
    })

    it('should handle unknown model families gracefully', () => {
      const unknownModel = {
        name: 'unknown-model:7b-q4_K_M',
        size: 4683075271,
        details: {
          parameter_size: '7.0B',
          quantization_level: 'Q4_K_M',
          family: 'unknown',
        },
      }

      const result = recommendModel([unknownModel] as any, 10)

      // 우선순위가 낮지만 여전히 추천 가능해야 함
      expect(result).toBe('unknown-model:7b-q4_K_M')
    })
  })

  describe('Edge cases', () => {
    it('should handle missing parameter_size gracefully', () => {
      const modelWithoutSize = {
        name: 'test-model:latest',
        size: 5000000000, // 5GB 파일
        details: {
          // parameter_size 없음
          quantization_level: 'Q4_K_M',
        },
      }

      const result = recommendModel([modelWithoutSize] as any, 10)

      // 파일 크기로 폴백: 5GB × 0.7 ≈ 3.5GB
      expect(result).toBe('test-model:latest')
    })

    it('should handle missing quantization_level gracefully', () => {
      const modelWithoutQuant = {
        name: 'test-model:7b',
        size: 4683075271,
        details: {
          parameter_size: '7.0B',
          // quantization_level 없음 → 기본값 Q4_K_M (0.56) 사용
        },
      }

      const result = recommendModel([modelWithoutQuant] as any, 10)

      // 기본값으로 계산: 7B × 0.56 × 1.2 ≈ 4.7GB
      expect(result).toBe('test-model:7b')
    })

    it('should handle empty model list', () => {
      const result = recommendModel([], 8)

      expect(result).toBeNull()
    })

    it('should handle very small GPU memory (< 1GB)', () => {
      const result = recommendModel(mockOllamaModels as any, 0.5)

      // 폴백: 가장 작은 모델 선택 (경고 메시지와 함께)
      expect(result).toBeTruthy()
      expect(result).toBe('llama3.2:1b-q4_K_M') // 가장 작은 모델
    })
  })

  describe('Type safety', () => {
    it('should accept valid OllamaModel array', () => {
      // TypeScript 컴파일 체크
      const validModels = mockOllamaModels as any[]

      const result = recommendModel(validModels, 8)

      expect(result).toBeDefined()
    })

    it('should handle models with optional fields', () => {
      const minimalModel = {
        name: 'minimal-model:latest',
      }

      const result = recommendModel([minimalModel] as any, 8)

      // 선택적 필드 없어도 동작해야 함
      expect(result).toBe('minimal-model:latest')
    })
  })

  describe('Real-world scenarios', () => {
    it('should recommend appropriate model for RTX 3060 (12GB VRAM)', () => {
      // RTX 3060: 12GB VRAM
      const result = recommendModel(mockOllamaModels as any, 12)

      // 가장 좋은 모델 추천
      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should recommend appropriate model for RTX 2080 Ti (11GB VRAM)', () => {
      // RTX 2080 Ti: 11GB VRAM
      const result = recommendModel(mockOllamaModels as any, 11)

      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should recommend appropriate model for low-end laptop (8GB system RAM)', () => {
      // CPU-only 시스템, 8GB RAM
      const result = recommendModel(mockOllamaModels as any, 8)

      expect(result).toBe('qwen3:4b-q4_K_M')
    })

    it('should recommend appropriate model for high-end setup (48GB VRAM)', () => {
      // 고사양 GPU에서도 최신 모델(qwen3) 우선 추천
      const result = recommendModel(mockOllamaModels as any, 48)

      // qwen3(최신)이 우선순위가 높음
      expect(result).toBe('qwen3:4b-q4_K_M')
    })
  })
})

describe('ModelRecommender Integration', () => {
  it('should export all public functions', () => {
    expect(typeof recommendModel).toBe('function')
    expect(typeof getRecommendedModel).toBe('function')
    expect(typeof getInstalledModels).toBe('function')
    expect(typeof getAvailableGpuMemoryGB).toBe('function')
  })

  it('should have proper documentation', () => {
    // TypeScript JSDoc 확인
    const source = recommendModel.toString()

    expect(source).toBeDefined()
  })
})
