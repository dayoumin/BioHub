# Executor & VarReqs Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 14 methods that execute wrong analysis + align 14 VarReqs ID mismatches so every registered method runs correctly through the executor pipeline.

**Architecture:** `statistical-methods.ts` (registry) dispatches via `statistical-executor.ts` category handlers (`executeANOVA`, `executeRegression`, `executeTimeSeries`, `executeDescriptive`) to `pyodide-statistics.ts` wrappers which call Python workers. Gaps exist where category handlers have no `case` for a method.id, causing fallthrough to wrong analysis.

**Tech Stack:** TypeScript, Pyodide Python workers (scipy/statsmodels/pingouin)

---

## Critical Implementation Notes

These were verified against the actual codebase and MUST be followed:

1. **`PreparedData` 구조:**
   - `data.arrays.dependent` → `number[]` (종속변수)
   - `data.arrays.independent` → `number[][]` (독립변수 열 배열)
   - `data.arrays.byGroup` → `Record<string, number[]>` (그룹별 데이터)
   - `data.data` → `Array<Record<string, unknown>>` (원시 행 데이터)
   - `data.variables` → `Record<string, unknown>` (untyped — 런타임 접근)
   - `data.totalN` → `number`
   - **존재하지 않음:** `data.validRows`, `variables.random`

2. **`buildResult()` 없음** — 모든 핸들러가 `StatisticalExecutorResult` 객체를 inline으로 구성. 기존 핸들러 패턴을 반드시 복사할 것.

3. **inline result 패턴** (모든 핸들러 동일):
```ts
return {
  metadata: {
    method: method.id, methodName: method.name,
    timestamp: '', duration: 0,
    dataInfo: { totalN: data.totalN, missingRemoved: 0 }
  },
  mainResults: {
    statistic: ..., pvalue: ..., df: ...,
    significant: pvalue < 0.05,
    interpretation: '...'
  },
  additionalInfo: { ... },
  visualizationData: { type: '...', data: ... },
  rawResults: result
}
```

4. **`executeRegression()` 현재 코드** — `data.arrays.independent?.[0]`만 사용 (첫 번째 열). 다변량 회귀는 `data.arrays.independent` 전체를 행렬 변환해야 함.

5. **파라미터 순서 주의:**
   - `stepwiseRegression(yValues, xMatrix, ...)` — **y가 먼저**
   - `logisticRegression(X, y)` — **X가 먼저**
   - `manovaWorker(dataMatrix, groupValues, varNames)` — 행렬이 먼저

6. **Python worker 파라미터명 (camelCase)** — `callWorkerMethod`는 JS 키를 그대로 Python에 전달. Python 함수의 실제 시그니처:
   - `dose_response_analysis(doseData, responseData, modelType, constraints)` — NOT `doses/responses`
   - `response_surface_analysis(data, dependentVar, predictorVars, modelType, ...)` — **data=List[Dict], NOT matrix**
   - `mixed_effects_model(data, dependentColumn, fixedEffects, randomEffects)` — **worker4 camelCase**
   - `mixed_model(dependent_var, fixed_effects, random_effects, data)` — **worker2 snake_case**
   - `arima_forecast(values, order, nForecast)` — NOT `data/forecast_steps`
   - `means_plot_data(data, dependentVar, factorVar)` — **worker1, data=List[Dict]**

7. **기존 alias 시스템 활용** — `statistical-methods.ts`에 `getMethodByIdOrAlias()`와 각 메서드의 `aliases` 배열이 이미 존재. VarReqs에 별도 alias 테이블을 추가하기보다 이 기존 시스템을 재사용해야 함.

8. **cluster ID 변경 범위** — executor 2곳 외에도:
   - `menu-config.ts:425` → `id: 'cluster-analysis'`
   - `method-page-mapping.ts:33` → `'cluster-analysis': 'cluster'`
   - `data-method-compatibility.ts:100` → `'cluster': 'cluster-analysis'`
   이 매핑 계층들이 존재하므로, executor만 바꾸면 경로별 동작이 갈라질 수 있음. 전체 ID 정규화 흐름을 추적해야 함.

---

## Session Split

- **Session A (this session):** Task 1 (P1 VarReqs) + Task 2 (regression 6개) + Task 3 (ANOVA 2개)
- **Session B (next session):** Task 4 (timeseries 2개) + Task 5 (descriptive 2개) + Task 6 (cluster ID fix) + Task 7 (welch-anova)

