# Graph Studio 첫 화면 리디자인 — AI 리뷰 요청

> **커밋**: `1d7cf054`
> **파일**: `stats/components/graph-studio/DataUploadPanel.tsx`
> **작성일**: 2026-02-28
> **목적**: 외부 AI 리뷰어에게 코드 품질·UX 결정·잠재 위험 검토 요청

---

## 1. 변경 요약

### 문제 (Before)
`/graph-studio` 접속 시 설명 없이 파일 업로드 박스만 노출. 사용자가
"이게 뭔지" 모른 채 파일을 올리도록 강요하는 **빈 슬레이트 UX**.

### 해결 (After)
2026 UX 트렌드 (Template-first · Dual CTA · Bento Grid · Sample data)를 반영한
**온보딩 랜딩 페이지** 구조로 전면 재설계.

```
┌──────────────────────────────────────────────────────┐
│  Graph Studio                                        │
│  학술 논문용 고품질 차트 — ECharts 기반               │
│                                                      │
│  ① 데이터 선택 → ② 편집 → ③ 내보내기                  │
│                                                      │
│  차트 유형으로 바로 시작                               │
│  [막대]  [산점도]  [꺾은선]                            │
│  [박스]  [히스토그램]  [히트맵]                        │
│                                                      │
│  [ 샘플로 시작하기 ]  [ 파일 업로드 ]                  │
│  CSV, TSV, Excel 파일을 이 영역에 드래그               │
│                                                      │
│  AI 편집 / 논문 프리셋 / 내보내기                      │
└──────────────────────────────────────────────────────┘
```

**변경 규모**: 368 insertions / 120 deletions (전면 재작성)

---

## 2. 핵심 설계 결정

### 2-1. Template-first UX (Flourish 패턴)
- 6개 차트 유형 썸네일 클릭 → **샘플 데이터로 즉시 에디터 진입**
- 사용자가 "내 파일을 올리기 전에" 툴이 어떻게 작동하는지 체험 가능
- **근거**: Flourish, Datawrapper 등 주요 데이터 시각화 도구의 검증된 패턴

### 2-2. Dual CTA
- **Primary**: "샘플로 시작하기" (진입 장벽 제로)
- **Secondary**: "파일 업로드" (기존 사용자)
- 드래그 앤 드롭 영역 별도 힌트 텍스트로 명시

### 2-3. 차트 유형별 올바른 필드 매핑
가장 중요한 기술 결정. 단순히 `chartType` 필드만 교체하면 잘못된 X/Y 매핑이 발생:

```typescript
// ❌ 잘못된 접근 — scatter에 nominal X(species)가 그대로 남음
setChartSpec({ ...chartSpec, chartType: 'scatter' });

// ✅ 올바른 접근 — CHART_TYPE_HINTS로 해당 차트에 맞는 필드 선택
const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
const spec = createDefaultChartSpec(sourceId, chartType, xField, yField, pkg.columns);
setChartSpec(spec);
```

`CHART_TYPE_HINTS` 기준:
- `bar`, `boxplot` → X: nominal(species), Y: quantitative(weight_g)
- `scatter`, `histogram` → X: quantitative(length_cm), Y: quantitative(weight_g)
- `line` → X: temporal(age), Y: quantitative(weight_g)
- `heatmap` → X: nominal(species), Y: quantitative(weight_g)

### 2-4. 샘플 데이터 선택 (어류 성장)
```
3종 × 10행 = 30 rows
{ species: 'Bass'|'Bream'|'Carp', length_cm, weight_g, age }
```
- `species`: nominal (bar/boxplot/heatmap X축)
- `length_cm`: quantitative (scatter X축)
- `weight_g`: quantitative (모든 차트 Y축)
- `age`: quantitative/temporal (line X축)

4개 컬럼이 6가지 차트 유형을 모두 커버하도록 설계.

---

## 3. 구현 세부사항

### 3-1. Zustand 동기 업데이트 활용
```typescript
const handleChartTypeSelect = useCallback(
  (chartType: ChartType) => {
    const sourceId = `sample-${Date.now()}`;
    const pkg = buildSamplePackage(sourceId);

    // Step 1: DataPackage 등록 → isDataLoaded=true → 에디터 모드 전환
    loadDataPackage(pkg);

    // Step 2: 차트 타입 맞춤 ChartSpec 교체
    // Zustand는 동기 업데이트 → loadDataPackage 직후 즉시 유효
    const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
    const spec = createDefaultChartSpec(sourceId, chartType, xField, yField, pkg.columns);
    setChartSpec(spec);
    // Note: setChartSpec은 dataPackage를 건드리지 않음 → 데이터 유지, 스펙만 교체
  },
  [buildSamplePackage, loadDataPackage, setChartSpec],
);
```

### 3-2. useRef 파일 입력 (bug fix)
기존 코드의 취약한 DOM 탐색을 안정적인 ref로 교체:
```typescript
// ❌ Before: 취약한 DOM 탐색
onClick={(e) => e.currentTarget.closest('label')?.querySelector('input')?.click()}

// ✅ After: useRef 직접 제어
const fileInputRef = useRef<HTMLInputElement>(null);
<input ref={fileInputRef} type="file" className="sr-only" ... />
<Button onClick={() => fileInputRef.current?.click()} ...>파일 업로드</Button>
```

### 3-3. ChartThumbnail 인터페이스 (타입 충돌 방지)
```typescript
// ❌ as const + ChartType cast 충돌
const CHART_THUMBNAILS = [{ type: 'bar' as ChartType, ... }] as const;

// ✅ 명시적 인터페이스
interface ChartThumbnail {
  type: ChartType;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}
const CHART_THUMBNAILS: ChartThumbnail[] = [ ... ];
```

