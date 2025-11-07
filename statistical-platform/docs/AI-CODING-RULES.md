# AI 코딩 엄격 규칙

Claude Code가 자동으로 코드를 생성할 때 따라야 할 상세 가이드입니다.

## 목차
1. [any → unknown 변환 패턴 10가지](#any--unknown-변환-패턴-10가지)
2. [타입 가드 패턴 5가지](#타입-가드-패턴-5가지)
3. [Pyodide 메서드 호출 규칙](#pyodide-메서드-호출-규칙)
4. [테스트 프레임워크 규칙](#테스트-프레임워크-규칙)
5. [컴파일 체크 자동화](#컴파일-체크-자동화)

---

## 테스트 프레임워크 규칙

**이 프로젝트는 Jest를 사용합니다 (Vitest 아님!)**

### ❌ 절대 금지
```typescript
// ❌ Vitest import 사용 금지
import { describe, it, expect, vi, beforeEach } from 'vitest'
```

### ✅ 올바른 방법
```typescript
// ✅ Jest 전역 함수 사용 (import 없이)
describe('My Component', () => {
  it('should work', () => {
    expect(true).toBe(true)
  })
})

// ✅ 또는 @jest/globals에서 import
import { describe, it, expect } from '@jest/globals'
```

### Mock 함수
```typescript
// ❌ Vitest
import { vi } from 'vitest'
const mockFn = vi.fn()

// ✅ Jest
const mockFn = jest.fn()
```

### 테스트 실행
```bash
npm test              # 모든 테스트
npm test anova        # 특정 키워드
npm test:watch        # watch 모드
npm test:coverage     # 커버리지
```

---

## any → unknown 변환 패턴 10가지

### 1. 단일 속성 접근

```typescript
// ❌ 나쁜 예
function getValue(data: any) {
  return data.value
}

// ✅ 좋은 예
function getValue(data: unknown): number {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: expected object')
  }
  if (!('value' in data)) {
    throw new Error('Missing property: value')
  }
  if (typeof data.value !== 'number') {
    throw new Error('Invalid type: value must be number')
  }
  return data.value
}
```

### 2. 중첩 속성 접근

```typescript
// ❌ 나쁜 예
function getNestedValue(data: any) {
  return data.user.name
}

// ✅ 좋은 예
function getNestedValue(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data')
  }
  if (!('user' in data) || !data.user || typeof data.user !== 'object') {
    throw new Error('Invalid user property')
  }
  const user = data.user
  if (!('name' in user) || typeof user.name !== 'string') {
    throw new Error('Invalid name property')
  }
  return user.name
}
```

### 3. 배열 처리

```typescript
// ❌ 나쁜 예
function processArray(data: any) {
  return data.items.map((item: any) => item.id)
}

// ✅ 좋은 예
function processArray(data: unknown): number[] {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data')
  }
  if (!('items' in data) || !Array.isArray(data.items)) {
    throw new Error('Invalid items: expected array')
  }

  return data.items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Invalid item at index ${index}`)
    }
    if (!('id' in item) || typeof item.id !== 'number') {
      throw new Error(`Invalid id at index ${index}`)
    }
    return item.id
  })
}
```

### 4. 옵셔널 속성

```typescript
// ❌ 나쁜 예
function getOptionalValue(data: any) {
  return data.optional || 'default'
}

// ✅ 좋은 예
function getOptionalValue(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data')
  }

  if (!('optional' in data)) {
    return 'default'
  }

  const optional = data.optional
  if (optional !== undefined && typeof optional !== 'string') {
    throw new Error('Invalid optional: must be string if provided')
  }

  return optional || 'default'
}
```

### 5. 유니온 타입

```typescript
// ❌ 나쁜 예
function processValue(value: any) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value
}

// ✅ 좋은 예
function processValue(value: unknown): string | number {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  if (typeof value === 'number') {
    return value
  }
  throw new Error('Invalid value: expected string or number')
}
```

### 6. API 응답 처리

```typescript
// ❌ 나쁜 예
async function fetchData(): Promise<any> {
  const response = await fetch('/api/data')
  return response.json()
}

// ✅ 좋은 예
interface ApiResponse {
  data: string[]
  status: 'success' | 'error'
  timestamp: number
}

function isApiResponse(data: unknown): data is ApiResponse {
  return (
    data !== null &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray(data.data) &&
    data.data.every(item => typeof item === 'string') &&
    'status' in data &&
    (data.status === 'success' || data.status === 'error') &&
    'timestamp' in data &&
    typeof data.timestamp === 'number'
  )
}

