/**
 * 통계 분석 결과 AI 해석 서비스
 *
 * - 분석 결과를 구조화된 프롬프트로 변환
 * - LlmRecommender.stream()을 통해 통합 스트리밍 (공급자 자동 선택)
 * - 스트리밍 응답 → UI에 실시간 표시
 */

import type { AnalysisResult, EffectSizeInfo } from '@/types/smart-flow'
import { llmRecommender, type LlmStreamResult } from './llm-recommender'
import { logger } from '@/lib/utils/logger'
import { SYSTEM_PROMPT_INTERPRETER } from './ai/prompts'

export interface InterpretationContext {
  results: AnalysisResult
  sampleSize?: number
  variables?: string[]
  uploadedFileName?: string
}

// ============================================
// 프롬프트 빌더
// ============================================

/**
 * 분석 결과를 구조화된 프롬프트 텍스트로 변환
 */
export function buildInterpretationPrompt(ctx: InterpretationContext): string {
  const { results } = ctx
  const parts: string[] = []

  // 기본 정보
  parts.push(`## 분석 방법\n${results.method}`)

  // 핵심 통계량
  parts.push(`## 핵심 결과`)
  parts.push(`- 검정 통계량: ${results.statistic.toFixed(4)}`)
  if (results.df !== undefined) {
    parts.push(`- 자유도(df): ${results.df}`)
  }
  parts.push(`- p-value: ${results.pValue.toFixed(6)}`)
  parts.push(`- 유의수준 α=0.05 기준: ${results.pValue < 0.05 ? '통계적으로 유의함' : '통계적으로 유의하지 않음'}`)

  // 효과크기
  if (results.effectSize !== undefined) {
    const esInfo = formatEffectSize(results.effectSize)
    parts.push(`\n## 효과크기\n${esInfo}`)
  }

  // 신뢰구간
  if (results.confidence) {
    const level = results.confidence.level ?? 0.95
    parts.push(`\n## 신뢰구간 (${(level * 100).toFixed(0)}%)`)
    parts.push(`- 하한: ${results.confidence.lower.toFixed(4)}`)
    parts.push(`- 상한: ${results.confidence.upper.toFixed(4)}`)
  }

  // 그룹 통계
  if (results.groupStats?.length) {
    parts.push(`\n## 그룹별 기술통계`)
    parts.push(`| 그룹 | 표본수 | 평균 | 표준편차 |`)
    parts.push(`|------|--------|------|---------|`)
    for (const g of results.groupStats) {
      parts.push(`| ${g.name ?? '-'} | ${g.n} | ${g.mean.toFixed(3)} | ${g.std.toFixed(3)} |`)
    }
  }

  // 사후검정
  if (results.postHoc?.length) {
    parts.push(`\n## 사후검정 결과`)
    parts.push(`| 비교 | 평균차 | p-value | 유의 |`)
    parts.push(`|------|--------|---------|------|`)
    for (const ph of results.postHoc) {
      parts.push(`| ${ph.group1} vs ${ph.group2} | ${ph.meanDiff?.toFixed(3) ?? '-'} | ${ph.pvalue.toFixed(4)} | ${ph.significant ? 'Yes' : 'No'} |`)
    }
  }

  // 회귀 계수
  if (results.coefficients?.length) {
    parts.push(`\n## 회귀 계수`)
    parts.push(`| 변수 | 계수(B) | 표준오차 | t값 | p-value |`)
    parts.push(`|------|---------|---------|-----|---------|`)
    for (const c of results.coefficients) {
      parts.push(`| ${c.name} | ${c.value.toFixed(4)} | ${c.stdError.toFixed(4)} | ${c.tValue.toFixed(3)} | ${c.pvalue.toFixed(4)} |`)
    }
  }

  // 가정 검정
  if (results.assumptions) {
    const assumptionParts: string[] = []

    if (results.assumptions.normality?.shapiroWilk) {
      const { pValue, isNormal } = results.assumptions.normality.shapiroWilk
      assumptionParts.push(`- 정규성 (Shapiro-Wilk): p=${pValue?.toFixed(3) ?? 'N/A'}, ${isNormal ? '충족' : '미충족'}`)
    }
    if (results.assumptions.homogeneity?.levene) {
      const { pValue, equalVariance } = results.assumptions.homogeneity.levene
      assumptionParts.push(`- 등분산성 (Levene): p=${pValue?.toFixed(3) ?? 'N/A'}, ${equalVariance ? '충족' : '미충족'}`)
    }

    if (assumptionParts.length > 0) {
      parts.push(`\n## 가정 검정 결과\n${assumptionParts.join('\n')}`)
    }
  }

  // 추가 메트릭 (additional)
  if (results.additional) {
    const additionalParts: string[] = []
    const a = results.additional

    if (a.rSquared !== undefined) additionalParts.push(`- R²: ${a.rSquared.toFixed(4)}`)
    if (a.adjustedRSquared !== undefined) additionalParts.push(`- Adjusted R²: ${a.adjustedRSquared.toFixed(4)}`)
    if (a.rmse !== undefined) additionalParts.push(`- RMSE: ${a.rmse.toFixed(4)}`)
    if (a.aic !== undefined) additionalParts.push(`- AIC: ${a.aic.toFixed(2)}`)
    if (a.bic !== undefined) additionalParts.push(`- BIC: ${a.bic.toFixed(2)}`)
    if (a.accuracy !== undefined) additionalParts.push(`- 정확도: ${(a.accuracy * 100).toFixed(1)}%`)
    if (a.precision !== undefined) additionalParts.push(`- 정밀도: ${(a.precision * 100).toFixed(1)}%`)
    if (a.recall !== undefined) additionalParts.push(`- 재현율: ${(a.recall * 100).toFixed(1)}%`)
    if (a.f1Score !== undefined) additionalParts.push(`- F1 Score: ${a.f1Score.toFixed(4)}`)
    if (a.rocAuc !== undefined) additionalParts.push(`- ROC AUC: ${a.rocAuc.toFixed(4)}`)
    if (a.silhouetteScore !== undefined) additionalParts.push(`- Silhouette Score: ${a.silhouetteScore.toFixed(4)}`)
    if (a.alpha !== undefined) additionalParts.push(`- Cronbach's α: ${a.alpha.toFixed(4)}`)
    if (a.power !== undefined) additionalParts.push(`- 통계적 검정력: ${a.power.toFixed(4)}`)

    if (additionalParts.length > 0) {
      parts.push(`\n## 추가 메트릭\n${additionalParts.join('\n')}`)
    }
  }

  // 메타데이터
  const metaParts: string[] = []
  if (ctx.sampleSize) metaParts.push(`- 표본 크기: ${ctx.sampleSize}`)
  if (ctx.variables?.length) metaParts.push(`- 분석 변수: ${ctx.variables.join(', ')}`)
  if (ctx.uploadedFileName) metaParts.push(`- 데이터 파일: ${ctx.uploadedFileName}`)

  if (metaParts.length > 0) {
    parts.push(`\n## 데이터 정보\n${metaParts.join('\n')}`)
  }

  parts.push(`\n위 통계 분석 결과를 해석해주세요.`)

  return parts.join('\n')
}

