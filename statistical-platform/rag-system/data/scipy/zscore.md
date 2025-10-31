---
title: scipy.stats.zscore
description: Z-score 표준화
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.zscore

**Description**: Z-score 표준화

**Original Documentation**: [scipy.stats.zscore](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.zscore.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.zscore.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.zscore.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.zscore.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.zscore.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.zscore.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.zscore.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.zscore.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.zscore.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.zscore.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.zscore.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.zscore.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.zscore.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.zscore.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.zscore.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.zscore.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.zscore.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.zscore.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.zscore.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.zscore.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.zscore.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.zscore.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.zscore.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.zscore.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.zscore.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.zscore.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.zscore.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.zscore.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.zscore.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.zscore.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.zscore.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.zscore.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.zscore.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.zscore.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.zscore.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.zscore.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.zscore.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.zscore.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.zscore.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.zscore.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.zscore.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.zscore.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.zscore.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.zscore.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.zscore.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.zscore.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.zscore.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.zscore.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.zscore.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.zscore.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.zscore.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.zscore.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.zscore.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.zscore.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.zscore.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.zscore.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.zscore.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.zscore.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.zscore.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.zscore.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.zscore.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.zscore.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.zscore.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.zscore.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.zscore.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.zscore.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.zscore.html)
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.zscore.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.zscore.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.zscore.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.zscore.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.zscore.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.zscore.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.zscore.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.zscore.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.zscore.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.zscore.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.zscore.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.zscore.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.zscore.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.zscore.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.zscore.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.zscore.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.zscore.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.zscore.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.zscore.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.zscore.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.zscore.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.zscore.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.zscore.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.zscore.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.zscore.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.zscore.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.zscore.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.zscore.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.zscore.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.zscore.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.zscore.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.zscore.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.zscore.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.zscore.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.zscore.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.zscore.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.zscore.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.zscore.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.zscore.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.zscore.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.zscore.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.zscore.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.zscore.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.zscore.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.zscore.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.zscore.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.zscore.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.zscore.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.zscore.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.zscore.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.zscore.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.zscore.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.zscore.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.zscore.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.zscore.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.zscore.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.zscore.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.zscore.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.zscore.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.zscore.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.zscore.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.zscore.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.zscore.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.zscore.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.zscore.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.zscore.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.zscore.html)
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


