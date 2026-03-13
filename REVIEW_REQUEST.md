# Code Review Request: P0~P2 코드 리뷰 수정 (3 commits)

**커밋**: `a6080db5`, `7dc214b4`, (리뷰 후속 수정 포함)
**범위**: 14파일 (소스 12 + 신규 2), +380 / -41 lines
**근거**: 20개 커밋 머지 후 비판적 검토 → 19 Critical, 56 Warning, 41 Info 발견 → P0~P2 수정

---

## 1. 배경

`a1aa94d7..83a634bb` (20 commits, 140 files, +19,682/-7,329) 머지 후 전체 리뷰를 실시.
발견된 이슈를 P0(보안/즉시)~P3(코드품질) 4단계로 분류, P0~P2를 이번 커밋에서 수정.
전체 리뷰 결과: `stats/docs/REVIEW-MERGE-20-COMMITS.md`

---

## 2. 변경 내용

### P0 — 보안 + 즉시 수정 (3건)

| 파일 | 이슈 | 수정 |
|------|------|------|
| `plotly-chart-renderer.tsx` | XSS: title이 HTML에 이스케이프 없이 삽입 + `</script>` 시퀀스 위험 | `escapeHtml(title)` + `.replace(/<\//g, '<\\/')` |
| `deploy.yml` | 트리거 브랜치 `main`만 → 실제 `master` 사용으로 CI 미동작 | `master` 추가 |
| `CLAUDE.md` | `!` 규칙 "절대 금지" → 업계 동향에 맞게 완화 | "기본 금지 + 예외 허용" + `assertDefined()` 유틸 |

### P1 — 타입 안전성 + 버그 (6건)

| 파일 | 이슈 | 수정 |
|------|------|------|
| `StatisticsTable.tsx` | `any` 5건 — 타입 불안전 전파 진원지 | formatter/highlight → `unknown`, `numValue` 타입 가드, CI typeof 체크 |
| `rag-assistant-compact.tsx` | `(s as any).score` — 타입에 이미 존재 | `s.score` 직접 접근 |
| `AnalysisHistoryPanel.tsx` | async 에러 미처리 (handleLoad/handleReanalyze) | try/catch + `logger.error` + `toast.error` |
| `ChatCentricHub.tsx` | `handleChatSubmit` stale closure race condition | `isProcessingRef` (useRef) 추가, deps 정리 |
| `use-count-up.ts` | `window.matchMedia` 렌더 시 읽기 → hydration mismatch | useEffect로 이동 |
| `src/worker.ts` | Rate limit Map cleanup이 초과 시에만 → 메모리 누수 | 100엔트리 초과 시 선제 정리 |

### P2 — 타입 캐스팅 개선 (4건)

| 파일 | 이슈 | 수정 |
|------|------|------|
| `result-transformer.ts` | Executor 형식 판별이 수동 체크 (`results.metadata && results.mainResults`) | `isExecutorResult()` 타입 가드 추가 (Array 방어 포함) |
| `smart-flow-store.ts` | 수동 형식 체크 4곳 | `isExecutorResult()` 호출로 교체 |
| `TemplateSelector.tsx` | `e as unknown as React.MouseEvent` 캐스트 | 구조적 타입 `{ stopPropagation: () => void }` |
| `AnalysisHistoryPanel.tsx` | 동일 값 2회 캐스트 (line 275, 281) | 1변수로 통합 |

### 신규 파일 (2건)

| 파일 | 내용 |
|------|------|
| `stats/lib/utils/assert.ts` | `assertDefined<T>()`, `assert()` — `!` 대안 유틸 |
| `stats/docs/REVIEW-MERGE-20-COMMITS.md` | 전체 리뷰 결과 문서 (19C/56W/41I) |

---

## 3. 리뷰 포인트 (검토 요청)

### 3-A. 타입 안전성 결정들

1. **`TableRow`가 `Record<string, any>` 유지**: `unknown`으로 변경 시 downstream 30+파일에서 `ResultRow[]`, `FrequencyData[]` 등이 할당 불가. eslint-disable 주석으로 의도 문서화. 이 결정이 적절한가?

