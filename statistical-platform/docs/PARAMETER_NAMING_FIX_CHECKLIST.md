# Parameter Naming Fix Checklist

**목적**: TypeScript 래퍼에서 불필요한 snake_case 변환 제거
**원칙**: Python (camelCase) ↔ TypeScript (camelCase) 통일
**상태**: ✅ **완료** (2025-12-17)

---

## Worker 1 (worker1-descriptive.py)

| # | TS Line | 함수명 | 현재 TS 전송 | Python 파라미터 | 상태 |
|---|---------|--------|-------------|----------------|------|
| 1 | 624 | `crosstab_analysis` | `row_values`, `col_values` | `row_values`, `col_values` | ⚠️ Python도 snake |
| 2 | 658 | `one_sample_proportion_test` | `success_count`, `total_count`, `null_proportion` | `successCount`, `totalCount`, `nullProportion` | ❌ 수정필요 |
| 3 | 678 | `cronbach_alpha` | `items_matrix` | `itemsMatrix` | ❌ 수정필요 |

---

## Worker 2 (worker2-hypothesis.py)

| # | TS Line | 함수명 | 현재 TS 전송 | Python 파라미터 | 상태 |
|---|---------|--------|-------------|----------------|------|
| 4 | 760 | `t_test_two_sample` | `equal_var` | `equal_var` | ⚠️ Python도 snake |
| 5 | 943 | `chi_square_test` | `observed_matrix`, `yates_correction` | `observed_matrix`, `yates_correction` | ⚠️ Python도 snake |
| 6 | 967-972 | `binomial_test` | `success_count`, `total_count` | `successCount`, `totalCount` | ❌ 수정필요 |
| 7 | 1009-1012 | `partial_correlation` | `data_matrix`, `x_idx`, `y_idx`, `control_indices` | `dataMatrix`, `xIdx`, `yIdx`, `controlIndices` | ❌ 수정필요 |

---

## Worker 3 (worker3-nonparametric-anova.py)

| # | TS Line | 함수명 | 현재 TS 전송 | Python 파라미터 | 상태 |
|---|---------|--------|-------------|----------------|------|
| 8 | 1506 | `two_way_anova` | `data_values`, `factor1_values`, `factor2_values` | `dataValues`, `factor1Values`, `factor2Values` | ❌ 수정필요 |
| 9 | 1616 | `dunn_test` | `p_adjust` | `pAdjust` | ❌ 수정필요 |
| 10 | 1835 | `two_way_anova` (중복?) | `data_values`, `factor1_values`, `factor2_values` | `dataValues`, `factor1Values`, `factor2Values` | ❌ 수정필요 |
| 11 | 1923 | `mcnemar_test` | `contingency_table` | `contingencyTable` | ❌ 수정필요 |
| 12 | 1940 | `cochran_q_test` | `data_matrix` | `dataMatrix` | ❌ 수정필요 |
| 13 | 1978 | `repeated_measures_anova` | `data_matrix`, `subject_ids`, `time_labels` | `dataMatrix`, `subjectIds`, `timeLabels` | ❌ 수정필요 |
| 14 | 1995 | `ancova` | `y_values`, `group_values` | `yValues`, `groupValues` | ❌ 수정필요 |
| 15 | 2016 | `manova` | `data_matrix`, `group_values`, `var_names` | `dataMatrix`, `groupValues`, `varNames` | ❌ 수정필요 |

---

## Worker 4 (worker4-regression-advanced.py)

| # | TS Line | 함수명 | 현재 TS 전송 | Python 파라미터 | 상태 |
|---|---------|--------|-------------|----------------|------|
| 16 | 1280 | `factor_analysis` | `data_matrix`, `n_factors` | `dataMatrix`, `nFactors` | ❌ 수정필요 |
| 17 | 1307 | `cluster_analysis` | `data_matrix`, `n_clusters` | `data`, `numClusters` | ❌ 수정필요 |
| 18 | 1338 | `time_series_analysis` | `data_values`, `seasonal_periods`, `forecast_periods` | `dataValues`, `seasonalPeriods` | ❌ 수정필요 |
| 19 | 2076 | `curve_estimation` | `x_values`, `y_values`, `model_type` | `xValues`, `yValues`, `modelType` | ❌ 수정필요 |
| 20 | 2107-2110 | `nonlinear_regression` | `x_values`, `y_values`, `model_type`, `initial_guess` | `xValues`, `yValues`, `modelType`, `initialGuess` | ❌ 수정필요 |
| 21 | 2143-2148 | `stepwise_regression` | `y_values`, `x_matrix`, `variable_names`, `entry_threshold`, `stay_threshold` | `yValues`, `xMatrix`, `variableNames`, `entryThreshold`, `stayThreshold` | ❌ 수정필요 |
| 22 | 2171 | `binary_logistic` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 23 | 2193 | `multinomial_logistic` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 24 | 2215 | `ordinal_logistic` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 25 | 2237 | `probit_regression` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 26 | 2259 | `poisson_regression` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 27 | 2281 | `negative_binomial_regression` | `x_matrix`, `y_values` | `xMatrix`, `yValues` | ❌ 수정필요 |
| 28 | 2332 | `pca_analysis` | `data_matrix`, `n_components` | `data`, `nComponents` | ❌ 수정필요 |
| 29 | 2425 | `chi_square_independence_test` | `observed_matrix`, `yates_correction` | `observed_matrix`, `yates_correction` | ⚠️ Python도 snake |
| 30 | 2536 | `discriminant_analysis` | `data_matrix`, `group_labels` | `data`, `groups` | ❌ 수정필요 |
| 31 | 2596 | `cox_regression` | `covariate_names` | `covariateNames` | ❌ 수정필요 |
| 32 | 2635-2640 | `power_analysis` | `test_type`, `analysis_type`, `effect_size`, `sample_size` | `testType`, `analysisType`, `effectSize`, `sampleSize` | ❌ 수정필요 |

---

## Python snake_case 함수 (별도 처리 필요)

일부 Python 함수는 이미 snake_case 파라미터를 사용:
- `crosstab_analysis(row_values, col_values)`
- `t_test_two_sample(..., equal_var)`
- `chi_square_test(observed_matrix, yates_correction)`
- `chi_square_independence_test(observed_matrix, yates_correction)`

**결정 필요**: 이들도 camelCase로 통일할지?

---

## 진행 상황

- [x] Worker 1 수정 완료 (crosstab_analysis: rowValues, colValues)
- [x] Worker 2 수정 완료 (chi_square_test, chi_square_independence_test: observedMatrix, yatesCorrection)
- [x] Worker 3 수정 완료 (이미 camelCase)
- [x] Worker 4 수정 완료 (이미 camelCase)
- [x] TypeScript 컴파일 확인 (0 errors)
- [x] 테스트 실행 및 검증 (PASS)
- [x] 문서 업데이트

---

## 수정 요약

### Python 파일 수정
| 파일 | 수정 내용 |
|------|----------|
| worker1-descriptive.py | `row_values` → `rowValues`, `col_values` → `colValues` |
| worker2-hypothesis.py | `equal_var` → `equalVar`, `observed_matrix` → `observedMatrix`, `yates_correction` → `yatesCorrection` |

### TypeScript 파일 수정
| 파일 | 수정 수 | 내용 |
|------|--------|------|
| pyodide-statistics.ts | 32+ | 모든 snake_case → camelCase 파라미터 변환 |

---

**Updated**: 2025-12-17