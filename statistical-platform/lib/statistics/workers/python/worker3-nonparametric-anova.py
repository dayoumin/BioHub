
import numpy as np
from scipy import stats



def mann_whitney_test(group1, group2):
    group1 = np.array([x for x in group1 if x is not None and not np.isnan(x)])
    group2 = np.array([x for x in group2 if x is not None and not np.isnan(x)])
    
    if len(group1) < 2 or len(group2) < 2:
        raise ValueError("Each group must have at least 2 observations")
    
    statistic, p_value = stats.mannwhitneyu(group1, group2, alternative='two-sided')
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }


def wilcoxon_test(values1, values2):
    pairs = [(v1, v2) for v1, v2 in zip(values1, values2) 
             if v1 is not None and v2 is not None 
             and not np.isnan(v1) and not np.isnan(v2)]
    
    if len(pairs) < 2:
        raise ValueError("Wilcoxon test requires at least 2 valid pairs")
    
    values1 = np.array([p[0] for p in pairs])
    values2 = np.array([p[1] for p in pairs])
    
    statistic, p_value = stats.wilcoxon(values1, values2)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'nPairs': int(len(pairs))
    }


def kruskal_wallis_test(groups):
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")
    
    statistic, p_value = stats.kruskal(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'df': int(len(clean_groups) - 1)
    }


def friedman_test(groups):
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    lengths = [len(g) for g in clean_groups]
    if len(set(lengths)) > 1:
        raise ValueError(f"Friedman test requires equal group sizes, got: {lengths}")
    
    statistic, p_value = stats.friedmanchisquare(*clean_groups)
    
    return {
        'statistic': float(statistic),
        'pValue': float(p_value)
    }



def one_way_anova(groups):
    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]
    
    for i, group in enumerate(clean_groups):
        if len(group) < 2:
            raise ValueError(f"Group {i} must have at least 2 observations")
    
    f_statistic, p_value = stats.f_oneway(*clean_groups)
    
    return {
        'fStatistic': float(f_statistic),
        'pValue': float(p_value),
        'df1': int(len(clean_groups) - 1),
        'df2': int(sum(len(g) for g in clean_groups) - len(clean_groups))
    }


def two_way_anova(data_matrix, factor1_levels, factor2_levels):
    data_matrix = np.array(data_matrix)
    
    if data_matrix.size == 0:
        raise ValueError("Empty data matrix")
    
    grand_mean = np.mean(data_matrix)
    ss_total = np.sum((data_matrix - grand_mean) ** 2)
    
    return {
        'ssTotal': float(ss_total),
        'grandMean': float(grand_mean),
        'warning': 'Use statsmodels for complete two-way ANOVA implementation'
    }


def tukey_hsd(groups):
    from scipy.stats import tukey_hsd as scipy_tukey

    clean_groups = [np.array([x for x in group if x is not None and not np.isnan(x)]) for group in groups]

    for i, group in enumerate(clean_groups):
        if len(group) == 0:
            raise ValueError(f"Group {i} has no valid observations")

    try:
        result = scipy_tukey(*clean_groups)

        if hasattr(result, 'pvalue'):
            p_value = float(result.pvalue)
        else:
            p_value = None

        return {
            'statistic': float(result.statistic),
            'pValue': p_value,
            'confidenceInterval': result.confidence_interval().tolist() if hasattr(result, 'confidence_interval') else None
        }
    except AttributeError as e:
        raise ValueError(f"SciPy version may not support tukey_hsd: {e}")


# Priority 1 Methods (5 additional)

def sign_test(before, after):
    from scipy.stats import binomtest

    before = np.array(before)
    after = np.array(after)

    if len(before) != len(after):
        raise ValueError("Before and after must have same length")

    diff = after - before

    n_positive = np.sum(diff > 0)
    n_negative = np.sum(diff < 0)
    n_ties = np.sum(diff == 0)
    n_total = n_positive + n_negative

    if n_total == 0:
        raise ValueError("All differences are zero (ties)")

    result = binomtest(n_positive, n_total, 0.5)

    return {
        'nPositive': int(n_positive),
        'nNegative': int(n_negative),
        'nTies': int(n_ties),
        'pValue': float(result.pvalue)
    }


def runs_test(sequence):
    sequence = np.array([x for x in sequence if x is not None and not np.isnan(x)])

    if len(sequence) < 10:
        raise ValueError("Runs test requires at least 10 observations")

    median = np.median(sequence)
    binary = (sequence > median).astype(int)

    runs = 1 + np.sum(binary[1:] != binary[:-1])

    n1 = np.sum(binary == 0)
    n2 = np.sum(binary == 1)
    n = n1 + n2

    if n1 == 0 or n2 == 0:
        raise ValueError("All values are on one side of median")

    expected_runs = (2 * n1 * n2) / n + 1
    var_runs = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1))

    z_statistic = (runs - expected_runs) / np.sqrt(var_runs)

    p_value = 2 * (1 - stats.norm.cdf(abs(z_statistic)))

    return {
        'nRuns': int(runs),
        'expectedRuns': float(expected_runs),
        'n1': int(n1),
        'n2': int(n2),
        'zStatistic': float(z_statistic),
        'pValue': float(p_value)
    }


def mcnemar_test(contingency_table):
    table = np.array(contingency_table)

    if table.shape != (2, 2):
        raise ValueError("McNemar test requires 2x2 contingency table")

    b = table[0, 1]
    c = table[1, 0]

    use_correction = (b + c) < 25

    if use_correction:
        statistic = (abs(b - c) - 1)**2 / (b + c) if (b + c) > 0 else 0
    else:
        statistic = (b - c)**2 / (b + c) if (b + c) > 0 else 0

    p_value = 1 - stats.chi2.cdf(statistic, df=1)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'continuityCorrection': bool(use_correction),
        'discordantPairs': {'b': int(b), 'c': int(c)}
    }


def cochran_q_test(data_matrix):
    data_matrix = np.array(data_matrix)
    n, k = data_matrix.shape  # n subjects, k conditions

    if k < 3:
        raise ValueError("Cochran Q requires at least 3 conditions")

    row_sums = data_matrix.sum(axis=1)
    col_sums = data_matrix.sum(axis=0)

    G = col_sums.sum()
    denominator = k * G - np.sum(row_sums**2)

    if denominator == 0:
        raise ValueError("Invalid data: denominator is zero in Cochran Q calculation")

    Q = (k - 1) * (k * np.sum(col_sums**2) - G**2) / denominator

    df = k - 1
    p_value = 1 - stats.chi2.cdf(Q, df)

    return {
        'qStatistic': float(Q),
        'pValue': float(p_value),
        'df': int(df)
    }


def mood_median_test(groups):
    if len(groups) < 2:
        raise ValueError("Mood median test requires at least 2 groups")

    statistic, p_value, grand_median, contingency_table = stats.median_test(*groups)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'grandMedian': float(grand_median),
        'contingencyTable': contingency_table.tolist()
    }
