---
title: statsmodels.tsa.stattools.adfuller
description: Augmented Dickey-Fuller 검정
source: https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.tsa.stattools.adfuller

**Description**: Augmented Dickey-Fuller 검정

**Original Documentation**: [statsmodels.tsa.stattools.adfuller](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller)
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

statsmodels.tsa.stattools.adfuller 
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
          * statsmodels.tsa.stattools.adfuller [ statsmodels.tsa.stattools.adfuller ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html)
            * [ Fstatsmodels.tsa.stattools.adfuller ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-returns)
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


  * [ Fstatsmodels.tsa.stattools.adfuller ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-returns)


# statsmodels.tsa.stattools.adfuller[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels-tsa-stattools-adfuller "Link to this heading") 

statsmodels.tsa.stattools.adfuller(_[x](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.x \(Python parameter\)")_ , _[maxlag](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.maxlag \(Python parameter\)") =`None`_, _[regression](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.regression \(Python parameter\)") =`'c'`_, _[autolag](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.autolag \(Python parameter\)") =`'AIC'`_, _[store](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.store \(Python parameter\)") =`False`_, _[regresults](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "statsmodels.tsa.stattools.adfuller.regresults \(Python parameter\)") =`False`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/tsa/stattools.html#adfuller)[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller "Link to this definition") 
    
Augmented Dickey-Fuller unit root test.
The Augmented Dickey-Fuller test can be used to test for a unit root in a univariate process in the presence of serial correlation. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), 1d 
    
The data series to test. 

**maxlag**{[`None`](https://docs.python.org/3/library/constants.html#None "\(in Python v3.12\)"), [`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)")} 
    
Maximum lag which is included in test, default value of 12*(nobs/100)^{1/4} is used when `None`. 

**regression**{“c”,”ct”,”ctt”,”n”} 
    
Constant and trend order to include in regression.
  * “c” : constant only (default).
  * “ct” : constant and trend.
  * “ctt” : constant, and linear and quadratic trend.
  * “n” : no constant, no trend.


**autolag**{“AIC”, “BIC”, “t-stat”, [`None`](https://docs.python.org/3/library/constants.html#None "\(in Python v3.12\)")} 
    
Method to use when automatically determining the lag length among the values 0, 1, …, maxlag.
  * If “AIC” (default) or “BIC”, then the number of lags is chosen to minimize the corresponding information criterion.
  * “t-stat” based choice of maxlag. Starts with maxlag and drops a lag until the t-statistic on the last lag length is significant using a 5%-sized test.
  * If None, then the number of included lags is set to maxlag.


**store**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)") 
    
If True, then a result instance is returned additionally to the adf statistic. Default is False. 

**regresults**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `optional` 
    
If True, the full regression results are returned. Default is False. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.adfuller.html#statsmodels.tsa.stattools.adfuller-returns "Permalink to this headline") 
     

**adf**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
The test statistic. 

**pvalue**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
MacKinnon’s approximate p-value based on MacKinnon (1994, 2010). 

**usedlag**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") 
    
The number of lags used. 

**nobs**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") 
    
The number of observations used for the ADF regression and calculation of the critical values. 

**critical values**[`dict`](https://docs.python.org/3/library/stdtypes.html#dict "\(in Python v3.12\)") 
    
Critical values for the test statistic at the 1 %, 5 %, and 10 % levels. Based on MacKinnon (2010). 

**icbest**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
The maximized information criterion if autolag is not None. 

**resstore**`ResultStore` , `optional` 
    
A dummy class with results attached as attributes.
Notes
The null hypothesis of the Augmented Dickey-Fuller is that there is a unit root, with the alternative that there is no unit root. If the pvalue is above a critical size, then we cannot reject that there is a unit root.
The p-values are obtained through regression surface approximation from MacKinnon 1994, but using the updated 2010 tables. If the p-value is close to significant, then the critical values should be used to judge whether to reject the null.
The autolag option and maxlag for it are described in Greene.
See the notebook [Stationarity and detrending (ADF/KPSS)](https://www.statsmodels.org/stable/examples/notebooks/generated/stationarity_detrending_adf_kpss.html) for an overview.
References
[1]
  1. Green. “Econometric Analysis,” 5th ed., Pearson, 2003.


[2]
Hamilton, J.D. “Time Series Analysis”. Princeton, 1994.
[3]
MacKinnon, J.G. 1994. “Approximate asymptotic distribution functions for unit-root and cointegration tests. Journal of Business and Economic Statistics 12, 167-76.
[4]
MacKinnon, J.G. 2010. “Critical Values for Cointegration Tests.” Queen”s University, Dept of Economics, Working Papers. Available at <http://ideas.repec.org/p/qed/wpaper/1227.html>
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.tsa.stattools.ccf  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.ccf.html) [ Next  statsmodels.tsa.stattools.kpss  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.kpss.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
