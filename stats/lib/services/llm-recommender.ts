/**
 * 통합 LLM 추천 서비스
 *
 * - 중앙 프롬프트 (prompts.ts)에서 페르소나별 시스템 프롬프트 사용
 * - 유저 설정에 따라 공급자(OpenRouter/Ollama) 우선순위 결정
 * - 모든 공급자 실패 시 Keyword 기반 Fallback
 * - 통합 스트리밍 인터페이스 (AsyncGenerator)
 */

import type {
  AIRecommendation,
  AnalysisTrack,
  IntentClassification,
  StatisticalAssumptions,
  ValidationResults,
  DataRow,
  FlowChatMessage
} from '@/types/smart-flow'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { openRouterRecommender } from './openrouter-recommender'
import { ollamaRecommender } from './ollama-recommender'
import { logger } from '@/lib/utils/logger'
import { useSettingsStore } from '@/lib/stores/settings-store'
import {
  getSystemPromptConsultant,
  getSystemPromptDiagnostic,
  getSystemPromptIntentRouter
} from './ai/prompts'
import type { LlmProvider } from '@/lib/utils/storage-types'

export type { LlmProvider }

export interface LlmRecommendationResult {
  recommendation: AIRecommendation | null
  responseText: string
  provider: LlmProvider
}

export interface LlmStreamResult {
  model: string
  provider: LlmProvider
}

/**
 * 통합 LLM 추천 서비스
 */
export class LlmRecommender {
  /**
   * 추천 요청 (자동 공급자 선택 및 Fallback)
   */
  async recommend(
    userInput: string,
    validationResults: ValidationResults | null = null,
    assumptionResults: StatisticalAssumptions | null = null,
    data: DataRow[] | null = null,
    chatHistory?: FlowChatMessage[]
  ): Promise<LlmRecommendationResult> {
    // 1. 페르소나 결정
    const isDiagnostic = !!(validationResults && data && data.length > 0)
    const systemPrompt = isDiagnostic
      ? getSystemPromptDiagnostic()
      : getSystemPromptConsultant()

    logger.info(`[LlmRecommender] Starting recommendation in ${isDiagnostic ? 'DIAGNOSTIC' : 'CONSULTANT'} mode`)

    // 2. 공급자 우선순위 결정 (설정 반영)
    const { useOllamaForRecommendation } = useSettingsStore.getState()

    if (useOllamaForRecommendation) {
      const ollamaResult = await this.tryOllama(
        userInput, systemPrompt, validationResults, assumptionResults, data
      )
      if (ollamaResult) return ollamaResult

      const openRouterResult = await this.tryOpenRouter(
        userInput, systemPrompt, validationResults, assumptionResults, data, chatHistory
      )
      if (openRouterResult) return openRouterResult
    } else {
      const openRouterResult = await this.tryOpenRouter(
        userInput, systemPrompt, validationResults, assumptionResults, data, chatHistory
      )
      if (openRouterResult) return openRouterResult

      const ollamaResult = await this.tryOllama(
        userInput, systemPrompt, validationResults, assumptionResults, data
      )
      if (ollamaResult) return ollamaResult
    }

    // 3. 모든 AI 실패 시 Keyword Fallback
    return this.useKeywordFallback(userInput)
  }

