# BioHub TODO

**Last updated**: 2026-04-03 (머지 후 논문 작성 Phase 현황 반영)
**References**: [Product Strategy](docs/PRODUCT_STRATEGY.md), [Roadmap](ROADMAP.md), [Research Project Status](docs/RESEARCH_PROJECT_STATUS.md)

---

## 1. How to use this file

Short-horizon execution backlog. 완료 항목은 git history 참조.

Tags: `[paper]` `[domain]` `[ux]` `[quality]` `[infra]` `[review]` `[trust]`

---

## 2. Now

### 논문 작성 (Phase 6a)

- `[paper]` ~~Phase 1~5 완료~~ ✅ — 타입+조립엔진, 에디터, Plate WYSIWYG, DOCX/HWPX 내보내기, 영문 템플릿 15개
- `[paper]` ~~Phase 6b: Figure 오프스크린 렌더링+캐시~~ ✅
- `[paper]` ~~Phase 6d: 표/그림 자동 번호 매기기~~ ✅
- `[paper]` ~~Phase 6e: HWPX 내보내기~~ ✅
- `[paper]` **Phase 6a: 인용 관리** — citation store + MaterialPalette 문헌 탭 + APA formatter + References 자동 동기화 (진행 예정)
- `[paper]` Phase 6f: field-report 프리셋 — species-validation/legal-status resolver 선행 필요 (Blocked)
- 상세: [PLAN-DOCUMENT-ASSEMBLY.md](stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md)

---

## 3. Next

우선순위: **도메인 확장 → UX → 품질 → 인프라**

### 3-A. 도메인 확장

- `[domain]` FisheryON 기능 이전 — 문헌 통합검색 (Phase A) + 연구동향 모니터링 (Phase B) + 이메일 구독/Cron (Phase C). 상세: [PLAN-FISHERY-MIGRATION.md](docs/PLAN-FISHERY-MIGRATION.md)
- `[domain]` 외부 DB 연동 우선순위 — 레퍼런스: [docs/databases/](docs/databases/)
  - **1순위**: BOLD ID Engine (종 동정 1차 검색, CORS 미지원→프록시 필요)
  - **2순위**: GBIF (분포/출현 기록, CORS 지원→브라우저 직접 호출 가능)
  - **3순위**: UniProt ID Mapping (BLAST→단백질 기능 연결, CORS 지원)
  - **안함**: GO/KEGG/Ensembl 유전자 기능 심화 — Galaxy/Bioconductor 영역, BioHub 차별점 아님
- `[domain]` species-validation 레코드 스키마 정의
- `[domain]` legal-status 레코드 스키마 정의 (source metadata + checked date)
- `[domain]` 학명검증(species_checker) 통합 + 알림 시스템 통합 — 상세: [PLAN-SPECIES-INTEGRATION.md](docs/PLAN-SPECIES-INTEGRATION.md)

### 3-B. UX 개선

- `[ux]` ~~사이드바 BioHub 로고 홈 링크~~ ✅ + ~~문헌·동향 → 논문 작성 하위로 이동~~ ✅
- `[ux]` Stitch Axiom Slate 디자인 시스템 적용 ✅ — `stats/DESIGN.md` 기반, Surface Hierarchy + No-Line Rule
- `[ux]` 문헌·동향을 논문 작성 페이지 내 서브탭으로 통합 (사이드바 제거 완료, 페이지 통합 대기)
- `[ux]` Command Palette (Cmd+K) — 43개 분석 메서드 + 16개 Bio 도구 + Graph Studio 빠른 접근
- `[ux]` 키보드 단축키 — `Ctrl+Enter` 분석 실행, `Escape` 뒤로, `Ctrl+S` 저장/내보내기
- `[ux]` Bio-Tools 샘플 데이터 — "샘플로 시작" 옵션 (신규 사용자 마찰 감소)
- `[ux]` Bio-Tools 데이터 프리뷰 — 업로드 후 분석 전 5행 미리보기
- `[ux]` Bio-Tools 컬럼 Combobox — cmdk 검색 가능 select
- `[ux]` 사이드바 My Menu — 드래그 정렬 + 즐겨찾기 고정
- `[ux]` 콘텐츠 밀도 검토 — `py-8 space-y-6` vs `py-6 space-y-4`

