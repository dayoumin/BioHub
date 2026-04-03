# Schema Extension Checklist

> **Status**: ✅ Complete
> **Created**: 2026-01-27
> **Total Methods**: 56
> **Completed**: 56

---

## Progress Summary

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| 기술통계 (descriptive) | 5 | 5 | 0 |
| 평균비교 (compare) | 6 | 6 | 0 |
| 일반선형모델 (glm) | 8 | 8 | 0 |
| 상관분석 (correlate) | 4 | 4 | 0 |
| 회귀분석 (regression) | 6 | 6 | 0 |
| 비모수검정 (nonparametric) | 12 | 12 | 0 |
| 카이제곱 (chi-square) | 3 | 3 | 0 |
| 고급분석 (advanced) | 4 | 4 | 0 |
| 생존분석 (survival) | 2 | 2 | 0 |
| 시계열 (timeseries) | 3 | 3 | 0 |
| 진단검정 (diagnostic) | 1 | 1 | 0 |
| 유틸리티 (utility) | 2 | 2 | 0 |

---

## Checklist by Category

### 1. 기술통계 (Descriptive Statistics) - 5개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 1 | descriptive-stats | 기술통계량 | [x] | [x] | [x] | ✅ 완료 |
| 2 | frequency-table | 빈도표 | [x] | [x] | [x] | ✅ 완료 |
| 3 | cross-tabulation | 교차표 | [x] | [x] | [x] | ✅ 완료 |
| 4 | explore-data | 데이터 탐색 | [x] | [x] | [x] | ✅ 완료 |
| 5 | reliability-analysis | 신뢰도 분석 | [x] | [x] | [x] | ✅ 완료 |

### 2. 평균비교 (Compare Means) - 6개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 6 | one-sample-t | 일표본 t-검정 | [x] | [x] | [x] | ✅ 완료 |
| 7 | two-sample-t | 독립표본 t-검정 | [x] | [x] | [x] | ✅ 완료 (참조용) |
| 8 | paired-t | 대응표본 t-검정 | [x] | [x] | [x] | ✅ 완료 |
| 9 | welch-t | Welch t-검정 | [x] | [x] | [x] | ✅ 완료 |
| 10 | one-sample-proportion | 일표본 비율검정 | [x] | [x] | [x] | ✅ 완료 |
| 11 | means-plot | 평균 도표 | [x] | [x] | [x] | ✅ 완료 |

### 3. 일반선형모델 (GLM) - 8개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 12 | one-way-anova | 일원분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 13 | two-way-anova | 이원분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 14 | three-way-anova | 삼원분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 15 | ancova | 공분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 16 | repeated-measures-anova | 반복측정 분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 17 | manova | 다변량분산분석 | [x] | [x] | [x] | ✅ 완료 |
| 18 | mixed-model | 혼합모형 | [x] | [x] | [x] | ✅ 완료 |
| 19 | response-surface | 반응표면분석 | [x] | [x] | [x] | ✅ 완료 |

### 4. 상관분석 (Correlation) - 4개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 20 | pearson-correlation | Pearson 상관 | [x] | [x] | [x] | ✅ 완료 |
| 21 | spearman-correlation | Spearman 상관 | [x] | [x] | [x] | ✅ 완료 |
| 22 | kendall-correlation | Kendall 상관 | [x] | [x] | [x] | ✅ 완료 |
| 23 | partial-correlation | 편상관 | [x] | [x] | [x] | ✅ 완료 |

### 5. 회귀분석 (Regression) - 6개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 24 | simple-regression | 단순회귀 | [x] | [x] | [x] | ✅ 완료 |
| 25 | multiple-regression | 다중회귀 | [x] | [x] | [x] | ✅ 완료 |
| 26 | stepwise-regression | 단계적회귀 | [x] | [x] | [x] | ✅ 완료 |
| 27 | logistic-regression | 로지스틱회귀 | [x] | [x] | [x] | ✅ 완료 |
| 28 | ordinal-regression | 서열회귀 | [x] | [x] | [x] | ✅ 완료 |
| 29 | poisson-regression | 포아송회귀 | [x] | [x] | [x] | ✅ 완료 |

### 6. 비모수검정 (Nonparametric) - 12개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 30 | mann-whitney | Mann-Whitney U | [x] | [x] | [x] | ✅ 완료 |
| 31 | wilcoxon-signed-rank | Wilcoxon 부호순위 | [x] | [x] | [x] | ✅ 완료 |
| 32 | kruskal-wallis | Kruskal-Wallis | [x] | [x] | [x] | ✅ 완료 |
| 33 | friedman | Friedman | [x] | [x] | [x] | ✅ 완료 |
| 34 | sign-test | 부호 검정 | [x] | [x] | [x] | ✅ 완료 |
| 35 | runs-test | 런 검정 | [x] | [x] | [x] | ✅ 완료 |
| 36 | kolmogorov-smirnov | K-S 검정 | [x] | [x] | [x] | ✅ 완료 |
| 37 | mcnemar | McNemar | [x] | [x] | [x] | ✅ 완료 |
| 38 | cochran-q | Cochran Q | [x] | [x] | [x] | ✅ 완료 |
| 39 | mood-median | Mood 중앙값 | [x] | [x] | [x] | ✅ 완료 |
| 40 | binomial-test | 이항 검정 | [x] | [x] | [x] | ✅ 완료 (참조용) |
| 41 | mann-kendall-test | Mann-Kendall | [x] | [x] | [x] | ✅ 완료 |

