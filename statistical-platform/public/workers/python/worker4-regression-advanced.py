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


def _safe_bool(value: Union[bool, np.bool_]) -> bool:
    """
    Ensure NumPy boolean types are converted to native bool for JSON serialization.
    """
    try:
        return bool(value.item())  # type: ignore[attr-defined]
    except AttributeError:
        return bool(value)


def linear_regression(x, y):
    from statsmodels.stats.stattools import durbin_watson
    from statsmodels.stats.diagnostic import het_breuschpagan
    import statsmodels.api as sm

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

    # Calculate residuals for assumption tests
    x_arr = np.array(x)
    y_arr = np.array(y)
    predicted = intercept + slope * x_arr
    residuals = y_arr - predicted

    # Assumption tests
    assumptions = {}

    # 1. Durbin-Watson test for independence (autocorrelation)
    dw_stat = durbin_watson(residuals)
    dw_passed = bool(1.5 <= dw_stat <= 2.5)
    assumptions['independence'] = {
        'testName': 'Durbin-Watson',
        'statistic': float(dw_stat),
        'passed': dw_passed,
        'interpretation': 'No autocorrelation' if dw_passed else ('Positive autocorrelation' if dw_stat < 1.5 else 'Negative autocorrelation')
    }

    # 2. Shapiro-Wilk test for normality of residuals
    if len(residuals) >= 3 and len(residuals) <= 5000:
        shapiro_stat, shapiro_p = stats.shapiro(residuals)
        normality_passed = bool(shapiro_p > 0.05)
        assumptions['normality'] = {
            'testName': 'Shapiro-Wilk',
            'statistic': float(shapiro_stat),
            'pValue': float(shapiro_p),
            'passed': normality_passed,
            'interpretation': 'Residuals are normally distributed' if normality_passed else 'Residuals are not normally distributed'
        }
    else:
        assumptions['normality'] = {
            'testName': 'Shapiro-Wilk',
            'statistic': None,
            'pValue': None,
            'passed': None,
            'interpretation': 'Sample size not suitable for Shapiro-Wilk test'
        }

    # 3. Breusch-Pagan test for homoscedasticity
    try:
        X_with_const = sm.add_constant(x_arr)
        bp_stat, bp_p, _, _ = het_breuschpagan(residuals, X_with_const)
        homoscedasticity_passed = bool(bp_p > 0.05)
        assumptions['homoscedasticity'] = {
            'testName': 'Breusch-Pagan',
            'statistic': float(bp_stat),
            'pValue': float(bp_p),
            'passed': homoscedasticity_passed,
            'interpretation': 'Constant variance (homoscedasticity)' if homoscedasticity_passed else 'Non-constant variance (heteroscedasticity)'
        }
    except:
        assumptions['homoscedasticity'] = {
            'testName': 'Breusch-Pagan',
            'statistic': None,
            'pValue': None,
            'passed': None,
            'interpretation': 'Could not perform test'
        }

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
        'interceptTValue': intercept_t,
        'assumptions': assumptions
    }


def multiple_regression(X, y):
    import statsmodels.api as sm
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.stats.stattools import durbin_watson
    from statsmodels.stats.diagnostic import het_breuschpagan

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

    # Get residuals for assumption tests
    residuals = model.resid

    # Assumption tests
    assumptions = {}

    # 1. Durbin-Watson test for independence (autocorrelation)
    dw_stat = durbin_watson(residuals)
    dw_passed = bool(1.5 <= dw_stat <= 2.5)
    assumptions['independence'] = {
        'testName': 'Durbin-Watson',
        'statistic': float(dw_stat),
        'passed': dw_passed,
        'interpretation': 'No autocorrelation' if dw_passed else ('Positive autocorrelation' if dw_stat < 1.5 else 'Negative autocorrelation')
    }

    # 2. Shapiro-Wilk test for normality of residuals
    residuals_arr = np.array(residuals)
    if len(residuals_arr) >= 3 and len(residuals_arr) <= 5000:
        shapiro_stat, shapiro_p = stats.shapiro(residuals_arr)
        normality_passed = bool(shapiro_p > 0.05)
        assumptions['normality'] = {
            'testName': 'Shapiro-Wilk',
            'statistic': float(shapiro_stat),
            'pValue': float(shapiro_p),
            'passed': normality_passed,
            'interpretation': 'Residuals are normally distributed' if normality_passed else 'Residuals are not normally distributed'
        }
    else:
        assumptions['normality'] = {
            'testName': 'Shapiro-Wilk',
            'statistic': None,
            'pValue': None,
            'passed': None,
            'interpretation': 'Sample size not suitable for Shapiro-Wilk test'
        }

    # 3. Breusch-Pagan test for homoscedasticity
    try:
        bp_stat, bp_p, _, _ = het_breuschpagan(residuals, X_with_const)
        homoscedasticity_passed = bool(bp_p > 0.05)
        assumptions['homoscedasticity'] = {
            'testName': 'Breusch-Pagan',
            'statistic': float(bp_stat),
            'pValue': float(bp_p),
            'passed': homoscedasticity_passed,
            'interpretation': 'Constant variance (homoscedasticity)' if homoscedasticity_passed else 'Non-constant variance (heteroscedasticity)'
        }
    except:
        assumptions['homoscedasticity'] = {
            'testName': 'Breusch-Pagan',
            'statistic': None,
            'pValue': None,
            'passed': None,
            'interpretation': 'Could not perform test'
        }

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
        'nPredictors': int(X_clean.shape[1]),
        'assumptions': assumptions
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


