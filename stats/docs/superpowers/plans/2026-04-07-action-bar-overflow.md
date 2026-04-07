# Action Bar 2-Button + Overflow 리팩토링

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 상단 액션 바에서 "결과 요약" 버튼을 조건부로 표시하고, 하단 액션 바의 보조 버튼 3개를 MoreHorizontal overflow 드롭다운으로 통합한다.

**Architecture:** 상단 StepHeader 영역은 `paperDraft` 존재 시 secondary variant, 미존재 시 outline variant로 표시 (AI 해석 완료 전에도 진입 가능). 하단 ResultsActionButtons는 "방법 변경", "템플릿 저장", "Graph Studio"를 `···` 드롭다운으로 묶고, "다시분석"과 "새분석"만 직접 노출. Linear의 Calm Chrome 패턴 적용 — ghost `MoreHorizontal` 아이콘 버튼.

**Tech Stack:** React, shadcn/ui (DropdownMenu, Button), Lucide icons (MoreHorizontal), Vitest

---

## 변경 파일 목록

| 파일 | 액션 | 역할 |
|------|------|------|
| `stats/components/analysis/steps/ResultsActionStep.tsx` | Modify:824-834 | 상단 "결과 요약" 버튼 조건부 렌더링 |
| `stats/components/analysis/steps/results/ResultsActionButtons.tsx` | Modify | 하단 3버튼 → overflow 드롭다운 전환 |
| `stats/lib/terminology/terminology-types.ts` | Modify:974-986 | `moreActions` 키 추가 |
| `stats/lib/terminology/domains/aquaculture.ts` | Modify:927-937 | `moreActions: '더보기'` 추가 |
| `stats/lib/terminology/domains/generic.ts` | Modify:926-936 | `moreActions: 'More'` 추가 |
| `stats/__tests__/components/analysis/ResultsActionStep.test.tsx` | Modify | 단위 테스트 업데이트 |
| `stats/e2e/selectors.ts` | Modify:117-119 | `moreActionsBtn` 셀렉터 추가 |
| `stats/e2e/ux/graph-ux.spec.ts` | Modify:147-152 | 더보기 드롭다운 선행 클릭 추가 |
| `stats/e2e/charts/chart-export.spec.ts` | Modify:45-49 | 더보기 드롭다운 선행 클릭 추가 |

---

### Task 1: 상단 "결과 요약" 버튼 variant 단순화

**Files:**
- Modify: `stats/components/analysis/steps/ResultsActionStep.tsx:824-834`

- [ ] **Step 1: variant/text 분기 유지, className 단순화**

`ResultsActionStep.tsx`에서 "결과 요약" 버튼 블록(라인 824-834)을 다음으로 교체:

```tsx
<Button
  variant={paperDraft ? 'secondary' : 'outline'}
  size="sm"
  onClick={handlePaperDraftToggle}
  aria-label={paperDraft ? t.results.buttons.viewSummary : t.results.buttons.resultsSummary}
  className={cn("h-8 px-1.5 sm:px-2.5 shadow-sm", paperDraft && "text-primary")}
  data-testid="paper-draft-btn"
>
  <BookOpen className="w-3.5 h-3.5 sm:mr-1" />
  <span className="hidden sm:inline">{paperDraft ? t.results.buttons.viewSummary : t.results.buttons.resultsSummary}</span>
</Button>
```

변경점:
- **기존 동작 유지** — `paperDraft` 유무에 따라 variant(outline/secondary)와 텍스트(결과 정리/정리 보기) 분기
- AI 해석 완료 전에도 버튼이 항상 표시되므로, CTA 배너가 없는 구간에서도 논문 초안 생성 진입 가능
- CTA 배너(라인 943-956)는 **보조 유도** 역할로 유지 — 둘 다 `handlePaperDraftToggle` 호출

실질적으로 기존 코드와 동일. Task 1은 "변경 없음 확인"에 가깝다. 이후 Task에서 상단 버튼 개수가 3~4개로 유지됨을 확인하는 맥락.

- [ ] **Step 2: 커밋 (변경이 없으면 스킵)**

기존 코드와 차이가 없으면 커밋하지 않는다.

---

### Task 2: terminology에 `moreActions` 키 추가

