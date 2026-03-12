# G5.3~G5.5 코드 리뷰 요청

> **브랜치**: `feature/ui-redesign`
> **상태**: 미커밋 (`2026-03-12` 기준 `pnpm tsc --noEmit` 실행, 변경 파일 외 기존 테스트 타입 에러 6건)
> **계획서**: `stats/docs/graph-studio/GRAPH_STUDIO_UI_REDESIGN_PLAN.md` §G5.3~G5.5

---

## 변경 요약

| Phase | 목표 | 핵심 변경 |
|-------|------|----------|
| **G5.3** | 차트 유형 드롭다운 → 아이콘 그리드 | DataTab의 `<Select>` → 3×4 Tooltip 아이콘 버튼 그리드 |
| **G5.4** | ECharts 스크롤 줌 + 드래그 팬 | `dataZoom: [{type:'inside'}]` 옵션 병합 |
| **G5.5** | 캔버스 플로팅 미니 툴바 | hover 시 줌인/아웃/리셋/내보내기 버튼 |

### 이번 후속 수정 (문제 #1)

- `CanvasToolbar.tsx`: `zoomEnabled` prop 추가, heatmap/facet에서 줌 관련 버튼 `disabled`
- `CanvasToolbar.tsx`: disabled 상태에 `text-muted-foreground/40 cursor-not-allowed` 적용
- `ChartPreview.tsx`: `zoomEnabled={chartSpec.chartType !== 'heatmap' && !chartSpec.facet}` 전달

---

## 변경 파일 (7개)

### 신규 파일

#### 1. `stats/lib/graph-studio/chart-icons.ts`
12 ChartType → lucide-react 아이콘 공유 매핑. DataTab + LeftDataPanel 양쪽에서 import.

```typescript
export const CHART_TYPE_ICONS: Record<ChartType, React.ElementType> = {
  bar: BarChart2,
  'grouped-bar': BarChart3,
  'stacked-bar': ChartColumnStacked,
  line: ChartLine,
  scatter: ChartScatter,
  boxplot: SlidersHorizontal,
  histogram: BarChart,
  'error-bar': ChartNoAxesCombined,
  heatmap: Grid3X3,
  violin: Activity,
  'km-curve': ChartSpline,
  'roc-curve': ChartArea,
};
```

#### 2. `stats/components/graph-studio/CanvasToolbar.tsx`
플로팅 줌 툴바. `group/canvas` hover 패턴으로 차트 영역 hover 시에만 표시.

- **줌 로직**: ECharts `dispatchAction({type:'dataZoom'})` — 현재 범위를 읽어 25%씩 확대/축소
- **줌 제한**: 최소 범위 10% (start≤45, end≥55)
- **리셋**: X축 + Y축(scatter) 모두 0~100 복원
- **`zoomEnabled` prop**: heatmap/facet 차트에서 줌 버튼 비활성화
- **시각적 피드백**: disabled 상태에 `text-muted-foreground/40 cursor-not-allowed` 적용

### 수정 파일

#### 3. `stats/components/graph-studio/panels/DataTab.tsx`
- `<Select>` 드롭다운(8줄) → 3×4 아이콘 그리드(30줄)
- `Tooltip` import 추가 (각 아이콘에 description 표시)
- `CHART_TYPE_ICONS` + `ChartType` import 추가
- 기존 `CHART_TYPE_HINTS` 순회 방식 유지

#### 4. `stats/components/graph-studio/LeftDataPanel.tsx`
- 로컬 `CHART_ICON` (6종, Partial) 삭제 → 공유 `CHART_TYPE_ICONS` (12종, 완전) 사용
- lucide 미사용 import 6개 제거 (BarChart2, ScatterChart 등)
- `CHART_ICON[rec.type] ?? BarChart2` 폴백 제거 → `CHART_TYPE_ICONS[rec.type]` 직접 사용 (Record<ChartType,...>이므로 타입 안전)

