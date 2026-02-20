# Golden Snapshot 테스트

**정답지와 비교하여 회귀 버그 자동 탐지**

---

## 📸 Golden Snapshot이란?

### 비유: 졸업사진 앨범

```
1. 2020년 3월: 졸업사진 촬영 📸
   → 앨범에 사진 보관 (Golden Snapshot)

2. 2025년 11월: 동창회 사진 촬영 📸
   → 옛날 앨범과 비교

3. 비교 결과:
   - 머리 색깔: 검정 → 갈색 ✅ (염색함, 의도한 변경)
   - 키: 175cm → 160cm ❌ (이상함! 버그?)
   - 얼굴: 그대로 ✅
```

**Golden Snapshot = 졸업사진 (기준점)**
- 나중에 비교할 기준이 되는 "정답"
- 시간이 지나도 변하지 않아야 할 것

---

## 🎯 코드에서의 Golden Snapshot

### 예시: 통계 해석 엔진

#### Step 1: 현재 코드 실행 (2025-11-24)

```typescript
// lib/interpretation/engine.ts
function getInterpretation(results: AnalysisResult) {
  if (results.pValue < 0.05) {
    return {
      summary: "그룹 간 차이가 유의합니다.",
      interpretation: "통계적으로 의미 있는 차이입니다.",
      nextSteps: ["효과 크기 확인", "사후 검정 실시"]
    }
  }
}
```

**실행 결과** (이것이 Golden Snapshot이 됨):
```json
{
  "summary": "그룹 간 차이가 유의합니다.",
  "interpretation": "통계적으로 의미 있는 차이입니다.",
  "nextSteps": ["효과 크기 확인", "사후 검정 실시"]
}
```

#### Step 2: 1주일 후 누군가 코드 수정

```typescript
// 개발자 A가 실수로 "유의합니다" → "유의하지 않습니다" 변경
function getInterpretation(results: AnalysisResult) {
  if (results.pValue < 0.05) {
    return {
      summary: "그룹 간 차이가 유의하지 않습니다.",  // ❌ 버그!
      interpretation: "통계적으로 의미 있는 차이입니다.",
      nextSteps: ["효과 크기 확인", "사후 검정 실시"]
    }
  }
}
```

**문제**: p < 0.05인데 "유의하지 않습니다"라고 출력 → 말이 안 됨!

#### Step 3: Golden Snapshot 테스트가 자동 탐지

```bash
npm test -- snapshots.test.ts

❌ FAIL: t-test significant scenario

Expected (Golden Snapshot):
  "summary": "그룹 간 차이가 유의합니다."

Received (현재 코드):
  "summary": "그룹 간 차이가 유의하지 않습니다."
```

**자동으로 버그 탐지!** → 개발자 A가 바로 수정

---

## 🤔 Contract vs Golden Snapshot

### Contract 테스트 (형식 검증)

```typescript
// __tests__/lib/interpretation/contracts.test.ts
it('t-test 결과의 출력이 스키마를 만족함', () => {
  const result = getInterpretation({
    method: 't-test',
    pValue: 0.03
  })

  // ✅ 스키마 검증: 형식만 체크
  expect(result.title.length).toBeGreaterThanOrEqual(5)
  expect(result.summary.length).toBeGreaterThanOrEqual(10)
})
```

**통과하는 경우**:
- ✅ `summary: "그룹 간 차이가 유의합니다."` (올바름)
- ✅ `summary: "그룹 간 차이가 유의하지 않습니다."` (❌ 잘못됐지만 통과!)
- ✅ `summary: "완전 엉뚱한 말이지만 10자 이상입니다."` (❌ 통과!)

**문제점**: **내용**은 검증하지 않고 **형식**만 검증

---

### Golden Snapshot (내용 검증)

```typescript
// __tests__/lib/interpretation/snapshots.test.ts
it('t-test significant scenario', () => {
  const result = getInterpretation({
    method: 't-test',
    pValue: 0.03
  })

  // ✅ 스냅샷 검증: 텍스트가 정확히 일치하는가?
  expect(result).toMatchSnapshot()
  // → 저장된 Golden Snapshot과 1글자라도 다르면 FAIL
})
```

**Golden Snapshot 파일** (`__snapshots__/snapshots.test.ts.snap`):
```javascript
exports[`t-test significant scenario`] = `
{
  "summary": "그룹 간 차이가 유의합니다.",
  "interpretation": "통계적으로 의미 있는 차이입니다.",
  "nextSteps": ["효과 크기 확인", "사후 검정 실시"]
}
`;
```

**통과하는 경우**:
- ✅ `summary: "그룹 간 차이가 유의합니다."` (정확히 일치)
- ❌ `summary: "그룹 간 차이가 유의하지 않습니다."` (다름, FAIL!)
- ❌ `summary: "완전 엉뚱한 말"` (다름, FAIL!)

**장점**: **내용까지 정확히 검증** (1글자라도 다르면 실패)

---

## 📊 비교표

