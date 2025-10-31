---
title: statsmodels.stats.anova.anova_lm
description: 선형 모델 ANOVA
source: https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.stats.anova.anova_lm

**Description**: 선형 모델 ANOVA

**Original Documentation**: [statsmodels.stats.anova.anova_lm](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm)
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

statsmodels.stats.anova.anova_lm 
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
    * [Regression and Linear Models](https://www.statsmodels.org/stable/user-guide.html#regression-and-linear-models)
Regression and Linear Models
      * [ Linear Regression ](https://www.statsmodels.org/stable/regression.html)
      * [ Generalized Linear Models ](https://www.statsmodels.org/stable/glm.html)
      * [ Generalized Estimating Equations ](https://www.statsmodels.org/stable/gee.html)
      * [ Generalized Additive Models (GAM) ](https://www.statsmodels.org/stable/gam.html)
      * [ Robust Linear Models ](https://www.statsmodels.org/stable/rlm.html)
      * [ Linear Mixed Effects Models ](https://www.statsmodels.org/stable/mixed_linear.html)
      * [ Regression with Discrete Dependent Variable ](https://www.statsmodels.org/stable/discretemod.html)
      * [ Generalized Linear Mixed Effects Models ](https://www.statsmodels.org/stable/mixed_glm.html)
      * [ANOVA](https://www.statsmodels.org/stable/anova.html)
ANOVA
        * [Module Reference](https://www.statsmodels.org/stable/anova.html#module-statsmodels.stats.anova)
Module Reference
          * statsmodels.stats.anova.anova_lm [ statsmodels.stats.anova.anova_lm ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html)
            * [ Fstatsmodels.stats.anova.anova_lm ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-returns)
          * [ statsmodels.stats.anova.AnovaRM ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.AnovaRM.html)
      * [ Other Models othermod ](https://www.statsmodels.org/stable/other_models.html)
    * [ Time Series Analysis ](https://www.statsmodels.org/stable/user-guide.html#time-series-analysis)
    * [ Other Models ](https://www.statsmodels.org/stable/user-guide.html#other-models)
    * [ Statistics and Tools ](https://www.statsmodels.org/stable/user-guide.html#statistics-and-tools)
    * [ Data Sets ](https://www.statsmodels.org/stable/user-guide.html#data-sets)
    * [ Sandbox ](https://www.statsmodels.org/stable/user-guide.html#sandbox)
  * [ Examples ](https://www.statsmodels.org/stable/examples/index.html)
  * [ API Reference ](https://www.statsmodels.org/stable/api.html)
  * [ About statsmodels ](https://www.statsmodels.org/stable/about.html)
  * [ Developer Page ](https://www.statsmodels.org/stable/dev/index.html)
  * [ Release Notes ](https://www.statsmodels.org/stable/release/index.html)


  * [ Fstatsmodels.stats.anova.anova_lm ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-returns)


# statsmodels.stats.anova.anova_lm[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels-stats-anova-anova-lm "Link to this heading") 

statsmodels.stats.anova.anova_lm(_*[ args](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm "statsmodels.stats.anova.anova_lm.args \(Python parameter\)")_, _**[ kwargs](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm "statsmodels.stats.anova.anova_lm.kwargs \(Python parameter\)")_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/stats/anova.html#anova_lm)[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm "Link to this definition") 
    
Anova table for one or more fitted linear models. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-parameters "Permalink to this headline") 
     

**args**`fitted` `linear` `model` `results` `instance` 
    
One or more fitted linear models 

**scale**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
Estimate of variance, If None, will be estimated from the largest model. Default is None. 

**test**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)") {“F”, “Chisq”, “Cp”} `or` [`None`](https://docs.python.org/3/library/constants.html#None "\(in Python v3.12\)") 
    
Test statistics to provide. Default is “F”. 

**typ**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)") or [`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") {“I”,”II”,”III”} `or` {1,2,3} 
    
The type of Anova test to perform. See notes. 

**robust**{[`None`](https://docs.python.org/3/library/constants.html#None "\(in Python v3.12\)"), “hc0”, “hc1”, “hc2”, “hc3”} 
    
Use heteroscedasticity-corrected coefficient covariance matrix. If robust covariance is desired, it is recommended to use hc3. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.anova_lm.html#statsmodels.stats.anova.anova_lm-returns "Permalink to this headline") 
     

**anova**[`DataFrame`](https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.html#pandas.DataFrame "\(in pandas v2.2.3\)") 
    
When args is a single model, return is DataFrame with columns: 

sum_sqfloat64 
    
Sum of squares for model terms. 

dffloat64 
    
Degrees of freedom for model terms. 

Ffloat64 
    
F statistic value for significance of adding model terms. 

PR(>F)float64 
    
P-value for significance of adding model terms.
When args is multiple models, return is DataFrame with columns: 

df_residfloat64 
    
Degrees of freedom of residuals in models. 

ssrfloat64 
    
Sum of squares of residuals in models. 

df_difffloat64 
    
Degrees of freedom difference from previous model in args 

ss_dfffloat64 
    
Difference in ssr from previous model in args 

Ffloat64 
    
F statistic comparing to previous model in args 

PR(>F): float64
    
P-value for significance comparing to previous model in args
See also 

`model_results.compare_f_test`, `model_results.compare_lm_test` 

Notes
Model statistics are given in the order of args. Models must have been fit using the formula api.
Examples
```
>>> import statsmodels.api as sm
>>> from statsmodels.formula.api import ols
>>> moore = sm.datasets.get_rdataset("Moore", "carData", cache=True) # load
>>> data = moore.data
>>> data = data.rename(columns={"partner.status" :
...                             "partner_status"}) # make name pythonic
>>> moore_lm = ols('conformity ~ C(fcategory, Sum)*C(partner_status, Sum)',
...                 data=data).fit()
>>> table = sm.stats.anova_lm(moore_lm, typ=2) # Type 2 Anova DataFrame
>>> print(table)

```

* * *
Last update: Oct 03, 2024 
[ Previous  ANOVA  ](https://www.statsmodels.org/stable/anova.html) [ Next  statsmodels.stats.anova.AnovaRM  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.anova.AnovaRM.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
