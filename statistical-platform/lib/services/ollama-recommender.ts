/**
 * Phase 4-B: Ollama 기반 하이브리드 통계 분석 추천 시스템
 *
 * 변경 사항 (v2.0):
 * 1. ✅ Health Check 캐싱 (5분 TTL)
 * 2. ✅ 재시도 로직 (2회, 2초 타임아웃)
 * 3. ✅ assumptionResults 반영 프롬프트
 * 4. ✅ DecisionTreeRecommender와 동일한 AIRecommendation 반환
 * 5. ✅ AbortController 사용 (타임아웃 강화)
 * 6. ✅ 로깅 강화 (성공/실패/캐시)
 */

import type {
  AnalysisPurpose,
  AIRecommendation,
  StatisticalAssumptions,
  ValidationResults,
  DataRow
} from '@/types/smart-flow'
import { logger } from '@/lib/utils/logger'
import {
  AnonymizationService,
  ResponseDeanonymizer
} from './anonymization'

interface OllamaConfig {
  host: string
  model: string
  temperature: number
  maxTokens: number
}

interface OllamaResponse {
  model: string
  response: string
  done: boolean
  context?: number[]
  total_duration?: number
}

interface HealthCache {
  isAvailable: boolean
  timestamp: number
  ttl: number // milliseconds
}

export class OllamaRecommender {
  private config: OllamaConfig = {
    host: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
    model: 'qwen3:4b', // 2.6GB, 한국어 지원 우수
    temperature: 0.2, // ✅ 0.3 → 0.2 (더 일관성 있게)
    maxTokens: 800 // ✅ 500 → 800 (더 상세한 설명)
  }

  // ✅ Health Check 캐싱 (Phase 4-B AI Review Fix #5)
  private healthCache: HealthCache | null = null

  private systemPrompt = `You are a professional statistical analysis expert assistant. Your task is to recommend the most appropriate statistical method based on:
1. User's analysis purpose
2. Data characteristics (sample size, variable types)
3. Statistical assumption test results (normality, homogeneity of variance)

IMPORTANT: You MUST respond ONLY in valid JSON format without any extra text or explanations.

Response format:
{
  "methodId": "method-id-from-list",
  "methodName": "한글 메서드명",
  "confidence": 0.95,
  "reasoning": [
    "추천 이유 1",
    "추천 이유 2",
    "추천 이유 3"
  ],
  "assumptions": [
    {
      "name": "정규성",
      "passed": true,
      "pValue": 0.123
    }
  ],
  "alternatives": [
    {
      "id": "alternative-method-id",
      "name": "대안 방법명",
      "description": "왜 대안인지 설명"
    }
  ]
}

Available method IDs (MUST use exact ID):
- independent-t-test, paired-t-test, one-sample-t-test, welch-t
- one-way-anova, two-way-anova, repeated-measures-anova
- mann-whitney, wilcoxon-signed-rank, kruskal-wallis, friedman
- pearson-correlation, spearman-correlation, kendall-correlation
- simple-linear-regression, multiple-linear-regression, logistic-regression
- chi-square-independence, chi-square-goodness-of-fit
- descriptive-stats, time-series-analysis

Categories:
- t-test: independent-t-test, paired-t-test, one-sample-t-test, welch-t
- anova: one-way-anova, two-way-anova, repeated-measures-anova
- nonparametric: mann-whitney, wilcoxon-signed-rank, kruskal-wallis, friedman
- correlation: pearson-correlation, spearman-correlation, kendall-correlation
- regression: simple-linear-regression, multiple-linear-regression, logistic-regression
- chi-square: chi-square-independence, chi-square-goodness-of-fit
- descriptive: descriptive-stats
- advanced: time-series-analysis`

