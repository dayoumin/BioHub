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
- [ ] `pnpm-workspace.yaml` 생성
- [ ] `packages/types/` — 공유 타입 (ProjectEntityKind 등)
- [ ] `packages/db/` — D1 스키마 (Drizzle ORM)
- [ ] `workers/` — Cloudflare Workers API
- [ ] `genetics/` — Next.js 앱 초기화

### 서열 입력 UI
- [ ] textarea (FASTA 붙여넣기) + 파일 업로드 (.fasta, .fa, .txt)
- [ ] 실시간 유효성 검사 (길이, 문자, N 비율)
- [ ] FASTA 형식 자동 보정
- [ ] 마커 선택 드롭다운 (COI 기본)

### NCBI BLAST API 연동
- [ ] Workers 프록시 (`/api/ncbi-blast`)
- [ ] 초당 스로틀 (10초 간격)
- [ ] 비동기 워크플로우 (제출 → RID → 폴링 → 결과)
- [ ] 사용자별 NCBI API 키 입력 (설정) — 웹 rate limit 분산

### D1 캐시
- [ ] 스키마 (md5(sequence) 키, 14일 TTL) — blast_cache 테이블
- [ ] 캐시 히트 시 즉시 반환 + "캐시됨" 뱃지
- [ ] "최신 결과로 다시 분석" 버튼

### Decision Engine
- [ ] 4단계 결과 분류 (고신뢰/모호/저신뢰/실패)
- [ ] 색상 카드 UI (녹/노/주/빨)
- [ ] Top hits 테이블 (종명, 유사도%, accession)

### 대기 상태 UX
- [ ] 프로그레스 바 (제출 → 처리 중 → 완료)
- [ ] 스로틀 카운트다운

### 결과 저장
- [ ] blast_results 테이블 (D1, 사용자별 영구 기록)
- [ ] 프로젝트 연결 (project_entity_refs)
- [ ] "다음 행동" 버튼 (보고서 생성, 마커 추천, 종 상세정보)

## Phase 2

- [ ] 분류군 감지 → 맞춤 안내 카드
  - [ ] Thunnus (참치): D-loop 권장
  - [ ] Amphibia (양서류): 16S 병행 권장
  - [ ] Bivalvia (이매패류): 핵 마커 필수
  - [ ] Salmonidae (연어과): D-loop + microsatellite
  - [ ] 가공 시료: 미니바코드 안내
  - [ ] 저유사도: 서열 품질 체크 안내
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

## 구현 중 발견/기록 사항

### NCBI BLAST API
- JSON2 포맷 요청 시 ZIP으로 응답하는 경우 있음 → **Tabular(TSV) 포맷으로 전환**
- Tabular 응답에는 종명이 없음 (accession만) → E-utilities `efetch`로 종명 조회 필요 (Phase 2)
- dev 환경: Next.js(3000) → wrangler(8787) 프록시 연결 필요 (next.config.ts rewrites)
- dev 환경: Origin 검증에서 localhost 포트 차이 허용 필요

### 아키텍처
- `@biohub/types` 워크스페이스 패키지 사용 시 `transpilePackages` 설정 필수
- `stats/pnpm-lock.yaml`, `package-lock.json` 등 중복 lockfile 제거 필요
- genetics/ 독립 앱은 참고용 (정본은 stats/ 안)
- 보안 체크리스트: [docs/SECURITY-CHECKLIST.md](../docs/SECURITY-CHECKLIST.md)

### Phase 2 필요 작업
- accession → 종명 매핑 (NCBI E-utilities efetch)
- D1 캐시 연동 (wrangler.toml에 D1 바인딩)
- 사용자별 NCBI API 키 입력 UI

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
