# Phase 2-3: 미구현 메서드 PyodideCore 연결 계획

**작성일**: 2025-11-07
**목표**: Python Worker에 존재하지만 프론트엔드에서 미연결된 메서드들을 PyodideCore로 연결

---

## 📊 현황 분석

### ✅ 완료된 작업 (Phase 2-2)
1. **Two-Way ANOVA** - ANOVA 페이지 연결 완료
2. **Three-Way ANOVA** - ANOVA 페이지 연결 완료
3. **Repeated Measures ANOVA** - ANOVA 페이지 연결 완료

### 🔴 미연결 메서드 분류

#### **Priority 1: 기존 페이지 PyodideCore 연결** ⭐ (추천)
페이지가 이미 존재하고, JavaScript 계산 또는 Mock 데이터를 사용 중인 메서드들

| 메서드 | 페이지 | Python Worker | 현재 상태 | 작업량 | 우선순위 |
|--------|--------|---------------|-----------|--------|----------|
| **McNemar Test** | ✅ mcnemar/page.tsx (600줄) | ✅ worker3:506-527 | JS 직접 계산 | 30-45분 | 🟢 1순위 |
| **Runs Test** | ✅ runs-test/page.tsx | ✅ worker3:478-503 | Mock 데이터 | 30-45분 | 🟢 2순위 |
| **Sign Test** | ✅ sign-test/page.tsx (1052줄) | ✅ worker3:445-475 | Mock 데이터 | 1-1.5시간 | 🟡 3순위 |

**예상 소요 시간**: 2-3시간 (3개 완료)

---

#### **Priority 2: Regression 리팩토링** (중규모)
Regression 페이지 전체를 Mock → PyodideCore로 전환

| 메서드 | 페이지 | Python Worker | 현재 상태 | 작업량 |
|--------|--------|---------------|-----------|--------|
| **Linear Regression** | ✅ regression/page.tsx | ✅ worker4:14-29 | Mock 전체 | 3-4시간 |
| **Multiple Regression** | ✅ regression/page.tsx | ✅ worker4:32-57 | Mock 전체 | (포함) |
| **Logistic Regression** | ✅ regression/page.tsx | ✅ worker4:60-88 | Mock 전체 | (포함) |
| **Durbin-Watson Test** | - | ✅ worker4:880-909 | 미연결 | (포함) |

**예상 소요 시간**: 3-4시간 (전체 리팩토링)

---

#### **Priority 3: 신규 페이지 생성** (대규모)
페이지가 없어서 처음부터 만들어야 하는 메서드들

| 메서드 | 페이지 | Python Worker | 작업량 |
|--------|--------|---------------|--------|
| **Cochran Q Test** | ❌ 없음 | ✅ worker3:530-556 | 2-3시간 |
| **Mood Median Test** | ❌ 없음 | ✅ worker3:559-570 | 2-3시간 |
| **Binomial Test** | ❌ 없음 | ✅ worker2:136-155 | 2-3시간 |

**예상 소요 시간**: 6-9시간 (3개 신규 생성)

---

## 🎯 실행 계획

### **Phase 2-3-A: 기존 페이지 연결** (추천 👍)

#### **Step 1: McNemar Test** (30-45분)
- **Python Worker**: `mcnemar_test(contingency_table)` (worker3:506-527)
- **페이지**: mcnemar/page.tsx (Line 132-208)
- **작업 내용**:
  1. Line 132-208 `calculateMcNemarTest()` 함수 제거
  2. PyodideCore 호출로 교체
  3. 2x2 contingency table 구성
  4. Python Worker 결과를 기존 Result 인터페이스에 매핑

**Python Worker 반환값**:
```python
{
  'statistic': float,
  'pValue': float,
  'continuityCorrection': bool,
  'discordantPairs': {'b': int, 'c': int}
}
```

**작업 파일**:
- `app/(dashboard)/statistics/mcnemar/page.tsx` (수정)

---

#### **Step 2: Runs Test** (30-45분)
- **Python Worker**: `runs_test(sequence)` (worker3:478-503)
- **페이지**: runs-test/page.tsx
- **작업 내용**:
  1. Mock 데이터 제거
  2. PyodideCore 호출 추가
  3. 시퀀스 데이터 추출 및 전달

