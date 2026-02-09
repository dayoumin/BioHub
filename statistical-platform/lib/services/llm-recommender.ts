/**
 * 통합 LLM 추천 서비스 (Strategy 패턴)
 *
 * Fallback 체인: OpenRouter → Ollama → Keyword
 * - OpenRouter: 클라우드 LLM (NEXT_PUBLIC_OPENROUTER_API_KEY 필요)
 * - Ollama: 로컬 LLM (Ollama 서버 필요)
 * - Keyword: 키워드 기반 매칭 (항상 사용 가능)
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

export type LlmProvider = 'openrouter' | 'ollama' | 'keyword'

export interface LlmRecommendationResult {
  recommendation: AIRecommendation | null
  responseText: string
  provider: LlmProvider
}

export class LlmRecommender {
  /**
   * 자연어 입력 기반 추천 (자동 fallback 체인)
   *
   * 1. OpenRouter (API 키 있으면)
   * 2. Ollama (로컬 서버 있으면)
   * 3. Keyword (항상 동작)
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult> {
    // 1단계: OpenRouter 시도
    const openRouterResult = await this.tryOpenRouter(
      userInput, validationResults, assumptionResults, data
    )
    if (openRouterResult) return openRouterResult

    // 2단계: Ollama 시도
    const ollamaResult = await this.tryOllama(
      userInput, validationResults, assumptionResults, data
    )
    if (ollamaResult) return ollamaResult

    // 3단계: Keyword fallback (항상 성공)
    return this.useKeywordFallback(userInput)
  }

  /**
   * 현재 사용 가능한 provider 확인 (UI 표시용)
   */
  async getAvailableProvider(): Promise<LlmProvider> {
    const openRouterAvailable = await openRouterRecommender.checkHealth()
    if (openRouterAvailable) return 'openrouter'

    const ollamaAvailable = await ollamaRecommender.checkHealth()
    if (ollamaAvailable) return 'ollama'

    return 'keyword'
  }

  /**
   * OpenRouter 시도
   */
  private async tryOpenRouter(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult | null> {
    try {
      const isAvailable = await openRouterRecommender.checkHealth()
      if (!isAvailable) return null

      logger.info('[LlmRecommender] Trying OpenRouter...')

      const { recommendation, responseText } = await openRouterRecommender.recommendFromNaturalLanguage(
        userInput, validationResults, assumptionResults, data
      )

      if (recommendation) {
        logger.info('[LlmRecommender] OpenRouter succeeded', {
          methodId: recommendation.method.id
        })
        return { recommendation, responseText, provider: 'openrouter' }
      }

      // 응답은 있지만 파싱 실패 → fallback
      logger.warn('[LlmRecommender] OpenRouter parsing failed, falling back')
      return null
    } catch (error) {
      logger.warn('[LlmRecommender] OpenRouter failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      })
      return null
    }
  }

  /**
   * Ollama 시도
   */
  private async tryOllama(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<LlmRecommendationResult | null> {
    try {
      const isAvailable = await ollamaRecommender.checkHealth()
      if (!isAvailable) return null

      logger.info('[LlmRecommender] Trying Ollama...')

      const { recommendation, responseText } = await ollamaRecommender.recommendFromNaturalLanguage(
        userInput, validationResults, assumptionResults, data
      )

      if (recommendation) {
        logger.info('[LlmRecommender] Ollama succeeded', {
          methodId: recommendation.method.id
        })
        return { recommendation, responseText, provider: 'ollama' }
      }

      logger.warn('[LlmRecommender] Ollama parsing failed, falling back')
      return null
    } catch (error) {
      logger.warn('[LlmRecommender] Ollama failed', {
        error: error instanceof Error ? error.message : 'Unknown'
      })
      return null
    }
  }

  /**
   * Keyword 기반 fallback (항상 성공)
   */
  private useKeywordFallback(userInput: string): LlmRecommendationResult {
    logger.info('[LlmRecommender] Using keyword-based fallback')

    const { recommendation, responseText } = ollamaRecommender.keywordBasedRecommend(userInput)

    return { recommendation, responseText, provider: 'keyword' }
  }
}

// 싱글톤 인스턴스
export const llmRecommender = new LlmRecommender()
