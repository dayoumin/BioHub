# 통계 페이지 변수 선택 요구사항 분석

**생성일**: 2025-11-05
**생성 도구**: `scripts/statistics/analyze-variable-requirements.js`

---

## 📊 Executive Summary

| 지표 | 값 | 비율 |
|------|----|----|
| 전체 페이지 | 41개 | 100% |
| VariableSelector 사용 | 36개 | 88% |
| VariableSelector 미사용 | 5개 | 12% |
| **unknown 타입 사용** | **2개** | **6%** ⚠️ |
| 런타임 검증 로직 | 4개 | 11% |
| 표준 요구사항 준수 | 2개 | 6% |

## 🔍 주요 발견사항

### 1. ✅ 강점
- VariableSelector API 표준화: 36개 페이지에서 일관된 props 사용
- methodId prop 전달: 모든 페이지에서 명확한 식별자 사용

### 2. ⚠️  개선 필요
- **타입 안전성 부족**: 2개 페이지에서 `unknown` 타입 사용
- **런타임 검증 부족**: 32개 페이지에서 변수 개수/타입 검증 없음
- **표준 불일치**: 34개 페이지에서 표준 요구사항과 불일치

---

## 📋 통계 기법별 상세 분석

### 기초 통계 (2개)

#### frequency-table

**표준 요구사항**:
- `all`: 1+
- `type`: categorical
- **설명**: 빈도표 생성을 위한 범주형 변수

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### descriptive

**표준 요구사항**:
- `all`: 2+
- `type`: numeric
- **설명**: 기술통계량 계산을 위한 숫자형 변수

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

### T-검정 (1개)

#### t-test

**표준 요구사항**:
- `dependent`: 1
- `groups`: 2
- `type`: numeric
- **설명**: 두 집단 평균 비교

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

### 분산분석 (3개)

#### manova

**표준 요구사항**:
- `dependent`: 2+
- `independent`: 1
- `type`: numeric/categorical
- **설명**: 다변량 분산분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ✅ 있음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 표준 요구사항에 맞게 props 수정

---

#### anova

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1
- `type`: numeric/categorical
- **설명**: 일원 분산분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### ancova

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1
- `covariates`: 1+
- `type`: numeric/categorical
- **설명**: 공분산분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ✅ 있음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 표준 요구사항에 맞게 props 수정

---

### 상관분석 (2개)

#### partial-correlation

