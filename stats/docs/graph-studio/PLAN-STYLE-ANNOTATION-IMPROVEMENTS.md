# Graph Studio 개선 계획: 스타일 분리 + 주석 렌더러

> 작성일: 2026-03-14
> 상태: **전항목 완료** (2026-03-18)
> 리뷰: v2 — markLine 주입 구조, bracket 데이터 모델, per-axis 커버리지, Zod 스키마 보강

---

## 완료된 즉시 수정 (2026-03-14)

| # | 항목 | 파일 | 변경 |
|---|------|------|------|
| F1 | `showSampleCounts` + sort 버그 | `echarts-converter.ts:1298` | `rows` → `workRows` |
| F2 | `ArrowUpDown` 미사용 import | `AiPanel.tsx:34` | import 제거 |
| F3 | Heatmap sort 미적용 | `echarts-converter.ts` | `buildHeatmapData`에 `sort` 파라미터 추가 |

---

## B. labelSize 분리 — 축 제목 vs 눈금 독립 조절

### 현황

- `style.font.labelSize`가 축 제목(`nameTextStyle`)과 눈금(`axisLabel`) **모두**에 적용됨
- per-axis 필드 `encoding.x.labelFontSize`, `encoding.x.titleFontSize`는 **타입+스키마+AI 프롬프트에 이미 존재**하지만 렌더러에서 읽지 않음
- G4 계획(GRAPH_STUDIO_G4_PLAN.md:61-62)에 "schema exists, converter not implemented"로 명시됨

### 전략 결정

**두 가지 접근이 가능:**

| 접근 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A. 글로벌 `axisTitleSize` 추가 | `style.font`에 새 필드 | UI 단순 (컨트롤 1개 추가) | G4 per-axis 설계와 중복 |
| B. per-axis 필드 연결 | 기존 `encoding.x.labelFontSize` 등 렌더러 연결 | G4 설계 준수, 스키마 변경 없음 | UI가 복잡 (축별 컨트롤) |

**권장: A+B 병행**
1. 글로벌 `axisTitleSize` 추가 (기본 분리)
2. per-axis 필드가 있으면 글로벌보다 우선 적용 (G4 호환)

### 수정 단계

#### B-1. 타입 확장 (`types/graph-studio.ts`)

```typescript
// StyleSpec.font (line ~166)
font?: {
  family?: string;
  size?: number;
  titleSize?: number;      // 차트 제목 (기존)
  labelSize?: number;       // 눈금 라벨 (의미 변경: 기존 "둘 다" → "눈금만")
  axisTitleSize?: number;   // [신규] 축 제목 ("Treatment Group" 등)
};
```

하위 호환: `axisTitleSize` 미설정 → `labelSize` 폴백 → 기존과 동일 렌더링

#### B-2. Zod 스키마 (`chart-spec-schema.ts:~144`)

```typescript
axisTitleSize: z.number().positive().optional(),  // 추가
```

#### B-3. 프리셋 (`chart-spec-defaults.ts`)

| 프리셋 | labelSize (눈금) | axisTitleSize (축 제목) |
|--------|-----------------|----------------------|
| default | 11 | 11 |
| science | 9 | 9 |
| ieee | 8 | 8 |
| grayscale | 10 | 10 |

초기값을 동일하게 설정 → 기존 렌더링 유지. 사용자가 이후 독립 조절.

#### B-4. 렌더러 (`echarts-converter.ts`)

**4a. `StyleConfig` 인터페이스 (line ~66)**
```typescript
axisTitleSize: number;  // 추가
```

**4b. `getStyleConfig` 함수 (line ~75)**
```typescript
axisTitleSize: font?.axisTitleSize ?? font?.labelSize ?? 11,  // 폴백 체인
```

**4c. 공통 축 빌더 — `nameTextStyle` → `style.axisTitleSize` 변경 (3곳)**

xAxisBase, yAxisBase, y2AxisBase에서 per-axis 오버라이드도 함께 연결:

