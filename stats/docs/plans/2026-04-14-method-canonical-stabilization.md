# Method Canonical Stabilization + Label Disambiguation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (A) `analysis-store`가 `selectedMethod.id`를 항상 canonical로 저장하도록 invariant 확립, (B) `variable-requirements` 설정 라벨이 옵션 라벨과 중복되지 않도록 정리.

**Architecture:**
- (A) `normalizeSelectedMethod`를 공유 헬퍼로 두고, `setSelectedMethod` + history restore patch + persist rehydrate에서 모두 사용한다. `history-store`는 이미 `resolveHistoryMethod()`로 canonical을 반환하지만, transition helper와 sessionStorage hydrate도 동일 계약을 따르도록 방어층을 맞춘다. AES의 로컬 `REDUNDANT_CANONICAL_ALIASES` 코드는 제거. Store 계약이 canonical-only로 전환됨에 따라 legacy alias(`'t-test'`, `'anova'`)를 단언하던 테스트 8건을 canonical ID로 갱신.
- (B) `welch.label`/`equalVar.label`을 결정(decision) 성격으로 바꿔 옵션 variant명과 충돌 해소.

**Tech Stack:** Zustand store, Vitest, TypeScript, React.

**Scope Boundary (본 플랜 밖):**
- Phase 4: `_aliasIndex`에서 `'t-test'/'anova'` 제거 (후속)
- `method-parameters.ts:177` 내 `'등분산 가정'` (다른 code path, 사용 여부 검토 후속)
- `ResultsActionStep` 훅 추출, terminology lint (스코프 외로 결정됨)

