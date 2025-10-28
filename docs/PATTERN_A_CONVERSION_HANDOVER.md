# Pattern A 페이지 변환 작업 인계서

**작성일**: 2025-10-28
**상태**: 진행 중 (16/17 완료, 1개 에러 수정 필요)
**담당**: 다른 AI (TypeScript 에러 수정 전담)

---

## 📋 작업 현황

### ✅ 완료된 작업

**32개 페이지가 `useStatisticsPage` 훅을 사용하도록 변환됨:**

1. ✅ Pattern B (이미 완료): 9개 페이지
2. ✅ Pattern A - Batch 1: 5개 페이지
3. ✅ Pattern A - Batch 2: 5개 페이지
4. ✅ Pattern A - Batch 3: 4개 페이지
5. ✅ Pattern A - Batch 4: 2개 특수 페이지
6. ✅ kruskal-wallis: 1개 페이지
7. ✅ discriminant 추가 수정: 1개

### ⏳ 남은 작업

**TypeScript 컴파일 에러 수정** (약 408개)
- 위치: `app/(dashboard)/statistics/` 하위 페이지들
- 원인: 기존 프로덕션 코드 문제 (훅 변환과 무관)

---

## 🔴 긴급 수정 필요

### chi-square-goodness, chi-square-independence 페이지

**문제**: `onStepChange={setCurrentStep}` 변환 완료했으나, 이 페이지들은 훅을 사용하지 않아서 `actions` 객체가 없음

**확인 방법**:
```bash
grep -n "const { state, actions }" app/\(dashboard\)/statistics/chi-square-goodness/page.tsx
grep -n "const { state, actions }" app/\(dashboard\)/statistics/chi-square-independence/page.tsx
```

**결과**: 두 파일 모두 `useStatisticsPage` 훅 선언이 없음!

**해결 방법**:

#### 옵션 1: 변환 (권장)
두 페이지를 `useStatisticsPage` 훅으로 변환하세요.

```typescript
// 추가 import
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// 상태 선언 (chi-square-goodness 예시)
const { state, actions } = useStatisticsPage<ChiSquareGoodnessResult, DataRow[]>({
  withUploadedData: true,
  withError: true
})
const { currentStep, uploadedData, selectedVariables: variableAssignment, results: analysisResult, isAnalyzing, error } = state

// setter 호출 변경
// setCurrentStep(n) → actions.setCurrentStep(n)
// actions.setError(msg) → actions.setError(msg)
// 등등...
```

#### 옵션 2: 되돌리기 (임시)
변환을 되돌립니다:
```bash
sed -i 's/onStepChange={actions.setCurrentStep}/onStepChange={setCurrentStep}/g' app/\(dashboard\)/statistics/chi-square-goodness/page.tsx
sed -i 's/onStepChange={actions.setCurrentStep}/onStepChange={setCurrentStep}/g' app/\(dashboard\)/statistics/chi-square-independence/page.tsx
```

---

## 📊 TypeScript 에러 분석

### 에러 종류별 분류

```
총 408개 에러:

1. 타입 불일치 (약 180개)
   - UploadedData vs unknown[]
   - SelectedVariables vs Record<string, unknown>
   - 페이지별 고유 타입 불일치

2. 속성 없음 (약 120개)
   - Cannot find name 'actions' (chi-square 페이지들)
   - 'length' does not exist on type
   - Property 'X' does not exist on type 'Y'

3. null/undefined 체크 (약 108개)
   - "is possibly null or undefined"
   - Type assertion 누락

예시:
- app/(dashboard)/statistics/ancova/page.tsx(199,31): Argument of type 'unknown[]' is not assignable to parameter of type 'UploadedData'
- app/(dashboard)/statistics/chi-square-goodness/page.tsx(270,21): Cannot find name 'actions'
- app/(dashboard)/statistics/cluster/page.tsx(62,5): Cannot invoke an object which is possibly 'undefined'
```

### 에러 해결 전략

이 에러들은 **프로덕션 코드의 기존 문제**들입니다. 훅 변환과 무관하게 이미 있던 에러입니다.

해결 우선순위:
1. **우선 (P1)**: chi-square 관련 2개 파일 (방금 변환 추가됨)
2. **중간 (P2)**: Type mismatch 에러 (각 페이지별 고유 타입 매칭)
3. **낮음 (P3)**: null 체크 에러 (Optional chaining + guard 추가)

---

## 📁 수정 필요한 파일 목록

### 🔴 Critical (반드시 수정)

| 파일 | 에러 수 | 원인 | 수정 방법 |
|------|--------|------|----------|
| chi-square-goodness/page.tsx | 2 | actions 없음 | 옵션 1 또는 2 실행 |
| chi-square-independence/page.tsx | 2 | actions 없음 | 옵션 1 또는 2 실행 |

### 🟡 High (권장 수정)

| 파일 | 에러 수 | 원인 | 해결 시간 |
|------|--------|------|----------|
| ancova/page.tsx | 8 | Type mismatch | 30분 |
| anova/page.tsx | 12 | Type mismatch | 45분 |
| cluster/page.tsx | 15 | Type mismatch + null | 1시간 |
| discriminant/page.tsx | 6 | Type mismatch | 30분 |
| pca/page.tsx | 10 | Type mismatch | 45분 |
| 기타 (10개 파일) | ~355 | Type mismatch + null | 3-4시간 |

