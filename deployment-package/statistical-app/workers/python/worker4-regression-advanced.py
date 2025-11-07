# Worker 4: Advanced Regression Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels, scikit-learn
# - Estimated memory: ~200MB
# - Cold start time: ~3.8s

import json
from typing import List, Dict, Union, Literal, Optional, Any
import numpy as np
from scipy import stats
from helpers import clean_array, clean_xy_regression, clean_multiple_regression


def linear_regression(x, y):
    x, y = clean_xy_regression(x, y)

    if len(x) < 3:
        raise ValueError("Linear regression requires at least 3 valid pairs")

    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

    # Calculate confidence intervals (95%)
    df = len(x) - 2
    t_critical = stats.t.ppf(0.975, df)  # 95% CI

    slope_ci = [
        float(slope - t_critical * std_err),
        float(slope + t_critical * std_err)
    ]
    intercept_ci = [
        float(intercept - t_critical * std_err),
        float(intercept + t_critical * std_err)
    ]

    # Calculate t-values
    slope_t = float(slope / std_err) if std_err != 0 else 0
    intercept_t = float(intercept / std_err) if std_err != 0 else 0

    return {
        'slope': float(slope),
        'intercept': float(intercept),
        'rSquared': float(r_value ** 2),
        'pValue': float(p_value),
        'stdErr': float(std_err),
        'nPairs': int(len(x)),
        'slopeCi': slope_ci,
        'interceptCi': intercept_ci,
        'slopeTValue': slope_t,
        'interceptTValue': intercept_t
    }


def multiple_regression(X, y):
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor

    X_clean, y_clean = clean_multiple_regression(X, y)

    if len(y_clean) < 2:
        raise ValueError(f"Multiple regression requires at least 2 valid observations, got {len(y_clean)}")

    if X_clean.shape[0] < X_clean.shape[1] + 1:
        raise ValueError(f"Insufficient observations: need at least {X_clean.shape[1] + 1}, got {X_clean.shape[0]}")

    X_with_const = sm.add_constant(X_clean)
    model = sm.OLS(y_clean, X_with_const).fit()

    # Calculate confidence intervals (95%)
    conf_int = model.conf_int(alpha=0.05)  # 95% CI
    ci_lower = [float(c) for c in conf_int[0]]
    ci_upper = [float(c) for c in conf_int[1]]

    # Calculate VIF (Variance Inflation Factor)
    vif_values = []
    try:
        for i in range(X_with_const.shape[1]):
            vif = variance_inflation_factor(X_with_const.values, i)
            vif_values.append(float(vif) if not np.isinf(vif) else 999.0)
    except:
        vif_values = [1.0] * X_with_const.shape[1]  # Fallback

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'tValues': [float(t) for t in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'ciLower': ci_lower,
        'ciUpper': ci_upper,
        'rSquared': float(model.rsquared),
        'adjustedRSquared': float(model.rsquared_adj),
        'fStatistic': float(model.fvalue),
        'fPValue': float(model.f_pvalue),
        'residualStdError': float(np.sqrt(model.scale)),
        'vif': vif_values,
        'nObservations': int(len(y_clean)),
        'nPredictors': int(X_clean.shape[1])
    }


