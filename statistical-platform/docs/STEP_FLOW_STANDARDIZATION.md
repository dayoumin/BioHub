# Step Flow 표준화 분석 및 개선 방안

**작성일**: 2025-11-05
**작성자**: Claude Code
**목적**: 통계 페이지의 다단계 UI 일관성 확보 및 표준화 방안 수립

---

## 📊 현황 분석

### 1. 전체 통계 구조

| 항목 | 수량 | 비고 |
|------|------|------|
| 전체 통계 페이지 디렉터리 | **41개** | `__tests__` 제외 |
| menu-config.ts 등록 메서드 | **35개** | `implemented: true` |
| menu-config.ts totalMethods | **46개** | ⚠️ 불일치 |
| steps 구현 페이지 | **31개** | 75.6% |
| steps 미구현 페이지 | **10개** | 24.4% |

### 2. Steps 미구현 페이지 목록

다음 10개 페이지는 `StatisticsStep[]` 정의 및 `currentStep` 기반 UI가 누락되어 있습니다:

1. [chi-square](statistical-platform/app/(dashboard)/statistics/chi-square/page.tsx) - Fisher 정확 검정
2. [cluster](statistical-platform/app/(dashboard)/statistics/cluster/page.tsx) - 군집 분석
3. [dose-response](statistical-platform/app/(dashboard)/statistics/dose-response/page.tsx) - 용량-반응 분석
4. [factor-analysis](statistical-platform/app/(dashboard)/statistics/factor-analysis/page.tsx) - 요인 분석
5. [non-parametric](statistical-platform/app/(dashboard)/statistics/non-parametric/page.tsx) - 비모수 검정
6. [ordinal-regression](statistical-platform/app/(dashboard)/statistics/ordinal-regression/page.tsx) - 순서형 회귀
7. [poisson](statistical-platform/app/(dashboard)/statistics/poisson/page.tsx) - 포아송 회귀
8. [response-surface](statistical-platform/app/(dashboard)/statistics/response-surface/page.tsx) - 반응표면 분석
9. [sign-test](statistical-platform/app/(dashboard)/statistics/sign-test/page.tsx) - 부호 검정
10. [stepwise](statistical-platform/app/(dashboard)/statistics/stepwise/page.tsx) - 단계적 회귀

### 3. 메트릭 불일치 분석

#### 3.1 menu-config.ts 불일치

```typescript
// 현재 (statistical-platform/lib/statistics/menu-config.ts:442)
export const STATISTICS_SUMMARY = {
  totalMethods: 46,  // ⚠️ 하드코딩된 값
  implementedMethods: getImplementedMenuItems().length,  // 35개
  categories: STATISTICS_MENU.length,
  completionRate: Math.round((getImplementedMenuItems().length / 46) * 100)
}
```

**문제점**:
- `totalMethods: 46`는 실제 페이지 수(41개)와 불일치
- `implemented: true` 메서드(35개)와도 불일치
- 하드코딩으로 인해 유지보수 시 동기화 문제 발생

#### 3.2 실제 페이지와 메뉴 등록 불일치

**메뉴 미등록 페이지** (6개):
1. `chi-square/` - Fisher 검정 (메뉴에는 chi-square-goodness, chi-square-independence만 등록)
2. `cluster/`
3. `dose-response/`
4. `factor-analysis/`
5. `ordinal-regression/`
6. `response-surface/`
7. `sign-test/`
8. `stepwise/`
9. `poisson/`
10. `explore-data/` (메뉴 등록 확인 필요)

---

## 🔍 상세 분석

### 1. Step Flow 아키텍처

#### 1.1 핵심 구성 요소

```
useStatisticsPage (hooks/use-statistics-page.ts:164)
  ↓ currentStep, uploadedData, variableMapping, results 관리

StatisticsPageLayout (components/statistics/StatisticsPageLayout.tsx:79)
  ↓ steps, currentStep을 받아 진행률/단계 카드 렌더링

createDataUploadHandler/createVariableSelectionHandler (lib/utils/statistics-handlers.ts:67)
  ↓ 성공 시 actions.setCurrentStep 호출

VariableSelector (components/variable-selection/VariableSelector.tsx:323)
  ↓ 검증 실패 시 완료 버튼 비활성화
```

