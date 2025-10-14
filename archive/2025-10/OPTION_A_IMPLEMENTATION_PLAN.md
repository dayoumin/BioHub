# Option A: callWorkerMethod 헬퍼 구현 계획

**작성일**: 2025-10-14
**목표**: pyodide-statistics.ts의 중복 코드 75% 제거 (2,641줄 → 1,500줄)

---

## 📋 1. 구현 개요

### 목표
단일 공통 헬퍼 함수로 70개 메서드의 중복 코드 제거

### 핵심 전략
1. **안전한 타입 시스템**: 제네릭 타입 + 파라미터 검증
2. **점진적 적용**: Worker 1 → 2 → 3 → 4 순차 리팩토링
3. **기존 API 유지**: 메서드 시그니처 변경 없음
4. **테스트 우선**: 헬퍼 구현 후 즉시 테스트

---

## 🔧 2. 헬퍼 함수 상세 설계

### 2.1. 타입 정의

```typescript
/**
 * Worker 메서드 호출 파라미터 타입
 * - JSON 직렬화 가능한 타입만 허용
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
  /**
   * 커스텀 에러 메시지 (기본값: "{methodName} 실행 실패")
   */
  errorMessage?: string

  /**
   * 파라미터 검증 비활성화 (기본값: false)
   * 주의: 성능 최적화용, 검증된 파라미터에만 사용
   */
  skipValidation?: boolean
}
```

### 2.2. 헬퍼 함수 구현

```typescript
/**
 * Worker 메서드 공통 호출 헬퍼
 *
 * @template T 반환 타입
 * @param workerNum Worker 번호 (1-4)
 * @param methodName Python 함수명 (snake_case)
 * @param params 파라미터 객체 (키: Python 파라미터명, 값: 직렬화 가능한 데이터)
 * @param options 추가 옵션
 * @returns Python 함수 실행 결과
 *
 * @example
 * // 기본 사용법
 * const result = await this.callWorkerMethod<DescriptiveStatsResult>(
 *   1,
 *   'descriptive_stats',
 *   { data: [1, 2, 3, 4, 5] }
 * )
 *
 * @example
 * // 커스텀 에러 메시지
 * const result = await this.callWorkerMethod<TTestResult>(
 *   2,
 *   't_test_one_sample',
 *   { data: [1, 2, 3], popmean: 0 },
 *   { errorMessage: 'One-sample t-test 실행 실패' }
 * )
 */
private async callWorkerMethod<T>(
  workerNum: 1 | 2 | 3 | 4,
  methodName: string,
  params: Record<string, WorkerMethodParam>,
  options: WorkerMethodOptions = {}
): Promise<T> {
  // ========== 1. 초기화 ==========
  await this.initialize()
  await this.ensureWorkerLoaded(workerNum)

  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  // ========== 2. 파라미터 검증 및 직렬화 ==========
  const skipValidation = options.skipValidation ?? false

  const paramsLines: string[] = []
  const paramNames: string[] = []

  for (const [key, value] of Object.entries(params)) {
    // 파라미터 검증 (skipValidation=false일 때만)
    if (!skipValidation) {
      this.validateWorkerParam(key, value)
    }

    // Python 변수 할당문 생성
    paramsLines.push(`${key} = ${JSON.stringify(value)}`)
    paramNames.push(key)
  }

  const paramsCode = paramsLines.join('\n')
  const paramNamesStr = paramNames.join(', ')

  // ========== 3. Python 코드 실행 ==========
  const resultStr = await this.pyodide.runPythonAsync(`
    import json
    from worker${workerNum}_module import ${methodName}

    # 파라미터 할당
    ${paramsCode}

    # 함수 실행
    try:
      result = ${methodName}(${paramNamesStr})
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  // ========== 4. 결과 파싱 및 에러 처리 ==========
  const parsed = this.parsePythonResult<T>(resultStr)

  // Python 실행 에러 체크
  if ((parsed as any).error) {
    const errorMsg = options.errorMessage || `${methodName} 실행 실패`
    throw new Error(`${errorMsg}: ${(parsed as any).error}`)
  }

  return parsed
}
```

### 2.3. 파라미터 검증 함수

```typescript
/**
 * Worker 메서드 파라미터 검증
 *
 * @param key 파라미터 이름
 * @param value 파라미터 값
 * @throws Error 검증 실패 시
 */
