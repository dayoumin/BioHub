# 기술부채 수정 — AI 리뷰 요청서

**브랜치**: `feature/ui-redesign`
**날짜**: 2026-03-16
**변경 파일 수**: 104개 (테스트 102 + 소스 2)

---

## 변경 요약

| 항목 | 내용 | 파일 수 | 상태 |
|------|------|---------|------|
| M1 | 약한 단언 수정 (toBeTruthy→toBe(true), toBeGreaterThan(0)→toBeGreaterThanOrEqual(1)) | 83 | 완료, 리뷰 필요 |
| M2 | before/after 검증 + 부정 단언 추가 | 6 | 완료 |
| M3 | E2E waitForTimeout → 적절한 대기 패턴 | 28 | **잔여 문제 있음** |
| M4 | useAnalysisHandlers에 useShallow 적용 | 1 | 완료 |
| M5 | KDE 바이올린 플롯 maxDensity 사전 계산 | 1 | 완료 |
| M6 | 빈 smart-flow 디렉토리 삭제 | 0 | 완료 |

---

## 비판적 검토 결과

### CRITICAL: M3 — `networkidle`가 UI readiness와 무관한 동기화 수단

E2E 에이전트가 `waitForTimeout(N)`을 `waitForLoadState('networkidle')` 또는 `waitUntil: 'networkidle'`로 교체.

**총 84개소**: `waitForLoadState('networkidle')` 73개 + `waitUntil: 'networkidle'` 11개

| 파일 | waitForLoadState | waitUntil | 합계 |
|------|:---:|:---:|:---:|
| helpers/flow-helpers.ts | 18 | 0 | 18 |
| survival-roc-e2e.spec.ts | 16 | 0 | 16 |
| excel-upload.spec.ts | 5 | 8 | 13 |
| ux/common-ux.spec.ts | 6 | 2 | 8 |
| nonfunctional/common-nonfunctional.spec.ts | 6 | 1 | 7 |
| nonfunctional/graph-nonfunctional.spec.ts | 6 | 0 | 6 |
| ux/statistics-ux.spec.ts | 6 | 0 | 6 |
| analysis-e2e.spec.ts | 3 | 0 | 3 |
| seed.spec.ts | 2 | 0 | 2 |
| ux/graph-ux.spec.ts | 2 | 0 | 2 |
| pyodide-basic.spec.ts | 1 | 0 | 1 |
| nonfunctional/statistics-nonfunctional.spec.ts | 1 | 0 | 1 |
| methods/graph-studio-phase3.spec.ts | 1 | 0 | 1 |

**핵심 문제**: `networkidle`는 "0.5초간 네트워크 요청 없음"을 의미하며, **React 상태 업데이트 완료와는 무관한 동기화 수단**임.

- `page.goto()` 뒤: 초기 asset(JS/CSS) 로드 + Pyodide CDN fetch 등이 있으므로 대체로 **적절**
- UI 클릭/상태변경 뒤: 앱이 static export이므로 대부분 네트워크 요청이 없으나, Pyodide worker fetch나 앱 내부 route 전환이 섞인 경우도 있음. **"항상 즉시 resolve"라고 단정할 수는 없으나**, React 리렌더 완료를 보장하지 못하는 것은 사실
- 원래 `waitForTimeout(1000~3000ms)`이 React 상태 업데이트 대기용 — `networkidle`는 이 목적에 부적합

**수정 방향**: 클릭 후 UI 변화 대기는 `expect(locator).toBeVisible()` 또는 `waitForFunction()`으로 교체

```typescript
// 부적절 (현재)
await button.click()
await page.waitForLoadState('networkidle')  // React 상태 완료와 무관

// 권장
await button.click()
await expect(page.locator('[data-testid="target"]')).toBeVisible({ timeout: 5000 })
```

### HIGH (수정 완료): M1 — `.or()` locator strict mode 위험

Playwright `.or()`는 두 locator가 동시에 매치되면 합집합이 되어 strict mode에서 실패함.

