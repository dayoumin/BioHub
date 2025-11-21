# 스마트 분석 결과 검토 보고서

## 요약

이 문서는 `SmartAnalysisEngine`의 결과 처리 적절성을 검토한 보고서입니다. **주요 발견사항: 추천 메서드와 결과 해석 메서드 간에 심각한 불일치가 존재**합니다.

## 1. 현재 구조 분석

### 1.1 SmartAnalysisEngine의 역할

`SmartAnalysisEngine`은 다음 두 가지 주요 기능을 제공합니다:

1. **`recommendAnalyses()`**: 데이터 구조를 분석하여 적절한 통계 방법 추천
2. **`interpretResults()`**: 분석 결과를 쉬운 말로 해석

### 1.2 추천 가능한 통계 방법 (9개+)

현재 `recommendAnalyses()`에서 추천 가능한 메서드:

| # | 메서드 ID | 메서드 이름 | 신뢰도 | 비고 |
|---|----------|-----------|-------|------|
| 1 | `descriptive` | 기술통계량 | high | ✅ 항상 추천 (수치형 변수 있을 때) |
| 2 | `ttest_independent` | 독립표본 t-검정 | high | 2개 그룹, 정규분포 |
| 3 | `mannwhitney` | Mann-Whitney U test | high | 2개 그룹, 비정규분포 |
| 4 | `anova_oneway` | 일원분산분석 | high | 3개+ 그룹, 정규분포 |
| 5 | `kruskal_wallis` | Kruskal-Wallis test | high | 3개+ 그룹, 비정규분포 |
| 6 | `correlation` | 상관분석 | high | 2개+ 수치형 변수 |
| 7 | `regression` | 단순선형회귀 | medium→high | 예측 키워드로 신뢰도 상승 |
| 8 | `multiple_regression` | 다중선형회귀 | medium→high | 3개+ 수치형 변수 |
| 9 | `two_way_anova` | 이원분산분석 | medium→high | 2개+ 범주형 변수 |
| 10 | `time_series` | 시계열 분석 | medium | 시간 컬럼 감지 시 |
| 11 | `chi_square` | 카이제곱 검정 | high | 2개+ 범주형 변수 |

### 1.3 결과 해석 가능한 메서드 (4개만!)

현재 `interpretResults()`에서 지원하는 메서드:

```typescript
static interpretResults(analysisType: string, results: any): PlainLanguageResult {
  switch (analysisType) {
    case '기술통계량':
      return this.interpretDescriptiveStats(results)
    case '독립표본 t-검정':
      return this.interpretTTest(results)
    case '일원분산분석':
      return this.interpretANOVA(results)
    case '상관분석':
      return this.interpretCorrelation(results)
    default:
      return {
        summary: '분석이 완료되었습니다.',
        conclusion: '결과를 확인해 주세요.',
        confidence: '추가 해석이 필요합니다.',
        effectSize: '',
        practical_meaning: '',
        next_steps: [],
        warnings: []
      }
  }
}
```

**❌ 문제점**: 11개 추천 중 **4개만 해석 가능** (36% 커버리지)

## 2. 각 메서드별 결과 형태 평가

### 2.1 ✅ 해석 가능 메서드 (4개)

#### 2.1.1 기술통계량 (`descriptive`)

**결과 형태**:
```typescript
interface DescriptiveResult {
  mean: number
  std: number
  count: number
  min: number
  max: number
  median: number
}
```

**해석 내용** (`interpretDescriptiveStats`):
- ✅ 평균, 표준편차 기반 변동성 해석
- ✅ 1SD 범위 설명 (mean ± std)
- ✅ 최소/최대/중간값 정보
- ✅ 샘플 크기 경고 (n < 30)
- ✅ Next steps 제안 (그래프, 이상값 체크, 그룹 비교)

**평가**: 🟢 **충분함** - 초보자가 이해하기 쉬운 언어로 잘 구성됨

---

#### 2.1.2 독립표본 t-검정 (`ttest_independent`)

**결과 형태**:
```typescript
interface TTestResult {
  p_value: number
  effect_size_cohens_d: number
}
```

