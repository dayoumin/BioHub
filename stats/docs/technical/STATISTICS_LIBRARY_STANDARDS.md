# 통계 라이브러리 개발 기준 문서
## Statistical Library Development Standards

**Version**: 1.0  
**Date**: 2025-09-11  
**목적**: 일관되고 정확한 통계 라이브러리 구현을 위한 개발 기준

---

## 🎯 핵심 원칙

### 1. **정확성 (Accuracy)**
- **기준**: R, SPSS, SciPy와 **0.0001 오차 이내** 일치
- **검증**: 모든 함수는 알려진 테스트 케이스로 검증
- **참조**: NIST StRD (Statistical Reference Datasets)

### 2. **수치적 안정성 (Numerical Stability)**
- **IEEE 754 준수**: 부동소수점 정밀도 손실 최소화
- **알고리즘 선택**: 수치적으로 안정한 알고리즘 우선 사용
- **오버플로우 방지**: 극값에서도 안정적 동작

### 3. **타입 안전성 (Type Safety)**
- **완전한 TypeScript**: `any` 타입 사용 금지
- **엄격한 인터페이스**: 모든 반환값 타입 명시
- **런타임 검증**: 입력값 유효성 검사

---

## 📊 통계 함수 표준 사양

### **A. 인터페이스 표준**

```typescript
// ✅ 표준 인터페이스 (수정 금지)
export interface DescriptiveStatistics {
  count: number
  mean: number
  median: number
  mode: number | null                    // 단일 최빈값 또는 null
  standardDeviation: number
  variance: number
  range: number
  min: number                           // minimum이 아닌 min
  max: number                           // maximum이 아닌 max
  q1: number
  q3: number
  iqr: number                           // interquartileRange가 아닌 iqr
  skewness: number
  kurtosis: number
  coefficientOfVariation: number
}

export interface StatisticalTestResult {
  testName: string
  testStatistic: number
  pValue: number
  degreesOfFreedom?: number
  effectSize?: number
  confidenceInterval: [number, number]   // optional이 아닌 required
  interpretation: string
  isSignificant: boolean                 // 추가 필수 필드
  assumptions: AssumptionCheck[]
}

export interface AssumptionCheck {
  name: string
  met: boolean
  description: string
  testStatistic?: number                 // 가정 검정 통계량
  pValue?: number                        // 가정 검정 p-값
}
```

### **B. 명명 규칙 (Naming Convention)**

```typescript
// ✅ 올바른 명명
const tStatistic = calculateTStatistic(...)  // camelCase
const degreesOfFreedom = n1 + n2 - 2        // 풀네임 사용
const confidenceInterval = [lower, upper]    // 명확한 의미

// ❌ 잘못된 명명  
const tStatistic2 = ...                      // 숫자 접미사 금지
const df = ...                               // 축약형 금지 (내부 계산 제외)
const CI = ...                               // 대문자 축약 금지
```

### **C. 수치 계산 표준**

#### **1. 분산 계산 - 웰포드 알고리즘 사용**
```typescript
function calculateVarianceWelford(data: number[]): { mean: number; variance: number } {
  let count = 0
  let mean = 0
  let m2 = 0
  
  for (const value of data) {
    if (!isFinite(value)) continue
    count++
    const delta = value - mean
    mean += delta / count
    const delta2 = value - mean
    m2 += delta * delta2
  }
  
  return {
    mean,
    variance: count > 1 ? m2 / (count - 1) : 0
  }
}
```

#### **2. 사분위수 계산 - 보간법 사용**
```typescript
function calculateQuantile(sortedData: number[], percentile: number): number {
  const index = percentile * (sortedData.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const weight = index % 1
  
  if (upper >= sortedData.length) return sortedData[sortedData.length - 1]
  return sortedData[lower] * (1 - weight) + sortedData[upper] * weight
}
```

#### **3. t-분포 CDF - 정확한 구현**
```typescript
// 참조: AS 243 알고리즘 또는 DCDFLIB
function tCDF(t: number, df: number): number {
  // 정확한 t-분포 누적분포함수 구현
  // 베타함수와 불완전베타함수 사용
}
```

---

## 🔧 구현 가이드라인

### **1. 함수 구조 표준**

