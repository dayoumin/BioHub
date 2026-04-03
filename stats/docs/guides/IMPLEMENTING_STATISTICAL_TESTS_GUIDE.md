# Guide: Implementing Statistical Tests with Pyodide

**Purpose**: Reference guide for implementing statistical tests when standard libraries are unavailable in Pyodide.

**Last Updated**: 2025-10-30

---

## 📋 Decision Tree: When Can I Implement from Scratch?

```
Is the function available in SciPy/statsmodels/pingouin?
├─ YES → ✅ Use the library function
│         Example: scipy.stats.ttest_ind(), scipy.stats.pearsonr()
│
└─ NO → Is it a simple mathematical formula?
    ├─ YES → Can you use library functions for core calculations?
    │   ├─ YES → ✅ Implement using library building blocks
    │   │         Example: Mann-Kendall (uses scipy.stats.kendalltau, norm.cdf)
    │   │
    │   └─ NO → ❌ Ask user for approval first
    │             Example: Complex optimization algorithms
    │
    └─ NO → Is it a complex algorithm?
        └─ ❌ Ask user for approval or find alternative library
```

---

## ✅ ALLOWED: Simple Statistical Formulas

### Category 1: Basic Statistical Calculations
**Definition**: Single-step mathematical operations

**Examples**:
- Mean: `np.mean(data)`
- Median: `np.median(data)`
- Standard Deviation: `np.std(data)`
- Variance: `np.var(data)`
- Z-score: `(x - mean) / std`
- Percentiles: `np.percentile(data, q)`

**Guideline**: If it's in a statistics textbook's "descriptive statistics" chapter, it's allowed.

---

### Category 2: Formula-Based Tests
**Definition**: Tests defined by a direct mathematical formula (no iteration)

**Examples**:

#### Mann-Kendall Test (Approved - see MANN_KENDALL_IMPLEMENTATION_SUMMARY.md)
```python
# S statistic (count concordant/discordant pairs)
S = sum(np.sign(data[j] - data[i]) for i in range(n-1) for j in range(i+1, n))

# Variance (formula from literature)
var_s = n * (n - 1) * (2 * n + 5) / 18

# Z-score (with continuity correction)
z = (S - 1) / np.sqrt(var_s) if S > 0 else (S + 1) / np.sqrt(var_s) if S < 0 else 0

# P-value (using scipy)
p = 2 * (1 - stats.norm.cdf(abs(z)))

# Kendall's tau (using scipy)
tau, _ = stats.kendalltau(time_indices, data)

# Sen's slope (median of slopes)
slopes = [(data[j] - data[i]) / (j - i) for i in range(n-1) for j in range(i+1, n)]
sen_slope = np.median(slopes)
```

**Why Allowed**:
- ✅ Uses scipy.stats functions (kendalltau, norm.cdf)
- ✅ Formulas are from published literature
- ✅ No complex optimization or iteration
- ✅ Similar complexity to mean/median calculations

---

### Category 3: Data Transformations
**Definition**: Reshaping, filtering, or simple computations on data

**Examples**:
- Removing NaN/None: `data = data[~np.isnan(data)]`
- Filtering: `data = data[data > 0]`
- Grouping: `pd.DataFrame.groupby()`
- Normalization: `(data - mean) / std`
- Log transform: `np.log(data)`
- Rank transform: `scipy.stats.rankdata(data)`

---

## ❌ PROHIBITED: Complex Algorithms

### Category 1: Iterative Optimization
**Definition**: Algorithms requiring loops with convergence criteria

**Examples** (❌ DO NOT IMPLEMENT):
```python
# ❌ Newton-Raphson for logistic regression
for i in range(max_iter):
    gradient = compute_gradient(beta, X, y)
    hessian = compute_hessian(beta, X, y)
    beta = beta - inv(hessian) @ gradient
    if converged:
        break

# ❌ Gradient descent
for epoch in range(max_epochs):
    for batch in data:
        loss = compute_loss(weights, batch)
        weights -= learning_rate * gradients

# ❌ EM algorithm
for i in range(max_iter):
    E_step()  # Expectation
    M_step()  # Maximization
    if converged:
        break
```

**Why Prohibited**:
- Requires careful numerical stability handling
- Complex convergence criteria
- Risk of incorrect implementation
- **Use statsmodels instead**:
  - `statsmodels.api.Logit().fit()`
  - `statsmodels.tsa.arima.ARIMA().fit()`
  - `sklearn.cluster.KMeans().fit()`

---

### Category 2: Matrix Decompositions
**Definition**: Advanced linear algebra operations

**Examples** (⚠️ Use Library Functions):
```python
# ⚠️ Don't implement manually, use library:
from scipy.linalg import svd, eig, qr, cholesky

# ✅ Correct usage:
U, s, Vt = svd(matrix)        # Singular Value Decomposition
eigenvalues, eigenvectors = eig(matrix)  # Eigendecomposition
Q, R = qr(matrix)             # QR decomposition
L = cholesky(matrix)          # Cholesky decomposition
```

---

