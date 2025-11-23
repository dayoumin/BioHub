# 해석 엔진 커버리지 분석

## 현재 지원 중인 통계 방법 (16개)

### Phase 1: Purpose 기반 (3개)
1. ✅ **그룹 비교** (2-group comparison)
   - t-test, Mann-Whitney, Welch-t 등
2. ✅ **상관관계** (correlation)
   - Pearson correlation, Spearman correlation
3. ✅ **예측/회귀** (regression)
   - Linear regression, Multiple regression

### Phase 2: Method 기반 (13개)
4. ✅ **ANOVA** (다집단 비교)
   - One-way ANOVA, Kruskal-Wallis
5. ✅ **Chi-Square** (범주형 연관성)
   - Chi-square independence, Chi-square goodness-of-fit, Fisher exact test
6. ✅ **McNemar** (쌍대 범주형)
7. ✅ **정규성 검정**
   - Shapiro-Wilk, Kolmogorov-Smirnov, Anderson-Darling
8. ✅ **등분산성 검정**
   - Levene's test, Bartlett's test
9. ✅ **신뢰도 분석**
   - Cronbach's Alpha
10. ✅ **군집 분석**
    - K-means clustering
11. ✅ **PCA** (차원 축소)
    - Principal Component Analysis, Factor Analysis

---

## 지원 필요한 통계 방법 (28개)

### 우선순위 1: 비모수 검정 (8개) - 사용 빈도 높음
1. ⬜ **Wilcoxon** (대응표본 비모수)
2. ⬜ **Sign Test** (대응표본 부호 검정)
3. ⬜ **Friedman** (반복측정 비모수)
4. ⬜ **Mood's Median** (중앙값 검정)
5. ⬜ **Runs Test** (무작위성 검정)
6. ⬜ **Cochran Q** (다중 이분형)
7. ⬜ **Mann-Kendall** (추세 검정)
8. ⬜ **Binomial Test** (이항 검정)

### 우선순위 2: ANOVA 변형 (4개)
9. ⬜ **Two-way ANOVA** (이원분산분석)
10. ⬜ **Repeated Measures ANOVA** (반복측정)
11. ⬜ **ANCOVA** (공분산분석)
12. ⬜ **MANOVA** (다변량 분산분석)

### 우선순위 3: 회귀 변형 (5개)
13. ⬜ **Logistic Regression** (로지스틱 회귀)
14. ⬜ **Ordinal Regression** (순서형 회귀)
15. ⬜ **Poisson Regression** (포아송 회귀)
16. ⬜ **Stepwise Regression** (단계적 회귀)
17. ⬜ **Partial Correlation** (편상관)

### 우선순위 4: 고급 분석 (6개)
18. ⬜ **Discriminant Analysis** (판별분석)
19. ⬜ **Factor Analysis** (요인분석 - 이미 PCA에 포함됨)
20. ⬜ **Mixed Model** (혼합 모형)
21. ⬜ **Power Analysis** (검정력 분석)
22. ⬜ **Dose-Response** (용량-반응)
23. ⬜ **Response Surface** (반응표면)

### 우선순위 5: 기타 (5개)
24. ⬜ **Descriptive** (기술통계)
25. ⬜ **Proportion Test** (비율 검정)
26. ⬜ **One-sample t-test** (일표본 t검정)
27. ⬜ **Explore Data** (탐색적 분석)
28. ⬜ **Means Plot** (평균 플롯)

---

## Phase 1 개선 계획 (8개)

**우선순위 1: 비모수 검정** - 가장 자주 사용되며 해석이 명확함

### Batch 1 (4개) - 대응/쌍대 검정
1. Wilcoxon (대응표본 비모수 검정)
2. Sign Test (부호 검정)
3. Friedman (반복측정 비모수 ANOVA)
4. Cochran Q (다중 이분형 변수)

### Batch 2 (4개) - 독립/무작위 검정
5. Mood's Median (중앙값 검정)
6. Runs Test (무작위성 검정)
7. Mann-Kendall (추세 검정)
8. Binomial Test (이항 검정)

---

## 예상 작업량

- **Batch 1**: 약 100줄 코드 추가 + 20개 테스트
- **Batch 2**: 약 100줄 코드 추가 + 20개 테스트
- **검증**: TypeScript 컴파일 + 테스트 실행

**총 예상**: 200줄 코드 + 40개 테스트
