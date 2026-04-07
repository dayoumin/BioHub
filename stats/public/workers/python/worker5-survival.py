# Worker 5: Survival Analysis + ROC Curve Python Module
# Notes:
# - Dependencies: NumPy, SciPy, statsmodels, scikit-learn
# - KM: statsmodels.duration.survfunc (SurvfuncRight + survdiff)
# - ROC: sklearn.metrics (already available in worker3/4)
# - Estimated memory: ~100MB

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats
from statsmodels.duration.survfunc import SurvfuncRight, survdiff


# ─── KM 내부 유틸 ─────────────────────────────────────────


def _km_estimate(
    times: List[float],
    events: List[int],
) -> Dict:
    """
    단일 그룹 Kaplan-Meier 추정량 계산.
    statsmodels SurvfuncRight 기반 + Greenwood CI (log-log 변환).
    """
    t = np.array(times, dtype=float)
    e = np.array(events, dtype=int)

    sf = SurvfuncRight(t, e)

    # t=0 시점을 선두에 추가 (S(0)=1.0)
    km_time = [0.0] + sf.surv_times.tolist()
    km_surv = [1.0] + sf.surv_prob.tolist()

    # at-risk: t=0에서 전체 수, 이후 각 이벤트 시점 이후 남은 관측치 수
    at_risk_list = [int(len(t))] + [
        int(np.sum(t > tj)) for tj in sf.surv_times
    ]

    # Greenwood CI (log-log 변환) — R survival::survfit 기본 방식
    km_ci_lo = [1.0]
    km_ci_hi = [1.0]
    greenwood_sum = 0.0
    for i in range(len(sf.surv_times)):
        nr = float(sf.n_risk[i])
        ne = float(sf.n_events[i])
        if nr > ne:
            greenwood_sum += ne / (nr * (nr - ne))
        s = float(sf.surv_prob[i])
        if s > 0 and greenwood_sum > 0 and abs(np.log(s)) > 1e-12:
            log_log_s = np.log(-np.log(s))
            se = np.sqrt(greenwood_sum) / abs(np.log(s))
            lo = float(np.exp(-np.exp(log_log_s + 1.96 * se)))
            hi = float(np.exp(-np.exp(log_log_s - 1.96 * se)))
            km_ci_lo.append(max(0.0, lo))
            km_ci_hi.append(min(1.0, hi))
        else:
            km_ci_lo.append(0.0)
            km_ci_hi.append(1.0)

    # 중앙 생존 시간
    median_survival: Optional[float] = None
    try:
        med = sf.quantile(0.5)
        if not np.isnan(med):
            median_survival = float(med)
    except Exception:
        pass

    # 중도절단 시점 목록
    idx = np.argsort(t)
    censored_times: List[float] = [float(t[idx[i]]) for i in range(len(t)) if e[idx[i]] == 0]

    total_events = int(np.sum(e == 1))

    return {
        'time': km_time,
        'survival': km_surv,
        'ciLo': km_ci_lo,
        'ciHi': km_ci_hi,
        'atRisk': at_risk_list,
        'medianSurvival': median_survival,
        'censored': censored_times,
        'nEvents': total_events,
    }


def _log_rank_test(
    groups_times: List[List[float]],
    groups_events: List[List[int]],
) -> Optional[float]:
    """
    다중 그룹 Log-rank 검정 (statsmodels.duration.survfunc.survdiff).
    반환: p-value (float) 또는 None (계산 불가시)
    """
    k = len(groups_times)
    if k < 2:
        return None

    # survdiff는 단일 배열 + 그룹 레이블 형식
    all_times: List[float] = []
    all_events: List[int] = []
    all_groups: List[int] = []
    for gi, (g_t, g_e) in enumerate(zip(groups_times, groups_events)):
        all_times.extend(g_t)
        all_events.extend(g_e)
        all_groups.extend([gi] * len(g_t))

    try:
        time_arr = np.array(all_times, dtype=float)
        event_arr = np.array(all_events, dtype=int)
        group_arr = np.array(all_groups, dtype=int)
        result = survdiff(time_arr, event_arr, group_arr)
        # survdiff returns (chi2_statistic, p_value)
        return float(result[1])
    except Exception:
        return None


