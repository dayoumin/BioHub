"""
주성분 분석 (PCA) 스크립트
"""
import numpy as np
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

def perform_pca(data_matrix, column_names, n_components, standardize=True):
    """
    PCA 수행 함수

    Args:
        data_matrix: 입력 데이터 행렬
        column_names: 변수명 리스트
        n_components: 주성분 개수
        standardize: 표준화 여부

    Returns:
        dict: PCA 결과
    """
    X = np.array(data_matrix)

    if X.shape[0] < 2 or X.shape[1] < 2:
        return {'error': 'PCA requires at least 2 samples and 2 variables'}

    # 결측값 처리
    df = pd.DataFrame(X, columns=column_names[:X.shape[1]])
    df_clean = df.dropna()

    if len(df_clean) < 2:
        return {'error': 'Too many missing values for PCA'}

    X_clean = df_clean.values
    n_samples, n_features = X_clean.shape

    # 표준화
    if standardize:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_clean)
    else:
        X_scaled = X_clean

    # PCA 수행
    max_components = min(n_samples, n_features)
    actual_n_components = min(n_components, max_components)

    pca = PCA(n_components=actual_n_components)
    X_transformed = pca.fit_transform(X_scaled)

    # 주성분 계수 (로딩)
    loadings = pca.components_.T * np.sqrt(pca.explained_variance_)

    # 누적 설명 분산
    cumulative_variance = np.cumsum(pca.explained_variance_ratio_)

    return {
        'components': pca.components_.tolist(),
        'explainedVariance': pca.explained_variance_.tolist(),
        'explainedVarianceRatio': pca.explained_variance_ratio_.tolist(),
        'cumulativeVarianceRatio': cumulative_variance.tolist(),
        'loadings': loadings.tolist(),
        'scores': X_transformed.tolist(),
        'eigenvalues': pca.explained_variance_.tolist(),
        'nComponents': int(actual_n_components),
        'nSamples': int(n_samples),
        'nFeatures': int(n_features),
        'featureNames': column_names[:n_features],
        'isStandardized': bool(standardize)
    }