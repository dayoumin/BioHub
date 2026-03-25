# Bio-Tools: 수산학 (3개) 계획서

**작성일**: 2026-03-20
**상태**: 계획 수립
**상위 문서**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) (S5 단계)

---

## 도구 목록

| ID | 한글명 | 영문 | Pyodide 라이브러리 |
|----|--------|------|-------------------|
| `vbgf` | von Bertalanffy 성장 모델 | VBGF (L-infinity, K, t0) | scipy.optimize.curve_fit |
| `length-weight` | 체장-체중 관계식 | W = aL^b | scipy.optimize + log 변환 |
| `condition-factor` | 비만도 (Fulton's K) | Condition Factor | numpy (단순 수식) |

> L-W와 Condition Factor는 같은 CSV(체장, 체중)를 사용 → UI에서 연결 동선 제공.

---

## 1. von Bertalanffy 성장 모델 (VBGF)

### 개요

어류 성장을 기술하는 가장 기본적인 모델. 수산자원평가의 필수 파라미터(L-infinity, K, t0)를 추정.

### 입력

```csv
age, length
0.5, 8.2
1.0, 14.5
1.5, 19.1
2.0, 22.8
3.0, 27.5
5.0, 32.1
```

- age: 연령 (년)
- length: 체장 (cm, mm, 또는 기타 단위 — 사용자 지정)

### 계산

```python
import numpy as np
from scipy.optimize import curve_fit
from helpers import clean_paired_arrays

def vbgf(t, l_inf, k, t0):
    """von Bertalanffy Growth Function"""
    return l_inf * (1 - np.exp(-k * (t - t0)))

def fit_vbgf(ages, lengths):
    """VBGF 파라미터 추정"""
    ages, lengths = clean_paired_arrays(ages, lengths)
    if len(ages) < 3:
        raise ValueError("최소 3개 이상의 유효한 데이터 필요")

    # 초기값 추정
    l_inf_init = max(lengths) * 1.1
    k_init = 0.3
    t0_init = -0.5

    try:
        popt, pcov = curve_fit(
            vbgf, ages, lengths,
            p0=[l_inf_init, k_init, t0_init],
            bounds=([0, 0.001, -5], [np.inf, 2.0, 1]),  # t0 상한 1 (무척추/비표준 연령 기준 허용)
            maxfev=max(5000, len(ages) * 100),
        )
    except RuntimeError:
        raise ValueError("수렴 실패 — 데이터를 확인하세요 (이상치, 단위 불일치 등)")

    l_inf, k, t0 = popt
    se = np.sqrt(np.diag(pcov))  # 표준오차

    # R² 계산
    predicted = vbgf(ages, *popt)
    ss_res = np.sum((lengths - predicted) ** 2)
    ss_tot = np.sum((lengths - np.mean(lengths)) ** 2)
    r_squared = 1.0 if ss_tot == 0 else 1 - ss_res / ss_tot

    # 95% CI (소표본: t-분포 사용)
    from scipy.stats import t as t_dist
    df = len(ages) - 3  # 3 파라미터
    t_crit = t_dist.ppf(0.975, df) if df > 0 else 1.96
    ci_95 = t_crit * se

    return {
        "lInf": float(l_inf),
        "k": float(k),
        "t0": float(t0),
        "standardErrors": se.tolist(),
        "ci95": ci_95.tolist(),
        "rSquared": float(r_squared),
        "predicted": predicted.tolist(),
        "residuals": (lengths - predicted).tolist(),
    }
```

### 출력

| 파라미터 | 추정값 | SE | 95% CI |
|---------|--------|-----|--------|
| L-infinity (cm) | 35.2 | 1.8 | [31.7, 38.7] |
| K (yr^-1) | 0.28 | 0.04 | [0.20, 0.36] |
| t0 (yr) | -0.52 | 0.12 | [-0.76, -0.28] |
| R² | 0.987 | — | — |

### 시각화

- 성장 곡선 (관측값 산점 + 적합 곡선 + 95% CI 밴드)
- 잔차 플롯

---

## 2. 체장-체중 관계식 (Length-Weight)

### 개요

W = aL^b — 어류의 체장과 체중 간 멱법칙 관계. b=3이면 등성장(isometric), b!=3이면 이성장(allometric).

### 입력

```csv
length, weight
10.2, 12.5
12.8, 25.1
15.0, 42.3
18.5, 78.6
22.0, 130.2
```

### 계산

```python
import numpy as np
from scipy import stats
from helpers import clean_paired_arrays

def length_weight(lengths, weights):
    """체장-체중 관계식 추정 (log 변환 선형 회귀)"""
    lengths, weights = clean_paired_arrays(lengths, weights)

    if np.any(lengths <= 0) or np.any(weights <= 0):
        raise ValueError("체장과 체중은 양수여야 합니다")
    if len(lengths) < 3:
        raise ValueError("최소 3개 이상의 유효한 데이터 필요")

    log_l = np.log10(lengths)
    log_w = np.log10(weights)

    # 선형 회귀: log(W) = log(a) + b * log(L)
    slope, intercept, r_value, p_value, std_err = stats.linregress(log_l, log_w)

    b = slope
    log_a = intercept
    a = 10 ** log_a

    # b vs 3 검정 (isometric growth test)
    t_stat = (b - 3) / std_err
    df = len(lengths) - 2
    p_isometric = 2 * (1 - stats.t.cdf(abs(t_stat), df))

    if p_isometric > 0.05:
        growth_type = "isometric"       # 등성장 (b ≈ 3)
    elif b > 3:
        growth_type = "positive_allometric"  # 양의 이성장 (b > 3)
    else:
        growth_type = "negative_allometric"  # 음의 이성장 (b < 3)

    predicted_w = a * lengths ** b

    return {
        "a": float(a),
        "b": float(b),
        "logA": float(log_a),
        "rSquared": float(r_value ** 2),
        "bStdError": float(std_err),
        "isometricPValue": float(p_isometric),
        "growthType": growth_type,
        "predicted": predicted_w.tolist(),
    }
```

> **주의**: log 변환 OLS는 원래 스케일로 역변환 시 편향(bias)이 발생할 수 있음.
> 예측값은 log 스케일에서 불편추정치이며, 원래 스케일 예측은 참고용.

### 출력

| 항목 | 값 |
|------|-----|
| a | 0.0105 |
| b | 3.12 |
| R² | 0.995 |
| 등성장 검정 (b=3) p-value | 0.032 |
| 성장 유형 | 양의 이성장 (positive allometric) |

### 시각화

- 체장-체중 산점도 + 적합 곡선
- log-log 변환 산점도 + 회귀선 (선형 확인용)

---

## 3. Condition Factor (비만도, Fulton's K)

### 개요

K = 100 * W / L^3 — 어류의 영양 상태/건강도 평가. 개체별 계산.

### 입력

L-W와 동일한 CSV (체장, 체중).

### 계산

```python
import numpy as np
from scipy import stats
from helpers import clean_paired_arrays

def condition_factor(lengths, weights, groups=None):
    """
    Fulton's K = 100 * W / L^3
    lengths: cm, weights: g
    groups: 선택적 그룹 레이블 (season, site 등)
    """
    lengths, weights = clean_paired_arrays(lengths, weights)

    if np.any(lengths <= 0) or np.any(weights <= 0):
        raise ValueError("체장과 체중은 양수여야 합니다")

    K = 100 * weights / (lengths ** 3)

    result = {
        "individualK": K.tolist(),
        "mean": float(np.mean(K)),
        "std": float(np.std(K, ddof=1)),
        "median": float(np.median(K)),
        "min": float(np.min(K)),
        "max": float(np.max(K)),
        "n": len(K),
    }

    # 그룹별 비교 (있으면)
    if groups is not None:
        unique_groups = np.unique(groups)
        group_stats = {}
        for g in unique_groups:
            mask = groups == g
            kg = K[mask]
            group_stats[str(g)] = {
                "mean": float(np.mean(kg)),
                "std": float(np.std(kg, ddof=1)),
                "n": len(kg),
            }
        result["groupStats"] = group_stats

        # 2그룹: t-test, 3+그룹: ANOVA
        if len(unique_groups) == 2:
            g1 = K[groups == unique_groups[0]]
            g2 = K[groups == unique_groups[1]]
            t_stat, p_value = stats.ttest_ind(g1, g2)
            result["comparison"] = {"test": "t-test", "statistic": float(t_stat), "pValue": float(p_value)}
        elif len(unique_groups) > 2:
            group_data = [K[groups == g] for g in unique_groups]
            f_stat, p_value = stats.f_oneway(*group_data)
            result["comparison"] = {"test": "ANOVA", "statistic": float(f_stat), "pValue": float(p_value)}

    return result
```

### 출력

| 항목 | 값 |
|------|-----|
| 평균 K | 1.23 |
| SD | 0.15 |
| 중앙값 | 1.21 |
| 범위 | 0.89 ~ 1.58 |
| N | 150 |

그룹 비교 (선택):
| 그룹 | 평균 K | SD | N |
|------|--------|-----|---|
| 봄 | 1.15 | 0.12 | 50 |
| 여름 | 1.32 | 0.14 | 50 |
| 가을 | 1.22 | 0.16 | 50 |
| ANOVA p-value | 0.003 | | |

### 시각화

- 개체별 K 분포 (히스토그램 / 박스플롯)
- 그룹별 비교 박스플롯
- L-W 관계식 결과 하단에서 "비만도 계산하기" 링크

### Fulton's K 한계

결과 하단에 주의사항 표시:
- K는 등성장(isometric)을 가정 — b != 3이면 체장에 따라 K가 달라짐
- 종간 비교에는 부적절 (종내 비교용)
- 대안: relative condition factor (Kn = W / W_expected)

---

## Pyodide 의존성 요약

| 패키지 | 용도 | Pyodide 지원 |
|--------|------|-------------|
| numpy | 수식 계산 | O (기본) |
| scipy.optimize | curve_fit (VBGF, L-W) | O (기본) |
| scipy.stats | t-test, ANOVA, linregress | O (기본) |

---

## 도구 간 연결

```
Length-Weight ←→ Condition Factor  (같은 CSV 공유)
     ↓
VBGF (연령 데이터 추가 시)
```

- L-W 결과 → "비만도 계산" 버튼 (같은 데이터로 바로 이동)
- L-W의 b값 → Condition Factor 주의사항에 활용 (b != 3이면 K 해석 주의)

---

## 기존 코드 재사용

### Pyodide Worker
- **참조**: `public/workers/python/worker4-regression-advanced.py` (curve_fit 패턴)
- **데이터 정제**: `helpers.py`의 `clean_paired_arrays()` 사용
- **타입 정의**: 각 page.tsx에 로컬 인터페이스 정의 (Bio-Tools 공통 패턴)
- **Worker 번호**: Worker 7 (`PyodideWorker.Fisheries = 7`)
- **추가 패키지**: 없음 (scipy, numpy 이미 로드됨)

### UI 컴포넌트
- **성장곡선/산점도**: `components/charts/scatterplot.tsx` (+ 95% CI 밴드 확장)
- **그룹비교**: `components/charts/boxplot.tsx` (100% 재사용)
- **결과표**: `components/statistics/common/StatisticsTable.tsx` (100% 재사용)

### 페이지 구조
- **전제**: [PLAN-BIO-TOOLS-ARCHITECTURE.md](PLAN-BIO-TOOLS-ARCHITECTURE.md) S1 단계 (공통 Shell) 완료 필수
- **라우팅**: `app/bio-tools/vbgf/`, `app/bio-tools/length-weight/`, `app/bio-tools/condition-factor/`
- **공통 Shell**: `BioToolShell` 래퍼 + 인라인 결과 렌더링 (alpha-diversity 패턴)

---

## 구현 순서

| 단계 | 내용 | 예상 |
|------|------|------|
| F1 | VBGF — Python + 성장곡선 차트 | 1.5일 |
| F2 | L-W — Python + log-log 플롯 | 1일 |
| F3 | Condition Factor — Python + 박스플롯 | 0.5일 |
| **합계** | | **~3일** |
