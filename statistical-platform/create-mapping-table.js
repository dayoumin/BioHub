#!/usr/bin/env node
/**
 * 수동 매핑 테이블 생성
 * Registry ID → pyodide-statistics.ts → Python Worker 정확한 매핑
 */

const fs = require('fs');
const path = require('path');

// 수동으로 확인한 매핑 (어제 작업 기준)
const KNOWN_MAPPINGS = {
  // Descriptive (10개)
  'descriptive': { pyodide: 'descriptiveStats', python: 'descriptive_stats', worker: 1 },
  'normality': { pyodide: 'normalityTest', python: 'normality_test', worker: 1 },
  'outliers': { pyodide: 'outlierDetection', python: 'outlier_detection', worker: 1 },
  'frequency': { pyodide: 'frequencyAnalysis', python: 'frequency_analysis', worker: 1 },
  'crosstab': { pyodide: 'crosstabAnalysis', python: 'crosstab_analysis', worker: 1 },
  'proportionTest': { pyodide: 'oneSampleProportionTest', python: 'one_sample_proportion_test', worker: 1 },
  'reliability': { pyodide: 'cronbachAlpha', python: 'cronbach_alpha', worker: 1 },

  // Hypothesis (8개)
  'tTest': { pyodide: ['tTestOneSample', 'tTestTwoSample', 'tTestPaired'], python: ['t_test_one_sample', 't_test_two_sample', 't_test_paired'], worker: 2 },
  'correlation': { pyodide: 'correlationTest', python: 'correlation_test', worker: 2 },
  'chiSquare': { pyodide: ['chiSquareGoodnessTest', 'chiSquareIndependenceTest'], python: ['chi_square_goodness_test', 'chi_square_independence_test'], worker: 2 },
  'zTest': { pyodide: 'zTestWorker', python: 'z_test', worker: 2 },
  'binomialTest': { pyodide: 'binomialTestWorker', python: 'binomial_test', worker: 2 },
  'partialCorrelation': { pyodide: 'partialCorrelationWorker', python: 'partial_correlation', worker: 2 },

  // Nonparametric (9개)
  'mannWhitney': { pyodide: 'mannWhitneyTestWorker', python: 'mann_whitney_test', worker: 3 },
  'wilcoxon': { pyodide: 'wilcoxonTestWorker', python: 'wilcoxon_test', worker: 3 },
  'kruskalWallis': { pyodide: 'kruskalWallisTestWorker', python: 'kruskal_wallis_test', worker: 3 },
  'friedman': { pyodide: 'friedmanTestWorker', python: 'friedman_test', worker: 3 },
  'signTest': { pyodide: 'signTestWorker', python: 'sign_test', worker: 3 },
  'runsTest': { pyodide: 'runsTestWorker', python: 'runs_test', worker: 3 },
  'mcNemar': { pyodide: 'mcnemarTestWorker', python: 'mcnemar_test', worker: 3 },
  'cochranQ': { pyodide: 'cochranQTestWorker', python: 'cochran_q_test', worker: 3 },
  'moodMedian': { pyodide: 'moodMedianTestWorker', python: 'mood_median_test', worker: 3 },

  // ANOVA (9개)
  'oneWayAnova': { pyodide: 'oneWayANOVA', python: 'one_way_anova', worker: 3 },
  'twoWayAnova': { pyodide: 'twoWayANOVA', python: 'two_way_anova', worker: 3 },
  'repeatedMeasures': { pyodide: 'repeatedMeasuresAnovaWorker', python: 'repeated_measures_anova', worker: 3 },
  'ancova': { pyodide: 'ancovaWorker', python: 'ancova', worker: 3 },
  'manova': { pyodide: 'manovaWorker', python: 'manova', worker: 3 },
  'tukeyHSD': { pyodide: 'performTukeyHSD', python: 'tukey_hsd', worker: 3 },
  'scheffeTest': { pyodide: 'scheffeTestWorker', python: 'scheffe_test', worker: 3 },
  'gamesHowell': { pyodide: 'gamesHowellTest', python: 'games_howell_test', worker: 3 },

  // Regression (12개)
  'regression': { pyodide: 'simpleLinearRegression', python: 'linear_regression', worker: 4 },
  'multipleRegression': { pyodide: 'multipleRegression', python: 'multiple_regression', worker: 4 },
  'logisticRegression': { pyodide: 'logisticRegression', python: 'logistic_regression', worker: 4 },
  'binaryLogistic': { pyodide: null, python: 'binary_logistic', worker: 4 },
  'multinomialLogistic': { pyodide: null, python: 'multinomial_logistic', worker: 4 },
  'ordinalLogistic': { pyodide: null, python: 'ordinal_logistic', worker: 4 },
  'probitRegression': { pyodide: null, python: 'probit_regression', worker: 4 },
  'poissonRegression': { pyodide: null, python: 'poisson_regression', worker: 4 },
  'curveEstimation': { pyodide: null, python: 'curve_estimation', worker: 4 },
  'nonlinearRegression': { pyodide: null, python: 'nonlinear_regression', worker: 4 },
  'stepwiseRegression': { pyodide: null, python: 'stepwise_regression', worker: 4 },

  // Advanced (12개)
  'pca': { pyodide: 'performPCA', python: 'pca_analysis', worker: 4 },
  'factorAnalysis': { pyodide: 'factorAnalysis', python: 'factor_analysis', worker: 4 },
  'clusterAnalysis': { pyodide: 'clusterAnalysis', python: 'cluster_analysis', worker: 4 },
  'timeSeries': { pyodide: 'timeSeriesAnalysis', python: 'time_series_analysis', worker: 4 },
};

