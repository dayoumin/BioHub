# TypeScript 에러 수정 인계 문서

**작성일**: 2025-10-28
**브랜치**: `feature/worker-pool-lazy-loading`
**대상**: 다른 AI 개발자

---

## 📊 현재 상태

### ✅ 완료된 작업 (2025-10-28)
- H3 UI Custom Hook 리팩토링 (15개 페이지)
- H2 Python Worker Helpers (4개 Worker)
- Generic 타입 `TVariables` 추가
- 테스트: 23/23 통과 (100%)

### ⚠️ 남은 작업
- **프로덕션 코드 TypeScript 에러**: ~30개
- **Pattern A 나머지 페이지**: 12개 (total 27개 중 15개 완료)

---

## 🎯 작업 목표

**프로덕션 코드의 TypeScript 에러 수정** (~30개)

**주의사항**:
- ❌ `__tests__/archive-phase5/` 에러는 **무시** (이미 삭제된 폴더)
- ✅ `app/`, `lib/`, `hooks/`, `components/` 에러만 수정
- ✅ 대부분 **기존 코드 이슈** (H3 Hook과 무관)

---

## 🔍 에러 유형 분석

### 1. VariableSelector Props 타입 불일치 (~10개)

**에러 예시**:
```
app/(dashboard)/statistics/anova/page.tsx(193,36): error TS2345:
Argument of type 'SelectedVariables' is not assignable to parameter of type 'Record<string, unknown>'.
```

**원인**:
- 각 페이지마다 다른 변수 타입 사용 (VariableAssignment, SelectedVariables, etc.)
- VariableSelector 컴포넌트가 `Record<string, unknown>` 기대

**해결 방법 1**: 타입 단언
```typescript
// Before
onMappingChange={(mapping) => {
  actions.updateVariableMapping(mapping)
}}

// After
onMappingChange={(mapping) => {
  actions.updateVariableMapping(mapping as VariableMapping)
}}
```

**해결 방법 2**: VariableSelector Props 타입 수정 (더 안전)
```typescript
// components/variable-selection/VariableSelector.tsx
interface VariableSelectorProps {
  onMappingChange: (mapping: Record<string, unknown> | VariableMapping) => void
  // OR
  onMappingChange: (mapping: unknown) => void  // 더 유연함
}
```

**영향받는 파일**:
- anova/page.tsx (2개)
- cross-tabulation/page.tsx (2개)
- descriptive/page.tsx (2개)
- chi-square/page.tsx (1개)
- discriminant/page.tsx (1개)

---

### 2. DataUploadStep onNext 타입 불일치 (~5개)

**에러 예시**:
```
app/(dashboard)/statistics/correlation/page.tsx(415,23): error TS2322:
Type '(data: UploadedData) => void' is not assignable to type '() => void'.
```

**원인**:
- DataUploadStep의 `onNext` prop이 파라미터 없는 함수 기대
- 페이지는 `(data: UploadedData) => void` 전달

**해결 방법 1**: Wrapper 함수 사용
```typescript
// Before
<DataUploadStep
  onNext={handleDataUploaded}  // (data: UploadedData) => void
/>

// After
<DataUploadStep
  onNext={() => {
    // 이미 onUploadComplete로 데이터 받음
  }}
/>
```

**해결 방법 2**: DataUploadStep Props 수정
```typescript
// components/smart-flow/steps/DataUploadStep.tsx
interface DataUploadStepProps {
  onNext?: ((data: UploadedData) => void) | (() => void)  // 둘 다 허용
}
```

**영향받는 파일**:
- correlation/page.tsx
- discriminant/page.tsx
- chi-square-goodness/page.tsx (2개)
- chi-square-independence/page.tsx (2개)

---

### 3. 타입 인덱싱 에러 (~5개)

**에러 예시**:
```
app/(dashboard)/statistics/correlation/page.tsx(452,23): error TS7053:
Element implicitly has an 'any' type because expression of type '"" | "pearson" | "spearman"'
can't be used to index type '{ pearson: {...}; spearman: {...}; }'.
```

**원인**:
- Union 타입으로 객체를 인덱싱하면 TypeScript가 경고
- 빈 문자열 `""` 포함된 Union 타입

**해결 방법**:
```typescript
// Before
const methodConfig = METHOD_CONFIGS[correlationType]  // correlationType: "" | "pearson" | ...

// After
const methodConfig = correlationType ? METHOD_CONFIGS[correlationType as keyof typeof METHOD_CONFIGS] : null
```

**영향받는 파일**:
- correlation/page.tsx (3개)

---

### 4. 객체 리터럴 타입 에러 (~5개)

**에러 예시**:
```
app/(dashboard)/statistics/cluster/page.tsx(798,9): error TS2353:
Object literal may only specify known properties, and 'overview' does not exist in type '{...}'.
```

**원인**:
- 객체에 정의되지 않은 속성 추가

**해결 방법**:
```typescript
// Before
const config = {
  formula: "...",
  overview: "..."  // 타입 정의에 없음
}

// After
const config: Record<string, unknown> = {
  formula: "...",
  overview: "..."
}
```

