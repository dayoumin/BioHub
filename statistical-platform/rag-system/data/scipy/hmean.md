---
title: scipy.stats.hmean
description: 조화평균 (Harmonic Mean)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.hmean

**Description**: 조화평균 (Harmonic Mean)

**Original Documentation**: [scipy.stats.hmean](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html)

---


  * hmean


scipy.stats.

# hmean[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html#hmean "Link to this heading") 

scipy.stats.hmean(_a_ , _axis =0_, _dtype =None_, _*_ , _weights =None_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L252-L350)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html#scipy.stats.hmean "Link to this definition") 
    
Calculate the weighted harmonic mean along the specified axis.
The weighted harmonic mean of the array \\(a_i\\) associated to weights \\(w_i\\) is:
\\[\frac{ \sum_{i=1}^n w_i }{ \sum_{i=1}^n \frac{w_i}{a_i} } \, ,\\]
and, with equal weights, it gives:
\\[\frac{ n }{ \sum_{i=1}^n \frac{1}{a_i} } \, .\\] 

Parameters: 
     

**a** array_like 
    
Input array, masked array or object that can be converted to an array. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**dtype** dtype, optional 
    
Type of the returned array and of the accumulator in which the elements are summed. If _dtype_ is not specified, it defaults to the dtype of _a_ , unless _a_ has an integer _dtype_ with a precision less than that of the default platform integer. In that case, the default platform integer is used. 

**weights** array_like, optional 
    
The weights array can either be 1-D (in which case its length must be the size of _a_ along the given _axis_) or of the same shape as _a_. Default is None, which gives each value a weight of 1.0.
Added in version 1.9. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**hmean** ndarray 
    
See _dtype_ parameter above.
See also 

[`numpy.mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "\(in NumPy v2.3\)")
    
Arithmetic average 

[`numpy.average`](https://numpy.org/doc/stable/reference/generated/numpy.average.html#numpy.average "\(in NumPy v2.3\)")
    
Weighted average 

[`gmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html#scipy.stats.gmean "scipy.stats.gmean")
    
Geometric mean
Notes
The sample harmonic mean is the reciprocal of the mean of the reciprocals of the observations.
The harmonic mean is computed over a single dimension of the input array, axis=0 by default, or all values in the array if axis=None. float64 intermediate and return values are used for integer inputs.
The harmonic mean is only defined if all observations are non-negative; otherwise, the result is NaN.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`hmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html#scipy.stats.hmean "scipy.stats.hmean") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[1]
“Weighted Harmonic Mean”, _Wikipedia_ , <https://en.wikipedia.org/wiki/Harmonic_mean#Weighted_harmonic_mean>
[2]
Ferger, F., “The nature and use of the harmonic mean”, Journal of the American Statistical Association, vol. 26, pp. 36-40, 1931
Examples
Try it in your browser!
```
>>> fromscipy.statsimport hmean
>>> hmean([1, 4])
1.6000000000000001
>>> hmean([1, 2, 3, 4, 5, 6, 7])
2.6997245179063363
>>> hmean([1, 4, 7], weights=[3, 1, 3])
1.9029126213592233

```
Copy to clipboard
Go BackOpen In Tab
[ previous gmean ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gmean.html "previous page") [ next pmean ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pmean.html "next page")
On this page 
  * [`hmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hmean.html#scipy.stats.hmean)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
