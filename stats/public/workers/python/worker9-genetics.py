# Worker 9: Population Genetics Python Module
# Notes:
# - Dependencies: NumPy, SciPy (loaded on demand, initially empty)
# - Tools: Hardy-Weinberg equilibrium test, Fst (fixation index)
# - Estimated memory: ~50MB

from typing import List, Dict, Optional, Union
from helpers import clean_array


# ─── 공개 함수 ────────────────────────────────────────────


def hardy_weinberg(
    observedCounts: List[Union[float, int]],
    alleleLabels: Optional[List[str]] = None,
) -> Dict:
    """
    Hardy-Weinberg 평형 검정.

    Parameters
    ----------
    observedCounts : 관측된 유전자형 빈도 [AA, Aa, aa]
    alleleLabels   : 대립유전자 라벨 (선택)

    Returns
    -------
    {
        observedCounts, expectedCounts, chiSquare, pValue,
        degreesOfFreedom, alleleFrequencies, isEquilibrium, nTotal
    }
    """
    raise NotImplementedError("구현 예정")


def fst(
    populations: List[List[Union[float, int]]],
    populationLabels: Optional[List[str]] = None,
) -> Dict:
    """
    Fst (Fixation Index) — 집단 간 유전적 분화 지수.

    Parameters
    ----------
    populations     : 각 집단의 대립유전자 빈도 목록
    populationLabels : 집단 라벨 (선택)

    Returns
    -------
    {
        fst, fis, fit, pairwiseFst, populationLabels, nPopulations
    }
    """
    raise NotImplementedError("구현 예정")
