# 차트 품질 점검 체크리스트

> UI 다듬기 완료 후 실행. 외부 기준(R 등) 불필요 — ECharts 공식 문서 + 자체 데이터 매핑 정확성이 기준.

## 점검 대상

| 영역 | 라이브러리 | 차트 수 | 위치 |
|------|-----------|---------|------|
| Analysis Flow 차트 | ECharts | 5개 | `components/charts/` |
| 탐색/검증 차트 | ECharts | 3개 | `components/analysis/steps/` |
| Plotly 렌더러 | Plotly.js | 3개 | `components/visualizations/` |
| Graph Studio 컨버터 | ECharts | 12타입 | `lib/graph-studio/converters/` |
| 커스텀 인디케이터 | SVG/CSS | 3개 | `components/analysis/visualization/` |

### 상세 인벤토리

**Analysis Flow (5)**
- `BarChartWithCI.tsx` (503줄) — 그룹 비교 + CI 에러바 + 기준선
- `BoxPlot.tsx` (619줄) — 5수치 요약 + 이상치 + 통계 패널
- `Histogram.tsx` (472줄) — 분포 + 빈 제어 + 평균선
- `Scatterplot.tsx` (259줄) — 산점도 + 추세선 + R²
- `group-comparison.tsx` (202줄) — 그룹 비교 막대 + 유의성 쌍

**탐색/검증 (3)**
- `CorrelationHeatmap.tsx` — 상관 행렬 히트맵
- `DistributionChartSection.tsx` — 히스토그램/박스플롯 선택기
- `ScatterHeatmapSection.tsx` — 탐색용 산점도/히트맵

**Plotly 렌더러 (3)**
- `plotly-chart-renderer.tsx` (215줄) — 범용 Plotly 렌더링
- `pyodide-chart-panel.tsx` (401줄) — Pyodide 런타임 시각화
- `pyodide-plotly-chart-panel.tsx` (471줄) — Pyodide + Plotly 통합

**커스텀 인디케이터 (3)**
- `FitScoreIndicator.tsx` — 메서드 적합도 점수 (원형 프로그레스)
- `ConfidenceGauge.tsx` — 신뢰도 게이지 (SVG 원형)
- `AssumptionResultChart.tsx` — 가정검정 통과율 (프로그레스 바)

---

## L1. 데이터 매핑 정확성 (컨버터 테스트 보강)

기존 `echarts-converter.test.ts`에 edge case 추가:

- [ ] **빈 데이터** — series.data가 빈 배열일 때 에러 없이 빈 차트 렌더
- [ ] **단일 포인트** — scatter, line에서 점 1개만 있을 때 정상 표시
- [ ] **큰 데이터** — 5000+ 포인트에서 Canvas 렌더러 자동 전환 확인 (`SCATTER_LARGE_THRESHOLD`)
- [ ] **결측값(NaN/null)** — 차트가 깨지지 않고 해당 포인트 스킵
- [ ] **음수값** — 축 스케일이 음수 범위 포함하여 정상 표시
- [ ] **동일값** — 모든 값이 같을 때 (분산=0) boxplot/histogram 렌더링

---

## L2. 시각 요소 점검 (수동, 차트 타입별)

### Analysis Flow 차트 (5개)

**BarChartWithCI** (`components/charts/BarChartWithCI.tsx`)
- [ ] Y축 라벨: 변수명 표시, 잘림 없음
- [ ] X축: 그룹명 표시, 긴 이름 회전/말줄임
- [ ] CI 에러바: 상하 대칭, 호버 시 값 표시
- [ ] 기준선(markLine): 값·라벨 정확, 색상 구분
- [ ] 선택 시 상세 패널: CI 해석 텍스트 정확
- [ ] 색상: OkabeIto 팔레트 적용
- [ ] 다크모드: 배경/축/텍스트 전환

**BoxPlot** (`components/charts/BoxPlot.tsx`)
- [ ] 중앙값 선 + 평균 마커(▲) 구분
- [ ] IQR 박스 + 수염(whisker) 정확
- [ ] 이상치 점 표시
- [ ] 통계 패널 값(IQR, CV, 이상치 수)과 시각 일치
- [ ] 클릭 가능 범례 배지: 시리즈 하이라이트 동작
- [ ] dataZoom(마우스 휠 줌) 동작

**Histogram** (`components/charts/Histogram.tsx`)
- [ ] 빈(bin) 수: Sturges' rule 적용 확인
- [ ] 평균선(markLine, dashed) 오버레이 위치 정확
- [ ] 빈도 라벨 표시
- [ ] 빈 슬라이더/입력 조절 반영

**Scatterplot** (`components/charts/Scatterplot.tsx`)
- [ ] 추세선(trend line) 방향 + 기울기
- [ ] R² 배지 값과 실제 추세 일관성
- [ ] 회귀식 표시 정확
- [ ] 점 겹침 시 투명도/크기 처리

**GroupComparison** (`components/charts/group-comparison.tsx`)
- [ ] 그룹별 막대 + 에러바 정확
- [ ] 유의성 쌍(significantPairs) 표시
- [ ] 그룹 수 많을 때 레이아웃 안정

### 탐색/검증 차트 (3개)

**CorrelationHeatmap** (`steps/validation/charts/CorrelationHeatmap.tsx`)
- [ ] 색상 스케일: -1(파랑)~0(흰)~+1(빨강) 정확
- [ ] 셀 값 라벨 표시
- [ ] `role="img"` + aria-label 존재

