# AI 시대 테스트 전략

**LLM이 생성한 코드를 신뢰할 수 있는가?**

---

## 🤖 AI 시대의 새로운 도전

### 전통적 개발 (2020년 이전)

```
개발자 → 코드 작성 → 수동 테스트 → 배포
         ↑
      완전 이해
```

**특징**:
- 개발자가 모든 줄을 직접 작성
- 코드 동작 100% 이해
- 버그는 개발자의 실수

---

### AI 개발 (2023년 이후)

```
개발자 → AI(GPT/Claude) → 코드 생성 → ??? → 배포
         ↑                    ↓
       프롬프트           이해 불완전
```

**특징**:
- AI가 수백 줄 코드 즉시 생성
- 개발자가 모든 줄 이해하기 어려움
- 버그는 **AI의 환각(Hallucination)** 가능

---

## 🚨 AI 코드의 위험성

### 예시 1: 통계 공식 환각

**프롬프트**:
```
"T-Test를 수행하는 Python 함수 작성해줘"
```

**GPT-4 응답** (잘못된 공식):
```python
def ttest(data1, data2):
    # ❌ 잘못된 통계 공식 (AI 환각)
    mean_diff = np.mean(data1) - np.mean(data2)
    std_pooled = (np.std(data1) + np.std(data2)) / 2  # 틀림!
    t = mean_diff / std_pooled
    return t
```

**문제**:
- pooled standard deviation 공식이 완전히 틀림
- 자유도 계산 누락
- p-value 계산 없음

**개발자**: "오, 코드가 생성됐네! 믿고 써야지" 😱

---

### 예시 2: 필드명 불일치

**프롬프트**:
```
"Python에서 T-Test 결과를 JSON으로 반환해줘"
```

**Claude 응답**:
```python
def ttest(data):
    result = stats.ttest_ind(group1, group2)
    return {
        "t_statistic": result.statistic,  # ← 스네이크 케이스
        "p_value": result.pvalue
    }
```

**TypeScript 코드** (개발자가 기대):
```typescript
interface TTestResult {
  statistic: number;  // ← 카멜 케이스
  pValue: number;
}

const { statistic } = result as TTestResult;
console.log(statistic);  // undefined 😱
```

**문제**:
- AI가 Python 관례(스네이크 케이스) 따름
- TypeScript는 카멜 케이스 기대
- 런타임 에러!

---

## 🛡️ 해결책: 3단계 방어선

### 1단계: Contract (약속)

**목적**: AI에게 명확한 인터페이스 제시

```typescript
// 1. Zod Schema 먼저 정의
const TTestResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number(),
  degreesOfFreedom: z.number()
});

// 2. AI에게 프롬프트
// "이 Zod Schema에 맞는 Python 함수 작성해줘"
// [Schema 전체 복사-붙여넣기]
```

**AI 응답** (Schema 참고):
```python
def ttest(data):
    result = stats.ttest_ind(group1, group2)
    # AI가 Schema 보고 정확한 필드명 사용!
    return {
        "statistic": result.statistic,  # ✅ 카멜 케이스
        "pValue": result.pvalue,         # ✅ 카멜 케이스
        "degreesOfFreedom": result.df    # ✅ 카멜 케이스
    }
```

---

### 2단계: Zod 런타임 검증

**목적**: AI 코드 실행 결과 즉시 검증

```typescript
async function runTTest(data: number[][]) {
  // AI가 생성한 Python 함수 호출
  const rawResult = await pythonWorker.ttest(data);

  try {
    // 런타임 검증!
    const result = TTestResultSchema.parse(rawResult);
    return result;  // ✅ 안전
  } catch (error) {
    // AI가 Schema 안 지켰으면 즉시 에러!
    console.error('AI가 약속 안 지킴:', error.errors);
    throw new Error('Python 함수 형식 오류');
  }
}
```

**효과**:
- AI가 필드명 틀려도 즉시 감지
- 타입 불일치 즉시 감지
- 사용자에게 에러 노출 전에 차단

---

### 3단계: Golden Snapshot

**목적**: AI 코드 **정확성** 검증

