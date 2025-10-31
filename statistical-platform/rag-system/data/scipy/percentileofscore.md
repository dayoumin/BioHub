---
title: scipy.stats.percentileofscore
description: 백분위 점수
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.percentileofscore

**Description**: 백분위 점수

**Original Documentation**: [scipy.stats.percentileofscore](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html)

---


  * percentileofscore


scipy.stats.

# percentileofscore[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html#percentileofscore "Link to this heading") 

scipy.stats.percentileofscore(_a_ , _score_ , _kind ='rank'_, _nan_policy ='propagate'_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L2115-L2262)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html#scipy.stats.percentileofscore "Link to this definition") 
    
Compute the percentile rank of a score relative to a list of scores.
A [`percentileofscore`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html#scipy.stats.percentileofscore "scipy.stats.percentileofscore") of, for example, 80% means that 80% of the scores in _a_ are below the given score. In the case of gaps or ties, the exact definition depends on the optional keyword, _kind_. 

Parameters: 
     

**a** array_like 
    
A 1-D array to which _score_ is compared. 

**score** array_like 
    
Scores to compute percentiles for. 

**kind**{‘rank’, ‘weak’, ‘strict’, ‘mean’}, optional 
    
Specifies the interpretation of the resulting score. The following options are available (default is ‘rank’):
>   * ‘rank’: Average percentage ranking of score. In case of multiple matches, average the percentage rankings of all matching scores.
>   * ‘weak’: This kind corresponds to the definition of a cumulative distribution function. A percentileofscore of 80% means that 80% of values are less than or equal to the provided score.
>   * ‘strict’: Similar to “weak”, except that only values that are strictly less than the given score are counted.
>   * ‘mean’: The average of the “weak” and “strict” scores, often used in testing. See <https://en.wikipedia.org/wiki/Percentile_rank>
> 


**nan_policy**{‘propagate’, ‘raise’, ‘omit’}, optional 
    
Specifies how to treat _nan_ values in _a_. The following options are available (default is ‘propagate’):
>   * ‘propagate’: returns nan (for each value in _score_).
>   * ‘raise’: throws an error
>   * ‘omit’: performs the calculations ignoring nan values
> 


Returns: 
     

**pcos** float 
    
Percentile-position of score (0-100) relative to _a_.
See also 

[`numpy.percentile`](https://numpy.org/doc/stable/reference/generated/numpy.percentile.html#numpy.percentile "\(in NumPy v2.3\)")


[`scipy.stats.scoreatpercentile`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.scoreatpercentile.html#scipy.stats.scoreatpercentile "scipy.stats.scoreatpercentile"), [`scipy.stats.rankdata`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.rankdata.html#scipy.stats.rankdata "scipy.stats.rankdata") 

Examples
Try it in your browser!
Three-quarters of the given values lie below a given score:
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> stats.percentileofscore([1, 2, 3, 4], 3)
75.0

```
Copy to clipboard
With multiple matches, note how the scores of the two matches, 0.6 and 0.8 respectively, are averaged:
```
>>> stats.percentileofscore([1, 2, 3, 3, 4], 3)
70.0

```
Copy to clipboard
Only 2/5 values are strictly less than 3:
```
>>> stats.percentileofscore([1, 2, 3, 3, 4], 3, kind='strict')
40.0

```
Copy to clipboard
But 4/5 values are less than or equal to 3:
```
>>> stats.percentileofscore([1, 2, 3, 3, 4], 3, kind='weak')
80.0

```
Copy to clipboard
The average between the weak and the strict scores is:
```
>>> stats.percentileofscore([1, 2, 3, 3, 4], 3, kind='mean')
60.0

```
Copy to clipboard
Score arrays (of any dimensionality) are supported:
```
>>> stats.percentileofscore([1, 2, 3, 3, 4], [2, 3])
array([40., 70.])

```
Copy to clipboard
The inputs can be infinite:
```
>>> stats.percentileofscore([-np.inf, 0, 1, np.inf], [1, 2, np.inf])
array([75., 75., 100.])

```
Copy to clipboard
If _a_ is empty, then the resulting percentiles are all _nan_ :
```
>>> stats.percentileofscore([], [1, 2])
array([nan, nan])

```
Copy to clipboard
Go BackOpen In Tab
[ previous quantile ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.quantile.html "previous page") [ next scoreatpercentile ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.scoreatpercentile.html "next page")
On this page 
  * [`percentileofscore`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.percentileofscore.html#scipy.stats.percentileofscore)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
