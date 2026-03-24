# 차트 렌더링 통일 — 코드 리뷰 요청

> 통계 분석 차트(SVG + Recharts + Plotly 혼재) → ECharts 렌더링으로 교체
> 범위: 탐색(exploration) + 검증(validation) 차트 컴포넌트. 결과 화면(ResultsChartsSection)은 별도 경로 — ResultsVisualization.tsx는 현재 데드 코드.
> recharts/plotly.js 패키지는 아직 package.json에 잔존 (pyodide-plotly-chart-panel 등 별도 사용처 때문).

## 변경 요약

| 구분 | Before | After |
|------|--------|-------|
| 차트 라이브러리 | SVG 직접 / Recharts / Plotly 혼재 | ECharts 단일 |
| 색상 | 하드코딩 HEX 6종 | OkabeIto 팔레트 (색맹 안전) |
| 로딩 | Recharts 번들 포함 / Plotly dynamic | ECharts dynamic import (LazyReactECharts) |
| 에러바 | 파일별 직접 구현 (3곳 중복) | `errorBarSeries()` 공통 유틸 |
| 툴팁 | 인라인 스타일 15곳 중복 | `statTooltip(overrides?)` |

**-1506줄 / +1070줄** (12 파일 + 신규 2 파일 + 테스트 3 파일)

---

## 변경 파일 목록

### 신규 파일

| 파일 | 역할 |
|------|------|
| `lib/charts/echarts-stat-utils.ts` | 공통 유틸 (색상, 축, tooltip, errorBar) |
| `lib/charts/LazyECharts.tsx` | `next/dynamic` 래퍼 (SSR 방지 + 스켈레톤) |

### 교체된 차트 컴포넌트

| 파일 | Before | After | Props 변경 |
|------|--------|-------|-----------|
| `components/charts/boxplot.tsx` | 순수 SVG (745줄) | ECharts boxplot + scatter (465줄) | `orientation` prop 선언만 유지, ECharts 미전달 (기존에도 SVG에서 미구현) |
| `components/charts/histogram.tsx` | Recharts BarChart | ECharts bar + markLine | 없음 |
| `components/charts/scatterplot.tsx` | Recharts ScatterChart | ECharts scatter + line | 없음 |
| `components/charts/group-comparison.tsx` | Recharts BarChart + ErrorBar | ECharts bar + errorBarSeries | 없음 |
| `components/charts/BarChartWithCI.tsx` | 순수 SVG (741줄) | ECharts bar + errorBarSeries (380줄) | `orientation` prop 선언만 유지, ECharts 미전달 (기존에도 SVG에서 미구현) |
| `components/analysis/ResultsVisualization.tsx` | Recharts (8개 메서드별 차트) | ECharts (동일 8개 분기) | 없음 — **주의: 현재 프로덕션에서 미사용 (데드 코드). 테스트에서만 mock 참조.** |
| `validation/charts/ColumnDetailModal.tsx` | PlotlyChartImproved | ECharts histogram/boxplot/bar | 없음 |
| `validation/charts/CorrelationHeatmap.tsx` | PlotlyChartImproved heatmap | ECharts heatmap | 없음 |

### 설정/테스트

| 파일 | 변경 |
|------|------|
| `next.config.ts` | `optimizePackageImports`에서 `recharts` 제거 |
| `charts/__tests__/BarChartWithCI.test.tsx` | SVG DOM 쿼리 → ECharts mock 기반으로 전환 |
| `__tests__/components/charts/histogram.test.tsx` | Recharts mock → ECharts mock |
| `__tests__/statistics-pages/regression.test.tsx` | Recharts mock → ECharts mock |

---

## 아키텍처 결정

### 1. Graph Studio와의 관계

```
Graph Studio (ChartSpec 파이프라인)     분석 차트 (이 변경)
─────────────────────────────────     ──────────────────
echarts-converter.ts                  echarts-stat-utils.ts
ChartSpec → ECharts option            Props → ECharts option 직접 생성
Zod 스키마 + AI patch                 공유 없음
                        ↓ 공유 ↓
              ECharts 라이브러리 + OkabeIto 팔레트
```

분석 차트는 ChartSpec 파이프라인을 경유하지 않음. 공유하는 것은 ECharts 라이브러리와 색상 팔레트뿐.

### 2. Props 인터페이스 유지

모든 컴포넌트의 props 인터페이스가 그대로 유지됨 → 호출부 변경 없음.
내부 렌더링만 SVG/Recharts/Plotly → `<LazyReactECharts option={...} />` 로 교체.

### 3. 유지되는 Plotly 파일

| 파일 | 이유 |
|------|------|
| `pyodide-plotly-chart-panel.tsx` | violin/QQ/heatmap 별도 경로 |
| `plotly-chart-renderer.tsx` | 위 패널의 렌더러 |

