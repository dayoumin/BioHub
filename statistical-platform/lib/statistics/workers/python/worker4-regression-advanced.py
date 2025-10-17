
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
    X = np.array(X)
    y = np.array(y)
    
    if X.shape[0] < X.shape[1] + 1:
        raise ValueError(f"Insufficient observations: need at least {X.shape[1] + 1}, got {X.shape[0]}")
    
    try:
        coefficients = np.linalg.lstsq(X, y, rcond=None)[0]
        
        y_pred = X @ coefficients
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - np.mean(y)) ** 2)
        r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
        
        return {
            'coefficients': coefficients.tolist(),
            'rSquared': float(r_squared),
            'nObservations': int(X.shape[0]),
            'nPredictors': int(X.shape[1])
        }
    except np.linalg.LinAlgError as e:
        raise ValueError(f"Singular matrix in multiple regression: {e}")


def logistic_regression(X, y):
    return {
        'message': 'Use statsmodels.api.GLM with family=sm.families.Binomial() for logistic regression',
        'warning': 'Placeholder implementation - needs statsmodels'
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