**Canonical ID 맵핑 (검증 완료):**
- `'t-test'` → `'two-sample-t'` ([statistical-methods.ts:56-63](../../lib/constants/statistical-methods.ts#L56-L63))
- `'anova'` → `'one-way-anova'` ([statistical-methods.ts:107-115](../../lib/constants/statistical-methods.ts#L107-L115))

---

## Phase B: Label Disambiguation (먼저 — 파급범위 작음)

### Task B1: 테스트 기대값 갱신 (failing)

**Files:**
- Modify: `stats/lib/utils/__tests__/analysis-execution.test.ts:107`

- [ ] **Step 1: 기대 라벨을 새 값으로 변경**

`stats/lib/utils/__tests__/analysis-execution.test.ts` 107번 줄:

변경 전:
```ts
{ key: 'welch', label: 'Welch ANOVA', value: 'Welch ANOVA' },
```

변경 후:
```ts
{ key: 'welch', label: '분산 동질성 처리', value: 'Welch ANOVA' },
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

Run (`stats/` 디렉토리에서):
```bash
pnpm test analysis-execution.test.ts
```
Expected: FAIL — 현재 코드는 `label: 'Welch ANOVA'`를 반환하므로 새 기대값과 불일치.

### Task B2: variable-requirements 라벨 수정

**Files:**
- Modify: `stats/lib/statistics/variable-requirements.ts:632, 1043`

- [ ] **Step 1: `equalVar.label` 변경**

[variable-requirements.ts:631-632](../../lib/statistics/variable-requirements.ts#L631-L632):

변경 전:
```ts
equalVar: {
  label: '등분산 가정',
```

변경 후:
```ts
equalVar: {
  label: '분산 가정 선택',
```

- [ ] **Step 2: `welch.label` 변경**

[variable-requirements.ts:1042-1043](../../lib/statistics/variable-requirements.ts#L1042-L1043):

변경 전:
```ts
welch: {
  label: 'Welch ANOVA',
```

변경 후:
```ts
welch: {
  label: '분산 동질성 처리',
```

- [ ] **Step 3: 테스트 실행해서 통과 확인**

```bash
pnpm test analysis-execution.test.ts
```
Expected: PASS.

- [ ] **Step 4: 관련 UI 테스트 회귀 확인**

```bash
pnpm test AnalysisExecutionStep.test.tsx
```
Expected: PASS (`execution-setting-welch`는 여전히 'Welch ANOVA' 옵션 라벨을 포함하므로 `toHaveTextContent('Welch ANOVA')` 통과).

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/statistics/variable-requirements.ts stats/lib/utils/__tests__/analysis-execution.test.ts
git commit -m "fix(analysis): disambiguate setting labels from option variant names

equalVar.label '등분산 가정' → '분산 가정 선택'
welch.label 'Welch ANOVA' → '분산 동질성 처리'

Prevents rendered duplication like '등분산 가정 등분산 가정 사용' or
'Welch ANOVA Welch ANOVA' in the execution hero card."
```

---

## Phase A: Store Canonical Normalization

### Task A1: Store 정규화 단위 테스트 (failing)

**Files:**
- Create: `stats/__tests__/stores/analysis-store-canonical.test.ts`

- [ ] **Step 1: 신규 테스트 파일 작성**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

describe('analysis-store — canonical method id invariant', () => {
  beforeEach(() => {
    act(() => {
      useAnalysisStore.getState().reset()
    })
  })

  it("setSelectedMethod는 legacy alias 't-test'를 canonical 'two-sample-t'로 정규화한다", () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 't-test',
        name: '독립표본 t-검정',
        description: '두 그룹 평균 비교',
        category: 't-test',
      })
    })

    const stored = useAnalysisStore.getState().selectedMethod
    expect(stored?.id).toBe('two-sample-t')
    expect(stored?.name).toBe('독립표본 t-검정')
    expect(stored?.category).toBe('t-test')
  })

  it("setSelectedMethod는 legacy alias 'anova'를 canonical 'one-way-anova'로 정규화한다", () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'anova',
        name: '일원분산분석',
        description: '3개 이상 그룹 평균 비교',
        category: 'anova',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('one-way-anova')
  })

  it('이미 canonical인 id는 그대로 보존한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'two-sample-t',
        name: '독립표본 t-검정',
        description: '',
        category: 't-test',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('two-sample-t')
  })

  it('unknown id는 변형 없이 그대로 저장한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'unknown-method-xyz',
        name: 'Custom',
        description: '',
        category: 't-test',
      })
    })

    expect(useAnalysisStore.getState().selectedMethod?.id).toBe('unknown-method-xyz')
  })

  it('null은 그대로 null로 저장한다', () => {
    act(() => {
      useAnalysisStore.getState().setSelectedMethod(null)
    })

    expect(useAnalysisStore.getState().selectedMethod).toBeNull()
  })
})
```

- [ ] **Step 2: 테스트 실행해서 실패 확인**

```bash
pnpm test analysis-store-canonical
```
Expected: FAIL — 정규화 로직 없음, 저장된 id가 여전히 `'t-test'`/`'anova'`.

### Task A2: Store에 정규화 로직 추가

**Files:**
- Modify: `stats/lib/stores/analysis-store.ts` (import + `setSelectedMethod` 수정 + persist rehydrate boundary 보강)
- Modify: `stats/lib/stores/analysis-transitions.ts` (shared helper + history restore patch 정규화)

- [ ] **Step 1: import 추가**

[analysis-transitions.ts](../../lib/stores/analysis-transitions.ts) 상단에 추가:

```ts
import { getMethodByAlias } from '@/lib/constants/statistical-methods'
```

- [ ] **Step 2: `normalizeSelectedMethod`를 shared helper로 추가**

[analysis-transitions.ts](../../lib/stores/analysis-transitions.ts) 상단 유틸 영역에 export 추가:

```ts
/**
 * selectedMethod.id invariant: analysis-store에 들어오는 모든 id는 canonical로 정규화한다.
 * legacy alias('t-test', 'anova' 등)는 getMethodByAlias로 canonical entry를 조회해 id/category를
 * 승격하고, 원본 name/description은 호출자 의도를 존중해 보존한다.
 */
