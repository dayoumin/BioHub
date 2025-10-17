# Option B Refactoring - PyodideCore 추출 가이드

**문서 생성일**: 2025-10-17
**목적**: Day 3-4 작업 가이드 - PyodideCore 서비스 분리
**관련 문서**:
- [option-b-structure-analysis.md](option-b-structure-analysis.md)
- [option-b-call-graph.md](option-b-call-graph.md)

---

## 🎯 목표

**현재**: 단일 파일 pyodide-statistics.ts (2,753 lines)
**목표**: PyodideCore 추출 (~400 lines) + 기존 파일 수정

**추출 대상**:
1. Singleton 패턴 로직
2. 초기화 시스템 (initialize, dispose)
3. Worker 로딩 시스템 (ensureWorkerLoaded)
4. Helper 함수 11개
5. 상수 (WORKER_EXTRA_PACKAGES)

---

## 📋 추출 대상 상세 목록

### 1. Singleton 패턴 (30 lines)

```typescript
// 추출할 코드
class PyodideCoreService {
  private static instance: PyodideCoreService | null = null

  private constructor() {
    // 초기화
  }

  static getInstance(): PyodideCoreService {
    if (!this.instance) {
      this.instance = new PyodideCoreService()
    }
    return this.instance
  }

  static resetInstance(): void {
    this.instance = null
  }
}
```

**위치**: pyodide-statistics.ts 라인 ~40-70
**변경사항**: 클래스명 PyodideStatisticsService → PyodideCoreService

---

### 2. 인스턴스 변수 (10 lines)

```typescript
// 추출할 변수
private pyodide: PyodideInterface | null = null
private isLoading = false
private loadPromise: Promise<void> | null = null
private packagesLoaded = false
private loadedWorkers: Set<number> = new Set()
```

**위치**: pyodide-statistics.ts 라인 ~75-85
**변경사항**: 없음 (그대로 이동)

---

### 3. 상수 정의 (15 lines)

```typescript
// 추출할 상수
const WORKER_EXTRA_PACKAGES: Record<number, string[]> = {
  1: [], // Worker 1: NumPy + SciPy만 (기본)
  2: ['statsmodels', 'pandas'], // Worker 2: 상관/가설검정
  3: ['statsmodels', 'pandas'], // Worker 3: 비모수/ANOVA
  4: ['statsmodels', 'scikit-learn'] // Worker 4: 회귀/머신러닝
}
```

**위치**: pyodide-statistics.ts 라인 ~30
**변경사항**: export const로 변경 (다른 서비스에서 참조 가능)

---

### 4. 초기화 시스템 (100 lines)

#### 4.1 initialize() (50 lines)
```typescript
async initialize(): Promise<void> {
  if (this.pyodide) return
  if (this.isLoading) return this.loadPromise!

  this.isLoading = true
  this.loadPromise = this._loadPyodide()
    .then(async (pyodide) => {
      this.pyodide = pyodide
      await this.pyodide.loadPackage(['numpy', 'scipy'])
      this.packagesLoaded = true
      this.isLoading = false
    })
    .catch((error) => {
      this.isLoading = false
      throw new Error(`Pyodide 초기화 실패: ${error.message}`)
    })

  return this.loadPromise
}
```

**위치**: pyodide-statistics.ts 라인 ~100-150
**변경사항**: 에러 메시지 한글화

#### 4.2 _loadPyodide() (30 lines)
```typescript
private async _loadPyodide(): Promise<PyodideInterface> {
  const { pyodideJS } = getPyodideCDNUrls()

  // CDN 스크립트 로드
  const script = document.createElement('script')
  script.src = pyodideJS

  await new Promise((resolve, reject) => {
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  // Pyodide 인스턴스 생성
  const loadPyodide = (window as any).loadPyodide
  const pyodide = await loadPyodide({
    indexURL: pyodideJS.replace(/pyodide\.js$/, '')
  })

  return pyodide
}
```

**위치**: pyodide-statistics.ts 라인 ~150-180
**변경사항**: 없음

#### 4.3 isInitialized() (5 lines)
```typescript
isInitialized(): boolean {
  return this.pyodide !== null
}
```

**위치**: pyodide-statistics.ts 라인 ~185
**변경사항**: 없음

#### 4.4 dispose() (10 lines)
```typescript
dispose(): void {
  this.pyodide = null
  this.isLoading = false
  this.loadPromise = null
  this.packagesLoaded = false
  this.loadedWorkers.clear()
}
```

**위치**: pyodide-statistics.ts 라인 ~190-200
**변경사항**: 없음