```typescript
// __tests__/python-workers/ttest.test.ts
it('T-Test: 정규분포 데이터', async () => {
  const testData = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10]
  ];

  // AI가 생성한 함수 실행
  const result = await runTTest(testData);

  // SciPy 공식 결과와 비교
  const expected = {
    statistic: -5.657,
    pValue: 0.000564,
    degreesOfFreedom: 8
  };

  // 소수점 5자리까지 일치해야 함!
  expect(result.statistic).toBeCloseTo(expected.statistic, 3);
  expect(result.pValue).toBeCloseTo(expected.pValue, 5);
  expect(result.degreesOfFreedom).toBe(expected.degreesOfFreedom);
});
```

**효과**:
- AI가 통계 공식 틀려도 즉시 발견
- SciPy 결과와 다르면 FAIL
- 수학적 정확성 보장

---

## 🔄 AI 개발 워크플로우

### Before (위험한 방법)

```
1. AI에게 프롬프트
   "T-Test 함수 만들어줘"

2. AI 코드 복사-붙여넣기

3. 브라우저에서 실행
   "오, 돌아가네!" ✅

4. Git 커밋 + 배포

5. 사용자 신고
   "결과가 이상해요" ❌
```

**문제점**:
- 형식만 체크 (타입, 필드명)
- 정확성 체크 없음 (통계 공식)
- 배포 후 버그 발견

---

### After (안전한 방법)

```
1. Contract 먼저 정의 (Zod Schema)

2. AI에게 프롬프트 + Schema 제공
   "이 Schema에 맞는 Python 함수 작성해줘"

3. AI 코드 복사-붙여넣기

4. Zod 런타임 검증 추가
   const result = TTestResultSchema.parse(rawResult);

5. Golden Snapshot 테스트 실행
   npm test -- ttest.test.ts

6. ✅ PASS → Git 커밋
   ❌ FAIL → AI 코드 수정 or 프롬프트 재작성

7. 배포 (안심!)
```

**효과**:
- ✅ 형식 검증 (Zod)
- ✅ 정확성 검증 (Golden Snapshot)
- ✅ 커밋 전에 버그 발견

---

## 🎯 프롬프트 엔지니어링 for 테스트

### 전략 1: Schema-First 프롬프트

**❌ 나쁜 프롬프트**:
```
"T-Test 함수 만들어줘"
```

**✅ 좋은 프롬프트**:
```
다음 Zod Schema에 정확히 맞는 Python 함수를 작성해줘.
필드명은 camelCase를 사용하고, TypeScript 타입과 일치해야 해.

[Zod Schema 전체 복사]

const TTestResultSchema = z.object({
  statistic: z.number(),
  pValue: z.number(),
  degreesOfFreedom: z.number(),
  confidenceInterval: z.tuple([z.number(), z.number()])
});

필수 요구사항:
1. SciPy stats.ttest_ind() 사용
2. 필드명은 위 Schema와 정확히 일치
3. confidence_interval은 95% 기준
```

**결과**: AI가 Schema 보고 정확한 필드명 사용 ✅

---

### 전략 2: 테스트 케이스 먼저 작성

**순서**:
```
1. Golden Snapshot 테스트 케이스 작성
   expect(result.statistic).toBeCloseTo(-5.657, 3);

2. AI에게 프롬프트
   "이 테스트를 통과하는 Python 함수 작성해줘"
   [테스트 케이스 복사]

3. AI 코드 실행

4. 테스트 통과할 때까지 반복
```

**이점**:
- AI가 **정답**을 알고 코드 생성
- 테스트 실패 시 즉시 재생성
- TDD (Test-Driven Development) 자동화

---

### 전략 3: Reference 코드 제공

**프롬프트**:
```
다음 T-Test 함수를 참고하여 ANOVA 함수를 작성해줘.
동일한 패턴과 필드명 규칙을 따라야 해.

[T-Test 함수 복사]

def ttest(data):
    result = stats.ttest_ind(group1, group2)
    return {
        "statistic": result.statistic,  # camelCase 아님 주의!
        "pValue": result.pvalue,
        "degreesOfFreedom": result.df
    }

이제 ANOVA 버전을 작성해줘:
- stats.f_oneway() 사용
- 필드명: fStatistic, pValue, degreesOfFreedom
```

**결과**: 일관된 코드 스타일 ✅

---

## 🧪 이 프로젝트의 AI 테스트 전략

### 현재 상황

| 통계 메서드 | Python Worker | 테스트 상태 |
|------------|--------------|------------|
| 43개 | 4개 Worker | Contract만 (형식) |

### Phase 11 목표 (자동화 테스트)