```typescript
export function statisticalFunction(
  data: number[],
  options: FunctionOptions = {}
): ResultType {
  // 1. 입력 검증
  validateInput(data, options)
  
  // 2. 데이터 전처리
  const cleanData = preprocessData(data)
  
  // 3. 가정 검증
  const assumptions = checkAssumptions(cleanData, options)
  
  // 4. 계산 수행
  const result = performCalculation(cleanData, options)
  
  // 5. 결과 포맷팅 및 해석
  return formatResult(result, assumptions, options)
}
```

### **2. 에러 처리 표준**

```typescript
// ✅ 명확한 에러 메시지
if (data.length === 0) {
  throw new Error('Dataset cannot be empty')
}

if (data.length < 30) {
  console.warn('Sample size < 30: Results may be unreliable')
}

// ✅ 수치적 문제 처리
if (!isFinite(result)) {
  throw new Error('Calculation resulted in non-finite value')
}
```

### **3. 소수점 표시 표준**

```typescript
// ✅ 일관된 정밀도
const PRECISION = {
  statistics: 6,      // 기술통계: 소수점 6자리
  pValue: 6,          // p-값: 소수점 6자리  
  effect: 4,          // 효과크기: 소수점 4자리
  percentage: 2       // 백분율: 소수점 2자리
}

// 사용 예시
mean: Number(meanValue.toFixed(PRECISION.statistics))
pValue: Number(pValue.toFixed(PRECISION.pValue))
```

---

## 📋 검증 체크리스트

### **구현 전 확인사항**
- [ ] 인터페이스 정의 표준 준수
- [ ] 참조 알고리즘 확인 (R/SPSS/SciPy)
- [ ] 수치적 안정성 고려
- [ ] 테스트 케이스 준비

### **구현 중 확인사항**
- [ ] 변수명 명명 규칙 준수
- [ ] 타입 안전성 확보
- [ ] 에러 처리 구현
- [ ] 가정 검증 구현

### **구현 후 확인사항**
- [ ] 단위 테스트 통과
- [ ] 참조 구현과 결과 비교
- [ ] 극값 케이스 테스트
- [ ] 성능 측정

---

## 🧪 테스트 데이터 표준

### **기본 테스트 케이스**
```typescript
// 정규분포 근사 데이터
const normalData = [2.3, 2.7, 2.9, 3.1, 3.4, 3.7, 4.1, 4.6, 5.2, 5.8]

// 알려진 결과값
const expectedResults = {
  mean: 3.68,
  std: 1.198,
  tStatistic: 2.184, // vs μ=3, α=0.05
  pValue: 0.057
}
```

### **극값 테스트 케이스**
```typescript
// 매우 큰 수
const largeNumbers = [1e10, 1e10 + 1, 1e10 + 2]

// 매우 작은 수  
const smallNumbers = [1e-10, 2e-10, 3e-10]

// 이상치 포함
const withOutliers = [1, 2, 3, 4, 1000]
```

---

## 📚 참조 문서

### **알고리즘 참조**
- **NIST**: Engineering Statistics Handbook
- **R Project**: R Source Code Reference
- **SciPy**: Statistical Functions Documentation
- **Numerical Recipes**: 수치해석 알고리즘

### **표준 준수**
- **IEEE 754**: 부동소수점 표준
- **ISO 5725**: 정확도 및 정밀도 표준
- **ASTM E178**: 이상치 처리 표준

---

## ⚠️ 금지사항

### **절대 사용 금지**
- `any` 타입 사용
- 숫자 접미사 변수명 (`tStatistic2`)
- 하드코딩된 상수 (상수는 별도 정의)
- 검증되지 않은 근사 공식

### **주의사항**
- 부동소수점 비교 시 epsilon 사용
- 0으로 나누기 방지
- 무한루프 가능성 확인
- 메모리 누수 방지

---

## 🚀 버전 관리

### **변경 시 필수사항**
1. 이 문서 업데이트
2. 기존 테스트 재실행
3. 호환성 확인
4. 문서화 업데이트

### **승인 프로세스**
- 모든 변경사항은 이 기준 문서 기반으로 검토
- 테스트 통과 후 배포
- 성능 회귀 확인

---

**이 문서는 통계 라이브러리의 모든 개발 작업에서 반드시 준수해야 하는 기준입니다.**  
**변경사항이 있을 때마다 이 문서를 참조하여 일관성을 유지하세요.**

*Last Updated: 2025-09-11*