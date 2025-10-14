"""
간단한 수정 사항 검증 (NumPy 버전 의존성 최소화)

핵심 검증:
1. binomtest import 확인
2. 쌍 손실 방지 로직 검증
"""

print("=" * 60)
print("Worker 1-4 수정 사항 간단 검증")
print("=" * 60)
print()

# Test 1: Import 확인
print("1️⃣ Import 확인")
try:
    from worker1_descriptive import one_sample_proportion_test
    from worker2_hypothesis import binomial_test, t_test_paired
    from worker3_nonparametric_anova import wilcoxon_test
    from worker4_regression_advanced import linear_regression, pca_analysis
    print("✅ 모든 Worker import 성공")
except Exception as e:
    print(f"❌ Import 실패: {e}")
    exit(1)

print()

# Test 2: 쌍 손실 방지 로직 확인
print("2️⃣ 쌍 손실 방지 로직 확인")
print()

# Worker 2: t_test_paired
print("  Worker 2: t_test_paired")
try:
    # None이 있는 쌍 데이터
    values1 = [10, None, 30, 40]
    values2 = [12, 15, None, 42]
    
    result = t_test_paired(values1, values2)
    
    if 'nPairs' in result and result['nPairs'] == 2:
        print(f"  ✅ 쌍 손실 방지 확인: 유효한 쌍 {result['nPairs']}개")
    else:
        print(f"  ❌ 쌍 손실 방지 실패: {result.get('nPairs', 'nPairs 없음')}")
except Exception as e:
    print(f"  ❌ 테스트 실패: {e}")

print()

# Worker 3: wilcoxon_test
print("  Worker 3: wilcoxon_test")
try:
    values1 = [10, None, 30, 40, 50]
    values2 = [12, 15, None, 42, None]
    
    result = wilcoxon_test(values1, values2)
    
    if 'nPairs' in result and result['nPairs'] == 2:
        print(f"  ✅ 쌍 손실 방지 확인: 유효한 쌍 {result['nPairs']}개")
    else:
        print(f"  ❌ 쌍 손실 방지 실패: {result.get('nPairs', 'nPairs 없음')}")
except Exception as e:
    print(f"  ❌ 테스트 실패: {e}")

print()

# Worker 4: linear_regression
print("  Worker 4: linear_regression")
try:
    x = [1, None, 3, 4, 5]
    y = [2, 4, None, 8, 10]
    
    result = linear_regression(x, y)
    
    if 'nPairs' in result and result['nPairs'] == 3:
        print(f"  ✅ 쌍 손실 방지 확인: 유효한 쌍 {result['nPairs']}개")
        print(f"  ✅ 회귀분석 성공: slope={result['slope']:.3f}, R²={result['rSquared']:.3f}")
    else:
        print(f"  ❌ 쌍 손실 방지 실패: {result.get('nPairs', 'nPairs 없음')}")
except Exception as e:
    print(f"  ❌ 테스트 실패: {e}")

print()

# Test 3: PCA NumPy 구현 확인
print("3️⃣ PCA NumPy SVD 구현 확인")
try:
    data = [
        [1, 2, 3],
        [2, 3, 4],
        [3, 4, 5],
        [4, 5, 6]
    ]
    
    result = pca_analysis(data, n_components=2)
    
    required_fields = ['components', 'explainedVarianceRatio', 'cumulativeVariance', 'loadings']
    missing_fields = [f for f in required_fields if f not in result]
    
    if not missing_fields:
        print(f"  ✅ PCA 성공: {len(result['components'])}개 관측치, {len(result['components'][0])}개 주성분")
        print(f"  ✅ 누적 설명 분산: {result['cumulativeVariance']}")
    else:
        print(f"  ❌ PCA 실패: 누락된 필드 {missing_fields}")
except Exception as e:
    print(f"  ❌ 테스트 실패: {e}")

print()
print("=" * 60)
print("검증 완료")
print("=" * 60)
