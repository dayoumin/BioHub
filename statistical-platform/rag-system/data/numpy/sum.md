---
title: numpy.sum
description: 합계
source: https://numpy.org/doc/stable/reference/generated/numpy.sum.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.sum

**Description**: 합계

**Original Documentation**: [numpy.sum](https://numpy.org/doc/stable/reference/generated/numpy.sum.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.sum.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sum.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sum.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sum.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sum.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sum.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sum.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sum.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sum.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sum.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sum.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sum.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sum.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sum.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sum.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sum.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sum.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sum.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sum.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.sum.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sum.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sum.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sum.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sum.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sum.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sum.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sum.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sum.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sum.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sum.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sum.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sum.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sum.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sum.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sum.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sum.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sum.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sum.html)


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
  * numpy.sum

# numpy.sum[#](https://numpy.org/doc/stable/reference/generated/numpy.sum.html#numpy-sum "Link to this heading") 

numpy.sum(_a_ , _axis=None_ , _dtype=None_ , _out=None_ , _keepdims= <no value>_, _initial= <no value>_, _where= <no value>_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L2337-L2468)[#](https://numpy.org/doc/stable/reference/generated/numpy.sum.html#numpy.sum "Link to this definition") 
    
Sum of array elements over a given axis. 

Parameters: 
     

**a** array_like 
    
Elements to sum. 

**axis** None or int or tuple of ints, optional 
    
Axis or axes along which a sum is performed. The default, axis=None, will sum all of the elements of the input array. If axis is negative it counts from the last to the first axis. If axis is a tuple of ints, a sum is performed on all of the axes specified in the tuple instead of a single axis or all the axes as before. 

**dtype** dtype, optional 
    
The type of the returned array and of the accumulator in which the elements are summed. The dtype of _a_ is used by default unless _a_ has an integer dtype of less precision than the default platform integer. In that case, if _a_ is signed then the platform integer is used while if _a_ is unsigned then an unsigned integer of the same precision as the platform integer is used. 

**out** ndarray, optional 
    
Alternative output array in which to place the result. It must have the same shape as the expected output, but the type of the output values will be cast if necessary. 

**keepdims** bool, optional 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array.
If the default value is passed, then _keepdims_ will not be passed through to the [`sum`](https://numpy.org/doc/stable/reference/generated/numpy.sum.html#numpy.sum "numpy.sum") method of sub-classes of [`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "numpy.ndarray"), however any non-default value will be. If the sub-class’ method does not implement _keepdims_ any exceptions will be raised. 

**initial** scalar, optional 
    
Starting value for the sum. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

**where** array_like of bool, optional 
    
Elements to include in the sum. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details. 

Returns: 
     

**sum_along_axis** ndarray 
    
An array with the same shape as _a_ , with the specified axis removed. If _a_ is a 0-d array, or if _axis_ is None, a scalar is returned. If an output array is specified, a reference to _out_ is returned.
See also 

[`ndarray.sum`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.sum.html#numpy.ndarray.sum "numpy.ndarray.sum")
    
Equivalent method. 

[`add`](https://numpy.org/doc/stable/reference/generated/numpy.add.html#numpy.add "numpy.add")
    
`numpy.add.reduce` equivalent function. 

[`cumsum`](https://numpy.org/doc/stable/reference/generated/numpy.cumsum.html#numpy.cumsum "numpy.cumsum")
    
Cumulative sum of array elements. 

[`trapezoid`](https://numpy.org/doc/stable/reference/generated/numpy.trapezoid.html#numpy.trapezoid "numpy.trapezoid")
    
Integration of array values using composite trapezoidal rule. 

[`mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "numpy.mean"), [`average`](https://numpy.org/doc/stable/reference/generated/numpy.average.html#numpy.average "numpy.average") 

Notes
Arithmetic is modular when using integer types, and no error is raised on overflow.
The sum of an empty array is the neutral element 0:
```
>>> np.sum([])
0.0

```
Copy to clipboard
For floating point numbers the numerical precision of sum (and `np.add.reduce`) is in general limited by directly adding each number individually to the result causing rounding errors in every step. However, often numpy will use a numerically better approach (partial pairwise summation) leading to improved precision in many use-cases. This improved precision is always provided when no `axis` is given. When `axis` is given, it will depend on which axis is summed. Technically, to provide the best speed possible, the improved precision is only used when the summation is along the fast axis in memory. Note that the exact precision may vary depending on other parameters. In contrast to NumPy, Python’s `math.fsum` function uses a slower but more precise approach to summation. Especially when summing a large number of lower precision floating point numbers, such as `float32`, numerical errors can become significant. In such cases it can be advisable to use _dtype=”float64”_ to use a higher precision for the output.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> np.sum([0.5, 1.5])
2.0
>>> np.sum([0.5, 0.7, 0.2, 1.5], dtype=np.int32)
np.int32(1)
>>> np.sum([[0, 1], [0, 5]])
6
>>> np.sum([[0, 1], [0, 5]], axis=0)
array([0, 6])
>>> np.sum([[0, 1], [0, 5]], axis=1)
array([1, 5])
>>> np.sum([[0, 1], [np.nan, 5]], where=[False, True], axis=1)
array([1., 5.])

```
Copy to clipboard
If the accumulator is too small, overflow occurs:
```
>>> np.ones(128, dtype=np.int8).sum(dtype=np.int8)
np.int8(-128)

```
Copy to clipboard
You can also start the sum with a value other than zero:
```
>>> np.sum([10], initial=5)
15

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.prod ](https://numpy.org/doc/stable/reference/generated/numpy.prod.html "previous page") [ next numpy.nanprod ](https://numpy.org/doc/stable/reference/generated/numpy.nanprod.html "next page")
On this page 
  * [`sum`](https://numpy.org/doc/stable/reference/generated/numpy.sum.html#numpy.sum)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
