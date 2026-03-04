# Graph Studio 개선 계획 — AI 리뷰 패키지

> **목적**: 코드 비판적 검토 결과를 바탕으로 수립한 개선 계획을 외부 AI가 검토할 수 있도록 정리한 문서.
> **작성일**: 2026-02-28 / **최종 수정**: 2026-02-28 (AI 리뷰 반영 — 버그 3 전제 수정, sessionStorage 오류 수정, ECharts 버전 수정, G1-5 wording, G3-2 영향 범위 추가)
> **검토 대상**: `stats/lib/graph-studio/`, `stats/components/graph-studio/`, `stats/types/graph-studio.ts`

---

## 1. 현재 상태 요약

Graph Studio는 CSV/Excel → ECharts 차트 렌더링 → PNG/SVG 내보내기를 지원하는 모듈.
GraphPad Prism 대체를 목표로 하며, "무료 + 한국어 + AI 편집"이 차별점.

**기술 스택**:
- Next.js 15 + TypeScript + Zustand
- Apache ECharts **6** (`^6.0.0`) via `echarts-for-react` 3.0.6
- Zod 스키마 검증 (ChartSpec)
- OpenRouter API (AI 편집)

**현재 차트 유형**: bar, grouped-bar, stacked-bar, line, scatter, boxplot, histogram, error-bar, heatmap, violin(= boxplot fallback)

---

## 2. 코드 검토에서 발견된 실제 버그

### 버그 1: DPI 계산 오류

**파일**: `stats/lib/graph-studio/export-utils.ts`

```typescript
// 현재 코드 (잘못됨)
function dpiToPixelRatio(dpi: number): number {
  return Math.max(1, Math.round(dpi / 96));  // Math.round가 문제
}
// 결과: 300 DPI → round(3.125) = 3 → 실제 288 DPI
//       600 DPI → round(6.25)  = 6 → 실제 576 DPI
```

**수정안**:
```typescript
function dpiToPixelRatio(dpi: number): number {
  return Math.max(1, dpi / 96);  // 반올림 제거, 최솟값 1은 유지
}
// Math.max(1, ...) 유지 이유: DPI 72 → 72/96 = 0.75 → 화면보다 작아짐 방지
```

**ECharts `getDataURL({ pixelRatio })`는 float 값 지원** — 반올림 필요 없음.

참고: `physicalWidth/Height`를 지정한 경우 `needsResize=true` 분기로 `pixelRatio=1`을 사용하므로 이 버그의 영향을 받지 않음. 물리 크기 미지정 시에만 해당.

---

### 버그 2: SVG 내보내기에 mm 단위 없음

**파일**: `stats/lib/graph-studio/export-utils.ts`

```typescript
// 현재: resize 후 getSvgDataURL() 호출
echartsInstance.resize({ width: targetW, height: targetH });
dataUrl = echartsInstance.getSvgDataURL();
// 반환되는 SVG: <svg width="1020" height="680" ...> (pixel 단위)
// 저널 제출 시 mm 정보 없음
```

**수정안 A** (ECharts 6 `renderToSVGString()` 활용):
```typescript
// ECharts 6 지원 확인됨. 단, SVG renderer 인스턴스에서만 사용해야 함
// (canvas renderer에서 호출 시 예외 또는 비정상 동작 가능 — AI 리뷰 답변)
const svgStr = echartsInstance.renderToSVGString();
const withMm = svgStr.replace(
  /(<svg[^>]*)\s+width="[\d.]+"(\s+height="[\d.]+")?/,
  `$1 width="${config.physicalWidth}mm" height="${config.physicalHeight}mm"`,
);
// Blob으로 직접 다운로드
const blob = new Blob([withMm], { type: 'image/svg+xml' });
```

**수정안 B** (`getSvgDataURL()` 데이터 URI 디코딩):
```typescript
const raw = echartsInstance.getSvgDataURL();
// getSvgDataURL()은 'data:image/svg+xml;charset=utf-8,...' 또는 base64 인코딩
// → 디코딩 → SVG 문자열 조작 → 재인코딩
```

