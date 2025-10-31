---
title: scipy.stats.chi2
description: 카이제곱 분포 (ppf 등)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.chi2

**Description**: 카이제곱 분포 (ppf 등)

**Original Documentation**: [scipy.stats.chi2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html)

---


  * scipy.stats.chi2

# scipy.stats.chi2[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy-stats-chi2 "Link to this heading") 

scipy.stats.chi2 _= <scipy.stats._continuous_distns.chi2_gen object>_[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_continuous_distns.py#L1598-L1683)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2 "Link to this definition") 
    
A chi-squared continuous random variable.
For the noncentral chi-square distribution, see [`ncx2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncx2.html#scipy.stats.ncx2 "scipy.stats.ncx2").
As an instance of the [`rv_continuous`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.html#scipy.stats.rv_continuous "scipy.stats.rv_continuous") class, [`chi2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2 "scipy.stats.chi2") object inherits from it a collection of generic methods (see below for the full list), and completes them with details specific for this particular distribution.
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

[`ncx2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ncx2.html#scipy.stats.ncx2 "scipy.stats.ncx2")

Notes
The probability density function for [`chi2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2 "scipy.stats.chi2") is:
\\[f(x, k) = \frac{1}{2^{k/2} \Gamma \left( k/2 \right)} x^{k/2-1} \exp \left( -x/2 \right)\\]
for \\(x > 0\\) and \\(k > 0\\) (degrees of freedom, denoted `df` in the implementation).
[`chi2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2 "scipy.stats.chi2") takes `df` as a shape parameter.
The chi-squared distribution is a special case of the gamma distribution, with gamma parameters `a = df/2`, `loc = 0` and `scale = 2`.
The probability density above is defined in the “standardized” form. To shift and/or scale the distribution use the `loc` and `scale` parameters. Specifically, `chi2.pdf(x, df, loc, scale)` is identically equivalent to `chi2.pdf(y, df) / scale` with `y = (x - loc) / scale`. Note that shifting the location of a distribution does not make it a “noncentral” distribution; noncentral generalizations of some distributions are available in separate classes.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport chi2
>>> importmatplotlib.pyplotasplt
>>> fig, ax = plt.subplots(1, 1)

```
Copy to clipboard
Get the support:
```
>>> df = 55
>>> lb, ub = chi2.support(df)

```
Copy to clipboard
Calculate the first four moments:
```
>>> mean, var, skew, kurt = chi2.stats(df, moments='mvsk')

```
Copy to clipboard
Display the probability density function (`pdf`):
```
>>> x = np.linspace(chi2.ppf(0.01, df),
...                 chi2.ppf(0.99, df), 100)
>>> ax.plot(x, chi2.pdf(x, df),
...        'r-', lw=5, alpha=0.6, label='chi2 pdf')

```
Copy to clipboard
Alternatively, the distribution object can be called (as a function) to fix the shape, location and scale parameters. This returns a “frozen” RV object holding the given parameters fixed.
Freeze the distribution and display the frozen `pdf`:
```
>>> rv = chi2(df)
>>> ax.plot(x, rv.pdf(x), 'k-', lw=2, label='frozen pdf')

```
Copy to clipboard
Check accuracy of `cdf` and `ppf`:
```
>>> vals = chi2.ppf([0.001, 0.5, 0.999], df)
>>> np.allclose([0.001, 0.5, 0.999], chi2.cdf(vals, df))
True

```
Copy to clipboard
Generate random numbers:
```
>>> r = chi2.rvs(df, size=1000)

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
![../../_images/scipy-stats-chi2-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-chi2-1.png)
Go BackOpen In Tab
[ previous scipy.stats.chi ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi.html "previous page") [ next scipy.stats.cosine ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.cosine.html "next page")
On this page 
  * [`chi2`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2.html#scipy.stats.chi2)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