# ─── 공개 함수 ────────────────────────────────────────────


def kaplan_meier_analysis(
    time: List[float],
    event: List[int],
    group: Optional[List] = None,
) -> Dict:
    """
    그룹 인식 Kaplan-Meier 생존 분석 (statsmodels SurvfuncRight + survdiff).

    Parameters
    ----------
    time    : 생존 시간 배열
    event   : 이벤트 발생 여부 (1=이벤트, 0=중도절단)
    group   : 그룹 레이블 배열 (None이면 단일 그룹 'All')

    Returns
    -------
    {
        curves: {groupName: {time, survival, ciLo, ciHi, atRisk, medianSurvival}},
        logRankP: float | null,
        medianSurvivalTime: float | null,  # 전체(또는 첫 그룹) 중앙 생존 시간
    }
    """
    time_arr = [float(v) for v in time]
    event_arr = [int(v) for v in event]

    if len(time_arr) != len(event_arr):
        raise ValueError(
            f"time and event must have the same length: {len(time_arr)} != {len(event_arr)}"
        )
    if len(time_arr) < 2:
        raise ValueError(f"Kaplan-Meier requires at least 2 observations, got {len(time_arr)}")

    curves: Dict = {}
    log_rank_p: Optional[float] = None

    if group is None or all(v is None for v in group):
        # 단일 그룹
        km = _km_estimate(time_arr, event_arr)
        curves['All'] = km
        overall_median = km['medianSurvival']
    else:
        group_arr = [str(v) for v in group]
        unique_groups = sorted(set(group_arr))

        groups_times: List[List[float]] = []
        groups_events: List[List[int]] = []

        for g in unique_groups:
            mask = [v == g for v in group_arr]
            g_times = [t for t, m in zip(time_arr, mask) if m]
            g_events = [e for e, m in zip(event_arr, mask) if m]
            if len(g_times) < 2:
                continue
            km = _km_estimate(g_times, g_events)
            curves[g] = km
            groups_times.append(g_times)
            groups_events.append(g_events)

        if len(groups_times) >= 2:
            log_rank_p = _log_rank_test(groups_times, groups_events)

        # 대표 중앙 생존 시간 — 첫 번째 그룹 기준
        first_group = list(curves.values())[0] if curves else {}
        overall_median = first_group.get('medianSurvival')

    return {
        'curves': curves,
        'logRankP': log_rank_p,
        'medianSurvivalTime': overall_median,
    }


