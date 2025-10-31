---
title: Worker 2: Hypothesis Testing Functions
source: worker2-hypothesis.py
type: Project Internal Documentation
license: MIT
crawled_date: 2025-10-31
---

# Worker 2: Hypothesis Testing - Python Functions

**파일**: `worker2-hypothesis.py`
**함수 개수**: 12

---

## `t_test_two_sample()`

**설명**: (문서화 필요)

**파라미터**:

- `group1`: `List[Union[float, int, None]]`
- `group2`: `List[Union[float, int, None]]`
- `equal_var`: `bool` = True

**반환 타입**: `Dict[str, Union[float, int, None]]`

**소스 라인**: Line 23

---

## `t_test_paired()`

**설명**: (문서화 필요)

**파라미터**:

- `values1`: `List[Union[float, int, None]]`
- `values2`: `List[Union[float, int, None]]`

**반환 타입**: `Dict[str, Union[float, int, None]]`

**소스 라인**: Line 57

---

## `t_test_one_sample()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`
- `popmean`: `float` = 0

**반환 타입**: `Dict[str, Union[float, None]]`

**소스 라인**: Line 77

---

## `z_test()`

**설명**: (문서화 필요)

**파라미터**:

- `data`: `List[Union[float, int, None]]`
- `popmean`: `float`
- `popstd`: `float`

**반환 타입**: `Dict[str, Union[float, None]]`

**소스 라인**: Line 95

---

## `chi_square_test()`

**설명**: (문서화 필요)

**파라미터**:

- `observed_matrix`: `List[List[int]]`
- `yates_correction`: `bool` = False

**반환 타입**: `Dict[str, Union[float, int, List[List[float]], None]]`

**소스 라인**: Line 117

---

## `binomial_test()`

**설명**: (문서화 필요)

**파라미터**:

- `success_count`: `int`
- `total_count`: `int`
- `probability`: `float` = 0.5
- `alternative`: `Literal[two-sided, less, greater]` = 'two-sided'

**반환 타입**: `Dict[str, Union[float, int, None]]`

**소스 라인**: Line 136

---

## `correlation_test()`

**설명**: (문서화 필요)

**파라미터**:

- `x`: `List[Union[float, int, None]]`
- `y`: `List[Union[float, int, None]]`
- `method`: `Literal[pearson, spearman, kendall]` = 'pearson'

**반환 타입**: `Dict[str, Union[float, str, None]]`

**소스 라인**: Line 158

---

## `partial_correlation()`

**설명**: (문서화 필요)

**파라미터**:

- `data_matrix`: `List[List[Union[float, int, None]]]`
- `x_idx`: `int`
- `y_idx`: `int`
- `control_indices`: `List[int]`

**반환 타입**: `Dict[str, Union[float, int, Dict[str, float], None]]`

**소스 라인**: Line 184

---

## `levene_test()`

**설명**: (문서화 필요)

**파라미터**:

- `groups`: `List[List[Union[float, int, None]]]`

**반환 타입**: `Dict[str, Union[float, bool, None]]`

**소스 라인**: Line 264

---

## `bartlett_test()`

**설명**: (문서화 필요)

**파라미터**:

- `groups`: `List[List[Union[float, int, None]]]`

**반환 타입**: `Dict[str, Union[float, bool, None]]`

**소스 라인**: Line 281

---

## `chi_square_goodness_test()`

**설명**: (문서화 필요)

**파라미터**:

- `observed`: `List[Union[float, int]]`
- `expected`: `Optional[List[Union[float, int]]]` = None
- `alpha`: `float` = 0.05

**반환 타입**: `Dict[str, Union[float, int, bool, List[float], None]]`

**소스 라인**: Line 298

---

## `chi_square_independence_test()`

**설명**: (문서화 필요)

**파라미터**:

- `observed_matrix`: `List[List[Union[float, int]]]`
- `yates_correction`: `bool` = False
- `alpha`: `float` = 0.05

**반환 타입**: `Dict[str, Union[float, int, bool, List[List[float]], None]]`

**소스 라인**: Line 335

---

