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

### Foundation completed

The shared model and storage foundation are partially in place.

Implemented:

- shared `ResearchProject`, `ProjectEntityRef`, and `EvidenceRecord` types
- project storage for research-level records (localStorage: `research/project-storage.ts`)
- D1 database schema (`projects`, `project_entity_refs` tables with FK cascades)
- Worker API: `/api/projects` CRUD + `/api/entities/link` entity linking
- `HistoryRecord.projectId`
- `GraphProject.projectId` and `GraphProject.analysisId`
- result-to-graph handoff carrying analysis and project linkage
- project/entity reference creation for figures and saved analyses

### Storage divergence (current risk)

The chatbot module has two storage backends that are out of sync:

- `/chatbot/page.tsx` reads and writes via `ChatStorageIndexedDB`
- `ProjectDialog.tsx` and `MoveSessionDialog.tsx` use `ChatStorage` (localStorage)
- `ResearchProject` sync (`toResearchProject()`) exists only in the localStorage `ChatStorage`
- `ChatStorageIndexedDB` has no `ResearchProject` sync

This means chat-originated projects may not propagate to the research project storage depending on which code path creates them. This must be resolved before adding a unified project switcher.

### Naming collision with Graph Studio

Graph Studio already uses "project" to mean "graph document":

- `?project=<id>` query parameter restores a `GraphProject` (graph-studio/page.tsx)
- `currentProject` / `currentProjectId` in `graph-studio-store` refers to `GraphProject`
- `graph-studio/project-storage.ts` manages `GraphProject` records

Any new global project context must use a distinct name (e.g. `activeResearchProjectId`) to avoid collision with Graph Studio's existing `project` semantics.

### Type system gap

`ProjectEntityKind` is defined in two places with different values:

- `packages/types/src/project.ts`: includes `blast-result` and `sequence-data`
- `stats/lib/types/research.ts`: only 8 kinds (missing `blast-result`, `sequence-data`)

The shared package is ahead of the stats app. Before declaring "all output types supported", the stats app type must be aligned or deprecated in favor of the shared package type.

### Current UI experiment

A save-time project selection dialog was added in the results step (ResultsActionStep).

That implementation is technically valid, but product-wise it is premature:

- the project concept exists in data and storage
- but it is not yet clearly expressed in the app information architecture
- so the dialog appears before users understand the concept

The data model direction is correct. The current save UX is provisional and will be replaced by context-aware saving.

---

## 4. Current state summary

### Done enough to continue

- project-centered data model exists
- D1 schema and Worker API are operational
- analysis and figure linkage has started
- project refs are being recorded
- project as a top-level concept is now technically feasible

### Not done yet

- clear top-level project navigation
- project home or overview screen
- consistent project entry flow across pages
- project-scoped manuscript flow
- project-scoped species/legal outputs
- evidence records attached to major AI outputs
- clear UX rule for when project selection should appear

### Implementation risks to resolve first

1. **Storage divergence**: unify ChatStorage and ChatStorageIndexedDB project handling, or decouple research projects from chat projects entirely
2. **Naming collision**: use `activeResearchProjectId` (not `activeProjectId`) for the global project context store
3. **Type alignment**: sync `ProjectEntityKind` between `stats/lib/types/research.ts` and `packages/types/src/project.ts`
4. **IA duplication**: `/chatbot` already has project management UI (`ProjectsSection`). Adding `/projects` requires either absorbing or scoping down the chatbot project UI to avoid duplicate information architecture

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

### Phase 3. Context-aware behavior — BLOCKED on module stabilization

7. Wire statistics save to auto-link `activeResearchProjectId`
8. Wire Graph Studio figure save to auto-link
9. Wire genetics BLAST save to auto-link
10. Implement toast-based save feedback (auto-link confirmation + override link)
11. Replace ResultsActionStep project selection popup with context-aware behavior

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