### Category 3: Resampling Methods
**Definition**: Bootstrap, permutation tests, cross-validation

**Examples**:

**❌ Full Bootstrap from Scratch** (complex):
```python
# ❌ Don't implement full bootstrap framework
for i in range(n_bootstrap):
    sample = resample(data)
    statistic[i] = compute_statistic(sample)
ci = np.percentile(statistic, [2.5, 97.5])
```

**✅ Simple Random Sampling** (allowed):
```python
# ✅ Simple resampling is OK
indices = np.random.choice(len(data), size=len(data), replace=True)
sample = data[indices]
```

**✅ Use Library for Complex Resampling**:
```python
from scipy.stats import bootstrap
result = bootstrap((data,), statistic_function, n_resamples=10000)
```

---

## 🟡 GREY AREA: Ask User First

### When to Ask User for Approval

1. **Library function exists but is deprecated**:
   - Example: `scipy.stats.chisquare()` vs manual chi-square calculation
   - **Action**: Ask if we should use deprecated function or implement

2. **Multiple implementation approaches**:
   - Example: Exact test vs asymptotic approximation
   - **Action**: Ask which approach to use

3. **Performance trade-offs**:
   - Example: Exact calculation (slow) vs approximation (fast)
   - **Action**: Explain trade-offs and ask user

4. **Numerical stability concerns**:
   - Example: Computing `log(1 + x)` vs `np.log1p(x)`
   - **Action**: Use numerically stable version (`np.log1p`)

---

## 📚 Reference: Available Statistical Functions

### SciPy (scipy.stats)

#### Parametric Tests
- `ttest_ind()` - Independent t-test
- `ttest_rel()` - Paired t-test
- `ttest_1samp()` - One-sample t-test
- `f_oneway()` - One-way ANOVA
- `pearsonr()` - Pearson correlation
- `spearmanr()` - Spearman correlation
- `kendalltau()` - Kendall's tau
- `linregress()` - Linear regression

#### Non-parametric Tests
- `mannwhitneyu()` - Mann-Whitney U test
- `wilcoxon()` - Wilcoxon signed-rank test
- `kruskal()` - Kruskal-Wallis H test
- `friedmanchisquare()` - Friedman test
- `kstest()` - Kolmogorov-Smirnov test
- `shapiro()` - Shapiro-Wilk normality test
- `anderson()` - Anderson-Darling test

#### Distributions
- `norm.cdf()` - Normal CDF
- `norm.pdf()` - Normal PDF
- `t.cdf()` - t-distribution CDF
- `chi2.cdf()` - Chi-square CDF
- `f.cdf()` - F-distribution CDF

### statsmodels

#### Regression
- `OLS()` - Ordinary Least Squares
- `WLS()` - Weighted Least Squares
- `GLS()` - Generalized Least Squares
- `Logit()` - Logistic Regression
- `Poisson()` - Poisson Regression
- `GLM()` - Generalized Linear Models

#### Time Series
- `ARIMA()` - AutoRegressive Integrated Moving Average
- `VAR()` - Vector AutoRegression
- `SARIMAX()` - Seasonal ARIMA with exogenous variables

#### Diagnostics
- `het_breuschpagan()` - Breusch-Pagan test for heteroscedasticity
- `acorr_ljungbox()` - Ljung-Box test for autocorrelation
- `durbin_watson()` - Durbin-Watson statistic

### pingouin

#### Effect Sizes
- `compute_effsize()` - Cohen's d, Hedges' g
- `power_ttest()` - Power analysis for t-tests

#### Post-hoc Tests
- `pairwise_ttests()` - Pairwise t-tests with corrections
- `pairwise_tukey()` - Tukey's HSD

#### Reliability
- `intraclass_corr()` - Intraclass correlation
- `cronbach_alpha()` - Cronbach's alpha

---

## 🔍 Case Study: Mann-Kendall Implementation

**Date**: 2025-10-30
**File**: `stats/app/(dashboard)/statistics/mann-kendall/page.tsx`

### Problem
pymannkendall not available in Pyodide.

### Decision Process
1. **Check SciPy**: ❌ No `mann_kendall()` function
2. **Check statsmodels**: ❌ No Mann-Kendall function
3. **Analyze complexity**:
   - S statistic: Simple counting (✅ allowed)
   - Variance: Direct formula (✅ allowed)
   - Z-score: Standardization (✅ allowed)
   - P-value: Uses `scipy.stats.norm.cdf()` (✅ allowed)
   - Kendall's tau: Uses `scipy.stats.kendalltau()` (✅ allowed)
   - Sen's slope: Median of slopes (✅ allowed)

### Implementation Strategy
```python
# ✅ Use scipy for core statistical functions
from scipy import stats

# ✅ Implement formulas from literature
S = sum(np.sign(data[j] - data[i]) for i in range(n-1) for j in range(i+1, n))
var_s = n * (n - 1) * (2 * n + 5) / 18
z = (S - 1) / np.sqrt(var_s)  # Continuity correction

# ✅ Use scipy for statistical computations
p = 2 * (1 - stats.norm.cdf(abs(z)))
tau, _ = stats.kendalltau(range(n), data)
```

