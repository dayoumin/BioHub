# 다음 세션: Batch 2 계속 진행 가이드

**작성일**: 2025-11-13
**현재 상태**: Worker 1 메서드 2개 구현 완료 (ks_test, mann_kendall_test)
**다음 작업**: 2개 페이지 변환 + 나머지 4개 페이지 Worker 2 메서드 구현

---

## ✅ 완료된 작업 (현재 세션)

### 1. Worker 1 메서드 구현 완료

**파일**: `statistical-platform/public/workers/python/worker1-descriptive.py`

**추가된 메서드**:
1. `ks_test_one_sample(values)` - Lines 236-271
2. `ks_test_two_sample(values1, values2)` - Lines 274-309
3. `mann_kendall_test(data)` - Lines 312-375

**커밋**: `d13e779` - feat(phase9-batch2): Worker 1에 ks_test, mann_kendall_test 메서드 추가

---

## 📋 다음 세션 작업 순서

### Step 1: ks-test 페이지 PyodideCore 변환 (20분)

**파일**: `statistical-platform/app/(dashboard)/statistics/ks-test/page.tsx`

**변환 작업**:

1. **Import 변경**:
```typescript
// Before
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import type { PyodideInterface } from '@/types/pyodide'

// After
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
```

2. **calculateOneSampleKS 함수 변경** (Lines 113-183):
```typescript
// Before
const calculateOneSampleKS = useCallback(async (
  values: number[],
  variable: string,
  pyodide: PyodideInterface
): Promise<KSTestResult> => {
  // ... pyodide.runPythonAsync() 사용
}

// After
const calculateOneSampleKS = useCallback(async (
  values: number[],
  variable: string
): Promise<KSTestResult> => {
  const pyodideCore = PyodideCoreService.getInstance()
  const result = await pyodideCore.callWorkerMethod<{
    testType: string
    statisticKS: number
    pValue: number
    criticalValue: number
    significant: boolean
    sampleSizes: { n1: number }
    distributionInfo: {
      expectedDistribution: string
      observedMean: number
      observedStd: number
      expectedMean: number
      expectedStd: number
    }
  }>(1, 'ks_test_one_sample', { values })

  return {
    testType: 'one-sample',
    variable1: variable,
    statisticKS: result.statisticKS,
    pValue: result.pValue,
    criticalValue: result.criticalValue,
    significant: result.significant,
    interpretation: result.significant
      ? '데이터가 정규분포를 따르지 않는 것으로 보임'
      : '데이터가 정규분포를 따르는 것으로 보임',
    sampleSizes: result.sampleSizes,
    distributionInfo: result.distributionInfo
  }
}, [])
```

3. **calculateTwoSampleKS 함수 변경** (Lines 187-261):
```typescript
// Before
const calculateTwoSampleKS = useCallback(async (
  values1: number[],
  values2: number[],
  variable1: string,
  variable2: string,
  pyodide: PyodideInterface
): Promise<KSTestResult> => {
  // ... pyodide.runPythonAsync() 사용
}

// After
const calculateTwoSampleKS = useCallback(async (
  values1: number[],
  values2: number[],
  variable1: string,
  variable2: string
): Promise<KSTestResult> => {
  const pyodideCore = PyodideCoreService.getInstance()
  const result = await pyodideCore.callWorkerMethod<{
    testType: string
    statisticKS: number
    pValue: number
    criticalValue: number
    significant: boolean
    effectSize: number
    sampleSizes: { n1: number; n2: number }
  }>(1, 'ks_test_two_sample', { values1, values2 })

  return {
    testType: 'two-sample',
    variable1,
    variable2,
    statisticKS: result.statisticKS,
    pValue: result.pValue,
    criticalValue: result.criticalValue,
    significant: result.significant,
    interpretation: result.significant
      ? '두 집단의 분포가 유의하게 다름'
      : '두 집단의 분포가 유의하게 다르지 않음',
    effectSize: result.effectSize,
    sampleSizes: result.sampleSizes
  }
}, [])
```

