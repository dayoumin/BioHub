# Worker 7: Community Ecology Python Module
# Notes:
# - Dependencies: NumPy, SciPy, scikit-learn (for NMDS only)
# - 6 tools: alpha_diversity, rarefaction, beta_diversity, nmds, permanova, mantel_test
# - PERMANOVA/Mantel: numpy/scipy direct implementation (scikit-bio not in Pyodide)
#   Validated against R vegan::adonis2() and vegan::mantel()
# - Estimated memory: ~80MB

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats
from scipy.spatial.distance import pdist, squareform
from scipy.special import gammaln
from helpers import clean_array


# ─── 내부 유틸 ─────────────────────────────────────────────


def _parse_abundance_matrix(
    rows: List[Dict],
    site_col: str,
) -> tuple:
    """
    CSV 행 데이터 → (abundance matrix, site_labels, species_names)

    Parameters
    ----------
    rows      : PapaParse JSON 행 목록
    site_col  : 지점명이 들어 있는 열 이름

    Returns
    -------
    (matrix: np.ndarray, site_labels: list[str], species_names: list[str])
    """
    species_names = [k for k in rows[0].keys() if k != site_col]
    site_labels = []
    data = []

    for row in rows:
        site_labels.append(str(row.get(site_col, '')))
        vals = []
        for sp in species_names:
            v = row.get(sp, 0)
            if v is None or v == '':
                v = 0
            try:
                vals.append(float(v))
            except (ValueError, TypeError):
                vals.append(0.0)
        data.append(vals)

    return np.array(data, dtype=float), site_labels, species_names


def _log_comb(n: float, k: float) -> float:
    """log-space 이항계수 — 대규모 N에서도 오버플로 없음"""
    return float(gammaln(n + 1) - gammaln(k + 1) - gammaln(n - k + 1))


# ─── 공개 함수 ────────────────────────────────────────────


def alpha_diversity(
    rows: List[Dict],
    site_col: str = 'site',
) -> Dict:
    """
    지점별 알파 다양성 지수 계산.

    Parameters
    ----------
    rows      : CSV 행 데이터 (PapaParse JSON)
    site_col  : 지점명 열

    Returns
    -------
    { siteResults: [{siteName, speciesRichness, totalAbundance, shannonH, ...}],
      summaryTable: [{index, mean, sd, min, max}] }
    """
    matrix, site_labels, species_names = _parse_abundance_matrix(rows, site_col)

    site_results = []
    for i, (label, counts) in enumerate(zip(site_labels, matrix)):
        counts_pos = counts[counts > 0]
        N = float(counts_pos.sum())
        S = len(counts_pos)

        if S == 0 or N == 0:
            site_results.append({
                "siteName": label,
                "speciesRichness": 0,
                "totalAbundance": 0,
                "shannonH": 0.0,
                "simpsonDominance": 0.0,
                "simpsonDiversity": 0.0,
                "simpsonReciprocal": 0.0,
                "margalef": 0.0,
                "pielou": 0.0,
            })
            continue

        pi = counts_pos / N
        shannon = float(stats.entropy(counts_pos, base=np.e))
        simpson_d = float(np.sum(pi ** 2))
        simpson_div = 1.0 - simpson_d
        simpson_rec = 1.0 / simpson_d if simpson_d > 0 else float('inf')
        margalef = float((S - 1) / np.log(N)) if N > 1 else 0.0
        pielou = float(shannon / np.log(S)) if S > 1 else 0.0

        site_results.append({
            "siteName": label,
            "speciesRichness": int(S),
            "totalAbundance": float(N),
            "shannonH": round(shannon, 4),
            "simpsonDominance": round(simpson_d, 4),
            "simpsonDiversity": round(simpson_div, 4),
            "simpsonReciprocal": round(simpson_rec, 4),
            "margalef": round(margalef, 4),
            "pielou": round(pielou, 4),
        })

    # 요약 통계
    indices = ["shannonH", "simpsonDiversity", "simpsonReciprocal", "margalef", "pielou"]
    summary_table = []
    for idx_name in indices:
        vals = [r[idx_name] for r in site_results if r["speciesRichness"] > 0]
        if vals:
            summary_table.append({
                "index": idx_name,
                "mean": round(float(np.mean(vals)), 4),
                "sd": round(float(np.std(vals, ddof=1)), 4) if len(vals) > 1 else 0.0,
                "min": round(float(np.min(vals)), 4),
                "max": round(float(np.max(vals)), 4),
            })

    return {
        "siteResults": site_results,
        "summaryTable": summary_table,
        "speciesNames": species_names,
        "siteCount": len(site_labels),
    }