### Validation
- ✅ TypeScript: 0 errors
- ✅ Uses validated libraries: scipy.stats
- ✅ Formulas from published papers (Mann 1945, Kendall 1975, Sen 1968)
- ✅ Matches pymannkendall output format

### Conclusion
**Approved** - Implementation allowed because:
1. Uses scipy.stats functions for statistical calculations
2. Formulas are simple mathematical operations
3. No complex algorithms or optimization
4. Library unavailability justifies implementation

**Full details**: See `MANN_KENDALL_IMPLEMENTATION_SUMMARY.md`

---

## 📖 Best Practices

### 1. Documentation
Always document:
- Why this implementation is needed (library unavailable?)
- Which library functions are used
- References to formulas (papers, textbooks)
- Validation results

### 2. Validation
For custom implementations:
- ✅ Compare with R packages (if available)
- ✅ Test with known datasets (from textbooks)
- ✅ Check edge cases (n=4, n=1000, ties, NaN)
- ✅ Verify mathematical correctness

### 3. Error Handling
```python
# ✅ Check input validity
if len(data) < 4:
    raise ValueError("Minimum sample size: 4")

# ✅ Handle NaN/None
data = np.array([x for x in data if x is not None and not np.isnan(x)])

# ✅ Handle edge cases
if len(slopes) == 0:
    sen_slope = 0
else:
    sen_slope = np.median(slopes)
```

### 4. Type Safety
```typescript
// ✅ Explicit types
interface MannKendallResult {
  trend: 'increasing' | 'decreasing' | 'no trend'
  h: boolean
  p: number
  z: number
  tau: number
  s: number
  var_s: number
  slope: number
  intercept: number
}

// ✅ Type guards
if (!analysisResult || typeof analysisResult !== 'object') {
  throw new Error('Invalid result format')
}
```

---

## 🚨 Common Mistakes

### Mistake 1: Implementing Everything from Scratch
```python
# ❌ BAD: Implementing standard functions
def my_mean(data):
    return sum(data) / len(data)

def my_std(data):
    mean = my_mean(data)
    return sqrt(sum((x - mean)**2 for x in data) / len(data))

# ✅ GOOD: Use NumPy
mean = np.mean(data)
std = np.std(data)
```

### Mistake 2: Ignoring Numerical Stability
```python
# ❌ BAD: Numerically unstable
variance = np.mean(data**2) - np.mean(data)**2

# ✅ GOOD: Numerically stable
variance = np.var(data)
```

### Mistake 3: Not Handling Edge Cases
```python
# ❌ BAD: Crashes on empty array
sen_slope = np.median(slopes)

# ✅ GOOD: Handle empty case
sen_slope = np.median(slopes) if slopes else 0
```

### Mistake 4: Incorrect Statistical Formula
```python
# ❌ BAD: Wrong continuity correction
z = S / np.sqrt(var_s)

# ✅ GOOD: Correct continuity correction
if S > 0:
    z = (S - 1) / np.sqrt(var_s)
elif S < 0:
    z = (S + 1) / np.sqrt(var_s)
else:
    z = 0
```

---

## 📞 When in Doubt

**Ask the user**:
> "I found that [function] is not available in [library]. I can implement it using [approach], which involves [description]. This is similar to [simple example]. Should I proceed?"

**Provide alternatives**:
> "Alternative 1: Use approximation [X] (faster, less accurate)
> Alternative 2: Implement exact calculation [Y] (slower, more accurate)
> Which would you prefer?"

**Explain trade-offs**:
> "The exact method requires [complex algorithm], which may violate CLAUDE.md rules. The approximation uses [simple formula] but has [limitation]. Recommendation: [X] because [reason]."

---

## ✅ Checklist: Before Implementing from Scratch

- [ ] Checked SciPy documentation
- [ ] Checked statsmodels documentation
- [ ] Checked pingouin documentation
- [ ] Verified library unavailability in Pyodide
- [ ] Analyzed algorithm complexity (is it simple formulas?)
- [ ] Identified which library functions can be used
- [ ] Prepared references to formulas (papers/textbooks)
- [ ] Planned validation strategy
- [ ] Asked user for approval (if grey area)

---

## 📚 Additional Resources

### Documentation
- SciPy Stats: https://docs.scipy.org/doc/scipy/reference/stats.html
- statsmodels: https://www.statsmodels.org/stable/api.html
- pingouin: https://pingouin-stats.org/api.html

### Validation
- R packages: stats, car, psych, lme4
- Python packages: scikit-learn, pandas
- Online calculators: GraphPad, VassarStats

### References
- Statistical textbooks: "Statistical Methods" by Snedecor & Cochran
- Papers: Original papers for specific tests
- Wikipedia: Often has formulas with citations

---

**Last Updated**: 2025-10-30
**Approved Examples**: Mann-Kendall Test (see MANN_KENDALL_IMPLEMENTATION_SUMMARY.md)
