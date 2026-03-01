# G3 브릿지 — A' 작업 세트 구현 리뷰 요청

> **요청**: A' (ANCOVA Worker2 전환 + 안전장치 5종) 구현 결과를 비판적으로 검토해주세요.
> **관심사**: 런타임 안전성, 타입 계약, 누락, 아키텍처 결함

---

## 배경

### 프로젝트
- **BioHub**: Next.js 15 + TypeScript + Pyodide (브라우저 내 Python) 통계 분석 플랫폼
- **Pyodide Worker**: Python 코드를 WebWorker에서 실행. Worker 1~5, 각각 다른 통계 패키지
- **G3 브릿지**: 통계 분석 결과(`AnalysisResult`)를 Graph Studio(`ChartSpec`)로 전달하는 파이프라인 (아직 미구현)

### A' 작업 세트란?
G3 구현의 **전제조건**으로 식별된 upstream 결함 수정 세트. ANCOVA 분석에서 사후검정(postHoc) 데이터가 손실되는 문제를 해결하기 위해, Worker3(postHoc 미지원) → Worker2(postHoc 포함) 전환 + 관련 안전장치 5종.

---

## 변경 파일 및 내용

### 1. `worker2-hypothesis.py` — Python Worker

**변경 A'-1**: L1573 `effectSize` → `effect_size` (내부 변수 명명 규칙 snake_case)

**변경 7C-1**: L1560-1567 `model_fit` 딕셔너리 키 수정
```python
# Before:
model_fit = {
    'rSquared': float(model.rsquared),
    'adjustedRSquared': float(model.rsquared_adj),
    'fStatistic': float(model.fvalue),
    'modelPValue': float(model.f_pvalue),         # ← TS 타입과 불일치
    'residualStandardError': float(np.std(residuals))
    # rmse 미반환
}

# After:
rmse = float(np.sqrt(np.mean(residuals ** 2)))
model_fit = {
    'rSquared': float(model.rsquared),
    'adjustedRSquared': float(model.rsquared_adj),
    'fStatistic': float(model.fvalue),
    'fPValue': float(model.f_pvalue),              # ← TS 타입과 일치
    'rmse': rmse,                                   # ← 추가
    'residualStandardError': float(np.std(residuals))
}
```

**리뷰 포인트**:
- `rmse = sqrt(mean(residuals²))` 계산이 통계적으로 올바른가?
- statsmodels `model.mse_resid` 등 기존 속성을 활용하는 게 더 나은가?

---

### 2. `pyodide-core.service.ts` — WorkerMethodParam 타입

**변경 7H-1**: `WorkerMethodParam` 유니온에 `WorkerMethodParam[]` 추가
```typescript
export type WorkerMethodParam =
  | number | string | boolean
  | number[] | string[] | number[][] | (number | string)[]
  | null
  | { [key: string]: WorkerMethodParam }
  | WorkerMethodParam[]   // ← 추가: Array<Record<string, unknown>> 지원
```

**리뷰 포인트**:
- 재귀 타입 `WorkerMethodParam[]`이 순환 참조 문제를 일으키지 않는가?
- 이 변경으로 기존 `callWorkerMethod` 호출이 의도치 않게 타입 체크를 통과하게 되는 경우가 있는가?

---

### 3. `pyodide-statistics.ts` — ANCOVA wrapper

**변경 A'-3**: Worker2 `ancova_analysis` 호출 wrapper 추가
```typescript
export interface Worker2AncovaResult {
  mainEffects: Worker2AncovaMainEffect[]
  covariates: Worker2AncovaCovariate[]
  adjustedMeans: Array<{ group: string; adjustedMean: number; standardError: number; ci95Lower: number; ci95Upper: number }>
  postHoc: Worker2AncovaPostHoc[]
  assumptions: Record<string, unknown>
  modelFit: { rSquared: number; adjustedRSquared: number; fStatistic: number; fPValue: number; rmse: number; residualStandardError: number }
  interpretation: Record<string, unknown>
}

async ancovaAnalysisWorker(
  dependentVar: string,
  factorVars: string[],
  covariateVars: string[],
  data: Array<Record<string, unknown>>
): Promise<Worker2AncovaResult> {
  return this.core.callWorkerMethod<Worker2AncovaResult>(
    2, 'ancova_analysis',
    {
      dependent_var: dependentVar,
      factor_vars: factorVars,
      covariate_vars: covariateVars,
      data: data as WorkerMethodParam,
    }
  )
}
```

