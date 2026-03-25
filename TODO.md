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

우선순위: **구조 정리 (선행) → 통계 분석 → 공통 품질 → 기타**

### 3-0. 구조 정리 (개별 기능 개발 선행 조건)

**먼저 해야 할 것 (기능 개발 전):**
- ~~`[structure]` genetics/ vs bio-tools/ 이중 구조 해소~~ — 완료 (HW/Fst는 Bio-Tools 소속 확정, genetics hub에서 집단유전학 제거 + cross-link 추가, 사이드바 순서 조정, CLAUDE.md 문서화)
- ~~`[structure]` Bio-Tools 결과 타입 중앙화~~ — 완료 (15개 페이지 전부 `types/bio-tools-results.ts`에서 import 확인, 로컬 타입 0개)
- ~~`[structure]` Worker Genetics enum 정리~~ — 완료 (Worker 9 = Genetics enum + stub, 계획서 번호 교정, Worker 3 PACKAGES 동기화)

**기능 개발과 병행 가능:**
- `[structure]` `ProjectEntityKind`에 `'bio-tool-result'` 추가 + `ENTITY_TAB_REGISTRY` Bio-Tools 탭 — 첫 Bio-Tool 완성 시
- `[structure]` Bio-Tools 결과 내보내기 (`BioResultsSection` + Shell Export 버튼) — 첫 Bio-Tool 완성 시
- `[structure]` `useBioToolAnalysis` 훅에 `projectId` opt-in — ProjectEntityKind 확장과 함께
- `[structure]` Bio-Tools 테스트 인프라 + 패턴 가이드 — 첫 도구 테스트 작성 시 확립

### 3-A. 통계 분석 (Analysis)

**병렬 처리 가능 (독립적, 소규모):**
- ~~`[analysis]` NMDS/PERMANOVA `beta_diversity` pre-step에 `isAnalyzing` 미설정~~ — 완료 (hook에 `setIsAnalyzing` 노출 + 페이지에서 pre-step 감싸기)
- ~~`[analysis]` Worker 번호 하드코딩~~ — 완료 (`use-levene-test.ts:133` `3` → `PyodideWorker.NonparametricAnova`. 나머지는 이미 enum 사용)
- ~~`[ux]` SummaryCard focusRing 누락~~ — 완료 (`focusRing` import + className 추가)
- ~~`[ux]` Step 1 카드 대시보드: 하드코딩 한글 → terminology 시스템 등록~~ — 완료 (`badgeBar` + `summaryCards` 섹션 추가, aquaculture/generic 양쪽 등록)

**순차 처리 (설계 필요):**
- ~~`[analysis]` Hub Chat 데이터 컨텍스트 token 낭비~~ — 완료 (`buildContextForIntent` 연결: visualization ~60%, experiment-design ~90% 절감)
- ~~`[analysis]` intent-router 테스트 부재~~ — 완료 (52개 테스트, 임계값 0.7→0.6 반영)
- ~~`[analysis]` `runAnalysis(methodName: string)` stringly-typed~~ — 완료 (`AllMethodNames` union 타입 적용 + Worker 9 registry 동기화)
- ~~`[analysis]` `useBioToolAnalysis` hook `setError` 직접 노출~~ — 검토 완료. 14개 중 2개만 사용 (fst, hardy-weinberg pre-validation). 2 caller 위한 캡슐화는 과잉, 현 상태 유지.
- ~~`[ux]` AI 해석 실패 graceful degradation~~ — 이미 구현됨 (`useErrorRecovery` + `AiInterpretationCard` 2회 재시도 → 소진 시 안내 메시지)

### 3-B. 그래프 (Graph Studio)

**병렬 처리 가능:**
- ~~`[graph]` CSV BOM/인코딩 자동 감지 없음~~ — 완료 (`stripBom` + `transformHeader` + `encoding: UTF-8` 적용: file-parser 2곳, data-processing 1곳)
- ~~`[graph]` matplotlib export 에러 시 ECharts 대체 안내 없음~~ — 완료 (ExportDialog 에러 시 일반 내보내기 안내 표시)

**순차 처리:**
- ~~`[graph]` localStorage quota 정책~~ — 완료 (MAX_GRAPH_PROJECTS=50, 자동 eviction + QuotaExceededError 재시도)

### 3-C. UI 일관성 통일 (완료)