function generateMappingReport() {
  console.log('='.repeat(100));
  console.log('Phase 5-2: Detailed Mapping Table');
  console.log('='.repeat(100));
  console.log();

  let fullyImplemented = 0;
  let needsPyodideWrapper = 0;
  let needsPython = 0;
  let completelyMissing = 0;

  const groups = {
    'Descriptive': ['descriptive', 'normality', 'outliers', 'frequency', 'crosstab', 'proportionTest', 'reliability', 'mean', 'median', 'mode'],
    'Hypothesis': ['tTest', 'correlation', 'chiSquare', 'zTest', 'binomialTest', 'partialCorrelation', 'oneSampleTTest', 'pairedTTest'],
    'Nonparametric': ['mannWhitney', 'wilcoxon', 'kruskalWallis', 'friedman', 'signTest', 'runsTest', 'mcNemar', 'cochranQ', 'moodMedian'],
    'ANOVA': ['oneWayAnova', 'twoWayAnova', 'repeatedMeasures', 'ancova', 'manova', 'tukeyHSD', 'scheffeTest', 'bonferroni', 'gamesHowell'],
    'Regression': ['regression', 'multipleRegression', 'logisticRegression', 'binaryLogistic', 'multinomialLogistic', 'ordinalLogistic', 'probitRegression', 'poissonRegression', 'negativeBinomial', 'curveEstimation', 'nonlinearRegression', 'stepwiseRegression'],
    'Advanced': ['pca', 'factorAnalysis', 'clusterAnalysis', 'discriminantAnalysis', 'timeSeries', 'survivalAnalysis', 'sem', 'canonicalCorrelation', 'mediation', 'moderation', 'multilevelModel', 'metaAnalysis']
  };

  Object.entries(groups).forEach(([groupName, methods]) => {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`${groupName} (${methods.length} methods)`);
    console.log('='.repeat(100));
    console.log();
    console.log('Registry ID'.padEnd(25) + 'pyodide-statistics'.padEnd(35) + 'Python Worker'.padEnd(30) + 'Status');
    console.log('-'.repeat(100));

    methods.forEach(method => {
      const mapping = KNOWN_MAPPINGS[method];

      if (!mapping) {
        console.log(`${method.padEnd(25)}${'❌ Not mapped'.padEnd(35)}${'❌ Not mapped'.padEnd(30)}⚠️  Unknown`);
        completelyMissing++;
        return;
      }

      const pyodide = Array.isArray(mapping.pyodide) ? mapping.pyodide.join(', ') : (mapping.pyodide || '❌ Missing');
      const python = Array.isArray(mapping.python) ? mapping.python.join(', ') : (mapping.python || '❌ Missing');

      let status = '';
      if (mapping.pyodide && mapping.python) {
        status = '✅ Complete';
        fullyImplemented++;
      } else if (!mapping.pyodide && mapping.python) {
        status = '⚠️  Need TS wrapper';
        needsPyodideWrapper++;
      } else if (mapping.pyodide && !mapping.python) {
        status = '⚠️  Need Python';
        needsPython++;
      } else {
        status = '❌ Missing both';
        completelyMissing++;
      }

      console.log(`${method.padEnd(25)}${String(pyodide).padEnd(35)}${String(python).padEnd(30)}${status}`);
    });
  });

  console.log();
  console.log('='.repeat(100));
  console.log('Summary Statistics');
  console.log('='.repeat(100));
  console.log(`✅ Fully Implemented:     ${fullyImplemented}`);
  console.log(`⚠️  Need TypeScript wrapper: ${needsPyodideWrapper}`);
  console.log(`⚠️  Need Python impl:       ${needsPython}`);
  console.log(`❌ Completely Missing:    ${completelyMissing}`);
  console.log(`📊 Total:                 ${fullyImplemented + needsPyodideWrapper + needsPython + completelyMissing}`);
  console.log();

  const coveragePercent = Math.round((fullyImplemented / (fullyImplemented + needsPyodideWrapper + needsPython + completelyMissing)) * 100);
  console.log(`📈 Coverage: ${coveragePercent}%`);
  console.log('='.repeat(100));
}

generateMappingReport();