---

### 5. Worker 로딩 시스템 (150 lines)

#### 5.1 ensureWorkerLoaded() (60 lines)
```typescript
private async ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4): Promise<void> {
  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  // 캐시 확인
  const workerName = this.getWorkerFileName(workerNumber)
  const isLoaded = await this.pyodide.runPythonAsync(
    `'${workerName}' in sys.modules`
  )

  if (isLoaded === 'True') {
    return // 이미 로드됨
  }

  // Worker Python 파일 로드
  const response = await fetch(`/workers/python/${workerName}.py`)
  const workerCode = await response.text()

  // Python 코드 실행 (sys.modules에 등록)
  await this.pyodide.runPythonAsync(workerCode)

  // 추가 패키지 로드
  await this.loadAdditionalPackages(workerNumber)

  this.loadedWorkers.add(workerNumber)
}
```

**위치**: pyodide-statistics.ts 라인 ~250-310
**변경사항**: 에러 메시지 한글화

#### 5.2 ensureWorker1Loaded() ~ ensureWorker4Loaded() (40 lines)
```typescript
async ensureWorker1Loaded(): Promise<void> {
  return this.ensureWorkerLoaded(1)
}

async ensureWorker2Loaded(): Promise<void> {
  return this.ensureWorkerLoaded(2)
}

async ensureWorker3Loaded(): Promise<void> {
  return this.ensureWorkerLoaded(3)
}

async ensureWorker4Loaded(): Promise<void> {
  return this.ensureWorkerLoaded(4)
}
```

**위치**: pyodide-statistics.ts 라인 ~315-350
**변경사항**: 없음

#### 5.3 getWorkerFileName() (15 lines)
```typescript
private getWorkerFileName(workerNumber: number): string {
  const fileNames: Record<number, string> = {
    1: 'worker1-descriptive',
    2: 'worker2-hypothesis',
    3: 'worker3-nonparametric-anova',
    4: 'worker4-regression-advanced'
  }
  return fileNames[workerNumber] || 'worker1-descriptive'
}
```

**위치**: pyodide-statistics.ts 라인 ~355-370
**변경사항**: 없음

#### 5.4 loadAdditionalPackages() (30 lines)
```typescript
private async loadAdditionalPackages(workerNumber: number): Promise<void> {
  const packages = WORKER_EXTRA_PACKAGES[workerNumber]

  if (!packages || packages.length === 0) {
    return // Worker 1은 추가 패키지 없음
  }

  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  // 백그라운드 로딩 (Promise는 기다리지 않음)
  this.pyodide.loadPackage(packages).catch((error) => {
    console.error(`Worker ${workerNumber} 패키지 로드 실패:`, error)
  })
}
```

**위치**: pyodide-statistics.ts 라인 ~375-405
**변경사항**: 에러 메시지 한글화

---

### 6. Helper 함수 (100 lines)

#### 6.1 callWorkerMethod<T>() (50 lines)
```typescript
async callWorkerMethod<T>(
  workerNumber: 1 | 2 | 3 | 4,
  methodName: string,
  params: Record<string, unknown>,
  options: { errorMessage?: string } = {}
): Promise<T | { error: string }> {
  // Step 1: 파라미터 검증
  for (const [key, value] of Object.entries(params)) {
    this.validateWorkerParam(value, key)
  }

  // Step 2: Worker 로드 확인
  await this.ensureWorkerLoaded(workerNumber)

  // Step 3: Python 호출 코드 생성
  const paramStrings = Object.entries(params)
    .map(([key, value]) => `${key}=json.loads('${JSON.stringify(value)}')`)
    .join(', ')

  const pythonCode = `
    import json
    result = ${methodName}(${paramStrings})
    json.dumps(result)
  `

  // Step 4: Python 실행
  const result = await this.pyodide!.runPythonAsync(pythonCode)

  // Step 5: 결과 파싱
  return this.parsePythonResult<T>(result)
}
```

**위치**: pyodide-statistics.ts 라인 ~410-460
**변경사항**: 없음 (핵심 로직)

#### 6.2 validateWorkerParam() (25 lines)
```typescript
private validateWorkerParam(param: unknown, paramName?: string): void {
  const prefix = paramName ? `파라미터 '${paramName}'` : '파라미터'

  if (param === undefined) {
    throw new Error(`${prefix}가 undefined입니다`)
  }

  if (typeof param === 'number') {
    if (isNaN(param) || !isFinite(param)) {
      throw new Error(`${prefix}가 유효하지 않은 숫자입니다 (NaN 또는 Infinity)`)
    }
  }

  if (Array.isArray(param)) {
    param.forEach((item, index) => {
      if (typeof item === 'number' && (isNaN(item) || !isFinite(item))) {
        throw new Error(`${prefix}[${index}]가 유효하지 않은 숫자입니다`)
      }
    })
  }
}
```

