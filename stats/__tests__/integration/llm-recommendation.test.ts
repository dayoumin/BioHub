/**
 * LLM Integration Tests - 실제 OpenRouter API 호출
 *
 * 환경: .env.local의 NEXT_PUBLIC_OPENROUTER_API_KEY 필요
 * 실행: pnpm test __tests__/integration/llm-recommendation.test.ts
 *
 * Part A: 추천 품질 검증 (10 시나리오)
 * Part B: 결과 해석 품질 검증 (6 시나리오)
 * Part C: 통합 동작 검증 (4 시나리오)
 *
 * 주의: 실제 API 호출이므로 rate limit 회피를 위해 테스트 간 3초 딜레이
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { OpenRouterRecommender } from '@/lib/services/openrouter-recommender'
import { buildInterpretationPrompt } from '@/lib/services/result-interpreter'
import { splitInterpretation } from '@/lib/services/export/export-data-builder'
import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'
import type {
  ValidationResults,
  ColumnStatistics,
  AnalysisResult
} from '@/types/smart-flow'

// ============================================
// .env.local 로드 (API 키)
// ============================================
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx)
      const val = trimmed.substring(eqIdx + 1)
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch { /* .env.local not found — tests will be skipped */ }

const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY
const DELAY_MS = 3000
const TEST_TIMEOUT = 180_000

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- private 메서드 접근
type AnyRecommender = Record<string, any>

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ============================================
// 결과 수집기
// ============================================
interface TestResult {
  scenario: string
  status: 'PASS' | 'FAIL'
  methodId?: string
  /** getMethodByIdOrAlias로 검증된 유효한 ID인지 */
  isValidMethodId?: boolean
  confidence?: number
  hasVariableAssignments?: boolean
  hasWarnings?: boolean
  hasSuggestedSettings?: boolean
  hasAmbiguityNote?: boolean
  hasDataPreprocessing?: boolean
  alternativeCount?: number
  responsePreview?: string
  error?: string
  duration?: number
}

const allResults: TestResult[] = []

function recordResult(result: TestResult): void {
  // method ID 유효성 자동 검증
  if (result.methodId) {
    result.isValidMethodId = !!getMethodByIdOrAlias(result.methodId)
  }
  allResults.push(result)
}

// ============================================
// Test Data Fixtures
// ============================================

/** Iris 데이터 (150행, 5변수, 3그룹) */
const IRIS_VALIDATION: ValidationResults = {
  totalRows: 150,
  columnCount: 5,
  missingValues: 0,
  dataType: 'csv',
  variables: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    { name: 'sepal_length', type: 'numeric', mean: 5.84, std: 0.83, min: 4.3, max: 7.9, skewness: 0.31, missingCount: 0, uniqueValues: 35 } as ColumnStatistics,
    { name: 'sepal_width', type: 'numeric', mean: 3.06, std: 0.44, min: 2.0, max: 4.4, skewness: 0.32, missingCount: 0, uniqueValues: 23 } as ColumnStatistics,
    { name: 'petal_length', type: 'numeric', mean: 3.76, std: 1.77, min: 1.0, max: 6.9, skewness: -0.27, missingCount: 0, uniqueValues: 43 } as ColumnStatistics,
    { name: 'petal_width', type: 'numeric', mean: 1.20, std: 0.76, min: 0.1, max: 2.5, skewness: -0.10, missingCount: 0, uniqueValues: 22 } as ColumnStatistics,
    {
      name: 'species', type: 'categorical', missingCount: 0, uniqueValues: 3,
      topCategories: [
        { value: 'setosa', count: 50 },
        { value: 'versicolor', count: 50 },
        { value: 'virginica', count: 50 }
      ]
    } as ColumnStatistics
  ]
}

