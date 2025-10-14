# 우선순위 1 메서드 구현 (11개)

## Descriptive 그룹 (3개)

### 1. frequency (빈도분석)
```python
def frequency(values):
    """
    빈도분석 (Frequency Analysis)

    범주형 변수의 빈도표 생성
    """
    import numpy as np

    values = np.array(values)

    if len(values) == 0:
        raise ValueError("Empty data for frequency analysis")

    # 고유값과 빈도 계산
    unique_vals, counts = np.unique(values, return_counts=True)

    total = len(values)
    percentages = (counts / total) * 100
    cumulative = np.cumsum(percentages)

    return {
        'categories': [str(v) for v in unique_vals],
        'frequencies': [int(c) for c in counts],
        'percentages': [float(p) for p in percentages],
        'cumulativePercentages': [float(c) for c in cumulative],
        'total': int(total),
        'uniqueCount': int(len(unique_vals))
    }
```

### 2. crosstab (교차표)
```python
def crosstab(row_values, col_values):
    """
    교차표 분석 (Crosstab Analysis)

    두 범주형 변수의 교차 빈도표
    """
    import numpy as np

    row_values = np.array(row_values)
    col_values = np.array(col_values)

    if len(row_values) != len(col_values):
        raise ValueError(f"Row and column must have same length: {len(row_values)} != {len(col_values)}")

    if len(row_values) == 0:
        raise ValueError("Empty data for crosstab analysis")

    # 고유 카테고리
    row_categories = np.unique(row_values)
    col_categories = np.unique(col_values)

    # 교차표 행렬
    observed_matrix = np.zeros((len(row_categories), len(col_categories)), dtype=int)

    for i, row_cat in enumerate(row_categories):
        for j, col_cat in enumerate(col_categories):
            count = np.sum((row_values == row_cat) & (col_values == col_cat))
            observed_matrix[i, j] = count

    # 행/열 합계
    row_totals = observed_matrix.sum(axis=1)
    col_totals = observed_matrix.sum(axis=0)
    grand_total = observed_matrix.sum()

    return {
        'rowCategories': [str(c) for c in row_categories],
        'colCategories': [str(c) for c in col_categories],
        'observedMatrix': observed_matrix.tolist(),
        'rowTotals': row_totals.tolist(),
        'colTotals': col_totals.tolist(),
        'grandTotal': int(grand_total)
    }
```

### 3. oneSampleProportionTest (일표본 비율검정)
```python
def one_sample_proportion_test(success_count, total_count, null_proportion=0.5,
                                alternative='two-sided', alpha=0.05):
    """
    일표본 비율검정 (One-Sample Proportion Test)

    표본 비율이 특정 값과 같은지 검정
    """
    from scipy import stats
    import numpy as np

    if total_count < 10:
        raise ValueError("Proportion test requires at least 10 observations")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    if null_proportion <= 0 or null_proportion >= 1:
        raise ValueError(f"null_proportion must be between 0 and 1, got {null_proportion}")

    sample_proportion = success_count / total_count

    # 1. 정확 검정 (이항검정)
    result_exact = stats.binomtest(success_count, total_count, null_proportion, alternative=alternative)
    p_value_exact = result_exact.pvalue

    # 2. 정규근사 검정 (Z-검정)
    se = np.sqrt(null_proportion * (1 - null_proportion) / total_count)
    z_statistic = (sample_proportion - null_proportion) / se

    if alternative == 'two-sided':
        p_value_approx = 2 * (1 - stats.norm.cdf(abs(z_statistic)))
    elif alternative == 'greater':
        p_value_approx = 1 - stats.norm.cdf(z_statistic)
    elif alternative == 'less':
        p_value_approx = stats.norm.cdf(z_statistic)
    else:
        raise ValueError(f"Unknown alternative: {alternative}")

    # 3. Wilson Score 신뢰구간 (더 정확함)
    z_critical = stats.norm.ppf(1 - alpha/2)
    denominator = 1 + z_critical**2 / total_count
    center = (sample_proportion + z_critical**2 / (2*total_count)) / denominator
    margin = z_critical * np.sqrt(sample_proportion*(1-sample_proportion)/total_count + z_critical**2/(4*total_count**2)) / denominator

    ci_lower = max(0, center - margin)
    ci_upper = min(1, center + margin)

    # 유의성 판단 (정확 검정 기준)
    significant = p_value_exact < alpha

    return {
        'sampleProportion': float(sample_proportion),
        'nullProportion': float(null_proportion),
        'successCount': int(success_count),
        'totalCount': int(total_count),
        'zStatistic': float(z_statistic),
        'pValueExact': float(p_value_exact),
        'pValueApprox': float(p_value_approx),
        'confidenceInterval': {
            'lower': float(ci_lower),
            'upper': float(ci_upper),
            'level': float(1 - alpha)
        },
        'significant': bool(significant),
        'alternative': alternative,
        'alpha': float(alpha)
    }
```

