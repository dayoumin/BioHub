# Step 2 단순화 계획

> AI 추천은 허브 채팅이 담당. Step 2는 수동 메서드 선택 전용으로 단순화.

## 배경

### 세 가지 분석 진입 경로

| 경로 | 진입점 | Step 2 역할 |
|------|--------|-------------|
| AI 추천 | 허브 채팅 프롬프트 | 스킵 (AI가 메서드 확정) |
| 수동 (메서드 아는 경우) | 빠른 분석 pill | 스킵 (사용자가 메서드 확정) |
| 수동 (메서드 모르는 경우) | 데이터 업로드 카드 | **메서드 브라우저** |

### 현재 계약 상 남아 있는 의존성

- 홈 허브의 일부 진입 경로는 아직 `userQuery`를 Step flow로 넘긴다.
- 즉, **허브에서 메서드를 확정하지 못한 자연어 질의**는 현재 Step 2가 해석한다.
- 따라서 Step 2를 브라우저 전용으로 바꾸려면, 먼저 허브/페이지 진입 계약을 정리하거나 `userQuery`를 임시 유지해야 한다.

### 현재 Step 2 문제

PurposeInputStep.tsx (887줄) 안에 **13개 UI 상태**가 혼재:

```
Step 2 (현재)
  ├─ 목적 카드 4개 (CategorySelector)
  │    └─ 하위 카테고리 (SubcategorySelector)
  │         └─ 가이드 질문 (GuidedQuestions: 대화형/일반형)
  │              └─ 추천 결과 (RecommendationResult)
  ├─ AI 자연어 입력 (NaturalLanguageInput) ← 허브 채팅과 중복
  │    └─ 채팅 스레드 + 추천 카드
  ├─ 전체 메서드 브라우저 (MethodBrowser)
  └─ 자동 추천 확인 (AutoRecommendationConfirm)
```

**핵심 중복**: NaturalLanguageInput이 허브 채팅과 거의 동일한 기능.

### 현재 코드 규모

| 파일 | 줄 수 | Step 2 전용 |
|------|-------|:-----------:|
| PurposeInputStep.tsx | 887 | O |
| FlowStateMachine.ts | 553 | O |
| NaturalLanguageInput.tsx | 573 | O |
| MethodBrowser.tsx | 661 | O |
| GuidedQuestions.tsx | 492 | O |
| 기타 (8개 컴포넌트 + 4개 유틸) | ~2,800 | O |
| **합계** | **~6,000+** | |

---

## 목표 (TO-BE)

```
Step 2 (단순화):
  ┌──────────────────────────────────────────────┐
  │ 분석 방법 선택                    [🔍 검색...]│
  │                                              │
  │ ▸ 그룹 비교 (16개)                            │
  │   ☆ 독립표본 t-검정 — 추천 (AI 제안 있을 때)  │
  │     Welch t-검정                              │
  │     대응표본 t-검정                            │
  │     일원분산분석                               │
  │     ...                                      │
  │ ▸ 관계/연관성 (5개)                            │
  │ ▸ 예측 모델링 (7개)                            │
  │ ▸ 분포/기술통계 (9개)                          │
  │ ▸ 시계열 (4개)                                │
  │ ▸ 생존 분석 (3개)                              │
  │ ▸ 다변량 (4개)                                │
  │ ▸ 측정/설계 (2개)                              │
  │                                              │
  │ ─────────────────────────────────             │
  │ 선택됨: 독립표본 t-검정    [이 방법으로 진행 →] │
  └──────────────────────────────────────────────┘
```

**원칙**:
1. **MethodBrowser가 Step 2의 전부** — 검색 + 카테고리 + 상세 패널 + 호환성 표시
2. **AI 추천 흔적 유지** — 허브에서 AI 추천 후 "다른 방법 찾아보기"로 왔다면, 추천 메서드 하이라이트
3. **가이드 질문, AI 입력, 목적 카드 제거** — 허브 채팅이 담당
4. **모든 경로에서 수동 조정 가능** — AI 추천 후에도 Step 2로 돌아와 변경 가능
5. **미확정 자연어 질의는 Step 2로 넘기지 않음** — 허브가 추천/질문 보완을 끝낸 뒤에만 Step flow 진입

---

## 구현 계획

### Phase 0: 진입 계약 정리

