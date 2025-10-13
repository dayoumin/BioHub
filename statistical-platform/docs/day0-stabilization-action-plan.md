# Day 0 Stabilization Action Plan

**작성일**: 2025-10-03
**목표**: Phase 5 시작 전 코드베이스 안정화
**예상 시간**: 4-5시간

---

## 🎯 목표

1. ✅ TypeScript 컴파일 오류 0개
2. ✅ 빌드 성공 (60초 이내)
3. ✅ 파일 구조 명확화
4. ✅ CLAUDE.md AI 가이드라인 추가 (완료)

---

## 📋 작업 목록

### Task 1: 파일 구조 정리 (1시간)

#### 1.1 루트 레벨 파일 용도 확인
**대상**:
- `lib/statistics/descriptive.ts` (189줄)
- `lib/statistics/anova.ts`
- `lib/statistics/advanced.ts`
- `lib/statistics/regression.ts`
- `lib/statistics/nonparametric.ts`
- `lib/statistics/t-tests.ts`

**작업**:
```bash
# 1. 각 파일이 import되는 곳 확인
grep -r "from.*'@/lib/statistics/descriptive'" statistical-platform
grep -r "from.*'./descriptive'" statistical-platform/lib

# 2. 용도 판단
# - Phase 5 실험 → groups/ 폴더로 이동
# - 과거 버전 → 삭제
# - Pyodide 테스트 → lib/services/pyodide/modules/ 이동
```

**결정 기준**:
- ✅ Import 1곳만 (`lib/services/pyodide/index.ts`) → Pyodide 테스트용
- ✅ Phase 5 groups 구조와 다름 → 이동 또는 삭제
- ✅ `calculator-handlers/`와 중복 → 삭제

#### 1.2 중복 라우터 파일 정리
**대상**:
- `lib/statistics/method-router.ts` (115줄, 현재 사용 중)
- `lib/statistics/method-router-refactored.ts` (용도 불명)

**작업**:
```bash
# 1. method-router-refactored.ts 사용 여부 확인
grep -r "method-router-refactored" statistical-platform

# 2. 미사용 시 삭제
rm lib/statistics/method-router-refactored.ts
```

---

### Task 2: 타입 오류 수정 (3시간)

#### 2.1 Pyodide 서비스 메서드 네이밍 통일 (30분)

**Step 1**: 실제 메서드 확인
```bash
# Pyodide 서비스에서 제공하는 실제 메서드 목록
grep "async.*Test\|async.*Stats" lib/services/pyodide-statistics.ts
```

**Step 2**: Executors 파일 수정
```typescript
// ❌ Before (lib/services/executors/descriptive-executor.ts:19)
await pyodideService.calculateDescriptiveStats(values)

// ✅ After
await pyodideService.calculateDescriptiveStatistics(values)
```

**수정 대상 파일**:
- `lib/services/executors/descriptive-executor.ts` (3곳)
- `lib/services/executors/anova-executor.ts` (5곳)
- `lib/services/executors/t-test-executor.ts` (4곳)

#### 2.2 Null 체크 추가 (1시간)

**패턴**:
```typescript
// ❌ Before (TS2531: Object is possibly 'null')
this.pyodide.runPythonAsync(...)

// ✅ After
if (!this.pyodide) {
  throw new Error('Pyodide not initialized')
}
this.pyodide.runPythonAsync(...)
```

**수정 대상 파일**:
- `lib/services/pyodide-statistics.ts` (30곳)
  - Line 142, 161, 203, 264, 348, 350, 751, 752, 754, 841-849, 963

**자동화 스크립트**:
```typescript
// add-null-checks.ts
function addNullCheck(code: string): string {
  return code.replace(
    /this\.pyodide\.(runPythonAsync|loadPackage)/g,
    (match) => {
      return `
if (!this.pyodide) {
  throw new Error('Pyodide not initialized')
}
${match}`
    }
  )
}
```

#### 2.3 카멜케이스 불일치 수정 (20분)

**찾기-바꾸기**:
```typescript
// pvalue → pValue
result.pvalue  →  result.pValue

// 영향 파일
lib/services/executors/anova-executor.ts (21, 36)
lib/services/executors/nonparametric-executor.ts
lib/services/executors/t-test-executor.ts (69, 93)
```

