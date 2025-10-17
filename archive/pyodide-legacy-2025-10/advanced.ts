/**
 * 고급 분석 서비스 모듈 (PCA, 클러스터링, 시계열)
 */

import { BasePyodideService } from './base'
import type {
  IAdvancedService,
  PCAResult,
  ClusteringResult,
  TimeSeriesResult,
  SurvivalResult,
  MixedEffectsResult,
  SARIMAResult,
  VARResult,
  CoxRegressionResult
} from './types'

export class AdvancedService extends BasePyodideService implements IAdvancedService {
  private static instance: AdvancedService | null = null

  private constructor() {
    super()
  }

  static getInstance(): AdvancedService {
    if (!AdvancedService.instance) {
      AdvancedService.instance = new AdvancedService()
    }
    return AdvancedService.instance
  }

  /**
   * 주성분 분석 (PCA)
   */
  async pca(
    dataMatrix: number[][],
    columns?: string[],
    nComponents?: number,
    standardize: boolean = true
  ): Promise<PCAResult> {
    await this.initialize()
    this.setData('data_matrix', dataMatrix)
    this.setData('column_names', columns || dataMatrix[0]?.map((_, i) => `Var${i + 1}`) || [])
    this.setData('n_components', nComponents || Math.min(dataMatrix.length, dataMatrix[0]?.length || 0))
    this.setData('standardize', standardize)

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from sklearn.decomposition import PCA
      from sklearn.preprocessing import StandardScaler

      # 데이터 준비
      X = np.array(data_matrix)

      if X.shape[0] < 2 or X.shape[1] < 2:
        py_result = {'error': 'PCA requires at least 2 samples and 2 variables'}
      else:
        # 결측값 처리
        df = pd.DataFrame(X, columns=column_names[:X.shape[1]])
        df_clean = df.dropna()

        if len(df_clean) < 2:
          py_result = {'error': 'Too many missing values for PCA'}
        else:
          X_clean = df_clean.values
          n_samples, n_features = X_clean.shape

          # 표준화 (선택적)
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

          py_result = {
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

          # Kaiser 기준 (고유값 > 1) 적용 정보
          kaiser_components = np.sum(pca.explained_variance_ > 1)
          py_result['kaiserComponents'] = int(kaiser_components)

          # 첫 번째 주성분들의 해석을 위한 로딩 정보
          if actual_n_components >= 2:
            pc1_loadings = loadings[:, 0]
            pc2_loadings = loadings[:, 1]
            py_result['pc1Interpretation'] = {
              'strongestPositive': column_names[np.argmax(pc1_loadings)] if len(column_names) > np.argmax(pc1_loadings) else f'Var{np.argmax(pc1_loadings)+1}',
              'strongestNegative': column_names[np.argmin(pc1_loadings)] if len(column_names) > np.argmin(pc1_loadings) else f'Var{np.argmin(pc1_loadings)+1}',
              'maxLoading': float(np.max(np.abs(pc1_loadings)))
            }
            py_result['pc2Interpretation'] = {
              'strongestPositive': column_names[np.argmax(pc2_loadings)] if len(column_names) > np.argmax(pc2_loadings) else f'Var{np.argmax(pc2_loadings)+1}',
              'strongestNegative': column_names[np.argmin(pc2_loadings)] if len(column_names) > np.argmin(pc2_loadings) else f'Var{np.argmin(pc2_loadings)+1}',
              'maxLoading': float(np.max(np.abs(pc2_loadings)))
            }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as PCAResult
  }

  /**
   * K-means 클러스터링
   */
  async clustering(data: number[][], nClusters: number, method: string = 'kmeans'): Promise<ClusteringResult> {
    await this.initialize()
    this.setData('data_matrix', data)
    this.setData('n_clusters', nClusters)
    this.setData('method', method.toLowerCase())

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from sklearn.cluster import KMeans, AgglomerativeClustering, DBSCAN
      from sklearn.preprocessing import StandardScaler
      from sklearn.metrics import silhouette_score, calinski_harabasz_score, davies_bouldin_score

      # 데이터 준비
      X = np.array(data_matrix)

      if X.shape[0] < n_clusters:
        py_result = {'error': f'Number of samples ({X.shape[0]}) must be >= number of clusters ({n_clusters})'}
      elif n_clusters < 2:
        py_result = {'error': 'Number of clusters must be at least 2'}
      else:
        # 결측값 처리
        df = pd.DataFrame(X)
        df_clean = df.dropna()

        if len(df_clean) < n_clusters:
          py_result = {'error': 'Too many missing values for clustering'}
        else:
          X_clean = df_clean.values

          # 데이터 표준화
          scaler = StandardScaler()
          X_scaled = scaler.fit_transform(X_clean)

          # 클러스터링 수행
          if method == 'kmeans':
            clusterer = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            labels = clusterer.fit_predict(X_scaled)
            centers_scaled = clusterer.cluster_centers_
            # 원본 스케일로 변환
            centers = scaler.inverse_transform(centers_scaled)
            inertia = clusterer.inertia_

          elif method == 'hierarchical':
            clusterer = AgglomerativeClustering(n_clusters=n_clusters)
            labels = clusterer.fit_predict(X_scaled)
            # 계층적 클러스터링은 중심점이 없으므로 각 클러스터의 평균으로 계산
            centers = []
            for i in range(n_clusters):
              cluster_points = X_clean[labels == i]
              if len(cluster_points) > 0:
                centers.append(np.mean(cluster_points, axis=0).tolist())
              else:
                centers.append([0] * X_clean.shape[1])
            inertia = 0  # 계층적 클러스터링에서는 해당 없음

          elif method == 'dbscan':
            # DBSCAN은 클러스터 수를 지정하지 않으므로 eps 값을 조정해야 함
            clusterer = DBSCAN(eps=0.5, min_samples=5)
            labels = clusterer.fit_predict(X_scaled)
            unique_labels = np.unique(labels)
            n_clusters_found = len(unique_labels) - (1 if -1 in unique_labels else 0)

            centers = []
            for label in unique_labels:
              if label != -1:  # 노이즈 포인트 제외
                cluster_points = X_clean[labels == label]
                centers.append(np.mean(cluster_points, axis=0).tolist())

            inertia = 0  # DBSCAN에서는 해당 없음
            n_clusters = n_clusters_found

          else:
            py_result = {'error': f'Unknown clustering method: {method}'}

          if 'py_result' not in locals() or 'error' not in py_result:
            # 클러스터링 품질 지표 계산
            if len(np.unique(labels)) > 1:
              silhouette_avg = silhouette_score(X_scaled, labels)
              calinski_harabasz = calinski_harabasz_score(X_scaled, labels)
              davies_bouldin = davies_bouldin_score(X_scaled, labels)
            else:
              silhouette_avg = 0
              calinski_harabasz = 0
              davies_bouldin = float('inf')

            # 클러스터별 통계
            cluster_stats = []
            for i in range(n_clusters):
              cluster_mask = labels == i
              cluster_size = np.sum(cluster_mask)
              if cluster_size > 0:
                cluster_data = X_clean[cluster_mask]
                cluster_stats.append({
                  'clusterId': int(i),
                  'size': int(cluster_size),
                  'percentage': float(cluster_size / len(X_clean) * 100),
                  'center': centers[i] if i < len(centers) else [0] * X_clean.shape[1]
                })

            py_result = {
              'labels': labels.tolist(),
              'centers': centers,
              'inertia': float(inertia),
              'silhouetteScore': float(silhouette_avg),
              'calinskiHarabaszScore': float(calinski_harabasz),
              'daviesBouldinScore': float(davies_bouldin),
              'nClusters': int(n_clusters),
              'nSamples': int(len(X_clean)),
              'nFeatures': int(X_clean.shape[1]),
              'method': method,
              'clusterStats': cluster_stats
            }

            # 노이즈 포인트 정보 (DBSCAN의 경우)
            if method == 'dbscan':
              n_noise = np.sum(labels == -1)
              py_result['nNoise'] = int(n_noise)
              py_result['noiseRatio'] = float(n_noise / len(X_clean))

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as ClusteringResult
  }

  /**
   * 시계열 분해 (계절성, 추세, 잔차)
   */
  async timeSeriesDecomposition(data: number[], period?: number): Promise<TimeSeriesResult> {
    await this.initialize()
    this.setData('time_series', data)
    this.setData('period', period || this.detectPeriod(data))

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      ts_data = np.array([x for x in time_series if x is not None and not np.isnan(x)])

      if len(ts_data) < period * 2:
        py_result = {'error': f'Time series too short for decomposition with period {period}'}
      else:
        try:
          # statsmodels를 사용한 시계열 분해
          import statsmodels.api as sm
          from statsmodels.tsa.seasonal import seasonal_decompose

          # 분해 수행 (additive model)
          decomposition = seasonal_decompose(ts_data, model='additive', period=period)

          py_result = {
            'trend': decomposition.trend.tolist(),
            'seasonal': decomposition.seasonal.tolist(),
            'residual': decomposition.resid.tolist(),
            'observed': ts_data.tolist(),
            'period': int(period),
            'method': 'Additive decomposition',
            'length': int(len(ts_data))
          }

          # 계절성 강도 계산
          seasonal_strength = np.var(decomposition.seasonal, ddof=1) / np.var(ts_data, ddof=1)
          trend_strength = np.var(decomposition.trend[~np.isnan(decomposition.trend)], ddof=1) / np.var(ts_data, ddof=1)

          py_result['seasonalStrength'] = float(seasonal_strength)
          py_result['trendStrength'] = float(trend_strength)

        except ImportError:
          # statsmodels가 없는 경우 간단한 이동평균 분해
          # 추세: 이동평균
          window = period
          trend = np.convolve(ts_data, np.ones(window)/window, mode='same')

          # 계절성: 주기별 평균에서 추세 제거
          detrended = ts_data - trend
          seasonal_pattern = np.zeros(period)
          for i in range(period):
            seasonal_pattern[i] = np.mean(detrended[i::period])

          # 전체 시계열에 계절성 패턴 적용
          seasonal = np.tile(seasonal_pattern, len(ts_data) // period + 1)[:len(ts_data)]

          # 잔차
          residual = ts_data - trend - seasonal

          py_result = {
            'trend': trend.tolist(),
            'seasonal': seasonal.tolist(),
            'residual': residual.tolist(),
            'observed': ts_data.tolist(),
            'period': int(period),
            'method': 'Simple moving average decomposition',
            'length': int(len(ts_data)),
            'note': 'Limited decomposition without statsmodels'
          }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as TimeSeriesResult
  }

  /**
   * 시계열 주기 자동 감지 (간단한 자기상관 기반)
   */
  private detectPeriod(data: number[]): number {
    // 간단한 주기 감지 로직
    const cleanData = data.filter(x => x !== null && !isNaN(x))

    if (cleanData.length < 10) return 4  // 기본값

    // 일반적인 주기들을 테스트 (4, 7, 12, 24 등)
    const commonPeriods = [4, 7, 12, 24, 52]
    let bestPeriod = 4

    for (const period of commonPeriods) {
      if (cleanData.length >= period * 2) {
        bestPeriod = period
        break
      }
    }

    return bestPeriod
  }

  /**
   * Cronbach's Alpha 신뢰도 분석
   */
  async cronbachAlpha(items: number[][]): Promise<{
    alpha: number
    itemTotalCorrelations: number[]
    alphaIfDeleted: number[]
    nItems: number
    nObservations: number
  }> {
    await this.initialize()
    this.setData('items_data', items)

    const py_result = await this.runPythonSafely(`
      # 데이터 행렬로 변환 (observations x items)
      X = np.array(items_data)

      if X.shape[1] < 2:
        py_result = {'error': 'Need at least 2 items for reliability analysis'}
      elif X.shape[0] < 2:
        py_result = {'error': 'Need at least 2 observations for reliability analysis'}
      else:
        # 결측값이 있는 행 제거
        valid_rows = ~np.isnan(X).any(axis=1)
        X_clean = X[valid_rows]

        if X_clean.shape[0] < 2:
          py_result = {'error': 'Too many missing values for reliability analysis'}
        else:
          n_obs, n_items = X_clean.shape

          # 각 항목의 분산
          item_variances = np.var(X_clean, axis=0, ddof=1)

          # 총점의 분산
          total_scores = np.sum(X_clean, axis=1)
          total_variance = np.var(total_scores, ddof=1)

          # Cronbach's alpha 계산
          alpha = (n_items / (n_items - 1)) * (1 - np.sum(item_variances) / total_variance)

          # 항목-전체 상관 (corrected item-total correlation)
          item_total_corr = []
          alpha_if_deleted = []

          for i in range(n_items):
            # 해당 항목을 제외한 총점
            other_items_scores = np.sum(X_clean[:, [j for j in range(n_items) if j != i]], axis=1)

            # 항목과 나머지 총점 간의 상관
            corr = np.corrcoef(X_clean[:, i], other_items_scores)[0, 1]
            item_total_corr.append(float(corr))

            # 해당 항목을 제거했을 때의 alpha
            if n_items > 2:
              other_items = X_clean[:, [j for j in range(n_items) if j != i]]
              other_variances = np.var(other_items, axis=0, ddof=1)
              other_total_var = np.var(np.sum(other_items, axis=1), ddof=1)
              alpha_without_item = ((n_items - 1) / (n_items - 2)) * (1 - np.sum(other_variances) / other_total_var)
            else:
              alpha_without_item = 0

            alpha_if_deleted.append(float(alpha_without_item))

          py_result = {
            'alpha': float(alpha),
            'itemTotalCorrelations': item_total_corr,
            'alphaIfDeleted': alpha_if_deleted,
            'nItems': int(n_items),
            'nObservations': int(n_obs),
            'interpretation': {
              'excellent': bool(alpha >= 0.9),
              'good': bool(0.8 <= alpha < 0.9),
              'acceptable': bool(0.7 <= alpha < 0.8),
              'questionable': bool(0.6 <= alpha < 0.7),
              'poor': bool(alpha < 0.6)
            }
          }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result
  }

  /**
   * ARIMA 예측
   */
  async arimaForecast(
    data: number[],
    p: number,
    d: number,
    q: number,
    steps: number
  ): Promise<TimeSeriesResult> {
    await this.initialize()
    this.setData('ts_data', data)
    this.setData('p', p)
    this.setData('d', d)
    this.setData('q', q)
    this.setData('steps', steps)

    const py_result = await this.runPythonSafely(`
      from statsmodels.tsa.arima.model import ARIMA
      import warnings
      warnings.filterwarnings('ignore')

      ts_data = np.array(ts_data)

      try:
        # ARIMA 모델 fitting
        model = ARIMA(ts_data, order=(p, d, q))
        fitted_model = model.fit()

        # 예측
        forecast = fitted_model.forecast(steps=steps)

        # 신뢰구간 (95%)
        forecast_df = fitted_model.get_forecast(steps=steps)
        conf_int = forecast_df.conf_int(alpha=0.05)

        # 잔차 및 적합값
        residuals = fitted_model.resid
        fitted_values = fitted_model.fittedvalues

        # 평가 지표
        mae = np.mean(np.abs(residuals))
        rmse = np.sqrt(np.mean(residuals**2))

        py_result = {
          'forecast': forecast.tolist(),
          'lower_bound': conf_int.iloc[:, 0].tolist(),
          'upper_bound': conf_int.iloc[:, 1].tolist(),
          'residuals': residuals.tolist(),
          'aic': float(fitted_model.aic),
          'bic': float(fitted_model.bic),
          'model_params': {
            'p': int(p),
            'd': int(d),
            'q': int(q),
            'seasonal_order': [0, 0, 0, 0]
          },
          'fitted_values': fitted_values.tolist(),
          'mae': float(mae),
          'rmse': float(rmse),
          'confidence_level': 0.95,
          'trend': [],
          'seasonal': [],
          'residual': residuals.tolist(),
          'period': 0
        }
      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as TimeSeriesResult
  }

  /**
   * Kaplan-Meier 생존분석
   */
  async kaplanMeierSurvival(
    times: number[],
    events: number[]
  ): Promise<SurvivalResult> {
    await this.initialize()
    this.setData('times', times)
    this.setData('events', events)

    const py_result = await this.runPythonSafely(`
      from lifelines import KaplanMeierFitter

      times = np.array(times)
      events = np.array(events).astype(bool)

      try:
        # Kaplan-Meier fitting
        kmf = KaplanMeierFitter()
        kmf.fit(times, events)

        # 생존함수 추출
        survival_func = kmf.survival_function_

        # 신뢰구간
        conf_int = kmf.confidence_interval_survival_function_

        # 중앙 생존시간
        median_survival = kmf.median_survival_time_

        # 사건 수와 중도절단 수
        events_count = int(events.sum())
        censored_count = int((1 - events).sum())

        # Risk table 생성
        risk_table = []
        unique_times = np.unique(times)
        for t in unique_times:
          at_risk = int(np.sum(times >= t))
          events_at_t = int(np.sum((times == t) & (events == 1)))
          censored_at_t = int(np.sum((times == t) & (events == 0)))
          risk_table.append({
            'time': float(t),
            'at_risk': at_risk,
            'events': events_at_t,
            'censored': censored_at_t
          })

        py_result = {
          'survival_function': {
            'time': survival_func.index.tolist(),
            'survival_probability': survival_func.values.flatten().tolist(),
            'confidence_interval_lower': conf_int.iloc[:, 0].tolist(),
            'confidence_interval_upper': conf_int.iloc[:, 1].tolist()
          },
          'median_survival_time': float(median_survival) if not np.isnan(median_survival) else None,
          'events_count': events_count,
          'censored_count': censored_count,
          'risk_table': risk_table
        }
      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as SurvivalResult
  }

  /**
   * Mixed Effects Models (선형 혼합 모델)
   */
  async mixedEffectsModel(
    data: any[],
    formula: string,
    groups: string
  ): Promise<MixedEffectsResult> {
    await this.initialize()
    this.setData('model_data', data)
    this.setData('formula', formula)
    this.setData('groups', groups)

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      import statsmodels.formula.api as smf
      from statsmodels.regression.mixed_linear_model import MixedLM

      # 데이터프레임 생성
      df = pd.DataFrame(model_data)

      try:
        # Mixed Effects Model fitting
        model = smf.mixedlm(formula, df, groups=df[groups])
        result = model.fit()

        # Fixed effects 추출
        fixed_effects = {}
        for param in result.params.index:
          fixed_effects[param] = {
            'coefficient': float(result.params[param]),
            'std_error': float(result.bse[param]),
            'z_value': float(result.tvalues[param]),
            'p_value': float(result.pvalues[param]),
            'ci_lower': float(result.conf_int().loc[param, 0]),
            'ci_upper': float(result.conf_int().loc[param, 1])
          }

        # Random effects variance
        random_effects = {}
        re_cov = result.cov_re
        if hasattr(re_cov, 'shape'):
          if re_cov.shape[0] > 0:
            random_effects['group'] = {
              'variance': float(re_cov[0, 0]),
              'std_dev': float(np.sqrt(re_cov[0, 0]))
            }

        random_effects['residual'] = {
          'variance': float(result.scale),
          'std_dev': float(np.sqrt(result.scale))
        }

        # ICC calculation (for random intercept models)
        var_between = re_cov[0, 0] if hasattr(re_cov, 'shape') and re_cov.shape[0] > 0 else 0
        var_within = result.scale
        icc = float(var_between / (var_between + var_within)) if (var_between + var_within) > 0 else 0

        py_result = {
          'fixed_effects': fixed_effects,
          'random_effects': random_effects,
          'model_fit': {
            'log_likelihood': float(result.llf),
            'aic': float(result.aic),
            'bic': float(result.bic),
            'converged': bool(result.converged)
          },
          'icc': icc
        }

      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as MixedEffectsResult
  }

  /**
   * SARIMA (계절성 ARIMA)
   */
  async sarimaForecast(
    data: number[],
    order: [number, number, number],
    seasonal_order: [number, number, number, number],
    steps: number
  ): Promise<SARIMAResult> {
    await this.initialize()
    this.setData('ts_data', data)
    this.setData('p', order[0])
    this.setData('d', order[1])
    this.setData('q', order[2])
    this.setData('P', seasonal_order[0])
    this.setData('D', seasonal_order[1])
    this.setData('Q', seasonal_order[2])
    this.setData('s', seasonal_order[3])
    this.setData('steps', steps)

    const py_result = await this.runPythonSafely(`
      from statsmodels.tsa.statespace.sarimax import SARIMAX
      import warnings
      warnings.filterwarnings('ignore')

      ts_data = np.array(ts_data)

      try:
        # SARIMA 모델 fitting
        model = SARIMAX(ts_data, order=(p, d, q), seasonal_order=(P, D, Q, s))
        fitted_model = model.fit(disp=False)

        # 예측
        forecast = fitted_model.forecast(steps=steps)
        forecast_df = fitted_model.get_forecast(steps=steps)
        conf_int = forecast_df.conf_int(alpha=0.05)

        # 평가 지표
        residuals = fitted_model.resid
        mae = np.mean(np.abs(residuals))
        rmse = np.sqrt(np.mean(residuals**2))

        py_result = {
          'forecast': forecast.tolist(),
          'lower_bound': conf_int.iloc[:, 0].tolist(),
          'upper_bound': conf_int.iloc[:, 1].tolist(),
          'residuals': residuals.tolist(),
          'aic': float(fitted_model.aic),
          'bic': float(fitted_model.bic),
          'seasonal_order': {
            'P': int(P),
            'D': int(D),
            'Q': int(Q),
            's': int(s)
          },
          'model_params': {
            'p': int(p),
            'd': int(d),
            'q': int(q),
            'seasonal_order': [int(P), int(D), int(Q), int(s)]
          },
          'fitted_values': fitted_model.fittedvalues.tolist(),
          'mae': float(mae),
          'rmse': float(rmse),
          'confidence_level': 0.95,
          'trend': [],
          'seasonal': [],
          'residual': residuals.tolist(),
          'period': int(s)
        }
      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as SARIMAResult
  }

  /**
   * VAR (벡터 자기회귀)
   */
  async varModel(
    data: number[][],
    maxlags?: number,
    steps: number = 10
  ): Promise<VARResult> {
    await this.initialize()
    this.setData('multivariate_data', data)
    this.setData('maxlags', maxlags || 10)
    this.setData('forecast_steps', steps)

    const py_result = await this.runPythonSafely(`
      from statsmodels.tsa.vector_ar.var_model import VAR
      import warnings
      warnings.filterwarnings('ignore')

      # 데이터 준비 (각 열이 하나의 변수)
      data_array = np.array(multivariate_data).T

      try:
        # VAR 모델 fitting
        model = VAR(data_array)

        # 최적 lag 선택
        if maxlags:
          lag_order_results = model.select_order(maxlags=maxlags)
          optimal_lag = lag_order_results.aic
        else:
          optimal_lag = 1

        fitted_model = model.fit(optimal_lag)

        # 예측
        forecast = fitted_model.forecast(data_array[-optimal_lag:], steps=forecast_steps)

        # Granger causality test
        granger_results = {}
        n_vars = data_array.shape[1]
        for i in range(n_vars):
          for j in range(n_vars):
            if i != j:
              try:
                from statsmodels.tsa.stattools import grangercausalitytests
                gc_test = grangercausalitytests(data_array[:, [j, i]], maxlag=optimal_lag, verbose=False)
                # 첫 번째 lag의 결과 사용
                test_result = gc_test[1][0]['ssr_ftest']
                granger_results[f'var{j}_to_var{i}'] = {
                  'test_statistic': float(test_result[0]),
                  'p_value': float(test_result[1]),
                  'df': int(test_result[2])
                }
              except:
                pass

        py_result = {
          'coefficients': fitted_model.params.tolist(),
          'lag_order': int(optimal_lag),
          'granger_causality': granger_results,
          'forecast': forecast.tolist(),
          'residuals': fitted_model.resid.tolist(),
          'aic': float(fitted_model.aic),
          'bic': float(fitted_model.bic)
        }

      except Exception as e:
        py_result = {'error': str(e)}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as VARResult
  }

  /**
   * Cox Proportional Hazards Regression
   */
  async coxRegression(
    data: any[],
    duration_col: string,
    event_col: string,
    covariates: string[]
  ): Promise<CoxRegressionResult> {
    await this.initialize()
    this.setData('cox_data', data)
    this.setData('duration_col', duration_col)
    this.setData('event_col', event_col)
    this.setData('covariates', covariates)

    const py_result = await this.runPythonSafely(`
      import pandas as pd

      # lifelines 설치 확인 및 대체 구현
      try:
        from lifelines import CoxPHFitter
        use_lifelines = True
      except ImportError:
        use_lifelines = False

      df = pd.DataFrame(cox_data)

      if use_lifelines:
        try:
          # lifelines를 사용한 Cox regression
          cph = CoxPHFitter()
          cph.fit(df, duration_col=duration_col, event_col=event_col, formula=' + '.join(covariates))

          # 계수 추출
          coefficients = {}
          for var in covariates:
            coefficients[var] = {
              'coef': float(cph.params_[var]),
              'exp_coef': float(np.exp(cph.params_[var])),  # Hazard ratio
              'se_coef': float(cph.standard_errors_[var]),
              'z': float(cph.summary.loc[var, 'z']),
              'p_value': float(cph.summary.loc[var, 'p']),
              'ci_lower': float(cph.confidence_intervals_.loc[var, '95% lower-bound']),
              'ci_upper': float(cph.confidence_intervals_.loc[var, '95% upper-bound'])
            }

          py_result = {
            'coefficients': coefficients,
            'concordance': float(cph.concordance_index_),
            'log_likelihood': float(cph.log_likelihood_),
            'likelihood_ratio_test': {
              'test_statistic': float(cph.summary.loc[covariates[0], 'coef']),  # Simplified
              'df': len(covariates),
              'p_value': float(cph.summary.loc[covariates[0], 'p'])
            },
            'n_observations': int(len(df)),
            'n_events': int(df[event_col].sum())
          }

        except Exception as e:
          py_result = {'error': f'Cox regression with lifelines failed: {str(e)}'}

      else:
        # statsmodels를 사용한 간단한 대안
        from statsmodels.duration.hazard_regression import PHReg

        try:
          # PHReg 모델 fitting
          mod = PHReg(df[duration_col], df[covariates], status=df[event_col])
          rslt = mod.fit()

          coefficients = {}
          for i, var in enumerate(covariates):
            coefficients[var] = {
              'coef': float(rslt.params[i]),
              'exp_coef': float(np.exp(rslt.params[i])),
              'se_coef': float(rslt.bse[i]),
              'z': float(rslt.tvalues[i]),
              'p_value': float(rslt.pvalues[i]),
              'ci_lower': float(rslt.conf_int()[i][0]),
              'ci_upper': float(rslt.conf_int()[i][1])
            }

          py_result = {
            'coefficients': coefficients,
            'concordance': 0.5,  # PHReg doesn't provide this directly
            'log_likelihood': float(rslt.llf),
            'likelihood_ratio_test': {
              'test_statistic': float(rslt.llr),
              'df': len(covariates),
              'p_value': float(rslt.llr_pvalue)
            },
            'n_observations': int(len(df)),
            'n_events': int(df[event_col].sum())
          }

        except Exception as e:
          py_result = {'error': f'Cox regression failed: {str(e)}'}

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as CoxRegressionResult
  }
}