4. **calculateKSTest 함수 변경** (Lines 263-302):
```typescript
// Before
const calculateKSTest = useCallback(async (
  data: DataRow[],
  variable1: string,
  variable2: string | undefined,
  pyodide: PyodideInterface
): Promise<KSTestResult> => {
  // ...
}

// After
const calculateKSTest = useCallback(async (
  data: DataRow[],
  variable1: string,
  variable2: string | undefined
): Promise<KSTestResult> => {
  const values1 = data
    .map(row => row[variable1])
    .filter((val): val is number => typeof val === 'number' && !isNaN(val))

  if (variable2) {
    const values2 = data
      .map(row => row[variable2])
      .filter((val): val is number => typeof val === 'number' && !isNaN(val))
    return calculateTwoSampleKS(values1, values2, variable1, variable2)
  } else {
    return calculateOneSampleKS(values1, variable1)
  }
}, [calculateOneSampleKS, calculateTwoSampleKS])
```

5. **runAnalysis 함수 변경** (Lines 283-302):
```typescript
// Before
const runAnalysis = useCallback(async (variables: KSTestVariables) => {
  if (!uploadedData) return

  try {
    actions.startAnalysis()

    // Pyodide 로딩 (scipy 패키지 포함)
    const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])

    const variable2 = variables.variables.length > 1 ? variables.variables[1] : undefined
    const result = await calculateKSTest(uploadedData.data, variables.variables[0], variable2, pyodide)

    actions.completeAnalysis(result, 3)
  } catch (error) {
    console.error('K-S 검정 분석 중 오류:', error)
    const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    actions.setError(errorMessage)
  }
}, [uploadedData, calculateKSTest, actions])

// After
const runAnalysis = useCallback(async (variables: KSTestVariables) => {
  if (!uploadedData) return

  try {
    actions.startAnalysis()

    const variable2 = variables.variables.length > 1 ? variables.variables[1] : undefined
    const result = await calculateKSTest(uploadedData.data, variables.variables[0], variable2)

    actions.completeAnalysis(result, 3)
  } catch (error) {
    console.error('K-S 검정 분석 중 오류:', error)
    const errorMessage = error instanceof Error ? error.message : '분석 중 오류가 발생했습니다.'
    actions.setError(errorMessage)
  }
}, [uploadedData, calculateKSTest, actions])
```

---

### Step 2: mann-kendall 페이지 PyodideCore 변환 (15분)

**파일**: `statistical-platform/app/(dashboard)/statistics/mann-kendall/page.tsx`

**변환 작업**:

1. **Import 변경**:
```typescript
// Before
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import type { PyodideInterface } from '@/types/pyodide'

// After
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
```

2. **runAnalysis 함수 변경**:
```typescript
// Before - pythonCode를 pyodide.runPythonAsync()로 실행

// After
const runAnalysis = useCallback(async () => {
  if (!uploadedData || !selectedVariables?.variables?.[0]) {
    setError('데이터나 변수가 선택되지 않았습니다.')
    return
  }

  onAnalysisStart()
  setIsLoading(true)
  setError(null)

  try {
    const variableName = selectedVariables.variables[0]
    const data = uploadedData.data
      .map(row => row[variableName])
      .filter((val): val is number => typeof val === 'number' && !isNaN(val))

    const pyodideCore = PyodideCoreService.getInstance()
    await pyodideCore.initialize()

    const result = await pyodideCore.callWorkerMethod<{
      trend: string
      tau: number
      zScore: number
      pValue: number
      senSlope: number
      intercept: number
      n: number
    }>(1, 'mann_kendall_test', { data })

    const typedResult: MannKendallResult = {
      trend: result.trend,
      tau: result.tau,
      zScore: result.zScore,
      pValue: result.pValue,
      senSlope: result.senSlope,
      intercept: result.intercept,
      n: result.n
    }

    setResult(typedResult)
    onAnalysisComplete(typedResult)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
    setError(errorMsg)
    onError(errorMsg)
  } finally {
    setIsLoading(false)
  }
}, [selectedTest, uploadedData, selectedVariables, onAnalysisStart, onAnalysisComplete, onError])
```

---

### Step 3: TypeScript 검증 및 커밋 (10분)

```bash
cd statistical-platform && npx tsc --noEmit
```