### 3-C. 품질/기술 부채

- `[quality]` 통합 히스토리 사이드바 정리:
  - `useLocalStorageSync(key, event, loader)` 공용 훅 추출 (3곳 반복)
  - 히스토리 사이드바 한글 하드코딩 → terminology (~15건)
  - `onHistoryShowMore` 데드 prop 정리
  - pin 토글 로직 `togglePinId()` 순수 함수 추출 (3곳 반복)
- `[quality]` IndexedDB 트랜잭션 헬퍼 중복 — `txPut/txGetByIndex/txDelete`가 `citation-storage.ts` + `document-blueprint-storage.ts` + `chart-snapshot-storage.ts` 3곳에 반복 → `lib/utils/indexeddb-helpers.ts` 공유 모듈로 추출
- `[quality]` worker.ts 남은 기술부채:
  - `jsonResponse` 중복 (`worker.ts` + `handlers/literature.ts`) → 공유 모듈 추출
  - `parseInlineMarks` DOCX/HWPX 90% 중복 (P1-7) → 3번째 파서 등장 시 통합
- `[quality]` dangling ref 정리 — 수동 "정리" 버튼 또는 주기적 GC
- `[quality]` entity-resolver `*Like` 인터페이스 → `Pick<OriginalType, ...>` 전환
- `[quality]` `entity-tab-registry.ts` raw localStorage → Zustand persist 전환
- `[bio]` Fst long-format CSV 지원 — population/locus/allele/count 4컬럼. 우선순위 낮음
- `[analysis]` intent-router 0.6 임계값 검증 — 사용 로그 수집 후 데이터 기반 재검토
- `[ux]` Bio-Tools data-testid + aria-label — E2E 테스트 + 접근성

### 3-D. 인프라

- `[infra]` D1 스키마 갭 해소 — 상세: [D1-SCHEMA-GAP.md](docs/D1-SCHEMA-GAP.md). 인증/멀티디바이스 시 필수
- `[infra]` genetics history cloud sync 버그 수정 ✅ — projectId 제거, overflow D1 삭제, hydration cap 적용
- `[infra]` 회원가입/OAuth 도입 후 `deviceId` 기반 `X-User-Id`를 실제 `userId`/세션 기반 인증으로 전환
  - genetics history D1 동기화 레이어의 식별자 교체
  - 기존 `deviceId` 레코드 → 최초 로그인 `userId` 이관 전략 필요
- `[infra]` Turso → D1 통합 — `turso-adapter.ts`, `hybrid-adapter.ts`, `NEXT_PUBLIC_TURSO_*` 제거
- `[infra]` 집 PC 환경 동기화 — Node 22 + cf-deploy 스킬 복사 + git pull

### 3-E. 리뷰/신뢰

- `[review]` 프로젝트 레벨 methods/reporting 완성도 체크리스트
- `[review]` reviewer-ready export 번들 구조 정의
- `[review]` 저널 포맷 리뷰 워크플로
- `[trust]` AI 출력에 evidence cards 추가

---

## 4. Later

장기 방향. 현재 실행 우선순위 아님.

### 4-A. 논문 작성 — 인용 고도화 (Phase 6a 이후)

- `[paper]` BibTeX 내보내기 — citation store에서 `.bib` 파일 생성
- `[paper]` Plate 에디터 인라인 인용 노드 — `(Kim et al., 2025)` 클릭 시 문헌 팝업
- `[paper]` Citation Verification — CrossRef/Semantic Scholar API로 인용 정보 검증
- `[paper]` Software Citation 자동 생성 — 사용한 통계 패키지(SciPy, statsmodels 등) BibTeX 자동 추가

