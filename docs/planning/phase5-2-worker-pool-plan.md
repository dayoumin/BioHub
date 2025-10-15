# Phase 5-2: Worker Pool 구현 계획

**작성일**: 2025-10-14
**예상 기간**: 2-3일 (17-25시간)
**시작일**: 2025-10-15 (내일)
**우선순위**: P1 (Option A 완료 후 즉시 시작)

---

## 🎯 목표

**초기 로딩 시간 대폭 단축**:
- 현재: 11초 (SciPy, Pandas 전체 로드)
- 목표: 0.8초 (NumPy만 로드)
- 개선율: **92% 단축**

**사용자 경험**:
- 앱 시작 시 빠른 반응
- 필요한 Worker만 Lazy Loading
- UI 블로킹 0초

---

## ✅ 이미 완료된 부분

### Python Worker 파일들 (100% 완성!)
```
✅ public/workers/python/worker1-descriptive.py (269줄)
✅ public/workers/python/worker2-hypothesis.py (418줄)
✅ public/workers/python/worker3-nonparametric-anova.py (742줄)
✅ public/workers/python/worker4-regression-advanced.py (755줄)
총 2,184줄 - 이미 작성 완료!
```

### Lazy Loading 기본 구조 (부분 완성)
```typescript
✅ ensureWorkerLoaded(workerNum) - 이미 구현됨
✅ callWorkerMethod<T>() - Option A에서 구현
✅ Worker 파일 fetch 로직 - 이미 있음
```

---

## 📋 Day 1: Worker Pool 인프라 (4-6시간)

### 작업 1: AdaptiveWorkerPool 클래스 (2-3시간)
**파일**: `lib/statistics/workers/adaptive-worker-pool.ts`

**구조**:
```typescript
export class AdaptiveWorkerPool {
  // 코어 Worker (항상 로드)
  private coreWorkers: Map<1 | 2, Worker> = new Map()

  // 확장 Worker (필요시 로드)
  private extendedWorkers: Map<3 | 4, Worker> = new Map()

  // 타이머 (20분 미사용 시 정리)
  private workerTimers: Map<3 | 4, NodeJS.Timeout> = new Map()

  constructor() {
    // Worker 1, 2는 즉시 생성
    this.initializeCoreWorkers()
  }

  async getWorker(workerNum: 1 | 2 | 3 | 4): Promise<Worker> {
    // Worker 1-2: 즉시 반환
    // Worker 3-4: Lazy Load + 타이머 시작
  }

  private scheduleWorkerCleanup(workerNum: 3 | 4): void {
    // 20분 후 자동 정리
  }
}
```

**예상 코드**: 250줄

---

### 작업 2: Statistical Worker 스크립트 (1-2시간)
**파일**: `lib/statistics/workers/statistical-worker.ts`

**구조**:
```typescript
// Web Worker 스크립트
self.onmessage = async (event) => {
  const { method, params, workerId } = event.data

  // Pyodide 초기화
  if (!self.pyodide) {
    await initializePyodide(workerId)
  }

  // Python 함수 실행
  const result = await executePythonMethod(method, params)

  self.postMessage({ result })
}

async function initializePyodide(workerId: number) {
  // Worker별 패키지 로드
  switch (workerId) {
    case 1: await loadPackages(['numpy']); break
    case 2: await loadPackages(['numpy', 'scipy']); break
    case 3: await loadPackages(['scipy', 'statsmodels']); break
    case 4: await loadPackages(['scipy', 'statsmodels', 'sklearn']); break
  }
}
```

**예상 코드**: 150줄

---

### 작업 3: Worker 타입 정의 (1시간)
**파일**: `lib/statistics/workers/worker-types.ts`

**구조**:
```typescript
export interface WorkerMessage {
  method: string
  params: Record<string, WorkerMethodParam>
  workerId: 1 | 2 | 3 | 4
}

export interface WorkerResponse {
  success: boolean
  result?: unknown
  error?: string
}

export type WorkerMethodParam =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | number[][]
  | null
```

**예상 코드**: 80줄

---

## 📋 Day 2: 패키지 로더 및 통합 (2-3시간)

### 작업 1: Package Loader (1시간)
**파일**: `lib/statistics/workers/package-loader.ts`