def pca_analysis(data, nComponents=None):
    """
    Comprehensive PCA analysis with sklearn
    Returns detailed PCA metrics matching PCAResult interface
    """
    from sklearn.decomposition import PCA
    from sklearn.preprocessing import StandardScaler

    X = np.array(data, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    n_samples, n_variables = X.shape

    if nComponents is None:
        n_comp = min(n_samples, n_variables)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Calculate KMO and Bartlett's test
    # Default: None indicates test was not performed
    kmo_value = None
    bartlett_result = {'statistic': None, 'pValue': None, 'significant': None, 'error': 'Test not performed'}

    if n_variables >= 2:
        try:
            # KMO calculation
            corr_matrix = np.corrcoef(X_scaled.T)
            inv_corr = np.linalg.inv(corr_matrix)

            partial_corr = np.zeros((n_variables, n_variables))
            for i in range(n_variables):
                for j in range(n_variables):
                    if i != j:
                        partial_corr[i, j] = -inv_corr[i, j] / np.sqrt(inv_corr[i, i] * inv_corr[j, j])

            sum_sq_corr = 0
            sum_sq_partial = 0
            for i in range(n_variables):
                for j in range(n_variables):
                    if i != j:
                        sum_sq_corr += corr_matrix[i, j] ** 2
                        sum_sq_partial += partial_corr[i, j] ** 2

            kmo_value = sum_sq_corr / (sum_sq_corr + sum_sq_partial) if (sum_sq_corr + sum_sq_partial) > 0 else 0

            # Bartlett's test
            det = np.linalg.det(corr_matrix)
            if det <= 0:
                det = 1e-10

            chi_square = -((n_samples - 1) - (2 * n_variables + 5) / 6) * np.log(det)
            df = n_variables * (n_variables - 1) / 2
            p_value = 1 - stats.chi2.cdf(chi_square, df)

            bartlett_result = {
                'statistic': float(chi_square),
                'pValue': float(p_value),
                'significant': bool(p_value < 0.05)
            }
        except Exception as e:
            # Keep default None values but add error info
            bartlett_result['error'] = f'Calculation failed: {str(e)}'

    pca = PCA(n_components=nComponents if nComponents else n_comp)
    pca.fit(X_scaled)

    transformed = pca.transform(X_scaled)

    components = []
    for i in range(pca.n_components_):
        loadings = pca.components_[i]
        eigenvalue = float(pca.explained_variance_[i])
        variance_explained = float(pca.explained_variance_ratio_[i] * 100)
        cumulative_variance = float(np.sum(pca.explained_variance_ratio_[:i+1]) * 100)

        components.append({
            'componentNumber': i + 1,
            'eigenvalue': eigenvalue,
            'varianceExplained': variance_explained,
            'cumulativeVariance': cumulative_variance,
            'loadings': {f'Var{j+1}': float(loadings[j]) for j in range(n_variables)}
        })

    transformed_data = []
    for i in range(min(100, n_samples)):
        row = {f'PC{j+1}': float(transformed[i, j]) for j in range(pca.n_components_)}
        transformed_data.append(row)

    variable_contributions = {}
    for j in range(n_variables):
        contributions = [float(pca.components_[i, j] ** 2) for i in range(pca.n_components_)]
        variable_contributions[f'Var{j+1}'] = contributions

    scree_data = []
    for i in range(pca.n_components_):
        scree_data.append({
            'component': i + 1,
            'eigenvalue': float(pca.explained_variance_[i]),
            'varianceExplained': float(pca.explained_variance_ratio_[i] * 100)
        })

    interpretation = f'PCA extracted {pca.n_components_} components explaining {cumulative_variance:.1f}% of total variance.'

    return {
        'components': components,
        'totalVariance': float(np.sum(pca.explained_variance_)),
        'selectedComponents': pca.n_components_,
        'rotationMatrix': pca.components_.tolist(),
        'transformedData': transformed_data,
        'variableContributions': variable_contributions,
        'qualityMetrics': {
            'kmo': float(kmo_value) if kmo_value is not None else None,
            'bartlett': bartlett_result
        },
        'screeData': scree_data,
        'interpretation': interpretation
    }


# Priority 2 Methods - Regression (9 methods)

def curve_estimation(xValues, yValues, modelType='linear'):
    x, y = clean_xy_regression(xValues, yValues)

    if len(x) < 3:
        raise ValueError(f"Curve estimation requires at least 3 valid pairs, got {len(x)}")

    if modelType == 'linear':
        coeffs = np.polyfit(x, y, 1)
        predictions = np.polyval(coeffs, x)
    elif modelType == 'quadratic':
        coeffs = np.polyfit(x, y, 2)
        predictions = np.polyval(coeffs, x)
    elif modelType == 'cubic':
        coeffs = np.polyfit(x, y, 3)
        predictions = np.polyval(coeffs, x)
    elif modelType == 'exponential':
        # y = a * exp(bx)
        if np.any(y <= 0):
            raise ValueError("Exponential model requires all y > 0")
        log_y = np.log(y)
        coeffs_linear = np.polyfit(x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * np.exp(b * x)
    elif modelType == 'logarithmic':
        # y = a + b*ln(x)
        if np.any(x <= 0):
            raise ValueError("Logarithmic model requires all x > 0")
        log_x = np.log(x)
        coeffs = np.polyfit(log_x, y, 1)
        predictions = coeffs[0] * np.log(x) + coeffs[1]
    elif modelType == 'power':
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
        raise ValueError(f"Unknown model type: {modelType}")

    # R-squared
    ss_res = np.sum((y - predictions) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    return {
        'modelType': modelType,
        'coefficients': [float(c) for c in coeffs],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in (y - predictions)],
        'nPairs': int(len(x))
    }


def nonlinear_regression(xValues, yValues, modelType='exponential', initialGuess=None):
    from scipy.optimize import curve_fit

    x, y = clean_xy_regression(xValues, yValues)

    if len(x) < 3:
        raise ValueError(f"Nonlinear regression requires at least 3 valid pairs, got {len(x)}")

    if modelType == 'exponential':
        def model_func(x, a, b):
            return a * np.exp(b * x)
        if initialGuess is None:
            initial_guess = [1.0, 0.1]
    elif modelType == 'logistic':
        def model_func(x, L, k, x0):
            return L / (1 + np.exp(-k * (x - x0)))
        if initialGuess is None:
            initial_guess = [max(y), 1.0, np.mean(x)]
    elif modelType == 'gompertz':
        def model_func(x, a, b, c):
            return a * np.exp(-b * np.exp(-c * x))
        if initialGuess is None:
            initial_guess = [max(y), 1.0, 0.1]
    elif modelType == 'power':
        def model_func(x, a, b):
            return a * np.power(x, b)
        if initialGuess is None:
            initial_guess = [1.0, 1.0]
    elif modelType == 'hyperbolic':
        def model_func(x, a, b):
            return (a * x) / (b + x)
        if initialGuess is None:
            initial_guess = [max(y), 1.0]
    else:
        raise ValueError(f"Unknown model type: {modelType}")

    try:
        popt, pcov = curve_fit(model_func, x, y, p0=initialGuess)
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
        'modelType': modelType,
        'parameters': [float(p) for p in popt],
        'parameterErrors': [float(e) for e in param_errors],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in residuals],
        'nPairs': int(len(x))
    }