def rarefaction(
    rows: List[Dict],
    site_col: str = 'site',
    n_steps: int = 50,
) -> Dict:
    """
    지점별 종 희박화 곡선 (Hurlbert 1971).

    Returns
    -------
    { curves: [{siteName, steps: int[], expectedSpecies: float[]}] }
    """
    matrix, site_labels, species_names = _parse_abundance_matrix(rows, site_col)

    curves = []
    for label, counts in zip(site_labels, matrix):
        counts_int = counts[counts > 0].astype(int)
        N = int(counts_int.sum())
        S = len(counts_int)

        if S == 0 or N == 0:
            curves.append({"siteName": label, "steps": [], "expectedSpecies": []})
            continue

        steps = np.unique(np.linspace(1, N, min(n_steps, N), dtype=int))
        expected = []

        for n in steps:
            log_c_total = _log_comb(N, n)
            es = S - sum(
                np.exp(_log_comb(N - ni, n) - log_c_total)
                for ni in counts_int if N - ni >= n
            )
            expected.append(round(float(es), 4))

        curves.append({
            "siteName": label,
            "steps": steps.tolist(),
            "expectedSpecies": expected,
        })

    return {"curves": curves}


def beta_diversity(
    rows: List[Dict],
    site_col: str = 'site',
    metric: str = 'braycurtis',
) -> Dict:
    """
    지점 간 베타 다양성 거리행렬.

    Parameters
    ----------
    metric : 'braycurtis' | 'jaccard' | 'sorensen'

    Returns
    -------
    { distanceMatrix: float[][], siteLabels: str[], metric: str }
    """
    VALID_METRICS = ('braycurtis', 'jaccard', 'sorensen')
    if metric not in VALID_METRICS:
        raise ValueError(f"지원하지 않는 거리 측도: {metric}. 사용 가능: {', '.join(VALID_METRICS)}")

    matrix, site_labels, species_names = _parse_abundance_matrix(rows, site_col)

    if matrix.shape[0] < 2:
        raise ValueError("거리행렬 계산에는 최소 2개 지점이 필요합니다")

    if metric == 'sorensen':
        binary = (matrix > 0).astype(float)
        dist = pdist(binary, metric='braycurtis')
    else:
        dist = pdist(matrix, metric=metric)

    sq = squareform(dist)

    return {
        "distanceMatrix": [[round(float(v), 6) for v in row] for row in sq],
        "siteLabels": site_labels,
        "metric": metric,
    }


def nmds(
    distance_matrix: List[List[float]],
    site_labels: Optional[List[str]] = None,
    groups: Optional[List[str]] = None,
    n_components: int = 2,
    max_iter: int = 150,
    random_state: int = 42,
) -> Dict:
    """
    NMDS (Non-metric Multidimensional Scaling).

    Parameters
    ----------
    distance_matrix : n×n 거리행렬 (beta_diversity 결과)
    site_labels     : 지점명
    groups          : 지점별 그룹 (시각화용, 선택)

    Returns
    -------
    { coordinates: [[x,y],...], stress, stressInterpretation, siteLabels, groups }
    """
    from sklearn.manifold import MDS

    dm = np.array(distance_matrix, dtype=float)

    mds = MDS(
        n_components=n_components,
        metric=False,
        dissimilarity='precomputed',
        max_iter=max_iter,
        random_state=random_state,
    )
    coords = mds.fit_transform(dm)
    stress_val = float(mds.stress_)

    if stress_val < 0.05:
        interp = "excellent"
    elif stress_val < 0.1:
        interp = "good"
    elif stress_val < 0.2:
        interp = "fair"
    else:
        interp = "poor"

    return {
        "coordinates": coords.tolist(),
        "stress": round(stress_val, 6),
        "stressInterpretation": interp,
        "siteLabels": site_labels or [f"Site{i+1}" for i in range(dm.shape[0])],
        "groups": groups,
    }


