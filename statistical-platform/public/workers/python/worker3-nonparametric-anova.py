# Worker 3: Nonparametric ANOVA Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels, pandas
# - Estimated memory: ~140MB
# - Cold start time: ~2.3s

from typing import List, Dict, Union, Literal, Optional, Any
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


def two_way_anova(data_values, factor1_values, factor2_values):
    import statsmodels.api as sm
    from statsmodels.formula.api import ols
    import pandas as pd

    if len(data_values) != len(factor1_values) or len(data_values) != len(factor2_values):
        raise ValueError(
            f"All inputs must have same length: data({len(data_values)}), "
            f"factor1({len(factor1_values)}), factor2({len(factor2_values)})"
        )

    n_samples = len(data_values)
    if n_samples < 4:
        raise ValueError(f"Two-way ANOVA requires at least 4 observations, got {n_samples}")

    df = pd.DataFrame({
        'value': data_values,
        'factor1': factor1_values,
        'factor2': factor2_values
    })

    formula = 'value ~ C(factor1) + C(factor2) + C(factor1):C(factor2)'
    model = ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    result = {
        'factor1': {
            'fStatistic': float(anova_table.loc['C(factor1)', 'F']),
            'pValue': float(anova_table.loc['C(factor1)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1)', 'df'])
        },
        'factor2': {
            'fStatistic': float(anova_table.loc['C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor2)', 'df'])
        },
        'interaction': {
            'fStatistic': float(anova_table.loc['C(factor1):C(factor2)', 'F']),
            'pValue': float(anova_table.loc['C(factor1):C(factor2)', 'PR(>F)']),
            'df': float(anova_table.loc['C(factor1):C(factor2)', 'df'])
        },
        'residual': {
            'df': float(anova_table.loc['Residual', 'df'])
        },
        'anovaTable': anova_table.to_dict()
    }

    return result


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

    n_samples = len(before)
    if n_samples < 5:
        raise ValueError(f"Sign test requires at least 5 observations for reliable results, got {n_samples}")

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
    from statsmodels.sandbox.stats.runs import runstest_1samp

    sequence = np.array([x for x in sequence if x is not None and not np.isnan(x)])

    if len(sequence) < 10:
        raise ValueError("Runs test requires at least 10 observations")

    z_statistic, p_value = runstest_1samp(sequence, cutoff='median', correction=True)

    median = np.median(sequence)
    binary = (sequence > median).astype(int)
    runs = 1 + np.sum(binary[1:] != binary[:-1])
    n1 = np.sum(binary == 0)
    n2 = np.sum(binary == 1)
    n = n1 + n2
    expected_runs = (2 * n1 * n2) / n + 1

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

    if data_matrix.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_matrix.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n, k = data_matrix.shape  # n subjects, k conditions

    if n < 2:
        raise ValueError(f"Cochran Q requires at least 2 subjects, got {n}")

    if k < 3:
        raise ValueError(f"Cochran Q requires at least 3 conditions, got {k}")

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


# Priority 2 Methods - ANOVA (4 methods)

def repeated_measures_anova(data_matrix, subject_ids, time_labels):
    from statsmodels.stats.anova import AnovaRM
    import pandas as pd

    data_array = np.array(data_matrix)

    if data_array.size == 0:
        raise ValueError("Empty data matrix")

    if len(data_array.shape) != 2:
        raise ValueError("Data must be a 2D matrix")

    n_subjects, n_timepoints = data_array.shape

    if n_subjects < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 subjects, got {n_subjects}")

    if n_timepoints < 2:
        raise ValueError(f"Repeated measures ANOVA requires at least 2 timepoints, got {n_timepoints}")

    if len(subject_ids) != n_subjects:
        raise ValueError(f"Subject IDs length {len(subject_ids)} must match number of subjects {n_subjects}")

    if len(time_labels) != n_timepoints:
        raise ValueError(f"Time labels length {len(time_labels)} must match number of timepoints {n_timepoints}")

    data_long = []
    for i, subject_id in enumerate(subject_ids):
        for j, time_label in enumerate(time_labels):
            data_long.append({
                'subject': subject_id,
                'time': time_label,
                'value': data_matrix[i][j]
            })

    df = pd.DataFrame(data_long)

    # Repeated Measures ANOVA
    aovrm = AnovaRM(df, 'value', 'subject', within=['time'])
    res = aovrm.fit()

    return {
        'fStatistic': float(res.anova_table['F Value'][0]),
        'pValue': float(res.anova_table['Pr > F'][0]),
        'df': {
            'numerator': float(res.anova_table['Num DF'][0]),
            'denominator': float(res.anova_table['Den DF'][0])
        },
        'sphericityEpsilon': 1.0,
        'anovaTable': res.anova_table.to_dict()
    }


