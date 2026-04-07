# BioHub Statistical Validation Report

**Status**: Phase 1 Complete (6/50 methods, current runner scope)
**Last Run**: 2026-04-06
**Runner**: `pnpm test:validation`
**Current Scope**: Phase 1 R 교차검증 6건 (`stats/validation/results/run-phase1-2026-04-06.json`)

## 검증 개요

| 항목 | 값 |
|------|---|
| 검증 대상 | BioHub 46개 통계 메서드 + 4개 데이터 도구 |
| 기준 소스 | 현재 실행: R 4.5.3 / 준비된 fixture: NIST StRD |
| Pyodide | 0.29.3 |
| SciPy | 1.14.1 |
| statsmodels | 0.14.1 |
| Node.js | v22.22.2 |
| 허용 오차 정책 | 현재 실행: 4-Tier (exact / tier2 / tier3 / tier4) |
| LRE 기준 | Tier 2: 4+, Tier 3: 2+, Tier 4: 2+ |

## 검증 결과 요약

### Phase 1: T-test 4종 + ANOVA 2종

| 메서드 | Layer | 기준 소스 | 데이터셋 | 상태 | 평균 LRE |
|--------|-------|-----------|----------|------|----------|
| `two-sample-t` | L2 | R 4.5.3 | synthetic (n=15+15) | PASS | 14.8 |
| `welch-t` | L2 | R 4.5.3 | synthetic (n=15+15) | PASS | 14.7 |
| `one-sample-t` | L2 | R 4.5.3 | synthetic (n=10) | PASS | 15.0 |
| `paired-t` | L2 | R 4.5.3 | synthetic (n=10 pairs) | PASS | 15.0 |
| `one-way-anova` | L2 | R 4.5.3 | synthetic (3×10) | PASS | 14.9 |
| `two-way-anova` | L2 | R 4.5.3 | ToothGrowth (n=60) | PASS | 14.4 |

**Phase 1 종합**: 6/6 PASS, 평균 LRE **14.8** (15.0 만점)

`one-way-anova`는 목표 매트릭스상 `L1+L2` 대상이지만, 현재 실행 결과에는 R synthetic 교차검증만 포함됩니다. NIST `AtmWtAg` 직접 검증은 fixture가 준비된 상태이며 아직 러너에 연결되지 않았습니다.

### 필드별 상세 (대표: two-sample-t)

| 필드 | R 기준값 | Pyodide 결과 | LRE | Tier |
|------|----------|-------------|-----|------|
| t-statistic | 7.694689845787828 | 7.694689845787818 | 14.9 | tier2 |
| p-value | 2.2099e-08 | 2.2099e-08 | 13.6 | tier2 |
| Cohen's d | 2.809703467696 | 2.809703467696 | 15.0 | tier2 |
| mean1 | 45.266666666667 | 45.266666666667 | 15.0 | tier2 |
| mean2 | 39.826666666667 | 39.826666666667 | 15.0 | tier2 |
| n1 | 15 | 15 | 15.0 | exact |
| n2 | 15 | 15 | 15.0 | exact |

### LRE 분포 (Phase 1, 38개 필드)

| 범위 | 필드 수 | 비율 | 해당 필드 |
|------|---------|------|-----------|
| LRE = 15.0 (완벽) | 26 | 68% | mean, n, SS, df, etaSquared, omegaSquared 등 |
| LRE 14.0~14.9 | 7 | 18% | t/F-statistic, cohensD |
| LRE 13.0~13.9 | 5 | 13% | p-value (CDF 누적 계산 경로 차이) |
| LRE < 13.0 | 0 | 0% | — |

**최소 LRE: 13.3** (`two-way-anova.factor2.pValue`) — 소수점 13번째 자리 수준의 차이입니다.
현재 결과만 보면 이는 IEEE 754 double-precision 환경에서 R과 Python의 수치 라이브러리가 CDF 계산 경로에서 보일 수 있는 미세한 반올림 차이로 해석하는 편이 타당합니다. 다만 NIST 고난도 데이터셋을 아직 돌리지 않았으므로, 수치적 개선 여지가 완전히 없다고 단정하지는 않습니다.

## LRE 점수 해석 및 업계 비교

### LRE 척도

| LRE | 의미 |
|-----|------|
| 15 | 완벽 일치 (15자리, double 정밀도 상한) |
| 10+ | 우수 (전문 통계 소프트웨어 기대 수준) |
| 4~9 | 합격 (실무 사용 가능) |
| < 4 | 불합격 (유의수준 판단에 영향) |

### 업계 벤치마크 비교

