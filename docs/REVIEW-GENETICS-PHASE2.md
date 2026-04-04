# Genetics Phase 2 코드 리뷰 요청

> **브랜치**: `feat/paper-package-assembly`
> **Base SHA**: `3f6b75c` → **HEAD**: `2a949526`
> **범위**: genetics 관련 커밋 8개, 파일 14개 (신규 8 + 수정 6), +1,044줄
> **검증**: `pnpm tsc --noEmit` clean, 88/88 tests pass

---

## 작업 개요

유전적 분석(`/genetics/`) 섹션에 3가지 기능 추가:

1. **MultiSequenceInput 공통 컴포넌트** — Multi-FASTA 텍스트 입력 + 파일 업로드, 서열 개수/평균 길이 실시간 표시
2. **서열 기본 통계 도구** (`/genetics/seq-stats`) — 다중 서열 → GC%, 염기 조성, 길이 분포, 디뉴클레오티드 빈도
3. **바코딩 CSV 내보내기** — 기존 ResultView에 CSV 다운로드 버튼 추가

---

## 커밋 목록

```
663b5bb2 feat(genetics): add multi-FASTA parser with tests
6e40ac33 feat(genetics): add seq-stats computation engine with tests
9c955c5c feat(genetics): add MultiSequenceInput shared component
eb7e71b6 feat(genetics): add CSV export to barcoding result view
c1c4d8c5 feat(genetics): add seq-stats history type to analysis-history
2eb094e2 feat(genetics): add seq-stats to navigation, sidebar, and landing page
07c8faaf feat(genetics): add SeqStatsResult component with charts and CSV export
2a949526 feat(genetics): add seq-stats page with content and multi-FASTA input
```

---

## 파일별 변경 요약

### 신규 파일

| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `stats/lib/genetics/multi-fasta-parser.ts` | 55 | Multi-FASTA 텍스트 → `ParsedSequence[]` 파서 |
| `stats/lib/genetics/seq-stats-engine.ts` | 175 | 순수 TS 통계 엔진 (GC%, base comp, dinuc freq, length dist) |
| `stats/components/genetics/MultiSequenceInput.tsx` | 204 | 다중 서열 입력 공통 컴포넌트 (파일 업로드 + 실시간 파싱) |
| `stats/components/genetics/SeqStatsResult.tsx` | 288 | 결과 표시 (ECharts 바차트 + 히스토그램 + 테이블 + CSV) |
| `stats/app/genetics/seq-stats/page.tsx` | 10 | dynamic import 래퍼 |
| `stats/app/genetics/seq-stats/SeqStatsContent.tsx` | 142 | 메인 상태 관리 (input→result, 히스토리 저장/복원) |
| `stats/__tests__/lib/genetics/multi-fasta-parser.test.ts` | 43 | 파서 테스트 6건 |
| `stats/__tests__/lib/genetics/seq-stats-engine.test.ts` | 69 | 엔진 테스트 7건 |

### 수정 파일

| 파일 | 변경 | 요약 |
|------|------|------|
| `stats/lib/genetics/analysis-history.ts` | +37 | `GeneticsToolType`에 `'seq-stats'` 추가, `SeqStatsHistoryEntry` 인터페이스, normalizer/cap/label 분기 |
| `stats/lib/utils/history-adapters.ts` | +20 | `toSeqStatsItem()` 어댑터 + switch case 추가 |
| `stats/components/genetics/GeneticsSubNav.tsx` | +2 | 서열통계 탭 링크 추가 |
| `stats/components/genetics/GeneticsHistorySidebar.tsx` | +3 | 필터 옵션 + 도트 색상 + 라우팅 경로 추가 |
| `stats/app/genetics/page.tsx` | +3/-3 | seq-stats `ready: true`, badge/input 텍스트 변경 |
| `stats/components/genetics/ResultView.tsx` | +25 | CSV 내보내기 `handleExportCsv` + 다운로드 버튼 |

---

## 아키텍처 결정

1. **순수 TS 엔진** — seq-stats는 단순 카운팅이므로 Pyodide 불필요. `computeSeqStats()` 한 함수로 즉시 결과 반환
2. **공통 컴포넌트 분리** — `MultiSequenceInput`은 향후 similarity(3개+), phylogeny(3개+) 도구에서도 재사용. `minSequences` prop으로 제약 조절
3. **히스토리 확장** — 기존 discriminated union 패턴(`GeneticsToolType` → `GeneticsHistoryEntry`)에 `'seq-stats'` 추가. 결과 데이터는 미저장 (lightweight summary만)
4. **CSV 패턴 재사용** — `BlastSearchResult.tsx`의 Blob+download 패턴을 바코딩 ResultView와 SeqStatsResult에 동일 적용

---

## 리뷰 포인트

### 핵심 확인 사항

- [ ] `multi-fasta-parser.ts` — 엣지 케이스: CRLF, 빈 헤더(`>`만), 서열 없는 헤더, 연속 헤더
- [ ] `seq-stats-engine.ts` — 통계 정확성: median, stdDev(sample), Sturges binning, dinucleotide counting
- [ ] `analysis-history.ts` — `SeqStatsHistoryEntry` normalizer가 기존 3개 타입과 일관적인지
- [ ] `history-adapters.ts` — switch exhaustiveness (4개 case, default 없음 → TS가 보장하는지)
- [ ] `MultiSequenceInput.tsx` — debounce race condition: `displayParsed`가 stale parsed와 어긋나는 경우
- [ ] `SeqStatsResult.tsx` — ECharts lazy loading: cleanup 타이밍, unmount 시 메모리 누수
- [ ] `SeqStatsContent.tsx` — 히스토리 복원 시 결과 데이터 미저장 → UX 임팩트 (재입력 필요)
- [ ] `ResultView.tsx` — CSV 컬럼이 테이블 표시 컬럼과 일치하는지

### 코딩 표준 확인

- [ ] `any` 사용 없음
- [ ] 모든 함수에 명시적 반환 타입
- [ ] `useCallback` 모든 이벤트 핸들러에 적용
- [ ] Python Worker I/O camelCase 규칙 해당 없음 (순수 TS)

### 프로젝트 규칙 확인

- [ ] `entityKindForType` — `'seq-stats'` → `'blast-result'` 매핑 (`'analysis-result'` 미존재)
- [ ] `MAX_PER_TYPE['seq-stats']` = 15 (적정한지)
- [ ] 랜딩 페이지에서 seq-stats가 Ready 카드로 표시되는지

---

## 실행 명령어

```bash
# 타입 체크
cd stats && pnpm tsc --noEmit

# genetics 테스트만
cd stats && pnpm test __tests__/lib/genetics/

# 전체 테스트
cd stats && pnpm test

# diff 확인
git diff 3f6b75c..2a949526 -- stats/lib/genetics/ stats/components/genetics/ stats/app/genetics/ stats/__tests__/lib/genetics/ stats/lib/utils/history-adapters.ts
```

---

## 관련 문서

- 계획: `docs/PLAN-GENETICS-IMPROVEMENT.md` (전체 로드맵)
- 구현 계획: `docs/superpowers/plans/2026-04-04-genetics-phase2.md` (이번 세션 상세)
- 기존 참조: `stats/components/genetics/SequenceInput.tsx` (단일 서열 입력 — UI 패턴 원본)
- 기존 참조: `stats/components/genetics/BlastSearchResult.tsx:51-65` (CSV 내보내기 패턴 원본)