/**
 * 효과크기 포맷팅
 */
function formatEffectSize(effectSize: number | EffectSizeInfo): string {
  if (typeof effectSize === 'number') {
    return `- 값: ${effectSize.toFixed(4)}`
  }

  const parts: string[] = []
  parts.push(`- 유형: ${effectSize.type}`)
  parts.push(`- 값: ${effectSize.value.toFixed(4)}`)
  if (effectSize.interpretation) {
    parts.push(`- 해석: ${effectSize.interpretation}`)
  }
  return parts.join('\n')
}

// ============================================
// 해석 요청 (LlmRecommender 통합 스트리밍)
// ============================================

/**
 * AI 결과 해석 요청 (스트리밍)
 *
 * LlmRecommender.stream()을 통해 공급자 설정을 존중하며 스트리밍합니다.
 * 실제 사용된 모델 정보를 반환합니다.
 */
export async function requestInterpretation(
  ctx: InterpretationContext,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<{ model: string }> {
  const userPrompt = buildInterpretationPrompt(ctx)

  logger.info('[ResultInterpreter] Requesting interpretation via unified LlmRecommender', {
    method: ctx.results.method,
    promptLength: userPrompt.length
  })

  // 통합 스트리밍 인터페이스 사용 — 반환값에서 모델 정보 추출
  const generator = llmRecommender.stream(
    SYSTEM_PROMPT_INTERPRETER,
    userPrompt,
    signal
  )

  let streamResult: LlmStreamResult | undefined
  while (true) {
    const { value, done } = await generator.next()
    if (done) {
      // done일 때 value는 return 타입 (LlmStreamResult)
      streamResult = value
      break
    }
    // yielded value는 string chunk
    onChunk(value)
  }

  return { model: streamResult?.model ?? 'unknown' }
}