/** 2그룹 데이터 (60행, 실험군/대조군) */
const TWO_GROUP_VALIDATION: ValidationResults = {
  totalRows: 60,
  columnCount: 2,
  missingValues: 0,
  dataType: 'csv',
  variables: ['score', 'group'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    { name: 'score', type: 'numeric', mean: 75.5, std: 12.3, min: 45, max: 98, skewness: -0.15, missingCount: 0, uniqueValues: 55 } as ColumnStatistics,
    {
      name: 'group', type: 'categorical', missingCount: 0, uniqueValues: 2,
      topCategories: [
        { value: 'control', count: 30 },
        { value: 'treatment', count: 30 }
      ]
    } as ColumnStatistics
  ]
}

/** 한국어 컬럼명 데이터 */
const KOREAN_COLS_VALIDATION: ValidationResults = {
  totalRows: 200,
  columnCount: 4,
  missingValues: 5,
  dataType: 'csv',
  variables: ['키', '몸무게', '혈압', '성별'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    { name: '키', type: 'numeric', mean: 168.5, std: 8.2, min: 150, max: 190, skewness: 0.12, missingCount: 2, uniqueValues: 80 } as ColumnStatistics,
    { name: '몸무게', type: 'numeric', mean: 65.3, std: 10.5, min: 42, max: 95, skewness: 0.45, missingCount: 1, uniqueValues: 70 } as ColumnStatistics,
    { name: '혈압', type: 'numeric', mean: 120.8, std: 15.2, min: 85, max: 170, skewness: 0.68, missingCount: 2, uniqueValues: 90 } as ColumnStatistics,
    {
      name: '성별', type: 'categorical', missingCount: 0, uniqueValues: 2,
      topCategories: [
        { value: '남', count: 105 },
        { value: '여', count: 95 }
      ]
    } as ColumnStatistics
  ]
}

/** 수치형 2변수 (상관/회귀용) */
const NUMERIC_PAIR_VALIDATION: ValidationResults = {
  totalRows: 100,
  columnCount: 2,
  missingValues: 0,
  dataType: 'csv',
  variables: ['height', 'weight'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    { name: 'height', type: 'numeric', mean: 170.5, std: 8.2, min: 150, max: 195, skewness: 0.1, missingCount: 0, uniqueValues: 80 } as ColumnStatistics,
    { name: 'weight', type: 'numeric', mean: 68.3, std: 12.5, min: 42, max: 105, skewness: 0.3, missingCount: 0, uniqueValues: 75 } as ColumnStatistics
  ]
}

/** 범주형만 2변수 (카이제곱용) */
const CATEGORICAL_ONLY_VALIDATION: ValidationResults = {
  totalRows: 300,
  columnCount: 2,
  missingValues: 0,
  dataType: 'csv',
  variables: ['gender', 'preference'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    {
      name: 'gender', type: 'categorical', missingCount: 0, uniqueValues: 2,
      topCategories: [{ value: 'M', count: 150 }, { value: 'F', count: 150 }]
    } as ColumnStatistics,
    {
      name: 'preference', type: 'categorical', missingCount: 0, uniqueValues: 3,
      topCategories: [
        { value: 'A', count: 100 },
        { value: 'B', count: 110 },
        { value: 'C', count: 90 }
      ]
    } as ColumnStatistics
  ]
}

/** 결측치 30% 데이터 */
const MISSING_DATA_VALIDATION: ValidationResults = {
  totalRows: 100,
  columnCount: 3,
  missingValues: 30,
  dataType: 'csv',
  variables: ['score', 'age', 'group'],
  warnings: ['결측치 비율이 30%를 초과합니다'],
  isValid: true,
  errors: [],
  columns: [
    { name: 'score', type: 'numeric', mean: 72.1, std: 15.8, min: 30, max: 100, skewness: -0.5, missingCount: 20, uniqueValues: 60 } as ColumnStatistics,
    { name: 'age', type: 'numeric', mean: 35.2, std: 8.1, min: 18, max: 65, skewness: 0.3, missingCount: 10, uniqueValues: 40 } as ColumnStatistics,
    {
      name: 'group', type: 'categorical', missingCount: 0, uniqueValues: 3,
      topCategories: [
        { value: 'A', count: 35 },
        { value: 'B', count: 32 },
        { value: 'C', count: 33 }
      ]
    } as ColumnStatistics
  ]
}

