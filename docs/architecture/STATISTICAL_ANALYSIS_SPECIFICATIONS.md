# 📊 Statistical Analysis Specifications

## 개요

이 문서는 통계 분석 플랫폼에서 구현할 **모든 통계적 기능의 상세 명세**를 정의합니다. 각 분석 방법은 **입력 요구사항, 가정 조건, 출력 형식, 해석 가이드라인**을 포함합니다.

### ⚠️ 핵심 구현 원칙
**모든 통계 계산은 반드시 Pyodide를 통해 Python의 SciPy/NumPy/Pandas를 사용합니다.**
- JavaScript/TypeScript로 통계 함수를 직접 구현하지 않습니다
- 검증된 Python 통계 라이브러리만 사용합니다
- 정확도와 신뢰성이 최우선입니다

## 1. 기술통계 (Descriptive Statistics)

### 1.1 중심경향성 측도

#### 구현 함수
```python
def descriptive_statistics(data: np.ndarray) -> Dict[str, Any]:
    """
    기술통계량 계산
    
    Parameters:
    -----------
    data : np.ndarray
        분석 대상 데이터 (1차원 배열)
    
    Returns:
    --------
    dict : 기술통계량 딕셔너리
    """
```

#### 출력 명세
```json
{
  "central_tendency": {
    "mean": 2.456,
    "median": 2.400,
    "mode": [2.1, 2.3],  // 최빈값 (다중값 가능)
    "geometric_mean": 2.234,  // 기하평균
    "harmonic_mean": 2.123    // 조화평균
  },
  "variability": {
    "variance": 1.234,
    "std_dev": 1.111,
    "std_error": 0.156,
    "range": 4.2,
    "iqr": 1.5,           // 사분위수 범위
    "mad": 0.89,          // 중앙절대편차
    "cv": 0.452           // 변이계수
  },
  "distribution_shape": {
    "skewness": -0.234,
    "kurtosis": 0.567,
    "skewness_interpretation": "approximately symmetric",
    "kurtosis_interpretation": "platykurtic"
  },
  "quartiles": {
    "q1": 1.8,
    "q2": 2.4,  // median
    "q3": 3.3
  },
  "percentiles": {
    "p5": 1.2,
    "p10": 1.5,
    "p90": 4.1,
    "p95": 4.3
  },
  "confidence_intervals": {
    "mean_95": [2.145, 2.767],
    "mean_99": [2.089, 2.823]
  },
  "sample_info": {
    "n": 120,
    "missing_values": 3,
    "outliers": [4.8, 5.2]  // IQR 기준 이상값
  }
}
```

### 1.2 분포 형태 분석

#### 정규성 해석 기준
```python
def interpret_normality(skewness: float, kurtosis: float) -> Dict[str, str]:
    """
    왜도와 첨도 해석
    
    왜도 해석:
    - |skewness| < 0.5: approximately symmetric
    - 0.5 ≤ |skewness| < 1.0: moderately skewed
    - |skewness| ≥ 1.0: highly skewed
    
    첨도 해석:
    - kurtosis < -1: platykurtic (평평한 분포)
    - -1 ≤ kurtosis ≤ 1: mesokurtic (정규분포 수준)
    - kurtosis > 1: leptokurtic (뾰족한 분포)
    """
```

## 2. 가정 검정 (Assumption Testing)

### 2.1 정규성 검정

#### Shapiro-Wilk Test (n ≤ 50)
```python
def shapiro_wilk_test(data: np.ndarray) -> Dict[str, Any]:
    """
    Shapiro-Wilk 정규성 검정
    
    적용 조건:
    - 표본 크기: 3 ≤ n ≤ 50
    - 연속형 데이터
    
    가설:
    - H₀: 데이터가 정규분포를 따른다
    - H₁: 데이터가 정규분포를 따르지 않는다
    """
```

#### Kolmogorov-Smirnov Test (n > 50)
```python
def kolmogorov_smirnov_test(data: np.ndarray) -> Dict[str, Any]:
    """
    Kolmogorov-Smirnov 정규성 검정
    
    적용 조건:
    - 표본 크기: n > 50
    - 연속형 데이터
    
    가설:
    - H₀: 데이터가 정규분포를 따른다
    - H₁: 데이터가 정규분포를 따르지 않는다
    """
```