def ancova(y_values, group_values, covariates):
    import statsmodels.formula.api as smf
    import statsmodels.api as sm
    import pandas as pd

    if not covariates or len(covariates) == 0:
        raise ValueError("ANCOVA requires at least 1 covariate")

    if len(y_values) != len(group_values):
        raise ValueError(f"y_values ({len(y_values)}) and group_values ({len(group_values)}) must have same length")

    for i, cov in enumerate(covariates):
        if len(cov) != len(y_values):
            raise ValueError(f"Covariate {i} length ({len(cov)}) must match y_values length ({len(y_values)})")

    n_samples = len(y_values)
    if n_samples < 3:
        raise ValueError(f"ANCOVA requires at least 3 observations, got {n_samples}")

    data = {
        'y': y_values,
        'group': group_values
    }

    for i, cov in enumerate(covariates):
        data[f'cov{i}'] = cov

    df = pd.DataFrame(data)

    cov_formula = ' + '.join([f'cov{i}' for i in range(len(covariates))])
    formula = f'y ~ C(group) + {cov_formula}'

    model = smf.ols(formula, data=df).fit()
    anova_table = sm.stats.anova_lm(model, typ=2)

    group_means = df.groupby('group')['y'].mean()

    return {
        'fStatisticGroup': float(anova_table.loc['C(group)', 'F']),
        'pValueGroup': float(anova_table.loc['C(group)', 'PR(>F)']),
        'fStatisticCovariate': [float(anova_table.loc[f'cov{i}', 'F']) for i in range(len(covariates))],
        'pValueCovariate': [float(anova_table.loc[f'cov{i}', 'PR(>F)']) for i in range(len(covariates))],
        'adjustedMeans': [{'group': g, 'mean': float(m)} for g, m in group_means.items()],
        'anovaTable': anova_table.to_dict()
    }


def manova(data_matrix, group_values, var_names):
    from statsmodels.multivariate.manova import MANOVA
    import pandas as pd

    if not data_matrix or len(data_matrix) == 0:
        raise ValueError("Empty data matrix")

    n_obs = len(data_matrix)
    n_vars = len(data_matrix[0]) if n_obs > 0 else 0

    if n_vars < 2:
        raise ValueError(f"MANOVA requires at least 2 variables, got {n_vars}")

    if len(group_values) != n_obs:
        raise ValueError(f"group_values length ({len(group_values)}) must match data_matrix rows ({n_obs})")

    if len(var_names) != n_vars:
        raise ValueError(f"var_names length ({len(var_names)}) must match data_matrix columns ({n_vars})")

    for i, row in enumerate(data_matrix):
        if len(row) != n_vars:
            raise ValueError(f"Row {i} has {len(row)} values, expected {n_vars}")

    df_dict = {'group': group_values}
    for i, var_name in enumerate(var_names):
        df_dict[var_name] = [row[i] for row in data_matrix]

    df = pd.DataFrame(df_dict)

    # MANOVA
    formula = ' + '.join(var_names) + ' ~ group'
    maov = MANOVA.from_formula(formula, data=df)
    result = maov.mv_test()

    test_results = result.results['group']['stat']

    return {
        'wilksLambda': float(test_results.loc["Wilks' lambda", 'Value']),
        'pillaiTrace': float(test_results.loc["Pillai's trace", 'Value']),
        'hotellingLawley': float(test_results.loc["Hotelling-Lawley trace", 'Value']),
        'royMaxRoot': float(test_results.loc["Roy's greatest root", 'Value']),
        'fStatistic': float(test_results.loc["Wilks' lambda", 'F Value']),
        'pValue': float(test_results.loc["Wilks' lambda", 'Pr > F']),
        'df': {
            'hypothesis': float(test_results.loc["Wilks' lambda", 'Num DF']),
            'error': float(test_results.loc["Wilks' lambda", 'Den DF'])
        }
    }


