---
title: numpy.var
description: 분산
source: https://numpy.org/doc/stable/reference/generated/numpy.var.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.var

**Description**: 분산

**Original Documentation**: [numpy.var](https://numpy.org/doc/stable/reference/generated/numpy.var.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.var.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.var.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.var.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.var.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.var.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.var.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.var.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.var.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.var.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.var.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.var.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.var.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.var.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.var.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.var.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.var.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.var.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.var.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.var.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.var.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.var.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.var.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.var.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.var.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.var.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.var.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.var.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.var.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.var.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.var.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.var.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.var.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.var.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.var.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.var.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.var.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.var.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.var.html)


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
  * [Statistics](https://numpy.org/doc/stable/reference/routines.statistics.html)
  * numpy.var

# numpy.var[#](https://numpy.org/doc/stable/reference/generated/numpy.var.html#numpy-var "Link to this heading") 

numpy.var(_a_ , _axis=None_ , _dtype=None_ , _out=None_ , _ddof=0_ , _keepdims= <no value>_, _*_ , _where= <no value>_, _mean= <no value>_, _correction= <no value>_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/_core/fromnumeric.py#L4072-L4268)[#](https://numpy.org/doc/stable/reference/generated/numpy.var.html#numpy.var "Link to this definition") 
    
Compute the variance along the specified axis.
Returns the variance of the array elements, a measure of the spread of a distribution. The variance is computed for the flattened array by default, otherwise over the specified axis. 

Parameters: 
     

**a** array_like 
    
Array containing numbers whose variance is desired. If _a_ is not an array, a conversion is attempted. 

**axis** None or int or tuple of ints, optional 
    
Axis or axes along which the variance is computed. The default is to compute the variance of the flattened array. If this is a tuple of ints, a variance is performed over multiple axes, instead of a single axis or all the axes as before. 

**dtype** data-type, optional 
    
Type to use in computing the variance. For arrays of integer type the default is [`float64`](https://numpy.org/doc/stable/reference/arrays.scalars.html#numpy.float64 "numpy.float64"); for arrays of float types it is the same as the array type. 

**out** ndarray, optional 
    
Alternate output array in which to place the result. It must have the same shape as the expected output, but the type is cast if necessary. 

**ddof**{int, float}, optional 
    
“Delta Degrees of Freedom”: the divisor used in the calculation is `N - ddof`, where `N` represents the number of elements. By default _ddof_ is zero. See notes for details about use of _ddof_. 

**keepdims** bool, optional 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array.
If the default value is passed, then _keepdims_ will not be passed through to the [`var`](https://numpy.org/doc/stable/reference/generated/numpy.var.html#numpy.var "numpy.var") method of sub-classes of [`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "numpy.ndarray"), however any non-default value will be. If the sub-class’ method does not implement _keepdims_ any exceptions will be raised. 

**where** array_like of bool, optional 
    
Elements to include in the variance. See [`reduce`](https://numpy.org/doc/stable/reference/generated/numpy.ufunc.reduce.html#numpy.ufunc.reduce "numpy.ufunc.reduce") for details.
New in version 1.20.0. 

**mean** array like, optional 
    
Provide the mean to prevent its recalculation. The mean should have a shape as if it was calculated with `keepdims=True`. The axis for the calculation of the mean should be the same as used in the call to this var function.
New in version 2.0.0. 

**correction**{int, float}, optional 
    
Array API compatible name for the `ddof` parameter. Only one of them can be provided at the same time.
New in version 2.0.0. 

Returns: 
     

**variance** ndarray, see dtype parameter above 
    
If `out=None`, returns a new array containing the variance; otherwise, a reference to the output array is returned.
See also 

[`std`](https://numpy.org/doc/stable/reference/generated/numpy.std.html#numpy.std "numpy.std"), [`mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "numpy.mean"), [`nanmean`](https://numpy.org/doc/stable/reference/generated/numpy.nanmean.html#numpy.nanmean "numpy.nanmean"), [`nanstd`](https://numpy.org/doc/stable/reference/generated/numpy.nanstd.html#numpy.nanstd "numpy.nanstd"), [`nanvar`](https://numpy.org/doc/stable/reference/generated/numpy.nanvar.html#numpy.nanvar "numpy.nanvar") 


[Output type determination](https://numpy.org/doc/stable/user/basics.ufuncs.html#ufuncs-output-type)

Notes
There are several common variants of the array variance calculation. Assuming the input _a_ is a one-dimensional NumPy array and `mean` is either provided as an argument or computed as `a.mean()`, NumPy computes the variance of an array as:
```
N = len(a)
d2 = abs(a - mean)**2  # abs is for complex `a`
var = d2.sum() / (N - ddof)  # note use of `ddof`

```
Copy to clipboard
Different values of the argument _ddof_ are useful in different contexts. NumPy’s default `ddof=0` corresponds with the expression:
∑i|ai−a¯|2N
which is sometimes called the “population variance” in the field of statistics because it applies the definition of variance to _a_ as if _a_ were a complete population of possible observations.
Many other libraries define the variance of an array differently, e.g.:
∑i|ai−a¯|2N−1
In statistics, the resulting quantity is sometimes called the “sample variance” because if _a_ is a random sample from a larger population, this calculation provides an unbiased estimate of the variance of the population. The use of N−1 in the denominator is often called “Bessel’s correction” because it corrects for bias (toward lower values) in the variance estimate introduced when the sample mean of _a_ is used in place of the true mean of the population. For this quantity, use `ddof=1`.
Note that for complex numbers, the absolute value is taken before squaring, so that the result is always real and nonnegative.
For floating-point input, the variance is computed using the same precision the input has. Depending on the input data, this can cause the results to be inaccurate, especially for [`float32`](https://numpy.org/doc/stable/reference/arrays.scalars.html#numpy.float32 "numpy.float32") (see example below). Specifying a higher-accuracy accumulator using the `dtype` keyword can alleviate this issue.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[1, 2], [3, 4]])
>>> np.var(a)
1.25
>>> np.var(a, axis=0)
array([1.,  1.])
>>> np.var(a, axis=1)
array([0.25,  0.25])

```
Copy to clipboard
In single precision, var() can be inaccurate:
```
>>> a = np.zeros((2, 512*512), dtype=np.float32)
>>> a[0, :] = 1.0
>>> a[1, :] = 0.1
>>> np.var(a)
np.float32(0.20250003)

```
Copy to clipboard
Computing the variance in float64 is more accurate:
```
>>> np.var(a, dtype=np.float64)
0.20249999932944759 # may vary
>>> ((1-0.55)**2 + (0.1-0.55)**2)/2
0.2025

```
Copy to clipboard
Specifying a where argument:
```
>>> a = np.array([[14, 8, 11, 10], [7, 9, 10, 11], [10, 15, 5, 10]])
>>> np.var(a)
6.833333333333333 # may vary
>>> np.var(a, where=[[True], [True], [False]])
4.0

```
Copy to clipboard
Using the mean keyword to save computation time:
```
>>> importnumpyasnp
>>> fromtimeitimport timeit
>>>
>>> a = np.array([[14, 8, 11, 10], [7, 9, 10, 11], [10, 15, 5, 10]])
>>> mean = np.mean(a, axis=1, keepdims=True)
>>>
>>> g = globals()
>>> n = 10000
>>> t1 = timeit("var = np.var(a, axis=1, mean=mean)", globals=g, number=n)
>>> t2 = timeit("var = np.var(a, axis=1)", globals=g, number=n)
>>> print(f'Percentage execution time saved {100*(t2-t1)/t2:.0f}%')

Percentage execution time saved 32%

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.std ](https://numpy.org/doc/stable/reference/generated/numpy.std.html "previous page") [ next numpy.nanmedian ](https://numpy.org/doc/stable/reference/generated/numpy.nanmedian.html "next page")
On this page 
  * [`var`](https://numpy.org/doc/stable/reference/generated/numpy.var.html#numpy.var)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
