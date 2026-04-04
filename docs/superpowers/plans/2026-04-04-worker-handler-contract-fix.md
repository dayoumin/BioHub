# Worker-Handler 계약 불일치 4건 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Worker4의 stepwise/ordinal/poisson 반환 필드 누락으로 인한 런타임 버그 3건 수정 + codegen `?` suffix 처리 + test mock 정합성 수정

**Architecture:** Python worker에 빠진 통계량 필드를 추가하고, handler 1곳의 키 매핑을 수정하고, codegen 스크립트의 optional 필드 처리를 고치고, test mock을 실제 worker 반환에 맞춘다. 변환 책임은 기존대로 TS handler에 유지.

**Tech Stack:** Python (statsmodels, scipy), TypeScript, Vitest, Node.js codegen script

**Spec:** `docs/superpowers/specs/2026-04-04-worker-handler-contract-fix.md`

---

## File Map

| 파일 | 역할 | Task |
|------|------|------|
| `stats/public/workers/python/worker4-regression-advanced.py` | stepwise/ordinal/poisson 반환 수정 | 1, 2 |
| `stats/lib/services/handlers/handle-regression.ts` | stepwise 키 매핑 수정 | 3 |
| `stats/lib/constants/methods-registry.json` | stepwise returns 업데이트 | 4 |
| `stats/scripts/generate-method-types.mjs` | `?` suffix + overrides | 4 |
| `stats/lib/generated/method-types.generated.ts` | 재생성 (수동 편집 아님) | 4 |
| `stats/__tests__/services/executors/statistical-executor-routing.test.ts` | chi-square mock 수정 | 5 |
| `stats/__tests__/services/handlers/handler-contract-gaps.test.ts` | 회귀 방지 전환 | 6 |

---

### Task 1: Worker4 stepwise 반환 필드 추가

**Files:**
- Modify: `stats/public/workers/python/worker4-regression-advanced.py:649-665`

- [ ] **Step 1: stepwise 성공 경로에 `fStatistic`, `fPValue` 추가**

`worker4-regression-advanced.py` line 653의 return dict에 두 필드 추가:

```python
        return {
            'selectedVariables': [var_names[i] for i in selected],
            'selectedIndices': selected,
            'rSquaredHistory': r_squared_history,
            'coefficients': [float(c) for c in final_model.params],
            'stdErrors': [float(e) for e in final_model.bse],
            'tValues': [float(t) for t in final_model.tvalues],
            'pValues': [float(p) for p in final_model.pvalues],
            'rSquared': float(final_model.rsquared),
            'adjustedRSquared': float(final_model.rsquared_adj),
            'fStatistic': float(final_model.fvalue),
            'fPValue': float(final_model.f_pvalue)
        }
```

- [ ] **Step 2: stepwise 빈 선택 fallback에도 일관된 필드 추가**

`worker4-regression-advanced.py` line 665:

```python
        return {'selectedVariables': [], 'rSquared': 0.0, 'fStatistic': 0.0, 'fPValue': 1.0}
```

---

### Task 2: Worker4 ordinal/poisson `llrPValue` 추가

**Files:**
- Modify: `stats/public/workers/python/worker4-regression-advanced.py:715-730, 757-774`

- [ ] **Step 1: ordinal_logistic에 `llrPValue` 추가 (try/except 방어)**

`worker4-regression-advanced.py`의 `ordinal_logistic()` 함수. line 721 (`model = ...`) 뒤, return 앞에 삽입:

```python
    try:
        llr_pvalue = float(model.llr_pvalue)
        llr_stat = float(model.llr)
    except AttributeError:
        null_model = OrderedModel(y, np.ones((len(y), 1)), distr='logit').fit(disp=0)
        llr_stat = float(2 * (model.llf - null_model.llf))
        from scipy.stats import chi2
        llr_pvalue = float(chi2.sf(llr_stat, len(model.params)))
```

return dict에 추가:
```python
        'llrPValue': llr_pvalue,
        'llrStatistic': llr_stat,
```

- [ ] **Step 2: poisson_regression에 `llrPValue` 추가 (deviance 기반)**

`worker4-regression-advanced.py`의 `poisson_regression()` 함수. line 763 (`model = ...`) 뒤, return 앞에 삽입:

