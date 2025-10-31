---
title: Worker 1: Descriptive Statistics Functions
source: worker1-descriptive.py
type: Project Internal Documentation
license: MIT
crawled_date: 2025-10-31
---

# Worker 1: Descriptive Statistics - Python Functions

**파일**: `worker1-descriptive.py`
**함수 개수**: 8

---

## `descriptive_stats()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`

**반환 타입**: `Dict[str, Union[float, int]]`

**소스 라인**: Line 14

---

## `normality_test()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`
- `alpha`: `float` = 0.05

**반환 타입**: `Dict[str, Union[float, bool]]`

**소스 라인**: Line 43

---

## `outlier_detection()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`
- `method`: `Literal[iqr, zscore]` = 'iqr'

**반환 타입**: `Dict[str, Union[List[int], int, str]]`

**소스 라인**: Line 59

---

## `frequency_analysis()`

**설명**: (문서화 필요)

**파라미터**:

- `values`: `List[Any]`

**반환 타입**: `Dict[str, Union[List[str], List[int], List[float], int]]`

**소스 라인**: Line 88

---

## `crosstab_analysis()`

**설명**: (문서화 필요)

**파라미터**:

- `row_values`: `List[Any]`
- `col_values`: `List[Any]`

**반환 타입**: `Dict[str, Union[List[str], List[List[int]], List[int], int]]`

**소스 라인**: Line 110

---

## `one_sample_proportion_test()`

**설명**: (문서화 필요)

**파라미터**:

- `success_count`: `int`
- `total_count`: `int`
- `null_proportion`: `float` = 0.5
- `alternative`: `Literal[two-sided, less, greater]` = 'two-sided'
- `alpha`: `float` = 0.05

**반환 타입**: `Dict[str, Union[float, bool]]`

**소스 라인**: Line 147

---

## `cronbach_alpha()`

**설명**: (문서화 필요)

**파라미터**:

- `items_matrix`: `List[List[Union[float, int]]]`

**반환 타입**: `Dict[str, Union[float, int]]`

**소스 라인**: Line 185

---

## `kolmogorov_smirnov_test()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`

**반환 타입**: `Dict[str, Union[float, bool]]`

**소스 라인**: Line 217

---