**Phase 1~3 순차:**
- ~~`[ux]` Phase 1: Shell 통일~~ — 완료 (헤더 sticky + max-w-7xl + 배경 틴트 + LAYOUT 토큰 추출)
- ~~`[ux]` Phase 2: Upload 통일~~ — 완료 (BioCsvUpload → UploadDropZone 시각 채택)
- ~~`[ux]` Phase 3: Bio 페이지 일괄~~ — 완료 (Select 통일 + 에러 박스 + Loader2 + scrollIntoView. smoke 테스트 미진행)
- ~~`[ux]` BioColumnSelect `layout`/`noneLabel` prop 추가~~ — 완료 (stacked 레이아웃 meta-analysis/icc 지원, nmds "없음 (단일 그룹)" 커스텀 라벨)

### 3-D. 공통 품질/UX

**병렬 처리 가능:**
- ~~`[quality]` `escapeHtml` 중복 3곳 → 공유 `@/lib/utils/html-escape` 통합~~ — 완료 (open-data-window, help-search, html-export → 공유 모듈 import)
- ~~`[quality]` `markdownToSimpleHtml` negative lookbehind~~ — 확인 결과 lookbehind 패턴 없음 (이미 해결 또는 오기재)
- ~~`[ux]` ProjectHeader onBlur+Enter 이중 save → 이중 토스트~~ — 완료 (Enter→`e.currentTarget.blur()` 패턴으로 단일 이벤트 보장)

**순차 처리:**
- ~~`[quality]` `createLocalStorageIO` 추가 적용~~ — 완료 (5곳: pinned-history, recent-statistics, style-template, analysis-history, entity-tab-registry)
- ~~`[ux]` 토스트 메시지 기존 19곳 점진적 `TOAST.*` 마이그레이션~~ — 완료 (12파일, ~35곳)
- `[ux]` ChatBubble 공통 컴포넌트 추출 — chatbot 페이지 미완성, 역할 확정 후 진행. Hub/GraphStudio/FollowUp 3곳 독립 구현 중.
- ~~`[quality]` 공통 `WarningBanner` 컴포넌트 추출~~ — 완료 (Alert warning variant + WarningBanner 래퍼, 3곳 마이그레이션 + 경량 컨텍스트 컬럼 제한 추가)
- `[quality]` `isQuotaExceededError()` 유틸 추출 — 현재 1곳, quota-aware 스토리지 모듈 추가 시 `local-storage-factory.ts`에 추출
- `[perf]` `ensureUser` INSERT OR IGNORE 매 요청 실행 — KV 캐시 또는 첫 요청만 실행으로 최적화
- `[a11y]` 접근성 일괄 패스 — AiInterpretationCard expand 버튼 `aria-expanded` 누락, 서브컴포넌트 `prefersReducedMotion` 미적용. 이 컴포넌트만 수정하면 전체 수준과 불일치 → 전체 감사 후 일괄 적용
- `[analysis]` intent-router 0.6 임계값 검증 — "추천" 단독 입력(0.65)이 LLM을 생략. 사용 로그 수집 후 데이터 기반 재검토 필요. 현재는 latency 우선으로 유지

### 3-E. Bio-Tools 확장

**Fisheries 2차 (차트):**
- ~~`[bio]` VBGF 성장곡선 차트~~ — 완료 (산점도 + 적합곡선, analyzedCols 스냅샷 패턴)
- ~~`[bio]` Length-Weight log-log 산점도~~ — 완료 (회귀선 + 관측값 + 수식 표시)
- ~~`[bio]` Condition Factor 히스토그램~~ — 완료 (√n bins + mean/median 참조선)

**HW/Fst 2차:**
- ~~`[bio]` HW Exact Test (소표본, N<25)~~ — 완료 (Wigginton 2005 재귀 구현, worker9-genetics.py)
- ~~`[bio]` Fst permutation p-value~~ — 완료 (v2 genotype 입력 + Phipson-Smyth 보정)
- ~~`[bio]` Fst bootstrap 95% CI~~ — 완료 (locus 복원추출 + ratio-of-sums)
- `[bio]` Fst long-format CSV 지원 — population/locus/allele/count 4컬럼 입력
- `[bio]` HW `inEquilibrium` 단형성 시 의미 명확화 — 현재 True 반환되나 검정 불가. UI에서 isMonomorphic으로 mask하지만 API 계약 개선 여지

**Bio-Tools 코드 품질 (보류):**
- `[bio]` `getBioToolWithMeta` 편의 함수 — 15개 페이지에서 `getBioToolById` + `getBioToolMeta` 이중 호출 패턴을 단일 함수로 통합. ID 불일치 리스크 제거.
- `[bio]` `BioToolId` union 타입 도입 — `(typeof BIO_TOOLS)[number]['id']`로 추출, `getBioToolById`/`getBioToolMeta`에 적용. 타입 안전성 강화 + metadata 누락 컴파일 타임 감지.
- `[bio]` `relatedTools` 소비처 구현 또는 제거 — metadata에 정의되어 있으나 UI에서 미사용. "관련 도구" 추천 UI 구현 예정이면 유지, 아니면 제거.

