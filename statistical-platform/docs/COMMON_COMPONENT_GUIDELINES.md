# Common Component Guidelines

> **Last Updated**: 2025-01-23
> **Status**: Active
> **Purpose**: Ensure consistent usage of common components across all statistics pages

---

## Overview

This document defines the standard usage patterns for common components in statistics pages.

**Core Components:**
| Component | Purpose | Location |
|-----------|---------|----------|
| `ResultInterpretation` | Analysis result interpretation with beginner/expert modes | `components/statistics/common/` |
| `EffectSizeCard` | Effect size display with visual scale | `components/statistics/common/` |
| `AssumptionTestCard` | Statistical assumption test results | `components/statistics/common/` |

---

## 1. ResultInterpretation

### Interface
```tsx
interface ResultInterpretationProps {
  result: {
    summary: string      // Brief result summary (1-2 sentences)
    details?: string     // Statistical details (expert mode only)
    recommendation?: string  // Practical recommendations
    caution?: string     // Warnings or limitations
  }
  title?: string         // Card title (default: "Result Interpretation")
  className?: string
  initialMode?: 'beginner' | 'expert'
}
```

### Usage Example
```tsx
<ResultInterpretation
  result={{
    summary: `Classification accuracy is ${(results.accuracy * 100).toFixed(1)}%...`,
    details: `Wilks' Lambda: ${results.wilksLambda.toFixed(4)}...`,
    recommendation: 'Consider cross-validation for model validation.',
    caution: 'Sample size is small. Interpret with caution.'
  }}
  title="Discriminant Analysis Results"
/>
```

### When to Use
- ✅ All statistics pages with analysis results
- ✅ Replace hardcoded interpretation Cards
- ✅ Dynamic interpretation based on results

---

## 2. EffectSizeCard

### Interface
```tsx
interface EffectSizeCardProps {
  title: string                    // Display title
  value: number | null | undefined // Effect size value
  type?: EffectSizeType            // See types below
  description?: string             // Formula or explanation
  showInterpretation?: boolean     // Default: true
  showVisualScale?: boolean        // Default: true
  compareValue?: number            // Reference value for comparison
  className?: string
}
```

### Effect Size Types (from `types/statistics.ts`)
```typescript
type EffectSizeType =
  | 'cohens_d'           // Cohen's d (t-test) - NOTE: NOT 'cohen_d'
  | 'hedges_g'           // Hedges' g (small sample correction)
  | 'glass_delta'        // Glass's Δ (control group based)
  | 'eta_squared'        // η² (ANOVA)
  | 'partial_eta_squared'
  | 'omega_squared'
  | 'epsilon_squared'
  | 'r'                  // Correlation coefficient
  | 'r_squared'          // R²
  | 'phi'                // φ (2×2 contingency)
  | 'cramers_v'          // Cramér's V
  | 'w'                  // Kendall's W
```

### ⚠️ IMPORTANT: Naming Convention
```tsx
// ✅ CORRECT
<EffectSizeCard type="cohens_d" ... />

// ❌ WRONG - Do NOT use
<EffectSizeCard type="cohen_d" ... />  // Missing 's'
```

### Usage Example
```tsx
<EffectSizeCard
  title="Cohen's d"
  value={results.effectSize}
  type="cohens_d"
  description="d = (M₁ - M₂) / SD_pooled"
/>
```

### ❌ WRONG Usage (Legacy Pattern)
```tsx
// This pattern does NOT work - effectSizes prop doesn't exist
<EffectSizeCard
  effectSizes={[{
    name: "Cohen's d",
    value: 0.8,
    interpretation: "large",
    formula: "..."
  }]}
/>
```

### When to Use
- ✅ t-tests: `cohens_d`, `hedges_g`
- ✅ ANOVA: `eta_squared`, `partial_eta_squared`, `omega_squared`
- ✅ Correlation: `r`, `r_squared`
- ✅ Chi-square: `phi`, `cramers_v`, `w`
- ✅ Non-parametric: `r` (rank-biserial), `epsilon_squared`

---

## 3. AssumptionTestCard

### Interface
```tsx
interface AssumptionTestCardProps {
  tests: AssumptionTest[]
  title?: string
  className?: string
}

interface AssumptionTest {
  name: string           // Test name (e.g., "Shapiro-Wilk")
  statistic: number      // Test statistic
  pValue: number         // p-value
  passed: boolean        // Whether assumption is met
  description?: string   // What the test measures
}
```

### Usage Example
```tsx
<AssumptionTestCard
  tests={[
    {
      name: "Shapiro-Wilk",
      statistic: results.shapiroW,
      pValue: results.shapiroPValue,
      passed: results.shapiroPValue > 0.05,
      description: "Tests normality of residuals"
    },
    {
      name: "Levene's Test",
      statistic: results.leveneF,
      pValue: results.levenePValue,
      passed: results.levenePValue > 0.05,
      description: "Tests homogeneity of variances"
    }
  ]}
  title="Assumption Tests"
/>
```

### When to Use
- ✅ ANOVA, ANCOVA, MANOVA
- ✅ Regression (residual diagnostics)
- ✅ Parametric tests with distributional assumptions

---

## 4. Component Selection by Analysis Type

| Analysis Type | ResultInterpretation | EffectSizeCard | AssumptionTestCard |
|---------------|---------------------|----------------|-------------------|
| t-test | ✅ | ✅ `cohens_d` | ✅ (normality) |
| ANOVA | ✅ | ✅ `eta_squared` | ✅ (normality, homogeneity) |
| Correlation | ✅ | ✅ `r` | ❌ |
| Regression | ✅ | ✅ `r_squared` | ✅ (residuals) |
| Chi-square | ✅ | ✅ `phi`, `cramers_v` | ❌ |
| Non-parametric | ✅ | ✅ `r` | ❌ |
| Factor Analysis | ✅ | ❌ | ❌ |
| Cluster Analysis | ✅ | ❌ | ❌ |
| Time Series | ✅ | ❌ | ❌ |

---

## 5. Migration Checklist

When migrating a statistics page to use common components:

- [ ] Import required components
- [ ] Replace hardcoded interpretation with `ResultInterpretation`
- [ ] Replace effect size display with `EffectSizeCard`
- [ ] Replace assumption test display with `AssumptionTestCard`
- [ ] Use correct `EffectSizeType` (e.g., `cohens_d`, NOT `cohen_d`)
- [ ] Generate dynamic content based on `results` object
- [ ] Run `npx tsc --noEmit` to verify no TypeScript errors
- [ ] Test in browser

---

## 6. Files Modified in This Standardization

### Phase 1: EffectSizeCard Props Fix
- `proportion-test/page.tsx`
- `welch-t/page.tsx`
- `wilcoxon/page.tsx`

### Phase 2: cohen_d → cohens_d Unification (43 changes)
- `StatisticalResultCard.tsx`
- `EffectSizeCard.tsx`
- `formatters.ts`
- `t-tests.ts`
- `result-converter.ts`
- `types/statistics.d.ts`
- `t-test/page.tsx`
- Various test files

### Phase 3: ResultInterpretation Application
- `discriminant/page.tsx`

---

## 7. Reference

- Type definitions: `types/statistics.ts` (Line 631+)
- Component source: `components/statistics/common/`
- Design system showcase: `/design-system`
