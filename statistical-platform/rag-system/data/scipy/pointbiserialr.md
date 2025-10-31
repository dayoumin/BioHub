---
title: scipy.stats.pointbiserialr
description: Point-biserial 상관
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.pointbiserialr

**Description**: Point-biserial 상관

**Original Documentation**: [scipy.stats.pointbiserialr](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


Search `Ctrl`+`K`
Section Navigation
  * [scipy](https://docs.scipy.org/doc/scipy/reference/main_namespace.html)
  * [scipy.cluster](https://docs.scipy.org/doc/scipy/reference/cluster.html)
  * [scipy.constants](https://docs.scipy.org/doc/scipy/reference/constants.html)
  * [scipy.datasets](https://docs.scipy.org/doc/scipy/reference/datasets.html)
  * [scipy.differentiate](https://docs.scipy.org/doc/scipy/reference/differentiate.html)
  * [scipy.fft](https://docs.scipy.org/doc/scipy/reference/fft.html)
  * [scipy.fftpack](https://docs.scipy.org/doc/scipy/reference/fftpack.html)
  * [scipy.integrate](https://docs.scipy.org/doc/scipy/reference/integrate.html)
  * [scipy.interpolate](https://docs.scipy.org/doc/scipy/reference/interpolate.html)
  * [scipy.io](https://docs.scipy.org/doc/scipy/reference/io.html)
  * [scipy.linalg](https://docs.scipy.org/doc/scipy/reference/linalg.html)
  * [scipy.ndimage](https://docs.scipy.org/doc/scipy/reference/ndimage.html)
  * [scipy.odr](https://docs.scipy.org/doc/scipy/reference/odr.html)
  * [scipy.optimize](https://docs.scipy.org/doc/scipy/reference/optimize.html)
  * [scipy.signal](https://docs.scipy.org/doc/scipy/reference/signal.html)
  * [scipy.sparse](https://docs.scipy.org/doc/scipy/reference/sparse.html)
  * [scipy.spatial](https://docs.scipy.org/doc/scipy/reference/spatial.html)
  * [scipy.special](https://docs.scipy.org/doc/scipy/reference/special.html)
  * [scipy.stats](https://docs.scipy.org/doc/scipy/reference/stats.html)


  * [ ](https://docs.scipy.org/doc/scipy/index.html)
  * [SciPy API](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [Statistical functions (`scipy.stats`)](https://docs.scipy.org/doc/scipy/reference/stats.html)
  * pointbiserialr


scipy.stats.
# pointbiserialr[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html#pointbiserialr "Link to this heading") 

scipy.stats.pointbiserialr(_x_ , _y_ , _*_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L5443-L5538)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html#scipy.stats.pointbiserialr "Link to this definition") 
    
Calculate a point biserial correlation coefficient and its p-value.
The point biserial correlation is used to measure the relationship between a binary variable, x, and a continuous variable, y. Like other correlation coefficients, this one varies between -1 and +1 with 0 implying no correlation. Correlations of -1 or +1 imply a determinative relationship.
This function may be computed using a shortcut formula but produces the same result as [`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "scipy.stats.pearsonr"). 

Parameters: 
     

**x** array_like of bools 
    
Input array. 

**y** array_like 
    
Input array. 

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
     

res: SignificanceResult
    
An object containing attributes: 

statisticfloat 
    
The R value. 

pvaluefloat 
    
The two-sided p-value.
Notes
[`pointbiserialr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html#scipy.stats.pointbiserialr "scipy.stats.pointbiserialr") uses a t-test with `n-1` degrees of freedom. It is equivalent to [`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "scipy.stats.pearsonr").
The value of the point-biserial correlation can be calculated from:
\\[r_{pb} = \frac{\overline{Y_1} - \overline{Y_0}} {s_y} \sqrt{\frac{N_0 N_1} {N (N - 1)}}\\]
Where \\(\overline{Y_{0}}\\) and \\(\overline{Y_{1}}\\) are means of the metric observations coded 0 and 1 respectively; \\(N_{0}\\) and \\(N_{1}\\) are number of observations coded 0 and 1 respectively; \\(N\\) is the total number of observations and \\(s_{y}\\) is the standard deviation of all the metric observations.
A value of \\(r_{pb}\\) that is significantly different from zero is completely equivalent to a significant difference in means between the two groups. Thus, an independent groups t Test with \\(N-2\\) degrees of freedom may be used to test whether \\(r_{pb}\\) is nonzero. The relation between the t-statistic for comparing two independent groups and \\(r_{pb}\\) is given by:
\\[t = \sqrt{N - 2}\frac{r_{pb}}{\sqrt{1 - r^{2}_{pb}}}\\]
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
J. Lev, “The Point Biserial Coefficient of Correlation”, Ann. Math. Statist., Vol. 20, no.1, pp. 125-126, 1949.
[2]
R.F. Tate, “Correlation Between a Discrete and a Continuous Variable. Point-Biserial Correlation.”, Ann. Math. Statist., Vol. 25, np. 3, pp. 603-607, 1954.
[3]
D. Kornbrot “Point Biserial Correlation”, In Wiley StatsRef: Statistics Reference Online (eds N. Balakrishnan, et al.), 2014. [DOI:10.1002/9781118445112.stat06227](https://doi.org/10.1002/9781118445112.stat06227)
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> a = np.array([0, 0, 0, 1, 1, 1, 1])
>>> b = np.arange(7)
>>> stats.pointbiserialr(a, b)
(0.8660254037844386, 0.011724811003954652)
>>> stats.pearsonr(a, b)
(0.86602540378443871, 0.011724811003954626)
>>> np.corrcoef(a, b)
array([[ 1.       ,  0.8660254],
       [ 0.8660254,  1.       ]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous spearmanr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html "previous page") [ next kendalltau ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html "next page")
On this page 
  * [`pointbiserialr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pointbiserialr.html#scipy.stats.pointbiserialr)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
