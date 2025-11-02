output = """
DETAILED COMPLIANCE TABLE
=========================

Page Name                | useStatsHook | useCallback | completeAnalysis | setResults | anyType | Issues
------------------------+--------------+-------------+------------------+------------+---------+--------
ancova                   | YES          | YES         | YES              | NO         | NO      | MINOR-E
anova                    | YES          | NO          | YES              | NO         | NO      | MAJOR-B, MINOR-E
chi-square               | YES          | YES         | YES              | NO         | NO      | MINOR-E
chi-square-goodness      | YES          | NO          | YES              | NO         | NO      | MAJOR-B
chi-square-independence  | YES          | YES         | YES              | NO         | NO      | OK
cluster                  | YES          | YES         | YES              | NO         | NO      | OK
correlation              | YES          | NO          | YES              | NO         | NO      | MAJOR-B, MINOR-E
cross-tabulation         | YES          | YES         | YES              | NO         | NO      | OK
descriptive              | YES          | NO          | YES              | NO         | NO      | MAJOR-B, MINOR-E
discriminant             | YES          | YES         | YES              | NO         | NO      | OK
dose-response            | YES          | YES         | NO               | NO         | NO      | OK
explore-data             | YES          | NO          | NO               | YES        | NO      | CRITICAL-C, MAJOR-B
factor-analysis          | YES          | YES         | YES              | NO         | NO      | OK
frequency-table          | YES          | NO          | YES              | NO         | NO      | MAJOR-B
friedman                 | YES          | YES         | YES              | NO         | NO      | MINOR-E
kruskal-wallis           | YES          | NO          | YES              | NO         | NO      | MAJOR-B, MINOR-E
ks-test                  | YES          | YES         | YES              | NO         | NO      | OK
mann-kendall             | YES          | YES         | YES              | NO         | NO      | OK
mann-whitney             | YES          | NO          | NO               | YES        | NO      | CRITICAL-C, MAJOR-B
manova                   | YES          | YES         | YES              | NO         | NO      | OK
mcnemar                  | YES          | YES         | YES              | NO         | NO      | OK
means-plot               | YES          | YES         | YES              | NO         | NO      | OK
mixed-model              | YES          | YES         | YES              | NO         | NO      | OK
non-parametric           | YES          | YES         | YES              | NO         | YES     | MAJOR-D
normality-test           | YES          | NO          | YES              | NO         | NO      | OK
one-sample-t             | YES          | NO          | YES              | NO         | NO      | OK
ordinal-regression       | YES          | YES         | YES              | NO         | NO      | OK
partial-correlation      | YES          | YES         | YES              | NO         | NO      | OK
pca                      | YES          | YES         | YES              | NO         | NO      | OK
poisson                  | YES          | YES         | YES              | NO         | NO      | OK
power-analysis           | YES          | YES         | YES              | NO         | NO      | OK
proportion-test          | YES          | NO          | YES              | NO         | NO      | MAJOR-B
regression               | YES          | NO          | YES              | NO         | NO      | MAJOR-B, MINOR-E
reliability              | YES          | YES         | YES              | NO         | NO      | OK
response-surface         | YES          | YES         | YES              | NO         | NO      | OK
runs-test                | YES          | YES         | YES              | NO         | NO      | OK
sign-test                | YES          | YES         | YES              | NO         | NO      | OK
stepwise                 | YES          | YES         | YES              | NO         | NO      | OK
t-test                   | YES          | NO          | YES              | NO         | NO      | MAJOR-B
welch-t                  | YES          | NO          | YES              | NO         | NO      | MAJOR-B
wilcoxon                 | YES          | YES         | YES              | NO         | NO      | OK


DETAILED ISSUE DESCRIPTIONS
============================

CRITICAL-C: setResults() Usage
  Problem: Using setResults() instead of completeAnalysis()
  Impact: isAnalyzing flag remains true, buttons stay disabled
  Files: explore-data/page.tsx:249, mann-whitney/page.tsx:249
  Fix: Replace setResults() with completeAnalysis(result, nextStep)

MAJOR-B: Missing useCallback
  Problem: Event handlers not wrapped with useCallback
  Impact: Unnecessary re-renders on every parent render
  Fix: Wrap handlers with useCallback and add [actions] dependency
  Example:
    const handleDataUpload = useCallback((data) => {
      actions.setUploadedData({...})
    }, [actions])

MAJOR-D: 'any' Type Usage
  Problem: Using 'as any' type cast
  Impact: TypeScript type safety lost
  File: non-parametric/page.tsx:253, 263, 275
  Fix: Remove 'as any' and define proper types

MINOR-E: Missing setError() in Catch
  Problem: try-catch block without actions.setError() call
  Impact: Errors silently ignored, user doesn't know analysis failed
  Files: anova, chi-square, correlation, descriptive, friedman, kruskal-wallis, regression
  Fix: Add error handling in catch block
    } catch (err) {
      actions.setError(err instanceof Error ? err.message : 'Analysis failed')
    }


ISSUE FREQUENCY ANALYSIS
=========================

By Severity:
  CRITICAL: 2 pages (5%)
  MAJOR:    13 pages (32%)
  MINOR:    7 pages (17%)

By Category:
  Category B (useCallback): 12 pages
  Category C (setResults):  2 pages
  Category D (any type):    1 page
  Category E (setError):    7 pages

Note: Some pages have multiple issues and appear in multiple categories.

Pages with Multiple Issues:
  - explore-data: CRITICAL-C + MAJOR-B
  - mann-whitney: CRITICAL-C + MAJOR-B
  - anova: MAJOR-B + MINOR-E
  - correlation: MAJOR-B + MINOR-E
  - descriptive: MAJOR-B + MINOR-E
  - kruskal-wallis: MAJOR-B + MINOR-E
  - regression: MAJOR-B + MINOR-E
"""

print(output)
