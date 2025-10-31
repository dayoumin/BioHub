---
title: statsmodels.miscmodels.ordinal_model.OrderedModel
description: 순서형 로지스틱 회귀
source: https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html
library: statsmodels
version: 0.14.4
license: BSD 3-Clause
copyright: (c) 2009-2024, statsmodels Developers
crawled_date: 2025-10-31
---

# statsmodels.miscmodels.ordinal_model.OrderedModel

**Description**: 순서형 로지스틱 회귀

**Original Documentation**: [statsmodels.miscmodels.ordinal_model.OrderedModel](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html)

---

[ Skip to content ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel)
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


statsmodels.miscmodels.ordinal_model.OrderedModel 
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
    * [Regression and Linear Models](https://www.statsmodels.org/stable/user-guide.html#regression-and-linear-models)
Regression and Linear Models
      * [ Linear Regression ](https://www.statsmodels.org/stable/regression.html)
      * [ Generalized Linear Models ](https://www.statsmodels.org/stable/glm.html)
      * [ Generalized Estimating Equations ](https://www.statsmodels.org/stable/gee.html)
      * [ Generalized Additive Models (GAM) ](https://www.statsmodels.org/stable/gam.html)
      * [ Robust Linear Models ](https://www.statsmodels.org/stable/rlm.html)
      * [ Linear Mixed Effects Models ](https://www.statsmodels.org/stable/mixed_linear.html)
      * [Regression with Discrete Dependent Variable](https://www.statsmodels.org/stable/discretemod.html)
Regression with Discrete Dependent Variable
        * [Module Reference](https://www.statsmodels.org/stable/discretemod.html#module-statsmodels.discrete.discrete_model)
Module Reference
          * [ statsmodels.discrete.discrete_model.Logit ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.Logit.html)
          * [ statsmodels.discrete.discrete_model.Probit ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.Probit.html)
          * [ statsmodels.discrete.discrete_model.MNLogit ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.MNLogit.html)
          * [ statsmodels.discrete.discrete_model.Poisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.Poisson.html)
          * [ statsmodels.discrete.discrete_model.NegativeBinomial ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.NegativeBinomial.html)
          * [ statsmodels.discrete.discrete_model.NegativeBinomialP ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.NegativeBinomialP.html)
          * [ statsmodels.discrete.discrete_model.GeneralizedPoisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.GeneralizedPoisson.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedPoisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedPoisson.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedNegativeBinomialP ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedNegativeBinomialP.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedGeneralizedPoisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedGeneralizedPoisson.html)
          * [ statsmodels.discrete.truncated_model.HurdleCountModel ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.HurdleCountModel.html)
          * [ statsmodels.discrete.truncated_model.TruncatedLFNegativeBinomialP ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.TruncatedLFNegativeBinomialP.html)
          * [ statsmodels.discrete.truncated_model.TruncatedLFPoisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.TruncatedLFPoisson.html)
          * [ statsmodels.discrete.conditional_models.ConditionalLogit ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.conditional_models.ConditionalLogit.html)
          * [ statsmodels.discrete.conditional_models.ConditionalMNLogit ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.conditional_models.ConditionalMNLogit.html)
          * [ statsmodels.discrete.conditional_models.ConditionalPoisson ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.conditional_models.ConditionalPoisson.html)
          * [statsmodels.miscmodels.ordinal_model.OrderedModel](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html)
statsmodels.miscmodels.ordinal_model.OrderedModel
            * [Cstatsmodels.miscmodels.ordinal_model.OrderedModel](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel)
Cstatsmodels.miscmodels.ordinal_model.OrderedModel
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.cdf ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.cdf.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.fit ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.fit.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.hessian ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.information ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.information.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.initialize ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.initialize.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.loglike ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglike.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.pdf ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.pdf.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.predict ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.predict.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.prob ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.prob.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_ ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.start_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.start_params.html)
          * statsmodels.miscmodels.ordinal_model.OrderedModel [ statsmodels.miscmodels.ordinal_model.OrderedModel ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html)
            * [ Cstatsmodels.miscmodels.ordinal_model.OrderedModel ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel)
              * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-parameters)
              * [ Attributes ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-attributes)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.cdf ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.cdf.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.fit ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.fit.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.hessian ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.information ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.information.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.initialize ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.initialize.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.loglike ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglike.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.pdf ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.pdf.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.predict ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.predict.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.prob ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.prob.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_ ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names.html)
              * [ statsmodels.miscmodels.ordinal_model.OrderedModel.start_params ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.start_params.html)
          * [ statsmodels.discrete.discrete_model.LogitResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.LogitResults.html)
          * [ statsmodels.discrete.discrete_model.ProbitResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.ProbitResults.html)
          * [ statsmodels.discrete.discrete_model.CountResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.CountResults.html)
          * [ statsmodels.discrete.discrete_model.MultinomialResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.MultinomialResults.html)
          * [ statsmodels.discrete.discrete_model.NegativeBinomialResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.NegativeBinomialResults.html)
          * [ statsmodels.discrete.discrete_model.GeneralizedPoissonResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.GeneralizedPoissonResults.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedPoissonResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedPoissonResults.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedNegativeBinomialResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedNegativeBinomialResults.html)
          * [ statsmodels.discrete.count_model.ZeroInflatedGeneralizedPoissonResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.ZeroInflatedGeneralizedPoissonResults.html)
          * [ statsmodels.discrete.truncated_model.HurdleCountResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.HurdleCountResults.html)
          * [ statsmodels.discrete.truncated_model.TruncatedLFPoissonResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.TruncatedLFPoissonResults.html)
          * [ statsmodels.discrete.truncated_model.TruncatedNegativeBinomialResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.truncated_model.TruncatedNegativeBinomialResults.html)
          * [ statsmodels.discrete.conditional_models.ConditionalResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.conditional_models.ConditionalResults.html)
          * [ statsmodels.miscmodels.ordinal_model.OrderedResults ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedResults.html)
          * [ statsmodels.discrete.discrete_model.DiscreteModel ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.DiscreteModel.html)
          * [ statsmodels.discrete.discrete_model.DiscreteResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.DiscreteResults.html)
          * [ statsmodels.discrete.discrete_model.BinaryModel ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.BinaryModel.html)
          * [ statsmodels.discrete.discrete_model.BinaryResults ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.BinaryResults.html)
          * [ statsmodels.discrete.discrete_model.CountModel ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.CountModel.html)
          * [ statsmodels.discrete.discrete_model.MultinomialModel ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.discrete_model.MultinomialModel.html)
          * [ statsmodels.discrete.count_model.GenericZeroInflated ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.count_model.GenericZeroInflated.html)
      * [ Generalized Linear Mixed Effects Models ](https://www.statsmodels.org/stable/mixed_glm.html)
      * [ ANOVA ](https://www.statsmodels.org/stable/anova.html)
      * [ Other Models othermod ](https://www.statsmodels.org/stable/other_models.html)
    * [ Time Series Analysis ](https://www.statsmodels.org/stable/user-guide.html#time-series-analysis)
    * [ Other Models ](https://www.statsmodels.org/stable/user-guide.html#other-models)
    * [ Statistics and Tools ](https://www.statsmodels.org/stable/user-guide.html#statistics-and-tools)
    * [ Data Sets ](https://www.statsmodels.org/stable/user-guide.html#data-sets)
    * [ Sandbox ](https://www.statsmodels.org/stable/user-guide.html#sandbox)
  * [ Examples ](https://www.statsmodels.org/stable/examples/index.html)
  * [ API Reference ](https://www.statsmodels.org/stable/api.html)
  * [ About statsmodels ](https://www.statsmodels.org/stable/about.html)
  * [ Developer Page ](https://www.statsmodels.org/stable/dev/index.html)
  * [ Release Notes ](https://www.statsmodels.org/stable/release/index.html)


  * [ Cstatsmodels.miscmodels.ordinal_model.OrderedModel ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel)
    * [ Parameters ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-parameters)
    * [ Attributes ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-attributes)


# statsmodels.miscmodels.ordinal_model.OrderedModel[¶](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels-miscmodels-ordinal-model-orderedmodel "Link to this heading") 

_class_ statsmodels.miscmodels.ordinal_model.OrderedModel(_[endog](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "statsmodels.miscmodels.ordinal_model.OrderedModel.__init__.endog \(Python parameter\)")_ , _[exog](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "statsmodels.miscmodels.ordinal_model.OrderedModel.__init__.exog \(Python parameter\)")_ , _[offset](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "statsmodels.miscmodels.ordinal_model.OrderedModel.__init__.offset \(Python parameter\)") =`None`_, _[distr](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "statsmodels.miscmodels.ordinal_model.OrderedModel.__init__.distr \(Python parameter\)") =`'probit'`_, _**[ kwds](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "statsmodels.miscmodels.ordinal_model.OrderedModel.__init__.kwds \(Python parameter\)")_)[[source]](https://www.statsmodels.org/stable/_modules/statsmodels/miscmodels/ordinal_model.html#OrderedModel)[¶](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel "Link to this definition") 
    
Ordinal Model based on logistic or normal distribution
The parameterization corresponds to the proportional odds model in the logistic case. The model assumes that the endogenous variable is ordered but that the labels have no numeric interpretation besides the ordering.
The model is based on a latent linear variable, where we observe only a discretization.
y_latent = X beta + u
The observed variable is defined by the interval 

y = {0 if y_latent <= cut_0
    
1 of cut_0 < y_latent <= cut_1 … K if cut_K < y_latent
The probability of observing y=k conditional on the explanatory variables X is given by 

prob(y = k | x) = Prob(cut_k < y_latent <= cut_k+1)
    
= Prob(cut_k - x beta < u <= cut_k+1 - x beta = F(cut_k+1 - x beta) - F(cut_k - x beta)
Where F is the cumulative distribution of u which is either the normal or the logistic distribution, but can be set to any other continuous distribution. We use standardized distributions to avoid identifiability problems. 

Parameters:[¶](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-parameters "Permalink to this headline") 
     

**endog**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Endogenous or dependent ordered categorical variable with k levels. Labels or values of endog will internally transformed to consecutive integers, 0, 1, 2, … pd.Series with ordered Categorical as dtype should be preferred as it gives the order relation between the levels. If endog is not a pandas Categorical, then categories are sorted in lexicographic order (by numpy.unique). 

**exog**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Exogenous, explanatory variables. This should not include an intercept. pd.DataFrame are also accepted. see Notes about constant when using formulas 

**offset**[ array_like](https://numpy.org/doc/stable/glossary.html#term-array_like "\(in NumPy v2.1\)") 
    
Offset is added to the linear prediction with coefficient equal to 1. 

**distr**[`str`](https://docs.python.org/3/library/stdtypes.html#str "\(in Python v3.12\)") ‘probit’ or ‘logit’, `or` `a` `distribution` `instance` 
    
The default is currently ‘probit’ which uses the normal distribution and corresponds to an ordered Probit model. The distribution is assumed to have the main methods of scipy.stats distributions, mainly cdf, pdf and ppf. The inverse cdf, ppf, is only use to calculate starting values. 

Attributes:[¶](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.html#statsmodels.miscmodels.ordinal_model.OrderedModel-attributes "Permalink to this headline") 
     

[`endog_names`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names.html#statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names "statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names \(Python property\) — Names of endogenous variables.")
    
Names of endogenous variables. 

[`exog_names`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names.html#statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names "statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names \(Python property\) — Names of exogenous variables.")
    
Names of exogenous variables. 

[`start_params`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.start_params.html#statsmodels.miscmodels.ordinal_model.OrderedModel.start_params "statsmodels.miscmodels.ordinal_model.OrderedModel.start_params \(Python property\) — Start parameters for the optimization corresponding to null model.")
    
Start parameters for the optimization corresponding to null model.
Notes
Status: experimental, core results are verified, still subclasses GenericLikelihoodModel which will change in future versions.
The parameterization of OrderedModel requires that there is no constant in the model, neither explicit nor implicit. The constant is equivalent to shifting all thresholds and is therefore not separately identified.
Patsy’s formula specification does not allow a design matrix without explicit or implicit constant if there are categorical variables (or maybe splines) among explanatory variables. As workaround, statsmodels removes an explicit intercept.
Consequently, there are two valid cases to get a design matrix without intercept when using formulas:
  * specify a model without explicit and implicit intercept which is possible if there are only numerical variables in the model.
  * specify a model with an explicit intercept which statsmodels will remove.


Models with an implicit intercept will be overparameterized, the parameter estimates will not be fully identified, cov_params will not be invertible and standard errors might contain nans. The computed results will be dominated by numerical imprecision coming mainly from convergence tolerance and numerical derivatives.
The model will raise a ValueError if a remaining constant is detected.
Methods
[`cdf`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.cdf.html#statsmodels.miscmodels.ordinal_model.OrderedModel.cdf "statsmodels.miscmodels.ordinal_model.OrderedModel.cdf \(Python method\) — Cdf evaluated at x.")(x) | Cdf evaluated at x.  
---|---  
[`expandparams`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams.html#statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams "statsmodels.miscmodels.ordinal_model.OrderedModel.expandparams \(Python method\) — expand to full parameter array when some parameters are fixed")(params) | expand to full parameter array when some parameters are fixed  
[`fit`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.fit.html#statsmodels.miscmodels.ordinal_model.OrderedModel.fit "statsmodels.miscmodels.ordinal_model.OrderedModel.fit \(Python method\) — Fit method for likelihood based models")([start_params, method, maxiter, ...]) | Fit method for likelihood based models  
[`from_formula`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula.html#statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula "statsmodels.miscmodels.ordinal_model.OrderedModel.from_formula \(Python method\) — Create a Model from a formula and dataframe.")(formula, data[, subset, drop_cols]) | Create a Model from a formula and dataframe.  
[`hessian`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian.html#statsmodels.miscmodels.ordinal_model.OrderedModel.hessian "statsmodels.miscmodels.ordinal_model.OrderedModel.hessian \(Python method\) — Hessian of log-likelihood evaluated at params")(params) | Hessian of log-likelihood evaluated at params  
[`hessian_factor`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor.html#statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor "statsmodels.miscmodels.ordinal_model.OrderedModel.hessian_factor \(Python method\) — Weights for calculating Hessian")(params[, scale, observed]) | Weights for calculating Hessian  
[`information`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.information.html#statsmodels.miscmodels.ordinal_model.OrderedModel.information "statsmodels.miscmodels.ordinal_model.OrderedModel.information \(Python method\) — Fisher information matrix of model.")(params) | Fisher information matrix of model.  
[`initialize`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.initialize.html#statsmodels.miscmodels.ordinal_model.OrderedModel.initialize "statsmodels.miscmodels.ordinal_model.OrderedModel.initialize \(Python method\) — Initialize \(possibly re-initialize\) a Model instance. For instance, the design matrix of a linear model may change and some things must be recomputed.")() | Initialize (possibly re-initialize) a Model instance.  
[`loglike`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglike.html#statsmodels.miscmodels.ordinal_model.OrderedModel.loglike "statsmodels.miscmodels.ordinal_model.OrderedModel.loglike \(Python method\) — Log-likelihood of model at params")(params) | Log-likelihood of model at params  
[`loglikeobs`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs.html#statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs "statsmodels.miscmodels.ordinal_model.OrderedModel.loglikeobs \(Python method\) — Log-likelihood of OrderdModel for all observations.")(params) | Log-likelihood of OrderdModel for all observations.  
[`nloglike`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike.html#statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike "statsmodels.miscmodels.ordinal_model.OrderedModel.nloglike \(Python method\) — Negative log-likelihood of model at params")(params) | Negative log-likelihood of model at params  
[`pdf`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.pdf.html#statsmodels.miscmodels.ordinal_model.OrderedModel.pdf "statsmodels.miscmodels.ordinal_model.OrderedModel.pdf \(Python method\) — Pdf evaluated at x")(x) | Pdf evaluated at x  
[`predict`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.predict.html#statsmodels.miscmodels.ordinal_model.OrderedModel.predict "statsmodels.miscmodels.ordinal_model.OrderedModel.predict \(Python method\) — Predicted probabilities for each level of the ordinal endog.")(params[, exog, offset, which]) | Predicted probabilities for each level of the ordinal endog.  
[`prob`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.prob.html#statsmodels.miscmodels.ordinal_model.OrderedModel.prob "statsmodels.miscmodels.ordinal_model.OrderedModel.prob \(Python method\) — Interval probability.")(low, upp) | Interval probability.  
[`reduceparams`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams.html#statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams "statsmodels.miscmodels.ordinal_model.OrderedModel.reduceparams \(Python method\) — Reduce parameters")(params) | Reduce parameters  
[`score`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score.html#statsmodels.miscmodels.ordinal_model.OrderedModel.score "statsmodels.miscmodels.ordinal_model.OrderedModel.score \(Python method\) — Gradient of log-likelihood evaluated at params")(params) | Gradient of log-likelihood evaluated at params  
[`score_obs`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs.html#statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs "statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs \(Python method\) — Jacobian/Gradient of log-likelihood evaluated at params for each observation.")(params, **kwds) | Jacobian/Gradient of log-likelihood evaluated at params for each observation.  
[`score_obs_`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_.html#statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_ "statsmodels.miscmodels.ordinal_model.OrderedModel.score_obs_ \(Python method\) — score, first derivative of loglike for each observations")(params) | score, first derivative of loglike for each observations  
[`transform_reverse_threshold_params`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params.html#statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params "statsmodels.miscmodels.ordinal_model.OrderedModel.transform_reverse_threshold_params \(Python method\) — obtain transformed thresholds from original thresholds or cutoffs")(params) | obtain transformed thresholds from original thresholds or cutoffs  
[`transform_threshold_params`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params.html#statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params "statsmodels.miscmodels.ordinal_model.OrderedModel.transform_threshold_params \(Python method\) — transformation of the parameters in the optimization")(params) | transformation of the parameters in the optimization  
Properties
[`endog_names`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names.html#statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names "statsmodels.miscmodels.ordinal_model.OrderedModel.endog_names \(Python property\) — Names of endogenous variables.") | Names of endogenous variables.  
---|---  
[`exog_names`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names.html#statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names "statsmodels.miscmodels.ordinal_model.OrderedModel.exog_names \(Python property\) — Names of exogenous variables.") | Names of exogenous variables.  
[`start_params`](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.start_params.html#statsmodels.miscmodels.ordinal_model.OrderedModel.start_params "statsmodels.miscmodels.ordinal_model.OrderedModel.start_params \(Python property\) — Start parameters for the optimization corresponding to null model.") | Start parameters for the optimization corresponding to null model.  
* * *
Last update: Oct 03, 2024 
[ Previous  statsmodels.discrete.conditional_models.ConditionalPoisson.exog_names  ](https://www.statsmodels.org/stable/generated/statsmodels.discrete.conditional_models.ConditionalPoisson.exog_names.html) [ Next  statsmodels.miscmodels.ordinal_model.OrderedModel.cdf  ](https://www.statsmodels.org/stable/generated/statsmodels.miscmodels.ordinal_model.OrderedModel.cdf.html)
© Copyright 2009-2023, Josef Perktold, Skipper Seabold, Jonathan Taylor, statsmodels-developers. 
Created using [Sphinx](https://www.sphinx-doc.org/) 7.3.7. and [Sphinx-Immaterial](https://github.com/jbms/sphinx-immaterial/)
[ ](https://github.com/statsmodels/statsmodels/ "Source on github.com") [ ](https://pypi.org/project/statsmodels/ "pypi.org") [ ](https://doi.org/10.5281/zenodo.593847 "doi.org")