**해석 내용** (`interpretTTest`):
- ✅ p-value 직관적 설명 ("1000번 중 1번 확률")
- ✅ Cohen's d 효과크기 해석 (작은/중간/큰 효과)
- ✅ 통계적 유의성 판단 (p < 0.05)
- ✅ 실용적 의미 설명
- ✅ Next steps 제안 (시각화, 비모수 검정, 다른 변수 확인)

**평가**: 🟢 **충분함** - 통계 지식 없는 사용자도 이해 가능

---

#### 2.1.3 일원분산분석 (`anova_oneway`)

**결과 형태**:
```typescript
interface ANOVAResult {
  p_value: number
  eta_squared: number
}
```

**해석 내용** (`interpretANOVA`):
- ✅ p-value 해석
- ✅ η² (eta squared) 효과크기 해석
- ✅ 통계적 유의성 판단
- ✅ 사후검정 필요성 강조
- ✅ Next steps 제안 (사후검정, 박스플롯, 평균 비교)

**평가**: 🟢 **충분함** - 사후검정 필요성까지 명확히 안내

---

#### 2.1.4 상관분석 (`correlation`)

**결과 형태**:
```typescript
interface CorrelationResult {
  correlation: number
  p_value: number
}
```

**해석 내용** (`interpretCorrelation`):
- ✅ 상관계수 강도 해석 (약한/중간/강한)
- ✅ 방향성 해석 (정적/부적 관계)
- ✅ 통계적 유의성 판단
- ✅ **인과관계 경고** ⚠️ 중요!
- ✅ Next steps 제안 (산점도, 회귀분석, Spearman)

**평가**: 🟢 **충분함** - 인과관계 경고가 특히 중요하고 적절함

---

### 2.2 ❌ 해석 불가 메서드 (7개)

#### 2.2.1 Mann-Whitney U test (`mannwhitney`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface MannWhitneyResult {
  statistic: number
  p_value: number
  rank_sum_1: number
  rank_sum_2: number
  effect_size_r?: number  // r = Z / sqrt(n)
}
```

**필요한 해석 내용**:
- 순위 기반 검정 설명
- p-value 해석
- 효과크기 (rank-biserial correlation or r)
- t-test vs Mann-Whitney 선택 이유
- Next steps: 중앙값 비교, 박스플롯

**사용자가 원하는 결과**: "두 그룹의 중앙값이 다른가요?" → ✅/❌ + 쉬운 설명

**현재 문제**: 추천은 하지만 결과 해석을 제공하지 않음

---

#### 2.2.2 Kruskal-Wallis test (`kruskal_wallis`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface KruskalWallisResult {
  statistic: number  // H statistic
  p_value: number
  df: number
  effect_size_epsilon?: number  // ε² (epsilon squared)
}
```

**필요한 해석 내용**:
- 여러 그룹 중앙값 비교 설명
- p-value 해석
- 효과크기 설명
- 사후검정 (Dunn's test) 필요성 강조
- Next steps: 비모수 사후검정, 중앙값 비교

**사용자가 원하는 결과**: "여러 그룹 중 차이가 있는 그룹이 있나요?" → ✅/❌ + 사후검정 안내

---

#### 2.2.3 단순선형회귀 (`regression`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface RegressionResult {
  slope: number
  intercept: number
  r_squared: number
  p_value: number
  std_error: number
  predictions?: number[]
}
```

**필요한 해석 내용**:
- 회귀식 설명 (Y = aX + b)
- R² 설명력 해석 ("X가 Y의 변동을 N% 설명")
- 기울기 의미 ("X가 1 증가하면 Y는 N 증가")
- 예측 가능성 평가
- Next steps: 잔차 분석, 예측 구간, 모델 검증

**사용자가 원하는 결과**: "X로 Y를 예측할 수 있나요? 얼마나 정확하나요?" → R² + 회귀식

---

#### 2.2.4 다중선형회귀 (`multiple_regression`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface MultipleRegressionResult {
  coefficients: Record<string, number>
  intercept: number
  r_squared: number
  adjusted_r_squared: number
  p_values: Record<string, number>
  vif?: Record<string, number>  // Variance Inflation Factor
}
```

**필요한 해석 내용**:
- 각 변수의 기여도 설명
- Adjusted R² 설명 (변수 개수 고려)
- 유의한 변수 vs 무의미한 변수 구분
- 다중공선성 경고 (VIF > 10)
- Next steps: 변수 선택, 모델 비교

