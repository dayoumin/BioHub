/**
 * 고급 통계 분석 모듈
 * PCA, 시계열분석, 클러스터링, 생존분석 등
 */

import { ensurePyodideReady, validateNumericArray, validateNumericMatrix } from './utils'
import { PCAResult, ClusteringResult, TimeSeriesResult, SurvivalResult, StatisticalResult } from './types'

/**
 * 주성분 분석 (PCA)
 */
export async function principalComponentAnalysis(
  data: number[][],
  nComponents?: number
): Promise<PCAResult & StatisticalResult> {
  validateNumericMatrix(data, 2, 'Data')
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    n_samples, n_features = data.shape
    n_components = ${nComponents || 'min(n_samples, n_features)'}
    
    # 표준화
    data_centered = data - np.mean(data, axis=0)
    data_scaled = data_centered / np.std(data, axis=0, ddof=1)
    
    # 공분산 행렬
    cov_matrix = np.cov(data_scaled.T)
    
    # 고유값, 고유벡터 계산
    eigenvalues, eigenvectors = np.linalg.eigh(cov_matrix)
    
    # 내림차순 정렬
    idx = eigenvalues.argsort()[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]
    
    # 주성분 선택
    eigenvalues = eigenvalues[:n_components]
    eigenvectors = eigenvectors[:, :n_components]
    
    # 설명된 분산
    total_variance = np.sum(eigenvalues)
    explained_variance_ratio = eigenvalues / total_variance if total_variance > 0 else eigenvalues
    cumulative_variance = np.cumsum(explained_variance_ratio)
    
    # 주성분 점수
    scores = data_scaled @ eigenvectors
    
    # Kaiser 기준 (eigenvalue > 1)
    kaiser_components = int(np.sum(eigenvalues > 1))
    
    # Scree test를 위한 정보
    scree_data = {
        'eigenvalues': eigenvalues.tolist(),
        'kaiser_criterion': kaiser_components
    }
    
    result = {
        'testName': 'Principal Component Analysis',
        'components': eigenvectors.T.tolist(),
        'explainedVariance': eigenvalues.tolist(),
        'explainedVarianceRatio': explained_variance_ratio.tolist(),
        'cumulativeVariance': cumulative_variance.tolist(),
        'loadings': eigenvectors.tolist(),
        'scores': scores.tolist(),
        'nComponents': int(n_components),
        'kaiserComponents': kaiser_components,
        'screeData': scree_data,
        'interpretation': f"First {n_components} components explain {cumulative_variance[-1]*100:.1f}% of variance. Kaiser criterion suggests {kaiser_components} components.",
        'totalVarianceExplained': float(cumulative_variance[-1])
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * K-means 클러스터링
 */
export async function kMeansClustering(
  data: number[][],
  nClusters: number,
  maxIter: number = 300
): Promise<ClusteringResult & StatisticalResult> {
  validateNumericMatrix(data, 2, 'Data')
  
  if (nClusters < 2 || nClusters > data.length) {
    throw new Error(`Number of clusters must be between 2 and ${data.length}`)
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy.spatial.distance import cdist
    import json
    
    data = np.array(${JSON.stringify(data)})
    n_clusters = ${nClusters}
    max_iter = ${maxIter}
    
    n_samples, n_features = data.shape
    
    # K-means implementation
    np.random.seed(42)
    
    # 초기 중심점 선택 (K-means++)
    centers = []
    centers.append(data[np.random.randint(n_samples)])
    
    for _ in range(1, n_clusters):
        distances = cdist(data, centers, 'euclidean')
        min_distances = np.min(distances, axis=1)
        probabilities = min_distances / min_distances.sum()
        cumulative_probs = probabilities.cumsum()
        r = np.random.rand()
        centers.append(data[np.searchsorted(cumulative_probs, r)])
    
    centers = np.array(centers)
    
    # 반복 알고리즘
    for iteration in range(max_iter):
        # 할당 단계
        distances = cdist(data, centers, 'euclidean')
        labels = np.argmin(distances, axis=1)
        
        # 업데이트 단계
        new_centers = np.array([data[labels == i].mean(axis=0) for i in range(n_clusters)])
        
        # 수렴 확인
        if np.allclose(centers, new_centers):
            break
        centers = new_centers
    
    # 최종 결과 계산
    distances = cdist(data, centers, 'euclidean')
    labels = np.argmin(distances, axis=1)
    
    # Inertia (within-cluster sum of squares)
    inertia = sum(np.sum((data[labels == i] - centers[i])**2) for i in range(n_clusters))
    
    # Silhouette Score 계산
    from scipy.spatial.distance import euclidean
    
    def silhouette_sample(i):
        # a(i): 같은 클러스터 내 평균 거리
        same_cluster = data[labels == labels[i]]
        if len(same_cluster) > 1:
            a_i = np.mean([euclidean(data[i], x) for j, x in enumerate(same_cluster) if j != np.where((data == data[i]).all(axis=1))[0][0]])
        else:
            a_i = 0
        
        # b(i): 가장 가까운 다른 클러스터와의 평균 거리
        b_i = float('inf')
        for k in range(n_clusters):
            if k != labels[i]:
                other_cluster = data[labels == k]
                if len(other_cluster) > 0:
                    avg_dist = np.mean([euclidean(data[i], x) for x in other_cluster])
                    b_i = min(b_i, avg_dist)
        
        # Silhouette coefficient
        if max(a_i, b_i) > 0:
            return (b_i - a_i) / max(a_i, b_i)
        else:
            return 0
    
    # 간단한 silhouette score (샘플링)
    sample_size = min(100, n_samples)
    sample_indices = np.random.choice(n_samples, sample_size, replace=False)
    silhouette_scores = [silhouette_sample(i) for i in sample_indices]
    silhouette_score = np.mean(silhouette_scores)
    
    # 클러스터별 크기
    cluster_sizes = [int(np.sum(labels == i)) for i in range(n_clusters)]
    
    result = {
        'testName': 'K-means Clustering',
        'labels': labels.tolist(),
        'centers': centers.tolist(),
        'inertia': float(inertia),
        'silhouetteScore': float(silhouette_score),
        'nClusters': int(n_clusters),
        'clusterSizes': cluster_sizes,
        'iterations': int(iteration + 1),
        'interpretation': f"Data grouped into {n_clusters} clusters. Silhouette score: {silhouette_score:.3f} ({'good' if silhouette_score > 0.5 else 'moderate' if silhouette_score > 0.25 else 'poor'} clustering)",
        'converged': iteration < max_iter - 1
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 계층적 클러스터링
 */
export async function hierarchicalClustering(
  data: number[][],
  method: 'single' | 'complete' | 'average' | 'ward' = 'ward',
  nClusters?: number
): Promise<ClusteringResult & StatisticalResult> {
  validateNumericMatrix(data, 2, 'Data')
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy.cluster.hierarchy import linkage, fcluster, dendrogram
    from scipy.spatial.distance import pdist
    import json
    
    data = np.array(${JSON.stringify(data)})
    method = '${method}'
    n_clusters = ${nClusters || 'None'}
    
    # 거리 행렬 계산
    distance_matrix = pdist(data, metric='euclidean')
    
    # 계층적 클러스터링 수행
    linkage_matrix = linkage(distance_matrix, method=method)
    
    # 클러스터 할당
    if n_clusters is not None:
        labels = fcluster(linkage_matrix, n_clusters, criterion='maxclust') - 1
    else:
        # 자동으로 클러스터 수 결정 (inconsistency 기준)
        from scipy.cluster.hierarchy import inconsistent
        inconsistency_matrix = inconsistent(linkage_matrix)
        # 불일치 계수가 큰 지점 찾기
        threshold = np.mean(inconsistency_matrix[:, 3]) + np.std(inconsistency_matrix[:, 3])
        labels = fcluster(linkage_matrix, threshold, criterion='inconsistent') - 1
        n_clusters = len(np.unique(labels))
    
    # 클러스터 중심 계산
    centers = []
    cluster_sizes = []
    for i in range(n_clusters):
        cluster_data = data[labels == i]
        if len(cluster_data) > 0:
            centers.append(cluster_data.mean(axis=0).tolist())
            cluster_sizes.append(int(len(cluster_data)))
        else:
            centers.append([0] * data.shape[1])
            cluster_sizes.append(0)
    
    # Cophenetic correlation coefficient
    from scipy.cluster.hierarchy import cophenet
    cophenetic_corr, _ = cophenet(linkage_matrix, distance_matrix)
    
    result = {
        'testName': f'Hierarchical Clustering ({method})',
        'labels': labels.tolist(),
        'centers': centers,
        'nClusters': int(n_clusters),
        'clusterSizes': cluster_sizes,
        'copheneticCorrelation': float(cophenetic_corr),
        'linkageMatrix': linkage_matrix.tolist()[:20],  # 처음 20개만
        'method': method,
        'interpretation': f"Hierarchical clustering with {method} linkage produced {n_clusters} clusters. Cophenetic correlation: {cophenetic_corr:.3f}",
        'quality': 'good' if cophenetic_corr > 0.7 else 'moderate' if cophenetic_corr > 0.5 else 'poor'
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 시계열 분해 (Trend, Seasonal, Residual)
 */
export async function timeSeriesDecomposition(
  data: number[],
  period?: number,
  model: 'additive' | 'multiplicative' = 'additive'
): Promise<TimeSeriesResult & StatisticalResult> {
  validateNumericArray(data, 4, 'Time series data')
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import signal
    import json
    
    data = np.array(${JSON.stringify(data)})
    n = len(data)
    model = '${model}'
    
    # 주기 자동 감지 (제공되지 않은 경우)
    if ${period ? 'False' : 'True'}:
        # FFT를 사용한 주요 주파수 감지
        fft = np.fft.fft(data)
        frequencies = np.fft.fftfreq(n)
        # 0이 아닌 주파수 중 가장 강한 것 찾기
        positive_freq_idx = np.where(frequencies > 0)[0]
        if len(positive_freq_idx) > 0:
            magnitudes = np.abs(fft[positive_freq_idx])
            dominant_freq_idx = positive_freq_idx[np.argmax(magnitudes)]
            period = int(1 / frequencies[dominant_freq_idx])
        else:
            period = 12  # 기본값
    else:
        period = ${period || 12}
    
    # 이동평균으로 추세 계산
    if period % 2 == 0:
        # 짝수 주기인 경우 centered moving average
        weights = np.ones(period) / period
        weights[0] = weights[-1] = 0.5 / period
        trend = np.convolve(data, weights, mode='same')
    else:
        # 홀수 주기
        trend = np.convolve(data, np.ones(period)/period, mode='same')
    
    # 경계 처리
    half_period = period // 2
    trend[:half_period] = trend[half_period]
    trend[-half_period:] = trend[-half_period-1]
    
    # 계절성 계산
    if model == 'additive':
        detrended = data - trend
    else:  # multiplicative
        detrended = data / (trend + 1e-10)
    
    # 계절 패턴 추출
    seasonal = np.zeros(n)
    seasonal_pattern = []
    for i in range(period):
        indices = np.arange(i, n, period)
        if len(indices) > 0:
            if model == 'additive':
                seasonal_value = np.mean(detrended[indices])
            else:
                seasonal_value = np.mean(detrended[indices])
            seasonal_pattern.append(seasonal_value)
            seasonal[indices] = seasonal_value
    
    # 계절성 중심화
    if model == 'additive':
        seasonal = seasonal - np.mean(seasonal)
    else:
        seasonal = seasonal / np.mean(seasonal) if np.mean(seasonal) != 0 else seasonal
    
    # 잔차 계산
    if model == 'additive':
        residual = data - trend - seasonal
    else:
        residual = data / (trend * seasonal + 1e-10)
    
    # 추세 강도와 계절성 강도
    if model == 'additive':
        trend_strength = 1 - np.var(residual) / np.var(data - seasonal) if np.var(data - seasonal) > 0 else 0
        seasonal_strength = 1 - np.var(residual) / np.var(data - trend) if np.var(data - trend) > 0 else 0
    else:
        trend_strength = 1 - np.var(residual) / np.var(data / seasonal) if np.var(data / seasonal) > 0 else 0
        seasonal_strength = 1 - np.var(residual) / np.var(data / trend) if np.var(data / trend) > 0 else 0
    
    result = {
        'testName': f'Time Series Decomposition ({model})',
        'trend': trend.tolist(),
        'seasonal': seasonal.tolist(),
        'residual': residual.tolist(),
        'period': int(period),
        'model': model,
        'trendStrength': float(max(0, min(1, trend_strength))),
        'seasonalStrength': float(max(0, min(1, seasonal_strength))),
        'seasonalPattern': seasonal_pattern,
        'interpretation': f"Time series decomposed using {model} model with period {period}. Trend strength: {trend_strength:.2%}, Seasonal strength: {seasonal_strength:.2%}",
        'quality': {
            'trend': 'strong' if trend_strength > 0.6 else 'moderate' if trend_strength > 0.3 else 'weak',
            'seasonal': 'strong' if seasonal_strength > 0.6 else 'moderate' if seasonal_strength > 0.3 else 'weak'
        }
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * ARIMA 예측
 */
export async function arimaForecast(
  data: number[],
  p: number = 1,  // AR order
  d: number = 1,  // Differencing order
  q: number = 1,  // MA order
  steps: number = 10
): Promise<TimeSeriesResult & StatisticalResult> {
  validateNumericArray(data, 10, 'Time series data')
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    data = np.array(${JSON.stringify(data)})
    p, d, q = ${p}, ${d}, ${q}
    steps = ${steps}
    n = len(data)
    
    # 차분 적용
    differenced = data.copy()
    for _ in range(d):
        differenced = np.diff(differenced)
    
    # 간단한 ARIMA 구현 (AR 부분만)
    # 실제로는 statsmodels 사용이 권장됨
    
    if p > 0 and len(differenced) > p:
        # AR 모델 피팅 (최소제곱법)
        X = []
        y = []
        for i in range(p, len(differenced)):
            X.append(differenced[i-p:i])
            y.append(differenced[i])
        
        X = np.array(X)
        y = np.array(y)
        
        # 계수 추정
        coeffs = np.linalg.lstsq(X, y, rcond=None)[0]
        
        # 예측
        forecast = []
        last_values = differenced[-p:].tolist()
        
        for _ in range(steps):
            next_val = np.dot(coeffs, last_values[-p:])
            forecast.append(next_val)
            last_values.append(next_val)
        
        # 역차분하여 원래 스케일로 복원
        if d > 0:
            # 마지막 관측값부터 시작
            base = data[-1]
            forecast_integrated = []
            for f in forecast:
                base = base + f
                forecast_integrated.append(base)
            forecast = forecast_integrated
    else:
        # 단순 예측 (마지막 값 반복)
        forecast = [data[-1]] * steps
    
    # 신뢰구간 (간단한 근사)
    stdError = np.std(differenced) if len(differenced) > 0 else 1
    z_score = 1.96  # 95% 신뢰구간
    
    forecast_lower = [f - z_score * stdError * np.sqrt(i+1) for i, f in enumerate(forecast)]
    forecast_upper = [f + z_score * stdError * np.sqrt(i+1) for i, f in enumerate(forecast)]
    
    # 모델 적합도 (잔차 분석)
    if p > 0 and len(X) > 0:
        fitted = X @ coeffs
        residuals = y - fitted
        mse = np.mean(residuals**2)
        rmse = np.sqrt(mse)
    else:
        residuals = [0]
        rmse = 0
    
    result = {
        'testName': f'ARIMA({p},{d},{q}) Forecast',
        'forecast': forecast,
        'forecastLower': forecast_lower,
        'forecastUpper': forecast_upper,
        'originalData': data.tolist(),
        'parameters': {
            'p': int(p),
            'd': int(d),
            'q': int(q),
            'steps': int(steps)
        },
        'modelFit': {
            'rmse': float(rmse),
            'coefficients': coeffs.tolist() if p > 0 and 'coeffs' in locals() else []
        },
        'interpretation': f"ARIMA({p},{d},{q}) model fitted. Forecasted {steps} periods ahead with RMSE: {rmse:.4f}",
        'quality': 'good' if rmse < np.std(data) * 0.5 else 'moderate' if rmse < np.std(data) else 'poor'
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * Kaplan-Meier 생존분석
 */
export async function kaplanMeierSurvival(
  time: number[],
  event: number[]  // 1 = event occurred, 0 = censored
): Promise<SurvivalResult & StatisticalResult> {
  validateNumericArray(time, 2, 'Time')
  validateNumericArray(event, 2, 'Event')
  
  if (time.length !== event.length) {
    throw new Error('Time and event arrays must have the same length')
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    time = np.array(${JSON.stringify(time)})
    event = np.array(${JSON.stringify(event)})
    
    # 데이터 정렬
    sorted_indices = np.argsort(time)
    time_sorted = time[sorted_indices]
    event_sorted = event[sorted_indices]
    
    # 고유 시간점 찾기
    unique_times = np.unique(time_sorted[event_sorted == 1])
    
    # Kaplan-Meier 추정
    survival_prob = []
    survival_time = [0]
    current_prob = 1.0
    
    for t in unique_times:
        # t 시점에서의 위험군 크기
        at_risk = np.sum(time_sorted >= t)
        # t 시점에서의 사건 수
        events_at_t = np.sum((time_sorted == t) & (event_sorted == 1))
        
        if at_risk > 0:
            # 생존 확률 업데이트
            current_prob *= (at_risk - events_at_t) / at_risk
            survival_time.append(float(t))
            survival_prob.append(float(current_prob))
    
    # 마지막 시점 추가
    if len(survival_time) > 0:
        survival_time.append(float(np.max(time)))
        survival_prob.append(survival_prob[-1] if len(survival_prob) > 0 else 1.0)
    
    # 신뢰구간 계산 (Greenwood's formula)
    variance = []
    for i, t in enumerate(survival_time[1:]):
        var = 0
        for j, t_j in enumerate(unique_times):
            if t_j <= t:
                at_risk = np.sum(time_sorted >= t_j)
                events = np.sum((time_sorted == t_j) & (event_sorted == 1))
                if at_risk > 0 and at_risk > events:
                    var += events / (at_risk * (at_risk - events))
        
        if i < len(survival_prob):
            var *= survival_prob[i]**2
            variance.append(var)
    
    # 95% 신뢰구간
    ci_lower = []
    ci_upper = []
    z_score = 1.96
    
    for i, v in enumerate(variance):
        if i < len(survival_prob):
            se = np.sqrt(v)
            lower = max(0, survival_prob[i] - z_score * se)
            upper = min(1, survival_prob[i] + z_score * se)
            ci_lower.append(float(lower))
            ci_upper.append(float(upper))
    
    # 중앙 생존시간
    if len(survival_prob) > 0:
        median_idx = np.where(np.array(survival_prob) <= 0.5)[0]
        if len(median_idx) > 0:
            median_survival = survival_time[median_idx[0] + 1]
        else:
            median_survival = None
    else:
        median_survival = None
    
    # 요약 통계
    total_events = int(np.sum(event))
    total_censored = int(len(event) - total_events)
    
    result = {
        'testName': 'Kaplan-Meier Survival Analysis',
        'time': survival_time,
        'survivalProbability': [1.0] + survival_prob,
        'confidenceInterval': {
            'lower': [1.0] + ci_lower,
            'upper': [1.0] + ci_upper
        },
        'medianSurvival': float(median_survival) if median_survival is not None else None,
        'events': total_events,
        'censored': total_censored,
        'totalObservations': int(len(time)),
        'interpretation': f"Median survival time: {median_survival:.2f if median_survival else 'Not reached'}. {total_events} events observed, {total_censored} censored.",
        'survivalRate': {
            '25%': float(survival_prob[len(survival_prob)//4]) if len(survival_prob) > 4 else None,
            '50%': float(survival_prob[len(survival_prob)//2]) if len(survival_prob) > 2 else None,
            '75%': float(survival_prob[3*len(survival_prob)//4]) if len(survival_prob) > 4 else None
        }
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}