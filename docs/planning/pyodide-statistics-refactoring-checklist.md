# pyodide-statistics.ts 리팩토링 체크리스트

**생성일**: 2025-10-17 18:00
**목적**: PyodideCore 추출 후 pyodide-statistics.ts 안전한 수정
**파일**: [pyodide-statistics.ts](../../statistical-platform/lib/services/pyodide-statistics.ts) (2,693 lines)

---

## 📊 수정 개요

| 항목 | 현재 | 목표 | 변경 |
|------|------|------|------|
| 총 라인 수 | 2,693 | 2,351 | -342 lines (12.7% 감소) |
| 삭제할 메서드 | 12개 | 0개 | -12 (core로 이동 완료) |
| 수정할 메서드 | 58개 | 58개 | delegation 변경 |
| 유지할 메서드 | 44개 | 44개 | 변경 없음 |

---

## 🎯 수정 전략

### 원칙
1. **안전 우선**: 한 번에 하나의 섹션만 수정
2. **즉시 검증**: 각 단계 후 TypeScript 컴파일 체크
3. **롤백 가능**: Git commit을 단계별로 생성
4. **테스트 필수**: 최종 단계에서 60개 통합 테스트 실행

### 작업 순서
1. **Phase 1**: Private 메서드 삭제 (lines 197-603, 342 lines)
2. **Phase 2**: Public 메서드 delegation 변경 (lines 370-394, 2674)
3. **Phase 3**: 통계 메서드 업데이트 (56개 메서드)
4. **Phase 4**: 검증 및 테스트

---

## 📝 Phase 1: Private 메서드 삭제

### Step 1: parsePythonResult 삭제
**라인**: 197-207 (11 lines)
**현재 코드**:
```typescript
private parsePythonResult<T>(payload: any): T {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as T
    } catch {
      // 문자열이지만 JSON 아님
      return payload as T
    }
  }
  return payload as T
}
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.parsePythonResult()로 대체

---

### Step 2: callWorkerMethod 삭제
**라인**: 224-282 (59 lines)
**메서드 시그니처**:
```typescript
private async callWorkerMethod<T>(
  workerNum: 1 | 2 | 3 | 4,
  methodName: string,
  params: Record<string, WorkerMethodParam>,
  options: WorkerMethodOptions = {}
): Promise<T>
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.callWorkerMethod()로 대체
**영향**: 56개 통계 메서드가 이 메서드를 호출 (Phase 3에서 수정)

---

### Step 3: validateWorkerParam 삭제
**라인**: 291-358 (68 lines)
**메서드 시그니처**:
```typescript
private validateWorkerParam(key: string, value: WorkerMethodParam): void
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.validateWorkerParam()로 대체

---

### Step 4: _loadPyodide 삭제
**라인**: 397-485 (89 lines)
**메서드 시그니처**:
```typescript
private async _loadPyodide(): Promise<void>
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService._loadPyodide()로 대체

---

### Step 5: loadAdditionalPackages 삭제
**라인**: 490-502 (13 lines)
**메서드 시그니처**:
```typescript
private async loadAdditionalPackages(workerNumber: number): Promise<void>
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.loadAdditionalPackages()로 대체

---

### Step 6: getWorkerFileName 삭제
**라인**: 508-516 (9 lines)
**메서드 시그니처**:
```typescript
private getWorkerFileName(workerNumber: number): string
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.getWorkerFileName()로 대체

---

### Step 7: ensureWorkerLoaded 삭제
**라인**: 522-575 (54 lines)
**메서드 시그니처**:
```typescript
private async ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4): Promise<void>
```

**작업**: 전체 메서드 삭제
**이유**: PyodideCoreService.ensureWorkerLoaded()로 대체

---

### Step 8: ensureWorker1/2/3/4Loaded 삭제
**라인**: 580-603 (24 lines, 4개 메서드)
**메서드 목록**:
- `ensureWorker1Loaded()` (lines 580-582)
- `ensureWorker2Loaded()` (lines 587-589)
- `ensureWorker3Loaded()` (lines 594-596)
- `ensureWorker4Loaded()` (lines 601-603)