- `app/page.tsx`의 `setUserQuery()` / `setPurposeInputMode()` 기반 브리지를 제거 또는 축소
- 허브에서 Step flow로 넘어오는 경우를 두 가지로 제한:
  - 메서드가 이미 확정된 경우
  - 단순 업로드/탐색만 시작하는 경우
- 이 단계가 끝나기 전까지는 `mode-store.userQuery`를 제거하지 않음

### Phase 1: 추천 컨텍스트를 분리 저장

Step 2는 브라우저 전용이지만, 다음 정보는 계속 필요:

- `recommendedMethodId` — 브라우저 하이라이트용
- `recommendationContext` — `extractDetectedVariables()`와 `suggestedSettings` 전달용

권장 구현:

- `analysis-store` 또는 별도 UI store에 `methodSelectionContext` 추가
- 최소 필드:
  - `recommendedMethodId: string | null`
  - `recommendationContext: AIRecommendation | null`
- 입력 지점:
  - 허브의 `bridgeDiagnosticToSmartFlow()`
  - 기존 Step 2 AI 추천 경로를 대체하는 새 브리지
- 초기화 시점:
  - 새 분석 세션 시작
  - 데이터 교체
  - 사용자가 완전히 수동 분석으로 전환한다고 명시한 경우

### Phase 2: MethodBrowserStep 컴포넌트 신규 작성

**기존 MethodBrowser 재활용**: `purpose/MethodBrowser.tsx` (661줄)는 이미 필요한 기능 대부분 포함:
- 카테고리별 접기/펼치기
- 검색 (한글 + 영문 + 동의어)
- 데이터 호환성 표시
- AI 추천 하이라이트
- 상세 패널 (요구사항, 가정, 사용례)

단, 그대로 쓰면 끝나지 않는다:

- 현재 `MethodBrowser`는 `incompatible` 메서드를 목록에서 숨긴다.
- 목표 UX가 "전체 브라우징 + 호환성 표시"라면 wrapper 또는 `MethodBrowser` 자체 수정이 필요하다.
- 최소한 아래 둘 중 하나는 선택:
  - 비호환 메서드도 목록에 보여주되 disable + 이유 표시
  - 숨김 정책을 유지하되 "숨겨진 메서드가 있다"는 안내와 필터 기준을 노출

**신규 파일**: `stats/components/analysis/steps/MethodBrowserStep.tsx`

```typescript
interface MethodBrowserStepProps {
  onMethodConfirm: (method: StatisticalMethod) => void
  onBack: () => void
}
```

내부 구조:
1. StepHeader ("분석 방법 선택")
2. MethodBrowser (기존 컴포넌트 그대로 사용)
3. 하단: "선택됨: {메서드명}" + "이 방법으로 진행" 버튼

**MethodBrowser에 필요한 props**:
- `methodGroups` — `getAllMethodsGrouped()` 또는 목적 기반 그룹 병합 로직에서 빌드
- `selectedMethod` — 현재 선택된 메서드
- `recommendedMethodId` — 별도 저장된 추천 메서드 ID
- `onMethodSelect` — 메서드 클릭 콜백
- `dataProfile` — 업로드된 데이터 요약 (행 수, 변수 타입 수)

필수 동작:

- Step 내부 선택 상태는 `selectedMethod`와 분리해서 가질 수 있어야 한다.
- 그래야 사용자가 다른 메서드를 클릭해도 "원래 추천 메서드" 하이라이트가 유지된다.

### Phase 3: AnalysisSteps에서 Step 2 교체

```tsx
// Before
{currentStep === 2 && (
  <PurposeInputStep
    onPurposeSubmit={handlePurposeSubmit}
    validationResults={validationResults}
    data={uploadedData}
  />
)}

// After
{currentStep === 2 && (
  <MethodBrowserStep
    onMethodConfirm={handleMethodConfirm}
    onBack={() => navigateToStep(1)}
  />
)}
```

`handleMethodConfirm` 로직:
1. `setSelectedMethod(method)`
2. `setVariableMapping(null)` — 이전 변수 매핑 초기화
3. `extractDetectedVariables(method.id, validationResults, recommendationContext)` → `setDetectedVariables`
4. `setSuggestedSettings(recommendationContext?.suggestedSettings ?? null)`
5. 필요 시 `prefetchWorkerForMethod(method)`
6. `goToNextStep()` → Step 3

주의:

- `recommendationContext`에 AI의 `variableAssignments`가 있으면 그대로 전달해야 한다.
- 문맥 없이 `extractDetectedVariables(..., null)`만 호출하면 AI 추천 경로의 Step 3 프리필 품질이 떨어진다.
- 수동으로 완전히 다른 메서드를 선택했더라도, 추천 컨텍스트는 "하이라이트/초기 추론 보조"로는 남겨둘 수 있다.

### Phase 4: PurposeInputStep 및 관련 파일 정리

**제거 대상** (Step 2 전용, 다른 곳에서 사용 안 함):

| 파일 | 줄 수 | 상태 |
|------|-------|------|
| `PurposeInputStep.tsx` | 887 | 제거 |
| `FlowStateMachine.ts` | 553 | 제거 |
| `NaturalLanguageInput.tsx` | 573 | 제거 |
| `CategorySelector.tsx` | 220 | 제거 |
| `SubcategorySelector.tsx` | 196 | 제거 |
| `GuidedQuestions.tsx` | 492 | 제거 |
| `QuestionCard.tsx` | 139 | 제거 |
| `QuestionFlow.tsx` | 260 | 제거 |
| `ConversationalQuestion.tsx` | 205 | 제거 |
| `ProgressIndicator.tsx` | 39 | 제거 |
| `AutoRecommendationConfirm.tsx` | 257 | 제거 |
| `RecommendationResult.tsx` | 333 | 제거 |
| `PurposeBrowseSection.tsx` | 65 | 제거 |
| `PurposeLegacySection.tsx` | 108 | 제거 |
| `guided-flow-questions.ts` | 335 | 제거 |
| `auto-answer.ts` | 562 | 제거 |
| `progressive-questions.ts` | 238 | 제거 |
| `DecisionTree.ts` | 804 | 제거 |
| `motion-variants.ts` | 270 | 제거 |

**유지 대상**:

| 파일 | 이유 |
|------|------|
| `MethodBrowser.tsx` (661줄) | Step 2 핵심 — 그대로 사용 |
| `method-catalog.ts` | 브라우저 그룹 데이터 생성 |

**별도 검토 대상**:

| 파일 | 메모 |
|------|------|
| `MethodSelector.tsx` | 현재 `MethodBrowser`의 직접 의존은 아님 — 다른 사용처 확인 후 제거 가능 |
| `VariableMappingDisplay.tsx` | 새 Step 2에서 쓰지 않으면 제거 가능 |

**삭제 코드량**: ~5,300줄 제거, ~1,300줄 유지

### Phase 5: 연결부 정리

1. **handlePurposeSubmit** (AnalysisSteps.tsx) → `handleMethodConfirm`으로 교체
2. **app/page.tsx**: unresolved query를 Step flow로 넘기지 않도록 정리
3. **mode-store**:
   - `purposeInputMode`는 호출부 제거 후 삭제 가능
   - `userQuery`는 허브 계약 정리 전까지 유지
   - `lastAiRecommendation`은 히스토리 저장용이므로 유지
4. **use-analysis-handlers**: 기존 Step 2 auto-trigger 전제 제거 여부 확인
5. **DecisionTreeRecommender**: Step 2 전용이 아니라 테스트/서비스 참조가 있으므로 즉시 제거 전 사용처 재검토

---

## 영향 범위

### 변경 파일

| 파일 | 변경 |
|------|------|
| `app/page.tsx` | 허브 → Step flow 진입 계약 정리 |
| `analysis-store.ts` | 추천 컨텍스트 저장 필드 추가 |
| `store-orchestration.ts` | 허브 진단 추천 → Step 2 컨텍스트 브리지 |
| `MethodBrowserStep.tsx` | **신규** — MethodBrowser 래퍼 |
| `AnalysisSteps.tsx` | Step 2 렌더링 교체 |
| `use-analysis-handlers.ts` | Step 2 설명/스킵 로직 재점검 |
| `mode-store.ts` | `purposeInputMode` 삭제 검토, `userQuery`는 조건부 유지 |

### 변경하지 않는 것

| 파일 | 이유 |
|------|------|
| `ChatCentricHub.tsx` | 1차에서는 액션 계약 유지 가능 — 브리지 레이어만 조정 |
| `VariableSelectionStep.tsx` | 이미 완료 — 수동 조정 가능 |
| `AnalysisExecutionStep.tsx` | 변경 불필요 |
| `ResultsActionStep.tsx` | 변경 불필요 |

---

## 사용자 흐름 (완성 후)

