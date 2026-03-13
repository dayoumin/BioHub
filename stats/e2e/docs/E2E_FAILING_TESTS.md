# E2E 실패 테스트 이슈 정리

> 작성: 2026-03-13 | 대상: Phase 4-5 E2E 테스트
> 다른 세션에서 수정 작업 시 참고용

## 전제조건

테스트 재현 전 반드시:
```bash
cd stats
pnpm build                    # out/ 정적 빌드 생성 (필수)
npx playwright test <spec>    # playwright.config.ts가 `npx serve out -p 3000 -s` 자동 실행
```
`playwright.config.ts:28`에서 `out/` 폴더를 serve로 띄움. 빌드 없이 실행하면 404가 나므로, 실패 원인이 테스트인지 빌드 상태인지 분리 불가.

---

## 전체 현황

| 테스트 파일 | 통과 | 실패 | 스킵 | 미실행 |
|---|---|---|---|---|
| common-ux (Phase 4C) | 9 | 0 | 0 | 0 |
| common-nonfunctional (Phase 5C) | 9 | 0 | 0 | 0 |
| graph-ux (Phase 4B) | 10 | 1 | 1 | 0 |
| graph-nonfunctional (Phase 5B) | 10 | 0 | 0 | 0 |
| statistics-ux (Phase 4A) | 5 | 3 | 6 | 0 |
| statistics-nonfunctional (Phase 5A) | 2 | 4 | 0 | 4 |
| **합계** | **45** | **8** | **7** | **4** |

> **스킵**: 코드 내 `test.skip()` 호출 (기능 미구현 등)
> **미실행**: Playwright worker crash 후 남은 테스트가 실행되지 않음 (`did not run`)

---

## 실패 테스트 상세 (8건)

### ISSUE-1: Smart Flow 반복 네비게이션 시 렌더링 실패

**관찰된 증상:** `navigateToUploadStep()` (`flow-helpers.ts:28`) 내에서 `page.goto('/', ...)` 후 30초 내에 `hub-upload-card`, `input[type="file"]`, `data-profile-summary` 중 어떤 것도 DOM에 나타나지 않음. 로그에 `[navigate] render failed, retry 1/5` 반복 후 5분 타임아웃.

**관찰 조건:** 같은 페이지 세션에서 Smart Flow를 1회 완료(결과 도달)한 뒤, 2회차 `navigateToUploadStep` 호출 시 발생. 1회차 분석은 항상 성공.

**추정 원인 (미검증):** SPA 상태(Pyodide Worker, Smart Flow 스텝 상태, 결과 캐시 등)가 `goto('/')` 후에도 완전 초기화되지 않아 React hydration이 블로킹되는 것으로 추정. 단, `navigateToUploadStep`에는 ChunkLoadError 복구 + 5회 재시도 + 렌더링 대기 로직이 있음에도 실패하므로, 단순 로딩 지연이 아닌 앱 상태 문제일 가능성이 높음. 정확한 원인은 Playwright trace 분석 또는 앱 디버깅 필요.

**영향 받는 테스트:**

| TC | 파일:라인 | 2회차 네비게이션 발생 지점 |
|---|---|---|
| TC-5A.1.2 | statistics-nonfunctional.spec.ts:68 | 1회차 분석 완료 → `navigateToUploadStep` 2회차 (line 89) |
| TC-5A.1.4 | statistics-nonfunctional.spec.ts:171 | for loop 2회차 `navigateToUploadStep` (line 181) |
| TC-5A.1.5 | statistics-nonfunctional.spec.ts:206 | 워밍업 분석 완료 → for loop 내 `navigateToUploadStep` (line 227) |

**수정 방향:**
- 앱 코드: `ChatCentricHub` 마운트 시 이전 분석 상태 강제 초기화 여부 확인
- 테스트 코드: 반복 분석 테스트를 개별 `test()`로 분리(각각 새 browser context) 또는 `page.reload()` 후 상태 확인 추가

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

### ISSUE-3: TC-4A.1.1, TC-4A.1.2 — 분석 결과 도달 실패

**파일:** `statistics-ux.spec.ts:34` (TC-4A.1.1), `statistics-ux.spec.ts:110` (TC-4A.1.2)

**관찰된 증상:**
- TC-4A.1.1: 3분 타임아웃 (test.setTimeout이 180000인 것으로 추정). `waitForResults`는 `results-main-card` 또는 `method-specific-results` testid를 대기 (`flow-helpers.ts:468-471`)
- TC-4A.1.2: 44.9분 타임아웃 (retry에서 3분). 변수 할당 단계까지는 진행.

**추정 원인:** TC-4A.1.1은 AI 추천 흐름(`mockOpenRouterAPI` → 추천카드 → 수락)이 포함되어 있어 일반 분석보다 복잡. TC-4A.1.2는 paired-t-test.csv 사용 + 변수 수동 할당이 필요. 두 테스트 모두 분석 실행 자체가 시작되는지, Pyodide 로딩에서 멈추는지, 결과 렌더링에서 멈추는지 로그만으로는 특정 불가. Playwright trace 분석 필요.