**표준 요구사항**:
- `all`: 2+
- `location`: 0-1
- `type`: numeric
- **설명**: 편상관분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`, `location`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### correlation

**표준 요구사항**:
- `all`: 2+
- `type`: numeric
- **설명**: 상관분석 (Pearson, Spearman)

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `VariableSelection` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

### 회귀분석 (4개)

#### stepwise

**표준 요구사항**:
- `dependent`: 1
- `independent`: 2+
- `type`: numeric
- **설명**: 단계적 회귀분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### regression

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1+
- `type`: numeric
- **설명**: 선형/로지스틱 회귀분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### ordinal-regression

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1+
- `type`: ordinal/numeric
- **설명**: 순서형 회귀분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### mixed-model

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1+
- `type`: numeric/categorical
- **설명**: 혼합효과 모델

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ✅ 있음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 표준 요구사항에 맞게 props 수정

---

### 카이제곱 검정 (2개)

#### mcnemar

**표준 요구사항**:
- `groups`: 2
- `type`: categorical
- **설명**: McNemar 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### chi-square

**표준 요구사항**:
- `rows`: 2+
- `columns`: 2+
- `type`: categorical
- **설명**: Fisher 정확 검정

**현재 구현**:
- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)

**표준 준수**:
- ✅ 표준 준수

---

### 비모수 검정 (3개)

#### sign-test

**표준 요구사항**:
- `dependent`: 1
- `type`: numeric
- **설명**: 부호 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### non-parametric

**표준 요구사항**:
- `dependent`: 1
- `groups`: 2+
- `type`: numeric
- **설명**: 비모수 검정 (Mann-Whitney, Kruskal-Wallis)

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### friedman

**표준 요구사항**:
- `dependent`: 1
- `conditions`: 3+
- `type`: numeric
- **설명**: Friedman 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

### 정규성/검정력 (2개)

#### power-analysis

**표준 요구사항**:
- `none`: true
- **설명**: 검정력 분석 (직접 입력)

**현재 구현**:
- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)

**표준 준수**:
- ✅ 표준 준수

---

#### normality-test

**표준 요구사항**:
- `all`: 1+
- `type`: numeric
- **설명**: 정규성 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

### 다변량 분석 (4개)

#### pca

**표준 요구사항**:
- `all`: 2+
- `type`: numeric
- **설명**: 주성분 분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `VariableAssignment` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### factor-analysis

**표준 요구사항**:
- `all`: 3+
- `type`: numeric
- **설명**: 요인분석

**현재 구현**:
- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 표준 요구사항에 맞게 props 수정

---

#### discriminant

**표준 요구사항**:
- `dependent`: 1
- `independent`: 2+
- `type`: categorical/numeric
- **설명**: 판별분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ⚠️
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- `unknown` → 명확한 인터페이스 타입으로 변경
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### cluster

**표준 요구사항**:
- `all`: 2+
- `type`: numeric
- **설명**: 군집분석

**현재 구현**:
- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `all`

**개선 권장사항**:
- 표준 요구사항에 맞게 props 수정

---

### 실험설계 (3개)

#### response-surface

**표준 요구사항**:
- `dependent`: 1
- `independent`: 2+
- `type`: numeric
- **설명**: 반응표면 분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### dose-response

**표준 요구사항**:
- `dose`: 1
- `response`: 1
- `type`: numeric
- **설명**: 용량-반응 분석

**현재 구현**:
- VariableSelector: ❌ 미사용 (직접 입력 또는 데이터 업로드만)

**표준 준수**:
- ✅ 표준 준수

---

#### cross-tabulation

**표준 요구사항**:
- `row`: 1
- `column`: 1
- `type`: categorical
- **설명**: 교차표 분석

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ✅ 표준 준수

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

### 기타 (15개)

#### wilcoxon_signed_rank

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (wilcoxon_signed_rank)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### welch-t

**표준 요구사항**:
- `dependent`: 1
- `groups`: 2
- `type`: numeric
- **설명**: Welch t-검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### runsTest

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ⚠️
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (runsTest)

**개선 권장사항**:
- `unknown` → 명확한 인터페이스 타입으로 변경
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### reliability

**표준 요구사항**:
- `items`: 2+
- `type`: numeric
- **설명**: Cronbach 알파 신뢰도

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `VariableAssignment` ✅
- 검증 로직: ✅ 있음

**표준 준수**:
- ✅ 표준 준수

---

#### proportion-test

**표준 요구사항**:
- `groups`: 1-2
- `type`: categorical
- **설명**: 비율 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### poisson

**표준 요구사항**:
- `dependent`: 1
- `independent`: 1+
- `type`: count/numeric
- **설명**: 포아송 회귀

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `independent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### one-sample-t

**표준 요구사항**:
- `dependent`: 1
- `type`: numeric
- **설명**: 단일 표본 평균 검정

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### means-plot

**표준 요구사항**:
- `dependent`: 1
- `groups`: 1+
- `type`: numeric/categorical
- **설명**: 평균 그래프

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ❌ Props 불일치
- 누락된 props: `dependent`, `groups`

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)
- 표준 요구사항에 맞게 props 수정

---

#### mann_whitney

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (mann_whitney)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### mann-kendall-test

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (mann-kendall-test)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### kolmogorovSmirnov

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `VariableSelection` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (kolmogorovSmirnov)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### kruskal_wallis

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (kruskal_wallis)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### explore_data

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (explore_data)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### chi_square_independence

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (chi_square_independence)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

#### chi_square_goodness

**표준 요구사항**: ⚠️  미정의

**현재 구현**:
- VariableSelector: ✅ 사용
- Props: 없음
- 타입: `unknown` ✅
- 검증 로직: ❌ 없음

**표준 준수**:
- ⚠️  표준 요구사항 미정의 (chi_square_goodness)

**개선 권장사항**:
- 런타임 검증 로직 추가 (변수 개수, 타입 확인)

---

## 🚀 다음 단계

### Phase A-2: 타입 안전성 개선
- **대상**: 2개 페이지
- **작업**: `unknown` → `VariableSelection` 인터페이스
- **예상 시간**: 1.5시간

### Phase A-3: 런타임 검증 추가
- **대상**: 32개 페이지
- **작업**: `validateVariables()` 유틸 함수 적용
- **예상 시간**: 1.5시간

---

## 🔗 관련 문서

- [STATISTICS_PAGES_VERIFICATION_PLAN.md](./STATISTICS_PAGES_VERIFICATION_PLAN.md) - 전체 검증 계획
- [STATISTICS_PAGE_CODING_STANDARDS.md](./STATISTICS_PAGE_CODING_STANDARDS.md) - 코딩 표준
- [VARIABLE_SELECTION_SPECIFICATION.md](./VARIABLE_SELECTION_SPECIFICATION.md) - 변수 선택 명세서 (Phase A-1-2에서 생성)
