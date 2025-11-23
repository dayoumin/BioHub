/**
 * Interpretation Engine Batch 1 Tests
 *
 * 대응/쌍대 비모수 검정 해석 테스트 (4개)
 * - Wilcoxon Signed-Rank
 * - Sign Test
 * - Friedman
 * - Cochran Q
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Batch 1 (대응/쌍대 비모수 검정)', () => {
  describe('Wilcoxon Signed-Rank Test', () => {
    it('유의한 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Wilcoxon Signed-Rank Test',
        pValue: 0.01,
        statistic: 45,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('대응표본 비모수 검정')
      expect(interpretation?.summary).toContain('중앙값 차이')
      expect(interpretation?.statistical).toContain('유의한 차이가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.010')
      expect(interpretation?.practical).toContain('실질적으로 다릅니다')
    })

    it('유의하지 않은 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Wilcoxon Signed-Rank Test',
        pValue: 0.25,
        statistic: 120,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 차이가 없습니다')
      expect(interpretation?.practical).toContain('유사합니다')
    })

    it('Mann-Whitney는 제외 (다른 검정)', () => {
      const results: AnalysisResult = {
        method: 'Mann-Whitney U Test',
        pValue: 0.01,
        statistic: 45,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      // Mann-Whitney는 Wilcoxon으로 해석되지 않음
      expect(interpretation?.title).not.toBe('대응표본 비모수 검정')
    })
  })

  describe('Sign Test (부호 검정)', () => {
    it('유의한 변화 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Sign Test',
        pValue: 0.003,
        statistic: 15,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('부호 검정 결과')
      expect(interpretation?.summary).toContain('증가/감소 방향')
      expect(interpretation?.statistical).toContain('유의한 변화가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.003')
      expect(interpretation?.practical).toContain('일관된 방향')
    })

    it('유의하지 않은 변화 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Sign Test',
        pValue: 0.45,
        statistic: 8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 변화가 없습니다')
      expect(interpretation?.practical).toContain('비슷한 비율')
    })
  })

  describe('Friedman Test (프리드만 검정)', () => {
    it('유의한 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Friedman Test',
        pValue: 0.0001,
        statistic: 25.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반복측정 비모수 검정')
      expect(interpretation?.summary).toContain('3개 이상 반복측정값')
      expect(interpretation?.statistical).toContain('유의한 차이가 있습니다')
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.practical).toContain('사후 검정')
      expect(interpretation?.practical).toContain('Nemenyi')
    })

    it('유의하지 않은 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Friedman Test',
        pValue: 0.15,
        statistic: 3.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유사합니다')
      expect(interpretation?.practical).toContain('유의한 변화가 없습니다')
    })
  })

  describe('Cochran Q Test (코크란 Q 검정)', () => {
    it('유의한 비율 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Cochran Q Test',
        pValue: 0.008,
        statistic: 12.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다중 이분형 변수 검정')
      expect(interpretation?.summary).toContain('이분형 반복측정값')
      expect(interpretation?.statistical).toContain('유의한 비율 차이가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.008')
      expect(interpretation?.practical).toContain('McNemar')
    })

    it('유의하지 않은 비율 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: "Cochran's Q",
        pValue: 0.33,
        statistic: 2.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유사합니다')
      expect(interpretation?.practical).toContain('비율 변화가 없습니다')
    })

    it('cochranq 소문자 표기도 인식', () => {
      const results: AnalysisResult = {
        method: 'cochranq',
        pValue: 0.01,
        statistic: 10.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다중 이분형 변수 검정')
    })
  })

  describe('Edge Cases (경계값 테스트)', () => {
    it('p-value = 0.05 (경계값) → 유의하지 않음', () => {
      const results: AnalysisResult = {
        method: 'Wilcoxon Signed-Rank Test',
        pValue: 0.05,
        statistic: 30,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('유의한 차이가 없습니다')
    })

    it('p-value = 0.0499 → 유의함', () => {
      const results: AnalysisResult = {
        method: 'Sign Test',
        pValue: 0.0499,
        statistic: 20,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('유의한 변화가 있습니다')
    })

    it('p-value < 0.001 → "< 0.001" 포맷', () => {
      const results: AnalysisResult = {
        method: 'Friedman Test',
        pValue: 0.0001,
        statistic: 35.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('< 0.001')
    })
  })
})
