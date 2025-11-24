# Golden Snapshot 가이드 (초보자용)

**작성일**: 2025-11-24
**대상**: 스냅샷 테스트를 처음 접하는 개발자

---

## 📸 Golden Snapshot이란? (비유로 이해하기)

### 비유 1: 졸업사진 앨범

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

### 시나리오: 해석 엔진 테스트

#### Step 1: 현재 코드 (2025-11-24)

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

---

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

---

#### Step 3: Golden Snapshot 테스트가 자동으로 탐지

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

## 🤔 왜 Golden Snapshot이 필요한가?

### 현재 상황 (Contract 테스트만 있을 때)

```typescript
// __tests__/lib/interpretation/contracts.test.ts (현재 작성됨)
it('t-test 결과의 출력이 스키마를 만족함', () => {
  const result = getInterpretation({
    method: 't-test',
    pValue: 0.03
  })

  // ✅ 스키마 검증: title이 5자 이상인가? summary가 10자 이상인가?
  expect(result.title.length).toBeGreaterThanOrEqual(5)
  expect(result.summary.length).toBeGreaterThanOrEqual(10)
  expect(result.statistical.length).toBeGreaterThanOrEqual(10)
})
```

**통과하는 경우**:
- ✅ `summary: "그룹 간 차이가 유의합니다."` (올바름)
- ✅ `summary: "그룹 간 차이가 유의하지 않습니다."` (❌ 잘못됐지만 통과!)
- ✅ `summary: "완전 엉뚱한 말이지만 10자 이상입니다."` (❌ 통과!)

**문제점**: **내용**은 검증하지 않고 **형식**만 검증
- 길이만 10자 이상이면 OK
- 실제 텍스트가 맞는지 확인 안 함

---

### Golden Snapshot이 있을 때

```typescript
// __tests__/lib/interpretation/snapshots.test.ts (아직 작성 안 함)
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

**Golden Snapshot 내용** (`__snapshots__/snapshots.test.ts.snap`):
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

## 🔍 현재 커버되지 않은 부분

### ✅ 현재 있는 것 (Contract 테스트)

| 검증 항목 | Contract 테스트 | 예시 |
|----------|----------------|------|
| **형식 (타입)** | ✅ | `title`이 string인가? |
| **길이** | ✅ | `summary`가 10자 이상인가? |
| **범위** | ✅ | `pValue`가 0~1 범위인가? |
| **경계값** | ✅ | `statistic`이 NaN이 아닌가? |

**예시 통과 케이스**:
```typescript
// ✅ Contract 테스트 통과 (형식은 맞음)
{
  title: "Test Title",  // 5자 이상 ✓
  summary: "아무 말이나 10자 이상이면 통과합니다.",  // 10자 이상 ✓
  statistical: "이것도 10자 이상이면 OK입니다.",  // 10자 이상 ✓
  practical: null  // null 허용 ✓
}
```

---

### ❌ 현재 없는 것 (Golden Snapshot)

| 검증 항목 | Golden Snapshot | 예시 |
|----------|-----------------|------|
| **내용 (텍스트)** | ❌ | `summary`가 "그룹 간 차이가 유의합니다."인가? |
| **정확한 값** | ❌ | `nextSteps`가 정확히 `["효과 크기 확인", "사후 검정 실시"]`인가? |
| **회귀 방지** | ❌ | 1주일 전 텍스트와 동일한가? |
| **의도하지 않은 변경** | ❌ | 누가 실수로 "유의합니다" → "유의하지 않습니다" 바꿨는가? |

**예시 실패 케이스** (Contract는 통과하지만 Golden은 실패):
```typescript
// ✅ Contract 테스트 통과 (형식은 맞음)
// ❌ Golden Snapshot 실패 (내용이 다름)
{
  title: "Test Title",
  summary: "그룹 간 차이가 유의하지 않습니다.",  // ❌ "유의합니다"여야 하는데!
  statistical: "완전 엉뚱한 말입니다.",  // ❌ 통계적 해석이 틀렸어요!
  practical: "효과 크기가 작습니다."  // ❌ 이것도 틀렸어요!
}
```

---

## 🎯 실제 예시: 버그 사례

### 버그 시나리오 1: 리팩토링 후 텍스트 변경

**Before** (2025-11-24):
```typescript
if (results.pValue < 0.05) {
  return { summary: "통계적으로 유의합니다 (p<0.05)." }
}
```

**After** (2025-12-01, 개발자가 리팩토링):
```typescript
const alpha = 0.05
if (results.pValue < alpha) {
  return { summary: `통계적으로 유의합니다 (p<${alpha}).` }  // "p<0.05" 그대로
}
```

**결과**: ✅ 동일한 출력, 안전한 리팩토링
**Golden Snapshot**: ✅ PASS (변경 없음)

---

**After (실수)** (2025-12-01, 개발자가 실수):
```typescript
const alpha = 0.5  // ❌ 0.05가 아니라 0.5로 잘못 입력!
if (results.pValue < alpha) {
  return { summary: `통계적으로 유의합니다 (p<${alpha}).` }  // "p<0.5" 출력됨
}
```

**결과**: ❌ "p<0.5" 출력 (말이 안 됨! α는 0.05가 표준)
**Contract 테스트**: ✅ PASS (길이 10자 이상이므로)
**Golden Snapshot**: ❌ FAIL (텍스트가 다름!)

```diff
Expected:
- "통계적으로 유의합니다 (p<0.05)."

