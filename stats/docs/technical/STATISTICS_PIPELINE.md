# STATISTICS_PIPELINE.md

통계 처리 파이프라인 - 스마트 분석에서 결과 표시까지의 전체 흐름

---

## 개요

이 문서는 통계 플랫폼의 **6단계 데이터 처리 파이프라인**을 설명합니다. 사용자가 통계 분석을 선택하고 데이터를 업로드한 후 결과를 받기까지의 전체 과정을 다룹니다.

---

## 전체 처리 단계 (6단계)

```
[1] method-mapping.ts     → 스마트 분석에서 메서드 목록 표시
         ↓
[2] 페이지 라우팅          → /statistics/[method] 페이지로 이동
         ↓
[3] variable-requirements  → 변수 선택 UI 구성 (VariableSelectorModern용)
         ↓
[4] types/statistics.ts   → 결과 데이터 타입 정의
         ↓
[5] PyodideWorker         → Python에서 실제 통계 계산 수행
         ↓
[6] 결과 표시              → StatisticalResultCard 등으로 결과 렌더링
```

---

## Stage 1: 메서드 선택 (Method Selection)

### 목적
사용자가 분석할 통계 방법을 선택하는 단계입니다.

### 관련 파일
- **파일**: `lib/statistics/method-mapping.ts` (764줄)

### 주요 구성 요소

```typescript
// 50개 통계 메서드 정의
export const STATISTICAL_METHODS: StatisticalMethod[] = [
  {
    id: 'one-way-anova',
    name: '일원분산분석',
    category: 'anova',
    requirements: {
      minSampleSize: 6,
      variableTypes: ['numeric', 'categorical'],
      assumptions: ['정규성', '등분산성']
    }
  },
  // ... 49개 더
]

// 4개 질문 유형 카테고리
export const QUESTION_TYPES = [
  { id: 'comparison', methods: ['t-test', 'anova', 'nonparametric'] },
  { id: 'relationship', methods: ['correlation', 'regression'] },
  { id: 'frequency', methods: ['chi-square', 'descriptive'] },
  { id: 'advanced', methods: ['pca', 'clustering', 'timeseries'] }
]
```

### 출력
- 메서드 메타데이터 객체 (id, name, category, requirements)

---

## Stage 2: 페이지 라우팅 (Page Routing)

### 목적
선택한 메서드에 해당하는 통계 페이지로 이동합니다.

### 관련 파일
- **경로**: `app/(dashboard)/statistics/{method}/page.tsx`
- **총 43개 통계 페이지**

### 페이지 목록 (43개)

```
ancova, anova, binomial-test, chi-square, chi-square-goodness,
chi-square-independence, cluster, cochran-q, correlation,
descriptive, discriminant, dose-response, explore-data,
factor-analysis, friedman, kruskal-wallis, ks-test,
mann-kendall, mann-whitney, manova, mcnemar, means-plot,
mixed-model, mood-median, non-parametric, normality-test,
one-sample-t, ordinal-regression, partial-correlation, pca,
poisson, power-analysis, proportion-test, regression,
reliability, repeated-measures-anova, response-surface,
runs-test, sign-test, stepwise, t-test, welch-t, wilcoxon
```

### 라우팅 예시
- 사용자 선택: "일원분산분석"
- 이동 경로: `/statistics/anova`

---

## Stage 3: 변수 요구사항 매핑 (Variable Requirements Mapping)

### 목적
선택한 통계 방법에 필요한 변수 유형과 역할을 정의하여 UI를 구성합니다.

### 관련 파일
- **파일**: `lib/statistics/variable-requirements.ts` (1,455줄)

### variable-requirements.ts vs 통계 페이지

| 항목 | 개수 | 설명 |
|------|------|------|
| **통계 페이지** | 43개 | 사용자가 접근하는 URL 경로 |
| **메서드 요구사항** | 48개 | 각 통계 기법의 변수 정의 |

**차이 이유**: 하나의 페이지가 여러 메서드를 포함
- `/correlation` 페이지 → pearson, spearman, kendall (3개 메서드)
- `/regression` 페이지 → simple, multiple, logistic 등 (여러 메서드)
- `/t-test` 페이지 → two-sample, paired 등

**참고**: `/data-tools/`로 이동된 메서드 2개 (frequency-table, cross-tabulation)

### 변수 역할 타입 (SPSS/R/SAS 표준)

| Role | 설명 | 예시 | types.ts 필드 |
|------|------|------|---------------|
| `dependent` | 종속변수 (Y) | 시험점수, 키 | `dependent: string` 또는 `string[]` |
| `independent` | 독립변수 (X) | 광고비, 나이 | `independent: string[]` |
| `factor` | 요인 (그룹 변수) | 성별, 교육방법 | `factor: string[]` |
| `covariate` | 공변량 (통제변수) | 사전점수 | `covariate?: string[]` |
| `blocking` | 무선효과 변수 | 학교ID | `blocking?: string[]` |
| `within` | 반복측정 변수 | 시점1, 시점2 | `within: string[]` |
| `between` | 개체간 요인 | 처치그룹 | `between: string[]` |
| `time` | 시간 변수 | 월, 연도 | `time: string` |
| `weight` | 가중치 | 표본가중치 | `weight?: string` |

