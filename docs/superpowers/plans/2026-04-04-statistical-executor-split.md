# StatisticalExecutor Split + Deprecated Wrapper Cleanup

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `statistical-executor.ts` (3,125 lines) into a thin dispatcher (~500 lines) + 12 category handler files, simultaneously replacing 10 deprecated Pyodide wrapper calls with direct new-API calls.

**Architecture:** Each `private async executeXxx()` method is extracted to its own handler file under `lib/services/handlers/`. The monolith becomes a thin dispatcher: `executeMethod()` + `prepareData()` + shared types. Deprecated calls are fixed during extraction. Existing executor class files (`executors/`) remain untouched — they serve a different API surface.

**Tech Stack:** TypeScript, Pyodide, Vitest

**Invariant: Behavior-preserving refactoring.** This plan does NOT change:
- User-facing interpretation text (shared-helpers copies current messages byte-for-byte)
- Result field values (regression `mainResults.statistic` stays `0`, not `slopeTValue`)
- Visualization payloads (regression `predictions` stays `undefined`, not `fittedValues`)

If any behavioral upgrade is desired (e.g. exposing `slopeTValue` in regression), it must be a follow-up task with dedicated tests.

---

## File Structure

### New files to create:

| File | Source (monolith lines) | Deprecated calls to fix |
|------|------------------------|------------------------|
| `lib/services/handlers/handle-t-test.ts` | 748-899 (152 lines) | `oneSampleTTest` → `tTestOneSample` |
| `lib/services/handlers/handle-nonparametric.ts` | 1799-2104 (306 lines) | `mannWhitneyU` → `mannWhitneyTestWorker`, `kruskalWallis` → `kruskalWallisTestWorker`, `friedman` → `friedmanTestWorker` |
| `lib/services/handlers/handle-regression.ts` | 1500-1714 (215 lines) | `regression` → `linearRegression` |
| `lib/services/handlers/handle-anova.ts` | 904-1495 (592 lines) | `tukeyHSD` → `tukeyHSDWorker` |
| `lib/services/handlers/handle-descriptive.ts` | 583-743 (161 lines) | None |
| `lib/services/handlers/handle-correlation.ts` | 1726-1794 (69 lines) | None (already delegates) |
| `lib/services/handlers/handle-multivariate.ts` | 2109-2353 (245 lines) | None |
| `lib/services/handlers/handle-timeseries.ts` | 2358-2521 (164 lines) | None |
| `lib/services/handlers/handle-reliability.ts` | 2526-2557 (32 lines) | None |
| `lib/services/handlers/handle-survival.ts` | 2562-2818 (257 lines) | None |
| `lib/services/handlers/handle-design.ts` | 2823-2874 (52 lines) | None |
| `lib/services/handlers/handle-chi-square.ts` | 2880-3060 (181 lines) | None |
| `lib/services/handlers/shared-helpers.ts` | 3061-3125 (65 lines) | None |
| `lib/services/handlers/index.ts` | — | — |

### Files to modify:

| File | Change |
|------|--------|
| `lib/services/statistical-executor.ts` | Remove extracted methods, import handlers |
| `lib/services/pyodide/pyodide-statistics.ts` | Delete 10 deprecated wrappers (610-930) |
| `__tests__/services/executors/statistical-executor-routing.test.ts` | Update mock names |
| `__tests__/services/statistical-executor-group-validation.test.ts` | Rewrite: call handlers directly instead of private methods (Amendment C) |
| `__tests__/integration/executor-varreqs-alignment.test.ts` | Rewrite: read handler files instead of monolith source (Amendment C) |
| `__tests__/services/executors/executor-data-extraction.test.ts` | Update deprecated mock names (Amendment D) |
| `__tests__/bugfix/nonparametric-routing.test.ts` | Update deprecated mock names (Amendment D) |
| `__tests__/services/ancova-worker2-simulation.test.ts` | Update `tukeyHSD` mock (Amendment D) |
| `__tests__/pyodide/worker-function-mapping.test.ts` | Update mapping assertions for deleted wrappers (Amendment D) |
| `__tests__/services/pyodide-statistics-regression-fixes.test.ts` | Update `pca()`/`performPCA()` calls (Amendment D) |

### Files NOT modified:

| File | Reason |
|------|--------|
| `lib/services/executors/*.ts` | Different API surface, separate concern |
| `lib/services/executors/index.ts` | Consumers not changing |

---

## Field Mapping Reference (Critical)

When switching from deprecated to new API, field names change:

| Deprecated function | New function | Field changes |
|---|---|---|
| `oneSampleTTest()` → `{ statistic, pValue, df }` | `tTestOneSample()` → `{ statistic, pValue, n, ... }` + `df: n-1` added by wrapper | **No change** — both return `pValue` (camelCase) |
| `mannWhitneyU()` → `{ statistic, pvalue }` | `mannWhitneyTestWorker()` → `{ statistic, pValue, uStatistic }` | `pvalue` → `pValue` |
| `kruskalWallis()` → `{ statistic, pvalue, df }` | `kruskalWallisTestWorker()` → `{ statistic, pValue, df }` | `pvalue` → `pValue` |
| `friedman()` → `{ statistic, pvalue, df }` | `friedmanTestWorker()` → `{ statistic, pValue, df }` | `pvalue` → `pValue` |
| `tukeyHSD()` → `TukeyHsdResult` | `tukeyHSDWorker()` → `TukeyHsdResult` | **No change** (passthrough) |
| `regression()` → `{ slope, intercept, rSquared, pvalue, fStatistic, tStatistic, predictions, df }` | `linearRegression()` → `{ slope, intercept, rSquared, pValue, slopeTValue, fittedValues, nPairs, residuals, ... }` | `pvalue`→`pValue`, `df`→`nPairs - 2`. **Behavior-preserving:** `fStatistic`/`tStatistic`/`predictions` remain `undefined` (see Amendment B) |

