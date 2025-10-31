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

[Skip to main content](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html#main-content)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.sqrt.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sqrt.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sqrt.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sqrt.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sqrt.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sqrt.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sqrt.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sqrt.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sqrt.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sqrt.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sqrt.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sqrt.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sqrt.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sqrt.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sqrt.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sqrt.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sqrt.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sqrt.html)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.sqrt.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.sqrt.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.sqrt.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.sqrt.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.sqrt.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.sqrt.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.sqrt.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.sqrt.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.sqrt.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.sqrt.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.sqrt.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.sqrt.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.sqrt.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.sqrt.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.sqrt.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.sqrt.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.sqrt.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.sqrt.html)
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
    * [Masked array operations](https://numpy.org/doc/stable/reference/routines.ma.html)
    * [Mathematical functions](https://numpy.org/doc/stable/reference/routines.math.html)
      * [numpy.sin](https://numpy.org/doc/stable/reference/generated/numpy.sin.html)
      * [numpy.cos](https://numpy.org/doc/stable/reference/generated/numpy.cos.html)
      * [numpy.tan](https://numpy.org/doc/stable/reference/generated/numpy.tan.html)
      * [numpy.arcsin](https://numpy.org/doc/stable/reference/generated/numpy.arcsin.html)
      * [numpy.asin](https://numpy.org/doc/stable/reference/generated/numpy.asin.html)
      * [numpy.arccos](https://numpy.org/doc/stable/reference/generated/numpy.arccos.html)
      * [numpy.acos](https://numpy.org/doc/stable/reference/generated/numpy.acos.html)
      * [numpy.arctan](https://numpy.org/doc/stable/reference/generated/numpy.arctan.html)
      * [numpy.atan](https://numpy.org/doc/stable/reference/generated/numpy.atan.html)
      * [numpy.hypot](https://numpy.org/doc/stable/reference/generated/numpy.hypot.html)
      * [numpy.arctan2](https://numpy.org/doc/stable/reference/generated/numpy.arctan2.html)
      * [numpy.atan2](https://numpy.org/doc/stable/reference/generated/numpy.atan2.html)
      * [numpy.degrees](https://numpy.org/doc/stable/reference/generated/numpy.degrees.html)
      * [numpy.radians](https://numpy.org/doc/stable/reference/generated/numpy.radians.html)
      * [numpy.unwrap](https://numpy.org/doc/stable/reference/generated/numpy.unwrap.html)
      * [numpy.deg2rad](https://numpy.org/doc/stable/reference/generated/numpy.deg2rad.html)
      * [numpy.rad2deg](https://numpy.org/doc/stable/reference/generated/numpy.rad2deg.html)
      * [numpy.sinh](https://numpy.org/doc/stable/reference/generated/numpy.sinh.html)
      * [numpy.cosh](https://numpy.org/doc/stable/reference/generated/numpy.cosh.html)
      * [numpy.tanh](https://numpy.org/doc/stable/reference/generated/numpy.tanh.html)
      * [numpy.arcsinh](https://numpy.org/doc/stable/reference/generated/numpy.arcsinh.html)
      * [numpy.asinh](https://numpy.org/doc/stable/reference/generated/numpy.asinh.html)
      * [numpy.arccosh](https://numpy.org/doc/stable/reference/generated/numpy.arccosh.html)
      * [numpy.acosh](https://numpy.org/doc/stable/reference/generated/numpy.acosh.html)
      * [numpy.arctanh](https://numpy.org/doc/stable/reference/generated/numpy.arctanh.html)
      * [numpy.atanh](https://numpy.org/doc/stable/reference/generated/numpy.atanh.html)
      * [numpy.round](https://numpy.org/doc/stable/reference/generated/numpy.round.html)
      * [numpy.around](https://numpy.org/doc/stable/reference/generated/numpy.around.html)
      * [numpy.rint](https://numpy.org/doc/stable/reference/generated/numpy.rint.html)
      * [numpy.fix](https://numpy.org/doc/stable/reference/generated/numpy.fix.html)
      * [numpy.floor](https://numpy.org/doc/stable/reference/generated/numpy.floor.html)
      * [numpy.ceil](https://numpy.org/doc/stable/reference/generated/numpy.ceil.html)
      * [numpy.trunc](https://numpy.org/doc/stable/reference/generated/numpy.trunc.html)
      * [numpy.prod](https://numpy.org/doc/stable/reference/generated/numpy.prod.html)
      * [numpy.sum](https://numpy.org/doc/stable/reference/generated/numpy.sum.html)
      * [numpy.nanprod](https://numpy.org/doc/stable/reference/generated/numpy.nanprod.html)
      * [numpy.nansum](https://numpy.org/doc/stable/reference/generated/numpy.nansum.html)
      * [numpy.cumulative_sum](https://numpy.org/doc/stable/reference/generated/numpy.cumulative_sum.html)
      * [numpy.cumulative_prod](https://numpy.org/doc/stable/reference/generated/numpy.cumulative_prod.html)
      * [numpy.cumprod](https://numpy.org/doc/stable/reference/generated/numpy.cumprod.html)
      * [numpy.cumsum](https://numpy.org/doc/stable/reference/generated/numpy.cumsum.html)
      * [numpy.nancumprod](https://numpy.org/doc/stable/reference/generated/numpy.nancumprod.html)
      * [numpy.nancumsum](https://numpy.org/doc/stable/reference/generated/numpy.nancumsum.html)
      * [numpy.diff](https://numpy.org/doc/stable/reference/generated/numpy.diff.html)
      * [numpy.ediff1d](https://numpy.org/doc/stable/reference/generated/numpy.ediff1d.html)
      * [numpy.gradient](https://numpy.org/doc/stable/reference/generated/numpy.gradient.html)
      * [numpy.cross](https://numpy.org/doc/stable/reference/generated/numpy.cross.html)
      * [numpy.trapezoid](https://numpy.org/doc/stable/reference/generated/numpy.trapezoid.html)
      * [numpy.exp](https://numpy.org/doc/stable/reference/generated/numpy.exp.html)
      * [numpy.expm1](https://numpy.org/doc/stable/reference/generated/numpy.expm1.html)
      * [numpy.exp2](https://numpy.org/doc/stable/reference/generated/numpy.exp2.html)
      * [numpy.log](https://numpy.org/doc/stable/reference/generated/numpy.log.html)
      * [numpy.log10](https://numpy.org/doc/stable/reference/generated/numpy.log10.html)
      * [numpy.log2](https://numpy.org/doc/stable/reference/generated/numpy.log2.html)
      * [numpy.log1p](https://numpy.org/doc/stable/reference/generated/numpy.log1p.html)
      * [numpy.logaddexp](https://numpy.org/doc/stable/reference/generated/numpy.logaddexp.html)
      * [numpy.logaddexp2](https://numpy.org/doc/stable/reference/generated/numpy.logaddexp2.html)
      * [numpy.i0](https://numpy.org/doc/stable/reference/generated/numpy.i0.html)
      * [numpy.sinc](https://numpy.org/doc/stable/reference/generated/numpy.sinc.html)
      * [numpy.signbit](https://numpy.org/doc/stable/reference/generated/numpy.signbit.html)
      * [numpy.copysign](https://numpy.org/doc/stable/reference/generated/numpy.copysign.html)
      * [numpy.frexp](https://numpy.org/doc/stable/reference/generated/numpy.frexp.html)
      * [numpy.ldexp](https://numpy.org/doc/stable/reference/generated/numpy.ldexp.html)
      * [numpy.nextafter](https://numpy.org/doc/stable/reference/generated/numpy.nextafter.html)
      * [numpy.spacing](https://numpy.org/doc/stable/reference/generated/numpy.spacing.html)
      * [numpy.lcm](https://numpy.org/doc/stable/reference/generated/numpy.lcm.html)
      * [numpy.gcd](https://numpy.org/doc/stable/reference/generated/numpy.gcd.html)
      * [numpy.add](https://numpy.org/doc/stable/reference/generated/numpy.add.html)
      * [numpy.reciprocal](https://numpy.org/doc/stable/reference/generated/numpy.reciprocal.html)
      * [numpy.positive](https://numpy.org/doc/stable/reference/generated/numpy.positive.html)
      * [numpy.negative](https://numpy.org/doc/stable/reference/generated/numpy.negative.html)
      * [numpy.multiply](https://numpy.org/doc/stable/reference/generated/numpy.multiply.html)
      * [numpy.divide](https://numpy.org/doc/stable/reference/generated/numpy.divide.html)
      * [numpy.power](https://numpy.org/doc/stable/reference/generated/numpy.power.html)
      * [numpy.pow](https://numpy.org/doc/stable/reference/generated/numpy.pow.html)
      * [numpy.subtract](https://numpy.org/doc/stable/reference/generated/numpy.subtract.html)
      * [numpy.true_divide](https://numpy.org/doc/stable/reference/generated/numpy.true_divide.html)
      * [numpy.floor_divide](https://numpy.org/doc/stable/reference/generated/numpy.floor_divide.html)
      * [numpy.float_power](https://numpy.org/doc/stable/reference/generated/numpy.float_power.html)
      * [numpy.fmod](https://numpy.org/doc/stable/reference/generated/numpy.fmod.html)
      * [numpy.mod](https://numpy.org/doc/stable/reference/generated/numpy.mod.html)
      * [numpy.modf](https://numpy.org/doc/stable/reference/generated/numpy.modf.html)
      * [numpy.remainder](https://numpy.org/doc/stable/reference/generated/numpy.remainder.html)
      * [numpy.divmod](https://numpy.org/doc/stable/reference/generated/numpy.divmod.html)
      * [numpy.angle](https://numpy.org/doc/stable/reference/generated/numpy.angle.html)
      * [numpy.real](https://numpy.org/doc/stable/reference/generated/numpy.real.html)
      * [numpy.imag](https://numpy.org/doc/stable/reference/generated/numpy.imag.html)
      * [numpy.conj](https://numpy.org/doc/stable/reference/generated/numpy.conj.html)
      * [numpy.conjugate](https://numpy.org/doc/stable/reference/generated/numpy.conjugate.html)
      * [numpy.maximum](https://numpy.org/doc/stable/reference/generated/numpy.maximum.html)
      * [numpy.max](https://numpy.org/doc/stable/reference/generated/numpy.max.html)
      * [numpy.amax](https://numpy.org/doc/stable/reference/generated/numpy.amax.html)
      * [numpy.fmax](https://numpy.org/doc/stable/reference/generated/numpy.fmax.html)
      * [numpy.nanmax](https://numpy.org/doc/stable/reference/generated/numpy.nanmax.html)
      * [numpy.minimum](https://numpy.org/doc/stable/reference/generated/numpy.minimum.html)
      * [numpy.min](https://numpy.org/doc/stable/reference/generated/numpy.min.html)
      * [numpy.amin](https://numpy.org/doc/stable/reference/generated/numpy.amin.html)
      * [numpy.fmin](https://numpy.org/doc/stable/reference/generated/numpy.fmin.html)
      * [numpy.nanmin](https://numpy.org/doc/stable/reference/generated/numpy.nanmin.html)
      * [numpy.convolve](https://numpy.org/doc/stable/reference/generated/numpy.convolve.html)
      * [numpy.clip](https://numpy.org/doc/stable/reference/generated/numpy.clip.html)
      * [numpy.sqrt](https://numpy.org/doc/stable/reference/generated/numpy.sqrt.html)
      * [numpy.cbrt](https://numpy.org/doc/stable/reference/generated/numpy.cbrt.html)
      * [numpy.square](https://numpy.org/doc/stable/reference/generated/numpy.square.html)
      * [numpy.absolute](https://numpy.org/doc/stable/reference/generated/numpy.absolute.html)
      * [numpy.fabs](https://numpy.org/doc/stable/reference/generated/numpy.fabs.html)
      * [numpy.sign](https://numpy.org/doc/stable/reference/generated/numpy.sign.html)
      * [numpy.heaviside](https://numpy.org/doc/stable/reference/generated/numpy.heaviside.html)
      * [numpy.nan_to_num](https://numpy.org/doc/stable/reference/generated/numpy.nan_to_num.html)
      * [numpy.real_if_close](https://numpy.org/doc/stable/reference/generated/numpy.real_if_close.html)
      * [numpy.interp](https://numpy.org/doc/stable/reference/generated/numpy.interp.html)
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
