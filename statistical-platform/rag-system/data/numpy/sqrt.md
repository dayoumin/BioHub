---
title: numpy.sqrt
description: 제곱근
source: https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.sqrt

**Description**: 제곱근

**Original Documentation**: [numpy.sqrt](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.sqrt.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sqrt.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sqrt.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sqrt.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sqrt.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sqrt.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sqrt.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sqrt.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sqrt.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sqrt.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sqrt.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sqrt.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sqrt.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sqrt.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sqrt.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sqrt.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sqrt.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sqrt.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.sqrt.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sqrt.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sqrt.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sqrt.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sqrt.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sqrt.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sqrt.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sqrt.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sqrt.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sqrt.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sqrt.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sqrt.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sqrt.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sqrt.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sqrt.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sqrt.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sqrt.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sqrt.html)


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
  * numpy.sqrt

# numpy.sqrt[#](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html#numpy-sqrt "Link to this heading") 

numpy.sqrt(_x_ , _/_ , _out=None_ , _*_ , _where=True_ , _casting='same_kind'_ , _order='K'_ , _dtype=None_ , _subok=True_[, _signature_])_= <ufunc 'sqrt'>_[#](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html#numpy.sqrt "Link to this definition") 
    
Return the non-negative square-root of an array, element-wise. 

Parameters: 
     

**x** array_like 
    
The values whose square-roots are required. 

**out** ndarray, None, or tuple of ndarray and None, optional 
    
A location into which the result is stored. If provided, it must have a shape that the inputs broadcast to. If not provided or None, a freshly-allocated array is returned. A tuple (possible only as a keyword argument) must have length equal to the number of outputs. 

**where** array_like, optional 
    
This condition is broadcast over the input. At locations where the condition is True, the _out_ array will be set to the ufunc result. Elsewhere, the _out_ array will retain its original value. Note that if an uninitialized _out_ array is created via the default `out=None`, locations within it where the condition is False will remain uninitialized. 

****kwargs**
    
For other keyword-only arguments, see the [ufunc docs](https://numpy.org/doc/stable/reference/ufuncs.html#ufuncs-kwargs). 

Returns: 
     

**y** ndarray 
    
An array of the same shape as _x_ , containing the positive square-root of each element in _x_. If any element in _x_ is complex, a complex array is returned (and the square-roots of negative reals are calculated). If all of the elements in _x_ are real, so is _y_ , with negative elements returning `nan`. If _out_ was provided, _y_ is a reference to it. This is a scalar if _x_ is a scalar.
See also 

[`emath.sqrt`](https://numpy.org/doc/stable/reference/generated/numpy.emath.sqrt.html#numpy.emath.sqrt "numpy.emath.sqrt")
    
A version which returns complex numbers when given negative reals. Note that 0.0 and -0.0 are handled differently for complex inputs.
Notes
_sqrt_ has–consistent with common convention–as its branch cut the real “interval” [_-inf_ , 0), and is continuous from above on it. A branch cut is a curve in the complex plane across which a given complex function fails to be continuous.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> np.sqrt([1,4,9])
array([ 1.,  2.,  3.])

```
Copy to clipboard
```
>>> np.sqrt([4, -1, -3+4J])
array([ 2.+0.j,  0.+1.j,  1.+2.j])

```
Copy to clipboard
```
>>> np.sqrt([4, -1, np.inf])
array([ 2., nan, inf])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.clip ](https://numpy.org/doc/stable/reference/generated/numpy.clip.html "previous page") [ next numpy.cbrt ](https://numpy.org/doc/stable/reference/generated/numpy.cbrt.html "next page")
On this page 
  * [`sqrt`](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html#numpy.sqrt)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