Received:
+ "통계적으로 유의합니다 (p<0.5)."
```

→ 버그 즉시 탐지!

---

### 버그 시나리오 2: 번역/문구 변경

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
**개발자**: "아, 실수입니다. 되돌리겠습니다."

→ Golden Snapshot이 없었다면 프로덕션까지 배포되었을 수도!

---

## 📊 Contract vs Golden Snapshot 비교

| 항목 | Contract 테스트 | Golden Snapshot |
|------|----------------|-----------------|
| **검증 대상** | 형식 (타입, 길이, 범위) | 내용 (정확한 텍스트) |
| **예시** | `pValue`가 0~1 범위인가? | `summary`가 "그룹 간 차이가 유의합니다."인가? |
| **강점** | 잘못된 데이터 조기 탐지 | 회귀 방지, 텍스트 변경 추적 |
| **약점** | 내용 검증 안 함 | 의도한 변경 시 업데이트 필요 |
| **용도** | 입력 검증 (런타임 에러 방지) | 출력 검증 (회귀 방지) |
| **비유** | "졸업사진이 사진인가?" | "졸업사진이 내 사진인가?" |

---

## 🚀 Golden Snapshot 도입 효과

### 현재 상황 (Contract만 있음)

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

### Golden Snapshot 도입 후

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

## 🎯 요약: 왜 Golden Snapshot이 필요한가?

### Contract 테스트 (현재 있음)

✅ **입구 관문**: 잘못된 데이터가 들어오지 못하게 막음
- `pValue: 1.5` → ❌ "0~1 범위여야 합니다"
- `statistic: NaN` → ❌ "유한한 숫자여야 합니다"

**비유**: 공항 보안검색대 (폭발물 반입 금지)

---

### Golden Snapshot (아직 없음)

✅ **출구 관문**: 잘못된 결과가 나가지 못하게 막음
- `summary: "유의하지 않습니다"` (p<0.05인데?) → ❌ "기준과 다릅니다"
- `interpretation: "완전 엉뚱한 말"` → ❌ "기준과 다릅니다"

**비유**: 공항 출국심사 (여권 위조 방지)

---

### 둘 다 있어야 완벽

```
입력 → [Contract 검증] → 해석 엔진 → [Golden Snapshot 검증] → 출력
         ✅ 형식 OK             처리            ✅ 내용 OK
```

**현재**: Contract만 있음 (입구만 지킴)
**필요**: Golden Snapshot 추가 (출구도 지켜야 함)

---

## 📝 다음 단계: Golden Snapshot 구축

**작업 시간**: 14시간
**생성 파일**: 129개 (43개 통계 × 3 시나리오)

**예시 구조**:
```
__tests__/lib/interpretation/
├── snapshots/
│   ├── t-test.json           (3 scenarios)
│   ├── anova.json            (3 scenarios)
│   ├── correlation.json      (3 scenarios)
│   └── ... (43개 파일)
└── snapshots.test.ts         (자동 실행)
```

**효과**:
- ✅ 회귀 방지 (누군가 실수로 텍스트 변경 → 즉시 탐지)
- ✅ 문서화 (새 개발자가 "아, 이렇게 출력되는구나!" 즉시 이해)
- ✅ 안전한 리팩토링 (출력 동일하면 안심하고 코드 정리)
- ✅ 코드 리뷰 효율화 (Git diff로 변경 사항 명확히 확인)

---

**최종 결론**: Contract 테스트는 "형식"을 지키고, Golden Snapshot은 "내용"을 지킵니다. 둘 다 있어야 완벽한 안전망입니다! 🎉
