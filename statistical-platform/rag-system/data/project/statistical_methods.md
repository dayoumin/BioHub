---
title: Statistical Methods Metadata
source: lib/statistics/registry/method-metadata.ts
type: Project Internal Documentation
license: MIT
crawled_date: 2025-10-31
---

# Statistical Methods Metadata

**파일**: `lib/statistics/registry/method-metadata.ts`
**총 메서드 개수**: 60

이 문서는 통계 플랫폼의 60개 통계 메서드 메타데이터를 정리한 것입니다.

---

## 📋 메서드 그룹별 분류


### Descriptive Statistics (Worker 1)

**메서드 개수**: 10

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `mean` | numpy | 0.1 |
| `median` | numpy | 0.1 |
| `mode` | scipy | 0.1 |
| `descriptive` | numpy, scipy | 0.2 |
| `normality` | scipy | 0.3 |
| `outliers` | numpy, scipy | 0.2 |
| `frequency` | numpy | 0.1 |
| `crosstab` | numpy, scipy | 0.2 |
| `proportionTest` | scipy | 0.2 |
| `reliability` | numpy | 0.3 |


### Hypothesis Testing (Worker 2)

**메서드 개수**: 8

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `tTest` | scipy | 0.2 |
| `pairedTTest` | scipy | 0.2 |
| `oneSampleTTest` | scipy | 0.2 |
| `zTest` | scipy, statsmodels | 0.2 |
| `chiSquare` | scipy | 0.2 |
| `binomialTest` | scipy | 0.2 |
| `correlation` | numpy, scipy | 0.2 |
| `partialCorrelation` | numpy, scipy | 0.3 |


### Nonparametric Tests (Worker 3)

**메서드 개수**: 9

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `mannWhitney` | scipy | 0.3 |
| `wilcoxon` | scipy | 0.3 |
| `kruskalWallis` | scipy | 0.3 |
| `friedman` | scipy | 0.3 |
| `signTest` | scipy | 0.2 |
| `runsTest` | scipy, statsmodels | 0.3 |
| `mcNemar` | scipy, statsmodels | 0.2 |
| `cochranQ` | scipy, statsmodels | 0.3 |
| `moodMedian` | scipy | 0.3 |


### ANOVA (Worker 3)

**메서드 개수**: 9

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `oneWayAnova` | scipy, statsmodels | 0.3 |
| `twoWayAnova` | scipy, statsmodels | 0.4 |
| `repeatedMeasures` | scipy, statsmodels | 0.5 |
| `ancova` | statsmodels | 0.4 |
| `manova` | statsmodels | 0.5 |
| `tukeyHSD` | scipy, statsmodels | 0.3 |
| `scheffeTest` | scipy, statsmodels | 0.3 |
| `bonferroni` | scipy, statsmodels | 0.3 |
| `gamesHowell` | scipy, statsmodels | 0.3 |


### Regression Analysis (Worker 4)

**메서드 개수**: 12

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `linearRegression` | numpy, scipy | 0.3 |
| `multipleRegression` | numpy, scipy, statsmodels | 0.4 |
| `logisticRegression` | scipy, statsmodels | 0.4 |
| `curveEstimation` | numpy, scipy | 0.3 |
| `nonlinearRegression` | scipy | 0.5 |
| `stepwiseRegression` | numpy, statsmodels | 0.6 |
| `binaryLogistic` | statsmodels | 0.4 |
| `multinomialLogistic` | statsmodels | 0.5 |
| `ordinalLogistic` | statsmodels | 0.5 |
| `probitRegression` | statsmodels | 0.4 |
| `poissonRegression` | statsmodels | 0.4 |
| `negativeBinomial` | statsmodels | 0.4 |


### Advanced Analytics (Worker 4)

**메서드 개수**: 12

| 메서드 ID | 의존성 패키지 | 예상 실행 시간 (초) |
|-----------|---------------|--------------------|
| `pca` | numpy, sklearn | 0.5 |
| `factorAnalysis` | sklearn | 0.6 |
| `clusterAnalysis` | sklearn | 0.5 |
| `discriminantAnalysis` | sklearn | 0.5 |
| `canonicalCorrelation` | numpy, scipy | 0.6 |
| `survivalAnalysis` | numpy, scipy | 0.7 |
| `timeSeries` | numpy, scipy, statsmodels | 0.6 |
| `metaAnalysis` | numpy, scipy | 0.5 |
| `sem` | numpy, scipy | 0.8 |
| `multilevelModel` | statsmodels | 0.7 |
| `mediation` | numpy, scipy | 0.5 |
| `moderation` | numpy, scipy, statsmodels | 0.5 |


---

## 📚 전체 메서드 목록 (알파벳 순)