#### 2.4 타입 정의 불일치 해결 (1시간)

**A. PyodideInterface 중복 선언**
```typescript
// lib/services/pyodide-statistics.ts:24
// ❌ 중복 선언 제거
private pyodide: PyodideInterface | null = null
private loadPyodide: ((config: { indexURL: string }) => Promise<PyodideInterface>) | undefined

// ✅ types/pyodide.d.ts 사용
```

**B. 메서드 반환 타입 불일치**
```typescript
// lib/services/executors/advanced-executor.ts:21
// ❌ explainedVarianceRatio
result.explainedVarianceRatio

// ✅ Pyodide 서비스 반환 타입 확인 후 수정
result.explainedVariance
```

#### 2.5 테스트 파일 수정 (30분)

**React Component Props**:
```typescript
// __tests__/*.test.tsx
// ❌ Property 'children' does not exist on type 'unknown'
const { children, title } = wrapper.find('StatCard').props()

// ✅ 타입 단언
const props = wrapper.find('StatCard').props() as { children: React.ReactNode; title: string }
const { children, title } = props
```

---

### Task 3: 빌드 검증 (30분)

#### 3.1 타입 체크
```bash
cd statistical-platform
npx tsc --noEmit
# 목표: 0 errors
```

#### 3.2 빌드 실행
```bash
npm run build
# 목표: 60초 이내 성공
```

#### 3.3 테스트 실행 (선택)
```bash
npm test -- --testPathPattern=statistics
# 목표: 27개 테스트 통과
```

---

## 🔍 검증 체크리스트

### 필수
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → Success
- [ ] `git status` → 파일 구조 정리 완료
- [ ] CLAUDE.md → AI 가이드라인 추가 ✅

### 권장
- [ ] 유닛 테스트 통과
- [ ] E2E 테스트 재실행 (기존 3/3 유지)
- [ ] 코드 리뷰 문서 작성 ✅

---

## 📊 진행 상황 추적

| Task | 상태 | 시간 | 완료 시각 |
|------|------|------|----------|
| CLAUDE.md 업데이트 | ✅ 완료 | 10분 | 2025-10-03 15:30 |
| 임시 파일 삭제 | ✅ 완료 | 5분 | 2025-10-03 15:35 |
| 코드 리뷰 문서 작성 | ✅ 완료 | 30분 | 2025-10-03 16:05 |
| 파일 구조 정리 | ⏳ 진행 중 | - | - |
| 타입 오류 수정 | ⏳ 대기 | - | - |
| 빌드 검증 | ⏳ 대기 | - | - |

---

## 🚨 위험 요소

### 1. 빌드 시간 초과 (2분+)
**원인**: TypeScript 컴파일 복잡도
**대응**:
- incremental build 활성화
- 불필요한 타입 체크 제외

### 2. 테스트 실패
**원인**: 타입 수정으로 인한 부작용
**대응**:
- 롤백 가능하도록 Git 커밋 분리
- 테스트별로 수정

### 3. 파일 삭제 후 빌드 실패
**원인**: 숨겨진 의존성
**대응**:
- 삭제 전 import 검색 철저히
- Git 브랜치 생성

---

## 🎯 성공 기준

### 최소 목표 (Must)
- ✅ TypeScript 컴파일 오류 0개
- ✅ 빌드 성공

### 목표 (Should)
- ✅ 유닛 테스트 27개 통과
- ✅ 파일 구조 명확화

### 이상적 목표 (Nice to Have)
- ✅ E2E 테스트 3/3 통과
- ✅ 빌드 시간 < 45초
- ✅ 문서화 완료

---

## 📝 다음 단계

### Day 0 완료 후
1. 커밋 생성: "chore: Day 0 stabilization - fix type errors and clean up files"
2. Phase 5-1 브랜치 생성: `refactor/phase5-1-registry`
3. Phase 5 Day 1 시작

### Phase 5 Day 1 작업
- Registry 기반 그룹 모듈 분리
- 핸들러 → 그룹 마이그레이션
- 테스트 업데이트

---

**작성자**: Claude Code
**리뷰어**: [사용자명]
**승인 여부**: [ ] 승인 / [ ] 수정 필요
