# Smart Flow 4단계 UI/UX 일관성 개선 계획

**작성일**: 2026-02-24
**최종 검토**: 2026-02-24 (토큰 대비 검증 완료)
**완료**: 2026-02-24 — Phase 1~4 전부 적용, TypeScript 0 errors
**목적**: 처음부터 끝까지 이어지는 단일 디자인 언어
**범위**: 10개 파일 (변수 역할 배지·카드헤더·선택 상태·완료 Alert)

---

## 토큰 사용 규칙 (globals.css + status-badge.tsx 기준)

```
bg-{token}-bg + text-{token} + border-{token}-border
```

| 올바른 조합 | 잘못된 조합 | 이유 |
|------------|-----------|------|
| `bg-success-bg text-success` | `bg-success-bg text-success-foreground` | `*-foreground`는 흰색 — 연한 bg 위에 대비 0 |
| `bg-warning-bg text-warning` | `bg-warning-bg text-warning-foreground` | 동일 |
| `bg-error-bg text-error` | `bg-error-bg text-error-foreground` | 동일 |

> `text-*-foreground`는 `bg-{token}` DEFAULT(진한 배경) 위에서만 사용. 예: 버튼 텍스트

---

## 변수 역할 색상 스키마

| 역할 | 토큰 | 이유 |
|------|------|------|
| 종속변수 (Dependent / 결과변수) | `info` | 파랑 — "측정값" |
| 집단 / 그룹 / Factor 1 | `success` | 초록 — "입력 요인" |
| 독립변수 / Factor 2 / 대응쌍 두번째 | `highlight` | 보라 — "추가 예측변수/요인" |
| 공변량 (Covariate) | `muted` | 회색 — "보조 변수" |
| 선택 완료 메시지 | `success` | 전체 컴포넌트 이미 일관 |

> Group ≠ Independent: 같은 green으로 통일하면 인지 구분 약화. highlight(보라)로 분리.

---

## 우선순위 개요

| Phase | 항목 | 사용자 노출 | 파일 수 |
|-------|------|-----------|--------|
| **1** | 가정 배지 dark 모드 | ✅ 항상 | 1 |
| **2** | AI 감지 변수 역할 배지 | ✅ 조건부 | 1 |
| **3** | 셀렉터 6개 색상 통일 | ✅ 항상 | 6 |
| **4** | 경고/첨도 색상 | ✅ 조건부 | 2 |

---

## Phase 1: 가정 배지 dark 모드 — 🔴 High

**파일**: `stats/components/smart-flow/steps/purpose/GuidedQuestions.tsx`
**위치**: L213–215

사용자가 보는 것: 가이드 질문 화면 "정규성: 충족", "등분산: 위반" 배지.
dark 모드에서 세 상태가 시각적으로 구분 불가 → 통계 가정 오독 위험.

**현재:**
```tsx
auto.value === 'yes' && 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10',
auto.value === 'no'  && 'border-rose-500/30 text-rose-700 bg-rose-500/10',
// else              → 'border-amber-500/30 text-amber-700 bg-amber-500/10'
```

**변경:**
```tsx
auto.value === 'yes' && 'border-success-border text-success bg-success-bg',
auto.value === 'no'  && 'border-error-border text-error bg-error-bg',
// else              → 'border-warning-border text-warning bg-warning-bg'
```

---

## Phase 2: AI 감지 변수 역할 배지 — 🟡 Medium

**파일**: `stats/components/smart-flow/steps/VariableSelectionStep.tsx`
**위치**: L352–376

**현재:**
```tsx
Dependent   → "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
Group       → "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800"
Factors     → (동일)
Independent → "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800"
```

**변경 (스키마 적용, dark: 수동 지정 제거):**
```tsx
Dependent    → "bg-info-bg border-info-border text-info"
Group/Factors → "bg-success-bg border-success-border text-success"
Independent  → "bg-highlight-bg border-highlight-border text-highlight"
Covariate    → "bg-muted border-border/50"  (변경 없음)
```

---

## Phase 3: 셀렉터 6개 색상 통일 — 🔴 High