**주의**: types.ts 필드 타입은 메서드별로 다를 수 있음 (단일/복수, 필수/선택)

### 구조 예시 (ANOVA)

```typescript
export const STATISTICAL_METHOD_REQUIREMENTS: StatisticalMethodRequirements[] = [
  {
    id: 'one-way-anova',
    name: '일원분산분석',
    category: 'glm',
    minSampleSize: 6,
    variables: [
      {
        role: 'dependent',
        label: '종속 변수',
        types: ['continuous'],
        required: true,
        multiple: false,
        description: '비교할 연속형 변수'
      },
      {
        role: 'factor',
        label: '요인 (독립변수)',
        types: ['categorical'],
        required: true,
        multiple: false,
        description: '3개 이상 수준을 가진 요인'
      }
    ]
  }
]
```

### CRITICAL 규칙

- **variable-requirements.ts의 `role` 필드가 "단일 진실 공급원"**
- types/statistics.ts는 이를 정확히 반영해야 함
- 예: `role: 'factor'` → `types/statistics.ts: factor: string[]`
- 금지: `groups: string[]` (다른 필드명 사용 불가)

### 출력
- 변수 요구사항 객체 (VariableSelectorModern 컴포넌트용)

---

## Stage 4: 타입 정의 및 UI 렌더링 (Type Definition & UI Rendering)

### 목적
TypeScript 타입을 중앙에서 정의하여 타입 안전성을 보장합니다.

### 관련 파일
- **파일**: `types/statistics.ts` (587줄)

### 타입 정의 예시

```typescript
// 변수 타입 정의
export interface ANOVAVariables {
  /** 종속변수 */
  dependent: string
  /** 요인 변수 (variable-requirements.ts: role: 'factor') */
  factor: string[]
  /** 공변량 (variable-requirements.ts: role: 'covariate') */
  covariate?: string[]
}

// 결과 타입 정의
export interface ANOVAResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  etaSquared: number
  groups: GroupStatistics[]
  postHoc?: PostHocResult
}

export interface PostHocComparison {
  group1: string
  group2: string
  meanDiff: number
  pValue: number
  ciLower?: number
  ciUpper?: number
  significant: boolean
}
```

### 규칙

| 규칙 | 올바른 예 | 잘못된 예 |
|------|----------|----------|
| 필드명 | camelCase | snake_case |
| 예시 | `pValue`, `ciLower` | `p_value`, `ci_lower` |
| 타입 정의 위치 | types/statistics.ts | 페이지별 로컬 정의 |

### 페이지 구조 예시

```typescript
'use client'

import { useStatisticsPage } from '@/hooks/use-statistics-page'
import type { ANOVAVariables } from '@/types/statistics'

export default function ANOVAPage() {
  // 1. 상태 관리 (useStatisticsPage hook 사용)
  const {
    variables,
    setVariables,
    results,
    isAnalyzing,
    analyze
  } = useStatisticsPage('one-way-anova')

  // 2. 분석 핸들러
  const handleAnalyze = useCallback(async () => {
    await analyze(variables as ANOVAVariables)
  }, [variables, analyze])

  // 3. UI 렌더링
  return (
    <TwoPanelLayout>
      <DataUploadStep />
      <VariableSelectionPanel />
      <StatisticsTable results={results} />
    </TwoPanelLayout>
  )
}
```

### 출력
- 변수 선택값 객체 (사용자 입력)

---

## Stage 5: Worker 호출 및 Python 계산 (Worker Invocation & Python Computation)

### 목적
Python Worker에서 실제 통계 계산을 수행합니다.

### 관련 파일

| 파일 | 경로 | 용도 |
|------|------|------|
| PyodideWorker.enum.ts | `lib/services/pyodide/core/` | 4개 Worker 번호 정의 |
| method-metadata.ts | `lib/statistics/registry/` | 메서드→Worker 매핑 |
| pyodide-core.service.ts | `lib/services/pyodide/core/` | Worker 호출 관리 |
| worker*.py | `public/workers/python/` | 실제 계산 (4개 파일) |

### 5-1. Worker 번호 결정

```typescript
// PyodideWorker Enum (4개 Worker)
export enum PyodideWorker {
  Descriptive = 1,           // 기술통계
  Hypothesis = 2,            // 가설검정
  NonparametricAnova = 3,    // 비모수 + ANOVA
  RegressionAdvanced = 4     // 회귀 + 고급분석
}
```

