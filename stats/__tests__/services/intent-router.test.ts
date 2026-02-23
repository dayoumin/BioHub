/**
 * Intent Router 테스트
 *
 * 시나리오:
 * 1. 키워드 분류: Track 1(직접 분석), Track 2(데이터 상담), Track 3(실험 설계)
 * 2. 빈 입력 → fallback
 * 3. LLM fallback: classifyIntent()로 3트랙 직접 분류
 * 4. LLM 실패 → 키워드 결과 또는 최종 fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// llmRecommender를 mock하여 LLM 호출 없이 테스트
vi.mock('@/lib/services/llm-recommender', () => ({
  llmRecommender: {
    classifyIntent: vi.fn(),
  },
}))

// logger mock
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { intentRouter } from '@/lib/services/intent-router'
import { llmRecommender } from '@/lib/services/llm-recommender'
import type { IntentClassification } from '@/types/smart-flow'

const mockClassifyIntent = vi.mocked(llmRecommender.classifyIntent)

// ===== 헬퍼 =====

function createClassification(overrides: Partial<IntentClassification> = {}): IntentClassification {
  return {
    track: 'data-consultation',
    confidence: 0.7,
    methodId: null,
    reasoning: 'test',
    ...overrides,
  }
}

// ===== 테스트 =====

describe('Intent Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: LLM 호출 실패 → 키워드 분류만 동작
    mockClassifyIntent.mockRejectedValue(new Error('LLM unavailable'))
  })

  // ===== 시나리오 1: 키워드 기반 분류 =====
  describe('키워드 기반 분류', () => {
    // --- Track 1: 직접 분석 ---
    it('메서드명 감지 → direct-analysis (t-test)', async () => {
      const result = await intentRouter.classify('t-test 분석 하고 싶어')

      expect(result.track).toBe('direct-analysis')
      expect(result.method).not.toBeNull()
      expect(result.method?.id).toBe('t-test')
      expect(result.confidence).toBeGreaterThanOrEqual(0.8)
      expect(result.provider).toBe('keyword')
    })

    it('메서드명 + 실행 의도 → 더 높은 confidence', async () => {
      // "를 해 줘" 패턴이 DIRECT_INTENT_PATTERNS에 매칭
      const result = await intentRouter.classify('ANOVA를 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.confidence).toBe(0.95)
    })

    it('메서드명만 (실행 의도 없음) → 기본 confidence 0.8', async () => {
      const result = await intentRouter.classify('ANOVA 분석')

      expect(result.track).toBe('direct-analysis')
      expect(result.confidence).toBe(0.8)
    })

    it('영어 메서드명도 감지 (correlation)', async () => {
      const result = await intentRouter.classify('I want to run correlation')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('correlation')
    })

    // --- Track 2: 데이터 상담 ---
    it('상담 키워드 → data-consultation (추천)', async () => {
      const result = await intentRouter.classify('어떤 분석이 좋을지 추천해줘')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
      expect(result.provider).toBe('keyword')
    })

    it('도움 요청 → data-consultation', async () => {
      const result = await intentRouter.classify('데이터 분석 좀 도와줘')

      expect(result.track).toBe('data-consultation')
    })

    it('모호한 질문 → data-consultation', async () => {
      const result = await intentRouter.classify('뭘 해야 할지 모르겠어')

      expect(result.track).toBe('data-consultation')
    })

    // --- Track 3: 실험 설계 ---
    it('표본 크기 → experiment-design', async () => {
      const result = await intentRouter.classify('표본 크기 계산')

      expect(result.track).toBe('experiment-design')
      expect(result.confidence).toBe(0.9)
      expect(result.needsData).toBe(false)
    })

    it('검정력 분석 → experiment-design', async () => {
      const result = await intentRouter.classify('검정력 분석을 하고 싶어')

      expect(result.track).toBe('experiment-design')
    })

    it('sample size → experiment-design', async () => {
      const result = await intentRouter.classify('What sample size do I need?')

      expect(result.track).toBe('experiment-design')
    })

    it('실험 설계 → experiment-design', async () => {
      const result = await intentRouter.classify('실험 설계를 도와주세요')

      expect(result.track).toBe('experiment-design')
    })
  })

  // ===== 시나리오 2: 빈 입력 =====
  describe('빈 입력 처리', () => {
    it('빈 문자열 → data-consultation fallback', async () => {
      const result = await intentRouter.classify('')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
      expect(result.method).toBeNull()
    })

    it('공백만 → data-consultation fallback', async () => {
      const result = await intentRouter.classify('   ')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
    })
  })

  // ===== 시나리오 3: LLM classifyIntent() 3트랙 분류 =====
  describe('LLM classifyIntent() 3트랙 분류', () => {
    it('LLM → data-consultation 분류 → data-consultation', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'data-consultation',
        confidence: 0.8,
        reasoning: '데이터 상담 필요',
      }))

      const result = await intentRouter.classify('안녕')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
      expect(result.provider).toBe('llm')
    })

    it('LLM → direct-analysis + methodId 분류 → direct-analysis', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.85,
        methodId: 't-test',
        reasoning: 't-test 적합',
      }))

      const result = await intentRouter.classify('두 그룹의 평균을 비교하고 싶어')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
      expect(result.confidence).toBe(0.85)
      expect(result.provider).toBe('llm')
    })

    it('LLM → null 반환 (분류 실패) → 최종 fallback', async () => {
      mockClassifyIntent.mockResolvedValue(null)

      const result = await intentRouter.classify('데이터가 있는데요')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
    })

    it('LLM → direct-analysis + methodId=null → data-consultation으로 교정', async () => {
      // 방어 로직: direct-analysis인데 method가 없으면 data-consultation
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.7,
        methodId: null,
        reasoning: '분석하고 싶지만 방법 불확실',
      }))

      const result = await intentRouter.classify('뭔가 분석하고 싶어')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
      expect(result.provider).toBe('llm')
    })
  })

  // ===== 시나리오 4: LLM 실패 시 fallback 체인 =====
  describe('LLM 실패 시 fallback 체인', () => {
    it('LLM 실패 + 키워드 매칭 있음 (낮은 confidence) → 키워드 결과 사용', async () => {
      // "추천해줘"는 consultation 키워드에 매칭 → confidence=0.65 (< 0.7)
      // LLM 실패 → 3차에서 키워드 결과 사용
      mockClassifyIntent.mockRejectedValue(new Error('network error'))

      const result = await intentRouter.classify('분석 추천해줘')

      expect(result.track).toBe('data-consultation')
      expect(result.provider).toBe('keyword')
    })

    it('LLM 실패 + 키워드 매칭 없음 → 최종 fallback data-consultation', async () => {
      mockClassifyIntent.mockRejectedValue(new Error('network error'))

      const result = await intentRouter.classify('안녕하세요')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
    })
  })

  // ===== 시나리오 5: 우선순위 검증 =====
  describe('분류 우선순위', () => {
    it('실험 설계 키워드가 메서드명보다 우선 (예: "t-test 표본 크기")', async () => {
      const result = await intentRouter.classify('t-test 표본 크기 계산')

      // Track 3이 Track 1보다 우선
      expect(result.track).toBe('experiment-design')
    })

    it('높은 confidence 키워드 → LLM 호출 안 함', async () => {
      await intentRouter.classify('t-test 해줘')

      // confidence >= 0.7이면 LLM 호출 생략
      expect(mockClassifyIntent).not.toHaveBeenCalled()
    })
  })
})
