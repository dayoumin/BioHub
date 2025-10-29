# Statistics Page Coding Standards

**목적**: 45개 통계 분석 페이지의 코드 일관성 유지 및 유지보수성 향상

**적용 범위**: `app/(dashboard)/statistics/*/page.tsx` (45개 통계 분석 페이지)

**히스토리**:
- 2025-10-29: 문서 최초 작성 (Pattern B → useStatisticsPage hook 전환 완료)
- 2025-10-29: 버전 1.1 - 미래 지향적 표준으로 업데이트 (전환 용어 제거)
- 2025-10-29: 버전 1.2 - **치명적 오류 수정**: actions 안정성 (useMemo 적용)
- 2025-10-29: 버전 1.3 - **기술적 정확성 개선**: 메모리 누수 주장 제거, setTimeout 선택 사항 명시

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
**Version**: 1.3
**Status**: Active (모든 신규 통계 페이지 작성 시 필수 준수)

**Breaking Change (v1.2)**:
- use-statistics-page.ts Hook 수정: actions를 useMemo로 안정화
- 기존 코드 호환: Phase 1-2 페이지 동작 변경 없음 (개선만)

**Technical Accuracy Update (v1.3)**:
- 메모리 누수 주장 제거: pyodide-loader는 싱글톤 캐시 제공
- setTimeout 선택 사항 명시: React 18/Next 15에서는 기술적으로 불필요
- Pyodide 초기화 장점 재정의: "로딩 시점 제어" + "코드 가독성"