- `[review]` reviewer simulator — 체크리스트/패키지 안정화 후
- `[workflow]` 프로젝트 대시보드 강화
- `[architecture]` 모노레포 전환 — 빌드 5분 초과 또는 팀 분할 시. 상세: [REVIEW-MONOREPO-ARCHITECTURE.md](docs/REVIEW-MONOREPO-ARCHITECTURE.md)
- `[architecture]` 프로젝트 연결 DB 동기화 — D1 연동 시
- `[workflow]` 프로젝트 협업/공유 — 스토리지 아키텍처 지원 시
- `[domain]` citation/traceability 강화
- `[review]` figure/table 저널 적합성 리뷰
- `[ux]` 프로젝트 카드 클릭 동작 — 사용자 피드백 후 결정
- `[trust]` 재현 코드 내보내기 확장 (고급 분석)

### AI Export Pipeline

3단계 논문 완성 모델: **1차 BioHub → 2차 SOTA AI → 3차 사람(DOCX/HWPX)**. 상세: [AI-EXPORT-STRATEGY.md](docs/AI-EXPORT-STRATEGY.md)

- `[export]` AI-ready 패키지 export — 프로젝트 전체 결과(통계+그래프+문헌+계산)를 Markdown/JSON으로 내보내기
- `[export]` 결과 ↔ 논문 섹션 매핑 — Table/Figure/Results 태깅
- `[export]` 분야별 프롬프트 템플릿 — 생태학/유전학/수산학 + 저널 스타일
- `[export]` Publication-ready 그래프 export — TIFF 300dpi, SVG, APA 스타일
- `[export]` 분석 버전/히스토리 비교 — Reviewer 코멘트 대응

---

## 5. Blocked

- `[chatbot]` `/chatbot` 역할 정의 필요 — 확정 전까지 추가 개발 보류
- `[chatbot]` 챗봇 주제 폴더 이름 수정 — 역할 확정 후
- `[review]` acceptance probability prediction 구현 안 함
- `[domain]` legal-status 노출은 source metadata + checked-date 선행

---

## 6. 완료 이력 요약

상세는 git history 참조. 주요 완성 항목:

- **프로젝트 시스템**: ResearchProject 모델 + 저장소 + /projects 페이지 + 사이드바 전환기 + 자동 연결 + 상세 페이지
- **통계 분석**: 43개 메서드 점검 완료, intent-router 개선, Worker 번호 정리, 가정 검정 로깅
- **Graph Studio**: localStorage quota, AI 패치 검증, BOM 감지, quota 정책
- **유전적 분석**: BLAST 통합 리팩토링, 히스토리 분리, 초보자 가이드, rate limit 재시도
- **Bio-Tools**: BioToolId 타입, 차트 ECharts 전환, 결과 내보내기, 프로젝트 연결, Worker 9 골든 테스트
- **논문 작성**: Phase 1~5 완료 + Phase 6b/6d/6e 완료 — 조립엔진·Plate WYSIWYG·DOCX/HWPX 내보내기·영문 템플릿·Figure 렌더링·자동 번호 매기기
- **UI 통합**: Shell/Upload/Bio 페이지 일관성, 토스트 마이그레이션, 디자인 토큰, 차트 팔레트 토큰화, **전역 토큰 일관성 통일** (26건 18파일)
- **유전적 분석 Cloud Sync**: D1 genetics history API + 30s TTL hydration + entity ref 중복 수정
- **worker.ts 기술부채**: `parseJsonBody`(9건) + `authenticateRequest`(3건) + `verifyProjectOwnership`(4건) 헬퍼 추출
- **논문 내보내기**: Phase 6a DOCX/HWPX 차트 이미지 삽입 + 리뷰 수정 9건
- **인프라**: Evidence 저장, 재현 코드 내보내기, CF 빌드 수정, genetics/bio-tools 구조 정리
