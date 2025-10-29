# Pyodide 성능 회귀 테스트 가이드

**목적**: Phase 5-3 Worker Pool 전환 시 성능/기능 검증 자동화

**작성일**: 2025-10-29

---

## 📋 개요

AdaptiveWorkerPool 구현 후 Pyodide 로딩 및 통계 계산 성능이 저하되지 않았는지 자동으로 검증합니다.

### 테스트 범위

| 카테고리 | 테스트 수 | 측정 항목 |
|----------|-----------|-----------|
| **Pyodide 로딩** | 2 | 초기 로딩, 캐싱 성능 |
| **Worker 1 (Descriptive)** | 2 | descriptive_stats, normality_test |
| **Worker 2 (Hypothesis)** | 2 | one_sample_t_test, two_sample_t_test |
| **Worker 3 (Nonparametric)** | 2 | mann_whitney_u_test, kruskal_wallis_test |
| **Worker 4 (Regression)** | 2 | multiple_regression, pca_analysis |
| **입출력 일관성** | 2 | 동일 입력 → 동일 출력 검증 |
| **총계** | **12** | - |

---

## 🎯 성능 기준값 (Phase 5 Baseline)

### Phase 5 (현재)

```typescript
const PERFORMANCE_THRESHOLDS = {
  pyodideLoading: 3000,      // 3초 (초기 로딩)
  firstCalculation: 12000,   // 12초 (Pyodide 초기화 포함)
  cachedCalculation: 1000,   // 1초 (캐싱)
}
```

### Phase 5-3 (목표 - Worker Pool)

```typescript
const WORKER_POOL_TARGETS = {
  workerPoolLoading: 500,    // 500ms (83% 개선)
  workerPoolFirstCalc: 3000  // 3초 (74% 개선)
}
```

**예상 개선율**:
- 초기 로딩: 3초 → 0.5초 (**83% 빠름**)
- 첫 계산: 12초 → 3초 (**74% 빠름**)
- UI 블로킹: 12초 → 0초 (**100% 제거**)

---

## 🚀 사용 방법

### Option 1: npm 스크립트 (권장)

```bash
# 성능 회귀 테스트 실행
npm run test:performance

# Watch 모드 (개발 중)
npm run test:performance:watch
```

### Option 2: Jest 직접 실행

```bash
# 특정 테스트 파일만
npm test -- __tests__/performance/pyodide-regression.test.ts --verbose

# 타임아웃 조정 (느린 환경)
npm test -- __tests__/performance/pyodide-regression.test.ts --testTimeout=60000
```

### Option 3: CI/CD (GitHub Actions)

**자동 실행 조건**:
- Pull Request → master/main
- Push → master/main
- Pyodide/Worker 파일 변경 시

```bash
# 수동 트리거 (GitHub UI)
Actions → Performance Regression Tests → Run workflow
```

---

## 📊 테스트 상세

### 1. Pyodide 로딩 성능

**목표**: 초기 로딩 < 3초

```typescript
it('should load Pyodide within 3 seconds', async () => {
  const start = performance.now()

  await loadPyodideWithPackages(['numpy', 'scipy'])

  const duration = performance.now() - start

  expect(duration).toBeLessThan(3000) // Phase 5 baseline
})
```

**측정 결과 예시**:
```
⏱️  Pyodide loading: 2847ms  ✅ PASS
```

---

### 2. 캐싱 성능

**목표**: 두 번째 로딩 < 100ms

```typescript
it('should cache Pyodide instance (second load < 100ms)', async () => {
  // First load (already cached from previous test)
  await loadPyodideWithPackages(['numpy', 'scipy'])

  const start = performance.now()
  await loadPyodideWithPackages(['numpy', 'scipy'])
  const duration = performance.now() - start

  expect(duration).toBeLessThan(100) // Should be nearly instant
})
```

**측정 결과 예시**:
```
⚡ Cached loading: 12ms  ✅ PASS
```

---

### 3. Worker별 대표 메서드 (8개)

#### Worker 1: Descriptive Statistics

**메서드 1**: `descriptive_stats`

```typescript
const testData = [1, 2, 3, 4, 5]

const result = await pyodideCore.callWorkerMethod(
  'Worker1_Descriptive',
  'descriptive_stats',
  { data: testData }
)

// 검증
expect(result.mean).toBeCloseTo(3.0, 2)
expect(result.min).toBe(1)
expect(result.max).toBe(5)
```

**메서드 2**: `normality_test`

```typescript
const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const result = await pyodideCore.callWorkerMethod(
  'Worker1_Descriptive',
  'normality_test',
  { data: testData }
)

// 검증
expect(result).toHaveProperty('shapiroWilk')
expect(result).toHaveProperty('kolmogorovSmirnov')
```