```typescript
// xAxisBase 예시
nameTextStyle: {
  fontFamily: style.fontFamily,
  fontSize: spec.encoding.x.titleFontSize ?? style.axisTitleSize,
},
axisLabel: {
  fontFamily: style.fontFamily,
  fontSize: spec.encoding.x.labelFontSize ?? style.labelSize,
},
```

| 함수 | nameTextStyle 변경 | axisLabel 변경 |
|------|-------------------|---------------|
| `xAxisBase` (~769) | `labelSize` → `spec.encoding.x.titleFontSize ?? style.axisTitleSize` | `spec.encoding.x.labelFontSize ?? style.labelSize` |
| `yAxisBase` (~796) | `labelSize` → `spec.encoding.y.titleFontSize ?? style.axisTitleSize` | `spec.encoding.y.labelFontSize ?? style.labelSize` |
| `y2AxisBase` (~822) | `labelSize` → `spec.encoding.y2?.titleFontSize ?? style.axisTitleSize` | `spec.encoding.y2?.labelFontSize ?? style.labelSize` |

**4d. 수동 축 정의 — heatmap/KM/ROC도 동일 적용 (5곳)**

> **주의**: heatmap, km-curve, roc-curve는 공통 빌더를 거치지 않고 수동으로 축을 정의합니다.
> 이 경로들도 반드시 `axisTitleSize` + per-axis 오버라이드를 적용해야 합니다.

| 라인 | 위치 | nameTextStyle | axisLabel |
|------|------|---------------|-----------|
| ~1898 | heatmap xAxis | `style.axisTitleSize` | `style.labelSize` |
| ~1899 | heatmap yAxis | `style.axisTitleSize` | `style.labelSize` |
| ~2074 | km-curve xAxis | `spec.encoding.x.titleFontSize ?? style.axisTitleSize` | `spec.encoding.x.labelFontSize ?? style.labelSize` |
| ~2083 | km-curve yAxis | `spec.encoding.y.titleFontSize ?? style.axisTitleSize` | `spec.encoding.y.labelFontSize ?? style.labelSize` |
| ~2175 | roc-curve xAxis | 동일 패턴 | 동일 패턴 |
| ~2185 | roc-curve yAxis | 동일 패턴 | 동일 패턴 |

> heatmap은 인코딩 구조가 다르므로(X/Y가 카테고리 필드) per-axis 오버라이드는 글로벌만 적용.
> KM/ROC은 AxisSpec 구조를 따르므로 per-axis 오버라이드 적용 가능.

**4e. `axisLabel`은 기존 `style.labelSize` 유지** (변경 없는 곳은 그대로)

#### B-5. Hook (`useStyleTabLogic.ts`)

- `currentAxisTitleSize` 파생값 추가 (폴백 체인: `font.axisTitleSize → font.labelSize → preset`)
- `handleFontSizeChange` 시그니처에 `'axisTitleSize'` 키 추가 (기존 dynamic key 방식으로 자동 지원)
- return 객체에 `currentAxisTitleSize` 포함

#### B-6. UI (`StyleTab.tsx`)

기존 "축 라벨" 1개 → 2개로 분리:

```
글꼴 크기
├─ 차트 제목  [14] px   ← titleSize (기존)
├─ 축 제목    [11] px   ← axisTitleSize (신규)
├─ 눈금 라벨  [11] px   ← labelSize (의미 명확화)
└─ 기본 텍스트 [12] px   ← size (기존)
```

#### B-7. AI 프롬프트 (`ai-service.ts`)

```
style.font: {family?, size?, titleSize? (chart title), labelSize? (tick labels), axisTitleSize? (axis titles)}
```

### 테스트

1. `axisTitleSize` 미설정 → `nameTextStyle.fontSize === labelSize` (하위 호환)
2. `axisTitleSize: 14, labelSize: 10` → `nameTextStyle.fontSize === 14, axisLabel.fontSize === 10`
3. per-axis `encoding.x.titleFontSize: 16` → 글로벌보다 우선
4. heatmap/KM/ROC에서도 `axisTitleSize` 적용 확인 (수동 축 경로 테스트)

---

## C. 주석(Annotation) 렌더러

