# Pattern A Coding Standards

**목적**: 45개 통계 분석 페이지의 코드 일관성 유지 및 유지보수성 향상

**적용 범위**: `app/(dashboard)/statistics/*/page.tsx`

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

const runAnalysis = useCallback(async (params: AnalysisParams) => {
  // 1. Early return (null 체크)
  if (!uploadedData) return

  // 2. 분석 시작 (isAnalyzing = true)
  actions.startAnalysis()

  // 3. setTimeout으로 UI 업데이트 먼저 반영
  setTimeout(async () => {
    try {
      // 4. Pyodide 로딩 및 계산
      const pyodide = await loadPyodideWithPackages([...])

      // 5. 분석 실행
      const results = ...

      // 6. 결과 저장 및 다음 스텝 이동
      actions.completeAnalysis(results, nextStepNumber)
    } catch (err) {
      // 7. 에러 처리
      actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    }
  }, 100)  // 100ms delay (Phase 1 패턴 일관성)
}, [uploadedData, actions])  // 8. 의존성 배열
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

## 9. Import 순서 (권장)

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

// 4. Services
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'

// 5. UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
// ...

// 6. 아이콘
import { CheckCircle2, AlertCircle } from 'lucide-react'
```

---

## 10. 체크리스트

Pattern A 전환 시 확인 사항:

- [ ] `useStatisticsPage` hook import 및 사용
- [ ] `useState` 모두 제거
- [ ] `useCallback` 모든 이벤트 핸들러에 적용
- [ ] `setTimeout` 패턴 적용 (100ms)
- [ ] DataUploadStep props 중복 제거
- [ ] VariableSelector `onBack` 사용
- [ ] Steps 배열 `id`를 string으로 변경
- [ ] `any` 타입 모두 제거
- [ ] `withError: true` 설정 (에러 처리 필요 시)
- [ ] TypeScript 컴파일 에러 0개
- [ ] 테스트 작성 및 통과

---

## 11. 참고 예제

완벽한 Pattern A 구현 예제:

1. **ks-test**: `app/(dashboard)/statistics/ks-test/page.tsx`
2. **power-analysis**: `app/(dashboard)/statistics/power-analysis/page.tsx`
3. **means-plot**: `app/(dashboard)/statistics/means-plot/page.tsx`

---

## 12. 테스트 템플릿

```typescript
// __tests__/pages/method-name.test.tsx
import { describe, it, expect } from '@jest/globals'
import fs from 'fs'
import path from 'path'

describe('Method Name Page - Pattern A Conversion Test', () => {
  const filePath = path.join(__dirname, '../../app/(dashboard)/statistics/method-name/page.tsx')
  const fileContent = fs.readFileSync(filePath, 'utf-8')

  it('should use useStatisticsPage hook (Pattern A)', () => {
    expect(fileContent).toContain("import { useStatisticsPage } from '@/hooks/use-statistics-page'")
    expect(fileContent).toMatch(/const \{ state, actions \} = useStatisticsPage/)
  })

  it('should use actions.setCurrentStep instead of setCurrentStep', () => {
    expect(fileContent).not.toMatch(/const \[currentStep, setCurrentStep\] = useState/)
    expect(fileContent).toMatch(/actions\.setCurrentStep\(/)
  })

  // ... 추가 테스트
})
```

---

**Updated**: 2025-10-29
**Version**: 1.0
**Status**: Active