---

## Task 1: Shared Helpers + Handler Scaffold

**Files:**
- Create: `stats/lib/services/handlers/shared-helpers.ts`
- Create: `stats/lib/services/handlers/index.ts`

- [ ] **Step 1: Create shared-helpers.ts**

**CRITICAL: Copy current monolith text EXACTLY (lines 3061-3125).** Do NOT paraphrase or "improve" interpretation messages — this is a behavior-preserving refactoring.

```typescript
// stats/lib/services/handlers/shared-helpers.ts
// Byte-for-byte copy from statistical-executor.ts lines 3061-3125

export function calculateCohensD(group1: number[], group2: number[]): number {
  const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length
  const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length
  const var1 = group1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (group1.length - 1)
  const var2 = group2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (group2.length - 1)
  const pooledSD = Math.sqrt(((group1.length - 1) * var1 + (group2.length - 1) * var2) /
                             (group1.length + group2.length - 2))
  return Math.abs(mean1 - mean2) / pooledSD
}

export function interpretCohensD(d: number): string {
  const abs = Math.abs(d)
  if (abs < 0.2) return '무시할 수준'
  if (abs < 0.5) return '작은 효과'
  if (abs < 0.8) return '중간 효과'
  return '큰 효과'
}

export function interpretEtaSquared(eta: number): string {
  if (eta < 0.01) return '무시할 수준'
  if (eta < 0.06) return '작은 효과'
  if (eta < 0.14) return '중간 효과'
  return '큰 효과'
}

export function interpretRSquared(r2: number): string {
  if (r2 < 0.02) return '무시할 수준'
  if (r2 < 0.13) return '작은 효과'
  if (r2 < 0.26) return '중간 효과'
  return '큰 효과'
}

export function interpretCorrelation(r: number): string {
  const abs = Math.abs(r)
  if (abs < 0.1) return '거의 없음'
  if (abs < 0.3) return '약한 상관'
  if (abs < 0.5) return '���통 상관'
  if (abs < 0.7) return '강한 상관'
  return '매우 강한 상관'
}

export function interpretCronbachAlpha(alpha: number): string {
  if (alpha >= 0.9) return '우수'
  if (alpha >= 0.8) return '양호'
  if (alpha >= 0.7) return '허용'
  if (alpha >= 0.6) return '의문'
  return '불량'
}

export function interpretCramersV(v: number): string {
  if (v < 0.1) return '무시할 수준'
  if (v < 0.3) return '약한 연관'
  if (v < 0.5) return '보통 연관'
  return '강한 연관'
}
```

- [ ] **Step 2: Create index.ts barrel**

```typescript
// stats/lib/services/handlers/index.ts
export { handleTTest } from './handle-t-test'
export { handleNonparametric } from './handle-nonparametric'
export { handleRegression } from './handle-regression'
export { handleANOVA } from './handle-anova'
export { handleDescriptive } from './handle-descriptive'
export { handleCorrelation } from './handle-correlation'
export { handleMultivariate } from './handle-multivariate'
export { handleTimeSeries } from './handle-timeseries'
export { handleReliability } from './handle-reliability'
export { handleSurvival } from './handle-survival'
export { handleDesign } from './handle-design'
export { handleChiSquare } from './handle-chi-square'
```

**Note:** This file will initially cause import errors. Each handler is created in Tasks 2-7. Leave this file and add exports incrementally, or create all handler stubs first.

- [ ] **Step 3: Verify directory structure**

Run: `ls stats/lib/services/handlers/`
Expected: `shared-helpers.ts`, `index.ts`

- [ ] **Step 4: Commit**

```bash
git add stats/lib/services/handlers/shared-helpers.ts stats/lib/services/handlers/index.ts
git commit -m "refactor(executor): add shared helpers + handler barrel for executor split"
```

---

## Task 2: Extract t-test handler (+ fix `oneSampleTTest` → `tTestOneSample`)

**Files:**
- Create: `stats/lib/services/handlers/handle-t-test.ts`
- Modify: `stats/lib/services/statistical-executor.ts:748-899` (remove method)

- [ ] **Step 1: Create handle-t-test.ts**

Copy the monolith's `executeTTest` method (lines 748-899) into a standalone exported function. Fix the deprecated call at line 762.

