---
title: scipy.stats.norm
description: 정규분포 (cdf, ppf 등)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.norm

**Description**: 정규분포 (cdf, ppf 등)

**Original Documentation**: [scipy.stats.norm](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html)

---


  * scipy.stats.norm

# scipy.stats.norm[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html#scipy-stats-norm "Link to this heading") 

scipy.stats.norm _= <scipy.stats._continuous_distns.norm_gen object>_[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_continuous_distns.py#L393-L502)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html#scipy.stats.norm "Link to this definition") 
    
A normal continuous random variable.
The location (`loc`) keyword specifies the mean. The scale (`scale`) keyword specifies the standard deviation.
As an instance of the [`rv_continuous`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.html#scipy.stats.rv_continuous "scipy.stats.rv_continuous") class, [`norm`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html#scipy.stats.norm "scipy.stats.norm") object inherits from it a collection of generic methods (see below for the full list), and completes them with details specific for this particular distribution.
Methods
**rvs(loc=0, scale=1, size=1, random_state=None)** | Random variates.  
---|---  
**pdf(x, loc=0, scale=1)** | Probability density function.  
**logpdf(x, loc=0, scale=1)** | Log of the probability density function.  
**cdf(x, loc=0, scale=1)** | Cumulative distribution function.  
**logcdf(x, loc=0, scale=1)** | Log of the cumulative distribution function.  
**sf(x, loc=0, scale=1)** | Survival function (also defined as `1 - cdf`, but _sf_ is sometimes more accurate).  
**logsf(x, loc=0, scale=1)** | Log of the survival function.  
**ppf(q, loc=0, scale=1)** | Percent point function (inverse of `cdf` — percentiles).  
**isf(q, loc=0, scale=1)** | Inverse survival function (inverse of `sf`).  
**moment(order, loc=0, scale=1)** | Non-central moment of the specified order.  
**stats(loc=0, scale=1, moments=’mv’)** | Mean(‘m’), variance(‘v’), skew(‘s’), and/or kurtosis(‘k’).  
**entropy(loc=0, scale=1)** | (Differential) entropy of the RV.  
**fit(data)** | Parameter estimates for generic data. See [scipy.stats.rv_continuous.fit](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rv_continuous.fit.html#scipy.stats.rv_continuous.fit) for detailed documentation of the keyword arguments.  
**expect(func, args=(), loc=0, scale=1, lb=None, ub=None, conditional=False, **kwds)** | Expected value of a function (of one argument) with respect to the distribution.  
**median(loc=0, scale=1)** | Median of the distribution.  
**mean(loc=0, scale=1)** | Mean of the distribution.  
**var(loc=0, scale=1)** | Variance of the distribution.  
**std(loc=0, scale=1)** | Standard deviation of the distribution.  
**interval(confidence, loc=0, scale=1)** | Confidence interval with equal areas around the median.  
Notes
The probability density function for [`norm`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html#scipy.stats.norm "scipy.stats.norm") is:
\\[f(x) = \frac{\exp(-x^2/2)}{\sqrt{2\pi}}\\]
for a real number \\(x\\).
The probability density above is defined in the “standardized” form. To shift and/or scale the distribution use the `loc` and `scale` parameters. Specifically, `norm.pdf(x, loc, scale)` is identically equivalent to `norm.pdf(y) / scale` with `y = (x - loc) / scale`. Note that shifting the location of a distribution does not make it a “noncentral” distribution; noncentral generalizations of some distributions are available in separate classes.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipy.statsimport norm
>>> importmatplotlib.pyplotasplt
>>> fig, ax = plt.subplots(1, 1)

```
Copy to clipboard
Get the support:
```
>>> lb, ub = norm.support()

```
Copy to clipboard
Calculate the first four moments:
```
>>> mean, var, skew, kurt = norm.stats(moments='mvsk')

```
Copy to clipboard
Display the probability density function (`pdf`):
```
>>> x = np.linspace(norm.ppf(0.01),
...                 norm.ppf(0.99), 100)
>>> ax.plot(x, norm.pdf(x),
...        'r-', lw=5, alpha=0.6, label='norm pdf')

```
Copy to clipboard
Alternatively, the distribution object can be called (as a function) to fix the shape, location and scale parameters. This returns a “frozen” RV object holding the given parameters fixed.
Freeze the distribution and display the frozen `pdf`:
```
>>> rv = norm()
>>> ax.plot(x, rv.pdf(x), 'k-', lw=2, label='frozen pdf')

```
Copy to clipboard
Check accuracy of `cdf` and `ppf`:
```
>>> vals = norm.ppf([0.001, 0.5, 0.999])
>>> np.allclose([0.001, 0.5, 0.999], norm.cdf(vals))
True

```
Copy to clipboard
Generate random numbers:
```
>>> r = norm.rvs(size=1000)

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
![../../_images/scipy-stats-norm-1.png](https://docs.scipy.org/doc/scipy/_images/scipy-stats-norm-1.png)
Go BackOpen In Tab
[ previous scipy.stats.nct ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.nct.html "previous page") [ next scipy.stats.norminvgauss ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norminvgauss.html "next page")
On this page 
  * [`norm`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.norm.html#scipy.stats.norm)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
