# UI 일관성 통일 계획

> Analysis / Graph Studio / Bio-Tools 간 UI 패턴 감사 결과 및 통일 작업 계획

## 1. 감사 요약

### 1.1 현재 상태 비교표

| 패턴 | Analysis | Graph Studio | Bio-Tools |
|------|----------|-------------|-----------|
| **Max-width** | `max-w-6xl` | 없음 (full-width editor) | `max-w-5xl` |
| **헤더 배경** | `bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80` | 동일 | `bg-card/50 backdrop-blur-sm` |
| **헤더 높이** | `h-10` (40px 고정, 1줄 텍스트) | `h-10` (40px 고정, 1줄 텍스트) | `py-4` (가변 ~56px, **2줄 텍스트**: 영문명+한글명) |
| **헤더 sticky** | `sticky top-0 z-50` | `sticky top-0 z-50` | 없음 (스크롤 시 사라짐) |
| **헤더 패딩** | inner `max-w-7xl mx-auto px-6` | 직접 `px-4` | inner `max-w-7xl mx-auto px-6` |
| **상단 accent** | `2px solid var(--section-accent-analysis)` | `2px solid var(--section-accent-graph)` | `2px solid var(--section-accent-bio)` |
| **배경 틴트** | 4% `color-mix` | 없음 | 4% `color-mix` (BIO_BG_TINT) |
| **업로드 컴포넌트** | `UploadDropZone` (공통) | `UploadDropZone` (공통) | `BioCsvUpload` (독자) |
| **업로드 패딩** | `px-6 py-6` | `px-6 py-4` (compact) | `p-8` |
| **업로드 아이콘** | Upload w-10 h-10 (공통) | 없음 (showIcon=false) | Upload w-8 h-8 (독자) |
| **업로드 버튼** | "파일 선택" outline sm | "파일 선택" outline sm | 없음 (클릭존 전체) |
| **폼 입력** | shadcn Select | shadcn Select | native `<select>` (22개, 10파일) |
| **뒤로가기** | Button (ArrowLeft) header 내 | 없음 (자체 흐름) | Link (ArrowLeft) header 내 |
| **헤더 제목 크기** | `text-sm font-medium` | `text-lg font-semibold` | `text-base font-semibold` |
| **콘텐츠 padding** | `px-6 py-8 space-y-6` | 다양 | `px-6 py-8 space-y-6` (BIO_LAYOUT) |
| **테이블 헤더 bg** | `bg-muted/10` (STEP_STYLES) | N/A | **`bg-muted/30` 하드코딩** (11곳) — 토큰 `BIO_TABLE.headerBg`(`bg-muted/10`)와 불일치 |
| **유의성 배지** | 시맨틱 토큰 사용 | N/A | `SIGNIFICANCE_BADGE` 일부만 사용, **survival 등 green/gray 하드코딩** |
| **에러 표시** | 카드 + 색상 배경 | `bg-destructive/10` 박스 | bare `<p className="text-destructive">` |
| **로딩 상태** | 전체 화면 오버레이 + 스피너 | `Loader2` 스피너 | 버튼 텍스트만 변경 (스피너 없음) |
| **허브 페이지 헤더** | AnalysisLayout(showHub) 헤더 있음 | GraphStudioHeader 항상 표시 | **BioToolsHub 헤더 없음** — 개별 도구만 BioToolShell 사용 |
| **data-testid** | 광범위 | 광범위 | **없음** (0개) |

### 1.2 통일하지 않을 항목 (의도된 차이)

| 항목 | 이유 |
|------|------|
| **레이아웃 구조** | Analysis=단일 컬럼 스텝 흐름, Graph=3패널 에디터, Bio=단일 페이지 — 기능 목적이 다름 |
| **스텝 인디케이터** | Analysis 4단계 원형(FloatingStepIndicator), Graph 3단계 텍스트(StepIndicator) — 흐름 길이·복잡도 다름 |
| **하단 네비 바** | Analysis 전용 — 4단계 스텝 기반 흐름에만 필요 |
| **AI 패널** | Graph Studio 전용 — 차트 편집 맥락에서만 의미 있음 |
| **Undo/Redo** | Graph Studio 전용 — 실시간 편집 맥락에서만 필요 |
| **헤더 제목 크기** | 각 섹션의 헤더 내 제목 — Analysis(`text-sm`), Graph(`text-lg` 앱 이름), Bio(`text-base` 도구명) — 헤더 콘텐츠 밀도가 다름 |

