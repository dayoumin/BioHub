---
title: scipy.stats.linregress
description: 단순 선형 회귀
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.linregress

**Description**: 단순 선형 회귀

**Original Documentation**: [scipy.stats.linregress](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html)

---


  * linregress


scipy.stats.

# linregress[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html#linregress "Link to this heading") 

scipy.stats.linregress(_x_ , _y_ , _alternative ='two-sided'_, _*_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L10658-L10833)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html#scipy.stats.linregress "Link to this definition") 
    
Calculate a linear least-squares regression for two sets of measurements. 

Parameters: 
     

**x, y** array_like 
    
Two sets of measurements. Both arrays should have the same length N. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. Default is ‘two-sided’. The following options are available:
  * ‘two-sided’: the slope of the regression line is nonzero
  * ‘less’: the slope of the regression line is less than zero
  * ‘greater’: the slope of the regression line is greater than zero


Added in version 1.7.0. 

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
     

**result**`LinregressResult` instance 
    
The return value is an object with the following attributes: 

slopefloat 
    
Slope of the regression line. 

interceptfloat 
    
Intercept of the regression line. 

rvaluefloat 
    
The Pearson correlation coefficient. The square of `rvalue` is equal to the coefficient of determination. 

pvaluefloat 
    
The p-value for a hypothesis test whose null hypothesis is that the slope is zero, using Wald Test with t-distribution of the test statistic. See _alternative_ above for alternative hypotheses. 

stderrfloat 
    
Standard error of the estimated slope (gradient), under the assumption of residual normality. 

intercept_stderrfloat 
    
Standard error of the estimated intercept, under the assumption of residual normality.
See also 

[`scipy.optimize.curve_fit`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.curve_fit.html#scipy.optimize.curve_fit "scipy.optimize.curve_fit")
    
Use non-linear least squares to fit a function to data. 

[`scipy.optimize.leastsq`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.leastsq.html#scipy.optimize.leastsq "scipy.optimize.leastsq")
    
Minimize the sum of squares of a set of equations.
Notes
For compatibility with older versions of SciPy, the return value acts like a `namedtuple` of length 5, with fields `slope`, `intercept`, `rvalue`, `pvalue` and `stderr`, so one can continue to write:
```
slope, intercept, r, p, se = linregress(x, y)

```
Copy to clipboard
With that style, however, the standard error of the intercept is not available. To have access to all the computed values, including the standard error of the intercept, use the return value as an object with attributes, e.g.:
```
result = linregress(x, y)
print(result.intercept, result.intercept_stderr)

```
Copy to clipboard
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> importmatplotlib.pyplotasplt
>>> fromscipyimport stats
>>> rng = np.random.default_rng()

```
Copy to clipboard
Generate some data:
```
>>> x = rng.random(10)
>>> y = 1.6*x + rng.random(10)

```
Copy to clipboard
Perform the linear regression:
```
>>> res = stats.linregress(x, y)

```
Copy to clipboard
Coefficient of determination (R-squared):
```
>>> print(f"R-squared: {res.rvalue**2:.6f}")
R-squared: 0.717533

```
Copy to clipboard
Plot the data along with the fitted line:
```
>>> plt.plot(x, y, 'o', label='original data')
>>> plt.plot(x, res.intercept + res.slope*x, 'r', label='fitted line')
>>> plt.legend()
>>> plt.show()

```
Copy to clipboard
![../../_images/scipy-stats-linregress-1_00_00.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-linregress-1_00_00.png)
Calculate 95% confidence interval on slope and intercept:
```
>>> # Two-sided inverse Students t-distribution
>>> # p - probability, df - degrees of freedom
>>> fromscipy.statsimport t
>>> tinv = lambda p, df: abs(t.ppf(p/2, df))

```
Copy to clipboard
```
>>> ts = tinv(0.05, len(x)-2)
>>> print(f"slope (95%): {res.slope:.6f} +/- {ts*res.stderr:.6f}")
slope (95%): 1.453392 +/- 0.743465
>>> print(f"intercept (95%): {res.intercept:.6f}"
...       f" +/- {ts*res.intercept_stderr:.6f}")
intercept (95%): 0.616950 +/- 0.544475

```
Copy to clipboard
Go BackOpen In Tab
[ previous wilcoxon ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html "previous page") [ next pearsonr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html "next page")
On this page 
  * [`linregress`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html#scipy.stats.linregress)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
