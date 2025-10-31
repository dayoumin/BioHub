---
title: scipy.stats.kendalltau
description: Kendall's tau
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.kendalltau

**Description**: Kendall's tau

**Original Documentation**: [scipy.stats.kendalltau](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html)

---


  * kendalltau


scipy.stats.

# kendalltau[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#kendalltau "Link to this heading") 

scipy.stats.kendalltau(_x_ , _y_ , _*_ , _nan_policy ='propagate'_, _method ='auto'_, _variant ='b'_, _alternative ='two-sided'_, _axis =None_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L5541-L5747)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#scipy.stats.kendalltau "Link to this definition") 
    
Calculate Kendall’s tau, a correlation measure for ordinal data.
Kendall’s tau is a measure of the correspondence between two rankings. Values close to 1 indicate strong agreement, and values close to -1 indicate strong disagreement. This implements two variants of Kendall’s tau: tau-b (the default) and tau-c (also known as Stuart’s tau-c). These differ only in how they are normalized to lie within the range -1 to 1; the hypothesis tests (their p-values) are identical. Kendall’s original tau-a is not implemented separately because both tau-b and tau-c reduce to tau-a in the absence of ties. 

Parameters: 
     

**x, y** array_like 
    
Arrays of rankings, of the same shape. If arrays are not 1-D, they will be flattened to 1-D. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**method**{‘auto’, ‘asymptotic’, ‘exact’}, optional 
    
Defines which method is used to calculate the p-value [[5]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#r4cd1899fa369-5). The following options are available (default is ‘auto’):
  * ‘auto’: selects the appropriate method based on a trade-off between speed and accuracy
  * ‘asymptotic’: uses a normal approximation valid for large samples
  * ‘exact’: computes the exact p-value, but can only be used if no ties are present. As the sample size increases, the ‘exact’ computation time may grow and the result may lose some precision.


**variant**{‘b’, ‘c’}, optional 
    
Defines which variant of Kendall’s tau is returned. Default is ‘b’. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. Default is ‘two-sided’. The following options are available:
  * ‘two-sided’: the rank correlation is nonzero
  * ‘less’: the rank correlation is negative (less than zero)
  * ‘greater’: the rank correlation is positive (greater than zero)


**axis** int or None, default: None 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**res** SignificanceResult 
    
An object containing attributes: 

statisticfloat 
    
The tau statistic. 

pvaluefloat 
    
The p-value for a hypothesis test whose null hypothesis is an absence of association, tau = 0. 

Raises: 
     

ValueError
    
If _nan_policy_ is ‘omit’ and _variant_ is not ‘b’ or if _method_ is ‘exact’ and there are ties between _x_ and _y_.
See also 

[`spearmanr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html#scipy.stats.spearmanr "scipy.stats.spearmanr")
    
Calculates a Spearman rank-order correlation coefficient. 

[`theilslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes "scipy.stats.theilslopes")
    
Computes the Theil-Sen estimator for a set of points (x, y). 

[`weightedtau`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.weightedtau.html#scipy.stats.weightedtau "scipy.stats.weightedtau")
    
Computes a weighted version of Kendall’s tau. 

[Kendall’s tau test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_kendalltau.html#hypothesis-kendalltau)
    
Extended example
Notes
The definition of Kendall’s tau that is used is [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#r4cd1899fa369-2):
```
tau_b = (P - Q) / sqrt((P + Q + T) * (P + Q + U))

tau_c = 2 (P - Q) / (n**2 * (m - 1) / m)

```
Copy to clipboard
where P is the number of concordant pairs, Q the number of discordant pairs, T the number of tied pairs only in _x_ , and U the number of tied pairs only in _y_. If a tie occurs for the same pair in both _x_ and _y_ , it is not added to either T or U. n is the total number of samples, and m is the number of unique values in either _x_ or _y_ , whichever is smaller.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
Maurice G. Kendall, “A New Measure of Rank Correlation”, Biometrika Vol. 30, No. 1/2, pp. 81-93, 1938.
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#id2)]
Maurice G. Kendall, “The treatment of ties in ranking problems”, Biometrika Vol. 33, No. 3, pp. 239-251. 1945.
[3]
Gottfried E. Noether, “Elements of Nonparametric Statistics”, John Wiley & Sons, 1967.
[4]
Peter M. Fenwick, “A new data structure for cumulative frequency tables”, Software: Practice and Experience, Vol. 24, No. 3, pp. 327-336, 1994.
[[5](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#id1)]
Maurice G. Kendall, “Rank Correlation Methods” (4th Edition), Charles Griffin & Co., 1970.
Examples
Try it in your browser!
```
>>> fromscipyimport stats
>>> x1 = [12, 2, 1, 12, 2]
>>> x2 = [1, 4, 7, 1, 0]
>>> res = stats.kendalltau(x1, x2)
>>> res.statistic
-0.47140452079103173
>>> res.pvalue
0.2827454599327748

```
Copy to clipboard
For a more detailed example, see [Kendall’s tau test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_kendalltau.html#hypothesis-kendalltau).
Go BackOpen In Tab
[ previous pointbiserialr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html "previous page") [ next chatterjeexi ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chatterjeexi.html "next page")
On this page 
  * [`kendalltau`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#scipy.stats.kendalltau)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
