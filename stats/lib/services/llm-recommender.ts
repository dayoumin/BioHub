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
  StatisticalAssumptions,
  ValidationResults,
  DataRow
} from '@/types/smart-flow'
import { openRouterRecommender } from './openrouter-recommender'
import { ollamaRecommender } from './ollama-recommender'
import { logger } from '@/lib/utils/logger'
import { useSettingsStore } from '@/lib/stores/settings-store'
import {
  getSystemPromptConsultant,
  getSystemPromptDiagnostic
} from './ai/prompts'

export type LlmProvider = 'openrouter' | 'ollama' | 'keyword'

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
    data: DataRow[] | null = null
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
        userInput, systemPrompt, validationResults, assumptionResults, data
      )
      if (openRouterResult) return openRouterResult
    } else {
      const openRouterResult = await this.tryOpenRouter(
        userInput, systemPrompt, validationResults, assumptionResults, data
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
   * 자연어 입력 기반 추천 (하위 호환성)
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult> {
    return this.recommend(userInput, validationResults, assumptionResults, data)
  }

  /**
   * OpenRouter 시도
   */
  private async tryOpenRouter(
    userInput: string,
    systemPrompt: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult | null> {
    try {
      const isAvailable = await openRouterRecommender.checkHealth()
      if (!isAvailable) return null

      logger.info('[LlmRecommender] Trying OpenRouter...')

      const { recommendation, responseText } = await openRouterRecommender.recommendWithSystemPrompt(
        userInput, systemPrompt, validationResults, assumptionResults, data
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
        userInput, systemPrompt, validationResults, assumptionResults, data
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
      { temperature: 0.3, maxTokens: 4000 }
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
   * Keyword 기반 fallback
   */
  private useKeywordFallback(userInput: string): LlmRecommendationResult {
    logger.info('[LlmRecommender] AI failed or unavailable, using keyword-based fallback')
    const { recommendation, responseText } = ollamaRecommender.keywordBasedRecommend(userInput)
    return { recommendation, responseText, provider: 'keyword' }
  }
}

export const llmRecommender = new LlmRecommender()
