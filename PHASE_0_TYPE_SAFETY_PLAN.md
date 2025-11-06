# Phase 0: 타입 안전성 개선 계획

**목표**: AI 코딩 규칙 준수 - `any` 타입 완전 제거
**우선순위**: 🚨 CRITICAL (Phase 1 시작 전 필수)
**예상 시간**: 1-2시간

---

## 1. 현재 상황

### 1.1 CLAUDE.md 규칙 위반 사항

```typescript
// ❌ 절대 금지
data: Record<string, any>[]

// ✅ 필수 사용
data: Record<string, unknown>[]
```

### 1.2 영향 받는 파일 (8개)

1. `components/variable-selection/VariableSelector.tsx`
2. `components/variable-selection/VariableSelectorPremium.tsx`
3. `components/variable-selection/VariableSelectorSimple.tsx`
4. `lib/services/variable-type-detector.ts`
5. `hooks/use-statistics-worker.ts`
6. `lib/services/worker-manager.ts`
7. `lib/data-validation.ts`
8. `STATISTICAL_PAGE_TEMPLATE.md` (문서)

---

## 2. 변경 전략

### 2.1 타입 정의 수정

#### **Before**:
```typescript
// Props
interface VariableSelectorProps {
  data: Record<string, any>[]  // ❌
}

// 함수
function analyzeDataset(data: Record<string, any>[]): DatasetAnalysis {
  // ❌
}
```

#### **After**:
```typescript
// Props
interface VariableSelectorProps {
  data: Record<string, unknown>[]  // ✅
}

// 함수
function analyzeDataset(data: Record<string, unknown>[]): DatasetAnalysis {
  // ✅
}
```

### 2.2 타입 가드 추가

**any 제거 시 필요한 타입 가드**:

```typescript
// 객체 키 접근 시
function isValidRow(row: unknown): row is Record<string, unknown> {
  return typeof row === 'object' && row !== null && !Array.isArray(row)
}

// 배열 검증
function isDataArray(data: unknown): data is Record<string, unknown>[] {
  return (
    Array.isArray(data) &&
    data.every(row => typeof row === 'object' && row !== null && !Array.isArray(row))
  )
}

// 값 타입 검증
function isValidValue(value: unknown): value is string | number | boolean | null {
  const type = typeof value
  return (
    value === null ||
    type === 'string' ||
    type === 'number' ||
    type === 'boolean'
  )
}
```

### 2.3 사용 패턴 수정

#### **변수 값 접근**:
```typescript
// ❌ Before (any 사용)
const value = row[columnName]  // any 타입

// ✅ After (unknown + 타입 가드)
const value = row[columnName]  // unknown 타입
if (typeof value === 'number') {
  // 이제 value는 number 타입
  const result = value * 2
}
```

#### **반복문**:
```typescript
// ❌ Before
for (const row of data) {
  const val = row[key]  // any
  doSomething(val)
}

// ✅ After
for (const row of data) {
  if (!isValidRow(row)) continue

  const val = row[key]  // unknown
  if (typeof val === 'number') {
    doSomething(val)  // number로 좁혀짐
  }
}
```

---

## 3. 파일별 수정 계획

### 3.1 `lib/services/variable-type-detector.ts`

**수정 사항**:

1. **Line 18**: `samples: any[]` → `samples: unknown[]`
2. **Line 24**: `mode?: any` → `mode?: string | number`
3. **Line 107**: `values: any[]` → `values: unknown[]`
4. **Line 348**: `data: Record<string, any>[]` → `data: Record<string, unknown>[]`

**추가 타입 가드**:
```typescript
function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

function isStringValue(value: unknown): value is string {
  return typeof value === 'string'
}
```

### 3.2 `components/variable-selection/VariableSelector.tsx`

**수정 사항**:

1. **Line 71**: Props 인터페이스
```typescript
interface VariableSelectorProps {
  methodId: string
  data: Record<string, unknown>[]  // ✅ 변경
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}
```

2. **데이터 사용 부분**: 타입 가드 추가 필요 시

### 3.3 `components/variable-selection/VariableSelectorSimple.tsx`

**동일한 패턴**:
- Props 인터페이스 수정
- 타입 가드 추가 (필요 시)

### 3.4 `components/variable-selection/VariableSelectorPremium.tsx`

**동일한 패턴**:
- Props 인터페이스 수정
- 타입 가드 추가 (필요 시)

### 3.5 기타 파일

**동일한 원칙 적용**:
- `any` → `unknown`
- 타입 가드 추가
- Early return 패턴

---

## 4. 검증 절차

### 4.1 TypeScript 컴파일 체크

```bash
cd statistical-platform
npx tsc --noEmit
```

**예상 에러**: 0개 (타입 가드로 모두 해결)

### 4.2 주요 체크 포인트

1. **데이터 접근**:
   - `row[columnName]`이 `unknown`이 되므로 타입 좁히기 필요

2. **배열 메서드**:
   - `.map()`, `.filter()`, `.reduce()` 등에서 타입 명시

3. **비교 연산**:
   - `===`, `!==` 사용 가능 (타입 가드 필요 없음)
   - 산술 연산은 타입 가드 필수

---

## 5. 작업 순서