---

## Task 1: VarReqs ID Alignment (P1 — 14 mismatches)

**Files:**
- Modify: `lib/statistics/variable-requirements.ts`
- Test: `pnpm tsc --noEmit` (type check) + existing tests

The `getMethodRequirements(methodId)` (line ~4896) is a simple `.find()` exact match — no aliasing exists.

| Registry ID (statistical-methods.ts) | Current VarReqs ID | Action |
|---|---|---|
| `t-test` | `two-sample-t` | Add alias |
| `anova` | `one-way-anova` | Add alias |
| `wilcoxon` | `wilcoxon-signed-rank` | Add alias |
| `ks-test` | `kolmogorov-smirnov` | Add alias |
| `correlation` | `pearson-correlation` | Add alias |
| `regression` | `simple-regression` | Add alias |
| `poisson` | `poisson-regression` | Add alias |
| `stepwise` | `stepwise-regression` | Add alias |
| `descriptive` | `descriptive-stats` | Add alias |
| `cluster` | `cluster-analysis` | Add alias |
| `discriminant` | `discriminant-analysis` | Add alias |
| `mann-kendall` | `mann-kendall-test` | Add alias |
| `reliability` | `reliability-analysis` | Add alias |
| `proportion-test` | `one-sample-proportion` | Add alias |

- [ ] **Step 1:** Read `lib/statistics/variable-requirements.ts` — find `getMethodRequirements()` (line ~4896) and `STATISTICAL_METHOD_REQUIREMENTS` array

- [ ] **Step 2:** 기존 alias 시스템을 활용하여 `getMethodRequirements()`를 업데이트. `statistical-methods.ts`의 `getMethodByIdOrAlias()`가 이미 각 메서드의 `aliases` 배열을 검색하므로, VarReqs에서도 이를 재사용:

```ts
import { getMethodByIdOrAlias } from '@/lib/constants/statistical-methods'

export function getMethodRequirements(methodId: string): StatisticalMethodRequirements | undefined {
  // 1. Direct match
  const direct = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === methodId)
  if (direct) return direct

  // 2. Resolve via statistical-methods.ts aliases (e.g., 't-test' → aliases include 'two-sample-t')
  const resolved = getMethodByIdOrAlias(methodId)
  if (!resolved) return undefined

  // 3. Search VarReqs by resolved ID
  const byResolvedId = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === resolved.id)
  if (byResolvedId) return byResolvedId

  // 4. Search VarReqs by aliases of the resolved method
  for (const alias of (resolved as { aliases?: string[] }).aliases ?? []) {
    const byAlias = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === alias)
    if (byAlias) return byAlias
  }

  return undefined
}
```

이 방식은 별도 alias 테이블 없이 기존 `aliases` 배열을 정본으로 사용. 예: registry ID `'wilcoxon'`의 `aliases: ['wilcoxon-signed-rank', 'wilcoxon-test']` → VarReqs의 `'wilcoxon-signed-rank'`에 매칭.

**주의:** circular import 확인 필요. `variable-requirements.ts` → `statistical-methods.ts` import가 순환 참조를 만들 수 있음. 순환이면 alias 맵을 인라인으로 유지.

- [ ] **Step 3:** Run `pnpm tsc --noEmit` — expect 0 errors
- [ ] **Step 4:** Run `pnpm test` — expect all pass
- [ ] **Step 5:** Commit: `fix(stats): VarReqs ID aliases — 14 registry IDs now resolve correctly`

---

## Task 2: Regression Executor Wiring (P0 — 6 methods)

**Files:**
- Modify: `lib/services/statistical-executor.ts` — `executeRegression()` (lines ~1303-1353)
- Modify: `lib/services/pyodide-statistics.ts` — add `doseResponseAnalysis()`, `responseSurfaceAnalysis()` wrappers
- Test: existing tests + `pnpm tsc --noEmit`

