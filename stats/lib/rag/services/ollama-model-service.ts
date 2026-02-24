/**
 * Ollama 모델 관리 서비스
 *
 * 모델 CRUD 작업을 담당:
 * - listModels: /api/tags + /api/show (capabilities 기반 카테고리 분류)
 * - pullModel: /api/pull (NDJSON 스트리밍 파싱 + 진행률)
 * - deleteModel: DELETE /api/delete (body: { model: name })
 * - cancelPull: static AbortController로 다운로드 취소
 */

import {
  type OllamaModel,
  type OllamaModelDetail,
  getInstalledModels,
  calculateModelVram,
} from '@/lib/rag/utils/model-recommender'

// ── 타입 정의 ──────────────────────────────────────────────

export type ModelCategory = 'embedding' | 'inference'

export interface CategorizedModel {
  name: string
  model?: string
  size?: number
  details?: OllamaModelDetail
  category: ModelCategory
  vramGB: number
  capabilities?: string[]
}

export interface PullProgress {
  status: string
  digest?: string
  total?: number
  completed?: number
  /** 0-100 퍼센트 (계산된 값) */
  percent: number
}

/** /api/show 응답에서 사용하는 필드만 추출 */
interface ShowResponse {
  details?: OllamaModelDetail
  capabilities?: string[]
}

// ── NDJSON 파싱 타입 ───────────────────────────────────────

interface PullStreamLine {
  status?: string
  digest?: string
  total?: number
  completed?: number
  error?: string
}

// ── 서비스 클래스 ──────────────────────────────────────────

export class OllamaModelService {
  /**
   * 다운로드 취소용 static AbortController
   *
   * 하나의 다운로드만 동시에 진행 가능.
   * cancelPull() 호출 시 현재 다운로드 중단.
   */
  private static pullAbortController: AbortController | null = null

  // ── 모델 목록 (capabilities 기반 분류) ─────────────────

  /**
   * 설치된 모델 목록 + 카테고리 분류
   *
   * 1단계: /api/tags로 전체 목록 가져오기 (getInstalledModels 재사용)
   * 2단계: 각 모델에 /api/show 호출하여 capabilities 확인
   *   - capabilities.includes('embedding') → 'embedding'
   *   - 그 외 → 'inference'
   * 3단계: fallback — /api/show 실패 시 모델명 패턴 매칭
   *
   * @param endpoint - Ollama 서버 URL
   * @returns 카테고리가 지정된 모델 배열
   */
  static async listModels(endpoint: string): Promise<CategorizedModel[]> {
    const models = await getInstalledModels(endpoint)

    if (models.length === 0) {
      return []
    }

    // 병렬로 /api/show 호출 (모든 모델에 대해)
    const categorizedModels = await Promise.all(
      models.map(async (model) => {
        const showData = await OllamaModelService.getModelShow(endpoint, model.name)
        const category = OllamaModelService.categorizeModel(model.name, showData?.capabilities)
        const vramGB = calculateModelVram(model)

        const result: CategorizedModel = {
          name: model.name,
          model: model.model,
          size: model.size,
          details: showData?.details ?? model.details,
          category,
          vramGB,
          capabilities: showData?.capabilities,
        }

        return result
      }),
    )

    return categorizedModels
  }

  /**
   * /api/show로 모델 상세 정보 가져오기
   *
   * @returns ShowResponse 또는 null (실패 시)
   */
  private static async getModelShow(
    endpoint: string,
    modelName: string,
  ): Promise<ShowResponse | null> {
    try {
      const response = await fetch(`${endpoint}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName }),
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as Record<string, unknown>

      const result: ShowResponse = {}

      // details 파싱
      if (typeof data.details === 'object' && data.details !== null) {
        const d = data.details as Record<string, unknown>
        result.details = {
          parent_model: typeof d.parent_model === 'string' ? d.parent_model : undefined,
          format: typeof d.format === 'string' ? d.format : undefined,
          family: typeof d.family === 'string' ? d.family : undefined,
          families: Array.isArray(d.families)
            ? d.families.filter((f): f is string => typeof f === 'string')
            : undefined,
          parameter_size: typeof d.parameter_size === 'string' ? d.parameter_size : undefined,
          quantization_level:
            typeof d.quantization_level === 'string' ? d.quantization_level : undefined,
        }
      }

      // capabilities 파싱
      if (Array.isArray(data.capabilities)) {
        result.capabilities = data.capabilities.filter(
          (c): c is string => typeof c === 'string',
        )
      }

      return result
    } catch {
      return null
    }
  }

  /**
   * 모델 카테고리 결정
   *
   * 우선순위:
   * 1. capabilities 배열에 'embedding' 포함 → 'embedding'
   * 2. 모델명에 'embed' 포함 → 'embedding' (fallback)
   * 3. 그 외 → 'inference'
   */
  private static categorizeModel(
    modelName: string,
    capabilities?: string[],
  ): ModelCategory {
    // 1. capabilities 기반 (가장 정확)
    if (capabilities && capabilities.includes('embedding')) {
      return 'embedding'
    }

    // 2. 이름 패턴 기반 (fallback)
    const lowerName = modelName.toLowerCase()
    if (lowerName.includes('embed') || lowerName.includes('embedding')) {
      return 'embedding'
    }

    return 'inference'
  }

  // ── 모델 다운로드 (NDJSON 스트리밍) ───────────────────

  /**
   * Ollama 모델 다운로드 (pull)
   *
   * POST /api/pull + NDJSON 스트리밍 파싱.
   * 진행률을 onProgress 콜백으로 전달.
   *
   * @param endpoint - Ollama 서버 URL
   * @param modelName - 다운로드할 모델명 (예: 'nomic-embed-text')
   * @param onProgress - 진행률 콜백
   * @throws Error - 네트워크 오류, 취소, 또는 서버 에러
   */
  static async pullModel(
    endpoint: string,
    modelName: string,
    onProgress?: (progress: PullProgress) => void,
  ): Promise<void> {
    // 이전 다운로드 취소
    OllamaModelService.cancelPull()

    // 새 AbortController 생성
    const controller = new AbortController()
    OllamaModelService.pullAbortController = controller

    try {
      const response = await fetch(`${endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName }),
        signal: controller.signal,
      })

