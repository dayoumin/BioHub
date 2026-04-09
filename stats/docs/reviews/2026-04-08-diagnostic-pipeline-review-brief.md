# Diagnostic Pipeline Phase A~D 리뷰 요청

## 개요

Hub 채팅에서 CSV 데이터 + 분석 요청 시 기초통계/정규성/등분산 진단을 자동 실행하고,
구조화된 진단 카드를 보여준 뒤 최적 분석 방법을 추천하며,
SmartFlow 4단계(Step 1→3→4)로 연결하는 기능.

## 커밋 범위

```
9e71a1a7 fix(hub): LLM 실패 시 DiagnosticReportCard 액션 버튼 숨김
838f7830 fix(diagnostic): 서브에이전트 리뷰 8건 반영
0857f82b feat(analysis): Phase D — SmartFlow 연동
18f29249 test(diagnostic): 순수 함수 26개 테스트 + 한국어 조사 매칭
f8d4f3ef fix(diagnostic): 부분 탐지 완료 처리 + resume 병합
9ce2689e refactor(stats): 기술 부채 TD-3/6/7 정리
ff2e0401 feat(hub): Phase C — Hub 채팅 통합 + 진단 카드 UI
a80e1dca feat(analysis): Phase B — 서비스 + 프롬프트 + 마크다운 빌더
1b783fc1 feat(analysis): Phase A — 타입 + 스토어 기반 + 설계 문서
```

**23 files changed, +2946 / -127 lines**

## 아키텍처

```
사용자: [CSV 업로드] + "사료별 생산량 비교해줘"
  │
  ▼
ChatCentricHub.tsx ─── resume 감지 (intentRouter 호출 전 deterministic)
  │
  ▼
hub-chat-service.ts ─── getHubDiagnosticResponse()
  │
  ▼
diagnostic-pipeline.ts ─── runDiagnosticPipeline()
  ├─ 1. extractBasicStats(validationResults)
  ├─ 2. detectVariables(LLM 1차) ║ Pyodide pre-warm (병렬)
  ├─ 3. runDiagnosticAssumptions(Worker 3 or 1)
  └─ 4. DiagnosticReport 조합
  │
  ▼
hub-chat-service.ts ─── callRecommenderWithDiagnosticContext() (LLM 2차)
  │
  ▼
ChatThread.tsx ─── DiagnosticReportCard + 추천 카드 렌더링
  │
  ▼ (사용자 "분석 시작하기" 클릭)
store-orchestration.ts ─── bridgeDiagnosticToSmartFlow()
  ├─ snapshot → resetSession → restore (데이터/메서드/변수/설정)
  └─ stepTrack = 'diagnostic'
  │
  ▼
AnalysisSteps.tsx ─── Step 1(확인) → skipStep2 → Step 3(변수 프리필) → Step 4(실행)
```

## 변경 파일 목록 (역할별)

### 타입 + 스토어 (Phase A)
| 파일 | 변경 |
|------|------|
| `types/analysis.ts` | `DiagnosticAssumptions` + `DiagnosticReport` 타입 추가 |
| `lib/stores/mode-store.ts` | `StepTrack`에 `'diagnostic'` 추가 |
| `lib/stores/analysis-store.ts` | `diagnosticReport` 필드 + setter (persist 제외) |
| `lib/stores/hub-chat-store.ts` | `HubChatMessage.diagnosticReport` + `streamingStatus` |

### 서비스 레이어 (Phase B)
| 파일 | 변경 |
|------|------|
| `lib/services/diagnostic-pipeline.ts` | **신규 621줄** — 파이프라인 오케스트레이터 |
| `lib/services/ai/prompts.ts` | `getSystemPromptVariableDetector()` 추가 |
| `lib/services/ai/data-context-builder.ts` | `buildDiagnosticReportMarkdown()` 추가 |
| `lib/services/hub-chat-service.ts` | `getHubDiagnosticResponse()` + `getHubDiagnosticResumeResponse()` + 헬퍼 추출 |

### UI 통합 (Phase C)
| 파일 | 변경 |
|------|------|
| `components/analysis/ChatCentricHub.tsx` | resume 감지 + diagnostic 분기 + bridge 핸들러 |
| `components/analysis/hub/ChatThread.tsx` | `DiagnosticReportCard` + pendingClarification UI + streamingStatus |

