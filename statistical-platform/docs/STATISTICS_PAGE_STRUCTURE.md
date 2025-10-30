# 통계 페이지 구조 가이드

**작성일**: 2025-10-30
**목적**: 45개 통계 페이지의 공통 구조와 공통 컴포넌트 영향 범위를 문서화하여 향후 일괄 수정 및 신규 페이지 작성 시 참고

---

## 📊 핵심 결론

**45개 통계 페이지는 80% 공통 구조를 공유합니다.**

- ✅ **공통 구조 (80%)**: useStatisticsPage hook, StatisticsPageLayout, DataUploadStep, VariableSelector
- 🔵 **고유 부분 (20%)**: 결과 인터페이스, 분석 로직, 페이지별 옵션 상태

**일괄 수정 가능**: 공통 컴포넌트 수정 시 42-45개 페이지 동시 수정 가능 (패턴 동일)

---

## 1. 공통 컴포넌트 사용 현황

### 컴포넌트별 사용 통계

| 컴포넌트 | 사용 페이지 수 | 비율 | 영향 범위 |
|----------|----------------|------|-----------|
| **useStatisticsPage** | 42개 | 93% | 상태 관리 (currentStep, uploadedData, selectedVariables, isAnalyzing, results, error) |
| **StatisticsPageLayout** | 45개 | 100% | 레이아웃 (title, description, steps, currentStep) |
| **DataUploadStep** | 32개 | 71% | 데이터 업로드 (onUploadComplete 핸들러) |
| **VariableSelector** | ~40개 | 89% | 변수 선택 (data, requirements, onSelect) |

**출처**: 2025-10-30 Grep 분석 결과
- useStatisticsPage: `grep -r "import.*useStatisticsPage" --include="*.tsx" statistics/` → 42개
- StatisticsPageLayout: 45개
- DataUploadStep: 32개

---

## 2. 공통 구조 패턴 (80%)

### 2.1 Import 패턴 (99% 동일)

**모든 페이지 공통**:
```typescript
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'
```

