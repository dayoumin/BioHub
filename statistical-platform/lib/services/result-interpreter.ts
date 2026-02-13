/**
 * 통계 분석 결과 AI 해석 서비스
 *
 * - 분석 결과를 구조화된 프롬프트로 변환
 * - OpenRouterRecommender.streamChatCompletion() 호출 (API 로직 재사용)
 * - 스트리밍 응답 → UI에 실시간 표시
 */

import type { AnalysisResult, EffectSizeInfo } from '@/types/smart-flow'
import { openRouterRecommender } from './openrouter-recommender'
import { logger } from '@/lib/utils/logger'

export interface InterpretationContext {
  results: AnalysisResult
  sampleSize?: number
  variables?: string[]
  uploadedFileName?: string
}

// ============================================
// 시스템 프롬프트
// ============================================

const INTERPRETATION_SYSTEM_PROMPT = `당신은 옆자리 동료처럼 친근하게 통계 결과를 설명해주는 데이터 분석 도우미예요.
통계를 잘 모르는 사람도 이해할 수 있도록 쉽게 풀어서 설명해주세요.

## 톤 & 스타일
- 친구에게 설명하듯 편안하게 ("~해요", "~네요", "~거든요")
- 전문 용어를 쓸 때는 꼭 괄호 안에 쉬운 설명을 넣어주세요
  예: "p-value(이 결과가 우연히 나왔을 가능성)가 0.003이에요"
  예: "효과크기(실제로 얼마나 큰 차이인지)가 0.82로 꽤 커요"
- 숫자를 인용할 때 원본 값을 정확히 사용
- "즉," "쉽게 말하면," "결국" 같은 연결어로 핵심을 강조

## 응답 형식 (필수)

반드시 아래 두 마크다운 헤더를 사용하여 응답하세요:

### 한줄 요약
핵심 결론을 3-4문장으로 요약해요.
- "결국 ~라는 뜻이에요", "쉽게 말하면 ~" 같은 표현으로 명확하게
- 통계적으로 유의한지 + 실제로 어떤 의미인지 둘 다 포함
- p-value와 효과크기 수치를 반드시 언급
- 논문에 넣을 말이 아니라, 상사에게 보고하듯 핵심만

### 상세 해석
아래 항목을 순서대로, **볼드 소제목**으로 작성하세요:

**통계량 해석**: 검정 통계량과 p-value가 뜻하는 바를 쉽게 풀어서
**효과크기**: 실제로 얼마나 큰 차이/관계인지 — "크다/보통/작다"를 구체적으로
**신뢰구간**: 실제 값이 어디쯤인지 범위의 의미 (있을 경우)
**가정 충족 여부**: 분석 조건(가정)이 충족되었는지 (있을 경우)
**그룹/변수별 패턴**: 어디서 차이가 나는지 구체적으로 (있을 경우)
**활용 방법**: 연구나 현장에서 이 결과를 어떻게 쓸 수 있는지
**주의할 점**: 해석할 때 조심해야 할 것들
**추가 분석 제안**: 후속으로 해볼 만한 분석 1-2개

데이터에 해당 항목이 없는 경우에만 생략하세요. 나머지는 모두 작성하세요.
반드시 한국어로 응답하세요.`

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
// 해석 요청 (OpenRouterRecommender 재사용)
// ============================================

/**
 * AI 결과 해석 요청 (스트리밍)
 *
 * @param ctx - 분석 결과 컨텍스트
 * @param onChunk - 텍스트 조각 콜백
 * @param signal - AbortSignal (취소용)
 */
export async function requestInterpretation(
  ctx: InterpretationContext,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<{ model: string }> {
  // health check
  const isAvailable = await openRouterRecommender.checkHealth()
  if (!isAvailable) {
    throw new Error('AI 해석을 사용하려면 OpenRouter API 키가 필요합니다.')
  }

  const userPrompt = buildInterpretationPrompt(ctx)

  logger.info('[ResultInterpreter] Requesting interpretation', {
    method: ctx.results.method,
    promptLength: userPrompt.length
  })

  return openRouterRecommender.streamChatCompletion(
    INTERPRETATION_SYSTEM_PROMPT,
    userPrompt,
    onChunk,
    signal,
    { temperature: 0.3, maxTokens: 4000 }
  )
}
