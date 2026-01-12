# Statistics Page Development Guide

## Overview
This document captures the shared setup for the 41 statistical workflows and the checklist for adding new pages. Use it as the single reference when continuing the build-out.

## Current Coverage (10 / 41)
- t-test (`app/(dashboard)/statistics/t-test/page.tsx`)
- anova (`app/(dashboard)/statistics/anova/page.tsx`)
- correlation (`app/(dashboard)/statistics/correlation/page.tsx`)
- regression (`app/(dashboard)/statistics/regression/page.tsx`)
- chi-square (`app/(dashboard)/statistics/chi-square/page.tsx`)
- non-parametric (`app/(dashboard)/statistics/non-parametric/page.tsx`)
- normality-test (`app/(dashboard)/statistics/normality-test/page.tsx`)
- descriptive (`app/(dashboard)/statistics/descriptive/page.tsx`)
- power-analysis (`app/(dashboard)/statistics/power-analysis/page.tsx`)
- common layout host (`app/(dashboard)/statistics/layout.tsx`)

## Shared Layout & UI Components
| Responsibility | File | Notes |
| --- | --- | --- |
| Page shell & stepper | `components/statistics/StatisticsPageLayout.tsx` | Provides progress bar, method info, quick tips, floating run button |
| Step container | `components/statistics/StatisticsPageLayout.tsx` (`StepCard` export) | Reusable card wrapper per step |
| Charts | `components/charts/` | `BoxPlot.tsx`, `BarChartWithCI.tsx`, `ChartSkeleton.tsx` |
| Statistics widgets | `components/statistics/common/` | `StatisticalResultCard.tsx`, `AssumptionTestCard.tsx`, `StatisticsTable.tsx`, `EffectSizeCard.tsx`, `ResultActionButtons.tsx` |
| Variable selection | `components/variable-selection/ProfessionalVariableSelector.tsx` | Advanced variable picker |

## State & Data Services
| Responsibility | File | Notes |
| --- | --- | --- |
| Global analysis flow | `lib/stores/smart-flow-store.ts` | Zustand store, session storage sync |
| Pyodide execution entry | `lib/services/pyodide-statistics.ts` | 41 statistical methods consolidated |
| Method-specific executors | `lib/services/executors/*` | Bridge between pages and Pyodide |
| Variable requirements | `lib/statistics/variable-requirements.ts` | Describes required variables per method |
| Result formatting & constants | `lib/formatters.ts`, `lib/constants.ts` | Shared helpers for output |

## How to Add a New Statistics Page
1. Create the page file under `app/(dashboard)/statistics/<method-id>/page.tsx`.
   - Import `StatisticsPageLayout` and `StepCard`.
   - Define the step array and method info (formula, assumptions, etc.).
   - Wire actions to the appropriate executor (`pyodideStats.<method>` or service wrapper).
2. Hook up state via `useSmartFlowStore` for uploaded data, selections, and results.
3. Reuse shared widgets for result display instead of bespoke markup.
4. Update navigation by adding the method to `statisticsMenu` in `app/(dashboard)/statistics/layout.tsx`.
5. Wire variable requirements using `variable-requirements.ts` and validate before running the analysis.
6. Add tests mirroring `app/(dashboard)/statistics/non-parametric/__tests__/page.test.tsx` to cover rendering, step switching, and run/reset actions.
7. Document method specifics (description, options) in `docs/STATISTICAL_METHODS_COMPLETE_GUIDE.md` if not already listed.

## Testing Notes
- Use `jest.setup.js` mocks for Pyodide. Direct initialization inside tests is disabled on purpose.
- Prefer `userEvent` plus `findBy`/`waitFor` for Radix UI interactions.
- When asserting chart content, query via `within(screen.getByRole('table'))` or `screen.getByRole('img', { name: /chart/i })` to avoid duplicate text collisions.

## Open Follow-ups
- Expand `statisticsMenu` to list all 41 methods once implemented.
- Consider extracting a page factory (`lib/statistics/page-factory.ts`) to reduce duplication as the remaining pages are added.
- Create shared test helpers under `lib/test-utils/` for repeated page assertions.