더 이상 import되지 않지만 미삭제된 파일:
- `PlotlyChartImproved.tsx` — 위 2개가 의존하지 않음, 삭제 가능
- `StatisticalChartsImproved.tsx` — ColumnDetailModal이 더 이상 사용 안 함, 삭제 가능
- `chartHelpers.ts` — Plotly 타입 의존, re-export 경로에만 존재

---

## 리뷰 포인트

### 1. ECharts 타입 캐스팅

`as Record<string, unknown>` 캐스트를 series 배열에 사용함. ECharts의 union 타입(`BarSeriesOption | ScatterSeriesOption | ...`)이 strict하여, 서로 다른 타입의 시리즈를 한 배열에 넣을 때 타입 에러가 발생하기 때문.

```typescript
// 현재 패턴
series: [
  { type: 'bar', ... } as Record<string, unknown>,
  errorBarSeries(data),   // Record<string, unknown> 반환
]
```

**리뷰 질문**: 이 캐스트 대신 ECharts에서 제공하는 series union 타입을 사용하는 게 더 나은지?

### 2. tooltip formatter 타입

ECharts `formatter` 콜백의 파라미터 타입이 `CallbackDataParams`인데, `Record<string, unknown>`과 호환되지 않음. `unknown`으로 받고 내부에서 캐스트하는 패턴 사용:

```typescript
formatter(params: unknown) {
  const p = params as { value: number[]; dataIndex: number }
  // ...
}
```

### 3. 공통 유틸 반환 타입

`echarts-stat-utils.ts`의 함수들이 `Record<string, unknown>`을 반환함. `EChartsOption` 하위 타입으로 좁히는 게 나은지?

### 4. SVG 렌더러 선택

모든 ECharts 인스턴스에 `opts={{ renderer: 'svg' }}`를 사용. 이유:
- jsdom 테스트에서 canvas 불가
- 접근성 (DOM 구조)
- 성능: 데이터 포인트 1000개 이하에서 SVG가 적절

대용량 데이터(scatter 1000+점)에서 canvas가 나은 경우가 있으나, `sampleLargeData()`로 1000개 제한하므로 문제없음.

### 5. ColumnDetailModal 계산 시점

`useMemo`에 `isOpen` 가드를 추가하여 모달이 닫혀있을 때 불필요한 데이터 계산을 방지. 하지만 `column`이 non-null이고 `isOpen`이 false → true로 바뀌는 순간 한 번에 계산이 몰릴 수 있음.

---

## 알려진 한계 (별도 트랙)

| 항목 | 설명 | 위험도 |
|------|------|--------|
| **ResultsVisualization 데드 코드** | 프로덕션에서 import 없음. 실제 결과 화면은 ResultsChartsSection → StatisticsTable + MethodSpecificResults 경로. 테스트 mock에서만 참조 | High |
| **recharts/plotly.js 패키지 잔존** | package.json에 recharts, plotly.js 남아있음. 런타임 분석 차트는 ECharts 통일이나 패키지 미삭제 | Medium |
| **validation barrel export** | `validation/utils/index.ts`가 Plotly 기반 chartHelpers를 여전히 노출 | Low |
| 접근성 | 기존 SVG `role="img"` / `aria-label` / 키보드 내비게이션 제거됨. ECharts에 ARIA 커스텀 필요 | Medium |
| `orientation` prop | boxplot/BarChartWithCI에서 받지만 ECharts에 전달 안 됨 (기존 SVG에서도 미구현) | Low |
| `as Record<string, unknown>` | ECharts series union 타입 대신 캐스트 사용. 오타 감지 불가 | Medium |
| BarChartWithCI 테스트 커버리지 | SVG DOM 기반 인터랙션 테스트 8건 → ECharts mock 기반 2건으로 축소 | Low |
| `calculateEffectSize` | raw difference를 Cohen's d 임계값과 비교 (표준화 안 됨) — 기존 로직 그대로 | Low |
| CorrelationHeatmap 다크모드 | heatmap 셀 라벨 `color: '#000'` 하드코딩 | Low |

---

## 검증 결과

```
TypeScript: 0 errors
Tests:      46 passed, 0 failed (차트 관련)
            기존 실패: intent-router 3건 (무관), DataExplorationStep-terminology 3건 (무관)
Recharts import: 0건 (코드에서 완전 제거됨)
```

---

## Diff

전체 diff는 3467줄로, 아래 명령으로 확인 가능:

```bash
git diff HEAD -- stats/lib/charts/ stats/components/charts/boxplot.tsx stats/components/charts/histogram.tsx stats/components/charts/scatterplot.tsx stats/components/charts/group-comparison.tsx stats/components/charts/BarChartWithCI.tsx stats/components/analysis/ResultsVisualization.tsx stats/components/analysis/steps/validation/charts/ stats/next.config.ts stats/components/charts/__tests__/ stats/__tests__/components/charts/histogram.test.tsx stats/__tests__/statistics-pages/regression.test.tsx
```