## Hypothesis 그룹 (3개)

### 4. zTest (Z-검정)
```python
def z_test(values, popmean, popstd):
    """
    Z-검정 (Z-Test)

    모표준편차를 아는 경우의 평균 검정
    """
    from scipy import stats
    import numpy as np

    values = np.array(values)

    if len(values) < 2:
        raise ValueError("Z-test requires at least 2 observations")

    if popstd <= 0:
        raise ValueError(f"Population std must be positive, got {popstd}")

    n = len(values)
    sample_mean = np.mean(values)

    # Z-통계량
    z_statistic = (sample_mean - popmean) / (popstd / np.sqrt(n))

    # p-value (양측검정)
    p_value = 2 * (1 - stats.norm.cdf(abs(z_statistic)))

    # 95% 신뢰구간
    z_critical = stats.norm.ppf(0.975)
    margin = z_critical * (popstd / np.sqrt(n))
    ci_lower = sample_mean - margin
    ci_upper = sample_mean + margin

    return {
        'sampleMean': float(sample_mean),
        'sampleSize': int(n),
        'populationMean': float(popmean),
        'populationStd': float(popstd),
        'zStatistic': float(z_statistic),
        'pValue': float(p_value),
        'confidenceInterval': {
            'lower': float(ci_lower),
            'upper': float(ci_upper)
        }
    }
```

### 5. binomialTest (이항검정)
```python
def binomial_test(success_count, total_count, probability=0.5, alternative='two-sided'):
    """
    이항검정 (Binomial Test)

    이항분포 기반 정확 검정
    """
    from scipy import stats

    if total_count < 1:
        raise ValueError("Total count must be at least 1")

    if success_count < 0 or success_count > total_count:
        raise ValueError(f"Invalid success_count: must be 0 <= {success_count} <= {total_count}")

    if probability <= 0 or probability >= 1:
        raise ValueError(f"Probability must be between 0 and 1, got {probability}")

    # 이항검정
    result = stats.binomtest(success_count, total_count, probability, alternative=alternative)

    observed_proportion = success_count / total_count

    return {
        'successCount': int(success_count),
        'totalCount': int(total_count),
        'observedProportion': float(observed_proportion),
        'expectedProportion': float(probability),
        'pValue': float(result.pvalue),
        'alternative': alternative
    }
```

### 6. partialCorrelation (부분상관)
```python
def partial_correlation(data_matrix, var_index1, var_index2, control_indices):
    """
    부분상관분석 (Partial Correlation)

    통제변수의 영향을 제거한 상관계수
    """
    import numpy as np
    from scipy import stats as sp_stats
    import statsmodels.api as sm

    data_matrix = np.array(data_matrix)
    n, p = data_matrix.shape

    if n < 4:
        raise ValueError("Partial correlation requires at least 4 observations")

    if var_index1 >= p or var_index2 >= p:
        raise ValueError(f"Variable indices out of range: max index is {p-1}")

    if var_index1 == var_index2:
        raise ValueError("Two variables must be different")

    # 변수 추출
    x1 = data_matrix[:, var_index1]
    x2 = data_matrix[:, var_index2]

    if len(control_indices) == 0:
        # 통제변수 없으면 일반 상관계수
        corr, p_value = sp_stats.pearsonr(x1, x2)
        df = n - 2
    else:
        # 통제변수로 회귀 후 잔차 상관
        Z = data_matrix[:, control_indices]

        # x1 ~ Z 회귀
        Z_const = sm.add_constant(Z)
        model1 = sm.OLS(x1, Z_const).fit()
        resid1 = model1.resid

        # x2 ~ Z 회귀
        model2 = sm.OLS(x2, Z_const).fit()
        resid2 = model2.resid

        # 잔차 간 상관
        corr, _ = sp_stats.pearsonr(resid1, resid2)

        # 자유도
        df = n - len(control_indices) - 2

    # t-통계량 및 p-value
    t_statistic = corr * np.sqrt(df) / np.sqrt(1 - corr**2) if abs(corr) < 1 else np.inf
    p_value = 2 * (1 - sp_stats.t.cdf(abs(t_statistic), df))

    # 신뢰구간 (Fisher's z-transformation)
    z = np.arctanh(corr)
    se_z = 1 / np.sqrt(df - 1)
    z_critical = sp_stats.norm.ppf(0.975)
    ci_lower = np.tanh(z - z_critical * se_z)
    ci_upper = np.tanh(z + z_critical * se_z)

    return {
        'correlation': float(corr),
        'pValue': float(p_value),
        'tStatistic': float(t_statistic),
        'df': int(df),
        'confidenceInterval': {
            'lower': float(ci_lower),
            'upper': float(ci_upper)
        }
    }
```

