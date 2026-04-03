# 📊 통계 메서드 완전 가이드 (Complete Statistical Methods Guide)

> **최종 업데이트**: 2025-09-22
> **버전**: 4.0
> **구현 메서드**: 41개 (8개 카테고리)
> **검증 기준**: R/SPSS/Python 과학 표준

---

## 🎯 문서의 목적

이 문서는 Statistical Platform에 구현된 모든 통계 메서드에 대한 완전한 참조 가이드입니다.

### 누가 이 문서를 읽어야 하나요?
- **연구자**: 적절한 통계 방법 선택을 위해
- **개발자**: 메서드 통합 및 유지보수를 위해
- **데이터 분석가**: 결과 해석을 위해
- **QA 엔지니어**: 검증 및 테스트를 위해

---

## 📈 구현된 통계 메서드 목록 (41개)

### 1. 기초통계 (Descriptive Statistics) - 5개 메서드

| 메서드명 | 용도 | 필요 데이터 | 결과 해석 |
|---------|------|------------|-----------|
| `calculateDescriptiveStats` | 기술통계량 | 연속형 변수 1개 | 평균, 중앙값, 표준편차, 왜도, 첨도 등 |
| `normalityTest` | 정규성 검정 | 연속형 변수 1개 (n≥3) | Shapiro-Wilk, Anderson-Darling, D'Agostino |
| `homogeneityTest` | 등분산성 검정 | 2개 이상 그룹 | Levene, Bartlett, Fligner-Killeen |
| `outlierDetection` | 이상치 탐지 | 연속형 변수 1개 | IQR, Z-score, Grubbs test |
| `powerAnalysis` | 검정력 분석 | 효과크기, 표본수 | 사전/사후 검정력 계산 |

### 2. 가설검정 (Hypothesis Testing) - 8개 메서드

| 메서드명 | 용도 | 필요 데이터 | 결과 해석 |
|---------|------|------------|-----------|
| `oneSampleTTest` | 일표본 t-검정 | 표본 1개, 모집단 평균 | 표본평균 ≠ 모집단평균 검정 |
| `twoSampleTTest` | 독립표본 t-검정 | 독립된 2개 그룹 | 두 그룹 평균 차이 검정 |
| `pairedTTest` | 대응표본 t-검정 | 짝지어진 2개 측정값 | 전후 차이 검정 |
| `welchTTest` | Welch t-검정 | 독립된 2개 그룹 | 등분산 가정 불필요 |
| `correlationAnalysis` | 상관분석 | 연속형 변수 2개 | Pearson, Spearman, Kendall |
| `partialCorrelation` | 편상관분석 | 연속형 변수 3개 이상 | 제3변수 통제 후 상관 |
| `effectSize` | 효과크기 | 검정 결과 | Cohen's d, eta², omega² |
| `oneSampleProportionTest` | 일표본 비율검정 | 이진 데이터 | Wilson Score Interval |

### 3. 분산분석 (ANOVA) - 8개 메서드

| 메서드명 | 용도 | 필요 데이터 | 결과 해석 |
|---------|------|------------|-----------|
| `oneWayANOVA` | 일원분산분석 | 3개 이상 독립 그룹 | p≤0.05: 그룹 간 차이 존재 |
| `twoWayANOVA` | 이원분산분석 | 2개 요인 | 주효과 및 상호작용 |
| `tukeyHSD` | Tukey HSD | ANOVA 사후 | 모든 쌍별 비교 |
| `bonferroniPostHoc` | Bonferroni 교정 | ANOVA 사후 | 보수적 다중비교 교정 |
| `gamesHowellPostHoc` | Games-Howell | ANOVA 사후 | 등분산 가정 불필요 |
| `repeatedMeasuresANOVA` | 반복측정 ANOVA | 반복측정 데이터 | 시간에 따른 변화 |
| `manova` | 다변량 ANOVA | 다중 종속변수 | Wilks' Lambda |
| `mixedEffectsModel` | 혼합효과모형 | 계층적 데이터 | 고정효과 + 무선효과 |

### 4. 회귀분석 (Regression) - 4개 메서드

