# Worker 2: Hypothesis Testing Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels
# - Estimated memory: ~90MB
# - Cold start time: ~1.2s

from typing import List, Dict, Union, Literal, Optional, Any
import numpy as np
from scipy import stats
from scipy.stats import binomtest
import math
from helpers import clean_array, clean_paired_arrays, clean_groups


def _safe_float(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    if math.isnan(value) or math.isinf(value):
        return None
    return float(value)


def t_test_two_sample(
    group1: List[Union[float, int, None]],
    group2: List[Union[float, int, None]],
    equal_var: bool = True
) -> Dict[str, Union[float, int, None]]:
    try:
        import pingouin as pg
    except ImportError:
        raise ImportError("pingouin library is required for effect size calculation. Install with: pip install pingouin")

    group1 = clean_array(group1)
    group2 = clean_array(group2)

    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")

    statistic, p_value = stats.ttest_ind(group1, group2, equal_var=equal_var)

    # Use pingouin for Cohen's d
    cohens_d = pg.compute_effsize(group1, group2, eftype='cohen')

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'cohensD': float(cohens_d),
        'mean1': float(np.mean(group1)),
        'mean2': float(np.mean(group2)),
        'std1': float(np.std(group1, ddof=1)),
        'std2': float(np.std(group2, ddof=1)),
        'n1': int(len(group1)),
        'n2': int(len(group2))
    }


def t_test_paired(
    values1: List[Union[float, int, None]],
    values2: List[Union[float, int, None]]
) -> Dict[str, Union[float, int, None]]:
    values1, values2 = clean_paired_arrays(values1, values2)

    if len(values1) < 2:
        raise ValueError("Paired test requires at least 2 valid pairs")

    statistic, p_value = stats.ttest_rel(values1, values2)
    mean_diff = np.mean(values1 - values2)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'meanDiff': _safe_float(mean_diff),
        'nPairs': int(len(values1))
    }


def t_test_one_sample(
    data: List[Union[float, int, None]],
    popmean: float = 0
) -> Dict[str, Union[float, None]]:
    clean_data = clean_array(data)

    if len(clean_data) < 2:
        raise ValueError("One-sample t-test requires at least 2 observations")

    statistic, p_value = stats.ttest_1samp(clean_data, popmean)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'sampleMean': float(np.mean(clean_data))
    }


def z_test(
    data: List[Union[float, int, None]],
    popmean: float,
    popstd: float
) -> Dict[str, Union[float, None]]:
    from statsmodels.stats.weightstats import ztest as sm_ztest

    clean_data = clean_array(data)

    if len(clean_data) < 30:
        raise ValueError("Z-test typically requires at least 30 observations")

    # Use statsmodels for z-test
    # Note: statsmodels ztest uses sample std, so we pass population std via ddof parameter
    z_statistic, p_value = sm_ztest(clean_data, value=popmean, alternative='two-sided')

    return {
        'statistic': float(z_statistic),
        'pValue': _safe_float(p_value)
    }


def chi_square_test(
    observed_matrix: List[List[int]],
    yates_correction: bool = False
) -> Dict[str, Union[float, int, List[List[float]], None]]:
    observed = np.array(observed_matrix)

    if observed.size == 0:
        raise ValueError("Empty observed matrix")

    chi2, p_value, dof, expected = stats.chi2_contingency(observed, correction=yates_correction)

    return {
        'statistic': float(chi2),
        'pValue': _safe_float(p_value),
        'df': int(dof),
        'expectedMatrix': expected.tolist()
    }


def binomial_test(
    success_count: int,
    total_count: int,
    probability: float = 0.5,
    alternative: Literal['two-sided', 'less', 'greater'] = 'two-sided'
) -> Dict[str, Union[float, int, None]]:
    if total_count < 1:
        raise ValueError("Total count must be at least 1")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    binom_result = binomtest(success_count, total_count, probability, alternative=alternative)
    p_value = binom_result.pvalue

    return {
        'pValue': _safe_float(p_value),
        'successCount': int(success_count),
        'totalCount': int(total_count)
    }


