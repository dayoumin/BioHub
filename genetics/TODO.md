# Genetics — 유전적 종 판별 TODO

**레퍼런스**: [docs/genetic-identification/](../docs/genetic-identification/)
**설계/UX**: [REFERENCE-E0-BARCODING-SERVICE.md](../docs/genetic-identification/REFERENCE-E0-BARCODING-SERVICE.md)
**구현 계획**: [PLAN-MODULE-E-NCBI-GENETICS.md](../docs/PLAN-MODULE-E-NCBI-GENETICS.md)
**프로젝트 시스템**: [PLAN-PROJECT-SYSTEM.md](../docs/PLAN-PROJECT-SYSTEM.md)
**정본 코드**: `stats/` 앱 내 (`stats/app/genetics/`, `stats/components/genetics/`, `stats/lib/genetics/`)
**genetics/src/**: 독립 앱 테스트용 복사본 (stats가 정본, 여기는 참고용)

---

## MVP (Phase 1)

### 모노레포 초기 설정
- [x] `pnpm-workspace.yaml` 생성
- [x] `packages/types/` — 공유 타입 (BlastMarker, BlastResultStatus 등)
- [ ] `packages/db/` — D1 스키마 (Drizzle ORM)
- [x] Workers API — `src/worker.ts` (BLAST 프록시)
- [x] `genetics/` — 독립 앱 초기화 (stats 내 정본 코드 + genetics/src 참고용)

### 서열 입력 UI
- [x] textarea (FASTA 붙여넣기) + 파일 업로드 (.fasta, .fa, .txt, 1MB 제한)
- [x] 실시간 유효성 검사 (길이, 문자, N 비율, 300ms 디바운스)
- [x] FASTA 형식 자동 보정 (cleanSequence)
- [x] 마커 선택 버튼 (COI 기본, 6개 마커 + 도움말)
- [x] 예제 서열 (대구 COI, 황다랑어 COI, 효모 ITS)

### NCBI BLAST API 연동
- [x] Workers 프록시 (`/api/blast/submit`, `/status/:rid`, `/result/:rid`)
- [x] 초당 스로틀 (10초 간격, per-isolate)
- [x] 비동기 워크플로우 (제출 → RID → 폴링 → Tabular 결과 파싱)
- [ ] 사용자별 NCBI API 키 입력 (설정 UI) — 웹 rate limit 분산

### D1 캐시
- [x] 스키마 (SHA-256(sequence) 키, 14일 TTL) — blast_cache 테이블
- [x] 캐시 히트 시 NCBI 호출 스킵 (UX는 동일 흐름 유지)
- [ ] "최신 결과로 다시 분석" 버튼 (캐시 우회)

### Decision Engine
- [x] 4단계 결과 분류 (고신뢰/모호/저신뢰/실패/매칭없음)
- [x] 색상 카드 UI (녹/노/주/빨)
- [x] Top hits 테이블 (accession, 유사도%, Coverage, E-value)
- [x] 분류군 감지 + 맞춤 안내 (Thunnus, Salmonidae, Amphibia, Bivalvia)
- [x] 추천 마커 칩 (클릭 시 같은 서열로 재분석)

### 대기 상태 UX
- [x] 3단계 프로그레스 바 (제출 → 처리 중 → 완료)
- [x] 경과 시간 표시 + 예상 시간 카운트다운
- [x] 취소 버튼 (AbortController)

### 결과 저장
- [x] localStorage 히스토리 (최근 10건, analysis-history.ts)
- [ ] blast_results 테이블 (D1, 사용자별 영구 기록)
- [ ] 프로젝트 연결 (project_entity_refs)
- [x] "다음 행동" 버튼 (GenBank 링크 활성, 나머지 준비 중)

### 메인 페이지 UX
- [x] 도구 카드 (활성/준비중 분리, 아이콘)
- [x] 예제 서열 카드 (?example= 쿼리 파라미터)
- [x] 최근 분석 히스토리 (시간/상태 표시, 삭제)
- [x] 도움말 (상황별 도구 선택 + 분석 순서)

## Phase 2

- [x] 분류군 감지 → 맞춤 안내 카드 (기본 구현, 종명 매핑 후 개선 필요)
  - [x] Thunnus (참치): D-loop 권장
  - [x] Amphibia (양서류): 16S 병행 권장
  - [x] Bivalvia (이매패류): 핵 마커 필수
  - [x] Salmonidae (연어과): D-loop + microsatellite
  - [ ] 가공 시료: 미니바코드 안내
  - [ ] 저유사도: 서열 품질 체크 안내
- [x] accession → 종명 매핑 (NCBI E-utilities esummary)
- [ ] EBI BLAST 자동 전환 (NCBI 실패 시)
- [ ] 보고서 자동 생성
  - [ ] 서열 품질 통계 (길이, GC%, N%)
  - [ ] DB 검색 결과 표
  - [ ] 종 할당 + 신뢰 수준
  - [ ] 실패 시: 원인 + 대안 + 근거
- [ ] Methods 문구 자동 생성 (논문 삽입용)

## Phase 3 (고도화)

- [ ] K2P 유전 거리 계산 (Pyodide)
- [ ] NJ 계통수 시각화
- [ ] 다중 마커 분석 지원
- [ ] OpenAlex 논문 추천 연동
- [ ] BOLD Portal API 메타데이터 조회 (BIN, voucher)
- [ ] Tauri 데스크탑: BLAST 직접 호출 (CORS 우회, rate limit 분산)

---

## 개발 로그

구현 중 발견사항 → [DEVLOG.md](DEVLOG.md)

---

## API 테스트 결과 (2026-03-22)

| API | 상태 | 비고 |
|-----|------|------|
| NCBI BLAST | ✅ 작동 확인 | RID 제출 → 30초 → 결과 수신 |
| EBI BLAST | ✅ 제출 확인 | 백업용 |
| BOLD v3 | ✅ 아직 작동 | 폐지 예정 |
| BOLD v5 ID Engine | ❌ REST API 없음 | 웹 UI만 |

## 아키텍처 결정 (2026-03-22)

| 항목 | 결정 |
|------|------|
| DB | **Cloudflare D1** (Workers 네이티브 바인딩) |
| 파일 | **R2** (FASTA, CSV, 보고서) |
| 캐시/세션 | **KV** |
| API | **Cloudflare Workers** |
| 웹 BLAST | Workers 경유 (CORS) + 사용자별 NCBI API 키 |
| 데스크탑 BLAST | Tauri에서 직접 호출 (rate limit 분산) |
| 프로젝트 공유 | D1 통해 모든 앱 접근 가능 |

## 나중에 구현

- [ ] 다크모드 지원 — 현재 `forcedTheme="light"`로 고정. 유전 페이지 포함 전체 UI 다크모드 대응 후 `enableSystem` 복원
- [ ] DNA 바코딩 — Worker 없이 로컬 개발 시 안내 UX 개선 (현재 `wrangler dev` 미실행 시 `ERR_CONNECTION_REFUSED`)
- [ ] 결과 비교 — 이전 분석 결과와 현재 결과를 나란히 비교하는 UI (히스토리에서 선택 → side-by-side 비교)
- [ ] 대안 마커 상세 모달 — 각 추천 마커 클릭 시 모달로 상세 설명 표시 (프라이머 정보, 관련 논문, 실험 팁, 성공 사례). 현재는 인라인 간단 설명만 제공
- [ ] 히스토리 공유 사이드바 — genetics layout.tsx에 히스토리 사이드바를 넣어 메인/barcoding/결과 등 전체 genetics 페이지에서 접근 가능하게
- [ ] 히스토리 결과 재열람 — 히스토리 항목 클릭 시 해당 분석 결과로 이동. DecisionResult 전체를 localStorage에 저장하여 재현 (RID는 24시간 후 만료되므로 불가)
- [ ] 히스토리 엑셀 내보내기 — 선택한 분석 기록을 xlsx로 저장 (시료명, 마커, 종명, 일치도, 날짜 등)
- [ ] My Pages 연동 — 개인 대시보드에서 분석 기록 모아보기, 프로젝트별 분류, 결과 비교 (D1 영구 저장 필요)
- [ ] 다른 DB 검색 — 같은 서열로 BOLD/EBI BLAST 자동 검색 (현재 BOLD 링크만 제공)
- [ ] 관련 논문 보기 — OpenAlex API로 종명 기반 관련 논문 추천
- [ ] 보고서 생성 — 분석 결과를 PDF/docx로 자동 생성
- [ ] 실험 프로토콜 — 대안 마커별 실험 가이드 (정적 페이지/모달)
- [ ] 신종 등록 가이드 — GenBank 서열 제출 절차 안내
- [ ] 결과 단계별 상세 안내 콘텐츠 — 각 status(high/ambiguous/low/failed/no_hit)에 맞는 구체적 가이드
  - high: 형태 교차 검증, 바우처 확인, 보고서 작성 안내
  - ambiguous: 유력 후보 판단 기준, 추가 마커/형태 비교 가이드
  - low: 속 수준 해석 방법, 추가 실험 설계
  - failed: 서열 품질 체크리스트, DB 미등록 가능성 판단
  - no_hit: 오염/역방향 서열 확인, 신종 후보 절차
