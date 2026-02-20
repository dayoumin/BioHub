/**
 * Python Worker Calculation Accuracy Test
 *
 * Phase 2.5: Python Worker 실제 계산 정확도 검증
 *
 * 목적:
 * - 다양한 Python 라이브러리로 사전 계산한 골든 값 스키마 검증
 * - 통계 계산의 수치적 정확성 보장
 *
 * 지원 라이브러리:
 * - SciPy 1.14.1: 기본 통계 검정
 * - statsmodels 0.14.1: 회귀, 시계열, ANOVA
 * - pingouin 0.5.4: 효과 크기, ANCOVA, RM-ANOVA
 * - sklearn 1.4.0: PCA, 군집분석, 판별분석
 * - lifelines 0.28.0: 생존분석
 *
 * 실제 Pyodide 테스트는 Node.js 스크립트로 실행:
 * npm run test:pyodide-golden
 *
 * @see statistical-golden-values.json - 골든 값 정의
 */

import * as fs from 'fs';
import * as path from 'path';

// 골든 값 로드
const goldenValuesPath = path.join(__dirname, 'statistical-golden-values.json');
const goldenValues = JSON.parse(fs.readFileSync(goldenValuesPath, 'utf-8'));

describe('Golden Values Schema Validation', () => {
  it('should have valid schema structure', () => {
    expect(goldenValues).toHaveProperty('$schema');
    expect(goldenValues).toHaveProperty('description');
    expect(goldenValues).toHaveProperty('lastUpdated');
    expect(goldenValues).toHaveProperty('verificationSources');
  });

  it('should have multiple verification sources', () => {
    const sources = goldenValues.verificationSources;
    expect(sources).toHaveProperty('scipy');
    expect(sources).toHaveProperty('statsmodels');
    expect(sources).toHaveProperty('pingouin');
    expect(sources).toHaveProperty('sklearn');
    expect(sources).toHaveProperty('lifelines');
  });

  it('should contain all required test categories (SciPy)', () => {
    const scipyCategories = [
      'tTest',
      'anova',
      'correlation',
      'chiSquare',
      'nonParametric',
      'regression',
      'normalityTest',
      'binomialTest',
      'signTest',
      'friedmanTest',
      'leveneTest',
      'bartlettTest',
      'descriptive'
    ];

    scipyCategories.forEach(category => {
      expect(goldenValues).toHaveProperty(category);
    });
  });

  it('should contain advanced test categories (statsmodels/pingouin)', () => {
    const advancedCategories = [
      'anovaAdvanced',
      'regressionAdvanced',
      'timeSeries',
      'powerAnalysis'
    ];

    advancedCategories.forEach(category => {
      expect(goldenValues).toHaveProperty(category);
    });
  });

  it('should contain multivariate/survival categories (sklearn/lifelines)', () => {
    const mlCategories = [
      'survival',
      'multivariate',
      'effectSize'
    ];

    mlCategories.forEach(category => {
      expect(goldenValues).toHaveProperty(category);
    });
  });
});

describe('T-Test Golden Values', () => {
  describe('One-Sample T-Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.tTest.oneSample;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc).toHaveProperty('name');
        expect(tc).toHaveProperty('input');
        expect(tc).toHaveProperty('expected');
        expect(tc).toHaveProperty('tolerance');
        expect(tc.input).toHaveProperty('data');
        expect(tc.input).toHaveProperty('popmean');
        expect(Array.isArray(tc.input.data)).toBe(true);
      }
    });
  });

  describe('Two-Sample T-Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.tTest.twoSample;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('group1');
        expect(tc.input).toHaveProperty('group2');
        expect(Array.isArray(tc.input.group1)).toBe(true);
        expect(Array.isArray(tc.input.group2)).toBe(true);
      }
    });
  });

  describe('Paired T-Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.tTest.paired;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('before');
        expect(tc.input).toHaveProperty('after');
        expect(tc.input.before.length).toBe(tc.input.after.length);
      }
    });
  });
});

describe('ANOVA Golden Values', () => {
  it('should have valid one-way ANOVA test cases', () => {
    const testCases = goldenValues.anova.oneWay;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('groups');
      expect(Array.isArray(tc.input.groups)).toBe(true);
      expect(tc.input.groups.length).toBeGreaterThanOrEqual(2);
      expect(tc.expected).toHaveProperty('fStatistic');
      expect(tc.expected).toHaveProperty('pValue');
    }
  });
});

describe('Correlation Golden Values', () => {
  it('should have valid Pearson correlation test cases', () => {
    const testCases = goldenValues.correlation.pearson;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('x');
      expect(tc.input).toHaveProperty('y');
      expect(tc.input.x.length).toBe(tc.input.y.length);
      expect(tc.expected).toHaveProperty('r');
      expect(tc.expected.r).toBeGreaterThanOrEqual(-1);
      expect(tc.expected.r).toBeLessThanOrEqual(1);
    }
  });
});