#### 출력 명세
```json
{
  "test_name": "Shapiro-Wilk",
  "statistic": 0.987,
  "p_value": 0.234,
  "alpha": 0.05,
  "result": {
    "is_normal": true,
    "interpretation": "Fail to reject H₀. Data appears to be normally distributed.",
    "recommendation": "Proceed with parametric tests."
  },
  "alternative_tests": {
    "anderson_darling": {
      "statistic": 0.456,
      "critical_values": [0.576, 0.656, 0.787, 0.918, 1.092],
      "significance_levels": [0.15, 0.10, 0.05, 0.025, 0.01]
    },
    "dagostino_pearson": {
      "statistic": 2.34,
      "p_value": 0.310
    }
  },
  "visual_checks": {
    "qq_plot_correlation": 0.992,  // Q-Q plot 상관계수
    "histogram_assessment": "bell-shaped",
    "recommendations": [
      "Q-Q plot shows good linear relationship",
      "Histogram appears approximately bell-shaped"
    ]
  }
}
```

### 2.2 등분산성 검정

#### Levene's Test
```python
def levene_test(*groups) -> Dict[str, Any]:
    """
    Levene의 등분산성 검정
    
    특징:
    - 정규분포 가정이 불필요
    - 중앙값 기준 계산으로 로버스트
    
    가설:
    - H₀: 모든 그룹의 분산이 같다
    - H₁: 적어도 한 그룹의 분산이 다르다
    """
```

#### Bartlett's Test
```python
def bartlett_test(*groups) -> Dict[str, Any]:
    """
    Bartlett의 등분산성 검정
    
    특징:
    - 정규분포 가정 필요
    - 정규분포일 때 더 검정력이 높음
    
    가설:
    - H₀: 모든 그룹의 분산이 같다
    - H₁: 적어도 한 그룹의 분산이 다르다
    """
```

#### 출력 명세
```json
{
  "levene_test": {
    "statistic": 1.234,
    "p_value": 0.345,
    "df_between": 2,
    "df_within": 117,
    "result": {
      "is_homogeneous": true,
      "interpretation": "Variances appear to be equal across groups."
    }
  },
  "bartlett_test": {
    "statistic": 2.456,
    "p_value": 0.293,
    "df": 2,
    "result": {
      "is_homogeneous": true,
      "interpretation": "Variances are equal (assuming normality)."
    }
  },
  "group_variances": [
    {"group": "Group 1", "n": 40, "variance": 1.23, "std_dev": 1.11},
    {"group": "Group 2", "n": 40, "variance": 1.45, "std_dev": 1.20},
    {"group": "Group 3", "n": 40, "variance": 1.18, "std_dev": 1.09}
  ],
  "variance_ratios": {
    "max_to_min": 1.23,  // 최대분산/최소분산
    "interpretation": "Variance ratios are within acceptable range (<4:1)"
  },
  "recommendation": {
    "test_to_use": "parametric",
    "reason": "Both normality and homogeneity assumptions are met",
    "suggested_analysis": "One-way ANOVA"
  }
}
```

### 2.3 독립성 검정

#### Durbin-Watson Test
```python
def durbin_watson_test(residuals: np.ndarray) -> Dict[str, Any]:
    """
    Durbin-Watson 독립성 검정 (자기상관 검정)
    
    적용:
    - 회귀분석 잔차의 자기상관 검정
    - 시계열 데이터의 독립성 검정
    
    해석:
    - DW ≈ 2: 자기상관 없음
    - DW < 2: 양의 자기상관
    - DW > 2: 음의 자기상관
    """
```

## 3. 추론통계 (Inferential Statistics)

### 3.1 t-검정 (t-tests)

#### 단일표본 t-검정
```python
def one_sample_ttest(data: np.ndarray, mu0: float, alpha: float = 0.05) -> Dict[str, Any]:
    """
    단일표본 t-검정
    
    가설:
    - H₀: μ = μ₀
    - H₁: μ ≠ μ₀ (양측검정)
    
    가정:
    - 데이터가 정규분포를 따름 (또는 n ≥ 30)
    - 관측값들이 독립적
    """
```

