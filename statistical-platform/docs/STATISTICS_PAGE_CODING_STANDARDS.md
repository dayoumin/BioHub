# Statistics Page Coding Standards

**목적**: 45개 통계 분석 페이지의 코드 일관성 유지 및 유지보수성 향상

**적용 범위**: `app/(dashboard)/statistics/*/page.tsx` (45개 통계 분석 페이지)

**히스토리**:
- 2025-10-29: 문서 최초 작성 (Pattern B → useStatisticsPage hook 전환 완료)
- 2025-10-29: 버전 1.1 - 미래 지향적 표준으로 업데이트 (전환 용어 제거)
- 2025-10-29: 버전 1.2 - **치명적 오류 수정**: actions 안정성 (useMemo 적용)
- 2025-10-29: 버전 1.3 - **기술적 정확성 개선**: 메모리 누수 주장 제거, setTimeout 선택 사항 명시
- 2025-10-29: 버전 1.4 - **필수 표준 추가**: 접근성 (a11y), 데이터 검증, 에러 바운더리
- 2025-10-29: 버전 1.4.1 - setTimeout 문서 일관성 수정 (선택 vs 필수 통일)
- 2025-10-29: 버전 1.4.2 - **setTimeout 진짜 선택사항화**: 테스트 주석 처리, Pattern A/B 명확 구분

---

## 1. useStatisticsPage Hook 사용 (필수)

### 기본 패턴

```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'

export default function StatisticsPage() {
  // ✅ 권장: Generic 타입 명시
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,   // 데이터 업로드 필요 시
    withError: true            // 에러 state 필요 시
  })

  // ✅ State destructuring
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

### 표준 패턴 A: await만 사용 (권장 - 간결함)

```typescript
import { useCallback } from 'react'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

const runAnalysis = useCallback(async (params: AnalysisParams) => {
  // 1. Early return (null 체크)
  if (!uploadedData) return

  // 2. 분석 시작 (isAnalyzing = true, UI 업데이트)
  actions.startAnalysis()

  // 3. 비동기 분석 실행
  try {
    // 4. Pyodide 로딩 (함수 내부에서 직접 로드)
    const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'pandas', 'scipy'])

    // 5. 분석 실행
    pyodide.globals.set('data', uploadedData.data)
    const result = pyodide.runPython(pythonCode)

    // 6. 결과 저장 및 다음 스텝 이동
    actions.completeAnalysis(result.toJs(), nextStepNumber)
  } catch (err) {
    // 7. 에러 처리
    actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
  }
}, [uploadedData, actions])  // 8. 의존성 배열
```

**✅ 장점**:
- React 18 automatic batching이 자동으로 UI 업데이트 처리
- 코드가 간결하고 이해하기 쉬움
- setTimeout 불필요 (기술적으로 중복)

---

### 표준 패턴 B: setTimeout 사용 (선택 - Phase 1 일관성)

```typescript
const runAnalysis = useCallback(async (params: AnalysisParams) => {
  // 1. Early return (null 체크)
  if (!uploadedData) return

  // 2. 분석 시작 (isAnalyzing = true)
  actions.startAnalysis()

  // 3. setTimeout으로 UI 업데이트 명시적 우선 처리
  setTimeout(async () => {  // ← async 필요 시에만 (Pyodide 로드 시)
    try {
      // 4. Pyodide 로딩 (함수 내부에서 직접 로드)
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'pandas', 'scipy'])

      // 5. 분석 실행
      pyodide.globals.set('data', uploadedData.data)
      const result = pyodide.runPython(pythonCode)

      // 6. 결과 저장 및 다음 스텝 이동
      actions.completeAnalysis(result.toJs(), nextStepNumber)
    } catch (err) {
      // 7. 에러 처리
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, 100)  // 100ms delay
}, [uploadedData, actions])  // 8. 의존성 배열
```

**🎯 사용 이유**:
- Phase 1 패턴 일관성 (ks-test, power-analysis, means-plot 등)
- UI 업데이트 의도를 코드에 명시적으로 표현
- 팀 코딩 컨벤션 통일

### Pyodide 초기화 방법 (중요!)

**✅ 권장 (Phase 1-2 패턴)**: 함수 내부에서 직접 로드
```typescript
// ❌ useState로 pyodide 관리 불필요
// const [pyodide, setPyodide] = useState(null)