Search `Ctrl`+`K`
Section Navigation
  * [scipy](https://docs.scipy.org/doc/scipy/reference/main_namespace.html)
  * [scipy.cluster](https://docs.scipy.org/doc/scipy/reference/cluster.html)
  * [scipy.constants](https://docs.scipy.org/doc/scipy/reference/constants.html)
  * [scipy.datasets](https://docs.scipy.org/doc/scipy/reference/datasets.html)
  * [scipy.differentiate](https://docs.scipy.org/doc/scipy/reference/differentiate.html)
  * [scipy.fft](https://docs.scipy.org/doc/scipy/reference/fft.html)
  * [scipy.fftpack](https://docs.scipy.org/doc/scipy/reference/fftpack.html)
  * [scipy.integrate](https://docs.scipy.org/doc/scipy/reference/integrate.html)
  * [scipy.interpolate](https://docs.scipy.org/doc/scipy/reference/interpolate.html)
  * [scipy.io](https://docs.scipy.org/doc/scipy/reference/io.html)
  * [scipy.linalg](https://docs.scipy.org/doc/scipy/reference/linalg.html)
  * [scipy.ndimage](https://docs.scipy.org/doc/scipy/reference/ndimage.html)
  * [scipy.odr](https://docs.scipy.org/doc/scipy/reference/odr.html)
  * [scipy.optimize](https://docs.scipy.org/doc/scipy/reference/optimize.html)
  * [scipy.signal](https://docs.scipy.org/doc/scipy/reference/signal.html)
  * [scipy.sparse](https://docs.scipy.org/doc/scipy/reference/sparse.html)
  * [scipy.spatial](https://docs.scipy.org/doc/scipy/reference/spatial.html)
  * [scipy.special](https://docs.scipy.org/doc/scipy/reference/special.html)
  * [scipy.stats](https://docs.scipy.org/doc/scipy/reference/stats.html)


  * [ ](https://docs.scipy.org/doc/scipy/index.html)
  * [SciPy API](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [Statistical functions (`scipy.stats`)](https://docs.scipy.org/doc/scipy/reference/stats.html)
  * zscore


scipy.stats.
# zscore[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html#zscore "Link to this heading") 

scipy.stats.zscore(_a_ , _axis =0_, _ddof =0_, _nan_policy ='propagate'_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L2685-L2768)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html#scipy.stats.zscore "Link to this definition") 
    
Compute the z score.
Compute the z score of each value in the sample, relative to the sample mean and standard deviation. 

Parameters: 
     

**a** array_like 
    
An array like object containing the sample data. 

**axis** int or None, optional 
    
Axis along which to operate. Default is 0. If None, compute over the whole array _a_. 

**ddof** int, optional 
    
Degrees of freedom correction in the calculation of the standard deviation. Default is 0. 

**nan_policy**{‘propagate’, ‘raise’, ‘omit’}, optional 
    
Defines how to handle when input contains nan. ‘propagate’ returns nan, ‘raise’ throws an error, ‘omit’ performs the calculations ignoring nan values. Default is ‘propagate’. Note that when the value is ‘omit’, nans in the input also propagate to the output, but they do not affect the z-scores computed for the non-nan values. 

Returns: 
     

**zscore** array_like 
    
The z-scores, standardized by mean and standard deviation of input array _a_.
See also 

[`numpy.mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "\(in NumPy v2.3\)")
    
Arithmetic average 

[`numpy.std`](https://numpy.org/doc/stable/reference/generated/numpy.std.html#numpy.std "\(in NumPy v2.3\)")
    
Arithmetic standard deviation 

[`scipy.stats.gzscore`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gzscore.html#scipy.stats.gzscore "scipy.stats.gzscore")
    
Geometric standard score
Notes
This function preserves ndarray subclasses, and works also with matrices and masked arrays (it uses _asanyarray_ instead of _asarray_ for parameters).
[`zscore`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html#scipy.stats.zscore "scipy.stats.zscore") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ✅  
JAX | ✅ | ✅  
Dask | ✅ | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[1]
“Standard score”, _Wikipedia_ , <https://en.wikipedia.org/wiki/Standard_score>.
[2]
Huck, S. W., Cross, T. L., Clark, S. B, “Overcoming misconceptions about Z-scores”, Teaching Statistics, vol. 8, pp. 38-40, 1986
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([ 0.7972,  0.0767,  0.4383,  0.7866,  0.8091,
...                0.1954,  0.6307,  0.6599,  0.1065,  0.0508])
>>> fromscipyimport stats
>>> stats.zscore(a)
array([ 1.1273, -1.247 , -0.0552,  1.0923,  1.1664, -0.8559,  0.5786,
        0.6748, -1.1488, -1.3324])

```
Copy to clipboard
Computing along a specified axis, using n-1 degrees of freedom (`ddof=1`) to calculate the standard deviation:
```
>>> b = np.array([[ 0.3148,  0.0478,  0.6243,  0.4608],
...               [ 0.7149,  0.0775,  0.6072,  0.9656],
...               [ 0.6341,  0.1403,  0.9759,  0.4064],
...               [ 0.5918,  0.6948,  0.904 ,  0.3721],
...               [ 0.0921,  0.2481,  0.1188,  0.1366]])
>>> stats.zscore(b, axis=1, ddof=1)
array([[-0.19264823, -1.28415119,  1.07259584,  0.40420358],
       [ 0.33048416, -1.37380874,  0.04251374,  1.00081084],
       [ 0.26796377, -1.12598418,  1.23283094, -0.37481053],
       [-0.22095197,  0.24468594,  1.19042819, -1.21416216],
       [-0.82780366,  1.4457416 , -0.43867764, -0.1792603 ]])

```
Copy to clipboard
An example with `nan_policy='omit'`:
```
>>> x = np.array([[25.11, 30.10, np.nan, 32.02, 43.15],
...               [14.95, 16.06, 121.25, 94.35, 29.81]])
>>> stats.zscore(x, axis=1, nan_policy='omit')
array([[-1.13490897, -0.37830299,         nan, -0.08718406,  1.60039602],
       [-0.91611681, -0.89090508,  1.4983032 ,  0.88731639, -0.5785977 ]])

```
Copy to clipboard
Go BackOpen In Tab
[ previous zmap ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zmap.html "previous page") [ next gzscore ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gzscore.html "next page")
On this page 
  * [`zscore`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.zscore.html#scipy.stats.zscore)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