| 메서드명 | 용도 | 필요 데이터 | 주요 결과 |
|---------|------|------------|-----------|
| `simpleLinearRegression` | 단순선형회귀 | X 1개, Y 1개 | 회귀계수, R², 잔차분석 |
| `multipleRegression` | 다중회귀분석 | X 여러개, Y 1개 | VIF, 부분상관 |
| `logisticRegression` | 로지스틱회귀 | X 여러개, Y 이진 | 승산비, AUC |
| `polynomialRegression` | 다항회귀분석 | 비선형 관계 | 곡선 적합 |

### 5. 비모수검정 (Nonparametric) - 6개 메서드

| 메서드명 | 용도 | 대응 모수검정 | 특징 |
|---------|------|--------------|------|
| `mannWhitneyU` | 2개 독립 그룹 비교 | 독립 t-검정 | 순위 기반 |
| `wilcoxonSignedRank` | 짝지어진 데이터 | 대응 t-검정 | 부호순위 사용 |
| `kruskalWallis` | 3개 이상 그룹 | 일원 ANOVA | 순위 기반 |
| `dunnTest` | K-W 사후검정 | Tukey HSD | 비모수 사후검정 |
| `chiSquareTest` | 범주형 변수 독립성 | - | 기대빈도 ≥5 |
| `friedman` | 반복측정 데이터 | RM-ANOVA | 순위 기반 |

### 6. 시계열분석 (Time Series) - 4개 메서드

| 메서드명 | 용도 | 필요 데이터 | 주요 결과 |
|---------|------|------------|-----------|
| `timeSeriesDecomposition` | 시계열분해 | 시계열 데이터 | 추세, 계절성, 잔차 |
| `arimaForecast` | ARIMA 예측 | 비계절 시계열 | p, d, q 파라미터 |
| `sarimaForecast` | SARIMA 예측 | 계절 시계열 | 계절성 고려 |
| `varModel` | VAR 모형 | 다변량 시계열 | 변수 간 영향 분석 |

### 7. 생존분석 (Survival Analysis) - 2개 메서드

| 메서드명 | 용도 | 필요 데이터 | 주요 결과 |
|---------|------|------------|-----------|
| `kaplanMeierSurvival` | Kaplan-Meier | 생존시간, 사건 | 생존곡선, 중앙생존시간 |
| `coxRegression` | Cox 회귀모형 | 위험요인, 생존 | 위험비, 생존확률 |

### 8. 다변량/기타 (Multivariate/Others) - 4개 메서드

| 메서드명 | 용도 | 필요 데이터 | 주요 결과 |
|---------|------|------------|-----------|
| `principalComponentAnalysis` | 주성분분석 | 다변량 데이터 | 주성분, 설명분산 |
| `kMeansClustering` | K-means 군집화 | 다변량 데이터 | 군집 할당 |
| `hierarchicalClustering` | 계층적 군집화 | 다변량 데이터 | 덴드로그램 |
| `factorAnalysis` | 요인분석 | 다변량 데이터 | 요인 적재량 |

---

## 🎯 메서드 선택 가이드

### 연속형 변수 1개
- **정규성 확인**: `normalityTest`
- **기술통계**: `calculateDescriptiveStats`
- **이상치 탐지**: `outlierDetection`

### 연속형 변수 2개 비교
- **정규분포**: `twoSampleTTest` (독립) 또는 `pairedTTest` (대응)
- **비정규분포**: `mannWhitneyU` (독립) 또는 `wilcoxonSignedRank` (대응)
- **등분산 가정 위반**: `welchTTest`

### 3개 이상 그룹 비교
- **정규분포 + 등분산**: `oneWayANOVA` → `tukeyHSD`
- **정규분포 + 이분산**: `oneWayANOVA` → `gamesHowellPostHoc`
- **비정규분포**: `kruskalWallis` → `dunnTest`

### 관계 분석
- **선형관계**: `correlationAnalysis`, `simpleLinearRegression`
- **다중 예측변수**: `multipleRegression`
- **이진 결과**: `logisticRegression`
- **범주형 변수**: `chiSquareTest`
- **비선형 관계**: `polynomialRegression`

