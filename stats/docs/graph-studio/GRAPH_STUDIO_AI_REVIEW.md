# Graph Studio 논문 활용 확장 — AI 코드 리뷰 패키지

> **목적**: 외부 AI(Claude Opus, GPT-4o 등)가 이번 구현을 검토할 수 있도록 변경 내용과 핵심 코드를 정리한 문서.
> **작성일**: 2026-02-28
> **검증 결과**: `pnpm tsc --noEmit` 0 errors · `pnpm test` 4982 통과

---

## 배경

Graph Studio는 CSV/Excel → ECharts 차트 렌더링 → PNG/SVG 내보내기를 지원하는 데이터 시각화 모듈.
이전에는 제목·차트유형·X/Y 필드 4개 컨트롤만 있었음.
이번 확장 목표: **논문(Nature/Science/IEEE) 제출 실용 수준**으로 끌어올리기.

GraphPad Prism 대비 부족했던 항목:

| 기능 | 이전 | 이번 |
|------|------|------|
| X/Y 축 제목 직접 입력 | 없음 | 추가 |
| 로그 스케일 | 없음 | Switch |
| Y축 범위 고정 | 없음 | min/max 입력 |
| 에러바 유형 선택 | 없음 (error-bar 차트만) | bar/line/error-bar 모두 |
| 범례 위치 | 없음 | 5가지 옵션 |
| 물리적 출력 크기 (mm) | 없음 | 저널 프리셋 + 직접 입력 |

---

## 변경 파일 목록

```
stats/types/graph-studio.ts              ExportConfig physicalWidth/Height 추가
stats/lib/graph-studio/chart-spec-schema.ts  Zod 스키마 업데이트
stats/lib/graph-studio/chart-spec-defaults.ts  JOURNAL_SIZE_PRESETS 추가
stats/lib/graph-studio/index.ts          mmToPx re-export 추가
stats/lib/graph-studio/echarts-converter.ts  yAxisBase·buildLegend·buildErrorBarOverlay
stats/lib/graph-studio/export-utils.ts   mmToPx + resize-export-restore
stats/components/graph-studio/panels/PropertiesTab.tsx  5개 컨트롤 섹션 추가
stats/components/graph-studio/panels/ExportTab.tsx  mm 입력 + 저널 프리셋 UI
stats/components/graph-studio/panels/AiEditTab.tsx  예시 2개 추가
stats/docs/GRAPH_STUDIO_EXPANSION_ADR.md  설계 결정 문서 (신규)
ROADMAP.md  이미지 삽입 미래 과제 추가
```

---

## 핵심 변경 코드

### 1. ExportConfig 타입 확장 (`types/graph-studio.ts`)

```typescript
export interface ExportConfig {
  format: ExportFormat;
  dpi: number;
  /** 출력 너비 (mm). undefined = 현재 DOM 크기 사용. */
  physicalWidth?: number;
  /** 출력 높이 (mm). undefined = 현재 DOM 크기 사용. */
  physicalHeight?: number;
}
```

### 2. mmToPx + resize-export-restore (`lib/graph-studio/export-utils.ts`)

```typescript
export function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * dpi / 25.4);
}

export function downloadChart(
  echartsInstance: EChartsType | null | undefined,
  config: ExportConfig,
  filename: string | undefined,
): void {
  if (!echartsInstance) return;

  const targetW = config.physicalWidth ? mmToPx(config.physicalWidth, config.dpi) : undefined;
  const targetH = config.physicalHeight ? mmToPx(config.physicalHeight, config.dpi) : undefined;
  const needsResize = targetW !== undefined || targetH !== undefined;

  if (needsResize) {
    echartsInstance.resize({ width: targetW, height: targetH });
  }

  let dataUrl: string;
  if (config.format === 'svg') {
    dataUrl = echartsInstance.getSvgDataURL();
  } else {
    const pixelRatio = Math.max(1, Math.round(config.dpi / 96));
    dataUrl = echartsInstance.getDataURL({ type: 'png', pixelRatio, backgroundColor: '#ffffff' });
  }

  if (needsResize) {
    echartsInstance.resize(); // DOM 크기로 원복
  }
  // ... download link
}
```

### 3. yAxisBase 로그 스케일 + domain (`lib/graph-studio/echarts-converter.ts`)

```typescript
function yAxisBase(spec: ChartSpec, style: StyleConfig) {
  const scale = spec.encoding.y.scale;
  const axisType = scale?.type === 'log' ? ('log' as const) : ('value' as const);
  const domain = (
    scale?.domain &&
    scale.domain.length === 2 &&
    typeof scale.domain[0] === 'number'
  ) ? (scale.domain as [number, number]) : undefined;

  return {
    type: axisType,
    name: spec.encoding.y.title ?? spec.encoding.y.field,
    nameLocation: 'middle' as const,
    nameGap: 48,
    // ... 폰트 설정
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  };
}
```