**위치**: pyodide-statistics.ts 라인 ~465-490
**변경사항**: 에러 메시지 한글화

#### 6.3 parsePythonResult<T>() (15 lines)
```typescript
private parsePythonResult<T>(result: string): T | { error: string } {
  try {
    const parsed = JSON.parse(result)

    if (this.isPythonError(parsed)) {
      return parsed
    }

    return parsed as T
  } catch {
    return result as unknown as T // Fallback
  }
}
```

**위치**: pyodide-statistics.ts 라인 ~495-510
**변경사항**: 없음

#### 6.4 isPythonError() (10 lines)
```typescript
private isPythonError(obj: unknown): obj is { error: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'error' in obj &&
    typeof (obj as { error: unknown }).error === 'string'
  )
}
```

**위치**: pyodide-statistics.ts 라인 ~515-525
**변경사항**: 없음

---

## 🏗️ 새 파일 구조

### pyodide-core.service.ts (400 lines)

```typescript
/**
 * PyodideCore 서비스
 *
 * Pyodide 초기화, Worker 로딩, Helper 함수 제공
 * 모든 Worker 서비스의 기반 클래스
 */

import type { PyodideInterface } from '@/types/pyodide'
import { getPyodideCDNUrls } from '@/lib/constants'

// ========================================
// 상수
// ========================================

export const WORKER_EXTRA_PACKAGES: Record<number, string[]> = {
  1: [],
  2: ['statsmodels', 'pandas'],
  3: ['statsmodels', 'pandas'],
  4: ['statsmodels', 'scikit-learn']
}

// ========================================
// PyodideCore 서비스 클래스
// ========================================

export class PyodideCoreService {
  // Singleton
  private static instance: PyodideCoreService | null = null

  // Instance variables
  private pyodide: PyodideInterface | null = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null
  private packagesLoaded = false
  private loadedWorkers: Set<number> = new Set()

  // Private constructor
  private constructor() {}

  // ========================================
  // Public API
  // ========================================

  static getInstance(): PyodideCoreService {
    if (!this.instance) {
      this.instance = new PyodideCoreService()
    }
    return this.instance
  }

  static resetInstance(): void {
    this.instance = null
  }

  async initialize(): Promise<void> {
    // 초기화 로직 (위 섹션 4.1)
  }

  isInitialized(): boolean {
    return this.pyodide !== null
  }

  dispose(): void {
    // 정리 로직 (위 섹션 4.4)
  }

  // ========================================
  // Worker 관리
  // ========================================

  async ensureWorkerLoaded(workerNumber: 1 | 2 | 3 | 4): Promise<void> {
    // Worker 로딩 (위 섹션 5.1)
  }

  async ensureWorker1Loaded(): Promise<void> {
    return this.ensureWorkerLoaded(1)
  }

  // ... ensureWorker2/3/4Loaded

  // ========================================
  // Helper 함수
  // ========================================

  async callWorkerMethod<T>(...): Promise<T | { error: string }> {
    // Worker 메서드 호출 (위 섹션 6.1)
  }

  private validateWorkerParam(...): void {
    // 파라미터 검증 (위 섹션 6.2)
  }

  private parsePythonResult<T>(...): T | { error: string } {
    // 결과 파싱 (위 섹션 6.3)
  }

  private isPythonError(...): obj is { error: string } {
    // 에러 타입 가드 (위 섹션 6.4)
  }

  // ========================================
  // Private 메서드
  // ========================================

  private async _loadPyodide(): Promise<PyodideInterface> {
    // Pyodide CDN 로드 (위 섹션 4.2)
  }

  private getWorkerFileName(workerNumber: number): string {
    // Worker 파일명 매핑 (위 섹션 5.3)
  }

  private async loadAdditionalPackages(workerNumber: number): Promise<void> {
    // 추가 패키지 로드 (위 섹션 5.4)
  }
}
```

---

## 📝 작업 단계 (Day 3-4)

### Step 1: 새 파일 생성 (1시간)

1. **디렉토리 생성**:
   ```bash
   mkdir -p statistical-platform/lib/services/pyodide/core
   ```

2. **파일 생성**:
   ```bash
   touch statistical-platform/lib/services/pyodide/core/pyodide-core.service.ts
   ```

