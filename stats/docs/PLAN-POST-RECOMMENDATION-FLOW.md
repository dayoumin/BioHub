# 추천 후 분석 흐름 개선 계획

> 허브에서 AI 추천 → 분석 완료까지의 단계별 UX 문제 해결

## 배경

허브 대화에서 AI가 분석 방법을 추천하면 두 가지 경로로 분석이 시작된다:

- **경로 A (데이터 없음)**: 카드 클릭 → Step 1(업로드) → Step 3(변수) → Step 4(실행)
- **경로 B (데이터 있음)**: 진단 카드 "분석 시작하기" → Step 3(변수 프리필) → Step 4(실행)

---

## 발견된 문제 — 상태 반영 (2026-04-10)

### F1. Quick 모드 Step 3 — 변수 선택 가이드 부재 [높음] `todo`

**현상**: AI 추천 카드 클릭 → 데이터 업로드 → Step 3 도착하면 슬롯이 프리필되지 않거나 불완전.
어떤 변수를 어디에 넣어야 하는지 안내가 없음.

**원인**: Quick 업로드 경로는 `extractDetectedVariables(methodId, validation, null)`을 항상 호출하므로
`detectedVariables` 객체 자체는 존재함 (null이 아님). 하지만 LLM 추천 없이 heuristic만 돌리므로
필요한 슬롯이 비어있을 수 있음.

**위치**: `use-data-upload.ts:100-106`, `VariableSelectionStep.tsx:146-301`

**올바른 가이드 노출 조건**: `detectedVariables`의 null 여부가 아니라, **필요한 슬롯이 실제로 채워졌는지**로 판단.

```tsx
// VariableSelectionStep.tsx — 가이드 노출 조건
const needsGuide = useMemo(() => {
  if (!selectedMethod) return false
  const slots = getSlotConfig(selectedMethod.id)
  if (!slots) return false
  // 필수 슬롯 중 initialSelection에 값이 없는 것이 있으면 가이드 표시
  return slots.required.some(slot => !initialSelection[slot.key])
}, [selectedMethod, initialSelection])

{needsGuide && <MethodVariableGuide methodId={selectedMethod.id} />}
```

**구현 방향**:
- `slot-configs.ts`의 `getSlotConfig(methodId)`에서 필수 슬롯 정보 추출
- `initialSelection`의 실제 값과 대조
- 비어있는 슬롯이 있으면 메서드별 안내 배너 표시
- 예: "독립표본 t-검정: **비교할 값**(수치형 1개) + **비교 기준**(범주형 1개)을 선택하세요"

**영향 파일**: `VariableSelectionStep.tsx`, 신규 `MethodVariableGuide.tsx` (또는 인라인)

---

### F2. Stepper Step 2 클릭 시 에러 화면 [중간] `todo`

**현상**: Quick/Diagnostic 모드에서 Stepper의 Step 2를 클릭하면 "건너뛰는 단계입니다" 에러 화면.

**이미 구현된 부분**:
- Step 3에 "다른 분석 방법 선택하기" 링크 존재 (`VariableSelectionStep.tsx:463`)
- 메서드 변경 시 `variableMapping`/`detectedVariables` null 처리 (`AnalysisSteps.tsx:140-141`)

**남은 이슈**: Stepper에서 Step 2 클릭 시 에러 대신 확인 후 이동 (또는 비활성 표시)

**위치**: `AnalysisSteps.tsx:242`

**개선 방향**:
- Step 2 클릭 시 "메서드를 변경하시겠습니까?" 확인 → normal 모드 전환 + Step 2 이동
- 또는 Stepper에서 skipped step을 비활성(disabled) 스타일로 표시하여 클릭 자체를 방지

---

### F3. Step 4 분석 실패 시 재시도 [중간] `done`

이미 구현됨. "다시 시도" + "변수 수정" 버튼 존재.

**확인 위치**: `AnalysisExecutionStep.tsx:359-363`

---

### F4. 메서드 변경 후 변수 매핑 초기화 [중간] `done`

이미 구현됨. 메서드 확정 시 `variableMapping = null`, `detectedVariables = null`.

**확인 위치**: `AnalysisSteps.tsx:140-141`, `ResultsActionStep.tsx:548-554`

---

### F5. 데이터 재업로드 시 변수 매핑 검증 [중간] `done`

이미 구현됨. 새 데이터의 컬럼과 기존 매핑을 대조, 불일치 시 `variableMapping = null`.

**확인 위치**: `use-data-upload.ts:62-71`

---

### F6. Step 3 뒤로가기 라벨 [낮음] `todo`

**현상**: Quick/Diagnostic 모드에서 Step 3의 "이전" 버튼이 Step 1로 이동하지만 라벨이 "이전 단계"로 표시됨.

**개선**: 버튼 라벨을 "데이터로 돌아가기"로 변경하여 혼란 방지.

**위치**: `AnalysisSteps.tsx:260-267` 또는 `VariableSelectionStep.tsx`

---

## 남은 작업 요약

| 순서 | 문제 | 상태 | 난이도 |
|------|------|------|--------|
| **1** | F1. Step 3 변수 가이드 (슬롯 기반 조건) | `todo` | 중간 |
| **2** | F2. Stepper Step 2 클릭 UX | `todo` | 낮음 |
| **3** | F6. 뒤로가기 라벨 | `todo` | 낮음 |

## 변경하지 않는 것

| 항목 | 이유 |
|------|------|
| Step 4 자동 실행 (Diagnostic) | 정상 — `useEffect` with `hasValidMapping` |
| `suggestedSettings` 적용 | 정상 — merge 방식 적절 |
| 가정 검정 보존 | 정상 — bridge에서 `setAssumptionResults` |
| 변수 수정 → 결과 무효화 | 정상 — `updateVariableMappingWithInvalidation` |
| "다른 방법 찾아보기" 경로 | 정상 — Step 2 브라우저 접근 |
| 분석 실패 재시도 | 이미 구현 |
| 데이터 재업로드 매핑 검증 | 이미 구현 |
| 메서드 변경 시 매핑 초기화 | 이미 구현 |

## 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|----------|
| Quick 모드 → 업로드 → Step 3 (슬롯 비어있음) | 메서드별 변수 가이드 표시 |
| Quick 모드 → 업로드 → Step 3 (heuristic 프리필 성공) | 가이드 표시 안 됨 |
| Diagnostic 모드 → Step 3 (LLM 프리필) | 가이드 표시 안 됨 |
| Stepper Step 2 클릭 (Quick/Diagnostic) | 확인 팝업 또는 비활성 |
| Quick 모드 Step 3 뒤로가기 | "데이터로 돌아가기" 라벨 |