**작업**: 4개 메서드 모두 삭제
**이유**: PyodideCoreService.ensureWorker[1-4]Loaded()로 대체

---

## 📝 Phase 2: Public API 메서드 Delegation 변경

### Step 9: initialize() 수정
**라인**: 370-394 (25 lines)

**Before**:
```typescript
async initialize(): Promise<void> {
  console.log('[PyodideService.initialize] 시작')
  if (this.isInitialized()) {
    console.log('[PyodideService.initialize] 이미 초기화됨 (빠른 반환)')
    return
  }
  if (this.isLoading && this.loadPromise) {
    console.log('[PyodideService.initialize] 이미 로딩 중, 기다리는 중...')
    return this.loadPromise
  }

  this.isLoading = true
  this.loadPromise = this._loadPyodide()

  try {
    await this.loadPromise
    console.log('[PyodideService.initialize] 초기화 성공!')
  } catch (error) {
    console.error('[PyodideService.initialize] 초기화 실패:', error)
    throw error
  } finally {
    this.isLoading = false
  }
}
```

**After**:
```typescript
async initialize(): Promise<void> {
  return this.core.initialize()
}
```

**변경**: 25 lines → 3 lines (22 lines 감소)

---

### Step 10: isInitialized() 수정
**라인**: 2674-2678 (5 lines)

**Before**:
```typescript
isInitialized(): boolean {
  const initialized = this.pyodide !== null
  console.log(`[PyodideService.isInitialized] ${initialized ? '초기화됨' : '초기화 안됨'}`)
  return initialized
}
```

**After**:
```typescript
isInitialized(): boolean {
  return this.core.isInitialized()
}
```

**변경**: 5 lines → 3 lines (2 lines 감소)

---

## 📝 Phase 3: 통계 메서드 업데이트 (56개)

### 수정 패턴

**Before**:
```typescript
async someStatisticalMethod(...params): Promise<SomeResult> {
  return this.callWorkerMethod<SomeResult>(
    workerNum,
    'method_name',
    { param1, param2 }
  )
}
```

**After**:
```typescript
async someStatisticalMethod(...params): Promise<SomeResult> {
  return this.core.callWorkerMethod<SomeResult>(
    workerNum,
    'method_name',
    { param1, param2 }
  )
}
```

**변경**: `this.callWorkerMethod` → `this.core.callWorkerMethod`

---

### 수정 대상 메서드 목록 (56개)

#### Worker 1 메서드 (기술통계)
1. Line 662-671: `leveneTest()`
2. Line 722-731: `kolmogorovSmirnovTest()`

#### Worker 2 메서드 (가설검정)
3. Line 701-710: `bartlettTest()`
4. Line 860-869: `mannWhitneyUTest()`
5. Line 887-896: `wilcoxonSignedRankTest()`

#### Worker 3 메서드 (비모수/ANOVA)
6. Line 908-917: `kruskalWallisTest()`
7. Line 931-940: `friedmanTest()`
8. Line 957-966: `jonckheereTrendTest()`
9. Line 990-999: `medianTest()`
10. Line 1014-1023: `signTest()`

#### Worker 4 메서드 (회귀/고급)
11. Line 1922: `multipleRegression()` - 특별 처리 (ensureWorker2Loaded 호출)

**나머지 45개 메서드**: 동일한 패턴으로 수정

---

### 특별 처리 메서드

#### correlationAnalysis() (Line 1058)
**Before**:
```typescript
async correlationAnalysis(...): Promise<...> {
  await this.ensureWorker2Loaded()
  // ... rest of code
}
```

**After**:
```typescript
async correlationAnalysis(...): Promise<...> {
  await this.core.ensureWorker2Loaded()
  // ... rest of code
}
```

#### multipleRegression() (Line 1922)
**Before**:
```typescript
async multipleRegression(...): Promise<...> {
  await this.ensureWorker2Loaded()
  // ... rest of code
}
```