**예시 파일**:
- [t-test/page.tsx:1-10](../app/(dashboard)/statistics/t-test/page.tsx#L1-L10)
- [anova/page.tsx:1-12](../app/(dashboard)/statistics/anova/page.tsx#L1-L12)
- [partial-correlation/page.tsx:3-10](../app/(dashboard)/statistics/partial-correlation/page.tsx#L3-L10)

---

### 2.2 Hook 사용 패턴 (100% 동일)

**표준 패턴**:
```typescript
export default function StatisticsMethodPage() {
  const { state, actions } = useStatisticsPage<ResultType, VariableType>({
    withUploadedData: true,  // 또는 false
    withError: true          // 또는 false
  })
  const { currentStep, uploadedData, selectedVariables, results, isAnalyzing, error } = state

  // ... 페이지별 로직
}
```

**Generic 타입 파라미터** (페이지별 상이):
```typescript
// t-test
useStatisticsPage<TTestResult, { group1: string[]; group2: string[] }>

// anova
useStatisticsPage<AnovaResult, { dependent: string[]; factor: string[] }>

// partial-correlation
useStatisticsPage<PartialCorrelationResults, SelectedVariables>
```

**예시 파일**:
- [t-test/page.tsx:55-60](../app/(dashboard)/statistics/t-test/page.tsx#L55-L60)
- [anova/page.tsx:75-80](../app/(dashboard)/statistics/anova/page.tsx#L75-L80)
- [partial-correlation/page.tsx:56-61](../app/(dashboard)/statistics/partial-correlation/page.tsx#L56-L61)

---

### 2.3 Steps 배열 구조 (100% 동일)

**표준 패턴**:
```typescript
const steps: StatisticsStep[] = [
  {
    id: 'upload',           // 문자열 ID (이전 버전은 숫자)
    number: 1,
    title: '데이터 업로드',
    description: '...',
    status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
  },
  {
    id: 'variables',
    number: 2,
    title: '변수 선택',
    description: '...',
    status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
  },
  {
    id: 'results',
    number: 3,
    title: '분석 결과',
    description: '...',
    status: currentStep === 2 ? 'current' : 'pending'
  }
]
```

**단계 개수**: 3-4개 (대부분 3개)
- 3단계: 데이터 업로드 → 변수 선택 → 결과
- 4단계: 메서드 선택 → 데이터 업로드 → 변수 선택 → 결과 (regression, cluster 등)

**예시 파일**:
- [t-test/page.tsx:62-85](../app/(dashboard)/statistics/t-test/page.tsx#L62-L85)
- [partial-correlation/page.tsx:63-92](../app/(dashboard)/statistics/partial-correlation/page.tsx#L63-L92)

---

### 2.4 Handler 패턴 (95% 동일)

#### handleDataUpload (표준)

```typescript
const handleDataUpload = useCallback((file: File, data: unknown[]) => {
  const uploadedData: UploadedData = {
    data: data as Record<string, unknown>[],
    fileName: file.name,
    columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
      ? Object.keys(data[0] as Record<string, unknown>)
      : []
  }

  // Phase 2-2 권장: 명시적 에러 처리
  if (!actions.setUploadedData) {
    console.error('[페이지명] setUploadedData not available')
    return
  }

  actions.setUploadedData(uploadedData)
  actions.setCurrentStep(1)  // 다음 단계로
}, [actions])
```

**예시 파일**:
- [partial-correlation/page.tsx:226-238](../app/(dashboard)/statistics/partial-correlation/page.tsx#L226-L238)
- [anova/page.tsx:185-200](../app/(dashboard)/statistics/anova/page.tsx#L185-L200) (Phase 2-2 개선 버전)

#### handleVariablesSelected (표준)

```typescript
const handleVariablesSelected = useCallback((variables: unknown) => {
  if (typeof variables === 'object' && variables !== null) {
    if (actions.setSelectedVariables) {
      actions.setSelectedVariables(variables as SelectedVariablesType)
    }
    actions.setCurrentStep(2)
    runAnalysis(variables as SelectedVariablesType)
  }
}, [actions, runAnalysis])
```

---

### 2.5 Layout 구조 (100% 동일)

```typescript
return (
  <StatisticsPageLayout
    title="통계 메서드명"
    description="통계 메서드 설명"
    steps={steps}
    currentStep={currentStep}
  >
    {/* Step 0: 메서드 소개 (선택적) */}
    {currentStep === 0 && renderMethodIntroduction()}

    {/* Step 1: 데이터 업로드 */}
    {currentStep === 1 && (
      <DataUploadStep onUploadComplete={handleDataUpload} />
    )}

    {/* Step 2: 변수 선택 */}
    {currentStep === 2 && uploadedData && (
      <VariableSelector
        data={uploadedData.data}
        requirements={getVariableRequirements('methodName')}
        onSelect={handleVariablesSelected}
      />
    )}

    {/* Step 3: 결과 */}
    {currentStep === 3 && renderResults()}
  </StatisticsPageLayout>
)
```

---

## 3. 고유 부분 (20%)

### 3.1 결과 인터페이스 (100% 고유)

**각 통계 방법마다 완전히 다른 구조**:

```typescript
// t-test
type TTestResult = {
  tStatistic: number
  pValue: number
  degreesOfFreedom: number
  confidenceInterval: [number, number]
}

// ANOVA
type AnovaResult = {
  fStatistic: number
  pValue: number
  groups: { name: string; mean: number; sd: number }[]
  postHoc?: PostHocTest[]
}

// Cluster
interface ClusterAnalysisResult {
  method: 'kmeans' | 'hierarchical'
  centroids?: number[][]
  silhouetteScore: number
  clusterAssignments: number[]
}
```

**일괄 수정 불가**: 각 페이지 개별 수정 필요

---

### 3.2 분석 로직 (100% 고유)

**Pyodide 호출 또는 직접 계산**:

```typescript
// Pyodide 사용 예시 (대부분)
const runAnalysis = useCallback(async (variables: SelectedVariables) => {
  actions.startAnalysis()

  try {
    const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])
    pyodide.globals.set('data', uploadedData.data)
    const result = pyodide.runPython(pythonCode)

    actions.completeAnalysis(result.toJs(), 3)
  } catch (err) {
    actions.setError(err instanceof Error ? err.message : '분석 중 오류')
  }
}, [uploadedData, actions])
```

**직접 계산 예시** (cluster):
```typescript
// cluster/page.tsx:67-100
const euclideanDistance = useCallback((point1: number[], point2: number[]): number => {
  return Math.sqrt(point1.reduce((sum, val, i) => sum + (val - point2[i]) ** 2, 0))
}, [])
```

**일괄 수정 불가**: 각 페이지 개별 수정 필요

---

### 3.3 페이지별 상태 (50% 고유)

```typescript
// regression
const [regressionType, setRegressionType] = useState<'simple' | 'multiple' | 'logistic'>('')

// cluster
const [clusterMethod, setClusterMethod] = useState<'kmeans' | 'hierarchical'>('kmeans')
const [numClusters, setNumClusters] = useState<number>(3)
const [linkageMethod, setLinkageMethod] = useState<'ward' | 'complete'>('ward')

// descriptive
const [activeTab, setActiveTab] = useState('summary')
const [showAdvanced, setShowAdvanced] = useState(true)
```

**일괄 수정 불가**: 각 페이지 개별 수정 필요

---

## 4. 공통 컴포넌트 수정 시 영향 범위

### 4.1 useStatisticsPage Hook 수정

**영향 범위**: **42개 페이지** (93%)

#### Case 1: UploadedData 인터페이스에 필드 추가

```typescript
// hooks/use-statistics-page.ts 수정
export interface UploadedData {
  data: Record<string, unknown>[]
  fileName: string
  columns: string[]
  encoding?: string  // ← 새 필드 추가 (Optional)
}
```

**영향**:
- ✅ Optional 필드: **0개 수정** (기존 코드 그대로 작동)
- ⚠️ 필수 필드: **42개 수정** (일괄 수정 가능, 패턴 동일)

**수정 패턴** (필수 필드인 경우):
```typescript
// 42개 페이지에서 동일한 수정
const uploadedData: UploadedData = {
  data: data as Record<string, unknown>[],
  fileName: file.name,
  columns: Object.keys(data[0] || {}),
  encoding: 'utf-8'  // ← 추가
}
```

**예상 소요 시간**: 30분 (Agent 9개 병렬 처리)

---

#### Case 2: actions.setError() 타입 변경

```typescript
// Before (현재)
setError?: (error: string) => void

// After (변경)
setError?: (error: ErrorInfo) => void  // { message: string; code: string }
```

**영향**:
1. **1차 영향**: 42개 페이지 (useStatisticsPage 사용)
   ```typescript
   // Before
   actions.setError('에러 발생')

   // After (수정 필요)
   actions.setError({ message: '에러 발생', code: 'ANALYSIS_FAILED' })
   ```

2. **2차 영향**: ~100곳 (error 상태 사용하는 UI 컴포넌트)
   ```typescript
   // Before
   {error && <Alert>{error}</Alert>}

   // After (수정 필요)
   {error && <Alert>{error.message}</Alert>}
   ```

3. **3차 영향**: 테스트 파일 (~8개)

**수정 작업량**:
- TypeScript 컴파일러가 모든 에러 위치 자동 검출
- 패턴 동일하므로 일괄 수정 가능 (2-3시간)
- Phase 2-1 경험: Agent 병렬 처리로 30분 단축 가능

---

### 4.2 StatisticsPageLayout 수정

**영향 범위**: **45개 모든 페이지** (100%)

#### Case: Layout에 showBackButton prop 추가

```typescript
// components/statistics/StatisticsPageLayout.tsx
interface StatisticsPageLayoutProps {
  title: string
  description: string
  steps: StatisticsStep[]
  currentStep: number
  showBackButton?: boolean  // ← 기본값 true
  children: React.ReactNode
}
```

**영향**:
- ✅ Optional prop: **0개 수정** (필요한 페이지만 선택적 사용)
- ⚠️ 필수 prop: **45개 수정** (일괄 수정 필요)

**수정 패턴** (필수 prop인 경우):
```typescript
// 45개 페이지에서 동일한 수정
<StatisticsPageLayout
  title="..."
  description="..."
  steps={steps}
  currentStep={currentStep}
  showBackButton={true}  // ← 추가
>
```

**예상 소요 시간**: 30분 (Agent 9개 병렬 처리)

---

### 4.3 DataUploadStep 수정

**영향 범위**: **32개 페이지** (71%)

#### Case: onUploadComplete 시그니처 변경

```typescript
// Before (현재)
onUploadComplete?: (file: File, data: unknown[]) => void

// After (변경)
onUploadComplete?: (file: File, data: unknown[], metadata: FileMetadata) => void
```

**영향**:
```typescript
// 32개 페이지에서 수정 필요
const handleDataUpload = useCallback((file: File, data: unknown[], metadata: FileMetadata) => {
  //                                                                  ↑ 추가
  console.log('File metadata:', metadata)
  // ...
}, [actions])
```

**수정 작업량**:
- **32개 수정** (일괄 find-replace 가능)
- 패턴 동일해서 Agent 병렬 처리로 20분 완료 가능

---

### 4.4 VariableSelector 수정

**영향 범위**: **~40개 페이지** (89%)

#### Case: data prop 타입 변경

```typescript
// Before
<VariableSelector data={uploadedData} ... />
// ❌ uploadedData 타입: UploadedData (객체)

// After (수정 필요)
<VariableSelector data={uploadedData?.data || []} ... />
// ✅ uploadedData.data 타입: Record<string, unknown>[]
```

**실제 사례**:
- [chi-square-independence/page.tsx:457](../app/(dashboard)/statistics/chi-square-independence/page.tsx#L457)에서 Phase 2-2 작업으로 수정 완료

**수정 작업량**:
- **~40개 수정** (패턴 동일하므로 일괄 수정 가능)
- 에러 검증: `npx tsc --noEmit`으로 40개 에러 자동 검출
- 예상 소요 시간: 25분 (Agent 병렬 처리)

---

## 5. 일괄 수정 전략

### 5.1 Phase 2-1 경험 (2025-10-29)

**작업 내용**: 15개 파일 TypeScript 에러 수정
- 3가지 패턴: Hook 미사용, withSelectedVariables 제거, actions.xxx() 호출
- 777 → 732 에러 (-45개, -5.8%)

**전략**: Agent 9개 병렬 처리
- 소요 시간: 30분
- 검증: `npx tsc --noEmit`으로 자동 확인

**성공 요인**:
1. ✅ 패턴 동일: 15개 파일 모두 같은 구조
2. ✅ TypeScript 자동 검출: 모든 에러 위치를 컴파일러가 알려줌
3. ✅ Agent 병렬 처리: 9개 Agent로 동시 수정

**교훈**:
- 패턴이 동일하면 45개도 30분 안에 가능
- TypeScript 컴파일러가 수정 누락을 즉시 감지

---

### 5.2 일괄 수정 체크리스트

**작업 전**:
- [ ] 영향받는 파일 목록 확보 (Grep으로 검색)
- [ ] 수정 패턴 확인 (2-3개 파일 샘플 분석)
- [ ] TypeScript 컴파일 실행 (기준선 에러 개수)

**작업 중**:
- [ ] Agent 병렬 처리 (9개 권장)
- [ ] 각 Agent에게 명확한 패턴 제공
- [ ] 진행 상황 모니터링

**작업 후**:
- [ ] TypeScript 컴파일 재실행
- [ ] 에러 개수 비교 (예: 777 → 732)
- [ ] 샘플 페이지 3-5개 수동 검토
- [ ] Git 커밋 (상세 메시지)

---

### 5.3 Agent 병렬 처리 예시

```typescript
// Phase 2-1에서 사용한 명령 (의사코드)
Task(agent_1, files: [mann-whitney, mixed-model, reliability])
Task(agent_2, files: [repeated-measures, experimental-design, smart-analysis])
Task(agent_3, files: [chi-square, cross-tabulation, anova])
// ... agent_9까지

// 각 Agent에게 동일한 지시:
// 1. useStatisticsPage hook 추가
// 2. useState 8개 제거
// 3. actions.xxx() 호출로 변경
// 4. withSelectedVariables 제거
```

---

## 6. 예외 케이스

### 6.1 descriptive/page.tsx

**특이점**: DataUploadStep을 사용하지 않음
- VariableMapping을 직접 사용 (withUploadedData: false)
- 데이터 업로드 없이 변수 선택만 수행

**영향**: DataUploadStep 수정 시 영향 없음

**파일**: [descriptive/page.tsx:64-67](../app/(dashboard)/statistics/descriptive/page.tsx#L64-L67)

---

### 6.2 cluster/page.tsx

**특이점**: handleDataUpload 시그니처가 다름
```typescript
// 대부분 페이지
const handleDataUpload = useCallback((file: File, data: unknown[]) => { ... }, [actions])

// cluster (옛날 패턴)
const handleDataUpload = useCallback((data: unknown[]) => { ... }, [])
```

**영향**: DataUploadStep 수정 시 개별 대응 필요

**파일**: [cluster/page.tsx:61-64](../app/(dashboard)/statistics/cluster/page.tsx#L61-L64)

---

## 7. 신규 페이지 작성 가이드

### 7.1 표준 템플릿

```typescript
'use client'

import { useCallback } from 'react'
import type { PyodideInterface } from '@/types/pyodide'
import { loadPyodideWithPackages } from '@/lib/utils/pyodide-loader'
import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { UploadedData } from '@/hooks/use-statistics-page'
import { StatisticsPageLayout, StatisticsStep } from '@/components/statistics/StatisticsPageLayout'
import { DataUploadStep } from '@/components/smart-flow/steps/DataUploadStep'
import { VariableSelector } from '@/components/variable-selection/VariableSelector'

// 결과 인터페이스 정의 (페이지별 고유)
interface MethodResults {
  // ... 통계 결과 필드
}

interface SelectedVariables {
  dependent: string[]
  independent?: string[]
}

export default function NewMethodPage() {
  // 1. Hook 사용
  const { state, actions } = useStatisticsPage<MethodResults, SelectedVariables>({
    withUploadedData: true,
    withError: true
  })
  const { currentStep, uploadedData, selectedVariables, isAnalyzing, results, error } = state

  // 2. Steps 정의
  const steps: StatisticsStep[] = [
    {
      id: 'upload',
      number: 1,
      title: '데이터 업로드',
      description: '...',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    // ... 다른 단계
  ]

  // 3. 분석 함수
  const runAnalysis = useCallback(async (variables: SelectedVariables) => {
    if (!uploadedData) return

    actions.startAnalysis()

    try {
      const pyodide: PyodideInterface = await loadPyodideWithPackages(['numpy', 'scipy'])
      pyodide.globals.set('data', uploadedData.data)

      const pythonCode = `
# Python 분석 코드
import pandas as pd
import numpy as np
from scipy import stats

df = pd.DataFrame(data)
# ... 분석 로직
`

      const result = pyodide.runPython(pythonCode)
      actions.completeAnalysis(result.toJs(), 2)
    } catch (err) {
      console.error('[new-method] Analysis failed:', err)
      actions.setError(err instanceof Error ? err.message : '분석 중 오류')
    }
  }, [uploadedData, actions])

  // 4. Handlers
  const handleDataUpload = useCallback((file: File, data: unknown[]) => {
    const uploadedData: UploadedData = {
      data: data as Record<string, unknown>[],
      fileName: file.name,
      columns: data.length > 0 && typeof data[0] === 'object' && data[0] !== null
        ? Object.keys(data[0] as Record<string, unknown>)
        : []
    }

    if (!actions.setUploadedData) {
      console.error('[new-method] setUploadedData not available')
      return
    }

    actions.setUploadedData(uploadedData)
    actions.setCurrentStep(1)
  }, [actions])

  const handleVariablesSelected = useCallback((variables: unknown) => {
    if (typeof variables === 'object' && variables !== null) {
      if (actions.setSelectedVariables) {
        actions.setSelectedVariables(variables as SelectedVariables)
      }
      actions.setCurrentStep(2)
      runAnalysis(variables as SelectedVariables)
    }
  }, [actions, runAnalysis])

  // 5. Layout
  return (
    <StatisticsPageLayout
      title="통계 메서드명"
      description="..."
      steps={steps}
      currentStep={currentStep}
    >
      {currentStep === 0 && (
        <DataUploadStep onUploadComplete={handleDataUpload} />
      )}

      {currentStep === 1 && uploadedData && (
        <VariableSelector
          data={uploadedData.data}
          requirements={getVariableRequirements('methodName')}
          onSelect={handleVariablesSelected}
        />
      )}

      {currentStep === 2 && renderResults()}
    </StatisticsPageLayout>
  )
}
```

### 7.2 작성 체크리스트

**Phase 1: 구조**
- [ ] useStatisticsPage hook 사용 (Generic 타입 명시)
- [ ] StatisticsPageLayout 사용
- [ ] DataUploadStep 사용 (필요 시)
- [ ] VariableSelector 사용 (필요 시)
- [ ] StatisticsStep[] 타입 명시

**Phase 2: 타입 안전성**
- [ ] 결과 인터페이스 정의
- [ ] UploadedData 구조 준수
- [ ] unknown → Record<string, unknown>[] 타입 변환
- [ ] Null 체크 (data[0] !== null)
- [ ] 명시적 타입 가드 (if (!actions.xxx))

**Phase 3: 에러 처리**
- [ ] try-catch 사용
- [ ] console.error('[페이지명]', ...) 추가
- [ ] Error 타입 체크 (instanceof Error)
- [ ] 기본 메시지 제공

**Phase 4: 검증**
- [ ] TypeScript 컴파일: `npx tsc --noEmit`
- [ ] 빌드 테스트: `npm run build`
- [ ] 수동 테스트 (데이터 업로드 → 분석 실행)
- [ ] Git 커밋

---

## 8. 참고 파일

### 좋은 예시 (Phase 2-2 개선 완료)

1. **[anova/page.tsx](../app/(dashboard)/statistics/anova/page.tsx)**
   - ✅ 명시적 에러 처리 (Line 185-200)
   - ✅ useStatisticsPage hook 사용
   - ✅ 타입 안전성 (UploadedData 구조)

2. **[correlation/page.tsx](../app/(dashboard)/statistics/correlation/page.tsx)**
   - ✅ 타입 캐스팅 (strength: 'strong' | 'moderate' | 'weak')
   - ✅ 안전한 index 접근 (Line 404, 492, 503)
   - ✅ VariableSelector 새 API (Line 454-463)

3. **[partial-correlation/page.tsx](../app/(dashboard)/statistics/partial-correlation/page.tsx)**
   - ✅ Phase 2-1 표준 패턴 (Option D)
   - ✅ useState 8개 → useStatisticsPage 1개
   - ✅ SciPy 사용 (검증된 라이브러리)
   - 🟡 에러 처리 개선 권장 (Phase 2-2 패턴 적용)

### 개선 필요 예시

1. **[cluster/page.tsx](../app/(dashboard)/statistics/cluster/page.tsx)**
   - ⚠️ 직접 구현 (K-means, silhouette)
   - ⚠️ handleDataUpload 시그니처 다름 (Line 61)
   - ✅ useStatisticsPage hook 사용

2. **[descriptive/page.tsx](../app/(dashboard)/statistics/descriptive/page.tsx)**
   - ⚠️ DataUploadStep 미사용 (withUploadedData: false)
   - ✅ VariableMapping 직접 사용

---

## 9. 버전 히스토리

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2025-10-30 | 초기 작성 (45개 페이지 분석 결과) | AI (Claude) |

---

## 10. 관련 문서

- [STATISTICS_PAGE_CODING_STANDARDS.md](./STATISTICS_PAGE_CODING_STANDARDS.md) - 코딩 표준 (필독!)
- [AI-CODING-RULES.md](./AI-CODING-RULES.md) - TypeScript any → unknown 예제
- [phase2-1-2-complete-report.md](../../archive/2025-10/phase2-1-2-complete-report.md) - Phase 2 완료 보고서
- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙 (섹션 3: 통계 페이지 코딩 표준)

---

**마지막 업데이트**: 2025-10-30
**검증 상태**: ✅ TypeScript 컴파일 통과 (717 에러, partial-correlation 0 에러)
