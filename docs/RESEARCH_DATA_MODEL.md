# BioHub Research Data Model

**Last updated**: 2026-03-21
**References**: [Product Strategy](PRODUCT_STRATEGY.md), [Research Project Status](RESEARCH_PROJECT_STATUS.md), [Roadmap](../ROADMAP.md), [TODO](../TODO.md)

---

## 1. Purpose

This document defines the shared data model for BioHub's next product phase.

The immediate goal is to stop treating chat, analysis, graph, paper draft, and domain outputs as isolated records.

BioHub needs a shared project-centered model that supports:

- project continuity
- provenance and trust
- figure and draft linkage
- domain verification records
- reviewer-ready packaging

---

## 2. Core design decisions

### Decision A. `ResearchProject` becomes the top-level organizing unit

The platform should treat project as the common parent across:

- analysis history
- graph projects
- paper draft assembly
- species validation
- legal status checks
- review outputs

Important:

Project must remain `opt-in`.
Single analysis flows should still work without forcing project creation.

Also:

- pages and modules are tools
- `ResearchProject` is the cross-module parent unit
- user-facing project context should be visible before project-linked prompts become a default workflow

### Decision B. Existing records stay specialized

Do not replace existing records with one giant object.

Keep specialized records:

- `HistoryRecord`
- `GraphProject`
- `PaperDraft`
- chat session records

Instead, add shared linkage and provenance fields.

### Decision C. Provenance is a first-class record

Trust should not be embedded as scattered ad hoc metadata.

Use a shared `EvidenceRecord` type for:

- AI interpretation grounding
- external source tracking
- reproducible generation metadata
- reviewer-facing explanation support

---

## 3. Proposed type placement

### Shared cross-module types

Place in:

- `stats/lib/types/research.ts`

Why:

- this layer is shared by storage, graph, paper, and future domain services
- it is not specific to a single feature module
- it avoids putting product-wide model definitions inside `docs` only

### Existing type files that should reference the shared model

- `stats/lib/utils/storage-types.ts`
- `stats/types/graph-studio.ts`
- future project store or adapter files

### Existing type files that should remain feature-specific

- `stats/lib/types/chat.ts`
- `stats/lib/services/paper-draft/paper-types.ts`
- `stats/types/analysis.ts`

These files should link to the shared project model, not absorb it.

---

## 4. Canonical identifiers

The platform should standardize these ids:

- `projectId`
- `analysisId`
- `figureId`
- `draftId`
- `evidenceId`

Rules:

- `HistoryRecord.id` is the canonical `analysisId`
- `GraphProject.id` is the canonical `figureId` unless later split is needed
- project membership should be represented by `projectId`
- attached evidence should reference both the owner kind and owner id

---

## 5. Shared model

### `ResearchProject`

Purpose:

- top-level organizing record
- stores project metadata and product-level settings
- does not duplicate full analysis or figure payloads

Key fields:

- id
- name
- description
- status
- primary domain
- tags
- paper config
- created / updated timestamps

### `ProjectEntityRef`

Purpose:

- normalized link from a project to a specialized record
- lets the project refer to analyses, figures, drafts, review reports, and domain records without copying them

Key fields:

- projectId
- entityKind
- entityId
- label
- order
- createdAt

### `EvidenceRecord`

Purpose:

- provenance, grounding, and reproducibility layer
- attached to outputs rather than replacing them

Key fields:

- id
- owner kind and owner id
- evidence kind
- summary
- generator metadata
- input references
- source references
- generatedAt

---

## 6. Mapping to current records

### `HistoryRecord`

Should gain:

- `projectId?: string`
- `evidenceRecords?: EvidenceRecord[] | null`

Rationale:

- analysis results must belong to a project when needed
- interpretation and derived outputs need inspectable provenance

### `GraphProject`

Should gain:

- `projectId?: string`
- `analysisId?: string`

Rationale:

- figures must be linkable to both the project and the originating analysis

### `PaperDraft`

Keep as a feature-specific payload.

Do not merge it into `ResearchProject`.

Instead:

- store draft payload separately
- link it to project through project refs and existing analysis relationships

### `ChatProject`

Treat current chat project records as a legacy project shell.

Do not make `ChatProject` the long-term canonical project type.

Migration direction:

- either adapt it into `ResearchProject`
- or map it to a `ResearchProject` view model later

---

## 7. Storage direction

### Phase 1

Use the existing specialized stores, but add shared linkage fields:

- `HistoryRecord.projectId`
- `GraphProject.projectId`
- `GraphProject.analysisId`
- `HistoryRecord.evidenceRecords`

This keeps migration small.

### Phase 2

Add a dedicated project store or adapter-backed project table for `ResearchProject`.

Recommended records:

- `research_projects`
- `project_entity_refs`

### Phase 3

Move domain validation and review outputs into the same linked model.

---

## 8. Immediate implementation sequence

1. Add shared research types in `stats/lib/types/research.ts`.
2. Extend `HistoryRecord` with `projectId` and provenance support.
3. Extend `GraphProject` with `projectId` and `analysisId`.
4. Introduce a small project store around `ResearchProject`.
5. Update result-to-graph handoff to populate `analysisId`.
6. Update paper workflow to consume linked records instead of isolated state.

Implementation status and UX sequencing are tracked in:

- `docs/RESEARCH_PROJECT_STATUS.md`

---

## 9. Non-goals for this phase

- no acceptance probability model
- no collaboration system yet
- no heavy multi-user permission model yet
- no full replacement of existing chat project logic yet

---

## 10. Success criteria

This model is working when:

- one project can reference many analyses and figures
- one figure can be traced to its source analysis
- major AI outputs can expose evidence metadata
- species and legal outputs can later plug into the same project structure
- paper assembly no longer depends on disconnected local module state