const runAnalysis = useCallback(async (params) => {
  // ...
  const pyodide = await loadPyodideWithPackages([...])  // ← 함수 내부에서 로드
  // ...
}, [uploadedData, actions])
```

**⚠️ 레거시 패턴** (16개 기존 페이지에서 사용, 변경 권장):
```typescript
// 이 패턴은 피하세요 (불필요한 state + useEffect)
const [pyodide, setPyodide] = useState(null)

useEffect(() => {
  let isMounted = true
  // Pyodide 초기화 로직...
  return () => { isMounted = false }
}, [])
```

**장점**:
- **로딩 시점 제어**: 분석 시점에 필요한 패키지만 로드 (초기 로딩 불필요)
- **코드 가독성**: 분석 로직과 초기화가 한 곳에 위치
- **useState + useEffect 불필요**: 불필요한 state 관리 제거

**참고**: `loadPyodideWithPackages()`는 싱글톤 캐시를 제공하므로, useState+useEffect 패턴도 메모리 누수는 발생하지 않습니다. 함수 내부 로드 패턴은 **로딩 시점 제어**와 **코드 가독성** 측면에서 권장됩니다.

### setTimeout 사용법 (두 가지 케이스)

**케이스 1: Pyodide 로드 필요 시** (async 함수):
```typescript
setTimeout(async () => {  // ← async 키워드 추가
  const pyodide = await loadPyodideWithPackages([...])
  // ...
}, 100)
```

**케이스 2: Pyodide 불필요 시** (동기 함수):
```typescript
setTimeout(() => {  // ← async 키워드 없음
  try {
    const result = calculateStatistics(uploadedData.data, variables)
    actions.completeAnalysis(result, 3)
  } catch (err) {
    actions.setError(err instanceof Error ? err.message : '오류')
  }
}, 100)
```

### setTimeout 사용 여부 (선택 사항)

**✅ 기술적 사실** (React 18/Next 15):
- `actions.startAnalysis()` 호출 후 `await loadPyodideWithPackages()`가 자동으로 렌더링을 플러시합니다
- setTimeout 없이도 UI 업데이트가 선행됩니다

**🎯 setTimeout 사용 이유** (일관성 목적):
1. **Phase 1 패턴과의 일관성**: ks-test, power-analysis, means-plot 등 기존 페이지와 통일
2. **명시적 의도 표현**: UI 업데이트 우선 처리 의도를 코드에 명확히 표현
3. **팀 코딩 컨벤션**: 45개 페이지 전체에서 동일한 패턴 사용

**⚠️ 선택 권장 사항**:
- **일관성 중시**: Phase 1-2 패턴 따라 setTimeout 사용
- **성능 최적화**: setTimeout 제거 후 await만 사용해도 무방
- **테스트 템플릿**: setTimeout 검증을 선택 사항으로 변경 가능

---

## 3. DataUploadStep 사용법 (필수)

### 표준 패턴

```typescript
// ✅ 권장: 데이터 업로드와 스텝 변경 분리
const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
  actions.setUploadedData({
    data: uploadedData as Record<string, unknown>[],
    fileName: 'uploaded-file.csv',
    columns: uploadedColumns
  })
  // Step 변경은 onNext에서 처리 (중복 방지)
}, [actions])

<DataUploadStep
  onUploadComplete={(_file, data) => handleDataUpload(data, Object.keys(data[0] || {}))}
  onNext={() => actions.setCurrentStep(nextStepNumber)}
/>
```

### 피해야 할 패턴 (중복 호출)

```typescript
// ❌ 잘못된 패턴: 중복 호출
const handleDataUpload = (data, columns) => {
  actions.setUploadedData(...)
  actions.setCurrentStep(3)  // ← 여기서 호출
}

