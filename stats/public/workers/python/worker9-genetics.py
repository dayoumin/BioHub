# Worker 9: Population Genetics Python Module
# Notes:
# - Dependencies: NumPy, SciPy (no additional packages beyond base)
# - Tools: Hardy-Weinberg equilibrium test, Fst (fixation index)
# - Estimated memory: ~50MB

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats


# ─── 공개 함수 ────────────────────────────────────────────


def hardy_weinberg(
    rows: List[List[Union[float, int]]],
    locusLabels: Optional[List[str]] = None,
) -> Dict:
    """
    Hardy-Weinberg 평형 chi-square 검정.

    Parameters
    ----------
    rows        : [[AA, Aa, aa], ...] 유전자좌별 관측 유전자형 수
    locusLabels : 유전자좌 라벨 (선택)

    Returns
    -------
    {
        alleleFreqP, alleleFreqQ, observedCounts, expectedCounts,
        chiSquare, pValue, degreesOfFreedom, inEquilibrium,
        interpretation, nTotal, locusResults?
    }
    """
    if not rows or len(rows) == 0:
        raise ValueError("최소 1개 유전자좌의 관측 데이터가 필요합니다")

    def _test_single(observed_raw):
        obs = [float(x) for x in observed_raw]
        if len(obs) != 3:
            raise ValueError("각 유전자좌는 정확히 3개 유전자형(AA, Aa, aa)이 필요합니다")
        if any(x < 0 for x in obs):
            raise ValueError("관측 빈도는 0 이상이어야 합니다")
        if any(x != int(x) for x in obs):
            raise ValueError("관측 빈도는 정수여야 합니다 (소수 불가)")

        hom_dom, het, hom_rec = int(obs[0]), int(obs[1]), int(obs[2])  # AA, Aa, aa
        n = hom_dom + het + hom_rec

        if n == 0:
            raise ValueError("표본 수가 0입니다")

        # 대립유전자 빈도
        p = (2 * hom_dom + het) / (2 * n)
        q = 1.0 - p

        # 단형성 (monomorphic): p=0 또는 p=1이면 chi-square 불가
        is_monomorphic = (p == 0.0 or p == 1.0)

        # 기대 빈도
        exp_dom = n * p ** 2
        exp_het = n * 2 * p * q
        exp_rec = n * q ** 2

        observed = [hom_dom, het, hom_rec]
        expected = [exp_dom, exp_het, exp_rec]

        # 기대빈도 < 5 경고 (chi-square 근사 부정확 가능)
        low_expected = any(e < 5 for e in expected)

        if is_monomorphic:
            # 단형성: 관측=기대이므로 chi2=0, p=1, 검정 무의미
            chi2 = 0.0
            p_value = 1.0
        else:
            # chi-square (df=1: 3 categories - 1 estimated parameter - 1)
            chi2_val, p_val = stats.chisquare(observed, expected, ddof=1)
            chi2 = round(float(chi2_val), 4)
            p_value = float(p_val)

        return {
            'alleleFreqP': float(p),
            'alleleFreqQ': float(q),
            'observedCounts': [hom_dom, het, hom_rec],
            'expectedCounts': [round(float(x), 2) for x in expected],
            'chiSquare': chi2,
            'pValue': p_value,
            'degreesOfFreedom': 1,
            'inEquilibrium': bool(p_value > 0.05),
            'isMonomorphic': is_monomorphic,
            'nTotal': n,
            'lowExpectedWarning': low_expected,
        }

    # 첫 번째 유전자좌 (또는 유일한 유전자좌) 결과를 메인으로
    first = _test_single(rows[0])

    # 해석 텍스트
    if first['inEquilibrium']:
        first['interpretation'] = f"HW 평형 유지 (χ² = {first['chiSquare']}, p = {first['pValue']:.4f}, p > 0.05)"
    else:
        first['interpretation'] = f"HW 평형 이탈 (χ² = {first['chiSquare']}, p = {first['pValue']:.4f}, p ≤ 0.05)"

    # 다중 유전자좌
    if len(rows) > 1:
        labels = locusLabels if locusLabels and len(locusLabels) == len(rows) else [f"Locus {i+1}" for i in range(len(rows))]
        first['locus'] = labels[0]
        locus_results = [first]
        for i, row in enumerate(rows[1:], 1):
            result = _test_single(row)
            result['locus'] = labels[i]
            locus_results.append(result)
        first['locusResults'] = locus_results
    else:
        first['locusResults'] = None

    return first