### 시계열 데이터
- **분해**: `timeSeriesDecomposition`
- **예측 (비계절)**: `arimaForecast`
- **예측 (계절)**: `sarimaForecast`
- **다변량**: `varModel`

### 생존 데이터
- **생존곡선**: `kaplanMeierSurvival`
- **위험요인**: `coxRegression`

### 차원 축소/그룹화
- **차원 축소**: `principalComponentAnalysis`
- **군집분석**: `kMeansClustering`, `hierarchicalClustering`
- **잠재 요인**: `factorAnalysis`

---

## 📊 결과 해석 가이드

### p-value 해석
- p ≤ 0.001: 매우 강한 증거 (***)
- p ≤ 0.01: 강한 증거 (**)
- p ≤ 0.05: 충분한 증거 (*)
- p > 0.05: 증거 부족 (ns)

### 효과크기 해석
- **Cohen's d**: 0.2(작음), 0.5(중간), 0.8(큼)
- **η²**: 0.01(작음), 0.06(중간), 0.14(큼)
- **Cohen's h (비율)**: 0.2(작음), 0.5(중간), 0.8(큼)

### 상관계수 해석
- |r| < 0.3: 약한 상관
- 0.3 ≤ |r| < 0.7: 중간 상관
- |r| ≥ 0.7: 강한 상관

### 모델 적합도
- **R²**: 0~1, 높을수록 좋음
- **AUC**: 0.5(무작위), 0.7(적절), 0.9(우수)
- **VIF**: < 5(양호), 5-10(주의), > 10(다중공선성)

---

## 🔍 품질 보증

### 검증 완료 메서드 (✅)
모든 41개 메서드는 다음 기준으로 검증되었습니다:
1. **R 출력과 비교**: 소수점 4자리까지 일치
2. **SPSS 출력과 비교**: 통계량 및 p-value 일치
3. **Python(scipy/statsmodels)와 비교**: 완전 일치

### 사용된 Python 라이브러리
- **scipy.stats**: 기본 통계 검정
- **statsmodels**: ANOVA, 회귀분석, 시계열
- **pingouin**: 효과크기, 검정력 분석
- **scikit-posthocs**: 사후검정
- **lifelines**: 생존분석
- **scikit-learn**: PCA, 군집분석

### 테스트 데이터셋
- 각 메서드별 전용 테스트 데이터 제공
- `/test-data/` 폴더에 41개 CSV 파일
- 실제 연구 시나리오 기반 데이터

### 지속적 검증
- 매 릴리즈마다 자동화된 검증 테스트 실행
- 결과는 `__tests__/statistics/` 폴더 참조

---

## 🚀 구현 상태

### 파일 구조
```
lib/services/pyodide/
├── index.ts          # 메인 서비스 (400줄)
├── descriptive.ts    # 기초통계 (200줄)
├── hypothesis.ts     # 가설검정 (350줄)
├── anova.ts          # 분산분석 (300줄)
├── regression.ts     # 회귀분석 (200줄)
├── nonparametric.ts  # 비모수검정 (250줄)
├── advanced.ts       # 시계열/생존/다변량 (990줄)
└── utils.ts          # 유틸리티 함수

lib/statistics/
├── ui-config.ts      # UI 설정 (8개 카테고리, 41개 메서드)
└── statistical-calculator.ts # 브릿지 함수
```

### 라우팅 구조
```
/analysis/descriptive/[method]    # 기초통계 5개
/analysis/hypothesis/[method]     # 가설검정 8개
/analysis/anova/[method]          # 분산분석 8개
/analysis/regression/[method]     # 회귀분석 4개
/analysis/nonparametric/[method]  # 비모수검정 6개
/analysis/timeseries/[method]     # 시계열분석 4개
/analysis/survival/[method]       # 생존분석 2개
/analysis/multivariate/[method]   # 다변량/기타 4개
```

---

*이 문서는 지속적으로 업데이트됩니다. 최신 버전은 GitHub 저장소를 참조하세요.*
*문서 작성: Statistical Platform Development Team*
*Last Updated: 2025-09-22*