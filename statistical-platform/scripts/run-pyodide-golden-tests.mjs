#!/usr/bin/env node
/**
 * Pyodide Golden Values Test Runner
 *
 * Node.js 환경에서 Pyodide를 직접 실행하여 통계 계산 검증
 *
 * 실행:
 * node --experimental-vm-modules scripts/run-pyodide-golden-tests.mjs
 *
 * 또는 npm script:
 * npm run test:pyodide-golden
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 컬러 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

// 골든 값 로드
const goldenValuesPath = join(__dirname, '../__tests__/workers/golden-values/statistical-golden-values.json');
const goldenValues = JSON.parse(readFileSync(goldenValuesPath, 'utf-8'));

// 테스트 결과 추적
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

// Tolerance를 고려한 비교 함수
function isCloseEnough(actual, expected, tolerance) {
  if (expected === 0) {
    return Math.abs(actual) <= tolerance;
  }
  return Math.abs(actual - expected) <= tolerance;
}

// 테스트 실행
async function runTest(name, testFn) {
  try {
    await testFn();
    passed++;
    console.log(colorize(`  ✓ ${name}`, 'green'));
  } catch (error) {
    failed++;
    failures.push({ name, error: error.message });
    console.log(colorize(`  ✗ ${name}`, 'red'));
    console.log(colorize(`    Error: ${error.message}`, 'yellow'));
  }
}

// 메인 실행
async function main() {
  console.log(colorize('\n🔬 Pyodide Golden Values Test Runner', 'cyan'));
  console.log(colorize('=' .repeat(60), 'blue'));

  console.log(colorize('\n📦 Loading Pyodide...', 'yellow'));
  const startTime = Date.now();

  let pyodide;
  try {
    const { loadPyodide } = await import('pyodide');
    // Node.js 환경에서는 indexURL 없이 로컬 패키지 사용
    pyodide = await loadPyodide();
    console.log(colorize(`  ✓ Pyodide loaded (${((Date.now() - startTime) / 1000).toFixed(1)}s)`, 'green'));
  } catch (error) {
    console.log(colorize(`  ✗ Failed to load Pyodide: ${error.message}`, 'red'));
    process.exit(1);
  }

  console.log(colorize('\n📦 Loading packages (scipy, numpy)...', 'yellow'));
  const packageStart = Date.now();
  try {
    await pyodide.loadPackage(['numpy', 'scipy']);
    console.log(colorize(`  ✓ Packages loaded (${((Date.now() - packageStart) / 1000).toFixed(1)}s)`, 'green'));
  } catch (error) {
    console.log(colorize(`  ✗ Failed to load packages: ${error.message}`, 'red'));
    process.exit(1);
  }

  // T-Test: One-Sample
  console.log(colorize('\n📊 T-Test: One-Sample', 'cyan'));
  for (const tc of goldenValues.tTest.oneSample) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.ttest_1samp(${JSON.stringify(tc.input.data)}, ${tc.input.popmean})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // T-Test: Two-Sample
  console.log(colorize('\n📊 T-Test: Two-Sample', 'cyan'));
  for (const tc of goldenValues.tTest.twoSample) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.ttest_ind(${JSON.stringify(tc.input.group1)}, ${JSON.stringify(tc.input.group2)})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // T-Test: Paired (skip special cases)
  console.log(colorize('\n📊 T-Test: Paired', 'cyan'));
  for (const tc of goldenValues.tTest.paired) {
    if (typeof tc.expected.statistic === 'string') {
      skipped++;
      console.log(colorize(`  ⊘ ${tc.name} (special value)`, 'yellow'));
      continue;
    }
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.ttest_rel(${JSON.stringify(tc.input.before)}, ${JSON.stringify(tc.input.after)})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // ANOVA: One-Way
  console.log(colorize('\n📊 ANOVA: One-Way', 'cyan'));
  for (const tc of goldenValues.anova.oneWay) {
    await runTest(tc.name, async () => {
      const groupsStr = tc.input.groups.map(g => JSON.stringify(g)).join(', ');
      const code = `
from scipy import stats
import json
result = stats.f_oneway(${groupsStr})
json.dumps({'fStatistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.fStatistic, tc.expected.fStatistic, tc.tolerance)) {
        throw new Error(`fStatistic: expected ${tc.expected.fStatistic}, got ${result.fStatistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Correlation: Pearson
  console.log(colorize('\n📊 Correlation: Pearson', 'cyan'));
  for (const tc of goldenValues.correlation.pearson) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.pearsonr(${JSON.stringify(tc.input.x)}, ${JSON.stringify(tc.input.y)})
json.dumps({'r': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.r, tc.expected.r, tc.tolerance)) {
        throw new Error(`r: expected ${tc.expected.r}, got ${result.r}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Chi-Square: Independence
  console.log(colorize('\n📊 Chi-Square: Independence', 'cyan'));
  for (const tc of goldenValues.chiSquare.independence) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import numpy as np
import json
result = stats.chi2_contingency(np.array(${JSON.stringify(tc.input.observed)}))
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Chi-Square: Goodness of Fit
  console.log(colorize('\n📊 Chi-Square: Goodness of Fit', 'cyan'));
  for (const tc of goldenValues.chiSquare.goodness) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.chisquare(${JSON.stringify(tc.input.observed)}, f_exp=${JSON.stringify(tc.input.expected)})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Mann-Whitney U
  console.log(colorize('\n📊 Non-Parametric: Mann-Whitney U', 'cyan'));
  for (const tc of goldenValues.nonParametric.mannWhitney) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.mannwhitneyu(${JSON.stringify(tc.input.group1)}, ${JSON.stringify(tc.input.group2)}, alternative='two-sided')
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Wilcoxon Signed-Rank
  console.log(colorize('\n📊 Non-Parametric: Wilcoxon', 'cyan'));
  for (const tc of goldenValues.nonParametric.wilcoxon) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.wilcoxon(${JSON.stringify(tc.input.before)}, ${JSON.stringify(tc.input.after)})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Kruskal-Wallis
  console.log(colorize('\n📊 Non-Parametric: Kruskal-Wallis', 'cyan'));
  for (const tc of goldenValues.nonParametric.kruskalWallis) {
    await runTest(tc.name, async () => {
      const groupsStr = tc.input.groups.map(g => JSON.stringify(g)).join(', ');
      const code = `
from scipy import stats
import json
result = stats.kruskal(${groupsStr})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Linear Regression
  console.log(colorize('\n📊 Regression: Linear', 'cyan'));
  for (const tc of goldenValues.regression.linear) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.linregress(${JSON.stringify(tc.input.x)}, ${JSON.stringify(tc.input.y)})
json.dumps({
    'slope': float(result.slope),
    'intercept': float(result.intercept),
    'rSquared': float(result.rvalue ** 2),
    'pValue': float(result.pvalue)
})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.slope, tc.expected.slope, tc.tolerance)) {
        throw new Error(`slope: expected ${tc.expected.slope}, got ${result.slope}`);
      }
      if (!isCloseEnough(result.intercept, tc.expected.intercept, tc.tolerance)) {
        throw new Error(`intercept: expected ${tc.expected.intercept}, got ${result.intercept}`);
      }
      if (!isCloseEnough(result.rSquared, tc.expected.rSquared, tc.tolerance)) {
        throw new Error(`rSquared: expected ${tc.expected.rSquared}, got ${result.rSquared}`);
      }
    });
  }

  // Shapiro-Wilk
  console.log(colorize('\n📊 Normality: Shapiro-Wilk', 'cyan'));
  for (const tc of goldenValues.normalityTest.shapiroWilk) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.shapiro(${JSON.stringify(tc.input.data)})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Binomial Test
  console.log(colorize('\n📊 Binomial Test', 'cyan'));
  for (const tc of goldenValues.binomialTest) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
result = stats.binomtest(${tc.input.successes}, ${tc.input.trials}, ${tc.input.probability})
json.dumps({'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // Friedman Test
  console.log(colorize('\n📊 Friedman Test', 'cyan'));
  for (const tc of goldenValues.friedmanTest) {
    await runTest(tc.name, async () => {
      const groupsStr = tc.input.groups.map(g => JSON.stringify(g)).join(', ');
      const code = `
from scipy import stats
import json
result = stats.friedmanchisquare(${groupsStr})
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
      const resultJson = await pyodide.runPythonAsync(code);
      const result = JSON.parse(resultJson);

      if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
        throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
      }
      if (!isCloseEnough(result.pValue, tc.expected.pValue, tc.tolerance)) {
        throw new Error(`pValue: expected ${tc.expected.pValue}, got ${result.pValue}`);
      }
    });
  }

  // 결과 요약
  console.log(colorize('\n' + '=' .repeat(60), 'blue'));
  console.log(colorize('📋 SUMMARY', 'cyan'));
  console.log(colorize('=' .repeat(60), 'blue'));
  console.log(colorize(`Total: ${passed + failed + skipped}`, 'blue'));
  console.log(colorize(`  ✓ Passed: ${passed}`, 'green'));
  console.log(colorize(`  ✗ Failed: ${failed}`, failed > 0 ? 'red' : 'green'));
  console.log(colorize(`  ⊘ Skipped: ${skipped}`, skipped > 0 ? 'yellow' : 'green'));

  if (failures.length > 0) {
    console.log(colorize('\n❌ FAILURES:', 'red'));
    failures.forEach(({ name, error }) => {
      console.log(colorize(`  ${name}: ${error}`, 'red'));
    });
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(colorize(`\n⏱️  Total time: ${totalTime}s`, 'cyan'));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(colorize(`\n❌ Fatal error: ${err.message}`, 'red'));
  process.exit(1);
});
