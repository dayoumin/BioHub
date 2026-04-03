# 유전적 분석 페이지 개선 계획

> **작성일**: 2026-04-03  
> **대상**: `/genetics/` 섹션 전체 (6개 도구)

---

## 현황 요약

| 도구 | 경로 | 상태 | 비고 |
|------|------|------|------|
| DNA 바코딩 종 판별 | `/genetics/barcoding` | 사용 가능 | CSV 내보내기 없음 |
| BLAST 서열 검색 | `/genetics/blast` | 사용 가능 | CSV 내보내기 있음 |
| GenBank 서열 검색 | `/genetics/genbank` | 사용 가능 | FASTA 다운로드 있음 |
| 서열 기본 통계 | `/genetics/seq-stats` | 미구현 | |
| 다종 유사도 행렬 | `/genetics/similarity` | 미구현 | |
| 계통수 시각화 | `/genetics/phylogeny` | 미구현 | |

---

## Phase 0: 기존 코드 버그 수정

### 0-1. Query Coverage 계산 오류 — S

- **파일**: `stats/lib/genetics/decision-engine.ts:72`
- **문제**: `(queryEnd - queryStart + 1) / alignLength` — 정렬 길이로 나누면 의미 없는 값. 주석에도 "query coverage 아님 — payload에 query length 없음"이라고 명시되어 있음
- **수정**: 필드명을 `alignCoverage`로 변경하고 툴팁("Align%")도 정확하게 반영. 또는 BLAST payload에서 query length를 전달받아 실제 query coverage 계산

### 0-2. localStorage 저장 실패 시 무응답 — S

- **파일**: `stats/lib/genetics/analysis-history.ts:358-361`
- **문제**: quota 초과 시 `console.warn`만 출력, 사용자에게 알리지 않음 → 저장된 줄 알지만 실제로는 미저장
- **수정**: 저장 실패 여부를 반환값으로 전달 → 호출부에서 toast 경고 표시

### 0-3. 서열 길이 상한 누락 — S

- **파일**: `stats/lib/genetics/validate-sequence.ts:61`
- **문제**: `MIN_SEQUENCE_LENGTH` 하한만 존재, 상한 없음 → 10MB+ 서열 입력 시 브라우저 과부하 가능
- **수정**: `MAX_SEQUENCE_LENGTH` (100,000 bp) 상수 추가, 초과 시 에러 메시지

### 0-4. 빈 종명 처리 누락 — S

- **파일**: `stats/components/genetics/ResultView.tsx:85-101`
- **문제**: `hit.species`가 빈 문자열일 때 테이블 셀이 공백으로 표시됨
- **수정**: `hit.species || '(미확인)'` 폴백 추가

---

## Phase A: 미구현 3개 도구 구현

### 공통: MultiSequenceInput 컴포넌트 — M

A1/A2/A3 모두 다중 서열 입력이 필요하므로 공통 컴포넌트를 먼저 만든다.

- **생성**: `stats/components/genetics/MultiSequenceInput.tsx`
- **기능**: Multi-FASTA 텍스트 입력 + 파일 업로드(.fasta, .fa, .txt) + 서열 개수·평균 길이 실시간 표시
- **검증**: 서열 파싱, 유효성 검사, 최소 서열 수 제약 (도구별 상이)

### A1. 서열 기본 통계 (`/genetics/seq-stats`) — M

**기능**: 다중 서열 → GC%, 염기 조성, 길이 분포, 디뉴클레오티드 빈도

- **계산 방식**: 순수 TypeScript (단순 카운팅, Pyodide 불필요 → 즉시 결과)
- **차트**: ECharts — 염기 조성 바차트, 길이 분포 히스토그램
- **내보내기**: CSV (통계 요약 테이블)

**생성 파일:**

| 파일 | 역할 |
|------|------|
| `stats/app/genetics/seq-stats/page.tsx` | 페이지 래퍼 (dynamic import) |
| `stats/app/genetics/seq-stats/SeqStatsContent.tsx` | 메인 상태 관리 |
| `stats/components/genetics/SeqStatsResult.tsx` | 결과 표시 (차트 + 테이블) |
| `stats/lib/genetics/seq-stats-engine.ts` | 순수 TS 계산 엔진 |