### 현황

| 구성 요소 | 상태 |
|-----------|------|
| `AnnotationSpec` 타입 | 존재 (`text \| line \| rect`, 픽셀 좌표) |
| `ChartSpec.annotations` 필드 | 존재 (기본 `[]`) |
| `buildGraphicAnnotations()` | 존재 (픽셀 기반 text/line/rect → ECharts graphic) |
| Zod 스키마 | 존재 |
| AI 프롬프트 | 문서화됨 |
| `SignificanceMark` 시스템 | 별도 존재 (`ChartPreview.tsx`, `convertToPixel` 기반) |
| `significance` 필드 + AI 카드 | 존재 (AiPanel 'layout' L1 > 'significance' L2) |
| **hline/vline (데이터 좌표 기반)** | 없음 |
| 수동 UI 편집기 | 없음 |

### 핵심 문제

현재 AI 카드에 "Y=50 수평선 추가" 프롬프트가 있지만, `line` 타입은 **픽셀 좌표**만 지원. AI가 데이터 좌표(Y=50)를 픽셀로 변환할 수 없으므로 **실질적으로 hline/vline이 작동하지 않음**.

### 설계 결정 1: bracket 데이터 모델 — `significance` 유지

> **결정**: `bracket`을 `annotations`에 넣지 않는다. 기존 `significance` 필드를 유일한 브래킷 소스로 유지한다.

**근거**:
- `significance` 필드는 이미 타입, 스키마, AI 프롬프트, 렌더러(`buildSignificanceGraphics`), 테스트에서 정식 경로로 사용 중
- AiPanel에도 '유의성 브래킷' 카드가 `layout` L1 아래에 이미 존재 (line 111)
- `annotations`에 `bracket` 타입을 추가하면 **동일 기능의 이중 경로** 발생 → AI가 혼동, 사용자도 혼동
- bracket은 학술 차트 고유 기능(p-value, 통계 검정)이므로 범용 annotations보다 전용 필드가 의미적으로 맞음

**결과**: C-2c(bracket 통합) 단계 **제거**. annotation 작업 범위는 `hline`/`vline`만.

### 설계 결정 2: markLine 주입 — wrapper 함수 패턴

> **문제**: `chartSpecToECharts`는 차트 타입별 분기에서 **50개 이상의 조기 return**을 사용.
> "끝부분에 한 번 후처리"하는 방식으로는 대부분의 경로에 적용 불가.

**해결: `applyMarkLineAnnotations` wrapper 패턴**

```typescript
/** chartSpecToECharts 내부, 각 분기의 return 값을 이 함수로 감싸서 반환 */
function applyMarkLineAnnotations(
  option: EChartsOption,
  annotations: AnnotationSpec[],
  orientation?: 'vertical' | 'horizontal',
): EChartsOption {
  const markLine = buildMarkLineAnnotations(annotations, orientation);
  if (!markLine) return option;

  // series가 배열이면 첫 번째 시리즈에 주입
  if (Array.isArray(option.series) && option.series.length > 0) {
    const first = option.series[0] as Record<string, unknown>;
    const existing = first.markLine as { data: unknown[] } | undefined;
    if (existing) {
      existing.data.push(...(markLine.data as unknown[]));
    } else {
      first.markLine = markLine;
    }
  }
  return option;
}
```

**적용 방식 — 2가지 선택지:**

| 방식 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A. 각 return을 래핑 | `return applyMarkLineAnnotations({...base, ...}, ...)` | 기존 구조 유지 | 50개+ return 수정 필요 |
| B. 단일 반환 리팩터링 | `let result; ... result = {...}; ... return applyMarkLineAnnotations(result, ...)` | 후처리 1곳 | 대규모 리팩터링 |

**권장: 방식 A (각 return 래핑)** — 기계적 변환이므로 안전. 헬퍼 함수 `wrapReturn`으로 한 줄로 줄일 수 있음.

단, **모든 return을 래핑할 필요는 없음**. hline/vline이 의미 있는 차트 타입만 래핑:

