"""
Python Worker Helper Functions

공통 데이터 정제 함수 모음
- 반복되는 NaN/None 제거 로직을 1개 함수로 통합
- 4개 Worker에서 30+회 반복되던 코드를 Helper로 대체
"""

import numpy as np
from typing import List, Tuple, Union

# ============================================================================
# 단일 배열 정제
# ============================================================================

def clean_array(data: List[Union[float, int, None]]) -> np.ndarray:
    """
    배열에서 None과 NaN 제거

    Args:
        data: 원본 데이터 (None, NaN 포함 가능)

    Returns:
        정제된 NumPy 배열 (None, NaN 제거됨)

    Examples:
        >>> clean_array([1, 2, None, 3, np.nan, 4])
        array([1., 2., 3., 4.])
    """
    return np.array([x for x in data if x is not None and not np.isnan(x)])


# ============================================================================
# 쌍 데이터 정제
# ============================================================================

def clean_paired_arrays(
    array1: List[Union[float, int, None]],
    array2: List[Union[float, int, None]]
) -> Tuple[np.ndarray, np.ndarray]:
    """
    두 배열에서 쌍을 이루는 유효한 값만 추출

    한쪽이라도 None/NaN이면 해당 인덱스의 쌍을 모두 제거
    (예: before/after, X/Y 좌표)

    Args:
        array1: 첫 번째 배열 (예: before, X)
        array2: 두 번째 배열 (예: after, Y)

    Returns:
        (정제된 배열1, 정제된 배열2) 튜플

    Examples:
        >>> clean_paired_arrays([1, 2, None, 4], [5, 6, 7, None])
        (array([1., 2.]), array([5., 6.]))

    Raises:
        ValueError: 두 배열의 길이가 다를 경우
    """
    if len(array1) != len(array2):
        raise ValueError(f"Arrays must have same length: {len(array1)} != {len(array2)}")

    valid_indices = [
        i for i in range(len(array1))
        if (array1[i] is not None and not np.isnan(array1[i]) and
            array2[i] is not None and not np.isnan(array2[i]))
    ]

    clean1 = np.array([array1[i] for i in valid_indices])
    clean2 = np.array([array2[i] for i in valid_indices])

    return clean1, clean2


# ============================================================================
# 여러 그룹 정제
# ============================================================================

def clean_groups(groups: List[List[Union[float, int, None]]]) -> List[np.ndarray]:
    """
    여러 그룹의 데이터를 각각 정제

    Args:
        groups: 그룹 리스트 (각 그룹은 데이터 리스트)

    Returns:
        정제된 그룹 리스트 (각 그룹은 NumPy 배열)

    Examples:
        >>> clean_groups([[1, 2, None], [3, np.nan, 5], [6, 7, 8]])
        [array([1., 2.]), array([3., 5.]), array([6., 7., 8.])]
    """
    return [clean_array(group) for group in groups]


# ============================================================================
# X-Y 쌍 정제 (회귀분석용)
# ============================================================================

def clean_xy_regression(
    x_data: List[Union[float, int, None]],
    y_data: List[Union[float, int, None]]
) -> Tuple[np.ndarray, np.ndarray]:
    """
    회귀분석용 X-Y 쌍 정제 (clean_paired_arrays의 별칭)

    Args:
        x_data: 독립변수 데이터
        y_data: 종속변수 데이터

    Returns:
        (정제된 X, 정제된 Y) 튜플

    Examples:
        >>> clean_xy_regression([1, 2, None, 4], [10, 20, 30, None])
        (array([1., 2.]), array([10., 20.]))
    """
    return clean_paired_arrays(x_data, y_data)


# ============================================================================
# 다중 X 변수 정제 (다중회귀분석용)
# ============================================================================

def clean_multiple_regression(
    X_matrix: List[List[Union[float, int, None]]],
    y_data: List[Union[float, int, None]]
) -> Tuple[np.ndarray, np.ndarray]:
    """
    다중회귀분석용 X 행렬과 Y 벡터 정제

    한 행이라도 None/NaN이 있으면 해당 행 전체 제거

    Args:
        X_matrix: 독립변수 행렬 (n_samples × n_features)
        y_data: 종속변수 벡터 (n_samples,)

    Returns:
        (정제된 X 행렬, 정제된 Y 벡터) 튜플

    Examples:
        >>> X = [[1, 2], [3, None], [5, 6]]
        >>> y = [10, 20, 30]
        >>> clean_multiple_regression(X, y)
        (array([[1., 2.], [5., 6.]]), array([10., 30.]))

    Raises:
        ValueError: X와 y의 행 수가 다를 경우
    """
    if len(X_matrix) != len(y_data):
        raise ValueError(f"X and y must have same number of samples: {len(X_matrix)} != {len(y_data)}")

    valid_indices = []
    for i in range(len(y_data)):
        y_val = y_data[i]
        x_row = X_matrix[i]

        # Y가 유효하고, X 행의 모든 값이 유효한지 확인
        if (y_val is not None and not np.isnan(y_val) and
            all(x is not None and not np.isnan(x) for x in x_row)):
            valid_indices.append(i)

    clean_X = np.array([X_matrix[i] for i in valid_indices])
    clean_y = np.array([y_data[i] for i in valid_indices])

    return clean_X, clean_y


# ============================================================================
# Utility: NaN 체크
# ============================================================================

def is_valid_number(value: Union[float, int, None]) -> bool:
    """
    값이 유효한 숫자인지 확인 (None, NaN, Inf가 아닌지)

    Args:
        value: 확인할 값

    Returns:
        True if 유효한 숫자, False otherwise

    Examples:
        >>> is_valid_number(3.14)
        True
        >>> is_valid_number(None)
        False
        >>> is_valid_number(np.nan)
        False
        >>> is_valid_number(np.inf)
        False
    """
    if value is None:
        return False
    try:
        return not (np.isnan(value) or np.isinf(value))
    except (TypeError, ValueError):
        return False
