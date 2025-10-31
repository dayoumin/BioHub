---
title: statsmodels.tsa.stattools.kpss
description: KPSS 정상성 검정
source: https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.tsa.stattools.kpss

**Description**: KPSS 정상성 검정

**Original Documentation**: [statsmodels.tsa.stattools.kpss](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss)
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

statsmodels.tsa.stattools.kpss 
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
          * [ statsmodels.tsa.stattools.pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html)
          * [ statsmodels.tsa.stattools.pacf_yw ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_yw.html)
          * [ statsmodels.tsa.stattools.pacf_ols ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_ols.html)
          * [ statsmodels.tsa.stattools.pacf_burg ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf_burg.html)
          * [ statsmodels.tsa.stattools.ccovf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.ccovf.html)
          * [ statsmodels.tsa.stattools.ccf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.ccf.html)
          * [ statsmodels.tsa.stattools.adfuller ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html)
          * statsmodels.tsa.stattools.kpss [ statsmodels.tsa.stattools.kpss ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html)
            * [ Fstatsmodels.tsa.stattools.kpss ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-returns)
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


  * [ Fstatsmodels.tsa.stattools.kpss ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-returns)


# statsmodels.tsa.stattools.kpss[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels-tsa-stattools-kpss "Link to this heading") 

statsmodels.tsa.stattools.kpss(_[x](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss "statsmodels.tsa.stattools.kpss.x \(Python parameter\)")_ , _[regression](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss "statsmodels.tsa.stattools.kpss.regression \(Python parameter\)") =`'c'`_, _[nlags](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss "statsmodels.tsa.stattools.kpss.nlags \(Python parameter\)") =`'auto'`_, _[store](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss "statsmodels.tsa.stattools.kpss.store \(Python parameter\)") =`False`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/tsa/stattools.html#kpss)[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss "Link to this definition") 
    
Kwiatkowski-Phillips-Schmidt-Shin test for stationarity.
Computes the Kwiatkowski-Phillips-Schmidt-Shin (KPSS) test for the null hypothesis that x is level or trend stationary. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), 1d 
    
The data series to test. 

**regression**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)"){“c”, “ct”} 
    
The null hypothesis for the KPSS test.
  * “c” : The data is stationary around a constant (default).
  * “ct” : The data is stationary around a trend.


**nlags**{[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)"), [`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)")}, `optional` 
    
Indicates the number of lags to be used. If “auto” (default), lags is calculated using the data-dependent method of Hobijn et al. (1998). See also Andrews (1991), Newey & West (1994), and Schwert (1989). If set to “legacy”, uses int(12 * (n / 100)**(1 / 4)) , as outlined in Schwert (1989). 

**store**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)") 
    
If True, then a result instance is returned additionally to the KPSS statistic (default is False). 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html#statsmodels.tsa.stattools.kpss-returns "Permalink to this headline") 
     

**kpss_stat**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
The KPSS test statistic. 

**p_value**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
The p-value of the test. The p-value is interpolated from Table 1 in Kwiatkowski et al. (1992), and a boundary point is returned if the test statistic is outside the table of critical values, that is, if the p-value is outside the interval (0.01, 0.1). 

**lags**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") 
    
The truncation lag parameter. 

**crit**[`dict`](https://docs.python.org/3/library/stdtypes.html#dict "\(in Python v3.12\)") 
    
The critical values at 10%, 5%, 2.5% and 1%. Based on Kwiatkowski et al. (1992). 

**resstore**(`optional`) `instance` `of` `ResultStore` 
    
An instance of a dummy class with results attached as attributes.
Notes
To estimate sigma^2 the Newey-West estimator is used. If lags is “legacy”, the truncation lag parameter is set to int(12 * (n / 100) ** (1 / 4)), as outlined in Schwert (1989). The p-values are interpolated from Table 1 of Kwiatkowski et al. (1992). If the computed statistic is outside the table of critical values, then a warning message is generated.
Missing values are not handled.
See the notebook [Stationarity and detrending (ADF/KPSS)](https://www.statsmodels.org/stable/examples/notebooks/generated/stationarity_detrending_adf_kpss.html) for an overview.
References
[1]
Andrews, D.W.K. (1991). Heteroskedasticity and autocorrelation consistent covariance matrix estimation. Econometrica, 59: 817-858.
[2]
Hobijn, B., Frances, B.H., & Ooms, M. (2004). Generalizations of the KPSS-test for stationarity. Statistica Neerlandica, 52: 483-502.
[3]
Kwiatkowski, D., Phillips, P.C.B., Schmidt, P., & Shin, Y. (1992). Testing the null hypothesis of stationarity against the alternative of a unit root. Journal of Econometrics, 54: 159-178.
[4]
Newey, W.K., & West, K.D. (1994). Automatic lag selection in covariance matrix estimation. Review of Economic Studies, 61: 631-653.
[5]
Schwert, G. W. (1989). Tests for unit roots: A Monte Carlo investigation. Journal of Business and Economic Statistics, 7 (2): 147-159.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.tsa.stattools.adfuller  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html) [ Next  statsmodels.tsa.stattools.range_unit_root_test  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.range_unit_root_test.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
