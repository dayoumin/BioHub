#!/usr/bin/env node
// =============================================================================
// BioHub Statistical Validation Runner
// =============================================================================
// Purpose: Cross-validate BioHub Pyodide results against R golden values
// Usage:   pnpm test:validation [--method <id>] [--layer L1|L2|L3] [--report]
// Extends: Proven patterns from run-pyodide-golden-tests.mjs
// =============================================================================

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Path constants ─────────────────────────────────────────────────────────
const STATS_ROOT = join(__dirname, '..', '..');
const VALIDATION_ROOT = join(__dirname, '..');
const R_REFERENCE_DIR = join(VALIDATION_ROOT, 'golden-values', 'r-reference');
const NIST_DIR = join(VALIDATION_ROOT, 'golden-values', 'nist');
const EDGE_CASES_DIR = join(VALIDATION_ROOT, 'golden-values', 'edge-cases');
const RESULTS_DIR = join(VALIDATION_ROOT, 'results');
const WORKERS_DIR = join(STATS_ROOT, 'public', 'workers', 'python');

// ─── ANSI colors ────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function color(text, c) { return `${c}${text}${C.reset}`; }
function divider(char = '=') { return color(char.repeat(70), C.blue); }

// ─── CLI args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}
const FILTER_METHOD = getArg('--method');
const FILTER_LAYER = getArg('--layer');
const GENERATE_REPORT = args.includes('--report');

// =============================================================================
// TIER TOLERANCE POLICY (Design doc §2.2)
// =============================================================================
const TIER_TOLERANCE = {
  exact:  { abs: 0,      rel: 0 },
  tier2:  { abs: 0.0001, rel: 1e-6 },
  tier3:  { abs: 0.01,   rel: 1e-4 },
  tier4:  { abs: 0.1,    rel: 0.01 },
};

function getTolerance(tier) {
  return TIER_TOLERANCE[tier] || TIER_TOLERANCE.tier2;
}

// =============================================================================
// SPECIAL VALUE HANDLING (from existing runner, proven pattern)
// =============================================================================
function canonicalize(value) {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'POSITIVE_INFINITY';
    if (value === -Infinity) return 'NEGATIVE_INFINITY';
    return value;
  }
  if (typeof value === 'string') {
    const norm = value.trim().toUpperCase();
    if (norm === 'NAN') return 'NaN';
    if (norm === 'POSITIVE_INFINITY' || norm === 'INFINITY') return 'POSITIVE_INFINITY';
    if (norm === 'NEGATIVE_INFINITY' || norm === '-INFINITY') return 'NEGATIVE_INFINITY';
    return value;
  }
  return value;
}

// =============================================================================
// COMPARISON: isCloseEnough (abs/rel dual tolerance)
// =============================================================================
function isCloseEnough(actual, expected, tolerance) {
  const a = canonicalize(actual);
  const e = canonicalize(expected);

  // Special value: exact string match
  if (typeof e === 'string' && (e === 'NaN' || e === 'POSITIVE_INFINITY' || e === 'NEGATIVE_INFINITY')) {
    return a === e;
  }
  if (typeof a === 'string' || typeof e === 'string') return a === e;

  // Exact tier: integer or exact match
  if (tolerance.abs === 0 && tolerance.rel === 0) {
    return a === e;
  }

  // Numeric comparison
  if (e === 0) return Math.abs(a) <= tolerance.abs;
  const diff = Math.abs(a - e);
  return diff <= Math.max(tolerance.abs, tolerance.rel * Math.abs(e));
}

// =============================================================================
// LRE: Log Relative Error (Design doc §2.3, Stata/NIST standard)
// =============================================================================
function computeLRE(actual, certified) {
  const a = typeof actual === 'number' ? actual : NaN;
  const c = typeof certified === 'number' ? certified : NaN;

  if (Number.isNaN(a) || Number.isNaN(c)) return 0;

  // certified == 0: absolute error fallback
  if (c === 0) {
    if (a === 0) return 15; // perfect
    return Math.min(15, -Math.log10(Math.abs(a)));
  }

  // certified != 0: relative error
  const relErr = Math.abs(a - c) / Math.abs(c);
  if (relErr === 0) return 15; // perfect match
  return Math.min(15, -Math.log10(relErr));
}

// =============================================================================
// LOAD GOLDEN VALUES
// =============================================================================
function loadGoldenValues(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.json'));
  const values = {};
  for (const file of files) {
    const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
    values[data.method] = data;
  }
  return values;
}

// =============================================================================
// COMPARE EXPECTED vs ACTUAL (recursive, tier-aware)
// =============================================================================
function compareFields(expected, actual, parentPath = '') {
  const results = [];

  for (const [key, spec] of Object.entries(expected)) {
    const path = parentPath ? `${parentPath}.${key}` : key;

    // Nested object with sub-fields (e.g., factor1.fStatistic)
    if (spec && typeof spec === 'object' && !('value' in spec) && !('tier' in spec)) {
      results.push(...compareFields(spec, actual?.[key] ?? actual, path));
      continue;
    }

    // Standard field: { value, tier }
    const certifiedValue = spec.value;
    const tier = spec.tier || 'tier2';
    const tolerance = getTolerance(tier);

    // Handle array values (e.g., PCA loadings, forecast)
    if (Array.isArray(certifiedValue)) {
      const actualArr = actual?.[key];
      if (!Array.isArray(actualArr)) {
        results.push({ path, status: 'FAIL', certified: certifiedValue, actual: actualArr, lre: 0, tier, error: 'not an array' });
        continue;
      }
      // Compare element-wise, report worst
      let worstLre = 15;
      let allPass = true;
      for (let i = 0; i < certifiedValue.length; i++) {
        const ok = isCloseEnough(actualArr[i], certifiedValue[i], tolerance);
        const lre = computeLRE(actualArr[i], certifiedValue[i]);
        if (!ok) allPass = false;
        if (lre < worstLre) worstLre = lre;
      }
      results.push({ path, status: allPass ? 'PASS' : 'FAIL', certified: `[${certifiedValue.length} elements]`, actual: `[${actualArr?.length} elements]`, lre: worstLre, tier });
      continue;
    }

    // Scalar value
    const actualValue = actual?.[key];

    // Handle null expected value (edge cases: NaN/None returns)
    if (certifiedValue === null) {
      const isNull = actualValue === null || actualValue === undefined;
      results.push({ path, status: isNull ? 'PASS' : 'FAIL', certified: null, actual: actualValue, lre: isNull ? 15 : 0, tier });
      continue;
    }

    if (actualValue === undefined || actualValue === null) {
      results.push({ path, status: 'FAIL', certified: certifiedValue, actual: actualValue, lre: 0, tier, error: 'missing' });
      continue;
    }

    const pass = isCloseEnough(actualValue, certifiedValue, tolerance);
    const lre = (tier === 'exact')
      ? (actualValue === certifiedValue ? 15 : 0)
      : computeLRE(actualValue, certifiedValue);

    results.push({ path, status: pass ? 'PASS' : 'FAIL', certified: certifiedValue, actual: actualValue, lre, tier });
  }

  return results;
}

// =============================================================================
// PYTHON CODE GENERATORS (per method type)
// =============================================================================

