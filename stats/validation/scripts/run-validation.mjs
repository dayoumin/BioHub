#!/usr/bin/env node
// =============================================================================
// BioHub Statistical Validation Runner
// =============================================================================
// Purpose: Cross-validate BioHub Pyodide results against R golden values
// Usage:   pnpm test:validation [--method <id>] [--layer L1|L2] [--report]
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
function buildPythonCode(methodId, dataset) {
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
        const pyKey = mapping?.pyKey || rKey;
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
  console.log(color(`  R reference: ${Object.keys(rGolden).length} methods`, C.green));
  console.log(color(`  NIST: ${Object.keys(nistGolden).length} datasets`, C.green));
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

  const methodsToRun = phase1Methods.filter(m => {
    if (FILTER_METHOD && m !== FILTER_METHOD) return false;
    if (FILTER_LAYER) {
      const golden = rGolden[m];
      if (golden && golden.layer !== FILTER_LAYER && golden.layer !== 'L1+L2') return false;
    }
    return true;
  });

  // ─── Run validation ───────────────────────────────────────────────────
  console.log(divider());
  console.log(color(`  Phase 1: Validating ${methodsToRun.length} methods`, C.cyan + C.bold));
  console.log(divider());
  console.log();

  const allResults = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const methodId of methodsToRun) {
    const golden = rGolden[methodId];
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
        const pyCode = buildPythonCode(methodId, dataset);
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