### 5-2. Worker 메서드 매핑

| Worker | 번호 | 대표 메서드 |
|--------|------|-------------|
| Descriptive | 1 | descriptive_stats, normality_test, shapiro_wilk, frequency |
| Hypothesis | 2 | t_test, chi_square, correlation, binomial_test, z_test |
| NonparametricAnova | 3 | mann_whitney, kruskal_wallis, one_way_anova, friedman, tukey_hsd |
| RegressionAdvanced | 4 | linear_regression, pca, cluster, factor_analysis, discriminant |

**참고**: Worker별 전체 메서드 목록은 Python Worker 파일과 method-metadata.ts 참조

### 5-3. callWorkerMethod 호출 예시

```typescript
// ANOVA 페이지에서의 실제 호출
const workerResult = await pyodideCore.callWorkerMethod<{
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  groups: Array<{name: string; mean: number; std: number; n: number}>
}>(
  PyodideWorker.NonparametricAnova,  // Worker 3
  'one_way_anova',                   // Python 함수명
  {
    data: selectedDependentData,     // 종속변수 데이터
    groups: groupLabels,             // 그룹 레이블
    alpha: 0.05
  }
)
```

### 5-4. Python Worker 구현 예시

```python
# public/workers/python/worker3-nonparametric-anova.py
def one_way_anova(
    data: List[List[Union[float, int, None]]],
    groups: List[str],
    alpha: float = 0.05
) -> Dict[str, Any]:
    """
    일원분산분석 계산

    Args:
        data: 각 그룹의 데이터 리스트 (2D 배열)
        groups: 그룹 레이블 리스트
        alpha: 유의수준

    Returns:
        분석 결과 딕셔너리
    """
    from scipy.stats import f_oneway
    from statsmodels.stats.multicomp import pairwise_tukeyhsd

    # 1. 데이터 정제
    cleaned_groups = [clean_array(g) for g in data]

    # 2. ANOVA 계산 (SciPy 사용)
    f_stat, p_value = f_oneway(*cleaned_groups)

    # 3. 효과 크기 계산
    eta_squared = calculate_eta_squared(...)

    # 4. 사후검정 (Tukey HSD)
    tukey_result = pairwise_tukeyhsd(endog=all_data, groups=group_labels)

    return {
        'fStatistic': float(f_stat),
        'pValue': float(p_value),
        'etaSquared': float(eta_squared),
        'groups': [
            {'name': group, 'mean': mean, 'std': std, 'n': n}
            for group, mean, std, n in zip(...)
        ],
        'postHoc': {
            'method': 'Tukey HSD',
            'comparisons': [...]
        }
    }
```

### 출력
- Python 계산 결과 (JSON 형식)

---

## Stage 6: 결과 처리 및 UI 표시 (Result Processing & UI Display)

### 목적
Worker의 계산 결과를 가공하여 사용자에게 표시합니다.

### 결과 처리 흐름

```typescript
// 1. Worker 결과 수신
const workerResult = await pyodideCore.callWorkerMethod<ANOVAResult>(...)

// 2. 결과 가공
const processedResults: ANOVAResults = {
  fStatistic: workerResult.fStatistic,
  pValue: workerResult.pValue,
  dfBetween: workerResult.dfBetween,
  dfWithin: workerResult.dfWithin,
  groups: workerResult.groups.map(g => ({
    name: g.name,
    mean: g.mean,
    std: g.std,
    n: g.n,
    se: g.std / Math.sqrt(g.n)
  })),
  postHoc: workerResult.postHoc
}

// 3. 상태 업데이트
setResults(processedResults)

// 4. UI 렌더링
return (
  <TwoPanelLayout>
    {/* 기술통계 테이블 */}
    <StatisticsTable
      data={processedResults.groups}
      columns={['name', 'mean', 'std', 'n', 'se']}
    />

    {/* 시각화 */}
    <BarChart data={processedResults.groups} />

    {/* 사후검정 결과 */}
    <PostHocTable comparisons={processedResults.postHoc.comparisons} />

    {/* 효과 크기 */}
    <EffectSizeCard
      name="Eta Squared"
      value={processedResults.etaSquared}
    />
  </TwoPanelLayout>
)
```

### UI 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| StatisticsTable | 결과 테이블 표시 (공통) |
| EffectSizeCard | 효과 크기 표시 (공통) |
| PostHocTable | 사후검정 결과 |
| BarChart | 그룹별 평균 비교 |
| AssumptionsPanel | 가정 검정 결과 |

### 출력
- 최종 분석 결과 (사용자에게 표시)

---

## 실제 데이터 흐름 예시: t-test 분석

### 입력 데이터

```
변수 선택:
  - 종속변수: height (키)
  - 요인변수: gender (남/여)

데이터:
  Male: [170, 175, 180, 172, 178]
  Female: [160, 165, 162, 168, 161]
```

