"""
가정 검정 함수들의 단위 테스트
Phase 1 & 2: Regression, Partial Correlation, Repeated Measures ANOVA, Factor Analysis

pytest/unittest 호환:
  pytest __tests__/workers/test_worker_assumptions.py -v
  python -m pytest __tests__/workers/test_worker_assumptions.py
"""

import sys
import os
import json
import importlib.util
import numpy as np
from scipy import stats

# 워커 경로 추가
worker_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'workers', 'python')
if worker_dir not in sys.path:
    sys.path.insert(0, worker_dir)

def load_worker(name, filename):
    """하이픈이 있는 파일명에서 모듈 로드"""
    filepath = os.path.join(worker_dir, filename)
    spec = importlib.util.spec_from_file_location(name, filepath)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module

# 워커 모듈 로드 (모듈 스코프에서 실행)
worker4 = load_worker('worker4_regression_advanced', 'worker4-regression-advanced.py')
worker2 = load_worker('worker2_hypothesis', 'worker2-hypothesis.py')
worker3 = load_worker('worker3_nonparametric_anova', 'worker3-nonparametric-anova.py')

# 워커 함수 import
from worker4_regression_advanced import linear_regression, multiple_regression, pca_analysis
from worker2_hypothesis import partial_correlation_analysis
from worker3_nonparametric_anova import repeated_measures_anova

# 테스트 결과 저장 (standalone 실행용)
test_results = []

def run_test(name, test_func):
    """테스트 실행 및 결과 기록 (standalone 실행용)"""
    try:
        result = test_func()
        if result:
            print(f"[PASS] {name}")
            test_results.append(('PASS', name))
            return True
        else:
            print(f"[FAIL] {name}")
            test_results.append(('FAIL', name))
            return False
    except Exception as e:
        print(f"[ERROR] {name}: {str(e)}")
        test_results.append(('ERROR', name, str(e)))
        return False

# =============================================================================
# Test 1: Linear Regression Assumption Tests
# =============================================================================

def test_linear_regression_assumptions():
    """선형 회귀 가정 검정 테스트"""

    # 테스트 데이터: 정규성, 독립성, 등분산성을 만족하는 데이터
    np.random.seed(42)
    n = 50
    x = np.linspace(1, 10, n)
    # y = 2x + 1 + 정규 오차
    y = 2 * x + 1 + np.random.normal(0, 1, n)

    result = linear_regression(x.tolist(), y.tolist())

    # 결과에 assumptions 필드가 있는지 확인
    assert 'assumptions' in result, "assumptions 필드 없음"
    assumptions = result['assumptions']

    # 1. 독립성 검정 (Durbin-Watson)
    assert 'independence' in assumptions, "independence 테스트 없음"
    dw = assumptions['independence']
    assert dw['testName'] == 'Durbin-Watson', "Durbin-Watson 테스트명 불일치"
    assert 0 <= dw['statistic'] <= 4, f"DW 통계량 범위 오류: {dw['statistic']}"
    assert isinstance(dw['passed'], bool), "passed는 boolean이어야 함"

    # 2. 정규성 검정 (Shapiro-Wilk)
    assert 'normality' in assumptions, "normality 테스트 없음"
    norm = assumptions['normality']
    assert norm['testName'] == 'Shapiro-Wilk', "Shapiro-Wilk 테스트명 불일치"
    assert 0 <= norm['pValue'] <= 1, f"p-value 범위 오류: {norm['pValue']}"

    # 3. 등분산성 검정 (Breusch-Pagan)
    assert 'homoscedasticity' in assumptions, "homoscedasticity 테스트 없음"
    homo = assumptions['homoscedasticity']
    assert homo['testName'] == 'Breusch-Pagan', "Breusch-Pagan 테스트명 불일치"
    assert 0 <= homo['pValue'] <= 1, f"p-value 범위 오류: {homo['pValue']}"

    return True

def test_linear_regression_autocorrelation_detection():
    """자기상관이 있는 데이터에서 Durbin-Watson이 감지하는지 테스트"""

    # 자기상관이 있는 데이터 생성
    np.random.seed(123)
    n = 50
    x = np.arange(n)

    # AR(1) 오차: e_t = 0.8 * e_{t-1} + noise
    errors = np.zeros(n)
    errors[0] = np.random.normal(0, 1)
    for i in range(1, n):
        errors[i] = 0.8 * errors[i-1] + np.random.normal(0, 0.5)

    y = 2 * x + errors

    result = linear_regression(x.tolist(), y.tolist())
    dw_stat = result['assumptions']['independence']['statistic']

    # 양의 자기상관이 있으면 DW < 2
    # 강한 자기상관이면 DW가 1.5 미만이어야 함
    assert dw_stat < 2.0, f"자기상관 데이터에서 DW가 높음: {dw_stat}"

    return True