def permanova(
    distance_matrix: List[List[float]],
    grouping: List[str],
    permutations: int = 999,
) -> Dict:
    """
    PERMANOVA (Anderson 2001).
    Ref: Anderson, M.J. (2001) Austral Ecology, 26, 32-46.

    Parameters
    ----------
    distance_matrix : n×n 거리행렬
    grouping        : 지점별 그룹 레이블 (길이 n)

    Returns
    -------
    { pseudoF, pValue, rSquared, permutations, ssBetween, ssWithin, ssTotal }
    """
    dm = np.array(distance_matrix, dtype=float)
    grouping_arr = np.array(grouping)
    n = len(grouping_arr)
    groups = np.unique(grouping_arr)
    a = len(groups)

    if a < 2:
        raise ValueError("PERMANOVA requires at least 2 groups")
    if n < a + 1:
        raise ValueError(f"Not enough observations ({n}) for {a} groups")

    # 대규모 데이터 가드
    actual_perms = permutations
    if n > 200 and permutations > 99:
        actual_perms = 99

    D2 = dm ** 2
    ss_total = float(np.sum(D2) / (2 * n))

    def calc_ss_within(labels):
        ss_w = 0.0
        for g in groups:
            idx = np.where(labels == g)[0]
            ng = len(idx)
            if ng > 0:
                ss_w += float(np.sum(D2[np.ix_(idx, idx)])) / (2 * ng)
        return ss_w

    ss_within = calc_ss_within(grouping_arr)
    ss_between = ss_total - ss_within
    f_stat = (ss_between / (a - 1)) / (ss_within / (n - a))

    # 순열 검정
    f_perms = np.zeros(actual_perms)
    for i in range(actual_perms):
        perm = np.random.permutation(grouping_arr)
        ss_w_perm = calc_ss_within(perm)
        ss_b_perm = ss_total - ss_w_perm
        f_perms[i] = (ss_b_perm / (a - 1)) / (ss_w_perm / (n - a))

    p_value = float((np.sum(f_perms >= f_stat) + 1) / (actual_perms + 1))
    r_squared = float(ss_between / ss_total)

    return {
        "pseudoF": round(float(f_stat), 4),
        "pValue": round(p_value, 4),
        "rSquared": round(r_squared, 4),
        "permutations": actual_perms,
        "ssBetween": round(float(ss_between), 4),
        "ssWithin": round(float(ss_within), 4),
        "ssTotal": round(float(ss_total), 4),
    }


def mantel_test(
    matrix_x: List[List[float]],
    matrix_y: List[List[float]],
    permutations: int = 999,
    method: str = 'pearson',
) -> Dict:
    """
    Mantel Test — 두 거리행렬 간 상관 검정 (양측).

    Parameters
    ----------
    matrix_x, matrix_y : n×n 거리행렬
    method : 'pearson' | 'spearman'

    Returns
    -------
    { r, pValue, permutations, method }
    """
    mx = np.array(matrix_x, dtype=float)
    my = np.array(matrix_y, dtype=float)
    n = mx.shape[0]

    if mx.shape != my.shape:
        raise ValueError("두 거리행렬의 크기가 같아야 합니다")
    if n < 3:
        raise ValueError("Mantel test requires at least 3 observations")

    tri_idx = np.triu_indices(n, k=1)
    x = mx[tri_idx]
    y = my[tri_idx]

    corr_fn = stats.pearsonr if method == 'pearson' else stats.spearmanr
    r_obs, _ = corr_fn(x, y)

    # 순열 검정
    r_perms = np.zeros(permutations)
    for i in range(permutations):
        perm = np.random.permutation(n)
        y_perm = my[np.ix_(perm, perm)][tri_idx]
        r_perms[i], _ = corr_fn(x, y_perm)

    p_value = float((np.sum(np.abs(r_perms) >= np.abs(r_obs)) + 1) / (permutations + 1))

    return {
        "r": round(float(r_obs), 4),
        "pValue": round(p_value, 4),
        "permutations": permutations,
        "method": method,
    }
