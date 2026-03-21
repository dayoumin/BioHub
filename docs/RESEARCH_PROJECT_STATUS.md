# BioHub Research Project Status

**Last updated**: 2026-03-21  
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
- later reviewer notes and evidence records

### Important rule

`ResearchProject` should be available, but not forced.

Single-use analysis flows should still work without requiring project setup.

---

## 3. What has been done

### Foundation completed

The shared model and storage foundation are now in place.

Implemented:

- shared `ResearchProject`, `ProjectEntityRef`, and `EvidenceRecord` types
- project storage for research-level records
- `HistoryRecord.projectId`
- `GraphProject.projectId`
- `GraphProject.analysisId`
- result-to-graph handoff carrying analysis and project linkage
- project/entity reference creation for figures
- project/entity reference creation for saved analyses

### Existing project source reuse

Current chat-style projects are being reused as the early project shell.

This means:

- project metadata can already exist
- analysis and graph outputs can start linking to a common project id
- migration can stay small while the model matures

### Current UI experiment

A save-time project selection dialog was added in the results step.

That implementation is technically valid, but product-wise it is still premature.

Reason:

- the project concept exists in data and storage
- but it is not yet clearly expressed in the app information architecture
- so the dialog appears before users understand the concept

Conclusion:

The data model direction is correct.  
The current save UX is provisional and should be revised.

---

## 4. Current state summary

### Done enough to continue

- project-centered data model exists
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

---

## 5. Immediate next steps

These should happen next, in this order.

### Step 1. Clarify the project UX

Decide the user-facing rule:

- when is the user "inside a project"?
- when should saving be automatic into the active project?
- when should the user be asked?
- when should no prompt appear at all?

Recommended direction:

- if the user is already inside a project context, save into that project silently
- if the user is not in a project context, allow standalone save
- do not interrupt every save with a selection dialog by default

### Step 2. Add a visible top-level project structure

Before pushing project selection deeper into the product, BioHub needs visible project structure such as:

- project list
- project switcher
- project summary or dashboard
- project-level related outputs list

Without this, project linkage feels hidden and arbitrary.

### Step 3. Define project context propagation

Pages need a consistent way to know the current active project:

- statistics page
- Graph Studio
- paper draft
- future species/legal pages

This likely means adding an explicit project context/store or route-based project state.

### Step 4. Normalize project-linked save behavior

Once project context exists:

- statistics saves should inherit active `projectId`
- graph saves should inherit active `projectId`
- draft saves should inherit active `projectId`
- cross-links should update without extra prompting

---

## 6. After that

Once project context is visible and stable, the next layer should be built.

### Near-term product expansion

- project-level draft assembly
- project-level analysis and figure browser
- project-linked species validation outputs
- project-linked legal status outputs
- project-linked reviewer package structure

### Trust layer expansion

- evidence records on AI interpretation
- source snapshots for species/legal outputs
- reproducible code records
- reviewer-facing reasoning and method trace

---

## 7. Later plan

These should happen after the project model and trust model are stable.

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

## 9. Suggested implementation sequence from here

1. Document and decide project UX rules.
2. Introduce visible project navigation or project overview.
3. Add project context propagation across pages.
4. Replace the provisional save dialog behavior with context-aware saving.
5. Extend project linkage to draft, species, and legal outputs.
6. Attach evidence and provenance to major project outputs.
7. Build reviewer-ready packaging on top of linked project records.

---

## 10. Definition of success for this phase

This phase is successful when:

- users understand what a research project is
- a project is visible as a top-level organizing unit
- analysis, figures, and drafts can belong to the same project
- project linking does not feel surprising
- standalone flows still work
- later trust and reviewer features can be built on top of this structure