```typescript
// stats/lib/services/handlers/handle-t-test.ts
import { pyodideStats } from '../pyodide/pyodide-statistics'
import type { StatisticalMethod } from '../../statistics/method-mapping'
import type { PreparedData, StatisticalExecutorResult } from '../statistical-executor'
import { calculateCohensD, interpretCohensD } from './shared-helpers'

export async function handleTTest(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  // === ONE-SAMPLE T-TEST ===
  if (method.id === 'one-sample-t' || method.id === 'one-sample-t-test') {
    const values = data.arrays.dependent || data.arrays.independent?.[0] || []
    if (values.length < 2) {
      throw new Error('일표본 t-검정을 위해 최소 2개 이상의 관측치가 필요합니다')
    }
    const testValue = Number(data.variables.testValue ?? 0)
    if (isNaN(testValue)) {
      throw new Error('기준값(μ₀)이 유효한 숫자가 아닙니다')
    }

    // FIX: oneSampleTTest → tTestOneSample (same return shape: { statistic, pValue, df })
    const result = await pyodideStats.tTestOneSample(values, testValue)

    // Cohen's d = (mean - mu) / sd
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
    const cohensD = sd > 0 ? Math.abs(mean - testValue) / sd : 0

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: { totalN: values.length, missingRemoved: 0, groups: 1 }
      },
      mainResults: {
        statistic: result.statistic ?? 0,
        pvalue: result.pValue ?? 1,
        df: result.df,
        significant: (result.pValue ?? 1) < 0.05,
        interpretation: (result.pValue ?? 1) < 0.05
          ? `표본 평균이 기준값(${testValue})과 유의한 차이가 있습니다`
          : `표본 평균이 기준값(${testValue})과 유의한 차이가 없습니다`
      },
      additionalInfo: {
        effectSize: {
          type: "Cohen's d",
          value: cohensD,
          interpretation: interpretCohensD(cohensD)
        },
        descriptive: { mean, sd, n: values.length, testValue }
      },
      visualizationData: {
        type: 'histogram',
        data: [{ values, label: '표본' }]
      },
      rawResults: result
    }
  }

  // === REST OF executeTTest (two-sample, paired, Welch) ===
  // ... copy lines 811-898 exactly from monolith, using calculateCohensD/interpretCohensD
  // from shared-helpers instead of this.calculateCohensD/this.interpretCohensD

  let group1: number[], group2: number[]
  let groupNames: string[] = []

  if (data.arrays.byGroup) {
    const byGroup = data.arrays.byGroup as Record<string, number[]>
    groupNames = Object.keys(byGroup)
    if (groupNames.length !== 2) {
      const groupsLabel = groupNames.length > 0 ? groupNames.map(name => `"${name}"`).join(', ') : '(없음)'
      throw new Error(
        `t-검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${groupNames.length}개 (${groupsLabel}). ` +
        '그룹 변수 선택이 올바른지 확인하세요.'
      )
    }
    const groups = Object.values(byGroup) as number[][]
    group1 = groups[0] || []
    group2 = groups[1] || []
  } else if (data.arrays.independent) {
    group1 = data.arrays.dependent || []
    group2 = data.arrays.independent[0] || []
    groupNames = ['그룹 1', '그룹 2']
  } else {
    throw new Error('t-검정을 위한 두 그룹 데이터가 필요합니다')
  }

  if (group1.length < 2 || group2.length < 2) {
    const groupInfo = groupNames.length >= 2
      ? `그룹 "${groupNames[0]}": ${group1.length}개, 그룹 "${groupNames[1]}": ${group2.length}개`
      : `그룹 1: ${group1.length}개, 그룹 2: ${group2.length}개`
    throw new Error(
      `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${groupInfo}. ` +
      '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
    )
  }

  const isWelch = method.id === 'welch-t'
  const result = await pyodideStats.tTest(group1, group2, {
    paired: method.id === 'paired-t',
    equalVar: !isWelch
  })

  const cohensD = await calculateCohensD(group1, group2)

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: group1.length + group2.length,
        missingRemoved: 0,
        groups: 2
      }
    },
    mainResults: {
      statistic: result.statistic,
      pvalue: result.pvalue,
      df: result.df,
      significant: result.pvalue < 0.05,
      interpretation: result.pvalue < 0.05
        ? '두 그룹 간 유의한 차이가 있습니다'
        : '두 그룹 간 유의한 차이가 없습니다'
    },
    additionalInfo: {
      effectSize: {
        type: "Cohen's d",
        value: cohensD,
        interpretation: interpretCohensD(cohensD)
      },
      confidenceInterval: result.confidenceInterval ? {
        ...result.confidenceInterval,
        level: 95
      } : undefined
    },
    visualizationData: {
      type: 'boxplot',
      data: {
        group1: { values: group1, label: 'Group 1' },
        group2: { values: group2, label: 'Group 2' }
      }
    },
    rawResults: result
  }
}
```

**Critical:** `calculateCohensD` in shared-helpers is synchronous (pure math). The monolith version `this.calculateCohensD` is async — but its body is pure math too. Drop the `await` when calling it from the handler.

- [ ] **Step 2: Wire monolith**

In `statistical-executor.ts`:
1. Add import: `import { handleTTest } from './handlers/handle-t-test'`
2. Replace case body:
```typescript
case 't-test':
  result = await handleTTest(method, preparedData)
  break
```
3. Delete the entire `private async executeTTest()` method (lines 748-899).

- [ ] **Step 3: Update test mock**

In `__tests__/services/executors/statistical-executor-routing.test.ts`, the mock at line 30 has:
```typescript
oneSampleTTest: vi.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, df: 29, ... }),
```
Add the new API mock (keep old until deprecated is removed):
```typescript
tTestOneSample: vi.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, n: 30, df: 29 }),
```

