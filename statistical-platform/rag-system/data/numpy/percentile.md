---
title: numpy.percentile
description: 백분위수 계산
source: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html
library: numpy
version: 2.1.2
license: BSD 3-Clause
copyright: (c) 2005-2024, NumPy Developers
crawled_date: 2025-10-31
---

# numpy.percentile

**Description**: 백분위수 계산

**Original Documentation**: [numpy.percentile](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html)

---

[Skip to main content](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#main-content)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.percentile.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.percentile.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.percentile.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.percentile.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.percentile.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.percentile.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.percentile.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.percentile.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.percentile.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.percentile.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.percentile.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.percentile.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.percentile.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.percentile.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.percentile.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.percentile.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.percentile.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.percentile.html)
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
[dev](https://numpy.org/devdocs/reference/generated/numpy.percentile.html)[2.3 (stable)](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html)[2.2](https://numpy.org/doc/2.2/reference/generated/numpy.percentile.html)[2.1](https://numpy.org/doc/2.1/reference/generated/numpy.percentile.html)[2.0](https://numpy.org/doc/2.0/reference/generated/numpy.percentile.html)[1.26](https://numpy.org/doc/1.26/reference/generated/numpy.percentile.html)[1.25](https://numpy.org/doc/1.25/reference/generated/numpy.percentile.html)[1.24](https://numpy.org/doc/1.24/reference/generated/numpy.percentile.html)[1.23](https://numpy.org/doc/1.23/reference/generated/numpy.percentile.html)[1.22](https://numpy.org/doc/1.22/reference/generated/numpy.percentile.html)[1.21](https://numpy.org/doc/1.21/reference/generated/numpy.percentile.html)[1.20](https://numpy.org/doc/1.20/reference/generated/numpy.percentile.html)[1.19](https://numpy.org/doc/1.19/reference/generated/numpy.percentile.html)[1.18](https://numpy.org/doc/1.18/reference/generated/numpy.percentile.html)[1.17](https://numpy.org/doc/1.17/reference/generated/numpy.percentile.html)[1.16](https://numpy.org/doc/1.16/reference/generated/numpy.percentile.html)[1.15](https://numpy.org/doc/1.15/reference/generated/numpy.percentile.html)[1.14](https://numpy.org/doc/1.14/reference/generated/numpy.percentile.html)[1.13](https://numpy.org/doc/1.13/reference/generated/numpy.percentile.html)
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
    * [Logic functions](https://numpy.org/doc/stable/reference/routines.logic.html)
    * [Masked array operations](https://numpy.org/doc/stable/reference/routines.ma.html)
    * [Mathematical functions](https://numpy.org/doc/stable/reference/routines.math.html)
    * [Miscellaneous routines](https://numpy.org/doc/stable/reference/routines.other.html)
    * [Polynomials](https://numpy.org/doc/stable/reference/routines.polynomials.html)
    * [Random sampling](https://numpy.org/doc/stable/reference/random/index.html)
    * [Set routines](https://numpy.org/doc/stable/reference/routines.set.html)
    * [Sorting, searching, and counting](https://numpy.org/doc/stable/reference/routines.sort.html)
    * [Statistics](https://numpy.org/doc/stable/reference/routines.statistics.html)
      * [numpy.ptp](https://numpy.org/doc/stable/reference/generated/numpy.ptp.html)
      * [numpy.percentile](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html)
      * [numpy.nanpercentile](https://numpy.org/doc/stable/reference/generated/numpy.nanpercentile.html)
      * [numpy.quantile](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html)
      * [numpy.nanquantile](https://numpy.org/doc/stable/reference/generated/numpy.nanquantile.html)
      * [numpy.median](https://numpy.org/doc/stable/reference/generated/numpy.median.html)
      * [numpy.average](https://numpy.org/doc/stable/reference/generated/numpy.average.html)
      * [numpy.mean](https://numpy.org/doc/stable/reference/generated/numpy.mean.html)
      * [numpy.std](https://numpy.org/doc/stable/reference/generated/numpy.std.html)
      * [numpy.var](https://numpy.org/doc/stable/reference/generated/numpy.var.html)
      * [numpy.nanmedian](https://numpy.org/doc/stable/reference/generated/numpy.nanmedian.html)
      * [numpy.nanmean](https://numpy.org/doc/stable/reference/generated/numpy.nanmean.html)
      * [numpy.nanstd](https://numpy.org/doc/stable/reference/generated/numpy.nanstd.html)
      * [numpy.nanvar](https://numpy.org/doc/stable/reference/generated/numpy.nanvar.html)
      * [numpy.corrcoef](https://numpy.org/doc/stable/reference/generated/numpy.corrcoef.html)
      * [numpy.correlate](https://numpy.org/doc/stable/reference/generated/numpy.correlate.html)
      * [numpy.cov](https://numpy.org/doc/stable/reference/generated/numpy.cov.html)
      * [numpy.histogram](https://numpy.org/doc/stable/reference/generated/numpy.histogram.html)
      * [numpy.histogram2d](https://numpy.org/doc/stable/reference/generated/numpy.histogram2d.html)
      * [numpy.histogramdd](https://numpy.org/doc/stable/reference/generated/numpy.histogramdd.html)
      * [numpy.bincount](https://numpy.org/doc/stable/reference/generated/numpy.bincount.html)
      * [numpy.histogram_bin_edges](https://numpy.org/doc/stable/reference/generated/numpy.histogram_bin_edges.html)
      * [numpy.digitize](https://numpy.org/doc/stable/reference/generated/numpy.digitize.html)
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
  * [Routines and objects by topic](https://numpy.org/doc/stable/reference/routines.html)
  * [Statistics](https://numpy.org/doc/stable/reference/routines.statistics.html)
  * numpy.percentile


# numpy.percentile[#](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy-percentile "Link to this heading") 

numpy.percentile(_a_ , _q_ , _axis =None_, _out =None_, _overwrite_input =False_, _method ='linear'_, _keepdims =False_, _*_ , _weights =None_, _interpolation =None_)[[source]](https://github.com/numpy/numpy/blob/v2.3.0/numpy/lib/_function_base_impl.py#L4085-L4291)[#](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy.percentile "Link to this definition") 
    
Compute the q-th percentile of the data along the specified axis.
Returns the q-th percentile(s) of the array elements. 

Parameters: 
     

**a** array_like of real numbers 
    
Input array or object that can be converted to an array. 

**q** array_like of float 
    
Percentage or sequence of percentages for the percentiles to compute. Values must be between 0 and 100 inclusive. 

**axis**{int, tuple of int, None}, optional 
    
Axis or axes along which the percentiles are computed. The default is to compute the percentile(s) along a flattened version of the array. 

**out** ndarray, optional 
    
Alternative output array in which to place the result. It must have the same shape and buffer length as the expected output, but the type (of the output) will be cast if necessary. 

**overwrite_input** bool, optional 
    
If True, then allow the input array _a_ to be modified by intermediate calculations, to save memory. In this case, the contents of the input _a_ after this function completes is undefined. 

**method** str, optional 
    
This parameter specifies the method to use for estimating the percentile. There are many different methods, some unique to NumPy. See the notes for explanation. The options sorted by their R type as summarized in the H&F paper [[1]](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#r08bde0ebf37b-1) are:
  1. ‘inverted_cdf’
  2. ‘averaged_inverted_cdf’
  3. ‘closest_observation’
  4. ‘interpolated_inverted_cdf’
  5. ‘hazen’
  6. ‘weibull’
  7. ‘linear’ (default)
  8. ‘median_unbiased’
  9. ‘normal_unbiased’


The first three methods are discontinuous. NumPy further defines the following discontinuous variations of the default ‘linear’ (7.) option:
  * ‘lower’
  * ‘higher’,
  * ‘midpoint’
  * ‘nearest’


Changed in version 1.22.0: This argument was previously called “interpolation” and only offered the “linear” default and last four options. 

**keepdims** bool, optional 
    
> If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the original array _a_. 

weightsarray_like, optional 
    
An array of weights associated with the values in _a_. Each value in _a_ contributes to the percentile according to its associated weight. The weights array can either be 1-D (in which case its length must be the size of _a_ along the given axis) or of the same shape as _a_. If _weights=None_ , then all data in _a_ are assumed to have a weight equal to one. Only _method=”inverted_cdf”_ supports weights. See the notes for more details.
New in version 2.0.0. 

**interpolation** str, optional 
    
Deprecated name for the method keyword argument.
Deprecated since version 1.22.0. 

Returns: 
     

**percentile** scalar or ndarray 
    
If _q_ is a single percentile and _axis=None_ , then the result is a scalar. If multiple percentiles are given, first axis of the result corresponds to the percentiles. The other axes are the axes that remain after the reduction of _a_. If the input contains integers or floats smaller than `float64`, the output data-type is `float64`. Otherwise, the output data-type is the same as that of the input. If _out_ is specified, that array is returned instead.
See also 

[`mean`](https://numpy.org/doc/stable/reference/generated/numpy.mean.html#numpy.mean "numpy.mean")


[`median`](https://numpy.org/doc/stable/reference/generated/numpy.median.html#numpy.median "numpy.median")
    
equivalent to `percentile(..., 50)` 

[`nanpercentile`](https://numpy.org/doc/stable/reference/generated/numpy.nanpercentile.html#numpy.nanpercentile "numpy.nanpercentile")


[`quantile`](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html#numpy.quantile "numpy.quantile")
    
equivalent to percentile, except q in the range [0, 1].
Notes
The behavior of [`numpy.percentile`](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy.percentile "numpy.percentile") with percentage _q_ is that of [`numpy.quantile`](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html#numpy.quantile "numpy.quantile") with argument `q/100`. For more information, please see [`numpy.quantile`](https://numpy.org/doc/stable/reference/generated/numpy.quantile.html#numpy.quantile "numpy.quantile").
References
[[1](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#id1)]
R. J. Hyndman and Y. Fan, “Sample quantiles in statistical packages,” The American Statistician, 50(4), pp. 361-365, 1996
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> a = np.array([[10, 7, 4], [3, 2, 1]])
>>> a
array([[10,  7,  4],
       [ 3,  2,  1]])
>>> np.percentile(a, 50)
3.5
>>> np.percentile(a, 50, axis=0)
array([6.5, 4.5, 2.5])
>>> np.percentile(a, 50, axis=1)
array([7.,  2.])
>>> np.percentile(a, 50, axis=1, keepdims=True)
array([[7.],
       [2.]])

```
Copy to clipboard
```
>>> m = np.percentile(a, 50, axis=0)
>>> out = np.zeros_like(m)
>>> np.percentile(a, 50, axis=0, out=out)
array([6.5, 4.5, 2.5])
>>> m
array([6.5, 4.5, 2.5])

```
Copy to clipboard
```
>>> b = a.copy()
>>> np.percentile(b, 50, axis=1, overwrite_input=True)
array([7.,  2.])
>>> assert not np.all(a == b)

```
Copy to clipboard
The different methods can be visualized graphically:
```
importmatplotlib.pyplotasplt

a = np.arange(4)
p = np.linspace(0, 100, 6001)
ax = plt.gca()
lines = [
    ('linear', '-', 'C0'),
    ('inverted_cdf', ':', 'C1'),
    # Almost the same as `inverted_cdf`:
    ('averaged_inverted_cdf', '-.', 'C1'),
    ('closest_observation', ':', 'C2'),
    ('interpolated_inverted_cdf', '--', 'C1'),
    ('hazen', '--', 'C3'),
    ('weibull', '-.', 'C4'),
    ('median_unbiased', '--', 'C5'),
    ('normal_unbiased', '-.', 'C6'),
    ]
for method, style, color in lines:
    ax.plot(
        p, np.percentile(a, p, method=method),
        label=method, linestyle=style, color=color)
ax.set(
    title='Percentiles for different methods and data: ' + str(a),
    xlabel='Percentile',
    ylabel='Estimated percentile value',
    yticks=a)
ax.legend(bbox_to_anchor=(1.03, 1))
plt.tight_layout()
plt.show()

```
Copy to clipboard
![../../_images/numpy-percentile-1.png](https://numpy.org/doc/stable/_images/numpy-percentile-1.png)
Go BackOpen In Tab
[ previous numpy.ptp ](https://numpy.org/doc/stable/reference/generated/numpy.ptp.html "previous page") [ next numpy.nanpercentile ](https://numpy.org/doc/stable/reference/generated/numpy.nanpercentile.html "next page")
On this page 
  * [`percentile`](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy.percentile)


© Copyright 2008-2025, NumPy Developers.   

Created using [Sphinx](https://www.sphinx-doc.org/) 7.2.6.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
