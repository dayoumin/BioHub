# BioHub TODO

**Last updated**: 2026-03-21
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

- `[workflow]` Finalize the user-facing definition of `ResearchProject` as one research unit above individual pages and tools.
- `[workflow]` Define the UX rule for project context vs standalone mode before adding more save-time prompts.
- `[workflow]` Add visible project entry points such as project list, project switcher, or project overview so the concept is explicit in the app.
- `[workflow]` Define a single `ResearchProject` model shared by chat, analysis history, Graph Studio, and paper draft flows.
- `[workflow]` Define canonical ids and relationships for `projectId`, `analysisId`, `figureId`, and draft section references.
- `[workflow]` Decide the source of truth for project-linked records across local storage, IndexedDB, and adapter-based persistence.
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
- `[ux]` 접근성 focus ring 통일 (`focusRing` 상수 → 기존 5곳 점진 교체)
- `[ux]` 토스트 메시지 기존 19곳 점진적 `TOAST.*` 마이그레이션
- `[ux]` ChatBubble 공통 컴포넌트 추출
- `[ux]` paper-draft/PaperDraftPanel.tsx 데드 코드 삭제

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

- `[review]` Do not implement acceptance probability prediction.
- `[workflow]` Do not expand disconnected AI features before the shared project model exists.
- `[paper]` Do not overbuild manuscript automation before analysis, figure, and provenance linkage is stable.
- `[domain]` Do not expose legal-status outputs without source metadata and checked-date support.

---

## 6. Suggested execution order

1. Project UX rule and visible project structure
2. Shared `ResearchProject` model
3. Shared ids and persistence rules
4. Evidence/provenance schema
5. Analysis-to-graph linkage
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