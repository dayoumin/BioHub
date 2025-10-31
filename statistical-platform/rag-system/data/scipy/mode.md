---
title: scipy.stats.mode
description: 최빈값 (Mode)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.mode

**Description**: 최빈값 (Mode)

**Original Documentation**: [scipy.stats.mode](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html)

---


  * mode


scipy.stats.

# mode[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#mode "Link to this heading") 

scipy.stats.mode(_a_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L497-L594)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#scipy.stats.mode "Link to this definition") 
    
Return an array of the modal (most common) value in the passed array.
If there is more than one such value, only one is returned. The bin-count for the modal bins is also returned. 

Parameters: 
     

**a** array_like 
    
Numeric, n-dimensional array of which to find mode(s). 

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
     

**mode** ndarray 
    
Array of modal values. 

**count** ndarray 
    
Array of counts for each mode.
Notes
The mode is calculated using [`numpy.unique`](https://numpy.org/doc/stable/reference/generated/numpy.unique.html#numpy.unique "\(in NumPy v2.3\)"). In NumPy versions 1.21 and after, all NaNs - even those with different binary representations - are treated as equivalent and counted as separate instances of the same value.
By convention, the mode of an empty array is NaN, and the associated count is zero.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[3, 0, 3, 7],
...               [3, 2, 6, 2],
...               [1, 7, 2, 8],
...               [3, 0, 6, 1],
...               [3, 2, 5, 5]])
>>> fromscipyimport stats
>>> stats.mode(a, keepdims=True)
ModeResult(mode=array([[3, 0, 6, 1]]), count=array([[4, 2, 2, 1]]))

```
Copy to clipboard
To get mode of whole array, specify `axis=None`:
```
>>> stats.mode(a, axis=None, keepdims=True)
ModeResult(mode=[[3]], count=[[5]])
>>> stats.mode(a, axis=None, keepdims=False)
ModeResult(mode=3, count=5)

```
Copy to clipboard
Go BackOpen In Tab
[ previous kurtosis ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html "previous page") [ next moment ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.moment.html "next page")
On this page 
  * [`mode`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#scipy.stats.mode)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
