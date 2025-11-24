# Zod 런타임 검증

**TypeScript의 빈틈을 메우는 런타임 가드**

---

## 🎯 핵심 개념: 왜 Zod가 필요한가?

### TypeScript의 한계

```typescript
// TypeScript Interface 정의
interface User {
  name: string;
  age: number;
}

// ✅ 컴파일 타임: VSCode에서 에러 표시
const user: User = {
  name: "Alice",
  age: "30"  // ❌ 타입 에러!
};

// ❌ 런타임: 타입 정보 사라짐
function fetchUser(): User {
  const response = fetch('/api/user');
  return response.json();  // 타입 단언일 뿐, 검증 없음!

  // 실제 API 응답이 { name: 123, age: "invalid" }여도
  // TypeScript는 모름! 😱
}
```

### Zod의 해결책

```typescript
import { z } from 'zod';

// Zod Schema 정의
const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

// 런타임 검증!
function fetchUser() {
  const response = fetch('/api/user');
  const data = response.json();

  try {
    // 실제로 데이터 형식 체크!
    const user = UserSchema.parse(data);
    return user;  // ✅ 100% 안전
  } catch (error) {
    // API 응답이 잘못되면 즉시 에러 발생
    console.error('API 형식 오류:', error);
  }
}
```

---

## 🛡️ Zod 기본 사용법

### 1. 기본 타입 검증

```typescript
import { z } from 'zod';

// 문자열
const nameSchema = z.string();
nameSchema.parse("Alice");  // ✅
nameSchema.parse(123);      // ❌ ZodError

// 숫자
const ageSchema = z.number();
ageSchema.parse(30);        // ✅
ageSchema.parse("30");      // ❌ ZodError

// 불리언
const activeSchema = z.boolean();
activeSchema.parse(true);   // ✅
activeSchema.parse("true"); // ❌ ZodError (문자열 "true" ≠ boolean true)
```

### 2. 객체 검증

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email("유효한 이메일 필요"),
  active: z.boolean()
});

// ✅ 유효한 데이터
UserSchema.parse({
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  active: true
});

// ❌ 잘못된 데이터
UserSchema.parse({
  name: "Bob",
  age: "25",  // 숫자여야 함
  email: "invalid-email",  // 이메일 형식 아님
  active: 1  // 불리언이어야 함
});
// ZodError: [
//   { path: ['age'], message: 'Expected number, received string' },
//   { path: ['email'], message: '유효한 이메일 필요' },
//   { path: ['active'], message: 'Expected boolean, received number' }
// ]
```

### 3. 배열 검증

```typescript
// 숫자 배열
const numbersSchema = z.array(z.number());
numbersSchema.parse([1, 2, 3]);        // ✅
numbersSchema.parse([1, "2", 3]);      // ❌

// 최소/최대 길이
const groupsSchema = z.array(z.string())
  .min(2, "최소 2개 그룹 필요")
  .max(10, "최대 10개 그룹 가능");

groupsSchema.parse(["A", "B"]);        // ✅
groupsSchema.parse(["A"]);             // ❌ 최소 2개 필요
```

### 4. 선택적 필드 (Optional)

```typescript
const SettingsSchema = z.object({
  theme: z.string(),  // 필수
  language: z.string().optional(),  // 선택적
  notifications: z.boolean().default(true)  // 기본값
});

// ✅ 모든 경우 허용
SettingsSchema.parse({ theme: "dark" });
// → { theme: "dark", notifications: true }

SettingsSchema.parse({ theme: "light", language: "ko" });
// → { theme: "light", language: "ko", notifications: true }
```

---

## 🎓 고급 검증 규칙

### 1. 숫자 범위 검증

```typescript
const PValueSchema = z.number()
  .min(0, "p-value는 0 이상")
  .max(1, "p-value는 1 이하");

PValueSchema.parse(0.05);   // ✅
PValueSchema.parse(1.5);    // ❌ p-value는 1 이하

const ConfidenceLevelSchema = z.number()
  .gt(0, "0보다 커야 함")  // Greater Than
  .lt(1, "1보다 작아야 함");  // Less Than

ConfidenceLevelSchema.parse(0.95);  // ✅
ConfidenceLevelSchema.parse(1.0);   // ❌
```

### 2. 문자열 패턴 검증

```typescript
const EmailSchema = z.string()
  .email("유효한 이메일 주소가 아닙니다");

const PhoneSchema = z.string()
  .regex(/^\d{3}-\d{4}-\d{4}$/, "010-1234-5678 형식");

const VariableNameSchema = z.string()
  .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "변수명은 영문/숫자/언더스코어만");
```

### 3. Enum (열거형) 검증

```typescript
const TestTypeSchema = z.enum([
  'two-sided',
  'less',
  'greater'
]);

