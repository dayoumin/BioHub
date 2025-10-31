---
title: scipy.mannwhitneyu
description: Mann-Whitney U 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.mannwhitneyu

**Description**: Mann-Whitney U 검정

**Original Documentation**: [scipy.mannwhitneyu](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.mannwhitneyu.html)
Light Dark System Settings
  * [ GitHub](https://github.com/scipy/scipy)
  * [ Scientific Python Forum](https://discuss.scientific-python.org/c/contributor/scipy/)


  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.mannwhitneyu.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.mannwhitneyu.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.mannwhitneyu.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.mannwhitneyu.html)
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
  * mannwhitneyu


scipy.stats.
# mannwhitneyu[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#mannwhitneyu "Link to this heading") 

scipy.stats.mannwhitneyu(_x_ , _y_ , _use_continuity =True_, _alternative ='two-sided'_, _axis =0_, _method ='auto'_, _*_ , _nan_policy ='propagate'_, _keepdims =False_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_mannwhitneyu.py#L227-L492)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "Link to this definition") 
    
Perform the Mann-Whitney U rank test on two independent samples.
The Mann-Whitney U test is a nonparametric test of the null hypothesis that the distribution underlying sample _x_ is the same as the distribution underlying sample _y_. It is often used as a test of difference in location between distributions. 

Parameters: 
     

**x, y** array-like 
    
N-d arrays of samples. The arrays must be broadcastable except along the dimension given by _axis_. 

**use_continuity** bool, optional 
    
Whether a continuity correction (1/2) should be applied. Default is True when _method_ is `'asymptotic'`; has no effect otherwise. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. Default is ‘two-sided’. Let _SX(u)_ and _SY(u)_ be the survival functions of the distributions underlying _x_ and _y_ , respectively. Then the following alternative hypotheses are available:
  * ‘two-sided’: the distributions are not equal, i.e. _SX(u) ≠ SY(u)_ for at least one _u_.
  * ‘less’: the distribution underlying _x_ is stochastically less than the distribution underlying _y_ , i.e. _SX(u) < SY(u)_ for all _u_.
  * ‘greater’: the distribution underlying _x_ is stochastically greater than the distribution underlying _y_ , i.e. _SX(u) > SY(u)_ for all _u_.


Under a more restrictive set of assumptions, the alternative hypotheses can be expressed in terms of the locations of the distributions; see [[5]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-5) section 5.1. 

**axis** int or None, default: 0 
    
If an int, the axis of the input along which to compute the statistic. The statistic of each axis-slice (e.g. row) of the input will appear in a corresponding element of the output. If `None`, the input will be raveled before computing the statistic. 

**method**{‘auto’, ‘asymptotic’, ‘exact’} or [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") instance, optional 
    
Selects the method used to calculate the _p_ -value. Default is ‘auto’. The following options are available.
  * `'asymptotic'`: compares the standardized test statistic against the normal distribution, correcting for ties.
  * `'exact'`: computes the exact _p_ -value by comparing the observed \\(U\\) statistic against the exact distribution of the \\(U\\) statistic under the null hypothesis. No correction is made for ties.
  * `'auto'`: chooses `'exact'` when the size of one of the samples is less than or equal to 8 and there are no ties; chooses `'asymptotic'` otherwise.
  * [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") instance. In this case, the p-value is computed using [`permutation_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html#scipy.stats.permutation_test "scipy.stats.permutation_test") with the provided configuration options and other appropriate settings.



**nan_policy**{‘propagate’, ‘omit’, ‘raise’} 
    
Defines how to handle input NaNs.
  * `propagate`: if a NaN is present in the axis slice (e.g. row) along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `omit`: NaNs will be omitted when performing the calculation. If insufficient data remains in the axis slice along which the statistic is computed, the corresponding entry of the output will be NaN.
  * `raise`: if a NaN is present, a `ValueError` will be raised.



**keepdims** bool, default: False 
    
If this is set to True, the axes which are reduced are left in the result as dimensions with size one. With this option, the result will broadcast correctly against the input array. 

Returns: 
     

**res** MannwhitneyuResult 
    
An object containing attributes: 

statisticfloat 
    
The Mann-Whitney U statistic corresponding with sample _x_. See Notes for the test statistic corresponding with sample _y_. 

pvaluefloat 
    
The associated _p_ -value for the chosen _alternative_.
See also 

[`scipy.stats.wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "scipy.stats.wilcoxon"), [`scipy.stats.ranksums`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ranksums.html#scipy.stats.ranksums "scipy.stats.ranksums"), [`scipy.stats.ttest_ind`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html#scipy.stats.ttest_ind "scipy.stats.ttest_ind") 

Notes
If `U1` is the statistic corresponding with sample _x_ , then the statistic corresponding with sample _y_ is `U2 = x.shape[axis] * y.shape[axis] - U1`.
[`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") is for independent samples. For related / paired samples, consider [`scipy.stats.wilcoxon`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.wilcoxon.html#scipy.stats.wilcoxon "scipy.stats.wilcoxon").
_method_ `'exact'` is recommended when there are no ties and when either sample size is less than 8 [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-1). The implementation follows the algorithm reported in [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-3). Note that the exact method is _not_ corrected for ties, but [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") will not raise errors or warnings if there are ties in the data. If there are ties and either samples is small (fewer than ~10 observations), consider passing an instance of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod") as the _method_ to perform a permutation test.
The Mann-Whitney U test is a non-parametric version of the t-test for independent samples. When the means of samples from the populations are normally distributed, consider [`scipy.stats.ttest_ind`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html#scipy.stats.ttest_ind "scipy.stats.ttest_ind").
Beginning in SciPy 1.9, `np.matrix` inputs (not recommended for new code) are converted to `np.ndarray` before the calculation is performed. In this case, the output will be a scalar or `np.ndarray` of appropriate shape rather than a 2D `np.matrix`. Similarly, while masked elements of masked arrays are ignored, the output will be a scalar or `np.ndarray` rather than a masked array with `mask=False`.
References
[[1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id2)]
H.B. Mann and D.R. Whitney, “On a test of whether one of two random variables is stochastically larger than the other”, The Annals of Mathematical Statistics, Vol. 18, pp. 50-60, 1947.
[2]
Mann-Whitney U Test, Wikipedia, <http://en.wikipedia.org/wiki/Mann-Whitney_U_test>
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id3)]
Andreas Löffler, “Über eine Partition der nat. Zahlen und ihr Anwendung beim U-Test”, Wiss. Z. Univ. Halle, XXXII’83 pp. 87-89.
[4] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id9),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id10),[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id11),[4](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id12),[5](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id13),[6](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id14),[7](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id15))
Rosie Shier, “Statistics: 2.3 The Mann-Whitney U Test”, Mathematics Learning Support Centre, 2004.
[[5](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#id1)]
Michael P. Fay and Michael A. Proschan. “Wilcoxon-Mann-Whitney or t-test? On assumptions for hypothesis tests and multiple interpretations of decision rules.” Statistics surveys, Vol. 4, pp. 1-39, 2010. <https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2857732/>
Examples
Try it in your browser!
We follow the example from [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4): nine randomly sampled young adults were diagnosed with type II diabetes at the ages below.
```
>>> males = [19, 22, 16, 29, 24]
>>> females = [20, 11, 17, 12]

```
Copy to clipboard
We use the Mann-Whitney U test to assess whether there is a statistically significant difference in the diagnosis age of males and females. The null hypothesis is that the distribution of male diagnosis ages is the same as the distribution of female diagnosis ages. We decide that a confidence level of 95% is required to reject the null hypothesis in favor of the alternative that the distributions are different. Since the number of samples is very small and there are no ties in the data, we can compare the observed test statistic against the _exact_ distribution of the test statistic under the null hypothesis.
```
>>> fromscipy.statsimport mannwhitneyu
>>> U1, p = mannwhitneyu(males, females, method="exact")
>>> print(U1)
17.0

```
Copy to clipboard
[`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") always reports the statistic associated with the first sample, which, in this case, is males. This agrees with \\(U_M = 17\\) reported in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4). The statistic associated with the second statistic can be calculated:
```
>>> nx, ny = len(males), len(females)
>>> U2 = nx*ny - U1
>>> print(U2)
3.0

```
Copy to clipboard
This agrees with \\(U_F = 3\\) reported in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4). The two-sided _p_ -value can be calculated from either statistic, and the value produced by [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") agrees with \\(p = 0.11\\) reported in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4).
```
>>> print(p)
0.1111111111111111

```
Copy to clipboard
The exact distribution of the test statistic is asymptotically normal, so the example continues by comparing the exact _p_ -value against the _p_ -value produced using the normal approximation.
```
>>> _, pnorm = mannwhitneyu(males, females, method="asymptotic")
>>> print(pnorm)
0.11134688653314041

```
Copy to clipboard
Here [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu")’s reported _p_ -value appears to conflict with the value \\(p = 0.09\\) given in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4). The reason is that [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4) does not apply the continuity correction performed by [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu"); [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu "scipy.stats.mannwhitneyu") reduces the distance between the test statistic and the mean \\(\mu = n_x n_y / 2\\) by 0.5 to correct for the fact that the discrete statistic is being compared against a continuous distribution. Here, the \\(U\\) statistic used is less than the mean, so we reduce the distance by adding 0.5 in the numerator.
```
>>> importnumpyasnp
>>> fromscipy.statsimport norm
>>> U = min(U1, U2)
>>> N = nx + ny
>>> z = (U - nx*ny/2 + 0.5) / np.sqrt(nx*ny * (N + 1)/ 12)
>>> p = 2 * norm.cdf(z)  # use CDF to get p-value from smaller statistic
>>> print(p)
0.11134688653314041

```
Copy to clipboard
If desired, we can disable the continuity correction to get a result that agrees with that reported in [[4]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#r31b0b1c0fec3-4).
```
>>> _, pnorm = mannwhitneyu(males, females, use_continuity=False,
...                         method="asymptotic")
>>> print(pnorm)
0.0864107329737

```
Copy to clipboard
Regardless of whether we perform an exact or asymptotic test, the probability of the test statistic being as extreme or more extreme by chance exceeds 5%, so we do not consider the results statistically significant.
Suppose that, before seeing the data, we had hypothesized that females would tend to be diagnosed at a younger age than males. In that case, it would be natural to provide the female ages as the first input, and we would have performed a one-sided test using `alternative = 'less'`: females are diagnosed at an age that is stochastically less than that of males.
```
>>> res = mannwhitneyu(females, males, alternative="less", method="exact")
>>> print(res)
MannwhitneyuResult(statistic=3.0, pvalue=0.05555555555555555)

```
Copy to clipboard
Again, the probability of getting a sufficiently low value of the test statistic by chance under the null hypothesis is greater than 5%, so we do not reject the null hypothesis in favor of our alternative.
If it is reasonable to assume that the means of samples from the populations are normally distributed, we could have used a t-test to perform the analysis.
```
>>> fromscipy.statsimport ttest_ind
>>> res = ttest_ind(females, males, alternative="less")
>>> print(res)
TtestResult(statistic=-2.239334696520584,
            pvalue=0.030068441095757924,
            df=7.0)

```
Copy to clipboard
Under this assumption, the _p_ -value would be low enough to reject the null hypothesis in favor of the alternative.
Go BackOpen In Tab
[ previous ttest_ind ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html "previous page") [ next bws_test ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bws_test.html "next page")
On this page 
  * [`mannwhitneyu`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.mannwhitneyu.html#scipy.stats.mannwhitneyu)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
