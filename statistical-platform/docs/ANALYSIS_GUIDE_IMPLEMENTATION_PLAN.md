# Analysis Guide Implementation Plan

> **Status**: ✅ Complete
> **Created**: 2026-01-27
> **Last Updated**: 2026-01-27
> **Goal**: 48개 통계 페이지에 대한 사용자 가이드 시스템 구현

---

## 1. Overview

### 1.1 목표
- 각 통계 분석 페이지에 **데이터 배열 방식**, **설정값 안내**, **가정 체크리스트** 제공
- `variable-requirements.ts`의 메타데이터를 활용한 일관된 가이드 UI
- **동적 가이드**: 통합 페이지(regression, anova 등)에서 선택된 분석 유형에 따라 가이드 변경

### 1.2 구현 컴포넌트 (4개)

| 컴포넌트 | 용도 | 위치 |
|---------|------|------|
| `AnalysisGuidePanel` | 분석 개요, 변수 요구사항, 가정 표시 | 사이드 패널 또는 접이식 |
| `SettingTooltip` | 개별 설정 옆 ⓘ 아이콘 + 설명 | 설정 입력 옆 |
| `DataFormatGuide` | Wide/Long 형식 시각적 안내 | 데이터 업로드 단계 |
| `AssumptionChecklist` | 분석 전 가정 확인 체크리스트 | 분석 실행 전 |

### 1.3 점검 결과 (2026-01-27)

#### 페이지 vs 메서드 ID 현황

| 항목 | 개수 | 비고 |
|------|------|------|
| 실제 통계 페이지 | **48개** | `app/(dashboard)/statistics/*/page.tsx` |
| 메서드 ID (variable-requirements.ts) | **53개** | 일부 미구현 포함 |
| 매칭됨 | 43개 | 정상 |
| 통합 페이지 | 5개 | regression, anova 등 여러 메서드 통합 |
| 카테고리 상위 페이지 (메서드 ID 없음) | 5개 | descriptive, non-parametric 등 |
| 미구현 메서드 | 5개 | frequency-table, fisher-exact 등 |

#### 핵심 결정 사항

| 이슈 | 결정 | 이유 |
|------|------|------|
| 통합 페이지 가이드 | **동적 가이드** | 선택된 분석 유형에 맞는 정확한 안내 |
| 미구현 메서드 | **유지** | 향후 페이지 추가 시 즉시 사용 가능 |
| 명명 불일치 | **매핑 테이블** | URL 변경 없이 연결 |

---

## 2. Phase 0: 메서드-페이지 매핑 테이블 (신규)

### 2.1 매핑 테이블 생성

**파일**: `lib/constants/method-page-mapping.ts`

```typescript
/**
 * 메서드 ID ↔ 페이지 경로 매핑
 *
 * 사용처:
 * - 가이드 컴포넌트에서 methodId로 메타데이터 조회
 * - 통합 페이지에서 선택된 분석 유형에 따른 동적 가이드
 */

// 메서드 ID → 페이지 경로 (1:1 또는 N:1)
export const METHOD_TO_PAGE: Record<string, string> = {
  // 명명 불일치 해결
  'wilcoxon-signed-rank': 'wilcoxon',
  'kolmogorov-smirnov': 'ks-test',
  'mann-kendall-test': 'mann-kendall',
  'one-sample-proportion': 'proportion-test',
  'reliability-analysis': 'reliability',
  'cluster-analysis': 'cluster',
  'discriminant-analysis': 'discriminant',

  // 통합 페이지 (여러 메서드 → 하나의 페이지)
  'simple-regression': 'regression',
  'multiple-regression': 'regression',
  'logistic-regression': 'regression',
  'one-way-anova': 'anova',
  'two-way-anova': 'anova',
  'three-way-anova': 'anova',
  'pearson-correlation': 'correlation',
  'spearman-correlation': 'correlation',
  'kendall-correlation': 'correlation',
  'descriptive-stats': 'descriptive',
  'frequency-table': 'descriptive',  // 미구현
  'cross-tabulation': 'descriptive', // 미구현
}

// 페이지 경로 → 메서드 ID 목록 (1:N, 통합 페이지용)
export const PAGE_TO_METHODS: Record<string, string[]> = {
  'regression': ['simple-regression', 'multiple-regression', 'logistic-regression'],
  'anova': ['one-way-anova', 'two-way-anova', 'three-way-anova'],
  'correlation': ['pearson-correlation', 'spearman-correlation', 'kendall-correlation'],
  'descriptive': ['descriptive-stats', 'frequency-table', 'cross-tabulation'],
}

// 헬퍼 함수
export function getPagePath(methodId: string): string {
  return METHOD_TO_PAGE[methodId] || methodId
}

export function getMethodIds(pagePath: string): string[] {
  return PAGE_TO_METHODS[pagePath] || [pagePath]
}

export function isIntegratedPage(pagePath: string): boolean {
  return pagePath in PAGE_TO_METHODS
}
```

