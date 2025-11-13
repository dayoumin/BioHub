# Batch 2: Legacy Pyodide → PyodideCore 변환 계획

**작성일**: 2025-11-13
**목표**: Legacy Pyodide 패턴 6개 페이지를 PyodideCore 표준으로 변환

---

## 📋 Phase 1: Python 코드 분석

### 페이지별 사용 함수 분석

| # | 페이지 | Worker | 주요 함수 | 상태 |
|---|--------|--------|----------|------|
| 1 | ks-test | 1 | stats.kstest() | 🔍 분석 중 |
| 2 | mann-kendall | 1 | stats.kendalltau() | 🔍 분석 중 |
| 3 | means-plot | 1 | pg.plot_paired() | 🔍 분석 중 |
| 4 | partial-correlation | 2 | pg.partial_corr() | 🔍 분석 중 |
| 5 | response-surface | 2 | scipy.optimize.curve_fit() | 🔍 분석 중 |
| 6 | stepwise | 2 | statsmodels.api.OLS() | 🔍 분석 중 |

---

## 📝 페이지 상세 분석

### 1. ks-test (Kolmogorov-Smirnov Test)

**현재 구현**:
```python
# stats.kstest(values, 'norm', args=(mean, std))
```

**Worker 1 메서드 필요**:
- `ks_test_one_sample(values: List[float]) -> Dict`
  - 입력: 데이터 배열
  - 출력: statistic, pValue, criticalValue, significant
  - scipy.stats.kstest 사용

**복잡도**: ⭐ (낮음) - 이미 Worker 1에 kolmogorov_smirnov_test() 존재 확인 필요

---

### 2. mann-kendall (Mann-Kendall Trend Test)

**현재 구현**:
```python
# stats.kendalltau(range(n), data)
```

**Worker 1 메서드 필요**:
- `mann_kendall_test(data: List[float]) -> Dict`
  - 입력: 시계열 데이터
  - 출력: tau, pValue, trend
  - scipy.stats.kendalltau 사용

**복잡도**: ⭐ (낮음)

---

### 3. means-plot

**현재 구현**:
```python
# pingouin.plot_paired() 예상
```

**Worker 1 메서드 필요**:
- `means_plot_data(data: List[float]) -> Dict`
  - 입력: 대응표본 데이터
  - 출력: 평균, 표준편차 등 플롯 데이터
  - pingouin 또는 numpy 사용

**복잡도**: ⭐⭐ (중간) - 페이지 확인 필요

---

### 4. partial-correlation

**현재 구현**:
```python
# pingouin.partial_corr() 예상
```

**Worker 2 메서드 필요**:
- `partial_correlation(x, y, covar) -> Dict`
  - 입력: 2개 변수 + 통제변수
  - 출력: r, pValue, ci
  - pingouin.partial_corr 사용

**복잡도**: ⭐⭐ (중간)

---

### 5. response-surface

**현재 구현**:
```python
# scipy.optimize.curve_fit() 예상
```

**Worker 2 메서드 필요**:
- `response_surface_fit(x, y, z) -> Dict`
  - 입력: 독립변수 2개 + 종속변수
  - 출력: 계수, R², 예측값
  - scipy.optimize.curve_fit 사용

**복잡도**: ⭐⭐⭐ (높음) - 곡면 피팅 복잡

---

### 6. stepwise (Stepwise Regression)

**현재 구현**:
```python
# statsmodels.api.OLS() + 단계적 선택
```

**Worker 2 메서드 필요**:
- `stepwise_regression(X, y, method='forward') -> Dict`
  - 입력: 독립변수 행렬 + 종속변수
  - 출력: 선택된 변수, 계수, R²
  - statsmodels.api.OLS 반복 사용

**복잡도**: ⭐⭐⭐⭐ (매우 높음) - 알고리즘 구현 필요

---

## 🎯 Phase 2: 구현 계획

### 우선순위

**High Priority** (간단, 빠른 구현):
1. ks-test ⭐
2. mann-kendall ⭐

**Medium Priority** (중간 복잡도):
3. means-plot ⭐⭐
4. partial-correlation ⭐⭐

**Low Priority** (복잡, 시간 소요):
5. response-surface ⭐⭐⭐
6. stepwise ⭐⭐⭐⭐

### 작업 순서

**Step 1**: High Priority 2개 완료 (30분)
- Worker 1에 ks_test, mann_kendall_test 추가
- ks-test, mann-kendall 페이지 변환

**Step 2**: Medium Priority 2개 완료 (1시간)
- Worker 1에 means_plot_data 추가
- Worker 2에 partial_correlation 추가
- means-plot, partial-correlation 페이지 변환

**Step 3**: Low Priority 2개 (2시간+)
- Worker 2에 response_surface_fit, stepwise_regression 추가
- response-surface, stepwise 페이지 변환

---

## ✅ 다음 단계

1. [ ] Phase 1 완료: 6개 페이지 Python 코드 상세 확인
2. [ ] Phase 2: Worker 1 메서드 2개 구현 (ks_test, mann_kendall_test)
3. [ ] Phase 3: ks-test, mann-kendall 페이지 변환
4. [ ] Phase 4: TypeScript 컴파일 검증
5. [ ] Phase 5: 커밋

---

**진행 상황**: Phase 1 분석 중
**예상 소요 시간**: 3-4시간
