/**
 * 가설검정 서비스 모듈 (T-test, 상관분석)
 */

import { BasePyodideService } from './base'
import type {
  IHypothesisService,
  StatisticalTestResult,
  CorrelationResult
} from './types'

export class HypothesisService extends BasePyodideService implements IHypothesisService {
  private static instance: HypothesisService | null = null

  private constructor() {
    super()
  }

  static getInstance(): HypothesisService {
    if (!HypothesisService.instance) {
      HypothesisService.instance = new HypothesisService()
    }
    return HypothesisService.instance
  }

  /**
   * 일표본 t-검정
   */
  async oneSampleTTest(data: number[], popmean: number, alternative: string = 'two-sided'): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('data_array', data)
    this.setData('popmean', popmean)
    this.setData('alternative', alternative)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      clean_data = np.array([x for x in data_array if x is not None and not np.isnan(x)])

      if len(clean_data) < 2:
        py_result = {'error': 'Insufficient data for one-sample t-test'}
      else:
        t_stat, p_value = stats.ttest_1samp(
          clean_data,
          popmean=popmean,
          alternative=alternative if alternative in ['two-sided','less','greater'] else 'two-sided'
        )
        df = len(clean_data) - 1

        # 신뢰구간 (95%)
        alpha_level = 0.05
        t_critical = stats.t.ppf(1 - alpha_level/2, df)
        se = stats.sem(clean_data)
        mean = np.mean(clean_data)
        ci_lower = mean - t_critical * se
        ci_upper = mean + t_critical * se

        # 효과크기 (Cohen's d)
        cohens_d = (mean - popmean) / np.std(clean_data, ddof=1)