NIST StRD는 통계 소프트웨어 정확도를 평가하는 국제 표준 벤치마크입니다.
아래 표는 **공개된 문헌**에서 수집한 각 소프트웨어의 LRE 실측치입니다.

#### ANOVA F-statistic (NIST StRD)

| 소프트웨어 | Lower 난이도 | Average 난이도 | Higher 난이도 | 출처 |
|-----------|-------------|---------------|--------------|------|
| **BioHub (Pyodide)** | **14.8** (Phase 1, R synthetic) | — (미측정) | — (미측정) | 본 보고서 |
| Stata 18 | 12.8~15.0 | 10.2~10.4 | 4.2~4.4 (원본) / 15.0 (보정) | stata.com/support/cert/nist/ |
| SPSS 12.0 | 12.6 | 8.5 | 2.7 | Keeling & Pavur 2007; Wikibooks |
| SAS 6.12 | Pass | **0** (실패) | **0** (실패) | McCullough 1999 |
| Excel 2007 | Pass | — | 불합격 | McCullough & Heiser 2008 |

#### 선형 회귀 계수 (NIST StRD)

| 소프트웨어 | Lower (Norris) | Higher (Longley) | 극한 (Filip) | 출처 |
|-----------|---------------|-----------------|-------------|------|
| **BioHub** | — (Phase 2) | — (미측정) | — | — |
| Stata 18 | 12.8 | 12.1 | — | stata.com/cert/nist |
| R | Good | 8+ | 거부 (특이행렬 감지) | R-devel 2006 |
| gretl (GMP) | 12+ | 12+ | 거부 (다중공선성 감지) | gretl.sourceforge.net |
| Excel 2010 | ~10 | 7.4 | 실패 | Keeling & Pavur 2011 |

#### 기술통계 표준편차 (NIST StRD)

| 소프트웨어 | Lower | Average (NumAcc3) | Higher (NumAcc4) | 출처 |
|-----------|-------|-------------------|-----------------|------|
| Stata 18 | 13.1~15.0 | 9.5 | **8.3** | stata.com/support/cert/nist/ |
| SPSS 12.0 | 15.0 | 9.5 | 8.3 | Wikibooks |
| SAS 6.12 | — | Stressed | Stressed | McCullough 1999 |
| Excel 97 | **실패** | — | — | McCullough & Wilson 1999 |

### BioHub Phase 1 위치 평가

> **BioHub의 Phase 1 평균 LRE 14.8은 공개된 Lower 난이도 결과의 상단 구간에 해당합니다. 다만 현재 값은 R synthetic 교차검증 결과이므로 NIST 인증 결과와 동급 비교로 단정하면 안 됩니다.**

단, 공정한 비교를 위해 다음을 명시합니다:

1. **난이도 맥락**: Phase 1은 표준 t-test/ANOVA 위주의 비교적 안정적인 케이스입니다. 공개 벤치마크의 Lower 난이도 구간과 성격은 유사하지만, 동일 데이터셋은 아닙니다.

2. **미측정 영역**: Average/Higher 난이도 (ill-conditioned 데이터, 극단 분산비)는 Phase 2~3에서 검증 예정입니다. SPSS/SAS가 이 영역에서 LRE 0~2.7으로 급락한 것처럼, BioHub도 이 영역에서 성능 저하 가능성이 있습니다.

3. **비교 기준의 차이**: 업계 벤치마크는 NIST 인증 데이터셋 기준이고, BioHub Phase 1은 R 교차검증 기준입니다. 따라서 현재 표는 정황적 위치 비교로만 읽어야 하며, Phase 1에서 NIST Layer 1 (`AtmWtAg`) 직접 검증은 아직 실행되지 않았습니다.

4. **LRE 14.8의 의미**: IEEE 754 double-precision의 유효 자릿수가 ~15.9자리라는 점을 감안하면, 현재 결과는 실무적으로 매우 높은 일치도입니다. 다만 더 어려운 데이터셋에서 같은 수준이 유지되는지는 아직 검증되지 않았습니다.

### 참고 문헌

1. McCullough BD, Wilson B (1999). "On the accuracy of statistical procedures in Microsoft Excel 97." *Computational Statistics & Data Analysis*, 31(1), 27-37.
2. McCullough BD (1999). "Assessing the reliability of statistical software: Part II." *The American Statistician*, 53(2), 149-159.
3. McCullough BD, Heiser DA (2008). "On the accuracy of statistical procedures in Microsoft Excel 2007." *CSDA*, 52(10), 4570-4578.
4. Keeling KB, Pavur RJ (2007). "A comparative study of the reliability of nine statistical software packages." *CSDA*, 51(8), 3811-3831.
5. Keeling KB, Pavur RJ (2011). "Statistical accuracy of spreadsheet software." *The American Statistician*, 65(4), 265-273.
6. Melard G (2014). "On the accuracy of statistical procedures in Microsoft Excel 2010." *Computational Statistics*, 29, 1095-1128.
7. Stata Corp. "NIST StRD Certification Results." https://www.stata.com/support/cert/nist/
8. gretl NIST benchmark results. https://gretl.sourceforge.net/nist/index.html
9. Wikibooks. "Numerical Comparison of Statistical Software." https://en.wikibooks.org/wiki/Statistics/Numerical_Methods/Numerical_Comparison_of_Statistical_Software

