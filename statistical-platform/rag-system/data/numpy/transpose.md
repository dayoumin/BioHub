---
title: numpy.transpose
description: 전치
source: https://numpy.org/doc/stable/reference/generated/numpy.transpose.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.transpose

**Description**: 전치

**Original Documentation**: [numpy.transpose](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.transpose.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.transpose.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.transpose.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.transpose.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.transpose.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.transpose.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.transpose.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.transpose.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.transpose.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.transpose.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.transpose.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.transpose.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.transpose.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.transpose.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.transpose.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.transpose.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.transpose.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.transpose.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.transpose.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.transpose.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.transpose.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.transpose.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.transpose.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.transpose.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.transpose.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.transpose.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.transpose.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.transpose.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.transpose.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.transpose.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.transpose.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.transpose.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.transpose.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.transpose.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.transpose.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.transpose.html)


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
  * [Array manipulation routines](https://numpy.org/doc/stable/reference/routines.array-manipulation.html)
  * numpy.transpose

# numpy.transpose[#](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html#numpy-transpose "Link to this heading") 

numpy.transpose(_a_ , _axes =None_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L629-L702)[#](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html#numpy.transpose "Link to this definition") 
    
Returns an array with axes transposed.
For a 1-D array, this returns an unchanged view of the original array, as a transposed vector is simply the same vector. To convert a 1-D array into a 2-D column vector, an additional dimension must be added, e.g., `np.atleast_2d(a).T` achieves this, as does `a[:, np.newaxis]`. For a 2-D array, this is the standard matrix transpose. For an n-D array, if axes are given, their order indicates how the axes are permuted (see Examples). If axes are not provided, then `transpose(a).shape == a.shape[::-1]`. 

Parameters: 
     

**a** array_like 
    
Input array. 

**axes** tuple or list of ints, optional 
    
If specified, it must be a tuple or list which contains a permutation of [0, 1, …, N-1] where N is the number of axes of _a_. Negative indices can also be used to specify axes. The i-th axis of the returned array will correspond to the axis numbered `axes[i]` of the input. If not specified, defaults to `range(a.ndim)[::-1]`, which reverses the order of the axes. 

Returns: 
     

**p** ndarray 
    
_a_ with its axes permuted. A view is returned whenever possible.
See also 

[`ndarray.transpose`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.transpose.html#numpy.ndarray.transpose "numpy.ndarray.transpose")
    
Equivalent method. 

[`moveaxis`](https://numpy.org/doc/stable/reference/generated/numpy.moveaxis.html#numpy.moveaxis "numpy.moveaxis")
    
Move axes of an array to new positions. 

[`argsort`](https://numpy.org/doc/stable/reference/generated/numpy.argsort.html#numpy.argsort "numpy.argsort")
    
Return the indices that would sort an array.
Notes
Use `transpose(a, argsort(axes))` to invert the transposition of tensors when using the _axes_ keyword argument.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[1, 2], [3, 4]])
>>> a
array([[1, 2],
       [3, 4]])
>>> np.transpose(a)
array([[1, 3],
       [2, 4]])

```
Copy to clipboard
```
>>> a = np.array([1, 2, 3, 4])
>>> a
array([1, 2, 3, 4])
>>> np.transpose(a)
array([1, 2, 3, 4])

```
Copy to clipboard
```
>>> a = np.ones((1, 2, 3))
>>> np.transpose(a, (1, 0, 2)).shape
(2, 1, 3)

```
Copy to clipboard
```
>>> a = np.ones((2, 3, 4, 5))
>>> np.transpose(a).shape
(5, 4, 3, 2)

```
Copy to clipboard
```
>>> a = np.arange(3*4*5).reshape((3, 4, 5))
>>> np.transpose(a, (-1, 0, -2)).shape
(5, 3, 4)

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.swapaxes ](https://numpy.org/doc/stable/reference/generated/numpy.swapaxes.html "previous page") [ next numpy.permute_dims ](https://numpy.org/doc/stable/reference/generated/numpy.permute_dims.html "next page")
On this page 
  * [`transpose`](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html#numpy.transpose)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