describe('Chi-Square Golden Values', () => {
  it('should have valid independence test cases', () => {
    const testCases = goldenValues.chiSquare.independence;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('observed');
      expect(Array.isArray(tc.input.observed)).toBe(true);
      expect(tc.expected.statistic).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have valid goodness of fit test cases', () => {
    const testCases = goldenValues.chiSquare.goodness;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('observed');
      expect(tc.input).toHaveProperty('expected');
      expect(tc.input.observed.length).toBe(tc.input.expected.length);
    }
  });
});

describe('Non-Parametric Golden Values', () => {
  it('should have valid Mann-Whitney test cases', () => {
    const testCases = goldenValues.nonParametric.mannWhitney;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('group1');
      expect(tc.input).toHaveProperty('group2');
    }
  });

  it('should have valid Wilcoxon test cases', () => {
    const testCases = goldenValues.nonParametric.wilcoxon;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('before');
      expect(tc.input).toHaveProperty('after');
      expect(tc.input.before.length).toBe(tc.input.after.length);
    }
  });

  it('should have valid Kruskal-Wallis test cases', () => {
    const testCases = goldenValues.nonParametric.kruskalWallis;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('groups');
      expect(tc.input.groups.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Regression Golden Values', () => {
  it('should have valid linear regression test cases', () => {
    const testCases = goldenValues.regression.linear;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('x');
      expect(tc.input).toHaveProperty('y');
      expect(tc.input.x.length).toBe(tc.input.y.length);
      expect(tc.expected).toHaveProperty('slope');
      expect(tc.expected).toHaveProperty('intercept');
      expect(tc.expected).toHaveProperty('rSquared');
      expect(tc.expected.rSquared).toBeGreaterThanOrEqual(0);
      expect(tc.expected.rSquared).toBeLessThanOrEqual(1);
    }
  });
});

describe('Normality Test Golden Values', () => {
  it('should have valid Shapiro-Wilk test cases', () => {
    const testCases = goldenValues.normalityTest.shapiroWilk;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('data');
      expect(tc.input.data.length).toBeGreaterThanOrEqual(3);
      expect(tc.expected.statistic).toBeGreaterThan(0);
      expect(tc.expected.statistic).toBeLessThanOrEqual(1);
    }
  });
});

describe('Binomial Test Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.binomialTest;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('successes');
      expect(tc.input).toHaveProperty('trials');
      expect(tc.input).toHaveProperty('probability');
      expect(tc.input.successes).toBeLessThanOrEqual(tc.input.trials);
      expect(tc.input.probability).toBeGreaterThan(0);
      expect(tc.input.probability).toBeLessThan(1);
    }
  });
});

describe('Sign Test Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.signTest;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('before');
      expect(tc.input).toHaveProperty('after');
      expect(tc.input.before.length).toBe(tc.input.after.length);
    }
  });
});

describe('Friedman Test Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.friedmanTest;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('groups');
      expect(tc.input.groups.length).toBeGreaterThanOrEqual(2);

      // 모든 그룹이 같은 길이인지 확인 (반복 측정)
      const firstGroupLen = tc.input.groups[0].length;
      for (const group of tc.input.groups) {
        expect(group.length).toBe(firstGroupLen);
      }
    }
  });
});

// ============================================
// Advanced ANOVA (statsmodels, pingouin)
// ============================================
describe('Advanced ANOVA Golden Values', () => {
  describe('Repeated Measures ANOVA', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.anovaAdvanced.repeatedMeasures;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc).toHaveProperty('library');
        expect(tc.library).toBe('pingouin');
        expect(tc.expected).toHaveProperty('fStatistic');
        expect(tc.expected).toHaveProperty('pValue');
      }
    });
  });

  describe('ANCOVA', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.anovaAdvanced.ancova;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('dependent');
        expect(tc.input).toHaveProperty('group');
        expect(tc.input).toHaveProperty('covariate');
      }
    });
  });

  describe('MANOVA', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.anovaAdvanced.manova;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.expected).toHaveProperty('wilksLambda');
        expect(tc.expected.wilksLambda).toBeGreaterThan(0);
        expect(tc.expected.wilksLambda).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Mixed Model', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.anovaAdvanced.mixedModel;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('dependent');
        expect(tc.input).toHaveProperty('fixed');
        expect(tc.input).toHaveProperty('random');
      }
    });
  });
});

// ============================================
// Advanced Regression (statsmodels)
// ============================================
describe('Advanced Regression Golden Values', () => {
  describe('Logistic Regression', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.regressionAdvanced.logistic;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('x');
        expect(tc.input).toHaveProperty('y');
        // Binary outcome check
        for (const y of tc.input.y) {
          expect([0, 1]).toContain(y);
        }
      }
    });
  });

  describe('Poisson Regression', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.regressionAdvanced.poisson;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('x');
        expect(tc.input).toHaveProperty('counts');
        // Count data check
        for (const count of tc.input.counts) {
          expect(count).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(count)).toBe(true);
        }
      }
    });
  });

  describe('Ordinal Regression', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.regressionAdvanced.ordinal;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('x');
        expect(tc.input).toHaveProperty('y');
        expect(tc.expected).toHaveProperty('thresholds');
      }
    });
  });
});