def logistic_regression(X, y):
    import statsmodels.api as sm
    from sklearn.metrics import roc_curve, roc_auc_score, confusion_matrix

    X_clean, y_clean = clean_multiple_regression(X, y)

    if len(y_clean) < 2:
        raise ValueError(f"Logistic regression requires at least 2 valid observations, got {len(y_clean)}")

    X_with_const = sm.add_constant(X_clean)
    model = sm.Logit(y_clean, X_with_const).fit(disp=0)

    predictions_prob = model.predict(X_with_const)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y_clean)

    # Confusion Matrix
    cm = confusion_matrix(y_clean, predictions_class)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    # Metrics
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1_score = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    sensitivity = recall
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

    # ROC Curve and AUC
    try:
        fpr, tpr, thresholds = roc_curve(y_clean, predictions_prob)
        auc = roc_auc_score(y_clean, predictions_prob)

        # Sample ROC curve points (max 20 points for efficiency)
        step = max(1, len(fpr) // 20)
        roc_curve_data = [
            {'fpr': float(fpr[i]), 'tpr': float(tpr[i])}
            for i in range(0, len(fpr), step)
        ]
    except:
        # Fallback if ROC calculation fails
        roc_curve_data = [
            {'fpr': 0.0, 'tpr': 0.0},
            {'fpr': 1.0, 'tpr': 1.0}
        ]
        auc = 0.5

    # Confidence Intervals (95%)
    conf_int = model.conf_int(alpha=0.05)
    ci_lower = [float(c) for c in conf_int[0]]
    ci_upper = [float(c) for c in conf_int[1]]

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'ciLower': ci_lower,
        'ciUpper': ci_upper,
        'predictions': [float(p) for p in predictions_prob],
        'predictedClass': [int(c) for c in predictions_class],
        'accuracy': float(accuracy),
        'confusionMatrix': {
            'tp': int(tp),
            'fp': int(fp),
            'tn': int(tn),
            'fn': int(fn),
            'precision': float(precision),
            'recall': float(recall),
            'f1Score': float(f1_score)
        },
        'sensitivity': float(sensitivity),
        'specificity': float(specificity),
        'rocCurve': roc_curve_data,
        'auc': float(auc),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'pseudoRSquared': float(model.prsquared),
        'nObservations': int(len(y_clean)),
        'nPredictors': int(X_clean.shape[1])
    }


def pca_analysis(data_matrix, n_components=2):
    from sklearn.decomposition import PCA

    data_matrix = np.array(data_matrix)

    if data_matrix.shape[0] < 2:
        raise ValueError("PCA requires at least 2 observations")

    if data_matrix.shape[1] < n_components:
        raise ValueError(f"Cannot extract {n_components} components from {data_matrix.shape[1]} features")

    # Use sklearn for PCA
    pca = PCA(n_components=n_components)
    components = pca.fit_transform(data_matrix)

    explained_variance = pca.explained_variance_
    explained_variance_ratio = pca.explained_variance_ratio_

    return {
        'components': components.tolist(),
        'explainedVariance': explained_variance.tolist(),
        'explainedVarianceRatio': explained_variance_ratio.tolist(),
        'cumulativeVariance': np.cumsum(explained_variance_ratio).tolist(),
    }


# Priority 2 Methods - Regression (9 methods)

