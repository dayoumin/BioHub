---
title: scipy.stats.friedmanchisquare
description: Friedman 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.friedmanchisquare

**Description**: Friedman 검정

**Original Documentation**: [scipy.stats.friedmanchisquare](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html)

---


  * friedmanchisquare


scipy.stats.

# friedmanchisquare[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html#friedmanchisquare "Link to this heading") 

scipy.stats.friedmanchisquare(_* samples_, _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L8698-L8784)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html#scipy.stats.friedmanchisquare "Link to this definition") 
    
Compute the Friedman test for repeated samples.
The Friedman test tests the null hypothesis that repeated samples of the same individuals have the same distribution. It is often used to test for consistency among samples obtained in different ways. For example, if two sampling techniques are used on the same set of individuals, the Friedman test can be used to determine if the two sampling techniques are consistent. 

Parameters: 
     

**sample1, sample2, sample3…** array_like 
    
Arrays of observations. All of the arrays must have the same number of elements. At least three samples must be given. 

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
    
The test statistic, correcting for ties. 

**pvalue** float 
    
The associated p-value assuming that the test statistic has a chi squared distribution.
See also 

[Friedman test for repeated samples](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_friedmanchisquare.html#hypothesis-friedmanchisquare)
    
Extended example
Notes
Due to the assumption that the test statistic has a chi squared distribution, the p-value is only reliable for n > 10 and more than 6 repeated samples.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
<https://en.wikipedia.org/wiki/Friedman_test>
[2]
Demsar, J. (2006). Statistical comparisons of classifiers over multiple data sets. Journal of Machine Learning Research, 7, 1-30.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> rng = np.random.default_rng(seed=18)
>>> x = rng.random((6, 10))
>>> fromscipy.statsimport friedmanchisquare
>>> res = friedmanchisquare(x[0], x[1], x[2], x[3], x[4], x[5])
>>> res.statistic, res.pvalue
(11.428571428571416, 0.043514520866727614)

```
Copy to clipboard
The p-value is less than 0.05; however, as noted above, the results may not be reliable since we have a small number of repeated samples.
For a more detailed example, see [Friedman test for repeated samples](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_friedmanchisquare.html#hypothesis-friedmanchisquare).
Go BackOpen In Tab
[ previous median_test ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.median_test.html "previous page") [ next anderson_ksamp ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.anderson_ksamp.html "next page")
On this page 
  * [`friedmanchisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.friedmanchisquare.html#scipy.stats.friedmanchisquare)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
