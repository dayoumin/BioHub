/**
 * Intent Router 테스트
 *
 * 시나리오:
 * 1. 키워드 분류: Track 1(직접 분석), Track 2(데이터 상담), Track 3(실험 설계)
 * 2. 빈 입력 → fallback
 * 3. LLM fallback: confidence > 0.5 → direct-analysis, <= 0.5 → data-consultation
 * 4. LLM 실패 → 키워드 결과 또는 최종 fallback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// llmRecommender를 mock하여 LLM 호출 없이 테스트
vi.mock('@/lib/services/llm-recommender', () => ({
  llmRecommender: {
    recommend: vi.fn(),
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
import type { LlmRecommendationResult } from '@/lib/services/llm-recommender'

const mockRecommend = vi.mocked(llmRecommender.recommend)

// ===== 헬퍼 =====

function createLlmResult(overrides: Partial<LlmRecommendationResult> = {}): LlmRecommendationResult {
  return {
    recommendation: null,
    responseText: 'test response',
    provider: 'keyword',
    ...overrides,
  }
}

// ===== 테스트 =====

describe('Intent Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: LLM 호출 실패 → 키워드 분류만 동작
    mockRecommend.mockRejectedValue(new Error('LLM unavailable'))
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

  // ===== 시나리오 3: LLM fallback confidence 임계값 =====
  describe('LLM fallback confidence 임계값', () => {
    it('[버그 수정 검증] LLM이 confidence=0.5 (keyword fallback 기본값) 반환 → data-consultation', async () => {
      // 이전 버그: llmRecommender의 keyword fallback이 항상 descriptive-stats를
      // confidence=0.5로 반환 → direct-analysis로 잘못 분류됨
      mockRecommend.mockResolvedValue(createLlmResult({
        recommendation: {
          method: { id: 'descriptive-stats', name: 'Descriptive Statistics', description: '기술통계', category: 'descriptive' },
          confidence: 0.5,
          reasoning: ['기본 분석'],
          assumptions: { tests: [], overallPassed: true },
          alternatives: [],
        },
        provider: 'keyword',
      }))

      // "안녕" — 키워드 매칭 없음 → LLM fallback
      const result = await intentRouter.classify('안녕')

      // 수정 후: confidence <= 0.5 → data-consultation으로 라우팅
      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
      expect(result.provider).toBe('llm')
    })

    it('LLM이 confidence=0.7 반환 → direct-analysis', async () => {
      mockRecommend.mockResolvedValue(createLlmResult({
        recommendation: {
          method: { id: 't-test', name: 'T-Test', description: '두 집단 비교', category: 'comparison' },
          confidence: 0.7,
          reasoning: ['두 그룹 비교'],
          assumptions: { tests: [], overallPassed: true },
          alternatives: [],
        },
        provider: 'openrouter',
      }))

      const result = await intentRouter.classify('두 그룹의 평균을 비교하고 싶어')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
      expect(result.confidence).toBe(0.7)
      expect(result.provider).toBe('llm')
    })

    it('LLM이 recommendation=null 반환 → data-consultation', async () => {
      mockRecommend.mockResolvedValue(createLlmResult({
        recommendation: null,
        responseText: '추가 정보 필요',
      }))

      const result = await intentRouter.classify('데이터가 있는데요')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
    })
  })

  // ===== 시나리오 4: LLM 실패 시 fallback 체인 =====
  describe('LLM 실패 시 fallback 체인', () => {
    it('LLM 실패 + 키워드 매칭 있음 (낮은 confidence) → 키워드 결과 사용', async () => {
      // "추천해줘"는 consultation 키워드에 매칭 → confidence=0.65 (< 0.7)
      // LLM 실패 → 3차에서 키워드 결과 사용
      mockRecommend.mockRejectedValue(new Error('network error'))

      const result = await intentRouter.classify('분석 추천해줘')

      expect(result.track).toBe('data-consultation')
      expect(result.provider).toBe('keyword')
    })

    it('LLM 실패 + 키워드 매칭 없음 → 최종 fallback data-consultation', async () => {
      mockRecommend.mockRejectedValue(new Error('network error'))

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
      expect(mockRecommend).not.toHaveBeenCalled()
    })
  })
})
