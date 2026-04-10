# Phase 2: 통계 메서드별 E2E 테스트

> 52개 통계 메서드를 카테고리별로 분류하여 체계적으로 검증

## 목표

각 통계 메서드가 Smart Flow를 통해 **업로드 → 선택 → 변수 → 실행 → 결과**까지 정상 동작함을 검증한다.

## 테스트 팩토리 패턴

모든 메서드 테스트는 공통 팩토리를 사용하여 **반복 코드 최소화**:

```typescript
// helpers/method-test-factory.ts
interface MethodTestConfig {
  methodId: string           // statistical-methods.ts의 ID
  searchTerm: string         // 검색어 (한국어)
  methodRegex: RegExp        // 메서드명 매칭 정규식
  csvFile: string            // test-data/e2e/*.csv
  variables: {
    [role: string]: string   // 역할 → 변수명
  }
  expectedResults: {
    hasStatistic: boolean
    hasPValue: boolean
    hasEffectSize?: boolean
  }
  tags: string[]             // @critical, @important, @nice-to-have
}

function createMethodTest(config: MethodTestConfig) {
  // 공통 플로우: upload → select → variables → run → verify
}
```

---

## 2.1 T-검정 (t-tests.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.1.1 | 독립표본 t-검정 | t-test.csv | group→factor, value→dependent | @critical |
| 2.1.2 | Welch t-검정 | welch-t.csv | group→factor, value→dependent | @critical |
| 2.1.3 | 일표본 t-검정 | one-sample-t.csv | value→dependent | @critical |
| 2.1.4 | 대응표본 t-검정 | paired-t.csv | pre, post→paired | @critical |

**결과 검증 항목:**
- t 통계량 (숫자)
- p-value (< 0.05 또는 ≥ 0.05)
- Cohen's d 효과크기
- 95% 신뢰구간
- 자유도 (df)

**세부 검증 (Phase 2 세부 테스트):**
```
TC-2.1.1a: t-검정 결과값 범위 검증
  - t 통계량이 유한한 숫자인지
  - p-value가 0~1 사이인지
  - 효과크기 해석 (작음/중간/큼) 표시

TC-2.1.1b: t-검정 가정 검정 결과
  - 정규성 검정 (Shapiro-Wilk) 결과 표시
  - 등분산 검정 (Levene) 결과 표시

TC-2.1.1c: t-검정 차트 렌더링
  - 그룹 비교 차트 또는 박스플롯 표시
  - 차트 내 데이터 포인트 존재
```

---

## 2.2 분산분석 (anova.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.2.1 | 일원 분산분석 | anova.csv | group→factor, value→dependent | @critical |
| 2.2.2 | Welch ANOVA | anova.csv | group→factor, value→dependent | @important |
| 2.2.3 | 이원 분산분석 | twoway-anova-test.csv | factor1, factor2→factors, value→dependent | @critical |
| 2.2.4 | 반복측정 분산분석 | repeated-measures.csv | subject, time, value | @important |
| 2.2.5 | ANCOVA | anova.csv | group→factor, value→dependent, covariate→covariate | @important |
| 2.2.6 | MANOVA | (생성 필요) | 다수 종속변수 | @nice-to-have |
| 2.2.7 | 혼합모형 | (생성 필요) | within, between, value | @nice-to-have |

**결과 검증 항목:**
- F 통계량
- p-value
- η² (에타 제곱) 효과크기
- 사후검정 결과 (Tukey, Bonferroni)
- 그룹별 기술통계

**세부 검증:**
```
TC-2.2.1a: ANOVA 사후검정 테이블
  - 사후검정 결과 테이블 행 수 = C(k,2)
  - 유의한 쌍 강조 표시

TC-2.2.3a: 이원 ANOVA 교호작용
  - 주효과 A, B + 교호작용 A×B 결과
  - 교호작용 플롯 렌더링
```

---

## 2.3 회귀분석 (regression.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.3.1 | 단순 회귀 | regression.csv | study_hours→independent, score→dependent | @critical |
| 2.3.2 | 다중 회귀 | regression.csv | study_hours+motivation+practice_tests+attendance→independent, score→dependent | @critical |
| 2.3.3 | 로지스틱 회귀 | logistic-regression.csv | x1, x2→independent, outcome→dependent | @important |
| 2.3.4 | 단계적 회귀 | stepwise.csv | 다수→candidates, y→dependent | @important |
| 2.3.5 | 포아송 회귀 | (생성 필요) | count data | @nice-to-have |
| 2.3.6 | 순서형 회귀 | (생성 필요) | ordinal outcome | @nice-to-have |

