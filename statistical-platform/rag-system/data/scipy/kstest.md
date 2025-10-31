---
title: scipy.stats.kstest
description: Kolmogorov-Smirnov 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.kstest

**Description**: Kolmogorov-Smirnov 검정

**Original Documentation**: [scipy.stats.kstest](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html)

---


  * kstest


scipy.stats.

# kstest[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html#kstest "Link to this heading") 

scipy.stats.kstest(_rvs_ , _cdf_ , _args =()_, _N =20_, _alternative ='two-sided'_, _method ='auto'_, _*_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L8268-L8461)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html#scipy.stats.kstest "Link to this definition") 
    
Performs the (one-sample or two-sample) Kolmogorov-Smirnov test for goodness of fit.
The one-sample test compares the underlying distribution F(x) of a sample against a given distribution G(x). The two-sample test compares the underlying distributions of two independent samples. Both tests are valid only for continuous distributions. 

Parameters: 
     

**rvs** str, array_like, or callable 
    
If an array, it should be a 1-D array of observations of random variables. If a callable, it should be a function to generate random variables; it is required to have a keyword argument _size_. If a string, it should be the name of a distribution in [`scipy.stats`](https://docs.scipy.org/doc/scipy/reference/stats.html#module-scipy.stats "scipy.stats"), which will be used to generate random variables. 

**cdf** str, array_like or callable 
    
If array_like, it should be a 1-D array of observations of random variables, and the two-sample test is performed (and rvs must be array_like). If a callable, that callable is used to calculate the cdf. If a string, it should be the name of a distribution in [`scipy.stats`](https://docs.scipy.org/doc/scipy/reference/stats.html#module-scipy.stats "scipy.stats"), which will be used as the cdf function. 

**args** tuple, sequence, optional 
    
Distribution parameters, used if _rvs_ or _cdf_ are strings or callables. 

**N** int, optional 
    
Sample size if _rvs_ is string or callable. Default is 20. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the null and alternative hypotheses. Default is ‘two-sided’. Please see explanations in the Notes below. 

**method**{‘auto’, ‘exact’, ‘approx’, ‘asymp’}, optional 
    
Defines the distribution used for calculating the p-value. The following options are available (default is ‘auto’):
>   * ‘auto’ : selects one of the other options.
>   * ‘exact’ : uses the exact distribution of test statistic.
>   * ‘approx’ : approximates the two-sided probability with twice the one-sided probability
>   * ‘asymp’: uses asymptotic distribution of test statistic
> 


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
     

res: KstestResult
    
An object containing attributes: 

statisticfloat 
    
KS test statistic, either D+, D-, or D (the maximum of the two) 

pvaluefloat 
    
One-tailed or two-tailed p-value. 

statistic_locationfloat 
    
In a one-sample test, this is the value of _rvs_ corresponding with the KS statistic; i.e., the distance between the empirical distribution function and the hypothesized cumulative distribution function is measured at this observation.
In a two-sample test, this is the value from _rvs_ or _cdf_ corresponding with the KS statistic; i.e., the distance between the empirical distribution functions is measured at this observation. 

statistic_signint 
    
In a one-sample test, this is +1 if the KS statistic is the maximum positive difference between the empirical distribution function and the hypothesized cumulative distribution function (D+); it is -1 if the KS statistic is the maximum negative difference (D-).
In a two-sample test, this is +1 if the empirical distribution function of _rvs_ exceeds the empirical distribution function of _cdf_ at _statistic_location_ , otherwise -1.
See also 

[`ks_1samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_1samp.html#scipy.stats.ks_1samp "scipy.stats.ks_1samp"), [`ks_2samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html#scipy.stats.ks_2samp "scipy.stats.ks_2samp") 

Notes
There are three options for the null and corresponding alternative hypothesis that can be selected using the _alternative_ parameter.
  * _two-sided_ : The null hypothesis is that the two distributions are identical, F(x)=G(x) for all x; the alternative is that they are not identical.
  * _less_ : The null hypothesis is that F(x) >= G(x) for all x; the alternative is that F(x) < G(x) for at least one x.
  * _greater_ : The null hypothesis is that F(x) <= G(x) for all x; the alternative is that F(x) > G(x) for at least one x.


Note that the alternative hypotheses describe the _CDFs_ of the underlying distributions, not the observed values. For example, suppose x1 ~ F and x2 ~ G. If F(x) > G(x) for all x, the values in x1 tend to be less than those in x2.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
Examples
Try it in your browser!
Suppose we wish to test the null hypothesis that a sample is distributed according to the standard normal. We choose a confidence level of 95%; that is, we will reject the null hypothesis in favor of the alternative if the p-value is less than 0.05.
When testing uniformly distributed data, we would expect the null hypothesis to be rejected.
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> rng = np.random.default_rng()
>>> stats.kstest(stats.uniform.rvs(size=100, random_state=rng),
...              stats.norm.cdf)
KstestResult(statistic=0.5001899973268688,
             pvalue=1.1616392184763533e-23,
             statistic_location=0.00047625268963724654,
             statistic_sign=-1)

```
Copy to clipboard
Indeed, the p-value is lower than our threshold of 0.05, so we reject the null hypothesis in favor of the default “two-sided” alternative: the data are _not_ distributed according to the standard normal.
When testing random variates from the standard normal distribution, we expect the data to be consistent with the null hypothesis most of the time.
```
>>> x = stats.norm.rvs(size=100, random_state=rng)
>>> stats.kstest(x, stats.norm.cdf)
KstestResult(statistic=0.05345882212970396,
             pvalue=0.9227159037744717,
             statistic_location=-1.2451343873745018,
             statistic_sign=1)

```
Copy to clipboard
As expected, the p-value of 0.92 is not below our threshold of 0.05, so we cannot reject the null hypothesis.
Suppose, however, that the random variates are distributed according to a normal distribution that is shifted toward greater values. In this case, the cumulative density function (CDF) of the underlying distribution tends to be _less_ than the CDF of the standard normal. Therefore, we would expect the null hypothesis to be rejected with `alternative='less'`:
```
>>> x = stats.norm.rvs(size=100, loc=0.5, random_state=rng)
>>> stats.kstest(x, stats.norm.cdf, alternative='less')
KstestResult(statistic=0.17482387821055168,
             pvalue=0.001913921057766743,
             statistic_location=0.3713830565352756,
             statistic_sign=-1)

```
Copy to clipboard
and indeed, with p-value smaller than our threshold, we reject the null hypothesis in favor of the alternative.
For convenience, the previous test can be performed using the name of the distribution as the second argument.
```
>>> stats.kstest(x, "norm", alternative='less')
KstestResult(statistic=0.17482387821055168,
             pvalue=0.001913921057766743,
             statistic_location=0.3713830565352756,
             statistic_sign=-1)

```
Copy to clipboard
The examples above have all been one-sample tests identical to those performed by [`ks_1samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_1samp.html#scipy.stats.ks_1samp "scipy.stats.ks_1samp"). Note that [`kstest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html#scipy.stats.kstest "scipy.stats.kstest") can also perform two-sample tests identical to those performed by [`ks_2samp`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html#scipy.stats.ks_2samp "scipy.stats.ks_2samp"). For example, when two samples are drawn from the same distribution, we expect the data to be consistent with the null hypothesis most of the time.
```
>>> sample1 = stats.laplace.rvs(size=105, random_state=rng)
>>> sample2 = stats.laplace.rvs(size=95, random_state=rng)
>>> stats.kstest(sample1, sample2)
KstestResult(statistic=0.11779448621553884,
             pvalue=0.4494256912629795,
             statistic_location=0.6138814275424155,
             statistic_sign=1)

```
Copy to clipboard
As expected, the p-value of 0.45 is not below our threshold of 0.05, so we cannot reject the null hypothesis.
Go BackOpen In Tab
[ previous ks_2samp ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ks_2samp.html "previous page") [ next f_oneway ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.f_oneway.html "next page")
On this page 
  * [`kstest`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kstest.html#scipy.stats.kstest)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