커밋 메시지:
```
feat(phase9-batch2): ks-test, mann-kendall 페이지 PyodideCore 변환 완료

변경 내역:
- app/(dashboard)/statistics/ks-test/page.tsx
  - Legacy Pyodide → PyodideCore Worker 1
  - calculateOneSampleKS, calculateTwoSampleKS 함수 변환
  - ks_test_one_sample, ks_test_two_sample 메서드 사용

- app/(dashboard)/statistics/mann-kendall/page.tsx
  - Legacy Pyodide → PyodideCore Worker 1
  - runAnalysis 함수 변환
  - mann_kendall_test 메서드 사용

검증 결과:
- TypeScript 에러: 0개
- PyodideCore: 22 → 24개 (54%)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔜 나머지 4개 페이지 (별도 세션 필요)

### Phase 2: Worker 2 메서드 구현 필요

**파일**: `statistical-platform/public/workers/python/worker2-regression-anova.py`

#### 1. means-plot (Worker 1 또는 Worker 2)

**복잡도**: ⭐⭐ (중간)

**필요한 메서드**:
```python
def means_plot_data(data: List[List[float]]) -> Dict:
    """
    대응표본 평균 플롯 데이터 생성
    """
    # pingouin 또는 numpy 사용
    # 출력: means, stds, cis 등
```

**변환 작업**:
- Python 코드 확인 필요
- 플롯 데이터만 반환하는 간단한 메서드일 수 있음

---

#### 2. partial-correlation (Worker 2)

**복잡도**: ⭐⭐ (중간)

**필요한 메서드**:
```python
def partial_correlation(x: List[float], y: List[float], covar: List[List[float]]) -> Dict:
    """
    편상관 분석
    """
    import pingouin as pg
    # pg.partial_corr() 사용
    # 출력: r, pValue, ci95_lower, ci95_upper
```

**변환 작업**:
- pingouin.partial_corr() 래핑
- 다변량 공변량 처리

---

#### 3. response-surface (Worker 2)

**복잡도**: ⭐⭐⭐ (높음)

**필요한 메서드**:
```python
def response_surface_fit(x1: List[float], x2: List[float], y: List[float]) -> Dict:
    """
    반응표면 분석 (2차 회귀 모델)
    """
    from scipy.optimize import curve_fit
    # 2차 함수 피팅
    # 출력: coefficients, r_squared, predictions
```

**변환 작업**:
- scipy.optimize.curve_fit() 사용
- 2차 회귀 모델 정의
- 격자 데이터 생성 (3D 플롯용)

---

#### 4. stepwise (Worker 2)

**복잡도**: ⭐⭐⭐⭐ (매우 높음)

**필요한 메서드**:
```python
def stepwise_regression(X: List[List[float]], y: List[float], method: str = 'forward') -> Dict:
    """
    단계적 회귀분석 (Forward/Backward/Stepwise)
    """
    import statsmodels.api as sm
    # 반복적으로 변수 추가/제거
    # 출력: selected_variables, coefficients, r_squared, aic, bic
```

**변환 작업**:
- statsmodels.api.OLS 반복 사용
- Forward/Backward/Stepwise 알고리즘 구현
- AIC/BIC 기반 변수 선택
- 가장 복잡한 작업 (1-2시간 소요)

---

## 🎯 전체 진행 상황

### 완료 (2024-11-13):
- ✅ Batch 1: 4개 페이지 (friedman, kruskal-wallis, reliability, wilcoxon)
- ✅ Batch 2 Phase 1: Worker 1 메서드 2개 (ks_test, mann_kendall_test)

### 다음 세션 (예상 1.5시간):
- ⏳ Batch 2 Phase 2: ks-test, mann-kendall 페이지 변환 (45분)
- ⏳ Batch 2 Phase 3: Worker 2 메서드 4개 구현 시작 (45분)

### 이후 세션 (예상 3-4시간):
- ⏳ Batch 2 Phase 4: Worker 2 메서드 완성 + 4개 페이지 변환
- ⏳ Batch 3: JavaScript → PyodideCore (4개)
- ⏳ Batch 4: None → PyodideCore (10개)

---

## 📝 주의사항

1. **PyodideCore 패턴 유지**:
   - `PyodideCoreService.getInstance()`
   - `await pyodideCore.initialize()`
   - `callWorkerMethod<T>(workerNum, methodName, params)`

2. **타입 안전성**:
   - 제네릭 타입 명시
   - Python 반환값과 TypeScript 인터페이스 일치

3. **에러 처리**:
   - try-catch 사용
   - actions.completeAnalysis() 필수

4. **검증**:
   - npx tsc --noEmit (TypeScript)
   - node scripts/test-statistics-pages.js (자동 검증)

---

**작성 완료**: 2025-11-13
**다음 작업**: ks-test, mann-kendall 페이지 PyodideCore 변환
