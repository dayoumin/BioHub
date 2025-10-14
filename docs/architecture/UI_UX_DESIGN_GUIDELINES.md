# 🎨 UI/UX Design Guidelines

## 디자인 철학

### 핵심 원칙
```
🔬 Scientific Precision
- 정확성과 신뢰성을 시각적으로 표현
- 복잡한 통계 개념을 명확하게 전달
- 전문가와 초보자 모두 사용 가능

💎 Professional Excellence  
- 고급 소프트웨어 수준의 완성도
- 일관된 인터랙션 패턴
- 접근성 및 사용성 최우선

⚡ Efficient Workflow
- 통계 전문가의 작업 흐름 최적화
- 키보드 단축키 완전 지원
- 멀티태스킹 환경 고려
```

## 컬러 시스템

### Primary Palette
```css
/* 메인 브랜드 컬러 */
--primary-50: #eff6ff;    /* 매우 밝은 블루 */
--primary-100: #dbeafe;   /* 밝은 블루 */
--primary-200: #bfdbfe;   /* 연한 블루 */
--primary-300: #93c5fd;   /* 중간 블루 */
--primary-400: #60a5fa;   /* 진한 블루 */
--primary-500: #3b82f6;   /* 표준 블루 */
--primary-600: #2563eb;   /* 어두운 블루 */
--primary-700: #1d4ed8;   /* 매우 어두운 블루 */
--primary-800: #1e40af;   /* 딥 블루 */
--primary-900: #1e3a8a;   /* 가장 어두운 블루 */
```

### Secondary Palette
```css
/* 중성 그레이 */
--gray-50: #f8fafc;
--gray-100: #f1f5f9;
--gray-200: #e2e8f0;
--gray-300: #cbd5e1;
--gray-400: #94a3b8;
--gray-500: #64748b;
--gray-600: #475569;
--gray-700: #334155;
--gray-800: #1e293b;
--gray-900: #0f172a;
```

### Semantic Colors
```css
/* 성공 - 통계적 유의성 */
--success-50: #ecfdf5;
--success-500: #10b981;
--success-700: #047857;

/* 경고 - 가정 위반 */
--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-700: #b45309;

/* 오류 - 분석 실패 */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-700: #b91c1c;

/* 정보 - 도움말/팁 */
--info-50: #f0f9ff;
--info-500: #06b6d4;
--info-700: #0e7490;
```

### 다크 테마
```css
/* 다크 모드 배경 */
--dark-bg-primary: #0f172a;     /* 메인 배경 */
--dark-bg-secondary: #1e293b;   /* 카드/패널 */
--dark-bg-tertiary: #334155;    /* 입력 필드 */

/* 다크 모드 텍스트 */
--dark-text-primary: #f8fafc;   /* 제목 */
--dark-text-secondary: #cbd5e1; /* 본문 */
--dark-text-muted: #94a3b8;     /* 보조 */
```

## 타이포그래피

### 폰트 패밀리
```css
/* 메인 폰트 */
--font-sans: 'Inter', 'Pretendard', system-ui, sans-serif;

/* 고정폭 폰트 (코드/수식) */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* 수식 폰트 */
--font-math: 'KaTeX_Main', 'Computer Modern', serif;
```

### 타이포그래피 스케일
```css
/* 헤딩 */
--text-xs: 0.75rem;     /* 12px - 라벨, 캡션 */
--text-sm: 0.875rem;    /* 14px - 작은 텍스트 */
--text-base: 1rem;      /* 16px - 기본 텍스트 */
--text-lg: 1.125rem;    /* 18px - 강조 텍스트 */
--text-xl: 1.25rem;     /* 20px - 소제목 */
--text-2xl: 1.5rem;     /* 24px - 섹션 제목 */
--text-3xl: 1.875rem;   /* 30px - 페이지 제목 */
--text-4xl: 2.25rem;    /* 36px - 메인 제목 */

/* 행간 */
--leading-tight: 1.25;   /* 헤딩용 */
--leading-normal: 1.5;   /* 본문용 */
--leading-relaxed: 1.625; /* 긴 텍스트용 */
```

### 텍스트 스타일
```css
.heading-1 {
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: var(--leading-tight);
  letter-spacing: -0.025em;
}

.heading-2 {
  font-size: var(--text-3xl);
  font-weight: 600;
  line-height: var(--leading-tight);
}

.body-large {
  font-size: var(--text-lg);
  font-weight: 400;
  line-height: var(--leading-normal);
}

.body {
  font-size: var(--text-base);
  font-weight: 400;
  line-height: var(--leading-normal);
}

.caption {
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: var(--leading-normal);
  color: var(--gray-600);
}

.code {
  font-family: var(--font-mono);
  font-size: 0.875em;
  background: var(--gray-100);
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
```

## 레이아웃 시스템

