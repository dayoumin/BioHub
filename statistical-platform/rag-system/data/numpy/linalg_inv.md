---
title: numpy.linalg.inv
description: 역행렬
source: https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.linalg.inv

**Description**: 역행렬

**Original Documentation**: [numpy.linalg.inv](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html)

---

[Skip to main content](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#main-content)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.inv.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.inv.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.inv.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.inv.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.inv.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.inv.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.inv.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.inv.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.inv.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.inv.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.inv.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.inv.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.inv.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.inv.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.inv.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.inv.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.inv.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.inv.html)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.inv.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.inv.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.inv.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.inv.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.inv.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.inv.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.inv.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.inv.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.inv.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.inv.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.inv.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.inv.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.inv.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.inv.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.inv.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.inv.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.inv.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.inv.html)
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
      * [numpy.dot](https://numpy.org/doc/stable/reference/generated/numpy.dot.html)
      * [numpy.linalg.multi_dot](https://numpy.org/doc/stable/reference/generated/numpy.linalg.multi_dot.html)
      * [numpy.vdot](https://numpy.org/doc/stable/reference/generated/numpy.vdot.html)
      * [numpy.vecdot](https://numpy.org/doc/stable/reference/generated/numpy.vecdot.html)
      * [numpy.linalg.vecdot](https://numpy.org/doc/stable/reference/generated/numpy.linalg.vecdot.html)
      * [numpy.inner](https://numpy.org/doc/stable/reference/generated/numpy.inner.html)
      * [numpy.outer](https://numpy.org/doc/stable/reference/generated/numpy.outer.html)
      * [numpy.linalg.outer](https://numpy.org/doc/stable/reference/generated/numpy.linalg.outer.html)
      * [numpy.matmul](https://numpy.org/doc/stable/reference/generated/numpy.matmul.html)
      * [numpy.linalg.matmul](https://numpy.org/doc/stable/reference/generated/numpy.linalg.matmul.html)
      * [numpy.matvec](https://numpy.org/doc/stable/reference/generated/numpy.matvec.html)
      * [numpy.vecmat](https://numpy.org/doc/stable/reference/generated/numpy.vecmat.html)
      * [numpy.tensordot](https://numpy.org/doc/stable/reference/generated/numpy.tensordot.html)
      * [numpy.linalg.tensordot](https://numpy.org/doc/stable/reference/generated/numpy.linalg.tensordot.html)
      * [numpy.einsum](https://numpy.org/doc/stable/reference/generated/numpy.einsum.html)
      * [numpy.einsum_path](https://numpy.org/doc/stable/reference/generated/numpy.einsum_path.html)
      * [numpy.linalg.matrix_power](https://numpy.org/doc/stable/reference/generated/numpy.linalg.matrix_power.html)
      * [numpy.kron](https://numpy.org/doc/stable/reference/generated/numpy.kron.html)
      * [numpy.linalg.cross](https://numpy.org/doc/stable/reference/generated/numpy.linalg.cross.html)
      * [numpy.linalg.cholesky](https://numpy.org/doc/stable/reference/generated/numpy.linalg.cholesky.html)
      * [numpy.linalg.qr](https://numpy.org/doc/stable/reference/generated/numpy.linalg.qr.html)
      * [numpy.linalg.svd](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html)
      * [numpy.linalg.svdvals](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svdvals.html)
      * [numpy.linalg.eig](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html)
      * [numpy.linalg.eigh](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigh.html)
      * [numpy.linalg.eigvals](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigvals.html)
      * [numpy.linalg.eigvalsh](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigvalsh.html)
      * [numpy.linalg.norm](https://numpy.org/doc/stable/reference/generated/numpy.linalg.norm.html)
      * [numpy.linalg.matrix_norm](https://numpy.org/doc/stable/reference/generated/numpy.linalg.matrix_norm.html)
      * [numpy.linalg.vector_norm](https://numpy.org/doc/stable/reference/generated/numpy.linalg.vector_norm.html)
      * [numpy.linalg.cond](https://numpy.org/doc/stable/reference/generated/numpy.linalg.cond.html)
      * [numpy.linalg.det](https://numpy.org/doc/stable/reference/generated/numpy.linalg.det.html)
      * [numpy.linalg.matrix_rank](https://numpy.org/doc/stable/reference/generated/numpy.linalg.matrix_rank.html)
      * [numpy.linalg.slogdet](https://numpy.org/doc/stable/reference/generated/numpy.linalg.slogdet.html)
      * [numpy.trace](https://numpy.org/doc/stable/reference/generated/numpy.trace.html)
      * [numpy.linalg.trace](https://numpy.org/doc/stable/reference/generated/numpy.linalg.trace.html)
      * [numpy.linalg.solve](https://numpy.org/doc/stable/reference/generated/numpy.linalg.solve.html)
      * [numpy.linalg.tensorsolve](https://numpy.org/doc/stable/reference/generated/numpy.linalg.tensorsolve.html)
      * [numpy.linalg.lstsq](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html)
      * [numpy.linalg.inv](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html)
      * [numpy.linalg.pinv](https://numpy.org/doc/stable/reference/generated/numpy.linalg.pinv.html)
      * [numpy.linalg.tensorinv](https://numpy.org/doc/stable/reference/generated/numpy.linalg.tensorinv.html)
      * [numpy.diagonal](https://numpy.org/doc/stable/reference/generated/numpy.diagonal.html)
      * [numpy.linalg.diagonal](https://numpy.org/doc/stable/reference/generated/numpy.linalg.diagonal.html)
      * [numpy.linalg.matrix_transpose](https://numpy.org/doc/stable/reference/generated/numpy.linalg.matrix_transpose.html)
      * [numpy.linalg.LinAlgError](https://numpy.org/doc/stable/reference/generated/numpy.linalg.LinAlgError.html)
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
  * [NumPy’s module structure](https://numpy.org/doc/stable/reference/module_structure.html)
  * [Linear algebra](https://numpy.org/doc/stable/reference/routines.linalg.html)
  * numpy.linalg.inv


# numpy.linalg.inv[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#numpy-linalg-inv "Link to this heading") 

linalg.inv(_a_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/linalg/_linalg.py#L557-L670)[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#numpy.linalg.inv "Link to this definition") 
    
Compute the inverse of a matrix.
Given a square matrix _a_ , return the matrix _ainv_ satisfying `a @ ainv = ainv @ a = eye(a.shape[0])`. 

Parameters: 
     

**a**(…, M, M) array_like 
    
Matrix to be inverted. 

Returns: 
     

**ainv**(…, M, M) ndarray or matrix 
    
Inverse of the matrix _a_. 

Raises: 
     

LinAlgError
    
If _a_ is not square or inversion fails.
See also 

[`scipy.linalg.inv`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.inv.html#scipy.linalg.inv "\(in SciPy v1.15.3\)")
    
Similar function in SciPy. 

[`numpy.linalg.cond`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.cond.html#numpy.linalg.cond "numpy.linalg.cond")
    
Compute the condition number of a matrix. 

[`numpy.linalg.svd`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html#numpy.linalg.svd "numpy.linalg.svd")
    
Compute the singular value decomposition of a matrix.
Notes
Broadcasting rules apply, see the [`numpy.linalg`](https://numpy.org/doc/stable/reference/routines.linalg.html#module-numpy.linalg "numpy.linalg") documentation for details.
If _a_ is detected to be singular, a [`LinAlgError`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.LinAlgError.html#numpy.linalg.LinAlgError "numpy.linalg.LinAlgError") is raised. If _a_ is ill-conditioned, a [`LinAlgError`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.LinAlgError.html#numpy.linalg.LinAlgError "numpy.linalg.LinAlgError") may or may not be raised, and results may be inaccurate due to floating-point errors.
References
[[1](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#id2)]
Wikipedia, “Condition number”, <https://en.wikipedia.org/wiki/Condition_number>
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromnumpy.linalgimport inv
>>> a = np.array([[1., 2.], [3., 4.]])
>>> ainv = inv(a)
>>> np.allclose(a @ ainv, np.eye(2))
True
>>> np.allclose(ainv @ a, np.eye(2))
True

```
Copy to clipboard
If a is a matrix object, then the return value is a matrix as well:
```
>>> ainv = inv(np.matrix(a))
>>> ainv
matrix([[-2. ,  1. ],
        [ 1.5, -0.5]])

```
Copy to clipboard
Inverses of several matrices can be computed at once:
```
>>> a = np.array([[[1., 2.], [3., 4.]], [[1, 3], [3, 5]]])
>>> inv(a)
array([[[-2.  ,  1.  ],
        [ 1.5 , -0.5 ]],
       [[-1.25,  0.75],
        [ 0.75, -0.25]]])

```
Copy to clipboard
If a matrix is close to singular, the computed inverse may not satisfy `a @ ainv = ainv @ a = eye(a.shape[0])` even if a [`LinAlgError`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.LinAlgError.html#numpy.linalg.LinAlgError "numpy.linalg.LinAlgError") is not raised:
```
>>> a = np.array([[2,4,6],[2,0,2],[6,8,14]])
>>> inv(a)  # No errors raised
array([[-1.12589991e+15, -5.62949953e+14,  5.62949953e+14],
   [-1.12589991e+15, -5.62949953e+14,  5.62949953e+14],
   [ 1.12589991e+15,  5.62949953e+14, -5.62949953e+14]])
>>> a @ inv(a)
array([[ 0.   , -0.5  ,  0.   ],  # may vary
       [-0.5  ,  0.625,  0.25 ],
       [ 0.   ,  0.   ,  1.   ]])

```
Copy to clipboard
To detect ill-conditioned matrices, you can use [`numpy.linalg.cond`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.cond.html#numpy.linalg.cond "numpy.linalg.cond") to compute its _condition number_ [[1]](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#r02f022d4b0fe-1). The larger the condition number, the more ill-conditioned the matrix is. As a rule of thumb, if the condition number `cond(a) = 10**k`, then you may lose up to `k` digits of accuracy on top of what would be lost to the numerical method due to loss of precision from arithmetic methods.
```
>>> fromnumpy.linalgimport cond
>>> cond(a)
np.float64(8.659885634118668e+17)  # may vary

```
Copy to clipboard
It is also possible to detect ill-conditioning by inspecting the matrix’s singular values directly. The ratio between the largest and the smallest singular value is the condition number:
```
>>> fromnumpy.linalgimport svd
>>> sigma = svd(a, compute_uv=False)  # Do not compute singular vectors
>>> sigma.max()/sigma.min()
8.659885634118668e+17  # may vary

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.linalg.lstsq ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.lstsq.html "previous page") [ next numpy.linalg.pinv ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.pinv.html "next page")
On this page 
  * [`linalg.inv`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.inv.html#numpy.linalg.inv)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