| method.id | pyodideStats method | Params | Exists? |
|---|---|---|---|
| `logistic-regression` | `logisticRegression(X, y)` | X: number[][], y: number[] | YES |
| `poisson` | `poissonRegression(xMatrix, yValues)` | same | YES |
| `ordinal-regression` | `ordinalLogistic(xMatrix, yValues)` | same | YES |
| `stepwise` | `stepwiseRegression(yValues, xMatrix, names)` | **y first, then X** | YES |
| `dose-response` | needs wrapper | doses, responses | NO |
| `response-surface` | needs wrapper | xMatrix, yValues, names | NO |

- [ ] **Step 1:** Read `executeRegression()` fully (lines ~1303-1353) — verify current data extraction:
  - `data.arrays.dependent` → `number[]`
  - `data.arrays.independent` → `number[][]` (columns, not rows)
  - For multi-predictor methods, need to transpose: `independent[colIdx][rowIdx]` → `matrix[rowIdx][colIdx]`

- [ ] **Step 2:** Add `doseResponseAnalysis()` and `responseSurfaceAnalysis()` wrappers to `pyodide-statistics.ts`.

**Python 실제 시그니처 (camelCase 파라미터명):**
- `dose_response_analysis(doseData, responseData, modelType='logistic4', constraints=None)` — worker4:1563
- `response_surface_analysis(data, dependentVar, predictorVars, modelType='secondOrder', ...)` — worker2:1107
  - `data` = `List[Dict]` (raw rows), NOT matrix

```ts
async doseResponseAnalysis(
  doseData: number[],
  responseData: number[],
  modelType: string = 'logistic4',
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    4, 'dose_response_analysis',
    { doseData, responseData, modelType }
  )
}

async responseSurfaceAnalysis(
  data: Array<Record<string, unknown>>,
  dependentVar: string,
  predictorVars: string[],
  modelType: string = 'secondOrder',
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    2, 'response_surface_analysis',
    { data, dependentVar, predictorVars, modelType }
  )
}
```

- [ ] **Step 3:** Refactor `executeRegression()` — add method.id branches before default. Data extraction notes:
  - `dependent = data.arrays.dependent` (number[])
  - `independent = data.arrays.independent` (number[][] — column-major)
  - For logistic/poisson/ordinal/stepwise/response-surface: transpose to row-major matrix
  - Helper: `const X = dependent.map((_, rowIdx) => (independent ?? []).map(col => col[rowIdx]))`

```ts
private async executeRegression(
  method: StatisticalMethod,
  data: PreparedData
): Promise<StatisticalExecutorResult> {
  const dependent = data.arrays.dependent
  const independent = data.arrays.independent

  if (!dependent) {
    throw new Error('회귀분석을 위한 종속변수가 필요합니다')
  }

  // Transpose column-major → row-major matrix for multi-predictor methods
  const transposeToRows = (): number[][] =>
    dependent.map((_, rowIdx) => (independent ?? []).map(col => col[rowIdx]))

  let result: Record<string, unknown>

  switch (method.id) {
    case 'logistic-regression': {
      result = await pyodideStats.logisticRegression(transposeToRows(), dependent)
      break
    }
    case 'poisson': {
      result = await pyodideStats.poissonRegression(transposeToRows(), dependent)
      break
    }
    case 'ordinal-regression': {
      result = await pyodideStats.ordinalLogistic(transposeToRows(), dependent)
      break
    }
    case 'stepwise': {
      const varNames = (data.variables.independent as string[] | undefined) ?? null
      result = await pyodideStats.stepwiseRegression(dependent, transposeToRows(), varNames)
      break
    }
    case 'dose-response': {
      const doseData = independent?.[0]
      if (!doseData) throw new Error('용량-반응 분석을 위한 독립변수가 필요합니다')
      result = await pyodideStats.doseResponseAnalysis(doseData, dependent)
      break
    }
    case 'response-surface': {
      // response_surface_analysis expects raw rows (List[Dict]), not a matrix
      const depVarName = (data.variables.dependent as string[])?.[0] ?? ''
      const predictorVarNames = (data.variables.independent as string[]) ?? []
      result = await pyodideStats.responseSurfaceAnalysis(
        data.data, depVarName, predictorVarNames
      )
      break
    }
    default: {
      // simple/multiple linear regression (existing behavior)
      const indep = independent?.[0]
      if (!indep) throw new Error('회귀분석을 위한 독립변수가 필요합니다')
      result = await pyodideStats.regression(indep, dependent, {
        type: method.id === 'multiple-regression' ? 'multiple' : 'simple'
      })
      break
    }
  }

  // Inline result — follow existing pattern from other handlers
  const pvalue = (result as { pValue?: number; pvalue?: number }).pValue
    ?? (result as { pvalue?: number }).pvalue ?? 1
  const rSquared = (result as { rSquared?: number }).rSquared

  return {
    metadata: {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: { totalN: dependent.length, missingRemoved: 0 }
    },
    mainResults: {
      statistic: (result as { fStatistic?: number; tStatistic?: number }).fStatistic
        ?? (result as { tStatistic?: number }).tStatistic ?? 0,
      pvalue,
      df: (result as { df?: number }).df ?? 0,
      significant: pvalue < 0.05,
      interpretation: rSquared != null
        ? `R² = ${rSquared.toFixed(3)}, 회귀식이 ${pvalue < 0.05 ? '유의합니다' : '유의하지 않습니다'}`
        : `p = ${pvalue.toFixed(4)}, ${pvalue < 0.05 ? '유의합니다' : '유의하지 않습니다'}`
    },
    additionalInfo: rSquared != null
      ? { effectSize: { type: 'R-squared', value: rSquared, interpretation: this.interpretRSquared(rSquared) } }
      : {},
    visualizationData: method.id === 'dose-response'
      ? { type: 'dose-response-curve', data: result }
      : { type: 'scatter-regression', data: { x: independent?.[0] ?? [], y: dependent, regression: (result as { predictions?: number[] }).predictions } },
    rawResults: result
  }
}
```