- [ ] **Step 4: Run tests**

Run: `cd stats && pnpm vitest run __tests__/services/executors/statistical-executor-routing.test.ts`
Expected: All tests pass. One-sample t-test case now calls `tTestOneSample`.

- [ ] **Step 5: Commit**

```bash
git add stats/lib/services/handlers/handle-t-test.ts stats/lib/services/statistical-executor.ts stats/__tests__/services/executors/statistical-executor-routing.test.ts
git commit -m "refactor(executor): extract t-test handler, fix oneSampleTTest → tTestOneSample"
```

---

## Task 3: Extract nonparametric handler (+ fix 3 deprecated calls)

**Files:**
- Create: `stats/lib/services/handlers/handle-nonparametric.ts`
- Modify: `stats/lib/services/statistical-executor.ts:1799-2104` (remove method)

- [ ] **Step 1: Create handle-nonparametric.ts**

Copy `executeNonparametric` (lines 1799-2104). Fix 3 deprecated calls. The key pattern: each deprecated wrapper returns `pvalue` (lowercase), but the new APIs return `pValue` (camelCase). The shared result builder at line 2075 reads `result.pvalue`, so we map at each call site.

**Deprecated call fixes:**

Line 1837 — Mann-Whitney U:
```typescript
// BEFORE:
result = await pyodideStats.mannWhitneyU(mwGroups[0], mwGroups[1])
// result.pvalue (lowercase) ← deprecated wrapper maps pValue → pvalue

// AFTER:
const mwResult = await pyodideStats.mannWhitneyTestWorker(mwGroups[0], mwGroups[1])
result = { statistic: mwResult.statistic, pvalue: mwResult.pValue }
```

Line 1870 — Kruskal-Wallis:
```typescript
// BEFORE:
result = await pyodideStats.kruskalWallis(kwGroups)

// AFTER:
const kwResult = await pyodideStats.kruskalWallisTestWorker(kwGroups)
result = { statistic: kwResult.statistic, pvalue: kwResult.pValue, df: kwResult.df }
```

Line 1874 — Friedman:
```typescript
// BEFORE:
result = await pyodideStats.friedman(data.arrays.independent || [])

// AFTER:
const frResult = await pyodideStats.friedmanTestWorker(data.arrays.independent || [])
result = { statistic: frResult.statistic, pvalue: frResult.pValue, df: frResult.df }
```

**Note:** Line 1849 (`wilcoxonTestWorker`) is already on new API — leave unchanged but map result:
```typescript
// Already uses new API, but result fields need mapping for shared builder:
const wilcoxonResult = await pyodideStats.wilcoxonTestWorker(wilcoxonGroup1, wilcoxonGroup2)
result = { statistic: wilcoxonResult.statistic, pvalue: wilcoxonResult.pValue }
```

Everything else (sign-test, mcnemar, cochran-q, binomial, runs, ks-test, mood-median, proportion-test) already uses new-API worker methods — copy unchanged.

- [ ] **Step 2: Wire monolith**

Same pattern as Task 2:
1. Import: `import { handleNonparametric } from './handlers/handle-nonparametric'`
2. Replace case: `result = await handleNonparametric(method, preparedData)`
3. Delete `private async executeNonparametric()` (lines 1799-2104)

- [ ] **Step 3: Update test mocks**

In the routing test, update mocks at lines 47-50:
```typescript
// Add new API mocks:
mannWhitneyTestWorker: vi.fn().mockResolvedValue({ statistic: 45.0, pValue: 0.023, uStatistic: 45.0 }),
kruskalWallisTestWorker: vi.fn().mockResolvedValue({ statistic: 8.5, pValue: 0.014, df: 2 }),
friedmanTestWorker: vi.fn().mockResolvedValue({ statistic: 10.0, pValue: 0.02, df: 2 }),
wilcoxonTestWorker: vi.fn().mockResolvedValue({ statistic: 12.0, pValue: 0.034, nobs: 10, zScore: -2.1, medianDiff: 1.5, effectSize: 0.47, descriptives: {} }),
```

- [ ] **Step 4: Run tests**

Run: `cd stats && pnpm vitest run __tests__/services/executors/statistical-executor-routing.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add stats/lib/services/handlers/handle-nonparametric.ts stats/lib/services/statistical-executor.ts stats/__tests__/services/executors/statistical-executor-routing.test.ts
git commit -m "refactor(executor): extract nonparametric handler, fix mannWhitneyU/kruskalWallis/friedman deprecated calls"
```

---

## Task 4: Extract regression handler (+ fix `regression` → `linearRegression`)

**Files:**
- Create: `stats/lib/services/handlers/handle-regression.ts`
- Modify: `stats/lib/services/statistical-executor.ts:1500-1714`

- [ ] **Step 1: Create handle-regression.ts**

Copy `executeRegression` (lines 1500-1714). Fix the deprecated call at line 1673.

**This is the most complex field mapping.** The deprecated `regression()` returns:
```
{ slope?, intercept?, rSquared, pvalue, fStatistic?, tStatistic?, predictions?, df? }
```
The new `linearRegression()` returns (`Generated.LinearRegressionResult`):
```
{ slope, intercept, rSquared, pValue, stdErr, nPairs, slopeTValue, interceptTValue,
  residuals, fittedValues, equation, confidenceInterval, interpretation, slopeCi, interceptCi }
```