      if (!response.ok) {
        let errorDetail = response.statusText
        try {
          const errorData = (await response.json()) as Record<string, unknown>
          errorDetail =
            (typeof errorData.error === 'string' ? errorData.error : undefined) ?? errorDetail
        } catch {
          // JSON 파싱 실패 시 statusText 사용
        }
        throw new Error(`모델 다운로드 실패 (${response.status}): ${errorDetail}`)
      }

      if (!response.body) {
        throw new Error('스트리밍 응답이 없습니다')
      }

      // NDJSON 스트리밍 파싱
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

       
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // 줄 단위로 파싱
        const lines = buffer.split('\n')
        // 마지막 줄은 불완전할 수 있으므로 버퍼에 유지
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const parsed = JSON.parse(trimmed) as PullStreamLine

            if (parsed.error) {
              throw new Error(`모델 다운로드 오류: ${parsed.error}`)
            }

            const percent =
              parsed.total && parsed.total > 0 && parsed.completed !== undefined
                ? Math.round((parsed.completed / parsed.total) * 100)
                : 0

            onProgress?.({
              status: parsed.status ?? '',
              digest: parsed.digest,
              total: parsed.total,
              completed: parsed.completed,
              percent,
            })
          } catch (parseError) {
            // JSON 파싱 실패 — 무시 (스트리밍 중 불완전한 줄일 수 있음)
            if (parseError instanceof Error && parseError.message.startsWith('모델 다운로드 오류:')) {
              throw parseError
            }
          }
        }
      }

      // 남은 버퍼 처리
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim()) as PullStreamLine
          if (parsed.error) {
            throw new Error(`모델 다운로드 오류: ${parsed.error}`)
          }
          onProgress?.({
            status: parsed.status ?? 'success',
            percent: 100,
          })
        } catch (bufferError) {
          // 서버 에러는 반드시 전파
          if (bufferError instanceof Error && bufferError.message.startsWith('모델 다운로드 오류:')) {
            throw bufferError
          }
          // JSON 파싱 실패만 무시
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('모델 다운로드가 취소되었습니다')
      }
      throw error
    } finally {
      // 완료 후 AbortController 정리
      if (OllamaModelService.pullAbortController === controller) {
        OllamaModelService.pullAbortController = null
      }
    }
  }

  /**
   * 현재 진행 중인 모델 다운로드 취소
   */
  static cancelPull(): void {
    if (OllamaModelService.pullAbortController) {
      OllamaModelService.pullAbortController.abort()
      OllamaModelService.pullAbortController = null
    }
  }

  // ── 모델 삭제 ──────────────────────────────────────────

  /**
   * Ollama 모델 삭제
   *
   * DELETE /api/delete — body: { model: name }
   * 주의: 필드명이 'model'이지 'name'이 아님!
   *
   * @param endpoint - Ollama 서버 URL
   * @param modelName - 삭제할 모델명
   */
  static async deleteModel(endpoint: string, modelName: string): Promise<void> {
    const response = await fetch(`${endpoint}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
    })

    if (!response.ok) {
      let errorDetail = response.statusText
      try {
        const errorData = (await response.json()) as Record<string, unknown>
        errorDetail =
          (typeof errorData.error === 'string' ? errorData.error : undefined) ?? errorDetail
      } catch {
        // JSON 파싱 실패
      }
      throw new Error(`모델 삭제 실패 (${response.status}): ${errorDetail}`)
    }
  }

  // ── Ollama 서버 상태 확인 ──────────────────────────────

  /**
   * Ollama 서버가 실행 중인지 확인
   *
   * @param endpoint - Ollama 서버 URL
   * @returns true = 실행 중, false = 미실행
   */
  static async isServerRunning(endpoint: string): Promise<boolean> {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
