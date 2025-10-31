---
title: scipy.stats.fisher_exact
description: Fisher's Exact Test
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.fisher_exact

**Description**: Fisher's Exact Test

**Original Documentation**: [scipy.stats.fisher_exact](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.fisher_exact.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.fisher_exact.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.fisher_exact.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.fisher_exact.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.fisher_exact.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.fisher_exact.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.fisher_exact.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.fisher_exact.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.fisher_exact.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.fisher_exact.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.fisher_exact.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.fisher_exact.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.fisher_exact.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.fisher_exact.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.fisher_exact.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.fisher_exact.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.fisher_exact.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.fisher_exact.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.fisher_exact.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.fisher_exact.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.fisher_exact.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.fisher_exact.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.fisher_exact.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.fisher_exact.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.fisher_exact.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.fisher_exact.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.fisher_exact.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.fisher_exact.html)
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.fisher_exact.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.fisher_exact.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.fisher_exact.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.fisher_exact.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.fisher_exact.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.fisher_exact.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.fisher_exact.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.fisher_exact.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.fisher_exact.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.fisher_exact.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.fisher_exact.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.fisher_exact.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.fisher_exact.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.fisher_exact.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.fisher_exact.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.fisher_exact.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.fisher_exact.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.fisher_exact.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.fisher_exact.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.fisher_exact.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.fisher_exact.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.fisher_exact.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.fisher_exact.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.fisher_exact.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.fisher_exact.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.fisher_exact.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.fisher_exact.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.fisher_exact.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.fisher_exact.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.fisher_exact.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.fisher_exact.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.fisher_exact.html)
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
  * fisher_exact


scipy.stats.
# fisher_exact[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#fisher-exact "Link to this heading") 

scipy.stats.fisher_exact(_table_ , _alternative =None_, _*_ , _method =None_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L4802-L5086)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#scipy.stats.fisher_exact "Link to this definition") 
    
