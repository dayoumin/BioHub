# E2E 실패 테스트 이슈 정리

> 작성: 2026-03-13 | 대상: Phase 4-5 E2E 테스트
> 다른 세션에서 수정 작업 시 참고용

## 전제조건

테스트 재현 전 반드시:
```bash
cd stats
NEXT_PUBLIC_OPENROUTER_MODEL=test-model pnpm build   # out/ 정적 빌드 생성 (필수, AI mock용 env 포함)
npx playwright test <spec>    # playwright.config.ts가 `npx serve out -p 3200 -s` 자동 실행
```
`playwright.config.ts:28`에서 `out/` 폴더를 serve로 띄움 (포트 3200). 빌드 없이 실행하면 404가 나므로, 실패 원인이 테스트인지 빌드 상태인지 분리 불가.

---

## 전체 현황 (2026-03-14 최종)

> ✅ **전체 해결 완료**: 60 passed, 4 skipped, 0 failed (13.4분)

| 테스트 파일 | 통과 | 실패 | 스킵 | 미실행 |
|---|---|---|---|---|
| common-ux (Phase 4C) | 9 | 0 | 0 | 0 |
| common-nonfunctional (Phase 5C) | 9 | 0 | 0 | 0 |
| graph-ux (Phase 4B) | 11 | 0 | 1 | 0 |
| graph-nonfunctional (Phase 5B) | 10 | 0 | 0 | 0 |
| statistics-ux (Phase 4A) | 11 | 0 | 3 | 0 |
| statistics-nonfunctional (Phase 5A) | 10 | 0 | 0 | 0 |
| **합계** | **60** | **0** | **4** | **0** |

> ✅ 2026-03-14 수정 (세션 4):
> - TC-4A.1.1 (mock URL + auto-trigger), TC-4A.1.2 (chip 기반 변수 할당), TC-4A.3.1 (이전 수정 확인), TC-4B.1.3 (fallback 코드 제거)
> - **ISSUE-1**: `navigateToUploadStep`에 `sessionStorage.clear()` 추가 → TC-5A.1.2/1.4/1.5 + worker crash 해소
> - **TC-4A.4.1~3**: `ResultsActionStep.tsx`에 `data-testid="export-dropdown"` 등 추가 → skip→pass

> **스킵 4건**: 코드 내 `test.skip()` 호출 (기능 미구현) — TC-4A.1.3 (Quick Analysis), TC-4A.2.2 (History), TC-4A.2.3 (Re-analysis), TC-4B.5.2 (Graph copy)

---

## ~~실패 테스트 상세 (8건)~~ — 전체 해결 완료

### ~~ISSUE-1: Smart Flow 반복 네비게이션 시 렌더링 실패~~ ✅ 해결 (2026-03-14)

**근본 원인 (확정):** `analysis-store.ts`가 `persist` 미들웨어 + `sessionStorage`를 사용. 1회차 분석 완료 후 `page.goto('/')` 하면 sessionStorage에 저장된 zustand 상태가 rehydration되어 결과 화면(Step 4)이 다시 표시됨 → Upload Step 셀렉터들이 DOM에 나타나지 않아 5분 타임아웃.

**수정:** `flow-helpers.ts`의 `navigateToUploadStep` 최상단에 `await page.evaluate(() => sessionStorage.clear()).catch(() => {})` 추가. 이전 분석 상태를 완전 초기화하여 Hub가 정상 마운트됨.

**후속 효과:** ISSUE-5 (worker crash) + 미실행 4건도 자연 해소 — 선행 테스트의 5분 타임아웃이 사라져 메모리 고갈 없음.

---

### ISSUE-2: TC-4A.3.1 — `run-analysis-btn` 셀렉터 불일치

**파일:** `statistics-ux.spec.ts:315`

**관찰된 증상:** line 324-325에서 `runAnalysisBtn` (`[data-testid="run-analysis-btn"]`)을 `waitFor({ state: 'visible', timeout: 15000 })` 하지만 15초 타임아웃.

**원인 (확정):** 새 UI(`UnifiedVariableSelector`)는 `run-analysis-btn` 대신 `variable-selection-next` 버튼 사용. 이 테스트만 `clickAnalysisRun` 헬퍼 대신 직접 `S.runAnalysisBtn`을 참조하고 있음.

```typescript
// 현재 코드 (line 324-325) — 레거시 셀렉터 직접 사용
const runBtn = page.locator(S.runAnalysisBtn)
await runBtn.waitFor({ state: 'visible', timeout: 15000 })  // ← 타임아웃
```

**수정:**
```typescript
// 방법 1: 두 셀렉터 모두 대기
await page.waitForFunction(
  () =>
    document.querySelector('[data-testid="run-analysis-btn"]') !== null ||
    document.querySelector('[data-testid="variable-selection-next"]') !== null,
  { timeout: 15000 },
)
```
또는 직접 참조를 제거하고 `ensureVariablesOrSkip` + `clickAnalysisRun` 조합으로 교체 (두 버튼 모두 처리하는 기존 헬퍼).

---

### ~~ISSUE-3: TC-4A.1.1, TC-4A.1.2 — 분석 결과 도달 실패~~ ✅ 해결 (2026-03-14)

**근본 원인 (확정):**
1. **Mock URL 불일치**: `mockOpenRouterAPI`가 `openrouter.ai`만 가로챘으나 앱은 `/api/ai` 프록시 사용
2. **빌드 env 누락**: `NEXT_PUBLIC_OPENROUTER_MODEL=test-model` 없이 빌드하면 OpenRouter 비활성화
3. **Auto-trigger 경쟁 조건** (TC-4A.1.1): `PurposeInputStep`이 Step 2 진입 시 자동 AI 요청 → 수동 질문 입력 시 `START_AI_CHAT`이 `aiRecommendation=null`로 리셋
4. **변수 할당 toggle** (TC-4A.1.2): AI auto-trigger가 변수를 미리 할당 → 테스트가 같은 변수를 다시 클릭하면 toggle off