**권장**: 수정안 A (더 직관적). `renderToSVGString()`이 현재 echarts 버전에서 지원되는지 먼저 확인 필요.

---

### UX 개선 기회: SVG Export 시 차트 깜빡임

> ~~버그 3으로 초안에 기술했으나~~ AI 리뷰에서 전제 오류 확인: `echarts-for-react` 3.0.6은 `opts` 변경 시 `dispose()` + 재생성을 자동 수행함 (`core.js:39`). 따라서 renderer 전환 자체는 올바르게 동작함. 다만 UX 개선 여지는 있음.

**파일**: `stats/components/graph-studio/ChartPreview.tsx`

**현재 동작**: `exportConfig.format`이 png↔svg로 바뀔 때마다 ECharts 인스턴스가 dispose + 재생성 → 차트 애니메이션 리셋 + 깜빡임 발생.

**개선 방향** (선택적): preview는 항상 canvas, SVG export 시에만 임시 인스턴스 생성.

```typescript
// ChartPreview: renderer 항상 canvas (format 변경에 무관)
const opts = useMemo(() => ({ renderer: 'canvas' as const }), []);

// export-utils.ts: SVG 요청 시 임시 오프스크린 인스턴스
if (config.format === 'svg') {
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = `position:fixed;left:-9999px;width:${targetW ?? 800}px;height:${targetH ?? 600}px`;
  document.body.appendChild(tempDiv);
  const tempInstance = echarts.init(tempDiv, null, { renderer: 'svg', width: targetW, height: targetH });
  tempInstance.setOption(currentOption);  // 호출부에서 getOption() 대신 원본 option 전달 (아래 리뷰 답변 참조)
  const svgStr = tempInstance.renderToSVGString();  // SVG renderer 전용 — ECharts 6 지원
  tempInstance.dispose();
  document.body.removeChild(tempDiv);
  // svgStr에서 width/height mm 삽입 처리 (버그 2 수정과 동일)
}
```

**우선순위**: 기능 정확성에 영향 없음 — G1 버그보다 후순위.

---

## 3. 개선 계획

### Phase G1: 버그 수정 + 연구 필수 기능 (1-2주)

#### G1-1: DPI 버그 수정

- `export-utils.ts`: `dpiToPixelRatio` 수학 수정 (위 버그 1)
- 관련 테스트 기대값 업데이트 필요 (`__tests__/graph-studio/export-utils.test.ts`)

#### G1-2: SVG mm 단위 삽입

- `export-utils.ts`: SVG 내보내기 시 `width`/`height` 속성을 mm로 교체 (위 버그 2)
- `physicalWidth/Height` 미지정 시에는 기존 동작 유지

#### G1-3: Renderer 전환 수정

- 수정안 B 채택: preview 항상 canvas, SVG export 시 임시 인스턴스
- `ChartPreview.tsx`에서 `opts.renderer` 분기 로직 제거
- `export-utils.ts`에 `currentOption` 파라미터 추가

#### G1-4: Pre-computed 에러바 컬럼 선택

**배경**: 현재 에러바는 raw data에서 자동 계산만 가능. 실제 연구자는 mean/SE를 미리 계산한 컬럼을 가지고 있음.

**필요한 변경 (4곳)**:

**(a) `types/graph-studio.ts`**:
```typescript
export interface ErrorBarSpec {
  type: 'ci' | 'stderr' | 'stdev' | 'iqr' | 'precomputed';  // 추가
  value?: number;
  lowerField?: string;  // precomputed일 때: 하한 컬럼명
  upperField?: string;  // precomputed일 때: 상한 컬럼명
}
```

**(b) `lib/graph-studio/chart-spec-schema.ts`**:
```typescript
// 현재: .strict() — 새 필드 추가 시 AI Patch 검증에서 런타임 에러 발생
const errorBarSchema = z.object({
  type: z.enum(['ci', 'stderr', 'stdev', 'iqr']),  // 'precomputed' 추가
  value: z.number().positive().optional(),
  // lowerField, upperField 추가
}).strict();
```