#### 1.2 표준 패턴

**정상 구현 예시** ([descriptive/page.tsx:86-110](statistical-platform/app/(dashboard)/statistics/descriptive/page.tsx#L86-L110)):

```typescript
// 1. StatisticsStep 정의
const steps: StatisticsStep[] = [
  {
    id: 'upload-data',
    number: 1,
    title: '데이터 업로드',
    description: 'CSV 또는 Excel 파일 업로드',
    status: uploadedData ? 'completed' : 'current'
  },
  {
    id: 'select-variables',
    number: 2,
    title: '변수 선택',
    description: '분석할 수치형 변수 선택',
    status: Object.keys(variableMapping).length > 0 ? 'completed'
            : uploadedData ? 'current' : 'pending'
  },
  {
    id: 'configure-options',
    number: 3,
    title: '옵션 설정',
    description: '분석 옵션 구성',
    status: currentStep >= 3 ? 'current' : 'pending'
  },
  {
    id: 'view-results',
    number: 4,
    title: '결과 확인',
    description: '통계 결과 및 시각화',
    status: results ? 'completed' : 'pending'
  }
]

// 2. StatisticsPageLayout에 전달
return (
  <StatisticsPageLayout
    title="기술통계"
    description="데이터의 기본 통계량 계산"
    steps={steps}        // ✅ 진행률 표시
    currentStep={currentStep}  // ✅ 단계 제어
    onExecute={handleExecute}
    onReset={handleReset}
    isAnalyzing={isAnalyzing}
  >
    {/* 단계별 조건부 렌더링 */}
    {currentStep === 1 && <DataUploadStep />}
    {currentStep === 2 && <VariableSelector />}
    {currentStep >= 3 && <OptionsCard />}
    {results && <ResultsCard />}
  </StatisticsPageLayout>
)
```

**비정상 구현 예시** ([chi-square/page.tsx:445](statistical-platform/app/(dashboard)/statistics/chi-square/page.tsx#L445)):

```typescript
// ❌ steps, currentStep 누락
return (
  <StatisticsPageLayout
    title="Fisher 정확 검정"
    description="작은 표본의 2×2 분할표를 정확하게 검정합니다"
    // steps={steps}        ❌ 없음 → 진행률 표시 안 됨
    // currentStep={currentStep}  ❌ 없음 → 단계 제어 안 됨
  >
    <div className="space-y-6">
      {renderMethodology()}
      {renderInput()}  {/* 모든 입력이 동시에 노출 */}
      {results && renderResults()}
    </div>
  </StatisticsPageLayout>
)
```

### 2. 문제점 상세

#### 2.1 UX 일관성 문제

| 구현 상태 | 진행률 표시 | 단계 제한 | 업로드→변수선택 순서 | 사용자 혼란도 |
|----------|-----------|---------|-------------------|------------|
| ✅ Steps 구현 (31개) | O | O | O | 낮음 |
| ❌ Steps 미구현 (10개) | X | X | X | **높음** |

**구체적 문제**:
1. **진행률 미표시**: 사용자가 현재 어느 단계인지 알 수 없음
2. **단계 건너뛰기**: 데이터 업로드 없이 분석 시도 가능 → 에러 발생
3. **UI 과부하**: 모든 입력 폼이 동시에 노출되어 복잡함
4. **상태 불일치**: `actions.completeAnalysis(..., 3)` 호출하지만 UI에 반영 안 됨

#### 2.2 코드 품질 문제

**테스트 작성 어려움**:
```typescript
// ❌ currentStep 없으면 단계 검증 불가
expect(screen.getByText('1단계')).toBeInTheDocument()  // 렌더링 안 됨

// ✅ steps 구현 시 검증 가능
expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
expect(screen.getByText('1/4')).toBeInTheDocument()
```

**유지보수 복잡도**:
- 31개 페이지는 `StatisticsPageLayout` props로 단계 관리
- 10개 페이지는 개별 로직으로 관리 → 수정 시 누락 가능성 ↑

---

## 🎯 개선 방안

### 1. 단기 조치 (Phase 2-3 완료 전)

#### 1.1 우선순위별 Steps 구현

| 우선순위 | 페이지 | 이유 |
|---------|-------|------|
| **P0** | chi-square, non-parametric | 메뉴 등록 완료, 사용 빈도 높음 |
| **P1** | cluster, factor-analysis, pca | 다변량 분석, 복잡한 입력 필요 |
| **P2** | 나머지 7개 | 메뉴 미등록 또는 고급 기능 |

#### 1.2 chi-square 페이지 개선 예시

```typescript
// chi-square/page.tsx 수정 (최소 변경)

// 1. steps 정의 추가
const steps: StatisticsStep[] = [
  {
    id: 'input-table',
    number: 1,
    title: '분할표 입력',
    description: '2×2 분할표 데이터 입력',
    status: 'current'
  },
  {
    id: 'view-results',
    number: 2,
    title: '결과 확인',
    description: 'Fisher 정확 검정 결과',
    status: results ? 'completed' : 'pending'
  }
]

// 2. StatisticsPageLayout props 추가
return (
  <StatisticsPageLayout
    title="Fisher 정확 검정"
    description="작은 표본의 2×2 분할표를 정확하게 검정합니다"
    steps={steps}  // ✅ 추가
    currentStep={1}  // ✅ 추가 (단순 페이지는 고정값)
  >
    {/* 기존 코드 유지 */}
  </StatisticsPageLayout>
)
```

#### 1.3 menu-config.ts 메트릭 수정

```typescript
// statistical-platform/lib/statistics/menu-config.ts:441-446

// ❌ 현재 (하드코딩)
export const STATISTICS_SUMMARY = {
  totalMethods: 46,  // 하드코딩
  implementedMethods: getImplementedMenuItems().length,
  categories: STATISTICS_MENU.length,
  completionRate: Math.round((getImplementedMenuItems().length / 46) * 100)
}

// ✅ 개선안 1 (동적 계산)
export const STATISTICS_SUMMARY = {
  totalMethods: getAllMenuItems().length,  // 35개 (실제 메뉴 등록 수)
  implementedMethods: getImplementedMenuItems().length,  // 35개
  categories: STATISTICS_MENU.length,
  completionRate: Math.round(
    (getImplementedMenuItems().length / getAllMenuItems().length) * 100
  )
}

// ✅ 개선안 2 (파일 시스템 기반 - Phase 7)
import { readdirSync } from 'fs'
import { join } from 'path'

export function getActualPageCount(): number {
  const statsDir = join(process.cwd(), 'app/(dashboard)/statistics')
  const dirs = readdirSync(statsDir, { withFileTypes: true })
  return dirs.filter(d =>
    d.isDirectory() &&
    d.name !== '__tests__' &&
    readdirSync(join(statsDir, d.name)).includes('page.tsx')
  ).length
}

export const STATISTICS_SUMMARY = {
  totalPages: getActualPageCount(),  // 41개 (실제 페이지 수)
  totalMethods: getAllMenuItems().length,  // 35개 (메뉴 등록 수)
  implementedMethods: getImplementedMenuItems().length,  // 35개
  categories: STATISTICS_MENU.length,
  menuCompletionRate: Math.round(
    (getImplementedMenuItems().length / getAllMenuItems().length) * 100
  ),  // 100%
  pageCompletionRate: Math.round(
    (getImplementedMenuItems().length / getActualPageCount()) * 100
  )  // 85%
}
```

### 2. 중기 조치 (Phase 3)

#### 2.1 Steps 패턴 공통 유틸 추출

**목표**: 반복 코드 제거, 신규 페이지 작성 시 누락 방지

```typescript
// lib/utils/statistics-steps.ts (신규)

export type StepPreset =
  | 'upload-variable-analysis'  // 업로드 → 변수선택 → 분석
  | 'upload-analysis'           // 업로드 → 분석 (변수선택 자동)
  | 'input-analysis'            // 직접 입력 → 분석 (업로드 불필요)
  | 'multi-step-analysis'       // 업로드 → 변수 → 옵션 → 분석

interface CreateStepsOptions {
  preset: StepPreset
  uploadedData?: boolean
  variableMapping?: Record<string, unknown>
  currentStep?: number
  results?: unknown
  customSteps?: Partial<StatisticsStep>[]  // 사용자 정의 단계
}

export function createStandardSteps(options: CreateStepsOptions): StatisticsStep[] {
  const { preset, uploadedData, variableMapping, currentStep, results } = options

  switch (preset) {
    case 'upload-variable-analysis':
      return [
        {
          id: 'upload-data',
          number: 1,
          title: '데이터 업로드',
          description: 'CSV 또는 Excel 파일 업로드',
          status: uploadedData ? 'completed' : 'current'
        },
        {
          id: 'select-variables',
          number: 2,
          title: '변수 선택',
          description: '분석할 변수 선택',
          status: Object.keys(variableMapping || {}).length > 0 ? 'completed'
                  : uploadedData ? 'current' : 'pending'
        },
        {
          id: 'run-analysis',
          number: 3,
          title: '분석 실행',
          description: '통계 분석 수행',
          status: currentStep >= 3 ? 'current' : 'pending'
        },
        {
          id: 'view-results',
          number: 4,
          title: '결과 확인',
          description: '분석 결과 및 시각화',
          status: results ? 'completed' : 'pending'
        }
      ]

    case 'input-analysis':
      return [
        {
          id: 'input-data',
          number: 1,
          title: '데이터 입력',
          description: '분석 데이터 직접 입력',
          status: 'current'
        },
        {
          id: 'view-results',
          number: 2,
          title: '결과 확인',
          description: '분석 결과',
          status: results ? 'completed' : 'pending'
        }
      ]

    // 다른 프리셋 구현...
  }
}
```

**사용 예시**:

```typescript
// chi-square/page.tsx (간소화)
const steps = createStandardSteps({
  preset: 'input-analysis',
  results: state.results
})

// descriptive/page.tsx (간소화)
const steps = createStandardSteps({
  preset: 'upload-variable-analysis',
  uploadedData: state.uploadedData,
  variableMapping: state.variableMapping,
  currentStep: state.currentStep,
  results: state.results
})
```

#### 2.2 StatisticsPageLayout Props 기본값 설정

```typescript
// components/statistics/StatisticsPageLayout.tsx:79

interface StatisticsPageLayoutProps {
  // ...기존 props
  steps?: StatisticsStep[]  // 옵셔널로 변경
  currentStep?: number      // 옵셔널로 변경
  autoGenerateSteps?: boolean  // 자동 생성 옵션
}

export function StatisticsPageLayout(props: StatisticsPageLayoutProps) {
  const {
    steps: providedSteps,
    currentStep = 1,
    autoGenerateSteps = true,
    ...rest
  } = props

  // 자동 생성: steps 미제공 시 기본 2단계 생성
  const steps = providedSteps || (autoGenerateSteps ? [
    {
      id: 'input',
      number: 1,
      title: '입력',
      description: '분석 데이터 입력',
      status: 'current'
    },
    {
      id: 'results',
      number: 2,
      title: '결과',
      description: '분석 결과 확인',
      status: 'pending'
    }
  ] : undefined)

  // 렌더링 로직...
}
```

### 3. 장기 조치 (Phase 7+)

#### 3.1 TypeScript 타입 시스템 강화

```typescript
// types/statistics-page.ts

import { StatisticsStep } from '@/components/statistics/StatisticsPageLayout'

// ❌ 현재: steps 누락 가능
interface StatisticsPageProps {
  steps?: StatisticsStep[]
}

// ✅ 개선: 강제 또는 자동 생성 선택
type StatisticsPageProps =
  | { steps: StatisticsStep[]; currentStep: number }
  | { autoGenerateSteps: true }
```

#### 3.2 ESLint 규칙 추가

```typescript
// .eslintrc.js

module.exports = {
  rules: {
    // 통계 페이지에서 StatisticsPageLayout 사용 시 steps 필수
    '@custom/require-statistics-steps': [
      'error',
      {
        pattern: 'app/(dashboard)/statistics/**/page.tsx',
        component: 'StatisticsPageLayout',
        requiredProps: ['steps', 'currentStep']
      }
    ]
  }
}
```

#### 3.3 자동 테스트 추가

```typescript
// app/(dashboard)/statistics/__tests__/steps-consistency.test.ts

describe('Steps Consistency', () => {
  const statisticsPages = fs.readdirSync(
    path.join(__dirname, '../')
  ).filter(/* page.tsx 찾기 */)

  test.each(statisticsPages)('%s should implement steps', (pagePath) => {
    const content = fs.readFileSync(pagePath, 'utf-8')

    // StatisticsPageLayout 사용 시 steps prop 필수
    if (content.includes('<StatisticsPageLayout')) {
      expect(content).toMatch(/steps=\{/)
      expect(content).toMatch(/currentStep=\{/)
    }
  })
})
```

---

## 📋 실행 계획

### Phase 2-3 (현재 진행 중)

**목표**: Steps 미구현 페이지 개선

| 작업 | 우선순위 | 예상 시간 | 담당 |
|------|---------|----------|------|
| 1. chi-square steps 추가 | P0 | 30분 | - |
| 2. non-parametric steps 추가 | P0 | 45분 | - |
| 3. menu-config.ts 메트릭 수정 | P1 | 15분 | - |
| 4. cluster/factor-analysis steps | P1 | 1시간 | - |
| 5. 나머지 6개 페이지 steps | P2 | 2시간 | - |
| **합계** | | **4.5시간** | |

### Phase 3 (다음 단계)

**목표**: 공통 패턴 추출 및 유틸 구현

| 작업 | 예상 시간 |
|------|----------|
| 1. createStandardSteps 유틸 구현 | 2시간 |
| 2. 31개 페이지 리팩토링 | 4시간 |
| 3. StatisticsPageLayout 기본값 설정 | 1시간 |
| 4. 통합 테스트 작성 | 2시간 |
| **합계** | **9시간** |

### Phase 7+ (장기)

**목표**: 타입 시스템 및 린팅 강화

| 작업 | 예상 시간 |
|------|----------|
| 1. TypeScript 타입 강화 | 1시간 |
| 2. ESLint 규칙 구현 | 3시간 |
| 3. 자동 테스트 추가 | 2시간 |
| **합계** | **6시간** |

---

## 📊 예상 효과

### 1. UX 개선

| 지표 | 개선 전 | 개선 후 | 개선율 |
|------|---------|---------|--------|
| Steps 구현률 | 75.6% (31/41) | **100% (41/41)** | +24.4% |
| 진행률 표시 페이지 | 31개 | **41개** | +32.3% |
| 단계 제어 페이지 | 31개 | **41개** | +32.3% |
| 사용자 혼란도 | 중간 | **낮음** | - |

### 2. 코드 품질

| 지표 | 개선 전 | 개선 후 |
|------|---------|---------|
| 반복 코드 (steps 정의) | 31개 파일 | **1개 유틸** (공통화) |
| 테스트 커버리지 | 단계 검증 불가 | **단계별 E2E 테스트 가능** |
| TypeScript 안전성 | steps 누락 가능 | **컴파일 에러로 방지** |

### 3. 유지보수성

| 지표 | 개선 전 | 개선 후 |
|------|---------|---------|
| 신규 페이지 작성 시간 | 2시간 | **1시간** (템플릿 활용) |
| Steps 패턴 수정 시 영향 | 31개 파일 개별 수정 | **1개 유틸만 수정** |
| 버그 발생률 (steps 누락) | 24.4% (10/41) | **0%** (자동 생성/린팅) |

---

## 🔗 관련 문서

- [STATISTICS_PAGE_CODING_STANDARDS.md](./STATISTICS_PAGE_CODING_STANDARDS.md) - 통계 페이지 코딩 표준
- [TROUBLESHOOTING_ISANALYZING_BUG.md](./TROUBLESHOOTING_ISANALYZING_BUG.md) - 상태 관리 버그 예방
- [AI-CODING-RULES.md](./AI-CODING-RULES.md) - TypeScript 타입 안전성 규칙

---

## 📝 변경 이력

| 날짜 | 버전 | 변경 내역 |
|------|------|----------|
| 2025-11-05 | 1.0 | 초안 작성 |

---

**다음 작업**: [chi-square](statistical-platform/app/(dashboard)/statistics/chi-square/page.tsx) 및 [non-parametric](statistical-platform/app/(dashboard)/statistics/non-parametric/page.tsx) 페이지 steps 구현 (P0)