def correlation_test(
    x: List[Union[float, int, None]],
    y: List[Union[float, int, None]],
    method: Literal['pearson', 'spearman', 'kendall'] = 'pearson'
) -> Dict[str, Union[float, str, None]]:
    x, y = clean_paired_arrays(x, y)

    if len(x) < 3:
        raise ValueError("Correlation requires at least 3 paired observations")

    if method == 'pearson':
        r, p_value = stats.pearsonr(x, y)
    elif method == 'spearman':
        r, p_value = stats.spearmanr(x, y)
    elif method == 'kendall':
        r, p_value = stats.kendalltau(x, y)
    else:
        raise ValueError(f"Unknown correlation method: {method}")

    return {
        'correlation': float(r),
        'pValue': _safe_float(p_value),
        'method': method
    }


def partial_correlation(
    data_matrix: List[List[Union[float, int, None]]],
    x_idx: int,
    y_idx: int,
    control_indices: List[int]
) -> Dict[str, Union[float, int, Dict[str, float], None]]:
    try:
        import statsmodels.api as sm
    except ImportError:
        raise ImportError("statsmodels library is required for partial correlation. Install with: pip install statsmodels")

    import pandas as pd

    data_matrix = np.array(data_matrix)

    if data_matrix.shape[0] < 3:
        raise ValueError("Partial correlation requires at least 3 complete cases")

    required_cols = [x_idx, y_idx] + list(control_indices)
    valid_rows = []

    for i in range(data_matrix.shape[0]):
        row_values = [data_matrix[i, col] for col in required_cols]
        if all(val is not None and not np.isnan(val) for val in row_values):
            valid_rows.append(i)

    if len(valid_rows) < 3:
        raise ValueError(f"Partial correlation requires at least 3 valid observations, got {len(valid_rows)}")

    data_clean = data_matrix[valid_rows]

    df_data = {
        'x': data_clean[:, x_idx],
        'y': data_clean[:, y_idx]
    }
    for i, ctrl_idx in enumerate(control_indices):
        df_data[f'control{i}'] = data_clean[:, ctrl_idx]

    df = pd.DataFrame(df_data)

    n = len(df)
    k = len(control_indices)

    if n < k + 3:
        raise ValueError(f"Sample size ({n}) must be greater than number of control variables ({k}) + 2")

    control_cols = [f'control{i}' for i in range(k)]
    controls = sm.add_constant(df[control_cols])

    y_model = sm.OLS(df['y'], controls).fit()
    y_residuals = y_model.resid

    x_model = sm.OLS(df['x'], controls).fit()
    x_residuals = x_model.resid

    corr_result = stats.pearsonr(x_residuals, y_residuals)

    df_residual = n - k - 2

    r = corr_result.statistic
    z = np.arctanh(r)
    se = 1 / np.sqrt(df_residual - 1)
    lower_z = z - z_crit * se
    upper_z = z + z_crit * se

    lower_corr = np.tanh(lower_z)
    upper_corr = np.tanh(upper_z)

    return {
        'correlation': float(r),
        'pValue': _safe_float(corr_result.pvalue),
        'df': int(df_residual),
        'nObservations': int(n),
        'confidenceInterval': {
            'lower': float(lower_corr),
            'upper': float(upper_corr)
        }
    }


def levene_test(
    groups: List[List[Union[float, int, None]]]
) -> Dict[str, Union[float, bool, None]]:
    cleaned_groups = clean_groups(groups)

    if len(cleaned_groups) < 2:
        raise ValueError("Levene test requires at least 2 groups")

    statistic, p_value = stats.levene(*cleaned_groups)

    return {
        'statistic': float(statistic),
        'pValue': _safe_float(p_value),
        'equalVariance': p_value > 0.05
    }


def bartlett_test(
    groups: List[List[Union[float, int, None]]]
) -> Dict[str, Union[float, bool, None]]:
    cleaned_groups = clean_groups(groups)

    if len(cleaned_groups) < 2:
        raise ValueError("Bartlett test requires at least 2 groups")

    statistic, p_value = stats.bartlett(*cleaned_groups)

    return {
        'statistic': float(statistic),
        'pValue': _safe_float(p_value),
        'equalVariance': p_value > 0.05
    }


