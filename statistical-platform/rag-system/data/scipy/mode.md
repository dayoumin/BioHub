---
title: scipy.stats.mode
description: 최빈값 (Mode)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.mode

**Description**: 최빈값 (Mode)

**Original Documentation**: [scipy.stats.mode](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.mode.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.mode.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.mode.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.mode.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.mode.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.mode.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.mode.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.mode.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.mode.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.mode.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.mode.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.mode.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.mode.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.mode.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.mode.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.mode.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.mode.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.mode.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.mode.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.mode.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.mode.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.mode.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.mode.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.mode.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.mode.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.mode.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.mode.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.mode.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.mode.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.mode.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.mode.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.mode.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.mode.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.mode.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.mode.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.mode.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.mode.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.mode.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.mode.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.mode.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.mode.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.mode.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.mode.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.mode.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.mode.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.mode.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.mode.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.mode.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.mode.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.mode.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.mode.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.mode.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.mode.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.mode.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.mode.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.mode.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.mode.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.mode.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.mode.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.mode.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.mode.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.mode.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.mode.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.mode.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.mode.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.mode.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.mode.html)
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
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.mode.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.mode.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.mode.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.mode.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.mode.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.mode.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.mode.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.mode.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.mode.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.mode.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.mode.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.mode.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.mode.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.mode.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.mode.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.mode.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.mode.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.mode.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.mode.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.mode.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.mode.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.mode.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.mode.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.mode.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.mode.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.mode.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.mode.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.mode.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.mode.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.mode.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.mode.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.mode.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.mode.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.mode.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.mode.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.mode.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.mode.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.mode.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.mode.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.mode.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.mode.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.mode.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.mode.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.mode.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.mode.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.mode.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.mode.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.mode.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.mode.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.mode.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.mode.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.mode.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.mode.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.mode.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.mode.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.mode.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.mode.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.mode.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.mode.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.mode.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.mode.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.mode.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.mode.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.mode.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.mode.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.mode.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.mode.html)
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
  * mode


scipy.stats.
# mode[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#mode "Link to this heading") 

scipy.stats.mode(_a_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L497-L594)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#scipy.stats.mode "Link to this definition") 
    
Return an array of the modal (most common) value in the passed array.
If there is more than one such value, only one is returned. The bin-count for the modal bins is also returned. 

Parameters: 
     

**a** array_like 
    
Numeric, n-dimensional array of which to find mode(s). 

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
     

**mode** ndarray 
    
Array of modal values. 

**count** ndarray 
    
Array of counts for each mode.
Notes
The mode is calculated using [`numpy.unique`](https://numpy.org/doc/stable/reference/generated/numpy.unique.html#numpy.unique "\(in NumPy v2.3\)"). In NumPy versions 1.21 and after, all NaNs - even those with different binary representations - are treated as equivalent and counted as separate instances of the same value.
By convention, the mode of an empty array is NaN, and the associated count is zero.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[3, 0, 3, 7],
...               [3, 2, 6, 2],
...               [1, 7, 2, 8],
...               [3, 0, 6, 1],
...               [3, 2, 5, 5]])
>>> fromscipyimport stats
>>> stats.mode(a, keepdims=True)
ModeResult(mode=array([[3, 0, 6, 1]]), count=array([[4, 2, 2, 1]]))

```
Copy to clipboard
To get mode of whole array, specify `axis=None`:
```
>>> stats.mode(a, axis=None, keepdims=True)
ModeResult(mode=[[3]], count=[[5]])
>>> stats.mode(a, axis=None, keepdims=False)
ModeResult(mode=3, count=5)

```
Copy to clipboard
Go BackOpen In Tab
[ previous kurtosis ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kurtosis.html "previous page") [ next moment ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.moment.html "next page")
On this page 
  * [`mode`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mode.html#scipy.stats.mode)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
