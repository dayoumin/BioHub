/**
 * 모호한 프롬프트 테스트:
 * 1. 현재 프롬프트 → 단일 추천 + fallback 느낌 alternatives
 * 2. 개선 프롬프트 → 다관점 추천 + 보강된 데이터 컨텍스트
 */

const API_KEY = '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'
const MODEL = 'z-ai/glm-4.5-air:free'

// 현재 시스템 프롬프트 (간략화)
const CURRENT_PROMPT = `당신은 전문 통계 분석 컨설턴트입니다.
사용자의 분석 요구와 데이터 특성을 고려하여 가장 적합한 통계 방법을 추천하세요.

## 응답 규칙
1. 먼저 왜 이 방법을 추천하는지 한국어 2-3문장으로 설명하세요.
2. 그 다음 \`\`\`json 블록으로 추천 결과를 제공하세요.

## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["이유1", "이유2"],
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "왜 대안인지 설명" }
  ]
}
\`\`\`

## 사용 가능한 통계 방법 ID
- descriptive-stats, frequency-table, t-test, paired-t-test, one-sample-t-test
- one-way-anova, two-way-anova, repeated-measures-anova, ancova
- correlation, partial-correlation, spearman-correlation
- linear-regression, multiple-regression, logistic-regression
- mann-whitney, kruskal-wallis, wilcoxon-signed-rank, friedman-test
- chi-square-test, factor-analysis, pca, cluster-analysis

## 주의사항
- confidence: 0.9+ 매우 확신, 0.7-0.9 확신, 0.5-0.7 보통
- alternatives: 2-3개 제시하고, 각각 왜 대안인지 설명하세요.
- 반드시 한국어로 응답하세요.`

// 개선 시스템 프롬프트
const IMPROVED_PROMPT = `당신은 전문 통계 분석 컨설턴트입니다.
사용자의 분석 요구와 데이터 특성을 고려하여 가장 적합한 통계 방법을 추천하세요.

## 응답 규칙
1. 먼저 왜 이 방법을 추천하는지 한국어 2-3문장으로 설명하세요.
2. 그 다음 \`\`\`json 블록으로 추천 결과를 제공하세요.
3. **모호한 질문 처리**: 사용자 질문이 여러 분석 관점을 포함하면:
   - confidence를 0.6-0.7로 낮추고
   - alternatives에 "다른 시각에서의 분석"을 제시하세요
   - 각 alternative의 description은 "이 관점에서 보면: ..."으로 시작

## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["이유1", "이유2"],
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "이 관점에서 보면: ..." }
  ],
  "ambiguityNote": "질문이 모호한 경우에만 포함. 어떤 부분이 모호한지 설명"
}
\`\`\`

## 사용 가능한 통계 방법 ID
- descriptive-stats, frequency-table, t-test, paired-t-test, one-sample-t-test
- one-way-anova, two-way-anova, repeated-measures-anova, ancova
- correlation, partial-correlation, spearman-correlation
- linear-regression, multiple-regression, logistic-regression
- mann-whitney, kruskal-wallis, wilcoxon-signed-rank, friedman-test
- chi-square-test, factor-analysis, pca, cluster-analysis

## 주의사항
- confidence: 0.9+ 매우 확신, 0.7-0.9 확신, 0.5-0.7 보통
- alternatives는 "주 추천이 안 될 때의 fallback"이 아니라, **같은 데이터를 다른 시각에서 분석하는 방법**입니다.
- 반드시 한국어로 응답하세요.`

// 데이터 컨텍스트: 현재 vs 보강
const CURRENT_DATA = `## 데이터 요약
- 전체: 200행 × 8열
- 수치형 변수 (6개): 매출액, 광고비, 직원수, 고객만족도, 재방문율, 경쟁사수
- 범주형 변수 (2개): 지역, 업종

## 변수 상세 통계
| 변수명 | 타입 | 평균 | 표준편차 | 최솟값 | 최댓값 | 고유값 | 결측 |
|--------|------|------|---------|--------|--------|--------|------|
| 매출액 | numeric | 5200 | 3100 | 500 | 18000 | 195 | 3 |
| 광고비 | numeric | 320 | 180 | 20 | 950 | 190 | 0 |
| 직원수 | numeric | 8.5 | 4.2 | 1 | 25 | 22 | 0 |
| 고객만족도 | numeric | 3.6 | 0.9 | 1 | 5 | 5 | 5 |
| 재방문율 | numeric | 42.5 | 15.3 | 8 | 85 | 180 | 2 |
| 경쟁사수 | numeric | 4.8 | 2.1 | 1 | 12 | 12 | 0 |
| 지역 | categorical | - | - | - | - | 5 | 0 |
| 업종 | categorical | - | - | - | - | 4 | 0 |

## 통계적 가정 검정
(가정 검정 미실시)`