> 메서드를 바꿀 때 같은 역할이 다른 색으로 표시되는 것이 가장 큰 사용자 혼란.

### 현재 불일치 현황
| 역할 | GroupComparison | TwoWayANOVA | MultipleRegression | Paired |
|------|----------------|-------------|-------------------|--------|
| 종속 | green ❌ | green ❌ | blue ✓ | blue ✓ |
| 집단/Factor1 | orange ❌ | blue ✓ | — | blue ✓ |
| Factor2 | — | purple (→ highlight ✓) | — | orange ❌ |
| 독립 | — | — | green (→ success ✓) | — |

### 3-1. `GroupComparisonSelector.tsx`
```
L182: bg-orange-50 dark:bg-orange-950/30  (집단 CardHeader)
      → bg-success-bg

L212-213: border-orange-500 bg-orange-50 / border-border hover:border-orange-300  (선택 상태)
          → border-success-border bg-success-bg / border-border hover:border-success-border

L249: bg-green-50 dark:bg-green-950/30  (종속 CardHeader)
      → bg-info-bg

L270-271: border-green-500 bg-green-50 / border-border hover:border-green-300  (종속 선택 상태)
          → border-info-border bg-info-bg / border-border hover:border-info-border

L225: bg-green-600  (배지 — index)
      → bg-success

L311-313: bg-green-50 border-green-200 / text-green-600 / text-green-700 dark:text-green-300  (완료 Alert)
          → bg-success-bg border-success-border / text-success / text-success
```

### 3-2. `TwoWayAnovaSelector.tsx`
```
L169: bg-blue-50 dark:bg-blue-950/30  (Factor1 CardHeader)
      → bg-success-bg  ← Factor1 = success(초록)

L190-191: border-blue-500 bg-blue-50 / border-border hover:border-blue-300  (Factor1 선택)
          → border-success-border bg-success-bg / border-border hover:border-success-border

L210: bg-purple-50 dark:bg-purple-950/30  (Factor2 CardHeader)
      → bg-highlight-bg

L231-232: border-purple-500 bg-purple-50 / border-border hover:border-purple-300  (Factor2 선택)
          → border-highlight-border bg-highlight-bg / border-border hover:border-highlight-border

L247: bg-green-50 dark:bg-green-950/30  (종속 CardHeader)
      → bg-info-bg  ← ANOVA 종속도 info(파랑)

L267-268: border-green-500 bg-green-50 / border-border hover:border-green-300  (종속 선택)
          → border-info-border bg-info-bg / border-border hover:border-info-border

L300-302: bg-green-50 border-green-200 / text-green-600 / text-green-700 dark:text-green-300  (완료 Alert)
          → bg-success-bg border-success-border / text-success / text-success
```

### 3-3. `MultipleRegressionSelector.tsx`
```
L183: bg-green-50 dark:bg-green-950/30  (독립변수 CardHeader)
      → bg-success-bg  ← 독립은 success(초록), highlight 아님

L203-204: border-green-500 bg-green-50 / border-border hover:border-green-300
          → border-success-border bg-success-bg / border-border hover:border-success-border

L218: text-green-600  (체크마크)
      → text-success

L228: bg-blue-50 dark:bg-blue-950/30  (종속 CardHeader)
      → bg-info-bg

L256-257: border-blue-500 bg-blue-50 / border-border hover:border-blue-300
          → border-info-border bg-info-bg / border-border hover:border-info-border

L316-318: bg-green-50 border-green-200 / text-green-600 / text-green-700 dark:text-green-300
          → bg-success-bg border-success-border / text-success / text-success
```

> MultipleRegression: 독립=success(초록) vs 종속=info(파랑) — 명확히 구분됨 ✓