### Grid System
```css
/* 8px 기준 그리드 */
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-5: 1.25rem;  /* 20px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
--spacing-10: 2.5rem;  /* 40px */
--spacing-12: 3rem;    /* 48px */
--spacing-16: 4rem;    /* 64px */
--spacing-20: 5rem;    /* 80px */
```

### 컨테이너 크기
```css
--container-sm: 640px;   /* 모바일 */
--container-md: 768px;   /* 태블릿 */
--container-lg: 1024px;  /* 데스크탑 */
--container-xl: 1280px;  /* 대형 화면 */
--container-2xl: 1536px; /* 초대형 화면 */
```

### 레이아웃 패턴

#### 대시보드 레이아웃
```
┌─────────────────────────────────────────┐
│              Header (60px)              │
├─────────┬───────────────────────────────┤
│ Sidebar │        Main Content           │
│ (280px) │                               │
│         │  ┌─────────────────────────┐   │
│         │  │    Analysis Panel       │   │
│         │  └─────────────────────────┘   │
│         │                               │
│         │  ┌─────────────────────────┐   │
│         │  │    Results Panel        │   │
│         │  └─────────────────────────┘   │
└─────────┴───────────────────────────────┘
```

#### 분석 워크플로우 레이아웃
```
┌─────────────────────────────────────────┐
│           Progress Header               │
├─────────────────────────────────────────┤
│  Step 1   │  Step 2   │  Step 3  │...   │
├─────────────────────────────────────────┤
│                                         │
│            Current Step Content         │
│                                         │
├─────────────────────────────────────────┤
│          Previous │ Next │ Skip         │
└─────────────────────────────────────────┘
```

## 컴포넌트 시스템

### 기본 컴포넌트

#### Button 컴포넌트
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

// 사용 예시
<Button variant="primary" size="md" icon={<PlayIcon />}>
  Run Analysis
</Button>
```

#### Input 컴포넌트
```typescript
interface InputProps {
  type: 'text' | 'number' | 'email' | 'password'
  label: string
  placeholder?: string
  error?: string
  helper?: string
  required?: boolean
  disabled?: boolean
  icon?: ReactNode
}

// 사용 예시
<Input
  label="Confidence Level"
  type="number"
  placeholder="0.95"
  helper="Enter a value between 0 and 1"
  error={errors.confidence}
/>
```

### 전문 컴포넌트

#### StatisticalTable 컴포넌트
```typescript
interface StatisticalTableProps {
  data: StatisticalResult[]
  columns: TableColumn[]
  showExport?: boolean
  sortable?: boolean
  highlightSignificant?: boolean
}

const columns: TableColumn[] = [
  { key: 'variable', label: 'Variable', type: 'text' },
  { key: 'mean', label: 'Mean', type: 'number', decimals: 3 },
  { key: 'std', label: 'Std. Dev.', type: 'number', decimals: 3 },
  { key: 'pvalue', label: 'p-value', type: 'pvalue' }, // 특수 타입
]
```

#### AnalysisWizard 컴포넌트
```typescript
interface AnalysisWizardProps {
  steps: WizardStep[]
  currentStep: number
  onStepChange: (step: number) => void
  onComplete: (results: any) => void
  canSkip?: boolean[]
}