**Worker별 패키지 매핑**:
```typescript
export const WORKER_PACKAGES = {
  1: ['numpy'],                              // 80MB, 0.8초
  2: ['numpy', 'scipy'],                     // 90MB, 1.2초
  3: ['scipy', 'statsmodels'],               // 140MB, 2.3초
  4: ['scipy', 'statsmodels', 'sklearn']     // 200MB, 3.8초
} as const

export async function loadWorkerPackages(
  pyodide: PyodideInterface,
  workerNum: 1 | 2 | 3 | 4
): Promise<void> {
  const packages = WORKER_PACKAGES[workerNum]
  console.log(`[Worker ${workerNum}] Loading packages:`, packages)

  await pyodide.loadPackage(packages)

  console.log(`[Worker ${workerNum}] Packages loaded`)
}
```

**예상 코드**: 100줄

---

### 작업 2: PyodideStatisticsService 수정 (1-2시간)
**파일**: `lib/services/pyodide-statistics.ts` (기존 파일 수정)

**변경 사항**:
```typescript
// 기존 (느림)
async initialize(): Promise<void> {
  await this.pyodide.loadPackage(['numpy', 'scipy', 'pandas'])
  //                                       ^^^^^^  ^^^^^^
  //                                       11초 소요!
}

// 새로운 방식 (빠름)
async initialize(): Promise<void> {
  // NumPy만 로드 (0.8초)
  await this.pyodide.loadPackage(['numpy'])
}

// Worker별 패키지는 ensureWorkerLoaded에서 로드
private async ensureWorkerLoaded(workerNum: 1 | 2 | 3 | 4): Promise<void> {
  if (this.loadedWorkers.has(workerNum)) {
    return
  }

  // 1. Worker 파일 fetch
  const response = await fetch(`/workers/python/worker${workerNum}-*.py`)
  const code = await response.text()
  await this.pyodide.runPythonAsync(code)

  // 2. Worker별 패키지 로드
  await loadWorkerPackages(this.pyodide, workerNum)

  this.loadedWorkers.add(workerNum)
}
```

**예상 수정**: 200줄

---

## 📋 Day 3: 최적화 및 테스트 (2-3시간)

### 작업 1: Pyodide 캐싱 (30분)
**파일**: `lib/statistics/workers/pyodide-cache.ts`

```typescript
export class PyodideCache {
  private static instance: PyodideInterface | null = null

  static async getInstance(): Promise<PyodideInterface> {
    if (!this.instance) {
      this.instance = await loadPyodide({ indexURL: CDN_URL })
    }
    return this.instance
  }
}
```

**예상 코드**: 100줄

---

### 작업 2: 메모리 관리 (30분)
**파일**: `lib/statistics/workers/memory-manager.ts`

```typescript
export class WorkerMemoryManager {
  private memoryUsage: Map<number, number> = new Map()

  trackWorker(workerNum: number, memoryMB: number): void {
    this.memoryUsage.set(workerNum, memoryMB)
    console.log(`[Worker ${workerNum}] Memory: ${memoryMB}MB`)
  }

  getTotalMemory(): number {
    return Array.from(this.memoryUsage.values()).reduce((a, b) => a + b, 0)
  }
}
```

**예상 코드**: 120줄

---

### 작업 3: 진행률 UI (30분)
**파일**: `lib/statistics/workers/progress-tracker.ts`

```typescript
export class ProgressTracker {
  updateProgress(message: string, percent: number): void {
    // UI 업데이트
    console.log(`${message}: ${percent}%`)
  }
}
```

**예상 코드**: 80줄

---

### 작업 4: 통합 테스트 (1시간)
**파일**: `__tests__/statistics/worker-pool.test.ts`

```typescript
describe('Worker Pool Integration', () => {
  it('코어 Worker 즉시 로드', async () => {
    const pool = new AdaptiveWorkerPool()
    const worker1 = await pool.getWorker(1)
    expect(worker1).toBeDefined()
  })

  it('확장 Worker Lazy Load', async () => {
    const pool = new AdaptiveWorkerPool()
    const worker3 = await pool.getWorker(3)
    expect(worker3).toBeDefined()
  })

  it('20분 후 Worker 정리', async () => {
    // 타이머 테스트
  })
})
```

**예상 코드**: 200줄

---

## 📊 작업량 요약

