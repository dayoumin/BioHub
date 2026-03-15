# UX 단계별 흐름 개선 계획 (v2)

**작성**: 2026-03-14 · **수정**: 2026-03-14 (v1 리뷰 반영 전면 재작성)
**범위**: Smart Flow + Graph Studio 전체 UX
**목표**: 네비게이션 계약 통일 + 변경 시점 기반 무효화 + 기존 브리지 강화

---

## 현재 흐름 진단

### Smart Flow (통계 분석)

```
Hub (채팅) → Step 1 (데이터 업로드) → Step 2 (방법 선택) → Step 3 (변수 선택) → Step 4 (실행→결과)
```

- **Store**: `useAnalysisStore` + `useModeStore` + `useHistoryStore`
- **stepTrack**: `normal` | `quick` | `reanalysis` 3가지 모드
- **네비게이션**: `completedSteps` 배열 기반 — 완료된 단계만 클릭 이동 가능

### Graph Studio (차트)

```
업로드 모드 (6개 썸네일 + 파일 업로드) → 에디터 모드 (3패널 레이아웃)
```

- **Store**: `useGraphStudioStore` (완전 독립)
- **Smart Flow 연결**: `handleOpenInGraphStudio()` 구현 완료 — DataPackage 빌드 + `loadDataPackageWithSpec()` + `/graph-studio` 이동
- **DataPackage 저장**: 세션 메모리 전용 (GraphProject에 DataPackage 미포함)

---

## 문제점 분석

### P1. 네비게이션 계약 불일치 (Store 내부)

**현상**: `canNavigateToStep()`과 `navigateToStep()`의 규칙이 다름.

```typescript
// canNavigateToStep — UI stepper가 사용 (엄격)
canNavigateToStep: (step) =>
  step === currentStep || completedSteps.includes(step)

// navigateToStep — 실제 이동 (느슨)
if (canNavigateToStep(step) || isForwardSkip) { ... }  // 전진은 항상 허용
```

- **결과**: UI stepper는 "이동 불가"로 표시하지만, 코드에서는 이동 가능
- 이전 단계(step < currentStep) 이동도 `completedSteps`에 없으면 stepper 비활성
- `canNavigateToStep()`만 완화하면 `navigateToStep()`의 전진 우회와 규칙 충돌 심화

### P2. 결과 무효화 시점이 없음

**현상**: Step 3에서 변수 수정 후 Step 4로 이동 → 이전 `results`가 남아있어 분석 없이 결과 화면 표시.