**수정 파일:**

| 파일 | 변경 내용 |
|------|-----------|
| `stats/app/genetics/page.tsx` | seq-stats 도구 `ready: true` |
| `stats/lib/genetics/analysis-history.ts` | `GeneticsToolType`에 `'seq-stats'` 추가, `SeqStatsHistoryEntry` 타입 |
| `stats/components/genetics/GeneticsSubNav.tsx` | 탭 링크 추가 |
| `stats/components/genetics/GeneticsHistorySidebar.tsx` | 필터 옵션 추가 |

### A2. 다종 유사도 행렬 (`/genetics/similarity`) — L

**기능**: 정렬된 multi-FASTA → K2P 거리 행렬 + UPGMA 클러스터링

- **계산 방식**: Pyodide Worker 9 (`scipy.spatial.distance`, `scipy.cluster.hierarchy`)
- **시각화**: ECharts 히트맵 (거리 행렬) + 덴드로그램
- **내보내기**: CSV (거리 행렬)
- **거리 모델**: K2P (기본), p-distance, Jukes-Cantor 선택 가능

**생성 파일:**

| 파일 | 역할 |
|------|------|
| `stats/app/genetics/similarity/page.tsx` | 페이지 래퍼 |
| `stats/app/genetics/similarity/SimilarityContent.tsx` | 메인 상태 관리 |
| `stats/components/genetics/SimilarityResult.tsx` | 히트맵 + 덴드로그램 + CSV |
| `stats/components/genetics/DistanceMatrixHeatmap.tsx` | ECharts 히트맵 래퍼 |

**수정 파일:**

| 파일 | 변경 내용 |
|------|-----------|
| `stats/public/workers/python/worker9-genetics.py` | `seq_similarity(sequences, labels, model)` 함수 추가 |
| `stats/lib/services/pyodide/core/pyodide-worker.enum.ts` | Worker 9 패키지에 `scipy` 추가 |
| `stats/app/genetics/page.tsx` | `ready: true` |
| `stats/lib/genetics/analysis-history.ts` | `SimilarityHistoryEntry` 타입 |
| `stats/components/genetics/GeneticsSubNav.tsx` | 탭 추가 |
| `stats/components/genetics/GeneticsHistorySidebar.tsx` | 필터 추가 |

### A3. 계통수 시각화 (`/genetics/phylogeny`) — L

**기능**: multi-FASTA → NJ/UPGMA 계통수 → Newick 출력 → 트리 시각화

- **계산 방식**: Pyodide Worker 9 — NJ(Saitou-Nei 1987) 직접 구현 (BioPython 미지원), UPGMA는 scipy
- **트리 렌더링**: ECharts tree series (radial/orthogonal 레이아웃, 줌/팬)
- **내보내기**: Newick 문자열 다운로드
- **입력 옵션**: multi-FASTA 직접 입력 또는 similarity 도구의 거리 행렬 전달

**생성 파일:**

| 파일 | 역할 |
|------|------|
| `stats/app/genetics/phylogeny/page.tsx` | 페이지 래퍼 |
| `stats/app/genetics/phylogeny/PhylogenyContent.tsx` | 메인 상태 관리 |
| `stats/components/genetics/PhylogenyResult.tsx` | 트리 + Newick 내보내기 |
| `stats/components/genetics/PhylogenyTree.tsx` | ECharts tree 래퍼 |
| `stats/lib/genetics/newick-parser.ts` | Newick ↔ ECharts 데이터 변환 |

**수정 파일:** Worker 9, page.tsx, history, subnav, sidebar (A2와 동일 패턴)

---

## Phase B: UX 개선

### B1. 바코딩 CSV 내보내기 — S

