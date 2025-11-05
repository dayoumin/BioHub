# 실제 변수 사용 패턴 분석 리포트

**생성일**: 2025-11-05
**목적**: types/statistics.ts 타입 정의를 실제 코드 사용 패턴에 맞게 수정

---

## 📊 요약

| 패턴 | 개수 | 비율 | 설명 |
|------|------|------|------|
| A-Array | 2개 | 5.3% | selectedVariables를 string[] 배열처럼 사용 |
| B-Object | 1개 | 2.6% | selectedVariables를 객체로 사용 (필드 접근) |
| C-Mixed | 0개 | 0.0% | - |
| D-Direct | 23개 | 60.5% | selectedVariables를 함수에 직접 전달 |
| E-NoUsage | 12개 | 31.6% | selectedVariables 사용 코드 없음 |

**총 분석 페이지**: 38개

---

## 🔍 패턴별 상세


### A-Array 패턴 (2개)

**설명**: selectedVariables를 string[] 배열처럼 사용

**권장 사항**: string[] 타입 사용

**해당 페이지**:

#### factor-analysis

- **Hook 타입 파라미터**: `string[]`
- **배열 사용** (1건):
  - Line 81: `status: selectedVariables && selectedVariables.length > 0 ? 'completed'`

#### cluster

- **Hook 타입 파라미터**: `string[]`
- **배열 사용** (1건):
  - Line 75: `status: selectedVariables && selectedVariables.length > 0 ? 'completed'`


### B-Object 패턴 (1개)

**설명**: selectedVariables를 객체로 사용 (필드 접근)

**권장 사항**: { dependent?: string[], independent?: string[], ... } 타입 사용

**해당 페이지**:

#### chi-square-goodness

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string[]
  [key: string]: string | string[] | undefined
```
- **객체 필드 접근** (1건):
  - Line 189: `if (!uploadedData?.data || !selectedVariables?.dependent || selectedVariables.dependent.length === 0) {`


### D-Direct 패턴 (23개)

**설명**: selectedVariables를 함수에 직접 전달

**권장 사항**: 함수 시그니처 확인 필요

**해당 페이지**:

#### anova

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string
  independent: string[]
  covariates?: string[]
  [key: string]: string | string[] | undefined
```

#### correlation

- **Hook 타입 파라미터**: `VariableSelection`

#### partial-correlation

- **Hook 타입 파라미터**: `VariableAssignment`

#### regression

- **Hook 타입 파라미터**: `RegressionVariables`

#### stepwise

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string[]
  factor: string[]
  covariate?: string[]
```

#### ordinal-regression

- **Hook 타입 파라미터**: `none`

#### mixed-model

- **Hook 타입 파라미터**: `VariableAssignment`

#### chi-square-independence

- **Hook 타입 파라미터**: `VariableAssignment`

#### mcnemar

- **Hook 타입 파라미터**: `string[]`

#### non-parametric

- **Hook 타입 파라미터**: `VariableMapping`

#### mann-whitney

- **Hook 타입 파라미터**: `VariableAssignment`

#### kruskal-wallis

- **Hook 타입 파라미터**: `VariableAssignment`

#### wilcoxon

- **Hook 타입 파라미터**: `VariableAssignment`

#### friedman

- **Hook 타입 파라미터**: `VariableAssignment`

#### sign-test

- **Hook 타입 파라미터**: `none`

#### runs-test

- **Hook 타입 파라미터**: `string[]`

#### ks-test

- **Hook 타입 파라미터**: `VariableSelection`

#### reliability

- **Hook 타입 파라미터**: `VariableAssignment`

#### pca

- **Hook 타입 파라미터**: `VariableSelection`

#### discriminant

- **Hook 타입 파라미터**: `VariableSelection`

#### cross-tabulation

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string
  independent: string
```

#### poisson

- **Hook 타입 파라미터**: `none`

#### means-plot

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string[]
  factor: string[]
  covariate?: string[]
```


### E-NoUsage 패턴 (12개)

**설명**: selectedVariables 사용 코드 없음

**권장 사항**: any 타입 가능

**해당 페이지**:

#### descriptive

- **Hook 타입 파라미터**: `none`

#### frequency-table

- **Hook 타입 파라미터**: `VariableMapping`

#### one-sample-t

- **Hook 타입 파라미터**: `OneSampleTVariables`

#### welch-t

- **Hook 타입 파라미터**: `VariableMapping`

#### ancova

- **Hook 타입 파라미터**: `VariableAssignment`

#### manova

- **Hook 타입 파라미터**: `VariableAssignment`

#### chi-square

- **Hook 타입 파라미터**: `null`

#### normality-test

- **Hook 타입 파라미터**: `NormalityTestVariables`

#### proportion-test

- **Hook 타입 파라미터**: `VariableMapping`

#### mann-kendall

- **Hook 타입 파라미터**: `none`

#### response-surface

- **Hook 타입 파라미터**: `SelectedVariables`
- **로컬 인터페이스**: `SelectedVariables`
```typescript
dependent: string[]
  factor: string[]
```

#### dose-response

- **Hook 타입 파라미터**: `never`


---

## 💡 수정 권장사항

### 1. types/statistics.ts 수정


#### Pattern A (배열 사용) - 2개

이 페이지들은 `selectedVariables`를 `string[]` 배열로 사용합니다.

**해당 메서드**:
- factor-analysis
- cluster

**타입 정의 수정**:
```typescript
// 현재 (잘못됨):
export interface ClusterVariables {
  all: string[]  // 객체 구조
}

// 수정 후 (올바름):
export type ClusterVariables = string[]  // 직접 배열
```

#### Pattern B (객체 사용) - 1개

이 페이지들은 `selectedVariables`를 객체로 사용합니다. 현재 타입이 올바릅니다.

**해당 메서드**:
- chi-square-goodness

### 2. 페이지 코드 수정

- **Pattern A** 페이지: 타입 정의만 수정하면 됨
- **Pattern B** 페이지: 수정 불필요 (이미 올바름)
- **Pattern C** 페이지: 코드 리팩토링 필요 (배열 또는 객체 중 선택)

---

**생성**: AI 자동 분석