3. **기본 구조 작성**:
   - Import 문
   - 상수 정의
   - 클래스 스켈레톤
   - Export 문

---

### Step 2: 코드 복사 및 수정 (3시간)

#### 2.1 Singleton 패턴 이동
- pyodide-statistics.ts에서 복사
- 클래스명 변경: PyodideStatisticsService → PyodideCoreService
- `resetInstance()` 메서드 추가 (테스트용)

#### 2.2 인스턴스 변수 이동
- private 변수 5개 복사
- `loadedWorkers` Set 추가 (Worker 로딩 추적)

#### 2.3 초기화 시스템 이동
- `initialize()` 복사
- `_loadPyodide()` 복사
- `isInitialized()` 복사
- `dispose()` 복사
- 에러 메시지 한글화

#### 2.4 Worker 로딩 시스템 이동
- `ensureWorkerLoaded()` 복사
- `ensureWorker1/2/3/4Loaded()` 복사
- `getWorkerFileName()` 복사
- `loadAdditionalPackages()` 복사

#### 2.5 Helper 함수 이동
- `callWorkerMethod<T>()` 복사
- `validateWorkerParam()` 복사
- `parsePythonResult<T>()` 복사
- `isPythonError()` 복사

---

### Step 3: Import 문 정리 (30분)

**pyodide-core.service.ts**:
```typescript
import type { PyodideInterface } from '@/types/pyodide'
import { getPyodideCDNUrls } from '@/lib/constants'
```

**pyodide-statistics.ts** (기존 파일):
```typescript
// 추가할 Import
import { PyodideCoreService } from './pyodide/core/pyodide-core.service'
```

---

### Step 4: 기존 파일 수정 (2시간)

#### 4.1 pyodide-statistics.ts 클래스 수정

**Before**:
```typescript
class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private pyodide: PyodideInterface | null = null
  // ... 초기화/Worker 로딩/Helper 함수 모두 포함

  async linearRegression(...) {
    return this.callWorkerMethod<LinearRegressionResult>(...)
  }
}
```

**After**:
```typescript
class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private core: PyodideCoreService

  private constructor() {
    this.core = PyodideCoreService.getInstance()
  }

  static getInstance(): PyodideStatisticsService {
    if (!this.instance) {
      this.instance = new PyodideStatisticsService()
    }
    return this.instance
  }

  // 초기화 메서드는 Core로 위임
  async initialize(): Promise<void> {
    return this.core.initialize()
  }

  isInitialized(): boolean {
    return this.core.isInitialized()
  }

  dispose(): void {
    this.core.dispose()
  }

  // Worker 메서드는 Core의 callWorkerMethod 사용
  async linearRegression(x: number[], y: number[]): Promise<LinearRegressionResult> {
    return this.core.callWorkerMethod<LinearRegressionResult>(
      4,
      'linear_regression',
      { x, y }
    )
  }

  // ... 98개 메서드 모두 동일 패턴으로 수정
}
```

#### 4.2 삭제할 코드

pyodide-statistics.ts에서 제거:
- ✅ `WORKER_EXTRA_PACKAGES` 상수
- ✅ `private pyodide` 변수
- ✅ `private isLoading` 변수
- ✅ `private loadPromise` 변수
- ✅ `private packagesLoaded` 변수
- ✅ `_loadPyodide()` 메서드
- ✅ `ensureWorkerLoaded()` 메서드
- ✅ `ensureWorker1/2/3/4Loaded()` 메서드
- ✅ `getWorkerFileName()` 메서드
- ✅ `loadAdditionalPackages()` 메서드
- ✅ `callWorkerMethod<T>()` 메서드
- ✅ `validateWorkerParam()` 메서드
- ✅ `parsePythonResult<T>()` 메서드
- ✅ `isPythonError()` 메서드

**예상 삭제 라인 수**: ~350 lines

---

### Step 5: TypeScript 컴파일 체크 (30분)

```bash
cd statistical-platform
npx tsc --noEmit
```

**예상 에러**:
- Import 경로 오류
- 타입 불일치
- Missing exports

**해결 방법**:
1. Import 경로 확인
2. Export 문 추가
3. 타입 정의 확인

---

### Step 6: 테스트 실행 (1시간)

```bash
npm test -- __tests__/integration/
```

**테스트할 항목**:
- ✅ 초기화 성공
- ✅ Worker 1-4 로딩
- ✅ callWorkerMethod 정상 작동
- ✅ 에러 처리

**예상 테스트 결과**: 60/60 통과 (기존과 동일)

---

### Step 7: Git Commit (15분)

