---
title: scipy.stats.iqr
description: 사분위수 범위 (IQR)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.iqr

**Description**: 사분위수 범위 (IQR)

**Original Documentation**: [scipy.stats.iqr](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html)

---


  * iqr


scipy.stats.

# iqr[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html#iqr "Link to this heading") 

scipy.stats.iqr(_x_ , _axis =None_, _rng =(25, 75)_, _scale =1.0_, _nan_policy ='propagate'_, _interpolation ='linear'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L3072-L3220)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html#scipy.stats.iqr "Link to this definition") 
    
Compute the interquartile range of the data along the specified axis.
The interquartile range (IQR) is the difference between the 75th and 25th percentile of the data. It is a measure of the dispersion similar to standard deviation or variance, but is much more robust against outliers [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html#ra6d016607141-2).
The `rng` parameter allows this function to compute other percentile ranges than the actual IQR. For example, setting `rng=(0, 100)` is equivalent to [`numpy.ptp`](https://numpy.org/doc/stable/reference/generated/numpy.ptp.html#numpy.ptp "\(in NumPy v2.3\)").
The IQR of an empty array is _np.nan_.
Added in version 0.18.0. 

Parameters: 
     

**x** array_like 
    
Input array or object that can be converted to an array. 

**axis** int or None, default: None 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**rng** Two-element sequence containing floats in range of [0,100] optional 
    
Percentiles over which to compute the range. Each must be between 0 and 100, inclusive. The default is the true IQR: `(25, 75)`. The order of the elements is not important. 

**scale** scalar or str or array_like of reals, optional 
    
The numerical value of scale will be divided out of the final result. The following string value is also recognized:
>   * ‘normal’ : Scale by \\(2 \sqrt{2} erf^{-1}(\frac{1}{2}) \approx 1.349\\).
> 

The default is 1.0. Array-like _scale_ of real dtype is also allowed, as long as it broadcasts correctly to the output such that `out / scale` is a valid operation. The output dimensions depend on the input array, _x_ , the _axis_ argument, and the _keepdims_ flag. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**interpolation** str, optional 
    
Specifies the interpolation method to use when the percentile boundaries lie between two data points `i` and `j`. The following options are available (default is ‘linear’):
>   * ‘linear’: `i + (j - i)*fraction`, where `fraction` is the fractional part of the index surrounded by `i` and `j`.
>   * ‘lower’: `i`.
>   * ‘higher’: `j`.
>   * ‘nearest’: `i` or `j` whichever is nearest.
>   * ‘midpoint’: `(i + j)/2`.
> 

For NumPy >= 1.22.0, the additional options provided by the `method` keyword of [`numpy.percentile`](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy.percentile "\(in NumPy v2.3\)") are also valid. 

**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**iqr** scalar or ndarray 
    
If `axis=None`, a scalar is returned. If the input contains integers or floats of smaller precision than `np.float64`, then the output data-type is `np.float64`. Otherwise, the output data-type is the same as that of the input.
See also 

[`numpy.std`](https://numpy.org/doc/stable/reference/generated/numpy.std.html#numpy.std "\(in NumPy v2.3\)"), [`numpy.var`](https://numpy.org/doc/stable/reference/generated/numpy.var.html#numpy.var "\(in NumPy v2.3\)") 

Notes
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
“Interquartile range” <https://en.wikipedia.org/wiki/Interquartile_range>
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html#id1)]
“Robust measures of scale” <https://en.wikipedia.org/wiki/Robust_measures_of_scale>
[3]
“Quantile” <https://en.wikipedia.org/wiki/Quantile>
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport iqr
>>> x = np.array([[10, 7, 4], [3, 2, 1]])
>>> x
array([[10,  7,  4],
       [ 3,  2,  1]])
>>> iqr(x)
4.0
>>> iqr(x, axis=0)
array([ 3.5,  2.5,  1.5])
>>> iqr(x, axis=1)
array([ 3.,  1.])
>>> iqr(x, axis=1, keepdims=True)
array([[ 3.],
       [ 1.]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous gstd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gstd.html "previous page") [ next sem ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html "next page")
On this page 
  * [`iqr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html#scipy.stats.iqr)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
