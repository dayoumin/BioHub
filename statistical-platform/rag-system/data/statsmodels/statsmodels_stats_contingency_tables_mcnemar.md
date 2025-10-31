---
title: statsmodels.stats.contingency_tables.mcnemar
description: McNemar 검정
source: https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.stats.contingency_tables.mcnemar

**Description**: McNemar 검정

**Original Documentation**: [statsmodels.stats.contingency_tables.mcnemar](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar)
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


statsmodels.stats.contingency_tables.mcnemar 
Type to start searching
[ statsmodels  ](https://github.com/statsmodels/statsmodels/ "Go to repository")
[ ![logo](https://www.statsmodels.org/stable/_static/statsmodels-logo-v2-bw.svg) ](https://www.statsmodels.org/stable/index.html "statsmodels 0.14.4") statsmodels 0.14.4 
[ statsmodels  ](https://github.com/statsmodels/statsmodels/ "Go to repository")
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
      * [ Statistics stats ](https://www.statsmodels.org/stable/stats.html)
      * [Contingency tables](https://www.statsmodels.org/stable/contingency_tables.html)
Contingency tables
        * [Module Reference](https://www.statsmodels.org/stable/contingency_tables.html#module-statsmodels.stats.contingency_tables)
Module Reference
          * [ statsmodels.stats.contingency_tables.Table ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.Table.html)
          * [ statsmodels.stats.contingency_tables.Table2x2 ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.Table2x2.html)
          * [ statsmodels.stats.contingency_tables.SquareTable ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.SquareTable.html)
          * [ statsmodels.stats.contingency_tables.StratifiedTable ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.StratifiedTable.html)
          * statsmodels.stats.contingency_tables.mcnemar [ statsmodels.stats.contingency_tables.mcnemar ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html)
            * [ Fstatsmodels.stats.contingency_tables.mcnemar ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-returns)
          * [ statsmodels.stats.contingency_tables.cochrans_q ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html)
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


  * [ Fstatsmodels.stats.contingency_tables.mcnemar ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-returns)


# statsmodels.stats.contingency_tables.mcnemar[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels-stats-contingency-tables-mcnemar "Link to this heading") 

statsmodels.stats.contingency_tables.mcnemar(_[table](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar "statsmodels.stats.contingency_tables.mcnemar.table \(Python parameter\)")_ , _[exact](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar "statsmodels.stats.contingency_tables.mcnemar.exact \(Python parameter\)") =`True`_, _[correction](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar "statsmodels.stats.contingency_tables.mcnemar.correction \(Python parameter\)") =`True`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/stats/contingency_tables.html#mcnemar)[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar "Link to this definition") 
    
McNemar test of homogeneity. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-parameters "Permalink to this headline") 
     

**table**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
A square contingency table. 

**exact**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)") 
    
If exact is true, then the binomial distribution will be used. If exact is false, then the chisquare distribution will be used, which is the approximation to the distribution of the test statistic for large sample sizes. 

**correction**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)") 
    
If true, then a continuity correction is used for the chisquare distribution (if exact is false.) 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html#statsmodels.stats.contingency_tables.mcnemar-returns "Permalink to this headline") 
     

`A` `bunch` `with` attributes:


**statistic**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") or [`int`](https://docs.python.org/3/library/functions.html#int "\(in Python v3.12\)"), [`array`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)") 
    
The test statistic is the chisquare statistic if exact is false. If the exact binomial distribution is used, then this contains the min(n1, n2), where n1, n2 are cases that are zero in one sample but one in the other sample. 

**pvalue**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") or [`array`](https://numpy.org/doc/stable/reference/generated/numpy.ndarray.html#numpy.ndarray "\(in NumPy v2.1\)") 
    
p-value of the null hypothesis of equal marginal distributions.
Notes
This is a special case of Cochran’s Q test, and of the homogeneity test. The results when the chisquare distribution is used are identical, except for continuity correction.
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.stats.contingency_tables.StratifiedTable.riskratio_pooled  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.StratifiedTable.riskratio_pooled.html) [ Next  statsmodels.stats.contingency_tables.cochrans_q  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