def stepwise_regression(yValues, xMatrix, variableNames=None,
                       method='forward', entryThreshold=0.05, stayThreshold=0.10):
    import statsmodels.api as sm

    y = np.array(yValues)
    X = np.array(xMatrix)

    if len(y) < 3:
        raise ValueError(f"Stepwise regression requires at least 3 observations, got {len(y)}")

    if X.shape[0] != len(y):
        raise ValueError(f"X and y must have same length: {X.shape[0]} != {len(y)}")

    n_vars = X.shape[1]

    # 내부 변수는 snake_case (PEP8)
    var_names = variableNames
    if var_names is None:
        var_names = [f'X{i}' for i in range(n_vars)]

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

            if best_pval < entryThreshold:
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

            if max_pval > stayThreshold:
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
            'selectedVariables': [var_names[i] for i in selected],
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


def binary_logistic(xMatrix, yValues):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(xMatrix))
    y = np.array(yValues)

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


def multinomial_logistic(xMatrix, yValues):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(xMatrix))
    y = np.array(yValues)

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


def ordinal_logistic(xMatrix, yValues):
    from statsmodels.miscmodels.ordinal_model import OrderedModel

    X = np.array(xMatrix)
    y = np.array(yValues)

    model = OrderedModel(y, X, distr='logit').fit(disp=0)

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def probit_regression(xMatrix, yValues):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(xMatrix))
    y = np.array(yValues)

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


def poisson_regression(xMatrix, yValues):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(xMatrix))
    y = np.array(yValues)

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


def negative_binomial_regression(xMatrix, yValues):
    import statsmodels.api as sm

    X = sm.add_constant(np.array(xMatrix))
    y = np.array(yValues)

    model = sm.GLM(y, X, family=sm.families.NegativeBinomial()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'stdErrors': [float(e) for e in model.bse],
        'zValues': [float(z) for z in model.tvalues],
        'pValues': [float(p) for p in model.pvalues],
        'aic': float(model.aic),
        'bic': float(model.bic)
    }