```python
    from scipy.stats import chi2
    llr_stat = float(model.null_deviance - model.deviance)
    llr_pvalue = float(chi2.sf(llr_stat, model.df_model))
```

return dict에 추가:
```python
        'llrPValue': llr_pvalue,
        'llrStatistic': llr_stat,
```

---

### Task 3: Handler stepwise 키 매핑 수정

**Files:**
- Modify: `stats/lib/services/handlers/handle-regression.ts:104-108`

- [ ] **Step 1: stepwise mainResults 키 3곳 수정**

`handle-regression.ts` lines 104-108, 현재:

```typescript
        mainResults: {
          statistic: Number(stepRaw.fStatistic ?? 0),
          pvalue: Number(stepRaw.pValue ?? 1),
          significant: Number(stepRaw.pValue ?? 1) < 0.05,
          interpretation: `단계적 회귀 분석 완료 — 선택된 변수 ${String(stepRaw.selectedVariableCount ?? '?')}개`
        },
```

수정:

```typescript
        mainResults: {
          statistic: Number(stepRaw.fStatistic ?? 0),
          pvalue: Number(stepRaw.fPValue ?? 1),
          significant: Number(stepRaw.fPValue ?? 1) < 0.05,
          interpretation: `단계적 회귀 분석 완료 — 선택된 변수 ${String((stepRaw.selectedVariables as string[] | undefined)?.length ?? 0)}개`
        },
```

변경점 3곳:
- `stepRaw.pValue` → `stepRaw.fPValue` (2곳 — pvalue, significant)
- `stepRaw.selectedVariableCount` → `(stepRaw.selectedVariables as string[] | undefined)?.length ?? 0`

---

### Task 4: Codegen `?` suffix 처리 + registry 업데이트 + 재생성

**Files:**
- Modify: `stats/scripts/generate-method-types.mjs:258-260, 423-439, 445-668`
- Modify: `stats/lib/constants/methods-registry.json:911-916`
- Regenerate: `stats/lib/generated/method-types.generated.ts`

- [ ] **Step 1: `returnsToInterface()` 함수에서 `?` suffix strip**

`generate-method-types.mjs` line 448, 현재:

```javascript
  const fields = returns.map(key => {
    // 메서드별 오버라이드 우선 적용
    if (overrides[key]) {
      return `  ${key}: ${overrides[key]}`
    }
    let type = 'unknown'
```

수정:

```javascript
  const fields = returns.map(key => {
    const optional = key.endsWith('?')
    const cleanKey = optional ? key.slice(0, -1) : key

    // 메서드별 오버라이드 우선 적용 (cleanKey로 lookup)
    if (overrides[cleanKey]) {
      return `  ${cleanKey}${optional ? '?' : ''}: ${overrides[cleanKey]}`
    }
    let type = 'unknown'
```

그리고 함수 내 **모든** `key` 참조를 `cleanKey`로 변경 (패턴 매칭 전체), 마지막 return (line 668):

```javascript
    return `  ${cleanKey}${optional ? '?' : ''}: ${type}`
```

- [ ] **Step 2: `METHOD_TYPE_OVERRIDES`에 누락 필드 추가**

`generate-method-types.mjs`, `hardy_weinberg` override (line 423) 블록 안에 추가:

```javascript
  'hardy_weinberg': {
    'alleleFreqP': 'number',
    'alleleFreqQ': 'number',
    'observedCounts': 'number[]',
    'expectedCounts': 'number[]',
    'inEquilibrium': 'boolean',
    'isMonomorphic': 'boolean',
    'nTotal': 'number',
    'lowExpectedWarning': 'boolean',
    'locusResults': 'Array<{ locus: string; observedCounts: number[]; expectedCounts: number[]; alleleFreqP: number; alleleFreqQ: number; chiSquare: number; pValue: number; degreesOfFreedom: number; inEquilibrium: boolean; isMonomorphic: boolean; nTotal: number; lowExpectedWarning: boolean }> | null',
    'exactPValue': 'number',
  },
```

`fst` override (line 434) 블록에 optional 필드 추가:

```javascript
  'fst': {
    'globalFst': 'number',
    'pairwiseFst': 'number[][] | null',
    'populationLabels': 'string[]',
    'nPopulations': 'number',
    'nIndividuals': 'number',
    'nLoci': 'number',
    'locusNames': 'string[]',
    'permutationPValue': 'number',
    'nPermutations': 'number',
    'bootstrapCi': '[number, number]',
    'nBootstrap': 'number',
    'bootstrapWarning': 'string',
  },
```

`stepwise_regression` override (line 258) 업데이트 — `steps` 제거, 새 필드 불필요 (패턴 매칭으로 커버):

```javascript
  'stepwise_regression': {
    'selectedIndices': 'number[]',
    'rSquaredHistory': 'number[]',
  },
```

(`steps`는 registry에서도 제거되므로 override 불필요. `fStatistic`, `fPValue`, `rSquared`, `adjustedRSquared` 등은 기존 패턴 매칭에서 `number`로 추론됨. `selectedIndices`와 `rSquaredHistory`만 패턴에 안 잡힘.)

- [ ] **Step 3: Registry `stepwise_regression.returns` 업데이트**

`methods-registry.json` line 911-916, 현재:

```json
        "returns": [
          "selectedVariables",
          "coefficients",
          "rSquared",
          "steps"
        ],
```

수정:

```json
        "returns": [
          "selectedVariables",
          "selectedIndices",
          "rSquaredHistory",
          "coefficients",
          "stdErrors",
          "tValues",
          "pValues",
          "rSquared",
          "adjustedRSquared",
          "fStatistic",
          "fPValue"
        ],
```

- [ ] **Step 4: 타입 재생성**

Run: `node stats/scripts/generate-method-types.mjs`

- [ ] **Step 5: 재생성 결과 검증**

검증 항목:
1. `FstResult`에서 `nIndividuals?: number` (not `unknown`)
2. `HardyWeinbergResult`에서 `exactPValue?: number` (not `unknown`)
3. `StepwiseRegressionResult`에서 `fStatistic: number`, `fPValue: number` 존재
4. `StepwiseRegressionResult`에서 `steps` 필드 없음

Run: `pnpm tsc --noEmit` (타입 에러 없는지 확인)

---

### Task 5: Routing test chi-square mock shape 수정

**Files:**
- Modify: `stats/__tests__/services/executors/statistical-executor-routing.test.ts:62`

- [ ] **Step 1: chi-square independence mock을 실제 worker 반환 shape으로 수정**

`statistical-executor-routing.test.ts` line 62, 현재:

```typescript
    chiSquareIndependenceTest: vi.fn().mockResolvedValue({ statistic: 12.5, pValue: 0.002, df: 4, cramersV: 0.3 }),
```

수정:

```typescript
    chiSquareIndependenceTest: vi.fn().mockResolvedValue({ chiSquare: 12.5, pValue: 0.002, degreesOfFreedom: 4, criticalValue: 9.49, reject: true, cramersV: 0.3, observedMatrix: [[10, 5], [3, 12]], expectedMatrix: [[6.5, 8.5], [6.5, 8.5]] }),
```

- [ ] **Step 2: 테스트 실행**

Run: `pnpm test stats/__tests__/services/executors/statistical-executor-routing.test.ts`
Expected: PASS

---

### Task 6: Contract gaps 테스트를 회귀 방지로 전환

**Files:**
- Modify: `stats/__tests__/services/handlers/handler-contract-gaps.test.ts`

- [ ] **Step 1: stepwise mock에 새 필드 추가 + assertion 전환**

`handler-contract-gaps.test.ts` line 69의 `ACTUAL_WORKER_RESULT`에 추가:

```typescript
  const ACTUAL_WORKER_RESULT = {
    selectedVariables: ['x1', 'x3'],
    selectedIndices: [0, 2],
    rSquaredHistory: [0.45, 0.72],
    coefficients: [1.2, 0.5, 0.3],
    stdErrors: [0.1, 0.2, 0.15],
    tValues: [12.0, 2.5, 2.0],
    pValues: [0.0001, 0.015, 0.05],
    rSquared: 0.72,
    adjustedRSquared: 0.69,
    fStatistic: 25.3,
    fPValue: 0.0001,
  }
```

Assertion (lines 89-104) 전환:

