---
title: statsmodels.formula.api.ols
description: OLS 회귀 (formula API)
source: https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.formula.api.ols

**Description**: OLS 회귀 (formula API)

**Original Documentation**: [statsmodels.formula.api.ols](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols)
[ ![logo](https://www.statsmodels.org/stable/_static/statsmodels-logo-v2-bw.svg) ](https://www.statsmodels.org/stable/index.html "statsmodels 0.14.4")
statsmodels 0.14.4 
Stable
  * [Stable](https://www.statsmodels.org/stable/)
  * [Development](https://www.statsmodels.org/devel/)
  * [0.13](https://www.statsmodels.org/v0.13.5/)
  * [0.12](https://www.statsmodels.org/v0.12.2/)
  * [0.11](https://www.statsmodels.org/v0.11.1/)
  * [0.10](https://www.statsmodels.org/v0.10.2/)
  * [0.9](https://www.statsmodels.org/0.9.0/)
  * [0.8](https://www.statsmodels.org/0.8.0/)
  * [0.6](https://www.statsmodels.org/0.6.1/)


statsmodels.formula.api.ols 
Initializing search 
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
  * [ User Guide ](https://www.statsmodels.org/stable/user-guide.html)
  * [ Examples ](https://www.statsmodels.org/stable/examples/index.html)
  * [API Reference](https://www.statsmodels.org/stable/api.html)
API Reference
    * [statsmodels.formula.api](https://www.statsmodels.org/stable/api.html#statsmodels-formula-api)
statsmodels.formula.api
      * [Models](https://www.statsmodels.org/stable/api.html#models)
Models
        * [ statsmodels.formula.api.gls ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.gls.html)
        * [ statsmodels.formula.api.wls ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.wls.html)
        * statsmodels.formula.api.ols [ statsmodels.formula.api.ols ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html)
          * [ Fstatsmodels.formula.api.ols ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols)
            * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-parameters)
            * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-returns)
        * [ statsmodels.formula.api.glsar ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.glsar.html)
        * [ statsmodels.formula.api.mixedlm ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.mixedlm.html)
        * [ statsmodels.formula.api.glm ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.glm.html)
        * [ statsmodels.formula.api.gee ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.gee.html)
        * [ statsmodels.formula.api.ordinal_gee ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ordinal_gee.html)
        * [ statsmodels.formula.api.nominal_gee ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.nominal_gee.html)
        * [ statsmodels.formula.api.rlm ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.rlm.html)
        * [ statsmodels.formula.api.logit ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.logit.html)
        * [ statsmodels.formula.api.probit ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.probit.html)
        * [ statsmodels.formula.api.mnlogit ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.mnlogit.html)
        * [ statsmodels.formula.api.poisson ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.poisson.html)
        * [ statsmodels.formula.api.negativebinomial ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.negativebinomial.html)
        * [ statsmodels.formula.api.quantreg ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.quantreg.html)
        * [ statsmodels.formula.api.phreg ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.phreg.html)
        * [ statsmodels.formula.api.glmgam ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.glmgam.html)
        * [ statsmodels.formula.api.conditional_logit ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.conditional_logit.html)
        * [ statsmodels.formula.api.conditional_mnlogit ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.conditional_mnlogit.html)
        * [ statsmodels.formula.api.conditional_poisson ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.conditional_poisson.html)
  * [ About statsmodels ](https://www.statsmodels.org/stable/about.html)
  * [ Developer Page ](https://www.statsmodels.org/stable/dev/index.html)
  * [ Release Notes ](https://www.statsmodels.org/stable/release/index.html)


  * [ Fstatsmodels.formula.api.ols ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-returns)


# statsmodels.formula.api.ols[¶](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels-formula-api-ols "Link to this heading") 

statsmodels.formula.api.ols(_[formula](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.formula \(Python parameter\)")_ , _[data](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.data \(Python parameter\)")_ , _[subset](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.subset \(Python parameter\)") =`None`_, _[drop_cols](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.drop_cols \(Python parameter\)") =`None`_, _*[ args](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.args \(Python parameter\)")_, _**[ kwargs](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "statsmodels.formula.api.ols.kwargs \(Python parameter\)")_)[¶](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols "Link to this definition") 
    
Create a Model from a formula and dataframe. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-parameters "Permalink to this headline") 
     

**formula**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)") or `generic` `Formula` [`object`](https://docs.python.org/3/library/functions.html#object "\(in Python v3.12\)") 
    
The formula specifying the model. 

**data**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
The data for the model. See Notes. 

**subset**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
An array-like object of booleans, integers, or index values that indicate the subset of df to use in the model. Assumes df is a pandas.DataFrame. 

**drop_cols**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Columns to drop from the design matrix. Cannot be used to drop terms involving categoricals. 

***args**
    
Additional positional argument that are passed to the model. 

****kwargs**
    
These are passed to the model with one exception. The `eval_env` keyword is passed to patsy. It can be either a `patsy:patsy.EvalEnvironment` object or an integer indicating the depth of the namespace to use. For example, the default `eval_env=0` uses the calling namespace. If you wish to use a “clean” environment set `eval_env=-1`. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.ols.html#statsmodels.formula.api.ols-returns "Permalink to this headline") 
     

`model`
    
The model instance.
Notes
data must define __getitem__ with the keys in the formula terms args and kwargs are passed on to the model instantiation. E.g., a numpy structured or rec array, a dictionary, or a pandas DataFrame.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.formula.api.wls  ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.wls.html) [ Next  statsmodels.formula.api.glsar  ](https://www.statsmodels.org/stable/generated/statsmodels.formula.api.glsar.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