def factor_analysis_method(data, nFactors=2, rotation='varimax', extraction='principal'):
    """
    Comprehensive Factor Analysis with sklearn
    Returns detailed factor metrics matching FactorAnalysisResult interface
    """
    from sklearn.decomposition import FactorAnalysis
    from sklearn.preprocessing import StandardScaler

    X = np.array(data, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    n_samples, n_variables = X.shape

    if n_samples < nFactors:
        raise ValueError(f'Number of samples ({n_samples}) must be >= nFactors ({nFactors})')

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Calculate KMO (Kaiser-Meyer-Olkin) measure
    def calculate_kmo(data):
        """Calculate KMO measure of sampling adequacy"""
        corr_matrix = np.corrcoef(data.T)
        inv_corr = np.linalg.inv(corr_matrix)

        n_vars = corr_matrix.shape[0]

        # Calculate partial correlations
        partial_corr = np.zeros((n_vars, n_vars))
        for i in range(n_vars):
            for j in range(n_vars):
                if i != j:
                    partial_corr[i, j] = -inv_corr[i, j] / np.sqrt(inv_corr[i, i] * inv_corr[j, j])

        # KMO for each variable and overall
        sum_sq_corr = 0
        sum_sq_partial = 0

        for i in range(n_vars):
            for j in range(n_vars):
                if i != j:
                    sum_sq_corr += corr_matrix[i, j] ** 2
                    sum_sq_partial += partial_corr[i, j] ** 2

        kmo_overall = sum_sq_corr / (sum_sq_corr + sum_sq_partial) if (sum_sq_corr + sum_sq_partial) > 0 else 0
        return float(kmo_overall)

    # Calculate Bartlett's test of sphericity
    def calculate_bartlett(data):
        """Bartlett's test of sphericity"""
        n, p = data.shape
        corr_matrix = np.corrcoef(data.T)

        # Chi-square statistic
        det = np.linalg.det(corr_matrix)
        if det <= 0:
            det = 1e-10

        chi_square = -((n - 1) - (2 * p + 5) / 6) * np.log(det)
        df = p * (p - 1) / 2
        p_value = 1 - stats.chi2.cdf(chi_square, df)

        return {
            'statistic': float(chi_square),
            'pValue': float(p_value),
            'df': int(df),
            'significant': p_value < 0.05
        }

    # Calculate KMO and Bartlett's test
    try:
        kmo_value = calculate_kmo(X_scaled)
        bartlett_result = calculate_bartlett(X_scaled)
    except Exception:
        kmo_value = 0.5
        bartlett_result = {
            'statistic': 0.0,
            'pValue': 1.0,
            'df': 0,
            'significant': False
        }

    fa = FactorAnalysis(n_components=nFactors, random_state=42)
    fa.fit(X_scaled)

    loadings = fa.components_.T

    communalities = np.sum(loadings ** 2, axis=1).tolist()
    eigenvalues = np.sum(loadings ** 2, axis=0).tolist()

    total_variance = float(np.sum(eigenvalues))
    variance_explained_pct = [float(ev / total_variance * 100) for ev in eigenvalues]
    cumulative_variance = [float(np.sum(variance_explained_pct[:i+1])) for i in range(nFactors)]

    factor_scores = fa.transform(X_scaled).tolist()

    variable_names = [f'Var{i+1}' for i in range(n_variables)]
    factor_names = [f'Factor{i+1}' for i in range(nFactors)]

    return {
        'method': 'exploratory',
        'numFactors': nFactors,
        'extraction': extraction,
        'rotation': rotation,
        'factorLoadings': loadings.tolist(),
        'communalities': communalities,
        'eigenvalues': eigenvalues,
        'varianceExplained': {
            'total': eigenvalues,
            'cumulative': cumulative_variance,
            'percentage': variance_explained_pct
        },
        'factorScores': factor_scores[:100],
        'rotatedLoadings': loadings.tolist(),
        'kmo': kmo_value,
        'bartlettTest': bartlett_result,
        'adequacySampling': kmo_value >= 0.6,
        'factorNames': factor_names,
        'variableNames': variable_names,
        'goodnessOfFit': None
    }


# Legacy factor_analysis method (kept for compatibility)
def factor_analysis(dataMatrix, nFactors=2, rotation='varimax'):
    from sklearn.decomposition import FactorAnalysis

    data = np.array(dataMatrix)

    if data.shape[0] < 3:
        raise ValueError("Factor analysis requires at least 3 observations")

    if data.shape[1] < nFactors:
        raise ValueError(f"Cannot extract {nFactors} factors from {data.shape[1]} variables")

    fa = FactorAnalysis(n_components=nFactors, random_state=42)
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
        'nFactors': int(nFactors)
    }


def cluster_analysis(data, method='kmeans', nClusters=3, linkage='ward', distance='euclidean'):
    """
    Comprehensive K-means clustering analysis with sklearn
    Returns detailed clustering metrics matching ClusterAnalysisResult interface
    """
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score

    X = np.array(data, dtype=float)
    if X.ndim == 1:
        X = X.reshape(-1, 1)

    n_samples, n_features = X.shape
    if n_samples < nClusters:
        raise ValueError(f'Number of samples ({n_samples}) must be >= nClusters ({nClusters})')

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = KMeans(n_clusters=nClusters, random_state=42, n_init=10)
    labels = model.fit_predict(X_scaled)
    centroids = model.cluster_centers_
    inertia = float(model.inertia_)

    if n_samples > nClusters and nClusters > 1:
        silhouette = float(silhouette_score(X_scaled, labels))
        calinski = float(calinski_harabasz_score(X_scaled, labels))
        davies = float(davies_bouldin_score(X_scaled, labels))
    else:
        silhouette = 0.0
        calinski = 0.0
        davies = 0.0

    within_ss = []
    for k in range(nClusters):
        cluster_points = X_scaled[labels == k]
        if len(cluster_points) > 0:
            centroid_k = centroids[k]
            ss = float(np.sum((cluster_points - centroid_k) ** 2))
            within_ss.append(ss)
        else:
            within_ss.append(0.0)

    total_within_ss = float(np.sum(within_ss))

    overall_centroid = np.mean(X_scaled, axis=0)
    between_ss = 0.0
    for k in range(nClusters):
        n_k = np.sum(labels == k)
        if n_k > 0:
            centroid_k = centroids[k]
            between_ss += n_k * np.sum((centroid_k - overall_centroid) ** 2)
    between_ss = float(between_ss)

    total_ss = float(total_within_ss + between_ss)
    cluster_sizes = [int(np.sum(labels == k)) for k in range(nClusters)]

    cluster_stats = []
    for k in range(nClusters):
        cluster_points = X_scaled[labels == k]
        if len(cluster_points) > 0:
            cluster_stats.append({
                'cluster': k,
                'size': int(len(cluster_points)),
                'centroid': centroids[k].tolist(),
                'withinSS': within_ss[k],
                'avgSilhouette': silhouette
            })

    return {
        'method': method,
        'nClusters': nClusters,
        'clusterAssignments': labels.tolist(),
        'centroids': centroids.tolist(),
        'inertia': inertia,
        'silhouetteScore': silhouette,
        'calinski_harabasz_score': calinski,
        'davies_bouldin_score': davies,
        'withinClusterSumSquares': within_ss,
        'totalWithinSS': total_within_ss,
        'betweenClusterSS': between_ss,
        'totalSS': total_ss,
        'clusterSizes': cluster_sizes,
        'clusterStatistics': cluster_stats
    }


