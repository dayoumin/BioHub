# SPSS 표준 데이터 형태 매트릭스

## 🎯 목적
49개 통계 방법의 SPSS 표준 데이터 형태를 정의하고, 현재 구현 상태를 검증합니다.

---

## 📊 SPSS 데이터 형태 분류

### **Type A: Wide Format (반복측정/대응)**
- **정의**: 각 행 = 피험자, 각 열 = 측정 시점/조건
- **SPSS 메뉴**: Analyze > General Linear Model > Repeated Measures

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Repeated Measures ANOVA** | Subject + Time1~N | Subject \| Time1 \| Time2 \| Time3 | ✅ Wide |
| **Paired t-test** | Before + After | ID \| Before \| After | ✅ Wide |
| **Friedman Test** | Subject + Cond1~N | Subject \| Cond1 \| Cond2 \| Cond3 | ✅ Wide |
| **Wilcoxon Signed-Rank** | Before + After | ID \| Pre \| Post | ✅ Wide |
| **Sign Test** | Before + After | ID \| Before \| After | ✅ Wide |
| **Cochran's Q Test** | Item1~ItemN (Binary) | ID \| Item1 \| Item2 \| Item3 | ✅ Wide |
| **McNemar Test** | Before + After (Binary) | ID \| Before \| After | ✅ Wide |

### **Type B: Long Format (그룹 비교)**
- **정의**: 각 행 = 관측값, 그룹 변수가 별도 컬럼
- **SPSS 메뉴**: Analyze > Compare Means / Nonparametric Tests

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Independent t-test** | Group + Value | Group(1/2) \| Score | 🔧 확인 필요 |
| **One-Way ANOVA** | Group + Value | Group \| Score | 🔧 확인 필요 |
| **Two-Way ANOVA** | Factor1 + Factor2 + Value | Factor1 \| Factor2 \| Score | ✅ Long |
| **Three-Way ANOVA** | F1 + F2 + F3 + Value | F1 \| F2 \| F3 \| Score | ✅ Long |
| **ANCOVA** | Group + Covariate + DV | Group \| Covariate \| DV | 🔧 확인 필요 |
| **MANOVA** | Group + DV1~DVn | Group \| DV1 \| DV2 \| DV3 | 🔧 확인 필요 |
| **Mann-Whitney U** | Group + Value | Group(1/2) \| Score | 🔧 확인 필요 |
| **Kruskal-Wallis** | Group + Value | Group \| Score | 🔧 확인 필요 |
| **Mood's Median** | Group + Value | Group \| Score | 🔧 확인 필요 |

### **Type C: 상관/회귀 (변수 간 관계)**
- **정의**: 각 행 = 케이스, 각 변수가 컬럼
- **SPSS 메뉴**: Analyze > Regression / Correlate

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Correlation** | Var1 + Var2 | Height \| Weight | 🔧 확인 필요 |
| **Partial Correlation** | Var1 + Var2 + Control | X \| Y \| Control | 🔧 확인 필요 |
| **Linear Regression** | X + Y | X \| Y | 🔧 확인 필요 |
| **Multiple Regression** | X1~Xn + Y | X1 \| X2 \| X3 \| Y | 🔧 확인 필요 |
| **Logistic Regression** | X1~Xn + Y(Binary) | X1 \| X2 \| Y(0/1) | 🔧 확인 필요 |
| **Ordinal Regression** | X1~Xn + Y(Ordinal) | X1 \| X2 \| Y(1/2/3) | 🔧 확인 필요 |
| **Poisson Regression** | X1~Xn + Y(Count) | X1 \| X2 \| Count | 🔧 확인 필요 |
| **Cox Regression** | Time + Event + Covariates | Time \| Event(0/1) \| X1 \| X2 | 🔧 확인 필요 |
| **Stepwise Regression** | X1~Xn + Y | X1 \| X2 \| X3 \| Y | 🔧 확인 필요 |

### **Type D: 범주형 데이터 (교차표)**
- **정의**: 각 행 = 관측값, 범주 변수들이 컬럼
- **SPSS 메뉴**: Analyze > Descriptive Statistics > Crosstabs

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Chi-Square Test** | Row + Column | Gender \| Treatment | 🔧 확인 필요 |
| **Chi-Square Goodness-of-Fit** | Category + Observed | Category \| Count | 🔧 확인 필요 |
| **Chi-Square Independence** | Row + Column | Variable1 \| Variable2 | 🔧 확인 필요 |
| **Fisher's Exact Test** | Row + Column (2×2) | Group \| Outcome | 🔧 확인 필요 |

### **Type E: 단일 변수 검정**
- **정의**: 각 행 = 관측값, 단일 변수 컬럼
- **SPSS 메뉴**: Analyze > Nonparametric Tests > One Sample

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **One-Sample t-test** | Value | Score | 🔧 확인 필요 |
| **Normality Test** | Value | Data | 🔧 확인 필요 |
| **Binomial Test** | Success/Failure | Outcome(0/1) | ✅ 구현됨 |
| **Runs Test** | Value + Cutpoint | Data | 🔧 확인 필요 |
| **K-S Test** | Value | Data | 🔧 확인 필요 |