### 2.2 Phase 0 작업 목록

- [ ] `lib/constants/method-page-mapping.ts` 생성
- [ ] 전체 48개 페이지 매핑 완료
- [ ] 헬퍼 함수 테스트

---

## 3. Phase 1: 메타데이터 스키마 확장

### 2.1 현재 스키마 (variable-requirements.ts)

```typescript
interface StatisticalMethodRequirements {
  id: string
  name: string
  category: string
  description: string
  minSampleSize: number
  maxVariables?: number
  assumptions: string[]
  variables: VariableRequirement[]
  notes?: string[]
}
```

### 2.2 확장 스키마 (추가 필드)

```typescript
interface StatisticalMethodRequirements {
  // ... 기존 필드 ...

  // NEW: 데이터 형식 안내
  dataFormat?: {
    type: 'wide' | 'long' | 'both'
    description: string
    columns: {
      name: string
      description: string
      example: string
    }[]
  }

  // NEW: 설정값 설명
  settings?: {
    [key: string]: {
      label: string
      description: string
      options?: { value: string; label: string; description: string }[]
      default?: string | number
    }
  }

  // NEW: 예시 데이터
  sampleData?: {
    headers: string[]
    rows: (string | number)[][]
  }
}
```

### 2.3 Phase 1 작업 목록

- [ ] `StatisticalMethodRequirements` 인터페이스 확장
- [ ] 헬퍼 함수 추가 (`getDataFormat`, `getSettings`, `getSampleData`)

---

## 3. Phase 2: 컴포넌트 구현

### 3.1 AnalysisGuidePanel

```
┌─────────────────────────────────────────┐
│ 📊 이항 검정 (Binomial Test)      [접기] │
├─────────────────────────────────────────┤
│ 이진 결과의 성공 확률이 특정 값과       │
│ 다른지 검정합니다.                      │
│                                         │
│ 📋 변수 요구사항                        │
│ ┌─────────────────────────────────────┐ │
│ │ • 이진 변수: 1개 (필수)             │ │
│ │   예: Pass/Fail, Yes/No, 0/1        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️ 가정                                 │
│ • 독립 시행                             │
│ • 이진 결과 (성공/실패)                 │
│ • 일정한 성공 확률                      │
│                                         │
│ 💡 최소 표본 크기: 1개                  │
└─────────────────────────────────────────┘
```

**파일**: `components/statistics/common/AnalysisGuidePanel.tsx`

**Props**:
```typescript
interface AnalysisGuidePanelProps {
  methodId: string
  collapsible?: boolean
  defaultCollapsed?: boolean
}
```

### 3.2 SettingTooltip

```
귀무가설 확률 ⓘ ───────────────────┐
                                    │
[  0.5  ]                           │
                                    ▼
                    ┌─────────────────────────────┐
                    │ 검정하고자 하는 기대 성공   │
                    │ 확률입니다.                 │
                    │                             │
                    │ 예: 동전 던지기의 경우 0.5  │
                    │ (50%)가 기본값입니다.       │
                    └─────────────────────────────┘
```

**파일**: `components/statistics/common/SettingTooltip.tsx`

**Props**:
```typescript
interface SettingTooltipProps {
  label: string
  description: string
  example?: string
  children: React.ReactNode
}
```

### 3.3 DataFormatGuide

```
┌─────────────────────────────────────────────────────┐
│ 📁 데이터 형식 안내                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 이 분석은 Wide Format 데이터가 필요합니다.          │
│                                                     │
│ ✅ 올바른 형식:                                     │
│ ┌──────────┬─────────┐                              │
│ │ ID       │ 결과    │                              │
│ ├──────────┼─────────┤                              │
│ │ 1        │ 성공    │                              │
│ │ 2        │ 실패    │                              │
│ │ 3        │ 성공    │                              │
│ └──────────┴─────────┘                              │
│                                                     │
│ 📌 각 행 = 1개 관측치                               │
│ 📌 '결과' 열에 성공/실패 값                         │
└─────────────────────────────────────────────────────┘
```

