/**
 * 모델 추천 시스템
 *
 * GPU 메모리 정보를 기반으로 최적의 추론 모델을 추천합니다.
 * - Ollama API에서 실시간 모델 정보 조회 (파라미터 크기, 양자화 레벨)
 * - 양자화 레벨 기반 VRAM 동적 계산
 * - 사용 가능한 모델 중에서 최고 성능 모델 선택
 *
 * 특징: 하드코딩 없음 - 완전히 동적으로 동작하므로 새 모델도 자동 지원
 */

/**
 * 양자화 레벨별 오버헤드 (파라미터당 바이트)
 * 예: Q4_K_M은 약 4.5비트이므로 1B 파라미터 = 약 0.56GB
 */
const QUANTIZATION_OVERHEAD: Record<string, number> = {
  'F32': 4.0,       // 32-bit float
  'F16': 2.0,       // 16-bit float (반정밀도)
  'Q8_0': 1.0,      // 8-bit quantization
  'Q8_1': 1.0,
  'Q6_K': 0.75,     // 6-bit quantization
  'Q5_K_M': 0.64,   // 5-bit quantization
  'Q5_K_S': 0.64,
  'Q4_K_M': 0.56,   // 4-bit quantization (가장 일반적)
  'Q4_K_S': 0.56,
  'Q4_0': 0.56,
  'Q4_1': 0.56,
  'Q3_K_M': 0.42,   // 3-bit quantization
  'Q3_K_S': 0.42,
  'Q3_K_L': 0.42,
  'Q2_K': 0.33,     // 2-bit quantization (극도로 작음)
  'IQ2_XXS': 0.25,
  'IQ2_XS': 0.27,
  'IQ2_S': 0.29,
  'IQ2_M': 0.30,
}

/**
 * 모델 계열 우선순위 (더 최신 모델을 선호)
 */
const MODEL_FAMILY_PRIORITIES: Record<string, number> = {
  'qwen3': 1,        // 최신
  'gemma3': 2,
  'llama3.2': 3,
  'llama3.1': 4,
  'deepseek': 5,
  'exaone': 6,
  'qwen2.5': 7,
  'gemma2': 8,
  'llama3': 9,
  'mistral': 10,
  'qwen2': 11,
  'llama2': 12,
  'phi3': 13,
  'phi': 14,
}

interface OllamaSystemInfo {
  memory?: {
    total: number        // 총 메모리 (bytes)
  }
  gpus?: Array<{
    name: string
    driver: string
    memory: number       // GPU 메모리 (bytes)
  }>
}

interface OllamaModelDetail {
  parent_model?: string
  format?: string
  family?: string
  families?: string[]
  parameter_size?: string
  quantization_level?: string
}

interface OllamaModel {
  name: string
  model?: string
  size?: number
  details?: OllamaModelDetail
}

/**
 * 파라미터 크기 문자열(예: "4.0B", "7B", "70B")을 숫자(GB)로 변환
 */
function parseParameterSize(paramSize: string | undefined): number {
  if (!paramSize) return 0

  // "7B", "4.0B", "70B" → 7, 4, 70
  const match = paramSize.match(/^([\d.]+)/)
  const sizeNum = match ? parseFloat(match[1]) : 0

  return sizeNum
}

/**
 * 양자화 레벨에서 오버헤드 추출
 * 예: "Q4_K_M" → 0.56
 */
function getQuantizationOverhead(quantLevel: string | undefined): number {
  if (!quantLevel) return 0.56 // 기본값: Q4_K_M

  // 정확한 매칭 시도
  const overhead = QUANTIZATION_OVERHEAD[quantLevel]
  if (overhead !== undefined) {
    return overhead
  }

  // 부분 매칭 (예: "Q4_K_M" 포함)
  for (const [key, value] of Object.entries(QUANTIZATION_OVERHEAD)) {
    if (quantLevel.includes(key)) {
      return value
    }
  }

  // 기본값
  return 0.56
}

/**
 * Ollama API에서 모델의 VRAM 요구사항 동적 계산
 *
 * @param model - Ollama 모델 정보
 * @returns 필요한 VRAM (GB)
 */
function calculateModelVram(model: OllamaModel): number {
  const paramSize = parseParameterSize(model.details?.parameter_size)
  const overhead = getQuantizationOverhead(model.details?.quantization_level)

  // VRAM = 파라미터 크기(B) × 오버헤드 × 1.2 (여유)
  const baseVram = paramSize * overhead * 1.2

  if (baseVram <= 0) {
    // 정보 부족 시 파일 크기 추정 사용
    // 일반적으로 파일 크기 × 0.7 ≈ VRAM 사용량
    const fileSize = (model.size || 0) / (1024 ** 3) // bytes → GB
    return Math.max(Math.ceil(fileSize * 0.7), 1)
  }

  return Math.ceil(baseVram)
}

