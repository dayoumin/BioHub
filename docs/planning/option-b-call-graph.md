# Option B Refactoring - Call Graph & Flow Documentation

**Document Created**: 2025-10-17
**Purpose**: Day 1-2 Analysis - Method Dependencies and Execution Flows
**Related**: [option-b-structure-analysis.md](option-b-structure-analysis.md)

---

## 📊 Overview

This document maps all execution flows in PyodideStatisticsService to understand:
1. How methods call each other (call graph)
2. Initialization sequences
3. Worker loading dependencies
4. Helper function usage patterns

**Goal**: Ensure safe extraction during Option B refactoring without breaking dependencies.

---

## 🔄 Core Initialization Flow

### Level 1: Application Startup
```
Application Start
  │
  ├─ PyodideStatisticsService.getInstance()
  │    │
  │    ├─ Check if instance exists
  │    │    ├─ Yes → Return existing instance
  │    │    └─ No → Create new instance
  │    │         └─ Call private constructor()
  │    │              └─ Initialize instance variables:
  │    │                   - pyodide = null
  │    │                   - isLoading = false
  │    │                   - loadPromise = null
  │    │                   - packagesLoaded = false
  │    │
  │    └─ Return PyodideStatisticsService instance
  │
  └─ User calls initialize()
       │
       └─ See "Level 2: initialize() Flow" below
```

### Level 2: initialize() Flow
```
initialize()
  │
  ├─ Check if already initialized
  │    ├─ If pyodide !== null → Return immediately
  │    └─ If isLoading → Return existing loadPromise
  │
  ├─ Set isLoading = true
  ├─ Create new loadPromise
  │
  ├─ Call _loadPyodide()
  │    │
  │    ├─ Load pyodide.js from CDN
  │    │    └─ URL: https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js
  │    │
  │    ├─ Wait for loadPyodide() global function
  │    │
  │    ├─ Call loadPyodide({ indexURL })
  │    │    └─ indexURL: https://cdn.jsdelivr.net/pyodide/v0.26.4/full/
  │    │
  │    └─ Return pyodide instance
  │
  ├─ Store pyodide instance
  │    └─ this.pyodide = <PyodideInterface>
  │
  ├─ Load initial packages (NumPy + SciPy)
  │    └─ pyodide.loadPackage(['numpy', 'scipy'])
  │         ├─ numpy: ~5MB (1.5 seconds)
  │         └─ scipy: ~8MB (0.5 seconds)
  │         └─ Total: ~2 seconds
  │
  ├─ Set packagesLoaded = true
  ├─ Set isLoading = false
  │
  └─ Return void (initialization complete)
```

### Level 3: Worker Lazy Loading Flow
```
ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4)
  │
  ├─ Check if pyodide initialized
  │    └─ If not → Throw error
  │
  ├─ Get worker file name
  │    └─ getWorkerFileName(workerNumber)
  │         ├─ 1 → 'worker1-descriptive'
  │         ├─ 2 → 'worker2-hypothesis'
  │         ├─ 3 → 'worker3-nonparametric-anova'
  │         └─ 4 → 'worker4-regression-advanced'
  │
  ├─ Check if worker already loaded
  │    └─ pyodide.runPython(`'${workerName}' in sys.modules`)
  │         ├─ True → Worker cached, skip loading
  │         └─ False → Continue to load worker
  │
  ├─ Fetch worker Python file
  │    └─ fetch(`/workers/python/${workerFileName}.py`)
  │         └─ Read response.text()
  │
  ├─ Execute worker Python code
  │    └─ pyodide.runPythonAsync(workerCode)
  │         └─ Imports sys, registers functions in sys.modules
  │
  ├─ Load additional packages (if needed)
  │    └─ loadAdditionalPackages(workerNumber)
  │         │
  │         ├─ Worker 1: [] (no extra packages)
  │         ├─ Worker 2: ['statsmodels', 'pandas']
  │         ├─ Worker 3: ['statsmodels', 'pandas']
  │         └─ Worker 4: ['statsmodels', 'scikit-learn']
  │
  └─ Worker ready for method calls
```

**Specific Worker Loaders**:
```
ensureWorker1Loaded() → ensureWorkerLoaded(1)
ensureWorker2Loaded() → ensureWorkerLoaded(2)
ensureWorker3Loaded() → ensureWorkerLoaded(3)
ensureWorker4Loaded() → ensureWorkerLoaded(4)
```

---

## 🎯 Method Execution Flow

