# Worker 5: Survival Analysis + ROC Curve Python Module
# Notes:
# - Dependencies: NumPy, SciPy, scikit-learn (no lifelines — not in Pyodide)
# - KM: scipy-based direct implementation (Greenwood variance formula)
# - ROC: sklearn.metrics (already available in worker3/4)
# - Estimated memory: ~100MB

from typing import List, Dict, Optional, Union
import numpy as np
from scipy import stats


# ─── KM 내부 유틸 ─────────────────────────────────────────


def _km_estimate(
    times: List[float],
    events: List[int],
) -> Dict:
    """
    단일 그룹 Kaplan-Meier 추정량 계산.
    Greenwood 분산 공식으로 95% CI (log-log 변환).
    """
    t = np.array(times, dtype=float)
    e = np.array(events, dtype=int)

    # 시간순 정렬
    idx = np.argsort(t)
    t = t[idx]
    e = e[idx]

    unique_times = sorted(set(t.tolist()))

    km_time = [0.0]
    km_surv = [1.0]
    km_ci_lo = [1.0]
    km_ci_hi = [1.0]
    at_risk_list = [int(len(t))]

    S = 1.0
    greenwood_sum = 0.0

    for tj in unique_times:
        n_risk = int(np.sum(t >= tj))
        n_events = int(np.sum((t == tj) & (e == 1)))

        if n_events == 0:
            continue  # 중도절단만 있는 시점은 건너뜀

        S *= 1.0 - n_events / n_risk

        if n_risk > n_events:
            greenwood_sum += n_events / (n_risk * (n_risk - n_events))

        km_time.append(float(tj))
        km_surv.append(float(S))
        at_risk_list.append(int(np.sum(t > tj)))  # 이후 남은 수

        # Greenwood CI — log(-log) 변환
        if S > 0 and greenwood_sum > 0 and abs(np.log(S)) > 1e-12:
            log_log_S = np.log(-np.log(S))
            se = np.sqrt(greenwood_sum) / abs(np.log(S))
            lo = float(np.exp(-np.exp(log_log_S + 1.96 * se)))
            hi = float(np.exp(-np.exp(log_log_S - 1.96 * se)))
            km_ci_lo.append(max(0.0, lo))
            km_ci_hi.append(min(1.0, hi))
        else:
            km_ci_lo.append(0.0)
            km_ci_hi.append(1.0)

    # 중앙 생존 시간 (S(t) ≤ 0.5인 첫 시점)
    median_survival: Optional[float] = None
    for i, s in enumerate(km_surv):
        if s <= 0.5:
            median_survival = km_time[i]
            break

    # 중도절단 시점 목록 (event=0인 관측치의 시간)
    censored_times: List[float] = [float(t[i]) for i in range(len(t)) if e[i] == 0]

    return {
        'time': km_time,
        'survival': km_surv,
        'ciLo': km_ci_lo,
        'ciHi': km_ci_hi,
        'atRisk': at_risk_list,
        'medianSurvival': median_survival,
        'censored': censored_times,
    }


def _log_rank_test(
    groups_times: List[List[float]],
    groups_events: List[List[int]],
) -> Optional[float]:
    """
    다중 그룹 Log-rank 검정 (일반화된 Mantel-Haenszel).
    2개 이상 그룹에 적용 가능.
    반환: p-value (float) 또는 None (계산 불가시)
    """
    k = len(groups_times)
    if k < 2:
        return None

    # 전체 이벤트 발생 시점 수집
    all_event_times = sorted(set(
        t
        for g_t, g_e in zip(groups_times, groups_events)
        for t, e in zip(g_t, g_e)
        if e == 1
    ))

    if not all_event_times:
        return None

    # O - E 벡터 및 분산-공분산 행렬 계산 (마지막 그룹 제외)
    O_minus_E = np.zeros(k - 1)
    V = np.zeros((k - 1, k - 1))

    for tj in all_event_times:
        n = np.array([
            sum(1 for ti in g_t if ti >= tj)
            for g_t in groups_times
        ], dtype=float)
        d = np.array([
            sum(1 for ti, ei in zip(g_t, g_e) if ti == tj and ei == 1)
            for g_t, g_e in zip(groups_times, groups_events)
        ], dtype=float)
        N = float(np.sum(n))
        D = float(np.sum(d))

        if N < 2 or D == 0:
            continue

        for i in range(k - 1):
            E_i = n[i] * D / N
            O_minus_E[i] += d[i] - E_i
            for j in range(k - 1):
                if i == j:
                    V[i, j] += n[i] * (N - n[i]) * D * (N - D) / (N * N * (N - 1))
                else:
                    V[i, j] -= n[i] * n[j] * D * (N - D) / (N * N * (N - 1))

    try:
        chi2_stat = float(O_minus_E @ np.linalg.inv(V) @ O_minus_E)
        p_value = float(stats.chi2.sf(chi2_stat, df=k - 1))
        return p_value
    except (np.linalg.LinAlgError, Exception):
        return None


# ─── 공개 함수 ────────────────────────────────────────────


def kaplan_meier_analysis(
    time: List[float],
    event: List[int],
    group: Optional[List] = None,
) -> Dict:
    """
    그룹 인식 Kaplan-Meier 생존 분석 (scipy 기반, lifelines 불사용).

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
