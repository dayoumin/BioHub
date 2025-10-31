---
title: scipy.stats.f
description: F-분포 (ppf 등)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.f

**Description**: F-분포 (ppf 등)

**Original Documentation**: [scipy.stats.f](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html)

---


  * scipy.stats.f

# scipy.stats.f[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy-stats-f "Link to this heading") 

scipy.stats.f _= <scipy.stats._continuous_distns.f_gen object>_[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_continuous_distns.py#L2514-L2621)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy.stats.f "Link to this definition") 
    
An F continuous random variable.
For the noncentral F distribution, see [`ncf`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncf.html#scipy.stats.ncf "scipy.stats.ncf").
As an instance of the [`rv_continuous`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.html#scipy.stats.rv_continuous "scipy.stats.rv_continuous") class, [`f`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy.stats.f "scipy.stats.f") object inherits from it a collection of generic methods (see below for the full list), and completes them with details specific for this particular distribution.
Methods
**rvs(dfn, dfd, loc=0, scale=1, size=1, random_state=None)** | Random variates.  
---|---  
**pdf(x, dfn, dfd, loc=0, scale=1)** | Probability density function.  
**logpdf(x, dfn, dfd, loc=0, scale=1)** | Log of the probability density function.  
**cdf(x, dfn, dfd, loc=0, scale=1)** | Cumulative distribution function.  
**logcdf(x, dfn, dfd, loc=0, scale=1)** | Log of the cumulative distribution function.  
**sf(x, dfn, dfd, loc=0, scale=1)** | Survival function (also defined as `1 - cdf`, but _sf_ is sometimes more accurate).  
**logsf(x, dfn, dfd, loc=0, scale=1)** | Log of the survival function.  
**ppf(q, dfn, dfd, loc=0, scale=1)** | Percent point function (inverse of `cdf` — percentiles).  
**isf(q, dfn, dfd, loc=0, scale=1)** | Inverse survival function (inverse of `sf`).  
**moment(order, dfn, dfd, loc=0, scale=1)** | Non-central moment of the specified order.  
**stats(dfn, dfd, loc=0, scale=1, moments=’mv’)** | Mean(‘m’), variance(‘v’), skew(‘s’), and/or kurtosis(‘k’).  
**entropy(dfn, dfd, loc=0, scale=1)** | (Differential) entropy of the RV.  
**fit(data)** | Parameter estimates for generic data. See [scipy.stats.rv_continuous.fit](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.fit.html#scipy.stats.rv_continuous.fit) for detailed documentation of the keyword arguments.  
**expect(func, args=(dfn, dfd), loc=0, scale=1, lb=None, ub=None, conditional=False, **kwds)** | Expected value of a function (of one argument) with respect to the distribution.  
**median(dfn, dfd, loc=0, scale=1)** | Median of the distribution.  
**mean(dfn, dfd, loc=0, scale=1)** | Mean of the distribution.  
**var(dfn, dfd, loc=0, scale=1)** | Variance of the distribution.  
**std(dfn, dfd, loc=0, scale=1)** | Standard deviation of the distribution.  
**interval(confidence, dfn, dfd, loc=0, scale=1)** | Confidence interval with equal areas around the median.  
See also 

[`ncf`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncf.html#scipy.stats.ncf "scipy.stats.ncf")

Notes
The F distribution with \\(df_1 > 0\\) and \\(df_2 > 0\\) degrees of freedom is the distribution of the ratio of two independent chi-squared distributions with \\(df_1\\) and \\(df_2\\) degrees of freedom, after rescaling by \\(df_2 / df_1\\).
The probability density function for [`f`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy.stats.f "scipy.stats.f") is:
\\[f(x, df_1, df_2) = \frac{df_2^{df_2/2} df_1^{df_1/2} x^{df_1 / 2-1}} {(df_2+df_1 x)^{(df_1+df_2)/2} B(df_1/2, df_2/2)}\\]
for \\(x > 0\\).
[`f`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy.stats.f "scipy.stats.f") accepts shape parameters `dfn` and `dfd` for \\(df_1\\), the degrees of freedom of the chi-squared distribution in the numerator, and \\(df_2\\), the degrees of freedom of the chi-squared distribution in the denominator, respectively.
The probability density above is defined in the “standardized” form. To shift and/or scale the distribution use the `loc` and `scale` parameters. Specifically, `f.pdf(x, dfn, dfd, loc, scale)` is identically equivalent to `f.pdf(y, dfn, dfd) / scale` with `y = (x - loc) / scale`. Note that shifting the location of a distribution does not make it a “noncentral” distribution; noncentral generalizations of some distributions are available in separate classes.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport f
>>> importmatplotlib.pyplotasplt
>>> fig, ax = plt.subplots(1, 1)

```
Copy to clipboard
Get the support:
```
>>> dfn, dfd = 29, 18
>>> lb, ub = f.support(dfn, dfd)

```
Copy to clipboard
Calculate the first four moments:
```
>>> mean, var, skew, kurt = f.stats(dfn, dfd, moments='mvsk')

```
Copy to clipboard
Display the probability density function (`pdf`):
```
>>> x = np.linspace(f.ppf(0.01, dfn, dfd),
...                 f.ppf(0.99, dfn, dfd), 100)
>>> ax.plot(x, f.pdf(x, dfn, dfd),
...        'r-', lw=5, alpha=0.6, label='f pdf')

```
Copy to clipboard
Alternatively, the distribution object can be called (as a function) to fix the shape, location and scale parameters. This returns a “frozen” RV object holding the given parameters fixed.
Freeze the distribution and display the frozen `pdf`:
```
>>> rv = f(dfn, dfd)
>>> ax.plot(x, rv.pdf(x), 'k-', lw=2, label='frozen pdf')

```
Copy to clipboard
Check accuracy of `cdf` and `ppf`:
```
>>> vals = f.ppf([0.001, 0.5, 0.999], dfn, dfd)
>>> np.allclose([0.001, 0.5, 0.999], f.cdf(vals, dfn, dfd))
True

```
Copy to clipboard
Generate random numbers:
```
>>> r = f.rvs(dfn, dfd, size=1000)

```
Copy to clipboard
And compare the histogram:
```
>>> ax.hist(r, density=True, bins='auto', histtype='stepfilled', alpha=0.2)
>>> ax.set_xlim([x[0], x[-1]])
>>> ax.legend(loc='best', frameon=False)
>>> plt.show()

```
Copy to clipboard
![../../_images/scipy-stats-f-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-f-1.png)
Go BackOpen In Tab
[ previous scipy.stats.exponpow ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.exponpow.html "previous page") [ next scipy.stats.fatiguelife ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fatiguelife.html "next page")
On this page 
  * [`f`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f.html#scipy.stats.f)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