### 4. buildLegend (legend.orient → ECharts 위치) (`lib/graph-studio/echarts-converter.ts`)

```typescript
function buildLegend(spec: ChartSpec, style: StyleConfig): Record<string, unknown> {
  const orient = spec.encoding.color?.legend?.orient;
  if (orient === 'none') return { show: false };
  const posMap: Record<string, Record<string, unknown>> = {
    top:           { orient: 'horizontal', top: 0,    left: 'center' },
    bottom:        { orient: 'horizontal', bottom: 0, left: 'center' },
    left:          { orient: 'vertical',   left: 0,   top: 'center'  },
    right:         { orient: 'vertical',   right: 0,  top: 'center'  },
    // ... top-left, top-right, bottom-left, bottom-right
  };
  return {
    ...(orient && posMap[orient] ? posMap[orient] : { orient: 'horizontal' }),
    textStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
  };
}
```

### 5. buildErrorBarOverlay (pre-computed 데이터 받음, 이중계산 방지)

```typescript
function buildErrorBarOverlay(
  categories: string[],
  means: number[],
  lowers: number[],
  uppers: number[],
): Record<string, unknown> {
  return {
    type: 'custom', name: 'Error', z: 3,
    renderItem: (_params, api) => {
      const a = api as { value(...): ...; coord(...): ...; size(...): ... };
      const xIdx = Number(a.value(0));
      const mean  = Number(a.value(1));
      const lower = Number(a.value(2));
      const upper = Number(a.value(3));
      const [cx]  = a.coord([xIdx, mean]);
      const [, yTop] = a.coord([xIdx, mean + upper]);
      const [, yBot] = a.coord([xIdx, mean - lower]);
      const capHalf = a.size([1, 0])[0] * 0.12;
      const lineStyle = { stroke: '#333', lineWidth: 1.5 };
      return {
        type: 'group', children: [
          { type: 'line', shape: { x1: cx, y1: yTop, x2: cx,         y2: yBot }, style: lineStyle },
          { type: 'line', shape: { x1: cx-capHalf, y1: yTop, x2: cx+capHalf, y2: yTop }, style: lineStyle },
          { type: 'line', shape: { x1: cx-capHalf, y1: yBot, x2: cx+capHalf, y2: yBot }, style: lineStyle },
        ],
      };
    },
    data: categories.map((_, i) => [i, means[i] ?? 0, lowers[i] ?? 0, uppers[i] ?? 0]),
  };
}
```

**사용 패턴 (bar 차트)**:
```typescript
// buildErrorBarData 1회 호출 후 결과를 buildErrorBarOverlay에 전달 (이중 계산 없음)
const { categories, means, lowers, uppers } = buildErrorBarData(rows, xField, yField, ...);
return {
  series: [
    { type: 'bar', data: means, z: 2 },
    buildErrorBarOverlay(categories, means, lowers, uppers),
  ],
};
```

### 6. PropertiesTab 핵심 패턴

```typescript
// 축 제목: 고차 함수로 onBlur 핸들러 생성 (렌더 타임에 최신 inputVal 캡처)
const makeAxisTitleHandler = useCallback(
  (axis: 'x' | 'y', inputVal: string) => () => {
    if (!chartSpec) return;
    const newTitle = inputVal.trim() || undefined;
    if (newTitle !== chartSpec.encoding[axis].title) {
      updateChartSpec({ ...chartSpec, encoding: { ...chartSpec.encoding,
        [axis]: { ...chartSpec.encoding[axis], title: newTitle } } });
    }
  },
  [chartSpec, updateChartSpec],
);

// 사용
<Input onBlur={makeAxisTitleHandler('x', xTitleInput)} />
```

```typescript
// Y범위: 두 input 모두 valid일 때만 domain 설정 (하나라도 빈칸이면 auto)
const handleYRangeBlur = useCallback(() => {
  const min = parseFloat(yMinInput);
  const max = parseFloat(yMaxInput);
  const domain: [number, number] | undefined =
    (!isNaN(min) && !isNaN(max)) ? [min, max] : undefined;
  // JSON 비교로 불필요한 updateChartSpec 방지
  if (JSON.stringify(domain) !== JSON.stringify(currentDomain)) {
    updateChartSpec({ ... });
  }
}, [chartSpec, yMinInput, yMaxInput, updateChartSpec]);
```

```typescript
// 에러바 섹션: bar/line/error-bar 차트에만 표시
const ERROR_BAR_CHART_TYPES = new Set<ChartType>(['bar', 'line', 'error-bar']);
const showErrorBar = ERROR_BAR_CHART_TYPES.has(chartSpec.chartType);
```

### 7. ExportTab 저널 프리셋

