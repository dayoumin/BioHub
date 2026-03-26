# PLAN: 디자인 시스템 정리 + 앱 톤 통일

> 2026-03-26 작성 — 디자인 토큰 체계화 + 전체 시각적 일관성 확보

## 현황 요약

CSS 변수 기반 테마(globals.css)는 잘 잡혀있으나, **TS 토큰 레이어가 4~5개 공존**하여 "어디 토큰을 써야 하는가" 혼란 발생. 차트 색상 3중 정의, 하드코딩 컬러, StepIndicator 이중 구현 등 기술부채 존재.

추가로, **영역별 시각 밀도/간격/타이포그래피가 불균일**하여 앱 전체 톤 통일 필요.

---

## 디자인 방향 (레퍼런스)

미니멀 퀴즈 UI 참고 — 핵심 원칙:

| 원칙 | 설명 | BioHub 적용 |
|------|------|-------------|
| **넉넉한 호흡** | 섹션 간 충분한 gap, 카드 내 여유 padding | `space-y-6` + `p-4` 기본, Graph Studio 압축 완화 |
| **단일 accent** | 영역별 1색만 사용, 나머지 무채색 | 이미 `--section-accent-*` 4색 체계 (유지) |
| **3단계 타이포** | 큰 번호/제목 → 본문 → 보조 | text-2xl/lg → text-sm → text-xs 표준화 |
| **카드 기반 선택지** | 옵션을 카드로 분리, 뱃지로 식별 | PurposeCard 패턴 확산 |
| **미니멀 프로그레스** | 숫자(1/15) + % + 바 — 단순명료 | FloatingStepIndicator 통일 |
| **subtle shadow** | shadow-sm 기본, hover 시 shadow-md | 현행 유지 (이미 일관)

---

## Phase 1: 죽은 코드 제거 (즉시)

### 1-A. `lib/styles/colors.ts` 삭제
- **이유**: 217줄, import 0건 — globals.css CSS 변수로 대체 완료
- **작업**: 파일 삭제 + `lib/styles/index.ts` export 제거
- **위험도**: 낮음 (사용처 없음)

### 1-B. `lib/design-system/tokens.ts` — 보류
- **이유**: 73줄, 실제 앱 컴포넌트 적용 0건이지만 **데모 페이지가 존재**
- `app/(dashboard)/design-system/` — 32개 파일 (데모 컴포넌트 + 섹션 + 코딩 패턴)
- `components/design-system/` — themed-tabs, analysis-category (데모 전용 컴포넌트)
- **결론**: 데모 인프라로 유지. Phase 4에서 통합 시 재검토

---

## Phase 2: 차트 색상 통일

### 2-A. `bio-chart-colors.ts` hex → CSS 변수 기반 전환
- **현재**: 10개 hex 하드코딩 (`#2563eb`, `#dc2626`, ...)
- **사용처**: 6개 Bio-Tools (VbgfTool, SurvivalTool, RarefactionTool, NmdsTool, LengthWeightTool, ConditionFactorTool)
- **차트 라이브러리**: **ECharts** (LazyReactECharts) — CSS 변수 직접 전달 불가
- **전략**: globals.css에 `--chart-6`~`--chart-10` 정의 + `resolveChartColors()` 유틸 생성
  ```ts
  // getComputedStyle로 CSS 변수 → hex 런타임 해석
  export function resolveChartColors(count: number): string[] {
    const style = getComputedStyle(document.documentElement)
    return Array.from({ length: count }, (_, i) =>
      style.getPropertyValue(`--chart-${i + 1}`).trim()
    )
  }
  ```
- **이점**: dark mode 전환 시 차트 색상도 자동 반영

### 2-B. 하드코딩 컬러 수정 (11파일 21건)

**Bio-Tools** (3파일):
- `ConditionFactorTool.tsx` — `#E64B35`, `#4DBBD5`
- `MetaAnalysisTool.tsx` — `#999999`

