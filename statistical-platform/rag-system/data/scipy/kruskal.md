---
title: scipy.stats.kruskal
description: Kruskal-Wallis 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.kruskal

**Description**: Kruskal-Wallis 검정

**Original Documentation**: [scipy.stats.kruskal](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html)

---


  * kruskal


scipy.stats.

# kruskal[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html#kruskal "Link to this heading") 

scipy.stats.kruskal(_* samples_, _nan_policy ='propagate'_, _axis =0_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L8597-L8691)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html#scipy.stats.kruskal "Link to this definition") 
    
Compute the Kruskal-Wallis H-test for independent samples.
The Kruskal-Wallis H-test tests the null hypothesis that the population median of all of the groups are equal. It is a non-parametric version of ANOVA. The test works on 2 or more independent samples, which may have different sizes. Note that rejecting the null hypothesis does not indicate which of the groups differs. Post hoc comparisons between groups are required to determine which groups are different. 

Parameters: 
     

**sample1, sample2, …** array_like 
    
Two or more arrays with the sample measurements can be given as arguments. Samples must be one-dimensional. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**statistic** float 
    
The Kruskal-Wallis H statistic, corrected for ties. 

**pvalue** float 
    
The p-value for the test using the assumption that H has a chi square distribution. The p-value returned is the survival function of the chi square distribution evaluated at H.
See also 

[`f_oneway`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#scipy.stats.f_oneway "scipy.stats.f_oneway")
    
1-way ANOVA. 

[`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu")
    
Mann-Whitney rank test on two samples. 

[`friedmanchisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html#scipy.stats.friedmanchisquare "scipy.stats.friedmanchisquare")
    
Friedman test for repeated measurements.
Notes
Due to the assumption that H has a chi square distribution, the number of samples in each group must not be too small. A typical rule is that each sample must have at least 5 measurements.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
W. H. Kruskal & W. W. Wallis, “Use of Ranks in One-Criterion Variance Analysis”, Journal of the American Statistical Association, Vol. 47, Issue 260, pp. 583-621, 1952.
[2]
<https://en.wikipedia.org/wiki/Kruskal-Wallis_one-way_analysis_of_variance>
Examples
Try it in your browser!
```
>>> fromscipyimport stats
>>> x = [1, 3, 5, 7, 9]
>>> y = [2, 4, 6, 8, 10]
>>> stats.kruskal(x, y)
KruskalResult(statistic=0.2727272727272734, pvalue=0.6015081344405895)

```
Copy to clipboard
```
>>> x = [1, 1, 1]
>>> y = [2, 2, 2]
>>> z = [2, 2]
>>> stats.kruskal(x, y, z)
KruskalResult(statistic=7.0, pvalue=0.0301973834223185)

```
Copy to clipboard
Go BackOpen In Tab
[ previous dunnett ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.dunnett.html "previous page") [ next alexandergovern ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.alexandergovern.html "next page")
On this page 
  * [`kruskal`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html#scipy.stats.kruskal)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
