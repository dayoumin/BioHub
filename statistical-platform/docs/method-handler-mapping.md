# 메서드-핸들러 매핑 분석

## 📊 전체 현황
- **Menu Items**: 44개 (menu-config.ts)
- **Handlers**: 32개 (calculator-handlers/)
- **매핑 방식**: 1:N (하나의 페이지가 여러 핸들러 사용)

---

## ✅ 기술통계 (Descriptive)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| descriptive-stats | 기술통계 | calculateDescriptiveStats | ✅ |
| frequency-table | 빈도분석 | (UI only - no calc) | ✅ |
| cross-tabulation | 교차표 | (UI only - crosstab) | ❓ |
| explore-data | 데이터 탐색 | normalityTest, homogeneityTest | ✅ |
| reliability-analysis | 신뢰도 분석 | (cronbachAlpha?) | ❓ |

**핸들러**: 3개
- ✅ calculateDescriptiveStats
- ✅ normalityTest
- ✅ homogeneityTest

---

## ✅ 평균 비교 (Compare)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| t-test | T-검정 | oneSampleTTest, twoSampleTTest, pairedTTest | ✅ |
| one-sample-t | 일표본 t-검정 | oneSampleTTest | ✅ |
| welch-t | Welch t-검정 | welchTTest | ✅ |
| one-sample-proportion | 비율 검정 | (oneSampleProportionTest?) | ❓ |
| means-plot | 평균 도표 | (시각화 only) | ✅ |

**핸들러**: 4개
- ✅ oneSampleTTest
- ✅ twoSampleTTest
- ✅ pairedTTest
- ✅ welchTTest

---

## ✅ 일반선형모델 (GLM)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| anova | ANOVA | oneWayANOVA, twoWayANOVA, tukeyHSD | ✅ |
| two-way-anova | 이원분산분석 | twoWayANOVA | ✅ |
| three-way-anova | 삼원분산분석 | (threeWayANOVA?) | ❓ |
| ancova | 공분산분석 | (ancova?) | ❓ |
| repeated-measures | 반복측정 ANOVA | (repeatedMeasuresANOVA?) | ❓ |
| manova | 다변량 분산분석 | manova | ✅ |
| mixed-model | 선형 혼합 모형 | mixedEffectsModel | ✅ |

**핸들러**: 6개 (ANOVA) + 1개 (Advanced)
- ✅ oneWayANOVA
- ✅ twoWayANOVA
- ✅ manova
- ✅ tukeyHSD
- ✅ bonferroni
- ✅ gamesHowell
- ✅ mixedEffectsModel (advanced.ts)

---

## ✅ 상관분석 (Correlate)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| correlation | 상관분석 | correlationAnalysis | ✅ |
| partial-correlation | 편상관분석 | (partialCorrelation?) | ❓ |

**핸들러**: 1개
- ✅ correlationAnalysis

---

## ✅ 회귀분석 (Regression)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| regression | 회귀분석 | simpleLinearRegression, multipleRegression, logisticRegression | ✅ |
| stepwise-regression | 단계적 회귀 | (stepwiseRegression?) | ❓ |
| ordinal-regression | 서열 회귀 | (ordinalRegression?) | ❓ |
| poisson-regression | 포아송 회귀 | (poissonRegression?) | ❓ |
| dose-response | 용량-반응 분석 | (doseResponse?) | ❓ |
| response-surface | 반응표면 분석 | (responseSurface?) | ❓ |

**핸들러**: 3개
- ✅ simpleLinearRegression
- ✅ multipleRegression
- ✅ logisticRegression

---

## ✅ 비모수 검정 (Nonparametric)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| non-parametric | 비모수 검정 | mannWhitneyU, wilcoxonSignedRank, kruskalWallis | ✅ |
| sign-test | 부호 검정 | (signTest?) | ❓ |
| runs-test | 런 검정 | (runsTest?) | ❓ |
| kolmogorov-smirnov | K-S 검정 | (ksTest?) | ❓ |
| mcnemar | McNemar 검정 | (mcNemarTest?) | ❓ |

**핸들러**: 5개
- ✅ mannWhitneyU
- ✅ wilcoxonSignedRank
- ✅ kruskalWallis
- ✅ dunnTest
- ✅ chiSquareTest

---

## ✅ 카이제곱 검정 (Chi-Square)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| chi-square | 카이제곱 검정 | chiSquareTest | ✅ |

**핸들러**: 1개
- ✅ chiSquareTest

---

## ✅ 고급 분석 (Advanced)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| factor-analysis | 요인분석 | (factorAnalysis?) | ❓ |
| pca | 주성분분석 | pca | ✅ |
| cluster-analysis | 군집분석 | kMeansClustering, hierarchicalClustering | ✅ |
| discriminant | 판별분석 | (discriminantAnalysis?) | ❓ |

**핸들러**: 10개
- ✅ pca
- ✅ kMeansClustering
- ✅ hierarchicalClustering
- ✅ timeSeriesDecomposition
- ✅ arimaForecast
- ✅ kaplanMeierSurvival
- ✅ mixedEffectsModel
- ✅ sarimaForecast
- ✅ varModel
- ✅ coxRegression

---

## ✅ 진단 및 검정 (Diagnostic)

| Menu ID | Menu Title | Handler | Status |
|---------|-----------|---------|--------|
| normality-test | 정규성 검정 | normalityTest | ✅ |
| mann-kendall | Mann-Kendall 추세 | (mannKendallTest?) | ❓ |
| power-analysis | 검정력 분석 | (powerAnalysis?) | ❓ |

**핸들러**: 1개
- ✅ normalityTest

---

## 🔍 누락 핸들러 (추정)

### 필요할 것으로 보이는 핸들러:
1. ❓ cronbachAlpha (신뢰도 분석)
2. ❓ crosstabAnalysis (교차표)
3. ❓ oneSampleProportionTest (비율 검정)
4. ❓ threeWayANOVA (삼원분산분석)
5. ❓ ancova (공분산분석)
6. ❓ repeatedMeasuresANOVA (반복측정)
7. ❓ partialCorrelation (편상관)
8. ❓ stepwiseRegression (단계적 회귀)
9. ❓ ordinalRegression (서열 회귀)
10. ❓ poissonRegression (포아송 회귀)
11. ❓ doseResponse (용량-반응)
12. ❓ responseSurface (반응표면)
13. ❓ signTest (부호 검정)
14. ❓ runsTest (런 검정)
15. ❓ ksTest (K-S 검정)
16. ❓ mcNemarTest (McNemar)
17. ❓ factorAnalysis (요인분석)
18. ❓ discriminantAnalysis (판별분석)
19. ❓ mannKendallTest (Mann-Kendall)
20. ❓ powerAnalysis (검정력 분석)

---

## 📝 다음 작업

### Option A: 실제 사용 여부 확인
각 페이지의 코드를 열어서 실제로 어떤 핸들러를 호출하는지 확인

### Option B: 누락 핸들러 구현
위 20개 핸들러를 추가 구현

### Option C: Switch 문 먼저 제거
현재 32개로 작동하는지 확인 후, 필요한 것만 추가

**추천**: Option A → C → B 순서