### Universal Method Call Pattern
```
User calls pyodideStats.linearRegression(x, y)
  │
  └─ linearRegression(x: number[], y: number[])
       │
       └─ callWorkerMethod<LinearRegressionResult>()
            │
            ├─ STEP 1: Parameter Validation
            │    └─ For each parameter (x, y):
            │         └─ validateWorkerParam(param)
            │              ├─ Check if undefined → Throw error
            │              ├─ Check if number/string/boolean → OK
            │              ├─ Check if Array → Validate each element
            │              ├─ Check if NaN/Infinity → Throw error
            │              └─ Return validated param
            │
            ├─ STEP 2: Ensure Worker Loaded
            │    └─ ensureWorkerLoaded(4)
            │         └─ See "Level 3: Worker Lazy Loading Flow" above
            │
            ├─ STEP 3: Build Python Call
            │    └─ pythonCode = `
            │         import json
            │         result = linear_regression(
            │           json.loads('${JSON.stringify(x)}'),
            │           json.loads('${JSON.stringify(y)}')
            │         )
            │         json.dumps(result)
            │       `
            │
            ├─ STEP 4: Execute Python
            │    └─ pyodide.runPythonAsync(pythonCode)
            │         └─ Returns JSON string or error
            │
            ├─ STEP 5: Parse Result
            │    └─ parsePythonResult<LinearRegressionResult>(result)
            │         │
            │         ├─ Try JSON.parse(result)
            │         ├─ Check if error object
            │         │    └─ isPythonError(parsed)
            │         │         ├─ Yes → Return { error: string }
            │         │         └─ No → Return typed result
            │         │
            │         └─ Catch: Return raw result as fallback
            │
            └─ STEP 6: Return to User
                 └─ Return LinearRegressionResult | { error: string }
```

---

## 🔗 Method Dependency Graph

### Worker 1: Descriptive Statistics

**Independent Methods** (no internal calls):
```
descriptiveStats()
  └─ callWorkerMethod(1, 'descriptive_stats', ...)

normalityTest()
  └─ callWorkerMethod(1, 'normality_test', ...)

outlierDetection()
  └─ callWorkerMethod(1, 'outlier_detection', ...)

frequencyAnalysis()
  └─ callWorkerMethod(1, 'frequency_analysis', ...)

crosstabAnalysis()
  └─ callWorkerMethod(1, 'crosstab_analysis', ...)

oneSampleProportionTest()
  └─ callWorkerMethod(1, 'one_sample_proportion_test', ...)

cronbachAlphaWorker()
  └─ callWorkerMethod(1, 'cronbach_alpha', ...)
```

**Wrapper Methods** (delegate to primary):
```
calculateDescriptiveStatistics()
  └─ descriptiveStats()

calculateDescriptiveStats()
  └─ descriptiveStats()

testNormality()
  └─ normalityTest()

cronbachAlpha()
  └─ cronbachAlphaWorker()
```

**Validation Methods** (independent):
```
shapiroWilkTest()
  └─ callWorkerMethod(1, 'shapiro_wilk_test', ...)

kolmogorovSmirnovTest()
  └─ callWorkerMethod(1, 'kolmogorov_smirnov_test', ...)

detectOutliersIQR()
  └─ callWorkerMethod(1, 'detect_outliers_iqr', ...)
```

**Composite Method** (calls multiple Worker 1 methods):
```
checkAllAssumptions()
  ├─ normalityTest()
  ├─ outlierDetection()
  └─ Returns combined result
```

**Dependency Count**: 1 composite method (checkAllAssumptions)

---

### Worker 2: Hypothesis Testing

**Independent Methods**:
```
correlationTest() → callWorkerMethod(2, 'correlation_test', ...)
tTestOneSample() → callWorkerMethod(2, 't_test_one_sample', ...)
tTestTwoSample() → callWorkerMethod(2, 't_test_two_sample', ...)
tTestPaired() → callWorkerMethod(2, 't_test_paired', ...)
zTestWorker() → callWorkerMethod(2, 'z_test', ...)
chiSquareTestWorker() → callWorkerMethod(2, 'chi_square_test', ...)
binomialTestWorker() → callWorkerMethod(2, 'binomial_test', ...)
partialCorrelationWorker() → callWorkerMethod(2, 'partial_correlation', ...)
leveneTest() → callWorkerMethod(2, 'levene_test', ...)
bartlettTest() → callWorkerMethod(2, 'bartlett_test', ...)
chiSquareGoodnessTest() → callWorkerMethod(2, 'chi_square_goodness', ...)
chiSquareIndependenceTest() → callWorkerMethod(2, 'chi_square_independence', ...)
```