const steps: WizardStep[] = [
  {
    id: 'data',
    title: 'Data Input',
    description: 'Upload and preview your data',
    component: DataInputStep,
    validation: validateDataStep
  },
  {
    id: 'assumptions',
    title: 'Check Assumptions',
    description: 'Verify statistical assumptions',
    component: AssumptionsStep,
    validation: validateAssumptions
  },
  // ...
]
```

### 데이터 시각화 컴포넌트

#### Histogram 컴포넌트
```typescript
interface HistogramProps {
  data: number[]
  title?: string
  xlabel?: string
  ylabel?: string
  bins?: number
  showNormalCurve?: boolean
  showMean?: boolean
  showMedian?: boolean
  theme?: 'light' | 'dark'
}
```

#### BoxPlot 컴포넌트
```typescript
interface BoxPlotProps {
  data: number[][] | { [group: string]: number[] }
  groupLabels?: string[]
  title?: string
  ylabel?: string
  showOutliers?: boolean
  showMeans?: boolean
  orientation?: 'horizontal' | 'vertical'
}
```

## 인터랙션 패턴

### 마이크로 인터랙션

#### 로딩 상태
```css
/* 분석 실행 중 */
.analyzing {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 진행률 표시 */
.progress-bar {
  transition: width 0.3s ease-in-out;
}
```

#### 호버 효과
```css
/* 카드 호버 */
.card {
  transition: all 0.2s ease-in-out;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

/* 버튼 호버 */
.button {
  transition: all 0.15s ease;
}

.button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### 키보드 네비게이션
```typescript
// 키보드 단축키 매핑
const shortcuts = {
  'Ctrl+N': 'New Analysis',
  'Ctrl+O': 'Open Data',
  'Ctrl+S': 'Save Results',
  'Ctrl+R': 'Run Analysis',
  'Ctrl+E': 'Export Results',
  'F1': 'Help',
  'Esc': 'Close Modal',
  'Tab': 'Next Field',
  'Shift+Tab': 'Previous Field',
  'Enter': 'Submit/Continue',
  'Space': 'Toggle/Select'
}

// 포커스 관리
const focusRing = {
  outline: '2px solid var(--primary-500)',
  outlineOffset: '2px'
}
```

### 드래그 앤 드롭
```typescript
interface DragDropProps {
  onDrop: (files: File[]) => void
  accept: string[]
  multiple?: boolean
  maxSize?: number
}

// 시각적 피드백
.drag-active {
  border: 2px dashed var(--primary-500);
  background: var(--primary-50);
}

.drag-reject {
  border: 2px dashed var(--error-500);
  background: var(--error-50);
}
```

## 접근성 가이드라인

### WCAG 2.1 AA 준수

#### 컬러 대비
```css
/* 최소 대비율 4.5:1 */
.text-primary { color: #1e293b; } /* 대비율: 13.6:1 */
.text-secondary { color: #475569; } /* 대비율: 7.6:1 */
.text-muted { color: #64748b; } /* 대비율: 4.9:1 */
```

#### ARIA 라벨링
```jsx
// 통계 결과 테이블
<table role="table" aria-label="Statistical Results">
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">Variable</th>
      <th scope="col" aria-sort="none">Mean</th>
      <th scope="col" aria-sort="none">p-value</th>
    </tr>
  </thead>
  <tbody>
    <tr aria-describedby="significant-note">
      <td>Group A</td>
      <td>2.45</td>
      <td aria-label="p-value 0.032, statistically significant">0.032*</td>
    </tr>
  </tbody>
</table>
<div id="significant-note">* indicates statistical significance</div>

// 분석 진행 상태
<div role="progressbar" 
     aria-valuenow={progress} 
     aria-valuemin={0} 
     aria-valuemax={100}
     aria-label="Analysis Progress">
  {progress}% Complete
</div>

// 에러 메시지
<div role="alert" aria-live="assertive">
  Data validation failed: Missing values detected in column 'Age'
</div>
```

#### 키보드 네비게이션
```jsx
// 포커스 트랩
<Modal>
  <div role="dialog" 
       aria-labelledby="modal-title"
       aria-describedby="modal-content">
    <h2 id="modal-title">Export Options</h2>
    <div id="modal-content">
      {/* 포커스 가능한 요소들 */}
    </div>
  </div>
</Modal>

// 건너뛰기 링크
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```하나먼 

## 반응형 디자인

### 브레이크포인트
```css
/* Mobile First 접근 */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### 적응형 레이아웃
```css
/* 데스크탑 우선 설계 */
.sidebar {
  width: 280px; /* 데스크탑 */
}

@media (max-width: 1023px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
  }
}

/* 그리드 시스템 */
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-6);
}
```

## 다크 모드

### 테마 토글
```typescript
interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
}

const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])
  
  return { theme, toggleTheme }
}
```

### CSS 변수 활용
```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
}

[data-theme="dark"] {
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --text-primary: #f8fafc;
}

.card {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
```

## 성능 최적화

### 이미지 최적화
```jsx
// Next.js Image 컴포넌트 사용
<Image
  src="/chart-placeholder.png"
  alt="Statistical Chart"
  width={600}
  height={400}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

### 코드 스플리팅
```typescript
// 지연 로딩
const AdvancedChart = lazy(() => import('./AdvancedChart'))
const StatisticalTable = lazy(() => import('./StatisticalTable'))

// 사용 시
<Suspense fallback={<ChartSkeleton />}>
  <AdvancedChart data={data} />
</Suspense>
```

### 가상화
```typescript
// 대량 데이터 테이블 가상화
import { FixedSizeList as List } from 'react-window'

const VirtualTable = ({ data }) => (
  <List
    height={400}
    itemCount={data.length}
    itemSize={35}
    itemData={data}
  >
    {({ index, style, data }) => (
      <div style={style}>
        {/* 행 렌더링 */}
      </div>
    )}
  </List>
)
```

## 테스트 가이드라인

### 시각적 테스트
```javascript
// Storybook 스토리
export default {
  title: 'Components/Button',
  component: Button,
} as ComponentMeta<typeof Button>

export const AllVariants: ComponentStory<typeof Button> = () => (
  <div className="space-y-4">
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="outline">Outline</Button>
  </div>
)
```

### 접근성 테스트
```javascript
// Jest + @testing-library/react
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

test('Button component is accessible', async () => {
  const { container } = render(
    <Button variant="primary">Click me</Button>
  )
  
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

---

이 디자인 가이드라인을 따라 **일관성 있고 전문적인 UI/UX**를 구현할 수 있습니다. 모든 컴포넌트는 접근성을 고려하고, 다크 모드를 지원하며, 성능 최적화를 적용합니다.