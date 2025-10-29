# Statistics Page Coding Standards

**목적**: 45개 통계 분석 페이지의 일관된 코드 품질 및 유지보수성 확보

**적용 범위**: `app/(dashboard)/statistics/*/page.tsx` (모든 통계 분석 페이지)

---

## 1. useStatisticsPage Hook 사용 (필수)

### 기본 패턴

```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'

export default function StatisticsPage() {
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,
    withError: true
  })

  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state
  // ...
}
```

### Hook Options

| Option | Type | Default | 설명 |
|--------|------|---------|------|
| `withUploadedData` | boolean | false | UploadedData state 포함 여부 |
| `withError` | boolean | false | Error state 포함 여부 |
| `initialStep` | number | 0 | 초기 currentStep 값 |

---

## 2. 비동기 분석 함수 패턴 (필수)

```typescript
import { useCallback } from 'react'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

const runAnalysis = useCallback(async (params: AnalysisParams) => {
  // 1. Early return
  if (!uploadedData) return

  // 2. 분석 시작
  actions.startAnalysis()

  // 3. 비동기 분석 실행
  try {
    // Pyodide 로딩 (함수 내부에서 직접 로드)
    const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'pandas', 'scipy'])

    // 분석 실행
    pyodide.globals.set('data', uploadedData.data)
    const result = pyodide.runPython(pythonCode)

    // 결과 저장
    actions.completeAnalysis(result.toJs(), nextStepNumber)
  } catch (err) {
    actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
  }
}, [uploadedData, actions])
```

**중요**: React 18 automatic batching이 UI 업데이트를 자동 처리하므로 setTimeout 불필요

### Pyodide 초기화

**권장**: 함수 내부에서 직접 로드

```typescript
const runAnalysis = useCallback(async (params) => {
  const pyodide = await loadPyodideWithPackages([...])  // ← 함수 내부에서 로드
  // ...
}, [uploadedData, actions])
```

**피해야 할 패턴**: useState + useEffect

```typescript
// ❌ 불필요한 state 관리
const [pyodide, setPyodide] = useState(null)

useEffect(() => {
  // Pyodide 초기화...
}, [])
```

---

## 3. DataUploadStep 사용법 (필수)

```typescript
const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
  actions.setUploadedData({
    data: uploadedData as Record<string, unknown>[],
    fileName: 'uploaded-file.csv',
    columns: uploadedColumns
  })
}, [actions])

<DataUploadStep
  onUploadComplete={(_file, data) => handleDataUpload(data, Object.keys(data[0] || {}))}
  onNext={() => actions.setCurrentStep(nextStepNumber)}
/>
```

**주의**: onUploadComplete와 onNext를 분리하여 중복 호출 방지

---

## 4. VariableSelector 사용법 (필수)

```typescript
const handleVariablesSelected = useCallback((variables: unknown) => {
  if (!variables || typeof variables !== 'object') return

  actions.setSelectedVariables(variables as VariableType)
  actions.setCurrentStep(nextStepNumber)
  runAnalysis(variables as VariableType)
}, [actions, runAnalysis])

<VariableSelector
  methodId="method-name"
  data={uploadedData.data}
  onVariablesSelected={handleVariablesSelected}
  onBack={() => actions.setCurrentStep(previousStepNumber)}
/>
```

**주의**: `onBack` 사용 (onPrevious 아님)

---

## 5. useCallback 사용 (필수)

모든 이벤트 핸들러에 useCallback 적용:

```typescript
const handleDataUpload = useCallback((data, columns) => {
  actions.setUploadedData({ data, fileName: 'uploaded-file.csv', columns })
}, [actions])

const handleVariablesSelected = useCallback((variables) => {
  actions.setSelectedVariables(variables)
  actions.setCurrentStep(4)
  runAnalysis(variables)
}, [actions, runAnalysis])

const runAnalysis = useCallback(async (params) => {
  // ...
}, [uploadedData, actions])
```

