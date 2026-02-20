# 📋 PyodideStatisticsService 코드 리뷰

## 📊 파일 정보
- **파일**: `lib/services/pyodide-statistics.ts`
- **크기**: 약 1200줄
- **목적**: Pyodide를 통한 Python 기반 통계 계산 서비스
- **리뷰 일자**: 2025-09-17

## ✅ 잘된 점

### 1. 싱글톤 패턴 구현
```typescript
private static instance: PyodideStatisticsService | null = null
static getInstance(): PyodideStatisticsService
```
- 전역적으로 하나의 인스턴스만 유지
- 메모리 효율적

### 2. 초기화 최적화
```typescript
if (this.isLoading && this.loadPromise) {
  return this.loadPromise
}
```
- 중복 초기화 방지
- Promise 재사용으로 성능 향상

### 3. Python 통계 라이브러리 활용
- SciPy, NumPy, pandas 등 검증된 라이브러리 사용
- 통계 계산의 정확성 보장

## ⚠️ 문제점 및 개선 제안

### 1. 타입 안전성 부족
**문제**: `any` 타입 과도 사용
```typescript
private pyodide: any = null
```

**개선안**:
```typescript
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<any>
  globals: {
    set: (key: string, value: any) => void
    get: (key: string) => any
  }
  loadPackage: (packages: string[]) => Promise<void>
}

private pyodide: PyodideInterface | null = null
```

### 2. 코드 중복
**문제**: 각 통계 함수에서 반복되는 패턴
```typescript
await this.initialize()
this.pyodide.globals.set('data', data)
const result = await this.pyodide.runPythonAsync(`...`)
const parsed = JSON.parse(result)
if (parsed.error) throw new Error(parsed.error)
```

**개선안**: 공통 헬퍼 메서드
```typescript
private async executePython<T>(
  code: string,
  variables: Record<string, any> = {}
): Promise<T> {
  await this.initialize()

  // 변수 설정
  for (const [key, value] of Object.entries(variables)) {
    this.pyodide.globals.set(key, value)
  }

  // 코드 실행
  const result = await this.pyodide.runPythonAsync(code)
  const parsed = JSON.parse(result)

  if (parsed.error) {
    throw new Error(parsed.error)
  }

  return parsed
}
```

### 3. 에러 처리 개선 필요
**문제**: 일관되지 않은 에러 처리
```typescript
if (parsed.error) {
  throw new Error(parsed.error)
}
```

**개선안**: 커스텀 에러 클래스
```typescript
class StatisticalError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'StatisticalError'
  }
}

// 사용 예
if (parsed.error) {
  throw new StatisticalError(
    parsed.error,
    'CALCULATION_ERROR',
    { function: 'shapiroWilkTest', data: data.length }
  )
}
```

### 4. 메모리 누수 가능성
**문제**: globals에 설정한 변수가 계속 남아있음

**개선안**: 실행 후 정리
```typescript
private async executePython<T>(code: string, variables: Record<string, any>): Promise<T> {
  const varNames = Object.keys(variables)

  try {
    // 변수 설정 및 실행
    for (const [key, value] of Object.entries(variables)) {
      this.pyodide.globals.set(key, value)
    }
    return await this.pyodide.runPythonAsync(code)
  } finally {
    // 변수 정리
    for (const name of varNames) {
      this.pyodide.globals.delete(name)
    }
  }
}
```

### 5. 패키지 로딩 최적화
**문제**: 모든 패키지를 한 번에 로드 (scikit-learn은 무거움)

**개선안**: 지연 로딩
```typescript
private loadedPackages = new Set<string>()

private async ensurePackage(packageName: string): Promise<void> {
  if (!this.loadedPackages.has(packageName)) {
    await this.pyodide.loadPackage(packageName)
    this.loadedPackages.add(packageName)
  }
}

// 사용 예
async pca(data: number[][]): Promise<any> {
  await this.ensurePackage('scikit-learn')
  // ...
}
```

### 6. Python 코드 분리
**문제**: TypeScript 파일 내 Python 코드가 1200줄 중 대부분

**개선안**: Python 템플릿 분리
```typescript
// lib/services/python-templates/shapiro-wilk.py
import numpy as np
from scipy import stats
import json

np_array = np.array(data_array)
clean_data = np_array[~np.isnan(np_array)]

if len(clean_data) < 3:
    result = {'error': 'Insufficient data'}
else:
    statistic, pvalue = stats.shapiro(clean_data)
    result = {
        'statistic': float(statistic),
        'pvalue': float(pvalue)
    }

json.dumps(result)
```

```typescript
// TypeScript에서 사용
import shapiroWilkTemplate from './python-templates/shapiro-wilk.py'

async shapiroWilkTest(data: number[]) {
  return this.executePython(shapiroWilkTemplate, { data_array: data })
}
```

## 🎯 리팩토링 우선순위

1. **높음**:
   - 공통 실행 메서드 추출
   - 타입 정의 추가
   - 에러 처리 통일

2. **중간**:
   - Python 코드 템플릿 분리
   - 메모리 관리 개선
   - 테스트 코드 추가

3. **낮음**:
   - 패키지 지연 로딩
   - 로깅 시스템 개선
   - 문서화 강화

## 📈 성능 최적화 제안

### 1. 캐싱 구현
```typescript
private cache = new Map<string, { data: any, timestamp: number }>()
private CACHE_TTL = 5 * 60 * 1000 // 5분

private getCacheKey(method: string, params: any): string {
  return `${method}:${JSON.stringify(params)}`
}

async tTest(group1: number[], group2: number[], options: any) {
  const cacheKey = this.getCacheKey('tTest', { group1, group2, options })
  const cached = this.cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
    return cached.data
  }

  const result = await this.executePython(/* ... */)
  this.cache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}
```

### 2. Web Worker 활용
```typescript
// 별도 Worker 파일
class PyodideWorker {
  private worker: Worker

  constructor() {
    this.worker = new Worker('/pyodide-worker.js')
  }

  async calculate(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.worker.postMessage({ method, params })
      this.worker.onmessage = (e) => resolve(e.data)
      this.worker.onerror = reject
    })
  }
}
```

## 📋 체크리스트

### 즉시 수정 필요
- [ ] JSON 파싱 오류 처리 강화
- [ ] 메모리 누수 방지 (globals 정리)
- [ ] 타입 정의 추가

### 중기 개선
- [ ] Python 코드 모듈화
- [ ] 단위 테스트 작성
- [ ] 성능 벤치마크

### 장기 목표
- [ ] Web Worker 마이그레이션
- [ ] 캐싱 레이어 구현
- [ ] 오프라인 모드 지원

## 🔍 보안 고려사항

1. **입력 검증**: 사용자 데이터 검증 강화 필요
2. **코드 인젝션**: Python 코드 실행 시 보안 검토
3. **메모리 관리**: 대용량 데이터 처리 시 메모리 제한

## 💡 결론

현재 코드는 기능적으로 작동하지만, 유지보수성과 확장성을 위한 리팩토링이 필요합니다. 특히:

1. **코드 구조화**: 1200줄의 단일 파일을 여러 모듈로 분리
2. **타입 안전성**: TypeScript의 장점을 활용한 타입 정의
3. **성능 최적화**: 캐싱과 Web Worker를 통한 응답성 개선
4. **테스트 커버리지**: 단위 테스트와 통합 테스트 추가

이러한 개선을 통해 더 안정적이고 확장 가능한 통계 서비스를 구축할 수 있습니다.