## Library Version Reference (재현용)

검증 재현을 위한 버전 고정 참조입니다. `/stable/` URL은 버전 변경 시 내용이 달라질 수 있으므로, 검증 시점의 버전을 명시합니다.

### Python (Pyodide 0.29.3)

| 라이브러리 | 버전 | 문서 |
|-----------|------|------|
| SciPy | 1.14.1 | [docs.scipy.org/doc/scipy-1.14.1](https://docs.scipy.org/doc/scipy-1.14.1/) |
| statsmodels | 0.14.1 | [statsmodels.org/v0.14.1](https://www.statsmodels.org/v0.14.1/) |
| NumPy | 1.26.4 | [numpy.org/doc/1.26](https://numpy.org/doc/1.26/) |

### R 4.5.3

| 패키지 | CRAN | 비고 |
|--------|------|------|
| stats | built-in | [R docs](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/) |
| car | [CRAN](https://cran.r-project.org/web/packages/car/index.html) | Type II ANOVA (`Anova`) |

### 메서드별 함수 매핑

| 메서드 | Python 함수 | R 함수 | 차이점 |
|--------|------------|--------|--------|
| `two-sample-t` | [`scipy.stats.ttest_ind(equal_var=True)`](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.ttest_ind.html) | [`stats::t.test(var.equal=TRUE)`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html) | 동일 알고리즘 |
| `welch-t` | [`scipy.stats.ttest_ind(equal_var=False)`](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.ttest_ind.html) | [`stats::t.test(var.equal=FALSE)`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html) | 동일 알고리즘 (Welch-Satterthwaite df) |
| `one-sample-t` | [`scipy.stats.ttest_1samp`](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.ttest_1samp.html) | [`stats::t.test`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html) | 동일 알고리즘 |
| `paired-t` | [`scipy.stats.ttest_rel`](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.ttest_rel.html) | [`stats::t.test(paired=TRUE)`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/t.test.html) | 동일 알고리즘 |
| `one-way-anova` | [`scipy.stats.f_oneway`](https://docs.scipy.org/doc/scipy-1.14.1/reference/generated/scipy.stats.f_oneway.html) | [`stats::aov`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/aov.html) / [`stats::anova`](https://stat.ethz.ch/R-manual/R-devel/library/stats/html/anova.html) | 동일 알고리즘 |
| `two-way-anova` | [`statsmodels.stats.anova.anova_lm`](https://www.statsmodels.org/v0.14.1/generated/statsmodels.stats.anova.anova_lm.html) (Type II) | [`car::Anova(type=II)`](https://cran.r-project.org/web/packages/car/index.html) | 동일 알고리즘 (Type II SS) |

## 검증 환경

- **Pyodide 0.29.3** (SciPy 1.14.1, statsmodels 0.14.1, scikit-learn 1.4.0)
- **R 4.5.3** (stats, car, MASS, survival, pwr, psych, ppcor, tseries, trend, drc, lme4, pROC)
- **Node.js v22.22.2**, Windows 11 x64
- **Worker 경로**: worker2-hypothesis.py (t-test), worker3-nonparametric-anova.py (ANOVA)

## 미완료 Phase

| Phase | 범위 | 메서드 수 | 상태 |
|-------|------|-----------|------|
| Phase 1 | T-test + ANOVA | 6 | **완료** |
| Phase 2 | 비모수 + 상관/회귀 | 20 | 대기 |
| Phase 3 | 카이제곱 + 다변량 + 생존/시계열 + 도구 | 24 | 대기 |
| Phase 4 | 엣지케이스 + 보고서 완성 | — | 대기 |

## 부록: 데이터셋 출처

| 메서드 | 데이터 출처 | 크기 |
|--------|------------|------|
| two-sample-t / welch-t | Synthetic (male/female weight) | 15+15 |
| one-sample-t | Synthetic (measurement data) | 10 |
| paired-t | Synthetic (before/after treatment) | 10 pairs |
| one-way-anova | Synthetic (3 treatment groups) | 3×10 |
| two-way-anova | R datasets::ToothGrowth | 60 |