<DataUploadStep
  onUploadComplete={handleDataUpload}
  onNext={() => actions.setCurrentStep(3)}  // ← 또 여기서 호출 (중복!)
/>
```

---

## 4. VariableSelector 사용법 (필수)

### 표준 패턴

```typescript
const handleVariablesSelected = useCallback((variables: unknown) => {
  // 타입 가드
  if (!variables || typeof variables !== 'object') return

  // 변수 저장
  actions.setSelectedVariables(variables as VariableType)

  // 다음 스텝 이동
  actions.setCurrentStep(nextStepNumber)

  // 분석 실행
  runAnalysis(variables as VariableType)
}, [actions, runAnalysis])

<VariableSelector
  methodId="method-name"
  data={uploadedData.data}
  onVariablesSelected={handleVariablesSelected}
  onBack={() => actions.setCurrentStep(previousStepNumber)}  // ✅ onBack 사용
/>
```

**주의**: `onPrevious`가 아니라 `onBack`을 사용합니다.

---

## 5. useCallback 사용 및 의존성 배열 (필수)

### 모든 이벤트 핸들러에 useCallback 적용

```typescript
// ✅ 권장: actions는 useMemo로 안정화되어 의존성 배열에 안전하게 사용 가능
const handleDataUpload = useCallback((data, columns) => {
  actions.setUploadedData({
    data: data as Record<string, unknown>[],
    fileName: 'uploaded-file.csv',
    columns
  })
}, [actions])

const handleVariablesSelected = useCallback((variables) => {
  actions.setSelectedVariables(variables)
  actions.setCurrentStep(4)
  runAnalysis(variables)
}, [actions, runAnalysis])

const runAnalysis = useCallback(async (params) => {
  if (!uploadedData) return
  actions.startAnalysis()

  // Pyodide 분석...
  actions.completeAnalysis(results, 4)
}, [uploadedData, actions])
```

### 의존성 배열 규칙

| 함수 | 의존성 배열 | 비고 |
|-----|-----------|------|
| `handleDataUpload` | `[actions]` | actions는 안정적 (useMemo) |
| `handleVariablesSelected` | `[actions, runAnalysis]` | 둘 다 안정적 |
| `runAnalysis` | `[uploadedData, actions]` | uploadedData는 state |

**✅ v1.2 업데이트 (2025-10-29)**:
- `actions` 객체는 useStatisticsPage 내부에서 **useMemo로 메모이제이션**되어 있습니다
- 의존성 배열에 안전하게 사용 가능 (무한 루프 없음)
- 이전 버전(v1.0-1.1)에서는 actions가 매 렌더 새로 생성되어 문제가 있었으나 **수정 완료**

---

## 6. Steps 배열 정의

### 표준 패턴

```typescript
const steps = [
  {
    id: 'intro',        // ✅ string 타입 (number 아님)
    number: 1,
    title: '분석 소개',
    description: '...',
    status: currentStep === 1 ? 'current' : currentStep > 1 ? 'complete' : 'upcoming'
  },
  {
    id: 'upload',
    number: 2,
    title: '데이터 업로드',
    description: '...',
    status: currentStep === 2 ? 'current' : currentStep > 2 ? 'complete' : 'upcoming'
  },
  // ...
] as const
```

**주의**: `id`는 **string 타입**이어야 합니다 (number 불가).

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
// ✅ 권장
const handleVariablesSelected = (variables: unknown) => {
  // 타입 가드
  if (!variables || typeof variables !== 'object') return

  // 타입 단언 (타입 가드 후)
  const typedVariables = variables as VariableType
}
```

---

## 8. 에러 처리 (필수)

### 표준 패턴

```typescript
try {
  // 분석 로직
  const results = ...
  actions.completeAnalysis(results, stepNumber)
} catch (err) {
  // ✅ 권장: instanceof Error 체크
  actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
}
```

### Hook 옵션 설정

