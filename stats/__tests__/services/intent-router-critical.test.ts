/**
 * Intent Router — 비판적 검토 테스트
 *
 * 기존 intent-router.test.ts가 커버하지 못하는 경우의 수:
 *
 * A. Confidence 경계값 (0.7 키워드 임계값)
 * B. classifyByLLM() 구조적 검증 (null 반환, 방어 로직)
 * C. classifyIntent() 실패 시 fallback 동작
 * D. 한글 메서드명 매칭 (koreanName 괄호 문제 포함)
 * E. 다중 consultation 키워드 → confidence 누적
 * F. 혼합 입력 (Track 간 경합 — Track 3 > Track 1 > Track 2)
 * G. 특수/경계 입력 (특수문자, 긴 입력, 대소문자 등)
 * H. 메서드 alias 및 다양한 ID 감지
 * I. LLM classifyIntent() 응답별 처리
 * J. 3단계 fallback 체인 시나리오 매트릭스
 * K. needsData 필드 일관성
 * L. 한글 매칭 갭 수정 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/llm-recommender', () => ({
  llmRecommender: {
    classifyIntent: vi.fn(),
  },
}))

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

describe('Intent Router — 비판적 검토', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClassifyIntent.mockRejectedValue(new Error('LLM unavailable'))
  })

  // ===== A. Confidence 경계값 테스트 =====
  describe('A. Confidence 경계값', () => {
    it('키워드 confidence=0.8 (>= 0.7) → LLM 호출 생략', async () => {
      // 메서드명만 감지 (실행 의도 없음) → confidence=0.8
      await intentRouter.classify('t-test')

      expect(mockClassifyIntent).not.toHaveBeenCalled()
    })

    it('consultation 키워드 1개 → confidence=0.65 (< 0.7) → LLM 호출됨', async () => {
      // "추천" 1개 매칭 → 0.5 + 1*0.15 = 0.65
      await intentRouter.classify('추천해줘')

      expect(mockClassifyIntent).toHaveBeenCalledTimes(1)
    })

    it('consultation 키워드 2개 → confidence=0.8 (>= 0.7) → LLM 호출 생략', async () => {
      // "추천" + "도와" → 2개 매칭 → 0.5 + 2*0.15 = 0.8
      await intentRouter.classify('분석 추천 좀 도와줘')

      expect(mockClassifyIntent).not.toHaveBeenCalled()
    })

    it('LLM이 direct-analysis + methodId 반환 → direct-analysis', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.85,
        methodId: 't-test',
      }))

      const result = await intentRouter.classify('두 집단 평균')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('LLM이 data-consultation 반환 → data-consultation', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'data-consultation',
        confidence: 0.6,
      }))

      const result = await intentRouter.classify('비교')

      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
    })
  })

  // ===== B. classifyByLLM() 구조적 검증 =====
  describe('B. classifyByLLM() 구조적 검증', () => {
    it('classifyIntent() null 반환 → classifyByLLM() null → 3차 fallback 동작', async () => {
      // 이전 구조: classifyByLLM()이 항상 non-null → 3차 도달 불가
      // 수정 후: classifyIntent() null → classifyByLLM() null → 3차 fallback
      mockClassifyIntent.mockResolvedValue(null)

      const result = await intentRouter.classify('가나다라')

      // 키워드 매칭 없음 + LLM null → 최종 fallback
      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5) // createFallback 결과
      expect(result.provider).toBe('keyword')
    })

    it('[방어 로직] direct-analysis + methodId=null → data-consultation으로 교정', async () => {
      // LLM이 direct-analysis를 반환했지만 methodId가 null인 경우
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.9,
        methodId: null,
        reasoning: '확실하지만 메서드 불확실',
      }))

      const result = await intentRouter.classify('무언가 분석')

      // 방어 로직: direct-analysis + method=null → data-consultation
      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
      expect(result.provider).toBe('llm')
    })

    it('[방어 로직] direct-analysis + 존재하지 않는 methodId → data-consultation으로 교정', async () => {
      // LLM이 STATISTICAL_METHODS에 없는 methodId를 반환한 경우
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.8,
        methodId: 'nonexistent-method',
        reasoning: '잘못된 메서드 추천',
      }))

      const result = await intentRouter.classify('분석 추천')

      // methodId가 STATISTICAL_METHODS에 없음 → method=null → data-consultation
      expect(result.track).toBe('data-consultation')
      expect(result.method).toBeNull()
    })

    it('키워드 0.65 + LLM 성공 → LLM이 우선', async () => {
      // "추천" → consultation confidence=0.65 (< 0.7, LLM 호출됨)
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'data-consultation',
        confidence: 0.8,
        reasoning: '상담 필요',
      }))

      const result = await intentRouter.classify('분석 추천')

      // LLM 결과가 우선
      expect(result.provider).toBe('llm')
      expect(result.confidence).toBe(0.8)
    })
  })

  // ===== C. classifyIntent() 실패 시 fallback =====
  describe('C. classifyIntent() 실패 시 fallback', () => {
    it('classifyIntent() null → 키워드 결과 없음 → 최종 fallback', async () => {
      mockClassifyIntent.mockResolvedValue(null)

      const result = await intentRouter.classify('아무 말이나')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
      expect(result.provider).toBe('keyword') // createFallback
    })

    it('classifyIntent() null + 키워드 결과 있음 → 3차 키워드 결과 사용', async () => {
      mockClassifyIntent.mockResolvedValue(null)

      // "추천" → consultation 0.65 (< 0.7, LLM 호출)
      // LLM null → 3차에서 키워드 결과 사용
      const result = await intentRouter.classify('분석 추천')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.65) // 키워드 결과
      expect(result.provider).toBe('keyword')
    })

    it('classifyIntent() throw → catch → 3차 또는 최종 fallback', async () => {
      mockClassifyIntent.mockRejectedValue(new Error('unexpected error'))

      const result = await intentRouter.classify('안녕')

      // 키워드 매칭 없음 + LLM throw → 최종 fallback
      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
      expect(result.provider).toBe('keyword')
    })
  })

  // ===== D. 한글 메서드명 매칭 =====
  describe('D. 한글 메서드명 매칭', () => {
    it('한글 메서드명 "독립표본 t-검정" → t-test', async () => {
      const result = await intentRouter.classify('독립표본 t-검정을 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    // --- 한글 괄호 제거로 매칭 가능해진 경우 ---
    it('"일원분산분석 해줘" → 괄호 제거 패턴으로 anova 매칭', async () => {
      // 수정 전: koreanName='일원분산분석 (ANOVA)' 전체 매칭 필요 → 실패
      // 수정 후: 괄호 제거 '일원분산분석' 패턴 추가 → 성공
      const result = await intentRouter.classify('일원분산분석 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('anova')
    })

    it('koreanName 전체 포함 "일원분산분석 (ANOVA)" → 여전히 매칭', async () => {
      const result = await intentRouter.classify('일원분산분석 (ANOVA) 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('anova')
    })

    it('정확한 koreanName "선형 회귀" → regression', async () => {
      const result = await intentRouter.classify('선형 회귀 실행')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('regression')
    })

    // --- 여전히 매칭 안 되는 경우 (별도 alias 필요) ---
    it('[한글 갭] "분산분석" → "일원분산분석"의 substring이 아님 → LLM fallback', async () => {
      const result = await intentRouter.classify('분산분석 실행')

      // "분산분석"은 "일원분산분석"에 substring 포함 안 됨 (역방향)
      // → 키워드 매칭 실패 → LLM fallback (여기선 throw) → 최종 fallback
      expect(result.track).toBe('data-consultation')
    })

    it('[한글 갭] "회귀분석" → "선형 회귀"와 다른 문자열 → LLM fallback', async () => {
      const result = await intentRouter.classify('회귀분석')

      // "회귀분석"은 "선형 회귀"에 매칭 안 됨
      expect(result.track).toBe('data-consultation')
    })

    it('[한글 갭] "카이제곱 검정" → 부분 문자열 불일치 → LLM fallback', async () => {
      const result = await intentRouter.classify('카이제곱 검정')

      // "카이제곱 독립성 검정" regex로 "카이제곱 검정" 매칭 안 됨
      expect(result.track).toBe('data-consultation')
    })
  })

  // ===== E. Consultation 키워드 confidence 누적 =====
  describe('E. Consultation 키워드 confidence 누적', () => {
    it('키워드 1개 → confidence=0.65', async () => {
      mockClassifyIntent.mockRejectedValue(new Error('LLM unavailable'))

      const result = await intentRouter.classify('도움')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.65)
    })

    it('키워드 3개 → confidence=0.9 (상한)', async () => {
      // "어떤 분석" + "추천" + "도와" → 3개 매칭 → 0.5 + 3*0.15 = 0.95 → cap 0.9
      const result = await intentRouter.classify('어떤 분석이 좋은지 추천 좀 도와줘')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.9)
    })

    it('키워드 4개+ → confidence는 0.9 상한', async () => {
      const result = await intentRouter.classify('어떤 분석 추천 도와줘 모르겠어')

      expect(result.confidence).toBeLessThanOrEqual(0.9)
    })
  })

  // ===== F. 혼합 입력 (Track 간 경합) =====
  describe('F. 혼합 입력 — Track 간 경합', () => {
    it('Track 3 + Track 2 동시 매칭 → Track 3 우선', async () => {
      const result = await intentRouter.classify('적절한 표본 크기 추천해줘')

      expect(result.track).toBe('experiment-design')
    })

    it('Track 1 + Track 2 동시 매칭 — 메서드명 + 상담 키워드', async () => {
      const result = await intentRouter.classify('t-test가 적합한지 추천해줘')

      // Track 1이 우선 (메서드명 감지)
      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('Track 3 + Track 1 동시 매칭 → Track 3 우선', async () => {
      const result = await intentRouter.classify('ANOVA 검정력 분석')

      expect(result.track).toBe('experiment-design')
    })

    it('메서드명만 있고 상담 키워드 없음 → direct-analysis', async () => {
      const result = await intentRouter.classify('regression')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('regression')
    })
  })

  // ===== G. 특수/경계 입력 =====
  describe('G. 특수/경계 입력', () => {
    it('특수문자만 → 키워드 매칭 없음 → LLM 또는 fallback', async () => {
      const result = await intentRouter.classify('!!@@##$$')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5) // 최종 fallback
    })

    it('숫자만 → 키워드 매칭 없음 → fallback', async () => {
      const result = await intentRouter.classify('12345')

      expect(result.track).toBe('data-consultation')
    })

    it('매우 긴 입력도 정상 처리', async () => {
      const longInput = 't-test를 하고 싶어요. ' + 'a'.repeat(5000)

      const result = await intentRouter.classify(longInput)

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('탭/개행 포함 입력 → trim 후 처리', async () => {
      const result = await intentRouter.classify('\n\t  t-test  \n\t')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('대소문자 혼합 → 정상 감지 (case insensitive)', async () => {
      const result = await intentRouter.classify('T-TEST 분석')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })
  })

  // ===== H. Alias 및 다양한 메서드 감지 =====
  describe('H. 메서드 alias 및 다양한 ID 감지', () => {
    it('alias "independent-t" → t-test로 매핑', async () => {
      const result = await intentRouter.classify('independent-t test 실행')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('alias "student-t" → t-test로 매핑', async () => {
      const result = await intentRouter.classify('student-t 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('t-test')
    })

    it('paired-t 감지', async () => {
      const result = await intentRouter.classify('paired-t test')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('paired-t')
    })

    it('mann-whitney 감지', async () => {
      const result = await intentRouter.classify('Mann-Whitney U 검정 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('mann-whitney')
    })

    it('kruskal-wallis 감지', async () => {
      const result = await intentRouter.classify('Kruskal-Wallis 테스트')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('kruskal-wallis')
    })
  })

  // ===== I. LLM classifyIntent() 응답별 처리 =====
  describe('I. LLM classifyIntent() 응답별 처리', () => {
    it('LLM → experiment-design 분류 → experiment-design', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'experiment-design',
        confidence: 0.9,
        methodId: null,
        reasoning: '실험 설계 관련',
      }))

      const result = await intentRouter.classify('여러 그룹')

      expect(result.track).toBe('experiment-design')
      expect(result.needsData).toBe(false)
      expect(result.provider).toBe('llm')
    })

    it('LLM → direct-analysis + 유효한 methodId → 메서드 정보 포함', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.85,
        methodId: 'anova',
        reasoning: 'ANOVA 적합',
      }))

      const result = await intentRouter.classify('무언가')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('anova')
      expect(result.method?.name).toBeTruthy()
      expect(result.reasoning).toBe('ANOVA 적합')
    })

    it('LLM → 아주 높은 confidence (1.0) → direct-analysis', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 1.0,
        methodId: 'anova',
      }))

      const result = await intentRouter.classify('분산 분석')

      expect(result.track).toBe('direct-analysis')
      expect(result.confidence).toBe(1.0)
    })

    it('LLM → 아주 낮은 confidence (0.1) → data-consultation', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'data-consultation',
        confidence: 0.1,
      }))

      const result = await intentRouter.classify('그냥 봐줘')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.1)
    })
  })

  // ===== J. 3단계 fallback 체인 완전 검증 =====
  describe('J. 3단계 fallback 체인 시나리오 매트릭스', () => {
    // | 키워드 | LLM          | 예상 결과                      |
    // |--------|--------------|-------------------------------|
    // | High   | -            | 키워드 (LLM 호출 안 함)         |
    // | Low    | 성공         | LLM                           |
    // | Low    | null/throw   | 키워드 (3차)                   |
    // | 없음   | 성공         | LLM                           |
    // | 없음   | null/throw   | 최종 fallback                  |

    it('시나리오 1: 키워드 High → LLM 미호출', async () => {
      const result = await intentRouter.classify('t-test 해줘') // confidence=0.95

      expect(result.track).toBe('direct-analysis')
      expect(result.provider).toBe('keyword')
      expect(mockClassifyIntent).not.toHaveBeenCalled()
    })

    it('시나리오 2: 키워드 Low + LLM 성공 → LLM 결과', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'direct-analysis',
        confidence: 0.8,
        methodId: 'anova',
      }))

      // "추천" → consultation 0.65 (< 0.7)
      const result = await intentRouter.classify('분석 추천')

      expect(result.track).toBe('direct-analysis') // LLM이 ANOVA 분류
      expect(result.provider).toBe('llm')
    })

    it('시나리오 3: 키워드 Low + LLM null → 키워드 결과 (3차)', async () => {
      mockClassifyIntent.mockResolvedValue(null)

      const result = await intentRouter.classify('분석 추천')

      expect(result.track).toBe('data-consultation')
      expect(result.provider).toBe('keyword')
      expect(result.confidence).toBe(0.65)
    })

    it('시나리오 4: 키워드 없음 + LLM 성공 → LLM 결과', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'data-consultation',
        confidence: 0.7,
        reasoning: '상담 필요',
      }))

      const result = await intentRouter.classify('가나다라')

      expect(result.track).toBe('data-consultation')
      expect(result.provider).toBe('llm')
    })

    it('시나리오 5: 키워드 없음 + LLM throw → 최종 fallback', async () => {
      mockClassifyIntent.mockRejectedValue(new Error('all failed'))

      const result = await intentRouter.classify('가나다라')

      expect(result.track).toBe('data-consultation')
      expect(result.confidence).toBe(0.5)
      expect(result.provider).toBe('keyword') // createFallback
    })
  })

  // ===== K. needsData 필드 검증 =====
  describe('K. needsData 필드 일관성', () => {
    it('experiment-design → needsData=false', async () => {
      const result = await intentRouter.classify('표본 크기 계산')

      expect(result.needsData).toBe(false)
    })

    it('direct-analysis → needsData=true', async () => {
      const result = await intentRouter.classify('t-test 해줘')

      expect(result.needsData).toBe(true)
    })

    it('data-consultation → needsData=true', async () => {
      const result = await intentRouter.classify('어떤 분석이 좋을까요')

      expect(result.needsData).toBe(true)
    })

    it('빈 입력 fallback → needsData=true', async () => {
      const result = await intentRouter.classify('')

      expect(result.needsData).toBe(true)
    })

    it('LLM experiment-design → needsData=false', async () => {
      mockClassifyIntent.mockResolvedValue(createClassification({
        track: 'experiment-design',
        confidence: 0.8,
      }))

      const result = await intentRouter.classify('아무거나')

      expect(result.needsData).toBe(false)
    })
  })

  // ===== L. 한글 매칭 갭 수정 검증 =====
  describe('L. 한글 괄호 제거 패턴 매칭 검증', () => {
    it('"일원분산분석" (괄호 없이) → anova 매칭', async () => {
      const result = await intentRouter.classify('일원분산분석')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('anova')
    })

    it('"카이제곱 독립성 검정" (전체) → chi-square-independence 매칭', async () => {
      const result = await intentRouter.classify('카이제곱 독립성 검정 해줘')

      expect(result.track).toBe('direct-analysis')
      expect(result.method?.id).toBe('chi-square-independence')
    })
  })
})