Note: `this.interpretRSquared()` — verify this helper exists. If not, inline the interpretation logic.

- [ ] **Step 4:** Run `pnpm tsc --noEmit` — expect 0 errors
- [ ] **Step 5:** Run `pnpm test` — expect all pass
- [ ] **Step 6:** Commit: `fix(stats): wire 6 regression methods to correct Pyodide functions`

---

## Task 3: ANOVA Executor Wiring (P0 — 2 methods)

**Files:**
- Modify: `lib/services/statistical-executor.ts` — `executeANOVA()` (lines ~819-1298)
- Modify: `lib/services/pyodide-statistics.ts` — add `mixedModelAnalysis()` wrapper

**MANOVA** — `pyodideStats.manovaWorker(dataMatrix, groupValues, varNames)` exists.
**Mixed Model** — needs new wrapper calling worker4 `mixed_effects_model`.

- [ ] **Step 1:** Read `executeANOVA()` fully — understand the existing if-chain: `two-way-anova` → `games-howell` → `ancova` → `repeated-measures-anova` → default(one-way). New branches go before the default.

- [ ] **Step 2:** Add `mixedModelAnalysis()` wrapper to `pyodide-statistics.ts`.

**두 가지 worker 선택지:**
- **worker2** `mixed_model(dependent_var, fixed_effects, random_effects, data)` — snake_case, statsmodels formula API, shapiro/levene 진단 포함 (더 완전)
- **worker4** `mixed_effects_model(data, dependentColumn, fixedEffects, randomEffects)` — camelCase, 기본 MixedLM

**worker2를 사용** (더 완전한 구현):

```ts
async mixedModelAnalysis(
  dependentVar: string,
  fixedEffects: string[],
  randomEffects: string[],
  data: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    2, 'mixed_model',
    {
      dependent_var: dependentVar,
      fixed_effects: fixedEffects,
      random_effects: randomEffects,
      data,
    }
  )
}
```

- [ ] **Step 3:** Add MANOVA branch to `executeANOVA()`. Data extraction:
  - `data.variables` is `Record<string, unknown>` — access `data.variables.dependent` as `string[]`
  - For MANOVA: need multiple DVs + one group variable
  - Raw rows: `data.data` (Array<Record<string, unknown>>)
  - Extract by iterating raw rows to build dataMatrix