---

## 2. 통일 대상 정의

### 2.1 공통 Shell 패턴 (목표 상태)

```
┌─ 상단 accent (2px solid var(--section-accent-*)) ──────────┐
│ Header: sticky top-0 z-50                                   │
│   bg-background/95 backdrop-blur-sm                         │
│   supports-[backdrop-filter]:bg-background/80               │
│   inner: max-w-7xl mx-auto px-6                             │
│   좌: [뒤로가기?] [아이콘] [섹션명]                          │
│   우: [액션 버튼들]                                         │
├─────────────────────────────────────────────────────────────┤
│ Body: 4% accent 배경 틴트                                   │
│   inner: max-w-7xl mx-auto px-6 py-8 space-y-6             │
└─────────────────────────────────────────────────────────────┘
```

**헤더 높이 전략**:
- Analysis / Graph Studio: `h-10` (40px) — 1줄 텍스트
- Bio-Tools: `h-12` (48px) — 도구명(영문) + 한글 부제가 2줄이므로 40px에 잘림 발생. `h-12`(48px)로 타협하거나, 한글 부제를 본문으로 이동 후 `h-10` 적용. → **`h-12` 채택** (2줄 콘텐츠 수용)

### 2.2 공통 업로드 패턴 (목표 상태)

모든 영역이 `UploadDropZoneContent` + `uploadZoneClassName` 사용:
- 일관된 dashed border, 호버/드래그 상태
- 각 영역의 기능(파싱 로직, 파일 타입)은 유지

### 2.3 공통 폼 패턴 (목표 상태)

- 드롭다운: shadcn `<Select>` (native `<select>` 금지)
- 입력 높이: `h-8 text-sm`
- 라벨: `text-sm text-muted-foreground`

### 2.4 공통 디자인 토큰 준수

- 테이블 헤더 배경: `BIO_TABLE.headerBg` (`bg-muted/10`) — 하드코딩 `bg-muted/30` 금지
- 유의성 배지: `SIGNIFICANCE_BADGE.significant / .nonSignificant` — 하드코딩 green/gray 금지

---

## 3. 실행 계획

### Phase 1: Shell 통일 (헤더 + 배경 + max-width + 허브 헤더)

**범위**: BioToolShell, BioToolsHub, GraphStudioHeader, GraphStudioContent

#### 1-A. BioToolShell 헤더 통일

| 변경 | Before | After |
|------|--------|-------|
| 태그 | `<div>` | `<header>` (시맨틱) |
| 배경 | `bg-card/50 backdrop-blur-sm` | `bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80` |
| 높이 | `py-4` (가변 ~56px) | `h-12` (48px, 2줄 수용) |
| sticky | 없음 | `sticky top-0 z-50` |
| max-width | `max-w-7xl` (헤더+본문) | `max-w-7xl` |

**파일**: `stats/components/bio-tools/BioToolShell.tsx`

```diff
- <div
-   className="flex-shrink-0 border-b border-border bg-card/50 backdrop-blur-sm"
+ <header
+   className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
    style={BIO_HEADER_BORDER}
  >
-   <div className={cn('max-w-7xl mx-auto py-4 flex items-center gap-4', ...)}>
+   <div className={cn('max-w-7xl mx-auto h-12 flex items-center gap-4', ...)}>
    ...
-   </div>
- </div>
+   </div>
+ </header>

  {/* 본문 */}
  ...
-   <div className={cn('max-w-7xl mx-auto', ...)}>
+   <div className={cn('max-w-7xl mx-auto', ...)}>
```

#### 1-B. BioToolsHub 헤더 + 배경 틴트 추가

현재 `/bio-tools` 허브 페이지는 헤더/accent bar/배경 틴트가 없음.
개별 도구 페이지(BioToolShell)와 일관성을 위해 최소한의 헤더 추가.

**파일**: `stats/components/bio-tools/BioToolsHub.tsx`

