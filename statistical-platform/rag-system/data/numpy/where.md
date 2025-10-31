---
title: numpy.where
description: 조건부 선택
source: https://numpy.org/doc/stable/reference/generated/numpy.where.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.where

**Description**: 조건부 선택

**Original Documentation**: [numpy.where](https://numpy.org/doc/stable/reference/generated/numpy.where.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.where.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.where.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.where.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.where.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.where.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.where.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.where.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.where.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.where.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.where.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.where.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.where.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.where.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.where.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.where.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.where.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.where.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.where.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.where.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.where.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.where.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.where.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.where.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.where.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.where.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.where.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.where.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.where.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.where.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.where.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.where.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.where.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.where.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.where.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.where.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.where.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.where.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.where.html)


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
  * [Indexing routines](https://numpy.org/doc/stable/reference/routines.indexing.html)
  * numpy.where

# numpy.where[#](https://numpy.org/doc/stable/reference/generated/numpy.where.html#numpy-where "Link to this heading") 

numpy.where(_condition_ , [_x_ , _y_ , ]_/_)[#](https://numpy.org/doc/stable/reference/generated/numpy.where.html#numpy.where "Link to this definition") 
    
Return elements chosen from _x_ or _y_ depending on _condition_.
Note
When only _condition_ is provided, this function is a shorthand for `np.asarray(condition).nonzero()`. Using [`nonzero`](https://numpy.org/doc/stable/reference/generated/numpy.nonzero.html#numpy.nonzero "numpy.nonzero") directly should be preferred, as it behaves correctly for subclasses. The rest of this documentation covers only the case where all three arguments are provided. 

Parameters: 
     

**condition** array_like, bool 
    
Where True, yield _x_ , otherwise yield _y_. 

**x, y** array_like 
    
Values from which to choose. _x_ , _y_ and _condition_ need to be broadcastable to some shape. 

Returns: 
     

**out** ndarray 
    
An array with elements from _x_ where _condition_ is True, and elements from _y_ elsewhere.
See also 

[`choose`](https://numpy.org/doc/stable/reference/generated/numpy.choose.html#numpy.choose "numpy.choose")


[`nonzero`](https://numpy.org/doc/stable/reference/generated/numpy.nonzero.html#numpy.nonzero "numpy.nonzero")
    
The function that is called when x and y are omitted
Notes
If all the arrays are 1-D, [`where`](https://numpy.org/doc/stable/reference/generated/numpy.where.html#numpy.where "numpy.where") is equivalent to:
```
[xv if c else yv
 for c, xv, yv in zip(condition, x, y)]

```
Copy to clipboard
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.arange(10)
>>> a
array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
>>> np.where(a < 5, a, 10*a)
array([ 0,  1,  2,  3,  4, 50, 60, 70, 80, 90])

```
Copy to clipboard
This can be used on multidimensional arrays too:
```
>>> np.where([[True, False], [True, True]],
...          [[1, 2], [3, 4]],
...          [[9, 8], [7, 6]])
array([[1, 8],
       [3, 4]])

```
Copy to clipboard
The shapes of x, y, and the condition are broadcast together:
```
>>> x, y = np.ogrid[:3, :4]
>>> np.where(x < y, x, 10 + y)  # both x and 10+y are broadcast
array([[10,  0,  0,  0],
       [10, 11,  1,  1],
       [10, 11, 12,  2]])

```
Copy to clipboard
```
>>> a = np.array([[0, 1, 2],
...               [0, 2, 4],
...               [0, 3, 6]])
>>> np.where(a < 4, a, -1)  # -1 is broadcast
array([[ 0,  1,  2],
       [ 0,  2, -1],
       [ 0,  3, -1]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.nonzero ](https://numpy.org/doc/stable/reference/generated/numpy.nonzero.html "previous page") [ next numpy.indices ](https://numpy.org/doc/stable/reference/generated/numpy.indices.html "next page")
On this page 
  * [`where`](https://numpy.org/doc/stable/reference/generated/numpy.where.html#numpy.where)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
