# Review Request: StatisticalExecutor Split + Deprecated Wrapper Cleanup

## Summary

`statistical-executor.ts` 3,125줄 monolith를 thin dispatcher (517줄) + 12개 카테고리 handler 파일 (2,643줄)로 분할하고, Pyodide deprecated wrapper 10개를 제거한 리팩터링.

## Verification Status

- `pnpm tsc --noEmit`: PASS (0 errors)
- `pnpm vitest run` (affected suites): 12 files, 535 tests PASS
- Deprecated caller grep: CLEAN (0 remaining)

## Changes at a Glance

| Category | Files | Lines |
|----------|-------|-------|
| New handler files | 14 (12 handlers + index + shared-helpers) | +2,643 |
| Monolith reduction | statistical-executor.ts | 3,125 → 517 (-83%) |
| Deprecated wrappers removed | pyodide-statistics.ts | -250 lines |
| Executor class fixes | 5 files in executors/ | ~60 lines changed |
| Test updates | 7 test files | ~120 lines changed |
| **Net** | **26 files** | **-2,970 lines (services+tests)** |

## Architecture

```
BEFORE:
  statistical-executor.ts (3,125 lines)
    └── 12 private executeXxx() methods
    └── 7 private interpretXxx() helpers
    └── prepareData() + normalizePostHocComparisons()

AFTER:
  statistical-executor.ts (517 lines)
    └── executeMethod() → switch → handler calls
    └── prepareData()
    └── interfaces (PreparedData, StatisticalExecutorResult, etc.)

  handlers/
    ├── handle-t-test.ts          (154 lines)
    ├── handle-nonparametric.ts   (312 lines)
    ├── handle-regression.ts      (242 lines)
    ├── handle-anova.ts           (605 lines)
    ├── handle-descriptive.ts     (162 lines)
    ├── handle-correlation.ts     (73 lines)
    ├── handle-multivariate.ts    (246 lines)
    ├── handle-timeseries.ts      (165 lines)
    ├── handle-reliability.ts     (34 lines)
    ├── handle-survival.ts        (258 lines)
    ├── handle-design.ts          (54 lines)
    ├── handle-chi-square.ts      (179 lines)
    ├── shared-helpers.ts         (146 lines)
    └── index.ts                  (13 lines)
```

## Deprecated API Migration (B2)

10개 deprecated wrapper → new API로 전환:

| Deprecated | New API | Field Change |
|------------|---------|-------------|
| `oneSampleTTest()` | `tTestOneSample()` | None (both pValue camelCase) |
| `mannWhitneyU()` | `mannWhitneyTestWorker()` | pvalue → pValue |
| `wilcoxon()` | `wilcoxonTestWorker()` | pvalue → pValue |
| `kruskalWallis()` | `kruskalWallisTestWorker()` | pvalue → pValue |
| `friedman()` | `friedmanTestWorker()` | pvalue → pValue |
| `tukeyHSD()` | `tukeyHSDWorker()` | None (passthrough) |
| `regression()` | `linearRegression()` | pvalue→pValue, fStatistic/tStatistic/predictions=undefined preserved |
| `chiSquare()` | `chiSquareTestWorker()` | statistic→chiSquare, pvalue→pValue |
| `pca()` | `pcaAnalysis()` | Complex object transformation removed |
| `performPCA()` | `pcaAnalysis()` | Complex object transformation removed |

## Bug Fixes Found During Review (/simplify)

리팩터링 중 발견된 pre-existing 버그 5개 수정:

1. **`llrPValue` casing bug** (`handle-regression.ts:43`): `raw.llrPvalue` → `raw.llrPValue`. **logistic regression만 수정됨** — logistic worker만 `llrPValue` 필드를 반환. Poisson/ordinal worker는 계수별 `pValues` 배열만 반환하므로 model-level p-value는 여전히 1 (아래 Known Issues 참조).
2. **`startTime` race condition** (`statistical-executor.ts`): singleton instance field → local const. 동시 호출 시 duration 오류.
3. **`CorrelationExecutor` per-call allocation** (`handle-correlation.ts`): 매 호출 `new` → module singleton.
4. **`confidenceInterval.level` inconsistency** (`handle-t-test.ts`): `95` (integer) → `0.95` (fraction). handle-descriptive와 통일.
5. **`pvalue ?? 0` fallback** (`handle-regression.ts:106`): stepwise regression에서 missing p-value가 0(항상 유의)으로 처리 → `?? 1`(유의하지 않음)로 수정.