const ENRICHED_DATA = `## 데이터 요약
- 전체: 200행 × 8열
- 수치형 변수 (6개): 매출액, 광고비, 직원수, 고객만족도, 재방문율, 경쟁사수
- 범주형 변수 (2개): 지역, 업종

## 변수 상세 통계
| 변수명 | 타입 | 평균 | 표준편차 | 최솟값 | 최댓값 | 왜도 | 고유값 | 결측 |
|--------|------|------|---------|--------|--------|------|--------|------|
| 매출액 | numeric | 5200 | 3100 | 500 | 18000 | 1.42 | 195 | 3 |
| 광고비 | numeric | 320 | 180 | 20 | 950 | 0.85 | 190 | 0 |
| 직원수 | numeric | 8.5 | 4.2 | 1 | 25 | 0.72 | 22 | 0 |
| 고객만족도 | numeric | 3.6 | 0.9 | 1 | 5 | -0.35 | 5 | 5 |
| 재방문율 | numeric | 42.5 | 15.3 | 8 | 85 | 0.12 | 180 | 2 |
| 경쟁사수 | numeric | 4.8 | 2.1 | 1 | 12 | 0.55 | 12 | 0 |
| 지역 | categorical | - | - | - | - | - | 5 | 0 |
| 업종 | categorical | - | - | - | - | - | 4 | 0 |

## 범주형 변수 상세
- 지역: 서울(52), 부산(45), 대전(38), 광주(35), 대구(30)
- 업종: 음식(62), 서비스(55), 의류(48), 전자(35)

## 통계적 가정 검정
(가정 검정 미실시)`

// 모호한 질문
const AMBIGUOUS_QUESTION = `## 사용자 질문
이 매출 데이터를 종합적으로 분석하고 싶어요. 어떤 요인이 중요한지, 그리고 지역이나 업종별로 패턴이 다른지도 궁금합니다.`

async function callApi(systemPrompt, userPrompt, label) {
  const start = Date.now()
  console.log(`\n${'='.repeat(70)}`)
  console.log(label)
  console.log('='.repeat(70))

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Statistical Analysis Platform'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2000
    }),
    signal: controller.signal
  })

  clearTimeout(timeoutId)
  const elapsed = Date.now() - start

  if (!response.ok) {
    console.log(`  ❌ HTTP ${response.status}`)
    return null
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content?.trim() || ''
  const tokens = data.usage?.total_tokens || 0

  console.log(`  ✅ ${elapsed}ms, ${tokens} tokens`)

  // 설명 텍스트 (JSON 이전)
  const codeBlockMatch = content.match(/```json[\s\S]*?```/)
  if (codeBlockMatch) {
    const explanation = content.substring(0, content.indexOf(codeBlockMatch[0])).trim()
    console.log(`\n  💬 설명: ${explanation}`)
  }

  // JSON 파싱
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[1])
    console.log(`\n  📋 추천: ${parsed.methodId} (${parsed.methodName})`)
    console.log(`  🎯 확신도: ${parsed.confidence}`)
    console.log(`  📝 이유:`)
    parsed.reasoning?.forEach((r, i) => console.log(`     ${i+1}. ${r}`))

    if (parsed.ambiguityNote) {
      console.log(`  ❓ 모호성 노트: ${parsed.ambiguityNote}`)
    }

    console.log(`  🔀 대안:`)
    parsed.alternatives?.forEach(a => {
      console.log(`     - ${a.id}: ${a.name}`)
      console.log(`       ${a.description}`)
    })

    return parsed
  }

  console.log(`  ⚠️ JSON 파싱 실패`)
  return null
}

async function main() {
  console.log('=== 모호한 프롬프트 테스트: 현재 vs 개선 ===\n')

  // 테스트 1: 현재 프롬프트 + 현재 데이터
  const r1 = await callApi(
    CURRENT_PROMPT,
    CURRENT_DATA + '\n\n' + AMBIGUOUS_QUESTION,
    'A. 현재 프롬프트 + 현재 데이터'
  )

  // 테스트 2: 개선 프롬프트 + 보강 데이터
  const r2 = await callApi(
    IMPROVED_PROMPT,
    ENRICHED_DATA + '\n\n' + AMBIGUOUS_QUESTION,
    'B. 개선 프롬프트 + 보강 데이터 (skewness + topCategories)'
  )

  // 비교
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('비교 결과')
  console.log('='.repeat(70))

  if (r1 && r2) {
    console.log('\n  [A] 현재:')
    console.log(`    추천: ${r1.methodId} (${r1.confidence})`)
    console.log(`    대안 수: ${r1.alternatives?.length || 0}`)
    console.log(`    대안들: ${r1.alternatives?.map(a => a.id).join(', ')}`)
    console.log(`    모호성 감지: ${r1.ambiguityNote ? '✅ ' + r1.ambiguityNote : '❌ 없음'}`)

    console.log('\n  [B] 개선:')
    console.log(`    추천: ${r2.methodId} (${r2.confidence})`)
    console.log(`    대안 수: ${r2.alternatives?.length || 0}`)
    console.log(`    대안들: ${r2.alternatives?.map(a => a.id).join(', ')}`)
    console.log(`    모호성 감지: ${r2.ambiguityNote ? '✅ ' + r2.ambiguityNote : '❌ 없음'}`)

    // 핵심 차이
    console.log('\n  핵심 차이:')
    if (r2.confidence < r1.confidence) {
      console.log(`    ✅ 확신도 낮아짐: ${r1.confidence} → ${r2.confidence} (모호성 인지)`)
    }
    if (r2.ambiguityNote) {
      console.log(`    ✅ 모호성 명시: "${r2.ambiguityNote.substring(0, 80)}"`)
    }

    // 대안의 "관점" 포함 여부
    const hasViewpoint = r2.alternatives?.some(a =>
      a.description.includes('관점') || a.description.includes('시각') || a.description.includes('보면')
    )
    console.log(`    대안에 "다른 시각" 포함: ${hasViewpoint ? '✅' : '❌'}`)
  }
}

main().catch(console.error)