```typescript
// ✅ withError: true 필수
const { state, actions } = useStatisticsPage<ResultType, VariableType>({
  withUploadedData: true,
  withError: true  // ← actions.setError() 사용하려면 필수
})

const { error } = state  // ← error state destructuring
```

---

## 9. Helper 함수 및 타입 정의 위치 (권장)

### Helper 함수 위치

```typescript
'use client'

// Imports...

// ✅ 권장: 컴포넌트 외부에 Helper 함수 정의
function interpretCramersV(value: number): string {
  if (value < 0.1) return '매우 약함 (Very weak)'
  if (value < 0.3) return '약함 (Weak)'
  if (value < 0.5) return '중간 (Moderate)'
  return '강함 (Strong)'
}

// 인터페이스 정의 (컴포넌트 외부)
interface ChiSquareResult {
  statistic: number
  pValue: number
  // ...
}

export default function StatisticsPage() {
  // 컴포넌트 내부...
}
```

**이유**:
- Helper 함수는 순수 함수 (pure function)로 컴포넌트 외부 정의
- 재렌더링 시 함수 재생성 방지
- 타입 정의도 컴포넌트 외부 (모듈 스코프)

---

## 10. Import 순서 (권장)

```typescript
'use client'

// 1. React 관련
import { useCallback } from 'react'

// 2. 컴포넌트
import { StatisticsPageLayout } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'

// 3. Hooks
import { useStatisticsPage } from '@/hooks/use-statistics-page'

// 4. Services & Types (type keyword 사용)
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

// 5. UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// ...

// 6. 아이콘
import { CheckCircle2, AlertCircle } from 'lucide-react'
```

**참고**: 타입만 import할 때는 `import type` keyword 사용

---

## 11. 구현 체크리스트

새 통계 페이지 작성 또는 리팩토링 시 확인 사항:

### 필수 사항
- [ ] `useStatisticsPage` hook 사용 (useState 직접 사용 금지)
- [ ] `useCallback` 모든 이벤트 핸들러에 적용
- [ ] Pyodide 로드 방식: 함수 내부 직접 로드 (useState + useEffect 금지)
- [ ] `any` 타입 사용 금지 (unknown + 타입 가드 사용)
- [ ] TypeScript 컴파일 에러 0개
- [ ] 테스트 작성 및 통과

### 선택 사항 (일관성 권장)
- [ ] `setTimeout(100ms)` 패턴 적용 (Phase 1 페이지와 일관성 유지)

### 컴포넌트 구조
- [ ] DataUploadStep: onUploadComplete + onNext 분리 (중복 방지)
- [ ] VariableSelector: `onBack` 속성 사용 (onPrevious 아님)
- [ ] Steps 배열: `id`는 string 타입
- [ ] Helper 함수: 컴포넌트 외부 정의 (pure function)
- [ ] 인터페이스: 컴포넌트 외부 정의 (모듈 스코프)

### Import 및 타입
- [ ] `import type` keyword 사용 (타입만 import 시)
- [ ] Import 순서 준수 (React → Components → Hooks → Services → UI → Icons)

### Hook 옵션
- [ ] `withUploadedData: true` (데이터 업로드 필요 시)
- [ ] `withError: true` (에러 처리 필요 시)

---

## 12. 참고 예제

이 코딩 표준을 완벽하게 준수하는 예제 페이지:

1. **ks-test**: `app/(dashboard)/statistics/ks-test/page.tsx`
   - 동기 분석 (Pyodide 불필요)
   - setTimeout 동기 함수 사용

2. **power-analysis**: `app/(dashboard)/statistics/power-analysis/page.tsx`
   - 비동기 분석 (Pyodide 로드)
   - Multiple tabs 구현

3. **means-plot**: `app/(dashboard)/statistics/means-plot/page.tsx`
   - 비동기 분석 (Pyodide 로드)
   - setTimeout async 함수 사용

---

## 13. 테스트 템플릿

