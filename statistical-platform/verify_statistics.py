"""
통계 함수 검증을 위한 Python 스크립트
Pyodide와 동일한 scipy를 사용하므로 결과가 100% 일치해야 함
"""

from scipy import stats
import numpy as np
import json

# 검증 데이터
data1 = [23, 25, 28, 30, 32]
data2 = [20, 22, 24, 26, 28]

print("=" * 60)
print("Statistical Methods Verification with scipy")
print("=" * 60)

# 1. T-test
print("\n1. T-test (독립표본)")
t_stat, pValue = stats.ttest_ind(data1, data2)
print(f"   데이터1: {data1}")
print(f"   데이터2: {data2}")
print(f"   결과: t = {t_stat:.4f}, p = {pValue:.4f}")

# 2. Paired T-test
print("\n2. T-test (대응표본)")
before = [120, 125, 130, 135, 140]
after = [118, 124, 131, 133, 139]
t_stat_paired, pValue_paired = stats.ttest_rel(before, after)
print(f"   전: {before}")
print(f"   후: {after}")
print(f"   결과: t = {t_stat_paired:.4f}, p = {pValue_paired:.4f}")

# 3. ANOVA
print("\n3. One-way ANOVA")
group1 = [23, 25, 27, 29, 31]
group2 = [28, 30, 32, 34, 36]
group3 = [33, 35, 37, 39, 41]
f_stat, pValue_anova = stats.f_oneway(group1, group2, group3)
print(f"   그룹1: {group1}")
print(f"   그룹2: {group2}")
print(f"   그룹3: {group3}")
print(f"   결과: F = {f_stat:.4f}, p = {pValue_anova:.6f}")

# 4. Correlation
print("\n4. Pearson Correlation")
x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
y = [2.1, 3.9, 6.1, 8.2, 9.8, 12.1, 14.2, 15.9, 18.1, 20.2]
r, pValue_corr = stats.pearsonr(x, y)
print(f"   X: {x}")
print(f"   Y: {y}")
print(f"   결과: r = {r:.4f}, p = {pValue_corr:.8f}")

# 5. Shapiro-Wilk Test
print("\n5. Shapiro-Wilk 정규성 검정")
normal_data = [85, 90, 95, 100, 105, 110, 115]
w_stat, pValue_shapiro = stats.shapiro(normal_data)
print(f"   데이터: {normal_data}")
print(f"   결과: W = {w_stat:.4f}, p = {pValue_shapiro:.4f}")
print(f"   해석: {'정규분포' if pValue_shapiro > 0.05 else '비정규분포'}")

# 6. Mann-Whitney U Test
print("\n6. Mann-Whitney U Test")
sample1 = [12, 15, 18, 24, 30]
sample2 = [8, 11, 13, 17, 22]
u_stat, pValue_mw = stats.mannwhitneyu(sample1, sample2)
print(f"   샘플1: {sample1}")
print(f"   샘플2: {sample2}")
print(f"   결과: U = {u_stat:.4f}, p = {pValue_mw:.4f}")

# 7. Kruskal-Wallis Test
print("\n7. Kruskal-Wallis Test")
kw_g1 = [10, 12, 14]
kw_g2 = [15, 17, 19]
kw_g3 = [20, 22, 24]
h_stat, pValue_kw = stats.kruskal(kw_g1, kw_g2, kw_g3)
print(f"   그룹1: {kw_g1}")
print(f"   그룹2: {kw_g2}")
print(f"   그룹3: {kw_g3}")
print(f"   결과: H = {h_stat:.4f}, p = {pValue_kw:.4f}")

# 8. Linear Regression
print("\n8. Simple Linear Regression")
x_reg = [1, 2, 3, 4, 5]
y_reg = [2.8, 5.1, 7.9, 9.8, 13.2]
slope, intercept, r_value, pValue_reg, std_err = stats.linregress(x_reg, y_reg)
print(f"   X: {x_reg}")
print(f"   Y: {y_reg}")
print(f"   결과: slope = {slope:.4f}, intercept = {intercept:.4f}")
print(f"        R² = {r_value**2:.4f}, p = {pValue_reg:.4f}")

# JSON으로 저장 (테스트에서 사용)
reference_results = {
    "ttest": {
        "statistic": float(f"{t_stat:.4f}"),
        "pvalue": float(f"{pValue:.4f}")
    },
    "paired_ttest": {
        "statistic": float(f"{t_stat_paired:.4f}"),
        "pvalue": float(f"{pValue_paired:.4f}")
    },
    "anova": {
        "fstatistic": float(f"{f_stat:.4f}"),
        "pvalue": float(f"{pValue_anova:.6f}")
    },
    "correlation": {
        "r": float(f"{r:.4f}"),
        "pvalue": float(f"{pValue_corr:.8f}")
    },
    "shapiro": {
        "statistic": float(f"{w_stat:.4f}"),
        "pvalue": float(f"{pValue_shapiro:.4f}")
    },
    "mannwhitney": {
        "statistic": float(f"{u_stat:.4f}"),
        "pvalue": float(f"{pValue_mw:.4f}")
    },
    "kruskalwallis": {
        "statistic": float(f"{h_stat:.4f}"),
        "pvalue": float(f"{pValue_kw:.4f}")
    },
    "regression": {
        "slope": float(f"{slope:.4f}"),
        "intercept": float(f"{intercept:.4f}"),
        "rSquared": float(f"{r_value**2:.4f}"),
        "pvalue": float(f"{pValue_reg:.4f}")
    }
}

# 파일로 저장
with open("scipy_reference.json", "w") as f:
    json.dump(reference_results, f, indent=2)

print("\n" + "=" * 60)
print("결과가 scipy_reference.json 파일에 저장되었습니다.")
print("이 값들을 테스트에서 참조값으로 사용하세요.")
print("=" * 60)