### SmartFlow 연동 (Phase D)
| 파일 | 변경 |
|------|------|
| `lib/stores/store-orchestration.ts` | `bridgeDiagnosticToSmartFlow()` — snapshot→reset→restore 패턴 |
| `hooks/use-analysis-handlers.ts` | `skipStep2` 통합 (quick + diagnostic) |
| `components/analysis/AnalysisSteps.tsx` | Step 2 조건부 + Step 3 onBack + diagnostic 배너 |
| `components/analysis/steps/AnalysisExecutionStep.tsx` | 기존 assumptionResults 재사용 |

### 리팩토링 (기술 부채 정리)
| 파일 | 변경 |
|------|------|
| `lib/constants/statistical-constants.ts` | **신규** — `MIN_GROUP_SIZE` + `resolveGroupVariable()` 추출 |
| `lib/services/pyodide/worker-result-types.ts` | **신규** — Worker 응답 타입 3파일→1파일 통합 |
| `lib/services/assumption-testing-service.ts` | 공유 타입/상수로 전환 |
| `lib/services/normality-enrichment-service.ts` | 공유 타입으로 전환 |
| `hooks/use-levene-test.ts` | 공유 상수로 전환 |

### 테스트
| 파일 | 테스트 수 |
|------|----------|
| `__tests__/services/diagnostic-pipeline.test.ts` | **27개** (신규) |
| `__tests__/services/data-context-builder.test.ts` | **7개** 추가 (기존 27 + 7 = 34) |

## 핵심 설계 결정

1. **Worker 직접 매핑**: 기존 `runAssumptionTests()`를 수정하지 않고, 같은 Worker를 호출하되 `DiagnosticAssumptions`로 직접 매핑 (3+그룹 개별 보존)
2. **resume 감지**: intentRouter 호출 전 deterministic 판단 (pendingClarification + uploadNonce)
3. **snapshot→reset→restore**: `startFreshAnalysisSession()`이 모든 상태를 지우므로, 먼저 캡처 후 복원
4. **부분 탐지**: LLM이 factor만 감지하고 dependent를 못 찾으면 추가 질문 (완료로 처리하지 않음)
5. **병합 로직**: resume 시 기존 부분 탐지 + 새 답변을 `mergeVariableAssignments()`로 병합
6. **한국어 매칭**: 조사(을/를/로/별/이/가 등) 허용하는 regex 패턴

## 이미 수행된 리뷰

- `/simplify` 3회 (Phase A, B, C 각각) — 디자인 토큰, copy-paste 제거, 헬퍼 추출
- 외부 AI 리뷰 1회 — 부분 탐지 완료 처리, resume 병합, 넓은 스키마 매칭 (3건 수정)
- 서브에이전트 5-way 리뷰 1회 — 8건 수정 (가정 재사용, 에러 복원, 테스트 보강 등)
- 최종 통합/회귀 리뷰 — 기존 5개 경로 회귀 없음 확인

## 리뷰 포인트 제안

1. **E2E 흐름**: Hub CSV 업로드 → 진단 카드 → "분석 시작" → Step 3 프리필 → Step 4 실행까지 데이터가 끊기지 않는지
2. **`bridgeDiagnosticToSmartFlow()`의 상태 복원 순서**: `setValidationResults`가 `assumptionResults`를 null로 만드는데, 이후 `setAssumptionResults`로 복원하는 순서가 안전한지
3. **`handleAlternativeSearch`의 이중 `setStepTrack`**: bridge가 `'diagnostic'` 설정 → 즉시 `'normal'`로 덮어쓰기. 동기 배치라 실해 없지만 설계 의도가 명확한지
4. **`DiagnosticReportCard` 버튼 표시 조건**: `recommendations?.length`로 LLM 실패 시 버튼 숨김. 이 조건이 적절한지
5. **`existingAssumptionResults` 재사용**: Step 4 진입 시 store에 이미 가정 검정 결과가 있으면 재실행 스킵. 변수 변경 시 무효화가 올바른지

## 설계 문서

- [Chat Diagnostic Pipeline + SmartFlow 연동 설계](../superpowers/specs/2026-04-08-chat-diagnostic-pipeline-design.md)
- [기술 부채 목록](../superpowers/specs/diagnostic-pipeline-tech-debt.md)

## 빌드/테스트

```bash
cd stats
pnpm tsc --noEmit                                    # 타입 체크
pnpm test __tests__/services/diagnostic-pipeline.test.ts  # 파이프라인 테스트 (27개)
pnpm test __tests__/services/data-context-builder.test.ts # 마크다운 빌더 테스트 (34개)
```
