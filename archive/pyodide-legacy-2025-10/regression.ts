/**
 * 회귀분석 서비스 모듈
 */

import { BasePyodideService } from './base'
import type {
  IRegressionService,
  RegressionResult
} from './types'

export class RegressionService extends BasePyodideService implements IRegressionService {
  private static instance: RegressionService | null = null

  private constructor() {
    super()
  }

  static getInstance(): RegressionService {
    if (!RegressionService.instance) {
      RegressionService.instance = new RegressionService()
    }
    return RegressionService.instance
  }

  /**
   * 단순선형회귀
   */
  async simpleRegression(xValues: number[], yValues: number[]): Promise<RegressionResult> {
    await this.initialize()
    this.setData('x_data', xValues)
    this.setData('y_data', yValues)

    const py_result = await this.runPythonSafely(`
      # 쌍별 결측값 제거
      pairs = [(x, y) for x, y in zip(x_data, y_data)
               if x is not None and y is not None and not np.isnan(x) and not np.isnan(y)]

      if len(pairs) < 3:
        py_result = {'error': 'Insufficient data for regression (minimum 3 points required)'}
      else:
        x_clean = np.array([p[0] for p in pairs])
        y_clean = np.array([p[1] for p in pairs])

        # 선형회귀 수행
        slope, intercept, r_value, p_value, std_err = stats.linregress(x_clean, y_clean)

        # 기본 통계량
        n = len(x_clean)
        df_model = 1
        df_resid = n - 2
        r_squared = r_value ** 2
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / df_resid

        # 예측값 및 잔차
        predictions = slope * x_clean + intercept
        residuals = y_clean - predictions

        # F-통계량
        if r_squared < 1 and df_resid > 0:
          f_stat = (r_squared / df_model) / ((1 - r_squared) / df_resid)
          f_p_value = 1 - stats.f.cdf(f_stat, df_model, df_resid)
        else:
          f_stat = float('inf')
          f_p_value = 0

        # t-통계량 (기울기)
        t_stat = slope / std_err if std_err > 0 else float('inf')

        # 신뢰구간 (95%)
        t_critical = stats.t.ppf(0.975, df_resid)
        slope_ci_lower = slope - t_critical * std_err
        slope_ci_upper = slope + t_critical * std_err

        # 회귀 진단
        mean_y = np.mean(y_clean)
        ss_total = np.sum((y_clean - mean_y)**2)
        ss_residual = np.sum(residuals**2)
        mse = ss_residual / df_resid
        rmse = np.sqrt(mse)

        py_result = {
          'coefficients': [float(intercept), float(slope)],
          'intercept': float(intercept),
          'slope': float(slope),
          'rSquared': float(r_squared),
          'adjustedRSquared': float(adj_r_squared),
          'fStatistic': float(f_stat),
          'fPValue': float(f_p_value),
          'standardErrors': [0, float(std_err)],  # intercept SE는 별도 계산 필요
          'tStatistics': [0, float(t_stat)],      # intercept t-stat는 별도 계산 필요
          'pValues': [0, float(p_value)],         # slope p-value
          'confidenceIntervals': [[0, 0], [float(slope_ci_lower), float(slope_ci_upper)]],
          'fitted': predictions.tolist(),
          'residuals': residuals.tolist(),
          'mse': float(mse),
          'rmse': float(rmse),
          'degreesOfFreedom': int(df_resid),
          'sampleSize': int(n),
          'equation': f'y = {intercept:.4f} + {slope:.4f}x'
        }

        # 절편의 표준오차와 t-통계량 계산
        x_mean = np.mean(x_clean)
        sum_x_squared = np.sum((x_clean - x_mean)**2)
        intercept_se = np.sqrt(mse * (1/n + x_mean**2/sum_x_squared))
        intercept_t = intercept / intercept_se if intercept_se > 0 else float('inf')
        intercept_p = 2 * (1 - stats.t.cdf(abs(intercept_t), df_resid))
        intercept_ci_lower = intercept - t_critical * intercept_se
        intercept_ci_upper = intercept + t_critical * intercept_se

        py_result['standardErrors'][0] = float(intercept_se)
        py_result['tStatistics'][0] = float(intercept_t)
        py_result['pValues'][0] = float(intercept_p)
        py_result['confidenceIntervals'][0] = [float(intercept_ci_lower), float(intercept_ci_upper)]

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as RegressionResult
  }

  /**
   * 다중선형회귀
   */
  async multipleRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult> {
    await this.initialize()
    this.setData('X_matrix', xMatrix)
    this.setData('y_values', yValues)
    this.setData('var_names', variableNames || xMatrix[0]?.map((_, i) => `X${i + 1}`) || [])

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from sklearn.linear_model import LinearRegression
      from sklearn.metrics import mean_squared_error, r2_score

      # 데이터 준비
      X = np.array(X_matrix)
      y = np.array(y_values)

      if X.shape[0] != len(y):
        py_result = {'error': 'X matrix and y vector must have the same number of observations'}
      elif X.shape[0] < X.shape[1] + 2:
        py_result = {'error': 'Insufficient data for multiple regression'}
      else:
        # 결측값이 있는 행 제거
        df = pd.DataFrame(np.column_stack([X, y]))
        df_clean = df.dropna()

        if len(df_clean) < X.shape[1] + 2:
          py_result = {'error': 'Too many missing values for multiple regression'}
        else:
          X_clean = df_clean.iloc[:, :-1].values
          y_clean = df_clean.iloc[:, -1].values
          n, p = X_clean.shape

          # statsmodels를 사용한 상세 분석 (가능한 경우)
          try:
            import statsmodels.api as sm

            # 절편 추가
            X_with_const = sm.add_constant(X_clean)

            # OLS 모델
            model = sm.OLS(y_clean, X_with_const).fit()

            # 계수 및 통계량
            coefficients = model.params.tolist()
            std_errors = model.bse.tolist()
            t_statistics = model.tvalues.tolist()
            p_values = model.pvalues.tolist()
            conf_intervals = model.conf_int().tolist()

            # 다중공선성 진단 (VIF)
            from statsmodels.stats.outliers_influence import variance_inflation_factor
            vif_values = []
            for i in range(1, X_with_const.shape[1]):  # 절편 제외
              vif = variance_inflation_factor(X_with_const, i)
              vif_values.append(float(vif))

            # 잔차 진단
            fitted_values = model.fittedvalues
            residuals = model.resid
            durbin_watson = float(sm.stats.durbin_watson(residuals))

            py_result = {
              'coefficients': coefficients,
              'intercept': float(coefficients[0]),
              'rSquared': float(model.rsquared),
              'adjustedRSquared': float(model.rsquared_adj),
              'fStatistic': float(model.fvalue),
              'fPValue': float(model.f_pvalue),
              'standardErrors': std_errors,
              'tStatistics': t_statistics,
              'pValues': p_values,
              'confidenceIntervals': conf_intervals,
              'fitted': fitted_values.tolist(),
              'residuals': residuals.tolist(),
              'mse': float(model.mse_resid),
              'rmse': float(np.sqrt(model.mse_resid)),
              'aic': float(model.aic),
              'bic': float(model.bic),
              'vif': vif_values,
              'durbinWatson': durbin_watson,
              'degreesOfFreedom': int(model.df_resid),
              'sampleSize': int(n),
              'nPredictors': int(p),
              'variableNames': ['Intercept'] + var_names[:p]
            }

          except ImportError:
            # statsmodels가 없는 경우 scikit-learn으로 기본 분석
            reg = LinearRegression().fit(X_clean, y_clean)

            y_pred = reg.predict(X_clean)
            residuals = y_clean - y_pred
            mse = mean_squared_error(y_clean, y_pred)
            r2 = r2_score(y_clean, y_pred)
            adj_r2 = 1 - (1 - r2) * (n - 1) / (n - p - 1)

            # F-통계량 계산
            f_stat = (r2 / p) / ((1 - r2) / (n - p - 1)) if r2 < 1 else float('inf')
            f_p_value = 1 - stats.f.cdf(f_stat, p, n - p - 1) if f_stat != float('inf') else 0

            py_result = {
              'coefficients': [float(reg.intercept_)] + reg.coef_.tolist(),
              'intercept': float(reg.intercept_),
              'rSquared': float(r2),
              'adjustedRSquared': float(adj_r2),
              'fStatistic': float(f_stat),
              'fPValue': float(f_p_value),
              'fitted': y_pred.tolist(),
              'residuals': residuals.tolist(),
              'mse': float(mse),
              'rmse': float(np.sqrt(mse)),
              'degreesOfFreedom': int(n - p - 1),
              'sampleSize': int(n),
              'nPredictors': int(p),
              'variableNames': ['Intercept'] + var_names[:p],
              'note': 'Limited statistics available without statsmodels'
            }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as RegressionResult
  }

  /**
   * 로지스틱 회귀분석
   */
  async logisticRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult> {
    await this.initialize()
    this.setData('X_matrix', xMatrix)
    this.setData('y_values', yValues)
    this.setData('var_names', variableNames || xMatrix[0]?.map((_, i) => `X${i + 1}`) || [])

    const py_result = await this.runPythonSafely(`
      import pandas as pd
      from sklearn.linear_model import LogisticRegression
      from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, log_loss

      # 데이터 준비
      X = np.array(X_matrix)
      y = np.array(y_values)

      if X.shape[0] != len(y):
        py_result = {'error': 'X matrix and y vector must have the same number of observations'}
      elif not all(val in [0, 1] for val in y if not np.isnan(val)):
        py_result = {'error': 'y values must be binary (0 or 1) for logistic regression'}
      elif X.shape[0] < X.shape[1] + 2:
        py_result = {'error': 'Insufficient data for logistic regression'}
      else:
        # 결측값이 있는 행 제거
        df = pd.DataFrame(np.column_stack([X, y]))
        df_clean = df.dropna()

        if len(df_clean) < X.shape[1] + 2:
          py_result = {'error': 'Too many missing values for logistic regression'}
        else:
          X_clean = df_clean.iloc[:, :-1].values
          y_clean = df_clean.iloc[:, -1].values.astype(int)
          n, p = X_clean.shape

          try:
            # statsmodels를 사용한 상세 분석
            import statsmodels.api as sm

            # 절편 추가
            X_with_const = sm.add_constant(X_clean)

            # 로지스틱 회귀 모델
            logit_model = sm.Logit(y_clean, X_with_const).fit(disp=0)

            # 계수 및 통계량
            coefficients = logit_model.params.tolist()
            std_errors = logit_model.bse.tolist()
            z_statistics = logit_model.tvalues.tolist()  # logistic에서는 z-statistics
            p_values = logit_model.pvalues.tolist()
            conf_intervals = logit_model.conf_int().tolist()

            # 오즈비 계산
            odds_ratios = np.exp(logit_model.params).tolist()
            odds_ratios_ci = np.exp(logit_model.conf_int()).tolist()

            # 예측 확률
            predicted_probs = logit_model.predict(X_with_const)
            predicted_class = (predicted_probs > 0.5).astype(int)

            # 모델 평가 지표
            accuracy = accuracy_score(y_clean, predicted_class)
            precision = precision_score(y_clean, predicted_class, zero_division=0)
            recall = recall_score(y_clean, predicted_class, zero_division=0)
            f1 = f1_score(y_clean, predicted_class, zero_division=0)
            auc = roc_auc_score(y_clean, predicted_probs)

            # 의사 R² 계산
            ll_null = logit_model.llnull
            ll_model = logit_model.llf
            mcfadden_r2 = 1 - (ll_model / ll_null)
            cox_snell_r2 = 1 - np.exp((ll_null - ll_model) * (2/n))
            nagelkerke_r2 = cox_snell_r2 / (1 - np.exp(ll_null * (2/n)))

            py_result = {
              'coefficients': coefficients,
              'intercept': float(coefficients[0]),
              'standardErrors': std_errors,
              'zStatistics': z_statistics,
              'pValues': p_values,
              'confidenceIntervals': conf_intervals,
              'oddsRatios': odds_ratios,
              'oddsRatiosCI': odds_ratios_ci,
              'predictedProbabilities': predicted_probs.tolist(),
              'predictedClass': predicted_class.tolist(),
              'accuracy': float(accuracy),
              'precision': float(precision),
              'recall': float(recall),
              'f1Score': float(f1),
              'auc': float(auc),
              'mcfaddenR2': float(mcfadden_r2),
              'coxSnellR2': float(cox_snell_r2),
              'nagelkerkeR2': float(nagelkerke_r2),
              'logLikelihood': float(ll_model),
              'aic': float(logit_model.aic),
              'bic': float(logit_model.bic),
              'degreesOfFreedom': int(logit_model.df_resid),
              'sampleSize': int(n),
              'nPredictors': int(p),
              'variableNames': ['Intercept'] + var_names[:p]
            }

          except ImportError:
            # statsmodels가 없는 경우 scikit-learn으로 기본 분석
            log_reg = LogisticRegression(fit_intercept=True, max_iter=1000).fit(X_clean, y_clean)

            predicted_probs = log_reg.predict_proba(X_clean)[:, 1]
            predicted_class = log_reg.predict(X_clean)

            # 기본 평가 지표
            accuracy = accuracy_score(y_clean, predicted_class)
            precision = precision_score(y_clean, predicted_class, zero_division=0)
            recall = recall_score(y_clean, predicted_class, zero_division=0)
            f1 = f1_score(y_clean, predicted_class, zero_division=0)
            auc = roc_auc_score(y_clean, predicted_probs)

            py_result = {
              'coefficients': [float(log_reg.intercept_[0])] + log_reg.coef_[0].tolist(),
              'intercept': float(log_reg.intercept_[0]),
              'predictedProbabilities': predicted_probs.tolist(),
              'predictedClass': predicted_class.tolist(),
              'accuracy': float(accuracy),
              'precision': float(precision),
              'recall': float(recall),
              'f1Score': float(f1),
              'auc': float(auc),
              'sampleSize': int(n),
              'nPredictors': int(p),
              'variableNames': ['Intercept'] + var_names[:p],
              'note': 'Limited statistics available without statsmodels'
            }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    // RegressionResult 형식에 맞게 조정
    return {
      coefficients: result.coefficients,
      intercept: result.intercept,
      rSquared: result.mcfaddenR2 || 0,  // 로지스틱 회귀에서는 pseudo R²
      adjustedRSquared: result.nagelkerkeR2 || 0,
      fStatistic: 0,  // 로지스틱 회귀에서는 해당 없음
      fPValue: 0,
      residuals: [],  // 로지스틱 회귀에서는 잔차 대신 예측 확률 사용
      fitted: result.predictedProbabilities,
      standardErrors: result.standardErrors || [],
      tStatistics: result.zStatistics || [],  // z-statistics
      pValues: result.pValues || [],
      confidenceIntervals: result.confidenceIntervals || [],
      ...result
    } as RegressionResult
  }
}