### AI 추천 경로
```
허브 채팅: "사료에 따른 성장 비교하고 싶어"
  → AI: "이원분산분석 추천" + [분석하기] 카드
  → 카드 클릭 → Step 1 (데이터 업로드)
  → Step 3 (변수 선택 — 수동 조정 가능)
  → Step 4 (실행 + 결과)
```

### 수동 (메서드 아는 경우)
```
빠른 분석 pill: [독립표본 t-검정] 클릭
  → Step 1 (데이터 업로드)
  → Step 3 (변수 선택)
  → Step 4 (실행 + 결과)
```

### 수동 (메서드 모르는 경우)
```
[데이터 업로드] 카드 클릭
  → Step 1 (데이터 업로드 + 탐색)
  → [다음] → Step 2 (메서드 브라우저)
     검색, 카테고리 탐색, 호환성 확인
     메서드 선택 → [이 방법으로 진행]
  → Step 3 (변수 선택)
  → Step 4 (실행 + 결과)
```

### 언제든 메서드 변경
```
어느 단계에서든 → Step 2 (메서드 브라우저)
  → 새 메서드 선택 → 변수/결과 무효화 → Step 3
```

---

## 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| 목적 카드(CategorySelector)가 초보자에게 도움이었을 수 있음 | MethodBrowser의 카테고리 접기/펼치기가 같은 역할 수행 |
| 가이드 질문이 비모수 vs 모수 판단에 도움 | 허브 채팅에서 AI가 가정검정 기반으로 판단 (이미 구현) |
| Step 2 AI 입력의 가정검정 연동 | 허브 진단 파이프라인이 동일 기능 수행. 단, Step 2에서 raw query 해석 제거 전 허브 계약 먼저 정리 |
| AI 추천 메서드 하이라이트가 수동 선택 후 사라질 수 있음 | `selectedMethod`와 별도 `recommendedMethodId` 저장 |
| AI 추천 기반 변수 프리필/설정 제안이 약해질 수 있음 | `recommendationContext`를 유지하고 `extractDetectedVariables(..., recommendationContext)` 사용 |
| MethodBrowser가 비호환 메서드를 숨겨 전체 탐색성이 떨어질 수 있음 | disable + 이유 표시 또는 숨김 기준 안내 추가 |
| 기존 테스트 파일에 PurposeInputStep 참조 | 테스트도 함께 정리 |

## 구현 순서

| 단계 | 내용 | 난이도 |
|------|------|--------|
| 0 | 허브/페이지 진입 계약 정리 | 중간 |
| 1 | 추천 컨텍스트 저장 필드 추가 | 낮음 |
| 2 | MethodBrowserStep 신규 작성 + AnalysisSteps 교체 | 중간 |
| 3 | handleMethodConfirm 로직 (추천 컨텍스트 전달 포함) | 중간 |
| 4 | purpose/ 폴더 제거 (19개 파일, ~5,300줄) | 낮음 (삭제) |
| 5 | mode-store, use-analysis-handlers, 브리지 정리 | 중간 |
| 6 | 테스트 정리 + 타입 체크 | 중간 |

## 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|----------|
| 데이터 업로드 → Step 2 진입 | 메서드 브라우저 표시 (카테고리 + 검색) |
| 메서드 검색 "t-test" | 관련 메서드 필터링 |
| 메서드 클릭 → 상세 패널 | 요구사항, 가정, 호환성 표시 |
| 비호환 메서드 | 숨기지 않는 정책이면 disable + 이유 표시 / 숨김 정책이면 숨김 안내 표시 |
| "이 방법으로 진행" 클릭 | Step 3 이동, 변수 탐지 실행, AI 추천 컨텍스트가 있으면 프리필 유지 |
| AI 추천 후 "다른 방법 찾아보기" → Step 2 | 추천 메서드 하이라이트 + 브라우저 |
| Step 2에서 다른 메서드 클릭 후에도 | 원래 추천 메서드 하이라이트 유지 |
| Step 3에서 "다른 분석 방법" → Step 2 | 브라우저 표시, 이전 선택 유지 |
| Quick pill → Step 1 → 배너 "다른 방법" → Step 2 | 브라우저 표시, normal 모드 전환 |
| 허브에서 메서드 미확정 자연어 질의 | Step 2로 raw query를 넘기지 않고 허브에서 추가 유도 또는 추천 완료 후 진입 |
