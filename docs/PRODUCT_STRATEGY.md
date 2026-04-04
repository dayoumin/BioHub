# BioHub Product Strategy

**Last updated**: 2026-04-04
**Scope**: Product-level strategy across Smart Flow, Graph Studio, bio domain tools, species validation, and paper workflow

---

## 1. Why this document exists

`docs/PLATFORM_VISION.md` describes the long-term product vision.

This document fills the gap between vision and execution:

- what BioHub is becoming
- what must be built first
- what should wait
- how strategy should map into `ROADMAP.md` and `TODO.md`

This is the decision document for prioritization.

---

## 2. Product definition

BioHub is not just a paper writing tool.

BioHub should be positioned as a:

**trusted research workflow platform for biology and marine research**

Core value:

- domain-specific analysis
- domain-specific validation
- reproducible outputs
- reviewer-ready research packaging

This means the product should optimize for:

- trust over generic AI convenience
- workflow continuity over isolated features
- domain depth over broad but shallow coverage

---

## 3. Product positioning

### What BioHub is

- a research workflow platform
- a biology and marine domain research assistant
- a reproducible analysis and manuscript preparation system

### What BioHub is not

- a generic writing assistant
- a generic chatbot for papers
- a journal acceptance prediction tool

Note:

Journal fit review is useful.
Acceptance probability prediction is not a priority and should not be a core feature.

---

## 4. Strategic pillars

### Pillar A. Trustable AI

Every important AI output should be inspectable and grounded.

Required product traits:

- analysis rationale is visible
- statistical method choice is explainable
- source databases are shown
- validation date or snapshot is stored
- reproducible code can be generated
- reviewer-facing explanation can be generated

This is the highest-priority strategic pillar.

### Pillar B. Workflow lock-in

Researchers should be able to move from raw data to submission-ready material without leaving the platform.

Target workflow:

1. upload or connect data
2. validate data
3. run analysis
4. create figures
5. interpret results
6. validate species and legal status
7. assemble paper-ready content
8. run review checklist
9. export for submission

### Pillar C. Domain moat

BioHub should win where general AI tools are weak.

Primary domain moat:

- scientific name validation
- biology and marine domain terminology
- legal and protected status information
- domain-specific research context
- future integration across WoRMS, GBIF, OBIS, CITES, CMS, and related sources

### Pillar D. Data continuity

The platform should become more valuable as users accumulate work.

Required continuity objects:

- research projects
- analysis history
- chart history
- manuscript draft history
- evidence and provenance history

---

## 5. The product thesis

BioHub should create value through this chain:

**data -> validated analysis -> explainable interpretation -> domain verification -> AI-ready package -> SOTA AI 논문 생성 -> 사람 최종 편집**

This is stronger than:

- "AI writes your paper"
- "AI suggests a chart"
- "AI explains p-values"

Those are useful features, but they are not the moat.

---

## 6. Current product focus

### Focus now

Build the trust and workflow foundation first.

Priority outcomes:

- project-centered workflow
- evidence and provenance layer
- reproducible code generation
- chart and analysis linkage
- species/legal status linkage into research outputs

### Focus next

자료 작성(AI Export) — 분석 결과를 구조화된 패키지로 내보내기. 외부 SOTA AI로 논문 초안 생성.

Priority outcomes:

- AI-ready 패키지 export (Package Assembly)
- SOTA 모델 검증 (Claude/GPT/Gemini로 실제 초안 품질 테스트)
- 결과 ↔ 논문 섹션 매핑 + 태깅
- 분야별 프롬프트 템플릿
- 문헌 통합검색을 자료 작성 하위 탭으로 통합

### Focus after

자체 AI 논문 생성 — SOTA 검증으로 파이프라인이 안정화되면, API 연동으로 BioHub 내부에서 직접 초안 생성.

Priority outcomes:

- Claude/GPT API 연동 → 원클릭 초안 생성
- AI 초안 ↔ 원본 수치 자동 대조
- 리뷰어 체크리스트 + 저널 포맷 적합성 검토

### Focus later

Only after trust and workflow are strong enough:

- research ideation
- hypothesis suggestions
- next experiment proposals
- 연구동향 모니터링 (키워드 기반 트렌드 수집)
- broader literature automation

---

## 7. Strategic priorities by horizon