### 3-4. `PairedSelector.tsx`
```
L161: bg-blue-50 dark:bg-blue-950/30  (첫 번째 변수 CardHeader)
      → bg-info-bg

L182-183: border-blue-500 bg-blue-50 / border-border hover:border-blue-300
          → border-info-border bg-info-bg / border-border hover:border-info-border

L196: text-blue-600  (체크마크)
      → text-info

L206: bg-orange-50 dark:bg-orange-950/30  (두 번째 변수 CardHeader)
      → bg-highlight-bg

L227-228: border-orange-500 bg-orange-50 / border-border hover:border-orange-300
          → border-highlight-border bg-highlight-bg / border-border hover:border-highlight-border

L241: text-orange-600  (체크마크)
      → text-highlight

L279-281: bg-green-50 border-green-200 / text-green-600 / text-green-700 dark:text-green-300
          → bg-success-bg border-success-border / text-success / text-success
```

### 3-5. `OneSampleSelector.tsx`
```
L119: text-blue-500  (아이콘)
      → text-info

L136: bg-blue-600 hover:bg-blue-700  (선택된 배지 — DEFAULT 배경, text는 white 유지)
      → bg-info hover:opacity-90
```

### 3-6. `CorrelationSelector.tsx`
```
L278-280: bg-green-50 border-green-200 / text-green-600 / text-green-700 dark:text-green-300
          → bg-success-bg border-success-border / text-success / text-success
```

---

## Phase 4: 경고/첨도 색상 — 🟢 Low

### 4-A. RecommendationResult 경고 배경
**파일**: `stats/components/smart-flow/steps/purpose/RecommendationResult.tsx` L201
```tsx
// 현재
"flex items-start gap-2 p-2.5 rounded-md bg-amber-500/10 text-amber-700 text-sm"
// 변경
"flex items-start gap-2 p-2.5 rounded-md bg-warning-bg border border-warning-border text-warning text-sm"
```

### 4-B. DataExplorationStep 첨도 경고 텍스트
**파일**: `stats/components/smart-flow/steps/DataExplorationStep.tsx` L921
```tsx
// 현재
"text-amber-600 dark:text-amber-400 font-semibold"
// 변경
"text-warning font-semibold"
```

---

## 범위 외

| 항목 | 이유 |
|------|------|
| `correlationMatrix.color` | `.color` 필드가 렌더링에 전혀 사용 안 됨 — 기술 부채 별도 |
| `globals.css` 주석 | 사용자 미노출 |
| PurposeInputStep 서브 헤더 | 사용자 인지 불가 수준 |

---

## 완료 내역 (Step 4 — 2026-02-24)

| 항목 | 이전 | 이후 |
|------|------|------|
| 카드 구조 | 단일 거대 Card | 6개 독립 Card |
| `statisticalResult.interpretation` | 파란 Lightbulb 박스 (AI와 중복) | 제거 |
| 시각화 위치 | AI 해석 뒤 | AI 해석 앞 |
| AI 해석 카드 | 거대 카드 내 섹션 | 독립 highlight 테마 Card |
| L2/L3 콜랩서블 | 기본값 열림 | 독립 Card 래핑 + 기본값 닫힘 |
| 액션 바 | 2행 | 1행 |
| 완료 단계 텍스트 | `line-through` | `text-muted-foreground/60` |

---

## 완료 현황

| Phase | 파일 | 커밋 | 상태 |
|-------|------|------|------|
| 1 | `purpose/GuidedQuestions.tsx` | `602a77ec` | ✅ |
| 2 | `VariableSelectionStep.tsx` | `fba91994` | ✅ |
| 3-1 | `GroupComparisonSelector.tsx` | `602a77ec` | ✅ |
| 3-2 | `TwoWayAnovaSelector.tsx` | `8281757d` | ✅ |
| 3-3 | `MultipleRegressionSelector.tsx` | `602a77ec` | ✅ |
| 3-4 | `PairedSelector.tsx` | `602a77ec` | ✅ |
| 3-5 | `OneSampleSelector.tsx` | `602a77ec` | ✅ |
| 3-6 | `CorrelationSelector.tsx` | `602a77ec` | ✅ |
| 4-A | `purpose/RecommendationResult.tsx` | `602a77ec` | ✅ |
| 4-B | `DataExplorationStep.tsx` | `602a77ec` | ✅ |

> 리뷰 자료: [REVIEW-SMARTFLOW-UI-COLOR-TOKENS.md](REVIEW-SMARTFLOW-UI-COLOR-TOKENS.md)