## Known Pre-existing Issues (NOT fixed — separate scope)

### Worker 계약 불일치 (리뷰에서 발견, 별도 세션 필요)

1. **Stepwise regression 결과 매핑 불일치** (`handle-regression.ts:105`): handler가 `fStatistic`, `pValue`, `selectedVariableCount`를 읽지만, worker4 `stepwise_regression`은 `selectedVariables`, `pValues`(배열), `rSquared`, `adjustedRSquared`를 반환. 현재 stepwise 성공 시 `statistic=0`, `pvalue=1`, 선택 변수 수 `?`로 표시됨.

2. **Poisson/ordinal regression model-level p-value 누락** (`handle-regression.ts:43`): `buildGlmResult`가 `llrPValue`만 읽지만, ordinal worker(`ordinal_logistic`)와 poisson worker(`poisson_regression`)는 계수별 `pValues` 배열만 반환하고 model-level `llrPValue`를 제공하지 않음. 따라서 두 경로는 항상 p=1.

3. **Generated types 과소정의** (`method-types.generated.ts:946, 957`): `OrdinalLogisticResult`, `PoissonRegressionResult` 타입이 실제 worker 반환 필드를 누락. handler가 `Record<string, unknown>` cast에 의존하는 원인.

4. **Chi-square routing test mock shape 불일치** (`statistical-executor-routing.test.ts:62`): `chiSquareIndependenceTest` mock이 `{ statistic, pValue, df, cramersV }` 반환하지만, handler(`handle-chi-square.ts:153`)는 `result.chiSquare`, `result.degreesOfFreedom`, `result.reject` 접근. 현재 테스트가 라우팅만 검증하고 result shape 검증을 하지 않아 통과하지만, 실제 chi-square independence 경로는 mock shape와 다른 필드를 읽음.

### 코드 품질 (minor, 기존 코드에서 이월)

- `any` 타입 3곳 (handle-nonparametric, handle-multivariate, handle-correlation) — 타입 설계 필요
- `|| 0` NaN masking in MANOVA (`handle-anova.ts:432,466`)
- Dead ternary in ANOVA (`handle-anova.ts:531`)
- `as unknown as Record<string,unknown>` double cast in regression GLM path

## Review Focus Areas

1. **Handler-monolith interface**: `handleXxx(method, data)` 시그니처가 모든 handler에서 일관되는지
2. **Deprecated migration field mapping**: pvalue/pValue 대소문자 변환이 올바른지
3. **Regression behavior preservation**: Amendment B — `fStatistic`/`tStatistic`/`predictions` = `undefined` 유지 확인
4. **shared-helpers.ts**: monolith 원본과 byte-for-byte 일치 확인 (thresholds, messages)
5. **Test coverage**: 삭제된 private method를 호출하는 테스트가 모두 마이그레이션됐는지

## Files to Review

### Core (priority)
- `stats/lib/services/statistical-executor.ts` — thin dispatcher
- `stats/lib/services/handlers/shared-helpers.ts` — shared interpretation functions
- `stats/lib/services/handlers/handle-regression.ts` — most complex deprecated fix (Amendment B)
- `stats/lib/services/handlers/handle-nonparametric.ts` — 3 deprecated fixes + field mapping

### Handler files (lower priority — mostly code moves)
- `stats/lib/services/handlers/handle-*.ts` (12 files)

### Test updates
- `stats/__tests__/services/executors/statistical-executor-routing.test.ts`
- `stats/__tests__/services/statistical-executor-group-validation.test.ts`
- `stats/__tests__/integration/executor-varreqs-alignment.test.ts`
- `stats/__tests__/bugfix/nonparametric-routing.test.ts`
- `stats/__tests__/services/ancova-worker2-simulation.test.ts`
- `stats/__tests__/services/pyodide-statistics-regression-fixes.test.ts`
- `stats/__tests__/services/executors/executor-data-extraction.test.ts`

### Deprecated wrapper cleanup
- `stats/lib/services/pyodide/pyodide-statistics.ts` — 10 functions removed
- `stats/lib/services/executors/*.ts` — 5 files updated to new API