Fix at line 1673:
```typescript
// BEFORE:
const result = await pyodideStats.regression(firstIndependent, dependent, {
  type: method.id === 'multiple-regression' ? 'multiple' : 'simple'
})
// Uses: result.fStatistic, result.tStatistic, result.rSquared, result.pvalue, result.df, result.predictions

// AFTER:
const regResult = await pyodideStats.linearRegression(firstIndependent, dependent)
const result = {
  slope: regResult.slope,
  intercept: regResult.intercept,
  rSquared: regResult.rSquared,
  pvalue: regResult.pValue,
  fStatistic: undefined as number | undefined,
  tStatistic: regResult.slopeTValue,
  predictions: regResult.fittedValues,
  df: regResult.nPairs - 2
}
```

The rest of the method (logistic, polynomial, non-linear, response-surface cases) does NOT use the deprecated `regression()` — copy unchanged.

Import `interpretRSquared` from shared-helpers.

- [ ] **Step 2: Wire monolith + delete method**

- [ ] **Step 3: Update test mocks**

```typescript
// Add:
linearRegression: vi.fn().mockResolvedValue({
  slope: 1.5, intercept: 2.0, rSquared: 0.85, pValue: 0.001,
  stdErr: 0.2, nPairs: 30, slopeTValue: 7.5, interceptTValue: 4.2,
  residuals: [], fittedValues: [], equation: 'y = 1.5x + 2.0',
  confidenceInterval: { lower: [], upper: [] }, interpretation: '',
  slopeCi: { lower: 1.1, upper: 1.9 }, interceptCi: { lower: 1.2, upper: 2.8 }
}),
```

- [ ] **Step 4: Run tests**

Run: `cd stats && pnpm vitest run __tests__/services/executors/statistical-executor-routing.test.ts`

- [ ] **Step 5: Commit**

```bash
git add stats/lib/services/handlers/handle-regression.ts stats/lib/services/statistical-executor.ts stats/__tests__/services/executors/statistical-executor-routing.test.ts
git commit -m "refactor(executor): extract regression handler, fix regression → linearRegression"
```

---

## Task 5: Extract ANOVA handler (+ fix `tukeyHSD` → `tukeyHSDWorker`)

**Files:**
- Create: `stats/lib/services/handlers/handle-anova.ts`
- Modify: `stats/lib/services/statistical-executor.ts:904-1495`

- [ ] **Step 1: Create handle-anova.ts**

Copy `executeANOVA` (lines 904-1495 — the largest handler at 592 lines). Fix the deprecated call at line 1438.

**Fix:** `tukeyHSD` → `tukeyHSDWorker` (passthrough, no field mapping change):
```typescript
// BEFORE (line 1438):
const tukeyResult = await pyodideStats.tukeyHSD(groups)

// AFTER:
const tukeyResult = await pyodideStats.tukeyHSDWorker(groups)
```

Also need: `import { interpretEtaSquared } from './shared-helpers'`