```diff
+ import { BIO_HEADER_BORDER, BIO_BG_TINT, BIO_ICON_COLOR } from './bio-styles'
+ import { Leaf } from 'lucide-react'

  return (
-   <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
+   <div className="min-h-screen" style={BIO_BG_TINT}>
+     <header
+       className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
+       style={BIO_HEADER_BORDER}
+     >
+       <div className="max-w-7xl mx-auto px-6 h-10 flex items-center gap-1.5 text-muted-foreground">
+         <Leaf className="h-4 w-4" style={BIO_ICON_COLOR} />
+         <span className="text-sm font-medium">Bio-Tools</span>
+       </div>
+     </header>
+     <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* 기존 콘텐츠 */}
+     </div>
+   </div>
  )
```

#### 1-C. GraphStudioHeader 패딩 통일

**파일**: `stats/components/graph-studio/GraphStudioHeader.tsx`

> Graph Studio는 에디터 모드에서 full-width가 필요하므로 헤더만 `px-6` 통일.
> 패널(w-64/w-80)과의 정렬에는 영향 없음 (헤더는 독립 full-width 바).

```diff
- className="sticky top-0 z-50 flex items-center justify-between border-b border-border px-4 h-10 ..."
+ className="sticky top-0 z-50 flex items-center justify-between border-b border-border px-6 h-10 ..."
```

#### 1-D. Graph Studio 배경 틴트 추가

**파일**: `stats/app/graph-studio/GraphStudioContent.tsx`

upload/setup 화면에만 4% 배경 틴트 적용 (에디터 모드는 제외):

```tsx
const GRAPH_BG_TINT = {
  backgroundColor: 'color-mix(in oklch, var(--section-accent-graph) 4%, var(--background))',
} as const
```

upload/setup 래퍼에 `style={GRAPH_BG_TINT}` 추가.

#### 1-E. 전체 max-w-6xl → max-w-7xl 통일

Bio-Tools 외에도 Analysis, Genetics, Help 페이지가 `max-w-6xl` 사용 중. 모두 통일:

| 파일 | 위치 |
|------|------|
| `components/analysis/layouts/AnalysisLayout.tsx` | 헤더, main, 하단바 (3곳) |
| `components/common/FloatingStepIndicator.tsx` | 스테퍼 컨테이너 (1곳) |
| `app/genetics/layout.tsx` | 유전 분석 레이아웃 (1곳) |
| `app/(dashboard)/help/page.tsx` | 도움말 페이지 (1곳) |

**변경 파일 목록** (Phase 1 전체):
- `stats/components/bio-tools/BioToolShell.tsx` — 헤더 통일 + max-width
- `stats/components/bio-tools/BioToolsHub.tsx` — 헤더 추가 + max-width
- `stats/components/graph-studio/GraphStudioHeader.tsx` — px-6
- `stats/app/graph-studio/GraphStudioContent.tsx` — 배경 틴트
- `stats/components/analysis/layouts/AnalysisLayout.tsx` — max-w-7xl (3곳)
- `stats/components/common/FloatingStepIndicator.tsx` — max-w-7xl
- `stats/app/genetics/layout.tsx` — max-w-7xl
- `stats/app/(dashboard)/help/page.tsx` — max-w-7xl

**위험도**: 낮음 (CSS 변경만, 로직 변경 없음)

---

### Phase 2: 업로드 UX 통일

**범위**: BioCsvUpload 시각 부분을 UploadDropZone 공통 컴포넌트로 교체

#### 변경 전략

BioCsvUpload의 **파싱 로직은 유지**하고, **시각 부분만** 교체:

```
Before:
  BioCsvUpload 내부 JSX (독자 스타일)
    └── border-2 border-dashed + Upload w-8 + p 텍스트

After:
  BioCsvUpload 내부 JSX
    └── uploadZoneClassName() + UploadDropZoneContent (공통 시각)
```

#### 주요 변경

**파일**: `stats/components/bio-tools/BioCsvUpload.tsx`

