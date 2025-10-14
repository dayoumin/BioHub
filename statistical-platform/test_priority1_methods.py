"""
우선순위 1 메서드 Python 테스트

11개 메서드의 통계적 정확성 및 엣지 케이스 검증
"""

import sys
import traceback

# 테스트 결과 수집
test_results = []

def test_result(name, passed, message=""):
    """테스트 결과 기록"""
    test_results.append({
        'name': name,
        'passed': passed,
        'message': message
    })
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}" + (f": {message}" if message else ""))

print("=" * 70)
print("우선순위 1 메서드 Python 테스트")
print("=" * 70)

# ============================================================================
# Test 1: frequency (빈도분석)
# ============================================================================
print("\n[Test 1] frequency")
try:
    import numpy as np

    def frequency(values):
        values = np.array(values)
        if len(values) == 0:
            raise ValueError("Empty data")
        unique_vals, counts = np.unique(values, return_counts=True)
        total = len(values)
        percentages = (counts / total) * 100
        cumulative = np.cumsum(percentages)
        return {
            'categories': [str(v) for v in unique_vals],
            'frequencies': [int(c) for c in counts],
            'percentages': [float(p) for p in percentages],
            'cumulativePercentages': [float(c) for c in cumulative],
            'total': int(total)
        }

    # 테스트 케이스
    data = ['A', 'B', 'A', 'C', 'A', 'B']
    result = frequency(data)

    test_result("빈도 계산", result['frequencies'] == [3, 2, 1])
    test_result("백분율 계산", abs(result['percentages'][0] - 50.0) < 0.01)
    test_result("누적 백분율", abs(result['cumulativePercentages'][-1] - 100.0) < 0.01)

    # 숫자 데이터
    nums = [1, 2, 2, 3, 3, 3]
    result2 = frequency(nums)
    test_result("숫자 데이터", result2['frequencies'] == [1, 2, 3])