**Bio-Tools 공통 개선:**
- ~~`[bio]` Bio-Tools 배지 클래스 토큰화~~ — 완료 (`BIO_BADGE_CLASS` 추출, 8페이지 9곳 마이그레이션)
- `[bio]` Bio-Tools 결과 프로젝트 연결 — `ProjectEntityKind`에 `'bio-tool-result'` 추가 + 저장 시 `upsertProjectEntityRef` 호출
- ~~`[bio]` Worker 9 계산 정확성 골든 테스트~~ — 완료 (HW 8케이스 + Fst 7케이스, JSON + Vitest 스키마 + Pyodide 러너 확장)
- `[bio]` Worker 9 골든 테스트 확장 — exactPValue 직접 검증, v2 genotype Fst permutation/bootstrap 경로 커버, HW/Fst 입력 검증 에러 케이스 추가
- `[bio]` v1/v2 global Fst 계산 차이 문서화 — v1 mean(pairwise) vs v2 ratio-of-sums, 동일 데이터에서 다른 결과 가능. 사용자 혼동 방지 필요
- `[bio]` SVG 차트 보일러플레이트 공통 추출 — 7개 Bio-Tools 차트가 동일 레이아웃 상수(viewBox 400x300, margin 50/20, plot 320x230) 반복. `BioSvgChartFrame` 컴포넌트 또는 상수 추출
- `[bio]` 대용량 scatter 포인트 제한 — VBGF/Length-Weight에서 10K+ 행 시 SVG circle 과다. 샘플링 또는 Canvas 전환

### 3-F. 기타 (genetics, infra, domain, paper)

- ~~`[genetics]` 다중 FASTA 시퀀스 혼합 미감지~~ — 완료 (early-exit 헤더 스캔 + 테스트 17개)
- ~~`[genetics]` deep-link 복원 실패 시 UI 피드백 없음~~ — 완료 (에러 배너 + URL 정리 + "새 분석 시작" 버튼)
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
- `[ux]` 사이드바 IA 재구성 — "홈"에 Analysis가 숨겨져 있어 발견성 낮음, "유전적 분석"이 Bio-Tools 밖에 독립 메뉴, 섹션/기능/예정 레벨 혼재. 네비게이션 계층 재설계 필요.
- `[ux]` Bio-Tools 컬럼 Combobox — `pnpm add cmdk` + `command.tsx` 생성 → 컬럼 select를 검색 가능 Combobox로 업그레이드 (Phase 3에서 Select로 통일 후 후속)
- `[ux]` Command Palette (Cmd+K) — 43개 분석 메서드 + 16개 Bio 도구 + Graph Studio 빠른 접근. 검색·탐색 UX 대폭 향상.
- `[ux]` 키보드 단축키 — `Ctrl+Enter` 분석 실행, `Escape` 뒤로, `Ctrl+S` 저장/내보내기
- `[ux]` Bio-Tools 결과 내보내기 — 현재 0개. 최소 "테이블 복사" / "CSV 다운로드" 버튼
- `[ux]` Bio-Tools 샘플 데이터 — Graph Studio처럼 "샘플로 시작" 옵션 (신규 사용자 마찰 감소)
- `[ux]` Bio-Tools data-testid + aria-label 추가 — E2E 테스트 + 접근성 보강
- `[ux]` 콘텐츠 밀도 검토 — `py-8 space-y-6`이 전문 도구에 느슨할 수 있음. `py-6 space-y-4` 비교 테스트
- `[ux]` Bio-Tools 데이터 프리뷰 — 업로드 후 분석 전 5행 미리보기 (Analysis Step 1과 일관)
- `[ux]` 사이드바 My Menu — 메뉴 항목 순서 이동(드래그) 및 즐겨찾기 고정 기능. 현재 "My Menu (예정)" 플레이스홀더 존재 (`app-sidebar.tsx`).
- `[architecture]` 모노레포 전환 트리거 모니터링 — `domains/` 분리: 빌드 5분 초과 또는 팀 분할 시. `packages/` 승격: 2번째 앱 등장 시. 상세: [REVIEW-MONOREPO-ARCHITECTURE.md](docs/REVIEW-MONOREPO-ARCHITECTURE.md)
- `[architecture]` 프로젝트 연결 DB 동기화 강화 — Phase 16 (Workers 동적 배포) 시 D1 연동. 현재 localStorage `ProjectEntityRef` 레이어는 동작 중
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