| 차트 타입 | markLine 적용 | 이유 |
|-----------|:---:|------|
| bar, grouped-bar, stacked-bar | O | Y축 참조선 (p=0.05 등) |
| error-bar | O | 동일 |
| line, area | O | 참조선 일반적 |
| scatter | O | 참조선 + 경계선 |
| boxplot, violin | O | 정상 범위 표시 |
| heatmap | X | markLine 주입 불가 (custom series), 후순위 |
| km-curve, roc-curve | O | 참조선 (생존율 50% 등) |
| pie, donut | X | 축 없음, markLine 무의미 |

**예상 래핑 수**: ~20개 return (전체 50+ 중 축이 있는 차트만)

### 설계 결정 3: Zod 스키마 — discriminated union

> **문제**: 단일 flat object로 하면 `hline`인데 `value` 없는 경우를 잡지 못함.

**해결: `z.discriminatedUnion`으로 타입별 필수 필드 강제**

```typescript
const graphicAnnotationSchema = z.object({
  type: z.enum(['text', 'line', 'rect']),
  text: z.string().optional(),
  x: z.union([z.number(), z.string()]).optional(),
  y: z.union([z.number(), z.string()]).optional(),
  x2: z.union([z.number(), z.string()]).optional(),
  y2: z.union([z.number(), z.string()]).optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  strokeDash: z.array(z.number()).optional(),
}).strict();

const hlineSchema = z.object({
  type: z.literal('hline'),
  value: z.number(),                                   // 필수
  text: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  strokeDash: z.array(z.number()).optional(),
  lineWidth: z.number().positive().optional(),
  labelPosition: z.enum(['start', 'middle', 'end']).optional(),
}).strict();

const vlineSchema = z.object({
  type: z.literal('vline'),
  value: z.union([z.number(), z.string()]),            // 필수 (숫자 또는 카테고리명)
  text: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().positive().optional(),
  strokeDash: z.array(z.number()).optional(),
  lineWidth: z.number().positive().optional(),
  labelPosition: z.enum(['start', 'middle', 'end']).optional(),
}).strict();

const annotationSchema = z.discriminatedUnion('type', [
  graphicAnnotationSchema,
  hlineSchema,
  vlineSchema,
]);
```

> bracket은 annotations에 포함하지 않으므로 bracket 스키마 불필요.

### 타입 확장 (`types/graph-studio.ts`)

discriminated union에 맞춰 타입도 분리:

```typescript
export interface GraphicAnnotation {
  type: 'text' | 'line' | 'rect';
  text?: string;
  x?: number | string;
  y?: number | string;
  x2?: number | string;
  y2?: number | string;
  color?: string;
  fontSize?: number;
  strokeDash?: number[];
}

export interface HLineAnnotation {
  type: 'hline';
  value: number;              // 필수
  text?: string;
  color?: string;
  fontSize?: number;
  strokeDash?: number[];
  lineWidth?: number;
  labelPosition?: 'start' | 'middle' | 'end';
}

export interface VLineAnnotation {
  type: 'vline';
  value: number | string;     // 필수 (숫자 또는 카테고리명)
  text?: string;
  color?: string;
  fontSize?: number;
  strokeDash?: number[];
  lineWidth?: number;
  labelPosition?: 'start' | 'middle' | 'end';
}

export type AnnotationSpec = GraphicAnnotation | HLineAnnotation | VLineAnnotation;
```

### markLine 렌더러 (`echarts-converter.ts`)

```typescript
function buildMarkLineAnnotations(
  annotations: AnnotationSpec[],
  orientation?: 'vertical' | 'horizontal',
): Record<string, unknown> | null {
  const lines = annotations.filter(
    (a): a is HLineAnnotation | VLineAnnotation =>
      a.type === 'hline' || a.type === 'vline'
  );
  if (lines.length === 0) return null;

  return {
    silent: true,
    symbol: 'none',
    data: lines.map(a => {
      const isH = orientation === 'horizontal';
      const axisKey = a.type === 'hline'
        ? (isH ? 'xAxis' : 'yAxis')
        : (isH ? 'yAxis' : 'xAxis');
      return {
        [axisKey]: a.value,
        label: {
          show: !!(a.text),
          formatter: a.text || `${a.value}`,
          position: a.labelPosition || 'end',
          fontSize: a.fontSize,
        },
        lineStyle: {
          color: a.color || '#999',
          type: a.strokeDash ? 'dashed' : 'solid',
          width: a.lineWidth || 1,
        },
      };
    }),
  };
}
```