## Nonparametric 그룹 (5개)

### 7-11. 비모수 검정들

```python
def sign_test(before, after):
    """부호검정 (Sign Test)"""
    from scipy import stats
    import numpy as np

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

    # 이항검정 (p=0.5)
    result = stats.binomtest(n_positive, n_total, 0.5)

    return {
        'nPositive': int(n_positive),
        'nNegative': int(n_negative),
        'nTies': int(n_ties),
        'pValue': float(result.pvalue)
    }


def runs_test(sequence):
    """Runs 검정 (Runs Test for Randomness)"""
    from scipy import stats
    import numpy as np

    sequence = np.array(sequence)

    if len(sequence) < 10:
        raise ValueError("Runs test requires at least 10 observations")

    # 중앙값 기준으로 이분화
    median = np.median(sequence)
    binary = (sequence > median).astype(int)

    # Runs 개수 계산
    runs = 1 + np.sum(binary[1:] != binary[:-1])

    # 각 값의 개수
    n1 = np.sum(binary == 0)
    n2 = np.sum(binary == 1)
    n = n1 + n2

    if n1 == 0 or n2 == 0:
        raise ValueError("All values are on one side of median")

    # 기대 runs 및 분산
    expected_runs = (2 * n1 * n2) / n + 1
    var_runs = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1))

    # Z-통계량
    z_statistic = (runs - expected_runs) / np.sqrt(var_runs)

    # p-value (양측검정)
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
    """McNemar 검정"""
    from scipy import stats
    import numpy as np

    table = np.array(contingency_table)

    if table.shape != (2, 2):
        raise ValueError("McNemar test requires 2x2 contingency table")

    # b와 c (불일치 셀)
    b = table[0, 1]
    c = table[1, 0]

    # 연속성 보정 여부
    use_correction = (b + c) < 25

    if use_correction:
        # 연속성 보정
        statistic = (abs(b - c) - 1)**2 / (b + c) if (b + c) > 0 else 0
    else:
        statistic = (b - c)**2 / (b + c) if (b + c) > 0 else 0

    # p-value (카이제곱 분포, df=1)
    p_value = 1 - stats.chi2.cdf(statistic, df=1)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'continuityCorrection': bool(use_correction),
        'discordantPairs': {'b': int(b), 'c': int(c)}
    }


def cochran_q_test(data_matrix):
    """Cochran Q 검정"""
    import numpy as np
    from scipy import stats

    data_matrix = np.array(data_matrix)
    n, k = data_matrix.shape  # n subjects, k conditions

    if k < 3:
        raise ValueError("Cochran Q requires at least 3 conditions")

    # 각 행과 열의 합
    row_sums = data_matrix.sum(axis=1)
    col_sums = data_matrix.sum(axis=0)

    # Q 통계량
    G = col_sums.sum()
    Q = (k - 1) * (k * np.sum(col_sums**2) - G**2) / (k * G - np.sum(row_sums**2))

    # p-value (카이제곱 분포, df=k-1)
    df = k - 1
    p_value = 1 - stats.chi2.cdf(Q, df)

    return {
        'qStatistic': float(Q),
        'pValue': float(p_value),
        'df': int(df)
    }


def mood_median_test(groups):
    """Mood Median 검정"""
    from scipy import stats

    if len(groups) < 2:
        raise ValueError("Mood median test requires at least 2 groups")

    # scipy.stats.median_test 사용
    statistic, p_value, grand_median, contingency_table = stats.median_test(*groups)

    return {
        'statistic': float(statistic),
        'pValue': float(p_value),
        'grandMedian': float(grand_median),
        'contingencyTable': contingency_table.tolist()
    }
```

---

## 전체 11개 메서드 요약

✅ **구현 완료**:
1. frequency - np.unique 사용
2. crosstab - NumPy 직접 구현
3. oneSampleProportionTest - stats.binomtest + Wilson CI
4. zTest - Z-통계량 + 정규분포
5. binomialTest - stats.binomtest
6. partialCorrelation - 회귀 잔차 상관
7. signTest - 이항검정 응용
8. runsTest - 무작위성 검정
9. mcNemarTest - 대응표본 범주형
10. cochranQTest - 다중 대응표본
11. moodMedianTest - 비모수 중앙값

**특징**:
- 모든 메서드 **SciPy/NumPy** 기반
- **에러 처리** 포함
- **입력 검증** 완비
- **JSON 직렬화** 가능
