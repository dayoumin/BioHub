# Statistics Coding Standards

**목적**: 통계 모듈의 일관된 코드 품질 및 유지보수성 확보

**적용 범위**:
- 통계 페이지: `app/(dashboard)/statistics/*/page.tsx` (45개)
- 타입 정의: `types/statistics.ts`
- 타입 변환: `types/statistics-converters.ts`
- 변수 요구사항: `lib/statistics/variable-requirements.ts`
- 공통 컴포넌트: `components/statistics/common/`

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

  // 2. 분석 시작 (isAnalyzing = true로 설정)
  actions.startAnalysis()

  // 3. 비동기 분석 실행
  try {
    // Pyodide 로딩 (함수 내부에서 직접 로드)
    const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'pandas', 'scipy'])

    // 분석 실행
    pyodide.globals.set('data', uploadedData.data)
    const result = pyodide.runPython(pythonCode)

    // ✅ 결과 저장 및 상태 완전 리셋
    actions.completeAnalysis(result.toJs(), nextStepNumber)
  } catch (err) {
    actions.setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
  }
}, [uploadedData, actions])
```

**중요**:
- React 18 automatic batching이 UI 업데이트를 자동 처리하므로 setTimeout 불필요
- ⚠️ **Critical**: `actions.setResults()` 대신 `actions.completeAnalysis()` 필수 사용 (아래 섹션 참조)

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

**주의사항**:
- `onBack` 사용 (onPrevious 아님)
- **methodId는 반드시 kebab-case 형식 사용** (variable-requirements.ts의 ID와 정확히 일치)

### methodId 명명 규칙 (Critical)

**발견일**: 2025-11-06
**심각도**: Critical - "데이터를 불러올 수 없습니다" 에러 발생

#### 올바른 methodId 형식

```typescript
// ✅ 올바른 형식: kebab-case (variable-requirements.ts와 일치)
<VariableSelector methodId="one-way-anova" ... />
<VariableSelector methodId="chi-square-goodness" ... />
<VariableSelector methodId="kolmogorov-smirnov" ... />
<VariableSelector methodId="pearson-correlation" ... />
<VariableSelector methodId="descriptive-stats" ... />
<VariableSelector methodId="discriminant-analysis" ... />

