---
title: scipy.stats.trim_mean
description: 절사평균 (Trimmed Mean)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.trim_mean

**Description**: 절사평균 (Trimmed Mean)

**Original Documentation**: [scipy.stats.trim_mean](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.trim_mean.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.trim_mean.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.trim_mean.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.trim_mean.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.trim_mean.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.trim_mean.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.trim_mean.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.trim_mean.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.trim_mean.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.trim_mean.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.trim_mean.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.trim_mean.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.trim_mean.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.trim_mean.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.trim_mean.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.trim_mean.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.trim_mean.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.trim_mean.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.trim_mean.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.trim_mean.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.trim_mean.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.trim_mean.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.trim_mean.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.trim_mean.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.trim_mean.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.trim_mean.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.trim_mean.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.trim_mean.html)
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
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.trim_mean.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.trim_mean.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.trim_mean.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.trim_mean.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.trim_mean.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.trim_mean.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.trim_mean.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.trim_mean.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.trim_mean.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.trim_mean.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.trim_mean.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.trim_mean.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.trim_mean.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.trim_mean.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.trim_mean.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.trim_mean.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.trim_mean.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.trim_mean.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.trim_mean.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.trim_mean.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.trim_mean.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.trim_mean.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.trim_mean.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.trim_mean.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.trim_mean.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.trim_mean.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.trim_mean.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.trim_mean.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.trim_mean.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.trim_mean.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.trim_mean.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.trim_mean.html)
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
  * trim_mean


scipy.stats.
# trim_mean[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#trim-mean "Link to this heading") 

scipy.stats.trim_mean(_a_ , _proportiontocut_ , _axis =0_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L3649-L3730)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean "Link to this definition") 
    
Return mean of array after trimming a specified fraction of extreme values
Removes the specified proportion of elements from _each_ end of the sorted array, then computes the mean of the remaining elements. 

Parameters: 
     

**a** array_like 
    
Input array. 

**proportiontocut** float 
    
Fraction of the most positive and most negative elements to remove. When the specified proportion does not result in an integer number of elements, the number of elements to trim is rounded down. 

**axis** int or None, default: 0 
    
Axis along which the trimmed means are computed. If None, compute over the raveled array. 

Returns: 
     

**trim_mean** ndarray 
    
Mean of trimmed array.
See also 

[`trimboth`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trimboth.html#scipy.stats.trimboth "scipy.stats.trimboth")
    
Remove a proportion of elements from each end of an array. 

[`tmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tmean.html#scipy.stats.tmean "scipy.stats.tmean")
    
Compute the mean after trimming values outside specified limits.
Notes
For 1-D array _a_ , [`trim_mean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean "scipy.stats.trim_mean") is approximately equivalent to the following calculation:
```
importnumpyasnp
a = np.sort(a)
m = int(proportiontocut * len(a))
np.mean(a[m: len(a) - m])

```
Copy to clipboard
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> x = [1, 2, 3, 5]
>>> stats.trim_mean(x, 0.25)
2.5

```
Copy to clipboard
When the specified proportion does not result in an integer number of elements, the number of elements to trim is rounded down.
```
>>> stats.trim_mean(x, 0.24999) == np.mean(x)
True

```
Copy to clipboard
Use _axis_ to specify the axis along which the calculation is performed.
```
>>> x2 = [[1, 2, 3, 5],
...       [10, 20, 30, 50]]
>>> stats.trim_mean(x2, 0.25)
array([ 5.5, 11. , 16.5, 27.5])
>>> stats.trim_mean(x2, 0.25, axis=1)
array([ 2.5, 25. ])

```
Copy to clipboard
Go BackOpen In Tab
[ previous tiecorrect ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tiecorrect.html "previous page") [ next gstd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gstd.html "next page")
On this page 
  * [`trim_mean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
