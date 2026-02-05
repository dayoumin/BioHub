# Smart Flow 통계 방법 개선 계획

> **작성일**: 2026-02-05
> **최종 검증**: 2026-02-05 (코드 대조 검증 완료)
> **기준**: 49개 통계 방법 전수 점검 결과
> **범위**: Smart Flow (`/smart-flow`) 전용 (개별 통계 페이지는 Legacy)

---

## 0. 검증 정오표 (코드 대조 결과)

> 아래는 초기 테스트 관찰과 실제 코드 분석 후 발견된 차이점입니다.

| # | 항목 | 초기 진단 | 실제 원인 (코드 검증) | 영향 |
|---|------|---------|---------------------|------|
| 1 | **시계열 3개 (#38-40)** | "기술통계 평균값 fallback, 시계열 분석 미실행" | **시계열 분석 IS 실행됨.** `executeTimeSeries()` → `worker4.time_series_analysis()` 정상 호출. Statistic=100.07은 `result.trend[0]` (추세 분해의 첫 값)이고 평균이 아님. **문제는 결과 표현**: statistic에 ADF 대신 trend[0], pvalue 하드코딩 1, method.id별 분기 없음 | 수정 난이도 ↓ (표현만 수정) |
| 2 | **ANOVA (#5)** | "scikit_posthocs 모듈 에러로 60%에서 중단" | **ANOVA 메인(F-test) 정상 실행됨.** 실패는 사후검정(Games-Howell)에서만 발생. `gamesHowellTest()` 호출에 try-catch 없어 에러 전파 → 전체 ANOVA 실패로 보임. `scikit_posthocs`는 함수 내부 import (모듈 레벨 아님) | try-catch 추가로 간단 해결 |
| 3 | **Sign Test (#15)** | "결과 라벨이 wilcoxon으로 표시 = 라벨 버그" | **method ID 매핑 정상** ('sign-test' → 'sign-test'). Python `sign_test()` 반환값에 `statistic` 키 없음 → TS에서 `signResult.statistic` = undefined → `toFixed(2)` 크래시 가능. "W=0.00, wilcoxon 라벨" 관찰은 **테스트 시 실제로 wilcoxon 메서드가 선택된 것일 가능성** (재검증 필요) | 재테스트 + Python 반환값 수정 |
| 4 | **선형회귀 β=0.00 (#24)** | "β 표시 이슈" | `getStatisticName()`이 회귀 → 'β' 반환하지만, 실제 `mainResults.statistic`은 F-statistic (또는 t-statistic). **라벨('β')과 값(F값)의 불일치.** F/t가 undefined면 "β=0.00" 표시 | 라벨 수정 또는 coefficients 추가 |
| 5 | **검정력 분석 (#47)** | "toFixed() 크래시 = result-converter 이슈" | **크래시 위치: `ResultsActionStep.tsx:397`** `statisticalResult.statistic.toFixed(2)` 또는 `:424` `effectSize.value.toFixed(2)`. Python 반환값이 unexpected 시 undefined → `undefined.toFixed()` = TypeError | null 방어 코드 추가 |
| 6 | **생존분석 SKIP (#41-42)** | "이진형 변수 부족" | **survival.csv의 status(0/1)는 이진형으로 정상 분류됨.** 테스트 시 survival.csv가 아닌 stepwise.csv가 업로드된 것으로 추정. **재테스트 필요** | 코드 문제 아닐 수 있음 |
| 7 | **카이제곱 적합도 SKIP (#31)** | "범주형 변수 부족" | chi-square.csv에는 categorical 변수 존재. 테스트 시 **stepwise.csv로 잘못 테스트된 것으로 추정.** 재테스트 필요 | 코드 문제 아닐 수 있음 |

---

## 1. 현황 요약

| 상태 | 개수 | 비율 | 설명 |
|------|------|------|------|
| **PASS** | 10 | 20% | 정상 동작 (#24 PASS*는 표시 이슈만 있음) |
| **FAIL** | 13 | 27% | 코드 수정 필요 |
| **PARTIAL** | 3 | 6% | 동작하나 결과 표시 불완전 |
| **SKIP** | 22 | 45% | 테스트 데이터 부적합으로 미테스트 |
| **코드OK** | 1 | 2% | 코드 확인만 완료 (이원ANOVA) |

### PASS 목록 (10개)
독립표본 t, Welch t, 대응표본 t, Mann-Whitney, Wilcoxon, Kruskal-Wallis, Runs Test, 상관분석, 단순선형회귀, 용량-반응

---

## 2. 이슈 분류

```
┌─────────────────────────────────────────────────────────┐
│  A. 변수 셀렉터 미지원 (6 메서드)     → UI 계층        │
│  B. Executor 라우팅/변환 (8 메서드)    → 비즈니스 로직  │
│  C. 결과 표시 이슈 (5 메서드)          → 프레젠테이션   │
│  D. Python Worker 부재/에러 (2 메서드) → 계산 엔진      │
│  E. 테스트 데이터 부족 (22 메서드)     → 테스트 인프라   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. A. 변수 셀렉터 미지원 (VariableSelectionStep.tsx)

### 근본 원인
`getSelectorType()` 함수가 6개 메서드를 `'default'`로 폴백 → 독립/종속 2변수만 선택 가능 → 실제 분석에 필요한 변수 역할(factor, covariate, within, control 등)을 매핑할 수 없음.

### 영향받는 메서드 및 필요한 셀렉터

| # | 메서드 | 현재 셀렉터 | 필요한 변수 역할 | 수정 난이도 |
|---|--------|-----------|----------------|-----------|
| 3 | **일표본 t-검정** | default | 검정변수 1개 + 기준값(μ₀) 입력 | S |
| 6 | **ANCOVA** | default | dependent + factor(그룹) + covariate(공변량) | M |
| 7 | **MANOVA** | default | multiple dependent(2+) + factor(그룹) | M |
| 8 | **반복측정 ANOVA** | default | within-subject vars(시점들) + optional between | L |
| 9 | **혼합모형** | default | dependent + fixed effects + random effects | L |
| 23 | **편상관분석** | default | variable1 + variable2 + control variables(1+) | M |

### 수정 방법

**파일**: `components/smart-flow/steps/VariableSelectionStep.tsx`

```
getSelectorType()에 다음 매핑 추가:

'one-sample-t'          → 'one-sample'         (새 셀렉터)
'ancova'                → 'ancova'             (새 셀렉터)
'manova'                → 'manova'             (새 셀렉터)
'repeated-measures-anova' → 'repeated-measures' (새 셀렉터)
'mixed-model'           → 'mixed-model'        (새 셀렉터)
'partial-correlation'   → 'partial-correlation' (새 셀렉터)
```

### 각 셀렉터 상세 설계

#### A-1. OneSampleSelector (난이도: S)
- **변수**: 검정 변수 1개 (연속형) 드롭다운 선택
- **추가 입력**: 기준값 μ₀ (기본값: 0) 숫자 입력 필드
- **출력**: `{ dependent: [colName], testValue: number }`
- **참고**: 기존 `GroupComparisonSelector`를 단순화한 버전

#### A-2. AncovaSelector (난이도: M)
- **변수**: 종속변수 1개(연속형) + 요인변수 1개(범주형) + 공변량 1개+(연속형)
- **출력**: `{ dependent: [col], factor: [col], covariate: [col1, col2...] }`
- **참고**: TwoWayAnovaSelector의 구조 참고 가능

#### A-3. ManovaSelector (난이도: M)
- **변수**: 종속변수 2개+(연속형) + 요인변수 1개+(범주형)
- **출력**: `{ dependent: [col1, col2...], factor: [col] }`
- **참고**: MultipleRegressionSelector 구조 변형

#### A-4. RepeatedMeasuresSelector (난이도: L)
- **변수**: 시점 변수 2개+(연속형 열들) + optional between-subject factor
- **출력**: `{ within: [time1, time2, time3], between: [factorCol] }`
- **특이사항**: Wide format 데이터 전제 (한 행 = 한 피험자)

#### A-5. MixedModelSelector (난이도: L)
- **변수**: 종속변수 + 고정효과 변수(들) + 무선효과 변수(들)
- **출력**: `{ dependent: [col], fixed: [col1...], random: [col2...] }`
- **특이사항**: Long format 데이터 전제

#### A-6. PartialCorrelationSelector (난이도: M)
- **변수**: 분석 변수 2개(연속형) + 제어 변수 1개+(연속형)
- **출력**: `{ variables: [var1, var2], control: [ctrl1, ctrl2...] }`
- **참고**: CorrelationSelector에 control 필드 추가

---

## 4. B. Executor 라우팅/변환 이슈 (statistical-executor.ts)

### 근본 원인
`executeMethod()` 내 switch문이 `method.category`로만 분기하고, 동일 카테고리 내 메서드별 세분화 부족. 특히 시계열/기술통계/정규성 검정이 범용 함수로 빠짐.

### 영향받는 메서드

| # | 메서드 | 현재 라우팅 | 실제 필요한 라우팅 | 수정 난이도 |
|---|--------|----------|-----------------|-----------|
| 32 | **카이제곱 독립성** | executeChiSquare() | 데이터→분할표 변환 후 호출 | M |
| 34 | **정규성 검정** | executeDescriptive() | executeNormality() 새 분기 | S |
| 38 | **계절 분해** | executeTimeSeries() | 동일하지만 결과 변환 분기 | S (Python 수정 불필요) |
| 39 | **정상성 검정** | executeTimeSeries() | ADF 결과 이미 반환됨, 매핑만 수정 | S (Python 수정 불필요) |
| 40 | **Mann-Kendall** | executeTimeSeries() | executeMannKendall() 새 분기 | M |
| 33 | **기술통계** | executeDescriptive() | 결과를 기술통계 전용 포맷으로 | S |
| 35 | **EDA** | executeDescriptive() | EDA 전용 결과 (분포, 이상치 등) | M |
| 47 | **검정력 분석** | executeDesign() | undefined 방어 코드 추가 | S |

### 상세 분석

#### B-1. 카이제곱 독립성 - 데이터 변환 누락 (난이도: M)

**현재 문제**:
```
executeChiSquare() → pyodideStats.chiSquare(data.data)
                                              ↑ raw record[] 전달
Python expects: number[][] (분할표)
→ TypeError: '<' not supported between 'dict' and 'int'
```

**수정 방안**:
```
1. prepareData()에서 범주형 변수 2개 추출
2. JS에서 분할표(contingency table) 생성
3. 생성된 number[][]를 Python에 전달
또는
4. Python worker에서 raw data → 분할표 변환 처리
```

**추천**: Python worker에 raw data 처리 함수 추가 (worker2에 `chi_square_from_raw_data()`)
- 이유: 범주형 데이터 인코딩이 JS보다 Python(pandas)이 안전

#### B-2. 시계열 메서드 3개 - 결과 표현 분기 누락 (난이도: M)

> **정오표**: 시계열 분석은 실제로 실행됨. `category='timeseries'` → `executeTimeSeries()` →
> `worker4.time_series_analysis()` 정상 호출. Statistic=100.07은 `result.trend[0]`
> (추세 분해 첫 번째 값)이며 평균이 아님. 문제는 **결과 표현**만 해당.

**현재 문제** (statistical-executor.ts:1422-1460):
```typescript
// 모든 시계열 메서드가 동일한 결과 표현 사용
mainResults: {
  statistic: result.trend[0],  // ← 추세값 (ADF/tau가 아님)
  pvalue: 1,                    // ← 하드코딩 (adfPValue 무시)
  significant: false,           // ← 하드코딩
  interpretation: '시계열 분석 완료'
}
// result에 adfStatistic, adfPValue, isStationary, acf, pacf 등이
// rawResults에 있지만 mainResults에 반영되지 않음
```

**수정 방안**:
```
executeTimeSeries() 내부에서 method.id별 결과 표현 분기:

switch (method.id) {
  case 'seasonal-decompose':
    → 기존 time_series_analysis() 호출 (OK)
    → statistic: 계절성 강도 또는 추세 기울기
    → 시각화: trend, seasonal, residual 플롯

  case 'stationarity-test':
    → 기존 time_series_analysis() 호출 후 ADF 결과 추출
    → statistic: result.adfStatistic (이미 반환됨!)
    → pvalue: result.adfPValue (이미 반환됨!)
    → significant: result.isStationary (이미 반환됨!)

  case 'mann-kendall':
    → worker에 mannKendallTest() 함수 신규 추가 필요
    → statistic: tau, pvalue: p

  case 'arima':
    → worker4에 arima_forecast() 필요 (현재 미구현)
}
```

**핵심 포인트**: stationarity-test와 seasonal-decompose는 Python 수정 불필요.
`time_series_analysis()`가 이미 `adfStatistic`, `adfPValue`, `isStationary`를 반환하고 있으므로
executor의 결과 매핑만 수정하면 됨. (난이도 S로 하향)

#### B-3. 정규성 검정 - executeDescriptive() 폴백 (난이도: S)

**현재 문제**:
정규성 검정은 `category: 'descriptive'` (statistical-methods.ts:392) → `executeDescriptive()` → 평균/표준편차만 반환. method.id별 분기 없음.

**수정 방안**:
```
executeDescriptive() 내부에서 method.id 체크:

if (method.id === 'normality-test' || method.id === 'shapiro-wilk') {
  → pyodideStats.shapiroWilkTest(values) 호출
  → 결과: { statistic: W, pValue, isNormal }
}
```

#### B-4. 검정력 분석 - toFixed() 크래시 (난이도: S)

> **정오표**: 크래시 위치는 executor가 아닌 **ResultsActionStep.tsx**.
> `statisticalResult.statistic.toFixed(2)` (line 397) 또는
> `statisticalResult.effectSize.value.toFixed(2)` (line 424)에서
> undefined 값에 .toFixed() 호출 시 TypeError 발생.

**현재 문제** (다층적):
1. **Executor** (line 1712-1715): `result.achievedPower || result.requiredSampleSize || 0` → 0 fallback 있어 안전
2. **Executor** (line 1713): `pvalue: result.alpha` → alpha가 undefined면 pValue=undefined
3. **ResultsActionStep.tsx** (line 397): `statisticalResult.statistic.toFixed(2)` → statistic이 undefined이면 크래시
4. **ResultsActionStep.tsx** (line 424): `statisticalResult.effectSize.value.toFixed(2)` → value가 undefined이면 크래시
5. **ResultsActionStep.tsx** (line 83): `p.toFixed(3)` → p가 undefined이면 크래시

**수정 방안** (2곳):
```typescript
// 1. ResultsActionStep.tsx - null 방어 (3개소)
{(statisticalResult.statistic ?? 0).toFixed(2)}
{(statisticalResult.effectSize?.value ?? 0).toFixed(2)}
// formatPValue에 방어 추가
function formatPValue(p: number) {
  if (p == null || isNaN(p)) return '-'
  ...
}

// 2. Executor - pvalue 방어
pvalue: typeof result.alpha === 'number' ? result.alpha : 0.05,
```

---

## 5. C. 결과 표시 이슈 (result-transformer.ts, UI)

### 영향받는 메서드

| # | 메서드 | 증상 | 원인 | 수정 난이도 |
|---|--------|------|------|-----------|
| 15 | **Sign Test** | 라벨이 "wilcoxon"으로 표시 | executor에서 method 라벨 미전파 | S |
| 24 | **단순선형회귀** | β=0.00 표시 | 회귀계수 변환 로직 이슈 | S |
| 33 | **기술통계** | p=1.000 가설검정 포맷 | 기술통계 전용 결과 UI 없음 | M |
| 34 | **정규성 검정** | 평균값이 W로 표시 | B-3과 동일 원인 (Executor) | S |
| 35 | **EDA** | 기술통계 fallback | EDA 전용 결과 포맷 없음 | L |

### 상세 분석

#### C-1. Sign Test - Python 반환값 불일치 + 재테스트 필요 (난이도: S)

> **정오표**: method ID 매핑은 정상 ('sign-test' → 'sign-test').
> "wilcoxon 라벨" 관찰은 테스트 시 wilcoxon 메서드가 선택된 것으로 추정 (재검증 필요).

**확인된 코드 버그**: Python `sign_test()` (worker3:530-534) 반환값에 `statistic` 키 없음:
```python
return {
    'nPositive': int(n_positive),
    'nNegative': int(n_negative),
    'nTies': int(n_ties),
    'pValue': float(result.pvalue)
    # ← 'statistic' 키 없음!
}
```
TypeScript wrapper (`pyodide-statistics.ts:1885`)는 `statistic: number` 선언하지만 Python이 미반환 → undefined.
Executor (line 1069): `statistic: signResult.statistic` = undefined → `toFixed(2)` 크래시 가능.

**수정 (2곳)**:
1. **Python**: `sign_test()` 반환에 `'statistic': int(n_positive)` 추가 (또는 binomial test statistic)
2. **재테스트**: Smart Flow에서 실제로 "Sign Test" 선택 시 method.id 확인

#### C-2. 선형회귀 - 통계량 라벨/값 불일치 (난이도: S)

> **정오표**: β=0.00은 "잘못된 β 표시"가 아닌 **라벨과 값의 불일치**.

**원인** (코드 확인):
- `getStatisticName()` (result-converter.ts:254): 회귀 관련 → `'β'` 반환
- 실제 `mainResults.statistic` = `result.fStatistic ?? result.tStatistic ?? 0` (executor:887)
- F/t가 모두 undefined면 → `statistic = 0` → 표시: "β = 0.00"
- F/t가 있어도 → 라벨 'β'에 F값이 표시됨 (의미 불일치)

**또한**: `executeRegression()` (line 893-898)이 `additionalInfo.coefficients`를 설정하지 않음
→ `result-converter.ts`의 회귀계수 테이블 (line 64-83)이 비어있음

**수정 (3곳)**:
1. `getStatisticName()`: 회귀분석 → 'F' 반환 (β는 계수에만 사용)
2. `executeRegression()`: Python 결과의 coefficients를 additionalInfo에 포함
3. Python regression 결과에 fStatistic/tStatistic 키가 실제로 반환되는지 확인

#### C-3. 기술통계 전용 UI (난이도: M)

**현재**: `StatisticalResultCard`가 가설검정 포맷만 지원 (Statistic, p-value, 효과크기)
**필요**: 기술통계 결과를 위한 별도 렌더링

```
기술통계 전용 표시 항목:
- 평균, 중앙값, 최빈값
- 표준편차, 분산, 범위
- 왜도, 첨도
- 사분위수 (Q1, Q2, Q3)
- 정규성 간이 판정
```

**수정 방안**: `SmartFlowResult`에 `resultType: 'hypothesis' | 'descriptive' | 'eda'` 필드 추가 → 결과 단계에서 분기 렌더링

#### C-4. EDA 전용 결과 (난이도: L)

기술통계 + 분포 시각화(히스토그램, QQ plot) + 이상치 탐지 + 상관 히트맵 등 종합 결과가 필요. 가장 작업량이 큰 항목.

---

## 6. D. Python Worker 부재/에러

| # | 메서드 | 문제 | 수정 난이도 |
|---|--------|------|-----------|
| 5 | **ANOVA** | `scikit_posthocs` 모듈 미설치 (Games-Howell) | M |
| 40 | **Mann-Kendall** | Python 구현 부재 | M |

### D-1. ANOVA - Games-Howell 사후검정 실패로 전체 ANOVA 중단 (난이도: S→M)

> **정오표**: ANOVA 메인 분석(F-test)은 정상 실행됨. `pyodideStats.anova()` 성공.
> 실패는 사후검정 단계 `gamesHowellTest()` (executor line 814)에서만 발생.
> **try-catch가 없어** ImportError가 전파 → 전체 ANOVA 실패로 보임.

**현재 문제 (2단계)**:
1. `scikit_posthocs` 모듈 Pyodide 미지원 → `games_howell_test()` ImportError
2. executor line 812-814에 try-catch 없음 → 에러 전파 → ANOVA 전체 실패

**수정 방안 (2단계)**:

**즉시 수정 (난이도: S)** - try-catch 추가:
```typescript
// statistical-executor.ts line 811-815
let postHoc = null
if (result.pValue < 0.05 && groups.length > 2) {
  try {
    postHoc = await pyodideStats.gamesHowellTest(groups, groupNames)
  } catch (error) {
    logger.warn('Games-Howell 사후검정 실패, Tukey HSD로 시도합니다', error)
    try {
      postHoc = await pyodideStats.tukeyHSD(groups, groupNames)
    } catch {
      postHoc = null // 사후검정 없이 메인 결과만 표시
    }
  }
}
```
→ 이것만으로 ANOVA 메인 결과(F, p, η²)가 정상 표시됨

**후속 수정 (난이도: M)** - Games-Howell 직접 구현:
- `scipy.stats`만으로 구현 가능 (t분포 + Welch-Satterthwaite df)
- `scikit_posthocs` 의존성 제거

### D-2. Mann-Kendall - 구현 부재 (난이도: M)

**현재**: 어떤 Python worker에도 `mann_kendall` 함수 없음
**필요**: scipy.stats 기반 Mann-Kendall 추세 검정

```python
# worker4-regression-advanced.py에 추가
def mannKendallTest(values):
    from scipy.stats import kendalltau
    n = len(values)
    # S statistic, tau, p-value 계산
    indices = list(range(n))
    tau, p_value = kendalltau(indices, values)
    # S statistic 계산 (sgn 합)
    ...
    return {
        'statistic': float(s_stat),
        'tau': float(tau),
        'pValue': float(p_value),
        'trend': 'increasing' if tau > 0 else 'decreasing' if tau < 0 else 'no trend'
    }
```

---

## 7. E. 테스트 데이터 부족 (22 메서드 SKIP)

### 근본 원인
기존 `test-data/e2e/*.csv` 파일들의 표본 크기가 15~30행으로, 최소 표본 요건 50~100을 충족하지 못함. 또한 특수 변수 타입(서열형, 이진형 사건변수 등)이 포함된 데이터 부재.

### SKIP 메서드 분류

#### E-1. 표본 크기 부족 (새 CSV 생성 필요)

| 메서드 | 필요 n | 현재 n | 필요 데이터 구조 |
|--------|-------|--------|----------------|
| 로지스틱 회귀 | 50 | 20 | 연속형 x + 이진 y |
| 포아송 회귀 | 50 | 20 | 연속형 x + 카운트 y |
| 단계적 회귀 | 40 | 15 | 연속형 x1,x2,x3 + y |
| 반응표면 | 20 | 15 | 연속형 x1,x2,x3 + y |
| ARIMA | 50 | 30 | date + value |
| PCA | 30 | 20 | 다중 연속형 변수 |
| 군집분석 | 30 | 20 | 다중 연속형 변수 |
| 신뢰도 분석 | 30 | 20 | 다중 리커트 문항 |
| 판별분석 | 50 | 20 | 그룹 + 다중 연속형 |
| 요인분석 | 100 | 20 | 다중 연속형(8+) |
| 순서형 회귀 | 100 | 20 | 서열형 y + 연속형 x |

#### E-2. 변수 타입 부족 (새 CSV 또는 기존 확장 필요)

> **정오표**: 일부 SKIP은 **잘못된 테스트 데이터가 업로드된 것**이 원인일 수 있음.
> survival.csv(status=0/1 이진), chi-square.csv(범주형), anova.csv(그룹 변수) 등은
> 올바른 CSV로 재테스트 시 호환 가능할 수 있음. 아래 "재테스트 우선" 표시 참고.

| 메서드 | 필요 변수 타입 | 대응 방안 | 비고 |
|--------|-------------|----------|------|
| Kaplan-Meier | time + binary event | survival.csv (status=0/1 이진) | **재테스트 우선** |
| Cox 회귀 | time + binary event + covariates | survival.csv (time, status, group) | **재테스트 우선** |
| 카이제곱 적합도 | 범주형 변수 | chi-square.csv (gender, preference) | **재테스트 우선** |
| 평균 플롯 | 범주형 요인 + 연속형 | anova.csv (group, value) | **재테스트 우선** |
| Mood's Median | 범주형 그룹 + 연속형 | kruskal-wallis.csv (group, value) | **재테스트 우선** |
| KS Test | 연속형 변수 | 기존 데이터로 가능 | **재테스트 우선** |
| Friedman | 반복측정 + 3+ 수준 그룹 | repeated-measures.csv에 그룹 열 추가 | 데이터 수정 필요 |
| McNemar | 대응 이진 변수 2개 | 새 CSV: subject, before_binary, after_binary | 새 CSV |
| Cochran's Q | 피험자 + 반복 이진 | 새 CSV: subject, cond1(0/1), cond2(0/1), cond3(0/1) | 새 CSV |
| Binomial | 이진형 변수 | 새 CSV 또는 기존에 이진열 추가 | 새 CSV |
| Proportion | 이진형 변수 | Binomial과 동일 데이터 | 새 CSV |

### 생성 필요한 새 CSV 파일

| 파일명 | 행 수 | 구조 | 대상 메서드 |
|--------|------|------|-----------|
| `large-logistic.csv` | 60 | age, income, score, purchased(0/1) | 로지스틱, 포아송 |
| `large-stepwise.csv` | 50 | x1,x2,x3,x4,y | 단계적 회귀, 반응표면 |
| `large-timeseries.csv` | 60 | date, value | ARIMA |
| `large-pca.csv` | 120 | v1~v8, group | PCA, 요인, 군집, 판별 |
| `large-ordinal.csv` | 120 | x1,x2,x3, ordinal_y(1~5) | 순서형 회귀 |
| `large-reliability.csv` | 40 | item1~item8 | 신뢰도 분석 |
| `mcnemar.csv` | 30 | subject, before(0/1), after(0/1) | McNemar |
| `cochran.csv` | 20 | subject, cond1(0/1), cond2(0/1), cond3(0/1) | Cochran's Q |
| `large-survival.csv` | 40 | time, event(0/1), group, age | Kaplan-Meier, Cox |

---

## 8. 우선순위 로드맵

### Phase 1: Quick Wins (빠른 수정, 높은 가치) - 추정 1~2일

| 순서 | 이슈 | 영향 메서드 | 난이도 | 수정 파일 |
|------|------|-----------|--------|---------|
| 1-1 | B-4 검정력 분석 크래시 | #47 | S | ResultsActionStep.tsx (null 방어 3개소) + executor |
| 1-2 | D-1 ANOVA try-catch | #5 | S | statistical-executor.ts:811-815 (try-catch 추가) |
| 1-3 | B-3 정규성 검정 | #34 | S | statistical-executor.ts (executeDescriptive 분기) |
| 1-4 | B-2a 정상성 검정 결과 표현 | #39 | S | statistical-executor.ts (executeTimeSeries 분기) |
| 1-5 | B-2b 계절 분해 결과 표현 | #38 | S | statistical-executor.ts (executeTimeSeries 분기) |
| 1-6 | C-1 Sign Test Python 반환값 | #15 | S | worker3 sign_test() + 재테스트 |
| 1-7 | C-2 회귀 라벨 불일치 | #24 | S | result-converter.ts (getStatisticName) |
| 1-8 | A-1 일표본 t 셀렉터 | #3 | S | VariableSelectionStep.tsx (+ 새 컴포넌트) |

**Phase 1 완료 시**: FAIL 6개 해결 (#3,5,34,38,39,47), PARTIAL 1개 수정 (#15), PASS* 1개 수정 (#24)

### Phase 1.5: 재테스트 (올바른 CSV 데이터로) - 추정 0.5일

> 일부 SKIP이 테스트 데이터 오류로 인한 것인지 확인

| 순서 | 메서드 | 올바른 CSV | 예상 결과 |
|------|--------|-----------|----------|
| 1.5-1 | Kaplan-Meier (#41) | survival.csv | 호환 가능 (status=binary) |
| 1.5-2 | Cox 회귀 (#42) | survival.csv | 호환 가능 |
| 1.5-3 | 카이제곱 적합도 (#31) | chi-square.csv | 호환 가능 |
| 1.5-4 | 평균 플롯 (#36) | anova.csv | 호환 가능 (group=categorical) |
| 1.5-5 | Mood's Median (#21) | kruskal-wallis.csv | 호환 가능 |
| 1.5-6 | KS Test (#20) | stepwise.csv | 호환 가능 |
| 1.5-7 | Sign Test (#15) | paired-t-test.csv | method.id 확인 |

**Phase 1.5 완료 시**: SKIP 6개 → 테스트 결과 판명 (추가 FAIL 또는 PASS)

### Phase 2: Core Analysis Fixes (핵심 분석 수정) - 추정 2~3일

| 순서 | 이슈 | 영향 메서드 | 난이도 | 수정 파일 |
|------|------|-----------|--------|---------|
| 2-1 | B-1 카이제곱 독립성 | #32 | M | statistical-executor.ts, worker2 |
| 2-2 | D-2 Mann-Kendall 구현 | #40 | M | worker4-regression-advanced.py |
| 2-3 | D-1 Games-Howell 직접 구현 | #5 사후검정 | M | worker3 (scipy만으로) |
| 2-4 | C-3 기술통계 전용 UI | #33 | M | AnalysisExecutionStep, 결과 카드 |

**Phase 2 완료 시**: 추가 FAIL 2개 해결 (#32, #40), PARTIAL 1개 해결 (#33)

### Phase 3: Variable Selectors (변수 셀렉터 확장) - 추정 3~4일

| 순서 | 이슈 | 영향 메서드 | 난이도 | 수정 파일 |
|------|------|-----------|--------|---------|
| 3-1 | A-6 편상관 셀렉터 | #23 | M | VariableSelectionStep + 새 컴포넌트 |
| 3-2 | A-2 ANCOVA 셀렉터 | #6 | M | VariableSelectionStep + 새 컴포넌트 |
| 3-3 | A-3 MANOVA 셀렉터 | #7 | M | VariableSelectionStep + 새 컴포넌트 |
| 3-4 | A-4 반복측정 셀렉터 | #8 | L | VariableSelectionStep + 새 컴포넌트 + executor |
| 3-5 | A-5 혼합모형 셀렉터 | #9 | L | VariableSelectionStep + 새 컴포넌트 + executor |

**Phase 3 완료 시**: 추가 FAIL 5개 해결

### Phase 4: Test Data & Coverage (테스트 데이터 확장) - 추정 1~2일

| 순서 | 작업 | 영향 |
|------|------|------|
| 4-1 | 9개 새 CSV 파일 생성 | 잔여 SKIP → 테스트 가능 |
| 4-2 | SKIP 메서드 전수 재테스트 | 추가 FAIL 발견 가능 |
| 4-3 | 발견된 추가 이슈 수정 | - |

### Phase 5: UX Polish (UX 개선) - 추정 2~3일

| 순서 | 이슈 | 영향 메서드 | 난이도 |
|------|------|-----------|--------|
| 5-1 | C-4 EDA 전용 결과 UI | #35 | L |
| 5-2 | 시각화 개선 (차트, 플롯) | 시계열, EDA | L |
| 5-3 | 기술통계 결과 테이블 | #33 | M |

---

## 9. 의존관계 맵

```
Phase 1 (Quick Wins - 모두 독립, 병렬 가능)
  ├── 1-1 검정력 크래시 방어 (#47) ──→ 독립
  ├── 1-2 ANOVA try-catch (#5) ──→ 독립
  ├── 1-3 정규성 검정 분기 (#34) ──→ 독립
  ├── 1-4 정상성 검정 결과 표현 (#39) ──→ 독립
  ├── 1-5 계절 분해 결과 표현 (#38) ──→ 독립
  ├── 1-6 Sign Test Python 반환값 (#15) ──→ 독립
  ├── 1-7 회귀 β 라벨 수정 (#24) ──→ 독립
  └── 1-8 일표본 t 셀렉터 (#3) ──→ 독립

Phase 1.5 (재테스트 - Phase 1 이후)
  ├── Kaplan-Meier (#41) ──→ survival.csv로 재테스트
  ├── Cox 회귀 (#42) ──→ survival.csv로 재테스트
  ├── 카이제곱 적합도 (#31) ──→ chi-square.csv로 재테스트
  ├── 평균 플롯 (#36) ──→ anova.csv로 재테스트
  ├── Mood's Median (#21) ──→ kruskal-wallis.csv로 재테스트
  ├── KS Test (#20) ──→ stepwise.csv로 재테스트
  └── Sign Test (#15) ──→ method.id 재확인

Phase 2 (Core Fixes)
  ├── 2-1 카이제곱 독립성 (#32) ──→ 독립
  ├── 2-2 Mann-Kendall 구현 (#40) ──→ Python 함수 먼저 필요
  ├── 2-3 Games-Howell 직접 구현 (#5) ──→ Phase 1의 try-catch 완료 후
  └── 2-4 기술통계 전용 UI (#33) ──→ 독립

Phase 3 (Selectors)
  ├── 3-1 편상관 셀렉터 (#23) ──→ 독립
  ├── 3-2 ANCOVA 셀렉터 (#6) ──→ executor 동시 수정
  ├── 3-3 MANOVA 셀렉터 (#7) ──→ executor 동시 수정
  ├── 3-4 반복측정 셀렉터 (#8) ──→ executor + Python 수정 필요
  └── 3-5 혼합모형 셀렉터 (#9) ──→ executor + Python 수정 필요

Phase 4 ──→ Phase 1~3 완료 후 시작 권장
Phase 5 ──→ Phase 2-4 완료 후 시작
```

---

## 10. 수정 파일 영향 범위

| 파일 | 수정 Phase | 변경 규모 |
|------|-----------|----------|
| `statistical-executor.ts` | 1,2,3 | 대 (다수 분기 추가) |
| `VariableSelectionStep.tsx` | 1,3 | 대 (6개 셀렉터 매핑) |
| `result-converter.ts` | 1 | 소 (β 라벨 수정: getStatisticName) |
| `ResultsActionStep.tsx` | 1 | 소 (toFixed null 방어 3개소) |
| `worker2-hypothesis.py` | 2 | 중 (posthoc, 카이제곱) |
| `worker4-regression-advanced.py` | 2 | 중 (Mann-Kendall 추가) |
| `AnalysisExecutionStep.tsx` | 2,5 | 중 (결과 타입 분기) |
| `pyodide-statistics.ts` | 2 | 소 (wrapper 추가) |
| 새 셀렉터 컴포넌트 6개 | 1,3 | 각 100~200줄 |
| 새 CSV 파일 9개 | 4 | 각 50~120행 |

---

## 11. 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| Pyodide에서 scikit_posthocs 설치 불가 | ANOVA posthoc 불가 | **즉시**: try-catch로 우회. **후속**: scipy만으로 직접 구현 |
| ~~시계열 method.category 미스매치~~ | ~~라우팅 안됨~~ | **해결됨**: category='timeseries' 확인. 문제는 결과 표현만 |
| 새 셀렉터 → executor 변수매핑 불일치 | 분석 실패 | 셀렉터 output ↔ prepareData() 입력 동기화 |
| ResultsActionStep.tsx toFixed() 크래시 | 모든 메서드 잠재적 영향 | null 방어 코드 일괄 추가 (Phase 1 최우선) |
| 혼합모형/반복측정 Python 구현 복잡 | 구현 지연 | statsmodels `mixedlm`, `AnovaRM` 활용 |
| SKIP 재테스트 시 추가 FAIL 발견 | 작업량 증가 | Phase 1.5에서 조기 발견하여 Phase 2에 반영 |

---

## 12. 성공 기준

| Phase | 목표 | 측정 기준 |
|-------|------|----------|
| Phase 1 | Quick Wins 8개 | FAIL 13→7, PARTIAL 3→2 |
| Phase 1.5 | 재테스트 7개 | SKIP 22→16 (최소) |
| Phase 2 | Core 4개 | FAIL 7→5, PARTIAL 2→1 |
| Phase 3 | Selector 5개 | FAIL 5→0 |
| Phase 4 | 데이터 확장 | SKIP 16→0 (전수 테스트) |
| Phase 5 | UX 완성 | PARTIAL 1→0 |
| **최종** | **전체 49개 메서드 PASS** | **TypeScript 0 errors + 모든 분석 정상** |

---

## 부록: 전체 메서드 상태 요약표

| # | 메서드 | 상태 | 해결 Phase | 이슈 분류 |
|---|--------|------|-----------|----------|
| 1 | 독립표본 t-검정 | PASS | - | - |
| 2 | Welch t-검정 | PASS | - | - |
| 3 | 일표본 t-검정 | FAIL | **P1** | A-1 셀렉터 |
| 4 | 대응표본 t-검정 | PASS | - | - |
| 5 | 일원분산분석 | FAIL | **P1** | D-1 try-catch (즉시) → P2 직접구현 |
| 6 | ANCOVA | FAIL | **P3** | A-2 셀렉터 |
| 7 | MANOVA | FAIL | **P3** | A-3 셀렉터 |
| 8 | 반복측정 ANOVA | FAIL | **P3** | A-4 셀렉터 |
| 9 | 혼합모형 | FAIL | **P3** | A-5 셀렉터 |
| 10 | 이원분산분석 | 코드OK | **P4** | E 테스트 확인 |
| 11 | Mann-Whitney | PASS | - | - |
| 12 | Wilcoxon | PASS | - | - |
| 13 | Kruskal-Wallis | PASS | - | - |
| 14 | Friedman | SKIP | **P4** | E-2 데이터 |
| 15 | Sign Test | PARTIAL | **P1** | C-1 Python 반환값 + 재테스트 |
| 16 | McNemar | SKIP | **P4** | E-2 데이터 |
| 17 | Cochran's Q | SKIP | **P4** | E-2 데이터 |
| 18 | Binomial Test | SKIP | **P4** | E-2 데이터 |
| 19 | Runs Test | PASS | - | - |
| 20 | KS Test | SKIP | **P1.5** | E 재테스트 우선 |
| 21 | Mood's Median | SKIP | **P1.5** | E 재테스트 우선 |
| 22 | 상관분석 | PASS | - | - |
| 23 | 편상관분석 | FAIL | **P3** | A-6 셀렉터 |
| 24 | 단순선형회귀 | PASS* | **P1** | C-2 β표시 |
| 25 | 로지스틱 회귀 | SKIP | **P4** | E-1 표본 |
| 26 | 포아송 회귀 | SKIP | **P4** | E-1 표본 |
| 27 | 순서형 회귀 | SKIP | **P4** | E-1+E-2 |
| 28 | 단계적 회귀 | SKIP | **P4** | E-1 표본 |
| 29 | 용량-반응 | PASS | - | - |
| 30 | 반응표면 | SKIP | **P4** | E-1 표본 |
| 31 | 카이제곱 적합도 | SKIP | **P1.5** | E 재테스트 우선 |
| 32 | 카이제곱 독립성 | FAIL | **P2** | B-1 변환 |
| 33 | 기술통계 | PARTIAL | **P2** | C-3 UI |
| 34 | 정규성 검정 | FAIL | **P1** | B-3 라우팅 |
| 35 | EDA | PARTIAL | **P5** | C-4 UI |
| 36 | 평균 플롯 | SKIP | **P1.5** | E 재테스트 우선 |
| 37 | ARIMA | SKIP | **P4** | E-1 표본 |
| 38 | 계절 분해 | FAIL | **P1** | B-2b 결과 표현 (S) |
| 39 | 정상성 검정 | FAIL | **P1** | B-2a 결과 표현 (S) |
| 40 | Mann-Kendall | FAIL | **P2** | B-2+D-2 |
| 41 | Kaplan-Meier | SKIP | **P1.5** | E 재테스트 우선 |
| 42 | Cox 회귀 | SKIP | **P1.5** | E 재테스트 우선 |
| 43 | PCA | SKIP | **P4** | E-1 표본 |
| 44 | 요인분석 | SKIP | **P4** | E-1 표본 |
| 45 | 군집분석 | SKIP | **P4** | E-1 표본 |
| 46 | 판별분석 | SKIP | **P4** | E-1+E-2 |
| 47 | 검정력 분석 | FAIL | **P1** | B-4 크래시 |
| 48 | 신뢰도 분석 | SKIP | **P4** | E-1 표본 |
| 49 | 비율 검정 | SKIP | **P4** | E-2 데이터 |