#### 독립표본 t-검정
```python
def independent_ttest(group1: np.ndarray, group2: np.ndarray, 
                     equal_var: bool = True, alpha: float = 0.05) -> Dict[str, Any]:
    """
    독립표본 t-검정
    
    가설:
    - H₀: μ₁ = μ₂
    - H₁: μ₁ ≠ μ₂
    
    가정:
    - 두 그룹 모두 정규분포를 따름
    - 관측값들이 독립적
    - equal_var=True: 등분산성 가정
    - equal_var=False: Welch의 t-검정 (이분산성 허용)
    """
```

#### 대응표본 t-검정
```python
def paired_ttest(before: np.ndarray, after: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    """
    대응표본 t-검정
    
    가설:
    - H₀: μd = 0 (차이의 평균이 0)
    - H₁: μd ≠ 0
    
    가정:
    - 차이값(d)이 정규분포를 따름
    - 쌍들이 독립적
    """
```

#### t-검정 출력 명세
```json
{
  "test_info": {
    "test_type": "Independent t-test",
    "hypothesis": {
      "null": "μ₁ = μ₂",
      "alternative": "μ₁ ≠ μ₂",
      "test_type": "two-tailed"
    },
    "assumptions": {
      "normality": true,
      "independence": true,
      "equal_variances": true
    }
  },
  "descriptives": {
    "group1": {
      "name": "Control",
      "n": 45,
      "mean": 2.34,
      "std_dev": 0.87,
      "std_error": 0.13,
      "ci_95": [2.08, 2.60]
    },
    "group2": {
      "name": "Treatment",
      "n": 43,
      "mean": 2.89,
      "std_dev": 0.94,
      "std_error": 0.14,
      "ci_95": [2.60, 3.18]
    }
  },
  "test_statistics": {
    "t_statistic": -2.876,
    "degrees_of_freedom": 86,
    "p_value": 0.005,
    "p_value_one_tailed": 0.0025,
    "alpha": 0.05,
    "critical_value": 1.988
  },
  "effect_size": {
    "cohens_d": 0.613,
    "interpretation": "medium effect",
    "pooled_std": 0.904,
    "confidence_interval": [0.185, 1.040]
  },
  "results": {
    "significant": true,
    "interpretation": "Reject H₀. There is significant difference between groups.",
    "conclusion": "Treatment group shows significantly higher scores than control group.",
    "mean_difference": 0.55,
    "mean_difference_ci": [0.17, 0.93]
  },
  "assumptions_check": {
    "normality": {
      "group1_shapiro_p": 0.234,
      "group2_shapiro_p": 0.456,
      "assumption_met": true
    },
    "equal_variances": {
      "levene_p": 0.567,
      "assumption_met": true
    }
  },
  "power_analysis": {
    "observed_power": 0.832,
    "required_n_per_group": 34,
    "interpretation": "Study has adequate power (>0.80)"
  }
}
```

### 3.2 분산분석 (ANOVA)

#### 일원분산분석 (One-way ANOVA)
```python
def one_way_anova(*groups) -> Dict[str, Any]:
    """
    일원분산분석
    
    가설:
    - H₀: μ₁ = μ₂ = ... = μₖ (모든 그룹 평균이 같음)
    - H₁: 적어도 한 그룹의 평균이 다름
    
    가정:
    - 각 그룹이 정규분포를 따름
    - 등분산성 (homogeneity of variances)
    - 관측값들의 독립성
    """
```

#### 이원분산분석 (Two-way ANOVA)
```python
def two_way_anova(data: pd.DataFrame, dependent_var: str, 
                  factor1: str, factor2: str, interaction: bool = True) -> Dict[str, Any]:
    """
    이원분산분석
    
    가설:
    - 주효과 A: H₀: 모든 A 수준의 평균이 같음
    - 주효과 B: H₀: 모든 B 수준의 평균이 같음  
    - 상호작용: H₀: A와 B 간 상호작용이 없음
    
    가정:
    - 정규성, 등분산성, 독립성
    - 셀별 충분한 표본 크기
    """
```