**결과 검증 항목:**
- R² (결정계수)
- 회귀계수 테이블 (β, SE, t, p)
- F 통계량 (모델 전체)
- 잔차 진단 차트

**세부 검증:**
```
TC-2.3.2a: 다중 회귀 계수 테이블
  - 각 독립변수별 β, SE, t, p 열 존재
  - 절편(Intercept) 행 존재
  - VIF (다중공선성) 표시

TC-2.3.3a: 로지스틱 회귀 오즈비
  - 오즈비 (OR) 또는 exp(β) 표시
  - 분류 정확도 (accuracy) 표시
  - ROC 곡선 렌더링 (있을 경우)
```

---

## 2.4 상관분석 (correlation.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.4.1 | Pearson 상관 | correlation.csv | height, weight→variables | @critical |
| 2.4.2 | Spearman 순위상관 | correlation.csv | height, weight→variables | @important |
| 2.4.3 | Kendall τ | correlation.csv | height, weight→variables | @nice-to-have |
| 2.4.4 | 편상관 | correlation.csv | height, weight→variables, age→control | @nice-to-have |

**결과 검증 항목:**
- 상관계수 (r 또는 ρ 또는 τ)
- p-value
- 산점도 렌더링
- 상관행렬 (다변량 시)

---

## 2.5 비모수 검정 (nonparametric.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.5.1 | Mann-Whitney U | mann-whitney.csv | group, value | @critical |
| 2.5.2 | Wilcoxon 부호순위 | wilcoxon.csv | pre, post | @critical |
| 2.5.3 | Kruskal-Wallis H | kruskal-wallis.csv | group, value | @important |
| 2.5.4 | Friedman | (생성 필요) | repeated | @important |
| 2.5.5 | 부호 검정 | (생성 필요) | paired | @nice-to-have |
| 2.5.6 | McNemar | (생성 필요) | before, after (binary) | @nice-to-have |
| 2.5.7 | Cochran Q | (생성 필요) | repeated binary | @nice-to-have |
| 2.5.8 | 이항 검정 | (생성 필요) | binary | @nice-to-have |
| 2.5.9 | 런 검정 | (생성 필요) | binary sequence | @nice-to-have |
| 2.5.10 | KS 검정 | (생성 필요) | distribution | @nice-to-have |
| 2.5.11 | Mood 중위수 | (생성 필요) | group, value | @nice-to-have |

**결과 검증 항목:**
- U/W/H/χ² 통계량
- p-value (정확 또는 근사)
- 순위합/평균순위
- 효과크기 (r 또는 η²)

---

## 2.6 카이제곱 검정 (chi-square.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.6.1 | 독립성 검정 | chi-square-v2.csv | gender, preference | @critical |
| 2.6.2 | 적합도 검정 | (생성 필요) | category, observed | @important |

**결과 검증 항목:**
- χ² 통계량
- p-value
- 자유도
- Cramér's V 효과크기
- 교차표 (관측/기대빈도)

---

## 2.7 기술통계 (descriptive.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.7.1 | 기술통계량 | descriptive.csv | 다수 numeric | @critical |
| 2.7.2 | 정규성 검정 | descriptive.csv | numeric | @important |
| 2.7.3 | 데이터 탐색 | descriptive.csv | 다수 | @important |

**결과 검증 항목:**
- 평균, 중앙값, 표준편차
- 왜도, 첨도
- 최솟값/최댓값, 사분위수
- 히스토그램/Q-Q 플롯

---

## 2.8 다변량 분석 (multivariate.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.8.1 | PCA | pca.csv | 다수 numeric | @important |
| 2.8.2 | 탐색적 요인분석 | factor-analysis.csv | 다수 numeric | @important |
| 2.8.3 | 군집분석 | (생성 필요) | 다수 numeric | @nice-to-have |
| 2.8.4 | 판별분석 | (생성 필요) | group + 다수 numeric | @nice-to-have |