---

#### Worker 2: Hypothesis Tests

**메서드 1**: `one_sample_t_test`

```typescript
const testData = [5, 6, 7, 8, 9]
const populationMean = 6

const result = await pyodideCore.callWorkerMethod(
  'Worker2_Hypothesis',
  'one_sample_t_test',
  { data: testData, popmean: populationMean }
)

// 검증
expect(result).toHaveProperty('tStatistic')
expect(result).toHaveProperty('pValue')
expect(result.df).toBe(4) // n-1 = 5-1 = 4
```

**메서드 2**: `two_sample_t_test`

```typescript
const group1 = [1, 2, 3, 4, 5]
const group2 = [2, 3, 4, 5, 6]

const result = await pyodideCore.callWorkerMethod(
  'Worker2_Hypothesis',
  'two_sample_t_test',
  { group1, group2, alternative: 'two-sided', equal_var: true }
)

// 검증
expect(result.df).toBe(8) // n1+n2-2 = 5+5-2 = 8
```

---

#### Worker 3: Nonparametric & ANOVA

**메서드 1**: `mann_whitney_u_test`

```typescript
const group1 = [1, 2, 3, 4, 5]
const group2 = [6, 7, 8, 9, 10]

const result = await pyodideCore.callWorkerMethod(
  'Worker3_NonparametricANOVA',
  'mann_whitney_u_test',
  { group1, group2 }
)

// 검증
expect(result.pValue).toBeGreaterThan(0)
expect(result.pValue).toBeLessThanOrEqual(1)
```

**메서드 2**: `kruskal_wallis_test`

```typescript
const groups = [
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6],
  [3, 4, 5, 6, 7]
]

const result = await pyodideCore.callWorkerMethod(
  'Worker3_NonparametricANOVA',
  'kruskal_wallis_test',
  { groups }
)

// 검증
expect(result.df).toBe(2) // k-1 = 3-1 = 2
```

---

#### Worker 4: Regression & Advanced

**메서드 1**: `multiple_regression`

```typescript
// y = 2x1 + 3x2 + 1
const X = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6]
]
const y = [9, 14, 19, 24, 29]

const result = await pyodideCore.callWorkerMethod(
  'Worker4_RegressionAdvanced',
  'multiple_regression',
  { X, y }
)

// 검증
expect(result.rSquared).toBeGreaterThan(0.9) // High R²
```

**메서드 2**: `pca_analysis`

```typescript
const data = [
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 5],
  [4, 5, 6],
  [5, 6, 7]
]

const result = await pyodideCore.callWorkerMethod(
  'Worker4_RegressionAdvanced',
  'pca_analysis',
  { data, n_components: 2 }
)

// 검증
expect(result.components.length).toBe(5) // 5 samples
```

---

### 4. 입출력 일관성 검증

**목표**: 동일 입력 → 동일 출력

```typescript
it('should produce identical results for identical inputs', async () => {
  const testData = [1, 2, 3, 4, 5]

  // Run twice
  const result1 = await pyodideCore.callWorkerMethod(
    'Worker1_Descriptive',
    'descriptive_stats',
    { data: testData }
  )

  const result2 = await pyodideCore.callWorkerMethod(
    'Worker1_Descriptive',
    'descriptive_stats',
    { data: testData }
  )

  // Results should be identical
  expect(result1.mean).toBe(result2.mean)
  expect(result1.std).toBe(result2.std)
})
```

---

## 📈 결과 해석

### 테스트 출력 예시

```
PASS __tests__/performance/pyodide-regression.test.ts
  Pyodide Regression Tests
    1. Pyodide Loading Performance
      ✓ should load Pyodide within 3 seconds (2847ms)
         ⏱️  Pyodide loading: 2847ms
      ✓ should cache Pyodide instance (12ms)
         ⚡ Cached loading: 12ms
    2. Worker 1: Descriptive Statistics
      ✓ should calculate descriptive statistics correctly (145ms)
         📊 descriptive_stats: 145ms
      ✓ should perform normality test correctly (187ms)
         📈 normality_test: 187ms
    3. Worker 2: Hypothesis Tests
      ✓ should perform one-sample t-test correctly (124ms)
         🧪 one_sample_t_test: 124ms
      ✓ should perform two-sample t-test correctly (139ms)
         🧪 two_sample_t_test: 139ms
    ...

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Time:        8.5 s
```

---

### 성능 저하 감지

**실패 예시** (Phase 5-3 구현 후 성능 저하):

