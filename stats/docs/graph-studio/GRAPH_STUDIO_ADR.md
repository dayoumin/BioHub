# ADR: Graph Studio Rendering Engine — Vega-Lite → ECharts

**Decision date:** 2026-02-27
**Document date:** 2026-02-28
**Status:** Implemented
**Context:** BioHub Statistical Platform, Graph Studio module

---

## 1. Context

Graph Studio is a data visualization module inside BioHub (Next.js 15 + TypeScript).
The original architecture used:

```
ChartSpec  →  chartSpecToVegaLite()  →  vega-embed (SVG)
```

`ChartSpec` is our internal neutral spec format (defined in `types/graph-studio.ts`).
`vega-embed` was dynamically imported as the renderer.

### Problem

We evaluated the 1-year outlook for each library (assessed 2026-02-27):

| Library | Version | Last Release | Notes |
|---------|---------|-------------|-------|
| Vega-Lite | v6.4.2 | Jan 2026 | Steady but low-bandwidth; ~1 release/quarter |
| Observable Plot | 0.6.x | ~Jan 2025 | **13-month release gap**, 98 PRs open, de-prioritized by Observable team |
| Apache ECharts | **v6.0.0** | Jul 2025 | ASF governance, very active, 65.8k GitHub stars |
| VegaFusion | 1.x | 2025 | Single-maintainer risk |

Vega-Lite's slow development pace and the Observable Plot hiatus both raised concerns about long-term viability.

---

## 2. Decision

**Replace vega-embed with Apache ECharts (via echarts-for-react) as the sole rendering engine.**

Additionally: **remove Vega-Lite as an intermediate format entirely.**

### Why remove Vega-Lite as an intermediate?

We initially considered keeping Vega-Lite as an AI generation intermediate:

```
User natural language → LLM → Vega-Lite JSON → vegaLiteToChartSpec() → ChartSpec → ECharts
```

But this was rejected because:
- It adds an extra conversion layer with no user-visible benefit
- Vega-Lite's schema is not better for LLM generation than our own ChartSpec
- Our ChartSpec is already well-documented and simpler for LLM prompting
- The `vegaLiteToChartSpec()` reverse converter would be complex and error-prone

**Final AI generation path:**
```
User natural language → LLM → ChartSpec JSON (directly)
```

---

## 3. New Architecture

```
ChartSpec  →  chartSpecToECharts()  →  ReactECharts (Canvas)
```

- `ChartSpec` remains the single source of truth (unchanged)
- `chartSpecToECharts()` is the new converter (`lib/graph-studio/echarts-converter.ts`)
- `ReactECharts` from `echarts-for-react@3.0.6` wraps `echarts@6.0.0`
- vega-lite-converter.ts was **deleted**

---

## 4. Consequences

### Positive
- ECharts v6 is actively maintained (Apache foundation)
- Canvas rendering is faster than SVG for large datasets
- ECharts has built-in support for all required chart types (boxplot, heatmap, custom series)
- No vega-lite dependency in the bundle

### Negative / Tradeoffs
- Violin plot: ECharts has no native violin series → currently falls back to boxplot (deferred)
- Error-bar: uses ECharts `custom` series with manual coordinate math (complex but functional)
- We lose Vega-Lite's declarative grammar for future AI integration (mitigated by ChartSpec being LLM-friendly)

### Also changed
- `lib/stores/graph-studio-store.ts` — `previewMode` field and `setPreviewMode` action **removed** (were dead state; ChartPreview never read `previewMode`)

### Not affected
- `types/graph-studio.ts` — `ChartSpec` and all core types unchanged
- `lib/graph-studio/chart-spec-schema.ts` — Zod validation unchanged
- `lib/graph-studio/chart-spec-utils.ts` — utility functions unchanged
- `lib/graph-studio/chart-spec-defaults.ts` — style presets unchanged (minor bug fix only)
- `PropertiesTab`, `AiEditTab`, `PresetsTab`, `SidePanel` — unchanged

### Deferred (not yet updated)
- `components/graph-studio/panels/ExportTab.tsx` — `handleExport` stub still references
  "Vega-Lite export" in code comments (lines 88–89). Actual export logic not yet implemented
  (Stage 3). Comments should be updated when ECharts `getDataURL` is wired.

---

## 5. Validation

### Implementation status
- `echarts-converter.ts` handles all 10 `ChartType` values (violin falls back to boxplot). TypeScript compiles with 0 errors (`pnpm tsc --noEmit` verified).

### Rollback path
Full rollback requires reverting all files listed in `GRAPH_STUDIO_ECHARTS_REVIEW.md § Files Changed`:
- Restore `lib/graph-studio/vega-lite-converter.ts` (deleted)
- Revert `components/graph-studio/ChartPreview.tsx` (ReactECharts → vega-embed)
- Revert `lib/graph-studio/index.ts` (`chartSpecToECharts` → `chartSpecToVegaLite`)
- Revert `types/graph-studio.ts` (`previewMode` literal)
- Revert `lib/stores/graph-studio-store.ts` (restore `previewMode` field + action)
- Remove `echarts`, `echarts-for-react` from `package.json`; restore `vega-embed`

No schema changes required (`ChartSpec` is unchanged throughout).

### Known deferred items
See [GRAPH_STUDIO_ECHARTS_REVIEW.md § Known Limitations](./GRAPH_STUDIO_ECHARTS_REVIEW.md#known-limitations--deferred-work) for violin, annotations, export wiring, and non-null assertions.

### Performance baseline
Not formally benchmarked. ECharts Canvas rendering is expected to outperform vega-embed SVG for >500 data points (canvas vs. DOM element overhead). Formal benchmark deferred.
