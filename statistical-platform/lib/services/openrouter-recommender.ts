/**
 * OpenRouter API 기반 통계 분석 추천 서비스
 *
 * - OpenRouter API (OpenAI-compatible) 호출
 * - 데이터 컨텍스트 (ValidationResults 집계 통계) + 사용자 자연어 입력 → 추천
 * - 원시 데이터 행은 전송하지 않음 (프라이버시 보호)
 * - Health check + 5분 캐싱
 * - 범용 스트리밍 Chat Completion (결과 해석 등에서 재사용)
 */

import type {
  AIRecommendation,
  StatisticalAssumptions,
  StatisticalMethod,
  ValidationResults,
  DataRow,
  ColumnStatistics
} from '@/types/smart-flow'
import {
  STATISTICAL_METHODS,
  getMethodByIdOrAlias,
  getKoreanName
} from '@/lib/constants/statistical-methods'
import { logger } from '@/lib/utils/logger'
import {
  AnonymizationService,
  ResponseDeanonymizer,
  type AnonymizationMapping
} from './anonymization'

/**
 * 기본 모델 Fallback 체인 (무료 모델 우선)
 * - 무료 모델은 언제든 중단될 수 있으므로 여러 개 지정
 * - env에서 쉼표 구분으로 오버라이드 가능
 */
const DEFAULT_MODELS = [
  'z-ai/glm-4.5-air:free',               // 131K context, CJK 언어 우수, JSON 출력 정확
  'tngtech/deepseek-r1t-chimera:free',    // 164K context, 한국어+JSON 정확
  'tngtech/deepseek-r1t2-chimera:free',   // 164K context, thinking 모델 (content 비어있을 수 있음)
]

interface OpenRouterConfig {
  apiKey: string
  models: string[]
  baseUrl: string
  temperature: number
  maxTokens: number
  timeout: number
}