### Stage별 처리

**Stage 1**: method-mapping.ts에서 'two-sample-t' 선택
```javascript
{
  id: 'two-sample-t',
  name: '독립표본 t-검정',
  requirements: { minSampleSize: 4 }
}
```

**Stage 2**: 페이지 라우팅
```
/statistics/two-sample-t
```

**Stage 3**: variable-requirements.ts에서 변수 요구사항 조회
```javascript
{
  variables: [
    { role: 'dependent', types: ['continuous'] },
    { role: 'factor', types: ['categorical'] }
  ]
}
```

**Stage 4**: types/statistics.ts에서 타입 정의
```typescript
interface TTestVariables {
  dependent: string       // "height"
  factor: string[]        // ["gender"]
}
```

**Stage 5**: Worker 호출
```typescript
const result = await pyodideCore.callWorkerMethod<TTestResult>(
  PyodideWorker.Hypothesis,      // Worker 2
  't_test_two_sample',
  {
    group1: [170, 175, 180, 172, 178],
    group2: [160, 165, 162, 168, 161],
    equal_var: true
  }
)

// Worker 반환:
{
  tStatistic: 4.52,
  pValue: 0.0012,
  mean1: 175.0,
  mean2: 163.2,
  cohensD: 1.87,
  n1: 5,
  n2: 5
}
```

**Stage 6**: 결과 표시
```
t-statistic: 4.52
p-value: 0.0012 (유의)
Cohen's d: 1.87 (큰 효과)

평균 차이: 11.8 (95% CI: [7.2, 16.4])

결론: 남성이 여성보다 유의하게 더 크다 (p < 0.05)
```

---

## 파일 참조 테이블

| Stage | 파일 | 경로 | 라인 수 |
|-------|------|------|--------|
| 1 | method-mapping.ts | lib/statistics/ | 764 |
| 2 | page.tsx (43개) | app/(dashboard)/statistics/{method}/ | 각 500-800 |
| 3 | variable-requirements.ts | lib/statistics/ | 1,455 |
| 4 | statistics.ts | types/ | 587 |
| 5 | pyodide-worker.enum.ts | lib/services/pyodide/core/ | 97 |
| 5 | method-metadata.ts | lib/statistics/registry/ | 500+ |
| 5 | pyodide-core.service.ts | lib/services/pyodide/core/ | 400+ |
| 5 | worker1-descriptive.py | public/workers/python/ | 300+ |
| 5 | worker2-hypothesis.py | public/workers/python/ | 400+ |
| 5 | worker3-nonparametric-anova.py | public/workers/python/ | 500+ |
| 5 | worker4-regression-advanced.py | public/workers/python/ | 600+ |
| 6 | 공통 컴포넌트 | components/statistics/ | 다수 |

---

## 개발자 가이드: 새 통계 페이지 추가

### Step 1: method-mapping.ts에 메서드 추가

```typescript
{
  id: 'new-method',
  name: '새로운 분석',
  category: 'anova',
  requirements: {
    minSampleSize: 10,
    variableTypes: ['numeric', 'categorical'],
    assumptions: ['정규성']
  }
}
```

### Step 2: variable-requirements.ts에 변수 요구사항 추가

```typescript
{
  id: 'new-method',
  name: '새로운 분석',
  variables: [
    { role: 'dependent', label: '종속변수', types: ['continuous'], required: true }
  ]
}
```

### Step 3: types/statistics.ts에 타입 정의

```typescript
export interface NewMethodVariables {
  dependent: string
}

export interface NewMethodResult {
  statistic: number
  pValue: number
}
```

### Step 4: method-metadata.ts에 Worker 매핑

```typescript
'new-method': {
  worker: PyodideWorker.Hypothesis,
  method: 'new_method_calculation'
}
```

### Step 5: Python Worker에 계산 함수 추가

```python
def new_method_calculation(data, **kwargs):
    # 통계 계산 구현
    return {'statistic': result, 'pValue': p}
```

### Step 6: 페이지 생성

```typescript
// app/(dashboard)/statistics/new-method/page.tsx
export default function NewMethodPage() {
  const { variables, results, analyze } = useStatisticsPage('new-method')
  // ...
}
```

---

## 참고 문서

- [CLAUDE.md](../../CLAUDE.md) - AI 코딩 규칙
- [STATISTICS_CODING_STANDARDS.md](STATISTICS_CODING_STANDARDS.md) - 통계 모듈 코딩 표준
- [AI-CODING-RULES.md](AI-CODING-RULES.md) - TypeScript 코딩 규칙
- [TROUBLESHOOTING_ISANALYZING_BUG.md](TROUBLESHOOTING_ISANALYZING_BUG.md) - 버그 예방 가이드

---

**Updated**: 2025-11-19 | **Version**: 1.0
