# BioHub TODO

**Last updated**: 2026-04-04 (BOLD ID Engine 완료 — 7개 유전 도구 사용 가능)
**References**: [Product Strategy](docs/PRODUCT_STRATEGY.md), [Roadmap](ROADMAP.md), [Research Project Status](docs/RESEARCH_PROJECT_STATUS.md)

---

## 1. How to use this file

Short-horizon execution backlog. 완료 항목은 git history 참조.

Tags: `[paper]` `[domain]` `[ux]` `[quality]` `[infra]` `[review]` `[trust]`

---

## 2. Now

### 자료 작성 (Phase 6a)

- `[paper]` ~~Phase 1~5 완료~~ ✅ — 타입+조립엔진, 에디터, Plate WYSIWYG, DOCX/HWPX 내보내기, 영문 템플릿 15개
- `[paper]` ~~Phase 6b: Figure 오프스크린 렌더링+캐시~~ ✅
- `[paper]` ~~Phase 6d: 표/그림 자동 번호 매기기~~ ✅
- `[paper]` ~~Phase 6e: HWPX 내보내기~~ ✅
- `[paper]` ~~Phase 6a: 인용 관리~~ ✅ — citation store + MaterialPalette 문헌 탭 + APA formatter + References 자동 동기화
- `[paper]` ~~Paper Package Assembly MVP~~ ✅ — AI 프롬프트 빌더 5단계 wizard + 조립 엔진 (ko/en 분기) + 20 tests
- `[paper]` Phase 6f: field-report 프리셋 — species-validation/legal-status resolver 선행 필요 (Blocked)
- 상세: [PLAN-DOCUMENT-ASSEMBLY.md](stats/docs/papers/PLAN-DOCUMENT-ASSEMBLY.md) · [PLAN-PAPER-PACKAGE-ASSEMBLY.md](docs/PLAN-PAPER-PACKAGE-ASSEMBLY.md)

### 유전적 분석 (Genetics Phase A/B)

- `[domain]` ~~Phase 0: 버그 4건~~ ✅ — alignCoverage 리네임, quota toast, 서열 상한, 빈 종명
- `[domain]` ~~Phase A1: seq-stats~~ ✅ — MultiSequenceInput + 서열 기본 통계 (순수 TS)
- `[domain]` ~~Phase A2: similarity~~ ✅ — K2P/JC/p-distance 거리 행렬 + UPGMA 덴드로그램
- `[domain]` ~~Phase A3: phylogeny~~ ✅ — NJ/UPGMA 계통수 + Newick 내보내기
- `[domain]` ~~Phase B1: 바코딩 CSV 내보내기~~ ✅
- `[domain]` ~~Phase B2: 도구 간 서열 전달~~ ✅ — sessionStorage 1회성
- `[domain]` ~~Phase B3: 히스토리 텍스트 검색~~ ✅
- `[infra]` ~~worker.ts 분리~~ ✅ — 1,425줄 → 65줄 라우터 + 7 핸들러
- `[quality]` ~~docs 구조 정리~~ ✅ — stats/docs/ 89개 flat → 13개 서브폴더
- `[domain]` ~~Phase C1: BOLD ID Engine~~ ✅ — BOLD v5 프록시 + 종 동정 + BIN 매핑 + CSV + 히스토리
- 상세: [docs/genetics/README.md](docs/genetics/README.md)

---

## 3. Next

우선순위: **도메인 확장 → UX → 품질 → 인프라**

### 3-A. 도메인 확장

- `[domain]` FisheryON 기능 이전 — 문헌 통합검색 (Phase A) ✅ 구현 완료, 자료 작성 하위 탭 통합 대기. 연구동향 모니터링 (Phase B) + 이메일 구독/Cron (Phase C) → **ROADMAP Stream 5 (Research Copilot)으로 이관**. 상세: [PLAN-FISHERY-MIGRATION.md](docs/PLAN-FISHERY-MIGRATION.md)
- `[domain]` 외부 DB 연동 우선순위 — 레퍼런스: [docs/databases/](docs/databases/)
  - ~~**1순위**: BOLD ID Engine~~ ✅ — Worker 프록시 + useBoldExecution 훅 + BoldResultView + 20 tests
  - **2순위**: GBIF (분포/출현 기록, CORS 지원→브라우저 직접 호출 가능)
  - **안함**: GO/KEGG/Ensembl 유전자 기능 심화 — Galaxy/Bioconductor 영역, BioHub 차별점 아님
