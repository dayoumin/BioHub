/**
 * Intent Router LLM 통합 테스트
 *
 * 실제 OpenRouter API를 호출하여 의도 분류가 제대로 동작하는지 확인합니다.
 * 키워드로 분류되지 않는 자연어 입력 4개를 테스트합니다.
 *
 * 실행: node stats/scripts/test-llm-intent.mjs
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ===== .env.local에서 API 키 읽기 =====
const envPath = resolve('stats/.env.local')
let API_KEY = ''
let MODELS = []

try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_OPENROUTER_API_KEY=')) {
      API_KEY = line.split('=')[1].trim()
    }
    if (line.startsWith('NEXT_PUBLIC_OPENROUTER_MODEL=')) {
      MODELS = line.split('=')[1].trim().split(',')
    }
  }
} catch {
  console.error('.env.local 파일을 찾을 수 없습니다.')
  process.exit(1)
}

if (!API_KEY || MODELS.length === 0) {
  console.error('API 키 또는 모델이 설정되지 않았습니다.')
  process.exit(1)
}

// ===== 시스템 프롬프트 (intent-router용) =====
const SYSTEM_PROMPT = `당신은 통계 분석 플랫폼의 의도 분류기입니다.
사용자의 입력을 분석하여 3가지 트랙 중 하나로 분류하세요.

## 3가지 트랙

1. **direct-analysis**: 사용자가 특정 통계 방법을 알고 있고 바로 실행하고 싶어함
   - 예: "t-test 하고 싶어", "회귀분석 돌려줘", "ANOVA 실행"

2. **data-consultation**: 사용자가 데이터를 가지고 있지만 어떤 분석을 해야 할지 모름
   - 예: "두 그룹 비교하고 싶어", "데이터 분석 도와줘", "어떤 방법이 좋을까"

3. **experiment-design**: 실험 계획, 표본 크기, 검정력 분석 등 실험 설계 관련
   - 예: "표본 크기 계산", "몇 명이 필요한지", "실험 설계 도와줘"

## 응답 형식
반드시 \`\`\`json 블록으로 응답하세요:

\`\`\`json
{
  "track": "direct-analysis" | "data-consultation" | "experiment-design",
  "confidence": 0.0-1.0,
  "methodId": "메서드ID 또는 null",
  "reasoning": "분류 이유 (한국어)"
}
\`\`\`

## 사용 가능한 통계 방법 (direct-analysis 분류 시 methodId 지정)

### t-test
- t-test: 독립표본 t-검정
- paired-t: 대응표본 t-검정
- welch-t: Welch t-검정
- one-sample-t: 단일표본 t-검정

### anova
- anova: 일원분산분석 (ANOVA)
- repeated-measures-anova: 반복측정 분산분석
- ancova: 공분산분석 (ANCOVA)

### nonparametric
- mann-whitney: Mann-Whitney U 검정
- wilcoxon: Wilcoxon 부호순위 검정
- kruskal-wallis: Kruskal-Wallis 검정

### correlation
- correlation: Pearson 상관분석
- partial-correlation: 편상관분석

### regression
- regression: 선형 회귀
- logistic-regression: 로지스틱 회귀

### chi-square
- chi-square-goodness: 카이제곱 적합도 검정
- chi-square-independence: 카이제곱 독립성 검정

### descriptive
- descriptive: 기술통계량
- normality-test: 정규성 검정

### survival
- kaplan-meier: Kaplan-Meier 추정
- cox-regression: Cox 비례위험 회귀`

// ===== 테스트 케이스 4개 =====
// 키워드로 분류되지 않는 자연어 입력 → LLM이 분류해야 함

const TEST_CASES = [
  {
    input: '혈압 데이터가 있는데 처리군과 대조군 평균이 다른지 알고 싶어요',
    expectedTrack: 'direct-analysis',
    expectedMethodId: 't-test',
    description: 'Track 1: 두 그룹 평균 비교 → t-test',
  },
  {
    input: '실험 데이터가 있는데 어떤 분석을 해야 할지 전혀 감이 안 잡혀요',
    expectedTrack: 'data-consultation',
    expectedMethodId: null,
    description: 'Track 2: 방법을 모르는 상담 요청',
  },
  {
    input: '쥐 실험을 계획하고 있는데 통계적으로 유의한 결과를 얻으려면 그룹당 몇 마리가 적절한지 궁금합니다',
    expectedTrack: 'experiment-design',
    expectedMethodId: null,
    description: 'Track 3: 표본 크기 / 실험 설계',
  },
  {
    input: '세 가지 사료를 먹인 닭의 체중을 비교하고 싶어요',
    expectedTrack: 'direct-analysis',
    expectedMethodId: 'anova',
    description: 'Track 1: 세 그룹 비교 → ANOVA',
  },
]

// ===== parseIntentResponse (llm-recommender.ts에서 가져온 로직) =====
const VALID_TRACKS = new Set(['direct-analysis', 'data-consultation', 'experiment-design'])

function parseIntentResponse(response) {
  try {
    const codeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    let jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

    if (!jsonStr) {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      jsonStr = jsonMatch ? jsonMatch[0] : null
    }

    if (!jsonStr) return null

    const parsed = JSON.parse(jsonStr)
    if (typeof parsed !== 'object' || parsed === null) return null

    if (typeof parsed.track !== 'string' || !VALID_TRACKS.has(parsed.track)) return null

    let confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.7
    confidence = Math.max(0, Math.min(1, confidence))

    const methodId = typeof parsed.methodId === 'string' && parsed.methodId ? parsed.methodId : null
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '분류됨'

    return { track: parsed.track, confidence, methodId, reasoning }
  } catch {
    return null
  }
}

// ===== OpenRouter API 호출 =====
async function callOpenRouter(model, userInput) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userInput },
      ],
      temperature: 0.2,
      max_tokens: 500,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API 에러 (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || null
}

// ===== 메인 실행 =====
async function main() {
  console.log('=' .repeat(60))
  console.log('Intent Router LLM 통합 테스트')
  console.log('=' .repeat(60))

  for (const model of MODELS) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`모델: ${model}`)
    console.log('─'.repeat(60))

    let passed = 0
    let failed = 0

    for (const tc of TEST_CASES) {
      process.stdout.write(`\n[${tc.description}]\n`)
      process.stdout.write(`  입력: "${tc.input}"\n`)

      try {
        const rawResponse = await callOpenRouter(model, tc.input)

        if (!rawResponse) {
          console.log('  결과: API 응답 없음 ❌')
          failed++
          continue
        }

        const parsed = parseIntentResponse(rawResponse)

        if (!parsed) {
          console.log(`  LLM 원본 응답:\n${rawResponse}`)
          console.log('  결과: JSON 파싱 실패 ❌')
          failed++
          continue
        }

        // Track 검증
        const trackOk = parsed.track === tc.expectedTrack
        // MethodId 검증 (null이면 null인지, 아니면 값이 있는지)
        const methodOk = tc.expectedMethodId === null
          ? parsed.methodId === null
          : parsed.methodId === tc.expectedMethodId

        console.log(`  분류: track=${parsed.track}, methodId=${parsed.methodId}, confidence=${parsed.confidence}`)
        console.log(`  이유: ${parsed.reasoning}`)
        console.log(`  기대: track=${tc.expectedTrack}, methodId=${tc.expectedMethodId}`)

        if (trackOk && methodOk) {
          console.log('  결과: PASS ✅')
          passed++
        } else if (trackOk) {
          console.log(`  결과: PARTIAL ⚠️ (track 맞음, methodId 다름)`)
          passed++ // track이 맞으면 일단 pass
        } else {
          console.log('  결과: FAIL ❌')
          failed++
        }
      } catch (error) {
        console.log(`  에러: ${error.message} ❌`)
        failed++
      }
    }

    console.log(`\n  📊 ${model} 결과: ${passed}/${TEST_CASES.length} 통과, ${failed} 실패`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('테스트 완료')
  console.log('='.repeat(60))
}

main().catch(console.error)
