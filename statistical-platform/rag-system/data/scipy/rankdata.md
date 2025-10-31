---
title: scipy.stats.rankdata
description: 순위 변환
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.rankdata

**Description**: 순위 변환

**Original Documentation**: [scipy.stats.rankdata](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html)

---


  * rankdata


scipy.stats.

# rankdata[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#rankdata "Link to this heading") 

scipy.stats.rankdata(_a_ , _method ='average'_, _*_ , _axis =None_, _nan_policy ='propagate'_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L10178-L10297)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#scipy.stats.rankdata "Link to this definition") 
    
Assign ranks to data, dealing with ties appropriately.
By default (`axis=None`), the data array is first flattened, and a flat array of ranks is returned. Separately reshape the rank array to the shape of the data array if desired (see Examples).
Ranks begin at 1. The _method_ argument controls how ranks are assigned to equal values. See [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#r79b6e8d42322-1) for further discussion of ranking methods. 

Parameters: 
     

**a** array_like 
    
The array of values to be ranked. 

**method**{‘average’, ‘min’, ‘max’, ‘dense’, ‘ordinal’}, optional 
    
The method used to assign ranks to tied elements. The following methods are available (default is ‘average’):
>   * ‘average’: The average of the ranks that would have been assigned to all the tied values is assigned to each value.
>   * ‘min’: The minimum of the ranks that would have been assigned to all the tied values is assigned to each value. (This is also referred to as “competition” ranking.)
>   * ‘max’: The maximum of the ranks that would have been assigned to all the tied values is assigned to each value.
>   * ‘dense’: Like ‘min’, but the rank of the next highest element is assigned the rank immediately after those assigned to the tied elements.
>   * ‘ordinal’: All values are given a distinct rank, corresponding to the order that the values occur in _a_.
> 


**axis**{None, int}, optional 
    
Axis along which to perform the ranking. If `None`, the data array is first flattened. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’}, optional 
    
Defines how to handle when input contains nan. The following options are available (default is ‘propagate’):
>   * ‘propagate’: propagates nans through the rank calculation
>   * ‘omit’: performs the calculations ignoring nan values
>   * ‘raise’: raises an error
> 

Note
When _nan_policy_ is ‘propagate’, the output is an array of _all_ nans because ranks relative to nans in the input are undefined. When _nan_policy_ is ‘omit’, nans in _a_ are ignored when ranking the other values, and the corresponding locations of the output are nan.
Added in version 1.10. 

Returns: 
     

**ranks** ndarray 
    
An array of size equal to the size of _a_ , containing rank scores.
Notes
[`rankdata`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#scipy.stats.rankdata "scipy.stats.rankdata") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ⛔  
PyTorch | ⛔ | ⛔  
JAX | ⚠️ no JIT | ⚠️ no JIT  
Dask | ⛔ | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[[1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#id1)]
“Ranking”, <https://en.wikipedia.org/wiki/Ranking>
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport rankdata
>>> rankdata([0, 2, 3, 2])
array([ 1. ,  2.5,  4. ,  2.5])
>>> rankdata([0, 2, 3, 2], method='min')
array([ 1,  2,  4,  2])
>>> rankdata([0, 2, 3, 2], method='max')
array([ 1,  3,  4,  3])
>>> rankdata([0, 2, 3, 2], method='dense')
array([ 1,  2,  3,  2])
>>> rankdata([0, 2, 3, 2], method='ordinal')
array([ 1,  2,  4,  3])
>>> rankdata([[0, 2], [3, 2]]).reshape(2,2)
array([[1. , 2.5],
      [4. , 2.5]])
>>> rankdata([[0, 2, 2], [3, 2, 5]], axis=1)
array([[1. , 2.5, 2.5],
       [2. , 1. , 3. ]])
>>> rankdata([0, 2, 3, np.nan, -2, np.nan], nan_policy="propagate")
array([nan, nan, nan, nan, nan, nan])
>>> rankdata([0, 2, 3, np.nan, -2, np.nan], nan_policy="omit")
array([ 2.,  3.,  4., nan,  1., nan])

```
Copy to clipboard
Go BackOpen In Tab
[ previous find_repeats ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.find_repeats.html "previous page") [ next tiecorrect ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tiecorrect.html "next page")
On this page 
  * [`rankdata`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#scipy.stats.rankdata)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
