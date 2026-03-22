# BioHub Research Project Status

**Last updated**: 2026-03-22
**References**: [Platform Vision](PLATFORM_VISION.md), [Product Strategy](PRODUCT_STRATEGY.md), [Research Data Model](RESEARCH_DATA_MODEL.md), [Roadmap](../ROADMAP.md), [TODO](../TODO.md)

---

## 1. Purpose

This document explains what `ResearchProject` means in BioHub, how far the current implementation has progressed, what should happen next, and what comes later.

This is the execution-status document for the project-centered workflow.

---

## 2. Definition

### What `ResearchProject` means

A `ResearchProject` is one research unit.

Examples:

- one manuscript
- one field survey
- one species validation study
- one experiment series

Within that one project, BioHub should collect related outputs from multiple tools and pages.

### What pages mean

Pages such as:

- statistics
- Graph Studio
- paper draft
- species validation
- legal status review

are work tools, not projects.

The intended model is:

**one research project -> many tool outputs**

Examples of outputs inside one project:

- analysis histories
- figures
- interpretation records
- draft sections
- species validation records
- legal status checks
- BLAST results and sequence data
- later reviewer notes and evidence records

### Important rule

`ResearchProject` should be available, but not forced.

Single-use analysis flows should still work without requiring project setup.

---

## 3. What has been done

### Foundation — complete

- shared `ResearchProject`, `ProjectEntityRef`, `EvidenceRecord` types
- project storage (localStorage: `research/project-storage.ts`)
- D1 schema (`projects`, `project_entity_refs` tables with FK cascades)
- Worker API: `/api/projects` CRUD + `/api/entities/link`
- `HistoryRecord.projectId` + `upsertProjectEntityRef` on save/delete
- `GraphProject.projectId` + `upsertProjectEntityRef` on save
- `AnalysisHistoryEntry.projectId` (genetics BLAST) + ref 연동
- result-to-graph handoff carrying analysis and project linkage

### Core infrastructure — complete

- `useResearchProjectStore` (zustand + localStorage persist)
- `/projects` page (list, create, rename, archive, delete)
- Sidebar project switcher (dropdown + active project display)

### Context-aware save — complete

- Statistics: `activeResearchProjectId` 자동 연결, 토스트 피드백
- Graph Studio: `activeResearchProjectId` fallback, `upsertProjectEntityRef`
- Genetics BLAST: `activeResearchProjectId` 자동 연결
- `ResultsActionStep` 프로젝트 선택 팝업 → 컨텍스트 기반 동작으로 교체

### Chatbot IA — complete

- `ChatStorage`/`ChatStorageIndexedDB` 분기 해소 (IndexedDB 일원화)
- `toResearchProject()` 동기화 제거 (연구 프로젝트와 채팅 프로젝트 분리)
- `ProjectDialog`/`MoveSessionDialog` dumb dialog 전환 (props 기반, 비동기 에러 처리)
- 챗봇 역할 미확정 → 추가 개발 보류

### Resolved risks

1. ~~Storage divergence~~ — 해소 (IndexedDB 일원화, `ChatStorage` 직접 호출 제거)
2. ~~Naming collision~~ — 해소 (`activeResearchProjectId` 사용, Graph Studio `currentProjectId` 유지)
3. ~~Type alignment~~ — 해소 (`stats/lib/types/research.ts` → `@biohub/types` re-export)
4. ~~IA duplication~~ — 해소 (chatbot 프로젝트 UI 축소, `/projects` 페이지 분리)

### Remaining type issue

`@biohub/types`의 `Project` 인터페이스는 `createdAt: number` (Unix ms)을 사용하지만, `stats/lib/types/research.ts`의 `ResearchProject`는 `createdAt: string` (ISO 8601)을 사용한다. D1 마이그레이션 전에 통일 필요.

---

## 4. Current state summary

### Complete (Phase 1–3)

- project-centered data model + storage + D1 schema + Worker API
- top-level project navigation (sidebar switcher + `/projects` page)
- context-aware auto-link (통계·그래프·유전적 분석)
- UX rule 확정 (Decision D–H)
- implementation risks 4건 모두 해소

### Not done yet (Phase 4–5)

- project detail/overview screen (linked outputs 브라우저)
- project metadata editor (domain, tags, paper config)
- project-scoped manuscript assembly
- project-scoped species/legal outputs
- evidence records attached to AI outputs
- reviewer package + checklist

### Remaining technical issue

- `@biohub/types` `Project.createdAt: number` vs `research.ts` `ResearchProject.createdAt: string` — 타임스탬프 타입 불일치, D1 마이그레이션 전 통일 필요

---

## 5. Confirmed UX decisions

These decisions are confirmed as of 2026-03-22.

### Decision D. Project entry point — sidebar switcher + `/projects` page