**변경 M-3**: 구 `ancovaWorker()` (Worker3)에 `@deprecated` 추가

**리뷰 포인트**:
- `Worker2AncovaResult`가 Python `ancova_analysis()` 반환값과 정확히 일치하는가?
- `Worker2AncovaPostHoc` 서브 타입에 `comparison`, `adjustedPValue` 등 모든 필드가 있는가?
- `data as WorkerMethodParam` 단일 캐스트가 안전한가?

---

### 4. `statistical-executor.ts` — ANCOVA 실행 경로 + normalizer

**변경 A'-3**: ANCOVA 경로를 Worker3 → Worker2로 전환 (L1022-1095)
```typescript
// 데이터 필터링: 모든 변수에 유효한 값이 있는 행만 추출
const validRows: Array<Record<string, unknown>> = []
for (const row of data.data as Record<string, unknown>[]) {
  const yVal = Number(row[dependentVar])
  const gVal = row[groupVar]
  const covVals = covariateVars.map((col: string) => Number(row[col]))
  if (!isNaN(yVal) && gVal != null && covVals.every((v: number) => !isNaN(v))) {
    validRows.push(row)
  }
}

const ancovaResult = await pyodideStats.ancovaAnalysisWorker(
  dependentVar, [groupVar], covariateVars, validRows
)

const mainEffect = ancovaResult.mainEffects?.[0]  // 7C-3: 안전 접근
const postHoc = this.normalizePostHocComparisons(ancovaResult.postHoc ?? [])
```

**변경 A'-4 + 7M-1 + 7M-2**: `normalizePostHocComparisons()` 확장
```typescript
// comparison 문자열 파싱 ("A vs B" → group1/group2)
if (group1 === undefined || group2 === undefined) {
  const comparison = typeof comp.comparison === 'string' ? comp.comparison : undefined
  if (comparison && comparison.includes(' vs ')) {
    const parts = comparison.split(' vs ', 2)       // M-1: limit 추가
    group1 = parts[0]?.trim() || undefined           // M-2: 빈 문자열 가드
    group2 = parts[1]?.trim() || undefined
  }
}

// adjustedPValue 우선순위 (7H-2: Python 반환 키를 1순위로)
pvalueAdjusted:
  typeof comp.adjustedPValue === 'number'    // ← Python 표준 (1순위)
    ? comp.adjustedPValue
    : typeof comp.pvalueAdjusted === 'number'
      ...
```

**변경 A'-5**: Games-Howell direct 경로에 `postHocMethod: 'games-howell'` 추가

**리뷰 포인트**:
- `data.data as Record<string, unknown>[]` — `data.data`의 실제 타입은 무엇인가? 안전한 캐스트인가?
- `validRows` 필터링이 누락 행을 발생시킬 수 있는가? (ex: 범주형 groupVar에 숫자 0이 있을 때 `gVal != null` 통과)
- `mainEffect?.partialEtaSquared`가 undefined일 때 effectSize 블록 전체가 undefined로 반환 — UI에서 이를 처리하는가?
- `additionalInfo.modelFit: ancovaResult.modelFit` — `modelFit` 내부 키(`fPValue`, `rmse`)가 UI에서 사용되는가? 사용된다면 undefined 안전한가?

---

### 5. Worker 패키지 맵 동기화

3곳의 패키지 맵이 완전 일치하도록 수정:

| Worker | `pyodide-core.service.ts` | `pyodide-worker.ts` | `pyodide-init-logic.ts` |
|--------|--------------------------|--------------------|-----------------------|
| 1 | `[]` | `[]` | `[]` |
| 2 | `['statsmodels', 'pandas']` | `['statsmodels', 'pandas']` | `['statsmodels', 'pandas']` |
| 3 | `['statsmodels', 'pandas', 'scikit-learn']` | `['statsmodels', 'pandas', 'scikit-learn']` | `['statsmodels', 'pandas', 'scikit-learn']` |
| 4 | `['statsmodels', 'scikit-learn']` | `['statsmodels', 'scikit-learn']` | `['statsmodels', 'scikit-learn']` |
| 5 | `['scikit-learn']` | `['scikit-learn']` | `['scikit-learn']` |

**리뷰 포인트**:
- 3곳에 동일 데이터가 중복 — 단일 소스(Single Source of Truth)로 통합해야 하지 않는가?
- `pyodide-core.service.ts`의 `WORKER_EXTRA_PACKAGES`는 `Object.freeze`로 불변 보장. 나머지 2곳은 일반 함수 내부 상수 — 불일치 재발 위험.

