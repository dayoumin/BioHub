---
title: statsmodels.stats.weightstats.ztest
description: Z-검정 (평균)
source: https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.stats.weightstats.ztest

**Description**: Z-검정 (평균)

**Original Documentation**: [statsmodels.stats.weightstats.ztest](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest)
[ ![logo](https://www.statsmodels.org/stable/_static/statsmodels-logo-v2-bw.svg) ](https://www.statsmodels.org/stable/index.html "statsmodels 0.14.4")
statsmodels 0.14.4 
Stable
  * [Stable](https://www.statsmodels.org/stable/)
  * [Development](https://www.statsmodels.org/devel/)
  * 
  * 
  * 
  * 
  * 
  * 
  *

statsmodels.stats.weightstats.ztest 
Type to start searching
[ statsmodels 
  * v0.14.5
  * 11k
  * 3.3k

](https://github.com/statsmodels/statsmodels/ "Go to repository")
[ ![logo](https://www.statsmodels.org/stable/_static/statsmodels-logo-v2-bw.svg) ](https://www.statsmodels.org/stable/index.html "statsmodels 0.14.4") statsmodels 0.14.4 
[ statsmodels 
  * v0.14.5
  * 11k
  * 3.3k

](https://github.com/statsmodels/statsmodels/ "Go to repository")
  * [ Installing statsmodels ](https://www.statsmodels.org/stable/install.html)
  * [ Getting started ](https://www.statsmodels.org/stable/gettingstarted.html)
  * [User Guide](https://www.statsmodels.org/stable/user-guide.html)
User Guide
    * [ Background ](https://www.statsmodels.org/stable/user-guide.html#background)
    * [ Regression and Linear Models ](https://www.statsmodels.org/stable/user-guide.html#regression-and-linear-models)
    * [ Time Series Analysis ](https://www.statsmodels.org/stable/user-guide.html#time-series-analysis)
    * [ Other Models ](https://www.statsmodels.org/stable/user-guide.html#other-models)
    * [Statistics and Tools](https://www.statsmodels.org/stable/user-guide.html#statistics-and-tools)
Statistics and Tools
      * [Statistics stats](https://www.statsmodels.org/stable/stats.html)
Statistics stats
        * [ Residual Diagnostics and Specification Tests ](https://www.statsmodels.org/stable/stats.html#module-statsmodels.stats.stattools)
        * [ Sandwich Robust Covariances ](https://www.statsmodels.org/stable/stats.html#sandwich-robust-covariances)
        * [ Goodness of Fit Tests and Measures ](https://www.statsmodels.org/stable/stats.html#goodness-of-fit-tests-and-measures)
        * [ Non-Parametric Tests ](https://www.statsmodels.org/stable/stats.html#module-statsmodels.sandbox.stats.runs)
        * [ Descriptive Statistics ](https://www.statsmodels.org/stable/stats.html#module-statsmodels.stats.descriptivestats)
        * [ Interrater Reliability and Agreement ](https://www.statsmodels.org/stable/stats.html#interrater-reliability-and-agreement)
        * [ Multiple Tests and Multiple Comparison Procedures ](https://www.statsmodels.org/stable/stats.html#multiple-tests-and-multiple-comparison-procedures)
        * [Basic Statistics and t-Tests with frequency weights](https://www.statsmodels.org/stable/stats.html#basic-statistics-and-t-tests-with-frequency-weights)
Basic Statistics and t-Tests with frequency weights
          * [ statsmodels.stats.weightstats.DescrStatsW ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.DescrStatsW.html)
          * [ statsmodels.stats.weightstats.CompareMeans ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.CompareMeans.html)
          * [ statsmodels.stats.weightstats.ttest_ind ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ttest_ind.html)
          * [ statsmodels.stats.weightstats.ttost_ind ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ttost_ind.html)
          * [ statsmodels.stats.weightstats.ttost_paired ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ttost_paired.html)
          * statsmodels.stats.weightstats.ztest [ statsmodels.stats.weightstats.ztest ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html)
            * [ Fstatsmodels.stats.weightstats.ztest ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-returns)
          * [ statsmodels.stats.weightstats.ztost ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztost.html)
          * [ statsmodels.stats.weightstats.zconfint ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.zconfint.html)
          * [ statsmodels.stats.weightstats._tconfint_generic ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats._tconfint_generic.html)
          * [ statsmodels.stats.weightstats._tstat_generic ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats._tstat_generic.html)
          * [ statsmodels.stats.weightstats._zconfint_generic ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats._zconfint_generic.html)
          * [ statsmodels.stats.weightstats._zstat_generic ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats._zstat_generic.html)
          * [ statsmodels.stats.weightstats._zstat_generic2 ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats._zstat_generic2.html)
        * [ Power and Sample Size Calculations ](https://www.statsmodels.org/stable/stats.html#power-and-sample-size-calculations)
        * [ Proportion ](https://www.statsmodels.org/stable/stats.html#proportion)
        * [ Rates ](https://www.statsmodels.org/stable/stats.html#rates)
        * [ Multivariate ](https://www.statsmodels.org/stable/stats.html#multivariate)
        * [ Oneway Anova ](https://www.statsmodels.org/stable/stats.html#oneway-anova)
        * [ Robust, Trimmed Statistics ](https://www.statsmodels.org/stable/stats.html#robust-trimmed-statistics)
        * [ Moment Helpers ](https://www.statsmodels.org/stable/stats.html#moment-helpers)
        * [ Mediation Analysis ](https://www.statsmodels.org/stable/stats.html#mediation-analysis)
        * [ Oaxaca-Blinder Decomposition ](https://www.statsmodels.org/stable/stats.html#oaxaca-blinder-decomposition)
        * [ Distance Dependence Measures ](https://www.statsmodels.org/stable/stats.html#distance-dependence-measures)
        * [ Meta-Analysis ](https://www.statsmodels.org/stable/stats.html#meta-analysis)
      * [ Contingency tables ](https://www.statsmodels.org/stable/contingency_tables.html)
      * [ Multiple Imputation with Chained Equations ](https://www.statsmodels.org/stable/imputation.html)
      * [ Treatment Effects treatment ](https://www.statsmodels.org/stable/treatment.html)
      * [ Empirical Likelihood emplike ](https://www.statsmodels.org/stable/emplike.html)
      * [ Distributions ](https://www.statsmodels.org/stable/distributions.html)
      * [ Graphics ](https://www.statsmodels.org/stable/graphics.html)
      * [ Input-Output iolib ](https://www.statsmodels.org/stable/iolib.html)
      * [ Tools ](https://www.statsmodels.org/stable/tools.html)
      * [ Working with Large Data Sets ](https://www.statsmodels.org/stable/large_data.html)
      * [ Optimization ](https://www.statsmodels.org/stable/optimization.html)
    * [ Data Sets ](https://www.statsmodels.org/stable/user-guide.html#data-sets)
    * [ Sandbox ](https://www.statsmodels.org/stable/user-guide.html#sandbox)
  * [ Examples ](https://www.statsmodels.org/stable/examples/index.html)
  * [ API Reference ](https://www.statsmodels.org/stable/api.html)
  * [ About statsmodels ](https://www.statsmodels.org/stable/about.html)
  * [ Developer Page ](https://www.statsmodels.org/stable/dev/index.html)
  * [ Release Notes ](https://www.statsmodels.org/stable/release/index.html)


  * [ Fstatsmodels.stats.weightstats.ztest ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-returns)


# statsmodels.stats.weightstats.ztest[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels-stats-weightstats-ztest "Link to this heading") 

statsmodels.stats.weightstats.ztest(_[x1](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.x1 \(Python parameter\)")_ , _[x2](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.x2 \(Python parameter\)") =`None`_, _[value](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.value \(Python parameter\)") =`0`_, _[alternative](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.alternative \(Python parameter\)") =`'two-sided'`_, _[usevar](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.usevar \(Python parameter\)") =`'pooled'`_, _[ddof](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "statsmodels.stats.weightstats.ztest.ddof \(Python parameter\)") =`1.0`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/stats/weightstats.html#ztest)[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest "Link to this definition") 
    
test for mean based on normal distribution, one or two samples
In the case of two samples, the samples are assumed to be independent. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-parameters "Permalink to this headline") 
     

**x1**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), 1-D or 2-D 
    
first of the two independent samples 

**x2**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), 1-D or 2-D 
    
second of the two independent samples 

**value**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
In the one sample case, value is the mean of x1 under the Null hypothesis. In the two sample case, value is the difference between mean of x1 and mean of x2 under the Null hypothesis. The test statistic is x1_mean - x2_mean - value. 

**alternative**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)") 
    
The alternative hypothesis, H1, has to be one of the following
> ‘two-sided’: H1: difference in means not equal to value (default) ‘larger’ : H1: difference in means larger than value ‘smaller’ : H1: difference in means smaller than value 

**usevar**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)"), ‘pooled’ or ‘unequal’ 
    
If `pooled`, then the standard deviation of the samples is assumed to be the same. If `unequal`, then the standard deviation of the sample is assumed to be different. 

**ddof**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") 
    
Degrees of freedom use in the calculation of the variance of the mean estimate. In the case of comparing means this is one, however it can be adjusted for testing other statistics (proportion, correlation) 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztest.html#statsmodels.stats.weightstats.ztest-returns "Permalink to this headline") 
     

**tstat**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
test statistic 

**pvalue**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
pvalue of the t-test
Notes
usevar can be pooled or unequal in two sample case
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.stats.weightstats.ttost_paired  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ttost_paired.html) [ Next  statsmodels.stats.weightstats.ztost  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.weightstats.ztost.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
