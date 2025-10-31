---
title: scipy.stats.kurtosis
description: 첨도 (Kurtosis)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.kurtosis

**Description**: 첨도 (Kurtosis)

**Original Documentation**: [scipy.stats.kurtosis](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html)

---


  * kurtosis


scipy.stats.

# kurtosis[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html#kurtosis "Link to this heading") 

scipy.stats.kurtosis(_a_ , _axis =0_, _fisher =True_, _bias =True_, _nan_policy ='propagate'_, _*_ , _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L1367-L1473)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html#scipy.stats.kurtosis "Link to this definition") 
    
Compute the kurtosis (Fisher or Pearson) of a dataset.
Kurtosis is the fourth central moment divided by the square of the variance. If Fisher’s definition is used, then 3.0 is subtracted from the result to give 0.0 for a normal distribution.
If bias is False then the kurtosis is calculated using k statistics to eliminate bias coming from biased moment estimators
Use [`kurtosistest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosistest.html#scipy.stats.kurtosistest "scipy.stats.kurtosistest") to see if result is close enough to normal. 

Parameters: 
     

**a** array 
    
Data for which the kurtosis is calculated. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**fisher** bool, optional 
    
If True, Fisher’s definition is used (normal ==> 0.0). If False, Pearson’s definition is used (normal ==> 3.0). 

**bias** bool, optional 
    
If False, then the calculations are corrected for statistical bias. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**kurtosis** array 
    
The kurtosis of values along an axis, returning NaN where all values are equal.
Notes
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
[`kurtosis`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html#scipy.stats.kurtosis "scipy.stats.kurtosis") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
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
Zwillinger, D. and Kokoska, S. (2000). CRC Standard Probability and Statistics Tables and Formulae. Chapman & Hall: New York. 2000.
Examples
Try it in your browser!
In Fisher’s definition, the kurtosis of the normal distribution is zero. In the following example, the kurtosis is close to zero, because it was calculated from the dataset, not from the continuous distribution.
```
>>> importnumpyasnp
>>> fromscipy.statsimport norm, kurtosis
>>> data = norm.rvs(size=1000, random_state=3)
>>> kurtosis(data)
-0.06928694200380558

```
Copy to clipboard
The distribution with a higher kurtosis has a heavier tail. The zero valued kurtosis of the normal distribution in Fisher’s definition can serve as a reference point.
```
>>> importmatplotlib.pyplotasplt
>>> importscipy.statsasstats
>>> fromscipy.statsimport kurtosis

```
Copy to clipboard
```
>>> x = np.linspace(-5, 5, 100)
>>> ax = plt.subplot()
>>> distnames = ['laplace', 'norm', 'uniform']

```
Copy to clipboard
```
>>> for distname in distnames:
...     if distname == 'uniform':
...         dist = getattr(stats, distname)(loc=-2, scale=4)
...     else:
...         dist = getattr(stats, distname)
...     data = dist.rvs(size=1000)
...     kur = kurtosis(data, fisher=True)
...     y = dist.pdf(x)
...     ax.plot(x, y, label="{}, {}".format(distname, round(kur, 3)))
...     ax.legend()

```
Copy to clipboard
The Laplace distribution has a heavier tail than the normal distribution. The uniform distribution (which has negative kurtosis) has the thinnest tail.
![../../_images/scipy-stats-kurtosis-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-kurtosis-1.png)
Go BackOpen In Tab
[ previous pmean ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pmean.html "previous page") [ next mode ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html "next page")
On this page 
  * [`kurtosis`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html#scipy.stats.kurtosis)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
