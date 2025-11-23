/**
 * Interpretation Engine ANOVA Variants Tests (Phase 2)
 *
 * ANOVA 변형 4개 해석 테스트:
 * 1. Two-way ANOVA (이원분산분석)
 * 2. Repeated Measures ANOVA (반복측정 분산분석)
 * 3. ANCOVA (공분산분석)
 * 4. MANOVA (다변량 분산분석)
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('Interpretation Engine ANOVA Variants (Phase 2)', () => {
  describe('Two-way ANOVA (이원분산분석)', () => {
    it('유의한 효과 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Two-way ANOVA',
        pValue: 0.0001,
        statistic: 12.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
      expect(interpretation?.summary).toContain('두 독립변수')
      expect(interpretation?.summary).toContain('주효과')
      expect(interpretation?.summary).toContain('상호작용')
      expect(interpretation?.statistical).toContain('유의한 효과가 있습니다')
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.practical).toContain('사후 검정')
    })

    it('유의하지 않은 효과 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Two-way ANOVA',
        pValue: 0.35,
        statistic: 1.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('유의한 효과가 없습니다')
      expect(interpretation?.practical).toContain('영향을 주지 않습니다')
    })

    it('한글 표기 (이원분산분석)', () => {
      const results: AnalysisResult = {
        method: '이원분산분석',
        pValue: 0.02,
        statistic: 5.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
    })

    it('숫자 표기 (2원분산분석)', () => {
      const results: AnalysisResult = {
        method: '2원분산분석',
        pValue: 0.008,
        statistic: 8.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
    })

    it('공백 포함 한글 표기 (이원 분산분석)', () => {
      const results: AnalysisResult = {
        method: '이원 분산분석',
        pValue: 0.01,
        statistic: 7.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
    })

    it('하이픈 표기 (2-way ANOVA)', () => {
      const results: AnalysisResult = {
        method: '2-way ANOVA',
        pValue: 0.003,
        statistic: 10.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
    })
  })

  describe('Repeated Measures ANOVA (반복측정 분산분석)', () => {
    it('시점 간 유의한 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Repeated Measures ANOVA',
        pValue: 0.0001,
        statistic: 25.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반복측정 분산분석 결과')
      expect(interpretation?.summary).toContain('동일 개체')
      expect(interpretation?.summary).toContain('3회 이상')
      expect(interpretation?.statistical).toContain('시점 간 통계적으로 유의한 차이가 있습니다')
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.practical).toContain('Bonferroni')
    })

    it('시점 간 유의하지 않은 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'Repeated Measures ANOVA',
        pValue: 0.28,
        statistic: 1.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('시점 간 통계적으로 유의한 차이가 없습니다')
      expect(interpretation?.practical).toContain('유의한 변화가 없습니다')
    })

    it('한글 표기 (반복측정)', () => {
      const results: AnalysisResult = {
        method: '반복측정 분산분석',
        pValue: 0.01,
        statistic: 7.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반복측정 분산분석 결과')
    })

    it('Within-subjects ANOVA (영어 표기)', () => {
      const results: AnalysisResult = {
        method: 'Within-subjects ANOVA',
        pValue: 0.003,
        statistic: 10.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반복측정 분산분석 결과')
    })

    it('공백 포함 표기 (Repeated Measures ANOVA)', () => {
      const results: AnalysisResult = {
        method: 'Repeated Measures ANOVA',
        pValue: 0.02,
        statistic: 6.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('반복측정 분산분석 결과')
    })
  })

  describe('ANCOVA (공분산분석)', () => {
    it('공변량 보정 후 유의한 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'ANCOVA',
        pValue: 0.005,
        statistic: 9.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('공분산분석 결과')
      expect(interpretation?.summary).toContain('공변량')
      expect(interpretation?.summary).toContain('통제')
      expect(interpretation?.statistical).toContain('공변량 보정 후 집단 간 통계적으로 유의한 차이가 있습니다')
      expect(interpretation?.statistical).toContain('p=0.005')
      expect(interpretation?.practical).toContain('순수한 집단 효과')
    })

    it('공변량 보정 후 유의하지 않은 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'ANCOVA',
        pValue: 0.42,
        statistic: 0.9,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('공변량 보정 후 집단 간 통계적으로 유의한 차이가 없습니다')
      expect(interpretation?.practical).toContain('차이가 없습니다')
    })

    it('한글 표기 (공분산분석)', () => {
      const results: AnalysisResult = {
        method: '공분산분석',
        pValue: 0.01,
        statistic: 7.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('공분산분석 결과')
    })

    it('영어 전체 표기 (Analysis of Covariance)', () => {
      const results: AnalysisResult = {
        method: 'Analysis of Covariance',
        pValue: 0.02,
        statistic: 5.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('공분산분석 결과')
    })

    it('공백 포함 한글 표기 (공분산 분석)', () => {
      const results: AnalysisResult = {
        method: '공분산 분석',
        pValue: 0.015,
        statistic: 6.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('공분산분석 결과')
    })
  })

  describe('MANOVA (다변량 분산분석)', () => {
    it('다변량 차원에서 유의한 차이 (p < 0.05)', () => {
      const results: AnalysisResult = {
        method: 'MANOVA',
        pValue: 0.0001,
        statistic: 18.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다변량 분산분석 결과')
      expect(interpretation?.summary).toContain('여러 종속변수')
      expect(interpretation?.summary).toContain('동시에 고려')
      expect(interpretation?.statistical).toContain('다변량 차원에서 통계적으로 유의한 집단 차이가 있습니다')
      expect(interpretation?.statistical).toContain('< 0.001')
      expect(interpretation?.practical).toContain('일원분산분석')
      expect(interpretation?.practical).toContain('follow-up')
    })

    it('다변량 차원에서 유의하지 않은 차이 (p >= 0.05)', () => {
      const results: AnalysisResult = {
        method: 'MANOVA',
        pValue: 0.55,
        statistic: 0.7,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.statistical).toContain('다변량 차원에서 통계적으로 유의한 집단 차이가 없습니다')
      expect(interpretation?.practical).toContain('모든 종속변수에서 집단 간 차이가 없습니다')
    })

    it('한글 표기 (다변량 분산분석)', () => {
      const results: AnalysisResult = {
        method: '다변량 분산분석',
        pValue: 0.008,
        statistic: 8.9,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다변량 분산분석 결과')
    })

    it('영어 전체 표기 (Multivariate ANOVA)', () => {
      const results: AnalysisResult = {
        method: 'Multivariate ANOVA',
        pValue: 0.001,
        statistic: 12.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다변량 분산분석 결과')
    })

    it('공백 포함 한글 표기 (다변량 분산분석)', () => {
      const results: AnalysisResult = {
        method: '다변량 분산분석',
        pValue: 0.005,
        statistic: 9.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다변량 분산분석 결과')
    })
  })

  describe('ANOVA 변형 vs One-way ANOVA 구분', () => {
    it('One-way ANOVA는 다집단 비교 결과로 표시', () => {
      const results: AnalysisResult = {
        method: 'One-way ANOVA',
        pValue: 0.001,
        statistic: 15.2,
        groupStats: [
          { name: 'A', mean: 10, std: 2, n: 30 },
          { name: 'B', mean: 15, std: 3, n: 30 },
          { name: 'C', mean: 20, std: 2.5, n: 30 }
        ],
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('다집단 비교 결과')
      expect(interpretation?.summary).toContain('3개 그룹')
    })

    it('Two-way ANOVA는 이원분산분석으로 구분됨', () => {
      const results: AnalysisResult = {
        method: 'Two-way ANOVA',
        pValue: 0.001,
        statistic: 12.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toBe('이원분산분석 결과')
      expect(interpretation?.title).not.toBe('다집단 비교 결과')
    })
  })

  describe('Edge Cases (경계값 테스트)', () => {
    it('p-value = 0.05 (경계값) → 유의하지 않음', () => {
      const results: AnalysisResult = {
        method: 'Two-way ANOVA',
        pValue: 0.05,
        statistic: 3.84,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('유의한 효과가 없습니다')
    })

    it('p-value < 0.001 → \"< 0.001\" 포맷', () => {
      const results: AnalysisResult = {
        method: 'MANOVA',
        pValue: 0.00005,
        statistic: 25.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation?.statistical).toContain('< 0.001')
    })
  })

  describe('통합 테스트: 4가지 ANOVA 변형 동시 검증', () => {
    it('ANOVA 4개 변형 모두 정상 동작', () => {
      const twoWay: AnalysisResult = {
        method: 'Two-way ANOVA',
        pValue: 0.0001,
        statistic: 12.5,
        interpretation: ''
      }

      const repeated: AnalysisResult = {
        method: 'Repeated Measures ANOVA',
        pValue: 0.0001,
        statistic: 25.8,
        interpretation: ''
      }

      const ancova: AnalysisResult = {
        method: 'ANCOVA',
        pValue: 0.005,
        statistic: 9.8,
        interpretation: ''
      }

      const manova: AnalysisResult = {
        method: 'MANOVA',
        pValue: 0.0001,
        statistic: 18.5,
        interpretation: ''
      }

      const twoWayInterpretation = getInterpretation(twoWay)
      const repeatedInterpretation = getInterpretation(repeated)
      const ancovaInterpretation = getInterpretation(ancova)
      const manovaInterpretation = getInterpretation(manova)

      // Two-way ANOVA
      expect(twoWayInterpretation?.title).toBe('이원분산분석 결과')

      // Repeated Measures ANOVA
      expect(repeatedInterpretation?.title).toBe('반복측정 분산분석 결과')

      // ANCOVA
      expect(ancovaInterpretation?.title).toBe('공분산분석 결과')

      // MANOVA
      expect(manovaInterpretation?.title).toBe('다변량 분산분석 결과')
    })
  })
})