def fst(
    populations: List[List[Union[float, int]]],
    populationLabels: Optional[List[str]] = None,
) -> Dict:
    """
    Fst (Fixation Index) — Hudson (1992) + Bhatia et al. (2013) 편향 보정.
    입력은 allele count matrix (빈도 아님, 개수).

    Parameters
    ----------
    populations      : [[count_A, count_B, ...], ...] 집단별 대립유전자 개수
    populationLabels : 집단 라벨 (선택)

    Returns
    -------
    {
        globalFst, pairwiseFst?, populationLabels, nPopulations, interpretation
    }
    """
    if not populations or len(populations) < 2:
        raise ValueError("최소 2개 집단이 필요합니다")

    n_pops = len(populations)
    labels = populationLabels if populationLabels and len(populationLabels) == n_pops else [f"Pop {i+1}" for i in range(n_pops)]

    # count → frequency + sample size (정수 검증 포함)
    freqs = []
    sample_sizes = []
    for pop in populations:
        counts = np.array([float(x) for x in pop])
        if np.any(counts < 0):
            raise ValueError("대립유전자 개수는 0 이상이어야 합니다")
        if np.any(counts != np.floor(counts)):
            raise ValueError("대립유전자 개수는 정수여야 합니다 (소수 불가)")
        total = np.sum(counts)
        if total == 0:
            raise ValueError("집단의 총 대립유전자 수가 0입니다")
        freqs.append(counts / total)
        sample_sizes.append(float(total))

    def _hudson_fst_pair(p1, p2, n1, n2):
        """Hudson (1992) Fst with Bhatia et al. (2013) bias correction. Vectorized."""
        if n1 <= 1 or n2 <= 1:
            raise ValueError("각 집단의 대립유전자 총 수는 2 이상이어야 합니다")
        num = np.sum((p1 - p2) ** 2 - p1 * (1 - p1) / (n1 - 1) - p2 * (1 - p2) / (n2 - 1))
        den = np.sum(p1 * (1 - p2) + p2 * (1 - p1))
        if den == 0:
            return 0.0
        return max(0.0, float(num / den))

    # 쌍별 Fst 행렬
    pairwise = np.zeros((n_pops, n_pops))
    fst_values = []

    for i in range(n_pops):
        for j in range(i + 1, n_pops):
            f = _hudson_fst_pair(freqs[i], freqs[j], sample_sizes[i], sample_sizes[j])
            pairwise[i][j] = f
            pairwise[j][i] = f
            fst_values.append(f)

    # Global Fst = 쌍별 평균
    global_fst = float(np.mean(fst_values)) if fst_values else 0.0

    # Wright (1978) 해석
    if global_fst < 0.05:
        interpretation = "약한 분화 (Fst < 0.05, Wright 1978)"
    elif global_fst < 0.15:
        interpretation = "중간 분화 (0.05 ≤ Fst < 0.15, Wright 1978)"
    elif global_fst < 0.25:
        interpretation = "큰 분화 (0.15 ≤ Fst < 0.25, Wright 1978)"
    else:
        interpretation = "매우 큰 분화 (Fst ≥ 0.25, Wright 1978)"

    result: Dict = {
        'globalFst': round(global_fst, 6),
        'populationLabels': labels,
        'nPopulations': n_pops,
        'interpretation': interpretation,
    }

    # 3+ 집단이면 쌍별 행렬 포함
    if n_pops > 2:
        result['pairwiseFst'] = [[round(float(pairwise[i][j]), 6) for j in range(n_pops)] for i in range(n_pops)]
    else:
        result['pairwiseFst'] = None

    return result
