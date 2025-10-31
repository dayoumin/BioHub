---
title: scipy.stats.sem
description: 표준오차 (Standard Error of Mean)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.sem

**Description**: 표준오차 (Standard Error of Mean)

**Original Documentation**: [scipy.stats.sem](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html)

---


  * sem


scipy.stats.

# sem[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html#sem "Link to this heading") 

scipy.stats.sem(_a_ , _axis =0_, _ddof =1_, _nan_policy ='propagate'_, _*_ , _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L2603-L2666)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html#scipy.stats.sem "Link to this definition") 
    
Compute standard error of the mean.
Calculate the standard error of the mean (or standard error of measurement) of the values in the input array. 

Parameters: 
     

**a** array_like 
    
An array containing the values for which the standard error is returned. Must contain at least two observations. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**ddof** int, optional 
    
Delta degrees-of-freedom. How many degrees of freedom to adjust for bias in limited samples relative to the population estimate of variance. Defaults to 1. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**s** ndarray or float 
    
The standard error of the mean in the sample(s), along the input axis.
Notes
The default value for _ddof_ is different to the default (0) used by other ddof containing routines, such as np.std and np.nanstd.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`sem`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html#scipy.stats.sem "scipy.stats.sem") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ✅ | ✅  
Dask | ✅ | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
Examples
Try it in your browser!
Find standard error along the first axis:
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> a = np.arange(20).reshape(5,4)
>>> stats.sem(a)
array([ 2.8284,  2.8284,  2.8284,  2.8284])

```
Copy to clipboard
Find standard error across the whole array, using n degrees of freedom:
```
>>> stats.sem(a, axis=None, ddof=0)
1.2893796958227628

```
Copy to clipboard
Go BackOpen In Tab
[ previous iqr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.iqr.html "previous page") [ next bayes_mvs ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bayes_mvs.html "next page")
On this page 
  * [`sem`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html#scipy.stats.sem)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