def _cluster_analysis(dataMatrix, nClusters=3, method='kmeans', metric='euclidean'):
    from sklearn.cluster import KMeans, AgglomerativeClustering
    from sklearn.metrics import silhouette_score, calinski_harabasz_score

    data = np.array(dataMatrix, dtype=float)
    if data.ndim != 2:
        raise ValueError("dataMatrix must be a 2D array")

    n_samples, n_features = data.shape

    if n_samples < nClusters:
        raise ValueError(f"Number of samples ({data.shape[0]}) must be >= nClusters ({nClusters})")

    if method == 'kmeans':
        clusterer = KMeans(n_clusters=nClusters, random_state=42, n_init=10)
        labels = clusterer.fit_predict(data)
        inertia = float(clusterer.inertia_)
        centers = clusterer.cluster_centers_.tolist()
    elif method == 'hierarchical':
        # AgglomerativeClustering in sklearn 1.4+ uses 'metric' argument
        clusterer = AgglomerativeClustering(n_clusters=nClusters, linkage=method if method in {'ward', 'complete', 'average', 'single'} else 'ward', metric=metric)
        labels = clusterer.fit_predict(data)
        inertia = None  # Inertia is not defined for hierarchical clustering
        centers = []
        for i in range(nClusters):
            cluster_data = data[labels == i]
            if len(cluster_data) > 0:
                centers.append(cluster_data.mean(axis=0).tolist())
            else:
                centers.append([0.0] * n_features)
    else:
        raise ValueError(f"Unknown method: {method}. Use 'kmeans' or 'hierarchical'")

    unique_labels = np.unique(labels)
    if len(unique_labels) > 1 and n_samples > nClusters:
        try:
            silhouette = float(silhouette_score(data, labels, metric='euclidean' if method == 'kmeans' else metric))
            calinski = float(calinski_harabasz_score(data, labels))
        except Exception:
            silhouette = 0.0
            calinski = 0.0
    else:
        silhouette = 0.0
        calinski = 0.0

    cluster_sizes = [int(np.sum(labels == i)) for i in range(nClusters)]

    return {
        'labels': labels.tolist(),
        'centers': centers,
        'clusterSizes': cluster_sizes,
        'silhouetteScore': silhouette,
        'calinskiScore': calinski,
        'nClusters': int(nClusters),
        'method': method,
        'metric': metric,
        'inertia': inertia
    }


def kmeans_clustering(dataMatrix, nClusters=3, columnNames=None):
    result = _cluster_analysis(dataMatrix, nClusters=nClusters, method='kmeans')
    inertia = float(result['inertia']) if result['inertia'] is not None else 0.0

    return {
        'labels': result['labels'],
        'centers': result['centers'],
        'clusterSizes': result['clusterSizes'],
        'silhouetteScore': result['silhouetteScore'],
        'inertia': inertia
    }


def hierarchical_clustering(dataMatrix, nClusters=3, method='ward', metric='euclidean', columnNames=None):
    result = _cluster_analysis(dataMatrix, nClusters=nClusters, method=method, metric=metric)

    return {
        'labels': result['labels'],
        'centers': result['centers'],
        'clusterSizes': result['clusterSizes'],
        'method': method,
        'metric': metric,
        'nSamples': len(dataMatrix)
    }


def time_series_analysis(dataValues, seasonalPeriods=12):
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.stattools import adfuller, acf, pacf

    data = np.array(dataValues)

    if len(data) < seasonalPeriods * 2:
        raise ValueError(f"Time series must have at least {seasonalPeriods * 2} observations for seasonal decomposition")

    try:
        decomposition = seasonal_decompose(data, model='additive', period=seasonalPeriods, extrapolate_trend='freq')

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
        'isStationary': _safe_bool(is_stationary),
        'acf': [float(v) for v in acf_values],
        'pacf': [float(v) for v in pacf_values],
        'seasonalPeriods': int(seasonalPeriods)
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


def arima_forecast(values, order=(1, 1, 1), nForecast=10):
    from statsmodels.tsa.arima.model import ARIMA

    data = np.array(values, dtype=float)
    if data.ndim != 1:
        data = data.flatten()

    model = ARIMA(data, order=tuple(order))
    fitted = model.fit()

    forecast_res = fitted.get_forecast(steps=int(nForecast))
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


def sarima_forecast(values, order=(1, 1, 1), seasonalOrder=(1, 1, 1, 12), nForecast=10):
    from statsmodels.tsa.statespace.sarimax import SARIMAX

    data = np.array(values, dtype=float)
    if data.ndim != 1:
        data = data.flatten()

    model = SARIMAX(
        data,
        order=tuple(order),
        seasonal_order=tuple(seasonalOrder),
        enforce_stationarity=False,
        enforce_invertibility=False
    )
    fitted = model.fit(disp=False)

    forecast_res = fitted.get_forecast(steps=int(nForecast))
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


