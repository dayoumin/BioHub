/**
 * Claude API Provider
 *
 * Anthropic Claude API를 사용하는 RAG 제공자
 * - 임베딩: 없음 (Claude가 직접 문서 이해)
 * - 추론: Claude 3.5 Sonnet
 */

import { BaseRAGProvider, RAGContext, RAGResponse, RAGProviderConfig } from './base-provider'

export interface ClaudeProviderConfig extends RAGProviderConfig {
  /** Claude API 키 */
  apiKey: string
  /** 사용할 모델 (기본: claude-3-5-sonnet-20241022) */
  model?: string
  /** 최대 토큰 (기본: 4096) */
  maxTokens?: number
}

export class ClaudeRAGProvider extends BaseRAGProvider {
  private apiKey: string
  private model: string
  private maxTokens: number

  constructor(config: ClaudeProviderConfig) {
    super(config)

    this.apiKey = config.apiKey
    this.model = config.model || 'claude-3-5-sonnet-20241022'
    this.maxTokens = config.maxTokens || 4096
  }

  async initialize(): Promise<void> {
    // Claude API는 초기화 불필요
    if (!this.apiKey) {
      throw new Error('Claude API key가 설정되지 않았습니다')
    }
  }

  async isReady(): Promise<boolean> {
    // API 키가 있으면 준비됨
    return !!this.apiKey
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    const startTime = Date.now()

    try {
      // 프롬프트 구성
      const systemPrompt = this.buildSystemPrompt(context)
      const userMessage = context.query

      // Claude API 호출
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: this.maxTokens,
          system: systemPrompt,
          messages: [
            ...(context.conversationHistory || []),
            {
              role: 'user',
              content: userMessage
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Claude API 오류: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      return {
        answer: data.content[0].text,
        model: {
          provider: 'Claude',
          inference: this.model
        },
        metadata: {
          tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
          responseTime
        }
      }
    } catch (error) {
      throw new Error(
        `Claude Provider 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    }
  }

  /**
   * 시스템 프롬프트 생성
   */
  private buildSystemPrompt(context: RAGContext): string {
    let prompt = `당신은 통계 분석 전문가입니다. 사용자의 질문에 정확하고 친절하게 답변해주세요.`

    // 메서드별 컨텍스트 추가
    if (context.method) {
      prompt += `\n\n현재 사용자가 사용 중인 통계 메서드: ${context.method}`
    }

    // 분석 데이터 컨텍스트 추가 (선택)
    if (context.analysisData) {
      prompt += `\n\n분석 데이터 정보가 제공되었습니다. 필요 시 참고하세요.`
    }

    return prompt
  }
}
