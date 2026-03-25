# Worker 7: Fisheries Stock Assessment Python Module
# Notes:
# - Dependencies: NumPy, SciPy (no additional packages beyond base)
# - Tools: VBGF growth model, Length-Weight relationship, Condition Factor
# - Estimated memory: ~50MB (lighter than other workers)

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats
from scipy.optimize import curve_fit
from helpers import clean_paired_arrays


# ─── 상수 ──────────────────────────────────────────────────
INVALID_GROUP_VALUES = ('none', 'nan', 'null', 'na', 'n/a', '#n/a')

# ─── 내부 유틸 ─────────────────────────────────────────────


def _vbgf_func(t: np.ndarray, l_inf: float, k: float, t0: float) -> np.ndarray:
    """von Bertalanffy Growth Function: L(t) = L∞ × (1 - e^(-K(t - t₀)))"""
    return l_inf * (1 - np.exp(-k * (t - t0)))


# ─── 공개 함수 ────────────────────────────────────────────


def fit_vbgf(
    ages: List[Union[float, int, None]],
    lengths: List[Union[float, int, None]],
) -> Dict:
    """
    von Bertalanffy 성장 모델 파라미터 추정.

    Parameters
    ----------
    ages    : 연령 배열 (년)
    lengths : 체장 배열 (cm 등)

    Returns
    -------
    {
        lInf, k, t0, standardErrors, ci95,
        rSquared, predicted, residuals, nObservations,
        aic, parameterTable
    }
    """
    ages_clean, lengths_clean = clean_paired_arrays(ages, lengths)

    if len(ages_clean) < 3:
        raise ValueError("VBGF requires at least 3 valid age-length pairs")

    if np.any(lengths_clean <= 0):
        raise ValueError("체장(length)은 양수여야 합니다")

    # 초기값 추정
    l_inf_init = float(np.max(lengths_clean) * 1.1)
    k_init = 0.3
    t0_init = -0.5

    try:
        popt, pcov = curve_fit(
            _vbgf_func, ages_clean, lengths_clean,
            p0=[l_inf_init, k_init, t0_init],
            bounds=([0, 0.001, -5], [np.inf, 5.0, 0]),
            maxfev=max(5000, len(ages_clean) * 100),
        )
    except RuntimeError:
        raise ValueError(
            "VBGF 수렴 실패 — 데이터를 확인하세요 (이상치, 단위 불일치 등)"
        )

    l_inf, k, t0 = popt
    se = np.sqrt(np.diag(pcov))

    # 예측값 + 잔차
    predicted = _vbgf_func(ages_clean, *popt)
    residuals = lengths_clean - predicted

    # R²
    ss_res = float(np.sum(residuals ** 2))
    ss_tot = float(np.sum((lengths_clean - np.mean(lengths_clean)) ** 2))
    r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

    # 95% CI (± 1.96 × SE)
    ci_95 = 1.96 * se

    # AIC (정규 분포 가정)
    n = len(ages_clean)
    k_params = 3  # l_inf, k, t0
    aic = float(n * np.log(ss_res / n) + 2 * k_params) if n > 0 and ss_res > 0 else None

    # 파라미터 테이블 (UI 표시용)
    param_names = ['L∞', 'K', 't₀']
    param_units = ['', 'yr⁻¹', 'yr']
    parameter_table = []
    for i, (name, unit) in enumerate(zip(param_names, param_units)):
        parameter_table.append({
            'name': name,
            'unit': unit,
            'estimate': float(popt[i]),
            'standardError': float(se[i]),
            'ciLower': float(popt[i] - ci_95[i]),
            'ciUpper': float(popt[i] + ci_95[i]),
        })

    return {
        'lInf': float(l_inf),
        'k': float(k),
        't0': float(t0),
        'standardErrors': se.tolist(),
        'ci95': ci_95.tolist(),
        'rSquared': float(r_squared),
        'predicted': predicted.tolist(),
        'residuals': residuals.tolist(),
        'nObservations': n,
        'aic': aic,
        'parameterTable': parameter_table,
    }


def length_weight(
    lengths: List[Union[float, int, None]],
    weights: List[Union[float, int, None]],
) -> Dict:
    """
    체장-체중 관계식 추정: W = aL^b (log 변환 OLS).

    Parameters
    ----------
    lengths : 체장 배열
    weights : 체중 배열

    Returns
    -------
    {
        a, b, logA, rSquared, bStdError,
        isometricPValue, growthType,
        predicted, nObservations, logLogPoints
    }
    """
    lengths_clean, weights_clean = clean_paired_arrays(lengths, weights)

    if np.any(lengths_clean <= 0) or np.any(weights_clean <= 0):
        raise ValueError("체장과 체중은 양수여야 합니다")
    if len(lengths_clean) < 3:
        raise ValueError("Length-Weight requires at least 3 valid pairs")

    log_l = np.log10(lengths_clean)
    log_w = np.log10(weights_clean)

    # 선형 회귀: log(W) = log(a) + b × log(L)
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_l, log_w)

    b = slope
    log_a = intercept
    a = 10 ** log_a

    # b vs 3 검정 (isometric growth test)
    df = len(lengths_clean) - 2
    t_stat = (b - 3) / std_err if std_err > 0 else 0.0
    p_isometric = float(2 * (1 - stats.t.cdf(abs(t_stat), df)))

    if p_isometric > 0.05:
        growth_type = "isometric"
    elif b > 3:
        growth_type = "positive_allometric"
    else:
        growth_type = "negative_allometric"

    predicted_w = a * lengths_clean ** b

    # log-log 산점도용 좌표
    log_log_points = [
        {'logL': float(ll), 'logW': float(lw)}
        for ll, lw in zip(log_l, log_w)
    ]

    return {
        'a': float(a),
        'b': float(b),
        'logA': float(log_a),
        'rSquared': float(r_value ** 2),
        'bStdError': float(std_err),
        'isometricTStat': float(t_stat),
        'isometricPValue': float(p_isometric),
        'growthType': growth_type,
        'predicted': predicted_w.tolist(),
        'nObservations': len(lengths_clean),
        'logLogPoints': log_log_points,
    }


