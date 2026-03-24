# 차트 렌더링 통일 계획서

> 통계 분석 차트(SVG + Recharts + Plotly 혼재) → ECharts 단일 렌더링으로 통일
> 목적: 데이터 탐색용 차트의 시각적 일관성 확보. 논문 품질은 Graph Studio 담당.

## 배경

### 두 기능의 목적 차이

| | 통계 분석 차트 (이 계획 범위) | Graph Studio (범위 밖) |
|---|---|---|
| **목적** | 데이터 파악 → 분석 방법 결정 | 논문/발표용 최종 출력물 |
| **사용 시점** | 분석 중간 (exploration/validation) | 분석 완료 후 |
| **품질 기준** | 분포/패턴 파악 가능하면 됨 | 저널 투고 기준 |
| **논문 필요 시** | Graph Studio 버튼 → 이동 (이미 연동 완료) | ChartSpec + matplotlib export |

### 문제

통계 분석 차트가 3개 라이브러리로 파편화:

| 컴포넌트 | 라이브러리 | 사용처 |
|----------|----------|--------|
| `boxplot.tsx` | 순수 SVG | exploration (DistributionChartSection) |
| `scatterplot.tsx` | Recharts | exploration (ScatterHeatmapSection) |
| `histogram.tsx` | Recharts | exploration (DistributionChartSection) |
| `group-comparison.tsx` | Recharts | (레거시 페이지) |
| `BarChartWithCI.tsx` | 순수 SVG | (레거시 페이지) |
| `PlotlyChartImproved.tsx` | Plotly | validation (ColumnDetailModal, CorrelationHeatmap) |
| `StatisticalChartsImproved.tsx` | Plotly | validation (ColumnDetailModal) |

**결과:** 차트마다 색상/스타일/인터랙션이 제각각. 번들에 Recharts + Plotly + ECharts 3개 포함.

### 해결 방향

각 래퍼가 **props → ECharts option 직접 생성**. ChartSpec 파이프라인 경유 안 함.
Graph Studio와 공유하는 건 **ECharts 라이브러리 + 색상 팔레트**이지, ChartSpec이 아님.

---

## Phase 1: 공통 유틸 + 색상 통합

### 1-1. ECharts 공통 유틸 (신규)

`lib/charts/echarts-stat-utils.ts` — 분석 차트 전용 ECharts 유틸:

```typescript
import { OkabeIto 팔레트 } from '@/lib/graph-studio/chart-spec-defaults';

/** 분석 차트 공통 색상 (OkabeIto — 색맹 안전) */
export const STAT_COLORS = JOURNAL_PALETTES.OkabeIto;

/** 분석 차트 공통 기본 옵션 */
export function statBaseOption(): Partial<EChartsOption> {
  return {
    animation: true,
    animationDuration: 300,
    textStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 },
    grid: { left: 60, right: 20, top: 30, bottom: 50, containLabel: true },
  };
}

/** 카테고리 축 기본 설정 */
export function statCategoryAxis(categories: string[]): Record<string, unknown>;

/** 수치 축 기본 설정 */
export function statValueAxis(title?: string): Record<string, unknown>;

/** 공통 tooltip 스타일 */
export function statTooltip(): Record<string, unknown>;
```

Graph Studio의 `chart-spec-defaults.ts`에서 **팔레트만 import**. 나머지는 독립.

### 1-2. ECharts lazy loading 래퍼 (신규)

`lib/charts/LazyECharts.tsx` — 분석 페이지 번들 증가 방지:

```typescript
import dynamic from 'next/dynamic';

/** ECharts를 dynamic import로 로드 — 분석 페이지 초기 번들에 미포함 */
export const LazyReactECharts = dynamic(
  () => import('echarts-for-react').then(mod => mod.default),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

**파일:** `lib/charts/echarts-stat-utils.ts`, `lib/charts/LazyECharts.tsx`

---

## Phase 2: 래퍼 교체 (핵심)

기존 props 인터페이스 유지 → 호출부 변경 없음.
각 래퍼가 props에서 ECharts option을 **직접** 생성.

### 2-1. `boxplot.tsx` → ECharts

현재: `BoxPlotData[]` (min/q1/median/q3/max/mean/outliers) → SVG 직접 렌더링
교체: 동일 props → ECharts option 생성

```typescript
// 핵심 변환 로직 (래퍼 내부)
function toEChartsOption(data: BoxPlotData[], overlay options): EChartsOption {
  const categories = data.map(d => d.name);
  const boxData = data.map(d => [d.min, d.q1, d.median, d.q3, d.max]);
  const series = [{ type: 'boxplot', data: boxData }];

  // 평균 마커 (기존 기능 보존)
  if (showMean) {
    series.push({
      type: 'scatter', symbol: 'diamond', symbolSize: 8,
      data: data.map((d, i) => d.mean != null ? [i, d.mean] : null).filter(Boolean),
    });
  }

  // 이상치 (기존 기능 보존)
  if (showOutliers) {
    const outlierPoints = data.flatMap((d, i) =>
      (d.outliers ?? []).map(v => [i, v])
    );
    series.push({ type: 'scatter', symbolSize: 5, data: outlierPoints });
  }

  return { ...statBaseOption(), xAxis: ..., yAxis: ..., series, tooltip: ... };
}
```

보존: Card 래퍼, Chart/Table 탭, CSV 다운로드, 전체화면, 로딩/에러, 접근성.
새로 얻는 것: 애니메이션, 데이터 줌, PNG 다운로드, OkabeIto 색상.

### 2-2. `histogram.tsx` → ECharts

현재: raw number[] → Recharts BarChart
교체: 동일 props → ECharts bar series (빈 개수 로직 유지)

정규분포 곡선 오버레이, 기술통계 텍스트 보존.

### 2-3. `scatterplot.tsx` → ECharts

현재: {x[], y[]} → Recharts ScatterChart
교체: 동일 props → ECharts scatter series

추세선 + R² 보존. ECharts `markLine` 또는 별도 line series로.

### 2-4. `group-comparison.tsx` → ECharts

현재: grouped data → Recharts BarChart + SEM 오차막대
교체: 동일 props → ECharts bar + custom error-bar overlay

### 2-5. `BarChartWithCI.tsx` → ECharts

현재: BarChartData[] (value/ci/se) → SVG 직접 렌더링
교체: 동일 props → ECharts bar + error-bar + 효과크기 색상

### 2-6. Validation 차트 교체

- `ColumnDetailModal.tsx`: PlotlyChartImproved → ECharts histogram/bar
- `ColumnDetailModal.tsx`: `BarChartComponent` (StatisticalChartsImproved) → ECharts bar
- `CorrelationHeatmap.tsx`: PlotlyChartImproved → ECharts heatmap
- `chartHelpers.ts` (validation/utils/): Plotly import → 교체 또는 제거

### 2-7. `ResultsVisualization.tsx` → ECharts (핵심 — 602줄, Recharts 최대 사용처)

이 파일이 **분석 결과 화면의 모든 차트**를 담당함. 교체 범위에서 빠지면 결과 화면은 계속 Recharts 혼합 상태.

현재 메서드별 Recharts 사용:

| 분석 메서드 | Recharts 컴포넌트 | ECharts 교체 |
|------------|------------------|-------------|
| t-검정 / ANOVA | BarChart + ErrorBar + Cell | bar series + custom error overlay |
| 상관분석 | ScatterChart + Scatter | scatter series |
| 회귀분석 | ComposedChart + Scatter + Line | scatter + line series |
| 비모수 검정 | BarChart + ErrorBar + Cell | bar series + error overlay |
| PCA/요인분석 | ComposedChart + Bar + Line | bar + line series (scree plot) |
| 군집분석 | ScatterChart + Scatter | scatter series (cluster 색상) |
| 신뢰도 (Cronbach) | BarChart (vertical) + Cell | bar series (horizontal) |
| 검정력 분석 | LineChart + Line + ReferenceLine | line series + markLine |

**교체 전략: 렌더러만 교체, 데이터 로직 보존.**

파일 구조:
- lines 1~22: Recharts import → ECharts import로 교체
- lines 27~58: `CHART_COLORS` (CSS 변수 → HEX 변환) → `STAT_COLORS` (OkabeIto)로 교체
- lines 60~95: `CustomTooltip` → ECharts 내장 tooltip으로 교체
- lines 97~240: `useMemo` 데이터 변환 로직 → **그대로 유지** (vizData → chartData)
- lines 242~591: 메서드별 렌더링 분기 → 각각 ECharts option으로 교체

**주의:** Card 래퍼, 그라데이션 배경, 하단 통계 요약 텍스트 등 **UI 구조는 그대로 유지**.
바뀌는 건 `<ResponsiveContainer><BarChart>...</BarChart></ResponsiveContainer>` →
`<LazyReactECharts option={...} style={{height: 300}} />` 부분만.

이 파일은 크기 때문에 **메서드별로 나눠서 교체** 가능:
1. t-검정/ANOVA + 비모수 (같은 bar+error 패턴)
2. 상관 + 회귀 + 군집 (같은 scatter 패턴)
3. PCA (composed → bar+line)
4. 신뢰도 (horizontal bar)
5. 검정력 (line + reference)

### 2-8. 기존 테스트 대응

`__tests__/BarChartWithCI.test.tsx` 등 SVG DOM 기반 테스트:
- 테스트 환경에서 ECharts `opts.renderer = 'svg'` 강제 → SVG DOM 검증 유지 가능
- 또는 EChartsOption 출력 기반 단위 테스트로 전환 (props → option 변환만 검증)

### 교체 순서

한 컴포넌트씩 교체하고 시각 검증:

```
1. boxplot.tsx (SVG → ECharts 전환 검증 기준, 기능 가장 풍부)
  ↓
2. histogram.tsx + scatterplot.tsx (Recharts → ECharts, 탐색 단계)
  ↓
3. ResultsVisualization.tsx (Recharts → ECharts, 결과 화면 전체 — 메서드별 분할 교체)
  ↓
4. group-comparison.tsx + BarChartWithCI.tsx (레거시, 우선순위 낮음)
  ↓
