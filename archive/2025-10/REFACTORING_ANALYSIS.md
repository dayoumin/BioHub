# pyodide-statistics.ts 리팩토링 분석

**작성일**: 2025-10-14
**분석 대상**: `statistical-platform/lib/services/pyodide-statistics.ts` (2,641줄)

---

## 📊 1. 현황 분석

### 파일 구조
- **총 메서드**: 84개
- **총 줄 수**: 2,641줄
- **Worker 수**: 4개 (descriptive, hypothesis, nonparametric-anova, regression-advanced)

### 메서드 패턴 분류

#### 패턴 A: 단순 Worker 호출 (70개, 83%)
**특징**:
- `await this.initialize()` + `await this.ensureWorkerNLoaded()`
- `runPythonAsync()` 호출
- JSON 직렬화/역직렬화
- 에러 처리 (`parsed.error` 체크)

**예시**:
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
  if (parsed.error) throw new Error(`Descriptive stats 실행 실패: ${parsed.error}`)
  return parsed
}
```

**직렬화 안전성**:
- ✅ `number[]` - 안전
- ✅ `number` - 안전
- ✅ `string` / `boolean` - 안전
- ✅ `number[][]` (2D 배열) - 안전
- ✅ `(string | number)[]` - 안전
- ⚠️ **특수 케이스 없음**: NaN, Infinity, Date, TypedArray 사용 안 함
- ✅ **DataFrame 미사용**: 모두 JSON으로 처리

**헬퍼 적용 가능성**: ✅ **100% 가능**

---

#### 패턴 B: 다중 Worker 호출 (5개, 6%)
**특징**:
- 여러 Worker 메서드를 순차 호출
- 결과 병합/변환
- 커스텀 후처리 로직

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

**목록**:
1. `correlation()` - 3가지 상관계수 병합
2. `checkAllAssumptions()` - 정규성/등분산성/독립성 종합 검정
3. `calculateCorrelation()` - 상관행렬 계산
4. `performBonferroni()` - 모든 쌍 비교 후 Bonferroni 보정
5. `tTest()` / `anova()` / `regression()` - 옵션에 따라 다른 메서드 호출

**헬퍼 적용 가능성**: ❌ **불가** (커스텀 로직 유지 필요)

---

#### 패턴 C: 래퍼/별칭 메서드 (9개, 11%)
**특징**:
- 기존 메서드를 단순 호출 (레거시 API 호환성)
- 간단한 필드 매핑/변환

**예시**:
```typescript
async calculateDescriptiveStats(data: number[]) {
  return this.descriptiveStats(data)
}

async testNormality(data: number[], alpha: number = 0.05) {
  const result = await this.shapiroWilkTest(data)
  return { ...result, isNormal: result.pValue > alpha }
}
```

**목록**:
1. `calculateDescriptiveStats()` → `descriptiveStats()`
2. `calculateDescriptiveStatistics()` → `descriptiveStats()`
3. `testNormality()` → `shapiroWilkTest()` (isNormal 재계산)
4. `testHomogeneity()` → `leveneTest()`
5. `oneSampleTTest()` → `tTestOneSample()`
6. `twoSampleTTest()` → `tTestTwoSample()`
7. `pairedTTest()` → `tTestPaired()`
8. `oneWayANOVA()` → `oneWayAnovaWorker()`
9. `simpleLinearRegression()` → `regression()`

**헬퍼 적용 가능성**: ✅ **유지** (리팩토링 불필요)

---

## 🔍 2. 중복 코드 분석

### 중복 패턴 (패턴 A 메서드 내)
모든 **패턴 A 메서드**는 다음 구조를 반복:

```typescript
// 1. 초기화 (3줄)
await this.initialize()
await this.ensureWorkerNLoaded()

// 2. Python 코드 실행 (12-15줄)
const resultStr = await this.pyodide!.runPythonAsync(`
  import json
  from workerN_module import method_name

  param1 = ${JSON.stringify(param1)}
  param2 = ${JSON.stringify(param2)}

  try:
    result = method_name(param1, param2)
    result_json = json.dumps(result)
  except Exception as e:
    result_json = json.dumps({'error': str(e)})

  result_json
`)

// 3. 결과 파싱 (5줄)
const parsed = this.parsePythonResult<any>(resultStr)
if (parsed.error) {
  throw new Error(`Method execution failed: ${parsed.error}`)
}
return parsed
```

**총 중복 줄 수**: 70개 메서드 × 20줄 = **1,400줄**

---

## 💡 3. 리팩토링 제안 (Option A)

### 공통 헬퍼 함수 설계

#### 3.1. 기본 헬퍼 (패턴 A 전용)

```typescript
/**
 * Worker 메서드 호출 공통 헬퍼
 *
 * @param workerNum Worker 번호 (1-4)
 * @param methodName Python 함수명
 * @param params 파라미터 객체 (JSON 직렬화 가능)
 * @param customErrorMsg 커스텀 에러 메시지
 * @returns Python 실행 결과
 */
