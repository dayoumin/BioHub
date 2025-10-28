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