5. Validation 차트 (Plotly → ECharts)
```

**1~2는 탐색 단계, 3은 결과 단계.** 1~2에서 ECharts 패턴이 검증되면 3에 같은 패턴 적용.

**파일:** `components/charts/*.tsx`, `components/analysis/steps/validation/charts/*.tsx`

---

## Phase 3: 정리

### 3-1. Recharts 제거

- Phase 2 완료 후 Recharts import 0건 확인
- Bio-Tools에서 Recharts 사용 여부 확인 → 사용 시 별도 판단
- 0건이면 `pnpm remove recharts` (~40KB gzipped 절감)

### 3-2. Plotly 정리

- `PlotlyChartImproved.tsx` — validation 교체 후 제거
- `StatisticalChartsImproved.tsx` — 제거
- **유지**: `pyodide-plotly-chart-panel.tsx` (별도 Plotly 패널, violin/QQ/heatmap)
- **유지**: `plotly-chart-renderer.tsx` (Plotly 패널 렌더러)

### 3-3. Design System 데모

- `VisualizationDemo.tsx`: 새 ECharts 래퍼로 import 변경

### 3-4. 하드코딩 색상 제거 확인

- boxplot.tsx의 `['#3B82F6', '#10B981', ...]` → `STAT_COLORS`
- scatterplot.tsx, group-comparison.tsx 동일
- 번들 크기 before/after 비교

---

## 별도 트랙: matplotlib parity 정리 (독립 실행 가능)

이 작업은 차트 통일과 무관하게 진행 가능한 기존 코드 품질 정리:

### M-1. 필드명 불일치

worker6-matplotlib.py:317의 `significanceMarks` → `significance`로 수정.

### M-2. MPL_SUPPORTED_CHART_TYPES 공유 상수화

ExportDialog.tsx:62의 하드코딩 Set → `lib/graph-studio/matplotlib-compat.ts`로 이동.

### M-3. export warnings persistent UI

현재: export 완료 시 경고 사라짐.
수정: `useMatplotlibExport`에 `warnings: string[]` 상태 추가 → ExportDialog에서 persistent alert.

### M-4. matplotlib 차트 타입 확장 (필요 시)

boxplot/histogram/violin 렌더러 추가 → MPL_SUPPORTED_CHART_TYPES 업데이트 → ExportDialog 문구 업데이트.
이건 Graph Studio 사용자가 실제로 요청할 때 진행.

---

## 안 건드리는 것

| 항목 | 이유 |
|------|------|
| ChartSpec 타입 | 분석 차트는 ChartSpec 파이프라인을 경유하지 않음 |
| echarts-converter.ts | Graph Studio 전용 — 분석 래퍼와 독립 |
| Zod 스키마 / AI patch | Graph Studio 전용 |
| matplotlib export | 별도 트랙 (독립 실행) |
| Plotly 패널 (pyodide-plotly-chart-panel) | violin/QQ/heatmap 별도 경로 |
| Graph Studio ↔ 분석 연동 | 이미 1차 연동 완료 |
| Bio-Tools 차트 색상 | 별도 디자인 체계 |
| 레거시 `/statistics/*` 43개 | CLAUDE.md 규칙: 코드 유지, 신규 개발 안 함 |

---

## 리스크

### ECharts 번들 (중간)

현재 ECharts는 Graph Studio 라우트에서만 로드.
분석 페이지에 추가되면 해당 번들 증가.
→ Phase 1-2의 `LazyReactECharts`로 dynamic import — 초기 로드 영향 최소화.

### SVG → ECharts 시각 차이 (낮음)

SVG BoxPlot의 섬세한 호버 효과 → ECharts `emphasis`로 재현.
Recharts 곡선 → ECharts `smooth: true`.
교체 후 시각 검증 필수 (한 컴포넌트씩).

### 기존 테스트 깨짐 (낮음)

SVG DOM 기반 테스트 → Phase 2-8에서 대응.

---

## 실행 순서 요약

```
Phase 1: 공통 유틸 준비 ✅
  ├─ echarts-stat-utils.ts (색상, 기본 옵션, 축 헬퍼, errorBarSeries)
  └─ LazyECharts.tsx (dynamic import 래퍼)
  ↓
Phase 2: 래퍼 교체 (한 컴포넌트씩) ✅
  ├─ boxplot → histogram → scatterplot
  ├─ ResultsVisualization (8개 메서드)
  ├─ group-comparison + BarChartWithCI
  └─ Validation 차트 (Plotly → ECharts: ColumnDetailModal, CorrelationHeatmap)
  ↓
Phase 3: 정리 ✅
  ├─ Recharts import 0건, next.config에서 제거
  ├─ Validation Plotly → ECharts 교체 완료
  ├─ 테스트 ECharts mock 전환 (3 파일)
  └─ /simplify 리뷰: tooltip 중복 제거, errorBarSeries 추출, histogram 시리즈 버그 수정

잔여: Recharts 패키지 제거 (pnpm remove), PlotlyChartImproved/StatisticalChartsImproved 파일 삭제
별도: matplotlib parity (독립 실행 가능)
```