| 항목 | Contract 테스트 | Golden Snapshot |
|------|----------------|-----------------|
| **검증 대상** | 형식 (타입, 길이, 범위) | 내용 (정확한 텍스트/값) |
| **예시** | `pValue`가 0~1 범위인가? | `summary`가 "그룹 간 차이가 유의합니다."인가? |
| **강점** | 잘못된 데이터 조기 탐지 | 회귀 방지, 텍스트 변경 추적 |
| **약점** | 내용 검증 안 함 | 의도한 변경 시 업데이트 필요 |
| **용도** | 입력 검증 (런타임 에러 방지) | 출력 검증 (회귀 방지) |
| **비유** | "이게 사진인가?" | "이게 내 사진인가?" |

---

## 🐛 실제 버그 사례

### 버그 1: 리팩토링 후 텍스트 변경

**Before** (2025-11-24):
```typescript
if (results.pValue < 0.05) {
  return { summary: "통계적으로 유의합니다 (p<0.05)." }
}
```

**After** (개발자가 실수):
```typescript
const alpha = 0.5  // ❌ 0.05가 아니라 0.5로 잘못 입력!
if (results.pValue < alpha) {
  return { summary: `통계적으로 유의합니다 (p<${alpha}).` }
}
```

**결과**: ❌ "p<0.5" 출력 (말이 안 됨! α는 0.05가 표준)

**Contract 테스트**: ✅ PASS (길이 10자 이상이므로)
**Golden Snapshot**: ❌ FAIL

```diff
Expected:
- "통계적으로 유의합니다 (p<0.05)."

Received:
+ "통계적으로 유의합니다 (p<0.5)."
```

→ 버그 즉시 탐지!

---

### 버그 2: 번역/문구 변경

**Before**:
```typescript
summary: "그룹 간 차이가 유의합니다."
```

**After** (누군가 "더 친절하게" 바꾸려고 시도):
```typescript
summary: "그룹 간 차이가 통계적으로 매우 유의합니다! 축하드립니다!"
```

**Contract 테스트**: ✅ PASS (길이 10자 이상)
**Golden Snapshot**: ❌ FAIL

```diff
Expected:
- "그룹 간 차이가 유의합니다."

Received:
+ "그룹 간 차이가 통계적으로 매우 유의합니다! 축하드립니다!"
```

**리뷰어**: "왜 '축하드립니다'를 추가했나요? 학술적 톤이 아닌데요?"

→ Golden Snapshot이 없었다면 프로덕션까지 배포되었을 수도!

---

## 🛡️ 완벽한 안전망

### Contract 테스트 (입구 관문)

✅ 잘못된 데이터가 들어오지 못하게 막음
- `pValue: 1.5` → ❌ "0~1 범위여야 합니다"
- `statistic: NaN` → ❌ "유한한 숫자여야 합니다"

**비유**: 공항 보안검색대 (폭발물 반입 금지)

---

### Golden Snapshot (출구 관문)

✅ 잘못된 결과가 나가지 못하게 막음
- `summary: "유의하지 않습니다"` (p<0.05인데?) → ❌ "기준과 다릅니다"
- `interpretation: "완전 엉뚱한 말"` → ❌ "기준과 다릅니다"

**비유**: 공항 출국심사 (여권 위조 방지)

---

### 둘 다 있어야 완벽

```
입력 → [Contract 검증] → 해석 엔진 → [Golden Snapshot 검증] → 출력
         ✅ 형식 OK             처리            ✅ 내용 OK
```

---

## 🚀 Golden Snapshot 구현

### Jest Snapshot 사용법

```typescript
// __tests__/lib/interpretation/snapshots.test.ts
import { getInterpretation } from '@/lib/interpretation/engine';

describe('T-Test Interpretation Snapshots', () => {
  it('significant result (p < 0.05)', () => {
    const result = getInterpretation({
      method: 't-test',
      pValue: 0.03,
      statistic: 2.5,
      degreesOfFreedom: 18
    });

    expect(result).toMatchSnapshot();
  });

  it('non-significant result (p >= 0.05)', () => {
    const result = getInterpretation({
      method: 't-test',
      pValue: 0.15,
      statistic: 1.2,
      degreesOfFreedom: 18
    });

    expect(result).toMatchSnapshot();
  });

  it('marginal result (p ≈ 0.05)', () => {
    const result = getInterpretation({
      method: 't-test',
      pValue: 0.051,
      statistic: 2.01,
      degreesOfFreedom: 18
    });

    expect(result).toMatchSnapshot();
  });
});
```

### 생성되는 Snapshot 파일

