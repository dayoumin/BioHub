# 통계 페이지 일괄 리팩토링 계획

## 목표
42개 통계 분석 페이지에 `useStatisticsPage` 커스텀 훅 적용

## 패턴 분류 (Agent가 자동으로 탐지)

### Pattern A: UploadedData (27개)
**특징:**
- `uploadedData` state 사용
- `selectedVariables` state 사용
- `error` state 사용 (선택적)

**파일 목록:**
- t-test, anova, ancova, regression, correlation
- manova, mixed-model, repeated-measures
- chi-square-goodness, chi-square-independence
- kruskal-wallis, mann-whitney, friedman, wilcoxon
- factor-analysis, pca, cluster, discriminant
- poisson, ordinal-regression, stepwise
- three-way-anova, two-way-anova, welch-t
- sign-test, runs-test, mcnemar, ks-test

### Pattern B: VariableMapping (10개)
**특징:**
- `variableMapping` state만 사용
- 업로드 데이터 없음

**파일 목록:**
- descriptive (✅ 완료)
- cross-tabulation, frequency-table
- normality-test, proportion-test
- reliability, chi-square, one-sample-t
- non-parametric, explore-data

### Pattern C: Custom (5개)
**특징:**
- 특수한 state 구조
- 수동 적용 필요

**파일 목록:**
- means-plot, power-analysis, dose-response
- mann-kendall, response-surface

---

## 변환 규칙 (Agent가 자동 적용)

### 1. Import 추가
```typescript
// Before
import { useState } from 'react'

// After
import { useState } from 'react'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
```

### 2. State 선언 변환 (Pattern A)
```typescript
// Before
const [currentStep, setCurrentStep] = useState(0)
const [uploadedData, setUploadedData] = useState<DataRow[] | null>(null)
const [selectedVariables, setSelectedVariables] = useState<VariableAssignment | null>(null)
const [analysisResult, setAnalysisResult] = useState<TTestResult | null>(null)
const [isAnalyzing, setIsAnalyzing] = useState(false)
const [error, setError] = useState<string | null>(null)

// After
const { state, actions } = useStatisticsPage<TTestResult>({
  withUploadedData: true,
  withError: true
})
const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state
```

### 3. Setter 호출 변환
```typescript
// Before
setIsAnalyzing(true)
setError(null)

// After
actions.startAnalysis()

// Before
setResults(result)
setIsAnalyzing(false)
setCurrentStep(3)

// After
actions.completeAnalysis(result, 3)

// Before
setUploadedData(data)

// After
actions.setUploadedData(data)

// Before
setCurrentStep(step)

// After
actions.setCurrentStep(step)
```

### 4. 초기화 로직 변환
```typescript
// Before
setCurrentStep(0)
setUploadedData(null)
setSelectedVariables(null)
setResults(null)
setError(null)

// After
actions.reset()
```

---

## Agent 작업 지시사항

### Phase 1: Pattern B 완료 (9개, 1시간)
**파일:**
- cross-tabulation, frequency-table
- normality-test, proportion-test
- reliability, chi-square, one-sample-t
- non-parametric, explore-data

**작업:**
1. descriptive 페이지 패턴 참고
2. Import 추가
3. State 선언 변환
4. Setter 호출 변환
5. TypeScript 컴파일 검증

### Phase 2: Pattern A 완료 (27개, 2-3시간)
**파일:** 위의 Pattern A 목록

**작업:**
1. t-test 페이지 먼저 변환 (PoC)
2. 패턴 확인 후 나머지 26개 일괄 적용
3. 각 5개씩 배치로 작업 (에러 최소화)
4. TypeScript 컴파일 검증 (각 배치마다)

### Phase 3: Pattern C 수동 작업 (5개, 1시간)
**파일:** means-plot, power-analysis 등

**작업:**
1. 각 페이지 구조 분석
2. 커스텀 로직 유지하면서 훅 적용
3. 수동 검증

---

## 검증 체크리스트

각 배치 작업 후:
- [ ] TypeScript 컴파일 성공 (`npx tsc --noEmit`)
- [ ] Import 경로 정확성
- [ ] State 변수명 일치 (results vs analysisResult 등)
- [ ] Actions 메서드 올바른 사용

---

## 주의사항

### 1. 변수명 불일치
일부 페이지는 `results` 대신 다른 이름 사용:
- `analysisResult` (t-test)
- `analysisResults` (anova)
- `testResults` (chi-square)

**해결**: destructuring에서 rename
```typescript
const { results: analysisResult } = state
```

### 2. 페이지 특정 State 유지
커스텀 훅으로 대체되지 않는 state:
- `activeTab` (t-test, descriptive)
- `testValue` (one-sample-t)
- `confidenceLevel` (descriptive)

**해결**: 별도 useState로 유지

### 3. Results 타입 정의
각 페이지마다 Result 인터페이스가 다름
- TTestResult, DescriptiveResults, ANOVAResults 등

**해결**: 제네릭에 정확한 타입 지정
```typescript
useStatisticsPage<TTestResult>()
useStatisticsPage<ANOVAResults>()
```

---

## 예상 효과

**코드 감소:**
- 42페이지 × 평균 5줄 = -210 lines (state 선언)
- 42페이지 × 평균 10줄 = -420 lines (setter 호출)
- **총 -630 lines** (약 30% 코드 감소)

**품질 향상:**
- 일관된 State 관리 API
- 타입 안전성 강화
- 유지보수성 ⬆️⬆️⬆️
