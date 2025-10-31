---
title: scipy.stats.jarque_bera
description: Jarque-Bera 정규성 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.jarque_bera

**Description**: Jarque-Bera 정규성 검정

**Original Documentation**: [scipy.stats.jarque_bera](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html)

---


  * jarque_bera


scipy.stats.

# jarque_bera[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html#jarque-bera "Link to this heading") 

scipy.stats.jarque_bera(_x_ , _*_ , _axis =None_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L1907-L1983)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html#scipy.stats.jarque_bera "Link to this definition") 
    
Perform the Jarque-Bera goodness of fit test on sample data.
The Jarque-Bera test tests whether the sample data has the skewness and kurtosis matching a normal distribution.
Note that this test only works for a large enough number of data samples (>2000) as the test statistic asymptotically has a Chi-squared distribution with 2 degrees of freedom. 

Parameters: 
     

**x** array_like 
    
Observations of a random variable. 

**axis** int or None, default: None 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**result** SignificanceResult 
    
An object with the following attributes: 

statisticfloat 
    
The test statistic. 

pvaluefloat 
    
The p-value for the hypothesis test.
See also 

[Jarque-Bera goodness of fit test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_jarque_bera.html#hypothesis-jarque-bera)
    
Extended example
Notes
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`jarque_bera`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html#scipy.stats.jarque_bera "scipy.stats.jarque_bera") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[1]
Jarque, C. and Bera, A. (1980) “Efficient tests for normality, homoscedasticity and serial independence of regression residuals”, 6 Econometric Letters 255-259.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> rng = np.random.default_rng()
>>> x = rng.normal(0, 1, 100000)
>>> jarque_bera_test = stats.jarque_bera(x)
>>> jarque_bera_test
Jarque_beraResult(statistic=3.3415184718131554, pvalue=0.18810419594996775)
>>> jarque_bera_test.statistic
3.3415184718131554
>>> jarque_bera_test.pvalue
0.18810419594996775

```
Copy to clipboard
For a more detailed example, see [Jarque-Bera goodness of fit test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_jarque_bera.html#hypothesis-jarque-bera).
Go BackOpen In Tab
[ previous normaltest ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.normaltest.html "previous page") [ next shapiro ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.shapiro.html "next page")
On this page 
  * [`jarque_bera`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.jarque_bera.html#scipy.stats.jarque_bera)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
