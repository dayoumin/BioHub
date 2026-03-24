# BioHub TODO

> **Setup:** `.claude/skills/cf-deploy/SKILL.md`를 전역(`~/.claude/skills/cf-deploy/`)으로 복사할 것. Cloudflare 배포 스킬이 모든 프로젝트에서 동작하도록.
>
> **cf-deploy 스킬 업데이트 (2026-03-23):** 전역 스킬이 이미 업데이트됨. BioHub 로컬 스킬에도 아래 내용 반영 필요:
> - `build` 스크립트: `next build && opennextjs-cloudflare build --skipNextBuild` (재귀 방지)
> - `next.config.ts`에 `output: "standalone"` 필수 (OpenNext이 `.next/standalone/` 사용)
> - Cloudflare Pages → Workers 통합됨, Git 푸시 자동 빌드가 아닌 수동 트리거일 수 있음
> - 상세 내용은 전역 스킬 참고: `~/.claude/skills/cf-deploy/SKILL.md`

**Last updated**: 2026-03-23
**References**: [Product Strategy](docs/PRODUCT_STRATEGY.md), [Roadmap](ROADMAP.md), [Research Project Status](docs/RESEARCH_PROJECT_STATUS.md)

---

## 1. How to use this file

This file is the short-horizon execution backlog.

It should contain:

- actionable product and engineering tasks
- current priorities
- items that can move in or out of active work

It should not contain:

- long-term strategy
- historical release notes
- broad future ideation without execution value

Recommended tags:

- `[trust]`
- `[workflow]`
- `[domain]`
- `[review]`
- `[graph]`
- `[paper]`
- `[docs]`

---

## 2. Now

These items should be the current focus.