The sidebar gets a project switcher at the top (dropdown showing active project name). A dedicated `/projects` page handles project list, creation, and overview.

The current `/chatbot` project UI (`ProjectsSection`) will be scoped down to chat-session organization only, not research project management. Research project management moves to `/projects`.

### Decision E. Project context propagation — global zustand store

A global zustand store holds `activeResearchProjectId`, persisted to localStorage.

- All pages (statistics, Graph Studio, genetics, paper draft) read the active project from this store
- The sidebar switcher reads and writes this store
- Graph Studio's existing `currentProjectId` (which means `GraphProject`) is unaffected
- URL-based or route-based project context is not used

### Decision F. Save behavior — auto-link with override

When a project is active:

- new outputs (analysis, graph, BLAST result) auto-link to the active project
- a toast confirms: `"'{projectName}'에 저장됨 · 변경"` — the "변경" link opens a reassignment dialog
- no selection popup interrupts the flow

When no project is active:

- outputs save standalone (no project link)
- a toast offers: `"프로젝트에 추가"` link for optional assignment

### Decision G. Standalone mode — basic tools standalone, assembly requires project

These work without a project:

- individual statistical analysis
- single graph creation
- BLAST species identification
- species name validation
- legal status check

These require an active project:

- manuscript assembly (linking multiple analyses into one draft)
- reviewer package generation
- cross-analysis synthesis

### Decision H. Output scope — all types included, chat sessions optional

All research outputs belong to projects when a project is active:

- statistical analysis results
- Graph Studio figures
- BLAST / genetic analysis results
- species validation records
- legal status checks
- paper draft sections

AI chat sessions are optionally linkable but not auto-linked. Chat sessions are exploratory and not always research deliverables.

---

## 6. Implementation sequence

### Phase 1. Prerequisites (before any UI) — DONE

1. ~~Align `ProjectEntityKind`~~ — stats re-exports from `@biohub/types`
2. ~~Decide chat project fate~~ — decoupled: `toResearchProject()` sync removed from `ChatStorage`
3. ~~Reserve `activeResearchProjectId` naming~~ — confirmed no collision

### Phase 2. Core infrastructure — DONE

4. ~~`useResearchProjectStore`~~ — `research-project-store.ts` (zustand + localStorage persist)
5. ~~`/projects` page~~ — list, create, rename, archive, delete
6. ~~Sidebar project switcher~~ — dropdown with active project display

### Phase 3. Context-aware behavior — DONE

7. ~~Wire statistics save to auto-link `activeResearchProjectId`~~ — 완료
8. ~~Wire Graph Studio figure save to auto-link~~ — 완료 (activeResearchProjectId fallback)
9. ~~Wire genetics BLAST save to auto-link~~ — 완료 (projectId + upsertRef + batch removeRefs)
10. ~~Toast-based save feedback~~ — 완료 (통계: 프로젝트명 표시)
11. ~~ResultsActionStep project selection popup → context-aware~~ — 완료

### Phase 4. Project overview

12. Project detail page — linked outputs browser (analyses, figures, drafts, BLAST results)
13. Project metadata editor (name, description, domain, tags, paper config)
14. Quick actions from project overview (start new analysis, create graph, etc.)

### Phase 5. Assembly features (project required)

15. Project-level manuscript assembly UI
16. Figure and table references in draft sections
17. Reviewer package structure
18. Methods and reporting completeness checklist

---

## 7. After that

Once project context is visible and stable, the next layer should be built.

### Trust layer expansion

- evidence records on AI interpretation
- source snapshots for species/legal outputs
- reproducible code records
- reviewer-facing reasoning and method trace

### Later plan

These should happen after the project model and trust model are stable:

- reviewer checklist
- reviewer-ready export bundle
- reviewer simulator
- journal fit review
- project dashboard health summary
- cross-analysis synthesis inside one project

These depend on the project layer being reliable first.

---

## 8. Product decision notes

### Decision A. `ResearchProject` is necessary

This is not optional if BioHub is becoming a research workflow platform.

Without a shared project unit:

- analysis remains isolated
- figures remain isolated
- drafts remain isolated
- trust and review workflows cannot be organized coherently

### Decision B. current popup is not the final UX

The current project selection prompt in results is an early implementation, not the final interaction model.

The final UX should be driven by project context, not by repeated ad hoc save prompts.

### Decision C. project should stay opt-in

BioHub should support both:

- quick standalone analysis
- project-based multi-step research workflow

That flexibility is important.

---

## 9. Definition of success for this phase

This phase is successful when:

- users understand what a research project is
- a project is visible as a top-level organizing unit
- analysis, figures, and drafts can belong to the same project
- project linking does not feel surprising
- standalone flows still work
- later trust and reviewer features can be built on top of this structure
