# Code Review Request: Action Bar 기술 부채 6건 정리

## 개요

- **유형**: 순수 리팩토링 (기능 변경 없음)
- **범위**: Step 4 결과 화면의 액션 바 및 AI 해석 영역
- **규모**: 10 files changed, 146 insertions(+), 241 deletions(-)

## 변경 항목

### 1. ConfirmAlertDialog 공통 컴포넌트 추출 (신규 파일)

**파일**: `stats/components/common/ConfirmAlertDialog.tsx` (신규, 57줄)

5곳에서 반복되던 AlertDialog 보일러플레이트(open/title/description/cancel/confirm)를 단일 컴포넌트로 추출.

**적용 대상**:
- `ResultsActionButtons` — 새 분석 확인 + 방법 변경 확인 (2개)
- `AnalysisHistoryPanel` — 개별 삭제 + 전체 삭제 (2개, 전체 삭제는 `destructive` prop)
- `QuickAccessBar` — 삭제 확인 (1개)

**리뷰 포인트**: `destructive` prop이 `cn(destructive && '...')`로 처리 — falsy 안전한지 확인.

### 2. Dialog State Sprawl 해소

**파일**: `ResultsActionButtons.tsx`, `ResultsActionStep.tsx`

이전: 부모(`ResultsActionStep`)가 `showNewAnalysisConfirm`, `showChangeMethodConfirm` 상태를 소유하고 6개 props로 자식에 전달.

이후: `ResultsActionButtons`가 confirm dialog 상태를 내부에서 관리. 부모는 `onNewAnalysisConfirm`, `onChangeMethodConfirm` 콜백만 전달.

**제거된 props** (6개):
```
showNewAnalysisConfirm, onShowNewAnalysisConfirmChange,
showChangeMethodConfirm, onShowChangeMethodConfirmChange,
onNewAnalysis (→ 자식 내부에서 버튼 클릭 시 직접 confirm dialog open)
```

**리뷰 포인트**: 부모의 `handleNewAnalysis` (단순히 `setShowNewAnalysisConfirm(true)`) 제거 후 부모의 비즈니스 로직(`handleNewAnalysisConfirm`, `handleChangeMethod`)은 그대로 유지되는지.

### 3. 인라인 Terminology 타입 → Pick

**파일**: `ResultsActionButtons.tsx`, `ResultsHeroCard.tsx`

이전: 각 컴포넌트가 `t: { results: { buttons: { ... }, confirm: { ... } } }` 형태로 인라인 타입 재정의.

이후: `t: Pick<TerminologyDictionary, 'results'>`로 전환.

**리뷰 포인트**: `TerminologyDictionary.results`가 실제로 `buttons`, `confirm`, `exportDialog` 등 모든 하위 키를 포함하는지 — 과도하게 넓은 타입이 아닌지.

### 4. AI_ACCENT 디자인 토큰 (violet 하드코딩 제거)

**파일**: `stats/lib/design-tokens/analysis.ts` (27줄 추가)

```typescript
export const AI_ACCENT = {
  surface:        'bg-violet-50/40 dark:bg-violet-950/20',   // 콜아웃/CTA 배경
  surfaceStrong:  'bg-violet-50/60 dark:bg-violet-950/20',   // 요약 히어로 배경
  iconBg:         'bg-violet-50 dark:bg-violet-900/40',      // 아이콘 컨테이너
  iconBgSubtle:   'bg-violet-50/60 dark:bg-violet-900/20',   // 스켈레톤 아이콘
  icon:           'text-violet-500',                          // 아이콘 색상
  cursor:         'bg-violet-500',                            // 스트리밍 커서
  label:          'text-violet-700 dark:text-violet-300',     // 주 라벨
  labelSecondary: 'text-violet-600 dark:text-violet-400',     // 보조 라벨
  pillActiveBg:   'bg-violet-100 dark:bg-violet-900/40',     // 활성 pill 배경
} as const
```

**적용 파일**: `AiInterpretationCard.tsx` (12곳), `ResultsActionStep.tsx` (2곳), `FollowUpQASection.tsx` (3곳)

**리뷰 포인트**:
- `surface` vs `surfaceStrong`의 차이가 opacity 40% vs 60%뿐인데 구분이 필요한지
- 스켈레톤 Sparkles 아이콘(`text-violet-300`)은 의도적으로 토큰화하지 않음 (뮤트된 색)

