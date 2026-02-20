# Golden Values 리뷰 피드백 수정 계획

**작성일**: 2025-12-02
**상태**: 대기 (내일 작업 예정)

---

## 📋 배경

Golden Values 테스트를 5개 Python 라이브러리로 확장한 후 AI 리뷰를 받았습니다.
리뷰에서 5개 주요 이슈가 발견되었으며, 이를 수정해야 합니다.

### 현재 완료된 작업
- [x] `statistical-golden-values.json` - 74개 테스트 케이스 추가
- [x] `python-calculation-accuracy.test.ts` - Jest 스키마 검증 (44개 테스트 통과)
- [x] `constants-dev.ts` - `totalTestCases: 74` vs `jestSchemaTests: 44` 구분 추가

---

## 🔴 수정 필요 사항 (5개)

### Issue 1: Dashboard 커버리지 숫자 불일치 ⭐ 중요

**파일**: `app/(dashboard)/design-system/sections/TestAutomationDashboardSection.tsx`

**문제**:
- Line 104: `coverage: { total: 48, covered: 45 }` - 부정확
- JSON에는 74개 테스트 케이스가 있음
- "45/48 메서드 커버" vs "74개 테스트 케이스" 구분 필요

**수정 방안**:
1. Phase 2.5 설명에 "74 test cases across 45 methods" 명시
2. 또는 두 가지 메트릭 분리 표시

**현재 상태**:
```typescript
// Line 103-105
status: 'complete',
coverage: { total: 48, covered: 45 },  // 메서드 기준
color: 'bg-green-500'
```

---

### Issue 2: Phase 2.5 커버리지 플래그 부정확 ⭐ 중요

**파일**: `app/(dashboard)/design-system/sections/TestAutomationDashboardSection.tsx`

**문제**:
다음 메서드들이 `phase25: true`로 표시되어 있지만, JSON에 실제 golden values가 없음:

- `reliability` (Line 221) - JSON에 없음
- `proportion-test` (Line 223) - JSON에 없음
- `power-analysis` (Line 222) - JSON에 내용 있으나 스키마 불완전
- `ks-test` (Line 195) - JSON에 없음

**수정 방안**:
1. JSON에 없는 메서드는 `phase25: false`로 변경
2. 또는 JSON에 해당 golden values 추가

**검증 방법**:
```bash
# JSON에서 실제 지원하는 메서드 목록 추출
grep -E '"name":' statistical-golden-values.json | sort -u
```

---

### Issue 3: Interpretation Engine 테스트 False Positive 🔴 Critical

**파일**: `__tests__/lib/interpretation/engine-survival-advanced.test.ts`

**문제**:
```typescript
// 현재 패턴 (False Positive 가능)
const result = getInterpretation(analysisType, mockResult)
if (result) {
  expect(result.title).toBeDefined()  // result가 null이면 이 테스트 통과됨
  expect(result.summary).toBeDefined()
}
```

**수정 방안**:
```typescript
// 수정된 패턴
const result = getInterpretation(analysisType, mockResult)
expect(result).not.toBeNull()  // 먼저 null 체크
expect(result!.title).toBeDefined()
expect(result!.summary).toBeDefined()
```

**영향 범위**:
- `engine-survival-advanced.test.ts` (13개 테스트)
- 다른 interpretation 테스트 파일도 동일 패턴 검토 필요

---

### Issue 4: powerAnalysis 스키마 검증 불완전

**파일**: `__tests__/workers/golden-values/python-calculation-accuracy.test.ts`

**문제**:
JSON에 `powerAnalysis` 섹션이 있으나, Jest 테스트에서 내용 검증이 부족할 수 있음

**확인 사항**:
1. `powerAnalysis` 테스트 케이스 존재 여부
2. `expectedKeys` 검증 로직 확인
3. tolerance 값 적절성 검토

---

### Issue 5: 테스트 케이스 수 일관성

**관련 파일들**:
- `constants-dev.ts`: totalTestCases = 74, jestSchemaTests = 44 ✅ 수정 완료
- `TestAutomationDashboardSection.tsx`: 아직 수정 필요
- `statistical-golden-values.json`: 원본 (74 케이스)

**일관성 검증**:
```bash
# JSON 테스트 케이스 수 확인
cd stats
node -e "const j=require('./__tests__/workers/golden-values/statistical-golden-values.json'); let c=0; const count=(o)=>{for(let k in o){if(Array.isArray(o[k]))c+=o[k].length;else if(typeof o[k]==='object')count(o[k])}}; count(j); console.log('Total:', c)"
```

---

## 📊 JSON 테스트 케이스 분포 (74개)

| 라이브러리 | 케이스 수 | 비율 |
|-----------|----------|------|
| SciPy | 44 | 59% |
| statsmodels | 15 | 20% |
| sklearn | 5 | 7% |
| pingouin | 5 | 7% |
| lifelines | 3 | 4% |
| 기타 | 2 | 3% |

---

## ✅ 작업 순서

1. **Dashboard 숫자 수정** (Issue 1)
   - `TestAutomationDashboardSection.tsx` 수정
   - Phase 2.5 설명에 "74 test cases" 명시

2. **Phase 2.5 플래그 수정** (Issue 2)
   - JSON에 없는 메서드 `phase25: false`로 변경
   - reliability, proportion-test, ks-test 등

3. **Interpretation 테스트 수정** (Issue 3)
   - `if (result)` → `expect(result).not.toBeNull()` 변경
   - 모든 interpretation 테스트 파일 검토

4. **powerAnalysis 검증** (Issue 4)
   - Jest 테스트에서 powerAnalysis 검증 확인
   - 필요시 테스트 케이스 추가

5. **테스트 실행 및 검증**
   ```bash
   npm test -- __tests__/workers/golden-values/
   npm test -- __tests__/lib/interpretation/
   npx tsc --noEmit
   ```

---

## 📁 관련 파일 목록

| 파일 | 경로 | 수정 필요 |
|------|------|----------|
| Golden Values JSON | `__tests__/workers/golden-values/statistical-golden-values.json` | - |
| Jest 스키마 테스트 | `__tests__/workers/golden-values/python-calculation-accuracy.test.ts` | Issue 4 |
| Dashboard 섹션 | `app/(dashboard)/design-system/sections/TestAutomationDashboardSection.tsx` | Issue 1, 2 |
| Dev 상수 | `app/(dashboard)/design-system/constants-dev.ts` | ✅ 완료 |
| Interpretation 테스트 | `__tests__/lib/interpretation/engine-survival-advanced.test.ts` | Issue 3 |

---

**예상 소요 시간**: 1-2시간
**우선순위**: Issue 3 (False Positive) > Issue 2 (플래그) > Issue 1 (숫자) > Issue 4 (검증)
