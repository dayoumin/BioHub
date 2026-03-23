# Bio-Tools: 방법론 (4개) 계획서

**작성일**: 2026-03-20
**상태**: 계획 수립
**상위 문서**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) (S6 단계)

---

## 도구 목록

| ID | 한글명 | 영문 | Pyodide 라이브러리 |
|----|--------|------|-------------------|
| `meta-analysis` | 메타분석 | Forest Plot, I², Q-test | numpy + scipy (순수 구현) |
| `roc-auc` | ROC 곡선 / AUC | ROC-AUC Analysis | scikit-learn |
| `icc` | ICC | Intraclass Correlation | numpy + scipy (순수 구현) |
| `survival` | 생존 분석 | Kaplan-Meier + Log-rank | numpy + scipy (순수 구현) |

> lifelines는 pure Python이라 micropip으로 설치 가능할 수 있으나, 의존성 체인이 길어 불안정. numpy/scipy 순수 구현이 안전.

---

## 1. Meta-Analysis (메타분석)

### 개요

여러 독립 연구의 효과크기를 통합. Forest plot + 이질성 검정(Q, I²).

### 입력

```csv
study, effect_size, se, n
Kim2023, 0.45, 0.12, 30
Lee2024, 0.62, 0.15, 25
Park2024, 0.38, 0.10, 45
Choi2025, 0.51, 0.18, 20
```

- effect_size: 효과크기 (Cohen's d, log OR, Hedges' g 등)
- se: 표준오차
- n: 표본 크기

또는: mean1, sd1, n1, mean2, sd2, n2 → 자동으로 효과크기 계산.

### 계산

```python
import numpy as np
from scipy import stats

def meta_analysis(effect_sizes, standard_errors, model='random'):
    """
    고정/랜덤 효과 메타분석
    """
    es = np.array(effect_sizes)
    se = np.array(standard_errors)
    k = len(es)

    # 가중치 (역분산)
    w_fixed = 1 / se**2

    # --- 고정 효과 모델 ---
    pooled_fixed = np.sum(w_fixed * es) / np.sum(w_fixed)
    se_fixed = np.sqrt(1 / np.sum(w_fixed))

    # --- 이질성 검정 ---
    Q = np.sum(w_fixed * (es - pooled_fixed)**2)
    df = k - 1
    Q_pvalue = 1 - stats.chi2.cdf(Q, df)
    I_squared = max(0, (Q - df) / Q * 100) if Q > 0 else 0.0  # %

    # --- 랜덤 효과 모델 (DerSimonian-Laird) ---
    C = np.sum(w_fixed) - np.sum(w_fixed**2) / np.sum(w_fixed)
    tau_squared = max(0, (Q - df) / C)

    w_random = 1 / (se**2 + tau_squared)
    pooled_random = np.sum(w_random * es) / np.sum(w_random)
    se_random = np.sqrt(1 / np.sum(w_random))

    # 선택된 모델
    if model == 'fixed':
        pooled, se_pooled, weights = pooled_fixed, se_fixed, w_fixed
    else:
        pooled, se_pooled, weights = pooled_random, se_random, w_random

    # 95% CI
    ci_lower = pooled - 1.96 * se_pooled
    ci_upper = pooled + 1.96 * se_pooled
    z = pooled / se_pooled
    p_value = 2 * (1 - stats.norm.cdf(abs(z)))

    # 개별 연구 CI (forest plot용)
    study_ci_lower = es - 1.96 * se
    study_ci_upper = es + 1.96 * se

    return {
        "pooledEffect": pooled,
        "pooledSE": se_pooled,
        "ci": [ci_lower, ci_upper],
        "zValue": z,
        "pValue": p_value,
        "Q": Q,
        "QpValue": Q_pvalue,
        "iSquared": I_squared,
        "tauSquared": tau_squared,
        "model": model,
        "weights": (weights / np.sum(weights) * 100).tolist(),
        "studyCiLower": study_ci_lower.tolist(),
        "studyCiUpper": study_ci_upper.tolist(),
    }
```

### 출력

| 항목 | 값 |
|------|-----|
| 통합 효과크기 | 0.48 |
| 95% CI | [0.32, 0.64] |
| z | 5.92 |
| p-value | < 0.001 |
| Q (이질성) | 8.45 |
| I² | 64.5% |
| tau² | 0.023 |
| 모델 | 랜덤 효과 |

### 시각화

**Forest Plot** (핵심 — 메타분석의 대표 시각화):
- 각 연구: 효과크기 + 95% CI (가로 에러바)
- 가중치에 비례하는 사각형 크기
- 다이아몬드: 통합 효과크기 + CI
- 수직 기준선: 0 (귀무) 또는 1 (OR)

**Funnel Plot** (출판 편향 검정):
- X축: 효과크기, Y축: SE (역순)
- 비대칭이면 출판 편향 의심

---

## 2. ROC / AUC

### 개요

이진 분류 모델의 진단 성능 평가. SDM(종분포모델), 질병 진단 등에 사용.

### 입력

