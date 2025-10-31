---
title: numpy.exp
description: 지수함수
source: https://numpy.org/doc/stable/reference/generated/numpy.exp.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.exp

**Description**: 지수함수

**Original Documentation**: [numpy.exp](https://numpy.org/doc/stable/reference/generated/numpy.exp.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.exp.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.exp.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.exp.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.exp.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.exp.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.exp.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.exp.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.exp.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.exp.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.exp.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.exp.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.exp.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.exp.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.exp.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.exp.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.exp.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.exp.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.exp.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.exp.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.exp.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.exp.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.exp.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.exp.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.exp.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.exp.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.exp.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.exp.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.exp.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.exp.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.exp.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.exp.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.exp.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.exp.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.exp.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.exp.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.exp.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.exp.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.exp.html)


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
  * numpy.exp

# numpy.exp[#](https://numpy.org/doc/stable/reference/generated/numpy.exp.html#numpy-exp "Link to this heading") 

numpy.exp(_x_ , _/_ , _out=None_ , _*_ , _where=True_ , _casting='same_kind'_ , _order='K'_ , _dtype=None_ , _subok=True_[, _signature_])_= <ufunc 'exp'>_[#](https://numpy.org/doc/stable/reference/generated/numpy.exp.html#numpy.exp "Link to this definition") 
    
Calculate the exponential of all elements in the input array. 

Parameters: 
     

**x** array_like 
    
Input values. 

**out** ndarray, None, or tuple of ndarray and None, optional 
    
A location into which the result is stored. If provided, it must have a shape that the inputs broadcast to. If not provided or None, a freshly-allocated array is returned. A tuple (possible only as a keyword argument) must have length equal to the number of outputs. 

**where** array_like, optional 
    
This condition is broadcast over the input. At locations where the condition is True, the _out_ array will be set to the ufunc result. Elsewhere, the _out_ array will retain its original value. Note that if an uninitialized _out_ array is created via the default `out=None`, locations within it where the condition is False will remain uninitialized. 

****kwargs**
    
For other keyword-only arguments, see the [ufunc docs](https://numpy.org/doc/stable/reference/ufuncs.html#ufuncs-kwargs). 

Returns: 
     

**out** ndarray or scalar 
    
Output array, element-wise exponential of _x_. This is a scalar if _x_ is a scalar.
See also 

[`expm1`](https://numpy.org/doc/stable/reference/generated/numpy.expm1.html#numpy.expm1 "numpy.expm1")
    
Calculate `exp(x) - 1` for all elements in the array. 

[`exp2`](https://numpy.org/doc/stable/reference/generated/numpy.exp2.html#numpy.exp2 "numpy.exp2")
    
Calculate `2**x` for all elements in the array.
Notes
The irrational number `e` is also known as Euler’s number. It is approximately 2.718281, and is the base of the natural logarithm, `ln` (this means that, if \\(x = \ln y = \log_e y\\), then \\(e^x = y\\). For real input, `exp(x)` is always positive.
For complex arguments, `x = a + ib`, we can write \\(e^x = e^a e^{ib}\\). The first term, \\(e^a\\), is already known (it is the real argument, described above). The second term, \\(e^{ib}\\), is \\(\cos b + i \sin b\\), a function with magnitude 1 and a periodic phase.
References
[1]
Wikipedia, “Exponential function”, <https://en.wikipedia.org/wiki/Exponential_function>
[2]
M. Abramovitz and I. A. Stegun, “Handbook of Mathematical Functions with Formulas, Graphs, and Mathematical Tables,” Dover, 1964, p. 69, <https://personal.math.ubc.ca/~cbm/aands/page_69.htm>
Examples
Try it in your browser!
Plot the magnitude and phase of `exp(x)` in the complex plane:
```
>>> importnumpyasnp

```
Copy to clipboard
```
>>> importmatplotlib.pyplotasplt
>>> importnumpyasnp

```
Copy to clipboard
```
>>> x = np.linspace(-2*np.pi, 2*np.pi, 100)
>>> xx = x + 1j * x[:, np.newaxis] # a + ib over complex plane
>>> out = np.exp(xx)

```
Copy to clipboard
```
>>> plt.subplot(121)
>>> plt.imshow(np.abs(out),
...            extent=[-2*np.pi, 2*np.pi, -2*np.pi, 2*np.pi], cmap='gray')
>>> plt.title('Magnitude of exp(x)')

```
Copy to clipboard
```
>>> plt.subplot(122)
>>> plt.imshow(np.angle(out),
...            extent=[-2*np.pi, 2*np.pi, -2*np.pi, 2*np.pi], cmap='hsv')
>>> plt.title('Phase (angle) of exp(x)')
>>> plt.show()

```
Copy to clipboard
![../../_images/numpy-exp-1.png](https://numpy.org/doc/stable/_images/numpy-exp-1.png)
Go BackOpen In Tab
[ previous numpy.trapezoid ](https://numpy.org/doc/stable/reference/generated/numpy.trapezoid.html "previous page") [ next numpy.expm1 ](https://numpy.org/doc/stable/reference/generated/numpy.expm1.html "next page")
On this page 
  * [`exp`](https://numpy.org/doc/stable/reference/generated/numpy.exp.html#numpy.exp)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