- ~~`[workflow]` Finalize the user-facing definition of `ResearchProject` as one research unit above individual pages and tools.~~ — 확정 ([RESEARCH_PROJECT_STATUS.md](docs/RESEARCH_PROJECT_STATUS.md) §5 Decision D–H)
- ~~`[workflow]` Define the UX rule for project context vs standalone mode before adding more save-time prompts.~~ — 확정 (Decision F: 자동 연결 + override, Decision G: 기본 도구 standalone / 조립 기능 프로젝트 필수)
- ~~`[workflow]` Add visible project entry points such as project list, project switcher, or project overview so the concept is explicit in the app.~~ — 확정 (Decision D: 사이드바 전환기 + `/projects` 페이지)
- ~~`[workflow]` Define a single `ResearchProject` model shared by chat, analysis history, Graph Studio, and paper draft flows.~~ — 확정 (Decision E: `activeResearchProjectId` zustand store)
- ~~`[workflow]` Define canonical ids and relationships for `projectId`, `analysisId`, `figureId`, and draft section references.~~ — 확정 (Decision E: `activeResearchProjectId`로 통일, Graph Studio의 `currentProjectId`는 `GraphProject`로 유지)
- ~~`[workflow]` Decide the source of truth for project-linked records across local storage, IndexedDB, and adapter-based persistence.~~ — 확정 (zustand + localStorage persist → 추후 D1 마이그레이션)
- ~~`[workflow]` `ProjectEntityKind` 타입 정렬~~ — 완료 (`stats/lib/types/research.ts` → `@biohub/types` re-export)
- ~~`[workflow]` 채팅 프로젝트 저장소 분기 해소~~ — 완료 (연구 프로젝트와 분리, `toResearchProject()` 동기화 제거)
- ~~`[workflow]` `useResearchProjectStore` 생성~~ — 완료 (`research-project-store.ts`, zustand + localStorage persist)
- ~~`[workflow]` `/projects` 페이지 구현~~ — 완료 (목록, 생성, 이름수정, 보관, 삭제)
- ~~`[workflow]` 사이드바 프로젝트 전환기 추가~~ — 완료 (드롭다운 + 활성 프로젝트 표시)
- ~~`[workflow]` `/chatbot` `ProjectsSection` IA 정리~~ — 완료 (편집 제거, 다이얼로그 props 기반, 생성 전용). 용어("주제" vs "프로젝트") 통일은 보류 — 챗봇 역할 확정 후 진행
- ~~`[workflow]` 각 모듈 저장 시 활성 프로젝트 auto-link~~ — 완료 (통계: activeProject 자동, 그래프: DataPackage → activeResearchProjectId fallback, 유전적: 이전 완료)
- ~~`[workflow]` 토스트 기반 저장 피드백~~ — 완료 (통계: 프로젝트명 표시. 유전적: 자동 저장이라 불필요. 그래프: 저장 UI 미구현 — UI 추가 시 토스트 함께)
- ~~`[workflow]` `ResultsActionStep` 프로젝트 선택 팝업 → 컨텍스트 기반 동작으로 교체~~ — 완료 (다이얼로그 제거, activeProject 자동 연결)
- ~~`[workflow]` 프로젝트 상세/개요 페이지 — linked outputs 브라우저~~ — 완료 (1단계: EntityBrowser + 탭/검색/필터 + ReportComposer stub. [PLAN-PROJECT-DETAIL-PAGE.md](stats/docs/PLAN-PROJECT-DETAIL-PAGE.md))
- ~~`[quality]` `@biohub/types` `Project.createdAt: number` vs `research.ts` `ResearchProject.createdAt: string` 타임스탬프 타입 통일~~ — 조사 완료: 프로젝트 레이어는 이미 string(ISO)으로 통일됨. 유일한 불일치 `BlastResult.createdAt: number` → `string` 수정 + worker.ts Date.now() → toISOString() 수정
- ~~`[trust]` `EvidenceRecord` 스키마 정의~~ — 완료 (타입 존재: `research.ts`). 다음: 저장/조회 구현
- ~~`[trust]` `EvidenceRecord` 저장 구현~~ — Phase 1 완료 (evidence-factory + saveToHistory 인라인 연동. Phase 2: Graph Studio/유전 분석은 별도. [PLAN-EVIDENCE-RECORD.md](stats/docs/PLAN-EVIDENCE-RECORD.md))
- ~~`[trust]` 재현 가능 코드 페이로드 (R/Python) 설계~~ — 완료 (12개 메서드 R/Python 템플릿, sanitization, ExportDropdown 통합. `code-export.ts` + `code-templates/`)
- ~~`[graph]` Graph Studio → projectId/analysisId 연결~~ — 완료 (`graph-studio-store.ts` activeResearchProjectId fallback + upsertRef)
- ~~`[graph]` result→graph handoff 메타데이터 보존~~ — 완료
- ~~`[analysis]` 통계 분석 모듈 점검~~ — 완료 (2026-03-23). 발견 항목 아래 등록.
- ~~`[graph]` Graph Studio 점검~~ — 완료. 발견 항목 아래 등록.
- ~~`[genetics]` 유전적 분석 점검~~ — 완료. 발견 항목 아래 등록.
### 점검 결과 — Critical

- ~~`[genetics]` Worker rate limit 동기화 실패~~ — 수정 완료. 클라이언트(BlastRunner) 429 재시도 로직 추가 (최대 3회, retryAfter 기반, 상한 60초). Worker 주석에 클라이언트 보완 전략 문서화. 장기: Durable Objects/KV 전환 시 제거.
- ~~`[genetics]` 히스토리 저장 실패 시 ref 불일치~~ — 수정 완료. try-catch 분리: saveToStorage 실패 시 early return (ref 미정리 = 정상), 성공 후 overflow ref 정리와 new entry ref 생성을 독립 실행.
- ~~`[genetics]` NCBI E-utilities accession 매핑 불완전~~ — 수정 완료. base accession → 입력 accession 역매핑 Map 사전 구축 (대소문자 무시). 원본 케이스 fallback 키 보존.
- ~~`[graph]` localStorage QuotaExceededError 처리 없음~~ — 수정 완료. `style-template-storage.ts` try-catch 추가, `use-ai-chat.ts` logger.warn 추가. `project-storage.ts`는 이미 처리됨.
- ~~`[graph]` AI 패치 적용 후 스키마 검증 없음~~ — 수정 완료. `applyAndValidatePatches`에 검증 실패 시 console.warn 추가 + `applyPatches` JSDoc에 내부 전용 명시. 모든 프로덕션 호출은 이미 `applyAndValidatePatches` 사용.
- ~~`[analysis]` intent-router 신뢰도 임계값 0.7~~ — 수정 완료. 임계값 0.7→0.6 조정 + DIRECT_INTENT_PATTERNS에 한국어 의도 패턴 추가 (`하겠/할게/해주/해볼/해봐/하자`).
- ~~`[analysis]` AnalysisExecutionStep 가정 검정 실패 시 로그 없음~~ — 수정 완료. `executeAssumptionTests` 호출에 try-catch + logger.error 추가.