**중요**: `actions` 객체는 useMemo로 메모이제이션되어 있으므로 의존성 배열에 안전

---

## 6. Steps 배열 정의

```typescript
const steps = [
  {
    id: 'intro',        // string 타입 (number 아님)
    number: 1,
    title: '분석 소개',
    description: '...',
    status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'upcoming'
  },
  // ...
] as const
```

---

## 7. 타입 안전성 (필수)

### any 타입 금지

```typescript
// ❌ 금지
const [data, setData] = useState<any[]>([])

// ✅ 권장
const { uploadedData } = state  // UploadedData | null
```

### 타입 가드 사용

```typescript
const handleVariablesSelected = (variables: unknown) => {
  if (!variables || typeof variables !== 'object') return
  const typedVariables = variables as VariableType
}
```

---

## 8. 에러 처리 (필수)

```typescript
try {
  const results = ...
  actions.completeAnalysis(results, stepNumber)
} catch (err) {
  actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
}
```

**Hook 옵션 설정**:

```typescript
const { state, actions } = useStatisticsPage<ResultType, VariableType>({
  withUploadedData: true,
  withError: true  // ← actions.setError() 사용 시 필수
})
```

---

## 9. Helper 함수 위치

컴포넌트 외부에 정의 (pure function):

```typescript
'use client'

// ✅ 컴포넌트 외부
function interpretCramersV(value: number): string {
  if (value < 0.1) return '매우 약함 (Very weak)'
  if (value < 0.3) return '약함 (Weak)'
  return '강함 (Strong)'
}

interface ChiSquareResult {
  statistic: number
  pValue: number
}

export default function StatisticsPage() {
  // 컴포넌트 내부...
}
```

---

## 10. Import 순서

```typescript
'use client'

// 1. React
import { useCallback } from 'react'

// 2. Components
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'

// 3. Hooks
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// 4. Services & Types
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

// 5. UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 6. Icons
import { CheckCircle2, AlertCircle } from 'lucide-react'
```

**참고**: 타입만 import 시 `import type` keyword 사용

---

## 11. 접근성 (필수)

### 데이터 테이블

```typescript
<table role="table" aria-label="통계 분석 결과">
  <thead>
    <tr>
      <th scope="col">변수명</th>
      <th scope="col">평균</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">{variableName}</th>
      <td>{mean.toFixed(2)}</td>
    </tr>
  </tbody>
</table>
```

### 로딩 상태

```typescript
{isAnalyzing && (
  <div role="status" aria-live="polite" aria-busy="true">
    <Loader2 className="animate-spin" />
    <span className="sr-only">분석 진행 중입니다...</span>
  </div>
)}
```

### 에러 메시지

