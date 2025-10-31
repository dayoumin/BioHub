---
title: numpy.linalg.svd
description: 특이값 분해 (SVD)
source: https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.linalg.svd

**Description**: 특이값 분해 (SVD)

**Original Documentation**: [numpy.linalg.svd](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.svd.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.svd.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.svd.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.svd.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.svd.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.svd.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.svd.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.svd.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.svd.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.svd.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.svd.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.svd.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.svd.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.svd.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.svd.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.svd.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.svd.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.svd.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.svd.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.svd.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.svd.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.svd.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.svd.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.svd.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.svd.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.svd.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.svd.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.svd.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.svd.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.svd.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.svd.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.svd.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.svd.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.svd.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.svd.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.svd.html)


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
  * [NumPy’s module structure](https://numpy.org/doc/stable/reference/module_structure.html)
  * [Linear algebra](https://numpy.org/doc/stable/reference/routines.linalg.html)
  * numpy.linalg.svd

# numpy.linalg.svd[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html#numpy-linalg-svd "Link to this heading") 

linalg.svd(_a_ , _full_matrices =True_, _compute_uv =True_, _hermitian =False_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/linalg/_linalg.py#L1689-L1874)[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html#numpy.linalg.svd "Link to this definition") 
    
Singular Value Decomposition.
When _a_ is a 2D array, and `full_matrices=False`, then it is factorized as `u @ np.diag(s) @ vh = (u * s) @ vh`, where _u_ and the Hermitian transpose of _vh_ are 2D arrays with orthonormal columns and _s_ is a 1D array of _a_ ’s singular values. When _a_ is higher-dimensional, SVD is applied in stacked mode as explained below. 

Parameters: 
     

**a**(…, M, N) array_like 
    
A real or complex array with `a.ndim >= 2`. 

**full_matrices** bool, optional 
    
If True (default), _u_ and _vh_ have the shapes `(..., M, M)` and `(..., N, N)`, respectively. Otherwise, the shapes are `(..., M, K)` and `(..., K, N)`, respectively, where `K = min(M, N)`. 

**compute_uv** bool, optional 
    
Whether or not to compute _u_ and _vh_ in addition to _s_. True by default. 

**hermitian** bool, optional 
    
If True, _a_ is assumed to be Hermitian (symmetric if real-valued), enabling a more efficient method for finding singular values. Defaults to False. 

Returns: 
     

When _compute_uv_ is True, the result is a namedtuple with the following


attribute names:


**U**{ (…, M, M), (…, M, K) } array 
    
Unitary array(s). The first `a.ndim - 2` dimensions have the same size as those of the input _a_. The size of the last two dimensions depends on the value of _full_matrices_. Only returned when _compute_uv_ is True. 

**S**(…, K) array 
    
Vector(s) with the singular values, within each vector sorted in descending order. The first `a.ndim - 2` dimensions have the same size as those of the input _a_. 

**Vh**{ (…, N, N), (…, K, N) } array 
    
Unitary array(s). The first `a.ndim - 2` dimensions have the same size as those of the input _a_. The size of the last two dimensions depends on the value of _full_matrices_. Only returned when _compute_uv_ is True. 

Raises: 
     

LinAlgError
    
If SVD computation does not converge.
See also 

[`scipy.linalg.svd`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.svd.html#scipy.linalg.svd "\(in SciPy v1.15.3\)")
    
Similar function in SciPy. 

[`scipy.linalg.svdvals`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.svdvals.html#scipy.linalg.svdvals "\(in SciPy v1.15.3\)")
    
Compute singular values of a matrix.
Notes
The decomposition is performed using LAPACK routine `_gesdd`.
SVD is usually described for the factorization of a 2D matrix A. The higher-dimensional case will be discussed below. In the 2D case, SVD is written as A = U S V^H, where A = a, U= u, S= \mathtt{np.diag}(s) and V^H = vh. The 1D array _s_ contains the singular values of _a_ and _u_ and _vh_ are unitary. The rows of _vh_ are the eigenvectors of A^H A and the columns of _u_ are the eigenvectors of A A^H. In both cases the corresponding (possibly non-zero) eigenvalues are given by `s**2`.
If _a_ has more than two dimensions, then broadcasting rules apply, as explained in [Linear algebra on several matrices at once](https://numpy.org/doc/stable/reference/routines.linalg.html#routines-linalg-broadcasting). This means that SVD is working in “stacked” mode: it iterates over all indices of the first `a.ndim - 2` dimensions and for each combination SVD is applied to the last two indices. The matrix _a_ can be reconstructed from the decomposition with either `(u * s[..., None, :]) @ vh` or `u @ (s[..., None] * vh)`. (The `@` operator can be replaced by the function `np.matmul` for python versions below 3.5.)
If _a_ is a `matrix` object (as opposed to an `ndarray`), then so are all the return values.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> rng = np.random.default_rng()
>>> a = rng.normal(size=(9, 6)) + 1j*rng.normal(size=(9, 6))
>>> b = rng.normal(size=(2, 7, 8, 3)) + 1j*rng.normal(size=(2, 7, 8, 3))

```
Copy to clipboard
Reconstruction based on full SVD, 2D case:
```
>>> U, S, Vh = np.linalg.svd(a, full_matrices=True)
>>> U.shape, S.shape, Vh.shape
((9, 9), (6,), (6, 6))
>>> np.allclose(a, np.dot(U[:, :6] * S, Vh))
True
>>> smat = np.zeros((9, 6), dtype=complex)
>>> smat[:6, :6] = np.diag(S)
>>> np.allclose(a, np.dot(U, np.dot(smat, Vh)))
True

```
Copy to clipboard
Reconstruction based on reduced SVD, 2D case:
```
>>> U, S, Vh = np.linalg.svd(a, full_matrices=False)
>>> U.shape, S.shape, Vh.shape
((9, 6), (6,), (6, 6))
>>> np.allclose(a, np.dot(U * S, Vh))
True
>>> smat = np.diag(S)
>>> np.allclose(a, np.dot(U, np.dot(smat, Vh)))
True

```
Copy to clipboard
Reconstruction based on full SVD, 4D case:
```
>>> U, S, Vh = np.linalg.svd(b, full_matrices=True)
>>> U.shape, S.shape, Vh.shape
((2, 7, 8, 8), (2, 7, 3), (2, 7, 3, 3))
>>> np.allclose(b, np.matmul(U[..., :3] * S[..., None, :], Vh))
True
>>> np.allclose(b, np.matmul(U[..., :3], S[..., None] * Vh))
True

```
Copy to clipboard
Reconstruction based on reduced SVD, 4D case:
```
>>> U, S, Vh = np.linalg.svd(b, full_matrices=False)
>>> U.shape, S.shape, Vh.shape
((2, 7, 8, 3), (2, 7, 3), (2, 7, 3, 3))
>>> np.allclose(b, np.matmul(U * S[..., None, :], Vh))
True
>>> np.allclose(b, np.matmul(U, S[..., None] * Vh))
True

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.linalg.qr ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.qr.html "previous page") [ next numpy.linalg.svdvals ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svdvals.html "next page")
On this page 
  * [`linalg.svd`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svd.html#numpy.linalg.svd)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
