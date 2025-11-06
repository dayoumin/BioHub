# Phase 0: 영향 범위 분석 보고서

**작성일**: 2025-11-06
**분석 대상**: 통계 페이지 타입 안전성 현황
**목적**: `any` → `unknown` 변경 영향 예측

---

## 1. 통계 페이지 현황

### 1.1 전체 통계 페이지

**총 개수**: **41개**

```
anova, ancova, chi-square, chi-square-goodness, chi-square-independence,
cluster, correlation, cross-tabulation, descriptive, discriminant,
dose-response, explore-data, factor-analysis, frequency-table, friedman,
kruskal-wallis, ks-test, mann-kendall, mann-whitney, manova,
mcnemar, means-plot, mixed-model, non-parametric, normality-test,
one-sample-t, ordinal-regression, partial-correlation, pca, poisson,
power-analysis, proportion-test, regression, reliability, response-surface,
runs-test, sign-test, stepwise, t-test, welch-t, wilcoxon
```

---

## 2. 타입 가드 사용 현황

### 2.1 typeof 체크 사용 통계

**검색 패턴**: `typeof.*===.*'number'`

**결과**:
- **15개 페이지**에서 `typeof === 'number'` 체크 사용
- **총 18번** 사용 (일부 페이지는 2회 사용)

**사용 페이지 목록**:
1. anova (1회)
2. cluster (2회)
3. factor-analysis (1회)
4. ks-test (2회)
5. friedman (1회)
6. mann-kendall (1회)
7. mann-whitney (1회)
8. means-plot (1회)
9. mcnemar (1회)
10. ordinal-regression (1회)
11. poisson (1회)
12. reliability (2회)
13. runs-test (1회)
14. sign-test (1회)
15. wilcoxon (1회)

**비율**: 15/41 = **36.6%**

---

### 2.2 uploadedData.data 사용 통계

**검색 패턴**: `uploadedData\.data`

**결과**:
- **38개 페이지**에서 `uploadedData.data` 사용
- **총 101번** 사용

**다중 사용 페이지 (5회 이상)**:
- mcnemar: **8회**
- pca: **8회**
- runs-test: **8회**
- regression: **6회**
- factor-analysis: **5회**

**비율**: 38/41 = **92.7%**

---

## 3. 영향 분석

### 3.1 긍정적 발견

✅ **36.6%의 페이지가 이미 타입 가드 사용 중**
- 이미 `typeof === 'number'` 체크를 하고 있음
- `any` → `unknown` 변경 시 **영향 최소화**

✅ **ANOVA 페이지 검증 완료**
- Line 234-237에 이미 타입 가드 존재:
  ```typescript
  if (
    dependentValue !== null &&
    dependentValue !== undefined &&
    typeof dependentValue === 'number' &&  // ✅
    !isNaN(dependentValue) &&
    factorValue !== null &&
    factorValue !== undefined
  ) {
    // 사용
  }
  ```

### 3.2 우려 사항

⚠️ **63.4%의 페이지는 타입 가드 미사용**
- 26개 페이지가 `typeof` 체크 없음
- `any`에 의존하여 암시적 타입 변환 사용 가능성

⚠️ **92.7%의 페이지가 uploadedData.data 사용**
- 거의 모든 페이지에서 데이터 접근
- Props 타입 변경 시 **전체 페이지 영향**

---

## 4. 리스크 평가

### 4.1 높은 영향 페이지 (5회 이상 데이터 접근)

| 페이지 | uploadedData.data 사용 횟수 | typeof 체크 | 리스크 |
|--------|----------------------------|-------------|--------|
| mcnemar | 8회 | ✅ 있음 (1회) | 🟡 중간 |
| pca | 8회 | ❌ 없음 | 🔴 높음 |
| runs-test | 8회 | ✅ 있음 (1회) | 🟡 중간 |
| regression | 6회 | ❌ 없음 | 🔴 높음 |
| factor-analysis | 5회 | ✅ 있음 (1회) | 🟡 중간 |

### 4.2 리스크 분류

| 리스크 | 페이지 수 | 비율 | 설명 |
|--------|----------|------|------|
| 🟢 **낮음** | 15개 | 36.6% | typeof 체크 있음 |
| 🟡 **중간** | 11개 | 26.8% | uploadedData 사용하지만 간단 |
| 🔴 **높음** | 15개 | 36.6% | typeof 체크 없음 + 복잡한 로직 |

---

## 5. 완화 전략

### 5.1 Phase 0 수정 순서 재조정

#### **Option 1: 위험 우선** (원래 계획)
1. 타입 가드 유틸리티
2. variable-type-detector.ts
3. VariableSelector 계열
4. 파일럿 3개 (ANOVA, Regression, T-test)
5. TypeScript 검증

**문제**: Regression이 typeof 체크 없음 (🔴 높은 리스크)

#### **Option 2: 안전 우선** ✅ **추천**
1. 타입 가드 유틸리티
2. variable-type-detector.ts
3. VariableSelector 계열
4. **파일럿 3개**:
   - ✅ ANOVA (typeof 체크 있음, 검증됨)
   - ✅ T-test (단순, 낮은 리스크)
   - ✅ Mann-Whitney (typeof 체크 있음)
5. TypeScript 검증
6. 🔴 높은 리스크 페이지 개별 수정
7. 나머지 페이지

### 5.2 타입 가드 적용 패턴