def condition_factor(
    lengths: List[Union[float, int, None]],
    weights: List[Union[float, int, None]],
    groups: Optional[List] = None,
) -> Dict:
    """
    Fulton's Condition Factor: K = 100 × W / L³

    Parameters
    ----------
    lengths : 체장 배열 (cm)
    weights : 체중 배열 (g)
    groups  : 선택적 그룹 레이블 (season, site 등)

    Returns
    -------
    {
        individualK, mean, std, median, min, max, n,
        groupStats?, comparison?
    }
    """
    # groups가 있으면 동시에 정제 (행 제거 동기화)
    has_groups = groups is not None and len(groups) == len(lengths)
    valid_mask = []
    clean_l = []
    clean_w = []

    for i in range(min(len(lengths), len(weights))):
        l_val, w_val = lengths[i], weights[i]
        if l_val is None or w_val is None:
            continue
        try:
            lf = float(l_val)
            wf = float(w_val)
            if np.isnan(lf) or np.isinf(lf) or np.isnan(wf) or np.isinf(wf):
                continue
            clean_l.append(lf)
            clean_w.append(wf)
            valid_mask.append(i)
        except (TypeError, ValueError):
            continue

    lengths_clean = np.array(clean_l)
    weights_clean = np.array(clean_w)

    if np.any(lengths_clean <= 0) or np.any(weights_clean <= 0):
        raise ValueError("체장과 체중은 양수여야 합니다")
    if len(lengths_clean) < 2:
        raise ValueError("Condition Factor requires at least 2 valid pairs")

    K = 100 * weights_clean / (lengths_clean ** 3)

    result: Dict = {
        'individualK': K.tolist(),
        'mean': float(np.mean(K)),
        'std': float(np.std(K, ddof=1)) if len(K) > 1 else 0.0,
        'median': float(np.median(K)),
        'min': float(np.min(K)),
        'max': float(np.max(K)),
        'n': len(K),
    }

    # 그룹별 비교 (정제된 인덱스에 맞춰 groups 동기화)
    if has_groups:
        raw_groups = [groups[i] for i in valid_mask]
        # None, NaN, 빈 문자열 필터링 — 유효 그룹만 남김
        valid_idx = []
        clean_groups = []
        for gi, gval in enumerate(raw_groups):
            if gval is None:
                continue
            s = str(gval).strip()
            if s == '' or s.lower() in INVALID_GROUP_VALUES:
                continue
            valid_idx.append(gi)
            clean_groups.append(s)

        if len(valid_idx) == 0:
            return result

        K = K[valid_idx]
        group_arr = np.array(clean_groups)

        unique_groups = sorted(set(group_arr.tolist()))
        group_stats: Dict = {}

        for g in unique_groups:
            mask = group_arr == g
            kg = K[mask]
            if len(kg) == 0:
                continue
            group_stats[g] = {
                'mean': float(np.mean(kg)),
                'std': float(np.std(kg, ddof=1)) if len(kg) > 1 else 0.0,
                'n': int(len(kg)),
                'median': float(np.median(kg)),
            }
        result['groupStats'] = group_stats

        # 2그룹: t-test, 3+그룹: one-way ANOVA
        valid_groups = [g for g in unique_groups if len(K[group_arr == g]) >= 2]

        if len(valid_groups) == 2:
            g1 = K[group_arr == valid_groups[0]]
            g2 = K[group_arr == valid_groups[1]]
            t_stat, p_value = stats.ttest_ind(g1, g2)
            result['comparison'] = {
                'test': 't-test',
                'statistic': float(t_stat),
                'pValue': float(p_value),
                'df': int(len(g1) + len(g2) - 2),
            }
        elif len(valid_groups) > 2:
            group_data = [K[group_arr == g] for g in valid_groups]
            f_stat, p_value = stats.f_oneway(*group_data)
            n_total = sum(len(gd) for gd in group_data)
            result['comparison'] = {
                'test': 'ANOVA',
                'statistic': float(f_stat),
                'pValue': float(p_value),
                'df': int(len(valid_groups) - 1),
                'df2': int(n_total - len(valid_groups)),
            }

    return result