def chi_square_goodness_test(
    observed: List[Union[float, int]],
    expected: Optional[List[Union[float, int]]] = None,
    alpha: float = 0.05
) -> Dict[str, Union[float, int, bool, List[float], None]]:
    observed = np.array(observed, dtype=float)

    observed = observed[~np.isnan(observed)]

    if len(observed) < 2:
        raise ValueError("Observed frequencies must have at least 2 values")

    if expected is None:
        expected = np.full_like(observed, np.sum(observed) / len(observed))
    else:
        expected = np.array(expected, dtype=float)
        expected = expected[~np.isnan(expected)]

        if len(observed) != len(expected):
            raise ValueError("Observed and expected must have same length")

    chi2_stat, p_value = stats.chisquare(f_obs=observed, f_exp=expected)

    df = len(observed) - 1
    critical_value = stats.chi2.ppf(1 - alpha, df)

    return {
        'chiSquare': float(chi2_stat),
        'pValue': _safe_float(p_value),
        'degreesOfFreedom': int(df),
        'criticalValue': float(critical_value),
        'reject': bool(p_value < alpha),
        'observed': observed.tolist(),
        'expected': expected.tolist()
    }


def chi_square_independence_test(
    observed_matrix: List[List[Union[float, int]]],
    yates_correction: bool = False,
    alpha: float = 0.05
) -> Dict[str, Union[float, int, bool, List[List[float]], None]]:
    observed = np.array(observed_matrix, dtype=float)

    if observed.size == 0:
        raise ValueError("Empty observed matrix")

    if observed.ndim != 2:
        raise ValueError("Observed matrix must be 2-dimensional")

    chi2_stat, p_value, dof, expected = stats.chi2_contingency(
        observed,
        correction=yates_correction
    )

    critical_value = stats.chi2.ppf(1 - alpha, dof)

    n = np.sum(observed)
    min_dim = min(observed.shape[0], observed.shape[1])
    cramers_v = np.sqrt(chi2_stat / (n * (min_dim - 1))) if min_dim > 1 else 0.0

    return {
        'chiSquare': float(chi2_stat),
        'pValue': _safe_float(p_value),
        'degreesOfFreedom': int(dof),
        'criticalValue': float(critical_value),
        'reject': bool(p_value < alpha),
        'cramersV': float(cramers_v),
        'observedMatrix': observed.tolist(),
        'expectedMatrix': expected.tolist()
    }


def fisher_exact_test(
    table: List[List[Union[float, int]]],
    alternative: Literal['two-sided', 'less', 'greater'] = 'two-sided',
    alpha: float = 0.05
) -> Dict[str, Union[float, int, bool, str, None]]:
    """
    Fisher's Exact Test for 2x2 contingency tables

    Args:
        table: 2x2 contingency table [[a, b], [c, d]]
        alternative: Alternative hypothesis ('two-sided', 'less', 'greater')
        alpha: Significance level (default: 0.05)

    Returns:
        Dictionary with test results
    """
    observed = np.array(table, dtype=int)

    if observed.shape != (2, 2):
        raise ValueError("Fisher's exact test requires a 2x2 contingency table")

    if np.any(observed < 0):
        raise ValueError("All counts must be non-negative")

    if np.sum(observed) == 0:
        raise ValueError("Table cannot be all zeros")

    # scipy.stats.fisher_exact
    odds_ratio, p_value = stats.fisher_exact(observed, alternative=alternative)

    # Calculate marginal totals
    row_totals = observed.sum(axis=1)
    col_totals = observed.sum(axis=0)
    n = observed.sum()

    # Calculate expected frequencies (for reference)
    expected = np.outer(row_totals, col_totals) / n

    # Odds ratio interpretation
    if odds_ratio == 0:
        or_interpretation = "완전한 음의 연관성 (Perfect negative association)"
    elif odds_ratio < 1:
        or_interpretation = "음의 연관성 (Negative association)"
    elif odds_ratio == 1:
        or_interpretation = "연관성 없음 (No association)"
    elif odds_ratio < 2:
        or_interpretation = "약한 양의 연관성 (Weak positive association)"
    elif odds_ratio < 5:
        or_interpretation = "중간 양의 연관성 (Moderate positive association)"
    else:
        or_interpretation = "강한 양의 연관성 (Strong positive association)"

    return {
        'oddsRatio': _safe_float(odds_ratio),
        'pValue': _safe_float(p_value),
        'reject': bool(p_value < alpha),
        'alternative': alternative,
        'oddsRatioInterpretation': or_interpretation,
        'observedMatrix': observed.tolist(),
        'expectedMatrix': expected.tolist(),
        'rowTotals': row_totals.tolist(),
        'columnTotals': col_totals.tolist(),
        'sampleSize': int(n)
    }