**Analysis/Charts** (5파일):
- `ResultsActionStep.tsx` — `#999999`
- `ColumnDetailModal.tsx` — `#64748b` (2건)
- `CorrelationHeatmap.tsx` — `#2563EB`, `#FFFFFF`, `#DC2626`, `#64748b` (2건)
- `BarChartWithCI.tsx` — `#10B981`, `#EF4444`, `#6B7280`, `#64748b`, `#ef4444`, `#94a3b8`
- `histogram.tsx` — `#64748b`, `#ef4444`, `#94a3b8`, `#E64B35`, `#4DBBD5`

**Graph Studio** (2파일):
- `AnnotationTab.tsx` — `#999999`
- `StyleTab.tsx` — `#ffffff` (색상 입력 기본값, 예외 허용 가능)

**기타** (1파일):
- `plotly-chart-renderer.tsx` — `#f5f5f5` (HTML 템플릿 내, 예외 허용 가능)

**전략**: ECharts 옵션에 쓰이는 hex는 CSS 변수 resolve 유틸 경유. HTML 템플릿/입력 기본값은 현행 유지.

### 2-C. 알려진 한계: dark mode chart-1~5 그레이스케일
- dark mode의 `--chart-1`~`--chart-5`는 chroma=0 (순수 회색) — 기존 모노크롬 디자인 결정
- 멀티시리즈 차트에서 2+ 색상 구분 어려움
- chart-6~10은 chromatic으로 추가됨 (이번 Phase)
- **향후**: dark mode chart-1~5도 chromatic으로 전환 검토 (별도 작업)

---

## Phase 3: StepIndicator 정리

### 3-A. Graph Studio StepIndicator — 독립 유지 (결정 변경)
- **이유**: common/StepIndicator (348줄, 원형+연결선+Framer Motion)와 Graph Studio (35줄, 인라인 텍스트+셰브론)는 **근본적으로 다른 UI 패턴**
- common에 `layout: 'inline'` 추가 시 복잡도 증가 > 코드 중복 비용
- **실행**: `text-[13px]` → `text-xs`로 비표준 사이즈만 수정 ✅
- **향후**: Phase 6-A에서 레퍼런스 스타일의 minimal variant를 별도 검토

---

## Phase 4: TS 토큰 계층 명확화

### 현재 (분산)
```
card-styles.ts ← 글로벌 카드 패턴 + LAYOUT + motion
style-constants.ts ← Analysis 전용 (padding, table, gap)
bio-styles.ts ← Bio 전용 (accent, badge, table)
step-flow.ts ← StepIndicator 전용 (281줄, 1 import)
ui-constants.ts ← 모노크롬 상태 스타일
```

### 목표 (3단계 계층)
```
lib/design-tokens/
  ├── common.ts          ← 글로벌 레이아웃/motion/카드 (card-styles + step-flow 통합)
  ├── analysis.ts        ← Analysis 전용 (style-constants 이동)
  ├── bio.ts             ← Bio 전용 (bio-styles 이동)
  └── status.ts          ← 상태 스타일 (ui-constants에서 분리)
```

### 작업
1. `lib/design-tokens/` 디렉토리에 통합
2. 기존 파일에서 import 경로 일괄 변경
3. step-flow.ts 축소 — import 1건(StepIndicator)뿐이므로 StepIndicator에 내장 or common.ts 흡수
4. ui-constants.ts에서 상태 스타일만 분리, 나머지 정리

### 주의
- import 경로 변경이 많아 tsc 검증 필수
- 기능 변경 없음 (순수 리팩터링)

---

## Phase 5: 앱 톤 통일 — 스페이싱 & 타이포그래피

### 현황 감사 결과