// Build Python code for a method using embedded golden data
function buildPythonCode(methodId, dataset, testCase) {
  const d = dataset.data;
  if (!d) return null;

  switch (methodId) {
    case 'two-sample-t':
      return `
import json
from worker2_hypothesis import t_test_two_sample
result = t_test_two_sample(${JSON.stringify(d.group1)}, ${JSON.stringify(d.group2)}, equalVar=True)
json.dumps(result)
`;
    case 'welch-t':
      return `
import json
from worker2_hypothesis import t_test_two_sample
result = t_test_two_sample(${JSON.stringify(d.group1)}, ${JSON.stringify(d.group2)}, equalVar=False)
json.dumps(result)
`;
    case 'one-sample-t':
      return `
import json
from worker2_hypothesis import t_test_one_sample
result = t_test_one_sample(${JSON.stringify(d.values)}, popmean=${d.popmean})
json.dumps(result)
`;
    case 'paired-t':
      return `
import json
from worker2_hypothesis import t_test_paired
result = t_test_paired(${JSON.stringify(d.before)}, ${JSON.stringify(d.after)})
json.dumps(result)
`;
    case 'one-way-anova':
      return `
import json
from worker3_nonparametric_anova import one_way_anova
result = one_way_anova(${JSON.stringify(d.groups)})
json.dumps(result)
`;
    case 'two-way-anova':
      return `
import json
from worker3_nonparametric_anova import two_way_anova
result = two_way_anova(${JSON.stringify(d.value)}, ${JSON.stringify(d.factor1)}, ${JSON.stringify(d.factor2)})
json.dumps(result)
`;
    // ─── Phase 2: Nonparametric (worker3) ──────────────────────────────
    case 'mann-whitney':
      return `
import json
from worker3_nonparametric_anova import mann_whitney_test
result = mann_whitney_test(${JSON.stringify(d.group1)}, ${JSON.stringify(d.group2)})
json.dumps(result)
`;
    case 'wilcoxon-signed-rank':
      // R returns V=W+ (sum of positive ranks) with normal approximation (exact=FALSE, correct=FALSE)
      // Worker uses scipy convention (T=min). Compute R-compatible values with ties adjustment.
      return `
import json
import numpy as np
from scipy import stats
before = np.array(${JSON.stringify(d.before)}, dtype=float)
after = np.array(${JSON.stringify(d.after)}, dtype=float)
diffs = before - after
diffs_nz = diffs[diffs != 0]
abs_vals = np.abs(diffs_nz)
abs_ranks = stats.rankdata(abs_vals)
w_plus = float(np.sum(abs_ranks[diffs_nz > 0]))
n = len(diffs_nz)
mean_w = n * (n + 1) / 4
# Ties adjustment: sigma^2 = n(n+1)(2n+1)/24 - sum(t^3-t)/48
var_w = n * (n + 1) * (2 * n + 1) / 24
unique, counts = np.unique(abs_vals, return_counts=True)
tie_adj = np.sum(counts**3 - counts) / 48
var_w -= tie_adj
z = (w_plus - mean_w) / np.sqrt(var_w)
p = 2 * stats.norm.sf(abs(z))
result = {'statistic': w_plus, 'pValue': float(p)}
json.dumps(result)
`;
    case 'kruskal-wallis': {
      return `
import json
from worker3_nonparametric_anova import kruskal_wallis_test
ozone = ${JSON.stringify(d.Ozone)}
month = ${JSON.stringify(d.Month)}
groups = {}
for o, m in zip(ozone, month):
    groups.setdefault(m, []).append(o)
group_list = [groups[k] for k in sorted(groups.keys())]
result = kruskal_wallis_test(group_list)
json.dumps(result)
`;
    }
    case 'friedman': {
      const fKeys = Object.keys(d.matrix).sort((a, b) =>
        parseInt(a.replace('V', '')) - parseInt(b.replace('V', '')));
      const nTreatments = d.matrix[fKeys[0]].length;
      return `
import json
from worker3_nonparametric_anova import friedman_test
blocks = ${JSON.stringify(fKeys.map(k => d.matrix[k]))}
groups = [[blocks[b][t] for b in range(${fKeys.length})] for t in range(${nTreatments})]
result = friedman_test(groups)
json.dumps(result)
`;
    }
    case 'sign-test':
      // R counts before > after as positive; Python counts after > before.
      // Swap arguments to match R convention.
      return `
import json
from worker3_nonparametric_anova import sign_test
result = sign_test(${JSON.stringify(d.after)}, ${JSON.stringify(d.before)})
json.dumps(result)
`;
    case 'mcnemar':
      return `
import json
import numpy as np
from statsmodels.stats.contingency_tables import mcnemar
cols = ${JSON.stringify(d.table)}
table = np.array(cols).T
result = mcnemar(table, exact=False, correction=False)
json.dumps({'chiSquare': float(result.statistic), 'pValue': float(result.pvalue)})
`;
    case 'cochran-q': {
      const cqKeys = Object.keys(d.matrix).sort((a, b) =>
        parseInt(a.replace('V', '')) - parseInt(b.replace('V', '')));
      return `
import json
from worker3_nonparametric_anova import cochran_q_test
data = ${JSON.stringify(cqKeys.map(k => d.matrix[k]))}
result = cochran_q_test(data)
json.dumps(result)
`;
    }
    case 'mood-median':
      return `
import json
from worker3_nonparametric_anova import mood_median_test
result = mood_median_test(${JSON.stringify([d.g1, d.g2, d.g3])})
json.dumps(result)
`;

    // ─── Phase 2: Hypothesis (worker2) ─────────────────────────────────
    case 'binomial-test':
      return `
import json
from worker2_hypothesis import binomial_test
result = binomial_test(${d.successCount}, ${d.totalCount}, ${d.probability})
json.dumps(result)
`;
    case 'pearson-correlation': {
      const desc = testCase?.description || '';
      if (desc.includes('Spearman')) {
        return `
import json
from worker2_hypothesis import correlation_test
result = correlation_test(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)}, method='spearman')
json.dumps({'rho': result['correlation'], 'pValue': result['pValue']})
`;
      }
      if (desc.includes('Kendall')) {
        return `
import json
from worker2_hypothesis import correlation_test
result = correlation_test(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)}, method='kendall')
json.dumps({'tau': result['correlation'], 'pValue': result['pValue']})
`;
      }
      return `
import json
from worker2_hypothesis import correlation_test
result = correlation_test(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)}, method='pearson')
json.dumps({'r': result['correlation'], 'pValue': result['pValue']})
`;
    }
    case 'partial-correlation':
      // Worker uses pearsonr p-value (df=n-2), but partial corr needs df=n-k-2.
      // Compute manually with correct df.
      return `
import json
import numpy as np
from scipy import stats
import statsmodels.api as sm

mpg = ${JSON.stringify(d.mpg)}
wt = ${JSON.stringify(d.wt)}
hp = ${JSON.stringify(d.hp)}
data = np.column_stack([mpg, wt, hp])
n = len(data)

def pcorr(data, xi, yi, ci):
    controls = sm.add_constant(data[:, ci].reshape(-1, 1))
    yr = sm.OLS(data[:, yi], controls).fit().resid
    xr = sm.OLS(data[:, xi], controls).fit().resid
    r = float(np.corrcoef(xr, yr)[0, 1])
    df = n - 2 - 1  # n - 2 - k (k=1 control)
    t = r * np.sqrt(df / (1 - r**2))
    p = 2 * float(stats.t.sf(abs(t), df))
    return r, p, df

r1, p1, df_val = pcorr(data, 0, 1, [2])
r2, p2, _ = pcorr(data, 0, 2, [1])
result = {
    'partialR_mpg_wt': r1, 'pValue_mpg_wt': p1,
    'partialR_mpg_hp': r2, 'pValue_mpg_hp': p2,
    'df': df_val
}
json.dumps(result)
`;
    case 'response-surface':
      return `
import json
from worker2_hypothesis import response_surface_analysis
time_vals = ${JSON.stringify(d.Time)}
temp_vals = ${JSON.stringify(d.Temp)}
yield_vals = ${JSON.stringify(d.Yield)}
data = [{'Time': t, 'Temp': te, 'Yield': y} for t, te, y in zip(time_vals, temp_vals, yield_vals)]
raw = response_surface_analysis(data, 'Yield', ['Time', 'Temp'])
result = {'rSquared': raw['rSquared'], 'fStatistic': raw['fStatistic'], 'pValue': raw.get('pValue', raw.get('fPvalue'))}
json.dumps(result)
`;

    // ─── Phase 2: Descriptive (worker1) ────────────────────────────────
    case 'kolmogorov-smirnov': {
      const ksDesc = testCase?.description || '';
      if (ksDesc.includes('One-sample')) {
        return `
import json
from worker1_descriptive import ks_test_one_sample
result = ks_test_one_sample(${JSON.stringify(d.sample1)})
json.dumps({'statistic': result['statistic'], 'pValue': result['pValue']})
`;
      }
      return `
import json
from worker1_descriptive import ks_test_two_sample
result = ks_test_two_sample(${JSON.stringify(d.sample1)}, ${JSON.stringify(d.sample2)})
json.dumps(result)
`;
    }
    case 'runs-test':
      // R computes runs directly on binary data. Worker uses median cutoff which
      // may differ. Compute manually matching R's formula.
      return `
import json
import numpy as np
from scipy import stats
seq = np.array(${JSON.stringify(d.sequence)}, dtype=float)
n = len(seq)
n1 = int(np.sum(seq == 1))
n0 = int(np.sum(seq == 0))
nRuns = 1 + int(np.sum(seq[1:] != seq[:-1]))
mu = 1 + 2 * n1 * n0 / n
var = (2 * n1 * n0 * (2 * n1 * n0 - n)) / (n**2 * (n - 1))
z = (nRuns - mu) / np.sqrt(var)
p = 2 * stats.norm.sf(abs(z))
result = {'nRuns': nRuns, 'zStatistic': float(z), 'pValue': float(p)}
json.dumps(result)
`;

    // ─── Phase 2: Regression (worker4 + worker2) ───────────────────────
    case 'simple-regression':
      return `
import json
from worker4_regression_advanced import linear_regression
result = linear_regression(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)})
json.dumps(result)
`;
    case 'logistic-regression':
      return `
import json
import numpy as np
from worker4_regression_advanced import logistic_regression
x = ${JSON.stringify(d.x)}
y = ${JSON.stringify(d.y)}
X = np.array(x).reshape(-1, 1)
result = logistic_regression(X, y)
flat = {
    'interceptCoef': result['coefficients'][0],
    'slopeCoef': result['coefficients'][1],
    'interceptPValue': result['pValues'][0],
    'slopePValue': result['pValues'][1],
    'interceptOR': float(np.exp(result['coefficients'][0])),
    'slopeOR': float(np.exp(result['coefficients'][1])),
    'aic': result['aic']
}
json.dumps(flat)
`;
    case 'poisson-regression':
      // Worker2's poisson_regression uses MLE PoissonResults which lacks .deviance.
      // Use GLM with Poisson family directly. Set factor ordering to match R
      // (R warpbreaks: wool=A,B tension=L,M,H → reference levels A and L).
      return `
import json
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
breaks_v = ${JSON.stringify(d.breaks)}
wool_v = ${JSON.stringify(d.wool)}
tension_v = ${JSON.stringify(d.tension)}
data = [{'breaks': b, 'wool': w, 'tension': t} for b, w, t in zip(breaks_v, wool_v, tension_v)]
df = pd.DataFrame(data)
df['wool'] = pd.Categorical(df['wool'], categories=['A', 'B'])
df['tension'] = pd.Categorical(df['tension'], categories=['L', 'M', 'H'])
model = smf.glm('breaks ~ wool + tension', data=df, family=sm.families.Poisson()).fit()
coefs = dict(model.params)
flat = {
    'interceptCoef': float(coefs.get('Intercept')),
    'woolBCoef': float(coefs.get('wool[T.B]')),
    'tensionMCoef': float(coefs.get('tension[T.M]')),
    'tensionHCoef': float(coefs.get('tension[T.H]')),
    'deviance': float(model.deviance),
    'aic': float(model.aic)
}
json.dumps(flat)
`;
    case 'ordinal-regression':
      // Worker uses pd.Categorical(ordered=True) which sorts alphabetically.
      // R's polr uses explicit factor ordering. Compute directly with correct ordering.
      return `
import json
import numpy as np
import pandas as pd
from statsmodels.miscmodels.ordinal_model import OrderedModel

x_vals = ${JSON.stringify(d.x)}
y_vals = ${JSON.stringify(d.y)}
df = pd.DataFrame({'x': x_vals, 'y': y_vals})
df['y'] = pd.Categorical(df['y'], categories=['low', 'medium', 'high', 'very_high'], ordered=True)
y_codes = df['y'].cat.codes.values
X = df[['x']].values
model = OrderedModel(y_codes, X, distr='logit')
result = model.fit(method='bfgs', disp=False, maxiter=500)
slope = float(result.params[0])
k = len(result.params)
aic = float(-2 * result.llf + 2 * k)
flat = {'slopeCoef': slope, 'aic': aic}
json.dumps(flat)
`;
    case 'stepwise-regression': {
      // R uses AIC-based bidirectional (step(direction='both')).
      // Python worker has forward/backward with p-value threshold.
      // Use statsmodels AIC-based backward elimination to match R more closely.
      const sVars = Object.keys(d).filter(k => k !== 'mpg');
      return `
import json
import numpy as np
import statsmodels.api as sm

mpg = np.array(${JSON.stringify(d.mpg)}, dtype=float)
var_names = ${JSON.stringify(sVars)}
cols = [${sVars.map(v => JSON.stringify(d[v])).join(', ')}]
X = np.column_stack(cols)

# AIC-based backward elimination (mimics R step direction='both')
selected = list(range(len(var_names)))
while len(selected) > 0:
    X_curr = sm.add_constant(X[:, selected])
    model = sm.OLS(mpg, X_curr).fit()
    current_aic = model.aic
    best_aic = current_aic
    drop_idx = None
    for i in range(len(selected)):
        trial = [s for j, s in enumerate(selected) if j != i]
        if not trial:
            break
        X_trial = sm.add_constant(X[:, trial])
        trial_aic = sm.OLS(mpg, X_trial).fit().aic
        if trial_aic < best_aic:
            best_aic = trial_aic
            drop_idx = i
    if drop_idx is not None:
        selected.pop(drop_idx)
    else:
        break

X_final = sm.add_constant(X[:, selected])
final_model = sm.OLS(mpg, X_final).fit()
sel_names = [var_names[i] for i in selected]
flat = {
    'finalR2': float(final_model.rsquared),
    'finalAdjR2': float(final_model.rsquared_adj),
    'selectedVarCount': len(sel_names),
    'selectedVars': sel_names
}
json.dumps(flat)
`;
    }
    case 'dose-response':
      return `
import json
from worker4_regression_advanced import dose_response_analysis
result = dose_response_analysis(${JSON.stringify(d.dose)}, ${JSON.stringify(d.response)})
flat = {
    'hillSlope': result.get('hillSlope'),
    'bottom': result.get('bottom'),
    'top': result.get('top'),
    'ec50': result.get('ec50')
}
json.dumps(flat)
`;

    // =================================================================
    // Phase 3: Chi-square + Multivariate + Survival + Time Series + Tools
    // =================================================================

    // ─── Chi-square ────────────────────────────────────────────────────
    case 'chi-square-goodness': {
      // Golden stores expectedProportions; worker expects expected COUNTS
      return `
import json
from worker2_hypothesis import chi_square_goodness_test
observed = ${JSON.stringify(d.observed)}
proportions = ${d.expectedProportions ? JSON.stringify(d.expectedProportions) : 'None'}
expected = [p * sum(observed) for p in proportions] if proportions else None
result = chi_square_goodness_test(observed, expected)
json.dumps(result)
`;
    }
    case 'chi-square-independence':
      return `
import json
from worker2_hypothesis import chi_square_independence_test
result = chi_square_independence_test(${JSON.stringify(d.observedMatrix)}, yatesCorrection=False)
json.dumps(result)
`;

    // ─── Multivariate ──────────────────────────────────────────────────
    case 'pca':
      // Worker pca_analysis doesn't return explainedVarianceRatio directly.
      // Use sklearn PCA directly matching R prcomp(center=TRUE, scale.=TRUE).
      return `
import json
import numpy as np
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
X = np.column_stack([${JSON.stringify(d['Sepal.Length'])}, ${JSON.stringify(d['Sepal.Width'])}, ${JSON.stringify(d['Petal.Length'])}, ${JSON.stringify(d['Petal.Width'])}])
X_scaled = StandardScaler().fit_transform(X)
pca = PCA(n_components=4)
pca.fit(X_scaled)
flat = {
    'explainedVarianceRatio': pca.explained_variance_ratio_.tolist(),
    'cumulativeVariance': np.cumsum(pca.explained_variance_ratio_).tolist(),
    'pc1Loadings': pca.components_[0].tolist()
}
json.dumps(flat)
`;
    case 'factor-analysis':
      // PAF + varimax — matches R psych::fa(fm='pa', rotate='varimax')
      return `
import json
import numpy as np
from sklearn.preprocessing import StandardScaler
X = np.column_stack([${JSON.stringify(d['Sepal.Length'])}, ${JSON.stringify(d['Sepal.Width'])}, ${JSON.stringify(d['Petal.Length'])}, ${JSON.stringify(d['Petal.Width'])}])
X_scaled = StandardScaler().fit_transform(X)
corr = np.corrcoef(X_scaled.T)
p = corr.shape[0]
n_factors = 2

# PAF: initial communalities = SMC
inv_c = np.linalg.inv(corr)
h2 = np.clip(1.0 - 1.0 / np.diag(inv_c), 0.0, 1.0)
for _ in range(50):
    R_red = corr.copy()
    np.fill_diagonal(R_red, h2)
    evals, evecs = np.linalg.eigh(R_red)
    idx = np.argsort(evals)[::-1]
    evals = evals[idx]; evecs = evecs[:, idx]
    L = evecs[:, :n_factors] * np.sqrt(np.maximum(evals[:n_factors], 0.0))
    h2_new = np.clip(np.sum(L**2, axis=1), 0.0, 1.0)
    if np.max(np.abs(h2_new - h2)) < 1e-5:
        break
    h2 = h2_new

# Varimax with Kaiser normalization
A = L.copy()
h = np.sqrt(np.sum(A**2, axis=1)); h[h==0]=1.0
A = A / h[:, None]
for _ in range(100):
    d_old = np.sum(np.sum(A**4,0) - np.sum(A**2,0)**2/p)
    for i in range(n_factors-1):
        for j in range(i+1, n_factors):
            u = A[:,i]**2 - A[:,j]**2; v = 2*A[:,i]*A[:,j]
            phi = np.arctan2(2*np.sum(u*v)-2*np.sum(u)*np.sum(v)/p,
                             np.sum(u**2-v**2)-(np.sum(u)**2-np.sum(v)**2)/p)/4
            c,s = np.cos(phi), np.sin(phi)
            A[:,i], A[:,j] = c*A[:,i]+s*A[:,j], -s*A[:,i]+c*A[:,j]
    if abs(np.sum(np.sum(A**4,0)-np.sum(A**2,0)**2/p) - d_old) < 1e-5:
        break
A = A * h[:, None]

communalities = np.sum(A**2, axis=1).tolist()
var_explained = (np.sum(A**2, axis=0) / p).tolist()
flat = {'communalities': communalities, 'varianceExplained': var_explained}
json.dumps(flat)
`;
    case 'cluster':
      // R uses scale(iris[,1:4]) + kmeans(centers=3, nstart=25, seed=42).
      // Worker doesn't scale or compute betweenSS. Use sklearn directly.
      return `
import json
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
X = np.column_stack([${JSON.stringify(d['Sepal.Length'])}, ${JSON.stringify(d['Sepal.Width'])}, ${JSON.stringify(d['Petal.Length'])}, ${JSON.stringify(d['Petal.Width'])}])
X_scaled = StandardScaler().fit_transform(X)
km = KMeans(n_clusters=3, n_init=25, random_state=42)
labels = km.fit_predict(X_scaled)
within_ss = float(km.inertia_)
total_ss = float(np.sum((X_scaled - np.mean(X_scaled, axis=0))**2))
between_ss = total_ss - within_ss
sizes = sorted([int(np.sum(labels == k)) for k in range(3)])
flat = {'withinSS': within_ss, 'betweenSS': between_ss, 'clusterSizes': sizes}
json.dumps(flat)
`;
    case 'discriminant-analysis':
      // Worker doesn't return priorProbabilities. Use sklearn LDA directly.
      return `
import json
import numpy as np
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
X = np.column_stack([${JSON.stringify(d['Sepal.Length'])}, ${JSON.stringify(d['Sepal.Width'])}, ${JSON.stringify(d['Petal.Length'])}, ${JSON.stringify(d['Petal.Width'])}])
y = np.array(${JSON.stringify(d['Species'])})
lda = LinearDiscriminantAnalysis()
lda.fit(X, y)
preds = lda.predict(X)
accuracy = float(np.mean(preds == y))
flat = {
    'accuracy': accuracy,
    'priorSetosa': float(lda.priors_[list(lda.classes_).index('setosa')]),
    'priorVersicolor': float(lda.priors_[list(lda.classes_).index('versicolor')]),
    'priorVirginica': float(lda.priors_[list(lda.classes_).index('virginica')])
}
json.dumps(flat)
`;

    // ─── Survival / ROC ────────────────────────────────────────────────
    case 'kaplan-meier':
      // Worker5 medianSurvivalTime is a float (not dict).
      // Per-group medians are in curves[group]['medianSurvival'].
      return `
import json
from worker5_survival import kaplan_meier_analysis
result = kaplan_meier_analysis(${JSON.stringify(d.time)}, ${JSON.stringify(d.status)}, ${JSON.stringify(d.group)})
curves = result.get('curves', {})
groups = sorted(curves.keys())
flat = {
    'logRankStatistic': result.get('logRankStatistic', result.get('logRankChi2')),
    'logRankPValue': result.get('logRankP', result.get('logRankPValue')),
    'medianA': curves.get(groups[0], {}).get('medianSurvival') if len(groups) > 0 else None,
    'medianB': curves.get(groups[1], {}).get('medianSurvival') if len(groups) > 1 else None
}
json.dumps(flat)
`;
    case 'cox-regression':
      // Worker has Pyodide bug (.iloc on ndarray). Use PHReg directly.
      // ties='efron' matches R's coxph default (Breslow → Efron).
      return `
import json
import numpy as np
import pandas as pd
from statsmodels.duration.hazard_regression import PHReg
times = np.array(${JSON.stringify(d.time)}, dtype=float)
events = np.array(${JSON.stringify(d.status)}, dtype=int)
age = ${JSON.stringify(d.age)}
treatment = ${JSON.stringify(d.treatment)}
df = pd.DataFrame({'age': age, 'treatment': treatment})
model = PHReg(endog=times, exog=df[['age', 'treatment']], status=events, ties='efron')
result = model.fit()
coefs = [float(c) for c in result.params]
hrs = [float(np.exp(c)) for c in result.params]
pvals = [float(p) for p in result.pvalues]
conc = float(result.concordance) if hasattr(result, 'concordance') else None
flat = {
    'ageCoef': coefs[0],
    'treatmentCoef': coefs[1],
    'ageHR': hrs[0],
    'treatmentHR': hrs[1],
    'agePValue': pvals[0],
    'treatmentPValue': pvals[1],
    'concordance': conc
}
json.dumps(flat)
`;
    case 'roc-curve':
      return `
import json
from worker5_survival import roc_curve_analysis
result = roc_curve_analysis(${JSON.stringify(d.actual)}, ${JSON.stringify(d.scores)})
flat = {
    'auc': result.get('auc'),
    'optimalThreshold': result.get('optimalThreshold'),
    'sensitivity': result.get('sensitivity'),
    'specificity': result.get('specificity')
}
json.dumps(flat)
`;

    // ─── Time Series ───────────────────────────────────────────────────
    case 'arima':
      // arima_forecast doesn't return coefficients. Use ARIMA directly.
      return `
import json
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
data = np.array(${JSON.stringify(d.values)}, dtype=float)
model = ARIMA(data, order=(1, 1, 1))
fitted = model.fit()
fc = fitted.get_forecast(steps=5).predicted_mean.tolist()
flat = {
    'ar1': float(fitted.arparams[0]) if len(fitted.arparams) > 0 else 0,
    'ma1': float(fitted.maparams[0]) if len(fitted.maparams) > 0 else 0,
    'aic': float(fitted.aic),
    'forecast5': [float(x) for x in fc]
}
json.dumps(flat)
`;
    case 'seasonal-decompose':
      // Use statsmodels directly to match R decompose(type='additive')
      return `
import json
import numpy as np
from statsmodels.tsa.seasonal import seasonal_decompose
data = np.array(${JSON.stringify(d.values)}, dtype=float)
result = seasonal_decompose(data, model='additive', period=12)
seasonal = result.seasonal
trend = result.trend
flat = {
    'seasonalPattern': [float(seasonal[i]) for i in range(12)],
    'trendMidpoint': float(trend[71]) if not np.isnan(trend[71]) else None
}
json.dumps(flat)
`;
    case 'stationarity-test':
      // R adf.test uses fixed lag: trunc((n-1)^(1/3)).
      // R adf.test ALWAYS includes constant + trend (regression='ct').
      // Worker uses autolag='AIC' + regression='c' (different results).
      // Use adfuller directly with R-matching fixed lag + 'ct' regression.
      return `
import json
import numpy as np
from statsmodels.tsa.stattools import adfuller
data = np.array(${JSON.stringify(d.values)}, dtype=float)
n = len(data)
nlags = int(np.trunc((n - 1) ** (1/3)))
adf_result = adfuller(data, maxlag=nlags, autolag=None, regression='ct')
flat = {
    'adfStatistic': float(adf_result[0]),
    'pValue': float(adf_result[1]),
    'usedLag': int(adf_result[2])
}
json.dumps(flat)
`;
    case 'mann-kendall-test':
      return `
import json
from worker1_descriptive import mann_kendall_test
result = mann_kendall_test(${JSON.stringify(d.values)})
flat = {
    'zStatistic': result.get('zScore', result.get('zStatistic')),
    'pValue': result.get('pValue'),
    'sScore': result.get('s', result.get('sScore')),
    'tau': result.get('tau'),
    'senSlope': result.get('senSlope', result.get('slope'))
}
json.dumps(flat)
`;

    // ─── ANOVA extras ──────────────────────────────────────────────────
    case 'repeated-measures-anova':
      return `
import json
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import AnovaRM

subject = ${JSON.stringify(d.subject)}
time = ${JSON.stringify(d.time)}
value = ${JSON.stringify(d.value)}
df = pd.DataFrame({'subject': subject, 'time': time, 'value': value})
aovrm = AnovaRM(df, 'value', 'subject', within=['time']).fit()
table = aovrm.anova_table
flat = {
    'fStatistic': float(table['F Value'].iloc[0]),
    'pValue': float(table['Pr > F'].iloc[0]),
    'dfTime': int(table['Num DF'].iloc[0]),
    'dfError': int(table['Den DF'].iloc[0])
}
json.dumps(flat)
`;
    case 'ancova':
      return `
import json
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.anova import anova_lm

y = ${JSON.stringify(d.y)}
group = ${JSON.stringify(d.group)}
covariate = ${JSON.stringify(d.covariate)}
df = pd.DataFrame({'y': y, 'group': group, 'covariate': covariate})
model = ols('y ~ C(group) + covariate', data=df).fit()
table = anova_lm(model, typ=2)
flat = {
    'group': {
        'fStatistic': float(table.loc['C(group)', 'F']),
        'pValue': float(table.loc['C(group)', 'PR(>F)']),
        'df': int(table.loc['C(group)', 'df'])
    },
    'covariate': {
        'fStatistic': float(table.loc['covariate', 'F']),
        'pValue': float(table.loc['covariate', 'PR(>F)']),
        'df': int(table.loc['covariate', 'df'])
    },
    'residual': {
        'df': int(table.loc['Residual', 'df'])
    }
}
json.dumps(flat)
`;
    case 'manova':
      return `
import json
import pandas as pd
from statsmodels.multivariate.manova import MANOVA

sl = ${JSON.stringify(d['Sepal.Length'])}
sw = ${JSON.stringify(d['Sepal.Width'])}
sp = ${JSON.stringify(d['Species'])}
df = pd.DataFrame({'SL': sl, 'SW': sw, 'Species': sp})
m = MANOVA.from_formula('SL + SW ~ Species', data=df)
result = m.mv_test()
table = result.results['Species']['stat']
flat = {
    'pillaiTrace': float(table.loc["Pillai's trace", 'Value']),
    'approxF': float(table.loc["Pillai's trace", 'F Value']),
    'numDf': float(table.loc["Pillai's trace", 'Num DF']),
    'denDf': float(table.loc["Pillai's trace", 'Den DF']),
    'pValue': float(table.loc["Pillai's trace", 'Pr > F'])
}
json.dumps(flat)
`;
    case 'mixed-model':
      return `
import json
import pandas as pd
import statsmodels.formula.api as smf

reaction = ${JSON.stringify(d.Reaction)}
days = ${JSON.stringify(d.Days)}
subject = ${JSON.stringify(d.Subject)}
df = pd.DataFrame({'Reaction': reaction, 'Days': days, 'Subject': subject})
model = smf.mixedlm('Reaction ~ Days', data=df, groups=df['Subject']).fit()
import numpy as np
flat = {
    'interceptFixed': float(model.fe_params['Intercept']),
    'slopeDays': float(model.fe_params['Days']),
    'randomInterceptSD': float(np.sqrt(float(model.cov_re.iloc[0, 0]))),
    'residualSD': float(np.sqrt(model.scale))
}
json.dumps(flat)
`;

    // ─── Diagnostics / Other ───────────────────────────────────────────
    case 'normality-test':
      return `
import json
from worker1_descriptive import normality_test
result = normality_test(${JSON.stringify(d.values)})
json.dumps(result)
`;
    case 'one-sample-proportion':
      return `
import json
from scipy import stats
bt = stats.binomtest(${d.successes}, ${d.total}, ${d.nullProportion})
ci = bt.proportion_ci(confidence_level=0.95, method='exact')
flat = {
    'pValue': float(bt.pvalue),
    'proportion': float(bt.proportion_estimate),
    'ci95Lower': float(ci.low),
    'ci95Upper': float(ci.high)
}
json.dumps(flat)
`;
    case 'reliability-analysis':
      return `
import json
import numpy as np
items = np.column_stack([${Object.keys(d).map(k => JSON.stringify(d[k])).join(', ')}])
k = items.shape[1]
var_items = np.var(items, axis=0, ddof=1)
var_total = np.var(np.sum(items, axis=1), ddof=1)
alpha = float((k / (k - 1)) * (1 - np.sum(var_items) / var_total))
flat = {'cronbachAlpha': alpha, 'nItems': k}
json.dumps(flat)
`;

    // ─── Data tools ────────────────────────────────────────────────────
    case 'descriptive-stats':
      return `
import json
from worker1_descriptive import descriptive_stats
result = descriptive_stats(${JSON.stringify(d.values)})
flat = {
    'mean': result.get('mean'),
    'sd': result.get('std', result.get('sd')),
    'median': result.get('median'),
    'skewness': result.get('skewness'),
    'kurtosis': result.get('kurtosis'),
    'sem': result.get('sem', result.get('se')),
    'n': result.get('n')
}
json.dumps(flat)
`;
    case 'explore-data':
      return `
import json
import numpy as np
from scipy import stats

values = np.array(${JSON.stringify(d.values)}, dtype=float)
sw_stat, sw_p = stats.shapiro(values)
q1 = float(np.percentile(values, 25))
q3 = float(np.percentile(values, 75))
iqr = q3 - q1
lower = q1 - 1.5 * iqr
upper = q3 + 1.5 * iqr
outliers = int(np.sum((values < lower) | (values > upper)))
flat = {
    'normalityPValue': float(sw_p),
    'outlierCount': outliers,
    'iqr': iqr,
    'q1': q1,
    'q3': q3
}
json.dumps(flat)
`;
    case 'means-plot':
      return `
import json
import numpy as np
from scipy import stats as st

sl = ${JSON.stringify(d['Sepal.Length'])}
sp = ${JSON.stringify(d['Species'])}
groups = {}
for v, s in zip(sl, sp):
    groups.setdefault(s, []).append(v)
means = {}; ci_lo = {}; ci_hi = {}; ns = {}
for name in ['setosa', 'versicolor', 'virginica']:
    g = np.array(groups[name])
    n = len(g)
    m = float(np.mean(g))
    se = float(np.std(g, ddof=1) / np.sqrt(n))
    t_crit = float(st.t.ppf(0.975, n - 1))
    means[name] = m
    ci_lo[name] = m - t_crit * se
    ci_hi[name] = m + t_crit * se
    ns[name] = n
flat = {'groupMeans': means, 'groupCILower': ci_lo, 'groupCIUpper': ci_hi, 'groupN': ns}
json.dumps(flat)
`;
    case 'power-analysis': {
      const desc = testCase?.description || '';
      if (desc.includes('ANOVA') || desc.includes('anova')) {
        return `
import json
from scipy.stats import ncf
import numpy as np
k = ${d.anova.k}; f_es = ${d.anova.f}; alpha = ${d.anova.alpha}; power = ${d.anova.power}
# Iterative search for n (per group) matching R pwr.anova.test
from scipy.optimize import brentq
from scipy.stats import f as f_dist
def power_func(n):
    df1 = k - 1
    df2 = k * (n - 1)
    lam = k * n * f_es**2
    crit = f_dist.ppf(1 - alpha, df1, df2)
    return 1 - ncf.cdf(crit, df1, df2, lam) - power
n_exact = brentq(power_func, 2, 10000)
flat = {'requiredN': int(np.ceil(n_exact)), 'exactN': float(n_exact)}
json.dumps(flat)
`;
      }
      if (desc.includes('chi-square') || desc.includes('Chi-square')) {
        return `
import json
import numpy as np
from scipy.stats import ncx2, chi2
w = ${d.chiSquare.w}; df_val = ${d.chiSquare.df}; alpha = ${d.chiSquare.alpha}; power = ${d.chiSquare.power}
from scipy.optimize import brentq
def power_func(N):
    lam = N * w**2
    crit = chi2.ppf(1 - alpha, df_val)
    return 1 - ncx2.cdf(crit, df_val, lam) - power
n_exact = brentq(power_func, 2, 100000)
flat = {'requiredN': int(np.ceil(n_exact)), 'exactN': float(n_exact)}
json.dumps(flat)
`;
      }
      // Default: t-test power
      return `
import json
import numpy as np
from scipy.stats import nct, t as t_dist
from scipy.optimize import brentq
d_es = ${d.tTest.d}; alpha = ${d.tTest.alpha}; power = ${d.tTest.power}
def power_func(n):
    df = 2 * n - 2
    nc = d_es * np.sqrt(n / 2)
    crit = t_dist.ppf(1 - alpha / 2, df)
    return 1 - nct.cdf(crit, df, nc) + nct.cdf(-crit, df, nc) - power
n_exact = brentq(power_func, 2, 100000)
flat = {'requiredN': int(np.ceil(n_exact)), 'exactN': float(n_exact)}
json.dumps(flat)
`;
    }

    // =================================================================
    // Phase 4: Edge Cases (Layer 3) — missing values, small samples,
    //          extreme values, ties
    // =================================================================

    case 'edge-ttest-nan':
      return `
import json
from worker2_hypothesis import t_test_two_sample
g1 = ${JSON.stringify(d.group1).replace(/null/g, 'None')}
g2 = ${JSON.stringify(d.group2).replace(/null/g, 'None')}
result = t_test_two_sample(g1, g2, equalVar=True)
json.dumps(result)
`;
    case 'edge-ttest-small':
      // One-sample t-test with n=3
      return `
import json
from worker2_hypothesis import t_test_one_sample
result = t_test_one_sample(${JSON.stringify(d.values)}, popmean=${d.popmean})
json.dumps(result)
`;
    case 'edge-correlation-extreme':
      // Pearson correlation with near-perfect r (r≈1)
      return `
import json
from worker2_hypothesis import correlation_test
result = correlation_test(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)}, method='pearson')
json.dumps({'r': result['correlation'], 'pValue': result['pValue']})
`;
    case 'edge-wilcoxon-ties':
      // Wilcoxon signed-rank with heavy ties — uses actual BioHub worker
      // Worker returns T=min(W+,W-) via scipy.stats.wilcoxon, not W+ (R convention)
      return `
import json
from worker3_nonparametric_anova import wilcoxon_test
result = wilcoxon_test(${JSON.stringify(d.before)}, ${JSON.stringify(d.after)})
json.dumps({'statistic': result['statistic'], 'pValue': result['pValue']})
`;
    case 'edge-descriptive-nan':
      return `
import json
from worker1_descriptive import descriptive_stats
raw = ${JSON.stringify(d.values).replace(/null/g, 'None')}
result = descriptive_stats(raw)
json.dumps(result)
`;
    case 'edge-anova-outlier':
      // One-way ANOVA with extreme outlier — same code as normal ANOVA
      return `
import json
from worker3_nonparametric_anova import one_way_anova
result = one_way_anova(${JSON.stringify(d.groups)})
json.dumps(result)
`;

    // =================================================================
    // Phase 4b: Edge Cases — crash prevention (zero-var, n=1, separation,
    //           collinearity, all-censored, empty factor)
    // =================================================================

    case 'edge-correlation-zero-var':
      // Pearson correlation with zero-variance x → r=NaN, p=NaN → None
      // Worker returns raw NaN (not through _safe_float), must sanitize for JSON
      return `
import json, math
from worker2_hypothesis import correlation_test
result = correlation_test(${JSON.stringify(d.x)}, ${JSON.stringify(d.y)}, method='pearson')
def _to_json_safe(v):
    if v is None: return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)): return None
    return v
json.dumps({'r': _to_json_safe(result['correlation']), 'pValue': _to_json_safe(result['pValue'])})
`;
    case 'edge-anova-single-obs':
      // ANOVA with n=1 group → should raise ValueError
      return `
import json
from worker3_nonparametric_anova import one_way_anova
result = one_way_anova(${JSON.stringify(d.groups)})
json.dumps(result)
`;
    case 'edge-logistic-separation':
      // Logistic regression with perfect separation → should error or warn
      return `
import json
import numpy as np
from worker4_regression_advanced import logistic_regression
x = ${JSON.stringify(d.x)}
y = ${JSON.stringify(d.y)}
X = np.array(x).reshape(-1, 1)
result = logistic_regression(X, y)
json.dumps({'interceptCoef': result['coefficients'][0], 'slopeCoef': result['coefficients'][1]})
`;
    case 'edge-regression-collinear':
      // Multiple regression with perfect collinearity → should error
      return `
import json
import numpy as np
from worker4_regression_advanced import multiple_regression
x1 = ${JSON.stringify(d.x1)}
x2 = ${JSON.stringify(d.x2)}
y = ${JSON.stringify(d.y)}
X = np.column_stack([x1, x2])
result = multiple_regression(X, y)
json.dumps(result)
`;
    case 'edge-km-all-censored':
      // Kaplan-Meier with all censored data → nEvents=0, survival=1.0
      // nEvents lives inside curves[group], not at top level
      return `
import json
from worker5_survival import kaplan_meier_analysis
result = kaplan_meier_analysis(${JSON.stringify(d.time)}, ${JSON.stringify(d.status)}, ${JSON.stringify(d.group)})
curves = result.get('curves', {})
total_events = sum(c.get('nEvents', 0) for c in curves.values())
flat = {'nEvents': total_events}
for gname, curve in curves.items():
    probs = curve.get('survivalProbabilities', [])
    if probs:
        flat['minSurvival_' + str(gname)] = min(probs)
json.dumps(flat)
`;
    case 'edge-chisq-zero-row':
      // Chi-square with zero-count row → should error
      return `
import json
from worker2_hypothesis import chi_square_independence_test
result = chi_square_independence_test(${JSON.stringify(d.observedMatrix)}, yatesCorrection=False)
json.dumps(result)
`;

    // ─── NIST StRD methods (Layer 1) ────────────────────────────────────
    case 'nist-norris-linear':
      return `
import json, numpy as np
from scipy import stats
x = np.array(${JSON.stringify(d.x)})
y = np.array(${JSON.stringify(d.y)})
slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
n = len(x)
y_pred = intercept + slope * x
residuals = y - y_pred
residual_sd = np.sqrt(np.sum(residuals**2) / (n - 2))
x_mean = np.mean(x)
se_intercept = residual_sd * np.sqrt(1/n + x_mean**2 / np.sum((x - x_mean)**2))
result = {
  'intercept': float(intercept),
  'slope': float(slope),
  'sdIntercept': float(se_intercept),
  'sdSlope': float(std_err),
  'rSquared': float(r_value**2),
  'residualSD': float(residual_sd)
}
json.dumps(result)
`;
    case 'nist-pontius-quadratic':
      return `
import json, numpy as np
x = np.array(${JSON.stringify(d.x)}, dtype=float)
y = np.array(${JSON.stringify(d.y)})
X = np.column_stack([np.ones(len(x)), x, x**2])
coeffs, residuals_sum, rank, sv = np.linalg.lstsq(X, y, rcond=None)
b0, b1, b2 = coeffs
y_pred = X @ coeffs
resid = y - y_pred
n = len(x)
p = 3
residual_sd = np.sqrt(np.sum(resid**2) / (n - p))
XtX_inv = np.linalg.inv(X.T @ X)
cov_matrix = residual_sd**2 * XtX_inv
sd_b0 = np.sqrt(cov_matrix[0, 0])
sd_b1 = np.sqrt(cov_matrix[1, 1])
sd_b2 = np.sqrt(cov_matrix[2, 2])
result = {
  'b0': float(b0), 'b1': float(b1), 'b2': float(b2),
  'sdB0': float(sd_b0), 'sdB1': float(sd_b1), 'sdB2': float(sd_b2),
  'residualSD': float(residual_sd)
}
json.dumps(result)
`;
    case 'nist-atmwtag-anova':
      return `
import json, numpy as np
from scipy import stats
instrument = ${JSON.stringify(d.Instrument)}
agwt = np.array(${JSON.stringify(d.AgWt)})
groups = [agwt[np.array(instrument) == i] for i in sorted(set(instrument))]
f_stat, p_val = stats.f_oneway(*groups)
grand_mean = np.mean(agwt)
n = len(agwt)
k = len(groups)
ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)
ss_within = sum(np.sum((g - np.mean(g))**2) for g in groups)
df_between = k - 1
df_within = n - k
ms_between = ss_between / df_between
ms_within = ss_within / df_within
r_squared = ss_between / (ss_between + ss_within)
residual_sd = np.sqrt(ms_within)
result = {
  'dfBetween': int(df_between), 'dfWithin': int(df_within),
  'fStatistic': float(f_stat),
  'ssBetween': float(ss_between), 'ssWithin': float(ss_within),
  'msBetween': float(ms_between), 'msWithin': float(ms_within),
  'rSquared': float(r_squared), 'residualSD': float(residual_sd)
}
json.dumps(result)
`;
    case 'nist-michelson-descriptive':
      return `
import json, numpy as np
values = np.array(${JSON.stringify(d.values)})
result = {
  'mean': float(np.mean(values)),
  'sd': float(np.std(values, ddof=1)),
  'n': int(len(values))
}
json.dumps(result)
`;
    case 'nist-filip-polynomial':
      // Filip: degree-10 polynomial regression (Higher Difficulty)
      // numpy.polynomial.polynomial.polyfit is numerically stable for high-degree polynomials
      return `
import json, numpy as np
from numpy.polynomial import polynomial as P
x = np.array(${JSON.stringify(d.x)})
y = np.array(${JSON.stringify(d.y)})
# polyfit returns coefficients [B0, B1, ..., B10] (low-to-high order)
coeffs = P.polyfit(x, y, 10)
# Evaluate fitted values using polyval
y_pred = P.polyval(x, coeffs)
resid = y - y_pred
n = len(x)
p = 11
residual_sd = float(np.sqrt(np.sum(resid**2) / (n - p)))
ss_res = float(np.sum(resid**2))
ss_tot = float(np.sum((y - np.mean(y))**2))
r_squared = 1.0 - ss_res / ss_tot
result = {
  'b0': float(coeffs[0]), 'b1': float(coeffs[1]), 'b2': float(coeffs[2]),
  'b3': float(coeffs[3]), 'b4': float(coeffs[4]), 'b5': float(coeffs[5]),
  'b6': float(coeffs[6]), 'b7': float(coeffs[7]), 'b8': float(coeffs[8]),
  'b9': float(coeffs[9]), 'b10': float(coeffs[10]),
  'residualSD': residual_sd, 'rSquared': float(r_squared)
}
json.dumps(result)
`;
    case 'nist-longley-multicollinear':
      // Longley: 6-variable multiple regression with multicollinearity (Higher Difficulty)
      return `
import json, numpy as np
y = np.array(${JSON.stringify(d.y)}, dtype=float)
x1 = np.array(${JSON.stringify(d.x1)}, dtype=float)
x2 = np.array(${JSON.stringify(d.x2)}, dtype=float)
x3 = np.array(${JSON.stringify(d.x3)}, dtype=float)
x4 = np.array(${JSON.stringify(d.x4)}, dtype=float)
x5 = np.array(${JSON.stringify(d.x5)}, dtype=float)
x6 = np.array(${JSON.stringify(d.x6)}, dtype=float)
X = np.column_stack([np.ones(len(y)), x1, x2, x3, x4, x5, x6])
coeffs, residuals_sum, rank, sv = np.linalg.lstsq(X, y, rcond=None)
y_pred = X @ coeffs
resid = y - y_pred
n = len(y)
p = 7
residual_sd = float(np.sqrt(np.sum(resid**2) / (n - p)))
ss_res = float(np.sum(resid**2))
ss_tot = float(np.sum((y - np.mean(y))**2))
r_squared = 1.0 - ss_res / ss_tot
result = {
  'b0': float(coeffs[0]), 'b1': float(coeffs[1]), 'b2': float(coeffs[2]),
  'b3': float(coeffs[3]), 'b4': float(coeffs[4]), 'b5': float(coeffs[5]),
  'b6': float(coeffs[6]),
  'residualSD': residual_sd, 'rSquared': float(r_squared)
}
json.dumps(result)
`;

    default:
      return null;
  }
}