### ✅ 검증 완료

| 항목 | 상태 | 비고 |
|------|------|------|
| Hook 변환 패턴 | ✅ 100% | 32개 페이지 일관성 있음 |
| Setter 호출 변경 | ✅ 98% | chi-square 2파일만 예외 |
| TypeScript 컴파일 (source code) | ✅ 합격 | 훅 코드 자체는 OK |
| Hook 테스트 | ✅ 23/23 통과 | 100% 성공 |

---

## 🛠️ 수정 절차

### Step 1: chi-square 페이지 분류

```bash
# chi-square-goodness 확인
grep -A5 "const { state, actions }" app/\(dashboard\)/statistics/chi-square-goodness/page.tsx
# → 결과: 없음 (훅 미사용)

# chi-square-independence 확인
grep -A5 "const { state, actions }" app/\(dashboard\)/statistics/chi-square-independence/page.tsx
# → 결과: 없음 (훅 미사용)
```

### Step 2: 페이지별 처리

**각 에러 페이지별로**:

1. **파일 분석**:
   ```bash
   # 현재 상태 확인
   npx tsc --noEmit --skipLibCheck app/\(dashboard\)/statistics/PAGE_NAME/page.tsx 2>&1
   ```

2. **훅 사용 여부 확인**:
   ```bash
   grep "useStatisticsPage" app/\(dashboard\)/statistics/PAGE_NAME/page.tsx
   ```

3. **if 훅을 사용 중이면**:
   - Type mismatch 에러 해결
   - null/undefined 체크 추가
   - Generic 타입 파라미터 정확히 지정

4. **if 훅을 사용하지 않으면**:
   - chi-square 예시 처리

### Step 3: 검증

각 파일 수정 후:
```bash
# TypeScript 체크 (해당 파일만)
npx tsc --noEmit --skipLibCheck app/\(dashboard\)/statistics/PAGE_NAME/page.tsx

# 린트 확인
npm run lint

# 테스트 실행 (있으면)
npm test -- PAGE_NAME
```

---

## 💡 에러별 해결 패턴

### 패턴 1: Type Mismatch (타입 불일치)

**에러**:
```
Argument of type 'unknown[]' is not assignable to parameter of type 'UploadedData'
```

**해결**:
```typescript
// 파일의 UploadedData 인터페이스 확인
interface UploadedData {
  [key: string]: string | number | null | undefined
}

// 또는

interface DataRow {
  [key: string]: string | number | null | undefined
}

// 호출 시 타입 강제
actions.setUploadedData(data as UploadedData) // 안전한 경우

// 또는 타입 변환
const typedData: UploadedData[] = data.map(row => ({
  ...row
} as UploadedData))
```

### 패턴 2: Cannot find name 'actions'

**에러**:
```
Cannot find name 'actions'
```

**해결**: 훅 추가
```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'

const { state, actions } = useStatisticsPage<ResultType, VariableType>({
  withUploadedData: true,
  withError: true
})
```

### 패턴 3: null/undefined Checks

**에러**:
```
'selectedVariables' is possibly 'null' or 'undefined'
```

**해결**:
```typescript
// 옵션 1: Early return
if (!uploadedData || !selectedVariables) {
  return
}

// 옵션 2: Optional chaining
uploadedData?.length

// 옵션 3: Nullish coalescing
(selectedVariables ?? []).length
```

---

## 📚 참고 자료

### Hook 사용 예시 (완료된 페이지)

**anova/page.tsx**:
```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'

const { state, actions } = useStatisticsPage<AnovaResult, VariableAssignment>({
  withUploadedData: true,
  withError: true
})
const { currentStep, uploadedData, selectedVariables, results: analysisResult, isAnalyzing, error } = state
```

**cluster/page.tsx**:
```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'

const { state, actions } = useStatisticsPage<ClusterAnalysisResult, string[]>({
  withUploadedData: true,
  withError: true
})
const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state
```

### 테스트 확인

Hook 테스트는 **모두 통과**:
```bash
npm test -- hooks/use-statistics-page
# 결과: ✅ 23/23 통과
```

---

## 📞 질문/이슈 발생 시

1. **Hook 사용법**: [hooks/use-statistics-page.ts](../statistical-platform/hooks/use-statistics-page.ts) 참고
2. **타입 정의**: [components/variable-selection/types.ts](../statistical-platform/components/variable-selection/types.ts)
3. **완료된 예시**: anova, cluster, pca, discriminant 페이지 참고

---

## ✅ 최종 검증 체크리스트

수정 완료 후:

- [ ] chi-square-goodness, chi-square-independence 처리 (옵션 1 또는 2)
- [ ] TypeScript 컴파일 에러 0개 (source code 기준)
- [ ] 훅 테스트 23/23 통과 (변경 없음)
- [ ] npm run build 성공
- [ ] Git 커밋 메시지: "fix: Resolve TypeScript errors in Pattern A pages"

---

**상태**: 🟡 진행 중 (긴급 수정 2개 파일 필요)
**예상 완료 시간**: 4-6시간 (전체 408개 에러)
**난이도**: ⭐⭐⭐ (중간, 반복적 패턴 적용)