interface HealthCache {
  isAvailable: boolean
  timestamp: number
  ttl: number
}

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  id: string
  model?: string
  choices: Array<{
    message: {
      role: string
      content: string
      /** thinking 모델 (DeepSeek R1 등)의 추론 과정 */
      reasoning_content?: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class OpenRouterRecommender {
  private config: OpenRouterConfig

  private healthCache: HealthCache | null = null

  private cachedSystemPrompt: string | null = null

  constructor() {
    const envModels = process.env.NEXT_PUBLIC_OPENROUTER_MODEL
    const models = envModels
      ? envModels.split(',').map(m => m.trim()).filter(Boolean)
      : DEFAULT_MODELS

    this.config = {
      apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',
      models,
      baseUrl: 'https://openrouter.ai/api/v1',
      temperature: 0.2,
      maxTokens: 2000,
      timeout: 30000
    }
  }

  /**
   * Health check: API 키 존재 여부 확인 + 캐싱
   */
  async checkHealth(): Promise<boolean> {
    // 캐시 체크
    if (this.healthCache && Date.now() - this.healthCache.timestamp < this.healthCache.ttl) {
      return this.healthCache.isAvailable
    }

    const hasApiKey = !!this.config.apiKey && this.config.apiKey !== 'your_openrouter_api_key_here'

    if (!hasApiKey) {
      this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
      logger.info('[OpenRouter] No API key configured')
      return false
    }

    // API 키가 있으면 사용 가능으로 판단 (실제 요청 시 실패하면 fallback)
    this.healthCache = { isAvailable: true, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
    logger.info('[OpenRouter] API key found, provider available')
    return true
  }

  /**
   * 캐시 무효화
   */
  clearHealthCache(): void {
    this.healthCache = null
  }

  /**
   * 자연어 입력 기반 추천 (모델 fallback 체인)
   * - 모델 순서대로 시도, 실패(429/503/모델 삭제 등) 시 다음 모델로
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    _data: DataRow[] | null
  ): Promise<{ recommendation: AIRecommendation | null; responseText: string }> {
    // ✅ 1단계: 익명화 수행
    const anonymizationResult = AnonymizationService.anonymize(validationResults, 20)
    const anonymizedValidation = anonymizationResult?.anonymized || validationResults
    const mapping = anonymizationResult?.mapping

    logger.info('[OpenRouter] Anonymization applied', {
      hasMapping: !!mapping,
      anonymizedVars: mapping?.variables.length || 0
    })

    const systemPrompt = this.getSystemPrompt()
    const userPrompt = this.buildUserPrompt(userInput, anonymizedValidation, assumptionResults)

    // 실제 컬럼명 세트 (변수 검증용) - 익명화된 이름 사용
    const validColumnNames = new Set(
      (anonymizedValidation?.columns || []).map((c: ColumnStatistics) => c.name)
    )

    // 모델 fallback 체인: 순서대로 시도
    for (let i = 0; i < this.config.models.length; i++) {
      const model = this.config.models[i]
      try {
        const result = await this.callModel(model, systemPrompt, userPrompt)
        if (result) {
          // 변수 할당 검증: 실제 데이터에 존재하지 않는 변수명 필터링
          if (result.recommendation?.variableAssignments && validColumnNames.size > 0) {
            result.recommendation.variableAssignments = this.filterInvalidVariables(
              result.recommendation.variableAssignments,
              validColumnNames
            )
          }

          // ✅ 2단계: 응답 역변환 (익명화된 변수명 → 원본)
          if (result.recommendation && mapping) {
            result.recommendation = ResponseDeanonymizer.deanonymizeRecommendation(
              result.recommendation,
              mapping
            )
            // responseText도 역변환
            result.responseText = ResponseDeanonymizer.deanonymizeText(
              result.responseText,
              mapping
            )
          }

          return result
        }
        // 응답은 받았지만 파싱 실패 → 다음 모델 시도
        logger.warn(`[OpenRouter] Model ${model} response parsing failed, trying next`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown'
        const isLastModel = i === this.config.models.length - 1

        // 429 Rate Limit: 로그에 명확한 메시지
        if (msg.includes('429')) {
          logger.warn(`[OpenRouter] Model ${model} rate limited (429)`)
        }

        if (isLastModel) {
          logger.error(`[OpenRouter] All ${this.config.models.length} models failed`, { lastError: msg })
          return { recommendation: null, responseText: '' }
        }

        logger.warn(`[OpenRouter] Model ${model} failed (${msg}), trying next model`)
      }
    }

    return { recommendation: null, responseText: '' }
  }

  /**
   * 단일 모델에 API 호출
   * - 성공 시 결과 반환, 파싱 실패 시 null, 네트워크/API 에러 시 throw
   */
  private async callModel(
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ recommendation: AIRecommendation | null; responseText: string } | null> {
    logger.info('[OpenRouter] Trying model', { model })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Statistical Analysis Platform'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ] satisfies OpenRouterMessage[],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      // 인증 실패 시 전체 캐시 무효화 (다른 모델도 같은 키 사용)
      if (response.status === 401 || response.status === 403) {
        this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 1 * 60 * 1000 }
      }
      throw new Error(`API ${response.status}: ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()
    const msg = data.choices?.[0]?.message
    // thinking 모델(DeepSeek R1 등)은 content가 빈 문자열이고 reasoning_content에 응답이 들어감
    const content = msg?.content?.trim() || msg?.reasoning_content || ''

    logger.info('[OpenRouter] Response received', {
      model: data.model || model,
      tokens: data.usage?.total_tokens,
      contentLength: content.length,
      usedReasoning: !msg?.content?.trim() && !!msg?.reasoning_content
    })

    const recommendation = this.parseResponse(content)
    const responseText = this.extractExplanationText(content)

    if (!recommendation) {
      logger.warn('[OpenRouter] Response received but JSON parsing failed', {
        model: data.model || model,
        responsePreview: content.substring(0, 200)
      })
      return null
    }

    return { recommendation, responseText }
  }

  /**
   * 시스템 프롬프트 (STATISTICAL_METHODS에서 동적 생성, 캐싱)
   */
  private getSystemPrompt(): string {
    if (this.cachedSystemPrompt) return this.cachedSystemPrompt

    // 카테고리 오버뷰 제외, 실제 분석 가능한 메서드만 포함
    const methods = Object.entries(STATISTICAL_METHODS)
      .filter(([id, m]) => {
        // 카테고리 오버뷰 제외 (hasOwnPage=false이면서 parentPageId 없음)
        if (m.hasOwnPage === false && !m.parentPageId) return false
        // non-parametric, chi-square 카테고리 오버뷰 명시적 제외
        if (id === 'non-parametric' || id === 'chi-square') return false
        return true
      })

    // 카테고리별 그룹핑
    const byCategory = new Map<string, string[]>()
    for (const [id, m] of methods) {
      const cat = m.category
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(`- ${id}: ${getKoreanName(id)}`)
    }

    const methodList = Array.from(byCategory.entries())
      .map(([cat, items]) => `### ${cat}\n${items.join('\n')}`)
      .join('\n\n')

    this.cachedSystemPrompt = `당신은 전문 통계 분석 컨설턴트입니다.
사용자의 분석 요구와 데이터 특성을 고려하여 가장 적합한 통계 방법을 추천하세요.

## 응답 규칙
1. 먼저 왜 이 방법을 추천하는지 한국어 2-3문장으로 설명하세요.
2. 그 다음 \`\`\`json 블록으로 추천 결과를 제공하세요.
3. 데이터의 변수 타입, 표본 크기, 통계적 가정 검정 결과를 반드시 고려하세요.
4. 질문이 모호하면 confidence를 0.6-0.7로 낮추고 ambiguityNote에 이유를 명시하세요.

## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["추천 이유 1", "추천 이유 2", "추천 이유 3"],
  "variableAssignments": {
    "dependent": ["실제 컬럼명"],
    "independent": ["실제 컬럼명"],
    "factor": ["실제 컬럼명"],
    "covariate": ["실제 컬럼명"]
  },
  "suggestedSettings": {
    "alpha": 0.05,
    "postHoc": "tukey",
    "alternative": "two-sided"
  },
  "warnings": ["표본 크기 주의사항", "가정 위반 경고"],
  "dataPreprocessing": ["결측치 처리 제안", "이상치 처리 제안"],
  "ambiguityNote": "질문이 모호할 때만 포함 - 어떤 점이 모호한지 설명",
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "이 관점에서 보면: 대안 설명" }
  ]
}
\`\`\`

## 필드 설명
- variableAssignments: 데이터 컬럼명을 통계적 역할에 매핑. 데이터에 존재하는 실제 컬럼명만 사용.
- suggestedSettings: 분석 설정 제안. alpha, postHoc(tukey/bonferroni/scheffe), alternative(two-sided/less/greater).
- warnings: 데이터나 가정 관련 경고 (표본 크기 부족, 정규성 미충족 등). 없으면 빈 배열.
- dataPreprocessing: 전처리 제안 (결측치, 이상치, 변환). 없으면 빈 배열.
- ambiguityNote: 질문이 여러 해석 가능할 때만 포함. 명확한 질문이면 이 필드 생략.
- alternatives: 같은 데이터를 다른 관점에서 분석하는 방법 2-3개. description을 "이 관점에서 보면: ..."으로 시작.

## 사용 가능한 통계 방법 (반드시 아래 ID 중 하나를 사용)

${methodList}

## 주의사항
- methodId는 위 목록에서 정확히 일치하는 ID만 사용하세요.
- confidence: 데이터 적합도 반영 (0.9+ 매우 확신, 0.7-0.9 확신, 0.5-0.7 보통, 모호 시 0.6-0.7)
- alternatives: 2-3개 제시. 질문이 모호하면 각 대안이 어떤 관점인지 명확히 설명.
- variableAssignments에는 데이터 요약에 나온 실제 컬럼명만 사용하세요.
- 반드시 한국어로 응답하세요.`

    return this.cachedSystemPrompt
  }

  /**
   * 사용자 프롬프트 구성 (데이터 컨텍스트 + 질문)
   */
  private buildUserPrompt(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null
  ): string {
    const dataContext = this.buildDataContext(validationResults)
    const assumptionContext = this.buildAssumptionContext(assumptionResults)

    return `${dataContext}

${assumptionContext}

## 사용자 질문
${userInput}`
  }

  /**
   * 데이터 컨텍스트 빌더 (ValidationResults → 마크다운)
   * - 원시 데이터 행은 포함하지 않음 (프라이버시)
   * - 컬럼 최대 20개 제한
   */
  private buildDataContext(validationResults: ValidationResults | null): string {
    if (!validationResults) return '## 데이터 정보\n(데이터가 업로드되지 않았습니다)'

    const columns = validationResults.columns || []
    const numericCols = columns.filter((c: ColumnStatistics) => c.type === 'numeric')
    const categoricalCols = columns.filter((c: ColumnStatistics) => c.type === 'categorical')

    let context = `## 데이터 요약
- 전체: ${validationResults.totalRows ?? 0}행 × ${columns.length}열
- 수치형 변수 (${numericCols.length}개): ${numericCols.slice(0, 10).map((c: ColumnStatistics) => c.name).join(', ')}${numericCols.length > 10 ? ` 외 ${numericCols.length - 10}개` : ''}
- 범주형 변수 (${categoricalCols.length}개): ${categoricalCols.slice(0, 10).map((c: ColumnStatistics) => c.name).join(', ')}${categoricalCols.length > 10 ? ` 외 ${categoricalCols.length - 10}개` : ''}`

    // 변수 상세 통계 (최대 20개, Markdown-KV 형식 — LLM 이해도 최적)
    const displayColumns = columns.slice(0, 20)
    if (displayColumns.length > 0) {
      context += '\n\n## 변수 상세 통계\n'

      for (const col of displayColumns) {
        if (col.type === 'numeric') {
          context += `\n### ${col.name} (수치형)\n`
          if (col.mean !== undefined) context += `- 평균: ${col.mean.toFixed(2)}\n`
          if (col.std !== undefined) context += `- 표준편차: ${col.std.toFixed(2)}\n`
          if (col.min !== undefined && col.max !== undefined) context += `- 범위: ${col.min.toFixed(2)} ~ ${col.max.toFixed(2)}\n`
          if (col.median !== undefined) context += `- 중앙값: ${col.median.toFixed(2)}\n`
          if (col.skewness !== undefined) context += `- 왜도: ${col.skewness.toFixed(2)}\n`
          if (col.kurtosis !== undefined) context += `- 첨도: ${col.kurtosis.toFixed(2)}\n`
          context += `- 고유값: ${col.uniqueValues ?? '-'}\n`
          if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
          if (col.outliers?.length) context += `- 이상치: ${col.outliers.length}개\n`
        } else if (col.type === 'categorical') {
          context += `\n### ${col.name} (범주형)\n`
          context += `- 카테고리 수: ${col.uniqueValues ?? '-'}\n`
          if (col.topCategories?.length) {
            const cats = col.topCategories.slice(0, 6)
              .map(c => `${c.value}(${c.count})`).join(', ')
            context += `- 분포: ${cats}\n`
          }
          if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
        } else {
          context += `\n### ${col.name} (혼합형)\n`
          context += `- 수치값: ${col.numericCount}개, 텍스트: ${col.textCount}개\n`
          context += `- 고유값: ${col.uniqueValues ?? '-'}\n`
          if (col.missingCount) context += `- 결측: ${col.missingCount}\n`
        }
      }

      if (columns.length > 20) {
        context += `\n(외 ${columns.length - 20}개 변수 생략)`
      }
    }

    return context
  }

  /**
   * 가정 검정 결과 컨텍스트
   */
  private buildAssumptionContext(assumptionResults: StatisticalAssumptions | null): string {
    if (!assumptionResults) return '## 통계적 가정 검정\n(가정 검정 미실시)'

    const parts: string[] = []

    if (assumptionResults.normality?.shapiroWilk) {
      const { pValue, isNormal } = assumptionResults.normality.shapiroWilk
      parts.push(`- 정규성: ${isNormal ? '충족' : '미충족'} (Shapiro-Wilk p=${pValue?.toFixed(3) ?? 'N/A'})`)
    }

    if (assumptionResults.homogeneity?.levene) {
      const { pValue, equalVariance } = assumptionResults.homogeneity.levene
      parts.push(`- 등분산성: ${equalVariance ? '충족' : '미충족'} (Levene p=${pValue?.toFixed(3) ?? 'N/A'})`)
    }

    if (parts.length === 0) return '## 통계적 가정 검정\n(가정 검정 결과 없음)'

    return `## 통계적 가정 검정 결과\n${parts.join('\n')}`
  }

  /**
   * LLM 응답에서 설명 텍스트 추출 (JSON 이전 부분)
   */
  private extractExplanationText(content: string): string {
    // 코드블록 우선, 없으면 첫 번째 { ~ 마지막 } (non-greedy 불가하므로 코드블록 패턴만)
    const codeBlockMatch = content.match(/```json[\s\S]*?```/)
    if (codeBlockMatch) {
      const beforeJson = content.substring(0, content.indexOf(codeBlockMatch[0])).trim()
      return beforeJson || content.replace(/```json[\s\S]*?```/, '').trim()
    }

    // 코드블록 없이 JSON만 있는 경우
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const beforeJson = content.substring(0, content.indexOf(jsonMatch[0])).trim()
      return beforeJson || ''
    }

    return content.trim()
  }

  /**
   * LLM 응답 파싱 → AIRecommendation
   */
  private parseResponse(content: string): AIRecommendation | null {
    try {
      // 코드 블록에서 JSON 추출
      const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      let jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

      // 코드 블록 없으면 직접 JSON 찾기
      if (!jsonStr) {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        jsonStr = jsonMatch ? jsonMatch[0] : null
      }

      if (!jsonStr) {
        logger.error('[OpenRouter] No JSON found in response')
        return null
      }

      const parsed = JSON.parse(jsonStr)

      if (!parsed.methodId || !parsed.methodName) {
        logger.error('[OpenRouter] Missing required fields', { parsed })
        return null
      }

      // methodId 유효성 검증
      const methodInfo = getMethodByIdOrAlias(parsed.methodId)
      const category = methodInfo?.category || this.inferCategory(parsed.methodId)

      const recommendation: AIRecommendation = {
        method: {
          id: parsed.methodId,
          name: parsed.methodName,
          description: parsed.reasoning?.[0] || '',
          category
        },
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
        assumptions: Array.isArray(parsed.assumptions)
          ? parsed.assumptions.map((a: { name: string; passed: boolean; pValue?: number }) => ({
              name: a.name,
              passed: a.passed,
              pValue: a.pValue
            }))
          : [],
        alternatives: Array.isArray(parsed.alternatives)
          ? parsed.alternatives.map((alt: { id: string; name: string; description?: string }) => ({
              id: alt.id,
              name: alt.name,
              description: alt.description || '',
              category: getMethodByIdOrAlias(alt.id)?.category || this.inferCategory(alt.id)
            }))
          : [],
        // === LLM Enhanced fields ===
        variableAssignments: parsed.variableAssignments || undefined,
        suggestedSettings: parsed.suggestedSettings || undefined,
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : undefined,
        dataPreprocessing: Array.isArray(parsed.dataPreprocessing) ? parsed.dataPreprocessing : undefined,
        ambiguityNote: typeof parsed.ambiguityNote === 'string' ? parsed.ambiguityNote : undefined,
      }

      logger.info('[OpenRouter] Parsed recommendation', {
        methodId: recommendation.method.id,
        confidence: recommendation.confidence
      })

      return recommendation
    } catch (error) {
      logger.error('[OpenRouter] JSON parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  // ============================================
  // 범용 스트리밍 Chat Completion (결과 해석 등에서 재사용)
  // ============================================

  /**
   * 범용 스트리밍 Chat Completion
   * - 기존 config, headers, 에러처리, 인증실패 캐시무효화 재사용
   * - 모델 fallback 체인 적용
   * - SSE ReadableStream 파싱
   *
   * @param systemPrompt - 시스템 프롬프트
   * @param userPrompt - 사용자 프롬프트
   * @param onChunk - 텍스트 조각 콜백
   * @param signal - AbortSignal (취소용)
   * @param options - 추가 옵션 (temperature, maxTokens)
   * @returns 사용된 모델명
   */
  async streamChatCompletion(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<{ model: string }> {
    const temperature = options?.temperature ?? 0.3
    const maxTokens = options?.maxTokens ?? 2000

    // 모델 fallback 체인
    for (let i = 0; i < this.config.models.length; i++) {
      const model = this.config.models[i]
      try {
        const result = await this.streamWithModel(
          model, systemPrompt, userPrompt, onChunk, signal, temperature, maxTokens
        )
        if (result) return result
        logger.warn(`[OpenRouter Stream] Model ${model} failed to stream, trying next`)
      } catch (error) {
        if (signal?.aborted) throw error // 사용자 취소는 즉시 전파

        const msg = error instanceof Error ? error.message : 'Unknown'
        const isLastModel = i === this.config.models.length - 1

        if (isLastModel) {
          logger.error(`[OpenRouter Stream] All models failed`, { lastError: msg })
          throw new Error(`AI 해석 실패: 모든 모델이 응답하지 않았습니다.`)
        }

        logger.warn(`[OpenRouter Stream] Model ${model} failed (${msg}), trying next`)
      }
    }

    throw new Error('AI 해석 실패: 사용 가능한 모델이 없습니다.')
  }

  /**
   * 단일 모델 스트리밍 호출
   */
  private async streamWithModel(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
    signal: AbortSignal | undefined,
    temperature: number,
    maxTokens: number
  ): Promise<{ model: string } | null> {
    logger.info('[OpenRouter Stream] Trying model', { model })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    // 외부 signal과 내부 timeout 병합
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Statistical Analysis Platform'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ] satisfies OpenRouterMessage[],
        temperature,
        max_tokens: maxTokens,
        stream: true
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      if (response.status === 401 || response.status === 403) {
        this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 1 * 60 * 1000 }
      }
      throw new Error(`API ${response.status}: ${errorText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return null

    const decoder = new TextDecoder()
    let hasContent = false
    let buffer = '' // SSE 불완전 라인 버퍼링 (TCP 패킷 경계 대응)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 마지막 불완전 라인 보관

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              hasContent = true
              onChunk(delta)
            }
          } catch {
            // SSE 파싱 실패 무시
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (!hasContent) return null

    logger.info('[OpenRouter Stream] Completed', { model })
    return { model }
  }

  /**
   * 변수 할당에서 실제 데이터에 없는 변수명 필터링 (LLM 환각 방지)
   */
  private filterInvalidVariables(
    assignments: NonNullable<AIRecommendation['variableAssignments']>,
    validNames: Set<string>
  ): AIRecommendation['variableAssignments'] {
    const filter = (arr?: string[]): string[] | undefined => {
      if (!arr) return undefined
      const filtered = arr.filter(name => validNames.has(name))
      return filtered.length > 0 ? filtered : undefined
    }

    const result: NonNullable<AIRecommendation['variableAssignments']> = {}
    if (assignments.dependent) result.dependent = filter(assignments.dependent)
    if (assignments.independent) result.independent = filter(assignments.independent)
    if (assignments.factor) result.factor = filter(assignments.factor)
    if (assignments.covariate) result.covariate = filter(assignments.covariate)
    if (assignments.within) result.within = filter(assignments.within)
    if (assignments.between) result.between = filter(assignments.between)

    // 모든 역할이 비었으면 undefined 반환
    const hasAny = Object.values(result).some(v => v !== undefined)
    return hasAny ? result : undefined
  }

  /**
   * methodId에서 카테고리 추론 (fallback)
   */
  private inferCategory(methodId: string): StatisticalMethod['category'] {
    if (methodId.includes('t-test') || methodId.includes('t-') || methodId === 'welch-t') return 't-test'
    if (methodId.includes('anova') || methodId === 'ancova' || methodId === 'manova') return 'anova'
    if (methodId.includes('correlation')) return 'correlation'
    if (methodId.includes('regression')) return 'regression'
    if (methodId.includes('chi-square')) return 'chi-square'
    return 'advanced'
  }
}

// 싱글톤 인스턴스
export const openRouterRecommender = new OpenRouterRecommender()
