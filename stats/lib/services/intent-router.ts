/**
 * Intent Router - 사용자 입력을 3가지 트랙으로 분류
 *
 * Strategy: 키워드 우선 (1ms 이내), LLM fallback (애매한 경우)
 *
 * Track 1: direct-analysis — 특정 통계 방법을 이미 알고 바로 실행
 * Track 2: data-consultation — 데이터를 넣고 AI와 상담
 * Track 3: experiment-design — 실험 설계, 표본 크기, 검정력 분석
 */

import { STATISTICAL_METHODS, getKoreanName } from '@/lib/constants/statistical-methods'
import { llmRecommender } from '@/lib/services/llm-recommender'
import { getSystemPromptIntentRouter } from '@/lib/services/ai/prompts'
import { logger } from '@/lib/utils/logger'
import type { AnalysisTrack, ResolvedIntent, StatisticalMethod } from '@/types/smart-flow'

// ===== 키워드 패턴 =====

/** 메서드 ID → 매칭 패턴 자동 생성 */
function buildMethodPatterns(): Map<string, RegExp> {
  const patterns = new Map<string, RegExp>()

  for (const [id, method] of Object.entries(STATISTICAL_METHODS)) {
    if (method.hasOwnPage === false && !method.parentPageId) continue

    const terms: string[] = []

    // 영어 이름
    terms.push(escapeRegex(method.name))
    // 한글 이름
    const korName = method.koreanName || getKoreanName(id)
    if (korName) terms.push(escapeRegex(korName))
    // ID 자체 (e.g., "t-test")
    terms.push(escapeRegex(id))
    // aliases
    if (method.aliases) {
      for (const alias of method.aliases) {
        terms.push(escapeRegex(alias))
      }
    }

    if (terms.length > 0) {
      patterns.set(id, new RegExp(terms.join('|'), 'i'))
    }
  }

  return patterns
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

let _methodPatterns: Map<string, RegExp> | null = null
function getMethodPatterns(): Map<string, RegExp> {
  if (!_methodPatterns) {
    _methodPatterns = buildMethodPatterns()
  }
  return _methodPatterns
}

/** Track 3: 실험 설계 키워드 */
const EXPERIMENT_DESIGN_PATTERNS: RegExp[] = [
  /표본\s*크기|sample\s*size/i,
  /검정력\s*(분석)?|power\s*(analysis)?/i,
  /실험\s*설계|experimental\s*design/i,
  /몇\s*(명|마리|개|미|반복)\s*(필요|이\s*필요|이면|정도)/i,
  /필요한\s*(표본|수|개체|샘플)/i,
  /효과\s*크기|effect\s*size/i,
  /최소\s*표본|최소\s*샘플/i,
  /사전\s*검정력|a[\s-]?priori/i,
]

/** Track 2: 데이터 상담 키워드 (모호한 질문, 도움 요청) */
const DATA_CONSULTATION_PATTERNS: RegExp[] = [
  /어떤\s*(분석|방법|검정|통계)/i,
  /뭘\s*(해야|하면|써야)/i,
  /추천|recommend|suggest/i,
  /도와|도움|help/i,
  /적합한|적절한|알맞은|좋은\s*방법/i,
  /모르겠|잘\s*모르/i,
  /상담|가이드|안내/i,
  /데이터.*분석|분석.*데이터/i,
  /어떻게\s*(분석|비교|검정)/i,
]

/** Track 1 강화: 직접 실행 의도 키워드 */
const DIRECT_INTENT_PATTERNS: RegExp[] = [
  /(을|를)\s*(하고|돌리고|실행|해)\s*(싶|줘)/i,
  /바로\s*(실행|분석|시작)/i,
  /빠른\s*분석/i,
  /run|execute|perform/i,
]

// ===== Intent Router =====

class IntentRouterService {
  /**
   * 사용자 입력을 3가지 트랙으로 분류
   */
  async classify(
    userInput: string,
    context?: { hasData: boolean }
  ): Promise<ResolvedIntent> {
    const input = userInput.trim()
    if (!input) {
      return this.createFallback('data-consultation')
    }

    // 1차: 키워드 기반 분류 (즉시)
    const keywordResult = this.classifyByKeyword(input)
    if (keywordResult && keywordResult.confidence >= 0.7) {
      logger.debug('[IntentRouter] Keyword match', {
        track: keywordResult.track,
        confidence: keywordResult.confidence
      })
      return keywordResult
    }

    // 2차: LLM 분류 (네트워크 호출)
    try {
      const llmResult = await this.classifyByLLM(input, context)
      if (llmResult) {
        logger.debug('[IntentRouter] LLM classification', {
          track: llmResult.track,
          confidence: llmResult.confidence
        })
        return llmResult
      }
    } catch (error) {
      logger.error('[IntentRouter] LLM classification failed', { error })
    }

    // 3차: 키워드 결과가 있으면 (낮은 confidence라도) 사용
    if (keywordResult) {
      return keywordResult
    }

    // 최종 fallback: 데이터 상담
    return this.createFallback('data-consultation')
  }

  /**
   * 키워드 기반 즉시 분류
   */
  private classifyByKeyword(input: string): ResolvedIntent | null {
    // Track 3: 실험 설계 (최우선 체크 — 고유한 키워드)
    for (const pattern of EXPERIMENT_DESIGN_PATTERNS) {
      if (pattern.test(input)) {
        return {
          track: 'experiment-design',
          confidence: 0.9,
          method: null,
          reasoning: '실험 설계 관련 키워드 감지',
          needsData: false,
          provider: 'keyword'
        }
      }
    }

    // Track 1: 직접 분석 (특정 메서드명 감지)
    const methodMatch = this.findMethodInInput(input)
    if (methodMatch) {
      const hasDirectIntent = DIRECT_INTENT_PATTERNS.some(p => p.test(input))
      return {
        track: 'direct-analysis',
        confidence: hasDirectIntent ? 0.95 : 0.8,
        method: methodMatch,
        reasoning: `'${methodMatch.name}' 분석 방법 감지`,
        needsData: true,
        provider: 'keyword'
      }
    }

    // Track 2: 데이터 상담 (모호한 질문)
    const consultationScore = DATA_CONSULTATION_PATTERNS.reduce(
      (score, pattern) => score + (pattern.test(input) ? 1 : 0),
      0
    )
    if (consultationScore >= 1) {
      return {
        track: 'data-consultation',
        confidence: Math.min(0.5 + consultationScore * 0.15, 0.9),
        method: null,
        reasoning: '데이터 상담/분석 도움 요청 감지',
        needsData: true,
        provider: 'keyword'
      }
    }

    return null
  }

  /**
   * 입력에서 특정 통계 메서드 감지
   */
  private findMethodInInput(input: string): StatisticalMethod | null {
    const patterns = getMethodPatterns()

    for (const [id, pattern] of patterns) {
      if (pattern.test(input)) {
        const method = STATISTICAL_METHODS[id]
        if (method) {
          return {
            id: method.id,
            name: method.name,
            description: method.description,
            category: method.category
          }
        }
      }
    }

    return null
  }

  /**
   * LLM 기반 분류 (기존 llmRecommender 인프라 재사용)
   */
  private async classifyByLLM(
    input: string,
    context?: { hasData: boolean }
  ): Promise<ResolvedIntent | null> {
    const result = await llmRecommender.recommend(input, null, null, null)

    if (result.recommendation?.method) {
      // LLM이 구체적 메서드를 추천함 → 직접 분석
      return {
        track: 'direct-analysis',
        confidence: result.recommendation.confidence,
        method: result.recommendation.method,
        reasoning: result.responseText || 'AI 분석 방법 추천',
        needsData: true,
        provider: 'llm'
      }
    }

    // LLM이 메서드를 특정하지 못함 → 데이터 상담
    return {
      track: 'data-consultation',
      confidence: 0.6,
      method: null,
      reasoning: result.responseText || '추가 정보가 필요합니다',
      needsData: true,
      provider: 'llm'
    }
  }

  private createFallback(track: AnalysisTrack): ResolvedIntent {
    return {
      track,
      confidence: 0.5,
      method: null,
      reasoning: '기본 경로',
      needsData: track !== 'experiment-design',
      provider: 'keyword'
    }
  }
}

export const intentRouter = new IntentRouterService()