  /**
   * Ollama 서버 Health Check (캐싱 + 재시도)
   *
   * AI Review Fix #5:
   * - 5분 캐싱 (성공 시)
   * - 1분 캐싱 (실패 시, 재시도 방지)
   * - 2회 재시도 (100ms 대기)
   * - 2초 타임아웃 (AbortController)
   */
  async checkHealth(): Promise<boolean> {
    // ✅ 1단계: 캐시 체크 (5분 TTL)
    if (this.healthCache &&
        Date.now() - this.healthCache.timestamp < this.healthCache.ttl) {
      logger.info('[Ollama] Using cached health status', {
        isAvailable: this.healthCache.isAvailable,
        age: Math.floor((Date.now() - this.healthCache.timestamp) / 1000) + 's'
      })
      return this.healthCache.isAvailable
    }

    // ✅ 2단계: 환경 체크 (브라우저 환경에서만)
    if (typeof window !== 'undefined') {
      const hasExplicitEndpoint = !!process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      const hostname = window.location.hostname
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

      // 명시적 endpoint 없고 localhost도 아니면 → 사용 불가
      if (!hasExplicitEndpoint && !isLocalhost) {
        logger.info('[Ollama] Skipped (remote environment without explicit endpoint)')
        this.healthCache = {
          isAvailable: false,
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000 // 5분 캐싱
        }
        return false
      }
    }

    // ✅ 3단계: 재시도 로직 (최대 2회)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

        const response = await fetch(`${this.config.host}/api/tags`, {
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          // ✅ 성공 → 5분 캐싱
          this.healthCache = {
            isAvailable: true,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 // 5분
          }
          logger.info('[Ollama] Health check SUCCESS', {
            attempt: attempt + 1,
            endpoint: this.config.host
          })
          return true
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.warn('[Ollama] Health check FAILED', {
          attempt: attempt + 1,
          error: errorMessage
        })

        // 마지막 시도 실패 → 1분 캐싱 (재시도 방지)
        if (attempt === 1) {
          this.healthCache = {
            isAvailable: false,
            timestamp: Date.now(),
            ttl: 1 * 60 * 1000 // 1분
          }
        }

        // 마지막 시도가 아니면 100ms 대기 후 재시도
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    return false
  }

  /**
   * 캐시 무효화 (테스트용)
   */
  clearHealthCache(): void {
    this.healthCache = null
    logger.info('[Ollama] Health cache cleared')
  }

  /**
   * 로컬 모델 사용 시 정확도 경고 추가
   */
  private addModelSizeWarning(recommendation: AIRecommendation): AIRecommendation {
    const warnings = recommendation.warnings || []
    warnings.push('로컬 모델은 추천 정확도가 제한적입니다.')
    return { ...recommendation, warnings }
  }

  /**
   * LLM 기반 AI 추천 (Phase 4-B)
   *
   * @param purpose - 분석 목적 (compare, relationship, distribution, prediction, timeseries)
   * @param assumptionResults - 통계적 가정 검정 결과 (Step 2에서 계산됨)
   * @param validationResults - 데이터 검증 결과
   * @param data - 실제 데이터
   * @returns AIRecommendation (DecisionTreeRecommender와 동일한 형식)
   */
  async recommend(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): Promise<AIRecommendation | null> {
    try {
      // ✅ 1단계: 익명화 수행
      const anonymizationResult = AnonymizationService.anonymize(validationResults, 20)
      const anonymizedValidation = anonymizationResult?.anonymized || validationResults
      const mapping = anonymizationResult?.mapping

      logger.info('[Ollama] Anonymization applied', {
        hasMapping: !!mapping,
        anonymizedVars: mapping?.variables.length || 0
      })

      // ✅ 프롬프트 구성 (assumptionResults 반영)
      const prompt = this.buildPromptWithAssumptions(
        purpose,
        assumptionResults,
        anonymizedValidation,
        data
      )

      logger.info('[Ollama] Sending recommendation request', {
        purpose,
        sampleSize: data.length,
        model: this.config.model
      })

      // ✅ AbortController 타임아웃 (10초)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          system: this.systemPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: this.config.maxTokens
          }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status}`)
      }

      const ollamaResponse: OllamaResponse = await response.json()
      let recommendation = this.parseOllamaResponse(ollamaResponse.response)

      // ✅ 2단계: 응답 역변환 (익명화된 변수명 → 원본)
      if (recommendation && mapping) {
        recommendation = ResponseDeanonymizer.deanonymizeRecommendation(
          recommendation,
          mapping
        )
      }

      if (recommendation) {
        // 소규모 모델 경고 추가
        recommendation = this.addModelSizeWarning(recommendation)
        logger.info('[Ollama] Recommendation SUCCESS', {
          methodId: recommendation.method.id,
          confidence: recommendation.confidence
        })
        return recommendation
      } else {
        logger.error('[Ollama] Failed to parse response')
        return null
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[Ollama] Recommendation FAILED', { error: errorMessage })
      return null
    }
  }

  /**
   * assumptionResults를 포함한 프롬프트 구성
   */
  private buildPromptWithAssumptions(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): string {
    const n = data.length
    const numericVars = validationResults.columns?.filter(c => c.type === 'numeric').length || 0
    const categoricalVars = validationResults.columns?.filter(c => c.type === 'categorical').length || 0

    // 목적 한글 변환
    const purposeMap: Record<AnalysisPurpose, string> = {
      'compare': '그룹 간 차이 비교',
      'relationship': '변수 간 관계 분석',
      'distribution': '분포와 빈도 분석',
      'prediction': '예측 모델링',
      'timeseries': '시계열 분석',
      'survival': '생존분석',
      'multivariate': '다변량 분석',
      'utility': '유틸리티 분석'
    }

    // 가정 검정 결과 요약
    const normalityInfo = assumptionResults.normality?.shapiroWilk
      ? `Shapiro-Wilk: p=${assumptionResults.normality.shapiroWilk.pValue !== undefined ? assumptionResults.normality.shapiroWilk.pValue.toFixed(3) : 'N/A'} (${assumptionResults.normality.shapiroWilk.isNormal ? '정규성 충족' : '정규성 미충족'})`
      : '정규성 검정 미실시'

    const homogeneityInfo = assumptionResults.homogeneity?.levene
      ? `Levene: p=${assumptionResults.homogeneity.levene.pValue !== undefined ? assumptionResults.homogeneity.levene.pValue.toFixed(3) : 'N/A'} (${assumptionResults.homogeneity.levene.equalVariance ? '등분산성 충족' : '등분산성 미충족'})`
      : '등분산성 검정 미실시'

    // 변수 상세 통계 (Markdown-KV 형식)
    let variableDetails = ''
    const columns = (validationResults.columns || []).slice(0, 20)
    for (const col of columns) {
      if (col.type === 'numeric') {
        variableDetails += `\n### ${col.name} (numeric)\n`
        if (col.mean !== undefined) variableDetails += `- Mean: ${col.mean.toFixed(2)}\n`
        if (col.std !== undefined) variableDetails += `- Std: ${col.std.toFixed(2)}\n`
        if (col.min !== undefined && col.max !== undefined) variableDetails += `- Range: ${col.min.toFixed(2)} ~ ${col.max.toFixed(2)}\n`
        if (col.skewness !== undefined) variableDetails += `- Skewness: ${col.skewness.toFixed(2)}\n`
        variableDetails += `- Unique: ${col.uniqueValues ?? '-'}\n`
      } else if (col.type === 'categorical') {
        variableDetails += `\n### ${col.name} (categorical)\n`
        variableDetails += `- Categories: ${col.uniqueValues ?? '-'}\n`
        if (col.topCategories?.length) {
          const cats = col.topCategories.slice(0, 6).map(c => `${c.value}(${c.count})`).join(', ')
          variableDetails += `- Distribution: ${cats}\n`
        }
      }
    }