#### 5. `stats/components/graph-studio/ChartPreview.tsx`
- **`option` 분리**: 기존 단일 `option` → `baseOption` + `option` (dataZoom 병합)
- **dataZoom 조건**: heatmap/facet 제외, scatter는 Y축 dataZoom 추가
- **`effectiveRef`**: `echartsRef ?? localRef` — 선언을 handleFinished 이전으로 이동 (참조 순서 수정)
- **handleFinished 의존성**: `[echartsRef, ...]` → `[effectiveRef, ...]` 정정
- **graphic 추출**: `option.graphic` → `baseOption.graphic` (dataZoom이 없는 원본에서 추출)
- **JSX**: `group/canvas` 클래스 + `relative` 위치 + CanvasToolbar 배치
- **문제 #1 연결**: `zoomEnabled={chartSpec.chartType !== 'heatmap' && !chartSpec.facet}` 전달

#### 6. `stats/app/graph-studio/page.tsx`
- `ChartPreview`에 `onExport={handleExport}` prop 추가 (1줄)

#### 7. `.claude/skills/commit-workflow/skill.md`
- 검증(tsc/test)을 Step 2 → Step 4(커밋 직전)로 이동
- "수정 중간에 반복 실행하지 않는다" 규칙 명시

---

## 리뷰 포인트

### 확인 완료 (양호)
- [x] `any` 타입 없음
- [x] Optional chaining 일관 사용
- [x] 기존 유의성 브래킷 로직 손상 없음
- [x] dataZoom `filterMode: 'none'` — 줌 시 데이터 필터링 방지
- [x] heatmap/facet 차트 dataZoom 제외 + 줌 버튼 비활성화
- [x] scatter에 Y축 dataZoom 추가 (2D 탐색)
- [x] `effectiveRef` 선언이 `handleFinished` 참조 이전

### 검토 요청 사항

**1. CanvasToolbar: handleZoomIn/handleZoomOut의 echartsRef 중복 접근**
- 각 핸들러가 `getEchartsInstance()` 호출 (현재 범위 읽기용)
- `dispatchZoom` 내부에서 다시 `getEchartsInstance()` 호출 (dispatch용)
- 기능 문제 아님, 코드 중복 수준. 통합 필요 여부?

**2. CanvasToolbar: handleReset의 순서**
- `dispatchZoom(0,100)` 먼저 실행 → instance null이면 이미 early return
- 그 후 다시 `getEchartsInstance()` 접근 → dispatchZoom 성공했다면 반드시 유효
- 안전하지만 불필요한 중복 체크. 리팩터링 필요 여부?

**3. chart-icons.ts 아이콘 선택 적절성**
- `violin: Activity` — 바이올린 플롯과 직관적으로 연결되는가?
- `km-curve: ChartSpline` / `roc-curve: ChartArea` — 더 나은 대안?
- lucide-react에 전용 아이콘이 없어서 가장 유사한 것을 선택한 상태

**4. DataTab 아이콘 그리드 접근성**
- `button` + `aria-label` + `Tooltip` 사용 중
- 키보드 네비게이션: grid 내 Tab 이동 가능하나, `role="radiogroup"` 패턴이 더 적절한지?

---

## 아키텍처 다이어그램

```
GraphStudioPage
├── GraphStudioHeader (undo/redo, AI, export dialog, panel toggles)
├── LeftDataPanel (w-64, 데이터 소스 + 변수 + 추천 차트)
│   └── CHART_TYPE_ICONS ← chart-icons.ts (공유)
├── ChartPreview (flex-1, 중앙 캔버스)
│   ├── CanvasToolbar (absolute, hover 시 표시)
│   │   ├── zoomEnabled ← chartType !== 'heatmap' && !facet
│   │   ├── 줌인/아웃/리셋 → dispatchAction({type:'dataZoom'})
│   │   └── 내보내기 → onExport (= handleExport from page)
│   └── ReactECharts
│       └── option = baseOption + dataZoom (G5.4)
└── RightPropertyPanel (w-80, DataTab + StyleTab)
    └── DataTab
        └── 3×4 아이콘 그리드 (G5.3)
            └── CHART_TYPE_ICONS ← chart-icons.ts (공유)
```

---

## 검증 상태

| 항목 | 상태 |
|------|------|
| TypeScript (`pnpm tsc --noEmit`) | 실패. 변경 파일과 무관한 기존 테스트 타입 에러 6건 확인 |
| Vitest | 미실행 |
| E2E | 미실행 |
| 브라우저 수동 테스트 | 미실행 |

### TypeScript 에러 위치 (기존 이슈)

- `stats/__tests__/services/variable-detection-service.test.ts`
- `stats/__tests__/stores/smart-flow-store-upload-race.test.ts`