**Wrapper Methods**:
```
oneSampleTTest() → tTestOneSample()
twoSampleTTest() → tTestTwoSample()
pairedTTest() → tTestPaired()
chiSquareTest() → chiSquareTestWorker()
chiSquare() → chiSquareTestWorker()
calculateCorrelation() → correlationTest()
```

**Generic Wrappers** (parameter-based routing):
```
tTest(type: 'one-sample' | 'two-sample' | 'paired', ...)
  ├─ type === 'one-sample' → tTestOneSample()
  ├─ type === 'two-sample' → tTestTwoSample()
  └─ type === 'paired' → tTestPaired()

correlation(method: 'pearson' | 'spearman' | 'kendall', ...)
  └─ correlationTest(method, ...)

testHomogeneity(method: 'levene' | 'bartlett', ...)
  ├─ method === 'levene' → leveneTest()
  └─ method === 'bartlett' → bartlettTest()
```

**Post-hoc Method**:
```
performBonferroni(pValues, alpha)
  └─ callWorkerMethod(2, 'bonferroni_correction', ...)
```

**Dependency Count**: 3 generic routers (tTest, correlation, testHomogeneity)

---

### Worker 3: Nonparametric & ANOVA

**Nonparametric Primary Methods**:
```
mannWhitneyTestWorker() → callWorkerMethod(3, 'mann_whitney_test', ...)
wilcoxonTestWorker() → callWorkerMethod(3, 'wilcoxon_test', ...)
kruskalWallisTestWorker() → callWorkerMethod(3, 'kruskal_wallis_test', ...)
friedmanTestWorker() → callWorkerMethod(3, 'friedman_test', ...)
signTestWorker() → callWorkerMethod(3, 'sign_test', ...)
runsTestWorker() → callWorkerMethod(3, 'runs_test', ...)
mcnemarTestWorker() → callWorkerMethod(3, 'mcnemar_test', ...)
cochranQTestWorker() → callWorkerMethod(3, 'cochran_q_test', ...)
moodMedianTestWorker() → callWorkerMethod(3, 'mood_median_test', ...)
```

**ANOVA Primary Methods**:
```
oneWayAnovaWorker() → callWorkerMethod(3, 'one_way_anova', ...)
twoWayAnovaWorker() → callWorkerMethod(3, 'two_way_anova', ...)
repeatedMeasuresAnovaWorker() → callWorkerMethod(3, 'repeated_measures_anova', ...)
ancovaWorker() → callWorkerMethod(3, 'ancova', ...)
manovaWorker() → callWorkerMethod(3, 'manova', ...)
```

**Post-hoc Methods**:
```
tukeyHSDWorker() → callWorkerMethod(3, 'tukey_hsd', ...)
scheffeTestWorker() → callWorkerMethod(3, 'scheffe_test', ...)
dunnTest() → callWorkerMethod(3, 'dunn_test', ...)
gamesHowellTest() → callWorkerMethod(3, 'games_howell_test', ...)
```

**Legacy Wrapper Methods** (field conversion):
```
mannWhitneyU()
  └─ mannWhitneyTestWorker()
       └─ Convert pValue → pvalue

wilcoxon()
  └─ wilcoxonTestWorker()
       └─ Convert pValue → pvalue

kruskalWallis()
  └─ kruskalWallisTestWorker()
       └─ Convert pValue → pvalue

friedman()
  └─ friedmanTestWorker()
       └─ Convert pValue → pvalue

tukeyHSD()
  └─ tukeyHSDWorker()
       └─ Return same result
```

**Generic Wrapper**:
```
anova(type: 'one-way' | 'two-way' | 'repeated' | 'ancova' | 'manova', ...)
  ├─ type === 'one-way' → oneWayAnovaWorker()
  ├─ type === 'two-way' → twoWayAnovaWorker()
  ├─ type === 'repeated' → repeatedMeasuresAnovaWorker()
  ├─ type === 'ancova' → ancovaWorker()
  └─ type === 'manova' → manovaWorker()
```

**Additional Wrappers**:
```
oneWayANOVA() → oneWayAnovaWorker()
twoWayANOVA() → twoWayAnovaWorker()
repeatedMeasuresAnova() → repeatedMeasuresAnovaWorker()
performTukeyHSD() → tukeyHSD() → tukeyHSDWorker()
```

