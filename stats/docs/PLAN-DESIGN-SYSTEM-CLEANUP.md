# PLAN: 디자인 시스템 정리 + 앱 톤 통일

> 2026-03-26 작성 · 커밋 `bda50fea`로 Phase 1~5 완료

## 디자인 방향 (레퍼런스)

미니멀 퀴즈 UI 참고 — 핵심 원칙:

| 원칙 | BioHub 적용 | 상태 |
|------|-------------|------|
| 넉넉한 호흡 | `space-y-6` + `p-4` 기본 | ✅ SPACING 토큰 정의 |
| 단일 accent | `--section-accent-*` 4색 체계 | ✅ 기존 유지 |
| 3단계 타이포 | text-2xl/lg → text-sm → text-xs | ✅ TYPOGRAPHY 토큰 정의, text-[Npx] 제거 |
| subtle shadow | shadow-sm 기본, hover 시 shadow-md | ✅ 이미 일관 |
| 카드 기반 선택지 | PurposeCard 패턴 | — 통합 보류 (6-B) |
| 미니멀 프로그레스 | FloatingStepIndicator | — 보류 (6-A) |

---

## 완료 (커밋 `bda50fea`)

### Phase 1: 죽은 코드 제거 ✅
- `lib/styles/colors.ts` (217줄) + `index.ts` 삭제
- `lib/design-system/tokens.ts` — 데모 페이지 인프라로 유지

### Phase 2: 차트 색상 통일 ✅
- `globals.css`에 `--chart-6`~`--chart-10` 추가 (light chromatic + dark chromatic)
- `chart-color-resolver.ts` 신규: `resolveChartPalette`, `resolveAxisColors`, `resolveSemanticColors`, `resolveCssVar`
- `echarts-stat-utils.ts` 하드코딩 → resolver
- 11파일 하드코딩 hex 수정 (Bio-Tools, Analysis/Charts, CorrelationHeatmap)
- `bio-chart-colors.ts` → `CHART_PALETTE_FALLBACK` import (중복 제거)
- 예외 유지: AnnotationTab 입력 기본값, StyleTab `#ffffff`, ResultsActionStep HTML 템플릿, plotly-chart-renderer

### Phase 3: StepIndicator 정리 ✅
- **결정**: 독립 유지 — common(348줄, 원형+Framer Motion) vs Graph Studio(35줄, 인라인 텍스트)는 근본적으로 다른 패턴
- `text-[13px]` → `text-xs` 수정

### Phase 4: TS 토큰 계층 중앙화 ✅
- `lib/design-tokens/`에 common, analysis, bio, status, index.ts 배치
- 구 파일 4개를 `@deprecated` re-export 래퍼로 교체 (54개 import 하위 호환)

### Phase 5: 앱 톤 통일 — 토큰 + 텍스트 ✅
- `SPACING`, `TYPOGRAPHY`, `ICON_SIZE` 글로벌 토큰 정의 (`common.ts`)
- Graph Studio `text-[9~13px]` 10건 → `text-xs` 표준화

---

## 남은 작업 (후속)

### 가성비 높음 — 단독 실행 가능

#### A. dark mode chart-1~5 chromatic 전환
- **현재**: `--chart-1`~`--chart-5` dark mode에서 chroma=0 (순수 회색)
- **문제**: 멀티시리즈 차트에서 색상 구분 불가
- **작업**: globals.css `.dark` 블록에서 5개 변수 OKLCH chroma 추가 (5줄 변경)
- **위험**: 기존 모노크롬 dark theme 의도와 충돌 가능 → 디자인 결정 필요

#### B. 에러 배너 3종 → 2종 정리 (6-D)
- `BioErrorBanner` → `AnalysisErrorAlert`의 compact variant로 흡수
- `InlineError` (폼 필드용) + `AnalysisErrorAlert` (섹션 에러용)
- Bio-Tools 18개 파일에서 import 변경

#### C. design-tokens README (Phase 7)
- 토큰 계층 정리 완료 상태이므로 사용법 가이드 문서화
- 의사결정 트리: 글로벌=common, Analysis=analysis, Bio=bio

### 가성비 보통 — 기능 작업 시 병행

#### D. Graph Studio 섹션 간 spacing 조정 (5-B)
- 섹션 간 gap-1 → space-y-2 (아이콘+텍스트 gap-1은 유지)
- **전제**: 육안 확인 필요 — 좁은 패널에서 공간 낭비 위험
- 대상: StyleTab, DataTab, AnnotationTab, LeftDataPanel, RightPropertyPanel

#### E. Graph Studio 아이콘 크기 → ICON_SIZE 토큰 적용 (5-D)
- 현재 w-3~w-6 혼재 → ICON_SIZE.lg/md/sm
- 점진적 적용 (Graph Studio 수정 작업 시 병행)

#### F. Bio-Tools 결과 카드 톤 격상 (6-C)
- Analysis: ResultsHeroCard (풍부) vs Bio-Tools: 인라인 border (단순)
- 다음 Bio-Tools 기능 추가 시 병행

#### G. 잔여 하드코딩 hex (발견 시 즉석 수정)
- `group-comparison.tsx` `#666` (stroke)
- `boxplot.tsx` `#fff` (mean marker — dark mode 깨짐)

### 보류/버림

| 항목 | 이유 |
|------|------|
| 6-A StepIndicator minimal variant | 현재 각 StepIndicator가 용도에 맞게 작동 |
| 6-B PurposeCard+OptionCard 통합 | 12+ props kitchen sink — 절약 ~100줄 < 복잡도 증가 |
| 6-E 스켈레톤 통합 | 3종 모두 용도가 달라 통합 불필요 |
| plotly-config.ts 색상 체계 | ECharts 마이그레이션 완료 전까지 레거시 |
| re-export 래퍼 → 직접 import 전환 | 신규 코드부터 자연 적용, 일괄 전환 불필요 |

---

## 현재 토큰 구조 (최종)

```
lib/design-tokens/
  ├── index.ts        배럴 (계층 문서화)
  ├── common.ts       글로벌: 카드 패턴, LAYOUT, SPACING, TYPOGRAPHY, ICON_SIZE, 모션
  ├── analysis.ts     Analysis: STEP_STYLES (패딩/테이블/갭)
  ├── bio.ts          Bio-Tools: accent, 뱃지, 유의성, 테이블 (analysis.ts 참조)
  ├── status.ts       모노크롬 상태 스타일 (그레이스케일)
  └── step-flow.ts    StepIndicator 전용 (색상 variant, 애니메이션)

lib/charts/
  └── chart-color-resolver.ts   CSS 변수 → ECharts 색상 런타임 해석

하위 호환 re-export 래퍼 (신규 코드에서는 design-tokens/ 직접 import):
  - components/common/card-styles.ts → design-tokens/common
  - components/analysis/common/style-constants.ts → design-tokens/analysis
  - components/bio-tools/bio-styles.ts → design-tokens/bio
  - lib/constants/ui-constants.ts → design-tokens/status
```
