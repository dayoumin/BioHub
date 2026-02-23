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

/**
 * 모델 설정:
 * - .env.local의 NEXT_PUBLIC_OPENROUTER_MODEL 환경변수에서 쉼표 구분으로 지정
 * - 예: NEXT_PUBLIC_OPENROUTER_MODEL=openai/gpt-oss-120b:free,x-ai/grok-4.1-fast
 * - 미지정 시 OpenRouter 서비스 비활성화 (health check에서 false 반환)
 *
 * ⚠️ API 키 노출 주의:
 * NEXT_PUBLIC_ 접두사로 클라이언트 번들에 포함됨.
 * 무료 모델만 사용하면 과금 위험 없음.
 * 유료 모델 전환 시 반드시 서버 사이드 API Route로 이동 필요.
 */

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
      : []

    if (models.length === 0) {
      logger.info('[OpenRouter] NEXT_PUBLIC_OPENROUTER_MODEL 미설정 — OpenRouter 비활성화')
    }

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
   * Health check: API 키 존재 여부 확인 + 경량 API 검증 + 캐싱
   *
   * Fix 2-A: API 키 존재만이 아닌 실제 연결 검증 (models 엔드포인트 사용, 3초 타임아웃)
   * 실패 시 빠르게 false 반환하여 30초 타임아웃 회피
   */
  async checkHealth(): Promise<boolean> {
    // 캐시 체크
    if (this.healthCache && Date.now() - this.healthCache.timestamp < this.healthCache.ttl) {
      return this.healthCache.isAvailable
    }

    const hasApiKey = !!this.config.apiKey && this.config.apiKey !== 'your_openrouter_api_key_here'
    const hasModels = this.config.models.length > 0

    if (!hasApiKey || !hasModels) {
      this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
      if (!hasApiKey) logger.info('[OpenRouter] No API key configured')
      if (!hasModels) logger.info('[OpenRouter] No models configured (set NEXT_PUBLIC_OPENROUTER_MODEL)')
      return false
    }

    // 경량 API 검증: /models 엔드포인트로 키 유효성 확인 (3초 타임아웃)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      try {
        const res = await fetch(`${this.config.baseUrl}/models`, {
          headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
          signal: controller.signal
        })
        if (res.ok) {
          this.healthCache = { isAvailable: true, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
          logger.info('[OpenRouter] Health check passed')
          return true
        }
        // 401/403 = 키 무효
        this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
        logger.warn(`[OpenRouter] Health check failed: ${res.status}`)
        return false
      } finally {
        clearTimeout(timeoutId)
      }
    } catch {
      // R2-D: 네트워크 에러/타임아웃 → false 반환 (Ollama 등 로컬 fallback으로 빠르게 전환)
      // 이전: 낙관적 true → 30초 x 3모델 = 최대 90초 대기 후 실패
      this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 1 * 60 * 1000 }
      logger.warn('[OpenRouter] Health check network error, marking unavailable')
      return false
    }
  }

  /**
   * 캐시 무효화
   */
  clearHealthCache(): void {
    this.healthCache = null
  }

  /**
   * 자연어 입력 기반 추천 (자동으로 기본 시스템 프롬프트 사용)
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<{ recommendation: AIRecommendation | null; responseText: string }> {
    return this.recommendWithSystemPrompt(
      userInput,
      this.getSystemPrompt(),
      validationResults,
      assumptionResults,
      data
    )
  }

  /**
   * 외부에서 주입된 시스템 프롬프트를 사용하여 추천 요청 (모델 fallback 체인)
   */
  async recommendWithSystemPrompt(
    userInput: string,
    systemPrompt: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    _data: DataRow[] | null
  ): Promise<{ recommendation: AIRecommendation | null; responseText: string }> {
    const userPrompt = this.buildUserPrompt(userInput, validationResults, assumptionResults)

    // 실제 컬럼명 세트 (변수 검증용)
    const validColumnNames = new Set(
      (validationResults?.columns || []).map((c: ColumnStatistics) => c.name)
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

    // Fix 2-C: try/finally로 clearTimeout 보장 (fetch throw 시에도 정리)
    let response: Response
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
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
    } finally {
      clearTimeout(timeoutId)
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      // Fix 2-B: 인증 실패 시 5분 캐시 (키가 바뀌지 않으므로 재시도 낭비 방지)
      if (response.status === 401 || response.status === 403) {
        this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
      }
      throw new Error(`API ${response.status}: ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()
    const msg = data.choices?.[0]?.message
    // Fix 2-D: thinking 모델 <think> 태그 제거 후 사용
    const rawContent = msg?.content?.trim() || msg?.reasoning_content || ''
    const content = this.stripThinkingTags(rawContent)

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
   * 파싱 없이 LLM 원문 텍스트만 반환 (Intent Router 등 자체 파서가 있는 호출자용)
   * 모델 fallback 체인 적용 — 첫 번째 성공 모델의 응답을 반환
   */
  async generateRawText(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string | null> {
    for (let i = 0; i < this.config.models.length; i++) {
      const model = this.config.models[i]
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        let response: Response
        try {
          response = await fetch(`${this.config.baseUrl}/chat/completions`, {
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
        } finally {
          clearTimeout(timeoutId)
        }

        if (!response.ok) {
          throw new Error(`API ${response.status}`)
        }

        const data: OpenRouterResponse = await response.json()
        const msg = data.choices?.[0]?.message
        const rawContent = msg?.content?.trim() || msg?.reasoning_content || ''
        const content = this.stripThinkingTags(rawContent)

        if (content) return content
        logger.warn(`[OpenRouter] generateRawText: model ${model} returned empty content`)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown'
        if (i === this.config.models.length - 1) {
          logger.error('[OpenRouter] generateRawText: all models failed', { lastError: msg })
          return null
        }
        logger.warn(`[OpenRouter] generateRawText: model ${model} failed (${msg}), trying next`)
      }
    }
    return null
  }

  /**
   * Fix 2-D: thinking 모델의 <think>...</think> 태그 제거
   * DeepSeek R1 등의 reasoning_content에서 추론 과정 제거
   */
  private stripThinkingTags(content: string): string {
    // R2-A: 완전한 <think>...</think> 제거 + 닫히지 않은 <think>... (응답 잘림) 제거
    return content
      .replace(/<think>[\s\S]*?<\/think>/g, '')
      .replace(/<think>[\s\S]*$/g, '')
      .trim()
  }

  /**
   * Fix 2-E: 중괄호 밸런싱으로 첫 번째 완전한 JSON 객체 추출
   * greedy regex 대신 사용하여 다중 JSON 시 파싱 실패 방지
   */
  private extractBalancedJson(content: string): string | null {
    const start = content.indexOf('{')
    if (start === -1) return null

    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < content.length; i++) {
      const ch = content[i]

      if (escape) { escape = false; continue }
      if (ch === '\\' && inString) { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue

      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) {
          return content.substring(start, i + 1)
        }
      }
    }

    // R2-E: 밸런싱 실패 = 불완전 JSON → null 반환 (다음 모델로 fallback)
    // greedy 매칭은 garbage 포함 가능하므로 사용하지 않음
    return null
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

    this.cachedSystemPrompt = `당신은 통계 분석 전문가입니다.
사용자의 분석 요구와 데이터 특성을 고려하여 가장 적합한 통계 방법을 추천하세요.

## 응답 규칙
1. 먼저 왜 이 방법이 좋은지 한국어로 쉽게 2-3문장 설명해주세요.
2. 그 다음 반드시 \`\`\`json 블록으로 추천 결과를 정확한 JSON 형식으로 제공하세요.
3. 데이터의 변수 타입, 표본 크기, 가정 검정 결과를 반드시 고려하세요.
4. 질문이 모호하면 confidence를 0.6-0.7로 낮추고 ambiguityNote에 이유를 적어주세요.

## 사용자 친화적 설명 원칙
- reasoning 배열의 각 항목은 비전문가도 이해할 수 있는 자연스러운 한국어로 작성하세요.
  예: "두 그룹의 평균을 비교하는 데 적합해요", "데이터가 정규분포를 따르기 때문에 사용할 수 있어요"
- 전문 용어를 쓸 때는 괄호 안에 쉬운 설명을 추가하세요. 예: "등분산성(두 그룹의 퍼짐 정도가 비슷한지)"
- warnings도 구체적으로 적어주세요. 예: "표본이 30개 미만이라 결과가 불안정할 수 있어요"

## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["이 방법을 추천하는 쉬운 이유 1", "이유 2", "이유 3"],
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
  "warnings": ["쉬운 말로 된 주의사항"],
  "dataPreprocessing": ["쉬운 말로 된 전처리 제안"],
  "ambiguityNote": "질문이 모호할 때만 포함",
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "이런 관점에서 보면: 대안 설명" }
  ]
}
\`\`\`

## 필드 설명
- variableAssignments: 데이터 컬럼명을 분석 역할에 매핑. 실제 존재하는 컬럼명만 사용.
- suggestedSettings: 분석 설정 제안. alpha, postHoc(tukey/bonferroni/scheffe), alternative(two-sided/less/greater).
- warnings: 주의사항. 비전문가도 이해할 수 있게 작성. 없으면 빈 배열.
- dataPreprocessing: 데이터 정리 제안. 없으면 빈 배열.
- ambiguityNote: 질문이 여러 해석 가능할 때만 포함. 명확하면 생략.
- alternatives: 다른 관점의 분석 방법 2-3개.

## 사용 가능한 통계 방법 (반드시 아래 ID 중 하나를 사용)

${methodList}

## 주의사항
- methodId는 위 목록에서 정확히 일치하는 ID만 사용하세요.
- confidence: 데이터 적합도 반영 (0.9+ 매우 확신, 0.7-0.9 확신, 0.5-0.7 보통)
- alternatives: 2-3개 제시. 각 대안이 어떤 관점인지 쉽게 설명.
- variableAssignments에는 데이터 요약에 나온 실제 컬럼명만 사용하세요.
- 반드시 한국어로 응답하세요. reasoning, warnings, ambiguityNote는 비전문가도 이해할 수 있게 작성하세요.`

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
          // PII 필터: ID 컬럼의 topCategories는 제외 (개인정보 보호)
          const isIdColumn = col.idDetection?.isId === true
          if (col.topCategories?.length && !isIdColumn) {
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
    // 코드블록 우선
    const codeBlockMatch = content.match(/```json[\s\S]*?```/)
    if (codeBlockMatch) {
      const beforeJson = content.substring(0, content.indexOf(codeBlockMatch[0])).trim()
      return beforeJson || content.replace(/```json[\s\S]*?```/, '').trim()
    }

    // Fix 2-E: 밸런싱된 JSON 추출 사용 (greedy 매칭 방지)
    const jsonStr = this.extractBalancedJson(content)
    if (jsonStr) {
      const beforeJson = content.substring(0, content.indexOf(jsonStr)).trim()
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

      // Fix 2-E: 코드 블록 없으면 중괄호 밸런싱으로 JSON 추출 (greedy 매칭 방지)
      if (!jsonStr) {
        jsonStr = this.extractBalancedJson(content)
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
    // R2-B: 타임아웃을 fetch + 스트림 읽기 전체에 적용 (영구 대기 방지)
    const streamTimeout = this.config.timeout * 3 // 스트리밍은 fetch 대비 3배 여유
    const timeoutId = setTimeout(() => controller.abort(), streamTimeout)

    // 외부 signal과 내부 timeout 병합
    if (signal) {
      signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        if (response.status === 401 || response.status === 403) {
          this.healthCache = { isAvailable: false, timestamp: Date.now(), ttl: 5 * 60 * 1000 }
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
    } finally {
      clearTimeout(timeoutId)
    }
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