### 7. 카이제곱검정 (Chi-square) - 3개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 42 | chi-square-independence | 독립성 검정 | [x] | [x] | [x] | ✅ 완료 |
| 43 | chi-square-goodness | 적합도 검정 | [x] | [x] | [x] | ✅ 완료 |
| 44 | fisher-exact | Fisher 정확검정 | [x] | [x] | [x] | ✅ 완료 |

### 8. 고급분석 (Advanced) - 4개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 45 | factor-analysis | 요인분석 | [x] | [x] | [x] | ✅ 완료 |
| 46 | pca | 주성분분석 | [x] | [x] | [x] | ✅ 완료 |
| 47 | cluster-analysis | 군집분석 | [x] | [x] | [x] | ✅ 완료 |
| 48 | discriminant-analysis | 판별분석 | [x] | [x] | [x] | ✅ 완료 |

### 9. 생존분석 (Survival) - 2개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 49 | kaplan-meier | Kaplan-Meier | [x] | [x] | [x] | ✅ 완료 |
| 50 | cox-regression | Cox 회귀 | [x] | [x] | [x] | ✅ 완료 |

### 10. 시계열 (Time Series) - 3개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 51 | arima | ARIMA | [x] | [x] | [x] | ✅ 완료 |
| 52 | seasonal-decompose | 계절분해 | [x] | [x] | [x] | ✅ 완료 |
| 53 | stationarity-test | 정상성 검정 | [x] | [x] | [x] | ✅ 완료 |

### 11. 진단검정 (Diagnostic) - 1개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 54 | normality-test | 정규성 검정 | [x] | [x] | [x] | ✅ 완료 |

### 12. 유틸리티 (Utility) - 2개

| # | Method ID | Name | dataFormat | settings | sampleData | Notes |
|---|-----------|------|:----------:|:--------:|:----------:|-------|
| 55 | dose-response | 용량-반응 분석 | [x] | [x] | [x] | ✅ 완료 |
| 56 | power-analysis | 검정력 분석 | [x] | [x] | [x] | ✅ 완료 |

---

## Special Cases (특수 케이스)

### 1. 데이터 형식 특수

| Method | 특수 사항 |
|--------|----------|
| repeated-measures-anova | **Long format** 필수 (subject, time, value) |
| mixed-model | 복잡한 다단계 구조 |
| kaplan-meier | 시간 + 이벤트 + 중도절단 변수 |
| cox-regression | 생존 데이터 형식 |
| arima | 시계열 인덱스 필요 |
| seasonal-decompose | 시계열 + 주기 정보 |

### 2. 설정값 특수

| Method | 특수 사항 |
|--------|----------|
| logistic-regression | 종속변수가 이진형 |
| ordinal-regression | 종속변수가 서열형 |
| poisson-regression | 종속변수가 카운트 |
| power-analysis | 데이터 없이 파라미터만 입력 |

### 3. 미구현/제외 대상

| Method | 이유 |
|--------|------|
| frequency-table | 페이지 미구현 |
| cross-tabulation | 페이지 미구현 |
| explore-data | 카테고리 페이지 (메서드 아님) |
| fisher-exact | 페이지 미구현 |

---

## Template Reference

### dataFormat 템플릿

```typescript
dataFormat: {
  type: 'wide',  // 'wide' | 'long' | 'both'
  description: '각 행이 하나의 관측치를 나타냅니다.',
  columns: [
    {
      name: '열 이름',
      description: '설명',
      example: '예시값',
      required: true  // true | false
    }
  ]
}
```

### settings 템플릿

```typescript
settings: {
  settingKey: {
    label: '설정 라벨',
    description: '사용자를 위한 설명',
    default: 'default-value',
    options: [  // 선택 옵션이 있는 경우
      { value: 'option1', label: '옵션1', description: '설명' }
    ],
    range: { min: 0, max: 1 }  // 숫자 범위인 경우
  }
}
```

### sampleData 템플릿

```typescript
sampleData: {
  headers: ['열1', '열2', '열3'],
  rows: [
    [1, 'A', 100],
    [2, 'B', 200]
  ],
  description: '예시 데이터 설명'
}
```

---

## Work Log

| Date | Methods Updated | Notes |
|------|-----------------|-------|
| 2026-01-27 | two-sample-t, binomial-test | 초기 구현 (참조용) |
| 2026-01-27 | one-sample-t, paired-t, one-way-anova, simple-regression, chi-square-independence, mann-whitney | 1차 배치 확장 |
| 2026-01-27 | welch-t, wilcoxon-signed-rank, kruskal-wallis, multiple-regression, two-way-anova, pearson-correlation | 2차 배치 확장 |
| 2026-01-27 | spearman, kendall, partial-correlation, three-way-anova, friedman, sign-test | 3차 배치 확장 |
| 2026-01-27 | runs-test, kolmogorov-smirnov, mcnemar, chi-square-goodness, fisher-exact, normality-test | 4차 배치 확장 |
| 2026-01-27 | factor-analysis, pca, kaplan-meier, cox-regression, arima, seasonal-decompose | 5차 배치 확장 |
| 2026-01-27 | stepwise-regression, logistic-regression, ordinal-regression, poisson-regression, cochran-q, mood-median | 6차 배치 확장 |
| 2026-01-27 | ancova, repeated-measures-anova, manova, mixed-model, response-surface, stationarity-test | 7차 배치 확장 |
| 2026-01-27 | descriptive-stats, frequency-table, reliability-analysis, mann-kendall-test, cluster-analysis, discriminant-analysis | 8차 배치 확장 |
| 2026-01-27 | cross-tabulation, explore-data, one-sample-proportion, means-plot, dose-response, power-analysis | 9차 배치 (최종) |

---

**Last Updated**: 2026-01-27