#### ANOVA 출력 명세
```json
{
  "test_info": {
    "test_type": "One-way ANOVA",
    "hypothesis": {
      "null": "μ₁ = μ₂ = μ₃",
      "alternative": "At least one group mean differs"
    },
    "groups": ["Control", "Treatment A", "Treatment B"],
    "total_n": 120
  },
  "descriptives": [
    {
      "group": "Control",
      "n": 40,
      "mean": 2.34,
      "std_dev": 0.87,
      "std_error": 0.138,
      "ci_95": [2.06, 2.62]
    },
    {
      "group": "Treatment A", 
      "n": 40,
      "mean": 2.89,
      "std_dev": 0.94,
      "std_error": 0.149,
      "ci_95": [2.59, 3.19]
    },
    {
      "group": "Treatment B",
      "n": 40,
      "mean": 3.45,
      "std_dev": 1.02,
      "std_error": 0.161,
      "ci_95": [3.12, 3.78]
    }
  ],
  "anova_table": {
    "between_groups": {
      "sum_of_squares": 25.67,
      "degrees_of_freedom": 2,
      "mean_square": 12.835,
      "f_statistic": 14.58,
      "p_value": 0.000012
    },
    "within_groups": {
      "sum_of_squares": 103.24,
      "degrees_of_freedom": 117,
      "mean_square": 0.882
    },
    "total": {
      "sum_of_squares": 128.91,
      "degrees_of_freedom": 119
    }
  },
  "effect_size": {
    "eta_squared": 0.199,
    "interpretation": "large effect",
    "omega_squared": 0.185,
    "partial_eta_squared": 0.199
  },
  "results": {
    "significant": true,
    "interpretation": "Reject H₀. There are significant differences between groups.",
    "f_critical": 3.07,
    "power": 0.998
  },
  "assumptions_check": {
    "normality": {
      "shapiro_results": [0.234, 0.456, 0.123],
      "assumption_met": true
    },
    "homogeneity": {
      "levene_p": 0.234,
      "bartlett_p": 0.345,
      "assumption_met": true
    }
  },
  "post_hoc": {
    "required": true,
    "recommended_test": "Tukey HSD",
    "reason": "Equal variances assumed, equal sample sizes"
  }
}
```

### 3.3 사후분석 (Post-hoc Analysis)

#### Tukey HSD (정직한 유의차 검정)
```python
def tukey_hsd(*groups, group_names: List[str] = None, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Tukey HSD 사후분석
    
    적용 조건:
    - ANOVA에서 유의한 결과
    - 등분산성 가정 만족
    - 모든 쌍별 비교
    
    특징:
    - Type I Error를 α 수준으로 제어
    - 보수적 접근 (낮은 검정력)
    """
```

#### Games-Howell Test
```python
def games_howell_test(*groups, group_names: List[str] = None, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Games-Howell 사후분석
    
    적용 조건:
    - ANOVA에서 유의한 결과
    - 등분산성 가정 위반
    - 표본 크기가 다를 때 적합
    
    특징:
    - Welch의 t-검정 기반
    - 이분산성에 로버스트
    """
```

#### Dunn's Test (비모수)
```python
def dunn_test(*groups, group_names: List[str] = None, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Dunn's test 사후분석
    
    적용 조건:
    - Kruskal-Wallis 검정에서 유의한 결과
    - 비모수 사후분석
    
    특징:
    - 순위 기반 검정
    - 정규분포 가정 불필요
    """
```

