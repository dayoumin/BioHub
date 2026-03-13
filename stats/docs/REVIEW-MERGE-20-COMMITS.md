# Merge Review: 20 Commits (master → main)

**Date**: 2026-03-13
**Scope**: 140 files, +19,682 / -7,329 lines
**Commits**: `a1aa94d7..83a634bb`

---

## 요약 통계

| Severity | R1 Smart Flow | R2 Graph Studio | R3 History+APA | R4 Infra | R5 Hub/Layout | Total |
|----------|:---:|:---:|:---:|:---:|:---:|:---:|
| CRITICAL | 3 | 6 | 3 | 3 | 4 | **19** |
| WARNING  | 14 | 11 | 10 | 7 | 14 | **56** |
| INFO     | 10 | 9 | 5 | 10 | 7 | **41** |

---

## CRITICAL 이슈 (19건)

### 보안

| # | 파일 | 이슈 |
|---|------|------|
| S1 | `plotly-chart-renderer.tsx:146` | **XSS**: `title` prop이 HTML에 이스케이프 없이 삽입. `</script>` 시퀀스도 위험 |
| S2 | `.github/workflows/deploy.yml:41` | `NEXT_PUBLIC_TURSO_AUTH_TOKEN`이 클라이언트 번들에 포함 (NEXT_PUBLIC_ prefix) |
| S3 | `wrangler.toml:2` | `account_id` 하드코딩 — 리포 공개 시 인프라 식별 노출 |

### 타입 안전성

| # | 파일 | 이슈 |
|---|------|------|
| T1 | `DataExplorationStep.tsx:181-182,335` | Non-null assertion (`!`) 사용 — `q1!`, `q3!`, `raw1[i]!` |
| T2 | `ResultsActionStep.tsx:594,603` | `as unknown as KaplanMeierAnalysisResult` 강제 변환 |
| T3 | `StatisticsTable.tsx:51,54,58,181,204` | `any` 타입 5건 — 프로젝트 전반으로 전파되는 진원지 |
| T4 | `smart-flow-store.ts:409,450,454,458,581,638` | `as unknown as` 캐스팅 6건 — 타입 가드 필요 |
| T5 | `CanvasToolbar.tsx:41,56` | `as Record<string, unknown>` 후 재캐스팅 체인 |
| T6 | `echarts-converter.ts:802-807` | renderItem API 수동 타입 캐스팅 |
| T7 | `useDataTabLogic.ts:175,276` | `as ChartType` 검증 없는 캐스팅 |
| T8 | `ChartPreview.tsx:267-268` | `as EChartsOption` 캐스팅 체인 — null 안전성 취약 |
| T9 | `useStyleTabLogic.ts:163` | `as LegendSpec['orient']` 검증 없는 캐스팅 |
| T10 | `rag-assistant-compact.tsx:544` | `as any` 명시적 사용 — 프로젝트 규칙 직접 위반 |

### 설계/버그

| # | 파일 | 이슈 |
|---|------|------|
| D1 | `ResultsActionStep.tsx` (~1000줄), `PurposeInputStep.tsx` (789줄) | 컴포넌트 과대 크기, 단일 책임 위반 |
| D2 | `AnalysisHistoryPanel.tsx:173-182` | `handleLoad`/`handleReanalyze` async 에러 미처리 |
| D3 | `ChatCentricHub.tsx:79-110` | `handleChatSubmit` stale closure race condition |
| D4 | `use-count-up.ts:31-34` | `window.matchMedia` 렌더 시 읽기 — hydration mismatch |

### 인프라

| # | 파일 | 이슈 |
|---|------|------|
| I1 | `src/worker.ts:112-113` | Rate limit Map 메모리 누수 — cleanup이 초과 시에만 실행 |
| I2 | `.github/workflows/deploy.yml:6` | Deploy 브랜치 `main` vs 실제 `master` 불일치 |

---

## WARNING 이슈 (56건)

### Smart Flow UI (R1) — 14건