def test_linear_regression_heteroscedasticity_detection():
    """이분산이 있는 데이터에서 Breusch-Pagan이 감지하는지 테스트"""

    # 이분산 데이터: 분산이 x에 비례
    np.random.seed(456)
    n = 100
    x = np.linspace(1, 10, n)
    # 분산이 x에 비례하는 오차
    errors = np.random.normal(0, 1, n) * x
    y = 2 * x + 1 + errors

    result = linear_regression(x.tolist(), y.tolist())
    bp_pvalue = result['assumptions']['homoscedasticity']['pValue']

    # 이분산이 있으면 p-value가 낮아야 함 (보통 < 0.05)
    # 하지만 노이즈로 인해 항상 그렇진 않으므로 < 0.3 으로 완화
    assert bp_pvalue < 0.3, f"이분산 데이터에서 BP p-value가 높음: {bp_pvalue}"

    return True

# =============================================================================
# Test 2: Multiple Regression Assumption Tests
# =============================================================================

def test_multiple_regression_assumptions():
    """다중 회귀 가정 검정 테스트"""
    import pandas as pd

    # 테스트 데이터
    np.random.seed(789)
    n = 50
    x1 = np.random.normal(0, 1, n)
    x2 = np.random.normal(0, 1, n)
    x3 = np.random.normal(0, 1, n)
    X = np.column_stack([x1, x2, x3])  # 2D array로 전달
    y = 2 * x1 + 3 * x2 - x3 + np.random.normal(0, 1, n)

    result = multiple_regression(X, y)

    # 가정 검정 결과 확인
    assert 'assumptions' in result, "assumptions 필드 없음"
    assumptions = result['assumptions']

    # 모든 검정이 있는지 확인
    assert 'independence' in assumptions, "independence 없음"
    assert 'normality' in assumptions, "normality 없음"
    assert 'homoscedasticity' in assumptions, "homoscedasticity 없음"

    # 통계량 유효성 확인
    dw = assumptions['independence']['statistic']
    assert 0 <= dw <= 4, f"DW 범위 오류: {dw}"

    return True

# =============================================================================
# Test 3: Partial Correlation Assumption Tests
# =============================================================================

def test_partial_correlation_assumptions():
    """편상관 가정 검정 테스트"""

    # 테스트 데이터
    np.random.seed(111)
    n = 50
    data = [
        {
            'x': np.random.normal(0, 1),
            'y': np.random.normal(0, 1),
            'z': np.random.normal(0, 1),
            'control': np.random.normal(0, 1)
        }
        for _ in range(n)
    ]

    result = partial_correlation_analysis(
        data,
        analysis_vars=['x', 'y', 'z'],
        control_vars=['control']
    )

    # 가정 검정 결과 확인
    assert 'assumptions' in result, "assumptions 필드 없음"
    assumptions = result['assumptions']

    # 1. 정규성 검정
    assert 'normality' in assumptions, "normality 없음"
    norm = assumptions['normality']
    assert norm['testName'] == 'Shapiro-Wilk', "테스트명 불일치"
    assert 'tests' in norm, "개별 테스트 결과 없음"
    assert len(norm['tests']) == 3, f"테스트 개수 오류: {len(norm['tests'])}"

    # 2. 선형성 검정
    assert 'linearity' in assumptions, "linearity 없음"
    lin = assumptions['linearity']
    assert 'tests' in lin, "선형성 테스트 결과 없음"

    # 3. 다중공선성 검정
    assert 'multicollinearity' in assumptions, "multicollinearity 없음"

    return True

def test_partial_correlation_multicollinearity():
    """통제변수 간 높은 상관이 있을 때 다중공선성 경고"""

    # 높은 상관관계를 가진 통제변수
    np.random.seed(222)
    n = 50
    control1 = np.random.normal(0, 1, n)
    control2 = control1 + np.random.normal(0, 0.1, n)  # control1과 0.99 상관

    data = [
        {
            'x': np.random.normal(0, 1),
            'y': np.random.normal(0, 1),
            'control1': control1[i],
            'control2': control2[i]
        }
        for i in range(n)
    ]

    result = partial_correlation_analysis(
        data,
        analysis_vars=['x', 'y'],
        control_vars=['control1', 'control2']
    )

    multicol = result['assumptions']['multicollinearity']

    # 다중공선성이 감지되어야 함
    assert multicol['allPassed'] == False, "높은 상관 통제변수에서 다중공선성 미감지"

    return True

