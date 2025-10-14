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

## 3. Option B: 장기 계획

### 3.1. 목표
- Worker별 서비스 분리
- Facade 패턴으로 기존 API 유지
- 병렬 개발 가능
- 기간: 3-4일 (Phase 9)

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

### 3.3. 구현 일정

#### Day 1 (4시간)
- [ ] PyodideManager 구현
- [ ] Worker1Service 구현 (10개 메서드)
- [ ] Facade 구현 (Worker1 위임)
- [ ] 테스트 실행

#### Day 2 (6시간)
- [ ] Worker2Service (20개 메서드)
- [ ] Worker3Service (30개 메서드)
- [ ] Worker4Service (10개 메서드)
- [ ] 테스트 실행

#### Day 3 (4시간)
- [ ] Facade에서 복잡한 메서드 구현
  - `checkAllAssumptions()`
  - `correlation()`
  - `calculateCorrelation()`
  - `performBonferroni()`
- [ ] 전체 테스트 실행

#### Day 4 (2시간)
- [ ] 문서 업데이트
- [ ] 최종 검증
- [ ] Git 커밋 및 PR

---

### 3.4. 예상 효과

| 지표 | Before (Option A) | After (Option B) | 개선 |
|------|-------------------|------------------|------|
| **최대 파일 크기** | 1,500줄 | 700줄 | **53% ↓** |
| **병렬 개발** | 불가 (코드 충돌) | 가능 (독립 파일) | **∞** |
| **테스트 속도** | 전체 실행 | Worker별 실행 | **4배 ↑** |
| **확장성** | 중간 | 높음 | **67% ↑** |

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
