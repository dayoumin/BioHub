---
title: scipy.stats.pearsonr
description: Pearson 상관계수
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.pearsonr

**Description**: Pearson 상관계수

**Original Documentation**: [scipy.stats.pearsonr](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html)

---

[Skip to main content](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#main-content)
Back to top `Ctrl`+`K`
[ ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) ![](https://docs.scipy.org/doc/scipy/_static/logo.svg) SciPy ](https://docs.scipy.org/doc/scipy/index.html)
  * [ Installing ](https://scipy.org/install/)
  * [ User Guide ](https://docs.scipy.org/doc/scipy/tutorial/index.html)
  * [ API reference ](https://docs.scipy.org/doc/scipy/reference/index.html)
  * [ Building from source ](https://docs.scipy.org/doc/scipy/building/index.html)
  * [ Development ](https://docs.scipy.org/doc/scipy/dev/index.html)
  * [ Release notes ](https://docs.scipy.org/doc/scipy/release.html)


1.16.2 (stable)
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.pearsonr.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.pearsonr.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.pearsonr.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.pearsonr.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.pearsonr.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.pearsonr.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.pearsonr.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.pearsonr.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.pearsonr.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.pearsonr.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.pearsonr.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.pearsonr.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.pearsonr.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.pearsonr.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.pearsonr.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.pearsonr.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.pearsonr.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.pearsonr.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.pearsonr.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.pearsonr.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.pearsonr.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.pearsonr.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.pearsonr.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.pearsonr.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.pearsonr.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.pearsonr.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.pearsonr.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.pearsonr.html)
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
[development](https://scipy.github.io/devdocs/reference/generated/scipy.stats.pearsonr.html)[1.16.2 (stable)](https://docs.scipy.org/doc/scipy-1.16.2/reference/generated/scipy.stats.pearsonr.html)[1.16.1](https://docs.scipy.org/doc/scipy-1.16.1/reference/generated/scipy.stats.pearsonr.html)[1.16.0](https://docs.scipy.org/doc/scipy-1.16.0/reference/generated/scipy.stats.pearsonr.html)[1.15.3](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.pearsonr.html)[1.15.2](https://docs.scipy.org/doc/scipy-1.15.2/reference/generated/scipy.stats.pearsonr.html)[1.15.1](https://docs.scipy.org/doc/scipy-1.15.1/reference/generated/scipy.stats.pearsonr.html)[1.15.0](https://docs.scipy.org/doc/scipy-1.15.0/reference/generated/scipy.stats.pearsonr.html)[1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.pearsonr.html)[1.14.0](https://docs.scipy.org/doc/scipy-1.14.0/reference/generated/scipy.stats.pearsonr.html)[1.13.1](https://docs.scipy.org/doc/scipy-1.13.1/reference/generated/scipy.stats.pearsonr.html)[1.13.0](https://docs.scipy.org/doc/scipy-1.13.0/reference/generated/scipy.stats.pearsonr.html)[1.12.0](https://docs.scipy.org/doc/scipy-1.12.0/reference/generated/scipy.stats.pearsonr.html)[1.11.4](https://docs.scipy.org/doc/scipy-1.11.4/reference/generated/scipy.stats.pearsonr.html)[1.11.3](https://docs.scipy.org/doc/scipy-1.11.3/reference/generated/scipy.stats.pearsonr.html)[1.11.2](https://docs.scipy.org/doc/scipy-1.11.2/reference/generated/scipy.stats.pearsonr.html)[1.11.1](https://docs.scipy.org/doc/scipy-1.11.1/reference/generated/scipy.stats.pearsonr.html)[1.11.0](https://docs.scipy.org/doc/scipy-1.11.0/reference/generated/scipy.stats.pearsonr.html)[1.10.1](https://docs.scipy.org/doc/scipy-1.10.1/reference/generated/scipy.stats.pearsonr.html)[1.10.0](https://docs.scipy.org/doc/scipy-1.10.0/reference/generated/scipy.stats.pearsonr.html)[1.9.3](https://docs.scipy.org/doc/scipy-1.9.3/reference/generated/scipy.stats.pearsonr.html)[1.9.2](https://docs.scipy.org/doc/scipy-1.9.2/reference/generated/scipy.stats.pearsonr.html)[1.9.1](https://docs.scipy.org/doc/scipy-1.9.1/reference/generated/scipy.stats.pearsonr.html)[1.9.0](https://docs.scipy.org/doc/scipy-1.9.0/reference/generated/scipy.stats.pearsonr.html)[1.8.1](https://docs.scipy.org/doc/scipy-1.8.1/reference/generated/scipy.stats.pearsonr.html)[1.8.0](https://docs.scipy.org/doc/scipy-1.8.0/reference/generated/scipy.stats.pearsonr.html)[1.7.1](https://docs.scipy.org/doc/scipy-1.7.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.7.0](https://docs.scipy.org/doc/scipy-1.7.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.3](https://docs.scipy.org/doc/scipy-1.6.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.2](https://docs.scipy.org/doc/scipy-1.6.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.1](https://docs.scipy.org/doc/scipy-1.6.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.6.0](https://docs.scipy.org/doc/scipy-1.6.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.4](https://docs.scipy.org/doc/scipy-1.5.4/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.3](https://docs.scipy.org/doc/scipy-1.5.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.2](https://docs.scipy.org/doc/scipy-1.5.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.1](https://docs.scipy.org/doc/scipy-1.5.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.5.0](https://docs.scipy.org/doc/scipy-1.5.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.4.1](https://docs.scipy.org/doc/scipy-1.4.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.4.0](https://docs.scipy.org/doc/scipy-1.4.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.3](https://docs.scipy.org/doc/scipy-1.3.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.2](https://docs.scipy.org/doc/scipy-1.3.2/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.1](https://docs.scipy.org/doc/scipy-1.3.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.3.0](https://docs.scipy.org/doc/scipy-1.3.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.3](https://docs.scipy.org/doc/scipy-1.2.3/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.1](https://docs.scipy.org/doc/scipy-1.2.1/reference/reference/generated/scipy.stats.pearsonr.html)[1.2.0](https://docs.scipy.org/doc/scipy-1.2.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.1.0](https://docs.scipy.org/doc/scipy-1.1.0/reference/reference/generated/scipy.stats.pearsonr.html)[1.0.0](https://docs.scipy.org/doc/scipy-1.0.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.19.0](https://docs.scipy.org/doc/scipy-0.19.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.18.1](https://docs.scipy.org/doc/scipy-0.18.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.18.0](https://docs.scipy.org/doc/scipy-0.18.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.17.1](https://docs.scipy.org/doc/scipy-0.17.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.17.0](https://docs.scipy.org/doc/scipy-0.17.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.16.1](https://docs.scipy.org/doc/scipy-0.16.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.16.0](https://docs.scipy.org/doc/scipy-0.16.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.15.1](https://docs.scipy.org/doc/scipy-0.15.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.15.0](https://docs.scipy.org/doc/scipy-0.15.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.14.1](https://docs.scipy.org/doc/scipy-0.14.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.14.0](https://docs.scipy.org/doc/scipy-0.14.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.13.0](https://docs.scipy.org/doc/scipy-0.13.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.12.0](https://docs.scipy.org/doc/scipy-0.12.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.11.0](https://docs.scipy.org/doc/scipy-0.11.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.10.1](https://docs.scipy.org/doc/scipy-0.10.1/reference/reference/generated/scipy.stats.pearsonr.html)[0.10.0](https://docs.scipy.org/doc/scipy-0.10.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.9.0](https://docs.scipy.org/doc/scipy-0.9.0/reference/reference/generated/scipy.stats.pearsonr.html)[0.8](https://docs.scipy.org/doc/scipy-0.8/reference/reference/generated/scipy.stats.pearsonr.html)[0.7](https://docs.scipy.org/doc/scipy-0.7/reference/reference/generated/scipy.stats.pearsonr.html)
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
  * pearsonr


scipy.stats.
# pearsonr[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#pearsonr "Link to this heading") 

scipy.stats.pearsonr(_x_ , _y_ , _*_ , _alternative ='two-sided'_, _method =None_, _axis =0_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_stats_py.py#L4390-L4799)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "Link to this definition") 
    
Pearson correlation coefficient and p-value for testing non-correlation.
The Pearson correlation coefficient [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#r8c6348c62346-1) measures the linear relationship between two datasets. Like other correlation coefficients, this one varies between -1 and +1 with 0 implying no correlation. Correlations of -1 or +1 imply an exact linear relationship. Positive correlations imply that as x increases, so does y. Negative correlations imply that as x increases, y decreases.
This function also performs a test of the null hypothesis that the distributions underlying the samples are uncorrelated and normally distributed. (See Kowalski [[3]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#r8c6348c62346-3) for a discussion of the effects of non-normality of the input on the distribution of the correlation coefficient.) The p-value roughly indicates the probability of an uncorrelated system producing datasets that have a Pearson correlation at least as extreme as the one computed from these datasets. 

Parameters: 
     

**x** array_like 
    
Input array. 

**y** array_like 
    
Input array. 

**axis** int or None, default 
    
Axis along which to perform the calculation. Default is 0. If None, ravel both arrays before performing the calculation.
Added in version 1.14.0. 

**alternative**{‘two-sided’, ‘greater’, ‘less’}, optional 
    
Defines the alternative hypothesis. Default is ‘two-sided’. The following options are available:
  * ‘two-sided’: the correlation is nonzero
  * ‘less’: the correlation is negative (less than zero)
  * ‘greater’: the correlation is positive (greater than zero)


Added in version 1.9.0. 

**method** ResamplingMethod, optional 
    
Defines the method used to compute the p-value. If _method_ is an instance of [`PermutationMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.PermutationMethod.html#scipy.stats.PermutationMethod "scipy.stats.PermutationMethod")/[`MonteCarloMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.MonteCarloMethod.html#scipy.stats.MonteCarloMethod "scipy.stats.MonteCarloMethod"), the p-value is computed using [`scipy.stats.permutation_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.permutation_test.html#scipy.stats.permutation_test "scipy.stats.permutation_test")/[`scipy.stats.monte_carlo_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.monte_carlo_test.html#scipy.stats.monte_carlo_test "scipy.stats.monte_carlo_test") with the provided configuration options and other appropriate settings. Otherwise, the p-value is computed as documented in the notes.
Added in version 1.11.0. 

Returns: 
     

**result**[`PearsonRResult`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats._result_classes.PearsonRResult.html#scipy.stats._result_classes.PearsonRResult "scipy.stats._result_classes.PearsonRResult") 
    
An object with the following attributes: 

statisticfloat 
    
Pearson product-moment correlation coefficient. 

pvaluefloat 
    
The p-value associated with the chosen alternative.
The object has the following method: 

confidence_interval(confidence_level, method)
    
This computes the confidence interval of the correlation coefficient _statistic_ for the given confidence level. The confidence interval is returned in a `namedtuple` with fields _low_ and _high_. If _method_ is not provided, the confidence interval is computed using the Fisher transformation [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#r8c6348c62346-1). If _method_ is an instance of [`BootstrapMethod`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.BootstrapMethod.html#scipy.stats.BootstrapMethod "scipy.stats.BootstrapMethod"), the confidence interval is computed using [`scipy.stats.bootstrap`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html#scipy.stats.bootstrap "scipy.stats.bootstrap") with the provided configuration options and other appropriate settings. In some cases, confidence limits may be NaN due to a degenerate resample, and this is typical for very small samples (~6 observations). 

Raises: 
     

ValueError
    
If _x_ and _y_ do not have length at least 2. 

Warns: 
     

[`ConstantInputWarning`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ConstantInputWarning.html#scipy.stats.ConstantInputWarning "scipy.stats.ConstantInputWarning")
    
Raised if an input is a constant array. The correlation coefficient is not defined in this case, so `np.nan` is returned. 

[`NearConstantInputWarning`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.NearConstantInputWarning.html#scipy.stats.NearConstantInputWarning "scipy.stats.NearConstantInputWarning")
    
Raised if an input is “nearly” constant. The array `x` is considered nearly constant if `norm(x - mean(x)) < 1e-13 * abs(mean(x))`. Numerical errors in the calculation `x - mean(x)` in this case might result in an inaccurate calculation of r.
See also 

[`spearmanr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html#scipy.stats.spearmanr "scipy.stats.spearmanr")
    
Spearman rank-order correlation coefficient. 

[`kendalltau`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.kendalltau.html#scipy.stats.kendalltau "scipy.stats.kendalltau")
    
Kendall’s tau, a correlation measure for ordinal data. 

[Pearson’s Correlation](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_pearsonr.html#hypothesis-pearsonr)
    
Extended example
Notes
The correlation coefficient is calculated as follows:
\\[r = \frac{\sum (x - m_x) (y - m_y)} {\sqrt{\sum (x - m_x)^2 \sum (y - m_y)^2}}\\]
where \\(m_x\\) is the mean of the vector x and \\(m_y\\) is the mean of the vector y.
Under the assumption that x and y are drawn from independent normal distributions (so the population correlation coefficient is 0), the probability density function of the sample correlation coefficient r is ([[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#r8c6348c62346-1), [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#r8c6348c62346-2)):
\\[f(r) = \frac{{(1-r^2)}^{n/2-2}}{\mathrm{B}(\frac{1}{2},\frac{n}{2}-1)}\\]
where n is the number of samples, and B is the beta function. This is sometimes referred to as the exact distribution of r. This is the distribution that is used in [`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "scipy.stats.pearsonr") to compute the p-value when the _method_ parameter is left at its default value (None). The distribution is a beta distribution on the interval [-1, 1], with equal shape parameters a = b = n/2 - 1. In terms of SciPy’s implementation of the beta distribution, the distribution of r is:
```
dist = scipy.stats.beta(n/2 - 1, n/2 - 1, loc=-1, scale=2)

```
Copy to clipboard
The default p-value returned by [`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "scipy.stats.pearsonr") is a two-sided p-value. For a given sample with correlation coefficient r, the p-value is the probability that abs(r’) of a random sample x’ and y’ drawn from the population with zero correlation would be greater than or equal to abs(r). In terms of the object `dist` shown above, the p-value for a given r and length n can be computed as:
```
p = 2*dist.cdf(-abs(r))

```
Copy to clipboard
When n is 2, the above continuous distribution is not well-defined. One can interpret the limit of the beta distribution as the shape parameters a and b approach a = b = 0 as a discrete distribution with equal probability masses at r = 1 and r = -1. More directly, one can observe that, given the data x = [x1, x2] and y = [y1, y2], and assuming x1 != x2 and y1 != y2, the only possible values for r are 1 and -1. Because abs(r’) for any sample x’ and y’ with length 2 will be 1, the two-sided p-value for a sample of length 2 is always 1.
For backwards compatibility, the object that is returned also behaves like a tuple of length two that holds the statistic and the p-value.
[`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr "scipy.stats.pearsonr") has experimental support for Python Array API Standard compatible backends in addition to NumPy. Please consider testing these features by setting an environment variable `SCIPY_ARRAY_API=1` and providing CuPy, PyTorch, JAX, or Dask arrays as array arguments. The following combinations of backend and device (or other capability) are supported.
Library | CPU | GPU  
---|---|---  
NumPy | ✅ | n/a  
CuPy | n/a | ✅  
PyTorch | ✅ | ⛔  
JAX | ⚠️ no JIT | ⛔  
Dask | ⚠️ computes graph | n/a  
See [Support for the array API standard](https://docs.scipy.org/doc/scipy/dev/api-dev/array_api.html#dev-arrayapi) for more information.
References
[1] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#id3),[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#id4))
“Pearson correlation coefficient”, Wikipedia, <https://en.wikipedia.org/wiki/Pearson_correlation_coefficient>
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#id5)]
Student, “Probable error of a correlation coefficient”, Biometrika, Volume 6, Issue 2-3, 1 September 1908, pp. 302-310.
[[3](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#id2)]
C. J. Kowalski, “On the Effects of Non-Normality on the Distribution of the Sample Product-Moment Correlation Coefficient” Journal of the Royal Statistical Society. Series C (Applied Statistics), Vol. 21, No. 1 (1972), pp. 1-12.
Examples
Try it in your browser!
```
>>> importnumpyasnp
>>> fromscipyimport stats
>>> x, y = [1, 2, 3, 4, 5, 6, 7], [10, 9, 2.5, 6, 4, 3, 2]
>>> res = stats.pearsonr(x, y)
>>> res
PearsonRResult(statistic=-0.828503883588428, pvalue=0.021280260007523286)

```
Copy to clipboard
To perform an exact permutation version of the test:
```
>>> rng = np.random.default_rng()
>>> method = stats.PermutationMethod(n_resamples=np.inf, random_state=rng)
>>> stats.pearsonr(x, y, method=method)
PearsonRResult(statistic=-0.828503883588428, pvalue=0.028174603174603175)

```
Copy to clipboard
To perform the test under the null hypothesis that the data were drawn from _uniform_ distributions:
```
>>> method = stats.MonteCarloMethod(rvs=(rng.uniform, rng.uniform))
>>> stats.pearsonr(x, y, method=method)
PearsonRResult(statistic=-0.828503883588428, pvalue=0.0188)

```
Copy to clipboard
To produce an asymptotic 90% confidence interval:
```
>>> res.confidence_interval(confidence_level=0.9)
ConfidenceInterval(low=-0.9644331982722841, high=-0.3460237473272273)

```
Copy to clipboard
And for a bootstrap confidence interval:
```
>>> method = stats.BootstrapMethod(method='BCa', rng=rng)
>>> res.confidence_interval(confidence_level=0.9, method=method)
ConfidenceInterval(low=-0.9983163756488651, high=-0.22771001702132443)  # may vary

```
Copy to clipboard
If N-dimensional arrays are provided, multiple tests are performed in a single call according to the same conventions as most [`scipy.stats`](https://docs.scipy.org/doc/scipy/reference/stats.html#module-scipy.stats "scipy.stats") functions:
```
>>> rng = np.random.default_rng()
>>> x = rng.standard_normal((8, 15))
>>> y = rng.standard_normal((8, 15))
>>> stats.pearsonr(x, y, axis=0).statistic.shape  # between corresponding columns
(15,)
>>> stats.pearsonr(x, y, axis=1).statistic.shape  # between corresponding rows
(8,)

```
Copy to clipboard
To perform all pairwise comparisons between slices of the arrays, use standard NumPy broadcasting techniques. For instance, to compute the correlation between all pairs of rows:
```
>>> stats.pearsonr(x[:, np.newaxis, :], y, axis=-1).statistic.shape
(8, 8)

```
Copy to clipboard
There is a linear dependence between x and y if y = a + b*x + e, where a,b are constants and e is a random error term, assumed to be independent of x. For simplicity, assume that x is standard normal, a=0, b=1 and let e follow a normal distribution with mean zero and standard deviation s>0.
```
>>> rng = np.random.default_rng()
>>> s = 0.5
>>> x = stats.norm.rvs(size=500, random_state=rng)
>>> e = stats.norm.rvs(scale=s, size=500, random_state=rng)
>>> y = x + e
>>> stats.pearsonr(x, y).statistic
0.9001942438244763

```
Copy to clipboard
This should be close to the exact value given by
```
>>> 1/np.sqrt(1 + s**2)
0.8944271909999159

```
Copy to clipboard
For s=0.5, we observe a high level of correlation. In general, a large variance of the noise reduces the correlation, while the correlation approaches one as the variance of the error goes to zero.
It is important to keep in mind that no correlation does not imply independence unless (x, y) is jointly normal. Correlation can even be zero when there is a very simple dependence structure: if X follows a standard normal distribution, let y = abs(x). Note that the correlation between x and y is zero. Indeed, since the expectation of x is zero, cov(x, y) = E[x*y]. By definition, this equals E[x*abs(x)] which is zero by symmetry. The following lines of code illustrate this observation:
```
>>> y = np.abs(x)
>>> stats.pearsonr(x, y)
PearsonRResult(statistic=-0.05444919272687482, pvalue=0.22422294836207743)

```
Copy to clipboard
A non-zero correlation coefficient can be misleading. For example, if X has a standard normal distribution, define y = x if x < 0 and y = 0 otherwise. A simple calculation shows that corr(x, y) = sqrt(2/Pi) = 0.797…, implying a high level of correlation:
```
>>> y = np.where(x < 0, x, 0)
>>> stats.pearsonr(x, y)
PearsonRResult(statistic=0.861985781588, pvalue=4.813432002751103e-149)

```
Copy to clipboard
This is unintuitive since there is no dependence of x and y if x is larger than zero which happens in about half of the cases if we sample x and y.
For a more detailed example, see [Pearson’s Correlation](https://docs.scipy.org/doc/scipy/tutorial/stats/hypothesis_pearsonr.html#hypothesis-pearsonr).
Go BackOpen In Tab
[ previous linregress ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.linregress.html "previous page") [ next spearmanr ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.spearmanr.html "next page")
On this page 
  * [`pearsonr`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.pearsonr.html#scipy.stats.pearsonr)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1. 