#### 사후분석 출력 명세
```json
{
  "test_info": {
    "method": "Tukey HSD",
    "family_wise_error_rate": 0.05,
    "total_comparisons": 3,
    "adjustment": "Studentized Range Distribution"
  },
  "pairwise_comparisons": [
    {
      "comparison": "Control vs Treatment A",
      "group1_mean": 2.34,
      "group2_mean": 2.89,
      "mean_difference": -0.55,
      "std_error": 0.148,
      "q_statistic": 3.716,
      "p_value": 0.0234,
      "p_value_adjusted": 0.0234,
      "ci_95": [-0.932, -0.168],
      "significant": true,
      "interpretation": "Treatment A significantly higher than Control"
    },
    {
      "comparison": "Control vs Treatment B", 
      "group1_mean": 2.34,
      "group2_mean": 3.45,
      "mean_difference": -1.11,
      "std_error": 0.148,
      "q_statistic": 7.499,
      "p_value": 0.0001,
      "p_value_adjusted": 0.0001,
      "ci_95": [-1.492, -0.728],
      "significant": true,
      "interpretation": "Treatment B significantly higher than Control"
    },
    {
      "comparison": "Treatment A vs Treatment B",
      "group1_mean": 2.89,
      "group2_mean": 3.45,
      "mean_difference": -0.56,
      "std_error": 0.148,
      "q_statistic": 3.783,
      "p_value": 0.0214,
      "p_value_adjusted": 0.0214,
      "ci_95": [-0.942, -0.178],
      "significant": true,
      "interpretation": "Treatment B significantly higher than Treatment A"
    }
  ],
  "summary": {
    "significant_pairs": 3,
    "non_significant_pairs": 0,
    "homogeneous_subsets": [
      {"subset": 1, "groups": ["Control"], "mean": 2.34},
      {"subset": 2, "groups": ["Treatment A"], "mean": 2.89},
      {"subset": 3, "groups": ["Treatment B"], "mean": 3.45}
    ]
  },
  "multiple_comparisons_summary": {
    "method_used": "Tukey HSD",
    "alpha": 0.05,
    "critical_value": 3.37,
    "conclusions": [
      "All groups differ significantly from each other",
      "Treatment B > Treatment A > Control"
    ]
  }
}
```

### 3.4 비모수 검정 (Non-parametric Tests)

#### Mann-Whitney U Test
```python
def mann_whitney_u_test(group1: np.ndarray, group2: np.ndarray, 
                       alternative: str = 'two-sided') -> Dict[str, Any]:
    """
    Mann-Whitney U 검정 (Wilcoxon rank-sum test)
    
    용도:
    - 두 독립 그룹의 중앙값 비교
    - t-검정의 비모수 대안
    
    가정:
    - 연속형 또는 서열형 데이터
    - 두 그룹의 독립성
    - 두 그룹의 분포 형태가 유사
    """
```

#### Kruskal-Wallis Test
```python
def kruskal_wallis_test(*groups) -> Dict[str, Any]:
    """
    Kruskal-Wallis H 검정
    
    용도:
    - 3개 이상 독립 그룹의 중앙값 비교
    - 일원분산분석의 비모수 대안
    
    가정:
    - 연속형 또는 서열형 데이터
    - 그룹 간 독립성
    - 각 그룹의 분포 형태가 유사
    """
```

#### Wilcoxon Signed-Rank Test
```python
def wilcoxon_signed_rank_test(before: np.ndarray, after: np.ndarray) -> Dict[str, Any]:
    """
    Wilcoxon 부호순위 검정
    
    용도:
    - 대응표본의 중앙값 차이 검정
    - 대응표본 t-검정의 비모수 대안
    
    가정:
    - 차이값들이 연속형
    - 차이값들이 0을 중심으로 대칭분포
    """
```

#### 비모수 검정 출력 명세
```json
{
  "test_info": {
    "test_type": "Mann-Whitney U Test",
    "hypothesis": {
      "null": "두 그룹의 분포가 같다",
      "alternative": "두 그룹의 분포가 다르다"
    },
    "alternative_hypothesis": "two-sided"
  },
  "descriptives": {
    "group1": {
      "n": 45,
      "median": 2.1,
      "iqr": [1.8, 2.6],
      "mean_rank": 38.2
    },
    "group2": {
      "n": 43,
      "median": 2.7,
      "iqr": [2.3, 3.1],
      "mean_rank": 51.1
    }
  },
  "test_statistics": {
    "u_statistic": 642,
    "u_critical": 736,
    "z_statistic": -2.456,
    "p_value": 0.014,
    "ties_correction": true,
    "continuity_correction": true
  },
  "effect_size": {
    "rank_biserial_correlation": 0.343,
    "interpretation": "medium effect",
    "probability_superiority": 0.671,
    "common_language_effect": "Treatment group scores higher 67.1% of the time"
  },
  "results": {
    "significant": true,
    "interpretation": "Reject H₀. 두 그룹의 분포가 유의하게 다르다.",
    "conclusion": "Treatment group shows significantly higher values than control group.",
    "median_difference": 0.6
  },
  "diagnostic_info": {
    "total_observations": 88,
    "total_ties": 12,
    "large_sample_approximation": true,
    "exact_test_available": false
  }
}
```

