"""
Worker 1-4 Critical Bug Fix 검증 테스트

주요 검증 사항:
1. binomtest (SciPy 1.12+ 호환)
2. 쌍(pair) 손실 방지
3. 에러 처리
4. PCA NumPy SVD 구현
"""

import sys
import numpy as np
from scipy import stats

# 테스트 결과 저장
results = []

def test_case(name, func):
    """테스트 케이스 실행"""
    try:
        func()
        results.append(f"✅ {name}")
        return True
    except Exception as e:
        results.append(f"❌ {name}: {e}")
        return False


# ===========================================
# Worker 1: Descriptive Tests
# ===========================================

def test_worker1_binomtest():
    """Worker 1: binomtest 사용 (SciPy 1.12+ 호환)"""
    from worker1_descriptive import one_sample_proportion_test
    
    result = one_sample_proportion_test(60, 100, 0.5)
    
    assert 'pValueExact' in result
    assert isinstance(result['pValueExact'], float)
    assert result['sampleProportion'] == 0.6

def test_worker1_iqr_optimization():
    """Worker 1: IQR 중복 계산 최적화 확인"""
    from worker1_descriptive import descriptive_stats
    
    data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    result = descriptive_stats(data)
    
    # IQR = Q3 - Q1 확인
    expected_iqr = result['q3'] - result['q1']
    assert abs(result['iqr'] - expected_iqr) < 0.001


# ===========================================
# Worker 2: Hypothesis Tests
# ===========================================

def test_worker2_binomtest():
    """Worker 2: binomtest 사용 (SciPy 1.12+ 호환)"""
    from worker2_hypothesis import binomial_test
    
    result = binomial_test(7, 10, 0.5)
    
    assert 'pValue' in result
    assert isinstance(result['pValue'], float)

def test_worker2_paired_ttest_correct():
    """Worker 2: 대응표본 t-검정 쌍 손실 방지"""
    from worker2_hypothesis import t_test_paired
    
    # None이 있는 쌍 데이터
    values1 = [10, None, 30, 40]
    values2 = [12, 15, None, 42]
    
    result = t_test_paired(values1, values2)
    
    # 유효한 쌍은 (10, 12), (40, 42) → 2쌍
    assert result['nPairs'] == 2
    assert 'statistic' in result
    assert 'pValue' in result

def test_worker2_partial_corr_error_handling():
    """Worker 2: 부분상관 에러 처리 확인"""
    from worker2_hypothesis import partial_correlation
    
    # 특이행렬 (모든 열이 같음)
    data_matrix = [
        [1, 1, 1],
        [2, 2, 2],
        [3, 3, 3]
    ]
    
    try:
        result = partial_correlation(data_matrix, 0, 1, [2])
        # 특이행렬이므로 에러 발생해야 함
        assert False, "Should raise ValueError for singular matrix"
    except ValueError as e:
        assert "Singular matrix" in str(e)


# ===========================================
# Worker 3: Nonparametric & ANOVA Tests
# ===========================================

def test_worker3_wilcoxon_correct():
    """Worker 3: Wilcoxon 검정 쌍 손실 방지"""
    from worker3_nonparametric_anova import wilcoxon_test
    
    # None이 있는 쌍 데이터
    values1 = [10, None, 30, 40, 50]
    values2 = [12, 15, None, 42, None]
    
    result = wilcoxon_test(values1, values2)
    
    # 유효한 쌍은 (10, 12), (40, 42) → 2쌍
    assert result['nPairs'] == 2
    assert 'statistic' in result
    assert 'pValue' in result


# ===========================================
# Worker 4: Regression & Advanced Tests
# ===========================================

def test_worker4_linear_regression_correct():
    """Worker 4: 선형회귀 쌍 손실 방지"""
    from worker4_regression_advanced import linear_regression
    
    # None이 있는 쌍 데이터
    x = [1, None, 3, 4, 5]
    y = [2, 4, None, 8, 10]
    
    result = linear_regression(x, y)
    
    # 유효한 쌍은 (1,2), (4,8), (5,10) → 3쌍
    assert result['nPairs'] == 3
    assert 'slope' in result
    assert 'rSquared' in result

def test_worker4_pca_numpy():
    """Worker 4: PCA NumPy SVD 구현 확인"""
    from worker4_regression_advanced import pca_analysis
    
    # 간단한 데이터
    data = [
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
        [4, 5, 6]
    ]
    
    result = pca_analysis(data, n_components=2)
    
    assert 'components' in result
    assert 'explainedVarianceRatio' in result
    assert 'cumulativeVariance' in result
    assert 'loadings' in result  # 새로 추가된 필드
    assert len(result['components']) == 4  # 4개 관측치
    assert len(result['components'][0]) == 2  # 2개 주성분

def test_worker4_multiple_regression_error():
    """Worker 4: 다중회귀 에러 처리 확인"""
    from worker4_regression_advanced import multiple_regression
    
    # 특이행렬 (모든 행이 같음)
    X = [
        [1, 2],
        [1, 2],
        [1, 2]
    ]
    y = [3, 3, 3]
    
    try:
        result = multiple_regression(X, y)
        # 특이행렬이므로 에러 발생해야 함
        assert False, "Should raise ValueError for singular matrix"
    except ValueError as e:
        assert "Singular matrix" in str(e)


# ===========================================
# 테스트 실행
# ===========================================

if __name__ == "__main__":
    print("=" * 60)
    print("Worker 1-4 Critical Bug Fix 검증 테스트")
    print("=" * 60)
    print()
    
    # Worker 1 테스트
    print("📋 Worker 1: Descriptive Statistics")
    test_case("binomtest (SciPy 1.12+ 호환)", test_worker1_binomtest)
    test_case("IQR 중복 계산 최적화", test_worker1_iqr_optimization)
    print()
    
    # Worker 2 테스트
    print("📋 Worker 2: Hypothesis Testing")
    test_case("binomtest (SciPy 1.12+ 호환)", test_worker2_binomtest)
    test_case("대응표본 t-검정 쌍 손실 방지", test_worker2_paired_ttest_correct)
    test_case("부분상관 에러 처리", test_worker2_partial_corr_error_handling)
    print()
    
    # Worker 3 테스트
    print("📋 Worker 3: Nonparametric & ANOVA")
    test_case("Wilcoxon 검정 쌍 손실 방지", test_worker3_wilcoxon_correct)
    print()
    
    # Worker 4 테스트
    print("📋 Worker 4: Regression & Advanced")
    test_case("선형회귀 쌍 손실 방지", test_worker4_linear_regression_correct)
    test_case("PCA NumPy SVD 구현", test_worker4_pca_numpy)
    test_case("다중회귀 에러 처리", test_worker4_multiple_regression_error)
    print()
    
    # 결과 출력
    print("=" * 60)
    print("테스트 결과")
    print("=" * 60)
    for result in results:
        print(result)
    
    # 통계
    passed = sum(1 for r in results if r.startswith("✅"))
    failed = sum(1 for r in results if r.startswith("❌"))
    total = len(results)
    
    print()
    print(f"총 {total}개 테스트: {passed}개 통과, {failed}개 실패")
    print(f"통과율: {passed/total*100:.1f}%")
    
    sys.exit(0 if failed == 0 else 1)
