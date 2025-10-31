---
title: numpy.reshape
description: 배열 재구성
source: https://numpy.org/doc/stable/reference/generated/numpy.reshape.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.reshape

**Description**: 배열 재구성

**Original Documentation**: [numpy.reshape](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.reshape.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.reshape.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.reshape.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.reshape.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.reshape.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.reshape.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.reshape.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.reshape.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.reshape.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.reshape.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.reshape.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.reshape.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.reshape.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.reshape.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.reshape.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.reshape.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.reshape.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.reshape.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.reshape.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.reshape.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.reshape.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.reshape.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.reshape.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.reshape.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.reshape.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.reshape.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.reshape.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.reshape.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.reshape.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.reshape.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.reshape.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.reshape.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.reshape.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.reshape.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.reshape.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.reshape.html)


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
  * numpy.reshape

# numpy.reshape[#](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html#numpy-reshape "Link to this heading") 

numpy.reshape(_a_ , _/_ , _shape =None_, _order ='C'_, _*_ , _newshape =None_, _copy =None_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L211-L324)[#](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html#numpy.reshape "Link to this definition") 
    
Gives a new shape to an array without changing its data. 

Parameters: 
     

**a** array_like 
    
Array to be reshaped. 

**shape** int or tuple of ints 
    
The new shape should be compatible with the original shape. If an integer, then the result will be a 1-D array of that length. One shape dimension can be -1. In this case, the value is inferred from the length of the array and remaining dimensions. 

**order**{‘C’, ‘F’, ‘A’}, optional 
    
Read the elements of `a` using this index order, and place the elements into the reshaped array using this index order. ‘C’ means to read / write the elements using C-like index order, with the last axis index changing fastest, back to the first axis index changing slowest. ‘F’ means to read / write the elements using Fortran-like index order, with the first index changing fastest, and the last index changing slowest. Note that the ‘C’ and ‘F’ options take no account of the memory layout of the underlying array, and only refer to the order of indexing. ‘A’ means to read / write the elements in Fortran-like index order if `a` is Fortran _contiguous_ in memory, C-like order otherwise. 

**newshape** int or tuple of ints 
    
Deprecated since version 2.1: Replaced by `shape` argument. Retained for backward compatibility. 

**copy** bool, optional 
    
If `True`, then the array data is copied. If `None`, a copy will only be made if it’s required by `order`. For `False` it raises a `ValueError` if a copy cannot be avoided. Default: `None`. 

Returns: 
     

**reshaped_array** ndarray 
    
This will be a new view object if possible; otherwise, it will be a copy. Note there is no guarantee of the _memory layout_ (C- or Fortran- contiguous) of the returned array.
See also 

[`ndarray.reshape`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.reshape.html#numpy.ndarray.reshape "numpy.ndarray.reshape")
    
Equivalent method.
Notes
It is not always possible to change the shape of an array without copying the data.
The `order` keyword gives the index ordering both for _fetching_ the values from `a`, and then _placing_ the values into the output array. For example, let’s say you have an array:
```
>>> a = np.arange(6).reshape((3, 2))
>>> a
array([[0, 1],
       [2, 3],
       [4, 5]])

```
Copy to clipboard
You can think of reshaping as first raveling the array (using the given index order), then inserting the elements from the raveled array into the new array using the same kind of index ordering as was used for the raveling.
```
>>> np.reshape(a, (2, 3)) # C-like index ordering
array([[0, 1, 2],
       [3, 4, 5]])
>>> np.reshape(np.ravel(a), (2, 3)) # equivalent to C ravel then C reshape
array([[0, 1, 2],
       [3, 4, 5]])
>>> np.reshape(a, (2, 3), order='F') # Fortran-like index ordering
array([[0, 4, 3],
       [2, 1, 5]])
>>> np.reshape(np.ravel(a, order='F'), (2, 3), order='F')
array([[0, 4, 3],
       [2, 1, 5]])

```
Copy to clipboard
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[1,2,3], [4,5,6]])
>>> np.reshape(a, 6)
array([1, 2, 3, 4, 5, 6])
>>> np.reshape(a, 6, order='F')
array([1, 4, 2, 5, 3, 6])

```
Copy to clipboard
```
>>> np.reshape(a, (3,-1))       # the unspecified value is inferred to be 2
array([[1, 2],
       [3, 4],
       [5, 6]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.size ](https://numpy.org/doc/stable/reference/generated/numpy.size.html "previous page") [ next numpy.ravel ](https://numpy.org/doc/stable/reference/generated/numpy.ravel.html "next page")
On this page 
  * [`reshape`](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html#numpy.reshape)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
