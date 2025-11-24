# Contract (계약) 개념

**입력과 출력의 약속을 정의하기**

---

## 🤝 Contract란 무엇인가?

### 일상 생활의 계약서

**카페에서 커피 주문**:
```
고객: "아메리카노 한 잔 주세요" (입력)
    ↓
  [계약]
  - 입력: 주문 + 결제
  - 출력: 아메리카노 1잔
    ↓
바리스타: "여기요!" (출력)
```

**계약 위반 예시**:
```
고객: 아메리카노 주문 + 5,000원 지불
바리스타: 라떼 제공  ❌ (출력 불일치)

또는

고객: 아메리카노 주문 + 1,000원만 지불  ❌ (입력 불일치)
바리스타: 거절
```

---

## 💻 코드에서의 Contract

### TypeScript Interface (컴파일 타임 계약)

```typescript
// 계약서 작성
interface TTestContract {
  // 입력 약속
  input: {
    group1: number[];
    group2: number[];
    equalVariance?: boolean;
  };

  // 출력 약속
  output: {
    statistic: number;
    pValue: number;
    degreesOfFreedom: number;
    confidenceInterval: [number, number];
  };
}
```

### 문제: TypeScript는 빌드 시에만 체크

```typescript
// ✅ 컴파일 타임: VSCode에서 에러 표시
const result: TTestContract['output'] = {
  statistic: 2.5,
  pValue: "0.03"  // ❌ 타입 에러 (string → number)
};

// ❌ 런타임: 타입 정보 사라짐
const pythonResult = await callPython('ttest', data);
// Python이 { "stat": 2.5, "p": 0.03 } 보내도 에러 없음! 😱
```

---

## 🛡️ Zod Schema (런타임 계약)

### Zod = 런타임에도 체크하는 계약서

```typescript
import { z } from 'zod';

// 계약서 작성 (TypeScript + 런타임 검증)
const TTestInputSchema = z.object({
  group1: z.array(z.number()).min(3, "최소 3개 필요"),
  group2: z.array(z.number()).min(3, "최소 3개 필요"),
  equalVariance: z.boolean().optional()
});

const TTestOutputSchema = z.object({
  statistic: z.number(),
  pValue: z.number().min(0).max(1, "p-value는 0~1 사이"),
  degreesOfFreedom: z.number().int().positive(),
  confidenceInterval: z.tuple([z.number(), z.number()])
});
```

### 사용 예시

```typescript
// ✅ 입력 검증
function runTTest(data: unknown) {
  try {
    // 런타임에 입력 형식 체크!
    const input = TTestInputSchema.parse(data);

    // Python Worker 호출
    const rawOutput = await pythonWorker.ttest(input);

    // 런타임에 출력 형식 체크!
    const output = TTestOutputSchema.parse(rawOutput);

    return output;  // ✅ 100% 안전
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 어떤 필드가 잘못되었는지 정확히 알 수 있음
      console.error('입력 형식 오류:', error.errors);
    }
  }
}
```

---

## 🎯 실전 예시: 이 프로젝트

### 문제 상황

**Python Worker (worker1.py)**:
```python
def ttest_independent(data):
    group1 = data['group1']
    group2 = data['group2']

    result = stats.ttest_ind(group1, group2)

    # ❌ 개발자가 필드명 잘못 씀
    return {
        "t_statistic": result.statistic,  # TypeScript는 "statistic" 기대
        "p_value": result.pvalue,          # TypeScript는 "pValue" 기대
        "df": result.df                    # TypeScript는 "degreesOfFreedom" 기대
    }
```

**TypeScript (page.tsx)**:
```typescript
// ❌ TypeScript만 사용 (컴파일 타임만 체크)
interface TTestResult {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
}

async function analyze() {
  const result = await pyodideCore.callWorker('ttest', data);

  // 타입 단언 (믿음만!)
  const typed = result as TTestResult;

  console.log(typed.statistic);  // undefined 😱
  console.log(typed.pValue);     // undefined 😱
}
```

### 해결: Zod Contract

```typescript
// ✅ Zod Schema 정의
const TTestResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number(),
  degreesOfFreedom: z.number()
});

async function analyze() {
  const rawResult = await pyodideCore.callWorker('ttest', data);

  try {
    // 런타임 검증!
    const result = TTestResultSchema.parse(rawResult);
    console.log(result.statistic);  // ✅ 안전
  } catch (error) {
    // 즉시 에러 발견!
    console.error('Python 응답 형식 오류:', error.errors);
    // [
    //   { path: ['statistic'], message: 'Required' },
    //   { path: ['pValue'], message: 'Required' }
    // ]
  }
}
```

**결과**:
- Python 필드명 오류 즉시 감지
- 어떤 필드가 잘못되었는지 정확히 알려줌
- 사용자에게 에러 노출 전에 개발 단계에서 발견

---

## 📋 Contract 작성 규칙

### 1. 명확한 필드명 (Naming Convention)