### 점검 결과 — High

- ~~`[genetics]` BlastMarker/MARKER_INFO 스펠 불일치~~ — 수정 완료. MARKER_INFO에 'CytB'/'16S' 키 추가 (공유 참조), 추천 배열을 BlastMarker 값으로 통일.
- ~~`[genetics]` 캐시 히트 abort signal cleanup 누락~~ — 수정 완료. speciesPromise에 .catch() 가드 추가, abort 경로에서 await 후 return (floating promise 방지).
- ~~`[graph]` echarts-converter 필드 미존재 시 silent NaN~~ — 수정 완료. `aggregateRows`에 yField 존재 확인 + console.warn 추가.
- ~~`[graph]` 프로젝트 복원 시 인코딩 불일치 무경고 해제~~ — 수정 완료. 인코딩 불일치 시 console.warn (프로젝트명 + 누락 필드) 추가.
- ~~`[analysis]` chi-square-goodness 1변수 전용 selector 없음~~ — 이미 구현됨. `ChiSquareSelector`가 `GOODNESS_IDS`로 1변수 모드 자동 전환.
- ~~`[analysis]` proportion-test testValue 입력 UI 없음~~ — 이미 구현됨. `ChiSquareSelector`에 `nullProportion` 입력 UI + 검증 포함.
- ~~`[deploy]` CF 빌드 실패 — `useSearchParams()` prerender 에러~~ — 수정 완료. `useSearchParams` 완전 제거 → `window.location.search`로 전환 (barcoding, graph-studio, HistorySidebar). page.tsx는 `dynamic(() => import('./Content'), { ssr: false })` 분리. **주의**: 향후 `useSearchParams` 사용 시 같은 패턴 적용 필수.

---

## 3. Next

우선순위: **통계 분석 → 그래프 → 공통 품질 → 기타**

### 3-A. 통계 분석 (Analysis)

**병렬 처리 가능 (독립적, 소규모):**
- ~~`[analysis]` NMDS/PERMANOVA `beta_diversity` pre-step에 `isAnalyzing` 미설정~~ — 완료 (hook에 `setIsAnalyzing` 노출 + 페이지에서 pre-step 감싸기)
- ~~`[analysis]` Worker 번호 하드코딩~~ — 완료 (`use-levene-test.ts:133` `3` → `PyodideWorker.NonparametricAnova`. 나머지는 이미 enum 사용)
- ~~`[ux]` SummaryCard focusRing 누락~~ — 완료 (`focusRing` import + className 추가)
- ~~`[ux]` Step 1 카드 대시보드: 하드코딩 한글 → terminology 시스템 등록~~ — 완료 (`badgeBar` + `summaryCards` 섹션 추가, aquaculture/generic 양쪽 등록)

**순차 처리 (설계 필요):**
- `[analysis]` Hub Chat 데이터 컨텍스트 token 낭비 — validationResults 전체 전달. intent별 경량화 필요.
- `[analysis]` intent-router 테스트 부재 — 키워드 + LLM 분류 검증 없음
- `[analysis]` `runAnalysis(methodName: string)` stringly-typed → Worker method union 타입 제약 검토
- `[analysis]` `useBioToolAnalysis` hook에서 `setError` 직접 노출 — leaky abstraction. `runMultiStepAnalysis` 패턴으로 캡슐화 검토
- `[ux]` AI 해석 실패 graceful degradation (`useErrorRecovery` 활용)

### 3-B. 그래프 (Graph Studio)

**병렬 처리 가능:**
- ~~`[graph]` CSV BOM/인코딩 자동 감지 없음~~ — 완료 (`stripBom` + `transformHeader` + `encoding: UTF-8` 적용: file-parser 2곳, data-processing 1곳)
- ~~`[graph]` matplotlib export 에러 시 ECharts 대체 안내 없음~~ — 완료 (ExportDialog 에러 시 일반 내보내기 안내 표시)