**원인**: `goToNextStep()`은 `currentStep`만 변경 ([analysis-store.ts:285-293](stats/lib/stores/analysis-store.ts#L285-L293)). 변수 변경 여부와 관계없이 results를 건드리지 않음.

**주의**: `setVariableMapping()`에서 무조건 results를 지우면 안 됨 — Step 3에서 변수 확정 저장 시에도 호출되므로, 정상 플로우에서 결과가 날아감. "변경 액션"과 "저장 액션"을 구분해야 함.

### P3. 결과 화면 "변수 수정" 경로 — 무효화 미연동

**현상**: `onBackToVariables` 버튼이 이미 존재 ([ResultsActionButtons.tsx:115-123](stats/components/analysis/steps/results/ResultsActionButtons.tsx#L115-L123)).

```typescript
onBackToVariables={() => navigateToStep(3)}  // ResultsActionStep.tsx:1058
```

- 단순 `navigateToStep(3)` — results/assumptionResults 무효화 없음
- 뒤로 가서 변수만 보고 다시 Step 4로 오면 이전 결과 유지 (의도적 가능성)
- 변수를 실제 변경한 후 Step 4로 가면 stale 결과 표시 (버그)

### P4. Quick 모드에서 데이터 확인 건너뜀

**현상**: Hub에서 메서드 선택 → 업로드 → 데이터 프리뷰 없이 Step 3 자동 이동.
([use-data-upload.ts:87-96](stats/hooks/use-data-upload.ts#L87-L96))

**영향**: 사용자가 잘못된 파일을 올렸거나 데이터를 확인하고 싶어도 기회 없음.

### P5. Graph Studio 브리지 — analysisResultId 미설정

**현상**: `handleOpenInGraphStudio()` 완전 구현 + E2E 통과 ([ResultsActionStep.tsx:488-561](stats/components/analysis/steps/ResultsActionStep.tsx#L488-L561)).
그러나 DataPackage 생성 시 `analysisResultId` 필드를 채우지 않음:

```typescript
const pkg: DataPackage = {
  id: pkgId,
  source: 'analysis',
  label: `${results.method} 결과`,
  columns, data,
  analysisContext: toAnalysisContext(results),
  // ❌ analysisResultId 미설정
  createdAt: new Date().toISOString(),
}
```

**영향**: Graph Studio에서 원본 분석 결과를 역참조 불가. 논문 도구 연계, 히스토리 링크 불가.

### P6. Step 2 입력 모드 3개로 산만

**현상**: PurposeInputStep에 AI 채팅 / 브라우즈 / 레거시 가이드 3가지 모드 공존. 인지 부하 높음.

### P7. 공유 데이터 레이어 부재

**현상**: Smart Flow ↔ Graph Studio 독립 Store. 같은 CSV 두 번 업로드 필요.
- Graph Studio의 GraphProject는 DataPackage를 포함하지 않음 (세션 메모리 전용)
- `useDataStore` 도입 시 "프로젝트 복원 → 데이터 참조 유지" 설계 필수

---

## 구현 계획

### Phase U1: 네비게이션 계약 통일 + 변경 시점 기반 무효화 (1-2일)

**목표**: `canNavigateToStep()`과 `navigateToStep()`이 같은 규칙을 따르도록 통일.

| ID | 작업 | 파일 |
|----|------|------|
| U1-1 | 네비게이션 규칙 통일 | `analysis-store.ts` |
| U1-2 | 점프 호출부 정리 (Quick / reanalysis / floating nav) | `use-data-upload.ts`, `AnalysisSteps.tsx`, `use-analysis-handlers.ts` |
| U1-3 | 변경 시점 기반 downstream 무효화 | `analysis-store.ts`, `VariableSelectionStep.tsx` |

**U1-1 구현 상세** — 단일 규칙으로 통일:

```typescript
canNavigateToStep: (step) => {
  const state = get()
  if (step === state.currentStep) return true
  if (step < state.currentStep) return true         // 이전 단계 항상 허용
  if (state.completedSteps.includes(step)) return true // 완료 단계 허용
  return false  // 미완료 전방 단계 불허
}

navigateToStep: (step) => {
  const state = get()
  if (!state.canNavigateToStep(step)) return  // 우회 제거 — 동일 규칙 사용
  state.saveCurrentStepData()
  set({ currentStep: step })
}
```

Quick/reanalysis에서 전진 점프가 필요한 경우는 `navigateToStep()` 호출 전에 중간 단계를 `addCompletedStep()`으로 먼저 마킹하거나, 해당 경로를 명시적 helper로 치환:

```typescript
// use-data-upload.ts — Quick 모드 Step 3 점프
addCompletedStep(1)  // Step 1 완료 처리
addCompletedStep(2)  // Step 2 스킵 완료 처리
navigateToStep(3)    // 이제 canNavigateToStep(3) = true
```

영향 받는 기존 호출부:
- `use-data-upload.ts`의 Quick 업로드 후 `navigateToStep(3)`
- `use-analysis-handlers.ts`의 floating nav Quick next (`handleStep1Next`)
- `AnalysisSteps.tsx`의 reanalysis `navigateToStep(4)`

즉, **store 규칙만 바꾸면 안 되고 호출부를 함께 수정**해야 한다.

**U1-3 구현 상세** — 무효화는 setter가 아닌 "명시적 변경 액션"에서 수행:

`setVariableMapping()`은 현재대로 순수 setter로 유지. 대신 **변수를 실제 수정하는 UI 액션**에서 downstream을 무효화:

```typescript
// 신규 액션: 변수 변경 + downstream 무효화
updateVariableMappingWithInvalidation: (mapping) => set({
  variableMapping: mapping,
  results: null,
  assumptionResults: null,
})
```

사용처:
- Step 3 "확인" 버튼에서 **이전 mapping과 다를 때만** `updateVariableMappingWithInvalidation()` 호출
- Step 3에서 변경 없이 "다음"이면 기존 `setVariableMapping()` 사용 (results 유지)
- 결과 화면 "변수 수정" 버튼에서는 이동만 (`navigateToStep(3)`), 실제 변경 시 무효화

**추가 수정 필요**: Step 3 재진입 시 `initialSelection`이 `detectedVariables`만 기준이라, 결과 화면에서 "변수 수정"을 눌러도 마지막 확정값이 그대로 안 보일 수 있음.

우선순위:
1. `variableMapping`이 있으면 그것을 `initialSelection`의 1순위로 사용
2. 없을 때만 `detectedVariables` fallback

**판별 기준**: 단순 `JSON.stringify`보다 정규화 비교 권장
- 문자열/배열 표현 차이(`"a,b"` vs `["a","b"]`)를 먼저 normalize
- 배열형 필드는 정렬 여부를 정책으로 명시

VariableSelectionStep에서 confirm 시 비교 → 변경 있으면 invalidation 액션, 없으면 순수 setter.

### Phase U2: 기존 액션 재배치 + 일관화 (1-2일)

**목표**: 이미 존재하는 결과 화면 액션들의 무효화 동작을 일관되게 정리.

| ID | 작업 | 파일 |
|----|------|------|
| U2-1 | `onBackToVariables` 경로 — 뒤로 갔다 돌아오는 flow 정리 | `ResultsActionStep.tsx` |
| U2-2 | `onReanalyze` 경로 — results/assumptions 무효화 확인 | `ResultsActionStep.tsx` |
| U2-3 | "방법 변경" 경로 추가 (Step 2 직행 + downstream 무효화) | `ResultsActionStep.tsx`, `ResultsActionButtons.tsx` |
| U2-4 | terminology / 테스트 목 정리 | terminology 사전, `ResultsActionStep` 테스트 |

**U2-1 현황 및 방향**:
- 현재: `onBackToVariables={() => navigateToStep(3)}` — 단순 이동, 무효화 없음
- 의도: "보기만" 하고 돌아올 수도 있으므로 이동 시점에 무효화하면 안 됨
- **유지**: 현재 동작 그대로. Step 3에서 변수를 실제 변경 → confirm 시에만 `updateVariableMappingWithInvalidation()` 호출 (U1-3)

**U2-3 구현**:
- 결과 액션 바에 "방법 변경" 버튼 추가
- 클릭 시: `setResults(null)` → `setAssumptionResults(null)` → `setVariableMapping(null)` → `navigateToStep(2)`
- 방법이 바뀌면 변수/결과 모두 무효 — 명시적 전체 무효화 정당
- 버튼 렌더링은 `ResultsActionButtons.tsx`, 실제 상태 변경 로직은 부모 `ResultsActionStep.tsx`에 둔다
- 번역 키(`changeMethod`)와 테스트 시나리오를 같이 추가한다

### Phase U3: Quick 모드 데이터 확인 (1-2일)

| ID | 작업 | 파일 |
|----|------|------|
| U3-1 | Quick 모드 자동 점프 제거 → 확인 후 진행 | `use-data-upload.ts`, `DataExplorationStep.tsx` |
| U3-2 | QuickAnalysisBanner에 "확인 후 진행" CTA 추가 | `Step1ModeBanners.tsx` |
| U3-3 | Floating Nav Quick 상태 라벨 | `use-analysis-handlers.ts` |

**U3-1 구현**:
- `use-data-upload.ts:87-96`에서 `navigateToStep(3)` 자동 호출 제거
- 대신 `QuickAnalysisBanner`에 "데이터 확인 완료 → 변수 선택" 버튼
- 사용자가 데이터 프리뷰를 확인한 후 명시적으로 진행
- floating nav가 같은 상황에서 별도 우회 CTA가 되지 않도록 Quick 상태 라벨/버튼 정책을 같이 맞춘다

**테스트 범위**: `use-data-upload` + step banner + quick CTA + Step 1 preview 잔류 확인

### Phase U4: Graph Studio 브리지 강화 (1일)

> ~~신규 구현~~ → 기존 브리지 hardening. `handleOpenInGraphStudio()`는 완전 구현 + E2E 통과 상태.

| ID | 작업 | 파일 |
|----|------|------|
| U4-1 | `analysisResultId` 설정 | `ResultsActionStep.tsx` |
| U4-2 | 히스토리 저장된 분석의 ID 연결 | `ResultsActionStep.tsx`, `history-store.ts` |

**U4-1 구현**:
```typescript
const pkg: DataPackage = {
  id: pkgId,
  source: 'analysis',
  label: `${results.method} 결과`,
  columns, data,
  analysisContext: toAnalysisContext(results),
  analysisResultId: currentHistoryId ?? undefined,  // ← 추가
  createdAt: new Date().toISOString(),
}
```

- `currentHistoryId`는 `useHistoryStore`에서 가져옴 (저장된 분석이면 값 존재)
- 아직 저장 전이면 `undefined` (정상 — optional 필드)
- 따라서 이 단계의 목표는 **"저장된 분석에 대한 역참조 경로 확보"**이지, 모든 Graph Studio 진입에서 원본 링크를 보장하는 것은 아님

**U4-2 활용**:
- Graph Studio에서 `analysisResultId`가 있으면 "원본 분석 보기" 링크 가능
- 논문 도구 연계 시 분석 결과 역참조 경로 확보
- 저장 전 분석까지 항상 연결하려면 별도 auto-save 또는 ephemeral result ID 설계가 추가로 필요

### Phase U5: Step 2 단순화 (장기, 별도 계획)

| ID | 작업 | 난이도 |
|----|------|--------|
| U5-1 | 레거시 가이드 모드 사용률 측정 (analytics 추가) | 낮음 |
| U5-2 | 브라우즈 모드를 AI 채팅 내 "직접 선택" 링크로 통합 | 높음 |
| U5-3 | PurposeInputStep 789줄 → 3개 하위 컴포넌트 분리 | 높음 |

### Phase U6: 공유 데이터 레이어 (장기, 아키텍처 변경)

| ID | 작업 | 난이도 | 비고 |
|----|------|--------|------|
| U6-1 | `useDataStore` 신규 생성 (IndexedDB 기반) | 높음 | |
| U6-2 | Smart Flow `uploadedData` → DataStore 참조로 전환 | 높음 | |
| U6-3 | Graph Studio `DataPackage` → DataStore 참조로 전환 | 높음 | GraphProject 복원 시 데이터 참조 유지 설계 필수 |
| U6-4 | "내 데이터" 관리 UI | 높음 | |

**추가 설계 필요**: 현재 Graph Studio의 `GraphProject`는 localStorage에 저장되지만 `DataPackage`는 세션 메모리 전용. `useDataStore` 도입 시:
- 프로젝트 복원 → 데이터가 IndexedDB에 남아있어야 함
- 데이터 만료/정리 정책 필요 (무한 축적 방지)
- Smart Flow sessionStorage ↔ DataStore IndexedDB 동기화

> U6은 사용자 피드백 축적 + 데이터 규모 파악 후 진행.

---

## 우선순위 요약

```
U1 (계약 통일, 1-2일) → U2 (액션 정리, 1-2일) → U3 (Quick 확인, 1-2일) → U4 (브리지, 1일) → U5/U6 (장기)
```

| Phase | 핵심 변경 | 위험 |
|-------|----------|------|
| U1 | navigateToStep 우회 제거 + Quick/reanalysis/floating-nav 호출부 정리 + 변경 시점 무효화 | 중간 — store 규칙 변경이 여러 진입점에 영향 |
| U2 | 기존 버튼 무효화 일관화 + "방법 변경" 추가 | 낮음 — UI + 부모 액션 핸들러 + 번역/테스트 동반 |
| U3 | Quick 자동 점프 → 사용자 확인 | 낮음 — 기존 배너 활용 |
| U4 | `analysisResultId` 추가 + 저장 분석 역참조 경로 확보 | 최소 |
| U5/U6 | 아키텍처 영향 | 높음 |

---

## 테스트 계획

- **U1**: `analysis-store` 단위 테스트 — canNavigateToStep/navigateToStep 규칙 일치, 이전 단계 이동 허용, 전진 점프는 사전 마킹 필요
- **U1**: 호출부 테스트 — Quick 업로드, reanalysis 실행, floating nav Quick next가 새 계약에서도 동작
- **U1**: `updateVariableMappingWithInvalidation` — 변경 시 results/assumptions null, 미변경 시 유지
- **U1**: `VariableSelectionStep` — `variableMapping` 우선 초기값 복원 확인
- **U2**: `ResultsActionStep` — "방법 변경" 버튼 클릭 → downstream 전체 무효화 + Step 2 이동
- **U3**: `use-data-upload` — Quick 모드 자동 이동 제거 확인 + step banner 잔류 + quick CTA + Step 1 preview
- **U4**: `ResultsActionStep` — DataPackage에 `analysisResultId` 포함 확인
- **U4**: 저장 이력 없음 상태에서는 `analysisResultId`가 비어도 정상임을 명시하는 테스트/문서 보강

---

## v1 → v2 변경 사항

| v1 항목 | v2 변경 | 이유 |
|---------|---------|------|
| P5 "Graph Studio 연결 없음" | **삭제** — 이미 구현 완료 | `handleOpenInGraphStudio()` + E2E TC-4B.1.3 통과 |
| U4 "신규 3-5일" | → **브리지 강화 1일** (`analysisResultId` 추가) | 기존 구현 미확인 오류 |
| U1-1 `setVariableMapping에서 results 삭제` | → **변경 시점 기반 무효화** (`updateVariableMappingWithInvalidation`) | 순수 setter에서 무조건 삭제하면 정상 플로우 파괴 |
| U1-2 `canNavigateToStep만 완화` | → **계약 통일** (navigateToStep 우회 제거 + 사전 마킹) | canNavigateToStep만 고치면 계약 불일치 심화 |
| U2-3 "뒤로 가면 completedSteps 삭제" | **삭제** — 조회/변경 미구분 | 단순 back 시 completedSteps 날리면 의도치 않은 상태 손실 |
| P3 "변수 수정 경로 부재" | **수정** — `onBackToVariables` 이미 존재, 무효화 미연동이 문제 | 기존 코드 미확인 오류 |

---

## 관련 문서

- [PLAN-STITCH-UI-REDESIGN.md](PLAN-STITCH-UI-REDESIGN.md) — UI 리디자인 (완료)
- [PLAN-SMARTFLOW-UI-CONSISTENCY.md](PLAN-SMARTFLOW-UI-CONSISTENCY.md) — UI 일관성 (완료)
- [GRAPH_STUDIO_UI_REDESIGN_PLAN.md](graph-studio/GRAPH_STUDIO_UI_REDESIGN_PLAN.md) — Graph Studio UI
- [IDEAS-PAPER-DRAFT-ENHANCEMENTS.md](IDEAS-PAPER-DRAFT-ENHANCEMENTS.md) — 논문 초안 기능