def meta_analysis(
    effectSizes: List[float],
    standardErrors: List[float],
    studyNames: Optional[List[str]] = None,
    model: str = 'random',
) -> Dict:
    """
    고정/랜덤 효과 메타분석 (DerSimonian-Laird).

    Parameters
    ----------
    effectSizes     : 각 연구의 효과크기 (Cohen's d, log OR, Hedges' g 등)
    standardErrors  : 각 연구의 표준오차
    studyNames      : 연구 이름 (선택적, Forest plot 라벨용)
    model           : 'fixed' 또는 'random' (기본: random)

    Returns
    -------
    {
        pooledEffect, pooledSE, ci, zValue, pValue,
        Q, QpValue, iSquared, tauSquared, model,
        weights, studyCiLower, studyCiUpper, studyNames,
    }
    """
    es = np.array(effectSizes, dtype=float)
    se = np.array(standardErrors, dtype=float)
    k = len(es)

    if k < 2:
        raise ValueError(f"Meta-analysis requires at least 2 studies, got {k}")
    if len(se) != k:
        raise ValueError(f"effectSizes and standardErrors must have the same length")
    if np.any(se <= 0):
        raise ValueError("All standard errors must be positive")

    names = studyNames if studyNames else [f"Study {i+1}" for i in range(k)]

    # 역분산 가중치 (고정 효과)
    w_fixed = 1.0 / se**2

    # --- 고정 효과 모델 ---
    pooled_fixed = float(np.sum(w_fixed * es) / np.sum(w_fixed))
    se_fixed = float(np.sqrt(1.0 / np.sum(w_fixed)))

    # --- 이질성 검정 ---
    Q = float(np.sum(w_fixed * (es - pooled_fixed)**2))
    df = k - 1
    Q_pvalue = float(1.0 - stats.chi2.cdf(Q, df))
    I_squared = max(0.0, (Q - df) / Q * 100.0) if Q > 0 else 0.0

    # --- 랜덤 효과 모델 (DerSimonian-Laird) ---
    C = float(np.sum(w_fixed) - np.sum(w_fixed**2) / np.sum(w_fixed))
    tau_squared = max(0.0, (Q - df) / C) if C > 0 else 0.0

    w_random = 1.0 / (se**2 + tau_squared)
    pooled_random = float(np.sum(w_random * es) / np.sum(w_random))
    se_random = float(np.sqrt(1.0 / np.sum(w_random)))

    # 선택된 모델
    if model == 'fixed':
        pooled, se_pooled, weights = pooled_fixed, se_fixed, w_fixed
    else:
        pooled, se_pooled, weights = pooled_random, se_random, w_random

    # 95% CI + z-test
    ci_lower = pooled - 1.96 * se_pooled
    ci_upper = pooled + 1.96 * se_pooled
    z = pooled / se_pooled if se_pooled > 0 else 0.0
    p_value = float(2.0 * (1.0 - stats.norm.cdf(abs(z))))

    # 개별 연구 CI (forest plot용)
    study_ci_lower = (es - 1.96 * se).tolist()
    study_ci_upper = (es + 1.96 * se).tolist()

    # 정규화 가중치 (%)
    norm_weights = (weights / np.sum(weights) * 100.0).tolist()

    return {
        'pooledEffect': float(pooled),
        'pooledSE': float(se_pooled),
        'ci': [float(ci_lower), float(ci_upper)],
        'zValue': float(z),
        'pValue': float(p_value),
        'Q': Q,
        'QpValue': Q_pvalue,
        'iSquared': float(I_squared),
        'tauSquared': float(tau_squared),
        'model': model,
        'weights': norm_weights,
        'studyCiLower': study_ci_lower,
        'studyCiUpper': study_ci_upper,
        'studyNames': list(names),
        'effectSizes': es.tolist(),
    }


