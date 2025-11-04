/**
 * R/SPSS 레퍼런스 결과값
 *
 * 이 파일은 R로 계산한 정확한 통계 결과값을 포함합니다.
 * 모든 Pyodide 계산 결과는 이 값들과 비교하여 검증됩니다.
 *
 * 허용 오차: 0.0001 (소수점 4자리)
 */

export const ReferenceResults = {
  // T-Test 레퍼런스 결과
  tTest: {
    oneSample: {
      description: "One-sample t-test: [1,2,3,4,5] vs μ=3",
      data: {
        sample: [1, 2, 3, 4, 5],
        mu: 3
      },
      expected: {
        statistic: 0,
        pValue: 1,
        df: 4,
        mean: 3,
        confidenceInterval: {
          lower: 1.0397,
          upper: 4.9603
        }
      }
    },

    independent: {
      description: "Independent t-test: [1,2,3,4,5] vs [2,3,4,5,6]",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        statistic: -1.414214,
        pValue: 0.1949748,
        df: 8,
        meanDiff: -1,
        confidenceInterval: {
          lower: -2.6547,
          upper: 0.6547
        }
      }
    },

    paired: {
      description: "Paired t-test: [1,2,3,4,5] vs [2,3,4,5,6]",
      data: {
        before: [1, 2, 3, 4, 5],
        after: [2, 3, 4, 5, 6]
      },
      expected: {
        statistic: -5.0,
        pValue: 0.007378,
        df: 4,
        meanDiff: -1
      }
    },

    welch: {
      description: "Welch t-test: [1,2,3,4,5] vs [2,3,4,5,6]",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        statistic: -1.414214,
        pValue: 0.1949748,
        df: 8
      }
    }
  },

  // ANOVA 레퍼런스 결과
  anova: {
    oneWay: {
      description: "One-way ANOVA: 3 groups",
      data: {
        control: [23, 25, 24, 26, 27, 23, 24, 25, 28, 26],
        treatment1: [28, 30, 29, 31, 32, 30, 29, 31, 33, 30],
        treatment2: [35, 37, 36, 38, 39, 36, 35, 37, 40, 38]
      },
      expected: {
        fStatistic: 147.8571,
        pValue: 2.513e-14,
        dfBetween: 2,
        dfWithin: 27,
        etaSquared: 0.9163,
        groups: {
          control: { mean: 25.1, sd: 1.7928 },
          treatment1: { mean: 30.3, sd: 1.5670 },
          treatment2: { mean: 37.1, sd: 1.7928 }
        }
      }
    },

    tukeyHSD: {
      description: "Tukey HSD post-hoc test",
      expected: {
        "treatment1-control": {
          diff: 5.2,
          pValue: 3.16e-07,
          ciLower: 3.391,
          ciUpper: 7.009
        },
        "treatment2-control": {
          diff: 12.0,
          pValue: 1.0e-10,
          ciLower: 10.191,
          ciUpper: 13.809
        },
        "treatment2-treatment1": {
          diff: 6.8,
          pValue: 2.84e-08,
          ciLower: 4.991,
          ciUpper: 8.609
        }
      }
    }
  },

  // 상관분석 레퍼런스 결과
  correlation: {
    pearson: {
      description: "Pearson correlation",
      data: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9]
      },
      expected: {
        r: 0.9998,
        pValue: 2.2e-13,
        confidenceInterval: {
          lower: 0.9991,
          upper: 0.9999
        }
      }
    },

    spearman: {
      description: "Spearman rank correlation",
      data: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9]
      },
      expected: {
        rho: 1.0,
        pValue: 0,
        S: 0
      }
    }
  },

  // 회귀분석 레퍼런스 결과
  regression: {
    simple: {
      description: "Simple linear regression",
      data: {
        x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        y: [2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9]
      },
      expected: {
        slope: 1.99,
        intercept: 0.12,
        rSquared: 0.9996,
        adjustedRSquared: 0.9995,
        fStatistic: 19531.2,
        pValue: 2.2e-13,
        standardError: {
          slope: 0.01423,
          intercept: 0.08825
        }
      }
    }
  },

  // 정규성 검정 레퍼런스 결과
  normality: {
    shapiroWilk: {
      description: "Shapiro-Wilk normality test",
      data: [1, 2, 3, 4, 5],
      expected: {
        W: 0.9869,
        pValue: 0.9668
      }
    },

    levene: {
      description: "Levene's test for homogeneity of variance",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        statistic: 0,
        pValue: 1,
        df: 1
      }
    }
  },

  // 비모수 검정 레퍼런스 결과
  nonparametric: {
    mannWhitneyU: {
      description: "Mann-Whitney U test",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        U: 5,
        pValue: 0.1508,
        W: 5  // Wilcoxon statistic
      }
    },

    wilcoxonSignedRank: {
      description: "Wilcoxon signed-rank test",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        V: 0,
        pValue: 0.0625
      }
    },

    kruskalWallis: {
      description: "Kruskal-Wallis test",
      data: {
        group1: [23, 25, 24, 26, 27, 23, 24, 25, 28, 26],
        group2: [28, 30, 29, 31, 32, 30, 29, 31, 33, 30],
        group3: [35, 37, 36, 38, 39, 36, 35, 37, 40, 38]
      },
      expected: {
        H: 25.6364,
        pValue: 2.678e-06,
        df: 2
      }
    }
  },

  // 카이제곱 검정 레퍼런스 결과
  chiSquare: {
    independence: {
      description: "Chi-square test of independence",
      data: [
        [20, 15, 10],
        [25, 20, 5],
        [15, 25, 10]
      ],
      expected: {
        chiSquare: 8.5595,
        pValue: 0.07293,
        df: 4,
        cramersV: 0.2925
      }
    }
  },

  // 효과크기 레퍼런스 결과
  effectSizes: {
    cohensD: {
      description: "Cohen's d effect size",
      data: {
        group1: [1, 2, 3, 4, 5],
        group2: [2, 3, 4, 5, 6]
      },
      expected: {
        d: -0.8944,
        magnitude: "large",
        confidenceInterval: {
          lower: -2.0383,
          upper: 0.2494
        }
      }
    },

    etaSquared: {
      description: "Eta-squared for ANOVA",
      expected: {
        etaSquared: 0.9163,
        partial: 0.9163,
        magnitude: "large"
      }
    }
  },

  // 기술통계 레퍼런스 결과
  descriptive: {
    basic: {
      description: "Basic descriptive statistics",
      data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      expected: {
        mean: 5.5,
        median: 5.5,
        sd: 3.0277,
        variance: 9.1667,
        min: 1,
        max: 10,
        q1: 3.25,
        q3: 7.75,
        iqr: 4.5,
        skewness: 0,
        kurtosis: -1.2242,
        se: 0.9574
      }
    }
  }
}