### Step 1: 공통 타입 가드 유틸리티 생성

**파일**: `lib/utils/type-guards.ts` (신규 생성)

```typescript
/**
 * 타입 가드 유틸리티
 * CLAUDE.md 규칙: any 절대 금지, unknown + 타입 가드 사용
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isDataArray(data: unknown): data is Record<string, unknown>[] {
  return (
    Array.isArray(data) &&
    data.every(row => isRecord(row))
  )
}

export function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isValidValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    isString(value) ||
    isNumeric(value) ||
    isBoolean(value)
  )
}

/**
 * 안전한 숫자 변환
 */
export function toNumber(value: unknown): number | null {
  if (isNumeric(value)) return value
  if (isString(value)) {
    const num = Number(value)
    return isNumeric(num) ? num : null
  }
  return null
}

/**
 * 안전한 문자열 변환
 */
export function toString(value: unknown): string {
  if (isString(value)) return value
  if (value === null || value === undefined) return ''
  if (isNumeric(value) || isBoolean(value)) return String(value)
  return ''
}
```

### Step 2: variable-type-detector.ts 수정

**주요 변경**:
```typescript
// Before
export function detectVariableType(
  values: any[],
  columnName: string = ''
): VariableType

// After
export function detectVariableType(
  values: unknown[],
  columnName: string = ''
): VariableType {
  // 타입 가드 추가
  const validValues = values.filter(isValidValue)

  // 숫자 변환
  const numericValues = validValues
    .map(toNumber)
    .filter((v): v is number => v !== null)

  // ...
}
```

### Step 3: VariableSelector 계열 수정

**3개 파일 동시 수정**:
- VariableSelector.tsx
- VariableSelectorSimple.tsx
- VariableSelectorPremium.tsx

**변경 내용**:
```typescript
interface VariableSelectorProps {
  methodId: string
  data: Record<string, unknown>[]  // ✅
  onVariablesSelected: (variables: VariableAssignment) => void
  onBack?: () => void
  className?: string
}
```

### Step 4: 기타 파일 수정

- `hooks/use-statistics-worker.ts`
- `lib/services/worker-manager.ts`
- `lib/data-validation.ts`

**동일한 패턴 적용**

### Step 5: 문서 업데이트

- `STATISTICAL_PAGE_TEMPLATE.md`: 예시 코드 수정

### Step 6: TypeScript 컴파일 검증

```bash
npx tsc --noEmit
# → 0 errors 확인
```

---

## 6. 예상 문제 및 해결책

### 6.1 문제: 기존 통계 페이지 타입 에러

**예시**:
```typescript
// anova/page.tsx
const value = row[columnName]  // unknown
const result = value * 2  // ❌ 에러: 'unknown' 타입은 산술 불가
```

**해결**:
```typescript
const value = row[columnName]
if (typeof value === 'number') {
  const result = value * 2  // ✅ OK
}
```

### 6.2 문제: Array.prototype 메서드

**예시**:
```typescript
const means = groups.map(g => g.reduce((sum, v) => sum + v, 0) / g.length)
// ❌ v는 unknown
```

**해결**:
```typescript
const means = groups.map(group => {
  const numericGroup = group.filter((v): v is number => typeof v === 'number')
  return numericGroup.reduce((sum, v) => sum + v, 0) / numericGroup.length
})
```

### 6.3 문제: Object.keys() 반복

**예시**:
```typescript
for (const key of Object.keys(row)) {
  const value = row[key]  // unknown
  // ...
}
```

**해결**:
```typescript
for (const key of Object.keys(row)) {
  const value = row[key]
  if (!isValidValue(value)) continue

  // 이제 value는 string | number | boolean | null
}
```

---

## 7. 성공 기준

### 7.1 정량적 지표

- [ ] `any` 타입 사용: **0개** (grep 검색 결과 0)
- [ ] TypeScript 컴파일 에러: **0개**
- [ ] 타입 가드 함수: **6개 이상** 작성
- [ ] 변경된 파일: **8개**

### 7.2 정성적 지표

- [ ] 모든 데이터 접근에 타입 검증 적용
- [ ] Early return 패턴 일관되게 사용
- [ ] 타입 좁히기 (Type Narrowing) 명확히 적용

---

## 8. 시간 계획

| 작업 | 예상 시간 | 우선순위 |
|------|----------|----------|
| Step 1: 타입 가드 유틸리티 | 20분 | 🚨 Critical |
| Step 2: variable-type-detector.ts | 30분 | 🚨 Critical |
| Step 3: VariableSelector 계열 | 20분 | 🚨 Critical |
| Step 4: 기타 파일 | 20분 | 높음 |
| Step 5: 문서 업데이트 | 10분 | 중간 |
| Step 6: TypeScript 검증 | 10분 | 🚨 Critical |
| **총 시간** | **110분** | |

---

## 9. 완료 후 다음 단계

✅ Phase 0 완료 시:
- TypeScript 에러: 0개
- `any` 타입 사용: 0개
- 타입 안전성: 100%

→ **Phase 1.1 시작 가능**

---

**작성일**: 2025-11-06
**상태**: 📝 계획 완료, 승인 대기
**예상 완료**: 2시간 이내