def icc_analysis(
    data: List[List[float]],
    iccType: str = 'ICC3_1',
) -> Dict:
    """
    ICC (Intraclass Correlation Coefficient) 계산.
    Shrout & Fleiss (1979) 공식.

    Parameters
    ----------
    data    : n_subjects × n_raters 행렬 (2D list)
    iccType : 'ICC1_1', 'ICC2_1', 'ICC3_1' (기본: ICC3_1)

    Returns
    -------
    {
        icc, iccType, fValue, df1, df2, pValue,
        ci, msRows, msCols, msError,
        nSubjects, nRaters, interpretation,
    }
    """
    mat = np.array(data, dtype=float)
    if mat.ndim != 2:
        raise ValueError("Data must be a 2D matrix (subjects × raters)")

    n, k = mat.shape  # n=대상 수, k=평가자 수

    if n < 3:
        raise ValueError(f"ICC requires at least 3 subjects, got {n}")
    if k < 2:
        raise ValueError(f"ICC requires at least 2 raters/measurements, got {k}")

    # 평균 제곱 (Mean Squares)
    grand_mean = np.mean(mat)
    row_means = np.mean(mat, axis=1)
    col_means = np.mean(mat, axis=0)

    SS_rows = k * np.sum((row_means - grand_mean)**2)      # Between subjects
    SS_cols = n * np.sum((col_means - grand_mean)**2)      # Between raters
    SS_total = np.sum((mat - grand_mean)**2)
    SS_error = SS_total - SS_rows - SS_cols                 # Residual

    MS_rows = SS_rows / (n - 1)
    MS_cols = SS_cols / (k - 1) if k > 1 else 0.0
    MS_error = SS_error / ((n - 1) * (k - 1)) if (n - 1) * (k - 1) > 0 else 0.0

    # ICC 유형별 계산
    if iccType == 'ICC1_1':
        # One-way random, single measures
        MS_within = (SS_total - SS_rows) / (n * (k - 1)) if n * (k - 1) > 0 else 0.0
        icc_val = (MS_rows - MS_within) / (MS_rows + (k - 1) * MS_within) if (MS_rows + (k - 1) * MS_within) > 0 else 0.0
        # F-test for ICC(1,1)
        f_value = MS_rows / MS_within if MS_within > 0 else 0.0
        df1 = n - 1
        df2 = n * (k - 1)
    elif iccType == 'ICC2_1':
        # Two-way random, single measures
        denom = MS_rows + (k - 1) * MS_error + k * (MS_cols - MS_error) / n
        icc_val = (MS_rows - MS_error) / denom if denom > 0 else 0.0
        f_value = MS_rows / MS_error if MS_error > 0 else 0.0
        df1 = n - 1
        df2 = (n - 1) * (k - 1)
    elif iccType == 'ICC3_1':
        # Two-way mixed, single measures (가장 흔히 사용)
        denom = MS_rows + (k - 1) * MS_error
        icc_val = (MS_rows - MS_error) / denom if denom > 0 else 0.0
        f_value = MS_rows / MS_error if MS_error > 0 else 0.0
        df1 = n - 1
        df2 = (n - 1) * (k - 1)
    else:
        raise ValueError(f"Unknown ICC type: {iccType}. Use 'ICC1_1', 'ICC2_1', or 'ICC3_1'")

    # p-value
    p_value = float(1.0 - stats.f.cdf(f_value, df1, df2)) if f_value > 0 else 1.0

    # 95% CI
    if iccType == 'ICC3_1':
        # McGraw & Wong (1996) exact F-based CI for ICC(3,1)
        F_L = f_value / stats.f.ppf(0.975, df1, df2) if f_value > 0 else 0.0
        F_U = f_value / stats.f.ppf(0.025, df1, df2) if f_value > 0 else 0.0
        ci_lower = max(-1.0, (F_L - 1) / (F_L + k - 1))
        ci_upper = min(1.0, (F_U - 1) / (F_U + k - 1))
    elif iccType == 'ICC2_1':
        # McGraw & Wong (1996) CI for ICC(2,1) — accounts for rater variance
        Fj = MS_cols / MS_error if MS_error > 0 else 1.0
        vn = (k - 1) * (n - 1) * ((k * icc_val * Fj + n * (1 + (k - 1) * icc_val) - k * icc_val) ** 2)
        vd = ((n - 1) * k ** 2 * icc_val ** 2 * Fj ** 2
              + (n * (1 + (k - 1) * icc_val) - k * icc_val) ** 2)
        v = vn / vd if vd > 0 else df2
        F3U = stats.f.ppf(0.975, n - 1, v) if v > 0 else 1.0
        F3L = stats.f.ppf(0.025, n - 1, v) if v > 0 else 1.0
        ci_lower_num = n * (MS_rows - F3U * MS_error)
        ci_lower_den = F3U * (k * MS_cols + (n * k - k - n) * MS_error) + n * MS_rows
        ci_lower = max(-1.0, ci_lower_num / ci_lower_den) if ci_lower_den != 0 else -1.0
        ci_upper_num = n * (MS_rows - F3L * MS_error)
        ci_upper_den = F3L * (k * MS_cols + (n * k - k - n) * MS_error) + n * MS_rows
        ci_upper = min(1.0, ci_upper_num / ci_upper_den) if ci_upper_den != 0 else 1.0
    else:
        # ICC(1,1) CI — Shrout & Fleiss approximation
        ci_lower = max(-1.0, float(icc_val - 1.96 * np.sqrt(2.0 * (1 - icc_val)**2 * (1 + (k - 1) * icc_val)**2 / (k * (n - 1) * (k - 1)))))
        ci_upper = min(1.0, float(icc_val + 1.96 * np.sqrt(2.0 * (1 - icc_val)**2 * (1 + (k - 1) * icc_val)**2 / (k * (n - 1) * (k - 1)))))

    # 해석 기준 (Cicchetti, 1994)
    icc_float = float(icc_val)
    if icc_float < 0.40:
        interpretation = 'poor'
    elif icc_float < 0.60:
        interpretation = 'fair'
    elif icc_float < 0.75:
        interpretation = 'good'
    else:
        interpretation = 'excellent'

    return {
        'icc': icc_float,
        'iccType': iccType,
        'fValue': float(f_value),
        'df1': int(df1),
        'df2': int(df2),
        'pValue': float(p_value),
        'ci': [float(ci_lower), float(ci_upper)],
        'msRows': float(MS_rows),
        'msCols': float(MS_cols),
        'msError': float(MS_error),
        'nSubjects': int(n),
        'nRaters': int(k),
        'interpretation': interpretation,
    }


