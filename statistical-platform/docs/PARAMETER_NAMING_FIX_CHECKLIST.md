# Parameter Naming Fix Checklist

**목적**: TypeScript-Python 간 파라미터 네이밍 통일 (camelCase)
**원칙**:
- 함수 파라미터: `camelCase` (외부 인터페이스)
- 반환값 키: `camelCase` (외부 인터페이스)
- Python 내부 로컬 변수: `snake_case` (PEP8 준수)

**상태**: ✅ **Phase 2 완료** (2025-12-17)

---

## 수정 이력

### Phase 1 (2025-12-17 이전)
- TypeScript pyodide-statistics.ts: snake_case → camelCase 변환
- Python Worker 1-2: 일부 함수 파라미터 camelCase 통일

### Phase 2 (2025-12-17) - Critical 버그 수정

**문제 발견**: Python 함수들이 camelCase 파라미터로 정의되었으나,
내부에서 snake_case 변수명을 사용하여 `NameError` 발생

**예시**:
```python
# 버그 (수정 전)
def binary_logistic(xMatrix, yValues):
    X = sm.add_constant(np.array(x_matrix))  # NameError: x_matrix 미정의

# 수정 후
def binary_logistic(xMatrix, yValues):
    X = sm.add_constant(np.array(xMatrix))  # 올바른 파라미터 사용
```

---

## Worker4 Critical 버그 수정 목록 (19개)

| # | 함수명 | 수정 내용 | 상태 |
|---|--------|----------|------|
| 1 | `binary_logistic` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 2 | `multinomial_logistic` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 3 | `ordinal_logistic` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 4 | `probit_regression` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 5 | `poisson_regression` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 6 | `negative_binomial_regression` | `x_matrix` → `xMatrix`, `y_values` → `yValues` | ✅ |
| 7 | `_cluster_analysis` | `n_clusters` → `nClusters` | ✅ |
| 8 | `kmeans_clustering` | `n_clusters` → `nClusters` | ✅ |
| 9 | `hierarchical_clustering` | `n_clusters` → `nClusters` | ✅ |
| 10 | `var_model` | `max_lags` → `maxLags` | ✅ |
| 11 | `arima_forecast` | `forecast_periods` → `forecastPeriods` | ✅ |
| 12 | `sarima_forecast` | `forecast_periods` → `forecastPeriods`, `seasonal_period` → `seasonalPeriod` | ✅ |
| 13 | `factor_analysis_method` | `n_factors` → `nFactors` | ✅ |
| 14 | `discriminant_analysis` | `group_labels` → `groups` 및 내부 변수 | ✅ |
| 15 | `dose_response_analysis` | `dose_values`, `response_values` → camelCase | ✅ |
| 16 | `cluster_analysis` | `numClusters` → `nClusters` (일관성) | ✅ |

---

## TypeScript 파라미터 동기화 (pyodide-statistics.ts)

| # | 함수명 | 수정 내용 | 상태 |
|---|--------|----------|------|
| 1 | `timeSeriesAnalysis` | 불필요한 `forecastPeriods`, `method` 파라미터 제거 | ✅ |
| 2 | `pcaAnalysis` | `dataMatrix` → `data` | ✅ |
| 3 | `ksTestOneSample` | `data, distribution` → `values` | ✅ |
| 4 | `ksTestTwoSample` | `data1, data2` → `values1, values2` | ✅ |
| 5 | `discriminantAnalysis` | `dataMatrix, groupLabels` → `data, groups` | ✅ |
| 6 | `coxRegression` | `covariates` → `covariateData` | ✅ |

---

## Methods Registry 동기화 (methods-registry.json)

| 메서드 | 수정 내용 | 상태 |
|--------|----------|------|
| `cluster_analysis` | params: `numClusters` → `nClusters` | ✅ |
| `time_series_analysis` | returns: 실제 Python 반환값과 일치 | ✅ |

---

## 검증 결과

- [x] TypeScript 컴파일: `npx tsc --noEmit` → **0 errors** ✅
- [x] Worker 함수 매핑 테스트: `npm test worker-function-mapping` → **PASS** ✅
- [x] Methods Registry 테스트: `npm test methods-registry` → **PASS** ✅

---

## 규칙 요약 (CLAUDE.md 기준)

```python
# ✅ Python Worker 올바른 예시
def binomialTest(successCount, totalCount, probability=0.5):  # 파라미터: camelCase
    # 내부 변수: snake_case (PEP8)
    p_value = binom_result.pvalue
    success_rate = successCount / totalCount

    # 반환 키: camelCase
    return {
        'pValue': float(p_value),
        'successCount': int(successCount),
        'proportion': float(success_rate)
    }

# ❌ 금지 (파라미터와 내부 사용 불일치)
def binomialTest(successCount, totalCount):
    p_value = binom_result.pvalue
    return { 'successCount': success_count }  # NameError: success_count 미정의
```

```typescript
// ✅ TypeScript 호출 예시
callWorkerMethod(2, 'binomialTest', {
  successCount: 10,  // camelCase - Python 파라미터와 일치
  totalCount: 100,
  probability: 0.5
})
```

---

## 향후 예방 조치

1. **자동 테스트**: `worker-function-mapping.test.ts`가 TypeScript-Python 파라미터 일치 검증
2. **코드 리뷰**: Python 함수 수정 시 파라미터명 = 내부 사용명 확인
3. **Methods Registry**: SSOT로 모든 파라미터 정의 관리

---

**Updated**: 2025-12-17 | **Phase**: 2 Complete