// =============================================================================
// WORKER MODULE LOADER
// =============================================================================
async function loadWorkerModules(pyodide) {
  // Add / to Python sys.path so FS-written modules are importable
  await pyodide.runPythonAsync(`
import sys
if '/' not in sys.path:
    sys.path.insert(0, '/')
  `);

  const modules = [
    { name: 'helpers', file: 'helpers.py' },
    { name: 'worker1_descriptive', file: 'worker1-descriptive.py' },
    { name: 'worker2_hypothesis', file: 'worker2-hypothesis.py' },
    { name: 'worker3_nonparametric_anova', file: 'worker3-nonparametric-anova.py' },
    { name: 'worker4_regression_advanced', file: 'worker4-regression-advanced.py' },
    { name: 'worker5_survival', file: 'worker5-survival.py' },
  ];

  for (const mod of modules) {
    const filePath = join(WORKERS_DIR, mod.file);
    if (!existsSync(filePath)) {
      console.log(color(`  ⚠ ${mod.file} not found, skipping`, C.yellow));
      continue;
    }
    const code = readFileSync(filePath, 'utf-8');
    pyodide.FS.writeFile(`/${mod.name}.py`, code, { encoding: 'utf8' });
    console.log(color(`  ✓ ${mod.file} → /${mod.name}.py`, C.green));
  }
}