async function fetchData(): Promise<ApiResponse> {
  const response = await fetch('/api/data')
  const data: unknown = await response.json()

  if (!isApiResponse(data)) {
    throw new Error('Invalid API response format')
  }

  return data
}
```

### 7. Pyodide 결과 처리

```typescript
// ❌ 나쁜 예
function processPyodideResult(result: any) {
  return {
    mean: result.mean,
    std: result.std
  }
}

// ✅ 좋은 예
interface StatisticalResult {
  mean: number
  std: number
  count: number
}

function isStatisticalResult(data: unknown): data is StatisticalResult {
  return (
    data !== null &&
    typeof data === 'object' &&
    'mean' in data &&
    typeof data.mean === 'number' &&
    'std' in data &&
    typeof data.std === 'number' &&
    'count' in data &&
    typeof data.count === 'number'
  )
}

function processPyodideResult(result: unknown): StatisticalResult {
  if (!isStatisticalResult(result)) {
    throw new Error('Invalid statistical result format')
  }
  return result
}
```

### 8. 에러 처리

```typescript
// ❌ 나쁜 예
function handleError(error: any) {
  console.error(error.message)
}

// ✅ 좋은 예
function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`)
    return
  }

  if (typeof error === 'string') {
    console.error(`Error: ${error}`)
    return
  }

  if (error && typeof error === 'object' && 'message' in error) {
    console.error(`Error: ${String(error.message)}`)
    return
  }

  console.error('Unknown error occurred')
}
```

### 9. 제네릭과 unknown

```typescript
// ❌ 나쁜 예
function transform<T>(data: any, transformer: (item: any) => T): T[] {
  return data.items.map(transformer)
}

// ✅ 좋은 예
interface DataWithItems<T> {
  items: T[]
}

function isDataWithItems<T>(
  data: unknown,
  itemValidator: (item: unknown) => item is T
): data is DataWithItems<T> {
  return (
    data !== null &&
    typeof data === 'object' &&
    'items' in data &&
    Array.isArray(data.items) &&
    data.items.every(itemValidator)
  )
}

function transform<T, R>(
  data: unknown,
  itemValidator: (item: unknown) => item is T,
  transformer: (item: T) => R
): R[] {
  if (!isDataWithItems(data, itemValidator)) {
    throw new Error('Invalid data format')
  }
  return data.items.map(transformer)
}

// 사용 예시
interface User {
  id: number
  name: string
}

function isUser(item: unknown): item is User {
  return (
    item !== null &&
    typeof item === 'object' &&
    'id' in item &&
    typeof item.id === 'number' &&
    'name' in item &&
    typeof item.name === 'string'
  )
}

const userNames = transform(
  unknownData,
  isUser,
  user => user.name
)
```

### 10. Promise와 async/await

```typescript
// ❌ 나쁜 예
async function loadData(): Promise<any> {
  const data = await fetchSomething()
  return data.result
}

// ✅ 좋은 예
interface LoadResult {
  result: {
    id: number
    value: string
  }
  timestamp: number
}

function isLoadResult(data: unknown): data is LoadResult {
  if (!data || typeof data !== 'object') return false
  if (!('result' in data) || !data.result || typeof data.result !== 'object') {
    return false
  }
  const result = data.result
  if (!('id' in result) || typeof result.id !== 'number') return false
  if (!('value' in result) || typeof result.value !== 'string') return false
  if (!('timestamp' in data) || typeof data.timestamp !== 'number') return false
  return true
}

async function loadData(): Promise<LoadResult> {
  const data: unknown = await fetchSomething()

  if (!isLoadResult(data)) {
    throw new Error('Invalid load result format')
  }

  return data
}
```

---

## 타입 가드 패턴 5가지

### 1. 단순 타입 가드

```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}
```

### 2. 객체 구조 타입 가드

```typescript
interface Point {
  x: number
  y: number
}

function isPoint(value: unknown): value is Point {
  return (
    value !== null &&
    typeof value === 'object' &&
    'x' in value &&
    typeof value.x === 'number' &&
    'y' in value &&
    typeof value.y === 'number'
  )
}
```

### 3. 배열 타입 가드

```typescript
function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(item => typeof item === 'string')
  )
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(item => typeof item === 'number')
  )
}
```

### 4. 유니온 타입 가드

```typescript
interface SuccessResult {
  success: true
  data: string
}

interface ErrorResult {
  success: false
  error: string
}

type Result = SuccessResult | ErrorResult

function isSuccessResult(result: Result): result is SuccessResult {
  return result.success === true
}

function isErrorResult(result: Result): result is ErrorResult {
  return result.success === false
}
```

### 5. 복합 타입 가드

