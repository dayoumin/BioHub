# 통계 메서드 구현 현황 요약

## 📊 현재 상황 (2025-10-10)

### 1. 구현 완료 (41개)
**pyodide-statistics.ts에 Python 코드로 구현됨**

- anova, bartlettTest, calculateCorrelation, calculateDescriptiveStatistics
- checkAllAssumptions, chiSquare, chiSquareTest, clusterAnalysis
- correlation, cronbachAlpha, descriptiveStats, detectOutliersIQR
- dunnTest, factorAnalysis, friedman, gamesHowellTest
- kolmogorovSmirnovTest, kruskalWallis, leveneTest, logisticRegression
- mannWhitneyU, multipleRegression, oneSampleTTest, oneWayANOVA
- pairedTTest, pca, performBonferroni, performPCA, performTukeyHSD
- regression, shapiroWilkTest, simpleLinearRegression, testHomogeneity
- testIndependence, testNormality, timeSeriesAnalysis, tTest
- tukeyHSD, twoSampleTTest, twoWayANOVA, wilcoxon

### 2. 구현 필요 (24개) ⚠️
**메타데이터 등록 + Python 코드 작성 완료, pyodide-statistics.ts 통합 필요**

#### 우선순위 1 (11개)
1. frequency
2. crosstab
3. oneSampleProportionTest (메타데이터: proportionTest)
4. zTest
5. binomialTest
6. partialCorrelation
7. signTest
8. runsTest
9. mcNemarTest (메타데이터: mcNemar)
10. cochranQTest (메타데이터: cochranQ)
11. moodMedianTest (메타데이터: moodMedian)

#### 우선순위 2 (13개)
12. curveEstimation
13. nonlinearRegression
14. stepwiseRegression
15. binaryLogistic
16. multinomialLogistic
17. ordinalLogistic
18. probitRegression
19. poissonRegression
20. negativeBinomial
21. repeatedMeasuresAnova (메타데이터: repeatedMeasures)
22. ancova
23. manova
24. scheffeTest

### 3. 메타데이터만 등록 (우선순위 3 예정)
**고급 통계 분석 - Phase 6에서 구현 예정**

- discriminantAnalysis (판별분석)
- canonicalCorrelation (정준상관)
- survivalAnalysis (생존분석)
- metaAnalysis (메타분석)
- sem (구조방정식)
- multilevelModel (다층모형)
- mediation (매개효과)
- moderation (조절효과)
- 기타...

---

## 🎯 다음 작업

### 즉시 작업: pyodide-statistics.ts에 24개 메서드 추가

**방법**:
1. 기존 백업 복원 완료 ✅
2. priority1-implementation.md 와 priority2-implementation.md의 Python 코드 사용
3. 메서드명은 메타데이터와 일치하도록 (camelCase)
4. TypeScript 타입 정의

**예상 결과**:
- 파일 크기: 2,545줄 → ~3,500줄
- 총 메서드: 41개 → 65개
- 우선순위 1-2 완료 ✅

---

## 📋 구현 체크리스트

### 우선순위 1 (11개)
- [ ] frequency
- [ ] crosstab
- [ ] oneSampleProportionTest (proportionTest)
- [ ] zTest
- [ ] binomialTest
- [ ] partialCorrelation
- [ ] signTest
- [ ] runsTest
- [ ] mcNemarTest (mcNemar)
- [ ] cochranQTest (cochranQ)
- [ ] moodMedianTest (moodMedian)

### 우선순위 2 (13개)
- [ ] curveEstimation
- [ ] nonlinearRegression
- [ ] stepwiseRegression
- [ ] binaryLogistic
- [ ] multinomialLogistic
- [ ] ordinalLogistic
- [ ] probitRegression
- [ ] poissonRegression
- [ ] negativeBinomial
- [ ] repeatedMeasuresAnova (repeatedMeasures)
- [ ] ancova
- [ ] manova
- [ ] scheffeTest

---

**작성일**: 2025-10-10
**상태**: 24개 메서드 구현 대기 중