def curve_estimation(x_values, y_values, model_type='linear'):
    x, y = clean_xy_regression(x_values, y_values)

    if len(x) < 3:
        raise ValueError(f"Curve estimation requires at least 3 valid pairs, got {len(x)}")

    if model_type == 'linear':
        coeffs = np.polyfit(x, y, 1)
        predictions = np.polyval(coeffs, x)
    elif model_type == 'quadratic':
        coeffs = np.polyfit(x, y, 2)
        predictions = np.polyval(coeffs, x)
    elif model_type == 'cubic':
        coeffs = np.polyfit(x, y, 3)
        predictions = np.polyval(coeffs, x)
    elif model_type == 'exponential':
        # y = a * exp(bx)
        if np.any(y <= 0):
            raise ValueError("Exponential model requires all y > 0")
        log_y = np.log(y)
        coeffs_linear = np.polyfit(x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * np.exp(b * x)
    elif model_type == 'logarithmic':
        # y = a + b*ln(x)
        if np.any(x <= 0):
            raise ValueError("Logarithmic model requires all x > 0")
        log_x = np.log(x)
        coeffs = np.polyfit(log_x, y, 1)
        predictions = coeffs[0] * np.log(x) + coeffs[1]
    elif model_type == 'power':
        # y = a * x^b
        if np.any(x <= 0) or np.any(y <= 0):
            raise ValueError("Power model requires all x > 0 and y > 0")
        log_x = np.log(x)
        log_y = np.log(y)
        coeffs_linear = np.polyfit(log_x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * (x ** b)
    else:
        raise ValueError(f"Unknown model type: {model_type}")

    # R-squared
    ss_res = np.sum((y - predictions) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return {
        'modelType': model_type,
        'coefficients': [float(c) for c in coeffs],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in (y - predictions)],
        'nPairs': int(len(x))
    }


def nonlinear_regression(x_values, y_values, model_type='exponential', initial_guess=None):
    from scipy.optimize import curve_fit

    x, y = clean_xy_regression(x_values, y_values)

    if len(x) < 3:
        raise ValueError(f"Nonlinear regression requires at least 3 valid pairs, got {len(x)}")

    if model_type == 'exponential':
        def model_func(x, a, b):
            return a * np.exp(b * x)
        if initial_guess is None:
            initial_guess = [1.0, 0.1]
    elif model_type == 'logistic':
        def model_func(x, L, k, x0):
            return L / (1 + np.exp(-k * (x - x0)))
        if initial_guess is None:
            initial_guess = [max(y), 1.0, np.mean(x)]
    elif model_type == 'gompertz':
        def model_func(x, a, b, c):
            return a * np.exp(-b * np.exp(-c * x))
        if initial_guess is None:
            initial_guess = [max(y), 1.0, 0.1]
    elif model_type == 'power':
        def model_func(x, a, b):
            return a * np.power(x, b)
        if initial_guess is None:
            initial_guess = [1.0, 1.0]
    elif model_type == 'hyperbolic':
        def model_func(x, a, b):
            return (a * x) / (b + x)
        if initial_guess is None:
            initial_guess = [max(y), 1.0]
    else:
        raise ValueError(f"Unknown model type: {model_type}")

    try:
        popt, pcov = curve_fit(model_func, x, y, p0=initial_guess)
    except RuntimeError as e:
        raise ValueError(f"Curve fitting failed: {str(e)}")

    predictions = model_func(x, *popt)
    residuals = y - predictions

    # R-squared
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    param_errors = np.sqrt(np.diag(pcov))

    return {
        'modelType': model_type,
        'parameters': [float(p) for p in popt],
        'parameterErrors': [float(e) for e in param_errors],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in residuals],
        'nPairs': int(len(x))
    }


def stepwise_regression(y_values, x_matrix, variable_names=None,
                       method='forward', entry_threshold=0.05, stay_threshold=0.10):
    import statsmodels.api as sm

    y = np.array(y_values)
    X = np.array(x_matrix)

    if len(y) < 3:
        raise ValueError(f"Stepwise regression requires at least 3 observations, got {len(y)}")

    if X.shape[0] != len(y):
        raise ValueError(f"X and y must have same length: {X.shape[0]} != {len(y)}")

    n_vars = X.shape[1]

    if variable_names is None:
        variable_names = [f'X{i}' for i in range(n_vars)]

    if method == 'forward':
        selected = []
        remaining = list(range(n_vars))
        r_squared_history = []

        while remaining:
            best_pval = 1.0
            best_var = None

            for var in remaining:
                test_vars = selected + [var]
                X_test = sm.add_constant(X[:, test_vars])
                model = sm.OLS(y, X_test).fit()
                pval = model.pvalues[-1]

                if pval < best_pval:
                    best_pval = pval
                    best_var = var

            if best_pval < entry_threshold:
                selected.append(best_var)
                remaining.remove(best_var)

                X_current = sm.add_constant(X[:, selected])
                model_current = sm.OLS(y, X_current).fit()
                r_squared_history.append(float(model_current.rsquared))
            else:
                break

    elif method == 'backward':
        selected = list(range(n_vars))
        r_squared_history = []

        while len(selected) > 0:
            X_test = sm.add_constant(X[:, selected])
            model = sm.OLS(y, X_test).fit()

            pvalues = model.pvalues[1:]
            max_pval_idx = np.argmax(pvalues)
            max_pval = pvalues[max_pval_idx]

            if max_pval > stay_threshold:
                selected.pop(max_pval_idx)

                if selected:
                    X_current = sm.add_constant(X[:, selected])
                    model_current = sm.OLS(y, X_current).fit()
                    r_squared_history.append(float(model_current.rsquared))
            else:
                break

    else:
        raise ValueError(f"Unknown method: {method}. Use 'forward' or 'backward'")

    if selected:
        X_final = sm.add_constant(X[:, selected])
        final_model = sm.OLS(y, X_final).fit()

        return {
            'selectedVariables': [variable_names[i] for i in selected],
            'selectedIndices': selected,
            'rSquaredHistory': r_squared_history,
            'coefficients': [float(c) for c in final_model.params],
            'stdErrors': [float(e) for e in final_model.bse],
            'tValues': [float(t) for t in final_model.tvalues],
            'pValues': [float(p) for p in final_model.pvalues],
            'rSquared': float(final_model.rsquared),
            'adjustedRSquared': float(final_model.rsquared_adj)
        }
    else:
        return {'selectedVariables': [], 'rSquared': 0.0}


def binary_logistic(x_matrix, y_values):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.Logit(y, X).fit(disp=0)

    predictions_prob = model.predict(X)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'predictions': [float(p) for p in predictions_prob],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'pseudoRSquared': float(model.prsquared)
    }