| 메서드 ID | 그룹 | Worker | 의존성 | 예상 시간 |
|-----------|------|--------|--------|----------|
| `ancova` | ANOVA | Worker 3 | statsmodels | 0.4s |
| `binaryLogistic` | Regression Analysis | Worker 4 | statsmodels | 0.4s |
| `binomialTest` | Hypothesis Testing | Worker 2 | scipy | 0.2s |
| `bonferroni` | ANOVA | Worker 3 | scipy, statsmodels | 0.3s |
| `canonicalCorrelation` | Advanced Analytics | Worker 4 | numpy, scipy | 0.6s |
| `chiSquare` | Hypothesis Testing | Worker 2 | scipy | 0.2s |
| `clusterAnalysis` | Advanced Analytics | Worker 4 | sklearn | 0.5s |
| `cochranQ` | Nonparametric Tests | Worker 3 | scipy, statsmodels | 0.3s |
| `correlation` | Hypothesis Testing | Worker 2 | numpy, scipy | 0.2s |
| `crosstab` | Descriptive Statistics | Worker 1 | numpy, scipy | 0.2s |
| `curveEstimation` | Regression Analysis | Worker 4 | numpy, scipy | 0.3s |
| `descriptive` | Descriptive Statistics | Worker 1 | numpy, scipy | 0.2s |
| `discriminantAnalysis` | Advanced Analytics | Worker 4 | sklearn | 0.5s |
| `factorAnalysis` | Advanced Analytics | Worker 4 | sklearn | 0.6s |
| `frequency` | Descriptive Statistics | Worker 1 | numpy | 0.1s |
| `friedman` | Nonparametric Tests | Worker 3 | scipy | 0.3s |
| `gamesHowell` | ANOVA | Worker 3 | scipy, statsmodels | 0.3s |
| `kruskalWallis` | Nonparametric Tests | Worker 3 | scipy | 0.3s |
| `linearRegression` | Regression Analysis | Worker 4 | numpy, scipy | 0.3s |
| `logisticRegression` | Regression Analysis | Worker 4 | scipy, statsmodels | 0.4s |
| `mannWhitney` | Nonparametric Tests | Worker 3 | scipy | 0.3s |
| `manova` | ANOVA | Worker 3 | statsmodels | 0.5s |
| `mcNemar` | Nonparametric Tests | Worker 3 | scipy, statsmodels | 0.2s |
| `mean` | Descriptive Statistics | Worker 1 | numpy | 0.1s |
| `median` | Descriptive Statistics | Worker 1 | numpy | 0.1s |
| `mediation` | Advanced Analytics | Worker 4 | numpy, scipy | 0.5s |
| `metaAnalysis` | Advanced Analytics | Worker 4 | numpy, scipy | 0.5s |
| `mode` | Descriptive Statistics | Worker 1 | scipy | 0.1s |
| `moderation` | Advanced Analytics | Worker 4 | numpy, scipy, statsmodels | 0.5s |
| `moodMedian` | Nonparametric Tests | Worker 3 | scipy | 0.3s |
| `multilevelModel` | Advanced Analytics | Worker 4 | statsmodels | 0.7s |
| `multinomialLogistic` | Regression Analysis | Worker 4 | statsmodels | 0.5s |
| `multipleRegression` | Regression Analysis | Worker 4 | numpy, scipy, statsmodels | 0.4s |
| `negativeBinomial` | Regression Analysis | Worker 4 | statsmodels | 0.4s |
| `nonlinearRegression` | Regression Analysis | Worker 4 | scipy | 0.5s |
| `normality` | Descriptive Statistics | Worker 1 | scipy | 0.3s |
| `oneSampleTTest` | Hypothesis Testing | Worker 2 | scipy | 0.2s |
| `oneWayAnova` | ANOVA | Worker 3 | scipy, statsmodels | 0.3s |
| `ordinalLogistic` | Regression Analysis | Worker 4 | statsmodels | 0.5s |
| `outliers` | Descriptive Statistics | Worker 1 | numpy, scipy | 0.2s |
| `pairedTTest` | Hypothesis Testing | Worker 2 | scipy | 0.2s |
| `partialCorrelation` | Hypothesis Testing | Worker 2 | numpy, scipy | 0.3s |
| `pca` | Advanced Analytics | Worker 4 | numpy, sklearn | 0.5s |
| `poissonRegression` | Regression Analysis | Worker 4 | statsmodels | 0.4s |
| `probitRegression` | Regression Analysis | Worker 4 | statsmodels | 0.4s |
| `proportionTest` | Descriptive Statistics | Worker 1 | scipy | 0.2s |
| `reliability` | Descriptive Statistics | Worker 1 | numpy | 0.3s |
| `repeatedMeasures` | ANOVA | Worker 3 | scipy, statsmodels | 0.5s |
| `runsTest` | Nonparametric Tests | Worker 3 | scipy, statsmodels | 0.3s |
| `scheffeTest` | ANOVA | Worker 3 | scipy, statsmodels | 0.3s |
| `sem` | Advanced Analytics | Worker 4 | numpy, scipy | 0.8s |
| `signTest` | Nonparametric Tests | Worker 3 | scipy | 0.2s |
| `stepwiseRegression` | Regression Analysis | Worker 4 | numpy, statsmodels | 0.6s |
| `survivalAnalysis` | Advanced Analytics | Worker 4 | numpy, scipy | 0.7s |
| `tTest` | Hypothesis Testing | Worker 2 | scipy | 0.2s |
| `timeSeries` | Advanced Analytics | Worker 4 | numpy, scipy, statsmodels | 0.6s |
| `tukeyHSD` | ANOVA | Worker 3 | scipy, statsmodels | 0.3s |
| `twoWayAnova` | ANOVA | Worker 3 | scipy, statsmodels | 0.4s |
| `wilcoxon` | Nonparametric Tests | Worker 3 | scipy | 0.3s |
| `zTest` | Hypothesis Testing | Worker 2 | scipy, statsmodels | 0.2s |

---

## 📦 의존성 패키지 통계

| 패키지 | 사용 메서드 수 | 비율 |
|--------|---------------|------|
| `scipy` | 42 | 70.0% |
| `statsmodels` | 25 | 41.7% |
| `numpy` | 21 | 35.0% |
| `sklearn` | 4 | 6.7% |
