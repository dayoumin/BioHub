---
title: scipy.stats.entropy
description: Shannon 엔트로피
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.entropy

**Description**: Shannon 엔트로피

**Original Documentation**: [scipy.stats.entropy](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html)

---


  * entropy


scipy.stats.

# entropy[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#entropy "Link to this heading") 

scipy.stats.entropy(_pk_ , _qk =None_, _base =None_, _axis =0_, _*_ , _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_entropy.py#L17-L159)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#scipy.stats.entropy "Link to this definition") 
    
Calculate the Shannon entropy/relative entropy of given distribution(s).
If only probabilities _pk_ are given, the Shannon entropy is calculated as `H = -sum(pk * log(pk))`.
If _qk_ is not None, then compute the relative entropy `D = sum(pk * log(pk / qk))`. This quantity is also known as the Kullback-Leibler divergence.
This routine will normalize _pk_ and _qk_ if they don’t sum to 1. 

Parameters: 
     

**pk** array_like 
    
Defines the (discrete) distribution. Along each axis-slice of `pk`, element `i` is the (possibly unnormalized) probability of event `i`. 

**qk** array_like, optional 
    
Sequence against which the relative entropy is computed. Should be in the same format as _pk_. 

**base** float, optional 
    
The logarithmic base to use, defaults to `e` (natural logarithm). 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.


**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**S**{float, array_like} 
    
The calculated entropy.
Notes
Informally, the Shannon entropy quantifies the expected uncertainty inherent in the possible outcomes of a discrete random variable. For example, if messages consisting of sequences of symbols from a set are to be encoded and transmitted over a noiseless channel, then the Shannon entropy `H(pk)` gives a tight lower bound for the average number of units of information needed per symbol if the symbols occur with frequencies governed by the discrete distribution _pk_ [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#r7a63479d8f91-1). The choice of base determines the choice of units; e.g., `e` for nats, `2` for bits, etc.
The relative entropy, `D(pk|qk)`, quantifies the increase in the average number of units of information needed per symbol if the encoding is optimized for the probability distribution _qk_ instead of the true distribution _pk_. Informally, the relative entropy quantifies the expected excess in surprise experienced if one believes the true distribution is _qk_ when it is actually _pk_.
A related quantity, the cross entropy `CE(pk, qk)`, satisfies the equation `CE(pk, qk) = H(pk) + D(pk|qk)` and can also be calculated with the formula `CE = -sum(pk * log(qk))`. It gives the average number of units of information needed per symbol if an encoding is optimized for the probability distribution _qk_ when the true distribution is _pk_. It is not computed directly by [`entropy`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#scipy.stats.entropy "scipy.stats.entropy"), but it can be computed using two calls to the function (see Examples).
See [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#r7a63479d8f91-2) for more information.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[[1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#id1)]
Shannon, C.E. (1948), A Mathematical Theory of Communication. Bell System Technical Journal, 27: 379-423. <https://doi.org/10.1002/j.1538-7305.1948.tb01338.x>
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#id2)]
Thomas M. Cover and Joy A. Thomas. 2006. Elements of Information Theory (Wiley Series in Telecommunications and Signal Processing). Wiley-Interscience, USA.
Examples
Try it in your browser!
The outcome of a fair coin is the most uncertain:
```
>>> importnumpyasnp
>>> fromscipy.statsimport entropy
>>> base = 2  # work in units of bits
>>> pk = np.array([1/2, 1/2])  # fair coin
>>> H = entropy(pk, base=base)
>>> H
1.0
>>> H == -np.sum(pk * np.log(pk)) / np.log(base)
True

```
Copy to clipboard
The outcome of a biased coin is less uncertain:
```
>>> qk = np.array([9/10, 1/10])  # biased coin
>>> entropy(qk, base=base)
0.46899559358928117

```
Copy to clipboard
The relative entropy between the fair coin and biased coin is calculated as:
```
>>> D = entropy(pk, qk, base=base)
>>> D
0.7369655941662062
>>> np.isclose(D, np.sum(pk * np.log(pk/qk)) / np.log(base), rtol=4e-16, atol=0)
True

```
Copy to clipboard
The cross entropy can be calculated as the sum of the entropy and relative entropy`:
```
>>> CE = entropy(pk, base=base) + entropy(pk, qk, base=base)
>>> CE
1.736965594166206
>>> CE == -np.sum(pk * np.log(qk)) / np.log(base)
True

```
Copy to clipboard
Go BackOpen In Tab
[ previous mvsdist ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mvsdist.html "previous page") [ next differential_entropy ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.differential_entropy.html "next page")
On this page 
  * [`entropy`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.entropy.html#scipy.stats.entropy)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
