/**
 * Hub Chat Service — 허브 전용 AI 채팅 오케스트레이터
 *
 * 데이터 유무에 따라 시스템 프롬프트 분기:
 * - 데이터 없음 → CONSULTANT (키워드 매칭 + 일반 추천)
 * - 데이터 있음 → DIAGNOSTIC (데이터 기반 정밀 추천)
 *
 * 대화 히스토리(최근 4개)를 LLM 컨텍스트에 포함.
 */

import { openRouterRecommender } from './openrouter-recommender'
import { getSystemPromptConsultant, getSystemPromptDiagnostic } from './ai/prompts'
import { buildContextForIntent } from './ai/data-context-builder'
import { logger } from '@/lib/utils/logger'
import type { HubChatMessage, HubDataContext } from '@/lib/stores/hub-chat-store'
import type { AIRecommendation, ResolvedIntent, FlowChatMessage } from '@/types/analysis'

// ===== Types =====

export interface HubChatRequest {
  userMessage: string
  intent: ResolvedIntent
  dataContext: HubDataContext | null
  chatHistory: HubChatMessage[]
}

export interface HubChatResponse {
  /** AI 응답 텍스트 */
  content: string
  /** 구조화된 추천 (있으면) */
  recommendation: AIRecommendation | null
}

// ===== Service =====

/**
 * 허브 AI 응답 생성
 *
 * 데이터 컨텍스트 유무에 따라 프롬프트 분기.
 * chatHistory에서 최근 4개 메시지를 LLM에 전달.
 */
export async function getHubAiResponse(request: HubChatRequest): Promise<HubChatResponse> {
  const { userMessage, intent, dataContext, chatHistory } = request

  // 대화 히스토리 → FlowChatMessage 변환 (openRouterRecommender 호환)
  const flowHistory: FlowChatMessage[] = chatHistory
    .filter((m) => m.role !== 'system' && !m.isError)
    .slice(-4)
    .map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  const hasData = dataContext !== null

  // 프롬프트 선택
  const systemPrompt = hasData
    ? getSystemPromptDiagnostic()
    : getSystemPromptConsultant()

  // intent별 경량화: track에 따라 컨텍스트 크기를 조절
  // - direct-analysis / data-consultation: 전체 통계 (~1300 토큰)
  // - visualization: 변수 범위 + 타입 중심 (~400 토큰)
  // - experiment-design: 행/열 + 변수명만 (~120 토큰)
  const dataContextMarkdown = hasData
    ? buildContextForIntent(intent.track, dataContext.validationResults)
    : undefined

  try {
    const result = await openRouterRecommender.recommendWithSystemPrompt(
      userMessage,
      systemPrompt,
      hasData ? dataContext.validationResults : null, // validColumnNames 검증용
      null, // assumptionResults — 허브에서는 아직 없음
      null, // data rows — 전송하지 않음
      { chatHistory: flowHistory, dataContextOverride: dataContextMarkdown }
    )

    return {
      content: result.responseText || '추천 결과를 생성하지 못했습니다.',
      recommendation: result.recommendation,
    }
  } catch (error) {
    logger.error('[HubChatService] AI response failed', { error })
    return {
      content: 'AI 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
      recommendation: null,
    }
  }
}