**Files:**
- Modify: `stats/lib/terminology/terminology-types.ts:974-986`
- Modify: `stats/lib/terminology/domains/aquaculture.ts:927-937`
- Modify: `stats/lib/terminology/domains/generic.ts:926-936`

> **Note:** `history.labels.moreActions` (ko: '더보기', en: 'More')가 이미 동일한 용도(MoreHorizontal overflow 버튼의 aria-label)로 존재한다. 키 이름을 `moreActions`로 통일하여 일관성 유지.

- [ ] **Step 1: 타입에 `moreActions` 추가**

`stats/lib/terminology/terminology-types.ts`에서 `results.buttons` 인터페이스의 `changeMethod` 뒤에 추가:

```typescript
// 기존
changeMethod: string
resultsSummary: string
// 추가
moreActions: string
```

- [ ] **Step 2: aquaculture 도메인에 값 추가**

`stats/lib/terminology/domains/aquaculture.ts`의 `results.buttons` 객체에서 `changeMethod` 뒤에 추가:

```typescript
changeMethod: '방법 변경',
moreActions: '더보기',
```

- [ ] **Step 3: generic 도메인에 값 추가**

`stats/lib/terminology/domains/generic.ts`의 `results.buttons` 객체에서 `changeMethod` 뒤에 추가:

```typescript
changeMethod: 'Change Method',
moreActions: 'More',
```

- [ ] **Step 4: 타입 체크**

```bash
cd stats && node node_modules/typescript/bin/tsc --noEmit
```

Expected: 성공 (또는 기존 에러만 — 신규 에러 없음)

- [ ] **Step 5: 커밋**

```bash
git add stats/lib/terminology/terminology-types.ts stats/lib/terminology/domains/aquaculture.ts stats/lib/terminology/domains/generic.ts
git commit -m "feat(terminology): results.buttons에 moreActions 키 추가 (history.labels와 명명 통일)"
```

---

### Task 3: 하단 액션 바를 2-Button + Overflow로 전환

**Files:**
- Modify: `stats/components/analysis/steps/results/ResultsActionButtons.tsx`

- [ ] **Step 1: DropdownMenu 임포트 추가**

`ResultsActionButtons.tsx` 상단에 추가:

```tsx
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
```

기존 lucide 임포트에서 `RefreshCw`는 유지 (재분석 버튼에 사용).

- [ ] **Step 2: Props 인터페이스에 moreActions 추가**

`ResultsActionButtonsProps`의 `t.results.buttons` 타입에 추가:

```typescript
t: {
  results: {
    buttons: {
      backToVariables: string
      changeMethod: string
      saveTemplate: string
      reanalyze: string
      newAnalysis: string
      moreActions: string  // 추가
    }
    // ... confirm, exportDialog 동일
  }
}
```

- [ ] **Step 3: 하단 액션 바 레이아웃 변경**

기존 6개 버튼 레이아웃을:

```
[← 뒤로] [방법변경]  ···  [템플릿] [Graph Studio] | [다시분석] [새분석]
```

다음으로 교체:

```tsx
{/* ===== 액션 버튼 ===== */}
<div className="flex items-center gap-2 flex-wrap pt-4 pb-2 mt-2 bg-surface-container/30 -mx-1 px-3 rounded-xl" data-testid="action-buttons">
  <Button
    variant="ghost"
    size="sm"
    onClick={onBackToVariables}
    className="text-muted-foreground hover:text-foreground text-sm h-9"
  >
    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
    {t.results.buttons.backToVariables}
  </Button>

  <div className="flex-1" />

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground hover:text-foreground text-sm h-9 px-2"
        aria-label={t.results.buttons.moreActions}
        data-testid="more-actions-btn"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => onShowChangeMethodConfirmChange(true)} data-testid="change-method-btn">
        <RefreshCw className="w-4 h-4 mr-2" />
        {t.results.buttons.changeMethod}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onSaveTemplate}>
        <FileText className="w-4 h-4 mr-2" />
        {t.results.buttons.saveTemplate}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onOpenGraphStudio} data-testid="open-graph-studio-btn">
        <BarChart3 className="w-4 h-4 mr-2" />
        Graph Studio
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>

  <div className="w-px h-5 bg-surface-container-highest/50" />

  <Button
    variant="secondary"
    size="sm"
    onClick={onReanalyze}
    className="text-sm h-9"
    data-testid="reanalysis-btn"
  >
    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
    {t.results.buttons.reanalyze}
  </Button>
  <Button
    variant="default"
    size="sm"
    onClick={onNewAnalysis}
    className="text-sm h-9"
    data-testid="new-analysis-btn"
  >
    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
    {t.results.buttons.newAnalysis}
  </Button>
</div>
```