**파일**: `components/statistics/common/DataFormatGuide.tsx`

**Props**:
```typescript
interface DataFormatGuideProps {
  methodId: string
}
```

### 3.4 AssumptionChecklist

```
┌─────────────────────────────────────────────────────┐
│ ✓ 분석 전 가정 확인                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ☑ 독립 시행                                         │
│   각 관측치가 서로 독립적인가요?                    │
│                                                     │
│ ☑ 이진 결과                                         │
│   결과가 성공/실패 두 가지인가요?                   │
│                                                     │
│ ☑ 일정한 성공 확률                                  │
│   각 시행의 성공 확률이 동일한가요?                 │
│                                                     │
│ [모든 가정 확인됨 ✓]                                │
└─────────────────────────────────────────────────────┘
```

**파일**: `components/statistics/common/AssumptionChecklist.tsx`

**Props**:
```typescript
interface AssumptionChecklistProps {
  methodId: string
  onAllChecked?: (allChecked: boolean) => void
  required?: boolean
}
```

### 3.5 Phase 2 작업 목록

- [ ] `AnalysisGuidePanel.tsx` 구현
- [ ] `SettingTooltip.tsx` 구현
- [ ] `DataFormatGuide.tsx` 구현
- [ ] `AssumptionChecklist.tsx` 구현
- [ ] 스토리북/Design System 쇼케이스에 추가

---

## 4. Phase 3: 시범 적용 (2개 메서드)

### 4.1 대상 메서드

| 메서드 | 이유 |
|--------|------|
| `binomial-test` | 가장 단순, 설정값 있음 (probability, alternative) |
| `two-sample-t` | 그룹 비교 대표, 가정 검정 중요 |

### 4.2 binomial-test 메타데이터 확장

```typescript
{
  id: 'binomial-test',
  name: '이항 검정',
  // ... 기존 필드 ...

  dataFormat: {
    type: 'wide',
    description: '각 행이 하나의 관측치를 나타냅니다.',
    columns: [
      { name: 'ID', description: '관측치 식별자', example: '1, 2, 3...' },
      { name: '결과', description: '성공/실패 값', example: '성공, 실패 또는 1, 0' }
    ]
  },

  settings: {
    probability: {
      label: '귀무가설 확률',
      description: '검정하고자 하는 기대 성공 확률입니다. 예: 동전 던지기는 0.5',
      default: 0.5
    },
    alternative: {
      label: '대립가설',
      description: '검정 방향을 선택합니다.',
      options: [
        { value: 'two-sided', label: '양측', description: '성공 확률이 p₀와 다름' },
        { value: 'less', label: '단측 (less)', description: '성공 확률이 p₀보다 작음' },
        { value: 'greater', label: '단측 (greater)', description: '성공 확률이 p₀보다 큼' }
      ],
      default: 'two-sided'
    },
    successValue: {
      label: '성공 기준값',
      description: '어떤 값을 "성공"으로 간주할지 선택합니다.',
      default: null
    }
  },

  sampleData: {
    headers: ['ID', '결과'],
    rows: [
      [1, '성공'],
      [2, '실패'],
      [3, '성공'],
      [4, '성공'],
      [5, '실패']
    ]
  }
}
```

### 4.3 Phase 3 작업 목록

- [ ] `binomial-test` 메타데이터 확장
- [ ] `two-sample-t` 메타데이터 확장
- [ ] 해당 페이지에 가이드 컴포넌트 적용
- [ ] 사용자 피드백 수집

---

## 5. Phase 4: 전체 메서드 확장

### 5.1 카테고리별 메서드 목록 (53개)

#### 기술통계 (descriptive) - 5개
- [ ] descriptive-stats
- [ ] frequency-table
- [ ] cross-tabulation
- [ ] explore-data
- [ ] reliability-analysis

#### 평균 비교 (compare) - 6개
- [ ] one-sample-t
- [ ] two-sample-t ⭐ Phase 3
- [ ] paired-t
- [ ] welch-t
- [ ] one-sample-proportion
- [ ] means-plot

