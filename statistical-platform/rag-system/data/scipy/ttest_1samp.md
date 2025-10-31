---
title: scipy.stats.ttest_1samp
description: 단일표본 t-검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.ttest_1samp

**Description**: 단일표본 t-검정

**Original Documentation**: [scipy.stats.ttest_1samp](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html)

---


  * ttest_1samp


scipy.stats.

# ttest_1samp[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html#ttest-1samp "Link to this heading") 

scipy.stats.ttest_1samp(_a_ , _popmean_ , _axis =0_, _nan_policy ='propagate'_, _alternative ='two-sided'_, _*_ , _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L6035-L6233)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html#scipy.stats.ttest_1samp "Link to this definition") 
    
Calculate the T-test for the mean of ONE group of scores.
This is a test for the null hypothesis that the expected value (mean) of a sample of independent observations _a_ is equal to the given population mean, _popmean_. 

Parameters: 
     

**a** array_like 
    
Sample observations. 

**popmean** float or array_like 
    
Expected value in null hypothesis. If array_like, then its length along _axis_ must equal 1, and it must otherwise be broadcastable with _a_. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. The following options are available (default is ‘two-sided’):
  * ‘two-sided’: the mean of the underlying distribution of the sample is different than the given population mean (_popmean_)
  * ‘less’: the mean of the underlying distribution of the sample is less than the given population mean (_popmean_)
  * ‘greater’: the mean of the underlying distribution of the sample is greater than the given population mean (_popmean_)


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**result**[`TtestResult`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats._result_classes.TtestResult.html#scipy.stats._result_classes.TtestResult "scipy.stats._result_classes.TtestResult") 
    
An object with the following attributes: 

statisticfloat or array 
    
The t-statistic. 

pvaluefloat or array 
    
The p-value associated with the given alternative. 

dffloat or array 
    
The number of degrees of freedom used in calculation of the t-statistic; this is one less than the size of the sample (`a.shape[axis]`).
Added in version 1.10.0.
The object also has the following method: 

confidence_interval(confidence_level=0.95)
    
Computes a confidence interval around the population mean for the given confidence level. The confidence interval is returned in a `namedtuple` with fields _low_ and _high_.
Added in version 1.10.0.
Notes
The statistic is calculated as `(np.mean(a) - popmean)/se`, where `se` is the standard error. Therefore, the statistic will be positive when the sample mean is greater than the population mean and negative when the sample mean is less than the population mean.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`ttest_1samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html#scipy.stats.ttest_1samp "scipy.stats.ttest_1samp") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ⛔  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
Examples
Try it in your browser!
Suppose we wish to test the null hypothesis that the mean of a population is equal to 0.5. We choose a confidence level of 99%; that is, we will reject the null hypothesis in favor of the alternative if the p-value is less than 0.01.
When testing random variates from the standard uniform distribution, which has a mean of 0.5, we expect the data to be consistent with the null hypothesis most of the time.
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> rng = np.random.default_rng()
>>> rvs = stats.uniform.rvs(size=50, random_state=rng)
>>> stats.ttest_1samp(rvs, popmean=0.5)
TtestResult(statistic=2.456308468440, pvalue=0.017628209047638, df=49)

```
Copy to clipboard
As expected, the p-value of 0.017 is not below our threshold of 0.01, so we cannot reject the null hypothesis.
When testing data from the standard _normal_ distribution, which has a mean of 0, we would expect the null hypothesis to be rejected.
```
>>> rvs = stats.norm.rvs(size=50, random_state=rng)
>>> stats.ttest_1samp(rvs, popmean=0.5)
TtestResult(statistic=-7.433605518875, pvalue=1.416760157221e-09, df=49)

```
Copy to clipboard
Indeed, the p-value is lower than our threshold of 0.01, so we reject the null hypothesis in favor of the default “two-sided” alternative: the mean of the population is _not_ equal to 0.5.
However, suppose we were to test the null hypothesis against the one-sided alternative that the mean of the population is _greater_ than 0.5. Since the mean of the standard normal is less than 0.5, we would not expect the null hypothesis to be rejected.
```
>>> stats.ttest_1samp(rvs, popmean=0.5, alternative='greater')
TtestResult(statistic=-7.433605518875, pvalue=0.99999999929, df=49)

```
Copy to clipboard
Unsurprisingly, with a p-value greater than our threshold, we would not reject the null hypothesis.
Note that when working with a confidence level of 99%, a true null hypothesis will be rejected approximately 1% of the time.
```
>>> rvs = stats.uniform.rvs(size=(100, 50), random_state=rng)
>>> res = stats.ttest_1samp(rvs, popmean=0.5, axis=1)
>>> np.sum(res.pvalue < 0.01)
1

```
Copy to clipboard
Indeed, even though all 100 samples above were drawn from the standard uniform distribution, which _does_ have a population mean of 0.5, we would mistakenly reject the null hypothesis for one of them.
[`ttest_1samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html#scipy.stats.ttest_1samp "scipy.stats.ttest_1samp") can also compute a confidence interval around the population mean.
```
>>> rvs = stats.norm.rvs(size=50, random_state=rng)
>>> res = stats.ttest_1samp(rvs, popmean=0)
>>> ci = res.confidence_interval(confidence_level=0.95)
>>> ci
ConfidenceInterval(low=-0.3193887540880017, high=0.2898583388980972)

```
Copy to clipboard
The bounds of the 95% confidence interval are the minimum and maximum values of the parameter _popmean_ for which the p-value of the test would be 0.05.
```
>>> res = stats.ttest_1samp(rvs, popmean=ci.low)
>>> np.testing.assert_allclose(res.pvalue, 0.05)
>>> res = stats.ttest_1samp(rvs, popmean=ci.high)
>>> np.testing.assert_allclose(res.pvalue, 0.05)

```
Copy to clipboard
Under certain assumptions about the population from which a sample is drawn, the confidence interval with confidence level 95% is expected to contain the true population mean in 95% of sample replications.
```
>>> rvs = stats.norm.rvs(size=(50, 1000), loc=1, random_state=rng)
>>> res = stats.ttest_1samp(rvs, popmean=0)
>>> ci = res.confidence_interval()
>>> contains_pop_mean = (ci.low < 1) & (ci.high > 1)
>>> contains_pop_mean.sum()
953

```
Copy to clipboard
Go BackOpen In Tab
[ previous binned_statistic_dd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binned_statistic_dd.html "previous page") [ next binomtest ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html "next page")
On this page 
  * [`ttest_1samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_1samp.html#scipy.stats.ttest_1samp)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
