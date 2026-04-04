# BOLD ID Engine — 외부 리뷰 요청

## 개요

BOLD Systems v5 ID Engine 연동 구현. DNA 바코드 서열 → 종 동정 + BIN 매핑.
기존 NCBI BLAST 바코딩 파이프라인과 동일 패턴(submit → poll → results)으로 구축.

**검증**: `tsc --noEmit` clean, 114 genetics tests pass (기존 94 + BOLD 20).

---

## 아키텍처

```
[사용자] → SequenceInput (서열 + DB + 검색모드)
  → BoldIdContent (상태 머신: input → analyzing → result)
    → BoldRunner → useBoldExecution (submit → poll → fetch)
      → Worker /api/bold/* (프록시)
        → BOLD v5 API (id.boldsystems.org)
    → BoldResultView (분류 배너 + 히트 테이블 + CSV)
    → saveGeneticsHistory('bold') → localStorage + D1 sync
```

---

## 신규 파일 (13개)

### 타입
| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `packages/types/src/bold.ts` | BoldDatabase, BoldHit, BoldClassification, BoldIdResult | ~130 |

### Worker (백엔드 프록시)
| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `src/handlers/bold.ts` | POST submit, GET status/results/classify — BOLD v5 JSONL→JSON 변환 | ~180 |

### 프론트엔드 유틸
| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `stats/lib/genetics/abortable-sleep.ts` | 공유 abort-aware sleep + AnalysisPhase 타입 (BLAST/BOLD 공용) | ~27 |
| `stats/lib/genetics/bold-utils.ts` | 상수, BoldError, parseBoldHits, parseBoldClassification | ~100 |
| `stats/hooks/use-bold-execution.ts` | 비동기 폴링 훅 (submit→poll→results+classify 병렬 fetch) | ~315 |

### 컴포넌트
| 파일 | 역할 | 줄 수 |
|------|------|-------|
| `stats/components/genetics/BoldRunner.tsx` | 진행 UI 래퍼 (BlastProgressUI 재사용) | ~60 |
| `stats/components/genetics/BoldResultView.tsx` | 결과 — 분류 배너 + 히트 테이블(정렬) + CSV 내보내기 | ~260 |
| `stats/app/genetics/bold-id/page.tsx` | Next.js dynamic import wrapper | ~10 |
| `stats/app/genetics/bold-id/BoldIdContent.tsx` | 페이지 상태 머신 — input/analyzing/result/error | ~200 |

### 테스트
| 파일 | 테스트 수 |
|------|-----------|
| `stats/__tests__/lib/genetics/bold-utils.test.ts` | 11 (파싱 + 에러) |
| `stats/__tests__/lib/genetics/bold-history-integration.test.ts` | 9 (저장/로드/필터/entityKind/어댑터) |

---

## 수정된 파일 (13개)

| 파일 | 변경 |
|------|------|
| `packages/types/src/index.ts` | BOLD 타입 re-export |
| `packages/types/src/project.ts` | `'bold-result'` EntityKind 추가 |
| `src/worker.ts` | `/api/bold/*` 라우트 등록 |
| `stats/lib/genetics/analysis-history.ts` | `'bold'` 타입 + `BoldHistoryEntry` + normalizeEntry + entityKind |
| `stats/lib/genetics/blast-utils.ts` | `blastSleep` → 공유 `abortableSleep` 위임, `BlastPhase` → `AnalysisPhase` |
| `stats/lib/research/entity-resolver.ts` | `'bold-result'` generic-only 등록 |
| `stats/lib/utils/history-adapters.ts` | `toBoldItem` 어댑터 + switch case |
| `stats/components/genetics/BlastProgressUI.tsx` | `BlastPhase` → `AnalysisPhase` (공유 타입) |
| `stats/components/genetics/GeneticsHistorySidebar.tsx` | BOLD 필터 + 색상 + 검색 + 라우트 |
| `stats/components/genetics/GeneticsSubNav.tsx` | BOLD 네비게이션 항목 |
| `stats/components/genetics/SequenceInput.tsx` | `submitLabel`, `hideMarkerSelector` optional props |
| `stats/app/genetics/page.tsx` | 랜딩 카드 + 도움말 가이드 |

---

## 리뷰 포인트

### 1. [HIGH] Worker 핸들러 — BOLD v5 API 응답 구조 불확실성
`src/handlers/bold.ts:110-117` — BOLD v5 OpenAPI 스펙이 submission 응답 스키마를 `{}` (빈 객체)로 정의. `sub_id`, `subId`, `id`, `submission_id` 여러 필드를 시도하는 방어 코드 사용. 실제 API 테스트에서 정상 동작 확인했으나, API 버전 업데이트 시 깨질 수 있음.

### 2. [HIGH] useBoldExecution과 useBlastExecution 구조 중복 (~80%)
두 훅이 submit→poll→fetch 폴링 라이프사이클을 거의 동일하게 구현. 현재는 `abortableSleep`과 `AnalysisPhase`만 공유. 제네릭 `useApiExecution<TPayload, TResult>` 훅으로 통합 가능하나, 기존 BLAST 코드 안정성 고려하여 별도 리팩토링으로 보류.

### 3. [MEDIUM] Worker `ALLOWED_DBS` Set과 types `BoldDatabase` 중복
Worker 환경에서 `@biohub/types`를 import하지 않는 프로젝트 관행. 8개 DB 값이 두 곳에 정의됨. 값 변경 시 동기화 필요.

### 4. [MEDIUM] BoldResultView — similarity 색상 함수 light-only
`similarityColorClass`/`similarityTextClass`는 `text-green-700`, `text-yellow-700` 등 light 테마 전용. 다크모드에서 가독성 저하 가능.

### 5. [LOW] BOLD v5 rate limit 3 req/min 제한
Worker의 `BOLD_MIN_INTERVAL_MS = 21_000`으로 single isolate 스로틀 구현. 다중 isolate 환경에서는 보장 불가 — BLAST와 동일한 best-effort 패턴.

### 6. [LOW] SequenceInput hideMarkerSelector 접근
Boolean prop으로 마커 UI 숨김. BOLD 이외에 마커 불필요 도구가 추가되면 적합하지만, 현재 BOLD만 사용. 과도하지 않으나 마커 관련 state(`marker`, `onMarkerChange`)는 여전히 전달 필요 (noop).

---

## /simplify 수정 이력

| # | 문제 | 수정 |
|---|---|---|
| 1 | `boldSleep` = `blastSleep` 완전 복제 | 공유 `abortableSleep` 추출 |
| 2 | `BlastPhase`/`BoldPhase` 동일 | `AnalysisPhase` 공유 타입 |
| 3 | 사이드바 라우트 `/genetics/bold` (404) | `/genetics/bold-id`로 수정 |
| 4 | `BoldHistoryEntry.db` = `string` | `BoldDatabase` 타입으로 |
| 5 | BoldResultView 다크모드 누락 | 시맨틱 토큰 (`bg-card`, `text-muted-foreground` 등) |
| 6 | 불필요 WHAT 주석 3건 | 삭제 |
| 7 | `onCancel` 불필요 래퍼 | 직접 ref 전달 |
| 8 | `BoldIdResult.subId` 미사용 | 필드 제거 |
