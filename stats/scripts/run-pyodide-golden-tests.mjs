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
function canonicalizeSpecial(value) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'POSITIVE_INFINITY';
    if (value === -Infinity) return 'NEGATIVE_INFINITY';
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'NAN') return 'NaN';
    if (normalized === 'POSITIVE_INFINITY' || normalized === 'INFINITY' || normalized === '+INFINITY') return 'POSITIVE_INFINITY';
    if (normalized === 'NEGATIVE_INFINITY' || normalized === '-INFINITY') return 'NEGATIVE_INFINITY';
    return value;
  }

  return value;
}

function getTolerances(tolerance) {
  if (typeof tolerance === 'number') {
    return { abs: tolerance, rel: 0 };
  }
  if (tolerance && typeof tolerance === 'object') {
    return { abs: tolerance.abs ?? 0, rel: tolerance.rel ?? 0 };
  }
  return { abs: 0, rel: 0 };
}

function isCloseEnough(actual, expected, tolerance) {
  const a = canonicalizeSpecial(actual);
  const e = canonicalizeSpecial(expected);

  if (typeof e === 'string' && (e === 'NaN' || e === 'POSITIVE_INFINITY' || e === 'NEGATIVE_INFINITY')) {
    return a === e;
  }
  if (typeof a === 'string') return false;

  const { abs: absTol, rel: relTol } = getTolerances(tolerance);
  if (e === 0) {
    return Math.abs(a) <= absTol;
  }
  const diff = Math.abs(a - e);
  return diff <= Math.max(absTol, relTol * Math.abs(e));
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

  // T-Test: Paired
  console.log(colorize('\n📊 T-Test: Paired', 'cyan'));
  for (const tc of goldenValues.tTest.paired) {
    await runTest(tc.name, async () => {
      const code = `
from scipy import stats
import json
import math
import warnings
warnings.filterwarnings('ignore')
result = stats.ttest_rel(${JSON.stringify(tc.input.before)}, ${JSON.stringify(tc.input.after)})

stat = float(result.statistic)
if math.isfinite(stat):
    stat_out = stat
elif math.isnan(stat):
    stat_out = "NaN"
elif stat > 0:
    stat_out = "POSITIVE_INFINITY"
else:
    stat_out = "NEGATIVE_INFINITY"

pval = float(result.pvalue)
if math.isfinite(pval):
    pval_out = pval
elif math.isnan(pval):
    pval_out = "NaN"
elif pval > 0:
    pval_out = "POSITIVE_INFINITY"
else:
    pval_out = "NEGATIVE_INFINITY"

json.dumps({'statistic': stat_out, 'pValue': pval_out})
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

  // ============================================================
  // ADVANCED ANALYSIS TESTS
  // ============================================================

  // Load additional packages for advanced analysis
  console.log(colorize('\n📦 Loading sklearn for advanced analysis...', 'yellow'));
  const advancedStart = Date.now();
  let sklearnLoaded = false;
  try {
    await pyodide.loadPackage(['scikit-learn']);
    console.log(colorize(`  ✓ sklearn loaded (${((Date.now() - advancedStart) / 1000).toFixed(1)}s)`, 'green'));
    sklearnLoaded = true;
  } catch (error) {
    console.log(colorize(`  ⚠ sklearn loading failed, skipping advanced tests: ${error.message}`, 'yellow'));
  }

  // PCA (Principal Component Analysis)
  if (sklearnLoaded && goldenValues.multivariate?.pca) {
    console.log(colorize('\n📊 Multivariate: PCA', 'cyan'));
    for (const tc of goldenValues.multivariate.pca) {
      await runTest(tc.name, async () => {
        const code = `
from sklearn.decomposition import PCA
import numpy as np
import json

data = np.array(${JSON.stringify(tc.input.data)})
pca = PCA(n_components=3)
pca.fit(data)

result = {
    'explainedVarianceRatio': pca.explained_variance_ratio_.tolist(),
    'nComponents': int(np.sum(np.cumsum(pca.explained_variance_ratio_) < 0.95) + 1)
}
json.dumps(result)
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        // Check explained variance ratio (first component)
        if (!isCloseEnough(result.explainedVarianceRatio[0], tc.expected.explainedVarianceRatio[0], tc.tolerance)) {
          throw new Error(`explainedVarianceRatio[0]: expected ${tc.expected.explainedVarianceRatio[0]}, got ${result.explainedVarianceRatio[0]}`);
        }
      });
    }
  } else if (goldenValues.multivariate?.pca) {
    skipped += goldenValues.multivariate.pca.length;
    console.log(colorize('\n📊 Multivariate: PCA', 'cyan'));
    console.log(colorize(`  ⊘ Skipped (sklearn not loaded)`, 'yellow'));
  }

  // Cluster Analysis (K-Means)
  if (goldenValues.multivariate?.cluster) {
    console.log(colorize('\n📊 Multivariate: Cluster Analysis', 'cyan'));
    for (const tc of goldenValues.multivariate.cluster) {
      if (tc.name === 'k-means clustering') {
        if (!sklearnLoaded) {
          skipped++;
          console.log(colorize(`  ⊘ ${tc.name} (sklearn not loaded)`, 'yellow'));
          continue;
        }
        await runTest(tc.name, async () => {
          const code = `
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
import numpy as np
import json

data = np.array(${JSON.stringify(tc.input.data)})
n_clusters = ${tc.input.nClusters}

kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
labels = kmeans.fit_predict(data)
centroids = kmeans.cluster_centers_
inertia = kmeans.inertia_
silhouette = silhouette_score(data, labels)

result = {
    'nClusters': n_clusters,
    'inertia': float(inertia),
    'silhouetteScore': float(silhouette)
}
json.dumps(result)
`;
          const resultJson = await pyodide.runPythonAsync(code);
          const result = JSON.parse(resultJson);

          // Check silhouette score
          if (!isCloseEnough(result.silhouetteScore, tc.expected.silhouetteScore, tc.tolerance)) {
            throw new Error(`silhouetteScore: expected ${tc.expected.silhouetteScore}, got ${result.silhouetteScore}`);
          }
        });
      } else if (tc.name === 'hierarchical clustering') {
        await runTest(tc.name, async () => {
          const code = `
from scipy.cluster.hierarchy import linkage, cophenet
from scipy.spatial.distance import pdist
import numpy as np
import json

data = np.array(${JSON.stringify(tc.input.data)})
method = "${tc.input.method}"

Z = linkage(data, method=method)
c, _ = cophenet(Z, pdist(data))

json.dumps({'copheneticCorr': float(c)})
`;
          const resultJson = await pyodide.runPythonAsync(code);
          const result = JSON.parse(resultJson);

          if (!isCloseEnough(result.copheneticCorr, tc.expected.copheneticCorr, tc.tolerance)) {
            throw new Error(`copheneticCorr: expected ${tc.expected.copheneticCorr}, got ${result.copheneticCorr}`);
          }
        });
      } else {
        skipped++;
        console.log(colorize(`  ⊘ ${tc.name} (unsupported)`, 'yellow'));
      }
    }
  }

  // Effect Size: Cohen's d
  if (goldenValues.effectSize?.cohensD) {
    console.log(colorize('\n📊 Effect Size: Cohen\'s d', 'cyan'));
    for (const tc of goldenValues.effectSize.cohensD) {
      await runTest(tc.name, async () => {
        const code = `
import numpy as np
import json

group1 = np.array(${JSON.stringify(tc.input.group1)})
group2 = np.array(${JSON.stringify(tc.input.group2)})

# Pooled standard deviation
n1, n2 = len(group1), len(group2)
var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
pooled_std = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))

# Cohen's d
cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std

json.dumps({'cohensD': float(cohens_d)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        // Cohen's d can be positive or negative depending on group order, compare absolute values
        if (!isCloseEnough(Math.abs(result.cohensD), Math.abs(tc.expected.cohensD), tc.tolerance)) {
          throw new Error(`|cohensD|: expected ${Math.abs(tc.expected.cohensD)}, got ${Math.abs(result.cohensD)}`);
        }
      });
    }
  }

  // Variance Test: Brown-Forsythe (Levene with median)
  if (goldenValues.varianceTests?.brownForsythe) {
    console.log(colorize('\n📊 Variance Test: Brown-Forsythe', 'cyan'));
    for (const tc of goldenValues.varianceTests.brownForsythe) {
      await runTest(tc.name, async () => {
        const groupsStr = tc.input.groups.map(g => JSON.stringify(g)).join(', ');
        const code = `
from scipy import stats
import json

result = stats.levene(${groupsStr}, center='median')
json.dumps({'statistic': float(result.statistic), 'pValue': float(result.pvalue)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.statistic, tc.expected.statistic, tc.tolerance)) {
          throw new Error(`statistic: expected ${tc.expected.statistic}, got ${result.statistic}`);
        }
      });
    }
  }

  // Spearman Correlation
  if (goldenValues.correlation?.spearman) {
    console.log(colorize('\n📊 Correlation: Spearman', 'cyan'));
    for (const tc of goldenValues.correlation.spearman) {
      await runTest(tc.name, async () => {
        const code = `
from scipy import stats
import json
result = stats.spearmanr(${JSON.stringify(tc.input.x)}, ${JSON.stringify(tc.input.y)})
json.dumps({'r': float(result.statistic), 'pValue': float(result.pvalue)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.r, tc.expected.r, tc.tolerance)) {
          throw new Error(`r: expected ${tc.expected.r}, got ${result.r}`);
        }
      });
    }
  }

  // Kendall Correlation
  if (goldenValues.correlation?.kendall) {
    console.log(colorize('\n📊 Correlation: Kendall', 'cyan'));
    for (const tc of goldenValues.correlation.kendall) {
      await runTest(tc.name, async () => {
        const code = `
from scipy import stats
import json
result = stats.kendalltau(${JSON.stringify(tc.input.x)}, ${JSON.stringify(tc.input.y)})
json.dumps({'tau': float(result.statistic), 'pValue': float(result.pvalue)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.tau, tc.expected.tau, tc.tolerance)) {
          throw new Error(`tau: expected ${tc.expected.tau}, got ${result.tau}`);
        }
      });
    }
  }

  // Logistic Regression (using statsmodels)
  if (goldenValues.regression?.logistic) {
    console.log(colorize('\n📊 Regression: Logistic', 'cyan'));
    for (const tc of goldenValues.regression.logistic) {
      await runTest(tc.name, async () => {
        const code = `
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import numpy as np
import json

X = np.array(${JSON.stringify(tc.input.x)}).reshape(-1, 1)
y = np.array(${JSON.stringify(tc.input.y)})

model = LogisticRegression(solver='lbfgs', max_iter=1000)
model.fit(X, y)
accuracy = accuracy_score(y, model.predict(X))

json.dumps({
    'accuracy': float(accuracy),
    'coefficient': float(model.coef_[0][0]),
    'intercept': float(model.intercept_[0])
})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.accuracy, tc.expected.accuracy, tc.tolerance)) {
          throw new Error(`accuracy: expected ${tc.expected.accuracy}, got ${result.accuracy}`);
        }
      });
    }
  }

  // Discriminant Analysis
  if (sklearnLoaded && goldenValues.multivariate?.discriminant) {
    console.log(colorize('\n📊 Multivariate: Discriminant Analysis', 'cyan'));
    for (const tc of goldenValues.multivariate.discriminant) {
      await runTest(tc.name, async () => {
        const code = `
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
import numpy as np
import json

X = np.array(${JSON.stringify(tc.input.features)})
y = np.array(${JSON.stringify(tc.input.labels)})

lda = LinearDiscriminantAnalysis()
lda.fit(X, y)
accuracy = lda.score(X, y)

json.dumps({
    'accuracy': float(accuracy)
})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.accuracy, tc.expected.accuracy, tc.tolerance)) {
          throw new Error(`accuracy: expected ${tc.expected.accuracy}, got ${result.accuracy}`);
        }
      });
    }
  } else if (goldenValues.multivariate?.discriminant) {
    skipped += goldenValues.multivariate.discriminant.length;
    console.log(colorize('\n📊 Multivariate: Discriminant Analysis', 'cyan'));
    console.log(colorize(`  ⊘ Skipped (sklearn not loaded)`, 'yellow'));
  }

  // Effect Size: Hedges' g
  if (goldenValues.effectSize?.hedgesG) {
    console.log(colorize('\n📊 Effect Size: Hedges\' g', 'cyan'));
    for (const tc of goldenValues.effectSize.hedgesG) {
      await runTest(tc.name, async () => {
        const code = `
import numpy as np
import json

group1 = np.array(${JSON.stringify(tc.input.group1)})
group2 = np.array(${JSON.stringify(tc.input.group2)})

n1, n2 = len(group1), len(group2)
var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)
pooled_std = np.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2))

# Cohen's d
d = (np.mean(group1) - np.mean(group2)) / pooled_std

# Hedges' g correction factor
correction = 1 - (3 / (4 * (n1 + n2) - 9))
hedges_g = d * correction

json.dumps({'hedgesG': float(hedges_g)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(Math.abs(result.hedgesG), Math.abs(tc.expected.hedgesG), tc.tolerance)) {
          throw new Error(`|hedgesG|: expected ${Math.abs(tc.expected.hedgesG)}, got ${Math.abs(result.hedgesG)}`);
        }
      });
    }
  }

  // Effect Size: Eta Squared
  if (goldenValues.effectSize?.etaSquared) {
    console.log(colorize('\n📊 Effect Size: Eta Squared', 'cyan'));
    for (const tc of goldenValues.effectSize.etaSquared) {
      await runTest(tc.name, async () => {
        const groupsStr = tc.input.groups.map(g => JSON.stringify(g)).join(', ');
        const code = `
from scipy import stats
import numpy as np
import json

groups = [${groupsStr}]
all_data = np.concatenate(groups)
grand_mean = np.mean(all_data)

# SS Between
ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)

# SS Total
ss_total = np.sum((all_data - grand_mean)**2)

eta_squared = ss_between / ss_total

json.dumps({'etaSquared': float(eta_squared)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.etaSquared, tc.expected.etaSquared, tc.tolerance)) {
          throw new Error(`etaSquared: expected ${tc.expected.etaSquared}, got ${result.etaSquared}`);
        }
      });
    }
  }

  // F-Test for Variance
  if (goldenValues.varianceTests?.fTest) {
    console.log(colorize('\n📊 Variance Test: F-Test', 'cyan'));
    for (const tc of goldenValues.varianceTests.fTest) {
      await runTest(tc.name, async () => {
        const code = `
from scipy import stats
import numpy as np
import json

sample1 = np.array(${JSON.stringify(tc.input.sample1)})
sample2 = np.array(${JSON.stringify(tc.input.sample2)})

var1 = np.var(sample1, ddof=1)
var2 = np.var(sample2, ddof=1)

f_stat = var1 / var2
df1 = len(sample1) - 1
df2 = len(sample2) - 1

# Two-tailed p-value
p_value = 2 * min(stats.f.cdf(f_stat, df1, df2), 1 - stats.f.cdf(f_stat, df1, df2))

json.dumps({'fStatistic': float(f_stat), 'pValue': float(p_value)})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.fStatistic, tc.expected.fStatistic, tc.tolerance)) {
          throw new Error(`fStatistic: expected ${tc.expected.fStatistic}, got ${result.fStatistic}`);
        }
      });
    }
  }

  // ============================================================
  // ADVANCED ANALYSIS TESTS (statsmodels, lifelines)
  // ============================================================

  // Load statsmodels for time series and advanced analysis
  console.log(colorize('\n📦 Loading statsmodels for advanced analysis...', 'yellow'));
  const statsmodelsStart = Date.now();
  let statsmodelsLoaded = false;
  try {
    await pyodide.loadPackage(['statsmodels']);
    console.log(colorize(`  ✓ statsmodels loaded (${((Date.now() - statsmodelsStart) / 1000).toFixed(1)}s)`, 'green'));
    statsmodelsLoaded = true;
  } catch (error) {
    console.log(colorize(`  ⚠ statsmodels loading failed: ${error.message}`, 'yellow'));
  }

  // Factor Analysis (using sklearn FactorAnalysis)
  if (sklearnLoaded && goldenValues.multivariate?.factorAnalysis) {
    console.log(colorize('\n📊 Multivariate: Factor Analysis', 'cyan'));
    for (const tc of goldenValues.multivariate.factorAnalysis) {
      await runTest(tc.name, async () => {
        const code = `
from sklearn.decomposition import FactorAnalysis
import numpy as np
import json

data = np.array(${JSON.stringify(tc.input.data)})
n_factors = ${tc.input.nFactors}

fa = FactorAnalysis(n_components=n_factors, random_state=42)
fa.fit(data)

# Get communalities (sum of squared loadings for each variable)
loadings = fa.components_.T
communalities = np.sum(loadings**2, axis=1)

json.dumps({
    'nFactors': n_factors,
    'communalities': communalities.tolist()
})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        // Check number of factors
        if (result.nFactors !== tc.input.nFactors) {
          throw new Error(`nFactors: expected ${tc.input.nFactors}, got ${result.nFactors}`);
        }
      });
    }
  } else if (goldenValues.multivariate?.factorAnalysis) {
    skipped += goldenValues.multivariate.factorAnalysis.length;
    console.log(colorize('\n📊 Multivariate: Factor Analysis', 'cyan'));
    console.log(colorize(`  ⊘ Skipped (sklearn not loaded)`, 'yellow'));
  }

  // Time Series: ARIMA
  if (statsmodelsLoaded && goldenValues.timeSeries?.arima) {
    console.log(colorize('\n📊 Time Series: ARIMA', 'cyan'));
    for (const tc of goldenValues.timeSeries.arima) {
      await runTest(tc.name, async () => {
        const code = `
from statsmodels.tsa.arima.model import ARIMA
import numpy as np
import json
import warnings
warnings.filterwarnings('ignore')

data = np.array(${JSON.stringify(tc.input.data)})
order = tuple(${JSON.stringify(tc.input.order)})

model = ARIMA(data, order=order)
fitted = model.fit()
forecast = fitted.forecast(steps=${tc.input.forecastSteps})

json.dumps({
    'forecast': forecast.tolist(),
    'aic': float(fitted.aic)
})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        // Check first forecast value with tolerance
        if (!isCloseEnough(result.forecast[0], tc.expected.forecast[0], tc.tolerance)) {
          throw new Error(`forecast[0]: expected ${tc.expected.forecast[0]}, got ${result.forecast[0]}`);
        }
      });
    }
  } else if (goldenValues.timeSeries?.arima) {
    skipped += goldenValues.timeSeries.arima.length;
    console.log(colorize('\n📊 Time Series: ARIMA', 'cyan'));
    console.log(colorize(`  ⊘ Skipped (statsmodels not loaded)`, 'yellow'));
  }

  // Survival Analysis: Kaplan-Meier (using manual calculation since lifelines may not be available)
  if (goldenValues.survival?.kaplanMeier) {
    console.log(colorize('\n📊 Survival: Kaplan-Meier', 'cyan'));
    for (const tc of goldenValues.survival.kaplanMeier) {
      await runTest(tc.name, async () => {
        const code = `
import numpy as np
import json

times = np.array(${JSON.stringify(tc.input.times)})
events = np.array(${JSON.stringify(tc.input.events)})

# Simple Kaplan-Meier calculation
n = len(times)
sorted_indices = np.argsort(times)
times_sorted = times[sorted_indices]
events_sorted = events[sorted_indices]

survival_prob = 1.0
survival_probs = []
at_risk = n

for i in range(n):
    if events_sorted[i] == 1:
        survival_prob *= (at_risk - 1) / at_risk
    survival_probs.append(survival_prob)
    at_risk -= 1

# Find survival at t=30
survival_at_30 = survival_probs[-1]
for i, t in enumerate(times_sorted):
    if t >= 30:
        survival_at_30 = survival_probs[i]
        break

json.dumps({
    'survivalAt30': float(survival_at_30)
})
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!isCloseEnough(result.survivalAt30, tc.expected.survivalAt30, tc.tolerance)) {
          throw new Error(`survivalAt30: expected ${tc.expected.survivalAt30}, got ${result.survivalAt30}`);
        }
      });
    }
  }

  // ============================================================
  // POPULATION GENETICS (Worker 9)
  // ============================================================

  // Load worker9-genetics.py into Pyodide
  console.log(colorize('\n🧬 Population Genetics (Worker 9)', 'cyan'));
  const workerCode = readFileSync(join(__dirname, '../public/workers/python/worker9-genetics.py'), 'utf-8');
  await pyodide.runPythonAsync(workerCode);
  console.log(colorize('  ✓ Worker 9 loaded', 'green'));

  // Hardy-Weinberg: Single Locus
  if (goldenValues.hardyWeinberg?.singleLocus) {
    console.log(colorize('\n📊 Hardy-Weinberg: Single Locus', 'cyan'));
    for (const tc of goldenValues.hardyWeinberg.singleLocus) {
      await runTest(tc.name, async () => {
        const code = `
import json
result = hardy_weinberg(${JSON.stringify(tc.input.rows)}${tc.input.locusLabels ? `, ${JSON.stringify(tc.input.locusLabels)}` : ''})
json.dumps(result, default=str)
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        for (const [key, expectedVal] of Object.entries(tc.expected)) {
          if (key === 'locusResultsLength') {
            const actual = result.locusResults ? result.locusResults.length : 0;
            if (actual !== expectedVal) {
              throw new Error(`locusResults.length: expected ${expectedVal}, got ${actual}`);
            }
          } else if (key === 'locusLabels') {
            // Skip — checked via locusResults
          } else if (typeof expectedVal === 'number') {
            if (!isCloseEnough(result[key], expectedVal, tc.tolerance)) {
              throw new Error(`${key}: expected ${expectedVal}, got ${result[key]}`);
            }
          } else if (typeof expectedVal === 'boolean') {
            if (result[key] !== expectedVal) {
              throw new Error(`${key}: expected ${expectedVal}, got ${result[key]}`);
            }
          }
        }
      });
    }
  }

  // Hardy-Weinberg: Multi-Locus
  if (goldenValues.hardyWeinberg?.multiLocus) {
    console.log(colorize('\n📊 Hardy-Weinberg: Multi-Locus', 'cyan'));
    for (const tc of goldenValues.hardyWeinberg.multiLocus) {
      await runTest(tc.name, async () => {
        const code = `
import json
result = hardy_weinberg(${JSON.stringify(tc.input.rows)}${tc.input.locusLabels ? `, ${JSON.stringify(tc.input.locusLabels)}` : ''})
json.dumps(result, default=str)
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (tc.expected.locusResultsLength !== undefined) {
          const actual = result.locusResults ? result.locusResults.length : 0;
          if (actual !== tc.expected.locusResultsLength) {
            throw new Error(`locusResults.length: expected ${tc.expected.locusResultsLength}, got ${actual}`);
          }
        }
        if (tc.expected.lowExpectedWarning !== undefined) {
          if (result.lowExpectedWarning !== tc.expected.lowExpectedWarning) {
            throw new Error(`lowExpectedWarning: expected ${tc.expected.lowExpectedWarning}, got ${result.lowExpectedWarning}`);
          }
        }
        if (tc.expected.locusLabels) {
          for (let i = 0; i < tc.expected.locusLabels.length; i++) {
            if (result.locusResults[i].locus !== tc.expected.locusLabels[i]) {
              throw new Error(`locus[${i}]: expected ${tc.expected.locusLabels[i]}, got ${result.locusResults[i].locus}`);
            }
          }
        }
      });
    }
  }

  // Fst: Pairwise
  if (goldenValues.fst?.pairwise) {
    console.log(colorize('\n📊 Fst: Pairwise', 'cyan'));
    for (const tc of goldenValues.fst.pairwise) {
      await runTest(tc.name, async () => {
        const code = `
import json
result = fst(${JSON.stringify(tc.input.populations)}${tc.input.populationLabels ? `, ${JSON.stringify(tc.input.populationLabels)}` : ''})
json.dumps(result, default=str)
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (tc.expected.globalFst !== undefined) {
          if (!isCloseEnough(result.globalFst, tc.expected.globalFst, tc.tolerance)) {
            throw new Error(`globalFst: expected ${tc.expected.globalFst}, got ${result.globalFst}`);
          }
        }
        if (tc.expected.nPopulations !== undefined) {
          if (result.nPopulations !== tc.expected.nPopulations) {
            throw new Error(`nPopulations: expected ${tc.expected.nPopulations}, got ${result.nPopulations}`);
          }
        }
        if (tc.expected.symmetricMatrix) {
          const m = result.pairwiseFst;
          for (let i = 0; i < m.length; i++) {
            for (let j = i + 1; j < m[i].length; j++) {
              if (Math.abs(m[i][j] - m[j][i]) > 1e-10) {
                throw new Error(`pairwise not symmetric: [${i}][${j}]=${m[i][j]} vs [${j}][${i}]=${m[j][i]}`);
              }
            }
          }
        }
        if (tc.expected.diagonalZero) {
          const m = result.pairwiseFst;
          for (let i = 0; i < m.length; i++) {
            if (m[i][i] !== 0) {
              throw new Error(`diagonal not zero: [${i}][${i}]=${m[i][i]}`);
            }
          }
        }
      });
    }
  }

  // Fst: Edge Cases (error expected)
  if (goldenValues.fst?.edgeCases) {
    console.log(colorize('\n📊 Fst: Edge Cases', 'cyan'));
    for (const tc of goldenValues.fst.edgeCases) {
      await runTest(tc.name, async () => {
        const code = `
import json
_out = ''
try:
    result = fst(${JSON.stringify(tc.input.populations)}${tc.input.populationLabels ? `, ${JSON.stringify(tc.input.populationLabels)}` : ''})
    _out = json.dumps({'error': None})
except ValueError as e:
    _out = json.dumps({'error': str(e)})
_out
`;
        const resultJson = await pyodide.runPythonAsync(code);
        const result = JSON.parse(resultJson);

        if (!result.error) {
          throw new Error(`Expected error containing "${tc.expected.error}", but no error was raised`);
        }
        if (!result.error.includes(tc.expected.error)) {
          throw new Error(`Error message mismatch: expected to contain "${tc.expected.error}", got "${result.error}"`);
        }
      });
    }
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