```typescript
interface User {
  id: number
  name: string
  email: string
  roles: string[]
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false

  if (!('id' in value) || typeof value.id !== 'number') return false
  if (!('name' in value) || typeof value.name !== 'string') return false
  if (!('email' in value) || typeof value.email !== 'string') return false

  if (!('roles' in value)) return false
  if (!Array.isArray(value.roles)) return false
  if (!value.roles.every(role => typeof role === 'string')) return false

  return true
}
```

---

## Pyodide 메서드 호출 규칙

### 1. 기존 메서드 검색 (필수)

```bash
# 새 메서드 추가 전 항상 검색
grep -r "methodName" statistical-platform/lib/services/pyodide-statistics.ts
```

### 2. 메서드명 규칙

```typescript
// ✅ 좋은 예 - 카멜케이스
pyodideService.descriptiveStats(data)
pyodideService.shapiroWilkTest(data)
pyodideService.tTest(data)

// ❌ 나쁜 예 - 구버전 메서드명
pyodideService.testNormality(data)  // deprecated
pyodideService.test_normality(data)  // 스네이크케이스 금지
```

### 3. 타입 안전한 호출

```typescript
// ❌ 나쁜 예
async function calculate(data: any) {
  const result = await pyodideService.descriptiveStats(data)
  return result
}

// ✅ 좋은 예
interface DescriptiveStatsInput {
  values: number[]
}

interface DescriptiveStatsResult {
  mean: number
  std: number
  min: number
  max: number
  count: number
}

function isDescriptiveStatsResult(data: unknown): data is DescriptiveStatsResult {
  return (
    data !== null &&
    typeof data === 'object' &&
    'mean' in data && typeof data.mean === 'number' &&
    'std' in data && typeof data.std === 'number' &&
    'min' in data && typeof data.min === 'number' &&
    'max' in data && typeof data.max === 'number' &&
    'count' in data && typeof data.count === 'number'
  )
}

async function calculate(data: DescriptiveStatsInput): Promise<DescriptiveStatsResult> {
  const result: unknown = await pyodideService.descriptiveStats(data.values)

  if (!isDescriptiveStatsResult(result)) {
    throw new Error('Invalid result from pyodideService.descriptiveStats')
  }

  return result
}
```

### 4. 에러 처리

```typescript
// ✅ Pyodide 호출 시 항상 try-catch
async function safePyodideCall(data: number[]): Promise<DescriptiveStatsResult> {
  try {
    const result: unknown = await pyodideService.descriptiveStats(data)

    if (!isDescriptiveStatsResult(result)) {
      throw new Error('Invalid result format')
    }

    return result
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Pyodide calculation failed: ${error.message}`)
    }
    throw new Error('Pyodide calculation failed: unknown error')
  }
}
```

---

## 컴파일 체크 자동화

### 1. 코드 생성 후 즉시 실행

```bash
# TypeScript 컴파일 체크
npx tsc --noEmit

# 결과 확인
# - 에러 0개 = 성공
# - 에러 있음 = 수정 필요
```

### 2. 빌드 검증

```bash
# 프로덕션 빌드 테스트
npm run build

# 성공 시에만 커밋
```

### 3. 린터 검증

```bash
# ESLint 검사
npm run lint

# 자동 수정 가능한 경우
npm run lint -- --fix
```

### 4. 체크리스트

AI가 코드 생성 후 반드시 확인:

- [ ] `npx tsc --noEmit` 실행 → 에러 0개
- [ ] `npm run build` 실행 → 빌드 성공
- [ ] `npm run lint` 실행 → 린트 통과
- [ ] 타입 가드 함수 작성 완료
- [ ] `any` 타입 완전 제거
- [ ] Non-null assertion (`!`) 사용하지 않음
- [ ] 모든 함수에 리턴 타입 명시
- [ ] 옵셔널 체이닝 (`?.`) 사용
- [ ] Early return 패턴 적용

---

## 요약

### 핵심 원칙
1. **`any` 절대 금지** → `unknown` + 타입 가드 사용
2. **모든 함수에 명시적 타입** → 파라미터 + 리턴 타입
3. **컴파일 체크 필수** → 생성 후 즉시 `npx tsc --noEmit`
4. **Pyodide 메서드 확인** → 기존 메서드명 `Grep`으로 검색
5. **타입 가드 작성** → 런타임 안전성 보장

### 체크리스트 (AI 코드 생성 시)
```typescript
// 1. unknown 사용
function process(data: unknown): ResultType

// 2. 타입 가드 작성
function isResultType(data: unknown): data is ResultType

// 3. 검증 로직
if (!isResultType(data)) {
  throw new Error('Invalid data')
}

// 4. 안전하게 사용
return data.property
```

**Updated**: 2025-10-13