/** 비정규 분포 데이터 (왜도 2.8) */
const NON_NORMAL_VALIDATION: ValidationResults = {
  totalRows: 50,
  columnCount: 2,
  missingValues: 0,
  dataType: 'csv',
  variables: ['income', 'region'],
  warnings: [],
  isValid: true,
  errors: [],
  columns: [
    { name: 'income', type: 'numeric', mean: 45000, std: 35000, min: 8000, max: 250000, skewness: 2.8, missingCount: 0, uniqueValues: 48 } as ColumnStatistics,
    {
      name: 'region', type: 'categorical', missingCount: 0, uniqueValues: 3,
      topCategories: [
        { value: '서울', count: 20 },
        { value: '부산', count: 15 },
        { value: '대구', count: 15 }
      ]
    } as ColumnStatistics
  ]
}

// ============================================
// 해석 테스트용 시스템 프롬프트 (result-interpreter.ts와 동일한 구조)
// ============================================
const INTERPRETATION_SYSTEM_PROMPT = `당신은 동료 연구자처럼 친근하고 명확하게 통계 결과를 설명해주는 데이터 분석 컨설턴트입니다.

## 톤 & 스타일
- 동료 연구자가 옆에서 설명해주는 느낌
- "~입니다" 보다 "~해요", "~네요" 등 부드러운 종결어미
- 전문 용어 사용 시 괄호 안에 쉬운 설명 추가

## 응답 구조 (2단 구조)
반드시 아래 두 섹션으로 나눠서 응답하세요:

### 한줄 요약
핵심 결론을 3-4문장으로 요약해요. "결국 ~라는 뜻이에요"처럼 명확하게.

### 상세 해석
**통계량 해석**: 검정 통계량과 p-value가 의미하는 바
**효과크기**: 효과크기 해석 (있을 경우)
**실무적 의미**: 연구/현장 적용 관점
**주의할 점**: 해석 시 유의사항
**추가 분석**: 후속 분석 1-2개 제안

반드시 한국어로 응답하세요.`

// ============================================
// Main Test Suite
// ============================================

// API 키 없으면 전체 스킵
const describeIfApi = API_KEY ? describe : describe.skip

