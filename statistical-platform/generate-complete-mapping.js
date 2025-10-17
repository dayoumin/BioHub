#!/usr/bin/env node
/**
 * 완전한 구현 매핑 생성
 * Python Worker 56개 → pyodide-statistics.ts 76개 → Registry 60개
 * 정확한 1:1 매핑 확인
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Python Worker 함수 목록 (실제 파일 기준)
// ============================================================================
const PYTHON_FUNCTIONS = {
  worker1: [
    'descriptive_stats',
    'normality_test',
    'outlier_detection',
    'frequency_analysis',
    'crosstab_analysis',
    'one_sample_proportion_test',
    'cronbach_alpha',
    'kolmogorov_smirnov_test'
  ],
  worker2: [
    't_test_two_sample',
    't_test_paired',
    't_test_one_sample',
    'z_test',
    'chi_square_test',
    'binomial_test',
    'correlation_test',
    'partial_correlation',
    'levene_test',
    'bartlett_test',
    'chi_square_goodness_test',
    'chi_square_independence_test'
  ],
  worker3: [
    'mann_whitney_test',
    'wilcoxon_test',
    'kruskal_wallis_test',
    'friedman_test',
    'one_way_anova',
    'two_way_anova',
    'tukey_hsd',
    'sign_test',
    'runs_test',
    'mcnemar_test',
    'cochran_q_test',
    'mood_median_test',
    'repeated_measures_anova',
    'ancova',
    'manova',
    'scheffe_test',
    'dunn_test',
    'games_howell_test'
  ],
  worker4: [
    'linear_regression',
    'multiple_regression',
    'logistic_regression',
    'pca_analysis',
    'curve_estimation',
    'nonlinear_regression',
    'stepwise_regression',
    'binary_logistic',
    'multinomial_logistic',
    'ordinal_logistic',
    'probit_regression',
    'poisson_regression',
    'negative_binomial_regression',
    'factor_analysis',
    'cluster_analysis',
    'time_series_analysis',
    'durbin_watson_test'
  ]
};

// ============================================================================
// pyodide-statistics.ts 메서드 목록 (실제 파일 기준)
// ============================================================================
const PYODIDE_METHODS = [
  'ancovaWorker', 'anova', 'bartlettTest', 'binomialTestWorker',
  'calculateCorrelation', 'calculateDescriptiveStatistics', 'calculateDescriptiveStats',
  'checkAllAssumptions', 'chiSquare', 'chiSquareGoodnessTest', 'chiSquareIndependenceTest',
  'chiSquareTest', 'chiSquareTestWorker', 'clusterAnalysis', 'cochranQTestWorker',
  'correlation', 'correlationTest', 'cronbachAlpha', 'cronbachAlphaWorker',
  'crosstabAnalysis', 'descriptiveStats', 'detectOutliersIQR', 'dunnTest',
  'factorAnalysis', 'frequencyAnalysis', 'friedman', 'friedmanTestWorker',
  'gamesHowellTest', 'kolmogorovSmirnovTest', 'kruskalWallis', 'kruskalWallisTestWorker',
  'leveneTest', 'logisticRegression', 'mannWhitneyTestWorker', 'mannWhitneyU',
  'manovaWorker', 'mcnemarTestWorker', 'moodMedianTestWorker', 'multipleRegression',
  'normalityTest', 'oneSampleProportionTest', 'oneSampleTTest', 'oneWayANOVA',
  'oneWayAnovaWorker', 'outlierDetection', 'pairedTTest', 'partialCorrelationWorker',
  'pca', 'performBonferroni', 'performPCA', 'performTukeyHSD',
  'regression', 'repeatedMeasuresAnova', 'repeatedMeasuresAnovaWorker', 'runsTestWorker',
  'scheffeTestWorker', 'shapiroWilkTest', 'signTestWorker', 'simpleLinearRegression',
  'testHomogeneity', 'testIndependence', 'testNormality', 'timeSeriesAnalysis',
  'tTest', 'tTestOneSample', 'tTestPaired', 'tTestTwoSample',
  'tukeyHSD', 'tukeyHSDWorker', 'twoSampleTTest', 'twoWayAnova',
  'twoWayANOVA', 'twoWayAnovaWorker', 'wilcoxon', 'wilcoxonTestWorker', 'zTestWorker'
];

// ============================================================================
// Python → TypeScript 자동 매핑
// ============================================================================
function pythonToTypeScript(pythonName) {
  // snake_case → camelCase
  return pythonName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// 역방향 검색 (TypeScript → Python)
// ============================================================================
function findPythonMatch(tsMethod) {
  const allPython = [];
  Object.values(PYTHON_FUNCTIONS).forEach(funcs => allPython.push(...funcs));

  // 가능한 패턴들
  const patterns = [
    tsMethod.toLowerCase().replace(/worker$/, ''),
    tsMethod.toLowerCase().replace(/test$/, ''),
    tsMethod.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
    tsMethod.replace(/Worker$/, '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
    tsMethod.replace(/Test$/, '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''),
  ];

  for (const pattern of patterns) {
    const match = allPython.find(py => py === pattern || py === pattern + '_test');
    if (match) return match;
  }

  return null;
}

// ============================================================================
// 완전한 매핑 생성
// ============================================================================
function generateCompleteMapping() {
  console.log('='.repeat(100));
  console.log('Complete Implementation Mapping');
  console.log('='.repeat(100));
  console.log();

  const mapping = {
    matched: [],
    pythonOnly: [],
    pyodideOnly: [],
    stats: {
      python: 0,
      pyodide: PYODIDE_METHODS.length,
      matched: 0
    }
  };

  // Python 기준으로 매핑
  Object.entries(PYTHON_FUNCTIONS).forEach(([workerName, functions]) => {
    mapping.stats.python += functions.length;

    functions.forEach(pyFunc => {
      // TypeScript 이름 추정
      const expectedTS = pythonToTypeScript(pyFunc);

      // 실제 TypeScript 메서드 찾기
      const tsMatch = PYODIDE_METHODS.find(ts => {
        const lower = ts.toLowerCase();
        const pyLower = pyFunc.replace(/_/g, '');
        return lower === pyLower ||
               lower === pyLower + 'worker' ||
               lower === expectedTS.toLowerCase() ||
               lower === expectedTS.toLowerCase() + 'worker';
      });

      if (tsMatch) {
        mapping.matched.push({
          python: pyFunc,
          typescript: tsMatch,
          worker: workerName
        });
        mapping.stats.matched++;
      } else {
        mapping.pythonOnly.push({
          python: pyFunc,
          worker: workerName,
          expectedTS: expectedTS
        });
      }
    });
  });

  // TypeScript만 있는 것 찾기
  const matchedTS = new Set(mapping.matched.map(m => m.typescript));
  PYODIDE_METHODS.forEach(tsMethod => {
    if (!matchedTS.has(tsMethod)) {
      const pyMatch = findPythonMatch(tsMethod);
      if (!pyMatch) {
        mapping.pyodideOnly.push({ typescript: tsMethod });
      }
    }
  });

  // 결과 출력
  console.log('📊 Statistics');
  console.log('-'.repeat(100));
  console.log(`Python Functions:      ${mapping.stats.python}`);
  console.log(`TypeScript Methods:    ${mapping.stats.pyodide}`);
  console.log(`✅ Matched:            ${mapping.stats.matched} (${Math.round(mapping.stats.matched/mapping.stats.python*100)}%)`);
  console.log(`⚠️  Python Only:        ${mapping.pythonOnly.length}`);
  console.log(`⚠️  TypeScript Only:    ${mapping.pyodideOnly.length}`);
  console.log();

  // 매칭된 것들 (Worker별)
  console.log('✅ Matched Implementations (by Worker)');
  console.log('-'.repeat(100));
  ['worker1', 'worker2', 'worker3', 'worker4'].forEach(worker => {
    const workerMatches = mapping.matched.filter(m => m.worker === worker);
    console.log(`\n${worker.toUpperCase()} (${workerMatches.length} functions):`);
    workerMatches.forEach(m => {
      console.log(`  ${m.python.padEnd(35)} → ${m.typescript}`);
    });
  });

  // Python만 있는 것 (TypeScript 래퍼 필요)
  if (mapping.pythonOnly.length > 0) {
    console.log();
    console.log('⚠️  Python Only (Need TypeScript Wrapper)');
    console.log('-'.repeat(100));
    mapping.pythonOnly.forEach(m => {
      console.log(`  ${m.python.padEnd(35)} (${m.worker}) → Expected: ${m.expectedTS}`);
    });
  }

  // TypeScript만 있는 것
  if (mapping.pyodideOnly.length > 0) {
    console.log();
    console.log('⚠️  TypeScript Only (No Python Implementation)');
    console.log('-'.repeat(100));
    mapping.pyodideOnly.forEach(m => {
      console.log(`  ${m.typescript}`);
    });
  }

  console.log();
  console.log('='.repeat(100));

  return mapping;
}

// 실행
const result = generateCompleteMapping();

// JSON 저장
const outputPath = path.join(__dirname, 'complete-mapping.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\n📄 Full mapping saved to: ${outputPath}\n`);