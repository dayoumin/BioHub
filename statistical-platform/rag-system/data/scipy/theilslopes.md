---
title: scipy.stats.theilslopes
description: Theil-Sen 회귀
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.theilslopes

**Description**: Theil-Sen 회귀

**Original Documentation**: [scipy.stats.theilslopes](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html)

---


  * theilslopes


scipy.stats.

# theilslopes[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#theilslopes "Link to this heading") 

scipy.stats.theilslopes(_y_ , _x =None_, _alpha =0.95_, _method ='separate'_, _*_ , _axis =None_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_mstats_common.py#L22-L184)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes "Link to this definition") 
    
Computes the Theil-Sen estimator for a set of points (x, y).
[`theilslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes "scipy.stats.theilslopes") implements a method for robust linear regression. It computes the slope as the median of all slopes between paired values. 

Parameters: 
     

**y** array_like 
    
Dependent variable. 

**x** array_like or None, optional 
    
Independent variable. If None, use `arange(len(y))` instead. 

**alpha** float, optional 
    
Confidence degree between 0 and 1. Default is 95% confidence. Note that [`alpha`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.alpha.html#scipy.stats.alpha "scipy.stats.alpha") is symmetric around 0.5, i.e. both 0.1 and 0.9 are interpreted as “find the 90% confidence interval”. 

**method**{‘joint’, ‘separate’}, optional 
    
Method to be used for computing estimate for intercept. Following methods are supported,
>   * ‘joint’: Uses np.median(y - slope * x) as intercept.
>   * 

‘separate’: Uses np.median(y) - slope * np.median(x)
    
> as intercept.
> 

The default is ‘separate’.
Added in version 1.8.0. 

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
     

**result**`TheilslopesResult` instance 
    
The return value is an object with the following attributes: 

slopefloat 
    
Theil slope. 

interceptfloat 
    
Intercept of the Theil line. 

low_slopefloat 
    
Lower bound of the confidence interval on _slope_. 

high_slopefloat 
    
Upper bound of the confidence interval on _slope_.
See also 

[`siegelslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html#scipy.stats.siegelslopes "scipy.stats.siegelslopes")
    
a similar technique using repeated medians
Notes
The implementation of [`theilslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes "scipy.stats.theilslopes") follows [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#r907add447232-1). The intercept is not defined in [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#r907add447232-1), and here it is defined as `median(y) - slope*median(x)`, which is given in [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#r907add447232-3). Other definitions of the intercept exist in the literature such as `median(y - slope*x)` in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#r907add447232-4). The approach to compute the intercept can be determined by the parameter `method`. A confidence interval for the intercept is not given as this question is not addressed in [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#r907add447232-1).
For compatibility with older versions of SciPy, the return value acts like a `namedtuple` of length 4, with fields `slope`, `intercept`, `low_slope`, and `high_slope`, so one can continue to write:
```
slope, intercept, low_slope, high_slope = theilslopes(y, x)

```
Copy to clipboard
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#id2),[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#id5))
P.K. Sen, “Estimates of the regression coefficient based on Kendall’s tau”, J. Am. Stat. Assoc., Vol. 63, pp. 1379-1389, 1968.
[2]
H. Theil, “A rank-invariant method of linear and polynomial regression analysis I, II and III”, Nederl. Akad. Wetensch., Proc. 53:, pp. 386-392, pp. 521-525, pp. 1397-1412, 1950.
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#id3)]
W.L. Conover, “Practical nonparametric statistics”, 2nd ed., John Wiley and Sons, New York, pp. 493.
[[4](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#id4)]
<https://en.wikipedia.org/wiki/Theil%E2%80%93Sen_estimator>
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
Compute the slope, intercept and 90% confidence interval. For comparison, also compute the least-squares fit with [`linregress`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html#scipy.stats.linregress "scipy.stats.linregress"):
```
>>> res = stats.theilslopes(y, x, 0.90, method='separate')
>>> lsq_res = stats.linregress(x, y)

```
Copy to clipboard
Plot the results. The Theil-Sen regression line is shown in red, with the dashed red lines illustrating the confidence interval of the slope (note that the dashed red lines are not the confidence interval of the regression as the confidence interval of the intercept is not included). The green line shows the least-squares fit for comparison.
```
>>> fig = plt.figure()
>>> ax = fig.add_subplot(111)
>>> ax.plot(x, y, 'b.')
>>> ax.plot(x, res[1] + res[0] * x, 'r-')
>>> ax.plot(x, res[1] + res[2] * x, 'r--')
>>> ax.plot(x, res[1] + res[3] * x, 'r--')
>>> ax.plot(x, lsq_res[1] + lsq_res[0] * x, 'g-')
>>> plt.show()

```
Copy to clipboard
![../../_images/scipy-stats-theilslopes-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-theilslopes-1.png)
Go BackOpen In Tab
[ previous siegelslopes ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.siegelslopes.html "previous page") [ next page_trend_test ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.page_trend_test.html "next page")
On this page 
  * [`theilslopes`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.theilslopes.html#scipy.stats.theilslopes)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