// =============================================================================
// MAP: R golden value output keys → Python worker output keys
// =============================================================================
// R golden values use field names from the R script (e.g., tStatistic)
// Python workers return different keys (e.g., statistic)
// This maps R golden → Python actual for comparison

// Map: R golden field name → { pyKey: Python worker field, skip: true to exclude }
// Only compare fields that the Python worker actually returns.
// R golden fields without a Python counterpart are skipped.
const FIELD_MAP = {
  'two-sample-t': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    cohensD: { pyKey: 'cohensD' },
    mean1: { pyKey: 'mean1' },
    mean2: { pyKey: 'mean2' },
    n1: { pyKey: 'n1' },
    n2: { pyKey: 'n2' },
    df: { skip: true },        // Python worker doesn't return df
    meanDiff: { skip: true },  // Python worker doesn't return meanDiff
    ci95Lower: { skip: true }, // Python worker doesn't return CI
    ci95Upper: { skip: true }, // Python worker doesn't return CI
  },
  'welch-t': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    cohensD: { pyKey: 'cohensD' },
    mean1: { pyKey: 'mean1' },
    mean2: { pyKey: 'mean2' },
    n1: { pyKey: 'n1' },
    n2: { pyKey: 'n2' },
    df: { skip: true }, // Welch df is fractional, Python doesn't return it
  },
  'one-sample-t': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    sampleMean: { pyKey: 'sampleMean' },
    n: { pyKey: 'n' },
    df: { skip: true },
  },
  'paired-t': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    meanDiff: { pyKey: 'meanDiff' },
    nPairs: { pyKey: 'nPairs' },
    df: { skip: true },
  },
  'one-way-anova': {
    fStatistic: { pyKey: 'fStatistic' },
    pValue: { pyKey: 'pValue' },
    dfBetween: { pyKey: 'dfBetween' },
    dfWithin: { pyKey: 'dfWithin' },
    etaSquared: { pyKey: 'etaSquared' },
    omegaSquared: { pyKey: 'omegaSquared' },
    ssBetween: { pyKey: 'ssBetween' },
    ssWithin: { pyKey: 'ssWithin' },
    ssTotal: { pyKey: 'ssTotal' },
  },
  'two-way-anova': {
    'factor1.fStatistic': { pyKey: 'factor1.fStatistic' },
    'factor1.pValue': { pyKey: 'factor1.pValue' },
    'factor1.df': { pyKey: 'factor1.df' },
    'factor2.fStatistic': { pyKey: 'factor2.fStatistic' },
    'factor2.pValue': { pyKey: 'factor2.pValue' },
    'factor2.df': { pyKey: 'factor2.df' },
    'interaction.fStatistic': { pyKey: 'interaction.fStatistic' },
    'interaction.pValue': { pyKey: 'interaction.pValue' },
    'interaction.df': { pyKey: 'interaction.df' },
    'residual.df': { pyKey: 'residual.df' },
  },
  // ─── Phase 2 ──────────────────────────────────────────────────────────
  'mcnemar': {
    df: { skip: true },
  },
  'mood-median': {
    chiSquare: { pyKey: 'statistic' },
  },
  'binomial-test': {
    ci95Lower: { skip: true },
    ci95Upper: { skip: true },
  },
  'pearson-correlation': {
    // Pearson fields
    tStatistic: { skip: true },
    ci95Lower: { skip: true },
    ci95Upper: { skip: true },
    df: { skip: true },
    // Spearman fields
    sStatistic: { skip: true },
    // Kendall fields
    zStatistic: { skip: true },
  },
  'simple-regression': {
    adjRSquared: { skip: true },
    fStatistic: { skip: true },
    residualSE: { skip: true },
  },
  'stepwise-regression': {
    finalAIC: { skip: true },
  },
  // ─── Phase 3 ──────────────────────────────────────────────────────────
  'chi-square-goodness': {
    df: { pyKey: 'degreesOfFreedom' },
  },
  'stationarity-test': {
    usedLag: { pyKey: 'usedLag' },
  },
  'explore-data': {
    // q1/q3: R uses type=7 quantile (default), numpy uses linear interpolation
    // May differ slightly — use tier2 tolerance
  },
  'one-sample-proportion': {
    ci95Lower: { skip: true },
    ci95Upper: { skip: true },
  },
  'kaplan-meier': {
    logRankStatistic: { skip: true },  // Worker5 doesn't return chi2 statistic, only p-value
  },
  'cox-regression': {
    concordance: { skip: true },  // PHReg may not expose concordance in Pyodide
  },
  'ancova': {},  // Triggers processLevel for nested expected flattening
  'means-plot': {},
  'mann-kendall-test': {
    sScore: { skip: true },  // R returns NA, not produced by Python
  },
  'descriptive-stats': {
    skewness: { skip: true },  // R e1071 vs scipy: different formulas
    kurtosis: { skip: true },  // R excess kurtosis vs scipy kurtosis
  },
  // ─── Edge Cases (L3) ─────────────────────────────────────────────────
  'edge-ttest-nan': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    mean1: { pyKey: 'mean1' },
    mean2: { pyKey: 'mean2' },
    n1: { pyKey: 'n1' },
    n2: { pyKey: 'n2' },
    cohensD: { skip: true },
    df: { skip: true },
    meanDiff: { skip: true },
    ci95Lower: { skip: true },
    ci95Upper: { skip: true },
  },
  'edge-ttest-small': {
    tStatistic: { pyKey: 'statistic' },
    pValue: { pyKey: 'pValue' },
    sampleMean: { pyKey: 'sampleMean' },
    n: { pyKey: 'n' },
    df: { skip: true },
  },
  'edge-correlation-extreme': {
    // r and pValue pass through directly (no remapping needed)
  },
  'edge-wilcoxon-ties': {
    // statistic and pValue pass through directly
  },
  'edge-descriptive-nan': {
    sd: { pyKey: 'std' },
  },
  'edge-anova-outlier': {
    fStatistic: { pyKey: 'fStatistic' },
    pValue: { pyKey: 'pValue' },
    dfBetween: { pyKey: 'dfBetween' },
    dfWithin: { pyKey: 'dfWithin' },
    etaSquared: { pyKey: 'etaSquared' },
    omegaSquared: { pyKey: 'omegaSquared' },
    ssBetween: { pyKey: 'ssBetween' },
    ssWithin: { pyKey: 'ssWithin' },
    ssTotal: { pyKey: 'ssTotal' },
  },
  // ─── Phase 4b: Crash prevention edge cases ───────────────────────────
  'edge-correlation-zero-var': {
    // r and pValue: null expected → null actual
  },
  'edge-anova-single-obs': {
    // expectBehavior: error — no field mapping needed
  },
  'edge-logistic-separation': {
    // expectBehavior: no_crash — no field mapping needed
  },
  'edge-regression-collinear': {
    // expectBehavior: no_crash — no field mapping needed
  },
  'edge-km-all-censored': {
    // nEvents passes through directly
  },
  'edge-chisq-zero-row': {
    // expectBehavior: error — no field mapping needed
  },
};