/**
 * 모델 계열에서 우선순위 추출
 */
function getModelPriority(modelName: string): number {
  const lowerName = modelName.toLowerCase()

  // 정확한 계열 매칭
  for (const [family, priority] of Object.entries(MODEL_FAMILY_PRIORITIES)) {
    if (lowerName.includes(family)) {
      return priority
    }
  }

  // 기본값 (알려지지 않은 모델)
  return 100
}

/**
 * Ollama 서버에서 GPU 정보 조회
 */
export async function getOllamaSystemInfo(
  ollamaEndpoint: string = 'http://localhost:11434'
): Promise<OllamaSystemInfo> {
  try {
    const response = await fetch(`${ollamaEndpoint}/api/show`)
    if (!response.ok) {
      console.warn('[ModelRecommender] 시스템 정보 조회 실패:', response.statusText)
      return {}
    }

    const data = (await response.json()) as unknown
    // 타입 가드: 알려진 필드만 추출
    if (typeof data === 'object' && data !== null) {
      const systemInfo: OllamaSystemInfo = {}

      const record = data as Record<string, unknown>

      if ('memory' in record && typeof record.memory === 'object' && record.memory !== null) {
        const memRecord = record.memory as Record<string, unknown>
        if ('total' in memRecord && typeof memRecord.total === 'number') {
          systemInfo.memory = { total: memRecord.total }
        }
      }

      if ('gpus' in record && Array.isArray(record.gpus)) {
        systemInfo.gpus = record.gpus
          .map((gpu: unknown) => {
            if (typeof gpu !== 'object' || gpu === null) return null

            const gpuRecord = gpu as Record<string, unknown>
            if (
              typeof gpuRecord.name === 'string' &&
              typeof gpuRecord.driver === 'string' &&
              typeof gpuRecord.memory === 'number'
            ) {
              return {
                name: gpuRecord.name,
                driver: gpuRecord.driver,
                memory: gpuRecord.memory,
              }
            }
            return null
          })
          .filter((gpu): gpu is NonNullable<typeof gpu> => gpu !== null)
      }

      return systemInfo
    }

    return {}
  } catch (error) {
    console.warn('[ModelRecommender] GPU 정보 조회 중 오류:', error)
    return {}
  }
}

/**
 * 사용 가능한 GPU 메모리(GB) 추정
 */
export async function getAvailableGpuMemoryGB(
  ollamaEndpoint: string = 'http://localhost:11434'
): Promise<number> {
  const systemInfo = await getOllamaSystemInfo(ollamaEndpoint)

  // 1. GPU 메모리 우선 사용 (더 정확함)
  if (systemInfo.gpus && systemInfo.gpus.length > 0) {
    // 가장 큰 GPU 메모리 선택 (멀티-GPU 환경)
    const maxGpuMemory = Math.max(...systemInfo.gpus.map((gpu) => gpu.memory))
    const memoryGB = maxGpuMemory / (1024 ** 3) // bytes → GB
    console.log(`[ModelRecommender] GPU 메모리 감지: ${memoryGB.toFixed(2)}GB (${systemInfo.gpus.length}개 GPU)`)
    return memoryGB
  }

  // 2. 폴백: 시스템 메모리 사용 (GPU 없을 때)
  if (systemInfo.memory?.total) {
    const memoryGB = systemInfo.memory.total / (1024 ** 3)
    console.log(`[ModelRecommender] GPU 없음, 시스템 메모리 사용: ${memoryGB.toFixed(2)}GB`)
    return memoryGB
  }

  // 3. 기본값 (정보 없을 때)
  console.warn('[ModelRecommender] 메모리 정보를 얻을 수 없음, 기본값(8GB) 사용')
  return 8
}

/**
 * Ollama에서 모든 설치된 모델 조회 (타입 안전)
 */