Also copy `normalizePostHocComparisons` as an import from the monolith (it stays in the monolith since it's also used by ANOVA handler).

**Alternative:** Move `normalizePostHocComparisons` into shared-helpers.ts since it's only used by ANOVA. Read the monolith's implementation at lines 513-582 and include it in shared-helpers.

- [ ] **Step 2: Move normalizePostHocComparisons to shared-helpers**

Read lines 513-582 from the monolith and add to shared-helpers.ts. Also move the `NormalizedPostHocComparison` interface.

- [ ] **Step 3: Wire monolith + delete method**

- [ ] **Step 4: Run tests**

Run: `cd stats && pnpm vitest run __tests__/services/executors/`

- [ ] **Step 5: Commit**

```bash
git add stats/lib/services/handlers/handle-anova.ts stats/lib/services/handlers/shared-helpers.ts stats/lib/services/statistical-executor.ts
git commit -m "refactor(executor): extract ANOVA handler, fix tukeyHSD → tukeyHSDWorker"
```

---

## Task 6: Extract remaining handlers (no deprecated calls)

These 8 categories have no deprecated calls. Extract them as a batch.

**Files to create:**
- `stats/lib/services/handlers/handle-descriptive.ts` (161 lines)
- `stats/lib/services/handlers/handle-correlation.ts` (69 lines — already delegates to CorrelationExecutor)
- `stats/lib/services/handlers/handle-multivariate.ts` (245 lines)
- `stats/lib/services/handlers/handle-timeseries.ts` (164 lines)
- `stats/lib/services/handlers/handle-reliability.ts` (32 lines)
- `stats/lib/services/handlers/handle-survival.ts` (257 lines)
- `stats/lib/services/handlers/handle-design.ts` (52 lines)
- `stats/lib/services/handlers/handle-chi-square.ts` (181 lines — includes Goodness + Independence sub-methods)

- [ ] **Step 1: Extract handle-descriptive.ts**

Copy lines 583-743. No deprecated calls.
Import: `pyodideStats` only (no shared helpers needed).

- [ ] **Step 2: Extract handle-correlation.ts**

Copy lines 1726-1794. Already delegates to `CorrelationExecutor`.
Import: `CorrelationExecutor` from `../executors/correlation-executor`.

- [ ] **Step 3: Extract handle-multivariate.ts**

Copy lines 2109-2353. Uses `pcaAnalysis`, `factorAnalysis`, `clusterAnalysis`, `discriminantAnalysis` ��� all non-deprecated.

- [ ] **Step 4: Extract handle-timeseries.ts**

Copy lines 2358-2521.

- [ ] **Step 5: Extract handle-reliability.ts**

Copy lines 2526-2557. Import `interpretCronbachAlpha` from shared-helpers.

- [ ] **Step 6: Extract handle-survival.ts**

Copy lines 2562-2818.

- [ ] **Step 7: Extract handle-design.ts**

Copy lines 2823-2874. Import `interpretCohensD` from shared-helpers.

- [ ] **Step 8: Extract handle-chi-square.ts**

Copy lines 2880-3060. Includes 3 methods: `handleChiSquare` (router), `executeChiSquareGoodness`, `executeChiSquareIndependence`. Import `interpretCramersV` from shared-helpers.

- [ ] **Step 9: Wire all handlers into monolith dispatcher**

Update `statistical-executor.ts`:
1. Add all imports from `./handlers/`
2. Replace all switch cases
3. Delete all extracted `private async executeXxx()` methods
4. Delete the 7 interpretation helper methods at the bottom (moved to shared-helpers)
5. Keep: `executeMethod()`, `prepareData()`, `normalizePostHocComparisons()` (if not moved), interfaces, class structure

Expected remaining size: ~500-550 lines.

- [ ] **Step 10: Run full test suite**

Run: `cd stats && pnpm vitest run __tests__/services/executors/`
Expected: All pass — behavior unchanged.

- [ ] **Step 11: Verify monolith line count**

Run: `wc -l stats/lib/services/statistical-executor.ts`
Expected: ~500-550 lines.

- [ ] **Step 12: Commit**

```bash
git add stats/lib/services/handlers/ stats/lib/services/statistical-executor.ts
git commit -m "refactor(executor): extract all 12 category handlers, monolith → thin dispatcher"
```

---

## Task 7: Remove deprecated wrappers from pyodide-statistics.ts

**Files:**
- Modify: `stats/lib/services/pyodide/pyodide-statistics.ts` (delete lines 610-930, ~320 lines)
- Modify: `stats/__tests__/services/executors/statistical-executor-routing.test.ts` (remove old mock names)

- [ ] **Step 1: Verify no remaining callers**

Run grep for each deprecated function name across the entire project:

```bash
cd stats && grep -rn "pyodideStats\.\(regression\|mannWhitneyU\|wilcoxon\|kruskalWallis\|tukeyHSD\|chiSquare\|pca\|friedman\|oneSampleTTest\|performPCA\)" lib/ --include="*.ts" | grep -v "pyodide-statistics.ts"
```

Expected: Only hits in `executors/*.ts` (the separate executor class files, which are NOT on the critical path).

**Important:** The existing executor class files (`executors/nonparametric-executor.ts`, `executors/t-test-executor.ts`, etc.) still use deprecated calls. Since they are NOT wired into the monolith dispatch (only `CorrelationExecutor` is), they are NOT on the critical path. Fix them in this step too:

- `executors/t-test-executor.ts:24` — `oneSampleTTest` → `tTestOneSample`
- `executors/nonparametric-executor.ts:19,72,110,159` — fix all 4
- `executors/regression-executor.ts:18` — `regression` → `linearRegression`
- `executors/anova-executor.ts:219` — `tukeyHSD` → `tukeyHSDWorker`
- `executors/descriptive-executor.ts:135` — `chiSquare` → `chiSquareTestWorker`

- [ ] **Step 2: Fix executor class files**

For each file, apply the same field mapping patterns documented above.

**nonparametric-executor.ts** — 4 fixes:
```typescript
// Line 19: mannWhitneyU → mannWhitneyTestWorker
const mwResult = await pyodideStats.mannWhitneyTestWorker(group1, group2)
// Change result.pvalue → mwResult.pValue throughout

// Line 72: wilcoxon → wilcoxonTestWorker
const wResult = await pyodideStats.wilcoxonTestWorker(x, group2)
// Change result.pvalue → wResult.pValue

// Line 110: kruskalWallis → kruskalWallisTestWorker
const kwResult = await pyodideStats.kruskalWallisTestWorker(groups)
// Change result.pvalue → kwResult.pValue

// Line 159: friedman → friedmanTestWorker
const frResult = await pyodideStats.friedmanTestWorker(data)
// Change result.pvalue → frResult.pValue
```

**t-test-executor.ts** — 1 fix:
```typescript
// Line 24: oneSampleTTest → tTestOneSample
const result = await pyodideStats.tTestOneSample(data, populationMean)
// No field change needed (both return pValue camelCase)
```

**regression-executor.ts** — 1 fix:
```typescript
// Line 18: regression → linearRegression
const regResult = await pyodideStats.linearRegression(x, y)
// Map: result.pvalue → regResult.pValue, result.slope → regResult.slope, etc.
```

**anova-executor.ts** — 1 fix:
```typescript
// Line 219: tukeyHSD → tukeyHSDWorker
const result = await pyodideStats.tukeyHSDWorker(groups)
// No field change (passthrough)
```

**descriptive-executor.ts** — 1 fix:
```typescript
// Line 135: chiSquare → chiSquareTestWorker
const chiResult = await pyodideStats.chiSquareTestWorker(contingencyTable)
// Map: chiSquare.statistic → chiResult.chiSquare, chiSquare.pvalue → chiResult.pValue
```

- [ ] **Step 3: Delete deprecated wrappers**

In `pyodide-statistics.ts`, delete the following functions:
- `regression()` (lines 610-639)
- `mannWhitneyU()` (lines 641-657)
- `wilcoxon()` (lines 660-676)
- `kruskalWallis()` (lines 679-694)
- `tukeyHSD()` (lines 697-703)
- `chiSquare()` (lines 706-721)
- `pca()` (lines 724-754)
- `friedman()` (lines 772-787)
- `oneSampleTTest()` (lines 870-881)
- `performPCA()` (lines 886-926)

- [ ] **Step 4: Update test mocks — remove old names**

In `statistical-executor-routing.test.ts`, remove deprecated mock entries:
- `oneSampleTTest` (line 30) — now `tTestOneSample`
- `mannWhitneyU` (line 47) — now `mannWhitneyTestWorker`
- `kruskalWallis` (line 48) — now `kruskalWallisTestWorker`
- `wilcoxon` (line 49) — now `wilcoxonTestWorker`
- `friedman` (line 50) — now `friedmanTestWorker`
- `chiSquare` (line 61) — now `chiSquareTestWorker` (check if tests actually call this path)
- `regression` (line 65) — now `linearRegression`
- `tukeyHSD` (line 38) — now `tukeyHSDWorker`
- `pca` (line 71) — now `pcaAnalysis` (already mocked at line 72)

Also check the PCA-specific test file:
`stats/__tests__/services/pyodide-statistics-regression-fixes.test.ts` — uses `pca()` and `performPCA()`. These must be updated to use `pcaAnalysis()` directly.

- [ ] **Step 5: Run full test suite**

Run: `cd stats && pnpm vitest run`
Expected: All pass.

- [ ] **Step 6: Type check**

Run: `cd stats && pnpm tsc --noEmit`
Expected: Clean.

- [ ] **Step 7: Commit**

```bash
git add stats/lib/services/pyodide/pyodide-statistics.ts stats/lib/services/executors/ stats/__tests__/
git commit -m "refactor(pyodide): remove 10 deprecated wrappers, fix all callers to use new API"
```

---

## Task 8: Final Verification

- [ ] **Step 1: Line count check**

```bash
wc -l stats/lib/services/statistical-executor.ts
wc -l stats/lib/services/handlers/*.ts
```

Expected:
- `statistical-executor.ts`: ~500-550 lines
- Total handlers: ~2,400-2,500 lines (matching extracted code)

- [ ] **Step 2: Full test suite**

Run: `cd stats && pnpm vitest run`
Expected: All tests pass.

- [ ] **Step 3: Type check**

Run: `cd stats && pnpm tsc --noEmit`
Expected: Clean.

- [ ] **Step 4: Grep for any remaining deprecated calls**

```bash
cd stats && grep -rn "@deprecated" lib/services/pyodide/pyodide-statistics.ts
```

Expected: No `@deprecated` markers related to the 10 removed wrappers. (Other non-targeted deprecated items may remain.)

- [ ] **Step 5: Final commit if any fixups needed**

---

## Risk Notes

1. **normalizePostHocComparisons** is used by ANOVA handler. Either keep it in the monolith and export it, or move to shared-helpers. Don't duplicate.

2. **Test mocks** need both old AND new API names during intermediate steps. Only remove old names in Task 7.

3. **Existing executor class files** (`executors/*.ts`) are fixed in Task 7 as cleanup. They are NOT on the critical dispatch path — the handlers are.

4. **The code-templates reference** at `lib/services/export/code-templates/nonparametric.ts:120` generates Python code strings mentioning `stats.wilcoxon()` — this is Python API, NOT the deprecated TS wrapper. Leave untouched.

---

## Amendments (Post-Review)

The following amendments override corresponding sections above. Apply these changes when executing the plan.

### Amendment A: shared-helpers.ts must be byte-for-byte copy (overrides Task 1 Step 1)

The code snippet in Task 1 Step 1 has WRONG interpretation text. The correct text from the current monolith (lines 3077-3125) is:

- `interpretCohensD`: thresholds `0.2/0.5/0.8`, text `'매우 작음'/'작음'/'중간'/'큼'` (NOT '무시할 수준'/'작은 효과')
- `interpretEtaSquared`: thresholds `0.01/0.06/0.14`, text `'매우 작음'/'작음'/'중간'/'큼'`
- `interpretRSquared`: thresholds `0.1/0.3/0.5/0.7`, text `'매우 약함'/'약함'/'중간'/'강함'/'매우 강함'` (5 levels, NOT 4)
- `interpretCorrelation`: uses direction prefix (`양의`/`음의`) + strength, returns e.g. `'양의 강한 상관관계'` (NOT just `'강한 상관'`)
- `interpretCronbachAlpha`: descending order `<0.6/<0.7/<0.8/<0.9`, text `'수용 불가'/'의문'/'수용 가능'/'양호'/'우수'`
- `interpretCramersV`: thresholds `0.1/0.3/0.5`, text `'매우 약함'/'약함'/'중간'/'강함'`
- `calculateCohensD`: uses `Math.pow()` and `reduce((a, b) =>` pattern (NOT `(s, v) =>`)

**Action:** When executing, READ `statistical-executor.ts` lines 3061-3125 and copy verbatim. Do NOT use the code block in Task 1.

### Amendment B: Regression must preserve current undefined semantics (overrides Task 4 Step 1)

The regression handler fix must NOT expose new fields. Current behavior:
- `pyodideStats.regression()` returns `fStatistic: undefined, tStatistic: undefined, predictions: undefined`
- Monolith line 1689: `result.fStatistic ?? result.tStatistic ?? 0` evaluates to `0`
- Monolith line 1707: `result.predictions` is `undefined` in visualization data

The correct fix preserves this:
```typescript
const regResult = await pyodideStats.linearRegression(firstIndependent, dependent)
const result = {
  slope: regResult.slope,
  intercept: regResult.intercept,
  rSquared: regResult.rSquared,
  pvalue: regResult.pValue,           // field rename only
  fStatistic: undefined as number | undefined,  // preserve undefined
  tStatistic: undefined as number | undefined,  // preserve undefined (NOT slopeTValue)
  predictions: undefined as number[] | undefined,  // preserve undefined (NOT fittedValues)
  df: regResult.nPairs - 2
}
```

**Do NOT map** `tStatistic` to `slopeTValue` or `predictions` to `fittedValues`. That would change `mainResults.statistic` from `0` to a real value, which is a behavioral change outside this refactoring's scope.

### Amendment C: Tests calling private methods need migration (new Task 6.5)

Two test files call private methods that will be deleted. Add as **Task 6.5** between Tasks 6 and 7.

**File 1:** `__tests__/services/statistical-executor-group-validation.test.ts`
- Lines 35-36: `(executor as any).executeTTest(method, preparedData)` — replace with `handleTTest(method, preparedData)` (import from handlers)
- Lines 55+: `(executor as any).executeANOVA(...)` — replace with `handleANOVA(...)`
- Lines 70+: `(executor as any).executeNonparametric(...)` — replace with `handleNonparametric(...)`
- Update mock to include all APIs the handlers call
- Remove `StatisticalExecutor` instantiation (no longer needed)

**File 2:** `__tests__/integration/executor-varreqs-alignment.test.ts`
- Lines 149-156: reads `statistical-executor.ts` source and asserts `case 'response-surface'`, `buildGlmResult` etc. exist
- After split, these strings are in handler files, not the monolith
- Fix: Change the `fs.readFileSync` path to read the handler file instead (`handle-regression.ts`)
- Or: read all handler files and check across them

### Amendment D: Expanded test file list for Task 7 (overrides Task 7 Steps 1, 4)

Task 7 Step 1 grep must also verify NO remaining deprecated callers in ALL test files. The following test files mock deprecated API names and need updates:

| Test file | Deprecated mocks used | Fix |
|-----------|----------------------|-----|
| `__tests__/services/executors/statistical-executor-routing.test.ts` | `oneSampleTTest`, `mannWhitneyU`, `kruskalWallis`, `wilcoxon`, `friedman`, `tukeyHSD`, `regression`, `chiSquare`, `pca` | Update to new API names |
| `__tests__/services/statistical-executor-group-validation.test.ts` | `mannWhitneyU`, `kruskalWallis` | Update to new API names |
| `__tests__/services/executors/executor-data-extraction.test.ts` | `mannWhitneyU`, `wilcoxon`, `kruskalWallis`, `oneSampleTTest` | Update to new API names |
| `__tests__/bugfix/nonparametric-routing.test.ts` | `kruskalWallis`, `friedman` | Update to new API names |
| `__tests__/services/ancova-worker2-simulation.test.ts` | `tukeyHSD` | Update to `tukeyHSDWorker` |
| `__tests__/pyodide/worker-function-mapping.test.ts` | `oneSampleTTest` (line 262,326), `tukeyHSD` (line 288,349), `pca` (line 302) | These test pyodideStats METHOD EXISTENCE — after deleting deprecated wrappers, update to assert new names or remove rows |
| `__tests__/services/pyodide-statistics-regression-fixes.test.ts` | `pca()`, `performPCA()` | Update to use `pcaAnalysis()` |

### Amendment E: Fix tTestOneSample mock shape (overrides Task 2 Step 3)

The routing test at line 33 already has a `tTestOneSample` mock but with WRONG field name:
```typescript
// CURRENT (wrong):
tTestOneSample: vi.fn().mockResolvedValue({ statistic: 2.5, pvalue: 0.02, df: 29 }),
// pvalue (lowercase) — but Generated.TTestOneSampleResult returns pValue (camelCase)

// CORRECT:
tTestOneSample: vi.fn().mockResolvedValue({ statistic: 2.5, pValue: 0.02, n: 30, df: 29 }),
```

**Action:** Fix the existing `tTestOneSample` mock shape (correct `pvalue` to `pValue`, add `n`), then remove the deprecated `oneSampleTTest` mock once callers are migrated.
