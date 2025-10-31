---
title: numpy.isnan
description: NaN 확인
source: https://numpy.org/doc/stable/reference/generated/numpy.isnan.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.isnan

**Description**: NaN 확인

**Original Documentation**: [numpy.isnan](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html)

---

[Skip to main content](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html#main-content)
Back to top `Ctrl`+`K`
[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ User Guide ](https://numpy.org/doc/stable/user/index.html)
  * [ API reference ](https://numpy.org/doc/stable/reference/index.html)
  * [ Building from source ](https://numpy.org/doc/stable/building/index.html)
  * [ Development ](https://numpy.org/doc/stable/dev/index.html)
  * [ Release notes ](https://numpy.org/doc/stable/release.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


Light Dark System Settings
2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.isnan.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.isnan.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.isnan.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.isnan.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.isnan.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.isnan.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.isnan.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.isnan.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.isnan.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.isnan.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.isnan.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.isnan.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.isnan.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.isnan.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.isnan.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.isnan.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.isnan.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.isnan.html)
  * [ GitHub](https://github.com/numpy/numpy)


  * [ User Guide ](https://numpy.org/doc/stable/user/index.html)
  * [ API reference ](https://numpy.org/doc/stable/reference/index.html)
  * [ Building from source ](https://numpy.org/doc/stable/building/index.html)
  * [ Development ](https://numpy.org/doc/stable/dev/index.html)
  * [ Release notes ](https://numpy.org/doc/stable/release.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


Light Dark System Settings
2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.isnan.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.isnan.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.isnan.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.isnan.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.isnan.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.isnan.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.isnan.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.isnan.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.isnan.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.isnan.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.isnan.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.isnan.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.isnan.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.isnan.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.isnan.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.isnan.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.isnan.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.isnan.html)
  * [ GitHub](https://github.com/numpy/numpy)


Section Navigation
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
      * [numpy.all](https://numpy.org/doc/stable/reference/generated/numpy.all.html)
      * [numpy.any](https://numpy.org/doc/stable/reference/generated/numpy.any.html)
      * [numpy.isfinite](https://numpy.org/doc/stable/reference/generated/numpy.isfinite.html)
      * [numpy.isinf](https://numpy.org/doc/stable/reference/generated/numpy.isinf.html)
      * [numpy.isnan](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html)
      * [numpy.isnat](https://numpy.org/doc/stable/reference/generated/numpy.isnat.html)
      * [numpy.isneginf](https://numpy.org/doc/stable/reference/generated/numpy.isneginf.html)
      * [numpy.isposinf](https://numpy.org/doc/stable/reference/generated/numpy.isposinf.html)
      * [numpy.iscomplex](https://numpy.org/doc/stable/reference/generated/numpy.iscomplex.html)
      * [numpy.iscomplexobj](https://numpy.org/doc/stable/reference/generated/numpy.iscomplexobj.html)
      * [numpy.isfortran](https://numpy.org/doc/stable/reference/generated/numpy.isfortran.html)
      * [numpy.isreal](https://numpy.org/doc/stable/reference/generated/numpy.isreal.html)
      * [numpy.isrealobj](https://numpy.org/doc/stable/reference/generated/numpy.isrealobj.html)
      * [numpy.isscalar](https://numpy.org/doc/stable/reference/generated/numpy.isscalar.html)
      * [numpy.logical_and](https://numpy.org/doc/stable/reference/generated/numpy.logical_and.html)
      * [numpy.logical_or](https://numpy.org/doc/stable/reference/generated/numpy.logical_or.html)
      * [numpy.logical_not](https://numpy.org/doc/stable/reference/generated/numpy.logical_not.html)
      * [numpy.logical_xor](https://numpy.org/doc/stable/reference/generated/numpy.logical_xor.html)
      * [numpy.allclose](https://numpy.org/doc/stable/reference/generated/numpy.allclose.html)
      * [numpy.isclose](https://numpy.org/doc/stable/reference/generated/numpy.isclose.html)
      * [numpy.array_equal](https://numpy.org/doc/stable/reference/generated/numpy.array_equal.html)
      * [numpy.array_equiv](https://numpy.org/doc/stable/reference/generated/numpy.array_equiv.html)
      * [numpy.greater](https://numpy.org/doc/stable/reference/generated/numpy.greater.html)
      * [numpy.greater_equal](https://numpy.org/doc/stable/reference/generated/numpy.greater_equal.html)
      * [numpy.less](https://numpy.org/doc/stable/reference/generated/numpy.less.html)
      * [numpy.less_equal](https://numpy.org/doc/stable/reference/generated/numpy.less_equal.html)
      * [numpy.equal](https://numpy.org/doc/stable/reference/generated/numpy.equal.html)
      * [numpy.not_equal](https://numpy.org/doc/stable/reference/generated/numpy.not_equal.html)
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


  * [ ](https://numpy.org/doc/stable/index.html)
  * [NumPy reference](https://numpy.org/doc/stable/reference/index.html)
  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
  * [Logic functions](https://numpy.org/doc/stable/reference/routines.logic.html)
  * numpy.isnan


# numpy.isnan[#](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html#numpy-isnan "Link to this heading") 

numpy.isnan(_x_ , _/_ , _out=None_ , _*_ , _where=True_ , _casting='same_kind'_ , _order='K'_ , _dtype=None_ , _subok=True_[, _signature_])_= <ufunc 'isnan'>_[#](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html#numpy.isnan "Link to this definition") 
    
Test element-wise for NaN and return result as a boolean array. 

Parameters: 
     

**x** array_like 
    
Input array. 

**out** ndarray, None, or tuple of ndarray and None, optional 
    
A location into which the result is stored. If provided, it must have a shape that the inputs broadcast to. If not provided or None, a freshly-allocated array is returned. A tuple (possible only as a keyword argument) must have length equal to the number of outputs. 

**where** array_like, optional 
    
This condition is broadcast over the input. At locations where the condition is True, the _out_ array will be set to the ufunc result. Elsewhere, the _out_ array will retain its original value. Note that if an uninitialized _out_ array is created via the default `out=None`, locations within it where the condition is False will remain uninitialized. 

****kwargs**
    
For other keyword-only arguments, see the [ufunc docs](https://numpy.org/doc/stable/reference/ufuncs.html#ufuncs-kwargs). 

Returns: 
     

**y** ndarray or bool 
    
True where `x` is NaN, false otherwise. This is a scalar if _x_ is a scalar.
See also 

[`isinf`](https://numpy.org/doc/stable/reference/generated/numpy.isinf.html#numpy.isinf "numpy.isinf"), [`isneginf`](https://numpy.org/doc/stable/reference/generated/numpy.isneginf.html#numpy.isneginf "numpy.isneginf"), [`isposinf`](https://numpy.org/doc/stable/reference/generated/numpy.isposinf.html#numpy.isposinf "numpy.isposinf"), [`isfinite`](https://numpy.org/doc/stable/reference/generated/numpy.isfinite.html#numpy.isfinite "numpy.isfinite"), [`isnat`](https://numpy.org/doc/stable/reference/generated/numpy.isnat.html#numpy.isnat "numpy.isnat") 

Notes
NumPy uses the IEEE Standard for Binary Floating-Point for Arithmetic (IEEE 754). This means that Not a Number is not equivalent to infinity.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> np.isnan(np.nan)
True
>>> np.isnan(np.inf)
False
>>> np.isnan([np.log(-1.),1.,np.log(0)])
array([ True, False, False])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.isinf ](https://numpy.org/doc/stable/reference/generated/numpy.isinf.html "previous page") [ next numpy.isnat ](https://numpy.org/doc/stable/reference/generated/numpy.isnat.html "next page")
On this page 
  * [`isnan`](https://numpy.org/doc/stable/reference/generated/numpy.isnan.html#numpy.isnan)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
