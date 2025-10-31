---
title: scipy.stats.t
description: t-분포 (ppf 등)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.t

**Description**: t-분포 (ppf 등)

**Original Documentation**: [scipy.stats.t](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html)

---


  * scipy.stats.t

# scipy.stats.t[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html#scipy-stats-t "Link to this heading") 

scipy.stats.t _= <scipy.stats._continuous_distns.t_gen object>_[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_continuous_distns.py#L7966-L8077)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html#scipy.stats.t "Link to this definition") 
    
A Student’s t continuous random variable.
For the noncentral t distribution, see [`nct`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html#scipy.stats.nct "scipy.stats.nct").
As an instance of the [`rv_continuous`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.html#scipy.stats.rv_continuous "scipy.stats.rv_continuous") class, [`t`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html#scipy.stats.t "scipy.stats.t") object inherits from it a collection of generic methods (see below for the full list), and completes them with details specific for this particular distribution.
Methods
**rvs(df, loc=0, scale=1, size=1, random_state=None)** | Random variates.  
---|---  
**pdf(x, df, loc=0, scale=1)** | Probability density function.  
**logpdf(x, df, loc=0, scale=1)** | Log of the probability density function.  
**cdf(x, df, loc=0, scale=1)** | Cumulative distribution function.  
**logcdf(x, df, loc=0, scale=1)** | Log of the cumulative distribution function.  
**sf(x, df, loc=0, scale=1)** | Survival function (also defined as `1 - cdf`, but _sf_ is sometimes more accurate).  
**logsf(x, df, loc=0, scale=1)** | Log of the survival function.  
**ppf(q, df, loc=0, scale=1)** | Percent point function (inverse of `cdf` — percentiles).  
**isf(q, df, loc=0, scale=1)** | Inverse survival function (inverse of `sf`).  
**moment(order, df, loc=0, scale=1)** | Non-central moment of the specified order.  
**stats(df, loc=0, scale=1, moments=’mv’)** | Mean(‘m’), variance(‘v’), skew(‘s’), and/or kurtosis(‘k’).  
**entropy(df, loc=0, scale=1)** | (Differential) entropy of the RV.  
**fit(data)** | Parameter estimates for generic data. See [scipy.stats.rv_continuous.fit](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.fit.html#scipy.stats.rv_continuous.fit) for detailed documentation of the keyword arguments.  
**expect(func, args=(df,), loc=0, scale=1, lb=None, ub=None, conditional=False, **kwds)** | Expected value of a function (of one argument) with respect to the distribution.  
**median(df, loc=0, scale=1)** | Median of the distribution.  
**mean(df, loc=0, scale=1)** | Mean of the distribution.  
**var(df, loc=0, scale=1)** | Variance of the distribution.  
**std(df, loc=0, scale=1)** | Standard deviation of the distribution.  
**interval(confidence, df, loc=0, scale=1)** | Confidence interval with equal areas around the median.  
See also 

[`nct`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html#scipy.stats.nct "scipy.stats.nct")

Notes
The probability density function for [`t`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html#scipy.stats.t "scipy.stats.t") is:
\\[f(x, \nu) = \frac{\Gamma((\nu+1)/2)} {\sqrt{\pi \nu} \Gamma(\nu/2)} (1+x^2/\nu)^{-(\nu+1)/2}\\]
where \\(x\\) is a real number and the degrees of freedom parameter \\(\nu\\) (denoted `df` in the implementation) satisfies \\(\nu > 0\\). \\(\Gamma\\) is the gamma function ([`scipy.special.gamma`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.special.gamma.html#scipy.special.gamma "scipy.special.gamma")).
The probability density above is defined in the “standardized” form. To shift and/or scale the distribution use the `loc` and `scale` parameters. Specifically, `t.pdf(x, df, loc, scale)` is identically equivalent to `t.pdf(y, df) / scale` with `y = (x - loc) / scale`. Note that shifting the location of a distribution does not make it a “noncentral” distribution; noncentral generalizations of some distributions are available in separate classes.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport t
>>> importmatplotlib.pyplotasplt
>>> fig, ax = plt.subplots(1, 1)

```
Copy to clipboard
Get the support:
```
>>> df = 2.74
>>> lb, ub = t.support(df)

```
Copy to clipboard
Calculate the first four moments:
```
>>> mean, var, skew, kurt = t.stats(df, moments='mvsk')

```
Copy to clipboard
Display the probability density function (`pdf`):
```
>>> x = np.linspace(t.ppf(0.01, df),
...                 t.ppf(0.99, df), 100)
>>> ax.plot(x, t.pdf(x, df),
...        'r-', lw=5, alpha=0.6, label='t pdf')

```
Copy to clipboard
Alternatively, the distribution object can be called (as a function) to fix the shape, location and scale parameters. This returns a “frozen” RV object holding the given parameters fixed.
Freeze the distribution and display the frozen `pdf`:
```
>>> rv = t(df)
>>> ax.plot(x, rv.pdf(x), 'k-', lw=2, label='frozen pdf')

```
Copy to clipboard
Check accuracy of `cdf` and `ppf`:
```
>>> vals = t.ppf([0.001, 0.5, 0.999], df)
>>> np.allclose([0.001, 0.5, 0.999], t.cdf(vals, df))
True

```
Copy to clipboard
Generate random numbers:
```
>>> r = t.rvs(df, size=1000)

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
![../../_images/scipy-stats-t-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-t-1.png)
Go BackOpen In Tab
[ previous scipy.stats.studentized_range ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.studentized_range.html "previous page") [ next scipy.stats.trapezoid ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trapezoid.html "next page")
On this page 
  * [`t`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html#scipy.stats.t)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