  /**
   * 자연어 입력 기반 추천 (chatHistory 지원)
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null,
    chatHistory?: FlowChatMessage[]
  ): Promise<LlmRecommendationResult> {
    return this.recommend(userInput, validationResults, assumptionResults, data, chatHistory)
  }

  /**
   * OpenRouter 시도
   */
  private async tryOpenRouter(
    userInput: string,
    systemPrompt: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null,
    chatHistory?: FlowChatMessage[]
  ): Promise<LlmRecommendationResult | null> {
    try {
      const isAvailable = await openRouterRecommender.checkHealth()
      if (!isAvailable) return null

      logger.info('[LlmRecommender] Trying OpenRouter...')

      // 추천: 한국어 reasoning + alternatives 포함하므로 토큰 여유 확보
      const { recommendation, responseText } = await openRouterRecommender.recommendWithSystemPrompt(
        userInput, systemPrompt, validationResults, assumptionResults, data,
        { maxTokens: 3500, chatHistory }
      )

      if (recommendation) {
        return { recommendation, responseText, provider: 'openrouter' }
      }
      logger.warn('[LlmRecommender] OpenRouter returned no recommendation, falling back')
      return null
    } catch (error) {
      logger.warn('[LlmRecommender] OpenRouter failed', { error: error instanceof Error ? error.message : 'Unknown' })
      return null
    }
  }