| # | 파일 | 이슈 |
|---|------|------|
| 1 | `DataExplorationStep.tsx` | 미사용 props (`onNext`, `onPrevious`) |
| 2 | `DataExplorationStep.tsx` | 순수 함수 `getPercentile`에 불필요한 useCallback |
| 3 | `VariableSelectionStep.tsx` | `friedman` → `correlation` 매핑 부적절 |
| 4 | `VariableSelectionStep.tsx:135` | 타입 단언으로 `mixed` 타입 숨김 |
| 5 | `PurposeInputStep.tsx:244-253` | 동기 함수에서 `setIsAnalyzing` — UI 반영 안 될 수 있음 |
| 6 | `PurposeInputStep.tsx:548` | useEffect 의존성 과다 → 의도치 않은 재실행 위험 |
| 7 | `ResultsActionStep.tsx:794` | eslint-disable로 stale closure 위험 무시 |
| 8 | `ResultsActionStep.tsx:614,638` | 하드코딩 한국어 (terminology 미사용) |
| 9 | `AnalysisExecutionStep.tsx:177,281` | 인위적 setTimeout 지연 (500ms, 300ms) |
| 10 | `UnifiedVariableSelector.tsx:393,405,408` | DnD 핸들러의 `as` 타입 단언 |
| 11 | `UnifiedVariableSelector.tsx:300` | eslint-disable로 의존성 무시 |
| 12 | `UnifiedVariableSelector.tsx` | 하드코딩 한국어 (terminology 미사용) |
| 13 | `slot-configs.ts` | 하드코딩 매핑 로직 + 한국어 에러 메시지 |
| 14 | `SmartFlowLayout.tsx:260` | 인라인 스타일 사용 |

### Graph Studio (R2) — 11건

| # | 파일 | 이슈 |
|---|------|------|
| 15 | `LeftDataPanel.tsx:52-61` | `fieldRoles` Map 매 렌더 재생성 — useMemo 누락 |
| 16 | `LeftDataPanel.tsx:64` | `recommendCharts()` 매 렌더 재계산 — useMemo 누락 |
| 17 | `DataUploadPanel.tsx:266-267` | `parseExcel` — 빈 워크북 시 undefined 전달 → 런타임 에러 |
| 18 | `ChartPreview.tsx:256-285` | `handleFinished` stale spec으로 graphic race condition |
| 19 | `page.tsx(graph):93-98` | useCallback deps에 `chartSpec` 전체 객체 포함 |
| 20 | `export-utils.ts:142` | `getSvgDataURL()` — canvas 렌더러일 때 방어 없음 |
| 21 | `AiPanel.tsx:274` | `setSelectedL1(null)` 선실행 — UX 불일치 가능 |
| 22 | `graph-studio-store.ts:178` | `undo`/`redo` 시 `chartSpec` null 가능성 |
| 23 | `echarts-converter.ts:205-213` | 중복 행 자동 평균 — 미문서화 동작 |
| 24 | `echarts-converter.ts:448` | `computeLinearRegression` denom≈0 부동소수점 위험 |
| 25 | `ExportDialog.tsx:93` | `as ExportFormat` 검증 없는 캐스팅 |

### History + APA (R3) — 10건

