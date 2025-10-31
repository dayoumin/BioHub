---
title: numpy.concatenate
description: 배열 결합
source: https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.concatenate

**Description**: 배열 결합

**Original Documentation**: [numpy.concatenate](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html)

---

[Skip to main content](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html#main-content)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.concatenate.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.concatenate.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.concatenate.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.concatenate.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.concatenate.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.concatenate.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.concatenate.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.concatenate.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.concatenate.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.concatenate.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.concatenate.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.concatenate.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.concatenate.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.concatenate.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.concatenate.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.concatenate.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.concatenate.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.concatenate.html)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.concatenate.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.concatenate.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.concatenate.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.concatenate.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.concatenate.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.concatenate.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.concatenate.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.concatenate.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.concatenate.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.concatenate.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.concatenate.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.concatenate.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.concatenate.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.concatenate.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.concatenate.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.concatenate.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.concatenate.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.concatenate.html)
  * [ GitHub](https://github.com/numpy/numpy)


Section Navigation
  * [NumPy’s module structure](https://numpy.org/doc/stable/reference/module_structure.html)


  * [Array objects](https://numpy.org/doc/stable/reference/arrays.html)


  * [Universal functions (`ufunc`)](https://numpy.org/doc/stable/reference/ufuncs.html)


  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
    * [Constants](https://numpy.org/doc/stable/reference/constants.html)
    * [Array creation routines](https://numpy.org/doc/stable/reference/routines.array-creation.html)
    * [Array manipulation routines](https://numpy.org/doc/stable/reference/routines.array-manipulation.html)
      * [numpy.copyto](https://numpy.org/doc/stable/reference/generated/numpy.copyto.html)
      * [numpy.ndim](https://numpy.org/doc/stable/reference/generated/numpy.ndim.html)
      * [numpy.shape](https://numpy.org/doc/stable/reference/generated/numpy.shape.html)
      * [numpy.size](https://numpy.org/doc/stable/reference/generated/numpy.size.html)
      * [numpy.reshape](https://numpy.org/doc/stable/reference/generated/numpy.reshape.html)
      * [numpy.ravel](https://numpy.org/doc/stable/reference/generated/numpy.ravel.html)
      * [numpy.ndarray.flat](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.flat.html)
      * [numpy.ndarray.flatten](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.flatten.html)
      * [numpy.moveaxis](https://numpy.org/doc/stable/reference/generated/numpy.moveaxis.html)
      * [numpy.rollaxis](https://numpy.org/doc/stable/reference/generated/numpy.rollaxis.html)
      * [numpy.swapaxes](https://numpy.org/doc/stable/reference/generated/numpy.swapaxes.html)
      * [numpy.ndarray.T](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.T.html)
      * [numpy.transpose](https://numpy.org/doc/stable/reference/generated/numpy.transpose.html)
      * [numpy.permute_dims](https://numpy.org/doc/stable/reference/generated/numpy.permute_dims.html)
      * [numpy.matrix_transpose](https://numpy.org/doc/stable/reference/generated/numpy.matrix_transpose.html)
      * [numpy.atleast_1d](https://numpy.org/doc/stable/reference/generated/numpy.atleast_1d.html)
      * [numpy.atleast_2d](https://numpy.org/doc/stable/reference/generated/numpy.atleast_2d.html)
      * [numpy.atleast_3d](https://numpy.org/doc/stable/reference/generated/numpy.atleast_3d.html)
      * [numpy.broadcast](https://numpy.org/doc/stable/reference/generated/numpy.broadcast.html)
      * [numpy.broadcast_to](https://numpy.org/doc/stable/reference/generated/numpy.broadcast_to.html)
      * [numpy.broadcast_arrays](https://numpy.org/doc/stable/reference/generated/numpy.broadcast_arrays.html)
      * [numpy.expand_dims](https://numpy.org/doc/stable/reference/generated/numpy.expand_dims.html)
      * [numpy.squeeze](https://numpy.org/doc/stable/reference/generated/numpy.squeeze.html)
      * [numpy.asarray](https://numpy.org/doc/stable/reference/generated/numpy.asarray.html)
      * [numpy.asanyarray](https://numpy.org/doc/stable/reference/generated/numpy.asanyarray.html)
      * [numpy.asmatrix](https://numpy.org/doc/stable/reference/generated/numpy.asmatrix.html)
      * [numpy.asfortranarray](https://numpy.org/doc/stable/reference/generated/numpy.asfortranarray.html)
      * [numpy.ascontiguousarray](https://numpy.org/doc/stable/reference/generated/numpy.ascontiguousarray.html)
      * [numpy.asarray_chkfinite](https://numpy.org/doc/stable/reference/generated/numpy.asarray_chkfinite.html)
      * [numpy.require](https://numpy.org/doc/stable/reference/generated/numpy.require.html)
      * [numpy.concatenate](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html)
      * [numpy.concat](https://numpy.org/doc/stable/reference/generated/numpy.concat.html)
      * [numpy.stack](https://numpy.org/doc/stable/reference/generated/numpy.stack.html)
      * [numpy.block](https://numpy.org/doc/stable/reference/generated/numpy.block.html)
      * [numpy.vstack](https://numpy.org/doc/stable/reference/generated/numpy.vstack.html)
      * [numpy.hstack](https://numpy.org/doc/stable/reference/generated/numpy.hstack.html)
      * [numpy.dstack](https://numpy.org/doc/stable/reference/generated/numpy.dstack.html)
      * [numpy.column_stack](https://numpy.org/doc/stable/reference/generated/numpy.column_stack.html)
      * [numpy.split](https://numpy.org/doc/stable/reference/generated/numpy.split.html)
      * [numpy.array_split](https://numpy.org/doc/stable/reference/generated/numpy.array_split.html)
      * [numpy.dsplit](https://numpy.org/doc/stable/reference/generated/numpy.dsplit.html)
      * [numpy.hsplit](https://numpy.org/doc/stable/reference/generated/numpy.hsplit.html)
      * [numpy.vsplit](https://numpy.org/doc/stable/reference/generated/numpy.vsplit.html)
      * [numpy.unstack](https://numpy.org/doc/stable/reference/generated/numpy.unstack.html)
      * [numpy.tile](https://numpy.org/doc/stable/reference/generated/numpy.tile.html)
      * [numpy.repeat](https://numpy.org/doc/stable/reference/generated/numpy.repeat.html)
      * [numpy.delete](https://numpy.org/doc/stable/reference/generated/numpy.delete.html)
      * [numpy.insert](https://numpy.org/doc/stable/reference/generated/numpy.insert.html)
      * [numpy.append](https://numpy.org/doc/stable/reference/generated/numpy.append.html)
      * [numpy.resize](https://numpy.org/doc/stable/reference/generated/numpy.resize.html)
      * [numpy.trim_zeros](https://numpy.org/doc/stable/reference/generated/numpy.trim_zeros.html)
      * [numpy.unique](https://numpy.org/doc/stable/reference/generated/numpy.unique.html)
      * [numpy.pad](https://numpy.org/doc/stable/reference/generated/numpy.pad.html)
      * [numpy.flip](https://numpy.org/doc/stable/reference/generated/numpy.flip.html)
      * [numpy.fliplr](https://numpy.org/doc/stable/reference/generated/numpy.fliplr.html)
      * [numpy.flipud](https://numpy.org/doc/stable/reference/generated/numpy.flipud.html)
      * [numpy.roll](https://numpy.org/doc/stable/reference/generated/numpy.roll.html)
      * [numpy.rot90](https://numpy.org/doc/stable/reference/generated/numpy.rot90.html)
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


  * [ ](https://numpy.org/doc/stable/index.html)
  * [NumPy reference](https://numpy.org/doc/stable/reference/index.html)
  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
  * [Array manipulation routines](https://numpy.org/doc/stable/reference/routines.array-manipulation.html)
  * numpy.concatenate


# numpy.concatenate[#](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html#numpy-concatenate "Link to this heading") 

numpy.concatenate(_(a1_ , _a2_ , _...)_ , _axis=0_ , _out=None_ , _dtype=None_ , _casting="same_kind"_)[#](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html#numpy.concatenate "Link to this definition") 
    
Join a sequence of arrays along an existing axis. 

Parameters: 
     

**a1, a2, …** sequence of array_like 
    
The arrays must have the same shape, except in the dimension corresponding to _axis_ (the first, by default). 

**axis** int, optional 
    
The axis along which the arrays will be joined. If axis is None, arrays are flattened before use. Default is 0. 

**out** ndarray, optional 
    
If provided, the destination to place the result. The shape must be correct, matching that of what concatenate would have returned if no out argument were specified. 

**dtype** str or dtype 
    
If provided, the destination array will have this dtype. Cannot be provided together with _out_.
New in version 1.20.0. 

**casting**{‘no’, ‘equiv’, ‘safe’, ‘same_kind’, ‘unsafe’}, optional 
    
Controls what kind of data casting may occur. Defaults to ‘same_kind’. For a description of the options, please see [casting](https://numpy.org/doc/stable/glossary.html#term-casting).
New in version 1.20.0. 

Returns: 
     

**res** ndarray 
    
The concatenated array.
See also 

[`ma.concatenate`](https://numpy.org/doc/stable/reference/generated/numpy.ma.concatenate.html#numpy.ma.concatenate "numpy.ma.concatenate")
    
Concatenate function that preserves input masks. 

[`array_split`](https://numpy.org/doc/stable/reference/generated/numpy.array_split.html#numpy.array_split "numpy.array_split")
    
Split an array into multiple sub-arrays of equal or near-equal size. 

[`split`](https://numpy.org/doc/stable/reference/generated/numpy.split.html#numpy.split "numpy.split")
    
Split array into a list of multiple sub-arrays of equal size. 

[`hsplit`](https://numpy.org/doc/stable/reference/generated/numpy.hsplit.html#numpy.hsplit "numpy.hsplit")
    
Split array into multiple sub-arrays horizontally (column wise). 

[`vsplit`](https://numpy.org/doc/stable/reference/generated/numpy.vsplit.html#numpy.vsplit "numpy.vsplit")
    
Split array into multiple sub-arrays vertically (row wise). 

[`dsplit`](https://numpy.org/doc/stable/reference/generated/numpy.dsplit.html#numpy.dsplit "numpy.dsplit")
    
Split array into multiple sub-arrays along the 3rd axis (depth). 

[`stack`](https://numpy.org/doc/stable/reference/generated/numpy.stack.html#numpy.stack "numpy.stack")
    
Stack a sequence of arrays along a new axis. 

[`block`](https://numpy.org/doc/stable/reference/generated/numpy.block.html#numpy.block "numpy.block")
    
Assemble arrays from blocks. 

[`hstack`](https://numpy.org/doc/stable/reference/generated/numpy.hstack.html#numpy.hstack "numpy.hstack")
    
Stack arrays in sequence horizontally (column wise). 

[`vstack`](https://numpy.org/doc/stable/reference/generated/numpy.vstack.html#numpy.vstack "numpy.vstack")
    
Stack arrays in sequence vertically (row wise). 

[`dstack`](https://numpy.org/doc/stable/reference/generated/numpy.dstack.html#numpy.dstack "numpy.dstack")
    
Stack arrays in sequence depth wise (along third dimension). 

[`column_stack`](https://numpy.org/doc/stable/reference/generated/numpy.column_stack.html#numpy.column_stack "numpy.column_stack")
    
Stack 1-D arrays as columns into a 2-D array.
Notes
When one or more of the arrays to be concatenated is a MaskedArray, this function will return a MaskedArray object instead of an ndarray, but the input masks are _not_ preserved. In cases where a MaskedArray is expected as input, use the ma.concatenate function from the masked array module instead.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[1, 2], [3, 4]])
>>> b = np.array([[5, 6]])
>>> np.concatenate((a, b), axis=0)
array([[1, 2],
       [3, 4],
       [5, 6]])
>>> np.concatenate((a, b.T), axis=1)
array([[1, 2, 5],
       [3, 4, 6]])
>>> np.concatenate((a, b), axis=None)
array([1, 2, 3, 4, 5, 6])

```
Copy to clipboard
This function will not preserve masking of MaskedArray inputs.
```
>>> a = np.ma.arange(3)
>>> a[1] = np.ma.masked
>>> b = np.arange(2, 5)
>>> a
masked_array(data=[0, --, 2],
             mask=[False,  True, False],
       fill_value=999999)
>>> b
array([2, 3, 4])
>>> np.concatenate([a, b])
masked_array(data=[0, 1, 2, 2, 3, 4],
             mask=False,
       fill_value=999999)
>>> np.ma.concatenate([a, b])
masked_array(data=[0, --, 2, 2, 3, 4],
             mask=[False,  True, False, False, False, False],
       fill_value=999999)

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.require ](https://numpy.org/doc/stable/reference/generated/numpy.require.html "previous page") [ next numpy.concat ](https://numpy.org/doc/stable/reference/generated/numpy.concat.html "next page")
On this page 
  * [`concatenate`](https://numpy.org/doc/stable/reference/generated/numpy.concatenate.html#numpy.concatenate)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