2. **`as unknown as` 캐스트 잔존 (smart-flow-store.ts)**: JSON 역직렬화 경계에서 `Record<string, unknown>` → `ExecutorResult` 변환 시 불가피. `isExecutorResult()` 타입 가드로 형식 검증은 추가했으나 캐스트 자체는 제거 불가. 다른 접근이 있는가?

3. **CI 배열 원소 타입 체크**: `value[0] as number` → `typeof value[0] === 'number'` 변경. 비숫자 원소가 CI 배열에 들어올 수 있는 경로가 실제로 존재하는가?

### 3-B. Race Condition 수정

4. **ChatCentricHub `isProcessingRef`**: ref + state 이중 관리. ref는 동기 가드, state는 UI 렌더링. 이 패턴이 최선인가? `useTransition` 또는 다른 React 18+ 패턴이 더 적합한가?

5. **deps에서 `isProcessing` 제거, `t.hub.intentClassificationFailed` 추가**: `t` 객체 안정성에 의존. `t`가 매 렌더 재생성되면 불필요한 callback 재생성. 확인 필요.

### 3-C. 보안

6. **`escapeHtml` + `<\/` 이스케이프**: plotly-chart-renderer의 HTML 생성에 충분한가? `chartData.data`/`layout` 내부의 사용자 입력(축 라벨, 범례 등)도 `JSON.stringify`로 들어가는데, `<\/` 외에 추가 이스케이프가 필요한가?

7. **Rate limit 100 threshold**: Cloudflare Workers는 요청당 새 실행 컨텍스트일 수 있음. `rateLimitMap`이 전역 변수라면 Worker의 메모리 모델에서 실제로 유지되는가?

### 3-D. 수정하지 않은 것 (P3, 의도적 보류)

아래는 발견했으나 리팩토링 범위가 커서 별도 작업으로 분류:

| P3 항목 | 이슈 |
|---------|------|
| ResultsActionStep.tsx (~1000줄) | 단일 컴포넌트 과대 — 분리 필요 |
| PurposeInputStep.tsx (789줄) | 동일 |
| RAG 3파일 ~60% 중복 | `useRAGChat` 훅 추출 필요 |
| app/page.tsx (527줄, 20+ callbacks) | god component 분리 |
| 하드코딩 한국어 다수 | terminology 시스템 미사용 |

---

## 4. 기존 실패 테스트 (이번 변경과 무관)

수정 전부터 실패하던 9건 (stash로 검증 완료):

| 테스트 파일 | 실패 수 | 원인 |
|-------------|---------|------|
| `StatisticsTable.test.tsx` | 2 | 버튼이 DropdownMenu로 이동 → 셀렉터 불일치 |
| `smart-flow-layout.test.tsx` | 4 | 레이아웃 UI 변경 후 테스트 미업데이트 |
| `variable-detection-service.test.tsx` | 3 | 타입 불일치 (`columnStats` vs `columns`) |

---

## 5. 검증 명령어

```bash
cd stats
pnpm tsc --noEmit          # 타입 체크 (에러 0)
pnpm test                  # 전체 테스트 (기존 9건 실패 외 전체 통과)
```

---

## 6. 관련 파일 전체 목록

```
.github/workflows/deploy.yml          # P0: master 브랜치 추가
CLAUDE.md                             # P0: ! 규칙 완화
src/worker.ts                         # P1: rate limit cleanup
stats/components/rag/rag-assistant-compact.tsx        # P1: as any 제거
stats/components/smart-flow/AnalysisHistoryPanel.tsx  # P1+P2: try/catch + 캐스트 통합
stats/components/smart-flow/ChatCentricHub.tsx        # P1: race condition
stats/components/smart-flow/TemplateSelector.tsx      # P2: 구조적 타입
stats/components/statistics/common/StatisticsTable.tsx # P1: any→unknown + CI 타입 가드
stats/components/visualizations/plotly-chart-renderer.tsx # P0: XSS
stats/hooks/use-count-up.ts                          # P1: hydration
stats/lib/stores/smart-flow-store.ts                 # P2: isExecutorResult
stats/lib/utils/assert.ts                            # 신규: assertion 유틸
stats/lib/utils/result-transformer.ts                # P2: 타입 가드 추가
stats/docs/REVIEW-MERGE-20-COMMITS.md                # 리뷰 결과 문서
```
