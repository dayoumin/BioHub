---
title: numpy.array
description: 배열 생성
source: https://numpy.org/doc/stable/reference/generated/numpy.array.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.array

**Description**: 배열 생성

**Original Documentation**: [numpy.array](https://numpy.org/doc/stable/reference/generated/numpy.array.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.array.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.array.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.array.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.array.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.array.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.array.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.array.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.array.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.array.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.array.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.array.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.array.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.array.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.array.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.array.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.array.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.array.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.array.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.array.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.array.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.array.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.array.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.array.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.array.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.array.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.array.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.array.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.array.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.array.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.array.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.array.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.array.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.array.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.array.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.array.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.array.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.array.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.array.html)


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
  * [Array creation routines](https://numpy.org/doc/stable/reference/routines.array-creation.html)
  * numpy.array

# numpy.array[#](https://numpy.org/doc/stable/reference/generated/numpy.array.html#numpy-array "Link to this heading") 

numpy.array(_object_ , _dtype =None_, _*_ , _copy =True_, _order ='K'_, _subok =False_, _ndmin =0_, _like =None_)[#](https://numpy.org/doc/stable/reference/generated/numpy.array.html#numpy.array "Link to this definition") 
    
Create an array. 

Parameters: 
     

**object** array_like 
    
An array, any object exposing the array interface, an object whose `__array__` method returns an array, or any (nested) sequence. If object is a scalar, a 0-dimensional array containing object is returned. 

**dtype** data-type, optional 
    
The desired data-type for the array. If not given, NumPy will try to use a default `dtype` that can represent the values (by applying promotion rules when necessary.) 

**copy** bool, optional 
    
If `True` (default), then the array data is copied. If `None`, a copy will only be made if `__array__` returns a copy, if obj is a nested sequence, or if a copy is needed to satisfy any of the other requirements (`dtype`, `order`, etc.). Note that any copy of the data is shallow, i.e., for arrays with object dtype, the new array will point to the same objects. See Examples for [`ndarray.copy`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.copy.html#numpy.ndarray.copy "numpy.ndarray.copy"). For `False` it raises a `ValueError` if a copy cannot be avoided. Default: `True`. 

**order**{‘K’, ‘A’, ‘C’, ‘F’}, optional 
    
Specify the memory layout of the array. If object is not an array, the newly created array will be in C order (row major) unless ‘F’ is specified, in which case it will be in Fortran order (column major). If object is an array the following holds.
order | no copy | copy=True  
---|---|---  
‘K’ | unchanged | F & C order preserved, otherwise most similar order  
‘A’ | unchanged | F order if input is F and not C, otherwise C order  
‘C’ | C order | C order  
‘F’ | F order | F order  
When `copy=None` and a copy is made for other reasons, the result is the same as if `copy=True`, with some exceptions for ‘A’, see the Notes section. The default order is ‘K’. 

**subok** bool, optional 
    
If True, then sub-classes will be passed-through, otherwise the returned array will be forced to be a base-class array (default). 

**ndmin** int, optional 
    
Specifies the minimum number of dimensions that the resulting array should have. Ones will be prepended to the shape as needed to meet this requirement. 

**like** array_like, optional 
    
Reference object to allow the creation of arrays which are not NumPy arrays. If an array-like passed in as `like` supports the `__array_function__` protocol, the result will be defined by it. In this case, it ensures the creation of an array object compatible with that passed in via this argument.
New in version 1.20.0. 

Returns: 
     

**out** ndarray 
    
An array object satisfying the specified requirements.
See also 

[`empty_like`](https://numpy.org/doc/stable/reference/generated/numpy.empty_like.html#numpy.empty_like "numpy.empty_like")
    
Return an empty array with shape and type of input. 

[`ones_like`](https://numpy.org/doc/stable/reference/generated/numpy.ones_like.html#numpy.ones_like "numpy.ones_like")
    
Return an array of ones with shape and type of input. 

[`zeros_like`](https://numpy.org/doc/stable/reference/generated/numpy.zeros_like.html#numpy.zeros_like "numpy.zeros_like")
    
Return an array of zeros with shape and type of input. 

[`full_like`](https://numpy.org/doc/stable/reference/generated/numpy.full_like.html#numpy.full_like "numpy.full_like")
    
Return a new array with shape of input filled with value. 

[`empty`](https://numpy.org/doc/stable/reference/generated/numpy.empty.html#numpy.empty "numpy.empty")
    
Return a new uninitialized array. 

[`ones`](https://numpy.org/doc/stable/reference/generated/numpy.ones.html#numpy.ones "numpy.ones")
    
Return a new array setting values to one. 

[`zeros`](https://numpy.org/doc/stable/reference/generated/numpy.zeros.html#numpy.zeros "numpy.zeros")
    
Return a new array setting values to zero. 

[`full`](https://numpy.org/doc/stable/reference/generated/numpy.full.html#numpy.full "numpy.full")
    
Return a new array of given shape filled with value. 

[`copy`](https://numpy.org/doc/stable/reference/generated/numpy.copy.html#numpy.copy "numpy.copy")
    
Return an array copy of the given object.
Notes
When order is ‘A’ and `object` is an array in neither ‘C’ nor ‘F’ order, and a copy is forced by a change in dtype, then the order of the result is not necessarily ‘C’ as expected. This is likely a bug.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> np.array([1, 2, 3])
array([1, 2, 3])

```
Copy to clipboard
Upcasting:
```
>>> np.array([1, 2, 3.0])
array([ 1.,  2.,  3.])

```
Copy to clipboard
More than one dimension:
```
>>> np.array([[1, 2], [3, 4]])
array([[1, 2],
       [3, 4]])

```
Copy to clipboard
Minimum dimensions 2:
```
>>> np.array([1, 2, 3], ndmin=2)
array([[1, 2, 3]])

```
Copy to clipboard
Type provided:
```
>>> np.array([1, 2, 3], dtype=complex)
array([ 1.+0.j,  2.+0.j,  3.+0.j])

```
Copy to clipboard
Data-type consisting of more than one element:
```
>>> x = np.array([(1,2),(3,4)],dtype=[('a','<i4'),('b','<i4')])
>>> x['a']
array([1, 3], dtype=int32)

```
Copy to clipboard
Creating an array from sub-classes:
```
>>> np.array(np.asmatrix('1 2; 3 4'))
array([[1, 2],
       [3, 4]])

```
Copy to clipboard
```
>>> np.array(np.asmatrix('1 2; 3 4'), subok=True)
matrix([[1, 2],
        [3, 4]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.full_like ](https://numpy.org/doc/stable/reference/generated/numpy.full_like.html "previous page") [ next numpy.asarray ](https://numpy.org/doc/stable/reference/generated/numpy.asarray.html "next page")
On this page 
  * [`array`](https://numpy.org/doc/stable/reference/generated/numpy.array.html#numpy.array)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