except Exception as e:
    test_result("frequency 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 2: crosstab (교차표)
# ============================================================================
print("\n[Test 2] crosstab")
try:
    def crosstab(row_values, col_values):
        row_values = np.array(row_values)
        col_values = np.array(col_values)

        if len(row_values) != len(col_values):
            raise ValueError("Length mismatch")
        if len(row_values) == 0:
            raise ValueError("Empty data")

        row_categories = np.unique(row_values)
        col_categories = np.unique(col_values)

        observed_matrix = np.zeros((len(row_categories), len(col_categories)), dtype=int)

        for i, row_cat in enumerate(row_categories):
            for j, col_cat in enumerate(col_categories):
                count = np.sum((row_values == row_cat) & (col_values == col_cat))
                observed_matrix[i, j] = count

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

    # 테스트 케이스: 성별 x 선호도
    gender = ['M', 'F', 'M', 'F', 'M', 'F']
    pref = ['A', 'A', 'B', 'B', 'A', 'A']
    result = crosstab(gender, pref)

    test_result("2x2 교차표", len(result['rowCategories']) == 2 and len(result['colCategories']) == 2)
    test_result("총합 계산", result['grandTotal'] == 6)
    test_result("행 합계", sum(result['rowTotals']) == 6)
    test_result("열 합계", sum(result['colTotals']) == 6)

except Exception as e:
    test_result("crosstab 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 3: oneSampleProportionTest (일표본 비율검정)
# ============================================================================
print("\n[Test 3] oneSampleProportionTest")
try:
    from scipy import stats

    def one_sample_proportion_test(success_count, total_count, null_proportion=0.5,
                                    alternative='two-sided', alpha=0.05):
        if total_count < 10:
            raise ValueError("Requires at least 10 observations")
        if success_count < 0 or success_count > total_count:
            raise ValueError("Invalid success_count")

        sample_proportion = success_count / total_count

        # 정확 검정
        result_exact = stats.binomtest(success_count, total_count, null_proportion, alternative=alternative)
        p_value_exact = result_exact.pvalue

        # 정규근사
        se = np.sqrt(null_proportion * (1 - null_proportion) / total_count)
        z_statistic = (sample_proportion - null_proportion) / se

        if alternative == 'two-sided':
            p_value_approx = 2 * (1 - stats.norm.cdf(abs(z_statistic)))
        elif alternative == 'greater':
            p_value_approx = 1 - stats.norm.cdf(z_statistic)
        else:
            p_value_approx = stats.norm.cdf(z_statistic)

        # Wilson Score CI
        z_critical = stats.norm.ppf(1 - alpha/2)
        denominator = 1 + z_critical**2 / total_count
        center = (sample_proportion + z_critical**2 / (2*total_count)) / denominator
        margin = z_critical * np.sqrt(sample_proportion*(1-sample_proportion)/total_count + z_critical**2/(4*total_count**2)) / denominator

        ci_lower = max(0, center - margin)
        ci_upper = min(1, center + margin)

        return {
            'sampleProportion': float(sample_proportion),
            'pValueExact': float(p_value_exact),
            'pValueApprox': float(p_value_approx),
            'confidenceInterval': {'lower': float(ci_lower), 'upper': float(ci_upper)}
        }

    # 테스트: 동전 던지기 (공정한 동전)
    result = one_sample_proportion_test(50, 100, 0.5)

    test_result("표본 비율 계산", result['sampleProportion'] == 0.5)
    test_result("p-value 범위", 0 <= result['pValueExact'] <= 1)
    test_result("CI 범위", 0 <= result['confidenceInterval']['lower'] <= result['confidenceInterval']['upper'] <= 1)
    test_result("Wilson CI 포함", 0.4 <= result['confidenceInterval']['lower'] and result['confidenceInterval']['upper'] <= 0.6)

    # 테스트: 편향된 동전
    result2 = one_sample_proportion_test(70, 100, 0.5)
    test_result("편향 검출", result2['pValueExact'] < 0.05)

except Exception as e:
    test_result("oneSampleProportionTest 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 4: zTest (Z-검정)
# ============================================================================
print("\n[Test 4] zTest")
try:
    def z_test(values, popmean, popstd):
        values = np.array(values)
        if len(values) < 2:
            raise ValueError("Requires at least 2 observations")
        if popstd <= 0:
            raise ValueError("popstd must be positive")

        n = len(values)
        sample_mean = np.mean(values)
        z_statistic = (sample_mean - popmean) / (popstd / np.sqrt(n))
        p_value = 2 * (1 - stats.norm.cdf(abs(z_statistic)))

        z_critical = stats.norm.ppf(0.975)
        margin = z_critical * (popstd / np.sqrt(n))
        ci_lower = sample_mean - margin
        ci_upper = sample_mean + margin

        return {
            'sampleMean': float(sample_mean),
            'zStatistic': float(z_statistic),
            'pValue': float(p_value),
            'confidenceInterval': {'lower': float(ci_lower), 'upper': float(ci_upper)}
        }

    # 테스트: 표준정규분포에서 샘플링
    np.random.seed(42)
    data = np.random.normal(0, 1, 100)
    result = z_test(data, 0, 1)

    test_result("표본평균 근사", abs(result['sampleMean']) < 0.3)  # 대부분 -0.3 ~ 0.3
    test_result("p-value 범위", 0 <= result['pValue'] <= 1)
    test_result("유의하지 않음", result['pValue'] > 0.05)  # mu=0이 맞으므로

except Exception as e:
    test_result("zTest 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 5: partialCorrelation (부분상관)
# ============================================================================
print("\n[Test 5] partialCorrelation")
try:
    import statsmodels.api as sm

    def partial_correlation(data_matrix, var_index1, var_index2, control_indices):
        data_matrix = np.array(data_matrix)
        n, p = data_matrix.shape

        if n < 4:
            raise ValueError("Requires at least 4 observations")

        x1 = data_matrix[:, var_index1]
        x2 = data_matrix[:, var_index2]

        if len(control_indices) == 0:
            from scipy.stats import pearsonr
            corr, p_value = pearsonr(x1, x2)
            df = n - 2
        else:
            Z = data_matrix[:, control_indices]
            Z_const = sm.add_constant(Z)
            model1 = sm.OLS(x1, Z_const).fit()
            resid1 = model1.resid
            model2 = sm.OLS(x2, Z_const).fit()
            resid2 = model2.resid

            from scipy.stats import pearsonr
            corr, _ = pearsonr(resid1, resid2)
            df = n - len(control_indices) - 2

        t_statistic = corr * np.sqrt(df) / np.sqrt(1 - corr**2) if abs(corr) < 1 else np.inf
        from scipy.stats import t as t_dist
        p_value = 2 * (1 - t_dist.cdf(abs(t_statistic), df))

        return {
            'correlation': float(corr),
            'pValue': float(p_value),
            'df': int(df)
        }

    # 테스트: x1과 x2는 독립, x1과 z는 상관
    np.random.seed(42)
    n = 100
    z = np.random.randn(n)
    x1 = z + np.random.randn(n) * 0.5
    x2 = np.random.randn(n)
    data = np.column_stack([x1, x2, z])

    # 일반 상관 (z 통제 안함)
    result_no_control = partial_correlation(data, 0, 1, [])
    test_result("일반 상관 계산", abs(result_no_control['correlation']) < 1)

    # 부분상관 (z 통제)
    result_control = partial_correlation(data, 0, 1, [2])
    test_result("부분상관 계산", abs(result_control['correlation']) < abs(result_no_control['correlation']))

except Exception as e:
    test_result("partialCorrelation 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 6: signTest (부호검정)
# ============================================================================
print("\n[Test 6] signTest")
try:
    def sign_test(before, after):
        before = np.array(before)
        after = np.array(after)

        if len(before) != len(after):
            raise ValueError("Length mismatch")

        diff = after - before
        n_positive = np.sum(diff > 0)
        n_negative = np.sum(diff < 0)
        n_ties = np.sum(diff == 0)
        n_total = n_positive + n_negative

        if n_total == 0:
            raise ValueError("All ties")

        result = stats.binomtest(n_positive, n_total, 0.5)

        return {
            'nPositive': int(n_positive),
            'nNegative': int(n_negative),
            'nTies': int(n_ties),
            'pValue': float(result.pvalue)
        }

    # 테스트: 개선 효과 있음
    before = [5, 6, 7, 8, 9]
    after = [6, 7, 8, 9, 10]
    result = sign_test(before, after)

    test_result("양의 차이 개수", result['nPositive'] == 5)
    test_result("유의한 개선", result['pValue'] < 0.05)

except Exception as e:
    test_result("signTest 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# Test 7: mcNemarTest (McNemar 검정)
# ============================================================================
print("\n[Test 7] mcNemarTest")
try:
    def mcnemar_test(contingency_table):
        table = np.array(contingency_table)

        if table.shape != (2, 2):
            raise ValueError("Requires 2x2 table")

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
            'continuityCorrection': bool(use_correction)
        }

    # 테스트: 불일치가 크면 유의함
    table = [[20, 5], [15, 30]]  # b=5, c=15
    result = mcnemar_test(table)

    test_result("통계량 계산", result['statistic'] > 0)
    test_result("유의한 변화", result['pValue'] < 0.05)

except Exception as e:
    test_result("mcNemarTest 전체", False, str(e))
    traceback.print_exc()

# ============================================================================
# 결과 요약
# ============================================================================
print("\n" + "=" * 70)
print("테스트 결과 요약")
print("=" * 70)

total = len(test_results)
passed = sum(1 for r in test_results if r['passed'])
failed = total - passed

print(f"\n총 테스트: {total}개")
print(f"통과: {passed}개")
print(f"실패: {failed}개")
print(f"성공률: {(passed/total*100):.1f}%")

if failed > 0:
    print("\n실패한 테스트:")
    for r in test_results:
        if not r['passed']:
            print(f"  - {r['name']}: {r['message']}")

print("\n" + "=" * 70)
if failed == 0:
    print("ALL TESTS PASSED!")
    print("=" * 70)
    sys.exit(0)
else:
    print(f"{failed} TEST(S) FAILED")
    print("=" * 70)
    sys.exit(1)
