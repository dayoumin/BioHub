# Bio-Tools → Graph Studio 핸드오프 계획

> 작성: 2026-03-25
> 목적: Bio-Tools 분석 결과를 Graph Studio로 전달하여 논문급 차트 생성

---

## 배경

Bio-Tools의 인라인 SVG 차트는 **미리보기** 수준이며 논문용으로 부족함:
- 내보내기 없음 (SVG/PNG/PDF)
- 축 서식/단위 커스터마이즈 불가
- CI 밴드, 범례, 캡션 미지원

Graph Studio에 이미 ECharts 기반 커스터마이즈 + 내보내기가 있으므로,
Bio-Tools 결과 데이터를 Graph Studio로 핸드오프하는 구조가 가장 효율적.

---

## 현재 Graph Studio 지원 현황

| 차트 유형 | 지원 | 비고 |
|-----------|------|------|
| scatter + linear trendline | O | log scale 지원 |
| line (다중 시리즈) | O | |
| histogram | O | **markLine 미적용 (버그)** |
| km-curve | O | 전용 어댑터 존재 (`buildKmCurveColumns`) |
| roc-curve | O | 전용 어댑터 존재 (`buildRocCurveColumns`) |
| scatter + parametric curve overlay | △ | 2-series 구성 필요 |

---

## 구현 항목

### 1. Fisheries 어댑터 3개 (analysis-adapter.ts 확장)

**기존 패턴 참조**: `buildKmCurveColumns()`, `buildRocCurveColumns()`

#### 1-A. `buildVbgfColumns(result: VbgfResult, observedData: {age: number, length: number}[])`

```typescript
interface VbgfColumnsResult {
  columns: ColumnMeta[]
  data: Record<string, unknown[]>
  xField: 'age'
  yField: 'length'
  colorField: 'series'  // 'observed' | 'fitted'
}
```

- `age`: 관측 연령 + 적합곡선 50포인트
- `length`: 관측 체장 + L(t) 계산값
- `series`: 'observed' | 'fitted' (scatter vs line 구분)
- `__rSquared`: row 0에 R² 값 (메타)
- `__equation`: row 0에 수식 문자열

#### 1-B. `buildLengthWeightColumns(result: LengthWeightResult)`

```typescript
interface LwColumnsResult {
  columns: ColumnMeta[]
  data: Record<string, unknown[]>
  xField: 'logLength'
  yField: 'logWeight'
  colorField: undefined
}
```

- `logLength`, `logWeight`: `logLogPoints`에서 추출
- `__logA`, `__b`, `__rSquared`: 메타 (trendline 표시용)
- Graph Studio의 scatter + `trendline: { type: 'linear' }` 활용

#### 1-C. `buildConditionFactorColumns(result: ConditionFactorResult)`

```typescript
interface CfColumnsResult {
  columns: ColumnMeta[]
  data: Record<string, unknown[]>
  xField: 'k'
  yField: undefined  // histogram은 yField 불필요
}
```

- `k`: `individualK` 배열
- `group`: groupStats 있으면 그룹명 (grouped histogram)
- `__mean`, `__median`: 메타 (markLine 참조선용)

### 2. Histogram markLine 버그 수정 (1줄)

**파일**: `stats/lib/graph-studio/echarts-converter.ts`

현재 histogram 반환이 `applyMarkLineAnnotations()`를 거치지 않음.
다른 모든 차트 타입은 이 함수를 거쳐 반환됨.

```diff
- return histogramOption
+ return applyMarkLineAnnotations(histogramOption, spec)
```

### 3. "Graph Studio에서 열기" 버튼

**위치**: 각 fisheries 페이지의 차트 섹션 상단 또는 하단

**동작**:
1. 어댑터로 `DataPackage` 생성
2. `graph-studio-store`에 `setInitialDataPackage(pkg)` 설정
3. `/graph-studio` 라우트로 이동
4. Graph Studio가 DataPackage를 로드하여 차트 렌더링

**기존 패턴**: Smart Flow의 `ResultsActionStep`에서 "그래프로 보기" 버튼이 동일한 흐름 사용.

### 4. ChartSpec 기본 프리셋

각 fisheries 차트 유형에 대한 기본 ChartSpec 프리셋 추가:

```typescript
// chart-spec-defaults.ts
VBGF: { chartType: 'scatter', colorField: 'series', ... }
LENGTH_WEIGHT: { chartType: 'scatter', trendline: { type: 'linear' }, xScale: 'log', yScale: 'log' }
CONDITION_FACTOR: { chartType: 'histogram', annotations: [{ type: 'vline', value: '__mean' }] }
```

---

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `stats/lib/graph-studio/analysis-adapter.ts` | `buildVbgfColumns`, `buildLengthWeightColumns`, `buildConditionFactorColumns` 추가 |
| `stats/lib/graph-studio/echarts-converter.ts` | histogram에 `applyMarkLineAnnotations` 적용 (1줄) |
| `stats/lib/graph-studio/chart-spec-defaults.ts` | fisheries 프리셋 추가 |
| `stats/app/bio-tools/vbgf/page.tsx` | "Graph Studio에서 열기" 버튼 |
| `stats/app/bio-tools/length-weight/page.tsx` | "Graph Studio에서 열기" 버튼 |
| `stats/app/bio-tools/condition-factor/page.tsx` | "Graph Studio에서 열기" 버튼 |

---

## 검증

1. 각 fisheries 페이지에서 분석 실행 → "Graph Studio에서 열기" 클릭
2. Graph Studio에서 차트가 올바르게 렌더링되는지 확인
3. 내보내기 (PNG/SVG) 동작 확인
4. `pnpm tsc --noEmit` + `pnpm test`

---

## 향후 확장

- 다른 Bio-Tools (survival, roc-auc)에도 같은 핸드오프 버튼 추가 (이미 어댑터 존재)
- Bio-Tools 결과 → 프로젝트 연결 (`ProjectEntityKind` 확장) 시 핸드오프 데이터도 프로젝트에 저장
- SVG 차트 보일러플레이트 공통 컴포넌트 추출 (`BioSvgChartFrame`)