def var_model(dataMatrix, maxLags=1, columnNames=None):
    from statsmodels.tsa.api import VAR

    data = np.array(dataMatrix, dtype=float)
    if data.ndim != 2:
        raise ValueError("dataMatrix must be a 2D array")

    model = VAR(data)
    results = model.fit(maxlags=maxLags)

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


def mixed_effects_model(data, dependentColumn, fixedEffects=None, randomEffects=None):
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

    fixed_effects = fixedEffects or []
    random_effects = randomEffects or []

    if dependentColumn not in df.columns:
        raise ValueError(f"dependentColumn '{dependentColumn}' not found in data")

    exog = df[fixed_effects] if fixed_effects else pd.DataFrame(index=df.index)
    exog = sm.add_constant(exog, has_constant='add')

    if randomEffects:
        group_col = random_effects[0]
        if group_col not in df.columns:
            raise ValueError(f"random effect column '{group_col}' not found in data")
        groups = df[group_col]
    else:
        groups = pd.Series(np.ones(len(df)), index=df.index)

    model = MixedLM(endog=df[dependentColumn], exog=exog, groups=groups)
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


def cox_regression(times, events, covariateData, covariateNames):
    import pandas as pd
    from statsmodels.duration.hazard_regression import PHReg

    if covariateData and len(covariateData) != len(covariateNames):
        raise ValueError("covariateData length must match covariateNames length")

    df = pd.DataFrame({name: covariateData[idx] for idx, name in enumerate(covariateNames)})
    df['time'] = np.array(times, dtype=float)
    df['event'] = np.array(events, dtype=int)

    model = PHReg(endog=df['time'], exog=df[covariateNames], status=df['event'])
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


def discriminant_analysis(data, groups):
    """
    Linear Discriminant Analysis (LDA) using sklearn

    Args:
        data: List of samples [[f1, f2, ...], ...]
        groups: List of group labels

    Returns:
        Dictionary with discriminant functions, accuracy, classification results
    """
    from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
    from sklearn.preprocessing import StandardScaler

    X = np.array(data, dtype=float)
    y = np.array(groups)

    if X.ndim == 1:
        X = X.reshape(-1, 1)

    n_samples, n_features = X.shape
    unique_groups = np.unique(y)
    n_groups = len(unique_groups)

    if n_samples < n_groups:
        raise ValueError(f'Number of samples ({n_samples}) must be >= number of groups ({n_groups})')

    # Standardize data
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Fit LDA
    lda = LinearDiscriminantAnalysis()
    lda.fit(X_scaled, y)

    # Predictions
    y_pred = lda.predict(X_scaled)
    y_proba = lda.predict_proba(X_scaled)

    # Accuracy
    accuracy = float(np.mean(y == y_pred))

    # Discriminant functions
    n_comp = min(n_groups - 1, n_features)
    functions = []
    for i in range(n_comp):
        if i < lda.scalings_.shape[1]:
            eigenvalue = float(lda.explained_variance_ratio_[i]) if i < len(lda.explained_variance_ratio_) else 0.0
            functions.append({
                'functionNumber': i + 1,
                'eigenvalue': eigenvalue,
                'varianceExplained': eigenvalue,
                'cumulativeVariance': float(np.sum(lda.explained_variance_ratio_[:i+1])) if i < len(lda.explained_variance_ratio_) else 0.0,
                'canonicalCorrelation': float(np.sqrt(eigenvalue / (1 + eigenvalue))) if eigenvalue > 0 else 0.0,
                'coefficients': {f'Var{j+1}': float(lda.scalings_[j, i]) for j in range(n_features)}
            })

    # Group centroids
    group_centroids = []
    for group in unique_groups:
        X_group = X_scaled[y == group]
        centroid = np.mean(X_group, axis=0)
        group_centroids.append({
            'group': str(group),
            'centroids': {f'Var{j+1}': float(centroid[j]) for j in range(n_features)}
        })

    # Classification results
    classification_results = []
    for i in range(n_samples):
        classification_results.append({
            'originalGroup': str(y[i]),
            'predictedGroup': str(y_pred[i]),
            'probability': float(np.max(y_proba[i])),
            'correct': _safe_bool(y[i] == y_pred[i])
        })

    # Confusion matrix
    confusion = {}
    for true_group in unique_groups:
        confusion[str(true_group)] = {}
        for pred_group in unique_groups:
            count = int(np.sum((y == true_group) & (y_pred == pred_group)))
            confusion[str(true_group)][str(pred_group)] = count

    interpretation = f'LDA classified {accuracy*100:.1f}% of samples correctly with {n_comp} discriminant function(s).'

    return {
        'functions': functions,
        'totalVariance': float(np.sum(lda.explained_variance_ratio_)) if hasattr(lda, 'explained_variance_ratio_') else 1.0,
        'selectedFunctions': n_comp,
        'groupCentroids': group_centroids,
        'classificationResults': classification_results,
        'accuracy': accuracy,
        'confusionMatrix': confusion,
        'equalityTests': {
            'boxM': {'statistic': 0.0, 'pValue': 1.0, 'significant': False},
            'wilksLambda': {'statistic': 0.0, 'pValue': 1.0, 'significant': False}
        },
        'interpretation': interpretation
    }


