# Worker-Handler 계약 불일치 4건 수정

> **세션**: D (2026-04-04)  
> **접근**: 방식 A — 최소 수정 (worker 필드 추가 + handler 1줄 + codegen + mock)  
> **선행 컨텍스트**: Session B 리팩터링에서 발견, `handler-contract-gaps.test.ts`로 증명 완료

## 변경 대상 파일

| 파일 | 변경 내용 |
|------|-----------|
| `stats/public/workers/python/worker4-regression-advanced.py` | stepwise/ordinal/poisson 반환 필드 추가 |
| `stats/lib/services/handlers/handle-regression.ts` | stepwise: `selectedVariables.length` 사용 + `fPValue` 키 |
| `stats/lib/constants/methods-registry.json` | `stepwise_regression.returns` 업데이트 |
| `stats/scripts/generate-method-types.mjs` | `returnsToInterface()` `?` suffix 파싱 + override 추가 |
| `stats/lib/generated/method-types.generated.ts` | codegen 재생성 (수동 편집 아님) |
| `stats/__tests__/services/executors/statistical-executor-routing.test.ts` | chi-square mock shape 수정 |
| `stats/__tests__/services/handlers/handler-contract-gaps.test.ts` | 버그 증명 → 회귀 방지 assertion 전환 |

## P0-1: Stepwise 반환 필드 추가

### Worker4 수정

**파일**: `worker4-regression-advanced.py`  
**위치**: `stepwise_regression()` 함수, line 653 return dict

추가할 필드:
```python
'fStatistic': float(final_model.fvalue),
'fPValue': float(final_model.f_pvalue),
```

빈 선택 fallback (line 665):
```python
{'selectedVariables': [], 'rSquared': 0.0, 'fStatistic': 0.0, 'fPValue': 1.0}
```

**API 근거**: `sm.OLS(...).fit()` → `OLSResults` → `fvalue`, `f_pvalue` 표준 속성.

### Handler 수정

**파일**: `handle-regression.ts`  
**위치**: lines 105-108

| 현재 | 수정 |
|------|------|
| `stepRaw.fStatistic ?? 0` | 그대로 (이제 worker가 반환) |
| `stepRaw.pValue ?? 1` | `stepRaw.fPValue ?? 1` |
| `stepRaw.selectedVariableCount ?? '?'` | `String((stepRaw.selectedVariables as string[])?.length ?? 0)` |

**키 이름 결정**: `pValue`가 아닌 `fPValue`를 사용. worker가 이미 `pValues` (계수별 배열)를 반환하므로, 모델 수준 p-value는 `fPValue`로 구분.

### Registry 수정

**파일**: `methods-registry.json`  
**위치**: `stepwise_regression.returns` (line 911-916)

현재: `["selectedVariables", "coefficients", "rSquared", "steps"]`

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
]
```

`steps`는 worker가 반환하지 않으므로 제거. 실제 반환에 맞춤.

## P0-2: Ordinal/Poisson `llrPValue` 추가

### Ordinal 수정

**파일**: `worker4-regression-advanced.py`  
**위치**: `ordinal_logistic()` 함수, line 723 return dict

```python
try:
    llr_pvalue = float(model.llr_pvalue)
    llr_stat = float(model.llr)
except AttributeError:
    # Pyodide statsmodels 버전에 따라 llr_pvalue 미제공 가능
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

**API 근거**: `OrderedModel` → `GenericLikelihoodModel` 상속 → `llr_pvalue` 속성. Pyodide 버전 방어를 위해 `try/except`.

### Poisson 수정

**파일**: `worker4-regression-advanced.py`  
**위치**: `poisson_regression()` 함수, line 765 return dict

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

**API 근거**: `GLMResults`에 `null_deviance`, `deviance`, `df_model` 속성 있음. `llr_pvalue`는 직접 제공하지 않으므로 수동 계산. deviance 차이 = 2*(ll_full - ll_null), chi2(df_model) 분포.

### Handler 수정

**없음**. `buildGlmResult` (line 43)이 이미 `raw.llrPValue ?? 1`을 읽으므로, worker가 값을 보내면 자동으로 동작.

## P1: Codegen `?` suffix 처리

### 스크립트 수정

**파일**: `generate-method-types.mjs`  
**위치**: `returnsToInterface()` 함수 (line 445)

진입부에서 `?` strip:
```javascript
const fields = returns.map(key => {
  const optional = key.endsWith('?')
  const cleanKey = optional ? key.slice(0, -1) : key

  // override lookup: cleanKey 사용
  if (overrides[cleanKey]) {
    return `  ${cleanKey}${optional ? '?' : ''}: ${overrides[cleanKey]}`
  }

  // 이하 패턴 매칭: key 대신 cleanKey 사용
  // ...

  return `  ${cleanKey}${optional ? '?' : ''}: ${type}`
})
```

### Override 추가

**파일**: `generate-method-types.mjs`  
**위치**: `METHOD_TYPE_OVERRIDES` 객체 (line ~189)

```javascript
'hardy_weinberg': {
  // 기존 override 유지 +
  'exactPValue': 'number',
},
'fst': {
  // 기존 override 유지 +
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

### 재생성

```bash
node stats/scripts/generate-method-types.mjs
```

검증: `method-types.generated.ts`에서 `FstResult`의 optional 필드가 `unknown`이 아닌 올바른 타입인지 확인.

## P2: Routing test mock shape 수정

### Mock 수정

**파일**: `statistical-executor-routing.test.ts`  
**위치**: line 62

현재:
```typescript
chiSquareIndependenceTest: vi.fn().mockResolvedValue({
  statistic: 12.5, pValue: 0.002, df: 4, cramersV: 0.3
})
```

수정:
```typescript
chiSquareIndependenceTest: vi.fn().mockResolvedValue({
  chiSquare: 12.5, pValue: 0.002, degreesOfFreedom: 4,
  criticalValue: 9.49, reject: true, cramersV: 0.3,
  observedMatrix: [[10, 5], [3, 12]],
  expectedMatrix: [[6.5, 8.5], [6.5, 8.5]]
})
```

### Contract test assertion 전환

**파일**: `handler-contract-gaps.test.ts`

수정 후 worker mock에 새 필드 추가하고 assertion을 "정상 동작 검증"으로 전환:

**Issue 1 (stepwise)**: mock에 `fStatistic`, `fPValue` 추가 → `statistic !== 0`, `pvalue < 1`, interpretation에 `2개` 포함 검증

**Issue 2 (ordinal/poisson)**: mock에 `llrPValue`, `llrStatistic` 추가 → `pvalue < 1` 검증

**Issue 4 (chi-square)**: "잘못된 mock shape" 테스트는 제거 또는 주석 처리 (routing mock이 수정되므로 의미 없음)

## 범위 밖 (명시적 제외)

- `binary_logistic`, `probit_regression`, `negative_binomial_regression`에 `llrPValue` 추가 — 현재 handler routing 없음
- Handler runtime assertion (12개 전체) — [PLAN-HANDLER-RUNTIME-CONTRACTS.md](../PLAN-HANDLER-RUNTIME-CONTRACTS.md)
- `WorkerRaw*` 타입 정의 — 별도 세션

## 검증 계획

1. `pnpm tsc --noEmit` — 타입 에러 없음
2. `pnpm test` — 기존 + 수정된 contract 테스트 통과
3. Codegen 재생성 후 `FstResult`, `StepwiseRegressionResult` 필드 확인
