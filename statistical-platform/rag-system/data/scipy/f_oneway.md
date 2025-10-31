---
title: scipy.f_oneway
description: 일원 ANOVA
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.f_oneway

**Description**: 일원 ANOVA

**Original Documentation**: [scipy.f_oneway](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html)

---


  * f_oneway


scipy.stats.

# f_oneway[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#f-oneway "Link to this heading") 

scipy.stats.f_oneway(_* samples_, _axis =0_, _equal_var =True_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L3774-L4060)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#scipy.stats.f_oneway "Link to this definition") 
    
Perform one-way ANOVA.
The one-way ANOVA tests the null hypothesis that two or more groups have the same population mean. The test is applied to samples from two or more groups, possibly with differing sizes. 

Parameters: 
     

**sample1, sample2, …** array_like 
    
The sample measurements for each group. There must be at least two arguments. If the arrays are multidimensional, then all the dimensions of the array must be the same except for _axis_. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**equal_var: bool, optional**
    
If True (default), perform a standard one-way ANOVA test that assumes equal population variances [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#r74f03ee7d776-2). If False, perform Welch’s ANOVA test, which does not assume equal population variances [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#r74f03ee7d776-4).
Added in version 1.15.0. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**statistic** float 
    
The computed F statistic of the test. 

**pvalue** float 
    
The associated p-value from the F distribution. 

Warns: 
     

[`ConstantInputWarning`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ConstantInputWarning.html#scipy.stats.ConstantInputWarning "scipy.stats.ConstantInputWarning")
    
Emitted if all values within each of the input arrays are identical. In this case the F statistic is either infinite or isn’t defined, so `np.inf` or `np.nan` is returned. 

RuntimeWarning
    
Emitted if the length of any input array is 0, or if all the input arrays have length 1. `np.nan` is returned for the F statistic and the p-value in these cases.
Notes
The ANOVA test has important assumptions that must be satisfied in order for the associated p-value to be valid.
  1. The samples are independent.
  2. Each sample is from a normally distributed population.
  3. The population standard deviations of the groups are all equal. This property is known as homoscedasticity.


If these assumptions are not true for a given set of data, it may still be possible to use the Kruskal-Wallis H-test ([`scipy.stats.kruskal`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html#scipy.stats.kruskal "scipy.stats.kruskal")) or the Alexander-Govern test ([`scipy.stats.alexandergovern`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.alexandergovern.html#scipy.stats.alexandergovern "scipy.stats.alexandergovern")) although with some loss of power.
The length of each group must be at least one, and there must be at least one group with length greater than one. If these conditions are not satisfied, a warning is generated and (`np.nan`, `np.nan`) is returned.
If all values in each group are identical, and there exist at least two groups with different values, the function generates a warning and returns (`np.inf`, 0).
If all values in all groups are the same, function generates a warning and returns (`np.nan`, `np.nan`).
The algorithm is from Heiman [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#r74f03ee7d776-2), pp.394-7.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
R. Lowry, “Concepts and Applications of Inferential Statistics”, Chapter 14, 2014, <http://vassarstats.net/textbook/>
[2] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#id3))
G.W. Heiman, “Understanding research methods and statistics: An integrated introduction for psychology”, Houghton, Mifflin and Company, 2001.
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#id8)]
G.H. McDonald, “Handbook of Biological Statistics”, One-way ANOVA. <http://www.biostathandbook.com/onewayanova.html>
[[4](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#id2)]
B. L. Welch, “On the Comparison of Several Mean Values: An Alternative Approach”, Biometrika, vol. 38, no. 3/4, pp. 330-336, 1951, doi: 10.2307/2332579.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport f_oneway

```
Copy to clipboard
Here are some data [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#r74f03ee7d776-3) on a shell measurement (the length of the anterior adductor muscle scar, standardized by dividing by length) in the mussel Mytilus trossulus from five locations: Tillamook, Oregon; Newport, Oregon; Petersburg, Alaska; Magadan, Russia; and Tvarminne, Finland, taken from a much larger data set used in McDonald et al. (1991).
```
>>> tillamook = [0.0571, 0.0813, 0.0831, 0.0976, 0.0817, 0.0859, 0.0735,
...              0.0659, 0.0923, 0.0836]
>>> newport = [0.0873, 0.0662, 0.0672, 0.0819, 0.0749, 0.0649, 0.0835,
...            0.0725]
>>> petersburg = [0.0974, 0.1352, 0.0817, 0.1016, 0.0968, 0.1064, 0.105]
>>> magadan = [0.1033, 0.0915, 0.0781, 0.0685, 0.0677, 0.0697, 0.0764,
...            0.0689]
>>> tvarminne = [0.0703, 0.1026, 0.0956, 0.0973, 0.1039, 0.1045]
>>> f_oneway(tillamook, newport, petersburg, magadan, tvarminne)
F_onewayResult(statistic=7.121019471642447, pvalue=0.0002812242314534544)

```
Copy to clipboard
[`f_oneway`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#scipy.stats.f_oneway "scipy.stats.f_oneway") accepts multidimensional input arrays. When the inputs are multidimensional and _axis_ is not given, the test is performed along the first axis of the input arrays. For the following data, the test is performed three times, once for each column.
```
>>> a = np.array([[9.87, 9.03, 6.81],
...               [7.18, 8.35, 7.00],
...               [8.39, 7.58, 7.68],
...               [7.45, 6.33, 9.35],
...               [6.41, 7.10, 9.33],
...               [8.00, 8.24, 8.44]])
>>> b = np.array([[6.35, 7.30, 7.16],
...               [6.65, 6.68, 7.63],
...               [5.72, 7.73, 6.72],
...               [7.01, 9.19, 7.41],
...               [7.75, 7.87, 8.30],
...               [6.90, 7.97, 6.97]])
>>> c = np.array([[3.31, 8.77, 1.01],
...               [8.25, 3.24, 3.62],
...               [6.32, 8.81, 5.19],
...               [7.48, 8.83, 8.91],
...               [8.59, 6.01, 6.07],
...               [3.07, 9.72, 7.48]])
>>> F = f_oneway(a, b, c)
>>> F.statistic
array([1.75676344, 0.03701228, 3.76439349])
>>> F.pvalue
array([0.20630784, 0.96375203, 0.04733157])

```
Copy to clipboard
Welch ANOVA will be performed if _equal_var_ is False.
Go BackOpen In Tab
[ previous kstest ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html "previous page") [ next tukey_hsd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tukey_hsd.html "next page")
On this page 
  * [`f_oneway`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html#scipy.stats.f_oneway)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