**결과 검증 항목:**
- 고유값/설명 분산 비율
- 요인 적재량 테이블
- Scree plot 렌더링
- KMO/Bartlett 검정

---

## 2.9 시계열 분석 (timeseries.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.9.1 | ARIMA | timeseries.csv | date, value | @important |
| 2.9.2 | 계절 분해 | timeseries.csv | date, value | @nice-to-have |
| 2.9.3 | 정상성 검정 | timeseries.csv | value | @nice-to-have |
| 2.9.4 | Mann-Kendall 추세 | timeseries.csv | date, value | @nice-to-have |

---

## 2.10 생존분석 (survival.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.10.1 | Kaplan-Meier | survival.csv | time, event, group | @important |
| 2.10.2 | Cox 회귀 | survival.csv | time, event, group + covariates | @important |
| 2.10.3 | ROC 분석 | roc-diagnostic.csv | score, outcome | @important |

**기존 테스트 참고:** `survival-roc-e2e.spec.ts`

---

## 2.11 기타 (others.spec.ts)

| # | 메서드 | CSV | 변수 | 우선순위 |
|---|--------|-----|------|----------|
| 2.11.1 | 검정력 분석 (Power) | (파라미터 입력) | 효과크기, 표본수, α | @important |
| 2.11.2 | 신뢰도 분석 (Reliability) | factor-analysis.csv | 다수 항목 | @nice-to-have |
| 2.11.3 | 비율 검정 (Proportion) | (생성 필요) | group, outcome | @nice-to-have |
| 2.11.4 | 용량-반응 (Dose-Response) | (생성 필요) | dose, response | @nice-to-have |
| 2.11.5 | 반응표면 (Response Surface) | (생성 필요) | x1, x2, y | @nice-to-have |
| 2.11.6 | 평균 플롯 (Means Plot) | anova.csv | group, value | @nice-to-have |

---

## 세부 검증 매트릭스

Phase 2 전체 완료 후, 각 메서드에 대해 아래 세부 항목을 검증:

| 항목 | 검증 방법 | 적용 메서드 |
|------|-----------|-------------|
| **결과값 존재** | `results-main-card` 내 숫자 확인 | 전체 |
| **통계량 형식** | 정규식 매칭 (t=, F=, χ²= 등) | 전체 |
| **p-value 범위** | 0 ≤ p ≤ 1 확인 | 전체 |
| **효과크기 해석** | "작음/중간/큼" 텍스트 | t, ANOVA, 상관 |
| **가정 검정** | diagnostics-section 존재 | t, ANOVA |
| **차트 렌더링** | canvas 또는 svg 요소 존재 | 전체 |
| **대안 메서드** | alternatives-section 존재 | 전체 |
| **APA 형식** | 정규식 매칭 | 전체 |
| **내보내기** | export-dropdown 동작 | 전체 |

## 테스트 데이터 생성 필요 목록

아래 메서드는 전용 CSV가 없어 생성 필요:

| 메서드 | 필요 데이터 | 행 수 | 변수 |
|--------|-------------|-------|------|
| MANOVA | 다변량 종속 | 100+ | group, y1, y2, y3 |
| 혼합모형 | 종단 | 200+ | subject, within, between, value |
| Friedman | 반복 순위 | 30+ | subject, cond1~cond3 |
| McNemar | 전후 이분 | 50+ | before, after (0/1) |
| Cochran Q | 반복 이분 | 30+ | subject, test1~test3 (0/1) |
| 이항 검정 | 이분 | 100+ | outcome (0/1) |
| 적합도 | 범주형 | 200+ | category |
| 군집분석 | 다변량 | 150+ | x1, x2, x3 |
| 판별분석 | 그룹 + 다변량 | 100+ | group, x1, x2, x3 |
| 포아송 회귀 | 카운트 | 100+ | x1, x2, count |
| 순서형 회귀 | 순서형 결과 | 100+ | x1, x2, ordinal_y |

## 실행 시간 예상

- @critical 메서드 (13개): ~30분
- @important 메서드 (15개): ~35분
- @nice-to-have (23개): ~50분
- **전체: ~2시간**

(Pyodide 첫 로딩 ~30초, 이후 메서드당 ~1분)
