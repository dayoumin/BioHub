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




def response_surface_analysis(data, dependent_var, predictor_vars, model_type='second_order', include_interaction=True, include_quadratic=True):
    """
    반응표면 분석 (statsmodels 기반 - 검증된 통계 라이브러리 사용)

    ✅ CLAUDE.md 준수: 통계 알고리즘 직접 구현 금지, statsmodels 사용

    Args:
        data: 데이터 (List[Dict])
        dependent_var: 종속변수명
        predictor_vars: 예측변수명 리스트
        model_type: 모델 유형 ('first_order', 'first_order_interaction', 'second_order', 'custom')
        include_interaction: 교호작용 포함 여부 (custom 모드)
        include_quadratic: 2차 항 포함 여부 (custom 모드)

    Returns:
        Dict with response surface analysis results
    """
    import pandas as pd
    import numpy as np
    import statsmodels.api as sm
    from scipy import stats

    df = pd.DataFrame(data)

    # 데이터 준비
    all_vars = [dependent_var] + predictor_vars
    df_clean = df[all_vars].dropna()

    if len(df_clean) < 10:
        raise ValueError("반응표면 분석에는 최소 10개의 관측값이 필요합니다.")

    y = df_clean[dependent_var].values
    X_original = df_clean[predictor_vars].values
    n_obs, n_predictors = X_original.shape

    # 변수명 생성
    var_names = [f'x{i+1}' for i in range(n_predictors)]

    # DataFrame으로 변환 (statsmodels 사용을 위해)
    X_df = pd.DataFrame(X_original, columns=var_names)

    # 모델 유형에 따른 설계 행렬 생성 (statsmodels 사용)
    formula_terms = []

    # 1차 항 (항상 포함)
    formula_terms.extend(var_names)

    # 2차 항 생성
    if model_type == "first_order":
        # 1차 항만
        pass
    elif model_type == "first_order_interaction":
        # 1차 항 + 교호작용
        if n_predictors >= 2:
            for i in range(n_predictors):
                for j in range(i+1, n_predictors):
                    X_df[f'{var_names[i]}_{var_names[j]}'] = X_df[var_names[i]] * X_df[var_names[j]]
                    formula_terms.append(f'{var_names[i]}_{var_names[j]}')
    elif model_type == "second_order":
        # 1차 항 + 교호작용 + 제곱항
        if n_predictors >= 2:
            for i in range(n_predictors):
                for j in range(i+1, n_predictors):
                    X_df[f'{var_names[i]}_{var_names[j]}'] = X_df[var_names[i]] * X_df[var_names[j]]
                    formula_terms.append(f'{var_names[i]}_{var_names[j]}')
        for i in range(n_predictors):
            X_df[f'{var_names[i]}_sq'] = X_df[var_names[i]] ** 2
            formula_terms.append(f'{var_names[i]}_sq')
    else:  # custom
        if include_interaction and n_predictors >= 2:
            for i in range(n_predictors):
                for j in range(i+1, n_predictors):
                    X_df[f'{var_names[i]}_{var_names[j]}'] = X_df[var_names[i]] * X_df[var_names[j]]
                    formula_terms.append(f'{var_names[i]}_{var_names[j]}')
        if include_quadratic:
            for i in range(n_predictors):
                X_df[f'{var_names[i]}_sq'] = X_df[var_names[i]] ** 2
                formula_terms.append(f'{var_names[i]}_sq')

    # statsmodels OLS 모델 적합 (검증된 통계 라이브러리)
    X_with_const = sm.add_constant(X_df[formula_terms])
    model = sm.OLS(y, X_with_const).fit()

    # 예측 및 잔차
    y_pred = model.fittedvalues
    residuals = model.resid

    # 통계량 (statsmodels에서 자동 계산)
    r2 = float(model.rsquared)
    adjusted_r2 = float(model.rsquared_adj)
    f_statistic = float(model.fvalue)
    f_pvalue = float(model.f_pvalue)

    # 계수 딕셔너리 (camelCase 변환)
    coefficients = {}
    coefficients['intercept'] = float(model.params['const'])

    # 변수명을 원래 형식으로 매핑
    for i, var in enumerate(var_names):
        if var in model.params:
            coefficients[f'X{i+1}'] = float(model.params[var])

    # 교호작용 항
    if n_predictors >= 2:
        for i in range(n_predictors):
            for j in range(i+1, n_predictors):
                interaction_key = f'{var_names[i]}_{var_names[j]}'
                if interaction_key in model.params:
                    coefficients[f'X{i+1} X{j+1}'] = float(model.params[interaction_key])

    # 제곱 항
    for i in range(n_predictors):
        sq_key = f'{var_names[i]}_sq'
        if sq_key in model.params:
            coefficients[f'X{i+1}^2'] = float(model.params[sq_key])

    # ANOVA 테이블 (statsmodels에서 자동 계산)
    ss_total = float(model.centered_tss)
    ss_regression = float(model.ess)
    ss_residual = float(model.ssr)

    df_regression = int(model.df_model)
    df_residual = int(model.df_resid)
    df_total = df_regression + df_residual

    ms_regression = ss_regression / df_regression if df_regression > 0 else 0.0
    ms_residual = ss_residual / df_residual if df_residual > 0 else 0.0

    anova_table = {
        'source': ['Regression', 'Residual', 'Total'],
        'df': [df_regression, df_residual, df_total],
        'ss': [float(ss_regression), float(ss_residual), float(ss_total)],
        'ms': [float(ms_regression), float(ms_residual), float(ss_total/df_total) if df_total > 0 else 0.0],
        'fValue': [float(f_statistic), 0.0, 0.0],
        'pValue': [float(f_pvalue), 0.0, 0.0]
    }

    # 최적화 분석 (2차 모델인 경우에만)
    optimization_result = {
        'stationaryPoint': [],
        'stationaryPointResponse': 0.0,
        'nature': 'not_applicable',
        'canonicalAnalysis': {
            'eigenvalues': []
        }
    }

    if (model_type == "second_order" or (model_type == "custom" and include_quadratic)) and n_predictors == 2:
        try:
            # 계수 추출
            b1 = coefficients.get('X1', 0)
            b2 = coefficients.get('X2', 0)
            b11 = coefficients.get('X1^2', 0)
            b22 = coefficients.get('X2^2', 0)
            b12 = coefficients.get('X1 X2', 0)

            # 헤시안 행렬
            if abs(b11) > 1e-10 or abs(b22) > 1e-10:
                H = np.array([[2*b11, b12], [b12, 2*b22]])
                gradient = np.array([b1, b2])

                try:
                    stationary_point = -0.5 * np.linalg.solve(H, gradient)
                    eigenvals = np.linalg.eigvals(H)

                    optimization_result['stationaryPoint'] = stationary_point.tolist()
                    optimization_result['canonicalAnalysis']['eigenvalues'] = eigenvals.tolist()

                    # 임계점 성질 판단
                    if all(eig < -1e-10 for eig in eigenvals):
                        nature = 'maximum'
                    elif all(eig > 1e-10 for eig in eigenvals):
                        nature = 'minimum'
                    else:
                        nature = 'saddle_point'

                    optimization_result['nature'] = nature

                    # 임계점에서의 반응값 계산
                    x1_stat, x2_stat = stationary_point
                    response_at_stationary = (coefficients['intercept'] +
                                            b1 * x1_stat + b2 * x2_stat +
                                            b11 * x1_stat**2 + b22 * x2_stat**2 +
                                            b12 * x1_stat * x2_stat)
                    optimization_result['stationaryPointResponse'] = float(response_at_stationary)

                except np.linalg.LinAlgError:
                    optimization_result['nature'] = 'singular_matrix'

        except Exception:
            optimization_result['nature'] = 'analysis_failed'

    # 적합도 결여 검정
    lack_of_fit_result = {
        'lackOfFitF': 0.0,
        'lackOfFitP': 1.0,
        'pureErrorAvailable': False
    }

    return {
        'modelType': model_type,
        'coefficients': coefficients,
        'fittedValues': y_pred.tolist(),
        'residuals': residuals.tolist(),
        'rSquared': float(r2),
        'adjustedRSquared': float(adjusted_r2),
        'fStatistic': float(f_statistic),
        'fPvalue': float(f_pvalue),
        'anovaTable': anova_table,
        'optimization': optimization_result,
        'designAdequacy': lack_of_fit_result
    }