```diff
+ import { uploadZoneClassName, UploadDropZoneContent } from '@/components/common/UploadDropZone'
- import { Upload, FileSpreadsheet, X } from 'lucide-react'
+ import { FileSpreadsheet, X } from 'lucide-react'

  // 업로드 전 상태 (드롭존)
- <div
-   {...getRootProps()}
-   className={cn(
-     'flex flex-col items-center justify-center gap-3 p-8 rounded-xl',
-     'border-2 border-dashed border-border cursor-pointer',
-     'transition-colors duration-200',
-     isDragActive && 'border-primary/50 bg-primary/5',
-     !isDragActive && 'hover:border-muted-foreground/30',
-   )}
- >
-   <input {...getInputProps()} />
-   <Upload className="w-8 h-8 text-muted-foreground/50" />
-   <p className="text-sm text-muted-foreground text-center">{description}</p>
- </div>
+ <div
+   {...getRootProps()}
+   className={cn(uploadZoneClassName(isDragActive, { clickable: true }), 'group')}
+ >
+   <input {...getInputProps()} />
+   <UploadDropZoneContent
+     isDragActive={isDragActive}
+     label={description}
+     subtitle="CSV, TSV 파일 지원"
+     buttonLabel="파일 선택"
+   />
+ </div>
```

**변경 파일 목록**:
- `stats/components/bio-tools/BioCsvUpload.tsx`

**위험도**: 낮음 (시각만 변경, 파싱 로직 그대로)

---

### Phase 3: Bio 페이지 일괄 개선 (폼 + 토큰 + UX)

**범위**: 같은 10개 파일을 한 번에 터치 — 폼 교체 + 토큰 수정 + UX 개선

> **원칙**: 기능 격차(로딩 피드백, 스크롤, 에러)가 시각 통일보다 사용자 체감에 더 큰 영향.
> 같은 파일을 여러 번 수정하지 않도록 한 Phase에 통합.

#### 3-A. native `<select>` → shadcn `<Select>`

모든 native select를 shadcn Select로 교체. 컬럼 선택기의 검색 기능(Combobox)은 **후속 과제**로 분리 (현재 `cmdk` 의존성 및 `command.tsx` 부재).

```
Before:
  <select value={siteCol} onChange={(e) => setSiteCol(e.target.value)}
    className="text-sm border rounded-md px-2 py-1 bg-background">
    <option value="">선택...</option>
    {headers.map(h => <option key={h} value={h}>{h}</option>)}
  </select>

After:
  <Select value={siteCol || undefined} onValueChange={setSiteCol}>
    <SelectTrigger className="h-8 text-sm w-[180px]">
      <SelectValue placeholder="선택..." />
    </SelectTrigger>
    <SelectContent>
      {headers.map(h => (
        <SelectItem key={h} value={h}>{h}</SelectItem>
      ))}
    </SelectContent>
  </Select>
```

**빈 값(`""`) 처리 전략**:
- shadcn Select는 `<SelectItem value="">` 불가 (Radix 제약)
- placeholder로 미선택 상태 표시: `value={col || undefined}`
- "없음" 옵션 (survival/nmds `groupCol`): sentinel 값 `"__none__"` 사용
- sentinel 상수: `bio-styles.ts`에 `export const NONE_VALUE = '__none__' as const` 중앙화
- `onValueChange={(v) => setGroupCol(v === NONE_VALUE ? '' : v)}`

#### 대상 파일 (10개, 22개 인스턴스)

| 파일 | select 수 | 빈 값 처리 |
|------|-----------|-----------|
| `app/bio-tools/survival/page.tsx` | 3 | O (`groupCol` 없음 옵션) |
| `app/bio-tools/mantel-test/page.tsx` | 3 | X |
| `app/bio-tools/beta-diversity/page.tsx` | 2 | X |
| `app/bio-tools/nmds/page.tsx` | 2 | O (`groupCol` 없음 옵션) |
| `app/bio-tools/permanova/page.tsx` | 2 | X (placeholder만) |
| `app/bio-tools/meta-analysis/page.tsx` | 4 | X |
| `app/bio-tools/icc/page.tsx` | 2 | X |
| `app/bio-tools/alpha-diversity/page.tsx` | 1 | X |
| `app/bio-tools/rarefaction/page.tsx` | 1 | X |
| `app/bio-tools/roc-auc/page.tsx` | 2 | X |

#### 3-B. 테이블 헤더 배경 하드코딩 수정 (11곳)

Bio 페이지의 `bg-muted/30` → `BIO_TABLE.headerBg` (`bg-muted/10`):

```diff
- <tr className="border-b bg-muted/30">
+ <tr className={cn('border-b', BIO_TABLE.headerBg)}>
```

#### 3-C. 유의성 배지 + 품질 색상 하드코딩 수정