**(c) `lib/graph-studio/echarts-converter.ts`**:
```typescript
// buildErrorBarData 전에 precomputed 분기 추가
if (spec.errorBar?.type === 'precomputed' && spec.errorBar.lowerField && spec.errorBar.upperField) {
  // lowerField/upperField 컬럼에서 직접 읽기
}
```

**(d) `lib/graph-studio/ai-service.ts`**:
```typescript
// CHART_EDIT_SYSTEM_PROMPT의 errorBar 설명 업데이트
- errorBar: {type: ci|stderr|stdev|iqr, value}
+ errorBar: {type: ci|stderr|stdev|iqr|precomputed, value, lowerField?, upperField?}
```

**DataTab UI**: `type: 'precomputed'` 선택 시 lowerField/upperField 컬럼 드롭다운 조건부 표시.

#### G1-5: AI 패널 오프라인 폴백

- `openRouterRecommender.checkHealth()`는 이미 public 메서드로 존재 (`openrouter-recommender.ts:110`) — 새로 만들 필요 없음
- `AiPanel.tsx` 마운트 시 `checkHealth()` 호출 → 키 미설정이면 입력창 숨기고 설정 안내 카드 표시
- 현재는 메시지 전송 후에야 `NO_RESPONSE` 에러가 나와 UX 혼란

---

### Phase G2: 바이오 논문 특화 기능 (2-4주)

#### G2-1: 유의성 마커 (*, **, ***, ns)

**필요성**: 바이오/의학 논문의 그래프에 거의 필수.

**설계 결정 필요 사항**:
- 1차 지원 차트: bar, grouped-bar만 (위치 계산이 카테고리 인덱스 기반으로 단순)
- scatter, line은 2차 대상 (x 위치 계산이 데이터 값 기반으로 복잡)
- p-value 입력: 수동 입력 먼저, Smart Flow 연동은 G3-2에서

**타입 변경**:
```typescript
// types/graph-studio.ts
export interface AnnotationSpec {
  type: 'text' | 'line' | 'rect' | 'significance';  // 'significance' 추가
  // ... 기존 필드
  // significance 전용:
  group1?: string;     // 비교 그룹 A (x축 카테고리 이름)
  group2?: string;     // 비교 그룹 B
  pValue?: number;     // p-value (마커 결정용)
  label?: string;      // 오버라이드용: 자동 계산 대신 직접 지정
}
```

**자동 마커 결정**:
```typescript
function pValueToMarker(p: number): string {
  if (p < 0.001) return '***';
  if (p < 0.01)  return '**';
  if (p < 0.05)  return '*';
  return 'ns';
}
```

**ECharts 렌더링**: custom `renderItem`으로 두 막대 위에 ㄷ자 브래킷 + 별표.
그룹 x-index를 카테고리 배열에서 찾아 `api.coord()` 변환.

**주의**: Zod 스키마(`annotationSchema`)와 AI 시스템 프롬프트도 함께 업데이트 필요.

**예상 기간**: 2주 (bar/grouped-bar만)

#### G2-2: 국내 저널 및 범용 프리셋 추가

```typescript
// chart-spec-defaults.ts에 추가
{ key: 'a4-half',   label: 'A4 반폭',   width: 82 },
{ key: 'a4-full',   label: 'A4 전체폭', width: 170 },
{ key: 'kjfs',      label: 'KJFS',      width: 84 },  // 한국임업학회지
```

단순 상수 추가. 리스크 없음.

#### G2-3: 폰트 직접 선택 UI

**지원 폰트**: Arial, Helvetica, Times New Roman (시스템 폰트만)

**Noto Sans KR 제외 이유**: 웹폰트는 canvas 렌더링 시 `document.fonts.ready` 이전에 export하면 fallback 폰트로 출력됨. 해결 가능하지만 복잡도 증가 대비 효과가 낮음.

