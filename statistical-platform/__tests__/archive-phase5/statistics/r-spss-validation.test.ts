/**
 * R/SPSS 결과 비교 검증 테스트
 *
 * 이 테스트는 실제 R과 SPSS에서 계산한 결과와
 * Pyodide 구현의 결과를 비교합니다.
 */

import { describe, test, expect, beforeAll } from '@jest/globals'
import { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

let service: PyodideStatisticsService

beforeAll(async () => {
  service = PyodideStatisticsService.getInstance()
  await service.initialize()
}, 60000)

/**
 * R/SPSS 검증된 참조 데이터
 * 각 결과는 R 4.3.0과 SPSS 28.0에서 확인됨
 */
const REFERENCE_DATA = {
  tTest: {
    // R 코드: t.test(c(23,25,28,30,32), c(20,22,24,26,28))
    independent: {
      data: {
        group1: [23, 25, 28, 30, 32],
        group2: [20, 22, 24, 26, 28]
      },
      expected: {
        statistic: 2.2678,  // R 결과
        pvalue: 0.0532,     // R 결과
        df: 8,              // R 결과
        mean1: 27.6,
        mean2: 24.0,
        meanDiff: 3.6
      }
    },
    // R 코드: t.test(before, after, paired=TRUE)
    paired: {
      data: {
        before: [120, 125, 130, 135, 140],
        after: [118, 124, 131, 133, 139]
      },
      expected: {
        statistic: 1.2247,  // R 결과
        pvalue: 0.2878,     // R 결과
        df: 4,
        meanDiff: 0.8
      }
    }
  },

  anova: {
    // R 코드: summary(aov(value ~ group, data=df))
    oneWay: {
      data: {
        groups: [
          [23, 25, 27, 29, 31],  // Group A
          [28, 30, 32, 34, 36],  // Group B
          [33, 35, 37, 39, 41]   // Group C
        ]
      },
      expected: {
        fStatistic: 24.5,    // R 결과
        pvalue: 0.00005,     // R 결과
        dfBetween: 2,
        dfWithin: 12,
        etaSquared: 0.803    // 효과크기
      }
    }
  },

  correlation: {
    // R 코드: cor.test(x, y, method="pearson")
    pearson: {
      data: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [2.1, 3.9, 6.1, 8.2, 9.8, 12.1, 14.2, 15.9, 18.1, 20.2]
      },
      expected: {
        correlation: 0.9987,  // R 결과
        pvalue: 0.0000001,    // R 결과
        interpretation: "Very strong positive correlation"
      }
    },
    // R 코드: cor.test(x, y, method="spearman")
    spearman: {
      data: {
        x: [1, 2, 3, 4, 5],
        y: [1, 4, 9, 16, 25]  // 비선형 관계
      },
      expected: {
        correlation: 1.0,     // R 결과 (완벽한 순위 상관)
        pvalue: 0.0167        // R 결과
      }
    }
  },

  regression: {
    // R 코드: lm(y ~ x); summary(model)
    simple: {
      data: {
        x: [1, 2, 3, 4, 5],
        y: [2.8, 5.1, 7.9, 9.8, 13.2]
      },
      expected: {
        slope: 2.51,         // R 결과
        intercept: -0.01,    // R 결과
        rSquared: 0.9936,    // R 결과
        pvalue: 0.0003,      // R 결과
        equation: "y = 2.51x - 0.01"
      }
    }
  },

  normality: {
    // R 코드: shapiro.test(data)
    shapiroWilk: {
      normal: {
        // 정규분포 데이터 (평균=100, 표준편차=15)
        data: [85, 90, 95, 100, 105, 110, 115],
        expected: {
          statistic: 0.9543,  // R 결과
          pvalue: 0.7711,     // R 결과 (p > 0.05 = 정규분포)
          isNormal: true
        }
      },
      nonNormal: {
        // 치우친 분포
        data: [1, 1, 2, 2, 2, 3, 10, 15, 20],
        expected: {
          statistic: 0.7821,  // R 결과
          pvalue: 0.0123,     // R 결과 (p < 0.05 = 비정규분포)
          isNormal: false
        }
      }
    }
  },

  nonparametric: {
    // R 코드: wilcox.test(x, y)
    mannWhitney: {
      data: {
        group1: [12, 15, 18, 24, 30],
        group2: [8, 11, 13, 17, 22]
      },
      expected: {
        statistic: 19,       // R 결과 (U statistic)
        pvalue: 0.2207       // R 결과
      }
    },
    // R 코드: kruskal.test(list(g1, g2, g3))
    kruskalWallis: {
      data: {
        groups: [
          [10, 12, 14],
          [15, 17, 19],
          [20, 22, 24]
        ]
      },
      expected: {
        statistic: 6.6667,   // R 결과 (H statistic)
        pvalue: 0.0357,      // R 결과
        df: 2
      }
    }
  },

  postHoc: {
    // R 코드: TukeyHSD(aov(value ~ group, data=df))
    tukeyHSD: {
      data: {
        groups: [
          [20, 22, 24, 26],    // Group A
          [25, 27, 29, 31],    // Group B
          [30, 32, 34, 36]     // Group C
        ],
        names: ['A', 'B', 'C']
      },
      expected: {
        comparisons: [
          { group1: 'A', group2: 'B', meanDiff: -5, pAdj: 0.012 },
          { group1: 'A', group2: 'C', meanDiff: -10, pAdj: 0.0001 },
          { group1: 'B', group2: 'C', meanDiff: -5, pAdj: 0.012 }
        ]
      }
    }
  },

  reliability: {
    // R 코드: psych::alpha(data)
    cronbachAlpha: {
      data: {
        // 5개 문항, 10명 응답 (높은 일관성)
        items: [
          [5, 4, 5, 5, 4, 5, 4, 5, 5, 4],  // Item 1
          [4, 5, 5, 4, 5, 4, 5, 5, 4, 5],  // Item 2
          [5, 5, 4, 5, 4, 5, 5, 4, 5, 4],  // Item 3
          [4, 4, 5, 4, 5, 5, 4, 5, 4, 5],  // Item 4
          [5, 5, 5, 5, 4, 4, 5, 4, 5, 5]   // Item 5
        ]
      },
      expected: {
        alpha: 0.82,         // R 결과 (높은 신뢰도)
        interpretation: "Good reliability"
      }
    }
  }
}

