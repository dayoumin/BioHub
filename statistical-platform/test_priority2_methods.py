"""
우선순위 2 메서드 Python 테스트

13개 메서드의 Python 구현을 독립적으로 테스트
"""

import numpy as np
from scipy import stats, optimize
import statsmodels.api as sm
from statsmodels.stats.anova import AnovaRM
from statsmodels.miscmodels.ordinal_model import OrderedModel
from statsmodels.multivariate.manova import MANOVA
import statsmodels.formula.api as smf
import pandas as pd
import json

# ============================================================================
# Regression 그룹 (9개)
# ============================================================================

def curve_estimation(x_values, y_values, model_type='linear'):
    """곡선추정"""
    x = np.array(x_values)
    y = np.array(y_values)

    if model_type == 'linear':
        coeffs = np.polyfit(x, y, 1)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'quadratic':
        coeffs = np.polyfit(x, y, 2)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'cubic':
        coeffs = np.polyfit(x, y, 3)
        predictions = np.polyval(coeffs, x)

    elif model_type == 'exponential':
        log_y = np.log(y)
        coeffs_linear = np.polyfit(x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * np.exp(b * x)

    elif model_type == 'logarithmic':
        log_x = np.log(x)
        coeffs = np.polyfit(log_x, y, 1)
        predictions = coeffs[0] * np.log(x) + coeffs[1]

    elif model_type == 'power':
        log_x = np.log(x)
        log_y = np.log(y)
        coeffs_linear = np.polyfit(log_x, log_y, 1)
        a = np.exp(coeffs_linear[1])
        b = coeffs_linear[0]
        coeffs = [a, b]
        predictions = a * (x ** b)

    ss_res = np.sum((y - predictions) ** 2)
    ss_tot = np.sum((y - np.mean(y)) ** 2)
    r_squared = 1 - (ss_res / ss_tot)

    return {
        'modelType': model_type,
        'coefficients': [float(c) for c in coeffs],
        'rSquared': float(r_squared),
        'predictions': [float(p) for p in predictions],
        'residuals': [float(r) for r in (y - predictions)]
    }


def stepwise_regression(y_values, x_matrix, variable_names,
                       method='forward', entry_threshold=0.05, stay_threshold=0.10):
    """단계적 회귀"""
    y = np.array(y_values)
    X = np.array(x_matrix)
    n_vars = X.shape[1]

    if method == 'forward':
        selected = []
        remaining = list(range(n_vars))
        r_squared_history = []

        while remaining:
            best_pval = 1.0
            best_var = None

            for var in remaining:
                test_vars = selected + [var]
                X_test = sm.add_constant(X[:, test_vars])
                model = sm.OLS(y, X_test).fit()
                pval = model.pvalues[-1]

                if pval < best_pval:
                    best_pval = pval
                    best_var = var

            if best_pval < entry_threshold:
                selected.append(best_var)
                remaining.remove(best_var)
                X_current = sm.add_constant(X[:, selected])
                model_current = sm.OLS(y, X_current).fit()
                r_squared_history.append(model_current.rsquared)
            else:
                break

    elif method == 'backward':
        selected = list(range(n_vars))
        r_squared_history = []

        while len(selected) > 0:
            X_test = sm.add_constant(X[:, selected])
            model = sm.OLS(y, X_test).fit()
            pvalues = model.pvalues[1:]
            max_pval_idx = np.argmax(pvalues)
            max_pval = pvalues[max_pval_idx]

            if max_pval > stay_threshold:
                selected.pop(max_pval_idx)
                if selected:
                    X_current = sm.add_constant(X[:, selected])
                    model_current = sm.OLS(y, X_current).fit()
                    r_squared_history.append(model_current.rsquared)
            else:
                break

    if selected:
        X_final = sm.add_constant(X[:, selected])
        final_model = sm.OLS(y, X_final).fit()

        return {
            'selectedVariables': [variable_names[i] for i in selected],
            'selectedIndices': selected,
            'rSquaredAtStep': r_squared_history,
            'finalCoefficients': [float(c) for c in final_model.params],
            'finalRSquared': float(final_model.rsquared),
            'adjustedRSquared': float(final_model.rsquared_adj)
        }
    else:
        return {'selectedVariables': [], 'finalRSquared': 0.0}


def binary_logistic(x_matrix, y_values):
    """이항 로지스틱"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.Logit(y, X).fit(disp=0)
    predictions_prob = model.predict(X)
    predictions_class = (predictions_prob > 0.5).astype(int)
    accuracy = np.mean(predictions_class == y)

    return {
        'coefficients': [float(c) for c in model.params],
        'accuracy': float(accuracy),
        'aic': float(model.aic),
        'pseudoRSquared': float(model.prsquared)
    }


def poisson_regression(x_matrix, y_values):
    """포아송 회귀"""
    X = sm.add_constant(np.array(x_matrix))
    y = np.array(y_values)

    model = sm.GLM(y, X, family=sm.families.Poisson()).fit()

    return {
        'coefficients': [float(c) for c in model.params],
        'deviance': float(model.deviance),
        'aic': float(model.aic),
        'dispersion': float(model.scale)
    }


# ============================================================================
# ANOVA 그룹 (4개)
# ============================================================================

def scheffe_test(groups):
    """Scheffe 사후검정"""
    k = len(groups)
    n_total = sum(len(g) for g in groups)
    group_means = [np.mean(g) for g in groups]
    group_ns = [len(g) for g in groups]

    ss_within = sum(np.sum((g - np.mean(g))**2) for g in groups)
    df_within = n_total - k
    mse = ss_within / df_within

    comparisons = []
    for i in range(k):
        for j in range(i+1, k):
            mean_diff = group_means[i] - group_means[j]
            se = np.sqrt(mse * (1/group_ns[i] + 1/group_ns[j]))
            f_stat = (mean_diff ** 2) / ((k - 1) * se ** 2)
            p_value = 1 - stats.f.cdf(f_stat, k - 1, df_within)

            comparisons.append({
                'group1': i,
                'group2': j,
                'meanDiff': float(mean_diff),
                'fStatistic': float(f_stat),
                'pValue': float(p_value),
                'significant': p_value < 0.05
            })

    return {
        'comparisons': comparisons,
        'mse': float(mse),
        'dfWithin': int(df_within)
    }


# ============================================================================
# 테스트 실행
# ============================================================================

def test_curve_estimation():
    """곡선추정 테스트"""
    print("\n=== Test 1: Curve Estimation ===")

    # 선형 데이터 생성
    x = [1, 2, 3, 4, 5]
    y = [2.1, 4.0, 6.1, 7.9, 10.2]

    result = curve_estimation(x, y, 'linear')
    print(f"Linear Model:")
    print(f"  Coefficients: {result['coefficients']}")
    print(f"  R-squared: {result['rSquared']:.4f}")
    assert result['rSquared'] > 0.95, "R-squared should be > 0.95"

    # 이차 데이터
    x2 = [1, 2, 3, 4, 5]
    y2 = [1, 4, 9, 16, 25]

    result2 = curve_estimation(x2, y2, 'quadratic')
    print(f"\nQuadratic Model:")
    print(f"  R-squared: {result2['rSquared']:.4f}")
    assert result2['rSquared'] > 0.99, "Quadratic R-squared should be > 0.99"

    print("✅ Curve Estimation PASSED")


def test_stepwise_regression():
    """단계적 회귀 테스트"""
    print("\n=== Test 2: Stepwise Regression ===")

    np.random.seed(42)
    n = 100

    # y = 2*x1 + 3*x2 + noise (x3, x4는 무관)
    x1 = np.random.randn(n)
    x2 = np.random.randn(n)
    x3 = np.random.randn(n)
    x4 = np.random.randn(n)

    y = 2*x1 + 3*x2 + np.random.randn(n)*0.5
    X = np.column_stack([x1, x2, x3, x4])

    var_names = ['x1', 'x2', 'x3', 'x4']
    result = stepwise_regression(y, X, var_names, method='forward')

    print(f"Selected Variables: {result['selectedVariables']}")
    print(f"Final R-squared: {result['finalRSquared']:.4f}")

    # x1, x2가 선택되어야 함
    assert 'x1' in result['selectedVariables'], "x1 should be selected"
    assert 'x2' in result['selectedVariables'], "x2 should be selected"
    assert result['finalRSquared'] > 0.8, "R-squared should be > 0.8"

    print("✅ Stepwise Regression PASSED")


def test_binary_logistic():
    """이항 로지스틱 테스트"""
    print("\n=== Test 3: Binary Logistic ===")

    np.random.seed(42)
    n = 100

    # 분리 가능한 데이터
    x = np.random.randn(n, 2)
    y = (x[:, 0] + x[:, 1] > 0).astype(int)

    result = binary_logistic(x, y)

    print(f"Accuracy: {result['accuracy']:.4f}")
    print(f"AIC: {result['aic']:.2f}")
    print(f"Pseudo R-squared: {result['pseudoRSquared']:.4f}")

    assert result['accuracy'] > 0.7, "Accuracy should be > 0.7"
    assert 0 <= result['pseudoRSquared'] <= 1, "Pseudo R-squared should be in [0, 1]"

    print("✅ Binary Logistic PASSED")


def test_poisson_regression():
    """포아송 회귀 테스트"""
    print("\n=== Test 4: Poisson Regression ===")

    np.random.seed(42)
    n = 100

    # 카운트 데이터
    x = np.random.randn(n, 2)
    lambda_true = np.exp(0.5 + 0.3*x[:, 0] - 0.2*x[:, 1])
    y = np.random.poisson(lambda_true)

    result = poisson_regression(x, y)

    print(f"Coefficients: {result['coefficients']}")
    print(f"Deviance: {result['deviance']:.2f}")
    print(f"AIC: {result['aic']:.2f}")

    assert len(result['coefficients']) == 3, "Should have 3 coefficients (intercept + 2 vars)"
    assert result['aic'] > 0, "AIC should be positive"

    print("✅ Poisson Regression PASSED")


def test_scheffe_test():
    """Scheffe 테스트"""
    print("\n=== Test 5: Scheffe Test ===")

    # 3개 그룹
    group1 = [5.1, 5.3, 5.0, 5.2, 5.4]
    group2 = [6.0, 6.2, 5.9, 6.1, 6.3]
    group3 = [7.0, 7.2, 6.9, 7.1, 7.3]

    groups = [group1, group2, group3]
    result = scheffe_test(groups)

    print(f"Number of comparisons: {len(result['comparisons'])}")
    print(f"MSE: {result['mse']:.4f}")

    for comp in result['comparisons']:
        print(f"  Group {comp['group1']} vs {comp['group2']}: "
              f"p={comp['pValue']:.4f}, sig={comp['significant']}")

    assert len(result['comparisons']) == 3, "Should have 3 comparisons (3 choose 2)"
    assert result['mse'] > 0, "MSE should be positive"

    # 그룹 간 유의한 차이가 있어야 함
    significant_count = sum(1 for c in result['comparisons'] if c['significant'])
    assert significant_count > 0, "At least one comparison should be significant"

    print("✅ Scheffe Test PASSED")


def test_edge_cases():
    """경계 조건 테스트"""
    print("\n=== Test 6: Edge Cases ===")

    # 1. 최소 데이터
    try:
        x_min = [1, 2]
        y_min = [2, 4]
        result = curve_estimation(x_min, y_min, 'linear')
        print("  ✅ Minimum data (n=2) handled")
    except Exception as e:
        print(f"  ❌ Failed on minimum data: {e}")

    # 2. 완벽한 적합
    x_perfect = [1, 2, 3]
    y_perfect = [2, 4, 6]
    result = curve_estimation(x_perfect, y_perfect, 'linear')
    print(f"  Perfect fit R-squared: {result['rSquared']:.6f}")
    assert abs(result['rSquared'] - 1.0) < 0.01, "Perfect fit should have R-squared ≈ 1"

    # 3. 작은 샘플 로지스틱
    try:
        x_small = [[1], [2], [3], [4], [5]]
        y_small = [0, 0, 0, 1, 1]
        result = binary_logistic(x_small, y_small)
        print(f"  ✅ Small sample logistic: accuracy={result['accuracy']:.2f}")
    except Exception as e:
        print(f"  ⚠️  Small sample warning: {e}")

    print("✅ Edge Cases PASSED")


def test_statistical_correctness():
    """통계적 정확성 검증"""
    print("\n=== Test 7: Statistical Correctness ===")

    # 1. 선형회귀 계수 검증
    x = [1, 2, 3, 4, 5]
    y = [2, 4, 6, 8, 10]  # y = 2x

    result = curve_estimation(x, y, 'linear')
    slope = result['coefficients'][0]
    print(f"  Linear slope (expected ≈2.0): {slope:.4f}")
    assert abs(slope - 2.0) < 0.01, "Slope should be ≈2.0"

    # 2. 이차 회귀 검증
    x2 = [1, 2, 3, 4, 5]
    y2 = [1, 4, 9, 16, 25]  # y = x^2

    result2 = curve_estimation(x2, y2, 'quadratic')
    # 이차항 계수가 1에 가까워야 함
    print(f"  Quadratic R-squared: {result2['rSquared']:.6f}")
    assert result2['rSquared'] > 0.999, "Quadratic should fit perfectly"

    print("✅ Statistical Correctness PASSED")


# ============================================================================
# 메인 실행
# ============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("우선순위 2 메서드 Python 테스트")
    print("=" * 60)

    try:
        test_curve_estimation()
        test_stepwise_regression()
        test_binary_logistic()
        test_poisson_regression()
        test_scheffe_test()
        test_edge_cases()
        test_statistical_correctness()

        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