**순차 처리:**
- `[graph]` localStorage quota 정책 — 현재 무제한 저장, evidence 추가 시 터짐 위험. MAX_GRAPH_PROJECTS + 자동 정리 필요.

### 3-C. 공통 품질/UX

**병렬 처리 가능:**
- `[quality]` `escapeHtml` 중복 3곳 → 공유 `@/lib/utils/html-escape` 통합 (`open-data-window.ts`, `help-search.ts`, `html-export.ts`)
- `[quality]` `markdownToSimpleHtml` negative lookbehind — Safari < 16.4 미지원 가능성. 구조적 접근으로 교체 검토
- `[ux]` ProjectHeader onBlur+Enter 이중 save → 이중 토스트 (`ProjectHeader.tsx:73`)

**순차 처리:**
- `[quality]` `createLocalStorageIO` 추가 적용 — `pinned-history-storage`, `recent-statistics`, `style-template-storage`, `analysis-history`, `entity-tab-registry` (5곳 점진적)
- `[ux]` 토스트 메시지 기존 19곳 점진적 `TOAST.*` 마이그레이션
- `[ux]` ChatBubble 공통 컴포넌트 추출
- `[perf]` `ensureUser` INSERT OR IGNORE 매 요청 실행 — KV 캐시 또는 첫 요청만 실행으로 최적화

### 3-D. 기타 (genetics, infra, domain, paper)

- `[genetics]` 다중 FASTA 시퀀스 혼합 미감지 — cleanSequence가 >seq1 + >seq2 합침. (`validate-sequence.ts:8`)
- `[genetics]` deep-link 복원 실패 시 UI 피드백 없음 — ?history= entry.resultData null이면 빈 화면. (`BarcodingContent.tsx:41`)
- `[infra]` D1 스키마 갭 해소 — 상세: [D1-SCHEMA-GAP.md](docs/D1-SCHEMA-GAP.md). 현재 프론트엔드는 localStorage/IndexedDB 기반이라 급하지 않음. 인증/멀티디바이스 동기화 시 필수.
- `[infra]` Turso → D1 통합 — `turso-adapter.ts`, `hybrid-adapter.ts`, `NEXT_PUBLIC_TURSO_*` 환경변수 제거. D1 마이그레이션 완료 후 진행.
- `[domain]` species-validation 레코드 스키마 정의
- `[domain]` legal-status 레코드 스키마 정의 (source metadata + checked date)
- `[domain]` Connect species and legal status outputs into manuscript and review flows.
- `[paper]` 프로젝트 레벨 문서 조립 (DocumentBlueprint) — 설계 완료, 구현 대기. 4개 프리셋(논문/보고서/현장보고/커스텀) + 자동 병합 + LLM 보강. 상세: [PLAN-DOCUMENT-ASSEMBLY.md](stats/docs/PLAN-DOCUMENT-ASSEMBLY.md)
- `[paper]` Build project-level manuscript assembly UI across multiple analyses.
- `[paper]` Add figure and table references that can be inserted into draft sections.
- `[review]` Define a project-level methods and reporting completeness checklist.
- `[review]` Define reviewer-ready export bundle structure.
- `[review]` Add journal format review and fit review workflow.
- `[review]` Design reviewer simulator inputs and output schema.
- `[trust]` Add user-facing evidence cards to major AI-assisted outputs.

---

## 4. Later

These are valid directions, but not current execution priorities.

