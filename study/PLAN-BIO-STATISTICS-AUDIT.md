# 생물학 연구자용 추가 통계 분석 — 검증 보고서

**작성일**: 2026-02-13
**목적**: Phase 15-1 구현 전, 후보 분석들의 최신 사용 현황 검증 + 불필요 항목 제거

---

## 검증 기준

| 기준 | 설명 |
|------|------|
| **최근 사용 빈도** | 2023-2025 논문에서 실제로 많이 인용/사용되는가? |
| **Python 구현 가능성** | scipy/numpy/statsmodels/scikit-learn으로 Pyodide에서 구현 가능한가? |
| **기존 도구와 차별성** | 이미 구현된 51개 메서드와 겹치지 않는가? |
| **타겟 사용자 관련성** | 수산과학/생태학/생물학 연구자가 실제로 필요로 하는가? |
| **정통성** | 검증된 통계 방법론인가? (유행성 기법 제외) |

---

## 최종 판정 요약

### 확정 (구현 대상) — 12개

| # | 분석명 | 영문 | 판정 근거 | Pyodide 구현 |
|---|--------|------|----------|-------------|
| 1 | 생물다양성 지수 | Shannon, Simpson, Margalef, Pielou | 생태학 논문 거의 필수. 2024 microbiome 연구에서도 표준 | numpy 수식 (단순) |
| 2 | 종 희박화 곡선 | Rarefaction Curve | 2024 mSphere: "현재 최선의 방법" 재확인 | scipy.special.comb |
| 3 | 베타 다양성 | Bray-Curtis, Jaccard | PERMANOVA/NMDS 전제 조건, 군집생태학 필수 | scipy.spatial.distance |
| 4 | NMDS | Non-metric MDS | 2025 논문에서도 표준 ordination. R vegan 급 필요 | scikit-learn MDS(metric=False) |
| 5 | PERMANOVA | Permutational MANOVA | 군집 구조 차이 검정 표준. 2025 활발 사용 | numpy 순수 구현 가능 |
| 6 | von Bertalanffy 성장 모델 | VBGF (L∞, K, t₀) | 수산학 핵심. NOAA 평가에서도 여전히 기본 모델 | scipy.optimize.curve_fit |
| 7 | 체장-체중 관계식 | W = aL^b | 수산학 기초 분석. 모든 어류 연구에서 사용 | scipy.optimize + log변환 |
| 8 | 메타분석 | Forest plot, I², Q-test | 2024-2025 급증 추세. 생태학/의학 모두 필수 | statsmodels combine_effects |
| 9 | ROC 곡선 / AUC | ROC-AUC Analysis | SDM(종분포모델) + 진단 검정 표준. 2024-2025 활발 | scikit-learn roc_curve |
| 10 | ICC | Intraclass Correlation | 2025-2026 생태학 repeatability 연구 급증 (Royal Society) | pingouin 수식 직접 구현 |
| 11 | Mantel 검정 | Mantel Test | 거리행렬 상관. 유전-지리 관계 분석 표준 | numpy/scipy 순수 구현 |
| 12 | Hardy-Weinberg 검정 | HW Equilibrium Test | 집단유전학 QC 기본. 2024 genomics에서도 필수 | scipy.stats.chisquare |

### 조건부 확정 — 3개 (수요 확인 후)

| # | 분석명 | 영문 | 판정 | 근거 |
|---|--------|------|------|------|
| 13 | CCA / RDA | Constrained Ordination | **조건부** | 여전히 많이 쓰이나, chi-squared distance 비판 있음. db-RDA가 더 현대적. 구현 복잡도 높음 |
| 14 | SEM / 경로분석 | Structural Equation Modeling | **조건부** | 2024-2025 생태학 사용 증가 추세. 그러나 semopy Pyodide 미지원, 순수 구현 매우 복잡 |
| 15 | Fst (집단 분화) | F-statistics | **조건부** | 집단유전학 핵심이나, 타겟 사용자(수산과학) 중 유전학 비중 불확실 |

### 제외 (구현 불필요) — 6개