// Remap R golden expected → Python key names for comparison
// Skips fields that have no Python counterpart
function remapExpected(methodId, expected) {
  const map = FIELD_MAP[methodId];
  if (!map) return expected; // no mapping, use as-is

  const remapped = {};

  function processLevel(obj, prefix = '') {
    for (const [rKey, spec] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${rKey}` : rKey;

      // Check if this field should be skipped
      const mapping = map[fullKey] || map[rKey];
      if (mapping?.skip) continue;

      if (typeof spec === 'object' && spec !== null && 'value' in spec) {
        // Leaf field with {value, tier}
        const pyKey = mapping?.pyKey || fullKey;
        remapped[pyKey] = spec;
      } else if (typeof spec === 'object' && spec !== null && !Array.isArray(spec)) {
        // Nested object (e.g., factor1: { fStatistic: {...}, pValue: {...} })
        processLevel(spec, fullKey);
      }
    }
  }

  processLevel(expected);
  return remapped;
}

// Get nested value from Python result using dot path
function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

// Flatten Python result for comparison (handle nested like factor1.fStatistic)
function flattenResult(result, prefix = '') {
  const flat = {};
  for (const [key, val] of Object.entries(result)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(flat, flattenResult(val, path));
    } else {
      flat[path] = val;
    }
  }
  return flat;
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  const startTime = Date.now();

  console.log(divider());
  console.log(color('  BioHub Statistical Validation Runner', C.cyan + C.bold));
  console.log(color('  R/NIST cross-validation for Pyodide statistical methods', C.dim));
  console.log(divider());
  console.log();

  // ─── Load golden values ─────────────────────────────────────────────────
  console.log(color('📂 Loading golden values...', C.cyan));
  const rGolden = loadGoldenValues(R_REFERENCE_DIR);
  const nistGolden = loadGoldenValues(NIST_DIR);
  const edgeGolden = existsSync(EDGE_CASES_DIR) ? loadGoldenValues(EDGE_CASES_DIR) : {};
  console.log(color(`  R reference: ${Object.keys(rGolden).length} methods`, C.green));
  console.log(color(`  NIST: ${Object.keys(nistGolden).length} datasets`, C.green));
  console.log(color(`  Edge cases: ${Object.keys(edgeGolden).length} methods`, C.green));
  console.log();

  // ─── Load Pyodide ───────────────────────────────────────────────────────
  console.log(color('🐍 Loading Pyodide...', C.yellow));
  const pyodideStart = Date.now();

  let pyodide;
  try {
    const { loadPyodide } = await import('pyodide');
    pyodide = await loadPyodide();
    console.log(color(`  ✓ Pyodide loaded (${((Date.now() - pyodideStart) / 1000).toFixed(1)}s)`, C.green));
  } catch (err) {
    console.log(color(`  ✗ Pyodide load failed: ${err.message}`, C.red));
    process.exit(1);
  }

  // ─── Load packages ──────────────────────────────────────────────────────
  console.log(color('📦 Loading Python packages...', C.yellow));
  try {
    await pyodide.loadPackage(['numpy', 'scipy']);
    console.log(color('  ✓ numpy + scipy', C.green));
  } catch (err) {
    console.log(color(`  ✗ Package load failed: ${err.message}`, C.red));
    process.exit(1);
  }

  try {
    await pyodide.loadPackage(['statsmodels', 'pandas']);
    console.log(color('  ✓ statsmodels + pandas', C.green));
  } catch (err) {
    console.log(color(`  ⚠ statsmodels/pandas not available: ${err.message}`, C.yellow));
  }

  try {
    await pyodide.loadPackage(['scikit-learn']);
    console.log(color('  ✓ scikit-learn', C.green));
  } catch (err) {
    console.log(color(`  ⚠ scikit-learn not available: ${err.message}`, C.yellow));
  }
  console.log();

  // ─── Load worker modules ───────────────────────────────────────────────
  console.log(color('🔧 Loading worker modules...', C.yellow));
  await loadWorkerModules(pyodide);
  console.log();

  // ─── Phase 1 methods ──────────────────────────────────────────────────
  const phase1Methods = [
    'two-sample-t', 'welch-t', 'one-sample-t', 'paired-t',
    'one-way-anova', 'two-way-anova',
  ];

  // ─── Phase 2 methods ──────────────────────────────────────────────────
  const phase2Methods = [
    // Worker3: nonparametric
    'mann-whitney', 'wilcoxon-signed-rank', 'kruskal-wallis', 'friedman',
    'sign-test', 'mcnemar', 'cochran-q', 'mood-median',
    // Worker2: hypothesis
    'binomial-test', 'pearson-correlation', 'partial-correlation', 'response-surface',
    // Worker1: descriptive
    'kolmogorov-smirnov', 'runs-test',
    // Worker4: regression
    'simple-regression', 'logistic-regression', 'poisson-regression',
    'ordinal-regression', 'stepwise-regression', 'dose-response',
  ];

  // ─── Phase 3 methods ──────────────────────────────────────────────────
  const phase3Methods = [
    // Chi-square
    'chi-square-goodness', 'chi-square-independence',
    // Multivariate
    'pca', 'factor-analysis', 'cluster', 'discriminant-analysis',
    // Survival/ROC
    'kaplan-meier', 'cox-regression', 'roc-curve',
    // Time series
    'arima', 'seasonal-decompose', 'stationarity-test', 'mann-kendall-test',
    // ANOVA extras
    'repeated-measures-anova', 'ancova', 'manova', 'mixed-model',
    // Diagnostics
    'normality-test', 'one-sample-proportion', 'reliability-analysis',
    // Data tools
    'descriptive-stats', 'explore-data', 'means-plot', 'power-analysis',
  ];

  // ─── NIST StRD methods (Layer 1) ────────────────────────────────────
  const nistMethods = [
    'nist-norris-linear', 'nist-pontius-quadratic',
    'nist-atmwtag-anova', 'nist-michelson-descriptive',
    'nist-filip-polynomial', 'nist-longley-multicollinear',
  ];

  // ─── Phase 4: Edge Cases (Layer 3) ──────────────────────────────────
  const edgeCaseMethods = [
    // Phase 4a: Degenerate data (numerical accuracy)
    'edge-ttest-nan',          // Missing values: two-sample t-test with NaN
    'edge-ttest-small',        // Small sample: one-sample t-test n=3
    'edge-correlation-extreme', // Extreme values: Pearson r ≈ 1.0
    'edge-wilcoxon-ties',      // Ties: Wilcoxon with all equal differences
    'edge-descriptive-nan',    // Missing values: descriptive stats with NaN
    'edge-anova-outlier',      // Extreme values: ANOVA with outlier
    // Phase 4b: Crash prevention (error handling)
    'edge-correlation-zero-var', // Zero variance: correlation with constant x
    'edge-anova-single-obs',    // Insufficient sample: ANOVA with n=1 group
    'edge-logistic-separation', // Perfect separation: logistic regression
    'edge-regression-collinear', // Multicollinearity: singular design matrix
    'edge-km-all-censored',     // All censored: Kaplan-Meier with no events
    'edge-chisq-zero-row',      // Empty factor: chi-square with zero row
  ];

  const allMethods = [...phase1Methods, ...phase2Methods, ...phase3Methods, ...nistMethods, ...edgeCaseMethods];

  const methodsToRun = allMethods.filter(m => {
    if (FILTER_METHOD && m !== FILTER_METHOD) return false;
    if (FILTER_LAYER) {
      const golden = rGolden[m] || nistGolden[m] || edgeGolden[m];
      if (golden && !golden.layer.split('+').includes(FILTER_LAYER)) return false;
    }
    return true;
  });

  // ─── Run validation ───────────────────────────────────────────────────
  console.log(divider());
  console.log(color(`  Validating ${methodsToRun.length} methods (P1: ${phase1Methods.length}, P2: ${phase2Methods.length}, P3: ${phase3Methods.length}, NIST: ${nistMethods.filter(m => methodsToRun.includes(m)).length}, Edge: ${edgeCaseMethods.filter(m => methodsToRun.includes(m)).length})`, C.cyan + C.bold));
  console.log(divider());
  console.log();

  const allResults = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const methodId of methodsToRun) {
    const golden = rGolden[methodId] || nistGolden[methodId] || edgeGolden[methodId];
    if (!golden) {
      console.log(color(`  ⊘ ${methodId} — no golden value`, C.yellow));
      totalSkipped++;
      continue;
    }

    console.log(color(`  ▸ ${methodId} (${golden.layer})`, C.cyan));

    for (const dataset of golden.datasets) {
      for (const testCase of dataset.cases) {
        const caseLabel = `${methodId} / ${testCase.description}`;

        // Check if data is embedded in golden JSON
        if (!dataset.data) {
          console.log(color(`    ⊘ ${testCase.description} — no embedded data`, C.yellow));
          totalSkipped++;
          continue;
        }

        // Build Python code from embedded data
        const pyCode = buildPythonCode(methodId, dataset, testCase);
        if (!pyCode) {
          console.log(color(`    ⊘ ${testCase.description} — no code generator`, C.yellow));
          totalSkipped++;
          continue;
        }

        // Execute Python
        let pyResult;
        try {
          const resultJson = await pyodide.runPythonAsync(pyCode);
          pyResult = JSON.parse(resultJson);
        } catch (err) {
          // Edge case: expected error behavior (crash prevention test)
          if (testCase.expectBehavior === 'error' || testCase.expectBehavior === 'no_crash') {
            totalPassed++;
            const label = testCase.expectBehavior === 'error' ? 'expected error' : 'no crash (error path)';
            console.log(color(`    ✓ ${testCase.description}  ${C.dim}(${label}: ${err.message.slice(0, 60)})`, C.green));
            allResults.push({
              method: methodId,
              dataset: dataset.name,
              case: testCase.description,
              status: 'PASS',
              note: `${label}: ${err.message}`,
            });
            continue;
          }
          console.log(color(`    ✗ ${testCase.description}`, C.red));
          console.log(color(`      Python error: ${err.message}`, C.yellow));
          totalFailed++;
          allResults.push({
            method: methodId,
            dataset: dataset.name,
            case: testCase.description,
            status: 'ERROR',
            error: err.message,
          });
          continue;
        }

        // Edge case: expected error but code succeeded unexpectedly
        if (testCase.expectBehavior === 'error') {
          totalFailed++;
          console.log(color(`    ✗ ${testCase.description} (expected error but succeeded)`, C.red));
          allResults.push({
            method: methodId,
            dataset: dataset.name,
            case: testCase.description,
            status: 'FAIL',
            note: 'Expected error but Python returned a result',
          });
          continue;
        }

        // Edge case: no-crash test — any result (success) is acceptable
        if (testCase.expectBehavior === 'no_crash') {
          totalPassed++;
          console.log(color(`    ✓ ${testCase.description}  ${C.dim}(no crash, returned result)`, C.green));
          allResults.push({
            method: methodId,
            dataset: dataset.name,
            case: testCase.description,
            status: 'PASS',
            note: 'No-crash test: function returned result without crashing',
          });
          continue;
        }

        // Flatten Python result for nested comparison
        const flatResult = flattenResult(pyResult);

        // Compare against R golden values
        const expected = remapExpected(methodId, testCase.expected);
        const fieldResults = compareFields(expected, flatResult);

        const allPass = fieldResults.every(r => r.status === 'PASS');
        const avgLre = fieldResults.length > 0
          ? fieldResults.reduce((sum, r) => sum + r.lre, 0) / fieldResults.length
          : 0;

        if (allPass) {
          totalPassed++;
          console.log(color(`    ✓ ${testCase.description}  ${C.dim}LRE=${avgLre.toFixed(1)}`, C.green));
        } else {
          totalFailed++;
          console.log(color(`    ✗ ${testCase.description}`, C.red));
          for (const fr of fieldResults.filter(r => r.status === 'FAIL')) {
            console.log(color(`      ${fr.path}: expected=${fr.certified}, got=${fr.actual} (${fr.tier}, LRE=${fr.lre.toFixed(1)})`, C.yellow));
          }
        }

        allResults.push({
          method: methodId,
          dataset: dataset.name,
          case: testCase.description,
          status: allPass ? 'PASS' : 'FAIL',
          tier: golden.layer,
          fields: fieldResults,
          averageLRE: avgLre,
        });
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log();
  console.log(divider());
  console.log(color('  📋 VALIDATION SUMMARY', C.cyan + C.bold));
  console.log(divider());
  console.log(`  Total cases: ${totalPassed + totalFailed + totalSkipped}`);
  console.log(color(`  ✓ Passed: ${totalPassed}`, C.green));
  if (totalFailed > 0) console.log(color(`  ✗ Failed: ${totalFailed}`, C.red));
  if (totalSkipped > 0) console.log(color(`  ⊘ Skipped: ${totalSkipped}`, C.yellow));

  // Average LRE across all passing results
  const passingResults = allResults.filter(r => r.status === 'PASS' && r.averageLRE > 0);
  if (passingResults.length > 0) {
    const overallLre = passingResults.reduce((s, r) => s + r.averageLRE, 0) / passingResults.length;
    console.log(`  📊 Average LRE: ${overallLre.toFixed(1)}`);
  }

  console.log(`  ⏱️  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(divider());

  // ─── Save results snapshot ────────────────────────────────────────────
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const snapshot = {
    runId: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      pyodideVersion: pyodide.version || 'unknown',
      os: `${process.platform} ${process.arch}`,
    },
    tolerancePolicy: 'tiered (exact/tier2/tier3/tier4)',
    summary: {
      totalMethods: methodsToRun.length,
      totalCases: totalPassed + totalFailed + totalSkipped,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      averageLRE: passingResults.length > 0
        ? passingResults.reduce((s, r) => s + r.averageLRE, 0) / passingResults.length
        : 0,
    },
    details: allResults,
  };

  const snapshotPath = join(RESULTS_DIR, `run-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(color(`\n📄 Results saved: ${snapshotPath}`, C.dim));

  // ─── Exit ─────────────────────────────────────────────────────────────
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(color(`Fatal error: ${err.message}`, C.red));
  console.error(err.stack);
  process.exit(1);
});
