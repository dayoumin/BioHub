---
title: scipy.stats.poisson_means_test
description: 포아송 평균 검정
source: https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html
library: scipy
version: 1.14.1
license: BSD 3-Clause
copyright: (c) 2001-2024, SciPy Developers
crawled_date: 2025-10-31
---

# scipy.stats.poisson_means_test

**Description**: 포아송 평균 검정

**Original Documentation**: [scipy.stats.poisson_means_test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html)

---


  * poisson_means_test


scipy.stats.

# poisson_means_test[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#poisson-means-test "Link to this heading") 

scipy.stats.poisson_means_test(_k1_ , _n1_ , _k2_ , _n2_ , _*_ , _diff =0_, _alternative ='two-sided'_)[[source]](https://github.com/scipy/scipy/blob/v1.16.2/scipy/stats/_hypotests.py#L151-L333)[#](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#scipy.stats.poisson_means_test "Link to this definition") 
    
Performs the Poisson means test, AKA the “E-test”.
This is a test of the null hypothesis that the difference between means of two Poisson distributions is _diff_. The samples are provided as the number of events _k1_ and _k2_ observed within measurement intervals (e.g. of time, space, number of observations) of sizes _n1_ and _n2_. 

Parameters: 
     

**k1** int 
    
Number of events observed from distribution 1. 

**n1: float**
    
Size of sample from distribution 1. 

**k2** int 
    
Number of events observed from distribution 2. 

**n2** float 
    
Size of sample from distribution 2. 

**diff** float, default=0 
    
The hypothesized difference in means between the distributions underlying the samples. 

**alternative**{‘two-sided’, ‘less’, ‘greater’}, optional 
    
Defines the alternative hypothesis. The following options are available (default is ‘two-sided’):
>   * ‘two-sided’: the difference between distribution means is not equal to _diff_
>   * ‘less’: the difference between distribution means is less than _diff_
>   * ‘greater’: the difference between distribution means is greater than _diff_
> 


Returns: 
     

**statistic** float 
    
The test statistic (see [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#r48657b251c79-1) equation 3.3). 

**pvalue** float 
    
The probability of achieving such an extreme value of the test statistic under the null hypothesis.
Notes
Let:
\\[X_1 \sim \mbox{Poisson}(\mathtt{n1}\lambda_1)\\]
be a random variable independent of
\\[X_2 \sim \mbox{Poisson}(\mathtt{n2}\lambda_2)\\]
and let `k1` and `k2` be the observed values of \\(X_1\\) and \\(X_2\\), respectively. Then [`poisson_means_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#scipy.stats.poisson_means_test "scipy.stats.poisson_means_test") uses the number of observed events `k1` and `k2` from samples of size `n1` and `n2`, respectively, to test the null hypothesis that
\\[H_0: \lambda_1 - \lambda_2 = \mathtt{diff}\\]
A benefit of the E-test is that it has good power for small sample sizes, which can reduce sampling costs [[1]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#r48657b251c79-1). It has been evaluated and determined to be more powerful than the comparable C-test, sometimes referred to as the Poisson exact test.
References
[1] ([1](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#id1),[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#id2))
Krishnamoorthy, K., & Thomson, J. (2004). A more powerful test for comparing two Poisson means. Journal of Statistical Planning and Inference, 119(1), 23-35.
[[2](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#id5)]
Przyborowski, J., & Wilenski, H. (1940). Homogeneity of results in testing samples from Poisson series: With an application to testing clover seed for dodder. Biometrika, 31(3/4), 313-323.
Examples
Try it in your browser!
Suppose that a gardener wishes to test the number of dodder (weed) seeds in a sack of clover seeds that they buy from a seed company. It has previously been established that the number of dodder seeds in clover follows the Poisson distribution.
A 100 gram sample is drawn from the sack before being shipped to the gardener. The sample is analyzed, and it is found to contain no dodder seeds; that is, _k1_ is 0. However, upon arrival, the gardener draws another 100 gram sample from the sack. This time, three dodder seeds are found in the sample; that is, _k2_ is 3. The gardener would like to know if the difference is significant and not due to chance. The null hypothesis is that the difference between the two samples is merely due to chance, or that \\(\lambda_1 - \lambda_2 = \mathtt{diff}\\) where \\(\mathtt{diff} = 0\\). The alternative hypothesis is that the difference is not due to chance, or \\(\lambda_1 - \lambda_2 \ne 0\\). The gardener selects a significance level of 5% to reject the null hypothesis in favor of the alternative [[2]](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#r48657b251c79-2).
```
>>> importscipy.statsasstats
>>> res = stats.poisson_means_test(0, 100, 3, 100)
>>> res.statistic, res.pvalue
(-1.7320508075688772, 0.08837900929018157)

```
Copy to clipboard
The p-value is .088, indicating a near 9% chance of observing a value of the test statistic under the null hypothesis. This exceeds 5%, so the gardener does not reject the null hypothesis as the difference cannot be regarded as significant at this level.
Go BackOpen In Tab
[ previous ttest_ind_from_stats ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind_from_stats.html "previous page") [ next ttest_ind ](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html "next page")
On this page 
  * [`poisson_means_test`](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.poisson_means_test.html#scipy.stats.poisson_means_test)


© Copyright 2008, The SciPy community.   

Created using [Sphinx](https://www.sphinx-doc.org/) 8.1.3.   

Built with the [PyData Sphinx Theme](https://pydata-sphinx-theme.readthedocs.io/en/stable/index.html) 0.16.1.