| 단계 | 작업 | AI 활용 |
|------|------|---------|
| 1 | Contract 정의 | AI에게 Zod Schema 생성 요청 |
| 2 | Python 함수 작성 | AI에게 Schema 제공 + 코드 생성 |
| 3 | Zod 검증 추가 | 수동 (패턴 반복) |
| 4 | Golden Snapshot | AI에게 테스트 케이스 생성 요청 |

---

## 📋 AI 코드 리뷰 체크리스트

### Python Worker 코드 (AI 생성)

- [ ] **라이브러리 사용**: SciPy/statsmodels/sklearn 사용 (직접 구현 금지)
- [ ] **필드명**: camelCase (pValue ✅, p_value ❌)
- [ ] **타입 일치**: Zod Schema와 정확히 일치
- [ ] **에러 처리**: try-except 적절히 사용
- [ ] **테스트 통과**: Golden Snapshot 통과

### TypeScript 코드 (AI 생성)

- [ ] **Zod 검증**: `schema.parse()` 반드시 사용
- [ ] **타입 안전성**: `any` 절대 금지
- [ ] **에러 처리**: Zod 에러 사용자 친화적 메시지로 변환
- [ ] **Null 체크**: Optional chaining (`?.`) 사용

---

## 🎓 핵심 원칙

### 1. AI를 믿지 말고 검증하라

```typescript
// ❌ 위험
const result = await aiGeneratedFunction(data);
return result;  // 검증 없음!

// ✅ 안전
const rawResult = await aiGeneratedFunction(data);
const validated = Schema.parse(rawResult);  // 검증!
return validated;
```

### 2. Contract를 먼저, 코드는 나중에

```
1. Zod Schema 정의
2. AI에게 Schema 제공
3. AI 코드 생성
4. Zod로 검증
```

### 3. Golden Snapshot으로 정확성 보장

```
1. SciPy/R 공식 결과 확보 (정답)
2. AI 코드 실행
3. 결과 비교 (소수점 5자리)
4. 일치하면 통과, 아니면 재생성
```

---

## 🚀 미래: AI 자동 테스트 생성

### 비전

```
개발자: "MANOVA 함수 만들어줘"
  ↓
AI (GPT-5):
  1. Zod Schema 생성
  2. Python 함수 생성
  3. Golden Snapshot 테스트 생성
  4. 테스트 실행
  5. 통과 확인
  ↓
개발자: "커밋할게"
```

**현재 기술로 가능**:
- ✅ Contract 생성 (GPT-4)
- ✅ Python 코드 생성 (GPT-4)
- 🟡 테스트 생성 (수동 리뷰 필요)
- ❌ 완전 자동화 (아직 위험)

**3년 후 예상**:
- ✅ 완전 자동화
- ✅ AI가 AI 코드 검증
- ✅ 사람은 최종 승인만

---

## 🔗 관련 문서

### 테스트 시리즈
- [왜 테스트가 필요한가?](./01-WHY-TESTING-MATTERS.md)
- [Contract 개념](./02-CONTRACT-EXPLAINED.md)
- [Zod 런타임 검증](./03-ZOD-RUNTIME-VALIDATION.md)
- [Golden Snapshot](./04-GOLDEN-SNAPSHOT.md)

### 프로젝트 문서
- [AUTOMATED_TESTING_ROADMAP.md](../AUTOMATED_TESTING_ROADMAP.md) - 전체 로드맵
- [AI-CODING-RULES.md](../AI-CODING-RULES.md) - AI 코딩 규칙

---

## 🎯 핵심 요약

### AI 시대 테스트의 3단계

1. **Contract (약속)**: AI에게 명확한 인터페이스 제시
2. **Zod (검증)**: AI 코드 실행 결과 런타임 체크
3. **Golden Snapshot (정확성)**: 통계 공식 정확도 보장

### AI 코드를 안전하게 사용하는 법

- ✅ Schema 먼저, 코드는 나중에
- ✅ 모든 AI 코드는 Zod 검증 필수
- ✅ Golden Snapshot으로 정확성 검증
- ✅ 테스트 통과 전에는 절대 커밋 금지

### AI 시대의 개발자 역할

- ❌ 코드 직접 작성 (AI가 더 빠름)
- ✅ **요구사항 명확히 정의** (Contract)
- ✅ **검증 시스템 구축** (Zod + Golden Snapshot)
- ✅ **AI 코드 리뷰** (정확성 확인)

---

**작성일**: 2025-11-24
**핵심 메시지**: AI를 믿지 말고, 검증하라! 🛡️
