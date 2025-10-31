---
title: scipy.stats.siegelslopes
description: Siegel 반복중위수 회귀
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.siegelslopes

**Description**: Siegel 반복중위수 회귀

**Original Documentation**: [scipy.stats.siegelslopes](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html)

---


  * siegelslopes


scipy.stats.

# siegelslopes[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#siegelslopes "Link to this heading") 

scipy.stats.siegelslopes(_y_ , _x =None_, _method ='hierarchical'_, _*_ , _axis =None_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_mstats_common.py#L206-L322)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#scipy.stats.siegelslopes "Link to this definition") 
    
Computes the Siegel estimator for a set of points (x, y).
[`siegelslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#scipy.stats.siegelslopes "scipy.stats.siegelslopes") implements a method for robust linear regression using repeated medians (see [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#r38c02cfc4873-1)) to fit a line to the points (x, y). The method is robust to outliers with an asymptotic breakdown point of 50%. 

Parameters: 
     

**y** array_like 
    
Dependent variable. 

**x** array_like or None, optional 
    
Independent variable. If None, use `arange(len(y))` instead. 

**method**{‘hierarchical’, ‘separate’} 
    
If ‘hierarchical’, estimate the intercept using the estimated slope `slope` (default option). If ‘separate’, estimate the intercept independent of the estimated slope. See Notes for details. 

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
     

**result**`SiegelslopesResult` instance 
    
The return value is an object with the following attributes: 

slopefloat 
    
Estimate of the slope of the regression line. 

interceptfloat 
    
Estimate of the intercept of the regression line.
See also 

[`theilslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes "scipy.stats.theilslopes")
    
a similar technique without repeated medians
Notes
With `n = len(y)`, compute `m_j` as the median of the slopes from the point `(x[j], y[j])` to all other _n-1_ points. `slope` is then the median of all slopes `m_j`. Two ways are given to estimate the intercept in [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#r38c02cfc4873-1) which can be chosen via the parameter `method`. The hierarchical approach uses the estimated slope `slope` and computes `intercept` as the median of `y - slope*x`. The other approach estimates the intercept separately as follows: for each point `(x[j], y[j])`, compute the intercepts of all the _n-1_ lines through the remaining points and take the median `i_j`. `intercept` is the median of the `i_j`.
The implementation computes _n_ times the median of a vector of size _n_ which can be slow for large vectors. There are more efficient algorithms (see [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#r38c02cfc4873-2)) which are not implemented here.
For compatibility with older versions of SciPy, the return value acts like a `namedtuple` of length 2, with fields `slope` and `intercept`, so one can continue to write:
```
slope, intercept = siegelslopes(y, x)

```
Copy to clipboard
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#id2))
A. Siegel, “Robust Regression Using Repeated Medians”, Biometrika, Vol. 69, pp. 242-244, 1982.
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#id3)]
A. Stein and M. Werman, “Finding the repeated median regression line”, Proceedings of the Third Annual ACM-SIAM Symposium on Discrete Algorithms, pp. 409-413, 1992.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> importmatplotlib.pyplotasplt

```
Copy to clipboard
```
>>> x = np.linspace(-5, 5, num=150)
>>> y = x + np.random.normal(size=x.size)
>>> y[11:15] += 10  # add outliers
>>> y[-5:] -= 7

```
Copy to clipboard
Compute the slope and intercept. For comparison, also compute the least-squares fit with [`linregress`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html#scipy.stats.linregress "scipy.stats.linregress"):
```
>>> res = stats.siegelslopes(y, x)
>>> lsq_res = stats.linregress(x, y)

```
Copy to clipboard
Plot the results. The Siegel regression line is shown in red. The green line shows the least-squares fit for comparison.
```
>>> fig = plt.figure()
>>> ax = fig.add_subplot(111)
>>> ax.plot(x, y, 'b.')
>>> ax.plot(x, res[1] + res[0] * x, 'r-')
>>> ax.plot(x, lsq_res[1] + lsq_res[0] * x, 'g-')
>>> plt.show()

```
Copy to clipboard
![../../_images/scipy-stats-siegelslopes-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-siegelslopes-1.png)
Go BackOpen In Tab
[ previous somersd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.somersd.html "previous page") [ next theilslopes ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html "next page")
On this page 
  * [`siegelslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#scipy.stats.siegelslopes)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
