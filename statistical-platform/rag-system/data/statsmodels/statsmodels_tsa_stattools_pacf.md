---
title: statsmodels.tsa.stattools.pacf
description: 부분자기상관함수 (PACF)
source: https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.tsa.stattools.pacf

**Description**: 부분자기상관함수 (PACF)

**Original Documentation**: [statsmodels.tsa.stattools.pacf](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf)
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

statsmodels.tsa.stattools.pacf 
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
    * [Time Series Analysis](https://www.statsmodels.org/stable/user-guide.html#time-series-analysis)
Time Series Analysis
      * [Time Series analysis tsa](https://www.statsmodels.org/stable/tsa.html)
Time Series analysis tsa
        * [Descriptive Statistics and Tests](https://www.statsmodels.org/stable/tsa.html#descriptive-statistics-and-tests)
Descriptive Statistics and Tests
          * [ statsmodels.tsa.stattools.acovf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acovf.html)
          * [ statsmodels.tsa.stattools.acf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html)
          * statsmodels.tsa.stattools.pacf [ statsmodels.tsa.stattools.pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html)
            * [ Fstatsmodels.tsa.stattools.pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-returns)
          * [ statsmodels.tsa.stattools.pacf_yw ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_yw.html)
          * [ statsmodels.tsa.stattools.pacf_ols ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_ols.html)
          * [ statsmodels.tsa.stattools.pacf_burg ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_burg.html)
          * [ statsmodels.tsa.stattools.ccovf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.ccovf.html)
          * [ statsmodels.tsa.stattools.ccf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.ccf.html)
          * [ statsmodels.tsa.stattools.adfuller ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html)
          * [ statsmodels.tsa.stattools.kpss ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html)
          * [ statsmodels.tsa.stattools.range_unit_root_test ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.range_unit_root_test.html)
          * [ statsmodels.tsa.stattools.zivot_andrews ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.zivot_andrews.html)
          * [ statsmodels.tsa.stattools.coint ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.coint.html)
          * [ statsmodels.tsa.stattools.bds ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.bds.html)
          * [ statsmodels.tsa.stattools.q_stat ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.q_stat.html)
          * [ statsmodels.tsa.stattools.breakvar_heteroskedasticity_test ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.breakvar_heteroskedasticity_test.html)
          * [ statsmodels.tsa.stattools.grangercausalitytests ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.grangercausalitytests.html)
          * [ statsmodels.tsa.stattools.levinson_durbin ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.levinson_durbin.html)
          * [ statsmodels.tsa.stattools.innovations_algo ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.innovations_algo.html)
          * [ statsmodels.tsa.stattools.innovations_filter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.innovations_filter.html)
          * [ statsmodels.tsa.stattools.levinson_durbin_pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.levinson_durbin_pacf.html)
          * [ statsmodels.tsa.stattools.arma_order_select_ic ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.arma_order_select_ic.html)
          * [ statsmodels.tsa.x13.x13_arima_select_order ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.x13.x13_arima_select_order.html)
          * [ statsmodels.tsa.x13.x13_arima_analysis ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.x13.x13_arima_analysis.html)
        * [ Estimation ](https://www.statsmodels.org/stable/tsa.html#estimation)
        * [ ARMA Process ](https://www.statsmodels.org/stable/tsa.html#arma-process)
        * [ Autoregressive Distributed Lag (ARDL) Models ](https://www.statsmodels.org/stable/tsa.html#autoregressive-distributed-lag-ardl-models)
        * [ Error Correction Models (ECM) ](https://www.statsmodels.org/stable/tsa.html#error-correction-models-ecm)
        * [ Regime switching models ](https://www.statsmodels.org/stable/tsa.html#regime-switching-models)
        * [ Time Series Filters ](https://www.statsmodels.org/stable/tsa.html#time-series-filters)
        * [ TSA Tools ](https://www.statsmodels.org/stable/tsa.html#tsa-tools)
        * [ VARMA Process ](https://www.statsmodels.org/stable/tsa.html#varma-process)
        * [ Interpolation ](https://www.statsmodels.org/stable/tsa.html#interpolation)
        * [ Deterministic Processes ](https://www.statsmodels.org/stable/tsa.html#deterministic-processes)
        * [ Forecasting Models ](https://www.statsmodels.org/stable/tsa.html#module-statsmodels.tsa.forecasting)
        * [ Prediction Results ](https://www.statsmodels.org/stable/tsa.html#prediction-results)
      * [ Time Series Analysis by State Space Methods statespace ](https://www.statsmodels.org/stable/statespace.html)
      * [ Vector Autoregressions tsa.vector_ar ](https://www.statsmodels.org/stable/vector_ar.html)
    * [ Other Models ](https://www.statsmodels.org/stable/user-guide.html#other-models)
    * [ Statistics and Tools ](https://www.statsmodels.org/stable/user-guide.html#statistics-and-tools)
    * [ Data Sets ](https://www.statsmodels.org/stable/user-guide.html#data-sets)
    * [ Sandbox ](https://www.statsmodels.org/stable/user-guide.html#sandbox)
  * [ Examples ](https://www.statsmodels.org/stable/examples/index.html)
  * [ API Reference ](https://www.statsmodels.org/stable/api.html)
  * [ About statsmodels ](https://www.statsmodels.org/stable/about.html)
  * [ Developer Page ](https://www.statsmodels.org/stable/dev/index.html)
  * [ Release Notes ](https://www.statsmodels.org/stable/release/index.html)


  * [ Fstatsmodels.tsa.stattools.pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-returns)


# statsmodels.tsa.stattools.pacf[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels-tsa-stattools-pacf "Link to this heading") 

statsmodels.tsa.stattools.pacf(_[x](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "statsmodels.tsa.stattools.pacf.x \(Python parameter\)")_ , _[nlags](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "statsmodels.tsa.stattools.pacf.nlags \(Python parameter\)") =`None`_, _[method](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "statsmodels.tsa.stattools.pacf.method \(Python parameter\)") =`'ywadjusted'`_, _[alpha](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "statsmodels.tsa.stattools.pacf.alpha \(Python parameter\)") =`None`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/tsa/stattools.html#pacf)[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "Link to this definition") 
    
Partial autocorrelation estimate. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Observations of time series for which pacf is calculated. 

**nlags**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)"), `optional` 
    
Number of lags to return autocorrelation for. If not provided, uses min(10 * np.log10(nobs), nobs // 2 - 1). The returned value includes lag 0 (ie., 1) so size of the pacf vector is (nlags + 1,). 

**method**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)"), `default` “ywunbiased” 
    
Specifies which method for the calculations to use.
  * “yw” or “ywadjusted” : Yule-Walker with sample-size adjustment in denominator for acovf. Default.
  * “ywm” or “ywmle” : Yule-Walker without adjustment.
  * “ols” : regression of time series on lags of it and on constant.
  * “ols-inefficient” : regression of time series on lags using a single common sample to estimate all pacf coefficients.
  * “ols-adjusted” : regression of time series on lags with a bias adjustment.
  * “ld” or “ldadjusted” : Levinson-Durbin recursion with bias correction.
  * “ldb” or “ldbiased” : Levinson-Durbin recursion without bias correction.
  * “burg” : Burg”s partial autocorrelation estimator.


**alpha**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)"), `optional` 
    
If a number is given, the confidence intervals for the given level are returned. For instance if alpha=.05, 95 % confidence intervals are returned where the standard deviation is computed according to 1/sqrt(len(x)). 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf-returns "Permalink to this headline") 
     

**pacf**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)") 
    
The partial autocorrelations for lags 0, 1, …, nlags. Shape (nlags+1,). 

**confint**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)"), `optional` 
    
Confidence intervals for the PACF at lags 0, 1, …, nlags. Shape (nlags + 1, 2). Returned if alpha is not None.
See also 

[`statsmodels.tsa.stattools.acf`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf \(Python function\) — Calculate the autocorrelation function.")
    
Estimate the autocorrelation function. 

[`statsmodels.tsa.stattools.pacf`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html#statsmodels.tsa.stattools.pacf "statsmodels.tsa.stattools.pacf \(Python function\) — Partial autocorrelation estimate.")
    
Partial autocorrelation estimation. 

[`statsmodels.tsa.stattools.pacf_yw`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_yw.html#statsmodels.tsa.stattools.pacf_yw "statsmodels.tsa.stattools.pacf_yw \(Python function\) — Partial autocorrelation estimated with non-recursive yule_walker.")
    
Partial autocorrelation estimation using Yule-Walker. 

[`statsmodels.tsa.stattools.pacf_ols`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_ols.html#statsmodels.tsa.stattools.pacf_ols "statsmodels.tsa.stattools.pacf_ols \(Python function\) — Calculate partial autocorrelations via OLS.")
    
Partial autocorrelation estimation using OLS. 

[`statsmodels.tsa.stattools.pacf_burg`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_burg.html#statsmodels.tsa.stattools.pacf_burg "statsmodels.tsa.stattools.pacf_burg \(Python function\) — Calculate Burg"s partial autocorrelation estimator.")
    
Partial autocorrelation estimation using Burg’s method. 

[`statsmodels.graphics.tsaplots.plot_pacf`](https://www.statsmodels.org/stable/generated/statsmodels.graphics.tsaplots.plot_pacf.html#statsmodels.graphics.tsaplots.plot_pacf "statsmodels.graphics.tsaplots.plot_pacf \(Python function\) — Plot the partial autocorrelation function")
    
Plot partial autocorrelations and confidence intervals.
Notes
Based on simulation evidence across a range of low-order ARMA models, the best methods based on root MSE are Yule-Walker (MLW), Levinson-Durbin (MLE) and Burg, respectively. The estimators with the lowest bias included included these three in addition to OLS and OLS-adjusted.
Yule-Walker (adjusted) and Levinson-Durbin (adjusted) performed consistently worse than the other options.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.tsa.stattools.acf  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html) [ Next  statsmodels.tsa.stattools.pacf_yw  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_yw.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
