# Phase 9: 계산 방법 표준화 진행 상황

**시작일**: 2025-11-13
**현재 상태**: 진행 중
**목표**: 모든 통계 페이지를 PyodideCore 표준으로 통합

---

## 📊 전체 진행 상황

**현재 (2025-11-13 11:00)**:
- **PyodideCore**: 26/44개 (59%)
- **pyodideStats**: 6/44개 (14%) - 남은 작업
- **Legacy Pyodide**: 2/44개 (5%) - 진행 중 (다른 세션)
- **JavaScript**: 6/44개 (14%)
- **None**: 4/44개 (9%)

**목표**:
- **PyodideCore**: 42/44개 (95%)
- **JavaScript**: 2/44개 (5%) - frequency-table, cross-tabulation 유지

**증가율**: 18개 (41%) → 26개 (59%) = **+8개 (+44%)**

---

## ✅ 완료된 작업 (2025-11-13)

### Batch 1: pyodideStats → PyodideCore (4/10 완료)

| 페이지 | 상태 | Worker | 메서드 | 커밋 |
|--------|------|--------|--------|------|
| friedman | ✅ | 3 | friedman_test | 40ef4ee |
| kruskal-wallis | ✅ | 3+1 | kruskal_wallis_test, descriptive_stats | c4b42ab |
| reliability | ✅ | 1 | cronbach_alpha | c4b42ab |
| wilcoxon | ✅ | 3 | wilcoxon_test | c4b42ab |

### Batch 2: Legacy Pyodide → PyodideCore (4/6 완료)

| 페이지 | 상태 | Worker | 메서드 | 커밋 |
|--------|------|--------|--------|------|
| ks-test | ✅ | 1 | ks_test_one_sample, ks_test_two_sample | 1b1cc9c |
| mann-kendall | ✅ | 1 | mann_kendall_test | 1b1cc9c |
| means-plot | ✅ | 1 | means_plot_data | 4084bb9 |
| partial-correlation | ✅ | 2 | partial_correlation_analysis | 6e58f56 |
| response-surface | 🔄 | 2 | - | 진행 중 (다른 세션) |
| stepwise | 🔄 | 2 | stepwise_regression_forward | 진행 중 (다른 세션) |

### Critical 버그 수정

**커밋**: fd9fa5f
- Worker 1: ks_test_one_sample, ks_test_two_sample, mann_kendall_test에 `clean_array()` 적용
- Friedman: variables.dependent → variables.within 수정 (Lines 171, 280)

---

## 📋 Worker 메서드 구현 현황

### Worker 1 (Descriptive/Nonparametric) - 4개 추가

**추가된 메서드** (d13e779):
1. `ks_test_one_sample(values)` - K-S 일표본 검정
2. `ks_test_two_sample(values1, values2)` - K-S 이표본 검정
3. `mann_kendall_test(data)` - Mann-Kendall 추세 검정
4. `means_plot_data(data, dependent_var, factor_var)` - 집단별 평균 플롯

### Worker 2 (Hypothesis/Regression) - 1개 추가

**추가된 메서드** (6e58f56):
1. `partial_correlation_analysis(data, analysis_vars, control_vars)` - 편상관 분석

**기존 메서드 확인**:
- ✅ `t_test_two_sample()` - 있음
- ✅ `t_test_paired()` - 있음
- ✅ `t_test_one_sample()` - 있음
- ✅ `stepwise_regression_forward()` - 있음

---

## 🔄 진행 중 작업 (다른 세션)

### Batch 2 완료 (2개 페이지)
- response-surface (Worker 2 메서드 필요)
- stepwise (Worker 2 메서드 있음 - stepwise_regression_forward)

---

## 📌 다음 작업: Batch 1 완료 (6개 남음)

### 우선순위 1: t-test (간단) ⭐
- **상태**: pyodideStats → PyodideCore 변환 대기
- **Worker**: 2
- **메서드**: ✅ t_test_two_sample, t_test_paired, t_test_one_sample (이미 존재)
- **예상 시간**: 20분

### 우선순위 2: ancova, manova, poisson (중간)
- **상태**: pyodideStats → PyodideCore 변환 대기
- **Worker**: 2
- **메서드**: Worker 2 확인 필요
- **예상 시간**: 각 30분

### 우선순위 3: mixed-model, ordinal-regression (복잡)
- **상태**: pyodideStats → PyodideCore 변환 대기
- **Worker**: 2
- **메서드**: Worker 2 확인 필요
- **예상 시간**: 각 1시간

---

## 📈 통계 요약

### 커밋 통계 (7개)
1. 40ef4ee - friedman 변환
2. c4b42ab - kruskal-wallis, reliability, wilcoxon 변환
3. d13e779 - Worker 1 메서드 3개 추가
4. 1b1cc9c - ks-test, mann-kendall 변환
5. fd9fa5f - Critical 버그 수정
6. 4084bb9 - means-plot 변환 + Worker 1 메서드 1개 추가
7. 6e58f56 - partial-correlation 변환 + Worker 2 메서드 1개 추가

### 변환된 페이지 (8개)
- friedman, kruskal-wallis, reliability, wilcoxon (Batch 1)
- ks-test, mann-kendall, means-plot, partial-correlation (Batch 2)

### 추가된 Worker 메서드 (5개)
- Worker 1: 4개 (ks_test_one_sample, ks_test_two_sample, mann_kendall_test, means_plot_data)
- Worker 2: 1개 (partial_correlation_analysis)

---

## 🎯 목표 대비 진행률

| 항목 | 목표 | 현재 | 진행률 |
|------|------|------|--------|
| **PyodideCore 페이지** | 42개 | 26개 | 62% |
| **Batch 1 (pyodideStats)** | 10개 | 4개 | 40% |
| **Batch 2 (Legacy)** | 6개 | 4개 | 67% |
| **Batch 3 (JavaScript)** | 4개 | 0개 | 0% |
| **Batch 4 (None)** | 4개 | 0개 | 0% |

---

## ✅ 검증 결과

- **TypeScript 에러**: 0개 ✓
- **자동 검증 스크립트**: 통과 ✓
- **PyodideCore 패턴**: 100% 준수 ✓
- **타입 안전성**: 제네릭 타입 100% 적용 ✓

---

**최종 업데이트**: 2025-11-13 11:00
**다음 작업**: t-test 페이지 PyodideCore 변환