```typescript
// __tests__/pages/method-name.test.tsx
import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('Method Name Page - Coding Standards Compliance Test', () => {
  const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/method-name/page.tsx')
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  it('should use useStatisticsPage hook', () => {
    expect(fileContent).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")
    expect(fileContent).toMatch(/const \{ state, actions \} = useStatisticsPage/)
  })

  it('should not use useState for page state management', () => {
    expect(fileContent).not.toMatch(/const \[currentStep, setCurrentStep\] = useState/)
    expect(fileContent).not.toMatch(/const \[isAnalyzing, setIsAnalyzing\] = useState/)
  })

  it('should use actions methods', () => {
    expect(fileContent).toMatch(/actions\.(setCurrentStep|startAnalysis|completeAnalysis)/)
  })

  // ⚠️ 선택 사항: setTimeout 패턴 검증 (Phase 1 일관성 유지 시에만 추가)
  // setTimeout 없이 await만 사용하는 경우 아래 테스트 전체를 제거하세요
  /*
  it('should use setTimeout pattern (100ms) for Phase 1 consistency', () => {
    expect(fileContent).toMatch(/setTimeout\(.*100\)/)
  })
  */

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

## 14. 접근성 (Accessibility) 표준

### 필수 aria 속성

#### 데이터 테이블
```typescript
// ✅ 권장: 통계 결과 테이블에 aria 속성 추가
<table role="table" aria-label="통계 분석 결과">
  <thead>
    <tr>
      <th scope="col">변수명</th>
      <th scope="col">평균</th>
      <th scope="col">표준편차</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">{variableName}</th>
      <td>{mean.toFixed(2)}</td>
      <td>{std.toFixed(2)}</td>
    </tr>
  </tbody>