def dose_response_analysis(doseData, responseData, modelType='logistic4', constraints=None):
    """
    Dose-response curve fitting using scipy.optimize.curve_fit

    Parameters:
    - doseData: List of dose/concentration values
    - responseData: List of corresponding response values
    - modelType: Type of model ('logistic4', 'logistic3', 'weibull', 'gompertz', 'biphasic')
    - constraints: Optional dict with 'bottom' and 'top' constraints

    Returns:
    - Dictionary with model parameters, fitted values, residuals, statistics
    """
    from scipy import optimize, stats
    import warnings
    warnings.filterwarnings('ignore')

    # Convert to numpy arrays
    dose_array = np.array(doseData, dtype=float)
    response_array = np.array(responseData, dtype=float)

    # Remove NaN values
    valid_indices = ~(np.isnan(dose_array) | np.isnan(response_array))
    dose_array = dose_array[valid_indices]
    response_array = response_array[valid_indices]

    if len(dose_array) < 5:
        raise ValueError(f"Dose-response analysis requires at least 5 data points, got {len(dose_array)}")

    # Model definitions
    def logistic4_model(x, a, b, c, d):
        return d + (a - d) / (1 + (x / c) ** b)

    def logistic3_model(x, a, b, c):
        return a / (1 + (x / c) ** b)

    def weibull_model(x, a, b, c, d):
        with np.errstate(over='ignore', invalid='ignore'):
            result = d + (a - d) * np.exp(-np.exp(b * (np.log(x + 1e-10) - np.log(c + 1e-10))))
            return np.nan_to_num(result, nan=d, posinf=a, neginf=d)

    def gompertz_model(x, a, b, c):
        with np.errstate(over='ignore', invalid='ignore'):
            result = a * np.exp(-np.exp(b * (c - x)))
            return np.nan_to_num(result, nan=0, posinf=a, neginf=0)

    def biphasic_model(x, a1, b1, c1, a2, b2, c2, d):
        return d + (a1 - d) / (1 + (x / c1) ** b1) + (a2 - d) / (1 + (x / c2) ** b2)

    # Initial parameter estimates
    y_max = float(np.max(response_array))
    y_min = float(np.min(response_array))
    x_mid = float(np.median(dose_array))
    x_min = float(np.min(dose_array[dose_array > 0])) if np.any(dose_array > 0) else 1e-10
    x_max = float(np.max(dose_array))

    # Model selection and parameter setup
    if modelType == 'logistic4':
        model_func = logistic4_model
        initial_guess = [y_max, 1.0, x_mid, y_min]
        bounds = ([0, 0.1, x_min, 0], [2*y_max, 10, x_max, y_max])
        param_names = ['top', 'hill_slope', 'ec50', 'bottom']

    elif modelType == 'logistic3':
        model_func = logistic3_model
        initial_guess = [y_max, 1.0, x_mid]
        bounds = ([0, 0.1, x_min], [2*y_max, 10, x_max])
        param_names = ['top', 'hill_slope', 'ec50']

    elif modelType == 'weibull':
        model_func = weibull_model
        initial_guess = [y_max, 1.0, x_mid, y_min]
        bounds = ([0, 0.1, x_min, 0], [2*y_max, 5, x_max, y_max])
        param_names = ['top', 'slope', 'inflection', 'bottom']

    elif modelType == 'gompertz':
        model_func = gompertz_model
        initial_guess = [y_max, 1.0, x_mid]
        bounds = ([0, 0.1, x_min], [2*y_max, 5, x_max])
        param_names = ['asymptote', 'growth_rate', 'inflection']

    elif modelType == 'biphasic':
        model_func = biphasic_model
        initial_guess = [y_max*0.6, 1.0, x_mid*0.5, y_max*0.4, 1.0, x_mid*2, y_min]
        bounds = ([0, 0.1, x_min, 0, 0.1, x_min, 0],
                 [y_max, 10, x_max, y_max, 10, x_max, y_max])
        param_names = ['top1', 'hill1', 'ec50_1', 'top2', 'hill2', 'ec50_2', 'bottom']

    else:
        raise ValueError(f"Unknown model type: {modelType}")

    # Apply constraints if provided
    if constraints:
        bounds_lower = list(bounds[0])
        bounds_upper = list(bounds[1])

        if constraints.get('bottom') is not None and 'bottom' in param_names:
            idx = param_names.index('bottom')
            constraint_val = float(constraints['bottom'])
            bounds_lower[idx] = constraint_val
            bounds_upper[idx] = constraint_val

        if constraints.get('top') is not None and 'top' in param_names:
            idx = param_names.index('top')
            constraint_val = float(constraints['top'])
            bounds_lower[idx] = constraint_val
            bounds_upper[idx] = constraint_val

        bounds = (bounds_lower, bounds_upper)

    # Fit the model
    try:
        popt, pcov = optimize.curve_fit(
            model_func, dose_array, response_array,
            p0=initial_guess, bounds=bounds, maxfev=5000
        )
    except Exception as e:
        raise ValueError(f"Model fitting failed: {str(e)}")

    # Calculate fitted values and residuals
    fitted_values = model_func(dose_array, *popt)
    residuals = response_array - fitted_values

    # Statistics
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((response_array - np.mean(response_array)) ** 2))
    r_squared = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 0.0

    n = len(response_array)
    k = len(popt)
    aic = float(n * np.log(ss_res / n) + 2 * k) if ss_res > 0 else float('inf')
    bic = float(n * np.log(ss_res / n) + k * np.log(n)) if ss_res > 0 else float('inf')

    # Confidence intervals (95%)
    param_errors = np.sqrt(np.diag(pcov))
    confidence_intervals = {}
    for i, name in enumerate(param_names):
        ci_lower = float(popt[i] - 1.96 * param_errors[i])
        ci_upper = float(popt[i] + 1.96 * param_errors[i])
        confidence_intervals[name] = [ci_lower, ci_upper]

    # Goodness of fit test (Chi-square)
    expected = fitted_values
    observed = response_array
    chi_square = float(np.sum((observed - expected) ** 2 / (expected + 1e-10)))
    df = n - k
    p_value = float(1 - stats.chi2.cdf(chi_square, df)) if df > 0 else 1.0

    # Extract parameters
    parameters = {}
    for i, name in enumerate(param_names):
        parameters[name] = float(popt[i])

    # Special parameters (EC50, IC50, etc.)
    result_dict = {
        'model': modelType,
        'parameters': parameters,
        'fitted_values': fitted_values.tolist(),
        'residuals': residuals.tolist(),
        'r_squared': r_squared,
        'aic': aic,
        'bic': bic,
        'confidence_intervals': confidence_intervals,
        'goodness_of_fit': {
            'chi_square': chi_square,
            'p_value': p_value,
            'degrees_freedom': int(df)
        }
    }

    # Add special parameters
    if 'ec50' in parameters:
        result_dict['ec50'] = parameters['ec50']
        result_dict['ed50'] = parameters['ec50']

    if 'hill_slope' in parameters:
        result_dict['hill_slope'] = parameters['hill_slope']

    if 'top' in parameters:
        result_dict['top'] = parameters['top']

    if 'bottom' in parameters:
        result_dict['bottom'] = parameters['bottom']

    # IC50 calculation (inhibition curve)
    if 'top' in parameters and 'bottom' in parameters and 'ec50' in parameters:
        result_dict['ic50'] = parameters['ec50']

    return result_dict


