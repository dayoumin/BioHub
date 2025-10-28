# API Reference

## 📚 목차

- [통계 서비스](#통계-서비스)
  - [PyodideStatisticsService](#pyodidestatisticsservice)
  - [StatisticalExecutor](#statisticalexecutor)
- [데이터 서비스](#데이터-서비스)
  - [DataValidationService](#datavalidationservice)
  - [LargeFileProcessor](#largefileprocessor)
- [보고서 서비스](#보고서-서비스)
  - [PDFReportService](#pdfreportservice)
  - [ExcelExportService](#excelexportservice)
- [상태 관리](#상태-관리)
  - [useSmartFlowStore](#usesmartflowstore)

---

## 통계 서비스

### PyodideStatisticsService

**경로**: `lib/services/pyodide-statistics.ts`

브라우저에서 Python 통계 패키지를 실행하는 핵심 서비스입니다.

#### 초기화

```typescript
const pyService = PyodideStatisticsService.getInstance()
await pyService.initialize()
```

#### 주요 메서드

##### `tTest(params)`
t-검정을 수행합니다.

```typescript
interface TTestParams {
  testType: 'one-sample' | 'independent' | 'paired'
  data1: number[]
  data2?: number[]
  mu?: number
  alternative?: 'two-sided' | 'greater' | 'less'
}

const result = await pyService.tTest({
  testType: 'independent',
  data1: [1, 2, 3, 4, 5],
  data2: [2, 3, 4, 5, 6]
})
// Returns: { statistic, pvalue, df, ci_lower, ci_upper, effect_size }
```

##### `anova(data, groups)`
일원분산분석을 수행합니다.

```typescript
const result = await pyService.anova(
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
  ['A', 'A', 'A', 'B', 'B', 'B', 'C', 'C', 'C']
)
// Returns: { f_statistic, pvalue, df_between, df_within, eta_squared }
```

##### `regression(x, y, method)`
회귀분석을 수행합니다.

```typescript
const result = await pyService.regression(
  [1, 2, 3, 4, 5],  // x
  [2, 4, 5, 4, 5],  // y
  'linear'
)
// Returns: { slope, intercept, r_value, p_value, std_err, r_squared }
```

##### `mannWhitneyU(data1, data2)`
Mann-Whitney U 검정을 수행합니다.

```typescript
const result = await pyService.mannWhitneyU(
  [1, 2, 3, 4, 5],
  [2, 3, 4, 5, 6]
)
// Returns: { statistic, pvalue }
```

### StatisticalExecutor

**경로**: `lib/services/executors/statistical-executor.ts`

통계 분석 실행을 관리하는 메인 컨트롤러입니다.

#### 사용 예시

```typescript
const executor = new StatisticalExecutor()

const result = await executor.execute({
  method: 'independentTTest',
  data: {
    samples: [[1, 2, 3], [4, 5, 6]],
    options: { alpha: 0.05 }
  }
})
```

#### 지원 메서드

| 카테고리 | 메서드명 | 설명 |
|---------|---------|------|
| 기술통계 | `descriptiveStats` | 평균, 중앙값, 표준편차 등 |
| | `normalityTest` | Shapiro-Wilk 정규성 검정 |
| | `leveneTest` | Levene 등분산 검정 |
| t-검정 | `oneSampleTTest` | 일표본 t-검정 |
| | `independentTTest` | 독립표본 t-검정 |
| | `pairedTTest` | 대응표본 t-검정 |
| | `welchTTest` | Welch t-검정 |
| ANOVA | `oneWayAnova` | 일원분산분석 |
| | `twoWayAnova` | 이원분산분석 |
| | `tukeyHSD` | Tukey HSD 사후검정 |
| | `gamesHowell` | Games-Howell 사후검정 |
| | `bonferroni` | Bonferroni 보정 |
| 회귀분석 | `linearRegression` | 단순선형회귀 |
| | `multipleRegression` | 다중회귀분석 |
| | `logisticRegression` | 로지스틱 회귀 |
| | `correlation` | 상관분석 |
| 비모수 | `mannWhitneyU` | Mann-Whitney U 검정 |
| | `wilcoxon` | Wilcoxon 부호순위 검정 |
| | `kruskalWallis` | Kruskal-Wallis 검정 |
| | `friedman` | Friedman 검정 |
| | `chiSquare` | 카이제곱 검정 |

---

## 데이터 서비스

### DataValidationService

**경로**: `lib/services/data-validation-service.ts`

데이터 품질 검증 및 분석을 담당합니다.

#### 주요 메서드

##### `performValidation(data)`
데이터 검증을 수행합니다.

```typescript
const validation = DataValidationService.performValidation(data)

interface ValidationResults {
  isValid: boolean
  totalRows: number
  totalColumns: number
  numericColumns: string[]
  categoricalColumns: string[]
  missingValues: { column: string; count: number; percentage: number }[]
  outliers: { column: string; count: number; values: number[] }[]
  dataTypes: { column: string; type: string; unique: number }[]
  recommendations: string[]
}
```

##### `getDataInfo(data)`
데이터 정보를 추출합니다.

```typescript
const info = DataValidationService.getDataInfo(data)
// Returns: { rows, columns, numeric, categorical, hasTarget }
```

##### `detectOutliers(values)`
이상치를 탐지합니다.

```typescript
const outliers = DataValidationService.detectOutliers([1, 2, 3, 100])
// Returns: { indices: [3], values: [100] }
```

### LargeFileProcessor

**경로**: `lib/services/large-file-processor.ts`

대용량 파일 처리를 담당합니다.

#### 사용 예시

```typescript
const processor = LargeFileProcessorService.getInstance()

// CSV 파일 처리
const data = await processor.processCSVInChunks(file, {
  chunkSize: 10000,
  onProgress: (progress) => console.log(`${progress}% 완료`)
})

// Excel 파일 처리
const data = await processor.processExcelInChunks(file, {
  sheetName: 'Sheet1',
  maxRows: 100000
})
```

---

## 보고서 서비스

### PDFReportService

**경로**: `lib/services/pdf-report-service.ts`

PDF 보고서 생성을 담당합니다.

#### 사용 예시

```typescript
await PDFReportService.generate(results, {
  title: '통계 분석 보고서',
  author: '연구자',
  includeCharts: true,
  includeRawData: false
})
```

### ExcelExportService

**경로**: `lib/services/excel-export-service.ts`

Excel 파일 내보내기를 담당합니다.

#### 사용 예시

```typescript
await ExcelExportService.export(results, {
  filename: 'analysis_results.xlsx',
  includeCharts: true,
  sheets: ['Summary', 'Data', 'Results']
})
```

---

## 상태 관리

### useSmartFlowStore

**경로**: `lib/stores/smart-flow-store.ts`

스마트 플로우의 전역 상태를 관리합니다.

#### 상태 구조

```typescript
interface SmartFlowState {
  // 현재 단계
  currentStep: number
  completedSteps: number[]

  // 데이터
  uploadedFile: File | null
  uploadedData: any[] | null
  validationResults: ValidationResults | null

  // 분석
  analysisPurpose: string
  selectedMethod: StatisticalMethod | null
  results: AnalysisResult | null

  // UI
  isLoading: boolean
  error: string | null
}
```

#### 사용 예시

```typescript
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

function MyComponent() {
  const {
    currentStep,
    goToNextStep,
    goToPreviousStep,
    setUploadedData,
    reset
  } = useSmartFlowStore()

  // 다음 단계로 이동
  const handleNext = () => {
    if (canProceedToNext()) {
      goToNextStep()
    }
  }

  // 상태 초기화
  const handleReset = () => {
    reset()
  }
}
```

#### 주요 액션

| 액션 | 설명 |
|-----|------|
| `goToNextStep()` | 다음 단계로 이동 |
| `goToPreviousStep()` | 이전 단계로 이동 |
| `navigateToStep(step)` | 특정 단계로 이동 |
| `setUploadedFile(file)` | 업로드 파일 설정 |
| `actions.setUploadedData(data)` | 데이터 설정 |
| `setValidationResults(results)` | 검증 결과 설정 |
| `setAnalysisPurpose(purpose)` | 분석 목적 설정 |
| `setSelectedMethod(method)` | 분석 방법 설정 |
| `setresults(results)` | 분석 결과 설정 |
| `actions.setError(error)` | 에러 설정 |
| `reset()` | 전체 상태 초기화 |

---

## 타입 정의

### 주요 타입

```typescript
// 데이터 행
interface DataRow {
  [key: string]: string | number | boolean | null
}

// 통계 검정 결과
interface StatisticalTestResult {
  statistic: number
  pvalue: number
  df?: number
  confidenceInterval?: {
    lower: number
    upper: number
    level: number
  }
  effectSize?: {
    value: number
    interpretation: string
  }
}

// 분석 결과
interface AnalysisResult {
  metadata: {
    method: string
    timestamp: string
    duration: number
    dataSize: number
  }
  mainResults: StatisticalTestResult
  additionalInfo?: {
    effectSize?: EffectSize
    postHoc?: PostHocResult[]
    assumptions?: AssumptionTest[]
  }
  visualizationData?: {
    type: ChartType
    data: any
    options?: ChartOptions
  }
}
```

---

## 에러 처리

모든 서비스는 일관된 에러 처리 패턴을 따릅니다:

```typescript
try {
  const result = await service.method(params)
  return result
} catch (error) {
  if (error instanceof StatisticsError) {
    // 통계 관련 에러
    console.error('Statistical error:', error.message)
  } else if (error instanceof ValidationError) {
    // 검증 에러
    console.error('Validation error:', error.message)
  } else {
    // 일반 에러
    console.error('Unexpected error:', error)
  }
  throw error
}
```

---

## 성능 최적화

### 메모이제이션
자주 사용되는 계산은 메모이제이션됩니다:

```typescript
import { memoize } from '@/lib/utils/memoize'

const memoizedCalculation = memoize(expensiveCalculation)
```

### Web Worker 사용
대용량 데이터 처리는 Web Worker에서 실행됩니다:

```typescript
const processor = new LargeFileProcessor()
processor.useWebWorker = true
```

### 청크 처리
대용량 데이터는 청크 단위로 처리됩니다:

```typescript
const options = {
  chunkSize: 10000,
  maxConcurrent: 4
}
```

---

*최종 업데이트: 2025-09-17*