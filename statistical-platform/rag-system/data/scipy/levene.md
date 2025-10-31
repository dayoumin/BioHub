---
title: scipy.stats.levene
description: Levene 등분산 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.levene

**Description**: Levene 등분산 검정

**Original Documentation**: [scipy.stats.levene](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html)

---


  * levene


scipy.stats.

# levene[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#levene "Link to this heading") 

scipy.stats.levene(_* samples_, _center ='median'_, _proportiontocut =0.05_, _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_morestats.py#L2966-L3106)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#scipy.stats.levene "Link to this definition") 
    
Perform Levene test for equal variances.
The Levene test tests the null hypothesis that all input samples are from populations with equal variances. Levene’s test is an alternative to Bartlett’s test [`bartlett`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bartlett.html#scipy.stats.bartlett "scipy.stats.bartlett") in the case where there are significant deviations from normality. 

Parameters: 
     

**sample1, sample2, …** array_like 
    
The sample data, possibly with different lengths. Only one-dimensional samples are accepted. 

**center**{‘mean’, ‘median’, ‘trimmed’}, optional 
    
Which function of the data to use in the test. The default is ‘median’. 

**proportiontocut** float, optional 
    
When _center_ is ‘trimmed’, this gives the proportion of data points to cut from each end. (See [`scipy.stats.trim_mean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean "scipy.stats.trim_mean").) Default is 0.05. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**statistic** float 
    
The test statistic. 

**pvalue** float 
    
The p-value for the test.
See also 

[`fligner`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fligner.html#scipy.stats.fligner "scipy.stats.fligner")
    
A non-parametric test for the equality of k variances 

[`bartlett`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bartlett.html#scipy.stats.bartlett "scipy.stats.bartlett")
    
A parametric test for equality of k variances in normal samples 

[Levene test for equal variances](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_levene.html#hypothesis-levene)
    
Extended example
Notes
Three variations of Levene’s test are possible. The possibilities and their recommended usages are:
  * ‘median’ : Recommended for skewed (non-normal) distributions>
  * ‘mean’ : Recommended for symmetric, moderate-tailed distributions.
  * ‘trimmed’ : Recommended for heavy-tailed distributions.


The test version using the mean was proposed in the original article of Levene ([[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#r7cdc7a5c4c19-2)) while the median and trimmed mean have been studied by Brown and Forsythe ([[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#r7cdc7a5c4c19-3)), sometimes also referred to as Brown-Forsythe test.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
<https://www.itl.nist.gov/div898/handbook/eda/section3/eda35a.htm>
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#id1)]
Levene, H. (1960). In Contributions to Probability and Statistics: Essays in Honor of Harold Hotelling, I. Olkin et al. eds., Stanford University Press, pp. 278-292.
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#id2)]
Brown, M. B. and Forsythe, A. B. (1974), Journal of the American Statistical Association, 69, 364-367
Examples
Try it in your browser!
Test whether the lists _a_ , _b_ and _c_ come from populations with equal variances.
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> a = [8.88, 9.12, 9.04, 8.98, 9.00, 9.08, 9.01, 8.85, 9.06, 8.99]
>>> b = [8.88, 8.95, 9.29, 9.44, 9.15, 9.58, 8.36, 9.18, 8.67, 9.05]
>>> c = [8.95, 9.12, 8.95, 8.85, 9.03, 8.84, 9.07, 8.98, 8.86, 8.98]
>>> stat, p = stats.levene(a, b, c)
>>> p
0.002431505967249681

```
Copy to clipboard
The small p-value suggests that the populations do not have equal variances.
This is not surprising, given that the sample variance of _b_ is much larger than that of _a_ and _c_ :
```
>>> [np.var(x, ddof=1) for x in [a, b, c]]
[0.007054444444444413, 0.13073888888888888, 0.008890000000000002]

```
Copy to clipboard
For a more detailed example, see [Levene test for equal variances](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_levene.html#hypothesis-levene).
Go BackOpen In Tab
[ previous fligner ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fligner.html "previous page") [ next bartlett ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bartlett.html "next page")
On this page 
  * [`levene`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.levene.html#scipy.stats.levene)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
