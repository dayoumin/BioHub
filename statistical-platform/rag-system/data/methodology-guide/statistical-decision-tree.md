# 통계 방법 선택 플로우차트

**작성일**: 2025-10-31
**대상**: 석박사 연구자
**목적**: 연구 질문에 맞는 통계 방법 선택 가이드

---

## 📋 목차

1. [연구 설계에 따른 분류](#1-연구-설계에-따른-분류)
2. [데이터 타입에 따른 분류](#2-데이터-타입에-따른-분류)
3. [주요 연구 질문별 방법 선택](#3-주요-연구-질문별-방법-선택)
4. [검정 방법 선택 플로우차트](#4-검정-방법-선택-플로우차트)

---

## 1. 연구 설계에 따른 분류

### 1.1 비교 연구 (Comparative Studies)

#### 두 그룹 비교
```
질문: "두 그룹의 평균이 다른가?"

┌─────────────────────────────────────┐
│ 정규성 검정 (Shapiro-Wilk)          │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
    정규분포    정규성 위반
        │           │
        ▼           ▼
   등분산 검정   Mann-Whitney U
   (Levene)         검정
        │       (비모수 검정)
   ┌────┴────┐
   │         │
등분산   등분산 위반
   │         │
   ▼         ▼
독립표본   Welch's
t-검정     t-test
```

**추천 방법**:
- ✅ **정규성 + 등분산**: 독립표본 t-검정 (Independent t-test)
- ✅ **정규성 + 등분산 위반**: Welch's t-test
- ✅ **정규성 위반**: Mann-Whitney U 검정 (비모수)

**검색 키워드**: 't-test', 'mann-whitney', 'welch'
**카테고리**: 가설검정

---

#### 세 그룹 이상 비교
```
질문: "세 그룹 이상의 평균이 다른가?"

┌─────────────────────────────────────┐
│ 정규성 + 등분산 검정                │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
  가정 충족    가정 위반
        │           │
        ▼           ▼
   일원 ANOVA   Kruskal-Wallis
   (One-way)      검정
        │       (비모수)
        │
   유의미한 차이?
        │
        ▼
   사후 검정:
   - Tukey HSD
   - Bonferroni
   - Scheffé
```

**추천 방법**:
- ✅ **정규성 + 등분산**: 일원 ANOVA (One-way ANOVA)
- ✅ **정규성 위반**: Kruskal-Wallis 검정
- ✅ **사후 검정**: Tukey HSD (모든 쌍 비교), Bonferroni (보수적)

**검색 키워드**: 'anova', 'kruskal-wallis', 'tukey'
**카테고리**: 분산분석, 비모수 검정

---

### 1.2 쌍 비교 (Paired Comparisons)

#### 전-후 비교 (Before-After)
```
질문: "같은 대상의 전후 측정값이 다른가?"

┌─────────────────────────────────────┐
│ 차이값(D = After - Before) 정규성   │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
    정규분포    정규성 위반
        │           │
        ▼           ▼
   대응표본     Wilcoxon
   t-검정      Signed-Rank
   (Paired)      검정
```

**추천 방법**:
- ✅ **차이값 정규분포**: 대응표본 t-검정 (Paired t-test)
- ✅ **차이값 정규성 위반**: Wilcoxon Signed-Rank 검정

**검색 키워드**: 'paired-t', 'wilcoxon'
**카테고리**: 가설검정, 비모수 검정

---

### 1.3 반복측정 설계 (Repeated Measures)

#### 세 시점 이상 측정
```
질문: "시간에 따라 측정값이 변하는가?"

┌─────────────────────────────────────┐
│ 구형성 가정 (Sphericity)             │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
  가정 충족    가정 위반
        │           │
        ▼           ▼
  반복측정     Friedman
   ANOVA         검정
                (비모수)
```

**추천 방법**:
- ✅ **구형성 가정 충족**: 반복측정 ANOVA (Repeated Measures ANOVA)
- ✅ **구형성 가정 위반**: Greenhouse-Geisser 보정 또는 Friedman 검정

**검색 키워드**: 'repeated-measures', 'friedman'
**카테고리**: 분산분석, 비모수 검정

---

## 2. 데이터 타입에 따른 분류

### 2.1 범주형 데이터 (Categorical Data)

#### 독립성 검정 (Independence Test)
```
질문: "두 범주형 변수가 독립적인가?"

┌─────────────────────────────────────┐
│ 교차표 (Contingency Table)          │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
    2×2 표     더 큰 표
        │           │
        ▼           ▼
   Fisher's    카이제곱
  Exact Test    검정
  (n < 20)   (χ² test)
```

**추천 방법**:
- ✅ **2×2 표 + 작은 샘플**: Fisher's Exact Test
- ✅ **2×2 이상 표**: 카이제곱 검정 (Chi-square test)
- ⚠️ **기대빈도 < 5**: Fisher's Exact 또는 Monte Carlo simulation

**검색 키워드**: 'chi-square', 'fisher'
**카테고리**: 범주형 분석

---

#### 적합도 검정 (Goodness of Fit)
```
질문: "관측 분포가 기대 분포와 일치하는가?"

┌─────────────────────────────────────┐
│ 카이제곱 적합도 검정                 │
└─────────────────────────────────────┘

예시:
- 주사위가 공정한가? (1~6 균등 분포)
- 유전자형 비율이 3:1인가?
```

**추천 방법**:
- ✅ 카이제곱 적합도 검정 (Chi-square Goodness of Fit)

**검색 키워드**: 'chi-square-goodness'
**카테고리**: 범주형 분석

---

### 2.2 연속형 데이터 (Continuous Data)

#### 상관분석 (Correlation)
```
질문: "두 변수 간 선형 관계가 있는가?"

┌─────────────────────────────────────┐
│ 두 변수 모두 정규분포?              │
└─────────────┬───────────────────────┘
              │
        ┌─────┴─────┐
        │           │
     정규분포    정규성 위반
        │        또는 서열
        ▼           ▼
   Pearson     Spearman
   상관계수      순위상관
   (r)          (ρ)
```

**추천 방법**:
- ✅ **양 변수 정규분포**: Pearson 상관계수 (r)
- ✅ **정규성 위반 또는 서열 데이터**: Spearman 순위상관 (ρ)
- ✅ **비선형 단조 관계**: Kendall's tau (τ)

**검색 키워드**: 'correlation', 'pearson', 'spearman'
**카테고리**: 상관분석

---

#### 회귀분석 (Regression)
```
질문: "독립변수가 종속변수를 예측하는가?"

┌─────────────────────────────────────┐
│ 종속변수 타입?                      │
└─────────────┬───────────────────────┘
              │
     ┌────────┴────────┐
     │                 │
   연속형            범주형
     │                 │
     ▼                 ▼
독립변수 개수?      2범주 vs 다범주?
     │                 │
┌────┴────┐       ┌────┴────┐
│         │       │         │
1개     2개 이상  2범주   3범주 이상
│         │       │         │
▼         ▼       ▼         ▼
단순     다중    로지스틱  다항
선형     선형    회귀     로지스틱
회귀     회귀              회귀
```

**추천 방법**:
- ✅ **연속형 종속변수 + 1 독립변수**: 단순 선형 회귀 (Simple Linear Regression)
- ✅ **연속형 종속변수 + 여러 독립변수**: 다중 선형 회귀 (Multiple Linear Regression)
- ✅ **범주형 종속변수 (2범주)**: 로지스틱 회귀 (Logistic Regression)
- ✅ **범주형 종속변수 (3범주 이상)**: 다항 로지스틱 회귀 (Multinomial Logistic)

**검색 키워드**: 'regression', 'logistic'
**카테고리**: 회귀분석

---

## 3. 주요 연구 질문별 방법 선택

### 3.1 "두 그룹이 다른가?" (Difference)

| 데이터 특성 | 검정 방법 | 카테고리 | 검색어 |
|------------|----------|---------|--------|
| 정규분포 + 등분산 | 독립표본 t-검정 | 가설검정 | 't-test' |
| 정규분포 + 등분산 위반 | Welch's t-test | 가설검정 | 'welch' |
| 정규성 위반 | Mann-Whitney U | 비모수 | 'mann-whitney' |
| 쌍 데이터 + 정규분포 | 대응표본 t-검정 | 가설검정 | 'paired-t' |
| 쌍 데이터 + 정규성 위반 | Wilcoxon Signed-Rank | 비모수 | 'wilcoxon' |

---

### 3.2 "세 그룹 이상이 다른가?" (Multiple Groups)

| 데이터 특성 | 검정 방법 | 카테고리 | 검색어 |
|------------|----------|---------|--------|
| 정규분포 + 등분산 | 일원 ANOVA | 분산분석 | 'anova' |
| 정규성 위반 | Kruskal-Wallis | 비모수 | 'kruskal-wallis' |
| 반복측정 + 구형성 | 반복측정 ANOVA | 분산분석 | 'repeated-measures' |
| 반복측정 + 구형성 위반 | Friedman 검정 | 비모수 | 'friedman' |
| 두 요인 (2-way) | 이원 ANOVA | 분산분석 | 'two-way-anova' |

---

### 3.3 "관계가 있는가?" (Association)

| 데이터 특성 | 분석 방법 | 카테고리 | 검색어 |
|------------|----------|---------|--------|
| 두 연속형 + 정규분포 | Pearson 상관 | 상관분석 | 'correlation' |
| 두 연속형 + 정규성 위반 | Spearman 상관 | 상관분석 | 'spearman' |
| 두 범주형 변수 | 카이제곱 검정 | 범주형 분석 | 'chi-square' |
| 연속형 → 연속형 예측 | 선형 회귀 | 회귀분석 | 'regression' |
| 여러 변수 → 연속형 | 다중 회귀 | 회귀분석 | 'multiple-regression' |
| 여러 변수 → 범주형 | 로지스틱 회귀 | 회귀분석 | 'logistic' |

---

### 3.4 "분포가 정규분포인가?" (Normality)

| 샘플 크기 | 검정 방법 | 카테고리 | 검색어 |
|----------|----------|---------|--------|
| n < 50 | Shapiro-Wilk | 정규성 검정 | 'shapiro' |
| n ≥ 50 | Kolmogorov-Smirnov | 정규성 검정 | 'ks-test' |
| 시각적 확인 | Q-Q Plot | 탐색적 분석 | 'qq-plot' |

---

## 4. 검정 방법 선택 플로우차트

### 4.1 종합 의사결정 트리

```
시작: 연구 질문 정의
│
├─ 1. 데이터 타입?
│   ├─ 연속형 → 2단계
│   └─ 범주형 → 범주형 분석
│       ├─ 독립성 검정 → 카이제곱 검정
│       └─ 적합도 검정 → 카이제곱 적합도
│
├─ 2. 비교 대상?
│   ├─ 두 그룹 → 3단계
│   ├─ 세 그룹 이상 → 4단계
│   └─ 관계 분석 → 5단계
│
├─ 3. 두 그룹 비교
│   ├─ 독립 샘플?
│   │   ├─ Yes → 정규성 검정
│   │   │   ├─ 정규분포 → 등분산 검정
│   │   │   │   ├─ 등분산 → 독립표본 t-검정
│   │   │   │   └─ 등분산 위반 → Welch's t-test
│   │   │   └─ 정규성 위반 → Mann-Whitney U
│   │   └─ No (쌍 데이터) → 차이값 정규성
│   │       ├─ 정규분포 → 대응표본 t-검정
│   │       └─ 정규성 위반 → Wilcoxon Signed-Rank
│
├─ 4. 세 그룹 이상 비교
│   ├─ 독립 샘플?
│   │   ├─ Yes → 정규성 + 등분산
│   │   │   ├─ 가정 충족 → 일원 ANOVA → 사후 검정
│   │   │   └─ 가정 위반 → Kruskal-Wallis
│   │   └─ No (반복측정) → 구형성 가정
│   │       ├─ 가정 충족 → 반복측정 ANOVA
│   │       └─ 가정 위반 → Friedman 검정
│
└─ 5. 관계 분석
    ├─ 상관분석?
    │   ├─ 정규분포 → Pearson 상관
    │   └─ 정규성 위반 → Spearman 상관
    └─ 예측 모델?
        ├─ 종속변수 연속형 → 선형 회귀
        └─ 종속변수 범주형 → 로지스틱 회귀
```

---

## 5. 가정 검증 체크리스트

### 5.1 모수 검정 공통 가정

1. **정규성 (Normality)**
   - 검정: Shapiro-Wilk (n < 50), Kolmogorov-Smirnov (n ≥ 50)
   - 시각화: Q-Q Plot, 히스토그램
   - 기준: p > 0.05 (정규분포)

2. **등분산성 (Homogeneity of Variance)**
   - 검정: Levene's Test, Bartlett's Test
   - 기준: p > 0.05 (등분산)

3. **독립성 (Independence)**
   - 설계 확인: 무작위 샘플링, 독립 관측치
   - 검정: Durbin-Watson (회귀분석)

---

### 5.2 ANOVA 특수 가정

4. **구형성 (Sphericity)** - 반복측정 ANOVA 전용
   - 검정: Mauchly's Test
   - 기준: p > 0.05 (구형성 충족)
   - 위반 시 보정: Greenhouse-Geisser, Huynh-Feldt

---

### 5.3 회귀분석 특수 가정

5. **선형성 (Linearity)**
   - 시각화: Residual vs Fitted plot
   - 잔차가 0 주위에 무작위 분포

6. **다중공선성 (Multicollinearity)** - 다중 회귀 전용
   - 검정: VIF (Variance Inflation Factor)
   - 기준: VIF < 10 (일반적), VIF < 5 (엄격)

7. **잔차 정규성 (Normality of Residuals)**
   - Q-Q Plot of residuals
   - Shapiro-Wilk test on residuals

---

## 6. 효과 크기 (Effect Size) 가이드

### 6.1 Cohen's d (t-test)

| 값 | 해석 |
|----|------|
| d = 0.2 | 작은 효과 (Small) |
| d = 0.5 | 중간 효과 (Medium) |
| d = 0.8 | 큰 효과 (Large) |

---

### 6.2 η² (Eta-squared) - ANOVA

| 값 | 해석 |
|----|------|
| η² = 0.01 | 작은 효과 |
| η² = 0.06 | 중간 효과 |
| η² = 0.14 | 큰 효과 |

---

### 6.3 Cramér's V - 카이제곱

| df* | Small | Medium | Large |
|-----|-------|--------|-------|
| 1 | 0.10 | 0.30 | 0.50 |
| 2 | 0.07 | 0.21 | 0.35 |
| 3 | 0.06 | 0.17 | 0.29 |

*df = min(rows-1, cols-1)

---

## 7. 사후 검정 (Post-hoc Tests) 선택

### ANOVA 유의 시 그룹 간 차이 탐색

| 사후 검정 | 특징 | 사용 시기 |
|----------|------|----------|
| **Tukey HSD** | 균형 잡힌 보수성 | 모든 쌍 비교 (가장 일반적) |
| **Bonferroni** | 매우 보수적 | 소수의 계획된 비교 |
| **Scheffé** | 가장 보수적 | 복잡한 대조 (contrast) |
| **Dunnett** | 대조군 비교에 최적화 | 여러 실험군 vs 1개 대조군 |
| **Games-Howell** | 등분산 불필요 | 등분산 가정 위반 시 |

**추천**: Tukey HSD (균형 잡힌 Type I/II 에러 제어)

---

## 8. 검정력 분석 (Power Analysis)

### 8.1 사전 검정력 분석 (A Priori)

**질문**: "유의미한 효과를 발견하려면 몇 명이 필요한가?"

**입력**:
- α (유의수준): 0.05
- Power (1-β): 0.80
- Effect Size: Cohen's d = 0.5 (중간 효과)

**출력**: 필요 샘플 크기 (n)

**검색 키워드**: 'power-analysis'
**카테고리**: 검정력 분석

---

### 8.2 사후 검정력 분석 (Post Hoc)

**주의**: 논란이 있는 방법 (일부 통계학자는 권장하지 않음)

**대안**: 신뢰구간(CI) + 효과 크기 보고

---

## 9. 참고 문헌

**통계 방법론**:
- Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences.
- Field, A. (2013). Discovering Statistics Using IBM SPSS Statistics.
- Tabachnick, B. G., & Fidell, L. S. (2013). Using Multivariate Statistics.

**온라인 리소스**:
- SciPy Stats Documentation: https://docs.scipy.org/doc/scipy/reference/stats.html
- statsmodels Documentation: https://www.statsmodels.org/
- Statistics How To: https://www.statisticshowto.com/

---

**작성자**: Claude Code (AI)
**버전**: 1.0
**최종 수정**: 2025-10-31