**❌ 잘못된 예시**:
```typescript
const BadSchema = z.object({
  result: z.number(),      // 무슨 결과?
  value: z.number(),       // 무슨 값?
  data: z.array(z.any())   // 무슨 데이터?
});
```

**✅ 올바른 예시**:
```typescript
const GoodSchema = z.object({
  tStatistic: z.number(),
  pValue: z.number(),
  sampleMeans: z.tuple([z.number(), z.number()])
});
```

### 2. 검증 규칙 추가

```typescript
const ANOVAResultSchema = z.object({
  fStatistic: z.number()
    .positive('F-통계량은 양수여야 함'),

  pValue: z.number()
    .min(0, 'p-value 최소값 0')
    .max(1, 'p-value 최대값 1'),

  groups: z.array(z.string())
    .min(2, '최소 2개 그룹 필요')
    .max(10, '최대 10개 그룹 가능'),

  sampleSizes: z.array(z.number().int().positive())
});
```

### 3. 선택적 필드 (Optional)

```typescript
const TTestInputSchema = z.object({
  group1: z.array(z.number()),  // 필수
  group2: z.array(z.number()),  // 필수

  // 선택적 필드
  equalVariance: z.boolean().default(true),
  confidenceLevel: z.number().min(0).max(1).default(0.95),
  alternative: z.enum(['two-sided', 'less', 'greater']).default('two-sided')
});
```

---

## 🔄 TypeScript Interface와 Zod 변환

### 중복 제거: Zod에서 TypeScript 타입 추론

**❌ 중복 정의 (유지보수 어려움)**:
```typescript
// TypeScript Interface
interface TTestResult {
  statistic: number;
  pValue: number;
}

// Zod Schema (같은 정의 반복!)
const TTestResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number()
});
```

**✅ Zod에서 타입 추론 (Single Source of Truth)**:
```typescript
// Zod Schema만 정의
const TTestResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number()
});

// TypeScript 타입 자동 생성!
type TTestResult = z.infer<typeof TTestResultSchema>;

// 사용
const result: TTestResult = {
  statistic: 2.5,
  pValue: 0.03
};
```

---

## 📊 이 프로젝트의 Contract 구조

### 파일 위치 (계획)

```
statistical-platform/lib/
└── contracts/
    ├── descriptive/
    │   ├── mean.contract.ts
    │   └── frequency.contract.ts
    ├── parametric/
    │   ├── ttest.contract.ts
    │   ├── anova.contract.ts
    │   └── regression.contract.ts
    ├── non-parametric/
    │   ├── mann-whitney.contract.ts
    │   └── kruskal-wallis.contract.ts
    └── multivariate/
        ├── manova.contract.ts
        └── factor-analysis.contract.ts
```

### Contract 파일 예시

```typescript
// lib/contracts/parametric/ttest.contract.ts
import { z } from 'zod';

// 입력 Contract
export const TTestInputSchema = z.object({
  group1: z.array(z.number()).min(3),
  group2: z.array(z.number()).min(3),
  equalVariance: z.boolean().default(true),
  confidenceLevel: z.number().min(0).max(1).default(0.95)
});

// 출력 Contract
export const TTestOutputSchema = z.object({
  statistic: z.number(),
  pValue: z.number(),
  degreesOfFreedom: z.number(),
  confidenceInterval: z.tuple([z.number(), z.number()]),
  mean1: z.number(),
  mean2: z.number(),
  standardError: z.number()
});

// TypeScript 타입 추론
export type TTestInput = z.infer<typeof TTestInputSchema>;
export type TTestOutput = z.infer<typeof TTestOutputSchema>;
```

---

## 🎓 핵심 요약

### Contract의 3가지 역할

1. **문서화**: "이 함수가 무엇을 받고 무엇을 반환하는가?"
2. **검증**: "실제로 약속한 대로 동작하는가?"
3. **타입 안전성**: "TypeScript 타입과 런타임 데이터 일치하는가?"

### TypeScript vs Zod

| 특징 | TypeScript Interface | Zod Schema |
|------|---------------------|-----------|
| 체크 시점 | 컴파일 타임 | 런타임 |
| 빌드 후 | 삭제됨 | 검증 코드 남음 |
| 에러 메시지 | VSCode에만 표시 | 사용자에게 표시 가능 |
| 검증 규칙 | 불가능 | 가능 (min, max, regex 등) |
| **추천 용도** | 내부 코드 | 외부 통신 (Python, API) |

### 언제 Contract를 사용하는가?

✅ **필수**:
- Python Worker 호출
- 외부 API 응답
- 사용자 입력 (CSV 업로드)

🟡 **선택적**:
- 컴포넌트 간 Props
- 내부 함수 파라미터

---

## 🔗 다음 단계

Contract 정의 방법을 배웠으니, 이제 **Zod로 런타임 검증**하는 방법을 알아봅시다:

**다음**: [Zod 런타임 검증 →](./03-ZOD-RUNTIME-VALIDATION.md)
