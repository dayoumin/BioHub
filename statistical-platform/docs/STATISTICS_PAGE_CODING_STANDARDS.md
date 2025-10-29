# Statistics Page Coding Standards

**목적**: 45개 통계 분석 페이지의 코드 일관성 유지 및 유지보수성 향상

**적용 범위**: `app/(dashboard)/statistics/*/page.tsx` (45개 통계 분석 페이지)

**히스토리**:
- 2025-10-29: 문서 최초 작성 (Pattern B → useStatisticsPage hook 전환 완료)
- 2025-10-29: 버전 1.1 - 미래 지향적 표준으로 업데이트 (전환 용어 제거)

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

### 표준 패턴

```typescript
import { useCallback } from 'react'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

const runAnalysis = useCallback(async (params: AnalysisParams) => {
  // 1. Early return (null 체크)
  if (!uploadedData) return

  // 2. 분석 시작 (isAnalyzing = true)
  actions.startAnalysis()

  // 3. setTimeout으로 UI 업데이트 먼저 반영
  setTimeout(async () => {  // ← async 필요 시에만 (Pyodide 로드 시)
    try {
      // 4. Pyodide 로딩 (함수 내부에서 직접 로드 - 권장)
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
  }, 100)  // 100ms delay (Phase 1 패턴 일관성)
}, [uploadedData, actions])  // 8. 의존성 배열
```

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

**이유**:
- Pyodide는 분석할 때만 로드하면 충분 (초기 로딩 불필요)
- useState + useEffect는 불필요한 복잡도 증가
- 메모리 누수 위험 감소 (함수 스코프로 관리)

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

### setTimeout이 필요한 이유

1. **UI 반응성**: `actions.startAnalysis()` 호출 후 즉시 UI 업데이트 필요
2. **일관성**: Phase 1 (ks-test, power-analysis) 패턴과 통일
3. **Event Loop 양보**: 무거운 계산 전 UI 렌더링 우선

**참고**: `async` 함수에서는 `await`가 자동으로 Event Loop를 양보하지만, **일관성**을 위해 setTimeout 사용을 권장합니다.

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

## 5. useCallback 사용 (권장)

### 모든 이벤트 핸들러에 useCallback 적용

```typescript
// ✅ 권장
const handleDataUpload = useCallback((data, columns) => {
  // ...
}, [actions])

const handleVariablesSelected = useCallback((variables) => {
  // ...
}, [actions, runAnalysis])

const runAnalysis = useCallback(async (params) => {
  // ...
}, [uploadedData, actions])
```

### 의존성 배열 규칙

| 함수 | 의존성 배열 |
|-----|-----------|
| `handleDataUpload` | `[actions]` |
| `handleVariablesSelected` | `[actions, runAnalysis]` |
| `runAnalysis` | `[uploadedData, actions]` |

**참고**: `actions`는 useStatisticsPage에서 `useCallback`으로 메모이제이션되어 있으므로 안정적입니다.

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
- [ ] `setTimeout(100ms)` 패턴 적용 (일관성)
- [ ] Pyodide 로드 방식: 함수 내부 직접 로드 (useState + useEffect 금지)
- [ ] `any` 타입 사용 금지 (unknown + 타입 가드 사용)
- [ ] TypeScript 컴파일 에러 0개
- [ ] 테스트 작성 및 통과

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

  it('should use setTimeout pattern (100ms)', () => {
    expect(fileContent).toMatch(/setTimeout\(.*100\)/)
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

**Updated**: 2025-10-29
**Version**: 1.1
**Status**: Active (모든 신규 통계 페이지 작성 시 필수 준수)
