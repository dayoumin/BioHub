# Graph Studio 논문 활용 확장 — ADR (Architecture Decision Record)

**작성일**: 2026-02-28
**상태**: 승인됨 (구현 예정)

---

## 배경

Graph Studio는 ECharts 기반의 학술용 차트 편집기로, ChartSpec → echarts-converter → ReactECharts 파이프라인으로 동작한다.

기존 PropertiesTab은 4개 컨트롤(제목·차트유형·X필드·Y필드)만 존재해 논문 제출(Nature/Science/IEEE) 실용 수준에 미달했다. GraphPad Prism과 비교 시 핵심 부족 항목:

| 항목 | Prism | Graph Studio (기존) | ECharts 가능 여부 |
|------|-------|---------------------|-------------------|
| 출력 크기 (mm) | ✅ | ❌ DPI만 | ✅ resize API |
| 저널 사이즈 프리셋 | ❌ | ❌ | ✅ 상수 추가 |
| 에러바 UI | ✅ SEM/SD/CI 자동 | ❌ AI 명령만 | ✅ 기존 `error-bar` 타입에 이미 구현 |
| 축 제목 UI | ✅ | ❌ | ✅ 스키마에 이미 있음, UI만 없음 |
| 로그 스케일 | ✅ | ❌ | ✅ ECharts 'log' 타입 |
| 축 범위 | ✅ | ❌ | ✅ ECharts min/max |
| 범례 위치 | ✅ | ❌ | ✅ ECharts legend orient |

**ChartSpec 타입** 및 **Zod 스키마**에는 이미 `ScaleSpec`, `LegendSpec`, `ErrorBarSpec` 등 필드가 존재하나, PropertiesTab과 echarts-converter에서 미사용 상태였다.

---

## 결정 사항

### ADR-1: 에러바 UI — bar / line / error-bar 3개 차트 타입 지원

**결정**: PropertiesTab에서 에러바 컨트롤을 `bar`, `line`, `error-bar` 차트에 표시.

**이유**: 막대/선 그래프에 에러바 오버레이는 논문에서 가장 흔한 패턴.

**제약**:
- `grouped-bar` / `stacked-bar`는 미지원 (그룹별 에러바 계산 복잡도 불필요하게 높음)
- `bar` / `line` 에서 `spec.errorBar` 설정 시 converter가 `dataset` 방식 → `explicit data` 방식으로 자동 전환

**전환 이유**: ECharts custom renderItem (에러바 선 그리기)은 x-index 기반 포지셔닝 필요 → `xAxis.data = categories[]` 필수. `dataset: { source: workRows }` 방식으로는 사용 불가.

전환 시 효과: 원시 데이터가 아닌 그룹별 평균값만 bar/line에 표시됨 (학술 차트 관례와 일치).

---

### ADR-2: 로그 스케일 — ECharts 'log' 만 UI 노출

**결정**: Y축 로그 스케일 Switch는 선형(linear) / 로그(log) 2가지만 제공.

**이유**: ECharts `yAxis.type`은 `'value' | 'log' | 'category' | 'time'`만 지원. `sqrt`, `symlog`는 ECharts 미지원. ChartSpec 타입(`ScaleSpec.type`)에는 4개 열거형이 있으나 UI에서 2개만 노출.

---

### ADR-3: ExportConfig 물리적 크기 — ChartSpec 내 포함, Zod strict 유지

**결정**: `ExportConfig`에 `physicalWidth?: number` (mm), `physicalHeight?: number` (mm) 추가.

**이유**:
- ChartSpec 내 포함 → AI 패치 가능 ("Nature 제출용으로 바꿔줘" → physicalWidth=86 자동 설정)
- `setExportConfig` 액션 경유 → undo 히스토리 제외 (export 설정은 transient 상태)
- Zod `exportConfigSchema`에 추가, `.strict()` 유지

**export 동작**:
```
physicalWidth/Height 있을 경우:
  1. mmToPx(mm, dpi) = Math.round(mm * dpi / 25.4) → targetW, targetH 계산
  2. echartsInstance.resize({ width: targetW, height: targetH })
  3. getDataURL() / getSvgDataURL()
  4. echartsInstance.resize()  // DOM 크기로 원복
```

---

### ADR-4: 저널 프리셋 — width만 세팅

**결정**: 저널 사이즈 프리셋(Nature/Cell/PNAS/ACS)은 physicalWidth만 세팅, physicalHeight는 사용자 직접 입력.

**이유**: 논문 그래프의 height는 데이터 밀도와 차트 종류에 따라 가변적. 저널 가이드라인도 width만 규정하는 경우가 많음.

저널 표준 단일 칼럼 너비:
| 저널 | 단일 칼럼 (mm) | 전체 너비 (mm) |
|------|--------------|--------------|
| Nature/Science | 86 | 178 |
| Cell | 88 | 183 |
| PNAS | 87 | 180 |
| ACS Journals | 84 | 178 |

---

### ADR-5: legend orient — 8방향 + none

**결정**: 범례 위치는 `encoding.color.legend.orient` 경로로 저장. ECharts legend 위치 매핑:

```
'top'    → { orient: 'horizontal', top: 0,    left: 'center' }
'bottom' → { orient: 'horizontal', bottom: 0, left: 'center' }
'left'   → { orient: 'vertical',  left: 0,   top: 'center'  }
'right'  → { orient: 'vertical',  right: 0,  top: 'center'  }
'top-left' / 'top-right' / 'bottom-left' / 'bottom-right' → 모서리 배치
'none'   → { show: false }
```

범례 섹션은 `encoding.color`가 설정된 차트에서만 표시 (color 인코딩 없으면 범례 무의미).

---

## 구현 범위 (비포함)

다음 항목은 이번 확장에 포함하지 않음:

| 항목 | 이유 |
|------|------|
| 통계 유의성 마커 (* ** ***) | ECharts annotations 수동 배치 필요, 별도 작업 |
| 바이올린 플롯 | ECharts 미지원, 추후 custom renderItem 검토 |
| EPS/CMYK export | ECharts 미지원 |
| 이미지 삽입 (논문 패널 결합) | Bio-Tools 완료 이후 검토 (ROADMAP.md 기록) |
| X축 로그 스케일 | Y축만 논문에서 실용적 (X축 로그는 scatter에서 AI로 처리) |

---

## 변경 파일 목록

```
stats/types/graph-studio.ts                         — ExportConfig physicalWidth/Height
stats/lib/graph-studio/chart-spec-schema.ts         — exportConfigSchema 확장
stats/lib/graph-studio/chart-spec-defaults.ts       — JOURNAL_SIZE_PRESETS
stats/lib/graph-studio/echarts-converter.ts         — yAxisBase, buildLegend, buildErrorBarOverlay
stats/lib/graph-studio/export-utils.ts              — mmToPx + resize
stats/components/graph-studio/panels/PropertiesTab.tsx  — 5개 컨트롤 섹션
stats/components/graph-studio/panels/ExportTab.tsx      — mm 입력 + 저널 프리셋
stats/components/graph-studio/panels/AiEditTab.tsx      — 저널 예제 2개
ROADMAP.md                                          — 이미지 기능 향후 과제 추가
```
