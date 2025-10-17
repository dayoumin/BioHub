# Worker 4: Advanced Regression Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels, scikit-learn
# - Estimated memory: ~200MB
# - Cold start time: ~3.8s

from typing import List, Dict, Union, Literal, Optional, Any
import numpy as np
from scipy import stats


def linear_regression(x, y):
    pairs = [(x_val, y_val) for x_val, y_val in zip(x, y) 
             if x_val is not None and y_val is not None 
             and not np.isnan(x_val) and not np.isnan(y_val)]
    
    if len(pairs) < 3:
        raise ValueError("Linear regression requires at least 3 valid pairs")
    
    x = np.array([p[0] for p in pairs])
    y = np.array([p[1] for p in pairs])
    
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    return {
        'slope': float(slope),
        'intercept': float(intercept),
        'rSquared': float(r_value ** 2),
        'pValue': float(p_value),
        'stdErr': float(std_err),
        'nPairs': int(len(pairs))
    }


def multiple_regression(X, y):
    import statsmodels.api as sm

    X_array = np.array(X)
    y_array = np.array(y)

    if X_array.shape[0] != len(y_array):
        raise ValueError(f"X and y must have same length: {X_array.shape[0]} != {len(y_array)}")

    valid_rows = []
    for i in range(len(y_array)):
        y_val = y_array[i]
        x_row = X_array[i]

        if (y_val is not None and not np.isnan(y_val) and
            all(x is not None and not np.isnan(x) for x in x_row)):
            valid_rows.append(i)

    if len(valid_rows) < 2:
        raise ValueError(f"Multiple regression requires at least 2 valid observations, got {len(valid_rows)}")

    X_clean = X_array[valid_rows]
    y_clean = y_array[valid_rows]

    if X_clean.shape[0] < X_clean.shape[1] + 1:
        raise ValueError(f"Insufficient observations: need at least {X_clean.shape[1] + 1}, got {X_clean.shape[0]}")

    X_with_const = sm.add_constant(X_clean)
    model = sm.OLS(y_clean, X_with_const).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'tValues': [float(t) for t in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'rSquared': float(model.rsquared),
        'adjustedRSquared': float(model.rsquared_adj),
        'fStatistic': float(model.fvalue),
        'fPValue': float(model.f_pvalue),
        'nObservations': int(len(valid_rows)),
        'nPredictors': int(X_clean.shape[1])
    }


def logistic_regression(X, y):
    import statsmodels.api as sm

    X_array = np.array(X)
    y_array = np.array(y)

    if X_array.shape[0] != len(y_array):
        raise ValueError(f"X and y must have same length: {X_array.shape[0]} != {len(y_array)}")

    valid_rows = []
    for i in range(len(y_array)):
        y_val = y_array[i]
        x_row = X_array[i]

        if (y_val is not None and not np.isnan(y_val) and
            all(x is not None and not np.isnan(x) for x in x_row)):
            valid_rows.append(i)

    if len(valid_rows) < 2:
        raise ValueError(f"Logistic regression requires at least 2 valid observations, got {len(valid_rows)}")

    X_clean = X_array[valid_rows]
    y_clean = y_array[valid_rows]

    X_with_const = sm.add_constant(X_clean)
    model = sm.Logit(y_clean, X_with_const).fit(disp=0)

    predictions_prob = model.predict(X_with_const)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y_clean)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'predictions': [float(p) for p in predictions_prob],
        'predictedClass': [int(c) for c in predictions_class],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'bic': float(model.bic),
        'pseudoRSquared': float(model.prsquared),
        'nObservations': int(len(valid_rows)),
        'nPredictors': int(X_clean.shape[1])
    }


def pca_analysis(data_matrix, n_components=2):
    data_matrix = np.array(data_matrix)
    
    if data_matrix.shape[0] < 2:
        raise ValueError("PCA requires at least 2 observations")
    
    if data_matrix.shape[1] < n_components:
        raise ValueError(f"Cannot extract {n_components} components from {data_matrix.shape[1]} features")
    
    mean = np.mean(data_matrix, axis=0)
    centered_data = data_matrix - mean
    
    U, S, Vt = np.linalg.svd(centered_data, full_matrices=False)
    
    components = U[:, :n_components] * S[:n_components]
    
    explained_variance = (S ** 2) / (data_matrix.shape[0] - 1)
    total_variance = np.sum(explained_variance)
    explained_variance_ratio = explained_variance[:n_components] / total_variance
    
    return {
        'components': components.tolist(),
        'explainedVariance': explained_variance[:n_components].tolist(),
        'explainedVarianceRatio': explained_variance_ratio.tolist(),
        'cumulativeVariance': np.cumsum(explained_variance_ratio).tolist(),
    }


# Priority 2 Methods - Regression (9 methods)

def curve_estimation(x_values, y_values, model_type='linear'):
    pairs = [(x_val, y_val) for x_val, y_val in zip(x_values, y_values)
             if x_val is not None and y_val is not None
             and not np.isnan(x_val) and not np.isnan(y_val)]

    if len(pairs) < 3:
        raise ValueError(f"Curve estimation requires at least 3 valid pairs, got {len(pairs)}")

    x = np.array([p[0] for p in pairs])
    y = np.array([p[1] for p in pairs])

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
        'nPairs': int(len(pairs))
    }


def nonlinear_regression(x_values, y_values, model_type='exponential', initial_guess=None):
    from scipy.optimize import curve_fit

    pairs = [(x_val, y_val) for x_val, y_val in zip(x_values, y_values)
             if x_val is not None and y_val is not None
             and not np.isnan(x_val) and not np.isnan(y_val)]

    if len(pairs) < 3:
        raise ValueError(f"Nonlinear regression requires at least 3 valid pairs, got {len(pairs)}")

    x = np.array([p[0] for p in pairs])
    y = np.array([p[1] for p in pairs])

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
        'nPairs': int(len(pairs))
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


def cluster_analysis(data_matrix, n_clusters=3, method='kmeans'):
    from sklearn.cluster import KMeans, AgglomerativeClustering
    from sklearn.metrics import silhouette_score, calinski_harabasz_score

    data = np.array(data_matrix)

    if data.shape[0] < n_clusters:
        raise ValueError(f"Number of samples ({data.shape[0]}) must be >= n_clusters ({n_clusters})")

    if method == 'kmeans':
        clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    elif method == 'hierarchical':
        clusterer = AgglomerativeClustering(n_clusters=n_clusters)
    else:
        raise ValueError(f"Unknown method: {method}. Use 'kmeans' or 'hierarchical'")

    labels = clusterer.fit_predict(data)

    if hasattr(clusterer, 'cluster_centers_'):
        centers = clusterer.cluster_centers_.tolist()
    else:
        centers = []
        for i in range(n_clusters):
            cluster_data = data[labels == i]
            if len(cluster_data) > 0:
                centers.append(np.mean(cluster_data, axis=0).tolist())
            else:
                centers.append([0.0] * data.shape[1])

    if len(np.unique(labels)) > 1:
        silhouette = float(silhouette_score(data, labels))
        calinski = float(calinski_harabasz_score(data, labels))
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
        'method': method
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


def durbin_watson_test(residuals):
    clean_data = np.array([x for x in residuals if x is not None and not np.isnan(x)])

    if len(clean_data) < 2:
        raise ValueError("Durbin-Watson test requires at least 2 observations")

    diff = np.diff(clean_data)
    dw_statistic = np.sum(diff ** 2) / np.sum(clean_data ** 2)

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