**survival/page.tsx**: 하드코딩 `bg-green-100 text-green-700` → `SIGNIFICANCE_BADGE` 토큰:

```diff
- <span className="... bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
+ <span className="..." style={SIGNIFICANCE_BADGE.significant}>
```

기타 도구의 하드코딩 색상 (nmds `text-green-600`/`text-red-600`, icc 등) → 토큰화.

> **다크모드 검증**: 각 파일 수정 후 하드코딩 색상(`green-*`, `red-*`, `gray-*`)이 남아있지 않은지 확인.

#### 3-D. 로딩 스피너 추가

현재 Bio-Tools 분석 버튼: 텍스트만 `"분석 중..."` 으로 변경.
→ `Loader2` 아이콘 추가 (Analysis/Graph와 일관):

```diff
  <Button disabled={isAnalyzing}>
-   {isAnalyzing ? '분석 중...' : '분석 실행'}
+   {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
  </Button>
```

#### 3-E. 결과 자동 스크롤

분석 완료 시 결과 섹션으로 자동 스크롤:

```tsx
const resultsRef = useRef<HTMLDivElement>(null)

// 분석 완료 후
useEffect(() => {
  if (results) {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}, [results])

// JSX
<div ref={resultsRef}>{/* 결과 테이블/차트 */}</div>
```

#### 3-F. 에러 표시 스타일 통일

bare `<p>` → 스타일 박스:

```diff
- {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
+ {error && (
+   <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
+     <AlertCircle className="h-4 w-4 shrink-0" />
+     {error}
+   </div>
+ )}
```

**변경 파일 목록**:
- `app/bio-tools/` 10개 페이지
- `components/bio-tools/bio-styles.ts` (`NONE_VALUE` 상수 추가)

**위험도**: 중간 (각 페이지 개별 확인 필요, Combobox 도입은 신중히)

---

## 4. 후속 과제 (이번 범위 밖)

| 항목 | 설명 | 우선순위 |
|------|------|---------|
| **Combobox 컬럼 선택기** | `pnpm add cmdk` + `command.tsx` 생성 → 컬럼 select를 검색 가능한 Combobox로 업그레이드 | 높음 |
| **data-testid 추가** | Bio-Tools 전체에 테스트 셀렉터 부여 | 중간 (E2E 테스트 시) |
| **접근성 보강** | Bio-Tools `aria-label`, `focusRing` 추가 | 중간 |
| **모션 패턴** | Bio 개별 도구에 framer-motion stagger 적용 (허브만 있음) | 낮음 |

---

## 5. 검증 계획

각 Phase 완료 후:
1. `pnpm tsc --noEmit` — 타입 체크 통과
2. `pnpm test` — 기존 테스트 통과
3. 수동 확인: 각 영역 브라우저 렌더링 확인

**Phase 3 추가 검증** (기존 테스트가 Bio-Tools를 커버하지 않으므로):
4. Bio-Tools 페이지별 smoke 렌더 테스트 추가 — 각 도구 페이지가 에러 없이 마운트되는지 확인
5. Select 교체 후: 값 선택 → 분석 실행 → 결과 표시 수동 검증 (최소 3개 도구)

---

## 6. 참조

### CSS 변수 (globals.css)

```css
/* Light */
--section-accent-hub:      oklch(0.55 0.20 260);  /* 블루 */
--section-accent-analysis:  oklch(0.55 0.15 185);  /* 틸/시안 */
--section-accent-graph:     oklch(0.55 0.15 290);  /* 바이올렛 */
--section-accent-bio:       oklch(0.55 0.15 145);  /* 그린 */

/* Dark */
--section-accent-hub:      oklch(0.65 0.18 260);
--section-accent-analysis:  oklch(0.65 0.13 185);
--section-accent-graph:     oklch(0.65 0.13 290);
--section-accent-bio:       oklch(0.65 0.13 145);
```

### 공통 컴포넌트

- `UploadDropZoneContent` + `uploadZoneClassName()` — `stats/components/common/UploadDropZone.tsx`
- `STEP_STYLES` — `stats/components/analysis/common/style-constants.ts`
- `BIO_LAYOUT`, `BIO_TABLE`, `SIGNIFICANCE_BADGE` — `stats/components/bio-tools/bio-styles.ts`
- `focusRing` — `stats/components/common/card-styles.ts`