**참고:** TC-5A.1.1 (Pyodide 첫 분석, t-test.csv, 자동 변수 할당)은 동일 환경에서 3.7초만에 통과. TC-4A.1.1/1.2와의 차이점은 AI 추천 흐름과 다른 CSV/변수 할당 경로.

---

### ISSUE-4: TC-4B.1.3 — Smart Flow 결과 → Graph Studio 이동

**파일:** `graph-ux.spec.ts:132`

**관찰된 증상:** `ensureVariablesOrSkip`까지 성공 (`variable-selection-next` 활성화 로그 확인), 이후 `clickAnalysisRun` → `waitForResults(page, 120000)` 에서 타임아웃. `waitForResults`는 `results-main-card` 또는 `method-specific-results` testid를 대기 (`flow-helpers.ts:468-471`).

**추정 원인:** 변수 할당은 되었으나 분석 실행 → 결과 렌더링 과정에서 실패. Graph Studio 이동 로직까지 도달하지 못함. ISSUE-3과 동일한 근본 원인일 가능성.

---

### ISSUE-5: TC-5A.2.1 — Worker 프로세스 크래시

**파일:** `statistics-nonfunctional.spec.ts:257`

**관찰된 증상:** `worker process exited unexpectedly (code=3221225794, signal=null)` — 테스트 시작 0ms 만에 즉시 실패. 코드 자체가 실행되지 않음.

**추정 원인:** 선행 테스트 TC-5A.1.4/TC-5A.1.5에서 반복 분석(3~5회 × 5분 타임아웃)으로 Playwright worker 프로세스의 메모리가 고갈된 후 crash 발생. `code=3221225794`는 Windows의 `STATUS_STACK_BUFFER_OVERRUN` (0xC0000409).

**후속 영향:** 이 crash로 인해 같은 실행 내 TC-5A.2.2~2.5, TC-5A.3.1이 `did not run` 처리됨 (4건). 이들은 코드 문제가 아니라 worker crash의 연쇄 효과.

**수정 방향:** ISSUE-1 해결 시 선행 테스트의 5분 타임아웃이 사라지므로 자연 해소될 가능성. 그래도 남으면 `test.describe`를 분리하여 worker 격리.

---

## 스킵 테스트 (7건) — 각각 `test.skip()` 호출로 정상 동작

| TC | 파일:라인 | skip 조건 (로그 메시지) |
|---|---|---|
| TC-4A.1.3 | statistics-ux.spec.ts:164 | `[data-testid*="quick"]` 카운트 0 → `test.skip()` (line 176) |
| TC-4A.2.2 | statistics-ux.spec.ts:243 | `[data-testid*="history"]` 미표시 → `test.skip()` (line 265) |
| TC-4A.2.3 | statistics-ux.spec.ts:284 | `[data-testid*="reanalysis"]` 미표시 → `test.skip()` (line 302) |
| TC-4A.4.1 | statistics-ux.spec.ts:521 | `export-dropdown` 미표시 → `test.skip()` (line 527). 분석 자체는 성공. |
| TC-4A.4.2 | statistics-ux.spec.ts:543 | 동일: `export-dropdown` 미표시 → `test.skip()` |
| TC-4A.4.3 | statistics-ux.spec.ts:565 | 동일: `export-dropdown` 미표시 → `test.skip()` |
| TC-4B.5.2 | graph-ux.spec.ts:523 | 복사 버튼 미표시 → `test.skip()` |

> **TC-4A.4.1~4.3 참고:** `runAnalysisForExport` 헬퍼로 분석까지는 성공하지만, 결과 화면에 `export-dropdown` testid가 없어서 skip. 이 3건은 ISSUE-1/3과 무관하며, **앱의 내보내기 UI에 `data-testid="export-dropdown"` 추가** 시 해결.

## 미실행 테스트 (4건) — Worker crash 후 `did not run`

| TC | 파일:라인 | 원인 |
|---|---|---|
| TC-5A.2.2 | statistics-nonfunctional.spec.ts:297 | ISSUE-5 (worker crash) 후 미실행 |
| TC-5A.2.3 | statistics-nonfunctional.spec.ts:326 | 동일 |
| TC-5A.2.5 | statistics-nonfunctional.spec.ts:361 | 동일 |
| TC-5A.3.1 | statistics-nonfunctional.spec.ts:402 | 동일 |

이 4건은 코드 문제가 아님. ISSUE-1/5 해결 후 재실행하면 결과 확인 가능.

---

## 우선순위

1. ~~**ISSUE-2 (P0, 테스트 코드)**: TC-4A.3.1 셀렉터 교체~~ — ✅ 수정 완료 (2026-03-13)
2. **ISSUE-3 (P1, 조사 필요)**: TC-4A.1.1/1.2 분석 결과 도달 실패 — Playwright trace로 어느 단계에서 멈추는지 특정
3. **ISSUE-1 (P1, 앱+테스트)**: 반복 네비게이션 렌더링 실패 — TC-5A.1.2/1.4/1.5 해결. 해결 시 ISSUE-5 + 미실행 4건도 자연 해소 기대
4. **ISSUE-4 (P2)**: TC-4B.1.3 — ISSUE-3 해결 후 재검증
5. **TC-4A.4.1~4.3 (P3, 앱 코드)**: 내보내기 UI에 `data-testid="export-dropdown"` 추가

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
