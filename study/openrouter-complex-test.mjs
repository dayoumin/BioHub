/**
 * 복잡한 시나리오 3개 테스트
 * - 모호한 분석 목적 / 가정 위반 / 다변량 데이터
 */

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY

if (!API_KEY) {
  console.error('❌ API Key가 없습니다.')
  console.error('다음 명령어로 실행하세요:')
  console.error('node --env-file=../statistical-platform/.env.local study/openrouter-complex-test.mjs')
  process.exit(1)
}
const MODEL = 'z-ai/glm-4.5-air:free'

const SYSTEM_PROMPT = `당신은 전문 통계 분석 컨설턴트입니다.
사용자의 분석 요구와 데이터 특성을 고려하여 가장 적합한 통계 방법을 추천하세요.

## 핵심 분석 규칙
1. **가정 위반 처리**: 
   - 정규성 위반 시: 비모수 검정(Mann-Whitney, Kruskal-Wallis 등)을 1순위로 추천하거나, 데이터 변환을 제안하세요.
   - 등분산성 위반 시: Welch's t-test(t-test의 옵션)나 비모수 검정을 고려하세요.
   - 표본이 30개 미만이고 정규성 검정이 없으면 비모수 검정을 권장하세요.

2. **다변량 데이터**:
   - 독립변수가 2개 이상인 경우 단순 검정(t-test, one-way ANOVA)보다 다중회귀분석(Multiple Regression)이나 이원배치 분산분석(Two-way ANOVA) 등을 우선 고려하세요.
   - 공변량(Covariate) 통제 요구가 있으면 ANCOVA를 추천하세요.

3. **모호한 목적**:
   - 목적이 불분명하면 변수 타입을 보고 가장 일반적인 분석(상관분석, 회귀분석 등)을 제안하되, confidence를 0.6 이하로 낮추세요.
   - 탐색적/종합적 분석 요청 시에는 요인분석(Factor Analysis)이나 PCA, 혹은 다중회귀분석을 상황에 맞게 제안하세요.

## 응답 프로세스
1. 먼저 왜 이 방법을 추천하는지, 가정 위반이나 데이터 구조를 어떻게 고려했는지 한국어 2-3문장으로 설명하세요.
2. 그 다음 \`\`\`json 블록으로 추천 결과를 제공하세요.

## JSON 응답 형식
\`\`\`json
{
  "methodId": "정확한-메서드-ID",
  "methodName": "한글 메서드명",
  "confidence": 0.85,
  "reasoning": ["가정 위반(정규성)으로 인해 비모수 검정 선택", "독립변수가 2개 이상이라 다중회귀분석 선택", "이유3"],
  "alternatives": [
    { "id": "대안-ID", "name": "대안명", "description": "왜 대안인지 설명" }
  ],
  "variableAssignments": {
    "dependent": ["종속변수명 (1개 또는 여러개)"],
    "independent": ["독립변수명 (1개 또는 여러개)"],
    "factor": ["요인변수명 (ANOVA 등에서 사용)"],
    "covariate": ["공변량명 (ANCOVA 등에서 사용)"]
  },
  "suggestedSettings": {
    "alpha": 0.05,
    "postHoc": "tukey",
    "alternative": "two-sided"
  },
  "warnings": ["표본 수가 적어 결과 해석 주의", "다중공선성 주의 필요"],
  "dataPreprocessing": ["로그 변환 제안", "결측치 제거 필요"]
}
\`\`\`

## 사용 가능한 통계 방법 ID
### t-test
- t-test: 독립표본 t-검정 (Student/Welch)
- paired-t-test: 대응표본 t-검정
- one-sample-t-test: 단일표본 t-검정

### anova
- one-way-anova: 일원배치 분산분석
- two-way-anova: 이원배치 분산분석 (요인 2개)
- repeated-measures-anova: 반복측정 분산분석
- ancova: 공분산분석 (범주형 요인 + 연속형 공변량)

### correlation
- correlation: 피어슨 상관분석
- partial-correlation: 편상관분석
- spearman-correlation: 스피어만 상관분석 (비모수/순위)

### regression
- linear-regression: 단순 선형 회귀분석
- multiple-regression: 다중 회귀분석
- logistic-regression: 로지스틱 회귀분석
- polynomial-regression: 다항 회귀분석

### non-parametric
- mann-whitney: 만-위트니 U 검정 (t-test 대응)
- kruskal-wallis: 크루스칼-월리스 검정 (ANOVA 대응)
- wilcoxon-signed-rank: 윌콕슨 부호순위 검정 (paired t-test 대응)
- friedman-test: 프리드만 검정 (RM ANOVA 대응)

### chi-square
- chi-square-test: 카이제곱 검정

### advanced
- factor-analysis: 요인분석
- pca: 주성분분석
- cluster-analysis: 군집분석

## 변수 할당 규칙
- variableAssignments: 데이터의 실제 변수명을 역할에 매핑
- 독립변수(independent)와 요인(factor) 구분:
  - 회귀분석 계열: independent 사용
  - 분산분석 계열: factor 사용 (단, ANCOVA의 공변량은 covariate)
- suggestedSettings: 데이터 특성에 맞는 설정 제안 (parametric 여부 등)

## 주의사항
- methodId는 위 목록의 정확한 ID만 사용
- confidence:
  - 0.9+: 명확한 목적 + 가정 충족 + 적절한 데이터
  - 0.7-0.9: 합리적 추론 가능
  - 0.5-0.7: 목적 모호함 또는 가정 위반이나 데이터 부족으로 인한 불확실성
- 반드시 한국어로 응답`