| Day | 작업 | 예상 시간 | 파일 | 코드량 |
|-----|------|----------|------|--------|
| **Day 1** | Worker Pool 인프라 | 4-6시간 | 3개 | 480줄 |
| **Day 2** | 패키지 로더 & 통합 | 2-3시간 | 2개 | 300줄 |
| **Day 3** | 최적화 & 테스트 | 2-3시간 | 4개 | 500줄 |
| **총계** | | **8-12시간** | **9개** | **1,280줄** |

**실제 작업 기간**: 1.5-2일 (하루 6시간 작업 기준)

---

## ✅ 시작 전 체크리스트

### 전제 조건
- [x] Option A 완료
- [x] PR #1 병합 (내일 첫 작업)
- [x] 빌드 성공 확인
- [x] 테스트 통과 확인

### 준비물
- [x] Python Worker 파일들 (이미 존재)
- [x] callWorkerMethod 헬퍼 (이미 구현)
- [x] ensureWorkerLoaded 기본 구조 (이미 있음)

---

## 🎯 성공 지표

### 성능 목표
| 지표 | 현재 | 목표 | 개선율 |
|------|------|------|--------|
| **초기 로딩** | 11초 | 0.8초 | **92%** ↓ |
| **첫 계산 (코어)** | 11.8초 | 3초 | **74%** ↓ |
| **첫 계산 (확장)** | 11.8초 | 6초 | **49%** ↓ |
| **캐싱 계산** | 0.27초 | <0.1초 | **63%** ↓ |

### 메모리 목표
| Worker | 패키지 | 예상 메모리 |
|--------|--------|------------|
| Worker 1 | NumPy | 80MB |
| Worker 2 | NumPy + SciPy | 90MB |
| Worker 3 | SciPy + Statsmodels | 140MB |
| Worker 4 | Full Stack | 200MB |

---

## 📝 구현 순서 (내일 시작)

### ⏰ Day 1 Morning (4시간)
1. **PR #1 병합** (10분)
2. **브랜치 생성**: `feature/worker-pool-lazy-loading` (1분)
3. **AdaptiveWorkerPool 구현** (2시간)
4. **StatisticalWorker 스크립트** (1.5시간)
5. **TypeScript 컴파일 체크** (10분)

### ☕ Day 1 Afternoon (2시간)
1. **Worker 타입 정의** (1시간)
2. **기본 테스트 작성** (1시간)

### ⏰ Day 2 Morning (3시간)
1. **Package Loader 구현** (1시간)
2. **PyodideStatisticsService 수정** (2시간)

### ☕ Day 2 Afternoon (2시간)
1. **통합 테스트** (1시간)
2. **성능 벤치마크** (1시간)

### ⏰ Day 3 (3시간)
1. **최적화 코드** (1.5시간)
2. **문서 작성** (1시간)
3. **PR 생성** (30분)

---

## 🚀 Quick Start (내일 첫 명령어)

```bash
# 1. PR 병합 확인
cd d:\Projects\Statics
git checkout master
git pull origin master

# 2. 새 브랜치 생성
git checkout -b feature/worker-pool-lazy-loading

# 3. 첫 파일 생성
mkdir -p statistical-platform/lib/statistics/workers
touch statistical-platform/lib/statistics/workers/adaptive-worker-pool.ts

# 4. 작업 시작!
code statistical-platform/lib/statistics/workers/adaptive-worker-pool.ts
```

---

## 📌 주의사항

1. **브라우저 호환성**
   - Web Worker API 지원 확인
   - Chrome, Firefox, Safari, Edge 모두 지원

2. **에러 처리**
   - Worker 통신 실패 시 fallback
   - 타임아웃 처리 (30초)

3. **메모리 관리**
   - 확장 Worker 20분 후 정리
   - 메모리 누수 모니터링

4. **테스트**
   - 각 Worker 독립 테스트
   - 통합 시나리오 테스트
   - 성능 벤치마크

---

## 📚 참고 문서

- [phase5-implementation-plan.md](./phase5-implementation-plan.md) - 전체 계획
- [phase5-architecture.md](../phase5-architecture.md) - 아키텍처
- [pyodide-refactoring-plan.md](./pyodide-refactoring-plan.md) - Option A/B

---

**작성자**: Claude Code
**다음 업데이트**: 2025-10-15 (내일 시작 후)