```typescript
{error && (
  <Alert variant="destructive" role="alert" aria-live="assertive">
    <AlertCircle className="h-4 w-4" aria-hidden="true" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

## 12. 데이터 검증

### CSV 검증

```typescript
const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
  if (uploadedData.length === 0) {
    actions.setError('데이터가 비어있습니다.')
    return
  }

  if (uploadedColumns.length < 2) {
    actions.setError('최소 2개 이상의 열이 필요합니다.')
    return
  }

  actions.setUploadedData({
    data: uploadedData as Record<string, unknown>[],
    fileName: 'uploaded-file.csv',
    columns: uploadedColumns
  })
}, [actions])
```

### 통계 가정 검증

```typescript
const runAnalysis = useCallback(async (params: AnalysisParams) => {
  if (!uploadedData) return

  // 샘플 크기 검증
  if (uploadedData.data.length < 3) {
    actions.setError('최소 3개 이상의 관측치가 필요합니다.')
    return
  }

  // 변수 타입 검증
  const variable = uploadedData.data.map(row => row[params.variableName])
  const numericValues = variable.filter(v => typeof v === 'number' && !isNaN(v))

  if (numericValues.length === 0) {
    actions.setError('숫자형 변수가 필요합니다.')
    return
  }

  actions.startAnalysis()
  // ...
}, [uploadedData, actions])
```

---

## 13. 에러 메시지 표준

```typescript
const ERROR_MESSAGES = {
  NO_DATA: '데이터를 먼저 업로드해주세요.',
  INSUFFICIENT_SAMPLE: (required: number, actual: number) =>
    `최소 ${required}개의 관측치가 필요합니다. (현재: ${actual}개)`,
  INVALID_VARIABLE: (varName: string) =>
    `변수 "${varName}"가 유효하지 않습니다. 숫자형 변수를 선택해주세요.`,
  PYODIDE_LOAD_FAILED: 'Python 통계 엔진 로드 실패. 페이지를 새로고침해주세요.',
  ANALYSIS_FAILED: (reason: string) =>
    `분석 중 오류가 발생했습니다: ${reason}`
} as const
```

---

## 14. 구현 체크리스트

새 통계 페이지 작성 시 확인 사항:

### 필수 사항
- [ ] `useStatisticsPage` hook 사용
- [ ] `useCallback` 모든 이벤트 핸들러에 적용
- [ ] Pyodide 함수 내부 직접 로드
- [ ] `any` 타입 사용 금지
- [ ] TypeScript 컴파일 에러 0개
- [ ] 테스트 작성 및 통과

### 컴포넌트
- [ ] DataUploadStep: onUploadComplete + onNext 분리
- [ ] VariableSelector: `onBack` 사용
- [ ] Steps 배열: `id`는 string 타입
- [ ] Helper 함수: 컴포넌트 외부 정의

### 접근성
- [ ] 테이블에 `role="table"`, `aria-label` 추가
- [ ] 로딩에 `role="status"`, `aria-live="polite"` 추가
- [ ] 에러에 `role="alert"`, `aria-live="assertive"` 추가
- [ ] 장식용 아이콘에 `aria-hidden="true"` 추가

### 데이터 검증
- [ ] 샘플 크기 검증
- [ ] 변수 타입 검증
- [ ] 결측치 처리
- [ ] 명확한 에러 메시지

### Import
- [ ] `import type` keyword 사용
- [ ] Import 순서 준수

### Hook 옵션
- [ ] `withUploadedData: true` (필요 시)
- [ ] `withError: true` (필요 시)

---

## 15. 테스트 템플릿

```typescript
// __tests__/pages/method-name.test.tsx
import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('Method Name Page - Coding Standards Compliance', () => {
  const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/method-name/page.tsx')
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  it('should use useStatisticsPage hook', () => {
    expect(fileContent).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")
    expect(fileContent).toMatch(/const \{ state, actions \} = useStatisticsPage/)
  })

  it('should not use useState for state management', () => {
    expect(fileContent).not.toMatch(/const \[currentStep, setCurrentStep\] = useState/)
    expect(fileContent).not.toMatch(/const \[isAnalyzing, setIsAnalyzing\] = useState/)
  })

  it('should use actions methods', () => {
    expect(fileContent).toMatch(/actions\.(setCurrentStep|startAnalysis|completeAnalysis)/)
  })

  it('should not use any type', () => {
    expect(fileContent).not.toMatch(/:\s*any/)
    expect(fileContent).not.toMatch(/as any/)
  })

  it('should use import type keyword for types', () => {
    if (fileContent.includes('PyodideInterface')) {
      expect(fileContent).toMatch(/import type.*PyodideInterface/)
    }
  })
})
```

---

## 16. 참고 예제

코딩 표준을 준수하는 예제:

- **ks-test**: `app/(dashboard)/statistics/ks-test/page.tsx`
- **power-analysis**: `app/(dashboard)/statistics/power-analysis/page.tsx`
- **means-plot**: `app/(dashboard)/statistics/means-plot/page.tsx`