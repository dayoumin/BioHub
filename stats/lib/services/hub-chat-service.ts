/**
 * Hub Chat Service — 허브 전용 AI 채팅 오케스트레이터
 *
 * 데이터 유무에 따라 시스템 프롬프트 분기:
 * - 데이터 없음 → CONSULTANT (키워드 매칭 + 일반 추천)
 * - 데이터 있음 → DIAGNOSTIC (데이터 기반 정밀 추천)
 *
 * 대화 히스토리(최근 4개)를 LLM 컨텍스트에 포함.
 */

import { openRouterRecommender } from './recommenders/openrouter-recommender'
import { getSystemPromptConsultant, getSystemPromptDiagnostic } from './ai/prompts'
import { buildContextForIntent, buildDiagnosticReportMarkdown } from './ai/data-context-builder'
import { runDiagnosticPipeline, resumeDiagnosticPipeline } from './diagnostic-pipeline'
import type { DiagnosticPipelineInput, DiagnosticStatusCallback } from './diagnostic-pipeline'
import { logger } from '@/lib/utils/logger'
import { compressChatHistory } from './ai/chat-history-compressor'
import type { HubChatMessage, HubDataContext } from '@/lib/stores/hub-chat-store'
import type { AIRecommendation, ResolvedIntent, FlowChatMessage, DiagnosticReport, DataRow } from '@/types/analysis'

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

export interface HubDiagnosticRequest {
  userMessage: string
  intent: ResolvedIntent
  dataContext: HubDataContext
  chatHistory: HubChatMessage[]
  /** analysis-store의 실제 데이터 행 */
  data: readonly DataRow[]
  /** analysis-store의 uploadNonce */
  uploadNonce: number
  /** Pipeline 진행 상태 콜백 */
  onStatus?: DiagnosticStatusCallback
}

export interface HubDiagnosticResponse extends HubChatResponse {
  diagnosticReport: DiagnosticReport
}

// ===== Internal Helpers =====

/** 대화 히스토리 압축 → FlowChatMessage 변환 (openRouterRecommender 호환) */
function prepareFlowHistory(chatHistory: HubChatMessage[]): FlowChatMessage[] {
  const filtered = chatHistory.filter((m) => m.role !== 'system')
  const { messages: compressed } = compressChatHistory(
    filtered.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content, isError: m.isError }))
  )
  return compressed.map((m, i) => ({
    id: `compressed-${i}`,
    role: m.role,
    content: m.content,
  }))
}

/** 진단 리포트 기반 LLM 2차 호출 (추천 생성) */
async function callRecommenderWithDiagnosticContext(
  userMessage: string,
  chatHistory: HubChatMessage[],
  dataContext: HubDataContext,
  report: DiagnosticReport,
  intent: ResolvedIntent,
): Promise<{ content: string; recommendation: AIRecommendation | null }> {
  const flowHistory = prepareFlowHistory(chatHistory)
  const reportMarkdown = buildDiagnosticReportMarkdown(report)
  const dataContextMarkdown = buildContextForIntent(intent.track, dataContext.validationResults)
  const enrichedContext = `${dataContextMarkdown}\n\n${reportMarkdown}`

  const result = await openRouterRecommender.recommendWithSystemPrompt(
    userMessage,
    getSystemPromptDiagnostic(),
    dataContext.validationResults,
    null,
    null,
    { chatHistory: flowHistory, dataContextOverride: enrichedContext },
  )

  return {
    content: result.responseText || '추천 결과를 생성하지 못했습니다.',
    recommendation: result.recommendation,
  }
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
  const flowHistory = prepareFlowHistory(chatHistory)
  const hasData = dataContext !== null

  const systemPrompt = hasData
    ? getSystemPromptDiagnostic()
    : getSystemPromptConsultant()

  const dataContextMarkdown = hasData
    ? buildContextForIntent(intent.track, dataContext.validationResults)
    : undefined

  try {
    const result = await openRouterRecommender.recommendWithSystemPrompt(
      userMessage,
      systemPrompt,
      hasData ? dataContext.validationResults : null,
      null,
      null,
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

/**
 * 허브 Diagnostic Pipeline 응답 생성
 *
 * 데이터 + 분석 요청 시:
 *   1. DiagnosticPipeline 실행 (기초통계 → 변수탐지 → 가정검정)
 *   2. pendingClarification이면 진단 카드 + 질문만 반환
 *   3. 완료되면 LLM 2차 호출 (진단 리포트 컨텍스트 + 최종 추천)
 */
export async function getHubDiagnosticResponse(
  request: HubDiagnosticRequest,
): Promise<HubDiagnosticResponse> {
  const { userMessage, intent, dataContext, chatHistory, data, uploadNonce, onStatus } = request

  // ── Pipeline 실행 ──
  const pipelineInput: DiagnosticPipelineInput = {
    userMessage,
    data,
    validationResults: dataContext.validationResults,
    chatHistory,
    uploadNonce,
  }

  const report = await runDiagnosticPipeline(pipelineInput, onStatus)

  // pendingClarification이면 질문만 반환 (LLM 2차 호출 불필요)
  if (report.pendingClarification) {
    return {
      content: report.pendingClarification.question,
      recommendation: null,
      diagnosticReport: report,
    }
  }

  // ── LLM 2차 호출 ──
  onStatus?.('추천 생성 중...')
  try {
    const { content, recommendation } = await callRecommenderWithDiagnosticContext(
      userMessage, chatHistory, dataContext, report, intent,
    )
    return { content, recommendation, diagnosticReport: report }
  } catch (error) {
    logger.error('[HubChatService] Diagnostic AI response failed', { error })
    return {
      content: 'AI 추천 생성 중 오류가 발생했습니다. 진단 결과를 참고하여 직접 분석 방법을 선택해 주세요.',
      recommendation: null,
      diagnosticReport: report,
    }
  }
}

/**
 * 허브 Diagnostic Pipeline resume (pendingClarification 답변)
 */
export async function getHubDiagnosticResumeResponse(
  previousReport: DiagnosticReport,
  userAnswer: string,
  request: Omit<HubDiagnosticRequest, 'userMessage'>,
): Promise<HubDiagnosticResponse> {
  const { intent, dataContext, chatHistory, data, onStatus } = request

  const report = await resumeDiagnosticPipeline(
    previousReport,
    userAnswer,
    data,
    dataContext.validationResults,
    onStatus,
  )

  // 여전히 미해결이면 다시 질문
  if (report.pendingClarification) {
    return {
      content: report.pendingClarification.question,
      recommendation: null,
      diagnosticReport: report,
    }
  }

  // 해결됨 → LLM 2차 호출
  onStatus?.('추천 생성 중...')
  try {
    const { content, recommendation } = await callRecommenderWithDiagnosticContext(
      userAnswer, chatHistory, dataContext, report, intent,
    )
    return { content, recommendation, diagnosticReport: report }
  } catch (error) {
    logger.error('[HubChatService] Diagnostic resume AI response failed', { error })
    return {
      content: 'AI 추천 생성 중 오류가 발생했습니다. 진단 결과를 참고해 주세요.',
      recommendation: null,
      diagnosticReport: report,
    }
  }
}