export async function getInstalledModels(
  ollamaEndpoint: string = 'http://localhost:11434'
): Promise<OllamaModel[]> {
  try {
    const response = await fetch(`${ollamaEndpoint}/api/tags`)
    if (!response.ok) {
      console.warn('[ModelRecommender] 모델 목록 조회 실패:', response.statusText)
      return []
    }

    const data = (await response.json()) as unknown

    if (typeof data !== 'object' || data === null) {
      return []
    }

    const record = data as Record<string, unknown>

    if (!Array.isArray(record.models)) {
      return []
    }

    return record.models
      .map((model: unknown) => {
        if (typeof model !== 'object' || model === null) return null

        const modelRecord = model as Record<string, unknown>

        if (typeof modelRecord.name !== 'string') {
          return null
        }

        const ollamaModel: OllamaModel = {
          name: modelRecord.name,
        }

        if (typeof modelRecord.model === 'string') {
          ollamaModel.model = modelRecord.model
        }

        if (typeof modelRecord.size === 'number') {
          ollamaModel.size = modelRecord.size
        }

        if (typeof modelRecord.details === 'object' && modelRecord.details !== null) {
          const detailRecord = modelRecord.details as Record<string, unknown>
          const details: OllamaModelDetail = {}

          if (typeof detailRecord.parent_model === 'string') {
            details.parent_model = detailRecord.parent_model
          }
          if (typeof detailRecord.format === 'string') {
            details.format = detailRecord.format
          }
          if (typeof detailRecord.family === 'string') {
            details.family = detailRecord.family
          }
          if (Array.isArray(detailRecord.families)) {
            details.families = detailRecord.families.filter((f): f is string => typeof f === 'string')
          }
          if (typeof detailRecord.parameter_size === 'string') {
            details.parameter_size = detailRecord.parameter_size
          }
          if (typeof detailRecord.quantization_level === 'string') {
            details.quantization_level = detailRecord.quantization_level
          }

          ollamaModel.details = details
        }

        return ollamaModel
      })
      .filter((model): model is OllamaModel => model !== null)
  } catch (error) {
    console.warn('[ModelRecommender] 모델 목록 조회 중 오류:', error)
    return []
  }
}

/**
 * 사용 가능한 모델 목록에서 GPU RAM에 맞는 최고 성능 모델 추천
 *
 * @param models - Ollama에 설치된 모델 목록
 * @param availableGpuMemoryGB - 사용 가능한 GPU 메모리 (GB)
 * @returns 추천 모델명 또는 null
 */
export function recommendModel(
  models: OllamaModel[],
  availableGpuMemoryGB: number
): string | null {
  // 1. embedding 모델 제외 (추론 모델만)
  const inferenceModels = models.filter(
    (m) =>
      !m.name.toLowerCase().includes('embed') &&
      !m.name.toLowerCase().includes('embedding')
  )

  if (inferenceModels.length === 0) {
    return null
  }

  // 2. 안전 마진 적용 (사용 가능한 메모리의 80%)
  const safeMemory = availableGpuMemoryGB * 0.8

  // 3. 각 모델의 VRAM 계산
  const modelsWithVram = inferenceModels.map((model) => ({
    model,
    vram: calculateModelVram(model),
    priority: getModelPriority(model.name),
  }))

  // 4. 실행 가능한 모델 필터링
  const viableModels = modelsWithVram
    .filter((m) => m.vram <= safeMemory)
    .sort((a, b) => {
      // 우선순위 정렬 (낮은 번호가 더 최신 모델)
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      // 같은 계열이면 VRAM 큰 모델 우선
      return b.vram - a.vram
    })

  if (viableModels.length === 0) {
    // 폴백: 가장 작은 모델 선택
    const smallestModel = modelsWithVram.sort((a, b) => a.vram - b.vram)[0]

    if (smallestModel) {
      console.warn(
        `[ModelRecommender] ⚠️ 메모리 부족 경고: ${smallestModel.model.name} (필요: ${smallestModel.vram}GB)는 ${safeMemory.toFixed(2)}GB 메모리에서 제대로 작동하지 않을 수 있습니다`
      )
      return smallestModel.model.name
    }

    return null
  }

  const recommended = viableModels[0]
  console.log(
    `[ModelRecommender] ✓ 추천 모델: ${recommended.model.name} (필요: ${recommended.vram}GB, 사용 가능: ${safeMemory.toFixed(2)}GB)`
  )

  return recommended.model.name
}

/**
 * 종합 함수: GPU 정보 조회 → 모델 조회 → 모델 추천
 *
 * 이 함수 하나만 호출하면 됨!
 */
export async function getRecommendedModel(
  ollamaEndpoint: string = 'http://localhost:11434'
): Promise<string | null> {
  try {
    // 1. 사용 가능한 GPU 메모리 조회
    const gpuMemory = await getAvailableGpuMemoryGB(ollamaEndpoint)

    // 2. 설치된 모든 모델 조회
    const models = await getInstalledModels(ollamaEndpoint)

    if (models.length === 0) {
      console.warn('[ModelRecommender] 설치된 모델이 없습니다')
      return null
    }

    // 3. 추론 모델 중에서 최고 성능 모델 추천
    const recommended = recommendModel(models, gpuMemory)

    return recommended
  } catch (error) {
    console.error('[ModelRecommender] 모델 추천 중 오류:', error)
    return null
  }
}
