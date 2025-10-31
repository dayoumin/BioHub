---
title: scipy.stats.wilcoxon
description: Wilcoxon Signed-Rank 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.wilcoxon

**Description**: Wilcoxon Signed-Rank 검정

**Original Documentation**: [scipy.stats.wilcoxon](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


Choose version 
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


Search `Ctrl`+`K`
Section Navigation
  * [scipy](https://docs.scipy.org/doc/scipy/reference/main_namespace.html)
  * [scipy.cluster](https://docs.scipy.org/doc/scipy/reference/cluster.html)
  * [scipy.constants](https://docs.scipy.org/doc/scipy/reference/constants.html)
  * [scipy.datasets](https://docs.scipy.org/doc/scipy/reference/datasets.html)
  * [scipy.differentiate](https://docs.scipy.org/doc/scipy/reference/differentiate.html)
  * [scipy.fft](https://docs.scipy.org/doc/scipy/reference/fft.html)
  * [scipy.fftpack](https://docs.scipy.org/doc/scipy/reference/fftpack.html)
  * [scipy.integrate](https://docs.scipy.org/doc/scipy/reference/integrate.html)
  * [scipy.interpolate](https://docs.scipy.org/doc/scipy/reference/interpolate.html)
  * [scipy.io](https://docs.scipy.org/doc/scipy/reference/io.html)
  * [scipy.linalg](https://docs.scipy.org/doc/scipy/reference/linalg.html)
  * [scipy.ndimage](https://docs.scipy.org/doc/scipy/reference/ndimage.html)
  * [scipy.odr](https://docs.scipy.org/doc/scipy/reference/odr.html)
  * [scipy.optimize](https://docs.scipy.org/doc/scipy/reference/optimize.html)
  * [scipy.signal](https://docs.scipy.org/doc/scipy/reference/signal.html)
  * [scipy.sparse](https://docs.scipy.org/doc/scipy/reference/sparse.html)
  * [scipy.spatial](https://docs.scipy.org/doc/scipy/reference/spatial.html)
  * [scipy.special](https://docs.scipy.org/doc/scipy/reference/special.html)
  * [scipy.stats](https://docs.scipy.org/doc/scipy/reference/stats.html)


  * [ ](https://docs.scipy.org/doc/scipy/index.html)
  * [SciPy API](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [Statistical functions (`scipy.stats`)](https://docs.scipy.org/doc/scipy/reference/stats.html)
  * wilcoxon


scipy.stats.
# wilcoxon[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#wilcoxon "Link to this heading") 

scipy.stats.wilcoxon(_x_ , _y =None_, _zero_method ='wilcox'_, _correction =False_, _alternative ='two-sided'_, _method ='auto'_, _*_ , _axis =0_, _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_morestats.py#L3520-L3756)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "Link to this definition") 
    
Calculate the Wilcoxon signed-rank test.
The Wilcoxon signed-rank test tests the null hypothesis that two related paired samples come from the same distribution. In particular, it tests whether the distribution of the differences `x - y` is symmetric about zero. It is a non-parametric version of the paired T-test. 

Parameters: 
     

**x** array_like 
    
Either the first set of measurements (in which case `y` is the second set of measurements), or the differences between two sets of measurements (in which case `y` is not to be specified.) Must be one-dimensional. 

**y** array_like, optional 
    
Either the second set of measurements (if `x` is the first set of measurements), or not specified (if `x` is the differences between two sets of measurements.) Must be one-dimensional.
Warning
When _y_ is provided, [`wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "scipy.stats.wilcoxon") calculates the test statistic based on the ranks of the absolute values of `d = x - y`. Roundoff error in the subtraction can result in elements of `d` being assigned different ranks even when they would be tied with exact arithmetic. Rather than passing _x_ and _y_ separately, consider computing the difference `x - y`, rounding as needed to ensure that only truly unique elements are numerically distinct, and passing the result as _x_ , leaving _y_ at the default (None). 

**zero_method**{“wilcox”, “pratt”, “zsplit”}, optional 
    
There are different conventions for handling pairs of observations with equal values (“zero-differences”, or “zeros”).
  * “wilcox”: Discards all zero-differences (default); see [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#r996422d5c98f-4).
  * “pratt”: Includes zero-differences in the ranking process, but drops the ranks of the zeros (more conservative); see [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#r996422d5c98f-3). In this case, the normal approximation is adjusted as in [[5]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#r996422d5c98f-5).
  * “zsplit”: Includes zero-differences in the ranking process and splits the zero rank between positive and negative ones.



**correction** bool, optional 
    
If True, apply continuity correction by adjusting the Wilcoxon rank statistic by 0.5 towards the mean value when computing the z-statistic if a normal approximation is used. Default is False. 

**alternative**{“two-sided”, “greater”, “less”}, optional 
    
Defines the alternative hypothesis. Default is ‘two-sided’. In the following, let `d` represent the difference between the paired samples: `d = x - y` if both `x` and `y` are provided, or `d = x` otherwise.
  * ‘two-sided’: the distribution underlying `d` is not symmetric about zero.
  * ‘less’: the distribution underlying `d` is stochastically less than a distribution symmetric about zero.
  * ‘greater’: the distribution underlying `d` is stochastically greater than a distribution symmetric about zero.



**method**{“auto”, “exact”, “asymptotic”} or [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") instance, optional 
    
Method to calculate the p-value, see Notes. Default is “auto”. 

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
     

An object with the following attributes.


**statistic** array_like 
    
If _alternative_ is “two-sided”, the sum of the ranks of the differences above or below zero, whichever is smaller. Otherwise the sum of the ranks of the differences above zero. 

**pvalue** array_like 
    
The p-value for the test depending on _alternative_ and _method_. 

**zstatistic** array_like 
    
When `method = 'asymptotic'`, this is the normalized z-statistic:
```
z = (T - mn - d) / se

```
Copy to clipboard
where `T` is _statistic_ as defined above, `mn` is the mean of the distribution under the null hypothesis, `d` is a continuity correction, and `se` is the standard error. When `method != 'asymptotic'`, this attribute is not available.
See also 

[`kruskal`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kruskal.html#scipy.stats.kruskal "scipy.stats.kruskal"), [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") 

Notes
In the following, let `d` represent the difference between the paired samples: `d = x - y` if both `x` and `y` are provided, or `d = x` otherwise. Assume that all elements of `d` are independent and identically distributed observations, and all are distinct and nonzero.
  * When `len(d)` is sufficiently large, the null distribution of the normalized test statistic (_zstatistic_ above) is approximately normal, and `method = 'asymptotic'` can be used to compute the p-value.
  * When `len(d)` is small, the normal approximation may not be accurate, and `method='exact'` is preferred (at the cost of additional execution time).
  * The default, `method='auto'`, selects between the two: `method='exact'` is used when `len(d) <= 50`, and `method='asymptotic'` is used otherwise.


The presence of “ties” (i.e. not all elements of `d` are unique) or “zeros” (i.e. elements of `d` are zero) changes the null distribution of the test statistic, and `method='exact'` no longer calculates the exact p-value. If `method='asymptotic'`, the z-statistic is adjusted for more accurate comparison against the standard normal, but still, for finite sample sizes, the standard normal is only an approximation of the true null distribution of the z-statistic. For such situations, the _method_ parameter also accepts instances of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod"). In this case, the p-value is computed using [`permutation_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html#scipy.stats.permutation_test "scipy.stats.permutation_test") with the provided configuration options and other appropriate settings.
The presence of ties and zeros affects the resolution of `method='auto'` accordingly: exhasutive permutations are performed when `len(d) <= 13`, and the asymptotic method is used otherwise. Note that they asymptotic method may not be very accurate even for `len(d) > 14`; the threshold was chosen as a compromise between execution time and accuracy under the constraint that the results must be deterministic. Consider providing an instance of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") method manually, choosing the `n_resamples` parameter to balance time constraints and accuracy requirements.
Please also note that in the edge case that all elements of `d` are zero, the p-value relying on the normal approximaton cannot be computed (NaN) if `zero_method='wilcox'` or `zero_method='pratt'`.
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[1]
<https://en.wikipedia.org/wiki/Wilcoxon_signed-rank_test>
[2]
Conover, W.J., Practical Nonparametric Statistics, 1971.
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#id2)]
Pratt, J.W., Remarks on Zeros and Ties in the Wilcoxon Signed Rank Procedures, Journal of the American Statistical Association, Vol. 54, 1959, pp. 655-667. [DOI:10.1080/01621459.1959.10501526](https://doi.org/10.1080/01621459.1959.10501526)
[4] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#id9))
Wilcoxon, F., Individual Comparisons by Ranking Methods, Biometrics Bulletin, Vol. 1, 1945, pp. 80-83. [DOI:10.2307/3001968](https://doi.org/10.2307/3001968)
[[5](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#id3)]
Cureton, E.E., The Normal Approximation to the Signed-Rank Sampling Distribution When Zero Differences are Present, Journal of the American Statistical Association, Vol. 62, 1967, pp. 1068-1069. [DOI:10.1080/01621459.1967.10500917](https://doi.org/10.1080/01621459.1967.10500917)
Examples
Try it in your browser!
In [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#r996422d5c98f-4), the differences in height between cross- and self-fertilized corn plants is given as follows:
```
>>> d = [6, 8, 14, 16, 23, 24, 28, 29, 41, -48, 49, 56, 60, -67, 75]

```
Copy to clipboard
Cross-fertilized plants appear to be higher. To test the null hypothesis that there is no height difference, we can apply the two-sided test:
```
>>> fromscipy.statsimport wilcoxon
>>> res = wilcoxon(d)
>>> res.statistic, res.pvalue
(24.0, 0.041259765625)

```
Copy to clipboard
Hence, we would reject the null hypothesis at a confidence level of 5%, concluding that there is a difference in height between the groups. To confirm that the median of the differences can be assumed to be positive, we use:
```
>>> res = wilcoxon(d, alternative='greater')
>>> res.statistic, res.pvalue
(96.0, 0.0206298828125)

```
Copy to clipboard
This shows that the null hypothesis that the median is negative can be rejected at a confidence level of 5% in favor of the alternative that the median is greater than zero. The p-values above are exact. Using the normal approximation gives very similar values:
```
>>> res = wilcoxon(d, method='asymptotic')
>>> res.statistic, res.pvalue
(24.0, 0.04088813291185591)

```
Copy to clipboard
Note that the statistic changed to 96 in the one-sided case (the sum of ranks of positive differences) whereas it is 24 in the two-sided case (the minimum of sum of ranks above and below zero).
In the example above, the differences in height between paired plants are provided to [`wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "scipy.stats.wilcoxon") directly. Alternatively, [`wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "scipy.stats.wilcoxon") accepts two samples of equal length, calculates the differences between paired elements, then performs the test. Consider the samples `x` and `y`:
```
>>> importnumpyasnp
>>> x = np.array([0.5, 0.825, 0.375, 0.5])
>>> y = np.array([0.525, 0.775, 0.325, 0.55])
>>> res = wilcoxon(x, y, alternative='greater')
>>> res
WilcoxonResult(statistic=5.0, pvalue=0.5625)

```
Copy to clipboard
Note that had we calculated the differences by hand, the test would have produced different results:
```
>>> d = [-0.025, 0.05, 0.05, -0.05]
>>> ref = wilcoxon(d, alternative='greater')
>>> ref
WilcoxonResult(statistic=6.0, pvalue=0.5)

```
Copy to clipboard
The substantial difference is due to roundoff error in the results of `x-y`:
```
>>> d - (x-y)
array([2.08166817e-17, 6.93889390e-17, 1.38777878e-17, 4.16333634e-17])

```
Copy to clipboard
Even though we expected all the elements of `(x-y)[1:]` to have the same magnitude `0.05`, they have slightly different magnitudes in practice, and therefore are assigned different ranks in the test. Before performing the test, consider calculating `d` and adjusting it as necessary to ensure that theoretically identically values are not numerically distinct. For example:
```
>>> d2 = np.around(x - y, decimals=3)
>>> wilcoxon(d2, alternative='greater')
WilcoxonResult(statistic=6.0, pvalue=0.5)

```
Copy to clipboard
Go BackOpen In Tab
[ previous ttest_rel ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_rel.html "previous page") [ next linregress ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html "next page")
On this page 
  * [`wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