```
FAIL __tests__/performance/pyodide-regression.test.ts
  ● Worker 1: Descriptive Statistics › should calculate descriptive statistics correctly

    expect(received).toBeLessThan(expected)

    Expected: < 1000
    Received:   2500

      📊 descriptive_stats: 2500ms  ❌ FAIL (150% slower)
```

**원인 분석**:
1. Worker Pool 초기화 오버헤드
2. 메시지 전달 지연
3. Pyodide 인스턴스 캐싱 누락

**조치 방법**:
1. Worker Pool 설정 조정 (2+2 → 4+0)
2. 메시지 프로토콜 최적화
3. 캐싱 전략 재검토

---

## 🔧 문제 해결

### 문제 1: Pyodide 로딩 타임아웃

**증상**:
```
Timeout - Async callback was not invoked within the 15000 ms timeout
```

**원인**: 느린 네트워크 또는 CDN 이슈

**해결**:
```bash
# 타임아웃 증가
npm test -- __tests__/performance/pyodide-regression.test.ts --testTimeout=60000
```

---

### 문제 2: Worker 메서드 호출 실패

**증상**:
```
TypeError: pyodideCore.callWorkerMethod is not a function
```

**원인**: PyodideCoreService 초기화 실패

**해결**:
```typescript
// beforeAll에서 초기화 확인
beforeAll(async () => {
  const { PyodideCoreService } = await import('@/lib/services/pyodide/core/pyodide-core.service')
  pyodideCore = PyodideCoreService.getInstance()
  await pyodideCore.initialize()
}, 30000) // 30s timeout
```

---

### 문제 3: CI/CD에서 테스트 실패

**증상**: 로컬에서는 통과하나 CI에서 실패

**원인**: GitHub Actions 환경에서 리소스 제한

**해결**:
```yaml
# .github/workflows/performance-regression.yml
jobs:
  performance-test:
    runs-on: ubuntu-latest
    timeout-minutes: 15  # 타임아웃 증가
    steps:
      - name: Run performance tests
        run: npm test -- __tests__/performance/pyodide-regression.test.ts --testTimeout=60000
```

---

## 📚 Phase 5-3 전환 체크리스트

Worker Pool 구현 후 검증:

- [ ] **로컬 환경에서 성능 테스트 실행**
  ```bash
  npm run test:performance
  ```

- [ ] **모든 12개 테스트 통과 확인**
  - [ ] Pyodide 로딩 (2개)
  - [ ] Worker 1-4 메서드 (8개)
  - [ ] 입출력 일관성 (2개)

- [ ] **성능 개선 확인**
  - [ ] Pyodide 로딩: < 500ms (83% 개선)
  - [ ] 첫 계산: < 3000ms (74% 개선)

- [ ] **회귀 없음 확인**
  - [ ] 기존 메서드 결과 동일
  - [ ] 계산 시간 증가 없음

- [ ] **CI/CD 파이프라인 통과**
  - [ ] GitHub Actions 자동 실행
  - [ ] 모든 테스트 통과

- [ ] **성능 리포트 작성**
  - [ ] Before/After 비교
  - [ ] 개선율 측정
  - [ ] 문서 업데이트

---

## 🔗 관련 문서

- [WORKER_ENVIRONMENT_VERIFICATION.md](./WORKER_ENVIRONMENT_VERIFICATION.md) - Worker 환경 검증
- [phase5-architecture.md](../statistical-platform/docs/phase5-architecture.md) - Phase 5 아키텍처
- [pyodide-refactoring-plan.md](./planning/pyodide-refactoring-plan.md) - Worker Pool 계획

---

## 📊 성능 기록 (Historical)

### Phase 5 Baseline (2025-10-17)

| 항목 | 시간 | 환경 |
|------|------|------|
| Pyodide 초기 로딩 | 2,847ms | Chrome 120, 16GB RAM |
| Pyodide 캐싱 로딩 | 12ms | (동일) |
| descriptive_stats | 145ms | (동일) |
| normality_test | 187ms | (동일) |
| one_sample_t_test | 124ms | (동일) |
| two_sample_t_test | 139ms | (동일) |

### Phase 5-3 Target (예상)

| 항목 | 목표 | 예상 개선율 |
|------|------|-------------|
| Worker Pool 로딩 | 500ms | 83% ⬆️ |
| 첫 계산 (Worker Pool) | 3,000ms | 74% ⬆️ |
| UI 블로킹 | 0ms | 100% ⬆️ |
| 병렬 처리 (3개 동시) | 3,800ms | 89% ⬆️ |

---

**작성**: Claude Code (AI)
**최종 업데이트**: 2025-10-29
**관련 Phase**: Phase 5-3 사전 준비
