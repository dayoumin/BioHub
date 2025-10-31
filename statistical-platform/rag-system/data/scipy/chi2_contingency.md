---
title: scipy.stats.chi2_contingency
description: 카이제곱 독립성 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.chi2_contingency

**Description**: 카이제곱 독립성 검정

**Original Documentation**: [scipy.stats.chi2_contingency](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
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
  * chi2_contingency


scipy.stats.
# chi2_contingency[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#chi2-contingency "Link to this heading") 

scipy.stats.chi2_contingency(_observed_ , _correction =True_, _lambda_ =None_, _*_ , _method =None_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/contingency.py#L145-L352)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#scipy.stats.chi2_contingency "Link to this definition") 
    
Chi-square test of independence of variables in a contingency table.
This function computes the chi-square statistic and p-value for the hypothesis test of independence of the observed frequencies in the contingency table [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#rf346382074c5-1) _observed_. The expected frequencies are computed based on the marginal sums under the assumption of independence; see [`scipy.stats.contingency.expected_freq`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.expected_freq.html#scipy.stats.contingency.expected_freq "scipy.stats.contingency.expected_freq"). The number of degrees of freedom is (expressed using numpy functions and attributes):
```
dof = observed.size - sum(observed.shape) + observed.ndim - 1

```
Copy to clipboard 

Parameters: 
     

**observed** array_like 
    
The contingency table. The table contains the observed frequencies (i.e. number of occurrences) in each category. In the two-dimensional case, the table is often described as an “R x C table”. 

**correction** bool, optional 
    
If True, _and_ the degrees of freedom is 1, apply Yates’ correction for continuity. The effect of the correction is to adjust each observed value by 0.5 towards the corresponding expected value. 

**lambda_** float or str, optional 
    
By default, the statistic computed in this test is Pearson’s chi-squared statistic [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#rf346382074c5-2). _lambda__ allows a statistic from the Cressie-Read power divergence family [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#rf346382074c5-3) to be used instead. See [`scipy.stats.power_divergence`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.power_divergence.html#scipy.stats.power_divergence "scipy.stats.power_divergence") for details. 

**method** ResamplingMethod, optional 
    
Defines the method used to compute the p-value. Compatible only with _correction=False_ , default _lambda__ , and two-way tables. If _method_ is an instance of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod")/[`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod"), the p-value is computed using [`scipy.stats.permutation_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html#scipy.stats.permutation_test "scipy.stats.permutation_test")/[`scipy.stats.monte_carlo_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.monte_carlo_test.html#scipy.stats.monte_carlo_test "scipy.stats.monte_carlo_test") with the provided configuration options and other appropriate settings. Otherwise, the p-value is computed as documented in the notes. Note that if _method_ is an instance of [`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod"), the `rvs` attribute must be left unspecified; Monte Carlo samples are always drawn using the `rvs` method of [`scipy.stats.random_table`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.random_table.html#scipy.stats.random_table "scipy.stats.random_table").
Added in version 1.15.0. 

Returns: 
     

**res** Chi2ContingencyResult 
    
An object containing attributes: 

statisticfloat 
    
The test statistic. 

pvaluefloat 
    
The p-value of the test. 

dofint 
    
The degrees of freedom. NaN if _method_ is not `None`. 

expected_freqndarray, same shape as _observed_ 
    
The expected frequencies, based on the marginal sums of the table.
See also 

[`scipy.stats.contingency.expected_freq`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.expected_freq.html#scipy.stats.contingency.expected_freq "scipy.stats.contingency.expected_freq")


[`scipy.stats.fisher_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#scipy.stats.fisher_exact "scipy.stats.fisher_exact")


[`scipy.stats.chisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html#scipy.stats.chisquare "scipy.stats.chisquare")


[`scipy.stats.power_divergence`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.power_divergence.html#scipy.stats.power_divergence "scipy.stats.power_divergence")


[`scipy.stats.barnard_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.barnard_exact.html#scipy.stats.barnard_exact "scipy.stats.barnard_exact")


[`scipy.stats.boschloo_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.boschloo_exact.html#scipy.stats.boschloo_exact "scipy.stats.boschloo_exact")


[Chi-square test of independence of variables in a contingency table](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_chi2_contingency.html#hypothesis-chi2-contingency)
    
Extended example
Notes
An often quoted guideline for the validity of this calculation is that the test should be used only if the observed and expected frequencies in each cell are at least 5.
This is a test for the independence of different categories of a population. The test is only meaningful when the dimension of _observed_ is two or more. Applying the test to a one-dimensional table will always result in _expected_ equal to _observed_ and a chi-square statistic equal to 0.
This function does not handle masked arrays, because the calculation does not make sense with missing values.
Like [`scipy.stats.chisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html#scipy.stats.chisquare "scipy.stats.chisquare"), this function computes a chi-square statistic; the convenience this function provides is to figure out the expected frequencies and degrees of freedom from the given contingency table. If these were already known, and if the Yates’ correction was not required, one could use [`scipy.stats.chisquare`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chisquare.html#scipy.stats.chisquare "scipy.stats.chisquare"). That is, if one calls:
```
res = chi2_contingency(obs, correction=False)

```
Copy to clipboard
then the following is true:
```
(res.statistic, res.pvalue) == stats.chisquare(obs.ravel(),
                                               f_exp=ex.ravel(),
                                               ddof=obs.size - 1 - dof)

```
Copy to clipboard
The _lambda__ argument was added in version 0.13.0 of scipy.
References
[[1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#id1)]
“Contingency table”, <https://en.wikipedia.org/wiki/Contingency_table>
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#id2)]
“Pearson’s chi-squared test”, <https://en.wikipedia.org/wiki/Pearson%27s_chi-squared_test>
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#id3)]
Cressie, N. and Read, T. R. C., “Multinomial Goodness-of-Fit Tests”, J. Royal Stat. Soc. Series B, Vol. 46, No. 3 (1984), pp. 440-464.
Examples
Try it in your browser!
A two-way example (2 x 3):
```
>>> importnumpyasnp
>>> fromscipy.statsimport chi2_contingency
>>> obs = np.array([[10, 10, 20], [20, 20, 20]])
>>> res = chi2_contingency(obs)
>>> res.statistic
2.7777777777777777
>>> res.pvalue
0.24935220877729619
>>> res.dof
2
>>> res.expected_freq
array([[ 12.,  12.,  16.],
       [ 18.,  18.,  24.]])

```
Copy to clipboard
Perform the test using the log-likelihood ratio (i.e. the “G-test”) instead of Pearson’s chi-squared statistic.
```
>>> res = chi2_contingency(obs, lambda_="log-likelihood")
>>> res.statistic
2.7688587616781319
>>> res.pvalue
0.25046668010954165

```
Copy to clipboard
A four-way example (2 x 2 x 2 x 2):
```
>>> obs = np.array(
...     [[[[12, 17],
...        [11, 16]],
...       [[11, 12],
...        [15, 16]]],
...      [[[23, 15],
...        [30, 22]],
...       [[14, 17],
...        [15, 16]]]])
>>> res = chi2_contingency(obs)
>>> res.statistic
8.7584514426741897
>>> res.pvalue
0.64417725029295503

```
Copy to clipboard
When the sum of the elements in a two-way table is small, the p-value produced by the default asymptotic approximation may be inaccurate. Consider passing a [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") or [`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod") as the _method_ parameter with _correction=False_.
```
>>> fromscipy.statsimport PermutationMethod
>>> obs = np.asarray([[12, 3],
...                   [17, 16]])
>>> res = chi2_contingency(obs, correction=False)
>>> ref = chi2_contingency(obs, correction=False, method=PermutationMethod())
>>> res.pvalue, ref.pvalue
(0.0614122539870913, 0.1074)  # may vary

```
Copy to clipboard
For a more detailed example, see [Chi-square test of independence of variables in a contingency table](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_chi2_contingency.html#hypothesis-chi2-contingency).
Go BackOpen In Tab
[ previous multiscale_graphcorr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.multiscale_graphcorr.html "previous page") [ next fisher_exact ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html "next page")
On this page 
  * [`chi2_contingency`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#scipy.stats.chi2_contingency)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