**변경**: `StyleTab.tsx`에 폰트 패밀리 드롭다운 추가. `style.font.family` 필드는 이미 존재.

---

### Phase G3: Smart Flow 연결 (중기, 1개월)

#### G3-1: "Graph Studio에서 열기" 버튼

**위치**: Smart Flow `ResultsActionStep.tsx` (Step 4b)

**데이터 전달 전략 결정 필요**:

Option A — Zustand cross-store:
```typescript
// ResultsActionStep에서 직접 그래프 스토어 접근
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
const { loadDataPackage } = useGraphStudioStore();
loadDataPackage(pkg);
router.push('/graph-studio');
```
단점: 통계 모듈과 그래프 모듈 간 직접 의존성 발생.

Option B — URL params + IndexedDB:
```typescript
// ResultsActionStep
const pkgId = crypto.randomUUID();
await idb.set(`graph-pkg-${pkgId}`, pkg);  // IndexedDB (용량 제한 없음)
router.push(`/graph-studio?from=smart-flow&pkgId=${pkgId}`);

// GraphStudioPage 마운트 시
const pkgId = searchParams.get('pkgId');
if (pkgId) {
  const pkg = await idb.get(`graph-pkg-${pkgId}`);
  if (pkg) loadDataPackage(pkg);
}
```
장점: 모듈 간 결합도 낮음, 대용량 데이터 처리 가능.

> sessionStorage는 탭 간 공유가 안 되고 5-10MB 용량 제한이 있어 연구 데이터셋에 부적합 — AI 리뷰에서 지적.

**권장**: Option B (IndexedDB 기반).

**에러바 자동 설정**: `pkg.context.method`가 t-test 계열이면 `errorBar.type = 'stderr'` 자동 설정.

#### G3-2: 유의성 마커 자동 배치

G3-1과 G2-1 완료 후 진행.

Smart Flow 결과에서:
- t-test: 두 그룹 이름 + p-value → 단일 significance annotation 생성
- ANOVA 사후검정: 다중 비교 결과 → 여러 significance annotation 생성

`DataPackage.context`에 `comparisons?: { group1, group2, pValue }[]` 추가 필요.

---

## 4. 변경 영향 범위 요약

| Phase | 변경 파일 | 테스트 업데이트 |
|-------|---------|--------------|
| G1-1 | `export-utils.ts` | `export-utils.test.ts` 기대값 수정 |
| G1-2 | `export-utils.ts` | SVG 출력 포맷 테스트 추가 |
| G1-3 | `ChartPreview.tsx`, `export-utils.ts` | renderer 전환 테스트 |
| G1-4 | `types/graph-studio.ts`, `chart-spec-schema.ts`, `echarts-converter.ts`, `ai-service.ts`, `DataTab.tsx` | errorBar precomputed 테스트 추가 |
| G1-5 | `AiPanel.tsx`, `openrouter-recommender.ts` | 키 미설정 상태 테스트 |
| G2-1 | `types/graph-studio.ts`, `chart-spec-schema.ts`, `echarts-converter.ts`, `ai-service.ts`, `DataTab.tsx` | significance annotation 렌더링 테스트 |
| G2-2 | `chart-spec-defaults.ts` | 상수 추가만, 테스트 불필요 |
| G2-3 | `StyleTab.tsx` | UI 상태 테스트 |
| G3-1 | `ResultsActionStep.tsx`, `GraphStudioPage`, `idb 헬퍼` | 통합 테스트 |
| G3-2 | `types/graph-studio.ts` (`DataPackage.context`), `chart-spec-schema.ts` | context.comparisons 타입 테스트 |

---

## 5. 리뷰 질문 및 답변 (AI 리뷰 반영)