    return `
Analysis Purpose: ${purposeMap[purpose]}

Data Characteristics:
- Sample size: ${n} rows
- Numeric variables: ${numericVars}
- Categorical variables: ${categoricalVars}
${variableDetails}
Statistical Assumption Test Results:
- Normality: ${normalityInfo}
- Homogeneity of Variance: ${homogeneityInfo}

Please recommend the most appropriate statistical method for this analysis.
Consider the assumption test results and suggest parametric methods if assumptions are met, or non-parametric alternatives if not.

Respond ONLY in valid JSON format (no extra text).
`
  }

  /**
   * Ollama 응답 파싱 → AIRecommendation 형식으로 변환
   */
  private parseOllamaResponse(response: string): AIRecommendation | null {
    try {
      // JSON 추출 (LLM이 추가 텍스트를 포함할 수 있음)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.error('[Ollama] No JSON found in response')
        return null
      }

      const parsed = JSON.parse(jsonMatch[0])

      // ✅ 필수 필드 검증
      if (!parsed.methodId || !parsed.methodName || !parsed.confidence || !parsed.reasoning) {
        logger.error('[Ollama] Missing required fields in response', { parsed })
        return null
      }

      // ✅ AIRecommendation 형식으로 변환
      const recommendation: AIRecommendation = {
        method: {
          id: parsed.methodId,
          name: parsed.methodName,
          description: parsed.reasoning[0] || '',
          category: this.getCategoryFromMethodId(parsed.methodId),
          requirements: {
            assumptions: parsed.assumptions?.map((a: any) => a.name) || []
          }
        },
        confidence: parsed.confidence,
        reasoning: parsed.reasoning || [],
        assumptions: parsed.assumptions?.map((a: any) => ({
          name: a.name,
          passed: a.passed,
          pValue: a.pValue
        })) || [],
        alternatives: parsed.alternatives?.map((alt: any) => ({
          id: alt.id,
          name: alt.name,
          description: alt.description,
          category: this.getCategoryFromMethodId(alt.id)
        })) || []
      }

      return recommendation
    } catch (error) {
      logger.error('[Ollama] JSON parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        response: response.substring(0, 200)
      })
      return null
    }
  }

  /**
   * methodId로부터 category 추론
   */
  private getCategoryFromMethodId(methodId: string): AIRecommendation['method']['category'] {
    if (methodId.includes('t-test')) return 't-test'
    if (methodId.includes('anova')) return 'anova'
    if (methodId.includes('mann-whitney') || methodId.includes('wilcoxon') ||
        methodId.includes('kruskal') || methodId.includes('friedman')) return 'nonparametric'
    if (methodId.includes('correlation')) return 'correlation'
    if (methodId.includes('regression')) return 'regression'
    if (methodId.includes('chi-square')) return 'chi-square'
    if (methodId === 'descriptive-stats') return 'descriptive'
    return 'advanced'
  }

  /**
   * 스트리밍 응답 (Phase 4-C용, 향후 구현)
   */
  async *recommendStream(
    purpose: AnalysisPurpose,
    assumptionResults: StatisticalAssumptions,
    validationResults: ValidationResults,
    data: DataRow[]
  ): AsyncGenerator<string> {
    const prompt = this.buildPromptWithAssumptions(
      purpose,
      assumptionResults,
      validationResults,
      data
    )

    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        system: this.systemPrompt,
        stream: true
      })
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.response) {
            yield json.response
          }
        } catch (e) {
          // 파싱 오류 무시
        }
      }
    }
  }

  // ============================================
  // 자연어 입력 기반 추천 (NEW)
  // ============================================

  private naturalLanguageSystemPrompt = `당신은 통계 분석 전문가 AI 어시스턴트입니다.
사용자가 자연어로 분석 목적을 설명하면, 가장 적합한 통계 방법을 추천해주세요.

응답 형식:
1. 먼저 사용자의 질문을 이해했다는 짧은 설명 (1-2문장, 한국어)
2. 그 다음 JSON 형식으로 추천 결과

예시 응답:
두 그룹의 평균을 비교하시려는군요. 데이터의 정규성이 충족되어 **독립표본 t-검정**을 추천드립니다.

\`\`\`json
{
  "methodId": "independent-t-test",
  "methodName": "독립표본 t-검정",
  "confidence": 0.9,
  "reasoning": [
    "두 독립적인 그룹의 평균 비교에 적합",
    "데이터가 정규분포를 따름",
    "연속형 종속변수 분석에 적합"
  ],
  "alternatives": [
    {
      "id": "mann-whitney",
      "name": "Mann-Whitney U 검정",
      "description": "정규성 가정이 충족되지 않을 때 사용"
    },
    {
      "id": "welch-t",
      "name": "Welch t-검정",
      "description": "등분산 가정이 충족되지 않을 때 사용"
    }
  ]
}
\`\`\`

사용 가능한 통계 방법 ID:
- 평균 비교: independent-t-test, paired-t-test, one-sample-t-test, welch-t
- 분산분석: one-way-anova, two-way-anova, repeated-measures-anova, ancova
- 비모수: mann-whitney, wilcoxon-signed-rank, kruskal-wallis, friedman
- 상관분석: pearson-correlation, spearman-correlation, kendall-correlation
- 회귀분석: simple-linear-regression, multiple-linear-regression, logistic-regression
- 카이제곱: chi-square-independence, chi-square-goodness-of-fit
- 기술통계: descriptive-stats
- 시계열: arima, time-series-decomposition
- 생존분석: kaplan-meier, cox-regression
- 다변량: pca, factor-analysis, cluster-analysis

중요: 반드시 한국어로 응답하세요.`

  /**
   * 자연어 입력 기반 추천 프롬프트 구성
   */
  private buildNaturalLanguagePrompt(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): string {
    const n = data?.length || 0
    const columns = validationResults?.columns || validationResults?.columnStats || []
    const numericVars = columns.filter(c => c.type === 'numeric').map(c => c.name)
    const categoricalVars = columns.filter(c => c.type === 'categorical').map(c => c.name)

    // 가정 검정 결과 요약
    let assumptionSummary = ''
    if (assumptionResults) {
      if (assumptionResults.normality?.shapiroWilk) {
        const { pValue, isNormal } = assumptionResults.normality.shapiroWilk
        assumptionSummary += `- 정규성: ${isNormal ? '충족' : '미충족'} (Shapiro-Wilk p=${pValue?.toFixed(3) || 'N/A'})\n`
      }
      if (assumptionResults.homogeneity?.levene) {
        const { pValue, equalVariance } = assumptionResults.homogeneity.levene
        assumptionSummary += `- 등분산성: ${equalVariance ? '충족' : '미충족'} (Levene p=${pValue?.toFixed(3) || 'N/A'})\n`
      }
    }

    // 변수 상세 통계 (Markdown-KV 형식)
    let variableDetails = ''
    const displayCols = columns.slice(0, 20)
    for (const col of displayCols) {
      if (col.type === 'numeric') {
        variableDetails += `\n### ${col.name} (수치형)\n`
        if (col.mean !== undefined) variableDetails += `- 평균: ${col.mean.toFixed(2)}\n`
        if (col.std !== undefined) variableDetails += `- 표준편차: ${col.std.toFixed(2)}\n`
        if (col.min !== undefined && col.max !== undefined) variableDetails += `- 범위: ${col.min.toFixed(2)} ~ ${col.max.toFixed(2)}\n`
        if (col.skewness !== undefined) variableDetails += `- 왜도: ${col.skewness.toFixed(2)}\n`
        variableDetails += `- 고유값: ${col.uniqueValues ?? '-'}\n`
      } else if (col.type === 'categorical') {
        variableDetails += `\n### ${col.name} (범주형)\n`
        variableDetails += `- 카테고리 수: ${col.uniqueValues ?? '-'}\n`
        if (col.topCategories?.length) {
          const cats = col.topCategories.slice(0, 6).map(c => `${c.value}(${c.count})`).join(', ')
          variableDetails += `- 분포: ${cats}\n`
        }
      }
    }

    return `사용자 질문: "${userInput}"

데이터 정보:
- 표본 크기: ${n}개
- 수치형 변수 (${numericVars.length}개): ${numericVars.slice(0, 5).join(', ')}${numericVars.length > 5 ? '...' : ''}
- 범주형 변수 (${categoricalVars.length}개): ${categoricalVars.slice(0, 5).join(', ')}${categoricalVars.length > 5 ? '...' : ''}
${variableDetails}
${assumptionSummary ? `통계적 가정 검정 결과:\n${assumptionSummary}` : '(가정 검정 결과 없음)'}

위 정보를 바탕으로 가장 적합한 통계 방법을 추천해주세요.`
  }

  /**
   * 자연어 입력 기반 추천 (비스트리밍)
   */
  async recommendFromNaturalLanguage(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): Promise<{ recommendation: AIRecommendation | null; responseText: string }> {
    try {
      // ✅ 1단계: 익명화 수행
      const anonymizationResult = AnonymizationService.anonymize(validationResults, 20)
      const anonymizedValidation = anonymizationResult?.anonymized || validationResults
      const mapping = anonymizationResult?.mapping

      logger.info('[Ollama] Anonymization applied', {
        hasMapping: !!mapping,
        anonymizedVars: mapping?.variables.length || 0
      })

      const prompt = this.buildNaturalLanguagePrompt(
        userInput,
        anonymizedValidation,
        assumptionResults,
        data
      )

      logger.info('[Ollama] Natural language recommendation request', {
        userInput: userInput.substring(0, 50),
        sampleSize: data?.length || 0
      })

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15초 타임아웃

      const response = await fetch(`${this.config.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          system: this.naturalLanguageSystemPrompt,
          stream: false,
          options: {
            temperature: this.config.temperature,
            num_predict: 1200 // 더 긴 응답 허용
          }
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.status}`)
      }

      const ollamaResponse: OllamaResponse = await response.json()
      const fullResponse = ollamaResponse.response

      // JSON 추출 (코드 블록 또는 직접 JSON)
      let recommendation = this.parseNaturalLanguageResponse(fullResponse)

      // 설명 텍스트 추출 (JSON 이전 부분)
      const jsonMatch = fullResponse.match(/```json[\s\S]*?```|\{[\s\S]*\}/)
      let responseText = jsonMatch
        ? fullResponse.substring(0, fullResponse.indexOf(jsonMatch[0])).trim()
        : fullResponse

      // ✅ 2단계: 응답 역변환 (익명화된 변수명 → 원본)
      if (recommendation && mapping) {
        recommendation = ResponseDeanonymizer.deanonymizeRecommendation(
          recommendation,
          mapping
        )
        responseText = ResponseDeanonymizer.deanonymizeText(
          responseText,
          mapping
        )
      }

      // 소규모 모델 경고 추가
      if (recommendation) {
        recommendation = this.addModelSizeWarning(recommendation)
      }

      logger.info('[Ollama] Natural language recommendation SUCCESS', {
        methodId: recommendation?.method.id,
        hasResponseText: !!responseText
      })

      return { recommendation, responseText }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error('[Ollama] Natural language recommendation FAILED', { error: errorMessage })
      return { recommendation: null, responseText: '' }
    }
  }

  /**
   * 자연어 응답 파싱
   */
  private parseNaturalLanguageResponse(response: string): AIRecommendation | null {
    try {
      // 코드 블록에서 JSON 추출
      const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
      let jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

      // 코드 블록 없으면 직접 JSON 찾기
      if (!jsonStr) {
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        jsonStr = jsonMatch ? jsonMatch[0] : null
      }

      if (!jsonStr) {
        logger.error('[Ollama] No JSON found in natural language response')
        return null
      }

      const parsed = JSON.parse(jsonStr)

      if (!parsed.methodId || !parsed.methodName) {
        logger.error('[Ollama] Missing required fields', { parsed })
        return null
      }

      const recommendation: AIRecommendation = {
        method: {
          id: parsed.methodId,
          name: parsed.methodName,
          description: parsed.reasoning?.[0] || '',
          category: this.getCategoryFromMethodId(parsed.methodId)
        },
        confidence: parsed.confidence || 0.8,
        reasoning: parsed.reasoning || [],
        assumptions: parsed.assumptions?.map((a: { name: string; passed: boolean; pValue?: number }) => ({
          name: a.name,
          passed: a.passed,
          pValue: a.pValue
        })) || [],
        alternatives: parsed.alternatives?.map((alt: { id: string; name: string; description?: string }) => ({
          id: alt.id,
          name: alt.name,
          description: alt.description || '',
          category: this.getCategoryFromMethodId(alt.id)
        })) || []
      }

      return recommendation
    } catch (error) {
      logger.error('[Ollama] Natural language JSON parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return null
    }
  }

  /**
   * 자연어 입력 기반 스트리밍 추천
   */
  async *recommendFromNaturalLanguageStream(
    userInput: string,
    validationResults: ValidationResults | null,
    assumptionResults: StatisticalAssumptions | null,
    data: DataRow[] | null
  ): AsyncGenerator<{ type: 'text' | 'recommendation'; content: string | AIRecommendation }> {
    const prompt = this.buildNaturalLanguagePrompt(
      userInput,
      validationResults,
      assumptionResults,
      data
    )

    const response = await fetch(`${this.config.host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        system: this.naturalLanguageSystemPrompt,
        stream: true,
        options: {
          temperature: this.config.temperature,
          num_predict: 1200
        }
      })
    })

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(Boolean)

      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.response) {
            fullText += json.response
            yield { type: 'text', content: json.response }
          }
        } catch (e) {
          // 파싱 오류 무시
        }
      }
    }

    // 스트리밍 완료 후 JSON 파싱하여 추천 결과 반환
    const recommendation = this.parseNaturalLanguageResponse(fullText)
    if (recommendation) {
      yield { type: 'recommendation', content: recommendation }
    }
  }

  // ============================================
  // 키워드 기반 Fallback 추천 (Ollama 불가 시)
  // ============================================

  /**
   * 키워드 기반 Fallback 추천
   * Ollama 서버 불가 시 간단한 키워드 매칭으로 추천
   */
  keywordBasedRecommend(userInput: string): { recommendation: AIRecommendation; responseText: string } {
    const input = userInput.toLowerCase()

    // 키워드 → 통계 방법 매핑
    const keywordMap: Array<{
      keywords: string[]
      method: { id: string; name: string; description: string; category: AIRecommendation['method']['category'] }
      alternatives: Array<{ id: string; name: string; description: string }>
      reasoning: string[]
    }> = [
      // 평균 비교 (2그룹)
      {
        keywords: ['평균', '차이', '비교', '두 그룹', '2그룹', '두 집단', 't검정', 't-test'],
        method: { id: 't-test', name: '독립표본 t-검정', description: '두 독립적인 그룹의 평균 비교', category: 't-test' },
        alternatives: [
          { id: 'mann-whitney', name: 'Mann-Whitney U 검정', description: '정규성 가정 미충족 시' },
          { id: 'welch-t', name: 'Welch t-검정', description: '등분산 가정 미충족 시' }
        ],
        reasoning: ['두 그룹의 평균 비교에 적합', '독립적인 표본 비교', '연속형 변수 분석']
      },
      // 대응표본
      {
        keywords: ['대응', '사전', '사후', '전후', '짝지은', 'paired', '반복측정'],
        method: { id: 'paired-t', name: '대응표본 t-검정', description: '동일 대상의 사전-사후 비교', category: 't-test' },
        alternatives: [
          { id: 'wilcoxon', name: 'Wilcoxon 부호순위 검정', description: '정규성 가정 미충족 시' }
        ],
        reasoning: ['동일 대상의 전후 비교', '대응되는 표본 분석', '사전-사후 효과 측정']
      },
      // 3그룹 이상 비교
      {
        keywords: ['여러 그룹', '3그룹', '세 그룹', '다중 비교', 'anova', '분산분석', '세 집단', '네 그룹'],
        method: { id: 'anova', name: '일원배치 분산분석', description: '세 개 이상 그룹의 평균 비교', category: 'anova' },
        alternatives: [
          { id: 'kruskal-wallis', name: 'Kruskal-Wallis 검정', description: '정규성 가정 미충족 시' },
          { id: 'welch-anova', name: 'Welch ANOVA', description: '등분산 가정 미충족 시' }
        ],
        reasoning: ['세 개 이상 그룹 비교', '집단 간 차이 검정', '일원배치 설계']
      },
      // 상관관계
      {
        keywords: ['상관', '관계', '연관', '관련', 'correlation', '상관계수'],
        method: { id: 'pearson-correlation', name: 'Pearson 상관분석', description: '두 연속형 변수 간 선형 관계', category: 'correlation' },
        alternatives: [
          { id: 'spearman-correlation', name: 'Spearman 상관분석', description: '비선형 관계 또는 서열 변수' },
          { id: 'kendall-correlation', name: 'Kendall 상관분석', description: '소표본 또는 순위 데이터' }
        ],
        reasoning: ['두 변수 간 관계 분석', '선형 관계 측정', '연속형 변수 간 상관']
      },
      // 회귀분석
      {
        keywords: ['회귀', '예측', '영향', '효과', 'regression', '종속변수', '독립변수'],
        method: { id: 'regression', name: '단순 선형 회귀', description: '한 변수가 다른 변수에 미치는 영향', category: 'regression' },
        alternatives: [
          { id: 'multiple-regression', name: '다중 회귀분석', description: '여러 독립변수 사용 시' },
          { id: 'logistic-regression', name: '로지스틱 회귀', description: '이분형 종속변수' }
        ],
        reasoning: ['변수 간 영향 관계 분석', '예측 모델 구축', '인과관계 추정']
      },
      // 카이제곱
      {
        keywords: ['범주', '빈도', '교차', '독립성', '카이제곱', 'chi-square', '카이스퀘어'],
        method: { id: 'chi-square-independence', name: '카이제곱 독립성 검정', description: '두 범주형 변수 간 독립성 검정', category: 'chi-square' },
        alternatives: [
          { id: 'fisher-exact', name: 'Fisher 정확 검정', description: '소표본 또는 기대빈도 낮을 때' },
          { id: 'chi-square-gof', name: '적합도 검정', description: '관측 vs 기대 빈도 비교' }
        ],
        reasoning: ['범주형 변수 분석', '변수 간 독립성 검정', '빈도 데이터 분석']
      },
      // 시계열
      {
        keywords: ['시계열', '추세', '트렌드', 'time series', 'arima', '월별', '연도별', '계절'],
        method: { id: 'arima', name: 'ARIMA 분석', description: '시계열 데이터 예측 및 분석', category: 'advanced' },
        alternatives: [
          { id: 'time-series-decomposition', name: '시계열 분해', description: '추세, 계절성 분리' }
        ],
        reasoning: ['시간에 따른 패턴 분석', '추세 및 계절성 파악', '미래 값 예측']
      },
      // 생존분석
      {
        keywords: ['생존', '사건', '생존율', 'survival', 'kaplan', 'cox', '사망', '이탈'],
        method: { id: 'kaplan-meier', name: 'Kaplan-Meier 분석', description: '생존 곡선 추정', category: 'advanced' },
        alternatives: [
          { id: 'cox-regression', name: 'Cox 회귀', description: '공변량이 생존에 미치는 영향' }
        ],
        reasoning: ['사건 발생까지의 시간 분석', '생존 확률 추정', '중도절단 데이터 처리']
      },
      // 기술통계 (기본) - 가장 마지막에 배치 (다른 매칭 없을 때 기본값)
      {
        keywords: ['기술통계', '요약', '기초통계', 'descriptive', '통계량', '표준편차'],
        method: { id: 'descriptive-stats', name: '기술통계', description: '데이터의 기본 특성 요약', category: 'descriptive' },
        alternatives: [],
        reasoning: ['데이터 기본 특성 파악', '평균, 표준편차 등 계산', '분포 확인']
      }
    ]

    // 키워드 매칭
    let bestMatch = keywordMap[keywordMap.length - 1] // 기본값: 기술통계
    let maxScore = 0

    for (const mapping of keywordMap) {
      const score = mapping.keywords.filter(kw => input.includes(kw)).length
      if (score > maxScore) {
        maxScore = score
        bestMatch = mapping
      }
    }

    const recommendation: AIRecommendation = {
      method: bestMatch.method,
      confidence: Math.min(0.5 + maxScore * 0.1, 0.85), // 키워드 기반이므로 최대 0.85
      reasoning: bestMatch.reasoning,
      assumptions: [],
      alternatives: bestMatch.alternatives.map(alt => ({
        ...alt,
        category: this.getCategoryFromMethodId(alt.id)
      }))
    }

    const responseText = `키워드 분석 결과, **${bestMatch.method.name}**을(를) 추천드립니다.\n\n(참고: AI 서버 연결 불가로 키워드 기반 추천을 제공합니다. 더 정확한 추천을 원하시면 '단계별 가이드'를 이용해주세요.)`

    logger.info('[Ollama] Keyword-based fallback recommendation', {
      methodId: recommendation.method.id,
      keywordScore: maxScore
    })

    return { recommendation, responseText }
  }
}

// 싱글톤 인스턴스
export const ollamaRecommender = new OllamaRecommender()
