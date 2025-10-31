---
title: statsmodels.tsa.seasonal.seasonal_decompose
description: 계절성 분해
source: https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.tsa.seasonal.seasonal_decompose

**Description**: 계절성 분해

**Original Documentation**: [statsmodels.tsa.seasonal.seasonal_decompose](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose)
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

statsmodels.tsa.seasonal.seasonal_decompose 
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
        * [ Descriptive Statistics and Tests ](https://www.statsmodels.org/stable/tsa.html#descriptive-statistics-and-tests)
        * [ Estimation ](https://www.statsmodels.org/stable/tsa.html#estimation)
        * [ ARMA Process ](https://www.statsmodels.org/stable/tsa.html#arma-process)
        * [ Autoregressive Distributed Lag (ARDL) Models ](https://www.statsmodels.org/stable/tsa.html#autoregressive-distributed-lag-ardl-models)
        * [ Error Correction Models (ECM) ](https://www.statsmodels.org/stable/tsa.html#error-correction-models-ecm)
        * [ Regime switching models ](https://www.statsmodels.org/stable/tsa.html#regime-switching-models)
        * [Time Series Filters](https://www.statsmodels.org/stable/tsa.html#time-series-filters)
Time Series Filters
          * [ statsmodels.tsa.filters.bk_filter.bkfilter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.bk_filter.bkfilter.html)
          * [ statsmodels.tsa.filters.hp_filter.hpfilter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.hp_filter.hpfilter.html)
          * [ statsmodels.tsa.filters.cf_filter.cffilter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.cf_filter.cffilter.html)
          * [ statsmodels.tsa.filters.filtertools.convolution_filter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.convolution_filter.html)
          * [ statsmodels.tsa.filters.filtertools.recursive_filter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.recursive_filter.html)
          * [ statsmodels.tsa.filters.filtertools.miso_lfilter ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.miso_lfilter.html)
          * [ statsmodels.tsa.filters.filtertools.fftconvolve3 ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.fftconvolve3.html)
          * [ statsmodels.tsa.filters.filtertools.fftconvolveinv ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.fftconvolveinv.html)
          * statsmodels.tsa.seasonal.seasonal_decompose [ statsmodels.tsa.seasonal.seasonal_decompose ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html)
            * [ Fstatsmodels.tsa.seasonal.seasonal_decompose ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-returns)
          * [ statsmodels.tsa.seasonal.STL ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html)
          * [ statsmodels.tsa.seasonal.MSTL ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.MSTL.html)
          * [ statsmodels.tsa.seasonal.DecomposeResult ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.DecomposeResult.html)
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


  * [ Fstatsmodels.tsa.seasonal.seasonal_decompose ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-returns)


# statsmodels.tsa.seasonal.seasonal_decompose[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels-tsa-seasonal-seasonal-decompose "Link to this heading") 

statsmodels.tsa.seasonal.seasonal_decompose(_[x](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.x \(Python parameter\)")_ , _[model](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.model \(Python parameter\)") =`'additive'`_, _[filt](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.filt \(Python parameter\)") =`None`_, _[period](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.period \(Python parameter\)") =`None`_, _[two_sided](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.two_sided \(Python parameter\)") =`True`_, _[extrapolate_trend](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "statsmodels.tsa.seasonal.seasonal_decompose.extrapolate_trend \(Python parameter\)") =`0`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/tsa/seasonal.html#seasonal_decompose)[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose "Link to this definition") 
    
Seasonal decomposition using moving averages. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Time series. If 2d, individual series are in columns. x must contain 2 complete cycles. 

**model**{“additive”, “multiplicative”}, `optional` 
    
Type of seasonal component. Abbreviations are accepted. 

**filt**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), `optional` 
    
The filter coefficients for filtering out the seasonal component. The concrete moving average method used in filtering is determined by two_sided. 

**period**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)"), `optional` 
    
Period of the series (e.g., 1 for annual, 4 for quarterly, etc). Must be used if x is not a pandas object or if the index of x does not have a frequency. Overrides default periodicity of x if x is a pandas object with a timeseries index. 

**two_sided**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)"), `optional` 
    
The moving average method used in filtering. If True (default), a centered moving average is computed using the filt. If False, the filter coefficients are for past values only. 

**extrapolate_trend**[`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)") or ‘freq’, `optional` 
    
If set to > 0, the trend resulting from the convolution is linear least-squares extrapolated on both ends (or the single one if two_sided is False) considering this many (+1) closest points. If set to ‘freq’, use freq closest points. Setting this parameter results in no NaN values in trend or resid components. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.seasonal_decompose.html#statsmodels.tsa.seasonal.seasonal_decompose-returns "Permalink to this headline") 
     

[`DecomposeResult`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.DecomposeResult.html#statsmodels.tsa.seasonal.DecomposeResult "statsmodels.tsa.seasonal.DecomposeResult \(Python class\) — Results class for seasonal decompositions")
    
A object with seasonal, trend, and resid attributes.
See also 

[`statsmodels.tsa.filters.bk_filter.bkfilter`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.bk_filter.bkfilter.html#statsmodels.tsa.filters.bk_filter.bkfilter "statsmodels.tsa.filters.bk_filter.bkfilter \(Python function\) — Filter a time series using the Baxter-King bandpass filter.")
    
Baxter-King filter. 

[`statsmodels.tsa.filters.cf_filter.cffilter`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.cf_filter.cffilter.html#statsmodels.tsa.filters.cf_filter.cffilter "statsmodels.tsa.filters.cf_filter.cffilter \(Python function\) — Christiano Fitzgerald asymmetric, random walk filter.")
    
Christiano-Fitzgerald asymmetric, random walk filter. 

[`statsmodels.tsa.filters.hp_filter.hpfilter`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.hp_filter.hpfilter.html#statsmodels.tsa.filters.hp_filter.hpfilter "statsmodels.tsa.filters.hp_filter.hpfilter \(Python function\) — Hodrick-Prescott filter.")
    
Hodrick-Prescott filter. 

`statsmodels.tsa.filters.convolution_filter`
    
Linear filtering via convolution. 

[`statsmodels.tsa.seasonal.STL`](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html#statsmodels.tsa.seasonal.STL "statsmodels.tsa.seasonal.STL \(Python class\) — Season-Trend decomposition using LOESS.")
    
Season-Trend decomposition using LOESS.
Notes
This is a naive decomposition. More sophisticated methods should be preferred.
The additive model is Y[t] = T[t] + S[t] + e[t]
The multiplicative model is Y[t] = T[t] * S[t] * e[t]
The results are obtained by first estimating the trend by applying a convolution filter to the data. The trend is then removed from the series and the average of this de-trended series for each period is the returned seasonal component.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.tsa.filters.filtertools.fftconvolveinv  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.filters.filtertools.fftconvolveinv.html) [ Next  statsmodels.tsa.seasonal.STL  ](https://www.statsmodels.org/stable/generated/statsmodels.tsa.seasonal.STL.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