#### 일반선형모델 (glm) - 8개
- [ ] one-way-anova
- [ ] two-way-anova
- [ ] three-way-anova
- [ ] ancova
- [ ] repeated-measures-anova
- [ ] manova
- [ ] mixed-model
- [ ] response-surface

#### 상관분석 (correlate) - 4개
- [ ] pearson-correlation
- [ ] spearman-correlation
- [ ] kendall-correlation
- [ ] partial-correlation

#### 회귀분석 (regression) - 6개
- [ ] simple-regression
- [ ] multiple-regression
- [ ] stepwise-regression
- [ ] logistic-regression
- [ ] ordinal-regression
- [ ] poisson-regression

#### 비모수 검정 (nonparametric) - 13개
- [ ] mann-whitney
- [ ] wilcoxon-signed-rank
- [ ] kruskal-wallis
- [ ] friedman
- [ ] sign-test
- [ ] runs-test
- [ ] kolmogorov-smirnov
- [ ] mcnemar
- [ ] cochran-q
- [ ] mood-median
- [ ] binomial-test ⭐ Phase 3
- [ ] mann-kendall-test

#### 카이제곱 검정 (chi-square) - 3개
- [ ] chi-square-independence
- [ ] chi-square-goodness
- [ ] fisher-exact

#### 고급분석 (advanced) - 4개
- [ ] factor-analysis
- [ ] pca
- [ ] cluster-analysis
- [ ] discriminant-analysis

#### 생존분석 (survival) - 2개
- [ ] kaplan-meier
- [ ] cox-regression

#### 시계열 분석 (timeseries) - 3개
- [ ] arima
- [ ] seasonal-decompose
- [ ] stationarity-test

### 5.2 우선순위

1. **High**: 자주 사용, 설정값 많음 (t-test, ANOVA, 회귀분석)
2. **Medium**: 가정 중요 (비모수 검정, 카이제곱)
3. **Low**: 고급 분석 (요인분석, 생존분석)

---

## 6. 일정 (예상)

| Phase | 작업 | 예상 소요 |
|-------|------|----------|
| Phase 1 | 스키마 확장 | 1시간 |
| Phase 2 | 컴포넌트 4개 구현 | 3-4시간 |
| Phase 3 | 시범 적용 (2개) | 2시간 |
| Phase 4 | 전체 확장 | 카테고리별 진행 |

---

## 7. 진행 상황 추적

### 🎉 모든 Phase 완료!

| Phase | 작업 | 완료일 |
|-------|------|--------|
| Phase 1 | 메타데이터 스키마 확장 (56개 메서드) | 2026-01-27 |
| Phase 2 | 컴포넌트 5개 구현 | 2026-01-27 |
| Phase 3 | binomial-test 시범 적용 | 2026-01-27 |
| Phase 4 | 전체 페이지 적용 (45/49) | 2026-01-27 |

#### Phase 1: 메타데이터 확장 (✅ 완료)

- [x] `StatisticalMethodRequirements` 인터페이스에 `dataFormat`, `settings`, `sampleData` 추가
- [x] 56개 메서드 전체 확장 완료
- [x] 테스트 138개 통과

#### Phase 2: 컴포넌트 구현 (✅ 완료)

- [x] `useAnalysisGuide` 훅 구현 (`hooks/use-analysis-guide.ts`)
- [x] `AnalysisGuidePanel` 구현 (`components/statistics/common/AnalysisGuidePanel.tsx`)
- [x] `DataFormatGuide` 구현 (`components/statistics/common/DataFormatGuide.tsx`)
- [x] `SettingTooltip` 구현 (`components/statistics/common/SettingTooltip.tsx`)
- [x] `AssumptionChecklist` 구현 (`components/statistics/common/AssumptionChecklist.tsx`)

#### Phase 3: 시범 적용 (✅ 완료)

- [x] `binomial-test` 페이지에 가이드 컴포넌트 적용

#### Phase 4: 전체 페이지 적용 (✅ 완료)

- [x] 45개 통계 페이지에 `useAnalysisGuide` 훅 적용
- [x] 미적용 4개는 카테고리/목록 페이지 (가이드 불필요)
  - `statistics/page.tsx` - 메인 목록
  - `non-parametric/page.tsx` - 카테고리 페이지
  - `descriptive/page.tsx` - 카테고리 페이지
  - `explore-data/page.tsx` - 데이터 탐색 페이지

---

**Last Updated**: 2026-01-27
**Completed**: 2026-01-27