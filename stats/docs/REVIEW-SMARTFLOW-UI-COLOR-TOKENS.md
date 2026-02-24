# Smart Flow UI 색상 토큰 통일 — AI 리뷰 자료

**작성일**: 2026-02-24
**작업 분류**: UI/UX 리팩터링 (기능 변경 없음)
**범위**: 아래 명시된 10개 파일에 한정 (Smart Flow 전체가 아님)

> **주의**: Smart Flow 컴포넌트에는 이 작업에서 다루지 않은 하드코딩 색상이 다수 잔존한다.
> 상세 목록은 [섹션 9](#9-잔존-하드코딩-색상범위-외)를 참고.

---

## 1. 배경 및 목적

Smart Flow 4단계 흐름(DataExploration → PurposeInput → VariableSelection → ResultsAction)에서
동일 변수 역할이 셀렉터마다 다른 하드코딩 Tailwind 색상으로 표시되는 문제와
dark 모드 대비 문제를 해결한다.

**개선 대상**: 변수 역할 배지·카드헤더·선택 상태·완료 Alert 등 상태 표시 요소에 한정.
장식적·브랜딩 색상(AI 에이전트 보라 등)은 대상 아님.

---

## 2. 디자인 시스템 토큰 구조

### 2-A. 토큰 3중 계층 (`globals.css` 기준, light mode)

```
--success:           oklch(0.55 0.08 155)  # 중간 밝기 sage green — 텍스트용
--success-foreground: oklch(0.98 0 0)      # 거의 흰색 — DEFAULT 배경 위 텍스트
--success-bg:        oklch(0.96 0.02 155)  # 매우 연한 배경
--success-border:    oklch(0.85 0.04 155)  # 연한 테두리
```

`error`, `warning`, `info`, `highlight` 모두 동일 구조.

### 2-B. 올바른 조합 규칙

| 사용 목적 | 배경 | 텍스트 | 테두리 |
|----------|------|--------|--------|
| 연한 배지·카드 배경 | `bg-*-bg` | `text-*` | `border-*-border` |
| 진한 버튼·배지 배경 | `bg-*` (DEFAULT) | `text-primary-foreground` (white) | — |

**근거**: [`badge.tsx`](../components/ui/badge.tsx) default variant:
```tsx
"border-transparent bg-primary text-primary-foreground"
```
`bg-success` 등으로 배경을 override해도 `text-primary-foreground`(흰색)가 상속된다.
`text-success-foreground`와 `text-primary-foreground` 모두 `oklch(0.98~1 0 0)` 범위로 육안상 동일하나,
의미론적으로 올바른 표현은 **Badge의 변형 조합 사용 또는 명시적 white 클래스** 부여다.

**금지 조합**: `bg-*-bg` + `text-*-foreground`
- `--warning-foreground: oklch(0.98 0 0)` = 거의 흰색
- `--warning-bg: oklch(0.96 0.02 75)` = 거의 흰색
- 결과: 배경 ≈ 텍스트 → **대비율 ~1:1** → 읽기 불가

**근거 파일**: [`status-badge.tsx`](../components/ui/status-badge.tsx)
```tsx
success: 'bg-success-bg text-success border border-success-border',
```

---

## 3. 변수 역할 색상 스키마

| 변수 역할 | 토큰 | 색조 |
|----------|------|------|
| 종속변수 (Dependent, Y) | `info` | 슬레이트 블루 |
| 집단/그룹 (Group, Factor1) | `success` | sage green |
| 독립변수 / Factor2 / 대응쌍 두번째 | `highlight` | 인디고 |
| 공변량 (Covariate) | `muted` | 회색 |
| 완료 Alert | `success` | sage green |

**설계 이유**:
- `info`와 `highlight` 모두 청자색 계열로 hue 차이 10°(`info`=250, `highlight`=260)임.
  라이트 모드에서는 미묘하게 구분되나, 확실한 분리가 필요하면 `highlight` hue를 280~290으로 이동해야 한다.
- MultipleRegressionSelector에서는 Independent(X)=`success`, Dependent(Y)=`info`를 사용한다.
  단일 셀렉터 내 2색 조합으로 충분히 구분되기 때문이며, 이는 의도된 예외다.
- VariableSelectionStep의 AI 감지 배지에서는 Group과 Independent가 동시에 렌더링될 수 있으므로
  Independent=`highlight`로 분리한다.

---

## 4. Phase별 변경 내역 (Before / After)

### Phase 1 — 가정 배지 [`GuidedQuestions.tsx`](../components/smart-flow/steps/purpose/GuidedQuestions.tsx) L213–215

**문제**: `text-*-foreground` + `bg-*-bg` 대비 0

```tsx
// Before
auto.value === 'yes' && 'border-success-border text-success-foreground bg-success-bg',
auto.value === 'no'  && 'border-error-border text-error-foreground bg-error-bg',

// After
auto.value === 'yes' && 'border-success-border text-success bg-success-bg',
auto.value === 'no'  && 'border-error-border text-error bg-error-bg',
auto.value !== 'yes' && auto.value !== 'no' && 'border-warning-border text-warning bg-warning-bg'
```

---

### Phase 2 — AI 감지 변수 역할 배지 [`VariableSelectionStep.tsx`](../components/smart-flow/steps/VariableSelectionStep.tsx) L352–376

**문제**: `bg-*-bg border-*-border` 있었으나 `text-*` 누락

```tsx
// Before (Dependent)
className="text-[10px] bg-info-bg border-info-border font-medium"

// After
className="text-[10px] bg-info-bg border-info-border text-info font-medium"
```

| 역할 | 결과 |
|------|------|
| Dependent | `bg-info-bg border-info-border text-info` |
| Group | `bg-success-bg border-success-border text-success` |
| Factors | `bg-success-bg border-success-border text-success` |
| Independent | `bg-highlight-bg border-highlight-border text-highlight` |
| Covariate | `bg-muted border-border/50` (변경 없음) |

---

### Phase 3 — 셀렉터 6개 색상 통일

#### 3-1. [`GroupComparisonSelector.tsx`](../components/common/variable-selectors/GroupComparisonSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L182 CardHeader (집단) | `bg-orange-50 dark:bg-orange-950/30` | `bg-success-bg` |
| L212 선택 상태 | `border-orange-500 bg-orange-50` | `border-success-border bg-success-bg` |
| L225 2-groups 배지 | `bg-green-600` + implicit white | `bg-success` + `text-primary-foreground` 상속 |
| L249 CardHeader (종속) | `bg-green-50 dark:bg-green-950/30` | `bg-info-bg` |
| L270 선택 상태 | `border-green-500 bg-green-50` | `border-info-border bg-info-bg` |
| L311 완료 Alert | `bg-green-50 border-green-200` | `bg-success-bg border-success-border` |
| L313 Alert 텍스트 | `text-green-600 / text-green-700 dark:text-green-300` | `text-success` |

> L225 배지: `variant="default"` + `className="bg-success"` — bg-primary가 bg-success로 override되고
> text-primary-foreground(흰색)는 유지된다. 기능상 문제없으나 token 순수성을 위해서는
> `variant="success"` 사용이 더 명확하다 (badge.tsx에 `success` variant 정의됨).

#### 3-2. [`TwoWayAnovaSelector.tsx`](../components/common/variable-selectors/TwoWayAnovaSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L169 Factor1 CardHeader | `bg-blue-50 dark:bg-blue-950/30` | `bg-success-bg` ← Factor1 = success |
| L190 Factor1 선택 | `border-blue-500 bg-blue-50` | `border-success-border bg-success-bg` |
| L210 Factor2 CardHeader | `bg-purple-50 dark:bg-purple-950/30` | `bg-highlight-bg` |
| L231 Factor2 선택 | `border-purple-500 bg-purple-50` | `border-highlight-border bg-highlight-bg` |
| L247 종속 CardHeader | `bg-green-50 dark:bg-green-950/30` | `bg-info-bg` ← 종속 = info |
| L267 종속 선택 | `border-green-500 bg-green-50` | `border-info-border bg-info-bg` |
| L300 완료 Alert | `bg-green-50 border-green-200 / text-green-600~700` | `bg-success-bg border-success-border / text-success` |

> TwoWayANOVA 색상 배치: Factor1=success(초록) / Factor2=highlight(남색) / 종속=info(파랑)

#### 3-3. [`MultipleRegressionSelector.tsx`](../components/common/variable-selectors/MultipleRegressionSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L183 종속(Y) CardHeader | `bg-green-50 dark:bg-green-950/30` | `bg-info-bg` |
| L203 종속 선택 | `border-green-500 bg-green-50` | `border-info-border bg-info-bg` |
| L218 종속 체크마크 | `text-green-600` | `text-info` |
| L228 독립(X) CardHeader | `bg-blue-50 dark:bg-blue-950/30` | `bg-success-bg` ← 독립 = success (예외) |
| L256 독립 선택 | `border-blue-500 bg-blue-50` | `border-success-border bg-success-bg` |
| L272 번호 배지 | `bg-blue-500 text-white` | `bg-success` + `text-primary-foreground` 상속 |
| L316 완료 Alert | `bg-green-50 border-green-200 / text-green-600~700` | `bg-success-bg border-success-border / text-success` |

#### 3-4. [`PairedSelector.tsx`](../components/common/variable-selectors/PairedSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L161 Var1 CardHeader | `bg-blue-50 dark:bg-blue-950/30` | `bg-info-bg` |
| L182 Var1 선택 | `border-blue-500 bg-blue-50` | `border-info-border bg-info-bg` |
| L196 Var1 체크마크 | `text-blue-600` | `text-info` |
| L206 Var2 CardHeader | `bg-orange-50 dark:bg-orange-950/30` | `bg-highlight-bg` |
| L227 Var2 선택 | `border-orange-500 bg-orange-50` | `border-highlight-border bg-highlight-bg` |
| L241 Var2 체크마크 | `text-orange-600` | `text-highlight` |
| L279 완료 Alert | `bg-green-50 border-green-200 / text-green-600~700` | `bg-success-bg border-success-border / text-success` |

#### 3-5. [`OneSampleSelector.tsx`](../components/common/variable-selectors/OneSampleSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L119 아이콘 | `text-blue-500` | `text-info` |
| L136 선택 배지 | `bg-blue-600 hover:bg-blue-700` | `bg-info` + `text-primary-foreground` 상속 |

> L136: `variant="default"` 일 때 `bg-info`로 override. `text-primary-foreground`(흰색) 유지. 기능상 정상.

#### 3-6. [`CorrelationSelector.tsx`](../components/common/variable-selectors/CorrelationSelector.tsx)

| 위치 | Before | After |
|------|--------|-------|
| L278 완료 Alert | `bg-green-50 border-green-200 / text-green-600~700` | `bg-success-bg border-success-border / text-success` |

---

### Phase 4 — 경고·첨도 색상

#### [`RecommendationResult.tsx`](../components/smart-flow/steps/purpose/RecommendationResult.tsx) L201

```tsx
// Before
"... bg-amber-500/10 text-amber-700 ..."
// After
"... bg-warning-bg border border-warning-border text-warning ..."
```

#### [`DataExplorationStep.tsx`](../components/smart-flow/steps/DataExplorationStep.tsx) L921

```tsx
// Before
kurtWarning && "text-amber-600 dark:text-amber-400 font-semibold"
// After
kurtWarning && "text-warning font-semibold"
```

---

## 5. 의도적으로 유지한 사항

| 항목 | 이유 |
|------|------|
| `ResultsActionStep.tsx` 보라색 (`bg-violet-*`, `text-violet-*`) | AI 에이전트 브랜딩 색상. 변수 역할과 무관 |
| `SmartFlowHub.tsx` 아이콘 색상 | 장식적 UI 요소. 이번 범위 외 |
| `MultipleRegressionSelector` 독립=success | 2색(info vs success) 조합으로 단일 셀렉터 내 충분한 구분 |

---

## 6. 범위 외 (의도적 제외)

| 항목 | 이유 |
|------|------|
| `correlationMatrix.color` 필드 | Dead code — 렌더링에 사용 안 됨 |
| `globals.css` 주석 | 개발자 전용 |

---

## 7. 리뷰 체크리스트 (이 10개 파일 한정)

### 정확성 검증
- [ ] `bg-*-bg` + `text-*-foreground` 조합이 남아 있는가? (대비 0 패턴)
- [ ] `dark:` prefix가 붙은 하드코딩 색상 클래스가 남아 있는가?
- [ ] 변수 역할 표시 요소에서 `bg-green-*`, `bg-blue-*`, `bg-orange-*`, `bg-amber-*` 등 원색이 남아 있는가?

### 설계 일관성
- [ ] AI 감지 배지(`VariableSelectionStep`)에서 Group(success)과 Independent(highlight)가 다른 색인가?
- [ ] 종속변수가 `GroupComparisonSelector`, `TwoWayAnovaSelector`, `MultipleRegressionSelector` 모두 `info`인가?
- [ ] TwoWayANOVA에서 Factor1=success, Factor2=highlight, 종속=info 배치가 맞는가?
- [ ] 진한 배지(`bg-*` DEFAULT)에서 텍스트가 흰색으로 보이는가?

### 미결 토큰 일관성 (낮은 우선순위)
- [ ] `GroupComparisonSelector` L225 배지가 `variant="default" bg-success` 대신 `variant="success"`로 전환하는 게 더 명확한가?
- [ ] `info`와 `highlight`의 hue 차이(10°)가 라이트 모드에서 시각적으로 충분히 구분되는가?

---

## 8. 확인된 최종 상태 (10개 파일)

| 파일 | 주요 변경 | 상태 |
|------|----------|------|
| `purpose/GuidedQuestions.tsx` | `-foreground` suffix 제거 | ✅ |
| `VariableSelectionStep.tsx` | `text-*` 클래스 추가 | ✅ |
| `variable-selectors/GroupComparisonSelector.tsx` | orange→success, green→info | ✅ |
| `variable-selectors/TwoWayAnovaSelector.tsx` | blue→success(F1), purple→highlight(F2), green→info | ✅ |
| `variable-selectors/MultipleRegressionSelector.tsx` | green(종속)→info, blue(독립)→success | ✅ |
| `variable-selectors/PairedSelector.tsx` | blue→info, orange→highlight | ✅ |
| `variable-selectors/OneSampleSelector.tsx` | blue-500→info, blue-600→info(DEFAULT) | ✅ |
| `variable-selectors/CorrelationSelector.tsx` | Alert green→success | ✅ |
| `purpose/RecommendationResult.tsx` | amber→warning | ✅ |
| `DataExplorationStep.tsx` | amber→warning | ✅ |

**TypeScript 검사**: 오류 0건 (`pnpm tsc --noEmit`)

---

## 9. 잔존 하드코딩 색상 (범위 외)

이번 작업에서 다루지 않은 파일의 하드코딩 색상. 후속 작업 검토 대상.

| 파일 | 위치 | 내용 |
|------|------|------|
| `NaturalLanguageInput.tsx` | L423 | `bg-amber-50 dark:bg-amber-950/30 border-amber-200` (ambiguity note) |
| `NaturalLanguageInput.tsx` | L453 | `border-blue-300 text-blue-700 dark:…` (dependent 배지) |
| `NaturalLanguageInput.tsx` | L458 | `border-emerald-300 text-emerald-700 dark:…` (independent 배지) |
| `MethodBrowser.tsx` | L387 | `border-amber-300 bg-amber-50/50` (추천 메서드 카드) |
| `MethodBrowser.tsx` | L404 | `bg-amber-500` (추천 배지) |
| `MethodBrowser.tsx` | L410, L549, L626 | `border-amber-300 text-amber-600 bg-amber-50` (경고 배지/패널) |
| `DataValidationStep.tsx` | L386 | `bg-amber-50 dark:bg-amber-950/20 border border-amber-200` (ID 감지 경고) |
| `DataValidationStep.tsx` | L368 | `text-amber-600 border-amber-300 bg-amber-50` (ID 배지) |
| `MethodSelector.tsx` | L263 | `bg-amber-500` (추천 배지) |
| `ConversationalQuestion.tsx` | L86, L95 | `bg-amber-500/10 text-amber-600` (confidence medium) |
| `QuestionCard.tsx` | L43, L123 | `bg-amber-500/10 text-amber-600` (confidence medium) |
| `RecommendedMethods.tsx` | L221, L299 | `bg-amber-50 text-amber-700` (경고/추천 배지) |
| `ResultsActionStep.tsx` | L1095 | `bg-emerald-50 dark:bg-emerald-950/30` (저장 완료 알림) |
| `ResultsVisualization.tsx` | L429, L475, L560 | `bg-teal-100`, `bg-indigo-100`, `bg-amber-100` (결과 인사이트) |
