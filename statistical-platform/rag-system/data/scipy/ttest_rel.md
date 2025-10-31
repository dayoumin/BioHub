---
title: scipy.stats.ttest_rel
description: 대응표본 t-검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.ttest_rel

**Description**: 대응표본 t-검정

**Original Documentation**: [scipy.stats.ttest_rel](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html)

---


Choose version 


Choose version 


  * ttest_rel


scipy.stats.

# ttest_rel[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html#ttest-rel "Link to this heading") 

scipy.stats.ttest_rel(_a_ , _b_ , _axis =0_, _nan_policy ='propagate'_, _alternative ='two-sided'_, _*_ , _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L7059-L7164)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html#scipy.stats.ttest_rel "Link to this definition") 
    
Calculate the t-test on TWO RELATED samples of scores, a and b.
This is a test for the null hypothesis that two related or repeated samples have identical average (expected) values. 

Parameters: 
     

**a, b** array_like 
    
The arrays must have the same shape. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. The following options are available (default is ‘two-sided’):
  * ‘two-sided’: the means of the distributions underlying the samples are unequal.
  * ‘less’: the mean of the distribution underlying the first sample is less than the mean of the distribution underlying the second sample.
  * ‘greater’: the mean of the distribution underlying the first sample is greater than the mean of the distribution underlying the second sample.


Added in version 1.6.0. 

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
    
Computes a confidence interval around the difference in population means for the given confidence level. The confidence interval is returned in a `namedtuple` with fields _low_ and _high_.
Added in version 1.10.0.
Notes
Examples for use are scores of the same set of student in different exams, or repeated sampling from the same units. The test measures whether the average score differs significantly across samples (e.g. exams). If we observe a large p-value, for example greater than 0.05 or 0.1 then we cannot reject the null hypothesis of identical average scores. If the p-value is smaller than the threshold, e.g. 1%, 5% or 10%, then we reject the null hypothesis of equal averages. Small p-values are associated with large t-statistics.
The t-statistic is calculated as `np.mean(a - b)/se`, where `se` is the standard error. Therefore, the t-statistic will be positive when the sample mean of `a - b` is greater than zero and negative when the sample mean of `a - b` is less than zero.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`ttest_rel`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html#scipy.stats.ttest_rel "scipy.stats.ttest_rel") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ⛔  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
<https://en.wikipedia.org/wiki/T-test#Dependent_t-test_for_paired_samples>
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> rng = np.random.default_rng()

```
Copy to clipboard
```
>>> rvs1 = stats.norm.rvs(loc=5, scale=10, size=500, random_state=rng)
>>> rvs2 = (stats.norm.rvs(loc=5, scale=10, size=500, random_state=rng)
...         + stats.norm.rvs(scale=0.2, size=500, random_state=rng))
>>> stats.ttest_rel(rvs1, rvs2)
TtestResult(statistic=-0.4549717054410304, pvalue=0.6493274702088672, df=499)
>>> rvs3 = (stats.norm.rvs(loc=8, scale=10, size=500, random_state=rng)
...         + stats.norm.rvs(scale=0.2, size=500, random_state=rng))
>>> stats.ttest_rel(rvs1, rvs3)
TtestResult(statistic=-5.879467544540889, pvalue=7.540777129099917e-09, df=499)

```
Copy to clipboard
Go BackOpen In Tab
[ previous power_divergence ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.power_divergence.html "previous page") [ next wilcoxon ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html "next page")
On this page 
  * [`ttest_rel`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html#scipy.stats.ttest_rel)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
