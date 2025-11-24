# 자동화 테스트 가이드 (Testing Guide)

**AI 시대에 필수적인 자동화 검증 전략**

이 폴더는 통계 플랫폼의 자동화 테스트 시스템을 설명합니다.
43개 통계 분석 메서드의 신뢰성을 보장하는 핵심 문서들입니다.

---

## 📚 문서 구조

### 1️⃣ [왜 자동화 검증이 필요한가?](./01-WHY-TESTING-MATTERS.md)
- 수동 테스트의 한계
- 43개 메서드 × 10개 시나리오 = 430번 테스트?
- AI/Python Worker 신뢰성 문제
- **읽는 시간**: 5분

### 2️⃣ [Contract (계약) 개념](./02-CONTRACT-EXPLAINED.md)
- Contract = 입력/출력 약속
- TypeScript Interface vs Zod Schema
- 실전 예시: T-Test Contract
- **읽는 시간**: 7분

### 3️⃣ [Zod 런타임 검증](./03-ZOD-RUNTIME-VALIDATION.md)
- 왜 TypeScript만으로 부족한가?
- Zod로 Python 응답 검증하기
- 사용자 입력 검증 (CSV 업로드)
- **읽는 시간**: 10분

### 4️⃣ [Golden Snapshot 테스트](./04-GOLDEN-SNAPSHOT.md)
- Golden Snapshot = 정답지 비교
- 통계 결과 자동 검증
- 회귀 테스트 (Regression Test)
- **읽는 시간**: 12분

### 5️⃣ [AI 시대 테스트 전략](./05-AI-ERA-TESTING.md)
- LLM이 생성한 코드 검증
- Python/JavaScript 경계 테스트
- 프롬프트 기반 테스트 케이스 생성
- **읽는 시간**: 8분

---

## 🎯 핵심 개념 3가지

| 개념 | 역할 | 비유 |
|------|------|------|
| **Contract** | 입출력 형식 약속 | 📄 계약서 |
| **Zod** | 런타임 검증 | 🛡️ 보안 검색대 |
| **Golden Snapshot** | 정답과 비교 | 📸 정답지 |

### 실전 예시

```typescript
// 1️⃣ Contract: 약속 정의
const TTestContract = z.object({
  statistic: z.number(),
  pValue: z.number(),
  confidenceInterval: z.tuple([z.number(), z.number()])
});

// 2️⃣ Zod: 런타임 검증
async function runTTest(data: number[][]) {
  const result = await pythonWorker.ttest(data);

  // Python이 약속을 지켰는지 검증!
  const validated = TTestContract.parse(result);

  return validated;  // ✅ 안전
}

// 3️⃣ Golden Snapshot: 정답 비교
test('T-Test: 정규분포 데이터', () => {
  const result = runTTest([[1,2,3], [4,5,6]]);

  // 이전에 저장된 정답과 비교
  expect(result).toMatchSnapshot();
});
```

---

## 🚀 빠른 시작

### 전체 읽기 (권장)
1. [왜 필요한가?](./01-WHY-TESTING-MATTERS.md) - 동기 이해
2. [Contract](./02-CONTRACT-EXPLAINED.md) - 약속 정의
3. [Zod](./03-ZOD-RUNTIME-VALIDATION.md) - 검증 도구
4. [Golden Snapshot](./04-GOLDEN-SNAPSHOT.md) - 자동 회귀 테스트
5. [AI 시대 전략](./05-AI-ERA-TESTING.md) - 미래 대비

### 개념만 빠르게 (10분)
1. [Contract](./02-CONTRACT-EXPLAINED.md) - 섹션 1, 2만
2. [Zod](./03-ZOD-RUNTIME-VALIDATION.md) - 핵심 개념만
3. [Golden Snapshot](./04-GOLDEN-SNAPSHOT.md) - 예시 1개만

### 실전 구현 (개발자)
1. [Zod](./03-ZOD-RUNTIME-VALIDATION.md) - 전체
2. [Golden Snapshot](./04-GOLDEN-SNAPSHOT.md) - 전체
3. [AI 시대 전략](./05-AI-ERA-TESTING.md) - 프롬프트 엔지니어링

---

## 🎓 AI 시대에 왜 중요한가?

### 문제 상황
```typescript
// ❌ AI가 생성한 코드 (GPT-4)
async function analyzeTTest(data) {
  const result = await fetch('/api/python/ttest', { body: data });
  return result.json();  // 타입 체크 없음!
}

// 사용자 코드
const { pValue } = await analyzeTTest(myData);
console.log(pValue);  // undefined 😱 (AI가 필드명 틀림)
```

### 해결책: Contract + Zod + Golden Snapshot
```typescript
// ✅ Contract로 명확한 인터페이스
const TTestContract = z.object({
  pValue: z.number(),
  statistic: z.number()
});

// ✅ Zod로 런타임 검증
async function analyzeTTest(data: number[][]) {
  const result = await fetch('/api/python/ttest', { body: data });
  const json = await result.json();

  // AI가 틀려도 여기서 잡힘!
  return TTestContract.parse(json);
}

// ✅ Golden Snapshot으로 자동 회귀 테스트
test('T-Test 결과 일관성', () => {
  expect(analyzeTTest(testData)).toMatchSnapshot();
});
```

**결과**:
- ✅ AI 코드 오류 즉시 감지
- ✅ Python/JavaScript 경계 안전
- ✅ 43개 메서드 자동 검증 (수동 0번)

---

## 📊 이 프로젝트의 테스트 현황

### Phase 11 목표
- **대상**: 43개 통계 메서드
- **테스트 케이스**: 430개 (메서드당 10개)
- **예상 시간**: 68시간 → 자동화 후 **5분** 🚀

### 구현 상태
- [x] Zod 스키마 설계 (5개 완료)
- [ ] Golden Snapshot 생성 (0/43)
- [ ] E2E 테스트 (0/43)
- [ ] CI/CD 통합 (대기)

**상세**: [AUTOMATED_TESTING_ROADMAP.md](../AUTOMATED_TESTING_ROADMAP.md)

---

## 🔗 관련 문서

### 프로젝트 전체
- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [STATISTICS_CODING_STANDARDS.md](../STATISTICS_CODING_STANDARDS.md) - 코딩 표준

### 테스트 관련
- [AUTOMATED_TESTING_ROADMAP.md](../AUTOMATED_TESTING_ROADMAP.md) - 전체 로드맵
- [TEST_AUTOMATION_ANALYSIS.md](../TEST_AUTOMATION_ANALYSIS.md) - 기술 분석

---

**작성일**: 2025-11-24
**대상**: 개발자, AI 엔지니어, 테스트 담당자
**난이도**: 초급~중급 (코딩 경험 1년 이상 권장)
