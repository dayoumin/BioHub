# Result Type Consolidation Analysis - Review Request

## 1. Background & Objective

### Project Context
- **Platform**: Statistical analysis platform with 48 statistical pages
- **Current State**: Each page defines its own `Result` interface locally (e.g., `TTestResult`, `ANOVAResults`, `CorrelationResult`)
- **Question**: Should we consolidate these into shared base types using TypeScript intersection/composition?

### Analysis Goal
Determine if Result type centralization provides sufficient ROI to justify the refactoring effort.

---

## 2. Analysis Methodology

### 2.1 Data Collection
- **Script**: `scripts/analyze-result-types.mjs`
- **Scope**: 48 statistical page directories in `app/(dashboard)/statistics/`
- **Method**: Regex parsing of `interface XXXResult { ... }` definitions

### 2.2 Field Normalization
Synonyms were merged:
```javascript
const synonyms = {
  'pvalue': 'pValue',
  'p_value': 'pValue',
  'degreesOfFreedom': 'df',
  'sampleSize': 'n',
  'ciLower': 'confidenceInterval',
  'ciUpper': 'confidenceInterval',
}
```

### 2.3 Classification Criteria
| Category | Threshold | Implication |
|----------|-----------|-------------|
| Core Common | 80%+ | Strong candidate for base type |
| Frequent Common | 50-80% | Good candidate for mixin |
| Optional Common | 20-50% | Optional mixin |
| Unique | <20% | Keep page-specific |

---

## 3. Findings

### 3.1 Field Frequency Results

**Full Results** (from script output):

| Field | Count | Percentage | Category |
|-------|-------|------------|----------|
| pValue | 24 | 50.0% | Frequent Common |
| statistic | 14 | 29.2% | Optional Common |
| interpretation | 14 | 29.2% | Optional Common |
| df | 10 | 20.8% | Optional Common |
| confidenceInterval | 10 | 20.8% | Optional Common |
| effectSize | 10 | 20.8% | Optional Common |
| n | 10 | 20.8% | Optional Common |
| significant | 8 | 16.7% | Unique |
| mean | 7 | 14.6% | Unique |
| std | 6 | 12.5% | Unique |
| ... | ... | ... | 200+ unique fields |

### 3.2 Key Discovery: NO Core Common Fields

**Critical Finding**: No field appears in 80%+ of pages.

- The highest frequency field (`pValue`) appears in only **50%** of pages
- Most fields (200+) are unique to specific analysis types (<20%)

### 3.3 Initial Estimates vs Actual Data

| Field | My Estimate | Actual | Error |
|-------|-------------|--------|-------|
| pValue | ~95% | 50% | **-45%** |
| statistic | ~90% | 29% | **-61%** |
| interpretation | ~80% | 29% | **-51%** |
| df | ~70% | 21% | **-49%** |
| effectSize | ~60% | 21% | **-39%** |

**Root Cause**: Made estimates without running actual analysis on all 48 pages.

---

## 4. Industry Pattern Research

### 4.1 Python SciPy
- **Pattern**: Individual named result classes per test
- **Example**: `TtestResult`, `ModeResult`, `DescribeResult`
- **No unified base type**

### 4.2 R broom Package
- **Pattern**: Unified tidy output structure
- **Standard Fields**: `statistic`, `p.value`, `estimate`, `conf.low`, `conf.high`, `parameter`
- **Most systematic approach** in industry

### 4.3 JavaScript Libraries (jstat, simple-statistics)
- **Pattern**: Return primitive values or simple objects
- **No complex result interfaces**

### 4.4 Next.js Recommendation
- **Colocation Pattern**: Keep types near where they're used
- **Current approach follows this pattern**

---

## 5. Existing Centralized Types

File: `types/pyodide-results.ts` (521 lines)

Already contains 30+ result types for Python Worker returns:
- `DescriptiveStatsResult`
- `OneSampleTTestResult`, `TwoSampleTTestResult`, `PairedTTestResult`
- `ChiSquareTestResult`
- `OneWayAnovaResult`, `TwoWayAnovaResult`
- `LinearRegressionResult`, `MultipleRegressionResult`
- etc.

**Note**: These are for Worker communication, not UI page results.

---

## 6. Options Considered

### Option A: Full Centralization
```typescript
// Base types
interface BaseTestResult {
  pValue: number
  statistic: number
}

interface WithEffectSize {
  effectSize: number
  effectSizeInterpretation: string
}

// Page usage
type TTestResult = BaseTestResult & WithEffectSize & {...}
```

**Pros**: Consistency, single source of truth
**Cons**: Only pValue at 50%, most fields unique

### Option B: Partial Centralization
- Centralize only high-frequency fields (pValue, statistic)
- Keep unique fields page-local

**Pros**: Some consistency
**Cons**: Complex to maintain, unclear boundaries

### Option C: Status Quo (Colocation)
- Keep Result types in each page
- Follow Next.js recommended pattern

**Pros**: Simple, no migration needed, types stay near usage
**Cons**: Some duplication

---

## 7. Conclusion & Recommendation

### Current Recommendation: Option C (Status Quo)

**Reasoning**:
1. **No universal fields**: Even pValue only at 50%
2. **Page-local usage**: Result types not shared between pages
3. **Industry precedent**: SciPy uses individual result classes
4. **Framework alignment**: Next.js recommends colocation
5. **Low ROI**: Effort > Benefit for 200+ unique fields

### Files to Maintain
- `types/pyodide-results.ts` - Keep for Worker communication types
- Page-local interfaces - Keep as-is

---

## 8. Review Questions for Another AI

### Accuracy Verification
1. Is the regex parsing in `analyze-result-types.mjs` correctly extracting all Result interfaces?
2. Are the synonym mappings appropriate? Missing any?
3. Is the 80%/50%/20% threshold classification reasonable?

### Alternative Perspectives
4. Are there other consolidation patterns not considered?
5. Is the R broom pattern feasible for this TypeScript/React context?
6. Should we reconsider given the 50% pValue frequency?

### ROI Assessment
7. Is the ROI calculation reasonable?
8. What would change the recommendation?

---

## 9. Supporting Files

| File | Description |
|------|-------------|
| `scripts/analyze-result-types.mjs` | Analysis script |
| `scripts/result-type-analysis.json` | Full JSON output |
| `types/pyodide-results.ts` | Existing centralized Worker types |
| `docs/REVIEW_IMPROVEMENTS_TODO.md` | Project improvement tracking |

---

## 10. Raw Data Sample

### Pages with Most Fields (from JSON output)
```
anova: ANOVAResults (15+ fields)
correlation: CorrelationResult (10+ fields)
regression: RegressionResult (12+ fields)
t-test: TTestResult (8 fields)
```

### Pages with External Imports
Some pages import types from `types/pyodide-results.ts` or define as type aliases.

---

*Generated: 2026-01-22*
*Analyst: Claude Opus 4.5*
*Status: Pending External Review*