- `[domain]` species-validation 레코드 스키마 정의
- `[domain]` legal-status 레코드 스키마 정의 (source metadata + checked date)
- `[domain]` 학명검증(species_checker) 통합 + 알림 시스템 통합 — 상세: [PLAN-SPECIES-INTEGRATION.md](docs/PLAN-SPECIES-INTEGRATION.md)

### 3-A-1. 유전적 분석 확장 (분자생물학 도구 + UniProt)

- `[domain]` BioPython 분자생물학 도구 2페이지 — 상세: [docs/genetics/plans/biopython-tools.md](docs/genetics/plans/biopython-tools.md)
  - `/genetics/translation` — DNA→Protein 워크벤치 (번역 + ORF + 코돈 분석 탭)
  - `/genetics/protein` — 단백질 특성 분석 (ProtParam + 향후 UniProt)
- `[domain]` UniProt 연동 — 번역된 단백질 → 기능 주석 조회. CORS 지원→브라우저 직접 호출 가능. 상세: [docs/databases/uniprot.md](docs/databases/uniprot.md)
- `[quality]` 제네릭 `useApiExecution` 훅 추출 — `useBoldExecution`과 `useBlastExecution`이 ~80% 동일. 세 번째 폴링 API 추가 시 통합
- `[quality]` BoldResultView similarity 색상 dark mode
- `[ux]` genetics 랜딩 페이지 서브그룹 — "서열 분석 도구" / "분자생물학 도구"로 카드 그룹 분리

### 3-B. UX 개선

- `[ux]` ~~사이드바 BioHub 로고 홈 링크~~ ✅ + ~~문헌·동향 → 자료 작성 하위로 이동~~ ✅
- `[ux]` Stitch Axiom Slate 디자인 시스템 적용 ✅ — `stats/DESIGN.md` 기반, Surface Hierarchy + No-Line Rule
- `[ux]` 문헌 검색을 자료 작성 페이지 내 서브탭으로 통합 (사이드바 제거 완료, 페이지 통합 대기)
- `[ux]` ~~Bio-Tools 샘플 데이터~~ ✅ — BioCsvUpload `exampleDataPath` prop + 15개 도구 CSV 연결 완료
- `[ux]` Bio-Tools 데이터 프리뷰 — 업로드 후 분석 전 5행 미리보기
- `[ux]` Bio-Tools 컬럼 Combobox — cmdk 검색 가능 select
- `[ux]` 사이드바 My Menu — 드래그 정렬 + 즐겨찾기 고정
- `[ux]` 콘텐츠 밀도 검토 — `py-8 space-y-6` vs `py-6 space-y-4`

### 3-C. 품질/기술 부채

- `[quality]` 통합 히스토리 사이드바 정리:
  - ~~`useLocalStorageSync(key, event, loader)` 공용 훅 추출~~ ✅ — `lib/hooks/use-local-storage-sync.ts`
  - 히스토리 사이드바 한글 하드코딩 → terminology (~15건)
  - `onHistoryShowMore` 데드 prop 정리 — `ChatCentricHub.tsx`에 잔존
  - ~~pin 토글 로직 `togglePinId()` 순수 함수 추출~~ ✅ — `lib/utils/pinned-history-storage.ts`