const SCENARIOS = [
  {
    name: '시나리오 1: 가정 위반 + 모호한 목적',
    prompt: `## 데이터 요약
- 전체: 45행 × 6열
- 수치형 변수 (4개): 체중_g, 체장_cm, 비만도, 사료량_g
- 범주형 변수 (2개): 양식장(A/B/C), 성별(수컷/암컷)

## 변수 상세 통계
| 변수명 | 타입 | 평균 | 표준편차 | 최솟값 | 최댓값 | 고유값 | 결측 |
|--------|------|------|---------|--------|--------|--------|------|
| 체중_g | numeric | 285.3 | 45.2 | 180 | 420 | 42 | 2 |
| 체장_cm | numeric | 33.8 | 4.1 | 25.5 | 44.2 | 40 | 0 |
| 비만도 | numeric | 0.72 | 0.08 | 0.55 | 0.95 | 38 | 0 |
| 사료량_g | numeric | 15.2 | 3.8 | 8 | 25 | 35 | 1 |
| 양식장 | categorical | - | - | - | - | 3 | 0 |
| 성별 | categorical | - | - | - | - | 2 | 0 |

## 통계적 가정 검정 결과
- 정규성: 미충족 (Shapiro-Wilk p=0.012, 체중_g 오른쪽 치우침)
- 등분산성: 미충족 (Levene p=0.028, 양식장별 체중 분산 상이)

## 사용자 질문
양식장마다 사육 환경이 다른데, 성별도 고려해서 체중 차이가 있는지 보고 싶어요. 사료량이 체중에 영향을 줄 수도 있어서 그것도 통제하고 싶습니다.`
  },
  {
    name: '시나리오 2: 여러 분석이 동시에 필요한 케이스',
    prompt: `## 데이터 요약
- 전체: 200행 × 8열
- 수치형 변수 (6개): 매출액, 광고비, 직원수, 고객만족도(1-5), 재방문율(%), 경쟁사수
- 범주형 변수 (2개): 지역(서울/부산/대전/광주/대구), 업종(음식/의류/전자/서비스)

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
(가정 검정 미실시)

## 사용자 질문
매출에 영향을 주는 요인들을 종합적으로 분석하고 싶어요. 어떤 변수가 매출에 가장 큰 영향을 미치는지, 그리고 지역이나 업종에 따라 패턴이 다른지도 궁금합니다.`
  },
  {
    name: '시나리오 3: 시계열 + 비모수 경계',
    prompt: `## 데이터 요약
- 전체: 30행 × 5열
- 수치형 변수 (3개): 실험전_점수, 실험후_점수, 변화량
- 범주형 변수 (1개): 처리군(실험/대조)
- 날짜형 변수 (1개): 측정일

## 변수 상세 통계
| 변수명 | 타입 | 평균 | 표준편차 | 최솟값 | 최댓값 | 고유값 | 결측 |
|--------|------|------|---------|--------|--------|--------|------|
| 실험전_점수 | numeric | 52.3 | 12.5 | 28 | 82 | 28 | 0 |
| 실험후_점수 | numeric | 61.8 | 14.2 | 30 | 95 | 29 | 1 |
| 변화량 | numeric | 9.5 | 8.3 | -5 | 32 | 27 | 1 |
| 처리군 | categorical | - | - | - | - | 2 | 0 |
| 측정일 | date | - | - | 2024-01-01 | 2024-06-30 | 30 | 0 |

## 통계적 가정 검정 결과
- 정규성: 미충족 (Shapiro-Wilk p=0.003, 변화량 분포 비대칭)
- 등분산성: 충족 (Levene p=0.342)

## 사용자 질문
새로운 교수법의 효과를 검증하고 싶어요. 실험군과 대조군 각각에서 전후 점수 변화가 있는지, 그리고 두 그룹 간 변화량 차이가 유의한지 보고 싶습니다. 표본이 30개밖에 안 되고 정규성도 위반되었습니다.`
  }
]