**영향받는 파일**:
- cluster/page.tsx
- dose-response/page.tsx (여러 개)

---

### 5. 배열 타입 불일치 (~3개)

**에러 예시**:
```
app/(dashboard)/statistics/chi-square-goodness/page.tsx(201,11): error TS2345:
Argument of type 'DataRow[]' is not assignable to parameter of type 'number[]'.
```

**원인**:
- 함수가 `number[]` 기대하는데 `DataRow[]` 전달

**해결 방법**:
```typescript
// Before
pyodideStats.chiSquare(uploadedData.data, ...)  // DataRow[]

// After
const observed = uploadedData.data.map(row => Number(row['observed']))
pyodideStats.chiSquare(observed, ...)  // number[]
```

**영향받는 파일**:
- chi-square-goodness/page.tsx
- chi-square-independence/page.tsx
- ancova/page.tsx

---

### 6. Dose-Response 페이지 특수 에러 (~5개)

**에러 예시**:
```
app/(dashboard)/statistics/dose-response/page.tsx(287,51): error TS2339:
Property 'runPython' does not exist on type '{...}'.
```

**원인**:
- 레거시 API 사용 (runPython은 더 이상 존재하지 않음)
- 특수한 커스텀 구조

**해결 방법**:
- Dose-response 페이지는 **별도 리팩토링** 권장
- 또는 Pattern C (Custom)로 분류하여 수동 수정

**영향받는 파일**:
- dose-response/page.tsx (5개)

---

## 🛠️ 권장 수정 순서

### Phase 1: Quick Fixes (1시간)
**타입 단언으로 빠르게 해결**:
1. VariableSelector 에러 → 타입 단언 추가 (10개)
2. DataUploadStep 에러 → 빈 함수로 변경 (5개)

```bash
cd statistical-platform
npx tsc --noEmit --skipLibCheck 2>&1 | grep "app/" | grep -v "__tests__" | wc -l
# 목표: 30개 → 15개
```

### Phase 2: Proper Fixes (2시간)
**컴포넌트 Props 수정 (더 안전)**:
1. VariableSelector Props 타입 확장
2. DataUploadStep Props 타입 확장
3. 타입 인덱싱 에러 수정

```bash
# 목표: 15개 → 5개
```

### Phase 3: Special Cases (1시간)
**개별 페이지 이슈**:
1. dose-response 페이지 별도 처리
2. cluster 페이지 객체 타입 수정
3. 배열 변환 로직 추가

```bash
# 목표: 5개 → 0개
```

---

## 📋 체크리스트

각 수정 후 확인:
- [ ] `npx tsc --noEmit --skipLibCheck` 실행 (Exit code: 0 목표)
- [ ] 에러 수 감소 확인
- [ ] 프로덕션 코드만 수정 (archive 제외)
- [ ] H3 Hook 파일 건드리지 않음

---

## 🔗 참고 파일

### 타입 정의
- [hooks/use-statistics-page.ts](../statistical-platform/hooks/use-statistics-page.ts) - Generic TVariables
- [components/variable-selection/types.ts](../statistical-platform/components/variable-selection/types.ts) - VariableMapping

### 성공적으로 변환된 페이지 (참고용)
- [descriptive/page.tsx](../statistical-platform/app/(dashboard)/statistics/descriptive/page.tsx) - Pattern B
- [cross-tabulation/page.tsx](../statistical-platform/app/(dashboard)/statistics/cross-tabulation/page.tsx) - Pattern B
- [ancova/page.tsx](../statistical-platform/app/(dashboard)/statistics/ancova/page.tsx) - Pattern A
- [manova/page.tsx](../statistical-platform/app/(dashboard)/statistics/manova/page.tsx) - Pattern A

### 컴포넌트
- [DataUploadStep.tsx](../statistical-platform/components/smart-flow/steps/DataUploadStep.tsx)
- [VariableSelector.tsx](../statistical-platform/components/variable-selection/VariableSelector.tsx)

---

## 🚀 시작하기

```bash
# 1. 브랜치 확인
git branch --show-current  # feature/worker-pool-lazy-loading

# 2. 현재 에러 확인
cd statistical-platform
npx tsc --noEmit --skipLibCheck 2>&1 | grep "app/" | grep -v "__tests__" | grep -v "archive" > ../errors.txt
cat ../errors.txt | wc -l  # ~30개

# 3. 에러 수정 시작
# VariableSelector 에러부터 시작 (가장 많음)

# 4. 진행 상황 확인
npx tsc --noEmit --skipLibCheck 2>&1 | grep "app/" | grep -v "__tests__" | grep -v "archive" | wc -l
```

---

## ✅ 완료 기준

```bash
cd statistical-platform
npx tsc --noEmit --skipLibCheck 2>&1 | grep "app/" | grep -v "__tests__" | grep -v "archive"
# 출력: (empty) - 에러 0개
```

---

**행운을 빕니다!** 🚀

**예상 작업 시간**: 3-4시간
**우선순위**: Medium (H3 Hook과 독립적)
