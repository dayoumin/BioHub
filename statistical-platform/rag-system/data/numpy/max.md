---
title: numpy.max
description: 최댓값
source: https://numpy.org/doc/stable/reference/generated/numpy.max.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.max

**Description**: 최댓값

**Original Documentation**: [numpy.max](https://numpy.org/doc/stable/reference/generated/numpy.max.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.max.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.max.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.max.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.max.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.max.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.max.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.max.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.max.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.max.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.max.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.max.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.max.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.max.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.max.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.max.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.max.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.max.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.max.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.max.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.max.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.max.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.max.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.max.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.max.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.max.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.max.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.max.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.max.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.max.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.max.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.max.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.max.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.max.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.max.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.max.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.max.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.max.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.max.html)


  * [NumPy’s module structure](https://numpy.org/doc/stable/reference/module_structure.html)


  * [Array objects](https://numpy.org/doc/stable/reference/arrays.html)


  * [Universal functions (`ufunc`)](https://numpy.org/doc/stable/reference/ufuncs.html)


  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
    * [Constants](https://numpy.org/doc/stable/reference/constants.html)
    * [Array creation routines](https://numpy.org/doc/stable/reference/routines.array-creation.html)
    * [Array manipulation routines](https://numpy.org/doc/stable/reference/routines.array-manipulation.html)
    * [Bit-wise operations](https://numpy.org/doc/stable/reference/routines.bitwise.html)
    * [String functionality](https://numpy.org/doc/stable/reference/routines.strings.html)
    * [Datetime support functions](https://numpy.org/doc/stable/reference/routines.datetime.html)
    * [Data type routines](https://numpy.org/doc/stable/reference/routines.dtype.html)
    * [Mathematical functions with automatic domain](https://numpy.org/doc/stable/reference/routines.emath.html)
    * [Floating point error handling](https://numpy.org/doc/stable/reference/routines.err.html)
    * [Exceptions and Warnings](https://numpy.org/doc/stable/reference/routines.exceptions.html)
    * [Discrete Fourier Transform](https://numpy.org/doc/stable/reference/routines.fft.html)
    * [Functional programming](https://numpy.org/doc/stable/reference/routines.functional.html)
    * [Input and output](https://numpy.org/doc/stable/reference/routines.io.html)
    * [Indexing routines](https://numpy.org/doc/stable/reference/routines.indexing.html)
    * [Linear algebra](https://numpy.org/doc/stable/reference/routines.linalg.html)
    * [Logic functions](https://numpy.org/doc/stable/reference/routines.logic.html)
    * [Masked array operations](https://numpy.org/doc/stable/reference/routines.ma.html)
    * [Mathematical functions](https://numpy.org/doc/stable/reference/routines.math.html)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                * [Miscellaneous routines](https://numpy.org/doc/stable/reference/routines.other.html)
    * [Polynomials](https://numpy.org/doc/stable/reference/routines.polynomials.html)
    * [Random sampling](https://numpy.org/doc/stable/reference/random/index.html)
    * [Set routines](https://numpy.org/doc/stable/reference/routines.set.html)
    * [Sorting, searching, and counting](https://numpy.org/doc/stable/reference/routines.sort.html)
    * [Statistics](https://numpy.org/doc/stable/reference/routines.statistics.html)
    * [Test support](https://numpy.org/doc/stable/reference/routines.testing.html)
    * [Window functions](https://numpy.org/doc/stable/reference/routines.window.html)


  * [Typing (`numpy.typing`)](https://numpy.org/doc/stable/reference/typing.html)
  * [Packaging](https://numpy.org/doc/stable/reference/distutils.html)


  * [NumPy C-API](https://numpy.org/doc/stable/reference/c-api/index.html)


  * [Array API standard compatibility](https://numpy.org/doc/stable/reference/array_api.html)
  * [CPU/SIMD optimizations](https://numpy.org/doc/stable/reference/simd/index.html)
  * [Thread Safety](https://numpy.org/doc/stable/reference/thread_safety.html)
  * [Global Configuration Options](https://numpy.org/doc/stable/reference/global_state.html)
  * [NumPy security](https://numpy.org/doc/stable/reference/security.html)
  * [Status of `numpy.distutils` and migration advice](https://numpy.org/doc/stable/reference/distutils_status_migration.html)
  * [`numpy.distutils` user guide](https://numpy.org/doc/stable/reference/distutils_guide.html)
  * [NumPy and SWIG](https://numpy.org/doc/stable/reference/swig.html)


  * [NumPy reference](https://numpy.org/doc/stable/reference/index.html)
  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
  * [Mathematical functions](https://numpy.org/doc/stable/reference/routines.math.html)
  * numpy.max

# numpy.max[#](https://numpy.org/doc/stable/reference/generated/numpy.max.html#numpy-max "Link to this heading") 

numpy.max(_a_ , _axis=None_ , _out=None_ , _keepdims= <no value>_, _initial= <no value>_, _where= <no value>_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L3051-L3164)[#](https://numpy.org/doc/stable/reference/generated/numpy.max.html#numpy.max "Link to this definition") 
    
Return the maximum of an array or maximum along an axis. 

Parameters: 
     

**a** array_like 
    
Input data. 

**axis** None or int or tuple of ints, optional 
    
Axis or axes along which to operate. By default, flattened input is used. If this is a tuple of ints, the maximum is selected over multiple axes, instead of a single axis or all the axes as before. 

**out** ndarray, optional 
    
Alternative output array in which to place the result. Must be of the same shape and buffer length as the expected output. See [Output type determination](https://numpy.org/doc/stable/user/basics.ufuncs.html#ufuncs-output-type) for more details. 

**keepdims** bool, optional 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array.
If the default value is passed, then _keepdims_ will not be passed through to the `max` method of sub-classes of [`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "numpy.ndarray"), however any non-default value will be. If the sub-class’ method does not implement _keepdims_ any exceptions will be raised. 

**initial** scalar, optional 
    
The minimum value of an output element. Must be present to allow computation on empty slice. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

**where** array_like of bool, optional 
    
Elements to compare for the maximum. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

Returns: 
     

**max** ndarray or scalar 
    
Maximum of _a_. If _axis_ is None, the result is a scalar value. If _axis_ is an int, the result is an array of dimension `a.ndim - 1`. If _axis_ is a tuple, the result is an array of dimension `a.ndim - len(axis)`.
See also 

[`amin`](https://numpy.org/doc/stable/reference/generated/numpy.amin.html#numpy.amin "numpy.amin")
    
The minimum value of an array along a given axis, propagating any NaNs. 

[`nanmax`](https://numpy.org/doc/stable/reference/generated/numpy.nanmax.html#numpy.nanmax "numpy.nanmax")
    
The maximum value of an array along a given axis, ignoring any NaNs. 

[`maximum`](https://numpy.org/doc/stable/reference/generated/numpy.maximum.html#numpy.maximum "numpy.maximum")
    
Element-wise maximum of two arrays, propagating any NaNs. 

[`fmax`](https://numpy.org/doc/stable/reference/generated/numpy.fmax.html#numpy.fmax "numpy.fmax")
    
Element-wise maximum of two arrays, ignoring any NaNs. 

[`argmax`](https://numpy.org/doc/stable/reference/generated/numpy.argmax.html#numpy.argmax "numpy.argmax")
    
Return the indices of the maximum values. 

[`nanmin`](https://numpy.org/doc/stable/reference/generated/numpy.nanmin.html#numpy.nanmin "numpy.nanmin"), [`minimum`](https://numpy.org/doc/stable/reference/generated/numpy.minimum.html#numpy.minimum "numpy.minimum"), [`fmin`](https://numpy.org/doc/stable/reference/generated/numpy.fmin.html#numpy.fmin "numpy.fmin") 

Notes
NaN values are propagated, that is if at least one item is NaN, the corresponding max value will be NaN as well. To ignore NaN values (MATLAB behavior), please use nanmax.
Don’t use [`max`](https://numpy.org/doc/stable/reference/generated/numpy.max.html#numpy.max "numpy.max") for element-wise comparison of 2 arrays; when `a.shape[0]` is 2, `maximum(a[0], a[1])` is faster than `max(a, axis=0)`.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.arange(4).reshape((2,2))
>>> a
array([[0, 1],
       [2, 3]])
>>> np.max(a)           # Maximum of the flattened array
3
>>> np.max(a, axis=0)   # Maxima along the first axis
array([2, 3])
>>> np.max(a, axis=1)   # Maxima along the second axis
array([1, 3])
>>> np.max(a, where=[False, True], initial=-1, axis=0)
array([-1,  3])
>>> b = np.arange(5, dtype=float)
>>> b[2] = np.nan
>>> np.max(b)
np.float64(nan)
>>> np.max(b, where=~np.isnan(b), initial=-1)
4.0
>>> np.nanmax(b)
4.0

```
Copy to clipboard
You can use an initial value to compute the maximum of an empty slice, or to initialize it to a different value:
```
>>> np.max([[-50], [10]], axis=-1, initial=0)
array([ 0, 10])

```
Copy to clipboard
Notice that the initial value is used as one of the elements for which the maximum is determined, unlike for the default argument Python’s max function, which is only used for empty iterables.
```
>>> np.max([5], initial=6)
6
>>> max([5], default=6)
5

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.maximum ](https://numpy.org/doc/stable/reference/generated/numpy.maximum.html "previous page") [ next numpy.amax ](https://numpy.org/doc/stable/reference/generated/numpy.amax.html "next page")
On this page 
  * [`max`](https://numpy.org/doc/stable/reference/generated/numpy.max.html#numpy.max)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