**사용자가 원하는 결과**: "어떤 변수가 가장 중요한가요?" → 계수 순위 + 유의성

---

#### 2.2.5 이원분산분석 (`two_way_anova`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface TwoWayANOVAResult {
  main_effect_1: { f_statistic: number; p_value: number }
  main_effect_2: { f_statistic: number; p_value: number }
  interaction_effect: { f_statistic: number; p_value: number }
  effect_sizes: {
    eta_squared_1: number
    eta_squared_2: number
    eta_squared_interaction: number
  }
}
```

**필요한 해석 내용**:
- 주효과 1, 2 각각 설명
- **상호작용 효과** 강조 (가장 중요!)
- "A와 B가 함께 영향을 주나요?" 해석
- Next steps: 단순주효과 분석, 그래프

**사용자가 원하는 결과**: "두 요인이 함께 작용하나요?" → 상호작용 유무 + 시각화 필요성

---

#### 2.2.6 시계열 분석 (`time_series`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface TimeSeriesResult {
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality: boolean
  forecast?: number[]
  change_rate?: number  // % per period
}
```

**필요한 해석 내용**:
- 트렌드 방향 설명
- 계절성 유무
- 변화율 ("매월 N% 증가/감소")
- 예측값 제시
- Next steps: ARIMA, 이상치 탐지

**사용자가 원하는 결과**: "시간에 따라 증가하나요/감소하나요?" → 트렌드 + 예측

---

#### 2.2.7 카이제곱 검정 (`chi_square`)

**현재 상태**: ❌ **해석 메서드 없음**

**필요한 결과 형태**:
```typescript
interface ChiSquareResult {
  statistic: number
  p_value: number
  df: number
  contingency_table: number[][]
  effect_size_cramers_v?: number
}
```

**필요한 해석 내용**:
- 독립성 검정 설명 ("두 범주가 관련이 있나요?")
- p-value 해석
- Cramér's V 효과크기
- 교차표 패턴 설명
- Next steps: 잔차 분석, 셀별 기여도

**사용자가 원하는 결과**: "성별에 따라 선호도가 다른가요?" → ✅/❌ + 교차표

---

## 3. 실제 사용 현황 조사

### 3.1 SmartAnalysisEngine 사용 여부

**조사 결과**: `SmartAnalysisEngine`은 **실제 분석 페이지에서 사용되지 않음**!

#### 증거 1: t-test 페이지 확인