**After**:
```typescript
async multipleRegression(...): Promise<...> {
  await this.core.ensureWorker2Loaded()
  // ... rest of code
}
```

---

## 📝 Phase 4: 검증 및 테스트

### Step 11: TypeScript 컴파일 체크

**명령어**:
```bash
cd statistical-platform
npx tsc --noEmit
```

**예상 결과**: 0 errors

**예상 에러 및 해결**:
1. **Import 누락**: PyodideCoreService import 확인
2. **타입 불일치**: WorkerMethodParam 타입이 core에서 export되었는지 확인
3. **메서드 누락**: this.core에 없는 메서드 호출 시 오류

---

### Step 12: 통합 테스트 실행

**명령어**:
```bash
cd statistical-platform
npm test -- __tests__/integration/
```

**테스트 커버리지**:
- Worker 1-4 Priority 1: 16 tests
- Worker 3 호환성: 12 tests
- Worker 4 Priority 2: 16 tests
- 기타: 16 tests
- **총**: 60 tests

**예상 결과**: 60/60 passing (100%)

---

## ✅ 검증 체크리스트

### 코드 품질
- [ ] TypeScript 컴파일 에러 0개
- [ ] ESLint 경고 0개
- [ ] 모든 import 경로 정상
- [ ] 타입 안전성 유지 (`any` 없음)

### 기능 검증
- [ ] initialize() 정상 작동
- [ ] Worker 1-4 로딩 성공
- [ ] 56개 통계 메서드 정상 작동
- [ ] 에러 처리 정상

### 테스트 검증
- [ ] 통합 테스트 60/60 통과
- [ ] 기존 API 호환성 유지
- [ ] Breaking Change 없음

---

## 🚨 롤백 계획

### 각 Phase 후 Git Commit

**Phase 1 완료 시**:
```bash
git add statistical-platform/lib/services/pyodide-statistics.ts
git commit -m "refactor(pyodide): Delete private core methods (Phase 1)

- Remove 342 lines of core infrastructure code
- Deleted 12 private methods (parsePythonResult, callWorkerMethod, etc.)
- Prepare for PyodideCoreService delegation"
```

**Phase 2 완료 시**:
```bash
git commit -m "refactor(pyodide): Update public API delegation (Phase 2)

- Replace initialize() with core delegation
- Replace isInitialized() with core delegation"
```

**Phase 3 완료 시**:
```bash
git commit -m "refactor(pyodide): Update 56 statistical methods (Phase 3)

- Change this.callWorkerMethod → this.core.callWorkerMethod
- All statistical methods now delegate to PyodideCoreService"
```

**Phase 4 완료 시**:
```bash
git commit -m "refactor(pyodide): Complete PyodideCore extraction

- File reduced: 2,693 → 2,351 lines (342 lines removed)
- All tests passing: 60/60 (100%)
- TypeScript errors: 0
- Breaking changes: None"
```

---

## 📊 예상 결과

| 지표 | Before | After | 변화 |
|------|--------|-------|------|
| 파일 크기 | 2,693 lines | 2,351 lines | -342 lines (-12.7%) |
| Private 메서드 | 12개 | 0개 | -12 (core로 이동) |
| Public 메서드 | 58개 | 58개 | 0 (delegation만 변경) |
| TypeScript 에러 | 0개 | 0개 | 유지 |
| 테스트 통과율 | 100% | 100% | 유지 |

---

## 🎯 성공 기준

### 필수
1. ✅ TypeScript 컴파일 에러 0개
2. ✅ 통합 테스트 60/60 통과
3. ✅ 파일 크기 약 2,350 lines (±50)
4. ✅ Breaking Change 없음

### 선택
1. ⭐ ESLint 경고 0개
2. ⭐ 코드 가독성 향상 확인
3. ⭐ Git commit 메시지 명확성

---

**문서 상태**: ✅ 완료
**예상 작업 시간**: 2-3시간
**위험도**: 낮음 (명확한 delegation 패턴)
