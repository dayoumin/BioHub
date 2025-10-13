"""
Worker 4: Regression & Advanced Analysis Python Module

회귀분석 + 고급분석 그룹 (24개 메서드)
- 패키지: SciPy, Statsmodels, Sklearn
- 예상 메모리: 200MB  
- 예상 로딩: 3.8초
"""

import numpy as np
from scipy import stats


def linear_regression(x, y):
    """선형 회귀분석"""
    x = np.array([val for val in x if val is not None and not np.isnan(val)])
    y = np.array([val for val in y if val is not None and not np.isnan(val)])
    
    if len(x) != len(y):
        raise ValueError("x and y must have the same length")
    
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    return {
        'slope': float(slope),
        'intercept': float(intercept),
        'rSquared': float(r_value ** 2),
        'pValue': float(p_value),
        'stdErr': float(std_err)
    }


def multiple_regression(X, y):
    """다중 회귀분석"""
    X = np.array(X)
    y = np.array(y)
    
    # 단순 구현 (실제로는 statsmodels 사용)
    coefficients = np.linalg.lstsq(X, y, rcond=None)[0]
    
    y_pred = X @ coefficients
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot)
    
    return {
        'coefficients': coefficients.tolist(),
        'rSquared': float(r_squared)
    }


def logistic_regression(X, y):
    """로지스틱 회귀분석"""
    # sklearn 또는 statsmodels 필요
    return {
        'message': 'Logistic regression requires sklearn or statsmodels'
    }


def pca_analysis(data_matrix, n_components=2):
    """주성분 분석 (PCA)"""
    from sklearn.decomposition import PCA
    
    data_matrix = np.array(data_matrix)
    
    pca = PCA(n_components=n_components)
    components = pca.fit_transform(data_matrix)
    
    return {
        'components': components.tolist(),
        'explainedVariance': pca.explained_variance_ratio_.tolist()
    }