[`app/(dashboard)/statistics/t-test/page.tsx`](file:///d:/Projects/Statics/statistical-platform/app/(dashboard)/statistics/t-test/page.tsx)를 분석한 결과:

```typescript
// SmartAnalysisEngine import 없음
// 대신 PyodideCoreService 직접 사용
const pyodideCore = PyodideCoreService.getInstance()
const workerResult = await pyodideCore.callWorkerMethod(
  PyodideWorker.Hypothesis, 
  't_test_two_sample', 
  { group1: group1Data, group2: group2Data }
)
```

**결과 처리 방식**:
- ❌ `SmartAnalysisEngine.interpretResults()` 사용 안 함
- ✅ 직접 결과를 UI에 렌더링 ([line 551-697](file:///d:/Projects/Statics/statistical-platform/app/(dashboard)/statistics/t-test/page.tsx#L551-L697))
- ✅ `interpretEffectSize()` 함수로 Cohen's d 해석 ([line 274-280](file:///d:/Projects/Statics/statistical-platform/app/(dashboard)/statistics/t-test/page.tsx#L274-L280))

#### 증거 2: grep 검색 결과

`SmartAnalysisEngine` 사용처:
- ✅ `lib/smart-analysis-engine.ts` (정의)
- ✅ `scripts/test-smart-analysis.ts` (테스트 전용)
- ✅ `scripts/test-edge-cases-smart-analysis.ts` (테스트 전용)
- ❌ **실제 분석 페이지 없음**

### 3.2 아키텍처 불일치 문제

```
사용자
  ↓
분석 페이지 (t-test/anova/regression)
  ↓
PyodideCoreService
  ↓
Python Worker
  ↓
결과 반환
  ↓
UI 직접 렌더링 ✅

SmartAnalysisEngine (별도)
  ├─ recommendAnalyses (추천만 사용?)
  └─ interpretResults (미사용 ❌)
```

**문제점**:
1. `SmartAnalysisEngine`은 추천 시스템으로만 사용될 가능성
2. `interpretResults()`는 **전혀 사용되지 않는 코드** (dead code)
3. 각 분석 페이지가 **중복된 해석 로직**을 개별 구현

## 4. 적절성 평가

### 4.1 현재 구현의 문제점

| 문제 영역 | 심각도 | 설명 |
|---------|-------|------|
| **커버리지 부족** | 🔴 높음 | 11개 추천 중 4개만 해석 가능 (36%) |
| **코드 중복** | 🟡 중간 | 각 페이지마다 해석 로직 재구현 |
| **일관성 부족** | 🟡 중간 | 페이지별로 다른 해석 스타일 |
| **유지보수성** | 🟡 중간 | 해석 로직 변경 시 여러 곳 수정 필요 |
| **사용자 경험** | 🟠 낮음 | 일부 메서드는 쉬운 설명 부족 |

### 4.2 메서드별 충분성 평가

#### ✅ 충분한 메서드 (4개)
- `기술통계량`: 평균/분산/범위 충분히 설명, next steps 명확
- `독립표본 t-검정`: p-value, 효과크기, 실용적 의미 모두 제공
- `일원분산분석`: η² 설명, 사후검정 안내 명확
- `상관분석`: 상관계수 해석, **인과관계 경고** 포함 (중요!)

#### ❌ 불충분한 메서드 (7개)
- `Mann-Whitney U`, `Kruskal-Wallis`: 비모수 검정 결과 default 메시지만 ("결과를 확인해 주세요")
- `회귀분석` (단순/다중): R² 설명 없음, 계수 해석 없음
- `이원분산분석`: **상호작용 효과** 해석 없음 (가장 중요한 부분!)
- `시계열 분석`: 트렌드/계절성 설명 없음
- `카이제곱 검정`: 독립성 해석 없음

## 5. 사용자가 원하는 결과 충족 여부

### 5.1 초보 사용자 (통계 지식 없음)

**기대사항**:
> "이 분석으로 뭘 알 수 있어요? 결과가 좋은 건가요 나쁜 건가요?"

**현재 제공** (해석 가능 메서드만):
- ✅ 쉬운 언어로 설명 (emoji 사용, "1000번 중 1번 확률")
- ✅ ✅/❌ 명확한 결론
- ✅ 다음 단계 제안

**미제공** (7개 메서드):
- ❌ 기본 해석만 ("분석이 완료되었습니다")
- ❌ p-value 숫자만 보임 → 의미 모름
- ❌ 다음에 뭘 해야 할지 모름

**충족도**: 🔴 **36% (4/11 메서드만)**

### 5.2 중급 사용자 (통계 기초 지식 있음)

**기대사항**:
> "효과크기는 얼마나 되나요? 가정은 만족하나요?"

**현재 제공**:
- ✅ Cohen's d, η² 해석 (t-test, ANOVA)
- ⚠️ 가정 검정 결과는 **Python worker에서만 제공** (해석 미포함)
- ❌ 회귀분석 R², VIF 해석 없음
- ❌ 비모수 검정 효과크기 없음

**충족도**: 🟡 **부분 충족 (주요 메서드만)**

### 5.3 전문가 (통계학자, 연구자)

**기대사항**:
> "통계량, 자유도, 신뢰구간, 잔차 분석 결과 모두 필요"

**현재 제공**:
- ✅ PyodideWorker에서 상세 통계량 반환
- ✅ 각 분석 페이지에서 직접 렌더링
- ❌ `interpretResults()`는 전문가용 정보 부족

**충족도**: 🟢 **충족 (interpretResults 불필요, 원본 데이터 사용)**

## 6. 개선 권장사항

### 6.1 우선순위 1: 누락된 해석 메서드 추가

```typescript
// 추가 필요 메서드
static interpretMannWhitney(results: any): PlainLanguageResult
static interpretKruskalWallis(results: any): PlainLanguageResult
static interpretRegression(results: any): PlainLanguageResult
static interpretMultipleRegression(results: any): PlainLanguageResult
static interpretTwoWayANOVA(results: any): PlainLanguageResult
static interpretTimeSeries(results: any): PlainLanguageResult
static interpretChiSquare(results: any): PlainLanguageResult
```

**예상 작업량**: 각 메서드당 50-100 lines → 총 **350-700 lines**

### 6.2 우선순위 2: 실제 페이지에 적용

현재 각 분석 페이지가 개별로 해석하는 코드를:

```typescript
// Before: t-test/page.tsx
const interpretEffectSize = (d: number) => {
  const abs = Math.abs(d)
  if (abs >= 0.8) return '큰 효과'
  // ...
}
```

`SmartAnalysisEngine`으로 통합:

```typescript
// After: t-test/page.tsx
const interpretation = SmartAnalysisEngine.interpretResults('독립표본 t-검정', results)
// interpretation.summary, conclusion, effectSize, next_steps 사용
```

**장점**:
- ✅ 일관된 해석 스타일
- ✅ 유지보수 용이 (한 곳만 수정)
- ✅ 다국어 지원 용이

### 6.3 우선순위 3: 결과 인터페이스 표준화

현재 각 Python worker가 다른 형식으로 결과 반환 → 표준 인터페이스 정의:

```typescript
interface StandardStatisticalResult {
  method: string
  statistic: number
  p_value: number
  effect_size: {
    value: number
    type: 'cohens_d' | 'eta_squared' | 'cramers_v' | 'r' | 'r_squared'
    interpretation: string
  }
  confidence_interval?: [number, number]
  assumptions?: Record<string, { met: boolean; value: number }>
  next_steps: string[]
}
```

### 6.4 우선순위 4: 사용자 수준별 해석 활용

이미 구현된 `getExplanationLevel()` 활용:

```typescript
const interpretation = SmartAnalysisEngine.interpretResults('독립표본 t-검정', results)
const userLevel = getUserPreference() // 'beginner' | 'intermediate' | 'expert'
const tailored = SmartAnalysisEngine.getExplanationLevel(userLevel, interpretation)
```

## 7. 결론

### 7.1 현재 상태 요약

| 항목 | 평가 | 비고 |
|-----|------|-----|
| **추천 기능** | 🟢 우수 | 11개 메서드 적절히 추천, 데이터 품질 체크 포함 |
| **해석 기능** | 🔴 불충분 | 36% 커버리지 (4/11) |
| **실제 사용** | 🔴 미사용 | 분석 페이지에서 `interpretResults()` 사용 안 함 |
| **사용자 경험** | 🟡 부분충족 | 주요 메서드(t-test, ANOVA)만 쉬운 설명 제공 |

### 7.2 최종 판정

> ❌ **현재 스마트 분석 결과는 사용자가 원하는 결과를 얻기에 불충분합니다.**

**이유**:
1. **커버리지 부족**: 추천되는 11개 메서드 중 64%는 기본 메시지만 표시
2. **실제 미사용**: `interpretResults()`가 실제 분석 페이지에서 사용되지 않음
3. **일관성 부족**: 각 페이지마다 다른 방식으로 결과 해석
4. **초보자 경험**: 회귀분석, 비모수 검정 등 중요 메서드에 쉬운 설명 없음

### 7.3 권장 조치

#### 즉시 조치 (High Priority)
1. ✅ 누락된 7개 해석 메서드 구현
   - Mann-Whitney U, Kruskal-Wallis (비모수)
   - 회귀분석 (단순/다중)
   - 이원분산분석, 시계열, 카이제곱

2. ✅ 실제 분석 페이지에 `interpretResults()` 통합
   - 중복 코드 제거
   - 일관된 사용자 경험

#### 중기 조치 (Medium Priority)
3. ⚠️ 결과 인터페이스 표준화
   - Python worker 출력 형식 통일
   - 효과크기, 가정 검정 자동 포함

4. ⚠️ 사용자 수준별 해석 UI 구현
   - 초보/중급/전문가 모드 토글
   - `getExplanationLevel()` 활용

#### 장기 조치 (Low Priority)
5. 📊 시각화 추천 자동화
   - 메서드별 적절한 그래프 제안
   - 자동 차트 생성

6. 🌐 다국어 지원
   - 해석 메시지 i18n 처리

---

**문서 작성일**: 2025-11-21  
**검토 대상**: `lib/smart-analysis-engine.ts` (756 lines)  
**테스트 파일**: `scripts/test-smart-analysis.ts` (849 lines)