private validateWorkerParam(key: string, value: WorkerMethodParam): void {
  // null 허용
  if (value === null) return

  // undefined 금지
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

  // 문자열/불린 검증 (통과)
  if (typeof value === 'string' || typeof value === 'boolean') {
    return
  }

  // 배열 검증
  if (Array.isArray(value)) {
    // 빈 배열 허용
    if (value.length === 0) return

    // 1차원 배열 (number[] | string[] | (number | string)[])
    if (!Array.isArray(value[0])) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i]
        if (typeof item === 'number') {
          if (!Number.isFinite(item)) {
            throw new Error(`파라미터 '${key}[${i}]'가 유효하지 않은 숫자입니다: ${item}`)
          }
        } else if (typeof item !== 'string') {
          throw new Error(`파라미터 '${key}[${i}]'가 유효하지 않은 타입입니다: ${typeof item}`)
        }
      }
      return
    }

    // 2차원 배열 (number[][])
    for (let i = 0; i < value.length; i++) {
      const row = value[i]
      if (!Array.isArray(row)) {
        throw new Error(`파라미터 '${key}[${i}]'가 배열이 아닙니다`)
      }

      for (let j = 0; j < row.length; j++) {
        const item = row[j]
        if (typeof item !== 'number' || !Number.isFinite(item)) {
          throw new Error(`파라미터 '${key}[${i}][${j}]'가 유효하지 않은 숫자입니다: ${item}`)
        }
      }
    }
    return
  }

  // 지원하지 않는 타입
  throw new Error(`파라미터 '${key}'가 지원하지 않는 타입입니다: ${typeof value}`)
}
```

---

## 📝 3. 메서드 리팩토링 예시

### 예시 1: 기본 사용 (Worker 1)

#### Before (20줄)
```typescript
async descriptiveStats(data: number[]): Promise<{
  mean: number
  median: number
  std: number
  min: number
  max: number
  q1: number
  q3: number
  skewness: number
  kurtosis: number
}> {
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
async descriptiveStats(data: number[]): Promise<{
  mean: number
  median: number
  std: number
  min: number
  max: number
  q1: number
  q3: number
  skewness: number
  kurtosis: number
}> {
  return this.callWorkerMethod(
    1,
    'descriptive_stats',
    { data },
    { errorMessage: 'Descriptive stats 실행 실패' }
  )
}
```

---

### 예시 2: 다중 파라미터 (Worker 2)

#### Before (25줄)
```typescript
async tTestOneSample(data: number[], popmean: number = 0): Promise<{
  statistic: number
  pValue: number
  df: number
  sampleMean: number
}> {
  await this.initialize()
  await this.ensureWorker2Loaded()

  const resultStr = await this.pyodide!.runPythonAsync(`
    import json
    from worker2_module import t_test_one_sample

    data = ${JSON.stringify(data)}

    try:
      result = t_test_one_sample(data, popmean=${popmean})
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  const parsed = this.parsePythonResult<any>(resultStr)
  if (parsed.error) {
    throw new Error(`One-sample t-test 실행 실패: ${parsed.error}`)
  }

  return parsed
}
```

#### After (5줄)
```typescript
async tTestOneSample(data: number[], popmean: number = 0): Promise<{
  statistic: number
  pValue: number
  df: number
  sampleMean: number
}> {
  return this.callWorkerMethod(
    2,
    't_test_one_sample',
    { data, popmean },
    { errorMessage: 'One-sample t-test 실행 실패' }
  )
}
```

---

### 예시 3: 문자열 파라미터 (Worker 2)

#### Before (25줄)
```typescript
async correlationTest(
  x: number[],
  y: number[],
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): Promise<{
  correlation: number
  pValue: number
  method: string
}> {
  await this.initialize()
  await this.ensureWorker2Loaded()

  const resultStr = await this.pyodide!.runPythonAsync(`
    import json
    from worker2_module import correlation_test

    x = ${JSON.stringify(x)}
    y = ${JSON.stringify(y)}

    try:
      result = correlation_test(x, y, method='${method}')
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  const parsed = this.parsePythonResult<any>(resultStr)
  if (parsed.error) {
    throw new Error(`Correlation test 실행 실패: ${parsed.error}`)
  }

  return parsed
}
```

#### After (7줄)
```typescript
async correlationTest(
  x: number[],
  y: number[],
  method: 'pearson' | 'spearman' | 'kendall' = 'pearson'
): Promise<{
  correlation: number
  pValue: number
  method: string
}> {
  return this.callWorkerMethod(
    2,
    'correlation_test',
    { x, y, method },
    { errorMessage: 'Correlation test 실행 실패' }
  )
}
```

---

## 🧪 4. 테스트 전략

### 4.1. 헬퍼 함수 단위 테스트

```typescript
// __tests__/services/pyodide-helper.test.ts

describe('callWorkerMethod', () => {
  let service: PyodideStatisticsService

  beforeEach(() => {
    service = PyodideStatisticsService.getInstance()
    // Mock Pyodide
    service['pyodide'] = {
      runPythonAsync: jest.fn()
    } as any
  })

  it('should call Worker 1 method successfully', async () => {
    const mockResult = { mean: 5, median: 5 }
    ;(service['pyodide']!.runPythonAsync as jest.Mock).mockResolvedValue(
      JSON.stringify(mockResult)
    )

    const result = await service['callWorkerMethod'](
      1,
      'descriptive_stats',
      { data: [1, 2, 3, 4, 5] }
    )

    expect(result).toEqual(mockResult)
  })

  it('should throw error on Python exception', async () => {
    ;(service['pyodide']!.runPythonAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ error: 'Invalid data' })
    )

    await expect(
      service['callWorkerMethod'](1, 'descriptive_stats', { data: [] })
    ).rejects.toThrow('descriptive_stats 실행 실패: Invalid data')
  })

  it('should validate parameters', () => {
    expect(() => {
      service['validateWorkerParam']('test', NaN)
    }).toThrow('유효하지 않은 숫자')

    expect(() => {
      service['validateWorkerParam']('test', Infinity)
    }).toThrow('유효하지 않은 숫자')

    expect(() => {
      service['validateWorkerParam']('test', undefined as any)
    }).toThrow('undefined')
  })
})
```

### 4.2. 통합 테스트

기존 E2E 테스트 그대로 실행:

```bash
npm test statistical-platform/__tests__/pyodide-basic.spec.ts
npm test statistical-platform/e2e/workers-validation.spec.ts
```

**기대 결과**: ✅ **모든 테스트 통과** (API 변경 없으므로)

---

## 📅 5. 구현 일정

### Day 1: 헬퍼 구현 및 검증 (4시간)

1. ✅ **헬퍼 함수 구현** (1시간)
   - `callWorkerMethod<T>()` 추가
   - `validateWorkerParam()` 추가
   - 타입 정의 추가

2. ✅ **단위 테스트 작성** (1시간)
   - 헬퍼 함수 테스트
   - 파라미터 검증 테스트
   - 에러 처리 테스트

3. ✅ **Worker 1 메서드 2-3개 리팩토링** (1시간)
   - `descriptiveStats()` 리팩토링
   - `normalityTest()` 리팩토링
   - `outlierDetection()` 리팩토링

4. ✅ **통합 테스트 실행** (1시간)
   - 기존 테스트 통과 확인
   - TypeScript 컴파일 체크

---

### Day 2: Worker 1-2 리팩토링 (4시간)

1. ✅ **Worker 1 나머지 메서드** (1.5시간)
   - 7개 메서드 리팩토링
   - 테스트 실행

2. ✅ **Worker 2 메서드** (2시간)
   - 20개 메서드 리팩토링
   - 테스트 실행

3. ✅ **중간 검증** (0.5시간)
   - 전체 테스트 실행
   - 코드 리뷰

---

### Day 3: Worker 3-4 리팩토링 (4시간)

1. ✅ **Worker 3 메서드** (2.5시간)
   - 30개 메서드 리팩토링
   - 테스트 실행

2. ✅ **Worker 4 메서드** (1시간)
   - 10개 메서드 리팩토링
   - 테스트 실행

3. ✅ **최종 검증** (0.5시간)
   - 전체 테스트 실행
   - TypeScript 컴파일 체크

---

### Day 4: 문서화 및 정리 (2시간)

1. ✅ **코드 정리** (0.5시간)
   - 주석 업데이트
   - 사용하지 않는 코드 제거

2. ✅ **문서 업데이트** (1시간)
   - [CLAUDE.md](CLAUDE.md) 업데이트
   - [REFACTORING_ANALYSIS.md](REFACTORING_ANALYSIS.md) 완료 표시
   - [dailywork.md](dailywork.md) 작업 기록

3. ✅ **최종 커밋** (0.5시간)
   - Git 커밋 메시지 작성
   - PR 생성 (선택)

---

## ⚠️ 6. 주의사항 및 위험 요소

### 위험 요소

1. **테스트 커버리지**
   - ⚠️ 일부 메서드는 테스트가 없을 수 있음
   - ✅ **대응**: 리팩토링 전 수동 테스트 실행

2. **파라미터 순서**
   - ⚠️ Python 함수 파라미터 순서가 다를 수 있음
   - ✅ **대응**: `params` 객체는 키워드 인자로 전달 (순서 무관)

3. **에러 메시지 변경**
   - ⚠️ 기존 에러 메시지와 다를 수 있음
   - ✅ **대응**: `errorMessage` 옵션으로 동일하게 유지

### 회귀 방지

- ✅ **점진적 적용**: Worker별로 순차 리팩토링
- ✅ **테스트 실행**: 각 Worker 리팩토링 후 즉시 테스트
- ✅ **롤백 가능**: Git 커밋 단위로 작업

---

## 📊 7. 예상 결과

### 코드 품질 지표

| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| **총 줄 수** | 2,641줄 | 1,500줄 | **43% ↓** |
| **메서드당 평균 줄 수** | 31줄 | 18줄 | **42% ↓** |
| **중복 코드** | 1,400줄 | 0줄 | **100% ↓** |
| **유지보수성** | 3/5 | 5/5 | **67% ↑** |

### 버그 수정 효율

| 시나리오 | Before | After |
|---------|--------|-------|
| 에러 처리 개선 | 70개 파일 수정 | 1개 함수 수정 |
| 파라미터 검증 추가 | 70개 메서드 수정 | 1개 함수 수정 |
| 로깅 추가 | 70개 메서드 수정 | 1개 함수 수정 |

---

## ✅ 8. 체크리스트

### 구현 전 확인
- [ ] 모든 기존 테스트 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] Git 브랜치 생성 (`refactor/option-a-helper`)

### 구현 중 확인
- [ ] 헬퍼 함수 단위 테스트 작성
- [ ] Worker 1 리팩토링 + 테스트 통과
- [ ] Worker 2 리팩토링 + 테스트 통과
- [ ] Worker 3 리팩토링 + 테스트 통과
- [ ] Worker 4 리팩토링 + 테스트 통과

### 구현 후 확인
- [ ] 전체 테스트 통과
- [ ] TypeScript 컴파일 체크
- [ ] 코드 품질 검사 (`npm run lint`)
- [ ] 문서 업데이트
- [ ] Git 커밋 및 PR

---

**작성자**: Claude Code
**승인 대기**: 사용자 확인 후 구현 시작
**예상 완료일**: 2025-10-18