**DistributionChartSection** (`steps/exploration/DistributionChartSection.tsx`)
- [ ] 히스토그램/박스플롯 전환
- [ ] 변수 필터링 동작

**ScatterHeatmapSection** (`steps/exploration/ScatterHeatmapSection.tsx`)
- [ ] 변수 쌍 선택 → 산점도 렌더
- [ ] 히트맵 전환

### Plotly 렌더러 (3개)

- [ ] `plotly-chart-renderer`: Plotly → 풀스크린 + PNG/HTML 내보내기
- [ ] `pyodide-chart-panel`: Pyodide 런타임 → 차트 렌더
- [ ] `pyodide-plotly-chart-panel`: Python 생성 Plotly JSON → 렌더

### 커스텀 인디케이터 (3개)

- [ ] **FitScoreIndicator**: 0~100 점수 → 5단계(excellent/good/caution/poor/unknown) 매핑 정확
- [ ] **ConfidenceGauge**: SVG stroke-dasharray 애니메이션 + 색상 임계값
- [ ] **AssumptionResultChart**: 통과율 프로그레스 바 + 개별 체크 결과

### Graph Studio 컨버터 (12타입)

| 차트 타입 | 축 매핑 | 범례 | 툴팁 | 내보내기 | facet |
|-----------|---------|------|------|---------|-------|
| bar | [ ] | [ ] | [ ] | [ ] | [ ] |
| grouped-bar | [ ] | [ ] | [ ] | [ ] | [ ] |
| stacked-bar | [ ] | [ ] | [ ] | [ ] | [ ] |
| line | [ ] | [ ] | [ ] | [ ] | [ ] |
| scatter | [ ] | [ ] | [ ] | [ ] | [ ] |
| boxplot | [ ] | [ ] | [ ] | [ ] | [ ] |
| histogram | [ ] | [ ] | [ ] | [ ] | [ ] |
| error-bar | [ ] | [ ] | [ ] | [ ] | [ ] |
| heatmap | [ ] | [ ] | [ ] | [ ] | [ ] |
| violin | [ ] | [ ] | [ ] | [ ] | [ ] |
| km-curve | [ ] | [ ] | [ ] | [ ] | [ ] |
| roc-curve | [ ] | [ ] | [ ] | [ ] | [ ] |

---

## L3. 공통 기능 점검

### 색상 & 테마
- [ ] **OkabeIto 팔레트**: 전 차트 적용 확인 (`echarts-stat-utils.ts`)
- [ ] **다크모드**: light/dark 전환 시 축·라벨·배경·툴팁 색상 정상 (`chart-color-resolver.ts`)
- [ ] **상관 히트맵 전용 색상**: `--correlation-strong-pos/weak/strong-neg` CSS 변수

### 인터랙션
- [ ] **툴팁**: 모든 차트에서 호버 시 정확한 값 + 포맷 (소수점, 단위)
- [ ] **전체화면**: BarChartWithCI, BoxPlot, Histogram, Scatterplot — 토글 동작
- [ ] **차트/테이블 토글**: BarChartWithCI, Histogram, BoxPlot — 탭 전환 + 테이블 데이터 일치
- [ ] **애니메이션**: `animationDuration: 300` — 부드러움, 과도하지 않음

### 내보내기
- [ ] **PNG**: `saveAsImage pixelRatio: 2` — 배경색 포함, 해상도 적절
- [ ] **CSV**: `downloadCsvFile()` — BOM 포함 (Excel 한글 호환), 데이터 정확
- [ ] **Graph Studio SVG/PNG**: ExportConfig DPI + 크기 설정

### 에러 & 로딩
- [ ] **ChartSkeleton**: 로딩 중 스켈레톤 → 데이터 후 차트 전환
- [ ] **ChartErrorBoundary**: 잘못된 데이터 시 fallback UI
- [ ] **반응형**: 창 리사이즈 시 차트 깨짐/잘림 없음 (ECharts autoResize)

### 접근성
- [ ] **aria-label**: 전체화면/CSV 버튼, CorrelationHeatmap `role="img"`
- [ ] **키보드**: 탭 전환, 버튼 포커스 가능

---

## 테스트 현황 (참고)

| 테스트 파일 | 라인 | 대상 |
|------------|------|------|
| `echarts-converter.test.ts` | 1,207 | 컨버터 ChartSpec → ECharts |
| `echarts-converter-survival.test.ts` | 368 | KM/ROC 변환 |
| `chart-spec-utils.test.ts` | 553 | 스펙 유틸리티 |
| `chart-color-resolver.test.ts` | 243 | 색상 팔레트 |
| `BarChartWithCI.test.tsx` | 215 | 바 차트 + CI |
| `histogram.test.tsx` | 189 | 히스토그램 |
| `scatterplot.test.tsx` | 76 | 산점도 |
| `plotly-chart-renderer.test.tsx` | 120 | Plotly 렌더러 |
| `chart-recommender.test.ts` | 72 | 차트 추천 |
| `data-exploration-charts.test.ts` | 266 | 탐색 차트 |
| **합계** | **~3,300** | |

---

## 참고 링크

- ECharts 옵션 문서: https://echarts.apache.org/en/option.html
- 차트 색상 관리: `stats/lib/charts/chart-color-resolver.ts`
- ECharts 공통 설정: `stats/lib/charts/echarts-stat-utils.ts`
- 컨버터 코드: `stats/lib/graph-studio/converters/`
- Graph Studio 타입: `stats/types/graph-studio.ts`
- 기존 테스트: `stats/__tests__/lib/graph-studio/echarts-converter.test.ts`