```ts
if (method.id === 'manova') {
  const depVarNames = (data.variables.dependent as string[]) ?? []
  const groupVarName = (data.variables.group as string) ?? (data.variables.independent as string)
  const rawRows = data.data

  // Build column-major matrix: each DV is one row of numbers
  const dataMatrix = depVarNames.map(varName =>
    rawRows.map(row => Number(row[varName]) || 0)
  )
  const groupValues = rawRows.map(row => row[groupVarName] as string | number)

  const result = await pyodideStats.manovaWorker(dataMatrix, groupValues, depVarNames)

  return {
    metadata: {
      method: method.id, methodName: method.name,
      timestamp: '', duration: 0,
      dataInfo: { totalN: data.totalN, missingRemoved: 0 }
    },
    mainResults: {
      statistic: (result as { wilksLambda?: number }).wilksLambda ?? 0,
      pvalue: (result as { pValue?: number }).pValue ?? 1,
      df: 0,
      significant: ((result as { pValue?: number }).pValue ?? 1) < 0.05,
      interpretation: `Wilks' Λ = ${((result as { wilksLambda?: number }).wilksLambda ?? 0).toFixed(4)}`
    },
    additionalInfo: {},
    visualizationData: { type: 'manova', data: result },
    rawResults: result
  }
}
```

- [ ] **Step 4:** Add Mixed Model branch:

```ts
if (method.id === 'mixed-model') {
  const depVarName = ((data.variables.dependent as string[]) ?? [])[0] ?? ''
  const fixedFactors = Array.isArray(data.variables.independent)
    ? (data.variables.independent as string[])
    : [(data.variables.group as string) ?? '']
  // No variables.random in PreparedData — use between/within if available,
  // or treat the second factor as random
  const randomFactors = (data.variables.blocking as string[] | undefined) ?? []
  const rawRows = data.data

  const result = await pyodideStats.mixedModelAnalysis(
    depVarName, fixedFactors, randomFactors, rawRows
  )

  const pvalue = (result as { pValue?: number }).pValue ?? 1
  return {
    metadata: {
      method: method.id, methodName: method.name,
      timestamp: '', duration: 0,
      dataInfo: { totalN: data.totalN, missingRemoved: 0 }
    },
    mainResults: {
      statistic: (result as { fStatistic?: number }).fStatistic ?? 0,
      pvalue,
      df: (result as { df?: number }).df ?? 0,
      significant: pvalue < 0.05,
      interpretation: `혼합 효과 모형: p = ${pvalue.toFixed(4)}`
    },
    additionalInfo: {},
    visualizationData: { type: 'mixed-model', data: result },
    rawResults: result
  }
}
```

Note: `variables.random` does NOT exist in `PreparedData`. Use `variables.blocking` as the closest match, or document this as a known limitation requiring `prepareData()` extension in a future task.

- [ ] **Step 5:** Run `pnpm tsc --noEmit` — expect 0 errors
- [ ] **Step 6:** Run `pnpm test` — expect all pass
- [ ] **Step 7:** Commit: `fix(stats): wire manova + mixed-model to correct Pyodide functions`

---

## Task 4: Time Series Executor Wiring (P0 — 2 methods) [Session B]

**Files:**
- Modify: `lib/services/statistical-executor.ts` — `executeTimeSeries()` (lines ~1997-2097)
- Modify: `lib/services/pyodide-statistics.ts` — add `arimaForecast()`, `mannKendallTest()` wrappers

**Current structure:** `executeTimeSeries()` always calls `pyodideStats.timeSeriesAnalysis(timeData)` first, then uses a switch for result extraction. The switch has cases for `stationarity-test` and `seasonal-decompose`, then a generic default.

| method.id | Python function | Worker |
|---|---|---|
| `arima` | `arima_forecast` | worker4 |
| `mann-kendall` | `mann_kendall_test` | worker1 |

- [ ] **Step 1:** Read `executeTimeSeries()` fully — understand how `timeData` is extracted
- [ ] **Step 2:** Add wrappers to `pyodide-statistics.ts`.

**Python 실제 시그니처:**
- `arima_forecast(values, order=(1,1,1), nForecast=10)` — worker4:1190
- `mann_kendall_test(data)` — worker1 (파라미터 확인 필요)

```ts
async arimaForecast(
  values: number[],
  order?: [number, number, number],
  nForecast?: number,
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    4, 'arima_forecast',
    { values, order: order ?? [1, 1, 1], nForecast: nForecast ?? 10 }
  )
}

