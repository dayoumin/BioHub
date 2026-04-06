import { describe, it, expect } from 'vitest'
import { getRecommendations, METHOD_KEYWORDS } from '../consultant-service'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { PURPOSE_CATEGORIES } from '@/lib/constants/purpose-categories'

describe('consultant-service', () => {
  describe('getRecommendations', () => {
    it('빈 메시지에 빈 결과 반환', () => {
      const result = getRecommendations('')
      expect(result.recommendations).toHaveLength(0)
    })

    it('매칭되지 않는 메시지에 빈 결과 반환', () => {
      const result = getRecommendations('xyzzy 무의미한 문장')
      expect(result.recommendations).toHaveLength(0)
    })

    it('기본 카테고리 매칭 동작', () => {
      const result = getRecommendations('두 그룹 비교')
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1)
      expect(result.summary).toContain('그룹 비교')
    })

    it('maxRecommendations 제한 준수', () => {
      const result = getRecommendations('비교 차이 평균', 2)
      expect(result.recommendations.length).toBeLessThanOrEqual(2)
    })

    it('첫 번째 추천에 recommended 뱃지', () => {
      const result = getRecommendations('그룹 비교')
      expect(result.recommendations[0]?.badge).toBe('recommended')
      if (result.recommendations.length > 1) {
        expect(result.recommendations[1]?.badge).toBe('alternative')
      }
    })
  })

  describe('2차 매칭: 카테고리 내 메서드 우선순위', () => {
    it('"전후 비교" → paired-t가 1순위', () => {
      const result = getRecommendations('전후 비교')
      expect(result.recommendations[0]?.methodId).toBe('paired-t')
    })

    it('"사전사후 차이" → paired-t가 1순위', () => {
      const result = getRecommendations('사전사후 차이')
      expect(result.recommendations[0]?.methodId).toBe('paired-t')
    })

    it('"대응표본 비교" → paired-t가 1순위', () => {
      const result = getRecommendations('대응표본 비교')
      expect(result.recommendations[0]?.methodId).toBe('paired-t')
    })

    it('"독립표본 두 그룹 비교" → two-sample-t가 1순위', () => {
      const result = getRecommendations('독립표본 두 그룹 비교')
      expect(result.recommendations[0]?.methodId).toBe('two-sample-t')
    })

    it('"반복측정 비교" → repeated-measures-anova가 1순위', () => {
      const result = getRecommendations('반복측정 비교')
      expect(result.recommendations[0]?.methodId).toBe('repeated-measures-anova')
    })

    it('"비모수 대응 비교" → wilcoxon-signed-rank이 1순위', () => {
      const result = getRecommendations('비모수 대응 비교')
      expect(result.recommendations[0]?.methodId).toBe('wilcoxon-signed-rank')
    })

    it('"상관 관계 분석" → pearson-correlation이 1순위', () => {
      const result = getRecommendations('상관 관계 분석')
      expect(result.recommendations[0]?.methodId).toBe('pearson-correlation')
    })

    it('"카이제곱 연관" → chi-square-independence가 1순위', () => {
      const result = getRecommendations('카이제곱 연관')
      expect(result.recommendations[0]?.methodId).toBe('chi-square-independence')
    })

    it('"로지스틱 예측 모델" → logistic-regression이 1순위', () => {
      const result = getRecommendations('로지스틱 예측 모델')
      expect(result.recommendations[0]?.methodId).toBe('logistic-regression')
    })

    it('"정규성 분포 검정" → normality-test가 1순위', () => {
      const result = getRecommendations('정규성 분포 검정')
      expect(result.recommendations[0]?.methodId).toBe('normality-test')
    })

    it('"검정력 표본 크기" → power-analysis가 1순위', () => {
      const result = getRecommendations('검정력 표본 크기')
      expect(result.recommendations[0]?.methodId).toBe('power-analysis')
    })

    it('2차 매칭 없으면 원래 순서 유지', () => {
      const result = getRecommendations('비교')
      expect(result.recommendations[0]?.methodId).toBe('two-sample-t')
    })
  })

  describe('동점 시 clarification 생성', () => {
    it('카테고리 내 동점 → 동점 메서드 전부 표시', () => {
      // "비모수 비교" → mann-whitney("비모수"), wilcoxon-signed-rank("비모수") 둘 다 1점
      const result = getRecommendations('비모수 비교')
      expect(result.clarification).toBeDefined()
      const optionIds = result.clarification?.options.map(o => o.methodId) ?? []
      expect(optionIds).toContain('mann-whitney')
      expect(optionIds).toContain('wilcoxon-signed-rank')
    })

    it('"전후 비교" → 1위 명확 → clarification 없음', () => {
      const result = getRecommendations('전후 비교')
      expect(result.clarification).toBeUndefined()
    })

    it('clarification 옵션에 한글 설명 포함', () => {
      const result = getRecommendations('비모수 비교')
      if (result.clarification) {
        expect(result.clarification.question).toEqual(expect.any(String))
        for (const opt of result.clarification.options) {
          expect(opt.label.length).toBeGreaterThan(5)
        }
      }
    })
  })

  describe('오탐 방지 (negative test)', () => {
    it('"추천 하나 해줘" → one-sample-t로 가지 않음', () => {
      const result = getRecommendations('추천 하나 해줘')
      expect(result.recommendations[0]?.methodId).not.toBe('one-sample-t')
    })

    it('"변수를 통제하고 싶어요" → ancova로 가지 않음', () => {
      const result = getRecommendations('변수를 통제하고 싶어요')
      // "통제"는 제거됨 → 매칭 안 됨
      const topId = result.recommendations[0]?.methodId
      expect(topId).not.toBe('ancova')
    })
  })

  describe('buildReason 빈 설명 방지', () => {
    it('메서드 키워드만으로 활성화된 카테고리도 reason이 비어있지 않음', () => {
      // methodKeywordBonus로만 활성화된 카테고리
      const result = getRecommendations('부호순위 검정')
      for (const rec of result.recommendations) {
        expect(rec.reason.length).toBeGreaterThanOrEqual(1)
        expect(rec.reason).not.toContain('입력에서  키워드')
      }
    })
  })

  describe('METHOD_KEYWORDS 무결성', () => {
    it('모든 METHOD_KEYWORDS 키가 STATISTICAL_METHODS에 존재', () => {
      for (const methodId of Object.keys(METHOD_KEYWORDS)) {
        expect(
          STATISTICAL_METHODS[methodId],
          `METHOD_KEYWORDS에 정의된 "${methodId}"가 STATISTICAL_METHODS에 없음`
        ).toBeDefined()
      }
    })

    it('모든 METHOD_KEYWORDS 키가 PURPOSE_CATEGORIES.methodIds에 포함', () => {
      const allMethodIds = new Set(
        PURPOSE_CATEGORIES.flatMap(c => c.methodIds)
      )
      for (const methodId of Object.keys(METHOD_KEYWORDS)) {
        expect(
          allMethodIds.has(methodId),
          `METHOD_KEYWORDS에 정의된 "${methodId}"가 어떤 카테고리에도 없음`
        ).toBe(true)
      }
    })

    it('PURPOSE_CATEGORIES의 모든 methodId가 METHOD_KEYWORDS에 정의됨', () => {
      const allCategoryMethodIds = PURPOSE_CATEGORIES
        .filter(c => !c.disabled)
        .flatMap(c => c.methodIds)
      for (const methodId of allCategoryMethodIds) {
        expect(
          METHOD_KEYWORDS[methodId],
          `카테고리에 포함된 "${methodId}"가 METHOD_KEYWORDS에 없음 (2차 매칭 불가)`
        ).toBeDefined()
      }
    })
  })
})