- **파일**: `stats/components/genetics/ResultView.tsx`
- **변경**: CSV 다운로드 버튼 추가 (Top hits 테이블: 종명, identity%, e-value, accession)
- **참조**: `BlastSearchResult.tsx:51-65`의 기존 CSV 생성 패턴

### B2. 도구 간 서열 전달 — M

현재 GenBank에서 Barcoding/BLAST로 `<Link>` 연결만 있고, 서열 데이터가 자동 전달되지 않음.

- **생성**: `stats/lib/genetics/sequence-transfer.ts` — sessionStorage 기반 서열 전달 유틸
  - `storeSequenceForTransfer(sequence, source)` — 저장
  - `consumeTransferredSequence()` — 읽고 삭제 (1회성)
- **수정 파일:**
  - `GenBankContent.tsx` — "종 판별하기" / "BLAST로 검색" 버튼에 서열 저장 후 라우팅
  - `BarcodingContent.tsx` — mount 시 전달된 서열 확인·적용
  - `BlastSearchContent.tsx` — mount 시 전달된 서열 확인·적용
  - `ResultView.tsx` — "BLAST로 재검색" 버튼 추가 (바코딩 서열 → BLAST 전달)

### B3. 히스토리 텍스트 검색 — S

- **파일**: `stats/components/genetics/GeneticsHistorySidebar.tsx`
- **변경**: 검색 입력 필드 추가 → 종명, accession, 샘플명, 쿼리 텍스트로 히스토리 필터링
- **구현**: 기존 type 필터 위에 검색 입력 배치, 필터된 항목 목록에 추가 string match 적용

---

## 구현 순서

```
단계 1 ─ Phase 0: 버그 수정 4건 (S×4)
  └─ 0-1 Query Coverage → 0-2 localStorage → 0-3 서열 상한 → 0-4 빈 종명

단계 2 ─ MultiSequenceInput + A1 (seq-stats) + B1 (CSV 내보내기)
  └─ 공통 컴포넌트 먼저 → seq-stats 도구 → 바코딩 CSV

단계 3 ─ A2 (similarity) + B2 (서열 전달)
  └─ Worker 9 확장 + 히트맵 → 도구 간 연결

단계 4 ─ A3 (phylogeny) + B3 (히스토리 검색)
  └─ NJ 구현 + 트리 렌더링 → 사이드바 검색
```

---

## 의존성 요약

| 항목 | 신규 라이브러리 | Pyodide 변경 | 복잡도 |
|------|----------------|-------------|--------|
| Phase 0 버그 수정 | 없음 | 없음 | S×4 |
| MultiSequenceInput | 없음 | 없음 | M |
| A1 seq-stats | 없음 | 없음 (순수 TS) | M |
| A2 similarity | 없음 | Worker 9 + scipy | L |
| A3 phylogeny | 없음 | Worker 9 + NJ 구현 | L |
| B1 CSV 내보내기 | 없음 | 없음 | S |
| B2 서열 전달 | 없음 | 없음 | M |
| B3 히스토리 검색 | 없음 | 없음 | S |

> 모든 항목에서 신규 JS 라이브러리 추가 없음. ECharts(차트), scipy(Pyodide) 등 기존 의존성만 활용.

---

## 검증 체크리스트

- [ ] `pnpm tsc --noEmit` 통과
- [ ] `pnpm test` 통과
- [ ] Phase 0: 각 버그 재현 후 수정 확인
- [ ] A1: 다중 서열 입력 → GC%/염기 조성/길이 분포 차트 → CSV 내보내기 → 히스토리 저장/복원
- [ ] A2: 정렬된 FASTA → 거리 행렬 히트맵 + 덴드로그램 → CSV 내보내기
- [ ] A3: FASTA → NJ/UPGMA 트리 시각화 → Newick 내보내기
- [ ] B1: 바코딩 결과에서 CSV 다운로드
- [ ] B2: GenBank → BLAST/Barcoding 서열 자동 입력 확인
- [ ] B3: 히스토리 사이드바에서 종명 검색 → 필터 동작
- [ ] 랜딩 페이지: 6개 도구 모두 "사용 가능" 표시
