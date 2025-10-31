---
title: statsmodels.stats.contingency_tables.cochrans_q
description: Cochran's Q 검정
source: https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.stats.contingency_tables.cochrans_q

**Description**: Cochran's Q 검정

**Original Documentation**: [statsmodels.stats.contingency_tables.cochrans_q](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q)
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

statsmodels.stats.contingency_tables.cochrans_q 
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
          * [ statsmodels.stats.contingency_tables.mcnemar ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html)
          * statsmodels.stats.contingency_tables.cochrans_q [ statsmodels.stats.contingency_tables.cochrans_q ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html)
            * [ Fstatsmodels.stats.contingency_tables.cochrans_q ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-parameters)
              * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-returns)
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


  * [ Fstatsmodels.stats.contingency_tables.cochrans_q ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-parameters)
    * [ Returns ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-returns)


# statsmodels.stats.contingency_tables.cochrans_q[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels-stats-contingency-tables-cochrans-q "Link to this heading") 

statsmodels.stats.contingency_tables.cochrans_q(_[x](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q "statsmodels.stats.contingency_tables.cochrans_q.x \(Python parameter\)")_ , _[return_object](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q "statsmodels.stats.contingency_tables.cochrans_q.return_object \(Python parameter\)") =`True`_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/stats/contingency_tables.html#cochrans_q)[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q "Link to this definition") 
    
Cochran’s Q test for identical binomial proportions. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-parameters "Permalink to this headline") 
     

**x**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)"), 2d (`N`, `k`) 
    
data with N cases and k variables 

**return_object**[ bool](https://docs.python.org/3/library/stdtypes.html#bltin-boolean-values "\(in Python v3.12\)") 
    
Return values as bunch instead of as individual values. 

Returns:[¶](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.cochrans_q.html#statsmodels.stats.contingency_tables.cochrans_q-returns "Permalink to this headline") 
     

`Returns` `a` `bunch` `containing` `the` `following` `attributes`, `or` `the` 


`individual` `values` `according` `to` `the` `value` `of` return_object.


**statistic**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
test statistic 

**pvalue**[`float`](https://docs.python.org/3/library/functions.html#float "\(in Python v3.12\)") 
    
pvalue from the chisquare distribution
Notes
Cochran’s Q is a k-sample extension of the McNemar test. If there are only two groups, then Cochran’s Q test and the McNemar test are equivalent.
The procedure tests that the probability of success is the same for every group. The alternative hypothesis is that at least two groups have a different probability of success.
In Wikipedia terminology, rows are blocks and columns are treatments. The number of rows N, should be large for the chisquare distribution to be a good approximation.
The Null hypothesis of the test is that all treatments have the same effect.
References
<https://en.wikipedia.org/wiki/Cochran_test> SAS Manual for NPAR TESTS
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.stats.contingency_tables.mcnemar  ](https://www.statsmodels.org/stable/generated/statsmodels.stats.contingency_tables.mcnemar.html) [ Next  Multiple Imputation with Chained Equations  ](https://www.statsmodels.org/stable/imputation.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