### 3-4. useDropzone noClick
```typescript
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  ...
  noClick: true,  // 전체 영역 클릭 방지 — 파일 피커는 버튼으로만
});
```
전체 카드가 드래그 존이지만 클릭은 명시적 버튼으로만 트리거.

---

## 4. 알려진 한계 및 기술 부채

### 4-1. 샘플 데이터 학술 맥락 부적합 가능성
- 어류 성장 데이터는 생물학 연구 맥락에 적합하나, 공학/의학 사용자에게는 낯설 수 있음
- 향후 도메인별 샘플 데이터 선택 기능 필요 여부 검토 필요

### 4-2. 히스토그램 샘플 데이터 제한
- 히스토그램은 단일 연속 변수의 분포를 보여야 하나, 현재 샘플에서는 `length_cm` × `weight_g` 매핑됨
- 히스토그램에서 `selectXYFields`가 어떤 매핑을 반환하는지 런타임 확인 필요

### 4-3. buildSamplePackage의 eslint-disable
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
`SAMPLE_ROWS`는 모듈 상수이므로 의존성 배열에 포함할 필요 없으나,
exhaustive-deps 규칙이 경고를 발생시켜 억제. 이 패턴이 프로젝트 코딩 표준에 맞는지 확인 필요.

### 4-4. 에러 상태 표시 위치
- 에러 메시지가 Dual CTA 아래, Feature highlights 위에 위치
- 파일 업로드 실패 시 에러가 눈에 잘 안 띌 수 있음

### 4-5. 미지원 차트 유형 (4개) 숨김
현재 6개만 썸네일 노출 (`grouped-bar`, `stacked-bar`, `error-bar`, `violin` 미포함).
향후 추가 시 grid 레이아웃 변경 필요 (`grid-cols-3` → `grid-cols-4`?)

---

## 5. 리뷰 요청 사항

### Q1. handleChartTypeSelect 내 두 번 Zustand 호출
`loadDataPackage(pkg)` → `setChartSpec(spec)` 순서로 호출. Zustand는 동기 업데이트이므로 이론상 안전하지만:
- React 18 concurrent mode에서 렌더링 사이에 중간 상태(isDataLoaded=true, chartSpec=null)가 존재하는 순간이 있는가?
- 중간 상태가 렌더링되어 잠깐 에디터 빈 화면이 flash될 가능성?
- `useGraphStudioStore.setState({ dataPackage: pkg, chartSpec: spec })` 단일 호출로 병합하는 것이 더 나은가?

### Q2. selectXYFields fallback 동작
`CHART_TYPE_HINTS[chartType].suggestedXType`에 맞는 컬럼이 없을 때 어떻게 동작?
- `selectXYFields` 내부 fallback 로직이 있는지 (`chart-spec-utils.ts` 확인 필요)
- 히스토그램처럼 `suggestedXType: 'quantitative'`인데 `quantitative` 컬럼이 여러 개일 때 어떤 컬럼이 선택되는가?

### Q3. 코드 분리 필요성
현재 423 라인의 단일 파일. 분리 후보:
- `SAMPLE_ROWS`, `CHART_THUMBNAILS`, `FEATURES` → `graph-studio-constants.ts`
- `buildSamplePackage`, `handleChartTypeSelect` → 커스텀 훅 `useSampleLoader.ts`

현재 구조가 유지보수 관점에서 문제가 있는 수준인지?

### Q4. data-testid 커버리지
현재 `data-testid`:
- `chart-type-${type}` (6개)
- `sample-start-btn`
- `file-upload-btn`

테스트 전략 관점에서 추가되어야 할 testid가 있는가?

### Q5. 접근성 (a11y)
- 차트 썸네일 `<button>` 요소에 `aria-label` 없음 (현재 텍스트 레이블만)
- 드래그 존의 `isDragActive` 상태 변화가 스크린 리더에 전달되는가?

---

## 6. 테스트 현황

현재 `DataUploadPanel` 전용 유닛 테스트 없음.

기존 관련 테스트:
- `__tests__/lib/graph-studio/chart-spec-utils.test.ts` — `selectXYFields`, `inferColumnMeta` 커버
- `__tests__/lib/graph-studio/*.test.ts` — 스토어 및 유틸 커버

권장 추가 테스트:
```typescript
// DataUploadPanel.test.tsx (L2 data-testid 레벨)
it('bar 썸네일 클릭 시 loadDataPackage + setChartSpec 호출 확인', async () => {
  // chart-type-bar 클릭 → store 액션 mock 검증
});

it('샘플로 시작하기 버튼이 bar 차트로 로드하는지 확인', async () => {
  // sample-start-btn 클릭 → chartSpec.chartType === 'bar'
});

it('파일 업로드 버튼 클릭 시 file input이 활성화되는지 확인', async () => {
  // file-upload-btn 클릭 → fileInputRef.current.click() 트리거
});
```

---

## 7. 관련 파일

| 파일 | 역할 |
|------|------|
| `stats/components/graph-studio/DataUploadPanel.tsx` | 본 리뷰 대상 (423 lines) |
| `stats/lib/graph-studio/chart-spec-utils.ts` | `inferColumnMeta`, `selectXYFields` |
| `stats/lib/graph-studio/chart-spec-defaults.ts` | `createDefaultChartSpec`, `CHART_TYPE_HINTS` |
| `stats/lib/stores/graph-studio-store.ts` | `loadDataPackage`, `setChartSpec` |
| `stats/types/graph-studio.ts` | `ChartType`, `DataPackage`, `ChartSpec` |