**Python Worker 반환값**:
```python
{
  'nRuns': int,
  'expectedRuns': float,
  'n1': int,
  'n2': int,
  'zStatistic': float,
  'pValue': float
}
```

**작업 파일**:
- `app/(dashboard)/statistics/runs-test/page.tsx` (수정)

---

#### **Step 3: Sign Test** (1-1.5시간)
- **Python Worker**: `sign_test(before, after)` (worker3:445-475)
- **페이지**: sign-test/page.tsx (1052줄)
- **문제점**: 페이지의 Result 인터페이스가 매우 복잡 (50줄)
- **Python Worker 반환값**은 간단 (4개 필드만)

**Python Worker 반환값**:
```python
{
  'nPositive': int,
  'nNegative': int,
  'nTies': int,
  'pValue': float
}
```

**작업 내용**:
1. 복잡한 SignTestResult 인터페이스를 간소화
2. PyodideCore 호출 추가
3. before/after 배열 추출
4. 결과 표시 UI 간소화

**작업 파일**:
- `app/(dashboard)/statistics/sign-test/page.tsx` (대규모 수정)

---

## 📝 체크리스트

### McNemar Test
- [ ] Python Worker 함수 확인 완료
- [ ] calculateMcNemarTest() 함수 제거
- [ ] PyodideCore 초기화 코드 추가
- [ ] 2x2 contingency table 구성 로직 작성
- [ ] PyodideCore.callWorkerMethod() 호출
- [ ] 결과 매핑 (Python → TypeScript)
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

### Runs Test
- [ ] Python Worker 함수 확인 완료
- [ ] Mock 데이터 제거
- [ ] PyodideCore 초기화 코드 추가
- [ ] 시퀀스 데이터 추출 로직 작성
- [ ] PyodideCore.callWorkerMethod() 호출
- [ ] 결과 매핑 (Python → TypeScript)
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

### Sign Test
- [ ] Python Worker 함수 확인 완료
- [ ] SignTestResult 인터페이스 간소화
- [ ] Mock 데이터 제거
- [ ] PyodideCore 초기화 코드 추가
- [ ] before/after 배열 추출 로직 작성
- [ ] PyodideCore.callWorkerMethod() 호출
- [ ] 결과 표시 UI 수정
- [ ] TypeScript 컴파일 에러 0개 확인
- [ ] 코드 리뷰
- [ ] 커밋

---

## 🔧 구현 패턴 (ANOVA 참고)

### 1. PyodideCore 초기화
```typescript
const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
const pyodideCore = PyodideCoreService.getInstance()
await pyodideCore.initialize()
```

### 2. 데이터 추출
```typescript
const dataValues: number[] = []
const variable1Values: (string | number)[] = []

for (const row of data) {
  const value = row[variableName]
  if (value !== null && value !== undefined && typeof value === 'number') {
    dataValues.push(value)
  }
}
```

### 3. Worker 호출
```typescript
const result = await pyodideCore.callWorkerMethod<ResultType>(
  3, // worker number
  'method_name',
  {
    param1: data1,
    param2: data2
  }
)
```

### 4. 결과 저장
```typescript
actions.setResults(result as unknown as PageResultType)
actions.setCurrentStep(3)
```

---

## 📊 진행 상황

**현재 단계**: Step 0 - 계획 수립 완료
**다음 단계**: Step 1 - McNemar Test 구현 시작
**전체 진행률**: 0% (0/3)

---

## 🎯 성공 기준

1. **기능 동작**: PyodideCore를 통해 실제 Python Worker 호출 성공
2. **타입 안전성**: TypeScript 컴파일 에러 0개
3. **코드 품질**:
   - useCallback 사용
   - any 타입 금지 (unknown + 타입 가드)
   - null/undefined 체크 필수
4. **테스트**: 각 메서드마다 통합 테스트 작성 (선택)
5. **커밋**: 각 메서드마다 개별 커밋

---

**업데이트**: 매 작업 완료 시 체크리스트 업데이트