| 항목 | Smart Flow | Bio-Tools | Graph Studio | Hub/Home | 상태 |
|------|-----------|-----------|-------------|---------|------|
| 카드 padding | p-3/p-4 | p-3/p-4 | p-3/px-3 | p-4 | OK |
| 섹션 gap | space-y-6 | space-y-6 | **gap-1** | space-y-6 | **불일치** |
| Shadow | shadow-sm/md | shadow-sm/md | shadow-sm | shadow-md | OK |
| Border radius | rounded-lg | rounded-lg | rounded-lg | rounded-xl | OK |
| Body text | text-sm | text-sm | **text-[9~13px] 9건** | text-sm | **불일치** |
| Heading | text-3xl | text-2xl | 없음 | text-3xl | 경미 |
| 아이콘 크기 | w-5 h-5 | w-4 h-4 | **w-3~w-6 혼재** | w-5 h-5 | **불일치** |
| Step 표시 | FloatingStep (원형) | 없음 | **인라인 텍스트** | 없음 | **불일치** |

### 5-A. 글로벌 스페이싱 토큰 정의

`lib/design-tokens/common.ts` (Phase 4에서 생성)에 추가:

```ts
export const SPACING = {
  sectionGap: 'space-y-6',        // 섹션 간 (24px)
  subsectionGap: 'space-y-4',     // 하위 섹션 (16px)
  elementGap: 'space-y-2',        // 요소 간 (8px)
  cardPadding: 'p-4',             // 카드 내부 (16px)
  compactPadding: 'p-3',          // 밀도 높은 영역 (12px)
  pageX: 'px-6',                  // 페이지 좌우 (24px)
  pageY: 'py-8',                  // 페이지 상하 (32px)
} as const

export const TYPOGRAPHY = {
  pageTitle: 'text-2xl font-bold tracking-tight',
  sectionTitle: 'text-lg font-semibold',
  body: 'text-sm',
  caption: 'text-xs text-muted-foreground',
} as const

export const ICON_SIZE = {
  lg: 'w-5 h-5',    // 주요 아이콘
  md: 'w-4 h-4',    // 보조 아이콘
  sm: 'w-3.5 h-3.5', // 인라인 아이콘
} as const
```

### 5-B. Graph Studio 스페이싱 완화

**현재**: 내부 패널 gap-1 (4px) → 정보가 빽빽하게 붙어있음
**목표**: 패널 내부 space-y-2~3, 패널 간 gap-2~3

변경 대상:
- `graph-studio/panels/StyleTab.tsx` — gap-1 → space-y-2
- `graph-studio/panels/DataTab.tsx` — gap-1 → space-y-2
- `graph-studio/panels/AnnotationTab.tsx` — gap-1 → space-y-2
- `graph-studio/LeftDataPanel.tsx` — 내부 spacing 조정
- `graph-studio/RightPropertyPanel.tsx` — 내부 spacing 조정

**주의**: Graph Studio는 3-패널 레이아웃이라 지나친 여유는 공간 낭비. 패널 내부만 완화.

### 5-C. Graph Studio 커스텀 텍스트 사이즈 제거

**현재**: Tailwind 표준 외 사이즈 혼재
- `text-[13px]` — 1건 (StepIndicator, Phase 3에서 자연 제거)
- `text-[10px]` — 6건 (ChartSetupPanel, LeftDataPanel, AnnotationTab, DataTab, StyleTab)
- `text-[11px]` — 1건 (AiPanel)
- `text-[9px]` — 1건 (StyleTab)

**목표**: `text-[10px]`~`text-[11px]` → `text-xs` (12px), `text-[9px]` → `text-[10px]` 또는 제거
**주의**: 패널 내 라벨이 text-xs로도 충분한지 육안 확인 필요 (좁은 패널)

### 5-D. 아이콘 크기 통일

현재 Graph Studio에서 w-3~w-6 혼재 → ICON_SIZE 토큰 적용

### 5-E. Graph Studio gap-1 컨텍스트 주의

- gap-1 31건 대부분 **아이콘+텍스트 쌍** (예: `<Icon /> 라벨`) 용도 — 이 용도는 gap-1이 적절
- Accordion/Collapsible 내부는 `px-3` padding 사용 (gap-1 아님)
- **수정 대상**: 섹션 간 gap-1만 space-y-2로 변경. 아이콘+텍스트 gap-1은 유지

---