async mannKendallTest(
  data: number[],
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    1, 'mann_kendall_test',
    { data }
  )
}
```

- [ ] **Step 3:** Modify `executeTimeSeries()` — add early-return branches BEFORE the existing `timeSeriesAnalysis()` call for methods that need different Python functions:

```ts
// Early dispatch for methods needing different Python functions
if (method.id === 'arima') {
  const result = await pyodideStats.arimaForecast(timeData)
  const pvalue = (result as { pValue?: number }).pValue ?? 1
  return {
    metadata: { method: method.id, methodName: method.name, timestamp: '', duration: 0,
      dataInfo: { totalN: timeData.length, missingRemoved: 0 } },
    mainResults: { statistic: (result as { aic?: number }).aic ?? 0, pvalue, df: 0,
      significant: pvalue < 0.05,
      interpretation: `ARIMA 모형 적합: AIC = ${((result as { aic?: number }).aic ?? 0).toFixed(2)}` },
    additionalInfo: {},
    visualizationData: { type: 'time-series-forecast', data: result },
    rawResults: result
  }
}

if (method.id === 'mann-kendall') {
  const result = await pyodideStats.mannKendallTest(timeData)
  const pvalue = (result as { pValue?: number }).pValue ?? 1
  return {
    metadata: { method: method.id, methodName: method.name, timestamp: '', duration: 0,
      dataInfo: { totalN: timeData.length, missingRemoved: 0 } },
    mainResults: {
      statistic: (result as { tau?: number; statistic?: number }).tau
        ?? (result as { statistic?: number }).statistic ?? 0,
      pvalue, df: 0,
      significant: pvalue < 0.05,
      interpretation: `Mann-Kendall 추세 검정: ${pvalue < 0.05 ? '유의한 추세가 있습니다' : '유의한 추세가 없습니다'}` },
    additionalInfo: {},
    visualizationData: { type: 'trend-line', data: result },
    rawResults: result
  }
}