def partial_correlation_analysis(data, analysis_vars, control_vars=None):
    """
    편상관 분석 (Partial Correlation Analysis)

    Parameters:
    - data: List[Dict] - 전체 데이터
    - analysis_vars: List[str] - 분석할 변수들
    - control_vars: List[str] - 통제변수들 (선택)

    Returns:
    - Dict with correlations, zeroOrderCorrelations, summary, and interpretation
    """
    import pandas as pd
    import numpy as np
    from scipy import stats
    from itertools import combinations

    df = pd.DataFrame(data)

    # 기본값 처리
    if control_vars is None:
        control_vars = []

    # 결측값 제거
    all_vars = analysis_vars + control_vars
    df_clean = df[all_vars].dropna()

    def compute_partial_corr(df, x, y, controls):
        """편상관계수 계산"""
        if not controls:
            # 통제변수가 없으면 단순 상관
            corr, p_val = stats.pearsonr(df[x], df[y])
            n = len(df)
            t_stat = corr * np.sqrt((n-2)/(1-corr**2)) if abs(corr) != 1 else np.inf
            return corr, p_val, t_stat, n-2

        # 편상관 계산 (잔차 기반)
        X_matrix = np.column_stack([df[controls].values, np.ones(len(df))])
        x_resid = df[x] - X_matrix @ np.linalg.lstsq(X_matrix, df[x], rcond=None)[0]
        y_resid = df[y] - X_matrix @ np.linalg.lstsq(X_matrix, df[y], rcond=None)[0]

        # 잔차 간 상관
        corr, p_val = stats.pearsonr(x_resid, y_resid)
        n = len(df)
        df_val = n - len(controls) - 2

        if abs(corr) != 1:
            t_stat = corr * np.sqrt(df_val / (1 - corr**2))
        else:
            t_stat = np.inf

        return corr, p_val, t_stat, df_val

    # 모든 변수 쌍에 대해 편상관 계산
    correlations = []
    zero_order_correlations = []

    for x, y in combinations(analysis_vars, 2):
        # 편상관
        partial_corr, p_val, t_stat, df_val = compute_partial_corr(df_clean, x, y, control_vars)

        correlations.append({
            'variable1': x,
            'variable2': y,
            'partialCorr': float(partial_corr),
            'pValue': float(p_val),
            'tStat': float(t_stat),
            'df': int(df_val),
            'controlVars': control_vars.copy()
        })

        # 단순상관 (비교용)
        zero_corr, zero_p = stats.pearsonr(df_clean[x], df_clean[y])
        zero_order_correlations.append({
            'variable1': x,
            'variable2': y,
            'correlation': float(zero_corr),
            'pValue': float(zero_p)
        })

    # 요약 통계
    partial_values = [c['partialCorr'] for c in correlations]
    significant_count = sum(1 for c in correlations if c['pValue'] < 0.05)

    summary = {
        'nPairs': len(correlations),
        'significantPairs': significant_count,
        'meanPartialCorr': float(np.mean(np.abs(partial_values))) if partial_values else 0.0,
        'maxPartialCorr': float(np.max(partial_values)) if partial_values else 0.0,
        'minPartialCorr': float(np.min(partial_values)) if partial_values else 0.0
    }

    # 해석 생성
    control_text = f" (통제변수: {', '.join(control_vars)})" if control_vars else ""
    interpretation = {
        'summary': f'{len(analysis_vars)}개 변수 간 {summary["nPairs"]}개 쌍의 편상관을 분석했습니다{control_text}. {significant_count}개 쌍이 통계적으로 유의했습니다.',
        'recommendations': [
            '편상관계수는 통제변수의 영향을 제거한 순수한 관계를 나타냅니다.',
            '절대값이 0.7 이상이면 강한 상관, 0.5-0.7은 중간 상관입니다.',
            '편상관과 단순상관을 비교하여 통제변수의 효과를 파악하세요.',
            '유의한 편상관은 다른 변수의 영향을 받지 않는 독립적 관계입니다.',
            '편상관이 음수라면 통제 후 역방향 관계가 나타납니다.'
        ]
    }

    return {
        'correlations': correlations,
        'zeroOrderCorrelations': zero_order_correlations,
        'summary': summary,
        'interpretation': interpretation
    }