private async callWorkerMethod<T>(
  workerNum: 1 | 2 | 3 | 4,
  methodName: string,
  params: Record<string, any>,
  customErrorMsg?: string
): Promise<T> {
  // 1. 초기화
  await this.initialize()
  await this.ensureWorkerLoaded(workerNum)

  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  // 2. 파라미터 직렬화 (안전성 검증)
  const paramsLines = Object.entries(params)
    .map(([key, value]) => {
      // NaN/Infinity 체크 (현재 코드에서는 사용 안 함)
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error(`Invalid parameter ${key}: ${value}`)
      }

      return `${key} = ${JSON.stringify(value)}`
    })
    .join('\n')

  const paramNames = Object.keys(params).join(', ')

  // 3. Python 코드 실행
  const resultStr = await this.pyodide.runPythonAsync(`
    import json
    from worker${workerNum}_module import ${methodName}

    ${paramsLines}

    try:
      result = ${methodName}(${paramNames})
      result_json = json.dumps(result)
    except Exception as e:
      result_json = json.dumps({'error': str(e)})

    result_json
  `)

  // 4. 결과 파싱
  const parsed = this.parsePythonResult<T>(resultStr)

  if ((parsed as any).error) {
    const errorMsg = customErrorMsg || `${methodName} 실행 실패`
    throw new Error(`${errorMsg}: ${(parsed as any).error}`)
  }

  return parsed
}
```

#### 3.2. 메서드 간소화 예시

**Before** (20줄):
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

**After** (5줄):
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
  return this.callWorkerMethod(1, 'descriptive_stats', { data }, 'Descriptive stats 실행 실패')
}
```

**줄 수 감소**: 20줄 → 5줄 (**75% 감소**)

---

## 📈 4. 예상 효과

### 코드 줄 수
- **현재**: 2,641줄
- **예상**: ~1,500줄 (중복 1,100줄 제거)
- **감소율**: **43%**

### 파일별 예상 크기
- 패턴 A 메서드 (70개): 1,400줄 → **350줄** (75% 감소)
- 패턴 B/C 메서드 (14개): 약 600줄 (유지)
- 초기화/헬퍼 로직: 약 550줄 (유지)
- **Total**: **1,500줄**

### 유지보수성
- ✅ **버그 수정**: 1곳만 수정 (70개 메서드 동시 수정 불필요)
- ✅ **에러 처리 개선**: 헬퍼에서 통합 관리
- ✅ **타입 안전성**: 제네릭 타입으로 강화
- ✅ **테스트**: 헬퍼 함수 1개만 집중 테스트

### 위험도
- ⚠️ **낮음**: 기존 API 변경 없음 (래퍼 메서드 유지)
- ⚠️ **테스트 필요**: 헬퍼 적용 후 기존 테스트 통과 확인

---

## 🚀 5. 구현 계획

### Phase 1: 헬퍼 함수 구현 (1일)
1. `callWorkerMethod<T>()` 구현
2. 단위 테스트 작성 (Mock Pyodide)
3. 2-3개 메서드로 검증

### Phase 2: 점진적 적용 (2-3일)
1. Worker 1 메서드 (10개) 리팩토링
2. 테스트 통과 확인
3. Worker 2-4 메서드 순차 적용

### Phase 3: 검증 및 문서화 (0.5일)
1. 전체 테스트 실행
2. TypeScript 컴파일 체크
3. CLAUDE.md 업데이트

**총 작업 시간**: **3-4일**

---

## 🔮 6. 장기 계획 (Option B - Phase 9)

### Worker별 서비스 분리 + Facade 유지

```
lib/services/
├── pyodide-manager.ts          (공통 관리자, 250줄)
├── workers/
│   ├── worker1-descriptive.service.ts   (400줄)
│   ├── worker2-hypothesis.service.ts    (500줄)
│   ├── worker3-nonparametric.service.ts (700줄)
│   └── worker4-regression.service.ts    (300줄)
└── pyodide-statistics.ts       (Facade, 350줄)
```

**장점**:
- ✅ Worker별 독립 개발 가능
- ✅ 코드 충돌 최소화
- ✅ 기존 API 완전 호환

**전제조건**:
- ✅ Option A (헬퍼 적용) 먼저 완료
- ✅ 헬퍼를 각 Worker 서비스에서 재사용

---

## 📝 7. 결론

### 권장 접근 방식

**단기 (지금 ~ Phase 6)**:
- ✅ **Option A**: `callWorkerMethod<T>()` 헬퍼 도입
- 예상 효과: 2,641줄 → 1,500줄 (43% 감소)
- 작업 시간: 3-4일

**장기 (Phase 9)**:
- ✅ **Option B**: Worker별 서비스 분리
- Facade 패턴으로 기존 API 유지
- Option A 헬퍼 재사용

### 우선순위
1. **P0** (즉시): Option A 헬퍼 구현
2. **P1** (Phase 6): 전체 메서드 리팩토링 완료
3. **P2** (Phase 9): Worker별 서비스 분리

---

**분석자**: Claude Code
**참조 문서**: [수정 검토.md](수정 검토.md), [CLAUDE.md](CLAUDE.md)