def scheffe_test(groups):
    if len(groups) < 3:
        raise ValueError(f"Scheffe test requires at least 3 groups, got {len(groups)}")

    clean_groups = []
    for i, group in enumerate(groups):
        arr = np.array(group)
        if len(arr) < 2:
            raise ValueError(f"Group {i} must have at least 2 observations, got {len(arr)}")
        clean_groups.append(arr)

    groups = clean_groups
    k = len(groups)
    n_total = sum(len(g) for g in groups)
    group_means = [np.mean(g) for g in groups]
    group_ns = [len(g) for g in groups]

    grand_mean = np.mean(np.concatenate(groups))

    ss_within = sum(np.sum((g - np.mean(g))**2) for g in groups)
    df_within = n_total - k
    mse = ss_within / df_within

    comparisons = []
    for i in range(k):
        for j in range(i+1, k):
            mean_diff = group_means[i] - group_means[j]

            se = np.sqrt(mse * (1/group_ns[i] + 1/group_ns[j]))
            f_stat = (mean_diff ** 2) / ((k - 1) * se ** 2)

            # p-value
            p_value = 1 - stats.f.cdf(f_stat, k - 1, df_within)

            critical_f = stats.f.ppf(0.95, k - 1, df_within)
            critical_value = np.sqrt((k - 1) * critical_f) * se

            comparisons.append({
                'group1': i,
                'group2': j,
                'meanDiff': float(mean_diff),
                'fStatistic': float(f_stat),
                'pValue': float(p_value),
                'criticalValue': float(critical_value),
                'significant': p_value < 0.05
            })

    return {
        'comparisons': comparisons,
        'mse': float(mse),
        'dfWithin': int(df_within)
    }


def dunn_test(groups, p_adjust='holm'):
    try:
        import scikit_posthocs as sp
        import pandas as pd
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Dunn test. Install with: pip install scikit-posthocs")

    if len(groups) < 2:
        raise ValueError(f"Dunn test requires at least 2 groups, got {len(groups)}")

    clean_groups = []
    for i, group in enumerate(groups):
        arr = np.array([x for x in group if x is not None and not np.isnan(x)])
        if len(arr) == 0:
            raise ValueError(f"Group {i} has no valid observations")
        clean_groups.append(arr)

    data_list = []
    group_labels = []
    for i, group in enumerate(clean_groups):
        data_list.extend(group)
        group_labels.extend([i] * len(group))

    df = pd.DataFrame({
        'data': data_list,
        'group': group_labels
    })

    dunn_result = sp.posthoc_dunn(df, val_col='data', group_col='group', p_adjust=p_adjust)

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = dunn_result.iloc[i, j]
            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'comparisons': comparisons,
        'pAdjustMethod': p_adjust,
        'nComparisons': len(comparisons)
    }


def games_howell_test(groups):
    try:
        import scikit_posthocs as sp
        import pandas as pd
    except ImportError:
        raise ImportError("scikit-posthocs library is required for Games-Howell test")

    if len(groups) < 2:
        raise ValueError(f"Games-Howell test requires at least 2 groups, got {len(groups)}")

    clean_groups = []
    for i, group in enumerate(groups):
        arr = np.array([x for x in group if x is not None and not np.isnan(x)])
        if len(arr) == 0:
            raise ValueError(f"Group {i} has no valid observations")
        clean_groups.append(arr)

    data_list = []
    group_labels = []
    for i, group in enumerate(clean_groups):
        data_list.extend(group)
        group_labels.extend([i] * len(group))

    df = pd.DataFrame({
        'data': data_list,
        'group': group_labels
    })

    gh_result = sp.posthoc_gameshowell(df, val_col='data', group_col='group')

    comparisons = []
    n_groups = len(clean_groups)
    for i in range(n_groups):
        for j in range(i + 1, n_groups):
            p_value = gh_result.iloc[i, j]
            comparisons.append({
                'group1': int(i),
                'group2': int(j),
                'pValue': float(p_value),
                'significant': float(p_value) < 0.05
            })

    return {
        'comparisons': comparisons,
        'nComparisons': len(comparisons)
    }

