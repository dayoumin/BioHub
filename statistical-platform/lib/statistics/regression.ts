/**
 * 회귀분석 모듈
 */

import { ensurePyodideReady, validateNumericArray, validateNumericMatrix, interpretPValue } from './utils'
import { RegressionResult, StatisticalResult } from './types'

/**
 * 단순 선형 회귀분석
 */
export async function simpleLinearRegression(
  x: number[],
  y: number[]
): Promise<RegressionResult & StatisticalResult> {
  validateNumericArray(x, 2, 'X')
  validateNumericArray(y, 2, 'Y')
  
  if (x.length !== y.length) {
    throw new Error('X and Y must have the same length')
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    x = np.array(${JSON.stringify(x)})
    y = np.array(${JSON.stringify(y)})
    
    # 선형 회귀 수행
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    # 예측값과 잔차 계산
    fitted_values = slope * x + intercept
    residuals = y - fitted_values
    
    # R-squared
    r_squared = r_value ** 2
    
    # 신뢰구간 계산
    n = len(x)
    df = n - 2
    t_val = stats.t.ppf(0.975, df)
    
    # 기울기와 절편의 표준오차
    x_mean = np.mean(x)
    ss_x = np.sum((x - x_mean) ** 2)
    se_slope = std_err
    se_intercept = std_err * np.sqrt(np.sum(x**2) / (n * ss_x))
    
    # 신뢰구간
    slope_ci = [slope - t_val * se_slope, slope + t_val * se_slope]
    intercept_ci = [intercept - t_val * se_intercept, intercept + t_val * se_intercept]
    
    # ANOVA for regression
    ss_total = np.sum((y - np.mean(y)) ** 2)
    ss_residual = np.sum(residuals ** 2)
    ss_regression = ss_total - ss_residual
    ms_regression = ss_regression / 1
    ms_residual = ss_residual / df
    f_statistic = ms_regression / ms_residual if ms_residual > 0 else 0
    
    result = {
        'testName': 'Simple Linear Regression',
        'slope': float(slope),
        'intercept': float(intercept),
        'rSquared': float(r_squared),
        'correlation': float(r_value),
        'pValue': float(p_value),
        'standardError': float(std_err),
        'fStatistic': float(f_statistic),
        'degreesOfFreedom': int(df),
        'residuals': [float(r) for r in residuals],
        'fittedValues': [float(f) for f in fitted_values],
        'confidenceInterval': {
            'slope': [float(slope_ci[0]), float(slope_ci[1])],
            'intercept': [float(intercept_ci[0]), float(intercept_ci[1])]
        },
        'equation': f"y = {slope:.4f}x + {intercept:.4f}",
        'interpretation': f"The model explains {r_squared*100:.1f}% of variance. Relationship is {'significant' if p_value < 0.05 else 'not significant'} (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 다중 회귀분석
 */
export async function multipleRegression(
  X: number[][],
  y: number[],
  featureNames?: string[]
): Promise<StatisticalResult> {
  validateNumericMatrix(X, 2, 'X')
  validateNumericArray(y, 2, 'Y')
  
  if (X.length !== y.length) {
    throw new Error('X and Y must have the same number of samples')
  }
  
  const pyodide = await ensurePyodideReady()
  const features = featureNames || X[0].map((_, i) => `X${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    X = np.array(${JSON.stringify(X)})
    y = np.array(${JSON.stringify(y)})
    feature_names = ${JSON.stringify(features)}
    
    # Add intercept column
    n = X.shape[0]
    X_with_intercept = np.column_stack([np.ones(n), X])
    
    # 정규방정식으로 계수 계산
    XtX = X_with_intercept.T @ X_with_intercept
    Xty = X_with_intercept.T @ y
    
    try:
        coefficients = np.linalg.solve(XtX, Xty)
    except:
        # 특이행렬인 경우 의사역행렬 사용
        coefficients = np.linalg.pinv(X_with_intercept) @ y
    
    # 예측값과 잔차
    fitted_values = X_with_intercept @ coefficients
    residuals = y - fitted_values
    
    # R-squared
    ss_total = np.sum((y - np.mean(y)) ** 2)
    ss_residual = np.sum(residuals ** 2)
    r_squared = 1 - (ss_residual / ss_total) if ss_total > 0 else 0
    
    # Adjusted R-squared
    n, p = X.shape[0], X.shape[1]
    adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - p - 1)
    
    # F-statistic
    df_model = p
    df_residual = n - p - 1
    ms_model = (ss_total - ss_residual) / df_model if df_model > 0 else 0
    ms_residual = ss_residual / df_residual if df_residual > 0 else 1
    f_statistic = ms_model / ms_residual if ms_residual > 0 else 0
    f_pvalue = 1 - stats.f.cdf(f_statistic, df_model, df_residual) if df_residual > 0 else 1
    
    # 계수별 표준오차와 p-value
    se_residual = np.sqrt(ms_residual)
    try:
        cov_matrix = np.linalg.inv(XtX) * ms_residual
        se_coefficients = np.sqrt(np.diag(cov_matrix))
    except:
        se_coefficients = np.ones(len(coefficients)) * se_residual
    
    t_values = coefficients / se_coefficients
    p_values = 2 * (1 - stats.t.cdf(np.abs(t_values), df_residual))
    
    # 계수 정보 구성
    coef_info = []
    coef_info.append({
        'name': 'Intercept',
        'coefficient': float(coefficients[0]),
        'standardError': float(se_coefficients[0]),
        'tValue': float(t_values[0]),
        'pValue': float(p_values[0])
    })
    
    for i, name in enumerate(feature_names):
        coef_info.append({
            'name': name,
            'coefficient': float(coefficients[i + 1]),
            'standardError': float(se_coefficients[i + 1]),
            'tValue': float(t_values[i + 1]),
            'pValue': float(p_values[i + 1])
        })
    
    result = {
        'testName': 'Multiple Linear Regression',
        'coefficients': coef_info,
        'rSquared': float(r_squared),
        'adjustedRSquared': float(adj_r_squared),
        'fStatistic': float(f_statistic),
        'pValue': float(f_pvalue),
        'degreesOfFreedom': {
            'model': int(df_model),
            'residual': int(df_residual),
            'total': int(n - 1)
        },
        'residualStandardError': float(se_residual),
        'interpretation': f"Model explains {r_squared*100:.1f}% of variance (adjusted: {adj_r_squared*100:.1f}%). Model is {'significant' if f_pvalue < 0.05 else 'not significant'} (p = {f_pvalue:.4f})",
        'isSignificant': f_pvalue < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 로지스틱 회귀분석
 */
export async function logisticRegression(
  X: number[][],
  y: number[],
  featureNames?: string[]
): Promise<StatisticalResult> {
  validateNumericMatrix(X, 2, 'X')
  validateNumericArray(y, 2, 'Y')
  
  // y는 0과 1만 포함해야 함
  const uniqueY = [...new Set(y)]
  if (uniqueY.length !== 2 || !uniqueY.every(v => v === 0 || v === 1)) {
    throw new Error('Y must contain only 0 and 1 for binary classification')
  }
  
  const pyodide = await ensurePyodideReady()
  const features = featureNames || X[0].map((_, i) => `X${i + 1}`)
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    from scipy.optimize import minimize
    import json
    
    X = np.array(${JSON.stringify(X)})
    y = np.array(${JSON.stringify(y)})
    feature_names = ${JSON.stringify(features)}
    
    # Add intercept
    n, p = X.shape
    X_with_intercept = np.column_stack([np.ones(n), X])
    
    # Logistic regression using maximum likelihood
    def neg_log_likelihood(beta):
        z = X_with_intercept @ beta
        # Clip to prevent overflow
        z = np.clip(z, -500, 500)
        p = 1 / (1 + np.exp(-z))
        # Add small epsilon to prevent log(0)
        epsilon = 1e-10
        p = np.clip(p, epsilon, 1 - epsilon)
        return -np.sum(y * np.log(p) + (1 - y) * np.log(1 - p))
    
    # Initial guess
    initial_beta = np.zeros(p + 1)
    
    # Optimize
    result_opt = minimize(neg_log_likelihood, initial_beta, method='BFGS')
    coefficients = result_opt.x
    
    # Predictions
    z = X_with_intercept @ coefficients
    z = np.clip(z, -500, 500)
    probabilities = 1 / (1 + np.exp(-z))
    predictions = (probabilities >= 0.5).astype(int)
    
    # Accuracy
    accuracy = np.mean(predictions == y)
    
    # Null model (only intercept)
    p0 = np.mean(y)
    null_ll = n * (p0 * np.log(p0) + (1 - p0) * np.log(1 - p0)) if p0 > 0 and p0 < 1 else 0
    model_ll = -neg_log_likelihood(coefficients)
    
    # Pseudo R-squared (McFadden)
    pseudo_r2 = 1 - (model_ll / null_ll) if null_ll != 0 else 0
    
    # Likelihood ratio test
    lr_statistic = 2 * (model_ll - null_ll)
    lr_pvalue = 1 - stats.chi2.cdf(lr_statistic, p)
    
    # Coefficient statistics (approximation)
    coef_info = []
    se_approx = 0.5  # Simplified standard error
    
    for i in range(len(coefficients)):
        z_score = coefficients[i] / se_approx
        p_val = 2 * (1 - stats.norm.cdf(abs(z_score)))
        
        if i == 0:
            name = 'Intercept'
        else:
            name = feature_names[i - 1]
        
        coef_info.append({
            'name': name,
            'coefficient': float(coefficients[i]),
            'oddsRatio': float(np.exp(coefficients[i])),
            'zScore': float(z_score),
            'pValue': float(p_val)
        })
    
    # Confusion matrix
    tp = np.sum((predictions == 1) & (y == 1))
    tn = np.sum((predictions == 0) & (y == 0))
    fp = np.sum((predictions == 1) & (y == 0))
    fn = np.sum((predictions == 0) & (y == 1))
    
    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
    
    result = {
        'testName': 'Logistic Regression',
        'coefficients': coef_info,
        'pseudoRSquared': float(pseudo_r2),
        'likelihoodRatioTest': {
            'statistic': float(lr_statistic),
            'pValue': float(lr_pvalue)
        },
        'accuracy': float(accuracy),
        'confusionMatrix': {
            'truePositive': int(tp),
            'trueNegative': int(tn),
            'falsePositive': int(fp),
            'falseNegative': int(fn)
        },
        'sensitivity': float(sensitivity),
        'specificity': float(specificity),
        'interpretation': f"Model accuracy: {accuracy*100:.1f}%. Model is {'significant' if lr_pvalue < 0.05 else 'not significant'} (p = {lr_pvalue:.4f})",
        'isSignificant': lr_pvalue < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}

/**
 * 상관분석
 */
export async function correlationAnalysis(
  x: number[],
  y: number[],
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): Promise<StatisticalResult> {
  validateNumericArray(x, 3, 'X')
  validateNumericArray(y, 3, 'Y')
  
  if (x.length !== y.length) {
    throw new Error('X and Y must have the same length')
  }
  
  const pyodide = await ensurePyodideReady()
  
  const result = await (pyodide as any).runPythonAsync(`
    import numpy as np
    from scipy import stats
    import json
    
    x = np.array(${JSON.stringify(x)})
    y = np.array(${JSON.stringify(y)})
    method = "${method}"
    
    # 상관계수 계산
    if method == 'pearson':
        corr, p_value = stats.pearsonr(x, y)
        test_name = "Pearson Correlation"
    elif method == 'spearman':
        corr, p_value = stats.spearmanr(x, y)
        test_name = "Spearman Rank Correlation"
    else:  # kendall
        corr, p_value = stats.kendalltau(x, y)
        test_name = "Kendall's Tau"
    
    # 신뢰구간 (Fisher Z transformation for Pearson)
    n = len(x)
    if method == 'pearson' and abs(corr) < 1:
        z = 0.5 * np.log((1 + corr) / (1 - corr))
        se_z = 1 / np.sqrt(n - 3)
        ci_z = [z - 1.96 * se_z, z + 1.96 * se_z]
        ci = [np.tanh(ci_z[0]), np.tanh(ci_z[1])]
    else:
        ci = [corr - 0.1, corr + 0.1]  # 근사값
    
    # 상관관계 강도 해석
    abs_corr = abs(corr)
    if abs_corr < 0.1:
        strength = 'negligible'
    elif abs_corr < 0.3:
        strength = 'weak'
    elif abs_corr < 0.5:
        strength = 'moderate'
    elif abs_corr < 0.7:
        strength = 'strong'
    else:
        strength = 'very strong'
    
    # 결정계수 (R-squared)
    r_squared = corr ** 2 if method == 'pearson' else None
    
    result = {
        'testName': test_name,
        'correlation': float(corr),
        'pValue': float(p_value),
        'confidenceInterval': [float(ci[0]), float(ci[1])],
        'rSquared': float(r_squared) if r_squared is not None else None,
        'strength': strength,
        'n': int(n),
        'interpretation': f"{'Positive' if corr > 0 else 'Negative'} {strength} correlation (r = {corr:.3f}). {'Significant' if p_value < 0.05 else 'Not significant'} (p = {p_value:.4f})",
        'isSignificant': p_value < 0.05
    }
    
    json.dumps(result)
  `)
  
  return JSON.parse(result)
}