```typescript
    // 수정 후: worker가 fStatistic을 반환하므로 실제 값
    expect(result.mainResults.statistic).toBe(25.3)

    // 수정 후: worker가 fPValue를 반환하므로 실제 값
    expect(result.mainResults.pvalue).toBe(0.0001)
    expect(result.mainResults.significant).toBe(true)

    // 수정 후: selectedVariables.length 사용
    expect(result.mainResults.interpretation).toContain('2개')

    // rSquared는 기존과 동일
    expect(result.additionalInfo.effectSize?.value).toBe(0.72)
```

- [ ] **Step 2: ordinal mock에 `llrPValue` 추가 + assertion 전환**

`handler-contract-gaps.test.ts` line 112의 `ORDINAL_WORKER_RESULT`에 추가:

```typescript
  const ORDINAL_WORKER_RESULT = {
    coefficients: [0.8, -0.3],
    stdErrors: [0.2, 0.1],
    zValues: [4.0, -3.0],
    pValues: [0.00006, 0.003],
    aic: 150.2,
    bic: 158.7,
    llrPValue: 0.0002,
    llrStatistic: 18.5,
  }
```

Assertion (line 142-144) 전환:

```typescript
    // 수정 후: llrPValue가 있으므로 실제 값
    expect(result.mainResults.pvalue).toBe(0.0002)
    expect(result.mainResults.significant).toBe(true)
```

- [ ] **Step 3: poisson mock에 `llrPValue` 추가 + assertion 전환**

`handler-contract-gaps.test.ts` line 122의 `POISSON_WORKER_RESULT`에 추가:

```typescript
  const POISSON_WORKER_RESULT = {
    coefficients: [0.5, 0.2],
    stdErrors: [0.1, 0.05],
    zValues: [5.0, 4.0],
    pValues: [0.0000006, 0.00006],
    deviance: 45.2,
    pearsonChi2: 42.8,
    aic: 200.1,
    bic: 210.5,
    llrPValue: 0.00003,
    llrStatistic: 22.1,
  }
```

Assertion (line 158-160) 전환:

```typescript
    // 수정 후: llrPValue가 있으므로 실제 값
    expect(result.mainResults.pvalue).toBe(0.00003)
    expect(result.mainResults.significant).toBe(true)
```

- [ ] **Step 4: chi-square "잘못된 mock" 테스트 제거**

`handler-contract-gaps.test.ts`의 `it('routing test의 잘못된 mock shape로는...')` 테스트 (line 250-288)를 삭제. routing mock이 수정되었으므로 이 버그 증명 테스트는 의미 없음.

- [ ] **Step 5: 파일 상단 주석 업데이트**

```typescript
/**
 * Handler–Worker Contract Regression Tests
 *
 * 이전 계약 불일치 4건이 수정되었음을 검증하는 회귀 방지 테스트.
 * 원본: Session B에서 버그 증명용으로 작성, Session D에서 수정 후 전환.
 */
```

- [ ] **Step 6: 전체 테스트 실행**

Run: `pnpm test stats/__tests__/services/handlers/handler-contract-gaps.test.ts`
Expected: 모든 테스트 PASS

---

### Task 7: 최종 검증 + 커밋

- [ ] **Step 1: 타입 체크**

Run: `pnpm tsc --noEmit`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트**

Run: `pnpm test`
Expected: 기존 테스트 + 수정된 contract 테스트 모두 PASS

- [ ] **Step 3: 커밋**

```bash
git add stats/public/workers/python/worker4-regression-advanced.py stats/lib/services/handlers/handle-regression.ts stats/lib/constants/methods-registry.json stats/scripts/generate-method-types.mjs stats/lib/generated/method-types.generated.ts stats/__tests__/services/executors/statistical-executor-routing.test.ts stats/__tests__/services/handlers/handler-contract-gaps.test.ts docs/PLAN-HANDLER-RUNTIME-CONTRACTS.md docs/superpowers/specs/2026-04-04-worker-handler-contract-fix.md docs/superpowers/plans/2026-04-04-worker-handler-contract-fix.md TODO.md
git commit -m "fix(stats): worker4 stepwise/ordinal/poisson 반환 필드 수정 + codegen ? suffix + chi-square mock"
```