```bash
git add .
git commit -m "refactor(pyodide): Extract PyodideCore service (Day 3-4)

- Create pyodide-core.service.ts (400 lines)
- Extract initialization and worker loading logic
- Extract 11 helper functions
- Update pyodide-statistics.ts to use PyodideCoreService
- Reduce pyodide-statistics.ts by 350 lines
- All tests passing (60/60)

Part of Option B refactoring plan (Phase 5-2)"
```

---

## ✅ 검증 체크리스트

### 코드 품질
- [ ] TypeScript 컴파일 에러 0개
- [ ] ESLint 경고 0개
- [ ] 모든 타입 명시 (`any` 없음)
- [ ] JSDoc 주석 완성

### 기능 검증
- [ ] initialize() 정상 작동
- [ ] Worker 1-4 로딩 성공
- [ ] callWorkerMethod 정상 작동
- [ ] 에러 처리 정상
- [ ] Singleton 패턴 유지

### 테스트 검증
- [ ] 기존 테스트 60개 모두 통과
- [ ] 새 테스트 추가 (PyodideCore 단위 테스트)
- [ ] 통합 테스트 통과

### 문서 검증
- [ ] README 업데이트
- [ ] STATUS.md 업데이트
- [ ] dailywork.md 기록

---

## 🎯 성공 기준

### 정량적 지표
| 항목 | Before | After | 목표 |
|------|--------|-------|------|
| pyodide-statistics.ts | 2,753 lines | ~2,400 lines | -350 lines ✅ |
| PyodideCore | 0 lines | 400 lines | +400 lines ✅ |
| TypeScript 에러 | 0 | 0 | 0 ✅ |
| 테스트 통과율 | 100% | 100% | 100% ✅ |

### 정성적 지표
- ✅ 코드 가독성 향상 (Core 로직 분리)
- ✅ 유지보수성 향상 (단일 책임 원칙)
- ✅ 재사용성 향상 (Worker 서비스에서 공통 사용)
- ✅ 테스트 용이성 향상 (Core만 독립 테스트 가능)

---

## 🚨 주의사항

### 1. Breaking Change 방지
- ✅ 외부 API 변경 없음 (pyodide-statistics.ts 인터페이스 유지)
- ✅ 메서드 시그니처 동일
- ✅ 반환 타입 동일

### 2. 성능 영향 최소화
- ✅ Core는 Singleton (인스턴스 1개만)
- ✅ Worker 로딩 캐싱 유지
- ✅ callWorkerMethod 성능 동일

### 3. 타입 안전성 유지
- ✅ Generic 타입 `<T>` 유지
- ✅ 타입 가드 (`isPythonError`) 유지
- ✅ `any` 타입 사용 금지

---

## 📊 예상 작업 시간

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| Step 1 | 새 파일 생성 | 1시간 |
| Step 2 | 코드 복사 및 수정 | 3시간 |
| Step 3 | Import 정리 | 30분 |
| Step 4 | 기존 파일 수정 | 2시간 |
| Step 5 | TypeScript 컴파일 | 30분 |
| Step 6 | 테스트 실행 | 1시간 |
| Step 7 | Git Commit | 15분 |
| **합계** | | **8시간 15분** |

---

## 🔍 위험 요소 및 대응

### 위험 1: Import 순환 참조
**가능성**: 낮음
**영향도**: 높음 (컴파일 실패)
**대응**: PyodideCore는 다른 서비스를 import하지 않음

### 위험 2: Singleton 인스턴스 충돌
**가능성**: 낮음
**영향도**: 중간 (메모리 누수)
**대응**: PyodideStatisticsService와 PyodideCoreService 모두 독립적인 Singleton

### 위험 3: 테스트 실패
**가능성**: 중간
**영향도**: 중간 (디버깅 필요)
**대응**: Step 6에서 충분한 테스트 시간 확보

---

## ✅ Day 3-4 완료 기준

### 필수 조건
- [x] pyodide-core.service.ts 생성 완료
- [x] 400 lines 이상 코드 작성
- [x] pyodide-statistics.ts 350 lines 감소
- [x] TypeScript 컴파일 에러 0개
- [x] 테스트 60/60 통과
- [x] Git commit 완료

### 선택 조건
- [ ] PyodideCore 단위 테스트 추가
- [ ] JSDoc 주석 100% 완성
- [ ] 성능 벤치마크 (초기화 시간 동일 확인)

---

**문서 상태**: ✅ 완료
**예상 작업 시간**: 8시간 15분
**다음 단계**: Day 5-6 Worker 서비스 분리