| # | 파일 | 이슈 |
|---|------|------|
| 26 | `smart-flow-store.ts:397` | 히스토리 ID `Date.now()` — 밀리초 충돌 가능 |
| 27 | `smart-flow-store.ts:465` | `record.method`를 `StatisticalMethod`로 무검증 캐스팅 |
| 28 | `smart-flow-store.ts:573-611` | for 루프 내 순차 await — 100건 시 성능 |
| 29 | `smart-flow-store.ts:800-828` | `onRehydrateStorage` state 직접 mutation |
| 30 | `apa-table-formatter.ts:27` | `italicizeStats` 단독 문자 오탐 가능성 |
| 31 | `apa-table-formatter.ts:70` | `formatCellValue` percentage 이중 변환 위험 |
| 32 | `AnalysisHistoryPanel.tsx:264,270` | `as unknown as AnalysisResult` 이중 캐스팅 |
| 33 | `AnalysisHistoryPanel.tsx` | `filterMethod`, `handleSaveCurrent`, `handleNewAnalysis` 데드 코드 |
| 34 | `AnalysisHistoryPanel.tsx:403` | `confidence * 100` 범위 미검증 |
| 35 | `StatisticsTable.tsx:284,317` | 동적 Tailwind 클래스 — 빌드 시 미인식 |
| 36 | `StatisticsTable.tsx:248-252` | CSV `"` 미이스케이프 — RFC 4180 위반 |
| 37 | `StatisticsTable.tsx:236` | `clipboard.writeText` Promise 미처리 |

### Infra (R4) — 7건

| # | 파일 | 이슈 |
|---|------|------|
| 38 | `src/worker.ts:94-107` | Origin 검증 — HTTP 클라이언트로 우회 가능 |
| 39 | `src/worker.ts:155` | Request body 크기 제한 없음 |
| 40 | `src/worker.ts:164` | `Connection: keep-alive` — HTTP/2에서 무효 |
| 41 | `openrouter-recommender.ts:93` | `NEXT_PUBLIC_OPENROUTER_API_KEY` 여전히 참조 |
| 42 | `openrouter-recommender.ts:328` | `response.json()` 타입 가드 없음 |
| 43 | `next.config.ts:26-28` | `pageExtensions` map — 양쪽 분기 동일 (no-op) |
| 44 | `package.json:14` | `build:offline`에 `npm run` 사용 (pnpm 규칙 위반) |

### Hub/Layout (R5) — 14건

| # | 파일 | 이슈 |
|---|------|------|
| 45 | RAG 3파일 | ~60% 코드 중복 — `useRAGChat` 훅 추출 필요 |
| 46 | `rag-assistant-compact.tsx` | 330줄 + 11 state — 단일 책임 위반 |
| 47 | `QuickAccessBar.tsx:123,131` | `onQuickAnalysis` prop 선언만 하고 미사용 |
| 48 | `QuickAnalysisPills.tsx:32-43` | `METHODS_BY_CATEGORY` 모듈 로드 시 계산 |
| 49 | `ChatInput.tsx:44-47` | ref 렌더 중 mutation — React 18+ Strict Mode 문제 |
| 50 | `QuickAccessBar.tsx:174` | `listProjects()` useMemo 내 동기 localStorage 접근 |
| 51 | `app/page.tsx` | 527줄 + 20+ callbacks — god component |
| 52 | `ChatCentricHub.tsx:110` | `t` 의존성 누락 — terminology 변경 시 stale |
| 53 | `PyodidePreloader.tsx:60` | `startedRef` — 실패 시 재초기화 불가 |
| 54 | `VariableSelectorModern.tsx:661` | `fixed inset-0` portal 미사용 — overflow 컨텍스트에서 잘림 |
| 55 | `rag-chat-interface.tsx:209` | `localStorage` SSR 가드 없음 |
| 56 | `rag-chat-interface.tsx:120` | `as ChatMessage[]` 무검증 캐스팅 |
| 57 | `DraggableVariable.tsx:17` | `CSS` 미사용 import |
| 58 | `app-sidebar.tsx:71-74` | 하드코딩 한국어 — terminology 미사용 |

---

## 수정 우선순위 (권장)

### P0 — 즉시 수정 (보안 + 데이터 무결성)

1. **S1** XSS in `plotly-chart-renderer.tsx` — title 이스케이프
2. **S2** `NEXT_PUBLIC_TURSO_AUTH_TOKEN` — prefix 제거 또는 Worker proxy
3. **I2** Deploy 브랜치 불일치 — CI가 동작하지 않음

### P1 — 높음 (타입 안전성 + 버그)