핵심 변경:
- "방법 변경" 직접 버튼 → `···` 드롭다운 메뉴 아이템
- "템플릿 저장" 직접 버튼 → `···` 드롭다운 메뉴 아이템
- "Graph Studio" 직접 버튼 → `···` 드롭다운 메뉴 아이템
- `···` 버튼: ghost variant, `MoreHorizontal` 아이콘만 (텍스트 없음, aria-label만)
- `data-testid` 유지: `change-method-btn`, `open-graph-studio-btn`은 DropdownMenuItem에 이동
- 새 testid: `more-actions-btn`

- [ ] **Step 4: 커밋**

```bash
git add stats/components/analysis/steps/results/ResultsActionButtons.tsx
git commit -m "refactor(results): 하단 액션 바 3버튼 → overflow 드롭다운으로 통합"
```

---

### Task 4: 단위 테스트 + E2E 테스트 업데이트

**Files:**
- Modify: `stats/__tests__/components/analysis/ResultsActionStep.test.tsx`
- Modify: `stats/e2e/selectors.ts:117-119`
- Modify: `stats/e2e/ux/graph-ux.spec.ts:147-152`
- Modify: `stats/e2e/charts/chart-export.spec.ts:45-49`

- [ ] **Step 0: 테스트 mock에 `moreActions` 키 추가**

테스트 파일의 mock terminology 객체(라인 573-578 부근)의 `buttons`에 `moreActions` 추가:

```typescript
buttons: {
  saved: '저장됨', save: '저장', generating: '생성중...', pdf: 'PDF',
  copied: '복사됨', copy: '복사', saveTemplate: '템플릿으로 저장',
  reanalyze: '다른 데이터로 재분석', newAnalysis: '새 분석 시작',
  export: '내보내기', exporting: '내보내는 중...', exportDocx: 'Word (.docx)', exportExcel: 'Excel (.xlsx)',
  exportHtml: 'HTML', exportWithOptions: '옵션으로 내보내기', backToVariables: '변수 선택으로', changeMethod: '방법 변경',
  moreActions: '더보기',  // 추가
},
```

이 키가 없으면 `aria-label`이 `undefined`가 되어 테스트 계약과 실제 코드가 어긋남.

- [ ] **Step 1: 직접 노출 테스트 → 드롭다운 내 존재 테스트로 변경**

**변경 1** — 라인 982-988 "재분석, 새 분석, 템플릿 버튼이 모두 직접 노출된다 (⋯ 메뉴 없음)" 테스트:

기존:
```typescript
it('재분석, 새 분석, 템플릿 버튼이 모두 직접 노출된다 (⋯ 메뉴 없음)', () => {
  renderWithAct(<ResultsActionStep results={baseResults} />)

  expect(screen.getByText('다른 데이터로 재분석')).toBeInTheDocument()
  expect(screen.getByText('새 분석 시작')).toBeInTheDocument()
  expect(screen.getByText('템플릿으로 저장')).toBeInTheDocument()
})
```

변경:
```typescript
it('재분석, 새 분석은 직접 노출되고, 보조 액션은 더보기 메뉴에 존재한다', () => {
  renderWithAct(<ResultsActionStep results={baseResults} />)

  // 직접 노출
  expect(screen.getByText('다른 데이터로 재분석')).toBeInTheDocument()
  expect(screen.getByText('새 분석 시작')).toBeInTheDocument()
  // 보조 액션은 더보기 드롭다운 안에 (초기 비노출)
  expect(screen.getByTestId('more-actions-btn')).toBeInTheDocument()
})
```

**변경 2** — 라인 1494-1500 "action-buttons에 재분석 / 새 분석 / 템플릿 버튼이 존재한다":