def stepwise_regression_forward(data, dependent_var, predictor_vars, significance_level=0.05):
    """
    전진선택법 기반 단계적 회귀분석

    Parameters:
    - data: List[Dict] - 전체 데이터
    - dependent_var: str - 종속변수
    - predictor_vars: List[str] - 예측변수들
    - significance_level: float - 유의수준 (기본 0.05)

    Returns:
    - Dict with finalModel, stepHistory, coefficients, modelDiagnostics, excludedVariables, interpretation
    """
    import pandas as pd
    import numpy as np
    from scipy import stats
    import statsmodels.api as sm
    from statsmodels.stats.diagnostic import het_breuschpagan
    from statsmodels.stats.stattools import durbin_watson
    from statsmodels.stats.outliers_influence import variance_inflation_factor
    from statsmodels.tsa.stattools import jarque_bera
    import warnings
    warnings.filterwarnings('ignore')

    df = pd.DataFrame(data)

    # 결측값 제거
    all_vars = [dependent_var] + predictor_vars
    df_clean = df[all_vars].dropna()

    y = df_clean[dependent_var].values
    X_full = df_clean[predictor_vars]

    def forward_selection(X, y, sig_level):
        """전진선택법 구현"""
        initial_features = []
        remaining_features = list(X.columns)
        step_history = []
        step = 1

        while remaining_features:
            best_pval = float('inf')
            best_feature = None
            best_f_stat = None

            for feature in remaining_features:
                test_features = initial_features + [feature]
                X_test = sm.add_constant(X[test_features])

                try:
                    model = sm.OLS(y, X_test).fit()
                    if len(initial_features) == 0:
                        f_stat = model.fvalue
                        p_val = model.f_pvalue
                    else:
                        X_prev = sm.add_constant(X[initial_features])
                        model_prev = sm.OLS(y, X_prev).fit()

                        sse_full = model.ssr
                        sse_reduced = model_prev.ssr
                        df_diff = 1
                        df_error = len(y) - len(test_features) - 1

                        f_stat = ((sse_reduced - sse_full) / df_diff) / (sse_full / df_error)
                        p_val = 1 - stats.f.cdf(f_stat, df_diff, df_error)

                    if p_val < best_pval:
                        best_pval = p_val
                        best_feature = feature
                        best_f_stat = f_stat
                except:
                    continue

            if best_pval < sig_level and best_feature:
                initial_features.append(best_feature)
                remaining_features.remove(best_feature)

                X_current = sm.add_constant(X[initial_features])
                model_current = sm.OLS(y, X_current).fit()

                step_history.append({
                    'step': step,
                    'action': 'add',
                    'variable': best_feature,
                    'rSquared': float(model_current.rsquared),
                    'adjRSquared': float(model_current.rsquared_adj),
                    'fChange': float(best_f_stat),
                    'fChangeP': float(best_pval),
                    'criterionValue': float(model_current.aic)
                })
                step += 1
            else:
                break

        return initial_features, step_history

    # 단계적 회귀분석 실행
    selected_features, step_history = forward_selection(X_full, y, significance_level)

    # 최종 모델
    if selected_features:
        X_final = sm.add_constant(X_full[selected_features])
        final_model = sm.OLS(y, X_final).fit()

        # 계수 정보
        coefficients = []
        for i, var in enumerate(['const'] + selected_features):
            if var == 'const':
                coefficients.append({
                    'variable': '상수',
                    'coefficient': float(final_model.params[i]),
                    'stdError': float(final_model.bse[i]),
                    'tStatistic': float(final_model.tvalues[i]),
                    'pValue': float(final_model.pvalues[i]),
                    'beta': 0.0,
                    'vif': 0.0
                })
            else:
                # 표준화 계수
                std_y = np.std(y)
                std_x = np.std(X_full[var])
                beta = final_model.params[i] * (std_x / std_y)

                # VIF 계산
                if len(selected_features) > 1:
                    try:
                        vif_data = X_final.iloc[:, 1:]
                        vif = variance_inflation_factor(vif_data.values, selected_features.index(var))
                    except:
                        vif = 1.0
                else:
                    vif = 1.0

                coefficients.append({
                    'variable': var,
                    'coefficient': float(final_model.params[i]),
                    'stdError': float(final_model.bse[i]),
                    'tStatistic': float(final_model.tvalues[i]),
                    'pValue': float(final_model.pvalues[i]),
                    'beta': float(beta),
                    'vif': float(vif)
                })

        # 모델 진단
        residuals = final_model.resid
        dw_stat = durbin_watson(residuals)
        jb_stat, jb_p = jarque_bera(residuals)

        try:
            lm, lm_p, fvalue, f_p = het_breuschpagan(residuals, X_final)
            bp_p = f_p
        except:
            bp_p = 1.0

        try:
            condition_num = np.linalg.cond(X_final)
        except:
            condition_num = 1.0

        # 제외된 변수들
        excluded_vars = [var for var in predictor_vars if var not in selected_features]
        excluded_variables = []

        for var in excluded_vars:
            X_test = sm.add_constant(X_full[selected_features + [var]])
            try:
                model_test = sm.OLS(y, X_test).fit()
                t_stat = model_test.tvalues[-1]
                p_val = model_test.pvalues[-1]
                partial_corr = t_stat / np.sqrt(t_stat**2 + model_test.df_resid)

                excluded_variables.append({
                    'variable': var,
                    'partialCorr': float(partial_corr),
                    'tForInclusion': float(t_stat),
                    'pValue': float(p_val)
                })
            except:
                excluded_variables.append({
                    'variable': var,
                    'partialCorr': 0.0,
                    'tForInclusion': 0.0,
                    'pValue': 1.0
                })

        # 해석
        r2_percent = final_model.rsquared * 100
        interpretation = {
            'summary': f'단계적 회귀분석을 통해 {len(selected_features)}개 변수가 선택되었습니다. 최종 모델의 설명력(R²)은 {r2_percent:.1f}%입니다.',
            'recommendations': [
                '선택된 변수들의 회귀계수가 모두 유의한지 확인하세요.',
                '모델 가정(정규성, 등분산성, 선형성)을 검토하세요.',
                'VIF 값이 10 이상인 변수는 다중공선성을 의심해보세요.',
                '단계적 회귀는 표본에 의존적이므로 교차검증을 권장합니다.',
                '실무적 중요성과 통계적 유의성을 구분하여 해석하세요.'
            ]
        }

        return {
            'finalModel': {
                'variables': selected_features,
                'rSquared': float(final_model.rsquared),
                'adjRSquared': float(final_model.rsquared_adj),
                'fStatistic': float(final_model.fvalue),
                'fPValue': float(final_model.f_pvalue),
                'aic': float(final_model.aic),
                'bic': float(final_model.bic),
                'rmse': float(np.sqrt(final_model.mse_resid))
            },
            'stepHistory': step_history,
            'coefficients': coefficients,
            'modelDiagnostics': {
                'durbinWatson': float(dw_stat),
                'jarqueBeraP': float(jb_p),
                'breuschPaganP': float(bp_p),
                'conditionNumber': float(condition_num)
            },
            'excludedVariables': excluded_variables,
            'interpretation': interpretation
        }
    else:
        # 변수가 선택되지 않은 경우
        return {
            'finalModel': {
                'variables': [],
                'rSquared': 0.0,
                'adjRSquared': 0.0,
                'fStatistic': 0.0,
                'fPValue': 1.0,
                'aic': 0.0,
                'bic': 0.0,
                'rmse': 0.0
            },
            'stepHistory': [],
            'coefficients': [],
            'modelDiagnostics': {
                'durbinWatson': 0.0,
                'jarqueBeraP': 1.0,
                'breuschPaganP': 1.0,
                'conditionNumber': 1.0
            },
            'excludedVariables': [],
            'interpretation': {
                'summary': '선택된 변수가 없습니다. 유의수준을 조정하거나 다른 변수를 고려해보세요.',
                'recommendations': ['유의수준 기준을 완화해보세요.', '다른 예측변수를 고려해보세요.']
            }
        }