        py_result = {
          'statistic': float(t_stat),
          'pValue': float(p_value),
          'df': int(df),
          'mean': float(mean),
          'se': float(se),
          'confidenceInterval': [float(ci_lower), float(ci_upper)],
          'cohensD': float(cohens_d),
          'alternative': alternative,
          'method': 'One Sample t-test',
          'sampleSize': int(len(clean_data))
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * 독립표본 t-검정
   */
  async twoSampleTTest(group1: number[], group2: number[], equalVar: boolean = true): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('group1', group1)
    this.setData('group2', group2)
    this.setData('equal_var', equalVar)

    const py_result = await this.runPythonSafely(`
      # 결측값 제거
      g1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
      g2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

      if len(g1) < 2 or len(g2) < 2:
        py_result = {'error': 'Each group must have at least 2 observations'}
      else:
        # t-검정 수행
        t_stat, p_value = stats.ttest_ind(g1, g2, equal_var=equal_var)

        # 자유도 계산
        if equal_var:
          df = len(g1) + len(g2) - 2
        else:
          # Welch's t-test 자유도
          s1_sq = np.var(g1, ddof=1)
          s2_sq = np.var(g2, ddof=1)
          n1, n2 = len(g1), len(g2)
          df = (s1_sq/n1 + s2_sq/n2)**2 / ((s1_sq/n1)**2/(n1-1) + (s2_sq/n2)**2/(n2-1))

        # 기초 통계량
        mean1, mean2 = np.mean(g1), np.mean(g2)
        std1, std2 = np.std(g1, ddof=1), np.std(g2, ddof=1)
        n1, n2 = len(g1), len(g2)

        # 신뢰구간 계산
        mean_diff = mean1 - mean2
        if equal_var:
          pooled_std = np.sqrt(((n1-1)*std1**2 + (n2-1)*std2**2) / (n1+n2-2))
          se_diff = pooled_std * np.sqrt(1/n1 + 1/n2)
        else:
          se_diff = np.sqrt(std1**2/n1 + std2**2/n2)

        t_critical = stats.t.ppf(0.975, df)
        ci_lower = mean_diff - t_critical * se_diff
        ci_upper = mean_diff + t_critical * se_diff

        # 효과크기 (Cohen's d)
        if equal_var:
          cohens_d = mean_diff / pooled_std
        else:
          # Glass's delta for unequal variances
          cohens_d = mean_diff / std2

        py_result = {
          'statistic': float(t_stat),
          'pValue': float(p_value),
          'df': float(df),
          'mean1': float(mean1),
          'mean2': float(mean2),
          'std1': float(std1),
          'std2': float(std2),
          'meanDifference': float(mean_diff),
          'seDifference': float(se_diff),
          'confidenceInterval': [float(ci_lower), float(ci_upper)],
          'cohensD': float(cohens_d),
          'equalVariances': bool(equal_var),
          'method': 'Independent Samples t-test' if equal_var else "Welch's t-test",
          'sampleSize1': int(n1),
          'sampleSize2': int(n2)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * 대응표본 t-검정
   */
  async pairedTTest(values1: number[], values2: number[], alternative: string = 'two-sided'): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('values1', values1)
    this.setData('values2', values2)
    this.setData('alternative', alternative)

    const py_result = await this.runPythonSafely(`
      # 쌍별 결측값 제거
      pairs = [(x, y) for x, y in zip(values1, values2)
               if x is not None and y is not None and not np.isnan(x) and not np.isnan(y)]

      if len(pairs) < 2:
        py_result = {'error': 'Insufficient paired data for t-test'}
      else:
        v1, v2 = zip(*pairs)
        v1, v2 = np.array(v1), np.array(v2)

        # 대응표본 t-검정
        t_stat, p_value = stats.ttest_rel(
          v1, v2,
          alternative=alternative if alternative in ['two-sided','less','greater'] else 'two-sided'
        )
        df = len(v1) - 1

        # 기초 통계량
        mean1, mean2 = np.mean(v1), np.mean(v2)
        std1, std2 = np.std(v1, ddof=1), np.std(v2, ddof=1)

        # 차이값 통계량
        diff = v1 - v2
        mean_diff = np.mean(diff)
        std_diff = np.std(diff, ddof=1)
        se_diff = stats.sem(diff)

        # 신뢰구간
        t_critical = stats.t.ppf(0.975, df)
        ci_lower = mean_diff - t_critical * se_diff
        ci_upper = mean_diff + t_critical * se_diff

        # 효과크기 (Cohen's d for paired samples)
        cohens_d = mean_diff / std_diff

        # 상관계수 (paired samples)
        correlation_coeff, _ = stats.pearsonr(v1, v2)

        py_result = {
          'statistic': float(t_stat),
          'pValue': float(p_value),
          'df': int(df),
          'mean1': float(mean1),
          'mean2': float(mean2),
          'std1': float(std1),
          'std2': float(std2),
          'meanDifference': float(mean_diff),
          'stdDifference': float(std_diff),
          'seDifference': float(se_diff),
          'confidenceInterval': [float(ci_lower), float(ci_upper)],
          'cohensD': float(cohens_d),
          'correlation': float(correlation_coeff),
          'alternative': alternative,
          'method': 'Paired Samples t-test',
          'sampleSize': int(len(v1))
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as StatisticalTestResult
  }

  /**
   * 상관분석 (Pearson, Spearman, Kendall)
   */
  async correlation(x: number[], y: number[], method: string = 'pearson'): Promise<CorrelationResult> {
    await this.initialize()
    this.setData('x_array', x)
    this.setData('y_array', y)
    this.setData('method', method.toLowerCase())

    const py_result = await this.runPythonSafely(`
      # 쌍별 결측값 제거
      pairs = [(x, y) for x, y in zip(x_array, y_array)
               if x is not None and y is not None and not np.isnan(x) and not np.isnan(y)]

      if len(pairs) < 3:
        py_result = {'error': 'Insufficient paired data for correlation'}
      else:
        x_clean, y_clean = zip(*pairs)
        x_clean, y_clean = np.array(x_clean), np.array(y_clean)

        # 상관분석 수행
        if method == 'pearson':
          corr_coeff, p_value = stats.pearsonr(x_clean, y_clean)
          method_name = 'Pearson'
        elif method == 'spearman':
          corr_coeff, p_value = stats.spearmanr(x_clean, y_clean)
          method_name = 'Spearman'
        elif method == 'kendall':
          corr_coeff, p_value = stats.kendalltau(x_clean, y_clean)
          method_name = 'Kendall'
        else:
          # 기본값: Pearson
          corr_coeff, p_value = stats.pearsonr(x_clean, y_clean)
          method_name = 'Pearson'

        # 신뢰구간 계산 (Fisher's z-transformation for Pearson)
        if method == 'pearson':
          n = len(x_clean)
          z = 0.5 * np.log((1 + corr_coeff) / (1 - corr_coeff))  # Fisher's z
          se_z = 1 / np.sqrt(n - 3)
          z_critical = stats.norm.ppf(0.975)
          z_lower = z - z_critical * se_z
          z_upper = z + z_critical * se_z

          # z를 다시 r로 변환
          ci_lower = (np.exp(2 * z_lower) - 1) / (np.exp(2 * z_lower) + 1)
          ci_upper = (np.exp(2 * z_upper) - 1) / (np.exp(2 * z_upper) + 1)
        else:
          # 비모수 상관계수의 경우 근사적 신뢰구간
          ci_lower = None
          ci_upper = None

        py_result = {
          'coefficient': float(corr_coeff),
          'pValue': float(p_value),
          'method': method_name,
          'sampleSize': int(len(x_clean)),
          'confidenceInterval': [float(ci_lower), float(ci_upper)] if ci_lower is not None else None
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as CorrelationResult
  }

  /**
   * 편상관분석
   */
  async partialCorrelation(
    data: number[][],
    xCol: number,
    yCol: number,
    controlCols: number[]
  ): Promise<CorrelationResult> {
    await this.initialize()
    this.setData('data_matrix', data)
    this.setData('x_col', xCol)
    this.setData('y_col', yCol)
    this.setData('control_cols', controlCols)

    const py_result = await this.runPythonSafely(`
      # 데이터 프레임 생성 및 결측값 제거
      import pandas as pd

      df = pd.DataFrame(data_matrix)
      df_clean = df.dropna()

      if len(df_clean) < len(control_cols) + 3:
        py_result = {'error': 'Insufficient data for partial correlation'}
      else:
        # 편상관 계산을 위한 regression residuals 방법
        from sklearn.linear_model import LinearRegression

        # X와 통제변수들로 회귀
        X_controls = df_clean.iloc[:, control_cols].values
        X_target = df_clean.iloc[:, x_col].values
        Y_target = df_clean.iloc[:, y_col].values

        # X에서 통제변수의 영향 제거
        reg_x = LinearRegression().fit(X_controls, X_target)
        X_residuals = X_target - reg_x.predict(X_controls)

        # Y에서 통제변수의 영향 제거
        reg_y = LinearRegression().fit(X_controls, Y_target)
        Y_residuals = Y_target - reg_y.predict(X_controls)

        # 잔차 간 상관계수 계산
        partial_corr, p_value = stats.pearsonr(X_residuals, Y_residuals)

        # 자유도 조정
        df_adj = len(df_clean) - len(control_cols) - 2

        # t-통계량 재계산
        t_stat = partial_corr * np.sqrt(df_adj / (1 - partial_corr**2))
        p_value_adj = 2 * (1 - stats.t.cdf(abs(t_stat), df_adj))

        py_result = {
          'coefficient': float(partial_corr),
          'pValue': float(p_value_adj),
          'method': 'Partial Correlation (Pearson)',
          'sampleSize': int(len(df_clean)),
          'degreesOfFreedom': int(df_adj),
          'controlVariables': len(control_cols),
          'tStatistic': float(t_stat)
        }

      import json
      result = json.dumps(py_result)
      result
    `)

    const result = JSON.parse(py_result)
    if (result.error) {
      throw new Error(result.error)
    }

    return result as CorrelationResult
  }

  /**
   * 다중 상관분석 (모든 방법)
   */
  async calculateCorrelation(
    columnsData: Record<string, number[]>,
    method: string = 'pearson'
  ): Promise<{
    correlationMatrix: number[][]
    pValueMatrix: number[][]
    variables: string[]
    method: string
    sampleSize: number
  }> {
    await this.initialize()

    const variables = Object.keys(columnsData)
    const dataMatrix = variables.map(variable => columnsData[variable])

    this.setData('data_matrix', dataMatrix)
    this.setData('variable_names', variables)
    this.setData('method', method.toLowerCase())

    const py_result = await this.runPythonSafely(`
      import pandas as pd

      # 데이터 프레임 생성
      df = pd.DataFrame(dict(zip(variable_names, data_matrix))).transpose()
      df_clean = df.dropna()

      if len(df_clean) < 3:
        py_result = {'error': 'Insufficient data for correlation matrix'}
      else:
        n_vars = len(variable_names)
        corr_matrix = np.zeros((n_vars, n_vars))
        p_matrix = np.zeros((n_vars, n_vars))

        for i in range(n_vars):
          for j in range(n_vars):
            if i == j:
              corr_matrix[i, j] = 1.0
              p_matrix[i, j] = 0.0
            else:
              x_data = df_clean.iloc[i, :].values
              y_data = df_clean.iloc[j, :].values

              if method == 'pearson':
                corr, p_val = stats.pearsonr(x_data, y_data)
              elif method == 'spearman':
                corr, p_val = stats.spearmanr(x_data, y_data)
              elif method == 'kendall':
                corr, p_val = stats.kendalltau(x_data, y_data)
              else:
                corr, p_val = stats.pearsonr(x_data, y_data)

              corr_matrix[i, j] = corr
              p_matrix[i, j] = p_val

        py_result = {
          'correlationMatrix': corr_matrix.tolist(),
          'pValueMatrix': p_matrix.tolist(),
          'variables': variable_names,
          'method': method.title(),
          'sampleSize': int(len(df_clean.columns))
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
   * 일표본 비율 검정 (One-sample Proportion Test)
   */
  async oneSampleProportionTest(
    successes: number,
    n: number,
    targetProportion: number = 0.5,
    alternative: string = 'two-sided'
  ): Promise<StatisticalTestResult> {
    await this.initialize()
    this.setData('successes', successes)
    this.setData('n', n)
    this.setData('p0', targetProportion)
    this.setData('alternative', alternative)

    const py_result = await this.runPythonSafely(`
      from scipy import stats
      import numpy as np

      # 관측 비율
      p_hat = successes / n

      # 정규 근사 조건 확인
      if n * p0 < 5 or n * (1 - p0) < 5:
        py_result = {'error': 'Sample size too small for normal approximation'}
      else:
        # Z 통계량 계산
        se = np.sqrt(p0 * (1 - p0) / n)
        z_stat = (p_hat - p0) / se

        # p-value 계산
        if alternative == 'two-sided':
          p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))
        elif alternative == 'less':
          p_value = stats.norm.cdf(z_stat)
        elif alternative == 'greater':
          p_value = 1 - stats.norm.cdf(z_stat)
        else:
          alternative = 'two-sided'
          p_value = 2 * (1 - stats.norm.cdf(abs(z_stat)))

        # 신뢰구간 계산 (Wilson score interval)
        alpha = 0.05
        z_critical = stats.norm.ppf(1 - alpha/2)

        # Wilson score interval (더 정확한 신뢰구간)
        center = (p_hat + z_critical**2 / (2*n)) / (1 + z_critical**2 / n)
        margin = z_critical * np.sqrt(p_hat*(1-p_hat)/n + z_critical**2/(4*n**2)) / (1 + z_critical**2/n)
        ci_lower = max(0, center - margin)
        ci_upper = min(1, center + margin)

        # 효과크기 (Cohen's h)
        phi_hat = 2 * np.arcsin(np.sqrt(p_hat))
        phi_0 = 2 * np.arcsin(np.sqrt(p0))
        cohens_h = abs(phi_hat - phi_0)

        py_result = {
          'statistic': float(z_stat),
          'pValue': float(p_value),
          'alternative': alternative,
          'method': 'One-sample proportion test (Z-test)',
          'observedProportion': float(p_hat),
          'targetProportion': float(p0),
          'confidenceInterval': [float(ci_lower), float(ci_upper)],
          'confidenceLevel': 0.95,
          'effectSize': float(cohens_h),
          'sampleSize': int(n),
          'successes': int(successes),
          'standardError': float(se)
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
}