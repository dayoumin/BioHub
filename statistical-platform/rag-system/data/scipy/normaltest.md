---
title: scipy.stats.normaltest
description: D'Agostino-Pearson 정규성 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.normaltest

**Description**: D'Agostino-Pearson 정규성 검정

**Original Documentation**: [scipy.stats.normaltest](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html)

---


  * normaltest


scipy.stats.

# normaltest[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#normaltest "Link to this heading") 

scipy.stats.normaltest(_a_ , _axis =0_, _nan_policy ='propagate'_, _*_ , _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L1829-L1904)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#scipy.stats.normaltest "Link to this definition") 
    
Test whether a sample differs from a normal distribution.
This function tests the null hypothesis that a sample comes from a normal distribution. It is based on D’Agostino and Pearson’s [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#r7bf2e556f491-1), [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#r7bf2e556f491-2) test that combines skew and kurtosis to produce an omnibus test of normality. 

Parameters: 
     

**a** array_like 
    
The array containing the sample to be tested. Must contain at least eight observations. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**statistic** float or array 
    
`s^2 + k^2`, where `s` is the z-score returned by [`skewtest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.skewtest.html#scipy.stats.skewtest "scipy.stats.skewtest") and `k` is the z-score returned by [`kurtosistest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosistest.html#scipy.stats.kurtosistest "scipy.stats.kurtosistest"). 

**pvalue** float or array 
    
A 2-sided chi squared probability for the hypothesis test.
See also 

[Normal test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_normaltest.html#hypothesis-normaltest)
    
Extended example
Notes
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`normaltest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#scipy.stats.normaltest "scipy.stats.normaltest") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[[1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#id1)]
D’Agostino, R. B. (1971), “An omnibus test of normality for moderate and large sample size”, Biometrika, 58, 341-348
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#id2)]
D’Agostino, R. and Pearson, E. S. (1973), “Tests for departure from normality”, Biometrika, 60, 613-622
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> rng = np.random.default_rng()
>>> pts = 1000
>>> a = rng.normal(0, 1, size=pts)
>>> b = rng.normal(2, 1, size=pts)
>>> x = np.concatenate((a, b))
>>> res = stats.normaltest(x)
>>> res.statistic
53.619...  # random
>>> res.pvalue
2.273917413209226e-12  # random

```
Copy to clipboard
For a more detailed example, see [Normal test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_normaltest.html#hypothesis-normaltest).
Go BackOpen In Tab
[ previous kurtosistest ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosistest.html "previous page") [ next jarque_bera ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html "next page")
On this page 
  * [`normaltest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html#scipy.stats.normaltest)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