| # | 질문 | 결론 |
|---|------|------|
| 1 | SVG 임시 인스턴스 — `currentOption` 파라미터 vs `getOption()` | **`currentOption` 전달이 안전**. `getOption()`은 ECharts 내부 정규화 옵션을 반환하므로 역직렬화 시 원본과 구조 차이 발생 가능. |
| 2 | `errorBarSchema` `.strict()` 유지 여부 | **유지 맞음**. 대신 타입+스키마+프롬프트 3곳 동시 수정 체크리스트를 이 문서 §7에 직접 기재 (`SCHEMA_EXTENSION_CHECKLIST.md`는 통계 메서드 전용 파일이라 부적합). |
| 3 | `grouped-bar` 유의성 마커 x 위치 계산 | `api.coord([idx, 0])` 단독으로는 부족. **`api.barLayout()`** 으로 시리즈별 bar offset/width를 구한 뒤 브래킷 x 범위 계산 필요. |
| 4 | G3-1 대용량 데이터 전달 | sessionStorage 5-10MB 제한 — **IndexedDB + URL pkgId** 조합 권장 (G3-1 본문에 반영). |
| 5 | `renderToSVGString()` 존재 여부 | ECharts 6에서 **존재 확인**. 단, **SVG renderer 인스턴스 전용** — canvas renderer에서 호출 시 예외 또는 비정상 동작 가능. |

---

## 6. 알려진 미지원 기능 (이번 계획 범위 외)

| 기능 | 이유 |
|------|------|
| TIFF 출력 | ECharts 미지원, html2canvas + canvas-to-tiff 필요 (별도 Phase) |
| Violin 차트 (실제) | ECharts custom renderItem 필요, 복잡도 높음 |
| 커브 피팅 시각화 (회귀선 + CI 밴드) | Pyodide 계산 + ECharts 렌더링 연동 필요 |
| 다중 패널 그래프 | 여러 ChartSpec → 단일 PDF 배치 (별도 Phase) |
| CMYK 색상 | 인쇄용, 웹 환경에서 지원 불가 |

---

## 7. ChartSpec 스키마 확장 체크리스트

G1-4, G2-1 등 ChartSpec에 새 필드를 추가할 때마다 아래 4곳을 동시 수정.
(`.strict()` 유지 정책으로 인해 누락 시 런타임 에러 발생)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `types/graph-studio.ts` | TypeScript 인터페이스 필드 추가 |
| 2 | `lib/graph-studio/chart-spec-schema.ts` | Zod 스키마에 동일 필드 추가 |
| 3 | `lib/graph-studio/ai-service.ts` | `CHART_EDIT_SYSTEM_PROMPT` 내 스키마 설명 업데이트 |
| 4 | 해당 `__tests__/` | 새 필드 커버하는 테스트 추가 |

확인: `lib/graph-studio/chart-spec-defaults.ts`에서 새 필드의 기본값 처리도 확인.

---

## 8. 시뮬레이션 테스트

계획의 핵심 전제를 코드로 검증한 테스트 파일:
`__tests__/graph-studio/improvement-plan-sim.test.ts` (31개 테스트, 전체 통과)

| 시뮬레이션 | 검증 내용 | 결과 |
|-----------|---------|------|
| SIM-1 | DPI 수정: `Math.round` 제거 → 300 DPI = 288→300 실효값 개선 | ✅ |
| SIM-2 | SVG mm 삽입 regex: ECharts 6 출력 형식과 일치, viewBox 보존 | ✅ |
| SIM-3 | Zod `.strict()`: 미정의 필드 런타임 reject 확인, 수정된 스키마 통과 | ✅ |
| SIM-4 | `pValueToMarker`: 경계값(0.001, 0.05) 포함 전체 분기 검증 | ✅ |
| SIM-5 | `echarts-for-react` opts 변경 → dispose+재생성 트리거 조건 확인 | ✅ |

**주목 사항 (SIM-1)**: DPI 72의 경우 old/new 모두 1 반환 — `Math.max(1, 0.75) = 1`로 엣지케이스는 양쪽 동일하게 처리됨. 수정의 실효 범위는 DPI ≥ 97부터.
