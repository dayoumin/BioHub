# BioHub TODO

**Last updated**: 2026-04-02
**References**: [Product Strategy](docs/PRODUCT_STRATEGY.md), [Roadmap](ROADMAP.md), [Research Project Status](docs/RESEARCH_PROJECT_STATUS.md)

---

## 1. How to use this file

Short-horizon execution backlog. 완료 항목은 git history 참조.

Tags: `[paper]` `[domain]` `[ux]` `[quality]` `[infra]` `[review]` `[trust]`

---

## 2. Now

### 논문 작성 (Phase 5-6)

- `[paper]` **Phase 5: 영문 템플릿 완성**
  - 영문 Methods/Results/Captions 템플릿 15개 (현재 전부 stub → 실제 영문 텍스트)
  - ~~Discussion LLM 생성~~ → 안 함 (외부 AI 영역)
  - ~~외부 AI 프롬프트 클립보드 복사~~ → 보류
- `[paper]` Phase 6: 인용 관리 (citation store 신규), Figure 통합, 영문 템플릿, 번호 매기기
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

- `[ux]` Command Palette (Cmd+K) — 43개 분석 메서드 + 16개 Bio 도구 + Graph Studio 빠른 접근
- `[ux]` 사이드바 IA 재구성 — 네비게이션 계층 재설계
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
- `[quality]` dangling ref 정리 — 수동 "정리" 버튼 또는 주기적 GC
- `[quality]` entity-resolver `*Like` 인터페이스 → `Pick<OriginalType, ...>` 전환
- `[quality]` `entity-tab-registry.ts` raw localStorage → Zustand persist 전환
- `[bio]` Fst long-format CSV 지원 — population/locus/allele/count 4컬럼. 우선순위 낮음
- `[analysis]` intent-router 0.6 임계값 검증 — 사용 로그 수집 후 데이터 기반 재검토
- `[ux]` Bio-Tools data-testid + aria-label — E2E 테스트 + 접근성
- `[quality]` paper-templates 영문 리팩토링:
  - `depVarName(ctx, lang)` 헬퍼 추출 (19곳 반복 인라인 fallback)
  - `buildNormalityText` embedded 파라미터 추가 (`.replace(/^N/, 'n')` 3곳 제거)

### 3-D. 인프라

- `[infra]` D1 스키마 갭 해소 — 상세: [D1-SCHEMA-GAP.md](docs/D1-SCHEMA-GAP.md). 인증/멀티디바이스 시 필수
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

- `[review]` reviewer simulator — 체크리스트/패키지 안정화 후
- `[workflow]` 프로젝트 대시보드 강화
- `[architecture]` 모노레포 전환 — 빌드 5분 초과 또는 팀 분할 시. 상세: [REVIEW-MONOREPO-ARCHITECTURE.md](docs/REVIEW-MONOREPO-ARCHITECTURE.md)
- `[architecture]` 프로젝트 연결 DB 동기화 — D1 연동 시
- `[workflow]` 프로젝트 협업/공유 — 스토리지 아키텍처 지원 시
- `[domain]` citation/traceability 강화
- `[review]` figure/table 저널 적합성 리뷰
- `[ux]` 프로젝트 카드 클릭 동작 — 사용자 피드백 후 결정
- `[trust]` 재현 코드 내보내기 확장 (고급 분석)

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
- **논문 작성**: Phase 1 (타입+조립엔진) → Phase 2 (에디터) → Phase 3 (Plate WYSIWYG) → Phase 4 (DOCX 내보내기)
- **UI 통합**: Shell/Upload/Bio 페이지 일관성, 토스트 마이그레이션, 디자인 토큰, 차트 팔레트 토큰화
- **인프라**: Evidence 저장, 재현 코드 내보내기, CF 빌드 수정, genetics/bio-tools 구조 정리
