# Design Tokens

앱 전체 시각 일관성을 위한 디자인 토큰 중앙 저장소.

## 구조

```
common.ts     글로벌 토큰 (모든 영역 공유)
analysis.ts   Analysis 전용 (Smart Flow 스텝 스타일)
bio.ts        Bio-Tools 전용 (accent, 유의성 배지)
status.ts     모노크롬 상태 스타일 (그레이스케일)
step-flow.ts  StepIndicator 전용 (색상 variant, 애니메이션)
```

## 어디서 import?

```ts
// 신규 코드 — design-tokens/ 직접 import
import { SPACING, TYPOGRAPHY, LAYOUT } from '@/lib/design-tokens/common'
import { STEP_STYLES } from '@/lib/design-tokens/analysis'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/lib/design-tokens/bio'

// 차트 색상 — chart-color-resolver 사용
import { resolveChartPalette, resolveAxisColors } from '@/lib/charts/chart-color-resolver'
```

기존 코드의 구 경로(`@/components/common/card-styles` 등)는 re-export 래퍼로 동작하지만, 신규 코드에서는 사용하지 마세요.

## 토큰 선택 가이드

| 상황 | 토큰 | 파일 |
|------|------|------|
| 카드 패딩, 섹션 gap, 페이지 여백 | `SPACING` | common.ts |
| 페이지/섹션 제목, 본문, 보조 텍스트 | `TYPOGRAPHY` | common.ts |
| 아이콘 크기 (lg/md/sm) | `ICON_SIZE` | common.ts |
| 콘텐츠 max-width, sticky 헤더 | `LAYOUT` | common.ts |
| 카드 hover/선택/정적 패턴 | `actionCardBase`, `selectableItemBase` 등 | common.ts |
| fade+slide 애니메이션 | `staggerContainer`, `staggerItem` | common.ts |
| Analysis 테이블 셀, 카드 헤더 배경 | `STEP_STYLES` | analysis.ts |
| Bio 섹션 accent, 뱃지, 유의성 배지 | `BIO_*`, `SIGNIFICANCE_BADGE` | bio.ts |
| 상태 아이콘/색상 (성공/오류/경고) | `STATUS_STYLES` | status.ts |
| ECharts 차트 색상 (dark mode 자동) | `resolveChartPalette()` | chart-color-resolver.ts |
| ECharts 축/툴팁 테마 | `resolveAxisColors()` | chart-color-resolver.ts |

## 주의

- `text-[Npx]` 커스텀 사이즈 금지 → `TYPOGRAPHY` 또는 Tailwind 표준(`text-xs`, `text-sm`) 사용
- ECharts에 hex 직접 전달 금지 → `resolveChartPalette()` / `resolveAxisColors()` 사용
- CSS 변수는 `globals.css`가 정규 소스 (TS에서 복제 금지)
