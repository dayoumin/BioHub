---
title: scipy.stats.trim_mean
description: 절사평균 (Trimmed Mean)
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.trim_mean

**Description**: 절사평균 (Trimmed Mean)

**Original Documentation**: [scipy.stats.trim_mean](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html)

---


  * trim_mean


scipy.stats.

# trim_mean[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#trim-mean "Link to this heading") 

scipy.stats.trim_mean(_a_ , _proportiontocut_ , _axis =0_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L3649-L3730)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean "Link to this definition") 
    
Return mean of array after trimming a specified fraction of extreme values
Removes the specified proportion of elements from _each_ end of the sorted array, then computes the mean of the remaining elements. 

Parameters: 
     

**a** array_like 
    
Input array. 

**proportiontocut** float 
    
Fraction of the most positive and most negative elements to remove. When the specified proportion does not result in an integer number of elements, the number of elements to trim is rounded down. 

**axis** int or None, default: 0 
    
Axis along which the trimmed means are computed. If None, compute over the raveled array. 

Returns: 
     

**trim_mean** ndarray 
    
Mean of trimmed array.
See also 

[`trimboth`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trimboth.html#scipy.stats.trimboth "scipy.stats.trimboth")
    
Remove a proportion of elements from each end of an array. 

[`tmean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tmean.html#scipy.stats.tmean "scipy.stats.tmean")
    
Compute the mean after trimming values outside specified limits.
Notes
For 1-D array _a_ , [`trim_mean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean "scipy.stats.trim_mean") is approximately equivalent to the following calculation:
```
importnumpyasnp
a = np.sort(a)
m = int(proportiontocut * len(a))
np.mean(a[m: len(a) - m])

```
Copy to clipboard
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> x = [1, 2, 3, 5]
>>> stats.trim_mean(x, 0.25)
2.5

```
Copy to clipboard
When the specified proportion does not result in an integer number of elements, the number of elements to trim is rounded down.
```
>>> stats.trim_mean(x, 0.24999) == np.mean(x)
True

```
Copy to clipboard
Use _axis_ to specify the axis along which the calculation is performed.
```
>>> x2 = [[1, 2, 3, 5],
...       [10, 20, 30, 50]]
>>> stats.trim_mean(x2, 0.25)
array([ 5.5, 11. , 16.5, 27.5])
>>> stats.trim_mean(x2, 0.25, axis=1)
array([ 2.5, 25. ])

```
Copy to clipboard
Go BackOpen In Tab
[ previous tiecorrect ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.tiecorrect.html "previous page") [ next gstd ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gstd.html "next page")
On this page 
  * [`trim_mean`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.trim_mean.html#scipy.stats.trim_mean)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