// ============================================
// Time Series (statsmodels)
// ============================================
describe('Time Series Golden Values', () => {
  describe('ARIMA', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.timeSeries.arima;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.input).toHaveProperty('order');
        expect(tc.input.order.length).toBe(3); // (p, d, q)
        expect(tc.expected).toHaveProperty('forecast');
      }
    });
  });

  describe('Seasonal Decomposition', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.timeSeries.seasonalDecompose;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.input).toHaveProperty('period');
        expect(tc.expected).toHaveProperty('seasonalPattern');
      }
    });
  });

  describe('Stationarity Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.timeSeries.stationarity;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.expected).toHaveProperty('adfStatistic');
        expect(tc.expected).toHaveProperty('isStationary');
      }
    });
  });

  describe('Mann-Kendall Trend Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.timeSeries.mannKendall;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.expected).toHaveProperty('tau');
        expect(tc.expected).toHaveProperty('trend');
      }
    });
  });
});

// ============================================
// Survival Analysis (lifelines)
// ============================================
describe('Survival Analysis Golden Values', () => {
  describe('Kaplan-Meier', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.survival.kaplanMeier;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('times');
        expect(tc.input).toHaveProperty('events');
        expect(tc.input.times.length).toBe(tc.input.events.length);
        expect(tc.library).toBe('lifelines');
      }
    });
  });

  describe('Log-Rank Test', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.survival.logRank;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('times1');
        expect(tc.input).toHaveProperty('times2');
        expect(tc.input).toHaveProperty('events1');
        expect(tc.input).toHaveProperty('events2');
      }
    });
  });

  describe('Cox Regression', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.survival.coxRegression;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('times');
        expect(tc.input).toHaveProperty('events');
        expect(tc.expected).toHaveProperty('concordance');
      }
    });
  });
});

// ============================================
// Multivariate Analysis (sklearn)
// ============================================
describe('Multivariate Analysis Golden Values', () => {
  describe('PCA', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.multivariate.pca;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(Array.isArray(tc.input.data)).toBe(true);
        expect(tc.expected).toHaveProperty('explainedVarianceRatio');
        expect(tc.library).toBe('sklearn');
      }
    });
  });

  describe('Factor Analysis', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.multivariate.factorAnalysis;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.input).toHaveProperty('nFactors');
        expect(tc.expected).toHaveProperty('loadings');
      }
    });
  });

  describe('Cluster Analysis', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.multivariate.cluster;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('data');
        expect(tc.library).toBe('sklearn');
      }
    });
  });

  describe('Discriminant Analysis', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.multivariate.discriminant;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('features');
        expect(tc.input).toHaveProperty('labels');
        expect(tc.input.features.length).toBe(tc.input.labels.length);
      }
    });
  });
});

// ============================================
// Effect Size (pingouin)
// ============================================
describe('Effect Size Golden Values', () => {
  describe("Cohen's d", () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.effectSize.cohensD;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.input).toHaveProperty('group1');
        expect(tc.input).toHaveProperty('group2');
        expect(tc.expected).toHaveProperty('cohensD');
        expect(tc.expected).toHaveProperty('interpretation');
      }
    });
  });

  describe("Hedges' g", () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.effectSize.hedgesG;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.expected).toHaveProperty('hedgesG');
      }
    });
  });

  describe('Eta Squared', () => {
    it('should have valid test cases', () => {
      const testCases = goldenValues.effectSize.etaSquared;
      expect(testCases.length).toBeGreaterThan(0);

      for (const tc of testCases) {
        expect(tc.expected).toHaveProperty('etaSquared');
        expect(tc.expected.etaSquared).toBeGreaterThanOrEqual(0);
        expect(tc.expected.etaSquared).toBeLessThanOrEqual(1);
      }
    });
  });
});

// ============================================
// Additional Tests
// ============================================
describe('Partial Correlation Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.partialCorrelation;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('x');
      expect(tc.input).toHaveProperty('y');
      expect(tc.input).toHaveProperty('covariate');
      expect(tc.expected).toHaveProperty('r');
    }
  });
});

describe('Dose-Response Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.doseResponse;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('doses');
      expect(tc.input).toHaveProperty('responses');
      expect(tc.expected).toHaveProperty('ec50');
    }
  });
});

describe('Response Surface Golden Values', () => {
  it('should have valid test cases', () => {
    const testCases = goldenValues.responseSurface;
    expect(testCases.length).toBeGreaterThan(0);

    for (const tc of testCases) {
      expect(tc.input).toHaveProperty('x1');
      expect(tc.input).toHaveProperty('x2');
      expect(tc.input).toHaveProperty('y');
      expect(tc.expected).toHaveProperty('optimalX1');
      expect(tc.expected).toHaveProperty('optimalX2');
    }
  });
});