TestTypeSchema.parse('two-sided');  // ✅
TestTypeSchema.parse('invalid');    // ❌

// TypeScript 타입도 자동 추론!
type TestType = z.infer<typeof TestTypeSchema>;
// → 'two-sided' | 'less' | 'greater'
```

### 4. Union (여러 타입 허용)

```typescript
// 숫자 또는 문자열
const ValueSchema = z.union([
  z.number(),
  z.string()
]);

ValueSchema.parse(123);      // ✅
ValueSchema.parse("text");   // ✅
ValueSchema.parse(true);     // ❌

// 더 간단한 표현
const SimpleValueSchema = z.number().or(z.string());
```

### 5. 중첩 객체 (Nested Objects)

```typescript
const AnalysisResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number(),

  // 중첩 객체
  confidenceInterval: z.object({
    lower: z.number(),
    upper: z.number(),
    level: z.number().default(0.95)
  }),

  // 객체 배열
  groups: z.array(z.object({
    name: z.string(),
    size: z.number(),
    mean: z.number()
  }))
});
```

---

## 🚀 실전 예시: 이 프로젝트

### 예시 1: Python Worker 응답 검증

**상황**: Python에서 T-Test 결과 수신

```typescript
// lib/contracts/parametric/ttest.contract.ts
import { z } from 'zod';

export const TTestResultSchema = z.object({
  statistic: z.number()
    .describe('T-통계량'),

  pValue: z.number()
    .min(0).max(1)
    .describe('유의확률'),

  degreesOfFreedom: z.number()
    .int()
    .positive()
    .describe('자유도'),

  confidenceInterval: z.tuple([
    z.number(),
    z.number()
  ]).describe('신뢰구간 [하한, 상한]'),

  method: z.enum([
    'Welch T-Test',
    'Student T-Test'
  ]).describe('검정 방법'),

  // 선택적 필드
  effectSize: z.object({
    cohensD: z.number(),
    hedgesG: z.number().optional()
  }).optional()
});

export type TTestResult = z.infer<typeof TTestResultSchema>;
```

**사용**:
```typescript
// lib/statistics/groups/parametric/ttest.ts
import { TTestResultSchema } from '@/lib/contracts/parametric/ttest.contract';

async function runTTest(data: TTestInput) {
  // Python Worker 호출
  const rawResult = await pyodideCore.callWorker(
    PyodideWorker.WORKER_2,
    'ttest_independent',
    data
  );

  try {
    // 런타임 검증!
    const result = TTestResultSchema.parse(rawResult);

    // ✅ 여기 도달 = 데이터 형식 완벽
    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 상세한 에러 정보
      console.error('Python 응답 형식 오류:', error.errors);
      // [
      //   {
      //     path: ['pValue'],
      //     message: 'Expected number, received string',
      //     received: "0.03"
      //   }
      // ]

      // 사용자에게 친절한 메시지
      throw new Error(`통계 계산 결과 형식이 잘못되었습니다: ${error.message}`);
    }
    throw error;
  }
}
```

---

### 예시 2: CSV 업로드 검증

**상황**: 사용자가 CSV 파일 업로드

```typescript
// lib/contracts/common/dataset.contract.ts
export const DatasetSchema = z.object({
  // 컬럼 정보
  columns: z.array(z.object({
    name: z.string()
      .regex(/^[a-zA-Z_가-힣][a-zA-Z0-9_가-힣]*$/, "변수명은 영문/한글/숫자/언더스코어"),
    type: z.enum(['numeric', 'categorical', 'ordinal']),
    missingCount: z.number().int().nonnegative().default(0)
  })).min(1, "최소 1개 컬럼 필요"),

  // 데이터
  data: z.array(
    z.record(z.union([
      z.number(),
      z.string(),
      z.null()  // 결측치 허용
    ]))
  ).min(3, "최소 3개 관측치 필요"),

  // 메타데이터
  metadata: z.object({
    fileName: z.string(),
    uploadedAt: z.string().datetime(),
    rowCount: z.number().int().positive()
  }).optional()
});

export type Dataset = z.infer<typeof DatasetSchema>;
```

**사용**:
```typescript
// components/DataUploader.tsx
import { DatasetSchema } from '@/lib/contracts/common/dataset.contract';