describeIfApi('LLM Integration Tests (실제 API)', () => {
  let recommender: AnyRecommender

  beforeAll(() => {
    recommender = new OpenRouterRecommender() as unknown as AnyRecommender
  })

  afterEach(async () => {
    await delay(DELAY_MS)
  })

  afterAll(() => {
    // 결과 JSON 저장
    try {
      const outputDir = resolve(process.cwd(), 'study')
      mkdirSync(outputDir, { recursive: true })
      const outputPath = resolve(outputDir, 'llm-integration-results.json')
      const recResults = allResults.filter(r => r.methodId)
      writeFileSync(outputPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        totalTests: allResults.length,
        passed: allResults.filter(r => r.status === 'PASS').length,
        failed: allResults.filter(r => r.status === 'FAIL').length,
        quality: {
          validMethodIds: recResults.filter(r => r.isValidMethodId).length,
          invalidMethodIds: recResults.filter(r => r.isValidMethodId === false).map(r => ({
            scenario: r.scenario,
            methodId: r.methodId
          })),
          avgConfidence: recResults.length > 0
            ? Number((recResults.reduce((s, r) => s + (r.confidence ?? 0), 0) / recResults.length).toFixed(2))
            : 0,
          featuresUsed: {
            variableAssignments: recResults.filter(r => r.hasVariableAssignments).length,
            warnings: recResults.filter(r => r.hasWarnings).length,
            ambiguityNote: recResults.filter(r => r.hasAmbiguityNote).length,
            suggestedSettings: recResults.filter(r => r.hasSuggestedSettings).length
          }
        },
        results: allResults
      }, null, 2), 'utf-8')
      console.log(`\n✅ Results saved to: study/llm-integration-results.json`)
    } catch (e) {
      console.error('Failed to save results:', e)
    }
  })

  // Helper: 해석 API 호출
  async function getInterpretation(analysisResult: AnalysisResult): Promise<string> {
    const prompt = buildInterpretationPrompt({
      results: analysisResult,
      sampleSize: 100,
      variables: ['var1', 'var2']
    })

    let fullText = ''
    await recommender.streamChatCompletion(
      INTERPRETATION_SYSTEM_PROMPT,
      prompt,
      (chunk: string) => { fullText += chunk },
      undefined,
      { temperature: 0.3, maxTokens: 2000 }
    )
    return fullText
  }

  // ==========================================
  // Part A: Recommendation Quality (10 scenarios)
  // ==========================================
  describe('Part A: Recommendation Quality', () => {

    it('A1: 명확한 ANOVA — Iris 3그룹 비교', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '세 종류(species)의 꽃잎 길이(petal_length) 차이를 비교하고 싶어',
        IRIS_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A1: Clear ANOVA (Iris)', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()
        expect(recommendation!.confidence).toBeGreaterThanOrEqual(0.7)
        expect(recommendation!.reasoning.length).toBeGreaterThan(0)

        // ANOVA 계열: 'anova'가 One-Way ANOVA의 기본 ID (one-way-anova는 alias)
        const anovaRelated = ['anova', 'kruskal-wallis', 'welch-anova', 'manova']
        expect(anovaRelated).toContain(recommendation!.method.id)

        // 변수 할당에 실제 컬럼명만 있어야 함
        if (recommendation!.variableAssignments) {
          const allVars = Object.values(recommendation!.variableAssignments).flat().filter(Boolean) as string[]
          for (const v of allVars) {
            expect(IRIS_VALIDATION.variables).toContain(v)
          }
        }

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasVariableAssignments = !!recommendation!.variableAssignments
        result.hasSuggestedSettings = !!recommendation!.suggestedSettings
        result.alternativeCount = recommendation!.alternatives?.length ?? 0
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A2: 명확한 t-test — 2그룹 평균 비교', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '실험군과 대조군의 점수 차이가 유의한지 알고 싶어',
        TWO_GROUP_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A2: Clear t-test (2 groups)', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()
        // t-test 계열: 't-test'가 Independent t-Test의 기본 ID
        const tTestRelated = ['t-test', 'welch-t', 'mann-whitney']
        expect(tTestRelated).toContain(recommendation!.method.id)
        expect(recommendation!.confidence).toBeGreaterThanOrEqual(0.7)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasVariableAssignments = !!recommendation!.variableAssignments
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A3: 모호한 질문 → 낮은 confidence 또는 ambiguityNote', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '데이터를 분석해줘',
        IRIS_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A3: Ambiguous query', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()
        expect(recommendation!.method.id).toBeTruthy()

        // 모호한 질문: confidence ≤ 0.8 또는 ambiguityNote 존재 또는 대안 2개 이상
        const isAmbiguityHandled =
          recommendation!.confidence <= 0.8 ||
          !!recommendation!.ambiguityNote ||
          (recommendation!.alternatives?.length ?? 0) >= 2
        expect(isAmbiguityHandled).toBe(true)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasAmbiguityNote = !!recommendation!.ambiguityNote
        result.alternativeCount = recommendation!.alternatives?.length ?? 0
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A4: 정규성 위반 + 높은 왜도 → 비모수 또는 경고', async () => {
      const start = Date.now()
      const assumptions = {
        normality: {
          shapiroWilk: { statistic: 0.85, pValue: 0.001, isNormal: false }
        }
      }
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '지역별 소득 차이를 비교하고 싶어',
        NON_NORMAL_VALIDATION, assumptions, null
      )
      const result: TestResult = { scenario: 'A4: Non-normal data + assumption violation', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        // 비모수 추천 또는 경고 포함 기대
        const isAppropriate =
          recommendation!.method.id.includes('kruskal') ||
          recommendation!.method.id.includes('mann-whitney') ||
          (recommendation!.warnings?.length ?? 0) > 0 ||
          recommendation!.reasoning.some((r: string) =>
            r.includes('정규') || r.includes('비모수') || r.includes('왜도') || r.includes('skew')
          )
        expect(isAppropriate).toBe(true)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasWarnings = (recommendation!.warnings?.length ?? 0) > 0
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A5: 결측치 30% → 전처리 제안 또는 경고', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '그룹별 점수 차이를 비교해줘',
        MISSING_DATA_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A5: High missing data', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        // 결측치 관련 언급 기대
        const hasMissingDataHandling =
          (recommendation!.dataPreprocessing?.length ?? 0) > 0 ||
          (recommendation!.warnings?.length ?? 0) > 0 ||
          recommendation!.reasoning.some((r: string) =>
            r.includes('결측') || r.includes('missing') || r.includes('누락')
          )
        expect(hasMissingDataHandling).toBe(true)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasWarnings = (recommendation!.warnings?.length ?? 0) > 0
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A6: 환각 방지 — variableAssignments에 실제 컬럼명만', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        'sepal_length와 species의 관계를 분석해줘',
        IRIS_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A6: Hallucination prevention', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        if (recommendation!.variableAssignments) {
          const allVars = Object.values(recommendation!.variableAssignments)
            .flat()
            .filter((v): v is string => typeof v === 'string')

          for (const v of allVars) {
            if (!IRIS_VALIDATION.variables!.includes(v)) {
              throw new Error(`변수 "${v}"가 실제 데이터에 없음 (환각 감지)`)
            }
          }
        }

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.hasVariableAssignments = !!recommendation!.variableAssignments
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A7: 한국어 컬럼명 처리', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '성별에 따른 키와 몸무게 차이를 분석하고 싶어',
        KOREAN_COLS_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A7: Korean column names', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()
        expect(recommendation!.method.id).toBeTruthy()
        expect(recommendation!.confidence).toBeGreaterThan(0)

        // 한국어 컬럼명이 variableAssignments에 올바르게 매핑되는지
        if (recommendation!.variableAssignments) {
          const allVars = Object.values(recommendation!.variableAssignments)
            .flat()
            .filter((v): v is string => typeof v === 'string')

          for (const v of allVars) {
            if (!KOREAN_COLS_VALIDATION.variables!.includes(v)) {
              throw new Error(`한국어 변수 "${v}"가 실제 데이터에 없음`)
            }
          }
        }

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasVariableAssignments = !!recommendation!.variableAssignments
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A8: 상관/회귀 시나리오 — 수치형 2변수', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '키와 몸무게의 관계를 알고 싶어',
        NUMERIC_PAIR_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A8: Correlation/regression', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        // correlation 계열: 'correlation'이 Pearson/Spearman의 기본 ID
        const corrRegRelated = [
          'correlation', 'partial-correlation',
          'simple-regression', 'linear-regression', 'multiple-regression'
        ]
        expect(corrRegRelated).toContain(recommendation!.method.id)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A9: 범주형만 → 카이제곱 계열 추천', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '성별과 선호도 간의 연관성을 분석해줘',
        CATEGORICAL_ONLY_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'A9: Categorical-only → chi-square', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        // chi-square: 'chi-square-independence'가 기본 ID
        const chiSquareRelated = [
          'chi-square-independence', 'fisher-exact-test', 'chi-square-goodness-of-fit'
        ]
        expect(chiSquareRelated).toContain(recommendation!.method.id)

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('A10: 데이터 없이 질문만 → 추천 가능하나 variableAssignments 없음', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        '두 그룹의 평균 차이를 비교하고 싶어',
        null, null, null
      )
      const result: TestResult = { scenario: 'A10: No data context', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()
        expect(recommendation!.method.id).toBeTruthy()

        // 데이터 없을 때 LLM이 placeholder 반환 가능 (예: "종속변수 컬럼명")
        // filterInvalidVariables는 validColumnNames.size===0이면 실행 안 됨
        // → 구조적 유효성만 검증
        if (recommendation!.variableAssignments) {
          expect(typeof recommendation!.variableAssignments).toBe('object')
        }

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.confidence = recommendation!.confidence
        result.hasVariableAssignments = !!recommendation!.variableAssignments
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)
  })

  // ==========================================
  // Part B: Interpretation Quality (6 scenarios)
  // ==========================================
  describe('Part B: Interpretation Quality', () => {

    it('B1: 유의한 t-test 해석 — p=0.002, Cohen d=0.82', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'Independent t-test (독립표본 t-검정)',
        statistic: 3.45,
        pValue: 0.002,
        df: 58,
        effectSize: { type: "Cohen's d", value: 0.82, interpretation: '큰 효과' },
        confidence: { lower: 3.2, upper: 12.8, level: 0.95 },
        interpretation: '',
        groupStats: [
          { name: 'control', n: 30, mean: 72.3, std: 11.5 },
          { name: 'treatment', n: 30, mean: 80.3, std: 10.2 }
        ]
      }
      const result: TestResult = { scenario: 'B1: Significant t-test interpretation', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        // 2단 구조 검증
        const { summary } = splitInterpretation(text)
        expect(summary.length).toBeGreaterThan(20)

        // 핵심 통계량 언급 확인
        const hasStatMention =
          text.includes('유의') || text.includes('p') ||
          text.includes('0.002') || text.includes('차이')
        expect(hasStatMention).toBe(true)

        result.status = 'PASS'
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('B2: 유의하지 않은 ANOVA — p=0.42', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'One-way ANOVA (일원분산분석)',
        statistic: 0.89,
        pValue: 0.42,
        df: 2,
        effectSize: { type: 'eta-squared', value: 0.02, interpretation: '작은 효과' },
        interpretation: '',
        groupStats: [
          { name: 'A', n: 40, mean: 75.2, std: 12.1 },
          { name: 'B', n: 38, mean: 73.8, std: 11.5 },
          { name: 'C', n: 42, mean: 76.1, std: 13.2 }
        ]
      }
      const result: TestResult = { scenario: 'B2: Non-significant ANOVA', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        // "유의하지 않" 표현 기대
        const hasNonSigMention =
          text.includes('유의하지') || text.includes('유의미하지') ||
          text.includes('차이가 없') || text.includes('귀무가설') ||
          text.includes('기각할 수 없') || text.includes('0.42')
        expect(hasNonSigMention).toBe(true)

        result.status = 'PASS'
        const { summary } = splitInterpretation(text)
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('B3: 가정 위반 — Welch t-test, 정규성+등분산성 미충족', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'Welch t-test (웰치 t-검정)',
        statistic: 2.15,
        pValue: 0.038,
        df: 42.7,
        effectSize: { type: "Cohen's d", value: 0.55, interpretation: '중간 효과' },
        interpretation: '',
        assumptions: {
          normality: {
            shapiroWilk: { statistic: 0.92, pValue: 0.03, isNormal: false }
          },
          homogeneity: {
            levene: { statistic: 4.8, pValue: 0.035, equalVariance: false }
          }
        }
      }
      const result: TestResult = { scenario: 'B3: Assumption violation interpretation', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        // 가정 관련 언급
        const hasAssumptionMention =
          text.includes('정규') || text.includes('등분산') ||
          text.includes('가정') || text.includes('Welch') ||
          text.includes('비모수')
        expect(hasAssumptionMention).toBe(true)

        result.status = 'PASS'
        const { summary } = splitInterpretation(text)
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('B4: 회귀분석 — R²=0.316, 계수 해석', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'Simple Linear Regression (단순선형회귀)',
        statistic: 45.2,
        pValue: 0.0001,
        df: 98,
        effectSize: 0.68,
        interpretation: '',
        coefficients: [
          { name: '(절편)', value: -50.5, stdError: 12.3, tValue: -4.1, pvalue: 0.0001 },
          { name: 'height', value: 0.72, stdError: 0.11, tValue: 6.72, pvalue: 0.0001 }
        ],
        additional: {
          rSquared: 0.316,
          adjustedRSquared: 0.309,
          rmse: 10.42
        }
      }
      const result: TestResult = { scenario: 'B4: Regression with R² and coefficients', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        const hasRegressionMention =
          text.includes('R²') || text.includes('R2') || text.includes('설명력') ||
          text.includes('31') || text.includes('회귀') || text.includes('계수')
        expect(hasRegressionMention).toBe(true)

        result.status = 'PASS'
        const { summary } = splitInterpretation(text)
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('B5: 상관분석 — r=0.78, 강한 양의 상관', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'Pearson Correlation (피어슨 상관분석)',
        statistic: 0.78,
        pValue: 0.0001,
        df: 98,
        effectSize: 0.78,
        interpretation: '',
        confidence: { lower: 0.68, upper: 0.85, level: 0.95 }
      }
      const result: TestResult = { scenario: 'B5: Correlation interpretation', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        const hasCorrelationMention =
          text.includes('상관') || text.includes('관계') ||
          text.includes('0.78') || text.includes('양')
        expect(hasCorrelationMention).toBe(true)

        result.status = 'PASS'
        const { summary } = splitInterpretation(text)
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('B6: 사후검정 포함 ANOVA — 모든 쌍 유의', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'One-way ANOVA (일원분산분석)',
        statistic: 12.5,
        pValue: 0.00003,
        df: 2,
        effectSize: { type: 'eta-squared', value: 0.18, interpretation: '큰 효과' },
        interpretation: '',
        groupStats: [
          { name: 'setosa', n: 50, mean: 1.46, std: 0.17 },
          { name: 'versicolor', n: 50, mean: 4.26, std: 0.47 },
          { name: 'virginica', n: 50, mean: 5.55, std: 0.55 }
        ],
        postHoc: [
          { group1: 'setosa', group2: 'versicolor', pvalue: 0.001, significant: true, meanDiff: -2.8 },
          { group1: 'setosa', group2: 'virginica', pvalue: 0.001, significant: true, meanDiff: -4.09 },
          { group1: 'versicolor', group2: 'virginica', pvalue: 0.001, significant: true, meanDiff: -1.29 }
        ]
      }
      const result: TestResult = { scenario: 'B6: Post-hoc ANOVA interpretation', status: 'FAIL', duration: 0 }

      try {
        const text = await getInterpretation(analysisResult)
        result.duration = Date.now() - start

        expect(text.length).toBeGreaterThan(100)

        const hasPostHocMention =
          text.includes('사후') || text.includes('post') ||
          text.includes('setosa') || text.includes('versicolor') ||
          text.includes('모든 쌍') || text.includes('그룹 간')
        expect(hasPostHocMention).toBe(true)

        result.status = 'PASS'
        const { summary } = splitInterpretation(text)
        result.responsePreview = summary.substring(0, 200)
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)
  })

  // ==========================================
  // Part C: Integration Checks (4 scenarios)
  // ==========================================
  describe('Part C: Integration Checks', () => {

    it('C1: splitInterpretation이 실제 LLM 2단 구조를 올바르게 분리', async () => {
      const start = Date.now()
      const analysisResult: AnalysisResult = {
        method: 'Independent t-test',
        statistic: 2.5,
        pValue: 0.015,
        df: 58,
        interpretation: ''
      }
      const result: TestResult = { scenario: 'C1: splitInterpretation on real LLM output', status: 'FAIL', duration: 0 }

      try {
        const prompt = buildInterpretationPrompt({
          results: analysisResult,
          sampleSize: 60
        })

        let fullText = ''
        await recommender.streamChatCompletion(
          INTERPRETATION_SYSTEM_PROMPT,
          prompt,
          (chunk: string) => { fullText += chunk },
          undefined,
          { temperature: 0.3, maxTokens: 1500 }
        )
        result.duration = Date.now() - start

        const { summary, detail } = splitInterpretation(fullText)

        // summary는 비어있지 않아야 함
        expect(summary.length).toBeGreaterThan(0)
        // "### 한줄 요약" 헤더는 summary에 포함되지 않아야 함
        expect(summary).not.toContain('### 한줄 요약')

        // 2단 구조가 제대로 되었으면 detail도 있어야 함
        // (LLM이 2단 구조를 안 따를 수도 있으므로 soft check)
        if (fullText.includes('### 상세 해석') || fullText.includes('상세 해석')) {
          expect(detail.length).toBeGreaterThan(0)
        }

        result.status = 'PASS'
        result.responsePreview = `summary=${summary.length}chars, detail=${detail.length}chars`
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('C2: filterInvalidVariables가 실제 추천에서 환각 필터링', async () => {
      const start = Date.now()
      const { recommendation } = await recommender.recommendFromNaturalLanguage(
        'species 기준으로 sepal_length, sepal_width, petal_length를 비교해줘',
        IRIS_VALIDATION, null, null
      )
      const result: TestResult = { scenario: 'C2: filterInvalidVariables in live', status: 'FAIL', duration: Date.now() - start }

      try {
        expect(recommendation).not.toBeNull()

        if (recommendation!.variableAssignments) {
          const allVars = Object.values(recommendation!.variableAssignments)
            .flat()
            .filter((v): v is string => typeof v === 'string')

          expect(allVars.length).toBeGreaterThan(0)

          const validNames = new Set(IRIS_VALIDATION.variables)
          for (const v of allVars) {
            expect(validNames.has(v)).toBe(true)
          }
        }

        result.status = 'PASS'
        result.methodId = recommendation!.method.id
        result.hasVariableAssignments = !!recommendation!.variableAssignments
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)

    it('C3: buildDataContext PII 필터링 — ID 컬럼의 topCategories 제외', () => {
      const result: TestResult = { scenario: 'C3: PII filter in buildDataContext', status: 'FAIL' }

      try {
        const validationWithId: ValidationResults = {
          totalRows: 100,
          columnCount: 3,
          missingValues: 0,
          dataType: 'csv',
          variables: ['student_id', 'name', 'score'],
          warnings: [],
          isValid: true,
          errors: [],
          columns: [
            {
              name: 'student_id', type: 'categorical', missingCount: 0, uniqueValues: 100,
              topCategories: [{ value: 'STU001', count: 1 }, { value: 'STU002', count: 1 }],
              idDetection: { isId: true, reason: 'unique values match row count' }
            } as ColumnStatistics,
            {
              name: 'name', type: 'categorical', missingCount: 0, uniqueValues: 98,
              topCategories: [{ value: '김철수', count: 2 }, { value: '이영희', count: 1 }],
              idDetection: { isId: true, reason: 'near-unique' }
            } as ColumnStatistics,
            {
              name: 'score', type: 'numeric', mean: 75, std: 10, min: 40, max: 100,
              missingCount: 0, uniqueValues: 50
            } as ColumnStatistics
          ]
        }

        const context = recommender.buildDataContext(validationWithId)

        // PII 필터: ID 컬럼의 개인정보가 포함되면 안 됨
        expect(context).not.toContain('STU001')
        expect(context).not.toContain('김철수')
        expect(context).not.toContain('이영희')

        // 변수명 자체는 포함 (통계 요약)
        expect(context).toContain('student_id')
        expect(context).toContain('score')

        result.status = 'PASS'
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    })

    it('C4: Health check + API 연결 확인', async () => {
      const start = Date.now()
      const result: TestResult = { scenario: 'C4: Health check + API connectivity', status: 'FAIL', duration: 0 }

      try {
        const isAvailable = await recommender.checkHealth()
        result.duration = Date.now() - start

        expect(isAvailable).toBe(true)

        result.status = 'PASS'
      } catch (e) {
        result.error = e instanceof Error ? e.message : String(e)
        result.duration = Date.now() - start
      }

      recordResult(result)
      if (result.status === 'FAIL') throw new Error(result.error)
    }, TEST_TIMEOUT)
  })
})