| # | 분석명 | 판정 | 제외 근거 |
|---|--------|------|----------|
| ~~16~~ | SIMPER | **제외** | Warton et al.(2012) 이후 심각한 방법론적 비판. 그룹간 차이가 아닌 종 변동성을 측정하는 결함. 결과 해석이 매우 어렵고 오해가 빈번. 최근 논문에서 사용 감소 추세 |
| ~~17~~ | 지표종 분석 (IndVal) | **제외** | 유효한 방법이나 이 플랫폼 타겟(수산과학)과 거리 있음. 대규모 군집 데이터 필요. 우선순위 낮음 |
| ~~18~~ | Bland-Altman | **제외** | 2024 PMC: "적절한 추론적 통계 지원 부족" 비판. 3단계 대안법 제안됨. 의학 중심이며 생태학 사용 드묾 |
| ~~19~~ | Catch Curve | **제외** | 가정(일정 가입량, 일정 사망률)이 현실적이지 않음. 현대 자원평가는 통합 모델(state-space) 사용. 단독 분석 도구로 가치 낮음 |
| ~~20~~ | CPUE 표준화 | **제외** | 본질적으로 GLM 분석 → 이미 구현된 회귀분석으로 충분. 별도 모듈 불필요 |
| ~~21~~ | Moran's I | **제외** | 유효하지만 공간 가중행렬(shapefile) 입력 필요 → 현재 CSV 기반 플랫폼과 부합하지 않음. 지도 시각화(Leaflet) 없이 의미 제한적. Phase 15-2(종 정보 허브) 이후 재검토 |

---

## 확정 분석 상세

### Phase A: 생태/다양성 (군집생태학 핵심 6개)

이 6개는 생태학 논문의 거의 모든 군집 분석에서 세트로 사용됨.
전형적 워크플로우: **다양성 지수 → 희박화 → 베타 다양성 → NMDS 시각화 → PERMANOVA 검정**

#### 1. 생물다양성 지수 (Alpha Diversity Indices)