#### **패턴 A: 숫자 값 접근**
```typescript
// Before (any)
const value = row[columnName]
const result = value * 2  // 암시적 변환

// After (unknown + 타입 가드)
const value = row[columnName]
if (typeof value === 'number') {
  const result = value * 2  // ✅ 안전
}
```

#### **패턴 B: 배열 반복**
```typescript
// Before (any)
for (const row of uploadedData.data) {
  const val = row[key]
  doSomething(val)
}

// After (unknown + 타입 가드)
for (const row of uploadedData.data) {
  const val = row[key]
  if (val === null || val === undefined) continue

  if (typeof val === 'number') {
    doSomething(val)
  }
}
```

#### **패턴 C: 배열 메서드**
```typescript
// Before (any)
const numbers = data.map(row => row[key])
const sum = numbers.reduce((a, b) => a + b, 0)

// After (unknown + 타입 가드)
const numbers = data
  .map(row => row[key])
  .filter((val): val is number => typeof val === 'number')
const sum = numbers.reduce((a, b) => a + b, 0)
```

---

## 6. 예상 TypeScript 에러 및 해결

### 6.1 에러 유형별 발생 예측

| 에러 유형 | 예상 발생 횟수 | 심각도 | 해결 시간 |
|----------|---------------|--------|----------|
| **Type 'unknown' is not assignable** | 50-80개 | 낮음 | 5분/개 |
| **Argument type 'unknown' is not assignable** | 20-30개 | 중간 | 10분/개 |
| **Object is of type 'unknown'** | 30-50개 | 낮음 | 3분/개 |
| **Type 'unknown' has no properties** | 10-20개 | 높음 | 15분/개 |

**총 예상 에러**: 110-180개
**총 해결 시간**: **10-15시간** (⚠️ 주의!)

### 6.2 에러 해결 자동화

**스크립트**: `scripts/fix-type-errors.js` (선택적 생성)

```javascript
// 공통 패턴 자동 수정
const fixes = [
  {
    pattern: /const (\w+) = row\[(\w+)\];?\s*if \(typeof \1 === 'number'\)/g,
    replace: 'const $1 = row[$2]; if (typeof $1 === \'number\')'
  },
  // ...
]
```

---

## 7. Phase 0 수정된 타임라인

### 7.1 기존 계획 (2.5시간)

| Step | 작업 | 시간 |
|------|------|------|
| 0.0 | 영향 분석 | 10분 |
| 0.1 | 타입 가드 | 20분 |
| 0.2 | detector | 30분 |
| 0.3 | Selector | 20분 |
| 0.4 | 파일럿 3개 | 30분 |
| 0.5 | 검증 | 10분 |
| 0.6 | 나머지 | 20분 |
| 0.7 | 최종 | 10분 |

### 7.2 현실적 계획 (4-6시간) ✅

| Step | 작업 | 시간 | 비고 |
|------|------|------|------|
| 0.0 | 영향 분석 | ✅ 10분 | 완료 |
| 0.1 | 타입 가드 | 20분 | |
| 0.2 | detector | 40분 | +10분 (에러 수정) |
| 0.3 | Selector | 30분 | +10분 (에러 수정) |
| 0.4 | 파일럿 3개 (ANOVA, T-test, Mann-Whitney) | 1시간 | +30분 (타입 에러) |
| 0.5 | 검증 1차 | 15분 | +5분 (에러 확인) |
| 0.6 | 🔴 높은 리스크 페이지 5개 | 1.5시간 | 신규 추가 |
| 0.7 | 나머지 파일 | 30분 | +10분 |
| 0.8 | 최종 검증 | 15분 | +5분 |
| **총 시간** | | **4-5시간** | |

---

## 8. 성공 기준

### 8.1 정량적 지표

- [ ] TypeScript 컴파일 에러: **0개**
- [ ] `any` 타입 사용: **0개** (grep 검색 결과)
- [ ] typeof 체크 추가: **최소 50개 이상** (기존 18개 → 68개+)
- [ ] 변경된 파일: **11개+** (8개 계획 + 파일럿 3개)

### 8.2 정성적 지표

- [ ] 모든 `uploadedData.data` 접근에 타입 가드 적용
- [ ] Early return 패턴 일관되게 사용
- [ ] 타입 좁히기 명확히 적용

---

## 9. 결론

### ✅ **발견 사항**

1. **36.6%의 페이지는 이미 타입 안전**: typeof 체크 사용 중
2. **92.7%의 페이지가 데이터 접근**: uploadedData.data 사용
3. **예상 타입 에러**: 110-180개 (10-15시간 소요 예상)

### 🚨 **주요 변경 사항**

1. **타임라인 수정**: 2.5시간 → **4-5시간**
2. **파일럿 페이지 변경**:
   - ❌ Regression (타입 체크 없음)
   - ✅ Mann-Whitney (타입 체크 있음)
3. **추가 단계**: 높은 리스크 페이지 5개 개별 수정

### ✅ **다음 단계**

**Phase 0.1 시작 준비 완료**
- 타입 가드 유틸리티 생성 (`lib/utils/type-guards.ts`)
- 예상 시간: 20분
- 리스크: 🟢 낮음

---

**작성 완료**: 2025-11-06
**다음 작업**: Phase 0.1 - 타입 가드 유틸리티 생성
**예상 Phase 0 완료**: 4-5시간