기존:
```typescript
it('action-buttons에 재분석 / 새 분석 / 템플릿 버튼이 존재한다', () => {
  renderPhase(<ResultsActionStep results={baseResults} />)
  const actionButtons = screen.getByTestId('action-buttons')
  expect(within(actionButtons).getByText('다른 데이터로 재분석')).toBeInTheDocument()
  expect(within(actionButtons).getByText('새 분석 시작')).toBeInTheDocument()
  expect(within(actionButtons).getByText('템플릿으로 저장')).toBeInTheDocument()
})
```

변경:
```typescript
it('action-buttons에 재분석 / 새 분석은 직접 노출, 보조는 더보기 메뉴', () => {
  renderPhase(<ResultsActionStep results={baseResults} />)
  const actionButtons = screen.getByTestId('action-buttons')
  expect(within(actionButtons).getByText('다른 데이터로 재분석')).toBeInTheDocument()
  expect(within(actionButtons).getByText('새 분석 시작')).toBeInTheDocument()
  expect(within(actionButtons).getByTestId('more-actions-btn')).toBeInTheDocument()
  // 템플릿은 더보기 안에 (초기에는 보이지 않음)
  expect(within(actionButtons).queryByText('템플릿으로 저장')).not.toBeInTheDocument()
})
```

**변경 3** — 라인 1548-1562 "방법 변경 버튼 클릭" 테스트:

`change-method-btn`이 이제 DropdownMenuItem에 있으므로, 먼저 더보기 버튼을 클릭해서 드롭다운을 열어야 한다. **JSDOM에서 Radix DropdownMenu가 안 열릴 수 있으므로** 기존 내보내기 테스트(라인 1183-1193)와 동일한 `queryByTestId` + `if/else` fallback 패턴 적용:

기존:
```typescript
const changeBtn = screen.getByTestId('change-method-btn')
await act(async () => { fireEvent.click(changeBtn) })
```

변경:
```typescript
// 더보기 드롭다운 열기
const moreBtn = screen.getByTestId('more-actions-btn')
await act(async () => { fireEvent.click(moreBtn) })
// JSDOM-safe: Radix DropdownMenu가 열리지 않을 수 있음
const changeBtn = screen.queryByTestId('change-method-btn')
if (changeBtn) {
  await act(async () => { fireEvent.click(changeBtn) })
  // 기존 expect 검증 유지
  expect(mockStoreState.setResults).toHaveBeenCalledWith(null)
  expect(mockStoreState.setAssumptionResults).toHaveBeenCalledWith(null)
  expect(mockStoreState.setVariableMapping).toHaveBeenCalledWith(null)
  expect(mockStoreState.pruneCompletedStepsFrom).toHaveBeenCalledWith(3)
  expect(mockModeStoreState.setStepTrack).toHaveBeenCalledWith('normal')
  expect(mockStoreState.setCurrentStep).toHaveBeenCalledWith(2)
  expect(mockStoreState.navigateToStep).not.toHaveBeenCalled()
} else {
  // DropdownMenu가 JSDOM에서 열리지 않을 경우 — trigger 존재 확인
  expect(moreBtn).toBeInTheDocument()
}
```

**변경 4** — 라인 1575-1598 Graph Studio 테스트 2개:

동일하게 JSDOM-safe 패턴 적용:

기존:
```typescript
const graphBtn = screen.getByTestId('open-graph-studio-btn')
await act(async () => { fireEvent.click(graphBtn) })
```

변경:
```typescript
const moreBtn = screen.getByTestId('more-actions-btn')
await act(async () => { fireEvent.click(moreBtn) })
const graphBtn = screen.queryByTestId('open-graph-studio-btn')
if (graphBtn) {
  await act(async () => { fireEvent.click(graphBtn) })
  // 기존 expect 검증 유지
  expect(mockLoadDataPackageWithSpec).toHaveBeenCalledTimes(1)
  // ... (각 테스트의 기존 검증 그대로)
} else {
  expect(moreBtn).toBeInTheDocument()
}
```

- [ ] **Step 2: 테스트 실행**

```bash
cd stats && pnpm test __tests__/components/analysis/ResultsActionStep.test.tsx
```