## Phase 6: 앱 톤 통일 — 컴포넌트 패턴

### 6-A. StepIndicator 스타일 통일 (Phase 3과 연계)

Phase 3에서 Graph Studio → common/StepIndicator 전환 후,
레퍼런스 UI 스타일로 업데이트:

- **현재**: 원형 아이콘 + 연결선 (무겁고 복잡)
- **목표**: `1/3` 숫자 + 프로그레스 바 + 단계명 (레퍼런스처럼 단순)
- 기존 FloatingStepIndicator variant로 추가 (`variant: "minimal"`)

### 6-B. 선택 카드 패턴 표준화

레퍼런스의 A/B/C/D 뱃지 카드와 유사한 **선택 패턴**:
- **PurposeCard** (Smart Flow Step 1) — 아이콘+제목+설명+예시, 선택 시 ring+check
- **OptionCard** (Statistics 설정) — 아이콘+제목+설명+뱃지, 선택 시 ring

이 둘은 구조가 **매우 유사** → `SelectionCard` 공통 컴포넌트 추출 가능.

**BioToolCard는 제외** — 도구 쇼케이스 카드 (선택이 아닌 네비게이션), 핀 토글 등 다른 패턴.

공통 패턴:
```
[아이콘] + [제목] + [설명(선택)] → 호버 시 border-primary, 선택 시 bg-primary/5 + ring
```
→ `card-styles.ts`의 `selectableItemBase` 강화 + `SelectionCard` 공통 컴포넌트

### 6-C. 결과 카드 톤 통일

- Analysis: ResultsHeroCard (풍부)
- Bio-Tools: 인라인 border rounded-lg (단순)
- 목표: Bio-Tools에도 최소한의 결과 헤더 + 통계 카드 패턴 적용

### 6-D. 에러 표시 패턴 정리 (3종 → 2종)

현재 3개 에러 컴포넌트가 역할 겹침:
- `BioErrorBanner` — AlertCircle + 텍스트 (최소)
- `AnalysisErrorAlert` — 제목 + dismiss + variant (풍부)
- `InlineError` — 커스텀 CSS 클래스 + retry 버튼

**목표**: `InlineError` (폼 필드용) + `AnalysisErrorAlert` (섹션 에러용) 2종으로 정리.
`BioErrorBanner`는 `AnalysisErrorAlert`의 compact variant로 흡수.

### 6-E. 스켈레톤/로딩 패턴 검토

현재 3개 로딩 구현:
- `TableSkeleton` — 테이블 전용
- `ChartSkeleton` — 차트 전용
- `PyodideLoadingIndicator` — Pyodide 엔진 로딩

이들은 **용도가 다르므로 통합 불필요**. 단, 스켈레톤 색상/애니메이션이 일관된지 확인.

---

## Phase 7: 문서화

- `lib/design-tokens/README.md` — 토큰 사용 가이드
- 어떤 토큰 파일을 언제 쓰는지 의사결정 트리
- 영역별 스타일 적용 예시

---

## 우선순위 & 의존성

```
Phase 1 (죽은 코드)      ✅ 완료 (1-A)  ─────────────────────┐
Phase 2 (차트 색상)       독립                                │
Phase 3 (StepIndicator)  독립                                │
Phase 4 (토큰 계층)       Phase 1 후 ──── Phase 5 (스페이싱) │
Phase 5 (스페이싱/타이포) Phase 4 후 ──── Phase 6 (패턴)     │
Phase 6 (컴포넌트 패턴)   Phase 3+5 후                       │
Phase 7 (문서화)          Phase 6 후 ─────────────────────────┘
```

**추천 실행 순서**: 2 → 3 → 4 → 5 → 6 → 7 (각 Phase 독립 커밋)

## 검증 기준

각 Phase 완료 시:
- `pnpm tsc --noEmit` 통과
- `pnpm test` 기존 테스트 통과
- 기능 동작 변경 없음
- **Phase 5~6 추가**: 주요 페이지 4곳 육안 비교 (스페이싱/톤 일관성)
