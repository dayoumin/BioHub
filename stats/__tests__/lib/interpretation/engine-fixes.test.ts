/**
 * Interpretation Engine Bug Fixes Tests
 *
 * 3가지 이슈 수정 검증:
 * 1. [High] Mann-Whitney 해석 추가
 * 2. [Low] Mood's Median 그룹 수 표현 개선
 * 3. [Low] Mann-Kendall statistic 검증 강화
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Bug Fixes', () => {
  describe('[High] Mann-Whitney U Test 해석 추가', () => {
    it('Mann-Whitney U Test → 독립표본 비모수 검정', () => {
      const results: AnalysisResult = {
        method: 'Mann-Whitney U Test',
        pValue: 0.01,
        statistic: 120,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('독립표본 비모수 검정')
      expect(interpretation?.summary).toContain('두 독립 그룹')
      expect(interpretation?.summary).toContain('중앙값 차이')
      expect(interpretation?.statistical).toContain('유의한 차이가 있습니다')
    })

    it('Mann-Whitney (하이픈 표기)', () => {
      const results: AnalysisResult = {
        method: 'Mann-Whitney Test',
        pValue: 0.03,
        statistic: 85,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('독립표본 비모수 검정')
    })

    it('Wilcoxon은 Mann-Whitney와 구분됨', () => {
      const wilcoxon: AnalysisResult = {
        method: 'Wilcoxon Signed-Rank Test',
        pValue: 0.01,
        statistic: 45,
        interpretation: ''
      }

      const mannWhitney: AnalysisResult = {
        method: 'Mann-Whitney U Test',
        pValue: 0.01,
        statistic: 120,
        interpretation: ''
      }

      const wilcoxonInterpretation = getInterpretation(wilcoxon)
      const mannWhitneyInterpretation = getInterpretation(mannWhitney)

      expect(wilcoxonInterpretation?.title).toBe('대응표본 비모수 검정')
      expect(mannWhitneyInterpretation?.title).toBe('독립표본 비모수 검정')
    })
  })

  describe("[Low] Mood's Median 그룹 수 표현 개선", () => {
    it('2개 그룹 → "각 그룹" 표현', () => {
      const results: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.02,
        statistic: 5.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.summary).toContain('각 그룹의 중앙값')
      expect(interpretation?.summary).not.toContain('두 그룹')
    })

    it('practical 메시지도 "그룹 간" 표현', () => {
      const results: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.01,
        statistic: 8.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.practical).toContain('그룹 간')
    })
  })

  describe('[Low] Mann-Kendall statistic 검증 강화', () => {
    it('유효한 statistic > 0 → 증가 추세', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.0001,
        statistic: 120.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toContain('증가하는 추세')
    })

    it('유효한 statistic < 0 → 감소 추세', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.008,
        statistic: -85.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toContain('감소하는 추세')
    })

    it('statistic = NaN → 방향 중립 메시지', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.001,
        statistic: NaN,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      // 방향을 명시하지 않고 일반적인 메시지
      expect(interpretation?.practical).toBe('통계적으로 유의한 추세가 있습니다.')
      expect(interpretation?.practical).not.toContain('증가')
      expect(interpretation?.practical).not.toContain('감소')
    })

    it('statistic = Infinity → 방향 중립 메시지', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.01,
        statistic: Infinity,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toBe('통계적으로 유의한 추세가 있습니다.')
    })

    it('statistic = undefined → 방향 중립 메시지', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.001,
        statistic: undefined as any,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toBe('통계적으로 유의한 추세가 있습니다.')
    })

    it('p >= 0.05 (유의하지 않음) → statistic 무시', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.45,
        statistic: 120.5, // 양수지만 유의하지 않음
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.practical).toContain('일관된 변화가 없습니다')
      expect(interpretation?.practical).not.toContain('증가')
      expect(interpretation?.practical).not.toContain('감소')
    })
  })

  describe('통합 테스트: 3가지 수정 사항 동시 검증', () => {
    it('Mann-Whitney + Mood + Mann-Kendall 모두 정상 동작', () => {
      const mannWhitney: AnalysisResult = {
        method: 'Mann-Whitney U Test',
        pValue: 0.01,
        statistic: 120,
        interpretation: ''
      }

      const mood: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.02,
        statistic: 5.3,
        interpretation: ''
      }

      const mannKendall: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.001,
        statistic: 85.2,
        interpretation: ''
      }

      const mwInterpretation = getInterpretation(mannWhitney)
      const moodInterpretation = getInterpretation(mood)
      const mkInterpretation = getInterpretation(mannKendall)

      // Mann-Whitney
      expect(mwInterpretation?.title).toBe('독립표본 비모수 검정')

      // Mood's Median
      expect(moodInterpretation?.summary).toContain('각 그룹')

      // Mann-Kendall
      expect(mkInterpretation?.practical).toContain('증가하는 추세')
    })
  })
})