- `[quality]` IndexedDB 트랜잭션 헬퍼 중복 — `txPut/txGetByIndex/txDelete`가 `citation-storage.ts` + `document-blueprint-storage.ts` + `chart-snapshot-storage.ts` 3곳에 반복 → `lib/utils/indexeddb-helpers.ts` 공유 모듈로 추출
- `[quality]` ~~ID 생성 함수 통합~~ ✅ — `generateId(prefix)` 유틸 추출, 8개 파일 교체
- `[quality]` ~~`downloadTextFile` 유틸 추출~~ ✅ — `downloadTextFile/downloadCsvFile/downloadBlob` 3함수, 15개 파일 인라인 패턴 교체
- `[quality]` ~~`JournalPreset.style` 타입 강화~~ ✅ — `JournalStyle` union 타입 도입
- `[quality]` ~~worker.ts `jsonResponse` 중복~~ ✅ — `lib/worker-utils.ts`로 통합
- `[quality]` `parseInlineMarks` DOCX/HWPX 90% 중복 (P1-7) → 3번째 파서 등장 시 통합
- `[quality]` dangling ref 정리 — 수동 "정리" 버튼 또는 주기적 GC
- `[quality]` entity-resolver `*Like` 인터페이스 → `Pick<OriginalType, ...>` 전환
- `[quality]` `entity-tab-registry.ts` raw localStorage → Zustand persist 전환
- `[quality]` Recommender 단위 테스트 — `decision-tree-recommender.ts` 등 6파일 커버리지 0%. 순수 로직(decision-tree) 우선, LLM 추천기는 mock 비용 대비 보류
- `[quality]` Bio-Tools E2E 테스트 — data-testid 추가 + Playwright 워크플로 테스트 (CSV 업로드→분석→내보내기). Bio-Tools 안정화 이후 착수
- `[bio]` Fst long-format CSV 지원 — population/locus/allele/count 4컬럼. 우선순위 낮음
- `[analysis]` intent-router 0.6 임계값 검증 — 사용 로그 수집 후 데이터 기반 재검토
- `[ux]` Bio-Tools data-testid + aria-label — E2E 테스트 + 접근성
- `[quality]` ~~기존 테스트 실패 10건 수정~~ ✅ — `fe391de9`에서 CSS 클래스 + mock 갱신 완료 (7 files)
- `[quality]` ~~method-mapping.ts / statistical-methods.ts 통합~~ ✅ — method-mapping.ts 삭제 (811줄), canonical SSOT로 완전 전환. import 14곳 리다이렉트, two-way-anova canonical 등록, dead code 제거
- `[ux]` ~~method-catalog categoryOrder에 `'descriptive'` 누락~~ ✅ — categoryOrder에 descriptive 추가, Browse All에서 4개 메서드 정상 노출
- `[quality]` games-howell recommender 리팩터링 — `smart-recommender.ts:251`에서 하드코딩된 inline method object 대신, ANOVA 추천 시 post-hoc 옵션을 별도 로직으로 제안하도록 개선. Post-hoc는 독립 메서드가 아닌 ANOVA 내부 옵션 아키텍처 반영
- `[quality]` ~~Worker 타입 계약 정비 (Session C)~~ ✅ — Worker 1-2 타입 계약 + pyodide-results.ts 삭제 (520줄) + generated 타입 전환 + type-guards 확장. 상세: [PLAN-SESSION-C-WORKER-TYPE-CONTRACT.md](docs/PLAN-SESSION-C-WORKER-TYPE-CONTRACT.md)
- `[quality]` ~~Regression handler–worker 계약 불일치 4건~~ ✅ (Session D) — worker4 + handler + test 커밋 완료. registry/codegen/generated 3파일은 Session C 커밋에 포함 예정
- `[quality]` Handler runtime contract 명시화 — 12개 핸들러 전체 `WorkerRaw*` 타입 정의 + runtime assertion + 필드명 표준화. 상세: [PLAN-HANDLER-RUNTIME-CONTRACTS.md](docs/PLAN-HANDLER-RUNTIME-CONTRACTS.md)

### 3-C-1. 2026-04-04 대규모 리팩터링 사후 점검 (82파일, -4120/+2896)

> 5개 커밋: method-mapping 삭제, Session C 타입 계약, storage-keys 중앙화, categoryOrder 수정, handler 타입 전환

**빌드 검증:**
- [ ] `pnpm build` 성공 (dead import → 빌드 실패로 잡힘)

**수동 E2E 핵심 경로 (handler 변경이 큰 3개):**
- [ ] Linear Regression 실행 → 결과 테이블 + 계수/R² 정상
- [ ] Time Series (ARIMA) 실행 → 예측 결과 정상
- [ ] Independent t-test 실행 → p-value + 효과 크기 정상

