---
title: numpy.linalg.eig
description: 고유값/고유벡터
source: https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.linalg.eig

**Description**: 고유값/고유벡터

**Original Documentation**: [numpy.linalg.eig](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html)

---

[ ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo.svg) ![NumPy v2.3 Manual - Home](https://numpy.org/doc/stable/_static/numpylogo_dark.svg) ](https://numpy.org/doc/stable/index.html)
  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * More 
    * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.eig.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.eig.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.eig.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.eig.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.eig.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.eig.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.eig.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.eig.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.eig.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.eig.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.eig.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.eig.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.eig.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.eig.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.eig.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.eig.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.eig.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.eig.html)


  * [ Learn ](https://numpy.org/numpy-tutorials/)
  * [ NEPs ](https://numpy.org/neps)


2.3 (stable)
[dev](https://numpy.org/devdocs/reference/generated/numpy.linalg.eig.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.linalg.eig.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.linalg.eig.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.linalg.eig.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.linalg.eig.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.linalg.eig.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.linalg.eig.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.linalg.eig.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.linalg.eig.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.linalg.eig.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.linalg.eig.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.linalg.eig.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.linalg.eig.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.linalg.eig.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.linalg.eig.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.linalg.eig.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.linalg.eig.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.linalg.eig.html)


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
  * numpy.linalg.eig

# numpy.linalg.eig[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html#numpy-linalg-eig "Link to this heading") 

linalg.eig(_a_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/linalg/_linalg.py#L1383-L1533)[#](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html#numpy.linalg.eig "Link to this definition") 
    
Compute the eigenvalues and right eigenvectors of a square array. 

Parameters: 
     

**a**(…, M, M) array 
    
Matrices for which the eigenvalues and right eigenvectors will be computed 

Returns: 
     

A namedtuple with the following attributes:


**eigenvalues**(…, M) array 
    
The eigenvalues, each repeated according to its multiplicity. The eigenvalues are not necessarily ordered. The resulting array will be of complex type, unless the imaginary part is zero in which case it will be cast to a real type. When _a_ is real the resulting eigenvalues will be real (0 imaginary part) or occur in conjugate pairs 

**eigenvectors**(…, M, M) array 
    
The normalized (unit “length”) eigenvectors, such that the column `eigenvectors[:,i]` is the eigenvector corresponding to the eigenvalue `eigenvalues[i]`. 

Raises: 
     

LinAlgError
    
If the eigenvalue computation does not converge.
See also 

[`eigvals`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigvals.html#numpy.linalg.eigvals "numpy.linalg.eigvals")
    
eigenvalues of a non-symmetric array. 

[`eigh`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigh.html#numpy.linalg.eigh "numpy.linalg.eigh")
    
eigenvalues and eigenvectors of a real symmetric or complex Hermitian (conjugate symmetric) array. 

[`eigvalsh`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigvalsh.html#numpy.linalg.eigvalsh "numpy.linalg.eigvalsh")
    
eigenvalues of a real symmetric or complex Hermitian (conjugate symmetric) array. 

[`scipy.linalg.eig`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.eig.html#scipy.linalg.eig "\(in SciPy v1.15.3\)")
    
Similar function in SciPy that also solves the generalized eigenvalue problem. 

[`scipy.linalg.schur`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.schur.html#scipy.linalg.schur "\(in SciPy v1.15.3\)")
    
Best choice for unitary and other non-Hermitian normal matrices.
Notes
Broadcasting rules apply, see the [`numpy.linalg`](https://numpy.org/doc/stable/reference/routines.linalg.html#module-numpy.linalg "numpy.linalg") documentation for details.
This is implemented using the `_geev` LAPACK routines which compute the eigenvalues and eigenvectors of general square arrays.
The number _w_ is an eigenvalue of _a_ if there exists a vector _v_ such that `a @ v = w * v`. Thus, the arrays _a_ , _eigenvalues_ , and _eigenvectors_ satisfy the equations `a @ eigenvectors[:,i] = eigenvalues[i] * eigenvectors[:,i]` for i∈{0,...,M−1}.
The array _eigenvectors_ may not be of maximum rank, that is, some of the columns may be linearly dependent, although round-off error may obscure that fact. If the eigenvalues are all different, then theoretically the eigenvectors are linearly independent and _a_ can be diagonalized by a similarity transformation using _eigenvectors_ , i.e, `inv(eigenvectors) @ a @ eigenvectors` is diagonal.
For non-Hermitian normal matrices the SciPy function [`scipy.linalg.schur`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.schur.html#scipy.linalg.schur "\(in SciPy v1.15.3\)") is preferred because the matrix _eigenvectors_ is guaranteed to be unitary, which is not the case when using [`eig`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html#numpy.linalg.eig "numpy.linalg.eig"). The Schur factorization produces an upper triangular matrix rather than a diagonal matrix, but for normal matrices only the diagonal of the upper triangular matrix is needed, the rest is roundoff error.
Finally, it is emphasized that _eigenvectors_ consists of the _right_ (as in right-hand side) eigenvectors of _a_. A vector _y_ satisfying `y.T @ a = z * y.T` for some number _z_ is called a _left_ eigenvector of _a_ , and, in general, the left and right eigenvectors of a matrix are not necessarily the (perhaps conjugate) transposes of each other.
References
G. Strang, _Linear Algebra and Its Applications_ , 2nd Ed., Orlando, FL, Academic Press, Inc., 1980, Various pp.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromnumpyimport linalg as LA

```
Copy to clipboard
(Almost) trivial example with real eigenvalues and eigenvectors.
```
>>> eigenvalues, eigenvectors = LA.eig(np.diag((1, 2, 3)))
>>> eigenvalues
array([1., 2., 3.])
>>> eigenvectors
array([[1., 0., 0.],
       [0., 1., 0.],
       [0., 0., 1.]])

```
Copy to clipboard
Real matrix possessing complex eigenvalues and eigenvectors; note that the eigenvalues are complex conjugates of each other.
```
>>> eigenvalues, eigenvectors = LA.eig(np.array([[1, -1], [1, 1]]))
>>> eigenvalues
array([1.+1.j, 1.-1.j])
>>> eigenvectors
array([[0.70710678+0.j        , 0.70710678-0.j        ],
       [0.        -0.70710678j, 0.        +0.70710678j]])

```
Copy to clipboard
Complex-valued matrix with real eigenvalues (but complex-valued eigenvectors); note that `a.conj().T == a`, i.e., _a_ is Hermitian.
```
>>> a = np.array([[1, 1j], [-1j, 1]])
>>> eigenvalues, eigenvectors = LA.eig(a)
>>> eigenvalues
array([2.+0.j, 0.+0.j])
>>> eigenvectors
array([[ 0.        +0.70710678j,  0.70710678+0.j        ], # may vary
       [ 0.70710678+0.j        , -0.        +0.70710678j]])

```
Copy to clipboard
Be careful about round-off error!
```
>>> a = np.array([[1 + 1e-9, 0], [0, 1 - 1e-9]])
>>> # Theor. eigenvalues are 1 +/- 1e-9
>>> eigenvalues, eigenvectors = LA.eig(a)
>>> eigenvalues
array([1., 1.])
>>> eigenvectors
array([[1., 0.],
       [0., 1.]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous numpy.linalg.svdvals ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.svdvals.html "previous page") [ next numpy.linalg.eigh ](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eigh.html "next page")
On this page 
  * [`linalg.eig`](https://numpy.org/doc/stable/reference/generated/numpy.linalg.eig.html#numpy.linalg.eig)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