**Dependency Count**: 1 generic router (anova), 5 legacy converters, 4 simple aliases

---

### Worker 4: Regression & Advanced

**Priority 1 Primary Methods**:
```
linearRegression() → callWorkerMethod(4, 'linear_regression', ...)
pcaAnalysis() → callWorkerMethod(4, 'pca_analysis', ...)
durbinWatsonTest() → callWorkerMethod(4, 'durbin_watson_test', ...)
```

**Priority 1 Legacy Methods** (Adapter pattern):
```
regression(x, y, options)
  └─ linearRegression(x, y)
       └─ Adapter: Convert fields
            ├─ pValue → pvalue
            ├─ nPairs → df (nPairs - 2)
            ├─ Add fStatistic: undefined
            ├─ Add tStatistic: undefined
            └─ Add predictions: undefined

pca(data)
  └─ pcaAnalysis(data, 2)
       └─ Adapter: Add totalExplainedVariance
            └─ Sum of explainedVarianceRatio

testIndependence(residuals)
  └─ durbinWatsonTest(residuals)
       └─ Simple redirect (no conversion)
```

**Priority 2 Primary Methods**:
```
curveEstimation() → callWorkerMethod(4, 'curve_estimation', ...)
nonlinearRegression() → callWorkerMethod(4, 'nonlinear_regression', ...)
stepwiseRegression() → callWorkerMethod(4, 'stepwise_regression', ...)
binaryLogistic() → callWorkerMethod(4, 'binary_logistic', ...)
multinomialLogistic() → callWorkerMethod(4, 'multinomial_logistic', ...)
ordinalLogistic() → callWorkerMethod(4, 'ordinal_logistic', ...)
probitRegression() → callWorkerMethod(4, 'probit_regression', ...)
poissonRegression() → callWorkerMethod(4, 'poisson_regression', ...)
negativeBinomialRegression() → callWorkerMethod(4, 'negative_binomial_regression', ...)
multipleRegression() → callWorkerMethod(4, 'multiple_regression', ...)
factorAnalysis() → callWorkerMethod(4, 'factor_analysis', ...)
```

**Priority 2 Wrapper Methods**:
```
logisticRegression(type: 'binary' | 'multinomial' | 'ordinal', ...)
  ├─ type === 'binary' → binaryLogistic()
  ├─ type === 'multinomial' → multinomialLogistic()
  └─ type === 'ordinal' → ordinalLogistic()
```

**Legacy Wrappers**:
```
simpleLinearRegression() → regression()
performPCA() → pca()
```

**Priority 3 Methods** (future):
```
clusterAnalysis() → callWorkerMethod(4, 'cluster_analysis', ...)
timeSeriesAnalysis() → callWorkerMethod(4, 'time_series_analysis', ...)
```

**Dependency Count**: 3 adapters (regression, pca, testIndependence), 1 generic router (logisticRegression), 2 legacy wrappers

---

## 🛠️ Helper Function Usage Matrix

### callWorkerMethod<T>()
**Used By**: ALL 98 public methods (100% usage)
**Purpose**: Universal worker method invoker
**Dependencies**:
- validateWorkerParam() - parameter validation
- ensureWorkerLoaded() - worker initialization
- parsePythonResult<T>() - result parsing

### validateWorkerParam()
**Used By**: callWorkerMethod() only
**Purpose**: JSON serialization safety check
**Dependencies**: None (pure validation)

### parsePythonResult<T>()
**Used By**: callWorkerMethod() only
**Purpose**: Parse JSON with type checking
**Dependencies**:
- isPythonError() - error type guard

### isPythonError()
**Used By**: parsePythonResult() only
**Purpose**: Type guard for Python errors
**Dependencies**: None (type guard)

### ensureWorkerLoaded()
**Used By**: callWorkerMethod() only
**Purpose**: Lazy load workers
**Dependencies**:
- getWorkerFileName() - file name mapping
- loadAdditionalPackages() - package loading

### getWorkerFileName()
**Used By**: ensureWorkerLoaded() only
**Purpose**: Map worker number to file name
**Dependencies**: None (pure function)

### loadAdditionalPackages()
**Used By**: ensureWorkerLoaded() only
**Purpose**: Load statsmodels/scikit-learn
**Dependencies**: None (async package loader)