def multinomial_logistic(x_matrix, y_values):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.MNLogit(y, X).fit(disp=0)

    predictions = model.predict(X)
    predicted_class = np.argmax(predictions, axis=1)
    accuracy = np.mean(predicted_class == y)

    return {
        'coefficients': model.params.values.tolist(),
        'pValues': model.pvalues.values.tolist(),
        'predictions': predictions.tolist(),
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def ordinal_logistic(x_matrix, y_values):
    from statsmodels.miscmodels.ordinal_model import OrderedModel

    X = np.array(x_matrix)
    y = np.array(y_values)

    model = OrderedModel(y, X, distr='logit').fit(disp=0)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def probit_regression(x_matrix, y_values):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.Probit(y, X).fit(disp=0)

    predictions_prob = model.predict(X)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'predictions': [float(p) for p in predictions_prob],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def poisson_regression(x_matrix, y_values):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.GLM(y, X, family=sm.families.Poisson()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'deviance': float(model.deviance),
        'pearsonChi2': float(model.pearson_chi2),
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def negative_binomial_regression(x_matrix, y_values):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.GLM(y, X, family=sm.families.NegativeBinomial()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def factor_analysis(data_matrix, n_factors=2, rotation='varimax'):
    from sklearn.decomposition import FactorAnalysis

    data = np.array(data_matrix)

    if data.shape[0] < 3:
        raise ValueError("Factor analysis requires at least 3 observations")

    if data.shape[1] < n_factors:
        raise ValueError(f"Cannot extract {n_factors} factors from {data.shape[1]} variables")

    fa = FactorAnalysis(n_components=n_factors, random_state=42)
    fa.fit(data)

    loadings = fa.components_.T

    communalities = np.sum(loadings ** 2, axis=1)

    explained_variance = np.var(fa.transform(data), axis=0)
    total_variance = np.sum(np.var(data, axis=0))
    explained_variance_ratio = explained_variance / total_variance

    return {
        'loadings': loadings.tolist(),
        'communalities': communalities.tolist(),
        'explainedVariance': explained_variance.tolist(),
        'explainedVarianceRatio': explained_variance_ratio.tolist(),
        'totalVarianceExplained': float(np.sum(explained_variance_ratio)),
        'nFactors': int(n_factors)
    }


def _cluster_analysis(data_matrix, n_clusters=3, method='kmeans', metric='euclidean'):
    from sklearn.cluster import KMeans, AgglomerativeClustering
    from sklearn.metrics import silhouette_score, calinski_harabasz_score

    data = np.array(data_matrix, dtype=float)
    if data.ndim != 2:
        raise ValueError("data_matrix must be a 2D array")

    n_samples, n_features = data.shape

    if n_samples < n_clusters:
        raise ValueError(f"Number of samples ({data.shape[0]}) must be >= n_clusters ({n_clusters})")

    if method == 'kmeans':
        clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = clusterer.fit_predict(data)
        inertia = float(clusterer.inertia_)
        centers = clusterer.cluster_centers_.tolist()
    elif method == 'hierarchical':
        # AgglomerativeClustering in sklearn 1.4+ uses 'metric' argument
        clusterer = AgglomerativeClustering(n_clusters=n_clusters, linkage=method if method in {'ward', 'complete', 'average', 'single'} else 'ward', metric=metric)
        labels = clusterer.fit_predict(data)
        inertia = None  # Inertia is not defined for hierarchical clustering
        centers = []
        for i in range(n_clusters):
            cluster_data = data[labels == i]
            if len(cluster_data) > 0:
                centers.append(cluster_data.mean(axis=0).tolist())
            else:
                centers.append([0.0] * n_features)
    else:
        raise ValueError(f"Unknown method: {method}. Use 'kmeans' or 'hierarchical'")

    unique_labels = np.unique(labels)
    if len(unique_labels) > 1 and n_samples > n_clusters:
        try:
            silhouette = float(silhouette_score(data, labels, metric='euclidean' if method == 'kmeans' else metric))
            calinski = float(calinski_harabasz_score(data, labels))
        except Exception:
            silhouette = 0.0
            calinski = 0.0
    else:
        silhouette = 0.0
        calinski = 0.0

    cluster_sizes = [int(np.sum(labels == i)) for i in range(n_clusters)]

    return {
        'labels': labels.tolist(),
        'centers': centers,
        'clusterSizes': cluster_sizes,
        'silhouetteScore': silhouette,
        'calinskiScore': calinski,
        'nClusters': int(n_clusters),
        'method': method,
        'metric': metric,
        'inertia': inertia
    }


def kmeans_clustering(data_matrix, n_clusters=3, column_names=None):
    result = _cluster_analysis(data_matrix, n_clusters=n_clusters, method='kmeans')
    inertia = float(result['inertia']) if result['inertia'] is not None else 0.0

    return {
        'labels': result['labels'],
        'centers': result['centers'],
        'clusterSizes': result['clusterSizes'],
        'silhouetteScore': result['silhouetteScore'],
        'inertia': inertia
    }


def hierarchical_clustering(data_matrix, n_clusters=3, method='ward', metric='euclidean', column_names=None):
    result = _cluster_analysis(data_matrix, n_clusters=n_clusters, method=method, metric=metric)

    return {
        'labels': result['labels'],
        'centers': result['centers'],
        'clusterSizes': result['clusterSizes'],
        'method': method,
        'metric': metric,
        'nSamples': len(data_matrix)
    }


def time_series_analysis(data_values, seasonal_periods=12):
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.stattools import adfuller, acf, pacf

    data = np.array(data_values)

    if len(data) < seasonal_periods * 2:
        raise ValueError(f"Time series must have at least {seasonal_periods * 2} observations for seasonal decomposition")

    try:
        decomposition = seasonal_decompose(data, model='additive', period=seasonal_periods, extrapolate_trend='freq')

        trend = decomposition.trend
        seasonal = decomposition.seasonal
        residual = decomposition.resid
    except Exception as e:
        trend = np.full(len(data), np.nan)
        seasonal = np.zeros(len(data))
        residual = data

    adf_result = adfuller(data, autolag='AIC')
    adf_statistic = float(adf_result[0])
    adf_pvalue = float(adf_result[1])
    is_stationary = adf_pvalue < 0.05

    acf_values = acf(data, nlags=min(20, len(data) // 2 - 1))
    pacf_values = pacf(data, nlags=min(20, len(data) // 2 - 1))

    return {
        'trend': [float(v) if not np.isnan(v) else None for v in trend],
        'seasonal': [float(v) for v in seasonal],
        'residual': [float(v) if not np.isnan(v) else None for v in residual],
        'adfStatistic': adf_statistic,
        'adfPValue': adf_pvalue,
        'isStationary': bool(is_stationary),
        'acf': [float(v) for v in acf_values],
        'pacf': [float(v) for v in pacf_values],
        'seasonalPeriods': int(seasonal_periods)
    }


def time_series_decomposition(values, period=12, model='additive'):
    from statsmodels.tsa.seasonal import seasonal_decompose

    data = np.array(values, dtype=float)
    if data.ndim != 1:
        data = data.flatten()

    if len(data) < max(3, period * 2):
        raise ValueError(f"Time series must have at least {period * 2} observations for seasonal decomposition")

    decomposition = seasonal_decompose(data, model=model, period=period, extrapolate_trend='freq')

    def _clean_arr(arr):
        return [float(v) if v is not None and not np.isnan(v) else None for v in np.array(arr)]

    return {
        'trend': _clean_arr(decomposition.trend),
        'seasonal': _clean_arr(decomposition.seasonal),
        'residual': _clean_arr(decomposition.resid),
        'observed': data.tolist()
    }


def arima_forecast(values, order=(1, 1, 1), n_forecast=10):
    from statsmodels.tsa.arima.model import ARIMA

    data = np.array(values, dtype=float)
    if data.ndim != 1:
        data = data.flatten()

    model = ARIMA(data, order=tuple(order))
    fitted = model.fit()

    forecast_res = fitted.get_forecast(steps=int(n_forecast))
    predicted = forecast_res.predicted_mean.tolist()
    conf_int = forecast_res.conf_int()
    lower = conf_int.iloc[:, 0].tolist() if hasattr(conf_int, "iloc") else [float(v[0]) for v in conf_int]
    upper = conf_int.iloc[:, 1].tolist() if hasattr(conf_int, "iloc") else [float(v[1]) for v in conf_int]

    return {
        'forecast': [float(v) for v in predicted],
        'confidenceIntervals': {
            'lower': [float(v) for v in lower],
            'upper': [float(v) for v in upper]
        },
        'aic': float(fitted.aic) if fitted.aic is not None else None,
        'bic': float(fitted.bic) if fitted.bic is not None else None
    }


def sarima_forecast(values, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12), n_forecast=10):
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    data = np.array(values, dtype=float)
    if data.ndim != 1:
        data = data.flatten()

    model = SARIMAX(
        data,
        order=tuple(order),
        seasonal_order=tuple(seasonal_order),
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    fitted = model.fit(disp=False)

    forecast_res = fitted.get_forecast(steps=int(n_forecast))
    predicted = forecast_res.predicted_mean.tolist()
    conf_int = forecast_res.conf_int()
    lower = conf_int.iloc[:, 0].tolist() if hasattr(conf_int, "iloc") else [float(v[0]) for v in conf_int]
    upper = conf_int.iloc[:, 1].tolist() if hasattr(conf_int, "iloc") else [float(v[1]) for v in conf_int]

    return {
        'forecast': [float(v) for v in predicted],
        'confidenceIntervals': {
            'lower': [float(v) for v in lower],
            'upper': [float(v) for v in upper]
        },
        'aic': float(fitted.aic) if fitted.aic is not None else None,
        'bic': float(fitted.bic) if fitted.bic is not None else None
    }


def var_model(data_matrix, max_lags=1, column_names=None):
    from statsmodels.tsa.api import VAR

    data = np.array(data_matrix, dtype=float)
    if data.ndim != 2:
        raise ValueError("data_matrix must be a 2D array")

    model = VAR(data)
    results = model.fit(maxlags=max_lags)

    coefs = results.coefs  # shape (lag_order, neqs, neqs)
    lag_order = coefs.shape[0]
    coefficients: List[List[List[float]]] = []
    for eq_idx in range(coefs.shape[1]):
        eq_coeffs: List[List[float]] = []
        for var_idx in range(coefs.shape[2]):
            eq_coeffs.append([float(coefs[lag, eq_idx, var_idx]) for lag in range(lag_order)])
        coefficients.append(eq_coeffs)

    residuals = results.resid.tolist() if results.resid is not None else []

    forecast = []
    if lag_order > 0:
        try:
            forecast = results.forecast(data[-lag_order:], steps=1).tolist()
        except Exception:
            forecast = []

    return {
        'coefficients': coefficients,
        'residuals': residuals,
        'aic': float(results.aic),
        'bic': float(results.bic),
        'forecast': forecast
    }


def mixed_effects_model(data, dependent_column, fixed_effects=None, random_effects=None):
    import pandas as pd
    import statsmodels.api as sm
    from statsmodels.regression.mixed_linear_model import MixedLM

    if isinstance(data, str):
        records = json.loads(data)
    else:
        records = data

    if not isinstance(records, (list, tuple)):
        raise ValueError("data must be a JSON string or iterable of records")

    df = pd.DataFrame(records)

    fixed_effects = fixed_effects or []
    random_effects = random_effects or []

    if dependent_column not in df.columns:
        raise ValueError(f"dependent_column '{dependent_column}' not found in data")

    exog = df[fixed_effects] if fixed_effects else pd.DataFrame(index=df.index)
    exog = sm.add_constant(exog, has_constant='add')

    if random_effects:
        group_col = random_effects[0]
        if group_col not in df.columns:
            raise ValueError(f"random effect column '{group_col}' not found in data")
        groups = df[group_col]
    else:
        groups = pd.Series(np.ones(len(df)), index=df.index)

    model = MixedLM(endog=df[dependent_column], exog=exog, groups=groups)
    result = model.fit()

    fe_names = result.model.exog_names
    fixed_coefficients = [float(result.fe_params[name]) for name in fe_names]
    fixed_std_errors = [float(result.bse_fe[name]) if hasattr(result, "bse_fe") else float(result.bse[name]) for name in fe_names]
    fixed_pvalues = [float(result.pvalues[name]) for name in fe_names]

    random_variances = []
    if hasattr(result, "cov_re") and result.cov_re is not None:
        random_variances = [float(var) for var in np.diag(result.cov_re)]

    return {
        'fixedEffects': {
            'coefficients': fixed_coefficients,
            'standardErrors': fixed_std_errors,
            'pValues': fixed_pvalues
        },
        'randomEffects': {
            'variances': random_variances
        },
        'aic': float(result.aic),
        'bic': float(result.bic),
        'logLikelihood': float(result.llf)
    }


def kaplan_meier_survival(times, events):
    try:
        from lifelines import KaplanMeierFitter
    except ImportError:
        raise ImportError("lifelines library is required for Kaplan-Meier survival analysis. Install with: pip install lifelines")

    times_array = np.array(times, dtype=float)
    events_array = np.array(events, dtype=int)

    if len(times_array) != len(events_array):
        raise ValueError(f"times and events must have same length: {len(times_array)} != {len(events_array)}")

    if len(times_array) < 2:
        raise ValueError(f"Kaplan-Meier requires at least 2 observations, got {len(times_array)}")

    # Use lifelines for Kaplan-Meier estimation
    kmf = KaplanMeierFitter()
    kmf.fit(times_array, events_array)

    # Extract survival function
    survival_function = kmf.survival_function_
    times_km = survival_function.index.tolist()
    survival_probs = survival_function['KM_estimate'].tolist()

    # Extract number at risk
    event_table = kmf.event_table
    n_risk = event_table['at_risk'].tolist() if 'at_risk' in event_table.columns else []

    # Get median survival time
    median_survival = float(kmf.median_survival_time_) if not np.isnan(kmf.median_survival_time_) else None

    return {
        'survivalFunction': [float(s) for s in survival_probs],
        'times': [float(t) for t in times_km],
        'events': events_array.tolist(),
        'nRisk': [int(n) for n in n_risk],
        'medianSurvival': median_survival
    }


def cox_regression(times, events, covariate_data, covariate_names):
    import pandas as pd
    from statsmodels.duration.hazard_regression import PHReg

    if covariate_data and len(covariate_data) != len(covariate_names):
        raise ValueError("covariate_data length must match covariate_names length")

    df = pd.DataFrame({name: covariate_data[idx] for idx, name in enumerate(covariate_names)})
    df['time'] = np.array(times, dtype=float)
    df['event'] = np.array(events, dtype=int)

    model = PHReg(endog=df['time'], exog=df[covariate_names], status=df['event'])
    result = model.fit()

    coefficients = [float(coeff) for coeff in result.params]
    hazard_ratios = [float(np.exp(coeff)) for coeff in result.params]
    pvalues = [float(p) for p in result.pvalues]

    conf_int_df = result.conf_int()
    confidence_intervals = []
    if conf_int_df is not None:
        for idx in range(len(conf_int_df)):
            confidence_intervals.append({
                'lower': float(conf_int_df.iloc[idx, 0]),
                'upper': float(conf_int_df.iloc[idx, 1])
            })

    concordance = None
    if hasattr(result, "concordance"):
        concordance = float(result.concordance)
    elif hasattr(result, "concordance_index"):
        concordance = float(result.concordance_index)

    return {
        'coefficients': coefficients,
        'hazardRatios': hazard_ratios,
        'pValues': pvalues,
        'confidenceIntervals': confidence_intervals,
        'concordance': concordance
    }


def durbin_watson_test(residuals):
    from statsmodels.stats.stattools import durbin_watson

    clean_data = clean_array(residuals)

    if len(clean_data) < 2:
        raise ValueError("Durbin-Watson test requires at least 2 observations")

    # Use statsmodels for Durbin-Watson test
    dw_statistic = durbin_watson(clean_data)

    # Durbin-Watson 통계량 해석 (0 ~ 4 범위)
    # 2에 가까울수록 자기상관 없음 (독립적)
    # 0에 가까울수록 양의 자기상관 (Positive autocorrelation)
    # 4에 가까울수록 음의 자기상관 (Negative autocorrelation)
    if dw_statistic < 1.5:
        is_independent = False
        interpretation = "Positive autocorrelation detected (DW < 1.5)"
    elif dw_statistic > 2.5:
        is_independent = False
        interpretation = "Negative autocorrelation detected (DW > 2.5)"
    else:
        is_independent = True
        interpretation = "No significant autocorrelation (1.5 <= DW <= 2.5)"

    return {
        'statistic': float(dw_statistic),
        'interpretation': interpretation,
        'isIndependent': is_independent
    }

