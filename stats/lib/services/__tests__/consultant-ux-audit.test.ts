/**
 * 사용자 관점 UX 감사 테스트
 *
 * 실제 연구자가 입력할 법한 자연어 질문으로
 * 추천 결과가 "상식적으로 맞는 메서드"인지 확인.
 *
 * 실패 = 키워드 설계 버그, 통과 = 사용자 기대 충족
 */
import { describe, it, expect } from 'vitest'
import { getRecommendations } from '../consultant-service'

/** 헬퍼: 1순위 methodId 반환 */
function topMethod(message: string): string | undefined {
  return getRecommendations(message).recommendations[0]?.methodId
}

/** 헬퍼: 상위 N개 methodId 반환 */
function topMethods(message: string, n = 3): string[] {
  return getRecommendations(message, n).recommendations.map(r => r.methodId)
}

describe('사용자 관점 UX 감사', () => {
  // ─── 그룹 비교 시나리오 ───
  describe('그룹 비교 질문', () => {
    it('약 먹기 전후 체중 변화가 있는지 → paired-t', () => {
      expect(topMethod('약 먹기 전후 체중 변화가 있는지 비교하고 싶어요')).toBe('paired-t')
    })

    it('실험군 대조군 평균 비교 → t-test', () => {
      expect(topMethod('실험군과 대조군의 평균을 비교하고 싶어요')).toBe('t-test')
    })

    it('A, B, C 세 그룹 차이 → anova', () => {
      expect(topMethod('A, B, C 세 그룹의 차이를 보고 싶어요')).toBe('anova')
    })

    it('같은 환자 3번 반복 측정 → repeated-measures-anova', () => {
      expect(topMethod('같은 환자를 3번 반복 측정했어요')).toBe('repeated-measures-anova')
    })

    it('데이터가 비정규 두 그룹 비교 → mann-whitney가 top 3에 포함 + clarification', () => {
      const result = getRecommendations('데이터가 비정규 두 그룹 비교')
      const methods = result.recommendations.map(r => r.methodId)
      expect(methods).toContain('mann-whitney')
      // 동점이므로 clarification이 사용자에게 선택권을 줌
      expect(result.clarification).toBeDefined()
    })

    it('사전/사후 비모수 검정 → wilcoxon이 top 3에 포함 + clarification', () => {
      const result = getRecommendations('사전/사후 비모수 검정')
      const methods = result.recommendations.map(r => r.methodId)
      expect(methods).toContain('wilcoxon')
      expect(result.clarification).toBeDefined()
    })
  })

  // ─── 카테고리 간 충돌 시나리오 (리뷰 High-1) ───
  describe('카테고리 간 모호한 질문', () => {
    it('"이분 대응 자료예요" → mcnemar이 top 3에 포함', () => {
      const result = getRecommendations('이분 대응 자료를 분석하고 싶어요')
      const methods = result.recommendations.map(r => r.methodId)
      // "이분 대응" → mcnemar(relationship), "대응" → paired-t(compare)
      // 두 카테고리 모두 활성화되어야 함
      expect(methods).toContain('mcnemar')
    })

    it('"카이제곱이고 대응 자료" → 적절한 메서드가 top 3에 포함', () => {
      const result = getRecommendations('카이제곱이고 대응 자료예요')
      const methods = result.recommendations.map(r => r.methodId)
      // chi-square-independence 또는 mcnemar가 포함되어야 함
      const hasRelevant = methods.includes('chi-square-independence') || methods.includes('mcnemar')
      expect(hasRelevant).toBe(true)
    })

    it('"교차표 비교" → chi-square-independence가 1순위 (generic 카테고리에 밀리지 않음)', () => {
      // "비교" → compare 카테고리 활성화 (method score 0)
      // "교차표" → relationship의 chi-square-independence 매칭 (method score 1)
      // 카테고리 동점이지만 메서드 점수 tiebreaker로 relationship이 우선
      expect(topMethod('교차표 비교')).toBe('chi-square-independence')
    })

    it('"roc 비교" → roc-curve가 top 3에 포함', () => {
      const methods = topMethods('roc 비교')
      expect(methods).toContain('roc-curve')
    })

    it('"주성분 차원 비교" → pca가 1순위', () => {
      // "비교" → compare, "차원"+"주성분" → multivariate(pca)
      // pca의 메서드 점수가 높으므로 multivariate 우선
      expect(topMethod('주성분 차원 비교')).toBe('pca')
    })
  })

  // ─── 관계 분석 시나리오 ───
  describe('관계 분석 질문', () => {
    it('키와 체중의 상관관계 → correlation', () => {
      expect(topMethod('키와 체중의 상관관계를 보고 싶어요')).toBe('correlation')
    })

    it('성별과 합격 여부 연관성 (빈도표) → chi-square-independence', () => {
      expect(topMethod('성별과 합격 여부의 연관성을 빈도표로 확인')).toBe('chi-square-independence')
    })
  })

  // ─── 예측 시나리오 ───
  describe('예측 질문', () => {
    it('회귀 분석으로 예측 → regression', () => {
      expect(topMethod('회귀 분석으로 예측하고 싶어요')).toBe('regression')
    })

    it('합격/불합격 이분 분류 예측 → logistic-regression', () => {
      expect(topMethod('합격 불합격을 이분 분류 예측하고 싶어요')).toBe('logistic-regression')
    })
  })

  // ─── 기술통계 시나리오 ───
  describe('기술통계/분포 질문', () => {
    it('데이터 정규성 확인 → normality-test', () => {
      expect(topMethod('데이터가 정규분포인지 확인하고 싶어요')).toBe('normality-test')
    })

    it('기본 기술통계 요약 → descriptive', () => {
      expect(topMethod('기술통계 요약 보여주세요')).toBe('descriptive')
    })
  })

  // ─── 시계열 시나리오 ───
  describe('시계열 질문', () => {
    it('시간에 따른 추세 변화 → 시계열 카테고리 내 메서드', () => {
      const methods = topMethods('시간에 따른 추세 변화를 분석하고 싶어요')
      expect(methods.length).toBeGreaterThan(0)
      const timeseriesMethods = ['arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall']
      expect(timeseriesMethods).toContain(methods[0])
    })
  })

  // ─── 다변량 시나리오 ───
  describe('다변량 질문', () => {
    it('주성분 분석으로 차원 축소 → pca', () => {
      expect(topMethod('주성분 분석으로 차원 축소하고 싶어요')).toBe('pca')
    })

    it('군집 분석 → cluster', () => {
      expect(topMethod('군집 분석으로 그룹핑하고 싶어요')).toBe('cluster')
    })
  })

  // ─── 엣지 케이스 ───
  describe('엣지 케이스', () => {
    it('추천 3개 모두 서로 다른 메서드', () => {
      const result = getRecommendations('비교 차이 평균')
      const ids = result.recommendations.map(r => r.methodId)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('영어로 질문해도 동작', () => {
      expect(topMethod('I want to compare two groups')).toBe('t-test')
    })

    it('한영 혼합 질문', () => {
      expect(topMethod('paired t-test로 전후 비교')).toBe('paired-t')
    })

    it('reason이 항상 비어있지 않음', () => {
      const queries = ['비교', '상관 관계', '예측 모델', '기술통계 요약']
      for (const q of queries) {
        const result = getRecommendations(q)
        for (const rec of result.recommendations) {
          expect(rec.reason.length, `"${q}" → ${rec.methodId} reason이 빈 문자열`).toBeGreaterThan(0)
          expect(rec.reason, `"${q}" → ${rec.methodId} reason에 빈 키워드`).not.toMatch(/입력에서\s+키워드/)
        }
      }
    })
  })
})