### 3.5 회귀분석 (Regression Analysis)

#### 단순선형회귀
```python
def simple_linear_regression(x: np.ndarray, y: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    """
    단순선형회귀분석
    
    모델: y = β₀ + β₁x + ε
    
    가정:
    - 선형관계 (Linearity)
    - 독립성 (Independence)
    - 정규분포 (Normality) of residuals
    - 등분산성 (Homoscedasticity)
    """
```

#### 다중선형회귀
```python
def multiple_linear_regression(X: np.ndarray, y: np.ndarray, 
                              feature_names: List[str] = None,
                              alpha: float = 0.05) -> Dict[str, Any]:
    """
    다중선형회귀분석
    
    모델: y = β₀ + β₁x₁ + β₂x₂ + ... + βₚxₚ + ε
    
    추가 고려사항:
    - 다중공선성 (Multicollinearity)
    - 변수 선택 (Variable Selection)
    """
```

#### 회귀분석 출력 명세
```json
{
  "model_info": {
    "model_type": "Simple Linear Regression",
    "equation": "y = β₀ + β₁x + ε",
    "sample_size": 100,
    "degrees_of_freedom": {
      "regression": 1,
      "residual": 98,
      "total": 99
    }
  },
  "model_fit": {
    "r_squared": 0.847,
    "adjusted_r_squared": 0.845,
    "standard_error": 0.234,
    "f_statistic": 542.3,
    "f_p_value": 0.000001,
    "aic": -123.45,
    "bic": -118.23
  },
  "coefficients": [
    {
      "variable": "Intercept",
      "coefficient": 0.456,
      "std_error": 0.123,
      "t_statistic": 3.707,
      "p_value": 0.0004,
      "ci_95": [0.212, 0.700],
      "significant": true
    },
    {
      "variable": "x", 
      "coefficient": 1.234,
      "std_error": 0.053,
      "t_statistic": 23.28,
      "p_value": 0.000001,
      "ci_95": [1.129, 1.339],
      "significant": true,
      "standardized_coefficient": 0.921
    }
  ],
  "residual_analysis": {
    "normality": {
      "shapiro_p": 0.234,
      "assumption_met": true
    },
    "homoscedasticity": {
      "breusch_pagan_p": 0.456,
      "assumption_met": true
    },
    "autocorrelation": {
      "durbin_watson": 1.987,
      "interpretation": "No autocorrelation"
    },
    "outliers": {
      "studentized_residuals": [-2.1, 2.3],
      "cooks_distance": [0.034, 0.067],
      "leverage": [0.023, 0.045]
    }
  },
  "predictions": {
    "fitted_values_range": [1.23, 4.56],
    "residuals_range": [-0.67, 0.89],
    "prediction_intervals": true,
    "confidence_intervals": true
  }
}
```

### 3.6 상관분석 (Correlation Analysis)

#### Pearson 상관계수
```python
def pearson_correlation(x: np.ndarray, y: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Pearson 곱-모멘트 상관계수
    
    가정:
    - 두 변수 모두 연속형
    - 두 변수 모두 정규분포
    - 선형관계
    - 이상값의 영향을 받기 쉬움
    """
```

#### Spearman 순위상관계수
```python
def spearman_correlation(x: np.ndarray, y: np.ndarray, alpha: float = 0.05) -> Dict[str, Any]:
    """
    Spearman 순위상관계수
    
    특징:
    - 비모수 상관계수
    - 단조관계 측정
    - 이상값에 로버스트
    - 서열형 데이터 적용 가능
    """
```