Perform a Fisher exact test on a contingency table.
For a 2x2 table, the null hypothesis is that the true odds ratio of the populations underlying the observations is one, and the observations were sampled from these populations under a condition: the marginals of the resulting table must equal those of the observed table. The statistic is the unconditional maximum likelihood estimate of the odds ratio, and the p-value is the probability under the null hypothesis of obtaining a table at least as extreme as the one that was actually observed.
For other table sizes, or if _method_ is provided, the null hypothesis is that the rows and columns of the tables have fixed sums and are independent; i.e., the table was sampled from a [`scipy.stats.random_table`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.random_table.html#scipy.stats.random_table "scipy.stats.random_table") distribution with the observed marginals. The statistic is the probability mass of this distribution evaluated at _table_ , and the p-value is the percentage of the population of tables with statistic at least as extreme (small) as that of _table_. There is only one alternative hypothesis available: the rows and columns are not independent.
There are other possible choices of statistic and two-sided p-value definition associated with Fisher’s exact test; please see the Notes for more information. 

Parameters: 
     

**table** array_like of ints 
    
A contingency table. Elements must be non-negative integers. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis for 2x2 tables; unused for other table sizes. The following options are available (default is ‘two-sided’):
  * ‘two-sided’: the odds ratio of the underlying population is not one
  * ‘less’: the odds ratio of the underlying population is less than one
  * ‘greater’: the odds ratio of the underlying population is greater than one


See the Notes for more details. 

**method** ResamplingMethod, optional 
    
Defines the method used to compute the p-value. If _method_ is an instance of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod")/[`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod"), the p-value is computed using [`scipy.stats.permutation_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html#scipy.stats.permutation_test "scipy.stats.permutation_test")/[`scipy.stats.monte_carlo_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.monte_carlo_test.html#scipy.stats.monte_carlo_test "scipy.stats.monte_carlo_test") with the provided configuration options and other appropriate settings. Note that if _method_ is an instance of [`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod"), the `rvs` attribute must be left unspecified; Monte Carlo samples are always drawn using the `rvs` method of [`scipy.stats.random_table`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.random_table.html#scipy.stats.random_table "scipy.stats.random_table"). Otherwise, the p-value is computed as documented in the notes.
Added in version 1.15.0. 

Returns: 
     

**res** SignificanceResult 
    
An object containing attributes: 

statisticfloat 
    
For a 2x2 table with default _method_ , this is the odds ratio - the prior odds ratio not a posterior estimate. In all other cases, this is the probability density of obtaining the observed table under the null hypothesis of independence with marginals fixed. 

pvaluefloat 
    
The probability under the null hypothesis of obtaining a table at least as extreme as the one that was actually observed. 

Raises: 
     

ValueError
    
If _table_ is not two-dimensional or has negative entries.
See also 

[`chi2_contingency`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html#scipy.stats.chi2_contingency "scipy.stats.chi2_contingency")
    
Chi-square test of independence of variables in a contingency table. This can be used as an alternative to [`fisher_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#scipy.stats.fisher_exact "scipy.stats.fisher_exact") when the numbers in the table are large. 

[`contingency.odds_ratio`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.odds_ratio.html#scipy.stats.contingency.odds_ratio "scipy.stats.contingency.odds_ratio")
    
Compute the odds ratio (sample or conditional MLE) for a 2x2 contingency table. 

[`barnard_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.barnard_exact.html#scipy.stats.barnard_exact "scipy.stats.barnard_exact")
    
Barnard’s exact test, which is a more powerful alternative than Fisher’s exact test for 2x2 contingency tables. 

[`boschloo_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.boschloo_exact.html#scipy.stats.boschloo_exact "scipy.stats.boschloo_exact")
    
Boschloo’s exact test, which is a more powerful alternative than Fisher’s exact test for 2x2 contingency tables. 

[Fisher’s exact test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_fisher_exact.html#hypothesis-fisher-exact)
    
Extended example
Notes
_Null hypothesis and p-values_
The null hypothesis is that the true odds ratio of the populations underlying the observations is one, and the observations were sampled at random from these populations under a condition: the marginals of the resulting table must equal those of the observed table. Equivalently, the null hypothesis is that the input table is from the hypergeometric distribution with parameters (as used in [`hypergeom`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.hypergeom.html#scipy.stats.hypergeom "scipy.stats.hypergeom")) `M = a + b + c + d`, `n = a + b` and `N = a + c`, where the input table is `[[a, b], [c, d]]`. This distribution has support `max(0, N + n - M) <= x <= min(N, n)`, or, in terms of the values in the input table, `min(0, a - d) <= x <= a + min(b, c)`. `x` can be interpreted as the upper-left element of a 2x2 table, so the tables in the distribution have form:
```
[  x           n - x     ]
[N - x    M - (n + N) + x]

```
Copy to clipboard
For example, if:
```
table = [6  2]
        [1  4]

```
Copy to clipboard
then the support is `2 <= x <= 7`, and the tables in the distribution are:
```
[2 6]   [3 5]   [4 4]   [5 3]   [6 2]  [7 1]
[5 0]   [4 1]   [3 2]   [2 3]   [1 4]  [0 5]

```
Copy to clipboard
The probability of each table is given by the hypergeometric distribution `hypergeom.pmf(x, M, n, N)`. For this example, these are (rounded to three significant digits):
```
x       2      3      4      5       6        7
p  0.0163  0.163  0.408  0.326  0.0816  0.00466

```
Copy to clipboard
These can be computed with:
```
>>> importnumpyasnp
>>> fromscipy.statsimport hypergeom
>>> table = np.array([[6, 2], [1, 4]])
>>> M = table.sum()
>>> n = table[0].sum()
>>> N = table[:, 0].sum()
>>> start, end = hypergeom.support(M, n, N)
>>> hypergeom.pmf(np.arange(start, end+1), M, n, N)
array([0.01631702, 0.16317016, 0.40792541, 0.32634033, 0.08158508,
       0.004662  ])

```
Copy to clipboard
The two-sided p-value is the probability that, under the null hypothesis, a random table would have a probability equal to or less than the probability of the input table. For our example, the probability of the input table (where `x = 6`) is 0.0816. The x values where the probability does not exceed this are 2, 6 and 7, so the two-sided p-value is `0.0163 + 0.0816 + 0.00466 ~= 0.10256`:
```
>>> fromscipy.statsimport fisher_exact
>>> res = fisher_exact(table, alternative='two-sided')
>>> res.pvalue
0.10256410256410257

```
Copy to clipboard
The one-sided p-value for `alternative='greater'` is the probability that a random table has `x >= a`, which in our example is `x >= 6`, or `0.0816 + 0.00466 ~= 0.08626`:
```
>>> res = fisher_exact(table, alternative='greater')
>>> res.pvalue
0.08624708624708627

```
Copy to clipboard
This is equivalent to computing the survival function of the distribution at `x = 5` (one less than `x` from the input table, because we want to include the probability of `x = 6` in the sum):
```
>>> hypergeom.sf(5, M, n, N)
0.08624708624708627

```
Copy to clipboard
For `alternative='less'`, the one-sided p-value is the probability that a random table has `x <= a`, (i.e. `x <= 6` in our example), or `0.0163 + 0.163 + 0.408 + 0.326 + 0.0816 ~= 0.9949`:
```
>>> res = fisher_exact(table, alternative='less')
>>> res.pvalue
0.9953379953379957

```
Copy to clipboard
This is equivalent to computing the cumulative distribution function of the distribution at `x = 6`:
```
>>> hypergeom.cdf(6, M, n, N)
0.9953379953379957

```
Copy to clipboard
_Odds ratio_
The calculated odds ratio is different from the value computed by the R function `fisher.test`. This implementation returns the “sample” or “unconditional” maximum likelihood estimate, while `fisher.test` in R uses the conditional maximum likelihood estimate. To compute the conditional maximum likelihood estimate of the odds ratio, use [`scipy.stats.contingency.odds_ratio`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.contingency.odds_ratio.html#scipy.stats.contingency.odds_ratio "scipy.stats.contingency.odds_ratio").
References
[1]
Fisher, Sir Ronald A, “The Design of Experiments: Mathematics of a Lady Tasting Tea.” ISBN 978-0-486-41151-4, 1935.
[2]
“Fisher’s exact test”, [https://en.wikipedia.org/wiki/Fisher’s_exact_test](https://en.wikipedia.org/wiki/Fisher's_exact_test)
Examples
Try it in your browser!
```
>>> fromscipy.statsimport fisher_exact
>>> res = fisher_exact([[8, 2], [1, 5]])
>>> res.statistic
20.0
>>> res.pvalue
0.034965034965034975

```
Copy to clipboard
For tables with shape other than `(2, 2)`, provide an instance of [`scipy.stats.MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod") or [`scipy.stats.PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") for the _method_ parameter:
```
>>> importnumpyasnp
>>> fromscipy.statsimport MonteCarloMethod
>>> rng = np.random.default_rng()
>>> method = MonteCarloMethod(rng=rng)
>>> fisher_exact([[8, 2, 3], [1, 5, 4]], method=method)
SignificanceResult(statistic=np.float64(0.005782), pvalue=np.float64(0.0603))

```
Copy to clipboard
For a more detailed example, see [Fisher’s exact test](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_fisher_exact.html#hypothesis-fisher-exact).
Go BackOpen In Tab
[ previous chi2_contingency ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html "previous page") [ next barnard_exact ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.barnard_exact.html "next page")
On this page 
  * [`fisher_exact`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html#scipy.stats.fisher_exact)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