- `[review]` Implement reviewer simulator after checklist and reviewer package foundations are stable.
- `[domain]` Expand external domain integrations beyond baseline validation flows.
- `[paper]` Add stronger project-wide draft synthesis and section merge assistance.
- `[trust]` Expand reproducible code export to more advanced analysis paths.
- `[workflow]` Add richer project dashboard and project health summary.
- `[ux]` 사이드바 My Menu — 메뉴 항목 순서 이동(드래그) 및 즐겨찾기 고정 기능. 현재 "My Menu (예정)" 플레이스홀더 존재 (`app-sidebar.tsx`).
- `[quality]` entity-resolver `*Like` 인터페이스 → `Pick<OriginalType, ...>` 전환 — import 순환 해결 후. 현재 수동 동기화 필요.
- `[quality]` `report-export.ts` blob→download 패턴 → 공통 유틸 `utils/download-file.ts` 추출 검토 — `html-export.ts`에도 동일 패턴 존재
- `[quality]` `report-export.ts` `markdownToSimpleHtml()` → 공통 유틸 추출 검토 — `html-export.ts`의 인라인 `escapeHtml()`도 `@/lib/utils/html-escape` import로 교체
- `[quality]` `entity-tab-registry.ts` raw localStorage 패턴 → Zustand persist 전환 검토 — 현재 동작에 문제 없으나 코드베이스 일관성 차원
- `[ux]` 프로젝트 카드 클릭 동작 재검토 — 현재 활성화 토글, UX 관례는 상세 진입. 사용자 피드백 후 결정.
- `[quality]` dangling ref 정리 방안 — 현재 영구 누적. 수동 "정리" 버튼 또는 주기적 GC 검토.
- `[domain]` Add stronger citation and traceability support for domain records in downstream outputs.
- `[review]` Add figure and table compliance review against journal expectations.
- `[workflow]` Add project-level collaboration or sharing concepts if storage architecture supports it.
- `[domain]` 학명검증(species_checker) 통합 + 알림 시스템 통합 — 상세: [PLAN-SPECIES-INTEGRATION.md](docs/PLAN-SPECIES-INTEGRATION.md). WoRMS 연동은 `D:\Projects\scientific-name-validator`에 별도 프로젝트 존재, 내재화 대기.
- `[domain]` 외부 DB 연동 우선순위 — 레퍼런스: [docs/databases/](docs/databases/)
  - **1순위**: BOLD ID Engine (종 동정 1차 검색, CORS 미지원→프록시 필요)
  - **2순위**: GBIF (분포/출현 기록, CORS 지원→브라우저 직접 호출 가능)
  - **3순위**: UniProt ID Mapping (BLAST→단백질 기능 연결, CORS 지원)
  - **안함**: GO/KEGG/Ensembl 유전자 기능 심화 — Galaxy/Bioconductor 영역, BioHub 차별점 아님

---

## 5. Blocked or deferred

- `[chatbot]` `/chatbot` 역할 정의 필요 — 현재 범용 AI 채팅이지만, 통계 해석·그래프 편집 등 AI가 각 모듈에 이미 내장됨. 챗봇 고유 역할(논문 작성 도우미? 크로스모듈 Q&A? 연구 노트?)이 확정되어야 UI/용어/연구 프로젝트 연결 방향을 정할 수 있음. 확정 전까지: 현재 코드 유지(dumb dialog, IndexedDB 일원화 완료), 추가 기능 개발 보류.
- `[chatbot]` 챗봇 주제 폴더 인라인 이름 수정 — 현재 생성만 가능, 수정 불가. 챗봇 역할 확정 후 구현.
- `[review]` Do not implement acceptance probability prediction.
- `[workflow]` Do not expand disconnected AI features before the shared project model exists.
- `[paper]` Do not overbuild manuscript automation before analysis, figure, and provenance linkage is stable.
- `[domain]` Do not expose legal-status outputs without source metadata and checked-date support.

---

## 6. Suggested execution order

1. ~~Project UX rule and visible project structure~~ — 확정 (2026-03-22)
2. ~~Prerequisites: `ProjectEntityKind` 정렬, 저장소 분기 해소, `activeResearchProjectId` 명명 확보~~ — 완료
3. ~~`useResearchProjectStore` + `/projects` 페이지 + 사이드바 전환기~~ — 완료
4. ~~컨텍스트 기반 자동 저장 (토스트 + override)~~ — 완료 (통계·그래프·유전적 분석)
5. ~~프로젝트 상세/개요 페이지 (Phase 4) + 타임스탬프 타입 통일~~ — 완료
6. ~~Evidence/provenance 저장 구현~~ — Phase 1 완료 (evidence-factory + saveToHistory 연동) + 재현 코드 내보내기 완료
7. Species/legal source-aware records
8. Project-level draft assembly model
9. Reviewer checklist and export bundle
10. Reviewer simulator

---

## 7. Definition of done for the current cycle

The current cycle should be considered successful when:

- project-linked analysis, figure, and draft records are defined consistently
- provenance can be stored with important AI outputs
- species/legal outputs have source-aware metadata
- graph outputs can be traced back to project and analysis context
- the paper workflow can be designed on top of shared project records instead of isolated module state