  /**
   * Ollama 시도
   */
  private async tryOllama(
    userInput: string,
    systemPrompt: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult | null> {
    try {
      const isAvailable = await ollamaRecommender.checkHealth()
      if (!isAvailable) return null

      logger.info('[LlmRecommender] Trying Ollama...')

      const { recommendation, responseText } = await ollamaRecommender.recommendWithSystemPrompt(
        userInput, systemPrompt, validationResults, assumptionResults, data,
        { maxTokens: 3500 }
      )

      if (recommendation) {
        return { recommendation, responseText, provider: 'ollama' }
      }
      logger.warn('[LlmRecommender] Ollama returned no recommendation, falling back')
      return null
    } catch (error) {
      logger.warn('[LlmRecommender] Ollama failed', { error: error instanceof Error ? error.message : 'Unknown' })
      return null
    }
  }

  /**
   * 스트리밍 요청 (해석 등에 사용)
   * - 설정에 따라 OpenRouter/Ollama 우선순위 결정
   * - 1차 공급자 실패 시 2차 공급자로 fallback
   * - 최종 실패 시 예외를 호출자에게 전파
   */
  async *stream(
    systemPrompt: string,
    userPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, LlmStreamResult> {
    const { useOllamaForRecommendation } = useSettingsStore.getState()
    const providerOrder: Array<'openrouter' | 'ollama'> = useOllamaForRecommendation
      ? ['ollama', 'openrouter']
      : ['openrouter', 'ollama']

    let lastError: unknown
    for (const provider of providerOrder) {
      try {
        if (provider === 'openrouter') {
          return yield* this.streamWithOpenRouter(systemPrompt, userPrompt, signal)
        }
        return yield* this.streamWithOllama(systemPrompt, userPrompt, signal)
      } catch (error) {
        if (signal?.aborted) throw error
        lastError = error
        logger.warn(`[LlmRecommender] ${provider} stream failed, trying fallback`, {
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    }

    logger.error('[LlmRecommender] All streaming providers failed')
    if (lastError instanceof Error) {
      throw lastError
    }
    throw new Error('AI 해석 실패: 사용 가능한 스트리밍 공급자가 없습니다.')
  }

  private async *streamWithOllama(
    systemPrompt: string,
    userPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, LlmStreamResult> {
    const isAvailable = await ollamaRecommender.checkHealth()
    if (!isAvailable) {
      throw new Error('Ollama stream unavailable')
    }

    yield* ollamaRecommender.streamChatCompletion(systemPrompt, userPrompt, signal)
    return { model: 'ollama', provider: 'ollama' }
  }

  /**
   * 콜백 기반 OpenRouter 스트리밍을 AsyncGenerator로 변환
   * 생산자(onChunk)와 소비자(yield) 간 큐를 분리하여 동기화합니다.
   */
  private async *streamWithOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    signal?: AbortSignal
  ): AsyncGenerator<string, LlmStreamResult> {
    const isAvailable = await openRouterRecommender.checkHealth()
    if (!isAvailable) {
      throw new Error('OpenRouter stream unavailable')
    }

    type QueueItem =
      | { type: 'chunk'; data: string }
      | { type: 'done'; model: string }
      | { type: 'error'; error: unknown }
    const queue: QueueItem[] = []
    let waiting: ((item: QueueItem) => void) | null = null

    const enqueue = (item: QueueItem) => {
      if (waiting) {
        const resolve = waiting
        waiting = null
        resolve(item)
      } else {
        queue.push(item)
      }
    }

    const dequeue = (): Promise<QueueItem> => {
      if (queue.length > 0) {
        return Promise.resolve(queue.shift()!)
      }
      return new Promise<QueueItem>((resolve) => {
        waiting = resolve
      })
    }

    const onChunk = (text: string) => {
      enqueue({ type: 'chunk', data: text })
    }

    openRouterRecommender.streamChatCompletion(
      systemPrompt,
      userPrompt,
      onChunk,
      signal,
      { temperature: 0.5, maxTokens: 4000 }
    ).then((result) => {
      enqueue({ type: 'done', model: result?.model ?? 'unknown' })
    }).catch((err) => {
      enqueue({ type: 'error', error: err })
    })

    while (true) {
      const item = await dequeue()
      if (item.type === 'chunk') {
        yield item.data
        continue
      }
      if (item.type === 'done') {
        return { model: item.model, provider: 'openrouter' }
      }
      throw item.error instanceof Error ? item.error : new Error('OpenRouter stream failed')
    }
  }

  /**
   * 멀티턴 스트리밍 (messages 배열 직접 전달)
   * 결과 해설 후속 Q&A 전용 — OpenRouter만 지원 (Ollama는 단순 프롬프트 전용)
   */
  async *streamMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    signal?: AbortSignal
  ): AsyncGenerator<string, LlmStreamResult> {
    const isAvailable = await openRouterRecommender.checkHealth()
    if (!isAvailable) {
      throw new Error('OpenRouter를 사용할 수 없습니다. API 키를 확인해주세요.')
    }

    type QueueItem =
      | { type: 'chunk'; data: string }
      | { type: 'done'; model: string }
      | { type: 'error'; error: unknown }
    const queue: QueueItem[] = []
    let waiting: ((item: QueueItem) => void) | null = null

    const enqueue = (item: QueueItem) => {
      if (waiting) {
        const resolve = waiting
        waiting = null
        resolve(item)
      } else {
        queue.push(item)
      }
    }

    const dequeue = (): Promise<QueueItem> => {
      if (queue.length > 0) return Promise.resolve(queue.shift()!)
      return new Promise<QueueItem>((resolve) => { waiting = resolve })
    }

    openRouterRecommender.streamChatWithMessages(
      messages,
      (text) => enqueue({ type: 'chunk', data: text }),
      signal,
      { temperature: 0.5, maxTokens: 4000 }
    ).then((result) => {
      enqueue({ type: 'done', model: result?.model ?? 'unknown' })
    }).catch((err) => {
      enqueue({ type: 'error', error: err })
    })

    while (true) {
      const item = await dequeue()
      if (item.type === 'chunk') { yield item.data; continue }
      if (item.type === 'done') return { model: item.model, provider: 'openrouter' }
      throw item.error instanceof Error ? item.error : new Error('스트리밍 실패')
    }
  }

  /**
   * 의도 분류 요청 (Intent Router 전용)
   * - recommend()와 동일한 공급자 우선순위 사용
   * - generateRawText()로 raw 응답 → parseIntentResponse()로 파싱
   * - 실패 시 null 반환 (caller가 자체 fallback 처리)
   */
  async classifyIntent(userInput: string): Promise<IntentClassification | null> {
    const systemPrompt = getSystemPromptIntentRouter()
    const { useOllamaForRecommendation } = useSettingsStore.getState()

    // Intent 분류: 단순 JSON 응답이므로 낮은 temperature + 적은 토큰
    const intentOptions = { temperature: 0.1, maxTokens: 1000 }

    const providers = useOllamaForRecommendation
      ? [
          { name: 'ollama', fn: () => ollamaRecommender.generateRawText(systemPrompt, userInput, intentOptions) },
          { name: 'openrouter', fn: () => openRouterRecommender.generateRawText(systemPrompt, userInput, intentOptions) },
        ]
      : [
          { name: 'openrouter', fn: () => openRouterRecommender.generateRawText(systemPrompt, userInput, intentOptions) },
          { name: 'ollama', fn: () => ollamaRecommender.generateRawText(systemPrompt, userInput, intentOptions) },
        ]

    for (const provider of providers) {
      try {
        const rawText = await provider.fn()
        if (!rawText) {
          logger.warn(`[LlmRecommender] classifyIntent: ${provider.name} returned empty`)
          continue
        }

        const classification = parseIntentResponse(rawText)
        if (classification) {
          logger.info('[LlmRecommender] classifyIntent success', {
            provider: provider.name,
            track: classification.track,
            confidence: classification.confidence
          })
          return classification
        }

        logger.warn(`[LlmRecommender] classifyIntent: ${provider.name} response parsing failed`)
      } catch (error) {
        logger.warn(`[LlmRecommender] classifyIntent: ${provider.name} failed`, {
          error: error instanceof Error ? error.message : 'Unknown'
        })
      }
    }

    logger.warn('[LlmRecommender] classifyIntent: all providers failed')
    return null
  }

  /**
   * Keyword 기반 fallback
   */
  private useKeywordFallback(userInput: string): LlmRecommendationResult {
    logger.info('[LlmRecommender] AI failed or unavailable, using keyword-based fallback')
    const { recommendation, responseText } = ollamaRecommender.keywordBasedRecommend(userInput)
    return { recommendation, responseText, provider: 'keyword' }
  }
}

// ===== Intent 응답 파서 =====

const VALID_TRACKS: ReadonlySet<AnalysisTrack> = new Set([
  'direct-analysis',
  'data-consultation',
  'experiment-design'
])

/**
 * LLM의 의도 분류 응답을 IntentClassification으로 파싱
 * - ```json 블록 또는 직접 JSON 추출
 * - track, confidence 검증
 * - methodId가 STATISTICAL_METHODS에 없으면 null로 교정
 */
export function parseIntentResponse(response: string): IntentClassification | null {
  try {
    // 1. JSON 추출: ```json 블록 우선, 없으면 직접 JSON
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    let jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

    if (!jsonStr) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      jsonStr = jsonMatch ? jsonMatch[0] : null
    }

    if (!jsonStr) {
      logger.warn('[parseIntentResponse] No JSON found in response')
      return null
    }

    const parsed: unknown = JSON.parse(jsonStr)
    if (typeof parsed !== 'object' || parsed === null) return null

    const obj = parsed as Record<string, unknown>

    // 2. track 검증
    if (typeof obj.track !== 'string' || !VALID_TRACKS.has(obj.track as AnalysisTrack)) {
      logger.warn('[parseIntentResponse] Invalid track value', { track: obj.track })
      return null
    }
    const track = obj.track as AnalysisTrack

    // 3. confidence 검증 (기본값 0.7)
    let confidence = typeof obj.confidence === 'number' ? obj.confidence : 0.7
    confidence = Math.max(0, Math.min(1, confidence))

    // 4. methodId 검증 — STATISTICAL_METHODS에 없으면 null로 교정
    let methodId: string | null = null
    if (typeof obj.methodId === 'string' && obj.methodId) {
      methodId = STATISTICAL_METHODS[obj.methodId] ? obj.methodId : null
    }

    // 5. reasoning
    const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning : '분류됨'

    return { track, confidence, methodId, reasoning }
  } catch {
    logger.warn('[parseIntentResponse] JSON parsing failed')
    return null
  }
}

export const llmRecommender = new LlmRecommender()
