/**
 * LLM 추천 파이프라인 시뮬레이션 테스트
 *
 * 실제 LLM 호출 없이 전체 흐름을 검증:
 * 1. 데이터 → 프롬프트 생성 (변수명 그대로 전달)
 * 2. LLM 응답 파싱 (methodId, variableAssignments 등)
 * 3. filterInvalidVariables (환각 변수 제거)
 * 4. Ollama 로컬 모델 경고 추가
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// OpenRouter 테스트
describe('OpenRouter LLM 추천 시뮬레이션', () => {
  let openRouterRecommender: typeof import('@/lib/services/openrouter-recommender').openRouterRecommender

  beforeEach(async () => {
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_API_KEY', 'test-key-123')
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_MODEL', 'openai/gpt-4o:free')
    // 매번 fresh import (env 반영)
    vi.resetModules()
    const mod = await import('@/lib/services/openrouter-recommender')
    openRouterRecommender = mod.openRouterRecommender
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('income/education 데이터 → 원본 변수명이 LLM에 전달되고, 응답이 올바르게 파싱된다', async () => {
    // LLM이 반환할 시뮬레이션 응답
    const simulatedLlmResponse = {
      id: 'test-1',
      model: 'test-model',
      choices: [{
        message: {
          role: 'assistant',
          content: `income과 education의 관계를 분석하기에 적합한 방법입니다.

\`\`\`json
{
  "methodId": "one-way-anova",
  "methodName": "일원분산분석",
  "confidence": 0.88,
  "reasoning": [
    "income은 연속형 종속변수입니다.",
    "education은 4개 범주를 가진 독립변수입니다.",
    "그룹 간 평균 비교에 ANOVA가 적합합니다."
  ],
  "variableAssignments": {
    "dependent": ["income"],
    "factor": ["education"]
  },
  "alternatives": [
    { "id": "kruskal-wallis", "name": "크루스칼-월리스", "description": "비모수 대안" }
  ],
  "warnings": ["정규성 확인이 필요합니다."]
}
\`\`\``
        },
        finish_reason: 'stop'
      }],
      usage: { prompt_tokens: 500, completion_tokens: 200, total_tokens: 700 }
    }

    // fetch mock
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(simulatedLlmResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )

    const validationResults = {
      isValid: true,
      totalRows: 100,
      totalColumns: 2,
      columnCount: 2,
      missingValues: 0,
      dataType: 'mixed',
      errors: [] as string[],
      warnings: [] as string[],
      columns: [
        {
          name: 'income',
          type: 'numeric' as const,
          numericCount: 100,
          textCount: 0,
          mean: 55000,
          std: 15000,
          min: 20000,
          max: 120000,
          median: 52000,
          skewness: 0.45,
          kurtosis: -0.2,
          uniqueValues: 87,
          missingCount: 0,
          q1: 42000,
          q3: 68000,
          outliers: []
        },
        {
          name: 'education',
          type: 'categorical' as const,
          numericCount: 0,
          textCount: 100,
          uniqueValues: 4,
          missingCount: 0,
          topCategories: [
            { value: 'High School', count: 30 },
            { value: 'Bachelor', count: 40 },
            { value: 'Master', count: 20 },
            { value: 'PhD', count: 10 }
          ]
        }
      ],
      columnStats: [],
      variables: ['income', 'education']
    }

    const result = await openRouterRecommender.recommendFromNaturalLanguage(
      '교육 수준에 따른 소득 차이를 분석하고 싶어요',
      validationResults,
      null,
      null
    )

    // 1) fetch가 호출되었는지 확인
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    // 2) 프롬프트에 원본 변수명이 포함되었는지 확인
    const fetchBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    const userMessage = fetchBody.messages.find((m: { role: string }) => m.role === 'user')?.content || ''

    expect(userMessage).toContain('income')
    expect(userMessage).toContain('education')
    expect(userMessage).toContain('55000')       // mean
    expect(userMessage).toContain('High School')  // 범주값 원본
    expect(userMessage).toContain('Bachelor')
    expect(userMessage).not.toContain('Var1')     // 익명화 안 됨
    expect(userMessage).not.toContain('V2_A')     // 익명화 안 됨

    // 3) 왜도/첨도가 포함되었는지 확인
    expect(userMessage).toContain('왜도')
    expect(userMessage).toContain('0.45')
    expect(userMessage).toContain('첨도')

    // 4) 파싱 결과 검증
    expect(result.recommendation).not.toBeNull()
    expect(result.recommendation!.method.id).toBe('one-way-anova')
    expect(result.recommendation!.confidence).toBe(0.88)

    // 5) variableAssignments에 원본 변수명
    expect(result.recommendation!.variableAssignments?.dependent).toEqual(['income'])
    expect(result.recommendation!.variableAssignments?.factor).toEqual(['education'])

    // 6) reasoning에 원본 변수명 포함
    expect(result.recommendation!.reasoning[0]).toContain('income')
    expect(result.recommendation!.reasoning[1]).toContain('education')

    // 7) alternatives 파싱
    expect(result.recommendation!.alternatives?.length).toBeGreaterThan(0)
    expect(result.recommendation!.alternatives![0].id).toBe('kruskal-wallis')

    // 8) responseText에 설명 포함
    expect(result.responseText).toContain('income')
  })

  it('LLM이 환각 변수명을 반환하면 필터링된다', async () => {
    const simulatedResponse = {
      id: 'test-2',
      choices: [{
        message: {
          role: 'assistant',
          content: `\`\`\`json
{
  "methodId": "t-test",
  "methodName": "독립표본 t-검정",
  "confidence": 0.8,
  "reasoning": ["두 그룹 비교"],
  "variableAssignments": {
    "dependent": ["score"],
    "factor": ["group"],
    "covariate": ["hallucinated_var"]
  }
}
\`\`\``
        },
        finish_reason: 'stop'
      }]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(simulatedResponse), { status: 200 })
    )

    const result = await openRouterRecommender.recommendFromNaturalLanguage(
      '그룹 간 점수 비교',
      {
        isValid: true,
        totalRows: 50,
        totalColumns: 2,
        columnCount: 2,
        missingValues: 0,
        dataType: 'mixed',
        errors: [] as string[],
        warnings: [] as string[],
        columns: [
          { name: 'score', type: 'numeric' as const, numericCount: 50, textCount: 0, mean: 75, std: 10, uniqueValues: 45, missingCount: 0 },
          { name: 'group', type: 'categorical' as const, numericCount: 0, textCount: 50, uniqueValues: 2, missingCount: 0, topCategories: [{ value: 'A', count: 25 }, { value: 'B', count: 25 }] }
        ],
        columnStats: [],
        variables: ['score', 'group']
      },
      null,
      null
    )

    expect(result.recommendation).not.toBeNull()
    // 존재하는 변수만 남아야 함
    expect(result.recommendation!.variableAssignments?.dependent).toEqual(['score'])
    expect(result.recommendation!.variableAssignments?.factor).toEqual(['group'])
    // 환각 변수는 제거됨
    expect(result.recommendation!.variableAssignments?.covariate).toBeUndefined()
  })

  it('데이터 없이도 추천 가능하다 (프롬프트에 "데이터 없음" 표시)', async () => {
    const simulatedResponse = {
      id: 'test-3',
      choices: [{
        message: {
          role: 'assistant',
          content: `\`\`\`json
{
  "methodId": "t-test",
  "methodName": "독립표본 t-검정",
  "confidence": 0.6,
  "reasoning": ["데이터 없이 일반적 추천"],
  "ambiguityNote": "데이터가 없어 정확한 추천이 어렵습니다."
}
\`\`\``
        },
        finish_reason: 'stop'
      }]
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(simulatedResponse), { status: 200 })
    )

    const result = await openRouterRecommender.recommendFromNaturalLanguage(
      '두 그룹 비교하고 싶어',
      null,  // 데이터 없음
      null,
      null
    )

    expect(result.recommendation).not.toBeNull()
    expect(result.recommendation!.ambiguityNote).toContain('데이터')
  })
})

// Ollama 테스트 (경고 추가 검증)
describe('Ollama 로컬 모델 경고', () => {
  let ollamaRecommender: typeof import('@/lib/services/ollama-recommender').ollamaRecommender

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('@/lib/services/ollama-recommender')
    ollamaRecommender = mod.ollamaRecommender
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Ollama 추천에 항상 로컬 모델 경고가 추가된다', async () => {
    const simulatedOllamaResponse = {
      response: JSON.stringify({
        methodId: 't-test',
        methodName: '독립표본 t-검정',
        confidence: 0.85,
        reasoning: ['두 그룹 간 평균 비교에 적합']
      })
    }

    // health check mock (Ollama 서버 사용 가능)
    vi.spyOn(ollamaRecommender, 'checkHealth').mockResolvedValue(true)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(simulatedOllamaResponse), { status: 200 })
    )

    const validationResults = {
      isValid: true,
      totalRows: 50,
      totalColumns: 2,
      columns: [
        { name: 'score', type: 'numeric' as const, numericCount: 50, textCount: 0, mean: 75, std: 10, uniqueValues: 45, missingCount: 0 },
        { name: 'group', type: 'categorical' as const, numericCount: 0, textCount: 50, uniqueValues: 2, missingCount: 0 }
      ],
      columnStats: [],
      variables: ['score', 'group']
    }

    const result = await ollamaRecommender.recommend(
      'compare' as any,
      { normality: null, homogeneity: null } as any,
      validationResults as any,
      [{ score: 80, group: 'A' }]
    )

    expect(result).not.toBeNull()
    // 경고가 추가되어야 함
    expect(result!.warnings).toBeDefined()
    expect(result!.warnings!.some(w => w.includes('로컬 모델'))).toBe(true)
    // confidence는 조작되지 않아야 함 (cap 제거됨)
    expect(result!.confidence).toBe(0.85)
  })
})

// ============================================================
// 패치 검증: AggregateError + createAsyncQueue 시뮬레이션
// ============================================================

describe('[패치 검증] AggregateError 에러 전파', () => {
  let openRouterRecommender: typeof import('@/lib/services/openrouter-recommender').openRouterRecommender

  beforeEach(async () => {
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_API_KEY', 'test-key-123')
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_MODEL', 'openai/gpt-4o:free,anthropic/claude-3-haiku')
    vi.resetModules()
    const mod = await import('@/lib/services/openrouter-recommender')
    openRouterRecommender = mod.openRouterRecommender
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('모든 모델이 네트워크 에러 → AggregateError throw', async () => {
    // 모든 fetch 호출을 실패시킴
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    let thrown: unknown = null
    try {
      await openRouterRecommender.recommendWithSystemPrompt(
        '분석해줘', 'system', null, null, null
      )
    } catch (e) {
      thrown = e
    }

    // AggregateError 여야 함
    expect(thrown).toBeInstanceOf(AggregateError)
    const agg = thrown as AggregateError
    expect(agg.message).toContain('error(s)')
    // 모델별 에러가 errors 배열에 있어야 함
    expect(agg.errors.length).toBeGreaterThan(0)
    expect((agg.errors[0] as Error).message).toContain('Network error')
  })

  it('모든 모델이 파싱 실패(null return) → null 반환 (throw 안 함)', async () => {
    // mockImplementation으로 매 호출마다 새 Response 생성 (body 재사용 방지)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '파싱 불가 텍스트만 있음' }, finish_reason: 'stop' }]
      }), { status: 200 })
    )

    const result = await openRouterRecommender.recommendWithSystemPrompt(
      '분석해줘', 'system', null, null, null
    )

    // throw 없이 null 반환
    expect(result.recommendation).toBeNull()
    expect(result.responseText).toBe('')
  })

  it('[혼합 케이스] 1개 throw + 1개 null → AggregateError throw (에러 맥락 보존)', async () => {
    // 첫 번째 모델: 에러, 두 번째 모델: 파싱 실패
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      callCount++
      if (callCount === 1) throw new Error('Model1 API error')
      return new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '파싱 불가 텍스트' }, finish_reason: 'stop' }]
      }), { status: 200 })
    })

    let thrown: unknown = null
    try {
      await openRouterRecommender.recommendWithSystemPrompt(
        '분석해줘', 'system', null, null, null
      )
    } catch (e) {
      thrown = e
    }

    // 에러가 1개라도 있으면 AggregateError로 전파 (에러 맥락 보존)
    expect(thrown).toBeInstanceOf(AggregateError)
    const agg = thrown as AggregateError
    expect(agg.message).toContain('1 error(s)')
    expect(agg.message).toContain('1 parse failure(s)')
    // 에러 배열에는 throw된 모델 에러만 포함
    expect(agg.errors.length).toBe(1)
    expect((agg.errors[0] as Error).message).toContain('Model1 API error')
  })
})

describe('[패치 검증] createAsyncQueue 동작', () => {
  // createAsyncQueue는 llm-recommender.ts 내부 함수이므로
  // 동일 로직을 인라인으로 구현해 단위 테스트

  function createAsyncQueue<T>() {
    const queue: T[] = []
    let waiting: ((item: T) => void) | null = null
    const enqueue = (item: T): void => {
      if (waiting) {
        const resolve = waiting
        waiting = null
        resolve(item)
      } else {
        queue.push(item)
      }
    }
    const dequeue = (): Promise<T> => {
      if (queue.length > 0) return Promise.resolve(queue.shift()!)
      return new Promise<T>((resolve) => { waiting = resolve })
    }
    return { enqueue, dequeue }
  }

  it('producer가 consumer보다 빠를 때 — 큐에 쌓인 아이템 순서 보존', async () => {
    const { enqueue, dequeue } = createAsyncQueue<number>()

    // 3개를 먼저 enqueue
    enqueue(1)
    enqueue(2)
    enqueue(3)

    // 순서대로 dequeue
    expect(await dequeue()).toBe(1)
    expect(await dequeue()).toBe(2)
    expect(await dequeue()).toBe(3)
  })

  it('consumer가 producer보다 빠를 때 — 비동기 대기 후 수신', async () => {
    const { enqueue, dequeue } = createAsyncQueue<string>()

    // consumer가 먼저 대기
    const p = dequeue()
    // 이후 producer가 enqueue
    enqueue('hello')

    expect(await p).toBe('hello')
  })

  it('chunk → done 정상 흐름 시뮬레이션', async () => {
    type Item = { type: 'chunk'; data: string } | { type: 'done'; model: string }
    const { enqueue, dequeue } = createAsyncQueue<Item>()

    // producer: 비동기로 3 chunk + done
    setTimeout(() => {
      enqueue({ type: 'chunk', data: 'A' })
      enqueue({ type: 'chunk', data: 'B' })
      enqueue({ type: 'chunk', data: 'C' })
      enqueue({ type: 'done', model: 'test-model' })
    }, 0)

    // consumer: while loop 시뮬레이션
    const chunks: string[] = []
    let finalModel = ''
    while (true) {
      const item = await dequeue()
      if (item.type === 'chunk') { chunks.push(item.data); continue }
      finalModel = item.model
      break
    }

    expect(chunks).toEqual(['A', 'B', 'C'])
    expect(finalModel).toBe('test-model')
  })

  it('에러 아이템이 enqueue되면 throw로 변환', async () => {
    type Item = { type: 'chunk'; data: string } | { type: 'error'; error: unknown }
    const { enqueue, dequeue } = createAsyncQueue<Item>()

    setTimeout(() => {
      enqueue({ type: 'chunk', data: 'X' })
      enqueue({ type: 'error', error: new Error('stream failed') })
    }, 0)

    const items: Item[] = []
    items.push(await dequeue()) // chunk
    items.push(await dequeue()) // error

    expect(items[0].type).toBe('chunk')
    expect(items[1].type).toBe('error')
    // throw 로직은 caller(while loop)에서 처리함
    const errItem = items[1]
    if (errItem.type === 'error') {
      expect(errItem.error).toBeInstanceOf(Error)
    }
  })
})

// 프롬프트 형식 시뮬레이션
describe('Markdown-KV 프롬프트 형식 검증', () => {
  let openRouterRecommender: typeof import('@/lib/services/openrouter-recommender').openRouterRecommender

  beforeEach(async () => {
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_API_KEY', 'test-key-123')
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_MODEL', 'openai/gpt-4o:free')
    vi.resetModules()
    const mod = await import('@/lib/services/openrouter-recommender')
    openRouterRecommender = mod.openRouterRecommender
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('다양한 변수 타입이 올바른 Markdown-KV 형식으로 생성된다', async () => {
    let capturedPrompt = ''

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      const body = JSON.parse(options?.body as string)
      capturedPrompt = body.messages.find((m: { role: string }) => m.role === 'user')?.content || ''
      return new Response(JSON.stringify({
        id: 'test',
        choices: [{
          message: { role: 'assistant', content: '{"methodId":"t-test","methodName":"t-test","confidence":0.8,"reasoning":["test"]}' },
          finish_reason: 'stop'
        }]
      }), { status: 200 })
    })

    await openRouterRecommender.recommendFromNaturalLanguage(
      '분석해줘',
      {
        isValid: true,
        totalRows: 200,
        totalColumns: 4,
        columnCount: 4,
        missingValues: 7,
        dataType: 'mixed',
        errors: [] as string[],
        warnings: [] as string[],
        columns: [
          {
            name: 'age',
            type: 'numeric' as const,
            numericCount: 198,
            textCount: 0,
            mean: 45.5,
            std: 12.3,
            min: 18,
            max: 85,
            median: 44,
            skewness: 0.3,
            kurtosis: -0.5,
            uniqueValues: 60,
            missingCount: 2,
            q1: 35,
            q3: 56,
            outliers: [1, 85]
          },
          {
            name: 'gender',
            type: 'categorical' as const,
            numericCount: 0,
            textCount: 200,
            uniqueValues: 2,
            missingCount: 0,
            topCategories: [
              { value: 'Male', count: 110 },
              { value: 'Female', count: 90 }
            ]
          },
          {
            name: 'blood_pressure',
            type: 'numeric' as const,
            numericCount: 195,
            textCount: 0,
            mean: 125.3,
            std: 18.5,
            min: 90,
            max: 200,
            median: 122,
            skewness: 0.8,
            kurtosis: 1.2,
            uniqueValues: 150,
            missingCount: 5,
            q1: 110,
            q3: 140,
            outliers: [195, 200]
          },
          {
            name: 'treatment',
            type: 'categorical' as const,
            numericCount: 0,
            textCount: 200,
            uniqueValues: 3,
            missingCount: 0,
            topCategories: [
              { value: 'Drug A', count: 70 },
              { value: 'Drug B', count: 65 },
              { value: 'Placebo', count: 65 }
            ]
          }
        ],
        columnStats: [],
        variables: ['age', 'gender', 'blood_pressure', 'treatment']
      },
      null,
      null
    )

    // Markdown-KV 형식 검증
    // 수치형: 평균, 표준편차, 범위, 왜도, 첨도
    expect(capturedPrompt).toContain('### age (수치형)')
    expect(capturedPrompt).toContain('- 평균: 45.50')
    expect(capturedPrompt).toContain('- 표준편차: 12.30')
    expect(capturedPrompt).toContain('- 범위: 18.00 ~ 85.00')
    expect(capturedPrompt).toContain('- 왜도: 0.30')
    expect(capturedPrompt).toContain('- 첨도: -0.50')
    expect(capturedPrompt).toContain('- 이상치: 2개')
    expect(capturedPrompt).toContain('- 결측: 2')

    // 범주형: 카테고리 수, 분포
    expect(capturedPrompt).toContain('### gender (범주형)')
    expect(capturedPrompt).toContain('Male(110)')
    expect(capturedPrompt).toContain('Female(90)')

    // 다른 변수도 원본 이름
    expect(capturedPrompt).toContain('blood_pressure')
    expect(capturedPrompt).toContain('Drug A')
    expect(capturedPrompt).toContain('Placebo')

    // 전체 요약
    expect(capturedPrompt).toContain('200행 × 4열')
    expect(capturedPrompt).toContain('수치형 변수 (2개)')
    expect(capturedPrompt).toContain('범주형 변수 (2개)')
  })
})