---

### 6. `method-types.generated.ts` — Worker2Method 타입

**변경 7H-1**: `ancova_analysis` 추가
```typescript
export type Worker2Method = '...' | 'power_analysis' | 'ancova_analysis'
```

**리뷰 포인트**:
- `generated` 파일을 수동 수정 — 코드 생성 파이프라인이 있다면 다음 생성 시 덮어써질 위험

---

### 7. 테스트 파일

`pyodide-init-logic.test.ts` 업데이트:
- Worker2 패키지 테스트: `[]` → `['statsmodels', 'pandas']`
- Worker3 패키지 테스트: `['statsmodels', 'scikit-learn']` → `['statsmodels', 'pandas', 'scikit-learn']`
- Worker5 파일명 + 패키지 테스트 추가
- invalid worker number: `5` → `6`

---

## 8차 리뷰 반영 (추가 수정)

### 8H-1: ANCOVA 변수 매핑 키 불일치 (수정 완료)

ANCOVA에서 `data.variables.dependent`/`.group`만 읽었으나, `VariableMapping` 원본은 `dependentVar`/`groupVar` 키. `prepareData()`는 ANCOVA에 대해 키 정규화 미수행.

**수정**: fallback 패턴 적용
```typescript
// Before:
const dependentVar = (data.variables.dependent as string[] | undefined)?.[0] || ''
const groupVar = data.variables.group as string

// After:
const rawDep = data.variables.dependent || data.variables.dependentVar
const dependentVar = rawDep ? (Array.isArray(rawDep) ? (rawDep as string[])[0] : rawDep as string) : ''
const groupVar = (data.variables.group || data.variables.groupVar) as string
```

### 8M-1: validRows 데이터 타입 정제 (수정 완료)

원본 row를 그대로 전달하면 숫자형 문자열이 Worker2에서 object dtype 유발 가능.

**수정**: 숫자형 필드를 명시적 `Number()`로 변환한 `cleanRow` 전달.

### 8M-2: modelFit 중첩 → transformer 유실 (수정 완료)

ANCOVA `additionalInfo.modelFit.rmse` 중첩 vs transformer `additionalInfo.rmse` top-level 읽기.

**수정**: executor에서 `rSquared`, `adjustedRSquared`, `rmse`를 top-level로 평탄화 추가.

---

## 9차: ANCOVA 시뮬레이션 테스트 추가

`ancova-worker2-simulation.test.ts` — 17개 테스트 (정상경로 6, 변수매핑 3, validRows 3, 엣지 3, transformer 호환 1, rawResults 1).

**발견**: `prepareData()`가 `group: null` 행을 `"null"` 문자열 그룹으로 생성 → 잠재적 런타임 이슈 (테스트 데이터에서 재현 확인).

---

## 알려진 미해결 이슈

1. **`power_analysis()` statsmodels 키워드 불일치**: `solve_power(effectSize=...)` → API는 `effect_size` 기대. `try-except`로 묵시적 실패 중. 기존 버그, A' 범위 외.
2. **레거시 `ancovaWorker()` 완전 제거**: 테스트 매핑에서 참조. `@deprecated` 처리만 완료.
3. **패키지 맵 3중 중복**: 아키텍처적 기술부채 (Single Source of Truth 통합 필요).

---

## 검증 결과

```
tsc --noEmit: 0 errors
pnpm test: 5407 passed, 0 failed, 13 skipped
```

---

## 리뷰어에게 질문

1. Worker2 `ancova_analysis()` Python → TS 타입 계약이 완전한가? 놓친 필드가 있는가?
2. `WorkerMethodParam[]` 유니온 추가의 부작용이 있는가?
3. ANCOVA executor의 `validRows` 필터링 로직에 데이터 손실 위험이 있는가?
4. 3곳 패키지 맵 중복 — 즉시 통합해야 하는가, 아니면 현재 상태로 충분한가?
5. `prepareData()`의 `String(grp)` 변환에서 `null`/`undefined` 그룹이 `"null"`/`"undefined"` 문자열 키로 변환되는 동작이 의도적인가?
6. ANCOVA 시뮬레이션 테스트 17개가 충분한가? 누락된 엣지 케이스가 있는가?
7. 다른 결함이나 개선점이 있는가?