**영향 위치 6개소** (analysis-e2e.spec.ts):
- line 60, 198, 274, 279, 380, 406

**조치**: 모든 위치에 `.first()` 추가 완료.

### RESOLVED: 범위 이탈 — 프로덕션 소스 코드 무단 변경

에이전트가 테스트 수정 범위를 벗어나 프로덕션 소스 8개 파일을 변경함.
**→ `git checkout HEAD -- <파일 목록>`으로 대상 파일 한정 복구 완료.** 현재 diff에는 포함되지 않음.

복구된 파일:
- `AnalysisHistoryPanel.tsx`, `ResultsVisualization.tsx`, `ResultsActionStep.tsx`
- `data-management.ts`, `analysis-store.ts`, `history-store.ts`
- `store-orchestration.ts`, `type-guards.ts`

### MINOR: M1 — `toBeGreaterThan(0)` → `toBeGreaterThanOrEqual(1)` 의미 동일

`.length` 검사에서 `toBeGreaterThan(0)`과 `toBeGreaterThanOrEqual(1)`은 정수에서 완전 동치.
명시성은 개선되었으나, 프로젝트 3원칙이 요구하는 "정확한 값 (=== 3)"과는 거리가 있음.
결정적 테스트에서는 정확한 기대값을 쓰는 것이 바람직.

### OK: M4 — useShallow 적용

`useAnalysisStore`, `useModeStore`, `useHistoryStore` 3개 스토어에 `useShallow` 적용.
- Zustand 5.0.11에서 `zustand/react/shallow` 확인 완료
- 셀렉터 객체 내부의 함수 참조(`canProceedToNext`, `addCompletedStep` 등)는 Zustand store 함수가 stable reference이므로 useShallow 호환됨
- `canProceedWithFloatingNav` useMemo의 deps에 `uploadedData`, `uploadedFileName` 등이 있는데 이것은 함수 내부에서 직접 사용하지 않음 — 기존 코드의 의도적 over-subscription이므로 건드리지 않음

### OK: M5 — KDE maxDensity 사전 계산

`kdeMaxDensities` 배열을 `kdeCurves`와 함께 사전 계산.
- `renderItem` 내부 loop 제거
- ECharts custom series의 `renderItem`은 카테고리당 1회 호출되므로 성능 영향은 미미하지만, 코드 의도가 명확해짐

### OK: M2 — before/after + 부정 단언

6개 스토어 테스트에 138개 테스트 통과 확인. 변경이 자연스럽고 과도하지 않음.

---

## 리뷰 요청 범위

### 1. 우선 리뷰 — M3 networkidle 84개소

클릭/상태변경 후 `networkidle`를 사용한 위치가 실제 flaky를 유발하는지 판단 필요.
`page.goto()` 뒤는 대체로 적절하므로 **UI 인터랙션 후 사용된 위치**를 집중 확인.

### 2. 일반 리뷰

- M1 단언 변경이 테스트 의도를 왜곡하지 않는지
- M1 `.or().first()` 패턴이 "둘 중 하나"라는 원래 의도를 올바르게 표현하는지
- M2 before/after 추가가 과도하거나 불충분하지 않은지
- M4 useShallow가 기존 동작을 깨뜨리지 않는지

### 3. 참고 — 변경하지 않은 것

- `python-calculation-accuracy.test.ts` — 통계값 `toBeGreaterThan(0)` 유지 (알고리즘 종속)
- E2E `test.setTimeout(180_000)` — 테스트 레벨 타임아웃 유지
- E2E `waitForTimeout(300)` — 애니메이션용 최소 대기 유지 (95개 잔여)

---

## 실행 명령어 (검증용)

```bash
# Unit 테스트
cd stats && pnpm test

# 타입 체크
cd stats && node node_modules/typescript/bin/tsc --noEmit

# E2E (빌드 필요)
cd stats && pnpm run build && npx --yes serve out -p 3000 -s &
npx playwright test
```
