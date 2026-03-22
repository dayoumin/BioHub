# BioHub TODO

**Last updated**: 2026-03-22
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
- `[workflow]` 각 모듈 저장 시 활성 프로젝트 auto-link (통계·그래프) — 유전적 분석 완료, 나머지 Phase 3
- `[workflow]` 토스트 기반 저장 피드백 (`'{projectName}'에 저장됨 · 변경` / `프로젝트에 추가`) — Phase 3
- `[workflow]` `ResultsActionStep` 프로젝트 선택 팝업 → 컨텍스트 기반 동작으로 교체 — Phase 3
- `[trust]` Define an `EvidenceRecord` or provenance schema for AI interpretation outputs.
- `[trust]` Persist method rationale, key statistical context, and generation metadata with saved interpretation results.
- `[trust]` Design reproducible code payload generation for core analysis flows in R and/or Python.
- `[graph]` Link Graph Studio project records and exported figures to `projectId` and `analysisId`.
- `[graph]` Ensure result-to-graph handoff preserves enough metadata for later draft and review use.
- `[domain]` Define source-aware record schema for species validation results.
- `[domain]` Define source-aware record schema for legal/protected status results, including checked date and jurisdiction.
- `[paper]` Define project-level draft assembly model so multiple analyses can contribute to one manuscript structure.
- `[docs]` Align implementation docs that still assume isolated module flows with the new project-centered model.

---

## 3. Next

These should start after the current foundation is in place.

- `[paper]` Build project-level manuscript assembly UI across multiple analyses.
- `[paper]` Add figure and table references that can be inserted into draft sections.
- `[review]` Define a project-level methods and reporting completeness checklist.
- `[review]` Define reviewer-ready export bundle structure.
- `[review]` Add journal format review and fit review workflow.
- `[review]` Design reviewer simulator inputs and output schema.
- `[domain]` Connect species and legal status outputs into manuscript and review flows.
- `[trust]` Add user-facing evidence cards to major AI-assisted outputs.
- ~~`[ux]` ResultsActionStep.test.tsx TDZ 에러~~ — 해결됨 (useEffect 위치 이동)
- `[ux]` AI 해석 실패 graceful degradation (`useErrorRecovery` 활용)
- `[test]` `use-analysis-handlers.test.ts` tsc 에러 2건 (TerminologyProviderProps children 누락, testName 미존재) — 기존 미수정
- `[test]` `graph-studio-store.test.ts` 전체 suite 실행 시 1건 실패 (단독 52/52 통과) — 테스트 순서 의존성
- `[quality]` `graph-studio/project-storage.ts`와 `research/project-storage.ts`의 `isClient()`·read/write 패턴 중복 — 저장소 추가 시 공통 팩토리 검토
- ~~`[quality]` `formatRelativeTime` 중복 4곳 → `formatTimeAgo` 공유 유틸로 교체~~ — 완료 (SessionItem, TemplateSelector, TemplateManagePanel, DataUploadStep → `format-time.ts`)
- `[ux]` 접근성 focus ring 통일 (`focusRing` 상수 → 기존 5곳 점진 교체)
- `[ux]` 토스트 메시지 기존 19곳 점진적 `TOAST.*` 마이그레이션
- `[ux]` ChatBubble 공통 컴포넌트 추출
- `[ux]` paper-draft/PaperDraftPanel.tsx 데드 코드 삭제
- ~~`[quality]` `barcoding/page.tsx` 에러 분기가 한국어 문자열 `includes()` 매칭 → 에러 코드 기반으로 전환~~ — 완료 (`BlastErrorCode` 타입 도입)
- ~~`[quality]` `session-sorter.ts` `sortSessionsByFavoriteAndRecent`가 `.sort()` in-place mutation → `[...sessions].sort()` 방어적 복사로 변경~~ — 완료
- ~~`[quality]` `NextAction.type` 미사용 필드 제거~~ — 완료 (인터페이스 + 할당 10곳 정리)
- ~~`[quality]` genetics 모듈 raw `<button>` 16개 → shadcn `Button` 전환~~ — 완료 (6파일)

---

## 4. Later

These are valid directions, but not current execution priorities.

- `[review]` Implement reviewer simulator after checklist and reviewer package foundations are stable.
- `[domain]` Expand external domain integrations beyond baseline validation flows.
- `[paper]` Add stronger project-wide draft synthesis and section merge assistance.
- `[trust]` Expand reproducible code export to more advanced analysis paths.
- `[workflow]` Add richer project dashboard and project health summary.
- `[domain]` Add stronger citation and traceability support for domain records in downstream outputs.
- `[review]` Add figure and table compliance review against journal expectations.
- `[workflow]` Add project-level collaboration or sharing concepts if storage architecture supports it.

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
4. 컨텍스트 기반 자동 저장 (토스트 + override) — 모듈 안정 후
5. Evidence/provenance schema
6. Species/legal source-aware records
7. Project-level draft assembly model
8. Reviewer checklist and export bundle
9. Reviewer simulator

---

## 7. Definition of done for the current cycle

The current cycle should be considered successful when:

- project-linked analysis, figure, and draft records are defined consistently
- provenance can be stored with important AI outputs
- species/legal outputs have source-aware metadata
- graph outputs can be traced back to project and analysis context
- the paper workflow can be designed on top of shared project records instead of isolated module state