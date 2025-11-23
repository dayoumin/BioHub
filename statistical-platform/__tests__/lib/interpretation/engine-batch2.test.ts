/**
 * Interpretation Engine Batch 2 Tests
 *
 * 독립/무작위 검정 해석 테스트 (4개)
 * - Mood's Median Test
 * - Runs Test
 * - Mann-Kendall Test
 * - Binomial Test
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine Batch 2 (독립/무작위 검정)', () => {
  describe("Mood's Median Test (중앙값 검정)", () => {
    it('유의한 중앙값 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.01,
        statistic: 8.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('중앙값 검정 결과')
      expect(interpretation?.summary).toContain('중앙값이 같은지')
      expect(interpretation?.statistical).toContain('유의한 중앙값 차이가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.010')
      expect(interpretation?.practical).toContain('중심 경향이 다릅니다')
    })

    it('유의하지 않은 중앙값 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.33,
        statistic: 1.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 중앙값 차이가 없습니다')
      expect(interpretation?.practical).toContain('유사합니다')
    })

    it('소문자 표기 (mood median test)', () => {
      const results: AnalysisResult = {
        method: 'mood median test',
        pValue: 0.02,
        statistic: 5.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('중앙값 검정 결과')
    })
  })

  describe('Runs Test (무작위성 검정)', () => {
    it('무작위성 가정 위배 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Runs Test',
        pValue: 0.003,
        statistic: 12,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('무작위성 검정 결과')
      expect(interpretation?.summary).toContain('무작위성')
      expect(interpretation?.statistical).toContain('만족하지 않습니다')
      expect(interpretation?.statistical).toContain('p=0.003')
      expect(interpretation?.practical).toContain('패턴 또는 추세')
    })

    it('무작위성 가정 만족 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Runs Test',
        pValue: 0.67,
        statistic: 25,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('만족합니다')
      expect(interpretation?.practical).toContain('무작위로 분포')
    })

    it('Runs Test for Randomness (영어 표기)', () => {
      const results: AnalysisResult = {
        method: 'Runs Test for Randomness',
        pValue: 0.01,
        statistic: 8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('무작위성 검정 결과')
    })
  })

  describe('Mann-Kendall Test (추세 검정)', () => {
    it('증가 추세 유의 (p < 0.05, statistic > 0)', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.0001,
        statistic: 120.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('추세 검정 결과')
      expect(interpretation?.summary).toContain('단조 추세')
      expect(interpretation?.statistical).toContain('유의한 추세가 있습니다')
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.practical).toContain('증가하는 추세')
    })

    it('감소 추세 유의 (p < 0.05, statistic < 0)', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.008,
        statistic: -85.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 추세가 있습니다')
      expect(interpretation?.practical).toContain('감소하는 추세')
    })

    it('추세 없음 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Trend Test',
        pValue: 0.45,
        statistic: 12.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 추세가 없습니다')
      expect(interpretation?.practical).toContain('일관된 변화가 없습니다')
    })
  })

  describe('Binomial Test (이항 검정)', () => {
    it('관측 비율이 기대값과 다름 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Binomial Test',
        pValue: 0.012,
        statistic: 15,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이항 검정 결과')
      expect(interpretation?.summary).toContain('성공 확률')
      expect(interpretation?.statistical).toContain('유의한 차이가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.012')
      expect(interpretation?.practical).toContain('기대 비율과 다릅니다')
    })

    it('관측 비율이 기대값과 일치 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Binomial Test',
        pValue: 0.55,
        statistic: 50,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 차이가 없습니다')
      expect(interpretation?.practical).toContain('일치합니다')
    })

    it('One-Sample Binomial Test (영어 표기)', () => {
      const results: AnalysisResult = {
        method: 'One-Sample Binomial Test',
        pValue: 0.001,
        statistic: 5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이항 검정 결과')
    })
  })

  describe('Edge Cases (경계값 테스트)', () => {
    it('p-value = 0.05 (경계값) → 유의하지 않음', () => {
      const results: AnalysisResult = {
        method: "Mood's Median Test",
        pValue: 0.05,
        statistic: 3.84,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('유의한 중앙값 차이가 없습니다')
    })

    it('p-value < 0.001 → "< 0.001" 포맷', () => {
      const results: AnalysisResult = {
        method: 'Runs Test',
        pValue: 0.00005,
        statistic: 5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('< 0.001')
    })

    it('Mann-Kendall: statistic = 0 (경계값) → 감소 추세', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.01,
        statistic: 0,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      // statistic > 0이 false이므로 감소 추세로 분류
      expect(interpretation?.practical).toContain('감소하는 추세')
    })

    it('Mann-Kendall: statistic = 0.1 (약간 증가) → 증가 추세', () => {
      const results: AnalysisResult = {
        method: 'Mann-Kendall Test',
        pValue: 0.02,
        statistic: 0.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.practical).toContain('증가하는 추세')
    })
  })
})