### AI 프롬프트 업데이트 (`ai-service.ts`)

```
- annotations: array of objects. Types:
  - {type: "text", text: "...", x: "50%", y: 100, color?, fontSize?}
  - {type: "hline", value: 50 (required), text?: "threshold", color?, strokeDash?, labelPosition?: "end"}
  - {type: "vline", value: "GroupB" | 100 (required), text?: "cutoff", color?, strokeDash?}
  - {type: "line", x, y, x2, y2} (pixel coords)
  - {type: "rect", x, y, x2, y2} (pixel coords)
- significance: [...] (유의성 브래킷 — 기존 유지, 변경 없음)
```

### AI 카드 (`AiPanel.tsx`)

기존 annotation L2 카드 프롬프트만 개선. **bracket 카드 추가 안 함** (기존 'significance' 카드로 충분):

```typescript
// annotation L1 아래
{ id: 'add-text',  label: '텍스트 주석', prompt: '"___" 텍스트를 차트에 추가해줘' },
{ id: 'add-hline', label: '수평선 추가', prompt: 'Y=___ 위치에 수평 참조선을 추가해줘' },
{ id: 'add-vline', label: '수직선 추가', prompt: 'X=___ 위치에 수직선을 추가해줘' },
// 유의성 브래킷은 기존 layout > significance 카드 유지
```

### 엣지 케이스

| 케이스 | 처리 방법 |
|--------|-----------|
| 가로 차트 (horizontal) | `applyMarkLineAnnotations`에서 orientation 전달 → 축 스왑 |
| 로그 스케일 | ECharts markLine이 자동 처리 (특별 코드 불필요) |
| 패싯 차트 | 각 sub-series에 markLine 주입 필요 → **초기에는 스킵** |
| heatmap | markLine 주입 불가 (custom series) → **초기에는 스킵** |
| pie/donut | 축 없음 → `applyMarkLineAnnotations`에서 no-op |

### 테스트

1. hline annotation → `series[0].markLine.data`에 `{yAxis: value}` 포함
2. vline annotation → `series[0].markLine.data`에 `{xAxis: value}` 포함
3. horizontal + hline → xAxis로 스왑 확인
4. 복수 hline/vline → 단일 `markLine.data` 배열에 병합
5. 기존 text/line/rect annotation 동작 유지 (회귀 테스트)
6. Zod: `{type: "hline"}` (value 없음) → 검증 실패
7. Zod: `{type: "hline", value: 50}` → 검증 성공
8. annotations 빈 배열 → markLine 주입 없음

---

## 구현 우선순위

| 순서 | 항목 | 난이도 | 예상 작업량 | 비고 |
|------|------|--------|------------|------|
| 1 | B 전체 (labelSize 분리) | 중 | 7개 파일, 반나절 | heatmap/KM/ROC 수동 축 포함 |
| 2 | C-1 (타입 + Zod discriminated union) | 낮 | 2개 파일, 1시간 | |
| 3 | C-2 (markLine 렌더러 + return 래핑) | 중 | 1개 파일 ~20곳, 반나절 | wrapper 함수 패턴 |
| 4 | C-3 (AI 프롬프트 + 카드) | 낮 | 2개 파일, 30분 | |
| 5 | C-4 (UI 편집기) | 높 | 신규 컴포넌트, 별도 PR | |

### 제거된 항목

| 항목 | 사유 |
|------|------|
| ~~C-2c bracket 통합~~ | `significance` 필드를 유일한 브래킷 소스로 유지. 이중 경로 방지. |
| ~~add-bracket AI 카드~~ | 기존 layout > significance 카드로 충분. 중복 제거. |