#### 상관분석 출력 명세
```json
{
  "correlation_matrix": {
    "pearson": [
      [1.000, 0.847, -0.234],
      [0.847, 1.000, -0.156],
      [-0.234, -0.156, 1.000]
    ],
    "spearman": [
      [1.000, 0.823, -0.267],
      [0.823, 1.000, -0.178],
      [-0.267, -0.178, 1.000]
    ]
  },
  "significance_tests": [
    {
      "variables": "X1 vs X2",
      "pearson_r": 0.847,
      "pearson_p": 0.000001,
      "spearman_rho": 0.823,
      "spearman_p": 0.000002,
      "sample_size": 100,
      "degrees_of_freedom": 98,
      "confidence_interval": [0.789, 0.892]
    }
  ],
  "interpretations": [
    {
      "correlation": 0.847,
      "strength": "strong positive",
      "interpretation": "As X1 increases, X2 tends to increase substantially",
      "effect_size": "large effect",
      "shared_variance": 71.7  // r² × 100%
    }
  ]
}
```

## 4. 고급 분석 (Advanced Analysis)

### 4.1 검정력 분석 (Power Analysis)

```python
def power_analysis(effect_size: float, alpha: float = 0.05, 
                  power: float = 0.80, test_type: str = 'ttest') -> Dict[str, Any]:
    """
    검정력 분석
    
    계산 가능한 값:
    - 표본 크기 (given effect size, alpha, power)
    - 검정력 (given effect size, alpha, sample size)
    - 효과크기 (given alpha, power, sample size)
    """
```

### 4.2 메타분석 기초 (Meta-analysis Basics)

```python
def effect_size_calculation(studies: List[Dict]) -> Dict[str, Any]:
    """
    효과크기 통합 분석
    
    지원하는 효과크기:
    - Cohen's d
    - Hedges' g
    - Correlation coefficients
    - Odds ratios
    """
```

## 5. 수산과학 특화 분석

### 5.1 CPUE 분석 (Catch Per Unit Effort)

```python
def cpue_analysis(catch_data: pd.DataFrame, effort_data: pd.DataFrame) -> Dict[str, Any]:
    """
    어획량 단위노력 분석
    
    계산 지표:
    - 기본 CPUE (어획량/노력량)
    - 표준화 CPUE
    - 시계열 추세 분석
    - 공간적 분포 분석
    """
```

### 5.2 성장 모델 분석

```python
def von_bertalanffy_growth(age: np.ndarray, length: np.ndarray) -> Dict[str, Any]:
    """
    von Bertalanffy 성장 모델
    
    모델: L(t) = L∞(1 - e^(-K(t-t₀)))
    
    매개변수:
    - L∞: 극한전장
    - K: 성장계수  
    - t₀: 이론적 연령 0일 때의 연령
    """
```

### 5.3 자원평가 기초 분석

```python
def stock_assessment_basics(biomass: np.ndarray, fishing_mortality: np.ndarray) -> Dict[str, Any]:
    """
    기초 자원평가 분석
    
    지표 계산:
    - 생체량 추세
    - 어획사망률 분석
    - 지속가능성 지표
    - 관리기준점 계산
    """
```

---

## 구현 우선순위

### Phase 1: 필수 기능 (Week 1-8)
1. 기술통계 (완전 구현)
2. 가정 검정 (정규성, 등분산성)
3. t-검정 (3종류)
4. 일원분산분석 + Tukey HSD
5. 비모수 검정 (Mann-Whitney, Kruskal-Wallis)

### Phase 2: 고급 기능 (Week 9-11)
1. 이원분산분석
2. 다중 사후분석 방법
3. 단순/다중 회귀분석
4. 상관분석

### Phase 3: 전문가 기능 (Week 12-13)
1. 검정력 분석
2. 수산과학 특화 분석
3. 고급 진단 도구

모든 분석은 **완전한 가정 검정, 효과크기 계산, 신뢰구간, 해석 가이드**를 포함하여 **SPSS/R 수준의 전문성**을 제공합니다.