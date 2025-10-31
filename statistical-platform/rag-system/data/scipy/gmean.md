---
title: scipy.stats.gmean
description: 기하평균 (Geometric Mean)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.gmean

**Description**: 기하평균 (Geometric Mean)

**Original Documentation**: [scipy.stats.gmean](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html)

---


  * gmean


scipy.stats.

# gmean[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html#gmean "Link to this heading") 

scipy.stats.gmean(_a_ , _axis =0_, _dtype =None_, _weights =None_, _*_ , _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L168-L249)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html#scipy.stats.gmean "Link to this definition") 
    
Compute the weighted geometric mean along the specified axis.
The weighted geometric mean of the array \\(a_i\\) associated to weights \\(w_i\\) is:
\\[\exp \left( \frac{ \sum_{i=1}^n w_i \ln a_i }{ \sum_{i=1}^n w_i } \right) \, ,\\]
and, with equal weights, it gives:
\\[\sqrt[n]{ \prod_{i=1}^n a_i } \, .\\] 

Parameters: 
     

**a** array_like 
    
Input array or object that can be converted to an array. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**dtype** dtype, optional 
    
Type to which the input arrays are cast before the calculation is performed. 

**weights** array_like, optional 
    
The _weights_ array must be broadcastable to the same shape as _a_. Default is None, which gives each value a weight of 1.0. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**gmean** ndarray 
    
See _dtype_ parameter above.
See also 

[`numpy.mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "\(in NumPy v2.3\)")
    
Arithmetic average 

[`numpy.average`](https://numpy.org/doc/stable/reference/generated/numpy.average.html#numpy.average "\(in NumPy v2.3\)")
    
Weighted average 

[`hmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html#scipy.stats.hmean "scipy.stats.hmean")
    
Harmonic mean
Notes
The sample geometric mean is the exponential of the mean of the natural logarithms of the observations. Negative observations will produce NaNs in the output because the _natural_ logarithm (as opposed to the _complex_ logarithm) is defined only for non-negative reals.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`gmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html#scipy.stats.gmean "scipy.stats.gmean") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ✅ | ✅  
Dask | ✅ | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[1]
“Weighted Geometric Mean”, _Wikipedia_ , <https://en.wikipedia.org/wiki/Weighted_geometric_mean>.
[2]
Grossman, J., Grossman, M., Katz, R., “Averages: A New Approach”, Archimedes Foundation, 1983
Examples
Try it in your browser!
```
>>> fromscipy.statsimport gmean
>>> gmean([1, 4])
2.0
>>> gmean([1, 2, 3, 4, 5, 6, 7])
3.3800151591412964
>>> gmean([1, 4, 7], weights=[3, 1, 3])
2.80668351922014

```
Copy to clipboard
Go BackOpen In Tab
[ previous describe ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.describe.html "previous page") [ next hmean ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html "next page")
On this page 
  * [`gmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html#scipy.stats.gmean)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