export function normalizeSelectedMethod(
  method: StatisticalMethod | null
): StatisticalMethod | null {
  if (!method) return null
  const canonical = getMethodByAlias(method.id)
  if (!canonical || canonical.id === method.id) return method
  return {
    ...method,
    id: canonical.id,
    category: canonical.category,
    description: method.description || canonical.description,
  }
}
```

- [ ] **Step 3: `analysis-store.ts`에서 helper import 후 `setSelectedMethod`에 적용**

[analysis-store.ts:245-254](../../lib/stores/analysis-store.ts#L245-L254):

변경 전:
```ts
setSelectedMethod: (method) => set((state) => ({
  selectedMethod: method,
  assumptionResults: null,
  analysisOptions: {
    ...DEFAULT_ANALYSIS_OPTIONS,
    alpha: state.analysisOptions.alpha,
    showAssumptions: state.analysisOptions.showAssumptions,
    showEffectSize: state.analysisOptions.showEffectSize,
  },
})),
```

변경 후:
```ts
setSelectedMethod: (method) => set((state) => ({
  selectedMethod: normalizeSelectedMethod(method),
  assumptionResults: null,
  analysisOptions: {
    ...DEFAULT_ANALYSIS_OPTIONS,
    alpha: state.analysisOptions.alpha,
    showAssumptions: state.analysisOptions.showAssumptions,
    showEffectSize: state.analysisOptions.showEffectSize,
  },
})),
```

- [ ] **Step 4: history restore patch에도 동일 helper 적용**

[analysis-transitions.ts:82-116](../../lib/stores/analysis-transitions.ts#L82-L116):

변경 전:
```ts
selectedMethod: data.selectedMethod,
```

변경 후:
```ts
selectedMethod: normalizeSelectedMethod(data.selectedMethod),
```

적용 위치:
- `createHistoryRestorePatch()`
- `createHistorySettingsRestorePatch()`

주의: 현재 production의 `history-store`는 이미 `resolveHistoryMethod()`로 canonical `selectedMethod`를 반환한다. 여기 정규화를 추가하는 이유는 direct helper contract를 canonical-only로 맞추고, 테스트가 helper를 legacy payload로 직접 호출하는 경로까지 함께 봉합하기 위해서다.

- [ ] **Step 5: persist rehydrate boundary도 canonical invariant에 포함**

[analysis-store.ts:416-479](../../lib/stores/analysis-store.ts#L416-L479) persist 설정에서 `selectedMethod`가 sessionStorage에서 같은 버전으로 다시 hydrate될 때도 canonical로 보정되도록 처리.

권장 구현:
- `persist` 옵션에 `merge`를 추가해 `persistedState.selectedMethod`를 `normalizeSelectedMethod()`로 감싼 뒤 current state와 병합
- 또는 version bump + `migrate`를 사용하되, **same-version persisted state는 migrate를 거치지 않는다**는 점을 보완할 추가 장치가 있어야 함

핵심 요구사항:
- 기존 세션에 저장된 `selectedMethod.id === 't-test' | 'anova'`도 hydrate 직후 canonical이 되어야 함
- `results` executor transform 등 기존 `onRehydrateStorage` 동작은 유지

- [ ] **Step 6: 정규화 단위 테스트 통과 확인**

```bash
pnpm test analysis-store-canonical
```
Expected: PASS (5개 테스트 모두 통과).

### Task A3: 기존 테스트 단언 갱신

legacy alias 기대값을 canonical로 갱신. 변경사항은 mock 입력이 legacy alias였던 곳의 **결과 단언**만 수정한다. 입력 mock의 `id: 't-test'` / `'anova'`는 그대로 둬도 store/helper가 canonical로 변환해야 한다.

**Files:**
- Modify: `stats/__tests__/stores/analysis-store-hub.test.ts:60, 146`
- Modify: `stats/__tests__/stores/store-orchestration.test.ts:114`
- Modify: `stats/__tests__/components/analysis/ResultsActionStep-reanalyze.test.tsx:400, 519, 537`
- Modify: `stats/__tests__/stores/analysis-transitions.test.ts:62, 83`

- [ ] **Step 1: `analysis-store-hub.test.ts` 수정**

60번 줄: `expect(store.selectedMethod?.id).toBe('t-test')` → `expect(store.selectedMethod?.id).toBe('two-sample-t')`

146번 줄: `expect(state.selectedMethod?.id).toBe('anova')` → `expect(state.selectedMethod?.id).toBe('one-way-anova')`

- [ ] **Step 2: `store-orchestration.test.ts` 수정**

114번 줄: `expect(snapshot.selectedMethod?.id).toBe('t-test')` → `expect(snapshot.selectedMethod?.id).toBe('two-sample-t')`

주의: 이 테스트는 `setSelectedMethod({ id: 't-test', ... })`를 호출한 후 `buildHistorySnapshot()`으로 꺼내므로, store가 normalize한 'two-sample-t'가 snapshot에 실린다.

- [ ] **Step 3: `ResultsActionStep-reanalyze.test.tsx` 수정**

400번 줄: `expect(state.selectedMethod?.id).toBe('t-test')` → `expect(state.selectedMethod?.id).toBe('two-sample-t')`

519번 줄: `expect(stateAfterReanalyze.selectedMethod?.id).toBe('anova')` → `.toBe('one-way-anova')`

537번 줄: `expect(finalState.selectedMethod?.id).toBe('anova')` → `.toBe('one-way-anova')`

- [ ] **Step 4: `analysis-transitions.test.ts` 수정**

62번 줄: `selectedMethod: { id: 't-test', ... }` 결과 단언 → `selectedMethod: { id: 'two-sample-t', ... }`

83번 줄: `selectedMethod: { id: 'anova', ... }` 결과 단언 → `selectedMethod: { id: 'one-way-anova', ... }`

입력 fixture는 legacy alias 그대로 유지해도 된다. `createHistoryRestorePatch()` / `createHistorySettingsRestorePatch()`가 canonical patch를 반환해야 하기 때문이다.

- [ ] **Step 5: 4개 테스트 파일 전체 실행**

```bash
pnpm test analysis-store-hub store-orchestration analysis-transitions ResultsActionStep-reanalyze
```
Expected: 전체 PASS.

### Task A4: AES 로컬 정규화 코드 제거

**Files:**
- Modify: `stats/components/analysis/steps/AnalysisExecutionStep.tsx:41-44, 100-116, 117-137`

- [ ] **Step 1: `REDUNDANT_CANONICAL_ALIASES` 상수 제거**

[AnalysisExecutionStep.tsx:41-44](../../components/analysis/steps/AnalysisExecutionStep.tsx#L41-L44):

제거:
```ts
const REDUNDANT_CANONICAL_ALIASES = new Set([
  't-test',
  'anova',
])
```

- [ ] **Step 2: `effectiveSelectedMethod` useMemo 제거하고 `selectedMethod` 직접 사용**

[AnalysisExecutionStep.tsx:100-137](../../components/analysis/steps/AnalysisExecutionStep.tsx#L100-L137):

변경 전:
```ts
const effectiveSelectedMethod = useMemo(() => {
  if (!selectedMethod) return null

  if (!REDUNDANT_CANONICAL_ALIASES.has(selectedMethod.id)) {
    return selectedMethod
  }

  const canonical = getMethodByIdOrAlias(selectedMethod.id)
  if (!canonical) return selectedMethod

  return {
    ...selectedMethod,
    id: canonical.id,
    category: canonical.category,
    description: selectedMethod.description || canonical.description,
  }
}, [selectedMethod])
const methodRequirements = useMemo(
  () => (effectiveSelectedMethod?.id ? getMethodRequirements(effectiveSelectedMethod.id) : undefined),
  [effectiveSelectedMethod?.id]
)
const {
  effectiveExecutionSettings,
  effectiveExecutionVariables,
  executionSettingEntries,
} = useMemo(() => buildAnalysisExecutionContext({
  analysisOptions,
  methodRequirements,
  selectedMethodId: effectiveSelectedMethod?.id,
  suggestedSettings,
  variableMapping,
}), [
  analysisOptions,
  methodRequirements,
  effectiveSelectedMethod?.id,
  suggestedSettings,
  variableMapping,
])
```

변경 후:
```ts
const methodRequirements = useMemo(
  () => (selectedMethod?.id ? getMethodRequirements(selectedMethod.id) : undefined),
  [selectedMethod?.id]
)
const {
  effectiveExecutionSettings,
  effectiveExecutionVariables,
  executionSettingEntries,
} = useMemo(() => buildAnalysisExecutionContext({
  analysisOptions,
  methodRequirements,
  selectedMethodId: selectedMethod?.id,
  suggestedSettings,
  variableMapping,
}), [
  analysisOptions,
  methodRequirements,
  selectedMethod?.id,
  suggestedSettings,
  variableMapping,
])
```

- [ ] **Step 3: `effectiveSelectedMethod` 참조를 `selectedMethod`로 일괄 치환**

파일 내 나머지 `effectiveSelectedMethod` 사용처를 모두 `selectedMethod`로 치환. 치환 전 검색:

```bash
grep -n 'effectiveSelectedMethod' stats/components/analysis/steps/AnalysisExecutionStep.tsx
```

치환 후 검색 결과가 비어야 함.

- [ ] **Step 4: 사용하지 않게 된 import 제거**

[AnalysisExecutionStep.tsx](../../components/analysis/steps/AnalysisExecutionStep.tsx) 상단 import 중 `getMethodByIdOrAlias`가 더 이상 사용되지 않으면 import 문에서 제거.

확인:
```bash
grep -n 'getMethodByIdOrAlias' stats/components/analysis/steps/AnalysisExecutionStep.tsx
```
결과가 비어야 함 (import 포함).

- [ ] **Step 5: AES 컴포넌트 테스트 실행**

```bash
pnpm test AnalysisExecutionStep.test.tsx
```
Expected: PASS.

주의: AES 테스트는 `selectedMethod={{ id: 't-test', ... }}`를 props로 직접 넣는다. 하지만 `getMethodRequirements()`는 이미 alias fallback을 지원하므로, Task A4에서는 props canonical 치환이 아니라 로컬 중복 정규화 제거만 수행한다.

### Task A5: 전체 테스트 + 타입체크

- [ ] **Step 1: TypeScript 검사**

```bash
cd stats && node node_modules/typescript/bin/tsc --noEmit
```
Expected: 본 변경으로 인한 신규 에러 없음 (기존 에러는 CLAUDE.md에 따라 본 작업과 무관).

- [ ] **Step 2: 전체 테스트 실행**

```bash
cd stats && pnpm test
```
Expected: 본 변경 영향 받는 파일들 모두 PASS. 사전 존재하던 실패는 본 PR과 무관.

- [ ] **Step 3: 커밋**

```bash
git add stats/__tests__/stores/analysis-store-canonical.test.ts \
        stats/lib/stores/analysis-store.ts \
        stats/lib/stores/analysis-transitions.ts \
        stats/components/analysis/steps/AnalysisExecutionStep.tsx \
        stats/__tests__/stores/analysis-store-hub.test.ts \
        stats/__tests__/stores/store-orchestration.test.ts \
        stats/__tests__/stores/analysis-transitions.test.ts \
        stats/__tests__/components/analysis/ResultsActionStep-reanalyze.test.tsx