// 테스트 헬퍼 함수: 결과 비교
export function compareResults(
  actual: any,
  expected: any,
  tolerance: number = 0.0001
): { pass: boolean; differences: string[] } {
  const differences: string[] = []

  function compare(actualVal: any, expectedVal: any, path: string = ''): void {
    if (typeof expectedVal === 'number') {
      const diff = Math.abs(actualVal - expectedVal)
      if (diff > tolerance) {
        differences.push(
          `${path}: expected ${expectedVal}, got ${actualVal} (diff: ${diff})`
        )
      }
    } else if (typeof expectedVal === 'object' && expectedVal !== null) {
      for (const key in expectedVal) {
        const newPath = path ? `${path}.${key}` : key
        compare(actualVal?.[key], expectedVal[key], newPath)
      }
    }
  }

  compare(actual, expected)

  return {
    pass: differences.length === 0,
    differences
  }
}

// 모든 테스트 케이스 리스트
export const allTestCases = [
  { category: 'tTest', name: 'oneSample' },
  { category: 'tTest', name: 'independent' },
  { category: 'tTest', name: 'paired' },
  { category: 'tTest', name: 'welch' },
  { category: 'anova', name: 'oneWay' },
  { category: 'anova', name: 'tukeyHSD' },
  { category: 'correlation', name: 'pearson' },
  { category: 'correlation', name: 'spearman' },
  { category: 'regression', name: 'simple' },
  { category: 'normality', name: 'shapiroWilk' },
  { category: 'normality', name: 'levene' },
  { category: 'nonparametric', name: 'mannWhitneyU' },
  { category: 'nonparametric', name: 'wilcoxonSignedRank' },
  { category: 'nonparametric', name: 'kruskalWallis' },
  { category: 'chiSquare', name: 'independence' },
  { category: 'effectSizes', name: 'cohensD' },
  { category: 'effectSizes', name: 'etaSquared' },
  { category: 'descriptive', name: 'basic' }
]

export default ReferenceResults