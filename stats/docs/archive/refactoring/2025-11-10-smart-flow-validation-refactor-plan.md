# Smart Flow DataValidationStep 리팩토링 계획

**작성일**: 2025-11-10
**상태**: 계획 수립
**담당**: Claude Code
**우선순위**: 🔴 High

---

## 📋 목차

1. [배경 및 목적](#배경-및-목적)
2. [현재 문제점](#현재-문제점)
3. [리팩토링 범위](#리팩토링-범위)
4. [세부 실행 계획](#세부-실행-계획)
5. [예상 효과](#예상-효과)
6. [리스크 관리](#리스크-관리)
7. [타임라인](#타임라인)

---

## 배경 및 목적

### 배경
- **DataValidationStep.tsx**: 2,456줄 (103개 함수)
- 통계 계산, 차트 생성, UI 렌더링이 하나의 파일에 집중
- 유지보수성 저하 및 테스트 어려움

### 목적
- ✅ 가독성 향상: 2,456줄 → 300줄 목표
- ✅ 재사용성 향상: hooks/utils 분리로 다른 컴포넌트에서 재사용
- ✅ 테스트 용이성: 단위 테스트 가능한 구조
- ✅ 유지보수성: 명확한 역할 분리

---

## 현재 문제점

### 1. 거대 파일 문제 🔴
**파일**: `components/smart-flow/steps/DataValidationStep.tsx`

**현황**:
```
- 총 라인 수: 2,456줄
- 함수/상수 개수: 103개
- 주요 역할:
  1. 통계 계산 (정규성, 등분산성, 상관계수)
  2. Pyodide 비동기 제어 (AbortController, 상태 관리)
  3. 차트 생성 (Q-Q Plot, Histogram, Heatmap)
  4. UI 렌더링 (Card, Alert, Badge 등)
```

**구체적 코드 위치**:
- Line 23-32: VALIDATION_CONSTANTS (상수)
- Line 39-63: inverseErf, calculateBasicStats (통계 유틸)
- Line 198-381: Pyodide 호출 및 상태 관리 (useEffect)
- Line 888-: UI 렌더링 (JSX)

### 2. 코드 중복 🟡
**DataValidationStep.tsx vs DataValidationStepWithCharts.tsx**:
- 상관계수 계산 로직 중복
  - DataValidationStep.tsx (Line 130-196)
  - DataValidationStepWithCharts.tsx (Line 17-144)
- 데이터 파싱 로직 중복

### 3. Props 타입 분산 🟢
**현재**:
- DataValidationStepWithCharts.tsx (Line 17): 로컬 정의
- ResultsActionStep.tsx (Line 12): 로컬 정의
- VariableSelectionStep.tsx (Line 15): 로컬 정의

**기존**:
- types/smart-flow-navigation.ts (Line 30-67): 다른 Step용 타입만 존재

### 4. 백업 파일 🟡
- `DataValidationStep.tsx.bak` (120KB)
- Git에 트래킹되고 있음 → 즉시 삭제 필요

---

## 리팩토링 범위

### Phase 1: 백업 파일 정리 (5분)
**작업**:
```bash
rm components/smart-flow/steps/DataValidationStep.tsx.bak
git commit -m "chore: 불필요한 백업 파일 삭제"
```

### Phase 2: validation/utils/ 분리 (2시간)
**생성 파일**:
1. `validation/utils/constants.ts`
   - VALIDATION_CONSTANTS 이동
   - 기존: Line 23-32

2. `validation/utils/statisticalTests.ts`
   - inverseErf (Line 39-63)
   - calculateBasicStats
   - extractNumericData
   - 상관계수 계산 (중복 제거)

3. `validation/utils/chartHelpers.ts`
   - Q-Q Plot 생성
   - Histogram 생성
   - Heatmap 레이아웃

### Phase 3: validation/hooks/ 분리 (3시간)
**생성 파일**:
1. `validation/hooks/useNormalityTest.ts`
   - Pyodide 호출 로직
   - Shapiro-Wilk, Kolmogorov-Smirnov 테스트
   - AbortController 관리
   - 기존: Line 198-300 (추정)

2. `validation/hooks/useHomogeneityTest.ts`
   - Levene, Bartlett 테스트
   - 기존: Line 301-381 (추정)

3. `validation/hooks/useAssumptionRunner.ts`
   - 전체 가정 검정 orchestration
   - assumptionRunId 관리
   - 상태 업데이트 순서 제어

4. `validation/hooks/useAutoProgress.ts`
   - 자동 진행 카운트다운
   - 일시정지/재개 로직
   - 기존: Line 90-160, 329-382

### Phase 4: validation/components/ 분리 (1시간)
**생성 파일**:
1. `validation/components/QualityWarningPanel.tsx`
   - 데이터 품질 경고 카드

2. `validation/components/OutlierAnalysisCard.tsx`
   - 이상치 분석 카드

3. `validation/components/AssumptionResultsCard.tsx`
   - 가정 검정 결과 카드

### Phase 5: DataValidationStep.tsx 슬림화 (1시간)
**목표**: 2,456줄 → 300줄

**남길 것**:
- 메인 컴포넌트 구조
- hooks 호출
- 하위 컴포넌트 조합
- Props 정의

**제거할 것**:
- 모든 유틸 함수 → validation/utils/
- 모든 hooks 로직 → validation/hooks/
- 복잡한 UI 블록 → validation/components/

### Phase 6: Props 타입 중앙화 (30분)
**수정 파일**:
- `types/smart-flow-navigation.ts`
  - DataValidationStepProps 추가
  - ResultsActionStepProps 추가
  - VariableSelectionStepProps 추가

**수정 컴포넌트**:
- DataValidationStepWithCharts.tsx
- ResultsActionStep.tsx
- VariableSelectionStep.tsx
- → import 방식으로 변경

---

## 세부 실행 계획

### Phase 2: validation/utils/ 분리

#### Step 2.1: constants.ts 생성
**파일**: `components/smart-flow/steps/validation/utils/constants.ts`

```typescript
/**
 * 데이터 검증 상수
 */
export const VALIDATION_CONSTANTS = {
  SKEWED_THRESHOLD: 0.8,
  SPARSE_THRESHOLD: 5,
  MAX_DISPLAY_CATEGORIES: 5,
  MIN_SAMPLE_SIZE: 3,
  DEBOUNCE_DELAY_MS: 200,
  AUTO_PROGRESS_COUNTDOWN: 5,
  OUTLIER_WARNING_THRESHOLD: 0.05,
  OUTLIER_CRITICAL_THRESHOLD: 0.1
} as const
```

**이동 코드**: DataValidationStep.tsx Line 23-32

#### Step 2.2: statisticalTests.ts 생성
**파일**: `components/smart-flow/steps/validation/utils/statisticalTests.ts`

```typescript
/**
 * 통계 계산 유틸리티
 */

// 역 오차 함수 (Q-Q Plot용)
export function inverseErf(x: number): number {
  // Line 39-63 코드 이동
}

// 기초 통계 계산
export function calculateBasicStats(values: number[]): {
  mean: number
  std: number
  min: number
  max: number
} {
  // 코드 이동
}

// 숫자 데이터 추출
export function extractNumericData(
  data: unknown[],
  columnName: string
): number[] {
  // 코드 이동
}

// 상관계수 계산 (중복 제거)
export function calculateCorrelation(
  x: number[],
  y: number[]
): number {
  // DataValidationStep.tsx + DataValidationStepWithCharts.tsx 통합
}
```

**이동 코드**:
- DataValidationStep.tsx Line 39-63, 130-196
- DataValidationStepWithCharts.tsx Line 17-144 (중복 부분)

#### Step 2.3: chartHelpers.ts 생성
**파일**: `components/smart-flow/steps/validation/utils/chartHelpers.ts`

```typescript
/**
 * 차트 생성 유틸리티
 */

export function createQQPlotData(values: number[]): Data[] {
  // Q-Q Plot 데이터 생성 로직 이동
}

export function createHistogramData(values: number[]): Data[] {
  // Histogram 데이터 생성 로직 이동
}

export function getHeatmapConfig(): Partial<Layout> {
  // Heatmap 레이아웃 설정
}
```

---

### Phase 3: validation/hooks/ 분리

#### Step 3.1: useNormalityTest.ts 생성
**파일**: `components/smart-flow/steps/validation/hooks/useNormalityTest.ts`

```typescript
import { useState, useCallback, useRef } from 'react'
import { usePyodide } from '@/components/providers/PyodideProvider'

export interface NormalityTestResult {
  shapiroWilk: { statistic: number; pvalue: number; isNormal: boolean }
  kolmogorovSmirnov: { statistic: number; pvalue: number; isNormal: boolean }
}

export function useNormalityTest() {
  const { pyodideReady, callWorkerMethod } = usePyodide()
  const [isRunning, setIsRunning] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const runTest = useCallback(async (
    columnName: string,
    data: number[]
  ): Promise<NormalityTestResult> => {
    // DataValidationStep.tsx Line 198-300 로직 이동
    // AbortController 관리
    // Pyodide 호출
    // 결과 반환
  }, [pyodideReady, callWorkerMethod])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { runTest, abort, isRunning }
}
```

**이동 코드**: DataValidationStep.tsx Line 198-300 (추정)

#### Step 3.2: useHomogeneityTest.ts 생성
**파일**: `components/smart-flow/steps/validation/hooks/useHomogeneityTest.ts`

```typescript
export interface HomogeneityTestResult {
  levene: { statistic: number; pvalue: number; equalVariance: boolean }
  bartlett: { statistic: number; pvalue: number; equalVariance: boolean }
}

export function useHomogeneityTest() {
  // useNormalityTest와 유사한 구조
  // DataValidationStep.tsx Line 301-381 로직 이동
}
```

#### Step 3.3: useAssumptionRunner.ts 생성
**파일**: `components/smart-flow/steps/validation/hooks/useAssumptionRunner.ts`

```typescript
import { useNormalityTest } from './useNormalityTest'
import { useHomogeneityTest } from './useHomogeneityTest'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

export function useAssumptionRunner() {
  const { runTest: runNormality } = useNormalityTest()
  const { runTest: runHomogeneity } = useHomogeneityTest()
  const { setAssumptionResults } = useSmartFlowStore()

  const [assumptionRunId, setAssumptionRunId] = useState(0)

  const runAllTests = useCallback(async (data: DataRow[]) => {
    const runId = Date.now()
    setAssumptionRunId(runId)

    try {
      // 정규성 검정
      const normalityResults = await runNormality(...)

      // 등분산성 검정
      const homogeneityResults = await runHomogeneity(...)

      // Store 업데이트
      setAssumptionResults({
        normality: normalityResults,
        homogeneity: homogeneityResults,
        summary: '...'
      })
    } catch (error) {
      // 에러 처리
    }
  }, [runNormality, runHomogeneity, setAssumptionResults])

  return { runAllTests, assumptionRunId }
}
```

#### Step 3.4: useAutoProgress.ts 생성
**파일**: `components/smart-flow/steps/validation/hooks/useAutoProgress.ts`

```typescript
export function useAutoProgress(onComplete: () => void) {
  const [countdown, setCountdown] = useState(5)
  const [isPaused, setIsPaused] = useState(false)

  // DataValidationStep.tsx Line 90-160, 329-382 로직 이동
  // 카운트다운 로직
  // 일시정지/재개
  // 자동 진행

  return {
    countdown,
    isPaused,
    pause: () => setIsPaused(true),
    resume: () => setIsPaused(false),
    reset: () => setCountdown(5)
  }
}
```

---

### Phase 4: validation/components/ 분리

#### Step 4.1: QualityWarningPanel.tsx
```typescript
export function QualityWarningPanel({ warnings }: { warnings: string[] }) {
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <ul>
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
```

#### Step 4.2: OutlierAnalysisCard.tsx
```typescript
export function OutlierAnalysisCard({ outliers, total }: Props) {
  const outlierRate = outliers.length / total

  return (
    <Card>
      <CardHeader>
        <CardTitle>이상치 분석</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 이상치 시각화 */}
      </CardContent>
    </Card>
  )
}
```

#### Step 4.3: AssumptionResultsCard.tsx
```typescript
export function AssumptionResultsCard({ results }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>통계적 가정 검정</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 정규성, 등분산성 결과 */}
      </CardContent>
    </Card>
  )
}
```

---

### Phase 5: DataValidationStep.tsx 슬림화

**리팩토링 후 구조** (300줄 목표):

```typescript
'use client'

import { memo } from 'react'
import { useNormalityTest } from './validation/hooks/useNormalityTest'
import { useHomogeneityTest } from './validation/hooks/useHomogeneityTest'
import { useAssumptionRunner } from './validation/hooks/useAssumptionRunner'
import { useAutoProgress } from './validation/hooks/useAutoProgress'
import { QualityWarningPanel } from './validation/components/QualityWarningPanel'
import { OutlierAnalysisCard } from './validation/components/OutlierAnalysisCard'
import { AssumptionResultsCard } from './validation/components/AssumptionResultsCard'
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'

export const DataValidationStep = memo(function DataValidationStep({
  validationResults,
  data,
  onNext,
  onPrevious
}: DataValidationStepProps) {
  // Hooks
  const { runAllTests, assumptionRunId } = useAssumptionRunner()
  const { countdown, isPaused, pause, resume } = useAutoProgress(onNext)

  // State (최소한만 유지)
  const [selectedTab, setSelectedTab] = useState('summary')

  // Effects
  useEffect(() => {
    if (data) {
      runAllTests(data)
    }
  }, [data, runAllTests])

  // Render (컴포넌트 조합만)
  return (
    <div className="space-y-6">
      {validationResults?.warnings && (
        <QualityWarningPanel warnings={validationResults.warnings} />
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="summary">요약</TabsTrigger>
          <TabsTrigger value="outliers">이상치</TabsTrigger>
          <TabsTrigger value="assumptions">가정 검정</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          {/* 기존 요약 UI */}
        </TabsContent>

        <TabsContent value="outliers">
          <OutlierAnalysisCard
            outliers={validationResults?.outliers || []}
            total={data?.length || 0}
          />
        </TabsContent>

        <TabsContent value="assumptions">
          <AssumptionResultsCard results={assumptionResults} />
        </TabsContent>
      </Tabs>

      {/* 자동 진행 UI */}
      <div className="flex justify-between">
        <Button onClick={pause}>일시정지 ({countdown}초)</Button>
        <Button onClick={onNext}>다음 단계</Button>
      </div>
    </div>
  )
})
```

**라인 수 비교**:
- Before: 2,456줄
- After: ~300줄 (예상)
- 감소율: -88%

---

### Phase 6: Props 타입 중앙화

**파일**: `types/smart-flow-navigation.ts`

**추가할 타입**:
```typescript
// DataValidationStepWithCharts
export interface DataValidationStepProps {
  validationResults: ValidationResults | null
  data: DataRow[] | null
  onNext?: () => void
  onPrevious?: () => void
}

// ResultsActionStep
export interface ResultsActionStepProps {
  results: AnalysisResult | null
}

// VariableSelectionStep
export interface VariableSelectionStepProps {
  onComplete?: () => void
  onBack?: () => void
}
```

**수정 컴포넌트**:
```typescript
// Before
interface DataValidationStepProps {...}

// After
import type { DataValidationStepProps } from '@/types/smart-flow-navigation'
```

---

## 예상 효과

### 정량적 효과
| 항목 | Before | After | 개선율 |
|------|--------|-------|--------|
| 파일 크기 | 2,456줄 | ~300줄 | -88% |
| 함수 개수 | 103개 | ~20개 | -80% |
| 중복 코드 | 2곳 | 0곳 | -100% |
| Props 타입 | 분산 | 중앙화 | +100% |

### 정성적 효과
- ✅ **가독성**: 메인 컴포넌트가 간결해져 전체 흐름 파악 용이
- ✅ **유지보수성**: 역할별 분리로 수정 범위 명확
- ✅ **재사용성**: hooks/utils는 다른 컴포넌트에서도 사용 가능
- ✅ **테스트 용이성**: 단위 테스트 작성 가능
- ✅ **확장성**: 새로운 검정 추가 시 hooks만 추가하면 됨

---

## 리스크 관리

### 잠재적 리스크

#### 1. Pyodide 상태 관리 문제 🔴
**리스크**: AbortController, assumptionRunId 로직을 hooks로 분리할 때 동시 실행 방지가 깨질 수 있음

**대응 방안**:
- ✅ useAssumptionRunner에서 runId 관리 유지
- ✅ AbortController를 각 hook에서 독립적으로 관리
- ✅ 리팩토링 후 동시 실행 테스트 수행

#### 2. 타입 불일치 🟡
**리스크**: utils/hooks 분리 시 타입 불일치 발생 가능

**대응 방안**:
- ✅ TypeScript strict mode 유지
- ✅ 각 단계마다 `npx tsc --noEmit` 실행
- ✅ 인터페이스 먼저 정의 후 구현

#### 3. 성능 저하 🟢
**리스크**: hooks 분리로 re-render 증가 가능

**대응 방안**:
- ✅ useCallback, useMemo 적절히 사용
- ✅ memo로 컴포넌트 최적화
- ✅ 리팩토링 후 성능 측정 (React DevTools Profiler)

### 롤백 계획
- Git 브랜치 사용: `refactor/validation-step`
- 각 Phase마다 커밋
- 문제 발생 시 Phase 단위 롤백 가능

---

## 타임라인

### 예상 일정
```
Day 1: Phase 1-2 (2시간 15분)
├─ 09:00-09:05  Phase 1: 백업 파일 정리 (5분)
├─ 09:05-11:05  Phase 2: validation/utils/ 분리 (2시간)
└─ 11:05-11:15  TypeScript 체크 & 커밋 (10분)

Day 2: Phase 3 (3시간 30분)
├─ 09:00-12:00  Phase 3: validation/hooks/ 분리 (3시간)
└─ 12:00-12:30  TypeScript 체크 & 통합 테스트 (30분)

Day 3: Phase 4-6 (2시간 30분)
├─ 09:00-10:00  Phase 4: validation/components/ 분리 (1시간)
├─ 10:00-11:00  Phase 5: DataValidationStep 슬림화 (1시간)
├─ 11:00-11:30  Phase 6: Props 타입 중앙화 (30분)
└─ 11:30-12:00  최종 테스트 & 문서화 (30분)
```

### 총 소요 시간
- **예상**: 8시간 15분
- **실제**: 여유 있게 10시간 배정

---

## 검증 체크리스트

### Phase 1 완료 후
- [ ] `DataValidationStep.tsx.bak` 파일 삭제됨
- [ ] Git 커밋 완료

### Phase 2 완료 후
- [ ] `validation/utils/constants.ts` 생성
- [ ] `validation/utils/statisticalTests.ts` 생성
- [ ] `validation/utils/chartHelpers.ts` 생성
- [ ] DataValidationStep.tsx에서 import 정상 작동
- [ ] TypeScript 0 에러

### Phase 3 완료 후
- [ ] `validation/hooks/useNormalityTest.ts` 생성
- [ ] `validation/hooks/useHomogeneityTest.ts` 생성
- [ ] `validation/hooks/useAssumptionRunner.ts` 생성
- [ ] `validation/hooks/useAutoProgress.ts` 생성
- [ ] Pyodide 호출 정상 작동
- [ ] AbortController 동작 확인
- [ ] TypeScript 0 에러

### Phase 4 완료 후
- [ ] `validation/components/QualityWarningPanel.tsx` 생성
- [ ] `validation/components/OutlierAnalysisCard.tsx` 생성
- [ ] `validation/components/AssumptionResultsCard.tsx` 생성
- [ ] UI 렌더링 정상 확인
- [ ] TypeScript 0 에러

### Phase 5 완료 후
- [ ] DataValidationStep.tsx 300줄 이하
- [ ] 모든 기능 정상 작동
- [ ] TypeScript 0 에러
- [ ] 통합 테스트 통과

### Phase 6 완료 후
- [ ] types/smart-flow-navigation.ts에 Props 추가
- [ ] 3개 컴포넌트 import 방식 변경
- [ ] TypeScript 0 에러

### 최종 검증
- [ ] `npm run dev` 정상 실행
- [ ] Smart Flow 전체 단계 정상 작동
- [ ] 데이터 검증 단계 모든 기능 테스트
- [ ] 성능 저하 없음 (React DevTools Profiler)
- [ ] 문서 업데이트 (README, CHANGELOG)

---

## 참고 자료

### 기존 문서
- [STATISTICS_CODING_STANDARDS.md](../../../docs/STATISTICS_CODING_STANDARDS.md)
- [AI-CODING-RULES.md](../../../docs/AI-CODING-RULES.md)

### 관련 파일
- `components/smart-flow/steps/DataValidationStep.tsx` (2,456줄)
- `components/smart-flow/steps/DataValidationStepWithCharts.tsx` (895줄)
- `components/smart-flow/steps/validation/` (기존 구조)

### 외부 참고
- React Hooks 패턴: https://react.dev/learn/reusing-logic-with-custom-hooks
- TypeScript 타입 가드: https://www.typescriptlang.org/docs/handbook/2/narrowing.html

---

## 변경 이력

- **2025-11-10**: 초안 작성 (Claude Code)

---

**다음 단계**: Phase 1 시작 (백업 파일 정리)