### Horizon 1. Foundation

Must be built first.

- unify project model across chat, analysis, graph, and paper draft
- attach provenance to analysis outputs
- generate reproducible R or Python code
- persist figure-to-analysis relationships
- show source metadata for species/legal outputs
- create reviewer-ready export structure

### Horizon 2. Review readiness

Build after the foundation works reliably.

- reviewer simulator
- manuscript completeness checks
- journal style adaptation
- figure/table compliance review
- methods and reporting checklist

### Horizon 3. Research copilot

Build only after Horizon 1 and 2 are credible.

- insight generation
- follow-up experiment suggestions
- cross-analysis synthesis
- idea generation from accumulated project context

---

## 8. What to avoid right now

- acceptance probability prediction
- broad generic writing features with no domain advantage
- isolated AI features with weak grounding
- building too many disconnected modules before the project model is unified

---

## 9. Product architecture direction

The product should converge on this logical model:

```text
Research Project
  -> Data Assets
  -> Analysis Runs
  -> Figures
  -> Domain Validation Records
  -> Legal Status Records
  -> Draft Sections
  -> Review Reports
  -> Export Bundles
```

Every major output should be traceable back to:

- input data
- method selection
- model or rule used
- external source used
- generation time

Important clarification:

- pages such as statistics, Graph Studio, paper draft, species validation, and legal status review are tools
- `ResearchProject` is the top-level research unit above those tools
- project-linked UX should be driven by visible project context, not by isolated prompts that appear before the concept is clear

---

## 10. Documentation policy

### `docs/PLATFORM_VISION.md`

Use for:

- long-term product vision
- product identity
- major platform direction

Should change rarely.

### `docs/PRODUCT_STRATEGY.md`

Use for:

- product thesis
- strategic pillars
- what to build now / next / later
- prioritization rules

Should change when strategy changes.

### `ROADMAP.md`

Use for:

- phased delivery plan
- medium-term milestones
- major initiatives by phase

Should answer: "what are we building over the next phases?"

### `docs/RESEARCH_PROJECT_STATUS.md`

Use for:

- the meaning of `ResearchProject`
- current implementation status of the project-centered workflow
- what has been done already
- what should happen next from a product and UX standpoint

Should answer: "where are we now with the project-centered model, and what is the next concrete step?"

### `TODO.md`

Use for:

- concrete execution items
- current sprint or active backlog
- implementation-level next actions

Should answer: "what do we do next in code and product work?"

---

## 11. How strategy should map into roadmap

`ROADMAP.md` should be updated to reflect these product streams:

- Stream 1. Trust and reproducibility
- Stream 2. Project-centered workflow
- Stream 3. Domain intelligence
- Stream 4. Reviewer-ready manuscript workflow

Recommended roadmap pattern:

1. Foundation
2. Workflow integration
3. Reviewer readiness
4. Domain expansion
5. Research copilot

---

## 12. How strategy should map into todo

`TODO.md` should only contain near-term executable items.

Recommended top sections:

- Now
- Next
- Later
- Blocked

Recommended tagging:

- `[trust]`
- `[workflow]`
- `[domain]`
- `[review]`
- `[graph]`
- `[paper]`

Example:

- `[trust]` Add provenance payload to saved analysis history
- `[workflow]` Link Graph Studio charts to analysis ids and project ids
- `[domain]` Persist source metadata for species validation results
- `[paper]` Add project-level draft assembly model
- `[review]` Design reviewer checklist payload

---

## 13. Immediate next planning actions

1. Define a single `ResearchProject` model used across analysis, graph, chat, and draft flows.
2. Define an `EvidenceRecord` or provenance schema for AI and domain outputs.
3. Add roadmap initiatives for trust, workflow integration, and reviewer readiness.
4. Rewrite todo into short-horizon execution items only.
5. Treat reviewer simulation as a second-phase feature, not a foundation feature.

---

## 14. Naming recommendation

Recommended file naming:

- keep: `docs/PLATFORM_VISION.md`
- add: `docs/PRODUCT_STRATEGY.md`
- keep: `ROADMAP.md`
- keep: `TODO.md`

Do not create another `VISION.md`.

Reason:

- vision already exists
- strategy is the missing layer
- roadmap and todo should remain execution documents, not become strategy documents
