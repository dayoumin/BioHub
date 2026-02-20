# E2E Test Guide for AI Assistants

> **Purpose**: This guide helps AI assistants with browser automation capabilities to perform E2E testing on the Statistical Platform.

## Quick Start

```bash
# Start development server
cd stats
npm run dev
# Server runs at http://localhost:3000
```

## Test Data Location

```
test-data/
├── datasets/
│   └── standard-datasets.ts    # Iris, mtcars, ANOVA datasets
├── reference-results/
│   ├── r-reference-results.ts  # R-calculated golden values
│   └── generate-r-references.R # R script for reference generation
├── t-test.csv                  # Simple t-test sample
├── welch-t.csv                 # Welch t-test sample
├── wilcoxon.csv                # Non-parametric sample
└── twoway-anova-test.csv       # Two-way ANOVA sample
```

---

## E2E Test Scenarios

### Scenario 1: Smart Flow Basic Workflow

**URL**: `http://localhost:3000/smart-flow`

**Steps**:
1. Navigate to /smart-flow
2. Upload CSV file: `test-data/t-test.csv`
3. Wait for data validation to complete
4. Select analysis purpose: "Compare groups" or "Group comparison"
5. Verify compatible methods are displayed (should include t-test, Mann-Whitney)
6. Select "t-test" method
7. Configure variables:
   - Group variable: select categorical column
   - Value variable: select numeric column
8. Click "Analyze" or "Run Analysis" button
9. Wait for analysis to complete
10. Verify results display:
    - t-statistic value
    - p-value
    - Effect size (Cohen's d)
    - Interpretation text

**Expected Result**: Analysis completes without errors, results are displayed with valid statistics.

**Verification Points**:
- [ ] p-value is between 0 and 1
- [ ] Effect size interpretation is shown (small/medium/large)
- [ ] No console errors

---

### Scenario 2: Compatibility Filter Test

**URL**: `http://localhost:3000/smart-flow`

**Steps**:
1. Navigate to /smart-flow
2. Upload a small sample CSV (n < 20 rows)
3. Complete data validation
4. Navigate to method selection
5. Verify that:
   - Non-parametric methods are highlighted/recommended
   - Parametric methods show warnings about sample size
6. Upload a larger dataset (n > 100 rows, normally distributed)
7. Verify that:
   - Parametric methods become available without warnings
   - Method compatibility status updates

**Expected Result**: Methods are filtered based on actual data characteristics.

**Verification Points**:
- [ ] Small sample shows non-parametric preference
- [ ] Large normal sample shows parametric availability
- [ ] Compatibility badges update dynamically

---

### Scenario 3: Direct Statistics Page - T-Test

**URL**: `http://localhost:3000/statistics/t-test`

**Steps**:
1. Navigate to /statistics/t-test
2. Upload `test-data/t-test.csv`
3. Wait for file to load
4. In variable selector:
   - Select group variable (categorical column)
   - Select value variable (numeric column)
5. Click "Analyze" button
6. Wait for Pyodide to initialize and compute
7. Verify results table appears with:
   - Group statistics (n, mean, std)
   - t-statistic
   - Degrees of freedom
   - p-value
   - Confidence interval
8. Verify interpretation text is generated

**Expected Result**: Page renders complete analysis results without errors.

**Verification Points**:
- [ ] Loading indicator appears during computation
- [ ] Results table has all expected columns
- [ ] p-value matches approximately: check against R reference
- [ ] Interpretation mentions statistical significance correctly

---

### Scenario 4: ANOVA with Post-hoc Tests

**URL**: `http://localhost:3000/statistics/anova`

**Steps**:
1. Navigate to /statistics/anova
2. Upload data with 3+ groups (create or use existing multi-group CSV)
3. Select factor variable (group column)
4. Select dependent variable (numeric column)
5. Run One-Way ANOVA
6. Verify results show:
   - F-statistic
   - p-value
   - Between/Within SS, df, MS
7. If p < 0.05 (significant):
   - Verify post-hoc test options appear
   - Select "Tukey HSD"
   - Run post-hoc analysis
8. Verify pairwise comparisons table:
   - All group pairs listed
   - Mean differences
   - p-values for each comparison
   - Significance indicators

**Expected Result**: Complete ANOVA analysis with post-hoc results when significant.

**Test Data** (create if needed):
```csv
group,value
A,23
A,25
A,24
A,26
A,27
B,28
B,30
B,29
B,31
B,32
C,35
C,37
C,36
C,38
C,39
```

---

### Scenario 5: Regression Analysis

**URL**: `http://localhost:3000/statistics/regression`

**Steps**:
1. Navigate to /statistics/regression
2. Upload dataset with numeric X and Y variables
3. Select dependent variable (Y)
4. Select independent variable(s) (X)
5. Click "Run Regression"
6. Verify output includes:
   - Coefficients table (Estimate, Std Error, t-value, p-value)
   - R-squared and Adjusted R-squared
   - F-statistic for overall model
   - Residual standard error
7. Verify visualization:
   - Scatter plot is displayed
   - Regression line is overlaid
   - Equation is shown

**Expected Result**: Complete regression model with diagnostics and visualization.

**Test Data** (linear relationship):
```csv
x,y
1,2.1
2,3.9
3,6.2
4,7.8
5,10.1
6,11.9
7,14.2
8,15.8
9,18.1
10,19.9
```

---

## Reference Values for Verification

### T-Test Reference (from R)
```
Data: group1=[1,2,3,4,5], group2=[2,3,4,5,6]
Independent t-test:
  - t-statistic: -1.414214
  - p-value: 0.1949748
  - df: 8
```

### ANOVA Reference (from R)
```
Data: control=[23-28], treatment1=[28-33], treatment2=[35-40]
One-Way ANOVA:
  - F-statistic: ~147.86
  - p-value: < 0.0001
  - eta-squared: ~0.92
```

### Regression Reference (from R)
```
Data: x=[1-10], y=[2.1-19.9]
Linear Regression:
  - slope: ~1.99
  - intercept: ~0.12
  - R-squared: ~0.9996
```

---

## Error Handling Tests

### Test: Invalid File Upload
1. Upload a non-CSV file (e.g., .txt, .pdf)
2. Verify error message appears
3. Verify no crash occurs

### Test: Missing Variables
1. Upload valid CSV
2. Try to run analysis without selecting variables
3. Verify validation error appears

### Test: Network Error Recovery
1. Start analysis
2. Simulate network interruption (optional)
3. Verify graceful error handling

---

## Screenshot Checkpoints

When performing E2E tests, capture screenshots at these key points:

1. **Initial Page Load**: Verify layout renders correctly
2. **After File Upload**: Data preview should be visible
3. **Variable Selection**: Selected variables highlighted
4. **Analysis Running**: Loading indicator visible
5. **Results Display**: Full results table and charts
6. **Error States**: Any error messages

---

## Running with Playwright (Future)

```bash
# Install Playwright (when ready)
npm install -D @playwright/test

# Run E2E tests
npm run e2e

# Generate report
npx playwright show-report
```

---

## Contact

For questions about test scenarios or expected results, refer to:
- `test-data/reference-results/r-reference-results.ts` - Golden values
- Design System: `/design-system` - Test Automation Dashboard section