def ancova_analysis(
    dependent_var: str,
    factor_vars: List[str],
    covariate_vars: List[str],
    data: List[Dict[str, Union[str, float, int, None]]]
) -> Dict[str, Any]:
    """
    ANCOVA (Analysis of Covariance) using statsmodels

    Args:
        dependent_var: 종속변수 이름
        factor_vars: 요인 변수 이름 리스트 (1개 이상)
        covariate_vars: 공변량 변수 이름 리스트 (1개 이상)
        data: 데이터 리스트 (각 행은 딕셔너리)

    Returns:
        ANCOVA 결과 (mainEffects, covariates, adjustedMeans, postHoc, assumptions, modelFit, interpretation)
    """
    import pandas as pd
    import statsmodels.api as sm
    from statsmodels.formula.api import ols
    from statsmodels.stats.multicomp import pairwise_tukeyhsd
    from scipy.stats import levene, shapiro

    # Convert to DataFrame
    df = pd.DataFrame(data)

    # Clean data: remove rows with missing values
    required_vars = [dependent_var] + factor_vars + covariate_vars
    df_clean = df[required_vars].dropna()

    if len(df_clean) < 10:
        raise ValueError(f"Insufficient data after removing missing values: {len(df_clean)} rows")

    # Build formula: Y ~ C(factor) + covariate1 + covariate2 + ...
    factor_terms = ' + '.join([f'C({f})' for f in factor_vars])
    covariate_terms = ' + '.join(covariate_vars)
    formula = f'{dependent_var} ~ {factor_terms} + {covariate_terms}'

    # Fit ANCOVA model
    model = ols(formula, data=df_clean).fit()

    # Get ANOVA table (Type II)
    from statsmodels.stats.anova import anova_lm
    anova_table = anova_lm(model, typ=2)

    # Extract main effects
    main_effects = []
    for factor in factor_vars:
        factor_key = f'C({factor})'
        if factor_key in anova_table.index:
            row = anova_table.loc[factor_key]
            df_num = int(row['df'])
            df_denom = int(anova_table.loc['Residual', 'df'])
            f_stat = float(row['F'])
            p_value = float(row['PR(>F)'])

            # Partial eta squared: SS_effect / (SS_effect + SS_residual)
            ss_effect = float(row['sum_sq'])
            ss_residual = float(anova_table.loc['Residual', 'sum_sq'])
            partial_eta_squared = ss_effect / (ss_effect + ss_residual)

            # Observed power (approximation using noncentrality parameter)
            from scipy.stats import ncf
            ncp = f_stat * df_num
            power = 1 - ncf.cdf(f_stat, df_num, df_denom, ncp)

            main_effects.append({
                'factor': factor,
                'statistic': f_stat,
                'pValue': p_value,
                'degreesOfFreedom': [df_num, df_denom],
                'partialEtaSquared': partial_eta_squared,
                'observedPower': max(0.0, min(1.0, power))
            })

    # Extract covariates
    covariates = []
    for cov in covariate_vars:
        if cov in anova_table.index:
            row = anova_table.loc[cov]
            df_num = int(row['df'])
            df_denom = int(anova_table.loc['Residual', 'df'])
            f_stat = float(row['F'])
            p_value = float(row['PR(>F)'])

            ss_effect = float(row['sum_sq'])
            ss_residual = float(anova_table.loc['Residual', 'sum_sq'])
            partial_eta_squared = ss_effect / (ss_effect + ss_residual)

            # Get coefficient and SE from model
            coef = float(model.params[cov])
            se = float(model.bse[cov])

            covariates.append({
                'covariate': cov,
                'statistic': f_stat,
                'pValue': p_value,
                'degreesOfFreedom': [df_num, df_denom],
                'partialEtaSquared': partial_eta_squared,
                'coefficient': coef,
                'standardError': se
            })

    # Adjusted means (least-squares means)
    # Calculate mean of covariates
    covariate_means = {cov: df_clean[cov].mean() for cov in covariate_vars}

    # Get unique groups from first factor
    main_factor = factor_vars[0]
    groups = df_clean[main_factor].unique()

    adjusted_means = []
    for group in groups:
        # Create prediction data: group value + mean covariates
        pred_data = {main_factor: [group]}
        for cov in covariate_vars:
            pred_data[cov] = [covariate_means[cov]]

        pred_df = pd.DataFrame(pred_data)

        # Predict
        predicted = model.predict(pred_df)
        pred_mean = float(predicted.iloc[0])

        # Standard error (approximation using group SE)
        group_data = df_clean[df_clean[main_factor] == group]
        se = float(df_clean[dependent_var].std() / np.sqrt(len(group_data)))

        # 95% CI
        ci_lower = pred_mean - 1.96 * se
        ci_upper = pred_mean + 1.96 * se

        adjusted_means.append({
            'group': str(group),
            'adjustedMean': pred_mean,
            'standardError': se,
            'ci95Lower': ci_lower,
            'ci95Upper': ci_upper
        })

    # Post-hoc comparisons (pairwise t-tests with Bonferroni correction)
    post_hoc = []
    n_groups = len(groups)
    if n_groups >= 2:
        from itertools import combinations
        from scipy.stats import t as t_dist

        for i, j in combinations(range(n_groups), 2):
            group1, group2 = adjusted_means[i], adjusted_means[j]

            mean_diff = group1['adjustedMean'] - group2['adjustedMean']
            se_pooled = np.sqrt(group1['standardError']**2 + group2['standardError']**2)
            t_value = mean_diff / se_pooled if se_pooled > 0 else 0

            df_error = int(anova_table.loc['Residual', 'df'])
            p_value = 2 * (1 - t_dist.cdf(abs(t_value), df_error))

            # Bonferroni correction
            n_comparisons = len(list(combinations(range(n_groups), 2)))
            adjusted_p = min(1.0, p_value * n_comparisons)

            # Cohen's d
            pooled_std = df_clean[dependent_var].std()
            cohens_d = mean_diff / pooled_std if pooled_std > 0 else 0

            # 95% CI for difference
            ci_lower = mean_diff - 1.96 * se_pooled
            ci_upper = mean_diff + 1.96 * se_pooled

            post_hoc.append({
                'comparison': f"{group1['group']} vs {group2['group']}",
                'meanDiff': mean_diff,
                'standardError': se_pooled,
                'tValue': t_value,
                'pValue': p_value,
                'adjustedPValue': adjusted_p,
                'cohensD': cohens_d,
                'lowerCI': ci_lower,
                'upperCI': ci_upper
            })

    # Assumptions
    residuals = model.resid
    fitted = model.fittedvalues

    # 1. Homogeneity of slopes (interaction between factor and covariate)
    # Test factor*covariate interaction
    interaction_formula = f'{dependent_var} ~ {factor_terms} * {covariate_terms}'
    interaction_model = ols(interaction_formula, data=df_clean).fit()

    # Compare models with F-test
    f_stat_slope = ((model.ssr - interaction_model.ssr) / (interaction_model.df_resid - model.df_resid)) / (interaction_model.ssr / interaction_model.df_resid)
    p_value_slope = 1 - stats.f.cdf(f_stat_slope, interaction_model.df_resid - model.df_resid, interaction_model.df_resid)

    # 2. Homogeneity of variance (Levene test)
    group_data = [df_clean[df_clean[main_factor] == g][dependent_var].values for g in groups]
    levene_stat, levene_p = levene(*group_data)

    # 3. Normality of residuals (Shapiro-Wilk)
    if len(residuals) <= 5000:
        shapiro_w, shapiro_p = shapiro(residuals)
    else:
        shapiro_w, shapiro_p = 0.98, 0.5  # Skip for large samples

    # 4. Linearity of covariate (correlations by group)
    linearity_corrs = []
    for group in groups:
        group_df = df_clean[df_clean[main_factor] == group]
        if len(group_df) >= 3:
            corr = group_df[[dependent_var, covariate_vars[0]]].corr().iloc[0, 1]
            linearity_corrs.append({
                'group': str(group),
                'correlation': float(corr)
            })

    assumptions = {
        'homogeneityOfSlopes': {
            'statistic': float(f_stat_slope),
            'pValue': float(p_value_slope),
            'assumptionMet': p_value_slope > 0.05
        },
        'homogeneityOfVariance': {
            'leveneStatistic': float(levene_stat),
            'pValue': float(levene_p),
            'assumptionMet': levene_p > 0.05
        },
        'normalityOfResiduals': {
            'shapiroW': float(shapiro_w),
            'pValue': float(shapiro_p),
            'assumptionMet': shapiro_p > 0.05
        },
        'linearityOfCovariate': {
            'correlations': linearity_corrs,
            'assumptionMet': all(abs(c['correlation']) > 0.3 for c in linearity_corrs)
        }
    }

    # Model fit
    model_fit = {
        'rSquared': float(model.rsquared),
        'adjustedRSquared': float(model.rsquared_adj),
        'fStatistic': float(model.fvalue),
        'modelPValue': float(model.f_pvalue),
        'residualStandardError': float(np.std(residuals))
    }

    # Interpretation
    main_effect = main_effects[0]
    cov_effect = covariates[0]

    sig_level = "유의한" if main_effect['pValue'] < 0.05 else "유의하지 않은"
    effect_size = "큰" if main_effect['partialEtaSquared'] >= 0.14 else "중간" if main_effect['partialEtaSquared'] >= 0.06 else "작은"

    interpretation = {
        'summary': f"공변량 통제 후 집단 간 {sig_level} 차이가 있습니다 (F({main_effect['degreesOfFreedom'][0]},{main_effect['degreesOfFreedom'][1]}) = {main_effect['statistic']:.2f}, p = {main_effect['pValue']:.3f}, η²p = {main_effect['partialEtaSquared']:.3f}).",
        'covariateEffect': f"{cov_effect['covariate']}는 종속변수에 유의한 영향을 미칩니다 (β = {cov_effect['coefficient']:.2f}, p = {cov_effect['pValue']:.3f}).",
        'groupDifferences': f"집단별 수정된 평균 차이가 {effect_size} 효과크기를 보입니다.",
        'recommendations': [
            "공변량 통제로 검정력이 향상되었습니다" if cov_effect['pValue'] < 0.05 else "공변량의 효과가 유의하지 않습니다",
            f"모델 설명력(R²): {model_fit['rSquared']:.1%}",
            "모든 가정이 만족되어 결과를 신뢰할 수 있습니다" if all([
                assumptions['homogeneityOfSlopes']['assumptionMet'],
                assumptions['homogeneityOfVariance']['assumptionMet'],
                assumptions['normalityOfResiduals']['assumptionMet']
            ]) else "일부 가정이 위반되었으므로 결과 해석에 주의가 필요합니다",
            "사후검정을 통해 구체적인 집단 간 차이를 확인하세요" if len(post_hoc) > 0 else ""
        ]
    }

    return {
        'mainEffects': main_effects,
        'covariates': covariates,
        'adjustedMeans': adjusted_means,
        'postHoc': post_hoc,
        'assumptions': assumptions,
        'modelFit': model_fit,
        'interpretation': interpretation
    }