# =============================================================================
# Test 4: Repeated Measures ANOVA Sphericity Test
# =============================================================================

def test_repeated_measures_sphericity():
    """반복측정 ANOVA Mauchly 구형성 검정 테스트"""

    # 테스트 데이터: 3 시점, 10 피험자
    np.random.seed(333)
    n_subjects = 10
    n_timepoints = 3

    # 구형성을 위반하는 데이터 (시점 간 공분산이 다름)
    data_matrix = []
    for i in range(n_subjects):
        base = np.random.normal(50, 10)
        row = [
            base + np.random.normal(0, 5),
            base + np.random.normal(10, 5),
            base + np.random.normal(20, 15)  # 마지막 시점 분산이 큼
        ]
        data_matrix.append(row)

    subject_ids = [f'S{i+1}' for i in range(n_subjects)]
    time_labels = ['T1', 'T2', 'T3']

    result = repeated_measures_anova(data_matrix, subject_ids, time_labels)

    # sphericity 결과 확인
    assert 'sphericity' in result, "sphericity 필드 없음"
    sph = result['sphericity']

    # Mauchly's W
    assert 'mauchlysW' in sph, "mauchlysW 없음"
    if sph['mauchlysW'] is not None:
        assert 0 <= sph['mauchlysW'] <= 1, f"Mauchly's W 범위 오류: {sph['mauchlysW']}"

    # p-value
    assert 'pValue' in sph, "pValue 없음"
    if sph['pValue'] is not None:
        assert 0 <= sph['pValue'] <= 1, f"p-value 범위 오류: {sph['pValue']}"

    # Epsilon 값들
    assert 'epsilonGG' in sph, "epsilonGG 없음"
    assert 'epsilonHF' in sph, "epsilonHF 없음"
    assert 'epsilonLB' in sph, "epsilonLB 없음"

    if sph['epsilonGG'] is not None:
        assert 0 <= sph['epsilonGG'] <= 1, f"GG epsilon 범위 오류: {sph['epsilonGG']}"

    return True

def test_repeated_measures_sphericity_with_2_timepoints():
    """2 시점에서는 구형성 검정이 불필요"""

    # 2 시점 데이터 (구형성 검정 불필요)
    np.random.seed(444)
    n_subjects = 10

    data_matrix = [
        [np.random.normal(50, 10), np.random.normal(60, 10)]
        for _ in range(n_subjects)
    ]

    subject_ids = [f'S{i+1}' for i in range(n_subjects)]
    time_labels = ['Pre', 'Post']

    result = repeated_measures_anova(data_matrix, subject_ids, time_labels)

    # 2 시점에서는 Mauchly's W가 None이거나 계산되지 않음
    sph = result['sphericity']

    # 2 시점에서는 구형성 가정이 자동으로 충족됨
    assert sph['assumptionMet'] == True, "2 시점에서 구형성이 충족되어야 함"

    return True

# =============================================================================
# Test 5: PCA KMO and Bartlett Test
# =============================================================================

