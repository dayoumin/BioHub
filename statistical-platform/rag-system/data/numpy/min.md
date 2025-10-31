---
title: numpy.min
description: 최솟값
source: https://numpy.org/doc/stable/reference/generated/numpy.min.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.min

**Description**: 최솟값

**Original Documentation**: [numpy.min](https://numpy.org/doc/stable/reference/generated/numpy.min.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.min.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.min.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.min.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.min.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.min.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.min.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.min.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.min.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.min.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.min.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.min.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.min.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.min.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.min.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.min.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.min.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.min.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.min.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.min.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.min.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.min.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.min.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.min.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.min.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.min.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.min.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.min.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.min.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.min.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.min.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.min.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.min.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.min.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.min.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.min.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.min.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.min.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.min.html)


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
  * numpy.min

# numpy.min[#](https://numpy.org/doc/stable/reference/generated/numpy.min.html#numpy-min "Link to this heading") 

numpy.min(_a_ , _axis=None_ , _out=None_ , _keepdims= <no value>_, _initial= <no value>_, _where= <no value>_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L3189-L3302)[#](https://numpy.org/doc/stable/reference/generated/numpy.min.html#numpy.min "Link to this definition") 
    
Return the minimum of an array or minimum along an axis. 

Parameters: 
     

**a** array_like 
    
Input data. 

**axis** None or int or tuple of ints, optional 
    
Axis or axes along which to operate. By default, flattened input is used.
If this is a tuple of ints, the minimum is selected over multiple axes, instead of a single axis or all the axes as before. 

**out** ndarray, optional 
    
Alternative output array in which to place the result. Must be of the same shape and buffer length as the expected output. See [Output type determination](https://numpy.org/doc/stable/user/basics.ufuncs.html#ufuncs-output-type) for more details. 

**keepdims** bool, optional 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array.
If the default value is passed, then _keepdims_ will not be passed through to the `min` method of sub-classes of [`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "numpy.ndarray"), however any non-default value will be. If the sub-class’ method does not implement _keepdims_ any exceptions will be raised. 

**initial** scalar, optional 
    
The maximum value of an output element. Must be present to allow computation on empty slice. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

**where** array_like of bool, optional 
    
Elements to compare for the minimum. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

Returns: 
     

**min** ndarray or scalar 
    
Minimum of _a_. If _axis_ is None, the result is a scalar value. If _axis_ is an int, the result is an array of dimension `a.ndim - 1`. If _axis_ is a tuple, the result is an array of dimension `a.ndim - len(axis)`.
See also 

[`amax`](https://numpy.org/doc/stable/reference/generated/numpy.amax.html#numpy.amax "numpy.amax")
    
The maximum value of an array along a given axis, propagating any NaNs. 

[`nanmin`](https://numpy.org/doc/stable/reference/generated/numpy.nanmin.html#numpy.nanmin "numpy.nanmin")
    
The minimum value of an array along a given axis, ignoring any NaNs. 

[`minimum`](https://numpy.org/doc/stable/reference/generated/numpy.minimum.html#numpy.minimum "numpy.minimum")
    
Element-wise minimum of two arrays, propagating any NaNs. 

[`fmin`](https://numpy.org/doc/stable/reference/generated/numpy.fmin.html#numpy.fmin "numpy.fmin")
    
Element-wise minimum of two arrays, ignoring any NaNs. 

[`argmin`](https://numpy.org/doc/stable/reference/generated/numpy.argmin.html#numpy.argmin "numpy.argmin")
    
Return the indices of the minimum values. 

[`nanmax`](https://numpy.org/doc/stable/reference/generated/numpy.nanmax.html#numpy.nanmax "numpy.nanmax"), [`maximum`](https://numpy.org/doc/stable/reference/generated/numpy.maximum.html#numpy.maximum "numpy.maximum"), [`fmax`](https://numpy.org/doc/stable/reference/generated/numpy.fmax.html#numpy.fmax "numpy.fmax") 

Notes
NaN values are propagated, that is if at least one item is NaN, the corresponding min value will be NaN as well. To ignore NaN values (MATLAB behavior), please use nanmin.
Don’t use [`min`](https://numpy.org/doc/stable/reference/generated/numpy.min.html#numpy.min "numpy.min") for element-wise comparison of 2 arrays; when `a.shape[0]` is 2, `minimum(a[0], a[1])` is faster than `min(a, axis=0)`.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.arange(4).reshape((2,2))
>>> a
array([[0, 1],
       [2, 3]])
>>> np.min(a)           # Minimum of the flattened array
0
>>> np.min(a, axis=0)   # Minima along the first axis
array([0, 1])
>>> np.min(a, axis=1)   # Minima along the second axis
array([0, 2])
>>> np.min(a, where=[False, True], initial=10, axis=0)
array([10,  1])

```
Copy to clipboard
```
>>> b = np.arange(5, dtype=float)
>>> b[2] = np.nan
>>> np.min(b)
np.float64(nan)
>>> np.min(b, where=~np.isnan(b), initial=10)
0.0
>>> np.nanmin(b)
0.0

```
Copy to clipboard
```
>>> np.min([[-50], [10]], axis=-1, initial=0)
array([-50,   0])

```
Copy to clipboard
Notice that the initial value is used as one of the elements for which the minimum is determined, unlike for the default argument Python’s max function, which is only used for empty iterables.
Notice that this isn’t the same as Python’s `default` argument.
```
>>> np.min([6], initial=5)
5
>>> min([6], default=5)
6

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.minimum ](https://numpy.org/doc/stable/reference/generated/numpy.minimum.html "previous page") [ next numpy.amin ](https://numpy.org/doc/stable/reference/generated/numpy.amin.html "next page")
On this page 
  * [`min`](https://numpy.org/doc/stable/reference/generated/numpy.min.html#numpy.min)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
