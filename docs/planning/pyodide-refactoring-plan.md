# pyodide-statistics.ts 리팩토링 종합 계획

**작성일**: 2025-10-14
**상태**: 계획 단계
**우선순위**: P0 (Option A 즉시 시작) / P1 (Option B Phase 9)

---

## 📊 목차

1. [현황 분석](#1-현황-분석)
2. [Option A: 단기 계획 (중복 코드 제거)](#2-option-a-단기-계획)
3. [Option B: 장기 계획 (Worker별 분리)](#3-option-b-장기-계획)
4. [로드맵 및 실행 계획](#4-로드맵-및-실행-계획)

---

## 1. 현황 분석

### 1.1. 파일 정보
- **파일**: `statistical-platform/lib/services/pyodide-statistics.ts`
- **크기**: 2,641줄
- **메서드**: 84개
- **Worker**: 4개 (descriptive, hypothesis, nonparametric-anova, regression-advanced)

### 1.2. 메서드 패턴 분류

#### 패턴 A: 단순 Worker 호출 (70개, 83%)
**특징**:
- `await this.initialize()` + `await this.ensureWorkerNLoaded()`
- `runPythonAsync()` 호출
- JSON 직렬화/역직렬화
- 에러 처리 (`parsed.error` 체크)

**코드 구조**:
```typescript
async descriptiveStats(data: number[]) {
  await this.initialize()
  await this.ensureWorker1Loaded()

  const resultStr = await this.pyodide!.runPythonAsync(`
    import json
    from worker1_module import descriptive_stats
    data = ${JSON.stringify(data)}

    try:
      result = descriptive_stats(data)
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  const parsed = this.parsePythonResult<any>(resultStr)
  if (parsed.error) throw new Error(`실행 실패: ${parsed.error}`)
  return parsed
}
```

**헬퍼 적용 가능**: ✅ 100%

---

#### 패턴 B: 다중 Worker 호출 (5개, 6%)
**특징**: 여러 Worker 메서드를 순차 호출 후 결과 병합

**예시**:
```typescript
async correlation(x: number[], y: number[]) {
  const pearsonResult = await this.correlationTest(x, y, 'pearson')
  const spearmanResult = await this.correlationTest(x, y, 'spearman')
  const kendallResult = await this.correlationTest(x, y, 'kendall')

  return {
    pearson: { r: pearsonResult.correlation, pValue: pearsonResult.pValue },
    spearman: { r: spearmanResult.correlation, pValue: spearmanResult.pValue },
    kendall: { r: kendallResult.correlation, pValue: kendallResult.pValue }
  }
}
```

**헬퍼 적용 가능**: ❌ 불가 (커스텀 로직 유지)

---

#### 패턴 C: 래퍼/별칭 메서드 (9개, 11%)
**특징**: 레거시 API 호환성

**예시**:
```typescript
async calculateDescriptiveStats(data: number[]) {
  return this.descriptiveStats(data)
}
```

**헬퍼 적용 가능**: ✅ 유지 (리팩토링 불필요)

---

### 1.3. 중복 코드 분석

**중복 패턴** (패턴 A 메서드 70개):
```typescript
// 초기화 (3줄)
await this.initialize()
await this.ensureWorkerNLoaded()

// Python 실행 (12-15줄)
const resultStr = await this.pyodide!.runPythonAsync(`...`)

// 파싱 및 에러 처리 (5줄)
const parsed = this.parsePythonResult<any>(resultStr)
if (parsed.error) throw new Error(...)
return parsed
```

**총 중복**: 70개 메서드 × 20줄 = **1,400줄**

---

### 1.4. 직렬화 안전성

**현재 사용 중인 타입**:
- ✅ `number[]` - 안전
- ✅ `number` - 안전
- ✅ `string` / `boolean` - 안전
- ✅ `number[][]` (2D 배열) - 안전
- ✅ `(string | number)[]` - 안전

**특수 케이스**:
- ⚠️ **사용 안 함**: NaN, Infinity, Date, TypedArray
- ✅ **DataFrame 미사용**: 모두 JSON으로 처리

**결론**: ✅ **100% 안전** (JSON.stringify로 충분)

---

## 2. Option A: 단기 계획

### 2.1. 목표
- 중복 코드 1,400줄 제거
- 2,641줄 → 1,500줄 (43% 감소)
- 기간: 3-4일

### 2.2. 핵심 설계: callWorkerMethod 헬퍼

#### 타입 정의

```typescript
/**
 * Worker 메서드 호출 파라미터 타입
 */
type WorkerMethodParam =
  | number
  | string
  | boolean
  | number[]
  | string[]
  | number[][]
  | (number | string)[]
  | null

/**
 * Worker 메서드 호출 옵션
 */
interface WorkerMethodOptions {
  errorMessage?: string
  skipValidation?: boolean
}
```

#### 헬퍼 함수

```typescript
/**
 * Worker 메서드 공통 호출 헬퍼
 */
private async callWorkerMethod<T>(
  workerNum: 1 | 2 | 3 | 4,
  methodName: string,
  params: Record<string, WorkerMethodParam>,
  options: WorkerMethodOptions = {}
): Promise<T> {
  // 1. 초기화
  await this.initialize()
  await this.ensureWorkerLoaded(workerNum)

  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  // 2. 파라미터 검증 및 직렬화
  const skipValidation = options.skipValidation ?? false
  const paramsLines: string[] = []
  const paramNames: string[] = []

  for (const [key, value] of Object.entries(params)) {
    if (!skipValidation) {
      this.validateWorkerParam(key, value)
    }
    paramsLines.push(`${key} = ${JSON.stringify(value)}`)
    paramNames.push(key)
  }

  const paramsCode = paramsLines.join('\n')
  const paramNamesStr = paramNames.join(', ')

  // 3. Python 코드 실행
  const resultStr = await this.pyodide.runPythonAsync(`
    import json
    from worker${workerNum}_module import ${methodName}

    ${paramsCode}

    try:
      result = ${methodName}(${paramNamesStr})
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  // 4. 결과 파싱 및 에러 처리
  const parsed = this.parsePythonResult<T>(resultStr)

  if ((parsed as any).error) {
    const errorMsg = options.errorMessage || `${methodName} 실행 실패`
    throw new Error(`${errorMsg}: ${(parsed as any).error}`)
  }

  return parsed
}
```

#### 파라미터 검증 함수

```typescript
private validateWorkerParam(key: string, value: WorkerMethodParam): void {
  if (value === null) return
  if (value === undefined) {
    throw new Error(`파라미터 '${key}'가 undefined입니다`)
  }

  // 숫자 검증
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`파라미터 '${key}'가 유효하지 않은 숫자입니다: ${value}`)
    }
    return
  }

  // 문자열/불린 통과
  if (typeof value === 'string' || typeof value === 'boolean') return

  // 배열 검증
  if (Array.isArray(value)) {
    if (value.length === 0) return

    // 1차원 배열
    if (!Array.isArray(value[0])) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i]
        if (typeof item === 'number' && !Number.isFinite(item)) {
          throw new Error(`파라미터 '${key}[${i}]'가 유효하지 않습니다: ${item}`)
        }
      }
      return
    }

    // 2차원 배열
    for (let i = 0; i < value.length; i++) {
      const row = value[i]
      if (!Array.isArray(row)) {
        throw new Error(`파라미터 '${key}[${i}]'가 배열이 아닙니다`)
      }
      for (let j = 0; j < row.length; j++) {
        const item = row[j]
        if (typeof item !== 'number' || !Number.isFinite(item)) {
          throw new Error(`파라미터 '${key}[${i}][${j}]'가 유효하지 않습니다`)
        }
      }
    }
    return
  }

  throw new Error(`파라미터 '${key}'가 지원하지 않는 타입입니다`)
}
```

---

### 2.3. 메서드 리팩토링 예시

#### Before (20줄)
```typescript
async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
  await this.initialize()
  await this.ensureWorker1Loaded()

  const resultStr = await this.pyodide!.runPythonAsync(`
    import json
    from worker1_module import descriptive_stats
    data = ${JSON.stringify(data)}

    try:
      result = descriptive_stats(data)
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  const parsed = this.parsePythonResult<any>(resultStr)
  if (parsed.error) {
    throw new Error(`Descriptive stats 실행 실패: ${parsed.error}`)
  }
  return parsed
}
```

#### After (5줄)
```typescript
async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
  return this.callWorkerMethod(
    1,
    'descriptive_stats',
    { data },
    { errorMessage: 'Descriptive stats 실행 실패' }
  )
}
```

**줄 수 감소**: 20줄 → 5줄 (75% 감소)

---

### 2.4. 구현 일정

#### Day 1 (4시간)
- [ ] `callWorkerMethod<T>()` 헬퍼 구현
- [ ] `validateWorkerParam()` 검증 함수 구현
- [ ] 타입 정의 추가
- [ ] 단위 테스트 작성 (Mock Pyodide)
- [ ] Worker 1 메서드 2-3개 리팩토링 (검증)
- [ ] 통합 테스트 실행

#### Day 2 (4시간)
- [ ] Worker 1 나머지 메서드 (7개)
- [ ] Worker 2 메서드 (20개)
- [ ] 테스트 실행

#### Day 3 (4시간)
- [ ] Worker 3 메서드 (30개)
- [ ] Worker 4 메서드 (10개)
- [ ] 전체 테스트 실행

#### Day 4 (2시간)
- [ ] 코드 정리 (주석, 미사용 코드)
- [ ] 문서 업데이트
- [ ] Git 커밋 및 PR

---

### 2.5. 예상 효과

| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| **총 줄 수** | 2,641줄 | 1,500줄 | **43% ↓** |
| **중복 코드** | 1,400줄 | 0줄 | **100% ↓** |
| **메서드당 평균** | 31줄 | 18줄 | **42% ↓** |
| **버그 수정** | 70개 파일 수정 | 1개 함수 수정 | **70배 ↑** |
| **유지보수성** | 3/5 | 5/5 | **67% ↑** |

---

## 3. Option B: 장기 계획 (워커별 서비스 분리)

### 3.1. 목표
- Worker별 서비스 분리 (Worker 1-4 독립 클래스)
- Facade 패턴으로 기존 API 유지 (외부 호출 무변경)
- 병렬 개발 가능 (팀 협업 시 파일 충돌 최소화)
- 테스트 독립성 향상 (Worker별 단위 테스트)
- 기간: 6-8일 (Phase 9)
- 전제조건: ✅ Option A 완료 필수

### 3.2. 아키텍처 설계

#### 파일 구조

```
statistical-platform/lib/services/
├── pyodide/
│   ├── pyodide-manager.ts                    (250줄)
│   ├── workers/
│   │   ├── worker1-descriptive.service.ts    (400줄)
│   │   ├── worker2-hypothesis.service.ts     (500줄)
│   │   ├── worker3-nonparametric.service.ts  (700줄)
│   │   └── worker4-regression.service.ts     (300줄)
│   └── types.ts                              (100줄)
└── pyodide-statistics.ts                     (350줄 - Facade)
```

---

#### PyodideManager (중앙 관리자)

```typescript
export class PyodideManager {
  private static instance: PyodideManager | null = null
  private pyodide: PyodideInterface | null = null
  private loadedWorkers = new Set<number>()

  private constructor() {}

  static getInstance(): PyodideManager {
    if (!PyodideManager.instance) {
      PyodideManager.instance = new PyodideManager()
    }
    return PyodideManager.instance
  }

  async initialize(): Promise<PyodideInterface> {
    if (this.pyodide) return this.pyodide
    // ... 초기화 로직
    return this.pyodide!
  }

  async ensureWorkerLoaded(workerNum: 1 | 2 | 3 | 4): Promise<void> {
    if (this.loadedWorkers.has(workerNum)) return
    // ... Worker 로딩 로직
    this.loadedWorkers.add(workerNum)
  }

  /**
   * Option A의 callWorkerMethod 이동
   */
  async callWorkerMethod<T>(
    workerNum: 1 | 2 | 3 | 4,
    methodName: string,
    params: Record<string, any>,
    options: { errorMessage?: string } = {}
  ): Promise<T> {
    // ... Option A와 동일
  }
}
```

---

#### Worker Service 예시

```typescript
// worker1-descriptive.service.ts
export class Worker1DescriptiveService {
  private manager: PyodideManager

  constructor(manager: PyodideManager) {
    this.manager = manager
  }

  async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
    return this.manager.callWorkerMethod<DescriptiveStatsResult>(
      1,
      'descriptive_stats',
      { data },
      { errorMessage: 'Descriptive stats 실행 실패' }
    )
  }

  async normalityTest(data: number[], alpha: number = 0.05): Promise<NormalityTestResult> {
    return this.manager.callWorkerMethod<NormalityTestResult>(
      1,
      'normality_test',
      { data, alpha },
      { errorMessage: 'Normality test 실행 실패' }
    )
  }

  // ... 총 10개 메서드
}
```

---

#### Facade (기존 API 유지)

```typescript
// pyodide-statistics.ts
export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private manager: PyodideManager
  private worker1: Worker1DescriptiveService
  private worker2: Worker2HypothesisService
  private worker3: Worker3NonparametricService
  private worker4: Worker4RegressionService

  private constructor() {
    this.manager = PyodideManager.getInstance()
    this.worker1 = new Worker1DescriptiveService(this.manager)
    this.worker2 = new Worker2HypothesisService(this.manager)
    this.worker3 = new Worker3NonparametricService(this.manager)
    this.worker4 = new Worker4RegressionService(this.manager)
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  // ========== Worker 1: 기술통계 ==========
  async descriptiveStats(data: number[]) {
    return this.worker1.descriptiveStats(data)
  }

  async normalityTest(data: number[], alpha?: number) {
    return this.worker1.normalityTest(data, alpha)
  }

  // ========== Worker 2: 가설검정 ==========
  async tTestOneSample(data: number[], popmean?: number) {
    return this.worker2.tTestOneSample(data, popmean)
  }

  // ========== 복잡한 메서드 (Facade에서 직접 구현) ==========
  async checkAllAssumptions(data: any) {
    // 여러 Worker 조합
    const results: any = {}
    if (data.values) {
      results.normality = await this.worker1.normalityTest(data.values)
    }
    if (data.groups) {
      results.homogeneity = await this.worker2.leveneTest(data.groups)
    }
    return results
  }

  // ========== 레거시 API 별칭 ==========
  async calculateDescriptiveStats(data: number[]) {
    return this.descriptiveStats(data)
  }
}
```

---

### 3.3. 상세 구현 계획 (사용자 제안 반영)

#### Phase 1: 현재 구조 파악 및 문서화 (Day 1-2, 8시간)

**목표**:
- pyodide-statistics.ts의 모든 메서드/유틸/초기화 흐름 완전 분석
- 함수별 호출 그래프 작성
- 의존 관계 매핑 (예: 두 메서드가 서로 재사용하는 유틸)

**작업 내용**:
1. **Worker별 메서드 분류** (2시간)
   - Worker 1: 10개 메서드 → 의존성 분석
   - Worker 2: 20개 메서드 → 의존성 분석
   - Worker 3: 30개 메서드 → 의존성 분석
   - Worker 4: 10개 메서드 → 의존성 분석
   - 공통 헬퍼 식별: `callWorkerMethod`, `parsePythonResult`, `validateWorkerParam` 등

2. **초기화 흐름 분석** (2시간)
   - `initialize()` → Pyodide CDN 로드 → 패키지 로드
   - `ensureWorkerLoaded(workerNum)` → Worker 파일 fetch → 모듈 등록
   - 싱글톤 패턴 분석 (`getInstance()`)
   - 상태 관리: `pyodide`, `loadedWorkers`, `packagesLoaded`

3. **UI 레이어 반환 타입 정리** (2시간)
   - Groups가 기대하는 모든 반환 타입 수집
   - 타입 호환성 확인 (Worker 서비스 분리 후에도 유지)
   - 특수 케이스: `checkAllAssumptions()`, `performBonferroni()` 등 복잡한 메서드

4. **호출 그래프 문서화** (2시간)
   - Mermaid 다이어그램 작성
   - 순환 의존성 체크
   - 공통 유틸 재사용 패턴 분석

**산출물**:
- `docs/planning/option-b-structure-analysis.md` (구조 분석 보고서)
- `docs/planning/option-b-call-graph.md` (호출 그래프 다이어그램)
- `docs/planning/option-b-type-compatibility.md` (타입 호환성 체크리스트)

---

#### Phase 2: 사전 준비 - 공통 모듈 추출 (Day 3-4, 8시간)

**목표**:
- 공통 헬퍼/초기화 로직을 `services/pyodide/core` 모듈로 이동
- 향후 Worker 서비스에서 재사용 가능하도록 인터페이스 정의
- 싱글톤/상태 관리 안전성 검증

**작업 내용**:

1. **PyodideCore 모듈 생성** (3시간)
   ```typescript
   // services/pyodide/core/pyodide-core.ts
   export class PyodideCore {
     private static instance: PyodideCore | null = null
     private pyodide: PyodideInterface | null = null
     private loadedWorkers = new Set<number>()

     // 초기화
     async initialize(): Promise<PyodideInterface>

     // Worker 로딩
     async ensureWorkerLoaded(workerNum: 1 | 2 | 3 | 4): Promise<void>

     // Python 실행 (Option A의 callWorkerMethod 이동)
     async callWorkerMethod<T>(...): Promise<T>

     // 상태 관리
     isInitialized(): boolean
     dispose(): void
   }
   ```

2. **공통 유틸리티 모듈 생성** (2시간)
   ```typescript
   // services/pyodide/core/utils.ts
   export function parsePythonResult<T>(payload: any): T
   export function validateWorkerParam(key: string, value: WorkerMethodParam): void
   export function isPythonError(obj: unknown): obj is PythonErrorResponse
   ```

3. **타입 정의 모듈 생성** (1시간)
   ```typescript
   // services/pyodide/core/types.ts
   export type WorkerMethodParam = number | string | boolean | number[] | ...
   export interface WorkerMethodOptions { ... }
   export interface PythonErrorResponse { ... }
   ```

4. **기존 코드에서 공통 모듈 사용** (2시간)
   - pyodide-statistics.ts에서 PyodideCore import
   - 기존 메서드들이 PyodideCore 사용하도록 수정
   - 테스트 실행 → 회귀 확인

**검증 포인트**:
- ✅ PyodideCore 싱글톤 동작 확인
- ✅ 여러 Worker 서비스가 동일한 Pyodide 인스턴스 공유
- ✅ 상태 공유 문제 없음 (Worker 로드 상태, 패키지 로드 상태)

**산출물**:
- `services/pyodide/core/pyodide-core.ts` (250줄)
- `services/pyodide/core/utils.ts` (100줄)
- `services/pyodide/core/types.ts` (50줄)

---

#### Phase 3: 워커별 서비스 클래스 분할 (Day 5-6, 10시간)

**목표**: Worker 1-4용 독립 서비스 클래스 생성

**순서**: Worker 4 → Worker 3 → Worker 2 → Worker 1 (의존도 높은 것부터)

**작업 내용**:

1. **Worker 4 서비스 생성** (2시간)
   ```typescript
   // services/pyodide/workers/worker4-regression.service.ts
   export class Worker4RegressionService {
     private core: PyodideCore

     constructor(core: PyodideCore) {
       this.core = core
     }

     // 10개 메서드 이동
     async linearRegression(x: number[], y: number[]): Promise<RegressionResult>
     async multipleRegression(X: number[][], y: number[]): Promise<any>
     async logisticRegression(X: number[][], y: number[]): Promise<any>
     async pcaAnalysis(dataMatrix: number[][], nComponents: number): Promise<any>
     async factorAnalysis(dataMatrix: number[][], options: any): Promise<any>
     async clusterAnalysis(dataMatrix: number[][], options: any): Promise<any>
     async timeSeriesAnalysis(data: number[], options: any): Promise<any>
     async durbinWatsonTest(residuals: number[]): Promise<any>
     // ... (총 10개)
   }
   ```
   - 리턴 타입 유지 (UI 레이어 호환성)
   - 후처리 로직도 함께 이동 (예: 예측값 계산, 포맷팅)
   - 타입 체크: `npx tsc --noEmit`

2. **Worker 3 서비스 생성** (3시간)
   ```typescript
   // services/pyodide/workers/worker3-nonparametric.service.ts
   export class Worker3NonparametricService {
     private core: PyodideCore

     // 30개 메서드 이동 (비모수 + ANOVA)
     async mannWhitneyTest(group1: number[], group2: number[]): Promise<any>
     async wilcoxonTest(values1: number[], values2: number[]): Promise<any>
     async kruskalWallisTest(groups: number[][]): Promise<any>
     async friedmanTest(groups: number[][]): Promise<any>
     async oneWayAnova(groups: number[][]): Promise<any>
     async twoWayAnova(dataValues: number[], factor1: any[], factor2: any[]): Promise<any>
     async tukeyHSD(groups: number[][]): Promise<any>
     async dunnTest(groups: number[][], groupNames: string[], pAdjust: string): Promise<any>
     async gamesHowellTest(groups: number[][], groupNames: string[]): Promise<any>
     // ... (총 30개)
   }
   ```
   - 특수 후처리: Dunn/Games-Howell의 `groupName` 매핑 로직 포함
   - 타입 체크

3. **Worker 2 서비스 생성** (3시간)
   ```typescript
   // services/pyodide/workers/worker2-hypothesis.service.ts
   export class Worker2HypothesisService {
     private core: PyodideCore

     // 20개 메서드 이동 (가설검정)
     async tTestOneSample(data: number[], popmean: number): Promise<any>
     async tTestTwoSample(group1: number[], group2: number[], equalVar: boolean): Promise<any>
     async tTestPaired(values1: number[], values2: number[]): Promise<any>
     async correlationTest(x: number[], y: number[], method: string): Promise<any>
     async partialCorrelation(dataMatrix: number[][], xIdx: number, yIdx: number, controlIndices: number[]): Promise<any>
     async chiSquareTest(observedMatrix: number[][], yatesCorrection: boolean): Promise<any>
     async leveneTest(groups: number[][]): Promise<any>
     async bartlettTest(groups: number[][]): Promise<any>
     // ... (총 20개)
   }
   ```
   - 타입 체크

4. **Worker 1 서비스 생성** (2시간)
   ```typescript
   // services/pyodide/workers/worker1-descriptive.service.ts
   export class Worker1DescriptiveService {
     private core: PyodideCore

     // 10개 메서드 이동 (기술통계)
     async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult>
     async normalityTest(data: number[], alpha: number): Promise<NormalityTestResult>
     async outlierDetection(data: number[], method: string): Promise<OutlierResult>
     async frequencyAnalysis(values: (string | number)[]): Promise<any>
     async crosstabAnalysis(rowValues: any[], colValues: any[]): Promise<any>
     async oneSampleProportionTest(...): Promise<any>
     async cronbachAlpha(itemsMatrix: number[][]): Promise<any>
     async kolmogorovSmirnovTest(data: number[]): Promise<any>
     // ... (총 10개)
   }
   ```
   - 타입 체크

**검증 포인트** (각 Worker 완료 후):
- ✅ `npx tsc --noEmit` → 에러 0개
- ✅ Worker 서비스 단위 테스트 작성 (Mock PyodideCore)
- ✅ 기존 메서드와 동일한 반환 타입 확인

**산출물**:
- `services/pyodide/workers/worker1-descriptive.service.ts` (400줄)
- `services/pyodide/workers/worker2-hypothesis.service.ts` (500줄)
- `services/pyodide/workers/worker3-nonparametric.service.ts` (700줄)
- `services/pyodide/workers/worker4-regression.service.ts` (300줄)

---

#### Phase 4: 상위 파사드 구축 (Day 7, 4시간)

**목표**: 기존 pyodide-statistics.ts를 Facade 계층으로 축소

**작업 내용**:

1. **Facade 클래스 재구성** (2시간)
   ```typescript
   // services/pyodide-statistics.ts (350줄)
   export class PyodideStatisticsService {
     private static instance: PyodideStatisticsService | null = null
     private core: PyodideCore
     private worker1: Worker1DescriptiveService
     private worker2: Worker2HypothesisService
     private worker3: Worker3NonparametricService
     private worker4: Worker4RegressionService

     private constructor() {
       this.core = PyodideCore.getInstance()
       this.worker1 = new Worker1DescriptiveService(this.core)
       this.worker2 = new Worker2HypothesisService(this.core)
       this.worker3 = new Worker3NonparametricService(this.core)
       this.worker4 = new Worker4RegressionService(this.core)
     }

     // ========== Worker 위임 (70개 메서드) ==========
     async descriptiveStats(data: number[]) {
       return this.worker1.descriptiveStats(data)
     }

     async tTestOneSample(data: number[], popmean?: number) {
       return this.worker2.tTestOneSample(data, popmean ?? 0)
     }

     // ========== 복잡한 메서드 (여러 Worker 조합) ==========
     async checkAllAssumptions(data: any) {
       const results: any = {}
       if (data.values) {
         results.normality = await this.worker1.normalityTest(data.values)
       }
       if (data.groups) {
         results.homogeneity = await this.worker2.leveneTest(data.groups)
       }
       if (data.residuals) {
         results.independence = await this.worker4.durbinWatsonTest(data.residuals)
       }
       return results
     }

     async correlation(x: number[], y: number[]) {
       const pearsonResult = await this.worker2.correlationTest(x, y, 'pearson')
       const spearmanResult = await this.worker2.correlationTest(x, y, 'spearman')
       const kendallResult = await this.worker2.correlationTest(x, y, 'kendall')
       return { pearson: {...}, spearman: {...}, kendall: {...} }
     }

     // ========== 레거시 별칭 유지 ==========
     async calculateDescriptiveStats(data: number[]) {
       return this.descriptiveStats(data)
     }
   }
   ```

2. **Barrel 파일 생성** (1시간)
   ```typescript
   // services/pyodide/index.ts
   export { PyodideStatisticsService, pyodideStats } from './pyodide-statistics'
   export { PyodideCore } from './core/pyodide-core'
   export * from './core/types'
   ```

3. **기존 import 경로 확인** (1시간)
   - Groups: `@/lib/services/pyodide-statistics` → 유지
   - calculator-handlers: 동일
   - app 페이지: 동일
   - **결론**: 외부 코드 수정 불필요 ✅

**검증 포인트**:
- ✅ 외부 호출부 (`StatisticalCalculator` 등) 코드 변경 0개
- ✅ `pyodideStats.<method>()` 모든 호출 동작 확인
- ✅ 타입 체크: `npx tsc --noEmit`

---

#### Phase 5: 검증 및 마이그레이션 (Day 8, 4시간)

**작업 내용**:

1. **TypeScript 컴파일 체크** (30분)
   ```bash
   npx tsc --noEmit
   # 목표: 에러 0개
   ```

2. **주요 워커 기능 통합 테스트** (2시간)
   - Worker 1: `descriptiveStats()`, `normalityTest()`
   - Worker 2: `tTestTwoSample()`, `correlationTest()`
   - Worker 3: `oneWayAnova()`, `tukeyHSD()`
   - Worker 4: `linearRegression()`, `pcaAnalysis()`
   - 복잡한 메서드: `checkAllAssumptions()`, `correlation()`

3. **핵심 통계 시나리오 UI 스모크 테스트** (1시간)
   - app/descriptive 페이지: 기술통계 + 정규성 검정
   - app/t-test 페이지: 독립표본 t-검정
   - app/anova 페이지: 일원분산분석 + Tukey HSD
   - app/regression 페이지: 단순선형회귀

4. **개발자 문서 갱신** (30분)
   - `docs/architecture/pyodide-service-architecture.md` 생성
     - PyodideCore 사용법
     - Worker 서비스 독립 개발 가이드
     - 새 메서드 추가 프로세스 (어떤 Worker에 추가?)
   - CLAUDE.md 업데이트 (새 구조 반영)

**최종 체크리스트**:
- [ ] TypeScript 컴파일 에러 0개
- [ ] 모든 통합 테스트 통과
- [ ] UI 스모크 테스트 통과
- [ ] 개발자 문서 갱신 완료
- [ ] Git 커밋 및 PR 생성

---

### 3.4. 단점 보완 전략

#### 단점 1: 파일/클래스 분산으로 인한 관리 비용
**대응**:
- ✅ Barrel 파일 (`index.ts`) 사용 → 외부에서 간단히 import
- ✅ 문서화: 각 Worker 책임 명확히 정리
- ✅ 명명 규칙 통일: `Worker[N][Category]Service`

#### 단점 2: 중복 코드 위험
**대응**:
- ✅ 공통 DTO/파서/에러 핸들러를 `core/utils.ts`로 모음
- ✅ Worker 서비스는 `PyodideCore.callWorkerMethod()` 재사용
- ✅ 코드 리뷰 시 중복 체크

#### 단점 3: 상태 공유 문제
**대응**:
- ✅ **싱글톤 PyodideCore**: 모든 Worker가 동일한 Pyodide 인스턴스 공유
- ✅ **의존성 주입**: Worker 서비스는 생성자에서 PyodideCore 받음
- ✅ **상태 캡슐화**: Worker 로드 상태는 PyodideCore만 관리

#### 단점 4: 테스트 복잡도 증가
**대응**:
- ✅ **공용 인터페이스**: Mock PyodideCore로 모든 Worker 테스트
- ✅ **통합 테스트 유지**: Facade API 기준 테스트 → 기존 테스트 재사용
- ✅ **단위 테스트 추가**: Worker별 독립 테스트 (더 빠른 피드백)

---

### 3.5. 점진적 리팩토링 실행 순서 (요약)

```
Phase 1 (Day 1-2): 구조 파악 → 문서화
  ↓
Phase 2 (Day 3-4): 공통 모듈 추출 (PyodideCore, utils, types)
  ↓
Phase 3 (Day 5-6): Worker 서비스 분할 (Worker 4→3→2→1)
  ↓
Phase 4 (Day 7): Facade 재구성 (위임 + 복잡한 메서드)
  ↓
Phase 5 (Day 8): 검증 + 테스트 + 문서 갱신
```

**각 단계마다**:
- ✅ TypeScript 빌드 (`npx tsc --noEmit`)
- ✅ 테스트 실행 (회귀 방지)
- ✅ Git 커밋 (단계별 롤백 가능)

---

### 3.6. 예상 효과

| 지표 | Before (Option A) | After (Option B) | 개선 |
|------|-------------------|------------------|------|
| **최대 파일 크기** | 1,500줄 | 700줄 | **53% ↓** |
| **병렬 개발** | 불가 (코드 충돌) | 가능 (독립 파일) | **∞** |
| **테스트 속도** | 전체 실행 | Worker별 실행 | **4배 ↑** |
| **확장성** | 중간 | 높음 | **67% ↑** |
| **신규 메서드 추가** | 1개 파일 수정 | 해당 Worker만 수정 | **4배 ↑** |
| **코드 리뷰** | 2,000줄 검토 | 500줄 검토 | **4배 ↑** |

**파일 구조 변화**:
```
Before (Option A):
  pyodide-statistics.ts (1,500줄)

After (Option B):
  pyodide-statistics.ts (350줄, Facade)
  core/
    pyodide-core.ts (250줄)
    utils.ts (100줄)
    types.ts (50줄)
  workers/
    worker1-descriptive.service.ts (400줄)
    worker2-hypothesis.service.ts (500줄)
    worker3-nonparametric.service.ts (700줄)
    worker4-regression.service.ts (300줄)

총 줄 수: 1,500줄 → 2,650줄 (증가하지만 구조화됨)
```

---

## 4. 로드맵 및 실행 계획

### 4.1. 우선순위

#### P0: 즉시 시작 (Option A)
**이유**:
- 중복 코드 1,400줄 제거 (43% 감소)
- 버그 수정 효율 70배 증가
- 작업 시간 짧음 (3-4일)
- 위험도 낮음

**시작 조건**: ✅ 현재 상태 (추가 준비 불필요)

#### P1: Phase 9 진행 (Option B)
**이유**:
- 병렬 개발 가능
- Worker별 독립 테스트
- 확장성 향상

**시작 조건**:
- ✅ Option A 완료
- ✅ Phase 6-8 완료
- ✅ 모든 테스트 통과

---

### 4.2. 2단계 접근 방식

```
현재 (2,641줄, 중복 많음)
  ↓
Option A 적용 (1,500줄, 중복 제거) ← 즉시 시작
  ↓
Option B 적용 (2,500줄, 구조화) ← Phase 9
```

---

### 4.3. 위험 요소 및 대응

#### Option A 위험

| 위험 | 영향 | 확률 | 대응 |
|------|------|------|------|
| 테스트 커버리지 부족 | 중간 | 중간 | 리팩토링 전 수동 테스트 |
| 파라미터 직렬화 오류 | 낮음 | 낮음 | `validateWorkerParam()` |
| 에러 메시지 변경 | 낮음 | 중간 | `errorMessage` 옵션으로 유지 |

#### Option B 위험

| 위험 | 영향 | 확률 | 대응 |
|------|------|------|------|
| Import 경로 변경 | 중간 | 낮음 | Facade 유지로 기존 경로 동일 |
| 순환 의존성 | 높음 | 낮음 | Worker는 Manager만 의존 |
| 테스트 Mock 수정 | 중간 | 중간 | Facade 테스트는 그대로 유지 |

---

### 4.4. 완료 기준

#### Option A 체크리스트
- [ ] `callWorkerMethod<T>()` 구현 완료
- [ ] 70개 메서드 리팩토링 완료
- [ ] 모든 테스트 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] 문서 업데이트 완료
- [ ] Git 커밋 및 PR 완료

#### Option B 체크리스트
- [ ] PyodideManager 구현 완료
- [ ] Worker 1-4 서비스 구현 완료
- [ ] Facade 구현 완료
- [ ] 모든 테스트 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] 문서 업데이트 완료
- [ ] Git 커밋 및 PR 완료

---

## 📚 참조

### 관련 문서
- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [dailywork.md](../../dailywork.md) - 작업 기록

### 외부 검토
- [수정 검토.md](../../archive/2025-10/수정-검토.md) - Gemini Code Assist 검토 의견

---

## 🎯 최종 권장사항

### 즉시 시작
✅ **Option A (callWorkerMethod 헬퍼)**
- 작업 시간: 3-4일
- 효과: 43% 코드 감소, 유지보수성 67% 향상
- 위험도: 낮음

### Phase 9 진행
✅ **Option B (Worker별 서비스 분리)**
- 작업 시간: 3-4일
- 효과: 병렬 개발 가능, 확장성 향상
- 전제조건: Option A 완료

### 총 작업 시간
**6-8일** (Option A: 3-4일 + Option B: 3-4일)

---

**작성자**: Claude Code
**최종 업데이트**: 2025-10-14
**상태**: ✅ 문서 정리 완료, Option A 승인 대기