**수정:**
- `flow-helpers.ts`: mock이 `/api/ai/` + `openrouter.ai` 양쪽 인터셉트
- `statistics-ux.spec.ts` TC-4A.1.1: auto-trigger 대기 (수동 AI 채팅 제거)
- `statistics-ux.spec.ts` TC-4A.1.2: chip 존재 확인 후 미할당 변수만 pool-var 클릭
- 빌드: `NEXT_PUBLIC_OPENROUTER_MODEL=test-model pnpm build`

---

### ~~ISSUE-4: TC-4B.1.3 — Smart Flow 결과 → Graph Studio 이동~~ ✅ 해결 (2026-03-14)

**근본 원인 (확정):** `ensureVariablesOrSkip` 이후 불필요한 fallback 코드가 `runAnalysisBtn` (레거시, Smart Flow에 없음)을 체크 → false → generic `groupBtn` 클릭 → toggle OFF → 변수 해제 → 분석 실행 불가.

**수정:** fallback 코드 11줄 제거. `ensureVariablesOrSkip`이 양쪽 버튼 모두 처리.

**추정 원인:** 변수 할당은 되었으나 분석 실행 → 결과 렌더링 과정에서 실패. Graph Studio 이동 로직까지 도달하지 못함. ISSUE-3과 동일한 근본 원인일 가능성.

---

### ~~ISSUE-5: TC-5A.2.1 — Worker 프로세스 크래시~~ ✅ 해결 (2026-03-14)

ISSUE-1 해결 (sessionStorage.clear())로 자연 해소. 선행 테스트의 5분 타임아웃이 사라져 메모리 고갈 + worker crash 발생하지 않음.

---

## 스킵 테스트 (4건) — 각각 `test.skip()` 호출 (미구현 기능)

| TC | 파일:라인 | skip 조건 (로그 메시지) |
|---|---|---|
| TC-4A.1.3 | statistics-ux.spec.ts:164 | `[data-testid*="quick"]` 카운트 0 → `test.skip()` (line 176) |
| TC-4A.2.2 | statistics-ux.spec.ts:243 | `[data-testid*="history"]` 미표시 → `test.skip()` (line 265) |
| TC-4A.2.3 | statistics-ux.spec.ts:284 | `[data-testid*="reanalysis"]` 미표시 → `test.skip()` (line 302) |
| TC-4B.5.2 | graph-ux.spec.ts:523 | 복사 버튼 미표시 → `test.skip()` |

> ~~TC-4A.4.1~4.3~~: `ResultsActionStep.tsx`에 `data-testid="export-dropdown"` 추가하여 **skip→pass 전환** (2026-03-14)

## ~~미실행 테스트 (4건)~~ ✅ 해결 (2026-03-14)

ISSUE-1 해결로 worker crash 자연 해소 → TC-5A.2.1~2.5, TC-5A.3.1 모두 정상 통과.

---

## 우선순위 — ✅ 전체 해결 완료 (2026-03-14)

1. ~~**ISSUE-2 (P0)**: TC-4A.3.1 셀렉터 교체~~ — ✅ 수정 완료 (2026-03-13)
2. ~~**ISSUE-3 (P1)**: TC-4A.1.1/1.2 분석 결과 도달 실패~~ — ✅ 수정 완료 (2026-03-14)
3. ~~**ISSUE-4 (P1)**: TC-4B.1.3 — fallback 코드 제거~~ — ✅ 수정 완료 (2026-03-14)
4. ~~**ISSUE-1 (P1)**: 반복 네비게이션 렌더링 실패~~ — ✅ sessionStorage.clear() 추가 (2026-03-14)
5. ~~**ISSUE-5**: Worker crash~~ — ✅ ISSUE-1 해결로 자연 해소 (2026-03-14)
6. ~~**TC-4A.4.1~4.3 (P3)**: export-dropdown testid 추가~~ — ✅ 수정 완료 (2026-03-14)

## 재현 명령어

```bash
cd stats
pnpm build   # 필수: 정적 빌드 생성

# 개별 실패 테스트
npx playwright test e2e/ux/statistics-ux.spec.ts -g "TC-4A.1.1" --reporter=list
npx playwright test e2e/ux/statistics-ux.spec.ts -g "TC-4A.3.1" --reporter=list
npx playwright test e2e/ux/graph-ux.spec.ts -g "TC-4B.1.3" --reporter=list
npx playwright test e2e/nonfunctional/statistics-nonfunctional.spec.ts -g "TC-5A.1.2" --reporter=list

# trace 분석 (retry 시 자동 생성, playwright.config.ts:24 trace: 'on-first-retry')
npx playwright show-trace e2e/results/artifacts/<테스트폴더>/trace.zip

# 통과 확인 (빠른 검증, ~2분)
npx playwright test e2e/ux/common-ux.spec.ts e2e/nonfunctional/common-nonfunctional.spec.ts e2e/nonfunctional/graph-nonfunctional.spec.ts --reporter=list
```

## Trace 파일 위치

실패 테스트의 Playwright trace (retry 시 자동 생성):
- `e2e/results/artifacts/ux-statistics-ux--*-chromium-retry1/trace.zip`
- `e2e/results/artifacts/ux-graph-ux--*-chromium-retry1/trace.zip`
- `e2e/results/artifacts/nonfunctional-statistics-n-*-chromium-retry1/trace.zip`