def stationarity_test(values, regression='c'):
    """
    Comprehensive stationarity test using ADF and KPSS

    Parameters:
    - values: List of numeric values (time series)
    - regression: 'c' (constant only), 'ct' (constant + trend), 'n' (no constant)

    Returns:
    - Combined ADF and KPSS test results with interpretation
    """
    from statsmodels.tsa.stattools import adfuller, kpss

    data = np.array(values, dtype=float)
    data = data[~np.isnan(data)]

    if len(data) < 20:
        raise ValueError("Stationarity test requires at least 20 observations")

    # ADF Test
    # H0: Unit root exists (non-stationary)
    # H1: No unit root (stationary)
    adf_result = adfuller(data, regression=regression, autolag='AIC')
    adf_statistic = float(adf_result[0])
    adf_pvalue = float(adf_result[1])
    adf_lags = int(adf_result[2])
    adf_nobs = int(adf_result[3])
    adf_critical_values = {
        '1%': float(adf_result[4]['1%']),
        '5%': float(adf_result[4]['5%']),
        '10%': float(adf_result[4]['10%'])
    }

    # KPSS Test
    # H0: Series is stationary
    # H1: Series has a unit root (non-stationary)
    kpss_regression = 'c' if regression in ['c', 'n'] else 'ct'
    kpss_result = kpss(data, regression=kpss_regression, nlags='auto')
    kpss_statistic = float(kpss_result[0])
    kpss_pvalue = float(kpss_result[1])
    kpss_lags = int(kpss_result[2])
    kpss_critical_values = {
        '1%': float(kpss_result[3]['1%']),
        '2.5%': float(kpss_result[3]['2.5%']),
        '5%': float(kpss_result[3]['5%']),
        '10%': float(kpss_result[3]['10%'])
    }

    # Combined interpretation
    adf_stationary = adf_pvalue < 0.05  # Reject H0 -> stationary
    kpss_stationary = kpss_pvalue >= 0.05  # Do not reject H0 -> stationary

    if adf_stationary and kpss_stationary:
        conclusion = 'stationary'
        interpretation = 'Both ADF and KPSS agree: The series is stationary.'
        recommendation = 'No differencing needed. You can proceed with ARMA modeling.'
    elif not adf_stationary and not kpss_stationary:
        conclusion = 'non_stationary'
        interpretation = 'Both ADF and KPSS agree: The series is non-stationary.'
        recommendation = 'Apply differencing (d=1) and re-test. Consider ARIMA model.'
    elif adf_stationary and not kpss_stationary:
        conclusion = 'trend_stationary'
        interpretation = 'ADF suggests stationary, KPSS suggests non-stationary. Possible trend-stationary.'
        recommendation = 'Consider detrending or use regression with time trend.'
    else:  # not adf_stationary and kpss_stationary
        conclusion = 'difference_stationary'
        interpretation = 'ADF suggests non-stationary, KPSS suggests stationary. Possible difference-stationary.'
        recommendation = 'Apply differencing and re-test. Check for structural breaks.'

    # Descriptive statistics
    mean_val = float(np.mean(data))
    std_val = float(np.std(data, ddof=1))

    return {
        'adf': {
            'statistic': adf_statistic,
            'pValue': adf_pvalue,
            'lags': adf_lags,
            'nobs': adf_nobs,
            'criticalValues': adf_critical_values,
            'isStationary': bool(adf_stationary)
        },
        'kpss': {
            'statistic': kpss_statistic,
            'pValue': kpss_pvalue,
            'lags': kpss_lags,
            'criticalValues': kpss_critical_values,
            'isStationary': bool(kpss_stationary)
        },
        'conclusion': conclusion,
        'interpretation': interpretation,
        'recommendation': recommendation,
        'sampleSize': len(data),
        'descriptives': {
            'mean': mean_val,
            'std': std_val
        }
    }