git commit -m "refactor(analysis-store): normalize selectedMethod.id at store boundaries

Establish invariant: analysis-store.selectedMethod.id is always canonical.
setSelectedMethod(), history restore patches, and persist rehydrate now
funnel selectedMethod through a shared canonical normalization helper to
promote legacy aliases ('t-test' → 'two-sample-t',
'anova' → 'one-way-anova').

Removes AES-local REDUNDANT_CANONICAL_ALIASES workaround and
effectiveSelectedMethod memo. Downstream consumers (VSS, RAS, AES) now
trust store output without per-site normalization.

Test assertions updated at 8 sites where legacy alias was asserted as
the stored id. Adds analysis-store-canonical.test.ts covering the new
invariant."
```

---

## Verification Checklist (모두 완료 시 PR 준비됨)

- [ ] `pnpm test analysis-execution.test.ts` PASS
- [ ] `pnpm test AnalysisExecutionStep.test.tsx` PASS
- [ ] `pnpm test analysis-store-canonical` PASS (신규)
- [ ] `pnpm test analysis-store-hub store-orchestration analysis-transitions ResultsActionStep-reanalyze` PASS
- [ ] `tsc --noEmit` 신규 에러 0건
- [ ] `grep -rn 'REDUNDANT_CANONICAL_ALIASES' stats/` 결과 0건
- [ ] `grep -rn 'effectiveSelectedMethod' stats/` 결과 0건
- [ ] `grep -rn 'getMethodByIdOrAlias' stats/components/analysis/steps/` 결과 0건

## Follow-up (다른 세션)

- `getMethodByIdOrAlias` 나머지 호출처 정리 (@deprecated 제거 준비)
- Phase 4: `_aliasIndex`에서 `'t-test'`, `'anova'` alias 엔트리 제거 검토