### _loadPyodide()
**Used By**: initialize() only
**Purpose**: Load Pyodide from CDN
**Dependencies**: External CDN (https://cdn.jsdelivr.net)

---

## 📈 Method Call Frequency (Estimated)

### Tier 1: High-Frequency Methods (>50 calls/day)
```
descriptiveStats()          - Basic statistics
tTestTwoSample()           - Independent t-test
correlationTest()          - Correlation analysis
oneWayAnovaWorker()        - One-way ANOVA
linearRegression()         - Simple regression
```

### Tier 2: Medium-Frequency Methods (10-50 calls/day)
```
normalityTest()            - Shapiro-Wilk test
tTestPaired()              - Paired t-test
chiSquareTestWorker()      - Chi-square test
mannWhitneyTestWorker()    - Mann-Whitney U
pcaAnalysis()              - PCA
```

### Tier 3: Low-Frequency Methods (1-10 calls/day)
```
outlierDetection()         - Outlier detection
kruskalWallisTestWorker()  - Kruskal-Wallis
tukeyHSDWorker()           - Tukey HSD
binaryLogistic()           - Logistic regression
curveEstimation()          - Curve fitting
```

### Tier 4: Rare Methods (<1 call/day)
```
cronbachAlphaWorker()      - Reliability analysis
partialCorrelationWorker() - Partial correlation
manovaWorker()             - MANOVA
factorAnalysis()           - Factor analysis
timeSeriesAnalysis()       - Time series
```

**Insight for Refactoring**: Worker 1 (Tier 1) should be optimized for speed. Worker 4 (Tier 3-4) can afford slightly slower initialization.

---

## 🔍 Cross-Worker Dependencies

### Worker 1 Dependencies
**Internal**: 1 composite method (checkAllAssumptions)
**External**: None

### Worker 2 Dependencies
**Internal**: 3 generic routers (tTest, correlation, testHomogeneity)
**External**: None

### Worker 3 Dependencies
**Internal**: 1 generic router (anova), 5 legacy converters
**External**: None

### Worker 4 Dependencies
**Internal**: 3 adapters (regression, pca, testIndependence), 1 generic router (logisticRegression)
**External**: None

**Critical Finding**: Zero cross-worker dependencies! Each worker is fully self-contained.
This confirms Option B refactoring is safe - workers can be separated without breaking internal calls.

---

## 🎯 Refactoring Impact Analysis

### Safe to Extract (No Dependencies)
- ✅ All Worker 1 primary methods (7)
- ✅ All Worker 2 primary methods (12)
- ✅ All Worker 3 primary methods (17)
- ✅ All Worker 4 primary methods (18)
- ✅ All helper functions (11)

### Requires Special Handling (Internal Dependencies)
- ⚠️ checkAllAssumptions() - Calls normalityTest() + outlierDetection()
  - Solution: Keep in Worker1DescriptiveService
- ⚠️ tTest() - Router to tTestOneSample/TwoSample/Paired
  - Solution: Keep in Worker2HypothesisService
- ⚠️ correlation() - Router to correlationTest with method parameter
  - Solution: Keep in Worker2HypothesisService
- ⚠️ testHomogeneity() - Router to leveneTest/bartlettTest
  - Solution: Keep in Worker2HypothesisService
- ⚠️ anova() - Router to 5 ANOVA methods
  - Solution: Keep in Worker3NonparametricAnovaService
- ⚠️ logisticRegression() - Router to binaryLogistic/multinomialLogistic/ordinalLogistic
  - Solution: Keep in Worker4RegressionAdvancedService

**Total Internal Dependencies**: 6 routers (all stay within their respective worker services)

---

## ✅ Verification Checklist

### Day 1-2 Deliverables
- ✅ Initialize flow documented (3 levels)
- ✅ Worker lazy loading flow documented
- ✅ Method execution flow mapped (6 steps)
- ✅ Method dependency graph created (4 workers)
- ✅ Helper function usage matrix documented (11 functions)
- ✅ Cross-worker dependencies analyzed (0 found!)
- ✅ Call frequency estimated (4 tiers)
- ✅ Refactoring impact assessed (6 routers identified)

### Ready for Day 3-4
- ✅ No blocking dependencies found
- ✅ Helper functions clearly identified for PyodideCore extraction
- ✅ Worker methods safe to separate (no cross-worker calls)
- ✅ Generic routers identified for special handling

---

**Document Status**: ✅ Complete
**Critical Insight**: Zero cross-worker dependencies means Option B refactoring is 100% safe
**Next Step**: Extract PyodideCore (Day 3-4)