```csv
actual, predicted_prob
1, 0.92
0, 0.35
1, 0.78
0, 0.12
1, 0.88
0, 0.55
```

- actual: 실제 레이블 (0/1)
- predicted_prob: 예측 확률 (0~1)

### 계산

```python
from sklearn.metrics import roc_curve, auc, confusion_matrix
import numpy as np

def roc_analysis(y_true, y_scores):
    """ROC 곡선 + AUC + 최적 임계값"""
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)
    roc_auc = auc(fpr, tpr)

    # Youden's J — 최적 임계값
    j_scores = tpr - fpr
    best_idx = np.argmax(j_scores)
    best_threshold = thresholds[best_idx]
    best_sensitivity = tpr[best_idx]
    best_specificity = 1 - fpr[best_idx]

    # 최적 임계값에서 confusion matrix
    y_pred = (y_scores >= best_threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

    return {
        "fpr": fpr.tolist(),
        "tpr": tpr.tolist(),
        "thresholds": thresholds.tolist(),
        "auc": roc_auc,
        "bestThreshold": best_threshold,
        "sensitivity": best_sensitivity,
        "specificity": best_specificity,
        "tp": int(tp), "fp": int(fp),
        "tn": int(tn), "fn": int(fn),
    }
```

### 출력

| 항목 | 값 |
|------|-----|
| AUC | 0.89 |
| 최적 임계값 (Youden's J) | 0.52 |
| 민감도 (Sensitivity) | 0.85 |
| 특이도 (Specificity) | 0.82 |

### 시각화

- ROC 곡선 (FPR vs TPR) + 대각선(chance) + AUC 음영
- 최적 임계값 점 표시
- AUC 해석 기준: 0.9+ 우수, 0.8-0.9 양호, 0.7-0.8 허용, <0.7 불량

---

## 3. ICC (Intraclass Correlation)

### 개요

반복 측정 또는 평가자 간 일치도. 생태학에서는 repeatability 연구에 사용.

### 입력

```csv
subject, rater1, rater2, rater3
Fish1, 15.2, 15.5, 15.1
Fish2, 22.3, 22.8, 22.1
Fish3, 18.7, 18.5, 19.0
Fish4, 30.1, 30.5, 29.8
```

### 계산

```python
import numpy as np
from scipy import stats

def icc(data, icc_type='ICC3_1'):
    """
    ICC 계산 (Shrout & Fleiss, 1979)
    data: n_subjects × n_raters 행렬
    icc_type: 'ICC1_1', 'ICC2_1', 'ICC3_1' 등
    """
    n, k = data.shape  # n=대상 수, k=평가자 수

    # 평균 제곱 (Mean Squares)
    grand_mean = np.mean(data)
    row_means = np.mean(data, axis=1)
    col_means = np.mean(data, axis=0)

    SS_total = np.sum((data - grand_mean)**2)
    SS_rows = k * np.sum((row_means - grand_mean)**2)      # 대상간 (Between subjects)
    SS_cols = n * np.sum((col_means - grand_mean)**2)      # 평가자간 (Between raters)
    SS_error = SS_total - SS_rows - SS_cols                 # 잔차

    MS_rows = SS_rows / (n - 1)
    MS_cols = SS_cols / (k - 1)
    MS_error = SS_error / ((n - 1) * (k - 1))

    # ICC 유형별 계산
    if icc_type == 'ICC1_1':
        # One-way random, single measures
        MS_within = (SS_total - SS_rows) / (n * (k - 1))
        icc_val = (MS_rows - MS_within) / (MS_rows + (k - 1) * MS_within)
    elif icc_type == 'ICC2_1':
        # Two-way random, single measures
        icc_val = (MS_rows - MS_error) / (MS_rows + (k - 1) * MS_error + k * (MS_cols - MS_error) / n)
    elif icc_type == 'ICC3_1':
        # Two-way mixed, single measures (가장 흔히 사용)
        icc_val = (MS_rows - MS_error) / (MS_rows + (k - 1) * MS_error)
    else:
        raise ValueError(f"Unknown ICC type: {icc_type}")

    # F-test
    f_value = MS_rows / MS_error
    df1 = n - 1
    df2 = (n - 1) * (k - 1)
    p_value = 1 - stats.f.cdf(f_value, df1, df2)

    # 95% CI (Shrout & Fleiss 근사)
    # ... (복잡한 공식 생략, 구현 시 추가)

    return {
        "icc": icc_val,
        "iccType": icc_type,
        "fValue": f_value,
        "df1": df1,
        "df2": df2,
        "pValue": p_value,
        "msRows": MS_rows,
        "msCols": MS_cols,
        "msError": MS_error,
    }
```

### 출력

| 항목 | 값 |
|------|-----|
| ICC (3,1) | 0.92 |
| F | 12.5 |
| p-value | < 0.001 |
| 95% CI | [0.85, 0.97] |

해석 기준 (Cicchetti, 1994):
- < 0.40: 불량
- 0.40-0.59: 보통
- 0.60-0.74: 양호
- 0.75+: 우수

### 시각화

- Bland-Altman 스타일 일치도 플롯 (평가자 쌍별)
- ICC 값 + CI 게이지 차트

---

## 4. Survival Analysis (생존 분석)

### 개요

시간-사건 데이터 분석. 양식 실험(생존율), 방류 후 생존, 독성 시험 등.

### 입력

```csv
time, event, group
5, 1, Control
12, 1, Control
15, 0, Control
8, 1, Treatment
20, 0, Treatment
25, 1, Treatment
```

- time: 관찰 시간 (일, 시간 등)
- event: 사건 발생 여부 (1=사망/사건, 0=중도절단)
- group: 그룹 (선택적 — 있으면 그룹 간 비교)

### 계산

```python
import numpy as np
from scipy import stats

def kaplan_meier(times, events):
    """Kaplan-Meier 생존 함수 추정"""
    times = np.array(times)
    events = np.array(events)

    unique_times = np.sort(np.unique(times[events == 1]))
    n_at_risk = []
    n_events = []
    survival = []
    s = 1.0

    for t in unique_times:
        n_risk = np.sum(times >= t)
        n_event = np.sum((times == t) & (events == 1))
        s *= (1 - n_event / n_risk)

        n_at_risk.append(int(n_risk))
        n_events.append(int(n_event))
        survival.append(s)

    # Greenwood 분산 → 95% CI
    var_s = []
    s_temp = 1.0
    var_sum = 0
    for i, t in enumerate(unique_times):
        d = n_events[i]
        n = n_at_risk[i]
        s_temp *= (1 - d / n)
        if n > d:
            var_sum += d / (n * (n - d))
        var_s.append(s_temp**2 * var_sum)

    se = np.sqrt(var_s)
    ci_lower = np.maximum(0, np.array(survival) - 1.96 * se)
    ci_upper = np.minimum(1, np.array(survival) + 1.96 * se)

    # 중앙 생존 시간
    surv_arr = np.array(survival)
    median_idx = np.where(surv_arr <= 0.5)[0]
    median_survival = unique_times[median_idx[0]] if len(median_idx) > 0 else None

    return {
        "times": unique_times.tolist(),
        "survival": survival,
        "ciLower": ci_lower.tolist(),
        "ciUpper": ci_upper.tolist(),
        "nAtRisk": n_at_risk,
        "nEvents": n_events,
        "medianSurvival": median_survival,
    }


def log_rank_test(times1, events1, times2, events2):
    """Log-rank 검정 (2그룹 생존 곡선 비교)"""
    all_times = np.sort(np.unique(np.concatenate([
        times1[events1 == 1], times2[events2 == 1]
    ])))

    O1, E1, V = 0, 0, 0.0  # 관측, 기대, 분산

    for t in all_times:
        d1 = np.sum((times1 == t) & (events1 == 1))
        d2 = np.sum((times2 == t) & (events2 == 1))
        n1 = np.sum(times1 >= t)
        n2 = np.sum(times2 >= t)
        d = d1 + d2
        n = n1 + n2

        if n == 0:
            continue

        O1 += d1
        E1 += n1 * d / n

        # 초기하분포 분산 (hypergeometric variance)
        if n > 1:
            V += n1 * n2 * d * (n - d) / (n**2 * (n - 1))

    # Chi-square (1 df) — (O-E)²/V (분산 기반, E 아님)
    chi2 = float((O1 - E1)**2 / V) if V > 0 else 0.0
    p_value = float(1 - stats.chi2.cdf(chi2, df=1))

    return {
        "chiSquare": chi2,
        "pValue": p_value,
        "observed1": O1,
        "expected1": E1,
        "variance": V,
    }
```

### 출력

| 항목 | 값 |
|------|-----|
| 중앙 생존 시간 (Control) | 18일 |
| 중앙 생존 시간 (Treatment) | 32일 |
| Log-rank chi² | 6.84 |
| p-value | 0.009 |

### 시각화

- **Kaplan-Meier 곡선** (계단 함수 + 95% CI 밴드)
- 그룹별 색상 구분
- 중도절단 표시 (+ 마커)
- Number at risk 테이블 (곡선 하단)

---

## Pyodide 의존성 요약

| 패키지 | 용도 | Pyodide 지원 |
|--------|------|-------------|
| numpy | 모든 수치 계산 | O (기본) |
| scipy.stats | 분포 함수, 검정 | O (기본) |
| scikit-learn | ROC/AUC | O (기본) |
| lifelines | — | micropip 가능하나 불안정, 사용 안 함 |

---

## 구현 순서

| 단계 | 내용 | 예상 |
|------|------|------|
| M1 | ROC/AUC — scikit-learn 기반 (가장 단순) | 1일 |
| M2 | ICC — numpy/scipy (수식 직접) | 1일 |
| M3 | Survival — KM + Log-rank + 차트 | 2일 |
| M4 | Meta-Analysis — Forest plot이 핵심 | 2일 |
| **합계** | | **~6일** |