- **지수**: Shannon (H'), Simpson (1-D), Margalef, Pielou Evenness (J')
- **사용 맥락**: 한 지점의 종 다양성 정량화
- **최근 현황**: 2024 microbiome, 2025 수중생태계 논문 필수
- **구현**: numpy 단순 수식 (5-10줄/지수)
- **Python 참고**: [scikit-bio alpha diversity](https://scikit.bio/docs/dev/generated/skbio.diversity.alpha.html)

```python
# Shannon: H' = -Σ(pi * ln(pi))
# Simpson: 1 - Σ(pi²)
# Margalef: (S-1) / ln(N)
# Pielou: H' / ln(S)
```

#### 2. 종 희박화 곡선 (Rarefaction Curve)

- **사용 맥락**: 샘플링 충분성 평가 (곡선이 평탄해지면 충분)
- **최근 현황**: 2024 mSphere — "불균등 시퀀싱 보정에 현재 최선의 접근법"
- **구현**: scipy.special.comb 기반 Hurlbert 공식
- **참고**: [Rarefaction is best approach (2024)](https://journals.asm.org/doi/10.1128/msphere.00354-23)

#### 3. 베타 다양성 거리행렬 (Beta Diversity)

- **지표**: Bray-Curtis, Jaccard, Sørensen
- **사용 맥락**: 지점간 종 구성 차이 (PERMANOVA/NMDS 입력)
- **구현**: scipy.spatial.distance.pdist + squareform

#### 4. NMDS (Non-metric Multidimensional Scaling)

- **사용 맥락**: 군집 구조 시각화 (2D/3D 좌표계)
- **최근 현황**: 2025 Neotropical 어류 다양성 논문 등 활발
- **장점**: 어떤 거리 측정이든 사용 가능, 비선형 관계 포착
- **구현**: scikit-learn `MDS(dissimilarity='precomputed', metric=False)`
- **stress 값**: < 0.2 적합, < 0.1 우수

#### 5. PERMANOVA

- **사용 맥락**: 그룹간 군집 구조 유의차 검정 (ANOVA의 군집 버전)
- **최근 현황**: 2024-2025 microbiome + 생태학 표준 검정
- **구현**: numpy 순수 구현 (F-pseudo 통계량 + 순열 검정)
- **참고**: [PyPerMANOVA (GitHub)](https://github.com/ivanp1994/PyPerMANOVA)

```
H₀: 그룹간 centroid가 동일
검정: 거리행렬 기반 F-pseudo → 순열(999회)로 p-value
```

#### 6. Mantel 검정 (Mantel Test)

- **사용 맥락**: 두 거리행렬 간 상관 (유전 거리 vs 지리 거리 = IBD)
- **최근 현황**: 집단유전학, 군집생태학에서 꾸준히 사용
- **구현**: numpy + scipy (Pearson/Spearman + 순열)
- **참고**: [mantel (pure Python)](https://github.com/jwcarr/mantel)

---

### Phase B: 수산과학 특화 (2개)

#### 7. von Bertalanffy 성장 모델 (VBGF)

- **수식**: L(t) = L∞ × (1 - e^(-K(t-t₀)))
- **사용 맥락**: 어류 성장 파라미터 추정 (L∞, K, t₀)
- **최근 현황**: NOAA 자원평가에서 여전히 기본 모델. 2025년에도 표준
- **확장**: Gompertz, Logistic 모델 + AIC 비교 (multi-model approach)
- **구현**: scipy.optimize.curve_fit (비선형 최소제곱)
- **참고**: [Trends in Growth Modeling in Fisheries](https://www.mdpi.com/2410-3888/6/1/1)

#### 8. 체장-체중 관계식 (Length-Weight Relationship)

- **수식**: W = a × L^b (또는 log W = log a + b × log L)
- **사용 맥락**: 어류 비만도(condition factor), 성장 패턴 분석
- **최근 현황**: 수산학 기초 데이터. FishBase 파라미터 비교에 필수
- **구현**: scipy.stats.linregress (log 변환) + scipy.optimize.curve_fit
- **추가 출력**: 비만도 지수 (K = W/L³ × 100)

---

### Phase C: 범용 생물학 (4개)

#### 9. 메타분석 (Meta-Analysis)

- **사용 맥락**: 여러 연구 결과 종합 (효과 크기 + 이질성 검정)
- **최근 현황**: 2024-2025 급증. "생태학 메타분석이 부적절한 결과를 낳는 경우가 많다"는 비판 논문(2025 Ecology)도 있을 정도로 남용될 만큼 대중화
- **핵심 출력**: Forest plot, 이질성 (I², Q-test, τ²), 출판 편향 (Funnel plot, Egger's test)
- **구현**: statsmodels.stats.meta_analysis.combine_effects
- **참고**: [statsmodels meta-analysis](https://www.statsmodels.org/dev/examples/notebooks/generated/metaanalysis1.html)

#### 10. ROC 곡선 / AUC

- **사용 맥락**: 이항 분류 성능 평가, 종분포모델(SDM) 정확도
- **최근 현황**: 2024-2025 SDM 연구 표준 평가 지표
- **핵심 출력**: ROC 곡선, AUC 값, 최적 cutoff (Youden's J)
- **구현**: scikit-learn `roc_curve()`, `roc_auc_score()`
- **보완**: 이미 로지스틱 회귀 있음 → ROC는 결과 평가 도구로 자연스럽게 연결

#### 11. ICC (Intraclass Correlation Coefficient)

- **사용 맥락**: 측정 반복성(repeatability), 평가자간 일치도
- **최근 현황**: 2025 Animal Behaviour, 2026 Royal Society Interface 논문. 생태학 repeatability 연구 활발
- **핵심 출력**: ICC(1,1)~ICC(3,k) 6가지 유형, F-test, 95% CI
- **구현**: numpy + scipy (ANOVA 기반 분산 분해)
- **참고**: [pingouin ICC 수식](https://pingouin-stats.org/build/html/generated/pingouin.intraclass_corr.html)

#### 12. Hardy-Weinberg 평형 검정

- **사용 맥락**: 유전자형 빈도 QC, 집단 구조 탐색
- **최근 현황**: 2024 genomics — 여전히 genotyping QC 첫 단계
- **핵심 출력**: 관찰/기대 유전자형 빈도, χ² 검정, exact test
- **구현**: scipy.stats.chisquare (또는 exact test 직접 구현)
- **참고**: [HWE in Meta-Analysis (PMC 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11480592/)

---

## 제외 항목 상세 근거

### SIMPER — 방법론적 결함

> "SIMPER very badly confounds the mean between-group differences and within-group variation, and singles out variable species instead of distinctive species" — Warton et al. (2012)

- 그룹간 차이가 아닌 **종 변동성**을 측정하는 근본적 결함
- 그룹이 동일해도 높은 기여도 수치가 나옴
- 결과 해석이 빈번하게 오해됨 (출판물에서도)
- **대안**: PERMANOVA + 지표종 분석 조합이 더 적절

### Bland-Altman — 추론 통계 부재

> "The widely cited Bland-Altman plot method lacks suitable inferential statistical support" — PMC 2024

- 시각적 방법이지 통계 검정이 아님
- 임상 허용 한계(tolerance)의 사전 지정이 필요하나 주관적
- 2024년 3단계 대안법(정확성→정밀성→일치도) 제안됨
- 생태학/수산학에서 거의 사용되지 않음 (의학 특화)

### Catch Curve — 비현실적 가정

- **가정**: 일정한 가입량(recruitment) + 일정한 사망률 → 현실에서 거의 불가능
- 현대 자원평가: 통합 모델(state-space), 연령구조 모델 사용
- 단순 회귀로 Z(총사망률) 추정 → 이미 있는 회귀분석으로 충분

### CPUE 표준화 — 기존 기능과 중복

- 본질: GLM(Generalized Linear Model)으로 CPUE ~ Year + Area + Season + ...
- 이미 구현된 포아송/음이항 회귀와 동일한 기법
- 별도 모듈로 분리할 이유 없음

### Moran's I — 플랫폼 제약

- 공간 가중행렬(W) 생성에 shapefile/좌표 데이터 필요
- 현재 CSV 기반 입력 체계와 부적합
- 지도 시각화(Leaflet) 없이 결과 해석 제한적
- Phase 15-2 (GBIF 연동 + 분포 지도) 이후 재검토 적절

### 지표종 분석 (IndVal) — 타겟 불일치

- 유효한 방법이나, 대규모 군집 데이터(수십~수백 종) 필요
- 수산과학 연구 특성상 소수 종 대상이 대부분
- 구현 복잡도 대비 사용 빈도 낮음

---

## 페이지 구조 (5페이지)

**아키텍처 결정 (2026-02-13)**: Bio-Tools는 Smart Flow와 별도로 `/bio-tools/`에 5페이지로 구성.

| # | 페이지명 | 경로 | 포함 분석 | Worker |
|---|---------|------|----------|--------|
| 1 | 생물다양성 분석 | `/bio-tools/biodiversity` | Alpha Diversity (Shannon, Simpson, Margalef, Pielou) + Rarefaction + Beta Diversity (Bray-Curtis, Jaccard) | Worker 5 |
| 2 | 군집 구조 분석 | `/bio-tools/community` | NMDS + PERMANOVA + Mantel Test | Worker 5 |
| 3 | 수산 성장 분석 | `/bio-tools/growth` | von Bertalanffy + Gompertz + Logistic (AIC 비교) + 체장-체중 관계식 | Worker 6 |
| 4 | 메타분석 | `/bio-tools/meta-analysis` | Forest plot + 이질성 (I², Q-test) + Funnel plot + Egger's test | Worker 6 |
| 5 | 생물학 검정 | `/bio-tools/bio-tests` | ROC/AUC + ICC (6 types) + Hardy-Weinberg 검정 | Worker 6 |

**입력 형식**:
- 페이지 1-2: 종 × 지점 행렬 (CSV) + 그룹 변수
- 페이지 3: 연령-체장 또는 체장-체중 쌍 데이터
- 페이지 4: 효과크기 + SE/CI 테이블
- 페이지 5: 분류 결과 / 측정 반복 / 유전자형 빈도 데이터

---

## 구현 우선순위 & 일정

### Phase A: 생태/다양성 핵심 세트 (1주)

가장 시너지가 큰 그룹. 6개가 하나의 워크플로우를 구성:

```
데이터 입력 (종 × 지점 행렬)
    ├→ Alpha Diversity (Shannon, Simpson, ...)
    ├→ Rarefaction Curve
    ├→ Beta Diversity (Bray-Curtis matrix)
    │    ├→ NMDS 시각화
    │    ├→ PERMANOVA 검정
    │    └→ Mantel Test (환경 거리와 비교)
```

| 분석 | 예상 시간 | Worker |
|------|----------|--------|
| 다양성 지수 4종 | 1일 | Worker 1 (descriptive 확장) |
| Rarefaction | 0.5일 | Worker 1 |
| Beta Diversity | 0.5일 | Worker 1 |
| NMDS | 1일 | Worker 4 (scikit-learn) |
| PERMANOVA | 1일 | Worker 3 (nonparametric 확장) |
| Mantel Test | 0.5일 | Worker 3 |
| **소계** | **4.5일** | |

### Phase B: 수산과학 (0.5주)

| 분석 | 예상 시간 | Worker |
|------|----------|--------|
| VBGF + Gompertz + Logistic (AIC 비교) | 1.5일 | Worker 4 |
| 체장-체중 관계식 + 비만도 | 0.5일 | Worker 4 |
| **소계** | **2일** | |

### Phase C: 범용 (1주)

| 분석 | 예상 시간 | Worker |
|------|----------|--------|
| 메타분석 (Forest/Funnel plot) | 2일 | Worker 4 (statsmodels) |
| ROC/AUC | 1일 | Worker 4 (scikit-learn) |
| ICC (6 types) | 1일 | Worker 1 |
| Hardy-Weinberg | 0.5일 | Worker 2 |
| **소계** | **4.5일** | |

### 총합: 약 11일 (2.5주)

Phase A → B → C 순서 권장 (시너지 + 난이도 순)

---

## 기술 참고

### Pyodide 호환성 — 2026-02-13 실측 확인

**Pyodide 버전**: 0.29.3 stable / 0.30.0.dev0

#### Pyodide 내장 패키지 (loadPackage로 즉시 사용)

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| numpy | 2.2.5 | 수식 계산, 행렬 연산 |
| scipy | 1.14.1 | 최적화, 거리 계산, 통계 검정 |
| statsmodels | 0.14.4 | 메타분석 combine_effects |
| scikit-learn | 1.7.0 | MDS, ROC, clustering |
| pandas | 2.3.3 | 데이터 전처리 |
| matplotlib | 3.8.4 | 차트 (Rarefaction, Forest plot 등) |
| networkx | 3.4.2 | 네트워크 분석 |
| autograd | 1.7.0 | 자동 미분 |
| shapely | 2.0.7 | 공간 기하 (향후 Moran's I 필요 시) |
| geopandas | 1.1.1 | 공간 데이터 (향후 Moran's I 필요 시) |

**→ 확정 12개 분석 모두 내장 패키지만으로 구현 가능. 외부 설치 불필요.**

#### micropip으로 PyPI에서 설치 가능 (pure Python wheel 확인)

| 라이브러리 | 버전 | wheel | 의존성 문제 | 사용 가치 |
|-----------|------|:-----:|-----------|----------|
| **pingouin** | 0.5.5 | `py3-none-any` ✅ | seaborn(pure) + pandas-flavor(pure) → **설치 가능** | ICC 6종, 효과크기, mixed ANOVA |
| **lifelines** | 0.30.1 | `py3-none-any` ✅ | autograd(내장) + autograd-gamma(**sdist only** ❌) → **불확실** | Kaplan-Meier 확장 |
| **PythonMeta** | 1.26 | `py3-none-any` ✅ | matplotlib + statsmodels (내장) → **설치 가능** | 메타분석 (단, statsmodels로 충분) |
| **libpysal** | 4.14.1 | `py3-none-any` ✅ | geopandas(내장) + shapely(내장) → **설치 가능** | 공간 가중행렬 (Moran's I 전제) |
| **esda** | 2.8.1 | `py3-none-any` ✅ | libpysal + shapely(내장) → **설치 가능** | Moran's I (Phase 15-2 이후) |

#### Pyodide 미지원 (C extension 필수)

| 라이브러리 | 이유 | 대안 |
|-----------|------|------|
| **scikit-bio** 0.7.2 | C extension (cp310+) 플랫폼 빌드만 | 수식 직접 구현 (alpha/beta diversity) |
| **semopy** 2.3.11 | wheel 없음 (sdist only) | SEM → Phase 보류 |
| **autograd-gamma** 0.5.0 | sdist only (wheel 미제공) | lifelines 의존성 문제 발생 |

#### 결론: 구현 전략

| 전략 | 대상 분석 | 근거 |
|------|----------|------|
| **내장 패키지로 직접 구현** | 다양성 지수, Rarefaction, 베타 다양성, NMDS, PERMANOVA, Mantel, VBGF, 체장-체중, 메타분석, ROC/AUC, ICC, HW 검정 | **가장 안정적**. 외부 의존성 0 |
| **pingouin micropip 설치** | ICC 검증용 참고 (실제 구현은 직접) | 설치 가능하나 Worker에서 micropip 사용은 복잡도 증가 |
| **직접 구현 불가 → 보류** | SEM, 고급 공간 분석 | semopy 미지원, 구현 난이도 과다 |

### 참고 소스

- [scikit-bio (Nature Methods 2025)](https://www.nature.com/articles/s41592-025-02981-z) — alpha/beta diversity 수식 참고
- [PyPerMANOVA](https://github.com/ivanp1994/PyPerMANOVA) — PERMANOVA 순수 구현 참고
- [mantel (pure Python)](https://github.com/jwcarr/mantel) — Mantel test 참고
- [statsmodels meta-analysis](https://www.statsmodels.org/dev/examples/notebooks/generated/metaanalysis1.html)
- [Rarefaction best approach (2024)](https://journals.asm.org/doi/10.1128/msphere.00354-23)
- [Trends in Growth Modeling (Fisheries)](https://www.mdpi.com/2410-3888/6/1/1)
- [SEM in wildlife ecology (2025)](https://besjournals.onlinelibrary.wiley.com/doi/10.1111/1365-2664.70189)
- [ICC repeatability (Royal Society 2026)](https://royalsocietypublishing.org/rsif/article/23/234/20250545/479766/)
- [HWE in genomics (PMC 2024)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11480592/)
- [Ecological meta-analyses criticism (2025)](https://doi.org/10.1002/ecy.70269)