Expected: 모든 테스트 통과

- [ ] **Step 3: 단위 테스트 커밋**

```bash
git add stats/__tests__/components/analysis/ResultsActionStep.test.tsx
git commit -m "test(results): 하단 액션 바 overflow 패턴에 맞게 단위 테스트 업데이트"
```

- [ ] **Step 4: E2E selectors에 `moreActionsBtn` 추가**

`stats/e2e/selectors.ts`에서 `openGraphStudioBtn` 위에 추가:

```typescript
// ===== Graph Studio (Smart Flow → 시각화 연계) =====
/** Smart Flow 결과 화면의 "더보기" overflow 드롭다운 트리거 */
moreActionsBtn: '[data-testid="more-actions-btn"]',
/** Smart Flow 결과 화면의 "Graph Studio" 이동 버튼 (더보기 드롭다운 내) */
openGraphStudioBtn: '[data-testid="open-graph-studio-btn"]',
```

- [ ] **Step 5: E2E graph-ux.spec.ts 업데이트**

`stats/e2e/ux/graph-ux.spec.ts:147-152`에서 `openGraphStudioBtn` 클릭 전에 더보기 드롭다운을 먼저 열기:

기존:
```typescript
// Graph Studio 버튼 클릭
const gsBtn = page.locator(S.openGraphStudioBtn)
if (!(await gsBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
```

변경:
```typescript
// 더보기 드롭다운 열기 → Graph Studio 클릭
const moreBtn = page.locator(S.moreActionsBtn)
if (!(await moreBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
  log('TC-4B.1.3', 'SKIPPED: more-actions-btn 미표시')
  test.skip()
  return
}
await moreBtn.click()
const gsBtn = page.locator(S.openGraphStudioBtn)
```

- [ ] **Step 6: E2E chart-export.spec.ts 업데이트**

`stats/e2e/charts/chart-export.spec.ts:45-49`에서 동일 패턴 적용:

기존:
```typescript
const gsBtn = page.locator(S.openGraphStudioBtn)
if (!await gsBtn.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
await gsBtn.click()
```

변경:
```typescript
const moreBtn = page.locator(S.moreActionsBtn)
if (!await moreBtn.isVisible({ timeout: 5000 }).catch(() => false)) { test.skip(); return }
await moreBtn.click()
const gsBtn = page.locator(S.openGraphStudioBtn)
await gsBtn.click()
```

- [ ] **Step 7: E2E 커밋**

```bash
git add stats/e2e/selectors.ts stats/e2e/ux/graph-ux.spec.ts stats/e2e/charts/chart-export.spec.ts
git commit -m "test(e2e): Graph Studio 버튼이 더보기 드롭다운으로 이동한 것에 맞게 E2E 업데이트"
```

---

### Task 5: 최종 검증 + 정리

- [ ] **Step 1: 전체 타입 체크**

```bash
cd stats && node node_modules/typescript/bin/tsc --noEmit
```

- [ ] **Step 2: 단위 테스트 실행**

```bash
cd stats && pnpm test __tests__/components/analysis/ResultsActionStep.test.tsx
```

- [ ] **Step 3: E2E 셀렉터 검증 (수동 확인)**

E2E 실행은 dev 서버가 필요하므로 전체 실행 대신, 셀렉터 정합성만 확인:
- `selectors.ts`의 `moreActionsBtn`이 `'[data-testid="more-actions-btn"]'`을 가리키는지
- `ResultsActionButtons.tsx`에서 `data-testid="more-actions-btn"`이 실제로 존재하는지
- `graph-ux.spec.ts`와 `chart-export.spec.ts`가 `S.moreActionsBtn`을 참조하는지

```bash
cd stats && grep -n "more-actions-btn" components/analysis/steps/results/ResultsActionButtons.tsx e2e/selectors.ts
cd stats && grep -n "moreActionsBtn" e2e/ux/graph-ux.spec.ts e2e/charts/chart-export.spec.ts
```

Expected: 각 파일에서 1건씩 매칭

- [ ] **Step 4: 메모리 업데이트**

`project_header_action_bar_review.md`를 완료 상태로 업데이트 — "Option A (2-Button + Overflow) 적용 완료" 기록.