### **Type F: 시계열 데이터**
- **정의**: 각 행 = 시점, 시간 순서 중요
- **SPSS 메뉴**: Analyze > Forecasting

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **ARIMA** | Time + Value | Date \| Value | 🔧 확인 필요 |
| **Seasonal Decomposition** | Time + Value | Date \| Value | 🔧 확인 필요 |
| **Mann-Kendall Trend** | Time + Value | Date \| Value | 🔧 확인 필요 |
| **Stationarity Test** | Time + Value | Date \| Value | 🔧 확인 필요 |

### **Type G: 다변량 분석**
- **정의**: 각 행 = 케이스, 여러 변수 컬럼
- **SPSS 메뉴**: Analyze > Dimension Reduction / Classify

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **PCA** | Var1~Varn | X1 \| X2 \| X3 \| ... \| Xn | 🔧 확인 필요 |
| **Factor Analysis** | Var1~Varn | Item1 \| Item2 \| ... \| ItemN | 🔧 확인 필요 |
| **Cluster Analysis** | Var1~Varn | X1 \| X2 \| X3 \| ... | 🔧 확인 필요 |
| **Discriminant Analysis** | Group + Var1~Varn | Group \| X1 \| X2 \| X3 | 🔧 확인 필요 |

### **Type H: 생존 분석**
- **정의**: Time + Event + Covariates
- **SPSS 메뉴**: Analyze > Survival

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Kaplan-Meier** | Time + Event | Time \| Event(0/1) | 🔧 확인 필요 |
| **Cox Regression** | Time + Event + Covariates | Time \| Event \| X1 \| X2 | 🔧 확인 필요 |

### **Type I: 기타**

| 통계 방법 | 필수 컬럼 | SPSS 예시 | 현재 구현 |
|----------|----------|----------|----------|
| **Descriptive Statistics** | Variables | Var1 \| Var2 \| ... | 🔧 확인 필요 |
| **Reliability Analysis** | Items | Item1 \| Item2 \| ... | 🔧 확인 필요 |
| **Power Analysis** | (파라미터 입력) | - | 🔧 확인 필요 |
| **Proportion Test** | Success + Total | - | 🔧 확인 필요 |
| **Mixed Model** | ID + Time + DV + Covariates | ID \| Time \| DV \| X1 | 🔧 확인 필요 |
| **Response Surface** | X1 + X2 + Y | X1 \| X2 \| Y | 🔧 확인 필요 |
| **Dose-Response** | Dose + Response | Dose \| Response | 🔧 확인 필요 |

---

## 🔍 검증 대상 (우선순위)

### **Priority 1: 핵심 통계 (10개)** 🚨
| # | 통계 | 현재 상태 | 검증 필요 |
|---|------|----------|----------|
| 1 | Independent t-test | 🔧 | 데이터 형태 확인 |
| 2 | One-Way ANOVA | 🔧 | 데이터 형태 확인 |
| 3 | Repeated Measures ANOVA | ✅ Wide | 예시 데이터 추가 |
| 4 | Paired t-test | ✅ Wide | 예시 데이터 추가 |
| 5 | Correlation | 🔧 | 데이터 형태 확인 |
| 6 | Linear Regression | 🔧 | 데이터 형태 확인 |
| 7 | Chi-Square | 🔧 | 데이터 형태 확인 |
| 8 | Mann-Whitney U | 🔧 | 데이터 형태 확인 |
| 9 | Wilcoxon | ✅ Wide | 예시 데이터 추가 |
| 10 | One-Sample t-test | 🔧 | 데이터 형태 확인 |

### **Priority 2: 중급 통계 (15개)**
- Two-Way ANOVA, ANCOVA, MANOVA
- Multiple Regression, Logistic Regression
- Kruskal-Wallis, Friedman
- Partial Correlation
- PCA, Factor Analysis
- Normality Test
- K-S Test, Runs Test
- Chi-Square Goodness/Independence
- Kaplan-Meier

### **Priority 3: 고급 통계 (나머지 24개)**
- Cox Regression, Ordinal Regression, Poisson Regression
- ARIMA, Seasonal Decomposition
- Mixed Model, Stepwise
- Cluster, Discriminant
- 기타 전문 통계

---

## 📋 다음 단계

1. **Priority 1 통계 검증** (오늘)
   - [ ] 10개 핵심 통계 페이지 코드 확인
   - [ ] 데이터 형태 분석
   - [ ] SPSS 표준과 비교

2. **예시 데이터 생성** (내일)
   - [ ] Priority 1: 10개 CSV 파일
   - [ ] SPSS 스타일 컬럼명
   - [ ] `/public/example-data/` 저장

3. **안내 메시지 추가** (모레)
   - [ ] 각 페이지에 데이터 형태 Alert
   - [ ] 예시 다운로드 버튼
   - [ ] 에러 메시지 개선

---

**작성일**: 2026-02-09
**검증 대상**: 49개 통계 방법
**우선순위**: Priority 1 (10개) → Priority 2 (15개) → Priority 3 (24개)