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
| Apache ECharts | **v6.0.0** | Jul 2025 | ASF governance, 65.8k GitHub stars, 안정적 유지보수 (아래 상세) |
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

---

## 6. ECharts 커뮤니티 현황 (2026-03-01 조사)

### 릴리스 빈도 — "안정적이지만 느림"

ADR 작성 시 "very active"로 평가했으나, 릴리스 빈도 기준으로는 정정이 필요하다.

| 버전 | 날짜 | 이전 릴리스 대비 간격 |
|------|------|----------------------|
| v5.5.0 | 2024-02 | — |
| v5.5.1 | 2024-06 | 4개월 |
| v5.6.0 | 2024-12 | 6개월 |
| v6.0.0 | 2025-07 | 7개월 |
| v6.1.0 | 2026-03 (예정) | ~8개월 |

연 1~2회 릴리스 페이스. "빠른 업데이트"보다는 **대형 프로젝트의 안정적 유지보수** 수준.

### 커밋 활동

- 2025-11: 7 commits
- 2025-12: 15 commits (가장 활발)
- 2026-01: 4 commits
- 2026-02: 2 commits

일일 커밋이 아닌 **클러스터 패턴** (2~4주 간격 집중 작업). 대형 OSS 시각화 라이브러리의 전형적 패턴.

### 오픈 PR — 136개

커뮤니티 기여가 활발하나, 리뷰 대기(awaiting review) PR이 다수.
first-time contributor 라벨이 붙은 PR도 많아 신규 기여자 유입은 건강한 편.

### v6.1.0 마일스톤 — 96% 완료 (32/33 closed, 기한 2026-03-15)

**주요 신규 기능:**
- `feat(axis)`: `dataMin`/`dataMax` 옵션으로 축 범위 자동 계산
- `feat(visualMap)`: `seriesTargets` 옵션 (다중 시리즈-차원 매핑)
- `feat(matrix)`: `triggerEvent`, headless matrix 지원
- `feat(pie)`: `tangential-noflip` 회전 모드
- `feat(gauge)`: `progress.color` auto 지원
- `feat(radar)`: `clockwise` 옵션
- `feat(line)`: `triggerEvent` 옵션
- `feat(axis)`: `customValues` + `formatter` index 전달

**주요 버그 수정:**
- tooltip, dataZoom, scatter jitter, candlestick, sunburst, treemap 등 17건
- TypeScript 타입 누락/불일치 수정 3건
- Vue 호환성 수정 (raw object marking)

**BioHub 영향:** 직접적으로 필요한 기능은 없으나, TypeScript 타입 개선과 버그 수정은 안정성에 기여.

### 6.x 마일스톤 — 11% (4/35 closed, 기한 미정)

장기 로드맵 항목 31개 오픈. 세부 내용은 추후 확인 필요.

### 유료화 리스크 — 없음

- Apache License 2.0 (OSI 인증, 상업적 사용 영구 무료)
- Apache Software Foundation 거버넌스 — 개인/기업이 라이선스 변경 불가
- Redis/Elasticsearch 사례와 달리 ASF 소속 프로젝트는 라이선스 변경 전례 없음

### 결론

"very active" → **"안정적으로 유지되는 대형 ASF 프로젝트"** 로 정정.
릴리스 속도는 느리지만, ASF 거버넌스 + Apache 2.0 라이선스 조합으로
장기 안정성과 무료 사용은 보장된다. Graph Studio 용도로 적합한 선택 유지.