async function testScenario(scenario) {
  const start = Date.now()
  console.log(`\n${'='.repeat(70)}`)
  console.log(scenario.name)
  console.log('='.repeat(70))

  try {
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: scenario.prompt }
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

    // JSON 파싱
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    const jsonStr = codeBlockMatch ? codeBlockMatch[1] : null

    if (jsonStr) {
      const parsed = JSON.parse(jsonStr)
      console.log(`\n  📋 추천: ${parsed.methodId} (${parsed.methodName})`)
      console.log(`  🎯 확신도: ${parsed.confidence}`)
      console.log(`  📝 이유:`)
      parsed.reasoning?.forEach((r, i) => console.log(`     ${i + 1}. ${r}`))

      if (parsed.variableAssignments) {
        console.log(`  🔧 변수 할당:`)
        for (const [role, vars] of Object.entries(parsed.variableAssignments)) {
          console.log(`     ${role}: ${Array.isArray(vars) ? vars.join(', ') : vars}`)
        }
      } else {
        console.log(`  ⚠️ variableAssignments 없음`)
      }

      if (parsed.suggestedSettings) {
        console.log(`  ⚙️ 설정 제안:`)
        for (const [key, val] of Object.entries(parsed.suggestedSettings)) {
          console.log(`     ${key}: ${val}`)
        }
      } else {
        console.log(`  ⚠️ suggestedSettings 없음`)
      }

      if (parsed.warnings?.length) {
        console.log(`  ⚠️ 경고:`)
        parsed.warnings.forEach(w => console.log(`     - ${w}`))
      }

      if (parsed.dataPreprocessing?.length) {
        console.log(`  🔄 전처리 제안:`)
        parsed.dataPreprocessing.forEach(p => console.log(`     - ${p}`))
      }

      console.log(`  🔀 대안:`)
      parsed.alternatives?.forEach(a => console.log(`     - ${a.id}: ${a.name} (${a.description})`))

      return parsed
    } else {
      console.log(`  ⚠️ JSON 없음`)
      console.log(`  응답: ${content.substring(0, 300)}`)
      return null
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('=== 복잡한 시나리오 테스트 (확장 JSON 형식) ===\n')

  const results = []
  for (const scenario of SCENARIOS) {
    const result = await testScenario(scenario)
    results.push({ name: scenario.name, result })
  }

  console.log(`\n\n${'='.repeat(70)}`)
  console.log('요약')
  console.log('='.repeat(70))
  for (const r of results) {
    if (r.result) {
      const hasVars = !!r.result.variableAssignments
      const hasSettings = !!r.result.suggestedSettings
      const hasWarnings = r.result.warnings?.length > 0
      console.log(`  ✅ ${r.name}`)
      console.log(`     → ${r.result.methodId} (${r.result.confidence})`)
      console.log(`     변수할당: ${hasVars ? '✅' : '❌'} | 설정제안: ${hasSettings ? '✅' : '❌'} | 경고: ${hasWarnings ? '✅' : '❌'}`)
    } else {
      console.log(`  ❌ ${r.name} - 실패`)
    }
  }
}

main().catch(console.error)