// Existing code continues: const tsResult = await pyodideStats.timeSeriesAnalysis(timeData, ...)
```

- [ ] **Step 4:** `pnpm tsc --noEmit` — 0 errors
- [ ] **Step 5:** `pnpm test` — all pass
- [ ] **Step 6:** Commit: `fix(stats): wire arima + mann-kendall to correct Pyodide functions`

---

## Task 5: Descriptive Executor Wiring (P0 — 2 methods) [Session B]

**Files:**
- Modify: `lib/services/statistical-executor.ts` — `executeDescriptive()` (lines ~586-658)

**Current structure:** `if (method.id === 'normality-test') { ... } else { descriptiveStats() }`. All other method IDs fall to generic.

| method.id | Issue | Fix |
|---|---|---|
| `explore-data` | Falls to generic | Combine descriptive + normality |
| `means-plot` | Falls to generic | Worker1 `means_plot_data(data, dependentVar, factorVar)` 존재 — wrapper 추가 후 사용 |

- [ ] **Step 1:** Read `executeDescriptive()` (lines ~586-658) fully. Also add `meansPlotData()` wrapper to `pyodide-statistics.ts`:

**Python 실제 시그니처:** `means_plot_data(data, dependentVar, factorVar)` — worker1:465
- `data` = `List[Dict]` (raw rows)
- 반환: `{ descriptives, plotData, interpretation }` (CI 포함 — `ciLower/ciUpper`)

```ts
async meansPlotData(
  data: Array<Record<string, unknown>>,
  dependentVar: string,
  factorVar: string,
): Promise<Record<string, unknown>> {
  return this.core.callWorkerMethod<Record<string, unknown>>(
    1, 'means_plot_data',
    { data, dependentVar, factorVar }
  )
}
```

- [ ] **Step 2:** Add `explore-data` case before the default — it returns combined descriptive + normality:

```ts
if (method.id === 'explore-data') {
  const descriptive = await pyodideStats.descriptiveStats(values)
  const normality = values.length >= 3 ? await pyodideStats.shapiroWilkTest(values) : null
  return {
    metadata: { method: method.id, methodName: method.name, timestamp: '', duration: 0,
      dataInfo: { totalN: data.totalN, missingRemoved: 0 } },
    mainResults: {
      statistic: (descriptive as { mean?: number }).mean ?? 0,
      pvalue: normality ? ((normality as { pValue?: number }).pValue ?? 1) : 1,
      df: 0, significant: false,
      interpretation: `N = ${values.length}, 평균 = ${((descriptive as { mean?: number }).mean ?? 0).toFixed(3)}`
    },
    additionalInfo: { normality },
    visualizationData: { type: 'box-plot', data: { values } },
    rawResults: { descriptive, normality }
  }
}
```

- [ ] **Step 3:** Add `means-plot` case — worker1의 `means_plot_data`를 호출 (CI 포함 완전한 결과):

```ts
if (method.id === 'means-plot') {
  const depVarName = ((data.variables.dependent as string[]) ?? [])[0] ?? ''
  const factorVarName = (data.variables.group as string)
    ?? (data.variables.factor as string)
    ?? ((data.variables.independent as string[]) ?? [])[0] ?? ''
  const rawRows = data.data

  const result = await pyodideStats.meansPlotData(rawRows, depVarName, factorVarName)

  return {
    metadata: { method: method.id, methodName: method.name, timestamp: '', duration: 0,
      dataInfo: { totalN: data.totalN, missingRemoved: 0 } },
    mainResults: { statistic: 0, pvalue: 1, df: 0, significant: false,
      interpretation: (result as { interpretation?: { summary?: string } }).interpretation?.summary
        ?? '그룹별 평균 비교' },
    additionalInfo: { descriptives: (result as { descriptives?: unknown }).descriptives },
    visualizationData: { type: 'means-plot', data: (result as { plotData?: unknown }).plotData },
    rawResults: result
  }
}
```

- [ ] **Step 4:** `pnpm tsc --noEmit` — 0 errors
- [ ] **Step 5:** `pnpm test` — all pass
- [ ] **Step 6:** Commit: `fix(stats): wire explore-data + means-plot in executor`

---

## Task 6: Cluster ID Alignment (P0 — 전체 경로 정규화) [Session B]

**Files:**
- Modify: `lib/services/statistical-executor.ts` — `executeMultivariate()`
- Audit: `lib/statistics/menu-config.ts:425`, `lib/constants/method-page-mapping.ts:33`, `lib/statistics/data-method-compatibility.ts:100`

**문제:** registry ID는 `cluster`이지만, 여러 매핑 계층에서 `cluster-analysis`를 사용:
- `statistical-executor.ts:1790` → `case 'cluster-analysis'` + result block at ~1899
- `menu-config.ts:425` → `id: 'cluster-analysis'`
- `method-page-mapping.ts:33` → `'cluster-analysis': 'cluster'` (ID→URL 매핑)
- `data-method-compatibility.ts:100` → `'cluster': 'cluster-analysis'` (역방향 매핑)

**접근:** executor만 바꾸면 다른 경로에서 불일치 발생. 전체 ID 흐름을 추적 후 정규화 방향 결정.

- [ ] **Step 1:** `grep -rn 'cluster-analysis' lib/ components/ app/` 로 전체 참조 목록 수집
- [ ] **Step 2:** 정규화 방향 결정:
  - **Option A:** registry를 `cluster-analysis`로 변경 (다른 모든 곳과 일치) — 영향 범위 최소
  - **Option B:** 모든 곳을 `cluster`로 통일 — 깔끔하지만 변경 범위 넓음
- [ ] **Step 3:** 선택한 방향으로 모든 참조 일괄 변경
- [ ] **Step 4:** `pnpm tsc --noEmit` — 0 errors
- [ ] **Step 5:** `pnpm test` — all pass
- [ ] **Step 6:** Commit: `fix(stats): normalize cluster method ID across all layers`

---

## Task 7: welch-anova Decision [Session B]

`welch-anova` has `hasOwnPage: false` (embedded in anova page) and NO Python function exists.

- [ ] **Step 1:** Check if any executor or UI code references `welch-anova`
- [ ] **Step 2:** Decision — if no active code path, document in TODO.md as known gap
- [ ] **Step 3:** If implementing: scipy has `scipy.stats.alexandergovern` or manual Welch ANOVA via `pingouin.welch_anova()`. Add to appropriate Python worker, then add wrapper + executor case
- [ ] **Step 4:** Commit as appropriate

---

## Verification Checklist (after all tasks)

- [ ] `pnpm tsc --noEmit` — 0 errors
- [ ] `pnpm test` — all pass
- [ ] Each of 14 P0 methods now calls the correct Python function (spot-check by reading executor switch)
- [ ] Each of 14 P1 methods returns requirements from `getMethodRequirements()` (not undefined)