```javascript
// __tests__/lib/interpretation/__snapshots__/snapshots.test.ts.snap

exports[`T-Test Interpretation Snapshots significant result (p < 0.05) 1`] = `
{
  "summary": "그룹 간 차이가 유의합니다.",
  "title": "유의한 차이 발견",
  "statistical": "t(18) = 2.5, p = 0.030으로 유의수준 0.05에서 통계적으로 유의합니다.",
  "practical": "효과 크기를 확인하여 실질적 의미를 평가하세요.",
  "nextSteps": [
    "효과 크기 확인 (Cohen's d)",
    "신뢰구간 해석",
    "결과의 실질적 의미 검토"
  ]
}
`;

exports[`T-Test Interpretation Snapshots non-significant result (p >= 0.05) 1`] = `
{
  "summary": "그룹 간 차이가 유의하지 않습니다.",
  "title": "차이 없음",
  "statistical": "t(18) = 1.2, p = 0.150으로 유의수준 0.05에서 통계적으로 유의하지 않습니다.",
  "practical": "표본 크기가 충분한지 검토하세요 (검정력 분석 권장).",
  "nextSteps": [
    "표본 크기 재검토",
    "검정력 분석",
    "효과 크기 확인 (차이가 작을 수 있음)"
  ]
}
`;
```

---

## 🔧 Snapshot 업데이트

### 의도한 변경 시

```bash
# 1. 코드 수정 (의도적 변경)
# lib/interpretation/engine.ts
summary: "그룹 간 차이가 통계적으로 유의합니다."  # "통계적으로" 추가

# 2. 테스트 실행
npm test -- snapshots.test.ts

# ❌ FAIL (예상됨)
Expected: "그룹 간 차이가 유의합니다."
Received: "그룹 간 차이가 통계적으로 유의합니다."

# 3. Snapshot 업데이트
npm test -- snapshots.test.ts -u

# ✅ Snapshot 업데이트됨
```

**주의**: `-u` 플래그는 신중히 사용! (모든 변경 사항 리뷰 필수)

---

## 📁 이 프로젝트의 구조 (계획)

```
stats/
└── __tests__/
    └── lib/
        └── interpretation/
            ├── __snapshots__/
            │   └── snapshots.test.ts.snap  (자동 생성)
            ├── contracts.test.ts           (✅ 현재 있음)
            └── snapshots.test.ts           (🔜 추가 예정)
```

### 예상 Snapshot 수

| 통계 분석 | 시나리오 | 총 Snapshot |
|----------|---------|-------------|
| 43개 통계 | 3개씩 | **129개** |

**시나리오 예시**:
1. 유의한 결과 (p < 0.05)
2. 비유의한 결과 (p >= 0.05)
3. 경계값 (p ≈ 0.05)

---

## 🎯 Golden Snapshot의 효과

### 도입 전 (Contract만 있음)

```
개발자 A: 코드 수정
  ↓
npm test -- contracts.test.ts
  ↓
✅ PASS (형식은 맞음)
  ↓
Git 커밋
  ↓
프로덕션 배포
  ↓
사용자: "왜 p<0.05인데 '유의하지 않습니다'라고 나와요?" ❌
```

**발견 시점**: 프로덕션 (늦음!)
**영향**: 사용자에게 잘못된 정보 제공

---

### 도입 후 (Contract + Golden Snapshot)

```
개발자 A: 코드 수정
  ↓
npm test -- snapshots.test.ts
  ↓
❌ FAIL (텍스트가 다름!)
  ↓
개발자 A: "오, 실수했네. 되돌려야겠다."
  ↓
코드 수정
  ↓
✅ PASS
  ↓
Git 커밋
```

**발견 시점**: 개발 중 (빠름!)
**영향**: 없음 (커밋 전에 수정)

---

## 📊 ROI (투자 대비 효과)

### 비용

- **초기 작업**: 14시간 (129개 Snapshot 생성)
- **유지보수**: 거의 0시간 (자동 실행)

### 효과

- ✅ **회귀 방지**: 실수로 텍스트 변경 → 즉시 탐지
- ✅ **문서화**: 새 개발자가 "아, 이렇게 출력되는구나!" 즉시 이해
- ✅ **안전한 리팩토링**: 출력 동일하면 안심하고 코드 정리
- ✅ **코드 리뷰 효율화**: Git diff로 변경 사항 명확히 확인
- ✅ **QA 시간 절감**: 수동 테스트 불필요

---

## 🎓 핵심 요약

### Golden Snapshot이란?

**정답지를 저장해두고, 나중에 실행 결과와 비교하는 테스트**

### 언제 사용하는가?

- ✅ 통계 해석 텍스트 (이 프로젝트)
- ✅ UI 렌더링 결과 (React 컴포넌트)
- ✅ API 응답 형식
- ✅ 복잡한 계산 결과

### 주의사항

- ⚠️ 의도한 변경 시 Snapshot 업데이트 필수 (`-u` 플래그)
- ⚠️ 무분별한 업데이트 금지 (변경 사항 리뷰 필수)
- ⚠️ 동적 값 (시간, 랜덤) 제외 필요

---

## 🔗 다음 단계

Golden Snapshot 개념을 이해했으니, 이제 **AI 시대의 테스트 전략**을 알아봅시다:

**다음**: [AI 시대 테스트 전략 →](./05-AI-ERA-TESTING.md)