**카탈로그 확인:**
- [ ] Analysis 허브 → Browse All → descriptive 카테고리 4개 메서드 노출 확인

**Storage 마이그레이션:**
- [ ] 기존 브라우저 세션에서 설정/테마/히스토리 유지되는지 확인
- [ ] 새 브라우저/시크릿 모드에서 정상 동작

**추가 안정성 (시간 여유 시):**
- [ ] Chi-square 실행 정상
- [ ] Correlation 실행 정상
- [ ] One-way ANOVA + post-hoc 실행 정상
- [ ] Descriptive Statistics 실행 정상

### 3-D. 인프라

- `[infra]` D1 스키마 갭 해소 — 상세: [D1-SCHEMA-GAP.md](docs/D1-SCHEMA-GAP.md). 인증/멀티디바이스 시 필수
- `[infra]` genetics history cloud sync 버그 수정 ✅ — projectId 제거, overflow D1 삭제, hydration cap 적용
- `[infra]` 회원가입/OAuth 도입 후 `deviceId` 기반 `X-User-Id`를 실제 `userId`/세션 기반 인증으로 전환
  - genetics history D1 동기화 레이어의 식별자 교체
  - 기존 `deviceId` 레코드 → 최초 로그인 `userId` 이관 전략 필요
- `[infra]` Turso → D1 통합 — `turso-adapter.ts`, `hybrid-adapter.ts`, `NEXT_PUBLIC_TURSO_*` 제거
- `[infra]` 회사 PC 환경 동기화 — Node 22 + cf-deploy 스킬 복사 + git pull
  - `~/.claude/skills/context7/SKILL.md` 복사 (Context7 서브에이전트 스킬)
  - `claude mcp add -s user context7 -- npx -y @upstash/context7-mcp@latest`
  - `.mcp.json` playwright → `@playwright/mcp@latest` (이미 커밋됨, pull로 반영)
  - agent-browser 0.24.0 + Playwright 1.59.1 업데이트

### 3-E. 리뷰/신뢰

- `[review]` 프로젝트 레벨 methods/reporting 완성도 체크리스트
- `[review]` reviewer-ready export 번들 구조 정의
- `[review]` 저널 포맷 리뷰 워크플로
- `[trust]` AI 출력에 evidence cards 추가

---

## 4. Later

장기 방향. 현재 실행 우선순위 아님.

### 4-A. 자료 작성 — 인용 고도화 (Phase 6a 이후)

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

### 4-B. 기타

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

### AI Export Pipeline — IP 보호 (구현 완료 후 착수)

- `[export]` Pipeline 코드 분리 — public repo에서 제외, private repo/package로 관리
- `[export]` 출력물 메타데이터 sanitize — export 마지막 단계에서 AI/도구 관련 EXIF·문서 속성·주석 제거
- `[export]` 라이선스 이중화 검토 — BioHub 본체와 Pipeline 부분 라이선스 분리
- `[export]` 방법론 노트 선출판 — AI-assisted research workflow를 brief communication으로 발표하여 우선권 확보
- **착수 시점**: AI Export Pipeline 구현 완료 + 실제 논문 1편 적용 후

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
- **자료 작성**: Phase 1~5 + 6a/6b/6d/6e 완료 — 조립엔진·Plate WYSIWYG·DOCX/HWPX 내보내기·영문 템플릿·Figure 렌더링·자동 번호 매기기·인용 관리(APA+IndexedDB+References 자동 병합)
- **UI 통합**: Shell/Upload/Bio 페이지 일관성, 토스트 마이그레이션, 디자인 토큰, 차트 팔레트 토큰화, **전역 토큰 일관성 통일** (26건 18파일)
- **유전적 분석 Cloud Sync**: D1 genetics history API + 30s TTL hydration + entity ref 중복 수정
- **worker.ts 기술부채**: `parseJsonBody`(9건) + `authenticateRequest`(3건) + `verifyProjectOwnership`(4건) 헬퍼 추출
- **논문 내보내기**: Phase 6a DOCX/HWPX 차트 이미지 삽입 + 리뷰 수정 9건
- **인프라**: Evidence 저장, 재현 코드 내보내기, CF 빌드 수정, genetics/bio-tools 구조 정리