def roc_curve_analysis(
    actualClass: List[int],
    predictedProb: List[float],
) -> Dict:
    """
    ROC 곡선 분석 및 AUC 계산.

    Parameters
    ----------
    actualClass   : 실제 이진 결과 (0/1)
    predictedProb : 예측 확률 (0~1)

    Returns
    -------
    {
        rocPoints: [{fpr, tpr}],
        auc: float,
        aucCI: {lower, upper},   # Hanley-McNeil 근사
        optimalThreshold: float,  # Youden's J 기준
        sensitivity: float,
        specificity: float,
    }
    """
    from sklearn.metrics import roc_curve, roc_auc_score

    actual = np.array(actualClass, dtype=int)
    pred = np.array(predictedProb, dtype=float)

    n = len(actual)
    if n < 4:
        raise ValueError(f"ROC analysis requires at least 4 observations, got {n}")

    n_pos = int(np.sum(actual == 1))
    n_neg = int(np.sum(actual == 0))
    if n_pos == 0 or n_neg == 0:
        raise ValueError("Both classes (0 and 1) must be present in actualClass")

    fpr, tpr, thresholds = roc_curve(actual, pred)
    auc = float(roc_auc_score(actual, pred))

    # Hanley-McNeil 근사 AUC 신뢰구간
    q1 = auc / (2 - auc)
    q2 = 2 * auc ** 2 / (1 + auc)
    se_auc = float(np.sqrt(
        (auc * (1 - auc) + (n_pos - 1) * (q1 - auc ** 2) + (n_neg - 1) * (q2 - auc ** 2))
        / (n_pos * n_neg)
    ))
    auc_ci_lo = max(0.0, auc - 1.96 * se_auc)
    auc_ci_hi = min(1.0, auc + 1.96 * se_auc)

    # 최적 임계값 — Youden's J = sensitivity + specificity - 1
    youden = tpr - fpr
    optimal_idx = int(np.argmax(youden))
    optimal_threshold = float(thresholds[optimal_idx])

    pred_binary = (pred >= optimal_threshold).astype(int)
    sensitivity = float(np.sum((pred_binary == 1) & (actual == 1)) / n_pos)
    specificity = float(np.sum((pred_binary == 0) & (actual == 0)) / n_neg)

    return {
        'rocPoints': [{'fpr': float(f), 'tpr': float(t)} for f, t in zip(fpr, tpr)],
        'auc': auc,
        'aucCI': {'lower': auc_ci_lo, 'upper': auc_ci_hi},
        'optimalThreshold': optimal_threshold,
        'sensitivity': sensitivity,
        'specificity': specificity,
    }