### 5. 렌더 중 setState → useEffect 전환

**파일**: `AiInterpretationCard.tsx` (lines 252-272)

이전: 렌더 함수 본문에서 `detailRef.current` 비교 후 `setActiveSection(null)`, `setShowAll(false)` 호출 (React 안티패턴).

이후:
```typescript
const detail = parsedInterpretation?.detail ?? null
const prevDetailRef = useRef<string | null>(null)

useEffect(() => {
  if (isInterpreting) return

  const detailChanged = prevDetailRef.current !== detail
  prevDetailRef.current = detail

  // detail이 바뀐 경우(히스토리 전환·재해석 완료)만 userInteracted 리셋
  // 스트리밍 완료(isInterpreting만 변경, detail 동일)에서는 사용자 선택 유지
  if (detailChanged) {
    userInteracted.current = false
  }
  if (userInteracted.current) return

  if (detailSections.length > 0) {
    setActiveSection(detailSections[0].key)
  } else {
    setActiveSection(null)
  }
  setShowAll(false)
}, [detail, isInterpreting])
```

**제거된 ref**: `autoSelectPending` (1개). `detailRef` → `prevDetailRef`로 역할 축소 (detail 변경 감지 전용). `userInteracted` 유지.

**리뷰 후 수정 (2차 리뷰 Finding 1)**:
- 1차 코드는 `userInteracted`를 무조건 리셋하여 스트리밍 중 사용자 pill 선택이 완료 시점에 초기화되는 UX 회귀가 있었음
- 수정: `prevDetailRef`로 detail 변경 여부를 추적하여, detail이 실제로 바뀐 경우(히스토리 전환)만 리셋하고 스트리밍 완료(isInterpreting만 변경)에서는 사용자 선택을 유지

### 6. AnimatePresence exit 시간 단축

**파일**: `AiInterpretationCard.tsx` (line 298)

이전: `mode="wait"` + exit duration 0.25s → 순수 애니메이션 대기 250-450ms.

이후: `mode="wait"` 유지 + exit duration `0.15s` + exit `{ opacity: 0 }` (y 이동 제거) → 대기 150ms로 40% 단축.

**리뷰 후 수정 (2차 리뷰 Finding 2)**:
- 1차 코드는 `mode="sync"`로 변경했으나, exit 중인 child가 DOM에 남아 새 child와 동시 렌더링되어 카드 2개 쌓임/높이 플래시 가능
- 수정: `mode="wait"` 복원. exit 시간만 단축(0.25→0.15s)하여 대기 체감은 줄이되 레이아웃 안정성 유지

---

## 테스트 영향

- tsc: 0 에러 (기존 테스트 파일 1건 제외)
- vitest: 7149 passed / 1 failed (기존 MethodBrowser 테스트, 이번 변경 무관)
- 테스트 mock 보강: `ResultsActionStep-reanalyze.test.tsx`, `ResultsActionStep-history-restore.test.tsx`에 `confirm.changeMethod` 추가 (dialog state 이동으로 인해 자식 컴포넌트가 해당 terminology에 직접 접근)

## Diff

```
10 files changed, 146 insertions(+), 241 deletions(-)
```

| 파일 | 변경 |
|------|------|
| `components/common/ConfirmAlertDialog.tsx` | 신규 (57줄) |
| `components/analysis/AnalysisHistoryPanel.tsx` | AlertDialog → ConfirmAlertDialog |
| `components/analysis/hub/QuickAccessBar.tsx` | AlertDialog → ConfirmAlertDialog |
| `components/analysis/steps/ResultsActionStep.tsx` | confirm state 제거 + AI_ACCENT 토큰 |
| `components/analysis/steps/results/ResultsActionButtons.tsx` | 재작성 (state 내부화 + ConfirmAlertDialog + Pick 타입) |
| `components/analysis/steps/results/AiInterpretationCard.tsx` | useEffect + AI_ACCENT + AnimatePresence sync |
| `components/analysis/steps/results/ResultsHeroCard.tsx` | Pick 타입 |
| `components/analysis/steps/results/FollowUpQASection.tsx` | AI_ACCENT 토큰 |
| `lib/design-tokens/analysis.ts` | AI_ACCENT 토큰 정의 |
| `__tests__/...` (2파일) | mock 보강 |
