---
title: statsmodels.tsa.stattools.acf
description: 자기상관함수 (ACF)
source: https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.tsa.stattools.acf

**Description**: 자기상관함수 (ACF)

**Original Documentation**: [statsmodels.tsa.stattools.acf](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf)
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

statsmodels.tsa.stattools.acf 
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
          * statsmodels.tsa.stattools.acf [ statsmodels.tsa.stattools.acf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html)
            * [ Fstatsmodels.tsa.stattools.acf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-returns)
          * [ statsmodels.tsa.stattools.pacf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html)
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


  * [ Fstatsmodels.tsa.stattools.acf ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-returns)


# statsmodels.tsa.stattools.acf[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels-tsa-stattools-acf "Link to this heading") 

statsmodels.tsa.stattools.acf(_[x](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.x \(Python parameter\)")_ , _[adjusted](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.adjusted \(Python parameter\)") =`False`_, _[nlags](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.nlags \(Python parameter\)") =`None`_, _[qstat](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.qstat \(Python parameter\)") =`False`_, _[fft](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.fft \(Python parameter\)") =`True`_, _[alpha](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.alpha \(Python parameter\)") =`None`_, _[bartlett_confint](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.bartlett_confint \(Python parameter\)") =`True`_, _[missing](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf.missing \(Python parameter\)") =`'none'`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/tsa/stattools.html#acf)[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "Link to this definition") 
    
Calculate the autocorrelation function. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
The time series data. 

**adjusted**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `default` [`False`](https://docs.python.org/3/library/constants.html#False "\(in Python v3.12\)") 
    
If True, then denominators for autocovariance are n-k, otherwise n. 

**nlags**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)"), `optional` 
    
Number of lags to return autocorrelation for. If not provided, uses min(10 * np.log10(nobs), nobs - 1). The returned value includes lag 0 (ie., 1) so size of the acf vector is (nlags + 1,). 

**qstat**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `default` [`False`](https://docs.python.org/3/library/constants.html#False "\(in Python v3.12\)") 
    
If True, returns the Ljung-Box q statistic for each autocorrelation coefficient. See q_stat for more information. 

**fft**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `default` [`True`](https://docs.python.org/3/library/constants.html#True "\(in Python v3.12\)") 
    
If True, computes the ACF via FFT. 

**alpha**[ scalar](https://numpy.org/doc/stable/reference/arrays.scalars.html#arrays-scalars "\(in NumPy v2.1\)"), `default` [`None`](https://docs.python.org/3/library/constants.html#None "\(in Python v3.12\)") 
    
If a number is given, the confidence intervals for the given level are returned. For instance if alpha=.05, 95 % confidence intervals are returned where the standard deviation is computed according to Bartlett”s formula. 

**bartlett_confint**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `default` [`True`](https://docs.python.org/3/library/constants.html#True "\(in Python v3.12\)") 
    
Confidence intervals for ACF values are generally placed at 2 standard errors around r_k. The formula used for standard error depends upon the situation. If the autocorrelations are being used to test for randomness of residuals as part of the ARIMA routine, the standard errors are determined assuming the residuals are white noise. The approximate formula for any lag is that standard error of each r_k = 1/sqrt(N). See section 9.4 of [2] for more details on the 1/sqrt(N) result. For more elementary discussion, see section 5.3.2 in [3]. For the ACF of raw data, the standard error at a lag k is found as if the right model was an MA(k-1). This allows the possible interpretation that if all autocorrelations past a certain lag are within the limits, the model might be an MA of order defined by the last significant autocorrelation. In this case, a moving average model is assumed for the data and the standard errors for the confidence intervals should be generated using Bartlett’s formula. For more details on Bartlett formula result, see section 7.2 in [2]. 

**missing**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)"), `default` “none” 
    
A string in [“none”, “raise”, “conservative”, “drop”] specifying how the NaNs are to be treated. “none” performs no checks. “raise” raises an exception if NaN values are found. “drop” removes the missing observations and then estimates the autocovariances treating the non-missing as contiguous. “conservative” computes the autocovariance using nan-ops so that nans are removed when computing the mean and cross-products that are used to estimate the autocovariance. When using “conservative”, n is set to the number of non-missing observations. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf-returns "Permalink to this headline") 
     

**acf**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)") 
    
The autocorrelation function for lags 0, 1, …, nlags. Shape (nlags+1,). 

**confint**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)"), `optional` 
    
Confidence intervals for the ACF at lags 0, 1, …, nlags. Shape (nlags + 1, 2). Returned if alpha is not None. The confidence intervals are centered on the estimated ACF values. This behavior differs from plot_acf which centers the confidence intervals on 0. 

**qstat**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)"), `optional` 
    
The Ljung-Box Q-Statistic for lags 1, 2, …, nlags (excludes lag zero). Returned if q_stat is True. 

**pvalues**[`ndarray`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)"), `optional` 
    
The p-values associated with the Q-statistics for lags 1, 2, …, nlags (excludes lag zero). Returned if q_stat is True.
See also 

[`statsmodels.tsa.stattools.acf`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acf.html#statsmodels.tsa.stattools.acf "statsmodels.tsa.stattools.acf \(Python function\) — Calculate the autocorrelation function.")
    
Estimate the autocorrelation function. 

[`statsmodels.graphics.tsaplots.plot_acf`](https://www.statsmodels.org/stable/generated/statsmodels.graphics.tsaplots.plot_acf.html#statsmodels.graphics.tsaplots.plot_acf "statsmodels.graphics.tsaplots.plot_acf \(Python function\) — Plot the autocorrelation function")
    
Plot autocorrelations and confidence intervals.
Notes
The acf at lag 0 (ie., 1) is returned.
For very long time series it is recommended to use fft convolution instead. When fft is False uses a simple, direct estimator of the autocovariances that only computes the first nlag + 1 values. This can be much faster when the time series is long and only a small number of autocovariances are needed.
If adjusted is true, the denominator for the autocovariance is adjusted for the loss of data.
References
[1]
Parzen, E., 1963. On spectral analysis with missing observations and amplitude modulation. Sankhya: The Indian Journal of Statistics, Series A, pp.383-392.
[2]
Brockwell and Davis, 1987. Time Series Theory and Methods
[3]
Brockwell and Davis, 2010. Introduction to Time Series and Forecasting, 2nd edition.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.tsa.stattools.acovf  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.acovf.html) [ Next  statsmodels.tsa.stattools.pacf  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.stattools.pacf.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
