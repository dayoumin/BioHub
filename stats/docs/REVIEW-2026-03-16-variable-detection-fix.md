# AI 코드 리뷰 요청: Variable Detection ID 컬럼 오감지 수정

**날짜**: 2026-03-16
**브랜치**: `feature/ui-redesign`
**관련 파일 4개**

---

## 배경 / 문제

E2E 테스트(`analysis-e2e.spec.ts`)에서 다음 3개 테스트가 실패했습니다:
- 일표본 t-검정
- 대응표본 t-검정
- 이원 분산분석

실패 원인을 분석한 결과 **두 가지 독립된 버그**가 있었습니다.

---

## 버그 1: testid 불일치 (이원 분산분석)

**원인**: Phase 2a에서 개별 셀렉터(OneSampleSelector 등)를 `UnifiedVariableSelector`로 통합하면서 버튼 `data-testid`가 변경됨.

| 변경 전 | 변경 후 |
|---------|---------|
| `run-analysis-btn` (구버전 컴포넌트) | `variable-selection-next` (UnifiedVariableSelector) |

테스트는 구버전 testid를 기다리다 타임아웃.

---

## 버그 2: ID 컬럼 오감지 (일표본, 대응표본)

**원인**: `variable-detection-service.ts`의 heuristic fallback에서 `numericCols[0]`을 종속변수 후보로 선택할 때 ID 컬럼(`idDetection.isId = true`)을 제외하지 않음.

**예시**:
- `one-sample-t.csv`: 컬럼 `id`(numeric), `value`(numeric)
  - 수정 전: `dependentCandidate = 'id'` → 슬롯에 할당 실패 (id는 UnifiedVariableSelector 풀에서 제외됨) → 버튼 비활성
  - 수정 후: `dependentCandidate = 'value'` ✓

- `paired-t-test.csv`: 컬럼 `subject`(numeric, isId=true), `pre`(numeric), `post`(numeric)
  - 수정 전: `pairedVars = ['subject', 'pre']` → subject가 풀에 없어 `pre`만 할당(1/2 미완료)
  - 수정 후: `pairedVars = ['pre', 'post']` ✓

> **참고**: `id`는 이름 패턴(`/^(id|...)$/i`)으로, `subject`는 값 기반 연속 정수 감지로 `idDetection.isId = true`가 설정됩니다. `variable-type-detector.ts`의 `detectIdColumn()` 함수에서 처리됩니다.

---

## 변경 내용

### 1. `stats/lib/services/variable-detection-service.ts`

```diff
+ // heuristic fallback용: ID 컬럼 제외 (sequential integer는 분석 변수가 아님)
+ const nonIdNumericCols = cols
+   .filter((col: ColumnStatistics) => col.type === 'numeric' && !col.idDetection?.isId)
+   .map((col: ColumnStatistics) => col.name)

  // 2순위 fallback
- } else if (numericCols.length > 0) {
-   detectedVars.dependentCandidate = numericCols[0]
+ } else if (nonIdNumericCols.length > 0) {
+   detectedVars.dependentCandidate = nonIdNumericCols[0]

  // 3순위: paired-t-test heuristic
- if (numericCols.length >= 2) {
-   detectedVars.pairedVars = [numericCols[0], numericCols[1]]
+ if (nonIdNumericCols.length >= 2) {
+   detectedVars.pairedVars = [nonIdNumericCols[0], nonIdNumericCols[1]]
```

**의도**: `numericCols`는 전체 numeric (LLM 1순위용 유지), `nonIdNumericCols`는 ID 제외 (heuristic 전용).

### 2. `stats/__tests__/services/variable-detection-service.test.ts`

회귀 방지 테스트 2개 추가:
- `id + value` → `dependentCandidate = 'value'`, not `'id'`
- `subject + pre + post` → `pairedVars = ['pre', 'post']`, `'subject'` 미포함

### 3. `stats/e2e/analysis-e2e.spec.ts`

- testid 수정: `S.runAnalysisBtn` → `S.variableSelectionNext` (3곳)
- 대기 조건 강화: `waitFor({ state: 'visible' })` → `toBeEnabled()` (일표본, 대응표본)
  - 이유: 버튼이 보여도 비활성 상태면 분석이 실행되지 않음. `visible` 체크는 이를 감지 못함.

### 4. `stats/e2e/selectors.ts`

`runAnalysisBtn`에 `@deprecated` JSDoc 추가 — "Smart Flow에서 직접 참조 금지" 명시.

---

## 리뷰 요청 포인트

### Q1. `nonIdNumericCols` 범위가 적절한가?

현재 `nonIdNumericCols`는 **2순위(legacy fallback)와 3순위(heuristic) 에서만** 사용합니다. **1순위(LLM variableAssignments)**는 `numericCols`를 그대로 사용합니다.

LLM이 `id` 컬럼을 직접 지정하는 경우(할루시네이션)는 기존 `filteredOutVars` 로직이 처리하므로 OK. 하지만 1순위에서도 `nonIdNumericCols`를 써야 하는 케이스가 있는지?

### Q2. `nonIdNumericCols`가 비어있을 때 엣지 케이스

모든 numeric 컬럼이 ID인 경우 → `nonIdNumericCols = []` → `dependentCandidate = undefined`. 이 상태에서 슬롯이 비고 버튼 비활성 → 사용자가 수동으로 변수를 선택해야 함. 이게 올바른 UX인지, 아니면 추가 fallback이 필요한지?

### Q3. `toBeEnabled()` timeout 적절성

```ts
await expect(page.locator(S.variableSelectionNext)).toBeEnabled({ timeout: 15000 })
```

변수 자동할당은 `useEffect`로 비동기 실행됩니다. 15초가 충분한지? 느린 환경에서 `useEffect`가 15초 이상 걸릴 수 있는지?

### Q4. 2순위 fallback에서도 ID 제외가 맞는가?

2순위는 `recommendation.detectedVariables`를 사용하는데, 여기서도 `numericCols[0]` fallback을 `nonIdNumericCols[0]`으로 바꿨습니다. `recommendation`이 있는 경우(AI 추천 직후)에는 LLM이 이미 올바른 변수를 제안했을 것이므로, 이 fallback이 실제로 트리거될 가능성은 낮지만 — 혹시 의도치 않은 사이드이펙트가 있는지?

---

## 테스트 결과

```
변경 전: 25개 중 22 통과 / 3 실패
변경 후: 25개 중 25 통과 (재시도 포함 1개 flaky 제외)
유닛 테스트: 32/32 통과 (variable-detection-service)
```

---

## 관련 파일 (읽기용)

- `stats/lib/services/variable-detection-service.ts` — 수정 본체
- `stats/lib/services/variable-type-detector.ts` — `detectIdColumn()`, `isIdColumnByName()`, `isIdColumnByValue()` 구현
- `stats/components/analysis/variable-selector/UnifiedVariableSelector.tsx` — `buildInitialAssignments()` 함수 (L555~)
- `stats/components/analysis/steps/VariableSelectionStep.tsx` — `initialSelection` 빌드 로직 (L139~)
