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
      // ✅ 프롬프트 구성 (assumptionResults 반영)
      const prompt = this.buildPromptWithAssumptions(
        purpose,
        assumptionResults,
        validationResults,
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
      const recommendation = this.parseOllamaResponse(ollamaResponse.response)

      if (recommendation) {
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
      'survival': '생존분석'
    }

    // 가정 검정 결과 요약
    const normalityInfo = assumptionResults.normality?.shapiroWilk
      ? `Shapiro-Wilk: p=${assumptionResults.normality.shapiroWilk.pValue !== undefined ? assumptionResults.normality.shapiroWilk.pValue.toFixed(3) : 'N/A'} (${assumptionResults.normality.shapiroWilk.isNormal ? '정규성 충족' : '정규성 미충족'})`
      : '정규성 검정 미실시'

    const homogeneityInfo = assumptionResults.homogeneity?.levene
      ? `Levene: p=${assumptionResults.homogeneity.levene.pValue !== undefined ? assumptionResults.homogeneity.levene.pValue.toFixed(3) : 'N/A'} (${assumptionResults.homogeneity.levene.equalVariance ? '등분산성 충족' : '등분산성 미충족'})`
      : '등분산성 검정 미실시'

    return `
Analysis Purpose: ${purposeMap[purpose]}

Data Characteristics:
- Sample size: ${n} rows
- Numeric variables: ${numericVars}
- Categorical variables: ${categoricalVars}

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
}

// 싱글톤 인스턴스
export const ollamaRecommender = new OllamaRecommender()