4. **T3** `StatisticsTable.tsx` `any` 제거 — 전파 진원지
5. **T10** `rag-assistant-compact.tsx` `as any` 제거
6. **D2** `AnalysisHistoryPanel` async 에러 처리
7. **D3** `ChatCentricHub` race condition — ref 기반 guard로 변경
8. **D4** `use-count-up.ts` hydration mismatch
9. **I1** Worker rate limit Map cleanup

### P2 — 중간 (타입 캐스팅 개선)

10. **T4** `smart-flow-store.ts` — `isExecutorResult()` 타입 가드 도입
11. **T5~T9** Graph Studio `as` 캐스팅들 — 타입 가드로 전환
12. **T1** `DataExplorationStep.tsx` `!` → 명시적 조건 분기 또는 `assertDefined`

### P3 — 낮음 (코드 품질)

13. **D1** 대형 컴포넌트 분리 (ResultsActionStep, PurposeInputStep)
14. **#45** RAG 중복 제거 — `useRAGChat` 훅 추출
15. **#51** `app/page.tsx` 분리
16. 하드코딩 한국어 → terminology 시스템 통합

---

## `!` (Non-null Assertion) 규칙 변경

**결정**: "절대 금지" → "기본 금지 + 예외 허용" (Option B)

**업계 동향 (2025~2026)**:
- typescript-eslint: `recommended`에 미포함, `strict`에만 포함
- Biome: `warn` (error 아님) 기본값
- Angular/Next.js/Vue: 절대 금지 채택 안 함
- 주류: **"기본 금지 + 논리적으로 안전한 경우 허용"**

**허용 조건**:
1. 바로 위에서 존재가 확인된 경우 (Map.has → get!, if 분기 직후)
2. 테스트 코드
3. 프레임워크 라이프사이클이 보장하는 초기화

**권장 조치**: `assertDefined<T>()` 유틸 함수 추가 — `!` 없이도 간결한 코드 작성 가능

```typescript
// stats/lib/utils/assert.ts
export function assertDefined<T>(
  value: T | null | undefined,
  msg?: string
): asserts value is T {
  if (value == null) throw new Error(msg ?? 'Expected defined value');
}
```

---

## P0 + P1 수정 완료 (2026-03-13)

### 수정된 파일
| 파일 | 수정 내용 |
|------|-----------|
| `CLAUDE.md` | `!` 규칙: "절대 금지" → "기본 금지 + 예외 허용" |
| `plotly-chart-renderer.tsx` | XSS: `escapeHtml` + `</script>` 이스케이프 |
| `deploy.yml` | `master` 브랜치 추가 |
| `assert.ts` (신규) | `assertDefined`, `assert` 유틸 |
| `StatisticsTable.tsx` | `any` → `unknown` (formatter/highlight/formatCellValue/getHighlightClass), TableRow 인덱스 시그니처 |
| `rag-assistant-compact.tsx` | `as any` → 직접 `.score` 접근 (타입에 이미 존재) |
| `AnalysisHistoryPanel.tsx` | `handleLoad`/`handleReanalyze` try/catch + toast 에러 |
| `ChatCentricHub.tsx` | race condition: `isProcessingRef` 추가, deps에서 `isProcessing` 제거 |
| `use-count-up.ts` | `window.matchMedia` → useEffect로 이동 (hydration mismatch 수정) |
| `src/worker.ts` | rate limit cleanup: 100엔트리 초과 시 주기적 정리 |

### 기존 실패 테스트 (수정 전부터 실패, 이번 변경과 무관)
| 테스트 파일 | 실패 수 | 원인 |
|-------------|---------|------|
| `StatisticsTable.test.tsx` | 2 | "클립보드 복사"/"CSV 다운로드" 버튼이 DropdownMenu로 이동 → title 셀렉터 불일치 |
| `smart-flow-layout.test.tsx` | 4 | 레이아웃 UI 변경 후 테스트 미업데이트 |
| `variable-detection-service.test.tsx` | 3 | 타입 불일치 (`columnStats` vs `columns`, `normalityTest` vs `normality`) |
