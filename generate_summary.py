# Final summary for consistency check

output = """
===============================================================================
STATISTICS PAGES CONSISTENCY CHECK - FINAL SUMMARY REPORT
===============================================================================

PROJECT STATUS
==============
Total Pages Inspected: 41
Pages Compliant: 28 (68.3%)
Pages with Issues: 13 (31.7%)

ISSUES BREAKDOWN
================

[CRITICAL] Category C - setResults() Usage (Forbidden)
  Severity: CRITICAL - Causes permanent UI button lock
  Count: 2 pages
  
  1. explore-data/page.tsx (Line 249)
     Current: actions.setResults(mockResults)
     Fix: actions.completeAnalysis(mockResults, 3)
  
  2. mann-whitney/page.tsx (Line 249)
     Current: actions.setResults(formattedResult)
     Fix: actions.completeAnalysis(formattedResult, 3)

[MAJOR] Category B - useCallback Not Applied to Event Handlers
  Severity: MAJOR - Causes unnecessary re-renders
  Count: 12 pages
  
  Pages: anova, chi-square-goodness, correlation, descriptive, 
         explore-data, frequency-table, kruskal-wallis, mann-whitney, 
         proportion-test, regression, t-test, welch-t
  
  Issue: Event handlers (handleDataUpload, handleVariablesSelected) 
         are not wrapped with useCallback()
  
  Fix Pattern:
    const handleDataUpload = useCallback((data: unknown[]) => {
      actions.setUploadedData({...})
    }, [actions])

[MAJOR] Category D - 'any' Type Usage
  Severity: MAJOR - TypeScript type safety violation
  Count: 1 page
  
  File: non-parametric/page.tsx
  Lines: 253, 263, 275
  Issue: allowedTypes: [...] as any
  Fix: Remove 'as any' and define proper TypeScript type

[MINOR] Category E - Incomplete Error Handling
  Severity: MINOR - Silent errors
  Count: 7 pages
  
  Pages: anova, chi-square, correlation, descriptive, 
         friedman, kruskal-wallis, regression
  
  Issue: try-catch blocks without actions.setError() calls
  Fix: Add error handling:
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : 'Analysis failed')
    }

PAGES BY STATUS
===============

COMPLIANT (28 pages):
  ancova, chi-square, chi-square-independence, cluster, cross-tabulation,
  discriminant, dose-response, factor-analysis, ks-test, mann-kendall,
  manova, mcnemar, means-plot, mixed-model, one-sample-t, ordinal-regression,
  partial-correlation, pca, poisson, power-analysis, reliability,
  response-surface, runs-test, sign-test, stepwise, wilcoxon,
  normality-test, friedman

NEEDS FIX (13 pages):
  - Critical (2): explore-data, mann-whitney
  - Major (12): anova, chi-square-goodness, correlation, descriptive,
                explore-data, frequency-table, kruskal-wallis, mann-whitney,
                proportion-test, regression, t-test, welch-t
  - Major (1): non-parametric
  - Minor (7): anova, chi-square, correlation, descriptive,
               friedman, kruskal-wallis, regression

RECOMMENDED FIX PRIORITY
========================

PHASE 1 (CRITICAL - 5 min)
  1. explore-data/page.tsx:249 -> setResults() to completeAnalysis()
  2. mann-whitney/page.tsx:249 -> setResults() to completeAnalysis()

PHASE 2 (MAJOR - 30-45 min)
  1. Add useCallback to 12 pages
  2. Fix 'as any' in non-parametric/page.tsx

PHASE 3 (MINOR - 15 min)
  1. Add actions.setError() to 7 pages

REFERENCE DOCUMENTS
===================
- Main Standards: statistical-platform/docs/STATISTICS_PAGE_CODING_STANDARDS.md
- Bug Prevention: statistical-platform/docs/TROUBLESHOOTING_ISANALYZING_BUG.md
- Type Safety: statistical-platform/docs/AI-CODING-RULES.md

GOOD EXAMPLES (Use as Templates)
================================
- ks-test/page.tsx
- power-analysis/page.tsx
- means-plot/page.tsx
- chi-square/page.tsx
- wilcoxon/page.tsx
"""

print(output)