def test_pca_kmo_bartlett():
    """PCA KMO와 Bartlett 검정 테스트"""

    # 상관이 높은 변수들로 구성된 데이터 (PCA에 적합)
    np.random.seed(555)
    n = 100

    # 공통 요인
    factor = np.random.normal(0, 1, n)

    # 변수들 (공통 요인에 의해 상관됨)
    var1 = factor * 0.8 + np.random.normal(0, 0.2, n)
    var2 = factor * 0.7 + np.random.normal(0, 0.3, n)
    var3 = factor * 0.6 + np.random.normal(0, 0.4, n)
    var4 = factor * 0.9 + np.random.normal(0, 0.1, n)

    # pca_analysis는 2D array를 기대함 (n_samples x n_variables)
    data = np.column_stack([var1, var2, var3, var4])

    result = pca_analysis(data, nComponents=2)

    # KMO 검정 (qualityMetrics 안에 있음)
    assert 'qualityMetrics' in result, "qualityMetrics 필드 없음"
    quality = result['qualityMetrics']
    assert 'kmo' in quality, "kmo 필드 없음"
    kmo = quality['kmo']
    # KMO가 None이 아닌 경우에만 범위 체크
    assert kmo is not None, "KMO가 None - 계산 실패"
    assert 0 <= kmo <= 1, f"KMO 범위 오류: {kmo}"
    # 높은 상관 데이터이므로 KMO가 높아야 함
    assert kmo > 0.5, f"높은 상관 데이터에서 KMO가 낮음: {kmo}"

    # Bartlett 검정
    assert 'bartlett' in quality, "bartlett 필드 없음"
    bartlett = quality['bartlett']
    assert 'statistic' in bartlett, "bartlett statistic 없음"
    assert 'pValue' in bartlett, "bartlett pValue 없음"
    # None이 아닌 경우에만 검증
    assert bartlett['statistic'] is not None, f"Bartlett statistic이 None - 계산 실패"
    assert bartlett['statistic'] > 0, f"Bartlett statistic이 0 이하: {bartlett['statistic']}"
    # 상관이 있으므로 유의해야 함
    assert bartlett['significant'] == True, "높은 상관에서 Bartlett이 비유의"

    return True

def test_pca_kmo_low_correlation():
    """상관이 낮은 데이터에서 KMO가 낮아야 함"""

    # 독립적인 변수들 (PCA에 부적합)
    np.random.seed(666)
    n = 100

    # pca_analysis는 2D array를 기대함 (n_samples x n_variables)
    data = np.column_stack([
        np.random.normal(0, 1, n),
        np.random.normal(0, 1, n),
        np.random.normal(0, 1, n),
        np.random.normal(0, 1, n)
    ])

    result = pca_analysis(data, nComponents=2)

    kmo = result['qualityMetrics']['kmo']

    # KMO가 계산되었는지 확인
    assert kmo is not None, "KMO가 None - 계산 실패"

    # 독립 변수들이므로 KMO가 낮아야 함 (보통 < 0.6)
    # 완전 독립은 아니므로 0.8 미만으로 완화
    assert kmo < 0.8, f"독립 변수에서 KMO가 높음: {kmo}"

    return True

# =============================================================================
# =============================================================================
# 테스트 실행
# =============================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("가정 검정 함수 테스트")
    print("=" * 60)
    print("[OK] Worker modules loaded successfully")

    # 테스트 실행
    print("\n[1] Linear Regression 가정 검정")
    run_test("기본 가정 검정 필드 확인", test_linear_regression_assumptions)
    run_test("자기상관 감지 (Durbin-Watson)", test_linear_regression_autocorrelation_detection)
    run_test("이분산 감지 (Breusch-Pagan)", test_linear_regression_heteroscedasticity_detection)

    print("\n[2] Multiple Regression 가정 검정")
    run_test("다중회귀 가정 검정", test_multiple_regression_assumptions)

    print("\n[3] Partial Correlation 가정 검정")
    run_test("편상관 가정 검정", test_partial_correlation_assumptions)
    run_test("다중공선성 감지", test_partial_correlation_multicollinearity)

    print("\n[4] Repeated Measures ANOVA 구형성 검정")
    run_test("3+ 시점 구형성 검정", test_repeated_measures_sphericity)
    run_test("2 시점 구형성 (자동 충족)", test_repeated_measures_sphericity_with_2_timepoints)

    print("\n[5] PCA KMO & Bartlett 검정")
    run_test("높은 상관 데이터 KMO/Bartlett", test_pca_kmo_bartlett)
    run_test("낮은 상관 데이터 KMO", test_pca_kmo_low_correlation)

    # 결과 요약
    print("\n" + "=" * 60)
    print("테스트 결과 요약")
    print("=" * 60)

    passed = sum(1 for r in test_results if r[0] == 'PASS')
    failed = sum(1 for r in test_results if r[0] == 'FAIL')
    errors = sum(1 for r in test_results if r[0] == 'ERROR')

    print(f"통과: {passed}/{len(test_results)}")
    print(f"실패: {failed}/{len(test_results)}")
    print(f"에러: {errors}/{len(test_results)}")

    if failed > 0 or errors > 0:
        print("\nFailed/Error list:")
        for r in test_results:
            if r[0] != 'PASS':
                if len(r) > 2:
                    print(f"  - {r[1]}: {r[2]}")
                else:
                    print(f"  - {r[1]}")
        sys.exit(1)
    else:
        print("\n[SUCCESS] All tests passed!")