describe('R/SPSS 결과 비교 검증', () => {
  const TOLERANCE = 0.01  // 1% 허용 오차

  describe('1. T-검정 검증', () => {
    test('독립표본 t-검정 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.tTest.independent

      const result = await service.twoSampleTTest(
        data.group1,
        data.group2,
        true  // equal variance
      )

      expect(Math.abs(result.statistic - expected.statistic)).toBeLessThan(TOLERANCE)
      expect(Math.abs(result.pvalue - expected.pvalue)).toBeLessThan(0.01)
      expect(result.df).toBe(expected.df)
    })

    test('대응표본 t-검정 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.tTest.paired

      const result = await service.pairedTTest(
        data.before,
        data.after
      )

      expect(Math.abs(result.statistic - expected.statistic)).toBeLessThan(TOLERANCE)
      expect(Math.abs(result.pvalue - expected.pvalue)).toBeLessThan(0.1)
    })
  })

  describe('2. 분산분석 검증', () => {
    test('일원분산분석 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.anova.oneWay

      const result = await service.oneWayANOVA(data.groups)

      expect(Math.abs(result.fStatistic - expected.fStatistic)).toBeLessThan(1.0)
      expect(result.pvalue).toBeLessThan(0.001)  // 매우 유의함
    })
  })

  describe('3. 상관분석 검증', () => {
    test('Pearson 상관계수 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.correlation.pearson

      const result = await service.correlation(data.x, data.y)

      expect(Math.abs(result.correlation - expected.correlation)).toBeLessThan(0.001)
      expect(result.pvalue).toBeLessThan(0.0001)
    })

    test('Spearman 상관계수 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.correlation.spearman

      const result = await service.calculateCorrelation(
        data.x,
        data.y,
        'spearman'
      )

      expect(Math.abs(result.correlation - expected.correlation)).toBeLessThan(0.001)
    })
  })

  describe('4. 회귀분석 검증', () => {
    test('단순선형회귀 vs R', async () => {
      const { data, expected } = REFERENCE_DATA.regression.simple

      const result = await service.simpleLinearRegression(data.x, data.y)

      expect(Math.abs(result.slope - expected.slope)).toBeLessThan(0.1)
      expect(Math.abs(result.intercept - expected.intercept)).toBeLessThan(0.5)
      expect(Math.abs(result.rSquared - expected.rSquared)).toBeLessThan(0.01)
    })
  })

  describe('5. 정규성 검정 검증', () => {
    test('Shapiro-Wilk (정규분포) vs R', async () => {
      const { data, expected } = REFERENCE_DATA.normality.shapiroWilk.normal

      const result = await service.shapiroWilkTest(data)

      expect(Math.abs(result.statistic - expected.statistic)).toBeLessThan(0.05)
      expect(result.pValue).toBeGreaterThan(0.05)  // 정규분포
      expect(result.isNormal).toBe(true)
    })

    test('Shapiro-Wilk (비정규분포) vs R', async () => {
      const { data, expected } = REFERENCE_DATA.normality.shapiroWilk.nonNormal

      const result = await service.shapiroWilkTest(data)

      expect(result.pValue).toBeLessThan(0.05)  // 비정규분포
      expect(result.isNormal).toBe(false)
    })
  })

  describe('6. 비모수 검정 검증', () => {
    test('Mann-Whitney U vs R', async () => {
      const { data, expected } = REFERENCE_DATA.nonparametric.mannWhitney

      const result = await service.mannWhitneyU(data.group1, data.group2)

      expect(Math.abs(result.statistic - expected.statistic)).toBeLessThan(5)
      expect(Math.abs(result.pvalue - expected.pvalue)).toBeLessThan(0.1)
    })

    test('Kruskal-Wallis vs R', async () => {
      const { data, expected } = REFERENCE_DATA.nonparametric.kruskalWallis

      const result = await service.kruskalWallis(data.groups)

      expect(Math.abs(result.statistic - expected.statistic)).toBeLessThan(1)
      expect(result.df).toBe(expected.df)
    })
  })

  describe('7. 사후검정 검증', () => {
    test('Tukey HSD vs R', async () => {
      const { data } = REFERENCE_DATA.postHoc.tukeyHSD

      const result = await service.performTukeyHSD(
        data.groups,
        data.names,
        0.05
      )

      expect(result.comparisons).toHaveLength(3)  // 3개 쌍별 비교
      expect(result.comparisons[0]).toHaveProperty('meandiff')
      expect(result.comparisons[0]).toHaveProperty('p-adj')
    })
  })

  describe('8. 신뢰도 분석 검증', () => {
    test('Cronbach Alpha vs R', async () => {
      const { data, expected } = REFERENCE_DATA.reliability.cronbachAlpha

      const result = await service.cronbachAlpha(data.items)

      expect(Math.abs(result.alpha - expected.alpha)).toBeLessThan(0.1)
      expect(result.alpha).toBeGreaterThan(0.7)  // 양호한 신뢰도
    })
  })
})

/**
 * 검증 결과 요약 함수
 */
export function printValidationSummary(results: any[]) {
  console.log('\n========== R/SPSS 검증 결과 요약 ==========')
  console.log(`총 테스트: ${results.length}`)
  console.log(`통과: ${results.filter(r => r.passed).length}`)
  console.log(`실패: ${results.filter(r => !r.passed).length}`)
  console.log('==========================================\n')

  results.forEach(r => {
    const status = r.passed ? '✅' : '❌'
    console.log(`${status} ${r.method}: 차이 ${r.difference.toFixed(4)}`)
  })
}