function handleFileUpload(file: File) {
  const parsed = parseCSV(file);  // 외부 라이브러리

  try {
    // CSV 데이터 검증
    const dataset = DatasetSchema.parse(parsed);

    // ✅ 검증 통과
    onDataLoaded(dataset);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 사용자에게 친절한 에러 메시지
      const errorMessages = error.errors.map(e => {
        if (e.path.includes('columns')) {
          return `컬럼 오류: ${e.message}`;
        }
        if (e.path.includes('data')) {
          return `데이터 오류: ${e.message}`;
        }
        return e.message;
      }).join('\n');

      alert(`CSV 파일 형식 오류:\n${errorMessages}`);
    }
  }
}
```

---

### 예시 3: 사용자 설정 검증

```typescript
// lib/contracts/common/settings.contract.ts
export const AnalysisSettingsSchema = z.object({
  // 통계 설정
  confidenceLevel: z.number()
    .min(0.5, "신뢰수준은 50% 이상")
    .max(0.999, "신뢰수준은 99.9% 이하")
    .default(0.95),

  significanceLevel: z.number()
    .min(0.001)
    .max(0.5)
    .default(0.05),

  // 출력 설정
  decimalPlaces: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),

  showEffectSize: z.boolean().default(true),
  showConfidenceIntervals: z.boolean().default(true),

  // 고급 옵션
  advanced: z.object({
    bootstrapIterations: z.number().int().positive().default(1000),
    randomSeed: z.number().int().optional(),
    parallelProcessing: z.boolean().default(false)
  }).optional()
});
```

---

## 🔧 Zod 유틸리티 함수

### 1. 안전한 파싱 (Safe Parse)

```typescript
// parse: 에러 발생 시 throw
try {
  const result = schema.parse(data);
} catch (error) {
  // 에러 처리
}

// safeParse: 에러 발생 시 객체 반환 (더 안전)
const result = schema.safeParse(data);

if (result.success) {
  // 성공
  console.log(result.data);
} else {
  // 실패
  console.error(result.error.errors);
}
```

### 2. 부분 검증 (Partial)

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});

// 모든 필드 선택적으로 변경
const PartialUserSchema = UserSchema.partial();

PartialUserSchema.parse({ name: "Alice" });  // ✅ (age, email 없어도 OK)
```

### 3. 특정 필드만 선택 (Pick)

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  age: z.number()
});

// name, email만 사용
const UserProfileSchema = UserSchema.pick({
  name: true,
  email: true
});
```

### 4. 타입 변환 (Transform)

```typescript
// 문자열 → 숫자 자동 변환
const StringToNumberSchema = z.string().transform(val => parseFloat(val));

StringToNumberSchema.parse("123.45");  // → 123.45 (number)

// 날짜 문자열 → Date 객체
const DateSchema = z.string().transform(val => new Date(val));
```

---

## 📊 에러 처리 패턴

### 패턴 1: 상세 에러 로깅

```typescript
function validateAndLog<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // 상세 에러 로깅
  console.error('검증 실패:');
  result.error.errors.forEach(err => {
    console.error(`- 경로: ${err.path.join('.')}`);
    console.error(`  메시지: ${err.message}`);
    console.error(`  받은 값: ${JSON.stringify(err.received)}`);
  });

  return null;
}
```

### 패턴 2: 사용자 친화적 메시지

```typescript
function getUserFriendlyError(error: z.ZodError): string {
  const messages = error.errors.map(err => {
    const field = err.path.join(' → ');

    switch (err.code) {
      case 'invalid_type':
        return `${field}: ${err.expected} 타입이 필요하지만 ${err.received}를 받았습니다`;
      case 'too_small':
        return `${field}: 최소 ${err.minimum} 이상이어야 합니다`;
      case 'too_big':
        return `${field}: 최대 ${err.maximum} 이하여야 합니다`;
      default:
        return `${field}: ${err.message}`;
    }
  });

  return messages.join('\n');
}

// 사용
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    alert(getUserFriendlyError(error));
  }
}
```

---

## 🎯 핵심 요약

### Zod가 해결하는 문제

| 문제 | TypeScript만 | TypeScript + Zod |
|------|-------------|-----------------|
| **컴파일 타임 체크** | ✅ | ✅ |
| **런타임 체크** | ❌ | ✅ |
| **외부 API 응답** | 믿음만 | 실제 검증 |
| **사용자 입력** | 무방비 | 안전 |
| **Python 응답** | 타입 불일치 감지 불가 | 즉시 감지 |
| **에러 메시지** | VSCode만 | 사용자에게 표시 가능 |

### 언제 Zod를 사용하는가?

✅ **필수**:
- Python Worker 응답
- 외부 API 호출
- 사용자 CSV 업로드
- LocalStorage 데이터

🟡 **선택적**:
- React Props (TypeScript 충분)
- 내부 함수 파라미터

---

## 🔗 다음 단계

Zod로 런타임 검증하는 방법을 배웠으니, 이제 **Golden Snapshot 테스트**로 자동화해봅시다:

**다음**: [Golden Snapshot 테스트 →](./04-GOLDEN-SNAPSHOT.md)
