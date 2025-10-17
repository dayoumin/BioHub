
import numpy as np
from scipy import stats
from scipy.stats import binomtest
import math


def _safe_float(value):
    if value is None:
        return None
    if math.isnan(value) or math.isinf(value):
        return None
    return float(value)


def t_test_two_sample(group1, group2, equal_var=True):
    group1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
    group2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])

    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")

    statistic, p_value = stats.ttest_ind(group1, group2, equal_var=equal_var)

    pooled_std = np.sqrt(((len(group1) - 1) * np.var(group1, ddof=1) +
                          (len(group2) - 1) * np.var(group2, ddof=1)) /
                         (len(group1) + len(group2) - 2))
    cohens_d = (np.mean(group1) - np.mean(group2)) / pooled_std

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


def t_test_paired(values1, values2):
    pairs = [(v1, v2) for v1, v2 in zip(values1, values2) 
             if v1 is not None and v2 is not None 
             and not np.isnan(v1) and not np.isnan(v2)]

    if len(pairs) < 2:
        raise ValueError("Paired test requires at least 2 valid pairs")

    values1 = np.array([p[0] for p in pairs])
    values2 = np.array([p[1] for p in pairs])

    statistic, p_value = stats.ttest_rel(values1, values2)
    mean_diff = np.mean(values1 - values2)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'meanDiff': _safe_float(mean_diff),
        'nPairs': int(len(pairs))
    }


def t_test_one_sample(data, popmean=0):
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 2:
        raise ValueError("One-sample t-test requires at least 2 observations")

    statistic, p_value = stats.ttest_1samp(clean_data, popmean)

    return {
        'statistic': _safe_float(statistic),
        'pValue': _safe_float(p_value),
        'sampleMean': float(np.mean(clean_data))
    }


def z_test(data, popmean, popstd):
    clean_data = np.array([x for x in data if x is not None and not np.isnan(x)])

    if len(clean_data) < 30:
        raise ValueError("Z-test typically requires at least 30 observations")

    sample_mean = np.mean(clean_data)
    n = len(clean_data)

    z_statistic = (sample_mean - popmean) / (popstd / np.sqrt(n))
    p_value = 2 * (1 - stats.norm.cdf(abs(z_statistic)))

    return {
        'statistic': float(z_statistic),
        'pValue': _safe_float(p_value)
    }


def chi_square_test(observed_matrix, yates_correction=False):
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


def binomial_test(success_count, total_count, probability=0.5, alternative='two-sided'):
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


def correlation_test(x, y, method='pearson'):
    x = np.array([val for val in x if val is not None and not np.isnan(val)])
    y = np.array([val for val in y if val is not None and not np.isnan(val)])

    if len(x) != len(y):
        raise ValueError("x and y must have the same length")

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


def partial_correlation(data_matrix, x_idx, y_idx, control_indices):
    data_matrix = np.array(data_matrix)

    if data_matrix.shape[0] < 3:
        raise ValueError("Partial correlation requires at least 3 complete cases")

    x = data_matrix[:, x_idx]
    y = data_matrix[:, y_idx]
    controls = data_matrix[:, control_indices]

    try:
        x_resid = x - controls @ np.linalg.lstsq(controls, x, rcond=None)[0]
        y_resid = y - controls @ np.linalg.lstsq(controls, y, rcond=None)[0]

        r, p_value = stats.pearsonr(x_resid, y_resid)

        return {
            'correlation': float(r),
            'pValue': _safe_float(p_value)
        }
    except np.linalg.LinAlgError as e:
        raise ValueError(f"Singular matrix in partial correlation: {e}")
