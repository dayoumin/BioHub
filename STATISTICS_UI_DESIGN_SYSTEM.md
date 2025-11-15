# 통계 플랫폼 UI 디자인 시스템

**작성일**: 2025-11-15
**목표**: 45개 통계 페이지 전체에 재사용 가능한 디자인 시스템 구축
**핵심 원칙**: 디자인 토큰 + 공통 컴포넌트 + 확장 가능성

---

## 📋 목차

1. [디자인 토큰 (Design Tokens)](#1-디자인-토큰-design-tokens)
2. [공통 컴포넌트 라이브러리](#2-공통-컴포넌트-라이브러리)
3. [레이아웃 시스템](#3-레이아웃-시스템)
4. [재사용성 전략](#4-재사용성-전략)
5. [마이그레이션 계획](#5-마이그레이션-계획)
6. [문서화 구조](#6-문서화-구조)

---

## 1. 디자인 토큰 (Design Tokens)

### 1.1 간격 시스템 (Spacing Scale)

**파일**: `lib/design-system/tokens/spacing.ts`

```typescript
/**
 * 통계 플랫폼 간격 시스템
 * Tailwind CSS 기본값 기반, 일관성 유지
 */
export const spacing = {
  // 기본 간격
  xs: '0.25rem',   // 4px  - gap-1
  sm: '0.5rem',    // 8px  - gap-2
  md: '1rem',      // 16px - gap-4 ⭐ 가장 많이 사용
  lg: '1.5rem',    // 24px - gap-6
  xl: '2rem',      // 32px - gap-8
  '2xl': '3rem',   // 48px - gap-12

  // 레이아웃 전용
  sidebar: '12rem',        // 192px - StepSidebar 고정 너비
  panelMin: '25rem',       // 400px - 우측 패널 최소 너비
  panelMax: '37.5rem',     // 600px - 우측 패널 최대 너비
  panelDefault: '40%',     // 우측 패널 기본 너비 (반응형)
} as const

/**
 * 사용 예제:
 * <div className="gap-4">        // 16px 간격 (가장 일반적)
 * <div className="gap-6">        // 24px 간격 (섹션 간)
 * <aside className="w-48">       // 192px (StepSidebar)
 */
```

**적용 범위**: 모든 Card, Grid, Flex 레이아웃

---

### 1.2 타이포그래피 시스템 (Typography Scale)

**파일**: `lib/design-system/tokens/typography.ts`

```typescript
/**
 * 통계 플랫폼 타이포그래피 계층
 * JASP/jamovi 스타일 참고 (명확성 최우선)
 */
export const typography = {
  // 페이지 제목 (예: "회귀분석")
  h1: {
    size: '1.5rem',      // 24px - text-2xl
    weight: 700,         // font-bold
    lineHeight: 1.2,
    usage: '페이지 최상단 제목만 사용'
  },

  // 섹션 헤더 (예: "변수 선택", "분석 결과")
  h2: {
    size: '1.25rem',     // 20px - text-xl ⭐ 표준 섹션 제목
    weight: 600,         // font-semibold
    lineHeight: 1.3,
    usage: '카드 제목, 섹션 헤더'
  },

  // 서브섹션 (예: "독립변수", "종속변수")
  h3: {
    size: '1.125rem',    // 18px - text-lg
    weight: 600,         // font-semibold
    lineHeight: 1.4,
    usage: '변수 그룹 제목, 탭 라벨'
  },

  // 본문 텍스트
  body: {
    size: '0.875rem',    // 14px - text-sm
    weight: 400,         // font-normal
    lineHeight: 1.5,
    usage: '설명 텍스트, 일반 본문'
  },

  // 작은 텍스트 (Badge, Label 등)
  caption: {
    size: '0.75rem',     // 12px - text-xs
    weight: 400,         // font-normal
    lineHeight: 1.4,
    usage: 'Badge, 메타 정보'
  },

  // 코드/데이터 (Monospace)
  mono: {
    size: '0.875rem',    // 14px - text-sm
    weight: 400,
    lineHeight: 1.6,
    family: 'font-mono',
    usage: '통계 수치, 데이터 테이블'
  }
} as const

/**
 * 사용 예제:
 * <h2 className="text-xl font-semibold">변수 선택</h2>     // 섹션 제목
 * <h3 className="text-lg font-semibold">독립변수</h3>      // 서브섹션
 * <p className="text-sm">설명 텍스트</p>                   // 본문
 * <Badge className="text-xs">숫자형</Badge>                 // 작은 텍스트
 * <span className="font-mono text-sm">172.5</span>         // 통계 수치
 */
```

**적용 범위**: CardTitle, SectionHeader, Badge, TableCell

---

### 1.3 색상 시스템 (Color Palette)

**파일**: `lib/design-system/tokens/colors.ts`

```typescript
/**
 * 통계 플랫폼 색상 시스템
 * shadcn/ui 기본 색상 + 통계 전용 색상
 */
export const colors = {
  // 주요 색상 (Primary Actions)
  primary: {
    DEFAULT: 'hsl(var(--primary))',         // 주요 버튼, 액센트
    foreground: 'hsl(var(--primary-foreground))',
    usage: '분석하기 버튼, 선택된 변수'
  },

  // 보조 색상 (Secondary Elements)
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
    usage: '비활성 버튼, 배경색'
  },

  // 통계 전용 색상 (Semantic Colors)
  stats: {
    significant: {
      bg: 'hsl(142, 76%, 36%)',      // 유의미 결과 (p < 0.05)
      text: 'hsl(142, 76%, 96%)',
      usage: 'p-value < 0.05 표시 (통계적으로 유의함)'
    },
    notSignificant: {
      bg: 'hsl(215, 15%, 70%)',      // 유의미하지 않음 (p >= 0.05) - 중립 회색
      text: 'hsl(215, 15%, 25%)',
      usage: 'p-value >= 0.05 표시 (통계적으로 유의하지 않음, 중립적 사실)'
    },
    neutral: {
      bg: 'hsl(215, 20%, 65%)',      // 중립 (정보성)
      text: 'hsl(215, 20%, 98%)',
      usage: '일반 통계 정보'
    }
  },

  // 상태 색상 (Status Colors)
  status: {
    success: 'hsl(142, 76%, 36%)',   // 성공 (분석 완료)
    warning: 'hsl(38, 92%, 50%)',    // 경고 (누락 데이터)
    error: 'hsl(0, 84%, 60%)',       // 에러 (분석 실패)
    info: 'hsl(199, 89%, 48%)',      // 정보 (도움말)
  },

  // 데이터 시각화 색상 (Chart Colors)
  chart: {
    categorical: [
      'hsl(221, 83%, 53%)',  // 파랑
      'hsl(142, 76%, 36%)',  // 초록
      'hsl(38, 92%, 50%)',   // 주황
      'hsl(262, 83%, 58%)',  // 보라
      'hsl(0, 84%, 60%)',    // 빨강
    ],
    sequential: {
      start: 'hsl(199, 89%, 95%)',   // 연한 파랑
      end: 'hsl(199, 89%, 48%)',     // 진한 파랑
    }
  }
} as const

/**
 * 사용 예제:
 * <Button className="bg-primary">분석하기</Button>         // 주요 액션
 * <Badge variant="destructive">p < 0.05</Badge>           // 유의미 결과
 * <div className="bg-amber-500/10">경고 메시지</div>       // 경고 배경
 */
```

**적용 범위**: Button, Badge, Chart, StatusIndicator

---

### 1.4 그림자 시스템 (Shadow Scale)

**파일**: `lib/design-system/tokens/shadows.ts`

```typescript
/**
 * 통계 플랫폼 그림자 시스템
 * Glassmorphism 효과 포함
 */
export const shadows = {
  // 카드 그림자
  card: {
    default: '0 1px 3px 0 rgb(0 0 0 / 0.1)',               // shadow-sm
    hover: '0 4px 6px -1px rgb(0 0 0 / 0.1)',             // shadow-md
    active: '0 10px 15px -3px rgb(0 0 0 / 0.1)',          // shadow-lg
  },

  // Glassmorphism 효과 (DataPreviewPanel, KPICard)
  glass: {
    blur: 'blur(8px)',                                     // backdrop-blur-sm
    gradient: 'from-primary/5 via-transparent to-accent/5',
    border: 'border-border/50',
  },

  // CTA 버튼 강조 (분석하기 버튼)
  cta: {
    default: '0 4px 6px -1px rgb(var(--primary) / 0.3)',
    hover: '0 10px 15px -3px rgb(var(--primary) / 0.4)',
  }
} as const

/**
 * 사용 예제:
 * <Card className="shadow-sm hover:shadow-md">...</Card>
 * <div className="backdrop-blur-sm bg-gradient-to-br from-primary/5">...</div>
 * <Button className="shadow-[0_4px_6px_-1px_rgb(var(--primary)/0.3)]">분석하기</Button>
 */
```

**적용 범위**: Card, Button, Modal, Panel

---

## 2. 공통 컴포넌트 라이브러리

### 2.1 레이아웃 컴포넌트

#### 2.1.1 ThreePanelLayout (최우선)

**파일**: `components/statistics/layouts/ThreePanelLayout.tsx`

```typescript
/**
 * 45개 통계 페이지 공통 레이아웃
 * 3-Panel 구조: Steps Sidebar | Main Content | Preview/Results Panel
 */
interface ThreePanelLayoutProps {
  // 좌측 사이드바
  currentStep: number
  steps: Array<{ id: number; label: string }>
  onStepChange?: (step: number) => void

  // 메인 콘텐츠
  children: React.ReactNode

  // 우측 패널 (동적 전환)
  rightPanel: {
    mode: 'preview' | 'results'  // 데이터 미리보기 or 분석 결과
    previewData?: Array<Record<string, unknown>>
    results?: unknown
  }

  // 선택적 설정
  className?: string
  enableResize?: boolean  // 우측 패널 크기 조절 가능 여부
}

/**
 * 사용 예제:
 * <ThreePanelLayout
 *   currentStep={2}
 *   steps={[
 *     { id: 1, label: '데이터 업로드' },
 *     { id: 2, label: '변수 선택' },
 *     { id: 3, label: '분석 결과' }
 *   ]}
 *   rightPanel={{
 *     mode: currentStep < 3 ? 'preview' : 'results',
 *     previewData: uploadedData?.data,
 *     results: analysisResults
 *   }}
 * >
 *   {/* 페이지별 커스텀 콘텐츠 */}
 *   <VariableSelector ... />
 * </ThreePanelLayout>
 */
```

**재사용성**: 모든 통계 페이지에서 동일한 Props 인터페이스 사용

---

#### 2.1.2 StepSidebar (좌측 네비게이션)

**파일**: `components/statistics/layouts/StepSidebar.tsx`

```typescript
/**
 * 좌측 단계별 네비게이션 사이드바
 * 고정 너비 192px (w-48)
 */
interface StepSidebarProps {
  currentStep: number
  steps: Array<{
    id: number
    label: string
    icon?: React.ComponentType<{ className?: string }>
    disabled?: boolean
  }>
  onStepClick?: (step: number) => void
}

/**
 * 디자인 토큰 적용:
 * - 너비: spacing.sidebar (192px)
 * - 간격: spacing.md (16px - gap-4)
 * - 타이포그래피: typography.h3 (text-lg)
 */
```

---

#### 2.1.3 ResizablePanel (우측 패널)

**파일**: `components/statistics/layouts/ResizablePanel.tsx`

```typescript
/**
 * 크기 조절 가능한 우측 패널
 * react-resizable-panels 라이브러리 활용
 */
interface ResizablePanelProps {
  children: React.ReactNode
  defaultSize?: number  // 기본 40%
  minSize?: number      // 최소 400px
  maxSize?: number      // 최대 600px
  enableResize?: boolean
}

/**
 * 디자인 토큰 적용:
 * - 기본 너비: spacing.panelDefault (40%)
 * - 최소 너비: spacing.panelMin (400px)
 * - 최대 너비: spacing.panelMax (600px)
 */
```

---

### 2.2 데이터 표시 컴포넌트

#### 2.2.1 DataPreviewPanel (기존 컴포넌트 개선)

**파일**: `components/statistics/common/DataPreviewPanel.tsx` (이미 존재)

**개선 사항**:
```typescript
// 디자인 토큰 적용
const DESIGN_TOKENS = {
  spacing: {
    cardGap: 'gap-4',          // 16px
    sectionGap: 'gap-6',       // 24px
  },
  typography: {
    title: 'text-lg font-semibold',    // 18px (h3)
    stat: 'text-sm font-mono',         // 14px (mono)
  },
  colors: {
    warningBg: 'bg-amber-500/10',
    warningBorder: 'border-amber-500/20',
  }
}
```

**Props 표준화**:
```typescript
interface DataPreviewPanelProps {
  data: Array<Record<string, unknown>>
  className?: string
  defaultExpanded?: boolean
  maxPreviewRows?: number
  // 신규: 디자인 토큰 오버라이드
  designTokens?: typeof DESIGN_TOKENS
}
```

---

#### 2.2.2 ResultsPanel (신규)

**파일**: `components/statistics/common/ResultsPanel.tsx`

```typescript
/**
 * 분석 결과 표시 패널 (우측 패널)
 * 모든 통계 페이지에서 일관된 결과 레이아웃
 */
interface ResultsPanelProps {
  results: {
    summary?: Array<{ label: string; value: string | number }>
    table?: Array<Record<string, unknown>>
    chart?: {
      type: 'bar' | 'line' | 'scatter'
      data: unknown
    }
    interpretation?: string
  }
  isLoading?: boolean
  error?: string
}

/**
 * 레이아웃 구조:
 * ┌─────────────────────┐
 * │ 📊 주요 통계량      │ ← KPICard 그리드 (2-4개)
 * ├─────────────────────┤
 * │ 📋 상세 통계 테이블 │ ← StatTable
 * ├─────────────────────┤
 * │ 📈 시각화           │ ← Chart (조건부)
 * ├─────────────────────┤
 * │ 💡 해석             │ ← InterpretationCard (조건부)
 * └─────────────────────┘
 */
```

---

#### 2.2.3 KPICard (핵심 지표 카드)

**파일**: `components/statistics/common/KPICard.tsx`

```typescript
/**
 * 주요 통계 지표 표시 카드
 * 예: p-value, R², F-statistic
 */
interface KPICardProps {
  label: string
  value: string | number
  significance?: 'significant' | 'not-significant' | 'neutral'
  tooltip?: string
  trend?: 'up' | 'down' | 'stable'
}

/**
 * 사용 예제:
 * <KPICard
 *   label="p-value"
 *   value={0.023}
 *   significance="significant"
 *   tooltip="귀무가설 기각 (유의수준 0.05)"
 * />
 */
```

**디자인 토큰 적용**:
```typescript
const KPI_DESIGN = {
  spacing: {
    padding: 'p-4',       // 16px
    gap: 'gap-2',         // 8px
  },
  typography: {
    label: 'text-sm text-muted-foreground',  // 14px
    value: 'text-2xl font-bold font-mono',   // 24px
  },
  colors: {
    significant: 'bg-green-500/10 border-green-500/20',
    notSignificant: 'bg-red-500/10 border-red-500/20',
    neutral: 'bg-blue-500/10 border-blue-500/20',
  }
}
```

---

#### 2.2.4 StatTable (통계 테이블)

**파일**: `components/statistics/common/StatTable.tsx`

```typescript
/**
 * 통계 결과 테이블 (ANOVA, 회귀계수 등)
 * shadcn Table 기반, 통계 전용 스타일링
 */
interface StatTableProps {
  headers: Array<{ key: string; label: string; align?: 'left' | 'center' | 'right' }>
  data: Array<Record<string, unknown>>
  highlightSignificant?: boolean  // p-value < 0.05 강조
  precision?: number              // 소수점 자릿수 (기본 3)
}

/**
 * 디자인 토큰 적용:
 * - 헤더: typography.h3 (text-lg font-semibold)
 * - 셀: typography.mono (text-sm font-mono)
 * - 유의미 행: colors.stats.significant (bg-green-500/10)
 */
```

---

### 2.3 인터랙션 컴포넌트

#### 2.3.1 DragDropVariableSelector (개선)

**파일**: `components/statistics/common/DragDropVariableSelector.tsx`

```typescript
/**
 * 변수 선택 드래그앤드롭 컴포넌트
 * 사용자 피드백: "드래그 후 돌아가는 애니메이션 문제" 해결
 */
interface DragDropVariableSelectorProps {
  availableVariables: string[]
  selectedVariables: Record<string, string[]>
  onVariableAssign: (variable: string, zone: string) => void

  // 신규: 시각적 피드백 개선
  feedbackMode?: 'instant' | 'animated'  // 기본 'instant'
  showAssignedIndicator?: boolean        // 할당된 변수에 체크 아이콘 표시
}

/**
 * 개선 사항:
 * 1. 드롭 성공 시 즉시 feedbackMode='instant' (애니메이션 없음)
 * 2. 할당된 변수 목록을 드롭존 내부에 표시 (체크 아이콘 포함)
 * 3. 가용 변수 목록에서 할당된 변수 비활성화 스타일 적용
 */
```

**디자인 토큰 적용**:
```typescript
const DRAG_DROP_DESIGN = {
  spacing: {
    gap: 'gap-3',           // 12px (변수 간 간격)
    dropZonePadding: 'p-4', // 16px
  },
  typography: {
    variableLabel: 'text-sm font-medium',  // 14px
    dropZoneTitle: 'text-lg font-semibold', // 18px
  },
  colors: {
    available: 'bg-secondary hover:bg-secondary/80',
    assigned: 'bg-primary/10 text-muted-foreground',
    dropZone: 'border-2 border-dashed border-primary/30',
    dropZoneActive: 'border-primary bg-primary/5',
  }
}
```

---

#### 2.3.2 CTAButton (분석 실행 버튼)

**파일**: `components/statistics/common/CTAButton.tsx`

```typescript
/**
 * 주요 액션 버튼 (Call-to-Action)
 * 예: "분석하기", "결과 다운로드"
 */
interface CTAButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'large'
  loading?: boolean
  icon?: React.ComponentType<{ className?: string }>
}

/**
 * 디자인 토큰 적용:
 * - 크기: size='large' → py-3 px-6 text-base (16px)
 * - 그림자: shadows.cta.default → hover:shadows.cta.hover
 * - 색상: bg-primary hover:bg-primary/90
 */
```

**사용 예제**:
```typescript
<CTAButton
  size="large"
  loading={isAnalyzing}
  icon={PlayIcon}
  onClick={handleAnalysis}
>
  분석하기
</CTAButton>
```

**스타일**:
```css
/* 기본 스타일 */
.cta-button-large {
  padding: 0.75rem 1.5rem;        /* py-3 px-6 */
  font-size: 1rem;                /* text-base (16px) */
  font-weight: 600;               /* font-semibold */
  box-shadow: 0 4px 6px -1px rgb(var(--primary) / 0.3);
}

.cta-button-large:hover {
  box-shadow: 0 10px 15px -3px rgb(var(--primary) / 0.4);
  transform: translateY(-1px);
}
```

---

## 3. 레이아웃 시스템

### 3.1 3-Panel Adaptive Layout (권장)

**구조**:
```
┌────────────┬──────────────────────┬────────────────────┐
│ Steps      │ Main Content         │ Preview/Results    │
│ (192px)    │ (Flexible 40-60%)    │ (40%, 400-600px)   │
│            │                      │                    │
│ 1. Upload  │ [현재 단계 콘텐츠]    │ DataPreviewPanel   │
│ 2. Select  │                      │ or                 │
│ 3. Results │ - 변수 선택           │ ResultsPanel       │
│            │ - 옵션 설정           │                    │
│            │ - CTA 버튼           │ [자동 전환]        │
└────────────┴──────────────────────┴────────────────────┘
```

**반응형 동작**:
- **Desktop (≥1280px)**: 3-Panel 전체 표시
- **Tablet (768-1279px)**: 우측 패널 접기 가능 (토글 버튼)
- **Mobile (<768px)**: 1-Column, 탭 방식 (Data | Input | Results)

---

### 3.2 컴포넌트 계층 구조

```
ThreePanelLayout (최상위)
├── StepSidebar (좌측)
│   └── StepItem[]
│
├── MainContent (중앙)
│   ├── SectionHeader
│   ├── [페이지별 커스텀 콘텐츠]
│   │   ├── MethodSelectionCard
│   │   ├── DragDropVariableSelector
│   │   ├── OptionsPanel
│   │   └── CTAButton
│   └── InlineValidation (조건부)
│
└── ResizablePanel (우측)
    ├── DataPreviewPanel (Step 1-2)
    │   ├── DataTable
    │   └── BasicStats
    │
    └── ResultsPanel (Step 3)
        ├── KPICard[]
        ├── StatTable
        ├── Chart (조건부)
        └── InterpretationCard (조건부)
```

---

### 3.3 Grid System (12-Column)

**파일**: `lib/design-system/layouts/grid.ts`

```typescript
/**
 * 12-Column Grid System (Looker Studio 방식)
 * KPI 카드, 통계 테이블 배치용
 */
export const gridSystem = {
  // KPI 카드 레이아웃
  kpiCards: {
    twoColumn: 'grid grid-cols-1 md:grid-cols-2 gap-4',      // 2개 KPI
    threeColumn: 'grid grid-cols-1 md:grid-cols-3 gap-4',    // 3개 KPI
    fourColumn: 'grid grid-cols-2 md:grid-cols-4 gap-4',     // 4개 KPI
  },

  // 테이블 + 차트 레이아웃
  mixedLayout: {
    leftTable: 'grid grid-cols-1 lg:grid-cols-12 gap-6',
    tableColumn: 'lg:col-span-7',   // 테이블 (7/12)
    chartColumn: 'lg:col-span-5',   // 차트 (5/12)
  }
} as const
```

**사용 예제**:
```tsx
{/* ResultsPanel 내부 */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <KPICard label="R²" value={0.89} />
  <KPICard label="F-statistic" value={42.5} />
  <KPICard label="p-value" value={0.001} significance="significant" />
  <KPICard label="RMSE" value={2.34} />
</div>

<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
  <div className="lg:col-span-7">
    <StatTable data={coefficients} />
  </div>
  <div className="lg:col-span-5">
    <Chart type="scatter" data={residuals} />
  </div>
</div>
```

---

## 4. 재사용성 전략

### 4.1 Props 표준화

**모든 통계 페이지에서 동일한 인터페이스 사용**:

```typescript
/**
 * 통계 페이지 공통 Props
 * 45개 페이지 모두 이 인터페이스 준수
 */
interface StatisticsPageProps {
  // 데이터
  uploadedData?: {
    data: Array<Record<string, unknown>>
    headers: string[]
  }

  // 상태
  currentStep: number
  isAnalyzing: boolean
  results?: unknown

  // 액션
  onStepChange: (step: number) => void
  onAnalyze: () => void
  onReset: () => void
}

/**
 * 사용 예제 (회귀분석 페이지):
 */
export default function RegressionPage() {
  const { state, actions } = useStatisticsPage()

  return (
    <ThreePanelLayout
      currentStep={state.currentStep}
      steps={REGRESSION_STEPS}
      onStepChange={actions.setStep}
      rightPanel={{
        mode: state.currentStep < 3 ? 'preview' : 'results',
        previewData: state.uploadedData?.data,
        results: state.results
      }}
    >
      {/* 회귀분석 전용 콘텐츠 */}
      <RegressionVariableSelector
        uploadedData={state.uploadedData}
        variables={state.variables}
        onVariablesChange={actions.setVariables}
      />

      <CTAButton
        size="large"
        loading={state.isAnalyzing}
        onClick={actions.handleAnalysis}
      >
        분석하기
      </CTAButton>
    </ThreePanelLayout>
  )
}
```

---

### 4.2 Render Props 패턴

**페이지별 커스텀 콘텐츠 주입**:

```typescript
/**
 * ThreePanelLayout에서 Render Props 지원
 */
interface ThreePanelLayoutProps {
  // ... 기존 props

  // 커스텀 렌더링 함수
  renderMainContent?: (context: {
    currentStep: number
    uploadedData?: unknown
    goToNextStep: () => void
  }) => React.ReactNode
}

/**
 * 사용 예제 (ANOVA 페이지):
 */
<ThreePanelLayout
  {...layoutProps}
  renderMainContent={({ currentStep, uploadedData, goToNextStep }) => {
    switch (currentStep) {
      case 1:
        return <DataUploadZone onUpload={goToNextStep} />
      case 2:
        return (
          <>
            <ANOVAVariableSelector data={uploadedData} />
            <ANOVAOptionsPanel />
            <CTAButton onClick={handleAnalysis}>분석하기</CTAButton>
          </>
        )
      case 3:
        return null // ResultsPanel이 우측에 자동 표시
    }
  }}
/>
```

---

### 4.3 디자인 토큰 오버라이드

**페이지별 특수 요구사항 대응**:

```typescript
/**
 * 디자인 토큰 커스터마이징
 * 대부분의 페이지는 기본값 사용, 특수 케이스만 오버라이드
 */
<DataPreviewPanel
  data={uploadedData.data}
  designTokens={{
    spacing: {
      cardGap: 'gap-6',  // 기본 gap-4 대신 gap-6 사용
    },
    typography: {
      title: 'text-xl font-bold',  // 기본 text-lg 대신
    }
  }}
/>
```

---

### 4.4 컴포넌트 조합 패턴

**복잡한 페이지는 작은 컴포넌트 조합으로 구성**:

```typescript
/**
 * Stepwise Regression 페이지 예제
 * (변수 선택 + 옵션 설정이 복잡한 케이스)
 */
<ThreePanelLayout {...layoutProps}>
  <SectionHeader
    title="변수 선택"
    description="종속변수 1개, 예측변수 2개 이상 선택"
  />

  <DragDropVariableSelector
    availableVariables={headers}
    selectedVariables={variables}
    onVariableAssign={handleVariableAssign}
    showAssignedIndicator={true}
  />

  <InlineValidation
    message="최소 3개 데이터가 필요합니다"
    type="warning"
    visible={dataCount < 3}
  />

  <SectionHeader
    title="회귀 옵션"
    className="mt-8"
  />

  <OptionsPanel>
    <Select label="진입 방법">
      <SelectItem value="forward">전진 선택</SelectItem>
      <SelectItem value="backward">후진 제거</SelectItem>
    </Select>
    <Input label="유의수준" type="number" defaultValue={0.05} />
  </OptionsPanel>

  <CTAButton
    size="large"
    loading={isAnalyzing}
    icon={PlayIcon}
    onClick={handleAnalysis}
    className="mt-6"
  >
    분석하기
  </CTAButton>
</ThreePanelLayout>
```

---

## 5. 마이그레이션 계획

### 5.1 Phase 7-1: 코어 레이아웃 구축 (9일)

#### 7-1-1: ThreePanelLayout 컴포넌트 생성 (1-2일)

**담당**: Frontend 개발자 1명
**선행 조건**: 없음 (첫 작업)
**병렬 가능**: 7-1-2와 독립적

**작업 범위**:
- [ ] `components/statistics/layouts/ThreePanelLayout.tsx` 생성 (4시간)
- [ ] Props 인터페이스 정의 (1시간)
- [ ] 3-Panel HTML 구조 구현 (3시간)
- [ ] 반응형 breakpoint 설정 (2시간)
- [ ] 단위 테스트 작성 (2시간)

**완료 기준**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] Storybook 스토리 3개 (Step 1/2/3) 렌더링 확인
- [ ] 반응형 테스트 통과: Desktop(1920px), Tablet(1024px), Mobile(375px)
- [ ] 회귀분석 페이지에 적용 시 레이아웃 깨짐 없음

**리스크**:
- 반응형 breakpoint 조정 시간 증가 가능 (+4시간)
- 대응: Mobile은 Phase 7-1-5로 연기 가능

---

#### 7-1-2: StepSidebar + ResizablePanel (1일)
**작업 범위**:
- [ ] `StepSidebar.tsx` 생성 (192px 고정)
- [ ] `ResizablePanel.tsx` 생성 (react-resizable-panels)
- [ ] 디자인 토큰 적용 (spacing, typography)
- [ ] 접기/펼치기 토글 버튼 (모바일)

**검증 기준**:
- 사이드바 스크롤 동작 테스트 (10+ 단계)
- 패널 크기 조절 범위 테스트 (400-600px)
- 브라우저 리사이즈 시 레이아웃 깨짐 없음

---

#### 7-1-3: ResultsPanel 컴포넌트 생성 (2-3일)
**작업 범위**:
- [ ] `ResultsPanel.tsx` 생성
- [ ] `KPICard.tsx` 생성 (주요 지표 카드)
- [ ] `StatTable.tsx` 생성 (통계 테이블)
- [ ] Grid System 적용 (2/3/4-column KPI 레이아웃)
- [ ] 로딩/에러 상태 처리

**검증 기준**:
- 회귀분석 결과 표시 테스트 (R², F-statistic, p-value)
- ANOVA 결과 표시 테스트 (Sum of Squares 테이블)
- 대용량 데이터 테스트 (1000+ 행 테이블)

---

#### 7-1-4: DataPreviewPanel 통합 (1일)
**작업 범위**:
- [ ] 기존 `DataPreviewPanel.tsx` 리팩토링
- [ ] 디자인 토큰 적용 (spacing, typography, colors)
- [ ] ThreePanelLayout 우측 패널에 통합
- [ ] Step 1-2에서 자동 표시 로직

**검증 기준**:
- Step 1 (데이터 업로드) → DataPreviewPanel 자동 표시
- Step 2 (변수 선택) → DataPreviewPanel 유지
- Step 3 (결과) → ResultsPanel로 자동 전환

---

#### 7-1-5: 반응형 + 접근성 (1일)
**작업 범위**:
- [ ] 모바일 레이아웃 (1-Column + Tab 전환)
- [ ] 키보드 네비게이션 (Tab, Enter, Arrow keys)
- [ ] ARIA 속성 추가 (role, aria-label, aria-current)
- [ ] 다크모드 테스트

**검증 기준**:
- WCAG 2.1 AA 준수 (Lighthouse Accessibility 90+)
- 모바일 터치 제스처 (좌우 스와이프로 단계 이동)
- 키보드만으로 전체 워크플로우 완료 가능

---

### 5.2 Phase 7-2: 우선순위 페이지 마이그레이션 (5일)

**마이그레이션 우선순위 (사용 빈도 기준)**:

#### Tier 1: 핵심 5개 (2일)
1. [ ] **Regression** (단순/다중 회귀)
2. [ ] **T-Test** (독립/대응표본 t-검정)
3. [ ] **ANOVA** (One-Way/Two-Way)
4. [ ] **Correlation** (상관분석)
5. [ ] **Descriptive** (기술통계)

**마이그레이션 체크리스트 (각 페이지)**:
- [ ] `ThreePanelLayout`으로 래핑
- [ ] `useStatisticsPage` hook 사용 확인
- [ ] `DataPreviewPanel` Step 1-2 표시 확인
- [ ] `ResultsPanel` Step 3 표시 확인
- [ ] `CTAButton` 크기/스타일 적용
- [ ] Typography 계층 수정 (text-2xl → text-xl)
- [ ] 브라우저 테스트 (CSV 업로드 → 분석 → 결과)

---

#### Tier 2: 중요 10개 (2일)
6. [ ] Chi-Square
7. [ ] Mann-Whitney
8. [ ] Wilcoxon
9. [ ] Kruskal-Wallis
10. [ ] Logistic Regression
11. [ ] Factor Analysis
12. [ ] PCA
13. [ ] Cluster Analysis
14. [ ] Friedman
15. [ ] McNemar

---

#### Tier 3: 나머지 30개 (1일, 자동화 스크립트)
**자동화 마이그레이션 스크립트** (`scripts/migrate-to-three-panel.js`):

```javascript
/**
 * 통계 페이지 자동 마이그레이션 스크립트
 * 반복적인 패턴 자동 변환
 */
const migrationRules = [
  // 1. Layout import 추가
  {
    pattern: /import.*from '@\/components\/ui\/card'/,
    insert: "import { ThreePanelLayout } from '@/components/statistics/layouts/ThreePanelLayout'"
  },

  // 2. Typography 수정 (text-2xl → text-xl)
  {
    pattern: /className="[^"]*text-2xl[^"]*"/g,
    replace: match => match.replace('text-2xl', 'text-xl')
  },

  // 3. DataPreviewPanel 조건 수정
  {
    pattern: /{currentStep === 2 && uploadedData &&/g,
    replace: '{(currentStep === 1 || currentStep === 2) && uploadedData &&'
  }
]

// 30개 페이지 배치 처리
const remainingPages = [
  'app/(dashboard)/statistics/power-analysis/page.tsx',
  'app/(dashboard)/statistics/normality-test/page.tsx',
  // ... 28개 더
]

remainingPages.forEach(page => {
  applyMigrationRules(page, migrationRules)
  runTypeCheck(page)
  generateTestReport(page)
})
```

---

### 5.3 Phase 7-3: 디자인 토큰 중앙화 (1일)

**작업 범위**:
- [ ] `lib/design-system/tokens/` 폴더 생성
- [ ] `spacing.ts`, `typography.ts`, `colors.ts`, `shadows.ts` 파일 생성
- [ ] 기존 Tailwind className을 토큰 참조로 변경
- [ ] Storybook에서 디자인 토큰 문서화

**예제 (Before → After)**:
```typescript
// Before: Tailwind 클래스 하드코딩
<Card className="gap-4 text-lg font-semibold">

// After 방법 1: Tailwind 클래스 유지 (권장 - 기존 방식)
// 디자인 토큰은 문서화/참조용, 실제 코드는 Tailwind 클래스 사용
<Card className="gap-4 text-lg font-semibold">  // spacing.md, typography.h3 참조

// After 방법 2: CSS-in-JS 방식 (특수 케이스만)
import { spacing, typography } from '@/lib/design-system/tokens'
<Card style={{
  gap: spacing.md,              // '1rem'
  fontSize: typography.h3.size,  // '1.125rem'
  fontWeight: typography.h3.weight  // 600
}}>

// ❌ 잘못된 예시 (동작하지 않음)
<Card className={`${spacing.md}`}>  // '.1rem' 클래스가 되어 무효
```

**권장 방식**: Tailwind 클래스를 계속 사용하되, 디자인 토큰을 **문서화/일관성 검증**용으로 활용

---

### 5.4 Phase 7-4: 문서화 (1일)

**생성할 문서**:
1. [ ] `DESIGN_SYSTEM.md` - 컴포넌트 카탈로그
2. [ ] `MIGRATION_GUIDE.md` - 페이지 마이그레이션 가이드
3. [ ] `COMPONENT_LIBRARY.md` - Props 레퍼런스
4. [ ] Storybook 스토리 (모든 공통 컴포넌트)

**MIGRATION_GUIDE.md 예제**:
```markdown
# 통계 페이지 마이그레이션 가이드

## 1. Layout 변경

### Before
```tsx
<div className="container mx-auto">
  <Card>
    <CardHeader>
      <CardTitle className="text-2xl">회귀분석</CardTitle>
    </CardHeader>
    <CardContent>
      {currentStep === 2 && <DataPreviewPanel />}
      <VariableSelector />
    </CardContent>
  </Card>
</div>
```

### After
```tsx
<ThreePanelLayout
  currentStep={currentStep}
  steps={REGRESSION_STEPS}
  rightPanel={{
    mode: currentStep < 3 ? 'preview' : 'results',
    previewData: uploadedData?.data,
    results: results
  }}
>
  <SectionHeader title="변수 선택" />
  <VariableSelector />
  <CTAButton onClick={handleAnalysis}>분석하기</CTAButton>
</ThreePanelLayout>
```

## 2. Typography 수정
- `text-2xl` → `text-xl` (섹션 제목)
- `text-xl` → `text-lg` (서브섹션)

## 3. Button 강조
- 기존 `<Button>` → `<CTAButton size="large">`

## 4. 검증 체크리스트
- [ ] TypeScript 에러 0개
- [ ] DataPreviewPanel Step 1-2 표시
- [ ] ResultsPanel Step 3 표시
- [ ] 반응형 테스트 (Desktop, Tablet, Mobile)
```

---

## 6. 문서화 구조

### 6.1 Storybook 컴포넌트 카탈로그

**설치**:
```bash
cd statistical-platform
npx storybook@latest init
```

**스토리 구조**:
```
statistical-platform/.storybook/
├── stories/
│   ├── design-system/
│   │   ├── Tokens.stories.tsx        # 디자인 토큰 시각화
│   │   ├── Spacing.stories.tsx
│   │   └── Typography.stories.tsx
│   │
│   ├── layouts/
│   │   ├── ThreePanelLayout.stories.tsx
│   │   ├── StepSidebar.stories.tsx
│   │   └── ResizablePanel.stories.tsx
│   │
│   ├── data/
│   │   ├── DataPreviewPanel.stories.tsx
│   │   ├── ResultsPanel.stories.tsx
│   │   ├── KPICard.stories.tsx
│   │   └── StatTable.stories.tsx
│   │
│   └── interactions/
│       ├── DragDropVariableSelector.stories.tsx
│       └── CTAButton.stories.tsx
```

**스토리 예제 (KPICard.stories.tsx)**:
```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { KPICard } from '@/components/statistics/common/KPICard'

const meta: Meta<typeof KPICard> = {
  title: 'Statistics/Data/KPICard',
  component: KPICard,
  tags: ['autodocs'],
  argTypes: {
    significance: {
      control: 'select',
      options: ['significant', 'not-significant', 'neutral']
    }
  }
}

export default meta
type Story = StoryObj<typeof KPICard>

export const Significant: Story = {
  args: {
    label: 'p-value',
    value: 0.023,
    significance: 'significant',
    tooltip: '귀무가설 기각 (유의수준 0.05)'
  }
}

export const NotSignificant: Story = {
  args: {
    label: 'p-value',
    value: 0.156,
    significance: 'not-significant'
  }
}

export const Neutral: Story = {
  args: {
    label: 'R²',
    value: 0.89,
    significance: 'neutral'
  }
}
```

---

### 6.2 컴포넌트 사용 가이드 (COMPONENT_LIBRARY.md)

**구조**:
```markdown
# 통계 플랫폼 컴포넌트 라이브러리

## 레이아웃 컴포넌트

### ThreePanelLayout

**용도**: 모든 통계 페이지의 기본 레이아웃

**Props**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| currentStep | number | - | 현재 활성 단계 (1-3) |
| steps | Step[] | - | 단계 목록 |
| rightPanel | RightPanelProps | - | 우측 패널 설정 |
| enableResize | boolean | false | 패널 크기 조절 활성화 |

**사용 예제**:
```tsx
<ThreePanelLayout
  currentStep={2}
  steps={[
    { id: 1, label: '데이터 업로드' },
    { id: 2, label: '변수 선택' },
    { id: 3, label: '분석 결과' }
  ]}
  rightPanel={{
    mode: 'preview',
    previewData: uploadedData
  }}
>
  {children}
</ThreePanelLayout>
```

**디자인 토큰**:
- 좌측 사이드바: `spacing.sidebar` (192px)
- 우측 패널 기본: `spacing.panelDefault` (40%)
- 간격: `spacing.lg` (24px - gap-6)

---

## 데이터 표시 컴포넌트

### KPICard

**용도**: 주요 통계 지표 강조 표시

**Props**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| label | string | - | 지표 이름 |
| value | string \| number | - | 지표 값 |
| significance | 'significant' \| 'not-significant' \| 'neutral' | 'neutral' | 유의성 표시 |
| tooltip | string | - | 도움말 텍스트 |

**사용 예제**:
```tsx
<KPICard
  label="p-value"
  value={0.023}
  significance="significant"
  tooltip="귀무가설 기각 (유의수준 0.05)"
/>
```

**디자인 토큰**:
- 패딩: `spacing.md` (16px - p-4)
- 제목: `typography.body` (text-sm)
- 값: `typography.mono` (text-2xl font-mono)
- 유의미 색상: `colors.stats.significant`

---

[모든 컴포넌트에 대해 동일한 형식으로 문서화]
```

---

### 6.3 디자인 토큰 레퍼런스 (자동 생성)

**Storybook Addon 활용**:
```bash
npm install @storybook/addon-docs --save-dev
```

**tokens.stories.tsx**:
```typescript
import type { Meta } from '@storybook/react'
import { spacing, typography, colors } from '@/lib/design-system/tokens'

export default {
  title: 'Design System/Tokens',
  parameters: {
    docs: {
      page: () => (
        <div>
          <h1>디자인 토큰</h1>

          <h2>Spacing</h2>
          <table>
            <thead>
              <tr>
                <th>Token</th>
                <th>Value</th>
                <th>Tailwind</th>
                <th>Preview</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(spacing).map(([key, value]) => (
                <tr key={key}>
                  <td><code>spacing.{key}</code></td>
                  <td>{value}</td>
                  <td><code>gap-{key}</code></td>
                  <td><div style={{ width: value, height: '1rem', backgroundColor: '#0ea5e9' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Typography</h2>
          {Object.entries(typography).map(([key, config]) => (
            <div key={key}>
              <h3>{key}</h3>
              <p style={{
                fontSize: config.size,
                fontWeight: config.weight,
                lineHeight: config.lineHeight
              }}>
                The quick brown fox jumps over the lazy dog
              </p>
              <code>
                size: {config.size}, weight: {config.weight}, usage: {config.usage}
              </code>
            </div>
          ))}
        </div>
      )
    }
  }
} as Meta
```

---

## 7. 구현 순서 요약

### 전체 타임라인 (17일)

| Phase | 작업 | 소요 시간 | 누적 시간 |
|-------|------|----------|----------|
| 7-1-1 | ThreePanelLayout 생성 | 1-2일 | 2일 |
| 7-1-2 | StepSidebar + ResizablePanel | 1일 | 3일 |
| 7-1-3 | ResultsPanel + KPICard + StatTable | 2-3일 | 6일 |
| 7-1-4 | DataPreviewPanel 통합 | 1일 | 7일 |
| 7-1-5 | 반응형 + 접근성 | 1일 | 8일 |
| 7-2-1 | Tier 1 페이지 (5개) | 2일 | 10일 |
| 7-2-2 | Tier 2 페이지 (10개) | 2일 | 12일 |
| 7-2-3 | Tier 3 페이지 (30개, 자동화) | 1일 | 13일 |
| 7-3 | 디자인 토큰 중앙화 | 1일 | 14일 |
| 7-4 | 문서화 (Storybook + MD) | 1일 | 15일 |
| 검증 | 전체 페이지 브라우저 테스트 | 2일 | 17일 |

---

### 단계별 체크리스트

#### Phase 7-1 완료 기준 ✅
- [ ] ThreePanelLayout 컴포넌트 구현 완료
- [ ] StepSidebar, ResizablePanel 구현 완료
- [ ] ResultsPanel, KPICard, StatTable 구현 완료
- [ ] DataPreviewPanel 디자인 토큰 적용
- [ ] 반응형 테스트 (Desktop, Tablet, Mobile) 통과
- [ ] TypeScript 컴파일 에러 0개
- [ ] Storybook 스토리 작성 완료

#### Phase 7-2 완료 기준 ✅
- [ ] Tier 1 페이지 (5개) 마이그레이션 완료
- [ ] Tier 2 페이지 (10개) 마이그레이션 완료
- [ ] Tier 3 페이지 (30개) 자동화 스크립트 실행
- [ ] 모든 페이지 브라우저 테스트 통과
- [ ] 마이그레이션 전후 기능 동일성 검증

#### Phase 7-3 완료 기준 ✅
- [ ] 디자인 토큰 파일 생성 (spacing, typography, colors, shadows)
- [ ] 기존 컴포넌트에 토큰 적용
- [ ] Storybook에서 토큰 시각화

#### Phase 7-4 완료 기준 ✅
- [ ] DESIGN_SYSTEM.md 작성
- [ ] MIGRATION_GUIDE.md 작성
- [ ] COMPONENT_LIBRARY.md 작성
- [ ] Storybook 배포 (Chromatic 또는 Netlify)

---

## 8. 확장 가능성 (Future-Proofing)

### 8.1 새 통계 페이지 추가 시

**템플릿 파일** (`scripts/templates/new-statistics-page.tsx`):
```typescript
/**
 * 새 통계 페이지 템플릿
 * 이 파일을 복사하여 새 통계 페이지 생성
 */
import { ThreePanelLayout } from '@/components/statistics/layouts/ThreePanelLayout'
import { useStatisticsPage } from '@/lib/hooks/useStatisticsPage'
import { CTAButton } from '@/components/statistics/common/CTAButton'

// TODO: 통계 이름 변경
const NEW_STAT_STEPS = [
  { id: 1, label: '데이터 업로드' },
  { id: 2, label: '변수 선택' },
  { id: 3, label: '분석 결과' }
]

export default function NewStatisticsPage() {
  const { state, actions } = useStatisticsPage()

  return (
    <ThreePanelLayout
      currentStep={state.currentStep}
      steps={NEW_STAT_STEPS}
      onStepChange={actions.setStep}
      rightPanel={{
        mode: state.currentStep < 3 ? 'preview' : 'results',
        previewData: state.uploadedData?.data,
        results: state.results
      }}
    >
      {/* TODO: 여기에 통계별 커스텀 콘텐츠 추가 */}
      <h2 className="text-xl font-semibold">변수 선택</h2>

      {/* 변수 선택 컴포넌트 */}

      <CTAButton
        size="large"
        loading={state.isAnalyzing}
        onClick={actions.handleAnalysis}
      >
        분석하기
      </CTAButton>
    </ThreePanelLayout>
  )
}
```

**CLI 명령어**:
```bash
npm run create-stat-page -- --name="Bayesian-ANOVA" --tier=2
# → app/(dashboard)/statistics/bayesian-anova/page.tsx 생성
# → 자동으로 디자인 토큰 + 레이아웃 적용
```

---

### 8.2 디자인 토큰 업데이트 시

**중앙 관리**로 전체 페이지 일괄 변경 가능:

```typescript
// lib/design-system/tokens/spacing.ts 수정
export const spacing = {
  md: '1.25rem',  // 16px → 20px 변경
  // ...
}

// → 모든 컴포넌트에서 gap-4가 자동으로 20px로 변경됨
```

---

### 8.3 새 컴포넌트 추가 시

**체크리스트**:
1. [ ] 디자인 토큰 사용 (`spacing`, `typography`, `colors`)
2. [ ] Props 인터페이스 명시적 타입 정의
3. [ ] Storybook 스토리 작성
4. [ ] 단위 테스트 작성 (Jest + React Testing Library)
5. [ ] `COMPONENT_LIBRARY.md`에 문서 추가
6. [ ] 접근성 검증 (ARIA, 키보드 네비게이션)

---

## 9. 성능 최적화 고려사항

### 9.1 코드 스플리팅

```typescript
/**
 * 차트 컴포넌트는 큰 번들 크기 → 지연 로딩
 */
const ChartComponent = React.lazy(() => import('@/components/statistics/charts/Chart'))

// ResultsPanel 내부
{results.chart && (
  <Suspense fallback={<ChartSkeleton />}>
    <ChartComponent data={results.chart.data} />
  </Suspense>
)}
```

---

### 9.2 가상화 (Virtualization)

```typescript
/**
 * 대용량 데이터 테이블 (1000+ 행) → react-virtual
 */
import { useVirtualizer } from '@tanstack/react-virtual'

function StatTable({ data }: { data: unknown[] }) {
  const parentRef = React.useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,  // 행 높이 40px
    overscan: 10,
  })

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <TableRow key={virtualRow.index} data={data[virtualRow.index]} />
        ))}
      </div>
    </div>
  )
}
```

---

### 9.3 메모이제이션

```typescript
/**
 * 복잡한 통계 계산 결과 캐싱
 */
const kpiCards = useMemo(() => {
  if (!results) return []

  return [
    { label: 'R²', value: results.r_squared },
    { label: 'F-statistic', value: results.f_statistic },
    { label: 'p-value', value: results.p_value, significance: 'significant' }
  ]
}, [results])
```

---

## 10. 다음 단계 (이 문서 완료 후)

1. **사용자 승인 대기** ⏳
   - 디자인 시스템 아키텍처 승인
   - 마이그레이션 계획 승인
   - 예산/일정 확정

2. **Phase 7-1 시작** (코어 레이아웃 구축)
   - ThreePanelLayout 구현
   - 디자인 토큰 생성
   - ResultsPanel 구현

3. **Storybook 설정**
   - 컴포넌트 카탈로그 구축
   - 디자인 토큰 문서화

4. **파일럿 페이지 마이그레이션** (회귀분석 1개)
   - 전체 워크플로우 검증
   - 피드백 수집 및 개선

5. **전체 페이지 롤아웃** (45개)
   - Tier 1 → Tier 2 → Tier 3 순차 진행
   - 자동화 스크립트 활용

---

**문서 작성일**: 2025-11-15
**작성자**: Claude Code
**버전**: 1.0
**관련 문서**:
- [STATISTICS_DATA_UX_IMPROVEMENT_PLAN.md](STATISTICS_DATA_UX_IMPROVEMENT_PLAN.md) - Phase B 데이터 뷰어 계획
- [ROADMAP.md](ROADMAP.md) - 전체 개발 로드맵
- [CLAUDE.md](CLAUDE.md) - AI 코딩 규칙