```typescript
// 저널 프리셋 상수 (chart-spec-defaults.ts)
export const JOURNAL_SIZE_PRESETS = [
  { key: 'nature-single', label: 'Nature 단일 칼럼', width: 86 },
  { key: 'nature-double', label: 'Nature 전체 너비', width: 178 },
  { key: 'cell-single',   label: 'Cell 단일 칼럼',   width: 88 },
  { key: 'pnas-single',   label: 'PNAS 단일 칼럼',   width: 87 },
  { key: 'acs-single',    label: 'ACS 단일 칼럼',    width: 84 },
] as const;

// 핸들러: heightInput 이미 입력된 값도 함께 반영
const handleJournalPreset = useCallback((width: number) => {
  setWidthInput(String(width));
  const h = parseFloat(heightInput);
  setExportConfig({
    ...chartSpec.exportConfig,
    physicalWidth: width,
    physicalHeight: !isNaN(h) && h > 0 ? h : chartSpec.exportConfig.physicalHeight,
  });
}, [chartSpec, heightInput, setExportConfig]);
```

---

## 설계 결정 요약

| 결정 | 내용 | 이유 |
|------|------|------|
| ADR-1 | bar/line 에러바: `spec.errorBar` 있으면 explicit data 모드로 전환 | `custom renderItem`이 x-index 기반이므로 dataset 모드 불가 |
| ADR-2 | 로그 스케일: ECharts 'log'만 지원 (sqrt/symlog fallback → value) | ECharts yAxis.type은 'value'\|'log'\|'category'\|'time' 만 지원 |
| ADR-3 | physicalWidth/Height: ExportConfig 필드로 추가, Zod strict() 유지 | AI가 JSON Patch로 `/exportConfig/physicalWidth`도 수정 가능해야 함 |
| ADR-4 | 저널 프리셋: width만 세팅, height 사용자 직접 입력 | 저널마다 height 가변 (그래프 종류에 따라 다름) |
| ADR-5 | legend orient: 4방향 + none. top-left 등 diagonal은 AI 전용 | UI가 복잡해지므로 수동 컨트롤은 주요 5가지만 |

---

## 리뷰 포인트

### 검토 부탁드리는 항목

1. **`makeAxisTitleHandler` HOF 패턴**
   `useCallback`이 `[chartSpec, updateChartSpec]`으로 메모이제이션되지만, 렌더 타임에 `makeAxisTitleHandler('x', xTitleInput)`으로 호출 → 새 함수 생성.
   → react-hooks/exhaustive-deps 관점에서 올바른 패턴인지? 또는 두 개 별개 `useCallback`이 더 나은지?

2. **`handleYRangeBlur`의 `JSON.stringify` 비교**
   `domain`이 `[number, number] | undefined`인 경우 JSON 비교는 올바름.
   그러나 `undefined === undefined`는 `JSON.stringify`가 `undefined`인 경우 각각 `undefined`를 반환 → `undefined !== undefined`는 false → 비교 생략됨.
   실제로 `JSON.stringify(undefined) === JSON.stringify(undefined)` → `undefined === undefined` → true → 업데이트 안 함 (올바른 동작).
   → 이 비교 방식에 엣지 케이스가 있는지?

3. **SVG 렌더러 + `resize()` 조합**
   `downloadChart`에서 SVG 포맷일 때도 `echartsInstance.resize({ width, height })`를 호출.
   ECharts SVG 렌더러가 resize 후 `getSvgDataURL()`에서 올바른 viewport를 갖는지 검토 필요.
   (Canvas 렌더러는 확실히 동작함)

4. **`buildErrorBarOverlay` 시그니처 변경**
   이전: `(rows, spec, categories)` → 내부에서 `buildErrorBarData` 재호출
   현재: `(categories, means, lowers, uppers)` → 호출자가 data를 전달
   → `error-bar` 차트 타입의 기존 인라인 series 코드는 그대로 유지 (converter 내 중복이 남아있음). 이 중복도 리팩터 해야 하는지?

5. **`grouped-bar` / `stacked-bar` 에러바 미지원**
   그룹별 에러바 오버레이는 구현 복잡도가 높아 제외. UI에서 아예 숨김 처리(`ERROR_BAR_CHART_TYPES`에 미포함).
   → 사용자 혼란 없이 충분한가? 또는 `grouped-bar` 선택 시 에러바 섹션에 disabled 안내 문구가 필요한가?

### 검토 불필요 항목
- `buildLegend`: 포지션 맵은 ECharts 공식 문서 기반, 올바름
- Zod 스키마: `.strict()` + optional 필드 조합 표준 패턴
- `JOURNAL_SIZE_PRESETS`: Nature/Cell/PNAS/ACS 공식 스타일 가이드 기반

---

## 알려진 제한 사항 (향후 과제)

- **violin 차트**: ECharts 네이티브 미지원 → 박스플롯으로 대체 (UI 경고 표시)
- **SVG + 물리적 크기**: 실 브라우저 테스트 필요 (Canvas 렌더러는 검증됨)
- **이미지 삽입**: ECharts graphic API 또는 Canvas 합성 — ROADMAP 등록됨
- **한국 저널 프리셋**: 국내 저널은 규격 비표준화 → 현재 국제 저널 5종만 지원