// ❌ 잘못된 형식: underscore, camelCase
<VariableSelector methodId="chi_square_goodness" ... />  // 언더스코어
<VariableSelector methodId="kolmogorovSmirnov" ... />    // camelCase
<VariableSelector methodId="correlation" ... />          // 불완전한 ID
```

#### methodId 검증 방법

1. **variable-requirements.ts 확인**
   ```typescript
   // lib/statistics/variable-requirements.ts
   export const STATISTICAL_METHOD_REQUIREMENTS: StatisticalMethodRequirements[] = [
     { id: 'one-way-anova', ... },        // ← 이 ID를 사용
     { id: 'chi-square-goodness', ... },  // ← 이 ID를 사용
     // ...
   ]
   ```

2. **VariableSelector는 이 ID로 요구사항을 조회**
   ```typescript
   const methodRequirements = getMethodRequirements(methodId)
   if (!methodRequirements) {
     // ❌ "데이터를 불러올 수 없습니다" 에러 발생!
   }
   ```

#### 일반적인 매핑 예시

| 페이지 디렉토리 | 올바른 methodId | 잘못된 예시 |
|---------------|----------------|------------|
| chi-square-goodness | `chi-square-goodness` | `chi_square_goodness` |
| chi-square-independence | `chi-square-independence` | `chi_square_independence` |
| ks-test | `kolmogorov-smirnov` | `kolmogorovSmirnov` |
| correlation | `pearson-correlation` | `correlation` |
| descriptive | `descriptive-stats` | `descriptive` |
| discriminant | `discriminant-analysis` | `discriminant` |
| explore-data | `explore-data` | `explore_data` |
| kruskal-wallis | `kruskal-wallis` | `kruskal_wallis` |
| mann-whitney | `mann-whitney` | `mann_whitney` |
| poisson | `poisson-regression` | `poisson` |
| proportion-test | `one-sample-proportion` | `proportion-test` |
| runs-test | `runs-test` | `runsTest` |
| stepwise | `stepwise-regression` | `stepwise` |
| wilcoxon | `wilcoxon-signed-rank` | `wilcoxon_signed_rank` |

#### 디버깅

methodId 불일치로 인한 에러 발생 시:

1. 브라우저 콘솔에서 확인:
   ```javascript
   // VariableSelector가 null을 반환하면 methodId 불일치
   ```

2. variable-requirements.ts에서 정확한 ID 확인:
   ```bash
   grep "id:" lib/statistics/variable-requirements.ts
   ```

3. 모든 페이지의 methodId 검색:
   ```bash
   grep -r "methodId=" app/(dashboard)/statistics/*/page.tsx
   ```

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

## 8. 상태 전환 패턴 (Critical)

### ⚠️ isAnalyzing 버그 주의

**발견일**: 2025-10-29
**심각도**: Critical - 버튼 영구 비활성화

#### 잘못된 패턴 (버그)

```typescript
// ❌ 절대 금지: setResults() 사용
const runAnalysis = useCallback(async (params) => {
  actions.startAnalysis()  // isAnalyzing = true

  try {
    const results = calculateResults()

    // ❌ BUG: isAnalyzing이 true로 고정됨!
    actions.setResults(results)

    // 결과: 버튼이 "분석 중..." 상태로 잠김
    // 사용자가 재분석을 실행할 수 없음
  } catch (err) {
    actions.setError('분석 중 오류')
  }
}, [actions])
```

#### 올바른 패턴

```typescript
// ✅ 필수: completeAnalysis() 사용
const runAnalysis = useCallback(async (params) => {
  actions.startAnalysis()  // isAnalyzing = true

  try {
    const results = calculateResults()

    // ✅ 완전한 상태 전환 (결과 + isAnalyzing 리셋 + 단계 이동)
    actions.completeAnalysis(results, 3)

    // 결과: 버튼이 정상적으로 재활성화됨
  } catch (err) {
    actions.setError('분석 중 오류')
    // 에러 발생 시 isAnalyzing은 여전히 true이므로
    // setError가 자동으로 처리하거나, 수동으로 리셋 필요
  }
}, [actions])
```

#### 상태 전환 비교

| 메서드 | 결과 설정 | isAnalyzing 리셋 | 단계 이동 | 용도 |
|--------|----------|-----------------|----------|------|
| `setResults()` | ✅ | ❌ | ❌ | ⚠️ 사용 금지 |
| `completeAnalysis()` | ✅ | ✅ | ✅ | ✅ 분석 완료 시 사용 |

#### 상태 머신 다이어그램

```
정상 플로우:
idle → analyzing → completed → idle
       ↑          ↓            ↑
  startAnalysis() completeAnalysis()

버그 플로우:
idle → analyzing → [STUCK] ← setResults()로 인한 버그
       ↑
  startAnalysis()
```

#### 영향받은 파일 (2025-10-29 수정 완료)

- [descriptive/page.tsx:168](../../app/(dashboard)/statistics/descriptive/page.tsx#L168)
- [anova/page.tsx:251](../../app/(dashboard)/statistics/anova/page.tsx#L251)
- [correlation/page.tsx:313](../../app/(dashboard)/statistics/correlation/page.tsx#L313)
- [regression/page.tsx:223](../../app/(dashboard)/statistics/regression/page.tsx#L223)
- [one-sample-t/page.tsx:132](../../app/(dashboard)/statistics/one-sample-t/page.tsx#L132)
- [normality-test/page.tsx:157](../../app/(dashboard)/statistics/normality-test/page.tsx#L157)

#### 상세 가이드

[TROUBLESHOOTING_ISANALYZING_BUG.md](./TROUBLESHOOTING_ISANALYZING_BUG.md) 참조

---

## 9. 에러 처리 (필수)

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

### 🚨 Critical: 상태 전환
- [ ] **`actions.completeAnalysis()` 사용** (`setResults()` 금지)
- [ ] `actions.startAnalysis()` 단일 호출 (이중 호출 금지)
- [ ] try-catch 에러 처리 추가
- [ ] 에러 시 `actions.setError()` 호출
- [ ] 브라우저 재분석 테스트 (버튼 재활성화 확인)

### 컴포넌트
- [ ] DataUploadStep: onUploadComplete + onNext 분리
- [ ] VariableSelector: `onBack` 사용
- [ ] **VariableSelector: methodId는 variable-requirements.ts와 정확히 일치** (kebab-case)
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

---

## 17. 변수 Role 매핑 규칙 (CRITICAL) 🚨

### 17.1 기본 원칙

**단일 진실 소스**: `variable-requirements.ts`의 `role` 필드가 `types/statistics.ts`의 인터페이스 필드명과 **정확히 일치**해야 합니다.

### 17.2 SPSS/R/SAS 표준 Role 매핑

| variable-requirements.ts | types/statistics.ts | ❌ 절대 금지 |
|-------------------------|---------------------|-------------|
| `role: 'factor'` | `factor: string[]` | `groups`, `independent` |
| `role: 'within'` | `within: string[]` | `conditions` |
| `role: 'covariate'` | `covariate: string[]` | `covariates` (복수형 금지) |
| `role: 'blocking'` | `blocking?: string[]` | `randomEffects` |

### 17.3 잘못된 예 (Critical 버그 발생)

```typescript
// ❌ 잘못된 예: variable-requirements.ts와 불일치
export interface MannWhitneyVariables {
  dependent: string
  groups: string[]  // ❌ variable-requirements.ts는 'factor'를 사용
}

export interface FriedmanVariables {
  dependent: string
  conditions: string[]  // ❌ variable-requirements.ts는 'within'을 사용
}

export interface ANCOVAVariables {
  dependent: string
  independent: string[]  // ❌ 'factor'를 사용해야 함
  covariates: string[]   // ❌ 'covariate' (단수형)를 사용해야 함
}
```

**문제점**:
- VariableSelector가 `factor` 키에 변수를 저장하지만, 페이지는 `groups`를 읽어 빈 배열 에러 발생
- Two-Way/Three-Way ANOVA에서 요인 변수를 읽지 못해 one-way로 강등됨

### 17.4 올바른 예

```typescript
// ✅ 올바른 예: variable-requirements.ts와 일치
export interface MannWhitneyVariables {
  dependent: string
  factor: string[]  // ✅ variable-requirements.ts의 role: 'factor'와 일치
}

export interface FriedmanVariables {
  dependent: string
  within: string[]  // ✅ variable-requirements.ts의 role: 'within'과 일치
}

export interface ANCOVAVariables {
  dependent: string
  factor: string[]      // ✅ role: 'factor'
  covariate: string[]   // ✅ role: 'covariate' (단수형)
}

export interface MixedModelVariables {
  dependent: string
  factor: string[]      // ✅ role: 'factor' (고정효과)
  blocking?: string[]   // ✅ role: 'blocking' (무선효과)
}
```

### 17.5 페이지 구현 시 주의사항

```typescript
// ✅ 올바른 변수 접근
const runAnalysis = useCallback(async (variables: MannWhitneyVariables) => {
  if (!variables.dependent || !variables.factor || variables.factor.length < 2) {
    actions.setError('최소 2개 그룹이 필요합니다.')
    return
  }

  const groupVar = variables.factor[0]  // ✅ factor 사용
  // ...
}, [actions])

// ❌ 잘못된 변수 접근
const runAnalysis = useCallback(async (variables: MannWhitneyVariables) => {
  const groupVar = variables.groups[0]  // ❌ groups는 존재하지 않음!
}, [actions])
```

### 17.6 검증 체크리스트

새 통계 페이지 추가 또는 수정 시:

- [ ] `variable-requirements.ts`에서 해당 메서드의 `role` 값 확인
- [ ] `types/statistics.ts`에서 인터페이스 필드명이 `role`과 정확히 일치하는지 확인
- [ ] 페이지 코드에서 변수 접근 시 올바른 필드명 사용
- [ ] TypeScript 컴파일 에러 없음
- [ ] 브라우저 테스트: 변수 선택 → 분석 실행 → 결과 확인

### 17.7 역사적 맥락

**문제 발견일**: 2025-11-06

**영향 범위**: 5개 통계 메서드
- ANOVA (Two-Way/Three-Way)
- MANOVA
- Mixed Model
- Mann-Whitney
- Friedman

**근본 원인**:
1. `variable-requirements.ts`는 SPSS/R/SAS 표준 용어 사용
2. `types/statistics.ts`는 일부 메서드에서 다른 용어 사용 (groups, conditions, covariates, independent)
3. VariableSelector는 `variable-requirements.ts` 기준으로 데이터 저장
4. 페이지는 `types/statistics.ts` 기준으로 데이터 읽기
5. → **불일치로 인한 빈 배열 에러 및 분석 실패**

---

## 18. 타입 중앙 정의 규칙 (CRITICAL) 🚨

### 18.1 기본 원칙

**모든 타입은 `types/statistics.ts`에만 정의**하고, 페이지에서는 import만 사용합니다.

### 18.2 잘못된 예

```typescript
// ❌ app/(dashboard)/statistics/mann-whitney/page.tsx
interface PostHocComparison {  // ❌ 페이지별 재정의 금지!
  group1: string
  group2: string
  pValue: number
}

// ❌ app/(dashboard)/statistics/anova/page.tsx
interface PostHocComparison {  // ❌ 다른 정의 (타입 파편화)
  comparison: string
  p_value: number  // ❌ 필드명도 다름!
}
```

**문제점**:
- 타입 정의가 4곳에 분산되어 일관성 없음
- 필드명 규칙 불일치 (camelCase vs snake_case)
- 수정 시 모든 파일 동시 수정 필요 → 버그 유발

### 18.3 올바른 예

```typescript
// ✅ types/statistics.ts (단일 정의)
export interface PostHocComparison {
  group1: string
  group2: string
  pValue: number      // ✅ camelCase 통일
  meanDiff: number
  ciLower: number
  ciUpper: number
}

// ✅ app/(dashboard)/statistics/mann-whitney/page.tsx
import type { PostHocComparison } from '@/types/statistics'

// ✅ app/(dashboard)/statistics/anova/page.tsx
import type { PostHocComparison } from '@/types/statistics'
```

### 18.4 검증 체크리스트

- [ ] 페이지 파일에서 `interface`, `type` 키워드로 타입 정의하지 않음
- [ ] `types/statistics.ts`에서 타입 import
- [ ] 필드명은 camelCase 사용 (pValue, ciLower, ciUpper)
- [ ] snake_case 절대 금지 (p_value, ci_lower ❌)

---

## 19. 공통 컴포넌트 사용 규칙

### 19.1 기본 원칙

통계 페이지에서 UI 일관성을 위해 **공통 컴포넌트를 우선 사용**합니다.

### 19.2 사용 가능한 공통 컴포넌트

| 컴포넌트 | 경로 | 용도 |
|---------|------|------|
| `StatisticsTable` | `components/statistics/common/StatisticsTable.tsx` | 결과 테이블 |
| `EffectSizeCard` | `components/statistics/common/EffectSizeCard.tsx` | 효과 크기 표시 |
| `StatisticalResultCard` | `components/statistics/common/StatisticalResultCard.tsx` | 통계 결과 카드 |
| `AssumptionTestCard` | `components/statistics/common/AssumptionTestCard.tsx` | 가정 검정 결과 |
| `ResultActionButtons` | `components/statistics/common/ResultActionButtons.tsx` | 결과 액션 버튼 |

### 19.3 잘못된 예

```typescript
// ❌ 모든 페이지가 <table> 직접 구현 (중복 코드)
<table className="min-w-full border">
  <thead>
    <tr>
      <th>Group 1</th>
      <th>Group 2</th>
      <th>p-value</th>
    </tr>
  </thead>
  <tbody>
    {results.map(row => (
      <tr key={row.id}>
        <td>{row.group1}</td>
        <td>{row.group2}</td>
        <td>{row.pValue}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 19.4 올바른 예

```typescript
// ✅ 공통 컴포넌트 사용
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'

<StatisticsTable
  columns={[
    { key: 'group1', label: 'Group 1' },
    { key: 'group2', label: 'Group 2' },
    { key: 'pValue', label: 'p-value', format: (v) => v.toFixed(4) }
  ]}
  data={results}
/>
```

### 19.5 장점

- ✅ UI 일관성 자동 유지
- ✅ 접근성 (ARIA) 자동 적용
- ✅ 반응형 디자인 자동 적용
- ✅ 코드 중복 제거
- ✅ 버그 수정 시 한 번만 수정

### 19.6 검증 체크리스트

- [ ] `<table>` 직접 사용하지 않음 (StatisticsTable 사용)
- [ ] 효과 크기 표시 시 EffectSizeCard 사용
- [ ] 통계 결과 카드 시 StatisticalResultCard 사용
- [ ] 필요한 공통 컴포넌트가 없을 경우 `components/statistics/common/`에 추가 후 재사용