</table>
```

#### 로딩 상태
```typescript
// ✅ 권장: 분석 중 aria-live로 상태 전달
{isAnalyzing && (
  <div role="status" aria-live="polite" aria-busy="true">
    <Loader2 className="animate-spin" />
    <span className="sr-only">분석 진행 중입니다...</span>
  </div>
)}
```

#### 에러 메시지
```typescript
// ✅ 권장: 에러 메시지에 role="alert"
{error && (
  <Alert variant="destructive" role="alert" aria-live="assertive">
    <AlertCircle className="h-4 w-4" aria-hidden="true" />
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### 키보드 네비게이션

```typescript
// ✅ 권장: 버튼은 자동으로 키보드 접근 가능 (tabIndex 불필요)
<Button onClick={handleAnalysis}>
  분석 시작
</Button>

// ⚠️ 커스텀 클릭 요소는 키보드 지원 필수
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  클릭 가능 영역
</div>
```

### 스크린 리더 지원

```typescript
// ✅ 권장: 장식용 아이콘은 aria-hidden
<CheckCircle className="h-4 w-4" aria-hidden="true" />

// ✅ 권장: 의미 있는 아이콘은 aria-label
<button aria-label="다운로드 CSV">
  <Download className="h-4 w-4" />
</button>

// ✅ 권장: 시각적으로 숨겨진 텍스트 (스크린 리더용)
<span className="sr-only">현재 단계: {currentStep}번</span>
```

---

## 15. 데이터 검증 (Data Validation) 표준

### CSV 파일 검증

```typescript
// ✅ 권장: DataUploadStep은 자동으로 검증 수행
// - 파일 크기 제한 (기본: 10MB)
// - CSV 형식 확인
// - 빈 파일 체크

const handleDataUpload = useCallback((uploadedData: unknown[], uploadedColumns: string[]) => {
  // 추가 검증 (optional)
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
// ✅ 권장: 분석 전 통계 가정 확인
const runAnalysis = useCallback(async (params: AnalysisParams) => {
  if (!uploadedData) return

  // 1. 샘플 크기 검증
  if (uploadedData.data.length < 3) {
    actions.setError('최소 3개 이상의 관측치가 필요합니다.')
    return
  }

  // 2. 변수 타입 검증
  const variable = uploadedData.data.map(row => row[params.variableName])
  const numericValues = variable.filter(v => typeof v === 'number' && !isNaN(v))

  if (numericValues.length === 0) {
    actions.setError('숫자형 변수가 필요합니다.')
    return
  }

  // 3. 결측치 경고 (optional)
  const missingCount = variable.length - numericValues.length
  if (missingCount > 0) {
    console.warn(`${missingCount}개의 결측치가 제거되었습니다.`)
  }

  actions.startAnalysis()
  // ... 분석 진행
}, [uploadedData, actions])
```

### 에러 메시지 표준

```typescript
// ✅ 권장: 명확하고 실행 가능한 에러 메시지
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

// 사용 예시
try {
  // ...
} catch (err) {
  if (err instanceof Error) {
    actions.setError(ERROR_MESSAGES.ANALYSIS_FAILED(err.message))
  } else {
    actions.setError('알 수 없는 오류가 발생했습니다.')
  }
}
```

---

## 16. 에러 바운더리 (Error Boundary) 표준

### Pyodide 로드 실패 처리

```typescript
// ✅ 권장: Pyodide 로드 시 명확한 에러 처리
const runAnalysis = useCallback(async (params: AnalysisParams) => {
  if (!uploadedData) return

  actions.startAnalysis()

  setTimeout(async () => {
    try {
      // Pyodide 로드 (타임아웃 처리는 pyodide-loader에서 자동 수행)
      const pyodide: PyodideInterface = await loadPyodideWithPackages([
        'numpy', 'pandas', 'scipy'
      ])

      // 분석 실행
      pyodide.globals.set('data', uploadedData.data)
      const result = pyodide.runPython(pythonCode)

      actions.completeAnalysis(result.toJs(), 4)
    } catch (err) {
      // Pyodide 로드 실패 vs 분석 실패 구분
      if (err instanceof Error) {
        if (err.message.includes('Failed to load Pyodide') ||
            err.message.includes('timeout')) {
          actions.setError(
            'Python 통계 엔진 로드 실패. 인터넷 연결을 확인하고 페이지를 새로고침해주세요.'
          )
        } else {
          actions.setError(`분석 중 오류: ${err.message}`)
        }
      } else {
        actions.setError('알 수 없는 오류가 발생했습니다.')
      }
    }
  }, 100)
}, [uploadedData, actions])
```

### 페이지 수준 에러 처리

```typescript
// ✅ 권장: 최상위 에러 핸들링 (페이지 크래시 방지)
export default function StatisticsPage() {
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,
    withError: true
  })
  const { error } = state

  // 치명적 에러 발생 시 전체 UI 대체
  if (error?.includes('치명적')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>오류 발생</AlertTitle>
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => window.location.reload()}
            >
              페이지 새로고침
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // 일반 에러는 StepCard 내부에서 표시
  return (
    <StatisticsPageLayout>
      {/* ... 일반 UI */}
    </StatisticsPageLayout>
  )
}
```

### 에러 복구 전략

```typescript
// ✅ 권장: 사용자가 에러에서 복구할 수 있도록 지원
{error && (
  <Alert variant="destructive" role="alert">
    <AlertCircle className="h-4 w-4" aria-hidden="true" />
    <AlertTitle>분석 오류</AlertTitle>
    <AlertDescription>
      <p>{error}</p>
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            actions.setError(null)
            actions.setCurrentStep(2) // 데이터 업로드 단계로 복귀
          }}
        >
          데이터 다시 업로드
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            actions.setError(null)
            actions.setCurrentStep(3) // 변수 선택 단계로 복귀
          }}
        >
          변수 다시 선택
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

---

## 17. 구현 체크리스트 (업데이트)

새 통계 페이지 작성 또는 리팩토링 시 확인 사항:

### 필수 사항
- [ ] `useStatisticsPage` hook 사용 (useState 직접 사용 금지)
- [ ] `useCallback` 모든 이벤트 핸들러에 적용
- [ ] Pyodide 로드 방식: 함수 내부 직접 로드 (useState + useEffect 금지)
- [ ] `any` 타입 사용 금지 (unknown + 타입 가드 사용)
- [ ] TypeScript 컴파일 에러 0개
- [ ] 테스트 작성 및 통과

### 선택 사항 (일관성 권장)
- [ ] `setTimeout(100ms)` 패턴 적용 (Phase 1 페이지와 일관성 유지)

### 접근성 (v1.4 추가)
- [ ] 데이터 테이블에 `role="table"`, `aria-label` 추가
- [ ] 로딩 상태에 `role="status"`, `aria-live="polite"` 추가
- [ ] 에러 메시지에 `role="alert"`, `aria-live="assertive"` 추가
- [ ] 장식용 아이콘에 `aria-hidden="true"` 추가
- [ ] 의미 있는 버튼에 `aria-label` 추가 (아이콘만 있는 경우)

### 데이터 검증 (v1.4 추가)
- [ ] 샘플 크기 최소 요구사항 확인 (통계 메서드별 상이)
- [ ] 변수 타입 검증 (숫자형/범주형 확인)
- [ ] 결측치 처리 (경고 또는 제거)
- [ ] 명확한 에러 메시지 제공 (실행 가능한 지침 포함)

### 에러 처리 (v1.4 추가)
- [ ] Pyodide 로드 실패 vs 분석 실패 구분
- [ ] 에러 복구 옵션 제공 (이전 단계로 복귀 버튼)
- [ ] 치명적 에러 시 페이지 수준 대체 UI 표시
- [ ] 사용자 친화적 에러 메시지 (기술 용어 최소화)

### 컴포넌트 구조
- [ ] DataUploadStep: onUploadComplete + onNext 분리 (중복 방지)
- [ ] VariableSelector: `onBack` 속성 사용 (onPrevious 아님)
- [ ] Steps 배열: `id`는 string 타입
- [ ] Helper 함수: 컴포넌트 외부 정의 (pure function)
- [ ] 인터페이스: 컴포넌트 외부 정의 (모듈 스코프)

### Import 및 타입
- [ ] `import type` keyword 사용 (타입만 import 시)
- [ ] Import 순서 준수 (React → Components → Hooks → Services → UI → Icons)

### Hook 옵션
- [ ] `withUploadedData: true` (데이터 업로드 필요 시)
- [ ] `withError: true` (에러 처리 필요 시)

---

**Updated**: 2025-10-29
**Version**: 1.4.2
**Status**: Active (모든 신규 통계 페이지 작성 시 필수 준수)

**Version History**:
- **v1.0** (2025-10-29): 문서 최초 작성 (Pattern B → useStatisticsPage hook 전환 완료)
- **v1.1** (2025-10-29): 미래 지향적 표준으로 업데이트 (전환 용어 제거)
- **v1.2** (2025-10-29): **치명적 오류 수정**: actions 안정성 (useMemo 적용)
- **v1.3** (2025-10-29): **기술적 정확성 개선**: 메모리 누수 주장 제거, setTimeout 선택 사항 명시
- **v1.4** (2025-10-29): **필수 표준 추가**: 접근성 (a11y), 데이터 검증, 에러 바운더리
- **v1.4.1** (2025-10-29): setTimeout 문서 일관성 수정 (선택 vs 필수 통일)
- **v1.4.2** (2025-10-29): **setTimeout 진짜 선택사항화**: 테스트 주석 처리, Pattern A/B 명확 구분

**Breaking Changes**:
- **v1.2**: use-statistics-page.ts Hook 수정 - actions를 useMemo로 안정화

**New Features (v1.4)**:
- 접근성 표준 (§14): aria 속성, 키보드 네비게이션, 스크린 리더 지원
- 데이터 검증 표준 (§15): CSV 검증, 통계 가정 확인, 에러 메시지 템플릿
- 에러 바운더리 표준 (§16): Pyodide 로드 실패 처리, 에러 복구 전략

**Improvements (v1.4.2)**:
- **Section 2**: Pattern A (await only) vs Pattern B (setTimeout) 명확 구분
- **Section 13**: 테스트 템플릿 주석 처리로 진짜 선택사항화 (setTimeout 없어도 테스트 통과)
- **일관성 완벽 확보**: 4곳 모두 setTimeout을 선택사항으로 명확히 표기
